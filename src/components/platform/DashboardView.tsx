import React, { useState, useMemo } from 'react';
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
  CreditCard, 
  Eye, 
  EyeOff, 
  ArrowUpRight, 
  Search,
  Calendar,
  Package,
  Bell,
  ChevronDown,
  BarChart2,
  BarChart3,
  ShoppingCart,
  Coins,
  Wallet,
  Clock,
  Activity,
  RotateCcw,
  Shield,
  Landmark,
  Layers
} from 'lucide-react';

interface DashboardViewProps {
  roleMode?: UserRoleMode;
  userProfile: UserSellerProfile;
  transactions: SaleTransaction[];
  paymentStats: PaymentMethodStat[];
  platforms: CompanyPlan[];
  setActiveTab: (tab: PlatformTab) => void;
  onOpenWithdraw: () => void;
  onSelectProductDetail: (product: CompanyPlan) => void;
  selectedPeriod: string;
  setSelectedPeriod: (p: string) => void;
  selectedProductFilter: string;
  setSelectedProductFilter: (p: string) => void;
  selectedTypeFilter: string;
  setSelectedTypeFilter: (t: string) => void;
  userName?: string;
  userAvatar?: string;
}

// 3D Glowing Green Wallet Illustration matching the reference screenshot
const GlowingWallet3D: React.FC = () => {
  return (
    <div className="relative w-28 h-24 sm:w-32 sm:h-28 flex items-center justify-center flex-shrink-0 select-none">
      {/* Background Volumetric Green Glow Aura */}
      <div className="absolute inset-0 bg-[#a3e635]/25 rounded-full blur-2xl pointer-events-none transform scale-110" />
      <div className="absolute w-20 h-20 bg-emerald-500/20 rounded-full blur-xl pointer-events-none" />

      {/* 3D Isometric Green Leather Wallet SVG */}
      <svg viewBox="0 0 160 140" className="w-full h-full relative z-10 drop-shadow-[0_12px_24px_rgba(0,0,0,0.6)]" fill="none">
        <defs>
          {/* Gradients for leather depth */}
          <linearGradient id="walletBodyGrad" x1="20%" y1="0%" x2="80%" y2="100%">
            <stop offset="0%" stopColor="#166534" />
            <stop offset="40%" stopColor="#14532d" />
            <stop offset="100%" stopColor="#052e16" />
          </linearGradient>

          <linearGradient id="walletFlapGrad" x1="0%" y1="20%" x2="100%" y2="80%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="50%" stopColor="#15803d" />
            <stop offset="100%" stopColor="#052e16" />
          </linearGradient>

          <linearGradient id="walletHighlightGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#bef264" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#84cc16" stopOpacity="0.1" />
          </linearGradient>

          <linearGradient id="goldClaspGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="50%" stopColor="#eab308" />
            <stop offset="100%" stopColor="#ca8a04" />
          </linearGradient>

          <linearGradient id="strapGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#4ade80" />
            <stop offset="100%" stopColor="#15803d" />
          </linearGradient>

          <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Back Wallet Layer / Cash Slot Depth */}
        <path
          d="M 38 48 C 38 38, 48 30, 60 30 L 122 34 C 132 35, 140 43, 140 54 L 138 92 C 138 102, 130 110, 118 108 L 48 98 C 42 97, 38 92, 38 84 Z"
          fill="#052e16"
          stroke="#14532d"
          strokeWidth="1.5"
        />

        {/* Peeking Credit Card in slot */}
        <path
          d="M 50 38 L 115 42 C 121 42, 126 46, 126 52 L 126 62 L 46 56 L 46 44 C 46 40, 50 38, 50 38 Z"
          fill="#1e293b"
          stroke="#64748b"
          strokeWidth="1"
        />
        <line x1="56" y1="46" x2="90" y2="48" stroke="#a3e635" strokeWidth="2" strokeLinecap="round" opacity="0.8" />

        {/* Main Front Fold of Wallet (Isometric Perspective) */}
        <path
          d="M 24 56 C 24 44, 34 36, 48 36 L 114 42 C 126 43, 134 52, 134 64 L 130 108 C 130 118, 120 126, 108 126 L 42 120 C 30 119, 22 110, 22 98 Z"
          fill="url(#walletBodyGrad)"
          stroke="#22c55e"
          strokeWidth="1"
        />

        {/* Wallet Glossy Front Flap with Rounded Bevel */}
        <path
          d="M 24 56 C 24 44, 34 36, 48 36 L 114 42 C 124 43, 132 50, 132 60 L 130 84 C 130 94, 122 102, 110 102 L 36 94 C 28 93, 24 88, 24 80 Z"
          fill="url(#walletFlapGrad)"
          opacity="0.9"
        />

        {/* Glowing Top-Edge Highlight */}
        <path
          d="M 32 42 L 112 47"
          stroke="url(#walletHighlightGrad)"
          strokeWidth="2.5"
          strokeLinecap="round"
          filter="url(#neonGlow)"
        />

        {/* Leather Stitching Details */}
        <path
          d="M 30 60 L 30 94 C 30 104, 36 110, 46 112 L 106 118 C 114 118, 122 112, 122 104 L 124 70"
          stroke="#4ade80"
          strokeWidth="1"
          strokeDasharray="3 3"
          opacity="0.45"
        />

        {/* Closing Leather Strap / Clasp Tab */}
        <path
          d="M 104 68 L 140 70 C 146 70, 150 76, 149 82 L 148 88 C 147 94, 142 98, 136 98 L 102 94 Z"
          fill="url(#strapGrad)"
          stroke="#a3e635"
          strokeWidth="1"
        />

        {/* Gold Metal Snap Button with Glow */}
        <circle cx="138" cy="84" r="6.5" fill="url(#goldClaspGrad)" stroke="#fef08a" strokeWidth="1" />
        <circle cx="138" cy="84" r="3" fill="#ca8a04" opacity="0.6" />
        <circle cx="136.5" cy="82.5" r="1.5" fill="#ffffff" opacity="0.9" />

        {/* Ambient Sparkles */}
        <circle cx="146" cy="40" r="1.5" fill="#bef264" opacity="0.8" />
        <circle cx="20" cy="85" r="1.2" fill="#bef264" opacity="0.7" />
      </svg>
    </div>
  );
};

