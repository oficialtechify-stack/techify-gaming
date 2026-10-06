import React, { useEffect, useMemo, useState } from 'react';
import {
  CompanyPlan,
  ProductCoupon,
  ProductDeliveryType,
  ProductCustomCheckout,
  ProductOrderBump,
  ProductUpsell
} from '../../types/platform';
import { getCompanyPlanDeliverySettings } from '../../services/firestoreService';
import {
  ArrowLeft,
  BadgePercent,
  Check,
  ChevronRight,
  CircleDollarSign,
  Copy,
  CreditCard,
  ExternalLink,
  Eye,
  Image as ImageIcon,
  Link2,
  LockKeyhole,
  MousePointerClick,
  Package,
  Percent,
  Plus,
  Save,
  Search,
  Settings,
  ShoppingCart,
  SlidersHorizontal,
  Sparkles,
  Tag,
  Trash2,
  Users,
  Waypoints,
  Webhook,
  X
} from 'lucide-react';

interface CompanyProductStudioProps {
  plan: CompanyPlan;
  onSave: (updatedPlan: Partial<CompanyPlan>) => Promise<CompanyPlan | void> | CompanyPlan | void;
  onDelete: (planId: string, companyId?: string) => void;
  onBack: () => void;
  onOpenCheckout: (plan: CompanyPlan, checkoutSlug?: string) => void;
}

type StudioTab =
  | 'info'
  | 'payment'
  | 'settings'
  | 'offers'
  | 'order_bump'
  | 'coupons'
  | 'upsell'
  | 'pixel'
  | 'affiliates'
  | 'coproduction'
  | 'checkout'
  | 'links';

const TEMPORARILY_LOCKED_TABS = new Set<StudioTab>(['coproduction']);

const LOCKED_TAB_COPY: Partial<Record<StudioTab, { title: string; description: string }>> = {
  coproduction: {
    title: 'Coprodução em preparação',
    description: 'Vamos liberar esta área hoje depois de concluir convite, aceite, Stripe Connect e divisão financeira segura entre os participantes.'
  },
};

