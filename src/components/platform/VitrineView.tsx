import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CompanyPlan, CompanyStartup, UserAffiliation } from '../../types/platform';
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
  UserCheck
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
}

export const VitrineView: React.FC<VitrineViewProps> = ({
  roleMode = 'afiliado',
  platforms = [],
  companies = [],
  affiliations = [],
  isVerified = false,
  verificationStatus = 'unsubmitted',
  onNavigateToProfile,
  onSelectProductDetail,
  onSimulateSale,
  onJoinAffiliate,
  onOpenCreateCompany,
  onOpenCreatePlan,
  onEditPlatform,
  onDeletePlatform,
  onSwitchToCompanyMode
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [minCommission, setMinCommission] = useState<number>(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showVerificationModal, setShowVerificationModal] = useState<boolean>(false);
  const [selectedPlanForModal, setSelectedPlanForModal] = useState<CompanyPlan | null>(null);

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
    return affiliations.some(a => a.planId === planId);
  };

  const getAffiliation = (planId: string) => {
    return affiliations.find(a => a.planId === planId);
  };

  const handleCopyLink = (aff: UserAffiliation) => {
    navigator.clipboard.writeText(aff.affiliateLink);
    setCopiedId(aff.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleAffiliateClick = (product: CompanyPlan) => {
    if (!isVerified) {
      setSelectedPlanForModal(product);
      setShowVerificationModal(true);
      return;
    }

    if (onJoinAffiliate) {
      onJoinAffiliate(product);
    }
  };

  return (
    <div className="flex flex-col gap-8" id="techify-vitrine-view">
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
                ? 'Explore startups ativas no ecossistema, afilie-se aos produtos com 1 clique e comece a divulgar seus links de afiliado com comissões de até 50% via PIX D+0.'
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

      {/* Info Notice for Affiliates */}
      {roleMode === 'afiliado' && (
        <div className="bg-[#080d1a] border border-[#D9F22A]/25 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#D9F22A]/15 border border-[#D9F22A]/30 flex items-center justify-center text-[#D9F22A] flex-shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Marketplace Aberto para Afiliação</h4>
              <p className="text-[11px] text-white/60">
                Você pode se afiliar a qualquer produto abaixo com 1 clique. As comissões são creditadas na sua carteira a cada venda via PIX D+0.
              </p>
            </div>
          </div>
          <span className="text-[10px] font-black uppercase text-[#D9F22A] bg-[#D9F22A]/10 border border-[#D9F22A]/30 px-3 py-1.5 rounded-xl whitespace-nowrap self-start sm:self-auto">
            {platforms.length} Startups Disponíveis
          </span>
        </div>
      )}

      {/* Grid of Plans / Platforms */}
      {filteredPlatforms.length === 0 ? (
        <div className="bg-[#080d1a] border-2 border-dashed border-[#D9F22A]/30 rounded-3xl p-12 text-center flex flex-col items-center justify-center gap-4">
          <PackageOpen className="w-16 h-16 text-[#D9F22A]/40" />
          <div className="max-w-md">
            <h3 className="text-xl font-bold text-white font-['Syne'] mb-2">
              Nenhum plano ou produto encontrado
            </h3>
            <p className="text-xs text-white/60 leading-relaxed mb-6">
              {roleMode === 'afiliado'
                ? 'Nenhuma startup ou plano encontrado para os filtros atuais. Tente selecionar outra categoria ou aguarde novas startups cadastrarem produtos.'
                : 'Cadastre sua empresa e seus planos para que os afiliados possam começar a se afiliar e gerar vendas.'}
            </p>
            {roleMode === 'empresa' && onOpenCreatePlan && (
              <button
                onClick={onOpenCreatePlan}
                className="bg-[#D9F22A] hover:bg-[#c8e217] text-[#060A15] font-black px-6 py-3.5 rounded-xl text-xs uppercase tracking-wider shadow-[0_0_25px_rgba(217,242,42,0.4)] transition-all cursor-pointer inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                Cadastrar Primeiro Plano
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPlatforms.map((product) => {
            const affiliated = isAffiliated(product.id);
            const userAff = getAffiliation(product.id);

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
                          Comissão do Afiliado:
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

                  {/* Actions according to Role */}
                  <div className="pt-2 flex flex-col gap-2">
                    {roleMode === 'afiliado' ? (
                      <>
                        {affiliated ? (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-green-500/10 border border-green-500/30 text-green-400 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5">
                              <Check className="w-4 h-4 stroke-[3]" />
                              Você é Afiliado
                            </div>
                            {userAff && (
                              <button
                                onClick={() => handleCopyLink(userAff)}
                                className="bg-white/10 hover:bg-white/20 text-white p-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                                title="Copiar Link de Afiliado"
                              >
                                {copiedId === userAff.id ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                              </button>
                            )}
                            <button
                              onClick={() => onSimulateSale(product)}
                              className="bg-[#D9F22A] hover:bg-[#c8e217] text-[#060A15] p-2.5 rounded-xl font-black transition-all cursor-pointer"
                              title="Registrar Venda"
                            >
                              <Zap className="w-4 h-4 fill-current" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleAffiliateClick(product)}
                            className="w-full bg-[#D9F22A] hover:bg-[#c8e217] text-[#060A15] font-black py-3 rounded-xl text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(217,242,42,0.3)] transition-all cursor-pointer flex items-center justify-center gap-2"
                          >
                            {!isVerified ? (
                              <>
                                <Lock className="w-3.5 h-3.5 text-[#060A15]" />
                                <span>Afiliar-se (Validação Necessária)</span>
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
                      </>
                    ) : (
                      /* Company Mode Actions */
                      <div className="flex items-center gap-2">
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
              </div>
            );
          })}
        </div>
      )}

      {/* ================= VERIFICATION REQUIRED MODAL ================= */}
      <AnimatePresence>
        {showVerificationModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-[#0a1222] border border-amber-500/40 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-[0_0_50px_rgba(245,158,11,0.2)] text-center relative"
            >
              <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mx-auto mb-4 shadow-lg">
                <Lock className="w-8 h-8" />
              </div>

              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 inline-block mb-2">
                Afiliação Bloqueada temporariamente
              </span>

              <h3 className="text-xl sm:text-2xl font-black text-white font-['Syne']">
                Verificação de Cadastro Obrigatória
              </h3>

              <p className="text-xs sm:text-sm text-white/70 mt-3 leading-relaxed">
                Para começar a se afiliar nos produtos e gerar comissões de até <strong>70%</strong>, você precisa primeiro preencher seus dados cadastrais (Nome, CPF, Endereço e WhatsApp) na aba <strong>"Meu Perfil"</strong> e enviar para aprovação do Administrador.
              </p>

              {verificationStatus === 'pending' ? (
                <div className="my-5 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center justify-center gap-2">
                  <Clock className="w-4 h-4 animate-spin" />
                  <span>Seus dados já foram enviados e estão aguardando aprovação do admin.</span>
                </div>
              ) : (
                <div className="my-5 p-3.5 rounded-xl bg-white/5 border border-white/10 text-white/80 text-xs text-left flex items-start gap-2.5">
                  <UserCheck className="w-4 h-4 text-[#D9F22A] flex-shrink-0 mt-0.5" />
                  <span>
                    Após o envio dos seus dados em <strong>Meu Perfil</strong>, a validação é concluída rapidamente pelo painel administrativo!
                  </span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-center gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowVerificationModal(false)}
                  className="w-full sm:w-1/2 py-3 rounded-xl border border-white/15 hover:bg-white/5 text-white/70 hover:text-white text-xs font-bold transition-all cursor-pointer"
                >
                  Continuar Explorando
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowVerificationModal(false);
                    if (onNavigateToProfile) onNavigateToProfile();
                  }}
                  className="w-full sm:w-1/2 bg-[#D9F22A] hover:bg-[#c8e217] text-[#060A15] font-black py-3 rounded-xl text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(217,242,42,0.3)] transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>Ir para Meu Perfil</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
