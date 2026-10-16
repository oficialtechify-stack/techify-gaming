import React, { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Bell, BookOpen, CheckCircle2, ChevronRight, CircleHelp, Headphones, Home, LifeBuoy, MessageCircle, Megaphone, Search, Send, ShieldCheck, ShoppingBag, X } from 'lucide-react';

type Section = 'inicio' | 'mensagens' | 'noticias' | 'roteiro' | 'ajuda';
const helpArticles = [
  { title: 'Como completar o cadastro da empresa', category: 'Configurações', body: 'Em Meu Perfil, confira os dados do titular, CPF ou CNPJ, endereço e a situação da verificação. Caso os campos estejam bloqueados após aprovação, use Solicitar ajuste.' },
  { title: 'Como conectar a conta de recebimentos', category: 'Financeiro', body: 'Em Meu Perfil, abra Conta de recebimentos e siga as etapas de verificação. A confirmação depende do status retornado pelo provedor de pagamentos.' },
  { title: 'Como cadastrar e vender um produto', category: 'Produtos', body: 'Após a aprovação da conta, acesse a área de produtos da empresa para cadastrar sua oferta, definir preço e configurar o checkout.' },
  { title: 'Como funciona a afiliação', category: 'Afiliados', body: 'Os afiliados escolhem ofertas disponíveis no marketplace e utilizam seus links de divulgação. Comissões e elegibilidade dependem das regras da oferta.' },
  { title: 'Como solicitar um saque', category: 'Financeiro', body: 'Acesse a carteira e selecione Solicitar saque. O valor disponível e os prazos de liberação são exibidos na sua conta.' },
  { title: 'Como alterar a senha', category: 'Segurança', body: 'Em Meu Perfil, abra Alterar Senha para solicitar um link de redefinição enviado ao e-mail autenticado.' },
  { title: 'Como acompanhar taxas e planos', category: 'Configurações', body: 'Na aba Planos e Taxas, consulte os valores informados para a sua conta. Confira as condições efetivas antes de realizar transações.' },
  { title: 'Problemas no checkout ou no pagamento', category: 'Checkout', body: 'Confira o status do pedido na área de vendas. Nunca considere uma venda aprovada sem confirmação do provedor de pagamento.' },
];
const news = [
  { title: 'Central de ajuda da LeadsPay', body: 'Consulte orientações sobre cadastro, checkout, recebimentos e segurança diretamente neste painel.' },
  { title: 'Segurança da sua conta', body: 'Utilize a aba Segurança para revisar os recursos de proteção disponíveis e Alterar Senha para recuperar o acesso.' },
];
export const LeadsPaySupportWidget: React.FC<{ onNavigateToTab?: (tab: any) => void }> = ({ onNavigateToTab }) => {
  const [open, setOpen] = useState(false);
  const [section, setSection] = useState<Section>('inicio');
  const [search, setSearch] = useState('');
  const [article, setArticle] = useState<(typeof helpArticles)[number] | null>(null);
  const [message, setMessage] = useState('');
  const [showMessageHelp, setShowMessageHelp] = useState(false);
  const results = useMemo(() => helpArticles.filter(a => (a.title + a.category + a.body).toLowerCase().includes(search.trim().toLowerCase())), [search]);
  const nav: { id: Section; title: string; Icon: typeof Home }[] = [
    { id: 'inicio', title: 'Início', Icon: Home }, { id: 'mensagens', title: 'Mensagens', Icon: MessageCircle },
    { id: 'noticias', title: 'Notícias', Icon: Megaphone }, { id: 'roteiro', title: 'Roteiro', Icon: BookOpen },
    { id: 'ajuda', title: 'Ajuda', Icon: CircleHelp },
  ];
  const selectSection = (next: Section) => { setSection(next); setArticle(null); setSearch(''); };
  return (
    <>
      <button type="button" aria-label={open ? 'Fechar suporte LeadsPay' : 'Abrir suporte LeadsPay'} aria-expanded={open} onClick={() => setOpen(v => !v)}
        className="fixed bottom-5 right-5 z-[90] flex h-14 w-14 items-center justify-center rounded-full bg-[#a855f7] text-white shadow-[0_8px_35px_rgba(168,85,247,.45)] transition hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">
        {open ? <X className="h-6 w-6" /> : <Headphones className="h-6 w-6" />}
      </button>
      {open && (
        <section role="dialog" aria-modal="false" aria-label="Central de suporte LeadsPay"
          className="fixed bottom-24 right-3 z-[90] flex h-[min(720px,calc(100dvh-120px))] w-[min(420px,calc(100vw-24px))] flex-col overflow-hidden rounded-[26px] border border-white/15 bg-[#f9fafb] text-[#10151e] shadow-[0_22px_90px_rgba(0,0,0,.55)] sm:right-6">
          {article ? (
            <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-5 py-4">
              <button type="button" aria-label="Voltar" onClick={() => setArticle(null)}><ArrowLeft className="h-5 w-5" /></button>
              <h2 className="flex-1 text-sm font-bold">Central de Ajuda</h2>
              <button type="button" aria-label="Fechar" onClick={() => setOpen(false)}><X className="h-5 w-5" /></button>
            </header>
          ) : section === 'inicio' ? (
            <header className="bg-gradient-to-br from-[#100b20] via-[#261041] to-[#6b21a8] px-6 pb-7 pt-6 text-white">
              <div className="mb-8 flex items-center justify-between"><strong className="text-xl tracking-tight">Leads<span className="text-[#c084fc]">Pay</span></strong><button type="button" aria-label="Fechar" onClick={() => setOpen(false)}><X className="h-5 w-5" /></button></div>
              <p className="text-lg">Oi!</p><h2 className="text-2xl font-bold leading-tight">Como podemos ajudar?</h2>
            </header>
          ) : (
            <header className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4"><h2 className="text-base font-bold">{nav.find(n => n.id === section)?.title}</h2><button type="button" aria-label="Fechar" onClick={() => setOpen(false)}><X className="h-5 w-5" /></button></header>
          )}
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {article ? (
              <article className="rounded-2xl border border-slate-200 bg-white p-5"><span className="text-xs font-semibold text-purple-700">{article.category}</span><h3 className="mb-3 mt-2 text-lg font-bold">{article.title}</h3><p className="text-sm leading-6 text-slate-600">{article.body}</p></article>
            ) : section === 'inicio' ? (
              <>
                <button type="button" onClick={() => selectSection('mensagens')} className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm"><span><strong className="block text-sm">Precisa falar com a equipe?</strong><span className="text-xs text-slate-500">Consulte os canais disponíveis</span></span><Send className="h-5 w-5 text-purple-600" /></button>
                <button type="button" onClick={() => selectSection('ajuda')} className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm"><span><strong className="block text-sm">Central de Ajuda</strong><span className="text-xs text-slate-500">Encontre respostas para suas dúvidas</span></span><ChevronRight className="h-5 w-5 text-purple-600" /></button>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><h3 className="mb-3 text-sm font-bold">Sua plataforma</h3><div className="flex items-center gap-2 rounded-xl bg-purple-50 p-3 text-xs text-purple-900"><ShieldCheck className="h-5 w-5 shrink-0" /> Consulte o status de pagamentos e da conta nas áreas correspondentes da LeadsPay.</div><p className="mt-2 text-xs text-slate-500">O status operacional em tempo real não está disponível neste painel.</p></div>
              </>
            ) : section === 'ajuda' || section === 'roteiro' ? (
              <>
                <label className="flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-3"><Search className="h-4 w-4 text-slate-500" /><input aria-label="Pesquisar ajuda" className="w-full bg-transparent text-sm outline-none" placeholder="Pesquisar ajuda..." value={search} onChange={e => setSearch(e.target.value)} /></label>
                {results.length ? results.map(a => <button type="button" key={a.title} onClick={() => setArticle(a)} className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-4 text-left text-sm font-medium shadow-sm"><span><span className="block text-xs text-purple-700">{a.category}</span>{a.title}</span><ChevronRight className="h-4 w-4 shrink-0 text-purple-600" /></button>) : <p className="p-5 text-center text-sm text-slate-500">Nenhum artigo encontrado.</p>}
              </>
            ) : section === 'noticias' ? (
              news.map(n => <article key={n.title} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><span className="mb-2 block text-xs text-purple-600">LeadsPay</span><h3 className="font-bold">{n.title}</h3><p className="mt-2 text-sm text-slate-500">{n.body}</p></article>)
            ) : (
              <div className="flex h-full flex-col items-center justify-center px-4 text-center"><MessageCircle className="mb-3 h-9 w-9 text-slate-400" /><h3 className="text-lg font-bold">Mensagens</h3><p className="mt-2 text-sm text-slate-500">O atendimento por mensagens ainda não está conectado a um sistema de tickets.</p>
                {!showMessageHelp ? <button type="button" onClick={() => setShowMessageHelp(true)} className="mt-5 rounded-full bg-purple-600 px-5 py-3 text-sm font-semibold text-white">Preparar mensagem</button> : <div className="mt-4 w-full"><textarea aria-label="Mensagem para o suporte" value={message} onChange={e => setMessage(e.target.value)} rows={4} className="w-full rounded-xl border border-slate-300 p-3 text-sm" placeholder="Descreva o que aconteceu..." /><button type="button" disabled={!message.trim()} onClick={async () => { try { await navigator.clipboard.writeText(message); setShowMessageHelp(false); setMessage(''); } catch { /* clipboard permission may be denied */ } }} className="mt-2 rounded-xl bg-purple-600 px-4 py-2 text-sm text-white disabled:opacity-40">Copiar mensagem</button><p className="mt-2 text-xs text-slate-500">A mensagem será copiada, não enviada. Use o canal oficial de atendimento da LeadsPay.</p></div>}
              </div>
            )}
          </div>
          <nav aria-label="Navegação do suporte" className="grid grid-cols-5 gap-1 border-t border-slate-200 bg-white px-2 py-3">
            {nav.map(({ id, title, Icon }) => <button key={id} type="button" aria-current={section === id ? 'page' : undefined} onClick={() => selectSection(id)} className={`flex flex-col items-center gap-1 rounded-lg px-1 py-1 text-[10px] ${section === id ? 'font-bold text-purple-700' : 'text-slate-600'}`}><Icon className="h-5 w-5" /><span className="truncate">{title}</span></button>)}
          </nav>
        </section>
      )}
    </>
  );
};
