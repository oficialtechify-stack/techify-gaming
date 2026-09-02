import React, { useState, useEffect } from 'react';
import { 
  PlatformTab, 
  CompanyStartup,
  CompanyPlan,
  PlatformProduct, 
  UserAffiliation,
  SaleTransaction, 
  UserSellerProfile, 
  PaymentMethodStat, 
  WithdrawalRequest,
  UserRoleMode
} from '../../types/platform';
import { 
  INITIAL_USER_PROFILE, 
  INITIAL_PAYMENT_STATS 
} from '../../data/platformData';
import { 
  seedFirestoreIfEmpty,
  subscribeUserProfile,
  subscribeCompanies,
  subscribePlans,
  subscribeUserAffiliations,
  subscribeSales,
  subscribeWithdrawals,
  createCompanyInFirebase,
  deleteCompanyInFirebase,
  createCompanyPlanInFirebase,
  updateCompanyPlanInFirebase,
  deleteCompanyPlanInFirebase,
  createAffiliationInFirebase,
  deleteAffiliationInFirebase,
  createSaleTransactionInFirebase,
  createWithdrawalInFirebase,
  updateUserProfileInFirebase,
  submitVerificationRequestInFirebase
} from '../../services/firestoreService';
import { DashboardView } from './DashboardView';
import { VitrineView } from './VitrineView';
import { MinhaEmpresaView } from './MinhaEmpresaView';
import { MinhasAfiliacoesView } from './MinhasAfiliacoesView';
import { AfiliadosView } from './AfiliadosView';
import { VendasView } from './VendasView';
import { FinanceiroView } from './FinanceiroView';
import { EquipeView } from './EquipeView';
import { RelatoriosView } from './RelatoriosView';
import { IntegracoesView } from './IntegracoesView';
import { DatabaseManagerView } from './DatabaseManagerView';
import { MeuPerfilView } from './MeuPerfilView';
import { CreateCompanyModal } from './CreateCompanyModal';
import { RegisterAffiliateModal } from './RegisterAffiliateModal';
import { CreatePlanModal } from './CreatePlanModal';
import { RegisterSaleModal } from './RegisterSaleModal';
import { WithdrawModal } from './WithdrawModal';
import { ProductDetailModal } from './ProductDetailModal';
import { Modals } from '../Modals';
import { ActiveModal } from '../../types';
import { completeAffiliateProfile } from '../../services/authService';
import { 
  LayoutDashboard, 
  Store, 
  Layers, 
  Receipt, 
  Wallet, 
  BarChart3, 
  Users, 
  Network, 
  Database,
  Search, 
  Bell, 
  Moon, 
  Sun,
  ChevronLeft, 
  ChevronRight, 
  ExternalLink,
  Zap,
  Sparkles,
  Cloud,
  Building2,
  UserCheck,
  Link2,
  Plus,
  ShoppingBag,
  ArrowRightLeft,
  LogOut,
  User,
  CheckCircle2,
  GraduationCap,
  Menu,
  X
} from 'lucide-react';
import { TechifyLogo } from '../TechifyLogo';
import { useAuth } from '../../context/AuthContext';

interface PlatformLayoutProps {
  onBackToHome: () => void;
}

