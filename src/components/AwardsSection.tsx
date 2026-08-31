import React, { useRef } from 'react';
import { motion } from 'motion/react';
import { AWARDS_DATA } from '../data/stellarData';

export const AwardsSection: React.FC = () => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -340 : 340;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <section id="premios" className="py-20 md:py-28 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-10 gap-4"
        >
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D9F22A]/10 border border-[#D9F22A]/30 text-[11px] font-bold text-[#D9F22A] uppercase tracking-wider mb-2">
              RECONHECIMENTO & AUTORIDADE
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold uppercase tracking-tight font-['Syne'] text-white">
              PRÊMIOS & CONQUISTAS
            </h2>
          </div>

          {/* Navigation Arrows */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => scroll('left')}
              className="w-11 h-11 rounded-full border border-white/20 hover:border-[#D9F22A] flex items-center justify-center text-white hover:text-[#D9F22A] hover:bg-white/5 transition-all focus:outline-none cursor-pointer"
              aria-label="Prêmio Anterior"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <button
              onClick={() => scroll('right')}
              className="w-11 h-11 rounded-full border border-white/20 hover:border-[#D9F22A] flex items-center justify-center text-white hover:text-[#D9F22A] hover:bg-white/5 transition-all focus:outline-none cursor-pointer"
              aria-label="Próximo Prêmio"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </motion.div>

        {/* Horizontal Carousel */}
        <motion.div
          ref={scrollRef}
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="flex gap-6 overflow-x-auto no-scrollbar pb-6 scroll-smooth snap-x snap-mandatory"
        >
          {AWARDS_DATA.map((award, index) => (
            <motion.div
              key={award.id}
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: Math.min(index * 0.08, 0.5), ease: "easeOut" }}
              className="min-w-[280px] sm:min-w-[320px] max-w-[320px] snap-start bg-[#080d1a] border border-white/10 hover:border-[#D9F22A]/50 rounded-xl overflow-hidden transition-all duration-300 flex flex-col group"
            >
              {/* Award Trophy Photo */}
              <div className="aspect-[4/3.2] bg-[#050811] overflow-hidden relative flex items-center justify-center p-4">
                <img
                  src={award.image}
                  alt={award.title}
                  className="w-full h-full object-cover rounded-lg group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#080d1a] via-transparent to-transparent opacity-60" />
              </div>

              {/* Award Info */}
              <div className="p-6 flex flex-col flex-grow justify-between border-t border-white/5">
                <div>
                  <div className="text-2xl font-bold text-[#D9F22A] font-['Syne'] mb-2">
                    {award.year}
                  </div>
                  <p className="text-sm font-medium text-white/90 leading-snug">
                    {award.title}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

