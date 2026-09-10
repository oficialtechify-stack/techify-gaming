import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  UserSellerProfile, 
  SaleTransaction, 
  PaymentMethodStat, 
  CompanyPlan, 
  PlatformTab,
  UserRoleMode 
} from '../../types/platform';
import { 
  TrendingUp, 
  DollarSign, 
  ShoppingBag, 
  CreditCard, 
  Zap, 
  Eye, 
  EyeOff, 
  ArrowUpRight, 
  ShieldCheck, 
  Sparkles,
  RefreshCw,
  Clock,
  Layers,
  Users,
  Shield,
  Smartphone,
  CheckCircle2,
  ChevronRight,
  BarChart3
} from 'lucide-react';

interface DashboardViewProps {
  roleMode?: UserRoleMode;
  userProfile: UserSellerProfile;
  transactions: SaleTransaction[];
  paymentStats: PaymentMethodStat[];
  platforms: CompanyPlan[];
  setActiveTab: (tab: PlatformTab) => void;
  onOpenSimulateSale: () => void;
  onOpenWithdraw: () => void;
  onSelectProductDetail: (product: CompanyPlan) => void;
  selectedPeriod: string;
  setSelectedPeriod: (p: string) => void;
  selectedProductFilter: string;
  setSelectedProductFilter: (p: string) => void;
  selectedTypeFilter: string;
  setSelectedTypeFilter: (t: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  roleMode = 'afiliado',
  userProfile,
  transactions,
  paymentStats,
  platforms,
  setActiveTab,
  onOpenSimulateSale,
  onOpenWithdraw,
  onSelectProductDetail,
  selectedPeriod,
  setSelectedPeriod,
  selectedProductFilter,
  setSelectedProductFilter,
  selectedTypeFilter,
  setSelectedTypeFilter
}) => {
  const [showValues, setShowValues] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 700);
  };

  // Filter transactions based on filters
  const safeTransactions = Array.isArray(transactions) ? transactions : [];
  const safePlatforms = Array.isArray(platforms) ? platforms : [];

  const filteredTransactions = safeTransactions.filter(t => {
    if (!t) return false;
    if (selectedProductFilter !== 'all' && t.platformId !== selectedProductFilter) return false;
    if (selectedTypeFilter !== 'all' && t.status !== selectedTypeFilter) return false;
    return true;
  });

  const totalFilteredSalesAmount = filteredTransactions.reduce((acc, t) => acc + (t.status === 'Aprovado' ? (Number(t.amount) || 0) : 0), 0);
  const totalFilteredCommission = filteredTransactions.reduce((acc, t) => acc + (t.status === 'Aprovado' ? (Number(t.commissionEarned ?? (t as any)?.commissionValue) || 0) : 0), 0);
  const approvedSalesCount = filteredTransactions.filter(t => t.status === 'Aprovado').length;

  // Complete Payment Methods list matching Image 3
  const DEFAULT_PAYMENT_ROWS = [
    { method: 'PIX', conversion: '0%', value: 0, icon: '❖', color: 'text-[#D9F22A]' },
    { method: 'Cartão de Crédito', conversion: '0%', value: 0, icon: '💳', color: 'text-white' },
    { method: 'PicPay', conversion: '0%', value: 0, icon: 'P', color: 'text-emerald-400' },
    { method: 'OXXO', conversion: '0%', value: 0, icon: 'OX', color: 'text-orange-400' },
    { method: 'SPEI', conversion: '0%', value: 0, icon: '⚡', color: 'text-sky-400' },
    { method: 'PIX Automático', conversion: '0%', value: 0, icon: '🔄', color: 'text-[#D9F22A]' },
    { method: 'Apple Pay', conversion: '0%', value: 0, icon: '', color: 'text-white' },
    { method: 'Google Pay', conversion: '0%', value: 0, icon: 'G', color: 'text-blue-400' },
    { method: '3DS', conversion: '0%', value: 0, icon: '🛡️', color: 'text-purple-400' },
  ];

  // Merge with real stats if any sales exist
  const paymentRows = DEFAULT_PAYMENT_ROWS.map(row => {
    const found = paymentStats.find(p => p.method.toLowerCase().includes(row.method.toLowerCase()));
    if (found && (Number(found.totalValue) > 0 || Number(found.count) > 0)) {
      return {
        ...row,
        conversion: found.conversionRate || `${found.percentage}%`,
        value: Number(found.totalValue) || 0
      };
    }
    return row;
  });

  // Hourly slots for the 24h timeline chart (00:00 to 23:00) from Image 3
  const hourlySlots = [
    '00:00', '02:00', '04:00', '06:00', '08:00', '10:00',
    '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'
  ];

  return (
    <div className="flex flex-col gap-6" id="leadspay-dashboard-view">
      {/* 1. TOP BANNER: VOCÊ NO CONTROLE (Exact copy and layout from Image 3) */}
      <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-r from-[#070c18] via-[#0d1728] to-[#070c18] p-4 sm:p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#D9F22A]/15 border border-[#D9F22A]/30 flex items-center justify-center text-[#D9F22A] flex-shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-white">VOCÊ NO CONTROLE.</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#D9F22A]/20 text-[#D9F22A] border border-[#D9F22A]/30">
                  Equipe
                </span>
              </div>
              <p className="text-xs text-white/70 mt-0.5">
                Gerencie quem acessa sua dashboard. Sem senha. Sem risco.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto">
            <button
              onClick={() => setActiveTab('equipe')}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-white/10 hover:bg-[#D9F22A] hover:text-[#060A15] text-white text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
            >
              <span>Gerenciar Equipe</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onOpenSimulateSale}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-[#D9F22A] hover:bg-[#c8e217] text-[#060A15] text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(217,242,42,0.3)]"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Nova Venda</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. FILTER BAR (Dashboard Title + Selectors from Image 3) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#080d1a] border border-white/10 p-4 sm:p-5 rounded-2xl">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black text-white font-['Syne']">
              Dashboard
            </h1>
            <button
              onClick={() => setShowValues(!showValues)}
              className="text-white/50 hover:text-[#D9F22A] transition-colors p-1 cursor-pointer"
              title={showValues ? "Ocultar valores" : "Mostrar valores"}
            >
              {showValues ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
            </button>
          </div>
          <p className="text-[11px] text-white/50 mt-1 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#D9F22A]" />
            Liquidação D+9 • Atualizado em tempo real
          </p>
        </div>

        {/* Filter Controls from Image 3 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:flex md:flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Tipo Filter */}
          <div className="relative w-full sm:w-auto">
            <select
              value={selectedTypeFilter}
              onChange={(e) => setSelectedTypeFilter(e.target.value)}
              className="w-full bg-[#050811] border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#D9F22A] cursor-pointer appearance-none pr-8 font-medium"
            >
              <option value="all">Tipo: Todos</option>
              <option value="Aprovado">Aprovado</option>
              <option value="Pendente">Pendente</option>
            </select>
            <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 text-[10px]">▼</div>
          </div>

          {/* Produtos Filter */}
          <div className="relative w-full sm:w-auto">
            <select
              value={selectedProductFilter}
              onChange={(e) => setSelectedProductFilter(e.target.value)}
              className="w-full bg-[#050811] border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#D9F22A] cursor-pointer appearance-none pr-8 md:max-w-[200px] truncate font-medium"
            >
              <option value="all">Produtos: Todos</option>
              {safePlatforms.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 text-[10px]">▼</div>
          </div>

          {/* Período Filter */}
          <div className="relative w-full sm:w-auto">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="w-full bg-[#050811] border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#D9F22A] cursor-pointer appearance-none pr-8 font-medium"
            >
              <option value="Hoje">Período: Hoje</option>
              <option value="Ontem">Ontem</option>
              <option value="Últimos 7 dias">Últimos 7 dias</option>
              <option value="Últimos 30 dias">Últimos 30 dias</option>
              <option value="Este Mês">Este Mês</option>
              <option value="Todo o Período">Todo o Período</option>
            </select>
            <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 text-[10px]">▼</div>
          </div>

          {/* Refresh Button from Image 3 */}
          <button
            onClick={handleRefresh}
            className="w-full sm:w-auto justify-center bg-[#12241b] hover:bg-[#183124] text-[#D9F22A] border border-[#D9F22A]/40 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 cursor-pointer transition-all active:scale-95"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </button>
        </div>
      </div>

      {/* 3. PRIMARY CARDS: Vendas Realizadas & Quantidade de Vendas (Matching Image 3) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Card 1: Vendas Realizadas (Image 3) */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#080d1a] border border-white/10 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-white/20 transition-all"
        >
          <div className="flex items-center justify-between text-white/60 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Vendas Realizadas</span>
            <button onClick={() => setShowValues(!showValues)} className="text-white/40 hover:text-white cursor-pointer">
              {showValues ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white font-['Syne'] tracking-tight">
            {showValues ? `R$ ${(Number(totalFilteredSalesAmount) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '•••••••'}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-[#D9F22A] font-bold mt-2">
            <TrendingUp className="w-3.5 h-3.5" />
            {approvedSalesCount > 0 ? `${approvedSalesCount} vendas liquidadas` : 'Nenhuma venda no período selecionado'}
          </div>
        </motion.div>

        {/* Card 2: Quantidade de Vendas (Image 3) */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-[#080d1a] border border-white/10 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-white/20 transition-all"
        >
          <div className="flex items-center justify-between text-white/60 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Quantidade de Vendas</span>
            <button onClick={() => setShowValues(!showValues)} className="text-white/40 hover:text-white cursor-pointer">
              {showValues ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white font-['Syne'] tracking-tight">
            {showValues ? approvedSalesCount : '••••'}
          </div>
          <div className="text-[11px] text-white/50 mt-2">
            Ticket médio: R$ {(approvedSalesCount > 0 && totalFilteredSalesAmount > 0 ? (totalFilteredSalesAmount / approvedSalesCount) : 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
        </motion.div>

        {/* Card 3: Saldo Disponível & Saque Rápido */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-[#0c1a14] to-[#080d1a] border border-[#D9F22A]/30 rounded-2xl p-5 shadow-lg flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between text-white/70 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider">
                {roleMode === 'empresa' ? 'Saldo Empresa (PIX D+9)' : 'Disponível p/ Saque (PIX D+9)'}
              </span>
              <DollarSign className="w-4 h-4 text-[#D9F22A]" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-[#D9F22A]">
              {showValues ? `R$ ${(Number(userProfile?.availableBalance) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '•••••••'}
            </div>
          </div>
          <button
            onClick={onOpenWithdraw}
            className="mt-3 w-full bg-[#D9F22A] hover:bg-[#c8e217] text-[#060A15] font-black py-2 px-3 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(217,242,42,0.3)]"
          >
            <ArrowUpRight className="w-4 h-4" />
            Sacar via PIX D+9
          </button>
        </motion.div>
      </div>

      {/* 4. MAIN TWO-COLUMN SECTION FROM IMAGE 3: MEIOS DE PAGAMENTO & METRIC BOXES */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8 cols): Meios de Pagamento Table (Exact layout from Image 3) */}
        <div className="lg:col-span-8 bg-[#080d1a] border border-white/10 rounded-2xl p-5 sm:p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
            <h3 className="text-base font-bold text-white font-['Syne'] flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#D9F22A]" />
              Meios de Pagamento
            </h3>
            <span className="text-xs text-white/50">Taxas e Conversão em Tempo Real</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-white/40 border-b border-white/10 uppercase tracking-wider text-[11px]">
                  <th className="pb-3 font-bold">Meios de Pagamento</th>
                  <th className="pb-3 font-bold text-center">Conversão</th>
                  <th className="pb-3 font-bold text-right">
                    <span className="inline-flex items-center gap-1 justify-end">
                      Valor
                      <Eye className="w-3.5 h-3.5 text-white/30" />
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {paymentRows.map((item, idx) => (
                  <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-2.5 flex items-center gap-2.5 font-bold text-white">
                      <div className="w-6 h-6 rounded-lg bg-[#050811] border border-white/10 flex items-center justify-center flex-shrink-0 text-xs">
                        <span className={item.color}>{item.icon}</span>
                      </div>
                      <span className="text-xs">{item.method}</span>
                    </td>
                    <td className="py-2.5 text-center">
                      <span className="px-2.5 py-0.5 rounded-full bg-white/5 text-white/80 font-bold text-[11px]">
                        {item.conversion}
                      </span>
                    </td>
                    <td className="py-2.5 text-right font-bold text-white">
                      {showValues ? `R$ ${item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '••••••'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column (4 cols): The 4 Metric Squares from Image 3 */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3.5">
            {/* Box 1: Abandono C. */}
            <div className="bg-[#080d1a] border border-white/10 rounded-2xl p-4 flex flex-col justify-between shadow-lg">
              <div className="flex items-center justify-between text-white/50 mb-1">
                <span className="text-xs font-bold">Abandono C.</span>
                <Eye className="w-3.5 h-3.5 text-white/30" />
              </div>
              <div className="text-2xl font-black text-white font-['Syne']">
                0
              </div>
              <span className="text-[10px] text-white/40 mt-1">Checkouts abandonados</span>
            </div>

            {/* Box 2: Reembolso */}
            <div className="bg-[#080d1a] border border-white/10 rounded-2xl p-4 flex flex-col justify-between shadow-lg">
              <div className="flex items-center justify-between text-white/50 mb-1">
                <span className="text-xs font-bold">Reembolso</span>
                <Eye className="w-3.5 h-3.5 text-white/30" />
              </div>
              <div className="text-2xl font-black text-emerald-400 font-['Syne']">
                0%
              </div>
              <span className="text-[10px] text-emerald-400/70 mt-1">Taxa de estornos</span>
            </div>

            {/* Box 3: Charge Back */}
            <div className="bg-[#080d1a] border border-white/10 rounded-2xl p-4 flex flex-col justify-between shadow-lg">
              <div className="flex items-center justify-between text-white/50 mb-1">
                <span className="text-xs font-bold">Charge Back</span>
                <Eye className="w-3.5 h-3.5 text-white/30" />
              </div>
              <div className="text-2xl font-black text-emerald-400 font-['Syne']">
                0%
              </div>
              <span className="text-[10px] text-emerald-400/70 mt-1">Contestações bancárias</span>
            </div>

            {/* Box 4: MED */}
            <div className="bg-[#080d1a] border border-white/10 rounded-2xl p-4 flex flex-col justify-between shadow-lg">
              <div className="flex items-center justify-between text-white/50 mb-1">
                <span className="text-xs font-bold">MED</span>
                <Eye className="w-3.5 h-3.5 text-white/30" />
              </div>
              <div className="text-2xl font-black text-emerald-400 font-['Syne']">
                0%
              </div>
              <span className="text-[10px] text-emerald-400/70 mt-1">Mecanismo BACEN</span>
            </div>
          </div>

          {/* Premiações Quick Callout Card matching Image 4 */}
          <div 
            onClick={() => setActiveTab('premiacoes')}
            className="p-4 rounded-2xl bg-gradient-to-r from-[#101c0c] to-[#080d1a] border border-[#D9F22A]/30 cursor-pointer hover:border-[#D9F22A] transition-all group shadow-lg"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#D9F22A]/15 text-[#D9F22A] flex items-center justify-center font-bold">
                  🏆
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#D9F22A] block">Programa de Premiações</span>
                  <span className="text-xs font-bold text-white group-hover:text-[#D9F22A] transition-colors">
                    Ver Marcos & Placas Oficiais
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#D9F22A] group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </div>

      {/* 5. HOURLY TIMELINE GRAPH (From Image 3 bottom: 00:00 to 23:00) */}
      <div className="bg-[#080d1a] border border-white/10 rounded-2xl p-5 sm:p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#D9F22A]" />
            <h3 className="text-sm font-bold text-white font-['Syne']">
              Volume de Vendas por Hora ({selectedPeriod})
            </h3>
          </div>
          <span className="text-[11px] text-white/50">Curva de conversão horária</span>
        </div>

        {/* Timeline SVG Chart */}
        <div className="relative h-44 w-full pt-4">
          <svg className="w-full h-32 overflow-visible" preserveAspectRatio="none" viewBox="0 0 1000 120">
            <defs>
              <linearGradient id="chartGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#D9F22A" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#D9F22A" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Background Grid Lines */}
            <line x1="0" y1="20" x2="1000" y2="20" stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
            <line x1="0" y1="60" x2="1000" y2="60" stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
            <line x1="0" y1="100" x2="1000" y2="100" stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />

            {/* Gradient Area under curve */}
            <path
              d="M 0,110 Q 150,105 300,90 T 600,45 T 850,25 T 1000,110 Z"
              fill="url(#chartGrad)"
            />

            {/* Glowing Sales Curve */}
            <path
              d="M 0,110 Q 150,105 300,90 T 600,45 T 850,25 T 1000,15"
              fill="none"
              stroke="#D9F22A"
              strokeWidth="2.5"
              className="drop-shadow-[0_0_8px_rgba(217,242,42,0.6)]"
            />

            {/* Sample Peak Point */}
            <circle cx="850" cy="25" r="4" fill="#060A15" stroke="#D9F22A" strokeWidth="2.5" />
          </svg>

          {/* Time Labels on X axis */}
          <div className="flex items-center justify-between text-[10px] text-white/40 pt-2 border-t border-white/5">
            {hourlySlots.map((time, idx) => (
              <span key={idx}>{time}</span>
            ))}
          </div>
        </div>
      </div>

      {/* 6. VITRINE PREVIEW & TOP SELLING PLATFORMS */}
      <div className="bg-[#080d1a] border border-white/10 rounded-2xl p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg sm:text-xl font-black text-white font-['Syne']">
              Startups em Alta no Marketplace LeadsPay
            </h3>
            <p className="text-xs text-white/60 mt-0.5">
              Copie seus links de afiliado parametrizados e receba comissões automáticas com liquidação D+9.
            </p>
          </div>
          <button
            onClick={() => setActiveTab('vitrine')}
            className="text-xs font-bold text-[#D9F22A] hover:underline flex items-center gap-1 cursor-pointer"
          >
            Ver catálogo completo ({safePlatforms.length}) →
          </button>
        </div>

        {safePlatforms.length === 0 ? (
          <div className="text-center py-10 px-4 bg-[#050811] rounded-xl border border-white/5">
            <Layers className="w-10 h-10 text-[#D9F22A]/40 mx-auto mb-3" />
            <h4 className="text-sm font-bold text-white">Nenhuma startup ou plano cadastrado ainda</h4>
            <p className="text-xs text-white/50 max-w-sm mx-auto mt-1 mb-4">
              {roleMode === 'afiliado'
                ? 'Aguarde as startups parceiras cadastrarem produtos para começar a se afiliar e gerar vendas.'
                : 'Cadastre sua startup e publique seus primeiros planos para recrutar afiliados e gerar vendas.'}
            </p>
            <button
              onClick={() => setActiveTab(roleMode === 'empresa' ? 'minha_empresa' : 'vitrine')}
              className="bg-[#D9F22A] hover:bg-[#c8e217] text-[#060A15] font-black px-4 py-2 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer inline-flex items-center gap-1.5"
            >
              {roleMode === 'empresa' ? '+ Cadastrar Minha Startup' : 'Ver Marketplace de Startups'}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {safePlatforms.slice(0, 3).map((product) => (
              <div
                key={product.id}
                className="bg-[#050811] border border-white/10 hover:border-[#D9F22A]/50 rounded-xl p-5 flex flex-col justify-between gap-4 transition-all duration-300 group relative overflow-hidden"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-[#D9F22A]/10 text-[#D9F22A] border border-[#D9F22A]/30">
                      {product.category || 'Geral'}
                    </span>
                    <span className="text-[11px] font-bold text-white/60">{product.badge || ''}</span>
                  </div>
                  <h4 className="text-base font-bold text-white font-['Syne'] group-hover:text-[#D9F22A] transition-colors">
                    {product.name}
                  </h4>
                  <p className="text-xs text-white/70 line-clamp-2 mt-1.5 leading-relaxed">
                    {product.description || ''}
                  </p>
                </div>

                <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-white/40 uppercase block">Comissão Direta</span>
                    <span className="text-base font-black text-[#D9F22A]">
                      R$ {(Number(product.commissionValue) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <button
                    onClick={() => onSelectProductDetail(product)}
                    className="px-3.5 py-2 bg-white/5 hover:bg-[#D9F22A] hover:text-[#060A15] text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                  >
                    Promover
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
