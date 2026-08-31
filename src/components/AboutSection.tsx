import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, Building2, Users, Check, ArrowUpRight, ShieldCheck, Zap } from 'lucide-react';

export const AboutSection: React.FC = () => {
  return (
    <section id="sobre" className="py-20 md:py-28 relative overflow-hidden bg-[#050811]/90 border-t border-white/5">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-start mb-16">
          {/* Left Column: Pill & Tagline */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-5 flex flex-col items-start gap-4"
          >
            <div className="inline-flex items-center gap-2.5 bg-[#080d1a] border border-[#D9F22A]/30 rounded-full px-4 py-1.5 text-xs font-semibold text-[#D9F22A]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>O QUE É A TECHIFY?</span>
            </div>

            <h2 className="text-2xl sm:text-4xl font-extrabold text-white uppercase tracking-tight font-['Syne'] leading-tight">
              A ponte definitiva entre <span className="text-[#D9F22A]">quem cria tecnologia</span> e quem sabe vender.
            </h2>
          </motion.div>

          {/* Right Column: Narrative Copy */}
          <motion.div 
            initial={{ opacity: 0, y: 35 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-7 flex flex-col gap-5 text-white/80 text-sm sm:text-base leading-relaxed"
          >
            <p>
              Muitas empresas e startups de tecnologia desenvolvem softwares inovadores, mas enfrentam o desafio mais crítico do mercado: <strong>escalar a distribuição comercial sem explodir o Custo de Aquisição de Clientes (CAC)</strong>.
            </p>
            <p>
              Ao mesmo tempo, milhares de afiliados profissionais, gestores de tráfego e consultores de vendas buscam soluções tecnológicas robustas e de alto ticket para monetizar sua base de contatos.
            </p>
            <p className="text-white font-medium">
              A <strong>Techify</strong> nasceu para unificar essas duas frentes: uma plataforma marketplace onde empresas publicam seus planos e um exército de afiliados capacitados gera vendas contínuas com comissões justas e liquidadas no mesmo dia.
            </p>
          </motion.div>
        </div>

        {/* 2 Detailed Cards: Para Startups vs Para Afiliados */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Card 1: Para Startups */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="bg-[#080d1a] border border-white/10 hover:border-[#D9F22A]/40 rounded-3xl p-8 transition-all duration-300 flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-[#D9F22A]/10 border border-[#D9F22A]/30 flex items-center justify-center text-[#D9F22A] mb-6">
                <Building2 className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest text-[#D9F22A]">Para Startups & Produtores</span>
              <h3 className="text-xl sm:text-2xl font-black text-white font-['Syne'] mt-1 mb-4">
                Escale suas Vendas B2B sem Custo Fixo de Equipe
              </h3>
              <p className="text-xs sm:text-sm text-white/70 leading-relaxed mb-6">
                Tenha dezenas de profissionais vendendo seus planos comerciais todos os dias. Você define as regras, a margem de comissão e nós cuidamos da infraestrutura e split de pagamento.
              </p>

              <ul className="flex flex-col gap-3 text-xs sm:text-sm text-white/80">
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-[#D9F22A] flex-shrink-0 mt-0.5" />
                  <span>Cadastro ilimitado de planos e modelos de precificação.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-[#D9F22A] flex-shrink-0 mt-0.5" />
                  <span>Gestão completa de afiliados e vendedores autorizados.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-[#D9F22A] flex-shrink-0 mt-0.5" />
                  <span>Painel analítico de conversões e volume transacionado.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-[#D9F22A] flex-shrink-0 mt-0.5" />
                  <span>Pague comissões apenas quando o contrato for fechado.</span>
                </li>
              </ul>
            </div>

            <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between">
              <span className="text-xs font-bold text-white/60 uppercase tracking-wider">Modelo Baseado em Sucesso</span>
              <div className="flex items-center gap-1 text-xs font-bold text-[#D9F22A]">
                <span>Zero Risco</span>
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>
          </motion.div>

          {/* Card 2: Para Afiliados */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="bg-[#080d1a] border border-white/10 hover:border-[#D9F22A]/40 rounded-3xl p-8 transition-all duration-300 flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-[#D9F22A]/10 border border-[#D9F22A]/30 flex items-center justify-center text-[#D9F22A] mb-6">
                <Users className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest text-[#D9F22A]">Para Afiliados & Vendedores</span>
              <h3 className="text-xl sm:text-2xl font-black text-white font-['Syne'] mt-1 mb-4">
                Monetize com Produtos Validados & Comissões de até 50%
              </h3>
              <p className="text-xs sm:text-sm text-white/70 leading-relaxed mb-6">
                Acesse uma vitrine com as melhores soluções de software, SaaS e tecnologia do mercado. Afilie-se com 1 clique e receba seus repasses via PIX no mesmo dia.
              </p>

              <ul className="flex flex-col gap-3 text-xs sm:text-sm text-white/80">
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-[#D9F22A] flex-shrink-0 mt-0.5" />
                  <span>Afiliação com 1 clique sem burocracia ou aprovações lentas.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-[#D9F22A] flex-shrink-0 mt-0.5" />
                  <span>Links com tecnologia anti-perda e rastreamento avançado.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-[#D9F22A] flex-shrink-0 mt-0.5" />
                  <span>Comissões altas (30% a 50%) em tickets atrativos.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-[#D9F22A] flex-shrink-0 mt-0.5" />
                  <span>Saques liberados via PIX instantâneo com liquidação D+0.</span>
                </li>
              </ul>
            </div>

            <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between">
              <span className="text-xs font-bold text-white/60 uppercase tracking-wider">Liquidez Imediata</span>
              <div className="flex items-center gap-1 text-xs font-bold text-[#D9F22A]">
                <span>Repasse via PIX D+0</span>
                <Zap className="w-4 h-4" />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};


