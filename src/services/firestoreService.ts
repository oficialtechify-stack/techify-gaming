import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot,
  query,
  where,
  orderBy,
  limit
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { 
  CompanyStartup,
  CompanyPlan,
  PlatformProduct, 
  UserAffiliation,
  SaleTransaction, 
  WithdrawalRequest, 
  UserSellerProfile, 
  AffiliateLinkItem,
  TeamMember,
  VerificationRequest,
  PlatformClient,
  ProductDeliveryType
} from '../types/platform';
import { formatAffiliatePlanUrl } from '../utils/affiliateTracking';

export type { 
  CompanyStartup,
  CompanyPlan,
  PlatformProduct, 
  UserAffiliation,
  SaleTransaction, 
  WithdrawalRequest, 
  UserSellerProfile, 
  AffiliateLinkItem,
  TeamMember,
  VerificationRequest,
  PlatformClient
};
import { 
  INITIAL_USER_PROFILE, 
  INITIAL_TRANSACTIONS, 
  INITIAL_WITHDRAWALS 
} from '../data/platformData';

// Firestore Collection Names
export const COLLECTIONS = {
  COMPANIES: 'companies',
  PLANS: 'plans',
  AFFILIATIONS: 'affiliations',
  PLATFORMS: 'plans', // alias for backward compatibility
  SALES: 'sales',
  CLIENTS: 'clients',
  WITHDRAWALS: 'withdrawals',
  PROFILES: 'user_profiles',
  AFFILIATE_LINKS: 'affiliate_links',
  TEAM: 'team_members',
  VERIFICATIONS: 'verification_requests',
  PLATFORM_FINANCES: 'platform_finances',
  SETTINGS: 'platform_settings'
};

export const DEFAULT_USER_ID = 'usr_techify_main';

async function callAdminAction(action: string, payload: Record<string, unknown>) {
  const user = auth.currentUser;
  if (!user) throw new Error('Faça login novamente para executar esta ação administrativa.');
  const token = await user.getIdToken();
  const response = await fetch('/api/admin/entity-action', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ action, ...payload }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Não foi possível executar a ação administrativa.');
  return data;
}


/**
 * Recursively removes all undefined keys from an object or array before passing to Firestore
 */
export function sanitizeForFirestore<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeForFirestore(item)) as unknown as T;
  }
  if (typeof obj === 'object' && !(obj instanceof Date)) {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = sanitizeForFirestore(value);
      }
    }
    return cleaned as T;
  }
  return obj;
}

/**
 * Initialize / Seed Firestore with clean base state
 */
