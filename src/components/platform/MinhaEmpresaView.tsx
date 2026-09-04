import React, { useState } from 'react';
import { CompanyStartup, CompanyPlan, UserAffiliation, SaleTransaction, UserSellerProfile, ProductReview } from '../../types/platform';
import { 
  Building2, 
  Layers, 
  Users, 
  DollarSign, 
  Plus, 
  Sparkles, 
  ExternalLink, 
  Trash2, 
  Edit3, 
  Percent, 
  TrendingUp, 
  CheckCircle2,
  Share2,
  Mail,
  Phone,
  Globe,
  Tag,
  Clock,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  XCircle,
  Lock,
  ArrowRight,
  MoreVertical,
  Link2,
  MessageSquare,
  Copy,
  Check,
  Search,
  LayoutGrid,
  List,
  CreditCard,
  Eye
} from 'lucide-react';
import { PlanLinksModal } from './PlanLinksModal';
import { PlanReviewsModal } from './PlanReviewsModal';

interface MinhaEmpresaViewProps {
  companies: CompanyStartup[];
  plans: CompanyPlan[];
  affiliations: UserAffiliation[];
  sales: SaleTransaction[];
  userProfile?: UserSellerProfile;
  isCompanyVerified?: boolean;
  onNavigateToProfile?: () => void;
  onOpenCreateCompany: () => void;
  onOpenCreatePlan: (companyId?: string) => void;
  onOpenRegisterSale: (planId?: string) => void;
  onEditPlan?: (plan: CompanyPlan) => void;
  onDeleteCompany: (companyId: string) => void;
  onDeletePlan: (planId: string, companyId?: string) => void;
  onOpenCheckout?: (plan: CompanyPlan) => void;
  onDuplicatePlan?: (plan: CompanyPlan) => void;
  onAddReview?: (planId: string, review: ProductReview) => void;
}

