import React from 'react';
import { Zap, CheckCircle, ArrowRight, ShieldCheck, TrendingDown, Sparkles } from 'lucide-react';
import { ActiveModal } from '../types';

interface MarketFeeComparisonSectionProps {
  onOpenModal?: (modal: ActiveModal) => void;
  onOpenPlatform?: () => void;
}

interface GatewayComparisonItem {
  name: string;
  isLeadsPay?: boolean;
  pixWithdrawalFee: string;
  minWithdrawal: string;
  savingsVsLeadsPay: string;
  checkoutFixedFee: string;
  badge?: string;
  tagline?: string;
}

export const MarketFeeComparisonSection: React.FC<MarketFeeComparisonSectionProps> = ({
  onOpenModal,
  onOpenPlatform
}) => {
  const comparisonData: GatewayComparisonItem[] = [
    {
      name: 'LeadsPay ⚡',
      isLeadsPay: true,
      pixWithdrawalFee: 'R$ 2,50',
      minWithdrawal: 'R$ 10,00',
      savingsVsLeadsPay: 'Sua Plataforma',
      checkoutFixedFee: 'R$ 0,99',
      badge: 'Menores Taxas',
      tagline: 'Split PJ automático & Saque Instantâneo'
    },
    {
      name: 'Kiwify',
      isLeadsPay: false,
      pixWithdrawalFee: 'R$ 3,67',
      minWithdrawal: 'R$ 5,00',
      savingsVsLeadsPay: 'Economize R$ 1,17 por saque',
      checkoutFixedFee: 'R$ 2,49 + %',
      tagline: 'Taxa fixa alta por transação'
    },
    {
      name: 'Cakto',
      isLeadsPay: false,
      pixWithdrawalFee: 'R$ 4,59',
      minWithdrawal: 'R$ 10,00',
      savingsVsLeadsPay: 'Economize R$ 2,09 por saque',
      checkoutFixedFee: 'R$ 0,99 + %',
      tagline: 'Custo de transferência elevado'
    },
    {
      name: 'Hotmart',
      isLeadsPay: false,
      pixWithdrawalFee: 'Até R$ 4,75',
      minWithdrawal: 'R$ 20,00',
      savingsVsLeadsPay: 'Economize até R$ 2,25 por saque',
      checkoutFixedFee: 'R$ 1,00 + %',
      tagline: 'Saque mínimo alto e taxas graduadas'
    }
  ];

  return (
    <section id="comparativo-taxas" className="relative w-full bg-[#060A15] text-white py-20 sm:py-24 md:py-28 overflow-hidden border-b border-white/5">
      {/* Glow Ambient Lights */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-[#D9F22A]/[0.04] rounded-full blur-[180px] pointer-events-none -z-10" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header Pill & Headlines */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#D9F22A]/30 bg-[#080d1a] text-xs font-bold uppercase tracking-wider text-[#D9F22A] shadow-[0_0_15px_rgba(217,242,42,0.15)] mb-4">
            <TrendingDown className="w-3.5 h-3.5" />
            <span>Comparativo de Mercado</span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white font-['Syne'] leading-tight">
            Transparência total no seu bolso.
            <br />
            <span className="text-[#D9F22A] drop-shadow-[0_0_25px_rgba(217,242,42,0.3)]">
              Mais lucro retido a cada venda.
            </span>
          </h2>

          <p className="mt-4 text-sm sm:text-base md:text-lg text-white/75 leading-relaxed max-w-2xl mx-auto">
            Transparência total no seu bolso. Veja como a LeadsPay se compara aos principais gateways do mercado:
          </p>
        </div>

        {/* Comparison Table Card */}
        <div className="rounded-3xl bg-[#080d1a]/95 border border-white/10 p-4 sm:p-7 shadow-[0_0_50px_rgba(0,0,0,0.6)] backdrop-blur-md overflow-hidden relative">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[650px]">
              <thead>
                <tr className="border-b border-white/10 text-[11px] sm:text-xs font-black uppercase tracking-wider text-white/50">
                  <th className="py-4 px-4 sm:px-6">Plataforma</th>
                  <th className="py-4 px-4 sm:px-5">Taxa de Saque (PIX)</th>
                  <th className="py-4 px-4 sm:px-5">Saque Mínimo</th>
                  <th className="py-4 px-4 sm:px-5">Economia por Saque (vs. LeadsPay)</th>
                  <th className="py-4 px-4 sm:px-5 text-right">Taxa Fixa por Checkout</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {comparisonData.map((item, idx) => (
                  <tr
                    key={idx}
                    className={`transition-colors duration-200 ${
                      item.isLeadsPay
                        ? 'bg-[#D9F22A]/[0.08] hover:bg-[#D9F22A]/[0.12] border-l-4 border-l-[#D9F22A]'
                        : 'hover:bg-white/[0.02]'
                    }`}
                  >
                    {/* Plataforma */}
                    <td className="py-5 px-4 sm:px-6">
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className={`text-base sm:text-lg font-black ${item.isLeadsPay ? 'text-[#D9F22A] font-[\'Syne\']' : 'text-white'}`}>
                              {item.name}
                            </span>
                            {item.badge && (
                              <span className="px-2.5 py-0.5 rounded-full bg-[#D9F22A] text-black text-[10px] font-black uppercase tracking-wider shadow-[0_0_10px_rgba(217,242,42,0.4)]">
                                {item.badge}
                              </span>
                            )}
                          </div>
                          {item.tagline && (
                            <span className="text-[11px] text-white/50 mt-0.5">{item.tagline}</span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Taxa de Saque (PIX) */}
                    <td className="py-5 px-4 sm:px-5">
                      <span className={`text-sm sm:text-base font-bold ${item.isLeadsPay ? 'text-[#D9F22A] font-black' : 'text-white/80'}`}>
                        {item.pixWithdrawalFee}
                      </span>
                    </td>

                    {/* Saque Mínimo */}
                    <td className="py-5 px-4 sm:px-5">
                      <span className="text-xs sm:text-sm font-semibold text-white/90">
                        {item.minWithdrawal}
                      </span>
                    </td>

                    {/* Economia por Saque */}
                    <td className="py-5 px-4 sm:px-5">
                      {item.isLeadsPay ? (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#D9F22A]/20 border border-[#D9F22A]/40 text-[#D9F22A] text-xs font-black">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>{item.savingsVsLeadsPay}</span>
                        </div>
                      ) : (
                        <span className="text-xs sm:text-sm font-bold text-[#4ade80]">
                          {item.savingsVsLeadsPay}
                        </span>
                      )}
                    </td>

                    {/* Taxa Fixa por Checkout */}
                    <td className="py-5 px-4 sm:px-5 text-right">
                      <span className={`text-sm sm:text-base font-black ${item.isLeadsPay ? 'text-[#D9F22A]' : 'text-white/80'}`}>
                        {item.checkoutFixedFee}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Quick Summary Highlights below Table */}
          <div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            <div className="p-4 rounded-2xl bg-[#050811] border border-white/5">
              <div className="text-xs font-bold text-white/50 uppercase">Saque PIX LeadsPay</div>
              <div className="text-xl sm:text-2xl font-black text-[#D9F22A] mt-1">Apenas R$ 2,50</div>
              <p className="text-[11px] text-white/60 mt-1">O menor custo de transferência do ecossistema</p>
            </div>

            <div className="p-4 rounded-2xl bg-[#050811] border border-white/5">
              <div className="text-xs font-bold text-white/50 uppercase">Saque Mínimo Acessível</div>
              <div className="text-xl sm:text-2xl font-black text-white mt-1">R$ 10,00</div>
              <p className="text-[11px] text-white/60 mt-1">Sem travar seu fluxo de caixa ou retenções abusivas</p>
            </div>

            <div className="p-4 rounded-2xl bg-[#050811] border border-white/5">
              <div className="text-xs font-bold text-white/50 uppercase">Taxa Fixa por Checkout</div>
              <div className="text-xl sm:text-2xl font-black text-[#D9F22A] mt-1">R$ 0,99</div>
              <p className="text-[11px] text-white/60 mt-1">Economia real em cada carrinho aprovado</p>
            </div>
          </div>
        </div>

        {/* CTA Action Banner */}
        <div className="mt-10 sm:mt-12 flex flex-col sm:flex-row items-center justify-between gap-6 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#080d1a] via-[#0c1324] to-[#080d1a] border border-[#D9F22A]/30 shadow-[0_0_30px_rgba(217,242,42,0.15)]">
          <div className="text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2 text-xs font-bold uppercase tracking-wider text-[#D9F22A] mb-1">
              <ShieldCheck className="w-4 h-4" />
              <span>Sem Mensalidade Obrigatória • Cadastro Imediato</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white font-['Syne']">
              Pronto para maximizar o retorno das suas vendas?
            </h3>
            <p className="text-xs sm:text-sm text-white/70 mt-1">
              Junte-se à plataforma de pagamentos e afiliação com as menores taxas do Brasil.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            {onOpenModal ? (
              <button
                onClick={() => onOpenModal('register_affiliate')}
                className="cursor-pointer inline-flex items-center gap-2.5 px-7 py-3.5 sm:px-8 sm:py-4 rounded-2xl bg-[#D9F22A] hover:bg-[#cbe31c] text-[#060A15] font-black text-xs sm:text-sm uppercase tracking-wider shadow-[0_0_25px_rgba(217,242,42,0.35)] hover:scale-105 transition-all duration-300"
              >
                <span>Criar Conta Grátis</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : onOpenPlatform ? (
              <button
                onClick={onOpenPlatform}
                className="cursor-pointer inline-flex items-center gap-2.5 px-7 py-3.5 sm:px-8 sm:py-4 rounded-2xl bg-[#D9F22A] hover:bg-[#cbe31c] text-[#060A15] font-black text-xs sm:text-sm uppercase tracking-wider shadow-[0_0_25px_rgba(217,242,42,0.35)] hover:scale-105 transition-all duration-300"
              >
                <span>Começar Agora</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
};