export async function seedFirestoreIfEmpty() {
  try {
    return { success: true, message: 'Banco Firebase sincronizado com sucesso!' };
  } catch (error: any) {
    console.error('Erro ao inicializar Firebase Firestore:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Clear ALL documents in Firebase Firestore
 */
async function callAdminExplorer(action: string, payload: Record<string, unknown> = {}) {
  const user = auth.currentUser;
  if (!user) throw new Error('Faça login novamente para usar o painel administrativo.');
  const token = await user.getIdToken();
  const response = await fetch('/api/admin/explorer', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ action, ...payload }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Não foi possível executar a ação administrativa.');
  return data;
}

export async function fetchAdminCollectionInFirebase(collectionName: string) {
  const result = await callAdminExplorer('list', { collection: collectionName });
  return Array.isArray(result.documents) ? result.documents : [];
}

export async function deleteAdminTestDocumentInFirebase(collectionName: string, id: string) {
  return callAdminExplorer('delete-test-document', { collection: collectionName, id });
}

/**
 * Remove somente registros marcados como teste/desenvolvimento.
 * Dados reais nunca são apagados por esta ação.
 */
export async function clearAllFirestoreData() {
  try {
    const result = await callAdminExplorer('cleanup-test-data');
    return {
      success: true,
      message: result.message || 'Limpeza de registros de teste concluída.',
      deleted: Number(result.deleted || 0),
      byCollection: result.byCollection || {},
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Falha ao limpar registros de teste.' };
  }
}

/**
 * Realtime Profile Listener
 */
export function subscribeUserProfile(callback: (profile: UserSellerProfile) => void, userId: string = DEFAULT_USER_ID) {
  const profileRef = doc(db, COLLECTIONS.PROFILES, userId || DEFAULT_USER_ID);
  return onSnapshot(profileRef, (snap) => {
    if (snap.exists()) {
      const data = snap.data() as UserSellerProfile;
      const target = data.targetGoal || 100000;
      const total = data.totalEarned || 0;
      const progress = target > 0 ? Math.min(100, (total / target) * 100) : 0;
      callback({
        ...data,
        userId: userId || DEFAULT_USER_ID,
        currentSalesProgress: Number(progress.toFixed(1))
      });
    } else {
      callback({
        ...INITIAL_USER_PROFILE,
        userId: userId || DEFAULT_USER_ID
      });
    }
  }, (err) => {
    console.error('Firestore user profile listener error:', err);
  });
}

/**
 * Update user profile in Firebase
 */
export async function updateUserProfileInFirebase(updates: Partial<UserSellerProfile>, userId: string = DEFAULT_USER_ID) {
  const profileRef = doc(db, COLLECTIONS.PROFILES, userId || DEFAULT_USER_ID);
  await setDoc(profileRef, sanitizeForFirestore({
    ...updates,
    updatedAt: new Date().toISOString()
  }), { merge: true });
}

// ==========================================
// 🛡️ KYC & VALIDAÇÃO DE USUÁRIOS (VERIFICAÇÕES)
// ==========================================

/**
 * Submit user profile for Admin verification
 */
export async function submitVerificationRequestInFirebase(
  profileData: Partial<UserSellerProfile>,
  userId: string = DEFAULT_USER_ID
) {
  const user = auth.currentUser;
  if (!user) throw new Error('Faça login novamente para enviar seus dados.');
  if (userId && userId !== DEFAULT_USER_ID && user.uid !== userId) {
    throw new Error('A sessão atual não corresponde ao perfil enviado.');
  }
  const isCompany = profileData.verificationRoleType === 'empresa' || profileData.activeRoleMode === 'empresa' || !!profileData.companyName;
  const token = await user.getIdToken();
  const response = await fetch('/api/profile/submit-verification', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      ...profileData,
      role: isCompany ? 'empresa' : 'afiliado',
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Não foi possível enviar o cadastro para análise.');
  return data;
}

/** Realtime Listener for Verification Requests (Admin) */


export function subscribeVerifications(callback: (requests: VerificationRequest[]) => void) {
  const q = collection(db, COLLECTIONS.VERIFICATIONS);
  return onSnapshot(q, (snap) => {
    const list: VerificationRequest[] = [];
    snap.forEach((d) => {
      list.push({ id: d.id, ...(d.data() as Omit<VerificationRequest, 'id'>) });
    });
    // Sort pending first, then by date descending
    list.sort((a, b) => {
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (b.status === 'pending' && a.status !== 'pending') return 1;
      return (b.submittedAt || '').localeCompare(a.submittedAt || '');
    });
    callback(list);
  }, (err) => {
    console.error('Firestore verifications listener error:', err);
    callback([]);
  });
}

/**
 * Approve Verification Request (Concede Selo Verificado e desbloqueia cadastro de planos e afiliações)
 */
export async function approveVerificationInFirebase(userId: string) {
  return callAdminAction('approve-verification', { id: userId, type: 'user' });
}

/** Reject Verification Request */


export async function rejectVerificationInFirebase(userId: string, reason: string = 'Dados cadastrais necessitam de correção') {
  return callAdminAction('reject-entity', { id: userId, type: 'user', reason });
}

/** Ban / Suspend a User or Company */


export async function banEntityInFirebase(id: string, type: 'user' | 'company', reason: string) {
  return callAdminAction('ban-entity', { id, type, reason });
}

/** Unban / Reactivate a User or Company */


export async function unbanEntityInFirebase(id: string, type: 'user' | 'company') {
  return callAdminAction('unban-entity', { id, type });
}

/** Permanently Purge / Delete User or Company */


export async function purgeEntityInFirebase(id: string, type: 'user' | 'company', confirmation: string = 'EXCLUIR') {
  return callAdminAction('purge-entity', { id, type, confirmation });
}



// ==========================================
// 🏢 EMPRESAS & STARTUPS (COMPANIES)
// ==========================================

/**
 * Realtime Companies Listener
 */
export function subscribeCompanies(callback: (companies: CompanyStartup[]) => void, companyId?: string) {
  if (companyId) {
    const docRef = doc(db, COLLECTIONS.COMPANIES, companyId);
    return onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists() && docSnap.data()?.archived !== true && docSnap.data()?.isArchived !== true) {
        callback([{ id: docSnap.id, ...(docSnap.data() as Omit<CompanyStartup, 'id'>) }]);
      } else {
        const q = query(collection(db, COLLECTIONS.COMPANIES), where("companyId", "==", companyId));
        getDocs(q).then((snap) => {
          const list = snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<CompanyStartup, 'id'>) }));
          callback(list);
        }).catch(() => callback([]));
      }
    }, (err) => {
      console.error('Firestore company listener error:', err);
      callback([]);
    });
  }

  const q = collection(db, COLLECTIONS.COMPANIES);
  return onSnapshot(q, (snap) => {
    const list: CompanyStartup[] = [];
    snap.forEach((d) => {
      const data = d.data() as Omit<CompanyStartup, 'id'>;
      if ((data as any).archived === true || (data as any).isArchived === true) return;
      list.push({ id: d.id, ...data });
    });
    // Sort by creation date descending
    list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    callback(list);
  }, (err) => {
    console.error('Firestore companies listener error:', err);
    callback([]);
  });
}

/**
 * Busca empresa existente de um usuário pelo ownerId ou ID direto
 */
export async function findCompanyByOwnerId(userId: string, companyId?: string): Promise<CompanyStartup | null> {
  if (companyId) {
    try {
      const cRef = doc(db, COLLECTIONS.COMPANIES, companyId);
      const cSnap = await getDoc(cRef);
      if (cSnap.exists()) {
        return { id: cSnap.id, ...(cSnap.data() as Omit<CompanyStartup, 'id'>) };
      }
    } catch (e) {}
  }

  if (userId) {
    try {
      const q = query(collection(db, COLLECTIONS.COMPANIES), where('ownerId', '==', userId));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const d = snap.docs[0];
        return { id: d.id, ...(d.data() as Omit<CompanyStartup, 'id'>) };
      }
    } catch (e) {}
  }

  return null;
}

/**
 * Create a new Company / Startup in Firestore (Sent to Admin for approval)
 */
export async function createCompanyInFirebase(companyData: Omit<CompanyStartup, 'id' | 'createdAt'>) {
  const user = auth.currentUser;
  if (!user) throw new Error('Faça login novamente para cadastrar a empresa.');
  const token = await user.getIdToken();
  const response = await fetch('/api/companies', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(companyData),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.company) {
    throw new Error(data.error || 'Não foi possível cadastrar a empresa.');
  }
  return data.company as CompanyStartup;
}

/** Update company environment */


export async function updateCompanyEnvironmentInFirebase(
  companyId: string, 
  environment: 'development' | 'production',
  kyc_status?: 'pending' | 'submitted' | 'verified'
) {
  try {
    const docRef = doc(db, COLLECTIONS.COMPANIES, companyId);
    const now = new Date().toISOString();
    const updateData: any = {
      environment,
      updatedAt: now
    };
    if (kyc_status) {
      updateData.kyc_status = kyc_status;
    }
    await updateDoc(docRef, sanitizeForFirestore(updateData));

    // Sincroniza também no perfil do dono se for a empresa ativa
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      const ownerId = data.ownerId || data.submittedBy;
      if (ownerId && ownerId !== DEFAULT_USER_ID) {
        try {
          await updateDoc(doc(db, COLLECTIONS.PROFILES, ownerId), {
            environment,
            updatedAt: now
          });
        } catch (e) {}
      }
    }

    return { success: true, environment };
  } catch (err: any) {
    console.error('Erro ao atualizar ambiente da empresa:', err);
    throw err;
  }
}

