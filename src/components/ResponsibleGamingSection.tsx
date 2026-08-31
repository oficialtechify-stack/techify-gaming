import React from 'react';
import { motion } from 'motion/react';
import { ActiveModal } from '../types';
import { ShieldCheck, Lock, Landmark, FileCheck } from 'lucide-react';

interface ResponsibleGamingSectionProps {
  onOpenModal: (modal: ActiveModal) => void;
}

export const ResponsibleGamingSection: React.FC<ResponsibleGamingSectionProps> = ({ onOpenModal }) => {
  return (
    <section id="seguranca" className="py-20 md:py-28 relative overflow-hidden bg-[#050811]/60 border-t border-white/5">
      {/* Glow Orbs */}
      <div className="absolute top-1/2 left-0 w-[500px] h-[500px] bg-[#D9F22A]/10 rounded-full blur-[130px] pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* Left Column: Visual Image Frame */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.94, y: 30 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-6 relative flex justify-center"
          >
            <div className="relative w-full max-w-[480px] rounded-2xl overflow-hidden border border-white/10 shadow-2xl group">
              <div className="relative aspect-[4/5] bg-gradient-to-br from-[#0a1224] via-[#060a15] to-[#04060d]">
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1000&q=80"
                  alt="Segurança e Governança Techify"
                  className="w-full h-full object-cover object-top mix-blend-luminosity opacity-85 group-hover:scale-105 transition-transform duration-700"
                  loading="lazy"
                />
                
                {/* Yellow lighting effect overlay */}
                <div className="absolute inset-0 bg-gradient-to-tr from-[#D9F22A]/30 via-transparent to-[#060A15]/80" />

                {/* Lower watermark typography */}
                <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between pointer-events-none">
                  <span className="text-white/20 font-black tracking-widest text-3xl font-['Syne']">
                    TECHIFY
                  </span>
                  <div className="w-8 h-8 rounded-full bg-[#D9F22A]/20 flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-[#D9F22A]" />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right Column: Information & Pillars */}
          <motion.div 
            initial={{ opacity: 0, y: 35 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-6 flex flex-col items-start gap-6"
          >
            {/* Tag */}
            <div className="inline-flex items-center gap-2 bg-[#0c1322] border border-white/10 rounded-full px-4 py-1.5 text-xs font-semibold text-white/90">
              <span className="w-2 h-2 rounded-full bg-[#D9F22A]" />
              <span>Governança & Integridade Financeira</span>
            </div>

            {/* Title */}
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold uppercase tracking-tight font-['Syne'] text-white">
              SEGURANÇA & CONFORMIDADE
            </h2>

            {/* Paragraphs */}
            <div className="flex flex-col gap-4 text-white/80 text-sm sm:text-base leading-relaxed">
              <p>
                Operamos sob os mais rígidos padrões de segurança digital, proteção de dados (LGPD) e liquidação financeira. Cada transação e comissão gerada em nossa plataforma passa por checagens criptográficas e antifraude automáticas.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3.5 rounded-xl bg-[#080d1a] border border-white/5 flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-white font-bold text-xs">
                    <Lock className="w-4 h-4 text-[#D9F22A]" />
                    <span>Split Criptografado</span>
                  </div>
                  <p className="text-xs text-white/60">Distribuição automatizada de saldos sem custódia de terceiros não autorizados.</p>
                </div>
                
                <div className="p-3.5 rounded-xl bg-[#080d1a] border border-white/5 flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-white font-bold text-xs">
                    <Landmark className="w-4 h-4 text-[#D9F22A]" />
                    <span>Liquidação PIX D+0</span>
                  </div>
                  <p className="text-xs text-white/60">Integração bancária direta para transferências instantâneas e sem atrito.</p>
                </div>

                <div className="p-3.5 rounded-xl bg-[#080d1a] border border-white/5 flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-white font-bold text-xs">
                    <FileCheck className="w-4 h-4 text-[#D9F22A]" />
                    <span>Contratos Transparentes</span>
                  </div>
                  <p className="text-xs text-white/60">Termos de afiliação claros com regras acordadas entre empresas e vendedores.</p>
                </div>

                <div className="p-3.5 rounded-xl bg-[#080d1a] border border-white/5 flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-white font-bold text-xs">
                    <ShieldCheck className="w-4 h-4 text-[#D9F22A]" />
                    <span>Auditoria em Tempo Real</span>
                  </div>
                  <p className="text-xs text-white/60">Logs detalhados de cliques, leads, IP e conversão disponíveis no painel.</p>
                </div>
              </div>
            </div>

            {/* Action Button: Saiba mais */}
            <button
              onClick={() => onOpenModal('responsible')}
              className="mt-2 group flex items-center gap-3 bg-[#D9F22A] hover:bg-[#cbe31c] text-[#060A15] font-bold text-sm sm:text-base px-6 py-3 rounded-full transition-all duration-300 shadow-[0_0_20px_rgba(217,242,42,0.3)] hover:shadow-[0_0_30px_rgba(217,242,42,0.5)] cursor-pointer"
              id="btn-responsible-learn-more"
            >
              <span>Conhecer Diretrizes de Segurança</span>
              <div className="w-7 h-7 rounded-full bg-[#060A15] flex items-center justify-center text-[#D9F22A] group-hover:translate-x-1 transition-transform">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 7H11M11 7L7.5 3.5M11 7L7.5 10.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </button>
          </motion.div>
        </div>
      </div>
    </section>
  );
};


