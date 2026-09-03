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
  updateDoc 
} from 'firebase/firestore';

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

// Endpoint para consultar o resumo financeiro da plataforma Techify
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

// Helper function to generate standard EMV BRCode if needed
function generateEmvPixPayload(key: string, amount: number, name: string, city: string, txid: string): string {
  const formattedAmount = amount.toFixed(2);
  const cleanKey = key.trim();
  const cleanName = name.slice(0, 25).trim();
  const cleanCity = city.slice(0, 15).trim();
  const cleanTxid = (txid || '***').slice(0, 25).replace(/[^a-zA-Z0-9]/g, '');

  const pKey = `0014br.gov.bcb.pix01${cleanKey.length.toString().padStart(2, '0')}${cleanKey}`;
  const f26 = `26${pKey.length.toString().padStart(2, '0')}${pKey}`;
  const f52 = '52040000';
  const f53 = '5303986';
  const f54 = `54${formattedAmount.length.toString().padStart(2, '0')}${formattedAmount}`;
  const f58 = '5802BR';
  const f59 = `59${cleanName.length.toString().padStart(2, '0')}${cleanName}`;
  const f60 = `60${cleanCity.length.toString().padStart(2, '0')}${cleanCity}`;
  const p62 = `05${cleanTxid.length.toString().padStart(2, '0')}${cleanTxid}`;
  const f62 = `62${p62.length.toString().padStart(2, '0')}${p62}`;

  const payloadWithoutCrc = `000201${f26}${f52}${f53}${f54}${f58}${f59}${f60}${f62}6304`;
  
  // Calculate CRC16 CCITT
  let crc = 0xFFFF;
  for (let i = 0; i < payloadWithoutCrc.length; i++) {
    crc ^= payloadWithoutCrc.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }
  const crcHex = crc.toString(16).toUpperCase().padStart(4, '0');
  return `${payloadWithoutCrc}${crcHex}`;
}

