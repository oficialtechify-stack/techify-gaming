import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  ShieldCheck, 
  Clock, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  ArrowRight,
  HelpCircle,
  Lock,
  User,
  Building2,
  Phone,
  CreditCard,
  Upload,
  Sparkles,
  Zap,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { UserSellerProfile, UserRoleMode } from '../../types/platform';
import { formatCPF, formatCNPJ, formatPhone, isValidCPF, isValidCNPJ } from '../../services/authService';

interface ProductionActivationModalProps {
  isOpen: boolean;
  onClose: () => void;
  isVerified: boolean;
  onConfirmActivateProduction: () => void;
  onNavigateToKYC: () => void;
  companyName?: string;
  currentKycStatus?: 'pending' | 'submitted' | 'verified';
  userProfile?: UserSellerProfile;
  onSubmitVerification?: (profileData: Partial<UserSellerProfile>) => Promise<void>;
  onApproveAsAdmin?: () => Promise<void>;
  isSuperAdmin?: boolean;
  roleMode?: UserRoleMode;
}

export const ProductionActivationModal: React.FC<ProductionActivationModalProps> = ({
  isOpen,
  onClose,
  isVerified,
  onConfirmActivateProduction,
  onNavigateToKYC,
  companyName = 'Sua Empresa',
  currentKycStatus = 'pending',
  userProfile,
  onSubmitVerification,
  onApproveAsAdmin,
  isSuperAdmin = false,
  roleMode = 'afiliado'
}) => {
  if (!isOpen) return null;

  // Form states for KYC submission
  const [personType, setPersonType] = useState<'PF' | 'PJ'>(
    userProfile?.companyDocType === 'CNPJ' || userProfile?.cnpj ? 'PJ' : 'PF'
  );
  const [fullName, setFullName] = useState<string>(
    userProfile?.name || 
    (userProfile?.firstName ? `${userProfile.firstName} ${userProfile.lastName || ''}`.trim() : '') || 
    ''
  );
  const [docNumber, setDocNumber] = useState<string>(
    userProfile?.cnpj || userProfile?.cpf || userProfile?.companyCnpj || ''
  );
  const [phone, setPhone] = useState<string>(
    userProfile?.whatsapp || userProfile?.phone || userProfile?.companyPhone || ''
  );
  const [pixKey, setPixKey] = useState<string>(
    userProfile?.pixKey || ''
  );
  const [pixKeyType, setPixKeyType] = useState<string>(
    userProfile?.pixKeyType || 'CPF'
  );
  const [businessCategory, setBusinessCategory] = useState<string>(
    userProfile?.companyCategory || 'SaaS / B2B'
  );
  const [websiteUrl, setWebsiteUrl] = useState<string>(
    userProfile?.companyWebsite || ''
  );
  const [docImagePreview, setDocImagePreview] = useState<string>('');
  const [acceptedTerms, setAcceptedTerms] = useState<boolean>(true);
  
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isApproving, setIsApproving] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Handle file preview
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 3.5 * 1024 * 1024) {
        setErrorMessage('O arquivo excede o limite de 3.5MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setDocImagePreview(reader.result);
          setErrorMessage('');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Mask formatting
  const handleDocChange = (val: string) => {
    const digits = val.replace(/\D/g, '');
    if (personType === 'PF') {
      setDocNumber(formatCPF(digits.slice(0, 11)));
    } else {
      setDocNumber(formatCNPJ(digits.slice(0, 14)));
    }
  };

  const handlePhoneChange = (val: string) => {
    setPhone(formatPhone(val));
  };

  // Submit profile to administration
  const handleSubmitProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    
    if (!fullName.trim() || fullName.trim().length < 3) {
      setErrorMessage('Por favor, informe seu nome completo ou razão social.');
      return;
    }

    const cleanDoc = docNumber.replace(/\D/g, '');
    if (personType === 'PF') {
      if (!isValidCPF(cleanDoc)) {
        setErrorMessage('CPF informado é inválido. Verifique os 11 dígitos.');
        return;
      }
    } else {
      if (!isValidCNPJ(cleanDoc)) {
        setErrorMessage('CNPJ informado é inválido. Verifique os 14 dígitos.');
        return;
      }
    }

    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setErrorMessage('Telefone/WhatsApp comercial inválido.');
      return;
    }

    if (!pixKey.trim()) {
      setErrorMessage('A chave PIX é obrigatória para habilitar liquidações bancárias em produção.');
      return;
    }

    if (!acceptedTerms) {
      setErrorMessage('Você deve aceitar os termos de conformidade e a política de garantia D+9.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (onSubmitVerification) {
        await onSubmitVerification({
          name: fullName.trim(),
          cpf: personType === 'PF' ? docNumber : userProfile?.cpf,
          cnpj: personType === 'PJ' ? docNumber : userProfile?.cnpj,
          phone: phone.trim(),
          whatsapp: phone.trim(),
          pixKey: pixKey.trim(),
          pixKeyType,
          companyCategory: businessCategory,
          companyWebsite: websiteUrl.trim(),
          companyDocType: personType === 'PJ' ? 'CNPJ' : 'CPF',
          verificationRoleType: roleMode === 'empresa' ? 'empresa' : 'afiliado',
          hasCompanyProfile: roleMode === 'empresa',
          avatar: docImagePreview || userProfile?.avatar || ''
        });
      }
      setSuccessMessage('Perfil enviado com sucesso para a análise da administração!');
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao enviar documentos. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Admin Quick Approval
  const handleAdminApproval = async () => {
    setIsApproving(true);
    setErrorMessage('');
    try {
      if (onApproveAsAdmin) {
        await onApproveAsAdmin();
      }
      setSuccessMessage('Conta aprovada com sucesso! Modo Produção liberado.');
      setTimeout(() => {
        onConfirmActivateProduction();
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao aprovar verificação.');
    } finally {
      setIsApproving(false);
    }
  };

  const isSubmittedPending = currentKycStatus === 'submitted' || successMessage.length > 0;

  return (
    <div 
      id="production-activation-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-2xl my-auto rounded-3xl bg-[#080d1a] border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden">
        {/* Header Color Accent */}
        <div className={`h-2.5 w-full ${
          isVerified 
            ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' 
            : isSubmittedPending
              ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500'
              : 'bg-gradient-to-r from-[#D9F22A] via-amber-400 to-emerald-500'
        }`} />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white flex items-center justify-center cursor-pointer transition-colors border border-white/10 z-10"
          title="Fechar"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-6 sm:p-8 max-h-[85vh] overflow-y-auto">
          {/* ============================================================ */}
          {/* CASO 1: USUÁRIO JÁ VERIFICADO (KYC APROVADO)                 */}
          {/* ============================================================ */}
          {isVerified ? (
            <div className="text-center space-y-5 py-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(16,185,129,0.25)]">
                <ShieldCheck className="w-9 h-9" />
              </div>

              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 mb-2">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Perfil Homologado & Aprovado</span>
                </div>
                <h3 className="text-2xl font-black text-white font-['Syne'] tracking-tight">
                  Ativar Sistema Real de Produção
                </h3>
                <p className="text-sm text-white/70 mt-2 max-w-lg mx-auto leading-relaxed">
                  Sua conta está 100% verificada e homologada pelo compliance da LeadsPay.
                  Ao entrar em produção, todas as cobranças, vendas PIX e saques acontecerão em ambiente bancário real.
                </p>
              </div>

              <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 text-left text-xs space-y-3 max-w-lg mx-auto">
                <div className="flex items-start gap-2.5 text-emerald-400">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span className="text-white/80">
                    <strong className="text-white">Liquidação Bancária D+9:</strong> Valores de vendas reais liberados com total conformidade.
                  </span>
                </div>
                <div className="flex items-start gap-2.5 text-emerald-400">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span className="text-white/80">
                    <strong className="text-white">Gateways Oficiais Ativos:</strong> Mercado Pago e Asaas prontos para processar clientes reais.
                  </span>
                </div>
                <div className="flex items-start gap-2.5 text-emerald-400">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span className="text-white/80">
                    <strong className="text-white">Saques PIX Habilitados:</strong> Transferências instantâneas para a chave cadastrada.
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white/70 hover:text-white hover:bg-white/5 cursor-pointer transition-colors"
                >
                  Permanecer no Sandbox
                </button>
                <button
                  type="button"
                  id="btn-confirm-production"
                  onClick={() => {
                    onConfirmActivateProduction();
                    onClose();
                  }}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-[0_0_25px_rgba(16,185,129,0.35)] cursor-pointer transition-all active:scale-95"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Entrar no Sistema Real</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : isSubmittedPending ? (
            /* ============================================================ */
            /* CASO 2: PERFIL SUBMETIDO E EM ANÁLISE PELA ADMINISTRAÇÃO     */
            /* ============================================================ */
            <div className="space-y-6 py-2">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center flex-shrink-0 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                  <Clock className="w-7 h-7 animate-pulse" />
                </div>
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    <Clock className="w-3 h-3" />
                    <span>Em Análise de Compliance</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-white font-['Syne']">
                    Perfil Enviado para a Administração
                  </h3>
                  <p className="text-xs sm:text-sm text-white/70 leading-relaxed">
                    Seus dados foram recebidos e estão sob auditoria do time de compliance da LeadsPay.
                  </p>
                </div>
              </div>

              {/* Status Timeline */}
              <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-4 sm:p-5 space-y-4">
                <h4 className="text-xs font-bold text-white/90 uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-400" />
                  <span>Etapas da Homologação</span>
                </h4>

                <div className="space-y-3 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-bold">1. Cadastro e Documentos Submetidos</p>
                      <p className="text-[11px] text-white/50">Dados cadastrais recebidos com sucesso.</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center flex-shrink-0 animate-pulse">
                      <Clock className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1">
                      <p className="text-amber-300 font-bold">2. Auditoria e Validação Bancária (Em Andamento)</p>
                      <p className="text-[11px] text-white/60">Prazo médio de análise: até 24 horas úteis.</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 opacity-50">
                    <div className="w-6 h-6 rounded-full bg-white/10 text-white/50 border border-white/20 flex items-center justify-center flex-shrink-0">
                      <Lock className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1">
                      <p className="text-white/70 font-medium">3. Liberação do Sistema de Produção Real</p>
                      <p className="text-[11px] text-white/40">Desbloqueio automático após aprovação.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Informação sobre Modo de Teste */}
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-bold text-amber-300">
                    Você pode continuar testando tudo livremente!
                  </p>
                  <p className="text-white/70 leading-relaxed">
                    No <strong className="text-white">Modo Sandbox de Teste</strong>, você tem acesso irrestrito a todas as ferramentas: cadastrar planos, gerar links de afiliados, testar checkouts e simular vendas com notificações em tempo real.
                  </p>
                </div>
              </div>

              {/* Ações */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onNavigateToKYC();
                  }}
                  className="w-full sm:w-auto text-xs text-white/60 hover:text-white flex items-center justify-center gap-1.5 py-2 cursor-pointer transition-colors"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Ver/Editar Dados Cadastrais</span>
                </button>

                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  {/* Botão de Aprovação de Administrador (para Rick/Admin ou testes imediatos) */}
                  {(isSuperAdmin || roleMode === 'admin') && (
                    <button
                      type="button"
                      onClick={handleAdminApproval}
                      disabled={isApproving}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider cursor-pointer shadow-lg shadow-emerald-500/20 transition-all active:scale-95 disabled:opacity-50"
                      title="Privilégio de Administrador: Aprovar verificação imediatamente"
                    >
                      <Zap className="w-4 h-4" />
                      <span>{isApproving ? 'Aprovando...' : 'Aprovar (Admin)'}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs cursor-pointer transition-all"
                  >
                    <span>Continuar no Sandbox</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* ============================================================ */
            /* CASO 3: FORMULÁRIO DE HOMOLOGAÇÃO KYC (NÃO ENVIADO)          */
            /* ============================================================ */
            <form onSubmit={handleSubmitProfile} className="space-y-5">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[#D9F22A]/10 border border-[#D9F22A]/30 text-[#D9F22A] flex items-center justify-center flex-shrink-0 shadow-[0_0_20px_rgba(217,242,42,0.15)]">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#D9F22A]/15 text-[#D9F22A] border border-[#D9F22A]/30">
                    <Lock className="w-3 h-3" />
                    <span>Verificação Necessária</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-white font-['Syne']">
                    Homologação Cadastral — Produção Real
                  </h3>
                  <p className="text-xs text-white/70 leading-relaxed">
                    No <strong className="text-[#D9F22A]">Modo de Testes</strong> você pode testar tudo livremente sem verificação. Para entrar no <strong className="text-white">Sistema Real de Produção</strong>, preencha seu perfil para aprovação da administração.
                  </p>
                </div>
              </div>

              {errorMessage && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-xs text-red-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-400" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Tipo de Pessoa (PF vs PJ) */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-white/80 uppercase tracking-wider block">
                  Tipo de Conta
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPersonType('PF');
                      setPixKeyType('CPF');
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer border ${
                      personType === 'PF'
                        ? 'bg-[#D9F22A] text-slate-950 border-[#D9F22A] shadow-[0_0_15px_rgba(217,242,42,0.2)]'
                        : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>Pessoa Física (CPF)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPersonType('PJ');
                      setPixKeyType('CNPJ');
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer border ${
                      personType === 'PJ'
                        ? 'bg-[#D9F22A] text-slate-950 border-[#D9F22A] shadow-[0_0_15px_rgba(217,242,42,0.2)]'
                        : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Pessoa Jurídica (CNPJ / MEI)</span>
                  </button>
                </div>
              </div>

              {/* Dados Principais */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[11px] font-bold text-white/70">
                    {personType === 'PF' ? 'Nome Completo' : 'Razão Social / Nome da Empresa'} *
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={personType === 'PF' ? 'Ex: Carlos Alberto da Silva' : 'Ex: LeadsPay Tecnologia LTDA'}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder:text-white/30 focus:outline-none focus:border-[#D9F22A]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-white/70">
                    {personType === 'PF' ? 'CPF do Titular' : 'CNPJ da Empresa'} *
                  </label>
                  <input
                    type="text"
                    required
                    value={docNumber}
                    onChange={(e) => handleDocChange(e.target.value)}
                    placeholder={personType === 'PF' ? '000.000.000-00' : '00.000.000/0000-00'}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder:text-white/30 focus:outline-none focus:border-[#D9F22A]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-white/70">
                    WhatsApp / Telefone Comercial *
                  </label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    placeholder="(11) 99999-9999"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder:text-white/30 focus:outline-none focus:border-[#D9F22A]"
                  />
                </div>
              </div>

              {/* Chave PIX Oficial para Repasses Reais */}
              <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-[#D9F22A] uppercase tracking-wider flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Chave PIX Oficial para Recebimento Real</span>
                  </label>
                  <span className="text-[10px] text-white/40">Mesma titularidade do CPF/CNPJ</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <select
                      value={pixKeyType}
                      onChange={(e) => setPixKeyType(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-[#D9F22A] cursor-pointer"
                    >
                      <option value="CPF" className="bg-[#080d1a]">CPF</option>
                      <option value="CNPJ" className="bg-[#080d1a]">CNPJ</option>
                      <option value="EMAIL" className="bg-[#080d1a]">E-mail</option>
                      <option value="PHONE" className="bg-[#080d1a]">Celular</option>
                      <option value="EVP" className="bg-[#080d1a]">Chave Aleatória (EVP)</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      required
                      value={pixKey}
                      onChange={(e) => setPixKey(e.target.value)}
                      placeholder="Informe sua Chave PIX oficial"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder:text-white/30 focus:outline-none focus:border-[#D9F22A]"
                    />
                  </div>
                </div>
              </div>

              {/* Negócio e Categoria */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-white/70">
                    Segmento / Categoria
                  </label>
                  <select
                    value={businessCategory}
                    onChange={(e) => setBusinessCategory(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-[#D9F22A] cursor-pointer"
                  >
                    <option value="SaaS / B2B" className="bg-[#080d1a]">SaaS / B2B</option>
                    <option value="iGaming & Apostas" className="bg-[#080d1a]">iGaming & Apostas</option>
                    <option value="Educação / Cursos" className="bg-[#080d1a]">Educação / Cursos</option>
                    <option value="Fintech & Pagamentos" className="bg-[#080d1a]">Fintech & Pagamentos</option>
                    <option value="Marketing & Vendas" className="bg-[#080d1a]">Marketing & Vendas</option>
                    <option value="IA & Automação" className="bg-[#080d1a]">IA & Automação</option>
                    <option value="E-commerce / Dropship" className="bg-[#080d1a]">E-commerce / Dropship</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-white/70">
                    Website ou Rede Social (Opcional)
                  </label>
                  <input
                    type="url"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    placeholder="https://seuproduto.com ou @instagram"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder:text-white/30 focus:outline-none focus:border-[#D9F22A]"
                  />
                </div>
              </div>

              {/* Upload de Documento com foto */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-white/70 flex items-center justify-between">
                  <span>Documento de Identificação (RG, CNH ou Contrato Social)</span>
                  <span className="text-[10px] text-white/40">Opcional para envio inicial</span>
                </label>
                <div className="relative border border-dashed border-white/20 hover:border-[#D9F22A]/50 rounded-2xl p-4 text-center cursor-pointer transition-colors bg-white/[0.01]">
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFileUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  {docImagePreview ? (
                    <div className="flex items-center justify-center gap-3">
                      <img src={docImagePreview} alt="Doc preview" className="w-12 h-12 object-cover rounded-lg border border-white/20" />
                      <div className="text-left text-xs">
                        <p className="font-bold text-emerald-400">Documento carregado</p>
                        <p className="text-white/50 text-[11px]">Clique para alterar o arquivo</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      <Upload className="w-5 h-5 text-white/50" />
                      <p className="text-xs font-semibold text-white/80">
                        Clique ou arraste uma foto do seu documento
                      </p>
                      <p className="text-[10px] text-white/40">Formatos aceitos: JPG, PNG, PDF até 3.5MB</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Termos de Conformidade */}
              <div className="flex items-start gap-2.5 pt-1">
                <input
                  type="checkbox"
                  id="kyc-terms-check"
                  required
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-0.5 accent-[#D9F22A] rounded cursor-pointer"
                />
                <label htmlFor="kyc-terms-check" className="text-[11px] text-white/70 leading-relaxed cursor-pointer select-none">
                  Declaro que as informações e a titularidade da chave PIX são verídicas e concordo com os termos de compliance e a regra de liquidação D+9 da plataforma LeadsPay.
                </label>
              </div>

              {/* Footer Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold text-white/70 hover:text-white hover:bg-white/5 cursor-pointer transition-colors text-center"
                >
                  Permanecer no Modo Teste
                </button>

                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  {/* Atalho Admin */}
                  {(isSuperAdmin || roleMode === 'admin') && (
                    <button
                      type="button"
                      onClick={handleAdminApproval}
                      disabled={isApproving}
                      className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl text-xs font-bold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 cursor-pointer transition-colors flex items-center justify-center gap-1.5"
                      title="Privilégio Admin: Aprovar sem aguardar compliance"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>{isApproving ? '...' : 'Aprovar Imediato (Admin)'}</span>
                    </button>
                  )}

                  <button
                    type="submit"
                    id="btn-submit-kyc-profile"
                    disabled={isSubmitting}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#D9F22A] hover:bg-[#c8e024] text-slate-950 font-black text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(217,242,42,0.3)] cursor-pointer transition-all active:scale-95 disabled:opacity-50"
                  >
                    <span>{isSubmitting ? 'Enviando Dados...' : 'Enviar Perfil para Aprovação'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
