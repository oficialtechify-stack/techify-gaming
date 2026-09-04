import React, { useState } from 'react';
import { CompanyPlan } from '../../types/platform';
import { Sparkles, Building2, CheckCircle2, Copy, Check, Zap, X } from 'lucide-react';

interface ProductDetailModalProps {
  product: CompanyPlan | null;
  onClose: () => void;
  onSimulateSale: (product: CompanyPlan) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  onClose,
  onSimulateSale
}) => {
  const [copied, setCopied] = useState<boolean>(false);

  if (!product) return null;

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://leadspay.com';
  const affiliateLink = `${currentOrigin}/plan/${product.slug || product.id}?ref=${product.affiliateCode || 'LEADS'}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(affiliateLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#080d1a] border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto no-scrollbar">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-white/50 hover:text-white transition-colors cursor-pointer w-8 h-8 rounded-full bg-white/5 flex items-center justify-center"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Company and Category Header */}
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#D9F22A] mb-3 flex-wrap">
          {product.companyName && (
            <span className="px-2.5 py-1 rounded-full bg-white/10 text-white border border-white/15 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-[#D9F22A]" />
              {product.companyName}
            </span>
          )}
          <span className="px-2.5 py-1 rounded-full bg-[#D9F22A]/10 border border-[#D9F22A]/30">
            {product.category}
          </span>
          {product.badge && (
            <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white">
              {product.badge}
            </span>
          )}
        </div>

        <h3 className="text-2xl sm:text-3xl font-black text-white font-['Syne'] mb-2">
          {product.name}
        </h3>

        <p className="text-sm text-white/80 leading-relaxed mb-6">
          {product.description}
        </p>

        {/* Commission Highlighting Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="p-4 rounded-2xl bg-[#050811] border border-white/10 flex flex-col">
            <span className="text-[11px] uppercase tracking-wider text-white/50 font-bold">Valor de Venda (Setup)</span>
            <span className="text-xl font-black text-white mt-1">
              R$ {product.priceSetup.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
            {product.priceMonthly > 0 && (
              <span className="text-[11px] text-white/50 mt-0.5">+ R$ {product.priceMonthly.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês</span>
            )}
          </div>

          <div className="p-4 rounded-2xl bg-[#D9F22A]/10 border border-[#D9F22A]/30 flex flex-col sm:col-span-2">
            <span className="text-[11px] uppercase tracking-wider text-[#D9F22A] font-black">
              Comissão do Afiliado por Venda ({product.commissionPercentage}%)
            </span>
            <span className="text-2xl font-black text-[#D9F22A] mt-1">
              R$ {product.commissionValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
            {product.recurrentCommission ? (
              <span className="text-xs text-white/80 mt-1">
                + {product.recurrentCommission}% de comissão mensal recorrente sobre a mensalidade do cliente.
              </span>
            ) : (
              <span className="text-xs text-white/70 mt-1">
                Comissão creditada imediatamente no fechamento da venda via PIX D+0.
              </span>
            )}
          </div>
        </div>

        {/* Key Features list */}
        {product.features && product.features.length > 0 && (
          <div className="mb-6">
            <h4 className="text-xs font-bold uppercase tracking-widest text-white/60 mb-3">
              Recursos & Benefícios Inclusos
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {product.features.map((feat, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs text-white/80 bg-[#050811] p-3 rounded-xl border border-white/5">
                  <CheckCircle2 className="w-4 h-4 text-[#D9F22A] flex-shrink-0" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Affiliate Selling Box */}
        <div className="p-4 rounded-2xl bg-[#0c1322] border border-[#D9F22A]/20 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-white">
              Link de Divulgação
            </span>
            <span className="text-[10px] font-mono text-[#D9F22A] bg-[#D9F22A]/10 px-2 py-0.5 rounded">
              Código: {product.affiliateCode || 'TECH'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={affiliateLink}
              className="flex-1 bg-[#050811] border border-white/10 rounded-xl px-3 py-2 text-xs text-white/80 font-mono truncate focus:outline-none select-all"
            />
            <button
              onClick={handleCopy}
              className="px-4 py-2 bg-[#D9F22A] hover:bg-[#c8e217] text-[#060A15] font-black text-xs rounded-xl cursor-pointer transition-colors whitespace-nowrap flex items-center gap-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copiado!' : 'Copiar Link'}
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 mt-6">
          <button
            onClick={() => {
              onClose();
              onSimulateSale(product);
            }}
            className="w-full sm:flex-1 bg-[#D9F22A] hover:bg-[#c8e217] text-[#060A15] font-black py-3 px-6 rounded-xl text-xs uppercase tracking-wider cursor-pointer shadow-[0_0_20px_rgba(217,242,42,0.3)] transition-all flex items-center justify-center gap-2"
          >
            <Zap className="w-4 h-4 fill-current" />
            Registrar Venda Deste Plano
          </button>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-3 bg-white/5 hover:bg-white/10 text-white font-bold text-xs rounded-xl border border-white/10 cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
