import React, { useMemo } from 'react';
import { BarChart3, CreditCard, DollarSign, Globe, Receipt } from 'lucide-react';
import { SaleTransaction } from '../../types/platform';

type StripeSale = SaleTransaction & { source?: string; stripePaymentIntentId?: string };
interface RelatoriosViewProps { transactions?: SaleTransaction[]; }
const formatBRL = (value: number) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const RelatoriosView: React.FC<RelatoriosViewProps> = ({ transactions = [] }) => {
  const paidSales = useMemo(() => (transactions as StripeSale[]).filter((sale) => {
    const fromStripe = sale.source === 'stripe' || sale.id.startsWith('stripe_') || Boolean(sale.stripePaymentIntentId);
    const paid = ['aprovado', 'approved', 'liberado', 'received', 'confirmed'].includes(String(sale.status || '').toLowerCase());
    return fromStripe && paid;
  }), [transactions]);
  const totalGrossRevenue = paidSales.reduce((sum, sale) => sum + Number(sale.amount || 0), 0);
  const totalCommissions = paidSales.reduce((sum, sale) => sum + Number(sale.commissionEarned || 0), 0);
  const averageTicket = paidSales.length ? totalGrossRevenue / paidSales.length : 0;
  const sources = useMemo(() => {
    const grouped = new Map<string, { count: number; revenue: number; commission: number }>();
    for (const sale of paidSales) {
      const source = String(sale.utmSource || 'Direto').trim() || 'Direto';
      const current = grouped.get(source) || { count: 0, revenue: 0, commission: 0 };
      current.count += 1;
      current.revenue += Number(sale.amount || 0);
      current.commission += Number(sale.commissionEarned || 0);
      grouped.set(source, current);
    }
    return Array.from(grouped, ([source, values]) => ({ source, ...values })).sort((a, b) => b.revenue - a.revenue);
  }, [paidSales]);

  return (
    <main className="space-y-6" id="leadspay-relatorios-view">
      <header>
        <div className="mb-1 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#5ba63c]"><BarChart3 className="h-4 w-4" aria-hidden="true" /> Relatórios Stripe</div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Desempenho de vendas</h1>
        <p className="mt-1 text-sm leading-6 text-slate-600">Indicadores derivados de pagamentos Stripe confirmados. Cliques e taxas de conversão não são mostrados porque ainda não há um coletor de visitas persistido.</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Resumo de pagamentos">
        <Metric label="Vendas confirmadas" value={String(paidSales.length)} note="Webhook Stripe" icon={<Receipt className="h-4 w-4" />} />
        <Metric label="Faturamento bruto" value={formatBRL(totalGrossRevenue)} note="Valor processado em teste" icon={<DollarSign className="h-4 w-4" />} accent />
        <Metric label="Ticket médio" value={formatBRL(averageTicket)} note="Média por pagamento confirmado" icon={<CreditCard className="h-4 w-4" />} />
        <Metric label="Comissões registradas" value={formatBRL(totalCommissions)} note="Conforme o split salvo no pedido" icon={<DollarSign className="h-4 w-4" />} />
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4"><h2 className="flex items-center gap-2 font-semibold text-slate-900"><Globe className="h-4 w-4 text-[#5ba63c]" aria-hidden="true" /> Vendas por origem atribuída</h2><p className="mt-1 text-xs text-slate-500">A origem vem do código UTM recebido pelo checkout. Não representa contagem de cliques.</p></div>
        {sources.length === 0 ? (
          <div className="px-5 py-14 text-center"><BarChart3 className="mx-auto h-9 w-9 text-slate-300" aria-hidden="true" /><h3 className="mt-3 text-sm font-semibold text-slate-800">Ainda não há vendas Stripe confirmadas</h3><p className="mt-1 text-xs text-slate-500">Quando uma compra for confirmada, seus dados aparecerão nesta seção.</p></div>
        ) : (
          <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3 font-medium">Origem</th><th className="px-5 py-3 text-right font-medium">Vendas</th><th className="px-5 py-3 text-right font-medium">Faturamento bruto</th><th className="px-5 py-3 text-right font-medium">Comissões</th></tr></thead><tbody className="divide-y divide-slate-100">{sources.map((item) => <tr key={item.source} className="hover:bg-slate-50/70"><td className="px-5 py-3 font-medium text-slate-900">{item.source}</td><td className="px-5 py-3 text-right text-slate-700">{item.count}</td><td className="px-5 py-3 text-right font-semibold text-slate-900">{formatBRL(item.revenue)}</td><td className="px-5 py-3 text-right text-slate-700">{formatBRL(item.commission)}</td></tr>)}</tbody></table></div>
        )}
      </section>
    </main>
  );
};

const Metric: React.FC<{ label: string; value: string; note: string; icon: React.ReactNode; accent?: boolean }> = ({ label, value, note, icon, accent }) => (
  <article className={`rounded-2xl border bg-white p-5 shadow-sm ${accent ? 'border-[#b9dda8]' : 'border-slate-200'}`}><div className="flex items-center justify-between gap-3 text-xs font-medium text-slate-500"><span>{label}</span><span className={`rounded-lg p-2 ${accent ? 'bg-[#e8f4df] text-[#3f7f33]' : 'bg-slate-100 text-slate-600'}`}>{icon}</span></div><div className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">{value}</div><p className="mt-1 text-xs text-slate-500">{note}</p></article>
);