export const PlatformLayout: React.FC<PlatformLayoutProps> = ({ onBackToHome }) => {
  const { currentUser, userProfile, userRole, setUserRole, logout } = useAuth();
  const [roleMode, setRoleMode] = useState<UserRoleMode>(userRole || 'afiliado');
  const [activeTab, setActiveTab] = useState<PlatformTab>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  
  // Realtime Database Collections
  const [companies, setCompanies] = useState<CompanyStartup[]>([]);
  const [plans, setPlans] = useState<CompanyPlan[]>([]);
  const [affiliations, setAffiliations] = useState<UserAffiliation[]>([]);
  const [transactions, setTransactions] = useState<SaleTransaction[]>([]);
  const [paymentStats, setPaymentStats] = useState<PaymentMethodStat[]>(INITIAL_PAYMENT_STATS);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [dbConnected, setDbConnected] = useState<boolean>(false);

  // Filter states
  const [selectedPeriod, setSelectedPeriod] = useState<string>('Hoje');
  const [selectedProductFilter, setSelectedProductFilter] = useState<string>('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');

  // Modals state
  const [isRegisterAffiliateModalOpen, setIsRegisterAffiliateModalOpen] = useState<boolean>(false);
  const [isCreateCompanyModalOpen, setIsCreateCompanyModalOpen] = useState<boolean>(false);
  const [isCreatePlanModalOpen, setIsCreatePlanModalOpen] = useState<boolean>(false);
  const [editingPlan, setEditingPlan] = useState<CompanyPlan | null>(null);
  const [isRegisterSaleModalOpen, setIsRegisterSaleModalOpen] = useState<boolean>(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState<boolean>(false);
  const [selectedPlanForSale, setSelectedPlanForSale] = useState<string | undefined>(undefined);
  const [selectedDetailProduct, setSelectedDetailProduct] = useState<CompanyPlan | null>(null);
  const [companyAuthModal, setCompanyAuthModal] = useState<ActiveModal>(null);

  // Live Toast Notification
  const [liveToast, setLiveToast] = useState<{ message: string; sub: string; amount: string } | null>(null);

  // Topbar Dropdown & Theme state
  const [isUserMenuOpen, setIsUserMenuOpen] = useState<boolean>(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);

  // Role Security & Tab Guard
  useEffect(() => {
    if (roleMode === 'afiliado' && (activeTab === 'minha_empresa' || activeTab === 'equipe' || activeTab === 'integracoes')) {
      setActiveTab('dashboard');
    } else if (roleMode === 'empresa' && (activeTab === 'minhas_afiliacoes' || activeTab === 'afiliados' || activeTab === 'relatorios')) {
      setActiveTab('minha_empresa');
    }
  }, [roleMode, activeTab]);

  // Robust Role Switcher with Mandatory Registration
  const handleSwitchRole = (targetRole: UserRoleMode) => {
    if (targetRole === roleMode) return;

    if (targetRole === 'afiliado') {
      const hasAffiliate = userProfile?.hasAffiliateProfile || (userProfile?.cpf && userProfile?.cleanCpf?.length === 11);
      if (!hasAffiliate) {
        setIsRegisterAffiliateModalOpen(true);
        return;
      }
      setRoleMode('afiliado');
      setUserRole('afiliado');
      if (activeTab === 'minha_empresa' || activeTab === 'equipe' || activeTab === 'integracoes') {
        setActiveTab('dashboard');
      }
      setLiveToast({
        message: 'Modo Afiliado Ativado',
        sub: 'Painel de comissões e marketplace',
        amount: 'Afiliado'
      });
      setTimeout(() => setLiveToast(null), 3000);
    } else if (targetRole === 'empresa') {
      const userOwnedCompanies = companies.filter(c => c.ownerId === currentUser?.uid || c.id === userProfile?.companyId);
      const hasCompany = userProfile?.hasCompanyProfile || userOwnedCompanies.length > 0 || !!userProfile?.companyId;
      if (!hasCompany) {
        setCompanyAuthModal('register_company');
        return;
      }
      setRoleMode('empresa');
      setUserRole('empresa');
      if (activeTab === 'minhas_afiliacoes' || activeTab === 'afiliados' || activeTab === 'relatorios') {
        setActiveTab('minha_empresa');
      }
      setLiveToast({
        message: 'Modo Empresa Ativado',
        sub: 'Gestão de soluções e planos corporativos',
        amount: 'Empresa'
      });
      setTimeout(() => setLiveToast(null), 3000);
    }
  };

  const handleCompleteAffiliateProfile = async (data: {
    name: string;
    cpf: string;
    pixKey: string;
    pixKeyType: string;
    whatsapp?: string;
  }) => {
    if (!currentUser?.uid) return;
    await completeAffiliateProfile(currentUser.uid, data);
    setRoleMode('afiliado');
    setUserRole('afiliado');
    setActiveTab('dashboard');
    setLiveToast({
      message: 'Cadastro de Afiliado Concluído!',
      sub: 'Conta ativada com repasse PIX D+0',
      amount: 'Sucesso'
    });
    setTimeout(() => setLiveToast(null), 4500);
  };

  // Realtime Firebase Subscriptions on mount
  useEffect(() => {
    // 1. Initial Firestore check / seed
    seedFirestoreIfEmpty().then(() => {
      setDbConnected(true);
    });

    // 2. Realtime listener for Companies
    const unsubCompanies = subscribeCompanies((compList) => {
      setCompanies(compList);
    });

    // 4. Realtime listener for Plans / Products
    const unsubPlans = subscribePlans((planList) => {
      setPlans(planList);
    });

    // 5. Realtime listener for User Affiliations
    const unsubAffiliations = subscribeUserAffiliations((affList) => {
      setAffiliations(affList);
    });

    // 6. Realtime listener for Sales Transactions
    const unsubSales = subscribeSales((salesList) => {
      setTransactions(salesList);

      // Recompute payment stats dynamically from sales in Firestore
      let pixVal = 0, pixCount = 0;
      let cardVal = 0, cardCount = 0;
      let picpayVal = 0, picpayCount = 0;
      let cryptoVal = 0, cryptoCount = 0;

      salesList.forEach((s) => {
        if (s.method === 'PIX') { pixVal += s.amount; pixCount++; }
        else if (s.method === 'Cartão de Crédito') { cardVal += s.amount; cardCount++; }
        else if (s.method === 'PicPay') { picpayVal += s.amount; picpayCount++; }
        else if (s.method === 'Crypto USDT') { cryptoVal += s.amount; cryptoCount++; }
      });

      const totalCount = pixCount + cardCount + picpayCount + cryptoCount;
      const totalVol = pixVal + cardVal + picpayVal + cryptoVal || (totalCount > 0 ? 1 : 0);

      setPaymentStats([
        {
          method: 'PIX Instantâneo',
          count: pixCount,
          totalValue: pixVal,
          percentage: totalVol > 0 ? Number(((pixVal / totalVol) * 100).toFixed(1)) : 0,
          conversionRate: totalCount > 0 ? `${((pixCount / totalCount) * 100).toFixed(1)}%` : '0%',
          badge: 'D+0 Direto',
          iconType: 'pix'
        },
        {
          method: 'Cartão de Crédito',
          count: cardCount,
          totalValue: cardVal,
          percentage: totalVol > 0 ? Number(((cardVal / totalVol) * 100).toFixed(1)) : 0,
          conversionRate: totalCount > 0 ? `${((cardCount / totalCount) * 100).toFixed(1)}%` : '0%',
          badge: '12x Sem Juros',
          iconType: 'credit-card'
        },
        {
          method: 'PicPay Carteira',
          count: picpayCount,
          totalValue: picpayVal,
          percentage: totalVol > 0 ? Number(((picpayVal / totalVol) * 100).toFixed(1)) : 0,
          conversionRate: totalCount > 0 ? `${((picpayCount / totalCount) * 100).toFixed(1)}%` : '0%',
          badge: 'QR Code',
          iconType: 'picpay'
        },
        {
          method: 'Crypto USDT (TRC-20)',
          count: cryptoCount,
          totalValue: cryptoVal,
          percentage: totalVol > 0 ? Number(((cryptoVal / totalVol) * 100).toFixed(1)) : 0,
          conversionRate: totalCount > 0 ? `${((cryptoCount / totalCount) * 100).toFixed(1)}%` : '0%',
          badge: 'Global Web3',
          iconType: 'crypto'
        }
      ]);
    });

    // 7. Realtime listener for Withdrawals
    const unsubWith = subscribeWithdrawals((withList) => {
      setWithdrawals(withList);
    });

    return () => {
      unsubCompanies();
      unsubPlans();
      unsubAffiliations();
      unsubSales();
      unsubWith();
    };
  }, []);

  // Handle Join Affiliate (1 Click)
  const handleJoinAffiliate = async (plan: CompanyPlan) => {
    // Check if user has verified profile
    const isVerified = userProfile.verified || userProfile.verificationStatus === 'approved';
    if (!isVerified) {
      setLiveToast({
        message: 'Afiliação bloqueada: perfil não verificado',
        sub: 'Preencha seus dados em "Meu Perfil" para aprovação do admin',
        amount: 'Bloqueado'
      });
      setTimeout(() => setLiveToast(null), 4500);
      return;
    }

    try {
      const aff = await createAffiliationInFirebase(plan, userProfile);
      setLiveToast({
        message: 'Afiliação realizada com sucesso!',
        sub: `${plan.name} (${plan.companyName})`,
        amount: `${plan.commissionPercentage}% de comissão`
      });
      setTimeout(() => setLiveToast(null), 4500);
    } catch (err: any) {
      console.error('Error joining affiliate:', err);
      alert(`Erro ao se afiliar: ${err.message}`);
    }
  };

  // Handle create company (sent to admin for approval)
  const handleCreateCompany = async (companyData: Omit<CompanyStartup, 'id' | 'createdAt'>) => {
    try {
      const created = await createCompanyInFirebase(companyData);
      setRoleMode('empresa');
      setUserRole('empresa');
      setActiveTab('minha_empresa');
      setLiveToast({
        message: 'Empresa enviada para análise do Admin!',
        sub: `${created.name} cadastrada e aguardando aprovação`,
        amount: 'Em Análise'
      });
      setTimeout(() => setLiveToast(null), 5000);
    } catch (err: any) {
      console.error('Error creating company in Firestore:', err);
      alert(`Erro ao cadastrar empresa: ${err.message}`);
    }
  };

  // Handle delete company
  const handleDeleteCompany = async (companyId: string) => {
    if (!confirm('Deseja realmente remover esta empresa e seus planos?')) return;
    try {
      await deleteCompanyInFirebase(companyId);
      setLiveToast({
        message: 'Empresa removida com sucesso',
        sub: 'Registro excluído',
        amount: 'Concluído'
      });
      setTimeout(() => setLiveToast(null), 3000);
    } catch (err: any) {
      console.error('Error deleting company:', err);
      alert(`Erro ao excluir: ${err.message}`);
    }
  };

  // Handle create plan
  const handleCreatePlan = async (planData: Omit<CompanyPlan, 'id' | 'createdAt'>) => {
    try {
      const created = await createCompanyPlanInFirebase(planData);
      setLiveToast({
        message: 'Novo plano criado e liberado para afiliados!',
        sub: created.name,
        amount: `R$ ${created.priceSetup.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      });
      setTimeout(() => setLiveToast(null), 4000);
    } catch (err: any) {
      console.error('Error creating plan:', err);
      alert(`Erro ao cadastrar plano: ${err.message}`);
    }
  };

  // Handle update plan
  const handleUpdatePlan = async (planId: string, updates: Partial<CompanyPlan>) => {
    try {
      await updateCompanyPlanInFirebase(planId, updates);
      setLiveToast({
        message: 'Plano atualizado com sucesso!',
        sub: updates.name || 'Alterações salvas',
        amount: 'Atualizado'
      });
      setTimeout(() => setLiveToast(null), 4000);
    } catch (err: any) {
      console.error('Error updating plan:', err);
      alert(`Erro ao atualizar plano: ${err.message}`);
    }
  };

  // Handle delete plan
  const handleDeletePlan = async (planId: string, companyId?: string) => {
    if (!confirm('Deseja realmente excluir este plano?')) return;
    try {
      await deleteCompanyPlanInFirebase(planId, companyId);
      setLiveToast({
        message: 'Plano removido com sucesso',
        sub: 'Catálogo atualizado',
        amount: 'Removido'
      });
      setTimeout(() => setLiveToast(null), 3000);
    } catch (err: any) {
      console.error('Error deleting plan:', err);
      alert(`Erro ao excluir plano: ${err.message}`);
    }
  };

  // Handle delete affiliation
  const handleDeleteAffiliation = async (affId: string, planId?: string, companyId?: string) => {
    if (!confirm('Deseja cancelar sua afiliação a este plano?')) return;
    try {
      await deleteAffiliationInFirebase(affId, planId, companyId);
      setLiveToast({
        message: 'Afiliação cancelada',
        sub: 'Item removido dos seus links',
        amount: 'OK'
      });
      setTimeout(() => setLiveToast(null), 3000);
    } catch (err: any) {
      console.error('Error removing affiliation:', err);
    }
  };

  // Handle new sale registered
  const handleSaleCreated = async (newSale: SaleTransaction) => {
    try {
      const saved = await createSaleTransactionInFirebase({
        companyId: newSale.companyId,
        companyName: newSale.companyName,
        platformId: newSale.platformId,
        platformName: newSale.platformName,
        buyerName: newSale.buyerName,
        buyerEmail: newSale.buyerEmail,
        buyerCompany: newSale.buyerCompany,
        amount: newSale.amount,
        commissionEarned: newSale.commissionEarned,
        method: newSale.method,
        status: newSale.status,
        utmSource: newSale.utmSource || 'direto',
        date: newSale.date,
        time: newSale.time,
        sellerId: 'usr_techify_main',
        affiliateId: 'usr_techify_main'
      });

      // Trigger toast
      setLiveToast({
        message: `Venda aprovada com sucesso (${saved.method})!`,
        sub: `${saved.platformName} - Comissão creditada`,
        amount: `+ R$ ${saved.commissionEarned.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      });

      setTimeout(() => {
        setLiveToast(null);
      }, 5000);
    } catch (err: any) {
      console.error('Error saving sale:', err);
      alert(`Erro ao salvar venda: ${err.message}`);
    }
  };

  // Handle withdrawal
  const handleWithdraw = async (amount: number, pixKey: string, pixKeyType: string) => {
    try {
      await createWithdrawalInFirebase(amount, pixKey, pixKeyType, currentUser?.uid, userProfile.name);
      setLiveToast({
        message: 'Saque PIX D+0 processado com sucesso!',
        sub: `Chave ${pixKey} (${pixKeyType})`,
        amount: `- R$ ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      });
      setTimeout(() => setLiveToast(null), 4500);
    } catch (err: any) {
      console.error('Error creating withdrawal:', err);
      alert(`Erro no saque PIX: ${err.message}`);
    }
  };

  // Handle save profile
  const handleSaveProfile = async (updates: Partial<UserSellerProfile>) => {
    try {
      await updateUserProfileInFirebase(updates, currentUser?.uid);
      setLiveToast({
        message: 'Perfil atualizado com sucesso!',
        sub: 'Dados salvos no Firebase',
        amount: 'OK'
      });
      setTimeout(() => setLiveToast(null), 3500);
    } catch (err: any) {
      console.error('Error updating profile in Firebase:', err);
      throw err;
    }
  };

  // Handle submit profile for Admin KYC verification & lock
  const handleSubmitForVerification = async (updates: Partial<UserSellerProfile>) => {
    try {
      await submitVerificationRequestInFirebase(updates, currentUser?.uid);
      setLiveToast({
        message: 'Dados enviados para validação!',
        sub: 'Perfil bloqueado para análise da administração',
        amount: 'Em Análise'
      });
      setTimeout(() => setLiveToast(null), 5000);
    } catch (err: any) {
      console.error('Error submitting verification request:', err);
      throw err;
    }
  };

  // Dynamic Navigation Items based on active role
  const affiliateNavItems = [
    { id: 'dashboard' as PlatformTab, label: 'Dashboard & Carteira', icon: LayoutDashboard },
    { id: 'meu_perfil' as PlatformTab, label: 'Meu Perfil', icon: User },
    { id: 'vitrine' as PlatformTab, label: 'Marketplace de Startups', icon: ShoppingBag, badge: `${plans.length}` },
    { id: 'minhas_afiliacoes' as PlatformTab, label: 'Meus Produtos Afiliados', icon: Link2, badge: `${affiliations.length}` },
    { id: 'vendas' as PlatformTab, label: 'Minhas Vendas', icon: Receipt, badge: `${transactions.length}` },
    { id: 'financeiro' as PlatformTab, label: 'Saldo & Saque PIX', icon: Wallet },
    { id: 'afiliados' as PlatformTab, label: 'Calculadora & Materiais', icon: Layers },
    { id: 'relatorios' as PlatformTab, label: 'Relatórios & UTMs', icon: BarChart3 },
    { id: 'database' as PlatformTab, label: 'Banco de Dados', icon: Database, badge: 'Cloud' }
  ];

  const companyNavItems = [
    { id: 'minha_empresa' as PlatformTab, label: 'Minha Startup & Planos', icon: Building2, badge: `${companies.length}` },
    { id: 'meu_perfil' as PlatformTab, label: 'Meu Perfil', icon: User },
    { id: 'vitrine' as PlatformTab, label: 'Explorar Marketplace', icon: Store, badge: `${plans.length}` },
    { id: 'vendas' as PlatformTab, label: 'Vendas da Empresa', icon: Receipt, badge: `${transactions.length}` },
    { id: 'equipe' as PlatformTab, label: 'Afiliados & Equipe', icon: Users },
    { id: 'financeiro' as PlatformTab, label: 'Repasses & Financeiro', icon: Wallet },
    { id: 'integracoes' as PlatformTab, label: 'Webhooks & APIs', icon: Network },
    { id: 'database' as PlatformTab, label: 'Banco de Dados', icon: Database, badge: 'Cloud' }
  ];

  const currentNavItems = roleMode === 'afiliado' ? affiliateNavItems : companyNavItems;

  return (
    <div className="min-h-screen bg-[#050811] text-white flex flex-row overflow-x-hidden relative selection:bg-[#D9F22A] selection:text-[#060A15]">
      {/* Background Ambience */}
      <div className="fixed top-0 right-1/4 w-[600px] h-[600px] bg-[#D9F22A]/[0.03] rounded-full blur-[180px] pointer-events-none -z-10" />

      {/* Mobile Drawer Backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* ===================== 1. SIDEBAR ===================== */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 bg-[#060A15] border-r border-white/10 flex flex-col justify-between transition-transform duration-300 ease-in-out lg:transition-all w-72 max-w-[85vw] ${
          isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'
        } ${
          sidebarCollapsed ? 'lg:w-20' : 'lg:w-64'
        }`}
      >
        {/* Top Logo & Toggle Section */}
        <div>
          <div className="h-16 px-4 flex items-center justify-between border-b border-white/10">
            {!sidebarCollapsed ? (
              <div className="flex items-center gap-2">
                <TechifyLogo size="sm" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#D9F22A] flex items-center justify-center font-black text-[#060A15] text-sm">
                T
              </div>
            )}

            <div className="flex items-center gap-1">
              {/* Mobile Close Button */}
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="lg:hidden w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white flex items-center justify-center cursor-pointer transition-colors border border-white/10"
                title="Fechar menu"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Desktop Collapse Toggle */}
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="hidden lg:flex w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white items-center justify-center cursor-pointer transition-colors border border-white/10"
                title={sidebarCollapsed ? "Expandir menu" : "Recolher menu"}
              >
                {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Balance / Sales Milestone Box */}
          {!sidebarCollapsed && (
            <div className="p-4 m-3 rounded-xl bg-gradient-to-b from-[#0a1222] to-[#060a15] border border-white/10 shadow-md">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/60">
                  {roleMode === 'afiliado' ? 'Saldo p/ Saque PIX' : 'Empresas Ativas'}
                </span>
                <span className="text-[10px] text-[#D9F22A] font-black">D+0</span>
              </div>
              <div className="text-base font-black text-[#D9F22A] font-['Syne']">
                {roleMode === 'afiliado'
                  ? `R$ ${userProfile.availableBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                  : `${companies.length} cadastrada(s)`}
              </div>

              {roleMode === 'afiliado' && (
                <button
                  onClick={() => {
                    setIsWithdrawModalOpen(true);
                    setIsMobileMenuOpen(false);
                  }}
                  disabled={userProfile.availableBalance <= 0}
                  className="w-full mt-2.5 bg-white/10 hover:bg-[#D9F22A] hover:text-[#060A15] text-white py-1.5 px-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1 disabled:opacity-40 disabled:pointer-events-none"
                >
                  <Wallet className="w-3 h-3" />
                  Sacar via PIX
                </button>
              )}
            </div>
          )}

          {/* Navigation Links */}
          <nav className="p-2 space-y-1 mt-1 max-h-[calc(100vh-280px)] overflow-y-auto">
            {currentNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#102419] text-[#D9F22A] border border-[#D9F22A]/40 shadow-[0_0_15px_rgba(217,242,42,0.15)]'
                      : 'text-white/70 hover:text-white hover:bg-white/[0.04]'
                  } ${sidebarCollapsed ? 'lg:justify-center lg:px-0' : ''}`}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-[#D9F22A]' : 'text-white/60'}`} />
                  {(!sidebarCollapsed || isMobileMenuOpen) && (
                    <span className="flex-1 text-left truncate">{item.label}</span>
                  )}
                  {(!sidebarCollapsed || isMobileMenuOpen) && item.badge && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        item.id === 'database'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : isActive
                          ? 'bg-[#D9F22A] text-[#060A15]'
                          : 'bg-white/10 text-white/80'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Sidebar Action */}
        <div className="p-3 border-t border-white/10 space-y-1">
          <button
            onClick={() => {
              setIsMobileMenuOpen(false);
              onBackToHome();
            }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-white/60 hover:text-white hover:bg-white/5 transition-colors cursor-pointer ${
              sidebarCollapsed ? 'lg:justify-center lg:px-0' : ''
            }`}
            title="Voltar ao site institucional"
          >
            <ExternalLink className="w-4 h-4 flex-shrink-0 text-[#D9F22A]" />
            {(!sidebarCollapsed || isMobileMenuOpen) && <span className="truncate">Voltar ao Site</span>}
          </button>

          {currentUser && (
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                logout();
                onBackToHome();
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-red-400/70 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer ${
                sidebarCollapsed ? 'lg:justify-center lg:px-0' : ''
              }`}
              title="Sair da Conta"
            >
              <LogOut className="w-4 h-4 flex-shrink-0" />
              {(!sidebarCollapsed || isMobileMenuOpen) && <span className="truncate">Sair da Conta</span>}
            </button>
          )}
        </div>
      </aside>

      {/* ===================== 2. MAIN CONTENT WRAPPER ===================== */}
      <div
        className={`flex-1 flex flex-col min-h-screen transition-all duration-300 min-w-0 max-w-full overflow-x-hidden ${
          sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'
        } ml-0`}
      >
        {/* TOPBAR */}
        <header className="h-16 sticky top-0 z-30 bg-[#060A15]/95 backdrop-blur-md border-b border-white/10 px-3 sm:px-5 lg:px-6 flex items-center justify-between gap-2 sm:gap-4 min-w-0">
          {/* Left Header: Mobile Menu Hamburger + Current Panel Indicator */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-shrink-0">
            {/* Hamburger Button on Mobile */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 cursor-pointer flex-shrink-0 flex items-center justify-center"
              aria-label="Abrir menu de navegação"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Current Panel Status Badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/10 flex-shrink-0">
              <span className={`w-2 h-2 rounded-full ${
                roleMode === 'afiliado' ? 'bg-[#D9F22A] shadow-[0_0_8px_#D9F22A]' : 'bg-indigo-400 shadow-[0_0_8px_#818cf8]'
              }`} />
              <span className="text-[11px] sm:text-xs font-bold tracking-wide text-white/90">
                {roleMode === 'afiliado' ? 'Painel do Afiliado' : 'Painel da Empresa / Startup'}
              </span>
            </div>
          </div>

          {/* Right Top Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 md:gap-3 ml-auto flex-shrink-0">
            {roleMode === 'empresa' && (
              <button
                onClick={() => setIsCreateCompanyModalOpen(true)}
                className="bg-white/10 hover:bg-white/20 text-white font-bold p-1.5 sm:px-3.5 sm:py-1.5 rounded-full text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 border border-white/15 flex-shrink-0"
              >
                <Plus className="w-3.5 h-3.5 text-[#D9F22A]" />
                <span className="hidden sm:inline">Nova Empresa</span>
              </button>
            )}

            {/* Quick Register Sale Button */}
            <button
              onClick={() => {
                setSelectedPlanForSale(undefined);
                setIsRegisterSaleModalOpen(true);
              }}
              className="bg-[#D9F22A] hover:bg-[#c8e217] text-[#060A15] font-black p-1.5 sm:px-3.5 sm:py-1.5 rounded-full text-xs uppercase tracking-wider shadow-[0_0_15px_rgba(217,242,42,0.3)] transition-all cursor-pointer flex items-center gap-1.5 flex-shrink-0"
              title="Registrar Venda"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span className="hidden sm:inline">Registrar Venda</span>
            </button>

            {/* Dark / Light Mode Switcher */}
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="hidden xs:flex items-center w-11 h-6 bg-[#1f293d] rounded-full p-0.5 border border-white/10 transition-colors cursor-pointer relative flex-shrink-0"
              title="Alternar Tema"
            >
              <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                isDarkMode 
                  ? 'translate-x-5 bg-[#0f172a] text-white shadow-sm' 
                  : 'translate-x-0 bg-[#38bdf8] text-[#060A15]'
              }`}>
                {isDarkMode ? <Moon className="w-3 h-3 fill-current" /> : <Sun className="w-3 h-3" />}
              </div>
            </button>

            {/* Notification Bell with animated badge */}
            <div className="relative flex-shrink-0">
              <button 
                onClick={() => setLiveToast({ message: 'Notificações Ativas', sub: 'Nenhuma pendência recente no sistema.', amount: 'D+0' })}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/70 hover:text-white cursor-pointer transition-colors"
                title="Notificações"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#D9F22A] animate-pulse" />
              </button>
            </div>

            {/* User Profile Avatar & Dropdown Menu */}
            <div className="relative flex-shrink-0">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 p-0.5 rounded-full hover:ring-2 hover:ring-[#D9F22A]/50 transition-all cursor-pointer"
                title="Menu do Usuário"
              >
                <img
                  src={userProfile.avatar}
                  alt={userProfile.name}
                  className="w-8 h-8 rounded-full object-cover border border-white/20"
                />
              </button>

              {/* Dropdown Menu Popup */}
              {isUserMenuOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setIsUserMenuOpen(false)} 
                  />
                  <div className="absolute right-0 top-11 w-72 max-w-[calc(100vw-24px)] bg-[#181c24] border border-white/10 rounded-2xl p-2.5 shadow-[0_12px_45px_rgba(0,0,0,0.85)] z-50 animate-in fade-in zoom-in-95 duration-150">
                    {/* Header User Card with Avatar, Name & Email */}
                    <div className="flex items-center gap-3 p-2.5 bg-[#232730] rounded-xl mb-2">
                      <img
                        src={userProfile.avatar}
                        alt={userProfile.name}
                        className="w-10 h-10 rounded-full object-cover border border-white/20 flex-shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-white truncate">
                          {userProfile.name}
                        </div>
                        <div className="text-[11px] text-white/50 truncate">
                          {userProfile.email || 'rickmarketing81@gmail.com'}
                        </div>
                        <div className="mt-1">
                          <span className={`inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                            roleMode === 'afiliado'
                              ? 'bg-[#D9F22A]/15 text-[#D9F22A] border border-[#D9F22A]/30'
                              : 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
                          }`}>
                            {roleMode === 'afiliado' ? 'Conta Afiliado' : 'Conta Empresa'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="h-px bg-white/10 my-1.5" />

                    {/* Menu Links */}
                    <div className="space-y-0.5">
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          if (roleMode === 'afiliado') {
                            setActiveTab('dashboard');
                          } else {
                            setActiveTab('minha_empresa');
                          }
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-semibold text-white/80 hover:text-white hover:bg-white/5 rounded-xl transition-colors cursor-pointer"
                      >
                        Página Inicial
                      </button>

                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          setActiveTab('meu_perfil');
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-semibold text-white/80 hover:text-white hover:bg-white/5 rounded-xl transition-colors cursor-pointer"
                      >
                        Meu Perfil
                      </button>

                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          setActiveTab('vitrine');
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-semibold text-white/80 hover:text-white hover:bg-white/5 rounded-xl transition-colors cursor-pointer"
                      >
                        Planos e Taxas
                      </button>

                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          handleSwitchRole(roleMode === 'afiliado' ? 'empresa' : 'afiliado');
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-bold text-[#D9F22A] hover:bg-[#D9F22A]/10 rounded-xl transition-colors cursor-pointer flex items-center justify-between"
                      >
                        <span>{roleMode === 'afiliado' ? 'Mudar para painel da empresa' : 'Mudar para painel de afiliado'}</span>
                        <ArrowRightLeft className="w-3.5 h-3.5 text-[#D9F22A]" />
                      </button>
                    </div>

                    <div className="h-px bg-white/10 my-1.5" />

                    {/* Logout Option */}
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        logout();
                        onBackToHome();
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-colors cursor-pointer flex items-center gap-2"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Logout</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* VIEW CONTAINER */}
        <main className="flex-1 p-3.5 sm:p-5 md:p-6 lg:p-8 max-w-7xl w-full mx-auto min-w-0">
          {activeTab === 'dashboard' && (
            <DashboardView
              roleMode={roleMode}
              userProfile={userProfile}
              transactions={transactions}
              paymentStats={paymentStats}
              platforms={plans}
              setActiveTab={setActiveTab}
              onOpenSimulateSale={() => {
                setSelectedPlanForSale(undefined);
                setIsRegisterSaleModalOpen(true);
              }}
              onOpenWithdraw={() => setIsWithdrawModalOpen(true)}
              onSelectProductDetail={(prod) => setSelectedDetailProduct(prod)}
              selectedPeriod={selectedPeriod}
              setSelectedPeriod={setSelectedPeriod}
              selectedProductFilter={selectedProductFilter}
              setSelectedProductFilter={setSelectedProductFilter}
              selectedTypeFilter={selectedTypeFilter}
              setSelectedTypeFilter={setSelectedTypeFilter}
            />
          )}

          {activeTab === 'meu_perfil' && (
            <MeuPerfilView
              userProfile={userProfile}
              onSaveProfile={handleSaveProfile}
              onSubmitForVerification={handleSubmitForVerification}
              onNavigateToTab={setActiveTab}
              roleMode={roleMode}
              company={companies[0]}
            />
          )}

          {activeTab === 'minha_empresa' && (
            <MinhaEmpresaView
              companies={companies}
              plans={plans}
              affiliations={affiliations}
              sales={transactions}
              userProfile={userProfile}
              isCompanyVerified={userProfile.verified || userProfile.verificationStatus === 'approved'}
              onNavigateToProfile={() => setActiveTab('meu_perfil')}
              onOpenCreateCompany={() => {
                if (!userProfile.verified && userProfile.verificationStatus !== 'approved') {
                  setLiveToast({
                    message: 'Verificação Obrigatória',
                    sub: 'A empresa precisa ser verificada pela administração antes de cadastrar.',
                    amount: 'Pendente'
                  });
                  setActiveTab('meu_perfil');
                  return;
                }
                setIsCreateCompanyModalOpen(true);
              }}
              onOpenCreatePlan={(compId) => {
                if (!userProfile.verified && userProfile.verificationStatus !== 'approved') {
                  setLiveToast({
                    message: 'Verificação Obrigatória',
                    sub: 'A empresa só pode cadastrar produtos após a verificação da administração.',
                    amount: 'Pendente'
                  });
                  setActiveTab('meu_perfil');
                  return;
                }
                setEditingPlan(null);
                setIsCreatePlanModalOpen(true);
              }}
              onOpenRegisterSale={(planId) => {
                setSelectedPlanForSale(planId);
                setIsRegisterSaleModalOpen(true);
              }}
              onEditPlan={(plan) => {
                setEditingPlan(plan);
                setIsCreatePlanModalOpen(true);
              }}
              onDeleteCompany={handleDeleteCompany}
              onDeletePlan={handleDeletePlan}
            />
          )}

          {activeTab === 'vitrine' && (
            <VitrineView
              roleMode={roleMode}
              platforms={plans}
              companies={companies}
              affiliations={affiliations}
              isVerified={userProfile.verified || userProfile.verificationStatus === 'approved'}
              verificationStatus={userProfile.verificationStatus}
              onNavigateToProfile={() => setActiveTab('meu_perfil')}
              onJoinAffiliate={handleJoinAffiliate}
              onSelectProductDetail={(prod) => setSelectedDetailProduct(prod)}
              onSimulateSale={(prod) => {
                setSelectedPlanForSale(prod.id);
                setIsRegisterSaleModalOpen(true);
              }}
              onOpenCreateCompany={() => {
                if (!userProfile.verified && userProfile.verificationStatus !== 'approved') {
                  setLiveToast({
                    message: 'Verificação Obrigatória',
                    sub: 'A empresa precisa ser verificada pela administração antes de cadastrar startups.',
                    amount: 'Pendente'
                  });
                  setActiveTab('meu_perfil');
                  return;
                }
                setIsCreateCompanyModalOpen(true);
              }}
              onOpenCreatePlan={roleMode === 'empresa' ? () => {
                if (!userProfile.verified && userProfile.verificationStatus !== 'approved') {
                  setLiveToast({
                    message: 'Verificação Obrigatória',
                    sub: 'A empresa só pode cadastrar produtos após a verificação da administração.',
                    amount: 'Pendente'
                  });
                  setActiveTab('meu_perfil');
                  return;
                }
                setEditingPlan(null);
                setIsCreatePlanModalOpen(true);
              } : undefined}
              onEditPlatform={roleMode === 'empresa' ? (prod) => {
                setEditingPlan(prod);
                setIsCreatePlanModalOpen(true);
              } : undefined}
              onDeletePlatform={roleMode === 'empresa' ? handleDeletePlan : undefined}
              onSwitchToCompanyMode={() => handleSwitchRole('empresa')}
            />
          )}

          {activeTab === 'minhas_afiliacoes' && (
            <MinhasAfiliacoesView
              affiliations={affiliations}
              plans={plans}
              onOpenRegisterSale={(planId) => {
                setSelectedPlanForSale(planId);
                setIsRegisterSaleModalOpen(true);
              }}
              onNavigateToVitrine={() => setActiveTab('vitrine')}
              onDeleteAffiliation={handleDeleteAffiliation}
            />
          )}

          {activeTab === 'afiliados' && (
            <AfiliadosView
              platforms={plans}
              userProfile={userProfile}
              onSimulateSale={(prod) => {
                setSelectedPlanForSale(prod.id);
                setIsRegisterSaleModalOpen(true);
              }}
            />
          )}

          {activeTab === 'vendas' && (
            <VendasView
              roleMode={roleMode}
              transactions={transactions}
              onOpenSimulateSale={() => {
                setSelectedPlanForSale(undefined);
                setIsRegisterSaleModalOpen(true);
              }}
            />
          )}

          {activeTab === 'financeiro' && (
            <FinanceiroView
              roleMode={roleMode}
              userProfile={userProfile}
              withdrawals={withdrawals}
              onOpenWithdraw={() => setIsWithdrawModalOpen(true)}
            />
          )}

          {activeTab === 'equipe' && <EquipeView />}
          {activeTab === 'relatorios' && <RelatoriosView transactions={transactions} />}
          {activeTab === 'integracoes' && <IntegracoesView />}
          {activeTab === 'database' && <DatabaseManagerView />}
        </main>
      </div>

      {/* ===================== 3. LIVE TOAST NOTIFICATION ===================== */}
      {liveToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#080d1a] border-2 border-[#D9F22A] rounded-2xl p-4 shadow-[0_0_35px_rgba(217,242,42,0.4)] flex items-center gap-4 animate-in slide-in-from-bottom-5 duration-300 max-w-sm">
          <div className="w-10 h-10 rounded-full bg-[#D9F22A] text-[#060A15] flex items-center justify-center flex-shrink-0 font-bold">
            <Zap className="w-5 h-5 fill-current" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-white">{liveToast.message}</div>
            <div className="text-[11px] text-white/70 truncate">{liveToast.sub}</div>
            <div className="text-sm font-black text-[#D9F22A] mt-0.5">{liveToast.amount}</div>
          </div>
          <button
            onClick={() => setLiveToast(null)}
            className="text-white/40 hover:text-white text-xs cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* ===================== 4. MODALS ===================== */}
      <RegisterAffiliateModal
        isOpen={isRegisterAffiliateModalOpen}
        onClose={() => setIsRegisterAffiliateModalOpen(false)}
        onComplete={handleCompleteAffiliateProfile}
        initialName={userProfile.name}
        initialPixKey={userProfile.pixKey}
        initialPixType={userProfile.pixKeyType}
        initialWhatsapp={userProfile.whatsapp}
      />

      <CreateCompanyModal
        isOpen={isCreateCompanyModalOpen}
        onClose={() => setIsCreateCompanyModalOpen(false)}
        onCompanyCreated={handleCreateCompany}
        userProfile={userProfile}
      />

      <CreatePlanModal
        isOpen={isCreatePlanModalOpen}
        onClose={() => {
          setIsCreatePlanModalOpen(false);
          setEditingPlan(null);
        }}
        companies={companies}
        initialData={editingPlan}
        onPlanCreated={handleCreatePlan}
        onPlanUpdated={handleUpdatePlan}
      />

      <RegisterSaleModal
        isOpen={isRegisterSaleModalOpen}
        onClose={() => setIsRegisterSaleModalOpen(false)}
        platforms={plans}
        defaultPlanId={selectedPlanForSale}
        onSaleCreated={handleSaleCreated}
      />

      <WithdrawModal
        isOpen={isWithdrawModalOpen}
        onClose={() => setIsWithdrawModalOpen(false)}
        userProfile={userProfile}
        onWithdraw={handleWithdraw}
      />

      <ProductDetailModal
        product={selectedDetailProduct}
        onClose={() => setSelectedDetailProduct(null)}
        onSimulateSale={(product) => {
          setSelectedDetailProduct(null);
          setSelectedPlanForSale(product.id);
          setIsRegisterSaleModalOpen(true);
        }}
      />

      {/* Global Auth Modal for Company / Google switch flow */}
      <Modals
        activeModal={companyAuthModal}
        onClose={() => setCompanyAuthModal(null)}
        onLoginSuccess={() => {
          setRoleMode('empresa');
          setUserRole('empresa');
          setActiveTab('minha_empresa');
          setLiveToast({
            message: 'Painel da Empresa Conectado!',
            sub: 'Acesso corporativo liberado com sucesso',
            amount: 'Empresa'
          });
          setTimeout(() => setLiveToast(null), 4000);
        }}
      />
    </div>
  );
};
