import { randomBytes } from 'node:crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { getServerAdminFirestore, verifyFirebaseIdentity } from '../../lib/firebaseAdminServer.js';
import { getLeadspayBaseUrl } from '../../lib/stripeServer.js';
import { applyVerificationRequest, profileHasRole, profileRoleIsApproved } from '../../lib/profileEligibility.js';

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
    return sendError(res, 401, 'AUTH_REQUIRED', 'Faça login novamente para solicitar a afiliação.');
  }

  try {
    const identity = await verifyFirebaseIdentity(authorization);
    const body = req.body && typeof req.body === 'object' ? req.body as Record<string, unknown> : {};
    const planId = typeof body.planId === 'string' ? body.planId.trim() : '';
    if (!/^[A-Za-z0-9_-]{1,150}$/.test(planId)) {
      return sendError(res, 400, 'INVALID_PLAN', 'Oferta inválida. Atualize a página e tente novamente.');
    }

    const db = getServerAdminFirestore();
    const profileRef = db.collection('user_profiles').doc(identity.uid);
    const requestRef = db.collection('verification_requests').doc(identity.uid);
    const planRef = db.collection('plans').doc(planId);
    const companyBaseUrl = getLeadspayBaseUrl();
    const affiliationId = `aff_${identity.uid}_${planId}`;
      const affiliationRef = db.collection('affiliations').doc(affiliationId);
    const result = await db.runTransaction(async (transaction) => {
      const [profileSnapshot, requestSnapshot, planSnapshot] = await Promise.all([
        transaction.get(profileRef),
        transaction.get(requestRef),
        transaction.get(planRef),
      ]);
      if (!profileSnapshot.exists) return { kind: 'error' as const, status: 404, code: 'PROFILE_NOT_FOUND', error: 'Perfil LeadsPay não encontrado. Atualize a página e tente novamente.' };
      const rawProfile = profileSnapshot.data()!;
      const profile = applyVerificationRequest(rawProfile, requestSnapshot.exists ? requestSnapshot.data()! : null) as Record<string, unknown>;
      if (rawProfile.banned === true || rawProfile.archived === true || rawProfile.isArchived === true || rawProfile.status === 'banned' || rawProfile.status === 'archived') {
        return { kind: 'error' as const, status: 403, code: 'ACCOUNT_BLOCKED', error: 'Esta conta está bloqueada ou arquivada.' };
      }
      if (!profileHasRole(profile, 'afiliado')) {
        return { kind: 'error' as const, status: 403, code: 'AFFILIATE_PROFILE_REQUIRED', error: 'Esta conta ainda não possui um perfil de afiliado.' };
      }
      if (!profileRoleIsApproved(profile, 'afiliado')) {
        return { kind: 'error' as const, status: 403, code: 'AFFILIATE_APPROVAL_REQUIRED', error: 'O perfil de afiliado precisa estar aprovado antes de solicitar afiliações.' };
      }
      if (!planSnapshot.exists) return { kind: 'error' as const, status: 404, code: 'PLAN_NOT_FOUND', error: 'Oferta não encontrada no catálogo.' };
      const plan = planSnapshot.data()!;
      if (plan.status !== 'Ativo' || plan.active === false) {
        return { kind: 'error' as const, status: 409, code: 'PLAN_UNAVAILABLE', error: 'Esta oferta não está disponível para novas afiliações.' };
      }
      if (plan.allowAffiliates === false || Number(plan.commissionPercentage || 0) <= 0) {
        return { kind: 'error' as const, status: 409, code: 'AFFILIATES_DISABLED', error: 'Esta oferta não está aceitando novas afiliações.' };
      }
      const manualApproval = String(plan.affiliateApprovalMode || 'automatic').toLowerCase() === 'manual';

      const companyId = String(plan.companyId || '').trim();
      const ownerId = String(plan.ownerId || '').trim();
      if (!companyId || !ownerId) return { kind: 'error' as const, status: 409, code: 'COMPANY_NOT_READY', error: 'A empresa responsável por esta oferta não está configurada corretamente.' };

      const companyRef = db.collection('companies').doc(companyId);
      const [companySnapshot, affiliationSnapshot] = await Promise.all([
        transaction.get(companyRef),
        transaction.get(affiliationRef),
      ]);
      if (!companySnapshot.exists) return { kind: 'error' as const, status: 409, code: 'COMPANY_NOT_FOUND', error: 'A empresa responsável por esta oferta não foi encontrada.' };
      const company = companySnapshot.data()!;
      if (company.ownerId !== ownerId || company.verified !== true || company.status !== 'approved' || company.archived === true || company.isArchived === true) {
        return { kind: 'error' as const, status: 409, code: 'COMPANY_NOT_APPROVED', error: 'A empresa responsável ainda não foi aprovada para vender.' };
      }
      if (affiliationSnapshot.exists) {
        const existing = affiliationSnapshot.data()!;
        const state = String(existing.status || '').toLowerCase();
        if (state === 'ativo' || state === 'active' || state === 'approved') {
          const existingCode = String(existing.affiliateCode || existing.affiliate_code || '');
          if (!existingCode) return { kind: 'error' as const, status: 409, code: 'AFFILIATE_CODE_MISSING', error: 'A afiliação existente não possui um código válido. Solicite a correção ao suporte.' };
          return {
            kind: 'ok' as const,
            alreadyAffiliated: true,
            pendingApproval: false,
            affiliation: {
              id: affiliationSnapshot.id,
              ...existing,
              affiliateCode: existingCode,
              affiliate_code: existingCode,
              affiliateLink: String(existing.affiliateLink || `${companyBaseUrl}/plan/${encodeURIComponent(planId)}?ref=${encodeURIComponent(existingCode)}`),
            },
          };
        }
        if (state === 'pendente' || state === 'pending' || state === 'requested' || state === 'solicitado') {
          return {
            kind: 'ok' as const,
            alreadyAffiliated: false,
            pendingApproval: true,
            affiliation: { id: affiliationSnapshot.id, ...existing },
          };
        }
        if (state !== 'encerrada' && state !== 'ended' && state !== 'cancelled' && state !== 'recusada' && state !== 'rejected') {
          return { kind: 'error' as const, status: 409, code: 'AFFILIATION_NOT_REACTIVATABLE', error: 'Esta afiliação foi revogada ou arquivada. Peça a revisão à empresa ou ao suporte antes de tentar novamente.' };
        }
      }

      const affiliateCode = affiliationSnapshot.exists
        ? String(affiliationSnapshot.data()!.affiliateCode || affiliationSnapshot.data()!.affiliate_code || '')
        : `AFF-${identity.uid.replace(/[^a-zA-Z0-9]/g, '').slice(0, 5).toUpperCase() || 'USER'}-${randomBytes(6).toString('hex').toUpperCase()}`;
      if (!affiliateCode) return { kind: 'error' as const, status: 409, code: 'AFFILIATE_CODE_MISSING', error: 'Não foi possível recuperar o código de afiliado. Contate o suporte.' };

      const now = new Date().toISOString();
      const affiliation = {
        id: affiliationId,
        affiliateId: identity.uid,
        userId: identity.uid,
        user_id: identity.uid,
        userName: String(rawProfile.name || identity.email || 'Afiliado LeadsPay').slice(0, 160),
        userEmail: String(identity.email || rawProfile.email || '').toLowerCase().slice(0, 200),
        companyId,
        companyOwnerId: ownerId,
        companyName: String(company.name || plan.companyName || '').slice(0, 160),
        companyLogo: String(company.logo || company.logoUrl || plan.companyLogo || '').slice(0, 2000),
        planId,
        plan_id: planId,
        planName: String(plan.name || 'Oferta').slice(0, 160),
        priceSetup: Number(plan.priceSetup || plan.price || 0),
        commissionPercentage: Number(plan.commissionPercentage || 0),
        commissionValue: Number(plan.commissionValue || 0),
        affiliateCode,
        affiliate_code: affiliateCode,
        affiliateLink: `${companyBaseUrl}/plan/${encodeURIComponent(planId)}?ref=${encodeURIComponent(affiliateCode)}`,
        clicks: Number(affiliationSnapshot.exists ? affiliationSnapshot.data()!.clicks || 0 : 0),
        salesCount: Number(affiliationSnapshot.exists ? affiliationSnapshot.data()!.salesCount || 0 : 0),
        totalEarned: Number(affiliationSnapshot.exists ? affiliationSnapshot.data()!.totalEarned || 0 : 0),
        status: manualApproval ? 'Pendente' : 'Ativo',
        countedActive: !manualApproval,
        requestedAt: now,
        createdAt: affiliationSnapshot.exists ? affiliationSnapshot.data()!.createdAt || now : now,
        updatedAt: now,
        archivedAt: null,
        revokedAt: null,
      };

      transaction.set(affiliationRef, affiliation);
      if (!manualApproval && (!affiliationSnapshot.exists || affiliationSnapshot.data()!.countedActive !== true)) {
        transaction.update(planRef, { affiliatesCount: FieldValue.increment(1) });
        transaction.update(companyRef, { totalAffiliatesCount: FieldValue.increment(1) });
      }
      return {
        kind: 'ok' as const,
        alreadyAffiliated: false,
        pendingApproval: manualApproval,
        affiliation,
      };
    });

    if (result.kind === 'error') return sendError(res, result.status, result.code, result.error);
    const affiliation = result.affiliation as Record<string, unknown>;
    return res.status(200).json({
      success: true,
      alreadyAffiliated: result.alreadyAffiliated,
      pendingApproval: result.pendingApproval === true,
      affiliation: result.affiliation,
      affiliateCode: result.pendingApproval === true ? null : (affiliation.affiliateCode || affiliation.affiliate_code),
      affiliateLink: result.pendingApproval === true ? null : affiliation.affiliateLink,
      message: result.pendingApproval === true
        ? 'Solicitação enviada. A empresa precisa aprovar sua afiliação antes da divulgação.'
        : result.alreadyAffiliated
          ? 'Você já está afiliado a esta oferta.'
          : 'Afiliação confirmada com sucesso.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (/FIREBASE_SERVICE_ACCOUNT_JSON|Credencial privada Firebase Admin|Credencial Firebase Admin/i.test(message)) {
      return sendError(res, 503, 'FIREBASE_ADMIN_NOT_CONFIGURED', 'A validação segura do perfil está indisponível neste ambiente. Configure as credenciais do Firebase Admin na Vercel Preview.');
    }
    if (/Firebase ID token|token inválido|auth\/id-token/i.test(message)) {
      return sendError(res, 401, 'INVALID_TOKEN', 'Sua sessão expirou. Entre novamente e tente outra vez.');
    }
    console.error('[affiliate-join] failed', error);
    return sendError(res, 500, 'AFFILIATION_FAILED', 'Não foi possível confirmar a afiliação. Nenhum dado foi alterado; tente novamente.');
  }
}
