import React, { useState } from 'react';
import { CompanyPlan, SaleTransaction } from '../../types/platform';
import { DollarSign, Shield, Building2, User, Mail, CreditCard, Sparkles, X } from 'lucide-react';

interface RegisterSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  platforms?: CompanyPlan[];
  defaultPlanId?: string;
  onSaleCreated: (newSale: SaleTransaction) => void;
}

export const RegisterSaleModal: React.FC<RegisterSaleModalProps> = ({
  isOpen,
  onClose,
  platforms = [],
  defaultPlanId,
  onSaleCreated
}) => {
  const [selectedProductId, setSelectedProductId] = useState<string>(
    defaultPlanId || platforms[0]?.id || 'custom'
  );
  const [customPlatformName, setCustomPlatformName] = useState<string>('');
  const [customPrice, setCustomPrice] = useState<number>(5000);
  const [customCommissionPercent, setCustomCommissionPercent] = useState<number>(35);

  const [buyerName, setBuyerName] = useState<string>('');
  const [buyerCompany, setBuyerCompany] = useState<string>('');
  const [buyerEmail, setBuyerEmail] = useState<string>('');
  const [method, setMethod] = useState<'PIX' | 'Cartão de Crédito' | 'PicPay' | 'Crypto USDT'>('PIX');
  const [utmSource, setUtmSource] = useState<string>('link_afiliado');

  if (!isOpen) return null;

  const currentPlatform = platforms.find(p => p.id === selectedProductId);

  const priceSetup = currentPlatform ? currentPlatform.priceSetup : customPrice;
  const commissionPercentage = currentPlatform ? currentPlatform.commissionPercentage : customCommissionPercent;
  const commissionValue = currentPlatform ? currentPlatform.commissionValue : Number(((customPrice * customCommissionPercent) / 100).toFixed(2));
  const platformName = currentPlatform ? currentPlatform.name : (customPlatformName || 'Plano Personalizado');

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!buyerName.trim() || !buyerCompany.trim() || !buyerEmail.trim()) {
      alert('Por favor, preencha todos os campos obrigatórios do comprador.');
      return;
    }

    const newTx: SaleTransaction = {
      id: `TX-${Math.floor(100000 + Math.random() * 900000)}`,
      companyId: currentPlatform?.companyId || 'comp_general',
      companyName: currentPlatform?.companyName || 'Startup Parceira',
      platformId: currentPlatform ? currentPlatform.id : `custom-${Date.now()}`,
      platformName,
      buyerName: buyerName.trim(),
      buyerCompany: buyerCompany.trim(),
      buyerEmail: buyerEmail.trim(),
      method,
      amount: priceSetup,
      commissionEarned: commissionValue,
      date: new Date().toLocaleDateString('pt-BR'),
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      status: 'Aprovado',
      utmSource: utmSource.trim() || 'direto',
      sellerId: 'usr_techify_main',
      affiliateId: 'usr_techify_main',
      affiliateName: 'Afiliado Oficial'
    };

    onSaleCreated(newTx);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#080d1a] border border-[#D9F22A]/40 rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(217,242,42,0.15)] max-h-[90vh] overflow-y-auto no-scrollbar">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-white/50 hover:text-white transition-colors cursor-pointer w-8 h-8 rounded-full bg-white/5 flex items-center justify-center"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#D9F22A] mb-1">
          <span className="w-2 h-2 rounded-full bg-[#D9F22A]" />
          Lançamento de Venda & Comissão
        </div>

        <h3 className="text-xl sm:text-2xl font-black text-white font-['Syne'] mb-2">
          Registrar Nova Venda
        </h3>
        <p className="text-xs text-white/70 mb-6">
          Ao registrar a venda do plano, o contrato é confirmado no sistema e a comissão de <strong>R$ {commissionValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong> é creditada diretamente na carteira para saque via PIX D+0.
        </p>

        <form onSubmit={handleRegister} className="flex flex-col gap-4">
          {platforms.length > 0 ? (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-2">
                Selecione o Plano da Empresa Vendido *
              </label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full bg-[#050811] border border-white/15 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#D9F22A] transition-colors"
              >
                {platforms.map((prod) => (
                  <option key={prod.id} value={prod.id} className="bg-[#080d1a] text-white">
                    {prod.companyName ? `[${prod.companyName}] ` : ''}{prod.name} — Valor: R$ {prod.priceSetup.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (Comissão: R$ {prod.commissionValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="space-y-3 bg-[#050811] p-4 rounded-xl border border-white/10">
              <span className="text-xs font-bold text-[#D9F22A] uppercase tracking-wider block">
                Plano / Produto Direto
              </span>
              <div>
                <label className="text-[11px] text-white/70 block mb-1">Nome do Plano / Software *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Assinatura SaaS Pro"
                  value={customPlatformName}
                  onChange={(e) => setCustomPlatformName(e.target.value)}
                  className="w-full bg-[#080d1a] border border-white/15 rounded-lg px-3 py-2 text-xs text-white placeholder-white/30"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-white/70 block mb-1">Valor Venda (R$) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={customPrice}
                    onChange={(e) => setCustomPrice(Number(e.target.value))}
                    className="w-full bg-[#080d1a] border border-white/15 rounded-lg px-3 py-2 text-xs text-white font-bold"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-white/70 block mb-1">Comissão (%) *</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={customCommissionPercent}
                    onChange={(e) => setCustomCommissionPercent(Number(e.target.value))}
                    className="w-full bg-[#080d1a] border border-white/15 rounded-lg px-3 py-2 text-xs text-[#D9F22A] font-bold"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Commission Calculation Highlight Box */}
          <div className="p-4 rounded-2xl bg-[#D9F22A]/10 border border-[#D9F22A]/30 flex items-center justify-between">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-white/60 block">Valor Pago pelo Cliente:</span>
              <span className="text-base font-bold text-white">
                R$ {priceSetup.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[11px] uppercase tracking-wider text-[#D9F22A] block font-bold">
                Comissão Creditada ({commissionPercentage}%):
              </span>
              <span className="text-lg font-black text-[#D9F22A]">
                + R$ {commissionValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-white/70 mb-1">
                Nome do Comprador / Cliente *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Carlos Eduardo"
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                className="w-full bg-[#050811] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#D9F22A]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-white/70 mb-1">
                Empresa do Cliente *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Nexus Tech Ltda"
                value={buyerCompany}
                onChange={(e) => setBuyerCompany(e.target.value)}
                className="w-full bg-[#050811] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#D9F22A]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-white/70 mb-1">
                E-mail do Cliente *
              </label>
              <input
                type="email"
                required
                placeholder="cliente@email.com"
                value={buyerEmail}
                onChange={(e) => setBuyerEmail(e.target.value)}
                className="w-full bg-[#050811] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#D9F22A]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-white/70 mb-1">
                Método de Pagamento
              </label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as any)}
                className="w-full bg-[#050811] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#D9F22A]"
              >
                <option value="PIX">PIX Instantâneo (D+0)</option>
                <option value="Cartão de Crédito">Cartão de Crédito (12x)</option>
                <option value="PicPay">PicPay Carteira</option>
                <option value="Crypto USDT">Crypto USDT (TRC-20)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-white/70 mb-1">
              Origem de Tráfego / UTM Source
            </label>
            <input
              type="text"
              placeholder="ex: whatsapp, instagram, youtube, direto"
              value={utmSource}
              onChange={(e) => setUtmSource(e.target.value)}
              className="w-full bg-[#050811] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#D9F22A]"
            />
          </div>

          <button
            type="submit"
            className="mt-2 w-full bg-[#D9F22A] hover:bg-[#c8e217] text-[#060A15] font-black py-3.5 rounded-xl text-xs uppercase tracking-wider shadow-[0_0_25px_rgba(217,242,42,0.4)] transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            Confirmar Venda e Creditar Comissão no Saldo
          </button>
        </form>
      </div>
    </div>
  );
};
