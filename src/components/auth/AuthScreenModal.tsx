import React, { useState, useEffect, useMemo } from 'react';
import { 
  User, 
  UserCheck, 
  UserPlus, 
  Building2, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  Phone, 
  FileText, 
  CreditCard, 
  ChevronDown, 
  ArrowRight, 
  ShieldCheck, 
  Zap, 
  TrendingUp, 
  Sparkles, 
  Check, 
  Briefcase, 
  KeyRound, 
  X,
  Layers,
  Rocket,
  Users,
  Moon,
  Sun,
  QrCode,
  Network,
  ChartNoAxesCombined
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { 
  formatCPF, 
  formatCNPJ, 
  formatPhone, 
  isValidCPF, 
  isValidCNPJ, 
  cleanDigits,
  getAuthErrorMessage 
} from '../../services/authService';
import {
  subscribeAuthModalSettings,
  AuthModalSettings,
  getLocalAuthModalSettings
} from '../../services/firestoreService';
import '../../styles/auth-screen.css';

export type AuthModalType = 'login' | 'register_affiliate' | 'register_company' | 'forgot_password';

interface AuthScreenModalProps {
  activeModal: AuthModalType | null;
  onClose: () => void;
  onLoginSuccess?: () => void;
}

// Leadspay mark shared with the public landing page
const LeadsPayBrandLogo: React.FC = () => (
  <div className="auth-brand">
    <img className="auth-brand-mark" src="/favicon.svg" alt="" />
    <span className="auth-brand-copy">
      <span className="auth-brand-name">LEADSPAY</span>
      <span className="auth-brand-tagline">PAYMENTS &amp; SPLIT</span>
    </span>
  </div>
);

// Google 4-color SVG
const GoogleIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5 shrink-0" }) => (
  <svg className={className} viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </svg>
);

