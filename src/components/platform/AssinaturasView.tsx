import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  RefreshCw,
  Repeat,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { CompanyPlan, SaleTransaction, UserRoleMode, UserSellerProfile } from '../../types/platform';
import { useAuth } from '../../context/AuthContext';

interface AssinaturasViewProps {
  roleMode?: UserRoleMode;
  plans?: CompanyPlan[];
  sales?: SaleTransaction[];
  userProfile?: UserSellerProfile;
  onNavigateToProducts?: () => void;
  onOpenCreatePlan?: () => void;
  onOpenCheckout?: (plan: CompanyPlan) => void;
}

interface SubscriptionRow {
  id: string;
  planId?: string;
  planName?: string;
  companyId?: string;
  companyName?: string;
  buyerName?: string;
  buyerEmail?: string;
  affiliateId?: string | null;
  affiliateCode?: string | null;
  billingCycle?: string;
  recurringCommissionEnabled?: boolean;
  affiliatePercentInitial?: number;
  affiliatePercentRecurring?: number;
  status?: string;
  active?: boolean;
  cancelAtPeriodEnd?: boolean;
  lastInvoiceId?: string;
  lastPaidAt?: string;
  updatedAt?: string;
  renewalsPaid?: number;
  recurringCommissionEarned?: number;
  totalCommissionEarned?: number;
}

const money = (value: number) =>
  Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const cycleLabel = (value?: string) => {
  const cycle = String(value || '').toUpperCase();
  if (cycle === 'WEEKLY') return 'Semanal';
  if (cycle === 'BIWEEKLY') return 'Quinzenal';
  if (cycle === 'BIMONTHLY') return 'Bimestral';
  if (cycle === 'QUARTERLY') return 'Trimestral';
  if (cycle === 'SEMIANNUALLY') return 'Semestral';
  if (cycle === 'YEARLY') return 'Anual';
  return 'Mensal';
};

const statusLabel = (sub: SubscriptionRow) => {
  if (sub.cancelAtPeriodEnd) return 'Cancela no fim do ciclo';
  const status = String(sub.status || '').toLowerCase();
  if (status === 'active' || status === 'trialing') return 'Ativa';
  if (status === 'past_due') return 'Pagamento atrasado';
  if (status === 'canceled') return 'Cancelada';
  if (status === 'unpaid') return 'Não paga';
  return status || 'Pendente';
};

const approved = (value: unknown) =>
  ['aprovado', 'approved', 'liberado', 'received', 'confirmed'].includes(
    String(value || '').trim().toLowerCase(),
  );

