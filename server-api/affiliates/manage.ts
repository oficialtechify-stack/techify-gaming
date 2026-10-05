import { FieldValue } from 'firebase-admin/firestore';
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

const fail = (res: ApiResponse, status: number, code: string, error: string) =>
  res.status(status).json({ code, error });

const normalizeStatus = (value: unknown) => String(value || '').trim().toLowerCase();

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return fail(res, 405, 'METHOD_NOT_ALLOWED', 'Use POST.');

  const authorization = req.headers.authorization;
  if (typeof authorization !== 'string' || !/^Bearer\s+\S+/i.test(authorization)) {
    return fail(res, 401, 'AUTH_REQUIRED', 'Faça login novamente para gerenciar a solicitação.');
  }

  try {
    const identity = await verifyFirebaseIdentity(authorization);
    const body = req.body && typeof req.body === 'object' ? req.body as Record<string, unknown> : {};
    const affiliationId = String(body.affiliationId || '').trim();
    const action = String(body.action || '').trim().toLowerCase();

    if (!/^aff_[A-Za-z0-9_-]{1,220}$/.test(affiliationId)) {
      return fail(res, 400, 'INVALID_AFFILIATION', 'Solicitação de afiliação inválida.');
    }
    if (action !== 'approve' && action !== 'reject') {
      return fail(res, 400, 'INVALID_ACTION', 'Escolha aprovar ou recusar a solicitação.');
    }

    const db = getServerAdminFirestore();
    const affiliationRef = db.collection('affiliations').doc(affiliationId);

    const result = await db.runTransaction(async (tx) => {
      const affiliationSnap = await tx.get(affiliationRef);
      if (!affiliationSnap.exists) {
        return { error: 'Solicitação de afiliação não encontrada.', code: 'AFFILIATION_NOT_FOUND', status: 404 };
      }

      const affiliation = affiliationSnap.data()! as Record<string, any>;
      const planId = String(affiliation.planId || affiliation.plan_id || '').trim();
      const companyId = String(affiliation.companyId || '').trim();
      if (!planId || !companyId) {
        return { error: 'A solicitação não está vinculada corretamente a produto e empresa.', code: 'AFFILIATION_INVALID', status: 409 };
      }

      const planRef = db.collection('plans').doc(planId);
      const companyRef = db.collection('companies').doc(companyId);
      const [planSnap, companySnap] = await Promise.all([tx.get(planRef), tx.get(companyRef)]);

      if (!planSnap.exists || !companySnap.exists) {
        return { error: 'Produto ou empresa vinculados não foram encontrados.', code: 'COMPANY_OR_PLAN_NOT_FOUND', status: 404 };
      }

      const plan = planSnap.data()! as Record<string, any>;
      const company = companySnap.data()! as Record<string, any>;
      const ownerId = String(plan.ownerId || company.ownerId || company.submittedBy || '').trim();

      if (!ownerId || ownerId !== identity.uid || String(company.ownerId || company.submittedBy || '') !== identity.uid) {
        return { error: 'Somente a empresa proprietária pode decidir esta afiliação.', code: 'FORBIDDEN', status: 403 };
      }

      const currentStatus = normalizeStatus(affiliation.status);
      const isActive = currentStatus === 'ativo' || currentStatus === 'active' || currentStatus === 'approved';
      const countedActive = affiliation.countedActive === true;

      if (action === 'approve') {
        if (isActive) {
          return { affiliation: { id: affiliationSnap.id, ...affiliation }, alreadyDone: true };
        }
        if (!['pendente', 'pending', 'requested', 'solicitado'].includes(currentStatus)) {
          return { error: 'Esta solicitação não está pendente de aprovação.', code: 'AFFILIATION_NOT_PENDING', status: 409 };
        }

        const now = new Date().toISOString();
        tx.set(affiliationRef, {
          status: 'Ativo',
          countedActive: true,
          approvedAt: now,
          rejectedAt: null,
          updatedAt: now,
        }, { merge: true });

        if (!countedActive) {
          tx.set(planRef, {
            affiliatesCount: FieldValue.increment(1),
            updatedAt: now,
          }, { merge: true });
          tx.set(companyRef, {
            totalAffiliatesCount: FieldValue.increment(1),
            updatedAt: now,
          }, { merge: true });
        }

        return {
          affiliation: {
            id: affiliationSnap.id,
            ...affiliation,
            status: 'Ativo',
            countedActive: true,
            approvedAt: now,
            updatedAt: now,
          },
          alreadyDone: false,
        };
      }

      if (isActive) {
        return { error: 'Use a ação de remover afiliado para encerrar uma afiliação já ativa.', code: 'AFFILIATION_ALREADY_ACTIVE', status: 409 };
      }

      if (!['pendente', 'pending', 'requested', 'solicitado'].includes(currentStatus)) {
        return { affiliation: { id: affiliationSnap.id, ...affiliation }, alreadyDone: true };
      }

      const now = new Date().toISOString();
      tx.set(affiliationRef, {
        status: 'Recusada',
        countedActive: false,
        rejectedAt: now,
        updatedAt: now,
      }, { merge: true });

      return {
        affiliation: {
          id: affiliationSnap.id,
          ...affiliation,
          status: 'Recusada',
          countedActive: false,
          rejectedAt: now,
          updatedAt: now,
        },
        alreadyDone: false,
      };
    });

    if ('error' in result) return fail(res, result.status, result.code, result.error);

    return res.status(200).json({
      success: true,
      action,
      affiliation: result.affiliation,
      alreadyDone: result.alreadyDone,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (/Firebase ID token|token inválido|auth\/id-token/i.test(message)) {
      return fail(res, 401, 'INVALID_TOKEN', 'Sua sessão expirou. Entre novamente.');
    }
    console.error('[affiliate-manage] failed', error);
    return fail(res, 500, 'AFFILIATE_MANAGE_FAILED', 'Não foi possível atualizar a solicitação agora.');
  }
}
