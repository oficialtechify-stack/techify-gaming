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
import { db } from '../lib/firebase';
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
  VerificationRequest
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
  VerificationRequest
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
  WITHDRAWALS: 'withdrawals',
  PROFILES: 'user_profiles',
  AFFILIATE_LINKS: 'affiliate_links',
  TEAM: 'team_members',
  VERIFICATIONS: 'verification_requests',
  PLATFORM_FINANCES: 'platform_finances',
  SETTINGS: 'platform_settings'
};

export const DEFAULT_USER_ID = 'usr_techify_main';

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
export async function clearAllFirestoreData() {
  try {
    const collectionsToClear = [
      COLLECTIONS.COMPANIES,
      COLLECTIONS.PLANS,
      COLLECTIONS.AFFILIATIONS,
      COLLECTIONS.SALES,
      COLLECTIONS.WITHDRAWALS,
      COLLECTIONS.AFFILIATE_LINKS,
      COLLECTIONS.TEAM
    ];

    for (const collName of collectionsToClear) {
      const collRef = collection(db, collName);
      const snap = await getDocs(collRef);
      for (const d of snap.docs) {
        await deleteDoc(d.ref);
      }
    }

    return { success: true, message: 'Todas as coleções e dados foram zerados com sucesso!' };
  } catch (error: any) {
    console.error('Erro ao limpar Firestore:', error);
    return { success: false, error: error.message };
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
  const now = new Date().toISOString();
  const effectiveUserId = userId || DEFAULT_USER_ID;
  const isCompany = profileData.verificationRoleType === 'empresa' || profileData.activeRoleMode === 'empresa' || !!profileData.companyName;
  
  // 1. Update the User's Profile to 'pending' and locked
  const profileRef = doc(db, COLLECTIONS.PROFILES, effectiveUserId);
  await setDoc(profileRef, sanitizeForFirestore({
    ...profileData,
    hasCompanyProfile: isCompany ? true : profileData.hasCompanyProfile,
    verificationStatus: 'pending',
    verified: false,
    verificationSubmittedAt: now,
    updatedAt: now
  }), { merge: true });

  // 2. Add / Update document in verification_requests collection
  const requestRef = doc(db, COLLECTIONS.VERIFICATIONS, effectiveUserId);
  const fullName = `${profileData.firstName || ''} ${profileData.lastName || ''}`.trim() || profileData.name || 'Usuário LeadsPay';
  
  await setDoc(requestRef, sanitizeForFirestore({
    id: effectiveUserId,
    userId: effectiveUserId,
    name: fullName,
    firstName: profileData.firstName || '',
    lastName: profileData.lastName || '',
    email: profileData.email || '',
    cpf: profileData.cpf || '',
    phone: profileData.phone || profileData.whatsapp || '',
    avatar: profileData.avatar || '',
    roleType: isCompany ? 'empresa' : 'afiliado',
    companyName: profileData.companyName || '',
    companyLegalName: profileData.companyLegalName || '',
    companyCnpj: profileData.companyCnpj || profileData.cnpj || '',
    companyCategory: profileData.companyCategory || 'SaaS / B2B',
    companyTagline: profileData.companyTagline || '',
    companyWebsite: profileData.companyWebsite || '',
    companyLogo: profileData.companyLogo || profileData.avatar || '',
    companyPhone: profileData.companyPhone || profileData.whatsapp || '',
    companyAddress: profileData.companyAddress || profileData.address || '',
    companyCep: profileData.companyCep || profileData.cep || '',
    companyState: profileData.companyState || profileData.state || '',
    companyCity: profileData.companyCity || profileData.city || '',
    companyCountry: profileData.companyCountry || profileData.country || 'Brazil',
    companyDocType: profileData.companyDocType || 'CNPJ',
    cep: profileData.cep || '',
    country: profileData.country || 'Brazil',
    state: profileData.state || '',
    city: profileData.city || '',
    address: profileData.address || '',
    status: 'pending',
    submittedAt: now
  }), { merge: true });

  // 3. If Company profile, create/update company in COMPANIES collection as pending
  if (isCompany && (profileData.companyName || profileData.name)) {
    const compName = profileData.companyName || profileData.name || 'Minha Startup';
    const compId = profileData.companyId || `comp-${effectiveUserId}`;
    const compRef = doc(db, COLLECTIONS.COMPANIES, compId);
    const compSnap = await getDoc(compRef);

    const slug = compName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-');

    const companyData: Partial<CompanyStartup> = {
      name: compName,
      slug: slug || compId,
      tagline: profileData.companyTagline || 'Startup homologada na plataforma',
      logo: profileData.companyLogo || profileData.avatar || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&h=200&fit=crop',
      bannerImage: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&h=400&fit=crop',
      category: profileData.companyCategory || 'SaaS / B2B',
      description: profileData.companyTagline || `Startup e soluções digitais de ${compName}`,
      website: profileData.companyWebsite || '',
      email: profileData.email || '',
      whatsapp: profileData.companyPhone || profileData.whatsapp || '',
      cnpj: profileData.companyCnpj || profileData.cnpj || '',
      cleanCnpj: (profileData.companyCnpj || profileData.cnpj || '').replace(/\D/g, ''),
      docType: profileData.companyDocType || 'CNPJ',
      status: 'pending',
      verified: false,
      submittedBy: effectiveUserId,
      submittedByName: fullName,
      submittedByEmail: profileData.email || '',
      submittedAt: now,
      ownerId: effectiveUserId
    };

    if (compSnap.exists()) {
      await updateDoc(compRef, sanitizeForFirestore(companyData));
    } else {
      await setDoc(compRef, sanitizeForFirestore({
        ...companyData,
        id: compId,
        totalPlansCount: 0,
        totalAffiliatesCount: 0,
        totalSalesVolume: 0,
        commissionRange: '10% - 50%',
        createdAt: now
      }));
    }

    // Link companyId back to profile
    await updateDoc(profileRef, sanitizeForFirestore({
      companyId: compId,
      companyName: compName
    }));
  }

  return { success: true, submittedAt: now };
}

/**
 * Realtime Listener for Verification Requests (Admin)
 */
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
  const now = new Date().toISOString();
  
  // 1. Update user profile to verified = true and verificationStatus = 'approved'
  const profileRef = doc(db, COLLECTIONS.PROFILES, userId);
  await setDoc(profileRef, {
    verified: true,
    verificationStatus: 'approved',
    verificationReviewedAt: now,
    verificationRejectionReason: null,
    updatedAt: now
  }, { merge: true });

  // 2. Update verification request record
  const requestRef = doc(db, COLLECTIONS.VERIFICATIONS, userId);
  await setDoc(requestRef, {
    status: 'approved',
    reviewedAt: now,
    rejectionReason: null
  }, { merge: true });

  // 3. Also approve any company owned by this user
  try {
    const compQ = query(collection(db, COLLECTIONS.COMPANIES), where('ownerId', '==', userId));
    const compSnap = await getDocs(compQ);
    for (const cDoc of compSnap.docs) {
      await updateDoc(cDoc.ref, {
        status: 'approved',
        verified: true,
        reviewedAt: now,
        rejectionReason: null
      });
    }
  } catch (err) {
    console.warn('Could not auto-approve owned companies:', err);
  }

  return { success: true };
}

