import React, { useEffect, useMemo, useState } from 'react';
import { Tag, Plus, Copy, Check, Percent, DollarSign, Trash2, Search, X, AlertCircle, ExternalLink } from 'lucide-react';
import { CompanyPlan, UserAffiliation } from '../../types/platform';
import { useAuth } from '../../context/AuthContext';

export interface CouponItem {
  id:string;
  code:string;
  discountType:'percentage'|'fixed';
  value:number;
  maxUses:number;
  usedCount:number;
  expiresAt:string;
  status:'active'|'expired'|'paused';
  applicablePlans:string[];
  applicableAffiliates:string[];
  companyId?:string;
}

interface CuponsViewProps { plans?:CompanyPlan[]; affiliations?:UserAffiliation[]; }

export const CuponsView:React.FC<CuponsViewProps>=({plans=[],affiliations=[]})=>{
  const {currentUser}=useAuth();
  const companyId=plans[0]?.companyId||'';
  const [coupons,setCoupons]=useState<CouponItem[]>([]);
  const [loading,setLoading]=useState(true);
  const [modal,setModal]=useState(false);
  const [search,setSearch]=useState('');
  const [error,setError]=useState('');
  const [copied,setCopied]=useState<string|null>(null);
  const [code,setCode]=useState('');
  const [type,setType]=useState<'percentage'|'fixed'>('percentage');
  const [value,setValue]=useState(10);
  const [maxUses,setMaxUses]=useState(100);
  const [expiresAt,setExpiresAt]=useState('');
  const [planId,setPlanId]=useState('all');
  const [affiliateCode,setAffiliateCode]=useState('all');

  const authHeaders=async()=>{if(!currentUser) throw new Error('Faça login novamente.');return {'Content-Type':'application/json','Authorization':`Bearer ${await currentUser.getIdToken()}`};};
  const load=async()=>{
    if(!currentUser){setLoading(false);return;}
    try{
      const res=await fetch('/api/coupons',{headers:await authHeaders()});
      const data=await res.json().catch(()=>({}));
      if(!res.ok) throw new Error(data.error||'Falha ao carregar cupons.');
      setCoupons(data.coupons||[]);
    }catch(err:any){setError(err?.message||'Falha ao carregar cupons.');}
    finally{setLoading(false);}
  };
  useEffect(()=>{load();},[currentUser?.uid,companyId]);

  const uniqueAffiliates=useMemo(()=>{
    const map=new Map<string,string>();
    for(const a of affiliations){const c=String(a.affiliateCode||a.affiliate_code||'');if(c) map.set(c,String(a.userName||a.affiliateName||c));}
    return [...map.entries()];
  },[affiliations]);

  const filtered=coupons.filter(c=>!search||c.code.includes(search.toUpperCase()));
  const create=async(e:React.FormEvent)=>{
    e.preventDefault();setError('');
    if(!code.trim()) return setError('Informe o código.');
    try{
      const res=await fetch('/api/coupons',{method:'POST',headers:await authHeaders(),body:JSON.stringify({
        code,discountType:type,value,maxUses,expiresAt,
        applicablePlans:[planId],
        applicableAffiliates:[affiliateCode],
      })});
      const data=await res.json().catch(()=>({}));
      if(!res.ok) throw new Error(data.error||'Não foi possível criar o cupom.');
      setCoupons(prev=>[data.coupon,...prev.filter(c=>c.id!==data.coupon.id)]);
      setModal(false);setCode('');
    }catch(err:any){setError(err?.message||'Não foi possível criar o cupom.');}
  };
  const remove=async(item:CouponItem)=>{
    if(!confirm(`Excluir o cupom ${item.code}?`)) return;
    try{
      const res=await fetch('/api/coupons',{method:'DELETE',headers:await authHeaders(),body:JSON.stringify({id:item.id})});
      const data=await res.json().catch(()=>({}));
      if(!res.ok) throw new Error(data.error||'Falha ao excluir.');
      setCoupons(prev=>prev.filter(c=>c.id!==item.id));
    }catch(err:any){setError(err?.message||'Falha ao excluir cupom.');}
  };
  const linkFor=(item:CouponItem)=>{
    const target=item.applicablePlans.find(p=>p!=='all') || plans[0]?.id;
    const plan=plans.find(p=>p.id===target);
    if(!plan) return '';
    return `${window.location.origin}/checkout/${encodeURIComponent(plan.checkoutSlug||plan.slug||plan.id)}?coupon=${encodeURIComponent(item.code)}`;
  };
  const copy=async(text:string,id:string)=>{await navigator.clipboard.writeText(text);setCopied(id);setTimeout(()=>setCopied(null),1800);};

  if(loading) return <div className="p-8 text-sm text-white/50">Carregando cupons...</div>;
  return <div className="space-y-6 animate-fadeIn">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"><div><div className="flex gap-2 items-center text-xs font-bold uppercase tracking-widest text-[#D9F22A]"><Tag className="w-4 h-4"/>Descontos reais</div><h1 className="text-2xl font-black text-white font-['Syne']">Cupons</h1><p className="text-xs text-white/50 mt-1">O desconto é validado no backend e aplicado ao PaymentIntent da Stripe.</p></div><button onClick={()=>setModal(true)} disabled={!companyId} className="px-4 py-2.5 rounded-xl bg-[#D9F22A] text-[#060A15] font-black text-xs flex gap-2 disabled:opacity-40"><Plus className="w-4 h-4"/>Novo cupom</button></div>
    {error&&<div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex gap-2"><AlertCircle className="w-4 h-4"/>{error}</div>}
    <div className="relative"><Search className="absolute left-3 top-3 w-4 h-4 text-white/30"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar cupom..." className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#080d1a] border border-white/10 text-sm text-white"/></div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {filtered.map(item=>{const url=linkFor(item);return <div key={item.id} className="p-5 rounded-2xl bg-[#080d1a] border border-white/10">
        <div className="flex justify-between gap-3"><div><div className="font-mono font-black text-[#D9F22A]">{item.code}</div><div className="text-xs text-white/45 mt-1">{item.discountType==='percentage'?<><Percent className="inline w-3 h-3"/> {item.value}%</>:<><DollarSign className="inline w-3 h-3"/> R$ {Number(item.value).toFixed(2)}</>} · usados {item.usedCount||0}{item.maxUses>0?`/${item.maxUses}`:''}</div></div><button onClick={()=>remove(item)} className="text-red-400 p-2"><Trash2 className="w-4 h-4"/></button></div>
        {url&&<div className="mt-4 flex gap-2"><button onClick={()=>copy(url,item.id)} className="flex-1 py-2 rounded-lg border border-white/10 bg-white/5 text-xs text-white flex items-center justify-center gap-2">{copied===item.id?<Check className="w-3.5 h-3.5"/>:<Copy className="w-3.5 h-3.5"/>}Copiar link com cupom</button><a href={url} target="_blank" rel="noreferrer" className="p-2 border border-white/10 rounded-lg text-[#D9F22A]"><ExternalLink className="w-4 h-4"/></a></div>}
      </div>})}
      {filtered.length===0&&<div className="md:col-span-2 p-10 text-center text-xs text-white/40 border border-dashed border-white/10 rounded-2xl">Nenhum cupom cadastrado.</div>}
    </div>
    {modal&&<div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"><form onSubmit={create} className="relative w-full max-w-lg bg-[#080d1a] border border-white/10 rounded-2xl p-6 text-white">
      <button type="button" onClick={()=>setModal(false)} className="absolute right-4 top-4 text-white/50"><X className="w-5 h-5"/></button><h2 className="font-bold mb-5">Criar cupom</h2>
      <div className="grid grid-cols-2 gap-3">
        <input value={code} onChange={e=>setCode(e.target.value.toUpperCase())} placeholder="PROMO10" className="col-span-2 bg-[#050811] border border-white/10 rounded-xl p-3 text-sm uppercase"/>
        <select value={type} onChange={e=>setType(e.target.value as any)} className="bg-[#050811] border border-white/10 rounded-xl p-3 text-sm"><option value="percentage">Percentual</option><option value="fixed">Valor fixo</option></select>
        <input type="number" min="0.01" step="0.01" value={value} onChange={e=>setValue(Number(e.target.value))} className="bg-[#050811] border border-white/10 rounded-xl p-3 text-sm"/>
        <input type="number" min="0" value={maxUses} onChange={e=>setMaxUses(Number(e.target.value))} placeholder="Máximo de usos" className="bg-[#050811] border border-white/10 rounded-xl p-3 text-sm"/>
        <input type="datetime-local" value={expiresAt} onChange={e=>setExpiresAt(e.target.value)} className="bg-[#050811] border border-white/10 rounded-xl p-3 text-sm"/>
        <select value={planId} onChange={e=>setPlanId(e.target.value)} className="bg-[#050811] border border-white/10 rounded-xl p-3 text-sm"><option value="all">Todas as ofertas</option>{plans.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>
        <select value={affiliateCode} onChange={e=>setAffiliateCode(e.target.value)} className="bg-[#050811] border border-white/10 rounded-xl p-3 text-sm"><option value="all">Todos os afiliados</option>{uniqueAffiliates.map(([c,n])=><option key={c} value={c}>{n} · {c}</option>)}</select>
      </div>
      <button className="w-full mt-5 py-3 rounded-xl bg-[#D9F22A] text-[#060A15] font-black text-xs">Salvar cupom</button>
    </form></div>}
  </div>;
};
