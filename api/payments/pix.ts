import { MercadoPagoConfig, Payment } from 'mercadopago';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

// Server-only Secure Mercado Pago Credentials
const MP_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN || process.env.MERCADO_PAGO_ACCESS_TOKEN || 'APP_USR-5352039864226161-090210-52ddde4037f8daf9e7dbde717d0cd562-3152233934';

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || "AIzaSyBZY9m-CFG7-l9H1bptd4eGcd6IL_aEWIM",
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "techify-gaming-106fe.firebaseapp.com",
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || "techify-gaming-106fe",
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "techify-gaming-106fe.firebasestorage.app",
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "247058420839",
  appId: process.env.VITE_FIREBASE_APP_ID || "1:247058420839:web:436355c69a6026be9b70c2",
  measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID || "G-3SB1FEBFNZ"
};

function getDb() {
  const fbApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  return getFirestore(fbApp);
}

export default async function handler(req: any, res: any) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido. Use POST.' });
  }

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
    } = req.body || {};

    const finalAmount = Number(valorTotal ?? total_amount ?? amount);
    if (isNaN(finalAmount) || finalAmount <= 0) {
      return res.status(400).json({ error: 'Valor total inválido para a cobrança Pix' });
    }

    const finalPlanName = planName || (description ? description.replace(/^Compra:\s*/, '') : '') || (planId ? `Plano ${planId}` : 'LeadsPay');
    const finalEmail = (emailDoCliente || payer?.email || 'cliente@leadspay.com').trim();
    const finalFullName = (nomeDoCliente || payer?.name || payer?.fullName || 'Cliente LeadsPay').trim();
    const rawCpf = (cpfLimpo || payer?.cpf || payer?.documentNumber || payer?.identification?.number || '19119119100').toString();
    const finalCpfLimpo = rawCpf.replace(/\D/g, '') || '19119119100';
    const finalRefCode = refCode || affiliate_code || affiliateRef || null;
    const finalPlanId = (planId || plan_id || null)?.toString() || null;

    const client = new MercadoPagoConfig({ 
      accessToken: MP_ACCESS_TOKEN 
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

    console.log('[Vercel Serverless PIX] payment.create():', {
      transaction_amount: body.transaction_amount,
      plan_id: finalPlanId,
      affiliate_code: finalRefCode
    });

    const result = await payment.create({ body });

    if (!result || !result.id || !result.point_of_interaction?.transaction_data?.qr_code) {
      console.error('[Mercado Pago Vercel Error]: Resposta incompleta:', result);
      return res.status(500).json({
        error: 'Mercado Pago não retornou os dados completos do Pix (qr_code ausente).'
      });
    }

    const qr_code = result.point_of_interaction.transaction_data.qr_code;
    const qr_code_base64 = result.point_of_interaction.transaction_data.qr_code_base64;
    const payment_id = result.id;
    const ticket_url = result.point_of_interaction.transaction_data.ticket_url || null;

    try {
      const db = getDb();
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
        created_at: result.date_created || new Date().toISOString(),
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
    } catch (dbErr) {
      console.error('Erro ao registrar venda no Firestore na Vercel Function:', dbErr);
    }

    return res.status(200).json({
      qr_code,
      qr_code_base64,
      payment_id,
      id: String(payment_id),
      status: result.status || 'pending',
      ticket_url
    });

  } catch (error: any) {
    console.error('[Vercel Serverless PIX Error]:', error);
    const reason = error?.message || error?.error || 'Erro ao processar cobrança Pix no Mercado Pago';
    return res.status(500).json({ 
      error: reason,
      details: error?.causes || error?.cause || null
    });
  }
}
