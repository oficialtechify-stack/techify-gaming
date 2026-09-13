import React, { useState, useEffect } from 'react';

export const CookieConsentBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    try {
      const consent = localStorage.getItem('cookie_consent');
      if (!consent) {
        setIsVisible(true);
      }
    } catch (_) {
      setIsVisible(true);
    }
  }, []);

  const handleAccept = () => {
    try {
      localStorage.setItem('cookie_consent', 'true');
    } catch (_) {}
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div
      id="cookie-banner"
      role="region"
      aria-label="Consentimento de Cookies"
      className="fixed bottom-0 left-0 right-0 z-50 bg-[#0b1329]/95 backdrop-blur-md border-t border-white/15 px-4 sm:px-6 py-4 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-in slide-in-from-bottom duration-300"
    >
      <div className="text-xs sm:text-sm text-white/90 text-center sm:text-left leading-relaxed">
        <span>
          Utilizamos cookies e tecnologias semelhantes para melhorar sua experiência, analisar o tráfego e personalizar a navegação na Leadspay. Ao continuar navegando, você concorda com nossos{' '}
        </span>
        <a
          href="/legal.html#termos"
          target="_blank"
          rel="noreferrer"
          className="text-[#D9F22A] underline hover:text-white transition-colors font-semibold"
          tabIndex={0}
        >
          Termos de Uso
        </a>
        <span> e </span>
        <a
          href="/legal.html#privacidade"
          target="_blank"
          rel="noreferrer"
          className="text-[#D9F22A] underline hover:text-white transition-colors font-semibold"
          tabIndex={0}
        >
          Política de Privacidade
        </a>
        <span> (</span>
        <a
          href="/legal.html#cookies"
          target="_blank"
          rel="noreferrer"
          className="text-[#D9F22A] underline hover:text-white transition-colors font-semibold"
          tabIndex={0}
        >
          Cookies
        </a>
        <span>).</span>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        <button
          onClick={handleAccept}
          tabIndex={0}
          className="bg-[#D9F22A] hover:bg-[#c8e217] text-[#060A15] font-black px-6 py-2 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer shadow-[0_0_15px_rgba(217,242,42,0.3)] hover:scale-105 active:scale-95"
        >
          Aceitar
        </button>
      </div>
    </div>
  );
};
