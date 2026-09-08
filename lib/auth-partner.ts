import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc,
  setDoc,
  Firestore 
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || "AIzaSyBZY9m-CFG7-l9H1bptd4eGcd6IL_aEWIM",
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "techify-gaming-106fe.firebaseapp.com",
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || "techify-gaming-106fe",
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "techify-gaming-106fe.firebasestorage.app",
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "247058420839",
  appId: process.env.VITE_FIREBASE_APP_ID || "1:247058420839:web:436355c69a6026be9b70c2",
  measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID || "G-3SB1FEBFNZ"
};

function getDbInstance(customDb?: Firestore): Firestore {
  if (customDb) return customDb;
  const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  return getFirestore(app);
}

export interface PartnerAuthResult {
  isValid: boolean;
  userId?: string;
  companyId?: string;
  companyName?: string;
  companySlug?: string;
  email?: string;
  asaasSubaccountId?: string;
  webhookUrl?: string;
  status?: string;
  isApproved?: boolean;
  error?: string;
  raw?: Record<string, any>;
}

/**
 * Gera uma nova API Key única de parceiro no formato padrão LeadsPay: lp_live_...
 */
export function generatePartnerApiKey(): string {
  // Gera uma sequência numérica pseudo-aleatória consistente com o padrão lp_live_99482710398471203948571290384
  const timestamp = Date.now().toString();
  const randomPart1 = Math.floor(1000000000 + Math.random() * 9000000000).toString();
  const randomPart2 = Math.floor(1000000000 + Math.random() * 9000000000).toString();
  return `lp_live_${timestamp}${randomPart1.slice(0, 8)}${randomPart2.slice(0, 8)}`;
}

/**
 * Helper interno para resolver dados do parceiro (usuário + empresa vinculada)
 */
async function resolvePartnerDetails(
  userId: string,
  data: Record<string, any>,
  db: Firestore
): Promise<PartnerAuthResult> {
  let asaasSubaccountId = data.asaasSubaccountId || data.subaccountId || data.subaccount_id || data.walletId || null;
  let webhookUrl = data.webhookUrl || data.postbackUrl || null;
  let companyId = data.companyId || null;
  let companyName = data.companyName || data.name || 'Parceiro LeadsPay';
  let companySlug = data.companySlug || '';
  let status = data.verificationStatus || data.status || 'approved';
  let isApproved = data.verified === true || data.verificationStatus === 'approved' || data.status === 'approved';

  // Se tiver companyId vinculado, busca no Firestore da empresa
  if (companyId) {
    try {
      const compDoc = await getDoc(doc(db, 'companies', String(companyId)));
      if (compDoc.exists()) {
        const cData = compDoc.data();
        if (!asaasSubaccountId) {
          asaasSubaccountId = cData.asaasSubaccountId || cData.subaccountId || null;
        }
        if (!webhookUrl) {
          webhookUrl = cData.webhookUrl || cData.postbackUrl || null;
        }
        companyName = cData.name || companyName;
        companySlug = cData.slug || companySlug;
        if (cData.verified === true || cData.status === 'approved') {
          isApproved = true;
        }
      }
    } catch (cErr) {
      console.warn('[validateApiKey] Aviso ao buscar dados da empresa vinculada:', cErr);
    }
  } else {
    // Tenta encontrar empresa onde ownerId == userId
    try {
      const compQ = query(collection(db, 'companies'), where('ownerId', '==', userId));
      const compSnap = await getDocs(compQ);
      if (!compSnap.empty) {
        const compDoc = compSnap.docs[0];
        const cData = compDoc.data();
        companyId = compDoc.id;
        if (!asaasSubaccountId) {
          asaasSubaccountId = cData.asaasSubaccountId || cData.subaccountId || null;
        }
        if (!webhookUrl) {
          webhookUrl = cData.webhookUrl || cData.postbackUrl || null;
        }
        companyName = cData.name || companyName;
        companySlug = cData.slug || companySlug;
        if (cData.verified === true || cData.status === 'approved') {
          isApproved = true;
        }
      }
    } catch (searchErr) {
      console.warn('[validateApiKey] Aviso ao buscar empresa por ownerId:', searchErr);
    }
  }

  return {
    isValid: true,
    userId,
    companyId,
    companyName,
    companySlug,
    email: data.email || '',
    asaasSubaccountId: asaasSubaccountId || undefined,
    webhookUrl: webhookUrl || undefined,
    status,
    isApproved,
    raw: data
  };
}

