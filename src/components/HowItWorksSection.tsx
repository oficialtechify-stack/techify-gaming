import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Building2, Users, CheckCircle2, ArrowRight, Layers, Sparkles } from 'lucide-react';
import { ActiveModal } from '../types';

interface HowItWorksSectionProps {
  onOpenModal?: (modal: ActiveModal) => void;
}

export const HowItWorksSection: React.FC<HowItWorksSectionProps> = ({ onOpenModal }) => {
  const [activeWorkflow, setActiveWorkflow] = useState<'startups' | 'afiliados'>('startups');

  const startupSteps = [
    {
      step: '01',
      title: 'Cadastre sua Empresa & Soluções',
      desc: 'Crie o perfil institucional da sua startup, adicione identidade visual, defina seus produtos e monte planos comerciais (mensal, anual ou licença).',
      badge: 'Onboarding Rápido',
    },
    {
      step: '02',
      title: 'Defina a Comissão do Afiliado',
      desc: 'Escolha a porcentagem de comissão (ex: 30%, 40%, 50%) para incentivar a comunidade de vendedores a priorizar suas soluções no mercado.',
      badge: 'Definição Flexível',
    },
    {
      step: '03',
      title: 'Disponibilize na Vitrine Pública',
      desc: 'Seus planos entram instantaneamente no Marketplace LeadsPay, ficando visíveis para milhares de afiliados qualificados e gestores de tráfego.',
      badge: 'Visibilidade Imediata',
    },
    {
      step: '04',
      title: 'Escale Vendas com Split Automático',
      desc: 'A cada contrato fechado via link de afiliado, a receita é dividida automaticamente pela plataforma e os repasses são processados via PIX.',
      badge: 'Escala Sem Risco',
    },
  ];

  const affiliateSteps = [
    {
      step: '01',
      title: 'Explore o Catálogo de Startups',
      desc: 'Navegue pelas melhores startups e softwares do mercado em categorias como SaaS, iGaming, Fintech, Gestão e Automação de IA.',
      badge: 'Marketplace Aberto',
    },
    {
      step: '02',
      title: 'Afilie-se com 1 Clique',
      desc: 'Sem burocracia ou formulários complexos: clique em se afiliar para receber imediatamente seus links parametrizados com tag exclusiva.',
      badge: 'Afiliação Instantânea',
    },
    {
      step: '03',
      title: 'Divulgue & Rastreie Conversões',
      desc: 'Compartilhe seus links em campanhas, redes sociais ou reuniões comerciais. Acompanhe cliques, leads e vendas em tempo real no dashboard.',
      badge: 'Rastreamento Preciso',
    },
    {
      step: '04',
      title: 'Receba Comissões no PIX D+0',
      desc: 'A cada pagamento de cliente, sua comissão de até 50% é liberada diretamente na sua carteira digital para saque imediato no mesmo dia.',
      badge: 'PIX no Mesmo Dia',
    },
  ];

  const currentSteps = activeWorkflow === 'startups' ? startupSteps : affiliateSteps;

  return (
    <section id="como-funciona" className="py-20 md:py-28 relative overflow-hidden bg-[#060A15]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D9F22A]/10 border border-[#D9F22A]/30 text-[11px] font-bold text-[#D9F22A] uppercase tracking-wider mb-3">
            <Layers className="w-3.5 h-3.5" />
            FLUXO OPERACIONAL COMPLETO
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight text-white font-['Syne']">
            Como Funciona a Plataforma LeadsPay
          </h2>
          <p className="mt-4 text-white/70 text-sm sm:text-base leading-relaxed">
            Desenvolvemos um fluxo simples, seguro e automatizado para acelerar a conexão comercial entre quem cria tecnologia e quem gera vendas.
          </p>

          {/* Workflow Toggle */}
          <div className="mt-8 inline-flex p-1.5 rounded-2xl bg-[#080d1a] border border-white/10 shadow-lg">
            <button
              onClick={() => setActiveWorkflow('startups')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeWorkflow === 'startups'
                  ? 'bg-[#D9F22A] text-[#060A15] shadow-[0_0_20px_rgba(217,242,42,0.3)]'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Para Startups & Empresas</span>
            </button>
            <button
              onClick={() => setActiveWorkflow('afiliados')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeWorkflow === 'afiliados'
                  ? 'bg-[#D9F22A] text-[#060A15] shadow-[0_0_20px_rgba(217,242,42,0.3)]'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Para Afiliados & Vendedores</span>
            </button>
          </div>
        </div>

        {/* 4 Steps Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {currentSteps.map((item, index) => (
            <motion.div
              key={`${activeWorkflow}-${item.step}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="bg-[#080d1a] border border-white/10 hover:border-[#D9F22A]/40 rounded-2xl p-6 flex flex-col justify-between group transition-all duration-300 relative overflow-hidden"
            >
              {/* Step Number Backdrop Watermark */}
              <div className="absolute top-2 right-4 text-5xl font-black text-white/[0.04] group-hover:text-[#D9F22A]/10 transition-colors pointer-events-none font-['Syne']">
                {item.step}
              </div>

              <div>
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold text-[#D9F22A] uppercase tracking-wider mb-4">
                  {item.badge}
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white font-['Syne'] mb-2 group-hover:text-[#D9F22A] transition-colors">
                  {item.title}
                </h3>
                <p className="text-xs text-white/70 leading-relaxed">
                  {item.desc}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-xs text-white/50">
                <span className="font-mono">Passo {item.step} de 04</span>
                <CheckCircle2 className="w-4 h-4 text-[#D9F22A]/50 group-hover:text-[#D9F22A] transition-colors" />
              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA Bar */}
        {onOpenModal && (
          <div className="mt-12 p-6 sm:p-8 rounded-3xl bg-[#080d1a] border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#D9F22A]/10 text-[#D9F22A] flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base sm:text-lg font-bold text-white font-['Syne']">
                  {activeWorkflow === 'startups' 
                    ? 'Pronto para impulsionar suas vendas com afiliados?' 
                    : 'Pronto para faturar comissões de até 50%?'}
                </h4>
                <p className="text-xs text-white/60">
                  {activeWorkflow === 'startups'
                    ? 'Cadastre sua empresa e publique seus primeiros planos comerciais hoje mesmo.'
                    : 'Crie sua conta de afiliado e tenha acesso imediato a todos os produtos.'}
                </p>
              </div>
            </div>

            <button
              onClick={() => onOpenModal(activeWorkflow === 'startups' ? 'register_company' : 'register_affiliate')}
              className="bg-[#D9F22A] hover:bg-[#cbe31c] text-[#060A15] font-black py-3.5 px-6 rounded-xl text-xs uppercase tracking-wider transition-all duration-300 shadow-[0_0_20px_rgba(217,242,42,0.3)] cursor-pointer flex items-center gap-2 whitespace-nowrap"
            >
              <span>{activeWorkflow === 'startups' ? 'Cadastrar Minha Empresa' : 'Criar Conta de Afiliado'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
};
