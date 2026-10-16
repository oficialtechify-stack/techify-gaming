import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { ProfileSectionTabs, type ProfileSection } from './ProfileSectionTabs';
import React, { useState, useEffect } from 'react';
import { UserSellerProfile, CompanyStartup, UserRoleMode } from '../../types/platform';
import { 
  User, 
  Mail, 
  MapPin, 
  Upload, 
  Check, 
  AlertCircle, 
  MessageCircle, 
  Camera, 
  CheckCircle2, 
  ShieldCheck,
  Lock,
  Clock,
  XCircle,
  Sparkles,
  Send,
  Building2,
  Globe,
  Tag,
  FileCheck,
  RefreshCw,
  Plus,
  Layers,
  Phone,
  Briefcase,
  Edit3,
  ArrowRight,
  CreditCard,
  Wallet
} from 'lucide-react';
import { formatCPF, formatCNPJ, formatPhone, isValidCPF, isValidCNPJ } from '../../services/authService';
import { NotificationPreferencesPanel } from './NotificationPreferencesPanel';
import { LeadsPaySupportWidget } from './LeadsPaySupportWidget';
import { AccountSecurityPanel } from './AccountSecurityPanel';
import { StripeConnectCompanyPanel, type ConnectStatus } from './StripeConnectCompanyPanel';
import { requestProfileEditInFirebase } from '../../services/firestoreService';

interface MeuPerfilViewProps {
  userProfile: UserSellerProfile;
  onSaveProfile: (updates: Partial<UserSellerProfile>) => Promise<void>;
  onSubmitForVerification?: (updates: Partial<UserSellerProfile>) => Promise<void>;
  onNavigateToTab?: (tab: any) => void;
  roleMode?: UserRoleMode;
  company?: CompanyStartup;
}

