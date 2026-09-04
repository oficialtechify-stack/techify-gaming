import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { TECH_ECOSYSTEM_PARTNERS } from '../data/stellarData';
import { Layers, Laptop, Gamepad2, CreditCard, Bot, Megaphone, ShoppingCart, Building2, ExternalLink, CheckCircle, Sparkles, PlusCircle } from 'lucide-react';
import { subscribeCompanies, subscribePlans, CompanyStartup, CompanyPlan } from '../services/firestoreService';

interface SponsorshipsSectionProps {
  onOpenPlatform?: () => void;
  onOpenRegisterCompany?: () => void;
}

export const SponsorshipsSection: React.FC<SponsorshipsSectionProps> = ({
  onOpenPlatform,
  onOpenRegisterCompany
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [companies, setCompanies] = useState<CompanyStartup[]>([]);
  const [plans, setPlans] = useState<CompanyPlan[]>([]);
  const [loading, setLoading] = useState(true);

  // Subscribe to real Firestore database
  useEffect(() => {
    const unsubCompanies = subscribeCompanies((liveCompanies) => {
      setCompanies(liveCompanies);
      setLoading(false);
    });

    const unsubPlans = subscribePlans((livePlans) => {
      setPlans(livePlans);
    });

    return () => {
      unsubCompanies();
      unsubPlans();
    };
  }, []);

  const categories = [
    { id: 'all', label: 'Todas as Categorias', icon: Layers },
    { id: 'SaaS / B2B', label: 'SaaS & Gestão', icon: Laptop },
    { id: 'iGaming', label: 'iGaming & Plataformas', icon: Gamepad2 },
    { id: 'Fintech', label: 'Fintechs & Pagamentos', icon: CreditCard },
    { id: 'IA & Automação', label: 'IA & Automação', icon: Bot },
    { id: 'E-commerce', label: 'E-commerce & Vendas', icon: ShoppingCart },
  ];

  // Helper to get max commission percentage for a company
  const getCompanyCommission = (companyId: string) => {
    const companyPlans = plans.filter(p => p.companyId === companyId);
    if (companyPlans.length === 0) return 'Até 50%';
    const maxComm = Math.max(...companyPlans.map(p => p.commissionPercentage));
    return `${maxComm}%`;
  };

  // Helper to get ticket range for a company
  const getCompanyTicket = (companyId: string) => {
    const companyPlans = plans.filter(p => p.companyId === companyId);
    if (companyPlans.length === 0) return 'R$ 490 - R$ 2.490';
    const prices = companyPlans.map(p => p.priceSetup);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    if (min === max) return `R$ ${min.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    return `R$ ${min.toLocaleString('pt-BR')} a R$ ${max.toLocaleString('pt-BR')}`;
  };

  // Filter companies based on category
  const filteredCompanies = activeCategory === 'all'
    ? companies
    : companies.filter(c => {
        const cat = (c.category || '').toLowerCase();
        const active = activeCategory.toLowerCase();
        return cat.includes(active) || (activeCategory === 'SaaS / B2B' && cat.includes('saas'));
      });

  return (
    <section id="categorias" className="py-20 md:py-28 relative bg-[#060A15] border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-12"
        >
          <div className="max-w-2xl flex flex-col items-start gap-4">
            <div className="inline-flex items-center gap-2 bg-[#0c1322] border border-[#D9F22A]/30 rounded-full px-4 py-1.5 text-xs font-semibold text-[#D9F22A]">
              <Layers className="w-3.5 h-3.5" />
              <span>CATÁLOGO ATIVO • SINCRONIZADO COM BANCO DE DADOS</span>
            </div>

            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold uppercase tracking-tight font-['Syne'] text-white">
              STARTUPS & EMPRESAS CADASTRADAS
            </h2>
          </div>

          <div className="lg:max-w-xl text-white/80 text-sm sm:text-base leading-relaxed flex flex-col gap-3">
            <p>
              Conecte-se às startups e plataformas ativas no ecossistema LeadsPay. Todos os produtos possuem split automatizado em D+0 e comissões garantidas em tempo real.
            </p>
            {onOpenRegisterCompany && (
              <button
                onClick={onOpenRegisterCompany}
                className="self-start inline-flex items-center gap-2 text-xs font-bold text-[#D9F22A] hover:underline"
              >
                <PlusCircle className="w-4 h-4" />
                Cadastrar Minha Startup no Marketplace →
              </button>
            )}
          </div>
        </motion.div>

        {/* Category Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-10 pb-2 border-b border-white/5">
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 cursor-pointer ${
                  activeCategory === cat.id
                    ? 'bg-[#D9F22A] text-[#060A15] shadow-[0_0_15px_rgba(217,242,42,0.4)]'
                    : 'bg-[#0a1020] text-white/70 hover:text-white border border-white/10 hover:border-white/30'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Real Startups Grid from Database */}
        {filteredCompanies.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
            {filteredCompanies.map((company, idx) => (
              <motion.div
                key={company.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: idx * 0.05 }}
                className="p-6 rounded-2xl bg-[#080d1a] border border-white/10 hover:border-[#D9F22A]/50 transition-all duration-300 flex flex-col justify-between group shadow-lg"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={company.logo || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=120&q=80'}
                        alt={company.name}
                        className="w-12 h-12 rounded-xl object-cover border border-white/10 p-0.5 bg-black/40"
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-base font-bold text-white font-['Syne'] group-hover:text-[#D9F22A] transition-colors">
                            {company.name}
                          </h3>
                          {company.verified && (
                            <CheckCircle className="w-4 h-4 text-[#D9F22A] flex-shrink-0" />
                          )}
                        </div>
                        <span className="text-[11px] text-white/50">{company.category || 'Tecnologia'}</span>
                      </div>
                    </div>

                    <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-[#D9F22A]/10 text-[#D9F22A] border border-[#D9F22A]/20 whitespace-nowrap">
                      {getCompanyCommission(company.id)} Comis.
                    </span>
                  </div>

                  <p className="text-xs text-white/70 line-clamp-2 mb-4 leading-relaxed">
                    {company.tagline || 'Soluções de alta conversão para o ecossistema digital.'}
                  </p>

                  <div className="bg-black/30 rounded-xl p-3 border border-white/5 flex items-center justify-between text-xs mb-2">
                    <span className="text-white/50">Ticket / Planos:</span>
                    <span className="text-white font-bold">{getCompanyTicket(company.id)}</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs">
                  <span className="text-white/50 text-[11px]">
                    Planos: <strong className="text-white">{plans.filter(p => p.companyId === company.id).length || company.totalPlansCount || 1} ativos</strong>
                  </span>
                  {onOpenPlatform ? (
                    <button
                      onClick={onOpenPlatform}
                      className="text-[#D9F22A] font-bold group-hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      Afiliar-se Agora →
                    </button>
                  ) : (
                    <span className="text-[#D9F22A] font-bold">D+0 Instantâneo</span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center bg-[#080d1a] border border-white/10 rounded-2xl mb-16">
            <Building2 className="w-12 h-12 text-white/30 mx-auto mb-3" />
            <h4 className="text-lg font-bold text-white mb-2">Nenhuma empresa encontrada nesta categoria</h4>
            <p className="text-xs text-white/60 max-w-md mx-auto mb-6">
              Novas startups e plataformas estão sendo auditadas e integradas diariamente no banco de dados.
            </p>
            {onOpenRegisterCompany && (
              <button
                onClick={onOpenRegisterCompany}
                className="bg-[#D9F22A] text-[#060A15] font-black px-6 py-2.5 rounded-xl text-xs uppercase tracking-wider hover:bg-[#e4fa3b] transition-all cursor-pointer"
              >
                Cadastrar Minha Startup
              </button>
            )}
          </div>
        )}

        {/* Tech Ecosystem & Cloud Partners Grid (Replaces old football logos) */}
        <div className="pt-10 border-t border-white/10">
          <div className="text-xs font-bold uppercase tracking-widest text-[#D9F22A] mb-2 text-center">
            INFRAESTRUTURA & PARCEIROS TECNOLÓGICOS CONECTADOS
          </div>
          <p className="text-xs text-white/50 text-center max-w-xl mx-auto mb-8">
            Gateways de pagamento instantâneo, provedores de computação em nuvem e inteligência artificial que alimentam a infraestrutura do LeadsPay.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
            {TECH_ECOSYSTEM_PARTNERS.map((partner) => (
              <div
                key={partner.id}
                className="bg-[#080d1a] border border-white/10 hover:border-[#D9F22A]/40 rounded-2xl p-4 flex flex-col items-center text-center justify-center group transition-all duration-300 shadow-md"
              >
                <div className="w-12 h-12 rounded-xl overflow-hidden mb-3 border border-white/10 group-hover:border-[#D9F22A]/50 transition-colors">
                  <img
                    src={partner.logo}
                    alt={partner.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    loading="lazy"
                  />
                </div>
                <div className="text-xs font-bold text-white group-hover:text-[#D9F22A] transition-colors leading-tight">
                  {partner.name}
                </div>
                <span className="text-[10px] text-white/50 mt-1">
                  {partner.category}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};



