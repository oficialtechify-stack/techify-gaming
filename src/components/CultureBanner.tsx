import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Shield, Zap, TrendingUp, CheckCircle } from 'lucide-react';
import { EMPTY_PUBLIC_METRICS, fetchPublicPlatformMetrics, PublicPlatformMetrics } from '../services/publicMetricsService';

export const CultureBanner: React.FC = () => {
  const [metrics, setMetrics] = useState<PublicPlatformMetrics>(EMPTY_PUBLIC_METRICS);

  useEffect(() => {
    let cancelled = false;

    fetchPublicPlatformMetrics()
      .then((nextMetrics) => {
        if (!cancelled) setMetrics(nextMetrics);
      })
      .catch((error) => {
        console.warn('[Public metrics]', error);
      });

    return () => {
      cancelled = true;
    };
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
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold uppercase tracking-tight font-['Syne'] leading-tight text-white">
            Construído para <span className="text-[#D9F22A] drop-shadow-[0_0_20px_rgba(217,242,42,0.3)]">escalar vendas</span> com checkout, afiliados e Stripe Connect.
          </h2>
          <p className="mt-4 text-sm sm:text-base text-white/70">
            Nossa plataforma combina processamento financeiro em tempo real, links de alta conversão e inteligência antifraude para que nenhuma venda fique sem rastreamento.
          </p>
        </motion.div>

        {/* 3 Tech Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <motion.div 
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0 }}
            whileHover={{ y: -5, transition: { duration: 0.2 } }}
            className="p-6 rounded-2xl bg-[#080d1a] border border-white/10 hover:border-[#D9F22A]/40 transition-all duration-300 flex flex-col gap-3 group"
          >
            <div className="w-10 h-10 rounded-xl bg-[#D9F22A]/10 border border-[#D9F22A]/30 flex items-center justify-center text-[#D9F22A] group-hover:scale-110 transition-transform">
              <Shield className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-white font-['Syne'] group-hover:text-[#D9F22A] transition-colors">Rastreamento Anti-Perda de Comissões</h4>
            <p className="text-xs text-white/70 leading-relaxed">
              Cookie de atribuição por 15 dias, parâmetros UTM e vínculo da venda ao código do afiliado para manter a origem da conversão.
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            whileHover={{ y: -5, transition: { duration: 0.2 } }}
            className="p-6 rounded-2xl bg-[#080d1a] border border-white/10 hover:border-[#D9F22A]/40 transition-all duration-300 flex flex-col gap-3 group"
          >
            <div className="w-10 h-10 rounded-xl bg-[#D9F22A]/10 border border-[#D9F22A]/30 flex items-center justify-center text-[#D9F22A] group-hover:scale-110 transition-transform">
              <Zap className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-white font-['Syne'] group-hover:text-[#D9F22A] transition-colors">Motor de Divisão Financeira</h4>
            <p className="text-xs text-white/70 leading-relaxed">
              Depois da confirmação da Stripe, o sistema registra separadamente a parte da empresa, a comissão do afiliado e as taxas da plataforma.
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            whileHover={{ y: -5, transition: { duration: 0.2 } }}
            className="p-6 rounded-2xl bg-[#080d1a] border border-white/10 hover:border-[#D9F22A]/40 transition-all duration-300 flex flex-col gap-3 group"
          >
            <div className="w-10 h-10 rounded-xl bg-[#D9F22A]/10 border border-[#D9F22A]/30 flex items-center justify-center text-[#D9F22A] group-hover:scale-110 transition-transform">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-white font-['Syne'] group-hover:text-[#D9F22A] transition-colors">Checkout Otimizado de Alta Conversão</h4>
            <p className="text-xs text-white/70 leading-relaxed">
              Checkout integrado à Stripe com os meios de pagamento habilitados para a conta e confirmação financeira no backend.
            </p>
          </motion.div>
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
              <p className="text-xs text-white/60">Somatório agregado das comissões registradas nas vendas confirmadas.</p>
            </div>

            <div className="flex flex-col gap-2">
              <div className="text-xs uppercase tracking-widest text-[#D9F22A] font-bold">Saques de Afiliados Enviados</div>
              <div className="text-3xl sm:text-4xl font-extrabold text-[#D9F22A] font-['Syne']">
                {formatBRL(metrics.totalCommissionsPaid)}
              </div>
              <p className="text-xs text-white/60">Valores de afiliados enviados pela infraestrutura Stripe Connect.</p>
            </div>

            <div className="flex flex-col gap-2">
              <div className="text-xs uppercase tracking-widest text-[#D9F22A] font-bold">Tempo de Repasse</div>
              <div className="text-3xl sm:text-4xl font-extrabold text-white font-['Syne']">8 ou 15 dias</div>
              <p className="text-xs text-white/60">Prazo de liberação: 8 dias com plano pago da LeadsPay ou 15 dias no plano gratuito.</p>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs font-bold text-white/80">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-[#D9F22A]" />
              <span>{metrics.totalStartups} Empresas Aprovadas</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-[#D9F22A]" />
              <span>{metrics.totalRegisteredUsers} Usuários Cadastrados</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-[#D9F22A]" />
              <span>Métricas públicas agregadas pelo backend</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};