/**
 * Approve a Company in Firestore & Provision Asaas Subaccount (Admin Action)
 */
export async function approveCompanyInFirebase(companyId: string) {
  return callAdminAction('approve-company', { id: companyId, type: 'company' });
}

/** Reject a Company */


export async function rejectCompanyInFirebase(companyId: string, reason: string = 'Dados da empresa necessitam de revisão') {
  return callAdminAction('reject-entity', { id: companyId, type: 'company', reason });
}

export async function approveCompanyProfileEditRequestInFirebase(companyId: string) {
  return callAdminAction('approve-profile-edit', { id: companyId, type: 'company' });
}

export async function rejectCompanyProfileEditRequestInFirebase(companyId: string, reason: string) {
  return callAdminAction('reject-profile-edit', { id: companyId, type: 'company', reason });
}

export async function requestCompanyProfileEditInFirebase(reason: string) {
  const user = auth.currentUser;
  if (!user) throw new Error('Faça login novamente para solicitar um ajuste.');
  const token = await user.getIdToken();
  const response = await fetch('/api/profile/edit-request', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ reason }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Não foi possível solicitar o ajuste.');
  return data;
}

/** Update a Company in Firestore */


export async function updateCompanyInFirebase(companyId: string, updates: Partial<CompanyStartup>) {
  const docRef = doc(db, COLLECTIONS.COMPANIES, companyId);
  await updateDoc(docRef, sanitizeForFirestore(updates));
}

/**
 * Delete a Company and its plans in Firestore
 */
export async function deleteCompanyInFirebase(companyId: string) {
  const user = auth.currentUser;
  if (!user) throw new Error('Faça login novamente para remover a empresa.');
  const token = await user.getIdToken();
  const response = await fetch('/api/companies', {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ companyId }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Não foi possível arquivar a empresa.');
  return data;
}



// ==========================================
// 📦 PRODUTOS & OFERTAS (COMPANY PLANS)
// ==========================================

/**
 * Realtime Plans / Platforms Listener
 */
export function subscribePlans(callback: (plans: CompanyPlan[]) => void, companyId?: string) {
  const q = companyId 
    ? query(collection(db, COLLECTIONS.PLANS), where("companyId", "==", companyId))
    : collection(db, COLLECTIONS.PLANS);
  return onSnapshot(q, (snap) => {
    const list: CompanyPlan[] = [];
    snap.forEach((d) => {
      const data = d.data() as Omit<CompanyPlan, 'id'> & { archived?: boolean; isArchived?: boolean };
      if (data.archived === true || data.isArchived === true) return;
      list.push({ id: d.id, ...data });
    });
    list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    callback(list);
  }, (err) => {
    console.error('Firestore plans listener error:', err);
    callback([]);
  });
}

// Alias for compatibility
export const subscribePlatforms = subscribePlans;

/**
 * Get a Plan by ID or Slug directly from Firestore
 */
export async function getCompanyPlanByIdOrSlug(idOrSlug: string): Promise<CompanyPlan | null> {
  const cleanId = String(idOrSlug || '').trim();
  if (!cleanId || !/^[A-Za-z0-9_-]{1,150}$/.test(cleanId)) return null;

  try {
    const response = await fetch(`/api/plans?lookup=${encodeURIComponent(cleanId)}`, {
      method: 'GET',
      cache: 'no-store',
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.plan) return null;
    return data.plan as CompanyPlan;
  } catch (err) {
    console.error('Error fetching public product:', err);
    return null;
  }
}

/**
 * Create a new Plan / Product in Firestore (Multi-tenant Isolated)
 */
export async function createCompanyPlanInFirebase(planData: Omit<CompanyPlan, 'id' | 'createdAt'>) {
  if (!planData.companyId || planData.companyId === 'comp-default' || planData.companyId === 'comp_default') {
    throw new Error('companyId é obrigatório para cadastrar um produto.');
  }
  const user = auth.currentUser;
  if (!user) throw new Error('Faça login novamente para cadastrar uma oferta.');
  const token = await user.getIdToken();
  const res = await fetch('/api/plans', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(planData)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.plan) throw new Error(data.error || 'Não foi possível cadastrar a oferta.');
  return data.plan as CompanyPlan;
}

// Alias
export const createPlatformInFirebase = createCompanyPlanInFirebase;

/**
 * Archive a Product through the secure backend
 */
export async function deleteCompanyPlanInFirebase(planId: string, companyId?: string) {
  const user = auth.currentUser;
  if (!user) throw new Error('Faça login novamente para arquivar o produto.');

  const token = await user.getIdToken();
  const response = await fetch('/api/plans', {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ planId, companyId }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Não foi possível arquivar o produto.');
  return data;
}

export const deletePlatformInFirebase = (planId: string) => deleteCompanyPlanInFirebase(planId);

/**
 * Update Product through the secure backend
 */
export async function updateCompanyPlanInFirebase(planId: string, updates: Partial<CompanyPlan>) {
  const user = auth.currentUser;
  if (!user) throw new Error('Faça login novamente para atualizar a oferta.');
  const token = await user.getIdToken();
  const response = await fetch('/api/plans', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ id: planId, ...sanitizeForFirestore(updates) }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.plan) throw new Error(data.error || 'Não foi possível atualizar a oferta.');
  return data.plan as CompanyPlan;
}

export async function getCompanyPlanDeliverySettings(planId: string): Promise<{
  deliveryType: ProductDeliveryType;
  deliveryUrl: string;
  deliveryInstructions: string;
}> {
  const user = auth.currentUser;
  if (!user) throw new Error('Faça login novamente para carregar a configuração de entrega.');
  const token = await user.getIdToken();
  const response = await fetch(`/api/plans?planId=${encodeURIComponent(planId)}&includeDelivery=1`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    cache: 'no-store',
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.delivery) {
    throw new Error(data.error || 'Não foi possível carregar a configuração de entrega.');
  }
  return {
    deliveryType: data.delivery.deliveryType || 'redirect',
    deliveryUrl: data.delivery.deliveryUrl || '',
    deliveryInstructions: data.delivery.deliveryInstructions || '',
  };
}

export const updatePlatformInFirebase = updateCompanyPlanInFirebase;

// ==========================================
// 🤝 AFILIAÇÕES DE USUÁRIOS (AFFILIATIONS)
// ==========================================

/**
 * Realtime User Affiliations Listener
 */
export function subscribeUserAffiliations(callback: (affiliations: UserAffiliation[]) => void, userId?: string) {
  if (!userId || userId.trim() === '') {
    callback([]);
    return () => {};
  }
  const q = query(collection(db, COLLECTIONS.AFFILIATIONS), where("userId", "==", userId));
  return onSnapshot(q, (snap) => {
    const list: UserAffiliation[] = [];
    snap.forEach((d) => {
      const data = d.data() as UserAffiliation;
      list.push({ id: d.id, ...data });
    });
    list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    callback(list);
  }, (err) => {
    console.error('Firestore affiliations listener error:', err);
    callback([]);
  });
}

/**
 * Realtime All Affiliations Listener (for Company & Superadmin dashboards)
 */
export function subscribeAllAffiliations(callback: (affiliations: UserAffiliation[]) => void, companyId?: string) {
  const q = companyId 
    ? query(collection(db, COLLECTIONS.AFFILIATIONS), where("companyId", "==", companyId))
    : collection(db, COLLECTIONS.AFFILIATIONS);
  return onSnapshot(q, (snap) => {
    const list: UserAffiliation[] = [];
    snap.forEach((d) => {
      const data = d.data() as UserAffiliation;
      list.push({ id: d.id, ...data });
    });
    list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    callback(list);
  }, (err) => {
    console.error('Firestore all affiliations listener error:', err);
    callback([]);
  });
}

/**
 * Create a new Affiliation in Firebase (User joins a Plan)
 */
export async function createAffiliationInFirebase(plan: CompanyPlan, _userProfile: UserSellerProfile) {
  const user = auth.currentUser;
  if (!user) throw new Error('Faça login novamente para se afiliar.');
  const token = await user.getIdToken();
  const response = await fetch('/api/affiliates/join', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ planId: plan.id })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success || !data.affiliation) throw new Error(data.error || 'Não foi possível concluir a afiliação.');
  return data.affiliation as UserAffiliation;
}

