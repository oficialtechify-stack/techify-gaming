import React, { useState, useEffect } from 'react';
import { UserSellerProfile, CompanyStartup } from '../../types/platform';
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
  Briefcase
} from 'lucide-react';
import { formatCPF, formatCNPJ, formatPhone, isValidCPF, isValidCNPJ } from '../../services/authService';

interface MeuPerfilViewProps {
  userProfile: UserSellerProfile;
  onSaveProfile: (updates: Partial<UserSellerProfile>) => Promise<void>;
  onSubmitForVerification?: (updates: Partial<UserSellerProfile>) => Promise<void>;
  onNavigateToTab?: (tab: any) => void;
  roleMode: 'afiliado' | 'empresa';
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
  const [companyDocType, setCompanyDocType] = useState<'CNPJ' | 'CPF' | 'SEM_CNPJ'>(
    (userProfile.companyDocType as any) || company?.docType || (userProfile.companyCnpj ? 'CNPJ' : 'CNPJ')
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

  // UI & Validation States
  const [cepError, setCepError] = useState<boolean>(false);
  const [isSearchingCep, setIsSearchingCep] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSavingDraft, setIsSavingDraft] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Allow editing if rejected and user clicks to fix
  const [isEditingRejected, setIsEditingRejected] = useState<boolean>(false);

  // Determine verification status
  const verificationStatus = userProfile.verificationStatus || (userProfile.verified ? 'approved' : 'unsubmitted');
  const isPending = verificationStatus === 'pending';
  const isApproved = verificationStatus === 'approved' || userProfile.verified;
  const isRejected = verificationStatus === 'rejected';

  // Fields are locked when submitted/pending or approved (unless user explicitly clicks to fix a rejected submission)
  const isLocked = (isPending || isApproved || (isRejected && !isEditingRejected));

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

