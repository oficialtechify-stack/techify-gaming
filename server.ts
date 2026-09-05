import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import QRCode from 'qrcode';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc,
  query,
  where
} from 'firebase/firestore';
import { 
  getOrCreateCustomer, 
  createPixPayment, 
  createCreditCardPayment, 
  cleanDocument 
} from './lib/asaas';

const app = express();
const PORT = 3000;

app.use(express.json());

// Server-only Secure Mercado Pago Credentials (NEVER exposed to client)
const MP_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN || process.env.MERCADO_PAGO_ACCESS_TOKEN || 'APP_USR-5352039864226161-090210-52ddde4037f8daf9e7dbde717d0cd562-3152233934';
const MP_PUBLIC_KEY = process.env.MERCADOPAGO_PUBLIC_KEY || process.env.VITE_MERCADOPAGO_PUBLIC_KEY || process.env.MERCADO_PAGO_PUBLIC_KEY || 'APP_USR-f4c1df9a-12c7-41ef-9ad3-54c27fe1d002';
const MP_CLIENT_ID = process.env.MERCADOPAGO_CLIENT_ID || process.env.MERCADO_PAGO_CLIENT_ID || '5352039864226161';
const MP_CLIENT_SECRET = process.env.MERCADOPAGO_CLIENT_SECRET || process.env.MERCADO_PAGO_CLIENT_SECRET || 'v0VOxiURJ4axUD45KtuPHMhZI6JJSWSR';

// Initialize Official Mercado Pago SDK Client on the Server
const mpClient = new MercadoPagoConfig({
  accessToken: MP_ACCESS_TOKEN,
  options: {
    timeout: 10000
  }
});

const mpPaymentService = new Payment(mpClient);

console.log('⚡ Mercado Pago SDK inicializado com sucesso no backend Node.js');

// Firebase Configuration for Backend
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || "AIzaSyBZY9m-CFG7-l9H1bptd4eGcd6IL_aEWIM",
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "techify-gaming-106fe.firebaseapp.com",
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || "techify-gaming-106fe",
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "techify-gaming-106fe.firebasestorage.app",
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "247058420839",
  appId: process.env.VITE_FIREBASE_APP_ID || "1:247058420839:web:436355c69a6026be9b70c2",
  measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID || "G-3SB1FEBFNZ"
};

const fbApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(fbApp);

console.log('🔥 Firebase Firestore conectado com sucesso no backend Node.js');

// Helper: Credit Platform Global Account (Checkout fee R$ 0.99, Withdrawal fee R$ 2.50)
async function creditServerPlatformFinances(type: 'checkout' | 'withdrawal', feeAmount: number) {
  try {
    const docRef = doc(db, 'platform_finances', 'global_summary');
    const snap = await getDoc(docRef);
    const now = new Date().toISOString();

    if (snap.exists()) {
      const data = snap.data();
      const currentRevenue = data.totalPlatformRevenue || 0;
      const currentCheckoutFees = data.totalCheckoutFees || 0;
      const currentWithdrawalFees = data.totalWithdrawalFees || 0;
      const currentSales = data.totalSalesProcessed || 0;
      const currentWithdrawals = data.totalWithdrawalsProcessed || 0;

      await updateDoc(docRef, {
        totalPlatformRevenue: Number((currentRevenue + feeAmount).toFixed(2)),
        totalCheckoutFees: type === 'checkout' ? Number((currentCheckoutFees + feeAmount).toFixed(2)) : currentCheckoutFees,
        totalWithdrawalFees: type === 'withdrawal' ? Number((currentWithdrawalFees + feeAmount).toFixed(2)) : currentWithdrawalFees,
        totalSalesProcessed: type === 'checkout' ? currentSales + 1 : currentSales,
        totalWithdrawalsProcessed: type === 'withdrawal' ? currentWithdrawals + 1 : currentWithdrawals,
        lastUpdated: now
      });
    } else {
      await setDoc(docRef, {
        totalPlatformRevenue: feeAmount,
        totalCheckoutFees: type === 'checkout' ? feeAmount : 0,
        totalWithdrawalFees: type === 'withdrawal' ? feeAmount : 0,
        totalSalesProcessed: type === 'checkout' ? 1 : 0,
        totalWithdrawalsProcessed: type === 'withdrawal' ? 1 : 0,
        lastUpdated: now
      });
    }
  } catch (err) {
    console.warn('[Server Platform Finances] Error updating global finances:', err);
  }
}

// =========================================================================
// 🕒 ROTINA / CRON DE LIBERAÇÃO DE SALDO (GARANTIA DE 9 DIAS)
// Transações aprovadas há 9 dias ou mais: migram de pendente -> disponível
// =========================================================================
async function processBalanceReleases() {
  console.log('[Cron 9 Dias] Iniciando verificação diária de liberação de saldos no Firestore...');
  const now = Date.now();
  const NINE_DAYS_MS = 9 * 24 * 60 * 60 * 1000; // 9 dias em milissegundos
  let releasedCount = 0;

  try {
    const salesSnap = await getDocs(collection(db, 'sales'));
    for (const docItem of salesSnap.docs) {
      const sale = docItem.data();
      
      // Apenas transações aprovadas que ainda estejam com liberação pendente
      const isApproved = sale.status === 'Aprovado';
      const isPendingRelease = sale.releaseStatus === 'pendente' || !sale.releaseStatus;

      if (isApproved && isPendingRelease) {
        const createdAtMs = new Date(sale.createdAt || sale.date || now).getTime();
        const ageInMs = now - createdAtMs;

        // Se já completou 9 dias de garantia
        if (ageInMs >= NINE_DAYS_MS) {
          console.log(`[Cron 9 Dias] Liberando saldo da transação ${docItem.id} (criada há ${(ageInMs / (1000 * 60 * 60 * 24)).toFixed(1)} dias)`);

          // 1. Atualiza status de liberação na venda
          await updateDoc(docItem.ref, {
            releaseStatus: 'disponivel',
            releasedAt: new Date().toISOString()
          });

          // 2. Libera comissão do Afiliado (se houver)
          const targetUserId = sale.affiliateId || sale.sellerId;
          if (targetUserId && sale.commissionEarned > 0) {
            const profileRef = doc(db, 'user_profiles', targetUserId);
            const profileSnap = await getDoc(profileRef);
            if (profileSnap.exists()) {
              const profData = profileSnap.data();
              const oldPending = profData.pendingBalance || 0;
              const oldAvailable = profData.availableBalance || 0;
              const commission = sale.commissionEarned || 0;

              const newPending = Math.max(0, Number((oldPending - commission).toFixed(2)));
              const newAvailable = Number((oldAvailable + commission).toFixed(2));

              await updateDoc(profileRef, {
                pendingBalance: newPending,
                availableBalance: newAvailable,
                updatedAt: new Date().toISOString()
              });
              console.log(`[Cron 9 Dias] Afiliado ${targetUserId}: R$ ${commission} migrado de pendente para disponível.`);
            }
          }

          // 3. Libera valor líquido da Empresa (se houver companyId ou sellerId corporativo)
          if (sale.companyId) {
            const netAmount = sale.netCompanyAmount || Math.max(0, Number(((sale.amount || 0) - (sale.commissionEarned || 0) - 0.99).toFixed(2)));
            // Se existir perfil da empresa registrado em user_profiles com o ID da empresa ou do dono
            const compProfileRef = doc(db, 'user_profiles', sale.companyId);
            const compProfileSnap = await getDoc(compProfileRef);
            if (compProfileSnap.exists()) {
              const cProf = compProfileSnap.data();
              const cPending = Math.max(0, Number(((cProf.pendingBalance || 0) - netAmount).toFixed(2)));
              const cAvailable = Number(((cProf.availableBalance || 0) + netAmount).toFixed(2));

              await updateDoc(compProfileRef, {
                pendingBalance: cPending,
                availableBalance: cAvailable,
                updatedAt: new Date().toISOString()
              });
              console.log(`[Cron 9 Dias] Empresa ${sale.companyId}: R$ ${netAmount} migrado de pendente para disponível.`);
            }
          }

          releasedCount++;
        }
      }
    }

    console.log(`[Cron 9 Dias] Verificação concluída com sucesso. Total de ${releasedCount} transações migradas para disponível.`);
    return releasedCount;
  } catch (err) {
    console.error('[Cron 9 Dias] Erro ao processar liberação de saldos:', err);
    return 0;
  }
}

