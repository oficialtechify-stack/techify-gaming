import { useState, useEffect } from 'react';
import { ActiveModal } from './types';
import { Header } from './components/Header';
import { HeroSection } from './components/HeroSection';
import { StatsCounter } from './components/StatsCounter';
import { HowItWorksSection } from './components/HowItWorksSection';
import { AboutSection } from './components/AboutSection';
import { CultureBanner } from './components/CultureBanner';
import { SponsorshipsSection } from './components/SponsorshipsSection';
import { ResponsibleGamingSection } from './components/ResponsibleGamingSection';
import { FooterMarquee } from './components/FooterMarquee';
import { Modals } from './components/Modals';
import { PlatformLayout } from './components/platform/PlatformLayout';
import { LayoutDashboard } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CustomCheckoutPage } from './components/checkout/CustomCheckoutPage';
import { getCompanyPlanByIdOrSlug } from './services/firestoreService';
import { CompanyPlan } from './types/platform';

function MainApp() {
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [viewPlatform, setViewPlatform] = useState<boolean>(false);
  const { isAuthenticated } = useAuth();

  // Direct checkout link state
  const [checkoutPlan, setCheckoutPlan] = useState<CompanyPlan | null>(null);
  const [isLoadingCheckout, setIsLoadingCheckout] = useState<boolean>(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [affiliateRef, setAffiliateRef] = useState<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const params = new URLSearchParams(window.location.search);
        
        // 1. Salvar imediatamente o parâmetro ?ref=... no localStorage (techify_affiliate_ref)
        const refParam = params.get('ref') || params.get('r');
        if (refParam && refParam.trim()) {
          localStorage.setItem('techify_affiliate_ref', refParam.trim());
          setAffiliateRef(refParam.trim());
          console.log('📌 [Techify App] Código de afiliado salvo no localStorage:', refParam.trim());
        } else {
          const stored = localStorage.getItem('techify_affiliate_ref');
          if (stored) setAffiliateRef(stored);
        }

        // 2. Detectar se a URL é um link direto de checkout (?checkout=... ou /checkout/...)
        let targetPlanId: string | null = null;
        if (params.get('checkout')) targetPlanId = params.get('checkout');
        else if (params.get('plan')) targetPlanId = params.get('plan');
        else if (params.get('plano')) targetPlanId = params.get('plano');

        if (!targetPlanId && window.location.pathname.startsWith('/checkout')) {
          const pathSegments = window.location.pathname.split('/').filter(Boolean);
          if (pathSegments[1]) targetPlanId = pathSegments[1];
        }

        if (!targetPlanId && window.location.hash.includes('checkout')) {
          const hashMatch = window.location.hash.match(/checkout[=/]([a-zA-Z0-9_-]+)/);
          if (hashMatch && hashMatch[1]) targetPlanId = hashMatch[1];
        }

        // 3. Se houver link de checkout, carrega a oferta do Firestore
        if (targetPlanId) {
          setIsLoadingCheckout(true);
          setCheckoutError(null);
          getCompanyPlanByIdOrSlug(targetPlanId).then((plan) => {
            setIsLoadingCheckout(false);
            if (plan) {
              setCheckoutPlan(plan);
            } else {
              setCheckoutError(`Não encontramos a oferta para "${targetPlanId}". O link pode estar incorreto ou expirado.`);
            }
          }).catch((err) => {
            console.error('Erro ao buscar plano para checkout:', err);
            setIsLoadingCheckout(false);
            setCheckoutError('Erro ao carregar o checkout seguro. Tente novamente.');
          });
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
        <p className="text-sm text-white/60 mt-1">Ambiente criptografado Mercado Pago & Techify</p>
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
            <LayoutDashboard className="w-6 h-6" />
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

  // If user opens platform or is logged in and wants to see platform
  if (viewPlatform) {
    return (
      <PlatformLayout onBackToHome={() => setViewPlatform(false)} />
    );
  }

  return (
    <div className="min-h-screen bg-[#060A15] text-white flex flex-col selection:bg-[#D9F22A] selection:text-[#060A15] relative overflow-hidden">
      {/* Background Decorative Ambient Blur Spots */}
      <div className="fixed top-0 left-1/4 w-[700px] h-[700px] bg-[#D9F22A]/[0.07] rounded-full blur-[160px] pointer-events-none -z-20" />
      <div className="fixed bottom-1/3 right-10 w-[600px] h-[600px] bg-[#D9F22A]/[0.05] rounded-full blur-[180px] pointer-events-none -z-20" />
      <div className="fixed top-2/3 left-10 w-[500px] h-[500px] bg-[#1e3a8a]/[0.08] rounded-full blur-[180px] pointer-events-none -z-20" />

      {/* Floating Quick Access to Platform Pill */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setViewPlatform(true)}
          className="group flex items-center gap-2.5 bg-[#080d1a]/90 hover:bg-[#080d1a] border-2 border-[#D9F22A] text-white rounded-full py-2.5 px-5 shadow-[0_0_30px_rgba(217,242,42,0.35)] backdrop-blur-md transition-all duration-300 hover:scale-105 cursor-pointer"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-[#D9F22A] animate-ping" />
          <LayoutDashboard className="w-4 h-4 text-[#D9F22A]" />
          <span className="text-xs font-black uppercase tracking-wider text-white">
            {isAuthenticated ? 'Meu Painel Techify' : 'Explorar Marketplace & Painel'}
          </span>
        </button>
      </div>

      {/* Main Header / Navigation */}
      <Header 
        onOpenModal={handleOpenModal} 
        onOpenPlatform={() => setViewPlatform(true)} 
      />

      {/* Main Content Sections */}
      <main className="flex-grow">
        <HeroSection 
          onOpenModal={handleOpenModal} 
          onOpenPlatform={() => setViewPlatform(true)} 
        />
        <StatsCounter />
        <AboutSection />
        <HowItWorksSection onOpenModal={handleOpenModal} />
        <SponsorshipsSection 
          onOpenPlatform={() => setViewPlatform(true)} 
          onOpenRegisterCompany={() => handleOpenModal('register_company')} 
        />
        <CultureBanner />
        <ResponsibleGamingSection onOpenModal={handleOpenModal} />
      </main>

      {/* Footer with Marquee & Links */}
      <FooterMarquee onOpenModal={handleOpenModal} />

      {/* Interactive Modals (Login, Register Affiliate, Register Company, Forgot Password) */}
      <Modals
        activeModal={activeModal}
        onClose={handleCloseModal}
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
