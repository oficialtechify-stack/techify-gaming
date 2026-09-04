import React, { useState } from 'react';
import { CompanyPlan } from '../../types/platform';
import { 
  X, 
  Link2, 
  Copy, 
  Check, 
  ExternalLink, 
  QrCode, 
  ShoppingBag, 
  ShieldCheck, 
  Sparkles,
  CreditCard
} from 'lucide-react';
import { PLATFORM_CHECKOUT_FEE } from '../checkout/CustomCheckoutPage';

interface PlanLinksModalProps {
  plan: CompanyPlan | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenCheckout: (plan: CompanyPlan) => void;
}

export const PlanLinksModal: React.FC<PlanLinksModalProps> = ({
  plan,
  isOpen,
  onClose,
  onOpenCheckout
}) => {
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [showQrCode, setShowQrCode] = useState<boolean>(false);

  if (!isOpen || !plan) return null;

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://leadspay.com';
  const checkoutUrl = `${currentOrigin}?checkout=${plan.id}`;
  const salesPageUrl = `${currentOrigin}?product=${plan.id}`;

  const copyToClipboard = (text: string, linkType: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(linkType);
    setTimeout(() => setCopiedLink(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#080d1a] border border-white/10 rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-[0_0_50px_rgba(0,0,0,0.8)] relative max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#D9F22A]/10 border border-[#D9F22A]/30 flex items-center justify-center text-[#D9F22A]">
              <Link2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white font-['Syne']">
                Links Exclusivos de Venda
              </h3>
              <p className="text-xs text-white/50">
                {plan.name} • {plan.companyName}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-5">
          {/* Main Direct Checkout Link */}
          <div className="p-4 rounded-2xl bg-[#050811] border border-emerald-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <CreditCard className="w-4 h-4" /> Link Exclusivo do Checkout
              </span>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                Taxa R$ {PLATFORM_CHECKOUT_FEE.toFixed(2).replace('.', ',')}
              </span>
            </div>

            <p className="text-xs text-white/70">
              Envie este link direto para seus clientes efetuarem o pagamento via PIX ou Cartão de Crédito com a taxa de 99 centavos da plataforma.
            </p>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={checkoutUrl}
                className="flex-1 bg-[#080d1a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white/90 font-mono select-all truncate"
              />
              <button
                type="button"
                onClick={() => copyToClipboard(checkoutUrl, 'checkout')}
                className="bg-[#D9F22A] hover:bg-[#c8e217] text-[#060A15] font-black px-3.5 py-2 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 flex-shrink-0"
              >
                {copiedLink === 'checkout' ? <Check className="w-4 h-4 stroke-[3]" /> : <Copy className="w-4 h-4" />}
                {copiedLink === 'checkout' ? 'Copiado!' : 'Copiar'}
              </button>
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => onOpenCheckout(plan)}
                className="text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer flex items-center gap-1"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Abrir Checkout ao Vivo
              </button>

              <button
                type="button"
                onClick={() => setShowQrCode(!showQrCode)}
                className="text-xs font-bold text-white/60 hover:text-white transition-colors cursor-pointer flex items-center gap-1"
              >
                <QrCode className="w-3.5 h-3.5" /> {showQrCode ? 'Ocultar QR Code' : 'Ver QR Code'}
              </button>
            </div>

            {showQrCode && (
              <div className="pt-3 flex flex-col items-center justify-center gap-2 border-t border-white/10 animate-in fade-in duration-200">
                <div className="p-2 bg-white rounded-2xl border border-white/20">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(checkoutUrl)}`}
                    alt="QR Code Checkout"
                    className="w-36 h-36"
                  />
                </div>
                <span className="text-[10px] text-white/50">Escaneie para pagar direto no celular</span>
              </div>
            )}
          </div>

          {/* Sales Page / Showcase Link */}
          <div className="p-4 rounded-2xl bg-[#050811] border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <ShoppingBag className="w-4 h-4 text-[#D9F22A]" /> Página de Vendas / Vitrine
              </span>
            </div>

            <p className="text-xs text-white/70">
              Página com detalhes completos do plano, especificações, depoimentos e botão de contratação.
            </p>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={salesPageUrl}
                className="flex-1 bg-[#080d1a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white/90 font-mono select-all truncate"
              />
              <button
                type="button"
                onClick={() => copyToClipboard(salesPageUrl, 'sales')}
                className="bg-white/10 hover:bg-white/15 text-white font-bold px-3.5 py-2 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 flex-shrink-0 border border-white/10"
              >
                {copiedLink === 'sales' ? <Check className="w-4 h-4 stroke-[3] text-emerald-400" /> : <Copy className="w-4 h-4" />}
                {copiedLink === 'sales' ? 'Copiado!' : 'Copiar'}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-white/10 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-white text-xs font-bold transition-all cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
