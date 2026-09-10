import React from 'react';
import { ActiveModal } from '../types';
import { ArrowRight, Building2, Users, Zap, ShieldCheck } from 'lucide-react';

interface HeroSectionProps {
  onOpenModal: (modal: ActiveModal) => void;
  onOpenPlatform?: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onOpenModal, onOpenPlatform }) => {
  return (
    <section id="home" className="relative pt-6 pb-14 md:pt-10 md:pb-20 overflow-hidden">
      {/* Background glow orbs */}
      <div className="blur blur-1" />
      <div className="blur blur-2" />

      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Hero Headline - Centered, Balanced, Clear */}
        <div className="text-center max-w-4xl mx-auto mb-6 sm:mb-8">
          <h1 className="elementor-heading-title text-2xl sm:text-4xl md:text-5xl lg:text-[48px] font-extrabold tracking-tight uppercase leading-[1.12] sm:leading-[1.16] [text-wrap:balance]">
            <span className="cor block drop-shadow-[0_0_25px_rgba(217,242,42,0.3)]">
              Conectamos Startups Inovadoras
            </span>
            <span className="text-white block mt-1.5 sm:mt-2 text-xl sm:text-3xl md:text-4xl lg:text-[42px] font-bold">
              a uma Rede de Afiliados que Vende Todos os Dias
            </span>
          </h1>

          {/* Subheading Narrative */}
          <p className="mt-5 sm:mt-6 text-sm sm:text-base md:text-lg text-white/85 max-w-2xl mx-auto font-normal leading-relaxed text-center">
            A infraestrutura comercial definitiva: startups e empresas escalam distribuição sem custo fixo, enquanto afiliados e vendedores profissionais monetizam comissões de <span className="text-[#D9F22A] font-bold">30% a 50%</span> e repasses automáticos via <span className="text-[#D9F22A] font-bold">PIX D+9</span>.
          </p>
        </div>

        {/* Central Call-to-Actions */}
        <div className="flex flex-wrap items-center justify-center gap-3.5 sm:gap-4 mb-10 sm:mb-12">
          {onOpenPlatform ? (
            <button
              onClick={onOpenPlatform}
              className="group flex items-center gap-2.5 sm:gap-3 bg-[#D9F22A] hover:bg-[#cbe31c] text-[#060A15] font-black py-3.5 px-6 sm:py-4 sm:px-8 rounded-2xl text-xs sm:text-sm md:text-base uppercase tracking-wider shadow-[0_0_30px_rgba(217,242,42,0.35)] hover:scale-105 transition-all duration-300 cursor-pointer"
            >
              <span>Explorar Marketplace de Startups</span>
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          ) : (
            <button
              onClick={() => onOpenModal('login')}
              className="group flex items-center gap-2.5 sm:gap-3 bg-[#D9F22A] hover:bg-[#cbe31c] text-[#060A15] font-black py-3.5 px-6 sm:py-4 sm:px-8 rounded-2xl text-xs sm:text-sm md:text-base uppercase tracking-wider shadow-[0_0_30px_rgba(217,242,42,0.35)] hover:scale-105 transition-all duration-300 cursor-pointer"
            >
              <span>Acessar Plataforma & Vitrine</span>
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          )}

          <a
            href="#como-funciona"
            onClick={(e) => {
              e.preventDefault();
              const el = document.getElementById('como-funciona');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white border border-white/15 font-bold py-3.5 px-6 sm:py-4 sm:px-7 rounded-2xl text-xs sm:text-sm md:text-base uppercase tracking-wider transition-all duration-300 cursor-pointer backdrop-blur-sm"
          >
            <span>Como Funciona</span>
          </a>
        </div>

        {/* Central 3D Glowing Emblem (Official LeadsPay Glass/Neon Star from Image 1) */}
        <div className="relative flex justify-center items-center my-6 sm:my-8">
          <div className="relative w-full max-w-[280px] sm:max-w-[360px] md:max-w-[420px] aspect-square flex items-center justify-center group">
            {/* Ambient Volumetric Backlight Glow */}
            <div className="absolute inset-0 bg-[#D9F22A]/25 rounded-full blur-[80px] sm:blur-[110px] pointer-events-none group-hover:scale-110 transition-transform duration-700" />
            
            {/* 3D High-Res Emblem Image from User Image 1 */}
            <img
              width="575"
              height="575"
              src="/logo_3d.jpg"
              alt="LeadsPay 3D Glass Star Emblem"
              className="relative z-10 w-full h-full object-contain filter drop-shadow-[0_20px_45px_rgba(217,242,42,0.4)] rounded-3xl transition-transform duration-500 hover:scale-[1.04]"
              loading="eager"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/leadspay_3d_logo.jpg';
              }}
            />
          </div>
        </div>

        {/* 3 Core Value Pillars Cards (Direct & Clear) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto mb-10">
          <div className="bg-[#080d1a]/90 border border-white/10 hover:border-[#D9F22A]/40 rounded-2xl p-6 transition-all duration-300 flex flex-col gap-3 group backdrop-blur-md">
            <div className="w-12 h-12 rounded-xl bg-[#D9F22A]/10 border border-[#D9F22A]/30 flex items-center justify-center text-[#D9F22A]">
              <Building2 className="w-6 h-6" />
            </div>
            <div className="text-xs font-bold uppercase tracking-wider text-[#D9F22A]">
              Para Startups & Empresas
            </div>
            <h3 className="text-lg font-black text-white font-['Syne']">
              Distribuição Comercial em Escala
            </h3>
            <p className="text-xs text-white/70 leading-relaxed">
              Publique seus planos, softwares e soluções digitais. Tenha centenas de afiliados e vendedores promovendo seu produto com comissões sobre resultado.
            </p>
          </div>

          <div className="bg-[#080d1a]/90 border border-white/10 hover:border-[#D9F22A]/40 rounded-2xl p-6 transition-all duration-300 flex flex-col gap-3 group backdrop-blur-md">
            <div className="w-12 h-12 rounded-xl bg-[#D9F22A]/10 border border-[#D9F22A]/30 flex items-center justify-center text-[#D9F22A]">
              <Users className="w-6 h-6" />
            </div>
            <div className="text-xs font-bold uppercase tracking-wider text-[#D9F22A]">
              Para Afiliados & Vendedores
            </div>
            <h3 className="text-lg font-black text-white font-['Syne']">
              Afiliação com 1 Clique
            </h3>
            <p className="text-xs text-white/70 leading-relaxed">
              Escolha produtos validados no catálogo, gere links parametrizados com rastreamento anti-fraude e lucre até 50% de comissão por contrato fechado.
            </p>
          </div>

          <div className="bg-[#080d1a]/90 border border-white/10 hover:border-[#D9F22A]/40 rounded-2xl p-6 transition-all duration-300 flex flex-col gap-3 group backdrop-blur-md">
            <div className="w-12 h-12 rounded-xl bg-[#D9F22A]/10 border border-[#D9F22A]/30 flex items-center justify-center text-[#D9F22A]">
              <Zap className="w-6 h-6" />
            </div>
            <div className="text-xs font-bold uppercase tracking-wider text-[#D9F22A]">
              Tecnologia & Pagamentos
            </div>
            <h3 className="text-lg font-black text-white font-['Syne']">
              Split Automático & PIX D+9
            </h3>
            <p className="text-xs text-white/70 leading-relaxed">
              Divisão instantânea de receitas a cada venda confirmada. Sem burocracia ou retenções abusivas: solicite seu saque e receba via PIX com liquidação transparente D+9.
            </p>
          </div>
        </div>

        {/* Hero Bottom Bar */}
        <div className="max-w-[1140px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-white/5">
          <div className="flex items-center gap-3 text-xs text-white/70">
            <ShieldCheck className="w-4 h-4 text-[#D9F22A]" />
            <span>Infraestrutura segura com rastreamento UTM, checkout integrado e liquidação transparente.</span>
          </div>

          <div className="flex items-center gap-4 text-xs font-bold text-white/80">
            <span className="text-[#D9F22A]">•</span> <span>SaaS B2B</span>
            <span className="text-[#D9F22A]">•</span> <span>iGaming Tech</span>
            <span className="text-[#D9F22A]">•</span> <span>Fintechs</span>
            <span className="text-[#D9F22A]">•</span> <span>MarTech</span>
          </div>
        </div>
      </div>
    </section>
  );
};
