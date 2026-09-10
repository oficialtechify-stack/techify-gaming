import React, { useState } from 'react';
import { 
  Repeat, 
  Search, 
  Filter, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  AlertCircle, 
  DollarSign, 
  ArrowUpRight, 
  UserCheck, 
  Download, 
  RefreshCw,
  Sparkles,
  CreditCard,
  Building2
} from 'lucide-react';
import { CompanyPlan, SaleTransaction, UserSellerProfile } from '../../types/platform';

interface AssinaturasViewProps {
  plans?: CompanyPlan[];
  sales?: SaleTransaction[];
  userProfile?: UserSellerProfile;
}

export const AssinaturasView: React.FC<AssinaturasViewProps> = ({
  plans = [],
  sales = [],
  userProfile
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ativa' | 'cancelada' | 'atrasada'>('all');

  // Subscriptions based on recurring plans
  const recurringPlans = plans.filter(p => 
    p.billingType === 'recorrente' || 
    p.paymentType === 'Recorrente' || 
    p.paymentType === 'Assinatura' || 
    (p.recurrentCommission ?? 0) > 0
  );

  const sampleSubscriptions = [
    {
      id: 'sub_01',
      customerName: 'TechSolutions Brasil LTDA',
      customerEmail: 'contato@techsolutions.com.br',
      planName: plans[0]?.name || 'Plano Pro Enterprise',
      amount: 497.00,
      recurrence: 'Mensal',
      nextBilling: '18/10/2026',
      status: 'ativa',
      commission: 149.10,
      paymentMethod: 'Cartão de Crédito (Recorrente)',
      affiliateName: 'Pedro Henrique (Afiliado Master)'
    },
    {
      id: 'sub_02',
      customerName: 'Alpha Nexus Software',
      customerEmail: 'financeiro@alphanexus.io',
      planName: plans[1]?.name || 'API Gateway High Volume',
      amount: 890.00,
      recurrence: 'Mensal',
      nextBilling: '22/10/2026',
      status: 'ativa',
      commission: 267.00,
      paymentMethod: 'PIX Automático',
      affiliateName: 'Juliana Costa'
    },
    {
      id: 'sub_03',
      customerName: 'Studio Digital Criativo',
      customerEmail: 'adm@studiodigital.com',
      planName: 'Software CRM & Leads',
      amount: 297.00,
      recurrence: 'Mensal',
      nextBilling: '05/10/2026',
      status: 'atrasada',
      commission: 89.10,
      paymentMethod: 'Cartão de Crédito',
      affiliateName: 'Venda Direta'
    }
  ];

  const filteredSubs = sampleSubscriptions.filter(sub => {
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

  const totalMRR = sampleSubscriptions
    .filter(s => s.status === 'ativa')
    .reduce((acc, s) => acc + s.amount, 0);

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
            Acompanhe a retenção dos clientes, renovações automáticas, cobranças ativas e comissões mensais recorrentes.
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
          <div className="text-2xl font-black text-white font-['Syne'] mt-1">2</div>
          <span className="text-[11px] text-emerald-400 font-semibold mt-1 block">98.5% retenção</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#080d1a] border border-white/10">
          <span className="text-xs font-bold uppercase tracking-wider text-white/50 block">Ticket Médio Recorrente</span>
          <div className="text-2xl font-black text-white font-['Syne'] mt-1">R$ 561,33</div>
          <span className="text-[11px] text-white/40 mt-1 block">Por contrato mensal</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#080d1a] border border-white/10">
          <span className="text-xs font-bold uppercase tracking-wider text-white/50 block">Churn Rate (Cancelamentos)</span>
          <div className="text-2xl font-black text-emerald-400 font-['Syne'] mt-1">0.0%</div>
          <span className="text-[11px] text-emerald-400/80 mt-1 block">Excelente estabilidade</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#080d1a] border border-white/10">
          <span className="text-xs font-bold uppercase tracking-wider text-white/50 block">Liquidação</span>
          <div className="text-2xl font-black text-[#D9F22A] font-['Syne'] mt-1">D+9 PIX</div>
          <span className="text-[11px] text-white/40 mt-1 block">Ciclo padrão de repasses</span>
        </div>
      </div>

      {/* Filter Bar & Search */}
      <div className="bg-[#080d1a] border border-white/10 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
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

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'all' ? 'bg-[#D9F22A] text-[#060A15]' : 'bg-white/5 text-white/60 hover:text-white'
            }`}
          >
            Todas
          </button>
          <button
            onClick={() => setStatusFilter('ativa')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'ativa' ? 'bg-emerald-500 text-black' : 'bg-white/5 text-white/60 hover:text-white'
            }`}
          >
            Ativas
          </button>
          <button
            onClick={() => setStatusFilter('atrasada')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'atrasada' ? 'bg-amber-500 text-black' : 'bg-white/5 text-white/60 hover:text-white'
            }`}
          >
            Atrasadas
          </button>
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="bg-[#080d1a] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
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
                    <span className="text-[10px] text-[#D9F22A] block font-mono">Comissão: R$ {sub.commission.toFixed(2)}/mês</span>
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
      </div>
    </div>
  );
};
