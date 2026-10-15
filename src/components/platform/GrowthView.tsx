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
  const [showReview, setShowReview] = useState(false);
  const [campaignStage, setCampaignStage] = useState<'brief' | 'channels'>('brief');
  const [adChannel, setAdChannel] = useState('Instagram e Facebook');
  const [adDestination, setAdDestination] = useState('WhatsApp');
  const [adRegion, setAdRegion] = useState('Brasil');
  const [adUrl, setAdUrl] = useState('');
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [voicePlaying, setVoicePlaying] = useState(false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrls = ["https://d8j0ntlcm91z4.cloudfront.net/user_3JqVuPdFEj9sARrqtHWQDQ4T25A/hf_20261015_013723_f9a7dafa-06b2-47a4-b3f6-4eae06ff88a2.wav","https://d8j0ntlcm91z4.cloudfront.net/user_3JqVuPdFEj9sARrqtHWQDQ4T25A/hf_20261015_015537_ba13213d-de0b-4b61-b7e6-5e54acaaf260.wav","https://d8j0ntlcm91z4.cloudfront.net/user_3JqVuPdFEj9sARrqtHWQDQ4T25A/hf_20261015_014812_794aae43-3d50-43ae-bb18-aaa445e8471c.wav","https://d8j0ntlcm91z4.cloudfront.net/user_3JqVuPdFEj9sARrqtHWQDQ4T25A/hf_20261015_014601_b5acc4e3-f66d-438d-b638-8259f9d53e1f.wav","https://d8j0ntlcm91z4.cloudfront.net/user_3JqVuPdFEj9sARrqtHWQDQ4T25A/hf_20261015_014712_ff8f9e5c-142a-4481-ba50-58bedd05362b.wav","https://d8j0ntlcm91z4.cloudfront.net/user_3JqVuPdFEj9sARrqtHWQDQ4T25A/hf_20261015_014000_d2860df3-a116-4b2d-ba3d-069c4b181ccd.wav","https://d8j0ntlcm91z4.cloudfront.net/user_3JqVuPdFEj9sARrqtHWQDQ4T25A/hf_20261015_015807_7a96e775-117d-4434-ba58-dc7c2ff432a1.wav"];
  const questions = [
    { key: 'segment', text: 'Em qual área sua empresa atua?', options: ['Marketing e serviços', 'Educação', 'Tecnologia', 'Comércio', 'Outro'] },
    { key: 'audience', text: 'Quem você mais quer alcançar?', options: ['Empreendedores', 'Consumidores finais', 'Outras empresas', 'Ainda não sei'] },
    { key: 'challenge', text: 'Qual seu maior desafio hoje?', options: ['Conseguir clientes', 'Aumentar vendas', 'Divulgar minha marca', 'Criar anúncios'] },
    { key: 'experience', text: 'Sua empresa já anunciou na internet?', options: ['Nunca', 'Algumas vezes', 'Anuncio com frequência'] },
    { key: 'investment', text: 'Quanto pretende investir em anúncios inicialmente?', options: ['Até R$ 300', 'R$ 301 a R$ 1.000', 'Mais de R$ 1.000', 'Ainda não decidi'] }
  ];
  const intro = 'Olá! Eu sou a assistente de marketing da LeadsPay Growth. Vou ajudar sua empresa a planejar campanhas e encontrar oportunidades para vender mais. Primeiro, quero conhecer seu negócio. São só cinco perguntas rápidas.';
  const stopAudio = () => {
    audioRef.current?.pause();
    if (audioRef.current) audioRef.current.currentTime = 0;
    setVoicePlaying(false);
  };
  const playAudio = (index: number) => {
    stopAudio();
    if (!voiceEnabled || !audioUrls[index]) return;
    const audio = new Audio(audioUrls[index]);
    audioRef.current = audio;
    audio.onended = () => setVoicePlaying(false);
    audio.onerror = () => setVoicePlaying(false);
    audio.play().then(() => setVoicePlaying(true)).catch(() => setVoicePlaying(false));
  };
  useEffect(() => () => { audioRef.current?.pause(); }, []);
  const nextAnswer = (answer: string) => {
    const q = questions[step - 1];
    if (!q) return;
    setAnswers(prev => ({ ...prev, [q.key]: answer }));
    if (q.key === 'audience') setBrief(answer);
    if (q.key === 'challenge') setGoal(answer === 'Conseguir clientes' ? 'Gerar leads' : answer === 'Divulgar minha marca' ? 'Aumentar reconhecimento' : 'Vender mais');
    if (q.key === 'investment') {
      if (answer === 'Até R$ 300') setBudget('300');
      else if (answer === 'R$ 301 a R$ 1.000') setBudget('650');
      else if (answer === 'Mais de R$ 1.000') setBudget('1500');
      else setBudget('');
    }
    setStep(prev => prev + 1);
    setSaved(false);
  };
  const currentSpeech = step === 0 ? intro : step <= questions.length ? questions[step - 1].text : 'Obrigada! Agora você pode selecionar seu produto e preparar sua primeira campanha. Vamos crescer juntos!';
  const currentAudioIndex = step === 0 ? 0 : step <= questions.length ? step : questions.length + 1;
  const onboardingDone = step > questions.length;
  const selectedProduct = plans.find(p => p.id === productId);
  const selectedPlanLabel = selectedPlan === 'designer' ? 'Growth + Designer' : 'Growth Essencial';
  const saveDraft = () => {
    if (!companyId || !selectedProduct || !Number.isFinite(Number(budget)) || Number(budget) <= 0) return;
    // Protótipo: dados locais apenas. Sem pagamentos ou disparos de anúncios.
    sessionStorage.setItem('leadspay-growth-draft-' + companyId, JSON.stringify({
      companyId, productId, goal, budget: Number(budget), brief, onboardingAnswers: answers, plan: selectedPlan, status: 'rascunho', createdAt: new Date().toISOString()
    }));
    setSaved(true);
    setShowReview(true);
    setCampaignStage('channels');
  };
  const saveCampaignSetup = () => {
    if (!companyId || !saved) return;
    const key = 'leadspay-growth-draft-' + companyId;
    const existing = JSON.parse(sessionStorage.getItem(key) || '{}');
    sessionStorage.setItem(key, JSON.stringify({ ...existing, adChannel, adDestination, adRegion, adUrl, status: 'configuracao-local', updatedAt: new Date().toISOString() }));
    setCampaignStage('brief');
  };
  return <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-7 text-white">
    <div className="rounded-3xl border border-[#D9F22A]/30 bg-gradient-to-br from-[#14251d] to-[#0b1020] p-6 md:p-9">
      <div className="inline-flex items-center gap-2 text-[#D9F22A] text-xs font-bold uppercase tracking-widest"><Sparkles size={16}/> Exclusivo para empresas · Protótipo</div>
      <h1 className="text-3xl md:text-4xl font-extrabold mt-3">LeadsPay Growth</h1>
      <p className="text-white/70 mt-3 max-w-2xl">Planeje campanhas, organize seus criativos e prepare o crescimento do seu negócio. Nenhum anúncio será publicado automaticamente nesta versão.</p>
    </div>
    <section className="rounded-2xl border border-white/10 bg-[#101728] p-5 md:p-7 space-y-4" aria-label="Assistente de boas-vindas">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div><h2 className="text-xl font-bold">Conheça sua assistente Growth</h2><p className="text-xs text-white/60">Apresentação guiada · sem chamadas à IA · voz Faye pré-gravada</p></div>
        <button type="button" onClick={() => { setVoiceEnabled(!voiceEnabled); if (voiceEnabled) { stopAudio(); } }} className="flex items-center gap-2 text-sm border border-white/20 rounded-xl px-3 py-2">{voiceEnabled ? <Volume2 size={17}/> : <VolumeX size={17}/>} {voiceEnabled ? 'Som ligado' : 'Som desligado'}</button>
      </div>
      <div className="rounded-2xl bg-white/10 p-4 text-sm leading-relaxed">
        <span className="text-[#D9F22A] font-bold">Assistente Growth</span>
        <p className="mt-2">{currentSpeech}</p>
        <button type="button" className="mt-3 flex items-center gap-2 text-[#D9F22A] font-semibold" onClick={() => { if (voicePlaying) { stopAudio(); } else playAudio(currentAudioIndex); }}>
          {voicePlaying ? <Pause size={16}/> : <Play size={16}/>} {voicePlaying ? 'Parar áudio' : 'Ouvir mensagem'}
        </button>
      </div>
      {step === 0 ? <button type="button" onClick={() => { setStep(1); if (voiceEnabled) playAudio(1); }} className="rounded-xl bg-[#D9F22A] text-[#0a1017] px-5 py-3 font-bold">Começar conversa <ArrowRight size={16} className="inline"/></button> : !onboardingDone ?
        <div className="space-y-3"><p className="text-xs text-white/60">Pergunta {step} de {questions.length}</p><div className="flex flex-wrap gap-2">{questions[step-1].options.map(option => <button type="button" key={option} onClick={() => { nextAnswer(option); if (voiceEnabled) { playAudio(step + 1); } }} className="rounded-xl border border-white/20 hover:border-[#D9F22A] px-4 py-3 text-sm">{option}</button>)}</div></div> :
        <p className="text-[#D9F22A] text-sm font-semibold">Perfil inicial preenchido. Agora prepare sua campanha abaixo. As respostas só serão incluídas no rascunho local quando você salvar.</p>}
      <p className="text-xs text-white/50">Áudios pré-gravados da Faye, reproduzidos sob demanda. O questionário ainda não é enviado ao ADM.</p>
    </section>
    <div className="grid md:grid-cols-2 gap-4">
      {([{id:'essential',title:'Growth Essencial',price:'R$ 149/mês',description:'Planejamento de campanhas, recomendações de IA e acompanhamento. Criativos não inclusos.'},{id:'designer',title:'Growth + Designer',price:'R$ 299/mês',description:'Inclui suporte de design da AgênciaOS. Quantidade de peças e revisões serão definidas na contratação.'}] as const).map(item =>
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
      <button disabled={!companyId || !productId || !(Number(budget)>0)} onClick={saveDraft} className="inline-flex items-center gap-2 rounded-xl bg-[#D9F22A] text-[#0a1017] font-bold px-5 py-3 disabled:opacity-40">Continuar para configuração da campanha <ArrowRight size={16}/></button>
      {saved && <p role="status" className="text-[#D9F22A] text-sm">Rascunho salvo neste navegador para demonstração. Ainda não foi enviado à equipe.</p>}
      {showReview && saved && campaignStage === 'channels' && <div className="rounded-2xl border border-white/20 bg-[#101728] p-5 space-y-4"><h3 className="text-lg font-bold">Etapa 2 · Configuração da campanha</h3><p className="text-sm text-white/65">Configure o destino e o público antes de conectar uma conta de anúncios. Nenhum anúncio será enviado nesta etapa.</p><div className="grid sm:grid-cols-2 gap-4"><label className="text-sm space-y-2">Onde anunciar<select value={adChannel} onChange={e=>setAdChannel(e.target.value)} className="w-full rounded-xl bg-[#101728] border border-white/20 p-3"><option>Instagram e Facebook</option><option>Instagram</option><option>Facebook</option></select></label><label className="text-sm space-y-2">Destino do anúncio<select value={adDestination} onChange={e=>setAdDestination(e.target.value)} className="w-full rounded-xl bg-[#101728] border border-white/20 p-3"><option>WhatsApp</option><option>Site</option><option>Formulário de leads</option></select></label><label className="text-sm space-y-2">Região de alcance<input value={adRegion} onChange={e=>setAdRegion(e.target.value)} placeholder="Cidade, estado ou Brasil" className="w-full rounded-xl bg-[#101728] border border-white/20 p-3"/></label><label className="text-sm space-y-2">{adDestination === 'WhatsApp' ? 'WhatsApp de contato (com DDD)' : adDestination === 'Site' ? 'URL do site' : 'Link do formulário (se houver)'}<input value={adUrl} onChange={e=>setAdUrl(e.target.value)} placeholder={adDestination === 'WhatsApp' ? '(11) 99999-9999' : 'https://'} className="w-full rounded-xl bg-[#101728] border border-white/20 p-3"/></label></div><p className="text-xs text-amber-200">A conexão oficial com a Meta será disponibilizada após implementação segura do OAuth, das permissões e da aprovação de campanhas. Não informe sua senha da Meta aqui.</p><div className="flex flex-wrap gap-3"><button type="button" onClick={saveCampaignSetup} disabled={!adRegion.trim() || !adUrl.trim()} className="rounded-xl bg-[#D9F22A] text-[#0a1017] px-4 py-3 font-bold disabled:opacity-40">Salvar configuração e revisar</button><button type="button" onClick={()=>setCampaignStage('brief')} className="rounded-xl border border-white/20 px-4 py-3">Voltar</button></div></div>}
      {showReview && saved && campaignStage === 'brief' && <div className="rounded-2xl border border-[#D9F22A]/40 bg-[#101728] p-5 space-y-3" aria-label="Resumo do rascunho"><h3 className="text-lg font-bold">Resumo da primeira campanha</h3><p className="text-sm text-white/70">Confira as informações antes de solicitar a análise da equipe.</p><dl className="grid sm:grid-cols-2 gap-3 text-sm"><div><dt className="text-white/50">Produto</dt><dd>{selectedProduct?.name}</dd></div><div><dt className="text-white/50">Plano escolhido</dt><dd>{selectedPlanLabel}</dd></div><div><dt className="text-white/50">Objetivo</dt><dd>{goal}</dd></div><div><dt className="text-white/50">Orçamento de anúncios</dt><dd>R$ {Number(budget).toLocaleString('pt-BR')}</dd></div><div><dt className="text-white/50">Público</dt><dd>{brief || 'Não informado'}</dd></div><div><dt className="text-white/50">Maior desafio</dt><dd>{answers.challenge || 'Não informado'}</dd></div></dl><p className="text-xs text-amber-200">Próxima etapa: enviar o briefing para análise da equipe. O envio ainda depende da integração segura com Firebase e ADM; nenhuma campanha ou cobrança será iniciada por este rascunho.</p><button type="button" onClick={() => { setShowReview(false); setSaved(false); }} className="rounded-xl border border-white/20 px-4 py-2 text-sm">Editar campanha</button></div>}
      {!companyId && <p className="text-amber-300 text-sm">É necessário vincular sua empresa para começar.</p>}
    </section>
    <div className="rounded-2xl border border-white/10 p-5 flex gap-3 items-start"><ShieldCheck className="text-[#D9F22A] shrink-0"/><div><h3 className="font-bold">AgênciaOS · Parceira oficial</h3><p className="text-sm text-white/65 mt-1">Solicitações de artes e serviços serão integradas à AgênciaOS em uma próxima etapa. Campanhas exigirão aprovação antes de qualquer publicação ou gasto.</p></div></div>
  </div>;
};
