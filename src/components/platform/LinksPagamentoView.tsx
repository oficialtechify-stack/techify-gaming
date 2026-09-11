import React, { useState, useEffect } from 'react';
import { 
  Link2, 
  Plus, 
  Copy, 
  Check, 
  ExternalLink, 
  QrCode, 
  Trash2, 
  Search, 
  DollarSign, 
  AlertCircle, 
  X,
  CreditCard,
  Eye,
  CheckCircle2,
  Lock,
  Layers
} from 'lucide-react';
import { CompanyPlan, CompanyStartup } from '../../types/platform';

interface PaymentLinkItem {
  id: string;
  title: string;
  description: string;
  amount: number;
  slug: string;
  url: string;
  status: 'active' | 'inactive';
  created_at: string;
  allowedMethods: ('PIX' | 'CREDIT_CARD')[];
  clicks: number;
  salesCount: number;
  companyId?: string;
}

interface LinksPagamentoViewProps {
  plans?: CompanyPlan[];
  companies?: CompanyStartup[];
  activeCompanyId?: string;
  onOpenCheckout?: (plan: CompanyPlan) => void;
  onCreateCustomPlan?: (planPayload: any) => Promise<any>;
}

const STORAGE_KEY = 'leadspay_custom_payment_links';

export const LinksPagamentoView: React.FC<LinksPagamentoViewProps> = ({
  plans = [],
  companies = [],
  activeCompanyId,
  onOpenCheckout,
  onCreateCustomPlan
}) => {
  const [paymentLinks, setPaymentLinks] = useState<PaymentLinkItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(paymentLinks));
    } catch (_) {}
  }, [paymentLinks]);

  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formAmount, setFormAmount] = useState<string>('50.00');
  const [formPix, setFormPix] = useState<boolean>(true);
  const [formCard, setFormCard] = useState<boolean>(true);
  const [formCompanyId, setFormCompanyId] = useState<string>(activeCompanyId || companies[0]?.id || 'store_default');
  const [formError, setFormError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleCopy = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleCreateLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const numAmount = parseFloat(formAmount.replace(',', '.')) || 0;

    // Validação estrita de R$ 5,00
    if (numAmount < 5.00) {
      setFormError('O valor mínimo para cobranças via Asaas é de R$ 5,00.');
      return;
    }

    if (!formTitle.trim()) {
      setFormError('Informe o título do link de pagamento.');
      return;
    }

    if (!formPix && !formCard) {
      setFormError('Selecione ao menos um método de pagamento aceito.');
      return;
    }

    setIsSubmitting(true);
    try {
      const slug = `pay_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
      const origin = typeof window !== 'undefined' ? window.location.origin : 'https://pay.leadspay.com';
      const checkoutUrl = `${origin}/checkout/${slug}`;

      // Se temos o handler de criação de planos na plataforma, podemos registrar como um plano avulso
      if (onCreateCustomPlan) {
        const targetCompany = companies.find(c => c.id === formCompanyId);
        await onCreateCustomPlan({
          companyId: formCompanyId,
          companyName: targetCompany?.name || 'Link Avulso LeadsPay',
          companyLogo: targetCompany?.logo || '',
          name: formTitle.trim(),
          description: formDescription.trim() || 'Cobrança via Link de Pagamento LeadsPay',
          priceSetup: numAmount,
          priceMonthly: 0,
          commissionPercentage: 100,
          commissionValue: numAmount,
          checkoutSlug: slug,
          badge: 'Link de Pagamento',
          status: 'Ativo'
        });
      }

      const newLink: PaymentLinkItem = {
        id: `plk_${Date.now()}`,
        title: formTitle.trim(),
        description: formDescription.trim(),
        amount: numAmount,
        slug,
        url: checkoutUrl,
        status: 'active',
        created_at: new Date().toISOString(),
        allowedMethods: [
          ...(formPix ? ['PIX' as const] : []),
          ...(formCard ? ['CREDIT_CARD' as const] : [])
        ],
        clicks: 0,
        salesCount: 0,
        companyId: formCompanyId
      };

      setPaymentLinks([newLink, ...paymentLinks]);
      setIsCreateModalOpen(false);
      setFormTitle('');
      setFormDescription('');
      setFormAmount('50.00');
      setFormError('');
    } catch (err: any) {
      setFormError(err.message || 'Erro ao criar link de pagamento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteLink = (id: string) => {
    if (!confirm('Deseja realmente excluir este link de pagamento?')) return;
    setPaymentLinks(paymentLinks.filter(l => l.id !== id));
  };

  // Combine custom payment links with existing plans
  const combinedLinks = [
    ...paymentLinks,
    ...plans.map(p => {
      const slug = p.checkoutSlug || p.slug || p.id;
      const origin = typeof window !== 'undefined' ? window.location.origin : 'https://pay.leadspay.com';
      return {
        id: `plan_${p.id}`,
        title: p.name,
        description: p.description || '',
        amount: Number(p.priceSetup || p.priceMonthly || 0),
        slug,
        url: `${origin}/checkout/${slug}`,
        status: 'active' as const,
        created_at: (p as any).createdAt || new Date().toISOString(),
        allowedMethods: ['PIX' as const, 'CREDIT_CARD' as const],
        clicks: p.affiliatesCount || 0,
        salesCount: p.totalSales || 0,
        companyId: p.companyId
      };
    })
  ];

  const filteredLinks = combinedLinks.filter(link => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      link.title.toLowerCase().includes(q) ||
      link.description.toLowerCase().includes(q) ||
      link.slug.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 animate-fadeIn" id="leadspay-links-pagamento-view">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#D9F22A] mb-1">
            <Link2 className="w-4 h-4" />
            Vendas Rápidas & Checkout Dinâmico
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-['Syne']">
            Links de Pagamento
          </h1>
          <p className="text-xs text-white/60 mt-1 max-w-xl">
            Gere links avulsos para enviar no WhatsApp, redes sociais ou e-mail, permitindo que seus clientes paguem via PIX ou Cartão em segundos.
          </p>
        </div>

        <button
          onClick={() => {
            setFormError('');
            setIsCreateModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#D9F22A] hover:bg-[#cbe327] text-[#060A15] font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(217,242,42,0.2)] cursor-pointer"
          id="btn-create-payment-link"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          + Criar Link de Pagamento
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-[#080d1a] border border-white/10 p-4 rounded-2xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar link de pagamento por título..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#050811] border border-white/15 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#D9F22A]"
          />
        </div>
      </div>

      {/* Grid of Links */}
      {filteredLinks.length === 0 ? (
        <div className="p-12 text-center flex flex-col items-center justify-center bg-[#080d1a] border border-white/10 rounded-2xl">
          <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 mb-3">
            <Link2 className="w-7 h-7 text-[#D9F22A]/60" />
          </div>
          <h3 className="text-base font-bold text-white font-['Syne']">
            Nenhum link de pagamento criado
          </h3>
          <p className="text-xs text-white/50 max-w-md mt-1.5">
            Crie seu primeiro link de cobrança rápida com valor mínimo de R$ 5,00 para compartilhar imediatamente com seus clientes.
          </p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="mt-4 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            + Criar Primeiro Link
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLinks.map((link) => (
            <div
              key={link.id}
              className="p-5 rounded-2xl bg-[#080d1a] border border-white/10 hover:border-[#D9F22A]/40 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Ativo
                  </span>
                  <div className="flex items-center gap-1.5 text-[10px] text-white/50">
                    <QrCode className="w-3 h-3 text-[#D9F22A]" />
                    <span>PIX + Cartão</span>
                  </div>
                </div>

                <h3 className="text-base font-bold text-white font-['Syne'] line-clamp-1">
                  {link.title}
                </h3>
                {link.description && (
                  <p className="text-xs text-white/50 line-clamp-2 mt-1 mb-3">
                    {link.description}
                  </p>
                )}

                <div className="p-3 rounded-xl bg-[#050811] border border-white/5 my-3">
                  <span className="text-[10px] text-white/40 block">Valor Cobrado</span>
                  <div className="text-xl font-black text-emerald-400 font-mono mt-0.5">
                    R$ {Number(link.amount).toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-white/5">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopy(link.url, link.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    {copiedId === link.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#D9F22A]" />
                        <span className="text-[#D9F22A]">Link Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-white/60" />
                        <span>Copiar Link</span>
                      </>
                    )}
                  </button>

                  <a
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-xl bg-[#D9F22A]/10 hover:bg-[#D9F22A] text-[#D9F22A] hover:text-[#060A15] transition-all cursor-pointer"
                    title="Abrir Link de Pagamento"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>

                  {link.id.startsWith('plk_') && (
                    <button
                      onClick={() => handleDeleteLink(link.id)}
                      className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors cursor-pointer"
                      title="Excluir Link"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Criar Link de Pagamento */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-[#080d1a] border border-[#D9F22A]/40 rounded-3xl p-6 sm:p-7 shadow-[0_0_50px_rgba(217,242,42,0.15)]">
            <button
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute top-5 right-5 text-white/50 hover:text-white transition-colors cursor-pointer w-8 h-8 rounded-full bg-white/5 flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-[#D9F22A]/10 text-[#D9F22A] flex items-center justify-center">
                <Link2 className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <h2 className="text-lg font-black text-white font-['Syne']">
                  Novo Link de Pagamento
                </h2>
                <p className="text-xs text-white/50">
                  Crie uma cobrança direta e receba via PIX ou Cartão
                </p>
              </div>
            </div>

            {formError && (
              <div className="p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateLink} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-white/70 block mb-1.5">
                  Título do Pagamento / Produto *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Consultoria Estratégica / E-book Exclusivo"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full bg-[#050811] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#D9F22A]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-white/70 block mb-1.5">
                  Descrição Curta (opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Detalhes ou orientações para o cliente no checkout..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full bg-[#050811] border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#D9F22A]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-white/70">
                    Valor da Cobrança (R$) *
                  </label>
                  <span className="text-[11px] text-[#D9F22A] font-bold">
                    Mínimo: R$ 5,00 (Asaas)
                  </span>
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="5.00"
                  required
                  placeholder="50.00"
                  value={formAmount}
                  onChange={(e) => {
                    setFormAmount(e.target.value);
                    if (parseFloat(e.target.value) < 5.00) {
                      setFormError('O valor mínimo para cobranças via Asaas é de R$ 5,00.');
                    } else {
                      setFormError('');
                    }
                  }}
                  className="w-full bg-[#050811] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white font-bold font-mono focus:outline-none focus:border-[#D9F22A]"
                />
              </div>

              <div className="p-3.5 rounded-2xl bg-[#050811] border border-white/5 space-y-2">
                <span className="text-xs font-bold text-white/70 block">
                  Métodos de Pagamento Permitidos
                </span>
                <div className="flex items-center gap-4 pt-1">
                  <label className="flex items-center gap-2 text-xs text-white cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formPix}
                      onChange={(e) => setFormPix(e.target.checked)}
                      className="accent-[#D9F22A] w-4 h-4 rounded cursor-pointer"
                    />
                    <span>PIX Instantâneo</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs text-white cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formCard}
                      onChange={(e) => setFormCard(e.target.checked)}
                      className="accent-[#D9F22A] w-4 h-4 rounded cursor-pointer"
                    />
                    <span>Cartão de Crédito</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-[#D9F22A] hover:bg-[#cbe327] text-[#060A15] font-black text-xs uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Gerando Link...' : 'Gerar Link de Pagamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
