import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Shield, Zap, TrendingUp, Cpu, CheckCircle } from 'lucide-react';
import { subscribeGlobalPlatformMetrics, GlobalPlatformMetrics } from '../services/firestoreService';

export const CultureBanner: React.FC = () => {
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

  useEffect(() => {
    const unsub = subscribeGlobalPlatformMetrics((m) => {
      setMetrics(m);
    });
    return () => unsub();
  }, []);

  const formatBRL = (val: number) => {
    return val.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  return (
    <section id="tecnologia" className="py-20 md:py-28 relative bg-[#060A15] border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Title */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="text-center max-w-3xl mx-auto mb-12 sm:mb-16"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D9F22A]/10 border border-[#D9F22A]/30 text-[11px] font-bold text-[#D9F22A] uppercase tracking-wider mb-3">
            <Cpu className="w-3.5 h-3.5" />
            INFRAESTRUTURA & TECNOLOGIA PROPRIETÁRIA
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold uppercase tracking-tight font-['Syne'] leading-tight text-white">
            Construído para <span className="text-[#D9F22A] drop-shadow-[0_0_20px_rgba(217,242,42,0.3)]">escalar contratos</span> e liquidar comissões no PIX D+0.
          </h2>
          <p className="mt-4 text-sm sm:text-base text-white/70">
            Nossa plataforma combina processamento financeiro em tempo real, links de alta conversão e inteligência antifraude para que nenhuma venda fique sem rastreamento.
          </p>
        </motion.div>

        {/* 3 Tech Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="p-6 rounded-2xl bg-[#080d1a] border border-white/10 flex flex-col gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#D9F22A]/10 border border-[#D9F22A]/30 flex items-center justify-center text-[#D9F22A]">
              <Shield className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-white font-['Syne']">Rastreamento Anti-Perda de Comissões</h4>
            <p className="text-xs text-white/70 leading-relaxed">
              Cookies persistentes de 90 dias, captura de parâmetros UTM e associação multi-touch para garantir a correta atribuição do afiliado.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#080d1a] border border-white/10 flex flex-col gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#D9F22A]/10 border border-[#D9F22A]/30 flex items-center justify-center text-[#D9F22A]">
              <Zap className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-white font-['Syne']">Motor de Split Instantâneo</h4>
            <p className="text-xs text-white/70 leading-relaxed">
              O comprador paga o plano via PIX ou cartão, e o sistema divide a receita instantaneamente entre a startup parceira e o afiliado.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#080d1a] border border-white/10 flex flex-col gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#D9F22A]/10 border border-[#D9F22A]/30 flex items-center justify-center text-[#D9F22A]">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-white font-['Syne']">Checkout Otimizado de Alta Conversão</h4>
            <p className="text-xs text-white/70 leading-relaxed">
              Páginas de pagamento leves com carregamento em milissegundos e suporte a múltiplos métodos (PIX, Boleto e Cartão de Crédito).
            </p>
          </div>
        </div>

        {/* Banner with ecosystem performance & real-time metrics */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="relative rounded-3xl overflow-hidden border border-white/10 bg-gradient-to-r from-[#080d1a] via-[#0b1426] to-[#080d1a] p-8 sm:p-12 shadow-2xl"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
            <div className="flex flex-col gap-2">
              <div className="text-xs uppercase tracking-widest text-[#D9F22A] font-bold">Comissões Geradas</div>
              <div className="text-3xl sm:text-4xl font-extrabold text-white font-['Syne']">
                {formatBRL(metrics.totalCommissionsGenerated)}
              </div>
              <p className="text-xs text-white/60">Calculado em tempo real sobre vendas ativas dos afiliados.</p>
            </div>

            <div className="flex flex-col gap-2">
              <div className="text-xs uppercase tracking-widest text-[#D9F22A] font-bold">Comissões Pagas via PIX</div>
              <div className="text-3xl sm:text-4xl font-extrabold text-[#D9F22A] font-['Syne']">
                {formatBRL(metrics.totalCommissionsPaid)}
              </div>
              <p className="text-xs text-white/60">Liquidados via PIX direto na chave cadastrada dos parceiros.</p>
            </div>

            <div className="flex flex-col gap-2">
              <div className="text-xs uppercase tracking-widest text-[#D9F22A] font-bold">Tempo de Repasse</div>
              <div className="text-3xl sm:text-4xl font-extrabold text-white font-['Syne']">&lt; 3 Segundos</div>
              <p className="text-xs text-white/60">Liquidação imediata D+0 sem carência de 30 dias.</p>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs font-bold text-white/80">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-[#D9F22A]" />
              <span>{metrics.totalStartups} Startups Cadastradas</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-[#D9F22A]" />
              <span>{metrics.totalRegisteredUsers} Usuários Conectados</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-[#D9F22A]" />
              <span>100% Sincronizado com Banco Firestore</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};



