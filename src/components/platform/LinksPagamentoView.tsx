import React, { useMemo, useState } from 'react';
import { Link2, Plus, Copy, Check, ExternalLink, Trash2, Search, AlertCircle, X, CreditCard } from 'lucide-react';
import { CompanyPlan, CompanyStartup } from '../../types/platform';

interface LinksPagamentoViewProps {
  plans?: CompanyPlan[];
  companies?: CompanyStartup[];
  activeCompanyId?: string;
  onOpenCheckout?: (plan: CompanyPlan) => void;
  onCreateCustomPlan?: (planPayload: any) => Promise<any>;
  onDeletePlan?: (planId: string, companyId?: string) => Promise<void>;
}

export const LinksPagamentoView: React.FC<LinksPagamentoViewProps> = ({ plans=[], companies=[], activeCompanyId, onOpenCheckout, onCreateCustomPlan, onDeletePlan }) => {
  const [search,setSearch]=useState('');
  const [modal,setModal]=useState(false);
  const [title,setTitle]=useState('');
  const [description,setDescription]=useState('');
  const [amount,setAmount]=useState('50.00');
  const [companyId,setCompanyId]=useState(activeCompanyId || companies[0]?.id || '');
  const [error,setError]=useState('');
  const [submitting,setSubmitting]=useState(false);
  const [copied,setCopied]=useState<string|null>(null);

  const links=useMemo(()=>plans.filter(p=>p.badge==='Link de Pagamento' || p.billingType==='avulso').filter(p=>!search || p.name.toLowerCase().includes(search.toLowerCase())),[plans,search]);
  const checkoutUrl=(plan:CompanyPlan)=>{
    const origin=typeof window!=='undefined'?window.location.origin:'https://www.techify.sbs';
    return `${origin}/checkout/${encodeURIComponent(plan.checkoutSlug || plan.slug || plan.id)}`;
  };
  const copy=async(plan:CompanyPlan)=>{ await navigator.clipboard.writeText(checkoutUrl(plan)); setCopied(plan.id); setTimeout(()=>setCopied(null),1800); };
  const create=async(e:React.FormEvent)=>{
    e.preventDefault(); setError('');
    const value=Number(amount.replace(',','.'));
    if(!companyId) return setError('Selecione a empresa responsável.');
    if(!title.trim()) return setError('Informe o título do link.');
    if(!Number.isFinite(value)||value<0.50) return setError('O valor mínimo é R$ 0,50.');
    if(!onCreateCustomPlan) return setError('Criação de ofertas indisponível.');
    setSubmitting(true);
    try{
      await onCreateCustomPlan({
        companyId,
        companyName: companies.find(c=>c.id===companyId)?.name || '',
        companyLogo: companies.find(c=>c.id===companyId)?.logo || '',
        name:title.trim(),
        tagline:title.trim(),
        description:description.trim() || 'Cobrança via Link de Pagamento LeadsPay',
        priceSetup:value,
        priceMonthly:0,
        commissionPercentage:0,
        commissionValue:0,
        features:['Pagamento seguro via Stripe'],
        bannerImage:'',
        billingType:'avulso',
        paymentType:'Único',
        badge:'Link de Pagamento',
        status:'Ativo',
        active:true,
        allowAffiliates:false,
        totalSales:0
      });
      setModal(false); setTitle(''); setDescription(''); setAmount('50.00');
    }catch(err:any){setError(err?.message||'Não foi possível criar o link.');}
    finally{setSubmitting(false);}
  };

  return <div className="space-y-6 animate-fadeIn">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div><div className="text-xs font-bold uppercase tracking-widest text-[#D9F22A] flex items-center gap-2"><Link2 className="w-4 h-4"/>Cobranças avulsas</div><h1 className="text-2xl font-black text-white font-['Syne']">Links de Pagamento</h1><p className="text-xs text-white/50 mt-1">Cada link é uma oferta real persistida no Firestore e cobrada pela Stripe.</p></div>
      <button onClick={()=>setModal(true)} className="px-4 py-2.5 rounded-xl bg-[#D9F22A] text-[#060A15] text-xs font-black flex items-center gap-2"><Plus className="w-4 h-4"/>Novo link</button>
    </div>
    <div className="relative"><Search className="w-4 h-4 absolute left-3 top-3 text-white/30"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar link..." className="w-full bg-[#080d1a] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white"/></div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {links.map(plan=><div key={plan.id} className="p-5 rounded-2xl bg-[#080d1a] border border-white/10">
        <div className="flex justify-between gap-4"><div><h3 className="font-bold text-white">{plan.name}</h3><p className="text-xs text-white/45 mt-1">{plan.description}</p></div><div className="text-[#D9F22A] font-black">R$ {Number(plan.priceSetup||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}</div></div>
        <div className="mt-4 p-2.5 rounded-lg bg-[#050811] text-[10px] font-mono text-white/55 truncate">{checkoutUrl(plan)}</div>
        <div className="mt-4 flex gap-2"><button onClick={()=>copy(plan)} className="flex-1 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-bold text-white flex justify-center gap-2">{copied===plan.id?<Check className="w-3.5 h-3.5"/>:<Copy className="w-3.5 h-3.5"/>}{copied===plan.id?'Copiado':'Copiar'}</button><button onClick={()=>onOpenCheckout?.(plan)} className="py-2 px-3 rounded-lg bg-white/5 border border-white/10 text-white"><ExternalLink className="w-4 h-4"/></button><button onClick={()=>onDeletePlan?.(plan.id,plan.companyId)} className="py-2 px-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400"><Trash2 className="w-4 h-4"/></button></div>
      </div>)}
      {links.length===0&&<div className="lg:col-span-2 p-10 text-center text-xs text-white/40 border border-dashed border-white/10 rounded-2xl">Nenhum link real cadastrado.</div>}
    </div>
    {modal&&<div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"><form onSubmit={create} className="relative w-full max-w-lg bg-[#080d1a] border border-white/10 rounded-2xl p-6 text-white">
      <button type="button" onClick={()=>setModal(false)} className="absolute right-4 top-4 text-white/50"><X className="w-5 h-5"/></button><div className="flex gap-2 items-center mb-5"><CreditCard className="w-5 h-5 text-[#D9F22A]"/><h2 className="font-bold">Criar link real</h2></div>
      {error&&<div className="p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex gap-2"><AlertCircle className="w-4 h-4"/>{error}</div>}
      <div className="space-y-4"><select value={companyId} onChange={e=>setCompanyId(e.target.value)} className="w-full bg-[#050811] border border-white/10 rounded-xl p-3 text-sm"><option value="">Selecione a empresa</option>{companies.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select><input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Título da cobrança" className="w-full bg-[#050811] border border-white/10 rounded-xl p-3 text-sm"/><textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder="Descrição" className="w-full bg-[#050811] border border-white/10 rounded-xl p-3 text-sm min-h-24"/><input type="number" min="0.50" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)} className="w-full bg-[#050811] border border-white/10 rounded-xl p-3 text-sm"/><button disabled={submitting} className="w-full py-3 rounded-xl bg-[#D9F22A] text-[#060A15] font-black text-xs disabled:opacity-50">{submitting?'Salvando...':'Criar link'}</button></div>
    </form></div>}
  </div>;
};
