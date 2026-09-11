import React, { useState } from 'react';
import { 
  Repeat, 
  Search, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  CreditCard,
  ShieldCheck,
  Zap,
  DollarSign,
  Plus,
  Link2,
  Copy,
  Check,
  ExternalLink,
  AlertCircle,
  ShoppingBag,
  ArrowRight,
  Layers
} from 'lucide-react';
import { CompanyPlan, SaleTransaction, UserSellerProfile } from '../../types/platform';

interface AssinaturasViewProps {
  plans?: CompanyPlan[];
  sales?: SaleTransaction[];
  userProfile?: UserSellerProfile;
  onNavigateToProducts?: () => void;
  onOpenCreatePlan?: () => void;
  onOpenCheckout?: (plan: CompanyPlan) => void;
}

interface SubscriptionItem {
  id: string;
  customerName: string;
  customerEmail: string;
  planName: string;
  amount: number;
  recurrence: string;
  cycle: string;
  nextBilling: string;
  status: 'ativa' | 'cancelada' | 'atrasada';
  commission: number;
  paymentMethod: string;
  affiliateName?: string;
}

export const AssinaturasView: React.FC<AssinaturasViewProps> = ({
  plans = [],
  sales = [],
  userProfile,
  onNavigateToProducts,
  onOpenCreatePlan,
  onOpenCheckout
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'assinaturas' | 'checkouts'>('assinaturas');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ativa' | 'cancelada' | 'atrasada'>('all');
  const [copiedPlanId, setCopiedPlanId] = useState<string | null>(null);
  const [isGuidanceModalOpen, setIsGuidanceModalOpen] = useState<boolean>(false);

  // All recurring plans
  const recurringPlans = plans.filter(p => 
    p.billingType === 'recorrente' || 
    p.paymentType === 'Recorrente' || 
    p.paymentType === 'Assinatura' || 
    p.priceMonthly > 0
  );

  // Derive real active subscriptions from real approved transactions of recurring plans
  const realSubscriptions: SubscriptionItem[] = sales
    .filter(s => {
      const plan = plans.find(p => p.id === s.platformId || p.id === (s as any).planId || p.id === s.plan_id);
      const isRecurring = plan?.billingType === 'recorrente' || 
                          plan?.paymentType === 'Recorrente' || 
                          plan?.paymentType === 'Assinatura' || 
                          (s as any)?.billingType === 'recorrente' ||
                          (plan?.priceMonthly && plan.priceMonthly > 0);
      return isRecurring && s.status === 'Aprovado';
    })
    .map(s => {
      const saleDate = s.date ? new Date(s.date) : new Date();
      const plan = plans.find(p => p.id === s.platformId || p.id === (s as any).planId || p.id === s.plan_id);
      const cycle = plan?.billingCycle || 'MONTHLY';
      
      const nextDate = new Date(saleDate);
      if (cycle === 'WEEKLY') nextDate.setDate(nextDate.getDate() + 7);
      else if (cycle === 'QUARTERLY') nextDate.setMonth(nextDate.getMonth() + 3);
      else if (cycle === 'SEMIANNUALLY') nextDate.setMonth(nextDate.getMonth() + 6);
      else if (cycle === 'YEARLY') nextDate.setFullYear(nextDate.getFullYear() + 1);
      else nextDate.setMonth(nextDate.getMonth() + 1);

      const cycleLabels: Record<string, string> = {
        WEEKLY: 'Semanal',
        MONTHLY: 'Mensal',
        QUARTERLY: 'Trimestral',
        SEMIANNUALLY: 'Semestral',
        YEARLY: 'Anual'
      };

      return {
        id: s.id,
        customerName: s.buyerName || s.buyerCompany || 'Cliente Assinante',
        customerEmail: s.buyerEmail || 'contato@cliente.com',
        planName: s.platformName || plan?.name || 'Plano Recorrente LeadsPay',
        amount: Number(s.amount) || Number(plan?.priceSetup) || 0,
        recurrence: cycleLabels[cycle] || 'Mensal',
        cycle: cycle,
        nextBilling: nextDate.toLocaleDateString('pt-BR'),
        status: 'ativa' as const,
        commission: Number(s.commissionEarned ?? (s as any).commissionValue) || 0,
        paymentMethod: s.method || 'Cartão de Crédito (Recorrente)',
        affiliateName: (s as any).affiliateName || 'Link Direto'
      };
    });

  const filteredSubs = realSubscriptions.filter(sub => {
    if (statusFilter !== 'all' && sub.status !== statusFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        sub.customerName.toLowerCase().includes(q) ||
        sub.customerEmail.toLowerCase().includes(q) ||
        sub.planName.toLowerCase().includes(q) ||
        sub.recurrence.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const activeSubs = realSubscriptions.filter(s => s.status === 'ativa');
  const totalMRR = activeSubs.reduce((acc, s) => {
    // Normalize to monthly MRR
    if (s.cycle === 'WEEKLY') return acc + (s.amount * 4);
    if (s.cycle === 'QUARTERLY') return acc + (s.amount / 3);
    if (s.cycle === 'SEMIANNUALLY') return acc + (s.amount / 6);
    if (s.cycle === 'YEARLY') return acc + (s.amount / 12);
    return acc + s.amount;
  }, 0);

  const activeCount = activeSubs.length;
  const avgTicket = activeCount > 0 ? totalMRR / activeCount : 0;
  const churnRate = 0.0;

  // Handler for "+ Novo Checkout de Assinatura" with intelligent check
  const handleNewSubscriptionCheckout = () => {
    if (recurringPlans.length === 0) {
      setIsGuidanceModalOpen(true);
    } else {
      setActiveSubTab('checkouts');
    }
  };

  const handleCopyCheckoutLink = (plan: CompanyPlan) => {
    const slug = plan.checkoutSlug || plan.slug || plan.id;
    const url = `${window.location.origin}/checkout/${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedPlanId(plan.id);
    setTimeout(() => setCopiedPlanId(null), 2500);
  };

  return (
    <div className="space-y-6 animate-fadeIn" id="leadspay-assinaturas-view">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#D9F22A] mb-1">
            <Repeat className="w-4 h-4" />
            Recorrência & MRR (Asaas v3)
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-['Syne']">
            Gestão de Assinaturas
          </h1>
          <p className="text-xs text-white/60 mt-1 max-w-xl">
            Acompanhe a retenção dos clientes, renovações automáticas e gerencie seus checkouts de planos recorrentes.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-[#080d1a] border border-[#D9F22A]/30 px-4 py-2 rounded-2xl flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#D9F22A]/10 text-[#D9F22A] flex items-center justify-center font-bold">
              $
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-white/50 block">MRR Projetado</span>
              <span className="text-sm sm:text-base font-black text-[#D9F22A] font-['Syne']">
                R$ {totalMRR.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês
              </span>
            </div>
          </div>

          <button
            onClick={handleNewSubscriptionCheckout}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#D9F22A] hover:bg-[#cbe327] text-[#060A15] font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(217,242,42,0.2)] cursor-pointer"
            id="btn-new-subscription-checkout"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            + Novo Checkout de Assinatura
          </button>
        </div>
      </div>

      {/* Sub-Tabs: 1. Assinaturas | 2. Checkouts de Assinatura */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-3">
        <button
          onClick={() => setActiveSubTab('assinaturas')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'assinaturas'
              ? 'bg-[#102419] text-[#D9F22A] border border-[#D9F22A]/40 shadow-[0_0_15px_rgba(217,242,42,0.15)]'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <Repeat className="w-3.5 h-3.5" />
          Assinaturas Ativas & Histórico ({realSubscriptions.length})
        </button>

        <button
          onClick={() => setActiveSubTab('checkouts')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'checkouts'
              ? 'bg-[#102419] text-[#D9F22A] border border-[#D9F22A]/40 shadow-[0_0_15px_rgba(217,242,42,0.15)]'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <Link2 className="w-3.5 h-3.5" />
          Checkouts de Assinatura ({recurringPlans.length})
        </button>
      </div>

      {/* SUB-ABA 1: ASSINATURAS */}
      {activeSubTab === 'assinaturas' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-[#080d1a] border border-white/10">
              <span className="text-[11px] font-bold uppercase tracking-wider text-white/50 block">Assinaturas Ativas</span>
              <div className="text-2xl font-black text-white font-['Syne'] mt-1">
                {activeCount}
              </div>
              <span className="text-[11px] text-emerald-400 font-semibold mt-1 block">
                {activeCount > 0 ? '100% ativas' : 'Pronto para novos assinantes'}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[#080d1a] border border-white/10">
              <span className="text-[11px] font-bold uppercase tracking-wider text-white/50 block">Ticket Médio Recorrente</span>
              <div className="text-2xl font-black text-white font-['Syne'] mt-1">
                R$ {avgTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[11px] text-white/40 mt-1 block">Por contrato</span>
            </div>

            <div className="p-4 rounded-2xl bg-[#080d1a] border border-white/10">
              <span className="text-[11px] font-bold uppercase tracking-wider text-white/50 block">Taxa de Retenção</span>
              <div className="text-2xl font-black text-emerald-400 font-['Syne'] mt-1">
                100.0%
              </div>
              <span className="text-[11px] text-emerald-400/80 mt-1 block">Churn Rate: {churnRate.toFixed(1)}%</span>
            </div>

            <div className="p-4 rounded-2xl bg-[#080d1a] border border-white/10">
              <span className="text-[11px] font-bold uppercase tracking-wider text-white/50 block">Liquidação</span>
              <div className="text-2xl font-black text-[#D9F22A] font-['Syne'] mt-1">D+9 PIX</div>
              <span className="text-[11px] text-white/40 mt-1 block">Repasse automático na conta</span>
            </div>
          </div>

          {/* Filter Bar & Search */}
          <div className="bg-[#080d1a] border border-white/10 p-4 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por cliente, e-mail ou plano..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#050811] border border-white/15 rounded-xl pl-10 pr-4 py-2 text-xs text-white focus:outline-none focus:border-[#D9F22A]"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  statusFilter === 'all' ? 'bg-[#D9F22A] text-[#060A15]' : 'bg-white/5 text-white/60 hover:text-white'
                }`}
              >
                Todas ({realSubscriptions.length})
              </button>
              <button
                onClick={() => setStatusFilter('ativa')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  statusFilter === 'ativa' ? 'bg-emerald-500 text-black' : 'bg-white/5 text-white/60 hover:text-white'
                }`}
              >
                Ativas ({activeCount})
              </button>
              <button
                onClick={() => setStatusFilter('atrasada')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  statusFilter === 'atrasada' ? 'bg-amber-500 text-black' : 'bg-white/5 text-white/60 hover:text-white'
                }`}
              >
                Atrasadas (0)
              </button>
            </div>
          </div>

          {/* Subscriptions Table / Empty State */}
          <div className="bg-[#080d1a] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
            {filteredSubs.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center">
                <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 mb-3">
                  <Repeat className="w-7 h-7 text-[#D9F22A]/60" />
                </div>
                <h3 className="text-base font-bold text-white font-['Syne']">
                  Nenhuma assinatura ativa encontrada
                </h3>
                <p className="text-xs text-white/50 max-w-md mt-1.5">
                  Quando clientes contratarem planos de assinatura recorrente através dos links de checkout ou campanhas, as assinaturas e o MRR serão computados aqui automaticamente em tempo real.
                </p>
                <button
                  onClick={handleNewSubscriptionCheckout}
                  className="mt-4 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-colors cursor-pointer"
                >
                  Configurar Checkouts de Assinatura
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[700px]">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/[0.02] text-white/50 uppercase tracking-wider font-bold">
                      <th className="p-4">Cliente & Contrato</th>
                      <th className="p-4">Plano</th>
                      <th className="p-4">Valor / Ciclo</th>
                      <th className="p-4">Próxima Cobrança</th>
                      <th className="p-4">Método</th>
                      <th className="p-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredSubs.map((sub) => (
                      <tr key={sub.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="p-4">
                          <div className="font-bold text-white">{sub.customerName}</div>
                          <div className="text-[11px] text-white/50">{sub.customerEmail}</div>
                        </td>
                        <td className="p-4">
                          <span className="font-bold text-white">{sub.planName}</span>
                          {sub.commission > 0 && (
                            <span className="text-[10px] text-[#D9F22A] block font-mono">
                              Comissão: R$ {sub.commission.toFixed(2)}
                            </span>
                          )}
                        </td>
                        <td className="p-4 font-black text-white font-mono">
                          R$ {sub.amount.toFixed(2)}{' '}
                          <span className="text-[10px] text-white/50 font-normal">/ {sub.recurrence}</span>
                        </td>
                        <td className="p-4 text-white/80 font-mono">
                          {sub.nextBilling}
                        </td>
                        <td className="p-4 text-white/60">
                          {sub.paymentMethod}
                        </td>
                        <td className="p-4">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" />
                            Ativa
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-ABA 2: CHECKOUTS DE ASSINATURA */}
      {activeSubTab === 'checkouts' && (
        <div className="space-y-6">
          {recurringPlans.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center bg-[#080d1a] border border-white/10 rounded-2xl">
              <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 mb-3">
                <AlertCircle className="w-7 h-7 text-amber-400" />
              </div>
              <h3 className="text-base font-bold text-white font-['Syne']">
                Você ainda não possui produtos de assinatura cadastrados
              </h3>
              <p className="text-xs text-white/50 max-w-md mt-1.5">
                Para disponibilizar checkouts com renovação recorrente (Semanal, Mensal ou Anual), cadastre um plano com modelo de assinatura na aba de Produtos.
              </p>
              <button
                onClick={() => {
                  if (onOpenCreatePlan) onOpenCreatePlan();
                  else if (onNavigateToProducts) onNavigateToProducts();
                }}
                className="mt-4 px-5 py-2.5 rounded-xl bg-[#D9F22A] hover:bg-[#cbe327] text-[#060A15] font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                Cadastrar Produto de Assinatura
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recurringPlans.map((plan) => {
                const slug = plan.checkoutSlug || plan.slug || plan.id;
                const checkoutUrl = `${window.location.origin}/checkout/${slug}`;
                const cycleText = plan.billingCycle === 'WEEKLY' ? 'Semanal' :
                                  plan.billingCycle === 'QUARTERLY' ? 'Trimestral' :
                                  plan.billingCycle === 'SEMIANNUALLY' ? 'Semestral' :
                                  plan.billingCycle === 'YEARLY' ? 'Anual' : 'Mensal';

                return (
                  <div 
                    key={plan.id}
                    className="p-5 rounded-2xl bg-[#080d1a] border border-white/10 hover:border-[#D9F22A]/40 transition-all flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#D9F22A]/10 text-[#D9F22A] border border-[#D9F22A]/20">
                          {cycleText}
                        </span>
                        <span className="text-[11px] text-white/40 font-mono">
                          {plan.companyName}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-white font-['Syne']">
                        {plan.name}
                      </h3>
                      <p className="text-xs text-white/50 line-clamp-2 mt-1 mb-4">
                        {plan.description}
                      </p>

                      <div className="p-3 rounded-xl bg-[#050811] border border-white/5 mb-4">
                        <span className="text-[10px] text-white/40 block">Valor Recorrente</span>
                        <div className="text-xl font-black text-white font-mono mt-0.5">
                          R$ {Number(plan.priceSetup || plan.priceMonthly || 0).toFixed(2)}
                          <span className="text-xs text-white/40 font-normal"> / {cycleText.toLowerCase()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-white/5">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCopyCheckoutLink(plan)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold transition-colors cursor-pointer"
                        >
                          {copiedPlanId === plan.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-[#D9F22A]" />
                              <span className="text-[#D9F22A]">Copiado!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-white/60" />
                              <span>Copiar Link</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => {
                            if (onOpenCheckout) onOpenCheckout(plan);
                            else window.open(checkoutUrl, '_blank');
                          }}
                          className="p-2 rounded-xl bg-[#D9F22A]/10 hover:bg-[#D9F22A] text-[#D9F22A] hover:text-[#060A15] transition-all cursor-pointer"
                          title="Abrir Checkout"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL INTELIGENTE DE ORIENTAÇÃO (ETAPA 3) */}
      {isGuidanceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-[#080d1a] border border-amber-400/40 rounded-3xl p-6 sm:p-7 shadow-[0_0_50px_rgba(251,191,36,0.15)] text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-400/10 text-amber-400 flex items-center justify-center mx-auto mb-4 border border-amber-400/20">
              <AlertCircle className="w-7 h-7" />
            </div>

            <h2 className="text-xl font-black text-white font-['Syne']">
              Nenhum Produto de Assinatura Cadastrado
            </h2>
            <p className="text-xs text-white/70 mt-2 leading-relaxed">
              Você ainda não possui produtos ou planos de assinatura cadastrados. Para criar um checkout recorrente, primeiro cadastre seu produto de assinatura com modelo de recorrência semanal, mensal ou anual.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-2.5 mt-6">
              <button
                type="button"
                onClick={() => setIsGuidanceModalOpen(false)}
                className="w-full sm:w-1/2 py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs transition-colors cursor-pointer"
              >
                Voltar
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsGuidanceModalOpen(false);
                  if (onOpenCreatePlan) onOpenCreatePlan();
                  else if (onNavigateToProducts) onNavigateToProducts();
                }}
                className="w-full sm:w-1/2 py-2.5 px-4 rounded-xl bg-[#D9F22A] hover:bg-[#cbe327] text-[#060A15] font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-[0_0_20px_rgba(217,242,42,0.2)]"
              >
                <span>Ir para Produtos</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
