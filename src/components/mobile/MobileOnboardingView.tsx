import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowRight, 
  ArrowLeftRight, 
  Barcode, 
  KeyRound, 
  Megaphone, 
  BarChart3, 
  ShoppingCart 
} from 'lucide-react';
import { ActiveModal } from '../../types';
import slideAuraImg from '../../assets/images/mobile_slide_aura_1790171973818.jpg';
import slidePaymentImg from '../../assets/images/mobile_slide_payment_1790171940754.jpg';
import slideGolfImg from '../../assets/images/mobile_slide_golf_1790171956478.jpg';
import { 
  subscribeAuthModalSettings, 
  getLocalAuthModalSettings, 
  AuthModalSettings 
} from '../../services/firestoreService';

interface MobileOnboardingViewProps {
  onOpenModal: (modal: ActiveModal) => void;
  onOpenPlatform?: () => void;
}

export const MobileOnboardingView: React.FC<MobileOnboardingViewProps> = ({
  onOpenModal,
  onOpenPlatform
}) => {
  const [currentSlide, setCurrentSlide] = useState<number>(0);
  const [modalSettings, setModalSettings] = useState<AuthModalSettings>(() => getLocalAuthModalSettings());
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  // Escuta configurações do Firestore e localStorage em tempo real para as fotos de fundo
  useEffect(() => {
    const unsub = subscribeAuthModalSettings((data) => {
      if (data) {
        setModalSettings(data);
      }
    });

    const handleCustomEvent = (e: any) => {
      if (e?.detail) {
        setModalSettings(prev => ({ ...prev, ...e.detail }));
      }
    };
    window.addEventListener('leadspay_modal_backgrounds_updated', handleCustomEvent);

    return () => {
      unsub();
      window.removeEventListener('leadspay_modal_backgrounds_updated', handleCustomEvent);
    };
  }, []);

  // ⏱️ Auto-slide: Transição automática a cada 4.5 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev < 2 ? prev + 1 : 0));
    }, 4500);

    return () => clearInterval(interval);
  }, []);

  // Imagens dinâmicas com fallback para os assets padrões
  const bgSlide1 = modalSettings.mobileSlideAuraBgUrl || slideAuraImg;
  const bgSlide2 = modalSettings.mobileSlidePaymentBgUrl || slidePaymentImg;
  const bgSlide3 = modalSettings.mobileSlideCompanyBgUrl || slideGolfImg;

  // Touch swipe support
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
    const deltaY = e.changedTouches[0].clientY - touchStartYRef.current;

    // Apenas responde se o movimento horizontal for maior que o vertical
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 40) {
      if (deltaX < 0) {
        // Swipe para a esquerda (próximo slide)
        setCurrentSlide(prev => (prev < 2 ? prev + 1 : 0));
      } else {
        // Swipe para a direita (slide anterior)
        setCurrentSlide(prev => (prev > 0 ? prev - 1 : 2));
      }
    }

    touchStartXRef.current = null;
    touchStartYRef.current = null;
  };

  return (
    <div 
      className="relative w-full h-[100dvh] max-h-[100dvh] overflow-hidden bg-[#030605] text-white flex flex-col justify-between select-none touch-pan-y"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* 🖼️ BACKGROUND IMAGES COM TRANSIÇÃO SUAVE */}
      <div className="absolute inset-0 pointer-events-none -z-10 overflow-hidden">
        {/* Slide 1 Background */}
        <div 
          className={`absolute inset-0 bg-cover bg-center transition-opacity duration-700 ease-in-out ${
            currentSlide === 0 ? 'opacity-100 scale-100' : 'opacity-0 scale-105 pointer-events-none'
          }`}
          style={{ backgroundImage: `url(${bgSlide1})` }}
        >
          {/* Subtle cosmic aura glow effects */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/85" />
          <div className="absolute -top-10 -left-10 w-72 h-72 bg-[#D9F22A]/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-1/3 -right-20 w-80 h-80 bg-[#b5f617]/10 rounded-full blur-3xl pointer-events-none" />
        </div>

        {/* Slide 2 Background: Pague com simplicidade */}
        <div 
          className={`absolute inset-0 bg-cover bg-center transition-opacity duration-700 ease-in-out ${
            currentSlide === 1 ? 'opacity-100 scale-100' : 'opacity-0 scale-105 pointer-events-none'
          }`}
          style={{ backgroundImage: `url(${bgSlide2})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/25 to-black/90" />
        </div>

        {/* Slide 3 Background: Sua empresa vai mais longe */}
        <div 
          className={`absolute inset-0 bg-cover bg-center transition-opacity duration-700 ease-in-out ${
            currentSlide === 2 ? 'opacity-100 scale-100' : 'opacity-0 scale-105 pointer-events-none'
          }`}
          style={{ backgroundImage: `url(${bgSlide3})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/20 to-black/90" />
        </div>
      </div>

      {/* 🔝 CABEÇALHO COM A LOGO OFICIAL LEADSPAY (CENTRALIZADA) */}
      <header className="w-full pt-6 sm:pt-8 px-5 flex items-center justify-center z-20">
        <div className="flex items-center justify-center gap-2.5">
          {/* Símbolo dinâmico oficial */}
          <div className="relative w-8 h-8 flex items-center justify-center flex-shrink-0">
            <div className="absolute inset-0 bg-[#b5f617] rounded-full blur-md opacity-45" />
            <svg viewBox="0 0 100 100" className="w-full h-full relative z-10" fill="none">
              <path d="M50 48 C50 25 35 15 22 24 C10 33 18 52 42 50 Z" fill="#84cc16" />
              <path d="M52 48 C75 48 85 33 76 20 C67 8 48 16 50 40 Z" fill="#b5f617" />
              <path d="M50 52 C50 75 65 85 78 76 C90 67 82 48 58 50 Z" fill="#84cc16" />
              <path d="M48 52 C25 52 15 67 24 80 C33 92 52 84 50 60 Z" fill="#65a30d" />
              <circle cx="50" cy="50" r="7" fill="#d9f22a" />
            </svg>
          </div>

          {/* Nome da Marca LeadsPay com estilo idêntico ao print */}
          <div className="font-['Syne'] font-extrabold text-[27px] tracking-tight leading-none flex items-center">
            <span className="text-white">Leads</span>
            <span className="text-[#b5f617] drop-shadow-[0_0_12px_rgba(181,246,23,0.5)]">Pay</span>
          </div>
        </div>
      </header>

      {/* 📜 CONTEÚDO CENTRAL: TÍTULOS E HEADLINES POR SLIDE */}
      <div className="flex-1 flex flex-col justify-center px-6 z-20 py-2">
        {/* SLIDE 1: Seu crescimento começa aqui */}
        {currentSlide === 0 && (
          <div className="text-center animate-in fade-in duration-500 max-w-[340px] mx-auto">
            <h1 className="text-[34px] sm:text-[38px] font-black leading-[1.08] tracking-tight font-['Syne']">
              <span className="text-white block">Seu crescimento</span>
              <span className="text-[#b5f617] block">começa aqui.</span>
            </h1>
            <p className="text-white/80 text-[13px] sm:text-sm mt-3 leading-relaxed font-medium">
              Conectamos empresas e afiliados para transformar oportunidades em vendas.
            </p>
          </div>
        )}

        {/* SLIDE 2: Pague com simplicidade */}
        {currentSlide === 1 && (
          <div className="text-center animate-in fade-in duration-500 max-w-[340px] mx-auto">
            <h1 className="text-[34px] sm:text-[38px] font-black leading-[1.08] tracking-tight font-['Syne'] text-white">
              Pague com<br />simplicidade.
            </h1>
            <p className="text-white/80 text-[13px] sm:text-sm mt-2.5 leading-relaxed font-medium">
              Tudo para movimentar seu negócio.
            </p>
          </div>
        )}

        {/* SLIDE 3: Sua empresa vai mais longe */}
        {currentSlide === 2 && (
          <div className="text-center animate-in fade-in duration-500 max-w-[340px] mx-auto">
            <h1 className="text-[34px] sm:text-[38px] font-black leading-[1.08] tracking-tight font-['Syne']">
              <span className="text-white block">Sua empresa</span>
              <span className="text-[#b5f617] block">vai mais longe.</span>
            </h1>
          </div>
        )}
      </div>

      {/* 🎴 CARD FLUTUANTE INFERIOR: COMPACTO, TRANSLÚCIDO E COM BORDA VERDE NEON */}
      <div className="w-full px-4 sm:px-5 pb-3 sm:pb-5 z-20 flex flex-col items-center">
        {/* SLIDE 1 CARD: Bem-vindo à LeadsPay */}
        {currentSlide === 0 && (
          <div className="w-full max-w-[340px] animate-in fade-in slide-in-from-bottom-2 duration-300 flex flex-col items-center">
            <div className="w-full rounded-[24px] bg-black/45 border border-[#b5f617]/40 p-4 sm:p-5 shadow-[0_0_25px_rgba(181,246,23,0.15)] backdrop-blur-md">
              <div className="text-[10px] font-bold text-[#b5f617] uppercase tracking-[0.2em] mb-1 font-['Syne']">
                BEM-VINDO À LEADSPAY
              </div>
              <h2 className="text-[20px] sm:text-[22px] font-black text-white leading-tight font-['Syne']">
                Mais conexões.<br />Mais vendas.
              </h2>
              <p className="text-white/70 text-[11px] sm:text-xs leading-relaxed mt-1 mb-3.5 font-medium">
                Uma plataforma feita para quem acredita em grandes oportunidades.
              </p>
              {/* Botão 1: Acessar conta */}
              <button
                type="button"
                onClick={() => onOpenModal('login')}
                className="w-full py-2.5 sm:py-3 px-5 rounded-full bg-[#b5f617] hover:bg-[#c8ff21] active:scale-[0.98] text-[#050b07] font-black text-xs sm:text-sm font-['Syne'] flex items-center justify-center shadow-[0_4px_18px_rgba(181,246,23,0.35)] transition-all cursor-pointer mb-2"
              >
                Acessar conta
              </button>

              {/* Botão 2: Abrir uma conta */}
              <button
                type="button"
                onClick={() => onOpenModal('register_affiliate')}
                className="w-full py-2.5 sm:py-3 px-5 rounded-full border border-[#b5f617] bg-black/60 hover:bg-[#b5f617]/10 active:scale-[0.98] text-[#b5f617] font-bold text-xs sm:text-sm font-['Syne'] flex items-center justify-center transition-all cursor-pointer shadow-[0_0_12px_rgba(181,246,23,0.12)]"
              >
                Abrir uma conta
              </button>
            </div>
          </div>
        )}

        {/* SLIDE 2 CARD: Acesse sua conta (Ícones Pix, Transferir, Pagar, Token) */}
        {currentSlide === 1 && (
          <div className="w-full max-w-[340px] animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="w-full rounded-[24px] bg-black/45 border border-[#b5f617]/40 p-4 sm:p-5 shadow-[0_0_25px_rgba(181,246,23,0.15)] backdrop-blur-md">
              <h2 className="text-[20px] sm:text-[22px] font-black text-white leading-tight font-['Syne']">
                Acesse sua conta
              </h2>
              <p className="text-white/70 text-[11px] sm:text-xs leading-relaxed mt-0.5 mb-2.5 font-medium">
                Acompanhe vendas, Pix e saldo em um só lugar.
              </p>

              {/* 4 Círculos de recursos com traço verde neon */}
              <div className="grid grid-cols-4 gap-1.5 my-2.5">
                {/* 1. Transferir */}
                <button 
                  type="button"
                  onClick={() => onOpenModal('login')}
                  className="flex flex-col items-center gap-1 group cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-full border border-[#b5f617]/70 bg-black/50 flex items-center justify-center text-[#b5f617] group-hover:scale-105 group-hover:border-[#b5f617] transition-all">
                    <ArrowLeftRight className="w-4 h-4 stroke-[1.8]" />
                  </div>
                  <span className="text-[10px] text-white/80 font-medium text-center">Transferir</span>
                </button>

                {/* 2. Pagar */}
                <button 
                  type="button"
                  onClick={() => onOpenModal('login')}
                  className="flex flex-col items-center gap-1 group cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-full border border-[#b5f617]/70 bg-black/50 flex items-center justify-center text-[#b5f617] group-hover:scale-105 group-hover:border-[#b5f617] transition-all">
                    <Barcode className="w-4 h-4 stroke-[1.8]" />
                  </div>
                  <span className="text-[10px] text-white/80 font-medium text-center">Pagar</span>
                </button>

                {/* 3. Área Pix */}
                <button 
                  type="button"
                  onClick={() => onOpenModal('login')}
                  className="flex flex-col items-center gap-1 group cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-full border border-[#b5f617]/70 bg-black/50 flex items-center justify-center text-[#b5f617] group-hover:scale-105 group-hover:border-[#b5f617] transition-all">
                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-[#b5f617] stroke-[1.9]" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="5.5" y="5.5" width="6" height="6" rx="1.5" transform="rotate(45 8.5 8.5)" />
                      <rect x="12.5" y="12.5" width="6" height="6" rx="1.5" transform="rotate(45 15.5 15.5)" />
                      <rect x="12.5" y="5.5" width="6" height="6" rx="1.5" transform="rotate(45 15.5 8.5)" />
                      <rect x="5.5" y="12.5" width="6" height="6" rx="1.5" transform="rotate(45 8.5 15.5)" />
                    </svg>
                  </div>
                  <span className="text-[10px] text-white/80 font-medium text-center">Área Pix</span>
                </button>

                {/* 4. Token */}
                <button 
                  type="button"
                  onClick={() => onOpenModal('login')}
                  className="flex flex-col items-center gap-1 group cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-full border border-[#b5f617]/70 bg-black/50 flex items-center justify-center text-[#b5f617] group-hover:scale-105 group-hover:border-[#b5f617] transition-all">
                    <KeyRound className="w-4 h-4 stroke-[1.8]" />
                  </div>
                  <span className="text-[10px] text-white/80 font-medium text-center">Token</span>
                </button>
              </div>

              {/* Botão Acessar Conta */}
              <button
                type="button"
                onClick={() => onOpenModal('login')}
                className="w-full py-2.5 sm:py-3 px-5 rounded-full bg-[#b5f617] hover:bg-[#c8ff21] active:scale-[0.98] text-[#050b07] font-black text-xs sm:text-sm font-['Syne'] flex items-center justify-center shadow-[0_4px_18px_rgba(181,246,23,0.35)] transition-all cursor-pointer mb-2"
              >
                Acessar conta
              </button>

              {/* Botão Abrir uma conta */}
              <button
                type="button"
                onClick={() => onOpenModal('register_affiliate')}
                className="w-full py-2.5 sm:py-3 px-5 rounded-full border border-[#b5f617] bg-black/60 hover:bg-[#b5f617]/10 active:scale-[0.98] text-[#b5f617] font-bold text-xs sm:text-sm font-['Syne'] flex items-center justify-center transition-all cursor-pointer shadow-[0_0_12px_rgba(181,246,23,0.12)]"
              >
                Abrir uma conta
              </button>
            </div>
          </div>
        )}

        {/* SLIDE 3 CARD: Crescimento que você acompanha (Empresas e Startups) */}
        {currentSlide === 2 && (
          <div className="w-full max-w-[340px] animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="w-full rounded-[24px] bg-black/45 border border-[#b5f617]/40 p-4 sm:p-5 shadow-[0_0_25px_rgba(181,246,23,0.15)] backdrop-blur-md">
              <h2 className="text-[20px] sm:text-[22px] font-black text-white leading-tight font-['Syne']">
                Crescimento que você<br />acompanha.
              </h2>
              <p className="text-white/70 text-[11px] sm:text-xs leading-relaxed mt-0.5 mb-2.5 font-medium">
                Afiliados divulgam seus planos.<br />
                Você acompanha o alcance e cada venda.
              </p>

              {/* 3 Círculos: Divulgação, Alcance, Vendas */}
              <div className="grid grid-cols-3 gap-2 my-2.5">
                {/* Divulgação */}
                <button 
                  type="button"
                  onClick={() => onOpenModal('register_company')}
                  className="flex flex-col items-center gap-1 group cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-full border border-[#b5f617]/70 bg-black/50 flex items-center justify-center text-[#b5f617] group-hover:scale-105 group-hover:border-[#b5f617] transition-all">
                    <Megaphone className="w-4 h-4 stroke-[1.8]" />
                  </div>
                  <span className="text-[10px] text-white/80 font-medium text-center">Divulgação</span>
                </button>

                {/* Alcance */}
                <button 
                  type="button"
                  onClick={() => onOpenModal('register_company')}
                  className="flex flex-col items-center gap-1 group cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-full border border-[#b5f617]/70 bg-black/50 flex items-center justify-center text-[#b5f617] group-hover:scale-105 group-hover:border-[#b5f617] transition-all">
                    <BarChart3 className="w-4 h-4 stroke-[1.8]" />
                  </div>
                  <span className="text-[10px] text-white/80 font-medium text-center">Alcance</span>
                </button>

                {/* Vendas */}
                <button 
                  type="button"
                  onClick={() => onOpenModal('register_company')}
                  className="flex flex-col items-center gap-1 group cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-full border border-[#b5f617]/70 bg-black/50 flex items-center justify-center text-[#b5f617] group-hover:scale-105 group-hover:border-[#b5f617] transition-all">
                    <ShoppingCart className="w-4 h-4 stroke-[1.8]" />
                  </div>
                  <span className="text-[10px] text-white/80 font-medium text-center">Vendas</span>
                </button>
              </div>

              {/* Botão Acessar Conta */}
              <button
                type="button"
                onClick={() => onOpenModal('login')}
                className="w-full py-2.5 sm:py-3 px-5 rounded-full bg-[#b5f617] hover:bg-[#c8ff21] active:scale-[0.98] text-[#050b07] font-black text-xs sm:text-sm font-['Syne'] flex items-center justify-center shadow-[0_4px_18px_rgba(181,246,23,0.35)] transition-all cursor-pointer mb-2"
              >
                Acessar conta
              </button>

              {/* Botão Abrir uma conta */}
              <button
                type="button"
                onClick={() => onOpenModal('register_company')}
                className="w-full py-2.5 sm:py-3 px-5 rounded-full border border-[#b5f617] bg-black/60 hover:bg-[#b5f617]/10 active:scale-[0.98] text-[#b5f617] font-bold text-xs sm:text-sm font-['Syne'] flex items-center justify-center transition-all cursor-pointer shadow-[0_0_12px_rgba(181,246,23,0.12)]"
              >
                Abrir uma conta
              </button>
            </div>
          </div>
        )}

        {/* 🔘 INDICADORES DE PAGINAÇÃO (3 PONTOS NO RODAPÉ) */}
        <div className="flex items-center justify-center gap-2.5 mt-3 pt-1">
          <button 
            type="button"
            onClick={() => setCurrentSlide(0)}
            aria-label="Ir para slide 1"
            className={`transition-all rounded-full cursor-pointer ${
              currentSlide === 0 
                ? 'w-2.5 h-2.5 bg-[#b5f617] shadow-[0_0_10px_#b5f617]' 
                : 'w-2 h-2 bg-white/25 hover:bg-white/40'
            }`}
          />
          <button 
            type="button"
            onClick={() => setCurrentSlide(1)}
            aria-label="Ir para slide 2"
            className={`transition-all rounded-full cursor-pointer ${
              currentSlide === 1 
                ? 'w-2.5 h-2.5 bg-[#b5f617] shadow-[0_0_10px_#b5f617]' 
                : 'w-2 h-2 bg-white/25 hover:bg-white/40'
            }`}
          />
          <button 
            type="button"
            onClick={() => setCurrentSlide(2)}
            aria-label="Ir para slide 3"
            className={`transition-all rounded-full cursor-pointer ${
              currentSlide === 2 
                ? 'w-2.5 h-2.5 bg-[#b5f617] shadow-[0_0_10px_#b5f617]' 
                : 'w-2 h-2 bg-white/25 hover:bg-white/40'
            }`}
          />
        </div>
      </div>
    </div>
  );
};
