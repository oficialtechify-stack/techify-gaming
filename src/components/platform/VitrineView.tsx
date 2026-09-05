import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CompanyPlan, CompanyStartup, UserAffiliation } from '../../types/platform';
import { useAuth } from '../../context/AuthContext';
import { formatAffiliatePlanUrl, getAppBaseUrl } from '../../utils/affiliateTracking';
import { 
  Sparkles, 
  Copy, 
  Check, 
  ExternalLink, 
  Layers, 
  Zap, 
  ShieldCheck, 
  Users, 
  TrendingUp, 
  ArrowUpRight,
  Plus,
  Trash2,
  Edit3,
  PackageOpen,
  Building2,
  Percent,
  DollarSign,
  CheckCircle2,
  Lock,
  ArrowRight,
  Clock,
  UserCheck,
  QrCode,
  Share2,
  CreditCard,
  Sliders,
  X,
  Loader2
} from 'lucide-react';

interface VitrineViewProps {
  roleMode?: 'afiliado' | 'empresa';
  platforms: CompanyPlan[];
  companies?: CompanyStartup[];
  affiliations?: UserAffiliation[];
  isVerified?: boolean;
  verificationStatus?: string;
  onNavigateToProfile?: () => void;
  onSelectProductDetail: (product: CompanyPlan) => void;
  onSimulateSale: (product: CompanyPlan) => void;
  onJoinAffiliate?: (product: CompanyPlan) => void;
  onOpenCreateCompany?: () => void;
  onOpenCreatePlan?: () => void;
  onEditPlatform?: (product: CompanyPlan) => void;
  onDeletePlatform?: (id: string, companyId?: string) => void;
  onSwitchToCompanyMode?: () => void;
  onOpenCheckout?: (plan: CompanyPlan, affiliateRef?: string) => void;
}

