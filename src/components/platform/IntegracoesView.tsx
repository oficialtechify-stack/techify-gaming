import React from 'react';
import { Activity, ArrowUpRight, CheckCircle2, Clock3, CreditCard, ShieldCheck, Webhook } from 'lucide-react';
import { CompanyPlan, CompanyStartup } from '../../types/platform';

interface IntegracoesViewProps {
  plans?: CompanyPlan[];
  company?: CompanyStartup | null;
  onNavigateToReceipts?: () => void;
}

const pipeline = [
  { title: 'Pagamento confirmado', detail: 'A venda só é gravada após validação da assinatura do webhook Stripe.', icon: CreditCard },
  { title: 'Split calculado', detail: 'Preço, taxa da plataforma e comissão são calculados no servidor em centavos.', icon: Activity },
  { title: 'Liberação D+9', detail: 'Um cron protegido agenda as transferências para as contas conectadas elegíveis.', icon: Clock3 },
];

export const IntegracoesView: React.FC<IntegracoesViewProps> = ({ onNavigateToReceipts }) => (
  <main className="mx-auto max-w-5xl space-y-6" id="leadspay-integracoes-view">
    <header>
      <div className="mb-2 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#3f7f33]"><Webhook className="h-4 w-4" aria-hidden="true" /> Pagamentos e APIs</div>
      <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Integrações Stripe</h1>
      <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">A infraestrutura de pagamento da LeadsPay está sendo validada em ambiente de teste. Chaves de API e segredos do webhook não são gerados nem exibidos no navegador.</p>
    </header>

    <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5" role="status">
      <div className="flex items-start gap-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800"><Activity className="h-4 w-4" aria-hidden="true" /></div><div><h2 className="text-sm font-semibold text-amber-950">Ambiente de teste — sem cobranças reais</h2><p className="mt-1 text-xs leading-5 text-amber-900">O código atual aceita somente uma chave Stripe de teste. Transações, onboarding e transferências neste ambiente não representam liquidação real. Para produção, é necessário configurar credenciais live, webhook live, conta Connect habilitada para Brasil e validar os requisitos de cada recebedor.</p></div></div>
    </section>

    <section className="grid gap-4 md:grid-cols-3">{pipeline.map(({ title, detail, icon: Icon }, index) => <article key={title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><Icon className="h-4 w-4" aria-hidden="true" /></div><div className="mt-4 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Etapa {index + 1}</div><h3 className="mt-1 text-sm font-semibold text-slate-900">{title}</h3><p className="mt-2 text-xs leading-5 text-slate-600">{detail}</p></article>)}</section>

    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><h2 className="text-base font-semibold text-slate-900">Conectar empresa ou afiliado</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">O cadastro da conta conectada é individual por recebedor. Abra <strong>Recebimentos</strong> no painel e conclua o onboarding hospedado pela Stripe. CPF, dados bancários e verificação de identidade são coletados pela própria Stripe; a LeadsPay não precisa armazenar chave Pix.</p><button type="button" onClick={onNavigateToReceipts} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#3f7f33] px-4 text-sm font-semibold text-white transition hover:bg-[#326829] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3f7f33]">Abrir Recebimentos <ArrowUpRight className="h-4 w-4" aria-hidden="true" /></button></section>

    <section className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs leading-5 text-slate-600"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#3f7f33]" aria-hidden="true" /><p>Para reduzir risco de fraude, nenhuma chave Stripe secreta, chave fictícia de API ou assinatura de webhook é salva em <code>localStorage</code> ou exposta no frontend. Webhooks e repasses são operados exclusivamente no servidor.</p></section>
  </main>
);
