import { getAuth } from 'firebase-admin/auth';
import { FieldValue } from 'firebase-admin/firestore';
import { getServerAdminApp, getServerAdminFirestore } from '../../lib/firebaseAdminServer.js';
import { requireAdminIdentity } from '../../lib/adminAccess.js';

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

  const profileRef = db.collection('user_profiles').doc(ownerId);
  const profileSnap = await profileRef.get();
  const profile = profileSnap.exists ? profileSnap.data()! : {};
  const hadAffiliate = profile.hasAffiliateProfile === true || profile.accountType === 'afiliado' || profile.accountType === 'ambos';
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
  batch.set(profileRef, {
    verified: true,
    verificationStatus: 'approved',
    empresaVerificationStatus: 'approved',
    companyVerificationStatus: 'approved',
    kyc_status: 'verified',
    hasCompanyProfile: true,
    hasAffiliateProfile: hadAffiliate,
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
    roleType: 'empresa',
    companyId,
    companyName: company.name || company.companyName || null,
    companyStatus: 'approved',
    status: 'approved',
    verified: true,
    kyc_status: 'verified',
    rejectionReason: null,
    companyRejectionReason: null,
    reviewedAt: now,
    reviewedBy,
    updatedAt: now,
  });
  return { companyId, ownerId, status: 'approved', verified: true };
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
      db.collection('balance_releases').where('userId', '==', id).limit(1).get(),
    );
  }
  const snaps = await Promise.all(checks);
  return snaps.some((snap) => !snap.empty);
}