/**
 * Reject Verification Request
 */
export async function rejectVerificationInFirebase(userId: string, reason: string = 'Dados cadastrais necessitam de correção') {
  const now = new Date().toISOString();

  // 1. Update user profile
  const profileRef = doc(db, COLLECTIONS.PROFILES, userId);
  await setDoc(profileRef, {
    verified: false,
    verificationStatus: 'rejected',
    verificationRejectionReason: reason,
    verificationReviewedAt: now,
    updatedAt: now
  }, { merge: true });

  // 2. Update verification request record
  const requestRef = doc(db, COLLECTIONS.VERIFICATIONS, userId);
  await setDoc(requestRef, {
    status: 'rejected',
    rejectionReason: reason,
    reviewedAt: now
  }, { merge: true });

  // 3. Also update company status
  try {
    const compQ = query(collection(db, COLLECTIONS.COMPANIES), where('ownerId', '==', userId));
    const compSnap = await getDocs(compQ);
    for (const cDoc of compSnap.docs) {
      await updateDoc(cDoc.ref, {
        status: 'rejected',
        verified: false,
        rejectionReason: reason,
        reviewedAt: now
      });
    }
  } catch (err) {
    console.warn('Could not update rejected status on owned companies:', err);
  }

  return { success: true };
}

/**
 * Ban / Suspend a User or Company in Firebase
 */
