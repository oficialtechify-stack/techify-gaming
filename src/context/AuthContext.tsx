import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
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
import { INITIAL_USER_PROFILE } from '../data/platformData';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserSellerProfile;
  userRole: UserRoleMode;
  setUserRole: (role: UserRoleMode) => void;
  isAuthenticated: boolean;
  loading: boolean;
  registerAffiliateUser: (data: RegisterAffiliateData) => Promise<AuthResult>;
  registerCompanyUser: (data: RegisterCompanyData) => Promise<AuthResult>;
  login: (email: string, password: string) => Promise<AuthResult>;
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
        // Escutar perfil no Firestore em tempo real
        const profileRef = doc(db, COLLECTIONS.PROFILES, user.uid);
        unsubProfile = onSnapshot(profileRef, async (snap) => {
          if (snap.exists()) {
            const data = snap.data() as Partial<UserSellerProfile>;

            // Identificar se a conta é estritamente Empresa ou Afiliado
            const isCompanyAccount = data.accountType === 'empresa' ||
                                     data.hasCompanyProfile === true ||
                                     Boolean(data.companyId) ||
                                     data.activeRoleMode === 'empresa' ||
                                     (typeof data.role === 'string' && (data.role.toLowerCase().includes('startup') || data.role.toLowerCase().includes('empresa') || data.role.toLowerCase().includes('produtor')));

            const resolvedRoleMode: UserRoleMode = isCompanyAccount ? 'empresa' : 'afiliado';

            const safeProfile: UserSellerProfile = {
              ...INITIAL_USER_PROFILE,
              ...data,
              userId: user.uid,
              name: data.name || user.displayName || user.email?.split('@')[0] || 'Usuário LeadsPay',
              email: data.email || user.email || '',
              avatar: data.avatar || user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user.uid)}`,
              availableBalance: typeof data.availableBalance === 'number' && !isNaN(data.availableBalance) ? data.availableBalance : 0,
              pendingBalance: typeof data.pendingBalance === 'number' && !isNaN(data.pendingBalance) ? data.pendingBalance : 0,
              totalEarned: typeof data.totalEarned === 'number' && !isNaN(data.totalEarned) ? data.totalEarned : 0,
              totalSalesCount: typeof data.totalSalesCount === 'number' && !isNaN(data.totalSalesCount) ? data.totalSalesCount : 0,
              targetGoal: typeof data.targetGoal === 'number' && !isNaN(data.targetGoal) ? data.targetGoal : (isCompanyAccount ? 500000 : 100000),
              currentSalesProgress: typeof data.currentSalesProgress === 'number' && !isNaN(data.currentSalesProgress) ? data.currentSalesProgress : 0,
              partnerLevel: data.partnerLevel || (isCompanyAccount ? 'Empresa Parceira' : 'Afiliado Starter'),
              accountType: resolvedRoleMode,
              hasAffiliateProfile: !isCompanyAccount,
              hasCompanyProfile: isCompanyAccount,
              activeRoleMode: resolvedRoleMode,
              role: data.role || (isCompanyAccount ? 'Empresa / Produtor' : 'Afiliado de Alta Performance'),
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

            const initialNewProfile: UserSellerProfile = {
              ...INITIAL_USER_PROFILE,
              userId: user.uid,
              name: user.displayName || user.email?.split('@')[0] || 'Usuário LeadsPay',
              email: user.email || '',
              avatar: user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user.uid)}`,
              availableBalance: 0,
              pendingBalance: 0,
              totalEarned: 0,
              totalSalesCount: 0,
              partnerLevel: 'Afiliado Starter',
              targetGoal: 100000,
              currentSalesProgress: 0,
              activeRoleMode: 'afiliado',
              accountType: 'afiliado',
              hasAffiliateProfile: true,
              hasCompanyProfile: false,
              updatedAt: new Date().toISOString()
            };
            setUserProfile(initialNewProfile);
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

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const res = await loginUser(email, password);
      setCurrentUser(res.user);
      setUserProfile(res.profile);
      if (res.profile.activeRoleMode) {
        setUserRole(res.profile.activeRoleMode);
      }
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
