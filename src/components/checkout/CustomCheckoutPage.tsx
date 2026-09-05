import React, { useState, useEffect, useRef } from 'react';
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
  Info,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { createSaleTransactionInFirebase } from '../../services/firestoreService';
import { handleAffiliateTracking, getActiveAffiliateRef } from '../../utils/affiliateTracking';

interface CustomCheckoutPageProps {
  plan: CompanyPlan;
  checkoutSlug?: string;
  affiliateRef?: string;
  onBack?: () => void;
  onPaymentSuccess?: (transaction: SaleTransaction) => void;
}

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
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'credit_card' | 'picpay' | 'apple_pay' | 'google_pay'>('pix');
  
  // Credit card fields
  const [cardNumber, setCardNumber] = useState<string>('');
  const [cardHolderName, setCardHolderName] = useState<string>('');
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

  // Real PIX state from Asaas v3 API
  const [pixData, setPixData] = useState<{
    id: string;
    qrCodeBase64: string | null;
    copyAndPaste: string;
    ticket_url?: string;
    status?: string;
  } | null>(null);
  const [isGeneratingPix, setIsGeneratingPix] = useState<boolean>(false);
  const [isCheckingPixStatus, setIsCheckingPixStatus] = useState<boolean>(false);
  const [pixCopied, setPixCopied] = useState<boolean>(false);
  const [pixSecondsLeft, setPixSecondsLeft] = useState<number>(900); // 15:00 min real timer
  const [pixError, setPixError] = useState<string | null>(null);

  // Processing & completion states
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isPaid, setIsPaid] = useState<boolean>(false);
  const [completedTransaction, setCompletedTransaction] = useState<SaleTransaction | null>(null);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

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
  
  // Installment price calculation
  const installment12xValue = Number(((finalTotal * 1.24) / 12).toFixed(2));

  // Active PIX string from official Asaas response
  const activePixCode = pixData?.copyAndPaste || '';

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

  // Live 15-minute countdown timer that counts down second by second
  useEffect(() => {
    if (isPaid) return;
    const timer = setInterval(() => {
      setPixSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [isPaid]);

  // Persistência do Código do Afiliado via Cookie de 15 dias e localStorage
  useEffect(() => {
    handleAffiliateTracking();
  }, [affiliateRef]);

  // Recupera código do afiliado do Cookie de 15 dias ou localStorage ou prop ou URL
  const getActiveAffiliateCode = (): string | null => {
    if (affiliateRef && affiliateRef.trim()) return affiliateRef.trim();
    return getActiveAffiliateRef();
  };

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')} min`;
  };

  // Trigger Real PIX Generation via Asaas API
  const generateRealPixPayment = async () => {
    if (isGeneratingPix) return;
    setIsGeneratingPix(true);
    setPixError(null);

    try {
      const activeAffiliate = getActiveAffiliateCode();
      const cleanDoc = documentNumber.replace(/\D/g, '') || '19119119100';
      const cleanTotal = Number(parseFloat(String(finalTotal)).toFixed(2));
      const cleanEmail = (email || 'cliente@leadspay.com').trim();
      const cleanName = (fullName || 'Cliente LeadsPay').trim();
      const cleanPhone = (phone || '11999999999').replace(/\D/g, '');

      // Requisição POST direta para o endpoint oficial do Asaas /api/payments
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          paymentMethod: 'PIX',
          amount: cleanTotal,
          valorTotal: cleanTotal,
          total_amount: cleanTotal,
          description: `Plano ${plan.name}`,
          user: {
            name: cleanName,
            email: cleanEmail,
            cpfCnpj: cleanDoc,
            phone: cleanPhone
          },
          emailDoCliente: cleanEmail,
          nomeDoCliente: cleanName,
          cpfLimpo: cleanDoc,
          planId: plan.id,
          plan_id: plan.id,
          companyId: plan.companyId,
          company_id: plan.companyId,
          refCode: activeAffiliate,
          affiliateRef: activeAffiliate,
          affiliate_code: activeAffiliate
        })
      });

      let data: any = {};
      const responseText = await response.text();
      try {
        data = JSON.parse(responseText);
      } catch (parseErr) {
        console.warn('[Checkout Pix] Falha no parse JSON de /api/payments:', responseText);
      }

      // Adequação do Payload PIX conforme solicitado:
      // response.qrCodeBase64 e response.copyAndPaste
      const qrCodeBase64 = data.qrCodeBase64 || data.encodedImage || data.qr_code_base64;
      const copyAndPaste = data.copyAndPaste || data.payload || data.qr_code;
      const activePaymentId = data.paymentId || data.payment_id || data.id;

      if (response.ok && (copyAndPaste || qrCodeBase64)) {
        setPixData({
          id: String(activePaymentId),
          qrCodeBase64: qrCodeBase64 || null,
          copyAndPaste: copyAndPaste || '',
          ticket_url: data.invoiceUrl || data.ticket_url,
          status: data.status || 'pending'
        });
        setPixError(null);
        setPixSecondsLeft(900); // Reset 15:00 min timer
      } else {
        const errorMsg = data.error || (data.details ? JSON.stringify(data.details) : 'Erro ao gerar o código Pix no Asaas.');
        console.error('[Checkout Pix Error]:', errorMsg);
        setPixError(errorMsg);
        setPixData(null);
      }
    } catch (err: any) {
      console.error('Erro ao gerar PIX via backend:', err);
      setPixError(err.message || 'Falha de conexão com o servidor de pagamentos.');
      setPixData(null);
    } finally {
      setIsGeneratingPix(false);
    }
  };

  // Auto-generate PIX on first mount or when switching to PIX
  useEffect(() => {
    if (paymentMethod === 'pix' && !pixData) {
      generateRealPixPayment();
    }
  }, [paymentMethod, finalTotal]);

  // Check PIX payment status in Asaas
  const checkPaymentStatus = async (paymentId: string) => {
    if (!paymentId || isPaid) return;
    setIsCheckingPixStatus(true);

    try {
      const res = await fetch(`/api/payments/asaas/${paymentId}`);

      if (res.ok) {
        const text = await res.text();
        try {
          const data = JSON.parse(text);
          if (data.status === 'approved' || data.status === 'CONFIRMED' || data.status === 'RECEIVED') {
            await finalizeApprovedPayment('PIX', data.id || paymentId);
          }
        } catch (parseErr) {
          console.warn('Erro ao parsear status de pagamento:', parseErr);
        }
      }
    } catch (err) {
      console.warn('Status check error:', err);
    } finally {
      setIsCheckingPixStatus(false);
    }
  };

  // Polling for PIX payment approval every 3 seconds
  useEffect(() => {
    if (paymentMethod === 'pix' && pixData?.id && !isPaid) {
      pollIntervalRef.current = setInterval(() => {
        checkPaymentStatus(pixData.id);
      }, 3000);
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [paymentMethod, pixData?.id, isPaid]);

  // Finalize an approved payment and record in Firestore
  const finalizeApprovedPayment = async (methodName: string, transactionReference?: string) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const dateStr = now.toLocaleDateString('pt-BR');

    // Calculate affiliate commission
    const commissionPercentage = plan.commissionPercentage || 30;
    const commissionEarned = Number(((basePrice * commissionPercentage) / 100).toFixed(2));

    const salePayload: Omit<SaleTransaction, 'id' | 'createdAt'> = {
      companyId: plan.companyId,
      companyName: plan.companyName,
      companyLogo: plan.companyLogo,
      platformId: plan.id,
      platformName: plan.name,
      buyerName: fullName.trim() || 'Cliente LeadsPay',
      buyerEmail: email.trim() || 'cliente@leadspay.com',
      buyerCompany: plan.companyName,
      amount: finalTotal,
      commissionEarned: commissionEarned,
      method: methodName,
      status: 'Aprovado',
      utmSource: affiliateRef ? `ref_${affiliateRef}` : 'checkout_direto_empresa',
      date: dateStr,
      time: timeStr
    };

    try {
      const savedSale = await createSaleTransactionInFirebase(salePayload);
      setCompletedTransaction({
        ...salePayload,
        id: transactionReference || savedSale.id || `TX-${Date.now().toString().slice(-6)}`,
        createdAt: now.toISOString()
      });
      setIsPaid(true);

      if (onPaymentSuccess) {
        onPaymentSuccess({
          ...salePayload,
          id: transactionReference || savedSale.id || `TX-${Date.now().toString().slice(-6)}`,
          createdAt: now.toISOString()
        });
      }
    } catch (err: any) {
      console.error('Erro ao salvar transação real:', err);
    }
  };

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
    } else if (cleanCode === 'LEADSPAY10' || cleanCode === 'TECHIFY10' || cleanCode === 'DESCONTO10') {
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
    const textToCopy = pixData?.copyAndPaste || activePixCode;
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy);
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

    if (paymentMethod === 'pix') {
      // Re-generate fresh PIX with actual payer details
      await generateRealPixPayment();
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
      if (paymentMethod === 'credit_card') {
        const activeAffiliate = getActiveAffiliateCode();
        const cleanDoc = documentNumber.replace(/\D/g, '') || '19119119100';
        const cleanTotal = Number(parseFloat(String(finalTotal)).toFixed(2));
        const cleanEmail = (email || 'cliente@leadspay.com').trim();
        const cleanName = (fullName || 'Cliente LeadsPay').trim();
        const cleanPhone = (phone || '11999999999').replace(/\D/g, '');
        const [expMonth, expYear] = cardExpiry.split('/');

        const res = await fetch('/api/payments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentMethod: 'CREDIT_CARD',
            amount: cleanTotal,
            description: `Plano ${plan.name}`,
            user: {
              name: cleanName,
              email: cleanEmail,
              cpfCnpj: cleanDoc,
              phone: cleanPhone
            },
            creditCard: {
              holderName: cardHolderName || cleanName,
              number: cardNumber.replace(/\D/g, ''),
              expiryMonth: expMonth?.trim(),
              expiryYear: expYear?.length === 2 ? `20${expYear.trim()}` : expYear?.trim(),
              ccv: cardCvv.trim()
            },
            holderInfo: {
              name: cardHolderName || cleanName,
              email: cleanEmail,
              cpfCnpj: cleanDoc,
              phone: cleanPhone,
              postalCode: '01310100',
              addressNumber: '100'
            },
            planId: plan.id,
            companyId: plan.companyId,
            refCode: activeAffiliate
          })
        });

        const data = await res.json();
        if (res.ok && (data.status === 'CONFIRMED' || data.status === 'RECEIVED' || data.status === 'approved' || data.success)) {
          await finalizeApprovedPayment('Cartão de Crédito', data.paymentId || data.id);
          return;
        } else {
          const errMsg = data.error || 'Cartão não autorizado pela operadora. Verifique os dados e tente novamente.';
          alert(errMsg);
          return;
        }
      }

      // Direct processing for Apple Pay, Google Pay, PicPay
      let paymentMethodName = 'Cartão de Crédito';
      if (paymentMethod === 'picpay') paymentMethodName = 'PicPay';
      else if (paymentMethod === 'apple_pay') paymentMethodName = 'Apple Pay';
      else if (paymentMethod === 'google_pay') paymentMethodName = 'Google Pay';

      await finalizeApprovedPayment(paymentMethodName, `PAY-${Date.now().toString().slice(-8)}`);
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
          <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-400 mx-auto mb-5 shadow-lg">
            <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
          </div>

          <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 mb-3 inline-block">
            ✓ Pagamento Aprovado com Sucesso
          </span>

          <h2 className="text-2xl sm:text-3xl font-black text-white font-['Syne'] mb-2">
            Parabéns pela sua contratação!
          </h2>

          <p className="text-xs text-white/70 mb-6 leading-relaxed">
            Seu acesso ao <strong>{plan.name}</strong> da <strong>{plan.companyName}</strong> já foi liberado. Enviamos o recibo e detalhes de acesso para <strong>{email || 'seu e-mail'}</strong>.
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
              <span>Empresa Responsável:</span>
              <span className="text-white font-bold">{plan.companyName}</span>
            </div>
            <div className="flex justify-between text-white/60">
              <span>Método de Pagamento:</span>
              <span className="text-emerald-400 font-bold">{completedTransaction.method}</span>
            </div>
            <div className="flex justify-between text-white/60">
              <span>Comprador:</span>
              <span className="text-white font-bold">{completedTransaction.buyerName}</span>
            </div>
            {affiliateRef && (
              <div className="flex justify-between text-white/60 pt-1 border-t border-white/5">
                <span>Indicação de Afiliado:</span>
                <span className="font-mono text-[#D9F22A] font-bold">{affiliateRef}</span>
              </div>
            )}
            <div className="pt-2 border-t border-white/10 flex justify-between items-center text-sm font-black">
              <span>Valor Total Pago:</span>
              <span className="text-emerald-400 font-['Syne'] text-base">
                R$ {completedTransaction.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="w-full bg-[#D9F22A] hover:bg-[#c8e217] text-[#060A15] font-black py-3 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg"
              >
                Voltar para a Plataforma
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070b14] text-white flex flex-col items-center justify-start p-4 sm:p-6 lg:p-10 selection:bg-[#D9F22A] selection:text-[#060A15]">
      {/* Top Brand Banner */}
      <div className="w-full max-w-lg mb-4 flex items-center justify-between">
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs text-white/60 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
        )}

        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="text-[11px] font-bold text-white/70 uppercase tracking-wider">
            Checkout Seguro Asaas Gateway
          </span>
        </div>
      </div>

      {/* Main Container */}
      <div className="w-full max-w-lg bg-[#080d1a] border border-white/10 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-5">
        {/* Affiliate Attribution Ribbon */}
        {affiliateRef && (
          <div className="p-2.5 rounded-xl bg-[#D9F22A]/10 border border-[#D9F22A]/30 flex items-center justify-between text-xs">
            <span className="text-white/70">Código de Indicação:</span>
            <span className="font-mono font-bold text-[#D9F22A]">{affiliateRef}</span>
          </div>
        )}

        {/* Product Title & Company */}
        <div className="flex items-center gap-3.5 pb-4 border-b border-white/10">
          <img
            src={plan.companyLogo || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=100&q=80'}
            alt={plan.companyName}
            className="w-12 h-12 rounded-xl object-cover border border-[#D9F22A]/30 bg-[#050811] flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
              {plan.companyName}
            </span>
            <h1 className="text-lg font-black text-white font-['Syne'] truncate">
              {plan.name}
            </h1>
            <span className="text-[11px] text-white/50 block truncate">
              {plan.tagline || plan.description}
            </span>
          </div>
        </div>

        {/* Checkout Form */}
        <form onSubmit={handleProcessPayment} className="space-y-4">
          {/* 1. Nome Completo */}
          <div>
            <label className="block text-xs font-semibold text-white/80 mb-1.5">
              Nome completo
            </label>
            <input
              type="text"
              required
              placeholder="Preencha seu nome e sobrenome"
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
              placeholder="Preencha seu email para receber o acesso"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#050811] border border-white/15 focus:border-[#208b68] rounded-xl px-4 py-3 text-xs text-white placeholder-white/30 focus:outline-none transition-colors"
            />
          </div>

          {/* 3. Celular & CPF/CNPJ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1.5">
                Celular com DDD
              </label>
              <input
                type="text"
                required
                placeholder="(11) 99999-9999"
                value={phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                className="w-full bg-[#050811] border border-white/15 focus:border-[#208b68] rounded-xl px-4 py-3 text-xs text-white placeholder-white/30 focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1.5">
                CPF ou CNPJ
              </label>
              <input
                type="text"
                required
                placeholder="000.000.000-00"
                value={documentNumber}
                onChange={(e) => handleDocChange(e.target.value)}
                className="w-full bg-[#050811] border border-white/15 focus:border-[#208b68] rounded-xl px-4 py-3 text-xs text-white placeholder-white/30 focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Oferta Summary Header */}
          <div className="pt-2 flex items-center justify-between">
            <span className="text-xs font-bold text-white">Oferta Selecionada</span>
            <div className="text-right">
              <span className="text-sm font-black text-emerald-400 block font-['Syne']">
                12x de R$ {installment12xValue.toFixed(2).replace('.', ',')}
              </span>
              <span className="text-[11px] text-white/50">
                R$ {finalTotal.toFixed(2).replace('.', ',')} à vista
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
                <span className="text-[10px] font-bold tracking-tight text-center leading-tight">Cartão</span>
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

              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1.5">
                  Nome impresso no cartão
                </label>
                <input
                  type="text"
                  placeholder="Como está gravado no cartão"
                  value={cardHolderName}
                  onChange={(e) => setCardHolderName(e.target.value.toUpperCase())}
                  className="w-full bg-[#050811] border border-white/15 focus:border-[#208b68] rounded-xl px-4 py-3 text-xs text-white placeholder-white/30 focus:outline-none transition-colors uppercase"
                />
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

          {/* 6. Real PIX QR Code & Live Countdown Box */}
          {paymentMethod === 'pix' && (
            <div className="p-5 rounded-2xl bg-[#050811] border border-emerald-500/40 text-center space-y-3.5 animate-in fade-in duration-200">
              {/* Live decrementing countdown */}
              <div className="inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-xs font-black text-emerald-400">
                <Clock className="w-4 h-4 animate-pulse" />
                <span>Pague via PIX para aprovação instantânea ({formatCountdown(pixSecondsLeft)})</span>
              </div>

              {pixError ? (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs space-y-2">
                  <p className="font-bold">Não foi possível gerar a cobrança PIX:</p>
                  <p className="text-[11px] text-white/80">{pixError}</p>
                  <button
                    type="button"
                    onClick={generateRealPixPayment}
                    className="mt-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-lg text-xs transition cursor-pointer"
                  >
                    Tentar Novamente
                  </button>
                </div>
              ) : (
                <>
                  {/* Real Official QR Code Image from Asaas */}
                  <div className="w-52 h-52 mx-auto bg-white p-3 rounded-2xl border-4 border-emerald-400 flex items-center justify-center shadow-2xl relative">
                    {isGeneratingPix || !pixData ? (
                      <div className="flex flex-col items-center justify-center gap-2 text-[#060A15]">
                        <RefreshCw className="w-8 h-8 animate-spin text-emerald-600" />
                        <span className="text-[10px] font-bold">Gerando PIX Oficial Asaas...</span>
                      </div>
                    ) : pixData?.qrCodeBase64 ? (
                      <img
                        src={
                          pixData.qrCodeBase64.startsWith('data:')
                            ? pixData.qrCodeBase64
                            : `data:image/png;base64,${pixData.qrCodeBase64}`
                        }
                        alt="QR Code PIX Asaas Oficial"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-[#060A15] p-2 text-center">
                        <span className="text-xs font-bold">Utilize o Pix Copia e Cola abaixo para pagar no seu app de banco.</span>
                      </div>
                    )}
                  </div>

                  {/* Copia e Cola with 1-click copy */}
                  {pixData?.copyAndPaste && (
                    <div className="space-y-1 text-left">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-white/50 block">
                        Código Pix Copia e Cola Oficial:
                      </span>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={pixData.copyAndPaste}
                          className="flex-1 bg-[#080d1a] border border-white/15 rounded-xl px-3 py-2 text-[10px] text-white/80 font-mono select-all truncate"
                        />
                        <button
                          type="button"
                          onClick={handleCopyPix}
                          className="bg-emerald-500 hover:bg-emerald-400 text-black font-black px-3.5 py-2 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shadow-md"
                        >
                          {pixCopied ? <Check className="w-4 h-4 stroke-[3]" /> : <Copy className="w-4 h-4" />}
                          {pixCopied ? 'Copiado!' : 'Copiar PIX'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Quick Status Check */}
                  <div className="pt-2 flex items-center justify-between border-t border-white/10 text-[11px]">
                    <span className="text-white/50 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                      Aguardando transferência...
                    </span>

                    <button
                      type="button"
                      onClick={() => pixData?.id && checkPaymentStatus(pixData.id)}
                      disabled={isCheckingPixStatus}
                      className="text-emerald-400 hover:text-emerald-300 font-bold transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <RefreshCw className={`w-3 h-3 ${isCheckingPixStatus ? 'animate-spin' : ''}`} />
                      Verificar Pagamento
                    </button>
                  </div>
                </>
              )}
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
                  <span>Taxa de serviço</span>
                  <span className="text-white/80">R$ {PLATFORM_CHECKOUT_FEE.toFixed(2).replace('.', ',')}</span>
                </div>
              </div>

              {/* Total Row */}
              <div className="pt-2 border-t border-dashed border-white/15 flex items-center justify-between font-black text-sm">
                <span className="text-white">Total</span>
                <div className="text-right">
                  <span className="text-emerald-400 font-['Syne'] text-base block">
                    12x de R$ {installment12xValue.toFixed(2).replace('.', ',')}
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
            className="w-full bg-[#208b68] hover:bg-[#1b7658] text-white font-black py-4 rounded-xl text-xs uppercase tracking-wider shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Processando Pagamento...</span>
              </>
            ) : paymentMethod === 'pix' ? (
              <>
                <QrCode className="w-4 h-4" />
                <span>Gerar Novo PIX / Atualizar Dados</span>
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4" />
                <span>Finalizar Pagamento Seguro</span>
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
              <a href="#" className="underline hover:text-white">Políticas</a> do LeadsPay.
            </p>
            <p className="text-[10px] text-white/40 pt-1">
              Processado por <strong>Asaas Pagamentos</strong> • Integração Oficial v3
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};
