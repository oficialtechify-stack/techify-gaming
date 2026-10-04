import { verifyFirebaseIdentity, getServerAdminFirestore } from '../../lib/firebaseAdminServer.js';
import { getStripeTestClient } from '../../lib/stripeServer.js';
import { applyVerificationRequest, profileHasRole, profileRoleIsApproved } from '../../lib/profileEligibility.js';

type RequestLike = { method?: string; query?: Record<string, string | string[] | undefined>; headers: Record<string, string | string[] | undefined> };
type ResponseLike = { setHeader(name: string, value: string): void; status(code: number): ResponseLike; json(body: unknown): unknown };

export default async function handler(req: RequestLike, res: ResponseLike) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido.' });
  try {
    const authHeader = typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined;
    const identity = await verifyFirebaseIdentity(authHeader);
    const role = req.query?.role;
    if (role !== 'empresa' && role !== 'afiliado') return res.status(400).json({ error: 'Papel inválido.' });
    const db = getServerAdminFirestore();
    const profileSnap = await db.collection('user_profiles').doc(identity.uid).get();
    if (!profileSnap.exists) return res.status(404).json({ error: 'Perfil não encontrado.' });
    const requestSnap = await db.collection('verification_requests').doc(identity.uid).get();
    let profile = applyVerificationRequest(profileSnap.data()!, requestSnap.exists ? requestSnap.data()! : null) as Record<string, any>;

    let companyRef: FirebaseFirestore.DocumentReference | null = null;
    let companyId = '';
    if (role === 'empresa') {
      companyId = String(profile.companyId || requestSnap.data()?.companyId || '').trim();
      if (!companyId) return res.status(409).json({ error: 'A conta Empresa não possui companyId válido.' });

      companyRef = db.collection('companies').doc(companyId);
      const companySnap = await companyRef.get();
      if (!companySnap.exists) return res.status(404).json({ error: 'Empresa não encontrada.' });

      const company = companySnap.data()!;
      if (String(company.ownerId || company.submittedBy || '') !== identity.uid) {
        return res.status(403).json({ error: 'Esta empresa não pertence à conta autenticada.' });
      }

      const canonicalApproved =
        company.verified === true &&
        String(company.status || '').toLowerCase() === 'approved' &&
        company.archived !== true &&
        company.isArchived !== true &&
        company.banned !== true;

      if (canonicalApproved && !profileRoleIsApproved(profile, 'empresa')) {
        const now = new Date().toISOString();
        const repaired = {
          companyId,
          hasCompanyProfile: true,
          verified: true,
          verificationStatus: 'approved',
          empresaVerificationStatus: 'approved',
          companyVerificationStatus: 'approved',
          kyc_status: 'verified',
          updatedAt: now,
        };
        await db.collection('user_profiles').doc(identity.uid).set(repaired, { merge: true });
        await db.collection('users').doc(identity.uid).set(repaired, { merge: true });
        profile = { ...profile, ...repaired };
      }
    }

    if (!profileHasRole(profile, role)) return res.status(403).json({ error: `O perfil autenticado não possui um cadastro de ${role === 'afiliado' ? 'Afiliado' : 'Empresa'}.` });
    if (!profileRoleIsApproved(profile, role)) return res.status(403).json({ error: `A aprovação do perfil de ${role === 'afiliado' ? 'Afiliado' : 'Empresa'} é necessária para consultar recebimentos.` });

    const accountId = String(profile.stripeAccounts?.[role] || '');
    if (!accountId) {
      if (companyRef) {
        await companyRef.set({ stripeOnboardingStatus: 'not_connected', updatedAt: new Date().toISOString() }, { merge: true });
      }
      return res.status(200).json({ status: 'not_connected', companyId: companyId || null });
    }

    const stripe = getStripeTestClient();
    let account = await stripe.accounts.retrieve(accountId);
    if (
      account.metadata?.firebase_uid !== identity.uid ||
      account.metadata?.leadspay_role !== role ||
      (role === 'empresa' && account.metadata?.leadspay_company_id && account.metadata.leadspay_company_id !== companyId)
    ) {
      return res.status(409).json({ error: 'A conta Stripe precisa ser reconectada à empresa correta.' });
    }

    if (role === 'empresa' && !account.metadata?.leadspay_company_id) {
      account = await stripe.accounts.update(accountId, {
        metadata: {
          ...account.metadata,
          firebase_uid: identity.uid,
          leadspay_role: 'empresa',
          leadspay_company_id: companyId,
        },
      });
    }

    const ready =
      account.details_submitted === true &&
      account.payouts_enabled === true &&
      account.capabilities?.transfers === 'active';

    const currentDue = Array.isArray(account.requirements?.currently_due)
      ? account.requirements.currently_due
      : [];
    const pastDue = Array.isArray(account.requirements?.past_due)
      ? account.requirements.past_due
      : [];
    const pendingVerification = Array.isArray(account.requirements?.pending_verification)
      ? account.requirements.pending_verification
      : [];
    const requirementErrors = Array.isArray(account.requirements?.errors)
      ? account.requirements.errors.map((item: any) => ({
          code: String(item?.code || ''),
          reason: String(item?.reason || ''),
          requirement: String(item?.requirement || ''),
        }))
      : [];

    const needsAction = currentDue.length > 0 || pastDue.length > 0 || requirementErrors.length > 0;
    const awaitingVerification = !needsAction && pendingVerification.length > 0;

    const status = ready
      ? 'connected'
      : needsAction
        ? 'action_required'
        : awaitingVerification
          ? 'pending_verification'
          : 'onboarding_incomplete';
    const now = new Date().toISOString();

    await db.collection('user_profiles').doc(identity.uid).set({
      stripeConnect: {
        ...(profile.stripeConnect || {}),
        [role]: {
          ...(profile.stripeConnect?.[role] || {}),
          accountId,
          onboardingStatus: status,
          chargesEnabled: account.charges_enabled,
          payoutsEnabled: account.payouts_enabled,
          detailsSubmitted: account.details_submitted,
          updatedAt: now,
        },
      },
      updatedAt: now,
    }, { merge: true });

    if (companyRef) {
      await companyRef.set({
        stripeAccountId: accountId,
        stripeOnboardingStatus: status,
        stripeChargesEnabled: account.charges_enabled,
        stripePayoutsEnabled: account.payouts_enabled,
        stripeDetailsSubmitted: account.details_submitted,
        stripeConnectOwnerId: identity.uid,
        updatedAt: now,
      }, { merge: true });
    }

    return res.status(200).json({
      status,
      companyId: companyId || null,
      accountId,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
      capabilities: {
        cardPayments: account.capabilities?.card_payments || null,
        transfers: account.capabilities?.transfers || null,
      },
      requirements: {
        currentlyDue: currentDue,
        pastDue,
        pendingVerification,
        errors: requirementErrors,
        disabledReason: account.requirements?.disabled_reason || null,
      },
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Falha desconhecida';
    console.error('[Stripe Connect status]', detail);

    const configMissing =
      /stripe live indisponível|stripe live bloqueado|stripe.*não configurad|stripe.*indisponível|stripe.*bloqueado/i.test(detail);

    return res.status(503).json({
      error: configMissing
        ? 'A Stripe de produção da LeadsPay ainda não está configurada. O administrador precisa cadastrar a chave live na Vercel Production.'
        : 'Não foi possível verificar a conta Stripe agora.',
      code: configMissing ? 'STRIPE_PRODUCTION_CONFIGURATION_REQUIRED' : 'STRIPE_STATUS_UNAVAILABLE',
    });
  }
}