export const MeuPerfilView: React.FC<MeuPerfilViewProps> = ({
  userProfile,
  onSaveProfile,
  onSubmitForVerification,
  onNavigateToTab,
  roleMode,
  company
}) => {
  // Parse full name into firstName and lastName if not explicitly separated
  const parseNames = (fullName: string) => {
    const parts = (fullName || '').trim().split(' ');
    const first = parts[0] || '';
    const last = parts.slice(1).join(' ') || '';
    return { first, last };
  };

  const initialNames = parseNames(userProfile.name);

  // ===================== AFFILIATE PROFILE FORM STATES =====================
  const [firstName, setFirstName] = useState<string>(userProfile.firstName || initialNames.first || '');
  const [lastName, setLastName] = useState<string>(userProfile.lastName || initialNames.last || '');
  const [email, setEmail] = useState<string>(userProfile.email || '');
  const [cpf, setCpf] = useState<string>(userProfile.cpf || '');
  const [celular, setCelular] = useState<string>(userProfile.whatsapp || userProfile.phone || '');
  const [avatar, setAvatar] = useState<string>(userProfile.avatar || '');

  // ===================== COMPANY PROFILE FORM STATES =====================
  const [companyName, setCompanyName] = useState<string>(
    userProfile.companyName || company?.name || ''
  );
  const [companyOwnerName, setCompanyOwnerName] = useState<string>(
    userProfile.name || (userProfile.firstName ? `${userProfile.firstName} ${userProfile.lastName || ''}`.trim() : '')
  );
  const [companyEmail, setCompanyEmail] = useState<string>(
    userProfile.email || company?.email || ''
  );
  const [companyDocType, setCompanyDocType] = useState<'CNPJ' | 'CPF'>(
    userProfile.companyDocType === 'CPF' ? 'CPF' : 'CNPJ'
  );
  const [companyCnpj, setCompanyCnpj] = useState<string>(
    userProfile.companyCnpj || company?.cnpj || userProfile.cnpj || ''
  );
  const [companyPhone, setCompanyPhone] = useState<string>(
    userProfile.companyPhone || company?.whatsapp || userProfile.whatsapp || userProfile.phone || ''
  );
  const [companyCategory, setCompanyCategory] = useState<string>(
    userProfile.companyCategory || company?.category || 'SaaS / B2B'
  );
  const [companyTagline, setCompanyTagline] = useState<string>(
    userProfile.companyTagline || company?.tagline || ''
  );
  const [companyWebsite, setCompanyWebsite] = useState<string>(
    userProfile.companyWebsite || company?.website || ''
  );
  const [companyLogo, setCompanyLogo] = useState<string>(
    userProfile.companyLogo || company?.logo || userProfile.avatar || ''
  );

  // ===================== COMMON ADDRESS STATES =====================
  const [cep, setCep] = useState<string>(userProfile.companyCep || userProfile.cep || '');
  const [country, setCountry] = useState<string>(userProfile.companyCountry || userProfile.country || 'Brazil');
  const [estado, setEstado] = useState<string>(userProfile.companyState || userProfile.state || '');
  const [cidade, setCidade] = useState<string>(userProfile.companyCity || userProfile.city || '');
  const [endereco, setEndereco] = useState<string>(userProfile.companyAddress || userProfile.address || '');

  const [activeProfileSection, setActiveProfileSection] = useState<ProfileSection>('geral');
  const [feeSimulation, setFeeSimulation] = useState('100');
  const [passwordResetLoading, setPasswordResetLoading] = useState(false);
  const [passwordResetFeedback, setPasswordResetFeedback] = useState('');

  const handlePasswordReset = async () => {
    const accountEmail = auth.currentUser?.email;
    if (!accountEmail) {
      setPasswordResetFeedback('Não foi possível identificar o e-mail da sessão. Entre novamente e tente outra vez.');
      return;
    }
    setPasswordResetLoading(true);
    setPasswordResetFeedback('');
    try {
      await sendPasswordResetEmail(auth, accountEmail);
      setPasswordResetFeedback('Enviamos um link de redefinição para o e-mail da sua conta. Confira também a caixa de spam.');
    } catch {
      setPasswordResetFeedback('Não foi possível enviar o link agora. Tente novamente mais tarde.');
    } finally {
      setPasswordResetLoading(false);
    }
  };

  // UI & Validation States
  const [cepError, setCepError] = useState<boolean>(false);
  const [isSearchingCep, setIsSearchingCep] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSavingDraft, setIsSavingDraft] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [stripeStatus, setStripeStatus] = useState<ConnectStatus>('loading');
  const [showSecuritySettings, setShowSecuritySettings] = useState(false);
  const [showFinancialDetails, setShowFinancialDetails] = useState(false);
  const [showEditRequest, setShowEditRequest] = useState(false);
  const [editRequestReason, setEditRequestReason] = useState('');
  const [isRequestingEdit, setIsRequestingEdit] = useState(false);

  // Allow editing if rejected and user clicks to fix
  const [isEditingRejected, setIsEditingRejected] = useState<boolean>(false);

  // Determine verification status by role. Company approval is independent from affiliate approval.
  const verificationStatus = roleMode === 'empresa'
    ? (
        userProfile.empresaVerificationStatus ||
        userProfile.companyVerificationStatus ||
        userProfile.verificationStatus ||
        (userProfile.verified ? 'approved' : 'unsubmitted')
      )
    : (
        userProfile.affiliateVerificationStatus ||
        userProfile.verificationStatus ||
        (userProfile.verified ? 'approved' : 'unsubmitted')
      );

  const isPending = verificationStatus === 'pending' || verificationStatus === 'submitted';
  const isApproved = verificationStatus === 'approved' || (roleMode !== 'empresa' && userProfile.verified === true);
  const isRejected = verificationStatus === 'rejected';
  // Empresa e Afiliado seguem o mesmo onboarding financeiro: Stripe primeiro.
  const stripeReady = stripeStatus === 'connected';
  const companyEditUnlocked = roleMode === 'empresa' && userProfile.companyProfileEditUnlocked === true;
  const affiliateEditUnlocked = roleMode === 'afiliado' && userProfile.affiliateProfileEditUnlocked === true;
  const profileEditUnlocked = roleMode === 'empresa' ? companyEditUnlocked : affiliateEditUnlocked;
  const profileEditRequestStatus = roleMode === 'empresa'
    ? userProfile.companyEditRequestStatus
    : userProfile.affiliateEditRequestStatus;

  // Os campos cadastrais só liberam após a Stripe estar pronta.
  // Depois do envio/aprovação, Empresa e Afiliado ficam protegidos até o Admin liberar uma edição.
  const isLocked = !stripeReady ||
    isPending ||
    (isApproved && !profileEditUnlocked) ||
    (isRejected && !isEditingRejected);

  // Synchronize when userProfile or company changes
  useEffect(() => {
    const { first, last } = parseNames(userProfile.name);
    setFirstName(userProfile.firstName || first || '');
    setLastName(userProfile.lastName || last || '');
    setEmail(userProfile.email || '');
    setCpf(userProfile.cpf || '');
    setCelular(userProfile.whatsapp || userProfile.phone || '');
    setAvatar(userProfile.avatar || '');

    // Company sync
    setCompanyName(userProfile.companyName || company?.name || '');
    setCompanyOwnerName(userProfile.name || (userProfile.firstName ? `${userProfile.firstName} ${userProfile.lastName || ''}`.trim() : ''));
    setCompanyEmail(userProfile.email || company?.email || '');
    setCompanyCnpj(userProfile.companyCnpj || company?.cnpj || userProfile.cnpj || '');
    setCompanyPhone(userProfile.companyPhone || company?.whatsapp || userProfile.whatsapp || userProfile.phone || '');
    setCompanyCategory(userProfile.companyCategory || company?.category || 'SaaS / B2B');
    setCompanyTagline(userProfile.companyTagline || company?.tagline || '');
    setCompanyWebsite(userProfile.companyWebsite || company?.website || '');
    setCompanyLogo(userProfile.companyLogo || company?.logo || userProfile.avatar || '');

    // Address sync
    setCep(userProfile.companyCep || userProfile.cep || '');
    setCountry(userProfile.companyCountry || userProfile.country || 'Brazil');
    setEstado(userProfile.companyState || userProfile.state || '');
    setCidade(userProfile.companyCity || userProfile.city || '');
    setEndereco(userProfile.companyAddress || userProfile.address || '');
  }, [userProfile, company]);

  // CEP Mask and Search Auto-fill via ViaCEP
  const handleCepChange = async (value: string) => {
    if (isLocked) return;
    const rawDigits = value.replace(/\D/g, '').slice(0, 8);
    let formatted = rawDigits;
    if (rawDigits.length > 5) {
      formatted = `${rawDigits.slice(0, 5)}-${rawDigits.slice(5)}`;
    }
    setCep(formatted);
    setCepError(false);

    if (rawDigits.length === 8) {
      setIsSearchingCep(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${rawDigits}/json/`);
        const data = await res.json();
        if (data.erro) {
          setCepError(true);
        } else {
          setCepError(false);
          setEstado(data.uf || '');
          setCidade(data.localidade || '');
          if (data.logradouro) {
            setEndereco(`${data.logradouro}${data.bairro ? `, ${data.bairro}` : ''}`);
          }
        }
      } catch (err) {
        setCepError(true);
      } finally {
        setIsSearchingCep(false);
      }
    }
  };

  // Branding is editable independently of protected KYC fields.
  const canEditBranding = roleMode === 'empresa' && isApproved;
  const [isSavingBranding, setIsSavingBranding] = useState(false);
  const saveBranding = async () => {
    if (!canEditBranding || !companyLogo || companyLogo === userProfile.companyLogo) return;
    setIsSavingBranding(true);
    try {
      await onSaveProfile({ companyLogo });
      setToastMessage({ type: 'success', text: 'Logotipo atualizado com sucesso.' });
    } catch {
      setToastMessage({ type: 'error', text: 'Não foi possível salvar o logotipo. Tente novamente.' });
    } finally {
      setIsSavingBranding(false);
    }
  };

  // Image Upload Handler (Avatar or Company Logo)
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'avatar' | 'companyLogo') => {
    if (isLocked && !(target === 'companyLogo' && canEditBranding)) return;
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 3.1 * 1024 * 1024) {
        setToastMessage({ type: 'error', text: 'Tamanho da imagem excede o limite máximo de 3.1 MB' });
        setTimeout(() => setToastMessage(null), 4000);
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const res = event.target.result as string;
          if (target === 'companyLogo') {
            setCompanyLogo(res);
          } else {
            setAvatar(res);
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Validation Checks
  const cleanCpfDigits = cpf.replace(/\D/g, '');
  const cleanPhoneDigits = (roleMode === 'empresa' ? companyPhone : celular).replace(/\D/g, '');
  const cleanCepDigits = cep.replace(/\D/g, '');
  const cleanCnpjDigits = companyCnpj.replace(/\D/g, '');

  const hasCep = cleanCepDigits.length === 8;
  const hasState = estado.trim().length >= 2;
  const hasCity = cidade.trim().length >= 2;
  const hasAddress = endereco.trim().length >= 3;

  // Affiliate Completeness
  const hasAffiliateFirstName = firstName.trim().length >= 2;
  const hasAffiliateLastName = lastName.trim().length >= 2;
  const hasAffiliateEmail = email.trim().includes('@') && email.trim().includes('.');
  const hasAffiliateCpf = cleanCpfDigits.length === 11;
  const hasAffiliatePhone = cleanPhoneDigits.length >= 10;

  const isAffiliateFormComplete = (
    hasAffiliateFirstName &&
    hasAffiliateLastName &&
    hasAffiliateEmail &&
    hasAffiliateCpf &&
    hasAffiliatePhone &&
    hasCep &&
    hasState &&
    hasCity &&
    hasAddress
  );

  // Company Completeness
  const hasCompanyName = companyName.trim().length >= 2;
  const hasCompanyOwner = companyOwnerName.trim().length >= 3;
  const hasCompanyEmail = companyEmail.trim().includes('@') && companyEmail.trim().includes('.');
  const hasCompanyPhone = cleanPhoneDigits.length >= 10;
  const hasCompanyDoc = companyDocType === 'CNPJ' 
    ? cleanCnpjDigits.length === 14 
    : cleanCnpjDigits.length === 11;

  const isCompanyFormComplete = (
    hasCompanyName &&
    hasCompanyOwner &&
    hasCompanyEmail &&
    hasCompanyPhone &&
    hasCompanyDoc &&
    hasCep &&
    hasState &&
    hasCity &&
    hasAddress
  );

  const isFormComplete = roleMode === 'empresa' ? isCompanyFormComplete : isAffiliateFormComplete;

  // Submit profile / company data to Admin for verification & LOCK fields
  const handleSubmitForVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;

    if (roleMode === 'afiliado') {
      if (!isValidCPF(cleanCpfDigits)) {
        setToastMessage({ type: 'error', text: 'CPF informado é inválido. Por favor verifique os dígitos.' });
        setTimeout(() => setToastMessage(null), 4500);
        return;
      }
    } else {
      // Company Document Validation
      if (companyDocType === 'CNPJ') {
        if (!isValidCNPJ(cleanCnpjDigits)) {
          setToastMessage({ type: 'error', text: 'CNPJ da empresa informado é inválido. Verifique os 14 dígitos.' });
          setTimeout(() => setToastMessage(null), 4500);
          return;
        }
      } else {
        // CPF ou MEI
        const isValid = cleanCnpjDigits.length === 14 ? isValidCNPJ(cleanCnpjDigits) : isValidCPF(cleanCnpjDigits);
        if (!isValid) {
          setToastMessage({ type: 'error', text: 'Documento informado (CPF ou CNPJ MEI) é inválido. Verifique os dígitos.' });
          setTimeout(() => setToastMessage(null), 4500);
          return;
        }
      }
    }

    if (!isFormComplete) {
      setToastMessage({ type: 'error', text: 'Por favor, preencha todos os campos obrigatórios antes de submeter para análise.' });
      setTimeout(() => setToastMessage(null), 4000);
      return;
    }

    setIsSubmitting(true);
    setToastMessage(null);

    let updates: Partial<UserSellerProfile>;

    if (roleMode === 'empresa') {
      const formattedDoc = companyDocType === 'CNPJ' 
        ? formatCNPJ(cleanCnpjDigits) 
        : cleanCnpjDigits.length === 14 
          ? formatCNPJ(cleanCnpjDigits) 
          : formatCPF(cleanCnpjDigits);

      const formattedCompanyPhone = formatPhone(cleanPhoneDigits);

      // A aprovação cadastral é separada da configuração financeira.
      // Stripe Connect só é iniciado após a aprovação do perfil/empresa.
      const resolvedDocType: 'CNPJ' | 'CPF' = companyDocType;

      updates = {
        name: companyOwnerName.trim() || userProfile.name,
        companyName: companyName.trim(),
        companyLegalName: companyDocType === 'CPF' ? companyOwnerName.trim() : companyName.trim(),
        companyCnpj: formattedDoc,
        cleanCnpj: cleanCnpjDigits,
        companyDocType: companyDocType,        documentType: resolvedDocType,
        companyPhone: formattedCompanyPhone,
        whatsapp: formattedCompanyPhone,
        phone: formattedCompanyPhone,
        email: companyEmail.trim(),
        companyCategory: companyCategory,
        companyTagline: companyTagline.trim(),
        companyWebsite: companyWebsite.trim(),
        companyLogo: companyLogo || userProfile.avatar,
        avatar: companyLogo || userProfile.avatar,
        companyCep: cep.trim(),
        companyCountry: country,
        companyState: estado.trim(),
        companyCity: cidade.trim(),
        companyAddress: endereco.trim(),
        cep: cep.trim(),
        country: country,
        state: estado.trim(),
        city: cidade.trim(),
        address: endereco.trim(),
        hasCompanyProfile: true,
        verificationRoleType: 'empresa',
        activeRoleMode: 'empresa',
        verificationStatus: 'pending',
        verified: false
      };
    } else {
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
      const formattedCpf = formatCPF(cleanCpfDigits);
      const formattedPhone = formatPhone(cleanPhoneDigits);

      updates = {
        name: fullName,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        cpf: formattedCpf,
        cleanCpf: cleanCpfDigits,
        whatsapp: formattedPhone,
        phone: formattedPhone,
        cep: cep.trim(),
        country: country,
        state: estado.trim(),
        city: cidade.trim(),
        address: endereco.trim(),
        avatar: avatar || userProfile.avatar,
        verificationRoleType: 'afiliado',
        activeRoleMode: 'afiliado',
        verificationStatus: 'pending',
        verified: false
      };
    }

    try {
      if (onSubmitForVerification) {
        await onSubmitForVerification(updates);
      } else {
        await onSaveProfile(updates);
      }

      setIsEditingRejected(false);
      setToastMessage({ 
        type: 'success', 
        text: roleMode === 'empresa'
          ? 'Dados da empresa enviados para validação cadastral com sucesso! Campos bloqueados para auditoria.'
          : 'Dados enviados para validação com sucesso! Seus campos foram bloqueados para análise da administração.' 
      });
      setTimeout(() => setToastMessage(null), 6000);
    } catch (err: any) {
      console.error('Erro ao enviar para validação:', err);
      setToastMessage({ type: 'error', text: `Erro ao enviar dados: ${err.message}` });
      setTimeout(() => setToastMessage(null), 5000);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Optional: Save Draft without Submitting
  const handleSaveDraft = async () => {
    if (isLocked) return;
    setIsSavingDraft(true);
    try {
      if (roleMode === 'empresa') {
        await onSaveProfile({
          companyName: companyName.trim(),
          companyLegalName: companyDocType === 'CPF' ? companyOwnerName.trim() : companyName.trim(),
          companyCnpj: companyDocType === 'CNPJ' ? formatCNPJ(cleanCnpjDigits) : formatCPF(cleanCnpjDigits),
          cleanCnpj: cleanCnpjDigits,
          companyDocType: companyDocType,
          companyPhone: companyPhone.trim(),
          companyCategory: companyCategory,
          companyTagline: companyTagline.trim(),
          companyWebsite: companyWebsite.trim(),
          companyLogo: companyLogo || userProfile.avatar,
          companyCep: cep.trim(),
          companyCountry: country,
          companyState: estado.trim(),
          companyCity: cidade.trim(),
          companyAddress: endereco.trim(),
          cep: cep.trim(),
          country: country,
          state: estado.trim(),
          city: cidade.trim(),
          address: endereco.trim()
        });
      } else {
        const fullName = `${firstName.trim()} ${lastName.trim()}`.trim() || userProfile.name;
        await onSaveProfile({
          name: fullName,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          cpf: cleanCpfDigits ? formatCPF(cleanCpfDigits) : '',
          cleanCpf: cleanCpfDigits,
          whatsapp: celular.trim(),
          phone: celular.trim(),
          cep: cep.trim(),
          country: country,
          state: estado.trim(),
          city: cidade.trim(),
          address: endereco.trim(),
          avatar: avatar || userProfile.avatar
        });
      }
      setToastMessage({ type: 'success', text: 'Rascunho salvo temporariamente.' });
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err: any) {
      setToastMessage({ type: 'error', text: `Erro ao salvar rascunho: ${err.message}` });
      setTimeout(() => setToastMessage(null), 4000);
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleRequestProfileEdit = async () => {
    const reason = editRequestReason.trim();
    if (reason.length < 10) {
      setToastMessage({ type: 'error', text: 'Explique em pelo menos 10 caracteres o que você deseja alterar.' });
      return;
    }

    setIsRequestingEdit(true);
    try {
      await requestProfileEditInFirebase(reason, roleMode === 'empresa' ? 'empresa' : 'afiliado');
      setShowEditRequest(false);
      setEditRequestReason('');
      setToastMessage({
        type: 'success',
        text: 'Solicitação enviada. Seu perfil continuará bloqueado até a administração liberar a edição.'
      });
      setTimeout(() => setToastMessage(null), 6000);
    } catch (error) {
      setToastMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Não foi possível solicitar o ajuste.'
      });
      setTimeout(() => setToastMessage(null), 5000);
    } finally {
      setIsRequestingEdit(false);
    }
  };

  return (
    <div className="relative animate-in fade-in duration-200 pb-16 px-1 sm:px-2" id="leadspay-meu-perfil-view">
      {showEditRequest && (roleMode === 'empresa' || roleMode === 'afiliado') && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[26px] border border-white/10 bg-[#0A1220] p-6 shadow-[0_30px_100px_rgba(0,0,0,0.6)]">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#D9F22A]/25 bg-[#D9F22A]/10 text-[#D9F22A]">
                <Edit3 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Solicitar ajuste do perfil</h3>
                <p className="mt-1 text-xs leading-5 text-white/50">
                  Depois de aprovado, seu perfil fica protegido. Explique o que precisa alterar e aguarde a administração liberar a edição.
                </p>
              </div>
            </div>

            <textarea
              value={editRequestReason}
              onChange={(event) => setEditRequestReason(event.target.value)}
              maxLength={800}
              rows={5}
              placeholder={roleMode === 'empresa' ? 'Ex.: preciso atualizar o endereço comercial e o WhatsApp da empresa.' : 'Ex.: preciso atualizar meu endereço e meu número de celular.'}
              className="mt-5 w-full resize-none rounded-2xl border border-white/10 bg-[#060b14] px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#D9F22A]/50"
            />

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowEditRequest(false);
                  setEditRequestReason('');
                }}
                disabled={isRequestingEdit}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold text-white/70"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleRequestProfileEdit}
                disabled={isRequestingEdit || editRequestReason.trim().length < 10}
                className="inline-flex items-center gap-2 rounded-xl bg-[#D9F22A] px-4 py-2.5 text-xs font-black text-[#07100A] disabled:opacity-40"
              >
                {isRequestingEdit ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Enviar solicitação
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Layout unificado inspirado na referência: painel de marca lateral e dados em duas colunas. */}
      <style>{`
        @media (min-width: 1024px) {
          #leadspay-meu-perfil-view .profile-general-form {
            display: grid; grid-template-columns: minmax(250px, 30%) minmax(0, 1fr);
            align-items: stretch; gap: 0; overflow: hidden;
            border-radius: 22px; background: #1b1b1d; border: 1px solid #313238;
          }
          #leadspay-meu-perfil-view .profile-general-form .profile-brand-card {
            grid-column: 1; display: flex; flex-direction: column; justify-content: flex-end;
            align-items: flex-start; text-align: left; gap: 12px; height: 100%;
            min-height: 570px; position: relative; top: auto; border: 0; border-radius: 0;
            background: linear-gradient(180deg,rgba(11,12,19,.05) 0%,rgba(11,12,19,.85) 100%),linear-gradient(140deg,#29213d,#121f22 65%,#0a0e13);
            padding: 32px;
          }
          #leadspay-meu-perfil-view .profile-general-form .profile-brand-card > div:last-child { flex: 0 1 auto; width: 100%; }
          #leadspay-meu-perfil-view .profile-general-form .profile-fields-stack { grid-column: 2; gap: 0; }
          #leadspay-meu-perfil-view .profile-general-form .profile-fields-stack > div {
            border: 0; border-radius: 0; background: #1b1b1d; box-shadow: none;
            padding: 28px 30px;
          }
          #leadspay-meu-perfil-view .profile-general-form .profile-fields-stack > div + div {
            border-top: 1px solid #35373a;
          }
          #leadspay-meu-perfil-view .profile-identity-section {
            background: transparent; border: 0; box-shadow: none;
            padding: 0 0 18px; margin-bottom: 8px;
          }
          #leadspay-meu-perfil-view .profile-identity-section button[aria-pressed] {
            min-height: 60px; padding: 14px 18px; border-radius: 12px;
          }
        }
        #leadspay-meu-perfil-view .profile-settings-nav {
          border: 0; border-bottom: 1px solid #29313a; background: transparent;
          border-radius: 0; box-shadow: none;
        }
        #leadspay-meu-perfil-view .profile-general-form .profile-fields-stack input:not([type="checkbox"]):not([type="radio"]):not([type="file"]),
        #leadspay-meu-perfil-view .profile-general-form .profile-fields-stack select {
          background: #17191d; border-color: #3c4149;
        }
        @media (max-width: 640px) {
          #leadspay-meu-perfil-view .profile-general-form { gap: 12px; }
          #leadspay-meu-perfil-view .profile-brand-card { min-height: 180px; }
          #leadspay-meu-perfil-view .profile-identity-section { padding: 16px; }
        }
      `}</style>
      {/* Identidade visual renovada da aba Geral: cartões amplos, marca horizontal e hierarquia Cakto-inspired. */}
      <style>{`
        #leadspay-meu-perfil-view { max-width: 1240px; }
        #leadspay-meu-perfil-view .profile-settings-nav {
          background: #0e1522; border: 1px solid #253044; border-radius: 16px;
          box-shadow: 0 8px 28px rgba(0,0,0,.14); padding: 3px 12px;
        }
        #leadspay-meu-perfil-view .profile-identity-section {
          background: linear-gradient(120deg,#151f2f 0%,#101827 68%,#172a24 100%);
          border: 1px solid #354456; border-radius: 22px; padding: 30px;
          box-shadow: 0 14px 40px rgba(0,0,0,.16);
        }
        #leadspay-meu-perfil-view .profile-identity-section h2 {
          font-size: 25px; letter-spacing: -.04em; line-height: 1.25; margin-top: 10px;
        }
        #leadspay-meu-perfil-view .profile-identity-section button[aria-pressed] {
          min-height: 102px; background: #0c1523; border: 1px solid #334155;
          border-radius: 14px; padding: 20px; position: relative;
        }
        #leadspay-meu-perfil-view .profile-identity-section button[aria-pressed="true"] {
          background: #1c2d26; border-color: #d9f22a;
          box-shadow: inset 0 0 0 1px rgba(217,242,42,.16),0 4px 18px rgba(0,0,0,.12);
        }
        #leadspay-meu-perfil-view .profile-identity-section button[aria-pressed="true"]::after {
          content: "✓"; position: absolute; top: 14px; right: 17px;
          color: #d9f22a; font-weight: 800; font-size: 17px;
        }
        #leadspay-meu-perfil-view .profile-general-form { gap: 18px; }
        #leadspay-meu-perfil-view .profile-brand-card {
          background: linear-gradient(115deg,#172535 0%,#111d2d 65%,#152b29 100%);
          border: 1px solid #33465a; border-radius: 22px; padding: 26px 32px;
          min-height: 196px; box-shadow: 0 10px 34px rgba(0,0,0,.14);
        }
        #leadspay-meu-perfil-view .profile-brand-card > div:last-child { flex: 1; }
        #leadspay-meu-perfil-view .profile-fields-stack > div {
          background: #121d2c; border: 1px solid #2c3b50; border-radius: 20px;
          padding: 28px 32px; box-shadow: 0 8px 26px rgba(0,0,0,.11);
        }
        #leadspay-meu-perfil-view .profile-fields-stack > div h4 {
          font-size: 16px; letter-spacing: -.02em; font-weight: 750;
        }
        #leadspay-meu-perfil-view .profile-fields-stack label { color: #c1cad7; }
        #leadspay-meu-perfil-view .profile-general-form input:not([type="file"]):not([type="checkbox"]):not([type="radio"]),
        #leadspay-meu-perfil-view .profile-general-form select,
        #leadspay-meu-perfil-view .profile-general-form textarea {
          background: #0b1422; border: 1px solid #334155; min-height: 48px;
          border-radius: 11px; color: #f7f9fc; font-size: 14px;
        }
        #leadspay-meu-perfil-view .profile-general-form input:focus-visible,
        #leadspay-meu-perfil-view .profile-general-form select:focus-visible,
        #leadspay-meu-perfil-view .profile-general-form textarea:focus-visible {
          outline: 2px solid #d9f22a; outline-offset: 1px;
        }
        @media(max-width:640px) {
          #leadspay-meu-perfil-view .profile-identity-section { padding: 20px; border-radius: 16px; }
          #leadspay-meu-perfil-view .profile-identity-section h2 { font-size: 21px; }
          #leadspay-meu-perfil-view .profile-brand-card { padding: 20px; border-radius: 16px; }
          #leadspay-meu-perfil-view .profile-fields-stack > div { padding: 20px; border-radius: 16px; }
          #leadspay-meu-perfil-view .profile-general-form input:not([type="file"]):not([type="checkbox"]):not([type="radio"]) { font-size: 16px; }
        }
      `}</style>
      {/* Refinamento visual da área de configurações, sem alterar as integrações de cadastro e pagamento. */}
      <style>{`
        #leadspay-meu-perfil-view { max-width: 1320px; margin-inline: auto; color: #f4f6fa; }
        #leadspay-meu-perfil-view form { align-items: start; gap: 20px; }
        #leadspay-meu-perfil-view form > div,
        #leadspay-meu-perfil-view form > section { border-radius: 18px; }
        #leadspay-meu-perfil-view form input:not([type="checkbox"]):not([type="radio"]):not([type="file"]),
        #leadspay-meu-perfil-view form textarea,
        #leadspay-meu-perfil-view form select {
          min-height: 46px; border-radius: 10px; font-size: 14px; line-height: 1.4;
          background-color: #0b1422; border-color: rgba(181,195,216,.2);
          color: #f6f8fc; transition: border-color .2s, box-shadow .2s;
        }
        #leadspay-meu-perfil-view form input:focus-visible,
        #leadspay-meu-perfil-view form textarea:focus-visible,
        #leadspay-meu-perfil-view form select:focus-visible {
          outline: none; border-color: #d9f22a;
          box-shadow: 0 0 0 3px rgba(217,242,42,.13);
        }
        #leadspay-meu-perfil-view form input:disabled,
        #leadspay-meu-perfil-view form textarea:disabled { opacity: .7; cursor: not-allowed; }
        #leadspay-meu-perfil-view form label { font-size: 12px; font-weight: 600; letter-spacing: .01em; }
        #leadspay-meu-perfil-view form button { transition: transform .18s, background-color .18s, border-color .18s; }
        #leadspay-meu-perfil-view form button:not(:disabled):active { transform: scale(.985); }
        #leadspay-meu-perfil-view [role="tabpanel"] { border-radius: 18px; }
        @media (max-width: 640px) {
          #leadspay-meu-perfil-view { padding-bottom: 64px; }
          #leadspay-meu-perfil-view form { gap: 14px; }
          #leadspay-meu-perfil-view form > div,
          #leadspay-meu-perfil-view form > section { padding: 18px; border-radius: 14px; }
          #leadspay-meu-perfil-view form input:not([type="checkbox"]):not([type="radio"]):not([type="file"]),
          #leadspay-meu-perfil-view form textarea { font-size: 16px; }
          #leadspay-meu-perfil-view [role="tabpanel"] { padding: 18px; }
        }
      `}</style>
      <div className="mb-7 rounded-2xl border border-white/10 bg-[#0a101b] px-3 sm:px-5 shadow-lg profile-settings-nav">
        <ProfileSectionTabs active={activeProfileSection} onChange={setActiveProfileSection} />
      </div>
      {activeProfileSection === 'senha' && (
        <section id="profile-panel-senha" role="tabpanel" aria-labelledby="profile-tab-senha" className="overflow-hidden rounded-3xl border border-white/10 bg-[#191b20] text-white shadow-2xl">
          <div className="grid lg:grid-cols-[42%_58%]">
            <aside className="bg-gradient-to-br from-[#152e2a] via-[#10201e] to-[#11131a] p-7 sm:p-10">
              <div className="mb-7 h-1 w-14 rounded-full bg-[#D9F22A]" />
              <h2 className="max-w-xs text-2xl font-bold leading-snug">Mantenha sua conta <span className="text-[#D9F22A]">sempre segura</span></h2>
              <p className="mt-4 text-sm leading-6 text-white/65">Use uma senha forte e única para proteger seus dados e evitar acessos não autorizados.</p>
              <div className="my-7 border-t border-white/15" />
              <h3 className="text-sm font-semibold">Sua senha deve conter:</h3>
              <ul className="mt-4 space-y-3 text-sm text-white/65">
                <li>Ao menos 8 caracteres</li><li>Letras maiúsculas e minúsculas</li><li>Pelo menos um número</li><li>Um caractere especial</li>
              </ul>
            </aside>
            <div className="p-7 sm:p-10">
              <h2 className="text-xl font-bold">Alterar Senha</h2>
              <p className="mt-2 text-sm leading-6 text-white/60">Para sua segurança, a alteração é feita por um link enviado ao e-mail autenticado. Não solicitamos sua senha atual neste painel.</p>
              <div className="mt-8 rounded-xl border border-white/15 bg-black/20 p-4">
                <p className="text-xs font-semibold text-white/60">E-mail da conta</p>
                <p className="mt-2 break-all text-sm">{auth.currentUser?.email || 'Não identificado'}</p>
              </div>
              <div className="mt-6 rounded-xl border border-[#D9F22A]/20 bg-[#D9F22A]/5 p-4 text-sm leading-6 text-white/70">Ao receber o e-mail, abra o link de recuperação e defina sua nova senha. Se não encontrar a mensagem, verifique a pasta de spam.</div>
              <div className="mt-8 flex flex-wrap justify-end gap-3">
                <button type="button" onClick={() => setActiveProfileSection('geral')} className="rounded-xl border border-white/20 px-5 py-3 text-sm font-semibold hover:bg-white/5">Cancelar</button>
                <button type="button" onClick={handlePasswordReset} disabled={passwordResetLoading} className="rounded-xl bg-[#D9F22A] px-5 py-3 text-sm font-bold text-[#060A15] hover:bg-[#c8e217] disabled:opacity-50">{passwordResetLoading ? 'Enviando...' : 'Enviar link de alteração'}</button>
              </div>
              {passwordResetFeedback && <p role="status" aria-live="polite" className="mt-4 text-sm text-white/80">{passwordResetFeedback}</p>}
            </div>
          </div>
        </section>
      )}
      {activeProfileSection === 'seguranca' && (
        <section id="profile-panel-seguranca" role="tabpanel" aria-labelledby="profile-tab-seguranca" className="overflow-hidden rounded-3xl border border-white/10 bg-[#191b20] text-white shadow-2xl">
          <div className="grid lg:grid-cols-[42%_58%]">
            <aside className="bg-gradient-to-br from-[#15332d] via-[#10201e] to-[#11131a] p-7 sm:p-10">
              <div className="mb-7 h-1 w-14 rounded-full bg-[#D9F22A]" />
              <h2 className="max-w-xs text-2xl font-bold leading-snug">Mais segurança <span className="text-[#D9F22A]">para sua conta</span></h2>
              <p className="mt-4 text-sm leading-6 text-white/65">Proteja seus dados com verificação de e-mail e autenticação multifator quando disponível para a sua conta.</p>
            </aside>
            <div className="p-6 sm:p-9">
              <h2 className="text-xl font-bold">Autenticação de dois fatores (2FA)</h2>
              <p className="mt-2 text-sm text-white/60">Confira e configure os fatores efetivamente suportados pela sua conta.</p>
              <div className="mt-5"><AccountSecurityPanel /></div>
              <div className="mt-4 rounded-xl border border-white/10 p-4">
                <p className="text-sm font-semibold">Status da conta</p>
                <p className="mt-2 break-all text-sm text-white/60">{auth.currentUser?.email || 'Sessão não identificada'}</p>
                <p className="mt-2 text-xs text-white/50">Dados cadastrais: {isLocked ? 'edição protegida' : 'edição permitida'} · Recebimentos: {stripeStatus === 'connected' ? 'conectados' : stripeStatus === 'loading' ? 'verificando' : 'pendentes'}</p>
              </div>
            </div>
          </div>
        </section>
      )}
      {activeProfileSection === 'planos' && (
        <section id="profile-panel-planos" role="tabpanel" aria-labelledby="profile-tab-planos" className="space-y-4 text-white">
          <div className="rounded-2xl border border-white/10 bg-[#191b20] p-6">
            <h2 className="text-lg font-bold">Planos</h2>
            <p className="mt-2 text-sm text-white/55">Consulte os planos e condições contratadas com a LeadsPay. Não há informações de assinatura disponíveis nesta área.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#191b20] p-6">
            <h2 className="text-lg font-bold">Taxas e prazos</h2>
            <p className="mt-2 text-sm text-white/55">Valores informados para a plataforma; encargos do processador, prazos e condições podem variar conforme a operação.</p>
            <div className="mt-6 divide-y divide-white/10">
              <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-center gap-3 py-5 sm:grid-cols-[1fr_1fr_auto]"><div className="flex items-center gap-3"><CreditCard className="h-5 w-5 text-[#D9F22A]" /><strong className="text-sm">Checkout LeadsPay</strong></div><span className="text-sm text-white/75">R$ 0,99 por checkout</span><span className="text-xs text-white/45">Taxa da plataforma</span></div>
              <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-center gap-3 py-5 sm:grid-cols-[1fr_1fr_auto]"><div className="flex items-center gap-3"><Wallet className="h-5 w-5 text-[#D9F22A]" /><strong className="text-sm">Solicitação de saque</strong></div><span className="text-sm text-white/75">R$ 2,00</span><span className="text-xs text-white/45">Sujeito a saldo e liberação</span></div>
              {['Pix', 'Cartão de crédito', 'Boleto'].map(method => <div key={method} className="grid grid-cols-2 items-center gap-3 py-5"><strong className="text-sm">{method}</strong><span className="text-right text-xs text-white/55">Consulte as condições aplicáveis no checkout e no processador de pagamentos</span></div>)}
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#191b20] p-6">
            <h3 className="text-base font-bold">Simular taxas da plataforma</h3>
            <p className="mt-2 text-sm text-white/55">Simulação ilustrativa somente da tarifa fixa de checkout, sem incluir taxas do processador ou tributos.</p>
            <label className="mt-4 block text-xs font-semibold text-white/70" htmlFor="profile-fee-simulator">Valor da venda (R$)</label>
            <input id="profile-fee-simulator" type="number" min="0" step="0.01" value={feeSimulation} onChange={e => setFeeSimulation(e.target.value)} className="mt-2 w-full max-w-sm rounded-xl border border-white/20 bg-[#0b1422] p-3 text-white" />
            <p className="mt-4 text-sm">Valor após a tarifa fixa: <strong className="text-[#D9F22A]">{Number.isFinite(Number(feeSimulation)) && Number(feeSimulation) > 0 ? Math.max(0, Number(feeSimulation) - 0.99).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00'}</strong></p>
          </div>
        </section>
      )}
      {activeProfileSection === 'notificacoes' && (
        <section id="profile-panel-notificacoes" role="tabpanel" aria-labelledby="profile-tab-notificacoes">
          <NotificationPreferencesPanel userProfile={userProfile} onSaveProfile={onSaveProfile} />
        </section>
      )}
      <div id="profile-panel-geral" role="tabpanel" aria-labelledby="profile-tab-geral" className={activeProfileSection === 'geral' ? '' : 'hidden'}>

      {/* Toast feedback */}
      {toastMessage && (
        <div 
          className={`fixed top-20 right-6 z-50 p-4 rounded-2xl border shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4 duration-300 max-w-md ${
            toastMessage.type === 'success'
              ? 'bg-[#0a2318] border-emerald-500/50 text-emerald-300 shadow-[0_0_30px_rgba(16,185,129,0.2)]'
              : 'bg-[#260c12] border-rose-500/50 text-rose-300 shadow-[0_0_30px_rgba(244,63,94,0.2)]'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
          )}
          <span className="text-xs font-bold leading-relaxed">{toastMessage.text}</span>
        </div>
      )}

      {/* ================= HEADER BREADCRUMB ================= */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#D9F22A] mb-1">
          {roleMode === 'empresa' ? (
            <>
              <Building2 className="w-3.5 h-3.5" />
              Área Exclusiva da Empresa & Produtor
            </>
          ) : (
            <>
              <ShieldCheck className="w-3.5 h-3.5" />
              Área de Verificação Cadastral de Afiliado
            </>
          )}
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white font-['Syne']">
          {roleMode === 'empresa' 
            ? 'Meu Perfil' 
            : 'Meu Perfil'}
        </h1>
        <p className="text-xs text-white/60 mt-1 max-w-2xl">
          {roleMode === 'empresa'
            ? 'Gerencie seus dados cadastrais, a situação da empresa e as configurações da sua conta em um só lugar.'
            : 'Mantenha seus dados pessoais e de recebimento atualizados para garantir a homologação de sua conta e saques via PIX instantâneos.'}
        </p>
      </div>

      {roleMode === 'empresa' && !isApproved && (
        <div className="mb-6 rounded-[28px] border border-white/10 bg-gradient-to-br from-[#0d1626] via-[#09111d] to-[#070c14] p-4 sm:p-5 shadow-2xl">
          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#D9F22A]">Ativação da empresa</div>
              <h2 className="mt-1 text-lg font-black text-white">Tudo em uma ordem simples e segura</h2>
            </div>
            <p className="max-w-md text-[11px] leading-5 text-white/40">
              Cada etapa libera a próxima. Depois da aprovação, dados financeiros e cadastrais ficam protegidos.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { n: 1, title: 'Validar Stripe', done: stripeReady, active: !stripeReady },
              { n: 2, title: 'Completar perfil', done: isPending || isApproved, active: stripeReady && !isPending && !isApproved },
              { n: 3, title: 'Análise admin', done: isApproved, active: isPending },
              { n: 4, title: 'Empresa ativa', done: isApproved && stripeReady, active: false },
            ].map((step) => (
              <div
                key={step.n}
                className={'flex items-center gap-3 rounded-2xl border px-3.5 py-3.5 transition ' + (
                  step.done
                    ? 'border-emerald-500/25 bg-emerald-500/[0.07]'
                    : step.active
                      ? 'border-[#D9F22A]/35 bg-[#D9F22A]/[0.07]'
                      : 'border-white/10 bg-white/[0.025]'
                )}
              >
                <div className={'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-black ' + (
                  step.done
                    ? 'bg-emerald-500 text-[#04110b]'
                    : step.active
                      ? 'bg-[#D9F22A] text-[#07100A]'
                      : 'bg-white/10 text-white/35'
                )}>
                  {step.done ? <Check className="h-4 w-4 stroke-[3]" /> : step.n}
                </div>
                <div className="min-w-0">
                  <div className="text-[9px] font-black uppercase tracking-[0.15em] text-white/35">Etapa {step.n}</div>
                  <div className={'truncate text-xs font-black ' + (
                    step.done ? 'text-emerald-300' : step.active ? 'text-white' : 'text-white/45'
                  )}>
                    {step.title}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= STATUS BANNER ================= */}
      <div className="mb-6">
        {isApproved ? (
          /* APPROVED / VERIFIED BANNER */
          <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/70 via-[#0a261a] to-emerald-950/70 border border-emerald-500/40 shadow-[0_0_30px_rgba(16,185,129,0.15)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 flex-shrink-0 shadow-lg">
                <ShieldCheck className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-black text-white font-['Syne']">
                    {roleMode === 'empresa'
                      ? 'Empresa Verificada e Aprovada Oficialmente!'
                      : 'Conta Verificada e Aprovada Oficialmente!'}
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500 text-black flex items-center gap-1 shadow-sm">
                    <Check className="w-3 h-3 stroke-[3]" />
                    Selo Verificado
                  </span>
                </div>
                <p className="text-xs text-emerald-200/80 mt-1 leading-relaxed">
                  {roleMode === 'empresa'
                    ? 'Sua empresa foi homologada e aprovada pela Administração. O cadastro de produtos, checkout e comissões para afiliados está 100% liberado!'
                    : 'Seus dados foram validados pelo Administrador. Você agora tem acesso total e ilimitado para afiliar-se a qualquer produto no Marketplace!'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {(roleMode === 'empresa' || roleMode === 'afiliado') && !profileEditUnlocked && (
                <button
                  type="button"
                  onClick={() => setShowEditRequest(true)}
                  disabled={profileEditRequestStatus === 'pending'}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-black text-white/80 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Edit3 className="h-4 w-4" />
                  {profileEditRequestStatus === 'pending' ? 'Ajuste solicitado' : 'Solicitar ajuste'}
                </button>
              )}
              {(roleMode === 'empresa' || roleMode === 'afiliado') && profileEditUnlocked && (
                <span className="inline-flex items-center gap-2 rounded-xl border border-[#D9F22A]/30 bg-[#D9F22A]/10 px-4 py-2.5 text-xs font-black text-[#D9F22A]">
                  <Edit3 className="h-4 w-4" />
                  Edição liberada pelo admin
                </span>
              )}
              {onNavigateToTab && (
                <button
                  type="button"
                  onClick={() => onNavigateToTab(roleMode === 'empresa' ? 'minha_empresa' : 'vitrine')}
                  className="bg-[#D9F22A] hover:bg-[#c8e217] text-[#060A15] font-black px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider shadow-lg transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap flex-shrink-0"
                >
                  {roleMode === 'empresa' ? (
                    <>
                      <Plus className="w-4 h-4 stroke-[3]" />
                      Cadastrar Produto
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 fill-current" />
                      Explorar Marketplace
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        ) : isPending ? (
          /* PENDING VALIDATION BANNER (LOCKED) */
          <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-950/70 via-[#261c0a] to-amber-950/70 border border-amber-500/40 shadow-[0_0_30px_rgba(245,158,11,0.15)] flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 flex-shrink-0 shadow-lg animate-pulse">
              <Clock className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-black text-white font-['Syne']">
                  {roleMode === 'empresa' 
                    ? 'Perfil da Empresa em Análise Administrativa (Trancado)' 
                    : 'Perfil em Análise Administrativa (Trancado)'}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" />
                  Aguardando Aprovação
                </span>
              </div>
              <p className="text-xs text-amber-200/80 mt-1 leading-relaxed">
                {roleMode === 'empresa'
                  ? 'Os dados e documentos da sua empresa foram enviados e estão bloqueados para edição enquanto o Administrador audita o cadastro. Assim que for aprovada, o cadastro de produtos será liberado imediatamente.'
                  : 'Seus dados foram enviados com sucesso e estão bloqueados para edição enquanto a equipe administrativa faz a validação dos documentos. Assim que for aprovado, seu selo de Verificado será concedido automaticamente.'}
              </p>
            </div>
          </div>
        ) : isRejected ? (
          /* REJECTED BANNER */
          <div className="p-5 rounded-2xl bg-gradient-to-r from-rose-950/70 via-[#260c12] to-rose-950/70 border border-rose-500/40 shadow-[0_0_30px_rgba(244,63,94,0.15)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 flex-shrink-0 shadow-lg">
                <XCircle className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-black text-white font-['Syne']">
                    {roleMode === 'empresa' 
                      ? 'Validação da Empresa Recusada pelo Administrador' 
                      : 'Validação Recusada pelo Administrador'}
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/40">
                    Ajuste Necessário
                  </span>
                </div>
                <p className="text-xs text-rose-200/80 mt-1 leading-relaxed">
                  Motivo: {userProfile.verificationRejectionReason || 'Dados cadastrais inconsistentes ou incompletos. Por favor revise as informações e envie novamente.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsEditingRejected(true)}
              className="bg-rose-500 hover:bg-rose-600 text-white font-bold px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider shadow-lg transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap flex-shrink-0"
            >
              <RefreshCw className="w-4 h-4" />
              Corrigir e Reenviar
            </button>
          </div>
        ) : (
          /* UNSUBMITTED ONBOARDING BANNER */
          <div className="p-5 rounded-2xl bg-gradient-to-r from-[#0b162c] via-[#0e1d3a] to-[#0b162c] border border-[#D9F22A]/30 shadow-lg flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#D9F22A]/10 border border-[#D9F22A]/30 flex items-center justify-center text-[#D9F22A] flex-shrink-0 shadow-md">
              <FileCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-black text-white font-['Syne']">
                  {roleMode === 'empresa'
                    ? (stripeReady ? 'Complete o Perfil da Empresa na LeadsPay' : 'Primeiro, conclua sua validação na Stripe')
                    : (stripeReady ? 'Complete seu Perfil de Afiliado na LeadsPay' : 'Primeiro, conclua sua validação na Stripe')}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#D9F22A]/20 text-[#D9F22A] border border-[#D9F22A]/30">
                  {roleMode === 'empresa' ? 'Obrigatório para Cadastrar Produtos' : 'Etapa Obrigatória'}
                </span>
              </div>
              <p className="text-xs text-white/70 mt-1 leading-relaxed">
                {roleMode === 'empresa'
                  ? (stripeReady
                    ? 'Sua Stripe já está pronta. Agora complete os dados da empresa e envie para análise da administração.'
                    : 'O formulário da LeadsPay ficará bloqueado até a Stripe confirmar sua conta. Conclua a etapa financeira primeiro.')
                  : (stripeReady
                    ? 'Sua Stripe já está pronta. Agora complete Nome, Sobrenome, E-mail, CPF, Celular e Endereço e envie para análise da administração.'
                    : 'O perfil do afiliado ficará bloqueado até a Stripe confirmar seus dados de recebimento. Conclua a etapa financeira primeiro.')}
              </p>
            </div>
          </div>
        )}
      </div>

      {roleMode === 'empresa' && (
        <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#0A1220] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-bold text-white">Minha Vitrine</h2>
            <p className="mt-1 text-xs text-white/50">Foto, capa e descrição pública ficam na área da sua empresa.</p>
          </div>
          <button type="button" onClick={() => onNavigateToTab?.('minha_empresa')} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#D9F22A] px-4 py-2.5 text-xs font-bold text-[#061014]">
            Personalizar minha vitrine <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}
      <div className="mb-6 rounded-2xl border border-white/10 bg-[#0A1220] p-4">
        <button type="button" aria-expanded={showSecuritySettings} onClick={() => setShowSecuritySettings(value => !value)} className="flex w-full items-center justify-between gap-3 text-left">
          <span><span className="block text-sm font-bold text-white">Segurança da conta</span><span className="mt-1 block text-xs text-white/50">Senha, sessões e proteção do acesso</span></span>
          <span className="text-xs font-bold text-[#D9F22A]">{showSecuritySettings ? 'Ocultar' : 'Gerenciar'}</span>
        </button>
        {showSecuritySettings && <div className="mt-4"><AccountSecurityPanel /></div>}
      </div>

      {(roleMode === 'empresa' || roleMode === 'afiliado') && (
        <div className="mb-6">
          <button type="button" aria-expanded={showFinancialDetails || !stripeReady} onClick={() => setShowFinancialDetails(value => !value)} className="mb-3 flex w-full items-center justify-between rounded-2xl border border-white/10 bg-[#0A1220] p-4 text-left">
            <span><span className="block text-sm font-bold text-white">Conta de recebimentos</span><span className="mt-1 block text-xs text-white/50">{stripeReady ? 'Conectada • configurações financeiras' : 'Configuração financeira necessária'}</span></span>
            <span className="text-xs font-bold text-[#D9F22A]">{showFinancialDetails || !stripeReady ? 'Ocultar detalhes' : 'Ver detalhes'}</span>
          </button>
          <div className={showFinancialDetails || !stripeReady ? '' : 'hidden'}>
          <StripeConnectCompanyPanel
            companyId={roleMode === 'empresa' ? (company?.id || userProfile.companyId) : undefined}
            role={roleMode}
            onboardingMode={!isApproved}
            onStatusChange={setStripeStatus}
          />
          </div>
        </div>
      )}

      {(roleMode === 'empresa' || roleMode === 'afiliado') && !stripeReady ? (
        <div className="rounded-[28px] border border-white/10 bg-[#09111e] p-8 sm:p-10 text-center shadow-xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/35">
            <Lock className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-lg font-black text-white">Perfil LeadsPay bloqueado por enquanto</h3>
          <p className="mx-auto mt-2 max-w-xl text-xs leading-6 text-white/50">
            {roleMode === 'empresa'
              ? 'Conclua a verificação da Stripe acima. Assim que a conta estiver pronta, os dados da empresa serão liberados automaticamente.'
              : 'Conclua a verificação da Stripe acima. Assim que a conta estiver pronta, seus dados de afiliado serão liberados automaticamente.'}
          </p>
          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-[#D9F22A]/20 bg-[#D9F22A]/5 px-4 py-2 text-[11px] font-bold text-[#D9F22A]">
            Stripe primeiro
            <ArrowRight className="h-3.5 w-3.5" />
            Perfil LeadsPay depois
          </div>
        </div>
      ) : (
      <>
      <section className="mb-6 rounded-3xl border border-white/10 bg-[#0b1423] p-5 shadow-xl sm:p-7 profile-identity-section">
        <p className="text-xs font-bold uppercase tracking-widest text-[#D9F22A]">Dados cadastrais</p>
        <h2 className="mt-2 text-xl font-bold text-white">Informações gerais</h2>
        <p className="mt-2 text-sm text-white/60">Confira os dados do titular, da marca e do endereço antes de solicitar a verificação.</p>
        {roleMode === 'empresa' && (
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button type="button" disabled={isLocked} onClick={() => setCompanyDocType('CPF')} aria-pressed={companyDocType === 'CPF'} className={`rounded-2xl border p-4 text-left transition ${companyDocType === 'CPF' ? 'border-[#D9F22A] bg-[#D9F22A]/10' : 'border-white/10 bg-white/5 hover:border-white/30'} disabled:cursor-not-allowed disabled:opacity-50`}>
              <span className="flex items-center gap-2 text-sm font-bold text-white"><User className="h-4 w-4" /> Pessoa física</span>
              <span className="mt-2 block text-xs text-white/60">CPF, nome do titular e marca pública.</span>
            </button>
            <button type="button" disabled={isLocked} onClick={() => setCompanyDocType('CNPJ')} aria-pressed={companyDocType === 'CNPJ'} className={`rounded-2xl border p-4 text-left transition ${companyDocType === 'CNPJ' ? 'border-[#D9F22A] bg-[#D9F22A]/10' : 'border-white/10 bg-white/5 hover:border-white/30'} disabled:cursor-not-allowed disabled:opacity-50`}>
              <span className="flex items-center gap-2 text-sm font-bold text-white"><Building2 className="h-4 w-4" /> Pessoa jurídica</span>
              <span className="mt-2 block text-xs text-white/60">CNPJ, dados da empresa e responsável legal.</span>
            </button>
          </div>
        )}
      </section>
      <form onSubmit={handleSubmitForVerification} className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start profile-general-form">
        {/* ================= LEFT CARD: USER PHOTO / LOGO ================= */}
        <div className="lg:col-span-12 bg-[#0f1929] border border-white/10 rounded-[24px] p-5 sm:p-7 flex flex-col sm:flex-row items-center justify-start text-center sm:text-left gap-6 shadow-lg relative profile-brand-card">
          {/* Lock overlay if in analysis or approved */}
          {isLocked && !canEditBranding && (
            <div className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/70 border border-white/10 text-[10px] font-bold text-white/70">
              <Lock className="w-3 h-3 text-amber-400" />
              Bloqueado
            </div>
          )}

          <div className="relative group w-32 h-32 sm:w-36 sm:h-36 shrink-0 rounded-2xl overflow-hidden border-2 border-white/20 bg-black/60 shadow-2xl flex items-center justify-center mb-3 sm:mb-0">
            {(roleMode === 'empresa' ? companyLogo : avatar) ? (
              <img
                src={roleMode === 'empresa' ? companyLogo : avatar}
                alt={roleMode === 'empresa' ? 'Logotipo da Empresa' : 'Foto de perfil'}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-[#070b14] text-white/40 p-4">
                {roleMode === 'empresa' ? (
                  <>
                    <Building2 className="w-16 h-16 mb-2 text-[#D9F22A]/60" />
                    <span className="text-[11px] font-bold">Sem Logotipo</span>
                  </>
                ) : (
                  <>
                    <User className="w-16 h-16 mb-2" />
                    <span className="text-[11px] font-bold">Sem Foto</span>
                  </>
                )}
              </div>
            )}

            {/* Hover overlay with upload icon (only if NOT locked) */}
            {(!isLocked || canEditBranding) && (
              <label className="absolute inset-0 bg-black/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white cursor-pointer transition-opacity duration-200">
                <Camera className="w-7 h-7 text-[#D9F22A] mb-1.5" />
                <span className="text-[11px] font-black uppercase tracking-wider text-white">
                  {roleMode === 'empresa' ? 'Alterar Logo' : 'Alterar Foto'}
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  className="hidden"
                  onChange={(e) => handleImageUpload(e, roleMode === 'empresa' ? 'companyLogo' : 'avatar')}
                  disabled={isLocked && !canEditBranding}
                />
              </label>
            )}
          </div>

          {(!isLocked || canEditBranding) ? (
            <label className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-[#D9F22A] hover:text-[#060A15] text-white text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer border border-white/15 mb-3">
              <Upload className="w-3.5 h-3.5" />
              <span>{roleMode === 'empresa' ? 'Logotipo da Empresa' : 'Escolher da Galeria'}</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="hidden"
                onChange={(e) => handleImageUpload(e, roleMode === 'empresa' ? 'companyLogo' : 'avatar')}
              />
            </label>
          ) : (
            <div className="inline-flex items-center justify-center gap-2 bg-white/5 text-white/40 text-xs font-bold px-4 py-2 rounded-xl border border-white/10 mb-3 cursor-not-allowed">
              <Lock className="w-3.5 h-3.5" />
              <span>{roleMode === 'empresa' ? 'Logo Bloqueado' : 'Foto Bloqueada'}</span>
            </div>
          )}

          {canEditBranding && companyLogo !== userProfile.companyLogo && (
            <button type="button" disabled={isSavingBranding} onClick={saveBranding} className="mb-3 rounded-xl bg-[#D9F22A] px-4 py-2 text-xs font-bold text-[#061014] disabled:opacity-50">
              {isSavingBranding ? 'Salvando...' : 'Salvar novo logotipo'}
            </button>
          )}

          <p className="text-[12px] text-white/50 leading-relaxed max-w-[240px]">
            Permitido *.jpeg, *.jpg, *.png, *.webp
            <br />
            tamanho máximo de 3.1 MB
          </p>

          {/* Quick Company Info Pill in Left Card */}
          {roleMode === 'empresa' && companyName && (
            <div className="mt-5 pt-5 border-t border-white/10 w-full text-left">
              <span className="text-[10px] uppercase font-bold text-white/40 block">Identificação</span>
              <div className="text-sm font-black text-white font-['Syne'] truncate mt-0.5">
                {companyName}
              </div>
              <div className="flex items-center gap-1.5 mt-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#D9F22A]/10 text-[#D9F22A] border border-[#D9F22A]/30">
                  {companyCategory}
                </span>
                {isApproved && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    Aprovada
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ================= RIGHT CARD: FORM FIELDS ================= */}
        <div className="lg:col-span-12 flex flex-col gap-5 profile-fields-stack">
          {/* SECTION 1: DADOS CADASTRAIS (EMPRESA OU AFILIADO) */}
          <div className="bg-[#0f1929] border border-white/10 rounded-[24px] p-5 sm:p-7 shadow-lg relative">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6 border-b border-white/10 pb-5">
              <h4 className="text-sm font-bold text-white/90 flex items-center gap-2">
                {roleMode === 'empresa' ? (
                  <>
                    <Building2 className="w-4 h-4 text-[#D9F22A]" />
                    {companyDocType === 'CPF' ? 'Dados do titular e da marca' : 'Dados da empresa e do responsável legal'}
                  </>
                ) : (
                  <>
                    <User className="w-4 h-4 text-[#D9F22A]" />
                    Dados pessoais
                  </>
                )}
              </h4>
              {isLocked && (
                <span className="text-[11px] font-bold text-amber-400/90 flex items-center gap-1.5 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                  <Lock className="w-3 h-3" />
                  Campos Trancados
                </span>
              )}
            </div>

            <div className="flex flex-col gap-4">
              {roleMode === 'empresa' ? (
                /* ================= EMPRESA FIELDS ================= */
                <>
                  {/* Razão Social / Nome da Empresa & Responsável */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="relative">
                      <label className="block text-[11px] font-medium text-white/60 mb-1.5 ml-1">
                        {companyDocType === 'CPF' ? 'Nome público da marca (exibido no checkout)' : 'Nome fantasia / marca da empresa'} <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        disabled={isLocked}
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder={companyDocType === 'CPF' ? 'Ex: Minha marca digital' : 'Ex: LeadsPay Soluções Digitais'}
                        className={`w-full bg-[#060a15] border rounded-xl px-4 py-3 text-xs text-white placeholder-white/30 transition-colors ${
                          isLocked 
                            ? 'opacity-70 cursor-not-allowed border-white/10 bg-[#040710]' 
                            : 'border-white/15 focus:outline-none focus:border-[#D9F22A]'
                        }`}
                      />
                    </div>

                    <div className="relative">
                      <label className="block text-[11px] font-medium text-white/60 mb-1.5 ml-1">
                        {companyDocType === 'CPF' ? 'Nome completo do titular' : 'Nome do responsável legal'} <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        disabled={isLocked}
                        value={companyOwnerName}
                        onChange={(e) => setCompanyOwnerName(e.target.value)}
                        placeholder="Nome completo do responsável"
                        className={`w-full bg-[#060a15] border rounded-xl px-4 py-3 text-xs text-white placeholder-white/30 transition-colors ${
                          isLocked 
                            ? 'opacity-70 cursor-not-allowed border-white/10 bg-[#040710]' 
                            : 'border-white/15 focus:outline-none focus:border-[#D9F22A]'
                        }`}
                      />
                    </div>
                  </div>

                  {/* E-mail Corporativo Oficial */}
                  <div className="relative">
                    <label className="block text-[11px] font-medium text-white/60 mb-1.5 ml-1">
                      {companyDocType === 'CPF' ? 'E-mail de contato' : 'E-mail corporativo'} <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      disabled={isLocked}
                      value={companyEmail}
                      onChange={(e) => setCompanyEmail(e.target.value)}
                      placeholder="contato@suaempresa.com"
                      className={`w-full bg-[#060a15] border rounded-xl px-4 py-3 text-xs text-white placeholder-white/30 transition-colors ${
                        isLocked 
                          ? 'opacity-70 cursor-not-allowed border-white/10 bg-[#040710]' 
                          : 'border-white/15 focus:outline-none focus:border-[#D9F22A]'
                      }`}
                    />
                  </div>

                  {/* Tipo de Documento e Número Fiscal */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-medium text-white/60 mb-1.5 ml-1">
                        Tipo de Documento Fiscal <span className="text-rose-400">*</span>
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {(['CNPJ', 'CPF'] as const).map((type) => (
                          <button
                            key={type}
                            type="button"
                            disabled={isLocked}
                            onClick={() => {
                              setCompanyDocType(type);
                              setCompanyCnpj('');
                            }}
                            className={`py-2.5 px-2 rounded-xl text-[11px] font-bold border transition-all cursor-pointer text-center ${
                              companyDocType === type
                                ? 'bg-[#D9F22A] text-[#060A15] border-[#D9F22A]'
                                : isLocked
                                  ? 'opacity-50 cursor-not-allowed bg-black/40 border-white/10 text-white/40'
                                  : 'bg-[#060a15] text-white/70 hover:text-white border-white/10 hover:border-white/20'
                            }`}
                          >
                            {type === 'CNPJ' ? 'Pessoa jurídica (CNPJ)' : 'Pessoa física (CPF)'}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="relative">
                      <label className="block text-[11px] font-medium text-white/60 mb-1.5 ml-1">
                        {companyDocType === 'CNPJ' 
                          ? 'CNPJ da Empresa' 
                          : 'CPF do Titular'}{' '}
                        <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        disabled={isLocked}
                        maxLength={companyDocType === 'CNPJ' ? 18 : 14}
                        value={companyCnpj}
                        onChange={(e) => {
                          if (companyDocType === 'CNPJ') {
                            setCompanyCnpj(formatCNPJ(e.target.value));
                          } else {
                            setCompanyCnpj(formatCPF(e.target.value));
                          }
                        }}
                        placeholder={companyDocType === 'CNPJ' ? '00.000.000/0000-00' : '000.000.000-00'}
                        className={`w-full bg-[#060a15] border rounded-xl px-4 py-3 text-xs text-white placeholder-white/30 transition-colors ${
                          isLocked 
                            ? 'opacity-70 cursor-not-allowed border-white/10 bg-[#040710]' 
                            : 'border-white/15 focus:outline-none focus:border-[#D9F22A]'
                        }`}
                      />
                    </div>
                  </div>

                  {/* WhatsApp Comercial e Categoria da Empresa */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="relative">
                      <label className="block text-[11px] font-medium text-white/60 mb-1.5 ml-1">
                        WhatsApp Comercial / Atendimento <span className="text-rose-400">*</span>
                      </label>
                      <div className="relative flex items-center">
                        <div className="absolute left-3 flex items-center gap-1 text-xs text-white/70 font-semibold pointer-events-none">
                          <span>🇧🇷</span>
                          <span>+55</span>
                          <span className="w-px h-3.5 bg-white/20 mx-1" />
                        </div>
                        <input
                          type="text"
                          maxLength={15}
                          required
                          disabled={isLocked}
                          value={companyPhone}
                          onChange={(e) => setCompanyPhone(formatPhone(e.target.value))}
                          placeholder="(11) 99999-9999"
                          className={`w-full bg-[#060a15] border rounded-xl pl-20 pr-10 py-3 text-xs text-white placeholder-white/30 transition-colors ${
                            isLocked 
                              ? 'opacity-70 cursor-not-allowed border-white/10 bg-[#040710]' 
                              : 'border-white/15 focus:outline-none focus:border-[#D9F22A]'
                          }`}
                        />
                        <div className="absolute right-3 text-emerald-400">
                          <MessageCircle className="w-4 h-4 fill-emerald-400/20" />
                        </div>
                      </div>
                    </div>

                    <div className="relative">
                      <label className="block text-[11px] font-medium text-white/60 mb-1.5 ml-1">
                        Categoria da Empresa / Solução <span className="text-rose-400">*</span>
                      </label>
                      <select
                        disabled={isLocked}
                        value={companyCategory}
                        onChange={(e) => setCompanyCategory(e.target.value)}
                        className={`w-full bg-[#060a15] border rounded-xl px-4 py-3 text-xs text-white transition-colors ${
                          isLocked 
                            ? 'opacity-70 cursor-not-allowed border-white/10 bg-[#040710]' 
                            : 'border-white/15 focus:outline-none focus:border-[#D9F22A]'
                        }`}
                      >
                        <option value="SaaS / B2B">SaaS / B2B & Software Corporativo</option>
                        <option value="IA & Automação">Inteligência Artificial & Automação</option>
                        <option value="Fintech & Pagamentos">FinTech, Pagamentos & Banking</option>
                        <option value="Marketing & Vendas">Marketing, Tráfego & Vendas</option>
                        <option value="E-commerce / Dropship">E-commerce, Lojas & Dropship</option>
                        <option value="Educação / Cursos">EdTech, Cursos & Treinamentos</option>
                        <option value="iGaming & Apostas">iGaming & Entretenimento</option>
                        <option value="Outro">Outro Ramo de Atividade</option>
                      </select>
                    </div>
                  </div>

                  {/* Tagline / Slogan e Website Oficial */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="relative">
                      <label className="block text-[11px] font-medium text-white/60 mb-1.5 ml-1">
                        Slogan / Tagline Resumida
                      </label>
                      <input
                        type="text"
                        disabled={isLocked}
                        value={companyTagline}
                        onChange={(e) => setCompanyTagline(e.target.value)}
                        placeholder="Ex: Plataforma líder em automação de vendas"
                        className={`w-full bg-[#060a15] border rounded-xl px-4 py-3 text-xs text-white placeholder-white/30 transition-colors ${
                          isLocked 
                            ? 'opacity-70 cursor-not-allowed border-white/10 bg-[#040710]' 
                            : 'border-white/15 focus:outline-none focus:border-[#D9F22A]'
                        }`}
                      />
                    </div>

                    <div className="relative">
                      <label className="block text-[11px] font-medium text-white/60 mb-1.5 ml-1">
                        Website Oficial / Domínio
                      </label>
                      <input
                        type="text"
                        disabled={isLocked}
                        value={companyWebsite}
                        onChange={(e) => setCompanyWebsite(e.target.value)}
                        placeholder="https://minhaempresa.com"
                        className={`w-full bg-[#060a15] border rounded-xl px-4 py-3 text-xs text-white placeholder-white/30 transition-colors ${
                          isLocked 
                            ? 'opacity-70 cursor-not-allowed border-white/10 bg-[#040710]' 
                            : 'border-white/15 focus:outline-none focus:border-[#D9F22A]'
                        }`}
                      />
                    </div>
                  </div>
                </>
              ) : (
                /* ================= AFILIADO FIELDS ================= */
                <>
                  {/* Row: Nome e Sobrenome */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="relative">
                      <label className="block text-[11px] font-medium text-white/60 mb-1.5 ml-1">
                        Nome <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        disabled={isLocked}
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="Seu primeiro nome"
                        className={`w-full bg-[#060a15] border rounded-xl px-4 py-3 text-xs text-white placeholder-white/30 transition-colors ${
                          isLocked 
                            ? 'opacity-70 cursor-not-allowed border-white/10 bg-[#040710]' 
                            : 'border-white/15 focus:outline-none focus:border-[#D9F22A]'
                        }`}
                      />
                    </div>

                    <div className="relative">
                      <label className="block text-[11px] font-medium text-white/60 mb-1.5 ml-1">
                        Sobrenome <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        disabled={isLocked}
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Seu sobrenome completo"
                        className={`w-full bg-[#060a15] border rounded-xl px-4 py-3 text-xs text-white placeholder-white/30 transition-colors ${
                          isLocked 
                            ? 'opacity-70 cursor-not-allowed border-white/10 bg-[#040710]' 
                            : 'border-white/15 focus:outline-none focus:border-[#D9F22A]'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Row: E-mail */}
                  <div className="relative">
                    <label className="block text-[11px] font-medium text-white/60 mb-1.5 ml-1">
                      E-mail <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      disabled={isLocked}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="exemplo@gmail.com"
                      className={`w-full bg-[#060a15] border rounded-xl px-4 py-3 text-xs text-white placeholder-white/30 transition-colors ${
                        isLocked 
                          ? 'opacity-70 cursor-not-allowed border-white/10 bg-[#040710]' 
                          : 'border-white/15 focus:outline-none focus:border-[#D9F22A]'
                      }`}
                    />
                  </div>

                  {/* Row: CPF e Celular com WhatsApp */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="relative">
                      <label className="block text-[11px] font-medium text-white/60 mb-1.5 ml-1">
                        CPF <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        maxLength={14}
                        required
                        disabled={isLocked}
                        value={cpf}
                        onChange={(e) => setCpf(formatCPF(e.target.value))}
                        placeholder="000.000.000-00"
                        className={`w-full bg-[#060a15] border rounded-xl px-4 py-3 text-xs text-white placeholder-white/30 transition-colors ${
                          isLocked 
                            ? 'opacity-70 cursor-not-allowed border-white/10 bg-[#040710]' 
                            : 'border-white/15 focus:outline-none focus:border-[#D9F22A]'
                        }`}
                      />
                    </div>

                    <div className="relative">
                      <label className="block text-[11px] font-medium text-white/60 mb-1.5 ml-1">
                        Celular <span className="text-rose-400">*</span>
                      </label>
                      <div className="relative flex items-center">
                        <div className="absolute left-3 flex items-center gap-1 text-xs text-white/70 font-semibold pointer-events-none">
                          <span>🇧🇷</span>
                          <span>+55</span>
                          <span className="w-px h-3.5 bg-white/20 mx-1" />
                        </div>
                        <input
                          type="text"
                          maxLength={15}
                          required
                          disabled={isLocked}
                          value={celular}
                          onChange={(e) => setCelular(formatPhone(e.target.value))}
                          placeholder="(11) 99999-9999"
                          className={`w-full bg-[#060a15] border rounded-xl pl-20 pr-10 py-3 text-xs text-white placeholder-white/30 transition-colors ${
                            isLocked 
                              ? 'opacity-70 cursor-not-allowed border-white/10 bg-[#040710]' 
                              : 'border-white/15 focus:outline-none focus:border-[#D9F22A]'
                          }`}
                        />
                        <div className="absolute right-3 text-emerald-400">
                          <MessageCircle className="w-4 h-4 fill-emerald-400/20" />
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* SECTION 2: ENDEREÇO DA SEDE / PESSOAL */}
          <div className="bg-[#0a1222]/90 border border-white/10 rounded-3xl p-6 sm:p-7 shadow-xl backdrop-blur-md relative">
            <div className="flex items-center justify-between mb-5">
              <h4 className="text-sm font-bold text-white/90 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#D9F22A]" />
                {roleMode === 'empresa' ? 'Endereço da Sede & Operação' : 'Endereço'}
              </h4>
              {isLocked && (
                <span className="text-[11px] font-bold text-amber-400/90 flex items-center gap-1.5 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                  <Lock className="w-3 h-3" />
                  Campos Trancados
                </span>
              )}
            </div>

            <div className="flex flex-col gap-4">
              {/* Row: CEP & País */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="relative">
                  <label className="block text-[11px] font-medium text-white/60 mb-1.5 ml-1">
                    CEP <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    maxLength={9}
                    required
                    disabled={isLocked}
                    value={cep}
                    onChange={(e) => handleCepChange(e.target.value)}
                    placeholder="00000-000"
                    className={`w-full bg-[#060a15] border rounded-xl px-4 py-3 text-xs text-white placeholder-white/30 transition-colors ${
                      isLocked 
                        ? 'opacity-70 cursor-not-allowed border-white/10 bg-[#040710]' 
                        : cepError 
                          ? 'border-rose-500 text-rose-200 focus:border-rose-400' 
                          : 'border-white/15 focus:outline-none focus:border-[#D9F22A]'
                    }`}
                  />
                  {cepError && (
                    <span className="block text-[11px] text-rose-500 mt-1 ml-1 animate-in fade-in duration-150">
                      CEP não encontrado
                    </span>
                  )}
                  {isSearchingCep && (
                    <span className="block text-[11px] text-[#D9F22A] mt-1 ml-1">
                      Buscando endereço...
                    </span>
                  )}
                </div>

                <div className="relative">
                  <label className="block text-[11px] font-medium text-white/60 mb-1.5 ml-1">
                    País <span className="text-rose-400">*</span>
                  </label>
                  <select
                    disabled={isLocked}
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className={`w-full bg-[#060a15] border rounded-xl px-4 py-3 text-xs text-white transition-colors ${
                      isLocked 
                        ? 'opacity-70 cursor-not-allowed border-white/10 bg-[#040710]' 
                        : 'border-white/15 focus:outline-none focus:border-[#D9F22A]'
                    }`}
                  >
                    <option value="Brazil">Brazil</option>
                    <option value="Portugal">Portugal</option>
                    <option value="United States">United States</option>
                    <option value="Spain">Spain</option>
                    <option value="Other">Outro</option>
                  </select>
                </div>
              </div>

              {/* Row: Estado & Cidade */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="relative">
                  <label className="block text-[11px] font-medium text-white/60 mb-1.5 ml-1">
                    Estado (UF) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    disabled={isLocked}
                    value={estado}
                    onChange={(e) => setEstado(e.target.value)}
                    placeholder="Ex: SP"
                    className={`w-full bg-[#060a15] border rounded-xl px-4 py-3 text-xs text-white placeholder-white/30 transition-colors ${
                      isLocked 
                        ? 'opacity-70 cursor-not-allowed border-white/10 bg-[#040710]' 
                        : 'border-white/15 focus:outline-none focus:border-[#D9F22A]'
                    }`}
                  />
                </div>

                <div className="relative">
                  <label className="block text-[11px] font-medium text-white/60 mb-1.5 ml-1">
                    Cidade <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    disabled={isLocked}
                    value={cidade}
                    onChange={(e) => setCidade(e.target.value)}
                    placeholder="Ex: São Paulo"
                    className={`w-full bg-[#060a15] border rounded-xl px-4 py-3 text-xs text-white placeholder-white/30 transition-colors ${
                      isLocked 
                        ? 'opacity-70 cursor-not-allowed border-white/10 bg-[#040710]' 
                        : 'border-white/15 focus:outline-none focus:border-[#D9F22A]'
                    }`}
                  />
                </div>
              </div>

              {/* Row: Endereço completo */}
              <div className="relative">
                <label className="block text-[11px] font-medium text-white/60 mb-1.5 ml-1">
                  {roleMode === 'empresa' ? 'Endereço da Sede Completo' : 'Endereço'}{' '}
                  <span className="text-rose-400">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  disabled={isLocked}
                  value={endereco}
                  onChange={(e) => setEndereco(e.target.value)}
                  placeholder="Rua, número, bairro e complemento"
                  className={`w-full bg-[#060a15] border rounded-xl px-4 py-3 text-xs text-white placeholder-white/30 resize-none transition-colors ${
                    isLocked 
                      ? 'opacity-70 cursor-not-allowed border-white/10 bg-[#040710]' 
                      : 'border-white/15 focus:outline-none focus:border-[#D9F22A]'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* ================= ACTIONS / SUBMISSION BUTTONS ================= */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            {!isLocked ? (
              <>
                {!(roleMode === 'empresa' && isApproved && companyEditUnlocked) && (
                  <button
                    type="button"
                    onClick={handleSaveDraft}
                    disabled={isSavingDraft || isSubmitting}
                    className="w-full sm:w-auto px-5 py-3 rounded-xl border border-white/15 hover:bg-white/5 text-white/70 hover:text-white text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isSavingDraft ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Salvar Rascunho
                  </button>
                )}

                {/* PROMINENT SUBMIT FOR VALIDATION BUTTON */}
                {isFormComplete ? (
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full sm:w-auto bg-[#D9F22A] hover:bg-[#c8e217] active:scale-95 text-[#060A15] font-black px-8 py-3.5 rounded-xl text-xs uppercase tracking-wider shadow-[0_0_30px_rgba(217,242,42,0.4)] transition-all cursor-pointer flex items-center justify-center gap-2 animate-in zoom-in-95 duration-200"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-[#060A15] border-t-transparent rounded-full animate-spin" />
                        <span>Enviando para Validação...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 fill-current" />
                        <span>
                          {roleMode === 'empresa'
                            ? (isApproved && companyEditUnlocked
                                ? 'Reenviar Alterações para Análise'
                                : 'Enviar Empresa para Validação')
                            : 'Enviar para Validação'}
                        </span>
                      </>
                    )}
                  </button>
                ) : (
                  <div className="text-[11px] text-white/50 italic flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-[#D9F22A]" />
                    Preencha todos os campos obrigatórios para liberar o envio
                  </div>
                )}
              </>
            ) : isPending ? (
              <div className="w-full p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-amber-300 text-xs font-bold">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  <span>
                    {roleMode === 'empresa'
                      ? 'Perfil da empresa em análise cadastral. Aguardando aprovação da administração.'
                      : 'Campos trancados. Validação em andamento pelo Administrador.'}
                  </span>
                </div>
              </div>
            ) : isApproved ? (
              <div className="w-full p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-emerald-300 text-xs font-bold">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>
                    {roleMode === 'empresa'
                      ? 'Empresa verificada e aprovada! Cadastro de produtos e checkout liberados.'
                      : 'Seus dados foram verificados com sucesso. Registro protegido.'}
                  </span>
                </div>
                {roleMode === 'empresa' && onNavigateToTab && (
                  <button
                    type="button"
                    onClick={() => onNavigateToTab('minha_empresa')}
                    className="text-[#D9F22A] hover:underline text-xs font-black cursor-pointer"
                  >
                    Gerenciar Produtos →
                  </button>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </form>
      </>
      )}

      </div>

      <LeadsPaySupportWidget />
    </div>
  );
};