  // Image Upload Handler (Avatar or Company Logo)
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'avatar' | 'companyLogo') => {
    if (isLocked) return;
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
  const hasCompanyDoc = companyDocType === 'SEM_CNPJ' || 
    (companyDocType === 'CNPJ' ? cleanCnpjDigits.length === 14 : cleanCnpjDigits.length === 11);

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
      if (companyDocType === 'CNPJ' && cleanCnpjDigits.length > 0 && !isValidCNPJ(cleanCnpjDigits)) {
        setToastMessage({ type: 'error', text: 'CNPJ da empresa informado é inválido. Verifique os 14 dígitos.' });
        setTimeout(() => setToastMessage(null), 4500);
        return;
      } else if (companyDocType === 'CPF' && cleanCnpjDigits.length > 0 && !isValidCPF(cleanCnpjDigits)) {
        setToastMessage({ type: 'error', text: 'CPF do responsável informado é inválido. Verifique os 11 dígitos.' });
        setTimeout(() => setToastMessage(null), 4500);
        return;
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
        : companyDocType === 'CPF' 
          ? formatCPF(cleanCnpjDigits) 
          : 'SEM_CNPJ';

      const formattedCompanyPhone = formatPhone(cleanPhoneDigits);

      updates = {
        name: companyOwnerName.trim() || userProfile.name,
        companyName: companyName.trim(),
        companyLegalName: companyName.trim(),
        companyCnpj: formattedDoc,
        cleanCnpj: cleanCnpjDigits,
        companyDocType: companyDocType,
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
          companyLegalName: companyName.trim(),
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

  return (
    <div className="relative animate-in fade-in duration-200 pb-16" id="leadspay-meu-perfil-view">
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
            ? 'Perfil da Empresa & Verificação Cadastral' 
            : 'Meu Perfil & Verificação de Afiliado'}
        </h1>
        <p className="text-xs text-white/60 mt-1 max-w-2xl">
          {roleMode === 'empresa'
            ? 'Preencha os dados oficiais da sua empresa (Razão Social, Responsável, CNPJ, WhatsApp, Categoria, Slogan e Endereço). Após envio, a Administração analisará seu cadastro. Uma vez aprovada, a empresa poderá cadastrar produtos e planos livremente.'
            : 'Mantenha seus dados pessoais e de recebimento atualizados para garantir a homologação de sua conta e saques via PIX instantâneos.'}
        </p>
      </div>

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
                    ? 'Sua empresa foi homologada e aprovada pela Administração. O cadastro de novos planos, produtos, checkout e comissões para afiliados está 100% liberado!'
                    : 'Seus dados foram validados pelo Administrador. Você agora tem acesso total e ilimitado para afiliar-se a qualquer produto no Marketplace!'}
                </p>
              </div>
            </div>

            {onNavigateToTab && (
              <button
                type="button"
                onClick={() => onNavigateToTab(roleMode === 'empresa' ? 'minha_empresa' : 'vitrine')}
                className="bg-[#D9F22A] hover:bg-[#c8e217] text-[#060A15] font-black px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider shadow-lg transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap flex-shrink-0"
              >
                {roleMode === 'empresa' ? (
                  <>
                    <Plus className="w-4 h-4 stroke-[3]" />
                    Cadastrar Novo Plano / Produto
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
                  ? 'Os dados e documentos da sua empresa foram enviados e estão bloqueados para edição enquanto o Administrador audita o cadastro. Assim que for aprovada, o cadastro de planos e produtos será liberado imediatamente.'
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
                    ? 'Preencha os Dados da Empresa para Validação Cadastral'
                    : 'Preencha seus Dados para Validação da Conta'}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#D9F22A]/20 text-[#D9F22A] border border-[#D9F22A]/30">
                  {roleMode === 'empresa' ? 'Obrigatório para Cadastrar Produtos' : 'Etapa Obrigatória'}
                </span>
              </div>
              <p className="text-xs text-white/70 mt-1 leading-relaxed">
                {roleMode === 'empresa'
                  ? 'A sua empresa só pode cadastrar produtos e planos após a homologação e aprovação da Administração. Preencha todos os campos obrigatórios abaixo e clique em "Enviar Empresa para Validação".'
                  : 'Preencha todos os campos obrigatórios abaixo (Nome, Sobrenome, E-mail, CPF, Celular e Endereço). Assim que tudo estiver preenchido, clique no botão "Enviar para Validação". Após o envio, os campos serão trancados para a verificação do Administrador.'}
              </p>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmitForVerification} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ================= LEFT CARD: USER PHOTO / LOGO ================= */}
        <div className="lg:col-span-4 bg-[#0a1222]/90 border border-white/10 rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-center text-center shadow-xl backdrop-blur-md relative">
          {/* Lock overlay if in analysis or approved */}
          {isLocked && (
            <div className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/70 border border-white/10 text-[10px] font-bold text-white/70">
              <Lock className="w-3 h-3 text-amber-400" />
              Bloqueado
            </div>
          )}

          <div className="relative group w-44 h-44 rounded-2xl overflow-hidden border-2 border-white/20 bg-black/60 shadow-2xl flex items-center justify-center mb-6">
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
            {!isLocked && (
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
                  disabled={isLocked}
                />
              </label>
            )}
          </div>

          {!isLocked ? (
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
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* SECTION 1: DADOS CADASTRAIS (EMPRESA OU AFILIADO) */}
          <div className="bg-[#0a1222]/90 border border-white/10 rounded-3xl p-6 sm:p-7 shadow-xl backdrop-blur-md relative">
            <div className="flex items-center justify-between mb-5">
              <h4 className="text-sm font-bold text-white/90 flex items-center gap-2">
                {roleMode === 'empresa' ? (
                  <>
                    <Building2 className="w-4 h-4 text-[#D9F22A]" />
                    Dados da Empresa & Responsável Legal
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
                        Nome da Empresa / Startup (Razão Social ou Fantasia) <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        disabled={isLocked}
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="Ex: LeadsPay Soluções Digitais Ltda"
                        className={`w-full bg-[#060a15] border rounded-xl px-4 py-3 text-xs text-white placeholder-white/30 transition-colors ${
                          isLocked 
                            ? 'opacity-70 cursor-not-allowed border-white/10 bg-[#040710]' 
                            : 'border-white/15 focus:outline-none focus:border-[#D9F22A]'
                        }`}
                      />
                    </div>

                    <div className="relative">
                      <label className="block text-[11px] font-medium text-white/60 mb-1.5 ml-1">
                        Nome do Fundador / Responsável Legal <span className="text-rose-400">*</span>
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
                      E-mail Corporativo Oficial <span className="text-rose-400">*</span>
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
                      <div className="grid grid-cols-3 gap-2">
                        {(['CNPJ', 'CPF', 'SEM_CNPJ'] as const).map((type) => (
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
                            {type === 'CNPJ' ? 'CNPJ' : type === 'CPF' ? 'CPF / MEI' : 'Sem CNPJ'}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="relative">
                      <label className="block text-[11px] font-medium text-white/60 mb-1.5 ml-1">
                        {companyDocType === 'CNPJ' 
                          ? 'CNPJ da Empresa' 
                          : companyDocType === 'CPF' 
                            ? 'CPF do Titular' 
                            : 'Status do Documento'}{' '}
                        <span className="text-rose-400">*</span>
                      </label>
                      {companyDocType === 'SEM_CNPJ' ? (
                        <div className="w-full bg-[#060a15] border border-white/10 rounded-xl px-4 py-3 text-xs text-amber-300">
                          Empresa em fase de abertura / Cadastro via CPF do Fundador
                        </div>
                      ) : (
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
                      )}
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
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={isSavingDraft || isSubmitting}
                  className="w-full sm:w-auto px-5 py-3 rounded-xl border border-white/15 hover:bg-white/5 text-white/70 hover:text-white text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {isSavingDraft ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Salvar Rascunho
                </button>

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
                            ? 'Enviar Empresa para Validação (Trancar e Submeter)'
                            : 'Enviar para Validação (Trancar e Submeter)'}
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
                      ? 'Empresa verificada e aprovada! Cadastro de planos e checkout liberados.'
                      : 'Seus dados foram verificados com sucesso. Registro protegido.'}
                  </span>
                </div>
                {roleMode === 'empresa' && onNavigateToTab && (
                  <button
                    type="button"
                    onClick={() => onNavigateToTab('minha_empresa')}
                    className="text-[#D9F22A] hover:underline text-xs font-black cursor-pointer"
                  >
                    Gerenciar Planos →
                  </button>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </form>

      {/* Floating Chat Support Widget */}
      <a
        href="https://api.whatsapp.com/send?phone=5511999999999&text=Ol%C3%A1%2C%20preciso%20de%20ajuda%20com%20a%20valida%C3%A7%C3%A3o%20do%20meu%20perfil"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full bg-[#1b7e5a] hover:bg-[#23996f] text-white flex items-center justify-center shadow-[0_4px_25px_rgba(27,126,90,0.6)] hover:scale-110 active:scale-95 transition-all cursor-pointer group"
        title="Suporte via Chat"
      >
        <MessageCircle className="w-6 h-6 fill-current" />
      </a>
    </div>
  );
};
