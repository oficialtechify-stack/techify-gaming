import React from 'react';
import { Clock3, Repeat, ShieldCheck } from 'lucide-react';
import { CompanyPlan, SaleTransaction, UserSellerProfile } from '../../types/platform';

interface AssinaturasViewProps {
  plans?: CompanyPlan[];
  sales?: SaleTransaction[];
  userProfile?: UserSellerProfile;
  onNavigateToProducts?: () => void;
  onOpenCreatePlan?: () => void;
  onOpenCheckout?: (plan: CompanyPlan) => void;
}

export const AssinaturasView: React.FC<AssinaturasViewProps> = () => (
  <main className="mx-auto max-w-4xl space-y-6" id="leadspay-assinaturas-view">
    <header>
      <div className="mb-2 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#3f7f33]"><Repeat className="h-4 w-4" aria-hidden="true" /> Stripe Billing</div>
      <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Assinaturas</h1>
      <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">A gestão de cobranças recorrentes ainda não está habilitada nesta versão.</p>
    </header>
    <section className="rounded-2xl border border-amber-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700"><Clock3 className="h-5 w-5" aria-hidden="true" /></div>
        <div>
          <h2 className="text-base font-semibold text-slate-900">Recurso em preparação</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">O checkout atual processa pagamentos únicos e confirma vendas por webhook. Para evitar cobranças únicas apresentadas como assinatura, criação de planos recorrentes e métricas de MRR estão desativadas até concluir a integração Stripe Billing, incluindo renovações, cancelamentos e eventos de falha de pagamento.</p>
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-600"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#3f7f33]" aria-hidden="true" /><span>Vendas reais de pagamento único continuam disponíveis nas abas Vendas e Financeiro. Nenhum valor recorrente está sendo estimado ou exibido como receita.</span></div>
        </div>
      </div>
    </section>
  </main>
);
