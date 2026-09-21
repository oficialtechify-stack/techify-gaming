import React, { useState, useMemo, useRef, useEffect } from 'react';
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
  Layers,
  User,
  ArrowRightLeft,
  LogOut,
  Settings,
  ShieldCheck,
  CheckCircle2,
  HelpCircle,
  HeartHandshake,
  MessageCircle
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
  onSwitchRole?: (role: UserRoleMode) => void;
  onLogout?: () => void;
  selectedPeriod: string;
  setSelectedPeriod: (p: string) => void;
  selectedProductFilter: string;
  setSelectedProductFilter: (p: string) => void;
  selectedTypeFilter: string;
  setSelectedTypeFilter: (t: string) => void;
  userName?: string;
  userAvatar?: string;
  userEmail?: string;
}

// 3D Glowing Wallet Illustration matching the reference screenshots (Green & Purple variants)
interface GlowingWallet3DProps {
  variant?: 'green' | 'purple';
  compact?: boolean;
}

const GlowingWallet3D: React.FC<GlowingWallet3DProps> = ({ variant = 'green', compact = false }) => {
  const isPurple = variant === 'purple';
  return (
    <div className={`relative ${compact ? 'w-11 h-9 sm:w-24 sm:h-20' : 'w-14 h-12 sm:w-32 sm:h-28'} flex items-center justify-center flex-shrink-0 select-none`}>
      {/* Background Volumetric Glow Aura */}
      <div className={`absolute inset-0 ${isPurple ? 'bg-purple-500/25' : 'bg-[#a3e635]/25'} rounded-full blur-xl sm:blur-2xl pointer-events-none transform scale-110`} />
      <div className={`absolute w-12 h-12 sm:w-20 sm:h-20 ${isPurple ? 'bg-fuchsia-500/20' : 'bg-emerald-500/20'} rounded-full blur-lg sm:blur-xl pointer-events-none`} />

      {/* 3D Isometric Leather Wallet SVG */}
      <svg viewBox="0 0 160 140" className="w-full h-full relative z-10 drop-shadow-[0_8px_16px_rgba(0,0,0,0.5)]" fill="none">
        <defs>
          {/* Gradients for leather depth */}
          <linearGradient id={`walletBodyGrad_${variant}`} x1="20%" y1="0%" x2="80%" y2="100%">
            <stop offset="0%" stopColor={isPurple ? '#4c1d95' : '#166534'} />
            <stop offset="40%" stopColor={isPurple ? '#581c87' : '#14532d'} />
            <stop offset="100%" stopColor={isPurple ? '#2e1065' : '#052e16'} />
          </linearGradient>

          <linearGradient id={`walletFlapGrad_${variant}`} x1="0%" y1="20%" x2="100%" y2="80%">
            <stop offset="0%" stopColor={isPurple ? '#9333ea' : '#22c55e'} />
            <stop offset="50%" stopColor={isPurple ? '#7e22ce' : '#15803d'} />
            <stop offset="100%" stopColor={isPurple ? '#2e1065' : '#052e16'} />
          </linearGradient>

          <linearGradient id={`walletHighlightGrad_${variant}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={isPurple ? '#e9d5ff' : '#bef264'} stopOpacity="0.8" />
            <stop offset="100%" stopColor={isPurple ? '#c084fc' : '#84cc16'} stopOpacity="0.1" />
          </linearGradient>

          <linearGradient id={`goldClaspGrad_${variant}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="50%" stopColor="#eab308" />
            <stop offset="100%" stopColor="#ca8a04" />
          </linearGradient>

          <linearGradient id={`strapGrad_${variant}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={isPurple ? '#c084fc' : '#4ade80'} />
            <stop offset="100%" stopColor={isPurple ? '#7e22ce' : '#15803d'} />
          </linearGradient>

          <filter id={`neonGlow_${variant}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Back Wallet Layer / Cash Slot Depth */}
        <path
          d="M 38 48 C 38 38, 48 30, 60 30 L 122 34 C 132 35, 140 43, 140 54 L 138 92 C 138 102, 130 110, 118 108 L 48 98 C 42 97, 38 92, 38 84 Z"
          fill={isPurple ? '#2e1065' : '#052e16'}
          stroke={isPurple ? '#581c87' : '#14532d'}
          strokeWidth="1.5"
        />

        {/* Peeking Credit Card in slot */}
        <path
          d="M 50 38 L 115 42 C 121 42, 126 46, 126 52 L 126 62 L 46 56 L 46 44 C 46 40, 50 38, 50 38 Z"
          fill="#1e293b"
          stroke="#64748b"
          strokeWidth="1"
        />
        <line x1="56" y1="46" x2="90" y2="48" stroke={isPurple ? '#c084fc' : '#a3e635'} strokeWidth="2" strokeLinecap="round" opacity="0.8" />

        {/* Main Front Fold of Wallet (Isometric Perspective) */}
        <path
          d="M 24 56 C 24 44, 34 36, 48 36 L 114 42 C 126 43, 134 52, 134 64 L 130 108 C 130 118, 120 126, 108 126 L 42 120 C 30 119, 22 110, 22 98 Z"
          fill={`url(#walletBodyGrad_${variant})`}
          stroke={isPurple ? '#a855f7' : '#22c55e'}
          strokeWidth="1"
        />

        {/* Wallet Glossy Front Flap with Rounded Bevel */}
        <path
          d="M 24 56 C 24 44, 34 36, 48 36 L 114 42 C 124 43, 132 50, 132 60 L 130 84 C 130 94, 122 102, 110 102 L 36 94 C 28 93, 24 88, 24 80 Z"
          fill={`url(#walletFlapGrad_${variant})`}
          opacity="0.9"
        />

        {/* Glowing Top-Edge Highlight */}
        <path
          d="M 32 42 L 112 47"
          stroke={`url(#walletHighlightGrad_${variant})`}
          strokeWidth="2.5"
          strokeLinecap="round"
          filter={`url(#neonGlow_${variant})`}
        />

        {/* Leather Stitching Details */}
        <path
          d="M 30 60 L 30 94 C 30 104, 36 110, 46 112 L 106 118 C 114 118, 122 112, 122 104 L 124 70"
          stroke={isPurple ? '#c084fc' : '#4ade80'}
          strokeWidth="1"
          strokeDasharray="3 3"
          opacity="0.45"
        />

        {/* Closing Leather Strap / Clasp Tab */}
        <path
          d="M 104 68 L 140 70 C 146 70, 150 76, 149 82 L 148 88 C 147 94, 142 98, 136 98 L 102 94 Z"
          fill={`url(#strapGrad_${variant})`}
          stroke={isPurple ? '#d8b4fe' : '#a3e635'}
          strokeWidth="1"
        />

        {/* Gold Metal Snap Button with Glow */}
        <circle cx="138" cy="84" r="6.5" fill={`url(#goldClaspGrad_${variant})`} stroke="#fef08a" strokeWidth="1" />
        <circle cx="138" cy="84" r="3" fill="#ca8a04" opacity="0.6" />
        <circle cx="136.5" cy="82.5" r="1.5" fill="#ffffff" opacity="0.9" />

        {/* Ambient Sparkles */}
        <circle cx="146" cy="40" r="1.5" fill={isPurple ? '#d8b4fe' : '#bef264'} opacity="0.8" />
        <circle cx="20" cy="85" r="1.2" fill={isPurple ? '#d8b4fe' : '#bef264'} opacity="0.7" />
      </svg>
    </div>
  );
};

// Helper to parse dates safely from transactions
function parseTxDate(t: SaleTransaction): Date {
  if (t.createdAt) {
    const d = new Date(t.createdAt);
    if (!isNaN(d.getTime())) return d;
  }
  if (t.date) {
    const parts = t.date.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      let h = 12, min = 0;
      if (t.time) {
        const [th, tm] = t.time.split(':').map(Number);
        if (!isNaN(th)) h = th;
        if (!isNaN(tm)) min = tm;
      }
      return new Date(y, m, day, h, min);
    }
  }
  return new Date();
}