/**
 * Remove an Affiliation
 */
export async function deleteAffiliationInFirebase(affiliationId: string, _planId?: string, _companyId?: string) {
  const user = auth.currentUser;
  if (!user) throw new Error('Faça login novamente para encerrar a afiliação.');

  const token = await user.getIdToken();
  const response = await fetch('/api/affiliates/leave', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ affiliationId }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Não foi possível encerrar a afiliação.');
  }
  return data;
}

/**
 * Find an affiliation by affiliate code
 */
export async function findAffiliationByCode(code: string): Promise<UserAffiliation | null> {
  try {
    const clean = code.trim();
    if (!clean) return null;
    const q1 = query(collection(db, COLLECTIONS.AFFILIATIONS), where("affiliateCode", "==", clean));
    const snap1 = await getDocs(q1);
    if (!snap1.empty) {
      const docData = snap1.docs[0].data() as UserAffiliation;
      return { id: snap1.docs[0].id, ...docData };
    }
    const q2 = query(collection(db, COLLECTIONS.AFFILIATIONS), where("affiliate_code", "==", clean));
    const snap2 = await getDocs(q2);
    if (!snap2.empty) {
      const docData = snap2.docs[0].data() as UserAffiliation;
      return { id: snap2.docs[0].id, ...docData };
    }
    return null;
  } catch (err) {
    console.warn('Erro ao buscar afiliação por código:', err);
    return null;
  }
}

// ==========================================
// 💰 VENDAS & COMISSÕES (SALES)
// ==========================================

/**
 * Realtime Sales Listener
 */
export function subscribeSales(
  callback: (sales: SaleTransaction[]) => void,
  companyId?: string,
  affiliateId?: string
) {
  const q = companyId
    ? query(collection(db, COLLECTIONS.SALES), where("companyId", "==", companyId))
    : affiliateId
      ? query(collection(db, COLLECTIONS.SALES), where("affiliateId", "==", affiliateId))
      : collection(db, COLLECTIONS.SALES);
  return onSnapshot(q, (snap) => {
    const list: SaleTransaction[] = [];
    snap.forEach((d) => {
      list.push({ id: d.id, ...(d.data() as Omit<SaleTransaction, 'id'>) });
    });
    list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    callback(list);
  }, (err) => {
    console.error('Firestore sales listener error:', err);
    callback([]);
  });
}

// ==========================================
// 🏧 SAQUES VIA STRIPE CONNECT (WITHDRAWALS)
// ==========================================

/**
 * Realtime Withdrawals Listener (Filtered strictly by user unless superadmin)
 */
