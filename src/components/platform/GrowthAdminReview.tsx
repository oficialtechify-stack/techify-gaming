import React, { useEffect, useState } from 'react';
import { subscribeAdminGrowthCampaigns, reviewGrowthCampaign, type GrowthCampaign } from '../../services/growthCampaignService';
export const GrowthAdminReview: React.FC = () => {
  const [items,setItems] = useState<GrowthCampaign[]>([]);
  const [notes,setNotes] = useState<Record<string,string>>({});
  const [error,setError] = useState('');
  const [busy,setBusy] = useState('');
  useEffect(() => subscribeAdminGrowthCampaigns(setItems, e => setError(e.message)), []);
  const review = async (id:string,status:'aprovada'|'ajustes_solicitados') => {
    setBusy(id);setError('');
    try { await reviewGrowthCampaign(id,status,notes[id] || ''); }
    catch(e) { setError(e instanceof Error ? e.message : 'Não foi possível revisar.'); }
    finally { setBusy(''); }
  };
  return <section className="rounded-2xl border border-white/20 p-5 space-y-4"><h2 className="text-xl font-bold">Growth · Análise de campanhas</h2><p className="text-sm opacity-70">Aprovar aqui não publica anúncios nem inicia cobranças.</p>{error && <p role="alert" className="text-red-400">{error}</p>}{items.length === 0 && <p className="text-sm opacity-70">Nenhuma campanha recebida.</p>}{items.map(c => <article key={c.id} className="border border-white/20 rounded-xl p-4 space-y-2 text-sm"><div className="font-bold">{c.productName} · {c.status}</div><div>Empresa: {c.companyId}</div><div>Objetivo: {c.goal} · Plano: {c.plan}</div><div>Orçamento previsto: R$ {Number(c.budget).toLocaleString('pt-BR')}</div><div>Público: {c.brief || 'Não informado'}</div><div>Canal: {c.adChannel} · Destino: {c.adDestination}</div><div>Região: {c.adRegion} · Contato/URL: {c.adUrl}</div>{c.reviewNote && <p>Última observação: {c.reviewNote}</p>}{c.status === 'aguardando_analise' && <><textarea value={notes[c.id] || ''} onChange={e=>setNotes(prev=>({...prev,[c.id]:e.target.value}))} placeholder="Observações ou ajustes necessários" className="w-full rounded-lg p-2 bg-black/20 border border-white/20"/><div className="flex gap-2 flex-wrap"><button disabled={busy === c.id} onClick={()=>review(c.id,'aprovada')} className="rounded-lg bg-lime-400 text-black px-3 py-2">Aprovar briefing</button><button disabled={busy === c.id || !(notes[c.id] || '').trim()} onClick={()=>review(c.id,'ajustes_solicitados')} className="rounded-lg border border-white/30 px-3 py-2">Solicitar ajustes</button></div></>}</article>)}</section>;
};