import { getServerAdminFirestore, verifyFirebaseIdentity } from '../../lib/firebaseAdminServer.js';

type ApiRequest = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
};
type ApiResponse = {
  setHeader(name: string, value: string): void;
  status(code: number): ApiResponse;
  json(body: unknown): void;
  end(): void;
};

const sendError = (res: ApiResponse, status: number, code: string, error: string) =>
  res.status(status).json({ code, error });

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return sendError(res, 405, 'METHOD_NOT_ALLOWED', 'Use POST.');

  const authorization = req.headers.authorization;
  if (typeof authorization !== 'string' || !/^Bearer\s+\S+/i.test(authorization)) {
    return sendError(res, 401, 'AUTH_REQUIRED', 'Faça login novamente para encerrar a afiliação.');
  }

  try {
    const identity = await verifyFirebaseIdentity(authorization);
    const body = req.body && typeof req.body === 'object' ? req.body as Record<string, unknown> : {};
    const affiliationId = typeof body.affiliationId === 'string' ? body.affiliationId.trim() : '';
    if (!/^[A-Za-z0-9_-]{1,220}$/.test(affiliationId)) {
      return sendError(res, 400, 'INVALID_AFFILIATION', 'Afiliação inválida.');
    }

    const db = getServerAdminFirestore();
    const affiliationRef = db.collection('affiliations').doc(affiliationId);

    const result = await db.runTransaction(async (tx) => {
      const affiliationSnap = await tx.get(affiliationRef);
      if (!affiliationSnap.exists) {
        return { kind: 'error' as const, status: 404, code: 'AFFILIATION_NOT_FOUND', error: 'Afiliação não encontrada.' };
      }

      const affiliation = affiliationSnap.data()!;
      const ownerId = String(affiliation.affiliateId || affiliation.userId || affiliation.user_id || '');
      if (ownerId !== identity.uid) {
        return { kind: 'error' as const, status: 403, code: 'FORBIDDEN', error: 'Esta afiliação não pertence à sua conta.' };
      }

      const state = String(affiliation.status || '').trim().toLowerCase();
      if (state === 'encerrada' || state === 'ended' || state === 'cancelled') {
        return { kind: 'ok' as const, alreadyEnded: true };
      }
      if (state !== 'ativo' && state !== 'active' && state !== 'approved') {
        return { kind: 'error' as const, status: 409, code: 'AFFILIATION_NOT_ACTIVE', error: 'Esta afiliação não está ativa.' };
      }

      const planId = String(affiliation.planId || affiliation.plan_id || '');
      const companyId = String(affiliation.companyId || '');
      const planRef = planId ? db.collection('plans').doc(planId) : null;
      const companyRef = companyId ? db.collection('companies').doc(companyId) : null;

      const planSnap = planRef ? await tx.get(planRef) : null;
      const companySnap = companyRef ? await tx.get(companyRef) : null;
      const now = new Date().toISOString();

      tx.set(affiliationRef, {
        status: 'Encerrada',
        endedAt: now,
        updatedAt: now,
      }, { merge: true });

      if (planRef && planSnap?.exists) {
        const current = Number(planSnap.data()?.affiliatesCount || 0);
        tx.set(planRef, { affiliatesCount: Math.max(0, current - 1), updatedAt: now }, { merge: true });
      }
      if (companyRef && companySnap?.exists) {
        const current = Number(companySnap.data()?.totalAffiliatesCount || 0);
        tx.set(companyRef, { totalAffiliatesCount: Math.max(0, current - 1), updatedAt: now }, { merge: true });
      }

      return { kind: 'ok' as const, alreadyEnded: false };
    });

    if (result.kind === 'error') return sendError(res, result.status, result.code, result.error);
    return res.status(200).json({
      success: true,
      status: 'Encerrada',
      alreadyEnded: result.alreadyEnded,
    });
  } catch (error) {
    console.error('[affiliate-leave]', error instanceof Error ? error.message : error);
    return sendError(res, 503, 'AFFILIATE_LEAVE_UNAVAILABLE', 'Não foi possível encerrar a afiliação agora.');
  }
}