export function subscribeWithdrawals(callback: (withdrawals: WithdrawalRequest[]) => void, userId?: string, companyId?: string) {
  let q: any = collection(db, COLLECTIONS.WITHDRAWALS);
  if (companyId) {
    q = query(collection(db, COLLECTIONS.WITHDRAWALS), where("companyId", "==", companyId));
  } else if (userId) {
    q = query(collection(db, COLLECTIONS.WITHDRAWALS), where("userId", "==", userId));
  }

  return onSnapshot(q, (snap: any) => {
    const list: WithdrawalRequest[] = [];
    snap.forEach((d: any) => {
      const data = d.data() as Omit<WithdrawalRequest, 'id'>;
      if (companyId) {
        if ((data as any).companyId === companyId) {
          list.push({ id: d.id, ...data });
        }
      } else if (!userId || data.userId === userId || (data as any).user_id === userId) {
        list.push({ id: d.id, ...data });
      }
    });
    list.sort((a, b) => (b.createdAt || b.completedAt || b.requestedAt || '').localeCompare(a.createdAt || a.completedAt || a.requestedAt || ''));
    callback(list);
  }, (err: any) => {
    console.error('Firestore withdrawals listener error:', err);
    callback([]);
  });
}

/**
 * Request Withdrawal via Secure Backend Endpoint (/api/withdrawals/request)
 */
export async function requestWithdrawalViaBackend(
  amount: number,
  role: 'empresa' | 'afiliado'
): Promise<{ success: boolean; withdrawal: WithdrawalRequest; message?: string }> {
  const user = auth.currentUser;
  if (!user) throw new Error('Faça login novamente para solicitar o saque.');
  const token = await user.getIdToken();
  const response = await fetch('/api/withdrawals/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ amount, role })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.error === true) throw new Error(data.message || data.error || 'Erro ao processar solicitação de saque');
  return data;
}

// ==========================================
// 🎨 PLATFORM BRANDING & LOGO SETTINGS
// ==========================================

export interface PlatformBranding {
  logoUrl?: string;
  logoType?: 'default_vector' | 'custom_image' | 'preset_neon_circle' | 'preset_3d_star';
  logoText?: string;
  logoSubtext?: string;
  accentColor?: string;
  hideTextWithCustomLogo?: boolean;
  logoImageWidth?: number;
  updatedAt?: string;
  updatedBy?: string;
}

const BRANDING_DOC_ID = 'branding';
const LOCAL_BRANDING_KEY = 'leadspay_platform_branding';

export function getLocalBranding(): PlatformBranding | null {
  try {
    const saved = localStorage.getItem(LOCAL_BRANDING_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    // ignore
  }
  return null;
}

export function subscribePlatformBranding(callback: (branding: PlatformBranding) => void) {
  // Chamada inicial imediata com cache local se existir
  const local = getLocalBranding();
  if (local) callback(local);

  const docRef = doc(db, COLLECTIONS.SETTINGS, BRANDING_DOC_ID);
  return onSnapshot(docRef, (snap) => {
    if (snap.exists()) {
      const data = snap.data() as PlatformBranding;
      try {
        localStorage.setItem(LOCAL_BRANDING_KEY, JSON.stringify(data));
      } catch (_) {}
      callback(data);
    } else {
      const defaultBranding: PlatformBranding = {
        logoType: 'preset_3d_star',
        logoText: 'LEADSPAY',
        logoSubtext: 'PAYMENTS & SPLIT',
        accentColor: '#D9F22A'
      };
      callback(defaultBranding);
    }
  }, (err) => {
    console.warn('Erro ao escutar platform_settings/branding:', err);
    if (local) callback(local);
  });
}

export async function savePlatformBranding(
  branding: Partial<PlatformBranding>, 
  updatedBy?: string
): Promise<PlatformBranding> {
  const docRef = doc(db, COLLECTIONS.SETTINGS, BRANDING_DOC_ID);
  const now = new Date().toISOString();
  
  const payload: PlatformBranding = {
    ...branding,
    updatedAt: now,
    updatedBy: updatedBy || 'admin'
  };

  const cleanPayload = sanitizeForFirestore(payload);
  await setDoc(docRef, cleanPayload, { merge: true });

  try {
    const current = getLocalBranding() || {};
    localStorage.setItem(LOCAL_BRANDING_KEY, JSON.stringify({ ...current, ...cleanPayload }));
  } catch (_) {}

  // Dispara evento global para que todos os componentes atualizem imediatamente
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('leadspay_branding_updated', { detail: cleanPayload }));
  }

  return payload;
}

// ==========================================
// 🖼️ AUTH MODAL BACKGROUNDS & SHOWCASE SETTINGS
// ==========================================

export interface AuthModalSettings {
  // As 3 imagens de fundo oficiais dos modais desktop/web:
  loginBgUrl?: string; // Fundo da tela de Login / Recuperação
  affiliateBgUrl?: string; // Fundo do Cadastro de Afiliado
  companyBgUrl?: string; // Fundo do Cadastro de Empresa
  // 📱 Imagens de Fundo dos Slides Mobile (Pague com simplicidade & Sua empresa vai mais longe)
  mobileSlidePaymentBgUrl?: string; // Slide 2: "Pague com simplicidade."
  mobileSlideCompanyBgUrl?: string; // Slide 3: "Sua empresa vai mais longe."
  mobileSlideAuraBgUrl?: string;    // Slide 1: "Seu crescimento começa aqui."
  // Chaves legadas para compatibilidade retroativa
  loginShowcaseUrl?: string;
  affiliateShowcaseUrl?: string;
  companyShowcaseUrl?: string;
  forgotPasswordShowcaseUrl?: string;
  overlayDarkness?: number; // Opacidade do overlay (ex: 75 = 75% escuro)
  updatedAt?: string;
  updatedBy?: string;
}

const MODAL_IMAGES_DOC_ID = 'modal_backgrounds';
const LOCAL_MODAL_IMAGES_KEY = 'leadspay_modal_backgrounds';