export const AuthScreenModal: React.FC<AuthScreenModalProps> = ({
  activeModal,
  onClose,
  onLoginSuccess
}) => {
  const { currentUser, userProfile, registerAffiliateUser, registerCompanyUser, login, loginWithGoogle, sendPasswordReset } = useAuth();

  // Active view: 'login' | 'register_affiliate' | 'register_company' | 'forgot_password'
  const [currentTab, setCurrentTab] = useState<AuthModalType>('login');
  const [isDark, setIsDark] = useState(() => {
    try {
      return typeof window !== 'undefined' && window.localStorage.getItem('leadspay-landing-theme') === 'dark';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const syncTheme = (event: Event) => {
      const theme = (event as CustomEvent<'light' | 'dark'>).detail;
      if (theme === 'light' || theme === 'dark') setIsDark(theme === 'dark');
    };
    const syncStorage = (event: StorageEvent) => {
      if (event.key === 'leadspay-landing-theme') setIsDark(event.newValue === 'dark');
    };
    window.addEventListener('leadspay-theme-change', syncTheme);
    window.addEventListener('storage', syncStorage);
    return () => {
      window.removeEventListener('leadspay-theme-change', syncTheme);
      window.removeEventListener('storage', syncStorage);
    };
  }, []);

  const toggleTheme = () => {
    const nextTheme = isDark ? 'light' : 'dark';
    setIsDark(nextTheme === 'dark');
    try {
      window.localStorage.setItem('leadspay-landing-theme', nextTheme);
    } catch {
      // O tema continua alternável durante a sessão se o storage estiver indisponível.
    }
    window.dispatchEvent(new CustomEvent('leadspay-theme-change', { detail: nextTheme }));
  };

  useEffect(() => {
    if (activeModal) {
      setCurrentTab(activeModal);
      setManualAffiliateOpen(false);
      setBasicCompanyOpen(false);
      if (activeModal === 'register_company') {
        if (currentUser?.email && !compEmail) {
          setCompEmail(currentUser.email);
        }
        if (userProfile?.name && !compOwnerName) {
          setCompOwnerName(userProfile.name);
        }
        if (userProfile?.whatsapp && !compWhatsapp) {
          setCompWhatsapp(userProfile.whatsapp);
        }
      }
    }
  }, [activeModal, currentUser, userProfile]);

  // Real-time custom modal images & showcase settings from Admin
  const [modalSettings, setModalSettings] = useState<AuthModalSettings>(getLocalAuthModalSettings());

  useEffect(() => {
    const unsub = subscribeAuthModalSettings((settings) => {
      if (settings) {
        setModalSettings(settings);
      }
    });

    const handleCustomEvent = (e: any) => {
      if (e.detail) setModalSettings(e.detail);
    };
    window.addEventListener('leadspay_modal_backgrounds_updated', handleCustomEvent);

    return () => {
      unsub();
      window.removeEventListener('leadspay_modal_backgrounds_updated', handleCustomEvent);
    };
  }, []);

  const activeImageUrl = useMemo(() => {
    if (currentTab === 'register_affiliate') {
      return modalSettings.affiliateBgUrl || modalSettings.affiliateShowcaseUrl || '';
    }
    if (currentTab === 'register_company') {
      return modalSettings.companyBgUrl || modalSettings.companyShowcaseUrl || '';
    }
    if (currentTab === 'login') {
      return modalSettings.loginBgUrl || modalSettings.loginShowcaseUrl || '';
    }
    if (currentTab === 'forgot_password') {
      return modalSettings.loginBgUrl || modalSettings.forgotPasswordShowcaseUrl || modalSettings.loginShowcaseUrl || '';
    }
    return '';
  }, [currentTab, modalSettings]);

  // Loading and Feedback
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Password visibility
  const [showLoginPassword, setShowLoginPassword] = useState<boolean>(false);
  const [showAffPassword, setShowAffPassword] = useState<boolean>(false);
  const [showAffConfirmPassword, setShowAffConfirmPassword] = useState<boolean>(false);
  const [showCompPassword, setShowCompPassword] = useState<boolean>(false);
  const [showCompConfirmPassword, setShowCompConfirmPassword] = useState<boolean>(false);

  // Accordion states
  const [manualAffiliateOpen, setManualAffiliateOpen] = useState<boolean>(false); // Closed by default as requested
  const [basicCompanyOpen, setBasicCompanyOpen] = useState<boolean>(false); // Collapsed by default

  // 1. Login State (Screenshot 3)
  const [loginRole, setLoginRole] = useState<'afiliado' | 'empresa'>('afiliado');
  const [loginEmail, setLoginEmail] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');

  // 2. Affiliate Registration State (Screenshot 1)
  const [affName, setAffName] = useState<string>('');
  const [affEmail, setAffEmail] = useState<string>('');
  const [affWhatsapp, setAffWhatsapp] = useState<string>('');
  const [affCpf, setAffCpf] = useState<string>('');
  const [affPixKeyType, setAffPixKeyType] = useState<string>('CPF');
  const [affPixKey, setAffPixKey] = useState<string>('');
  const [affPassword, setAffPassword] = useState<string>('');
  const [affConfirmPassword, setAffConfirmPassword] = useState<string>('');
  const [affTermsAccepted, setAffTermsAccepted] = useState<boolean>(true);

  // 3. Company Registration State (Screenshot 2)
  const [compName, setCompName] = useState<string>('');
  const [compOwnerName, setCompOwnerName] = useState<string>('');
  const [compEmail, setCompEmail] = useState<string>('');
  const [compWhatsapp, setCompWhatsapp] = useState<string>('');
  const [compDocType, setCompDocType] = useState<'CNPJ' | 'CPF'>('CNPJ');
  const [compCnpj, setCompCnpj] = useState<string>('');
  const [compCpf, setCompCpf] = useState<string>('');
  const [compCategory, setCompCategory] = useState<string>('SaaS / B2B');
  const [compPassword, setCompPassword] = useState<string>('');
  const [compConfirmPassword, setCompConfirmPassword] = useState<string>('');

  // 4. Reset password
  const [resetEmail, setResetEmail] = useState<string>('');

  // Switch tab helper
  const handleSwitchTab = (tab: AuthModalType) => {
    setCurrentTab(tab);
    setManualAffiliateOpen(false);
    setBasicCompanyOpen(false);
    setErrorMessage('');
    setSuccessMessage('');
  };

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!activeModal) return null;

  // HANDLERS
  const handleGoogleAuth = async (preferredRole: 'afiliado' | 'empresa' = 'afiliado') => {
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
      setErrorMessage(getAuthErrorMessage(error));
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setIsSubmitting(true);

    try {
      await login(loginEmail, loginPassword, loginRole);
      setSuccessMessage('Autenticado com sucesso! Entrando na plataforma...');
      setTimeout(() => {
        setIsSubmitting(false);
        onClose();
        if (onLoginSuccess) onLoginSuccess();
      }, 1000);
    } catch (error: any) {
      setIsSubmitting(false);
      console.error('Erro no login:', error);
      setErrorMessage(getAuthErrorMessage(error));
    }
  };

  const handleRegisterAffiliateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!affName.trim()) {
      setErrorMessage('Por favor, informe seu nome completo.');
      return;
    }
    if (!affEmail.trim()) {
      setErrorMessage('Por favor, informe seu e-mail de acesso.');
      return;
    }
    if (affPassword !== affConfirmPassword) {
      setErrorMessage('As senhas digitadas não coincidem.');
      return;
    }
    if (affPassword.length < 6) {
      setErrorMessage('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (!affTermsAccepted) {
      setErrorMessage('Você deve concordar com os Termos de Afiliação e Repasses PIX D+9.');
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
      setErrorMessage(getAuthErrorMessage(error));
    }
  };

  const handleRegisterCompanySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!compName.trim()) {
      setErrorMessage('Por favor, informe o nome da sua empresa ou startup.');
      return;
    }
    if (!compEmail.trim()) {
      setErrorMessage('Por favor, informe o e-mail corporativo.');
      return;
    }
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
      const res = await registerCompanyUser({
        companyName: compName,
        ownerName: compOwnerName || compName,
        email: compEmail,
        password: compPassword,
        whatsapp: compWhatsapp,
        documentType: compDocType,
        cnpj: compDocType === 'CNPJ' ? compCnpj : undefined,
        cpf: compDocType === 'CPF' ? compCpf : undefined,
        category: compCategory
      });

      const isExisting = res.company?.id && res.company.name !== compName;
      setSuccessMessage(isExisting
        ? `Conta conectada com sucesso! Acessando ${res.company?.name || 'sua empresa'}...`
        : 'Acesso corporativo liberado com sucesso! Redirecionando para o painel...'
      );
      setTimeout(() => {
        setIsSubmitting(false);
        onClose();
        if (onLoginSuccess) onLoginSuccess();
      }, 1200);
    } catch (error: any) {
      setIsSubmitting(false);
      console.error('Erro no cadastro de empresa:', error);
      setErrorMessage(getAuthErrorMessage(error));
    }
  };

  const handlePasswordResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    if (!resetEmail.trim()) {
      setErrorMessage('Por favor, digite seu e-mail para receber o link.');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await sendPasswordReset(resetEmail);
      setIsSubmitting(false);
      setSuccessMessage(res.message);
    } catch (error: any) {
      setIsSubmitting(false);
      console.error('Erro na redefinição de senha:', error);
      setErrorMessage(getAuthErrorMessage(error));
    }
  };

  return (
    <div className="leadspay-auth-screen fixed inset-0 z-[60] overflow-y-auto flex items-center justify-center p-3 sm:p-6 lg:p-10" data-has-image={activeImageUrl ? 'true' : 'false'} data-theme={isDark ? 'dark' : 'light'}>
      {/* 🖼️ IMAGEM REAL DE FUNDO DA TELA (FULLSCREEN COVER) */}
      {activeImageUrl ? (
        <div 
          className="fixed inset-0 bg-cover bg-center bg-no-repeat transition-all duration-700 -z-20 scale-100"
          style={{ backgroundImage: `url(${activeImageUrl})` }}
        />
      ) : null}

      {!activeImageUrl && <div className="auth-backdrop-art fixed inset-0 -z-20" aria-hidden="true" />}

      {/* Véu claro preserva o contraste sem esconder a imagem customizada do administrador. */}
      <div 
        className="auth-overlay fixed inset-0 pointer-events-none transition-all duration-700 -z-10"
        style={{
          backgroundColor: activeImageUrl
            ? `rgba(2, 5, 12, ${(modalSettings.overlayDarkness ?? 78) / 100})`
            : (isDark ? 'rgba(10, 18, 14, 0.35)' : 'rgba(250, 252, 248, 0.20)')
        }}
      />

      {/* Rede de pagamentos decorativa inspirada na página pública da LeadsPay. */}
      {!activeImageUrl && (
        <div className="auth-network" aria-hidden="true">
          <svg viewBox="0 0 1000 700" preserveAspectRatio="none">
            <path d="M110 175 C290 175 335 245 500 350" />
            <path d="M80 315 C285 315 355 320 500 350" />
            <path d="M125 485 C300 485 365 410 500 350" />
            <path d="M890 145 C710 145 660 235 500 350" />
            <path d="M925 330 C730 330 650 335 500 350" />
            <path d="M875 505 C700 505 630 415 500 350" />
          </svg>
          <span className="auth-network-node auth-network-node--1"><Layers size={15} aria-hidden="true" />SaaS</span>
          <span className="auth-network-node auth-network-node--2"><QrCode size={15} aria-hidden="true" />PIX</span>
          <span className="auth-network-node auth-network-node--3"><Users size={15} aria-hidden="true" />Afiliação</span>
          <span className="auth-network-node auth-network-node--4"><CreditCard size={15} aria-hidden="true" />Pagamentos</span>
          <span className="auth-network-node auth-network-node--5"><Network size={15} aria-hidden="true" />Split automático</span>
          <span className="auth-network-node auth-network-node--6"><ChartNoAxesCombined size={15} aria-hidden="true" />Comissões</span>
        </div>
      )}

      {/* Botão Fechar no Topo Direito */}
      <button
        type="button"
        onClick={onClose}
        className="auth-close-button fixed top-5 right-5 sm:top-7 sm:right-8 w-11 h-11 rounded-full bg-[#0b121b]/80 border border-white/15 text-white/70 hover:text-white hover:border-[#a3e635] flex items-center justify-center transition-all focus:outline-none cursor-pointer z-50 shadow-2xl group"
        aria-label="Fechar"
      >
        <X className="w-5 h-5 group-hover:rotate-90 transition-transform" />
      </button>

      {/* Container Principal Centralizado */}
      <div className={`auth-shell relative z-20 flex flex-col items-center ${currentTab === 'register_company' || currentTab === 'register_affiliate' ? 'auth-shell--register' : 'auth-shell--compact'}`}>
        {/* CARD DO FORMULÁRIO */}
        <div className="auth-card w-full border border-white/10 rounded-[32px] p-6 sm:p-9 md:p-10 relative overflow-hidden flex flex-col gap-6">

          {/* Marca e alternância de tema compartilham a preferência da landing. */}
          <div className="auth-card-topbar">
            <LeadsPayBrandLogo />
            <button
              type="button"
              className="auth-theme-toggle"
              onClick={toggleTheme}
              aria-label={isDark ? 'Ativar tema claro' : 'Ativar tema escuro'}
              aria-pressed={isDark}
              title={isDark ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
            >
              {isDark ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}
              <span>{isDark ? 'Claro' : 'Escuro'}</span>
            </button>
          </div>

          {/* Notification Messages */}
          {errorMessage && (
            <div role="alert" aria-live="assertive" className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-center gap-2.5 animate-in fade-in">
              <span className="w-2 h-2 rounded-full bg-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
          {successMessage && (
            <div role="status" aria-live="polite" className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center gap-2.5 animate-in fade-in">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {(currentTab === 'register_affiliate' || currentTab === 'register_company') && (
            <div className="auth-role-switcher grid grid-cols-2 gap-1.5" role="group" aria-label="Escolha o tipo de cadastro">
              <button
                type="button"
                aria-pressed={currentTab === 'register_affiliate'}
                onClick={() => handleSwitchTab('register_affiliate')}
                className={`auth-role-option flex items-center justify-center gap-2 ${currentTab === 'register_affiliate' ? 'bg-gradient-to-r from-[#a3e635] to-[#bef264]' : ''}`}
              >
                <User className="w-4 h-4" aria-hidden="true" />
                Cadastro de Afiliado
              </button>
              <button
                type="button"
                aria-pressed={currentTab === 'register_company'}
                onClick={() => handleSwitchTab('register_company')}
                className={`auth-role-option flex items-center justify-center gap-2 ${currentTab === 'register_company' ? 'bg-gradient-to-r from-[#a3e635] to-[#bef264]' : ''}`}
              >
                <Building2 className="w-4 h-4" aria-hidden="true" />
                Cadastro de Empresa
              </button>
            </div>
          )}

          {/* =============================================================== */}
          {/* SCREEN 1: CADASTRO DE AFILIADO (LeadsPay_Cadastro_Afiliado)     */}
          {/* =============================================================== */}
          {currentTab === 'register_affiliate' && (
            <div className="flex flex-col gap-5">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 border border-lime-400/30 bg-lime-500/10 text-[#a3e635] text-[10px] font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-full w-fit">
                <UserCheck className="w-3.5 h-3.5 text-[#a3e635]" />
                <span>CADASTRO DE AFILIADO PROFISSIONAL</span>
              </div>

              {/* Title & Subtitle */}
              <div className="space-y-1.5 -mt-1">
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Crie sua Conta de <span className="text-[#a3e635]">Afiliado</span>
                </h2>
                <p className="text-xs text-white/60 font-normal leading-relaxed">
                  Venda softwares e startups validadas com comissões de até 50% e saques PIX D+9.
                </p>
              </div>

              {/* Google Button (Vibrant Light Lime gradient pill) */}
              <button
                type="button"
                onClick={() => handleGoogleAuth('afiliado')}
                disabled={isSubmitting}
                className="auth-google-button w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#d9f99d] via-[#bef264] to-[#a3e635] hover:brightness-105 active:scale-[0.99] text-slate-950 font-black flex items-center justify-center gap-3 shadow-[0_0_25px_rgba(163,230,53,0.3)] transition-all cursor-pointer group"
              >
                <GoogleIcon />
                <span className="text-sm font-black text-slate-950">Entrar com o Google</span>
                <ArrowRight className="w-4 h-4 text-slate-950 group-hover:translate-x-1 transition-transform" />
              </button>

              {/* Divider */}
              <div className="relative flex items-center justify-center my-1">
                <div className="w-full border-t border-white/10" />
                <span className="absolute bg-[#060b12] px-3 text-[10px] font-bold uppercase tracking-widest text-white/40">
                  OU
                </span>
              </div>

              {/* Accordion Pill */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setManualAffiliateOpen(!manualAffiliateOpen)}
                  className="auth-accordion w-full px-4 py-3 rounded-xl bg-[#09111b] border border-white/10 hover:border-white/20 flex items-center justify-between text-xs font-semibold text-white transition-all cursor-pointer"
                >
                  <span className="flex items-center gap-2.5 text-white/90">
                    <User className="w-4 h-4 text-[#a3e635]" />
                    Preencher meus dados manualmente
                  </span>
                  <ChevronDown className={`w-4 h-4 text-white/50 transition-transform duration-200 ${manualAffiliateOpen ? 'rotate-180' : ''}`} />
                </button>
                <div className="text-[11px] text-white/40 italic pl-1">
                  Você pode completar suas informações depois.
                </div>
              </div>

              {/* Manual Form (Expanded by default as in Screenshot 1) */}
              {manualAffiliateOpen && (
                <form onSubmit={handleRegisterAffiliateSubmit} className="flex flex-col gap-4 animate-in fade-in duration-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Nome Completo */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-white/70 uppercase tracking-wider">
                        NOME COMPLETO *
                      </label>
                      <div className="relative flex items-center">
                        <User className="w-4 h-4 text-white/40 absolute left-3.5 pointer-events-none" />
                        <input
                          type="text"
                          required
                          value={affName}
                          onChange={(e) => setAffName(e.target.value)}
                          placeholder="Rodrigo Silveira"
                          className="w-full pl-10 pr-3.5 py-3 rounded-xl bg-[#09111b] border border-white/10 focus:border-[#a3e635] text-xs text-white placeholder:text-white/30 outline-none transition-all"
                        />
                      </div>
                    </div>

                    {/* E-mail de Acesso */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-white/70 uppercase tracking-wider">
                        E-MAIL DE ACESSO *
                      </label>
                      <div className="relative flex items-center">
                        <Mail className="w-4 h-4 text-white/40 absolute left-3.5 pointer-events-none" />
                        <input
                          type="email"
                          required
                          value={affEmail}
                          onChange={(e) => setAffEmail(e.target.value)}
                          placeholder="rodrigo@email.com"
                          className="w-full pl-10 pr-3.5 py-3 rounded-xl bg-[#09111b] border border-white/10 focus:border-[#a3e635] text-xs text-white placeholder:text-white/30 outline-none transition-all"
                        />
                      </div>
                    </div>

                    {/* WhatsApp / Telefone */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-white/70 uppercase tracking-wider">
                        WHATSAPP / TELEFONE
                      </label>
                      <div className="relative flex items-center">
                        <Phone className="w-4 h-4 text-white/40 absolute left-3.5 pointer-events-none" />
                        <input
                          type="tel"
                          value={affWhatsapp}
                          onChange={(e) => setAffWhatsapp(formatPhone(e.target.value))}
                          placeholder="(11) 99876-5432"
                          className="w-full pl-10 pr-3.5 py-3 rounded-xl bg-[#09111b] border border-white/10 focus:border-[#a3e635] text-xs text-white placeholder:text-white/30 outline-none transition-all"
                        />
                      </div>
                    </div>

                    {/* CPF (Único por conta) */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-white/70 uppercase tracking-wider">
                        CPF (ÚNICO POR CONTA)
                      </label>
                      <div className="relative flex items-center">
                        <FileText className="w-4 h-4 text-white/40 absolute left-3.5 pointer-events-none" />
                        <input
                          type="text"
                          value={affCpf}
                          onChange={(e) => setAffCpf(formatCPF(e.target.value))}
                          placeholder="000.000.000-00"
                          maxLength={14}
                          className="w-full pl-10 pr-3.5 py-3 rounded-xl bg-[#09111b] border border-white/10 focus:border-[#a3e635] text-xs text-white placeholder:text-white/30 outline-none transition-all"
                        />
                      </div>
                    </div>

                    {/* Tipo da Chave PIX */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-white/70 uppercase tracking-wider">
                        TIPO DA CHAVE PIX
                      </label>
                      <select
                        value={affPixKeyType}
                        onChange={(e) => setAffPixKeyType(e.target.value)}
                        className="w-full px-3.5 py-3 rounded-xl bg-[#09111b] border border-white/10 focus:border-[#a3e635] text-xs text-white outline-none cursor-pointer"
                      >
                        <option value="CPF">CPF</option>
                        <option value="E-mail">E-mail</option>
                        <option value="Telefone">Telefone / Celular</option>
                        <option value="Aleatória">Chave Aleatória (EVP)</option>
                      </select>
                    </div>

                    {/* Chave PIX */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-white/70 uppercase tracking-wider">
                        CHAVE PIX
                      </label>
                      <div className="relative flex items-center">
                        <CreditCard className="w-4 h-4 text-white/40 absolute left-3.5 pointer-events-none" />
                        <input
                          type="text"
                          value={affPixKey}
                          onChange={(e) => setAffPixKey(e.target.value)}
                          placeholder="Sua chave PIX para receber comissões"
                          className="w-full pl-10 pr-3.5 py-3 rounded-xl bg-[#09111b] border border-white/10 focus:border-[#a3e635] text-xs text-white placeholder:text-white/30 outline-none transition-all"
                        />
                      </div>
                    </div>

                    {/* Senha de Acesso */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-white/70 uppercase tracking-wider">
                        SENHA DE ACESSO *
                      </label>
                      <div className="relative flex items-center">
                        <Lock className="w-4 h-4 text-white/40 absolute left-3.5 pointer-events-none" />
                        <input
                          type={showAffPassword ? 'text' : 'password'}
                          required
                          value={affPassword}
                          onChange={(e) => setAffPassword(e.target.value)}
                          placeholder="Mínimo 6 caracteres"
                          className="w-full pl-10 pr-10 py-3 rounded-xl bg-[#09111b] border border-white/10 focus:border-[#a3e635] text-xs text-white placeholder:text-white/30 outline-none transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowAffPassword(!showAffPassword)}
                          aria-label={showAffPassword ? 'Ocultar senha' : 'Mostrar senha'}
                          className="absolute right-3 text-white/40 hover:text-white"
                        >
                          {showAffPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Confirmar Senha */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-white/70 uppercase tracking-wider">
                        CONFIRMAR SENHA *
                      </label>
                      <div className="relative flex items-center">
                        <Lock className="w-4 h-4 text-white/40 absolute left-3.5 pointer-events-none" />
                        <input
                          type={showAffConfirmPassword ? 'text' : 'password'}
                          required
                          value={affConfirmPassword}
                          onChange={(e) => setAffConfirmPassword(e.target.value)}
                          placeholder="Repita sua senha"
                          className="w-full pl-10 pr-10 py-3 rounded-xl bg-[#09111b] border border-white/10 focus:border-[#a3e635] text-xs text-white placeholder:text-white/30 outline-none transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowAffConfirmPassword(!showAffConfirmPassword)}
                          aria-label={showAffConfirmPassword ? 'Ocultar confirmação da senha' : 'Mostrar confirmação da senha'}
                          className="absolute right-3 text-white/40 hover:text-white"
                        >
                          {showAffConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Termos de Uso Checkbox */}
                  <label className="flex items-center gap-2.5 text-[11px] text-white/80 cursor-pointer select-none pt-1">
                    <input
                      type="checkbox"
                      checked={affTermsAccepted}
                      onChange={(e) => setAffTermsAccepted(e.target.checked)}
                      className="w-4 h-4 rounded border-white/20 bg-[#09111b] accent-[#84cc16] cursor-pointer"
                    />
                    <span>
                      Concordo com os{' '}
                      <span className="text-[#a3e635] font-semibold underline hover:text-lime-300">
                        Termos de Afiliação e Repasses PIX D+9
                      </span>.
                    </span>
                  </label>

                  {/* Finalizar Cadastro Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="auth-submit-button w-full py-4 rounded-xl bg-gradient-to-r from-[#84cc16] via-[#a3e635] to-[#4ade80] hover:brightness-110 active:scale-[0.99] text-slate-950 font-black uppercase text-xs tracking-wider flex items-center justify-center gap-2.5 shadow-[0_0_25px_rgba(163,230,53,0.35)] transition-all cursor-pointer mt-1"
                  >
                    <UserPlus className="w-4 h-4 text-slate-950" />
                    <span>FINALIZAR CADASTRO →</span>
                  </button>
                </form>
              )}

              {/* Footer Switcher */}
              <div className="text-center text-xs text-white/60 pt-1">
                Já possui uma conta?{' '}
                <button
                  type="button"
                  onClick={() => handleSwitchTab('login')}
                  className="text-[#a3e635] font-bold hover:underline cursor-pointer ml-1"
                >
                  Fazer Login
                </button>
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* SCREEN 2: CADASTRO DE EMPRESA (file_000000007020820ebe5852f9c7) */}
          {/* =============================================================== */}
          {currentTab === 'register_company' && (
            <div className="flex flex-col gap-5">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 border border-lime-400/30 bg-lime-500/10 text-[#a3e635] text-[10px] font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-full w-fit">
                <Building2 className="w-3.5 h-3.5 text-[#a3e635]" />
                <span>CADASTRO CORPORATIVO / STARTUPS</span>
              </div>

              {/* Title & Subtitle */}
              <div className="space-y-1.5 -mt-1">
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Cadastre sua <span className="text-[#a3e635]">Empresa</span> ou <span className="text-[#a3e635]">Startup</span>
                </h2>
                <p className="text-xs text-white/60 font-normal leading-relaxed">
                  Conecte sua solução com milhares de afiliados e impulsione suas vendas comissionadas de forma simples e segura.
                </p>
              </div>

              {/* Google Button (Dark glass with lime border and glow as in Screenshot 2) */}
              <button
                type="button"
                onClick={() => handleGoogleAuth('empresa')}
                disabled={isSubmitting}
                className="auth-google-button w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-lime-500/15 via-lime-400/20 to-emerald-500/15 hover:bg-lime-500/30 border border-lime-400/50 hover:border-lime-400 text-white font-bold flex items-center justify-center gap-3 shadow-[0_0_25px_rgba(163,230,53,0.2)] transition-all cursor-pointer group"
              >
                <GoogleIcon />
                <span className="text-sm font-bold text-white">Cadastrar Empresa com Google</span>
                <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-1 transition-transform" />
              </button>

              {/* Divider */}
              <div className="relative flex items-center justify-center my-1">
                <div className="w-full border-t border-white/10" />
                <span className="absolute bg-[#060b12] px-3 text-[10px] font-bold uppercase tracking-widest text-white/40">
                  OU
                </span>
              </div>

              {/* Accordion Header (Collapsed in Screenshot 2) */}
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setBasicCompanyOpen(!basicCompanyOpen)}
                  className="auth-accordion w-full px-4 py-3.5 rounded-xl bg-[#09111b] border border-white/10 hover:border-white/20 flex items-center justify-between text-xs font-semibold text-white transition-all cursor-pointer"
                >
                  <span className="flex items-center gap-2.5 text-white/90">
                    <Building2 className="w-4 h-4 text-[#a3e635]" />
                    Informações básicas (opcional)
                  </span>
                  <ChevronDown className={`w-4 h-4 text-white/50 transition-transform duration-200 ${basicCompanyOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Security Info Banner */}
                <div className="auth-security-note flex items-start gap-3 p-3.5 rounded-xl bg-[#09111b]/80 border border-white/5 text-[11px] text-white/60">
                  <Lock className="w-4 h-4 text-[#a3e635] shrink-0 mt-0.5" />
                  <span>
                    Seus dados estão seguros. Você pode completar as informações da sua empresa mais tarde, no seu painel.
                  </span>
                </div>
              </div>

              {/* Optional Company Manual Form */}
              {basicCompanyOpen && (
                <form onSubmit={handleRegisterCompanySubmit} className="flex flex-col gap-4 animate-in fade-in duration-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Nome da Empresa */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-white/70 uppercase tracking-wider">
                        NOME DA EMPRESA / STARTUP *
                      </label>
                      <div className="relative flex items-center">
                        <Building2 className="w-4 h-4 text-white/40 absolute left-3.5 pointer-events-none" />
                        <input
                          type="text"
                          required
                          value={compName}
                          onChange={(e) => setCompName(e.target.value)}
                          placeholder="Ex: Techify Soluções SaaS"
                          className="w-full pl-10 pr-3.5 py-3 rounded-xl bg-[#09111b] border border-white/10 focus:border-[#a3e635] text-xs text-white placeholder:text-white/30 outline-none transition-all"
                        />
                      </div>
                    </div>

                    {/* Nome do Responsável */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-white/70 uppercase tracking-wider">
                        NOME DO RESPONSÁVEL *
                      </label>
                      <div className="relative flex items-center">
                        <User className="w-4 h-4 text-white/40 absolute left-3.5 pointer-events-none" />
                        <input
                          type="text"
                          required
                          value={compOwnerName}
                          onChange={(e) => setCompOwnerName(e.target.value)}
                          placeholder="Nome e Sobrenome"
                          className="w-full pl-10 pr-3.5 py-3 rounded-xl bg-[#09111b] border border-white/10 focus:border-[#a3e635] text-xs text-white placeholder:text-white/30 outline-none transition-all"
                        />
                      </div>
                    </div>

                    {/* E-mail Corporativo */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-white/70 uppercase tracking-wider">
                        E-MAIL CORPORATIVO *
                      </label>
                      <div className="relative flex items-center">
                        <Mail className="w-4 h-4 text-white/40 absolute left-3.5 pointer-events-none" />
                        <input
                          type="email"
                          required
                          value={compEmail}
                          onChange={(e) => setCompEmail(e.target.value)}
                          placeholder="contato@empresa.com"
                          className="w-full pl-10 pr-3.5 py-3 rounded-xl bg-[#09111b] border border-white/10 focus:border-[#a3e635] text-xs text-white placeholder:text-white/30 outline-none transition-all"
                        />
                      </div>
                    </div>

                    {/* WhatsApp */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-white/70 uppercase tracking-wider">
                        WHATSAPP / TELEFONE
                      </label>
                      <div className="relative flex items-center">
                        <Phone className="w-4 h-4 text-white/40 absolute left-3.5 pointer-events-none" />
                        <input
                          type="tel"
                          value={compWhatsapp}
                          onChange={(e) => setCompWhatsapp(formatPhone(e.target.value))}
                          placeholder="(11) 98765-4321"
                          className="w-full pl-10 pr-3.5 py-3 rounded-xl bg-[#09111b] border border-white/10 focus:border-[#a3e635] text-xs text-white placeholder:text-white/30 outline-none transition-all"
                        />
                      </div>
                    </div>

                    {/* Tipo Doc */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-white/70 uppercase tracking-wider">
                        TIPO DE DOCUMENTO
                      </label>
                      <select
                        value={compDocType}
                        onChange={(e) => setCompDocType(e.target.value as any)}
                        className="w-full px-3.5 py-3 rounded-xl bg-[#09111b] border border-white/10 focus:border-[#a3e635] text-xs text-white outline-none cursor-pointer"
                      >
                        <option value="CNPJ">CNPJ (Pessoa Jurídica)</option>
                        <option value="CPF">CPF (Profissional Autônomo)</option>
                      </select>
                    </div>

                    {/* CNPJ / CPF */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-white/70 uppercase tracking-wider">
                        {compDocType === 'CNPJ' ? 'CNPJ DA EMPRESA' : 'CPF DO TITULAR'}
                      </label>
                      <div className="relative flex items-center">
                        <FileText className="w-4 h-4 text-white/40 absolute left-3.5 pointer-events-none" />
                        <input
                          type="text"
                          value={compDocType === 'CNPJ' ? compCnpj : compCpf}
                          onChange={(e) => {
                            if (compDocType === 'CNPJ') setCompCnpj(formatCNPJ(e.target.value));
                            else setCompCpf(formatCPF(e.target.value));
                          }}
                          placeholder={compDocType === 'CNPJ' ? '00.000.000/0001-00' : '000.000.000-00'}
                          className="w-full pl-10 pr-3.5 py-3 rounded-xl bg-[#09111b] border border-white/10 focus:border-[#a3e635] text-xs text-white placeholder:text-white/30 outline-none transition-all"
                        />
                      </div>
                    </div>

                    {/* Senha */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-white/70 uppercase tracking-wider">
                        SENHA DE ACESSO *
                      </label>
                      <div className="relative flex items-center">
                        <Lock className="w-4 h-4 text-white/40 absolute left-3.5 pointer-events-none" />
                        <input
                          type={showCompPassword ? 'text' : 'password'}
                          required
                          value={compPassword}
                          onChange={(e) => setCompPassword(e.target.value)}
                          placeholder="Mínimo 6 caracteres"
                          className="w-full pl-10 pr-10 py-3 rounded-xl bg-[#09111b] border border-white/10 focus:border-[#a3e635] text-xs text-white placeholder:text-white/30 outline-none transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCompPassword(!showCompPassword)}
                          aria-label={showCompPassword ? 'Ocultar senha' : 'Mostrar senha'}
                          className="absolute right-3 text-white/40 hover:text-white"
                        >
                          {showCompPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Confirmar Senha */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-white/70 uppercase tracking-wider">
                        CONFIRMAR SENHA *
                      </label>
                      <div className="relative flex items-center">
                        <Lock className="w-4 h-4 text-white/40 absolute left-3.5 pointer-events-none" />
                        <input
                          type={showCompConfirmPassword ? 'text' : 'password'}
                          required
                          value={compConfirmPassword}
                          onChange={(e) => setCompConfirmPassword(e.target.value)}
                          placeholder="Repita sua senha"
                          className="w-full pl-10 pr-10 py-3 rounded-xl bg-[#09111b] border border-white/10 focus:border-[#a3e635] text-xs text-white placeholder:text-white/30 outline-none transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCompConfirmPassword(!showCompConfirmPassword)}
                          aria-label={showCompConfirmPassword ? 'Ocultar confirmação da senha' : 'Mostrar confirmação da senha'}
                          className="absolute right-3 text-white/40 hover:text-white"
                        >
                          {showCompConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-4 rounded-xl bg-gradient-to-r from-[#84cc16] via-[#a3e635] to-[#4ade80] hover:brightness-110 text-slate-950 font-black uppercase text-xs tracking-wider flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(163,230,53,0.35)] transition-all cursor-pointer mt-1"
                  >
                    <Building2 className="w-4 h-4 text-slate-950" />
                    <span>FINALIZAR CADASTRO DA EMPRESA →</span>
                  </button>
                </form>
              )}

              {/* Footer Switcher */}
              <div className="text-center text-xs text-white/60 pt-1">
                Já possui uma conta?{' '}
                <button
                  type="button"
                  onClick={() => handleSwitchTab('login')}
                  className="text-[#a3e635] font-bold hover:underline cursor-pointer ml-1"
                >
                  Fazer Login
                </button>
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* SCREEN 3: LOGIN / ENTRAR NA SUA CONTA (LeadsPay_Login)           */}
          {/* =============================================================== */}
          {currentTab === 'login' && (
            <div className="flex flex-col gap-5">
              {/* Subhead label */}
              <div className="auth-kicker text-[10px] text-[#facc15] font-extrabold uppercase tracking-[0.2em] -mb-2">
                ACESSO À PLATAFORMA
              </div>

              {/* Title & Subtitle */}
              <div className="space-y-1.5">
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Entrar na sua <span className="text-[#a3e635]">conta</span>
                </h2>
                <p className="text-xs text-white/60 font-normal leading-relaxed">
                  Escolha como deseja acessar sua conta e continue com segurança.
                </p>
              </div>

              {/* Seletor de perfil permanece disponível também no celular. */}
              <div className="auth-role-switcher grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    aria-pressed={loginRole === 'afiliado'}
                    onClick={() => {
                      setLoginRole('afiliado');
                      setErrorMessage('');
                    }}
                    className={`auth-role-option py-2.5 px-4 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      loginRole === 'afiliado'
                        ? 'bg-gradient-to-r from-[#a3e635] to-[#bef264] text-slate-950 shadow-md shadow-lime-500/25 font-black'
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    <User className="w-4 h-4" />
                    <span>Entrar como Afiliado</span>
                  </button>

                  <button
                    type="button"
                    aria-pressed={loginRole === 'empresa'}
                    onClick={() => {
                      setLoginRole('empresa');
                      setErrorMessage('');
                    }}
                    className={`auth-role-option py-2.5 px-4 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      loginRole === 'empresa'
                        ? 'bg-gradient-to-r from-[#a3e635] to-[#bef264] text-slate-950 shadow-md shadow-lime-500/25 font-black'
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    <Briefcase className="w-4 h-4" />
                    <span>Entrar como Empresa</span>
                  </button>
              </div>

              {/* Login Form */}
              <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4">
                {/* E-mail */}
                <div className="space-y-1.5">
                  <label htmlFor="leadspay-login-email" className="text-[10px] font-bold text-white/70 uppercase tracking-wider">
                    E-MAIL
                  </label>
                  <div className="relative flex items-center">
                    <Mail className="w-4 h-4 text-white/40 absolute left-3.5 pointer-events-none" />
                    <input
                      id="leadspay-login-email"
                      type="email"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="Digite seu e-mail"
                      className="w-full pl-10 pr-3.5 py-3.5 rounded-xl bg-[#09111b] border border-white/10 focus:border-[#a3e635] text-xs text-white placeholder:text-white/30 outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Senha */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="leadspay-login-password" className="text-[10px] font-bold text-white/70 uppercase tracking-wider">
                      SENHA
                    </label>
                    <button
                      type="button"
                      onClick={() => handleSwitchTab('forgot_password')}
                      className="text-xs text-[#fde047] hover:text-[#fef08a] font-semibold cursor-pointer"
                    >
                      Esqueceu a senha?
                    </button>
                  </div>
                  <div className="relative flex items-center">
                    <Lock className="w-4 h-4 text-white/40 absolute left-3.5 pointer-events-none" />
                    <input
                      id="leadspay-login-password"
                      type={showLoginPassword ? 'text' : 'password'}
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Sua senha de acesso"
                      className="w-full pl-10 pr-10 py-3.5 rounded-xl bg-[#09111b] border border-white/10 focus:border-[#a3e635] text-xs text-white placeholder:text-white/30 outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="auth-password-toggle absolute right-3 text-white/40 hover:text-white cursor-pointer"
                    >
                      {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Primary Submit Button (Lime green gradient pill as in Screenshot 3) */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="auth-submit-button w-full py-3.5 rounded-xl bg-gradient-to-r from-[#a3e635] to-[#84cc16] hover:brightness-110 active:scale-[0.99] text-slate-950 font-black uppercase tracking-wider text-xs flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(163,230,53,0.35)] transition-all cursor-pointer mt-1"
                >
                  <span>ENTRAR →</span>
                </button>

                {/* Divider */}
                <div className="relative flex items-center justify-center my-1">
                  <div className="w-full border-t border-white/10" />
                  <span className="absolute bg-[#060b12] px-3 text-[10px] font-bold uppercase tracking-widest text-white/40">
                    OU CONTINUE COM
                  </span>
                </div>

                {/* Google Button (Dark glass button as in Screenshot 3) */}
                <button
                  type="button"
                  onClick={() => handleGoogleAuth(loginRole)}
                  disabled={isSubmitting}
                  className="auth-google-button w-full py-3.5 px-6 rounded-xl bg-[#09111b] hover:bg-[#0f1b2b] border border-white/10 hover:border-white/20 text-white font-bold flex items-center justify-center gap-3 transition-all cursor-pointer text-xs"
                >
                  <GoogleIcon />
                  <span>Entrar com o Google</span>
                </button>
              </form>

              {/* Footer Switcher */}
              <div className="text-center text-xs text-white/60 pt-1">
                Ainda não possui conta?{' '}
                <button
                  type="button"
                  onClick={() => handleSwitchTab(loginRole === 'empresa' ? 'register_company' : 'register_affiliate')}
                  className="text-[#a3e635] font-bold hover:underline cursor-pointer ml-1"
                >
                  {loginRole === 'empresa' ? 'Cadastre sua Empresa' : 'Cadastre-se como Afiliado'}
                </button>
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* SCREEN 4: ESQUECEU A SENHA                                       */}
          {/* =============================================================== */}
          {currentTab === 'forgot_password' && (
            <div className="flex flex-col gap-5">
              <div className="inline-flex items-center gap-2 border border-lime-400/30 bg-lime-500/10 text-[#a3e635] text-[10px] font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-full w-fit">
                <KeyRound className="w-3.5 h-3.5 text-[#a3e635]" />
                <span>RECUPERAÇÃO DE ACESSO</span>
              </div>

              <div className="space-y-1.5 -mt-1">
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Redefina sua <span className="text-[#a3e635]">senha</span>
                </h2>
                <p className="text-xs text-white/60 font-normal leading-relaxed">
                  Digite seu e-mail cadastrado e enviaremos um link seguro para você recuperar seu acesso.
                </p>
              </div>

              <form onSubmit={handlePasswordResetSubmit} className="flex flex-col gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-white/70 uppercase tracking-wider">
                    E-MAIL DE ACESSO
                  </label>
                  <div className="relative flex items-center">
                    <Mail className="w-4 h-4 text-white/40 absolute left-3.5 pointer-events-none" />
                    <input
                      type="email"
                      required
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="Digite seu e-mail cadastrado"
                      className="w-full pl-10 pr-3.5 py-3.5 rounded-xl bg-[#09111b] border border-white/10 focus:border-[#a3e635] text-xs text-white placeholder:text-white/30 outline-none transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="auth-submit-button w-full py-3.5 rounded-xl bg-gradient-to-r from-[#a3e635] to-[#84cc16] hover:brightness-110 active:scale-[0.99] text-slate-950 font-black uppercase tracking-wider text-xs flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(163,230,53,0.35)] transition-all cursor-pointer"
                >
                  <span>ENVIAR LINK DE RECUPERAÇÃO →</span>
                </button>
              </form>

              <div className="text-center text-xs text-white/60 pt-1">
                Lembrou da senha?{' '}
                <button
                  type="button"
                  onClick={() => handleSwitchTab('login')}
                  className="text-[#a3e635] font-bold hover:underline cursor-pointer ml-1"
                >
                  Fazer Login
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
