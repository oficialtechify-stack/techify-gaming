import { verifyFirebaseIdentity, getServerAdminFirestore } from '../../lib/firebaseAdminServer.js';
import { getLeadspayBaseUrl, getStripeTestClient } from '../../lib/stripeServer.js';
import { applyVerificationRequest, profileHasRole, profileRoleIsApproved } from '../../lib/profileEligibility.js';

type RequestLike = { method?: string; body?: unknown; headers: Record<string, string | string[] | undefined> };
type ResponseLike = { setHeader(name: string, value: string): void; status(code: number): ResponseLike; json(body: unknown): unknown; end(): unknown };
type Role = 'empresa' | 'afiliado';

function setHeaders(req: RequestLike, res: ResponseLike): void {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Vary', 'Origin');
  const configuredBase = process.env.LEADSPAY_BASE_URL?.trim();
  const vercelBase = process.env.VERCEL_URL?.trim();
  let allowedOrigin = '';
  try {
    const rawBase = configuredBase || (vercelBase ? `https://${vercelBase}` : '');
    if (rawBase) allowedOrigin = new URL(rawBase).origin;
  } catch {
    // A malformed optional base URL must not crash the function before its
    // normal JSON error handling. Same-origin requests do not require CORS.
  }
  if (typeof req.headers.origin === 'string' && req.headers.origin === allowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  }
}

function fail(res: ResponseLike, status: number, error: string) {
  return res.status(status).json({ error });
}

export default async function handler(req: RequestLike, res: ResponseLike) {
  setHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return fail(res, 405, 'Método não permitido.');
  if (typeof req.headers.authorization !== 'string' || !/^Bearer\s+\S+/i.test(req.headers.authorization)) {
    return fail(res, 401, 'Faça login novamente para configurar recebimentos.');
  }

  try {
    const identity = await verifyFirebaseIdentity(typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined);
    const body = (req.body && typeof req.body === 'object') ? req.body as Record<string, unknown> : {};
    const role = body.role as Role;
    if (role !== 'empresa' && role !== 'afiliado') return fail(res, 400, 'Selecione a conta de Empresa ou Afiliado.');

    const db = getServerAdminFirestore();
    const profileRef = db.collection('user_profiles').doc(identity.uid);
    const profileSnap = await profileRef.get();
    if (!profileSnap.exists) return fail(res, 404, 'Perfil LeadsPay não encontrado.');
    const requestSnap = await db.collection('verification_requests').doc(identity.uid).get();
    const profile = applyVerificationRequest(profileSnap.data()!, requestSnap.exists ? requestSnap.data()! : null) as Record<string, any>;
    if (profile.banned || profile.status === 'banned') return fail(res, 403, 'Esta conta não pode conectar recebimentos.');
    if (!profileHasRole(profile, role)) {
      const roleName = role === 'afiliado' ? 'Afiliado' : 'Empresa';
      return fail(res, 403, `O perfil autenticado não possui um cadastro de ${roleName}.`);
    }
    if (!profileRoleIsApproved(profile, role)) {
      const roleName = role === 'afiliado' ? 'Afiliado' : 'Empresa';
      return fail(res, 403, `A aprovação do perfil de ${roleName} é necessária antes de configurar recebimentos.`);
    }

    let companyRef: any;
    let company: Record<string, unknown> | undefined;
    if (role === 'empresa') {
      const companyId = String(profile.companyId || `comp-${identity.uid}`);
      companyRef = db.collection('companies').doc(companyId);
      const companySnap = await companyRef.get();
      if (!companySnap.exists) return fail(res, 404, 'Cadastro de Empresa não encontrado.');
      company = companySnap.data() as Record<string, unknown>;
      if (company.ownerId !== identity.uid) return fail(res, 403, 'A empresa não pertence à conta autenticada.');
      if (company.verified !== true || company.status !== 'approved') {
        return fail(res, 403, 'A aprovação da Empresa é necessária antes de configurar recebimentos.');
      }
    }

    const stripe = getStripeTestClient();
    const roleAccounts = (profile.stripeAccounts && typeof profile.stripeAccounts === 'object') ? profile.stripeAccounts as Record<string, string> : {};
    const priorId = String(roleAccounts[role] || (role === 'empresa' ? company?.stripeAccountId || '' : ''));
    let accountId = priorId;

    if (accountId) {
      const account = await stripe.accounts.retrieve(accountId);
      if (account.metadata?.firebase_uid !== identity.uid || account.metadata?.leadspay_role !== role) {
        return fail(res, 409, 'A conta Stripe vinculada não corresponde a este perfil.');
      }
    } else {
      const docType = String(profile.companyDocType || profile.documentType || profile.docType || '').toUpperCase();
      const businessType = role === 'empresa' && ['CNPJ', 'MEI'].includes(docType) ? 'company' : 'individual';
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'BR',
        email: identity.email || undefined,
        business_type: businessType,
        capabilities: { transfers: { requested: true } },
        metadata: { firebase_uid: identity.uid, leadspay_role: role },
      }, { idempotencyKey: `leadspay-connect-${role}-${identity.uid}` });
      accountId = account.id;
      const updatedAccounts = { ...roleAccounts, [role]: accountId };
      await profileRef.set({
        stripeAccounts: updatedAccounts,
        stripeConnect: { ...(profile.stripeConnect || {}), [role]: { accountId, createdAt: new Date().toISOString(), onboardingStatus: 'pending' } },
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      if (companyRef && role === 'empresa') {
        await companyRef.set({ stripeAccountId: accountId, stripeOnboardingStatus: 'pending', updatedAt: new Date().toISOString() }, { merge: true });
      }
    }

    const baseUrl = getLeadspayBaseUrl();
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${baseUrl}/?stripe_connect=refresh&role=${role}`,
      return_url: `${baseUrl}/?stripe_connect=return&role=${role}`,
      type: 'account_onboarding',
    });
    return res.status(200).json({ url: accountLink.url, role, accountId });
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('[Stripe Connect onboarding]', detail);
    const unauthorized = /token ausente|token inválido|token expir|invalid.*token|permission denied/i.test(detail);
    const configMissing = /não configurad|precisa conter JSON válido|credencial.*incompleta|de outro projeto|STRIPE indisponível|LEADSPAY_BASE_URL/i.test(detail);
    return res.status(unauthorized ? 401 : 503).json({
      error: configMissing
        ? 'A conexão de recebimentos ainda não está configurada neste ambiente. Revise as variáveis privadas do servidor e tente novamente.'
        : 'Não foi possível iniciar a conexão de recebimentos. Tente novamente; se o erro continuar, contate o suporte da plataforma.',
      code: unauthorized ? 'AUTHENTICATION_REQUIRED' : configMissing ? 'PAYMENTS_CONFIGURATION_REQUIRED' : 'PAYMENTS_ONBOARDING_UNAVAILABLE',
    });
  }
}
