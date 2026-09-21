import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ActiveModal } from '../types';
import { 
  ArrowRight, 
  Building2, 
  Users, 
  Zap, 
  Check, 
  ChevronRight, 
  ChevronDown,
  UserCheck, 
  Sparkles,
  Wifi,
  Battery,
  X,
  ExternalLink
} from 'lucide-react';

interface HeroSectionProps {
  onOpenModal: (modal: ActiveModal) => void;
  onOpenPlatform?: () => void;
}

type PillarType = 'empresas' | 'afiliados' | 'split' | null;

export const HeroSection: React.FC<HeroSectionProps> = ({ onOpenModal, onOpenPlatform }) => {
  const [registerDropdownOpen, setRegisterDropdownOpen] = useState(false);
  const [activePillar, setActivePillar] = useState<PillarType>(null);
  const expandedSectionRef = useRef<HTMLDivElement>(null);

  const handleTogglePillar = (pillar: 'empresas' | 'afiliados' | 'split') => {
    if (activePillar === pillar) {
      setActivePillar(null);
    } else {
      setActivePillar(pillar);
      setTimeout(() => {
        if (expandedSectionRef.current) {
          expandedSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 100);
    }
  };

  return (
    <section id="home" className="relative pt-2 pb-8 sm:pt-4 sm:pb-12 md:pt-6 md:pb-14 overflow-x-clip bg-[#05080E]">
      {/* Background glow orbs with responsive sizing */}
      <div className="absolute top-1/4 -left-20 w-[240px] sm:w-[450px] h-[240px] sm:h-[450px] bg-[#D9F22A]/[0.05] rounded-full blur-[90px] sm:blur-[130px] pointer-events-none -z-10" />
      <div className="absolute top-1/3 right-0 w-[280px] sm:w-[500px] h-[280px] sm:h-[500px] bg-[#D9F22A]/[0.07] rounded-full blur-[100px] sm:blur-[140px] pointer-events-none -z-10" />
      <div className="absolute -bottom-20 left-1/3 w-[250px] sm:w-[400px] h-[250px] sm:h-[300px] bg-[#0A1224]/[0.35] rounded-full blur-[80px] sm:blur-[110px] pointer-events-none -z-10" />

      <div className="max-w-[1240px] mx-auto px-3 sm:px-6 lg:px-8 relative z-10">
        
        {/* Main 2-Column Grid: Left (Typography & CTAs) + Right (3D Device) - Side-by-side on tablet (md:) and desktop */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 md:gap-6 lg:gap-8 items-center pt-1 sm:pt-3">
          
          {/* LEFT COLUMN: Hero Headline & Action Controls */}
          <div className="md:col-span-7 flex flex-col justify-center text-left">
            
            {/* Top Category Tag */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="flex items-center gap-1.5 mb-2 sm:mb-3"
            >
              <span className="text-[#D9F22A] text-[10px] sm:text-xs md:text-xs font-black tracking-[0.16em] sm:tracking-[0.2em] uppercase font-['Syne']">
                PAGAMENTOS &nbsp;•&nbsp; AFILIAÇÃO &nbsp;•&nbsp; ESCALA
              </span>
            </motion.div>

            {/* Main Headline - Compact and proportional */}
            <motion.h1
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-[26px] xs:text-[30px] sm:text-[36px] md:text-[38px] lg:text-[48px] xl:text-[56px] font-black tracking-tight leading-[1.08] sm:leading-[1.05] font-['Syne'] mb-2 sm:mb-3"
            >
              <span className="text-white block">
                Venda mais.
              </span>
              <span className="text-[#D9F22A] block drop-shadow-[0_0_30px_rgba(217,242,42,0.22)]">
                Receba melhor.
              </span>
            </motion.h1>

            {/* Sub-headline Narrative */}
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="text-white/75 text-xs sm:text-sm md:text-base font-normal leading-relaxed max-w-lg mb-3.5 sm:mb-5"
            >
              Pagamentos, afiliados e comissões em uma única plataforma — simples, rápida e segura.
            </motion.p>

            {/* Action Buttons: Always side-by-side in a compact row */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex flex-row items-center gap-2 sm:gap-3 mb-3.5 sm:mb-5 relative"
            >
              {/* Primary Button: Começar agora */}
              <div className="relative">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setRegisterDropdownOpen(!registerDropdownOpen)}
                  className="bg-[#D9F22A] hover:bg-[#cde624] text-[#060A15] font-black py-2.5 px-4 sm:py-3 sm:px-6 rounded-full text-xs sm:text-sm flex items-center gap-2 shadow-[0_0_25px_rgba(217,242,42,0.3)] transition-all cursor-pointer whitespace-nowrap"
                >
                  <span>Começar agora</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#060A15] stroke-[2.5]" />
                </motion.button>

                {/* Dropdown Options */}
                {registerDropdownOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: -6, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-0 mt-2 w-64 bg-[#080d1a] border border-white/15 rounded-2xl p-1.5 shadow-2xl z-50 backdrop-blur-xl"
                  >
                    <button
                      onClick={() => {
                        setRegisterDropdownOpen(false);
                        onOpenModal('register_affiliate');
                      }}
                      className="w-full p-2 rounded-xl hover:bg-white/5 text-left flex items-center gap-2 text-xs text-white font-bold cursor-pointer transition-colors"
                    >
                      <div className="w-7 h-7 rounded-lg bg-[#D9F22A]/10 text-[#D9F22A] flex items-center justify-center flex-shrink-0">
                        <UserCheck className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="text-white font-bold text-xs">Sou Afiliado</div>
                        <div className="text-[10px] text-white/50 font-normal">Quero vender e lucrar</div>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        setRegisterDropdownOpen(false);
                        onOpenModal('register_company');
                      }}
                      className="w-full p-2 rounded-xl hover:bg-white/5 text-left flex items-center gap-2 text-xs text-white font-bold cursor-pointer transition-colors mt-1"
                    >
                      <div className="w-7 h-7 rounded-lg bg-[#D9F22A]/10 text-[#D9F22A] flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="text-white font-bold text-xs">Sou Empresa / Startup</div>
                        <div className="text-[10px] text-white/50 font-normal">Cadastrar produtos</div>
                      </div>
                    </button>
                  </motion.div>
                )}
              </div>

              {/* Secondary Button: Acessar painel */}
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={onOpenPlatform || (() => onOpenModal('login'))}
                className="bg-[#090e18]/80 hover:bg-[#121a2c]/80 text-white font-semibold py-2.5 px-4 sm:py-3 sm:px-5 rounded-full text-xs sm:text-sm border border-white/20 hover:border-white/40 transition-all cursor-pointer backdrop-blur-md whitespace-nowrap"
              >
                <span>Acessar painel</span>
              </motion.button>
            </motion.div>

            {/* 3 Bullets with Checkmark */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.25 }}
              className="flex flex-wrap items-center gap-2.5 sm:gap-4 text-[10px] sm:text-xs text-white/70 font-medium"
            >
              <div className="flex items-center gap-1.5">
                <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#D9F22A] stroke-[3] flex-shrink-0" />
                <span>Split automático</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#D9F22A] stroke-[3] flex-shrink-0" />
                <span>Saques via PIX</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#D9F22A] stroke-[3] flex-shrink-0" />
                <span>Gestão em tempo real</span>
              </div>
            </motion.div>

            {/* MOBILE ONLY: Organised highlight card in place of the smartphone */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.28 }}
              className="block md:hidden mt-4 rounded-2xl bg-gradient-to-b from-[#0e1628]/95 to-[#070b14]/95 border border-white/10 p-3.5 shadow-xl backdrop-blur-xl"
            >
              {/* Top Badge & Live Indicator */}
              <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-white/10">
                <div className="flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D9F22A] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#D9F22A]"></span>
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#D9F22A] font-['Syne']">
                    ECOSSISTEMA LEADSPAY
                  </span>
                </div>
                <span className="text-[10px] text-white/60 font-medium">PIX Instantâneo</span>
              </div>

              {/* Headline & Summary */}
              <h2 className="text-[13px] font-bold text-white font-['Syne'] mb-1">
                Infraestrutura completa de pagamentos e afiliação
              </h2>
              <p className="text-[11px] text-white/70 leading-relaxed mb-3">
                Cadastre produtos, defina comissões e receba suas vendas com divisão automática e saques rápidos em D+9.
              </p>

              {/* 3 Quick highlights */}
              <div className="space-y-1.5 mb-3">
                <div className="flex items-start gap-2 p-2 rounded-xl bg-white/[0.03] border border-white/5">
                  <div className="w-6 h-6 rounded-lg bg-[#D9F22A]/10 text-[#D9F22A] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Zap className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Split Automático Inteligente</div>
                    <div className="text-[10px] text-white/60 leading-tight">Divisão imediata entre produtor e afiliados a cada venda.</div>
                  </div>
                </div>

                <div className="flex items-start gap-2 p-2 rounded-xl bg-white/[0.03] border border-white/5">
                  <div className="w-6 h-6 rounded-lg bg-[#D9F22A]/10 text-[#D9F22A] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Users className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Rede Ativa de Afiliados</div>
                    <div className="text-[10px] text-white/60 leading-tight">Vendedores prontos para escalar a distribuição do seu produto.</div>
                  </div>
                </div>

                <div className="flex items-start gap-2 p-2 rounded-xl bg-white/[0.03] border border-white/5">
                  <div className="w-6 h-6 rounded-lg bg-[#D9F22A]/10 text-[#D9F22A] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Saques Descomplicados via PIX</div>
                    <div className="text-[10px] text-white/60 leading-tight">Liquidação rápida em D+9 sem travas burocráticas ou taxas ocultas.</div>
                  </div>
                </div>
              </div>

              {/* Trust Numbers / Mini Metrics Grid */}
              <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-white/10 text-center">
                <div className="p-1.5 rounded-lg bg-white/[0.02]">
                  <div className="text-xs font-black text-[#D9F22A] font-['Syne']">99.8%</div>
                  <div className="text-[9px] text-white/50">Aprovação</div>
                </div>
                <div className="p-1.5 rounded-lg bg-white/[0.02]">
                  <div className="text-xs font-black text-[#D9F22A] font-['Syne']">D+9</div>
                  <div className="text-[9px] text-white/50">Saque PIX</div>
                </div>
                <div className="p-1.5 rounded-lg bg-white/[0.02]">
                  <div className="text-xs font-black text-[#D9F22A] font-['Syne']">Zero</div>
                  <div className="text-[9px] text-white/50">Mensalidade</div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* RIGHT COLUMN: 3D Smartphone on Podium with Proportional Sizing - ONLY ON DESKTOP AND TABLET (hidden on mobile) */}
          <div className="hidden md:flex md:col-span-5 relative items-center justify-center md:min-h-[380px] lg:min-h-[460px] w-full max-w-full overflow-visible py-2">
            
            {/* Luminous Neon Green Laser Curved Trails */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-visible">
              <svg 
                className="w-[110%] sm:w-[120%] h-[110%] sm:h-[120%] -translate-y-1 opacity-80 overflow-visible"
                viewBox="0 0 500 500" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <filter id="neonGlowWide" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="7" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  <filter id="neonGlowIntense" x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur stdDeviation="12" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  <linearGradient id="laserGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#D9F22A" stopOpacity="0.2" />
                    <stop offset="40%" stopColor="#D9F22A" stopOpacity="0.9" />
                    <stop offset="70%" stopColor="#c8f135" stopOpacity="1" />
                    <stop offset="100%" stopColor="#D9F22A" stopOpacity="0.1" />
                  </linearGradient>
                </defs>

                {/* Ribbon 1: Behind phone */}
                <path
                  d="M 380 420 C 460 360 480 230 430 140 C 390 60 310 40 280 80 C 240 130 250 220 220 310 C 190 390 120 420 70 380"
                  stroke="url(#laserGrad)"
                  strokeWidth="4"
                  strokeLinecap="round"
                  filter="url(#neonGlowIntense)"
                  opacity="0.35"
                />
                <path
                  d="M 380 420 C 460 360 480 230 430 140 C 390 60 310 40 280 80 C 240 130 250 220 220 310 C 190 390 120 420 70 380"
                  stroke="#D9F22A"
                  strokeWidth="2"
                  strokeLinecap="round"
                  filter="url(#neonGlowWide)"
                />

                {/* Ribbon 2: Wrap-around orbit loop */}
                <path
                  d="M 60 340 C 40 220 180 160 270 200 C 380 250 440 370 370 420 C 300 460 170 450 120 400"
                  stroke="#D9F22A"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  opacity="0.75"
                  filter="url(#neonGlowWide)"
                />
              </svg>
            </div>

            {/* 3D Cylindrical Dark Stage Podium (Base of smartphone) */}
            <div className="absolute bottom-2 sm:bottom-4 w-40 xs:w-48 sm:w-56 md:w-60 h-14 sm:h-18 pointer-events-none flex flex-col items-center justify-center">
              {/* Lower Tier */}
              <div className="absolute bottom-0 w-40 xs:w-48 sm:w-56 md:w-60 h-8 sm:h-11 rounded-[100%] bg-gradient-to-b from-[#101828] to-[#05070d] border border-white/10 shadow-[0_10px_20px_rgba(0,0,0,0.85)]" />
              {/* Top Tier with glowing neon rim */}
              <div className="absolute bottom-2 sm:bottom-3 w-34 xs:w-40 sm:w-48 md:w-52 h-8 sm:h-11 rounded-[100%] bg-gradient-to-b from-[#182338] to-[#070b14] border-t-2 border-[#D9F22A]/90 shadow-[0_0_20px_rgba(217,242,42,0.35)]" />
              <div className="absolute bottom-4 sm:bottom-5 w-30 xs:w-36 sm:w-44 md:w-48 h-6 sm:h-8 rounded-[100%] bg-[#080d1a] border-t border-[#D9F22A]/40" />
            </div>

            {/* THE SMARTPHONE: Compact and scalable */}
            <motion.div
              initial={{ opacity: 0, y: 20, rotate: -1.5 }}
              animate={{ opacity: 1, y: 0, rotate: -1 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -3, rotate: 0, transition: { duration: 0.2 } }}
              className="relative z-20 w-[155px] xs:w-[175px] sm:w-[195px] md:w-[215px] lg:w-[250px] h-[310px] xs:h-[350px] sm:h-[390px] md:h-[430px] lg:h-[490px] rounded-[28px] xs:rounded-[32px] sm:rounded-[36px] md:rounded-[42px] bg-[#070a12] border-[3px] sm:border-[4px] border-[#222b3d] shadow-[0_20px_45px_-10px_rgba(0,0,0,0.95),0_0_30px_rgba(217,242,42,0.1)] flex flex-col overflow-hidden select-none"
            >
              {/* Metallic Phone Outer Rim Highlight */}
              <div className="absolute inset-0 rounded-[26px] xs:rounded-[30px] sm:rounded-[34px] md:rounded-[38px] border border-white/15 pointer-events-none" />

              {/* Dynamic Island / Notch Bar */}
              <div className="relative pt-2 sm:pt-2.5 pb-1 px-3 sm:px-4 flex items-center justify-between z-10">
                <span className="text-white text-[9px] xs:text-[10px] font-bold tracking-tight">9:41</span>
                <div className="w-12 xs:w-14 sm:w-16 h-3 sm:h-3.5 bg-black rounded-full mx-auto" />
                <div className="flex items-center gap-1 text-white">
                  <Wifi className="w-2.5 h-2.5" />
                  <Battery className="w-3 h-3" />
                </div>
              </div>

              {/* Phone Content Screen */}
              <div className="flex-1 flex flex-col items-center justify-between px-3 sm:px-4 pt-1.5 sm:pt-2 pb-3 sm:pb-4 text-center relative z-10">
                
                {/* Brand Header */}
                <div className="flex items-center gap-1.5 mt-0.5 sm:mt-1">
                  <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-md bg-[#D9F22A] flex items-center justify-center">
                    <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-black" />
                  </div>
                  <div className="text-left">
                    <div className="text-white font-black text-[9px] xs:text-[10px] sm:text-xs tracking-wider leading-none font-['Syne']">LEADSPAY</div>
                    <div className="text-[6px] xs:text-[7px] text-white/50 font-bold uppercase tracking-widest leading-none mt-0.5">PAYMENTS & SPLIT</div>
                  </div>
                </div>

                {/* Central Status: Glowing Circle with Check */}
                <div className="my-auto flex flex-col items-center">
                  <div className="relative mb-2 sm:mb-3">
                    {/* Glowing Aura Ring */}
                    <div className="absolute -inset-1.5 rounded-full bg-[#D9F22A]/20 blur-sm animate-pulse" />
                    {/* Circle */}
                    <div className="w-11 h-11 xs:w-13 xs:h-13 sm:w-15 sm:h-15 rounded-full border-2 border-[#D9F22A] bg-gradient-to-b from-[#162916] to-[#0b170c] flex items-center justify-center shadow-[0_0_20px_rgba(217,242,42,0.35)]">
                      <Check className="w-5 h-5 xs:w-6 xs:h-6 sm:w-7 sm:h-7 text-[#D9F22A] stroke-[3]" />
                    </div>
                  </div>

                  {/* Status Label */}
                  <span className="text-zinc-400 text-[9px] xs:text-[10px] sm:text-xs font-medium mb-0.5">
                    Pagamento aprovado
                  </span>

                  {/* Price Amount */}
                  <span className="text-white font-black text-base xs:text-lg sm:text-xl md:text-2xl tracking-tight font-['Syne']">
                    R$ 297,00
                  </span>
                </div>

                {/* "Ver detalhes" Pill Button */}
                <button
                  type="button"
                  onClick={onOpenPlatform || (() => onOpenModal('login'))}
                  className="w-full py-1.5 sm:py-2 px-3 sm:px-4 rounded-full bg-[#D9F22A] hover:bg-[#cde624] text-black font-black text-[9px] xs:text-[10px] sm:text-xs uppercase tracking-wider shadow-[0_0_12px_rgba(217,242,42,0.2)] transition-all cursor-pointer"
                >
                  Ver detalhes
                </button>
              </div>

              {/* Bottom Home Indicator Bar */}
              <div className="pb-1 sm:pb-1.5 flex justify-center">
                <div className="w-16 sm:w-20 h-1 bg-white/30 rounded-full" />
              </div>
            </motion.div>

            {/* FLOATING CARD 1 (LEFT): Tucked in snugly */}
            <motion.div
              initial={{ opacity: 0, x: -10, y: 10 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="absolute left-[-4px] xs:left-[-2px] sm:-left-3 md:-left-5 lg:-left-8 top-[18%] sm:top-[22%] z-30 bg-[#090e18]/90 backdrop-blur-xl border border-white/15 rounded-xl p-1.5 xs:p-2 sm:p-2.5 shadow-[0_10px_25px_rgba(0,0,0,0.8)] flex flex-col gap-0.5 pointer-events-auto scale-80 xs:scale-90 sm:scale-95 md:scale-100 origin-left"
            >
              <div className="w-4 h-4 xs:w-5 xs:h-5 rounded-full border border-[#D9F22A] flex items-center justify-center text-[#D9F22A]">
                <Check className="w-2.5 h-2.5 xs:w-3 xs:h-3 stroke-[3]" />
              </div>
              <div>
                <div className="text-zinc-400 text-[8px] xs:text-[9px] sm:text-[10px] font-medium leading-tight">Pagamento aprovado</div>
                <div className="text-white font-black text-[10px] xs:text-xs sm:text-sm font-['Syne']">R$ 297,00</div>
              </div>
            </motion.div>

            {/* FLOATING CARD 2 (RIGHT): Tucked in snugly */}
            <motion.div
              initial={{ opacity: 0, x: 10, y: -10 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              transition={{ duration: 0.6, delay: 0.35 }}
              className="absolute right-[-4px] xs:right-[-2px] sm:-right-3 md:-right-5 lg:-right-8 top-[28%] sm:top-[32%] z-30 bg-[#090e18]/90 backdrop-blur-xl border border-white/15 rounded-xl p-1.5 xs:p-2 sm:p-2.5 shadow-[0_10px_25px_rgba(0,0,0,0.8)] flex items-center gap-1.5 sm:gap-2 pointer-events-auto scale-80 xs:scale-90 sm:scale-95 md:scale-100 origin-right"
            >
              <div className="w-4 h-4 xs:w-5 xs:h-5 rounded-full border border-[#D9F22A] flex items-center justify-center text-[#D9F22A] flex-shrink-0">
                <Check className="w-2.5 h-2.5 xs:w-3 xs:h-3 stroke-[3]" />
              </div>
              <div className="text-left overflow-hidden">
                <div className="text-zinc-400 text-[8px] xs:text-[9px] sm:text-[10px] font-medium truncate">Comissão recebida</div>
                <div className="text-white font-black text-[10px] xs:text-xs sm:text-sm font-['Syne']">R$ 80,00</div>
                <div className="text-[#D9F22A] text-[7px] xs:text-[8px] sm:text-[9px] font-bold">via PIX</div>
              </div>
              <ChevronRight className="w-3 h-3 text-white/40 hidden xs:block" />
            </motion.div>

          </div>
        </div>

        {/* BOTTOM ROW: The 3 Interactive Pill Cards - Rendered 3-column in a compact horizontal bar */}
        <div className="mt-6 sm:mt-8 pt-1">
          
          <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:gap-5">
            
            {/* Pill Card 1: Para empresas */}
            <button
              type="button"
              onClick={() => handleTogglePillar('empresas')}
              className={`w-full group rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 lg:p-4 flex items-center justify-between transition-all duration-300 cursor-pointer backdrop-blur-md shadow-md border text-left ${
                activePillar === 'empresas'
                  ? 'bg-[#0e1628] border-[#D9F22A] shadow-[0_0_20px_rgba(217,242,42,0.22)] ring-1 ring-[#D9F22A]'
                  : 'bg-[#080d19]/80 hover:bg-[#0d1527] border-white/10 hover:border-[#D9F22A]/40'
              }`}
            >
              <div className="flex items-center gap-2 sm:gap-3 overflow-hidden">
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl border flex items-center justify-center flex-shrink-0 transition-transform duration-300 ${
                  activePillar === 'empresas' 
                    ? 'border-[#D9F22A] bg-[#D9F22A]/20 text-[#D9F22A] scale-105' 
                    : 'border-[#D9F22A]/70 bg-[#D9F22A]/5 text-[#D9F22A] group-hover:scale-105'
                }`}>
                  <Building2 className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="overflow-hidden">
                  <span className={`block font-bold text-[11px] xs:text-xs sm:text-sm lg:text-base font-['Syne'] truncate transition-colors ${
                    activePillar === 'empresas' ? 'text-[#D9F22A]' : 'text-white group-hover:text-[#D9F22A]'
                  }`}>
                    Para empresas
                  </span>
                </div>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0 transition-transform duration-300 ${
                activePillar === 'empresas' ? 'rotate-180 text-[#D9F22A]' : 'text-white/40 group-hover:text-white'
              }`} />
            </button>

            {/* Pill Card 2: Para afiliados */}
            <button
              type="button"
              onClick={() => handleTogglePillar('afiliados')}
              className={`w-full group rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 lg:p-4 flex items-center justify-between transition-all duration-300 cursor-pointer backdrop-blur-md shadow-md border text-left ${
                activePillar === 'afiliados'
                  ? 'bg-[#0e1628] border-[#D9F22A] shadow-[0_0_20px_rgba(217,242,42,0.22)] ring-1 ring-[#D9F22A]'
                  : 'bg-[#080d19]/80 hover:bg-[#0d1527] border-white/10 hover:border-[#D9F22A]/40'
              }`}
            >
              <div className="flex items-center gap-2 sm:gap-3 overflow-hidden">
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl border flex items-center justify-center flex-shrink-0 transition-transform duration-300 ${
                  activePillar === 'afiliados' 
                    ? 'border-[#D9F22A] bg-[#D9F22A]/20 text-[#D9F22A] scale-105' 
                    : 'border-[#D9F22A]/70 bg-[#D9F22A]/5 text-[#D9F22A] group-hover:scale-105'
                }`}>
                  <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="overflow-hidden">
                  <span className={`block font-bold text-[11px] xs:text-xs sm:text-sm lg:text-base font-['Syne'] truncate transition-colors ${
                    activePillar === 'afiliados' ? 'text-[#D9F22A]' : 'text-white group-hover:text-[#D9F22A]'
                  }`}>
                    Para afiliados
                  </span>
                </div>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0 transition-transform duration-300 ${
                activePillar === 'afiliados' ? 'rotate-180 text-[#D9F22A]' : 'text-white/40 group-hover:text-white'
              }`} />
            </button>

            {/* Pill Card 3: Split + PIX */}
            <button
              type="button"
              onClick={() => handleTogglePillar('split')}
              className={`w-full group rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 lg:p-4 flex items-center justify-between transition-all duration-300 cursor-pointer backdrop-blur-md shadow-md border text-left ${
                activePillar === 'split'
                  ? 'bg-[#0e1628] border-[#D9F22A] shadow-[0_0_20px_rgba(217,242,42,0.22)] ring-1 ring-[#D9F22A]'
                  : 'bg-[#080d19]/80 hover:bg-[#0d1527] border-white/10 hover:border-[#D9F22A]/40'
              }`}
            >
              <div className="flex items-center gap-2 sm:gap-3 overflow-hidden">
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl border flex items-center justify-center flex-shrink-0 transition-transform duration-300 ${
                  activePillar === 'split' 
                    ? 'border-[#D9F22A] bg-[#D9F22A]/20 text-[#D9F22A] scale-105' 
                    : 'border-[#D9F22A]/70 bg-[#D9F22A]/5 text-[#D9F22A] group-hover:scale-105'
                }`}>
                  <Zap className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="overflow-hidden">
                  <span className={`block font-bold text-[11px] xs:text-xs sm:text-sm lg:text-base font-['Syne'] truncate transition-colors ${
                    activePillar === 'split' ? 'text-[#D9F22A]' : 'text-white group-hover:text-[#D9F22A]'
                  }`}>
                    Split + PIX
                  </span>
                </div>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0 transition-transform duration-300 ${
                activePillar === 'split' ? 'rotate-180 text-[#D9F22A]' : 'text-white/40 group-hover:text-white'
              }`} />
            </button>

          </div>

          {/* EXPANDED CONTENT: Opens when user clicks any of the 3 */}
          <div ref={expandedSectionRef}>
            <AnimatePresence>
              {activePillar && (
                <motion.div
                  initial={{ opacity: 0, height: 0, y: -8 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -8 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden mt-4 sm:mt-5"
                >
                  <div className="p-3.5 sm:p-5 lg:p-6 rounded-2xl sm:rounded-3xl bg-[#080d1a]/95 border border-[#D9F22A]/30 backdrop-blur-2xl shadow-2xl relative">
                    
                    {/* Header Controls for Expanded View */}
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <span className="text-[11px] sm:text-xs font-bold text-[#D9F22A] uppercase tracking-wider">
                          Detalhes do Ecossistema LeadsPay
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActivePillar(null)}
                        className="px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer border border-white/10"
                      >
                        <X className="w-3 h-3" />
                        <span>Fechar</span>
                      </button>
                    </div>

                    {/* 3 Detailed Cards Grid - Responsive: 3 columns on tablet and desktop, neatly stacked on mobile */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
                      
                      {/* Card 1: PARA STARTUPS & EMPRESAS */}
                      <div className={`rounded-xl sm:rounded-2xl p-4 sm:p-5 transition-all duration-300 flex flex-col justify-between ${
                        activePillar === 'empresas' 
                          ? 'bg-[#0f172a] border-2 border-[#D9F22A] shadow-[0_0_25px_rgba(217,242,42,0.2)]' 
                          : 'bg-[#080d19] border border-white/10 hover:border-white/20 opacity-80 hover:opacity-100'
                      }`}>
                        <div>
                          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl border border-[#D9F22A]/70 bg-[#D9F22A]/10 flex items-center justify-center text-[#D9F22A] mb-3">
                            <Building2 className="w-5 h-5" />
                          </div>
                          <div className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-[#D9F22A] mb-1 font-['Syne']">
                            PARA STARTUPS & EMPRESAS
                          </div>
                          <h3 className="text-base sm:text-lg font-black text-white font-['Syne'] mb-2">
                            Distribuição Comercial em Escala
                          </h3>
                          <p className="text-xs sm:text-sm text-white/75 leading-relaxed mb-4">
                            Publique seus planos, softwares e soluções digitais. Tenha centenas de afiliados e vendedores promovendo seu produto com comissões sobre resultado.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => onOpenModal('register_company')}
                          className="w-full py-2.5 px-3.5 rounded-lg sm:rounded-xl bg-[#D9F22A] hover:bg-[#cde624] text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer"
                        >
                          <span>Cadastrar Empresa</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Card 2: PARA AFILIADOS & VENDEDORES */}
                      <div className={`rounded-xl sm:rounded-2xl p-4 sm:p-5 transition-all duration-300 flex flex-col justify-between ${
                        activePillar === 'afiliados' 
                          ? 'bg-[#0f172a] border-2 border-[#D9F22A] shadow-[0_0_25px_rgba(217,242,42,0.2)]' 
                          : 'bg-[#080d19] border border-white/10 hover:border-white/20 opacity-80 hover:opacity-100'
                      }`}>
                        <div>
                          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl border border-[#D9F22A]/70 bg-[#D9F22A]/10 flex items-center justify-center text-[#D9F22A] mb-3">
                            <Users className="w-5 h-5" />
                          </div>
                          <div className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-[#D9F22A] mb-1 font-['Syne']">
                            PARA AFILIADOS & VENDEDORES
                          </div>
                          <h3 className="text-base sm:text-lg font-black text-white font-['Syne'] mb-2">
                            Afiliação com 1 Clique
                          </h3>
                          <p className="text-xs sm:text-sm text-white/75 leading-relaxed mb-4">
                            Escolha produtos validados no catálogo, gere links parametrizados com rastreamento anti-fraude e lucre até 50% de comissão por contrato fechado.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => onOpenModal('register_affiliate')}
                          className="w-full py-2.5 px-3.5 rounded-lg sm:rounded-xl bg-[#D9F22A] hover:bg-[#cde624] text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer"
                        >
                          <span>Cadastrar como Afiliado</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Card 3: TECNOLOGIA & PAGAMENTOS */}
                      <div className={`rounded-xl sm:rounded-2xl p-4 sm:p-5 transition-all duration-300 flex flex-col justify-between ${
                        activePillar === 'split' 
                          ? 'bg-[#0f172a] border-2 border-[#D9F22A] shadow-[0_0_25px_rgba(217,242,42,0.2)]' 
                          : 'bg-[#080d19] border border-white/10 hover:border-white/20 opacity-80 hover:opacity-100'
                      }`}>
                        <div>
                          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl border border-[#D9F22A]/70 bg-[#D9F22A]/10 flex items-center justify-center text-[#D9F22A] mb-3">
                            <Zap className="w-5 h-5" />
                          </div>
                          <div className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-[#D9F22A] mb-1 font-['Syne']">
                            TECNOLOGIA & PAGAMENTOS
                          </div>
                          <h3 className="text-base sm:text-lg font-black text-white font-['Syne'] mb-2">
                            Split Automático & PIX D+9
                          </h3>
                          <p className="text-xs sm:text-sm text-white/75 leading-relaxed mb-4">
                            Divisão instantânea de receitas a cada venda confirmada. Sem burocracia ou retenções abusivas: solicite seu saque e receba via PIX com liquidação transparente D+9.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const el = document.getElementById('comparativo-taxas');
                            if (el) el.scrollIntoView({ behavior: 'smooth' });
                            else onOpenModal('login');
                          }}
                          className="w-full py-2.5 px-3.5 rounded-lg sm:rounded-xl bg-white/10 hover:bg-[#D9F22A] hover:text-black text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 border border-white/15 transition-all cursor-pointer"
                        >
                          <span>Ver Tabela Comparativa</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </div>

                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>
      </div>
    </section>
  );
};




