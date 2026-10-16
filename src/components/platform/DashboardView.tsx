import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ArrowUpRight, ArrowDownRight, Wallet, Clock3, CreditCard, Landmark, Receipt, RefreshCcw, ShieldCheck, Eye, EyeOff, Search, ChevronRight, LogOut, Building2, CalendarDays, Activity, AlertCircle } from 'lucide-react';
import type { UserSellerProfile, SaleTransaction, PaymentMethodStat, CompanyPlan, UserAffiliation, PlatformTab, UserRoleMode } from '../../types/platform';

interface DashboardViewProps {
  roleMode?: UserRoleMode;
  userProfile: UserSellerProfile;
  transactions: SaleTransaction[];
  paymentStats: PaymentMethodStat[];
  platforms: CompanyPlan[];
  affiliations?: UserAffiliation[];
  setActiveTab: (tab: PlatformTab) => void;
  onOpenWithdraw: () => void;
  onSelectProductDetail: (product: CompanyPlan) => void;
  onSwitchRole?: (role: UserRoleMode) => void;
  onLogout?: () => void;
  onOpenOnboardingTour?: () => void;
  selectedPeriod: string;
  setSelectedPeriod: (p: string) => void;
  selectedProductFilter: string;
  setSelectedProductFilter: (p: string) => void;
  selectedTypeFilter: string;
  setSelectedTypeFilter: (t: string) => void;
  userName?: string;
  userAvatar?: string;
  userEmail?: string;
  onBackToHome?: () => void;
  notificationItems?: Array<{ id: string; title: string; body: string; createdAt: string; unread: boolean }>;
  onOpenNotifications?: () => void;
}


const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
const dateOf = (tx: SaleTransaction) => {
  const parsed = new Date(tx.createdAt || tx.paidAt || tx.date || '');
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};
const paid = (tx: SaleTransaction) => ['aprovado','paid','succeeded','completed'].includes(String(tx.status).toLowerCase());
const cancelled = (tx: SaleTransaction) => ['cancelado','refunded','estornado','failed','canceled','chargeback'].includes(String(tx.status).toLowerCase());