// Helper to format currency for Y axis ticks
function formatYAxis(val: number): string {
  if (val >= 1000000) {
    return `R$ ${(val / 1000000).toFixed(val % 1000000 === 0 ? 0 : 1).replace('.', ',')} mi`;
  }
  if (val >= 1000) {
    return `R$ ${(val / 1000).toFixed(val % 1000 === 0 ? 0 : 1).replace('.', ',')} mil`;
  }
  if (val === 0) return 'R$ 0';
  return `R$ ${Math.round(val)}`;
}

// Smooth cubic Bézier SVG path generator
function generateSmoothSvgPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return 'M 20,150 L 1000,150';
  if (points.length === 1) return `M ${points[0].x},${points[0].y}`;

  const firstY = points[0].y;
  const isFlat = points.every(p => Math.abs(p.y - firstY) < 0.5);
  if (isFlat) {
    return `M ${points[0].x},${firstY} L ${points[points.length - 1].x},${firstY}`;
  }

  let d = `M ${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? 0 : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${Math.round(cp1x)},${Math.round(cp1y)} ${Math.round(cp2x)},${Math.round(cp2y)} ${Math.round(p2.x)},${Math.round(p2.y)}`;
  }
  return d;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  roleMode = 'empresa',
  userProfile,
  transactions = [],
  paymentStats = [],
  platforms = [],
  setActiveTab,
  onOpenWithdraw,
  onSelectProductDetail,
  onSwitchRole,
  onLogout,
  selectedPeriod = 'Hoje',
  setSelectedPeriod,
  selectedProductFilter = 'all',
  setSelectedProductFilter,
  selectedTypeFilter = 'all',
  setSelectedTypeFilter,
  userName,
  userAvatar,
  userEmail
}) => {
  // Eye visibility state (masks financial values)
  const [showValues, setShowValues] = useState<boolean>(true);

  // Timeframe selector for the chart (1D, 1S, 1M, 6M, 1A) - default 1D matching reference
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('1D');

  // Search filter query
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Dropdown open states
  const [isPeriodMenuOpen, setIsPeriodMenuOpen] = useState<boolean>(false);
  const [isProductMenuOpen, setIsProductMenuOpen] = useState<boolean>(false);

  // Selected chart point for interactive hover
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);

  // Safe user display name
  const displayName = userName || userProfile?.name || 'Marcos Henrique';
  const userInitial = displayName.trim().charAt(0).toUpperCase() || 'M';

  // Real filtered sales calculation based on props and selected period
  const filteredSales = useMemo(() => {
    const now = new Date();
    const todayStr = now.toDateString();

    return transactions.filter(t => {
      // Product filter
      if (selectedProductFilter !== 'all' && t.platformId !== selectedProductFilter && t.plan_id !== selectedProductFilter) {
        return false;
      }
      // Status filter
      if (selectedTypeFilter !== 'all' && t.status !== selectedTypeFilter) {
        return false;
      }
      // Search query
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
      // Period filter (normalized lowercase for robust matching)
      if (selectedPeriod && selectedPeriod.toLowerCase() !== 'todo o período') {
        const d = parseTxDate(t);
        const pNorm = selectedPeriod.toLowerCase();
        if (pNorm === 'hoje') {
          if (d.toDateString() !== todayStr) return false;
        } else if (pNorm === 'ontem') {
          const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          if (d.toDateString() !== yesterday.toDateString()) return false;
        } else if (pNorm === 'últimos 7 dias') {
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          if (d < sevenDaysAgo) return false;
        } else if (pNorm === 'últimos 30 dias') {
          const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          if (d < thirtyDaysAgo) return false;
        } else if (pNorm === 'este mês') {
          if (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear()) return false;
        }
      }
      return true;
    });
  }, [transactions, selectedProductFilter, selectedTypeFilter, searchQuery, selectedPeriod]);

  const totalFilteredSalesAmount = useMemo(() => {
    return filteredSales.reduce((acc, curr) => {
      // Regra de negócio: O valor só aparece no dashboard se for Aprovado ou Liberado.
      // Se for Pendente, Recusado ou Cancelado, não aparece no faturamento.
      const isApproved = curr.status === 'Aprovado' || curr.status === 'Liberado' || (curr as any).status === 'RECEIVED' || (curr as any).status === 'CONFIRMED';
      if (!isApproved) return acc;
      const val = roleMode === 'afiliado' ? (curr.commissionEarned || 0) : (curr.amount || 0);
      return acc + val;
    }, 0);
  }, [filteredSales, roleMode]);

  const approvedSalesCount = useMemo(() => {
    return filteredSales.filter(s => s.status === 'Aprovado' || s.status === 'Liberado' || (s as any).status === 'RECEIVED' || (s as any).status === 'CONFIRMED').length;
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
    const approvedTransactions = filteredSales.filter(s => 
      s.status === 'Aprovado' || s.status === 'Liberado' || (s as any).status === 'RECEIVED' || (s as any).status === 'CONFIRMED'
    );

    let pixVal = 0, pixCount = 0;
    let boletoVal = 0, boletoCount = 0;
    let cardVal = 0, cardCount = 0;
    let pixAutoVal = 0, pixAutoCount = 0;

    approvedTransactions.forEach(s => {
      const val = roleMode === 'afiliado' ? (s.commissionEarned || 0) : (s.amount || 0);
      const m = (s.method || '').toLowerCase();
      if (m.includes('automático') || m.includes('auto')) {
        pixAutoVal += val;
        pixAutoCount++;
      } else if (m.includes('pix')) {
        pixVal += val;
        pixCount++;
      } else if (m.includes('boleto')) {
        boletoVal += val;
        boletoCount++;
      } else if (m.includes('cartão') || m.includes('cartao') || m.includes('credit')) {
        cardVal += val;
        cardCount++;
      }
    });

    const totalApprovedCount = pixCount + boletoCount + cardCount + pixAutoCount;

    return [
      {
        id: 'pix',
        name: 'PIX',
        icon: (
          <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#22d3ee] fill-current" stroke="none">
            <path d="M12 2L6 8l6 6 6-6-6-6zm0 8l-6 6 6 6 6-6-6-6z" />
          </svg>
        ),
        conversion: totalApprovedCount > 0 ? `${Math.round((pixCount / totalApprovedCount) * 100)}%` : '0%',
        value: pixVal
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
        conversion: totalApprovedCount > 0 ? `${Math.round((boletoCount / totalApprovedCount) * 100)}%` : '0%',
        value: boletoVal
      },
      {
        id: 'cartao',
        name: 'Cartão de crédito',
        icon: (
          <CreditCard className="w-4 h-4 text-amber-400" />
        ),
        conversion: totalApprovedCount > 0 ? `${Math.round((cardCount / totalApprovedCount) * 100)}%` : '0%',
        value: cardVal
      },
      {
        id: 'pix_auto',
        name: 'PIX automático',
        icon: (
          <RotateCcw className="w-4 h-4 text-[#22d3ee]" />
        ),
        conversion: totalApprovedCount > 0 ? `${Math.round((pixAutoCount / totalApprovedCount) * 100)}%` : '0%',
        value: pixAutoVal
      }
    ];
  }, [filteredSales, roleMode]);

  // Transaction Statuses for Donut Chart
  const approvedCount = useMemo(() => transactions.filter(t => t.status === 'Aprovado').length, [transactions]);
  const pendingCount = useMemo(() => transactions.filter(t => t.status === 'Pendente').length, [transactions]);
  const rejectedCount = useMemo(() => transactions.filter(t => t.status === 'Recusado' || t.status === 'Cancelado').length, [transactions]);
  const totalCount = approvedCount + pendingCount + rejectedCount;

  const approvedPercent = totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : 0;
  const pendingPercent = totalCount > 0 ? Math.round((pendingCount / totalCount) * 100) : 0;
  const rejectedPercent = totalCount > 0 ? Math.round((rejectedCount / totalCount) * 100) : 0;

  // Dynamic Chart Points based on selectedTimeframe and real filtered sales
  // "nessa outra parte ele vem zerado em linha reta e so sobe e desce assim comforme as vendas dos usuarios"
  const { 
    monthlyChartPoints, 
    chartHasSales, 
    chartCeiling, 
    chartLinePath, 
    chartAreaPath,
    yLabels 
  } = useMemo(() => {
    let intervals: { key: string; label: string; fullLabel: string; filterFn: (d: Date) => boolean }[] = [];
    const now = new Date();
    const currentYear = now.getFullYear();

    if (selectedTimeframe === '1D') {
      // 7 slots across 24h: 00h, 04h, 08h, 12h, 16h, 20h, 23h
      const slots = [
        { hStart: 0, hEnd: 4, label: '00h', full: '00:00 - 04:00' },
        { hStart: 4, hEnd: 8, label: '04h', full: '04:00 - 08:00' },
        { hStart: 8, hEnd: 12, label: '08h', full: '08:00 - 12:00' },
        { hStart: 12, hEnd: 16, label: '12h', full: '12:00 - 16:00' },
        { hStart: 16, hEnd: 20, label: '16h', full: '16:00 - 20:00' },
        { hStart: 20, hEnd: 23, label: '20h', full: '20:00 - 23:00' },
        { hStart: 23, hEnd: 24, label: '23h', full: '23:00 - 23:59' }
      ];
      intervals = slots.map(s => ({
        key: s.label,
        label: s.label,
        fullLabel: `Hoje às ${s.full}`,
        filterFn: (d: Date) => {
          const isToday = d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
          const h = d.getHours();
          return isToday && h >= s.hStart && h < s.hEnd;
        }
      }));
    } else if (selectedTimeframe === '1S') {
      // Last 7 days
      const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      for (let i = 6; i >= 0; i--) {
        const target = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dayLabel = i === 0 ? 'Hoje' : dayNames[target.getDay()];
        const dateStr = target.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        intervals.push({
          key: `day_${i}`,
          label: dayLabel,
          fullLabel: `${dayLabel} (${dateStr})`,
          filterFn: (d: Date) => d.getDate() === target.getDate() && d.getMonth() === target.getMonth() && d.getFullYear() === target.getFullYear()
        });
      }
    } else if (selectedTimeframe === '1M') {
      // 7 interval steps across current month
      const steps = [1, 5, 10, 15, 20, 25, 30];
      intervals = steps.map((dayNum, idx) => {
        const nextDay = steps[idx + 1] || 32;
        return {
          key: `d_${dayNum}`,
          label: `Dia ${dayNum}`,
          fullLabel: `Dia ${dayNum} ao ${nextDay - 1} deste mês`,
          filterFn: (d: Date) => d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && d.getDate() >= dayNum && d.getDate() < nextDay
        };
      });
    } else if (selectedTimeframe === '6M') {
      // Last 6 months
      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      for (let i = 5; i >= 0; i--) {
        const target = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const mIdx = target.getMonth();
        const mYear = target.getFullYear();
        intervals.push({
          key: `m6_${mIdx}_${mYear}`,
          label: monthNames[mIdx],
          fullLabel: `${monthNames[mIdx]} ${mYear}`,
          filterFn: (d: Date) => d.getMonth() === mIdx && d.getFullYear() === mYear
        });
      }
    } else {
      // '1A': 12 months Jan - Dez
      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      intervals = monthNames.map((mName, mIdx) => ({
        key: `m_${mIdx}`,
        label: mName,
        fullLabel: `${mName} ${currentYear}`,
        filterFn: (d: Date) => d.getMonth() === mIdx && d.getFullYear() === currentYear
      }));
    }

    // Coordinates mapping
    const n = intervals.length;
    const xStart = 20;
    const xEnd = 1000;
    const xStep = (xEnd - xStart) / Math.max(1, n - 1);

    const pointsRaw = intervals.map((inv, idx) => {
      let sum = 0;
      filteredSales.forEach((s) => {
        if (s.status !== 'Aprovado' && s.status !== 'Liberado') return;
        const d = parseTxDate(s);
        if (inv.filterFn(d)) {
          const val = roleMode === 'afiliado' ? (s.commissionEarned || 0) : (s.amount || 0);
          sum += val;
        }
      });
      return {
        ...inv,
        rawAmount: sum,
        x: Math.round(xStart + idx * xStep)
      };
    });

    const totalSalesInPeriod = pointsRaw.reduce((acc, p) => acc + p.rawAmount, 0);
    const hasSales = totalSalesInPeriod > 0;
    const maxVal = Math.max(...pointsRaw.map(p => p.rawAmount), 0);

    // Dynamic round ceiling for Y scale
    let ceiling = 20000;
    if (hasSales) {
      if (maxVal <= 100) ceiling = 100;
      else if (maxVal <= 500) ceiling = 500;
      else if (maxVal <= 1000) ceiling = 1000;
      else if (maxVal <= 5000) ceiling = 5000;
      else if (maxVal <= 10000) ceiling = 10000;
      else if (maxVal <= 20000) ceiling = 20000;
      else if (maxVal <= 50000) ceiling = 50000;
      else if (maxVal <= 100000) ceiling = 100000;
      else ceiling = Math.ceil(maxVal * 1.25);
    }

    const calculatedPoints = pointsRaw.map((p, idx) => {
      // When there are no sales, y = 150 (baseline line at R$ 0)
      // When sales exist, y scales between 35 and 150
      const y = hasSales && ceiling > 0
        ? Math.round(150 - (p.rawAmount / ceiling) * 115)
        : 150;

      let growth = '+0,0%';
      if (idx > 0) {
        const prev = pointsRaw[idx - 1].rawAmount;
        if (prev > 0) {
          const diff = ((p.rawAmount - prev) / prev) * 100;
          growth = `${diff >= 0 ? '+' : ''}${diff.toFixed(1).replace('.', ',')}%`;
        } else if (p.rawAmount > 0) {
          growth = '+100,0%';
        }
      }

      const formattedVal = p.rawAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

      return {
        month: p.label,
        label: p.fullLabel,
        value: formattedVal,
        num: p.rawAmount,
        rawAmount: p.rawAmount,
        growth,
        x: p.x,
        y: Math.max(35, Math.min(150, y))
      };
    });

    const linePath = generateSmoothSvgPath(calculatedPoints);
    const lastX = calculatedPoints[calculatedPoints.length - 1]?.x || 1000;
    const firstX = calculatedPoints[0]?.x || 20;
    const areaPath = `${linePath} L ${lastX},155 L ${firstX},155 Z`;

    const labels = hasSales
      ? [
          formatYAxis(ceiling),
          formatYAxis(ceiling * 0.75),
          formatYAxis(ceiling * 0.5),
          formatYAxis(ceiling * 0.25),
          'R$ 0'
        ]
      : ['R$ 20 mil', 'R$ 15 mil', 'R$ 10 mil', 'R$ 5 mil', 'R$ 0'];

    return {
      monthlyChartPoints: calculatedPoints,
      chartHasSales: hasSales,
      chartCeiling: ceiling,
      chartLinePath: linePath,
      chartAreaPath: areaPath,
      yLabels: labels
    };
  }, [selectedTimeframe, filteredSales, roleMode]);

  // Active point: hovered point or highest sales point, or middle point if all zero
  const activePoint = useMemo(() => {
    if (hoveredPointIndex !== null && hoveredPointIndex < monthlyChartPoints.length) {
      return monthlyChartPoints[hoveredPointIndex];
    }
    if (chartHasSales) {
      let maxIdx = 0;
      let maxVal = -1;
      monthlyChartPoints.forEach((p, idx) => {
        if (p.rawAmount > maxVal) {
          maxVal = p.rawAmount;
          maxIdx = idx;
        }
      });
      return monthlyChartPoints[maxIdx] || monthlyChartPoints[0];
    }
    // Middle point default when flat
    const midIdx = Math.floor(monthlyChartPoints.length / 2);
    return monthlyChartPoints[midIdx] || monthlyChartPoints[0];
  }, [hoveredPointIndex, monthlyChartPoints, chartHasSales]);

  // Available balance and Pending balance
  const availableBalance = Number(userProfile?.availableBalance) || 0;
  const pendingBalance = userProfile?.pendingBalance !== undefined
    ? Number(userProfile.pendingBalance)
    : filteredSales.filter(s => s.status === 'pending').reduce((acc, s) => acc + (s.amount || 0), 0);

  return (
    <div className="flex flex-col gap-2.5 sm:gap-6 text-white min-w-0" id="leadspay-dashboard-exact">
      {/* ========================================================================= */}
      {/* 1. TOP HEADER ROW: GREETING & SEARCH & DROPDOWNS & BELL & AVATAR          */}
      {/* ========================================================================= */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 sm:gap-3.5 pb-0.5 sm:pb-1">
        {/* Left: Greeting */}
        <div className="min-w-0">
          <h1 className="text-xl sm:text-3xl font-bold sm:font-black text-white flex items-center gap-1.5 sm:gap-2 font-['Syne'] tracking-tight truncate">
            <span>Olá, {displayName}</span>
            <span className="text-xl sm:text-3xl inline-block origin-bottom-right hover:rotate-12 transition-transform flex-shrink-0">👋</span>
          </h1>
          <p className="text-[11px] sm:text-sm text-gray-400 mt-0.5 font-medium truncate">
            Aqui está o resumo da sua operação hoje.
          </p>
        </div>

        {/* Right: Search, Filter Dropdowns, and Bell + Profile Cluster */}
        <div className="flex items-center flex-wrap lg:flex-nowrap gap-1.5 sm:gap-2.5 justify-end">
          {/* Search bar with pill shape */}
          <div className="relative w-full sm:w-48 md:w-56 lg:w-44 xl:w-56 flex-shrink min-w-[170px]">
            <Search className="w-3.5 h-3.5 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar vendas, produtos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#070d18] hover:bg-[#0a1222] focus:bg-[#0a1222] border border-white/10 focus:border-[#a3e635]/50 rounded-full pl-9 pr-4 py-1.5 sm:py-2 text-xs text-white placeholder-white/40 focus:outline-none transition-all shadow-inner"
            />
          </div>

          {/* Period Filter Dropdown (📅 Hoje v) */}
          <div className="relative flex-shrink-0">
            <button
              onClick={() => {
                setIsPeriodMenuOpen(!isPeriodMenuOpen);
                setIsProductMenuOpen(false);
              }}
              className="flex items-center gap-1.5 bg-[#070d18] hover:bg-[#0c1626] border border-white/10 px-3 py-2 rounded-full text-xs font-semibold text-white transition-colors cursor-pointer shadow-sm whitespace-nowrap"
            >
              <Calendar className="w-3.5 h-3.5 text-white/60 flex-shrink-0" />
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
                      selectedPeriod.toLowerCase() === p.toLowerCase() ? 'bg-[#a3e635] text-[#060A15] font-black' : 'text-white/80 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Filter Dropdown (📦 Todos os produtos v) */}
          <div className="relative flex-shrink-0">
            <button
              onClick={() => {
                setIsProductMenuOpen(!isProductMenuOpen);
                setIsPeriodMenuOpen(false);
              }}
              className="flex items-center gap-1.5 bg-[#070d18] hover:bg-[#0c1626] border border-white/10 px-3 py-2 rounded-full text-xs font-semibold text-white transition-colors cursor-pointer shadow-sm max-w-[170px] sm:max-w-[200px]"
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
        </div>
      </div>

      {/* Banner de Boas-Vindas & Comunidade para Afiliados */}
      {roleMode === 'afiliado' && (
        <div className="rounded-2xl sm:rounded-3xl bg-gradient-to-r from-[#102419] via-[#09130d] to-[#070d18] border border-[#D9F22A]/30 p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#D9F22A]/15 border border-[#D9F22A]/30 flex items-center justify-center text-[#D9F22A] flex-shrink-0 mt-0.5 sm:mt-0">
              <HeartHandshake className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-[#D9F22A] font-['Syne']">
                  SOMOS UMA FAMÍLIA • COMUNIDADE VIP
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-semibold">
                  WhatsApp Oficial
                </span>
              </div>
              <p className="text-xs sm:text-sm text-white/80 mt-1 leading-snug">
                Conecte-se com outros afiliados, monte equipes de vendas, participe das reuniões semanais ao vivo com nossos especialistas e concorra a premiações!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch md:self-auto flex-shrink-0">
            <button
              onClick={() => setActiveTab('comunidade')}
              className="w-full md:w-auto px-4 py-2.5 rounded-xl bg-[#D9F22A] hover:bg-[#c8e224] text-[#060A15] font-black text-xs font-['Syne'] flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(217,242,42,0.25)] active:scale-95 cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 fill-current" />
              <span>Acessar Comunidade</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. MAIN GRID (LEFT: 68% / RIGHT: 32%)                                     */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 sm:gap-6 min-w-0">
        
        {/* --------------------------------------------------------------------- */}
        {/* LEFT COLUMN: HERO SALES + MONTHLY PERFORMANCE + PAYMENT METHODS       */}
        {/* --------------------------------------------------------------------- */}
        <div className="lg:col-span-8 flex flex-col gap-2.5 sm:gap-6 min-w-0">
          
          {/* CARD 1: COMBINED "Visão geral de vendas" + "Desempenho mensal de vendas" */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#050b14] border border-white/10 rounded-2xl sm:rounded-3xl p-2.5 sm:p-7 shadow-2xl relative overflow-hidden backdrop-blur-xl"
          >
            {/* Upper Section: Visão geral de vendas */}
            <div className="mb-3 sm:mb-6">
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="w-5 h-5 rounded-md bg-[#a3e635]/15 flex items-center justify-center text-[#a3e635]">
                    <BarChart2 className="w-3.5 h-3.5" />
                  </div>
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-white/90">
                    Visão geral de vendas
                  </h2>
                </div>
                <button
                  onClick={() => setShowValues(!showValues)}
                  className="text-white/40 hover:text-white transition-colors cursor-pointer p-1"
                  title={showValues ? "Ocultar valores" : "Mostrar valores"}
                >
                  {showValues ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
              </div>

              {/* Three horizontal stats row */}
              <div className="flex flex-wrap items-baseline justify-between sm:justify-start gap-3 sm:gap-12 mt-1 sm:mt-2">
                {/* Stat 1: Total Sales */}
                <div>
                  <div className="text-lg sm:text-4xl font-bold sm:font-black text-white font-['Syne'] tracking-tight">
                    {showValues ? `R$ ${(totalFilteredSalesAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '•••••••'}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] sm:text-xs text-[#a3e635] font-semibold mt-0.5 sm:mt-1">
                    <TrendingUp className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    <span>
                      {approvedSalesCount > 0 
                        ? `${approvedSalesCount} vendas liquidadas` 
                        : 'Nenhuma venda no período'}
                    </span>
                  </div>
                </div>

                {/* Stat 2: Vendas Count */}
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-white/5 flex items-center justify-center text-white/50">
                    <ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                  <div>
                    <div className="text-sm sm:text-2xl font-bold text-white leading-tight">
                      {showValues ? approvedSalesCount : '••'}
                    </div>
                    <span className="text-[10px] sm:text-xs text-gray-400 block">vendas</span>
                  </div>
                </div>

                {/* Stat 3: Ticket Médio */}
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-white/5 flex items-center justify-center text-white/50">
                    <Coins className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                  <div>
                    <div className="text-sm sm:text-2xl font-bold text-white leading-tight">
                      {showValues ? `R$ ${(averageTicket).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '••••'}
                    </div>
                    <span className="text-[10px] sm:text-xs text-gray-400 block">Ticket médio</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Subtle Divider Line */}
            <div className="h-px bg-white/5 my-2 sm:my-5" />

            {/* Lower Section: Desempenho mensal de vendas */}
            <div>
              {/* Header row with Title and Period Switcher (1D, 1S, 1M, 6M, 1A) */}
              <div className="flex items-center justify-between gap-2 mb-2.5 sm:mb-5">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="w-5 h-5 rounded-md bg-[#a3e635]/15 flex items-center justify-center text-[#a3e635]">
                    <BarChart3 className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-white">
                    Desempenho mensal de vendas
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-white/40 hidden md:inline">
                    Evolução ao longo do ano
                  </span>

                  {/* Pills 1D, 1S, 1M, 6M, 1A */}
                  <div className="flex items-center gap-0.5 sm:gap-1 bg-[#040810] border border-white/10 p-0.5 sm:p-1 rounded-lg sm:rounded-xl">
                    {['1D', '1S', '1M', '6M', '1A'].map((horizon) => (
                      <button
                        key={horizon}
                        onClick={() => setSelectedTimeframe(horizon)}
                        className={`px-1.5 sm:px-2.5 py-0.5 rounded-md sm:rounded-lg text-[10px] sm:text-xs font-bold transition-all cursor-pointer ${
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

              {/* Glowing Green Curve Chart Container (max-h-[120px] on mobile to preserve vertical space) */}
              <div className="relative w-full pt-0.5 pb-1 sm:pb-2">
                <div className="flex items-start">
                  {/* Y-Axis Labels dynamically scaled */}
                  <div className="flex flex-col justify-between h-[120px] max-h-[120px] sm:h-44 sm:max-h-none text-[9px] sm:text-[10px] text-gray-400 font-mono text-right pr-1.5 sm:pr-3 select-none flex-shrink-0 w-12 sm:w-16">
                    {yLabels.map((lbl, idx) => (
                      <span key={idx}>{lbl}</span>
                    ))}
                  </div>

                  {/* Main SVG Area with max-h-[120px] */}
                  <div className="relative flex-1 h-[120px] max-h-[120px] sm:h-44 sm:max-h-none select-none touch-pan-x">
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

                      {/* Area Fill under smooth bezier curve or flat baseline */}
                      <path
                        d={chartAreaPath}
                        fill="url(#neonGreenCurveGrad)"
                      />

                      {/* Glowing Line Stroke */}
                      <path
                        d={chartLinePath}
                        fill="none"
                        stroke="#D9F22A"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        filter="url(#glowPath)"
                      />

                      {/* Active / Highlighted Peak point */}
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
                            r="6"
                            fill="#D9F22A"
                            fillOpacity="0.25"
                          />

                          {/* Inner glowing dot */}
                          <circle
                            cx={activePoint.x}
                            cy={activePoint.y}
                            r="4"
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

                    {/* Floating Tooltip Box matching active point */}
                    {activePoint && (
                      <div
                        className="absolute pointer-events-none transition-all duration-200 z-30"
                        style={{
                          left: `${(activePoint.x / 1020) * 100}%`,
                          top: `${(activePoint.y / 160) * 100}%`,
                          transform: 'translate(-50%, -125%)'
                        }}
                      >
                        <div className="bg-[#070c18] border border-white/20 rounded-xl px-2 sm:px-3 py-1 sm:py-1.5 shadow-[0_8px_20px_rgba(0,0,0,0.8)] backdrop-blur-md flex flex-col gap-0.5 whitespace-nowrap">
                          <span className="text-[9px] sm:text-[10px] text-white/50 font-medium">
                            {activePoint.label}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-black text-white font-['Syne']">
                              {activePoint.value}
                            </span>
                            <span className="text-[9px] sm:text-[10px] font-bold text-[#a3e635] bg-[#a3e635]/15 px-1 rounded">
                              {activePoint.growth}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* X-Axis Months Row (Jan - Dez) */}
                <div className="flex items-center justify-between text-[9px] sm:text-[11px] text-gray-400 pl-12 sm:pl-16 pr-1 sm:pr-2 pt-1.5 sm:pt-2 select-none">
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
            className="bg-[#050b14] border border-white/10 rounded-2xl sm:rounded-3xl p-2.5 sm:p-7 shadow-2xl backdrop-blur-xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-2.5 sm:mb-5">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-[#a3e635]/15 flex items-center justify-center text-[#a3e635]">
                  <CreditCard className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-white">
                  Meios de pagamento
                </h3>
              </div>
              <span className="text-[10px] sm:text-[11px] text-gray-400 font-medium">
                Taxas e conversão em tempo real
              </span>
            </div>

            {/* Table with compact py-1.5 px-2 on mobile */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-gray-400 uppercase tracking-wider text-[10px] border-b border-white/5">
                    <th className="pb-1.5 sm:pb-3 font-semibold">Meio de pagamento</th>
                    <th className="pb-1.5 sm:pb-3 font-semibold text-center">Conversão</th>
                    <th className="pb-1.5 sm:pb-3 font-semibold text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {paymentMethodRows.map((row) => (
                    <tr key={row.id} className="hover:bg-white/[0.02] transition-colors group">
                      {/* Name with Icon */}
                      <td className="py-1.5 px-1 sm:py-3.5 sm:px-3 flex items-center gap-2 sm:gap-3 font-medium text-white/90 group-hover:text-white">
                        <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-[#080f1e] border border-white/10 flex items-center justify-center flex-shrink-0">
                          {row.icon}
                        </div>
                        <span className="text-xs sm:text-sm">{row.name}</span>
                      </td>

                      {/* Conversion percentage pill */}
                      <td className="py-1.5 px-1 sm:py-3.5 sm:px-3 text-center">
                        <span className="inline-block px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-[#080f1e] border border-white/10 text-white/80 font-bold text-[10px] sm:text-[11px]">
                          {row.conversion}
                        </span>
                      </td>

                      {/* Value formatted */}
                      <td className="py-1.5 px-1 sm:py-3.5 sm:px-3 text-right font-bold text-white text-xs sm:text-sm">
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
        {/* RIGHT COLUMN: REESTRUTURAÇÃO EM GRID DENSA (2 COLS NO MOBILE)         */}
        {/* --------------------------------------------------------------------- */}
        <div className="lg:col-span-4 flex flex-col gap-2.5 sm:gap-6 min-w-0">

          {/* DENSE 2-COLUMN GRID ON MOBILE: "Disponível para saque" & "Saldo Futuro" lado a lado */}
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-2 sm:gap-6">
            
            {/* CARD 1: "Disponível para saque" */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-[#050b14] border border-white/10 rounded-2xl sm:rounded-3xl p-2.5 sm:p-6 shadow-2xl relative overflow-hidden backdrop-blur-xl flex flex-col justify-between"
            >
              <div>
                {/* Header */}
                <div className="flex items-center justify-between mb-1.5 sm:mb-4">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-md bg-[#a3e635]/15 flex items-center justify-center text-[#a3e635] flex-shrink-0">
                      <Wallet className="w-3.5 h-3.5" />
                    </div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-white truncate">
                      Disponível
                    </h3>
                  </div>

                  <button
                    onClick={() => setShowValues(!showValues)}
                    className="text-white/40 hover:text-white transition-colors cursor-pointer p-0.5 sm:p-1"
                    title={showValues ? "Ocultar valores" : "Mostrar valores"}
                  >
                    {showValues ? <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <EyeOff className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                  </button>
                </div>

                {/* Main Content: Balance on Left, 3D Glowing Wallet on Right */}
                <div className="flex items-center justify-between gap-1 sm:gap-2 mt-0.5 sm:mt-1">
                  <div className="min-w-0">
                    <div className="text-base sm:text-3xl font-bold sm:font-black text-[#D9F22A] font-['Syne'] tracking-tight truncate">
                      {showValues ? `R$ ${availableBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '•••••••'}
                    </div>
                    <div className="text-[9px] sm:text-xs text-gray-400 font-medium mt-0.5 sm:mt-1.5 truncate">
                      <span>Liquidação D+9</span>
                    </div>
                  </div>

                  {/* 3D Glowing Green Wallet */}
                  <GlowingWallet3D variant="green" compact={true} />
                </div>
              </div>

              {/* Button: SACAR VIA PIX (Slim py-2 with text-xs font-bold in neon green) */}
              <button
                onClick={onOpenWithdraw}
                className="mt-2.5 sm:mt-6 w-full bg-[#D9F22A] hover:bg-[#cbe31c] text-[#060A15] font-bold py-2 sm:py-3.5 px-2.5 sm:px-4 rounded-xl sm:rounded-2xl text-[11px] sm:text-xs uppercase tracking-wider flex items-center justify-center gap-1 shadow-[0_0_15px_rgba(217,242,42,0.3)] transition-all cursor-pointer active:scale-95 whitespace-nowrap"
              >
                <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5] flex-shrink-0" />
                <span className="truncate">SACAR VIA PIX</span>
              </button>
            </motion.div>

            {/* CARD 2: "Saldo Futuro" (Matching reference layout with Purple Wallet) */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 }}
              className="bg-[#050b14] border border-white/10 rounded-2xl sm:rounded-3xl p-2.5 sm:p-6 shadow-2xl relative overflow-hidden backdrop-blur-xl flex flex-col justify-between"
            >
              <div>
                {/* Header */}
                <div className="flex items-center justify-between mb-1.5 sm:mb-4">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-md bg-purple-500/15 flex items-center justify-center text-[#c084fc] flex-shrink-0">
                      <Clock className="w-3.5 h-3.5" />
                    </div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-white truncate">
                      Saldo Futuro
                    </h3>
                  </div>

                  <button
                    onClick={() => setShowValues(!showValues)}
                    className="text-white/40 hover:text-white transition-colors cursor-pointer p-0.5 sm:p-1"
                    title={showValues ? "Ocultar valores" : "Mostrar valores"}
                  >
                    {showValues ? <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <EyeOff className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                  </button>
                </div>

                {/* Main Content: Future Balance on Left, Purple Wallet on Right */}
                <div className="flex items-center justify-between gap-1 sm:gap-2 mt-0.5 sm:mt-1">
                  <div className="min-w-0">
                    <div className="text-base sm:text-3xl font-bold sm:font-black text-[#c084fc] font-['Syne'] tracking-tight truncate">
                      {showValues ? `R$ ${pendingBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '•••••••'}
                    </div>
                    <div className="text-[9px] sm:text-xs text-gray-400 font-medium mt-0.5 sm:mt-1.5 truncate">
                      <span>A liberar em D+30</span>
                    </div>
                  </div>

                  {/* 3D Glowing Purple Wallet */}
                  <GlowingWallet3D variant="purple" compact={true} />
                </div>
              </div>

              {/* Secondary button: Ver Carteira / Extrato */}
              <button
                onClick={() => setActiveTab(roleMode === 'empresa' ? 'carteira' : 'vendas')}
                className="mt-2.5 sm:mt-6 w-full bg-white/5 hover:bg-white/10 text-white/90 border border-white/10 font-bold py-2 sm:py-3.5 px-2.5 sm:px-4 rounded-xl sm:rounded-2xl text-[11px] sm:text-xs uppercase tracking-wider flex items-center justify-center gap-1 transition-all cursor-pointer active:scale-95 whitespace-nowrap"
              >
                <span className="truncate">VER EXTRATO</span>
              </button>
            </motion.div>

          </div>

          {/* CARD 3: "Status das transações" with Compact Donut Chart */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-[#050b14] border border-white/10 rounded-2xl sm:rounded-3xl p-2.5 sm:p-6 shadow-2xl backdrop-blur-xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-2.5 sm:mb-5">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-[#a3e635]/15 flex items-center justify-center text-[#a3e635]">
                  <Clock className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-white">
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
            <div className="flex items-center justify-around gap-2 sm:gap-4">
              {/* Donut SVG (compact w-20 h-20 on mobile) */}
              <div className="relative w-20 h-20 sm:w-28 sm:h-28 flex items-center justify-center flex-shrink-0">
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
                  <span className="text-[9px] text-gray-400 font-medium">Total</span>
                  <span className="text-base sm:text-xl font-bold sm:font-black text-white font-['Syne'] leading-tight">
                    {showValues ? totalCount : '••'}
                  </span>
                </div>
              </div>

              {/* Status Legend Breakdown */}
              <div className="flex flex-col gap-1.5 sm:gap-2.5 flex-1 max-w-[150px]">
                {/* Aprovadas (Lime-Yellow) */}
                <div className="flex items-center justify-between text-[11px] sm:text-xs">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-[#D9F22A] flex-shrink-0" />
                    <span className="text-white/80 font-medium">Aprovadas</span>
                  </div>
                  <span className="font-bold text-white">{approvedPercent}%</span>
                </div>

                {/* Pendentes (Lavender) */}
                <div className="flex items-center justify-between text-[11px] sm:text-xs">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-[#c084fc] flex-shrink-0" />
                    <span className="text-white/80 font-medium">Pendentes</span>
                  </div>
                  <span className="font-bold text-white">{pendingPercent}%</span>
                </div>

                {/* Recusadas (Slate-Blue) */}
                <div className="flex items-center justify-between text-[11px] sm:text-xs">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-[#64748b] flex-shrink-0" />
                    <span className="text-white/80 font-medium">Recusadas</span>
                  </div>
                  <span className="font-bold text-white">{rejectedPercent}%</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* CARD 4: "Saúde da operação" with 2x2 Metric Grid */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-[#050b14] border border-white/10 rounded-2xl sm:rounded-3xl p-2.5 sm:p-6 shadow-2xl backdrop-blur-xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-2.5 sm:mb-5">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-[#a3e635]/15 flex items-center justify-center text-[#a3e635]">
                  <Activity className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-white">
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

            {/* 2x2 Metric Grid */}
            <div className="grid grid-cols-2 gap-2 sm:gap-3.5">
              {/* Box 1: Leads & Pendentes / Remarketing */}
              <div 
                onClick={() => setActiveTab('clientes')}
                className="bg-[#070e1c] hover:bg-[#0c1628] border border-white/5 hover:border-[#D9F22A]/30 rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 flex flex-col justify-between cursor-pointer transition-all"
                title="Ver leads e fazer remarketing"
              >
                <div className="flex items-center gap-1 sm:gap-1.5 text-white/60 mb-1 sm:mb-2">
                  <ShoppingCart className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#38bdf8]" />
                  <span className="text-[10px] sm:text-[11px] font-medium text-gray-400 truncate">Leads & Pendentes</span>
                </div>
                <div className="text-base sm:text-2xl font-bold sm:font-black text-[#38bdf8] font-['Syne']">
                  {showValues ? pendingCount : '•'}
                </div>
                <span className="text-[9px] sm:text-[10px] text-[#D9F22A] mt-0.5 sm:mt-1 truncate hover:underline">Remarketing →</span>
              </div>

              {/* Box 2: Reembolso */}
              <div className="bg-[#070e1c] border border-white/5 rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 flex flex-col justify-between">
                <div className="flex items-center gap-1 sm:gap-1.5 text-white/60 mb-1 sm:mb-2">
                  <RotateCcw className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#38bdf8]" />
                  <span className="text-[10px] sm:text-[11px] font-medium text-gray-400 truncate">Reembolso</span>
                </div>
                <div className="text-base sm:text-2xl font-bold sm:font-black text-[#38bdf8] font-['Syne']">
                  {showValues ? '0%' : '•'}
                </div>
                <span className="text-[9px] sm:text-[10px] text-gray-400 mt-0.5 sm:mt-1 truncate">Taxa de estornos</span>
              </div>

              {/* Box 3: Chargeback */}
              <div className="bg-[#070e1c] border border-white/5 rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 flex flex-col justify-between">
                <div className="flex items-center gap-1 sm:gap-1.5 text-white/60 mb-1 sm:mb-2">
                  <Shield className="w-3.5 h-3.5 text-[#38bdf8]" />
                  <span className="text-[10px] sm:text-[11px] font-medium text-gray-400 truncate">Chargeback</span>
                </div>
                <div className="text-base sm:text-2xl font-bold sm:font-black text-[#38bdf8] font-['Syne']">
                  {showValues ? '0%' : '•'}
                </div>
                <span className="text-[9px] sm:text-[10px] text-gray-400 mt-0.5 sm:mt-1 truncate">Contestações</span>
              </div>

              {/* Box 4: MED */}
              <div className="bg-[#070e1c] border border-white/5 rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 flex flex-col justify-between">
                <div className="flex items-center gap-1 sm:gap-1.5 text-white/60 mb-1 sm:mb-2">
                  <Landmark className="w-3.5 h-3.5 text-[#38bdf8]" />
                  <span className="text-[10px] sm:text-[11px] font-medium text-gray-400 truncate">MED</span>
                </div>
                <div className="text-base sm:text-2xl font-bold sm:font-black text-[#38bdf8] font-['Syne']">
                  {showValues ? '0%' : '•'}
                </div>
                <span className="text-[9px] sm:text-[10px] text-gray-400 mt-0.5 sm:mt-1 truncate">BACEN</span>
              </div>
            </div>
          </motion.div>

        </div>

      </div>
    </div>
  );
};
