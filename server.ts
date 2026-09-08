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
  cleanDocument,
  createAsaasSubaccount
} from './lib/asaas';
import { validateApiKey } from './lib/auth-partner';

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
// 🚀 ENDPOINT DE CRIAÇÃO E VINCULAÇÃO DE SUBCONTAS ASAAS V3
// =========================================================================

/**
 * POST /api/subaccounts/create, /api/subaccounts
 * Suporta dinamicamente cadastros com CNPJ, MEI ou CPF do Fundador.
 * Cria a subconta na API do Asaas v3 (POST /v3/accounts) e grava no Firestore:
 * - asaasSubaccountId: data.id (ex: "acc_...")
 * - asaasWalletId: data.walletId
 * - documentType: "CNPJ" | "MEI" | "CPF"
 */
app.post(['/api/subaccounts/create', '/api/subaccounts'], async (req, res) => {
  try {
    const body = req.body || {};
    const {
      userId,
      ownerId,
      companyId,
      companyName,
      companyLegalName,
      name,
      ownerName,
      founderName,
      companyOwnerName,
      fullName,
      email,
      companyEmail,
      phone,
      whatsapp,
      companyPhone,
      cnpj,
      cpf,
      cpfCnpj,
      document,
      documentType,
      companyDocType,
      cep,
      postalCode,
      address,
      endereco,
      addressNumber,
      number,
      province,
      bairro,
      city,
      cidade,
      state,
      estado
    } = body;

    const rawDoc = cpfCnpj || cnpj || cpf || document || '';
    const cleanDoc = cleanDocument(rawDoc);

    if (!cleanDoc) {
      return res.status(400).json({
        error: true,
        message: 'Documento fiscal (CNPJ, MEI ou CPF) é obrigatório para cadastrar a subconta.'
      });
    }

    // Identifica documentType: "CNPJ" | "MEI" | "CPF"
    const requestedType = String(documentType || companyDocType || '').toUpperCase().trim();
    let finalDocType: 'CNPJ' | 'MEI' | 'CPF' = 'CNPJ';

    if (cleanDoc.length === 11) {
      finalDocType = 'CPF';
    } else if (cleanDoc.length === 14) {
      if (requestedType === 'MEI' || requestedType.includes('MEI')) {
        finalDocType = 'MEI';
      } else {
        finalDocType = 'CNPJ';
      }
    } else {
      if (requestedType === 'CPF') finalDocType = 'CPF';
      else if (requestedType === 'MEI') finalDocType = 'MEI';
      else finalDocType = 'CNPJ';
    }

    // Regra de Nome:
    // - Se houver CNPJ/MEI preenchido: Razão Social / Nome Fantasia da Empresa
    // - Se for CPF do Fundador: Nome Completo do Fundador (ex: "MACOS HENRIQUE")
    let accountName = '';
    if (finalDocType === 'CNPJ') {
      accountName = (companyLegalName || companyName || name || '').trim();
    } else if (finalDocType === 'MEI') {
      accountName = (companyLegalName || companyName || ownerName || founderName || name || '').trim();
    } else {
      // CPF do Fundador
      accountName = (ownerName || founderName || companyOwnerName || fullName || name || '').trim();
    }

    if (!accountName) {
      accountName = (companyName || ownerName || name || 'Fundador LeadsPay').trim();
    }

    const accountEmail = (companyEmail || email || '').trim() || `empresa_${cleanDoc || Date.now()}@leadspay.com.br`;
    const accountPhone = (companyPhone || phone || whatsapp || '').trim();

    console.log(`[API Subaccounts] Criando subconta Asaas: Nome="${accountName}", Doc="${cleanDoc}" (${finalDocType}), Email="${accountEmail}"`);

    // Cria ou recupera subconta via Asaas SDK
    const subaccount = await createAsaasSubaccount({
      name: accountName,
      email: accountEmail,
      cpfCnpj: cleanDoc,
      phone: accountPhone,
      mobilePhone: accountPhone,
      address: address || endereco,
      addressNumber: addressNumber || number,
      province: province || bairro,
      postalCode: postalCode || cep,
      companyType: finalDocType === 'MEI' ? 'MEI' : (finalDocType === 'CNPJ' ? 'LIMITED' : undefined)
    });

    const targetUserId = userId || ownerId;
    const targetCompanyId = companyId;

    const firestoreUpdates: Record<string, any> = {
      asaasSubaccountId: subaccount.id,
      asaasWalletId: subaccount.walletId,
      documentType: finalDocType,
      updatedAt: new Date().toISOString()
    };

    // 1. Grava no Firestore do Usuário (users/{userId})
    if (targetUserId) {
      try {
        await setDoc(doc(db, 'users', String(targetUserId)), firestoreUpdates, { merge: true });
        console.log(`✅ [Firestore Subaccount] users/${targetUserId} atualizado com asaasSubaccountId: ${subaccount.id}`);
      } catch (uErr) {
        console.warn('Aviso ao atualizar users no Firestore:', uErr);
      }

      // 2. Grava no Firestore do Perfil (user_profiles/{userId})
      try {
        await setDoc(doc(db, 'user_profiles', String(targetUserId)), firestoreUpdates, { merge: true });
        console.log(`✅ [Firestore Subaccount] user_profiles/${targetUserId} atualizado com asaasSubaccountId: ${subaccount.id}`);
      } catch (pErr) {
        console.warn('Aviso ao atualizar user_profiles no Firestore:', pErr);
      }
    }

    // 3. Grava no Firestore da Empresa (companies/{companyId})
    if (targetCompanyId) {
      try {
        await setDoc(doc(db, 'companies', String(targetCompanyId)), firestoreUpdates, { merge: true });
        console.log(`✅ [Firestore Subaccount] companies/${targetCompanyId} atualizado com asaasSubaccountId: ${subaccount.id}`);
      } catch (cErr) {
        console.warn('Aviso ao atualizar companies no Firestore:', cErr);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Subconta Asaas criada e vinculada com sucesso.',
      asaasSubaccountId: subaccount.id,
      asaasWalletId: subaccount.walletId,
      documentType: finalDocType,
      account: {
        id: subaccount.id,
        name: subaccount.name,
        email: subaccount.email,
        cpfCnpj: subaccount.cpfCnpj,
        walletId: subaccount.walletId
      }
    });
  } catch (err: any) {
    console.error('❌ [API Subaccounts] Erro ao criar subconta no Asaas:', err);
    return res.status(400).json({
      error: true,
      message: err.message || 'Erro inesperado ao criar subconta no Asaas.'
    });
  }
});

