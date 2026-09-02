import React, { useState } from 'react';
import { CompanyStartup, UserSellerProfile } from '../../types/platform';
import { Building2, Globe, Mail, Phone, Tag, Sparkles, X, Image as ImageIcon, AlertCircle, Upload, Check, User, FileText, CheckCircle, ShieldAlert, Send } from 'lucide-react';
import { formatCNPJ, formatCPF, formatPhone, isValidCNPJ, isValidCPF, getAuthErrorMessage } from '../../services/authService';

interface CreateCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCompanyCreated: (company: Omit<CompanyStartup, 'id' | 'createdAt'>) => void;
  userProfile?: UserSellerProfile;
}

const CATEGORIES = [
  'SaaS / B2B',
  'iGaming & Apostas',
  'Fintech & Pagamentos',
  'Marketing & Vendas',
  'IA & Automação',
  'Educação / Cursos',
  'E-commerce / Dropship'
];

export const CreateCompanyModal: React.FC<CreateCompanyModalProps> = ({
  isOpen,
  onClose,
  onCompanyCreated,
  userProfile
}) => {
  const [name, setName] = useState('');
  const [docType, setDocType] = useState<'CNPJ' | 'CPF' | 'SEM_CNPJ'>('CNPJ');
  const [cnpj, setCnpj] = useState('');
  const [cpf, setCpf] = useState('');
  const [tagline, setTagline] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [website, setWebsite] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [logo, setLogo] = useState('');
  const [commissionRange, setCommissionRange] = useState('30% a 50%');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg('Por favor, preencha o nome da empresa.');
      return;
    }

    const cleanCnpj = cnpj.replace(/\D/g, '');
    const cleanCpf = cpf.replace(/\D/g, '');

    if (docType === 'CNPJ' && cleanCnpj) {
      if (cleanCnpj.length === 14 && !isValidCNPJ(cleanCnpj)) {
        setErrorMsg('O CNPJ informado é inválido. Verifique os números digitados.');
        return;
      }
    }

    if (docType === 'CPF' && cleanCpf) {
      if (cleanCpf.length === 11 && !isValidCPF(cleanCpf)) {
        setErrorMsg('O CPF informado é inválido. Verifique os números digitados.');
        return;
      }
    }

    const defaultLogo = `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(name.trim())}`;

    onCompanyCreated({
      name: name.trim(),
      slug: name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-'),
      tagline: tagline.trim() || `${category} inovador e escalável`,
      logo: logo.trim() || defaultLogo,
      bannerImage: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=80',
      category: category as any,
      description: description.trim() || `Empresa ${name.trim()} integrada ao ecossistema Techify.`,
      website: website.trim() || 'https://suaempresa.com',
      email: email.trim() || userProfile?.email || 'contato@empresa.com',
      whatsapp: whatsapp.trim() ? formatPhone(whatsapp) : (userProfile?.phone ? formatPhone(userProfile.phone) : '+55 11 99999-9999'),
      docType: docType,
      cnpj: docType === 'CNPJ' && cleanCnpj ? formatCNPJ(cleanCnpj) : undefined,
      cleanCnpj: docType === 'CNPJ' && cleanCnpj ? cleanCnpj : undefined,
      cpf: docType === 'CPF' && cleanCpf ? formatCPF(cleanCpf) : undefined,
      cleanCpf: docType === 'CPF' && cleanCpf ? cleanCpf : undefined,
      hasNoCnpj: docType === 'SEM_CNPJ',
      totalPlansCount: 0,
      totalAffiliatesCount: 0,
      totalSalesVolume: 0,
      commissionRange: commissionRange.trim() || '30% a 50%',
      verified: false,
      status: 'pending',
      submittedAt: new Date().toISOString(),
      submittedBy: userProfile?.userId || 'usr_techify_main',
      submittedByName: userProfile?.name || 'Produtor Solicitante',
      submittedByEmail: userProfile?.email || 'contato@empresa.com'
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-[#080d1a] border border-[#D9F22A]/40 rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(217,242,42,0.15)] max-h-[90vh] overflow-y-auto no-scrollbar">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-white/50 hover:text-white transition-colors cursor-pointer w-8 h-8 rounded-full bg-white/5 flex items-center justify-center"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#D9F22A] mb-1">
          <span className="w-2 h-2 rounded-full bg-[#D9F22A] animate-ping" />
          Área de Produtores & Startups • Envio para Análise
        </div>

        <h3 className="text-xl sm:text-2xl font-black text-white font-['Syne'] mb-2">
          Cadastrar Empresa ou Startup
        </h3>
        <p className="text-xs text-white/70 mb-5 leading-relaxed">
          Preencha os dados da sua empresa. O cadastro será enviado diretamente para <strong className="text-white">análise e aprovação do Administrador</strong> para liberar seu catálogo na vitrine e o painel de produtor.
        </p>

        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-white/80 mb-1.5">
              Nome da Empresa / Startup *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: SaaS Engine AI, BetFlow"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#050811] border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#D9F22A]"
            />
          </div>

          {/* Logotipo da Empresa - Escolher da Galeria */}
          <div className="bg-[#050811]/80 border border-white/10 rounded-2xl p-3.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-white/80 mb-2">
              Logotipo da Empresa (Selecione da Galeria do Celular)
            </label>
            <div className="flex items-center gap-3">
              <div className="relative group w-14 h-14 rounded-2xl overflow-hidden border border-[#D9F22A]/50 bg-black/50 flex-shrink-0 flex items-center justify-center">
                {logo ? (
                  <img
                    src={logo}
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
                              setLogo(event.target.result as string);
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                  {logo && (
                    <button
                      type="button"
                      onClick={() => setLogo('')}
                      className="text-[11px] text-rose-400 hover:underline px-2 py-1"
                    >
                      Remover
                    </button>
                  )}
                </div>
                <span className="text-[11px] text-white/40">
                  PNG, JPG ou WEBP da sua galeria de fotos
                </span>
              </div>
            </div>
          </div>

          {/* Documento da Empresa: CNPJ, CPF ou Sem CNPJ */}
          <div className="bg-[#050811]/80 border border-white/10 rounded-2xl p-3.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-white/80 mb-2">
              Documento da Empresa / Produtor
            </label>

            {/* Seleção de Tipo de Documento */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              <button
                type="button"
                onClick={() => setDocType('CNPJ')}
                className={`text-xs py-2 px-2 rounded-xl border font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  docType === 'CNPJ'
                    ? 'border-[#D9F22A] bg-[#D9F22A]/15 text-[#D9F22A]'
                    : 'border-white/10 bg-white/5 text-white/60 hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Possuo CNPJ</span>
              </button>

              <button
                type="button"
                onClick={() => setDocType('CPF')}
                className={`text-xs py-2 px-2 rounded-xl border font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  docType === 'CPF'
                    ? 'border-[#D9F22A] bg-[#D9F22A]/15 text-[#D9F22A]'
                    : 'border-white/10 bg-white/5 text-white/60 hover:text-white'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Usar CPF</span>
              </button>

              <button
                type="button"
                onClick={() => setDocType('SEM_CNPJ')}
                className={`text-xs py-2 px-2 rounded-xl border font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  docType === 'SEM_CNPJ'
                    ? 'border-[#D9F22A] bg-[#D9F22A]/15 text-[#D9F22A]'
                    : 'border-white/10 bg-white/5 text-white/60 hover:text-white'
                }`}
              >
                <Check className="w-3.5 h-3.5" />
                <span>Sem CNPJ</span>
              </button>
            </div>

            {/* Campo condicional baseado no tipo selecionado */}
            {docType === 'CNPJ' && (
              <div className="relative animate-in fade-in duration-200">
                <FileText className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
                <input
                  type="text"
                  maxLength={18}
                  placeholder="00.000.000/0000-00"
                  value={cnpj}
                  onChange={(e) => setCnpj(formatCNPJ(e.target.value))}
                  className="w-full bg-[#050811] border border-white/15 rounded-xl pl-10 pr-3 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#D9F22A]"
                />
              </div>
            )}

            {docType === 'CPF' && (
              <div className="relative animate-in fade-in duration-200">
                <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
                <input
                  type="text"
                  maxLength={14}
                  placeholder="000.000.000-00"
                  value={cpf}
                  onChange={(e) => setCpf(formatCPF(e.target.value))}
                  className="w-full bg-[#050811] border border-white/15 rounded-xl pl-10 pr-3 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#D9F22A]"
                />
              </div>
            )}

            {docType === 'SEM_CNPJ' && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs flex items-center gap-2 animate-in fade-in duration-200">
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                <span>Sua startup poderá operar normalmente como pessoa física enquanto providencia o CNPJ.</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/80 mb-1.5">
                Setor / Categoria *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-[#050811] border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#D9F22A]"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat} className="bg-[#080d1a]">
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/80 mb-1.5">
                WhatsApp de Suporte
              </label>
              <input
                type="text"
                maxLength={15}
                placeholder="(11) 99999-9999"
                value={whatsapp}
                onChange={(e) => setWhatsapp(formatPhone(e.target.value))}
                className="w-full bg-[#050811] border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#D9F22A]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-white/80 mb-1.5">
              Slogan / Proposta de Valor
            </label>
            <input
              type="text"
              placeholder="Ex: A infraestrutura líder para operações de alta escala"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              className="w-full bg-[#050811] border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#D9F22A]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-white/80 mb-1.5">
              Descrição da Empresa & Soluções *
            </label>
            <textarea
              required
              rows={2}
              placeholder="Descreva o que a sua empresa faz, o público-alvo dos planos e por que os afiliados devem promover seus produtos..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-[#050811] border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#D9F22A] resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-white/70 mb-1">
                Website Oficial
              </label>
              <input
                type="text"
                placeholder="https://empresa.com"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="w-full bg-[#050811] border border-white/15 rounded-xl px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#D9F22A]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-white/70 mb-1">
                Faixa de Comissão Afiliados
              </label>
              <input
                type="text"
                placeholder="Ex: 30% a 50%"
                value={commissionRange}
                onChange={(e) => setCommissionRange(e.target.value)}
                className="w-full bg-[#050811] border border-white/15 rounded-xl px-3 py-2 text-xs text-[#D9F22A] font-bold placeholder-white/30 focus:outline-none focus:border-[#D9F22A]"
              />
            </div>
          </div>

          <button
            type="submit"
            className="mt-3 w-full bg-[#D9F22A] hover:bg-[#c8e217] text-[#060A15] font-black py-3.5 rounded-xl text-xs uppercase tracking-wider shadow-[0_0_25px_rgba(217,242,42,0.4)] transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" />
            Cadastrar Empresa & Enviar para Análise do Admin
          </button>
        </form>
      </div>
    </div>
  );
};
