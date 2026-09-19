import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ActiveModal } from '../types';
import { ArrowRight, Building2, Users, Zap, ShieldCheck, ChevronDown, UserCheck, Sparkles } from 'lucide-react';

interface HeroSectionProps {
  onOpenModal: (modal: ActiveModal) => void;
  onOpenPlatform?: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onOpenModal, onOpenPlatform }) => {
  const [registerDropdownOpen, setRegisterDropdownOpen] = useState(false);

  return (
    <section id="home" className="relative pt-6 pb-14 md:pt-10 md:pb-20 overflow-hidden">
      {/* Background glow orbs with float animations */}
      <div className="blur blur-1 animate-float-orb opacity-80" />
      <div className="blur blur-2 animate-float-slow opacity-60" />

      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Main Hero Headline - Staggered Motion */}
        <motion.div 
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="text-center max-w-4xl mx-auto mb-6 sm:mb-8"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#D9F22A]/10 border border-[#D9F22A]/30 text-[#D9F22A] text-xs sm:text-sm font-bold uppercase tracking-wider mb-5 shadow-[0_0_20px_rgba(217,242,42,0.15)] animate-badge-glow"
          >
            <Sparkles className="w-4 h-4 text-[#D9F22A]" />
            <span>Ecossistema de Checkout & Comissões</span>
          </motion.div>

          <h1 className="elementor-heading-title text-2xl sm:text-4xl md:text-5xl lg:text-[46px] font-extrabold tracking-tight uppercase leading-[1.14] sm:leading-[1.16] [text-wrap:balance]">
            <span className="cor block drop-shadow-[0_0_25px_rgba(217,242,42,0.3)]">
              A plataforma de pagamentos e afiliação
            </span>
            <span className="text-white block mt-1.5 sm:mt-2 text-xl sm:text-3xl md:text-4xl lg:text-[40px] font-bold">
              com as menores taxas do mercado.
            </span>
          </h1>

          {/* Subheading Narrative */}
          <motion.p 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="mt-5 sm:mt-6 text-sm sm:text-base md:text-lg text-white/85 max-w-2xl mx-auto font-normal leading-relaxed text-center"
          >
            Venda seus infoprodutos e serviços com split automático PJ, checkout de alta conversão e receba suas comissões direto no PIX com saque mínimo de apenas <span className="text-[#D9F22A] font-bold">R$ 10,00</span>.
          </motion.p>
        </motion.div>

        {/* Central Call-to-Actions */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-wrap items-center justify-center gap-3.5 sm:gap-4 mb-10 sm:mb-12 relative"
        >
          {/* Cadastrar / Criar Conta Dropdown */}
          <div className="relative">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setRegisterDropdownOpen(!registerDropdownOpen)}
              className="group flex items-center gap-2 sm:gap-2.5 bg-[#D9F22A] hover:bg-[#cbe31c] text-[#060A15] font-black py-3.5 px-6 sm:py-4 sm:px-8 rounded-2xl text-xs sm:text-sm md:text-base uppercase tracking-wider shadow-[0_0_30px_rgba(217,242,42,0.35)] transition-all duration-300 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-[#060A15]" />
              <span>Cadastrar</span>
              <ChevronDown className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-200 ${registerDropdownOpen ? 'rotate-180' : ''}`} />
            </motion.button>

            {registerDropdownOpen && (
              <motion.div 
                initial={{ opacity: 0, y: -8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.15 }}
                className="absolute left-1/2 -translate-x-1/2 sm:left-0 sm:translate-x-0 mt-2 w-64 bg-[#080d1a] border border-white/15 rounded-2xl p-2 shadow-2xl z-50"
              >
                <button
                  onClick={() => {
                    setRegisterDropdownOpen(false);
                    onOpenModal('register_affiliate');
                  }}
                  className="w-full p-2.5 rounded-xl hover:bg-white/5 text-left flex items-center gap-2.5 text-xs text-white font-bold cursor-pointer transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#D9F22A]/10 text-[#D9F22A] flex items-center justify-center flex-shrink-0">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-white font-bold">Sou Afiliado</div>
                    <div className="text-[10px] text-white/50 font-normal">Quero vender e lucrar</div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setRegisterDropdownOpen(false);
                    onOpenModal('register_company');
                  }}
                  className="w-full p-2.5 rounded-xl hover:bg-white/5 text-left flex items-center gap-2.5 text-xs text-white font-bold cursor-pointer transition-colors mt-1"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#D9F22A]/10 text-[#D9F22A] flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-white font-bold">Sou Empresa / Startup</div>
                    <div className="text-[10px] text-white/50 font-normal">Cadastrar meus produtos</div>
                  </div>
                </button>
              </motion.div>
            )}
          </div>

          {onOpenPlatform ? (
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              onClick={onOpenPlatform}
              className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white border border-white/15 font-bold py-3.5 px-6 sm:py-4 sm:px-7 rounded-2xl text-xs sm:text-sm md:text-base uppercase tracking-wider transition-all duration-300 cursor-pointer backdrop-blur-sm shadow-md"
            >
              <span>Acessar Painel</span>
            </motion.button>
          ) : (
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onOpenModal('login')}
              className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white border border-white/15 font-bold py-3.5 px-6 sm:py-4 sm:px-7 rounded-2xl text-xs sm:text-sm md:text-base uppercase tracking-wider transition-all duration-300 cursor-pointer backdrop-blur-sm shadow-md"
            >
              <span>Entrar na Conta</span>
            </motion.button>
          )}

          <motion.a
            whileHover={{ x: 3 }}
            href="#comparativo-taxas"
            onClick={(e) => {
              e.preventDefault();
              const el = document.getElementById('comparativo-taxas');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className="flex items-center gap-2 text-white/70 hover:text-[#D9F22A] font-medium py-3.5 px-4 text-xs sm:text-sm uppercase tracking-wider transition-all cursor-pointer underline underline-offset-4"
          >
            <span>Ver Tabela Comparativa</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </motion.a>
        </motion.div>

        {/* 3 Core Value Pillars Cards (Animated on scroll with hover lift) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto mb-10">
          <motion.div 
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.5, delay: 0.1 }}
            whileHover={{ y: -6, transition: { duration: 0.25 } }}
            className="bg-[#080d1a]/90 border border-white/10 hover:border-[#D9F22A]/40 rounded-2xl p-6 transition-colors duration-300 flex flex-col gap-3 group backdrop-blur-md shadow-lg"
          >
            <div className="w-12 h-12 rounded-xl bg-[#D9F22A]/10 border border-[#D9F22A]/30 flex items-center justify-center text-[#D9F22A] group-hover:scale-110 transition-transform duration-300">
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
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.5, delay: 0.2 }}
            whileHover={{ y: -6, transition: { duration: 0.25 } }}
            className="bg-[#080d1a]/90 border border-white/10 hover:border-[#D9F22A]/40 rounded-2xl p-6 transition-colors duration-300 flex flex-col gap-3 group backdrop-blur-md shadow-lg"
          >
            <div className="w-12 h-12 rounded-xl bg-[#D9F22A]/10 border border-[#D9F22A]/30 flex items-center justify-center text-[#D9F22A] group-hover:scale-110 transition-transform duration-300">
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
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.5, delay: 0.3 }}
            whileHover={{ y: -6, transition: { duration: 0.25 } }}
            className="bg-[#080d1a]/90 border border-white/10 hover:border-[#D9F22A]/40 rounded-2xl p-6 transition-colors duration-300 flex flex-col gap-3 group backdrop-blur-md shadow-lg"
          >
            <div className="w-12 h-12 rounded-xl bg-[#D9F22A]/10 border border-[#D9F22A]/30 flex items-center justify-center text-[#D9F22A] group-hover:scale-110 transition-transform duration-300">
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
          </motion.div>
        </div>

        {/* Hero Bottom Bar */}
        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="max-w-[1140px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-white/5"
        >
          <div className="flex items-center gap-3 text-xs text-white/70">
            <ShieldCheck className="w-4 h-4 text-[#D9F22A] flex-shrink-0 animate-pulse" />
            <span>Infraestrutura segura com rastreamento UTM, checkout integrado e liquidação transparente.</span>
          </div>

          <div className="flex items-center gap-4 text-xs font-bold text-white/80">
            <span className="text-[#D9F22A]">•</span> <span>SaaS B2B</span>
            <span className="text-[#D9F22A]">•</span> <span>iGaming Tech</span>
            <span className="text-[#D9F22A]">•</span> <span>Fintechs</span>
            <span className="text-[#D9F22A]">•</span> <span>MarTech</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

