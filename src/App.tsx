import { useState } from 'react';
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

function MainApp() {
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [viewPlatform, setViewPlatform] = useState<boolean>(false);
  const { isAuthenticated } = useAuth();

  const handleOpenModal = (modal: ActiveModal) => {
    setActiveModal(modal);
  };

  const handleCloseModal = () => {
    setActiveModal(null);
  };

  const handleLoginSuccess = () => {
    setViewPlatform(true);
  };

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