export async function banEntityInFirebase(id: string, type: 'user' | 'company', reason: string) {
  try {
    const res = await fetch('/api/admin/ban-entity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, type, reason })
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (apiErr) {
    console.warn('Backend ban API fallback to direct Firestore:', apiErr);
  }

  // Fallback direto
  const now = new Date().toISOString();
  if (type === 'company' || id.startsWith('comp-')) {
    await setDoc(doc(db, COLLECTIONS.COMPANIES, id), {
      status: 'banned',
      verified: false,
      banReason: reason,
      bannedAt: now
    }, { merge: true });
  } else {
    await setDoc(doc(db, COLLECTIONS.PROFILES, id), {
      status: 'banned',
      banned: true,
      banReason: reason,
      bannedAt: now
    }, { merge: true });

    await setDoc(doc(db, COLLECTIONS.VERIFICATIONS, id), {
      status: 'banned',
      banReason: reason,
      reviewedAt: now
    }, { merge: true });
  }
  return { success: true };
}

/**
 * Unban / Reactivate a User or Company in Firebase
 */
export async function unbanEntityInFirebase(id: string, type: 'user' | 'company') {
  try {
    const res = await fetch('/api/admin/unban-entity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, type })
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (apiErr) {
    console.warn('Backend unban API fallback to direct Firestore:', apiErr);
  }

  const now = new Date().toISOString();
  if (type === 'company' || id.startsWith('comp-')) {
    await setDoc(doc(db, COLLECTIONS.COMPANIES, id), {
      status: 'approved',
      verified: true,
      banReason: null,
      unbannedAt: now
    }, { merge: true });
  } else {
    await setDoc(doc(db, COLLECTIONS.PROFILES, id), {
      status: 'approved',
      banned: false,
      banReason: null,
      unbannedAt: now
    }, { merge: true });

    await setDoc(doc(db, COLLECTIONS.VERIFICATIONS, id), {
      status: 'approved',
      banReason: null,
      reviewedAt: now
    }, { merge: true });
  }
  return { success: true };
}

/**
 * Permanently Purge / Delete User or Company from Database
 */
export async function purgeEntityInFirebase(id: string, type: 'user' | 'company', confirmation: string = 'EXCLUIR') {
  try {
    const res = await fetch('/api/admin/purge-entity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, type, confirmation })
    });
    if (res.ok) {
      return await res.json();
    }
    const err = await res.json();
    throw new Error(err.error || 'Falha ao excluir entidade do banco.');
  } catch (apiErr: any) {
    console.warn('Backend purge API fallback, proceeding with direct Firestore:', apiErr);
    
    // Direct Firestore cascading purge fallback
    if (type === 'company' || id.startsWith('comp-')) {
      await deleteDoc(doc(db, COLLECTIONS.COMPANIES, id));
      const plansSnap = await getDocs(collection(db, COLLECTIONS.PLANS));
      for (const p of plansSnap.docs) {
        if (p.data().companyId === id) await deleteDoc(p.ref);
      }
      try {
        await deleteDoc(doc(db, COLLECTIONS.VERIFICATIONS, id));
      } catch (e) {}
    } else {
      await deleteDoc(doc(db, COLLECTIONS.PROFILES, id));
      try {
        await deleteDoc(doc(db, 'users', id));
      } catch (e) {}
      try {
        await deleteDoc(doc(db, COLLECTIONS.VERIFICATIONS, id));
      } catch (e) {}

      // Clean any owned company
      const compQ = query(collection(db, COLLECTIONS.COMPANIES), where('ownerId', '==', id));
      const compSnap = await getDocs(compQ);
      for (const c of compSnap.docs) {
        await deleteDoc(c.ref);
        const plansSnap = await getDocs(collection(db, COLLECTIONS.PLANS));
        for (const p of plansSnap.docs) {
          if (p.data().companyId === c.id) await deleteDoc(p.ref);
        }
      }
    }
    return { success: true };
  }
}

// ==========================================
// 🏢 EMPRESAS & STARTUPS (COMPANIES)
// ==========================================

/**
 * Realtime Companies Listener
 */
export function subscribeCompanies(callback: (companies: CompanyStartup[]) => void) {
  const q = collection(db, COLLECTIONS.COMPANIES);
  return onSnapshot(q, (snap) => {
    const list: CompanyStartup[] = [];
    snap.forEach((d) => {
      list.push({ id: d.id, ...(d.data() as Omit<CompanyStartup, 'id'>) });
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
 * Create a new Company / Startup in Firestore (Sent to Admin for approval)
 */
export async function createCompanyInFirebase(companyData: Omit<CompanyStartup, 'id' | 'createdAt'>) {
  const id = `comp-${Date.now()}`;
  const now = new Date().toISOString();
  const slug = companyData.name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-');

  const newCompany: CompanyStartup = {
    ...companyData,
    id,
    slug: slug || id,
    totalPlansCount: 0,
    totalAffiliatesCount: 0,
    totalSalesVolume: 0,
    verified: companyData.verified ?? false,
    status: companyData.status ?? 'pending',
    submittedAt: companyData.submittedAt || now,
    submittedBy: companyData.submittedBy || DEFAULT_USER_ID,
    ownerId: companyData.ownerId || DEFAULT_USER_ID,
    createdAt: now
  };

  const docRef = doc(db, COLLECTIONS.COMPANIES, id);
  await setDoc(docRef, sanitizeForFirestore(newCompany));

  if (newCompany.ownerId && newCompany.ownerId !== DEFAULT_USER_ID) {
    try {
      await updateDoc(doc(db, COLLECTIONS.PROFILES, newCompany.ownerId), {
        companyId: id,
        companyName: newCompany.name,
        hasCompanyProfile: true
      });
    } catch (e) {
      console.warn('Could not update user profile on company creation:', e);
    }
  }

  return newCompany;
}

/**
 * Approve a Company in Firestore & Provision Asaas Subaccount (Admin Action)
 */
export async function approveCompanyInFirebase(companyId: string) {
  try {
    // 1. Aciona a rota oficial do backend para criar/homologar a subconta no Asaas v3
    const res = await fetch('/api/admin/approve-company', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyId })
    });

    if (res.ok) {
      const data = await res.json();
      return { success: true, data };
    } else {
      const errData = await res.json().catch(() => null);
      throw new Error(errData?.error || 'Falha ao aprovar empresa e gerar subconta Asaas.');
    }
  } catch (apiErr: any) {
    console.error('Erro na chamada de aprovação via API:', apiErr);
    // Se o erro for de validação fiscal ou do Asaas, repassa o erro para que a UI alerte o administrador
    if (apiErr.message && (apiErr.message.includes('CPF/CNPJ') || apiErr.message.includes('fiscal') || apiErr.message.includes('Asaas') || apiErr.message.includes('obrigatório'))) {
      throw apiErr;
    }

    // Fallback de contingência direta no Firestore
    const docRef = doc(db, COLLECTIONS.COMPANIES, companyId);
    const now = new Date().toISOString();
    await setDoc(docRef, sanitizeForFirestore({
      status: 'approved',
      verified: true,
      reviewedAt: now,
      rejectionReason: null
    }), { merge: true });
    return { success: true };
  }
}

/**
 * Reject a Company in Firestore (Admin Action)
 */
export async function rejectCompanyInFirebase(companyId: string, reason: string = 'Dados da empresa necessitam de revisão') {
  const docRef = doc(db, COLLECTIONS.COMPANIES, companyId);
  const now = new Date().toISOString();
  await setDoc(docRef, sanitizeForFirestore({
    status: 'rejected',
    verified: false,
    rejectionReason: reason,
    reviewedAt: now
  }), { merge: true });
  return { success: true };
}

/**
 * Update a Company in Firestore
 */
export async function updateCompanyInFirebase(companyId: string, updates: Partial<CompanyStartup>) {
  const docRef = doc(db, COLLECTIONS.COMPANIES, companyId);
  await updateDoc(docRef, sanitizeForFirestore(updates));
}

/**
 * Delete a Company and its plans in Firestore
 */
export async function deleteCompanyInFirebase(companyId: string) {
  const docRef = doc(db, COLLECTIONS.COMPANIES, companyId);
  const snap = await getDoc(docRef);
  const ownerId = snap.exists() ? snap.data()?.ownerId : null;
  await deleteDoc(docRef);

  // Also delete company plans
  const plansSnap = await getDocs(collection(db, COLLECTIONS.PLANS));
  for (const p of plansSnap.docs) {
    if (p.data().companyId === companyId) {
      await deleteDoc(p.ref);
    }
  }

  // If owner exists, clear company link from user profile
  if (ownerId) {
    try {
      await updateDoc(doc(db, COLLECTIONS.PROFILES, ownerId), {
        companyId: null,
        companyName: null,
        hasCompanyProfile: false
      });
    } catch (e) {
      console.warn('Profile cleanup error:', e);
    }
  }
}

// ==========================================
// 📦 PLANOS & PRODUTOS (COMPANY PLANS)
// ==========================================

/**
 * Realtime Plans / Platforms Listener
 */
export function subscribePlans(callback: (plans: CompanyPlan[]) => void) {
  const q = collection(db, COLLECTIONS.PLANS);
  return onSnapshot(q, (snap) => {
    const list: CompanyPlan[] = [];
    snap.forEach((d) => {
      list.push({ id: d.id, ...(d.data() as Omit<CompanyPlan, 'id'>) });
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
  try {
    const cleanId = idOrSlug.trim();
    if (!cleanId) return null;

    // 1. Direct doc lookup by ID
    const planRef = doc(db, COLLECTIONS.PLANS, cleanId);
    const planSnap = await getDoc(planRef);
    if (planSnap.exists()) {
      return { id: planSnap.id, ...(planSnap.data() as Omit<CompanyPlan, 'id'>) };
    }

    // 2. Lookup across plans by slug, checkoutSlug, or partial ID
    const q = collection(db, COLLECTIONS.PLANS);
    const allPlans = await getDocs(q);
    for (const d of allPlans.docs) {
      const data = d.data() as CompanyPlan;
      if (
        d.id === cleanId ||
        data.slug === cleanId ||
        data.checkoutSlug === cleanId ||
        (data.slug && data.slug.toLowerCase() === cleanId.toLowerCase()) ||
        (data.name && data.name.toLowerCase().includes(cleanId.toLowerCase()))
      ) {
        return { id: d.id, ...data };
      }
    }
  } catch (err) {
    console.error('Error fetching plan by ID or Slug:', err);
  }
  return null;
}

/**
 * Create a new Plan / Product in Firestore (Multi-tenant Isolated)
 */
export async function createCompanyPlanInFirebase(planData: Omit<CompanyPlan, 'id' | 'createdAt'>) {
  if (!planData.companyId || planData.companyId === 'comp-default' || planData.companyId === 'comp_default') {
    throw new Error('companyId é obrigatório para cadastrar um plano. O plano deve pertencer exclusivamente à sua empresa.');
  }

  // 1. Tenta salvar via endpoint com validação estrita de tenant
  try {
    const res = await fetch('/api/plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(planData)
    });
    if (res.ok) {
      const data = await res.json();
      return data.plan;
    }
  } catch (apiErr) {
    console.warn('Fallback para Firestore local após erro na API /api/plans:', apiErr);
  }

  // 2. Gravação direta no Firestore garantindo vínculo estrito à empresa
  const compRef = doc(db, COLLECTIONS.COMPANIES, planData.companyId);
  const compSnap = await getDoc(compRef);
  if (!compSnap.exists()) {
    throw new Error(`Empresa com ID "${planData.companyId}" não encontrada no sistema. Cadastre sua empresa primeiro.`);
  }

  const compData = compSnap.data() as CompanyStartup;
  const isVerified = compData.verified === true || compData.status === 'approved';
  if (!isVerified) {
    throw new Error('Empresa não verificada. Apenas empresas aprovadas pela administração podem cadastrar planos.');
  }

  const id = `plan-${Date.now()}`;
  const now = new Date().toISOString();
  const commissionVal = Number(((planData.priceSetup * planData.commissionPercentage) / 100).toFixed(2));

  const newPlan: CompanyPlan = {
    ...planData,
    id,
    companyId: compData.id,
    companyName: compData.companyName || compData.name || planData.companyName,
    companyLogo: compData.logo || planData.companyLogo,
    ownerId: compData.ownerId || compData.submittedBy,
    asaasSubaccountId: compData.asaasSubaccountId || compData.subaccountId || compData.asaasWalletId || null,
    asaasWalletId: compData.asaasWalletId || compData.walletId || null,
    commissionValue: commissionVal,
    affiliatesCount: 0,
    totalSales: 0,
    status: 'Ativo',
    createdAt: now
  };

  const docRef = doc(db, COLLECTIONS.PLANS, id);
  await setDoc(docRef, sanitizeForFirestore(newPlan));

  await updateDoc(compRef, sanitizeForFirestore({
    totalPlansCount: (compData.totalPlansCount || 0) + 1
  }));

  return newPlan;
}

// Alias
export const createPlatformInFirebase = createCompanyPlanInFirebase;

/**
 * Delete a Plan from Firestore
 */
export async function deleteCompanyPlanInFirebase(planId: string, companyId?: string) {
  const docRef = doc(db, COLLECTIONS.PLANS, planId);
  await deleteDoc(docRef);

  if (companyId) {
    const compRef = doc(db, COLLECTIONS.COMPANIES, companyId);
    const compSnap = await getDoc(compRef);
    if (compSnap.exists()) {
      const compData = compSnap.data() as CompanyStartup;
      await updateDoc(compRef, sanitizeForFirestore({
        totalPlansCount: Math.max(0, (compData.totalPlansCount || 1) - 1)
      }));
    }
  }
}

export const deletePlatformInFirebase = (planId: string) => deleteCompanyPlanInFirebase(planId);

/**
 * Update Plan in Firestore
 */
export async function updateCompanyPlanInFirebase(planId: string, updates: Partial<CompanyPlan>) {
  const docRef = doc(db, COLLECTIONS.PLANS, planId);
  await updateDoc(docRef, sanitizeForFirestore(updates));
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
  const q = collection(db, COLLECTIONS.AFFILIATIONS);
  return onSnapshot(q, (snap) => {
    const list: UserAffiliation[] = [];
    snap.forEach((d) => {
      const data = d.data() as UserAffiliation;
      if (data.userId === userId || data.user_id === userId) {
        list.push({ id: d.id, ...data });
      }
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
export function subscribeAllAffiliations(callback: (affiliations: UserAffiliation[]) => void) {
  const q = collection(db, COLLECTIONS.AFFILIATIONS);
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
export async function createAffiliationInFirebase(plan: CompanyPlan, userProfile: UserSellerProfile) {
  const isVerified = userProfile.verified === true || userProfile.verificationStatus === 'approved';
  if (!isVerified) {
    throw new Error('Usuário não verificado. Você só pode se afiliar a produtos após ter o perfil aprovado pela administração.');
  }

  const userId = userProfile.userId || DEFAULT_USER_ID;
  const id = `aff_${userId}_${plan.id}`;
  const now = new Date().toISOString();
  
  // Check if affiliation already exists
  const existingDoc = await getDoc(doc(db, COLLECTIONS.AFFILIATIONS, id));
  if (existingDoc.exists()) {
    const existingData = existingDoc.data() as UserAffiliation;
    return { id: existingDoc.id, ...existingData };
  }

  const randPart = Math.random().toString(36).substring(2, 6).toUpperCase();
  const userPart = (userId).replace(/[^a-zA-Z0-9]/g, '').slice(0, 5).toUpperCase();
  const affiliateCode = `AFF-${userPart || 'USR'}-${randPart}`;
  const affiliateLink = formatAffiliatePlanUrl(plan.id, affiliateCode);

  const affiliation: UserAffiliation = {
    id,
    userId: userId,
    user_id: userId,
    userName: userProfile.name,
    userEmail: userProfile.email,
    companyId: plan.companyId,
    companyName: plan.companyName,
    companyLogo: plan.companyLogo,
    planId: plan.id,
    plan_id: plan.id,
    planName: plan.name,
    priceSetup: plan.priceSetup,
    commissionPercentage: plan.commissionPercentage,
    commissionValue: plan.commissionValue,
    affiliateCode,
    affiliate_code: affiliateCode,
    affiliateLink,
    clicks: 0,
    salesCount: 0,
    totalEarned: 0,
    status: 'Ativo',
    createdAt: now
  };

  await setDoc(doc(db, COLLECTIONS.AFFILIATIONS, id), sanitizeForFirestore(affiliation));

  // Atualiza o status do usuário no banco para Afiliado Ativo
  try {
    const userRef = doc(db, COLLECTIONS.PROFILES, userId);
    await setDoc(userRef, sanitizeForFirestore({
      isAffiliate: true,
      role: 'affiliate',
      affiliateStatus: 'active',
      updatedAt: now
    }), { merge: true });
  } catch (uErr) {
    console.warn('Erro ao atualizar status de afiliado no user_profiles:', uErr);
  }

  // Increment Plan affiliatesCount
  const planRef = doc(db, COLLECTIONS.PLANS, plan.id);
  const planSnap = await getDoc(planRef);
  if (planSnap.exists()) {
    const pData = planSnap.data() as CompanyPlan;
    await updateDoc(planRef, sanitizeForFirestore({
      affiliatesCount: (pData.affiliatesCount || 0) + 1
    }));
  }

  // Increment Company affiliatesCount
  if (plan.companyId) {
    const compRef = doc(db, COLLECTIONS.COMPANIES, plan.companyId);
    const compSnap = await getDoc(compRef);
    if (compSnap.exists()) {
      const cData = compSnap.data() as CompanyStartup;
      await updateDoc(compRef, sanitizeForFirestore({
        totalAffiliatesCount: (cData.totalAffiliatesCount || 0) + 1
      }));
    }
  }

  return affiliation;
}

/**
 * Remove an Affiliation
 */
export async function deleteAffiliationInFirebase(affiliationId: string, planId?: string, companyId?: string) {
  await deleteDoc(doc(db, COLLECTIONS.AFFILIATIONS, affiliationId));

  if (planId) {
    try {
      const planRef = doc(db, COLLECTIONS.PLANS, planId);
      const planSnap = await getDoc(planRef);
      if (planSnap.exists()) {
        const pData = planSnap.data() as CompanyPlan;
        await updateDoc(planRef, sanitizeForFirestore({
          affiliatesCount: Math.max(0, (pData.affiliatesCount || 1) - 1)
        }));
      }
    } catch (e) {
      console.warn('Erro ao atualizar contador de afiliados do plano:', e);
    }
  }

  if (companyId) {
    try {
      const compRef = doc(db, COLLECTIONS.COMPANIES, companyId);
      const compSnap = await getDoc(compRef);
      if (compSnap.exists()) {
        const cData = compSnap.data() as CompanyStartup;
        await updateDoc(compRef, sanitizeForFirestore({
          totalAffiliatesCount: Math.max(0, (cData.totalAffiliatesCount || 1) - 1)
        }));
      }
    } catch (e) {
      console.warn('Erro ao atualizar contador de afiliados da empresa:', e);
    }
  }
}

// ==========================================
// 💰 VENDAS & COMISSÕES (SALES)
// ==========================================

/**
 * Realtime Sales Listener
 */
export function subscribeSales(callback: (sales: SaleTransaction[]) => void) {
  const q = collection(db, COLLECTIONS.SALES);
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

/**
 * Update Platform Global Finances (Checkout Fee R$ 0,99, Withdrawal Fee R$ 2,50)
 */
export async function creditPlatformFinances(type: 'checkout' | 'withdrawal', feeAmount: number) {
  try {
    const docRef = doc(db, COLLECTIONS.PLATFORM_FINANCES, 'global_summary');
    const snap = await getDoc(docRef);
    const now = new Date().toISOString();

    if (snap.exists()) {
      const data = snap.data();
      const currentRevenue = data.totalPlatformRevenue || 0;
      const currentCheckoutFees = data.totalCheckoutFees || 0;
      const currentWithdrawalFees = data.totalWithdrawalFees || 0;
      const currentSales = data.totalSalesProcessed || 0;
      const currentWithdrawals = data.totalWithdrawalsProcessed || 0;

      await updateDoc(docRef, sanitizeForFirestore({
        totalPlatformRevenue: Number((currentRevenue + feeAmount).toFixed(2)),
        totalCheckoutFees: type === 'checkout' ? Number((currentCheckoutFees + feeAmount).toFixed(2)) : currentCheckoutFees,
        totalWithdrawalFees: type === 'withdrawal' ? Number((currentWithdrawalFees + feeAmount).toFixed(2)) : currentWithdrawalFees,
        totalSalesProcessed: type === 'checkout' ? currentSales + 1 : currentSales,
        totalWithdrawalsProcessed: type === 'withdrawal' ? currentWithdrawals + 1 : currentWithdrawals,
        lastUpdated: now
      }));
    } else {
      await setDoc(docRef, sanitizeForFirestore({
        totalPlatformRevenue: feeAmount,
        totalCheckoutFees: type === 'checkout' ? feeAmount : 0,
        totalWithdrawalFees: type === 'withdrawal' ? feeAmount : 0,
        totalSalesProcessed: type === 'checkout' ? 1 : 0,
        totalWithdrawalsProcessed: type === 'withdrawal' ? 1 : 0,
        lastUpdated: now
      }));
    }
  } catch (err) {
    console.warn('[Platform Finances] Warning updating global summary:', err);
  }
}

/**
 * Record a New Sale in Firebase Firestore & apply 9 days release hold + R$ 0.99 platform fee
 */
export async function createSaleTransactionInFirebase(saleData: Omit<SaleTransaction, 'id' | 'createdAt'>) {
  const id = `TX-${Math.floor(100000 + Math.random() * 900000)}`;
  const now = new Date();
  const checkoutFee = 0.99; // Taxa de checkout retida pela plataforma LeadsPay
  const netCompanyAmount = Number(Math.max(0, saleData.amount - saleData.commissionEarned - checkoutFee).toFixed(2));
  const availableAt = new Date(now.getTime() + 9 * 24 * 60 * 60 * 1000).toISOString(); // Garantia de 9 dias

  const fullSale: SaleTransaction = {
    ...saleData,
    id,
    checkoutFee,
    netCompanyAmount,
    releaseStatus: 'pendente',
    availableAt,
    createdAt: now.toISOString()
  };

  // 1. Save sale document
  const saleRef = doc(db, COLLECTIONS.SALES, id);
  await setDoc(saleRef, sanitizeForFirestore(fullSale));

  // 2. Credit platform fee in global revenue account
  await creditPlatformFinances('checkout', checkoutFee);

  // 3. Update Profile Balances
  // Credit the affiliate if this sale was made by an affiliate
  const targetAffiliateId = saleData.affiliateId || saleData.sellerId || null;
  if (targetAffiliateId) {
    try {
      const profileRef = doc(db, COLLECTIONS.PROFILES, targetAffiliateId);
      const profileSnap = await getDoc(profileRef);
      if (profileSnap.exists()) {
        const current = profileSnap.data() as UserSellerProfile;
        const newTotalEarned = (current.totalEarned || 0) + fullSale.commissionEarned;
        const newPending = (current.pendingBalance || 0) + fullSale.commissionEarned;
        const newCount = (current.totalSalesCount || 0) + 1;
        const target = current.targetGoal || 100000;
        const progress = Math.min(100, (newTotalEarned / target) * 100);

        let level = current.partnerLevel || 'Afiliado Starter';
        if (newTotalEarned >= 100000) level = 'Master Elite Black';
        else if (newTotalEarned >= 50000) level = 'Parceiro Gold';
        else if (newTotalEarned >= 20000) level = 'Parceiro Silver';

        await updateDoc(profileRef, sanitizeForFirestore({
          totalEarned: newTotalEarned,
          pendingBalance: newPending, // Entra como pendente durante os 9 dias de garantia
          totalSalesCount: newCount,
          partnerLevel: level,
          currentSalesProgress: Number(progress.toFixed(1)),
          updatedAt: now.toISOString()
        }));
      }
    } catch (profErr) {
      console.warn('Aviso ao creditar perfil do afiliado:', profErr);
    }
  }

  // Credit company owner with net amount
  let companyOwnerId = saleData.companyOwnerId || null;
  if (!companyOwnerId && fullSale.companyId) {
    try {
      const compSnap = await getDoc(doc(db, COLLECTIONS.COMPANIES, fullSale.companyId));
      if (compSnap.exists()) {
        companyOwnerId = compSnap.data().ownerId || compSnap.data().submittedBy || null;
      }
    } catch (e) {}
  }

  if (companyOwnerId) {
    try {
      const compProfileRef = doc(db, COLLECTIONS.PROFILES, companyOwnerId);
      const compProfileSnap = await getDoc(compProfileRef);
      if (compProfileSnap.exists()) {
        const compCurrent = compProfileSnap.data() as UserSellerProfile;
        await updateDoc(compProfileRef, sanitizeForFirestore({
          totalEarned: Number(((compCurrent.totalEarned || 0) + netCompanyAmount).toFixed(2)),
          pendingBalance: Number(((compCurrent.pendingBalance || 0) + netCompanyAmount).toFixed(2)),
          totalSalesCount: (compCurrent.totalSalesCount || 0) + 1,
          updatedAt: now.toISOString()
        }));
      }
    } catch (compErr) {
      console.warn('Aviso ao creditar carteira da empresa:', compErr);
    }
  }

  // 4. Update Plan total sales
  if (fullSale.platformId) {
    const planRef = doc(db, COLLECTIONS.PLANS, fullSale.platformId);
    const planSnap = await getDoc(planRef);
    if (planSnap.exists()) {
      const pData = planSnap.data() as CompanyPlan;
      await updateDoc(planRef, sanitizeForFirestore({
        totalSales: (pData.totalSales || 0) + 1
      }));
    }
  }

  // 5. Update Company total sales volume
  if (fullSale.companyId) {
    const compRef = doc(db, COLLECTIONS.COMPANIES, fullSale.companyId);
    const compSnap = await getDoc(compRef);
    if (compSnap.exists()) {
      const cData = compSnap.data() as CompanyStartup;
      await updateDoc(compRef, sanitizeForFirestore({
        totalSalesVolume: (cData.totalSalesVolume || 0) + fullSale.amount
      }));
    }
  }

  // 6. Update Affiliation salesCount and totalEarned if this affiliate is affiliated
  if (targetAffiliateId && fullSale.platformId) {
    try {
      const affId = `aff_${targetAffiliateId}_${fullSale.platformId}`;
      const affRef = doc(db, COLLECTIONS.AFFILIATIONS, affId);
      const affSnap = await getDoc(affRef);
      if (affSnap.exists()) {
        const affData = affSnap.data() as UserAffiliation;
        await updateDoc(affRef, sanitizeForFirestore({
          salesCount: (affData.salesCount || 0) + 1,
          totalEarned: Number(((affData.totalEarned || 0) + fullSale.commissionEarned).toFixed(2))
        }));
      }
    } catch (e) {}
  }

  return fullSale;
}

// ==========================================
// 🏧 SAQUES PIX (WITHDRAWALS)
// ==========================================

/**
 * Realtime Withdrawals Listener (Filtered strictly by user unless superadmin)
 */
export function subscribeWithdrawals(callback: (withdrawals: WithdrawalRequest[]) => void, userId?: string) {
  const q = collection(db, COLLECTIONS.WITHDRAWALS);
  return onSnapshot(q, (snap) => {
    const list: WithdrawalRequest[] = [];
    snap.forEach((d) => {
      const data = d.data() as Omit<WithdrawalRequest, 'id'>;
      if (!userId || data.userId === userId || (data as any).user_id === userId) {
        list.push({ id: d.id, ...data });
      }
    });
    list.sort((a, b) => (b.createdAt || b.completedAt || b.requestedAt || '').localeCompare(a.createdAt || a.completedAt || a.requestedAt || ''));
    callback(list);
  }, (err) => {
    console.error('Firestore withdrawals listener error:', err);
    callback([]);
  });
}

/**
 * Request Withdrawal via Secure Backend Endpoint (/api/withdrawals/request)
 */
export async function requestWithdrawalViaBackend(
  amount: number,
  pixKey: string,
  pixKeyType: string,
  userId: string = DEFAULT_USER_ID,
  userName?: string
): Promise<{ success: boolean; withdrawal: WithdrawalRequest; message?: string }> {
  const response = await fetch('/api/withdrawals/request', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      amount,
      requestedAmount: amount,
      pixKey,
      pixKeyType,
      userId,
      userName
    })
  });

  const data = await response.json();

  if (!response.ok || data.error === true) {
    const errorMsg = data.message || (typeof data.error === 'string' ? data.error : 'Erro ao processar solicitação de saque');
    throw new Error(errorMsg);
  }

  return data;
}

/**
 * Trigger 9-day balance release cron manually or scheduled
 */
export async function triggerReleaseBalancesCron(): Promise<{ releasedCount: number; message: string }> {
  const response = await fetch('/api/cron/release-balances', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error('Falha ao acionar rotina de liberação de saldos');
  }

  return response.json();
}

/**
 * Direct Cashout fallback if offline/client-only
 */
export async function createWithdrawalInFirebase(
  amount: number, 
  pixKey: string, 
  pixKeyType: string,
  userId: string = DEFAULT_USER_ID,
  userName?: string
) {
  const id = `WTH-${Math.floor(1000 + Math.random() * 9000)}`;
  const now = new Date();
  const formattedDate = `${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  const feeAmount = 2.50; // Taxa de saque fixa LeadsPay
  const netAmount = Number(Math.max(0, amount - feeAmount).toFixed(2));
  const endToEndId = `E31522339${Date.now()}${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

  const newWth: WithdrawalRequest = {
    id,
    userId: userId || DEFAULT_USER_ID,
    userName: userName || INITIAL_USER_PROFILE.name,
    amount,
    feeAmount,
    netAmount,
    pixKey,
    pixKeyType,
    status: 'concluido',
    requestedAt: formattedDate,
    completedAt: now.toISOString(),
    endToEndId
  };

  // 1. Save withdrawal doc
  await setDoc(doc(db, COLLECTIONS.WITHDRAWALS, id), sanitizeForFirestore(newWth));

  // 2. Decrement full amount from available balance
  const profileRef = doc(db, COLLECTIONS.PROFILES, userId || DEFAULT_USER_ID);
  const profileSnap = await getDoc(profileRef);
  if (profileSnap.exists()) {
    const current = profileSnap.data() as UserSellerProfile;
    const newAvailable = Math.max(0, (current.availableBalance || 0) - amount);
    await updateDoc(profileRef, sanitizeForFirestore({
      availableBalance: newAvailable,
      updatedAt: now.toISOString()
    }));
  }

  // 3. Credit R$ 2,50 to platform global account
  await creditPlatformFinances('withdrawal', feeAmount);

  return newWth;
}

// ==========================================
// 👥 EQUIPE & OUTROS
// ==========================================

export function subscribeTeamMembers(callback: (team: TeamMember[]) => void) {
  const q = collection(db, COLLECTIONS.TEAM);
  return onSnapshot(q, (snap) => {
    const list: TeamMember[] = [];
    snap.forEach((d) => {
      list.push({ id: d.id, ...(d.data() as Omit<TeamMember, 'id'>) });
    });
    callback(list);
  }, (err) => {
    console.error('Firestore team listener error:', err);
    callback([]);
  });
}

export async function createTeamMemberInFirebase(memberData: Omit<TeamMember, 'id'>) {
  const id = `team-${Date.now()}`;
  const newMember: TeamMember = {
    ...memberData,
    id
  };
  await setDoc(doc(db, COLLECTIONS.TEAM, id), sanitizeForFirestore(newMember));
  return newMember;
}

export async function deleteTeamMemberInFirebase(id: string) {
  await deleteDoc(doc(db, COLLECTIONS.TEAM, id));
}

export async function saveAffiliateLinkInFirebase(link: Omit<AffiliateLinkItem, 'id' | 'createdAt'>) {
  const id = `aff-${Date.now()}`;
  const now = new Date().toISOString();
  const linkItem: AffiliateLinkItem = {
    ...link,
    id,
    createdAt: now
  };
  await setDoc(doc(db, COLLECTIONS.AFFILIATE_LINKS, id), sanitizeForFirestore(linkItem));
  return linkItem;
}

// ==========================================
// 📊 MÉTRICAS GLOBAIS EM TEMPO REAL (FIREBASE)
// ==========================================

export interface GlobalPlatformMetrics {
  totalRegisteredUsers: number;
  totalStartups: number;
  totalPlans: number;
  totalCommissionsGenerated: number;
  totalCommissionsPaid: number;
  totalGrossSales: number;
  totalSalesCount: number;
  companies: CompanyStartup[];
  plans: CompanyPlan[];
}

/**
 * Subscribes to realtime updates across collections to calculate live stats:
 * - Real users / affiliates count
 * - Real startups and plans count
 * - Real generated commissions
 * - Real paid commissions via PIX
 */
export function subscribeGlobalPlatformMetrics(
  callback: (metrics: GlobalPlatformMetrics) => void
) {
  let companiesList: CompanyStartup[] = [];
  let plansList: CompanyPlan[] = [];
  let salesList: SaleTransaction[] = [];
  let withdrawalsList: WithdrawalRequest[] = [];
  let userProfilesCount = 1;

  const emit = () => {
    const totalCommissionsGenerated = salesList.reduce((acc, s) => acc + (s.commissionEarned || 0), 0);
    const totalCommissionsPaid = withdrawalsList
      .filter(w => w.status === 'Concluído' || w.status === 'Aprovado')
      .reduce((acc, w) => acc + (w.amount || 0), 0);
    const totalGrossSales = salesList.reduce((acc, s) => acc + (s.amount || 0), 0);

    callback({
      totalRegisteredUsers: Math.max(userProfilesCount, 1),
      totalStartups: companiesList.length,
      totalPlans: plansList.length,
      totalCommissionsGenerated,
      totalCommissionsPaid,
      totalGrossSales,
      totalSalesCount: salesList.length,
      companies: companiesList,
      plans: plansList
    });
  };

  // 1. Companies listener
  const unsubCompanies = onSnapshot(collection(db, COLLECTIONS.COMPANIES), (snap) => {
    companiesList = snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<CompanyStartup, 'id'>) }));
    emit();
  }, (err) => console.error('Error in metrics companies listener:', err));

  // 2. Plans listener
  const unsubPlans = onSnapshot(collection(db, COLLECTIONS.PLANS), (snap) => {
    plansList = snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<CompanyPlan, 'id'>) }));
    emit();
  }, (err) => console.error('Error in metrics plans listener:', err));

  // 3. Sales listener
  const unsubSales = onSnapshot(collection(db, COLLECTIONS.SALES), (snap) => {
    salesList = snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<SaleTransaction, 'id'>) }));
    emit();
  }, (err) => console.error('Error in metrics sales listener:', err));

  // 4. Withdrawals listener
  const unsubWithdrawals = onSnapshot(collection(db, COLLECTIONS.WITHDRAWALS), (snap) => {
    withdrawalsList = snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<WithdrawalRequest, 'id'>) }));
    emit();
  }, (err) => console.error('Error in metrics withdrawals listener:', err));

  // 5. User Profiles count listener
  const unsubProfiles = onSnapshot(collection(db, COLLECTIONS.PROFILES), (snap) => {
    userProfilesCount = Math.max(snap.size, 1);
    emit();
  }, (err) => console.error('Error in metrics profiles listener:', err));

  return () => {
    unsubCompanies();
    unsubPlans();
    unsubSales();
    unsubWithdrawals();
    unsubProfiles();
  };
}

