import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Barcode,
  CheckCircle2,
  CreditCard,
  FileText,
  LockKeyhole,
  QrCode,
} from 'lucide-react';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { CompanyPlan } from '../../types/platform';
import { handleAffiliateTracking, getActiveAffiliateRef } from '../../utils/affiliateTracking';

interface CustomCheckoutPageProps {
  plan: CompanyPlan;
  checkoutSlug?: string;
  affiliateRef?: string;
  onBack?: () => void;
  onPaymentSuccess?: (tx?: any) => void;
}

export const PLATFORM_CHECKOUT_FEE = 0.99;

const stripePublishableKey = (
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ||
  (import.meta.env as any).NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
  ''
).trim();

const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;

const stripePaymentElementOptions = {
  layout: { type: 'accordion' as const, defaultCollapsed: false },
  business: { name: 'LeadsPay' },
};

const cx = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ');

const createAttemptId = () => {
  const nativeId = window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID() : '';
  if (nativeId) return nativeId.replace(/-/g, '');
  return (
    String(Date.now()) +
    Math.random().toString(36).slice(2) +
    Math.random().toString(36).slice(2)
  );
};

const formatBRL = (value: number) =>
  value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  });

const readTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'dark';

  try {
    const platform = window.localStorage.getItem('leadspay-platform-theme');
    if (platform === 'light' || platform === 'dark') return platform;

    const landing = window.localStorage.getItem('leadspay-landing-theme');
    if (landing === 'light' || landing === 'dark') return landing;

    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    }
  } catch {
    return 'dark';
  }

  return 'dark';
};

