import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Search, Store, ExternalLink, Pencil, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
type Offer = { id: string; companyId: string; companyName: string; companySlug: string; companyLogo: string; name: string; description: string; category: string; bannerImage: string; price: number; billingType: string; billingCycle: string };
type Company = { id: string; name: string; slug: string; tagline: string; logo: string; bannerImage: string; website: string; description: string; category: string; ownerId: string };
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
  const { currentUser, userProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [draft, setDraft] = useState({ logo: '', bannerImage: '', tagline: '', description: '', website: '' });
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
  const canEdit = !!currentUser && !!company && company.ownerId === currentUser.uid && userProfile.companyId === company.id && userProfile.hasCompanyProfile === true;
  const startEdit = () => { if (!company) return; setDraft({ logo: company.logo || '', bannerImage: company.bannerImage || '', tagline: company.tagline || '', description: company.description || '', website: company.website || '' }); setFeedback(''); setEditing(true); };
  const saveProfile = async () => { if (!company || !currentUser || !canEdit) return; setSaving(true); setFeedback(''); try { const token = await currentUser.getIdToken(); const response = await fetch('/api/company/storefront', { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ companyId: company.id, ...draft }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Erro ao salvar.'); setCompanies(prev => prev.map(item => item.id === company.id ? { ...item, ...draft } : item)); setEditing(false); setFeedback('Perfil atualizado com sucesso.'); } catch (err) { setFeedback(err instanceof Error ? err.message : 'Falha ao salvar.'); } finally { setSaving(false); } };
  const shareProfile = async () => { const url = window.location.href; try { if (navigator.share) await navigator.share({ title: company?.name || 'LeadsPay', url }); else if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(url); setFeedback('Link do perfil copiado!'); } else { window.prompt('Copie o link do perfil:', url); } } catch (err) { if ((err as Error)?.name !== 'AbortError') window.prompt('Copie o link do perfil:', url); } };
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
        <button type="button" onClick={() => { if (window.history.length > 1) window.history.back(); else window.location.assign(companySlug ? '/marketplace' : '/'); }} className="flex items-center gap-2 text-sm text-white/70 hover:text-white"><ArrowLeft size={16}/>{companySlug ? 'Voltar à página anterior' : 'Voltar'}</button>
      </header>
      {companySlug ? (!loading && !error && !company ? <p className="rounded-xl border border-amber-500/30 p-5">Esta empresa não está disponível ou não foi verificada.</p> : <section className="overflow-hidden rounded-3xl border border-white/10 bg-[#0e1423]">
        <div className="relative h-44 sm:h-64 lg:h-72 bg-gradient-to-br from-[#172d26] via-[#0e1423] to-[#35431a]">
          {company?.bannerImage && <img src={company.bannerImage} alt="Foto de capa da empresa" className="h-full w-full object-cover"/>}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0e1423]/70 to-transparent"/>
        </div>
        <div className="relative px-5 pb-7 sm:px-9">
          <div className="-mt-12 sm:-mt-16 flex flex-wrap items-end justify-between gap-4">
            <div className="flex items-end gap-4">
              <div className="flex h-24 w-24 sm:h-32 sm:w-32 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-[#0e1423] bg-[#17222b] shadow-xl">
                {company?.logo ? <img src={company.logo} alt={company.name} className="h-full w-full object-cover"/> : <Store size={40} className="text-[#D9F22A]"/>}
              </div>
              <div className="pb-1"><div className="text-[11px] font-bold uppercase tracking-widest text-[#D9F22A]">Empresa verificada</div><h1 className="mt-1 text-xl sm:text-3xl font-black">{company?.name || 'Empresa'}</h1></div>
            </div>
            <div className="flex flex-wrap gap-2">{canEdit && <button onClick={startEdit} className="flex items-center gap-2 rounded-xl bg-[#D9F22A] px-4 py-2 text-sm font-bold text-[#060A15]"><Pencil size={15}/> Editar perfil</button>}<button onClick={() => { void shareProfile(); }} className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold">Compartilhar perfil</button></div>
          </div>
          {company?.tagline && <p className="mt-5 font-semibold text-white/80">{company.tagline}</p>}
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/60">{company?.description || 'Conheça os softwares e planos desta empresa.'}</p>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            {company?.category && <span className="rounded-full bg-white/10 px-3 py-1">{company.category}</span>}
            {company?.website && /^https:\/\//i.test(company.website) && <a href={company.website} target="_blank" rel="noopener noreferrer" className="rounded-full border border-white/20 px-3 py-1 text-[#D9F22A]">Site oficial ↗</a>}
            <span className="rounded-full bg-white/10 px-3 py-1">{offers.filter(o => o.companyId === company?.id).length} planos publicados</span>
          </div>
        </div>
      </section>) : <section className="rounded-3xl border border-white/10 bg-[#0e1423] p-6 sm:p-9">
        <div className="mb-2 text-xs font-bold uppercase tracking-widest text-[#D9F22A]">Marketplace de Softwares LeadsPay</div>
        <h1 className="text-3xl sm:text-5xl font-black">Encontre softwares para seu negócio</h1>
        <p className="mt-3 max-w-2xl text-white/60">Encontre softwares de empresas verificadas por setor, compare planos e contrate diretamente.</p>
      </section>}
      {feedback && <p role="status" className="rounded-xl border border-white/15 bg-[#0e1423] p-3 text-sm">{feedback}</p>}
      {editing && canEdit && <section className="space-y-4 rounded-2xl border border-[#D9F22A]/30 bg-[#0e1423] p-5"><div className="flex items-center justify-between"><h2 className="text-lg font-bold">Editar vitrine da empresa</h2><button onClick={() => setEditing(false)} aria-label="Fechar editor"><X size={18}/></button></div><p className="text-sm text-white/60">Use links HTTPS de imagens para a foto de perfil e a capa. O upload direto de arquivos será disponibilizado em outra etapa.</p>{([{key:'logo',label:'URL da foto de perfil (HTTPS)'},{key:'bannerImage',label:'URL da foto de capa (HTTPS)'},{key:'tagline',label:'Frase de destaque'},{key:'website',label:'Site oficial (HTTPS)'}] as const).map(f => <label key={f.key} className="block space-y-1 text-sm"><span>{f.label}</span><input className="w-full rounded-xl border border-white/15 bg-[#080c16] p-3 outline-none focus:border-[#D9F22A]" value={draft[f.key]} onChange={e => setDraft(prev => ({...prev,[f.key]:e.target.value}))}/></label>)}<label className="block space-y-1 text-sm"><span>Bio / descrição da empresa</span><textarea rows={5} maxLength={1500} className="w-full rounded-xl border border-white/15 bg-[#080c16] p-3 outline-none focus:border-[#D9F22A]" value={draft.description} onChange={e => setDraft(prev => ({...prev,description:e.target.value}))}/></label><button disabled={saving} onClick={() => { void saveProfile(); }} className="rounded-xl bg-[#D9F22A] px-5 py-3 font-bold text-[#060A15] disabled:opacity-50">{saving ? 'Salvando...' : 'Salvar alterações'}</button></section>}
      <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#0e1423] px-4"><Search size={18} className="text-white/40"/><input aria-label="Buscar ofertas" className="w-full bg-transparent py-4 outline-none" placeholder="Buscar softwares, soluções ou empresas..." value={search} onChange={e => setSearch(e.target.value)}/></div>
      {!companySlug && <nav aria-label="Categorias" className="flex flex-wrap gap-2">{categories.map(c => <button key={c} onClick={() => setCategory(c)} className={`rounded-full border px-4 py-2 text-xs font-semibold ${category === c ? 'border-[#D9F22A] bg-[#D9F22A] text-[#060A15]' : 'border-white/15 bg-[#0e1423] text-white/70'}`}>{c}</button>)}</nav>}
      <div className="flex flex-wrap items-center gap-2"><span className="text-sm text-white/50">Tipo de plano:</span>{periods.map(p => <button key={p} onClick={() => setPeriod(p)} className={period === p ? 'rounded-full border border-[#D9F22A] bg-[#D9F22A] px-4 py-2 text-xs font-semibold text-[#060A15]' : 'rounded-full border border-white/15 bg-[#0e1423] px-4 py-2 text-xs font-semibold text-white/70'}>{p}</button>)}</div>
      {companySlug && <div className="flex flex-wrap gap-3 border-b border-white/10 pb-4"><span className="font-semibold text-[#D9F22A]">Planos e assinaturas</span><span className="text-sm text-white/50">Mensal · Anual · Semanal · Pagamento único</span></div>}
      {error && <p role="alert" className="rounded-xl border border-red-500/30 p-4 text-red-300">{error}</p>}
      {loading ? <p className="py-12 text-center text-white/50">Carregando ofertas verificadas...</p> : error ? null : shown.length === 0 ? <div className="rounded-2xl border border-white/10 p-12 text-center text-white/50"><Store className="mx-auto mb-3"/>{companySlug ? 'Nenhuma oferta publicada nesta vitrine.' : 'Nenhuma oferta encontrada nesta categoria.'}</div> :
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
