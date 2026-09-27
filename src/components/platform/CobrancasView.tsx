import React, { useMemo, useState } from 'react';
import { ArrowUpRight, CreditCard, ExternalLink, Search } from 'lucide-react';
import { SaleTransaction } from '../../types/platform';

type StripeSale = SaleTransaction & { source?: string; stripePaymentIntentId?: string };

interface CobrancasViewProps {
  sales?: SaleTransaction[];
  onGoToPaymentLinks?: () => void;
}

const isStripeSale = (sale: StripeSale) => sale.source === 'stripe' || sale.id.startsWith('stripe_') || Boolean(sale.stripePaymentIntentId);
const isPaid = (sale: StripeSale) => ['aprovado', 'approved', 'liberado', 'received', 'confirmed'].includes(String(sale.status || '').toLowerCase());
const formatBRL = (value: number) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const CobrancasView: React.FC<CobrancasViewProps> = ({ sales = [], onGoToPaymentLinks }) => {
  const [search, setSearch] = useState('');
  const stripeSales = useMemo(() => (sales as StripeSale[]).filter(isStripeSale), [sales]);
  const visibleSales = useMemo(() => {
    const query = search.trim().toLowerCase();
    const paidSales = stripeSales.filter(isPaid);
    if (!query) return paidSales;
    return paidSales.filter((sale) => `${sale.platformName || ''} ${sale.id} ${sale.method || ''}`.toLowerCase().includes(query));
  }, [stripeSales, search]);
  const total = visibleSales.reduce((sum, sale) => sum + Number(sale.amount || 0), 0);

  return (
    <main className="space-y-6" id="leadspay-cobrancas-view">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-1 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#5ba63c]"><CreditCard className="h-4 w-4" aria-hidden="true" /> Pagamentos Stripe</div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Cobranças confirmadas</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">Somente pagamentos confirmados pelo webhook aparecem aqui. Para receber, compartilhe um checkout vinculado a um produto e preço aprovado.</p>
        </div>
        <button type="button" onClick={onGoToPaymentLinks} disabled={!onGoToPaymentLinks} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#3f7f33] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#326829] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3f7f33] disabled:cursor-not-allowed disabled:opacity-50">
          Criar link de pagamento <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Pagamentos Stripe confirmados</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{visibleSales.length}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Valor bruto listado</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{formatBRL(total)}</p>
        </article>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className="font-semibold text-slate-900">Histórico de pagamentos</h2><p className="mt-1 text-xs text-slate-500">Valores e status confirmados no servidor; sem registros manuais ou vendas antigas de outros provedores.</p></div>
          <label className="relative block w-full sm:max-w-xs"><span className="sr-only">Buscar pagamento</span><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar produto, ID ou método" className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#5ba63c] focus:ring-2 focus:ring-[#5ba63c]/15" /></label>
        </div>
        {visibleSales.length === 0 ? (
          <div className="px-5 py-14 text-center"><CreditCard className="mx-auto h-9 w-9 text-slate-300" aria-hidden="true" /><h3 className="mt-3 text-sm font-semibold text-slate-800">Nenhum pagamento Stripe confirmado</h3><p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-500">Quando um cliente concluir o checkout e a Stripe confirmar o pagamento pelo webhook, o registro aparecerá aqui. Cobranças internas não são apresentadas como pagamentos.</p></div>
        ) : (
          <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3 font-medium">Data</th><th className="px-5 py-3 font-medium">Produto</th><th className="px-5 py-3 font-medium">Método</th><th className="px-5 py-3 font-medium">Valor</th><th className="px-5 py-3 font-medium">Status</th></tr></thead><tbody className="divide-y divide-slate-100">{visibleSales.map((sale) => <tr key={sale.id} className="hover:bg-slate-50/70"><td className="whitespace-nowrap px-5 py-3 text-xs text-slate-600">{sale.paidAt ? new Date(sale.paidAt).toLocaleDateString('pt-BR') : sale.date || '—'}</td><td className="px-5 py-3"><div className="font-medium text-slate-900">{sale.platformName || 'Produto'}</div><div className="mt-0.5 text-xs text-slate-500">{sale.id}</div></td><td className="px-5 py-3 text-xs text-slate-600">{sale.method || 'Stripe'}</td><td className="whitespace-nowrap px-5 py-3 font-semibold text-slate-900">{formatBRL(Number(sale.amount || 0))}</td><td className="px-5 py-3"><span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Confirmado</span></td></tr>)}</tbody></table></div>
        )}
      </section>
      <p className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600"><ExternalLink className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> Reembolsos, disputas e cobranças avulsas ainda não estão disponíveis neste piloto; não altere status por esta tela.</p>
    </main>
  );
};