const Toggle = ({ value, onChange }: { value: boolean; onChange: (value: boolean) => void }) => (
  <button
    type="button"
    onClick={() => onChange(!value)}
    className={`relative h-5 w-9 rounded-full transition-colors ${value ? 'bg-emerald-500' : 'bg-white/20'}`}
  >
    <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${value ? 'left-[18px]' : 'left-0.5'}`} />
  </button>
);

const LockedFeature = ({ title, description }: { title: string; description: string }) => (
  <div className="group relative overflow-hidden rounded-3xl border border-[#D9F22A]/20 bg-[radial-gradient(circle_at_top_right,rgba(217,242,42,0.10),transparent_38%),linear-gradient(180deg,rgba(13,18,28,0.98),rgba(7,11,18,0.98))] p-7 shadow-[0_18px_60px_rgba(0,0,0,0.28)] sm:p-10">
    <div className="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-[#D9F22A]/10 blur-3xl transition duration-500 group-hover:scale-125 group-hover:bg-[#D9F22A]/15" />
    <div className="relative flex flex-col items-start gap-5 sm:flex-row sm:items-center">
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#D9F22A]/25 bg-[#D9F22A]/10 text-[#D9F22A] shadow-[0_0_28px_rgba(217,242,42,0.10)] transition duration-300 group-hover:-translate-y-1 group-hover:rotate-3 group-hover:scale-105">
        <LockKeyhole className="h-6 w-6 transition-transform duration-300 group-hover:scale-110" />
      </div>
      <div className="min-w-0">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h3 className="text-xl font-black text-white">{title}</h3>
          <span className="rounded-full border border-[#D9F22A]/25 bg-[#D9F22A]/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#D9F22A]">
            Temporariamente bloqueado
          </span>
        </div>
        <p className="max-w-2xl text-sm leading-relaxed text-white/55">{description}</p>
        <p className="mt-3 text-xs font-semibold text-white/35">Este bloqueio é temporário e será removido assim que o fluxo estiver validado hoje.</p>
      </div>
    </div>
  </div>
);

export const CompanyProductStudio: React.FC<CompanyProductStudioProps> = ({
  plan,
  onSave,
  onDelete,
  onBack,
  onOpenCheckout
}) => {
  const [activeTab, setActiveTab] = useState<StudioTab>('info');
  const [name, setName] = useState(plan.name || '');
  const [description, setDescription] = useState(plan.description || '');
  const [category, setCategory] = useState(plan.category || 'SaaS & Software');
  const [bannerImage, setBannerImage] = useState(plan.bannerImage || '');
  const [status, setStatus] = useState<'Ativo' | 'Pausado'>(plan.status || 'Ativo');

  const [paymentType, setPaymentType] = useState<'Único' | 'Recorrente' | 'Assinatura'>(plan.paymentType || 'Único');
  const [priceSetup, setPriceSetup] = useState(plan.priceSetup || 0);
  const [priceMonthly, setPriceMonthly] = useState(plan.priceMonthly || 0);
  const [billingCycle, setBillingCycle] = useState<CompanyPlan['billingCycle']>(plan.billingCycle || 'MONTHLY');
  const [paymentMethods, setPaymentMethods] = useState<NonNullable<CompanyPlan['paymentMethods']>>(
    plan.paymentMethods?.length ? plan.paymentMethods : ['PIX', 'CARD']
  );
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState<NonNullable<CompanyPlan['defaultPaymentMethod']>>(
    plan.defaultPaymentMethod || 'CARD'
  );
  const [maxInstallments, setMaxInstallments] = useState(plan.maxInstallments || 12);

  const [supportEmail, setSupportEmail] = useState(plan.supportEmail || '');
  const [warrantyDays, setWarrantyDays] = useState(plan.warrantyDays || 7);
  const [thankYouPageUrl, setThankYouPageUrl] = useState(plan.deliveryUrl || plan.thankYouPageUrl || '');
  const [deliveryType, setDeliveryType] = useState<ProductDeliveryType>(plan.deliveryType || 'redirect');
  const [deliveryInstructions, setDeliveryInstructions] = useState(plan.deliveryInstructions || '');

  const [commissionPercentage, setCommissionPercentage] = useState(plan.commissionPercentage || 30);
  const [allowAffiliates, setAllowAffiliates] = useState(plan.allowAffiliates ?? true);
  const [affiliateApprovalMode, setAffiliateApprovalMode] = useState<NonNullable<CompanyPlan['affiliateApprovalMode']>>(
    plan.affiliateApprovalMode || 'automatic'
  );
  const [affiliateSupportEmail, setAffiliateSupportEmail] = useState(plan.affiliateSupportEmail || supportEmail);
  const [affiliateDescription, setAffiliateDescription] = useState(plan.affiliateDescription || '');
  const [affiliateCookieDays, setAffiliateCookieDays] = useState(plan.affiliateCookieDays || 30);
  const [affiliateAttribution, setAffiliateAttribution] = useState<NonNullable<CompanyPlan['affiliateAttribution']>>(
    plan.affiliateAttribution || 'last_click'
  );
  const [affiliateMarketplaceVisible, setAffiliateMarketplaceVisible] = useState(plan.affiliateMarketplaceVisible ?? true);
  const [affiliateCommissionOnOrderBump, setAffiliateCommissionOnOrderBump] = useState(plan.affiliateCommissionOnOrderBump ?? true);
  const [affiliateCommissionOnUpsell, setAffiliateCommissionOnUpsell] = useState(plan.affiliateCommissionOnUpsell ?? false);

  const [pixelProvider, setPixelProvider] = useState<NonNullable<CompanyPlan['pixelProvider']>>(plan.pixelProvider || 'none');
  const [pixelId, setPixelId] = useState(plan.pixelId || '');
  const [pixelPurchaseEventEnabled, setPixelPurchaseEventEnabled] = useState(plan.pixelPurchaseEventEnabled ?? true);

  const [thankYouUpsellEnabled, setThankYouUpsellEnabled] = useState(plan.thankYouUpsellEnabled ?? false);
  const [upsellIgnoreOrderBumpFailure, setUpsellIgnoreOrderBumpFailure] = useState(plan.upsellIgnoreOrderBumpFailure ?? false);
  const [confirmationEmailEnabled, setConfirmationEmailEnabled] = useState(plan.confirmationEmailEnabled ?? true);
  const [confirmationEmailTiming, setConfirmationEmailTiming] = useState<NonNullable<CompanyPlan['confirmationEmailTiming']>>(
    plan.confirmationEmailTiming || 'immediate'
  );

  const [orderBumps, setOrderBumps] = useState<ProductOrderBump[]>(plan.orderBumps || []);
  const [upsells, setUpsells] = useState<ProductUpsell[]>(plan.upsells || []);
  const [coupons, setCoupons] = useState<ProductCoupon[]>(plan.coupons || []);
  const [checkouts, setCheckouts] = useState<ProductCustomCheckout[]>(
    plan.customCheckouts?.length
      ? plan.customCheckouts
      : [{
          id: 'default',
          name: 'Checkout Principal',
          isDefault: true,
          price: plan.priceSetup || 0,
          offerName: plan.name,
          visitsCount: 0,
          salesCount: plan.totalSales || 0,
          checkoutSlug: plan.checkoutSlug || plan.id
        }]
  );
  const [coproducers, setCoproducers] = useState<NonNullable<CompanyPlan['coproducers']>>(plan.coproducers || []);

  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [savedAt, setSavedAt] = useState('');
  const [deliveryLoading, setDeliveryLoading] = useState(true);
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://leadspay.com';
  const checkoutUrl = `${origin}?checkout=${plan.checkoutSlug || plan.id}`;
  const inviteUrl = `${origin}?plan=${plan.id}&affiliate=invite`;
  const customCheckoutUrl = (checkout: ProductCustomCheckout) =>
    checkout.isDefault
      ? checkoutUrl
      : `${origin}?checkout=${plan.checkoutSlug || plan.id}&variant=${encodeURIComponent(checkout.checkoutSlug)}`;

  useEffect(() => {
    let cancelled = false;
    setDeliveryLoading(true);

    getCompanyPlanDeliverySettings(plan.id)
      .then((delivery) => {
        if (cancelled) return;
        setDeliveryType(delivery.deliveryType || 'redirect');
        setThankYouPageUrl(delivery.deliveryUrl || '');
        setDeliveryInstructions(delivery.deliveryInstructions || '');
      })
      .catch((error) => {
        console.warn('[CompanyProductStudio] Não foi possível carregar a entrega privada.', error);
      })
      .finally(() => {
        if (!cancelled) setDeliveryLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [plan.id]);

  useEffect(() => {
    if (paymentType === 'Único') return;
    setPaymentMethods((current) => {
      return current.includes('CARD') ? ['CARD'] : ['CARD'];
    });
    if (defaultPaymentMethod === 'PIX' || defaultPaymentMethod === 'BOLETO') {
      setDefaultPaymentMethod('CARD');
    }
  }, [paymentType]);

  const copy = (value: string, key: string) => {
    navigator.clipboard.writeText(value);
    setCopied(key);
    setTimeout(() => setCopied(''), 1800);
  };

  const togglePaymentMethod = (method: NonNullable<CompanyPlan['paymentMethods']>[number]) => {
    setPaymentMethods((current) => {
      if (current.includes(method)) {
        const next = current.filter((item) => item !== method);
        if (defaultPaymentMethod === method && next.length) setDefaultPaymentMethod(next[0]);
        return next.length ? next : current;
      }
      return [...current, method];
    });
  };

  const saveAll = async () => {
    setSaveError('');

    if (!name.trim()) {
      setSaveError('Informe o nome do produto.');
      return;
    }
    if (description.trim().length < 10) {
      setSaveError('A descrição precisa ter pelo menos 10 caracteres.');
      return;
    }
    if (!Number.isFinite(priceSetup) || priceSetup < 0.5) {
      setSaveError('Informe um valor principal válido a partir de R$ 0,50.');
      return;
    }
    if (paymentType !== 'Único' && (!Number.isFinite(priceMonthly) || priceMonthly < 0.5)) {
      setSaveError('Informe um valor recorrente válido.');
      return;
    }
    if (deliveryLoading) {
      setSaveError('Aguarde o carregamento das configurações privadas de entrega.');
      return;
    }
    if (!thankYouPageUrl.trim() || !/^https:\/\//i.test(thankYouPageUrl.trim())) {
      setSaveError('Configure uma URL HTTPS válida para entrega/página pós-compra.');
      return;
    }

    const totalCoproduction = coproducers.reduce(
      (sum, item) => sum + Number(item.commissionPercentage || 0),
      0
    );
    if (totalCoproduction > 100) {
      setSaveError('A soma das porcentagens dos coprodutores não pode ultrapassar 100%.');
      return;
    }

    const normalizedCoupons = coupons
      .map((coupon) => ({
        ...coupon,
        code: coupon.code.toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 40),
      }))
      .filter((coupon) => coupon.code && coupon.discountValue > 0);

    const commissionValue = Number(((priceSetup * commissionPercentage) / 100).toFixed(2));
    setIsSaving(true);

    try {
      await onSave({
        companyId: plan.companyId,
        name: name.trim(),
        tagline: plan.tagline || name.trim(),
        description: description.trim(),
        category,
        features: Array.isArray(plan.features) ? plan.features : [],
        badge: plan.badge || '',
        bannerImage,
        checkoutSlug: plan.checkoutSlug,
        slug: plan.slug,
        recurringCommissionEnabled: plan.recurringCommissionEnabled,
        recurrentCommissionPercent: plan.recurrentCommissionPercent,
        recurrentCommissionValue: plan.recurrentCommissionValue,
        recurrentCommission: plan.recurrentCommission,

        status,
        active: status === 'Ativo',
        paymentType,
        billingType: paymentType === 'Único' ? 'unico' : 'recorrente',
        billingCycle,
        billingInterval:
          billingCycle === 'YEARLY'
            ? 'yearly'
            : billingCycle === 'WEEKLY' || billingCycle === 'BIWEEKLY'
              ? 'weekly'
              : billingCycle === 'QUARTERLY'
                ? 'quarterly'
                : billingCycle === 'SEMIANNUALLY'
                  ? 'semiannually'
                  : 'monthly',
        priceSetup,
        priceMonthly: paymentType === 'Único' ? 0 : priceMonthly,
        commissionPercentage,
        commissionValue,
        supportEmail: supportEmail.trim(),
        warrantyDays,
        thankYouPageUrl: thankYouPageUrl.trim(),
        deliveryType,
        deliveryUrl: thankYouPageUrl.trim(),
        deliveryInstructions: deliveryInstructions.trim(),
        paymentMethods,
        defaultPaymentMethod,
        maxInstallments,
        allowAffiliates,
        affiliateApprovalMode,
        affiliateSupportEmail: affiliateSupportEmail.trim(),
        affiliateDescription: affiliateDescription.trim(),
        affiliateCookieDays,
        affiliateAttribution,
        affiliateMarketplaceVisible,
        affiliateCommissionOnOrderBump,
        affiliateCommissionOnUpsell,
        pixelProvider,
        pixelId: pixelId.trim(),
        pixelPurchaseEventEnabled,
        thankYouUpsellEnabled,
        upsellIgnoreOrderBumpFailure,
        confirmationEmailEnabled,
        confirmationEmailTiming,
        orderBumps,
        upsells,
        coupons: normalizedCoupons,
        customCheckouts: checkouts,
        coproducers
      });
      setCoupons(normalizedCoupons);
      setSavedAt(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Não foi possível salvar as alterações.');
    } finally {
      setIsSaving(false);
    }
  };

  const navGroups = [
    {
      label: 'EDIÇÃO RÁPIDA',
      items: [
        ['info', 'Informações do Produto', Package],
        ['payment', 'Modelo de Pagamento', CreditCard],
        ['settings', 'Configurações', Settings]
      ]
    },
    {
      label: 'CONFIGURAÇÕES AVANÇADAS',
      items: [
        ['offers', 'Ofertas', BadgePercent],
        ['order_bump', 'Order Bump', ShoppingCart],
        ['coupons', 'Cupons', Tag],
        ['upsell', 'Upsell e Downsell', Waypoints],
        ['pixel', 'Configurar Pixel', MousePointerClick],
        ['affiliates', 'Afiliados', Users],
        ['coproduction', 'Coprodução', Users],
        ['checkout', 'Personalizar Checkout', SlidersHorizontal],
        ['links', 'Ver Links', Link2]
      ]
    }
  ] as const;

  const titleMap: Record<StudioTab, string> = {
    info: 'Editar informações do produto',
    payment: 'Editar modelo de pagamento',
    settings: 'Configurações do produto',
    offers: 'Ofertas',
    order_bump: 'Order Bump',
    coupons: 'Cupons',
    upsell: 'Upsell e página de obrigado',
    pixel: 'Configurar Pixel',
    affiliates: 'Programa de afiliados',
    coproduction: 'Coprodução',
    checkout: 'Personalizar Checkout',
    links: 'Links de checkout'
  };

  const Section = ({ children }: { children: React.ReactNode }) => (
    <div className="rounded-2xl border border-white/10 bg-[#0d121c] p-5 sm:p-6">{children}</div>
  );

  const inputClass = 'w-full rounded-xl border border-white/10 bg-[#070b12] px-3.5 py-2.5 text-sm text-white outline-none transition focus:border-[#D9F22A]/60';
  const labelClass = 'mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-white/50';

  const filteredCheckouts = useMemo(
    () => checkouts.filter((c) => !search || c.name.toLowerCase().includes(search.toLowerCase())),
    [checkouts, search]
  );

  const recurringLimitedTab =
    paymentType !== 'Único' && (activeTab === 'order_bump' || activeTab === 'coupons');
  const activeTabLocked = TEMPORARILY_LOCKED_TABS.has(activeTab) || recurringLimitedTab;
  const activeTabLockCopy = recurringLimitedTab
    ? {
        title: activeTab === 'order_bump' ? 'Order Bump recorrente em preparação' : 'Cupom recorrente em preparação',
        description:
          activeTab === 'order_bump'
            ? 'O Order Bump continua liberado para pagamento único. Vamos destravar o uso em assinatura somente depois de validar a cobrança recorrente do adicional e a taxa por item.'
            : 'Os cupons continuam liberados para pagamento único. Vamos destravar em assinaturas quando desconto inicial e renovações estiverem consistentes no backend.'
      }
    : LOCKED_TAB_COPY[activeTab];

  return (
    <div className="-m-3.5 min-h-screen bg-[#050811] text-white sm:-m-5 md:-m-6 lg:-m-8">
      <div className="sticky top-16 z-30 border-b border-white/10 bg-[#050811]/98 px-4 py-3 shadow-[0_10px_30px_rgba(0,0,0,0.28)] backdrop-blur-xl sm:px-6">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-3 lg:flex-row lg:flex-nowrap lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <button onClick={onBack} className="rounded-xl border border-white/10 p-2 text-white/60 hover:bg-white/5 hover:text-white">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <img src={bannerImage || plan.companyLogo} alt="" className="h-12 w-12 shrink-0 rounded-xl border border-white/10 bg-black/30 object-cover" />
            <div className="min-w-0">
              <h2 className="truncate text-lg font-black sm:text-xl">{name || 'Produto sem nome'}</h2>
              <p className="truncate text-[11px] text-white/45">ID: {plan.id}</p>
              <p className="text-[11px] text-white/35">Produto da empresa • edição completa</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button onClick={() => copy(checkoutUrl, 'header-link')} className="hidden items-center gap-2 rounded-xl border border-white/15 px-3 py-2 text-xs font-bold hover:bg-white/5 sm:flex">
              <Link2 className="h-3.5 w-3.5" /> {copied === 'header-link' ? 'Copiado' : 'Ver Links'}
            </button>
            <button onClick={() => onOpenCheckout(plan)} className="hidden items-center gap-2 rounded-xl border border-white/15 px-3 py-2 text-xs font-bold hover:bg-white/5 sm:flex">
              <ExternalLink className="h-3.5 w-3.5" /> Ver Checkout
            </button>
            <button type="button" disabled={isSaving} onClick={saveAll} className="flex items-center gap-2 rounded-xl bg-[#D9F22A] px-4 py-2.5 text-xs font-black uppercase text-[#060A15] hover:bg-[#c8e217] disabled:cursor-not-allowed disabled:opacity-60">
              <Save className="h-4 w-4" /> {isSaving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-[1500px] grid-cols-1 gap-0 lg:grid-cols-[255px_minmax(0,1fr)]">
        <aside className="border-b border-white/10 p-4 lg:sticky lg:top-[8.75rem] lg:h-[calc(100vh-8.75rem)] lg:self-start lg:overflow-y-auto lg:border-b-0 lg:border-r lg:p-5">
          <div className="flex gap-2 overflow-x-auto lg:block lg:space-y-6">
            {navGroups.map((group) => (
              <div key={group.label} className="min-w-max lg:min-w-0">
                <p className="mb-2 hidden text-[10px] font-black uppercase tracking-[0.16em] text-white/35 lg:block">{group.label}</p>
                <div className="flex gap-1 lg:flex-col">
                  {group.items.map(([id, label, Icon]) => (
                    <button
                      key={id}
                      onClick={() => setActiveTab(id)}
                      className={`group flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-bold transition-all duration-200 hover:-translate-y-0.5 ${activeTab === id ? 'bg-[#D9F22A]/12 text-[#D9F22A] ring-1 ring-[#D9F22A]/25 shadow-[0_8px_24px_rgba(217,242,42,0.06)]' : 'text-white/65 hover:bg-white/5 hover:text-white'}`}
                    >
                      <span className="flex items-center gap-2.5">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/5 bg-white/[0.025] transition-all duration-200 group-hover:rotate-3 group-hover:scale-110 group-hover:border-[#D9F22A]/20 group-hover:bg-[#D9F22A]/8">
                          <Icon className="h-4 w-4 transition-transform duration-200 group-hover:-translate-y-0.5" />
                        </span>
                        {label}
                      </span>
                      <span className="flex items-center gap-1.5">
                        {(TEMPORARILY_LOCKED_TABS.has(id) || (paymentType !== 'Único' && (id === 'order_bump' || id === 'coupons'))) && (
                          <LockKeyhole className="h-3.5 w-3.5 text-white/30" />
                        )}
                        <ChevronRight className="hidden h-3.5 w-3.5 opacity-50 transition-transform duration-200 group-hover:translate-x-0.5 lg:block" />
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 hidden rounded-2xl border border-white/10 bg-white/[0.03] p-4 lg:block">
            <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-white/35">Status do produto</p>
            <button
              onClick={() => setStatus(status === 'Ativo' ? 'Pausado' : 'Ativo')}
              className="flex w-full items-center gap-3 rounded-xl bg-[#070b12] p-3 text-left"
            >
              <span className={`h-2.5 w-2.5 rounded-full ${status === 'Ativo' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              <div>
                <p className="text-sm font-black">{status}</p>
                <p className="text-[10px] text-white/40">Clique para {status === 'Ativo' ? 'pausar' : 'ativar'}.</p>
              </div>
            </button>
          </div>
        </aside>

        <main className="min-w-0 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-5xl">
            <div className="mb-5 flex items-center justify-between gap-3">
              <h1 className="text-2xl font-black sm:text-3xl">{titleMap[activeTab]}</h1>
              <button type="button" disabled={isSaving} onClick={saveAll} className="hidden rounded-xl bg-[#D9F22A] px-4 py-2 text-xs font-black text-[#060A15] disabled:opacity-60 sm:block">{isSaving ? 'Salvando...' : 'Salvar Produto'}</button>
            </div>

            {activeTabLocked && activeTabLockCopy && (
              <LockedFeature title={activeTabLockCopy.title} description={activeTabLockCopy.description} />
            )}

            {activeTab === 'info' && (
              <div className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                <Section>
                  <h3 className="text-lg font-black">Selecionar uma imagem do produto</h3>
                  <p className="mt-1 text-xs text-white/50">A imagem aparece na vitrine, checkout e programa de afiliados.</p>
                  <div className="mt-5 flex min-h-72 items-center justify-center rounded-2xl border border-dashed border-white/15 bg-[#070b12] p-4">
                    {bannerImage ? <img src={bannerImage} alt={name} className="max-h-64 rounded-xl object-contain" /> : <ImageIcon className="h-14 w-14 text-white/20" />}
                  </div>
                  <label className={`${labelClass} mt-4`}>URL da imagem</label>
                  <input className={inputClass} value={bannerImage} onChange={(e) => setBannerImage(e.target.value)} placeholder="https://..." />
                  <p className="mt-2 text-[10px] text-white/35">Recomendado: 1200×800 ou 300×250. JPG, PNG ou WEBP.</p>
                </Section>
                <Section>
                  <h3 className="text-lg font-black">Informações de produto</h3>
                  <p className="mt-1 text-xs text-white/50">Edite os dados que serão mostrados ao comprador.</p>
                  <div className="mt-5 space-y-4">
                    <div><label className={labelClass}>Nome do produto</label><input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} /></div>
                    <div><label className={labelClass}>Descrição</label><textarea className={`${inputClass} min-h-36 resize-y`} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
                    <div><label className={labelClass}>Categoria</label><select className={inputClass} value={category} onChange={(e) => setCategory(e.target.value)}><option>SaaS & Software</option><option>Marketing Digital</option><option>Educação & Cursos</option><option>IA & Produtividade</option><option>Finanças & Gestão</option><option>Outros</option></select></div>
                  </div>
                </Section>
              </div>
            )}

            {activeTab === 'payment' && (
              <div className="space-y-5">
                <Section>
                  <h3 className="text-lg font-black">Como seu cliente poderá pagar?</h3>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div><label className={labelClass}>Modelo</label><select className={inputClass} value={paymentType} onChange={(e) => setPaymentType(e.target.value as any)}><option value="Único">Pagamento Único</option><option value="Recorrente">Recorrente</option><option value="Assinatura">Assinatura</option></select></div>
                    <div><label className={labelClass}>Valor principal</label><input type="number" step="0.01" className={inputClass} value={priceSetup} onChange={(e) => setPriceSetup(Number(e.target.value))} /></div>
                    {paymentType !== 'Único' && <div><label className={labelClass}>Valor recorrente</label><input type="number" step="0.01" className={inputClass} value={priceMonthly} onChange={(e) => setPriceMonthly(Number(e.target.value))} /></div>}
                    {paymentType !== 'Único' && <div><label className={labelClass}>Período</label><select className={inputClass} value={billingCycle} onChange={(e) => setBillingCycle(e.target.value as any)}><option value="WEEKLY">Semanal</option><option value="BIWEEKLY">Quinzenal</option><option value="MONTHLY">Mensal</option><option value="BIMONTHLY">Bimestral</option><option value="QUARTERLY">Trimestral</option><option value="SEMIANNUALLY">Semestral</option><option value="YEARLY">Anual</option></select></div>}
                  </div>
                </Section>
                <Section>
                  <h3 className="text-lg font-black">Métodos de pagamento</h3>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                    {([['PIX','PIX'],['CARD','Cartão'],['BOLETO','Boleto']] as const).map(([value,label]) => {
                      const recurringBlocked = paymentType !== 'Único' && (value === 'PIX' || value === 'BOLETO');
                      return (
                        <button
                          key={value}
                          type="button"
                          disabled={recurringBlocked}
                          onClick={() => togglePaymentMethod(value)}
                          className={`rounded-xl border p-4 text-left text-xs font-bold transition ${recurringBlocked ? 'cursor-not-allowed border-white/5 bg-[#070b12] text-white/20' : paymentMethods.includes(value) ? 'border-[#D9F22A]/50 bg-[#D9F22A]/10 text-[#D9F22A]' : 'border-white/10 bg-[#070b12] text-white/60'}`}
                          title={recurringBlocked ? 'PIX e boleto não são usados neste fluxo de assinatura recorrente.' : undefined}
                        >
                          <CreditCard className="mb-3 h-5 w-5" />{label}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-3 text-[11px] leading-relaxed text-white/40">
                    Apple Pay e Google Pay ficam disponíveis pelo Cartão quando a Stripe, o navegador e o dispositivo do comprador oferecerem suporte.
                  </p>
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <div><label className={labelClass}>Método padrão</label><select className={inputClass} value={defaultPaymentMethod} onChange={(e) => setDefaultPaymentMethod(e.target.value as any)}>{paymentMethods.map((m) => <option key={m} value={m}>{m === 'CARD' ? 'Cartão' : m === 'PIX' ? 'Pix' : m === 'BOLETO' ? 'Boleto' : m}</option>)}</select></div>
                    {paymentMethods.includes('CARD') && (
                      <div><label className={labelClass}>Parcelamento máximo no cartão</label><select className={inputClass} value={maxInstallments} onChange={(e) => setMaxInstallments(Number(e.target.value))}>{Array.from({length:12},(_,i)=>i+1).map((n)=><option key={n} value={n}>{n}x</option>)}</select></div>
                    )}
                  </div>
                </Section>
              </div>
            )}

            {activeTab === 'settings' && (
              <Section>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><label className={labelClass}>E-mail de suporte</label><input type="email" className={inputClass} value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} /></div>
                  <div><label className={labelClass}>Garantia</label><select className={inputClass} value={warrantyDays} onChange={(e) => setWarrantyDays(Number(e.target.value))}><option value={0}>Sem garantia configurada</option><option value={7}>7 dias</option><option value={15}>15 dias</option><option value={30}>30 dias</option></select></div>
                  <div>
                    <label className={labelClass}>Tipo de entrega</label>
                    <select className={inputClass} value={deliveryType} onChange={(e) => setDeliveryType(e.target.value as ProductDeliveryType)}>
                      <option value="redirect">Redirecionamento</option>
                      <option value="whatsapp">WhatsApp / Grupo VIP</option>
                      <option value="membership">Área de membros</option>
                      <option value="download">Download / material digital</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>URL de entrega / página pós-compra</label>
                    <input disabled={deliveryLoading} className={`${inputClass} disabled:cursor-wait disabled:opacity-60`} value={thankYouPageUrl} onChange={(e) => setThankYouPageUrl(e.target.value)} placeholder={deliveryLoading ? 'Carregando configuração privada...' : 'https://suaempresa.com/acesso'} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Instruções para o comprador</label>
                    <textarea className={`${inputClass} min-h-28 resize-y`} value={deliveryInstructions} onChange={(e) => setDeliveryInstructions(e.target.value)} placeholder="Ex.: use o mesmo e-mail da compra para acessar..." />
                  </div>
                </div>
              </Section>
            )}

            {activeTab === 'offers' && (
              <Section>
                <div className="flex items-center justify-between"><div><h3 className="text-lg font-black">Oferta principal</h3><p className="text-xs text-white/50">Preço e comissão usados no checkout principal.</p></div><CircleDollarSign className="h-6 w-6 text-[#D9F22A]" /></div>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div><label className={labelClass}>Preço</label><input type="number" step="0.01" className={inputClass} value={priceSetup} onChange={(e) => setPriceSetup(Number(e.target.value))} /></div>
                  <div><label className={labelClass}>Comissão de afiliado (%)</label><input type="number" min="0" max="100" className={inputClass} value={commissionPercentage} onChange={(e) => setCommissionPercentage(Number(e.target.value))} /></div>
                </div>
              </Section>
            )}

            {activeTab === 'order_bump' && !activeTabLocked && (
              <div className="space-y-4">
                <Section>
                  <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-lg font-black">Order Bump</h3><p className="text-xs text-white/50">Oferta complementar antes da conclusão da compra.</p></div><button onClick={() => setOrderBumps([...orderBumps,{id:`bump-${Date.now()}`,name:'Novo Order Bump',description:'Oferta complementar',price:19.9,active:true}])} className="rounded-xl bg-[#D9F22A] px-3 py-2 text-xs font-black text-black"><Plus className="mr-1 inline h-3.5 w-3.5"/>Adicionar</button></div>
                </Section>
                {orderBumps.map((item, index) => <Section key={item.id}><div className="grid gap-3 sm:grid-cols-[1fr_160px_auto]"><div className="space-y-2"><input className={inputClass} value={item.name} onChange={(e)=>setOrderBumps(orderBumps.map((b,i)=>i===index?{...b,name:e.target.value}:b))}/><input className={inputClass} value={item.description} onChange={(e)=>setOrderBumps(orderBumps.map((b,i)=>i===index?{...b,description:e.target.value}:b))} placeholder="Descrição curta da oferta complementar" /></div><div className="space-y-2"><input type="number" min="0.5" step="0.01" className={inputClass} value={item.price} onChange={(e)=>setOrderBumps(orderBumps.map((b,i)=>i===index?{...b,price:Number(e.target.value)}:b))}/><div className="flex items-center justify-between rounded-xl border border-white/10 bg-[#070b12] px-3 py-2 text-xs"><span>Ativo no checkout</span><Toggle value={item.active} onChange={(value)=>setOrderBumps(orderBumps.map((b,i)=>i===index?{...b,active:value}:b))}/></div></div><button type="button" onClick={()=>setOrderBumps(orderBumps.filter((_,i)=>i!==index))} className="self-start rounded-xl border border-rose-500/20 p-2 text-rose-400"><Trash2 className="h-4 w-4"/></button></div></Section>)}
              </div>
            )}

            {activeTab === 'coupons' && !activeTabLocked && (
              <div className="space-y-4">
                <Section><div className="flex items-center justify-between"><div><h3 className="text-lg font-black">Cupons</h3><p className="text-xs text-white/50">Descontos para campanhas e afiliados.</p></div><button onClick={()=>setCoupons([...coupons,{id:`coupon-${Date.now()}`,code:'NOVO10',discountType:'percentage',discountValue:10,active:true,usedCount:0}])} className="rounded-xl bg-[#D9F22A] px-3 py-2 text-xs font-black text-black">Adicionar Cupom</button></div></Section>
                {coupons.length === 0 ? <Section><div className="py-10 text-center text-sm text-white/45">Nenhum cupom cadastrado.</div></Section> : coupons.map((coupon,index)=><Section key={coupon.id}><div className="grid gap-3 lg:grid-cols-[1fr_160px_120px_120px_160px_auto]"><div><label className={labelClass}>Código</label><input className={inputClass} value={coupon.code} onChange={(e)=>setCoupons(coupons.map((c,i)=>i===index?{...c,code:e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g,'')}:c))}/></div><div><label className={labelClass}>Tipo</label><select className={inputClass} value={coupon.discountType} onChange={(e)=>setCoupons(coupons.map((c,i)=>i===index?{...c,discountType:e.target.value as any}:c))}><option value="percentage">Porcentagem</option><option value="fixed">Valor fixo</option></select></div><div><label className={labelClass}>Desconto</label><input type="number" min="0.01" className={inputClass} value={coupon.discountValue} onChange={(e)=>setCoupons(coupons.map((c,i)=>i===index?{...c,discountValue:Number(e.target.value)}:c))}/></div><div><label className={labelClass}>Limite</label><input type="number" min="0" className={inputClass} value={coupon.maxUses || 0} onChange={(e)=>setCoupons(coupons.map((c,i)=>i===index?{...c,maxUses:Number(e.target.value)}:c))} title="0 = ilimitado" /></div><div><label className={labelClass}>Validade</label><input type="date" className={inputClass} value={(coupon.expiresAt || '').slice(0,10)} onChange={(e)=>setCoupons(coupons.map((c,i)=>i===index?{...c,expiresAt:e.target.value}:c))}/></div><div className="flex items-end gap-2"><Toggle value={coupon.active} onChange={(value)=>setCoupons(coupons.map((c,i)=>i===index?{...c,active:value}:c))}/><button type="button" onClick={()=>setCoupons(coupons.filter((_,i)=>i!==index))} className="rounded-xl border border-rose-500/20 p-2 text-rose-400"><Trash2 className="h-4 w-4"/></button></div></div></Section>)}
              </div>
            )}

            {activeTab === 'upsell' && !activeTabLocked && (
              <div className="space-y-5">
                <Section>
                  <h3 className="text-lg font-black">Upsell e página de obrigado</h3>
                  <div className="mt-5 space-y-4 text-sm">
                    <div className="flex items-center justify-between gap-4"><span>Este produto tem página de obrigado personalizada ou upsell</span><Toggle value={thankYouUpsellEnabled} onChange={setThankYouUpsellEnabled}/></div>
                    <div><label className={labelClass}>Página pós-compra</label><input className={inputClass} value={thankYouPageUrl} onChange={(e)=>setThankYouPageUrl(e.target.value)} placeholder="https://..." /></div>
                    <div className="flex items-center justify-between gap-4"><span>Redirecionar mesmo se houver falha no order bump</span><Toggle value={upsellIgnoreOrderBumpFailure} onChange={setUpsellIgnoreOrderBumpFailure}/></div>
                    <div className="flex items-center justify-between gap-4"><span>Enviar e-mail de confirmação</span><Toggle value={confirmationEmailEnabled} onChange={setConfirmationEmailEnabled}/></div>
                    {confirmationEmailEnabled && <select className={inputClass} value={confirmationEmailTiming} onChange={(e)=>setConfirmationEmailTiming(e.target.value as any)}><option value="immediate">Imediatamente após o pagamento</option><option value="after_upsell">Após concluir ofertas de upsell</option></select>}
                  </div>
                </Section>
                <Section>
                  <div className="flex items-center justify-between"><h3 className="text-base font-black">Ofertas de upsell</h3><button onClick={()=>setUpsells([...upsells,{id:`upsell-${Date.now()}`,name:'Novo Upsell',description:'Oferta pós-compra',price:49.9,active:true}])} className="rounded-xl bg-[#D9F22A] px-3 py-2 text-xs font-black text-black">Adicionar</button></div>
                  <div className="mt-4 space-y-3">{upsells.map((u,index)=><div key={u.id} className="grid gap-3 rounded-xl border border-white/10 bg-[#070b12] p-3 sm:grid-cols-[1fr_150px_auto]"><input className={inputClass} value={u.name} onChange={(e)=>setUpsells(upsells.map((x,i)=>i===index?{...x,name:e.target.value}:x))}/><input type="number" step="0.01" className={inputClass} value={u.price} onChange={(e)=>setUpsells(upsells.map((x,i)=>i===index?{...x,price:Number(e.target.value)}:x))}/><button onClick={()=>setUpsells(upsells.filter((_,i)=>i!==index))} className="text-rose-400"><Trash2 className="h-4 w-4"/></button></div>)}</div>
                </Section>
              </div>
            )}

            {activeTab === 'pixel' && !activeTabLocked && (
              <Section>
                <h3 className="text-lg font-black">Rastreamento e conversões</h3>
                <p className="mt-1 text-xs text-white/50">Configure o pixel usado pela empresa para medir compras.</p>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div><label className={labelClass}>Provedor</label><select className={inputClass} value={pixelProvider} onChange={(e)=>setPixelProvider(e.target.value as any)}><option value="none">Nenhum</option><option value="meta">Meta Pixel</option><option value="google">Google Ads / Analytics</option><option value="tiktok">TikTok Pixel</option></select></div>
                  <div><label className={labelClass}>ID do Pixel</label><input className={inputClass} value={pixelId} onChange={(e)=>setPixelId(e.target.value)} placeholder="Ex: 123456789" /></div>
                </div>
                <div className="mt-5 flex items-center justify-between rounded-xl border border-white/10 bg-[#070b12] p-4 text-sm"><span>Disparar evento de compra aprovada</span><Toggle value={pixelPurchaseEventEnabled} onChange={setPixelPurchaseEventEnabled}/></div>
              </Section>
            )}

            {activeTab === 'affiliates' && (
              <div className="space-y-5">
                <Section>
                  <div className="space-y-4 text-sm">
                    <div className="flex items-center justify-between"><span>Habilitar programa de afiliados</span><Toggle value={allowAffiliates} onChange={setAllowAffiliates}/></div>
                    <div className="flex items-center justify-between"><span>Mostrar produto no marketplace público</span><Toggle value={affiliateMarketplaceVisible} onChange={setAffiliateMarketplaceVisible}/></div>
                    <div><label className={labelClass}>Aprovação</label><select className={inputClass} value={affiliateApprovalMode} onChange={(e)=>setAffiliateApprovalMode(e.target.value as any)}><option value="automatic">Aprovação automática</option><option value="manual">Aprovar cada solicitação manualmente</option></select></div>
                    <div className="grid gap-4 sm:grid-cols-2"><div><label className={labelClass}>Comissão (%)</label><input type="number" className={inputClass} value={commissionPercentage} onChange={(e)=>setCommissionPercentage(Number(e.target.value))}/></div><div><label className={labelClass}>Cookie de atribuição</label><select className={inputClass} value={affiliateCookieDays} onChange={(e)=>setAffiliateCookieDays(Number(e.target.value))}><option value={7}>7 dias</option><option value={15}>15 dias</option><option value={30}>30 dias</option><option value={60}>60 dias</option><option value={90}>90 dias</option></select></div></div>
                    <div><label className={labelClass}>Atribuição</label><select className={inputClass} value={affiliateAttribution} onChange={(e)=>setAffiliateAttribution(e.target.value as any)}><option value="last_click">Último clique</option><option value="first_click">Primeiro clique</option></select></div>
                    <div><label className={labelClass}>E-mail de suporte para afiliados</label><input type="email" className={inputClass} value={affiliateSupportEmail} onChange={(e)=>setAffiliateSupportEmail(e.target.value)}/></div>
                    <div><label className={labelClass}>Descrição para afiliados</label><textarea className={`${inputClass} min-h-28`} value={affiliateDescription} onChange={(e)=>setAffiliateDescription(e.target.value)} /></div>
                    <div className="flex items-center justify-between"><span>Comissão em Order Bump</span><Toggle value={affiliateCommissionOnOrderBump} onChange={setAffiliateCommissionOnOrderBump}/></div>
                    <div className="flex items-center justify-between"><span>Comissão em Upsell</span><Toggle value={affiliateCommissionOnUpsell} onChange={setAffiliateCommissionOnUpsell}/></div>
                  </div>
                </Section>
                <Section><h3 className="text-base font-black">Convidar afiliados</h3><div className="mt-3 flex gap-2"><input readOnly className={inputClass} value={inviteUrl}/><button onClick={()=>copy(inviteUrl,'invite')} className="rounded-xl bg-[#D9F22A] px-4 text-xs font-black text-black">{copied==='invite'?'Copiado':'Copiar'}</button></div></Section>
              </div>
            )}

            {activeTab === 'coproduction' && !activeTabLocked && (
              <div className="space-y-4">
                <Section><div className="flex items-center justify-between"><div><h3 className="text-lg font-black">Coprodução</h3><p className="text-xs text-white/50">Cadastre parceiros e percentuais. O repasse financeiro só fica ativo depois que o coprodutor aceitar o vínculo e tiver Stripe Connect validada.</p></div><button onClick={()=>setCoproducers([...coproducers,{id:`cop-${Date.now()}`,name:'Novo Coprodutor',email:'',commissionPercentage:10,status:'pending',createdAt:new Date().toISOString()}])} className="rounded-xl bg-[#D9F22A] px-3 py-2 text-xs font-black text-black">Convidar Coprodutor</button></div></Section>
                {coproducers.length===0?<Section><div className="py-10 text-center text-sm text-white/45">Nenhum coprodutor cadastrado.</div></Section>:coproducers.map((c,index)=><Section key={c.id}><div className="grid gap-3 sm:grid-cols-[1fr_1fr_130px_auto]"><input className={inputClass} value={c.name} onChange={(e)=>setCoproducers(coproducers.map((x,i)=>i===index?{...x,name:e.target.value}:x))}/><input type="email" className={inputClass} value={c.email} onChange={(e)=>setCoproducers(coproducers.map((x,i)=>i===index?{...x,email:e.target.value}:x))}/><div className="relative"><input type="number" className={inputClass} value={c.commissionPercentage} onChange={(e)=>setCoproducers(coproducers.map((x,i)=>i===index?{...x,commissionPercentage:Number(e.target.value)}:x))}/><Percent className="absolute right-3 top-3 h-4 w-4 text-white/35"/></div><button onClick={()=>setCoproducers(coproducers.filter((_,i)=>i!==index))} className="text-rose-400"><Trash2 className="h-4 w-4"/></button></div></Section>)}
              </div>
            )}

            {activeTab === 'checkout' && (
              <div className="space-y-4">
                <Section><div className="flex flex-wrap items-center justify-between gap-3"><div className="relative w-full sm:w-72"><Search className="absolute left-3 top-3 h-4 w-4 text-white/35"/><input value={search} onChange={(e)=>setSearch(e.target.value)} className={`${inputClass} pl-9`} placeholder="Pesquisar checkout..." /></div><button onClick={()=>setCheckouts([...checkouts,{id:`checkout-${Date.now()}`,name:'Novo Checkout',isDefault:false,price:priceSetup,offerName:name,visitsCount:0,salesCount:0,checkoutSlug:`${plan.id}-${Date.now().toString().slice(-4)}`,buttonText:'Continuar para pagamento',timerMinutes:0,bannerImage:''}])} className="rounded-xl bg-[#D9F22A] px-3 py-2 text-xs font-black text-black"><Plus className="mr-1 inline h-3.5 w-3.5"/>Adicionar Checkout</button></div></Section>
                <div className="space-y-3">{filteredCheckouts.map((checkout) => { const index = checkouts.findIndex((item)=>item.id===checkout.id); return <Section key={checkout.id}><div className="grid gap-3 lg:grid-cols-[1.1fr_150px_1fr_auto]"><div><label className={labelClass}>Nome do checkout</label><input className={inputClass} value={checkout.name} onChange={(e)=>setCheckouts(checkouts.map((item,i)=>i===index?{...item,name:e.target.value}:item))}/></div><div><label className={labelClass}>Preço</label><input type="number" min="0.5" step="0.01" disabled={checkout.isDefault} className={inputClass} value={checkout.isDefault ? priceSetup : checkout.price} onChange={(e)=>setCheckouts(checkouts.map((item,i)=>i===index?{...item,price:Number(e.target.value)}:item))}/></div><div><label className={labelClass}>Título da oferta</label><input className={inputClass} value={checkout.offerName} onChange={(e)=>setCheckouts(checkouts.map((item,i)=>i===index?{...item,offerName:e.target.value}:item))}/></div><div className="flex items-end gap-2"><button type="button" onClick={()=>window.open(customCheckoutUrl(checkout),'_blank','noopener,noreferrer')} className="rounded-lg border border-white/10 p-2" title="Abrir checkout"><Eye className="h-4 w-4"/></button><button type="button" onClick={()=>copy(customCheckoutUrl(checkout),checkout.id)} className="rounded-lg border border-white/10 p-2" title="Copiar link">{copied===checkout.id?<Check className="h-4 w-4"/>:<Copy className="h-4 w-4"/>}</button>{!checkout.isDefault&&<button type="button" onClick={()=>setCheckouts(checkouts.filter((item)=>item.id!==checkout.id))} className="rounded-lg border border-rose-500/20 p-2 text-rose-400"><Trash2 className="h-4 w-4"/></button>}</div></div><div className="mt-3 grid gap-3 lg:grid-cols-[1.2fr_1fr_150px]"><div><label className={labelClass}>Imagem exclusiva (URL)</label><input className={inputClass} value={checkout.bannerImage || ''} onChange={(e)=>setCheckouts(checkouts.map((item,i)=>i===index?{...item,bannerImage:e.target.value}:item))} placeholder="https://..."/></div><div><label className={labelClass}>Texto do botão</label><input className={inputClass} value={checkout.buttonText || 'Continuar para pagamento'} onChange={(e)=>setCheckouts(checkouts.map((item,i)=>i===index?{...item,buttonText:e.target.value}:item))}/></div><div><label className={labelClass}>Contador (min)</label><input type="number" min="0" max="1440" className={inputClass} value={checkout.timerMinutes || 0} onChange={(e)=>setCheckouts(checkouts.map((item,i)=>i===index?{...item,timerMinutes:Number(e.target.value)}:item))}/></div></div><div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/5 bg-[#070b12] px-3 py-2 text-[10px] text-white/45"><span className="break-all">{customCheckoutUrl(checkout)}</span><span>{checkout.salesCount || 0} vendas • {checkout.visitsCount || 0} visitas registradas</span></div></Section>})}</div>
              </div>
            )}

            {activeTab === 'links' && (
              <div className="space-y-4">
                <Section><h3 className="text-lg font-black">Links de checkout</h3><p className="mt-1 text-xs text-white/50">Use estes links em páginas externas, anúncios e campanhas.</p></Section>
                <Section><label className={labelClass}>Checkout principal</label><div className="flex gap-2"><input readOnly className={inputClass} value={checkoutUrl}/><button onClick={()=>copy(checkoutUrl,'checkout')} className="rounded-xl bg-[#D9F22A] px-4 text-xs font-black text-black">{copied==='checkout'?<Check className="h-4 w-4"/>:<Copy className="h-4 w-4"/>}</button></div></Section>
                {checkouts.map((c)=><Section key={c.id}><div className="flex items-center justify-between gap-4"><div><p className="text-sm font-black">{c.name}</p><p className="mt-1 break-all text-[11px] text-white/40">{customCheckoutUrl(c)}</p></div><button type="button" onClick={()=>copy(customCheckoutUrl(c),c.id)} className="rounded-xl border border-white/10 p-2 text-white/60 hover:text-white">{copied===c.id?<Check className="h-4 w-4"/>:<Copy className="h-4 w-4"/>}</button></div></Section>)}
              </div>
            )}

            <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5">
              <button onClick={()=>onDelete(plan.id,plan.companyId)} className="flex items-center gap-2 rounded-xl border border-rose-500/25 px-4 py-2.5 text-xs font-bold text-rose-400 hover:bg-rose-500/10"><Trash2 className="h-4 w-4"/>Excluir Produto</button>
              <div className="ml-auto flex items-center gap-3">{saveError && <span className="max-w-sm text-right text-[11px] font-semibold text-rose-400">{saveError}</span>}{!saveError && savedAt && <span className="text-[11px] text-emerald-400">Salvo às {savedAt}</span>}<button type="button" disabled={isSaving} onClick={saveAll} className="flex items-center gap-2 rounded-xl bg-[#D9F22A] px-5 py-2.5 text-xs font-black uppercase text-[#060A15] disabled:cursor-not-allowed disabled:opacity-60"><Save className="h-4 w-4"/>{isSaving ? 'Salvando...' : 'Salvar Produto'}</button></div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