/**
 * Busca o ID da subconta Asaas do vendedor/empresa/plano (ex: "acc_...")
 * Prioriza users/{sellerId}.asaasSubaccountId, user_profiles e companies
 */
export async function fetchSellerSubaccountId(param: string | CompanyPlan | any): Promise<string | null> {
  if (!param) return null;

  try {
    // Se for objeto do plano
    if (typeof param === 'object') {
      const plan = param as any;
      if (plan.asaasSubaccountId) return String(plan.asaasSubaccountId).trim();
      if (plan.subaccountId) return String(plan.subaccountId).trim();

      const candidateIds: string[] = [
        plan.sellerId,
        plan.ownerId,
        plan.userId,
        plan.companyId
      ].filter((v): v is string => Boolean(v));

      for (const sellerId of candidateIds) {
        // 1. users/{sellerId} (conforme requisito específico users/{sellerId}.asaasSubaccountId)
        try {
          const userDoc = await getDoc(doc(db, 'users', String(sellerId)));
          if (userDoc.exists()) {
            const uData = userDoc.data();
            const subId = uData?.asaasSubaccountId || uData?.subaccountId || uData?.subaccount_id || uData?.walletId;
            if (subId) return String(subId).trim();
          }
        } catch (e) {
          console.warn('Erro ao consultar users/{sellerId} no Firestore:', e);
        }

        // 2. user_profiles/{sellerId}
        try {
          const profDoc = await getDoc(doc(db, COLLECTIONS.PROFILES, String(sellerId)));
          if (profDoc.exists()) {
            const pData = profDoc.data();
            const subId = pData?.asaasSubaccountId || pData?.subaccountId || pData?.subaccount_id || pData?.walletId;
            if (subId) return String(subId).trim();
          }
        } catch (e) {
          console.warn('Erro ao consultar user_profiles/{sellerId} no Firestore:', e);
        }
      }

      // 3. companies/{companyId}
      if (plan.companyId) {
        try {
          const compDoc = await getDoc(doc(db, COLLECTIONS.COMPANIES, String(plan.companyId)));
          if (compDoc.exists()) {
            const cData = compDoc.data();
            const subId = cData?.asaasSubaccountId || cData?.subaccountId;
            if (subId) return String(subId).trim();
            if (cData?.ownerId) {
              const ownerUserDoc = await getDoc(doc(db, 'users', String(cData.ownerId)));
              if (ownerUserDoc.exists()) {
                const oData = ownerUserDoc.data();
                const ownerSubId = oData?.asaasSubaccountId || oData?.subaccountId;
                if (ownerSubId) return String(ownerSubId).trim();
              }
            }
          }
        } catch (e) {
          console.warn('Erro ao consultar companies/{companyId} no Firestore:', e);
        }
      }

      // 4. plans/{plan.id}
      if (plan.id) {
        try {
          const planDoc = await getDoc(doc(db, COLLECTIONS.PLANS, String(plan.id)));
          if (planDoc.exists()) {
            const plData = planDoc.data();
            const subId = plData?.asaasSubaccountId || plData?.subaccountId;
            if (subId) return String(subId).trim();
          }
        } catch (e) {
          console.warn('Erro ao consultar plans/{plan.id} no Firestore:', e);
        }
      }

      return null;
    }

    // Se for string com sellerId / companyId / planId
    const sellerId = String(param).trim();
    if (!sellerId) return null;

    // 1. users/{sellerId}
    try {
      const uDoc = await getDoc(doc(db, 'users', sellerId));
      if (uDoc.exists()) {
        const uData = uDoc.data();
        const subId = uData?.asaasSubaccountId || uData?.subaccountId || uData?.subaccount_id || uData?.walletId;
        if (subId) return String(subId).trim();
      }
    } catch (e) {
      console.warn('Erro ao consultar users no Firestore:', e);
    }

    // 2. user_profiles/{sellerId}
    try {
      const pDoc = await getDoc(doc(db, COLLECTIONS.PROFILES, sellerId));
      if (pDoc.exists()) {
        const pData = pDoc.data();
        const subId = pData?.asaasSubaccountId || pData?.subaccountId || pData?.subaccount_id || pData?.walletId;
        if (subId) return String(subId).trim();
      }
    } catch (e) {
      console.warn('Erro ao consultar user_profiles no Firestore:', e);
    }

    // 3. companies/{sellerId}
    try {
      const cDoc = await getDoc(doc(db, COLLECTIONS.COMPANIES, sellerId));
      if (cDoc.exists()) {
        const cData = cDoc.data();
        const subId = cData?.asaasSubaccountId || cData?.subaccountId;
        if (subId) return String(subId).trim();
      }
    } catch (e) {
      console.warn('Erro ao consultar companies no Firestore:', e);
    }

    // 4. plans/{sellerId}
    try {
      const plDoc = await getDoc(doc(db, COLLECTIONS.PLANS, sellerId));
      if (plDoc.exists()) {
        const plData = plDoc.data();
        const subId = plData?.asaasSubaccountId || plData?.subaccountId;
        if (subId) return String(subId).trim();
      }
    } catch (e) {
      console.warn('Erro ao consultar plans no Firestore:', e);
    }
  } catch (err) {
    console.warn('Erro geral ao buscar subaccountId no Firestore:', err);
  }

  return null;
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

