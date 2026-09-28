import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { COLLECTIONS, sanitizeForFirestore } from '../services/firestoreService';
import { 
  registerAffiliate, 
  registerCompany, 
  loginUser, 
  loginWithGoogle as authLoginWithGoogle,
  resetPassword, 
  logoutUser,
  RegisterAffiliateData,
  RegisterCompanyData,
  AuthResult
} from '../services/authService';
import { UserSellerProfile, UserRoleMode } from '../types/platform';
import { INITIAL_USER_PROFILE, isSuperAdminEmail } from '../data/platformData';
import { applyVerificationRequest, resolveProfileRole } from '../../lib/profileEligibility';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserSellerProfile;
  userRole: UserRoleMode;
  setUserRole: (role: UserRoleMode) => void;
  isAuthenticated: boolean;
  loading: boolean;
  registerAffiliateUser: (data: RegisterAffiliateData) => Promise<AuthResult>;
  registerCompanyUser: (data: RegisterCompanyData) => Promise<AuthResult>;
  login: (email: string, password: string, preferredRole?: UserRoleMode) => Promise<AuthResult>;
  loginWithGoogle: (preferredRole?: UserRoleMode) => Promise<AuthResult>;
  sendPasswordReset: (email: string) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserSellerProfile>(INITIAL_USER_PROFILE);
  const [userRole, setUserRole] = useState<UserRoleMode>('afiliado');
  const [loading, setLoading] = useState<boolean>(true);
  const isRegisteringRef = useRef<boolean>(false);

  useEffect(() => {
    let unsubProfile: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (user) {
        // Resolve the sole administrator from Firebase Auth immediately rather
        // than waiting for a possibly slow Firestore snapshot. This prevents a
        // stale tenant mode from briefly replacing the admin workspace.
        if (isSuperAdminEmail(user.email)) setUserRole('admin');
        // Escutar perfil no Firestore em tempo real
        const profileRef = doc(db, COLLECTIONS.PROFILES, user.uid);
        unsubProfile = onSnapshot(profileRef, async (snap) => {
          if (snap.exists()) {
            let data = snap.data() as Partial<UserSellerProfile>;
            const userEmail = (user.email || data.email || '').trim().toLowerCase();
            const isAdminAccount = isSuperAdminEmail(userEmail);
            try {
              const requestSnap = await getDoc(doc(db, COLLECTIONS.VERIFICATIONS, user.uid));
              if (requestSnap.exists()) {
                data = applyVerificationRequest(data as Record<string, unknown>, requestSnap.data() as Record<string, unknown>) as Partial<UserSellerProfile>;
              }
            } catch (error) {
              console.warn('[AuthContext] Não foi possível carregar o status da solicitação do próprio perfil.', error);
            }

            // Explicit accountType/activeRoleMode wins over stale company fields.
            // Admin access remains enforced independently by the allowlisted email.
            const preferredRole = data.activeRoleMode === 'empresa' || data.activeRoleMode === 'afiliado' ? data.activeRoleMode : undefined;
            const resolvedProfileRole = resolveProfileRole(data as Record<string, unknown>, preferredRole);
            const resolvedRoleMode: UserRoleMode = isAdminAccount && resolvedProfileRole === 'admin' ? 'admin' : resolvedProfileRole;
            const resolvedAccountType: UserSellerProfile['accountType'] = isAdminAccount
              ? 'admin'
              : data.hasAffiliateProfile === true && data.hasCompanyProfile === true
                ? 'ambos'
                : resolvedProfileRole;
            const isCompanyAccount = resolvedProfileRole === 'empresa';

            const safeProfile: UserSellerProfile = {
              ...INITIAL_USER_PROFILE,
              ...data,
              userId: user.uid,
              name: data.name || user.displayName || user.email?.split('@')[0] || 'Usuário LeadsPay',
              email: userEmail,
              avatar: data.avatar || user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user.uid)}`,
              availableBalance: typeof data.availableBalance === 'number' && !isNaN(data.availableBalance) ? data.availableBalance : 0,
              pendingBalance: typeof data.pendingBalance === 'number' && !isNaN(data.pendingBalance) ? data.pendingBalance : 0,
              totalEarned: typeof data.totalEarned === 'number' && !isNaN(data.totalEarned) ? data.totalEarned : 0,
              totalSalesCount: typeof data.totalSalesCount === 'number' && !isNaN(data.totalSalesCount) ? data.totalSalesCount : 0,
              targetGoal: typeof data.targetGoal === 'number' && !isNaN(data.targetGoal) ? data.targetGoal : (isCompanyAccount ? 500000 : 100000),
              currentSalesProgress: typeof data.currentSalesProgress === 'number' && !isNaN(data.currentSalesProgress) ? data.currentSalesProgress : 0,
              partnerLevel: data.partnerLevel || (isAdminAccount ? 'Super Administrador' : (isCompanyAccount ? 'Empresa Parceira' : 'Afiliado Starter')),
              accountType: resolvedAccountType,
              hasAffiliateProfile: data.hasAffiliateProfile === true || (!isAdminAccount && resolvedProfileRole === 'afiliado'),
              hasCompanyProfile: data.hasCompanyProfile === true || (!isAdminAccount && resolvedProfileRole === 'empresa'),
              activeRoleMode: resolvedRoleMode,
              role: data.role || (isAdminAccount ? 'Administrador do Sistema' : (isCompanyAccount ? 'Fundador / Startup' : 'Afiliado de Alta Performance')),
              plan: data.plan,
              planStatus: data.planStatus,
              subscriptionTier: data.subscriptionTier,
              subscriptionName: data.subscriptionName,
              subscriptionActiveAt: data.subscriptionActiveAt
            };
            setUserProfile(safeProfile);
            setUserRole(resolvedRoleMode);
          } else {
            // Se o perfil não existir ainda no Firestore para este usuário autenticado,
            // NÃO sobrescreva nem force perfil padrão como 'afiliado' se um registro estiver em andamento!
            if (isRegisteringRef.current) {
              return;
            }

            const userEmail = user.email || '';
            const isAdminAccount = isSuperAdminEmail(userEmail);
            const defaultRole: UserRoleMode = isAdminAccount ? 'admin' : 'afiliado';

            const initialNewProfile: UserSellerProfile = {
              ...INITIAL_USER_PROFILE,
              userId: user.uid,
              name: user.displayName || user.email?.split('@')[0] || 'Usuário LeadsPay',
              email: userEmail,
              avatar: user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user.uid)}`,
              availableBalance: 0,
              pendingBalance: 0,
              totalEarned: 0,
              totalSalesCount: 0,
              partnerLevel: isAdminAccount ? 'Super Administrador' : 'Afiliado Starter',
              targetGoal: 100000,
              currentSalesProgress: 0,
              activeRoleMode: defaultRole,
              accountType: defaultRole,
              hasAffiliateProfile: !isAdminAccount,
              hasCompanyProfile: false,
              role: isAdminAccount ? 'Administrador do Sistema' : 'Afiliado Starter',
              updatedAt: new Date().toISOString()
            };
            setUserProfile(initialNewProfile);
            setUserRole(defaultRole);
          }
        }, (err) => {
          console.error('Erro no listener do perfil do usuário:', err);
        });
      } else {
        if (unsubProfile) {
          unsubProfile();
          unsubProfile = null;
        }
        setUserProfile(INITIAL_USER_PROFILE);
      }

      setLoading(false);
    });

    return () => {
      unsubAuth();
      if (unsubProfile) unsubProfile();
    };
  }, []);

  const registerAffiliateUser = async (data: RegisterAffiliateData) => {
    isRegisteringRef.current = true;
    setLoading(true);
    try {
      const res = await registerAffiliate(data);
      setCurrentUser(res.user);
      setUserProfile(res.profile);
      setUserRole('afiliado');
      return res;
    } finally {
      setLoading(false);
      setTimeout(() => {
        isRegisteringRef.current = false;
      }, 2500);
    }
  };

  const registerCompanyUser = async (data: RegisterCompanyData) => {
    isRegisteringRef.current = true;
    setLoading(true);
    try {
      const res = await registerCompany(data);
      setCurrentUser(res.user);
      setUserProfile(res.profile);
      setUserRole('empresa');
      return res;
    } finally {
      setLoading(false);
      setTimeout(() => {
        isRegisteringRef.current = false;
      }, 2500);
    }
  };

  const login = async (email: string, password: string, preferredRole?: UserRoleMode) => {
    setLoading(true);
    try {
      const res = await loginUser(email, password, preferredRole);
      setCurrentUser(res.user);
      setUserProfile(res.profile);
      const effectiveRole: UserRoleMode = res.profile.activeRoleMode === 'admin' || res.profile.activeRoleMode === 'empresa' || res.profile.activeRoleMode === 'afiliado'
        ? res.profile.activeRoleMode
        : res.profile.accountType === 'admin' ? 'admin' : 'afiliado';
      setUserRole(effectiveRole);
      return res;
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async (preferredRole: UserRoleMode = 'afiliado') => {
    isRegisteringRef.current = true;
    setLoading(true);
    try {
      const res = await authLoginWithGoogle(preferredRole);
      setCurrentUser(res.user);
      setUserProfile(res.profile);
      if (res.profile.activeRoleMode) {
        setUserRole(res.profile.activeRoleMode);
      }
      return res;
    } finally {
      setLoading(false);
      setTimeout(() => {
        isRegisteringRef.current = false;
      }, 2500);
    }
  };

  const sendPasswordReset = async (email: string) => {
    return await resetPassword(email);
  };

  const logout = async () => {
    setLoading(true);
    try {
      await logoutUser();
      setCurrentUser(null);
      setUserProfile(INITIAL_USER_PROFILE);
      setUserRole('afiliado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        userRole,
        setUserRole,
        isAuthenticated: !!currentUser,
        loading,
        registerAffiliateUser,
        registerCompanyUser,
        login,
        loginWithGoogle,
        sendPasswordReset,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return context;
}
