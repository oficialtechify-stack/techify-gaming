import React, { useState, useEffect } from 'react';
import { STATS_DATA } from '../data/stellarData';
import { TrendingUp, ShieldCheck, Zap, Layers, Wallet, Users } from 'lucide-react';

export const StatsCounter: React.FC = () => {
  const [counts, setCounts] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    // Smooth count up animation on mount
    const duration = 2000;
    const steps = 40;
    const intervalTime = duration / steps;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      const progress = Math.min(currentStep / steps, 1);
      // Ease out cubic
      const easeProgress = 1 - Math.pow(1 - progress, 3);

      const newCounts: { [key: string]: number } = {};
      STATS_DATA.forEach((stat) => {
        newCounts[stat.id] = Math.round(stat.numericTarget * easeProgress * 10) / 10;
      });

      setCounts(newCounts);

      if (currentStep >= steps) {
        clearInterval(timer);
      }
    }, intervalTime);

    return () => clearInterval(timer);
  }, []);

  return (
    <section className="relative py-16 border-y border-white/5 bg-[#050811] overflow-hidden">
      {/* Background Subtle Arc Line */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
        <div className="w-[1400px] h-[1px] bg-gradient-to-r from-transparent via-[#D9F22A] to-transparent" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D9F22A]/10 border border-[#D9F22A]/30 text-[11px] font-bold text-[#D9F22A] uppercase tracking-wider mb-2">
            <TrendingUp className="w-3.5 h-3.5" />
            MÉTRICAS DO ECOSSISTEMA EM NÚMEROS
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white font-['Syne']">
            Impacto Real na Operação de Startups & Afiliados
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 justify-items-center">
          {STATS_DATA.slice(0, 3).map((stat) => {
            const displayValue = counts[stat.id] !== undefined
              ? (stat.numericTarget % 1 === 0 ? Math.round(counts[stat.id]) : counts[stat.id].toFixed(1))
              : stat.value;

            return (
              <div
                key={stat.id}
                className="relative w-[260px] h-[260px] sm:w-[280px] sm:h-[280px] rounded-full border border-white/10 hover:border-[#D9F22A]/40 bg-[#060a15]/80 backdrop-blur-sm flex flex-col items-center justify-center text-center p-6 transition-all duration-500 group shadow-lg"
              >
                {/* Subtle Inner Ring */}
                <div className="absolute inset-2 rounded-full border border-white/[0.03] group-hover:border-[#D9F22A]/20 transition-colors" />

                {/* Main Metric Value */}
                <div className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight font-['Syne'] mb-2 group-hover:text-[#D9F22A] transition-colors">
                  {stat.prefix || ''}{displayValue}{stat.suffix || ''}
                </div>

                {/* Metric Title */}
                <div className="text-xs tracking-[0.15em] font-bold text-white/70 uppercase max-w-[180px] leading-snug">
                  {stat.title}
                </div>
              </div>
            );
          })}
        </div>

        {/* Secondary Badges for other metrics in an elegant strip */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-4 text-xs sm:text-sm text-white/70 font-medium">
          <div className="flex items-center gap-2.5 bg-white/[0.03] border border-white/10 px-5 py-2.5 rounded-full">
            <Wallet className="w-4 h-4 text-[#D9F22A]" />
            <span className="text-[#D9F22A] font-bold text-base">30% a 50%</span>
            <span>COMISSÃO MÉDIA POR VENDA</span>
          </div>
          <div className="flex items-center gap-2.5 bg-white/[0.03] border border-white/10 px-5 py-2.5 rounded-full">
            <Users className="w-4 h-4 text-[#D9F22A]" />
            <span className="text-[#D9F22A] font-bold text-base">+12.000</span>
            <span>AFILIADOS & VENDEDORES CONECTADOS</span>
          </div>
          <div className="flex items-center gap-2.5 bg-white/[0.03] border border-white/10 px-5 py-2.5 rounded-full">
            <Zap className="w-4 h-4 text-[#D9F22A]" />
            <span className="text-[#D9F22A] font-bold text-base">100%</span>
            <span>SPLIT & RASTREAMENTO AUTOMATIZADO</span>
          </div>
        </div>
      </div>
    </section>
  );
};

