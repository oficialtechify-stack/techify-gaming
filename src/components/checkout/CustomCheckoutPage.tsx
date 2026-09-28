import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, LockKeyhole, ShieldCheck, Store } from 'lucide-react';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { CompanyPlan } from '../../types/platform';
import { handleAffiliateTracking, getActiveAffiliateRef } from '../../utils/affiliateTracking';

interface CustomCheckoutPageProps {
  plan: CompanyPlan;
  checkoutSlug?: string;
  affiliateRef?: string;
  onBack?: () => void;
}

export const PLATFORM_CHECKOUT_FEE = 0.99;
const stripePublishableKey = (import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '').trim();
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;
const stripeAppearance = {
  theme: 'stripe' as const,
  variables: {
    colorPrimary: '#17191c',
    colorBackground: '#ffffff',
    colorText: '#17191c',
    colorDanger: '#b42318',
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
      setFormError('O checkout ainda não foi configurado para este ambiente. Nenhuma cobrança foi criada.');
      return;
    }
    if (!Number.isFinite(basePrice) || basePrice <= 0) {
      setFormError('Esta oferta tem um preço inválido. Entre em contato com a empresa responsável.');
      return;
    }
    if (finalTotal < 5) {
      setFormError('O valor mínimo para pagamento nesta plataforma é de R$ 5,00.');
      return;
    }
    if (!fullName.trim() || fullName.trim().split(/\s+/).length < 2) {
      setFormError('Informe nome e sobrenome completos.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setFormError('Informe um e-mail válido.');
      return;
    }
    if (!plan.id || plan.id === 'checkout-dinamico' || plan.id === 'checkout-direto') {
      setFormError('Esta oferta ainda não está cadastrada para pagamento. Entre em contato com a empresa responsável.');
      return;
    }

    setIsProcessing(true);
    try {
      if (!stripeAttemptId.current) {
        stripeAttemptId.current = (window.crypto?.randomUUID?.() || `${Date.now()}${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`).replace(/-/g, '');
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
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.clientSecret || !result.orderId) {
        setFormError(result.error || 'Não foi possível preparar o pagamento. Nenhuma cobrança foi iniciada.');
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
    <main className="min-h-screen bg-[#f5f6f7] px-4 py-5 text-[#16181b] selection:bg-[#16181b] selection:text-white sm:px-6 sm:py-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-5 flex items-center justify-between border-b border-[#e3e5e7] pb-5">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                aria-label="Voltar"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#dfe2e5] bg-white text-[#34383d] transition hover:bg-[#f0f1f2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#17191c]"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
            <div>
              <div className="text-[13px] font-extrabold tracking-[0.18em] text-[#16181b]">LEADSPAY</div>
              <div className="mt-0.5 text-[11px] text-[#73777d]">Finalização de compra</div>
            </div>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#e1e3e5] bg-white px-3 py-2 text-[11px] font-medium text-[#555a60]">
            <LockKeyhole className="h-3.5 w-3.5" aria-hidden="true" />
            Ambiente protegido
          </div>
        </header>
        <div className="mb-7 flex items-center gap-2 rounded-xl border border-[#dedfe1] bg-[#eeeff1] px-4 py-3 text-xs text-[#4c5055]" role="status">
          <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span><strong className="font-semibold">Ambiente de teste Stripe.</strong> Nenhuma cobrança real será efetuada.</span>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          <section className="rounded-2xl border border-[#e1e3e5] bg-white p-5 shadow-[0_8px_30px_rgba(15,18,20,0.04)] sm:p-8">
            <div className="mb-7 border-b border-[#eceef0] pb-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#777c82]">Compra segura</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-[#17191c] sm:text-[30px]">{plan.name}</h1>
              {(plan.companyName || plan.description) && (
                <div className="mt-3 flex items-start gap-2 text-sm leading-6 text-[#646970]">
                  <Store className="mt-1 h-4 w-4 shrink-0 text-[#747980]" aria-hidden="true" />
                  <span>{plan.companyName || plan.description}</span>
                </div>
              )}
            </div>

            {!clientSecret ? <form onSubmit={handleProcessPayment} className="space-y-6">
              <div>
                <h2 className="text-sm font-semibold text-[#202327]">Seus dados</h2>
                <p className="mt-1 text-xs leading-5 text-[#777c82]">Usaremos essas informações para identificar o pedido e enviar a confirmação.</p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label htmlFor="checkout-full-name" className="mb-1.5 block text-xs font-medium text-[#43484e]">Nome completo</label>
                    <input
                      id="checkout-full-name"
                      type="text"
                      autoComplete="name"
                      required
                      maxLength={120}
                      placeholder="Seu nome e sobrenome"
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      className="min-h-11 w-full rounded-xl border border-[#dfe2e5] bg-white px-3.5 text-sm text-[#17191c] outline-none transition placeholder:text-[#a0a4a9] hover:border-[#b7bbc0] focus:border-[#202327] focus:ring-2 focus:ring-[#202327]/10"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="checkout-email" className="mb-1.5 block text-xs font-medium text-[#43484e]">E-mail</label>
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
                      className="min-h-11 w-full rounded-xl border border-[#dfe2e5] bg-white px-3.5 text-sm text-[#17191c] outline-none transition placeholder:text-[#a0a4a9] hover:border-[#b7bbc0] focus:border-[#202327] focus:ring-2 focus:ring-[#202327]/10"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-[#e5e7e9] bg-[#f8f9fa] p-4">
                <div className="flex gap-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#34383d]" aria-hidden="true" />
                  <div>
                    <h2 className="text-sm font-semibold text-[#292d31]">Pagamento processado pela Stripe</h2>
                    <p className="mt-1 text-xs leading-5 text-[#666b71]">
                      Você verá as formas de pagamento atualmente habilitadas e elegíveis para esta compra no checkout seguro da Stripe. A disponibilidade pode variar conforme a conta, o valor e a localização.
                    </p>
                  </div>
                </div>
              </div>

              {formError && (
                <div className="rounded-xl border border-[#d9dcdf] bg-[#f7f7f8] px-4 py-3 text-sm leading-5 text-[#3e4247]" role="alert">
                  {formError}
                </div>
              )}

              <button
                type="submit"
                disabled={isProcessing}
                className="group inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#17191c] px-5 text-sm font-semibold text-white transition hover:bg-[#303338] active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#17191c] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isProcessing ? (
                  <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white" aria-hidden="true" />Preparando pagamento…</>
                ) : (
                  <>Continuar para pagamento <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" /></>
                )}
              </button>
              <p className="text-center text-[11px] leading-5 text-[#858a90]">
                Os dados de pagamento são informados diretamente à Stripe pelo formulário seguro. A LeadsPay não recebe os dados do cartão.
              </p>
            </form> : stripePromise ? (
              <div className="space-y-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-sm font-semibold text-[#202327]">Forma de pagamento</h2>
                    <p className="mt-1 text-xs leading-5 text-[#777c82]">Métodos disponibilizados pela Stripe para sua compra.</p>
                  </div>
                  <button type="button" onClick={() => { setClientSecret(''); setOrderId(''); setFormError(null); }} className="text-xs font-medium text-[#555a60] underline underline-offset-4">Editar dados</button>
                </div>
                <Elements stripe={stripePromise} options={{ clientSecret, appearance: stripeAppearance }}>
                  <EmbeddedPaymentForm returnUrl={returnUrl} onError={setFormError} isProcessing={isProcessing} setIsProcessing={setIsProcessing} />
                </Elements>
                {formError && <div className="rounded-xl border border-[#d9dcdf] bg-[#f7f7f8] px-4 py-3 text-sm leading-5 text-[#3e4247]" role="alert">{formError}</div>}
                <p className="text-center text-[11px] leading-5 text-[#858a90]">O status do pagamento será confirmado no servidor via webhook Stripe.</p>
              </div>
            ) : null}
          </section>

          <aside className="rounded-2xl border border-[#e1e3e5] bg-white p-5 shadow-[0_8px_30px_rgba(15,18,20,0.04)] sm:p-6 lg:sticky lg:top-6" aria-labelledby="order-summary-title">
            <h2 id="order-summary-title" className="text-base font-semibold tracking-tight text-[#17191c]">Resumo do pedido</h2>
            <div className="mt-5 border-y border-[#eceef0] py-4">
              <div className="flex items-start justify-between gap-4 text-sm">
                <div>
                  <p className="font-medium text-[#303439]">{plan.name}</p>
                  <p className="mt-1 text-xs text-[#81868c]">Pagamento único</p>
                </div>
                <span className="whitespace-nowrap font-medium text-[#303439]">{formatBRL(basePrice)}</span>
              </div>
              <div className="mt-4 flex items-center justify-between gap-4 text-xs text-[#71767c]">
                <span>Taxa de serviço LeadsPay</span>
                <span className="whitespace-nowrap">{formatBRL(PLATFORM_CHECKOUT_FEE)}</span>
              </div>
            </div>
            <div className="flex items-center justify-between gap-4 py-5">
              <span className="text-sm font-semibold text-[#24282c]">Total</span>
              <span className="text-xl font-semibold tracking-tight text-[#17191c]">{formatBRL(finalTotal)}</span>
            </div>
            {Array.isArray(plan.features) && plan.features.length > 0 && (
              <div className="border-t border-[#eceef0] pt-4">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#858a90]">Incluído nesta oferta</p>
                <ul className="space-y-2.5">
                  {plan.features.slice(0, 5).map((feature, index) => (
                    <li key={`${feature}-${index}`} className="flex gap-2.5 text-xs leading-5 text-[#54595f]">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#50555b]" aria-hidden="true" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="mt-5 flex items-center gap-2 border-t border-[#eceef0] pt-4 text-[11px] text-[#777c82]">
              <LockKeyhole className="h-3.5 w-3.5" aria-hidden="true" />
              Criptografia e processamento seguro pela Stripe
            </div>
          </aside>
        </div>

        <footer className="mx-auto mt-6 max-w-3xl text-center text-[11px] leading-5 text-[#858a90]">
          Ao continuar, você confirma que os dados informados estão corretos. O pagamento só será considerado aprovado após confirmação segura pela Stripe.
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
      <button type="submit" disabled={!stripe || isProcessing} className="group inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#17191c] px-5 text-sm font-semibold text-white transition hover:bg-[#303338] active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#17191c] disabled:cursor-not-allowed disabled:opacity-60">
        {isProcessing ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white" aria-hidden="true" />Confirmando com a Stripe…</> : <>Pagar com segurança <LockKeyhole className="h-4 w-4" aria-hidden="true" /></>}
      </button>
    </form>
  );
};
