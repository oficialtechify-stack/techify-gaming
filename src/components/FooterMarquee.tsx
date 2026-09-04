import React from 'react';
import { ActiveModal } from '../types';
import { TechifyLogo } from './TechifyLogo';

interface FooterMarqueeProps {
  onOpenModal: (modal: ActiveModal) => void;
}

export const FooterMarquee: React.FC<FooterMarqueeProps> = ({ onOpenModal }) => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="relative bg-[#060A15] border-t border-white/5 pt-12 pb-10 overflow-hidden">
      {/* Top sliding marquee banner with LeadsPay branding */}
      <div className="w-full overflow-hidden mb-12 py-5 border-y border-white/5 bg-[#040710]/70 flex">
        <div className="animate-marquee flex items-center gap-16 whitespace-nowrap opacity-90 select-none">
          {[1, 2, 3, 4, 5, 6].map((idx) => (
            <div key={idx} className="flex items-center gap-16 flex-shrink-0">
              <TechifyLogo size="lg" />
              <span className="text-[#D9F22A] text-2xl font-black">✦</span>
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 pb-12 border-b border-white/10">
          {/* Col 1: LeadsPay Description & Security */}
          <div className="lg:col-span-4 flex flex-col items-start gap-4">
            <TechifyLogo size="sm" />
            <p className="text-xs text-white/70 leading-relaxed max-w-sm mt-1">
              O LeadsPay é a infraestrutura comercial e marketplace de startups que conecta produtos de tecnologia e SaaS a afiliados de alta performance com repasses instantâneos via PIX D+0.
            </p>
            <div className="flex items-center gap-2 text-[11px] text-[#D9F22A] font-bold uppercase tracking-wider bg-[#D9F22A]/10 px-3 py-1.5 rounded-lg border border-[#D9F22A]/20">
              <span>✦ Split em Tempo Real & PIX D+0</span>
            </div>
          </div>

          {/* Col 2: NAVEGAÇÃO */}
          <div className="lg:col-span-3">
            <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-[#D9F22A] mb-4">
              NAVEGAÇÃO
            </h4>
            <ul className="flex flex-col gap-2.5 text-xs font-semibold text-white/80">
              <li>
                <a
                  href="#home"
                  onClick={(e) => {
                    e.preventDefault();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="hover:text-[#D9F22A] transition-colors"
                >
                  Início
                </a>
              </li>
              <li>
                <a href="#sobre" className="hover:text-[#D9F22A] transition-colors">
                  O Que Fazemos
                </a>
              </li>
              <li>
                <a href="#como-funciona" className="hover:text-[#D9F22A] transition-colors">
                  Como Funciona
                </a>
              </li>
              <li>
                <a href="#categorias" className="hover:text-[#D9F22A] transition-colors">
                  Startups & Categorias
                </a>
              </li>
              <li>
                <a href="#tecnologia" className="hover:text-[#D9F22A] transition-colors">
                  Tecnologia & Split
                </a>
              </li>
            </ul>
          </div>

          {/* Col 3: PLATAFORMA */}
          <div className="lg:col-span-3">
            <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-[#D9F22A] mb-4">
              ECOSSISTEMA
            </h4>
            <ul className="flex flex-col gap-2.5 text-xs font-semibold text-white/80">
              <li>
                <button
                  onClick={() => onOpenModal('about')}
                  className="hover:text-[#D9F22A] transition-colors text-left cursor-pointer"
                >
                  Sobre o LeadsPay
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenModal('culture')}
                  className="hover:text-[#D9F22A] transition-colors text-left cursor-pointer"
                >
                  Cultura & Valores
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenModal('responsible')}
                  className="hover:text-[#D9F22A] transition-colors text-left cursor-pointer"
                >
                  Segurança & Split PIX
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenModal('careers')}
                  className="hover:text-[#D9F22A] transition-colors text-left cursor-pointer"
                >
                  Carreiras & Talentos
                </button>
              </li>
            </ul>
          </div>

          {/* Col 4: ACESSO */}
          <div className="lg:col-span-2">
            <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-[#D9F22A] mb-4">
              PORTAL
            </h4>
            <ul className="flex flex-col gap-2.5 text-xs font-semibold text-white/80">
              <li>
                <button
                  onClick={() => onOpenModal('login')}
                  className="text-white hover:text-[#D9F22A] transition-colors text-left cursor-pointer font-bold"
                >
                  Entrar na Plataforma →
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenModal('report')}
                  className="hover:text-[#D9F22A] transition-colors text-left cursor-pointer text-white/70"
                >
                  Canal de Ética
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-white/50 text-center sm:text-left">
            LEADSPAY PAGAMENTOS S/A CNPJ: 52.639.845/0001-25 Todos os direitos reservados.
          </p>

          <button
            onClick={scrollToTop}
            className="group flex items-center gap-2 text-xs font-bold text-white hover:text-[#D9F22A] transition-colors focus:outline-none cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="37" height="37" viewBox="0 0 37 37" fill="none">
              <circle cx="18.5" cy="18.5" r="18" stroke="#D9F22A" />
              <path d="M15.4037 19.5414L16.0339 20.1716L17.7371 18.4808L18.3781 17.7574L18.379 24.5898L19.288 24.5898L19.2888 17.7574L19.9298 18.4808L21.633 20.1716L22.2624 19.5422L18.8326 16.1124L15.4037 19.5414Z" fill="#D9F22A" />
            </svg>
            <span className="tracking-wider">VOLTAR AO TOPO</span>
          </button>
        </div>
      </div>
    </footer>
  );
};

