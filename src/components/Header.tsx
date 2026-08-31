import React, { useState } from 'react';
import { ActiveModal } from '../types';
import { TechifyLogo } from './TechifyLogo';
import { LayoutDashboard, ArrowRight } from 'lucide-react';

interface HeaderProps {
  onOpenModal: (modal: ActiveModal) => void;
  onOpenPlatform?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenModal, onOpenPlatform }) => {
  const [popupActive, setPopupActive] = useState(false);

  const handleNavClick = (sectionId: string) => {
    setPopupActive(false);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <>
      <header className="elementor-element sticky top-0 z-50 w-full bg-[#060A15]/95 backdrop-blur-md border-b border-white/5 transition-all">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 h-[88px] flex items-center justify-between">
          {/* Logo - Techify */}
          <div className="elementor-widget-image">
            <a 
              href="#home" 
              onClick={(e) => {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="block focus:outline-none hover:opacity-95 transition-opacity"
            >
              <TechifyLogo size="md" />
            </a>
          </div>

          {/* Desktop Nav Menu */}
          <nav className="hidden lg:flex items-center gap-7" aria-label="Menu Principal">
            <a
              href="#home"
              onClick={(e) => {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="text-white text-xs uppercase tracking-wider font-bold hover:text-[#D9F22A] transition-colors py-1"
            >
              Início
            </a>
            <a
              href="#sobre"
              onClick={(e) => {
                e.preventDefault();
                handleNavClick('sobre');
              }}
              className="text-white/80 text-xs uppercase tracking-wider font-bold hover:text-[#D9F22A] transition-colors py-1 cursor-pointer"
            >
              O Que Fazemos
            </a>
            <a
              href="#como-funciona"
              onClick={(e) => {
                e.preventDefault();
                handleNavClick('como-funciona');
              }}
              className="text-white/80 text-xs uppercase tracking-wider font-bold hover:text-[#D9F22A] transition-colors py-1 cursor-pointer"
            >
              Como Funciona
            </a>
            <a
              href="#categorias"
              onClick={(e) => {
                e.preventDefault();
                handleNavClick('categorias');
              }}
              className="text-white/80 text-xs uppercase tracking-wider font-bold hover:text-[#D9F22A] transition-colors py-1 cursor-pointer"
            >
              Startups & Planos
            </a>
            <a
              href="#tecnologia"
              onClick={(e) => {
                e.preventDefault();
                handleNavClick('tecnologia');
              }}
              className="text-white/80 text-xs uppercase tracking-wider font-bold hover:text-[#D9F22A] transition-colors py-1 cursor-pointer"
            >
              Tecnologia & PIX
            </a>
          </nav>

          {/* Action Buttons: Acessar Plataforma & Entrar */}
          <div className="hidden lg:flex items-center gap-3">
            {onOpenPlatform && (
              <button
                onClick={onOpenPlatform}
                className="group inline-flex items-center gap-2 bg-[#D9F22A] hover:bg-[#cbe31c] text-[#060A15] font-black rounded-full py-2.5 px-4 text-xs uppercase tracking-wider transition-all duration-300 shadow-[0_0_20px_rgba(217,242,42,0.3)] cursor-pointer"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Abrir Plataforma</span>
              </button>
            )}

            <button
              onClick={() => onOpenModal('login')}
              className="group inline-flex items-center gap-2.5 bg-transparent hover:bg-white/[0.04] border border-white/20 hover:border-[#D9F22A] rounded-full py-2.5 px-4 transition-all duration-300 focus:outline-none cursor-pointer"
              aria-label="Entrar na conta"
            >
              <span className="w-5 h-5 rounded-full bg-white/10 group-hover:bg-[#D9F22A] text-white group-hover:text-[#060A15] flex items-center justify-center flex-shrink-0 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              </span>
              <span className="text-xs font-bold text-white tracking-wide">
                Entrar
              </span>
            </button>
          </div>

          {/* Mobile Hamburger Button */}
          <div className="lg:hidden">
            <button
              onClick={() => setPopupActive(true)}
              className="p-1 text-white hover:text-[#D9F22A] transition-colors focus:outline-none cursor-pointer"
              aria-label="Abrir Menu"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 46 46" fill="none">
                <path d="M9.58331 13.417H36.4166" stroke="white" strokeWidth="2.875" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M9.58331 23H36.4166" stroke="white" strokeWidth="2.875" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M9.58331 32.583H36.4166" stroke="white" strokeWidth="2.875" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Popup Overlay */}
      {popupActive && (
        <div className="fixed inset-0 z-50 bg-[#060A15] p-6 flex flex-col justify-between animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <TechifyLogo size="sm" />
            <button
              onClick={() => setPopupActive(false)}
              className="p-2 text-white/80 hover:text-white focus:outline-none cursor-pointer"
              aria-label="Fechar Menu"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 17 18" fill="none">
                <path d="M15.9246 15.0103L2.48958 1.57527C2.09905 1.18475 1.46589 1.18475 1.07536 1.57527C0.68484 1.9658 0.68484 2.59896 1.07536 2.98948L14.5104 16.4245C14.9009 16.815 15.5341 16.815 15.9246 16.4245C16.3151 16.034 16.3151 15.4008 15.9246 15.0103Z" fill="white" />
                <path d="M14.5103 1.57564L1.07527 15.0107C0.684746 15.4012 0.684747 16.0344 1.07527 16.4249C1.4658 16.8154 2.09896 16.8154 2.48949 16.4249L15.9245 2.98985C16.315 2.59933 16.315 1.96616 15.9245 1.57564C15.534 1.18511 14.9008 1.18511 14.5103 1.57564Z" fill="white" />
              </svg>
            </button>
          </div>

          <nav className="flex flex-col gap-5 text-xl font-bold text-white my-auto">
            <a
              href="#home"
              onClick={(e) => {
                e.preventDefault();
                setPopupActive(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="text-[#D9F22A]"
            >
              Início
            </a>
            <button
              onClick={() => handleNavClick('sobre')}
              className="text-left text-white/90 hover:text-[#D9F22A] cursor-pointer"
            >
              O Que Fazemos
            </button>
            <button
              onClick={() => handleNavClick('como-funciona')}
              className="text-left text-white/90 hover:text-[#D9F22A] cursor-pointer"
            >
              Como Funciona
            </button>
            <button
              onClick={() => handleNavClick('categorias')}
              className="text-left text-white/90 hover:text-[#D9F22A] cursor-pointer"
            >
              Startups & Planos
            </button>
            <button
              onClick={() => handleNavClick('tecnologia')}
              className="text-left text-white/90 hover:text-[#D9F22A] cursor-pointer"
            >
              Tecnologia & Split
            </button>
          </nav>

          <div className="flex flex-col gap-3 pt-6 border-t border-white/10">
            {onOpenPlatform && (
              <button
                onClick={() => {
                  setPopupActive(false);
                  onOpenPlatform();
                }}
                className="w-full flex items-center justify-center gap-2 bg-[#D9F22A] text-[#060A15] font-black rounded-full py-3.5 px-5 cursor-pointer uppercase tracking-wider text-xs"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Abrir Plataforma Techify</span>
              </button>
            )}

            <button
              onClick={() => {
                setPopupActive(false);
                onOpenModal('login');
              }}
              className="w-full flex items-center justify-center gap-2 bg-transparent border border-white/20 text-white font-bold rounded-full py-3 px-5 cursor-pointer hover:bg-white/5 transition-colors text-xs uppercase"
            >
              <span>Entrar na Conta</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
};