export const VitrineView: React.FC<VitrineViewProps> = ({
  roleMode = 'afiliado',
  platforms = [],
  companies = [],
  affiliations = [],
  isVerified = true,
  verificationStatus = 'approved',
  onNavigateToProfile,
  onSelectProductDetail,
  onSimulateSale,
  onJoinAffiliate,
  onOpenCreateCompany,
  onOpenCreatePlan,
  onEditPlatform,
  onDeletePlatform,
  onSwitchToCompanyMode,
  onOpenCheckout
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [minCommission, setMinCommission] = useState<number>(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedAffModal, setSelectedAffModal] = useState<{ plan: CompanyPlan; aff: UserAffiliation } | null>(null);
  const [localAffiliations, setLocalAffiliations] = useState<UserAffiliation[]>(affiliations);
  const [joiningPlanId, setJoiningPlanId] = useState<string | null>(null);

  const { currentUser, userProfile } = useAuth();

  useEffect(() => {
    setLocalAffiliations(affiliations);
  }, [affiliations]);

  const categories = [
    'all', 
    'SaaS / B2B', 
    'iGaming & Apostas', 
    'Fintech & Pagamentos', 
    'Marketing & Vendas', 
    'IA & Automação', 
    'Educação / Cursos'
  ];

  const filteredPlatforms = platforms.filter(p => {
    if (selectedCategory !== 'all' && p.category !== selectedCategory) return false;
    if (minCommission > 0 && p.commissionPercentage < minCommission) return false;
    if (searchTerm) {
      const matchName = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchComp = (p.companyName || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchDesc = (p.description || '').toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchName && !matchComp && !matchDesc) return false;
    }
    return true;
  });

  const isAffiliated = (planId: string) => {
    return localAffiliations.some(a => a.planId === planId);
  };

  const getAffiliation = (planId: string) => {
    return localAffiliations.find(a => a.planId === planId);
  };

  const handleCopyLink = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleAffiliateClick = async (product: CompanyPlan) => {
    if (joiningPlanId) return;
    try {
      setJoiningPlanId(product.id);

      const effectiveUserId = userProfile?.id || currentUser?.uid || (typeof window !== 'undefined' ? localStorage.getItem('leadspay_user_id') : null) || 'usr_afiliado_leadspay';
      const effectiveName = userProfile?.name || currentUser?.displayName || 'Afiliado LeadsPay';
      const effectiveEmail = userProfile?.email || currentUser?.email || 'afiliado@leadspay.com';

      const response = await fetch('/api/affiliates/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          planId: product.id,
          userId: effectiveUserId,
          userName: effectiveName,
          userEmail: effectiveEmail
        })
      });

      const text = await response.text();
      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch (parseErr) {
        console.warn('Resposta não-JSON de /api/affiliates/join:', text);
      }

      if (response.ok && data.success && data.affiliation) {
        const newAff = data.affiliation as UserAffiliation;
        setLocalAffiliations(prev => {
          const exists = prev.some(a => a.planId === product.id);
          if (exists) {
            return prev.map(a => a.planId === product.id ? newAff : a);
          }
          return [...prev, newAff];
        });

        if (onJoinAffiliate) {
          onJoinAffiliate(product);
        }

        // Abre o modal de divulgação exibindo imediatamente o link formatado com ?ref=MEU_CODIGO
        setSelectedAffModal({ plan: product, aff: newAff });
      } else {
        if (onJoinAffiliate) {
          onJoinAffiliate(product);
        }
      }
    } catch (err) {
      console.error('Erro na requisição /api/affiliates/join:', err);
      if (onJoinAffiliate) {
        onJoinAffiliate(product);
      }
    } finally {
      setJoiningPlanId(null);
    }
  };

  const currentOrigin = getAppBaseUrl();

  return (
    <div className="flex flex-col gap-8" id="leadspay-vitrine-view">
      {/* Header Banner */}
      <div className="relative rounded-3xl overflow-hidden border border-white/10 bg-gradient-to-r from-[#070d1c] via-[#0b162c] to-[#070d1c] p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="max-w-2xl flex flex-col items-start gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D9F22A]/10 border border-[#D9F22A]/30 text-[11px] font-bold text-[#D9F22A] uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              {roleMode === 'afiliado' ? 'MODO AFILIADO • MARKETPLACE DE STARTUPS' : 'MODO EMPRESA • GESTÃO DE CATÁLOGO & PUBLICAÇÃO'}
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-white font-['Syne']">
              {roleMode === 'afiliado' ? 'Vitrine de Startups & Afiliação Direta' : 'Marketplace & Publicação de Planos'}
            </h1>
            <p className="text-sm text-white/70 leading-relaxed">
              {roleMode === 'afiliado'
                ? 'Explore startups parceiras, afilie-se com 1 clique para receber seu código exclusivo de divulgação e divulgue seu link direto para o Checkout do produto com comissões de até 70% creditadas em tempo real.'
                : 'Cadastre sua startup, publique planos e soluções comerciais e disponibilize seus produtos para a rede de afiliados parceiros venderem.'}
            </p>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-auto flex-shrink-0 flex-wrap">
            {onOpenCreateCompany && (
              <button
                onClick={onOpenCreateCompany}
                className="bg-white/10 hover:bg-white/15 text-white border border-white/15 font-bold px-4 py-3 rounded-2xl text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2"
                title="Cadastrar empresa e enviar para análise do Administrador"
              >
                <Building2 className="w-4 h-4 text-[#D9F22A]" />
                Cadastrar Empresa
              </button>
            )}
            {roleMode === 'empresa' && onOpenCreatePlan && (
              <button
                onClick={onOpenCreatePlan}
                className="bg-[#D9F22A] hover:bg-[#c8e217] text-[#060A15] font-black px-5 py-3 rounded-2xl text-xs uppercase tracking-wider shadow-[0_0_25px_rgba(217,242,42,0.35)] transition-all cursor-pointer flex items-center gap-2"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                Criar Novo Plano
              </button>
            )}
            {roleMode === 'afiliado' && onSwitchToCompanyMode && (
              <div className="p-3.5 rounded-2xl bg-[#050811]/90 border border-white/15 flex items-center gap-3">
                <div className="flex flex-col">
                  <span className="text-[10px] text-white/50 uppercase font-bold">É uma Startup?</span>
                  <span className="text-xs font-bold text-white">Publique seus produtos</span>
                </div>
                <button
                  onClick={onSwitchToCompanyMode}
                  className="bg-white/10 hover:bg-[#D9F22A] hover:text-[#060A15] text-white font-bold px-3 py-1.5 rounded-xl text-xs transition-colors cursor-pointer whitespace-nowrap"
                >
                  Modo Empresa →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#080d1a] border border-white/10 p-4 rounded-2xl shadow-lg">
        {/* Category Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-[#D9F22A] text-[#060A15] shadow-[0_0_15px_rgba(217,242,42,0.3)]'
                  : 'bg-[#050811] text-white/70 hover:text-white border border-white/10'
              }`}
            >
              {cat === 'all' ? `Todos os Planos (${platforms.length})` : cat}
            </button>
          ))}
        </div>

        {/* Search Input & Commission Filter */}
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar startup ou plano..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-[#050811] border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#D9F22A] w-48 sm:w-56"
            />
          </div>

          <select
            value={minCommission}
            onChange={(e) => setMinCommission(Number(e.target.value))}
            className="bg-[#050811] border border-white/15 rounded-xl px-3 py-2 text-xs text-[#D9F22A] font-bold focus:outline-none focus:border-[#D9F22A]"
          >
            <option value={0}>Todas as Comissões</option>
            <option value={20}>Mínimo 20%</option>
            <option value={35}>Mínimo 35%</option>
            <option value={50}>Mínimo 50%</option>
          </select>
        </div>
      </div>

      {/* Grid of Plans / Platforms */}
      {filteredPlatforms.length === 0 ? (
        <div className="bg-[#080d1a] border-2 border-dashed border-[#D9F22A]/30 rounded-3xl p-12 text-center flex flex-col items-center justify-center gap-4">
          <PackageOpen className="w-16 h-16 text-[#D9F22A]/40" />
          <div className="max-w-md">
            <h3 className="text-xl font-bold text-white font-['Syne'] mb-2">
              Nenhum plano ou produto encontrado
            </h3>
            <p className="text-xs text-white/60 leading-relaxed mb-6">
              Nenhuma startup encontrada para os filtros atuais. Tente selecionar outra categoria.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPlatforms.map((product) => {
            const affiliated = isAffiliated(product.id);
            const userAff = getAffiliation(product.id);
            const checkoutUrl = userAff ? formatAffiliatePlanUrl(product.id, userAff.affiliateCode) : formatAffiliatePlanUrl(product.id, 'LEADS');

            return (
              <div
                key={product.id}
                className="bg-[#080d1a] border border-white/10 hover:border-[#D9F22A]/40 rounded-3xl overflow-hidden flex flex-col justify-between transition-all duration-300 group shadow-xl relative"
              >
                {/* Top Image Banner */}
                <div className="h-44 w-full relative overflow-hidden bg-black/50">
                  <img
                    src={product.bannerImage || 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=600&q=80'}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#080d1a] via-[#080d1a]/50 to-transparent" />
                  
                  {/* Category and Badge */}
                  <div className="absolute top-3 left-3 flex items-center gap-2 max-w-[65%]">
                    {product.badge && (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-[#D9F22A] text-[#060A15] uppercase tracking-wider shadow-md truncate max-w-[130px]" title={product.badge}>
                        {product.badge}
                      </span>
                    )}
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-black/70 text-white border border-white/15 backdrop-blur-sm whitespace-nowrap">
                      {product.category}
                    </span>
                  </div>

                  {/* Top Actions: Edit & Delete buttons (ONLY for Empresas) */}
                  {roleMode === 'empresa' && (
                    <div className="absolute top-3 right-3 flex items-center gap-1.5 z-20">
                      {onEditPlatform && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditPlatform(product);
                          }}
                          className="p-1.5 rounded-lg bg-black/70 text-white/70 hover:text-[#D9F22A] hover:bg-black/90 transition-colors cursor-pointer border border-white/10"
                          title="Editar Plano"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {onDeletePlatform && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeletePlatform(product.id, product.companyId);
                          }}
                          className="p-1.5 rounded-lg bg-black/70 text-white/70 hover:text-red-400 hover:bg-black/90 transition-colors cursor-pointer border border-white/10"
                          title="Remover Plano"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Company Logo in Banner */}
                  {product.companyLogo && (
                    <div className="absolute bottom-3 left-4 flex items-center gap-2 z-10">
                      <img
                        src={product.companyLogo}
                        alt={product.companyName}
                        className="w-7 h-7 rounded-lg object-cover border border-[#D9F22A]/40 bg-[#050811] shadow-md"
                      />
                      <span className="text-[10px] font-bold uppercase text-[#D9F22A] tracking-wider truncate max-w-[150px]">
                        {product.companyName}
                      </span>
                    </div>
                  )}
                </div>

                {/* Card Body */}
                <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-white font-['Syne'] group-hover:text-[#D9F22A] transition-colors line-clamp-1">
                      {product.name}
                    </h3>
                    <p className="text-xs text-white/70 line-clamp-2 mt-1.5 leading-relaxed">
                      {product.description}
                    </p>

                    {/* Features list preview */}
                    <div className="mt-3 space-y-1.5">
                      {product.features?.slice(0, 3).map((feat, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs text-white/80 truncate">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#D9F22A] flex-shrink-0" />
                          <span className="truncate">{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Pricing & Commission Callout Box */}
                  <div className="space-y-2 pt-3 border-t border-white/10">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white/50 font-bold uppercase text-[10px]">Preço do Plano:</span>
                      <span className="text-white font-black text-sm">
                        R$ {product.priceSetup.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        {product.priceMonthly > 0 ? ` + R$ ${product.priceMonthly}/mês` : ''}
                      </span>
                    </div>

                    {/* High-visibility Commission Box */}
                    <div className="p-3 rounded-2xl bg-[#D9F22A]/10 border border-[#D9F22A]/35 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold uppercase text-[#D9F22A] block">
                          Sua Comissão por Venda:
                        </span>
                        <span className="text-xs font-bold text-white/80">
                          {product.commissionPercentage}% sobre a venda
                        </span>
                      </div>
                      <span className="text-lg font-black text-[#D9F22A]">
                        + R$ {product.commissionValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  {/* Affiliate Status & Dedicated Box */}
                  {roleMode === 'afiliado' && (
                    <div className="pt-2 flex flex-col gap-2.5">
                      {affiliated && userAff ? (
                        <div className="bg-[#050811] border border-emerald-500/40 rounded-2xl p-3.5 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-400">
                              <Check className="w-4 h-4 stroke-[3]" />
                              Você é Afiliado Oficial
                            </span>
                            <span className="text-[10px] font-mono font-bold bg-[#D9F22A]/15 text-[#D9F22A] border border-[#D9F22A]/30 px-2 py-0.5 rounded-lg">
                              {userAff.affiliateCode}
                            </span>
                          </div>

                          {/* Direct Checkout Link with Quick Copy */}
                          <div>
                            <span className="text-[10px] font-bold uppercase text-white/50 block mb-1">
                              Seu Link Direto do Checkout:
                            </span>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                readOnly
                                value={checkoutUrl}
                                className="flex-1 bg-[#080d1a] border border-white/10 rounded-xl px-2.5 py-1.5 text-[10px] text-white font-mono truncate select-all focus:outline-none"
                              />
                              <button
                                onClick={() => handleCopyLink(checkoutUrl, userAff.id)}
                                className="bg-[#D9F22A] hover:bg-[#c8e217] text-[#060A15] p-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center flex-shrink-0"
                                title="Copiar Link de Divulgação do Checkout"
                              >
                                {copiedId === userAff.id ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 pt-1">
                            <button
                              onClick={() => setSelectedAffModal({ plan: product, aff: userAff })}
                              className="flex-1 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                            >
                              <Share2 className="w-3.5 h-3.5 text-[#D9F22A]" />
                              Ver Link de Divulgação
                            </button>

                            <button
                              onClick={() => onOpenCheckout ? onOpenCheckout(product, userAff.affiliateCode) : window.open(checkoutUrl, '_blank')}
                              className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 text-[11px] font-bold px-3 py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1"
                              title="Testar Checkout ao vivo"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              Testar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleAffiliateClick(product)}
                          disabled={joiningPlanId === product.id}
                          className="w-full bg-[#D9F22A] hover:bg-[#c8e217] disabled:opacity-75 disabled:cursor-not-allowed text-[#060A15] font-black py-3.5 rounded-xl text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(217,242,42,0.3)] transition-all cursor-pointer flex items-center justify-center gap-2"
                        >
                          {joiningPlanId === product.id ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Vinculando Afiliação...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4 fill-current" />
                              <span>Afiliar-se com 1 Clique (Ganhe {product.commissionPercentage}%)</span>
                            </>
                          )}
                        </button>
                      )}

                      <button
                        onClick={() => onSelectProductDetail(product)}
                        className="w-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white py-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer text-center"
                      >
                        Ver Detalhes do Produto
                      </button>
                    </div>
                  )}

                  {/* Company Mode Actions */}
                  {roleMode === 'empresa' && (
                    <div className="pt-2 flex items-center gap-2">
                      {onEditPlatform && (
                        <button
                          onClick={() => onEditPlatform(product)}
                          className="flex-1 bg-[#D9F22A] hover:bg-[#c8e217] text-[#060A15] font-black py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          Editar Plano
                        </button>
                      )}
                      <button
                        onClick={() => onSelectProductDetail(product)}
                        className="flex-1 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-center border border-white/10"
                      >
                        Ver Detalhes
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================= MODAL: DIVULGAR PRODUTO & LINKS DE AFILIADO ================= */}
      <AnimatePresence>
        {selectedAffModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-[#080d1a] border border-[#D9F22A]/40 rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-[0_0_50px_rgba(0,0,0,0.9)] relative max-h-[90vh] overflow-y-auto"
            >
              <button
                onClick={() => setSelectedAffModal(null)}
                className="absolute top-5 right-5 text-white/50 hover:text-white transition-colors cursor-pointer w-8 h-8 rounded-full bg-white/5 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#D9F22A] mb-1">
                <Share2 className="w-4 h-4" />
                Seus Links Exclusivos de Divulgação
              </div>

              <h3 className="text-xl sm:text-2xl font-black text-white font-['Syne'] mb-2">
                {selectedAffModal.plan.name}
              </h3>
              <p className="text-xs text-white/60 mb-5">
                Compartilhe seus links com clientes. Toda compra realizada pelo seu link gera <strong>{selectedAffModal.plan.commissionPercentage}% de comissão (R$ {selectedAffModal.plan.commissionValue.toFixed(2).replace('.', ',')})</strong> direto na sua carteira.
              </p>

              {/* Unique Affiliate Code Card */}
              <div className="p-3.5 bg-[#050811] border border-white/10 rounded-2xl flex items-center justify-between mb-4">
                <div>
                  <span className="text-[10px] uppercase font-bold text-white/50 block">Seu Código Único de Afiliado</span>
                  <span className="text-base font-black font-mono text-[#D9F22A]">
                    {selectedAffModal.aff.affiliateCode}
                  </span>
                </div>
                <button
                  onClick={() => handleCopyLink(selectedAffModal.aff.affiliateCode, 'code')}
                  className="bg-white/10 hover:bg-[#D9F22A] hover:text-[#060A15] text-white px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  {copiedId === 'code' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  {copiedId === 'code' ? 'Copiado!' : 'Copiar Código'}
                </button>
              </div>

              {/* Direct Checkout Link Card */}
              <div className="p-4 bg-[#050811] border border-emerald-500/30 rounded-2xl space-y-2.5 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4" /> Link Direto para o Checkout
                  </span>
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                    Recomendado
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={formatAffiliatePlanUrl(selectedAffModal.plan.id, selectedAffModal.aff.affiliateCode)}
                    className="flex-1 bg-[#080d1a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono select-all truncate"
                  />
                  <button
                    onClick={() => handleCopyLink(formatAffiliatePlanUrl(selectedAffModal.plan.id, selectedAffModal.aff.affiliateCode), 'checkout')}
                    className="bg-[#D9F22A] hover:bg-[#c8e217] text-[#060A15] font-black px-3.5 py-2 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 flex-shrink-0"
                  >
                    {copiedId === 'checkout' ? <Check className="w-4 h-4 stroke-[3]" /> : <Copy className="w-4 h-4" />}
                    {copiedId === 'checkout' ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>

                <div className="pt-1 flex items-center justify-between text-xs">
                  <a
                    href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Olá! Conheça o ${selectedAffModal.plan.name} da ${selectedAffModal.plan.companyName}. Acesse o link oficial para contratar com condições exclusivas: ${formatAffiliatePlanUrl(selectedAffModal.plan.id, selectedAffModal.aff.affiliateCode)}`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5" /> Compartilhar no WhatsApp
                  </a>

                  <button
                    onClick={() => {
                      if (onOpenCheckout) {
                        setSelectedAffModal(null);
                        onOpenCheckout(selectedAffModal.plan, selectedAffModal.aff.affiliateCode);
                      }
                    }}
                    className="text-white/70 hover:text-white font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Abrir Checkout
                  </button>
                </div>
              </div>

              {/* QR Code */}
              <div className="p-4 bg-[#050811] border border-white/10 rounded-2xl flex items-center gap-4">
                <div className="w-24 h-24 bg-white p-2 rounded-xl border flex-shrink-0 flex items-center justify-center">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(formatAffiliatePlanUrl(selectedAffModal.plan.id, selectedAffModal.aff.affiliateCode))}`}
                    alt="QR Code do Checkout"
                    className="w-full h-full"
                  />
                </div>
                <div>
                  <span className="text-xs font-bold text-white block mb-1">QR Code de Pagamento</span>
                  <p className="text-[11px] text-white/60 leading-relaxed">
                    Mostre este QR code presencialmente ou em apresentações para seu cliente escanear e abrir o checkout com seu código de indicação.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setSelectedAffModal(null)}
                  className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold cursor-pointer transition-colors"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
