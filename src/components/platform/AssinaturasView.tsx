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
  DollarSign
} from 'lucide-react';
import { CompanyPlan, SaleTransaction, UserSellerProfile } from '../../types/platform';

interface AssinaturasViewProps {
  plans?: CompanyPlan[];
  sales?: SaleTransaction[];
  userProfile?: UserSellerProfile;
}

interface SubscriptionItem {
  id: string;
  customerName: string;
  customerEmail: string;
  planName: string;
  amount: number;
  recurrence: string;
  nextBilling: string;
  status: 'ativa' | 'cancelada' | 'atrasada';
  commission: number;
  paymentMethod: string;
  affiliateName?: string;
}

export const AssinaturasView: React.FC<AssinaturasViewProps> = ({
  plans = [],
  sales = [],
  userProfile
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ativa' | 'cancelada' | 'atrasada'>('all');

  // Derive active subscriptions dynamically from real recurring sales transactions
  const realSubscriptions: SubscriptionItem[] = sales
    .filter(s => {
      const plan = plans.find(p => p.id === s.platformId || p.id === (s as any).planId || p.id === s.plan_id);
      const isRecurring = plan?.billingType === 'recorrente' || 
                          plan?.paymentType === 'Recorrente' || 
                          plan?.paymentType === 'Assinatura' || 
                          (s as any)?.billingType === 'recorrente';
      return isRecurring && s.status === 'Aprovado';
    })
    .map(s => {
      const saleDate = s.date ? new Date(s.date) : new Date();
      const nextDate = new Date(saleDate);
      nextDate.setMonth(nextDate.getMonth() + 1);

      return {
        id: s.id,
        customerName: s.buyerName || s.buyerCompany || 'Cliente Assinante',
        customerEmail: s.buyerEmail || 'contato@cliente.com',
        planName: s.platformName || 'Plano Recorrente',
        amount: Number(s.amount) || 0,
        recurrence: 'Mensal',
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
        sub.planName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const activeSubs = realSubscriptions.filter(s => s.status === 'ativa');
  const totalMRR = activeSubs.reduce((acc, s) => acc + s.amount, 0);
  const activeCount = activeSubs.length;
  const avgTicket = activeCount > 0 ? totalMRR / activeCount : 0;
  const churnRate = 0.0;

  return (
    <div className="space-y-6 animate-fadeIn" id="leadspay-assinaturas-view">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#D9F22A] mb-1">
            <Repeat className="w-3.5 h-3.5" />
            Recorrência & MRR
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-['Syne']">
            Gestão de Assinaturas
          </h1>
          <p className="text-xs text-white/60 mt-1 max-w-xl">
            Acompanhe a retenção dos seus clientes, renovações automáticas e receita recorrente mensal (MRR).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-[#080d1a] border border-[#D9F22A]/30 px-4 py-2.5 rounded-2xl flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#D9F22A]/10 text-[#D9F22A] flex items-center justify-center font-bold">
              $
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-white/50 block">MRR Ativo</span>
              <span className="text-base font-black text-[#D9F22A] font-['Syne']">
                R$ {totalMRR.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[#080d1a] border border-white/10">
          <span className="text-xs font-bold uppercase tracking-wider text-white/50 block">Assinaturas Ativas</span>
          <div className="text-2xl font-black text-white font-['Syne'] mt-1">
            {activeCount}
          </div>
          <span className="text-[11px] text-emerald-400 font-semibold mt-1 block">
            {activeCount > 0 ? '100% ativas' : 'Pronto para novos assinantes'}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[#080d1a] border border-white/10">
          <span className="text-xs font-bold uppercase tracking-wider text-white/50 block">Ticket Médio Recorrente</span>
          <div className="text-2xl font-black text-white font-['Syne'] mt-1">
            R$ {avgTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-white/40 mt-1 block">Por contrato mensal</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#080d1a] border border-white/10">
          <span className="text-xs font-bold uppercase tracking-wider text-white/50 block">Churn Rate</span>
          <div className="text-2xl font-black text-emerald-400 font-['Syne'] mt-1">
            {churnRate.toFixed(1)}%
          </div>
          <span className="text-[11px] text-emerald-400/80 mt-1 block">Estabilidade e retenção</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#080d1a] border border-white/10">
          <span className="text-xs font-bold uppercase tracking-wider text-white/50 block">Liquidação</span>
          <div className="text-2xl font-black text-[#D9F22A] font-['Syne'] mt-1">D+9 PIX</div>
          <span className="text-[11px] text-white/40 mt-1 block">Ciclo padrão de repasses</span>
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
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[650px]">
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
                          Comissão: R$ {sub.commission.toFixed(2)}/mês
                        </span>
                      )}
                    </td>
                    <td className="p-4 font-black text-white font-mono">
                      R$ {sub.amount.toFixed(2)} <span className="text-[10px] text-white/40 font-normal">/mês</span>
                    </td>
                    <td className="p-4 text-white/80 font-mono">
                      {sub.nextBilling}
                    </td>
                    <td className="p-4 text-white/60">
                      {sub.paymentMethod}
                    </td>
                    <td className="p-4">
                      {sub.status === 'ativa' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3" /> Ativa
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                          <Clock className="w-3 h-3" /> Tentando Cobrança
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
