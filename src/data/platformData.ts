import { PlatformProduct, SaleTransaction, PaymentMethodStat, UserSellerProfile, WithdrawalRequest } from '../types/platform';

export const INITIAL_USER_PROFILE: UserSellerProfile = {
  name: '',
  firstName: '',
  lastName: '',
  email: '',
  role: 'Afiliado Starter',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
  partnerLevel: 'Afiliado Starter',
  totalEarned: 0.00,
  availableBalance: 0.00,
  pendingBalance: 0.00,
  targetGoal: 100000.00,
  currentSalesProgress: 0.0,
  pixKey: '',
  pixKeyType: 'Chave Aleatória',
  totalSalesCount: 0,
  cpf: '',
  phone: '',
  whatsapp: '',
  cep: '',
  country: 'Brazil',
  state: '',
  city: '',
  address: '',
  verified: false,
  verificationStatus: 'unsubmitted'
};

// Clean zeroed out catalog ready for user registration
export const TECHIFY_PLATFORMS: PlatformProduct[] = [];

// Clean zeroed out sales transactions
export const INITIAL_TRANSACTIONS: SaleTransaction[] = [];

// Clean zeroed out withdrawal requests
export const INITIAL_WITHDRAWALS: WithdrawalRequest[] = [];

// Default zeroed payment statistics
export const INITIAL_PAYMENT_STATS: PaymentMethodStat[] = [
  {
    method: 'PIX Instantâneo',
    count: 0,
    totalValue: 0,
    percentage: 0,
    conversionRate: '0%',
    badge: 'D+0 Direto',
    iconType: 'pix'
  },
  {
    method: 'Cartão de Crédito',
    count: 0,
    totalValue: 0,
    percentage: 0,
    conversionRate: '0%',
    badge: '12x Sem Juros',
    iconType: 'credit-card'
  },
  {
    method: 'PicPay Carteira',
    count: 0,
    totalValue: 0,
    percentage: 0,
    conversionRate: '0%',
    badge: 'QR Code',
    iconType: 'picpay'
  },
  {
    method: 'Crypto USDT (TRC-20)',
    count: 0,
    totalValue: 0,
    percentage: 0,
    conversionRate: '0%',
    badge: 'Global Web3',
    iconType: 'crypto'
  }
];
