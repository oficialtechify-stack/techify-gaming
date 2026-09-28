import React, { useMemo, useState } from 'react';
import { Check, Copy, ExternalLink, Link2, Plus, Search } from 'lucide-react';
import { CompanyPlan, CompanyStartup } from '../../types/platform';

interface LinksPagamentoViewProps {
  plans?: CompanyPlan[];
  companies?: CompanyStartup[];
  activeCompanyId?: string;
  onCreateCustomPlan?: (planPayload: Omit<CompanyPlan, 'id' | 'createdAt'>) => Promise<boolean>;
}

const PLATFORM_FEE = 0.99;
const money = (value: number) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const LinksPagamentoView: React.FC<LinksPagamentoViewProps> = ({ plans = [], companies = [], activeCompanyId, onCreateCustomPlan }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formAmount, setFormAmount] = useState('50.00');
  const [commissionPercentage, setCommissionPercentage] = useState('0');
  const [formCompanyId, setFormCompanyId] = useState(activeCompanyId || companies[0]?.id || '');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const links = useMemo(() => plans.map((plan) => {
    const slug = plan.checkoutSlug || plan.slug || plan.id;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return {
      id: plan.id,
      title: plan.name,
      description: plan.description || '',
      amount: Number(plan.priceSetup || plan.price || plan.priceMonthly || 0),
      slug,
      url: `${origin}/checkout/${encodeURIComponent(slug)}`,
      active: ['ativo', 'active', 'approved', 'aprovado'].includes(String(plan.status || '').toLowerCase()),
    };
  }).filter((link) => {
    if (!searchTerm.trim()) return true;
    return `${link.title} ${link.description} ${link.slug}`.toLowerCase().includes(searchTerm.trim().toLowerCase());
  }), [plans, searchTerm]);

  const handleCopy = async (url: string, id: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(null), 2200);
    } catch {
      setFormError('Não foi possível copiar automaticamente. Abra o checkout e copie o endereço do navegador.');
    }
  };

  const resetForm = () => {
    setFormTitle(''); setFormDescription(''); setFormAmount('50.00'); setCommissionPercentage('0');
    setFormCompanyId(activeCompanyId || companies[0]?.id || ''); setFormError('');
  };

  const handleCreateLink = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError('');
    const amount = Number(formAmount.replace(',', '.'));
    const commission = Number(commissionPercentage.replace(',', '.'));
    if (!formCompanyId || !companies.some((company) => company.id === formCompanyId)) {
      setFormError('Selecione uma empresa vinculada à sua conta.'); return;
    }
    if (!formTitle.trim()) { setFormError('Informe o nome da oferta.'); return; }
    if (!Number.isFinite(amount) || amount < 0.5) { setFormError('O valor da oferta deve ser de pelo menos R$ 0,50.'); return; }
    if (!Number.isFinite(commission) || commission < 0 || commission > 100) { setFormError('A comissão deve estar entre 0% e 100%.'); return; }
    if (!onCreateCustomPlan) { setFormError('A criação de oferta não está disponível nesta conta.'); return; }

    setIsSubmitting(true);
    try {
      const company = companies.find((item) => item.id === formCompanyId)!;
      const slug = `lp-${crypto.randomUUID().slice(0, 12)}`;
      const created = await onCreateCustomPlan({
        companyId: company.id,
        companyName: company.name,
        companyLogo: company.logo || '',
        category: 'Serviços',
        name: formTitle.trim().slice(0, 120),
        description: formDescription.trim().slice(0, 500),
        priceSetup: amount,
        priceMonthly: 0,
        commissionPercentage: commission,
        commissionValue: Number((amount * commission / 100).toFixed(2)),
        features: [],
        bannerImage: '',
        totalSales: 0,
        checkoutSlug: slug,
        badge: 'Link de Pagamento',
        status: 'Ativo',
      });
      if (!created) { setFormError('A oferta não foi salva. Confira a verificação da empresa e tente novamente.'); return; }
      setIsCreateModalOpen(false);
      resetForm();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Não foi possível salvar a oferta.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="space-y-6" id="leadspay-links-pagamento-view">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><div className="mb-1 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#5ba63c]"><Link2 className="h-4 w-4" aria-hidden="true" /> Checkout Stripe</div><h1 className="text-2xl font-semibold tracking-tight text-slate-950">Links de pagamento</h1><p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">Cada link aponta para uma oferta salva no Firestore. A Stripe decide quais métodos estão habilitados e elegíveis para cada comprador.</p></div>
        <button type="button" onClick={() => { resetForm(); setIsCreateModalOpen(true); }} disabled={!companies.length} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#3f7f33] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#326829] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3f7f33] disabled:cursor-not-allowed disabled:opacity-50"><Plus className="h-4 w-4" /> Criar link</button>
      </header>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"><p className="max-w-xl text-xs leading-5 text-slate-600">O checkout de teste acrescenta uma taxa de plataforma de R$ 0,99 ao preço da oferta. O destino do split é calculado no servidor; valores de teste não representam pagamentos reais.</p><label className="relative block w-full sm:max-w-xs"><span className="sr-only">Buscar oferta</span><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" /><input type="search" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Buscar oferta" className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#5ba63c] focus:ring-2 focus:ring-[#5ba63c]/15" /></label></div>

      {links.length === 0 ? <section className="rounded-2xl border border-slate-200 bg-white px-5 py-14 text-center shadow-sm"><Link2 className="mx-auto h-9 w-9 text-slate-300" aria-hidden="true" /><h2 className="mt-3 text-sm font-semibold text-slate-800">Nenhuma oferta disponível para link</h2><p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-500">Crie uma oferta vinculada à sua empresa. Ela só aparecerá aqui depois de ser persistida no Firestore.</p></section> : (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{links.map((link) => <article key={link.id} className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div><div className="mb-3 flex items-center justify-between gap-3"><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${link.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{link.active ? 'Ativo' : 'Pausado'}</span><span className="text-xs text-slate-500">Stripe · métodos dinâmicos</span></div><h2 className="line-clamp-1 text-base font-semibold text-slate-900">{link.title}</h2>{link.description && <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{link.description}</p>}<div className="my-4 rounded-xl border border-slate-100 bg-slate-50 p-3"><span className="text-[10px] font-medium text-slate-500">Preço da oferta</span><div className="mt-0.5 text-xl font-semibold tracking-tight text-slate-950">{money(link.amount)}</div><p className="mt-1 text-[10px] text-slate-500">Total estimado no checkout: {money(link.amount + PLATFORM_FEE)}</p></div><p className="break-all text-[11px] text-slate-500">{link.url}</p></div>
          <div className="mt-4 flex gap-2 border-t border-slate-100 pt-3"><button type="button" onClick={() => void handleCopy(link.url, link.id)} className="inline-flex min-h-9 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5ba63c]">{copiedId === link.id ? <><Check className="h-3.5 w-3.5 text-emerald-600" /> Copiado</> : <><Copy className="h-3.5 w-3.5" /> Copiar link</>}</button><a href={link.url} target="_blank" rel="noreferrer" aria-label={`Abrir checkout para ${link.title}`} className="inline-flex h-9 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5ba63c]"><ExternalLink className="h-4 w-4" /></a></div>
        </article>)}</section>
      )}

      {isCreateModalOpen && <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/55 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !isSubmitting) setIsCreateModalOpen(false); }}><section role="dialog" aria-modal="true" aria-labelledby="create-payment-link-title" className="my-auto w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="mb-5"><div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#5ba63c]"><Link2 className="h-4 w-4" /> Oferta Stripe</div><h2 id="create-payment-link-title" className="mt-2 text-lg font-semibold text-slate-950">Criar link de pagamento</h2><p className="mt-1 text-xs leading-5 text-slate-500">A oferta será salva no Firestore e o checkout buscará preço/empresa no servidor.</p></div>
        {formError && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-800" role="alert">{formError}</div>}
        <form onSubmit={(event) => void handleCreateLink(event)} className="space-y-4">
          <label className="block text-xs font-semibold text-slate-700">Empresa<select required value={formCompanyId} onChange={(event) => setFormCompanyId(event.target.value)} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[#5ba63c] focus:ring-2 focus:ring-[#5ba63c]/15"><option value="" disabled>Selecione a empresa</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select></label>
          <label className="block text-xs font-semibold text-slate-700">Título da oferta<input required maxLength={120} value={formTitle} onChange={(event) => setFormTitle(event.target.value)} placeholder="Ex.: Consultoria estratégica" className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#5ba63c] focus:ring-2 focus:ring-[#5ba63c]/15" /></label>
          <label className="block text-xs font-semibold text-slate-700">Descrição<textarea rows={3} maxLength={500} value={formDescription} onChange={(event) => setFormDescription(event.target.value)} placeholder="Informações claras para o comprador" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#5ba63c] focus:ring-2 focus:ring-[#5ba63c]/15" /></label>
          <div className="grid gap-4 sm:grid-cols-2"><label className="block text-xs font-semibold text-slate-700">Preço do produto (R$)<input type="number" min="0.50" step="0.01" required value={formAmount} onChange={(event) => setFormAmount(event.target.value)} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[#5ba63c] focus:ring-2 focus:ring-[#5ba63c]/15" /></label><label className="block text-xs font-semibold text-slate-700">Comissão de afiliado (%)<input type="number" min="0" max="100" step="0.1" value={commissionPercentage} onChange={(event) => setCommissionPercentage(event.target.value)} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[#5ba63c] focus:ring-2 focus:ring-[#5ba63c]/15" /><span className="mt-1 block text-[10px] font-normal text-slate-500">A comissão só é aplicada se houver afiliação válida.</span></label></div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-900">Taxa da plataforma no checkout: {money(PLATFORM_FEE)}. A Stripe seleciona os métodos de pagamento disponíveis para a configuração da conta e do comprador.</div>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" disabled={isSubmitting} onClick={() => setIsCreateModalOpen(false)} className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50">Cancelar</button><button type="submit" disabled={isSubmitting || !companies.length} className="h-10 rounded-xl bg-[#3f7f33] px-4 text-sm font-semibold text-white transition hover:bg-[#326829] disabled:cursor-not-allowed disabled:opacity-50">{isSubmitting ? 'Salvando…' : 'Salvar e gerar link'}</button></div>
        </form>
      </section></div>}
    </main>
  );
};
