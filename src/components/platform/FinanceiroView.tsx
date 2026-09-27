import React, { useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Clock3, CreditCard, Receipt, ShieldCheck, Wallet } from 'lucide-react';
import { UserRoleMode, UserSellerProfile, SaleTransaction, CompanyStartup } from '../../types/platform';
import { StripeConnectPanel } from './StripeConnectPanel';

type StripeSale = SaleTransaction & {
  source?: string;
  stripePaymentIntentId?: string;
  stripeTransferIds?: Record<string, string>;
  transferStatus?: string;
};

interface FinanceiroViewProps {
  roleMode?: UserRoleMode;
  userProfile: UserSellerProfile;
  company?: CompanyStartup | null;
  transactions?: SaleTransaction[];
}

const money = (value: number) => Number.isFinite(value)
  ? value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  : 'R$ 0,00';

const isPaid = (sale: StripeSale) => ['aprovado', 'approved', 'liberado', 'received', 'confirmed'].includes(String(sale.status || '').toLowerCase());
const isStripeSale = (sale: StripeSale) => sale.source === 'stripe' || sale.id.startsWith('stripe_') || Boolean(sale.stripePaymentIntentId);

export const FinanceiroView: React.FC<FinanceiroViewProps> = ({
  roleMode = 'afiliado',
  userProfile,
  company = null,
  transactions = [],
}) => {
  const [activeCompanyTab, setActiveCompanyTab] = useState<'resumo' | 'faturamento'>('resumo');
  const sales = useMemo(
    () => (transactions as StripeSale[]).filter(isStripeSale).filter(isPaid),
    [transactions],
  );

  const totals = useMemo(() => sales.reduce((sum, sale) => {
    const gross = Number(sale.amount) || 0;
    const commission = Number(sale.commissionEarned ?? sale.financialBreakdown?.affiliateCommission) || 0;
    const platformFee = Number(sale.checkoutFee ?? sale.financialBreakdown?.platformFee) || 0;
    const companyNet = Number(sale.netCompanyAmount ?? sale.financialBreakdown?.netCompanyAmount) || Math.max(0, gross - commission - platformFee);
    const released = sale.releaseStatus === 'disponivel' || sale.transferStatus === 'completed';
    const viewerAmount = roleMode === 'afiliado' ? commission : companyNet;
    sum.gross += gross;
    sum.commissions += commission;
    sum.platformFees += platformFee;
    sum.companyNet += companyNet;
    sum.pending += released ? 0 : viewerAmount;
    sum.transferred += released ? viewerAmount : 0;
    if (released) sum.releasedCount += 1;
    return sum;
  }, { gross: 0, commissions: 0, platformFees: 0, companyNet: 0, pending: 0, transferred: 0, releasedCount: 0 }), [sales, roleMode]);

  const methods = useMemo(() => {
    const grouped = new Map<string, { count: number; amount: number }>();
    for (const sale of sales) {
      const label = String(sale.method || 'Stripe');
      const item = grouped.get(label) || { count: 0, amount: 0 };
      item.count += 1;
      item.amount += roleMode === 'afiliado'
        ? Number(sale.commissionEarned || 0)
        : Number(sale.amount || 0);
      grouped.set(label, item);
    }
    return Array.from(grouped.entries()).sort((a, b) => b[1].amount - a[1].amount);
  }, [sales, roleMode]);

  const isCompany = roleMode === 'empresa';
  const title = isCompany ? 'Financeiro da empresa' : 'Comissões e repasses';
  const displayName = isCompany ? (company?.name || userProfile.name || 'Empresa') : (userProfile.name || 'Afiliado');
  const viewerLabel = isCompany ? 'Líquido previsto para a empresa' : 'Comissões registradas';

  return (
    <div className="space-y-6" id="leadspay-financeiro-view">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-1 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#5ba63c]">
            <Wallet className="h-4 w-4" aria-hidden="true" /> Stripe Connect · {displayName}
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">{title}</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
            A atividade abaixo vem de pagamentos confirmados pelo webhook Stripe. Dados legados de saldo e saques Pix não são tratados como repasses Stripe.
          </p>
        </div>
        {isCompany && (
          <div className="flex gap-2 rounded-xl border border-slate-200 bg-white p-1" role="tablist" aria-label="Visão financeira">
            <button type="button" role="tab" aria-selected={activeCompanyTab === 'resumo'} onClick={() => setActiveCompanyTab('resumo')} className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${activeCompanyTab === 'resumo' ? 'bg-[#e8f4df] text-[#3f7f33]' : 'text-slate-500 hover:bg-slate-50'}`}>Resumo</button>
            <button type="button" role="tab" aria-selected={activeCompanyTab === 'faturamento'} onClick={() => setActiveCompanyTab('faturamento')} className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${activeCompanyTab === 'faturamento' ? 'bg-[#e8f4df] text-[#3f7f33]' : 'text-slate-500 hover:bg-slate-50'}`}>Detalhamento</button>
          </div>
        )}
      </header>

      <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900" role="status">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <p><strong>Ambiente Stripe de teste.</strong> Os valores apresentados são registros de teste; não representam dinheiro real disponível para saque. Conclua o onboarding da conta conectada para testar o fluxo.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label={isCompany ? 'Vendas brutas Stripe' : 'Vendas atribuídas'} value={money(totals.gross)} detail={`${sales.length} pagamento(s) confirmado(s)`} icon={<Receipt className="h-4 w-4" />} />
        <MetricCard label={viewerLabel} value={money(isCompany ? totals.companyNet : totals.commissions)} detail={isCompany ? 'Após comissão de afiliado e taxa LeadsPay' : 'Comissão conforme o split registrado'} icon={<ArrowDownRight className="h-4 w-4" />} accent />
        <MetricCard label="Em prazo D+9" value={money(totals.pending)} detail="Aguardando liberação de transferência Stripe" icon={<Clock3 className="h-4 w-4" />} />
        <MetricCard label="Repassado à conta Stripe" value={money(totals.transferred)} detail={`${totals.releasedCount} venda(s) com transferência concluída`} icon={<ArrowUpRight className="h-4 w-4" />} />
      </div>

      {isCompany && activeCompanyTab === 'faturamento' && (
        <section className="grid gap-4 md:grid-cols-3" aria-label="Detalhamento financeiro">
          <MetricCard label="Taxas LeadsPay registradas" value={money(totals.platformFees)} detail="Taxa da plataforma por pagamento" icon={<CreditCard className="h-4 w-4" />} />
          <MetricCard label="Comissões de afiliados" value={money(totals.commissions)} detail="Parte destinada aos afiliados" icon={<ArrowDownRight className="h-4 w-4" />} />
          <MetricCard label="Receita líquida calculada" value={money(totals.companyNet)} detail="Derivada das vendas Stripe confirmadas" icon={<Wallet className="h-4 w-4" />} accent />
        </section>
      )}

      <StripeConnectPanel roleMode={roleMode} userProfile={userProfile} />

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-slate-900">Pagamentos e repasses Stripe</h2>
            <p className="mt-1 text-xs text-slate-500">A liberação D+9 inicia a transferência para sua conta Stripe Connect. O payout bancário segue o cronograma e as verificações da Stripe.</p>
          </div>
          <span className="inline-flex items-center gap-2 self-start rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 sm:self-auto"><CreditCard className="h-3.5 w-3.5" /> {methods.length} forma(s) de pagamento</span>
        </div>
        {methods.length > 0 && (
          <div className="flex flex-wrap gap-2 border-b border-slate-100 px-5 py-3">
            {methods.map(([method, item]) => <span key={method} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600">{method}: <strong className="text-slate-900">{money(item.amount)}</strong> · {item.count}</span>)}
          </div>
        )}
        {sales.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <Receipt className="mx-auto h-9 w-9 text-slate-300" aria-hidden="true" />
            <h3 className="mt-3 text-sm font-semibold text-slate-800">Nenhum pagamento Stripe confirmado</h3>
            <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-500">Quando o webhook Stripe confirmar uma compra, ela aparecerá aqui. Vendas antigas de outros meios não são misturadas com os dados Stripe.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3 font-medium">Data</th><th className="px-5 py-3 font-medium">Produto</th><th className="px-5 py-3 font-medium">Pagamento</th><th className="px-5 py-3 font-medium">Valor da conta</th><th className="px-5 py-3 font-medium">Repasse</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {sales.slice(0, 50).map((sale) => {
                  const released = sale.releaseStatus === 'disponivel' || sale.transferStatus === 'completed';
                  const amount = isCompany ? Number(sale.netCompanyAmount ?? sale.financialBreakdown?.netCompanyAmount ?? 0) : Number(sale.commissionEarned || 0);
                  return <tr key={sale.id} className="hover:bg-slate-50/70">
                    <td className="whitespace-nowrap px-5 py-3 text-xs text-slate-600">{sale.paidAt ? new Date(sale.paidAt).toLocaleDateString('pt-BR') : sale.date || '—'}</td>
                    <td className="px-5 py-3"><div className="font-medium text-slate-900">{sale.platformName || 'Produto'}</div><div className="mt-0.5 text-xs text-slate-500">{sale.id}</div></td>
                    <td className="px-5 py-3 text-xs text-slate-600">{sale.method || 'Stripe'}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-sm font-semibold text-slate-900">{money(amount)}</td>
                    <td className="px-5 py-3"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${released ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}><span className={`h-1.5 w-1.5 rounded-full ${released ? 'bg-emerald-500' : 'bg-amber-500'}`} />{released ? 'Transferido para Connect' : 'Em prazo D+9'}</span></td>
                  </tr>;
                })}
              </tbody>
            </table>
            {sales.length > 50 && <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">Mostrando os 50 pagamentos mais recentes.</p>}
          </div>
        )}
      </section>
    </div>
  );
};

const MetricCard: React.FC<{ label: string; value: string; detail: string; icon: React.ReactNode; accent?: boolean }> = ({ label, value, detail, icon, accent }) => (
  <article className={`rounded-2xl border bg-white p-5 shadow-sm ${accent ? 'border-[#b9dda8]' : 'border-slate-200'}`}>
    <div className="flex items-center justify-between gap-3 text-xs font-medium text-slate-500"><span>{label}</span><span className={`rounded-lg p-2 ${accent ? 'bg-[#e8f4df] text-[#3f7f33]' : 'bg-slate-100 text-slate-600'}`}>{icon}</span></div>
    <div className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">{value}</div>
    <p className="mt-1 text-xs text-slate-500">{detail}</p>
  </article>
);
