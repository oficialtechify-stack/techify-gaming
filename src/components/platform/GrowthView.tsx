import React, { useState } from 'react';
import { Sparkles, Megaphone, Palette, ShieldCheck, ArrowRight } from 'lucide-react';
import type { CompanyPlan } from '../../types/platform';

type GrowthViewProps = { companyId?: string; plans: CompanyPlan[] };
export const GrowthView: React.FC<GrowthViewProps> = ({ companyId, plans }) => {
  const [selectedPlan, setSelectedPlan] = useState<'essential' | 'designer'>('essential');
  const [productId, setProductId] = useState('');
  const [goal, setGoal] = useState('Vender mais');
  const [budget, setBudget] = useState('300');
  const [brief, setBrief] = useState('');
  const [saved, setSaved] = useState(false);
  const selectedProduct = plans.find(p => p.id === productId);
  const saveDraft = () => {
    if (!companyId || !selectedProduct || !Number.isFinite(Number(budget)) || Number(budget) <= 0) return;
    // Protótipo: dados locais apenas. Sem pagamentos ou disparos de anúncios.
    sessionStorage.setItem('leadspay-growth-draft-' + companyId, JSON.stringify({
      companyId, productId, goal, budget: Number(budget), brief, plan: selectedPlan, status: 'rascunho', createdAt: new Date().toISOString()
    }));
    setSaved(true);
  };
  return <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-7 text-white">
    <div className="rounded-3xl border border-[#D9F22A]/30 bg-gradient-to-br from-[#14251d] to-[#0b1020] p-6 md:p-9">
      <div className="inline-flex items-center gap-2 text-[#D9F22A] text-xs font-bold uppercase tracking-widest"><Sparkles size={16}/> Exclusivo para empresas · Protótipo</div>
      <h1 className="text-3xl md:text-4xl font-extrabold mt-3">LeadsPay Growth</h1>
      <p className="text-white/70 mt-3 max-w-2xl">Planeje campanhas, organize seus criativos e prepare o crescimento do seu negócio. Nenhum anúncio será publicado automaticamente nesta versão.</p>
    </div>
    <div className="grid md:grid-cols-2 gap-4">
      {([{id:'essential',title:'Growth Essencial',price:'R$ 149/mês',description:'Planejamento de campanhas, recomendações de IA e acompanhamento. Criativos não inclusos.'},{id:'designer',title:'Growth + Designer',price:'R$ 299/mês',description:'Inclui suporte de design da Agencius. Quantidade de peças e revisões serão definidas na contratação.'}] as const).map(item =>
        <button key={item.id} onClick={() => {setSelectedPlan(item.id);setSaved(false);}} className={`rounded-2xl p-6 text-left border transition ${selectedPlan===item.id?'border-[#D9F22A] bg-[#D9F22A]/10':'border-white/10 bg-white/5 hover:border-white/30'}`}>
          <div className="flex items-center gap-2 font-bold">{item.id==='designer'?<Palette size={19}/>:<Megaphone size={19}/>} {item.title}</div>
          <div className="text-2xl font-black mt-3">{item.price}</div><p className="text-sm text-white/65 mt-2">{item.description}</p>
        </button>)}
    </div>
    <section className="rounded-2xl border border-white/10 bg-white/5 p-5 md:p-7 space-y-5">
      <h2 className="font-bold text-xl">Preparar minha primeira campanha</h2>
      <div className="grid md:grid-cols-2 gap-4">
        <label className="text-sm space-y-2 block">Produto da empresa
          <select value={productId} onChange={e=>{setProductId(e.target.value);setSaved(false);}} className="w-full rounded-xl bg-[#101728] border border-white/20 p-3 text-white"><option value="">Selecione um produto</option>{plans.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>
        </label>
        <label className="text-sm space-y-2 block">Objetivo
          <select value={goal} onChange={e=>setGoal(e.target.value)} className="w-full rounded-xl bg-[#101728] border border-white/20 p-3 text-white"><option>Vender mais</option><option>Gerar leads</option><option>Aumentar reconhecimento</option></select>
        </label>
        <label className="text-sm space-y-2 block">Orçamento previsto para anúncios (R$)
          <input type="number" min="1" step="1" value={budget} onChange={e=>setBudget(e.target.value)} className="w-full rounded-xl bg-[#101728] border border-white/20 p-3 text-white"/>
        </label>
        <label className="text-sm space-y-2 block">Sobre seu público
          <input value={brief} onChange={e=>setBrief(e.target.value)} placeholder="Ex.: empreendedores iniciantes" className="w-full rounded-xl bg-[#101728] border border-white/20 p-3 text-white"/>
        </label>
      </div>
      <p className="text-xs text-white/60">O orçamento de anúncios é pago separadamente à plataforma de anúncios. Este protótipo não cobra assinaturas nem conecta contas Meta Ads.</p>
      <button disabled={!companyId || !productId || !(Number(budget)>0)} onClick={saveDraft} className="inline-flex items-center gap-2 rounded-xl bg-[#D9F22A] text-[#0a1017] font-bold px-5 py-3 disabled:opacity-40">Salvar rascunho <ArrowRight size={16}/></button>
      {saved && <p role="status" className="text-[#D9F22A] text-sm">Rascunho salvo neste navegador para demonstração. Ainda não foi enviado à equipe.</p>}
      {!companyId && <p className="text-amber-300 text-sm">É necessário vincular sua empresa para começar.</p>}
    </section>
    <div className="rounded-2xl border border-white/10 p-5 flex gap-3 items-start"><ShieldCheck className="text-[#D9F22A] shrink-0"/><div><h3 className="font-bold">Agencius · Parceira oficial</h3><p className="text-sm text-white/65 mt-1">Solicitações de artes e serviços serão integradas à Agencius em uma próxima etapa. Campanhas exigirão aprovação antes de qualquer publicação ou gasto.</p></div></div>
  </div>;
};
