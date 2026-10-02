import { getServerAdminFirestore, verifyFirebaseIdentity } from '../../lib/firebaseAdminServer.js';
import { applyVerificationRequest, profileHasRole, profileRoleIsApproved } from '../../lib/profileEligibility.js';

type Req = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
};
type Res = {
  setHeader(name: string, value: string): void;
  status(code: number): Res;
  json(body: unknown): unknown;
};

function clean(value: unknown, max = 500): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function companyApprovalEvidence(
  rawProfile: Record<string, any>,
  request: Record<string, any> | null,
): boolean {
  const profileStatus = String(
    rawProfile.empresaVerificationStatus ||
    rawProfile.companyVerificationStatus ||
    '',
  ).toLowerCase();

  if (profileStatus === 'approved' || profileStatus === 'verified') return true;

  const requestRole = String(request?.roleType || request?.verificationRoleType || '').toLowerCase();
  const requestStatus = String(request?.companyStatus || request?.status || '').toLowerCase();

  return requestRole === 'empresa' && (requestStatus === 'approved' || requestStatus === 'verified');
}

async function findOwnedCompany(
  db: FirebaseFirestore.Firestore,
  uid: string,
  preferredCompanyId: string,
) {
  if (preferredCompanyId) {
    const preferred = await db.collection('companies').doc(preferredCompanyId).get();
    if (
      preferred.exists &&
      String(preferred.data()?.ownerId || preferred.data()?.submittedBy || '') === uid &&
      preferred.data()?.archived !== true &&
      preferred.data()?.isArchived !== true
    ) {
      return preferred;
    }
  }

  const byOwner = await db.collection('companies').where('ownerId', '==', uid).limit(20).get();
  const owned = byOwner.docs.find((doc) => doc.data().archived !== true && doc.data().isArchived !== true);
  if (owned) return owned;

  const bySubmitter = await db.collection('companies').where('submittedBy', '==', uid).limit(20).get();
  return bySubmitter.docs.find((doc) => doc.data().archived !== true && doc.data().isArchived !== true) || null;
}

