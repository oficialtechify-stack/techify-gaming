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
  VERIFICATIONS: 'verification_requests'
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
    const profileRef = doc(db, COLLECTIONS.PROFILES, DEFAULT_USER_ID);
    const profileSnap = await getDoc(profileRef);
    if (!profileSnap.exists()) {
      await setDoc(profileRef, {
        ...INITIAL_USER_PROFILE,
        userId: DEFAULT_USER_ID,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

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

    // Reset profile to 0 balance
    const profileRef = doc(db, COLLECTIONS.PROFILES, DEFAULT_USER_ID);
    await setDoc(profileRef, {
      ...INITIAL_USER_PROFILE,
      userId: DEFAULT_USER_ID,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

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
  
  // 1. Update the User's Profile to 'pending' and locked
  const profileRef = doc(db, COLLECTIONS.PROFILES, effectiveUserId);
  await setDoc(profileRef, sanitizeForFirestore({
    ...profileData,
    verificationStatus: 'pending',
    verified: false,
    verificationSubmittedAt: now,
    updatedAt: now
  }), { merge: true });

  // 2. Add / Update document in verification_requests collection
  const requestRef = doc(db, COLLECTIONS.VERIFICATIONS, effectiveUserId);
  const fullName = `${profileData.firstName || ''} ${profileData.lastName || ''}`.trim() || profileData.name || 'Usuário Techify';
  
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
    cep: profileData.cep || '',
    country: profileData.country || 'Brazil',
    state: profileData.state || '',
    city: profileData.city || '',
    address: profileData.address || '',
    status: 'pending',
    submittedAt: now
  }), { merge: true });

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
 * Approve Verification Request (Concede Selo Verificado e desbloqueia afiliação)
 */
export async function approveVerificationInFirebase(userId: string) {
  const now = new Date().toISOString();
  
  // 1. Update user profile to verified = true and verificationStatus = 'approved'
  const profileRef = doc(db, COLLECTIONS.PROFILES, userId);
  await setDoc(profileRef, {
    verified: true,
    verificationStatus: 'approved',
    verificationReviewedAt: now,
    updatedAt: now
  }, { merge: true });

  // 2. Update verification request record
  const requestRef = doc(db, COLLECTIONS.VERIFICATIONS, userId);
  await setDoc(requestRef, {
    status: 'approved',
    reviewedAt: now
  }, { merge: true });

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

  return { success: true };
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
  return newCompany;
}

/**
 * Approve a Company in Firestore (Admin Action)
 */
export async function approveCompanyInFirebase(companyId: string) {
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
  await deleteDoc(docRef);

  // Also delete company plans
  const plansSnap = await getDocs(collection(db, COLLECTIONS.PLANS));
  for (const p of plansSnap.docs) {
    if (p.data().companyId === companyId) {
      await deleteDoc(p.ref);
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
 * Create a new Plan / Product in Firestore
 */
export async function createCompanyPlanInFirebase(planData: Omit<CompanyPlan, 'id' | 'createdAt'>) {
  const id = `plan-${Date.now()}`;
  const now = new Date().toISOString();

  const commissionVal = Number(((planData.priceSetup * planData.commissionPercentage) / 100).toFixed(2));

  const newPlan: CompanyPlan = {
    ...planData,
    id,
    commissionValue: commissionVal,
    affiliatesCount: 0,
    totalSales: 0,
    status: 'Ativo',
    createdAt: now
  };

  const docRef = doc(db, COLLECTIONS.PLANS, id);
  await setDoc(docRef, sanitizeForFirestore(newPlan));

  // Update Company totalPlansCount or auto-create company if not present
  if (planData.companyId) {
    const compRef = doc(db, COLLECTIONS.COMPANIES, planData.companyId);
    const compSnap = await getDoc(compRef);
    if (compSnap.exists()) {
      const compData = compSnap.data() as CompanyStartup;
      await updateDoc(compRef, sanitizeForFirestore({
        totalPlansCount: (compData.totalPlansCount || 0) + 1
      }));
    } else {
      const newComp: CompanyStartup = {
        id: planData.companyId,
        name: planData.companyName || 'Techify Solutions',
        slug: (planData.companyName || 'techify-solutions').toLowerCase().replace(/\s+/g, '-'),
        tagline: `${planData.category || 'SaaS / B2B'} de alta performance`,
        logo: planData.companyLogo || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=150&q=80',
        bannerImage: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=80',
        category: (planData.category as any) || 'SaaS / B2B',
        description: `Empresa responsável pela distribuição do plano ${planData.name}.`,
        website: 'https://techifygaming.com',
        email: 'contato@techify.com',
        whatsapp: '+55 11 99999-9999',
        commissionRange: `${planData.commissionPercentage}%`,
        totalPlansCount: 1,
        totalAffiliatesCount: 0,
        totalSalesVolume: 0,
        verified: true,
        ownerId: DEFAULT_USER_ID,
        createdAt: now
      };
      await setDoc(compRef, sanitizeForFirestore(newComp));
    }
  }

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
export function subscribeUserAffiliations(callback: (affiliations: UserAffiliation[]) => void, userId: string = DEFAULT_USER_ID) {
  const q = collection(db, COLLECTIONS.AFFILIATIONS);
  return onSnapshot(q, (snap) => {
    const list: UserAffiliation[] = [];
    snap.forEach((d) => {
      const data = d.data() as UserAffiliation;
      if (!userId || data.userId === userId) {
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
 * Create a new Affiliation in Firebase (User joins a Plan)
 */
export async function createAffiliationInFirebase(plan: CompanyPlan, userProfile: UserSellerProfile) {
  const id = `aff_${userProfile.userId || DEFAULT_USER_ID}_${plan.id}`;
  const now = new Date().toISOString();
  const affiliateCode = `ref_${(userProfile.userId || 'usr').slice(0, 8)}_${plan.id.slice(-4)}`;
  const origin = window.location.origin;
  const affiliateLink = `${origin}/p/${plan.companyId}/${plan.id}?ref=${affiliateCode}`;

  const affiliation: UserAffiliation = {
    id,
    userId: userProfile.userId || DEFAULT_USER_ID,
    userName: userProfile.name,
    userEmail: userProfile.email,
    companyId: plan.companyId,
    companyName: plan.companyName,
    companyLogo: plan.companyLogo,
    planId: plan.id,
    planName: plan.name,
    priceSetup: plan.priceSetup,
    commissionPercentage: plan.commissionPercentage,
    commissionValue: plan.commissionValue,
    affiliateCode,
    affiliateLink,
    clicks: 0,
    salesCount: 0,
    totalEarned: 0,
    status: 'Ativo',
    createdAt: now
  };

  await setDoc(doc(db, COLLECTIONS.AFFILIATIONS, id), sanitizeForFirestore(affiliation));

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
    const planRef = doc(db, COLLECTIONS.PLANS, planId);
    const planSnap = await getDoc(planRef);
    if (planSnap.exists()) {
      const pData = planSnap.data() as CompanyPlan;
      await updateDoc(planRef, sanitizeForFirestore({
        affiliatesCount: Math.max(0, (pData.affiliatesCount || 1) - 1)
      }));
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
 * Record a New Sale in Firebase Firestore & update balance of the affiliate
 */
export async function createSaleTransactionInFirebase(saleData: Omit<SaleTransaction, 'id' | 'createdAt'>) {
  const id = `TX-${Math.floor(100000 + Math.random() * 900000)}`;
  const now = new Date();
  const fullSale: SaleTransaction = {
    ...saleData,
    id,
    createdAt: now.toISOString()
  };

  // 1. Save sale document
  const saleRef = doc(db, COLLECTIONS.SALES, id);
  await setDoc(saleRef, sanitizeForFirestore(fullSale));

  // 2. Update Profile Balances (Credit the affiliate or seller)
  const targetUserId = saleData.affiliateId || saleData.sellerId || DEFAULT_USER_ID;
  const profileRef = doc(db, COLLECTIONS.PROFILES, targetUserId);
  const profileSnap = await getDoc(profileRef);
  if (profileSnap.exists()) {
    const current = profileSnap.data() as UserSellerProfile;
    const newTotalEarned = (current.totalEarned || 0) + fullSale.commissionEarned;
    const newAvailable = (current.availableBalance || 0) + fullSale.commissionEarned;
    const newCount = (current.totalSalesCount || 0) + 1;
    const target = current.targetGoal || 100000;
    const progress = Math.min(100, (newTotalEarned / target) * 100);

    let level = current.partnerLevel || 'Afiliado Starter';
    if (newTotalEarned >= 100000) level = 'Master Elite Black';
    else if (newTotalEarned >= 50000) level = 'Parceiro Gold';
    else if (newTotalEarned >= 20000) level = 'Parceiro Silver';

    await updateDoc(profileRef, sanitizeForFirestore({
      totalEarned: newTotalEarned,
      availableBalance: newAvailable,
      totalSalesCount: newCount,
      partnerLevel: level,
      currentSalesProgress: Number(progress.toFixed(1)),
      updatedAt: now.toISOString()
    }));
  }

  // 3. Update Plan total sales
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

  // 4. Update Company total sales volume
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

  // 5. Update Affiliation salesCount and totalEarned if exists
  const affId = `aff_${targetUserId}_${fullSale.platformId}`;
  const affRef = doc(db, COLLECTIONS.AFFILIATIONS, affId);
  const affSnap = await getDoc(affRef);
  if (affSnap.exists()) {
    const affData = affSnap.data() as UserAffiliation;
    await updateDoc(affRef, sanitizeForFirestore({
      salesCount: (affData.salesCount || 0) + 1,
      totalEarned: (affData.totalEarned || 0) + fullSale.commissionEarned
    }));
  }

  return fullSale;
}

// ==========================================
// 🏧 SAQUES PIX (WITHDRAWALS)
// ==========================================

/**
 * Realtime Withdrawals Listener
 */
export function subscribeWithdrawals(callback: (withdrawals: WithdrawalRequest[]) => void) {
  const q = collection(db, COLLECTIONS.WITHDRAWALS);
  return onSnapshot(q, (snap) => {
    const list: WithdrawalRequest[] = [];
    snap.forEach((d) => {
      list.push({ id: d.id, ...(d.data() as Omit<WithdrawalRequest, 'id'>) });
    });
    callback(list);
  }, (err) => {
    console.error('Firestore withdrawals listener error:', err);
    callback([]);
  });
}

/**
 * Request a PIX Cashout in Firebase Firestore
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

  const newWth: WithdrawalRequest = {
    id,
    userId: userId || DEFAULT_USER_ID,
    userName: userName || INITIAL_USER_PROFILE.name,
    amount,
    pixKey,
    pixKeyType,
    status: 'Concluído',
    requestedAt: formattedDate,
    completedAt: now.toISOString()
  };

  // 1. Save withdrawal doc
  await setDoc(doc(db, COLLECTIONS.WITHDRAWALS, id), sanitizeForFirestore(newWth));

  // 2. Decrement available balance
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
