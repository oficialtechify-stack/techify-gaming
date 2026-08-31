import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { COLLECTIONS } from '../services/firestoreService';
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

  useEffect(() => {
    let unsubProfile: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (user) {
        // Escutar perfil no Firestore em tempo real
        const profileRef = doc(db, COLLECTIONS.PROFILES, user.uid);
        unsubProfile = onSnapshot(profileRef, (snap) => {
          if (snap.exists()) {
            const data = snap.data() as UserSellerProfile;
            setUserProfile(data);
            if (data.activeRoleMode) {
              setUserRole(data.activeRoleMode);
            }
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
    setLoading(true);
    try {
      const res = await registerAffiliate(data);
      setCurrentUser(res.user);
      setUserProfile(res.profile);
      setUserRole('afiliado');
      return res;
    } finally {
      setLoading(false);
    }
  };

  const registerCompanyUser = async (data: RegisterCompanyData) => {
    setLoading(true);
    try {
      const res = await registerCompany(data);
      setCurrentUser(res.user);
      setUserProfile(res.profile);
      setUserRole('empresa');
      return res;
    } finally {
      setLoading(false);
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