export default async function handler(req: Req, res: Res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });

  try {
    const admin = await requireAdminIdentity(req.headers);
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
      return res.status(200).json({ success: true, entity: result });
    }

    if (action === 'approve-verification') {
      const profileRef = db.collection('user_profiles').doc(id);
      const profileSnap = await profileRef.get();
      if (!profileSnap.exists) return res.status(404).json({ error: 'Perfil não encontrado.' });
      const profile = profileSnap.data()!;
      const requestSnap = await db.collection('verification_requests').doc(id).get();
      const request = requestSnap.exists ? requestSnap.data()! : {};
      const verificationRole = String(
        request.roleType ||
        profile.verificationRoleType ||
        profile.activeRoleMode ||
        ''
      ).toLowerCase();

      if (verificationRole === 'empresa') {
        const companyId = String(request.companyId || profile.companyId || '').trim();
        if (!companyId) {
          return res.status(409).json({ error: 'O perfil de empresa não possui companyId para aprovação.' });
        }
        const result = await approveCompany(db, companyId, reviewedBy);
        return res.status(200).json({ success: true, entity: result });
      }

      const hasCompany = profile.hasCompanyProfile === true || profile.accountType === 'empresa' || profile.accountType === 'ambos';
      const update = {
        verified: true,
        verificationStatus: 'approved',
        affiliateVerificationStatus: 'approved',
        kyc_status: 'verified',
        hasAffiliateProfile: true,
        accountType: hasCompany ? 'ambos' : 'afiliado',
        banned: false,
        banReason: null,
        verificationRejectionReason: null,
        verificationReviewedAt: now,
        reviewedBy,
        updatedAt: now,
      };
      const batch = db.batch();
      batch.set(profileRef, update, { merge: true });
      batch.set(db.collection('users').doc(id), update, { merge: true });
      await batch.commit();
      await updateVerificationDocs(db, id, {
        roleType: 'afiliado',
        status: 'approved',
        verified: true,
        kyc_status: 'verified',
        reviewedAt: now,
        reviewedBy,
        rejectionReason: null,
        updatedAt: now,
      });
      return res.status(200).json({ success: true, entity: { id, status: 'approved', verified: true } });
    }

    if (action === 'reject-entity') {
      if (!reason) return res.status(400).json({ error: 'Informe o motivo da rejeição.' });

      if (type === 'company') {
        const ref = db.collection('companies').doc(id);
        const snap = await ref.get();
        if (!snap.exists) return res.status(404).json({ error: 'Empresa não encontrada.' });
        const company = snap.data()!;
        const ownerId = String(company.ownerId || company.submittedBy || '');
        await ref.set({
          status: 'rejected',
          verified: false,
          kyc_status: 'rejected',
          rejectionReason: reason,
          reviewedAt: now,
          reviewedBy,
          updatedAt: now,
        }, { merge: true });

        if (ownerId) {
          const profileRef = db.collection('user_profiles').doc(ownerId);
          const profileSnap = await profileRef.get();
          const profile = profileSnap.exists ? profileSnap.data()! : {};
          const affiliateApproved = profile.affiliateVerificationStatus === 'approved';
          const update = {
            verified: affiliateApproved,
            verificationStatus: affiliateApproved ? 'approved' : 'rejected',
            empresaVerificationStatus: 'rejected',
            companyVerificationStatus: 'rejected',
            kyc_status: affiliateApproved ? 'verified' : 'rejected',
            rejectionReason: reason,
            updatedAt: now,
          };
          const batch = db.batch();
          batch.set(profileRef, update, { merge: true });
          batch.set(db.collection('users').doc(ownerId), update, { merge: true });
          await batch.commit();
          await updateVerificationDocs(db, ownerId, {
            companyId: id,
            companyStatus: 'rejected',
            companyRejectionReason: reason,
            reviewedAt: now,
            reviewedBy,
            updatedAt: now,
          });
        }
        return res.status(200).json({ success: true, entity: { id, status: 'rejected', verified: false } });
      }

      const profileRef = db.collection('user_profiles').doc(id);
      const profileSnap = await profileRef.get();
      if (!profileSnap.exists) return res.status(404).json({ error: 'Perfil não encontrado.' });
      const profile = profileSnap.data()!;
      const companyApproved = profile.empresaVerificationStatus === 'approved' || profile.companyVerificationStatus === 'approved';
      const update = {
        verified: companyApproved,
        verificationStatus: companyApproved ? 'approved' : 'rejected',
        affiliateVerificationStatus: 'rejected',
        kyc_status: companyApproved ? 'verified' : 'rejected',
        rejectionReason: reason,
        verificationRejectionReason: reason,
        verificationReviewedAt: now,
        reviewedBy,
        updatedAt: now,
      };
      const batch = db.batch();
      batch.set(profileRef, update, { merge: true });
      batch.set(db.collection('users').doc(id), update, { merge: true });
      await batch.commit();
      await updateVerificationDocs(db, id, {
        roleType: 'afiliado',
        status: 'rejected',
        verified: false,
        kyc_status: 'rejected',
        rejectionReason: reason,
        reviewedAt: now,
        reviewedBy,
        updatedAt: now,
      });
      return res.status(200).json({ success: true, entity: { id, status: 'rejected', verified: companyApproved } });
    }

    if (action === 'ban-entity' || action === 'unban-entity') {
      const banning = action === 'ban-entity';
      if (banning && !reason) return res.status(400).json({ error: 'Informe o motivo do bloqueio.' });

      if (type === 'company') {
        const ref = db.collection('companies').doc(id);
        const snap = await ref.get();
        if (!snap.exists) return res.status(404).json({ error: 'Empresa não encontrada.' });
        const data = snap.data()!;

        if (banning) {
          await ref.set({
            statusBeforeBan: data.status || 'pending',
            verifiedBeforeBan: data.verified === true,
            kycStatusBeforeBan: data.kyc_status || null,
            status: 'banned',
            verified: false,
            banned: true,
            banReason: reason,
            bannedAt: now,
            reviewedBy,
            updatedAt: now,
          }, { merge: true });
          return res.status(200).json({ success: true, entity: { id, status: 'banned', verified: false, banned: true } });
        }

        const restoredStatus = String(data.statusBeforeBan || (data.verifiedBeforeBan ? 'approved' : 'pending'));
        const restoredVerified = data.verifiedBeforeBan === true;
        const restoredKyc = String(data.kycStatusBeforeBan || (restoredVerified ? 'verified' : 'pending'));
        await ref.set({
          status: restoredStatus,
          verified: restoredVerified,
          kyc_status: restoredKyc,
          banned: false,
          banReason: null,
          unbannedAt: now,
          reviewedBy,
          updatedAt: now,
          statusBeforeBan: FieldValue.delete(),
          verifiedBeforeBan: FieldValue.delete(),
          kycStatusBeforeBan: FieldValue.delete(),
        }, { merge: true });
        return res.status(200).json({ success: true, entity: { id, status: restoredStatus, verified: restoredVerified, banned: false } });
      }

      const profileRef = db.collection('user_profiles').doc(id);
      const profileSnap = await profileRef.get();
      if (!profileSnap.exists) return res.status(404).json({ error: 'Perfil não encontrado.' });
      const profile = profileSnap.data()!;

      if (banning) {
        const update = {
          statusBeforeBan: profile.status || profile.verificationStatus || 'pending',
          verifiedBeforeBan: profile.verified === true,
          verificationStatusBeforeBan: profile.verificationStatus || 'pending',
          kycStatusBeforeBan: profile.kyc_status || 'pending',
          status: 'banned',
          verified: false,
          banned: true,
          banReason: reason,
          bannedAt: now,
          reviewedBy,
          updatedAt: now,
        };
        const batch = db.batch();
        batch.set(profileRef, update, { merge: true });
        batch.set(db.collection('users').doc(id), update, { merge: true });
        await batch.commit();
        await updateVerificationDocs(db, id, {
          status: 'banned',
          banned: true,
          banReason: reason,
          reviewedAt: now,
          reviewedBy,
          updatedAt: now,
        });
        return res.status(200).json({ success: true, entity: { id, status: 'banned', verified: false, banned: true } });
      }

      const restoredVerified = profile.verifiedBeforeBan === true;
      const restoredVerification = String(profile.verificationStatusBeforeBan || (restoredVerified ? 'approved' : 'pending'));
      const restoredStatus = String(profile.statusBeforeBan || restoredVerification);
      const restoredKyc = String(profile.kycStatusBeforeBan || (restoredVerified ? 'verified' : 'pending'));
      const restore = {
        status: restoredStatus,
        verified: restoredVerified,
        verificationStatus: restoredVerification,
        kyc_status: restoredKyc,
        banned: false,
        banReason: null,
        unbannedAt: now,
        reviewedBy,
        updatedAt: now,
        statusBeforeBan: FieldValue.delete(),
        verifiedBeforeBan: FieldValue.delete(),
        verificationStatusBeforeBan: FieldValue.delete(),
        kycStatusBeforeBan: FieldValue.delete(),
      };
      const batch = db.batch();
      batch.set(profileRef, restore, { merge: true });
      batch.set(db.collection('users').doc(id), restore, { merge: true });
      await batch.commit();
      await updateVerificationDocs(db, id, {
        status: restoredVerification,
        verified: restoredVerified,
        banned: false,
        banReason: null,
        reviewedAt: now,
        reviewedBy,
        updatedAt: now,
      });
      return res.status(200).json({
        success: true,
        entity: { id, status: restoredStatus, verificationStatus: restoredVerification, verified: restoredVerified, banned: false },
      });
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
        if (ownerId) {
          const profileRef = db.collection('user_profiles').doc(ownerId);
          const profileSnap = await profileRef.get();
          const profile = profileSnap.exists ? profileSnap.data()! : {};
          const keepAffiliate = profile.hasAffiliateProfile === true || profile.accountType === 'afiliado' || profile.accountType === 'ambos';
          batch.set(profileRef, {
            companyId: null,
            companyName: null,
            hasCompanyProfile: false,
            accountType: keepAffiliate ? 'afiliado' : (profile.accountType || 'empresa'),
            activeRoleMode: keepAffiliate ? 'afiliado' : profile.activeRoleMode || 'empresa',
            updatedAt: now,
          }, { merge: true });
        }
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
      return res.status(200).json({ success: true, entity: { id, deleted: true } });
    }

    return res.status(400).json({ error: 'Ação administrativa não reconhecida.' });
  } catch (error: any) {
    const status = Number(error?.statusCode || 503);
    console.error('[Admin entity action]', error instanceof Error ? error.message : 'Falha');
    return res.status(status).json({ error: error instanceof Error ? error.message : 'Não foi possível concluir a ação administrativa.' });
  }
}
