import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Megaphone, Palette, ShieldCheck, ArrowRight, Volume2, VolumeX, Play, Pause } from 'lucide-react';
import type { CompanyPlan } from '../../types/platform';

type GrowthViewProps = { companyId?: string; plans: CompanyPlan[] };
export const GrowthView: React.FC<GrowthViewProps> = ({ companyId, plans }) => {
  const [selectedPlan, setSelectedPlan] = useState<'essential' | 'designer'>('essential');
  const [productId, setProductId] = useState('');
  const [goal, setGoal] = useState('Vender mais');
  const [budget, setBudget] = useState('300');
  const [brief, setBrief] = useState('');
  const [saved, setSaved] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [voicePlaying, setVoicePlaying] = useState(false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);
  const questions = [
    { key: 'segment', text: 'Em qual área sua empresa atua?', options: ['Marketing e serviços', 'Educação', 'Tecnologia', 'Comércio', 'Outro'] },
    { key: 'audience', text: 'Quem você mais quer alcançar?', options: ['Empreendedores', 'Consumidores finais', 'Outras empresas', 'Ainda não sei'] },
    { key: 'challenge', text: 'Qual seu maior desafio hoje?', options: ['Conseguir clientes', 'Aumentar vendas', 'Divulgar minha marca', 'Criar anúncios'] },
    { key: 'experience', text: 'Sua empresa já anunciou na internet?', options: ['Nunca', 'Algumas vezes', 'Anuncio com frequência'] },
    { key: 'investment', text: 'Quanto pretende investir em anúncios inicialmente?', options: ['Até R$ 300', 'R$ 301 a R$ 1.000', 'Mais de R$ 1.000', 'Ainda não decidi'] }
  ];
  const intro = 'Olá! Eu sou a assistente de marketing da LeadsPay Growth. Vou ajudar sua empresa a planejar campanhas e encontrar oportunidades para vender mais. Primeiro, quero conhecer seu negócio. São só cinco perguntas rápidas.';
  const speak = (message: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = 'pt-BR';
    utterance.rate = 1.03;
    utterance.onend = () => setVoicePlaying(false);
    utterance.onerror = () => setVoicePlaying(false);
    speechRef.current = utterance;
    setVoicePlaying(true);
    window.speechSynthesis.speak(utterance);
  };
  useEffect(() => {
    // Navegadores podem bloquear áudio automático; o botão reproduzir permanece disponível.
    if (voiceEnabled && step === 0) speak(intro);
    return () => { if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel(); };
  }, []);
  const nextAnswer = (answer: string) => {
    const q = questions[step - 1];
    if (!q) return;
    setAnswers(prev => ({ ...prev, [q.key]: answer }));
    if (q.key === 'audience') setBrief(answer);
    if (q.key === 'investment' && answer === 'Até R$ 300') setBudget('300');
    setStep(prev => prev + 1);
    setSaved(false);
  };
  const currentSpeech = step === 0 ? intro : step <= questions.length ? questions[step - 1].text : 'Obrigado! Agora você pode selecionar seu produto e preparar a primeira campanha.';
  const onboardingDone = step > questions.length;
  const selectedProduct = plans.find(p => p.id === productId);
  const saveDraft = () => {
    if (!companyId || !selectedProduct || !Number.isFinite(Number(budget)) || Number(budget) <= 0) return;
    // Protótipo: dados locais apenas. Sem pagamentos ou disparos de anúncios.
    sessionStorage.setItem('leadspay-growth-draft-' + companyId, JSON.stringify({
      companyId, productId, goal, budget: Number(budget), brief, onboardingAnswers: answers, plan: selectedPlan, status: 'rascunho', createdAt: new Date().toISOString()
    }));
    setSaved(true);
  };
  return <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-7 text-white">
    <div className="rounded-3xl border border-[#D9F22A]/30 bg-gradient-to-br from-[#14251d] to-[#0b1020] p-6 md:p-9">
      <div className="inline-flex items-center gap-2 text-[#D9F22A] text-xs font-bold uppercase tracking-widest"><Sparkles size={16}/> Exclusivo para empresas · Protótipo</div>
      <h1 className="text-3xl md:text-4xl font-extrabold mt-3">LeadsPay Growth</h1>
      <p className="text-white/70 mt-3 max-w-2xl">Planeje campanhas, organize seus criativos e prepare o crescimento do seu negócio. Nenhum anúncio será publicado automaticamente nesta versão.</p>
    </div>
    <section className="rounded-2xl border border-white/10 bg-[#101728] p-5 md:p-7 space-y-4" aria-label="Assistente de boas-vindas">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div><h2 className="text-xl font-bold">Conheça sua assistente Growth</h2><p className="text-xs text-white/60">Apresentação guiada · sem chamadas à IA · voz do dispositivo</p></div>
        <button type="button" onClick={() => { setVoiceEnabled(!voiceEnabled); if (voiceEnabled) { window.speechSynthesis?.cancel(); setVoicePlaying(false); } }} className="flex items-center gap-2 text-sm border border-white/20 rounded-xl px-3 py-2">{voiceEnabled ? <Volume2 size={17}/> : <VolumeX size={17}/>} {voiceEnabled ? 'Som ligado' : 'Som desligado'}</button>
      </div>
      <div className="rounded-2xl bg-white/10 p-4 text-sm leading-relaxed">
        <span className="text-[#D9F22A] font-bold">Assistente Growth</span>
        <p className="mt-2">{currentSpeech}</p>
        <button type="button" className="mt-3 flex items-center gap-2 text-[#D9F22A] font-semibold" onClick={() => { if (voicePlaying) { window.speechSynthesis?.cancel(); setVoicePlaying(false); } else speak(currentSpeech); }}>
          {voicePlaying ? <Pause size={16}/> : <Play size={16}/>} {voicePlaying ? 'Parar áudio' : 'Ouvir mensagem'}
        </button>
      </div>
      {step === 0 ? <button type="button" onClick={() => { setStep(1); if (voiceEnabled) speak(questions[0].text); }} className="rounded-xl bg-[#D9F22A] text-[#0a1017] px-5 py-3 font-bold">Começar conversa <ArrowRight size={16} className="inline"/></button> : !onboardingDone ?
        <div className="space-y-3"><p className="text-xs text-white/60">Pergunta {step} de {questions.length}</p><div className="flex flex-wrap gap-2">{questions[step-1].options.map(option => <button type="button" key={option} onClick={() => { nextAnswer(option); if (voiceEnabled) speak(step < questions.length ? questions[step].text : 'Obrigado! Agora vamos preparar sua campanha.'); }} className="rounded-xl border border-white/20 hover:border-[#D9F22A] px-4 py-3 text-sm">{option}</button>)}</div></div> :
        <p className="text-[#D9F22A] text-sm font-semibold">Perfil inicial preenchido. Agora prepare sua campanha abaixo. As respostas só serão incluídas no rascunho local quando você salvar.</p>}
      <p className="text-xs text-white/50">A reprodução automática depende da permissão do navegador. Nenhum áudio é enviado a servidores. O questionário ainda não é enviado ao ADM.</p>
    </section>
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