export const CustomCheckoutPage: React.FC<CustomCheckoutPageProps> = ({
  plan,
  affiliateRef,
  onBack,
}) => {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => readTheme());
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [couponCode, setCouponCode] = useState(() => {
    try {
      return (new URLSearchParams(window.location.search).get('coupon') || '').toUpperCase();
    } catch {
      return '';
    }
  });
  const [selectedOrderBumpId, setSelectedOrderBumpId] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [clientSecret, setClientSecret] = useState('');
  const [orderId, setOrderId] = useState('');
  const [offerCountdownSeconds, setOfferCountdownSeconds] = useState(0);
  const [serverPricing, setServerPricing] = useState<{
    originalProductAmountCents?: number;
    discountCents?: number;
    productAmountCents?: number;
    orderBumpAmountCents?: number;
    orderBumpName?: string | null;
    soldItemCount?: number;
    checkoutFeePerItemCents?: number;
    checkoutFeeCents?: number;
    totalCents?: number;
    couponCode?: string | null;
    checkoutVariant?: string | null;
  } | null>(null);
  const stripeAttemptId = useRef('');

  const isDark = theme === 'dark';
  const currentStep = clientSecret ? 2 : 1;

  const isRecurring =
    plan.billingType === 'recorrente' ||
    plan.paymentType === 'Recorrente' ||
    plan.paymentType === 'Assinatura';

  const billingCycle = plan.billingCycle || 'MONTHLY';
  const billingCycleLabel =
    billingCycle === 'WEEKLY'
      ? 'semana'
      : billingCycle === 'BIWEEKLY'
        ? '2 semanas'
        : billingCycle === 'BIMONTHLY'
          ? '2 meses'
          : billingCycle === 'QUARTERLY'
            ? '3 meses'
            : billingCycle === 'SEMIANNUALLY'
              ? '6 meses'
              : billingCycle === 'YEARLY'
                ? 'ano'
                : 'mês';

  const checkoutVariant = useMemo(() => {
    try {
      return (new URLSearchParams(window.location.search).get('variant') || '').trim().toLowerCase();
    } catch {
      return '';
    }
  }, []);

  const selectedCheckout = useMemo(() => {
    const checkouts = Array.isArray(plan.customCheckouts) ? plan.customCheckouts : [];
    if (isRecurring) return checkouts.find((item) => item.isDefault) || null;
    return (
      (checkoutVariant
        ? checkouts.find((item) => String(item.checkoutSlug || '').toLowerCase() === checkoutVariant)
        : null) ||
      checkouts.find((item) => item.isDefault) ||
      null
    );
  }, [plan.customCheckouts, checkoutVariant, isRecurring]);

  useEffect(() => {
    if (!selectedCheckout) return;
    const variantKey = selectedCheckout.checkoutSlug || 'default';
    const storageKey = `leadspay_checkout_view_${plan.id}_${variantKey}`;
    try {
      if (sessionStorage.getItem(storageKey) === '1') return;
      sessionStorage.setItem(storageKey, '1');
    } catch {}

    void fetch('/api/public/checkout-view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        planId: plan.id,
        variant: selectedCheckout.isDefault ? '' : selectedCheckout.checkoutSlug,
      }),
      keepalive: true,
    }).catch(() => undefined);
  }, [plan.id, selectedCheckout?.id, selectedCheckout?.checkoutSlug, selectedCheckout?.isDefault]);

  useEffect(() => {
    const minutes = Math.max(0, Number(selectedCheckout?.timerMinutes || 0));
    if (!selectedCheckout || minutes <= 0) {
      setOfferCountdownSeconds(0);
      return;
    }

    const key = `leadspay_checkout_deadline_${plan.id}_${selectedCheckout.checkoutSlug || 'default'}`;
    let deadline = 0;
    try {
      deadline = Number(sessionStorage.getItem(key) || 0);
      if (!deadline || deadline <= Date.now()) {
        deadline = Date.now() + Math.floor(minutes * 60 * 1000);
        sessionStorage.setItem(key, String(deadline));
      }
    } catch {
      deadline = Date.now() + Math.floor(minutes * 60 * 1000);
    }

    const refresh = () => {
      setOfferCountdownSeconds(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    };
    refresh();
    const timer = window.setInterval(refresh, 1000);
    return () => window.clearInterval(timer);
  }, [plan.id, selectedCheckout?.id, selectedCheckout?.checkoutSlug, selectedCheckout?.timerMinutes]);

  const configuredBasePrice = Number(
    (isRecurring ? plan.priceMonthly : plan.priceSetup) ??
      plan.priceSetup ??
      plan.price ??
      plan.priceMonthly ??
      0
  );
  const variantPrice = Number(selectedCheckout?.price || 0);
  const basePrice = !isRecurring && selectedCheckout && Number.isFinite(variantPrice) && variantPrice > 0
    ? variantPrice
    : configuredBasePrice;

  const activeOrderBumps = useMemo(
    () => isRecurring
      ? []
      : (Array.isArray(plan.orderBumps) ? plan.orderBumps.filter((item) => item.active !== false && Number(item.price || 0) > 0) : []),
    [isRecurring, plan.orderBumps]
  );
  const selectedOrderBump = activeOrderBumps.find((item) => item.id === selectedOrderBumpId) || null;
  const selectedOrderBumpAmount = Number(selectedOrderBump?.price || 0);
  const estimatedSoldItemCount = 1 + (selectedOrderBump ? 1 : 0);
  const estimatedCheckoutFee = PLATFORM_CHECKOUT_FEE * estimatedSoldItemCount;

  const estimatedTotal = Number((basePrice + selectedOrderBumpAmount + estimatedCheckoutFee).toFixed(2));
  const resolvedProductAmount = serverPricing?.productAmountCents !== undefined
    ? serverPricing.productAmountCents / 100
    : basePrice;
  const resolvedDiscount = Number(serverPricing?.discountCents || 0) / 100;
  const resolvedOrderBumpAmount = serverPricing?.orderBumpAmountCents !== undefined
    ? Number(serverPricing.orderBumpAmountCents || 0) / 100
    : selectedOrderBumpAmount;
  const resolvedSoldItemCount = serverPricing?.soldItemCount ?? estimatedSoldItemCount;
  const resolvedCheckoutFee = serverPricing?.checkoutFeeCents !== undefined
    ? Number(serverPricing.checkoutFeeCents || 0) / 100
    : estimatedCheckoutFee;
  const finalTotal = serverPricing?.totalCents !== undefined
    ? Number(serverPricing.totalCents || 0) / 100
    : estimatedTotal;

  const productImage =
    selectedCheckout?.bannerImage ||
    plan.bannerImage ||
    plan.companyLogo ||
    'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80';

  const productName = selectedCheckout?.offerName || plan.name;
  const sellerName = plan.companyName || 'LeadsPay Pagamentos';
  const description = (plan.tagline || plan.description || 'Clareza para dar o próximo passo.').trim();
  const featureLine =
    Array.isArray(plan.features) && plan.features.length > 0
      ? plan.features.slice(0, 2).join(' • ')
      : isRecurring
        ? 'Acesso recorrente • Renovação automática'
        : 'Compra segura • Liberação após aprovação';

  const allowedMethods = plan.paymentMethods && plan.paymentMethods.length
    ? plan.paymentMethods
    : ['PIX', 'CARD', 'BOLETO'];

  useEffect(() => {
    handleAffiliateTracking();
  }, []);

  useEffect(() => {
    const syncTheme = (event: Event) => {
      const detail = (event as CustomEvent<'light' | 'dark'>).detail;
      if (detail === 'light' || detail === 'dark') setTheme(detail);
    };

    const syncStorage = (event: StorageEvent) => {
      if (
        event.key === 'leadspay-platform-theme' ||
        event.key === 'leadspay-landing-theme'
      ) {
        setTheme(readTheme());
      }
    };

    window.addEventListener('leadspay-theme-change', syncTheme);
    window.addEventListener('storage', syncStorage);

    return () => {
      window.removeEventListener('leadspay-theme-change', syncTheme);
      window.removeEventListener('storage', syncStorage);
    };
  }, []);

  const stripeAppearance = useMemo(
    () => ({
      theme: isDark ? 'night' : 'stripe',
      variables: {
        colorPrimary: '#B8F128',
        colorBackground: isDark ? '#0d1828' : '#ffffff',
        colorText: isDark ? '#ffffff' : '#111827',
        colorDanger: '#ef4444',
        colorTextSecondary: isDark ? '#aab6c9' : '#667085',
        fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
        borderRadius: '14px',
      },
    }),
    [isDark]
  );

  const pageClass = isDark ? 'bg-[#06101b] text-white' : 'bg-[#fbfcf8] text-[#0b0f16]';
  const mutedClass = isDark ? 'text-[#c0c9d8]' : 'text-[#657087]';
  const subtleClass = isDark ? 'text-[#9aa8bc]' : 'text-[#7b8496]';
  const cardClass = isDark
    ? 'border-[#34495f] bg-[linear-gradient(180deg,rgba(14,31,50,0.96),rgba(10,24,40,0.98))] shadow-[0_22px_70px_rgba(0,0,0,0.24)]'
    : 'border-[#dfe3e8] bg-white/90 shadow-[0_18px_55px_rgba(15,23,42,0.06)]';
  const inputClass = isDark
    ? 'border-[#4b6077] bg-[#102239]/60 text-white placeholder:text-[#99a9bd] focus:border-[#B8F128] focus:ring-[#B8F128]/20'
    : 'border-[#d3d8e0] bg-white text-[#121722] placeholder:text-[#9aa3b4] focus:border-[#9fd91f] focus:ring-[#9fd91f]/20';
  const dividerClass = isDark ? 'border-[#3c5064]/70' : 'border-[#e3e6eb]';
  const badgeClass = isDark
    ? 'border-[#41566c] bg-[#0c1a2a]/65 text-white'
    : 'border-[#dfe3e8] bg-white text-[#111827]';
  const infoClass = isDark
    ? 'border-[#375426]/45 bg-[#1d321d]/75 text-white'
    : 'border-[#dfeebd] bg-[#effbd9] text-[#17200e]';
  const footerClass = isDark ? 'text-[#b2bdcd]' : 'text-[#768095]';

  const paymentElementOptions = useMemo(() => {
    const mappedDefault =
      plan.defaultPaymentMethod === 'PIX'
        ? 'pix'
        : plan.defaultPaymentMethod === 'BOLETO'
          ? 'boleto'
          : 'card';
    const order = [mappedDefault, 'pix', 'card', 'boleto'].filter(
      (value, index, values) => values.indexOf(value) === index
    );

    return {
      ...stripePaymentElementOptions,
      paymentMethodOrder: order,
      paymentMethodOptions: {
        card: {
          installments: {
            enabled: Number(plan.maxInstallments || 1) > 1,
          },
        },
      },
    } as any;
  }, [plan.defaultPaymentMethod, plan.maxInstallments]);

  const getActiveAffiliateCode = (): string | null => {
    if (affiliateRef && affiliateRef.trim()) return affiliateRef.trim();
    return getActiveAffiliateRef();
  };

  const handleProcessPayment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (!stripePromise) {
      setFormError('Chave pública Stripe não encontrada. Verifique as configurações.');
      return;
    }

    if (!Number.isFinite(basePrice) || basePrice <= 0) {
      setFormError('Esta oferta tem um preço inválido. Entre em contato com o vendedor.');
      return;
    }

    if (!fullName.trim() || fullName.trim().split(/\s+/).length < 2) {
      setFormError('Informe seu nome e sobrenome completos.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setFormError('Informe um e-mail válido para receber o acesso.');
      return;
    }

    setIsProcessing(true);

    try {
      if (!stripeAttemptId.current) stripeAttemptId.current = createAttemptId();

      const response = await fetch(
        isRecurring
          ? '/api/stripe/product-subscription-checkout'
          : '/api/stripe/checkout',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            planId: plan.id,
            attemptId: stripeAttemptId.current,
            buyerName: fullName.trim(),
            buyerEmail: email.trim(),
            affiliateCode: getActiveAffiliateCode() || affiliateRef || '',
            couponCode: isRecurring ? '' : couponCode.trim().toUpperCase(),
            checkoutVariant: isRecurring ? '' : checkoutVariant,
            orderBumpId: isRecurring ? '' : selectedOrderBumpId,
            utmSource: new URLSearchParams(window.location.search).get('utm_source') || '',
            utmMedium: new URLSearchParams(window.location.search).get('utm_medium') || '',
            utmCampaign: new URLSearchParams(window.location.search).get('utm_campaign') || '',
          }),
        }
      );

      const result = await response.json().catch(() => ({}));

      if (isRecurring && response.ok && result.checkoutUrl) {
        window.location.assign(String(result.checkoutUrl));
        return;
      }

      if (response.ok && result.paid === true && result.orderId) {
        const confirmation = new URL('/?thank-you=true', window.location.origin);
        confirmation.searchParams.set('plan', plan.id);
        confirmation.searchParams.set('order_id', String(result.orderId));
        window.location.assign(confirmation.toString());
        return;
      }

      if (!response.ok || (!isRecurring && (!result.clientSecret || !result.orderId))) {
        if (
          result.code === 'PAYMENT_ATTEMPT_CANCELED' ||
          result.code === 'CHECKOUT_SNAPSHOT_MISMATCH'
        ) {
          stripeAttemptId.current = '';
        }

        setFormError(
          result.error ||
            (response.status >= 500
              ? 'O servidor de pagamentos está reiniciando. Tente novamente em instantes.'
              : 'Não foi possível preparar o pagamento. Tente novamente.')
        );
        return;
      }

      setServerPricing(result.pricing || null);
      setClientSecret(String(result.clientSecret));
      setOrderId(String(result.orderId));
    } catch (error) {
      console.error('[Stripe Checkout]', error);
      setFormError('Falha de conexão com o checkout Stripe. Tente novamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  const returnUrl = useMemo(() => {
    const url = new URL('/?thank-you=true', window.location.origin);
    url.searchParams.set('plan', plan.id);
    if (orderId) url.searchParams.set('order_id', orderId);
    return url.toString();
  }, [plan.id, orderId]);

  const renderStep = (step: number, label: string) => {
    const active = currentStep === step;
    const completed = currentStep > step;

    return (
      <div className="flex min-w-[58px] flex-col items-center gap-1 sm:min-w-[82px] sm:gap-1.5">
        <div
          className={cx(
            'flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold transition-all sm:h-11 sm:w-11 sm:text-sm',
            active && 'border-[#B8F128] bg-[#B8F128] text-black shadow-[0_0_24px_rgba(184,241,40,0.18)]',
            completed && 'border-emerald-500 bg-emerald-500 text-white',
            !active && !completed && (isDark
              ? 'border-[#3b5064] bg-[#0b1827] text-white'
              : 'border-[#d7dce3] bg-white text-[#162033]')
          )}
        >
          {completed ? <CheckCircle2 className="h-5 w-5" /> : step}
        </div>
        <span className={cx('text-[9px] font-medium leading-none sm:text-xs sm:leading-normal', active ? (isDark ? 'text-white' : 'text-[#111827]') : mutedClass)}>
          {label}
        </span>
      </div>
    );
  };

  const renderPaymentBadge = (
    label: string,
    icon: React.ReactNode,
    key: 'PIX' | 'CARD' | 'BOLETO'
  ) => {
    if (!allowedMethods.includes(key as any)) return null;

    return (
      <div key={key} className={cx('inline-flex min-w-0 items-center justify-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-medium sm:justify-start sm:gap-2 sm:rounded-xl sm:px-4 sm:text-sm', badgeClass)}>
        {icon}
        <span>{label}</span>
      </div>
    );
  };

  return (
    <main className={cx('relative min-h-screen overflow-hidden px-3 py-3 font-sans selection:bg-[#B8F128] selection:text-black sm:px-6 sm:py-7', pageClass)}>
      <div
        className={cx(
          'pointer-events-none absolute inset-0',
          isDark
            ? 'bg-[radial-gradient(circle_at_8%_55%,rgba(119,177,16,0.13),transparent_26%),radial-gradient(circle_at_91%_20%,rgba(58,123,22,0.19),transparent_24%),radial-gradient(circle_at_90%_90%,rgba(104,173,28,0.12),transparent_24%)]'
            : 'bg-[radial-gradient(circle_at_8%_55%,rgba(184,241,40,0.12),transparent_28%),radial-gradient(circle_at_92%_20%,rgba(184,241,40,0.10),transparent_25%),radial-gradient(circle_at_90%_88%,rgba(184,241,40,0.09),transparent_24%)]'
        )}
      />

      <div className="pointer-events-none absolute -left-56 top-12 hidden h-[470px] w-[470px] rounded-full border border-[#9bd71d]/45 sm:block sm:-left-44" />
      <div className="pointer-events-none absolute -left-64 top-[240px] hidden h-[540px] w-[540px] rounded-full border border-[#9bd71d]/35 sm:block sm:-left-52" />
      <div className="pointer-events-none absolute -right-72 top-[-120px] hidden h-[520px] w-[520px] rounded-full border border-[#9bd71d]/45 sm:block sm:-right-52" />
      <div className="pointer-events-none absolute -right-72 bottom-[-200px] hidden h-[560px] w-[560px] rounded-full border border-[#9bd71d]/35 sm:block sm:-right-48" />

      {productImage && (
        <>
          <img
            src={productImage}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-20 -left-20 hidden h-48 w-48 rounded-full object-cover opacity-25 blur-[18px] sm:block sm:h-64 sm:w-64"
          />
          <img
            src={productImage}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute -right-20 top-12 hidden h-44 w-44 rounded-full object-cover opacity-20 blur-[14px] sm:block sm:h-60 sm:w-60"
          />
        </>
      )}

      <div className="relative z-10 mx-auto max-w-[1180px]">
        <header className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-4 sm:gap-5 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            {onBack ? (
              <button
                type="button"
                onClick={onBack}
                aria-label="Voltar"
                className={cx(
                  'inline-flex h-8 w-8 items-center justify-center rounded-full transition sm:h-10 sm:w-10',
                  isDark ? 'text-white hover:bg-white/5' : 'text-[#182033] hover:bg-black/5'
                )}
              >
                <ArrowLeft className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
            ) : (
              <span className="h-8 w-8 sm:h-10 sm:w-10" />
            )}

            <div className="truncate text-[24px] font-black tracking-[-0.045em] sm:text-[34px]">
              <span className={isDark ? 'text-white' : 'text-[#0b0f16]'}>Leads</span>
              <span className="text-[#9FDF19]">Pay</span>
            </div>
          </div>

          <div className="col-span-2 row-start-2 flex items-start justify-center gap-1 sm:gap-4 lg:col-span-1 lg:row-start-auto">
            {renderStep(1, 'Seus dados')}
            <div className={cx('mt-4 h-px w-7 sm:mt-5 sm:w-24', isDark ? 'bg-[#33495d]' : 'bg-[#dce1e7]')} />
            {renderStep(2, 'Pagamento')}
            <div className={cx('mt-5 h-px w-12 sm:w-24', isDark ? 'bg-[#33495d]' : 'bg-[#dce1e7]')} />
            {renderStep(3, 'Confirmação')}
          </div>

          <div className={cx('flex items-center justify-end gap-1.5 text-xs font-medium sm:gap-2 sm:text-sm', mutedClass)}>
            <LockKeyhole className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="hidden sm:inline">Checkout seguro</span>
          </div>
        </header>

        <div className="mb-5 mt-5 text-center sm:mb-9 sm:mt-10">
          <h1 className="mx-auto max-w-[360px] text-[26px] font-black leading-[1.08] tracking-[-0.04em] sm:max-w-none sm:text-[42px] sm:leading-normal lg:text-[48px]">
            {currentStep === 1 ? 'Falta pouco para concluir sua compra' : 'Escolha como deseja pagar'}
          </h1>
          <p className={cx('mx-auto mt-2 max-w-[340px] text-[13px] leading-relaxed sm:max-w-3xl sm:text-[20px]', mutedClass)}>
            {currentStep === 1
              ? 'Confira seu pedido e preencha seus dados para continuar.'
              : 'Selecione uma forma de pagamento segura para finalizar sua compra.'}
          </p>
        </div>

        {offerCountdownSeconds > 0 && (
          <div className="mx-auto mb-3 flex w-fit items-center gap-2 rounded-full border border-[#B8F128]/30 bg-[#B8F128]/10 px-3 py-1.5 text-[11px] font-bold text-[#B8F128] sm:mb-5 sm:px-4 sm:py-2 sm:text-xs">
            <span>Condição deste checkout reservada por</span>
            <span className="font-black tabular-nums">
              {String(Math.floor(offerCountdownSeconds / 60)).padStart(2, '0')}:{String(offerCountdownSeconds % 60).padStart(2, '0')}
            </span>
          </div>
        )}

        <div className="grid gap-3 sm:gap-5 lg:grid-cols-[minmax(0,1.78fr)_minmax(330px,1fr)] lg:items-start">
          <section className={cx('rounded-2xl border p-4 backdrop-blur-xl sm:rounded-[22px] sm:p-7', cardClass)}>
            <div className="mb-4 sm:mb-5">
              <span className={cx('text-[11px] font-bold uppercase tracking-[0.06em]', mutedClass)}>
                Sua compra
              </span>

              <div className="mt-3 flex items-center gap-3 sm:mt-4 sm:gap-4">
                <img
                  src={productImage}
                  alt={productName}
                  className="h-[58px] w-[66px] shrink-0 rounded-lg border border-white/5 object-cover sm:h-[82px] sm:w-[102px] sm:rounded-xl"
                />
                <div className="min-w-0">
                  <h2 className="truncate text-[17px] font-black tracking-[-0.02em] sm:text-[27px]">
                    {productName}
                  </h2>
                  <p className={cx('mt-0.5 truncate text-xs sm:mt-1 sm:text-base', mutedClass)}>
                    Vendido por {sellerName}
                  </p>
                </div>
              </div>
            </div>

            <div className={cx('border-t', dividerClass)} />

            {!clientSecret ? (
              <form onSubmit={handleProcessPayment} className="pt-4 sm:pt-5">
                <h3 className="text-[21px] font-black tracking-[-0.025em] sm:text-[28px]">
                  Seus dados
                </h3>
                <p className={cx('mt-1 text-[13px] leading-relaxed sm:text-base', mutedClass)}>
                  Enviaremos a confirmação da compra para este e-mail.
                </p>

                <div className="mt-4 space-y-3 sm:mt-5 sm:space-y-4">
                  <div>
                    <label htmlFor="checkout-full-name" className="mb-2 block text-sm font-medium">
                      Nome completo
                    </label>
                    <input
                      id="checkout-full-name"
                      type="text"
                      autoComplete="name"
                      required
                      maxLength={120}
                      placeholder="Digite seu nome completo"
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      className={cx('min-h-[48px] w-full rounded-xl border px-3.5 text-sm outline-none transition focus:ring-2 sm:min-h-[52px] sm:px-4 sm:text-base', inputClass)}
                    />
                  </div>

                  <div>
                    <label htmlFor="checkout-email" className="mb-2 block text-sm font-medium">
                      E-mail
                    </label>
                    <input
                      id="checkout-email"
                      type="email"
                      autoComplete="email"
                      inputMode="email"
                      required
                      maxLength={200}
                      placeholder="voce@exemplo.com"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className={cx('min-h-[48px] w-full rounded-xl border px-3.5 text-sm outline-none transition focus:ring-2 sm:min-h-[52px] sm:px-4 sm:text-base', inputClass)}
                    />
                  </div>

                  {!isRecurring && (
                    <div>
                      <label htmlFor="checkout-coupon" className="mb-2 block text-sm font-medium">
                        Cupom <span className={cx('font-normal', subtleClass)}>(opcional)</span>
                      </label>
                      <input
                        id="checkout-coupon"
                        type="text"
                        autoCapitalize="characters"
                        maxLength={40}
                        placeholder="Digite seu cupom"
                        value={couponCode}
                        onChange={(event) => {
                          setCouponCode(event.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''));
                          setServerPricing(null);
                          stripeAttemptId.current = '';
                        }}
                        className={cx('min-h-[48px] w-full rounded-xl border px-3.5 text-sm font-semibold uppercase outline-none transition focus:ring-2 sm:min-h-[52px] sm:px-4 sm:text-base', inputClass)}
                      />
                    </div>
                  )}
                </div>

                {!isRecurring && activeOrderBumps.length > 0 && (
                  <div className="mt-4 space-y-2.5">
                    <p className="text-xs font-black uppercase tracking-[0.08em] text-[#B8F128]">Complete seu pedido</p>
                    {activeOrderBumps.map((bump) => {
                      const selected = selectedOrderBumpId === bump.id;
                      return (
                        <button
                          key={bump.id}
                          type="button"
                          onClick={() => {
                            setSelectedOrderBumpId(selected ? '' : bump.id);
                            setServerPricing(null);
                            stripeAttemptId.current = '';
                          }}
                          className={cx(
                            'flex w-full items-center gap-3 rounded-xl border p-3 text-left transition sm:p-4',
                            selected
                              ? 'border-[#B8F128]/55 bg-[#B8F128]/10'
                              : isDark
                                ? 'border-white/10 bg-white/[0.025] hover:border-white/20'
                                : 'border-black/10 bg-black/[0.015] hover:border-black/20'
                          )}
                        >
                          <span className={cx(
                            'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border',
                            selected ? 'border-[#B8F128] bg-[#B8F128] text-black' : isDark ? 'border-white/25' : 'border-black/20'
                          )}>
                            {selected && <CheckCircle2 className="h-3.5 w-3.5" />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-black">{bump.name}</span>
                            {bump.description && <span className={cx('mt-0.5 block line-clamp-2 text-[11px]', mutedClass)}>{bump.description}</span>}
                          </span>
                          <span className="shrink-0 text-sm font-black text-[#B8F128]">+ {formatBRL(Number(bump.price || 0))}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {formError && (
                  <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400" role="alert">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isProcessing}
                  className="group relative mt-4 inline-flex min-h-[52px] w-full items-center justify-center gap-3 rounded-xl bg-[#B8F128] px-10 text-sm font-black text-black shadow-[0_10px_30px_rgba(184,241,40,0.13)] transition hover:bg-[#aee725] active:scale-[0.995] disabled:cursor-not-allowed disabled:opacity-60 sm:mt-5 sm:min-h-[58px] sm:px-5 sm:text-[17px]"
                >
                  {isProcessing ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black" />
                      Preparando pagamento…
                    </>
                  ) : (
                    <>
                      <span>{isRecurring ? 'Continuar para assinatura' : (selectedCheckout?.buttonText || 'Continuar para pagamento')}</span>
                      <ArrowRight className="absolute right-5 h-5 w-5 transition-transform group-hover:translate-x-1 sm:right-8 sm:h-6 sm:w-6" />
                    </>
                  )}
                </button>

                <div className={cx('mt-2.5 flex items-center justify-center gap-1.5 text-center text-[10px] sm:mt-3 sm:gap-2 sm:text-xs', subtleClass)}>
                  <LockKeyhole className="h-4 w-4" />
                  <span>Seus dados são utilizados para concluir sua compra.</span>
                </div>

                <div className={cx('mt-4 border-t pt-3 sm:mt-5 sm:pt-4', dividerClass)}>
                  <div className="flex flex-col gap-2 sm:gap-3 xl:flex-row xl:items-center xl:justify-between">
                    <span className="text-center text-xs font-medium sm:text-left sm:text-sm">Formas de pagamento na próxima etapa</span>
                    <div className="grid grid-cols-3 gap-1.5 sm:flex sm:flex-wrap sm:gap-2">
                      {renderPaymentBadge('Pix', <QrCode className="h-4 w-4" />, 'PIX')}
                      {renderPaymentBadge('Cartão', <CreditCard className="h-4 w-4" />, 'CARD')}
                      {renderPaymentBadge('Boleto', <Barcode className="h-4 w-4" />, 'BOLETO')}
                    </div>
                  </div>
                </div>
              </form>
            ) : stripePromise ? (
              <div className="pt-4 sm:pt-5">
                <div className="mb-4 flex items-start justify-between gap-3 sm:mb-5 sm:gap-4">
                  <div>
                    <h3 className="text-[24px] font-black tracking-[-0.025em] sm:text-[28px]">Pagamento</h3>
                    <p className={cx('mt-1 text-sm sm:text-base', mutedClass)}>
                      Escolha a forma de pagamento e conclua sua compra com segurança.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setClientSecret('');
                      setOrderId('');
                      setServerPricing(null);
                      stripeAttemptId.current = createAttemptId();
                      setFormError(null);
                    }}
                    className="shrink-0 pt-1 text-[10px] font-bold text-[#90cb16] hover:underline sm:pt-0 sm:text-xs"
                  >
                    Alterar dados
                  </button>
                </div>

                <div className={cx(
                  'rounded-xl border p-3 sm:rounded-2xl sm:p-5',
                  isDark ? 'border-[#34495f] bg-[#091626]/70' : 'border-[#e0e4e9] bg-white'
                )}>
                  <Elements
                    stripe={stripePromise}
                    options={{ clientSecret, appearance: stripeAppearance as any }}
                  >
                    <EmbeddedPaymentForm
                      returnUrl={returnUrl}
                      onError={setFormError}
                      isProcessing={isProcessing}
                      setIsProcessing={setIsProcessing}
                      paymentElementOptions={paymentElementOptions}
                    />
                  </Elements>
                </div>

                {formError && (
                  <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400" role="alert">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}
              </div>
            ) : null}
          </section>

          <aside className={cx('rounded-2xl border p-4 backdrop-blur-xl sm:rounded-[22px] sm:p-7 lg:sticky lg:top-5', cardClass)} aria-labelledby="order-summary-title">
            <h2 id="order-summary-title" className="text-[19px] font-black tracking-[-0.02em] sm:text-[24px]">
              Resumo do pedido
            </h2>

            <div className="mt-4 flex items-center gap-3 sm:mt-5 sm:gap-4">
              <img src={productImage} alt={plan.name} className="h-[58px] w-[66px] shrink-0 rounded-lg object-cover sm:h-[82px] sm:w-[94px] sm:rounded-xl" />

              <div className="min-w-0">
                <h3 className="truncate text-[16px] font-black sm:text-[21px]">{productName}</h3>
                <p className={cx('mt-0.5 text-xs sm:mt-1 sm:text-sm', mutedClass)}>
                  {isRecurring ? 'Assinatura • a cada ' + billingCycleLabel : 'Cobrança única'}
                </p>
              </div>
            </div>

            <div className="mt-4 sm:mt-5">
              <p className={cx('line-clamp-2 text-xs leading-relaxed sm:text-[15px]', isDark ? 'text-[#d7dfeb]' : 'text-[#4d586c]')}>
                {description}
              </p>
              <p className={cx('mt-1 line-clamp-1 text-[11px] sm:text-sm', subtleClass)}>{featureLine}</p>
            </div>

            <div className={cx('my-4 border-t sm:my-6', dividerClass)} />

            <div className="space-y-3 text-[13px] sm:space-y-4 sm:text-base">
              <div className="flex items-center justify-between gap-4">
                <span className={mutedClass}>Produto</span>
                <span className="font-medium">{formatBRL(resolvedProductAmount)}</span>
              </div>

              {resolvedDiscount > 0 && (
                <div className="flex items-center justify-between gap-4">
                  <span className="text-emerald-400">Desconto {serverPricing?.couponCode ? `(${serverPricing.couponCode})` : ''}</span>
                  <span className="font-semibold text-emerald-400">- {formatBRL(resolvedDiscount)}</span>
                </div>
              )}

              {resolvedOrderBumpAmount > 0 && (
                <div className="flex items-center justify-between gap-4">
                  <span className={mutedClass}>{serverPricing?.orderBumpName || selectedOrderBump?.name || 'Order Bump'}</span>
                  <span className="font-medium">+ {formatBRL(resolvedOrderBumpAmount)}</span>
                </div>
              )}

              <div className="flex items-center justify-between gap-4">
                <span className={mutedClass}>
                  Taxa LeadsPay{resolvedSoldItemCount > 1 ? ` (${resolvedSoldItemCount} itens)` : ''}
                </span>
                <span className="font-medium">{formatBRL(resolvedCheckoutFee)}</span>
              </div>
            </div>

            <div className={cx('my-4 border-t sm:my-6', dividerClass)} />

            <div className="flex items-end justify-between gap-4">
              <span className="text-[17px] font-black sm:text-[21px]">Total a pagar</span>
              <span className="whitespace-nowrap text-[24px] font-black tracking-[-0.04em] sm:text-[30px]">
                {formatBRL(finalTotal)}
              </span>
            </div>

            {isRecurring && (
              <p className={cx('mt-1 text-right text-[11px]', subtleClass)}>
                renovado a cada {billingCycleLabel}
              </p>
            )}

            <div className={cx('mt-4 flex items-center gap-2.5 rounded-xl border px-3 py-3 sm:mt-6 sm:gap-3 sm:px-4 sm:py-4', infoClass)}>
              <FileText className="h-5 w-5 shrink-0 text-[#9ddc18] sm:h-6 sm:w-6" />
              <span className="text-xs font-medium sm:text-sm">Revise os valores antes de continuar.</span>
            </div>
          </aside>
        </div>

        <footer className={cx('pb-2 pt-4 text-center text-[10px] sm:pb-3 sm:pt-7 sm:text-xs', footerClass)}>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <span>Termos de Uso</span>
            <span>|</span>
            <span>Política de Privacidade</span>
          </div>
          <p className="mt-2">Pagamento processado pela Stripe</p>
        </footer>
      </div>
    </main>
  );
};

interface EmbeddedPaymentFormProps {
  returnUrl: string;
  onError: (message: string | null) => void;
  isProcessing: boolean;
  setIsProcessing: (processing: boolean) => void;
  paymentElementOptions: any;
}

const EmbeddedPaymentForm: React.FC<EmbeddedPaymentFormProps> = ({
  returnUrl,
  onError,
  isProcessing,
  setIsProcessing,
  paymentElementOptions,
}) => {
  const stripe = useStripe();
  const elements = useElements();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onError(null);

    if (!stripe || !elements || isProcessing) return;

    setIsProcessing(true);

    try {
      const { error: submitError } = await elements.submit();

      if (submitError) {
        onError(submitError.message || 'Confira os dados da forma de pagamento.');
        return;
      }

      const result = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: returnUrl },
        redirect: 'if_required',
      });

      if (result.error) {
        onError(
          result.error.message ||
            'A Stripe não conseguiu confirmar os dados. Confira e tente novamente.'
        );
        return;
      }

      if (result.paymentIntent && result.paymentIntent.id) {
        const destination = new URL(returnUrl);
        destination.searchParams.set('payment_intent', result.paymentIntent.id);
        window.location.assign(destination.toString());
      } else {
        onError('A Stripe não retornou a referência da tentativa. Atualize a página antes de tentar novamente.');
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Falha ao confirmar o pagamento.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
      <PaymentElement options={paymentElementOptions} />

      <button
        type="submit"
        disabled={!stripe || isProcessing}
        className="group inline-flex min-h-[50px] w-full items-center justify-center gap-2 rounded-xl bg-[#B8F128] px-4 text-sm font-black text-black shadow-[0_10px_30px_rgba(184,241,40,0.13)] transition hover:bg-[#aee725] active:scale-[0.995] disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-[56px] sm:px-5"
      >
        {isProcessing ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black" />
            Confirmando com a Stripe…
          </>
        ) : (
          <>
            Finalizar Pagamento
            <LockKeyhole className="h-4 w-4" />
          </>
        )}
      </button>
    </form>
  );
};
