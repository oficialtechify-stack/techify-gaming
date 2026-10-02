import { getAuth } from 'firebase-admin/auth';
import { getServerAdminApp, getServerAdminFirestore, verifyFirebaseIdentity } from '../../lib/firebaseAdminServer.js';

const BUILTIN_ADMINS = new Set([
  'rickmarketing81@gmail.com',
  'leadspay.oficial@gmail.com',
]);

type Req = {
  method?: string;
  body?: unknown;
  headers: Record<string, string | string[] | undefined>;
};
type Res = {
  setHeader(name: string, value: string): void;
  status(code: number): Res;
  json(body: unknown): unknown;
};

function configuredAdmins(): Set<string> {
  const extra = String(process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  return new Set([...BUILTIN_ADMINS, ...extra]);
}

async function requireAdmin(req: Req) {
  const identity = await verifyFirebaseIdentity(
    typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined,
  );
  if (!identity.email || !configuredAdmins().has(identity.email.toLowerCase())) {
    throw Object.assign(new Error('Acesso administrativo não autorizado.'), { statusCode: 403 });
  }
  return identity;
}

async function updateVerificationDocs(
  db: FirebaseFirestore.Firestore,
  userId: string,
  update: Record<string, unknown>,
) {
  const direct = db.collection('verification_requests').doc(userId);
  const byUser = await db.collection('verification_requests').where('userId', '==', userId).limit(50).get();
  const batch = db.batch();
  batch.set(direct, update, { merge: true });
  for (const doc of byUser.docs) batch.set(doc.ref, update, { merge: true });
  await batch.commit();
}

async function approveCompany(db: FirebaseFirestore.Firestore, companyId: string, reviewedBy: string) {
  const ref = db.collection('companies').doc(companyId);
  const snap = await ref.get();
  if (!snap.exists) throw Object.assign(new Error('Empresa não encontrada.'), { statusCode: 404 });
  const company = snap.data()!;
  const ownerId = String(company.ownerId || company.submittedBy || '');
  if (!ownerId) throw Object.assign(new Error('Empresa sem proprietário válido.'), { statusCode: 409 });

  const now = new Date().toISOString();
  const batch = db.batch();
  batch.set(ref, {
    status: 'approved',
    verified: true,
    kyc_status: 'verified',
    archived: false,
    isArchived: false,
    banned: false,
    banReason: null,
    rejectionReason: null,
    reviewedAt: now,
    reviewedBy,
    updatedAt: now,
  }, { merge: true });

  const profileRef = db.collection('user_profiles').doc(ownerId);
  const profileSnap = await profileRef.get();
  const profile = profileSnap.exists ? profileSnap.data()! : {};
  const hadAffiliate = profile.hasAffiliateProfile === true || profile.accountType === 'afiliado' || profile.accountType === 'ambos';
  batch.set(profileRef, {
    verified: true,
    verificationStatus: 'approved',
    empresaVerificationStatus: 'approved',
    companyVerificationStatus: 'approved',
    kyc_status: 'verified',
    hasCompanyProfile: true,
    hasAffiliateProfile: hadAffiliate || profile.hasAffiliateProfile === true,
    accountType: hadAffiliate ? 'ambos' : 'empresa',
    companyId,
    companyName: company.name || company.companyName || null,
    updatedAt: now,
  }, { merge: true });

  batch.set(db.collection('users').doc(ownerId), {
    verified: true,
    verificationStatus: 'approved',
    empresaVerificationStatus: 'approved',
    companyVerificationStatus: 'approved',
    companyId,
    updatedAt: now,
  }, { merge: true });

  await batch.commit();
  await updateVerificationDocs(db, ownerId, {
    status: 'approved',
    verified: true,
    kyc_status: 'verified',
    reviewedAt: now,
    reviewedBy,
    rejectionReason: null,
    updatedAt: now,
  });
  return { companyId, ownerId };
}

async function hasFinancialHistory(db: FirebaseFirestore.Firestore, id: string, type: 'user' | 'company') {
  const checks: Promise<FirebaseFirestore.QuerySnapshot>[] = [];
  if (type === 'company') {
    checks.push(db.collection('sales').where('companyId', '==', id).limit(1).get());
  } else {
    checks.push(
      db.collection('sales').where('companyOwnerId', '==', id).limit(1).get(),
      db.collection('sales').where('affiliateId', '==', id).limit(1).get(),
      db.collection('withdrawals').where('userId', '==', id).limit(1).get(),
    );
  }
  const snaps = await Promise.all(checks);
  return snaps.some((snap) => !snap.empty);
}

export default async function handler(req: Req, res: Res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });

  try {
    const admin = await requireAdmin(req);
    const body = req.body && typeof req.body === 'object' ? req.body as Record<string, unknown> : {};
    const action = String(body.action || '').trim();
    const id = String(body.id || '').trim();
    const type = body.type === 'company' ? 'company' : 'user';
    const reason = String(body.reason || '').trim().slice(0, 800);
    if (!action || !id || !/^[A-Za-z0-9_:-]{1,160}$/.test(id)) {
      return res.status(400).json({ error: 'Ação ou ID inválido.' });
    }

    const db = getServerAdminFirestore();
    const now = new Date().toISOString();
    const reviewedBy = admin.email || admin.uid;

    if (action === 'approve-company') {
      const result = await approveCompany(db, id, reviewedBy);
      return res.status(200).json({ success: true, ...result });
    }

    if (action === 'approve-verification') {
      const profileRef = db.collection('user_profiles').doc(id);
      const profileSnap = await profileRef.get();
      if (!profileSnap.exists) return res.status(404).json({ error: 'Perfil não encontrado.' });
      const profile = profileSnap.data()!;
      const isAffiliate = profile.accountType === 'afiliado' || profile.accountType === 'ambos' || profile.hasAffiliateProfile === true;
      const isCompany = profile.accountType === 'empresa' || profile.accountType === 'ambos' || profile.hasCompanyProfile === true;
      const accountType = isAffiliate && isCompany ? 'ambos' : isCompany ? 'empresa' : 'afiliado';

      const batch = db.batch();
      const common = {
        verified: true,
        verificationStatus: 'approved',
        kyc_status: 'verified',
        accountType,
        affiliateVerificationStatus: isAffiliate ? 'approved' : (profile.affiliateVerificationStatus || null),
        empresaVerificationStatus: isCompany ? 'approved' : (profile.empresaVerificationStatus || null),
        companyVerificationStatus: isCompany ? 'approved' : (profile.companyVerificationStatus || null),
        banned: false,
        banReason: null,
        rejectionReason: null,
        verificationReviewedAt: now,
        reviewedBy,
        updatedAt: now,
      };
      batch.set(profileRef, common, { merge: true });
      batch.set(db.collection('users').doc(id), common, { merge: true });
      await batch.commit();
      await updateVerificationDocs(db, id, {
        status: 'approved',
        verified: true,
        kyc_status: 'verified',
        reviewedAt: now,
        reviewedBy,
        rejectionReason: null,
        updatedAt: now,
      });

      if (isCompany) {
        const owned = await db.collection('companies').where('ownerId', '==', id).limit(20).get();
        for (const companyDoc of owned.docs) await approveCompany(db, companyDoc.id, reviewedBy);
      }
      return res.status(200).json({ success: true, id });
    }

    if (action === 'reject-entity') {
      if (!reason) return res.status(400).json({ error: 'Informe o motivo da rejeição.' });
      if (type === 'company') {
        const ref = db.collection('companies').doc(id);
        const snap = await ref.get();
        if (!snap.exists) return res.status(404).json({ error: 'Empresa não encontrada.' });
        const ownerId = String(snap.data()!.ownerId || snap.data()!.submittedBy || '');
        await ref.set({
          status: 'rejected', verified: false, rejectionReason: reason,
          reviewedAt: now, reviewedBy, updatedAt: now,
        }, { merge: true });
        if (ownerId) {
          await db.collection('user_profiles').doc(ownerId).set({
            verified: false,
            verificationStatus: 'rejected',
            empresaVerificationStatus: 'rejected',
            companyVerificationStatus: 'rejected',
            kyc_status: 'rejected',
            rejectionReason: reason,
            updatedAt: now,
          }, { merge: true });
          await updateVerificationDocs(db, ownerId, {
            status: 'rejected', verified: false, kyc_status: 'rejected',
            rejectionReason: reason, reviewedAt: now, reviewedBy, updatedAt: now,
          });
        }
      } else {
        const batch = db.batch();
        const update = {
          verified: false, verificationStatus: 'rejected', kyc_status: 'rejected',
          rejectionReason: reason, verificationRejectionReason: reason,
          verificationReviewedAt: now, reviewedBy, updatedAt: now,
        };
        batch.set(db.collection('user_profiles').doc(id), update, { merge: true });
        batch.set(db.collection('users').doc(id), update, { merge: true });
        await batch.commit();
        await updateVerificationDocs(db, id, {
          status: 'rejected', verified: false, kyc_status: 'rejected',
          rejectionReason: reason, reviewedAt: now, reviewedBy, updatedAt: now,
        });
        const companies = await db.collection('companies').where('ownerId', '==', id).limit(20).get();
        for (const company of companies.docs) {
          await company.ref.set({ status: 'rejected', verified: false, rejectionReason: reason, reviewedAt: now, reviewedBy, updatedAt: now }, { merge: true });
        }
      }
      return res.status(200).json({ success: true });
    }

    if (action === 'ban-entity' || action === 'unban-entity') {
      const banning = action === 'ban-entity';
      if (banning && !reason) return res.status(400).json({ error: 'Informe o motivo do bloqueio.' });
      const status = banning ? 'banned' : 'approved';
      const update = banning ? {
        status, verified: false, banned: true, banReason: reason, bannedAt: now, reviewedBy, updatedAt: now,
      } : {
        status, verified: true, banned: false, banReason: null, unbannedAt: now, reviewedBy, updatedAt: now,
      };
      if (type === 'company') {
        const ref = db.collection('companies').doc(id);
        if (!(await ref.get()).exists) return res.status(404).json({ error: 'Empresa não encontrada.' });
        await ref.set(update, { merge: true });
      } else {
        const batch = db.batch();
        batch.set(db.collection('user_profiles').doc(id), update, { merge: true });
        batch.set(db.collection('users').doc(id), update, { merge: true });
        batch.set(db.collection('verification_requests').doc(id), {
          status, banReason: banning ? reason : null, reviewedAt: now, reviewedBy, updatedAt: now,
        }, { merge: true });
        await batch.commit();
      }
      return res.status(200).json({ success: true });
    }

    if (action === 'purge-entity') {
      if (String(body.confirmation || '') !== 'EXCLUIR') {
        return res.status(400).json({ error: 'Confirmação inválida.' });
      }
      if (await hasFinancialHistory(db, id, type)) {
        return res.status(409).json({
          error: 'Esta conta possui histórico financeiro e não pode ser apagada. Bloqueie ou arquive para preservar a trilha contábil.',
          code: 'FINANCIAL_HISTORY_MUST_BE_PRESERVED',
        });
      }

      if (type === 'company') {
        const companyRef = db.collection('companies').doc(id);
        const companySnap = await companyRef.get();
        if (!companySnap.exists) return res.status(404).json({ error: 'Empresa não encontrada.' });
        const ownerId = String(companySnap.data()!.ownerId || '');
        const [plans, affiliations] = await Promise.all([
          db.collection('plans').where('companyId', '==', id).limit(500).get(),
          db.collection('affiliations').where('companyId', '==', id).limit(500).get(),
        ]);
        const batch = db.batch();
        batch.delete(companyRef);
        for (const item of plans.docs) batch.delete(item.ref);
        for (const item of affiliations.docs) batch.delete(item.ref);
        if (ownerId) batch.set(db.collection('user_profiles').doc(ownerId), {
          companyId: null, companyName: null, hasCompanyProfile: false, updatedAt: now,
        }, { merge: true });
        await batch.commit();
      } else {
        const [aff1, aff2, companies] = await Promise.all([
          db.collection('affiliations').where('affiliateId', '==', id).limit(500).get(),
          db.collection('affiliations').where('userId', '==', id).limit(500).get(),
          db.collection('companies').where('ownerId', '==', id).limit(100).get(),
        ]);
        for (const company of companies.docs) {
          if (await hasFinancialHistory(db, company.id, 'company')) {
            return res.status(409).json({
              error: 'O usuário possui empresa com histórico financeiro. Bloqueie a conta em vez de excluir.',
              code: 'OWNED_COMPANY_HAS_FINANCIAL_HISTORY',
            });
          }
        }
        const batch = db.batch();
        batch.delete(db.collection('user_profiles').doc(id));
        batch.delete(db.collection('users').doc(id));
        batch.delete(db.collection('verification_requests').doc(id));
        for (const item of aff1.docs) batch.delete(item.ref);
        for (const item of aff2.docs) batch.delete(item.ref);
        for (const company of companies.docs) batch.delete(company.ref);
        await batch.commit();
        try { await getAuth(getServerAdminApp()).deleteUser(id); } catch {}
      }
      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: 'Ação administrativa não reconhecida.' });
  } catch (error: any) {
    const status = Number(error?.statusCode || 503);
    console.error('[Admin entity action]', error instanceof Error ? error.message : 'Falha');
    return res.status(status).json({ error: error instanceof Error ? error.message : 'Não foi possível concluir a ação administrativa.' });
  }
}
