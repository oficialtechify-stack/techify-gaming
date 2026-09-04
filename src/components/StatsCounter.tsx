import React, { useState, useEffect } from 'react';
import { TrendingUp, ShieldCheck, Zap, Layers, Wallet, Users, Building2, CheckCircle2, ArrowUpRight } from 'lucide-react';
import { subscribeGlobalPlatformMetrics, GlobalPlatformMetrics } from '../services/firestoreService';

export const StatsCounter: React.FC = () => {
  const [metrics, setMetrics] = useState<GlobalPlatformMetrics>({
    totalRegisteredUsers: 1,
    totalStartups: 0,
    totalPlans: 0,
    totalCommissionsGenerated: 0,
    totalCommissionsPaid: 0,
    totalGrossSales: 0,
    totalSalesCount: 0,
    companies: [],
    plans: []
  });

  const [displayUsers, setDisplayUsers] = useState(0);
  const [displayStartups, setDisplayStartups] = useState(0);
  const [displayCommissions, setDisplayCommissions] = useState(0);
  const [displayPaid, setDisplayPaid] = useState(0);

  // Subscribe to real Firestore database updates
  useEffect(() => {
    const unsubscribe = subscribeGlobalPlatformMetrics((liveMetrics) => {
      setMetrics(liveMetrics);
    });

    return () => unsubscribe();
  }, []);

  // Smooth counter animation when live metrics arrive
  useEffect(() => {
    const targetUsers = metrics.totalRegisteredUsers;
    const targetStartups = metrics.totalStartups + metrics.totalPlans;
    const targetCommissions = metrics.totalCommissionsGenerated;
    const targetPaid = metrics.totalCommissionsPaid;

    const duration = 1200;
    const steps = 30;
    const intervalTime = duration / steps;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      const progress = Math.min(currentStep / steps, 1);
      const ease = 1 - Math.pow(1 - progress, 3);

      setDisplayUsers(Math.round(targetUsers * ease));
      setDisplayStartups(Math.round(targetStartups * ease));
      setDisplayCommissions(Math.round(targetCommissions * ease * 100) / 100);
      setDisplayPaid(Math.round(targetPaid * ease * 100) / 100);

      if (currentStep >= steps) {
        clearInterval(timer);
      }
    }, intervalTime);

    return () => clearInterval(timer);
  }, [metrics]);

  const formatBRL = (val: number) => {
    return val.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const formatShortBRL = (val: number) => {
    if (val >= 1000000) {
      return `R$ ${(val / 1000000).toFixed(1)}M`;
    }
    if (val >= 1000) {
      return `R$ ${(val / 1000).toFixed(1)}K`;
    }
    return formatBRL(val);
  };

  return (
    <section className="relative py-20 border-y border-white/5 bg-[#050811] overflow-hidden">
      {/* Background Subtle Arc Line */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
        <div className="w-[1400px] h-[1px] bg-gradient-to-r from-transparent via-[#D9F22A] to-transparent" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D9F22A]/10 border border-[#D9F22A]/30 text-[11px] font-bold text-[#D9F22A] uppercase tracking-wider mb-2">
            <span className="w-2 h-2 rounded-full bg-[#D9F22A] animate-ping inline-block mr-1" />
            DADOS REAIS EM TEMPO REAL (BANCO FIRESTORE)
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-white font-['Syne']">
            Métricas Reais do Ecossistema LeadsPay
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-white/60">
            Números sincronizados diretamente da nossa base de dados ativa.
          </p>
        </div>

        {/* 3 Main Highlighted Circles */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 justify-items-center mb-14">
          {/* Circle 1: Usuários & Afiliados Cadastrados */}
          <div className="relative w-[270px] h-[270px] sm:w-[290px] sm:h-[290px] rounded-full border border-white/10 hover:border-[#D9F22A]/50 bg-[#060a15]/90 backdrop-blur-md flex flex-col items-center justify-center text-center p-6 transition-all duration-500 group shadow-[0_0_30px_rgba(0,0,0,0.5)]">
            <div className="absolute inset-2 rounded-full border border-white/[0.04] group-hover:border-[#D9F22A]/20 transition-colors" />
            
            <div className="w-10 h-10 rounded-full bg-[#D9F22A]/10 border border-[#D9F22A]/20 flex items-center justify-center text-[#D9F22A] mb-3">
              <Users className="w-5 h-5" />
            </div>

            <div className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight font-['Syne'] mb-1 group-hover:text-[#D9F22A] transition-colors">
              +{displayUsers}
            </div>

            <div className="text-xs tracking-[0.15em] font-bold text-white/80 uppercase max-w-[200px] leading-snug">
              USUÁRIOS & AFILIADOS CADASTRADOS
            </div>
            
            <span className="mt-2 text-[10px] text-[#D9F22A] font-bold uppercase tracking-wider bg-[#D9F22A]/10 px-2.5 py-0.5 rounded-full border border-[#D9F22A]/20">
              {metrics.totalRegisteredUsers} Perfis Ativos
            </span>
          </div>

          {/* Circle 2: Startups & Planos no Catálogo */}
          <div className="relative w-[270px] h-[270px] sm:w-[290px] sm:h-[290px] rounded-full border border-white/10 hover:border-[#D9F22A]/50 bg-[#060a15]/90 backdrop-blur-md flex flex-col items-center justify-center text-center p-6 transition-all duration-500 group shadow-[0_0_30px_rgba(0,0,0,0.5)]">
            <div className="absolute inset-2 rounded-full border border-white/[0.04] group-hover:border-[#D9F22A]/20 transition-colors" />

            <div className="w-10 h-10 rounded-full bg-[#D9F22A]/10 border border-[#D9F22A]/20 flex items-center justify-center text-[#D9F22A] mb-3">
              <Building2 className="w-5 h-5" />
            </div>

            <div className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight font-['Syne'] mb-1 group-hover:text-[#D9F22A] transition-colors">
              +{displayStartups}
            </div>

            <div className="text-xs tracking-[0.15em] font-bold text-white/80 uppercase max-w-[200px] leading-snug">
              STARTUPS & PLANOS NO CATÁLOGO
            </div>

            <span className="mt-2 text-[10px] text-white/60 font-medium">
              {metrics.totalStartups} Empresas • {metrics.totalPlans} Planos
            </span>
          </div>

          {/* Circle 3: Comissões Geradas & Pagas */}
          <div className="relative w-[270px] h-[270px] sm:w-[290px] sm:h-[290px] rounded-full border border-[#D9F22A]/30 hover:border-[#D9F22A] bg-[#060a15]/90 backdrop-blur-md flex flex-col items-center justify-center text-center p-6 transition-all duration-500 group shadow-[0_0_40px_rgba(217,242,42,0.1)]">
            <div className="absolute inset-2 rounded-full border border-[#D9F22A]/10 group-hover:border-[#D9F22A]/30 transition-colors" />

            <div className="w-10 h-10 rounded-full bg-[#D9F22A]/10 border border-[#D9F22A]/30 flex items-center justify-center text-[#D9F22A] mb-3">
              <Wallet className="w-5 h-5" />
            </div>

            <div className="text-3xl sm:text-4xl font-extrabold text-[#D9F22A] tracking-tight font-['Syne'] mb-1">
              {formatShortBRL(displayCommissions)}
            </div>

            <div className="text-xs tracking-[0.15em] font-bold text-white uppercase max-w-[200px] leading-snug">
              COMISSÕES GERADAS & PAGAS
            </div>

            <div className="mt-2 text-[10px] font-bold text-white/80 bg-white/5 px-3 py-1 rounded-full border border-white/10 flex items-center gap-1.5">
              <span className="text-emerald-400">Pagas: {formatShortBRL(displayPaid)}</span>
            </div>
          </div>
        </div>

        {/* Real Detailed Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#080d1a] border border-white/10 rounded-2xl p-5 flex flex-col gap-2 hover:border-[#D9F22A]/30 transition-all">
            <div className="flex items-center justify-between text-xs text-white/50">
              <span>Usuários Cadastrados</span>
              <Users className="w-4 h-4 text-[#D9F22A]" />
            </div>
            <div className="text-2xl font-black text-white font-['Syne']">
              {metrics.totalRegisteredUsers} Usuários
            </div>
            <p className="text-[11px] text-white/60">
              Afiliados e produtores ativos registrados na plataforma.
            </p>
          </div>

          <div className="bg-[#080d1a] border border-white/10 rounded-2xl p-5 flex flex-col gap-2 hover:border-[#D9F22A]/30 transition-all">
            <div className="flex items-center justify-between text-xs text-white/50">
              <span>Startups & Empresas</span>
              <Building2 className="w-4 h-4 text-[#D9F22A]" />
            </div>
            <div className="text-2xl font-black text-white font-['Syne']">
              {metrics.totalStartups} Cadastradas
            </div>
            <p className="text-[11px] text-white/60">
              {metrics.totalPlans} ofertas e planos comerciais disponíveis.
            </p>
          </div>

          <div className="bg-[#080d1a] border border-white/10 rounded-2xl p-5 flex flex-col gap-2 hover:border-[#D9F22A]/30 transition-all">
            <div className="flex items-center justify-between text-xs text-white/50">
              <span>Comissões Geradas</span>
              <Zap className="w-4 h-4 text-[#D9F22A]" />
            </div>
            <div className="text-2xl font-black text-[#D9F22A] font-['Syne'] truncate">
              {formatBRL(metrics.totalCommissionsGenerated)}
            </div>
            <p className="text-[11px] text-white/60">
              Total acumulado em vendas geradas por afiliados.
            </p>
          </div>

          <div className="bg-[#080d1a] border border-white/10 rounded-2xl p-5 flex flex-col gap-2 hover:border-[#D9F22A]/30 transition-all">
            <div className="flex items-center justify-between text-xs text-white/50">
              <span>Comissões Pagas via PIX</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-emerald-400 font-['Syne'] truncate">
              {formatBRL(metrics.totalCommissionsPaid)}
            </div>
            <p className="text-[11px] text-white/60">
              Saques processados e liquidados com sucesso.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};


