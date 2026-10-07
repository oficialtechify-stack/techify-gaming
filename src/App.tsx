import { useState, useEffect } from 'react';
import { ActiveModal } from './types';
import { Modals } from './components/Modals';
import { PlatformLayout } from './components/platform/PlatformLayout';
import { LeadspayOfficeView } from './components/platform/LeadspayOfficeView';
import { AlertCircle } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CustomCheckoutPage } from './components/checkout/CustomCheckoutPage';
import { ThankYouPage } from './components/checkout/ThankYouPage';
import { getCompanyPlanByIdOrSlug } from './services/firestoreService';
import { CompanyPlan } from './types/platform';
import { ErrorBoundary } from './components/ErrorBoundary';
import { handleAffiliateTracking, getActiveAffiliateRef } from './utils/affiliateTracking';
import { CookieConsentBanner } from './components/CookieConsentBanner';
import LeadspayLanding from './components/LeadspayLanding';
import './styles/leadspay-landing.css';

function MainApp() {
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [viewPlatform, setViewPlatform] = useState<boolean>(false);
  const [appPath, setAppPath] = useState<string>(() => typeof window !== 'undefined' ? window.location.pathname : '/');
  const { isAuthenticated, currentUser } = useAuth();

  const isOfficePath = appPath === '/office' || appPath === '/leadspay-office';
  const isCityPath = appPath === '/cidade' || appPath === '/leadspay-city' || appPath === '/mundo';
  const officePanelMatch = appPath.match(/^\/office-panel\/(tasks|chat|computer|team|ai|decorator)$/);
  const officeEmbeddedPanel = officePanelMatch?.[1] as 'tasks' | 'chat' | 'computer' | 'team' | 'ai' | 'decorator' | undefined;

  // Direct checkout link state
  const [checkoutPlan, setCheckoutPlan] = useState<CompanyPlan | null>(null);
  const [isLoadingCheckout, setIsLoadingCheckout] = useState<boolean>(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [isThankYouPage, setIsThankYouPage] = useState<boolean>(false);
  const [affiliateRef, setAffiliateRef] = useState<string>('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const syncPath = () => setAppPath(window.location.pathname);
    window.addEventListener('popstate', syncPath);
    return () => window.removeEventListener('popstate', syncPath);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const params = new URLSearchParams(window.location.search);

        // Check if on Thank You Page
        const isThankYouPath = window.location.pathname.includes('/thank-you') || 
                               params.get('thank-you') === 'true' || 
                               params.get('obrigado') === 'true' ||
                               params.get('status') === 'success';
        if (isThankYouPath) {
          setIsThankYouPage(true);
          return;
        }

        // 1. Capturar código do afiliado via Cookie de 15 dias e localStorage
        const capturedRef = handleAffiliateTracking();
        if (capturedRef) {
          setAffiliateRef(capturedRef);
        } else {
          const stored = getActiveAffiliateRef();
          if (stored) setAffiliateRef(stored);
        }

        // 2. Detectar se a URL é um link direto de plano/checkout (/plan/[id], /checkout/[id], ?plan=... ou ?checkout=...)
        let targetPlanId: string | null = null;
        if (params.get('checkout')) targetPlanId = params.get('checkout');
        else if (params.get('plan')) targetPlanId = params.get('plan');
        else if (params.get('plano')) targetPlanId = params.get('plano');

        const isCheckoutPath = window.location.pathname.startsWith('/plan') || window.location.pathname.startsWith('/checkout');
        if (!targetPlanId && isCheckoutPath) {
          const pathSegments = window.location.pathname.split('/').filter(Boolean);
          // Se tiver /checkout/plan-xyz, pega o segundo segmento. Se for apenas /checkout, não é id de plano
          if (pathSegments[1] && pathSegments[1] !== 'checkout') {
            targetPlanId = pathSegments[1];
          }
        }

        if (!targetPlanId && (window.location.hash.includes('checkout') || window.location.hash.includes('plan'))) {
          const hashMatch = window.location.hash.match(/(?:checkout|plan)[=/]([a-zA-Z0-9_-]+)/);
          if (hashMatch && hashMatch[1] && hashMatch[1] !== 'checkout') {
            targetPlanId = hashMatch[1];
          }
        }

        // 3. Checkout público sempre resolve uma oferta persistida no Firestore.
        // Valores e empresa nunca são aceitos de parâmetros manipuláveis da URL.
        if (targetPlanId) {
          setIsLoadingCheckout(true);
          setCheckoutError(null);
          getCompanyPlanByIdOrSlug(targetPlanId).then((plan) => {
            setIsLoadingCheckout(false);
            if (plan) {
              setCheckoutPlan(plan);

              const directRef = params.get('ref') || params.get('r') || '';
              if (directRef.trim()) {
                const utmSource = params.get('utm_source') || '';
                const utmMedium = params.get('utm_medium') || '';
                const utmCampaign = params.get('utm_campaign') || '';
                const sessionKey = `leadspay-click:${plan.id}:${directRef}:${utmSource}:${utmMedium}:${utmCampaign}`;
                try {
                  let eventId = sessionStorage.getItem(sessionKey) || '';
                  if (!eventId) {
                    const randomPart = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
                      ? crypto.randomUUID().replace(/-/g, '')
                      : `${Date.now()}${Math.random().toString(36).slice(2)}`;
                    eventId = `clk_${randomPart}`;
                    sessionStorage.setItem(sessionKey, eventId);
                  }
                  fetch('/api/affiliates/click', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      planId: plan.id,
                      affiliateCode: directRef.trim(),
                      eventId,
                      utmSource,
                      utmMedium,
                      utmCampaign,
                    }),
                    keepalive: true,
                  }).catch(() => {});
                } catch {
                  // Analytics must never block checkout.
                }
              }
            } else {
              setCheckoutError(`Não encontramos a oferta para "${targetPlanId}". O link pode estar incorreto, pausado ou expirado.`);
            }
          }).catch((err) => {
            console.error('Erro ao buscar plano para checkout:', err);
            setIsLoadingCheckout(false);
            setCheckoutError('Erro ao carregar o checkout seguro. Tente novamente.');
          });
        } else if (isCheckoutPath) {
          setIsLoadingCheckout(false);
          setCheckoutError('Este checkout não possui uma oferta cadastrada válida.');
        }

        // 5. Suporte a abertura direta de modais de autenticação via URL (ex: ?auth=login, ?auth=afiliado, #login)
        const authParam = params.get('auth') || params.get('modal') || '';
        const hash = window.location.hash.toLowerCase();
        if (authParam === 'login' || hash === '#login') {
          setActiveModal('login');
        } else if (authParam === 'afiliado' || authParam === 'register_affiliate' || hash === '#afiliado' || hash === '#cadastro-afiliado') {
          setActiveModal('register_affiliate');
        } else if (authParam === 'empresa' || authParam === 'register_company' || hash === '#empresa' || hash === '#cadastro-empresa') {
          setActiveModal('register_company');
        }
      } catch (e) {
        console.warn('Erro ao processar parâmetros da URL:', e);
      }
    }
  }, []);

  const handleOpenModal = (modal: ActiveModal) => {
    setActiveModal(modal);
  };

  const handleCloseModal = () => {
    setActiveModal(null);
  };

  const handleLoginSuccess = () => {
    setViewPlatform(true);
  };

  // Se estiver carregando o checkout direto
  if (isLoadingCheckout) {
    return (
      <div className="min-h-screen bg-[#060A15] flex flex-col items-center justify-center p-6 text-white text-center">
        <div className="w-12 h-12 border-4 border-[#208b68] border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-xl font-bold font-['Syne']">Carregando Checkout Seguro...</h2>
        <p className="text-sm text-white/60 mt-1">Checkout seguro da Stripe</p>
      </div>
    );
  }

  // Se for a Thank You Page pós-checkout
  if (isThankYouPage) {
    return (
      <div className="min-h-screen bg-[#060A15] text-white">
        <ThankYouPage
          onBackToHome={() => {
            setIsThankYouPage(false);
            if (typeof window !== 'undefined' && window.history) {
              window.history.replaceState({}, '', '/');
            }
          }}
        />
      </div>
    );
  }

  // Se abriu link direto de checkout e a oferta foi encontrada
  if (checkoutPlan) {

    return (
      <div className="min-h-screen bg-[#060A15] text-white">
        <CustomCheckoutPage
          plan={checkoutPlan}
          affiliateRef={affiliateRef}
          onBack={() => {
            setCheckoutPlan(null);
            if (typeof window !== 'undefined' && window.history) {
              window.history.replaceState({}, '', '/');
            }
          }}
        />
      </div>
    );
  }

  // Se abriu link direto de checkout mas houve erro
  if (checkoutError) {
    return (
      <div className="min-h-screen bg-[#060A15] flex flex-col items-center justify-center p-6 text-white text-center">
        <div className="p-6 rounded-2xl bg-[#080d1a] border border-red-500/30 max-w-md shadow-2xl">
          <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mx-auto mb-3">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white font-['Syne']">Checkout Indisponível</h2>
          <p className="text-xs text-white/70 mt-2 leading-relaxed">{checkoutError}</p>
          <button
            onClick={() => {
              setCheckoutError(null);
              if (typeof window !== 'undefined' && window.history) {
                window.history.replaceState({}, '', '/');
              }
            }}
            className="mt-5 w-full py-3 bg-[#D9F22A] text-black font-black text-xs uppercase tracking-wider rounded-xl hover:bg-[#c5dc23] transition-all cursor-pointer shadow-lg"
          >
            Ir para a Página Inicial
          </button>
        </div>
      </div>
    );
  }

  const handleOpenPlatform = () => {
    if (!isAuthenticated || !currentUser) {
      handleOpenModal('login');
    } else {
      setViewPlatform(true);
    }
  };

  if (officeEmbeddedPanel) {
    if (!isAuthenticated || !currentUser) {
      return (
        <div className="min-h-[100dvh] bg-[#080d14] text-white flex items-center justify-center p-5">
          <div className="max-w-sm text-center">
            <p className="text-sm text-white/60">Sua sessão do LeadsPay é necessária para abrir este painel do Office.</p>
          </div>
        </div>
      );
    }
    return (
      <ErrorBoundary fallbackTitle="Erro ao carregar painel do LeadsPay Office">
        <LeadspayOfficeView embeddedPanel={officeEmbeddedPanel} />
      </ErrorBoundary>
    );
  }

  // Rotas diretas antigas continuam como atalhos do mesmo LeadsPay Office.
  if (isOfficePath || isCityPath) {
    if (!isAuthenticated || !currentUser) {
      return (
        <div className="min-h-[100dvh] bg-[#071019] text-white flex items-center justify-center p-6">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0b131d] p-7 text-center shadow-2xl">
            <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl border border-[#D9F22A]/30 bg-[#D9F22A]/10 text-[#D9F22A]">
              <span className="text-lg font-black">LP</span>
            </div>
            <h1 className="text-2xl font-black">{isCityPath ? 'Cidade LeadsPay' : 'LeadsPay Office'}</h1>
            <p className="mt-2 text-sm text-white/60">
              Entre na sua conta LeadsPay para acessar {isCityPath ? 'a cidade' : 'o escritório'}.
            </p>
            <button
              type="button"
              onClick={() => setActiveModal('login')}
              className="mt-6 w-full rounded-xl bg-[#D9F22A] px-4 py-3 text-sm font-black text-[#071019]"
            >
              {isCityPath ? 'Entrar na Cidade' : 'Entrar no Office'}
            </button>
          </div>
          <Modals
            activeModal={activeModal}
            onClose={handleCloseModal}
            onLoginSuccess={handleLoginSuccess}
          />
        </div>
      );
    }

    return (
      <ErrorBoundary fallbackTitle="Erro ao carregar o LeadsPay Office">
        <LeadspayOfficeView
          standalone
          initialScene={isCityPath ? 'city' : 'office'}
          onExit={() => {
            window.history.pushState({}, '', '/');
            setAppPath('/');
            setViewPlatform(true);
          }}
        />
      </ErrorBoundary>
    );
  }

  // If user opens platform or is logged in and wants to see platform
  if (viewPlatform) {
    if (!isAuthenticated || !currentUser) {
      // Not logged in: under no circumstance show platform or fake profile
      setViewPlatform(false);
      handleOpenModal('login');
      return null;
    }
    return (
      <ErrorBoundary fallbackTitle="Erro ao carregar o Painel LeadsPay" onReset={() => setViewPlatform(false)}>
        <PlatformLayout onBackToHome={() => setViewPlatform(false)} />
      </ErrorBoundary>
    );
  }

  return (
    <div className="min-h-screen">
      <LeadspayLanding onOpenModal={handleOpenModal} onOpenPlatform={handleOpenPlatform} />

      {/* Interactive Modals (Login, Register Affiliate, Register Company, Forgot Password) */}
      <Modals
        activeModal={activeModal}
        onClose={handleCloseModal}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* LGPD Cookie Consent Banner */}
      <CookieConsentBanner />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary fallbackTitle="Erro ao carregar ecossistema LeadsPay">
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </ErrorBoundary>
  );
}
