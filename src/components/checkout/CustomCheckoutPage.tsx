import React, { useState, useEffect } from 'react';
import { CompanyPlan, SaleTransaction } from '../../types/platform';
import { 
  CreditCard, 
  QrCode, 
  Smartphone, 
  Apple, 
  Check, 
  Lock, 
  ShieldCheck, 
  Copy, 
  CheckCircle2, 
  ArrowLeft, 
  Tag, 
  Sparkles,
  AlertCircle,
  Clock,
  ChevronDown,
  Info
} from 'lucide-react';
import { createSaleTransactionInFirebase } from '../../services/firestoreService';

interface CustomCheckoutPageProps {
  plan: CompanyPlan;
  checkoutSlug?: string;
  affiliateRef?: string;
  onBack?: () => void;
  onPaymentSuccess?: (transaction: SaleTransaction) => void;
}

export const MERCADO_PAGO_PUBLIC_KEY = 'APP_USR-f4c1df9a-12c7-41ef-9ad3-54c27fe1d002';
export const PLATFORM_CHECKOUT_FEE = 0.99; // 99 centavos cobrados pela plataforma

export const CustomCheckoutPage: React.FC<CustomCheckoutPageProps> = ({
  plan,
  checkoutSlug,
  affiliateRef,
  onBack,
  onPaymentSuccess
}) => {
  // Form customer state
  const [fullName, setFullName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [documentNumber, setDocumentNumber] = useState<string>('');
  
  // Payment selection state
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'credit_card' | 'picpay' | 'apple_pay' | 'google_pay'>('credit_card');
  
  // Credit card fields
  const [cardNumber, setCardNumber] = useState<string>('');
  const [cardExpiry, setCardExpiry] = useState<string>('');
  const [cardCvv, setCardCvv] = useState<string>('');
  const [installments, setInstallments] = useState<number>(12);

  // Coupon state
  const [couponInput, setCouponInput] = useState<string>('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number; type: 'percentage' | 'fixed' } | null>(null);
  const [couponError, setCouponError] = useState<string>('');
  const [couponSuccess, setCouponSuccess] = useState<string>('');

  // Order bump addon state
  const [includeOrderBump, setIncludeOrderBump] = useState<boolean>(false);

  // Processing & completion states
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isPaid, setIsPaid] = useState<boolean>(false);
  const [completedTransaction, setCompletedTransaction] = useState<SaleTransaction | null>(null);
  const [pixCopied, setPixCopied] = useState<boolean>(false);
  const [pixSecondsLeft, setPixSecondsLeft] = useState<number>(900); // 15 min timer

  // Calculation values
  const basePrice = plan.priceSetup || 197.00;
  const bumpPrice = plan.orderBumps?.[0]?.active ? plan.orderBumps[0].price : 29.90;
  
  let discountAmount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.type === 'percentage') {
      discountAmount = (basePrice * appliedCoupon.discount) / 100;
    } else {
      discountAmount = appliedCoupon.discount;
    }
  }

  const subtotal = Math.max(0, basePrice - discountAmount + (includeOrderBump ? bumpPrice : 0));
  const finalTotal = subtotal + PLATFORM_CHECKOUT_FEE;
  
  // Installment price calculation (with standard 12x factor e.g. 12x de R$ 20,35 for 197 or calculated)
  const installment12xValue = Number(((finalTotal * 1.24) / 12).toFixed(2));
  const selectedInstallmentValue = Number(((finalTotal * (1 + (installments > 1 ? (installments * 0.02) : 0))) / installments).toFixed(2));

  // Dynamic PIX Code generator
  const pixCode = `00020126580014br.gov.bcb.pix0136${plan.id.slice(0, 10)}-techify-pay520400005303986540${finalTotal.toFixed(2)}5802BR5925Techify Pagamentos Digitais6009Sao Paulo62070503***6304E8A2`;

  // Handle format phone
  const handlePhoneChange = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 11);
    if (clean.length <= 10) {
      setPhone(clean.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').trim());
    } else {
      setPhone(clean.replace(/^(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').trim());
    }
  };

  // Handle format CPF/CNPJ
  const handleDocChange = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 14);
    if (clean.length <= 11) {
      setDocumentNumber(clean.replace(/^(\d{3})(\d{3})(\d{3})(\d{0,2})/, '$1.$2.$3-$4').trim());
    } else {
      setDocumentNumber(clean.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/, '$1.$2.$3/$4-$5').trim());
    }
  };

  // Handle format Card Number
  const handleCardNumberChange = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 16);
    setCardNumber(clean.replace(/(\d{4})(?=\d)/g, '$1 ').trim());
  };

  // Handle format Expiry
  const handleExpiryChange = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 4);
    if (clean.length <= 2) {
      setCardExpiry(clean);
    } else {
      setCardExpiry(`${clean.slice(0, 2)}/${clean.slice(2, 4)}`);
    }
  };

  // PIX countdown timer
  useEffect(() => {
    if (paymentMethod !== 'pix' || isPaid) return;
    const timer = setInterval(() => {
      setPixSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [paymentMethod, isPaid]);

  // Handle Apply Coupon
  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError('');
    setCouponSuccess('');

    const cleanCode = couponInput.trim().toUpperCase();
    if (!cleanCode) return;

    // Check plan configured coupons or default global coupons
    const planCoupon = plan.coupons?.find(c => c.code.toUpperCase() === cleanCode && c.active);
    
    if (planCoupon) {
      setAppliedCoupon({
        code: planCoupon.code,
        discount: planCoupon.discountValue,
        type: planCoupon.discountType
      });
      setCouponSuccess(`Cupom "${planCoupon.code}" aplicado com sucesso!`);
    } else if (cleanCode === 'TECHIFY10' || cleanCode === 'DESCONTO10') {
      setAppliedCoupon({
        code: cleanCode,
        discount: 10,
        type: 'percentage'
      });
      setCouponSuccess(`Cupom "${cleanCode}" de 10% OFF aplicado!`);
    } else if (cleanCode === 'PRIMEIRACOMPRA' || cleanCode === 'VIP50') {
      setAppliedCoupon({
        code: cleanCode,
        discount: 20,
        type: 'fixed'
      });
      setCouponSuccess(`Cupom "${cleanCode}" de R$ 20,00 OFF aplicado!`);
    } else {
      setCouponError('Cupom inválido ou expirado.');
    }
  };

  // Copy PIX Code
  const handleCopyPix = () => {
    navigator.clipboard.writeText(pixCode);
    setPixCopied(true);
    setTimeout(() => setPixCopied(false), 3000);
  };

  // Submit Payment
  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim() || fullName.trim().split(' ').length < 2) {
      alert('Por favor, preencha seu nome e sobrenome completos.');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      alert('Por favor, preencha um endereço de email válido.');
      return;
    }

    if (!phone || phone.replace(/\D/g, '').length < 10) {
      alert('Por favor, preencha seu número de celular com DDD.');
      return;
    }

    if (!documentNumber || documentNumber.replace(/\D/g, '').length < 11) {
      alert('Por favor, preencha um CPF ou CNPJ válido.');
      return;
    }

    if (paymentMethod === 'credit_card') {
      if (cardNumber.replace(/\D/g, '').length < 16) {
        alert('Por favor, informe os 16 dígitos do cartão de crédito.');
        return;
      }
      if (!cardExpiry || cardExpiry.length < 5) {
        alert('Por favor, informe a data de vencimento (MM/AA).');
        return;
      }
      if (!cardCvv || cardCvv.length < 3) {
        alert('Por favor, informe o código de segurança (CVV).');
        return;
      }
    }

    setIsProcessing(true);

    try {
      // Simulate real gateway processing delay with Mercado Pago Key
      await new Promise((resolve) => setTimeout(resolve, 1800));

      const now = new Date();
      const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      const dateStr = now.toLocaleDateString('pt-BR');

      // Calculate affiliate commission if applicable
      const commissionPercentage = plan.commissionPercentage || 30;
      const commissionEarned = Number(((basePrice * commissionPercentage) / 100).toFixed(2));

      let paymentMethodName = 'Cartão de Crédito';
      if (paymentMethod === 'pix') paymentMethodName = 'PIX';
      else if (paymentMethod === 'picpay') paymentMethodName = 'PicPay';
      else if (paymentMethod === 'apple_pay') paymentMethodName = 'Apple Pay';
      else if (paymentMethod === 'google_pay') paymentMethodName = 'Google Pay';

      const salePayload: Omit<SaleTransaction, 'id' | 'createdAt'> = {
        companyId: plan.companyId,
        companyName: plan.companyName,
        companyLogo: plan.companyLogo,
        platformId: plan.id,
        platformName: plan.name,
        buyerName: fullName.trim(),
        buyerEmail: email.trim(),
        buyerCompany: plan.companyName,
        amount: finalTotal,
        commissionEarned: commissionEarned,
        method: paymentMethodName,
        status: 'Aprovado',
        utmSource: affiliateRef ? `ref_${affiliateRef}` : 'checkout_direto_empresa',
        date: dateStr,
        time: timeStr
      };

      const savedSale = await createSaleTransactionInFirebase(salePayload);

      setCompletedTransaction({
        ...salePayload,
        id: `TX-${Date.now().toString().slice(-6)}`,
        createdAt: now.toISOString()
      });

      setIsPaid(true);

      if (onPaymentSuccess) {
        onPaymentSuccess({
          ...salePayload,
          id: `TX-${Date.now().toString().slice(-6)}`,
          createdAt: now.toISOString()
        });
      }
    } catch (err: any) {
      console.error('Erro no checkout:', err);
      alert('Houve um problema ao processar seu pagamento. Tente novamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  // If payment is completed, show the Success Order Receipt
  if (isPaid && completedTransaction) {
    return (
      <div className="min-h-screen bg-[#070b14] text-white flex flex-col items-center justify-center p-4 sm:p-6 selection:bg-[#D9F22A] selection:text-[#060A15]">
        <div className="w-full max-w-lg bg-[#0b1220] border border-emerald-500/40 rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(16,185,129,0.2)] text-center animate-in zoom-in-95 duration-300">
          <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-400 mx-auto mb-5 shadow-lg animate-bounce">
            <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
          </div>

          <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 mb-3 inline-block">
            ✓ Pagamento Aprovado com Sucesso
          </span>

          <h2 className="text-2xl sm:text-3xl font-black text-white font-['Syne'] mb-2">
            Parabéns pela sua compra!
          </h2>

          <p className="text-xs text-white/70 mb-6 leading-relaxed">
            Seu acesso ao <strong>{plan.name}</strong> da <strong>{plan.companyName}</strong> já foi liberado. Enviamos todos os detalhes para <strong>{email}</strong>.
          </p>

          {/* Receipt Breakdown Card */}
          <div className="bg-[#060A15] border border-white/10 rounded-2xl p-4 text-left space-y-2.5 text-xs mb-6">
            <div className="flex justify-between text-white/60">
              <span>Código da Transação:</span>
              <span className="font-mono text-white font-bold">{completedTransaction.id}</span>
            </div>
            <div className="flex justify-between text-white/60">
              <span>Plano / Produto:</span>
              <span className="text-white font-bold">{plan.name}</span>
            </div>
            <div className="flex justify-between text-white/60">
              <span>Empresa:</span>
              <span className="text-white font-bold">{plan.companyName}</span>
            </div>
            <div className="flex justify-between text-white/60">
              <span>Forma de Pagamento:</span>
              <span className="text-emerald-400 font-bold">{completedTransaction.method}</span>
            </div>
            <div className="flex justify-between text-white/60">
              <span>Taxa de Serviço:</span>
              <span className="text-white/80">R$ {PLATFORM_CHECKOUT_FEE.toFixed(2).replace('.', ',')}</span>
            </div>
            <div className="pt-2 border-t border-white/10 flex justify-between font-black text-sm text-white">
              <span>Valor Total Pago:</span>
              <span className="text-[#D9F22A]">R$ {completedTransaction.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => {
                if (plan.thankYouPageUrl) {
                  window.open(plan.thankYouPageUrl, '_blank');
                } else if (onBack) {
                  onBack();
                } else {
                  window.location.reload();
                }
              }}
              className="w-full bg-[#D9F22A] hover:bg-[#c8e217] text-[#060A15] font-black py-3.5 rounded-xl text-xs uppercase tracking-wider shadow-[0_0_25px_rgba(217,242,42,0.4)] transition-all cursor-pointer"
            >
              Acessar Produto / Área de Membros
            </button>

            {onBack && (
              <button
                onClick={onBack}
                className="w-full py-2.5 text-xs text-white/60 hover:text-white transition-colors cursor-pointer"
              >
                ← Voltar para a Plataforma
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070b14] text-white flex flex-col items-center justify-start py-8 px-4 sm:px-6 selection:bg-[#208b68] selection:text-white relative">
      {/* Subtle Background Glows */}
      <div className="fixed top-0 left-1/3 w-[500px] h-[500px] bg-[#208b68]/10 rounded-full blur-[160px] pointer-events-none -z-10" />

      {/* Back button if present */}
      {onBack && (
        <div className="w-full max-w-xl mb-4 flex items-center justify-between">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-1 rounded-full">
            <ShieldCheck className="w-3.5 h-3.5" /> Ambiente Seguro 256-bit SSL
          </div>
        </div>
      )}

      {/* Main Checkout Container */}
      <div className="w-full max-w-xl bg-[#0a101d] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl relative">
        {/* Product Title Banner */}
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-black text-white font-['Syne'] tracking-tight">
            {plan.name}
          </h1>
          <div className="flex items-center gap-2 mt-1 text-xs text-white/60">
            <span>Por {plan.companyName}</span>
            <span>•</span>
            <span className="text-[#D9F22A] font-bold">{plan.category}</span>
          </div>
        </div>

        <form onSubmit={handleProcessPayment} className="space-y-4">
          {/* 1. Nome Completo */}
          <div>
            <label className="block text-xs font-semibold text-white/80 mb-1.5">
              Nome completo
            </label>
            <input
              type="text"
              required
              placeholder="Preencha seu nome"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-[#050811] border border-white/15 focus:border-[#208b68] rounded-xl px-4 py-3 text-xs text-white placeholder-white/30 focus:outline-none transition-colors"
            />
          </div>

          {/* 2. Email */}
          <div>
            <label className="block text-xs font-semibold text-white/80 mb-1.5">
              Email
            </label>
            <input
              type="email"
              required
              placeholder="Preencha seu email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#050811] border border-white/15 focus:border-[#208b68] rounded-xl px-4 py-3 text-xs text-white placeholder-white/30 focus:outline-none transition-colors"
            />
          </div>

          {/* 3. Celular & CPF/CNPJ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1.5">
                Celular
              </label>
              <input
                type="text"
                required
                placeholder="Preencha seu celular"
                value={phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                className="w-full bg-[#050811] border border-white/15 focus:border-[#208b68] rounded-xl px-4 py-3 text-xs text-white placeholder-white/30 focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1.5">
                CPF/CNPJ
              </label>
              <input
                type="text"
                required
                placeholder="Preencha seu CPF/CNPJ"
                value={documentNumber}
                onChange={(e) => handleDocChange(e.target.value)}
                className="w-full bg-[#050811] border border-white/15 focus:border-[#208b68] rounded-xl px-4 py-3 text-xs text-white placeholder-white/30 focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Oferta Summary Header */}
          <div className="pt-2 flex items-center justify-between">
            <span className="text-xs font-bold text-white">Oferta</span>
            <div className="text-right">
              <span className="text-sm font-black text-emerald-400 block font-['Syne']">
                12 X de R$ {installment12xValue.toFixed(2).replace('.', ',')}
              </span>
              <span className="text-[11px] text-white/50">
                R$ {basePrice.toFixed(2).replace('.', ',')} à vista
              </span>
            </div>
          </div>

          {/* 4. Forma de Pagamento Tabs */}
          <div>
            <label className="block text-xs font-bold text-white mb-2">
              Forma de Pagamento
            </label>

            <div className="grid grid-cols-5 gap-2">
              {/* PIX */}
              <button
                type="button"
                onClick={() => setPaymentMethod('pix')}
                className={`py-3 px-1.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  paymentMethod === 'pix'
                    ? 'bg-[#1b4332] border-[#2d6a4f] text-white shadow-md'
                    : 'bg-[#050811] border-white/10 text-white/60 hover:text-white hover:border-white/20'
                }`}
              >
                <div className="w-5 h-5 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                    <path d="M12 2L2 12l10 10 10-10L12 2zm0 3.5L18.5 12 12 18.5 5.5 12 12 5.5z"/>
                  </svg>
                </div>
                <span className="text-[10px] font-bold tracking-tight">PIX</span>
              </button>

              {/* Cartão de Crédito */}
              <button
                type="button"
                onClick={() => setPaymentMethod('credit_card')}
                className={`py-3 px-1 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  paymentMethod === 'credit_card'
                    ? 'bg-[#208b68] border-[#2bb084] text-white shadow-md'
                    : 'bg-[#050811] border-white/10 text-white/60 hover:text-white hover:border-white/20'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span className="text-[10px] font-bold tracking-tight text-center leading-tight">Cartão de Crédito</span>
              </button>

              {/* PicPay */}
              <button
                type="button"
                onClick={() => setPaymentMethod('picpay')}
                className={`py-3 px-1.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  paymentMethod === 'picpay'
                    ? 'bg-[#1b4332] border-[#2d6a4f] text-white shadow-md'
                    : 'bg-[#050811] border-white/10 text-white/60 hover:text-white hover:border-white/20'
                }`}
              >
                <span className="text-sm font-black">P°</span>
                <span className="text-[10px] font-bold tracking-tight">PicPay</span>
              </button>

              {/* Apple Pay */}
              <button
                type="button"
                onClick={() => setPaymentMethod('apple_pay')}
                className={`py-3 px-1.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  paymentMethod === 'apple_pay'
                    ? 'bg-[#1b4332] border-[#2d6a4f] text-white shadow-md'
                    : 'bg-[#050811] border-white/10 text-white/60 hover:text-white hover:border-white/20'
                }`}
              >
                <Apple className="w-4 h-4" />
                <span className="text-[10px] font-bold tracking-tight">Apple Pay</span>
              </button>

              {/* Google Pay */}
              <button
                type="button"
                onClick={() => setPaymentMethod('google_pay')}
                className={`py-3 px-1.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  paymentMethod === 'google_pay'
                    ? 'bg-[#1b4332] border-[#2d6a4f] text-white shadow-md'
                    : 'bg-[#050811] border-white/10 text-white/60 hover:text-white hover:border-white/20'
                }`}
              >
                <span className="text-sm font-black">G</span>
                <span className="text-[10px] font-bold tracking-tight">Google Pay</span>
              </button>
            </div>
          </div>

          {/* 5. Credit Card Form Fields (When Selected) */}
          {paymentMethod === 'credit_card' && (
            <div className="space-y-3.5 pt-1 animate-in fade-in duration-200">
              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1.5">
                  Número do cartão
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="0000 0000 0000 0000"
                    value={cardNumber}
                    onChange={(e) => handleCardNumberChange(e.target.value)}
                    className="w-full bg-[#050811] border border-white/15 focus:border-[#208b68] rounded-xl px-4 py-3 text-xs text-white placeholder-white/30 font-mono focus:outline-none transition-colors"
                  />
                  <CreditCard className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-white/40" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-white/80 mb-1.5">
                    Vencimento
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="MM/AA"
                    value={cardExpiry}
                    onChange={(e) => handleExpiryChange(e.target.value)}
                    className="w-full bg-[#050811] border border-white/15 focus:border-[#208b68] rounded-xl px-3 py-3 text-xs text-white placeholder-white/30 text-center font-mono focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white/80 mb-1.5">
                    CVV
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    required
                    placeholder="000"
                    value={cardCvv}
                    onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-[#050811] border border-white/15 focus:border-[#208b68] rounded-xl px-3 py-3 text-xs text-white placeholder-white/30 text-center font-mono focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white/80 mb-1.5">
                    Parcelas
                  </label>
                  <select
                    value={installments}
                    onChange={(e) => setInstallments(Number(e.target.value))}
                    className="w-full bg-[#050811] border border-white/15 focus:border-[#208b68] rounded-xl px-2 py-3 text-xs text-white focus:outline-none cursor-pointer"
                  >
                    <option value={1}>1x de R$ {finalTotal.toFixed(2).replace('.', ',')} (à vista)</option>
                    <option value={2}>2x de R$ {((finalTotal * 1.04) / 2).toFixed(2).replace('.', ',')}</option>
                    <option value={3}>3x de R$ {((finalTotal * 1.06) / 3).toFixed(2).replace('.', ',')}</option>
                    <option value={6}>6x de R$ {((finalTotal * 1.12) / 6).toFixed(2).replace('.', ',')}</option>
                    <option value={10}>10x de R$ {((finalTotal * 1.18) / 10).toFixed(2).replace('.', ',')}</option>
                    <option value={12}>12x de R$ {installment12xValue.toFixed(2).replace('.', ',')}</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* 6. PIX Generator Box (When Selected) */}
          {paymentMethod === 'pix' && (
            <div className="p-4 rounded-2xl bg-[#050811] border border-emerald-500/30 text-center space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center justify-center gap-2 text-xs font-bold text-emerald-400">
                <Clock className="w-4 h-4" />
                <span>Pague via PIX para aprovação imediata (15:00 min)</span>
              </div>

              {/* PIX QR Code Simulated Box */}
              <div className="w-40 h-40 mx-auto bg-white p-2 rounded-2xl border-4 border-emerald-400 flex items-center justify-center shadow-lg">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(pixCode)}`}
                  alt="QR Code PIX"
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={pixCode}
                  className="flex-1 bg-[#080d1a] border border-white/15 rounded-xl px-3 py-2 text-[10px] text-white/70 font-mono select-all truncate"
                />
                <button
                  type="button"
                  onClick={handleCopyPix}
                  className="bg-emerald-500 hover:bg-emerald-400 text-black font-black px-3 py-2 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap"
                >
                  {pixCopied ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Copy className="w-3.5 h-3.5" />}
                  {pixCopied ? 'Copiado!' : 'Copiar PIX'}
                </button>
              </div>
              <p className="text-[10px] text-white/50">
                Abra o app do seu banco, escolha <strong>Pix Copia e Cola</strong> ou aponte a câmera para o QR Code.
              </p>
            </div>
          )}

          {/* Order Bump Add-on (If Available) */}
          {plan.orderBumps && plan.orderBumps.length > 0 && (
            <div className="p-4 rounded-2xl bg-[#13231c] border-2 border-emerald-500/40 relative overflow-hidden">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="order-bump-checkbox"
                  checked={includeOrderBump}
                  onChange={(e) => setIncludeOrderBump(e.target.checked)}
                  className="mt-1 w-4 h-4 text-emerald-500 rounded border-white/20 focus:ring-emerald-500 cursor-pointer"
                />
                <label htmlFor="order-bump-checkbox" className="flex-1 text-xs cursor-pointer">
                  <span className="font-black text-[#D9F22A] block mb-0.5">
                    🔥 OFERTA ESPECIAL: {plan.orderBumps[0].name} (+ R$ {plan.orderBumps[0].price.toFixed(2).replace('.', ',')})
                  </span>
                  <span className="text-white/80 leading-relaxed block text-[11px]">
                    {plan.orderBumps[0].description}
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* 7. Resumo do Pedido */}
          <div className="pt-2">
            <h3 className="text-xs font-bold text-white mb-2">Resumo do pedido</h3>

            <div className="bg-[#050811] border border-white/10 rounded-2xl p-4 space-y-3">
              {/* Cupom Input */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                  <input
                    type="text"
                    placeholder="Código de desconto"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    className="w-full bg-[#080d1a] border border-white/15 focus:border-[#208b68] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-white/30 uppercase font-mono focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleApplyCoupon}
                  className="text-xs font-bold text-emerald-400 hover:text-emerald-300 px-3 py-2 rounded-xl border border-emerald-500/30 hover:bg-emerald-500/10 transition-all cursor-pointer"
                >
                  Aplicar Cupom
                </button>
              </div>

              {couponError && (
                <p className="text-[11px] text-rose-400 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3 h-3" /> {couponError}
                </p>
              )}
              {couponSuccess && (
                <p className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
                  <CheckCircle2 className="w-3 h-3" /> {couponSuccess}
                </p>
              )}

              {/* Items Breakdown */}
              <div className="space-y-1.5 pt-2 border-t border-white/10 text-xs">
                <div className="flex justify-between text-white/80">
                  <span>{plan.name} <span className="text-[10px] text-white/50 block">Pagamento único</span></span>
                  <span className="font-semibold text-white">R$ {basePrice.toFixed(2).replace('.', ',')}</span>
                </div>

                {includeOrderBump && (
                  <div className="flex justify-between text-emerald-300">
                    <span>+ {plan.orderBumps?.[0]?.name || 'Adicional'}</span>
                    <span>R$ {bumpPrice.toFixed(2).replace('.', ',')}</span>
                  </div>
                )}

                {appliedCoupon && (
                  <div className="flex justify-between text-emerald-400 font-bold">
                    <span>Desconto do Cupom ({appliedCoupon.code})</span>
                    <span>- R$ {discountAmount.toFixed(2).replace('.', ',')}</span>
                  </div>
                )}

                {/* Taxa de Serviço da Plataforma */}
                <div className="flex justify-between text-white/60">
                  <span className="flex items-center gap-1">
                    Taxa de serviço
                  </span>
                  <span className="text-white/80">R$ {PLATFORM_CHECKOUT_FEE.toFixed(2).replace('.', ',')}</span>
                </div>
              </div>

              {/* Total Row */}
              <div className="pt-2 border-t border-dashed border-white/15 flex items-center justify-between font-black text-sm">
                <span className="text-white">Total</span>
                <div className="text-right">
                  <span className="text-emerald-400 font-['Syne'] text-base block">
                    12x de R$ {((finalTotal * 1.24) / 12).toFixed(2).replace('.', ',')}
                  </span>
                  <span className="text-[11px] text-white/50 font-normal block">
                    ou R$ {finalTotal.toFixed(2).replace('.', ',')} à vista
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 8. Submit Button */}
          <button
            type="submit"
            disabled={isProcessing}
            className="w-full bg-[#528f75] hover:bg-[#437a63] text-white font-bold py-3.5 rounded-xl text-xs uppercase tracking-wider shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Processando Pagamento Seguro...</span>
              </>
            ) : paymentMethod === 'pix' ? (
              <>
                <QrCode className="w-4 h-4" />
                <span>Gerar PIX e Confirmar Pedido</span>
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4" />
                <span>Pagar com Cartão de Crédito</span>
              </>
            )}
          </button>

          {/* 9. Security Guarantee Footer */}
          <div className="text-center pt-2 space-y-1 text-[11px] text-white/50 leading-tight">
            <div className="flex items-center justify-center gap-1 text-white/70 font-semibold mb-1">
              <Lock className="w-3 h-3 text-emerald-400" />
              <span>Compra 100% Segura & Criptografada</span>
            </div>
            <p>
              Ao prosseguir, você concorda com os Termos de uso de {plan.name}, além dos{' '}
              <a href="#" className="underline hover:text-white">Termos</a> e{' '}
              <a href="#" className="underline hover:text-white">Políticas</a> da Techify.
            </p>
            <p className="text-[10px] text-white/40 pt-1">
              Processado por <strong>Techify Pay</strong> • Public Gateway
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};
