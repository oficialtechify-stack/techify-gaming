import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  UserSellerProfile, 
  SaleTransaction, 
  PaymentMethodStat, 
  CompanyPlan, 
  PlatformTab 
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
  Layers
} from 'lucide-react';

interface DashboardViewProps {
  roleMode?: 'afiliado' | 'empresa';
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
  const [activeBannerSlide, setActiveBannerSlide] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 700);
  };

  // Filter transactions based on filters
  const filteredTransactions = transactions.filter(t => {
    if (selectedProductFilter !== 'all' && t.platformId !== selectedProductFilter) return false;
    if (selectedTypeFilter !== 'all' && t.status !== selectedTypeFilter) return false;
    return true;
  });

  const totalFilteredSalesAmount = filteredTransactions.reduce((acc, t) => acc + (t.status === 'Aprovado' ? t.amount : 0), 0);
  const totalFilteredCommission = filteredTransactions.reduce((acc, t) => acc + (t.status === 'Aprovado' ? t.commissionEarned : 0), 0);
  const approvedSalesCount = filteredTransactions.filter(t => t.status === 'Aprovado').length;

  const latestSale = transactions[0];

  return (
    <div className="flex flex-col gap-6" id="techify-dashboard-view">
      {/* 1. TOP CAROUSEL & REAL-TIME SALE NOTIFICATION TICKER */}
      <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-r from-[#070c18] via-[#0b1424] to-[#070c18] p-4 sm:p-6 shadow-2xl">
        {/* Subtle Neon Backlight */}
        <div className="absolute -top-10 -right-10 w-72 h-72 bg-[#D9F22A]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-center justify-between gap-6 relative z-10">
          {/* Live Notification Pill */}
          <div className="w-full lg:max-w-md bg-[#050811]/90 border border-white/10 rounded-2xl p-4 flex items-center gap-4 shadow-xl backdrop-blur-md">
            <div className="w-12 h-12 rounded-xl bg-[#D9F22A]/20 border border-[#D9F22A]/40 flex items-center justify-center flex-shrink-0">
              <Zap className="w-6 h-6 text-[#D9F22A]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-white tracking-wide truncate">
                  {latestSale ? `Última Venda: ${latestSale.method}` : 'Sistema de Afiliados Conectado'}
                </span>
                <span className="text-[10px] text-white/50 uppercase">{latestSale ? latestSale.time : 'Online'}</span>
              </div>
              <p className="text-xs text-white/70 truncate">
                {latestSale ? `${latestSale.platformName} (${latestSale.buyerCompany})` : (platforms.length > 0 ? `${platforms.length} plataformas ativas no catálogo` : 'Cadastre sua primeira plataforma para começar')}
              </p>
              <div className="text-sm font-black text-[#D9F22A] mt-0.5">
                {latestSale ? `Comissão creditada: R$ ${latestSale.commissionEarned.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'Comissões de 30% a 50% via PIX D+0'}
              </div>
            </div>
          </div>

          {/* Center Promo Headline & Action */}
          <div className="text-center lg:text-left flex flex-col items-center lg:items-start gap-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D9F22A]/10 border border-[#D9F22A]/30 text-[11px] font-bold text-[#D9F22A] uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              PAINEL REAL DE VENDAS & AFILIADOS
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white font-['Syne']">
              Gestão de Vendas & Comissões B2B
            </h3>
            <p className="text-xs text-white/70 max-w-lg">
              {roleMode === 'afiliado'
                ? 'Afilie-se a startups parceiras, compartilhe seus links exclusivos e receba comissões automáticas via PIX instantâneo D+0.'
                : 'Publique suas soluções de software, gerencie sua rede de afiliados e acompanhe seus contratos fechados.'}
            </p>
          </div>

          {/* Action Button: Registrar / Vender */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 w-full sm:w-auto">
            <button
              onClick={onOpenSimulateSale}
              className="bg-[#D9F22A] hover:bg-[#c8e217] text-[#060A15] font-black px-5 py-3 rounded-xl text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(217,242,42,0.35)] transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <Zap className="w-4 h-4 fill-current" />
              Registrar Nova Venda
            </button>
            <button
              onClick={() => setActiveTab('vitrine')}
              className="bg-white/5 hover:bg-white/10 text-white font-bold px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider border border-white/10 transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <Layers className="w-4 h-4 text-[#D9F22A]" />
              {roleMode === 'afiliado' ? 'Marketplace de Startups' : 'Ver Catálogo Completo'}
            </button>
          </div>
        </div>
      </div>

      {/* 2. FILTER BAR (Dashboard Title + Selectors like Cakto) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#080d1a] border border-white/10 p-4 sm:p-5 rounded-2xl">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black text-white font-['Syne']">
              Dashboard
            </h1>
            <button
              onClick={() => setShowValues(!showValues)}
              className="text-white/50 hover:text-[#D9F22A] transition-colors p-1"
              title={showValues ? "Ocultar valores" : "Mostrar valores"}
            >
              {showValues ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
            </button>
          </div>
          <p className="text-[11px] text-white/50 mt-1 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            Última atualização: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:flex md:flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Tipo Filter */}
          <div className="relative w-full sm:w-auto">
            <select
              value={selectedTypeFilter}
              onChange={(e) => setSelectedTypeFilter(e.target.value)}
              className="w-full bg-[#050811] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#D9F22A] cursor-pointer appearance-none pr-8"
            >
              <option value="all">Tipo: Todos os Status</option>
              <option value="Aprovado">Aprovados</option>
              <option value="Pendente">Pendentes</option>
            </select>
            <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 text-xs">▼</div>
          </div>

          {/* Produtos Filter */}
          <div className="relative w-full sm:w-auto">
            <select
              value={selectedProductFilter}
              onChange={(e) => setSelectedProductFilter(e.target.value)}
              className="w-full bg-[#050811] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#D9F22A] cursor-pointer appearance-none pr-8 md:max-w-[200px] truncate"
            >
              <option value="all">Produtos: Todas as Plataformas</option>
              {platforms.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 text-xs">▼</div>
          </div>

          {/* Período Filter */}
          <div className="relative w-full sm:w-auto">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="w-full bg-[#050811] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#D9F22A] cursor-pointer appearance-none pr-8"
            >
              <option value="Hoje">Período: Hoje</option>
              <option value="Ontem">Ontem</option>
              <option value="Últimos 7 dias">Últimos 7 dias</option>
              <option value="Últimos 30 dias">Últimos 30 dias</option>
              <option value="Este Mês">Este Mês</option>
              <option value="Todo o Período">Todo o Período</option>
            </select>
            <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 text-xs">▼</div>
          </div>

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            className="w-full sm:w-auto justify-center bg-[#12241b] hover:bg-[#183124] text-[#D9F22A] border border-[#D9F22A]/40 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 cursor-pointer transition-all active:scale-95"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>
      </div>

      {/* 3. BIG PRIMARY CARDS (Vendas Realizadas & Quantidade de Vendas) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Vendas Realizadas (Gross Sales) */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#080d1a] border-l-4 border-l-[#D9F22A] border-y border-r border-white/10 rounded-xl p-5 shadow-lg relative overflow-hidden group hover:border-white/20 transition-all"
        >
          <div className="flex items-center justify-between text-white/60 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Volume de Vendas</span>
            <button onClick={() => setShowValues(!showValues)} className="text-white/40 hover:text-white">
              {showValues ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white font-['Syne'] tracking-tight">
            {showValues ? `R$ ${totalFilteredSalesAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '•••••••'}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-[#D9F22A] font-bold mt-2">
            <TrendingUp className="w-3.5 h-3.5" />
            {approvedSalesCount > 0 ? `${approvedSalesCount} vendas liquidadas` : 'Aguardando primeiras vendas'}
          </div>
        </motion.div>

        {/* Card 2: Quantidade de Vendas */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-[#080d1a] border-l-4 border-l-[#D9F22A] border-y border-r border-white/10 rounded-xl p-5 shadow-lg relative overflow-hidden group hover:border-white/20 transition-all"
        >
          <div className="flex items-center justify-between text-white/60 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Quantidade de Vendas</span>
            <button onClick={() => setShowValues(!showValues)} className="text-white/40 hover:text-white">
              {showValues ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white font-['Syne'] tracking-tight">
            {showValues ? approvedSalesCount : '••••'}
          </div>
          <div className="text-[11px] text-white/50 mt-2">
            Ticket médio: R$ {(approvedSalesCount > 0 ? (totalFilteredSalesAmount / approvedSalesCount) : 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
        </motion.div>

        {/* Card 3: Suas Comissões Totais */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[#080d1a] border-l-4 border-l-[#D9F22A] border-y border-r border-white/10 rounded-xl p-5 shadow-lg relative overflow-hidden group hover:border-white/20 transition-all"
        >
          <div className="flex items-center justify-between text-white/60 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#D9F22A]">Suas Comissões</span>
            <span className="px-2 py-0.5 rounded text-[10px] bg-[#D9F22A]/10 text-[#D9F22A] font-bold">
              {totalFilteredSalesAmount > 0 ? `${Math.round((totalFilteredCommission / totalFilteredSalesAmount) * 100)}% méd.` : '0%'}
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#D9F22A] font-['Syne'] tracking-tight">
            {showValues ? `R$ ${totalFilteredCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '•••••••'}
          </div>
          <div className="text-[11px] text-white/60 mt-2">
            Saldo acumulado de vendas
          </div>
        </motion.div>

        {/* Card 4: Saldo Disponível & Saque Rápido */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-gradient-to-br from-[#0c1a14] to-[#080d1a] border border-[#D9F22A]/30 rounded-xl p-5 shadow-lg flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between text-white/70 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider">Disponível p/ Saque</span>
              <DollarSign className="w-4 h-4 text-[#D9F22A]" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-white">
              {showValues ? `R$ ${userProfile.availableBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '•••••••'}
            </div>
          </div>
          <button
            onClick={onOpenWithdraw}
            className="mt-3 w-full bg-[#D9F22A] hover:bg-[#c8e217] text-[#060A15] font-black py-2 px-3 rounded-lg text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(217,242,42,0.3)]"
          >
            <ArrowUpRight className="w-4 h-4" />
            Sacar via PIX
          </button>
        </motion.div>
      </div>

      {/* 4. MAIN DATA GRID: MEIOS DE PAGAMENTO & TAXAS DE CONVERSÃO / RISCO */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8 cols): Meios de Pagamento Table (Matches Cakto layout) */}
        <div className="lg:col-span-8 bg-[#080d1a] border border-white/10 rounded-2xl p-5 sm:p-6 shadow-xl">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base sm:text-lg font-bold text-white font-['Syne'] flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-[#D9F22A]" />
              Meios de Pagamento
            </h3>
            <span className="text-xs text-white/50">Taxa de Conversão em Tempo Real</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-white/40 border-b border-white/10 uppercase tracking-wider">
                  <th className="pb-3 font-bold">Meios de Pagamento</th>
                  <th className="pb-3 font-bold text-center">Conversão</th>
                  <th className="pb-3 font-bold text-right">
                    <span className="inline-flex items-center gap-1">
                      Valor
                      <Eye className="w-3.5 h-3.5" />
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {paymentStats.map((item, idx) => (
                  <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 flex items-center gap-3 font-bold text-white">
                      {/* Icon */}
                      <div className="w-7 h-7 rounded-lg bg-[#050811] border border-white/10 flex items-center justify-center flex-shrink-0">
                        {item.iconType === 'pix' && <span className="text-[#D9F22A] font-black text-xs">❖</span>}
                        {item.iconType === 'credit-card' && <CreditCard className="w-3.5 h-3.5 text-white/80" />}
                        {item.iconType === 'picpay' && <span className="text-emerald-400 font-black text-xs">P</span>}
                        {item.iconType === 'crypto' && <span className="text-yellow-400 font-black text-xs">₮</span>}
                        {item.iconType === 'oxxo' && <span className="text-orange-400 font-bold text-[10px]">OX</span>}
                      </div>
                      <span>{item.method}</span>
                    </td>
                    <td className="py-3.5 text-center">
                      <span className="px-2.5 py-1 rounded-full bg-white/5 text-white font-bold">
                        {item.conversionRate}%
                      </span>
                    </td>
                    <td className="py-3.5 text-right font-bold text-white">
                      {showValues ? `R$ ${item.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '••••••'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column (4 cols): Risk & Security KPIs (Matches Cakto layout) */}
        <div className="lg:col-span-4 bg-[#080d1a] border border-white/10 rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <h3 className="text-base font-bold text-white font-['Syne'] flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#D9F22A]" />
              Métricas de Segurança
            </h3>
            <span className="text-[10px] text-[#D9F22A] font-bold bg-[#D9F22A]/10 px-2 py-0.5 rounded">Risco Zero</span>
          </div>

          <div className="flex flex-col gap-4">
            {/* Abandono de Checkout */}
            <div className="flex items-center justify-between py-2 border-b border-white/5">
              <div>
                <span className="text-xs text-white/60 block">Abandono C.</span>
                <span className="text-xl font-bold text-white">0%</span>
              </div>
              <Eye className="w-4 h-4 text-white/30" />
            </div>

            {/* Reembolso */}
            <div className="flex items-center justify-between py-2 border-b border-white/5">
              <div>
                <span className="text-xs text-white/60 block">Reembolso</span>
                <span className="text-xl font-bold text-emerald-400">0%</span>
              </div>
              <Eye className="w-4 h-4 text-white/30" />
            </div>

            {/* Charge Back */}
            <div className="flex items-center justify-between py-2 border-b border-white/5">
              <div>
                <span className="text-xs text-white/60 block">Charge Back</span>
                <span className="text-xl font-bold text-emerald-400">0%</span>
              </div>
              <Eye className="w-4 h-4 text-white/30" />
            </div>

            {/* MED (Mecanismo Especial de Devolução) */}
            <div className="flex items-center justify-between py-2">
              <div>
                <span className="text-xs text-white/60 block">MED (Mecanismo BACEN)</span>
                <span className="text-xl font-bold text-emerald-400">0%</span>
              </div>
              <Eye className="w-4 h-4 text-white/30" />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#050811] border border-white/5 text-[11px] text-white/60 leading-relaxed">
            🛡️ <strong className="text-white">Garantia Techify:</strong> Todas as plataformas possuem compliance estrito, proteção antifraude e liquidação garantida ao vendedor parceiro.
          </div>
        </div>
      </div>

      {/* 5. VITRINE PREVIEW & TOP SELLING PLATFORMS */}
      <div className="bg-[#080d1a] border border-white/10 rounded-2xl p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg sm:text-xl font-black text-white font-['Syne']">
              Plataformas em Alta para Revenda & Afiliação
            </h3>
            <p className="text-xs text-white/60 mt-0.5">
              Copie seu link de afiliado ou apresente a proposta para operadores de iGaming e receba comissões imediatas.
            </p>
          </div>
          <button
            onClick={() => setActiveTab('vitrine')}
            className="text-xs font-bold text-[#D9F22A] hover:underline flex items-center gap-1 cursor-pointer"
          >
            Ver catálogo completo ({platforms.length}) →
          </button>
        </div>

        {platforms.length === 0 ? (
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
            {platforms.slice(0, 3).map((product) => (
              <div
                key={product.id}
                className="bg-[#050811] border border-white/10 hover:border-[#D9F22A]/50 rounded-xl p-5 flex flex-col justify-between gap-4 transition-all duration-300 group relative overflow-hidden"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-[#D9F22A]/10 text-[#D9F22A] border border-[#D9F22A]/30">
                      {product.category}
                    </span>
                    <span className="text-[11px] font-bold text-white/60">{product.badge}</span>
                  </div>
                  <h4 className="text-base font-bold text-white font-['Syne'] group-hover:text-[#D9F22A] transition-colors">
                    {product.name}
                  </h4>
                  <p className="text-xs text-white/70 line-clamp-2 mt-1.5 leading-relaxed">
                    {product.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-white/40 uppercase block">Comissão Direta</span>
                    <span className="text-base font-black text-[#D9F22A]">
                      R$ {product.commissionValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