export const DashboardView: React.FC<DashboardViewProps> = ({
  userProfile, transactions = [], paymentStats = [], setActiveTab, onOpenWithdraw,
  selectedPeriod, setSelectedPeriod, userName, userEmail, onLogout,
  onOpenNotifications, notificationItems = [], onBackToHome,
}) => {
  const { currentUser } = useAuth();
  const [showValues, setShowValues] = useState(true);
  const [search, setSearch] = useState('');
  const [balance, setBalance] = useState<{ available: number; pending: number; next: string | null; days: number } | null>(null);
  const [balanceError, setBalanceError] = useState(false);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelledRequest = false;
    if (!currentUser) { setBalance(null); setLoadingBalance(false); return; }
    setLoadingBalance(true);
    setBalanceError(false);
    currentUser.getIdToken().then(token =>
      fetch('/api/balance/releases?role=empresa', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
    ).then(async response => {
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Erro ao consultar saldo');
      if (!cancelledRequest) {
        const available = Number(payload.availableAmountCents);
        const pending = Number(payload.pendingAmountCents);
        if (!Number.isSafeInteger(available) || !Number.isSafeInteger(pending)) throw new Error('Saldo inválido');
        setBalance({ available: available / 100, pending: pending / 100, next: payload.nextReleaseAt || null, days: Number(payload.policyDays) || 10 });
      }
    }).catch(() => {
      if (!cancelledRequest) { setBalance(null); setBalanceError(true); }
    }).finally(() => { if (!cancelledRequest) setLoadingBalance(false); });
    return () => { cancelledRequest = true; };
  }, [currentUser?.uid, reload]);

  const filtered = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    if (selectedPeriod === 'Hoje') start.setHours(0,0,0,0);
    else if (selectedPeriod === '7 dias') start.setDate(now.getDate() - 7);
    else if (selectedPeriod === '30 dias') start.setDate(now.getDate() - 30);
    else if (selectedPeriod === '90 dias') start.setDate(now.getDate() - 90);
    else start.setTime(0);
    return transactions.filter(tx => {
      if (tx.is_test || tx.environment === 'development') return false;
      const date = dateOf(tx);
      return date !== null && date >= start && date <= now;
    });
  }, [transactions, selectedPeriod]);
  const approved = filtered.filter(paid);
  const pending = filtered.filter(tx => !paid(tx) && !cancelled(tx));
  const failed = filtered.filter(cancelled);
  const gross = approved.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
  const pix = approved.filter(tx => /pix/i.test(tx.method)).reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
  const card = approved.filter(tx => /cart|credit/i.test(tx.method)).reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
  const subscriptions = approved.filter(tx => tx.recurring || !!tx.stripeSubscriptionId).length;
  const recent = filtered.filter(tx => [tx.id, tx.buyerName, tx.buyerEmail, tx.method].join(' ').toLowerCase().includes(search.toLowerCase())).sort((a,b) => (dateOf(b)?.getTime() || 0) - (dateOf(a)?.getTime() || 0)).slice(0,8);
  const privateMoney = (value: number) => showValues ? money(value) : '••••••';
  const cardStyle = 'rounded-2xl border border-white/10 bg-[#101523] p-4 sm:p-5';
  const quick = (label: string, tab: PlatformTab, icon: React.ReactNode) => <button onClick={() => setActiveTab(tab)} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.035] px-4 py-3 text-left text-sm text-white/80 transition hover:bg-white/10 hover:text-white"><span className="flex items-center gap-2">{icon}{label}</span><ChevronRight size={15}/></button>;
  const stat = (label: string, value: string, subtitle: string, icon: React.ReactNode) => <div className={cardStyle}><div className="flex items-center justify-between gap-2 text-xs font-medium text-white/60"><span>{label}</span><span className="text-[#c3f45a]">{icon}</span></div><div className="mt-3 text-xl sm:text-2xl font-bold tracking-tight text-white">{value}</div><p className="mt-2 text-xs text-white/45">{subtitle}</p></div>;

  return <div className="min-w-0 w-full space-y-5 pb-12 text-white">
    <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-[#0c111e] p-4 sm:p-6">
      <div><div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-[#c3f45a]"><ShieldCheck size={15}/> LeadsPay Gateway</div><h1 className="text-2xl sm:text-3xl font-black tracking-tight">Visão geral de pagamentos</h1><p className="mt-1 text-sm text-white/50">{userProfile.companyName || userName || 'Sua empresa'} · Dados da sua conta</p></div>
      <div className="flex flex-wrap items-center gap-2"><button aria-label={showValues ? 'Ocultar valores' : 'Mostrar valores'} onClick={() => setShowValues(v => !v)} className="rounded-xl border border-white/10 p-3 text-white/70 hover:text-white">{showValues ? <Eye size={18}/> : <EyeOff size={18}/>}</button><button onClick={() => setReload(v => v+1)} className="rounded-xl border border-white/10 p-3 text-white/70 hover:text-white" title="Atualizar saldos"><RefreshCcw size={18}/></button><button onClick={() => setActiveTab('cobrancas')} className="rounded-xl bg-[#c3f45a] px-4 py-3 text-sm font-black text-[#101523] hover:bg-[#d6ff84]">Nova cobrança</button></div>
    </header>

    <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-white/55">Resumo financeiro e operacional</p><div className="flex flex-wrap gap-1 rounded-xl border border-white/10 bg-[#101523] p-1">{['Hoje','7 dias','30 dias','90 dias','Tudo'].map(period => <button key={period} onClick={() => setSelectedPeriod(period)} className={`rounded-lg px-3 py-2 text-xs font-semibold ${selectedPeriod === period ? 'bg-[#c3f45a] text-[#101523]' : 'text-white/60 hover:text-white'}`}>{period}</button>)}</div></div>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {stat('Saldo disponível', balance ? privateMoney(balance.available) : 'Indisponível', loadingBalance ? 'Consultando saldo...' : balanceError ? 'Não foi possível validar o saldo' : 'Saldo liberado para saque', <Wallet size={20}/>)}
      {stat('Saldo pendente', balance ? privateMoney(balance.pending) : 'Indisponível', balance?.next ? `Próxima liberação: ${new Date(balance.next).toLocaleDateString('pt-BR')}` : 'Aguardando liberação', <Clock3 size={20}/>)}
      {stat('Pagamentos aprovados', privateMoney(gross), `${approved.length} transações no período`, <ArrowUpRight size={20}/>)}
      {stat('Pagamentos pendentes', String(pending.length), 'Aguardando confirmação', <Activity size={20}/>)}
    </div>
    {balanceError && <div role="alert" className="flex items-center gap-2 rounded-xl border border-amber-400/20 bg-amber-400/10 p-3 text-sm text-amber-200"><AlertCircle size={18}/> O saldo não pôde ser consultado. Valores não foram estimados a partir das vendas.</div>}
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <section className={`${cardStyle} lg:col-span-2`}><div className="mb-5 flex items-center justify-between"><h2 className="font-bold">Métodos de pagamento</h2><CreditCard className="text-white/40" size={20}/></div><div className="grid gap-3 sm:grid-cols-2">{stat('Pix', privateMoney(pix), `${approved.filter(tx => /pix/i.test(tx.method)).length} pagamentos confirmados`, <ArrowUpRight size={18}/>)}{stat('Cartão', privateMoney(card), `${approved.filter(tx => /cart|credit/i.test(tx.method)).length} pagamentos confirmados`, <CreditCard size={18}/>)}</div><div className="mt-4 rounded-xl border border-white/10 bg-white/[0.025] p-3 text-xs text-white/55">Valores calculados somente a partir das transações aprovadas recebidas pelo dashboard. O saldo disponível vem exclusivamente da API financeira.</div></section>
      <section className={cardStyle}><h2 className="mb-4 font-bold">Operações rápidas</h2><div className="grid gap-2">{quick('Todas as transações','vendas',<Receipt size={17}/>)}{quick('Assinaturas','assinaturas',<RefreshCcw size={17}/>)}{quick('Carteira e recebíveis','carteira',<Wallet size={17}/>)}{quick('Saques','saques',<Landmark size={17}/>)}{quick('Integrações','integracoes',<ShieldCheck size={17}/>)}</div></section>
    </div>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">{stat('Assinaturas pagas',String(subscriptions),'Cobranças recorrentes aprovadas no período',<RefreshCcw size={20}/>)}{stat('Pagamentos cancelados / estornados',String(failed.length),'Transações com status de falha, cancelamento ou estorno',<ArrowDownRight size={20}/>)}{stat('Ticket médio',privateMoney(approved.length ? gross / approved.length : 0),'Média dos pagamentos aprovados',<Receipt size={20}/>)}</div>
    <section className={cardStyle}><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-bold">Transações recentes</h2><p className="mt-1 text-xs text-white/50">Últimos registros do período selecionado</p></div><div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#080c16] px-3 py-2"><Search size={16} className="text-white/50"/><input aria-label="Buscar transações" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar transação..." className="w-44 bg-transparent text-sm text-white outline-none placeholder:text-white/35"/></div></div><div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead><tr className="border-b border-white/10 text-xs text-white/45"><th className="py-3">Cliente / ID</th><th>Data</th><th>Método</th><th>Status</th><th className="text-right">Valor</th></tr></thead><tbody>{recent.map(tx => <tr key={tx.id} className="border-b border-white/5"><td className="py-3"><div className="font-medium">{tx.buyerName || tx.customerName || 'Cliente'}</div><div className="max-w-[200px] truncate text-xs text-white/40">{tx.id}</div></td><td className="text-white/65">{dateOf(tx)?.toLocaleDateString('pt-BR') || '—'}</td><td className="text-white/65">{tx.method || '—'}</td><td><span className={`rounded-full px-2 py-1 text-xs ${paid(tx) ? 'bg-emerald-500/15 text-emerald-300' : cancelled(tx) ? 'bg-red-500/15 text-red-300' : 'bg-amber-500/15 text-amber-300'}`}>{tx.status}</span></td><td className="text-right font-semibold">{privateMoney(Number(tx.amount) || 0)}</td></tr>)}</tbody></table>{recent.length === 0 && <p className="py-8 text-center text-sm text-white/45">Nenhuma transação encontrada neste período.</p>}</div><button onClick={() => setActiveTab('vendas')} className="mt-4 flex items-center gap-2 text-sm font-semibold text-[#c3f45a] hover:underline">Ver todas as transações <ChevronRight size={16}/></button></section>
  </div>;
};
export default DashboardView;