/**
 * Valida se a chave de API do parceiro existe e retorna seus dados de conta e subconta Asaas.
 * Suporta busca nas coleções users, user_profiles e companies.
 */
export async function validateApiKey(
  apiKey: string | null | undefined,
  customDb?: Firestore
): Promise<PartnerAuthResult> {
  const cleanKey = (apiKey || '').trim();

  if (!cleanKey) {
    return {
      isValid: false,
      error: 'API Key de parceiro inválida ou não encontrada.'
    };
  }

  const db = getDbInstance(customDb);

  try {
    // 1. Busca em users com apiKey == cleanKey
    const usersQ = query(collection(db, 'users'), where('apiKey', '==', cleanKey));
    const usersSnap = await getDocs(usersQ);
    if (!usersSnap.empty) {
      const userDoc = usersSnap.docs[0];
      const data = userDoc.data();
      return await resolvePartnerDetails(userDoc.id, data, db);
    }

    // 2. Busca em user_profiles com apiKey == cleanKey
    const profQ = query(collection(db, 'user_profiles'), where('apiKey', '==', cleanKey));
    const profSnap = await getDocs(profQ);
    if (!profSnap.empty) {
      const profDoc = profSnap.docs[0];
      const data = profDoc.data();
      const userId = data.userId || profDoc.id;
      return await resolvePartnerDetails(userId, data, db);
    }

    // 3. Busca em companies com apiKey == cleanKey
    const compQ = query(collection(db, 'companies'), where('apiKey', '==', cleanKey));
    const compSnap = await getDocs(compQ);
    if (!compSnap.empty) {
      const compDoc = compSnap.docs[0];
      const cData = compDoc.data();
      const companyId = compDoc.id;
      const ownerId = cData.ownerId || cData.submittedBy || companyId;
      return {
        isValid: true,
        userId: ownerId,
        companyId,
        companyName: cData.name || 'Empresa LeadsPay',
        companySlug: cData.slug || '',
        email: cData.email || '',
        asaasSubaccountId: cData.asaasSubaccountId || cData.subaccountId || undefined,
        webhookUrl: cData.webhookUrl || cData.postbackUrl || undefined,
        status: cData.status || 'approved',
        isApproved: cData.verified === true || cData.status === 'approved',
        raw: cData
      };
    }

    // 4. Caso a chave seja id de documento direto em user_profiles
    const directProfRef = doc(db, 'user_profiles', cleanKey);
    const directProfSnap = await getDoc(directProfRef);
    if (directProfSnap.exists()) {
      const data = directProfSnap.data();
      return await resolvePartnerDetails(directProfSnap.id, data, db);
    }

    return {
      isValid: false,
      error: 'API Key de parceiro inválida ou não encontrada.'
    };
  } catch (err: any) {
    console.error('[validateApiKey] Erro ao consultar chave no Firestore:', err);
    return {
      isValid: false,
      error: 'Erro interno ao validar a API Key do parceiro.'
    };
  }
}

/**
 * Obtém ou inicializa a API Key única para o usuário / empresa no Firestore
 */
export async function getOrGenerateUserApiKey(
  userId: string,
  customDb?: Firestore
): Promise<string> {
  if (!userId) return generatePartnerApiKey();

  const db = getDbInstance(customDb);

  try {
    const profRef = doc(db, 'user_profiles', userId);
    const profSnap = await getDoc(profRef);

    if (profSnap.exists() && profSnap.data()?.apiKey) {
      return profSnap.data().apiKey;
    }

    // Cria nova chave
    const newApiKey = generatePartnerApiKey();
    await setDoc(profRef, { apiKey: newApiKey, updatedAt: new Date().toISOString() }, { merge: true });

    try {
      const userRef = doc(db, 'users', userId);
      await setDoc(userRef, { apiKey: newApiKey, updatedAt: new Date().toISOString() }, { merge: true });
    } catch (_) {}

    return newApiKey;
  } catch (e) {
    console.error('[getOrGenerateUserApiKey] Erro ao recuperar/salvar chave de API:', e);
    return generatePartnerApiKey();
  }
}
