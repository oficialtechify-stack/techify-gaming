import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, LockKeyhole, ShieldCheck, Store, AlertCircle } from 'lucide-react';
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
const stripePublishableKey = (import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || (import.meta.env as any).NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '').trim();
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;
const createAttemptId = () => (window.crypto?.randomUUID?.() || `${Date.now()}${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`).replace(/-/g, '');

const stripeAppearance = {
  theme: 'night' as const,
  variables: {
    colorPrimary: '#D9F22A',
    colorBackground: '#0d1424',
    colorText: '#ffffff',
    colorDanger: '#ef4444',
    fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
    borderRadius: '12px',
  },
};

const stripePaymentElementOptions = {
  layout: { type: 'accordion' as const, defaultCollapsed: false },
  business: { name: 'LeadsPay' },
};

const formatBRL = (value: number) => value.toLocaleString('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
});

export const CustomCheckoutPage: React.FC<CustomCheckoutPageProps> = ({
  plan,
  affiliateRef,
  onBack,
}) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [couponCode, setCouponCode] = useState(() => {
    try { return new URLSearchParams(window.location.search).get('coupon') || ''; } catch { return ''; }
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [clientSecret, setClientSecret] = useState('');
  const [orderId, setOrderId] = useState('');
  const stripeAttemptId = useRef('');

  const basePrice = Number(plan.priceSetup ?? plan.price ?? plan.priceMonthly ?? 0);
  const finalTotal = Number((basePrice + PLATFORM_CHECKOUT_FEE).toFixed(2));

  useEffect(() => {
    handleAffiliateTracking();
  }, []);

  const getActiveAffiliateCode = (): string | null => {
    if (affiliateRef?.trim()) return affiliateRef.trim();
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
      if (!stripeAttemptId.current) {
        stripeAttemptId.current = createAttemptId();
      }
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: plan.id,
          attemptId: stripeAttemptId.current,
          buyerName: fullName.trim(),
          buyerEmail: email.trim(),
          affiliateCode: getActiveAffiliateCode() || affiliateRef || '',
          couponCode: couponCode.trim(),
          utmSource: new URLSearchParams(window.location.search).get('utm_source') || '',
          utmMedium: new URLSearchParams(window.location.search).get('utm_medium') || '',
          utmCampaign: new URLSearchParams(window.location.search).get('utm_campaign') || '',
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (response.ok && result.paid === true && result.orderId) {
        const confirmation = new URL('/?thank-you=true', window.location.origin);
        confirmation.searchParams.set('plan', plan.id);
        confirmation.searchParams.set('order_id', String(result.orderId));
        window.location.assign(confirmation.toString());
        return;
      }
      if (!response.ok || !result.clientSecret || !result.orderId) {
        if (result.code === 'PAYMENT_ATTEMPT_CANCELED' || result.code === 'CHECKOUT_SNAPSHOT_MISMATCH') {
          stripeAttemptId.current = '';
        }
        setFormError(result.error || (response.status >= 500 ? 'O servidor de pagamentos está reiniciando. Tente novamente em instantes.' : 'Não foi possível preparar o pagamento. Tente novamente.'));
        return;
      }
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

  return (
    <main className="min-h-screen bg-[#060A15] px-4 py-5 text-white selection:bg-[#D9F22A] selection:text-[#060A15] sm:px-6 sm:py-8 font-sans">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 flex items-center justify-between border-b border-white/10 pb-5">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                aria-label="Voltar"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/80 transition hover:bg-white/10 hover:text-white cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
            <div>
              <div className="text-[13px] font-black tracking-[0.2em] text-[#D9F22A]">LEADSPAY</div>
              <div className="mt-0.5 text-[11px] text-white/50">Checkout Oficial Seguro</div>
            </div>
          </div>
          <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-semibold text-emerald-400">
            <LockKeyhole className="h-3.5 w-3.5" aria-hidden="true" />
            Ambiente Criptografado
          </div>
        </header>

        <div className="mb-6 flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs text-white/70" role="status">
          <ShieldCheck className="h-4 w-4 shrink-0 text-[#D9F22A]" aria-hidden="true" />
          <span>Pagamento processado com segurança de nível bancário pela <strong>Stripe</strong>. Seus dados estão 100% protegidos.</span>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
          <section className="rounded-2xl border border-white/10 bg-[#0D1424] p-5 shadow-2xl sm:p-8">
            <div className="mb-6 border-b border-white/10 pb-6">
              <span className="text-[11px] font-black uppercase tracking-[0.14em] text-[#D9F22A]">Produto / Oferta</span>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">{plan.name}</h1>
              {(plan.companyName || plan.description) && (
                <div className="mt-3 flex items-start gap-2 text-sm leading-6 text-white/60">
                  <Store className="mt-1 h-4 w-4 shrink-0 text-[#D9F22A]" aria-hidden="true" />
                  <span>{plan.companyName || plan.description}</span>
                </div>
              )}
            </div>

            {!clientSecret ? (
              <form onSubmit={handleProcessPayment} className="space-y-6">
                <div>
                  <h2 className="text-sm font-bold text-white">1. Seus dados cadastrais</h2>
                  <p className="mt-1 text-xs text-white/50">Usaremos essas informações para enviar seu recibo e liberar o acesso.</p>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label htmlFor="checkout-full-name" className="mb-1.5 block text-xs font-semibold text-white/70">Nome completo</label>
                      <input
                        id="checkout-full-name"
                        type="text"
                        autoComplete="name"
                        required
                        maxLength={120}
                        placeholder="Ex: Carlos Eduardo Silva"
                        value={fullName}
                        onChange={(event) => setFullName(event.target.value)}
                        className="min-h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-[#D9F22A] focus:ring-1 focus:ring-[#D9F22A]"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label htmlFor="checkout-email" className="mb-1.5 block text-xs font-semibold text-white/70">E-mail para entrega</label>
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
                        className="min-h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-[#D9F22A] focus:ring-1 focus:ring-[#D9F22A]"
                      />
                    </div>
                  </div>
                </div>

                {formError && (
                  <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400 flex items-center gap-2" role="alert">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isProcessing}
                  className="group inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#D9F22A] px-5 text-sm font-black uppercase tracking-wider text-[#060A15] transition hover:bg-[#c8e220] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer shadow-lg shadow-[#D9F22A]/10"
                >
                  {isProcessing ? (
                    <><span className="h-4 w-4 animate-spin rounded-full border-2 border-[#060A15]/40 border-t-[#060A15]" aria-hidden="true" />Iniciando Stripe…</>
                  ) : (
                    <>Ir para pagamento <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" /></>
                  )}
                </button>
                <p className="text-center text-[11px] leading-relaxed text-white/40">
                  Ao clicar em continuar, as formas de pagamento disponíveis (Cartão, PIX, Boleto) serão carregadas na próxima etapa.
                </p>
              </form>
            ) : stripePromise ? (
              <div className="space-y-5 animate-in fade-in">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-sm font-bold text-white">2. Escolha como pagar</h2>
                    <p className="mt-1 text-xs text-white/50">Selecione o método de sua preferência no formulário Stripe abaixo.</p>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => { setClientSecret(''); setOrderId(''); stripeAttemptId.current = createAttemptId(); setFormError(null); }} 
                    className="text-xs font-semibold text-[#D9F22A] hover:underline cursor-pointer"
                  >
                    Alterar dados
                  </button>
                </div>
                <Elements stripe={stripePromise} options={{ clientSecret, appearance: stripeAppearance }}>
                  <EmbeddedPaymentForm returnUrl={returnUrl} onError={setFormError} isProcessing={isProcessing} setIsProcessing={setIsProcessing} />
                </Elements>
                {formError && (
                  <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400 flex items-center gap-2" role="alert">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}
              </div>
            ) : null}
          </section>

          <aside className="rounded-2xl border border-white/10 bg-[#0D1424] p-5 shadow-2xl sm:p-6 lg:sticky lg:top-6" aria-labelledby="order-summary-title">
            <h2 id="order-summary-title" className="text-base font-bold tracking-tight text-white">Resumo do pedido</h2>
            <div className="mt-4 border-y border-white/10 py-4">
              <div className="flex items-start justify-between gap-4 text-sm">
                <div>
                  <p className="font-semibold text-white">{plan.name}</p>
                  <p className="mt-0.5 text-xs text-white/50">Cobrança única</p>
                </div>
                <span className="whitespace-nowrap font-bold text-white">{formatBRL(basePrice)}</span>
              </div>
              <div className="mt-3 flex items-center justify-between gap-4 text-xs text-white/50">
                <span>Taxa da plataforma LeadsPay</span>
                <span className="whitespace-nowrap">{formatBRL(PLATFORM_CHECKOUT_FEE)}</span>
              </div>
            </div>
            <div className="flex items-center justify-between gap-4 py-4">
              <span className="text-sm font-semibold text-white/80">Total a pagar</span>
              <span className="text-2xl font-black tracking-tight text-[#D9F22A]">{formatBRL(finalTotal)}</span>
            </div>
            {Array.isArray(plan.features) && plan.features.length > 0 && (
              <div className="border-t border-white/10 pt-4">
                <p className="mb-3 text-[11px] font-black uppercase tracking-[0.14em] text-white/50">Benefícios inclusos</p>
                <ul className="space-y-2.5">
                  {plan.features.slice(0, 5).map((feature, index) => (
                    <li key={`${feature}-${index}`} className="flex gap-2.5 text-xs leading-5 text-white/70">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#D9F22A]" aria-hidden="true" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="mt-5 flex items-center gap-2 border-t border-white/10 pt-4 text-[11px] text-white/50">
              <LockKeyhole className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
              Criptografia SSL de 256 bits com certificação Stripe
            </div>
          </aside>
        </div>

        <footer className="mx-auto mt-8 max-w-3xl text-center text-[11px] leading-relaxed text-white/40">
          Ao prosseguir, você concorda com os Termos de Uso e Política de Privacidade da LeadsPay Pagamentos S/A.
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
}

const EmbeddedPaymentForm: React.FC<EmbeddedPaymentFormProps> = ({ returnUrl, onError, isProcessing, setIsProcessing }) => {
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
        onError(result.error.message || 'A Stripe não conseguiu confirmar os dados. Confira e tente novamente.');
        return;
      }
      if (result.paymentIntent?.id) {
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
    <form onSubmit={handleSubmit} className="space-y-5">
      <PaymentElement options={stripePaymentElementOptions} />
      <button 
        type="submit" 
        disabled={!stripe || isProcessing} 
        className="group inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#D9F22A] px-5 text-sm font-black uppercase tracking-wider text-[#060A15] transition hover:bg-[#c8e220] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer shadow-lg shadow-[#D9F22A]/10"
      >
        {isProcessing ? (
          <><span className="h-4 w-4 animate-spin rounded-full border-2 border-[#060A15]/40 border-t-[#060A15]" aria-hidden="true" />Confirmando com a Stripe…</>
        ) : (
          <>Finalizar Pagamento <LockKeyhole className="h-4 w-4" aria-hidden="true" /></>
        )}
      </button>
    </form>
  );
};