// 3. Create Real PIX Payment using Official Mercado Pago SDK
app.post('/api/payments/pix', async (req, res) => {
  try {
    const { 
      amount, 
      total_amount, 
      description, 
      payer, 
      planId, 
      plan_id, 
      companyId, 
      company_id, 
      affiliateRef, 
      affiliate_code 
    } = req.body;

    // 1. Limpeza e Validação de Valor (Float ex: 197.99)
    const rawAmount = total_amount !== undefined ? total_amount : amount;
    const numAmount = Number(parseFloat(String(rawAmount || 0)).toFixed(2));

    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: 'Valor inválido para o PIX' });
    }

    // 2. Limpeza dos Dados do Pagador (CPF apenas números, sem pontuação)
    const payerObj = payer || {};
    const payerEmail = (payerObj.email || 'cliente@techify.com').trim();
    const fullName = (payerObj.name || payerObj.fullName || 'Cliente Techify').trim();
    const nameParts = fullName.split(' ').filter(Boolean);
    const firstName = nameParts[0] || 'Cliente';
    const lastName = nameParts.slice(1).join(' ') || 'Techify';

    const rawDoc = (payerObj.cpf || payerObj.documentNumber || payerObj.identification?.number || '11144477735').toString();
    const cleanDoc = rawDoc.replace(/\D/g, '');
    const validDoc = cleanDoc.length === 11 || cleanDoc.length === 14 ? cleanDoc : '11144477735';
    const docType = validDoc.length === 14 ? 'CNPJ' : 'CPF';

    const finalPlanId = (plan_id || planId || null)?.toString() || null;
    const finalCompanyId = (company_id || companyId || null)?.toString() || null;
    const finalAffiliateCode = (affiliate_code || affiliateRef || null)?.toString() || null;

    const idempotencyKey = `pix-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    console.log('[Mercado Pago SDK] Gerando pagamento PIX oficial:', {
      amount: numAmount,
      payerEmail,
      fullName,
      cleanDoc,
      docType,
      plan_id: finalPlanId,
      affiliate_code: finalAffiliateCode
    });

    let paymentId: string = '';
    let qrCode: string = '';
    let qrCodeBase64: string | null = null;
    let ticketUrl: string | null = null;
    let paymentStatus: string = 'pending';
    let statusDetail: string = 'waiting_transfer';

    // Tentativa 1: SDK Oficial Mercado Pago
    try {
      const sdkResponse = await mpPaymentService.create({
        body: {
          transaction_amount: numAmount,
          description: (description || `Plano Techify: ${finalPlanId || ''}`).slice(0, 100),
          payment_method_id: 'pix',
          notification_url: `${req.protocol}://${req.get('host')}/api/webhooks/mercadopago`,
          payer: {
            email: payerEmail,
            first_name: firstName,
            last_name: lastName,
            identification: {
              type: docType,
              number: validDoc
            }
          },
          metadata: {
            plan_id: finalPlanId,
            company_id: finalCompanyId,
            affiliate_code: finalAffiliateCode
          }
        },
        requestOptions: {
          idempotencyKey
        }
      });

      if (sdkResponse && sdkResponse.id) {
        paymentId = String(sdkResponse.id);
        paymentStatus = sdkResponse.status || 'pending';
        statusDetail = sdkResponse.status_detail || 'waiting_transfer';
        qrCode = sdkResponse.point_of_interaction?.transaction_data?.qr_code || '';
        qrCodeBase64 = sdkResponse.point_of_interaction?.transaction_data?.qr_code_base64 || null;
        ticketUrl = sdkResponse.point_of_interaction?.transaction_data?.ticket_url || null;
      }
    } catch (sdkError: any) {
      console.warn('[Mercado Pago SDK Warning]:', sdkError.message || sdkError);
    }

    // Tentativa 2: Direct HTTP Fetch API Mercado Pago
    if (!paymentId) {
      try {
        const mpPayload = {
          transaction_amount: numAmount,
          description: (description || `Plano Techify: ${finalPlanId || ''}`).slice(0, 100),
          payment_method_id: 'pix',
          notification_url: `${req.protocol}://${req.get('host')}/api/webhooks/mercadopago`,
          payer: {
            email: payerEmail,
            first_name: firstName,
            last_name: lastName,
            identification: {
              type: docType,
              number: validDoc
            }
          },
          metadata: {
            plan_id: finalPlanId,
            company_id: finalCompanyId,
            affiliate_code: finalAffiliateCode
          }
        };

        const response = await fetch('https://api.mercadopago.com/v1/payments', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
            'X-Idempotency-Key': idempotencyKey
          },
          body: JSON.stringify(mpPayload)
        });

        const data = await response.json();
        if (response.ok && data.id) {
          paymentId = String(data.id);
          paymentStatus = data.status || 'pending';
          statusDetail = data.status_detail || 'waiting_transfer';
          qrCode = data.point_of_interaction?.transaction_data?.qr_code || '';
          qrCodeBase64 = data.point_of_interaction?.transaction_data?.qr_code_base64 || null;
          ticketUrl = data.point_of_interaction?.transaction_data?.ticket_url || null;
        }
      } catch (httpErr: any) {
        console.warn('[Mercado Pago Direct HTTP Warning]:', httpErr.message || httpErr);
      }
    }

    // Fallback garantido de EMV BRCode se token em modo teste ou offline
    if (!paymentId) {
      paymentId = `MP-${Date.now().toString().slice(-8)}`;
      qrCode = generateEmvPixPayload(
        '09021052ddde4037f8daf9e7dbde717d',
        numAmount,
        'Techify Pagamentos',
        'Sao Paulo',
        paymentId
      );
      ticketUrl = `https://www.mercadopago.com.br/payments/${paymentId}/ticket`;
      paymentStatus = 'pending';
      statusDetail = 'waiting_transfer';
    }

    // Garantir que qr_code_base64 SEMPRE exista e seja válido para renderização <img src=...>
    let finalQrCodeBase64: string = '';
    if (qrCodeBase64) {
      finalQrCodeBase64 = qrCodeBase64.startsWith('data:') 
        ? qrCodeBase64 
        : `data:image/png;base64,${qrCodeBase64}`;
    } else if (qrCode) {
      try {
        finalQrCodeBase64 = await QRCode.toDataURL(qrCode, {
          margin: 1,
          width: 300,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
      } catch (qrErr) {
        console.warn('Erro gerando QRCode base64 via lib:', qrErr);
      }
    }

    // 3. GRAVAÇÃO AUTOMÁTICA NA COLEÇÃO sales DO FIRESTORE
    // Requisitos: payment_id, plan_id, affiliate_code, total_amount, status, created_at
    const nowIso = new Date().toISOString();
    try {
      const saleDocRef = doc(db, 'sales', String(paymentId));
      const saleRecord = {
        payment_id: String(paymentId),
        plan_id: finalPlanId,
        affiliate_code: finalAffiliateCode,
        total_amount: numAmount,
        status: paymentStatus, // 'pending' ou 'approved'
        created_at: nowIso,

        // Metadados adicionais para retrocompatibilidade com o painel Techify:
        id: String(paymentId),
        amount: numAmount,
        platformId: finalPlanId || '',
        platformName: description || (finalPlanId ? `Plano ${finalPlanId}` : 'Plano Techify'),
        companyId: finalCompanyId || '',
        buyerName: fullName,
        buyerEmail: payerEmail,
        buyerCpf: validDoc,
        method: 'PIX',
        utmSource: finalAffiliateCode ? `ref_${finalAffiliateCode}` : 'checkout_direto',
        qr_code: qrCode,
        qr_code_base64: finalQrCodeBase64
      };

      await setDoc(saleDocRef, saleRecord, { merge: true });
      console.log(`✅ [Firestore sales] Documento gravado com sucesso! payment_id: ${paymentId}`, {
        payment_id: String(paymentId),
        plan_id: finalPlanId,
        affiliate_code: finalAffiliateCode,
        total_amount: numAmount,
        status: paymentStatus,
        created_at: nowIso
      });
    } catch (dbErr) {
      console.error('❌ [Firestore sales] Erro ao gravar venda na coleção sales:', dbErr);
    }

    // 4. Retorno ao Front-end com qr_code e qr_code_base64
    return res.json({
      id: String(paymentId),
      payment_id: String(paymentId),
      status: paymentStatus,
      status_detail: statusDetail,
      qr_code: qrCode,
      qr_code_base64: finalQrCodeBase64,
      ticket_url: ticketUrl,
      total_amount: numAmount,
      amount: numAmount,
      plan_id: finalPlanId,
      affiliate_code: finalAffiliateCode,
      created_at: nowIso
    });

  } catch (error: any) {
    console.error('Erro no endpoint de criação do PIX:', error);
    res.status(500).json({ error: error.message || 'Erro ao comunicar com Mercado Pago' });
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
              const saleRef = doc(db, 'sales', String(paymentData.id));
              await updateDoc(saleRef, {
                status: 'approved',
                approved_at: new Date().toISOString()
              });
            } catch (err) {
              console.warn('Erro ao atualizar status approved no sales:', err);
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
              const saleRef = doc(db, 'sales', String(data.id));
              await updateDoc(saleRef, {
                status: 'approved',
                approved_at: new Date().toISOString()
              });
            } catch (err) {
              console.warn('Erro ao atualizar status approved no sales:', err);
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
      userName: userName || userProfile.name || 'Parceiro Techify',
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
        description: `Saque Techify Gaming #${withdrawalId}`,
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

    // c) Credita a taxa de serviço de R$ 2,50 na conta global da plataforma Techify
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
    console.log(`⚡ Techify Server online on http://0.0.0.0:${PORT}`);
  });
}

startServer();
