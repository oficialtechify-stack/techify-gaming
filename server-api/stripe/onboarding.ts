import { verifyFirebaseIdentity, getServerAdminFirestore } from '../../lib/firebaseAdminServer.js';
import { getLeadspayBaseUrl, getStripeTestClient } from '../../lib/stripeServer.js';
import { applyVerificationRequest, profileHasRole } from '../../lib/profileEligibility.js';

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
    let profile = applyVerificationRequest(profileSnap.data()!, requestSnap.exists ? requestSnap.data()! : null) as Record<string, any>;
    if (profile.banned || profile.status === 'banned') return fail(res, 403, 'Esta conta não pode conectar recebimentos.');

    let companyRef: FirebaseFirestore.DocumentReference | undefined;
    let company: Record<string, any> | undefined;
    let companyId = '';

    if (role === 'empresa') {
      // Stripe vem antes do perfil LeadsPay. companyId pode ainda não existir.
      companyId = String(profile.companyId || requestSnap.data()?.companyId || '').trim();
      if (companyId) {
        companyRef = db.collection('companies').doc(companyId);
        const companySnap = await companyRef.get();
        if (companySnap.exists) {
          company = companySnap.data() as Record<string, any>;
          if (String(company.ownerId || company.submittedBy || '') !== identity.uid) {
            return fail(res, 403, 'A empresa vinculada não pertence à conta autenticada.');
          }
        } else {
          companyRef = undefined;
          companyId = '';
        }
      }
    } else {
      // Assim como a Empresa, o Afiliado configura a Stripe antes de enviar
      // o perfil cadastral para análise. O papel pode existir apenas pelo
      // modo ativo/cadastro inicial, portanto não exigimos aprovação prévia.
      if (!profileHasRole(profile, role) && String(profile.activeRoleMode || '').toLowerCase() !== 'afiliado') {
        return fail(res, 403, 'O perfil autenticado não possui cadastro de Afiliado.');
      }
    }

    const stripe = getStripeTestClient();
    const roleAccounts = (profile.stripeAccounts && typeof profile.stripeAccounts === 'object') ? profile.stripeAccounts as Record<string, string> : {};
    const priorId = String(roleAccounts[role] || (role === 'empresa' ? company?.stripeAccountId || '' : ''));
    let accountId = priorId;

    if (accountId) {
      let account = await stripe.accounts.retrieve(accountId);
      if (
        account.metadata?.firebase_uid !== identity.uid ||
        account.metadata?.leadspay_role !== role ||
        (
          role === 'empresa' &&
          companyId &&
          account.metadata?.leadspay_company_id &&
          account.metadata.leadspay_company_id !== companyId
        )
      ) {
        return fail(res, 409, 'A conta Stripe vinculada não corresponde a esta conta LeadsPay.');
      }

      if (role === 'empresa' && companyId && !account.metadata?.leadspay_company_id) {
        account = await stripe.accounts.update(accountId, {
          metadata: {
            ...account.metadata,
            firebase_uid: identity.uid,
            leadspay_role: 'empresa',
            leadspay_company_id: companyId,
          },
        });
      }

      const alreadyVerified =
        account.details_submitted === true &&
        account.payouts_enabled === true &&
        account.capabilities?.transfers === 'active';

      // Depois de verificada, a configuração Stripe fica bloqueada para os dois papéis.
      if (alreadyVerified) {
        return res.status(200).json({
          role,
          accountId,
          locked: true,
          status: 'connected',
          message: 'Conta Stripe já verificada e bloqueada para alterações pela LeadsPay.',
        });
      }
    } else {
      const docType = String(profile.companyDocType || profile.documentType || profile.docType || '').toUpperCase();
      const knownCompanyType =
        role === 'empresa' && ['CNPJ', 'MEI'].includes(docType)
          ? 'company'
          : role === 'empresa' && docType === 'CPF'
            ? 'individual'
            : role === 'afiliado'
              ? 'individual'
              : undefined;

      const account = await stripe.accounts.create({
        country: 'BR',
        email: identity.email || undefined,
        ...(knownCompanyType ? { business_type: knownCompanyType } : {}),
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        controller: {
          // New Connect configuration equivalent to an Express-style experience,
          // without relying on the legacy type='express' account model.
          fees: { payer: 'application' },
          losses: { payments: 'application' },
          requirement_collection: 'stripe',
          stripe_dashboard: { type: 'express' },
        },
        metadata: {
          firebase_uid: identity.uid,
          leadspay_role: role,
          ...(role === 'empresa' && companyId ? { leadspay_company_id: companyId } : {}),
        },
      } as any, { idempotencyKey: `leadspay-connect-stripe-first-v1-${role}-${identity.uid}` });
      accountId = account.id;
      const updatedAccounts = { ...roleAccounts, [role]: accountId };
      await profileRef.set({
        stripeAccounts: updatedAccounts,
        stripeConnect: { ...(profile.stripeConnect || {}), [role]: { accountId, createdAt: new Date().toISOString(), onboardingStatus: 'pending' } },
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      if (companyRef && role === 'empresa') {
        await companyRef.set({
          stripeAccountId: accountId,
          stripeOnboardingStatus: 'pending',
          stripeConnectOwnerId: identity.uid,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      }
    }

    try {
      await stripe.accounts.update(accountId, {
        settings: { payouts: { schedule: { interval: 'manual' } } },
      } as any);
    } catch (scheduleError) {
      console.warn('[Stripe Connect onboarding] Não foi possível definir payout manual:', scheduleError instanceof Error ? scheduleError.message : 'falha');
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
    const connectProfileRequired =
      /complete your platform profile|platform profile|use Connect and create live connected accounts/i.test(detail);
    const configMissing =
      /não configurad|precisa conter JSON válido|credencial.*incompleta|de outro projeto|stripe.*indisponível|stripe.*bloqueado|leadspay_base_url/i.test(detail);

    const status = unauthorized ? 401 : connectProfileRequired ? 409 : 503;
    const code = unauthorized
      ? 'AUTHENTICATION_REQUIRED'
      : connectProfileRequired
        ? 'STRIPE_CONNECT_PLATFORM_PROFILE_REQUIRED'
        : configMissing
          ? 'STRIPE_PRODUCTION_CONFIGURATION_REQUIRED'
          : 'PAYMENTS_ONBOARDING_UNAVAILABLE';

    const message = unauthorized
      ? 'Sua sessão expirou. Entre novamente.'
      : connectProfileRequired
        ? 'A LeadsPay precisa concluir o perfil da plataforma Stripe Connect antes de criar contas conectadas em produção.'
        : configMissing
          ? 'A Stripe de produção da LeadsPay ainda não foi ativada corretamente pelo administrador. Nenhum dado bancário ou saldo foi alterado.'
          : 'Não foi possível iniciar a configuração bancária agora. Tente novamente em instantes.';

    return res.status(status).json({ error: message, code });
  }
}