export default async function handler(req: Req, res: Res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido.' });

  try {
    const identity = await verifyFirebaseIdentity(
      typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined,
    );

    const db = getServerAdminFirestore();
    const profileRef = db.collection('user_profiles').doc(identity.uid);
    const userRef = db.collection('users').doc(identity.uid);
    const requestRef = db.collection('verification_requests').doc(identity.uid);

    const [profileSnap, requestSnap] = await Promise.all([
      profileRef.get(),
      requestRef.get(),
    ]);

    if (!profileSnap.exists) {
      return res.status(404).json({ error: 'Perfil da empresa não encontrado.' });
    }

    const rawProfile = profileSnap.data() as Record<string, any>;
    const request = requestSnap.exists ? requestSnap.data() as Record<string, any> : null;
    const effectiveProfile = applyVerificationRequest(rawProfile, request) as Record<string, any>;

    if (!profileHasRole(effectiveProfile, 'empresa')) {
      return res.status(403).json({ error: 'Esta conta não possui perfil de empresa.' });
    }

    const preferredCompanyId = clean(rawProfile.companyId, 180);
    let companySnap = await findOwnedCompany(db, identity.uid, preferredCompanyId);
    const approvedByAdmin = companyApprovalEvidence(rawProfile, request);

    if (!companySnap) {
      const companyName = clean(rawProfile.companyName || request?.companyName, 160);
      if (!companyName) {
        return res.status(409).json({
          error: 'Complete o perfil da empresa antes de cadastrar produtos.',
          code: 'COMPANY_PROFILE_INCOMPLETE',
        });
      }

      const companyId =
        preferredCompanyId && /^[A-Za-z0-9_:-]{1,180}$/.test(preferredCompanyId)
          ? preferredCompanyId
          : `comp-${identity.uid.slice(0, 18)}`;

      const companyRef = db.collection('companies').doc(companyId);
      const now = new Date().toISOString();
      const approved = approvedByAdmin && profileRoleIsApproved(effectiveProfile, 'empresa');

      await companyRef.set({
        id: companyId,
        name: companyName,
        companyName,
        slug: clean(companyName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''), 100) || companyId,
        tagline: clean(rawProfile.companyTagline, 240),
        description: clean(rawProfile.companyTagline || `Empresa ${companyName}`, 5000),
        category: clean(rawProfile.companyCategory, 120) || 'SaaS / B2B',
        website: clean(rawProfile.companyWebsite, 500),
        logo: clean(rawProfile.companyLogo || rawProfile.avatar, 3000),
        email: clean(rawProfile.email || identity.email, 200),
        whatsapp: clean(rawProfile.companyPhone || rawProfile.whatsapp || rawProfile.phone, 40),
        phone: clean(rawProfile.companyPhone || rawProfile.phone || rawProfile.whatsapp, 40),
        cnpj: clean(rawProfile.companyCnpj, 30),
        cleanCnpj: clean(rawProfile.cleanCnpj, 20),
        cleanCpf: clean(rawProfile.cleanCpf, 20),
        companyDocType: clean(rawProfile.companyDocType || rawProfile.documentType, 20),
        ownerId: identity.uid,
        submittedBy: identity.uid,
        submittedByName: clean(rawProfile.name, 160),
        submittedByEmail: clean(identity.email, 200),
        status: approved ? 'approved' : 'pending',
        verified: approved,
        kyc_status: approved ? 'verified' : 'submitted',
        archived: false,
        isArchived: false,
        totalPlansCount: 0,
        totalAffiliatesCount: 0,
        totalSalesVolume: 0,
        grossRevenue: 0,
        netRevenue: 0,
        totalCheckoutFees: 0,
        totalAffiliateCommissions: 0,
        createdAt: now,
        submittedAt: rawProfile.verificationSubmittedAt || request?.submittedAt || now,
        updatedAt: now,
      }, { merge: true });

      companySnap = await companyRef.get();
    }

    if (!companySnap?.exists) {
      return res.status(409).json({ error: 'Não foi possível resolver a empresa desta conta.' });
    }

    const company = companySnap.data() as Record<string, any>;
    const companyId = companySnap.id;

    if (String(company.ownerId || company.submittedBy || '') !== identity.uid) {
      return res.status(403).json({ error: 'A empresa encontrada não pertence à conta autenticada.' });
    }

    const companyAlreadyApproved =
      company.verified === true &&
      String(company.status || '').toLowerCase() === 'approved' &&
      String(company.kyc_status || 'verified').toLowerCase() === 'verified';

    const shouldBeApproved =
      companyAlreadyApproved ||
      (approvedByAdmin && profileRoleIsApproved(effectiveProfile, 'empresa'));

    const now = new Date().toISOString();
    const batch = db.batch();

    batch.set(profileRef, {
      companyId,
      companyName: company.name || company.companyName || rawProfile.companyName || null,
      hasCompanyProfile: true,
      ...(shouldBeApproved ? {
        verified: true,
        verificationStatus: 'approved',
        empresaVerificationStatus: 'approved',
        companyVerificationStatus: 'approved',
        kyc_status: 'verified',
      } : {}),
      updatedAt: now,
    }, { merge: true });

    batch.set(userRef, {
      companyId,
      companyName: company.name || company.companyName || rawProfile.companyName || null,
      ...(shouldBeApproved ? {
        verified: true,
        verificationStatus: 'approved',
        empresaVerificationStatus: 'approved',
        companyVerificationStatus: 'approved',
        kyc_status: 'verified',
      } : {}),
      updatedAt: now,
    }, { merge: true });

    if (
      shouldBeApproved &&
      (company.status !== 'approved' || company.verified !== true || company.kyc_status !== 'verified')
    ) {
      batch.set(companySnap.ref, {
        status: 'approved',
        verified: true,
        kyc_status: 'verified',
        archived: false,
        isArchived: false,
        updatedAt: now,
      }, { merge: true });
    }

    await batch.commit();

    const finalCompanySnap = await companySnap.ref.get();
    const finalCompany = finalCompanySnap.data() || {};

    return res.status(200).json({
      success: true,
      company: { id: finalCompanySnap.id, ...finalCompany },
      companyId: finalCompanySnap.id,
      verified:
        finalCompany.verified === true &&
        String(finalCompany.status || '').toLowerCase() === 'approved',
      stripeAccountId: clean(finalCompany.stripeAccountId, 200) || null,
      stripeOnboardingStatus: clean(finalCompany.stripeOnboardingStatus, 80) || 'not_connected',
    });
  } catch (error) {
    console.error('[Company context]', error instanceof Error ? error.message : 'Falha');
    return res.status(503).json({
      error: 'Não foi possível carregar o vínculo da empresa agora.',
      code: 'COMPANY_CONTEXT_UNAVAILABLE',
    });
  }
}