export const MinhaEmpresaView: React.FC<MinhaEmpresaViewProps> = ({
  companies = [],
  plans = [],
  affiliations = [],
  sales = [],
  userProfile,
  isCompanyVerified,
  onNavigateToProfile,
  onOpenCreateCompany,
  onOpenCreatePlan,
  onOpenRegisterSale,
  onEditPlan,
  onDeleteCompany,
  onDeletePlan,
  onOpenCheckout,
  onDuplicatePlan,
  onAddReview
}) => {
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(companies[0]?.id || '');
  const [activeTab, setActiveTab] = useState<'planos' | 'afiliados' | 'vendas'>('planos');
  const [verificationWarningModal, setVerificationWarningModal] = useState<boolean>(false);

  // Plan Management table/search/actions state
  const [planViewMode, setPlanViewMode] = useState<'table' | 'cards'>('table');
  const [planSearch, setPlanSearch] = useState<string>('');
  const [planStatusFilter, setPlanStatusFilter] = useState<'all' | 'Ativo' | 'Pausado'>('all');
  const [activePlanDropdownId, setActivePlanDropdownId] = useState<string | null>(null);

  // Modals for Links and Reviews
  const [selectedPlanForLinks, setSelectedPlanForLinks] = useState<CompanyPlan | null>(null);
  const [selectedPlanForReviews, setSelectedPlanForReviews] = useState<CompanyPlan | null>(null);
  const [copiedToast, setCopiedToast] = useState<string | null>(null);

  const currentCompany = companies.find(c => c.id === selectedCompanyId) || companies[0];

  const companyPlans = plans.filter(p => !currentCompany || p.companyId === currentCompany.id);
  const companyAffiliations = affiliations.filter(a => !currentCompany || a.companyId === currentCompany.id);
  const companySales = sales.filter(s => !currentCompany || s.companyId === currentCompany.id || companyPlans.some(p => p.id === s.platformId));

  const filteredCompanyPlans = companyPlans.filter(p => {
    const matchesSearch = !planSearch || p.name.toLowerCase().includes(planSearch.toLowerCase()) || p.category.toLowerCase().includes(planSearch.toLowerCase());
    const matchesStatus = planStatusFilter === 'all' || (p.status || 'Ativo') === planStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalRevenue = companySales.reduce((acc, s) => acc + s.amount, 0);
  const totalCommissionsPaid = companySales.reduce((acc, s) => acc + s.commissionEarned, 0);

  // Check verification state
  const isVerified = isCompanyVerified ?? (
    userProfile?.verified === true || 
    userProfile?.verificationStatus === 'approved' ||
    currentCompany?.verified === true || 
    currentCompany?.status === 'approved'
  );

  const isPending = userProfile?.verificationStatus === 'pending' || currentCompany?.status === 'pending';
  const isRejected = userProfile?.verificationStatus === 'rejected' || currentCompany?.status === 'rejected';

  // Handler to enforce verification before creating plans/products
  const handleCreatePlanRequest = (companyId?: string) => {
    if (!isVerified) {
      setVerificationWarningModal(true);
      return;
    }
    onOpenCreatePlan(companyId || currentCompany?.id);
  };

  const handleCreateCompanyRequest = () => {
    if (!isVerified) {
      setVerificationWarningModal(true);
      return;
    }
    onOpenCreateCompany();
  };

  const handleCopyLink = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToast(id);
    setTimeout(() => setCopiedToast(null), 3000);
  };

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://leadspay.com';

  return (
    <div className="flex flex-col gap-6" id="leadspay-minha-empresa-view">
      {/* Verification Block Warning Modal */}
      {verificationWarningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#0a1222] border border-amber-500/40 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-[0_0_50px_rgba(245,158,11,0.25)] relative text-center flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mb-4 shadow-lg animate-bounce">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 mb-2">
              Verificação Obrigatória
            </span>

            <h3 className="text-xl font-black text-white font-['Syne'] mb-2">
              Verificação Administrativa Necessária
            </h3>

            <p className="text-xs text-white/70 leading-relaxed mb-6">
              A empresa <strong>só pode cadastrar produtos e planos</strong> após ser verificada e aprovada pela Administração. Preencha seus dados corporativos e documentos fiscais no Perfil da Empresa para que a equipe valide sua conta.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
              <button
                type="button"
                onClick={() => setVerificationWarningModal(false)}
                className="w-full sm:w-1/2 py-3 rounded-xl border border-white/10 hover:bg-white/5 text-white/70 hover:text-white text-xs font-bold transition-all cursor-pointer"
              >
                Voltar
              </button>

              <button
                type="button"
                onClick={() => {
                  setVerificationWarningModal(false);
                  if (onNavigateToProfile) onNavigateToProfile();
                }}
                className="w-full sm:w-1/2 bg-[#D9F22A] hover:bg-[#c8e217] text-[#060A15] font-black py-3 rounded-xl text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(217,242,42,0.4)] transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Ir para Meu Perfil</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header with quick stats & actions */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#D9F22A] mb-1">
            <Building2 className="w-3.5 h-3.5" />
            Área Exclusiva de Produtores, Startups & Empresas
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-['Syne']">
            Painel da Empresa & Gestão de Planos
          </h1>
          <p className="text-xs text-white/60 mt-1 max-w-2xl">
            Cadastre sua startup, defina os planos e soluções comercializados e configure as comissões que sua rede de afiliados receberá a cada venda.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <button
            onClick={handleCreateCompanyRequest}
            className="flex-1 md:flex-initial bg-white/10 hover:bg-white/15 text-white font-bold px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 border border-white/10"
          >
            <Building2 className="w-4 h-4 text-[#D9F22A]" />
            Nova Startup
          </button>
          <button
            onClick={() => handleCreatePlanRequest(currentCompany?.id)}
            className={`flex-1 md:flex-initial font-black px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 ${
              isVerified
                ? 'bg-[#D9F22A] hover:bg-[#c8e217] text-[#060A15] shadow-[0_0_20px_rgba(217,242,42,0.3)]'
                : 'bg-amber-500 hover:bg-amber-400 text-black shadow-[0_0_20px_rgba(245,158,11,0.3)]'
            }`}
          >
            {isVerified ? (
              <>
                <Plus className="w-4 h-4 stroke-[3]" />
                Criar Novo Plano
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                Criar Novo Plano (Verificar)
              </>
            )}
          </button>
        </div>
      </div>

      {/* ================= VERIFICATION CALLOUT BANNER ================= */}
      {!isVerified ? (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-950/70 via-[#261c0a] to-amber-950/70 border border-amber-500/40 shadow-[0_0_30px_rgba(245,158,11,0.15)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 flex-shrink-0 shadow-lg animate-pulse">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-black text-white font-['Syne']">
                  Verificação da Administração Necessária para Cadastrar Produtos
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" />
                  {isPending ? 'Em Análise Cadastral' : isRejected ? 'Ajuste Necessário' : 'Não Verificada'}
                </span>
              </div>
              <p className="text-xs text-amber-200/80 mt-1 leading-relaxed">
                {isPending
                  ? 'Os dados da sua empresa foram enviados e estão sendo analisados pela Administração. O cadastro de planos será liberado assim que o selo for concedido.'
                  : isRejected
                    ? 'O cadastro da sua empresa necessita de correções apontadas pelo Administrador. Clique no botão ao lado para corrigir e reenviar.'
                    : 'A empresa só pode cadastrar produtos e planos após a homologação e aprovação pela Administração. Complete seu perfil corporativo agora para liberar o cadastro de planos.'}
              </p>
            </div>
          </div>

          {onNavigateToProfile && (
            <button
              type="button"
              onClick={onNavigateToProfile}
              className="bg-[#D9F22A] hover:bg-[#c8e217] text-[#060A15] font-black px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider shadow-lg transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap flex-shrink-0"
            >
              <Building2 className="w-4 h-4" />
              {isPending ? 'Ver Status no Perfil' : 'Preencher Perfil da Empresa'}
            </button>
          )}
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between gap-4 text-emerald-300">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <span className="text-xs font-bold">
              Empresa Verificada & Homologada: Cadastro de planos, checkout e comissões 100% liberados!
            </span>
          </div>
          <button
            onClick={() => onOpenCreatePlan(currentCompany?.id)}
            className="bg-emerald-500 hover:bg-emerald-400 text-black font-black px-3.5 py-1.5 rounded-xl text-[11px] uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 flex-shrink-0"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            Adicionar Plano
          </button>
        </div>
      )}

      {/* If no companies exist yet, prompt to create or verify */}
      {companies.length === 0 ? (
        <div className="bg-[#080d1a] border-2 border-dashed border-[#D9F22A]/40 rounded-3xl p-8 sm:p-12 text-center flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[#D9F22A]/10 border border-[#D9F22A]/30 flex items-center justify-center text-[#D9F22A]">
            <Building2 className="w-8 h-8" />
          </div>
          <div className="max-w-md">
            <h3 className="text-xl font-bold text-white font-['Syne'] mb-2">
              Nenhuma Empresa ou Startup Cadastrada
            </h3>
            <p className="text-xs text-white/60 leading-relaxed mb-6">
              Comece cadastrando o perfil e dados oficiais da sua empresa para que os afiliados da plataforma possam começar a divulgar seus produtos e serviços.
            </p>
            <button
              onClick={handleCreateCompanyRequest}
              className="bg-[#D9F22A] hover:bg-[#c8e217] text-[#060A15] font-black px-6 py-3.5 rounded-xl text-xs uppercase tracking-wider shadow-[0_0_25px_rgba(217,242,42,0.4)] transition-all cursor-pointer inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              Cadastrar Minha Primeira Startup
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Company Selector Pill Selector if multiple companies exist */}
          {companies.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              <span className="text-xs text-white/50 font-bold uppercase whitespace-nowrap mr-1">Empresas:</span>
              {companies.map(c => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCompanyId(c.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                    (selectedCompanyId === c.id || (!selectedCompanyId && companies[0].id === c.id))
                      ? 'bg-[#D9F22A] text-[#060A15]'
                      : 'bg-[#080d1a] text-white/70 hover:text-white border border-white/10'
                  }`}
                >
                  <img src={c.logo} alt={c.name} className="w-4 h-4 rounded-full object-cover" />
                  {c.name}
                </button>
              ))}
            </div>
          )}

          {/* Company Hero Profile Card */}
          {currentCompany && (
            <div className="bg-[#080d1a] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-96 h-96 bg-[#D9F22A]/5 rounded-full blur-3xl pointer-events-none" />

              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
                <div className="flex items-center gap-4 sm:gap-6">
                  <img
                    src={currentCompany.logo}
                    alt={currentCompany.name}
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-[#D9F22A]/40 bg-[#050811] shadow-lg flex-shrink-0"
                  />
                  <div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h2 className="text-xl sm:text-2xl font-black text-white font-['Syne']">
                        {currentCompany.name}
                      </h2>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#D9F22A]/10 text-[#D9F22A] border border-[#D9F22A]/30">
                        {currentCompany.category}
                      </span>
                      {currentCompany.status === 'pending' || (!currentCompany.verified && currentCompany.status !== 'rejected') ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1 font-bold">
                          <Clock className="w-3 h-3" /> Em Análise pelo Admin
                        </span>
                      ) : currentCompany.status === 'rejected' ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/30 flex items-center gap-1 font-bold">
                          <XCircle className="w-3 h-3" /> Cadastro Recusado
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 font-bold">
                          <CheckCircle2 className="w-3 h-3" /> Empresa Aprovada & Verificada
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-white/70 max-w-xl line-clamp-2">
                      {currentCompany.description}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-[11px] text-white/50 flex-wrap">
                      {currentCompany.website && (
                        <span className="flex items-center gap-1 text-[#D9F22A] hover:underline">
                          <Globe className="w-3 h-3" /> {currentCompany.website.replace('https://', '')}
                        </span>
                      )}
                      {currentCompany.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {currentCompany.email}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Metrics Pill Grid */}
                <div className="grid grid-cols-3 gap-3 w-full lg:w-auto bg-[#050811] border border-white/10 rounded-2xl p-3.5">
                  <div className="text-center px-3">
                    <span className="text-[10px] font-bold uppercase text-white/50 block">Planos Ativos</span>
                    <span className="text-lg font-black text-white font-['Syne']">{companyPlans.length}</span>
                  </div>
                  <div className="text-center px-3 border-x border-white/10">
                    <span className="text-[10px] font-bold uppercase text-[#D9F22A] block">Afiliados</span>
                    <span className="text-lg font-black text-[#D9F22A] font-['Syne']">{companyAffiliations.length}</span>
                  </div>
                  <div className="text-center px-3">
                    <span className="text-[10px] font-bold uppercase text-white/50 block">Vendas</span>
                    <span className="text-lg font-black text-white font-['Syne']">{companySales.length}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sub Navigation: Planos | Afiliados | Vendas */}
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('planos')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  activeTab === 'planos'
                    ? 'bg-[#D9F22A] text-[#060A15]'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Planos & Produtos ({companyPlans.length})
              </button>

              <button
                onClick={() => setActiveTab('afiliados')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  activeTab === 'afiliados'
                    ? 'bg-[#D9F22A] text-[#060A15]'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                Afiliados Conectados ({companyAffiliations.length})
              </button>

              <button
                onClick={() => setActiveTab('vendas')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  activeTab === 'vendas'
                    ? 'bg-[#D9F22A] text-[#060A15]'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5" />
                Vendas & Contratos ({companySales.length})
              </button>
            </div>

            <button
              onClick={() => onOpenRegisterSale()}
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-[#D9F22A] bg-[#D9F22A]/10 border border-[#D9F22A]/30 px-3 py-1.5 rounded-xl hover:bg-[#D9F22A]/20 transition-all cursor-pointer"
            >
              <DollarSign className="w-3.5 h-3.5" /> Lançar Venda de Plano
            </button>
          </div>

          {/* TAB 1: ÁREA PARA GERENCIAR OS PLANOS (Image 2 & 3) */}
          {activeTab === 'planos' && (
            <div className="space-y-4">
              {/* Header Controls for Managing Plans: Search, Status Filter & View Toggle */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#080d1a] border border-white/10 rounded-2xl p-3 sm:p-4">
                <div className="flex items-center gap-2 flex-1 max-w-md">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                    <input
                      type="text"
                      placeholder="Pesquisar planos..."
                      value={planSearch}
                      onChange={(e) => setPlanSearch(e.target.value)}
                      className="w-full bg-[#050811] border border-white/10 focus:border-[#D9F22A] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none transition-colors"
                    />
                  </div>

                  {/* Status Filter Tabs (Image 2) */}
                  <div className="flex items-center bg-[#050811] border border-white/10 rounded-xl p-0.5">
                    <button
                      type="button"
                      onClick={() => setPlanStatusFilter('all')}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                        planStatusFilter === 'all'
                          ? 'bg-[#D9F22A] text-[#060A15]'
                          : 'text-white/60 hover:text-white'
                      }`}
                    >
                      Todos
                    </button>
                    <button
                      type="button"
                      onClick={() => setPlanStatusFilter('Ativo')}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                        planStatusFilter === 'Ativo'
                          ? 'bg-emerald-500 text-black'
                          : 'text-white/60 hover:text-white'
                      }`}
                    >
                      Ativo
                    </button>
                    <button
                      type="button"
                      onClick={() => setPlanStatusFilter('Pausado')}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                        planStatusFilter === 'Pausado'
                          ? 'bg-amber-500 text-black'
                          : 'text-white/60 hover:text-white'
                      }`}
                    >
                      Pausado
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2">
                  {/* View Mode Switcher: Table List vs Grid Cards */}
                  <div className="flex items-center bg-[#050811] border border-white/10 rounded-xl p-0.5">
                    <button
                      type="button"
                      onClick={() => setPlanViewMode('table')}
                      className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        planViewMode === 'table'
                          ? 'bg-white/15 text-white shadow-sm'
                          : 'text-white/50 hover:text-white'
                      }`}
                      title="Visualização em Tabela (Gerenciar Planos)"
                    >
                      <List className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPlanViewMode('cards')}
                      className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        planViewMode === 'cards'
                          ? 'bg-white/15 text-white shadow-sm'
                          : 'text-white/50 hover:text-white'
                      }`}
                      title="Visualização em Cards"
                    >
                      <LayoutGrid className="w-4 h-4" />
                    </button>
                  </div>

                  <button
                    onClick={() => handleCreatePlanRequest(currentCompany?.id)}
                    className="bg-[#D9F22A] hover:bg-[#c8e217] text-[#060A15] font-black px-3.5 py-2 rounded-xl text-xs uppercase tracking-wider shadow-md transition-all cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Novo Plano</span>
                  </button>
                </div>
              </div>

              {filteredCompanyPlans.length === 0 ? (
                <div className="text-center py-12 px-4 bg-[#080d1a] border border-white/10 rounded-2xl">
                  <Layers className="w-10 h-10 text-[#D9F22A]/40 mx-auto mb-3" />
                  <h4 className="text-base font-bold text-white font-['Syne']">
                    {planSearch ? 'Nenhum plano corresponde à pesquisa' : 'Nenhum plano cadastrado nesta empresa'}
                  </h4>
                  <p className="text-xs text-white/50 max-w-sm mx-auto mt-1 mb-4">
                    {isVerified 
                      ? 'Adicione planos, preços e comissões para que os afiliados possam começar a vender.' 
                      : 'Complete a verificação da sua empresa no perfil para liberar o cadastro de planos e produtos.'}
                  </p>
                  <button
                    onClick={() => handleCreatePlanRequest(currentCompany?.id)}
                    className="bg-[#D9F22A] hover:bg-[#c8e217] text-[#060A15] font-black px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer inline-flex items-center gap-2"
                  >
                    {isVerified ? (
                      <>
                        <Plus className="w-4 h-4 stroke-[3]" /> Cadastrar Primeiro Plano
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" /> Cadastrar Primeiro Plano (Verificar)
                      </>
                    )}
                  </button>
                </div>
              ) : planViewMode === 'table' ? (
                /* TABLE LIST VIEW (Exact Match for Image 2 & 3) */
                <div className="bg-[#080d1a] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/10 text-[11px] font-bold text-white/40 uppercase bg-[#050811]">
                          <th className="py-3.5 px-4">Nome</th>
                          <th className="py-3.5 px-4">Preço</th>
                          <th className="py-3.5 px-4">Status</th>
                          <th className="py-3.5 px-4 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-xs">
                        {filteredCompanyPlans.map((plan) => {
                          const isDropdownOpen = activePlanDropdownId === plan.id;
                          return (
                            <tr key={plan.id} className="hover:bg-white/5 transition-colors group">
                              {/* Nome & Thumbnail */}
                              <td className="py-4 px-4 font-bold text-white">
                                <div className="flex items-center gap-3">
                                  <img
                                    src={plan.bannerImage}
                                    alt={plan.name}
                                    className="w-10 h-10 rounded-xl object-cover border border-white/10 bg-[#050811] flex-shrink-0"
                                  />
                                  <div>
                                    <span className="font-bold text-white group-hover:text-[#D9F22A] transition-colors block text-sm">
                                      {plan.name}
                                    </span>
                                    <span className="text-[11px] text-white/50 block">
                                      {plan.category} • {plan.paymentType || 'Único'}
                                    </span>
                                  </div>
                                </div>
                              </td>

                              {/* Preço */}
                              <td className="py-4 px-4 font-black text-white text-sm">
                                R$ {plan.priceSetup.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </td>

                              {/* Status Badge (Image 2) */}
                              <td className="py-4 px-4">
                                <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold inline-flex items-center gap-1.5 ${
                                  (plan.status || 'Ativo') === 'Ativo'
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                                }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${
                                    (plan.status || 'Ativo') === 'Ativo' ? 'bg-emerald-400' : 'bg-amber-400'
                                  }`} />
                                  {plan.status || 'Ativo'}
                                </span>
                              </td>

                              {/* Ações (3 Dots & Fast Links Modal - Image 3) */}
                              <td className="py-4 px-4 text-right relative">
                                <div className="flex items-center justify-end gap-2">
                                  {/* Quick Links Icon */}
                                  <button
                                    type="button"
                                    onClick={() => setSelectedPlanForLinks(plan)}
                                    className="p-1.5 rounded-lg bg-[#050811] border border-white/10 hover:border-[#D9F22A]/40 text-white/70 hover:text-[#D9F22A] transition-colors cursor-pointer"
                                    title="Ver Links Exclusivos"
                                  >
                                    <Link2 className="w-4 h-4" />
                                  </button>

                                  {/* Quick Live Checkout Icon */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (onOpenCheckout) onOpenCheckout(plan);
                                    }}
                                    className="p-1.5 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-900/80 transition-colors cursor-pointer"
                                    title="Testar Checkout ao Vivo"
                                  >
                                    <ExternalLink className="w-4 h-4" />
                                  </button>

                                  {/* 3-Dots Button */}
                                  <button
                                    type="button"
                                    onClick={() => setActivePlanDropdownId(isDropdownOpen ? null : plan.id)}
                                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                      isDropdownOpen
                                        ? 'bg-white/20 text-white'
                                        : 'text-white/60 hover:text-white hover:bg-white/10'
                                    }`}
                                  >
                                    <MoreVertical className="w-4 h-4" />
                                  </button>
                                </div>

                                {/* 3-DOTS ACTION POPUP (Exact Match for Image 3) */}
                                {isDropdownOpen && (
                                  <>
                                    <div
                                      className="fixed inset-0 z-20"
                                      onClick={() => setActivePlanDropdownId(null)}
                                    />
                                    <div className="absolute right-4 top-12 z-30 w-48 bg-[#0a1222] border border-white/15 rounded-2xl shadow-2xl py-2 text-left animate-in fade-in duration-150">
                                      {/* 1. Ver links */}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActivePlanDropdownId(null);
                                          setSelectedPlanForLinks(plan);
                                        }}
                                        className="w-full px-4 py-2.5 text-xs text-white/80 hover:text-white hover:bg-white/10 flex items-center gap-2.5 cursor-pointer transition-colors"
                                      >
                                        <Link2 className="w-4 h-4 text-[#D9F22A]" />
                                        <span>Ver links</span>
                                      </button>

                                      {/* 2. Editar */}
                                      {onEditPlan && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setActivePlanDropdownId(null);
                                            onEditPlan(plan);
                                          }}
                                          className="w-full px-4 py-2.5 text-xs text-white/80 hover:text-white hover:bg-white/10 flex items-center gap-2.5 cursor-pointer transition-colors"
                                        >
                                          <Edit3 className="w-4 h-4 text-white/60" />
                                          <span>Editar</span>
                                        </button>
                                      )}

                                      {/* 3. Ver avaliações */}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActivePlanDropdownId(null);
                                          setSelectedPlanForReviews(plan);
                                        }}
                                        className="w-full px-4 py-2.5 text-xs text-white/80 hover:text-white hover:bg-white/10 flex items-center gap-2.5 cursor-pointer transition-colors"
                                      >
                                        <MessageSquare className="w-4 h-4 text-amber-400" />
                                        <span>Ver avaliações</span>
                                      </button>

                                      {/* 4. Duplicar */}
                                      {onDuplicatePlan && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setActivePlanDropdownId(null);
                                            onDuplicatePlan(plan);
                                          }}
                                          className="w-full px-4 py-2.5 text-xs text-white/80 hover:text-white hover:bg-white/10 flex items-center gap-2.5 cursor-pointer transition-colors"
                                        >
                                          <Copy className="w-4 h-4 text-emerald-400" />
                                          <span>Duplicar</span>
                                        </button>
                                      )}

                                      {/* 5. Excluir */}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActivePlanDropdownId(null);
                                          if (confirm(`Tem certeza que deseja excluir o plano "${plan.name}"?`)) {
                                            onDeletePlan(plan.id, plan.companyId);
                                          }
                                        }}
                                        className="w-full px-4 py-2.5 text-xs text-rose-400 hover:bg-rose-500/10 flex items-center gap-2.5 cursor-pointer transition-colors border-t border-white/5 mt-1"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                        <span>Excluir</span>
                                      </button>
                                    </div>
                                  </>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                /* GRID CARDS VIEW */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredCompanyPlans.map((plan) => (
                    <div
                      key={plan.id}
                      className="bg-[#080d1a] border border-white/10 hover:border-[#D9F22A]/40 rounded-2xl overflow-hidden flex flex-col justify-between transition-all duration-300 group shadow-lg"
                    >
                      {/* Plan Banner */}
                      <div className="h-36 w-full relative overflow-hidden bg-black/40">
                        <img
                          src={plan.bannerImage}
                          alt={plan.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#080d1a] via-[#080d1a]/40 to-transparent" />
                        <div className="absolute top-3 left-3 flex items-center gap-1.5 max-w-[65%]">
                          {plan.badge && (
                            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black bg-[#D9F22A] text-[#060A15] uppercase tracking-wider truncate max-w-[130px]" title={plan.badge}>
                              {plan.badge}
                            </span>
                          )}
                        </div>
                        <div className="absolute top-3 right-3 flex items-center gap-1.5 z-20">
                          <button
                            onClick={() => setSelectedPlanForLinks(plan)}
                            className="p-1.5 rounded-lg bg-black/70 text-white/70 hover:text-[#D9F22A] hover:bg-black/90 transition-colors cursor-pointer border border-white/10"
                            title="Ver Links Exclusivos"
                          >
                            <Link2 className="w-3.5 h-3.5" />
                          </button>
                          {onEditPlan && (
                            <button
                              onClick={() => onEditPlan(plan)}
                              className="p-1.5 rounded-lg bg-black/70 text-white/70 hover:text-[#D9F22A] hover:bg-black/90 transition-colors cursor-pointer border border-white/10"
                              title="Editar Plano"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => onDeletePlan(plan.id, plan.companyId)}
                            className="p-1.5 rounded-lg bg-black/70 text-white/70 hover:text-red-400 hover:bg-black/90 transition-colors cursor-pointer border border-white/10"
                            title="Excluir Plano"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Plan Content */}
                      <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider block">
                              {plan.category}
                            </span>
                            <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded">
                              {plan.status || 'Ativo'}
                            </span>
                          </div>

                          <h4 className="text-lg font-bold text-white font-['Syne'] group-hover:text-[#D9F22A] transition-colors">
                            {plan.name}
                          </h4>
                          <p className="text-xs text-white/70 line-clamp-2 mt-1.5 leading-relaxed">
                            {plan.description}
                          </p>

                          {/* Features */}
                          <div className="mt-3 space-y-1">
                            {plan.features?.slice(0, 3).map((f, i) => (
                              <div key={i} className="flex items-center gap-2 text-[11px] text-white/80 truncate">
                                <CheckCircle2 className="w-3 h-3 text-[#D9F22A] flex-shrink-0" />
                                <span className="truncate">{f}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Pricing & Commission Box */}
                        <div className="pt-3 border-t border-white/10 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-white/50 font-bold uppercase text-[10px]">Preço de Setup:</span>
                            <span className="text-white font-black text-sm">
                              R$ {plan.priceSetup.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </div>

                          <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#D9F22A]/10 border border-[#D9F22A]/30">
                            <span className="text-[11px] font-bold text-[#D9F22A]">
                              Comissão do Afiliado ({plan.commissionPercentage}%):
                            </span>
                            <span className="text-sm font-black text-[#D9F22A]">
                              R$ {plan.commissionValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </div>

                          <div className="flex items-center justify-between pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                if (onOpenCheckout) onOpenCheckout(plan);
                              }}
                              className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
                            >
                              <ExternalLink className="w-3 h-3" /> Testar Checkout
                            </button>

                            <button
                              type="button"
                              onClick={() => setSelectedPlanForLinks(plan)}
                              className="text-xs font-bold text-white/60 hover:text-white flex items-center gap-1 cursor-pointer"
                            >
                              <Link2 className="w-3 h-3" /> Links Exclusivos
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Plan Links Modal (Image 3) */}
          <PlanLinksModal
            plan={selectedPlanForLinks}
            isOpen={!!selectedPlanForLinks}
            onClose={() => setSelectedPlanForLinks(null)}
            onOpenCheckout={(p) => {
              setSelectedPlanForLinks(null);
              if (onOpenCheckout) onOpenCheckout(p);
            }}
          />

          {/* Plan Reviews Modal (Image 3) */}
          <PlanReviewsModal
            plan={selectedPlanForReviews}
            isOpen={!!selectedPlanForReviews}
            onClose={() => setSelectedPlanForReviews(null)}
            onAddReview={(planId, rev) => {
              if (onAddReview) onAddReview(planId, rev);
            }}
          />

          {/* TAB 2: AFILIADOS CONECTADOS */}
          {activeTab === 'afiliados' && (
            <div>
              {companyAffiliations.length === 0 ? (
                <div className="text-center py-12 px-4 bg-[#080d1a] border border-white/10 rounded-2xl">
                  <Users className="w-10 h-10 text-[#D9F22A]/40 mx-auto mb-3" />
                  <h4 className="text-base font-bold text-white font-['Syne']">Nenhum afiliado conectado ainda</h4>
                  <p className="text-xs text-white/50 max-w-sm mx-auto mt-1">
                    Assim que afiliados solicitarem afiliação aos seus planos no Marketplace, eles aparecerão aqui com métricas de cliques e conversão.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 text-[11px] font-bold text-white/40 uppercase">
                        <th className="py-3 px-4">Afiliado</th>
                        <th className="py-3 px-4">Plano Vinculado</th>
                        <th className="py-3 px-4">Cliques</th>
                        <th className="py-3 px-4">Vendas</th>
                        <th className="py-3 px-4">Comissão Total Paga</th>
                        <th className="py-3 px-4 text-right">Data de Afiliação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-xs">
                      {companyAffiliations.map(aff => (
                        <tr key={aff.id} className="hover:bg-white/5 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-white">
                            {aff.affiliateName || 'Afiliado LeadsPay'}
                          </td>
                          <td className="py-3.5 px-4 text-[#D9F22A] font-bold">
                            {aff.platformName}
                          </td>
                          <td className="py-3.5 px-4 text-white/70">
                            {aff.clicksCount}
                          </td>
                          <td className="py-3.5 px-4 text-white/70">
                            {aff.salesCount}
                          </td>
                          <td className="py-3.5 px-4 font-black text-emerald-400">
                            R$ {aff.totalCommissionEarned.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3.5 px-4 text-right text-white/40">
                            {new Date(aff.affiliatedAt).toLocaleDateString('pt-BR')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: VENDAS & CONTRATOS */}
          {activeTab === 'vendas' && (
            <div>
              {companySales.length === 0 ? (
                <div className="text-center py-12 px-4 bg-[#080d1a] border border-white/10 rounded-2xl">
                  <DollarSign className="w-10 h-10 text-[#D9F22A]/40 mx-auto mb-3" />
                  <h4 className="text-base font-bold text-white font-['Syne']">Nenhuma venda registrada ainda</h4>
                  <p className="text-xs text-white/50 max-w-sm mx-auto mt-1 mb-4">
                    Quando afiliados fecharem contratos usando seus links de afiliados ou você lançar vendas, os registros aparecerão em tempo real.
                  </p>
                  <button
                    onClick={() => onOpenRegisterSale()}
                    className="bg-[#D9F22A] hover:bg-[#c8e217] text-[#060A15] font-black px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer inline-flex items-center gap-2"
                  >
                    <DollarSign className="w-4 h-4" /> Lançar Venda de Teste
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 text-[11px] font-bold text-white/40 uppercase">
                        <th className="py-3 px-4">Transação</th>
                        <th className="py-3 px-4">Plano</th>
                        <th className="py-3 px-4">Cliente</th>
                        <th className="py-3 px-4">Afiliado</th>
                        <th className="py-3 px-4">Valor Bruto</th>
                        <th className="py-3 px-4">Comissão</th>
                        <th className="py-3 px-4 text-right">Data</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-xs">
                      {companySales.map(sale => (
                        <tr key={sale.id} className="hover:bg-white/5 transition-colors">
                          <td className="py-3.5 px-4 font-mono text-white/50 text-[11px]">
                            {sale.id.slice(0, 8)}...
                          </td>
                          <td className="py-3.5 px-4 text-white font-bold">
                            {sale.platformName}
                          </td>
                          <td className="py-3.5 px-4 text-white/80">
                            {sale.customerName || 'Cliente Direto'}
                          </td>
                          <td className="py-3.5 px-4 text-[#D9F22A] font-bold">
                            {sale.affiliateName || 'Venda Direta'}
                          </td>
                          <td className="py-3.5 px-4 font-black text-white">
                            R$ {sale.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3.5 px-4 font-black text-emerald-400">
                            R$ {sale.commissionEarned.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3.5 px-4 text-right text-white/40">
                            {new Date(sale.timestamp).toLocaleDateString('pt-BR')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
