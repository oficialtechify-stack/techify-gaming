import React, { Suspense } from 'react';
import type { CompanyPlan } from '../../types/platform';

export const PLATFORM_CHECKOUT_FEE = 0.99;

interface CustomCheckoutPageProps {
  plan: CompanyPlan;
  checkoutSlug?: string;
  affiliateRef?: string;
  onBack?: () => void;
  onPaymentSuccess?: (tx?: any) => void;
}

const PremiumCheckoutPage = React.lazy(async () => {
  const module = await import('./PremiumCheckoutPage');
  return { default: module.CustomCheckoutPage };
});

class CheckoutBoundary extends React.Component<
  { children: React.ReactNode; onBack?: () => void },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; onBack?: () => void }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error('[LeadsPay Checkout] Falha isolada no checkout premium:', error);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="min-h-screen bg-[#06101b] px-4 py-12 text-white">
        <div className="mx-auto max-w-lg rounded-3xl border border-white/10 bg-[#0d1828] p-7 text-center shadow-2xl">
          <div className="text-3xl font-black tracking-tight">
            <span>Leads</span><span className="text-[#B8F128]">Pay</span>
          </div>
          <h1 className="mt-6 text-xl font-black">Checkout temporariamente indisponível</h1>
          <p className="mt-2 text-sm leading-relaxed text-white/60">
            O checkout encontrou um erro de interface. A página principal e o painel continuam funcionando normalmente.
          </p>
          {this.props.onBack && (
            <button
              type="button"
              onClick={this.props.onBack}
              className="mt-6 rounded-xl bg-[#B8F128] px-5 py-3 text-sm font-black text-black"
            >
              Voltar
            </button>
          )}
        </div>
      </main>
    );
  }
}

export const CustomCheckoutPage: React.FC<CustomCheckoutPageProps> = (props) => (
  <CheckoutBoundary onBack={props.onBack}>
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#06101b] text-white">
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#B8F128]/30 border-t-[#B8F128]" />
            <p className="mt-4 text-sm font-semibold text-white/70">Carregando checkout seguro…</p>
          </div>
        </main>
      }
    >
      <PremiumCheckoutPage {...props} />
    </Suspense>
  </CheckoutBoundary>
);
