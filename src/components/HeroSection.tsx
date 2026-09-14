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
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#D9F22A]/30 bg-[#080d1a] text-xs font-bold uppercase tracking-wider text-[#D9F22A] shadow-[0_0_15px_rgba(217,242,42,0.15)] mb-4">
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>As Menores Taxas do Mercado</span>
          </div>

          <h1 className="elementor-heading-title text-2xl sm:text-4xl md:text-5xl lg:text-[46px] font-extrabold tracking-tight uppercase leading-[1.14] sm:leading-[1.16] [text-wrap:balance]">
            <span className="cor block drop-shadow-[0_0_25px_rgba(217,242,42,0.3)]">
              A plataforma de pagamentos e afiliação
            </span>
            <span className="text-white block mt-1.5 sm:mt-2 text-xl sm:text-3xl md:text-4xl lg:text-[40px] font-bold">
              com as menores taxas do mercado.
            </span>
          </h1>

          {/* Subheading Narrative */}
          <p className="mt-5 sm:mt-6 text-sm sm:text-base md:text-lg text-white/85 max-w-2xl mx-auto font-normal leading-relaxed text-center">
            Venda seus infoprodutos e serviços com split automático PJ, checkout de alta conversão e receba suas comissões direto no PIX com saque mínimo de apenas <span className="text-[#D9F22A] font-bold">R$ 10,00</span>.
          </p>
        </div>

        {/* Central Call-to-Actions */}
        <div className="flex flex-wrap items-center justify-center gap-3.5 sm:gap-4 mb-10 sm:mb-12">
          <button
            onClick={() => onOpenModal('register_affiliate')}
            className="group flex items-center gap-2.5 sm:gap-3 bg-[#D9F22A] hover:bg-[#cbe31c] text-[#060A15] font-black py-3.5 px-7 sm:py-4 sm:px-9 rounded-2xl text-xs sm:text-sm md:text-base uppercase tracking-wider shadow-[0_0_30px_rgba(217,242,42,0.35)] hover:scale-105 transition-all duration-300 cursor-pointer"
          >
            <span>Criar Conta Grátis</span>
            <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
          </button>

          {onOpenPlatform ? (
            <button
              onClick={onOpenPlatform}
              className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white border border-white/15 font-bold py-3.5 px-6 sm:py-4 sm:px-7 rounded-2xl text-xs sm:text-sm md:text-base uppercase tracking-wider transition-all duration-300 cursor-pointer backdrop-blur-sm"
            >
              <span>Acessar Painel</span>
            </button>
          ) : (
            <button
              onClick={() => onOpenModal('login')}
              className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white border border-white/15 font-bold py-3.5 px-6 sm:py-4 sm:px-7 rounded-2xl text-xs sm:text-sm md:text-base uppercase tracking-wider transition-all duration-300 cursor-pointer backdrop-blur-sm"
            >
              <span>Entrar na Conta</span>
            </button>
          )}

          <a
            href="#comparativo-taxas"
            onClick={(e) => {
              e.preventDefault();
              const el = document.getElementById('comparativo-taxas');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className="flex items-center gap-2 text-white/70 hover:text-white font-medium py-3.5 px-4 text-xs sm:text-sm uppercase tracking-wider transition-all cursor-pointer underline underline-offset-4"
          >
            <span>Ver Tabela Comparativa</span>
          </a>
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