export const DashboardView: React.FC<DashboardViewProps> = ({
  roleMode = 'empresa',
  userProfile,
  transactions = [],
  paymentStats = [],
  platforms = [],
  setActiveTab,
  onOpenWithdraw,
  onSelectProductDetail,
  selectedPeriod = 'Hoje',
  setSelectedPeriod,
  selectedProductFilter = 'all',
  setSelectedProductFilter,
  selectedTypeFilter = 'all',
  setSelectedTypeFilter,
  userName,
  userAvatar
}) => {
  // Eye visibility state (masks financial values)
  const [showValues, setShowValues] = useState<boolean>(true);

  // Timeframe selector for the chart (1D, 1S, 1M, 6M, 1A)
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('1A');

  // Search filter query
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Dropdown open states
  const [isPeriodMenuOpen, setIsPeriodMenuOpen] = useState<boolean>(false);
  const [isProductMenuOpen, setIsProductMenuOpen] = useState<boolean>(false);

  // Selected chart point for interactive hover
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number>(5); // Default Jun 2026

  // Safe user display name
  const displayName = userName || userProfile?.name || 'usuário';
  const userInitial = displayName.trim().charAt(0).toUpperCase() || 'L';

  // Real filtered sales calculation based on props
  const filteredSales = useMemo(() => {
    return transactions.filter(t => {
      if (selectedProductFilter !== 'all' && t.platformId !== selectedProductFilter && t.plan_id !== selectedProductFilter) {
        return false;
      }
      if (selectedTypeFilter !== 'all' && t.status !== selectedTypeFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesClient = (t.buyerName || t.customerName || '').toLowerCase().includes(q);
        const matchesProduct = t.platformName?.toLowerCase().includes(q);
        const matchesAffiliate = t.affiliateName?.toLowerCase().includes(q);
        const matchesMethod = t.method?.toLowerCase().includes(q);
        if (!matchesClient && !matchesProduct && !matchesAffiliate && !matchesMethod) {
          return false;
        }
      }
      return true;
    });
  }, [transactions, selectedProductFilter, selectedTypeFilter, searchQuery]);

  const totalFilteredSalesAmount = useMemo(() => {
    return filteredSales.reduce((acc, curr) => {
      const val = roleMode === 'afiliado' ? (curr.commissionEarned || 0) : (curr.amount || 0);
      return acc + val;
    }, 0);
  }, [filteredSales, roleMode]);

  const approvedSalesCount = useMemo(() => {
    return filteredSales.filter(s => s.status === 'Aprovado').length;
  }, [filteredSales]);

  const averageTicket = useMemo(() => {
    if (approvedSalesCount === 0 || totalFilteredSalesAmount === 0) return 0;
    return totalFilteredSalesAmount / approvedSalesCount;
  }, [approvedSalesCount, totalFilteredSalesAmount]);

  // Payment methods table rows matching screenshot
  // 1. PIX
  // 2. Boleto bancário
  // 3. Cartão de crédito
  // 4. PIX automático
  const paymentMethodRows = useMemo(() => {
    const pixData = paymentStats.find(p => p.method.includes('PIX Instantâneo') || p.method === 'PIX') || { totalValue: 0, percentage: 0 };
    const boletoData = paymentStats.find(p => p.method.includes('Boleto')) || { totalValue: 0, percentage: 0 };
    const cardData = paymentStats.find(p => p.method.includes('Cartão')) || { totalValue: 0, percentage: 0 };
    const pixAutoData = paymentStats.find(p => p.method.includes('PIX Automático')) || { totalValue: 0, percentage: 0 };

    return [
      {
        id: 'pix',
        name: 'PIX',
        icon: (
          <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#22d3ee] fill-current" stroke="none">
            <path d="M12 2L6 8l6 6 6-6-6-6zm0 8l-6 6 6 6 6-6-6-6z" />
          </svg>
        ),
        conversion: `${pixData.percentage || 0}%`,
        value: pixData.totalValue || 0
      },
      {
        id: 'boleto',
        name: 'Boleto bancário',
        icon: (
          <svg viewBox="0 0 24 24" className="w-4 h-4 text-white/70" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="4" y="3" width="16" height="18" rx="2" />
            <line x1="8" y1="8" x2="16" y2="8" />
            <line x1="8" y1="12" x2="16" y2="12" />
            <line x1="8" y1="16" x2="12" y2="16" />
          </svg>
        ),
        conversion: `${boletoData.percentage || 0}%`,
        value: boletoData.totalValue || 0
      },
      {
        id: 'cartao',
        name: 'Cartão de crédito',
        icon: (
          <CreditCard className="w-4 h-4 text-amber-400" />
        ),
        conversion: `${cardData.percentage || 0}%`,
        value: cardData.totalValue || 0
      },
      {
        id: 'pix_auto',
        name: 'PIX automático',
        icon: (
          <RotateCcw className="w-4 h-4 text-[#22d3ee]" />
        ),
        conversion: `${pixAutoData.percentage || 0}%`,
        value: pixAutoData.totalValue || 0
      }
    ];
  }, [paymentStats]);

  // Transaction Statuses for Donut Chart
  const approvedCount = useMemo(() => transactions.filter(t => t.status === 'Aprovado').length, [transactions]);
  const pendingCount = useMemo(() => transactions.filter(t => t.status === 'Pendente').length, [transactions]);
  const rejectedCount = useMemo(() => transactions.filter(t => t.status === 'Recusado' || t.status === 'Cancelado').length, [transactions]);
  const totalCount = approvedCount + pendingCount + rejectedCount;

  const approvedPercent = totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : 0;
  const pendingPercent = totalCount > 0 ? Math.round((pendingCount / totalCount) * 100) : 0;
  const rejectedPercent = totalCount > 0 ? Math.round((rejectedCount / totalCount) * 100) : 0;

  // Monthly Sales Chart Data (Jan - Dez)
  // Replicating the exact wave from the reference image
  // Y-Scale: 0 to 20 mil
  const monthlyChartPoints = useMemo(() => [
    { month: 'Jan', label: 'Jan 2026', value: 'R$ 15.800', num: 15.8, x: 20, y: 44, growth: '+5,4%' },
    { month: 'Fev', label: 'Fev 2026', value: 'R$ 12.200', num: 12.2, x: 105, y: 78, growth: '-2,1%' },
    { month: 'Mar', label: 'Mar 2026', value: 'R$ 11.000', num: 11.0, x: 195, y: 90, growth: '+1,8%' },
    { month: 'Abr', label: 'Abr 2026', value: 'R$ 13.400', num: 13.4, x: 285, y: 68, growth: '+4,2%' },
    { month: 'Mai', label: 'Mai 2026', value: 'R$ 14.800', num: 14.8, x: 375, y: 54, growth: '+6,1%' },
    { month: 'Jun', label: 'Jun 2026', value: 'R$ 16.500', num: 16.5, x: 465, y: 38, growth: '+8,2%' }, // Peak in screenshot
    { month: 'Jul', label: 'Jul 2026', value: 'R$ 15.100', num: 15.1, x: 555, y: 50, growth: '-1,4%' },
    { month: 'Ago', label: 'Ago 2026', value: 'R$ 14.000', num: 14.0, x: 645, y: 62, growth: '-0,8%' },
    { month: 'Set', label: 'Set 2026', value: 'R$ 11.500', num: 11.5, x: 735, y: 86, growth: '-3,2%' },
    { month: 'Out', label: 'Out 2026', value: 'R$ 12.400', num: 12.4, x: 825, y: 76, growth: '+2,0%' },
    { month: 'Nov', label: 'Nov 2026', value: 'R$ 8.200', num: 8.2, x: 915, y: 118, growth: '-4,5%' },
    { month: 'Dez', label: 'Dez 2026', value: 'R$ 10.100', num: 10.1, x: 1000, y: 98, growth: '+3,1%' }
  ], []);

  const activePoint = monthlyChartPoints[hoveredPointIndex] || monthlyChartPoints[5];

  // Available balance
  const availableBalance = Number(userProfile?.availableBalance) || 0;

  return (
    <div className="flex flex-col gap-6 text-white min-w-0" id="leadspay-dashboard-exact">
      {/* ========================================================================= */}
      {/* 1. TOP HEADER ROW: GREETING & SEARCH & DROPDOWNS & BELL & AVATAR          */}
      {/* ========================================================================= */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        {/* Left: Greeting */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2 font-['Syne'] tracking-tight">
            <span>Olá, {displayName}</span>
            <span className="text-2xl sm:text-3xl inline-block origin-bottom-right hover:rotate-12 transition-transform">👋</span>
          </h1>
          <p className="text-xs sm:text-sm text-white/50 mt-1 font-medium">
            Aqui está o resumo da sua operação hoje.
          </p>
        </div>

        {/* Right: Search + Filter Dropdowns + Bell + User Avatar */}
        <div className="flex items-center flex-wrap gap-2.5 sm:gap-3">
          {/* Search bar with pill shape */}
          <div className="relative min-w-[220px] sm:min-w-[280px] flex-1 sm:flex-initial">
            <Search className="w-3.5 h-3.5 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar vendas, produtos ou afiliados"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#070d18] hover:bg-[#0a1222] focus:bg-[#0a1222] border border-white/10 focus:border-[#a3e635]/50 rounded-full pl-9 pr-4 py-2 text-xs text-white placeholder-white/40 focus:outline-none transition-all shadow-inner"
            />
          </div>

          {/* Period Filter Dropdown (📅 Hoje v) */}
          <div className="relative">
            <button
              onClick={() => {
                setIsPeriodMenuOpen(!isPeriodMenuOpen);
                setIsProductMenuOpen(false);
              }}
              className="flex items-center gap-2 bg-[#070d18] hover:bg-[#0c1626] border border-white/10 px-3.5 py-2 rounded-full text-xs font-semibold text-white transition-colors cursor-pointer shadow-sm"
            >
              <Calendar className="w-3.5 h-3.5 text-white/60" />
              <span>{selectedPeriod}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-white/40 transition-transform ${isPeriodMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {isPeriodMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-44 bg-[#070d18] border border-white/15 rounded-2xl p-1.5 shadow-2xl z-50 divide-y divide-white/5 backdrop-blur-xl">
                {['Hoje', 'Ontem', 'Últimos 7 dias', 'Últimos 30 dias', 'Este Mês', 'Todo o Período'].map((p) => (
                  <button
                    key={p}
                    onClick={() => {
                      setSelectedPeriod(p);
                      setIsPeriodMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs rounded-xl font-medium transition-colors cursor-pointer ${
                      selectedPeriod === p ? 'bg-[#a3e635] text-[#060A15] font-black' : 'text-white/80 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Filter Dropdown (📦 Todos os produtos v) */}
          <div className="relative">
            <button
              onClick={() => {
                setIsProductMenuOpen(!isProductMenuOpen);
                setIsPeriodMenuOpen(false);
              }}
              className="flex items-center gap-2 bg-[#070d18] hover:bg-[#0c1626] border border-white/10 px-3.5 py-2 rounded-full text-xs font-semibold text-white transition-colors cursor-pointer shadow-sm max-w-[210px]"
            >
              <Package className="w-3.5 h-3.5 text-white/60 flex-shrink-0" />
              <span className="truncate">
                {selectedProductFilter === 'all'
                  ? 'Todos os produtos'
                  : (platforms.find(p => p.id === selectedProductFilter)?.name || 'Produto')}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-white/40 transition-transform flex-shrink-0 ${isProductMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {isProductMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-56 max-h-60 overflow-y-auto bg-[#070d18] border border-white/15 rounded-2xl p-1.5 shadow-2xl z-50 divide-y divide-white/5 backdrop-blur-xl">
                <button
                  onClick={() => {
                    setSelectedProductFilter('all');
                    setIsProductMenuOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-xs rounded-xl font-medium transition-colors cursor-pointer ${
                    selectedProductFilter === 'all' ? 'bg-[#a3e635] text-[#060A15] font-black' : 'text-white/80 hover:text-white hover:bg-white/5'
                  }`}
                >
                  Todos os produtos
                </button>
                {platforms.map((prod) => (
                  <button
                    key={prod.id}
                    onClick={() => {
                      setSelectedProductFilter(prod.id);
                      setIsProductMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs rounded-xl font-medium truncate transition-colors cursor-pointer ${
                      selectedProductFilter === prod.id ? 'bg-[#a3e635] text-[#060A15] font-black' : 'text-white/80 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {prod.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Notification Bell */}
          <button 
            className="relative w-9 h-9 rounded-full bg-[#070d18] hover:bg-[#0c1626] border border-white/10 flex items-center justify-center text-white/70 hover:text-white transition-colors cursor-pointer"
            title="Notificações"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-[#a3e635] animate-pulse" />
          </button>

          {/* User Profile Avatar with Letter Initial */}
          <div 
            className="w-9 h-9 rounded-full bg-[#3b82f6] text-white font-black text-sm flex items-center justify-center shadow-lg border border-white/20 select-none flex-shrink-0"
            title={displayName}
          >
            {userInitial}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. MAIN GRID (LEFT: 68% / RIGHT: 32%)                                     */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 min-w-0">
        
        {/* --------------------------------------------------------------------- */}
        {/* LEFT COLUMN: HERO SALES + MONTHLY PERFORMANCE + PAYMENT METHODS       */}
        {/* --------------------------------------------------------------------- */}
        <div className="lg:col-span-8 flex flex-col gap-5 sm:gap-6 min-w-0">
          
          {/* CARD 1: COMBINED "Visão geral de vendas" + "Desempenho mensal de vendas" */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#050b14] border border-white/10 rounded-3xl p-5 sm:p-7 shadow-2xl relative overflow-hidden backdrop-blur-xl"
          >
            {/* Upper Section: Visão geral de vendas */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-5 h-5 rounded-md bg-[#a3e635]/15 flex items-center justify-center text-[#a3e635]">
                  <BarChart2 className="w-3.5 h-3.5" />
                </div>
                <h2 className="text-xs sm:text-sm font-bold text-white/90">
                  Visão geral de vendas
                </h2>
              </div>

              {/* Three horizontal stats row */}
              <div className="flex flex-wrap items-baseline gap-6 sm:gap-12 mt-2">
                {/* Stat 1: Total Sales */}
                <div>
                  <div className="text-3xl sm:text-4xl font-black text-white font-['Syne'] tracking-tight">
                    {showValues ? `R$ ${(totalFilteredSalesAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '•••••••'}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-[#a3e635] font-semibold mt-1">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>
                      {approvedSalesCount > 0 
                        ? `${approvedSalesCount} vendas liquidadas` 
                        : 'Nenhuma venda no período selecionado'}
                    </span>
                  </div>
                </div>

                {/* Stat 2: Vendas Count */}
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-white/50">
                    <ShoppingCart className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xl sm:text-2xl font-bold text-white leading-tight">
                      {showValues ? approvedSalesCount : '••'}
                    </div>
                    <span className="text-xs text-white/50 block">vendas</span>
                  </div>
                </div>

                {/* Stat 3: Ticket Médio */}
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-white/50">
                    <Coins className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xl sm:text-2xl font-bold text-white leading-tight">
                      {showValues ? `R$ ${(averageTicket).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '••••'}
                    </div>
                    <span className="text-xs text-white/50 block">Ticket médio</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Subtle Divider Line */}
            <div className="h-px bg-white/5 my-5" />

            {/* Lower Section: Desempenho mensal de vendas */}
            <div>
              {/* Header row with Title and Period Switcher (1D, 1S, 1M, 6M, 1A) */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md bg-[#a3e635]/15 flex items-center justify-center text-[#a3e635]">
                    <BarChart3 className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="text-xs sm:text-sm font-bold text-white">
                    Desempenho mensal de vendas
                  </h3>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-white/40 hidden md:inline">
                    Evolução das vendas ao longo do ano
                  </span>

                  {/* Pills 1D, 1S, 1M, 6M, 1A */}
                  <div className="flex items-center gap-1 bg-[#040810] border border-white/10 p-1 rounded-xl">
                    {['1D', '1S', '1M', '6M', '1A'].map((horizon) => (
                      <button
                        key={horizon}
                        onClick={() => setSelectedTimeframe(horizon)}
                        className={`px-2.5 py-0.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          selectedTimeframe === horizon
                            ? 'bg-[#D9F22A] text-[#060A15] shadow-sm font-black'
                            : 'text-white/60 hover:text-white'
                        }`}
                      >
                        {horizon}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Glowing Green Curve Chart Container */}
              <div className="relative w-full pt-1 pb-2">
                <div className="flex items-start">
                  {/* Y-Axis Labels matching screenshot */}
                  <div className="flex flex-col justify-between h-44 text-[10px] text-white/40 pr-3 font-medium text-right select-none flex-shrink-0 w-16">
                    <span>R$ 20 mil</span>
                    <span>R$ 15 mil</span>
                    <span>R$ 10 mil</span>
                    <span>R$ 5 mil</span>
                    <span>R$ 0</span>
                  </div>

                  {/* Main SVG Area */}
                  <div className="relative flex-1 h-44">
                    <svg
                      className="w-full h-full overflow-visible"
                      viewBox="0 0 1020 160"
                      preserveAspectRatio="none"
                    >
                      <defs>
                        {/* Gradient below the curve */}
                        <linearGradient id="neonGreenCurveGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#D9F22A" stopOpacity="0.32" />
                          <stop offset="60%" stopColor="#84cc16" stopOpacity="0.10" />
                          <stop offset="100%" stopColor="#15803d" stopOpacity="0.0" />
                        </linearGradient>

                        {/* Drop shadow for the glowing stroke */}
                        <filter id="glowPath" x="-10%" y="-10%" width="120%" height="120%">
                          <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#D9F22A" floodOpacity="0.75" />
                        </filter>
                      </defs>

                      {/* Horizontal Grid lines */}
                      <line x1="0" y1="5" x2="1020" y2="5" stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
                      <line x1="0" y1="42" x2="1020" y2="42" stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
                      <line x1="0" y1="80" x2="1020" y2="80" stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
                      <line x1="0" y1="118" x2="1020" y2="118" stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
                      <line x1="0" y1="155" x2="1020" y2="155" stroke="rgba(255,255,255,0.05)" />

                      {/* Area Fill under smooth bezier curve */}
                      <path
                        d={`
                          M 20,44 
                          C 60,60 80,75 105,78 
                          C 150,84 170,90 195,90 
                          C 240,90 260,70 285,68 
                          C 330,65 350,56 375,54 
                          C 420,50 440,38 465,38 
                          C 510,38 530,48 555,50 
                          C 600,53 620,60 645,62 
                          C 690,66 710,84 735,86 
                          C 780,90 800,78 825,76 
                          C 870,72 890,116 915,118 
                          C 955,120 975,102 1000,98 
                          L 1000,155 L 20,155 Z
                        `}
                        fill="url(#neonGreenCurveGrad)"
                      />

                      {/* Glowing Line Stroke */}
                      <path
                        d={`
                          M 20,44 
                          C 60,60 80,75 105,78 
                          C 150,84 170,90 195,90 
                          C 240,90 260,70 285,68 
                          C 330,65 350,56 375,54 
                          C 420,50 440,38 465,38 
                          C 510,38 530,48 555,50 
                          C 600,53 620,60 645,62 
                          C 690,66 710,84 735,86 
                          C 780,90 800,78 825,76 
                          C 870,72 890,116 915,118 
                          C 955,120 975,102 1000,98
                        `}
                        fill="none"
                        stroke="#D9F22A"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        filter="url(#glowPath)"
                      />

                      {/* Active / Highlighted Peak at Jun 2026 (or selected point) */}
                      {activePoint && (
                        <>
                          {/* Vertical dashed guideline to axis */}
                          <line
                            x1={activePoint.x}
                            y1={activePoint.y}
                            x2={activePoint.x}
                            y2="155"
                            stroke="#D9F22A"
                            strokeWidth="1.2"
                            strokeDasharray="3 3"
                            opacity="0.8"
                          />

                          {/* Outer pulse circle */}
                          <circle
                            cx={activePoint.x}
                            cy={activePoint.y}
                            r="7"
                            fill="#D9F22A"
                            fillOpacity="0.25"
                          />

                          {/* Inner glowing dot */}
                          <circle
                            cx={activePoint.x}
                            cy={activePoint.y}
                            r="4.5"
                            fill="#D9F22A"
                            stroke="#060A15"
                            strokeWidth="2"
                          />
                        </>
                      )}

                      {/* Invisible hover zones for each month to interact */}
                      {monthlyChartPoints.map((pt, idx) => (
                        <rect
                          key={pt.month}
                          x={pt.x - 30}
                          y="0"
                          width="60"
                          height="160"
                          fill="transparent"
                          className="cursor-pointer"
                          onMouseEnter={() => setHoveredPointIndex(idx)}
                        />
                      ))}
                    </svg>

                    {/* Floating Tooltip Box matching screenshot position (over active point) */}
                    {activePoint && (
                      <div
                        className="absolute pointer-events-none transition-all duration-200 z-30"
                        style={{
                          left: `${(activePoint.x / 1020) * 100}%`,
                          top: `${(activePoint.y / 160) * 100}%`,
                          transform: 'translate(-50%, -125%)'
                        }}
                      >
                        <div className="bg-[#070c18] border border-white/20 rounded-xl px-3 py-1.5 shadow-[0_8px_20px_rgba(0,0,0,0.8)] backdrop-blur-md flex flex-col gap-0.5 whitespace-nowrap">
                          <span className="text-[10px] text-white/50 font-medium">
                            {activePoint.label}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-black text-white font-['Syne']">
                              {activePoint.value}
                            </span>
                            <span className="text-[10px] font-bold text-[#a3e635] bg-[#a3e635]/15 px-1 rounded">
                              {activePoint.growth}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* X-Axis Months Row (Jan - Dez) */}
                <div className="flex items-center justify-between text-[11px] text-white/40 pl-16 pr-2 pt-2 select-none">
                  {monthlyChartPoints.map((pt, idx) => (
                    <button
                      key={pt.month}
                      onClick={() => setHoveredPointIndex(idx)}
                      className={`transition-colors cursor-pointer ${
                        hoveredPointIndex === idx ? 'text-[#D9F22A] font-bold' : 'hover:text-white'
                      }`}
                    >
                      {pt.month}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          {/* CARD 2: "Meios de pagamento" TABLE */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-[#050b14] border border-white/10 rounded-3xl p-5 sm:p-7 shadow-2xl backdrop-blur-xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-[#a3e635]/15 flex items-center justify-center text-[#a3e635]">
                  <CreditCard className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-white">
                  Meios de pagamento
                </h3>
              </div>
              <span className="text-[11px] text-white/40 font-medium">
                Taxas e conversão em tempo real
              </span>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-white/40 uppercase tracking-wider text-[10px] border-b border-white/5">
                    <th className="pb-3 font-semibold">Meio de pagamento</th>
                    <th className="pb-3 font-semibold text-center">Conversão</th>
                    <th className="pb-3 font-semibold text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {paymentMethodRows.map((row) => (
                    <tr key={row.id} className="hover:bg-white/[0.02] transition-colors group">
                      {/* Name with Icon */}
                      <td className="py-3.5 flex items-center gap-3 font-medium text-white/90 group-hover:text-white">
                        <div className="w-7 h-7 rounded-lg bg-[#080f1e] border border-white/10 flex items-center justify-center flex-shrink-0">
                          {row.icon}
                        </div>
                        <span className="text-xs sm:text-sm">{row.name}</span>
                      </td>

                      {/* Conversion percentage pill */}
                      <td className="py-3.5 text-center">
                        <span className="inline-block px-3 py-1 rounded-full bg-[#080f1e] border border-white/10 text-white/80 font-bold text-[11px]">
                          {row.conversion}
                        </span>
                      </td>

                      {/* Value formatted */}
                      <td className="py-3.5 text-right font-bold text-white sm:text-sm">
                        {showValues ? `R$ ${(row.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '••••••'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>

        </div>

        {/* --------------------------------------------------------------------- */}
        {/* RIGHT COLUMN: DISPONÍVEL PARA SAQUE + STATUS DAS TRANSAÇÕES + SAÚDE    */}
        {/* --------------------------------------------------------------------- */}
        <div className="lg:col-span-4 flex flex-col gap-5 sm:gap-6 min-w-0">

          {/* CARD 1: "Disponível para saque" with 3D Glowing Wallet */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-[#050b14] border border-white/10 rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden backdrop-blur-xl flex flex-col justify-between"
          >
            <div>
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md bg-[#a3e635]/15 flex items-center justify-center text-[#a3e635]">
                    <Wallet className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="text-xs sm:text-sm font-bold text-white">
                    Disponível para saque
                  </h3>
                </div>

                <button
                  onClick={() => setShowValues(!showValues)}
                  className="text-white/40 hover:text-white transition-colors cursor-pointer p-1"
                  title={showValues ? "Ocultar valores" : "Mostrar valores"}
                >
                  {showValues ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
              </div>

              {/* Main Content: Balance on Left, 3D Glowing Wallet on Right */}
              <div className="flex items-center justify-between gap-2 mt-1">
                <div>
                  <div className="text-3xl sm:text-4xl font-black text-[#D9F22A] font-['Syne'] tracking-tight">
                    {showValues ? `R$ ${availableBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '•••••••'}
                  </div>
                  <div className="text-xs text-white/50 font-medium mt-1.5 flex items-center gap-1.5">
                    <span>Liquidação PIX D+9</span>
                  </div>
                </div>

                {/* 3D Glowing Green Wallet */}
                <GlowingWallet3D />
              </div>
            </div>

            {/* Bottom Button: SACAR VIA PIX D+9 in Solid Lime Yellow-Green */}
            <button
              onClick={onOpenWithdraw}
              className="mt-6 w-full bg-[#D9F22A] hover:bg-[#cbe31c] text-[#060A15] font-black py-3.5 px-4 rounded-2xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(217,242,42,0.35)] transition-all cursor-pointer active:scale-[0.99]"
            >
              <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
              <span>SACAR VIA PIX D+9</span>
            </button>
          </motion.div>

          {/* CARD 2: "Status das transações" with Donut Chart */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-[#050b14] border border-white/10 rounded-3xl p-5 sm:p-6 shadow-2xl backdrop-blur-xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-[#a3e635]/15 flex items-center justify-center text-[#a3e635]">
                  <Clock className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-white">
                  Status das transações
                </h3>
              </div>

              <button
                onClick={() => setShowValues(!showValues)}
                className="text-white/40 hover:text-white transition-colors cursor-pointer p-1"
                title={showValues ? "Ocultar valores" : "Mostrar valores"}
              >
                {showValues ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
            </div>

            {/* Donut Chart & Legend */}
            <div className="flex items-center justify-around gap-4">
              {/* Donut SVG */}
              <div className="relative w-28 h-28 flex items-center justify-center flex-shrink-0">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  {/* Background Track */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="transparent"
                    stroke="#131c2e"
                    strokeWidth="12"
                  />

                  {/* If there are approved sales, render segment */}
                  {totalCount > 0 && approvedPercent > 0 && (
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      fill="transparent"
                      stroke="#D9F22A"
                      strokeWidth="12"
                      strokeDasharray={`${(approvedPercent / 100) * 238.7} 238.7`}
                      strokeLinecap="round"
                    />
                  )}

                  {/* If there are pending sales */}
                  {totalCount > 0 && pendingPercent > 0 && (
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      fill="transparent"
                      stroke="#c084fc"
                      strokeWidth="12"
                      strokeDasharray={`${(pendingPercent / 100) * 238.7} 238.7`}
                      strokeDashoffset={`-${(approvedPercent / 100) * 238.7}`}
                      strokeLinecap="round"
                    />
                  )}
                </svg>

                {/* Donut Center: Total & Count */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] text-white/40 font-medium">Total</span>
                  <span className="text-xl font-black text-white font-['Syne'] leading-tight">
                    {showValues ? totalCount : '••'}
                  </span>
                </div>
              </div>

              {/* Status Legend Breakdown */}
              <div className="flex flex-col gap-2.5 flex-1 max-w-[150px]">
                {/* Aprovadas (Lime-Yellow) */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#D9F22A] flex-shrink-0" />
                    <span className="text-white/80 font-medium">Aprovadas</span>
                  </div>
                  <span className="font-bold text-white">{approvedPercent}%</span>
                </div>

                {/* Pendentes (Lavender) */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#c084fc] flex-shrink-0" />
                    <span className="text-white/80 font-medium">Pendentes</span>
                  </div>
                  <span className="font-bold text-white">{pendingPercent}%</span>
                </div>

                {/* Recusadas (Slate-Blue) */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#64748b] flex-shrink-0" />
                    <span className="text-white/80 font-medium">Recusadas</span>
                  </div>
                  <span className="font-bold text-white">{rejectedPercent}%</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* CARD 3: "Saúde da operação" with 2x2 Metric Grid */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-[#050b14] border border-white/10 rounded-3xl p-5 sm:p-6 shadow-2xl backdrop-blur-xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-[#a3e635]/15 flex items-center justify-center text-[#a3e635]">
                  <Activity className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-white">
                  Saúde da operação
                </h3>
              </div>

              <button
                onClick={() => setShowValues(!showValues)}
                className="text-white/40 hover:text-white transition-colors cursor-pointer p-1"
                title={showValues ? "Ocultar valores" : "Mostrar valores"}
              >
                {showValues ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
            </div>

            {/* 2x2 Metric Grid matching screenshot */}
            <div className="grid grid-cols-2 gap-3.5">
              {/* Box 1: Abandono de checkout */}
              <div className="bg-[#070e1c] border border-white/5 rounded-2xl p-3.5 flex flex-col justify-between">
                <div className="flex items-center gap-1.5 text-white/60 mb-2">
                  <ShoppingCart className="w-3.5 h-3.5 text-[#38bdf8]" />
                  <span className="text-[11px] font-medium truncate">Abandono de checkout</span>
                </div>
                <div className="text-xl sm:text-2xl font-black text-[#38bdf8] font-['Syne']">
                  {showValues ? '0' : '•'}
                </div>
                <span className="text-[10px] text-white/40 mt-1 truncate">Checkouts abandonados</span>
              </div>

              {/* Box 2: Reembolso */}
              <div className="bg-[#070e1c] border border-white/5 rounded-2xl p-3.5 flex flex-col justify-between">
                <div className="flex items-center gap-1.5 text-white/60 mb-2">
                  <RotateCcw className="w-3.5 h-3.5 text-[#38bdf8]" />
                  <span className="text-[11px] font-medium truncate">Reembolso</span>
                </div>
                <div className="text-xl sm:text-2xl font-black text-[#38bdf8] font-['Syne']">
                  {showValues ? '0%' : '•'}
                </div>
                <span className="text-[10px] text-white/40 mt-1 truncate">Taxa de estornos</span>
              </div>

              {/* Box 3: Chargeback */}
              <div className="bg-[#070e1c] border border-white/5 rounded-2xl p-3.5 flex flex-col justify-between">
                <div className="flex items-center gap-1.5 text-white/60 mb-2">
                  <Shield className="w-3.5 h-3.5 text-[#38bdf8]" />
                  <span className="text-[11px] font-medium truncate">Chargeback</span>
                </div>
                <div className="text-xl sm:text-2xl font-black text-[#38bdf8] font-['Syne']">
                  {showValues ? '0%' : '•'}
                </div>
                <span className="text-[10px] text-white/40 mt-1 truncate">Contestações bancárias</span>
              </div>

              {/* Box 4: MED */}
              <div className="bg-[#070e1c] border border-white/5 rounded-2xl p-3.5 flex flex-col justify-between">
                <div className="flex items-center gap-1.5 text-white/60 mb-2">
                  <Landmark className="w-3.5 h-3.5 text-[#38bdf8]" />
                  <span className="text-[11px] font-medium truncate">MED</span>
                </div>
                <div className="text-xl sm:text-2xl font-black text-[#38bdf8] font-['Syne']">
                  {showValues ? '0%' : '•'}
                </div>
                <span className="text-[10px] text-white/40 mt-1 truncate">Mecanismo BACEN</span>
              </div>
            </div>
          </motion.div>

        </div>

      </div>
    </div>
  );
};