export function getLocalAuthModalSettings(): AuthModalSettings {
  try {
    const saved = localStorage.getItem(LOCAL_MODAL_IMAGES_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    // ignore
  }
  return {
    loginBgUrl: '',
    affiliateBgUrl: '',
    companyBgUrl: '',
    mobileSlidePaymentBgUrl: '',
    mobileSlideCompanyBgUrl: '',
    mobileSlideAuraBgUrl: '',
    overlayDarkness: 75
  };
}

export function subscribeAuthModalSettings(callback: (settings: AuthModalSettings) => void) {
  const local = getLocalAuthModalSettings();
  callback(local);

  const docRef = doc(db, COLLECTIONS.SETTINGS, MODAL_IMAGES_DOC_ID);
  return onSnapshot(docRef, (snap) => {
    if (snap.exists()) {
      const data = snap.data() as AuthModalSettings;
      try {
        localStorage.setItem(LOCAL_MODAL_IMAGES_KEY, JSON.stringify(data));
      } catch (_) {}
      callback(data);
    } else {
      callback(local);
    }
  }, (err) => {
    console.warn('Erro ao escutar platform_settings/modal_backgrounds:', err);
    callback(local);
  });
}

export async function saveAuthModalSettings(
  settings: Partial<AuthModalSettings>,
  updatedBy?: string
): Promise<AuthModalSettings> {
  const docRef = doc(db, COLLECTIONS.SETTINGS, MODAL_IMAGES_DOC_ID);
  const now = new Date().toISOString();

  const currentLocal = getLocalAuthModalSettings();
  const mergedSettings: AuthModalSettings = {
    ...currentLocal,
    ...settings,
    updatedAt: now,
    updatedBy: updatedBy || 'admin'
  };

  const cleanPayload = sanitizeForFirestore(mergedSettings);

  // 1. Sempre grava imediatamente no cache local (garante persistência mesmo com internet lenta ou quotas)
  try {
    localStorage.setItem(LOCAL_MODAL_IMAGES_KEY, JSON.stringify(cleanPayload));
  } catch (err) {
    console.warn('Erro ao salvar imagens no localStorage:', err);
  }

  // 2. Dispara evento de atualização em tempo real para todos os componentes
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('leadspay_modal_backgrounds_updated', { detail: cleanPayload }));
  }

  // 3. Salva no banco de dados Firestore
  try {
    await setDoc(docRef, cleanPayload, { merge: true });
  } catch (firestoreErr) {
    console.warn('Erro ao persistir no Firestore:', firestoreErr);
  }

  return mergedSettings;
}

/* ==========================================================================
   MÓDULO DE CLIENTES (ETAPA 2 - LEADSPAY)
   ========================================================================== */

const LOCAL_CLIENTS_KEY = 'leadspay_clients_cache';

