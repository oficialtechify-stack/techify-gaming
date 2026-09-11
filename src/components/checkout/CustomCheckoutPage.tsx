import React, { useState, useEffect, useRef } from 'react';
import { CompanyPlan, SaleTransaction } from '../../types/platform';
import { 
  CreditCard, 
  QrCode, 
  Lock, 
  ShieldCheck, 
  Copy, 
  Check, 
  CheckCircle2, 
  ArrowLeft, 
  Tag, 
  AlertCircle,
  Clock,
  RefreshCw,
  Zap
} from 'lucide-react';
import { 
  createSaleTransactionInFirebase, 
  fetchSellerSubaccountId,
  createOrUpdateClientInFirebase
} from '../../services/firestoreService';
import { handleAffiliateTracking, getActiveAffiliateRef } from '../../utils/affiliateTracking';

interface CustomCheckoutPageProps {
  plan: CompanyPlan;
  checkoutSlug?: string;
  affiliateRef?: string;
  apiKey?: string;
  onBack?: () => void;
  onPaymentSuccess?: (transaction: SaleTransaction) => void;
}

export const PLATFORM_CHECKOUT_FEE = 0.99; // Taxa de serviço R$ 0,99 cobrada pela plataforma LeadsPay

export const CustomCheckoutPage: React.FC<CustomCheckoutPageProps> = ({
  plan,
  checkoutSlug,
  affiliateRef,
  apiKey,
  onBack,
  onPaymentSuccess
}) => {
  // Query param apiKey fallback (?apiKey=lp_live_...)
  const queryApiKey = typeof window !== 'undefined' 
    ? (new URLSearchParams(window.location.search).get('apiKey') || 
       new URLSearchParams(window.location.search).get('x-api-key') || 
       new URLSearchParams(window.location.search).get('key'))
    : null;
  const effectiveApiKey = apiKey || queryApiKey || undefined;

  // Form customer state
  const [fullName, setFullName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [documentNumber, setDocumentNumber] = useState<string>('');
  
  // Payment selection state ('pix' | 'credit_card' | 'pix_automatico')
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'credit_card' | 'pix_automatico'>('pix');
  
  // Credit card fields
  const [cardNumber, setCardNumber] = useState<string>('');
  const [cardHolderName, setCardHolderName] = useState<string>('');
  const [cardExpiry, setCardExpiry] = useState<string>('');
  const [cardCvv, setCardCvv] = useState<string>('');
  const [installments, setInstallments] = useState<number>(1);

  // Coupon state
  const [couponInput, setCouponInput] = useState<string>('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number; type: 'percentage' | 'fixed' } | null>(null);
  const [couponError, setCouponError] = useState<string>('');
  const [couponSuccess, setCouponSuccess] = useState<string>('');

  // Order bump addon state
  const [includeOrderBump, setIncludeOrderBump] = useState<boolean>(false);

  // Minimum amount alert inline banner
  const [minAmountAlert, setMinAmountAlert] = useState<string | null>(null);

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
  const [subaccountId, setSubaccountId] = useState<string | null>(
    (plan as any)?.asaasSubaccountId || (plan as any)?.subaccountId || null
  );

  // Busca ID da subconta Asaas do vendedor/empresa no Firestore (users/{sellerId}.asaasSubaccountId)
  useEffect(() => {
    let isMounted = true;
    fetchSellerSubaccountId(plan).then((foundId) => {
      if (isMounted && foundId) {
        setSubaccountId(foundId);
      }
    }).catch((err) => {
      console.warn('Aviso ao consultar subaccountId no Firestore:', err);
    });
    return () => {
      isMounted = false;
    };
  }, [plan]);

  // Processing & completion states
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isPaid, setIsPaid] = useState<boolean>(false);
  const [completedTransaction, setCompletedTransaction] = useState<SaleTransaction | null>(null);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Calculation values
  const basePrice = plan.priceSetup || plan.priceMonthly || (plan as any).price || (plan as any).amount || (plan as any).valor || 157.00;
  const originalStrikePrice = Number((basePrice * 1.25).toFixed(2)) || 197.00;
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
  const finalTotal = Number((subtotal + PLATFORM_CHECKOUT_FEE).toFixed(2));
  
  // Installment price calculation
  const installment12xValue = Number(((finalTotal * 1.24) / 12).toFixed(2));

  // Determine billing frequency label
  const isAnnual = (plan.paymentType === 'Recorrente' || (plan as any).billingType === 'recorrente') && 
    ((plan as any).billingInterval === 'yearly' || plan.name?.toLowerCase().includes('anual') || (plan as any).interval === 'yearly');
  const isMonthly = (plan.paymentType === 'Recorrente' || (plan as any).billingType === 'recorrente') && 
    ((plan as any).billingInterval === 'monthly' || plan.name?.toLowerCase().includes('mensal') || (plan as any).interval === 'monthly');
  const billingSuffix = isAnnual ? ' / ano' : isMonthly ? ' / mês' : '';
  const billingPeriodName = isAnnual ? 'Renovação anual' : isMonthly ? 'Renovação mensal' : 'Pagamento único';

  // Format phone
  const handlePhoneChange = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 11);
    if (clean.length <= 10) {
      setPhone(clean.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').trim());
    } else {
      setPhone(clean.replace(/^(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').trim());
    }
  };

  // Format CPF/CNPJ
  const handleDocChange = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 14);
    if (clean.length <= 11) {
      setDocumentNumber(clean.replace(/^(\d{3})(\d{3})(\d{3})(\d{0,2})/, '$1.$2.$3-$4').trim());
    } else {
      setDocumentNumber(clean.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/, '$1.$2.$3/$4-$5').trim());
    }
  };

  // Format Card Number
  const handleCardNumberChange = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 16);
    setCardNumber(clean.replace(/(\d{4})(?=\d)/g, '$1 ').trim());
  };

  // Format Expiry
  const handleExpiryChange = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 4);
    if (clean.length <= 2) {
      setCardExpiry(clean);
    } else {
      setCardExpiry(`${clean.slice(0, 2)}/${clean.slice(2, 4)}`);
    }
  };

  // Live 15-minute countdown timer
  useEffect(() => {
    if (isPaid) return;
    const timer = setInterval(() => {
      setPixSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [isPaid]);

  // Affiliate tracking
  useEffect(() => {
    handleAffiliateTracking();
  }, [affiliateRef]);

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
    // 1. Validação no Frontend: Regra de valor mínimo exigida pela API do Asaas (R$ 5,00)
    if (finalTotal < 5.00) {
      setMinAmountAlert("O valor mínimo para cobranças via Asaas é de R$ 5,00");
      alert("O valor mínimo para cobranças via Asaas é de R$ 5,00");
      return;
    }

    if (isGeneratingPix) return;
    setIsGeneratingPix(true);
    setPixError(null);
    setMinAmountAlert(null);

    try {
      const activeAffiliate = getActiveAffiliateCode();
      const cleanDoc = documentNumber.replace(/\D/g, '');
      const cleanTotal = Number(parseFloat(String(finalTotal)).toFixed(2));
      const cleanEmail = email.trim();
      const cleanName = fullName.trim();
      const cleanPhone = phone.replace(/\D/g, '');

      if (!cleanDoc || cleanDoc.length < 11) {
        setPixError('Por favor, informe seu CPF ou CNPJ no formulário acima para gerar o Pix.');
        setPixData(null);
        setIsGeneratingPix(false);
        return;
      }

      // Garante resolução do ID da subconta Asaas do vendedor/empresa antes da chamada
      let activeSubaccountId = subaccountId || (plan as any)?.asaasSubaccountId || (plan as any)?.subaccountId || null;
      if (!activeSubaccountId) {
        try {
          activeSubaccountId = await fetchSellerSubaccountId(plan);
          if (activeSubaccountId) {
            setSubaccountId(activeSubaccountId);
          }
        } catch (e) {
          console.warn('Erro ao resolver subaccountId no momento do Pix:', e);
        }
      }

      const cleanDescription = plan.name || 'Cobrança LeadsPay';
      const effectivePlanId = (plan.id && plan.id !== 'checkout-dinamico' && plan.id !== 'checkout-direto') ? plan.id : undefined;

      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(effectiveApiKey ? { 'x-api-key': effectiveApiKey } : {})
        },
        body: JSON.stringify({
          paymentMethod: 'PIX',
          apiKey: effectiveApiKey,
          amount: cleanTotal,
          valorTotal: cleanTotal,
          total_amount: cleanTotal,
          subaccountId: activeSubaccountId || undefined,
          description: cleanDescription,
          customer: {
            name: cleanName || 'Cliente LeadsPay',
            email: cleanEmail || 'cliente@leadspay.com',
            cpfCnpj: cleanDoc,
            phone: cleanPhone || '11999999999'
          },
          user: {
            name: cleanName || 'Cliente LeadsPay',
            email: cleanEmail || 'cliente@leadspay.com',
            cpfCnpj: cleanDoc,
            phone: cleanPhone || '11999999999'
          },
          email: cleanEmail || 'cliente@leadspay.com',
          emailDoCliente: cleanEmail || 'cliente@leadspay.com',
          nomeDoCliente: cleanName || 'Cliente LeadsPay',
          cpfLimpo: cleanDoc,
          planId: effectivePlanId,
          plan_id: effectivePlanId,
          companyId: plan.companyId,
          company_id: plan.companyId,
          sellerId: (plan as any)?.sellerId || (plan as any)?.ownerId || plan.companyId,
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

      const qrCodeBase64 = data.qrCodeBase64 || data.encodedImage || data.qr_code_base64;
      const copyAndPaste = data.copyAndPaste || data.payload || data.qr_code;
      const activePaymentId = data.paymentId || data.payment_id || data.id;

      if (response.ok && !data.error && (copyAndPaste || qrCodeBase64)) {
        setPixData({
          id: String(activePaymentId),
          qrCodeBase64: qrCodeBase64 || null,
          copyAndPaste: copyAndPaste || '',
          ticket_url: data.invoiceUrl || data.ticket_url,
          status: data.status || 'pending'
        });
        setPixError(null);
        setPixSecondsLeft(900);
      } else {
        const asaasDescription = data?.errors?.[0]?.description;
        const asaasMessage = typeof data?.message === 'string' && data.message ? data.message : null;
        const errorMsg = 
          asaasDescription || 
          asaasMessage || 
          data?.error || 
          'Erro ao processar cobrança na API do Asaas.';

        console.error('[Checkout Pix Error Asaas]:', errorMsg, data);
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

  // Check PIX payment status in Asaas
  const checkPaymentStatus = async (paymentId: string) => {
    if (!paymentId || isPaid) return;
    setIsCheckingPixStatus(true);

    try {
      const res = await fetch(`/api/payments/asaas/${paymentId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'RECEIVED' || data.status === 'CONFIRMED' || data.status === 'RECEIVED_IN_CASH' || data.paid) {
          await finalizeApprovedPayment('PIX', paymentId);
          return;
        }
      }
    } catch (e) {
      console.warn('Erro ao checar status do PIX:', e);
    } finally {
      setIsCheckingPixStatus(false);
    }
  };

  // Polling for PIX payment verification
  useEffect(() => {
    if (pixData?.id && !isPaid) {
      pollIntervalRef.current = setInterval(() => {
        checkPaymentStatus(pixData.id);
      }, 5000);
    }
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [pixData?.id, isPaid]);

  // Finalize payment
  const finalizeApprovedPayment = async (methodName: string, transactionReference?: string) => {
    if (isPaid) return;

    const activeAffiliate = getActiveAffiliateCode();
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    let commissionEarned = 0;
    const planCommissionPct = plan.commissionPercentage || (plan as any).affiliateCommission;
    if (activeAffiliate && planCommissionPct) {
      commissionEarned = (finalTotal * planCommissionPct) / 100;
    }

    const salePayload: Omit<SaleTransaction, 'id'> = {
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
      
      // Auto-cadastro do cliente na coleção 'clients' da empresa correspondente (ETAPA 2)
      try {
        await createOrUpdateClientInFirebase({
          store_id: plan.companyId || 'store_default',
          name: fullName.trim() || 'Cliente LeadsPay',
          email: email.trim(),
          phone: phone.trim(),
          document: documentNumber.replace(/\D/g, ''),
          total_spent: finalTotal,
          last_plan_name: plan.name
        });
      } catch (clientErr) {
        console.warn('Aviso ao registrar cliente automaticamente:', clientErr);
      }

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

    const planCoupon = plan.coupons?.find(c => c.code.toUpperCase() === cleanCode && c.active);
    
    // Buscar também na lista de cupons globais do lojista
    let localCoupon: any = null;
    try {
      const storedCoupons = localStorage.getItem('leadspay_coupons_list');
      if (storedCoupons) {
        const parsed = JSON.parse(storedCoupons);
        localCoupon = parsed.find((c: any) => c.code.toUpperCase() === cleanCode && c.status === 'active');
      }
    } catch (_) {}

    if (planCoupon) {
      setAppliedCoupon({
        code: planCoupon.code,
        discount: planCoupon.discountValue,
        type: planCoupon.discountType
      });
      setCouponSuccess(`Cupom "${planCoupon.code}" aplicado com sucesso!`);
    } else if (localCoupon) {
      setAppliedCoupon({
        code: localCoupon.code,
        discount: localCoupon.value,
        type: localCoupon.discountType
      });
      setCouponSuccess(
        localCoupon.discountType === 'percentage'
          ? `Cupom "${localCoupon.code}" de ${localCoupon.value}% OFF aplicado!`
          : `Cupom "${localCoupon.code}" de R$ ${Number(localCoupon.value).toFixed(2)} OFF aplicado!`
      );
    } else if (cleanCode === 'LEADSPAY10' || cleanCode === 'TECHIFY10' || cleanCode === 'DESCONTO10') {
      setAppliedCoupon({
        code: cleanCode,
        discount: 10,
        type: 'percentage'
      });
      setCouponSuccess(`Cupom "${cleanCode}" de 10% OFF aplicado!`);
    } else if (cleanCode === 'PRIMEIRACOMPRA' || cleanCode === 'VIP20') {
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
    const textToCopy = pixData?.copyAndPaste;
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy);
    setPixCopied(true);
    setTimeout(() => setPixCopied(false), 3000);
  };

  // Process Payment Submission
  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. VALIDAÇÃO OBRIGATÓRIA NO FRONTEND: Valor mínimo de cobrança R$ 5,00 conforme regra do Asaas
    if (finalTotal < 5.00) {
      setMinAmountAlert("O valor mínimo para cobranças via Asaas é de R$ 5,00");
      alert("O valor mínimo para cobranças via Asaas é de R$ 5,00");
      return;
    }

    if (!fullName.trim() || fullName.trim().split(' ').length < 2) {
      alert('Por favor, preencha seu nome e sobrenome completos.');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      alert('Por favor, preencha um endereço de email válido.');
      return;
    }

    if (!phone || phone.replace(/\D/g, '').length < 10) {
      alert('Por favor, preencha seu celular com DDD.');
      return;
    }

    if (!documentNumber || documentNumber.replace(/\D/g, '').length < 11) {
      alert('Por favor, preencha um CPF ou CNPJ válido.');
      return;
    }

    if (paymentMethod === 'pix' || paymentMethod === 'pix_automatico') {
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

        let activeSubaccountId = subaccountId || (plan as any)?.asaasSubaccountId || (plan as any)?.subaccountId || null;
        if (!activeSubaccountId) {
          try {
            activeSubaccountId = await fetchSellerSubaccountId(plan);
          } catch (e) {
            // ignore
          }
        }

        const res = await fetch('/api/payments', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            ...(effectiveApiKey ? { 'x-api-key': effectiveApiKey } : {})
          },
          body: JSON.stringify({
            paymentMethod: 'CREDIT_CARD',
            apiKey: effectiveApiKey,
            amount: cleanTotal,
            subaccountId: activeSubaccountId || undefined,
            description: plan.name || 'Cobrança LeadsPay',
            planId: (plan.id && plan.id !== 'checkout-dinamico' && plan.id !== 'checkout-direto') ? plan.id : undefined,
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
            companyId: plan.companyId,
            sellerId: (plan as any)?.sellerId || (plan as any)?.ownerId || plan.companyId,
            refCode: activeAffiliate
          })
        });

        const data = await res.json().catch(() => ({ error: true, message: 'Falha ao processar resposta do servidor.' }));
        if (res.ok && !data.error && (data.status === 'CONFIRMED' || data.status === 'RECEIVED' || data.status === 'approved' || data.success)) {
          await finalizeApprovedPayment('Cartão de Crédito', data.paymentId || data.id);
          return;
        } else {
          const errMsg = data?.errors?.[0]?.description || data?.message || (typeof data?.error === 'string' ? data.error : null) || 'Cartão não autorizado pela operadora. Verifique os dados e tente novamente.';
          alert(errMsg);
          return;
        }
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
      <div className="min-h-screen bg-[#f8fafc] text-gray-900 flex flex-col items-center justify-center p-4 sm:p-6 font-sans">
        <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 shadow-xl text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mx-auto mb-4">
            <CheckCircle2 className="w-9 h-9 stroke-[2.5]" />
          </div>

          <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 mb-3 inline-block">
            ✓ Pagamento Aprovado com Sucesso
          </span>

          <h2 className="text-2xl font-black text-gray-900 mb-2">
            Parabéns pela sua compra!
          </h2>

          <p className="text-xs text-gray-600 mb-6 leading-relaxed">
            Seu acesso ao <strong>{plan.name}</strong> já foi liberado com sucesso. Enviamos os detalhes para <strong>{email || 'seu e-mail'}</strong>.
          </p>

          <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 text-left space-y-2 mb-6 text-xs text-gray-700">
            <div className="flex justify-between">
              <span className="text-gray-500">Transação ID:</span>
              <span className="font-mono font-bold text-gray-800">{completedTransaction.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Método:</span>
              <span className="font-semibold text-gray-800">{completedTransaction.method}</span>
            </div>
            <div className="pt-2 border-t border-gray-200 flex justify-between items-center text-sm font-bold">
              <span>Valor Pago:</span>
              <span className="text-[#205a46] text-base">
                R$ {completedTransaction.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {onBack && (
            <button
              onClick={onBack}
              className="w-full bg-[#205a46] hover:bg-[#194939] text-white font-bold py-3 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md"
            >
              Voltar para a Plataforma
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-[#111827] flex flex-col items-center justify-start py-8 px-4 sm:px-6 font-sans selection:bg-[#205a46] selection:text-white">
      {/* Top back button if within platform */}
      {onBack && (
        <div className="w-full max-w-[560px] mb-3 flex items-center justify-start">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
        </div>
      )}

      {/* Main Checkout Container - Exactly matching image.png */}
      <div className="w-full max-w-[560px] space-y-6">
        
        {/* Title: Starter • Tração & Vendas */}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#111827] tracking-tight">
            {plan.name}
          </h1>
        </div>

        {/* Form Fields */}
        <form onSubmit={handleProcessPayment} className="space-y-4">
          
          {/* 1. Nome completo */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Nome completo
            </label>
            <input
              type="text"
              required
              placeholder="Preencha seu nome"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-white border border-[#d1d5db] focus:border-[#205a46] focus:ring-1 focus:ring-[#205a46] rounded-lg px-3.5 py-2.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none transition-all shadow-xs"
            />
          </div>

          {/* 2. Email */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Email
            </label>
            <input
              type="email"
              required
              placeholder="Preencha seu email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white border border-[#d1d5db] focus:border-[#205a46] focus:ring-1 focus:ring-[#205a46] rounded-lg px-3.5 py-2.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none transition-all shadow-xs"
            />
          </div>

          {/* 3. Celular e CPF/CNPJ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Celular
              </label>
              <input
                type="text"
                required
                placeholder="Preencha seu celular"
                value={phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                className="w-full bg-white border border-[#d1d5db] focus:border-[#205a46] focus:ring-1 focus:ring-[#205a46] rounded-lg px-3.5 py-2.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none transition-all shadow-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                CPF/CNPJ
              </label>
              <input
                type="text"
                required
                placeholder="Preencha seu CPF/CNPJ"
                value={documentNumber}
                onChange={(e) => handleDocChange(e.target.value)}
                className="w-full bg-white border border-[#d1d5db] focus:border-[#205a46] focus:ring-1 focus:ring-[#205a46] rounded-lg px-3.5 py-2.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none transition-all shadow-xs"
              />
            </div>
          </div>

          {/* 4. Oferta Header */}
          <div className="pt-2 flex items-center justify-between border-t border-transparent">
            <span className="text-xs font-bold text-gray-900">
              Oferta
            </span>
            <div className="text-right">
              <span className="text-[11px] text-gray-400 line-through block">
                R$ {originalStrikePrice.toFixed(2).replace('.', ',')}
              </span>
              <span className="text-sm sm:text-base font-bold text-[#205a46] block">
                R$ {basePrice.toFixed(2).replace('.', ',')}{billingSuffix}
              </span>
            </div>
          </div>

          {/* 5. Forma de Pagamento */}
          <div>
            <label className="block text-xs font-bold text-gray-900 mb-2">
              Forma de Pagamento
            </label>

            <div className="grid grid-cols-3 gap-2.5">
              {/* PIX */}
              <button
                type="button"
                onClick={() => setPaymentMethod('pix')}
                className={`py-3.5 px-2 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  paymentMethod === 'pix'
                    ? 'bg-[#205a46] border-[#205a46] text-white shadow-sm'
                    : 'bg-white border-[#e5e7eb] text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="w-5 h-5 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                    <path d="M12 2L2 12l10 10 10-10L12 2zm0 3.5L18.5 12 12 18.5 5.5 12 12 5.5z"/>
                  </svg>
                </div>
                <span className="text-xs font-bold tracking-tight">PIX</span>
              </button>

              {/* Cartão de Crédito */}
              <button
                type="button"
                onClick={() => setPaymentMethod('credit_card')}
                className={`py-3.5 px-2 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  paymentMethod === 'credit_card'
                    ? 'bg-[#205a46] border-[#205a46] text-white shadow-sm'
                    : 'bg-white border-[#e5e7eb] text-gray-700 hover:border-gray-300'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span className="text-xs font-bold tracking-tight text-center leading-tight">Cartão de Crédito</span>
              </button>

              {/* Pix Automático */}
              <button
                type="button"
                onClick={() => setPaymentMethod('pix_automatico')}
                className={`py-3.5 px-2 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer relative ${
                  paymentMethod === 'pix_automatico'
                    ? 'bg-[#205a46] border-[#205a46] text-white shadow-sm'
                    : 'bg-white border-[#e5e7eb] text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="relative">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                    <path d="M12 2L2 12l10 10 10-10L12 2zm0 3.5L18.5 12 12 18.5 5.5 12 12 5.5z"/>
                  </svg>
                  <span className="absolute -top-1.5 -right-2 bg-emerald-500 text-white rounded-full p-0.5 shadow-xs">
                    <Zap className="w-2.5 h-2.5 fill-current" />
                  </span>
                </div>
                <span className="text-xs font-bold tracking-tight text-center leading-tight">Pix Automático</span>
              </button>
            </div>
          </div>

          {/* Campos de Cartão de Crédito (se selecionado) */}
          {paymentMethod === 'credit_card' && (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3 animate-in fade-in duration-200">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Número do cartão
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="0000 0000 0000 0000"
                    value={cardNumber}
                    onChange={(e) => handleCardNumberChange(e.target.value)}
                    className="w-full bg-white border border-[#d1d5db] focus:border-[#205a46] focus:ring-1 focus:ring-[#205a46] rounded-lg px-3.5 py-2.5 text-xs text-gray-900 placeholder-gray-400 font-mono focus:outline-none transition-all"
                  />
                  <CreditCard className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Nome impresso no cartão
                </label>
                <input
                  type="text"
                  placeholder="Como está gravado no cartão"
                  value={cardHolderName}
                  onChange={(e) => setCardHolderName(e.target.value.toUpperCase())}
                  className="w-full bg-white border border-[#d1d5db] focus:border-[#205a46] focus:ring-1 focus:ring-[#205a46] rounded-lg px-3.5 py-2.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none transition-all uppercase"
                />
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Validade
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="MM/AA"
                    value={cardExpiry}
                    onChange={(e) => handleExpiryChange(e.target.value)}
                    className="w-full bg-white border border-[#d1d5db] focus:border-[#205a46] rounded-lg px-2 py-2.5 text-xs text-gray-900 placeholder-gray-400 text-center font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    CVV
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    required
                    placeholder="000"
                    value={cardCvv}
                    onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-white border border-[#d1d5db] focus:border-[#205a46] rounded-lg px-2 py-2.5 text-xs text-gray-900 placeholder-gray-400 text-center font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Parcelas
                  </label>
                  <select
                    value={installments}
                    onChange={(e) => setInstallments(Number(e.target.value))}
                    className="w-full bg-white border border-[#d1d5db] focus:border-[#205a46] rounded-lg px-1.5 py-2.5 text-[11px] text-gray-900 focus:outline-none cursor-pointer"
                  >
                    <option value={1}>1x de R$ {finalTotal.toFixed(2).replace('.', ',')} (à vista)</option>
                    <option value={2}>2x de R$ {((finalTotal * 1.04) / 2).toFixed(2).replace('.', ',')}</option>
                    <option value={3}>3x de R$ {((finalTotal * 1.06) / 3).toFixed(2).replace('.', ',')}</option>
                    <option value={6}>6x de R$ {((finalTotal * 1.12) / 6).toFixed(2).replace('.', ',')}</option>
                    <option value={12}>12x de R$ {installment12xValue.toFixed(2).replace('.', ',')}</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* 6. Resumo do Pedido Box - Exactly like image.png */}
          <div className="pt-2">
            <h2 className="text-xs font-bold text-gray-900 mb-2">
              Resumo do pedido
            </h2>

            <div className="bg-white border border-[#e5e7eb] rounded-xl overflow-hidden shadow-xs">
              
              {/* Cupom Input Row */}
              <div className="p-3.5 border-b border-gray-100">
                <div className="flex items-center justify-between border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus-within:border-[#205a46] transition-colors">
                  <div className="flex items-center gap-2 flex-1">
                    <Tag className="w-3.5 h-3.5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Código de desconto"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value)}
                      className="w-full text-xs text-gray-800 placeholder-gray-400 focus:outline-none uppercase font-mono"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    className="text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors cursor-pointer pl-2"
                  >
                    Aplicar Cupom
                  </button>
                </div>

                {couponError && (
                  <p className="text-[11px] text-rose-500 flex items-center gap-1 mt-1.5 font-medium">
                    <AlertCircle className="w-3 h-3" /> {couponError}
                  </p>
                )}
                {couponSuccess && (
                  <p className="text-[11px] text-emerald-600 flex items-center gap-1 mt-1.5 font-medium">
                    <Check className="w-3 h-3" /> {couponSuccess}
                  </p>
                )}
              </div>

              {/* Order Items Breakdown */}
              <div className="p-3.5 space-y-2 text-xs">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-medium text-gray-900 block">{plan.name}</span>
                    <span className="text-[11px] text-gray-400 block">{billingPeriodName}</span>
                  </div>
                  <span className="font-bold text-gray-900">
                    R$ {basePrice.toFixed(2).replace('.', ',')}{billingSuffix}
                  </span>
                </div>

                {includeOrderBump && (
                  <div className="flex justify-between items-center text-emerald-700 text-[11px]">
                    <span>+ {plan.orderBumps?.[0]?.name || 'Oferta Adicional'}</span>
                    <span>R$ {bumpPrice.toFixed(2).replace('.', ',')}</span>
                  </div>
                )}

                {appliedCoupon && (
                  <div className="flex justify-between items-center text-emerald-700 font-semibold text-[11px]">
                    <span>Desconto do Cupom ({appliedCoupon.code})</span>
                    <span>- R$ {discountAmount.toFixed(2).replace('.', ',')}</span>
                  </div>
                )}

                {/* Taxa de serviço R$ 0,99 */}
                <div className="flex justify-between items-center text-gray-500 pt-1">
                  <span>Taxa de serviço</span>
                  <span className="text-gray-700">R$ {PLATFORM_CHECKOUT_FEE.toFixed(2).replace('.', ',')}</span>
                </div>
              </div>

              {/* Total Row with Classic Ticket/Receipt Serrated Divider */}
              <div className="relative px-3.5 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
                <span className="text-xs font-bold text-gray-900">Total</span>
                <span className="text-sm sm:text-base font-bold text-gray-900">
                  R$ {finalTotal.toFixed(2).replace('.', ',')}
                </span>
              </div>

              {/* Sawtooth edge pattern (from image) */}
              <div className="w-full h-2.5 bg-repeat-x bg-[length:12px_10px]" style={{
                backgroundImage: 'radial-gradient(circle at 6px -3px, transparent 6px, #f3f4f6 6.5px)'
              }} />
            </div>
          </div>

          {/* Validação de Valor Mínimo Alerta Amigável na Tela */}
          {(minAmountAlert || finalTotal < 5.00) && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-center gap-2 font-medium animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>
                {minAmountAlert || "O valor mínimo para cobranças via Asaas é de R$ 5,00"}
              </span>
            </div>
          )}

          {/* QR Code PIX Display (quando gerado via Asaas) */}
          {(paymentMethod === 'pix' || paymentMethod === 'pix_automatico') && pixData && (
            <div className="p-4 bg-gray-50 border border-emerald-200 rounded-xl space-y-3 text-center animate-in fade-in">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-[11px] font-bold">
                <Clock className="w-3.5 h-3.5" />
                <span>Pague em até {formatCountdown(pixSecondsLeft)}</span>
              </div>

              {pixData.qrCodeBase64 && (
                <div className="w-44 h-44 mx-auto bg-white p-2 border border-gray-200 rounded-xl shadow-xs flex items-center justify-center">
                  <img
                    src={
                      pixData.qrCodeBase64.startsWith('data:')
                        ? pixData.qrCodeBase64
                        : `data:image/png;base64,${pixData.qrCodeBase64}`
                    }
                    alt="QR Code Pix"
                    className="w-full h-full object-contain"
                  />
                </div>
              )}

              {pixData.copyAndPaste && (
                <div className="space-y-1 text-left">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                    Pix Copia e Cola:
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      readOnly
                      value={pixData.copyAndPaste}
                      className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-[10px] text-gray-700 font-mono truncate"
                    />
                    <button
                      type="button"
                      onClick={handleCopyPix}
                      className="bg-[#205a46] hover:bg-[#194939] text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap"
                    >
                      {pixCopied ? 'Copiado!' : 'Copiar'}
                    </button>
                  </div>
                </div>
              )}

              <div className="pt-2 border-t border-gray-200 flex items-center justify-between text-[11px]">
                <span className="text-gray-500 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
                  Aguardando confirmação...
                </span>

                <button
                  type="button"
                  onClick={() => checkPaymentStatus(pixData.id)}
                  disabled={isCheckingPixStatus}
                  className="text-emerald-700 hover:text-emerald-800 font-bold transition-colors cursor-pointer flex items-center gap-1"
                >
                  <RefreshCw className={`w-3 h-3 ${isCheckingPixStatus ? 'animate-spin' : ''}`} />
                  Verificar Pagamento
                </button>
              </div>
            </div>
          )}

          {/* Erro no PIX se houver */}
          {pixError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Atenção no pagamento:</span>
                <span>{pixError}</span>
              </div>
            </div>
          )}

          {/* 7. Action Button - Green button matching image.png */}
          <button
            type="submit"
            disabled={isProcessing || isGeneratingPix}
            className="w-full bg-[#205a46] hover:bg-[#194939] active:bg-[#153e30] text-white font-bold py-3.5 rounded-lg text-sm transition-all cursor-pointer shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing || isGeneratingPix ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Processando...</span>
              </>
            ) : paymentMethod === 'pix' ? (
              <span>Gerar Pix</span>
            ) : paymentMethod === 'pix_automatico' ? (
              <span>Gerar Pix Automático</span>
            ) : (
              <span>Pagar com Cartão de Crédito</span>
            )}
          </button>

          {/* 8. Trust & Security Footer - Exactly like image.png */}
          <div className="text-center pt-2 space-y-2 text-xs text-gray-500">
            <div className="flex items-center justify-center gap-1.5 text-gray-600 font-medium">
              <Lock className="w-3.5 h-3.5 text-gray-500" />
              <span>Compra segura</span>
            </div>

            <p className="text-[11px] text-gray-400 leading-relaxed px-4">
              Ao prosseguir, você concorda com os Termos de uso de <strong className="text-gray-600">{plan.name}</strong>, além dos{' '}
              <a href="#" className="underline hover:text-gray-700">Termos</a> e{' '}
              <a href="#" className="underline hover:text-gray-700">Políticas</a> da LeadsPay.
            </p>

            <p className="text-[11px] text-gray-400">
              Processado por <strong className="text-gray-600">LeadsPay</strong>
            </p>
          </div>
        </form>

      </div>
    </div>
  );
};
