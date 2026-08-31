export type UserRoleMode = 'afiliado' | 'empresa';

export interface CompanyStartup {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  logo: string;
  bannerImage: string;
  category: 'SaaS / B2B' | 'iGaming & Apostas' | 'Fintech & Pagamentos' | 'Marketing & Vendas' | 'IA & Automação' | 'Educação / Cursos' | 'E-commerce / Dropship' | string;
  description: string;
  website: string;
  email: string;
  whatsapp?: string;
  totalPlansCount: number;
  totalAffiliatesCount: number;
  totalSalesVolume: number;
  commissionRange: string;
  verified: boolean;
  ownerId?: string;
  createdAt?: string;
}

export interface CompanyPlan {
  id: string;
  companyId: string;
  companyName: string;
  companyLogo: string;
  category: string;
  name: string;
  description: string;
  priceSetup: number;
  priceMonthly: number;
  commissionPercentage: number;
  commissionValue: number;
  recurrentCommissionPercent?: number;
  recurrentCommissionValue?: number;
  recurrentCommission?: number;
  features: string[];
  bannerImage: string;
  affiliatesCount?: number;
  activeSellersCount?: number;
  totalSales: number;
  badge?: string;
  tag?: string;
  slug?: string;
  affiliateCode?: string;
  conversionRate?: string;
  specs?: {
    latency?: string;
    uptime?: string;
    compliance?: string;
    integrationTime?: string;
  };
  checkoutUrl?: string;
  status: 'Ativo' | 'Pausado';
  createdAt?: string;
}

// Retaining PlatformProduct as an alias or extension for compatibility
export type PlatformProduct = CompanyPlan;

export interface UserAffiliation {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  companyId: string;
  companyName: string;
  companyLogo: string;
  planId: string;
  planName: string;
  priceSetup: number;
  commissionPercentage: number;
  commissionValue: number;
  affiliateCode: string;
  affiliateLink: string;
  clicks: number;
  salesCount: number;
  totalEarned: number;
  status: 'Ativo' | 'Pendente';
  createdAt: string;
}

export interface PaymentMethodStat {
  method: string;
  count: number;
  totalValue: number;
  percentage?: number;
  conversionRate: number | string;
  badge?: string;
  iconType: 'pix' | 'credit-card' | 'picpay' | 'crypto' | 'oxxo' | string;
}

export interface SaleTransaction {
  id: string;
  companyId?: string;
  companyName?: string;
  companyLogo?: string;
  platformId: string; // plan id
  platformName: string; // plan name
  buyerName: string;
  buyerEmail: string;
  buyerCompany: string;
  amount: number;
  commissionEarned: number;
  affiliateId?: string;
  affiliateName?: string;
  method: 'PIX' | 'Cartão de Crédito' | 'PicPay' | 'Crypto USDT' | string;
  status: 'Aprovado' | 'Pendente' | 'Cancelado' | string;
  sellerId?: string;
  utmSource?: string;
  date: string;
  time: string;
  createdAt?: string;
}

export interface WithdrawalRequest {
  id: string;
  userId?: string;
  userName?: string;
  amount: number;
  pixKey: string;
  pixKeyType: string;
  status: 'Concluído' | 'Em Análise' | 'Recusado' | string;
  requestedAt: string;
  completedAt?: string;
}

export interface UserSellerProfile {
  userId?: string;
  name: string;
  email: string;
  role: string;
  avatar: string;
  pixKey: string;
  pixKeyType: string;
  availableBalance: number;
  pendingBalance: number;
  totalEarned: number;
  totalSalesCount: number;
  partnerLevel: 'Afiliado Starter' | 'Parceiro Silver' | 'Parceiro Gold' | 'Master Elite Black' | 'Elite Partner' | string;
  targetGoal: number;
  currentSalesProgress: number;
  activeRoleMode?: UserRoleMode;
  updatedAt?: string;
}

export interface AffiliateLinkItem {
  id: string;
  platformId: string;
  platformName: string;
  customSlug: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  fullUrl: string;
  clicks: number;
  conversions: number;
  createdAt: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  salesCount: number;
  commissionGenerated: number;
  bonus: number;
  status: string;
}

export type PlatformTab = 
  | 'dashboard' 
  | 'vitrine' 
  | 'minhas_afiliacoes'
  | 'afiliados' 
  | 'vendas' 
  | 'financeiro' 
  | 'minha_empresa'
  | 'empresas_cadastradas'
  | 'equipe' 
  | 'relatorios' 
  | 'integracoes'
  | 'database';
