import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Search, Store, ExternalLink } from 'lucide-react';
type Offer = { id: string; companyId: string; companyName: string; companySlug: string; companyLogo: string; name: string; description: string; category: string; bannerImage: string; price: number; billingType: string; billingCycle: string };
type Company = { id: string; name: string; slug: string; tagline: string; logo: string; description: string; category: string };
const categories = ['Todos', 'Gastronomia', 'IA & Automação', 'Tecnologia', 'Varejo e E-commerce', 'Saúde e Clínicas', 'Beleza e Estética', 'Educação e Escolas', 'Imobiliário', 'Hotelaria e Turismo', 'Logística e Transportes', 'Construção Civil', 'Finanças e Contabilidade', 'Marketing e Vendas', 'Recursos Humanos', 'Jurídico', 'Agro e Agronegócio', 'Indústria', 'Atendimento e CRM', 'Gestão Empresarial', 'SaaS / B2B', 'Fintech & Pagamentos', 'Marketing & Vendas'];
const periods = ['Todos', 'Mensal', 'Anual', 'Semanal', 'Pagamento único'];
function periodOf(o: Offer) {
 const cycle = (o.billingCycle || '').toUpperCase();
 const type = (o.billingType || '').toLowerCase();
 if (cycle === 'YEARLY' || cycle === 'ANNUAL') return 'Anual';
 if (cycle === 'WEEKLY') return 'Semanal';
 if (cycle === 'MONTHLY') return 'Mensal';
 if (['unico', 'único', 'one_time'].includes(type)) return 'Pagamento único';
 return 'Outros planos';
}
export default function PublicMarketplace() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('Todos');
  const [period, setPeriod] = useState('Todos');
  const [search, setSearch] = useState('');
  const path = window.location.pathname;
  const companySlug = path.startsWith('/empresa/') ? decodeURIComponent(path.slice('/empresa/'.length).split('/')[0]) : '';
  useEffect(() => {
    fetch('/api/marketplace/public').then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Não foi possível carregar as ofertas.');
      setOffers(Array.isArray(data.offers) ? data.offers : []);
      setCompanies(Array.isArray(data.companies) ? data.companies : []);
    }).catch(err => setError(err.message || 'Vitrine indisponível.')).finally(() => setLoading(false));
  }, []);
  const company = companies.find(c => c.slug === companySlug || c.id === companySlug);
  const shown = useMemo(() => offers.filter(o => {
    if (companySlug && o.companyId !== company?.id) return false;
    if (category !== 'Todos' && o.category !== category) return false;
    if (period !== 'Todos' && periodOf(o) !== period) return false;
    const q = search.toLowerCase().trim();
    return !q || [o.name, o.description, o.companyName, o.category].some(x => x.toLowerCase().includes(q));
  }), [offers, category, period, search, companySlug, company]);
  return <main className="min-h-screen bg-[#050811] text-white p-4 sm:p-8">
    <div className="mx-auto max-w-7xl space-y-7">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
        <a href="/" className="text-2xl font-black tracking-tight">Leads<span className="text-[#D9F22A]">Pay</span></a>
        <a href={companySlug ? '/marketplace' : '/'} className="flex items-center gap-2 text-sm text-white/70 hover:text-white"><ArrowLeft size={16}/>{companySlug ? 'Explorar marketplace' : 'Página inicial'}</a>
      </header>
      {companySlug && !loading && !company ? <p className="rounded-xl border border-amber-500/30 p-5">Esta empresa não está disponível ou não foi verificada.</p> :
      <section className="rounded-3xl border border-white/10 bg-[#0e1423] p-6 sm:p-9">
        <div className="mb-2 text-xs font-bold uppercase tracking-widest text-[#D9F22A]">{companySlug ? 'Vitrine empresarial verificada' : 'Marketplace de Softwares LeadsPay'}</div>
        <h1 className="text-3xl sm:text-5xl font-black">{companySlug ? company?.name || 'Empresa' : 'Encontre softwares para seu negócio'}</h1>
        <p className="mt-3 max-w-2xl text-white/60">{companySlug ? company?.description || company?.tagline : 'Encontre softwares de empresas verificadas por setor, compare planos e contrate diretamente.'}</p>
      </section>}
      <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#0e1423] px-4"><Search size={18} className="text-white/40"/><input aria-label="Buscar ofertas" className="w-full bg-transparent py-4 outline-none" placeholder="Buscar softwares, soluções ou empresas..." value={search} onChange={e => setSearch(e.target.value)}/></div>
      {!companySlug && <nav aria-label="Categorias" className="flex flex-wrap gap-2">{categories.map(c => <button key={c} onClick={() => setCategory(c)} className={`rounded-full border px-4 py-2 text-xs font-semibold ${category === c ? 'border-[#D9F22A] bg-[#D9F22A] text-[#060A15]' : 'border-white/15 bg-[#0e1423] text-white/70'}`}>{c}</button>)}</nav>}
      <div className="flex flex-wrap items-center gap-2"><span className="text-sm text-white/50">Tipo de plano:</span>{periods.map(p => <button key={p} onClick={() => setPeriod(p)} className={period === p ? 'rounded-full border border-[#D9F22A] bg-[#D9F22A] px-4 py-2 text-xs font-semibold text-[#060A15]' : 'rounded-full border border-white/15 bg-[#0e1423] px-4 py-2 text-xs font-semibold text-white/70'}>{p}</button>)}</div>
      {error && <p role="alert" className="rounded-xl border border-red-500/30 p-4 text-red-300">{error}</p>}
      {loading ? <p className="py-12 text-center text-white/50">Carregando ofertas verificadas...</p> : shown.length === 0 ? <div className="rounded-2xl border border-white/10 p-12 text-center text-white/50"><Store className="mx-auto mb-3"/>{companySlug ? 'Nenhuma oferta publicada nesta vitrine.' : 'Nenhuma oferta encontrada nesta categoria.'}</div> :
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">{shown.map(o => <article key={o.id} className="overflow-hidden rounded-2xl border border-white/10 bg-[#0e1423]">
        {o.bannerImage ? <img src={o.bannerImage} alt="" className="h-44 w-full object-cover" loading="lazy"/> : <div className="flex h-32 items-center justify-center bg-[#131d2d]"><Store size={35} className="text-[#D9F22A]"/></div>}
        <div className="space-y-3 p-5"><div className="flex flex-wrap items-center gap-2 text-xs font-bold text-[#D9F22A]"><span>{o.category}</span><span className="rounded-full border border-white/15 px-2 py-1 text-white/70">{periodOf(o)}</span></div><h2 className="text-xl font-bold">{o.name}</h2><p className="line-clamp-3 text-sm text-white/60">{o.description}</p>
          <a className="block text-xs text-white/70 hover:text-[#D9F22A]" href={`/empresa/${encodeURIComponent(o.companySlug || o.companyId)}`}>{o.companyName} ↗</a>
          <div className="flex items-center justify-between gap-2 border-t border-white/10 pt-3"><span className="font-bold">{o.price > 0 ? o.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'Consulte condições'}</span><a href={`/checkout/${encodeURIComponent(o.id)}`} className="flex items-center gap-1 rounded-xl bg-[#D9F22A] px-4 py-2 text-sm font-bold text-[#060A15]">Ver oferta <ExternalLink size={14}/></a></div>
        </div>
      </article>)}</div>}
    </div>
  </main>;
}
