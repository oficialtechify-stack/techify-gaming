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
          {/* Left Column: Techify Security & Split Visual Architecture (No photo) */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.94, y: 30 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-6 relative flex justify-center w-full"
          >
            <div className="w-full max-w-[480px] rounded-3xl p-6 sm:p-8 bg-[#080d1a] border border-white/10 shadow-2xl relative overflow-hidden flex flex-col gap-5">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#D9F22A]/10 border border-[#D9F22A]/30 flex items-center justify-center text-[#D9F22A]">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Split Engine v4.2</h4>
                    <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Liquidação Automática Ativa
                    </span>
                  </div>
                </div>
                <span className="text-[11px] font-mono bg-white/5 text-white/60 px-2.5 py-1 rounded-md border border-white/5">
                  PIX D+0
                </span>
              </div>

              {/* Transaction Simulator Visual */}
              <div className="space-y-3 font-mono text-xs">
                <div className="p-3.5 rounded-xl bg-[#050811] border border-white/5 flex items-center justify-between">
                  <span className="text-white/60">Transação Bruta (Plano Anual):</span>
                  <span className="text-white font-bold">R$ 1.890,00</span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-3 rounded-xl bg-[#D9F22A]/5 border border-[#D9F22A]/20 flex flex-col gap-1">
                    <span className="text-[10px] text-[#D9F22A] font-bold uppercase">Repasse Startup (60%)</span>
                    <span className="text-sm text-white font-black">R$ 1.134,00</span>
                    <span className="text-[9px] text-white/40">Depósito Direto</span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#D9F22A]/10 border border-[#D9F22A]/40 flex flex-col gap-1">
                    <span className="text-[10px] text-[#D9F22A] font-bold uppercase">Comissão Afiliado (40%)</span>
                    <span className="text-sm text-[#D9F22A] font-black">R$ 756,00</span>
                    <span className="text-[9px] text-white/40">PIX Instantâneo</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between text-[11px]">
                  <span className="text-white/50">Tempo médio de liquidação:</span>
                  <span className="text-emerald-400 font-bold">0.8 segundos</span>
                </div>
              </div>

              {/* Security Badges */}
              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-white/50">
                <span className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-[#D9F22A]" />
                  SHA-256 Webhook
                </span>
                <span>LGPD Compliant</span>
                <span>Split Bacen</span>
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


