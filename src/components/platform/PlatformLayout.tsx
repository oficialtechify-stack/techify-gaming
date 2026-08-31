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
  createWithdrawalInFirebase
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
import { CreateCompanyModal } from './CreateCompanyModal';
import { CreatePlanModal } from './CreatePlanModal';
import { RegisterSaleModal } from './RegisterSaleModal';
import { WithdrawModal } from './WithdrawModal';
import { ProductDetailModal } from './ProductDetailModal';
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
  ArrowRightLeft
} from 'lucide-react';
import { TechifyLogo } from '../TechifyLogo';

interface PlatformLayoutProps {
  onBackToHome: () => void;
}

export const PlatformLayout: React.FC<PlatformLayoutProps> = ({ onBackToHome }) => {
  const [roleMode, setRoleMode] = useState<UserRoleMode>('afiliado');
  const [activeTab, setActiveTab] = useState<PlatformTab>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [userProfile, setUserProfile] = useState<UserSellerProfile>(INITIAL_USER_PROFILE);
  
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
  const [isCreateCompanyModalOpen, setIsCreateCompanyModalOpen] = useState<boolean>(false);
  const [isCreatePlanModalOpen, setIsCreatePlanModalOpen] = useState<boolean>(false);
  const [editingPlan, setEditingPlan] = useState<CompanyPlan | null>(null);
  const [isRegisterSaleModalOpen, setIsRegisterSaleModalOpen] = useState<boolean>(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState<boolean>(false);
  const [selectedPlanForSale, setSelectedPlanForSale] = useState<string | undefined>(undefined);
  const [selectedDetailProduct, setSelectedDetailProduct] = useState<CompanyPlan | null>(null);

  // Live Toast Notification
  const [liveToast, setLiveToast] = useState<{ message: string; sub: string; amount: string } | null>(null);

  // Realtime Firebase Subscriptions on mount
  useEffect(() => {
    // 1. Initial Firestore check / seed
    seedFirestoreIfEmpty().then(() => {
      setDbConnected(true);
    });

    // 2. Realtime listener for User Profile
    const unsubProfile = subscribeUserProfile((profile) => {
      setUserProfile(profile);
    });

    // 3. Realtime listener for Companies
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
      unsubProfile();
      unsubCompanies();
      unsubPlans();
      unsubAffiliations();
      unsubSales();
      unsubWith();
    };
  }, []);

  // Handle Join Affiliate (1 Click)
  const handleJoinAffiliate = async (plan: CompanyPlan) => {
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

  // Handle create company
  const handleCreateCompany = async (companyData: Omit<CompanyStartup, 'id' | 'createdAt'>) => {
    try {
      const created = await createCompanyInFirebase(companyData);
      setLiveToast({
        message: 'Empresa cadastrada com sucesso!',
        sub: created.name,
        amount: 'Ativa'
      });
      setTimeout(() => setLiveToast(null), 4000);
      setActiveTab('minha_empresa');
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
      await createWithdrawalInFirebase(amount, pixKey, pixKeyType);
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

  // Dynamic Navigation Items based on active role
  const affiliateNavItems = [
    { id: 'dashboard' as PlatformTab, label: 'Dashboard & Carteira', icon: LayoutDashboard },
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

      {/* ===================== 1. SIDEBAR ===================== */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 bg-[#060A15] border-r border-white/10 flex flex-col justify-between transition-all duration-300 ${
          sidebarCollapsed ? 'w-20' : 'w-64'
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

            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white flex items-center justify-center cursor-pointer transition-colors border border-white/10"
              title={sidebarCollapsed ? "Expandir menu" : "Recolher menu"}
            >
              {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* Quick Role Switcher Inside Sidebar */}
          {!sidebarCollapsed && (
            <div className="mx-3 mt-3 p-1 rounded-xl bg-[#050811] border border-white/10 flex items-center gap-1">
              <button
                onClick={() => {
                  setRoleMode('afiliado');
                  if (activeTab === 'minha_empresa') setActiveTab('dashboard');
                }}
                className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  roleMode === 'afiliado'
                    ? 'bg-[#D9F22A] text-[#060A15] shadow-sm'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                Afiliado
              </button>

              <button
                onClick={() => {
                  setRoleMode('empresa');
                  setActiveTab('minha_empresa');
                }}
                className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  roleMode === 'empresa'
                    ? 'bg-[#D9F22A] text-[#060A15] shadow-sm'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                Empresa
              </button>
            </div>
          )}

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
                  onClick={() => setIsWithdrawModalOpen(true)}
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
          <nav className="p-2 space-y-1 mt-1">
            {currentNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#102419] text-[#D9F22A] border border-[#D9F22A]/40 shadow-[0_0_15px_rgba(217,242,42,0.15)]'
                      : 'text-white/70 hover:text-white hover:bg-white/[0.04]'
                  } ${sidebarCollapsed ? 'justify-center px-0' : ''}`}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-[#D9F22A]' : 'text-white/60'}`} />
                  {!sidebarCollapsed && (
                    <span className="flex-1 text-left truncate">{item.label}</span>
                  )}
                  {!sidebarCollapsed && item.badge && (
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
            onClick={onBackToHome}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-white/60 hover:text-white hover:bg-white/5 transition-colors cursor-pointer ${
              sidebarCollapsed ? 'justify-center px-0' : ''
            }`}
            title="Voltar ao site institucional"
          >
            <ExternalLink className="w-4 h-4 flex-shrink-0 text-[#D9F22A]" />
            {!sidebarCollapsed && <span className="truncate">Voltar ao Site</span>}
          </button>
        </div>
      </aside>

      {/* ===================== 2. MAIN CONTENT WRAPPER ===================== */}
      <div
        className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${
          sidebarCollapsed ? 'ml-20' : 'ml-64'
        }`}
      >
        {/* TOPBAR */}
        <header className="h-16 sticky top-0 z-30 bg-[#060A15]/90 backdrop-blur-md border-b border-white/10 px-4 sm:px-6 flex items-center justify-between gap-4">
          {/* Prominent Header Mode Switcher */}
          <div className="flex items-center gap-2">
            <div className="bg-[#050811] border border-white/15 rounded-full p-1 flex items-center">
              <button
                onClick={() => {
                  setRoleMode('afiliado');
                  if (activeTab === 'minha_empresa') setActiveTab('dashboard');
                }}
                className={`px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                  roleMode === 'afiliado'
                    ? 'bg-[#D9F22A] text-[#060A15] shadow-[0_0_15px_rgba(217,242,42,0.3)]'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Modo Afiliado</span>
              </button>

              <button
                onClick={() => {
                  setRoleMode('empresa');
                  setActiveTab('minha_empresa');
                }}
                className={`px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                  roleMode === 'empresa'
                    ? 'bg-[#D9F22A] text-[#060A15] shadow-[0_0_15px_rgba(217,242,42,0.3)]'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Modo Empresa / Startup</span>
              </button>
            </div>
          </div>

          {/* Right Top Actions */}
          <div className="flex items-center gap-3 ml-auto">
            {roleMode === 'empresa' ? (
              <button
                onClick={() => setIsCreateCompanyModalOpen(true)}
                className="bg-white/10 hover:bg-white/20 text-white font-bold px-3.5 py-1.5 rounded-full text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 border border-white/15"
              >
                <Plus className="w-3.5 h-3.5 text-[#D9F22A]" />
                <span className="hidden sm:inline">Nova Empresa</span>
              </button>
            ) : null}

            {/* Quick Register Sale Button */}
            <button
              onClick={() => {
                setSelectedPlanForSale(undefined);
                setIsRegisterSaleModalOpen(true);
              }}
              className="bg-[#D9F22A] hover:bg-[#c8e217] text-[#060A15] font-black px-3.5 py-1.5 rounded-full text-xs uppercase tracking-wider shadow-[0_0_15px_rgba(217,242,42,0.3)] transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span className="hidden sm:inline">Registrar Venda</span>
            </button>

            {/* Notification Bell */}
            <div className="relative">
              <button 
                onClick={() => setLiveToast({ message: 'Sistema Sincronizado', sub: 'Todas as empresas e comissões atualizadas.', amount: 'D+0' })}
                className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/70 hover:text-white cursor-pointer"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#D9F22A] animate-pulse" />
              </button>
            </div>

            {/* User Profile Pill */}
            <div className="flex items-center gap-2.5 pl-2 sm:pl-3 border-l border-white/10">
              <img
                src={userProfile.avatar}
                alt={userProfile.name}
                className="w-8 h-8 rounded-full object-cover border border-[#D9F22A]"
              />
              <div className="hidden md:block text-left">
                <div className="text-xs font-bold text-white leading-tight">{userProfile.name}</div>
                <div className="text-[10px] text-[#D9F22A] font-bold">
                  {roleMode === 'afiliado' ? 'Afiliado Oficial' : 'Produtor / Startup'}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* VIEW CONTAINER */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
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

          {activeTab === 'minha_empresa' && (
            <MinhaEmpresaView
              companies={companies}
              plans={plans}
              affiliations={affiliations}
              sales={transactions}
              onOpenCreateCompany={() => setIsCreateCompanyModalOpen(true)}
              onOpenCreatePlan={(compId) => {
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
              onJoinAffiliate={handleJoinAffiliate}
              onSelectProductDetail={(prod) => setSelectedDetailProduct(prod)}
              onSimulateSale={(prod) => {
                setSelectedPlanForSale(prod.id);
                setIsRegisterSaleModalOpen(true);
              }}
              onOpenCreateCompany={roleMode === 'empresa' ? () => setIsCreateCompanyModalOpen(true) : undefined}
              onOpenCreatePlan={roleMode === 'empresa' ? () => {
                setEditingPlan(null);
                setIsCreatePlanModalOpen(true);
              } : undefined}
              onEditPlatform={roleMode === 'empresa' ? (prod) => {
                setEditingPlan(prod);
                setIsCreatePlanModalOpen(true);
              } : undefined}
              onDeletePlatform={roleMode === 'empresa' ? handleDeletePlan : undefined}
              onSwitchToCompanyMode={() => {
                setRoleMode('empresa');
                setActiveTab('minha_empresa');
              }}
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
              transactions={transactions}
              onOpenSimulateSale={() => {
                setSelectedPlanForSale(undefined);
                setIsRegisterSaleModalOpen(true);
              }}
            />
          )}

          {activeTab === 'financeiro' && (
            <FinanceiroView
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
      <CreateCompanyModal
        isOpen={isCreateCompanyModalOpen}
        onClose={() => setIsCreateCompanyModalOpen(false)}
        onCompanyCreated={handleCreateCompany}
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
    </div>
  );
};
