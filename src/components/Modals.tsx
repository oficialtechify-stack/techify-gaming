import React, { useState, useEffect } from 'react';
import { ActiveModal } from '../types';
import { 
  Building2, 
  UserCheck, 
  ShieldCheck, 
  Lock, 
  Mail, 
  User, 
  Phone, 
  Globe, 
  CreditCard, 
  CheckCircle, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  Sparkles,
  KeyRound,
  FileText,
  Briefcase,
  Upload,
  Image as ImageIcon,
  Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { 
  getAuthErrorMessage, 
  formatCPF, 
  formatCNPJ, 
  formatPhone, 
  isValidCPF, 
  isValidCNPJ, 
  cleanDigits 
} from '../services/authService';

interface ModalsProps {
  activeModal: ActiveModal;
  onClose: () => void;
  onLoginSuccess?: () => void;
}

export const Modals: React.FC<ModalsProps> = ({ activeModal, onClose, onLoginSuccess }) => {
  const { registerAffiliateUser, registerCompanyUser, login, loginWithGoogle, sendPasswordReset } = useAuth();

  // Internal tab navigation inside modal: 'login' | 'register_affiliate' | 'register_company' | 'forgot_password'
  const [modalTab, setModalTab] = useState<'login' | 'register_affiliate' | 'register_company' | 'forgot_password'>('login');

  // Synchronize modalTab when activeModal changes
  useEffect(() => {
    if (activeModal === 'login') setModalTab('login');
    else if (activeModal === 'register_affiliate') setModalTab('register_affiliate');
    else if (activeModal === 'register_company') setModalTab('register_company');
    else if (activeModal === 'forgot_password') setModalTab('forgot_password');
  }, [activeModal]);

  // Loading & Feedback states
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  
  // Password Visibility States
  const [showLoginPassword, setShowLoginPassword] = useState<boolean>(false);
  const [showAffPassword, setShowAffPassword] = useState<boolean>(false);
  const [showAffConfirmPassword, setShowAffConfirmPassword] = useState<boolean>(false);
  const [showCompPassword, setShowCompPassword] = useState<boolean>(false);
  const [showCompConfirmPassword, setShowCompConfirmPassword] = useState<boolean>(false);

  // 1. Login State
  const [loginRole, setLoginRole] = useState<'afiliado' | 'empresa'>('afiliado');
  const [loginEmail, setLoginEmail] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');

  // 2. Affiliate Registration State
  const [affName, setAffName] = useState<string>('');
  const [affEmail, setAffEmail] = useState<string>('');
  const [affPassword, setAffPassword] = useState<string>('');
  const [affConfirmPassword, setAffConfirmPassword] = useState<string>('');
  const [affWhatsapp, setAffWhatsapp] = useState<string>('');
  const [affCpf, setAffCpf] = useState<string>('');
  const [affPixKey, setAffPixKey] = useState<string>('');
  const [affPixKeyType, setAffPixKeyType] = useState<string>('CPF');

  // 3. Company Registration State
  const [compName, setCompName] = useState<string>('');
  const [compOwnerName, setCompOwnerName] = useState<string>('');
  const [compEmail, setCompEmail] = useState<string>('');
  const [compPassword, setCompPassword] = useState<string>('');
  const [compConfirmPassword, setCompConfirmPassword] = useState<string>('');
  const [compWhatsapp, setCompWhatsapp] = useState<string>('');
  const [compDocType, setCompDocType] = useState<'CNPJ' | 'CPF' | 'SEM_CNPJ'>('CNPJ');
  const [compCnpj, setCompCnpj] = useState<string>('');
  const [compCpf, setCompCpf] = useState<string>('');
  const [compCategory, setCompCategory] = useState<string>('SaaS / B2B');
  const [compWebsite, setCompWebsite] = useState<string>('');
  const [compTagline, setCompTagline] = useState<string>('');
  const [compLogo, setCompLogo] = useState<string>('');

  // 4. Forgot Password State
  const [resetEmail, setResetEmail] = useState<string>('');

  // Reset errors on tab change
  const handleSwitchTab = (tab: 'login' | 'register_affiliate' | 'register_company' | 'forgot_password') => {
    setModalTab(tab);
    setErrorMessage('');
    setSuccessMessage('');
  };

  if (!activeModal) return null;

  // ----------------------------------------------------
  // HANDLERS
  // ----------------------------------------------------
  const handleGoogleLogin = async (preferredRole: 'afiliado' | 'empresa' = 'afiliado') => {
    setErrorMessage('');
    setSuccessMessage('');
    setIsSubmitting(true);
    try {
      await loginWithGoogle(preferredRole);
      setSuccessMessage('Conta conectada com sucesso via Google!');
      setTimeout(() => {
        setIsSubmitting(false);
        onClose();
        if (onLoginSuccess) onLoginSuccess();
      }, 1000);
    } catch (error: any) {
      setIsSubmitting(false);
      console.error('Erro no login Google:', error);
      const friendlyMsg = getAuthErrorMessage(error);
      setErrorMessage(friendlyMsg);
    }
  };

  const handleQuickPasswordReset = async (emailToReset?: string) => {
    const target = emailToReset || affEmail || compEmail || loginEmail || resetEmail;
    if (!target) {
      setErrorMessage('Por favor, informe o e-mail para receber o link de redefinição.');
      return;
    }
    setErrorMessage('');
    setSuccessMessage('');
    setIsSubmitting(true);
    try {
      const res = await sendPasswordReset(target);
      setIsSubmitting(false);
      setSuccessMessage(res.message);
    } catch (error: any) {
      setIsSubmitting(false);
      console.error('Erro na redefinição de senha:', error);
      const friendlyMsg = getAuthErrorMessage(error);
      setErrorMessage(friendlyMsg);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setIsSubmitting(true);

    try {
      await login(loginEmail, loginPassword);
      setSuccessMessage('Autenticado com sucesso! Entrando na plataforma...');
      setTimeout(() => {
        setIsSubmitting(false);
        onClose();
        if (onLoginSuccess) onLoginSuccess();
      }, 1000);
    } catch (error: any) {
      setIsSubmitting(false);
      console.error('Erro no login:', error);
      const friendlyMsg = getAuthErrorMessage(error);
      setErrorMessage(friendlyMsg);
    }
  };

  const handleRegisterAffiliateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (affPassword !== affConfirmPassword) {
      setErrorMessage('As senhas digitadas não coincidem.');
      return;
    }

    if (affPassword.length < 6) {
      setErrorMessage('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setIsSubmitting(true);

    try {
      await registerAffiliateUser({
        name: affName,
        email: affEmail,
        password: affPassword,
        whatsapp: affWhatsapp,
        cpf: affCpf,
        pixKey: affPixKey || affCpf,
        pixKeyType: affPixKeyType
      });

      setSuccessMessage('Conta de Afiliado criada com sucesso! Redirecionando...');
      setTimeout(() => {
        setIsSubmitting(false);
        onClose();
        if (onLoginSuccess) onLoginSuccess();
      }, 1200);
    } catch (error: any) {
      setIsSubmitting(false);
      console.error('Erro no cadastro de afiliado:', error);
      const friendlyMsg = getAuthErrorMessage(error);
      setErrorMessage(friendlyMsg);
    }
  };

  const handleRegisterCompanySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (compPassword !== compConfirmPassword) {
      setErrorMessage('As senhas digitadas não coincidem.');
      return;
    }

    if (compPassword.length < 6) {
      setErrorMessage('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setIsSubmitting(true);

    try {
      await registerCompanyUser({
        companyName: compName,
        ownerName: compOwnerName,
        email: compEmail,
        password: compPassword,
        whatsapp: compWhatsapp,
        documentType: compDocType,
        cnpj: compDocType === 'CNPJ' ? compCnpj : undefined,
        cpf: compDocType === 'CPF' ? compCpf : undefined,
        hasNoCnpj: compDocType === 'SEM_CNPJ',
        category: compCategory,
        website: compWebsite,
        tagline: compTagline,
        logo: compLogo
      });

      setSuccessMessage('Empresa cadastrada com sucesso! Redirecionando para o painel corporativo...');
      setTimeout(() => {
        setIsSubmitting(false);
        onClose();
        if (onLoginSuccess) onLoginSuccess();
      }, 1200);
    } catch (error: any) {
      setIsSubmitting(false);
      console.error('Erro no cadastro de empresa:', error);
      const friendlyMsg = getAuthErrorMessage(error);
      setErrorMessage(friendlyMsg);
    }
  };

  const handlePasswordResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setIsSubmitting(true);

    try {
      const res = await sendPasswordReset(resetEmail);
      setIsSubmitting(false);
      setSuccessMessage(res.message);
    } catch (error: any) {
      setIsSubmitting(false);
      console.error('Erro no reset de senha:', error);
      const friendlyMsg = getAuthErrorMessage(error);
      setErrorMessage(friendlyMsg);
    }
  };

  const isAuthModal = 
    activeModal === 'login' || 
    activeModal === 'register_affiliate' || 
    activeModal === 'register_company' || 
    activeModal === 'forgot_password';

  if (!activeModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#080d1a] border border-white/10 rounded-3xl p-5 sm:p-8 shadow-2xl max-h-[92vh] overflow-y-auto no-scrollbar">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white flex items-center justify-center transition-colors focus:outline-none cursor-pointer z-10"
          aria-label="Fechar modal"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        {/* ========================================================= */}
        {/* AUTHENTICATION & REGISTRATION MODAL FLOWS                 */}
        {/* ========================================================= */}
        {isAuthModal && (
          <div className="flex flex-col gap-5">
            {/* Top Badge & Title */}
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-[#D9F22A]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Acesso ao Ecossistema LeadsPay</span>
            </div>

            {/* Navigation Tabs between Login, Register Affiliate, Register Company */}
            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-[#050811] border border-white/10">
              <button
                type="button"
                onClick={() => handleSwitchTab('login')}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-center truncate ${
                  modalTab === 'login' || modalTab === 'forgot_password'
                    ? 'bg-[#D9F22A] text-[#060A15] shadow-[0_0_15px_rgba(217,242,42,0.3)]'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                Entrar
              </button>

              <button
                type="button"
                onClick={() => handleSwitchTab('register_affiliate')}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 truncate ${
                  modalTab === 'register_affiliate'
                    ? 'bg-[#D9F22A] text-[#060A15] shadow-[0_0_15px_rgba(217,242,42,0.3)]'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Sou Afiliado</span>
              </button>

              <button
                type="button"
                onClick={() => handleSwitchTab('register_company')}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 truncate ${
                  modalTab === 'register_company'
                    ? 'bg-[#D9F22A] text-[#060A15] shadow-[0_0_15px_rgba(217,242,42,0.3)]'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Sou Empresa</span>
              </button>
            </div>

            {/* Error Message Alert with Quick Action Recovery */}
            {errorMessage && (
              <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium flex flex-col gap-3 animate-in fade-in duration-200">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{errorMessage}</span>
                </div>
                {(errorMessage.toLowerCase().includes('já possui uma conta') || 
                  errorMessage.toLowerCase().includes('já está cadastrado') || 
                  errorMessage.toLowerCase().includes('já está em uso') ||
                  errorMessage.toLowerCase().includes('já está vinculado')) && (
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-red-500/20">
                    <button
                      type="button"
                      onClick={() => {
                        const targetEmail = affEmail || compEmail || loginEmail;
                        if (targetEmail) setLoginEmail(targetEmail);
                        handleSwitchTab('login');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-[#D9F22A] text-[#060A15] font-black text-[11px] hover:bg-[#cbe31c] transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Fazer Login com este E-mail</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleQuickPasswordReset(affEmail || compEmail || loginEmail)}
                      disabled={isSubmitting}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-[11px] hover:bg-emerald-500/30 transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>Enviar Link de Recuperação por E-mail</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleGoogleLogin(modalTab === 'register_company' ? 'empresa' : 'afiliado')}
                      className="px-3 py-1.5 rounded-lg bg-white/10 text-white font-bold text-[11px] hover:bg-white/20 transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                      </svg>
                      <span>Entrar com Google</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Success Message Alert */}
            {successMessage && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center gap-2.5 animate-in fade-in duration-200">
                <CheckCircle className="w-4 h-4 flex-shrink-0 text-[#D9F22A]" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* 1. LOGIN TAB */}
            {modalTab === 'login' && (
              <div>
                <div className="mb-4">
                  <h3 className="text-2xl font-black text-white font-['Syne']">
                    Entrar na sua Conta
                  </h3>
                  <p className="text-xs text-white/70 mt-1">
                    Informe seu e-mail e senha cadastrados para acessar seu painel.
                  </p>
                </div>

                <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4">
                  {/* Role preference toggle for quick login */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-1.5">
                      Perfil Principal
                    </label>
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => setLoginRole('afiliado')}
                        className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer ${
                          loginRole === 'afiliado'
                            ? 'bg-[#D9F22A]/10 border-[#D9F22A] text-[#D9F22A]'
                            : 'bg-[#050811] border-white/10 text-white/60 hover:text-white'
                        }`}
                      >
                        <UserCheck className="w-4 h-4" />
                        <span>Afiliado</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setLoginRole('empresa')}
                        className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer ${
                          loginRole === 'empresa'
                            ? 'bg-[#D9F22A]/10 border-[#D9F22A] text-[#D9F22A]'
                            : 'bg-[#050811] border-white/10 text-white/60 hover:text-white'
                        }`}
                      >
                        <Building2 className="w-4 h-4" />
                        <span>Empresa / Startup</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-1.5">
                      E-mail
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
                      <input
                        type="email"
                        required
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="seu.email@exemplo.com"
                        className="w-full bg-[#050811] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-white/40 focus:outline-none focus:border-[#D9F22A] transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold uppercase tracking-wider text-white/70">
                        Senha
                      </label>
                      <button
                        type="button"
                        onClick={() => handleSwitchTab('forgot_password')}
                        className="text-xs text-[#D9F22A] hover:underline cursor-pointer font-bold"
                      >
                        Esqueceu a senha?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
                      <input
                        type={showLoginPassword ? 'text' : 'password'}
                        required
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="Sua senha de acesso"
                        className="w-full bg-[#050811] border border-white/10 rounded-xl pl-10 pr-10 py-3 text-sm text-white placeholder-white/40 focus:outline-none focus:border-[#D9F22A] transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        aria-label={showLoginPassword ? 'Ocultar senha' : 'Ver senha'}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors cursor-pointer p-1 rounded-lg hover:bg-white/5"
                      >
                        {showLoginPassword ? <EyeOff className="w-4 h-4 text-[#D9F22A]" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="mt-2 w-full bg-[#D9F22A] hover:bg-[#cbe31c] text-[#060A15] font-black py-3.5 px-6 rounded-xl transition-all duration-300 text-sm uppercase tracking-wider shadow-[0_0_20px_rgba(217,242,42,0.3)] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <span>Autenticando...</span>
                    ) : (
                      <>
                        <span>Entrar no Painel</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  {/* Divider */}
                  <div className="relative flex py-1 items-center">
                    <div className="flex-grow border-t border-white/10"></div>
                    <span className="flex-shrink mx-3 text-[10px] font-bold uppercase tracking-widest text-white/40">ou continue com</span>
                    <div className="flex-grow border-t border-white/10"></div>
                  </div>

                  {/* Google Login Button */}
                  <button
                    type="button"
                    onClick={() => handleGoogleLogin(loginRole)}
                    disabled={isSubmitting}
                    className="w-full bg-white/5 hover:bg-white/10 border border-white/15 text-white font-bold py-3 px-4 rounded-xl transition-all duration-200 text-xs flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <span>Entrar com conta Google</span>
                  </button>

                  <div className="text-center pt-2 text-xs text-white/60">
                    Ainda não possui conta?{' '}
                    <button
                      type="button"
                      onClick={() => handleSwitchTab('register_affiliate')}
                      className="text-[#D9F22A] font-bold hover:underline cursor-pointer"
                    >
                      Cadastre-se Gratuitamente
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* 2. REGISTER AFFILIATE TAB */}
            {modalTab === 'register_affiliate' && (
              <div>
                <div className="mb-4">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#D9F22A]/10 border border-[#D9F22A]/30 text-[#D9F22A] text-[10px] font-bold uppercase mb-2">
                    <UserCheck className="w-3 h-3" /> Cadastro de Afiliado Profissional
                  </div>
                  <h3 className="text-2xl font-black text-white font-['Syne']">
                    Crie sua Conta de Afiliado
                  </h3>
                  <p className="text-xs text-white/70 mt-1">
                    Venda softwares e startups validadas com comissões de até 50% e saques PIX D+0.
                  </p>
                </div>

                <form onSubmit={handleRegisterAffiliateSubmit} className="flex flex-col gap-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-1">
                        Nome Completo *
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
                        <input
                          type="text"
                          required
                          value={affName}
                          onChange={(e) => setAffName(e.target.value)}
                          placeholder="Rodrigo Silveira"
                          className="w-full bg-[#050811] border border-white/10 rounded-xl pl-10 pr-3 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#D9F22A]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-1">
                        E-mail de Acesso *
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
                        <input
                          type="email"
                          required
                          value={affEmail}
                          onChange={(e) => setAffEmail(e.target.value)}
                          placeholder="rodrigo@email.com"
                          className="w-full bg-[#050811] border border-white/10 rounded-xl pl-10 pr-3 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#D9F22A]"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-1">
                        WhatsApp / Telefone
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
                        <input
                          type="text"
                          value={affWhatsapp}
                          onChange={(e) => setAffWhatsapp(formatPhone(e.target.value))}
                          placeholder="(11) 99876-5432"
                          maxLength={15}
                          className="w-full bg-[#050811] border border-white/10 rounded-xl pl-10 pr-3 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#D9F22A]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-1">
                        CPF (Único por conta)
                      </label>
                      <div className="relative">
                        <FileText className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
                        <input
                          type="text"
                          value={affCpf}
                          onChange={(e) => {
                            const formatted = formatCPF(e.target.value);
                            setAffCpf(formatted);
                            if (affPixKeyType === 'CPF' && !affPixKey) {
                              setAffPixKey(formatted);
                            }
                          }}
                          placeholder="000.000.000-00"
                          maxLength={14}
                          className="w-full bg-[#050811] border border-white/10 rounded-xl pl-10 pr-3 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#D9F22A]"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-1">
                        Tipo da Chave PIX
                      </label>
                      <select
                        value={affPixKeyType}
                        onChange={(e) => setAffPixKeyType(e.target.value)}
                        className="w-full bg-[#050811] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#D9F22A]"
                      >
                        <option value="CPF">CPF</option>
                        <option value="E-mail">E-mail</option>
                        <option value="Celular / WhatsApp">Celular</option>
                        <option value="Chave Aleatória">Chave Aleatória</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-1">
                        Chave PIX
                      </label>
                      <div className="relative">
                        <CreditCard className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
                        <input
                          type="text"
                          value={affPixKey}
                          onChange={(e) => setAffPixKey(e.target.value)}
                          placeholder="Sua chave PIX para receber comissões"
                          className="w-full bg-[#050811] border border-white/10 rounded-xl pl-10 pr-3 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#D9F22A]"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold uppercase tracking-wider text-white/70">
                          Senha de Acesso *
                        </label>
                        {affPassword.length > 0 && affPassword.length < 6 && (
                          <span className="text-[10px] text-amber-400 font-medium">Mínimo 6 dígitos</span>
                        )}
                      </div>
                      <div className="relative">
                        <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
                        <input
                          type={showAffPassword ? 'text' : 'password'}
                          required
                          value={affPassword}
                          onChange={(e) => setAffPassword(e.target.value)}
                          placeholder="Mínimo 6 caracteres"
                          className="w-full bg-[#050811] border border-white/10 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#D9F22A] transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => setShowAffPassword(!showAffPassword)}
                          aria-label={showAffPassword ? 'Ocultar senha' : 'Ver senha'}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors cursor-pointer p-1 rounded-md hover:bg-white/5"
                        >
                          {showAffPassword ? <EyeOff className="w-3.5 h-3.5 text-[#D9F22A]" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold uppercase tracking-wider text-white/70">
                          Confirmar Senha *
                        </label>
                        {affConfirmPassword.length > 0 && (
                          <span className={`text-[10px] font-bold flex items-center gap-1 ${
                            affPassword === affConfirmPassword && affPassword.length >= 6 
                              ? 'text-emerald-400' 
                              : 'text-red-400'
                          }`}>
                            {affPassword === affConfirmPassword && affPassword.length >= 6 ? (
                              <>
                                <CheckCircle className="w-3 h-3" />
                                <span>Iguais</span>
                              </>
                            ) : (
                              <>
                                <AlertCircle className="w-3 h-3" />
                                <span>Diferentes</span>
                              </>
                            )}
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
                        <input
                          type={showAffConfirmPassword ? 'text' : 'password'}
                          required
                          value={affConfirmPassword}
                          onChange={(e) => setAffConfirmPassword(e.target.value)}
                          placeholder="Repita sua senha"
                          className={`w-full bg-[#050811] border rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none transition-colors ${
                            affConfirmPassword.length > 0
                              ? affPassword === affConfirmPassword && affPassword.length >= 6
                                ? 'border-emerald-500/60 focus:border-emerald-400 bg-emerald-500/5'
                                : 'border-red-500/60 focus:border-red-400 bg-red-500/5'
                              : 'border-white/10 focus:border-[#D9F22A]'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowAffConfirmPassword(!showAffConfirmPassword)}
                          aria-label={showAffConfirmPassword ? 'Ocultar senha' : 'Ver senha'}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors cursor-pointer p-1 rounded-md hover:bg-white/5"
                        >
                          {showAffConfirmPassword ? <EyeOff className="w-3.5 h-3.5 text-[#D9F22A]" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Real-time Password Match Feedback Alert */}
                  {affConfirmPassword.length > 0 && (
                    <div className={`p-2.5 rounded-xl text-xs font-medium flex items-center gap-2 transition-all ${
                      affPassword === affConfirmPassword && affPassword.length >= 6
                        ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                        : 'bg-red-500/10 border border-red-500/30 text-red-400'
                    }`}>
                      {affPassword === affConfirmPassword && affPassword.length >= 6 ? (
                        <>
                          <CheckCircle className="w-4 h-4 flex-shrink-0 text-emerald-400" />
                          <span>As senhas coincidem perfeitamente! Você está pronto para criar sua conta.</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
                          <span>
                            {affPassword !== affConfirmPassword 
                              ? 'As senhas digitadas não são iguais. Verifique os caracteres.' 
                              : 'A senha deve ter pelo menos 6 caracteres.'}
                          </span>
                        </>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="termsAff"
                      required
                      defaultChecked
                      className="rounded border-white/20 bg-[#050811] text-[#D9F22A] focus:ring-0 cursor-pointer"
                    />
                    <label htmlFor="termsAff" className="text-[11px] text-white/70 cursor-pointer">
                      Concordo com os Termos de Afiliação e Repasses PIX D+0.
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="mt-2 w-full bg-[#D9F22A] hover:bg-[#cbe31c] text-[#060A15] font-black py-3.5 px-6 rounded-xl transition-all duration-300 text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(217,242,42,0.3)] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <span>Criando conta de Afiliado...</span>
                    ) : (
                      <>
                        <span>Finalizar Cadastro de Afiliado</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  {/* Divider */}
                  <div className="relative flex py-1 items-center">
                    <div className="flex-grow border-t border-white/10"></div>
                    <span className="flex-shrink mx-3 text-[10px] font-bold uppercase tracking-widest text-white/40">ou cadastre-se com</span>
                    <div className="flex-grow border-t border-white/10"></div>
                  </div>

                  {/* Google Quick Registration */}
                  <button
                    type="button"
                    onClick={() => handleGoogleLogin('afiliado')}
                    disabled={isSubmitting}
                    className="w-full bg-white/5 hover:bg-white/10 border border-white/15 text-white font-bold py-3 px-4 rounded-xl transition-all duration-200 text-xs flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <span>Criar conta de Afiliado com Google</span>
                  </button>

                  <div className="text-center text-xs text-white/60">
                    Já possui uma conta?{' '}
                    <button
                      type="button"
                      onClick={() => handleSwitchTab('login')}
                      className="text-[#D9F22A] font-bold hover:underline cursor-pointer"
                    >
                      Fazer Login
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* 3. REGISTER COMPANY TAB */}
            {modalTab === 'register_company' && (
              <div>
                <div className="mb-4">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#D9F22A]/10 border border-[#D9F22A]/30 text-[#D9F22A] text-[10px] font-bold uppercase mb-2">
                    <Building2 className="w-3 h-3" /> Cadastro Corporativo / Startups
                  </div>
                  <h3 className="text-2xl font-black text-white font-['Syne']">
                    Cadastre sua Empresa ou Startup
                  </h3>
                  <p className="text-xs text-white/70 mt-1">
                    Disponibilize seus softwares e planos para milhares de afiliados venderem com escala e automação.
                  </p>
                </div>

                <form onSubmit={handleRegisterCompanySubmit} className="flex flex-col gap-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-1">
                        Nome da Empresa / Startup *
                      </label>
                      <div className="relative">
                        <Building2 className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
                        <input
                          type="text"
                          required
                          value={compName}
                          onChange={(e) => setCompName(e.target.value)}
                          placeholder="Ex: SaaSify Cloud Technologies"
                          className="w-full bg-[#050811] border border-white/10 rounded-xl pl-10 pr-3 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#D9F22A]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-1">
                        Nome do Fundador / Sócio *
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
                        <input
                          type="text"
                          required
                          value={compOwnerName}
                          onChange={(e) => setCompOwnerName(e.target.value)}
                          placeholder="Ex: Carlos Eduardo"
                          className="w-full bg-[#050811] border border-white/10 rounded-xl pl-10 pr-3 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#D9F22A]"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-1">
                        E-mail Corporativo *
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
                        <input
                          type="email"
                          required
                          value={compEmail}
                          onChange={(e) => setCompEmail(e.target.value)}
                          placeholder="contato@empresa.com"
                          className="w-full bg-[#050811] border border-white/10 rounded-xl pl-10 pr-3 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#D9F22A]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-1">
                        WhatsApp Comercial / Telefone
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
                        <input
                          type="text"
                          value={compWhatsapp}
                          onChange={(e) => setCompWhatsapp(formatPhone(e.target.value))}
                          placeholder="(11) 98888-7777"
                          maxLength={15}
                          className="w-full bg-[#050811] border border-white/10 rounded-xl pl-10 pr-3 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#D9F22A]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Logotipo da Empresa - Upload da Galeria ou Presets */}
                  <div className="bg-[#050811]/80 border border-white/10 rounded-2xl p-3.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-white/80 mb-2">
                      Logotipo / Imagem da Empresa (Selecione da Galeria)
                    </label>
                    <div className="flex items-center gap-3">
                      <div className="relative group w-14 h-14 rounded-2xl overflow-hidden border border-[#D9F22A]/50 bg-black/50 flex-shrink-0 flex items-center justify-center">
                        {compLogo ? (
                          <img
                            src={compLogo}
                            alt="Logo preview"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <ImageIcon className="w-6 h-6 text-white/40" />
                        )}
                      </div>

                      <div className="flex-1 flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                          <label className="inline-flex items-center justify-center gap-2 bg-[#D9F22A] text-black hover:bg-[#c5dc24] font-bold text-xs px-3.5 py-2 rounded-xl transition-all cursor-pointer shadow-[0_0_15px_rgba(217,242,42,0.2)]">
                            <Upload className="w-3.5 h-3.5" />
                            <span>Escolher da Galeria</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onload = (event) => {
                                    if (event.target?.result) {
                                      setCompLogo(event.target.result as string);
                                    }
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                          </label>
                          {compLogo && (
                            <button
                              type="button"
                              onClick={() => setCompLogo('')}
                              className="text-[11px] text-rose-400 hover:underline px-2 py-1"
                            >
                              Remover
                            </button>
                          )}
                        </div>
                        <span className="text-[11px] text-white/40">
                          Formatos aceitos: JPG, PNG, WEBP ou ícones da sua galeria
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Documento da Empresa: CNPJ, CPF ou Não tem CNPJ */}
                  <div className="bg-[#050811]/80 border border-white/10 rounded-2xl p-3.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-white/80 mb-2">
                      Documento da Empresa / Produtor
                    </label>

                    {/* Seleção de Tipo de Documento */}
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <button
                        type="button"
                        onClick={() => setCompDocType('CNPJ')}
                        className={`text-xs py-2 px-2.5 rounded-xl border font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          compDocType === 'CNPJ'
                            ? 'border-[#D9F22A] bg-[#D9F22A]/15 text-[#D9F22A]'
                            : 'border-white/10 bg-white/5 text-white/60 hover:text-white'
                        }`}
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Possuo CNPJ</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setCompDocType('CPF')}
                        className={`text-xs py-2 px-2.5 rounded-xl border font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          compDocType === 'CPF'
                            ? 'border-[#D9F22A] bg-[#D9F22A]/15 text-[#D9F22A]'
                            : 'border-white/10 bg-white/5 text-white/60 hover:text-white'
                        }`}
                      >
                        <User className="w-3.5 h-3.5" />
                        <span>Usar meu CPF</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setCompDocType('SEM_CNPJ')}
                        className={`text-xs py-2 px-2.5 rounded-xl border font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          compDocType === 'SEM_CNPJ'
                            ? 'border-[#D9F22A] bg-[#D9F22A]/15 text-[#D9F22A]'
                            : 'border-white/10 bg-white/5 text-white/60 hover:text-white'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Ainda sem CNPJ</span>
                      </button>
                    </div>

                    {/* Campo condicional baseado no tipo selecionado */}
                    {compDocType === 'CNPJ' && (
                      <div className="relative animate-in fade-in duration-200">
                        <FileText className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
                        <input
                          type="text"
                          value={compCnpj}
                          onChange={(e) => setCompCnpj(formatCNPJ(e.target.value))}
                          placeholder="Digite o CNPJ: 00.000.000/0000-00"
                          maxLength={18}
                          className="w-full bg-[#050811] border border-white/15 rounded-xl pl-10 pr-3 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#D9F22A]"
                        />
                      </div>
                    )}

                    {compDocType === 'CPF' && (
                      <div className="relative animate-in fade-in duration-200">
                        <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
                        <input
                          type="text"
                          value={compCpf}
                          onChange={(e) => setCompCpf(formatCPF(e.target.value))}
                          placeholder="Digite o CPF do titular: 000.000.000-00"
                          maxLength={14}
                          className="w-full bg-[#050811] border border-white/15 rounded-xl pl-10 pr-3 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#D9F22A]"
                        />
                      </div>
                    )}

                    {compDocType === 'SEM_CNPJ' && (
                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs flex items-center gap-2 animate-in fade-in duration-200">
                        <CheckCircle className="w-4 h-4 flex-shrink-0" />
                        <span>Sua startup poderá operar normalmente como pessoa física enquanto providencia o CNPJ.</span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-1">
                        Categoria da Startup
                      </label>
                      <select
                        value={compCategory}
                        onChange={(e) => setCompCategory(e.target.value)}
                        className="w-full bg-[#050811] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#D9F22A]"
                      >
                        <option value="SaaS / B2B">SaaS / B2B</option>
                        <option value="iGaming & Apostas">iGaming & Apostas</option>
                        <option value="Fintech & Pagamentos">Fintech & Pagamentos</option>
                        <option value="Marketing & Vendas">Marketing & Vendas</option>
                        <option value="IA & Automação">IA & Automação</option>
                        <option value="Educação / Cursos">Educação / Cursos</option>
                        <option value="E-commerce / Dropship">E-commerce / Dropship</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-1">
                        Website / URL da Solução
                      </label>
                      <div className="relative">
                        <Globe className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
                        <input
                          type="url"
                          value={compWebsite}
                          onChange={(e) => setCompWebsite(e.target.value)}
                          placeholder="https://suastartup.com"
                          className="w-full bg-[#050811] border border-white/10 rounded-xl pl-10 pr-3 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#D9F22A]"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-1">
                      Slogan / Tagline Curta
                    </label>
                    <div className="relative">
                      <Briefcase className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
                      <input
                        type="text"
                        value={compTagline}
                        onChange={(e) => setCompTagline(e.target.value)}
                        placeholder="Ex: Plataforma líder em automação comercial"
                        className="w-full bg-[#050811] border border-white/10 rounded-xl pl-10 pr-3 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#D9F22A]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold uppercase tracking-wider text-white/70">
                          Senha de Acesso *
                        </label>
                        {compPassword.length > 0 && compPassword.length < 6 && (
                          <span className="text-[10px] text-amber-400 font-medium">Mínimo 6 dígitos</span>
                        )}
                      </div>
                      <div className="relative">
                        <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
                        <input
                          type={showCompPassword ? 'text' : 'password'}
                          required
                          value={compPassword}
                          onChange={(e) => setCompPassword(e.target.value)}
                          placeholder="Mínimo 6 caracteres"
                          className="w-full bg-[#050811] border border-white/10 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#D9F22A] transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCompPassword(!showCompPassword)}
                          aria-label={showCompPassword ? 'Ocultar senha' : 'Ver senha'}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors cursor-pointer p-1 rounded-md hover:bg-white/5"
                        >
                          {showCompPassword ? <EyeOff className="w-3.5 h-3.5 text-[#D9F22A]" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold uppercase tracking-wider text-white/70">
                          Confirmar Senha *
                        </label>
                        {compConfirmPassword.length > 0 && (
                          <span className={`text-[10px] font-bold flex items-center gap-1 ${
                            compPassword === compConfirmPassword && compPassword.length >= 6 
                              ? 'text-emerald-400' 
                              : 'text-red-400'
                          }`}>
                            {compPassword === compConfirmPassword && compPassword.length >= 6 ? (
                              <>
                                <CheckCircle className="w-3 h-3" />
                                <span>Iguais</span>
                              </>
                            ) : (
                              <>
                                <AlertCircle className="w-3 h-3" />
                                <span>Diferentes</span>
                              </>
                            )}
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
                        <input
                          type={showCompConfirmPassword ? 'text' : 'password'}
                          required
                          value={compConfirmPassword}
                          onChange={(e) => setCompConfirmPassword(e.target.value)}
                          placeholder="Repita sua senha"
                          className={`w-full bg-[#050811] border rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none transition-colors ${
                            compConfirmPassword.length > 0
                              ? compPassword === compConfirmPassword && compPassword.length >= 6
                                ? 'border-emerald-500/60 focus:border-emerald-400 bg-emerald-500/5'
                                : 'border-red-500/60 focus:border-red-400 bg-red-500/5'
                              : 'border-white/10 focus:border-[#D9F22A]'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowCompConfirmPassword(!showCompConfirmPassword)}
                          aria-label={showCompConfirmPassword ? 'Ocultar senha' : 'Ver senha'}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors cursor-pointer p-1 rounded-md hover:bg-white/5"
                        >
                          {showCompConfirmPassword ? <EyeOff className="w-3.5 h-3.5 text-[#D9F22A]" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Real-time Password Match Feedback Alert */}
                  {compConfirmPassword.length > 0 && (
                    <div className={`p-2.5 rounded-xl text-xs font-medium flex items-center gap-2 transition-all ${
                      compPassword === compConfirmPassword && compPassword.length >= 6
                        ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                        : 'bg-red-500/10 border border-red-500/30 text-red-400'
                    }`}>
                      {compPassword === compConfirmPassword && compPassword.length >= 6 ? (
                        <>
                          <CheckCircle className="w-4 h-4 flex-shrink-0 text-emerald-400" />
                          <span>As senhas coincidem perfeitamente! Você está pronto para cadastrar sua empresa.</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
                          <span>
                            {compPassword !== compConfirmPassword 
                              ? 'As senhas digitadas não são iguais. Verifique os caracteres.' 
                              : 'A senha deve ter pelo menos 6 caracteres.'}
                          </span>
                        </>
                      )}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="mt-2 w-full bg-[#D9F22A] hover:bg-[#cbe31c] text-[#060A15] font-black py-3.5 px-6 rounded-xl transition-all duration-300 text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(217,242,42,0.3)] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <span>Cadastrando Empresa...</span>
                    ) : (
                      <>
                        <span>Finalizar Cadastro da Empresa</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  {/* Divider */}
                  <div className="relative flex py-1 items-center">
                    <div className="flex-grow border-t border-white/10"></div>
                    <span className="flex-shrink mx-3 text-[10px] font-bold uppercase tracking-widest text-white/40">ou cadastre-se com</span>
                    <div className="flex-grow border-t border-white/10"></div>
                  </div>

                  {/* Google Quick Registration for Company */}
                  <button
                    type="button"
                    onClick={() => handleGoogleLogin('empresa')}
                    disabled={isSubmitting}
                    className="w-full bg-white/5 hover:bg-white/10 border border-white/15 text-white font-bold py-3 px-4 rounded-xl transition-all duration-200 text-xs flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <span>Cadastrar Empresa com Google</span>
                  </button>

                  <div className="text-center text-xs text-white/60">
                    Já possui uma conta?{' '}
                    <button
                      type="button"
                      onClick={() => handleSwitchTab('login')}
                      className="text-[#D9F22A] font-bold hover:underline cursor-pointer"
                    >
                      Fazer Login
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* 4. FORGOT PASSWORD TAB */}
            {modalTab === 'forgot_password' && (
              <div>
                <div className="mb-4">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#D9F22A]/10 border border-[#D9F22A]/30 text-[#D9F22A] text-[10px] font-bold uppercase mb-2">
                    <KeyRound className="w-3 h-3" /> Recuperação de Acesso
                  </div>
                  <h3 className="text-2xl font-black text-white font-['Syne']">
                    Recuperar Senha
                  </h3>
                  <p className="text-xs text-white/70 mt-1">
                    Digite o e-mail cadastrado na sua conta. Enviaremos um link seguro para você redefinir sua senha.
                  </p>
                </div>

                <form onSubmit={handlePasswordResetSubmit} className="flex flex-col gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-1.5">
                      E-mail Cadastrado
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
                      <input
                        type="email"
                        required
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        placeholder="seu.email@exemplo.com"
                        className="w-full bg-[#050811] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-white/40 focus:outline-none focus:border-[#D9F22A] transition-colors"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-[#D9F22A] hover:bg-[#cbe31c] text-[#060A15] font-black py-3.5 px-6 rounded-xl transition-all duration-300 text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(217,242,42,0.3)] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <span>Enviando link de recuperação...</span>
                    ) : (
                      <>
                        <span>Enviar Link de Redefinição</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => handleSwitchTab('login')}
                      className="text-xs text-[#D9F22A] hover:underline font-bold cursor-pointer"
                    >
                      ← Voltar para a tela de Login
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* INFORMATIONAL & SITE POLICY MODALS                        */}
        {/* ========================================================= */}

        {/* CAREERS / TRABALHE CONOSCO */}
        {activeModal === 'careers' && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#D9F22A]">
              <span className="w-2 h-2 rounded-full bg-[#D9F22A]" />
              Ecossistema LeadsPay
            </div>

            <h3 className="text-2xl sm:text-3xl font-extrabold text-white font-['Syne']">
              Seja Parceiro ou Faça Parte do Time
            </h3>

            <p className="text-sm text-white/80 leading-relaxed">
              Estamos transformando a distribuição comercial de startups na América Latina. Cadastre-se como afiliado profissional ou cadastre sua empresa.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={() => setModalTab('register_affiliate')}
                className="p-5 rounded-2xl bg-[#050811] border border-white/10 hover:border-[#D9F22A] text-left flex flex-col gap-2 transition-all cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-xl bg-[#D9F22A]/10 text-[#D9F22A] flex items-center justify-center group-hover:scale-110 transition-transform">
                  <UserCheck className="w-5 h-5" />
                </div>
                <h4 className="text-base font-bold text-white group-hover:text-[#D9F22A]">Quero Ser Afiliado</h4>
                <p className="text-xs text-white/60">Venda softwares e planos com comissões de até 50% via PIX D+0.</p>
              </button>

              <button
                onClick={() => setModalTab('register_company')}
                className="p-5 rounded-2xl bg-[#050811] border border-white/10 hover:border-[#D9F22A] text-left flex flex-col gap-2 transition-all cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-xl bg-[#D9F22A]/10 text-[#D9F22A] flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Building2 className="w-5 h-5" />
                </div>
                <h4 className="text-base font-bold text-white group-hover:text-[#D9F22A]">Sou Fundador de Startup</h4>
                <p className="text-xs text-white/60">Publique seus planos para centenas de vendedores fecharem contratos.</p>
              </button>
            </div>
          </div>
        )}

        {/* ABOUT / QUEM SOMOS */}
        {activeModal === 'about' && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#D9F22A]">
              <span className="w-2 h-2 rounded-full bg-[#D9F22A]" />
              Marketplace de Startups B2B
            </div>

            <h3 className="text-2xl sm:text-3xl font-extrabold text-white font-['Syne']">
              Sobre o LeadsPay
            </h3>

            <div className="space-y-4 text-sm text-white/80 leading-relaxed">
              <p>
                O <strong>LeadsPay</strong> é o ecossistema e infraestrutura que acelera a aquisição de clientes para startups de tecnologia através de uma rede ativa de milhares de afiliados especializados.
              </p>
              <p>
                Garantimos que fundadores e empresas publiquem seus produtos com controle total das comissões, enquanto afiliados recebem comissões transparentes com liquidação automática em tempo real via <strong>PIX D+0</strong>.
              </p>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                  <div className="text-lg font-bold text-[#D9F22A]">+140</div>
                  <div className="text-xs text-white/60 uppercase">Startups Ativas</div>
                </div>
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                  <div className="text-lg font-bold text-[#D9F22A]">R$ 48M+</div>
                  <div className="text-xs text-white/60 uppercase">Em Comissões Repassadas</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CULTURE / NOSSA CULTURA */}
        {activeModal === 'culture' && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#D9F22A]">
              <span className="w-2 h-2 rounded-full bg-[#D9F22A]" />
              Valores e Infraestrutura
            </div>

            <h3 className="text-2xl sm:text-3xl font-extrabold text-white font-['Syne']">
              Cultura LeadsPay
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-[#050811] border border-white/10 flex flex-col gap-2">
                <span className="text-[#D9F22A] font-bold text-sm font-['Syne']">01. Split em Tempo Real</span>
                <p className="text-xs text-white/70">O valor da venda é dividido no ato da transação, sem atrasos ou retenções indevidas.</p>
              </div>
              <div className="p-4 rounded-xl bg-[#050811] border border-white/10 flex flex-col gap-2">
                <span className="text-[#D9F22A] font-bold text-sm font-['Syne']">02. Meritocracia & Performance</span>
                <p className="text-xs text-white/70">Afiliados que geram resultados têm comissões progressivas e acesso a ofertas exclusivas.</p>
              </div>
              <div className="p-4 rounded-xl bg-[#050811] border border-white/10 flex flex-col gap-2">
                <span className="text-[#D9F22A] font-bold text-sm font-['Syne']">03. Transparência Algorítmica</span>
                <p className="text-xs text-white/70">Atribuição exata de cada clique, lead e conversão sem arbitrariedades.</p>
              </div>
              <div className="p-4 rounded-xl bg-[#050811] border border-white/10 flex flex-col gap-2">
                <span className="text-[#D9F22A] font-bold text-sm font-['Syne']">04. Foco em Tração</span>
                <p className="text-xs text-white/70">Ajudamos startups a atingirem escala global sem precisarem queimar capital antecipado.</p>
              </div>
            </div>
          </div>
        )}

        {/* REPORT / CANAL DE ÉTICA */}
        {activeModal === 'report' && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#D9F22A]">
              <span className="w-2 h-2 rounded-full bg-[#D9F22A]" />
              Governança & Canal de Ética
            </div>

            <h3 className="text-2xl sm:text-3xl font-extrabold text-white font-['Syne']">
              Canal de Conduta & Denúncias
            </h3>

            <p className="text-sm text-white/80 leading-relaxed">
              Nosso canal de conformidade é uma ferramenta independente e confidencial para relatar qualquer inconformidade nos pagamentos, fraudes de tráfego ou violação dos termos de afiliação.
            </p>

            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 flex flex-col gap-3 text-xs text-white/70">
              <div className="flex items-center gap-2 text-white font-semibold">
                <ShieldCheck className="w-4 h-4 text-[#D9F22A]" />
                <span>Garantia de Anonimato & Proteção ao Denunciante</span>
              </div>
              <p>Relatos analisados por comitê de compliance independente com retorno em até 48 horas.</p>
            </div>

            <button
              onClick={() => {
                alert('Mensagem enviada ao comitê de governança e compliance.');
                onClose();
              }}
              className="w-full text-center bg-[#0c1222] border border-[#D9F22A] text-white hover:bg-[#D9F22A] hover:text-[#060A15] font-bold py-3 px-6 rounded-full transition-all duration-300 text-sm uppercase tracking-wider block cursor-pointer"
            >
              Registrar Comunicação Confidencial
            </button>
          </div>
        )}

        {/* RESPONSIBLE / SECURITY MODAL */}
        {activeModal === 'responsible' && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#D9F22A]">
              <span className="w-2 h-2 rounded-full bg-[#D9F22A]" />
              Segurança & Split Bancário
            </div>

            <h3 className="text-2xl sm:text-3xl font-extrabold text-white font-['Syne']">
              Diretrizes de Liquidação Financeira
            </h3>

            <div className="space-y-3 text-sm text-white/80">
              <p>
                Operamos com gateways de pagamento de alta resiliência e integração via API bancária para que as comissões cheguem diretamente à conta dos afiliados.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3.5 rounded-xl bg-[#050811] border border-white/5">
                  <div className="font-bold text-white text-xs mb-1">Repasse Instantâneo (PIX)</div>
                  <div className="text-xs text-white/60">Transferência imediata assim que a conversão é aprovada pela adquirente.</div>
                </div>
                <div className="p-3.5 rounded-xl bg-[#050811] border border-white/5">
                  <div className="font-bold text-white text-xs mb-1">Proteção Antifraude</div>
                  <div className="text-xs text-white/60">Filtros de tráfego robótico e auditoria de cookie tracking.</div>
                </div>
                <div className="p-3.5 rounded-xl bg-[#050811] border border-white/5">
                  <div className="font-bold text-white text-xs mb-1">Painel em Tempo Real</div>
                  <div className="text-xs text-white/60">Extratos auditáveis e conciliação financeira automática.</div>
                </div>
                <div className="p-3.5 rounded-xl bg-[#050811] border border-white/5">
                  <div className="font-bold text-white text-xs mb-1">LGPD & Criptografia</div>
                  <div className="text-xs text-white/60">Dados de clientes e afiliados protegidos de ponta a ponta.</div>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full text-center bg-[#D9F22A] text-[#060A15] font-bold py-3 px-6 rounded-full transition-all duration-300 text-sm uppercase tracking-wider block hover:bg-[#cbe31c] cursor-pointer"
            >
              Entendido
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