export function getLocalClients(): PlatformClient[] {
  try {
    const raw = localStorage.getItem(LOCAL_CLIENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function subscribeClients(
  storeId: string | undefined,
  callback: (clients: PlatformClient[]) => void
): () => void {
  const local = getLocalClients();
  if (local.length > 0) {
    if (storeId) {
      callback(local.filter(c => c.store_id === storeId));
    } else {
      callback(local);
    }
  }

  const clientsColl = collection(db, COLLECTIONS.CLIENTS);
  const q = storeId 
    ? query(clientsColl, where("companyId", "==", storeId))
    : query(clientsColl, orderBy('created_at', 'desc'));

  return onSnapshot(q, (snapshot) => {
    const clients: PlatformClient[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      clients.push({
        id: docSnap.id,
        store_id: data.store_id || data.companyId || data.empresa_id || 'store_default',
        empresa_id: data.empresa_id || data.companyId || data.store_id || 'store_default',
        companyId: data.companyId || data.store_id || data.empresa_id || 'store_default',
        name: data.name || data.nome_completo || 'Cliente Sem Nome',
        nome_completo: data.nome_completo || data.name || 'Cliente Sem Nome',
        email: data.email || '',
        phone: data.phone || data.celular || '',
        celular: data.celular || data.phone || '',
        document: data.document || data.cpf_cnpj || '',
        cpf_cnpj: data.cpf_cnpj || data.document || '',
        created_at: data.created_at || data.data_criacao || new Date().toISOString(),
        data_criacao: data.data_criacao || data.created_at || new Date().toISOString(),
        total_spent: Number(data.total_spent || data.valor_pedido) || 0,
        valor_pedido: Number(data.valor_pedido || data.total_spent) || 0,
        orders_count: Number(data.orders_count) || 1,
        last_order_at: data.last_order_at || data.created_at,
        last_plan_name: data.last_plan_name || '',
        status_compra: data.status_compra || data.status || 'PAGO',
        status: data.status || data.status_compra || 'PAGO',
        is_test: data.is_test ?? false,
        environment: data.environment || 'production'
      });
    });

    try {
      localStorage.setItem(LOCAL_CLIENTS_KEY, JSON.stringify(clients));
    } catch (_) {}

    if (storeId) {
      callback(clients.filter(c => c.store_id === storeId || c.companyId === storeId || c.empresa_id === storeId));
    } else {
      callback(clients);
    }
  }, (err) => {
    console.warn('Erro ao escutar coleção clients no Firestore:', err);
    if (local.length > 0) {
      callback(storeId ? local.filter(c => c.store_id === storeId || c.companyId === storeId || c.empresa_id === storeId) : local);
    }
  });
}

export async function createOrUpdateClientInFirebase(clientData: {
  store_id: string;
  name: string;
  email: string;
  phone?: string;
  document?: string;
  total_spent?: number;
  valor_pedido?: number;
  last_plan_name?: string;
  status_compra?: string;
  status?: string;
  is_test?: boolean;
  environment?: 'development' | 'production';
}): Promise<PlatformClient> {
  const now = new Date().toISOString();
  const cleanEmail = (clientData.email || '').trim().toLowerCase();
  const cleanDoc = (clientData.document || '').replace(/\D/g, '');
  const cleanPhone = (clientData.phone || '').trim();
  const targetStoreId = clientData.store_id || 'store_default';
  const isTest = clientData.is_test ?? true;
  const env = clientData.environment || (isTest ? 'development' : 'production');
  const statusCompra = clientData.status_compra || clientData.status || 'PIX_GERADO';

  // ID previsível e seguro baseado na loja + email/doc
  const safeDocKey = cleanDoc || cleanEmail.replace(/[^a-zA-Z0-9]/g, '_');
  const clientId = `cli_${targetStoreId.slice(0, 10)}_${safeDocKey}`;
  const clientDocRef = doc(db, COLLECTIONS.CLIENTS, clientId);

  try {
    const existingSnap = await getDoc(clientDocRef);
    if (existingSnap.exists()) {
      const prevData = existingSnap.data();
      const updatedTotal = (Number(prevData.total_spent) || 0) + (Number(clientData.total_spent) || 0);
      const updatedCount = (Number(prevData.orders_count) || 1) + 1;

      const payload: Partial<PlatformClient> = {
        name: clientData.name || prevData.name,
        nome_completo: clientData.name || prevData.name,
        email: cleanEmail || prevData.email,
        phone: cleanPhone || prevData.phone,
        celular: cleanPhone || prevData.phone,
        document: cleanDoc || prevData.document,
        cpf_cnpj: cleanDoc || prevData.document,
        total_spent: updatedTotal,
        valor_pedido: Number(clientData.total_spent) || updatedTotal,
        orders_count: updatedCount,
        last_order_at: now,
        last_plan_name: clientData.last_plan_name || prevData.last_plan_name,
        status_compra: statusCompra,
        status: statusCompra,
        is_test: isTest,
        environment: env
      };

      await updateDoc(clientDocRef, sanitizeForFirestore(payload));
      return {
        id: clientId,
        store_id: targetStoreId,
        empresa_id: targetStoreId,
        name: payload.name!,
        nome_completo: payload.name!,
        email: payload.email!,
        phone: payload.phone,
        celular: payload.phone,
        document: payload.document,
        cpf_cnpj: payload.document,
        created_at: prevData.created_at || now,
        data_criacao: prevData.created_at || now,
        total_spent: updatedTotal,
        valor_pedido: payload.valor_pedido,
        orders_count: updatedCount,
        last_order_at: now,
        last_plan_name: payload.last_plan_name,
        status_compra: statusCompra,
        status: statusCompra,
        is_test: isTest,
        environment: env
      };
    } else {
      const newClient: PlatformClient = {
        id: clientId,
        store_id: targetStoreId,
        empresa_id: targetStoreId,
        name: clientData.name.trim(),
        nome_completo: clientData.name.trim(),
        email: cleanEmail,
        phone: cleanPhone,
        celular: cleanPhone,
        document: cleanDoc,
        cpf_cnpj: cleanDoc,
        created_at: now,
        data_criacao: now,
        total_spent: Number(clientData.total_spent) || 0,
        valor_pedido: Number(clientData.total_spent) || 0,
        orders_count: 1,
        last_order_at: now,
        last_plan_name: clientData.last_plan_name || '',
        status_compra: statusCompra,
        status: statusCompra,
        is_test: isTest,
        environment: env
      };

      await setDoc(clientDocRef, sanitizeForFirestore(newClient));
      return newClient;
    }
  } catch (error: any) {
    console.warn('Erro ao salvar cliente no Firestore, salvando no cache local:', error);
    const newClient: PlatformClient = {
      id: clientId,
      store_id: targetStoreId,
      empresa_id: targetStoreId,
      name: clientData.name.trim(),
      nome_completo: clientData.name.trim(),
      email: cleanEmail,
      phone: cleanPhone,
      celular: cleanPhone,
      document: cleanDoc,
      cpf_cnpj: cleanDoc,
      created_at: now,
      data_criacao: now,
      total_spent: Number(clientData.total_spent) || 0,
      valor_pedido: Number(clientData.total_spent) || 0,
      orders_count: 1,
      last_order_at: now,
      last_plan_name: clientData.last_plan_name || '',
      status_compra: statusCompra,
      status: statusCompra,
      is_test: isTest,
      environment: env
    };

    try {
      const local = getLocalClients();
      const existingIdx = local.findIndex(c => c.id === clientId);
      if (existingIdx >= 0) {
        local[existingIdx] = { ...local[existingIdx], ...newClient };
      } else {
        local.unshift(newClient);
      }
      localStorage.setItem(LOCAL_CLIENTS_KEY, JSON.stringify(local));
    } catch (_) {}

    return newClient;
  }
}

export async function createManualClientInFirebase(
  clientData: Omit<PlatformClient, 'id' | 'created_at'>
): Promise<PlatformClient> {
  const now = new Date().toISOString();
  const cleanEmail = (clientData.email || '').trim().toLowerCase();
  const cleanDoc = (clientData.document || '').replace(/\D/g, '');
  const targetStoreId = clientData.store_id || 'store_default';
  const safeDocKey = cleanDoc || cleanEmail.replace(/[^a-zA-Z0-9]/g, '_') || `man_${Date.now()}`;
  const clientId = `cli_${targetStoreId.slice(0, 10)}_${safeDocKey}`;
  const clientDocRef = doc(db, COLLECTIONS.CLIENTS, clientId);

  const newClient: PlatformClient = {
    id: clientId,
    store_id: targetStoreId,
    name: clientData.name.trim(),
    email: cleanEmail,
    phone: (clientData.phone || '').trim(),
    document: cleanDoc,
    created_at: now,
    total_spent: Number(clientData.total_spent) || 0,
    orders_count: Number(clientData.orders_count) || 0,
    last_order_at: now,
    last_plan_name: clientData.last_plan_name || 'Cadastro Manual',
    status_compra: clientData.status_compra || clientData.status || 'PENDENTE',
    status: clientData.status || clientData.status_compra || 'PENDENTE'
  };

  try {
    await setDoc(clientDocRef, sanitizeForFirestore(newClient));
  } catch (err) {
    console.warn('Fallback para cache local ao cadastrar cliente:', err);
    const local = getLocalClients();
    local.unshift(newClient);
    try {
      localStorage.setItem(LOCAL_CLIENTS_KEY, JSON.stringify(local));
    } catch (_) {}
  }

  return newClient;
}

export async function deleteClientInFirebase(clientId: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTIONS.CLIENTS, clientId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Erro ao deletar cliente no Firestore:', err);
  }
  try {
    const local = getLocalClients().filter(c => c.id !== clientId);
    localStorage.setItem(LOCAL_CLIENTS_KEY, JSON.stringify(local));
  } catch (_) {}
}

/**
 * Atualizar status de uma transação no Firestore (ex: de Pendente para Recusado ao expirar QR Code)
 */
export async function updateSaleStatusInFirebase(
  saleId: string,
  status: 'Aprovado' | 'Pendente' | 'Recusado' | 'Cancelado',
  reason?: string
): Promise<void> {
  try {
    const saleRef = doc(db, COLLECTIONS.SALES, saleId);
    await updateDoc(saleRef, sanitizeForFirestore({
      status,
      updatedAt: new Date().toISOString(),
      ...(reason ? { failureReason: reason } : {})
    }));
  } catch (err) {
    console.warn(`Erro ao atualizar status da transação ${saleId}:`, err);
  }
}

/**
 * Deletar transação de venda no Firestore
 */
export async function deleteSaleTransactionInFirebase(saleId: string): Promise<void> {
  try {
    const saleRef = doc(db, COLLECTIONS.SALES, saleId);
    await deleteDoc(saleRef);
  } catch (err) {
    console.warn(`Erro ao excluir transação ${saleId}:`, err);
  }
}

/**
 * Deletar cobrança e o cliente associado no Firestore e localStorage
 */
export async function deleteChargeAndClientInFirebase(
  saleId: string,
  clientEmail?: string,
  clientDocument?: string
): Promise<{ success: boolean }> {
  try {
    // 1. Excluir transação de venda
    if (saleId) {
      await deleteSaleTransactionInFirebase(saleId);
    }

    // 2. Excluir cliente correspondente por e-mail ou documento
    const cleanEmail = (clientEmail || '').trim().toLowerCase();
    const cleanDoc = (clientDocument || '').replace(/\D/g, '');

    if (cleanEmail || cleanDoc) {
      try {
        const clientsRef = collection(db, COLLECTIONS.CLIENTS);
        const snap = await getDocs(clientsRef);
        for (const d of snap.docs) {
          const cData = d.data();
          const cEmail = (cData.email || '').trim().toLowerCase();
          const cDoc = (cData.document || cData.cpf_cnpj || '').replace(/\D/g, '');
          if ((cleanEmail && cEmail === cleanEmail) || (cleanDoc && cDoc === cleanDoc)) {
            await deleteDoc(d.ref);
          }
        }
      } catch (clientErr) {
        console.warn('Aviso ao deletar cliente no Firestore:', clientErr);
      }

      // Limpar também do localStorage de clientes
      try {
        const local = getLocalClients().filter(c => {
          const cEmail = (c.email || '').trim().toLowerCase();
          const cDoc = (c.document || c.cpf_cnpj || '').replace(/\D/g, '');
          if (cleanEmail && cEmail === cleanEmail) return false;
          if (cleanDoc && cDoc === cleanDoc) return false;
          return true;
        });
        localStorage.setItem(LOCAL_CLIENTS_KEY, JSON.stringify(local));
      } catch (_) {}
    }

    return { success: true };
  } catch (err) {
    console.error('Erro ao deletar cobrança e cliente:', err);
    return { success: false };
  }
}

export interface CouponItem {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  value: number;
  maxUses: number;
  usedCount: number;
  expiresAt: string;
  status: 'active' | 'expired' | 'paused';
  applicablePlans: string[]; // ['all'] or array of plan IDs
  applicablePlansNames?: string[];
  applicableAffiliates: string[]; // ['all'] or array of affiliate codes or IDs
  applicableAffiliatesNames?: string[];
  companyId?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Operações de Cupons no Firestore
 */
export async function saveCouponToFirebase(coupon: CouponItem, companyId?: string): Promise<void> {
  try {
    const couponId = coupon.id || `cup_${Date.now()}`;
    const cleanCoupon = sanitizeForFirestore({
      ...coupon,
      id: couponId,
      code: coupon.code.toUpperCase().trim(),
      companyId: companyId || coupon.companyId || 'global',
      updatedAt: new Date().toISOString()
    });
    await setDoc(doc(db, 'coupons', couponId), cleanCoupon, { merge: true });
    console.log(`✅ [Firestore Cupons] Cupom ${cleanCoupon.code} salvo com sucesso no Firestore!`);
  } catch (err) {
    console.warn('Erro ao salvar cupom no Firestore:', err);
  }
}

export async function deleteCouponInFirebase(couponId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'coupons', couponId));
    console.log(`✅ [Firestore Cupons] Cupom ${couponId} removido do Firestore.`);
  } catch (err) {
    console.warn('Erro ao remover cupom do Firestore:', err);
  }
}

export async function getCouponsFromFirebase(companyId?: string): Promise<CouponItem[]> {
  try {
    const couponsColl = collection(db, 'coupons');
    let q = query(couponsColl);
    if (companyId) {
      q = query(couponsColl, where('companyId', 'in', [companyId, 'global', 'all']));
    }
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
  } catch (err) {
    console.warn('Erro ao listar cupons do Firestore:', err);
    return [];
  }
}

export async function findCouponByCodeInFirebase(code: string): Promise<CouponItem | null> {
  try {
    const cleanCode = code.toUpperCase().trim();
    const q = query(collection(db, 'coupons'), where('code', '==', cleanCode));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const docData = snap.docs[0].data() as CouponItem;
      return { id: snap.docs[0].id, ...docData };
    }
  } catch (err) {
    console.warn('Erro ao buscar cupom no Firestore:', err);
  }
  return null;
}

