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
  cnpj?: string;
  cleanCnpj?: string;
  cpf?: string;
  cleanCpf?: string;
  hasNoCnpj?: boolean;
  docType?: 'CNPJ' | 'CPF' | 'SEM_CNPJ';
  totalPlansCount: number;
  totalAffiliatesCount: number;
  totalSalesVolume: number;
  commissionRange: string;
  verified: boolean;
  status?: 'pending' | 'approved' | 'rejected';
  submittedBy?: string;
  submittedByName?: string;
  submittedByEmail?: string;
  submittedAt?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  ownerId?: string;
  createdAt?: string;
}

export interface ProductOrderBump {
  id: string;
  name: string;
  description: string;
  price: number;
  active: boolean;
  image?: string;
}

export interface ProductUpsell {
  id: string;
  name: string;
  description: string;
  price: number;
  active: boolean;
}

export interface ProductCoupon {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  active: boolean;
  usedCount?: number;
}

export interface ProductCustomCheckout {
  id: string;
  name: string;
  isDefault: boolean;
  price: number;
  offerName: string;
  visitsCount: number;
  salesCount: number;
  checkoutSlug: string;
  bannerImage?: string;
  timerMinutes?: number;
  buttonText?: string;
}

export interface ProductReview {
  id: string;
  author: string;
  rating: number;
  comment: string;
  date: string;
  verifiedBuyer?: boolean;
}

export interface CompanyPlan {
  id: string;
  companyId: string;
  companyName: string;
  companyLogo: string;
  category: string;
  name: string;
  tagline?: string;
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
  paymentType?: 'Único' | 'Recorrente' | 'Assinatura';
  supportEmail?: string;
  warrantyDays?: number;
  thankYouPageUrl?: string;
  orderBumps?: ProductOrderBump[];
  upsells?: ProductUpsell[];
  coupons?: ProductCoupon[];
  customCheckouts?: ProductCustomCheckout[];
  reviews?: ProductReview[];
  affiliatesCount?: number;
  activeSellersCount?: number;
  totalSales: number;
  badge?: string;
  tag?: string;
  slug?: string;
  checkoutSlug?: string;
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
  affiliateName?: string;
  userEmail: string;
  companyId: string;
  companyName: string;
  companyLogo: string;
  planId: string;
  planName: string;
  platformName?: string;
  priceSetup: number;
  commissionPercentage: number;
  commissionValue: number;
  affiliateCode: string;
  affiliateLink: string;
  clicks: number;
  clicksCount?: number;
  salesCount: number;
  totalEarned: number;
  totalCommissionEarned?: number;
  status: 'Ativo' | 'Pendente';
  createdAt: string;
  affiliatedAt?: string;
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
  customerName?: string;
  buyerEmail: string;
  buyerCompany: string;
  amount: number;
  commissionEarned: number;
  checkoutFee?: number; // R$ 0.99 taxa da plataforma Techify
  netCompanyAmount?: number; // amount - commissionEarned - checkoutFee
  releaseStatus?: 'pendente' | 'disponivel'; // Regra de liberação de 9 dias
  availableAt?: string; // Data prevista para liberação (data + 9 dias)
  releasedAt?: string;
  affiliateId?: string;
  affiliateName?: string;
  method: 'PIX' | 'Cartão de Crédito' | 'PicPay' | 'Crypto USDT' | string;
  status: 'Aprovado' | 'Pendente' | 'Cancelado' | string;
  sellerId?: string;
  utmSource?: string;
  date: string;
  time: string;
  createdAt?: string;
  timestamp?: string;
}

export interface WithdrawalRequest {
  id: string;
  userId?: string;
  userName?: string;
  amount: number; // Valor total solicitado
  feeAmount?: number; // R$ 2.50 taxa fixa de saque Pix
  netAmount?: number; // Valor transferido = amount - feeAmount
  pixKey: string;
  pixKeyType: string;
  status: 'pendente_processamento' | 'concluido' | 'recusado' | 'Concluído' | 'Em Análise' | 'Recusado' | string;
  requestedAt: string;
  completedAt?: string;
  endToEndId?: string; // ID E2E do PIX Mercado Pago / Bacen
  mpTransferId?: string;
  failureReason?: string;
}

export interface PlatformFinances {
  id?: string;
  totalPlatformRevenue: number;
  totalCheckoutFees: number;
  totalWithdrawalFees: number;
  totalSalesProcessed: number;
  totalWithdrawalsProcessed: number;
  lastUpdated: string;
}

export interface UserSellerProfile {
  id?: string;
  userId?: string;
  name: string;
  firstName?: string;
  lastName?: string;
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
  hasAffiliateProfile?: boolean;
  hasCompanyProfile?: boolean;
  activeRoleMode?: UserRoleMode;
  whatsapp?: string;
  phone?: string;
  cpf?: string;
  cleanCpf?: string;
  cnpj?: string;
  cleanCnpj?: string;
  companyId?: string;
  companyName?: string;
  companyLegalName?: string;
  companyCnpj?: string;
  companyCategory?: string;
  companyTagline?: string;
  companyWebsite?: string;
  companyLogo?: string;
  companyPhone?: string;
  companyAddress?: string;
  companyCep?: string;
  companyState?: string;
  companyCity?: string;
  companyCountry?: string;
  companyDocType?: 'CNPJ' | 'CPF' | 'SEM_CNPJ';
  verificationRoleType?: 'afiliado' | 'empresa';
  cep?: string;
  country?: string;
  state?: string;
  city?: string;
  address?: string;
  verified?: boolean;
  verificationStatus?: 'unsubmitted' | 'pending' | 'approved' | 'rejected';
  verificationSubmittedAt?: string;
  verificationReviewedAt?: string;
  verificationRejectionReason?: string;
  updatedAt?: string;
}

export interface VerificationRequest {
  id: string;
  userId: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  cpf: string;
  phone: string;
  avatar: string;
  roleType?: 'afiliado' | 'empresa';
  companyName?: string;
  companyLegalName?: string;
  companyCnpj?: string;
  companyCategory?: string;
  companyTagline?: string;
  companyWebsite?: string;
  companyLogo?: string;
  companyPhone?: string;
  companyAddress?: string;
  companyCep?: string;
  companyState?: string;
  companyCity?: string;
  companyCountry?: string;
  companyDocType?: 'CNPJ' | 'CPF' | 'SEM_CNPJ';
  cep?: string;
  country?: string;
  state?: string;
  city?: string;
  address?: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  submittedAt: string;
  reviewedAt?: string;
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
  | 'carteira'
  | 'meu_perfil'
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
