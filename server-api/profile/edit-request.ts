import { getServerAdminFirestore, verifyFirebaseIdentity } from '../../lib/firebaseAdminServer.js';

type RequestLike = {
  method?: string;
  body?: unknown;
  headers: Record<string, string | string[] | undefined>;
};

type ResponseLike = {
  setHeader(name: string, value: string): void;
  status(code: number): ResponseLike;
  json(body: unknown): unknown;
};

type Role = 'empresa' | 'afiliado';

export default async function handler(req: RequestLike, res: ResponseLike) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  try {
    const authHeader =
      typeof req.headers.authorization === 'string'
        ? req.headers.authorization
        : undefined;

    const identity = await verifyFirebaseIdentity(authHeader);
    const body =
      req.body && typeof req.body === 'object'
        ? (req.body as Record<string, unknown>)
        : {};

    const role: Role = body.role === 'afiliado' ? 'afiliado' : 'empresa';
    const reason = String(body.reason || '').trim().slice(0, 800);
    if (reason.length < 10) {
      return res.status(400).json({
        error: 'Explique em pelo menos 10 caracteres o que você precisa alterar.',
      });
    }

    const db = getServerAdminFirestore();
    const profileRef = db.collection('user_profiles').doc(identity.uid);
    const profileSnap = await profileRef.get();

    if (!profileSnap.exists) {
      return res.status(404).json({ error: 'Perfil não encontrado.' });
    }

    const profile = profileSnap.data() as Record<string, any>;
    if (profile.banned === true || String(profile.status || '').toLowerCase() === 'banned') {
      return res.status(403).json({ error: 'Esta conta não pode solicitar alterações.' });
    }

    const now = new Date().toISOString();
    const requestRef = db.collection('verification_requests').doc(identity.uid);
    const usersRef = db.collection('users').doc(identity.uid);
    const batch = db.batch();

    if (role === 'afiliado') {
      const affiliateStatus = String(
        profile.affiliateVerificationStatus ||
        (
          (String(profile.verificationRoleType || '').toLowerCase() === 'afiliado' ||
           String(profile.accountType || '').toLowerCase() === 'afiliado')
            ? profile.verificationStatus
            : ''
        ) ||
        ''
      ).toLowerCase();

      if (affiliateStatus !== 'approved' && affiliateStatus !== 'verified') {
        return res.status(409).json({
          error: 'O perfil de Afiliado só pode solicitar ajuste depois da aprovação da administração.',
        });
      }

      if (profile.affiliateProfileEditUnlocked === true) {
        return res.status(409).json({
          error: 'A edição do perfil já está liberada. Faça os ajustes e envie novamente para análise.',
        });
      }

      const currentStatus = String(profile.affiliateEditRequestStatus || '').toLowerCase();
      if (currentStatus === 'pending') {
        return res.status(409).json({
          error: 'Já existe uma solicitação de ajuste aguardando a administração.',
        });
      }

      const affiliateUpdate = {
        affiliateEditRequestStatus: 'pending',
        affiliateEditRequestReason: reason,
        affiliateEditRequestedAt: now,
        affiliateProfileEditUnlocked: false,
        updatedAt: now,
      };

      batch.set(profileRef, affiliateUpdate, { merge: true });
      batch.set(usersRef, affiliateUpdate, { merge: true });
      batch.set(requestRef, {
        id: identity.uid,
        userId: identity.uid,
        roleType: 'afiliado',
        affiliateEditRequestStatus: 'pending',
        affiliateEditRequestReason: reason,
        affiliateEditRequestedAt: now,
        affiliateProfileEditUnlocked: false,
        updatedAt: now,
      }, { merge: true });
    } else {
      const companyId = String(profile.companyId || '').trim();

      if (!companyId) {
        return res.status(409).json({
          error: 'Sua conta ainda não possui uma empresa aprovada para solicitar ajuste.',
        });
      }

      const companyRef = db.collection('companies').doc(companyId);
      const companySnap = await companyRef.get();

      if (!companySnap.exists) {
        return res.status(404).json({ error: 'Empresa não encontrada.' });
      }

      const company = companySnap.data() as Record<string, any>;
      if (String(company.ownerId || company.submittedBy || '') !== identity.uid) {
        return res.status(403).json({ error: 'Esta empresa não pertence à sua conta.' });
      }

      const approved =
        company.verified === true &&
        String(company.status || '').toLowerCase() === 'approved' &&
        company.archived !== true &&
        company.isArchived !== true &&
        company.banned !== true;

      if (!approved) {
        return res.status(409).json({
          error: 'O perfil só pode solicitar ajuste depois da aprovação da administração.',
        });
      }

      if (profile.companyProfileEditUnlocked === true) {
        return res.status(409).json({
          error: 'A edição do perfil já está liberada. Faça os ajustes e envie novamente para análise.',
        });
      }

      const currentStatus = String(
        profile.companyEditRequestStatus ||
        company.profileEditRequestStatus ||
        '',
      ).toLowerCase();

      if (currentStatus === 'pending') {
        return res.status(409).json({
          error: 'Já existe uma solicitação de ajuste aguardando a administração.',
        });
      }

      batch.set(profileRef, {
        companyEditRequestStatus: 'pending',
        companyEditRequestReason: reason,
        companyEditRequestedAt: now,
        companyProfileEditUnlocked: false,
        updatedAt: now,
      }, { merge: true });

      batch.set(usersRef, {
        companyEditRequestStatus: 'pending',
        companyEditRequestReason: reason,
        companyEditRequestedAt: now,
        companyProfileEditUnlocked: false,
        updatedAt: now,
      }, { merge: true });

      batch.set(companyRef, {
        profileEditRequestStatus: 'pending',
        profileEditRequestReason: reason,
        profileEditRequestedAt: now,
        profileEditUnlocked: false,
        updatedAt: now,
      }, { merge: true });

      batch.set(requestRef, {
        id: identity.uid,
        userId: identity.uid,
        roleType: 'empresa',
        companyId,
        companyName: company.name || company.companyName || profile.companyName || null,
        companyEditRequestStatus: 'pending',
        companyEditRequestReason: reason,
        companyEditRequestedAt: now,
        companyProfileEditUnlocked: false,
        updatedAt: now,
      }, { merge: true });
    }

    await batch.commit();

    return res.status(200).json({
      success: true,
      role,
      status: 'pending',
      requestedAt: now,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha desconhecida';
    console.error('[Profile edit request]', message);

    if (/Firebase ID token|token inválido|token expir|auth\/id-token/i.test(message)) {
      return res.status(401).json({ error: 'Sua sessão expirou. Entre novamente.' });
    }

    return res.status(503).json({
      error: 'Não foi possível enviar a solicitação de ajuste agora.',
    });
  }
}
