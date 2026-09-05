import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';

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
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(200).json({ received: true });
  }

  try {
    const { event, payment } = req.body || {};
    console.log(`[Asaas Webhook Vercel] Evento recebido: ${event}`, payment?.id);

    if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED') {
      const paymentId = payment?.id;
      const customerId = payment?.customer;
      const amountPaid = payment?.value;

      console.log(`✅ [Asaas Webhook Vercel] Pagamento confirmado! ID: ${paymentId} | Cliente: ${customerId} | R$ ${amountPaid}`);

      if (paymentId) {
        const db = getDb();
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
          console.log(`[Asaas Webhook Vercel] Venda ${paymentId} atualizada para aprovada.`);
        }
      }
    }

    return res.status(200).json({ received: true });
  } catch (err: any) {
    console.error('[Asaas Webhook Vercel Error]:', err);
    return res.status(200).json({ received: true, error: err.message });
  }
}