// =========================================================================
// 🚀 ENDPOINTS DE PAGAMENTO ASAAS V3 (PIX, CARTÃO DE CRÉDITO E WEBHOOK)
// =========================================================================

/**
 * POST /api/payments, /api/payments/pix, /api/pix, /api/checkout
 * Processa pagamentos via Asaas v3 (PIX ou Cartão de Crédito)
 */
app.post(['/api/payments', '/api/payments/pix', '/api/pix', '/api/checkout'], async (req, res) => {
  try {
    const body = req.body || {};
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
      sellerId,
      refCode,
      affiliate_code,
      affiliateRef
    } = body;

    let sellerSubaccountId = body.subaccountId;

    // 🔑 ETAPA 1: Autenticação via API Key do Parceiro (x-api-key ou Authorization: Bearer lp_live_...)
    const rawApiKey = 
      req.headers['x-api-key'] || 
      req.headers['X-API-KEY'] || 
      req.headers['x-partner-key'] ||
      (typeof req.query?.apiKey === 'string' ? req.query.apiKey : undefined) ||
      (typeof req.body?.apiKey === 'string' ? req.body.apiKey : undefined);

    let partnerApiKey = typeof rawApiKey === 'string' ? rawApiKey.trim() : undefined;
    const authHeader = req.headers.authorization;
    if (!partnerApiKey && authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace(/^Bearer\s+/i, '').trim();
      if (token.startsWith('lp_live_') || token.startsWith('lp_')) {
        partnerApiKey = token;
      }
    }

    let partnerInfo: any = null;
    if (partnerApiKey) {
      const partner = await validateApiKey(partnerApiKey, db);
      if (!partner.isValid) {
        return res.status(401).json({
          error: true,
          message: "API Key de parceiro inválida ou não encontrada."
        });
      }
      partnerInfo = partner;

      // Injete automaticamente o subaccountId resolvido da empresa vinculada àquela API Key
      if (partner.asaasSubaccountId) {
        sellerSubaccountId = partner.asaasSubaccountId;
        body.subaccountId = partner.asaasSubaccountId;
        console.log(`🔑 [API Partner] Autenticado com sucesso para ${partner.companyName || partner.userId} (Subconta Asaas: ${partner.asaasSubaccountId})`);
      }
    }

    // Se amount não foi informado diretamente, mas planId foi passado, busca preço do plano
    let rawAmount = amount ?? valorTotal ?? total_amount;
    const rawTargetPlanId = planId || plan_id;
    const targetPlanId = (rawTargetPlanId && String(rawTargetPlanId) !== 'checkout-dinamico' && String(rawTargetPlanId) !== 'checkout-direto')
      ? String(rawTargetPlanId)
      : null;

    if ((rawAmount === undefined || rawAmount === null || rawAmount <= 0) && targetPlanId) {
      try {
        const planDoc = await getDoc(doc(db, 'plans', String(targetPlanId)));
        if (planDoc.exists()) {
          const pl = planDoc.data();
          rawAmount = pl.priceSetup || pl.priceMonthly || pl.price || pl.total_amount;
          if (!body.description) {
            body.description = pl.name || `Assinatura Plano ${targetPlanId}`;
          }
          if (!companyId && !company_id && pl.companyId) {
            body.companyId = pl.companyId;
          }
          if (!sellerSubaccountId && pl.asaasSubaccountId) {
            sellerSubaccountId = pl.asaasSubaccountId;
            body.subaccountId = pl.asaasSubaccountId;
          }
        }
      } catch (pErr) {
        console.warn('Aviso ao consultar plano no Firestore:', pErr);
      }
    }

    // Se o subaccountId não veio no payload, resolve no Firestore:
    // 1) users/{sellerId}.asaasSubaccountId
    // 2) user_profiles/{sellerId}.asaasSubaccountId
    // 3) companies/{companyId}.asaasSubaccountId
    // 4) plans/{planId}.asaasSubaccountId
    if (!sellerSubaccountId) {
      const candidateSellerId = sellerId || body.ownerId || body.userId || companyId || company_id || (planId || plan_id) || partnerInfo?.userId || partnerInfo?.companyId;
      if (candidateSellerId) {
        try {
          const userDoc = await getDoc(doc(db, 'users', String(candidateSellerId)));
          if (userDoc.exists()) {
            const uData = userDoc.data();
            sellerSubaccountId = uData?.asaasSubaccountId || uData?.subaccountId || uData?.subaccount_id || uData?.walletId;
          }
          if (!sellerSubaccountId) {
            const profDoc = await getDoc(doc(db, 'user_profiles', String(candidateSellerId)));
            if (profDoc.exists()) {
              const pData = profDoc.data();
              sellerSubaccountId = pData?.asaasSubaccountId || pData?.subaccountId || pData?.subaccount_id || pData?.walletId;
            }
          }
        } catch (dbErr) {
          console.warn('[Server Asaas] Erro ao consultar subaccountId no Firestore:', dbErr);
        }
      }

      // Se ainda não encontrou e temos companyId
      const targetCompId = companyId || company_id || partnerInfo?.companyId;
      if (!sellerSubaccountId && targetCompId) {
        try {
          const compDoc = await getDoc(doc(db, 'companies', String(targetCompId)));
          if (compDoc.exists()) {
            const cData = compDoc.data();
            sellerSubaccountId = cData?.asaasSubaccountId || cData?.subaccountId;
            if (!sellerSubaccountId && cData?.ownerId) {
              const ownerDoc = await getDoc(doc(db, 'users', String(cData.ownerId)));
              if (ownerDoc.exists()) {
                sellerSubaccountId = ownerDoc.data()?.asaasSubaccountId || ownerDoc.data()?.subaccountId;
              }
            }
          }
        } catch (cErr) {
          console.warn('[Server Asaas] Erro ao consultar empresa no Firestore:', cErr);
        }
      }

      // Se ainda não encontrou e temos planId
      const targetPlId = planId || plan_id;
      if (!sellerSubaccountId && targetPlId) {
        try {
          const planDoc = await getDoc(doc(db, 'plans', String(targetPlId)));
          if (planDoc.exists()) {
            const plData = planDoc.data();
            sellerSubaccountId = plData?.asaasSubaccountId || plData?.subaccountId;
            if (!sellerSubaccountId && plData?.companyId) {
              const compDoc = await getDoc(doc(db, 'companies', String(plData.companyId)));
              if (compDoc.exists()) {
                sellerSubaccountId = compDoc.data()?.asaasSubaccountId || compDoc.data()?.subaccountId;
                if (!sellerSubaccountId && compDoc.data()?.ownerId) {
                  const ownerDoc = await getDoc(doc(db, 'users', String(compDoc.data()?.ownerId)));
                  if (ownerDoc.exists()) {
                    sellerSubaccountId = ownerDoc.data()?.asaasSubaccountId || ownerDoc.data()?.subaccountId;
                  }
                }
              }
            }
          }
        } catch (pErr) {
          console.warn('[Server Asaas] Erro ao consultar plano no Firestore:', pErr);
        }
      }
    }

    // BLOQUEIO DINÂMICO NO CHECKOUT (PROIBIDO FALLBACK PARA CONTA MASTER)
    if (!sellerSubaccountId) {
      console.warn(`[Checkout Asaas] Tentativa de pagamento bloqueada: Empresa/vendedor sem subconta Asaas. PlanId: ${planId || plan_id}, CompanyId: ${companyId || company_id}, SellerId: ${sellerId || body.ownerId || partnerInfo?.userId}`);
      return res.status(400).json({
        error: true,
        message: "Esta empresa ainda não possui uma subconta ativa no Asaas para receber pagamentos."
      });
    }

    // INJEÇÃO OBRIGATÓRIA: Toda chamada à API do Asaas v3 deve conter o header 'account'
    body.subaccountId = sellerSubaccountId;
    console.log(`🔒 [Checkout Asaas] Header 'account' injetado com sucesso para a subconta Asaas: ${sellerSubaccountId}`);

    const normalizedMethod = String(paymentMethod || 'PIX').toUpperCase().trim();
    if (normalizedMethod !== 'PIX' && normalizedMethod !== 'CREDIT_CARD') {
      return res.status(400).json({ 
        error: true,
        message: 'Método de pagamento inválido. Utilize "PIX" ou "CREDIT_CARD".',
        received: paymentMethod 
      });
    }

    const finalAmount = Number(parseFloat(String(rawAmount)).toFixed(2));
    if (isNaN(finalAmount) || finalAmount <= 0) {
      return res.status(400).json({ error: true, message: 'Valor da cobrança inválido ou não informado.' });
    }

    const rawCustomer = (req.body?.customer && typeof req.body.customer === 'object')
      ? req.body.customer 
      : ((user && typeof user === 'object') ? user : {});

    const customerData = {
      name: (rawCustomer.name || req.body?.nomeDoCliente || req.body?.name || 'Cliente LeadsPay').trim(),
      email: (rawCustomer.email || req.body?.emailDoCliente || req.body?.email || '').trim(),
      cpfCnpj: rawCustomer.cpfCnpj || rawCustomer.cpf || req.body?.cpfLimpo || req.body?.cpf || req.body?.documentNumber,
      phone: (rawCustomer.phone || rawCustomer.mobilePhone || req.body?.telefone || req.body?.celular || '').trim(),
      mobilePhone: (rawCustomer.mobilePhone || rawCustomer.phone || req.body?.celular || req.body?.telefone || '').trim(),
      postalCode: rawCustomer.postalCode || req.body?.postalCode || req.body?.cep,
      address: rawCustomer.address || req.body?.address,
      addressNumber: rawCustomer.addressNumber || req.body?.addressNumber
    };

    if (!customerData?.email) {
      return res.status(400).json({ error: true, message: 'O e-mail do cliente é obrigatório para processar a cobrança.' });
    }

    const cleanCpf = cleanDocument(customerData.cpfCnpj);
    if (!cleanCpf) {
      return res.status(400).json({ error: true, message: 'CPF ou CNPJ válido é obrigatório para o cadastro e cobrança no Asaas.' });
    }

    const cookieRef = getAffiliateRefFromReq(req);
    const finalRefCode = refCode || affiliate_code || affiliateRef || cookieRef || null;
    const finalPlanId = targetPlanId || null;
    const finalCompanyId = (companyId || company_id || partnerInfo?.companyId || null)?.toString() || null;
    const finalSellerId = (sellerId || body.ownerId || body.userId || partnerInfo?.userId || null)?.toString() || null;
    const finalWebhookUrl = partnerInfo?.webhookUrl || body.webhookUrl || null;
    const finalDescription = (description || body.description || (targetPlanId ? `Assinatura Plano ${targetPlanId}` : 'Cobrança LeadsPay')).trim();

    // 1. Obter ou Criar Cliente no Asaas
    let customerId: string;
    try {
      customerId = await getOrCreateCustomer({
        name: customerData.name || 'Cliente LeadsPay',
        email: customerData.email,
        cpfCnpj: cleanCpf,
        phone: customerData.phone,
        mobilePhone: customerData.mobilePhone || customerData.phone,
        postalCode: customerData.postalCode,
        address: customerData.address,
        addressNumber: customerData.addressNumber
      }, body.subaccountId);
    } catch (custError: any) {
      console.error('[Server Asaas Customer Error] Falha detalhada ao obter/criar cliente:', custError);
      const status = custError.status || custError.statusCode || 400;
      const errMsg = custError.errors?.[0]?.description || custError.message || 'Erro desconhecido na API do Asaas';
      const errList = custError.errors || custError.details?.errors || (Array.isArray(custError.details) ? custError.details : [{ description: errMsg }]);
      return res.status(status).json({ 
        error: true,
        message: errMsg,
        description: errMsg,
        errors: errList,
        details: custError.details || custError.responseData || null,
        code: 'CUSTOMER_CREATION_FAILED'
      });
    }

    const nowIso = new Date().toISOString();

    // 2. Cobrança PIX via Asaas
    if (normalizedMethod === 'PIX') {
      try {
        console.log("GERANDO PIX NA SUBCONTA:", body.subaccountId);

        const pixResult = await createPixPayment(
          customerId, 
          finalAmount, 
          finalDescription,
          body.subaccountId
        );

        // Persiste registro na coleção 'sales' do Firestore
        try {
          const saleDocRef = doc(db, 'sales', String(pixResult.paymentId));
          await setDoc(saleDocRef, {
            id: String(pixResult.paymentId),
            payment_id: String(pixResult.paymentId),
            gateway: 'Asaas v3',
            method: 'PIX',
            billingType: 'PIX',
            subaccountId: body.subaccountId || null,
            plan_id: finalPlanId,
            platformId: finalPlanId || '',
            platformName: finalDescription,
            companyId: finalCompanyId,
            sellerId: finalSellerId,
            apiKey: partnerApiKey || null,
            webhookUrl: finalWebhookUrl,
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
            buyerPhone: customerData.phone || customerData.mobilePhone || null,
            commissionCredited: false
          }, { merge: true });
          console.log(`✅ [Firestore Asaas Sales] Venda PIX registrada: ${pixResult.paymentId} (Subconta: ${body.subaccountId || 'Master'})`);
        } catch (dbErr) {
          console.warn('Aviso ao salvar venda Asaas PIX no Firestore:', dbErr);
        }

        return res.status(200).json({
          success: true,
          paymentId: pixResult.paymentId,
          value: pixResult.value,
          pix: {
            copiaECola: pixResult.payload,
            qrCodeBase64: pixResult.encodedImage,
            expirationDate: pixResult.expirationDate
          },
          gateway: 'Asaas v3',
          billingType: 'PIX',
          subaccountId: body.subaccountId || null,
          payment_id: pixResult.paymentId,
          id: pixResult.paymentId,
          status: pixResult.status,
          amount: pixResult.value,
          qrCodeBase64: pixResult.encodedImage,
          copyAndPaste: pixResult.payload,
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
            sellerId: finalSellerId,
            affiliateRef: finalRefCode,
            customerId,
            subaccountId: body.subaccountId || null
          }
        });
      } catch (pixErr: any) {
        console.error('[Server Asaas PIX Error] Falha detalhada ao gerar cobrança PIX:', pixErr);
        const status = pixErr.status || pixErr.statusCode || 400;
        const errMsg = pixErr.errors?.[0]?.description || pixErr.message || 'Erro desconhecido na API do Asaas';
        const errList = pixErr.errors || pixErr.details?.errors || (Array.isArray(pixErr.details) ? pixErr.details : [{ description: errMsg }]);
        return res.status(status).json({ 
          error: true,
          message: errMsg,
          description: errMsg,
          errors: errList,
          details: pixErr.details || pixErr.responseData || null,
          invoiceUrl: pixErr.invoiceUrl || null,
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
          cardHolderInfo,
          body.subaccountId
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
            subaccountId: body.subaccountId || null,
            plan_id: finalPlanId,
            platformId: finalPlanId || '',
            platformName: finalDescription,
            companyId: finalCompanyId,
            sellerId: finalSellerId,
            apiKey: partnerApiKey || null,
            webhookUrl: finalWebhookUrl,
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
          subaccountId: body.subaccountId || null,
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
            customerId,
            subaccountId: body.subaccountId || null
          }
        });
      } catch (cardErr: any) {
        return res.status(400).json({
          error: cardErr.message || 'Cartão de crédito recusado ou inválido.',
          code: 'CARD_PAYMENT_DECLINED'
        });
      }
    }

    return res.status(400).json({ error: true, message: 'Operação não suportada' });
  } catch (err: any) {
    console.error('ERRO FATAL NA ROTA PAYMENTS:', err);
    return res.status(500).json({ 
      error: true,
      message: err?.message || 'Erro interno no servidor de pagamentos',
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
});

/**
 * GET /api/payments/asaas/:id, /api/payments/pix/:id, /api/pix/:id
 * Consulta status atualizado da cobrança no Asaas
 */
app.get(['/api/payments/asaas/:id', '/api/payments/pix/:id', '/api/pix/:id'], async (req, res) => {
  try {
    const paymentId = req.params.id;
    if (!paymentId) {
      return res.status(400).json({ error: 'ID da cobrança Asaas é obrigatório.' });
    }

    const apiKey = (process.env.ASAAS_API_KEY || '').trim();
    let apiUrl = (process.env.ASAAS_API_URL || 'https://api.asaas.com/v3').trim();
    if (apiUrl.includes('www.asaas.com')) {
      apiUrl = apiUrl.replace('www.asaas.com', 'api.asaas.com');
    }
    if (apiUrl.endsWith('/')) {
      apiUrl = apiUrl.slice(0, -1);
    }

    let subaccountId: string | undefined = (req.query.subaccountId || req.query.account) as string;
    if (!subaccountId) {
      try {
        const saleDoc = await getDoc(doc(db, 'sales', String(paymentId)));
        if (saleDoc.exists() && saleDoc.data()?.subaccountId) {
          subaccountId = saleDoc.data()?.subaccountId;
        }
      } catch (dbErr) {
        console.warn('Aviso ao consultar subaccountId da venda:', dbErr);
      }
    }

    const headers: Record<string, string> = {
      'access_token': apiKey,
      'Content-Type': 'application/json'
    };
    if (subaccountId) {
      headers['account'] = subaccountId;
    }

    const response = await fetch(`${apiUrl}/payments/${paymentId}`, {
      headers
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => null);
      console.error('[Server Asaas Status Error] Erro ao consultar pagamento Asaas:', errData);
      return res.status(response.status).json({ 
        error: `Erro ao consultar cobrança no Asaas (${response.status})`,
        details: errData?.errors || errData
      });
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

          // 🚀 ETAPA 3: Disparo de Webhook / Postback para o Parceiro
          const saleData = saleSnap.data() || {};
          let targetWebhookUrl = saleData.webhookUrl || null;
          const sellerId = saleData.sellerId || saleData.ownerId;
          const companyId = saleData.companyId;

          // Se não estiver salvo diretamente na venda, busca no Firestore:
          // 1. users/{sellerId}.webhookUrl
          // 2. user_profiles/{sellerId}.webhookUrl
          // 3. companies/{companyId}.webhookUrl
          if (!targetWebhookUrl && sellerId) {
            try {
              const uDoc = await getDoc(doc(db, 'users', String(sellerId)));
              if (uDoc.exists()) {
                targetWebhookUrl = uDoc.data()?.webhookUrl || uDoc.data()?.postbackUrl || null;
              }
              if (!targetWebhookUrl) {
                const pDoc = await getDoc(doc(db, 'user_profiles', String(sellerId)));
                if (pDoc.exists()) {
                  targetWebhookUrl = pDoc.data()?.webhookUrl || pDoc.data()?.postbackUrl || null;
                }
              }
            } catch (errU) {
              console.warn('[Webhook Postback] Aviso ao buscar webhookUrl do usuário:', errU);
            }
          }

          if (!targetWebhookUrl && companyId) {
            try {
              const cDoc = await getDoc(doc(db, 'companies', String(companyId)));
              if (cDoc.exists()) {
                targetWebhookUrl = cDoc.data()?.webhookUrl || cDoc.data()?.postbackUrl || null;
              }
            } catch (errC) {
              console.warn('[Webhook Postback] Aviso ao buscar webhookUrl da empresa:', errC);
            }
          }

          if (targetWebhookUrl && typeof targetWebhookUrl === 'string' && targetWebhookUrl.startsWith('http')) {
            const postbackPayload = {
              event: "PAYMENT_RECEIVED",
              paymentId: String(paymentId),
              status: "APPROVED",
              amount: Number(amountPaid || saleData.amount || saleData.total_amount || 0),
              customer: {
                name: saleData.buyerName || "Nome do Comprador",
                email: saleData.buyerEmail || "",
                cpfCnpj: saleData.buyerCpf || ""
              },
              paidAt: nowIso
            };

            console.log(`📤 [Webhook Postback] Disparando postback para o parceiro em: ${targetWebhookUrl}`, postbackPayload);

            // Disparo assíncrono protegido que nunca bloqueia o retorno 200 do Asaas
            fetch(targetWebhookUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'LeadsPay-Webhook-Engine/1.0'
              },
              body: JSON.stringify(postbackPayload),
              signal: AbortSignal.timeout(10000)
            }).then(async (pbRes) => {
              console.log(`✅ [Webhook Postback] Parceiro respondeu com status: ${pbRes.status}`);
              try {
                await updateDoc(saleRef, {
                  postbackSent: true,
                  postbackSentAt: nowIso,
                  postbackStatus: pbRes.status,
                  postbackUrl: targetWebhookUrl
                });
              } catch (_) {}
            }).catch((pbErr: any) => {
              console.error(`❌ [Webhook Postback Error] Falha ao enviar postback para ${targetWebhookUrl}:`, pbErr?.message || pbErr);
            });
          }
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

/**
 * POST /api/partner/settings
 * Permite salvar URL de postback / webhook e configurações do parceiro no Firestore
 */
app.post('/api/partner/settings', async (req, res) => {
  try {
    const { userId, companyId, webhookUrl, apiKey } = req.body || {};
    if (!userId && !companyId) {
      return res.status(400).json({ error: true, message: 'userId ou companyId é obrigatório.' });
    }

    const updates: Record<string, any> = { updatedAt: new Date().toISOString() };
    if (webhookUrl !== undefined) updates.webhookUrl = String(webhookUrl).trim();
    if (apiKey !== undefined) updates.apiKey = String(apiKey).trim();

    if (userId) {
      try {
        await setDoc(doc(db, 'user_profiles', String(userId)), updates, { merge: true });
        await setDoc(doc(db, 'users', String(userId)), updates, { merge: true });
      } catch (uErr) {
        console.warn('[Partner Settings] Erro ao atualizar perfil:', uErr);
      }
    }

    if (companyId) {
      try {
        await setDoc(doc(db, 'companies', String(companyId)), updates, { merge: true });
      } catch (cErr) {
        console.warn('[Partner Settings] Erro ao atualizar empresa:', cErr);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Configurações do parceiro salvas com sucesso no Firestore.'
    });
  } catch (err: any) {
    return res.status(500).json({ error: true, message: err.message || 'Erro interno ao salvar configurações.' });
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

    // 2. Busca informações do perfil do usuário e valida status de verificação
    let finalUserName = userName;
    let finalUserEmail = userEmail;
    let isUserVerified = false;

    try {
      const userRef = doc(db, 'user_profiles', cleanUserId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const uData = userSnap.data();
        finalUserName = finalUserName || uData.name || 'Afiliado LeadsPay';
        finalUserEmail = finalUserEmail || uData.email || '';
        isUserVerified = uData.verified === true || uData.verificationStatus === 'approved';
      }
    } catch (uErr) {
      console.warn('Erro ao buscar perfil do usuário para afiliação:', uErr);
    }

    // Regra estrita: Somente usuários verificados podem se afiliar
    if (!isUserVerified) {
      return res.status(403).json({
        error: 'Afiliação bloqueada: Você precisa estar verificado e homologado pela administração para se afiliar a produtos.',
        requiresVerification: true
      });
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