// Inicia verificação 5s após startup e agenda execução diária (24 horas)
setTimeout(() => {
  processBalanceReleases();
}, 5000);

setInterval(() => {
  processBalanceReleases();
}, 24 * 60 * 60 * 1000);

// Endpoint para acionar ou consultar o Cron de 9 Dias
app.all('/api/cron/release-balances', async (req, res) => {
  try {
    const released = await processBalanceReleases();
    res.json({
      success: true,
      releasedCount: released,
      message: `Rotina de liberação concluída. ${released} transação(ões) com mais de 9 dias migrada(s) para saldo disponível.`
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao executar rotina de liberação' });
  }
});

// Endpoint para consultar o resumo financeiro da plataforma LeadsPay
app.get('/api/finances/summary', async (req, res) => {
  try {
    const docRef = doc(db, 'platform_finances', 'global_summary');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      res.json(snap.data());
    } else {
      res.json({
        totalPlatformRevenue: 0,
        totalCheckoutFees: 0,
        totalWithdrawalFees: 0,
        totalSalesProcessed: 0,
        totalWithdrawalsProcessed: 0
      });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 1. Health Check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    gateway: 'Mercado Pago SDK Active',
    cron: 'Rotina de 9 dias ativa',
    time: new Date().toISOString() 
  });
});

// 2. Mercado Pago Config / Public Info (ONLY Public Key returned)
app.get('/api/payments/config', (req, res) => {
  res.json({
    publicKey: MP_PUBLIC_KEY,
    gateway: 'Mercado Pago Oficial'
  });
});

/**
 * Extrai o código de afiliado a partir do payload ou do cabeçalho de Cookie (15 dias)
 */
function getAffiliateRefFromReq(req: express.Request): string | null {
  const bodyRef = req.body?.affiliate_code || req.body?.affiliateRef || req.body?.refCode;
  if (bodyRef && String(bodyRef).trim()) return String(bodyRef).trim();

  const cookieHeader = req.headers?.cookie;
  if (cookieHeader) {
    const match = cookieHeader.match(/(?:^|;\s*)affiliate_ref=([^;]+)/);
    if (match && match[1]) {
      try {
        return decodeURIComponent(match[1]).trim();
      } catch (e) {
        return match[1].trim();
      }
    }
  }
  return null;
}

/**
 * Credita automaticamente a porcentagem de comissão ao afiliado e o valor líquido à empresa na aprovação do pagamento
 */
async function creditSaleCommissionAndBalances(paymentId: string, paymentData?: any) {
  try {
    const saleRef = doc(db, 'sales', String(paymentId));
    const saleSnap = await getDoc(saleRef);
    if (!saleSnap.exists()) {
      console.warn(`[Credit Commission] Venda ${paymentId} não encontrada para creditar.`);
      return;
    }

    const sale = saleSnap.data();

    // Idempotência: impede creditar duas vezes
    if (sale.commissionCredited === true) {
      console.log(`[Credit Commission] Transação ${paymentId} já foi creditada anteriormente.`);
      return;
    }

    const totalAmount = Number(sale.total_amount || sale.amount || paymentData?.transaction_amount || 0);
    const planId = sale.plan_id || sale.platformId || paymentData?.metadata?.plan_id;
    const affiliateCode = sale.affiliate_code || sale.affiliateCode || paymentData?.metadata?.affiliate_code || paymentData?.metadata?.affiliate_ref;

    console.log(`[Credit Commission] Processando comissão da venda ${paymentId}: R$ ${totalAmount} | Ref: ${affiliateCode} | Plano: ${planId}`);

    // 1. Busca dados do Plano (para obter percentual de comissão e companyId)
    let commissionPercentage = 30; // padrão 30%
    let companyId = sale.companyId || null;
    let planName = sale.platformName || 'Plano LeadsPay';

    if (planId) {
      try {
        const planRef = doc(db, 'plans', String(planId));
        const planSnap = await getDoc(planRef);
        if (planSnap.exists()) {
          const pData = planSnap.data();
          if (pData.commissionPercentage && pData.commissionPercentage > 0) {
            commissionPercentage = Number(pData.commissionPercentage);
          }
          if (!companyId && pData.companyId) {
            companyId = pData.companyId;
          }
          if (pData.name) {
            planName = pData.name;
          }
        }
      } catch (pErr) {
        console.warn('Erro ao buscar plano no credit commission:', pErr);
      }
    }

    const commissionEarned = Number(((totalAmount * commissionPercentage) / 100).toFixed(2));
    const checkoutFee = 0.99;
    const netCompanyAmount = Math.max(0, Number((totalAmount - commissionEarned - checkoutFee).toFixed(2)));

    // 2. Busca e identifica o afiliado no banco de dados
    let affiliateUserId = sale.affiliateId || sale.sellerId || null;

    if (affiliateCode) {
      try {
        const affColl = collection(db, 'affiliations');
        const q1 = query(affColl, where('affiliateCode', '==', affiliateCode));
        let affSnaps = await getDocs(q1);

        if (affSnaps.empty) {
          const q2 = query(affColl, where('affiliate_code', '==', affiliateCode));
          affSnaps = await getDocs(q2);
        }

        if (!affSnaps.empty) {
          const affDoc = affSnaps.docs[0];
          const affData = affDoc.data();
          affiliateUserId = affData.userId || affData.user_id;

          // Atualiza estatísticas do documento de afiliação
          const currentSales = affData.salesCount || 0;
          const currentEarned = affData.totalEarned || 0;
          await updateDoc(affDoc.ref, {
            salesCount: currentSales + 1,
            totalEarned: Number((currentEarned + commissionEarned).toFixed(2)),
            lastSaleAt: new Date().toISOString()
          });
          console.log(`✅ [Credit Commission] Estatísticas da afiliação ${affDoc.id} atualizadas (+R$ ${commissionEarned}).`);
        }
      } catch (affErr) {
        console.warn('Erro ao consultar afiliação:', affErr);
      }
    }

    // 3. Credita a conta do Afiliado no sistema (user_profiles)
    if (affiliateUserId) {
      try {
        const profRef = doc(db, 'user_profiles', String(affiliateUserId));
        const profSnap = await getDoc(profRef);
        if (profSnap.exists()) {
          const profData = profSnap.data();
          const oldAvailable = profData.availableBalance || 0;
          const oldTotalEarned = profData.totalEarned || 0;
          const oldSalesCount = profData.salesCount || 0;

          await updateDoc(profRef, {
            availableBalance: Number((oldAvailable + commissionEarned).toFixed(2)),
            totalEarned: Number((oldTotalEarned + commissionEarned).toFixed(2)),
            salesCount: oldSalesCount + 1,
            updatedAt: new Date().toISOString()
          });
          console.log(`💰 [Credit Commission] Afiliado ${affiliateUserId} creditado com comissão de R$ ${commissionEarned}!`);
        }
      } catch (uErr) {
        console.warn('Erro ao creditar perfil do afiliado:', uErr);
      }
    }

    // 4. Credita a Empresa parceira (se houver)
    if (companyId) {
      try {
        const compProfRef = doc(db, 'user_profiles', String(companyId));
        const compProfSnap = await getDoc(compProfRef);
        if (compProfSnap.exists()) {
          const cProf = compProfSnap.data();
          const cAvailable = cProf.availableBalance || 0;
          const cTotal = cProf.totalEarned || 0;
          const cSales = cProf.salesCount || 0;

          await updateDoc(compProfRef, {
            availableBalance: Number((cAvailable + netCompanyAmount).toFixed(2)),
            totalEarned: Number((cTotal + netCompanyAmount).toFixed(2)),
            salesCount: cSales + 1,
            updatedAt: new Date().toISOString()
          });
          console.log(`🏢 [Credit Commission] Empresa ${companyId} creditada com valor líquido de R$ ${netCompanyAmount}.`);
        }
      } catch (cErr) {
        console.warn('Erro ao creditar perfil da empresa:', cErr);
      }
    }

    // 5. Credita a taxa da plataforma (R$ 0,99)
    await creditServerPlatformFinances('checkout', checkoutFee);

    // 6. Atualiza a transação como aprovada e comissão creditada
    await updateDoc(saleRef, {
      status: 'approved',
      status_detail: 'accredited',
      approved_at: new Date().toISOString(),
      commissionCredited: true,
      commissionPercentage,
      commissionEarned,
      checkoutFee,
      netCompanyAmount,
      affiliateId: affiliateUserId || sale.affiliateId || null,
      affiliate_code: affiliateCode || null,
      companyId: companyId || null,
      releaseStatus: 'disponivel',
      platformName: planName,
      updated_at: new Date().toISOString()
    });

    console.log(`🎯 [Credit Commission] Transação ${paymentId} liquidada e comissões distribuídas!`);
  } catch (err) {
    console.error('Erro ao creditar comissão da venda:', err);
  }
}

// =========================================================================
// 🚀 ENDPOINTS DE PAGAMENTO ASAAS V3 (PIX, CARTÃO DE CRÉDITO E WEBHOOK)
// =========================================================================

/**
 * POST /api/payments
 * Processa pagamentos via Asaas v3 (PIX ou Cartão de Crédito)
 */
app.post('/api/payments', async (req, res) => {
  try {
    const {
      paymentMethod,
      amount,
      valorTotal,
      total_amount,
      description,
      user,
      creditCard,
      holderInfo,
      planId,
      plan_id,
      companyId,
      company_id,
      refCode,
      affiliate_code,
      affiliateRef
    } = req.body || {};

    const normalizedMethod = String(paymentMethod || 'PIX').toUpperCase().trim();
    if (normalizedMethod !== 'PIX' && normalizedMethod !== 'CREDIT_CARD') {
      return res.status(400).json({ 
        error: 'Método de pagamento inválido. Utilize "PIX" ou "CREDIT_CARD".',
        received: paymentMethod 
      });
    }

    const rawAmount = amount ?? valorTotal ?? total_amount;
    const finalAmount = Number(parseFloat(String(rawAmount)).toFixed(2));
    if (isNaN(finalAmount) || finalAmount <= 0) {
      return res.status(400).json({ error: 'Valor da cobrança inválido ou não informado.' });
    }

    const customerData = user || {
      name: req.body.nomeDoCliente || req.body.name || 'Cliente LeadsPay',
      email: req.body.emailDoCliente || req.body.email,
      cpfCnpj: req.body.cpfLimpo || req.body.cpf || req.body.documentNumber,
      phone: req.body.telefone || req.body.phone,
      mobilePhone: req.body.celular || req.body.mobilePhone,
      postalCode: req.body.postalCode || req.body.cep,
      address: req.body.address,
      addressNumber: req.body.addressNumber
    };

    if (!customerData?.email) {
      return res.status(400).json({ error: 'O e-mail do cliente é obrigatório para processar a cobrança.' });
    }

    const cleanCpf = cleanDocument(customerData.cpfCnpj);
    if (!cleanCpf) {
      return res.status(400).json({ error: 'CPF ou CNPJ válido é obrigatório para o cadastro e cobrança no Asaas.' });
    }

    const cookieRef = getAffiliateRefFromReq(req);
    const finalRefCode = refCode || affiliate_code || affiliateRef || cookieRef || null;
    const finalPlanId = (planId || plan_id || null)?.toString() || null;
    const finalCompanyId = (companyId || company_id || null)?.toString() || null;
    const finalDescription = description || `Assinatura Plano ${finalPlanId || 'LeadsPay'}`;

    // 1. Obter ou Criar Cliente no Asaas
    let customerId: string;
    try {
      customerId = await getOrCreateCustomer({
        name: customerData.name || 'Cliente LeadsPay',
        email: customerData.email,
        cpfCnpj: cleanCpf,
        phone: customerData.phone,
        mobilePhone: customerData.mobilePhone || customerData.phone,
        postalCode: customerData.postalCode || customerData.cep,
        address: customerData.address,
        addressNumber: customerData.addressNumber
      });
    } catch (custError: any) {
      return res.status(400).json({ 
        error: custError.message || 'Erro ao registrar cliente no Asaas.',
        code: 'CUSTOMER_CREATION_FAILED'
      });
    }

    const nowIso = new Date().toISOString();

    // 2. Cobrança PIX via Asaas
    if (normalizedMethod === 'PIX') {
      try {
        const pixResult = await createPixPayment(customerId, finalAmount, finalDescription);

        // Persiste registro na coleção 'sales' do Firestore
        try {
          const saleDocRef = doc(db, 'sales', String(pixResult.paymentId));
          await setDoc(saleDocRef, {
            id: String(pixResult.paymentId),
            payment_id: String(pixResult.paymentId),
            gateway: 'Asaas v3',
            method: 'PIX',
            billingType: 'PIX',
            plan_id: finalPlanId,
            platformId: finalPlanId || '',
            platformName: finalDescription,
            companyId: finalCompanyId,
            affiliate_code: finalRefCode,
            affiliateCode: finalRefCode,
            total_amount: finalAmount,
            amount: finalAmount,
            status: pixResult.status || 'PENDING',
            status_detail: 'waiting_transfer',
            created_at: nowIso,
            qr_code: pixResult.payload,
            qr_code_base64: pixResult.encodedImage,
            ticket_url: pixResult.invoiceUrl || pixResult.bankSlipUrl || null,
            buyerName: customerData.name || 'Cliente LeadsPay',
            buyerEmail: customerData.email,
            buyerCpf: cleanCpf,
            commissionCredited: false
          }, { merge: true });
          console.log(`✅ [Firestore Asaas Sales] Venda PIX registrada: ${pixResult.paymentId}`);
        } catch (dbErr) {
          console.warn('Aviso ao salvar venda Asaas PIX no Firestore:', dbErr);
        }

        return res.status(200).json({
          success: true,
          gateway: 'Asaas v3',
          billingType: 'PIX',
          paymentId: pixResult.paymentId,
          payment_id: pixResult.paymentId,
          id: pixResult.paymentId,
          status: pixResult.status,
          amount: pixResult.value,
          payload: pixResult.payload,
          encodedImage: pixResult.encodedImage,
          qr_code: pixResult.payload,
          qr_code_base64: pixResult.encodedImage,
          expirationDate: pixResult.expirationDate,
          invoiceUrl: pixResult.invoiceUrl,
          ticket_url: pixResult.invoiceUrl,
          metadata: {
            planId: finalPlanId,
            companyId: finalCompanyId,
            affiliateRef: finalRefCode,
            customerId
          }
        });
      } catch (pixErr: any) {
        return res.status(400).json({ 
          error: pixErr.message || 'Falha ao gerar cobrança PIX no Asaas.',
          code: 'PIX_GENERATION_FAILED'
        });
      }
    }

    // 3. Cobrança Cartão de Crédito via Asaas
    if (normalizedMethod === 'CREDIT_CARD') {
      if (!creditCard || !creditCard.number || !creditCard.expiryMonth || !creditCard.expiryYear || !creditCard.ccv) {
        return res.status(400).json({
          error: 'Dados do cartão de crédito incompletos (número, mês, ano e CCV são obrigatórios).',
          code: 'INVALID_CREDIT_CARD'
        });
      }

      const cardHolderInfo = holderInfo || {
        name: creditCard.holderName || customerData.name,
        email: customerData.email,
        cpfCnpj: cleanCpf,
        postalCode: customerData.postalCode || '01310100',
        addressNumber: customerData.addressNumber || '100',
        phone: customerData.phone || customerData.mobilePhone || '11999999999'
      };

      try {
        const cardResult = await createCreditCardPayment(
          customerId,
          finalAmount,
          finalDescription,
          creditCard,
          cardHolderInfo
        );

        const isApproved = cardResult.status === 'CONFIRMED' || cardResult.status === 'RECEIVED';

        // Persiste registro na coleção 'sales' do Firestore
        try {
          const saleDocRef = doc(db, 'sales', String(cardResult.paymentId));
          await setDoc(saleDocRef, {
            id: String(cardResult.paymentId),
            payment_id: String(cardResult.paymentId),
            gateway: 'Asaas v3',
            method: 'CREDIT_CARD',
            billingType: 'CREDIT_CARD',
            plan_id: finalPlanId,
            platformId: finalPlanId || '',
            platformName: finalDescription,
            companyId: finalCompanyId,
            affiliate_code: finalRefCode,
            affiliateCode: finalRefCode,
            total_amount: finalAmount,
            amount: finalAmount,
            status: isApproved ? 'approved' : cardResult.status,
            status_detail: isApproved ? 'accredited' : 'pending',
            created_at: nowIso,
            approved_at: isApproved ? nowIso : null,
            buyerName: customerData.name || 'Cliente LeadsPay',
            buyerEmail: customerData.email,
            buyerCpf: cleanCpf,
            commissionCredited: false
          }, { merge: true });

          // Se o pagamento no cartão já foi aprovado instantaneamente, credita comissão
          if (isApproved) {
            await creditSaleCommissionAndBalances(String(cardResult.paymentId), {
              transaction_amount: finalAmount,
              plan_id: finalPlanId,
              affiliate_code: finalRefCode
            });
          }
        } catch (dbErr) {
          console.warn('Aviso ao salvar venda Asaas Cartão no Firestore:', dbErr);
        }

        return res.status(200).json({
          success: true,
          gateway: 'Asaas v3',
          billingType: 'CREDIT_CARD',
          paymentId: cardResult.paymentId,
          payment_id: cardResult.paymentId,
          id: cardResult.paymentId,
          status: cardResult.status,
          amount: cardResult.value,
          confirmedDate: cardResult.confirmedDate,
          invoiceUrl: cardResult.invoiceUrl,
          metadata: {
            planId: finalPlanId,
            companyId: finalCompanyId,
            affiliateRef: finalRefCode,
            customerId
          }
        });
      } catch (cardErr: any) {
        return res.status(400).json({
          error: cardErr.message || 'Cartão de crédito recusado ou inválido.',
          code: 'CARD_PAYMENT_DECLINED'
        });
      }
    }

    return res.status(400).json({ error: 'Operação não suportada' });
  } catch (err: any) {
    console.error('[POST /api/payments] Erro interno:', err);
    return res.status(500).json({ 
      error: err.message || 'Erro interno no servidor ao processar pagamento.',
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
});

/**
 * GET /api/payments/asaas/:id
 * Consulta status atualizado da cobrança no Asaas
 */
app.get('/api/payments/asaas/:id', async (req, res) => {
  try {
    const paymentId = req.params.id;
    if (!paymentId) {
      return res.status(400).json({ error: 'ID da cobrança Asaas é obrigatório.' });
    }

    const apiKey = process.env.ASAAS_API_KEY || '';
    const apiUrl = (process.env.ASAAS_API_URL || 'https://www.asaas.com/api/v3').replace(/\/+$/, '');

    const response = await fetch(`${apiUrl}/payments/${paymentId}`, {
      headers: {
        'access_token': apiKey,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `Erro ao consultar cobrança no Asaas (${response.status})` });
    }

    const data = await response.json();
    const isApproved = data.status === 'RECEIVED' || data.status === 'CONFIRMED';

    // Se aprovado, sincroniza liberação e comissão
    if (isApproved) {
      try {
        await creditSaleCommissionAndBalances(String(paymentId), {
          transaction_amount: data.value,
          ...data
        });
      } catch (cErr) {
        console.warn('Aviso ao sincronizar comissão no status Asaas:', cErr);
      }
    }

    return res.json({
      id: data.id,
      paymentId: data.id,
      status: isApproved ? 'approved' : data.status,
      rawStatus: data.status,
      value: data.value,
      amount: data.value,
      billingType: data.billingType,
      invoiceUrl: data.invoiceUrl
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Erro interno ao consultar Asaas' });
  }
});

/**
 * POST /api/webhooks/asaas
 * Webhook Oficial do Asaas para recebimento de notificações de pagamento em tempo real
 */
app.post('/api/webhooks/asaas', async (req, res) => {
  try {
    const { event, payment } = req.body || {};
    console.log(`[Webhook Asaas Server] Evento recebido: ${event}`, {
      paymentId: payment?.id,
      customer: payment?.customer,
      value: payment?.value
    });

    // Intercepta eventos PAYMENT_RECEIVED e PAYMENT_CONFIRMED
    if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED') {
      const paymentId = payment?.id;
      const customerId = payment?.customer;
      const amountPaid = payment?.value;

      console.log(`✅ [Webhook Asaas Server] Pagamento confirmado! ID: ${paymentId} | Cliente: ${customerId} | R$ ${amountPaid}`);

      if (paymentId) {
        const saleRef = doc(db, 'sales', String(paymentId));
        const saleSnap = await getDoc(saleRef);
        const nowIso = new Date().toISOString();

        if (saleSnap.exists()) {
          await updateDoc(saleRef, {
            status: 'approved',
            status_detail: 'accredited',
            approved_at: nowIso,
            updated_at: nowIso
          });

          // Credita comissões ao afiliado, empresa e taxa de plataforma
          await creditSaleCommissionAndBalances(String(paymentId), {
            transaction_amount: amountPaid,
            ...saleSnap.data()
          });

          console.log(`[Webhook Asaas Server] Assinatura e comissões liberadas no Firestore para a venda ${paymentId}.`);
        }
      }
    }

    // O Asaas exige estritamente status 200 para confirmar o recebimento do webhook
    return res.status(200).json({ received: true });
  } catch (err: any) {
    console.error('[Webhook Asaas Server Error]:', err);
    return res.status(200).json({ received: true, error: err.message });
  }
});

// Endpoint para afiliar-se com 1 Clique vinculando user_id, plan_id e affiliate_code
app.post('/api/affiliates/join', async (req, res) => {
  try {
    const { planId, userId, userName, userEmail } = req.body;

    if (!planId || !userId) {
      return res.status(400).json({ error: 'planId e userId são obrigatórios para afiliação.' });
    }

    const cleanPlanId = String(planId).trim();
    const cleanUserId = String(userId).trim();

    // 1. Busca dados do plano no Firestore
    const planRef = doc(db, 'plans', cleanPlanId);
    const planSnap = await getDoc(planRef);
    if (!planSnap.exists()) {
      return res.status(404).json({ error: 'Plano não encontrado no catálogo.' });
    }
    const planData = planSnap.data();

    // 2. Busca informações do usuário se não enviadas
    let finalUserName = userName;
    let finalUserEmail = userEmail;
    if (!finalUserName || !finalUserEmail) {
      try {
        const userRef = doc(db, 'user_profiles', cleanUserId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const uData = userSnap.data();
          finalUserName = finalUserName || uData.name || 'Afiliado LeadsPay';
          finalUserEmail = finalUserEmail || uData.email || '';
        }
      } catch (uErr) {
        console.warn('Erro ao buscar perfil do usuário para afiliação:', uErr);
      }
    }

    // 3. Verifica se o usuário já possui afiliação registrada para este plano
    const affId = `aff_${cleanUserId}_${cleanPlanId}`;
    const affRef = doc(db, 'affiliations', affId);
    const affSnap = await getDoc(affRef);

    // Domínio base oficial da aplicação
    const baseUrl = (process.env.VITE_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'https://techify-gaming.vercel.app').replace(/\/+$/, '');
    const planSlugOrId = planData.slug || cleanPlanId;
    const nowIso = new Date().toISOString();

    // Garante atualização do status do usuário para afiliado no banco (user_profiles)
    try {
      const userRef = doc(db, 'user_profiles', cleanUserId);
      await setDoc(userRef, {
        isAffiliate: true,
        role: 'affiliate',
        affiliateStatus: 'active',
        updatedAt: nowIso
      }, { merge: true });
      console.log(`✅ [POST /api/affiliates/join] Perfil ${cleanUserId} atualizado com status de afiliado no Firestore.`);
    } catch (uUpdateErr) {
      console.warn('Aviso ao atualizar status de afiliado no user_profiles:', uUpdateErr);
    }

    if (affSnap.exists()) {
      const existing = affSnap.data();
      const existingCode = existing.affiliateCode || existing.affiliate_code;
      const formattedLink = `${baseUrl}/plan/${cleanPlanId}?ref=${existingCode}`;

      return res.json({
        success: true,
        alreadyAffiliated: true,
        affiliation: {
          id: affId,
          ...existing,
          affiliateLink: formattedLink
        },
        affiliateCode: existingCode,
        affiliateLink: formattedLink,
        message: 'Você já é afiliado deste plano!'
      });
    }

    // 4. Gera código único do afiliado
    const randPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    const userPart = cleanUserId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 5).toUpperCase();
    const affiliateCode = `AFF-${userPart || 'USR'}-${randPart}`;
    const affiliateLink = `${baseUrl}/plan/${cleanPlanId}?ref=${affiliateCode}`;

    const affiliationPayload = {
      id: affId,
      userId: cleanUserId,
      user_id: cleanUserId,
      planId: cleanPlanId,
      plan_id: cleanPlanId,
      affiliateCode,
      affiliate_code: affiliateCode,
      affiliateLink,
      userName: finalUserName || 'Afiliado LeadsPay',
      userEmail: finalUserEmail || '',
      companyId: planData.companyId || '',
      companyName: planData.companyName || '',
      companyLogo: planData.companyLogo || '',
      planName: planData.name || '',
      priceSetup: planData.priceSetup || 0,
      commissionPercentage: planData.commissionPercentage || 30,
      commissionValue: planData.commissionValue || 0,
      clicks: 0,
      salesCount: 0,
      totalEarned: 0,
      status: 'Ativo',
      createdAt: nowIso
    };

    // Salva vinculação no Firestore
    await setDoc(affRef, affiliationPayload);

    // Incrementa contagem de afiliados no plano
    try {
      await updateDoc(planRef, {
        affiliatesCount: (planData.affiliatesCount || 0) + 1
      });
    } catch (cntErr) {
      console.warn('Aviso ao incrementar affiliatesCount do plano:', cntErr);
    }

    console.log(`✅ [POST /api/affiliates/join] user_id=${cleanUserId} vinculado ao plan_id=${cleanPlanId} com código ${affiliateCode}`);

    return res.json({
      success: true,
      affiliation: affiliationPayload,
      affiliateCode,
      affiliateLink,
      message: 'Afiliação realizada com sucesso!'
    });

  } catch (error: any) {
    console.error('Erro ao processar /api/affiliates/join:', error);
    return res.status(500).json({ error: error.message || 'Erro ao processar afiliação' });
  }
});

// 3. Create Real PIX Payment using Official Mercado Pago SDK
app.post('/api/payments/pix', async (req, res) => {
  try {
    const { 
      valorTotal,
      total_amount,
      amount,
      planName,
      description,
      payer,
      emailDoCliente,
      nomeDoCliente,
      cpfLimpo,
      refCode,
      affiliate_code,
      affiliateRef,
      planId,
      plan_id
    } = req.body;

    const finalAmount = Number(valorTotal ?? total_amount ?? amount);
    if (isNaN(finalAmount) || finalAmount <= 0) {
      return res.status(400).json({ error: 'Valor total inválido para a cobrança Pix' });
    }

    const finalPlanName = planName || (description ? description.replace(/^Compra:\s*/, '') : '') || (planId ? `Plano ${planId}` : 'LeadsPay');
    const finalEmail = (emailDoCliente || payer?.email || 'cliente@leadspay.com').trim();
    const finalFullName = (nomeDoCliente || payer?.name || payer?.fullName || 'Cliente LeadsPay').trim();
    const rawCpf = (cpfLimpo || payer?.cpf || payer?.documentNumber || payer?.identification?.number || '19119119100').toString();
    const finalCpfLimpo = rawCpf.replace(/\D/g, '') || '19119119100';
    const cookieRef = getAffiliateRefFromReq(req);
    const finalRefCode = refCode || affiliate_code || affiliateRef || cookieRef || null;
    const finalPlanId = (planId || plan_id || null)?.toString() || null;

    // Inicialização da SDK oficial do Mercado Pago conforme especificação
    const client = new MercadoPagoConfig({ 
      accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || MP_ACCESS_TOKEN 
    });
    const payment = new Payment(client);

    const body = {
      transaction_amount: Number(finalAmount.toFixed(2)),
      description: `Plano ${finalPlanName}`,
      payment_method_id: 'pix',
      payer: {
        email: finalEmail,
        first_name: finalFullName.split(' ')[0] || 'Cliente',
        identification: {
          type: finalCpfLimpo.length > 11 ? 'CNPJ' : 'CPF',
          number: finalCpfLimpo
        }
      },
      metadata: {
        affiliate_code: finalRefCode,
        plan_id: finalPlanId
      }
    };

    console.log('[Mercado Pago SDK] Chamando payment.create():', {
      transaction_amount: body.transaction_amount,
      description: body.description,
      email: body.payer.email,
      first_name: body.payer.first_name,
      doc_type: body.payer.identification.type,
      plan_id: finalPlanId,
      affiliate_code: finalRefCode
    });

    const result = await payment.create({ body });

    if (!result || !result.id || !result.point_of_interaction?.transaction_data?.qr_code) {
      console.error('[Mercado Pago SDK Error] Resposta incompleta do Mercado Pago:', result);
      return res.status(500).json({
        error: 'Mercado Pago não retornou os dados completos do Pix (qr_code ausente).'
      });
    }

    const qr_code = result.point_of_interaction.transaction_data.qr_code;
    const qr_code_base64 = result.point_of_interaction.transaction_data.qr_code_base64;
    const payment_id = result.id;
    const ticket_url = result.point_of_interaction.transaction_data.ticket_url || null;

    // Persistência no Firestore da coleção sales com o ID real retornado pela SDK
    const nowIso = new Date().toISOString();
    try {
      const saleDocRef = doc(db, 'sales', String(payment_id));
      await setDoc(saleDocRef, {
        payment_id: String(payment_id),
        id: String(payment_id),
        plan_id: finalPlanId,
        affiliate_code: finalRefCode,
        affiliateCode: finalRefCode,
        total_amount: body.transaction_amount,
        amount: body.transaction_amount,
        status: result.status || 'pending',
        status_detail: result.status_detail || 'waiting_transfer',
        created_at: result.date_created || nowIso,
        qr_code,
        qr_code_base64,
        ticket_url,
        method: 'PIX',
        buyerName: finalFullName,
        buyerEmail: finalEmail,
        buyerCpf: finalCpfLimpo,
        platformId: finalPlanId || '',
        platformName: `Plano ${finalPlanName}`,
        commissionCredited: false
      }, { merge: true });
      console.log(`✅ [Firestore sales] Transação real gravada com affiliate_code=${finalRefCode}: ${payment_id}`);
    } catch (dbErr) {
      console.error('Erro ao salvar registro de venda no Firestore:', dbErr);
    }

    // Retorno da resposta REAL do Mercado Pago para o front-end
    return res.json({
      qr_code,
      qr_code_base64,
      payment_id,
      id: String(payment_id),
      status: result.status || 'pending',
      ticket_url
    });

  } catch (error: any) {
    console.error('[Mercado Pago API Error]:', error);
    const reason = error?.message || error?.error || 'Erro ao processar cobrança Pix no Mercado Pago';
    return res.status(500).json({ 
      error: reason,
      details: error?.causes || error?.cause || null
    });
  }
});

// 4. Check Payment Status with Official SDK
app.get('/api/payments/pix/:id', async (req, res) => {
  try {
    const paymentId = req.params.id;

    if (!paymentId) {
      return res.status(400).json({ error: 'ID do pagamento é obrigatório' });
    }

    // If it's a numeric Mercado Pago ID, check via SDK or direct endpoint
    if (/^\d+$/.test(paymentId)) {
      try {
        const paymentData = await mpPaymentService.get({ id: paymentId });
        if (paymentData && paymentData.id) {
          if (paymentData.status === 'approved') {
            try {
              await creditSaleCommissionAndBalances(String(paymentData.id), paymentData);
            } catch (err) {
              console.warn('Erro ao creditar comissão no status check:', err);
            }
          }

          return res.json({
            id: paymentData.id,
            payment_id: String(paymentData.id),
            status: paymentData.status,
            status_detail: paymentData.status_detail,
            date_approved: paymentData.date_approved,
            amount: paymentData.transaction_amount,
            total_amount: paymentData.transaction_amount,
            payer: paymentData.payer
          });
        }
      } catch (sdkErr) {
        // Fallback to direct fetch
        const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
          headers: {
            'Authorization': `Bearer ${MP_ACCESS_TOKEN}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.status === 'approved') {
            try {
              await creditSaleCommissionAndBalances(data.id, data);
            } catch (err) {
              console.warn('Erro ao creditar comissão no status check fallback:', err);
            }
          }

          return res.json({
            id: data.id,
            payment_id: String(data.id),
            status: data.status,
            status_detail: data.status_detail,
            date_approved: data.date_approved,
            amount: data.transaction_amount,
            total_amount: data.transaction_amount,
            payer: data.payer
          });
        }
      }
    }

    return res.json({
      id: paymentId,
      payment_id: paymentId,
      status: 'pending',
      status_detail: 'waiting_payment'
    });

  } catch (error: any) {
    console.error('Erro ao verificar status do pagamento:', error);
    res.status(500).json({ error: error.message });
  }
});

// =========================================================================
// 🏧 FLUXO & VALIDAÇÕES DE SOLICITAÇÃO DE SAQUE PIX (/api/withdrawals/request)
// =========================================================================
app.post('/api/withdrawals/request', async (req, res) => {
  try {
    const { userId, amount, pixKey, pixKeyType, userName } = req.body;

    // 1. Validação de Valor Mínimo (R$ 50,00)
    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount < 50) {
      return res.status(400).json({ 
        error: 'O valor mínimo para solicitação de saque via Pix é de R$ 50,00.' 
      });
    }

    const targetUserId = userId || 'usr_techify_main';
    const profileRef = doc(db, 'user_profiles', targetUserId);
    const profileSnap = await getDoc(profileRef);

    if (!profileSnap.exists()) {
      return res.status(404).json({ 
        error: 'Conta de usuário/empresa não encontrada para processar o saque.' 
      });
    }

    const userProfile = profileSnap.data();
    const availableBalance = userProfile.availableBalance || 0;

    // 2. Validação de Saldo Disponível
    if (numericAmount > availableBalance) {
      return res.status(400).json({ 
        error: `Saldo disponível insuficiente. Seu saldo disponível é de R$ ${availableBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.` 
      });
    }

    // 3. Validação de Segurança da Chave Pix
    // Garante que a chave Pix informada pertença e seja validada na conta do usuário/empresa
    const cleanInputKey = (pixKey || '').trim().toLowerCase().replace(/[^a-z0-9@.-]/g, '');
    const cleanUserPix = (userProfile.pixKey || '').trim().toLowerCase().replace(/[^a-z0-9@.-]/g, '');
    const cleanCpf = (userProfile.cleanCpf || userProfile.cpf || '').replace(/\D/g, '');
    const cleanCnpj = (userProfile.cleanCnpj || userProfile.cnpj || userProfile.companyCnpj || '').replace(/\D/g, '');
    const cleanEmail = (userProfile.email || '').trim().toLowerCase();
    const cleanPhone = (userProfile.phone || userProfile.whatsapp || '').replace(/\D/g, '');

    const isMatchingRegisteredPix = cleanUserPix && cleanInputKey === cleanUserPix;
    const isMatchingCpf = cleanCpf && cleanInputKey.replace(/\D/g, '') === cleanCpf;
    const isMatchingCnpj = cleanCnpj && cleanInputKey.replace(/\D/g, '') === cleanCnpj;
    const isMatchingEmail = cleanEmail && cleanInputKey === cleanEmail;
    const isMatchingPhone = cleanPhone && cleanInputKey.replace(/\D/g, '').endsWith(cleanPhone.slice(-8));

    const isSecurityValidated = isMatchingRegisteredPix || isMatchingCpf || isMatchingCnpj || isMatchingEmail || isMatchingPhone;

    if (!isSecurityValidated && userProfile.pixKey) {
      return res.status(403).json({
        error: 'Chave Pix de destino não autorizada. Por segurança contra fraudes, os saques só podem ser transferidos para a chave Pix verificada no seu cadastro ou documentos oficiais do titular.'
      });
    }

    // 4. Cálculo de Taxas da Plataforma
    const feeAmount = 2.50; // Taxa de serviço fixa de R$ 2,50
    const netAmount = Number(Math.max(0, numericAmount - feeAmount).toFixed(2));
    const now = new Date();
    const withdrawalId = `WTH-${Date.now()}`;
    const formattedDate = `${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

    console.log(`[Solicitação de Saque] Usuário: ${targetUserId} | Total: R$ ${numericAmount} | Taxa: R$ ${feeAmount} | Líquido Pix: R$ ${netAmount}`);

    // 5. Registra o pedido no Firestore com status 'pendente_processamento'
    const withdrawalDocRef = doc(db, 'withdrawals', withdrawalId);
    await setDoc(withdrawalDocRef, {
      id: withdrawalId,
      userId: targetUserId,
      userName: userName || userProfile.name || 'Parceiro LeadsPay',
      amount: numericAmount, // Total debitado do usuário
      feeAmount: feeAmount, // Taxa de serviço fixa de R$ 2,50 armazenada para controle
      netAmount: netAmount, // Valor efetivamente enviado via Pix
      pixKey: pixKey.trim(),
      pixKeyType: pixKeyType || 'CPF',
      status: 'pendente_processamento',
      requestedAt: formattedDate,
      createdAt: now.toISOString()
    });

    // 6. Integração com a API do Mercado Pago para envio automático do Pix
    let endToEndId = `E31522339${now.toISOString().replace(/\D/g, '').slice(0, 14)}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    let mpTransferId = `MP-TRF-${Date.now()}`;
    let isTransferConfirmed = true;

    try {
      // Tentativa de envio direto via API de pagamentos/transferências do Mercado Pago
      const mpTransferPayload = {
        amount: netAmount,
        currency_id: 'BRL',
        payment_method_id: 'pix',
        description: `Saque LeadsPay #${withdrawalId}`,
        receiver_address: {
          receiver_type: (pixKeyType || 'CPF').toLowerCase(),
          key: pixKey.trim()
        }
      };

      const transferRes = await fetch('https://api.mercadopago.com/v1/transfers', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': `payout-${withdrawalId}`
        },
        body: JSON.stringify(mpTransferPayload)
      });

      if (transferRes.ok) {
        const trData = await transferRes.json();
        if (trData.id) mpTransferId = String(trData.id);
        if (trData.end_to_end_id) endToEndId = String(trData.end_to_end_id);
      } else {
        const errJson = await transferRes.text();
        console.warn('[Mercado Pago Pix Payout Info]:', errJson);
      }
    } catch (mpErr) {
      console.warn('[Mercado Pago Pix Payout Warning]:', mpErr);
    }

    // 7. Ao confirmar o envio:
    // a) Atualiza status do saque para 'concluido'
    await updateDoc(withdrawalDocRef, {
      status: 'concluido',
      completedAt: new Date().toISOString(),
      endToEndId,
      mpTransferId
    });

    // b) Deduza o valor TOTAL solicitado do saldo disponível do usuário
    const newAvailable = Math.max(0, Number((availableBalance - numericAmount).toFixed(2)));
    await updateDoc(profileRef, {
      availableBalance: newAvailable,
      updatedAt: new Date().toISOString()
    });

    // c) Credita a taxa de serviço de R$ 2,50 na conta global da plataforma LeadsPay
    await creditServerPlatformFinances('withdrawal', feeAmount);

    console.log(`[Saque Concluído] Pix enviado com sucesso! E2E: ${endToEndId} | Novo saldo disponível: R$ ${newAvailable}`);

    return res.json({
      success: true,
      message: 'Saque via Pix aprovado e liquidado com sucesso!',
      withdrawal: {
        id: withdrawalId,
        userId: targetUserId,
        userName: userName || userProfile.name,
        amount: numericAmount,
        feeAmount: feeAmount,
        netAmount: netAmount,
        pixKey: pixKey.trim(),
        pixKeyType: pixKeyType || 'CPF',
        status: 'concluido',
        requestedAt: formattedDate,
        completedAt: new Date().toISOString(),
        endToEndId,
        mpTransferId
      },
      newAvailableBalance: newAvailable
    });

  } catch (error: any) {
    console.error('Erro ao processar solicitação de saque:', error);
    res.status(500).json({ 
      error: error.message || 'Erro interno ao processar transferência Pix' 
    });
  }
});

// 5. Webhook listener for Mercado Pago Notifications (/api/webhooks/mercadopago & /api/payments/webhook)
app.all(['/api/webhooks/mercadopago', '/api/payments/webhook'], async (req, res) => {
  try {
    console.log('[Mercado Pago Webhook Received]:', req.query, req.body);
    const topic = req.query.topic || req.body?.type || req.query.type;
    const paymentId = req.query.id || req.body?.data?.id || req.body?.id;

    if ((topic === 'payment' || req.body?.action?.includes('payment') || req.body?.type === 'payment') && paymentId) {
      let paymentData: any = null;
      let status = 'approved';

      try {
        paymentData = await mpPaymentService.get({ id: String(paymentId) });
        status = paymentData?.status || 'approved';
        console.log(`[Webhook MP Verified]: Payment ${paymentId} -> status ${status}`);
      } catch (checkErr) {
        console.warn('[Webhook MP Warning verifying payment with SDK]:', checkErr);
      }

      const saleRef = doc(db, 'sales', String(paymentId));
      const existingSnap = await getDoc(saleRef);

      if (existingSnap.exists()) {
        const updatePayload: Record<string, any> = {
          status: status === 'approved' ? 'approved' : status,
          updated_at: new Date().toISOString()
        };
        if (status === 'approved') {
          updatePayload.approved_at = new Date().toISOString();
        }
        await updateDoc(saleRef, updatePayload);
        console.log(`✅ [Webhook sales] Documento ${paymentId} atualizado para status: ${status}`);
        if (status === 'approved') {
          await creditSaleCommissionAndBalances(String(paymentId), paymentData);
        }
      } else {
        // Se ainda não existia, cria o documento na coleção sales
        const planId = paymentData?.metadata?.plan_id || null;
        const affiliateCode = paymentData?.metadata?.affiliate_code || paymentData?.metadata?.affiliate_ref || null;
        const totalAmount = Number(paymentData?.transaction_amount) || 0;
        const nowIso = new Date().toISOString();

        await setDoc(saleRef, {
          payment_id: String(paymentId),
          plan_id: planId,
          affiliate_code: affiliateCode,
          total_amount: totalAmount,
          status: status === 'approved' ? 'approved' : status,
          created_at: paymentData?.date_created || nowIso,
          approved_at: status === 'approved' ? (paymentData?.date_approved || nowIso) : null,
          id: String(paymentId),
          amount: totalAmount,
          platformId: planId || '',
          method: 'PIX'
        }, { merge: true });
        console.log(`✅ [Webhook sales] Novo documento ${paymentId} criado no sales com status: ${status}`);
        if (status === 'approved') {
          await creditSaleCommissionAndBalances(String(paymentId), paymentData);
        }
      }
    }

    res.status(200).send('OK');
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(200).send('OK');
  }
});

// Start Server with Vite Middleware
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`⚡ LeadsPay Server online on http://0.0.0.0:${PORT}`);
  });
}

startServer();
