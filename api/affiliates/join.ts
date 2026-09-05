import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

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
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
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
    const { planId, userId, userName, userEmail } = req.body || {};
    if (!planId || !userId) {
      return res.status(400).json({ error: 'planId e userId são obrigatórios.' });
    }

    const db = getDb();
    const cleanPlanId = String(planId).trim();
    const cleanUserId = String(userId).trim();

    const planRef = doc(db, 'plans', cleanPlanId);
    const planSnap = await getDoc(planRef);
    if (!planSnap.exists()) {
      return res.status(404).json({ error: 'Plano não encontrado no catálogo.' });
    }
    const planData = planSnap.data();

    const affId = `aff_${cleanUserId}_${cleanPlanId}`;
    const affRef = doc(db, 'affiliations', affId);
    const affSnap = await getDoc(affRef);

    const baseUrl = 'https://techify-gaming.vercel.app';
    const nowIso = new Date().toISOString();

    // Atualiza status do usuário no banco
    try {
      const userRef = doc(db, 'user_profiles', cleanUserId);
      await setDoc(userRef, {
        isAffiliate: true,
        role: 'affiliate',
        affiliateStatus: 'active',
        updatedAt: nowIso
      }, { merge: true });
    } catch (e) {}

    if (affSnap.exists()) {
      const existing = affSnap.data();
      const existingCode = existing.affiliateCode || existing.affiliate_code;
      const formattedLink = `${baseUrl}/plan/${cleanPlanId}?ref=${existingCode}`;
      return res.status(200).json({
        success: true,
        alreadyAffiliated: true,
        affiliation: { id: affId, ...existing, affiliateLink: formattedLink },
        affiliateCode: existingCode,
        affiliateLink: formattedLink,
        message: 'Você já é afiliado deste plano!'
      });
    }

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
      userName: userName || 'Afiliado LeadsPay',
      userEmail: userEmail || '',
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

    await setDoc(affRef, affiliationPayload);
    try {
      await updateDoc(planRef, { affiliatesCount: (planData.affiliatesCount || 0) + 1 });
    } catch (cntErr) {}

    return res.status(200).json({
      success: true,
      affiliation: affiliationPayload,
      affiliateCode,
      affiliateLink,
      message: 'Afiliação realizada com sucesso!'
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Erro ao processar afiliação' });
  }
}
