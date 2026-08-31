import React, { useState } from 'react';
import { motion } from 'motion/react';
import { SPONSOR_GALLERY_IMAGES } from '../data/stellarData';
import { Layers, Laptop, Gamepad2, CreditCard, Bot, Megaphone, ShoppingCart } from 'lucide-react';

export const SponsorshipsSection: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const categories = [
    { id: 'all', label: 'Todas as Categorias', icon: Layers },
    { id: 'saas', label: 'SaaS & Gestão', icon: Laptop },
    { id: 'igaming', label: 'iGaming & Entretenimento', icon: Gamepad2 },
    { id: 'fintech', label: 'Fintechs & Pagamentos', icon: CreditCard },
    { id: 'ia', label: 'IA & Automação', icon: Bot },
    { id: 'martech', label: 'MarTech & Vendas', icon: Megaphone },
  ];

  const startupShowcase = [
    { name: 'EstrelaBet Tech', category: 'igaming', commission: '45%', ticket: 'R$ 1.890/mês', tag: 'Alta Conversão' },
    { name: 'Vupi Digital', category: 'igaming', commission: '40%', ticket: 'R$ 980/mês', tag: 'Destaque' },
    { name: 'OmniFlow CRM', category: 'saas', commission: '35%', ticket: 'R$ 450/mês', tag: 'SaaS B2B' },
    { name: 'PaySplit Gateway', category: 'fintech', commission: '30%', ticket: 'R$ 1.200/mês', tag: 'Fintech' },
    { name: 'LeadGenius AI', category: 'ia', commission: '50%', ticket: 'R$ 397/mês', tag: 'IA Aplicada' },
    { name: 'AdScale Booster', category: 'martech', commission: '40%', ticket: 'R$ 650/mês', tag: 'MarTech' },
  ];

  const filteredStartups = activeCategory === 'all' 
    ? startupShowcase 
    : startupShowcase.filter(s => s.category === activeCategory);

  return (
    <section id="categorias" className="py-20 md:py-28 relative bg-[#060A15] border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-12"
        >
          <div className="max-w-2xl flex flex-col items-start gap-4">
            <div className="inline-flex items-center gap-2 bg-[#0c1322] border border-[#D9F22A]/30 rounded-full px-4 py-1.5 text-xs font-semibold text-[#D9F22A]">
              <Layers className="w-3.5 h-3.5" />
              <span>ECOSSISTEMA DIVERSIFICADO</span>
            </div>

            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold uppercase tracking-tight font-['Syne'] text-white">
              CATEGORIAS & STARTUPS
            </h2>
          </div>

          <div className="lg:max-w-xl text-white/80 text-sm sm:text-base leading-relaxed">
            <p>
              O marketplace da Techify reúne empresas e softwares de alta demanda. Afiliados encontram produtos com tickets atrativos e comissões garantidas para os mais diversos nichos de mercado.
            </p>
          </div>
        </motion.div>

        {/* Category Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-10 pb-2 border-b border-white/5">
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 cursor-pointer ${
                  activeCategory === cat.id
                    ? 'bg-[#D9F22A] text-[#060A15] shadow-[0_0_15px_rgba(217,242,42,0.4)]'
                    : 'bg-[#0a1020] text-white/70 hover:text-white border border-white/10 hover:border-white/30'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Startups Showcase Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {filteredStartups.map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: idx * 0.05 }}
              className="p-6 rounded-2xl bg-[#080d1a] border border-white/10 hover:border-[#D9F22A]/40 transition-all duration-300 flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-[#D9F22A]/10 text-[#D9F22A] border border-[#D9F22A]/20">
                    {item.tag}
                  </span>
                  <span className="text-xs text-white/50 font-mono">Comissão: <strong className="text-[#D9F22A] text-sm">{item.commission}</strong></span>
                </div>
                <h3 className="text-lg font-bold text-white font-['Syne'] mb-1 group-hover:text-[#D9F22A] transition-colors">
                  {item.name}
                </h3>
                <p className="text-xs text-white/60">
                  Ticket Médio: <span className="text-white font-medium">{item.ticket}</span>
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-xs">
                <span className="text-white/50">Liquidação: <strong>PIX D+0</strong></span>
                <span className="text-[#D9F22A] font-bold group-hover:underline">Afiliação Disponível →</span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Partner Logos Grid */}
        <div className="pt-8 border-t border-white/10">
          <div className="text-xs font-bold uppercase tracking-widest text-white/50 mb-6 text-center">
            Startups & Empresas no Ecossistema Techify:
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {SPONSOR_GALLERY_IMAGES.map((sponsor) => (
              <div
                key={sponsor.id}
                className="bg-[#080d1a]/80 border border-white/5 hover:border-white/20 rounded-xl p-3 flex items-center justify-center aspect-[4/2.5] group transition-all"
              >
                <img
                  src={sponsor.image}
                  alt={sponsor.name}
                  className="w-full h-full object-contain filter grayscale group-hover:grayscale-0 opacity-60 group-hover:opacity-100 transition-all duration-300"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};