export const AssinaturasView: React.FC<AssinaturasViewProps> = ({
  roleMode = 'empresa',
  plans = [],
  sales = [],
  onNavigateToProducts,
  onOpenCreatePlan,
  onOpenCheckout,
}) => {
  const { currentUser } = useAuth();
  const isAffiliate = roleMode === 'afiliado';
  const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const recurringPlans = useMemo(
    () => plans.filter((plan) => plan.billingType === 'recorrente' || plan.paymentType === 'Recorrente' || plan.paymentType === 'Assinatura'),
    [plans],
  );
  const planMap = useMemo(() => new Map(plans.map((plan) => [plan.id, plan])), [plans]);

  const load = async () => {
    if (!currentUser || roleMode === 'admin') {
      setSubscriptions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setFeedback(null);
    try {
      const token = await currentUser.getIdToken();
      const endpoint = isAffiliate ? '/api/affiliates/subscriptions' : '/api/company/subscriptions';
      const response = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Não foi possível carregar as assinaturas.');
      setSubscriptions(Array.isArray(data.subscriptions) ? data.subscriptions : []);
    } catch (error) {
      setSubscriptions([]);
      setFeedback({
        type: 'error',
        text: error instanceof Error ? error.message : 'Não foi possível carregar as assinaturas.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [currentUser?.uid, roleMode]);

  const cancelAtPeriodEnd = async (subscriptionId: string) => {
    if (!currentUser || processingId || isAffiliate) return;
    const confirmed = window.confirm(
      'Cancelar a renovação automática? O cliente mantém o acesso até o final do período já pago.',
    );
    if (!confirmed) return;

    setProcessingId(subscriptionId);
    setFeedback(null);
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch('/api/company/subscriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'cancel_at_period_end', subscriptionId }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Não foi possível cancelar a renovação.');

      setSubscriptions((current) =>
        current.map((item) =>
          item.id === subscriptionId ? { ...item, cancelAtPeriodEnd: true } : item,
        ),
      );
      setFeedback({
        type: 'success',
        text: 'Renovação automática cancelada. O acesso permanece até o fim do ciclo atual.',
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        text: error instanceof Error ? error.message : 'Não foi possível cancelar a renovação.',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const activeSubscriptions = subscriptions.filter(
    (sub) => sub.active === true && !['canceled', 'unpaid'].includes(String(sub.status || '').toLowerCase()),
  );

  const renewalSales = sales.filter((sale) => sale.saleKind === 'subscription_renewal' && approved(sale.status));
  const recurringSales = sales.filter((sale) => sale.recurring === true && approved(sale.status));
  const recurringGross = recurringSales.reduce((sum, sale) => sum + Number(sale.amount || 0), 0);
  const recurringAffiliateCommission = isAffiliate
    ? renewalSales.reduce((sum, sale) => sum + Number(sale.commissionEarned || 0), 0)
    : 0;

  if (isAffiliate) {
    const totalRecurringCommission = subscriptions.length
      ? subscriptions.reduce((sum, sub) => sum + Number(sub.recurringCommissionEarned || 0), 0)
      : recurringAffiliateCommission;
    const totalRenewals = subscriptions.length
      ? subscriptions.reduce((sum, sub) => sum + Number(sub.renewalsPaid || 0), 0)
      : renewalSales.length;

    return (
      <main className="space-y-6" id="leadspay-assinaturas-afiliado-view">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-1 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#D9F22A]">
              <Repeat className="h-4 w-4" />
              Programa de Afiliados
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">Comissões Recorrentes</h1>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-white/50">
              Acompanhe somente as assinaturas originadas pelos seus links. A empresa controla o produto e a cobrança; você acompanha suas renovações e comissões.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-xs font-bold text-white/70 transition hover:bg-white/10 disabled:opacity-40"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </header>

        {feedback && (
          <div className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{feedback.text}</span>
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-4">
          <article className="rounded-2xl border border-white/10 bg-[#080d1a] p-5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-white/35">Assinaturas originadas</div>
            <div className="mt-2 text-2xl font-black text-white">{subscriptions.length}</div>
          </article>
          <article className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] p-5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400/70">Ativas</div>
            <div className="mt-2 text-2xl font-black text-emerald-400">{activeSubscriptions.length}</div>
          </article>
          <article className="rounded-2xl border border-white/10 bg-[#080d1a] p-5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-white/35">Renovações pagas</div>
            <div className="mt-2 text-2xl font-black text-white">{totalRenewals}</div>
          </article>
          <article className="rounded-2xl border border-[#D9F22A]/30 bg-[#D9F22A]/5 p-5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#D9F22A]">Comissões em renovações</div>
            <div className="mt-2 text-2xl font-black text-[#D9F22A]">{money(totalRecurringCommission)}</div>
          </article>
        </section>

        <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#080d1a]">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <div>
              <h2 className="text-sm font-bold text-white">Suas assinaturas comissionadas</h2>
              <p className="mt-1 text-[11px] text-white/40">Nenhum dado bancário ou controle da assinatura é exposto ao afiliado.</p>
            </div>
            <ShieldCheck className="h-4 w-4 text-[#D9F22A]" />
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 p-10 text-xs text-white/45">
              <Loader2 className="h-4 w-4 animate-spin text-[#D9F22A]" />
              Carregando comissões recorrentes...
            </div>
          ) : subscriptions.length === 0 ? (
            <div className="p-10 text-center">
              <Repeat className="mx-auto h-8 w-8 text-white/20" />
              <h3 className="mt-3 text-sm font-bold text-white">Nenhuma comissão recorrente ainda</h3>
              <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-white/40">
                Quando uma venda recorrente for atribuída ao seu link, ela aparecerá aqui após a confirmação da Stripe.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-xs">
                <thead className="bg-white/[0.025] text-[10px] uppercase tracking-wider text-white/35">
                  <tr>
                    <th className="px-5 py-3">Empresa / Produto</th>
                    <th className="px-4 py-3">Ciclo</th>
                    <th className="px-4 py-3">Comissão inicial</th>
                    <th className="px-4 py-3">Renovação</th>
                    <th className="px-4 py-3">Renovações pagas</th>
                    <th className="px-4 py-3">Comissão recebida</th>
                    <th className="px-4 py-3">Último pagamento</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {subscriptions.map((sub) => {
                    const active = sub.active === true && !['canceled', 'unpaid'].includes(String(sub.status || '').toLowerCase());
                    return (
                      <tr key={sub.id} className="text-white/65">
                        <td className="px-5 py-4">
                          <div className="font-bold text-white">{sub.planName || 'Produto recorrente'}</div>
                          <div className="mt-0.5 text-[10px] text-white/35">{sub.companyName || 'Empresa parceira'}</div>
                        </td>
                        <td className="px-4 py-4">{cycleLabel(sub.billingCycle)}</td>
                        <td className="px-4 py-4">{Number(sub.affiliatePercentInitial || 0)}%</td>
                        <td className="px-4 py-4 font-bold text-[#D9F22A]">
                          {sub.recurringCommissionEnabled === false ? 'Sem recorrência' : `${Number(sub.affiliatePercentRecurring || 0)}%`}
                        </td>
                        <td className="px-4 py-4">{Number(sub.renewalsPaid || 0)}</td>
                        <td className="px-4 py-4 font-black text-[#D9F22A]">{money(Number(sub.totalCommissionEarned || 0))}</td>
                        <td className="px-4 py-4">{sub.lastPaidAt ? new Date(sub.lastPaidAt).toLocaleDateString('pt-BR') : '—'}</td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-bold ${
                            active
                              ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                              : 'border-white/10 bg-white/5 text-white/45'
                          }`}>
                            {active ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                            {statusLabel(sub)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    );
  }

  return (
    <main className="space-y-6" id="leadspay-assinaturas-view">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-1 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#D9F22A]">
            <Repeat className="h-4 w-4" />
            Stripe Billing
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">Assinaturas</h1>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-white/50">
            Assinaturas reais da empresa. Renovações são confirmadas pela Stripe e geram comissão recorrente para o afiliado quando configurado no produto.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-bold text-white/70 transition hover:bg-white/10 disabled:opacity-40"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
          {onOpenCreatePlan && (
            <button
              type="button"
              onClick={onOpenCreatePlan}
              className="inline-flex min-h-10 items-center rounded-xl bg-[#D9F22A] px-4 text-xs font-black text-[#07100A]"
            >
              Criar produto recorrente
            </button>
          )}
        </div>
      </header>

      {feedback && (
        <div className={`flex items-start gap-2 rounded-xl border p-3 text-xs ${
          feedback.type === 'error'
            ? 'border-red-500/20 bg-red-500/10 text-red-400'
            : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
        }`}>
          {feedback.type === 'error' ? <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
          <span>{feedback.text}</span>
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-4">
        <article className="rounded-2xl border border-white/10 bg-[#080d1a] p-5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-white/35">Produtos recorrentes</div>
          <div className="mt-2 text-2xl font-black text-white">{recurringPlans.length}</div>
        </article>
        <article className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] p-5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400/70">Assinaturas ativas</div>
          <div className="mt-2 text-2xl font-black text-emerald-400">{activeSubscriptions.length}</div>
        </article>
        <article className="rounded-2xl border border-white/10 bg-[#080d1a] p-5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-white/35">Renovações pagas</div>
          <div className="mt-2 text-2xl font-black text-white">{renewalSales.length}</div>
        </article>
        <article className="rounded-2xl border border-white/10 bg-[#080d1a] p-5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-white/35">Receita recorrente processada</div>
          <div className="mt-2 text-2xl font-black text-[#D9F22A]">{money(recurringGross)}</div>
        </article>
      </section>

      {recurringPlans.length > 0 && (
        <section className="rounded-2xl border border-white/10 bg-[#080d1a] p-5">
          <h2 className="text-sm font-bold text-white">Produtos com cobrança recorrente</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {recurringPlans.map((plan) => (
              <div key={plan.id} className="rounded-xl border border-white/8 bg-[#050811] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-bold text-white">{plan.name}</div>
                    <div className="mt-1 text-[11px] text-white/45">
                      {money(Number(plan.priceMonthly || plan.priceSetup || plan.price || 0))} • {cycleLabel(plan.billingCycle)}
                    </div>
                    <div className="mt-2 text-[11px] text-[#D9F22A]">
                      Comissão inicial: {Number(plan.commissionPercentage || 0)}%
                      {plan.recurringCommissionEnabled !== false && (
                        <> • Renovações: {Number(plan.recurrentCommissionPercent || plan.commissionPercentage || 0)}%</>
                      )}
                    </div>
                  </div>
                  {onOpenCheckout && (
                    <button
                      type="button"
                      onClick={() => onOpenCheckout(plan)}
                      className="rounded-lg border border-white/10 bg-white/5 p-2 text-white/60 transition hover:text-[#D9F22A]"
                      title="Abrir checkout"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#080d1a]">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <h2 className="text-sm font-bold text-white">Clientes assinantes</h2>
            <p className="mt-1 text-[11px] text-white/40">Status sincronizado com eventos Stripe.</p>
          </div>
          <ShieldCheck className="h-4 w-4 text-[#D9F22A]" />
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 p-10 text-xs text-white/45">
            <Loader2 className="h-4 w-4 animate-spin text-[#D9F22A]" />
            Carregando assinaturas...
          </div>
        ) : subscriptions.length === 0 ? (
          <div className="p-10 text-center">
            <Repeat className="mx-auto h-8 w-8 text-white/20" />
            <h3 className="mt-3 text-sm font-bold text-white">Nenhuma assinatura criada</h3>
            <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-white/40">
              Quando um cliente contratar um produto recorrente e a Stripe confirmar a cobrança, a assinatura aparecerá aqui.
            </p>
            {onNavigateToProducts && (
              <button type="button" onClick={onNavigateToProducts} className="mt-4 text-xs font-bold text-[#D9F22A] hover:underline">
                Ir para produtos
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-xs">
              <thead className="bg-white/[0.025] text-[10px] uppercase tracking-wider text-white/35">
                <tr>
                  <th className="px-5 py-3">Cliente</th>
                  <th className="px-4 py-3">Produto</th>
                  <th className="px-4 py-3">Ciclo</th>
                  <th className="px-4 py-3">Afiliado</th>
                  <th className="px-4 py-3">Último pagamento</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {subscriptions.map((sub) => {
                  const plan = sub.planId ? planMap.get(sub.planId) : undefined;
                  const active = sub.active === true && !['canceled', 'unpaid'].includes(String(sub.status || '').toLowerCase());
                  return (
                    <tr key={sub.id} className="text-white/65">
                      <td className="px-5 py-4">
                        <div className="font-bold text-white">{sub.buyerName || 'Cliente'}</div>
                        <div className="mt-0.5 text-[10px] text-white/35">{sub.buyerEmail || '—'}</div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-semibold text-white">{plan?.name || sub.planName || sub.planId || 'Produto recorrente'}</div>
                      </td>
                      <td className="px-4 py-4">{cycleLabel(sub.billingCycle)}</td>
                      <td className="px-4 py-4">
                        {sub.affiliateCode ? (
                          <div>
                            <div className="font-mono text-[#D9F22A]">{sub.affiliateCode}</div>
                            <div className="mt-0.5 text-[10px] text-white/35">
                              {sub.recurringCommissionEnabled
                                ? `${Number(sub.affiliatePercentRecurring || 0)}% nas renovações`
                                : 'Sem comissão recorrente'}
                            </div>
                          </div>
                        ) : <span className="text-white/35">Venda direta</span>}
                      </td>
                      <td className="px-4 py-4">{sub.lastPaidAt ? new Date(sub.lastPaidAt).toLocaleDateString('pt-BR') : '—'}</td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-bold ${
                          active
                            ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                            : 'border-white/10 bg-white/5 text-white/45'
                        }`}>
                          {active ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                          {statusLabel(sub)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        {active && !sub.cancelAtPeriodEnd ? (
                          <button
                            type="button"
                            disabled={processingId === sub.id}
                            onClick={() => void cancelAtPeriodEnd(sub.id)}
                            className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-[10px] font-bold text-red-300 transition hover:bg-red-500/20 disabled:opacity-40"
                          >
                            {processingId === sub.id ? 'Processando...' : 'Cancelar renovação'}
                          </button>
                        ) : <span className="text-[10px] text-white/30">Sem ação</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
};
