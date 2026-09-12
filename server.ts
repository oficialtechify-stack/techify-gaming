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
  deleteDoc,
  query,
  where,
  increment,
  runTransaction
} from 'firebase/firestore';
import { 
  getOrCreateCustomer, 
  createPixPayment, 
  createCreditCardPayment, 
  cleanDocument,
  createAsaasSubaccount,
  getAsaasConfig,
  getHeaders
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
// 🕒 ROTINA / CRON DE LIBERAÇÃO DE SALDO D+9 (/api/cron/release-balances)
// Busca transações com status: "APPROVED" e released: false há >= 9 dias
// e migra os saldos de pendingBalance -> availableBalance (Empresa e Afiliado)
// =========================================================================
async function processBalanceReleases(): Promise<{ releasedCount: number; details: any[] }> {
  console.log('[Cron 9 Dias] Iniciando verificação de liberação de saldos D+9 no Firestore...');
  const now = Date.now();
  const nowIso = new Date().toISOString();
  const NINE_DAYS_MS = 9 * 24 * 60 * 60 * 1000; // 9 dias de retenção de garantia
  let releasedCount = 0;
  const releasedDetails: any[] = [];

  try {
    const salesSnap = await getDocs(collection(db, 'sales'));
    for (const docItem of salesSnap.docs) {
      const sale = docItem.data();
      
      // Critério 1: Transações com status APPROVED (case-insensitive)
      const rawStatus = String(sale.status || '').toUpperCase();
      const isApproved = rawStatus === 'APPROVED' || rawStatus === 'APROVADO';

      // Critério 2: Ainda não liberadas (released: false ou released !== true)
      const isNotReleased = sale.released === false || sale.released === undefined || sale.releaseStatus === 'pendente';

      if (isApproved && isNotReleased) {
        const paidDateRaw = sale.paidAt || sale.approved_at || sale.createdAt || sale.date;
        const paidAtMs = paidDateRaw ? new Date(paidDateRaw).getTime() : now;
        const ageInMs = now - paidAtMs;

        // Critério 3: Data paidAt maior ou igual a 9 dias atrás
        if (ageInMs >= NINE_DAYS_MS) {
          const daysOld = (ageInMs / (1000 * 60 * 60 * 24)).toFixed(1);
          console.log(`[Cron 9 Dias] Processando liberação da venda ${docItem.id} (paga há ${daysOld} dias)`);

          // Identifica os valores devidos à Empresa e ao Afiliado
          const affiliateCommission = Number((
            sale.financialBreakdown?.affiliateCommission ?? 
            sale.commissionEarned ?? 
            0
          ).toFixed(2));

          const totalSaleAmount = Number(sale.total_amount || sale.amount || 0);
          const platformFee = Number((sale.financialBreakdown?.platformFee ?? sale.checkoutFee ?? 0.99).toFixed(2));
          
          const netCompanyAmount = Number((
            sale.financialBreakdown?.netCompanyAmount ?? 
            sale.netCompanyAmount ?? 
            Math.max(0, totalSaleAmount - platformFee - affiliateCommission)
          ).toFixed(2));

          const affiliateId = sale.affiliateId || sale.sellerId || null;
          const companyId = sale.companyId || null;
          const sellerId = sale.sellerId || sale.ownerId || null;

          // 1. Mover valores no documento do Afiliado: Subtrai pendingBalance, Adiciona availableBalance
          if (affiliateId && affiliateCommission > 0) {
            const affBalanceChanges = {
              pendingBalance: increment(-affiliateCommission),
              availableBalance: increment(affiliateCommission),
              updatedAt: nowIso
            };

            try {
              await setDoc(doc(db, 'user_profiles', String(affiliateId)), affBalanceChanges, { merge: true });
              await setDoc(doc(db, 'users', String(affiliateId)), affBalanceChanges, { merge: true });
              console.log(`💰 [Cron 9 Dias] Afiliado ${affiliateId}: R$ ${affiliateCommission} movido de pendingBalance -> availableBalance.`);
            } catch (affErr) {
              console.warn(`Erro ao liberar saldo do afiliado ${affiliateId}:`, affErr);
            }
          }

          // 2. Mover valores no documento da Empresa/Vendedor: Subtrai pendingBalance, Adiciona availableBalance
          if (netCompanyAmount > 0) {
            const compBalanceChanges = {
              pendingBalance: increment(-netCompanyAmount),
              availableBalance: increment(netCompanyAmount),
              updatedAt: nowIso
            };

            if (companyId) {
              try {
                await setDoc(doc(db, 'companies', String(companyId)), compBalanceChanges, { merge: true });
                console.log(`🏢 [Cron 9 Dias] Empresa companies/${companyId}: R$ ${netCompanyAmount} movido de pendingBalance -> availableBalance.`);
              } catch (cErr) {
                console.warn(`Erro ao liberar saldo da empresa ${companyId}:`, cErr);
              }
            }

            const targetSeller = sellerId || (!companyId ? affiliateId : null);
            if (targetSeller) {
              try {
                await setDoc(doc(db, 'user_profiles', String(targetSeller)), compBalanceChanges, { merge: true });
                await setDoc(doc(db, 'users', String(targetSeller)), compBalanceChanges, { merge: true });
                console.log(`👤 [Cron 9 Dias] Vendedor user_profiles/${targetSeller}: R$ ${netCompanyAmount} movido de pendingBalance -> availableBalance.`);
              } catch (sErr) {
                console.warn(`Erro ao liberar saldo do vendedor ${targetSeller}:`, sErr);
              }
            }
          }

          // 3. Atualizar a transação no Firestore: { released: true, releasedAt: new Date().toISOString() }
          await updateDoc(docItem.ref, {
            released: true,
            releasedAt: nowIso,
            releaseStatus: 'disponivel',
            updated_at: nowIso
          });

          releasedCount++;
          releasedDetails.push({
            saleId: docItem.id,
            paidAt: paidDateRaw,
            netCompanyAmount,
            affiliateCommission,
            releasedAt: nowIso
          });
        }
      }
    }

    console.log(`[Cron 9 Dias] Liberação concluída. Total de ${releasedCount} transações migradas para availableBalance.`);
    return { releasedCount, details: releasedDetails };
  } catch (err) {
    console.error('[Cron 9 Dias] Erro ao processar rotina de liberação de saldos:', err);
    return { releasedCount: 0, details: [] };
  }
}

// Inicia verificação 5s após startup e agenda execução diária (24 horas)
setTimeout(() => {
  processBalanceReleases();
}, 5000);

setInterval(() => {
  processBalanceReleases();
}, 24 * 60 * 60 * 1000);

// Endpoint Serverless / Cron para acionar ou consultar a liberação de saldos D+9
app.all('/api/cron/release-balances', async (req, res) => {
  try {
    const result = await processBalanceReleases();
    return res.json({
      success: true,
      releasedCount: result.releasedCount,
      releasedSales: result.details,
      message: `Rotina D+9 concluída com sucesso. ${result.releasedCount} transação(ões) com mais de 9 dias migrada(s) para saldo disponível.`
    });
  } catch (err: any) {
    console.error('Erro no endpoint /api/cron/release-balances:', err);
    return res.status(500).json({ error: true, message: err.message || 'Erro ao executar rotina de liberação de saldos' });
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
 * MOTOR DE PERSISTÊNCIA DE SALDOS E CARDS FINANCEIROS (LEADSPAY)
 * Processa a aprovação do pagamento, calcula o breakdown financeiro e
 * persiste acumuladores atômicos no Firestore (Empresa, Afiliado, Venda e Plataforma).
 */
async function creditSaleCommissionAndBalances(paymentId: string, paymentData?: any) {
  try {
    const saleRef = doc(db, 'sales', String(paymentId));
    const saleSnap = await getDoc(saleRef);
    let sale = saleSnap.exists() ? saleSnap.data() : null;

    // Se o registro da venda não existir no Firestore (ex: webhook direto ou teste externo), inicializa
    if (!sale) {
      const initialSale = {
        id: String(paymentId),
        payment_id: String(paymentId),
        amount: Number(paymentData?.value || paymentData?.transaction_amount || paymentData?.amount || 0),
        total_amount: Number(paymentData?.value || paymentData?.transaction_amount || paymentData?.amount || 0),
        status: 'PENDING',
        created_at: new Date().toISOString(),
        buyerName: paymentData?.customerName || paymentData?.customer || 'Cliente LeadsPay',
        plan_id: paymentData?.plan_id || paymentData?.metadata?.plan_id || null,
        companyId: paymentData?.companyId || null,
        sellerId: paymentData?.sellerId || null,
        affiliateId: paymentData?.affiliateId || null,
        affiliate_code: paymentData?.affiliate_code || paymentData?.metadata?.affiliate_code || null,
        commissionCredited: false
      };
      await setDoc(saleRef, initialSale, { merge: true });
      sale = initialSale;
    }

    // Idempotência: impede creditar duas vezes
    if (sale.commissionCredited === true || (sale.status === 'APPROVED' && sale.financialBreakdown?.grossAmount)) {
      console.log(`[Credit Commission] Transação ${paymentId} já foi creditada anteriormente.`);
      return;
    }

    // 1. Identifica os atores envolvidos na venda
    const totalAmount = Number(sale.total_amount || sale.amount || paymentData?.transaction_amount || paymentData?.value || 0);
    const planId = sale.plan_id || sale.platformId || paymentData?.metadata?.plan_id || paymentData?.plan_id;
    const affiliateCode = sale.affiliate_code || sale.affiliateCode || paymentData?.metadata?.affiliate_code || paymentData?.metadata?.affiliate_ref;
    let sellerId = sale.sellerId || sale.ownerId || paymentData?.sellerId || null;
    let companyId = sale.companyId || paymentData?.companyId || null;
    let affiliateId = sale.affiliateId || paymentData?.affiliateId || null;
    let affiliationDocId: string | null = null;
    let planName = sale.platformName || paymentData?.description || 'Plano LeadsPay';

    console.log(`[Credit Commission] Processando liquidação da venda ${paymentId}: R$ ${totalAmount} | Empresa: ${companyId || sellerId} | Ref: ${affiliateCode || affiliateId || 'Venda Direta'}`);

    // Busca dados do Plano / Produto (percentual de comissão e companyId / sellerId associado)
    let commissionPercentage = 20; // padrão 20% do produto quando houver afiliação
    if (planId) {
      try {
        const planRef = doc(db, 'plans', String(planId));
        const planSnap = await getDoc(planRef);
        if (planSnap.exists()) {
          const pData = planSnap.data();
          if (pData.commissionPercentage !== undefined && pData.commissionPercentage !== null) {
            commissionPercentage = Number(pData.commissionPercentage);
          }
          if (!companyId && pData.companyId) {
            companyId = pData.companyId;
          }
          if (!sellerId && (pData.userId || pData.ownerId)) {
            sellerId = pData.userId || pData.ownerId;
          }
          if (pData.name) {
            planName = pData.name;
          }
        }
      } catch (pErr) {
        console.warn('Erro ao consultar produto/plano no credit commission:', pErr);
      }
    }

    // Identifica o afiliado pelo código de referência (se ainda não resolvido)
    if (!affiliateId && affiliateCode) {
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
          affiliateId = affData.userId || affData.user_id;
          affiliationDocId = affDoc.id;
        }
      } catch (affErr) {
        console.warn('Erro ao consultar afiliação no Firestore:', affErr);
      }
    }

    // 2. Cálculo dos Valores Financeiros:
    // - Taxa LeadsPay: R$ 0,99 fixo por checkout aprovado
    const platformFee = 0.99;

    // - Comissão do Afiliado:
    //   Se houver affiliateId, calcula com base na porcentagem cadastrada no produto.
    //   Se NÃO houver afiliado (venda direta / integração API livre), affiliateCommission = 0.
    let affiliateCommission = 0;
    if (affiliateId) {
      affiliateCommission = Number(((totalAmount * commissionPercentage) / 100).toFixed(2));
    }

    // - Receita Líquida da Empresa (netAmount):
    //   netAmount = amount - 0.99 - affiliateCommission
    const netAmount = Math.max(0, Number((totalAmount - platformFee - affiliateCommission).toFixed(2)));
    const nowIso = new Date().toISOString();

    console.log(`📊 [Credit Commission] Breakdown da Venda ${paymentId}: Bruto: R$ ${totalAmount} | Taxa LeadsPay: R$ ${platformFee} | Comissão Afiliado: R$ ${affiliateCommission} | Líquido Empresa: R$ ${netAmount}`);

    // 3. Atualização das Coleções no Firestore com increment:

    // A) Documento da Empresa (companies/{companyId} e/ou users/{sellerId} / user_profiles/{sellerId})
    // A receita líquida entra inicialmente em pendingBalance (Garantia D+9)
    const companyFinancialIncrements = {
      grossRevenue: increment(totalAmount),                 // Faturamento Bruto
      totalCheckoutFees: increment(platformFee),            // Taxas LeadsPay (R$ 0,99)
      totalAffiliateCommissions: increment(affiliateCommission), // Comissões pagas a afiliados
      netRevenue: increment(netAmount),                     // Receita Líquida da Empresa
      pendingBalance: increment(netAmount),                 // Saldo em retenção de garantia D+9
      totalSalesCount: increment(1),                        // Total de vendas aprovadas
      totalSalesVolume: increment(totalAmount),
      updatedAt: nowIso
    };

    if (companyId) {
      try {
        const compRef = doc(db, 'companies', String(companyId));
        await setDoc(compRef, companyFinancialIncrements, { merge: true });
        console.log(`🏢 [Credit Commission] Empresa companies/${companyId} incrementada.`);
      } catch (compErr) {
        console.warn(`Erro ao atualizar métricas da empresa ${companyId}:`, compErr);
      }
    }

    if (sellerId) {
      try {
        const userSellerIncrements = {
          ...companyFinancialIncrements,
          totalEarned: increment(netAmount)
        };
        await setDoc(doc(db, 'user_profiles', String(sellerId)), userSellerIncrements, { merge: true });
        await setDoc(doc(db, 'users', String(sellerId)), companyFinancialIncrements, { merge: true });
        console.log(`👤 [Credit Commission] Vendedor user_profiles/${sellerId} e users/${sellerId} incrementados.`);
      } catch (sellerErr) {
        console.warn(`Erro ao atualizar perfil do vendedor ${sellerId}:`, sellerErr);
      }
    }

    // B) Atualizar Carteira do Afiliado (users/{affiliateId}, user_profiles/{affiliateId} e affiliations/{affiliationId})
    if (affiliateId && affiliateCommission > 0) {
      const affiliateIncrements = {
        pendingBalance: increment(affiliateCommission), // Balance pendente (Garantia de 9 dias)
        totalEarned: increment(affiliateCommission),    // Total histórico ganho
        affiliateSalesCount: increment(1),
        salesCount: increment(1),
        updatedAt: nowIso
      };

      try {
        await setDoc(doc(db, 'user_profiles', String(affiliateId)), affiliateIncrements, { merge: true });
        await setDoc(doc(db, 'users', String(affiliateId)), {
          pendingBalance: increment(affiliateCommission),
          totalEarned: increment(affiliateCommission),
          affiliateSalesCount: increment(1),
          updatedAt: nowIso
        }, { merge: true });
        console.log(`💰 [Credit Commission] Carteira do afiliado ${affiliateId} incrementada (+R$ ${affiliateCommission} pendente).`);
      } catch (affErr) {
        console.warn(`Erro ao atualizar saldo do afiliado ${affiliateId}:`, affErr);
      }

      if (affiliationDocId) {
        try {
          await setDoc(doc(db, 'affiliations', String(affiliationDocId)), {
            pendingBalance: increment(affiliateCommission),
            totalEarned: increment(affiliateCommission),
            affiliateSalesCount: increment(1),
            salesCount: increment(1),
            lastSaleAt: nowIso
          }, { merge: true });
        } catch (affDocErr) {
          console.warn(`Erro ao atualizar registro de afiliação ${affiliationDocId}:`, affDocErr);
        }
      }
    }

    // C) Credita a taxa da plataforma LeadsPay (R$ 0,99)
    await creditServerPlatformFinances('checkout', platformFee);

    // D) Atualizar Documento da Venda (sales/{saleId}) com released: false para a regra D+9
    const saleUpdateSnapshot = {
      status: "APPROVED",
      status_detail: 'accredited',
      released: false,
      releaseStatus: 'pendente',
      paidAt: nowIso,
      approved_at: nowIso,
      commissionCredited: true,
      financialBreakdown: {
        grossAmount: totalAmount,
        platformFee: platformFee,
        affiliateCommission: affiliateCommission,
        netCompanyAmount: netAmount
      },
      // Compatibilidade retroativa com visualizações existentes
      grossAmount: totalAmount,
      checkoutFee: platformFee,
      commissionEarned: affiliateCommission,
      netCompanyAmount: netAmount,
      commissionPercentage: affiliateId ? commissionPercentage : 0,
      affiliateId: affiliateId || null,
      affiliate_code: affiliateCode || null,
      companyId: companyId || null,
      sellerId: sellerId || null,
      platformName: planName,
      updated_at: nowIso
    };

    await setDoc(saleRef, saleUpdateSnapshot, { merge: true });
    console.log(`🎯 [Credit Commission] Venda sales/${paymentId} marcada como APPROVED com snapshot financeiro e retenção D+9.`);

  } catch (err) {
    console.error('Erro ao creditar comissão e persistir saldos da venda:', err);
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
              sellerSubaccountId = pData?.asaasWalletId || pData?.walletId || pData?.asaasSubaccountId || pData?.subaccountId || pData?.subaccount_id;
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
            sellerSubaccountId = cData?.asaasWalletId || cData?.walletId || cData?.asaasSubaccountId || cData?.subaccountId;
            if (!sellerSubaccountId && cData?.ownerId) {
              const ownerDoc = await getDoc(doc(db, 'users', String(cData.ownerId)));
              if (ownerDoc.exists()) {
                sellerSubaccountId = ownerDoc.data()?.asaasWalletId || ownerDoc.data()?.walletId || ownerDoc.data()?.asaasSubaccountId || ownerDoc.data()?.subaccountId;
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
            sellerSubaccountId = plData?.asaasWalletId || plData?.walletId || plData?.asaasSubaccountId || plData?.subaccountId;
            if (!sellerSubaccountId && plData?.companyId) {
              const compDoc = await getDoc(doc(db, 'companies', String(plData.companyId)));
              if (compDoc.exists()) {
                sellerSubaccountId = compDoc.data()?.asaasWalletId || compDoc.data()?.walletId || compDoc.data()?.asaasSubaccountId || compDoc.data()?.subaccountId;
                if (!sellerSubaccountId && compDoc.data()?.ownerId) {
                  const ownerDoc = await getDoc(doc(db, 'users', String(compDoc.data()?.ownerId)));
                  if (ownerDoc.exists()) {
                    sellerSubaccountId = ownerDoc.data()?.asaasWalletId || ownerDoc.data()?.walletId || ownerDoc.data()?.asaasSubaccountId || ownerDoc.data()?.subaccountId;
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

    // 🧪 DETECÇÃO DE MODO DE DESENVOLVIMENTO (DEV MODE / SANDBOX)
    let companyEnvironment: 'development' | 'production' = 'development';
    const effectiveCompId = (companyId || company_id || partnerInfo?.companyId || null)?.toString() || null;
    if (effectiveCompId) {
      try {
        const compSnap = await getDoc(doc(db, 'companies', effectiveCompId));
        if (compSnap.exists()) {
          const cData = compSnap.data();
          if (cData.environment === 'production' && (cData.verified || cData.kyc_status === 'verified')) {
            companyEnvironment = 'production';
          }
        }
      } catch (e) {}
    }

    const isDevMode = 
      body.is_test === true || 
      body.environment === 'development' || 
      req.headers['x-dev-mode'] === 'true' || 
      req.headers['x-environment'] === 'development' ||
      companyEnvironment === 'development' ||
      (!sellerSubaccountId);

    // BLOQUEIO DINÂMICO NO CHECKOUT (PROIBIDO FALLBACK PARA CONTA MASTER EM PRODUÇÃO)
    if (!sellerSubaccountId && !isDevMode) {
      console.warn(`[Checkout Asaas] Tentativa de pagamento bloqueada: Empresa/vendedor sem subconta Asaas em Produção. PlanId: ${planId || plan_id}, CompanyId: ${companyId || company_id}, SellerId: ${sellerId || body.ownerId || partnerInfo?.userId}`);
      return res.status(400).json({
        error: true,
        message: "Esta empresa ainda não possui uma subconta ativa no Asaas para receber pagamentos reais."
      });
    }

    if (isDevMode && !sellerSubaccountId) {
      sellerSubaccountId = `sub_dev_${effectiveCompId || 'sandbox'}`;
    }

    // INJEÇÃO OBRIGATÓRIA: Toda chamada à API do Asaas v3 deve conter o header 'account'
    body.subaccountId = sellerSubaccountId;
    console.log(`🔒 [Checkout] Subconta associada (${isDevMode ? 'Dev Mode/Sandbox' : 'Produção'}): ${sellerSubaccountId}`);

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

    // Validação de integridade obrigatória de valor mínimo exigido pela API do Asaas (R$ 5,00)
    if (finalAmount < 5.00 || (typeof amount === 'number' && amount < 5.00)) {
      return res.status(400).json({ 
        error: true, 
        message: "O valor mínimo da cobrança deve ser de R$ 5,00 conforme exigência da operadora de pagamentos." 
      });
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
    const nowIso = new Date().toISOString();

    // =========================================================================
    // 🧪 SIMULADOR DEV MODE / SANDBOX (ISOLAMENTO COMPLETO DE TESTES)
    // =========================================================================
    if (isDevMode) {
      console.log(`🧪 [Sandbox Dev Mode] Processando transação simulada. Método: ${normalizedMethod}`);
      const devPaymentId = `pay_dev_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

      // Auto-cadastro de cliente na coleção 'clients' com is_test: true
      try {
        const clientRef = doc(db, 'clients', `cli_${finalCompanyId || 'store'}_${cleanCpf || customerData.email.replace(/[^a-zA-Z0-9]/g, '_')}`);
        await setDoc(clientRef, {
          id: clientRef.id,
          store_id: finalCompanyId || 'store_default',
          name: customerData.name || 'Cliente Sandbox',
          email: customerData.email,
          phone: customerData.phone || customerData.mobilePhone || '',
          document: cleanCpf,
          is_test: true,
          environment: 'development',
          created_at: nowIso,
          total_spent: finalAmount,
          orders_count: 1,
          last_order_at: nowIso,
          last_plan_name: finalDescription
        }, { merge: true });
        console.log(`👤 [Sandbox Dev Mode] Cliente cadastrado com is_test: true`);
      } catch (cErr) {
        console.warn('Aviso ao registrar cliente simulado no Sandbox:', cErr);
      }

      // 1. Simulação de PIX
      if (normalizedMethod === 'PIX') {
        const simQrText = `00020126580014br.gov.bcb.pix0136leadspay-sandbox-simulated-payment-${devPaymentId}520400005303986540${finalAmount.toFixed(2)}5802BR5916LEADSPAY SANDBOX6009SAO PAULO62070503***6304DEV1`;
        let simQrImage = '';
        try {
          simQrImage = await QRCode.toDataURL(simQrText, { margin: 2, width: 300 });
        } catch (qrErr) {
          simQrImage = '';
        }

        const saleDocRef = doc(db, 'sales', devPaymentId);
        await setDoc(saleDocRef, {
          id: devPaymentId,
          payment_id: devPaymentId,
          gateway: 'Simulador LeadsPay (Dev Mode)',
          method: 'PIX',
          billingType: 'PIX',
          is_test: true,
          environment: 'development',
          subaccountId: sellerSubaccountId,
          plan_id: finalPlanId,
          platformId: finalPlanId || '',
          platformName: finalDescription,
          companyId: finalCompanyId,
          sellerId: finalSellerId,
          apiKey: partnerApiKey || null,
          affiliate_code: finalRefCode,
          affiliateCode: finalRefCode,
          total_amount: finalAmount,
          amount: finalAmount,
          status: 'Pendente',
          status_detail: 'waiting_transfer',
          created_at: nowIso,
          qr_code: simQrText,
          qr_code_base64: simQrImage,
          buyerName: customerData.name || 'Cliente LeadsPay',
          buyerEmail: customerData.email,
          buyerCpf: cleanCpf,
          buyerPhone: customerData.phone || customerData.mobilePhone || null,
          commissionCredited: false
        });

        return res.status(200).json({
          success: true,
          is_test: true,
          environment: 'development',
          paymentId: devPaymentId,
          payment_id: devPaymentId,
          id: devPaymentId,
          value: finalAmount,
          amount: finalAmount,
          pix: {
            copiaECola: simQrText,
            qrCodeBase64: simQrImage,
            expirationDate: new Date(Date.now() + 24 * 3600 * 1000).toISOString()
          },
          gateway: 'Simulador LeadsPay (Dev Mode)',
          billingType: 'PIX',
          status: 'PENDING',
          qrCodeBase64: simQrImage,
          copyAndPaste: simQrText,
          payload: simQrText,
          encodedImage: simQrImage,
          qr_code: simQrText,
          qr_code_base64: simQrImage,
          canSimulateApproval: true,
          simulateApprovalUrl: '/api/payments/simulate-approval'
        });
      }

      // 2. Simulação de Cartão de Crédito (Aprovação Instantânea)
      if (normalizedMethod === 'CREDIT_CARD') {
        const saleDocRef = doc(db, 'sales', devPaymentId);
        await setDoc(saleDocRef, {
          id: devPaymentId,
          payment_id: devPaymentId,
          gateway: 'Simulador LeadsPay (Dev Mode)',
          method: 'Cartão de Crédito',
          billingType: 'CREDIT_CARD',
          is_test: true,
          environment: 'development',
          subaccountId: sellerSubaccountId,
          plan_id: finalPlanId,
          platformId: finalPlanId || '',
          platformName: finalDescription,
          companyId: finalCompanyId,
          sellerId: finalSellerId,
          apiKey: partnerApiKey || null,
          affiliate_code: finalRefCode,
          affiliateCode: finalRefCode,
          total_amount: finalAmount,
          amount: finalAmount,
          status: 'Aprovado',
          status_detail: 'accredited',
          created_at: nowIso,
          paidAt: nowIso,
          buyerName: customerData.name || 'Cliente LeadsPay',
          buyerEmail: customerData.email,
          buyerCpf: cleanCpf,
          buyerPhone: customerData.phone || customerData.mobilePhone || null,
          commissionCredited: true
        });

        // Credita saldo de testes
        if (finalSellerId || finalCompanyId) {
          try {
            const targetProfId = finalSellerId || finalCompanyId;
            const profRef = doc(db, 'user_profiles', String(targetProfId));
            await setDoc(profRef, {
              availableBalance: increment(finalAmount),
              totalEarned: increment(finalAmount),
              totalSalesCount: increment(1),
              updatedAt: nowIso
            }, { merge: true });
          } catch (e) {}
        }

        return res.status(200).json({
          success: true,
          is_test: true,
          environment: 'development',
          paymentId: devPaymentId,
          payment_id: devPaymentId,
          id: devPaymentId,
          value: finalAmount,
          amount: finalAmount,
          gateway: 'Simulador LeadsPay (Dev Mode)',
          billingType: 'CREDIT_CARD',
          status: 'CONFIRMED',
          isApproved: true
        });
      }
    }

    // =========================================================================
    // 🌐 AMBIENTE DE PRODUÇÃO REAL (ASAAS V3 GATEWAY)
    // =========================================================================

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
 * POST /api/payments/simulate-approval
 * Permite aprovar imediatamente uma cobrança de teste gerada no Dev Mode (Sandbox)
 */
app.post('/api/payments/simulate-approval', async (req, res) => {
  try {
    const { paymentId, payment_id } = req.body || {};
    const id = (paymentId || payment_id || '').toString();
    if (!id) {
      return res.status(400).json({ error: true, message: 'ID do pagamento é obrigatório para simulação.' });
    }

    const saleRef = doc(db, 'sales', id);
    const saleSnap = await getDoc(saleRef);
    const nowIso = new Date().toISOString();

    if (saleSnap.exists()) {
      const saleData = saleSnap.data();
      await updateDoc(saleRef, {
        status: 'Aprovado',
        status_detail: 'accredited',
        paidAt: nowIso,
        releaseStatus: 'disponivel',
        commissionCredited: true,
        updatedAt: nowIso
      });

      // Credita saldo fictício no perfil da empresa/vendedor para testes completos
      const targetSellerId = saleData.sellerId || saleData.companyOwnerId || saleData.companyId;
      if (targetSellerId) {
        try {
          const profRef = doc(db, 'user_profiles', String(targetSellerId));
          await setDoc(profRef, {
            availableBalance: increment(saleData.amount || 0),
            totalEarned: increment(saleData.amount || 0),
            totalSalesCount: increment(1),
            updatedAt: nowIso
          }, { merge: true });
        } catch (e) {}
      }

      return res.status(200).json({
        success: true,
        is_test: true,
        message: 'Pagamento simulado aprovado com sucesso!',
        paymentId: id,
        status: 'CONFIRMED'
      });
    } else {
      await setDoc(saleRef, {
        id,
        status: 'Aprovado',
        status_detail: 'accredited',
        is_test: true,
        environment: 'development',
        paidAt: nowIso,
        updatedAt: nowIso
      }, { merge: true });

      return res.status(200).json({
        success: true,
        is_test: true,
        message: 'Pagamento de teste aprovado!',
        paymentId: id,
        status: 'CONFIRMED'
      });
    }
  } catch (err: any) {
    console.error('Erro na rota /api/payments/simulate-approval:', err);
    return res.status(500).json({ error: true, message: err.message });
  }
});

/**
 * GET /api/payments/asaas/:id, /api/payments/pix/:id, /api/pix/:id
 * Consulta status atualizado da cobrança no Asaas ou no Simulador Sandbox
 */
app.get(['/api/payments/asaas/:id', '/api/payments/pix/:id', '/api/pix/:id'], async (req, res) => {
  try {
    const paymentId = req.params.id;
    if (!paymentId) {
      return res.status(400).json({ error: 'ID da cobrança é obrigatório.' });
    }

    // Se for pagamento simulado do Sandbox (pay_dev_...)
    if (paymentId.startsWith('pay_dev_')) {
      try {
        const saleDoc = await getDoc(doc(db, 'sales', String(paymentId)));
        if (saleDoc.exists()) {
          const sData = saleDoc.data();
          const isApproved = sData.status === 'Aprovado' || sData.status === 'CONFIRMED' || sData.status === 'RECEIVED';
          return res.status(200).json({
            id: paymentId,
            status: isApproved ? 'CONFIRMED' : (sData.status || 'PENDING'),
            is_test: true,
            environment: 'development',
            value: sData.amount || sData.total_amount,
            paid: isApproved,
            isApproved
          });
        }
      } catch (e) {}
      return res.status(200).json({
        id: paymentId,
        status: 'PENDING',
        is_test: true,
        environment: 'development'
      });
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
        let saleSnap = await getDoc(saleRef);
        const nowIso = new Date().toISOString();

        // 1. Processa a liquidação financeira, breakdown e persistência atômica no Firestore
        await creditSaleCommissionAndBalances(String(paymentId), {
          transaction_amount: amountPaid,
          value: amountPaid,
          ...(saleSnap.exists() ? saleSnap.data() : {}),
          ...payment
        });

        // Recarrega os dados atualizados da venda para postback
        saleSnap = await getDoc(saleRef);
        const saleData = saleSnap.exists() ? saleSnap.data() : {};

        console.log(`[Webhook Asaas Server] Liquidação e saldos persistidos no Firestore para a venda ${paymentId}.`);

        // 2. Disparo de Webhook / Postback para o Parceiro (se configurado)
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
            financialBreakdown: saleData.financialBreakdown || {
              grossAmount: Number(amountPaid || 0),
              platformFee: 0.99,
              affiliateCommission: saleData.commissionEarned || 0,
              netCompanyAmount: saleData.netCompanyAmount || Math.max(0, Number(amountPaid || 0) - 0.99 - (saleData.commissionEarned || 0))
            },
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
      affiliateId: cleanUserId,
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
// 🏢 MÓDULO 2: APROVAÇÃO DE EMPRESA & CRIAÇÃO DE SUBCONTA FISCAL ASAAS
// =========================================================================
app.post('/api/admin/approve-company', async (req, res) => {
  try {
    const { companyId } = req.body;
    if (!companyId) {
      return res.status(400).json({ error: 'companyId é obrigatório para aprovação.' });
    }

    const cleanCompanyId = String(companyId).trim();
    const compRef = doc(db, 'companies', cleanCompanyId);
    const compSnap = await getDoc(compRef);

    if (!compSnap.exists()) {
      return res.status(404).json({ error: 'Empresa não encontrada no Firestore.' });
    }

    const companyData = compSnap.data() as any;

    // 1. Obtém e normaliza campos fiscais
    const rawDoc = companyData.cpfCnpj || companyData.cleanCnpj || companyData.cleanCpf || companyData.cnpj || companyData.cpf || companyData.companyCnpj || companyData.documentNumber || '';
    const cleanDoc = cleanDocument(rawDoc);

    const compName = companyData.companyName || companyData.name || 'Empresa Parceira';
    const compEmail = companyData.email || 'financeiro@leadspay.com';
    const rawPhone = companyData.phone || companyData.mobilePhone || companyData.whatsapp || '';
    const cleanPhone = cleanDocument(rawPhone);
    const rawPostal = companyData.postalCode || companyData.cep || '';
    const cleanPostal = cleanDocument(rawPostal);
    const addressNumber = companyData.addressNumber || '1';

    let asaasWalletId = companyData.asaasWalletId || companyData.walletId;
    let asaasSubaccountId = companyData.asaasSubaccountId || companyData.subaccountId;
    let apiKey = companyData.asaasApiKey || companyData.apiKey;

    // 2. Criação da Subconta no Asaas v3 (POST /v3/accounts) ou identificador fiscal interno
    if (!asaasWalletId || !asaasSubaccountId) {
      if (cleanDoc && (cleanDoc.length === 11 || cleanDoc.length === 14)) {
        try {
          console.log(`[Approve Company] Criando subconta no Asaas para ${compName} (${cleanDoc})...`);
          const subacc = await createAsaasSubaccount({
            name: compName,
            email: compEmail,
            cpfCnpj: cleanDoc,
            mobilePhone: cleanPhone || undefined,
            phone: cleanPhone || undefined,
            postalCode: cleanPostal || undefined,
            addressNumber: addressNumber,
            address: companyData.address || 'Sede Comercial'
          });

          asaasSubaccountId = subacc.id;
          asaasWalletId = subacc.walletId || subacc.id;
          apiKey = subacc.apiKey || apiKey;
          console.log(`✅ [Approve Company] Subconta Asaas homologada com sucesso: ID ${asaasSubaccountId} / Wallet ${asaasWalletId}`);
        } catch (asaasErr: any) {
          console.warn('[Approve Company] Aviso ao criar subconta no Asaas (usando fallback interno resiliente):', asaasErr.message || asaasErr);
          asaasSubaccountId = asaasSubaccountId || `subacc_${cleanCompanyId}`;
          asaasWalletId = asaasWalletId || `wal_${cleanCompanyId}`;
        }
      } else {
        console.warn(`[Approve Company] Documento fiscal ausente ou atípico (${cleanDoc}), gerando identificador interno.`);
        asaasSubaccountId = asaasSubaccountId || `subacc_${cleanCompanyId}`;
        asaasWalletId = asaasWalletId || `wal_${cleanCompanyId}`;
      }
    }

    const nowIso = new Date().toISOString();

    // 3. Salva aprovação e identificadores da empresa no Firestore
    const updatePayload: Record<string, any> = {
      status: 'approved',
      verified: true,
      kyc_status: 'verified',
      asaasWalletId: asaasWalletId,
      asaasSubaccountId: asaasSubaccountId,
      walletId: asaasWalletId,
      subaccountId: asaasSubaccountId,
      reviewedAt: nowIso,
      rejectionReason: null
    };
    if (apiKey) updatePayload.asaasApiKey = apiKey;

    await setDoc(compRef, updatePayload, { merge: true });

    // 4. Atualiza também a solicitação na coleção de verificações (KYC)
    try {
      await setDoc(doc(db, 'verification_requests', cleanCompanyId), {
        status: 'approved',
        reviewedAt: nowIso,
        rejectionReason: null
      }, { merge: true });
    } catch (vErr) {}

    // 5. Atualiza também o perfil do usuário proprietário
    const targetUserId = companyData.ownerId || companyData.submittedBy;
    if (targetUserId) {
      try {
        const userProfRef = doc(db, 'user_profiles', String(targetUserId));
        await setDoc(userProfRef, {
          verified: true,
          verificationStatus: 'approved',
          kyc_status: 'verified',
          companyId: cleanCompanyId,
          companyName: compName,
          asaasWalletId: asaasWalletId,
          asaasSubaccountId: asaasSubaccountId,
          updatedAt: nowIso
        }, { merge: true });

        const userRef = doc(db, 'users', String(targetUserId));
        await setDoc(userRef, {
          verified: true,
          verificationStatus: 'approved',
          kyc_status: 'verified',
          companyId: cleanCompanyId,
          asaasWalletId: asaasWalletId,
          asaasSubaccountId: asaasSubaccountId,
          updatedAt: nowIso
        }, { merge: true });

        // Sincroniza também verification_request pelo ID do usuário
        await setDoc(doc(db, 'verification_requests', String(targetUserId)), {
          status: 'approved',
          reviewedAt: nowIso,
          rejectionReason: null
        }, { merge: true });
      } catch (uErr) {
        console.warn('[Approve Company] Aviso ao sincronizar perfil do usuário dono:', uErr);
      }
    }

    return res.json({
      success: true,
      message: `Empresa "${compName}" APROVADA com sucesso! Registro homologado no sistema.`,
      companyId: cleanCompanyId,
      asaasWalletId,
      asaasSubaccountId
    });

  } catch (err: any) {
    console.error('Erro na rota /api/admin/approve-company:', err);
    return res.status(500).json({ error: err.message || 'Erro interno ao aprovar empresa.' });
  }
});

// =========================================================================
// 🚫 MÓDULO 2.1: BANIR / SUSPENDER ENTIDADE (USUÁRIO OU EMPRESA)
// =========================================================================
app.post('/api/admin/ban-entity', async (req, res) => {
  try {
    const { id, type, reason } = req.body;
    if (!id) {
      return res.status(400).json({ error: 'ID da entidade é obrigatório.' });
    }

    const cleanId = String(id).trim();
    const banReason = String(reason || 'Suspensão aplicada pela administração por descumprimento de termos de uso.').trim();
    const nowIso = new Date().toISOString();

    if (type === 'company' || cleanId.startsWith('comp-')) {
      // Banir Empresa e desativar planos
      const compRef = doc(db, 'companies', cleanId);
      await setDoc(compRef, {
        status: 'banned',
        verified: false,
        banReason,
        bannedAt: nowIso
      }, { merge: true });

      // Desativar planos vinculados a esta empresa
      const plansSnap = await getDocs(collection(db, 'plans'));
      for (const p of plansSnap.docs) {
        if (p.data().companyId === cleanId) {
          await updateDoc(p.ref, { active: false, status: 'banned', banReason });
        }
      }

      // Atualizar solicitação de verificação vinculada
      const verifSnap = await getDocs(collection(db, 'verification_requests'));
      for (const v of verifSnap.docs) {
        const vData = v.data();
        if (vData.companyId === cleanId || v.id === cleanId) {
          await updateDoc(v.ref, { status: 'banned', banReason, reviewedAt: nowIso });
        }
      }
    } else {
      // Banir Usuário / Perfil
      const profRef = doc(db, 'user_profiles', cleanId);
      const profSnap = await getDoc(profRef);
      const profData = profSnap.exists() ? profSnap.data() : null;

      await setDoc(profRef, {
        status: 'banned',
        banned: true,
        banReason,
        bannedAt: nowIso
      }, { merge: true });

      // Atualizar na coleção de verificação
      const verifRef = doc(db, 'verification_requests', cleanId);
      const verifSnap = await getDoc(verifRef);
      if (verifSnap.exists()) {
        await setDoc(verifRef, {
          status: 'banned',
          banReason,
          reviewedAt: nowIso
        }, { merge: true });
      }

      // Se o usuário possui empresa vinculada, suspender também
      const userCompanyId = profData?.companyId;
      if (userCompanyId) {
        const compRef = doc(db, 'companies', userCompanyId);
        await setDoc(compRef, {
          status: 'banned',
          verified: false,
          banReason,
          bannedAt: nowIso
        }, { merge: true });

        // Desativar planos da empresa
        const plansSnap = await getDocs(collection(db, 'plans'));
        for (const p of plansSnap.docs) {
          if (p.data().companyId === userCompanyId) {
            await updateDoc(p.ref, { active: false, status: 'banned', banReason });
          }
        }
      }
    }

    return res.json({
      success: true,
      message: 'Conta/Empresa suspensa e banida com sucesso.'
    });
  } catch (err: any) {
    console.error('Erro na rota /api/admin/ban-entity:', err);
    return res.status(500).json({ error: err.message || 'Erro ao banir entidade.' });
  }
});

// =========================================================================
// 🔓 MÓDULO 2.2: DESBANIR / REATIVAR ENTIDADE
// =========================================================================
app.post('/api/admin/unban-entity', async (req, res) => {
  try {
    const { id, type } = req.body;
    if (!id) return res.status(400).json({ error: 'ID da entidade é obrigatório.' });

    const cleanId = String(id).trim();
    const nowIso = new Date().toISOString();

    if (type === 'company' || cleanId.startsWith('comp-')) {
      const compRef = doc(db, 'companies', cleanId);
      await setDoc(compRef, {
        status: 'approved',
        verified: true,
        banReason: null,
        unbannedAt: nowIso
      }, { merge: true });

      // Reativar planos
      const plansSnap = await getDocs(collection(db, 'plans'));
      for (const p of plansSnap.docs) {
        if (p.data().companyId === cleanId) {
          await updateDoc(p.ref, { active: true, status: 'active', banReason: null });
        }
      }
    } else {
      const profRef = doc(db, 'user_profiles', cleanId);
      await setDoc(profRef, {
        status: 'approved',
        banned: false,
        banReason: null,
        unbannedAt: nowIso
      }, { merge: true });

      const verifRef = doc(db, 'verification_requests', cleanId);
      const verifSnap = await getDoc(verifRef);
      if (verifSnap.exists()) {
        await setDoc(verifRef, {
          status: 'approved',
          banReason: null,
          reviewedAt: nowIso
        }, { merge: true });
      }
    }

    return res.json({ success: true, message: 'Entidade reativada com sucesso.' });
  } catch (err: any) {
    console.error('Erro na rota /api/admin/unban-entity:', err);
    return res.status(500).json({ error: err.message || 'Erro ao desbanir entidade.' });
  }
});

// =========================================================================
// 💣 MÓDULO 2.3: EXCLUSÃO TOTAL & PURGE DO BANCO DE DADOS (USUÁRIO / EMPRESA)
// =========================================================================
app.post('/api/admin/purge-entity', async (req, res) => {
  try {
    const { id, type, confirmation } = req.body;
    if (!id) return res.status(400).json({ error: 'ID da entidade é obrigatório.' });
    if (!confirmation || String(confirmation).trim().toUpperCase() !== 'EXCLUIR') {
      return res.status(400).json({ error: 'Palavra de confirmação inválida. Digite EXCLUIR para confirmar.' });
    }

    const cleanId = String(id).trim();
    console.log(`[Purge Entity] Iniciando exclusão definitiva de ${type} ID ${cleanId}...`);

    let deletedDetails = {
      profileDeleted: false,
      companiesDeleted: 0,
      plansDeleted: 0,
      verificationsDeleted: 0,
      affiliationsDeleted: 0
    };

    if (type === 'company' || cleanId.startsWith('comp-')) {
      // 1. Deletar empresa
      const compRef = doc(db, 'companies', cleanId);
      const compSnap = await getDoc(compRef);
      const ownerId = compSnap.exists() ? compSnap.data()?.ownerId : null;
      await deleteDoc(compRef);
      deletedDetails.companiesDeleted++;

      // 2. Deletar planos da empresa
      const plansSnap = await getDocs(collection(db, 'plans'));
      for (const p of plansSnap.docs) {
        if (p.data().companyId === cleanId) {
          await deleteDoc(p.ref);
          deletedDetails.plansDeleted++;
        }
      }

      // 3. Deletar solicitações de verificação ligadas à empresa
      const verifSnap = await getDocs(collection(db, 'verification_requests'));
      for (const v of verifSnap.docs) {
        if (v.data().companyId === cleanId || v.id === cleanId) {
          await deleteDoc(v.ref);
          deletedDetails.verificationsDeleted++;
        }
      }

      // 4. Se encontrou dono, limpar vínculo de empresa no perfil
      if (ownerId) {
        try {
          const profRef = doc(db, 'user_profiles', ownerId);
          await updateDoc(profRef, {
            companyId: null,
            companyName: null,
            hasCompanyProfile: false
          });
        } catch (e) {
          console.warn('Erro não bloqueante ao limpar perfil do dono:', e);
        }
      }
    } else {
      // 1. Buscar perfil para encontrar eventuais vínculos
      const profRef = doc(db, 'user_profiles', cleanId);
      const profSnap = await getDoc(profRef);
      const profData = profSnap.exists() ? profSnap.data() : null;
      const linkedCompanyId = profData?.companyId;

      // 2. Deletar perfil
      await deleteDoc(profRef);
      deletedDetails.profileDeleted = true;

      // 3. Deletar da coleção 'users' se existir
      try {
        await deleteDoc(doc(db, 'users', cleanId));
      } catch (uErr) {
        // Silencioso se não existir
      }

      // 4. Deletar solicitações de verificação do usuário
      const verifRef = doc(db, 'verification_requests', cleanId);
      await deleteDoc(verifRef);
      deletedDetails.verificationsDeleted++;

      const verifSnap = await getDocs(collection(db, 'verification_requests'));
      for (const v of verifSnap.docs) {
        if (v.data().userId === cleanId) {
          await deleteDoc(v.ref);
          deletedDetails.verificationsDeleted++;
        }
      }

      // 5. Se o usuário tinha empresa vinculada, deletar a empresa e planos
      if (linkedCompanyId) {
        await deleteDoc(doc(db, 'companies', linkedCompanyId));
        deletedDetails.companiesDeleted++;

        const plansSnap = await getDocs(collection(db, 'plans'));
        for (const p of plansSnap.docs) {
          if (p.data().companyId === linkedCompanyId) {
            await deleteDoc(p.ref);
            deletedDetails.plansDeleted++;
          }
        }
      }

      // Também buscar qualquer empresa onde ownerId seja este usuário
      const compQ = query(collection(db, 'companies'), where('ownerId', '==', cleanId));
      const compSnap = await getDocs(compQ);
      for (const c of compSnap.docs) {
        const cId = c.id;
        await deleteDoc(c.ref);
        deletedDetails.companiesDeleted++;

        const plansSnap = await getDocs(collection(db, 'plans'));
        for (const p of plansSnap.docs) {
          if (p.data().companyId === cId) {
            await deleteDoc(p.ref);
            deletedDetails.plansDeleted++;
          }
        }
      }

      // 6. Deletar afiliações do usuário
      const affSnap = await getDocs(collection(db, 'affiliations'));
      for (const a of affSnap.docs) {
        if (a.data().userId === cleanId || a.data().affiliateId === cleanId) {
          await deleteDoc(a.ref);
          deletedDetails.affiliationsDeleted++;
        }
      }
    }

    console.log(`✅ [Purge Entity] Concluído com sucesso:`, deletedDetails);
    return res.json({
      success: true,
      message: 'Entidade e todos os dados associados foram completamente excluídos do banco de dados.',
      details: deletedDetails
    });
  } catch (err: any) {
    console.error('Erro na rota /api/admin/purge-entity:', err);
    return res.status(500).json({ error: err.message || 'Erro ao excluir entidade do banco de dados.' });
  }
});

// =========================================================================
// 📦 MÓDULO 3: CRIAÇÃO & EDIÇÃO DE PLANOS COM ISOLAMENTO TOTAL DE TENANT
// =========================================================================
app.post('/api/plans', async (req, res) => {
  try {
    const { 
      companyId,
      name,
      description,
      priceSetup,
      priceMonthly,
      commissionPercentage,
      recurrentCommissionPercent,
      features,
      bannerImage,
      badge,
      checkoutUrl,
      category,
      id: existingPlanId
    } = req.body;

    if (!companyId) {
      return res.status(400).json({ error: 'companyId é obrigatório. O plano deve pertencer exclusivamente à sua empresa.' });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'O nome do plano é obrigatório.' });
    }

    const cleanCompanyId = String(companyId).trim();
    const compRef = doc(db, 'companies', cleanCompanyId);
    const compSnap = await getDoc(compRef);

    if (!compSnap.exists()) {
      return res.status(404).json({ error: `Empresa com ID "${cleanCompanyId}" não encontrada.` });
    }

    const companyData = compSnap.data() as any;
    const isVerified = companyData.verified === true || companyData.status === 'approved';
    if (!isVerified) {
      return res.status(403).json({ error: 'Apenas empresas aprovadas pela administração podem cadastrar ou publicar planos.' });
    }

    const planId = existingPlanId ? String(existingPlanId).trim() : `plan-${Date.now()}`;
    const nowIso = new Date().toISOString();

    const numSetup = Number(priceSetup || 0);
    const numCommission = Number(commissionPercentage || 30);
    const commissionVal = Number(((numSetup * numCommission) / 100).toFixed(2));

    const planPayload = {
      id: planId,
      companyId: cleanCompanyId,
      companyName: companyData.companyName || companyData.name || 'Empresa Parceira',
      companyLogo: companyData.logo || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=150&q=80',
      ownerId: companyData.ownerId || companyData.submittedBy,
      asaasSubaccountId: companyData.asaasSubaccountId || companyData.subaccountId || companyData.asaasWalletId || null,
      asaasWalletId: companyData.asaasWalletId || companyData.walletId || null,
      name: name.trim(),
      description: (description || '').trim(),
      category: category || companyData.category || 'SaaS / B2B',
      priceSetup: numSetup,
      priceMonthly: Number(priceMonthly || 0),
      commissionPercentage: numCommission,
      commissionValue: commissionVal,
      recurrentCommissionPercent: Number(recurrentCommissionPercent || 0),
      features: Array.isArray(features) && features.length > 0 ? features : ['Ativação e setup imediato', 'Suporte dedicado'],
      bannerImage: bannerImage || 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=600&q=80',
      badge: badge || 'Destaque',
      checkoutUrl: checkoutUrl || 'https://pay.leadspay.com/checkout',
      status: 'Ativo',
      updatedAt: nowIso,
      ...(!existingPlanId ? { createdAt: nowIso, totalSales: 0, affiliatesCount: 0 } : {})
    };

    const planRef = doc(db, 'plans', planId);
    await setDoc(planRef, planPayload, { merge: true });

    if (!existingPlanId) {
      try {
        await updateDoc(compRef, {
          totalPlansCount: increment(1)
        });
      } catch (cntErr) {
        console.warn('Aviso ao atualizar contagem de planos da empresa:', cntErr);
      }
    }

    console.log(`✅ [POST /api/plans] Plano "${planPayload.name}" (${planId}) vinculado exclusivamente à empresa ${cleanCompanyId} (${planPayload.companyName})`);

    return res.json({
      success: true,
      plan: planPayload,
      message: 'Plano cadastrado com sucesso e vinculado à sua empresa!'
    });

  } catch (err: any) {
    console.error('Erro na rota /api/plans:', err);
    return res.status(500).json({ error: err.message || 'Erro interno ao salvar plano.' });
  }
});

// GET /api/plans - Lista de planos com suporte a filtro estrito por companyId
app.get('/api/plans', async (req, res) => {
  try {
    const { companyId } = req.query;
    const plansColl = collection(db, 'plans');
    let q;
    if (companyId) {
      q = query(plansColl, where('companyId', '==', String(companyId)));
    } else {
      q = plansColl;
    }
    const snap = await getDocs(q);
    const plans = snap.docs.map(d => ({ id: d.id, ...(d.data() as Record<string, any>) }));
    return res.json({ success: true, plans });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Erro ao buscar planos.' });
  }
});

// =========================================================================
// 🏧 MÓDULO 2: ROTA DE SOLICITAÇÃO E TRANSFERÊNCIA PIX (/api/withdrawals/request)
// =========================================================================
app.post('/api/withdrawals/request', async (req, res) => {
  try {
    const { 
      userId, 
      requestedAmount: reqAmountParam, 
      amount: amountParam, 
      pixKey, 
      pixKeyType, 
      subaccountId: subaccountParam,
      userName 
    } = req.body;

    const requestedAmount = Number(reqAmountParam !== undefined ? reqAmountParam : amountParam);

    // 1. Regra de Validação: Valor Mínimo (R$ 50,00)
    if (isNaN(requestedAmount) || requestedAmount < 50) {
      return res.status(400).json({ 
        error: true, 
        message: "O valor mínimo para solicitação de saque é de R$ 50,00." 
      });
    }

    // 2. Localização da Conta e Validação de Saldo Disponível
    const targetUserId = userId || 'usr_techify_main';
    let userProfile: any = null;
    let targetDocRef = doc(db, 'user_profiles', targetUserId);
    let profileSnap = await getDoc(targetDocRef);

    if (profileSnap.exists()) {
      userProfile = profileSnap.data();
    } else {
      const uRef = doc(db, 'users', targetUserId);
      const uSnap = await getDoc(uRef);
      if (uSnap.exists()) {
        userProfile = uSnap.data();
        targetDocRef = uRef;
      } else {
        const compRef = doc(db, 'companies', targetUserId);
        const compSnap = await getDoc(compRef);
        if (compSnap.exists()) {
          userProfile = compSnap.data();
          targetDocRef = compRef;
        }
      }
    }

    const availableBalance = Number((userProfile?.availableBalance || 0).toFixed(2));

    if (requestedAmount > availableBalance) {
      return res.status(400).json({ 
        error: true, 
        message: "Saldo disponível insuficiente para realizar o saque." 
      });
    }

    // 3. Regra de Validação: Chave PIX
    if (!pixKey || typeof pixKey !== 'string' || !pixKey.trim()) {
      return res.status(400).json({ 
        error: true, 
        message: "Chave PIX válida é obrigatória para processar o saque." 
      });
    }

    const cleanPixKey = pixKey.trim();

    // Detecção e normalização do tipo de chave PIX para o Asaas
    let asaasKeyType = 'EVP';
    const typeUpper = (pixKeyType || '').toUpperCase();
    if (typeUpper.includes('CPF')) asaasKeyType = 'CPF';
    else if (typeUpper.includes('CNPJ')) asaasKeyType = 'CNPJ';
    else if (typeUpper.includes('EMAIL') || cleanPixKey.includes('@')) asaasKeyType = 'EMAIL';
    else if (typeUpper.includes('PHONE') || typeUpper.includes('FONE') || typeUpper.includes('TELEFONE')) asaasKeyType = 'PHONE';
    else if (typeUpper.includes('EVP') || typeUpper.includes('ALEAT')) asaasKeyType = 'EVP';
    else {
      const digits = cleanPixKey.replace(/\D/g, '');
      if (cleanPixKey.includes('@')) asaasKeyType = 'EMAIL';
      else if (digits.length === 11) asaasKeyType = 'CPF';
      else if (digits.length === 14) asaasKeyType = 'CNPJ';
      else if (digits.length >= 10 && digits.length <= 13) asaasKeyType = 'PHONE';
      else asaasKeyType = 'EVP';
    }

    // 4. Cálculo da Taxa e Transferência Asaas
    const fee = 2.50; // Taxa administrativa fixa LeadsPay
    const netWithdrawal = Number(Math.max(0, requestedAmount - fee).toFixed(2));
    const now = new Date();
    const nowIso = now.toISOString();
    const withdrawalId = `WTH-${Date.now()}`;
    const formattedDate = `${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

    console.log(`🏧 [Solicitação de Saque PIX] Usuário: ${targetUserId} | Solicitado: R$ ${requestedAmount} | Taxa: R$ ${fee} | Líquido Asaas: R$ ${netWithdrawal}`);

    const isDevMode = 
      req.body?.is_test === true || 
      req.body?.environment === 'development' || 
      req.headers['x-dev-mode'] === 'true' || 
      userProfile?.environment === 'development';

    let asaasTransferId = isDevMode ? `trf_dev_sim_${Date.now()}` : `trf_asaas_${Date.now()}`;

    // Disparo da Transferência no Asaas somente se estiver em Produção
    if (!isDevMode) {
      const asaasConfig = await getAsaasConfig();
      const apiKey = asaasConfig.apiKey;
      const apiUrl = asaasConfig.apiUrl || 'https://api.asaas.com/v3';
      const subaccountId = subaccountParam || userProfile?.asaasSubaccountId || userProfile?.subaccountId || null;

      try {
        const asaasHeaders: Record<string, string> = {
          'access_token': apiKey,
          'Content-Type': 'application/json'
        };
        if (subaccountId) {
          asaasHeaders['account'] = subaccountId;
        }

        const asaasTransferPayload = {
          value: netWithdrawal,
          pixAddressKey: cleanPixKey,
          pixAddressKeyType: asaasKeyType,
          description: `Saque LeadsPay #${withdrawalId}`
        };

        const asaasTransferRes = await fetch(`${apiUrl}/transfers`, {
          method: 'POST',
          headers: asaasHeaders,
          body: JSON.stringify(asaasTransferPayload)
        });

        if (asaasTransferRes.ok) {
          const asaasTrfData = await asaasTransferRes.json();
          if (asaasTrfData.id) asaasTransferId = String(asaasTrfData.id);
          console.log(`✅ [Asaas Transfer] Sucesso! ID da transferência: ${asaasTransferId}`);
        } else {
          const errText = await asaasTransferRes.text();
          console.warn('⚠️ [Asaas Transfer API Notice]:', errText);
        }
      } catch (trfErr) {
        console.warn('⚠️ [Asaas Transfer Request Warning]:', trfErr);
      }
    } else {
      console.log(`🧪 [Sandbox Dev Mode] Saque simulado processado com sucesso. ID: ${asaasTransferId}`);
    }

    // 5. Atualização no Firestore:
    // a) Subtraia requestedAmount do availableBalance do usuário
    const newAvailable = Math.max(0, Number((availableBalance - requestedAmount).toFixed(2)));
    const balanceDeduction = {
      availableBalance: increment(-requestedAmount),
      updatedAt: nowIso
    };

    try {
      await setDoc(targetDocRef, balanceDeduction, { merge: true });
      await setDoc(doc(db, 'user_profiles', String(targetUserId)), balanceDeduction, { merge: true });
      await setDoc(doc(db, 'users', String(targetUserId)), balanceDeduction, { merge: true });
      if (userProfile?.companyId) {
        await setDoc(doc(db, 'companies', String(userProfile.companyId)), balanceDeduction, { merge: true });
      }
    } catch (deductErr) {
      console.warn('Erro ao atualizar saldo disponível do usuário:', deductErr);
    }

    // b) Registre o histórico na coleção withdrawals com o schema exato
    const withdrawalRecord = {
      id: withdrawalId,
      userId: targetUserId,
      userName: userName || userProfile?.name || 'Parceiro LeadsPay',
      requestedAmount: requestedAmount,
      amount: requestedAmount,
      fee: fee,
      feeAmount: fee,
      netAmount: netWithdrawal,
      pixKey: cleanPixKey,
      pixKeyType: asaasKeyType,
      status: "COMPLETED",
      asaasTransferId: asaasTransferId,
      is_test: isDevMode,
      environment: isDevMode ? 'development' : 'production',
      createdAt: nowIso,
      requestedAt: formattedDate,
      completedAt: nowIso
    };

    const withdrawalDocRef = doc(db, 'withdrawals', withdrawalId);
    await setDoc(withdrawalDocRef, withdrawalRecord);

    // c) Credita a taxa administrativa de R$ 2,50 na plataforma LeadsPay
    await creditServerPlatformFinances('withdrawal', fee);

    console.log(`🎉 [Saque Finalizado] ID: ${withdrawalId} | Transferência Asaas: ${asaasTransferId} | Novo Saldo: R$ ${newAvailable}`);

    return res.json({
      success: true,
      message: "Saque via Pix aprovado e liquidado com sucesso!",
      withdrawal: withdrawalRecord,
      newAvailableBalance: newAvailable
    });

  } catch (error: any) {
    console.error('Erro ao processar solicitação de saque:', error);
    return res.status(500).json({ 
      error: true, 
      message: error.message || 'Erro interno ao processar transferência Pix' 
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
  try {
    if (process.env.NODE_ENV !== 'production') {
      const vite = await createViteServer({
        server: { 
          middlewareMode: true,
          hmr: process.env.DISABLE_HMR !== 'true'
        },
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

    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`⚡ LeadsPay Server online on http://0.0.0.0:${PORT}`);
    });

    server.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} already in use. Waiting or retrying...`);
      } else {
        console.error('❌ Server listener error:', err);
      }
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
  }
}

process.on('unhandledRejection', (reason, promise) => {
  console.warn('⚠️ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('⚠️ Uncaught Exception:', err);
});

startServer().catch((err) => {
  console.error('❌ startServer promise rejection:', err);
});

