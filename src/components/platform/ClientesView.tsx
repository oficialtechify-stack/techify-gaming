import React, { useMemo, useState } from 'react';
import { Mail, Search, Users } from 'lucide-react';
import { CompanyStartup, SaleTransaction } from '../../types/platform';

interface ClientesViewProps {
  companies?: CompanyStartup[];
  activeCompanyId?: string;
  userRole?: string;
  sales?: SaleTransaction[];
  plans?: any[];
}

interface CustomerSummary {
  email: string;
  name: string;
  companyName: string;
  orders: number;
  totalSpent: number;
  lastProduct: string;
  lastPurchase: string;
}

const money = (amount: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount);
const dateLabel = (value?: string) => value ? new Date(value).toLocaleDateString('pt-BR') : '—';

export const ClientesView: React.FC<ClientesViewProps> = ({ sales = [] }) => {
  const [search, setSearch] = useState('');

  const customers = useMemo(() => {
    const grouped = new Map<string, CustomerSummary>();
    for (const sale of sales) {
      if ((sale as any).source !== 'stripe' || sale.status !== 'Aprovado') continue;
      const email = (sale.buyerEmail || '').trim().toLowerCase();
      if (!email) continue;
      const previous = grouped.get(email);
      const amount = Number(sale.amount) || 0;
      const when = sale.paidAt || sale.createdAt || sale.date;
      if (previous) {
        previous.orders += 1;
        previous.totalSpent += amount;
        if (when && (!previous.lastPurchase || new Date(when).getTime() > new Date(previous.lastPurchase).getTime())) {
          previous.lastPurchase = when;
          previous.lastProduct = sale.platformName || 'Pagamento Stripe';
          previous.name = sale.buyerName || previous.name;
          previous.companyName = sale.companyName || previous.companyName;
        }
      } else {
        grouped.set(email, {
          email,
          name: sale.buyerName || 'Cliente',
          companyName: sale.companyName || '—',
          orders: 1,
          totalSpent: amount,
          lastProduct: sale.platformName || 'Pagamento Stripe',
          lastPurchase: when || '',
        });
      }
    }
    return [...grouped.values()].sort((a, b) => (b.lastPurchase || '').localeCompare(a.lastPurchase || ''));
  }, [sales]);

  const normalizedSearch = search.trim().toLowerCase();
  const visibleCustomers = normalizedSearch
    ? customers.filter((customer) => [customer.name, customer.email, customer.companyName, customer.lastProduct].some((value) => value.toLowerCase().includes(normalizedSearch)))
    : customers;
  const revenue = customers.reduce((total, customer) => total + customer.totalSpent, 0);

  return (
    <main className="mx-auto max-w-6xl space-y-6" id="leadspay-clientes-module">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#3f7f33]"><Users className="h-4 w-4" aria-hidden="true" /> Relacionamento</div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Clientes</h1>
          <p className="mt-1 text-sm text-slate-600">Lista formada por compradores com pagamentos Stripe confirmados. Dados não são inseridos manualmente neste relatório.</p>
        </div>
        <label className="relative block w-full sm:max-w-xs"><span className="sr-only">Buscar clientes</span><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nome, e-mail ou produto" className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-[#3f7f33] focus:ring-2 focus:ring-[#3f7f33]/20" /></label>
      </header>

      <section className="grid gap-3 sm:grid-cols-3" aria-label="Resumo dos clientes">
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><span className="text-xs text-slate-500">Clientes com pagamento confirmado</span><div className="mt-1 text-2xl font-semibold text-slate-950">{customers.length}</div></article>
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><span className="text-xs text-slate-500">Pedidos pagos</span><div className="mt-1 text-2xl font-semibold text-slate-950">{customers.reduce((sum, customer) => sum + customer.orders, 0)}</div></article>
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><span className="text-xs text-slate-500">Volume bruto confirmado</span><div className="mt-1 text-2xl font-semibold text-[#326829]">{money(revenue)}</div></article>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" aria-label="Clientes confirmados">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 sm:px-5"><h2 className="text-sm font-semibold text-slate-900">Compradores</h2><span className="text-xs text-slate-500">{visibleCustomers.length} registros</span></div>
        {visibleCustomers.length === 0 ? (
          <div className="px-5 py-14 text-center"><div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-500"><Users className="h-5 w-5" aria-hidden="true" /></div><h3 className="mt-3 text-sm font-semibold text-slate-900">{customers.length ? 'Nenhum resultado' : 'Ainda não há clientes confirmados'}</h3><p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-500">Quando uma compra for confirmada pelo webhook Stripe, o comprador aparecerá aqui. Pagamentos pendentes ou cancelados não são contados como clientes pagantes.</p></div>
        ) : (
          <div className="overflow-x-auto"><table className="w-full min-w-[760px] border-collapse text-left"><thead><tr className="bg-slate-50 text-[10px] font-semibold uppercase tracking-wider text-slate-500"><th className="px-5 py-3">Cliente</th><th className="px-4 py-3">Empresa</th><th className="px-4 py-3">Último produto</th><th className="px-4 py-3">Pedidos</th><th className="px-4 py-3">Total pago</th><th className="px-4 py-3">Última compra</th><th className="px-4 py-3">Contato</th></tr></thead><tbody className="divide-y divide-slate-100">{visibleCustomers.map((customer) => <tr key={customer.email} className="text-sm text-slate-700"><td className="px-5 py-3"><div className="font-medium text-slate-900">{customer.name}</div><div className="text-xs text-slate-500">{customer.email}</div></td><td className="px-4 py-3">{customer.companyName}</td><td className="px-4 py-3">{customer.lastProduct}</td><td className="px-4 py-3">{customer.orders}</td><td className="px-4 py-3 font-medium text-slate-900">{money(customer.totalSpent)}</td><td className="px-4 py-3">{dateLabel(customer.lastPurchase)}</td><td className="px-4 py-3"><a className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3f7f33]" href={`mailto:${encodeURIComponent(customer.email)}`}><Mail className="h-3.5 w-3.5" aria-hidden="true" /> Redigir e-mail</a></td></tr>)}</tbody></table></div>
        )}
      </section>
      <p className="text-xs leading-5 text-slate-500">A ação de contato abre o aplicativo de e-mail padrão; ela não envia mensagens automaticamente.</p>
    </main>
  );
};
