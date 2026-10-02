import React, { useEffect, useMemo, useState } from 'react';
import { Key, Webhook, Copy, Check, Code2, RefreshCw, ShieldCheck, ExternalLink, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { CompanyPlan, CompanyStartup } from '../../types/platform';

interface IntegracoesViewProps {
  plans?: CompanyPlan[];
  company?: CompanyStartup | null;
}

const origin = () => typeof window !== 'undefined' ? window.location.origin : 'https://www.techify.sbs';

export const IntegracoesView: React.FC<IntegracoesViewProps> = ({ plans = [], company = null }) => {
  const { currentUser } = useAuth();
  const [keyPrefix,setKeyPrefix]=useState('');
  const [freshKey,setFreshKey]=useState('');
  const [webhookUrl,setWebhookUrl]=useState('');
  const [webhookSecret,setWebhookSecret]=useState('');
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [message,setMessage]=useState<{type:'success'|'error';text:string}|null>(null);
  const [copied,setCopied]=useState<string|null>(null);
  const activePlans=useMemo(()=>plans.filter(p=>p.status==='Ativo' && p.active!==false),[plans]);

  const authHeaders = async () => {
    if(!currentUser) throw new Error('Faça login novamente.');
    const token=await currentUser.getIdToken();
    return { 'Content-Type':'application/json', 'Authorization':`Bearer ${token}` };
  };

  const load=async()=>{
    if(!currentUser) return;
    setLoading(true);
    try{
      const headers=await authHeaders();
      const [keyRes,settingsRes]=await Promise.all([
        fetch('/api/partner/api-key',{headers}),
        fetch('/api/partner/settings',{headers}),
      ]);
      const keyData=await keyRes.json().catch(()=>({}));
      const settingsData=await settingsRes.json().catch(()=>({}));
      if(keyRes.ok && keyData.key) setKeyPrefix(keyData.key.prefix||'');
      if(settingsRes.ok && settingsData.settings){
        setWebhookUrl(settingsData.settings.webhookUrl||'');
        setWebhookSecret(settingsData.settings.webhookSecret||'');
      }
    }catch(err:any){setMessage({type:'error',text:err?.message||'Não foi possível carregar integrações.'});}
    finally{setLoading(false);}
  };

  useEffect(()=>{load();},[currentUser?.uid]);

  const generateKey=async()=>{
    setSaving(true); setMessage(null);
    try{
      const headers=await authHeaders();
      const res=await fetch('/api/partner/api-key',{method:'POST',headers});
      const data=await res.json().catch(()=>({}));
      if(!res.ok) throw new Error(data.error||'Falha ao gerar chave.');
      setFreshKey(data.apiKey||'');
      setKeyPrefix(data.key?.prefix||'');
      setMessage({type:'success',text:'Nova API Key criada. Copie agora: ela não será exibida novamente.'});
    }catch(err:any){setMessage({type:'error',text:err?.message||'Falha ao gerar chave.'});}
    finally{setSaving(false);}
  };

  const saveWebhook=async()=>{
    setSaving(true); setMessage(null);
    try{
      const headers=await authHeaders();
      const res=await fetch('/api/partner/settings',{method:'POST',headers,body:JSON.stringify({webhookUrl})});
      const data=await res.json().catch(()=>({}));
      if(!res.ok) throw new Error(data.error||'Falha ao salvar webhook.');
      setWebhookSecret(data.settings?.webhookSecret||'');
      setMessage({type:'success',text:'Webhook salvo. Eventos payment.succeeded serão assinados com HMAC SHA-256.'});
    }catch(err:any){setMessage({type:'error',text:err?.message||'Falha ao salvar webhook.'});}
    finally{setSaving(false);}
  };

  const copy=async(text:string,id:string)=>{
    await navigator.clipboard.writeText(text); setCopied(id); setTimeout(()=>setCopied(null),1800);
  };

  const examplePlan=activePlans[0];
  const apiUrl=`${origin()}/api/partner/payments`;
  const checkoutUrl=examplePlan ? `${origin()}/checkout/${encodeURIComponent(examplePlan.checkoutSlug||examplePlan.slug||examplePlan.id)}` : '';
  const jsExample=examplePlan ? `const response = await fetch('${apiUrl}', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': process.env.LEADSPAY_API_KEY
  },
  body: JSON.stringify({
    planId: '${examplePlan.id}',
    buyerName: 'Cliente Exemplo',
    buyerEmail: 'cliente@exemplo.com',
    attemptId: crypto.randomUUID().replaceAll('-', '')
  })
});
const payment = await response.json();
// Use payment.clientSecret com Stripe Elements no seu checkout.` : '// Cadastre uma oferta ativa para gerar o exemplo.';

  if(loading) return <div className="p-8 text-sm text-white/50">Carregando integrações...</div>;

  return <div className="space-y-6 animate-fadeIn">
    <div>
      <div className="text-xs font-bold uppercase tracking-widest text-[#D9F22A]">Integrações reais</div>
      <h1 className="text-2xl sm:text-3xl font-black text-white font-['Syne']">API & Webhooks</h1>
      <p className="text-xs text-white/55 mt-1">Crie pagamentos para ofertas cadastradas e receba confirmação assinada no seu backend.</p>
    </div>

    {message&&<div className={`p-3 rounded-xl border text-xs flex gap-2 ${message.type==='error'?'bg-red-500/10 border-red-500/20 text-red-400':'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}><AlertCircle className="w-4 h-4"/>{message.text}</div>}

    <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
      <section className="bg-[#080d1a] border border-white/10 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4"><Key className="w-4 h-4 text-[#D9F22A]"/><h2 className="font-bold text-white">API Key da empresa</h2></div>
        <p className="text-xs text-white/50 mb-4">A chave é criada no servidor e armazenamos apenas o hash. Regenerar revoga a anterior.</p>
        <div className="p-3 rounded-xl bg-[#050811] border border-white/10 font-mono text-xs text-white/70 break-all">
          {freshKey || keyPrefix || 'Nenhuma chave ativa'}
        </div>
        <div className="flex gap-2 mt-3">
          {(freshKey||keyPrefix)&&<button onClick={()=>copy(freshKey||keyPrefix,'key')} className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white flex gap-2">{copied==='key'?<Check className="w-3.5 h-3.5"/>:<Copy className="w-3.5 h-3.5"/>}Copiar</button>}
          <button disabled={saving} onClick={generateKey} className="px-3 py-2 rounded-lg bg-[#D9F22A] text-[#060A15] font-black text-xs flex gap-2"><RefreshCw className="w-3.5 h-3.5"/>{keyPrefix?'Regenerar':'Gerar chave'}</button>
        </div>
      </section>

      <section className="bg-[#080d1a] border border-white/10 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4"><Webhook className="w-4 h-4 text-[#D9F22A]"/><h2 className="font-bold text-white">Webhook do parceiro</h2></div>
        <label className="text-xs text-white/60">URL HTTPS</label>
        <input value={webhookUrl} onChange={e=>setWebhookUrl(e.target.value)} placeholder="https://seusite.com/api/webhooks/leadspay" className="w-full mt-2 bg-[#050811] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white"/>
        <button disabled={saving} onClick={saveWebhook} className="mt-3 px-4 py-2.5 rounded-xl bg-[#D9F22A] text-[#060A15] font-black text-xs">Salvar webhook</button>
        {webhookSecret&&<div className="mt-4"><div className="text-[11px] text-white/45 mb-1">Segredo para validar x-leadspay-signature</div><div className="p-2.5 rounded-lg bg-[#050811] border border-white/10 text-[10px] font-mono text-white/60 break-all">{webhookSecret}</div></div>}
      </section>
    </div>

    <section className="bg-[#080d1a] border border-white/10 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4"><Code2 className="w-4 h-4 text-[#D9F22A]"/><h2 className="font-bold text-white">Criar pagamento pela API</h2></div>
      <div className="text-xs text-white/50 mb-2">POST <code className="text-[#D9F22A]">{apiUrl}</code></div>
      <pre className="overflow-x-auto p-4 rounded-xl bg-[#050811] border border-white/10 text-[11px] leading-5 text-white/70"><code>{jsExample}</code></pre>
      <button onClick={()=>copy(jsExample,'code')} className="mt-3 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white flex gap-2">{copied==='code'?<Check className="w-3.5 h-3.5"/>:<Copy className="w-3.5 h-3.5"/>}Copiar exemplo</button>
    </section>

    <section className="bg-[#080d1a] border border-white/10 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-3"><ShieldCheck className="w-4 h-4 text-[#D9F22A]"/><h2 className="font-bold text-white">Links sem código</h2></div>
      {activePlans.length===0?<p className="text-xs text-white/45">Cadastre uma oferta ativa para gerar um checkout.</p>:
        <div className="space-y-2">{activePlans.slice(0,10).map(plan=>{const url=`${origin()}/checkout/${encodeURIComponent(plan.checkoutSlug||plan.slug||plan.id)}`;return <div key={plan.id} className="flex gap-2 items-center p-3 rounded-xl bg-[#050811] border border-white/5"><div className="min-w-0 flex-1"><div className="text-xs font-bold text-white">{plan.name}</div><div className="text-[10px] font-mono text-white/35 truncate">{url}</div></div><button onClick={()=>copy(url,plan.id)} className="p-2 text-white/60">{copied===plan.id?<Check className="w-4 h-4"/>:<Copy className="w-4 h-4"/>}</button><a href={url} target="_blank" rel="noreferrer" className="p-2 text-[#D9F22A]"><ExternalLink className="w-4 h-4"/></a></div>})}</div>}
    </section>
  </div>;
};
