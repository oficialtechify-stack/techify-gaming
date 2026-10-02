import { getServerAdminFirestore } from '../../lib/firebaseAdminServer.js';
import { getLeadspayBaseUrl, getStripeTestClient } from '../../lib/stripeServer.js';
import { calculateSplit, toCents } from '../../lib/stripeSplit.js';
import { applyVerificationRequest, profileHasRole, profileRoleIsApproved } from '../../lib/profileEligibility.js';
import { releaseDelayDays } from '../../lib/platformBilling.js';

type RequestLike = {
  method?: string;
  body?: unknown;
  headers: Record<string, string | string[] | undefined>;
};
type ResponseLike = {
  setHeader(name: string, value: string): void;
  status(code: number): ResponseLike;
  json(body: unknown): unknown;
  end(): unknown;
};

function fail(res: ResponseLike, status: number, error: string, code?: string) {
  return res.status(status).json({ error, ...(code ? { code } : {}) });
}

function activePlan(plan: Record<string, any>): boolean {
  const status = String(plan.status || '').trim().toLowerCase();
  return plan.active !== false && (status === 'ativo' || status === 'active');
}

function activeAffiliation(affiliation: Record<string, any>): boolean {
  const status = String(affiliation.status || '').trim().toLowerCase();
  return status === 'ativo' || status === 'active';
}

function cycleToStripe(cycle: string): 'week' | 'month' | 'year' {
  if (cycle === 'WEEKLY') return 'week';
  if (cycle === 'YEARLY') return 'year';
  return 'month';
}

async function requireReadyConnectAccount(
  stripe: ReturnType<typeof getStripeTestClient>,
  accountId: string,
  uid: string,
  role: 'empresa' | 'afiliado',
  companyId?: string,
): Promise<void> {
  if (!accountId) throw new Error('CONNECT_NOT_CONFIGURED');
  const account = await stripe.accounts.retrieve(accountId);
  if (
    account.metadata?.firebase_uid !== uid ||
    account.metadata?.leadspay_role !== role ||
    (role === 'empresa' && companyId && account.metadata?.leadspay_company_id !== companyId)
  ) {
    throw new Error('CONNECT_OWNERSHIP_MISMATCH');
  }
  if (
    account.details_submitted !== true ||
    account.payouts_enabled !== true ||
    account.capabilities?.transfers !== 'active'
  ) {
    throw new Error('CONNECT_NOT_READY');
  }
}

export default async function handler(req: RequestLike, res: ResponseLike) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return fail(res, 405, 'Método não permitido.');

  try {
    const body = req.body && typeof req.body === 'object'
      ? req.body as Record<string, unknown>
      : {};

    const planId = String(body.planId || '').trim();
    const attemptId = String(body.attemptId || '').trim();
    const buyerName = String(body.buyerName || '').trim().slice(0, 120);
    const buyerEmail = String(body.buyerEmail || '').trim().toLowerCase().slice(0, 200);
    const affiliateCode = String(body.affiliateCode || '').trim().slice(0, 64);
    const couponCode = String(body.couponCode || '').trim();
    const utmSource = String(body.utmSource || '').trim().slice(0, 100);
    const utmMedium = String(body.utmMedium || '').trim().slice(0, 100);
    const utmCampaign = String(body.utmCampaign || '').trim().slice(0, 140);

    if (!/^[A-Za-z0-9_-]{1,150}$/.test(planId)) {
      return fail(res, 400, 'Oferta inválida.', 'INVALID_PLAN');
    }
    if (!/^[A-Za-z0-9_-]{10,90}$/.test(attemptId)) {
      return fail(res, 400, 'Atualize a página e tente novamente.', 'INVALID_ATTEMPT');
    }
    if (!buyerName || !buyerEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyerEmail)) {
      return fail(res, 400, 'Informe nome e e-mail válidos.', 'INVALID_BUYER');
    }
    if (couponCode) {
      return fail(
        res,
        400,
        'Cupons ainda não são aplicados a assinaturas recorrentes. Remova o cupom para continuar.',
        'RECURRING_COUPON_UNSUPPORTED',
      );
    }

    const db = getServerAdminFirestore();
    const planSnap = await db.collection('plans').doc(planId).get();
    if (!planSnap.exists) return fail(res, 404, 'Esta oferta não existe.', 'PLAN_NOT_FOUND');

    const plan = planSnap.data()!;
    if (!activePlan(plan)) return fail(res, 409, 'Esta oferta está pausada.', 'PLAN_UNAVAILABLE');
    if (String(plan.billingType || '').toLowerCase() !== 'recorrente') {
      return fail(res, 409, 'Esta oferta não é uma assinatura recorrente.', 'PLAN_NOT_RECURRING');
    }

    const cycle = String(plan.billingCycle || 'MONTHLY').toUpperCase();
    if (!['WEEKLY', 'MONTHLY', 'YEARLY'].includes(cycle)) {
      return fail(res, 409, 'A recorrência configurada é inválida.', 'INVALID_BILLING_CYCLE');
    }

    const companyId = String(plan.companyId || '').trim();
    const companySnap = await db.collection('companies').doc(companyId).get();
    if (!companySnap.exists) return fail(res, 409, 'Empresa responsável não encontrada.', 'COMPANY_NOT_FOUND');
    const company = companySnap.data()!;

    const companyOwnerId = String(plan.ownerId || company.ownerId || company.submittedBy || '').trim();
    if (!companyOwnerId || String(company.ownerId || company.submittedBy || '') !== companyOwnerId) {
      return fail(res, 409, 'A oferta não corresponde ao proprietário da empresa.', 'COMPANY_OWNERSHIP_MISMATCH');
    }

    const companyStatus = String(company.status || '').toLowerCase();
    if (
      company.verified !== true ||
      companyStatus !== 'approved' ||
      company.archived === true ||
      company.isArchived === true ||
      company.banned === true
    ) {
      return fail(res, 409, 'A empresa responsável não está habilitada para vender.', 'COMPANY_NOT_APPROVED');
    }

    const [companyProfileSnap, companyRequestSnap] = await Promise.all([
      db.collection('user_profiles').doc(companyOwnerId).get(),
      db.collection('verification_requests').doc(companyOwnerId).get(),
    ]);
    if (!companyProfileSnap.exists) {
      return fail(res, 409, 'O perfil da empresa não está disponível.', 'COMPANY_PROFILE_NOT_READY');
    }

    const companyProfile = applyVerificationRequest(
      companyProfileSnap.data()!,
      companyRequestSnap.exists ? companyRequestSnap.data()! : null,
    ) as Record<string, any>;

    if (!profileHasRole(companyProfile, 'empresa') || !profileRoleIsApproved(companyProfile, 'empresa')) {
      return fail(res, 409, 'A empresa precisa estar aprovada para receber pagamentos.', 'COMPANY_PROFILE_NOT_APPROVED');
    }

    const stripe = getStripeTestClient();
    const companyAccountId = String(companyProfile.stripeAccounts?.empresa || company.stripeAccountId || '');
    try {
      await requireReadyConnectAccount(stripe, companyAccountId, companyOwnerId, 'empresa', companyId);
    } catch {
      return fail(
        res,
        409,
        'A empresa precisa concluir a configuração de recebimentos na Stripe antes de vender.',
        'COMPANY_CONNECT_NOT_READY',
      );
    }

    let affiliateId = '';
    let affiliateAccountId = '';
    let validAffiliateCode = '';
    let affiliateProfile: Record<string, any> | null = null;
    const initialAffiliatePercent = Number(plan.commissionPercentage || 0);
    const recurringCommissionEnabled = plan.recurringCommissionEnabled !== false;
    const recurringAffiliatePercent = recurringCommissionEnabled
      ? Number(plan.recurrentCommissionPercent || initialAffiliatePercent || 0)
      : 0;

    if (affiliateCode && plan.allowAffiliates !== false) {
      let affiliationSnap = await db.collection('affiliations')
        .where('affiliateCode', '==', affiliateCode)
        .limit(1)
        .get();

      if (affiliationSnap.empty) {
        affiliationSnap = await db.collection('affiliations')
          .where('affiliate_code', '==', affiliateCode)
          .limit(1)
          .get();
      }

      if (!affiliationSnap.empty) {
        const affiliation = affiliationSnap.docs[0].data();
        const linkedPlanId = String(affiliation.planId || affiliation.plan_id || '');
        const linkedCompanyId = String(affiliation.companyId || '');

        if (activeAffiliation(affiliation) && linkedPlanId === planId && linkedCompanyId === companyId) {
          affiliateId = String(affiliation.affiliateId || affiliation.userId || affiliation.user_id || '');

          if (affiliateId) {
            const [affiliateProfileSnap, affiliateRequestSnap] = await Promise.all([
              db.collection('user_profiles').doc(affiliateId).get(),
              db.collection('verification_requests').doc(affiliateId).get(),
            ]);

            if (!affiliateProfileSnap.exists) {
              return fail(res, 409, 'O afiliado vinculado não possui perfil válido.', 'AFFILIATE_NOT_READY');
            }

            affiliateProfile = applyVerificationRequest(
              affiliateProfileSnap.data()!,
              affiliateRequestSnap.exists ? affiliateRequestSnap.data()! : null,
            ) as Record<string, any>;

            if (!profileHasRole(affiliateProfile, 'afiliado') || !profileRoleIsApproved(affiliateProfile, 'afiliado')) {
              return fail(res, 409, 'O afiliado ainda não está aprovado para receber comissão.', 'AFFILIATE_NOT_READY');
            }

            affiliateAccountId = String(affiliateProfile.stripeAccounts?.afiliado || '');
            try {
              await requireReadyConnectAccount(stripe, affiliateAccountId, affiliateId, 'afiliado');
            } catch {
              return fail(
                res,
                409,
                'O afiliado precisa concluir a configuração de recebimentos na Stripe.',
                'AFFILIATE_CONNECT_NOT_READY',
              );
            }

            validAffiliateCode = affiliateCode;
          }
        }
      }
    }

    const productAmount = Number(plan.priceMonthly || plan.priceSetup || plan.price || 0);
    if (!Number.isFinite(productAmount) || productAmount < 0.5) {
      return fail(res, 409, 'A assinatura não possui preço válido.', 'INVALID_SERVER_PRICE');
    }

    const productAmountCents = toCents(productAmount);
    const checkoutFeeCents = 99;
    const grossAmountCents = productAmountCents + checkoutFeeCents;

    const initialSplit = calculateSplit({
      grossAmountCents,
      affiliatePercent: validAffiliateCode ? initialAffiliatePercent : 0,
      platformFeeCents: checkoutFeeCents,
      commissionableAmountCents: productAmountCents,
    });

    const renewalSplit = calculateSplit({
      grossAmountCents,
      affiliatePercent: validAffiliateCode ? recurringAffiliatePercent : 0,
      platformFeeCents: checkoutFeeCents,
      commissionableAmountCents: productAmountCents,
    });

    if (initialSplit.companyAmountCents <= 0 || renewalSplit.companyAmountCents <= 0) {
      return fail(
        res,
        422,
        'O valor da assinatura não cobre a taxa da plataforma e a comissão configurada.',
        'INVALID_SPLIT',
      );
    }

    const existing = await db.collection('stripe_product_subscription_checkouts').doc(attemptId).get();
    if (existing.exists) {
      const saved = existing.data()!;
      if (
        String(saved.planId || '') !== planId ||
        String(saved.buyerEmail || '').toLowerCase() !== buyerEmail
      ) {
        return fail(
          res,
          409,
          'Esta tentativa não corresponde à assinatura atual. Atualize a página.',
          'CHECKOUT_SNAPSHOT_MISMATCH',
        );
      }

      if (saved.stripeCheckoutSessionId) {
        try {
          const session = await stripe.checkout.sessions.retrieve(String(saved.stripeCheckoutSessionId));
          if (session.url && session.status === 'open') {
            return res.status(200).json({
              checkoutUrl: session.url,
              sessionId: session.id,
              attemptId,
            });
          }
        } catch {}
      }
    }

    const companyDelayDays = releaseDelayDays(companyProfile);
    const affiliateDelayDays = affiliateProfile ? releaseDelayDays(affiliateProfile) : 15;
    const baseUrl = getLeadspayBaseUrl();
    const checkoutSlug = String(plan.checkoutSlug || plan.slug || planId);
    const planName = String(plan.name || 'Assinatura LeadsPay').slice(0, 160);
    const companyName = String(company.name || plan.companyName || 'Empresa LeadsPay').slice(0, 160);
    const stripeInterval = cycleToStripe(cycle);

    const metadata: Record<string, string> = {
      leadspay_product_subscription: '1',
      plan_id: planId,
      company_id: companyId,
      company_owner_id: companyOwnerId,
      company_account_id: companyAccountId,
      affiliate_id: affiliateId || '',
      affiliate_code: validAffiliateCode || '',
      affiliate_account_id: affiliateAccountId || '',
      affiliate_percent_initial: String(validAffiliateCode ? initialAffiliatePercent : 0),
      affiliate_percent_recurring: String(validAffiliateCode ? recurringAffiliatePercent : 0),
      recurring_commission_enabled: recurringCommissionEnabled ? '1' : '0',
      product_amount_cents: String(productAmountCents),
      checkout_fee_cents: String(checkoutFeeCents),
      company_release_delay_days: String(companyDelayDays),
      affiliate_release_delay_days: String(affiliateDelayDays),
      buyer_name: buyerName,
      buyer_email: buyerEmail,
      billing_cycle: cycle,
      utm_source: utmSource,
      utm_medium: utmMedium,
      utm_campaign: utmCampaign,
    };

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: buyerEmail,
      client_reference_id: attemptId,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'brl',
            unit_amount: productAmountCents,
            recurring: { interval: stripeInterval },
            product_data: {
              name: planName,
              description: String(plan.description || '').slice(0, 500) || undefined,
            },
          },
        },
        {
          quantity: 1,
          price_data: {
            currency: 'brl',
            unit_amount: checkoutFeeCents,
            recurring: { interval: stripeInterval },
            product_data: { name: 'Taxa de checkout LeadsPay' },
          },
        },
      ],
      success_url: `${baseUrl}/?thank-you=true&plan=${encodeURIComponent(planId)}&subscription_session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/checkout/${encodeURIComponent(checkoutSlug)}?subscription=cancelled`,
      metadata,
      subscription_data: { metadata },
    }, {
      idempotencyKey: `leadspay-product-subscription-${attemptId}`,
    });

    if (!session.url) {
      return fail(res, 503, 'A Stripe não retornou o checkout da assinatura.', 'STRIPE_SESSION_UNAVAILABLE');
    }

    const now = new Date().toISOString();
    await db.collection('stripe_product_subscription_checkouts').doc(attemptId).set({
      attemptId,
      stripeCheckoutSessionId: session.id,
      planId,
      planName,
      companyId,
      companyName,
      companyOwnerId,
      companyAccountId,
      affiliateId: affiliateId || null,
      affiliateCode: validAffiliateCode || null,
      affiliateAccountId: affiliateAccountId || null,
      affiliatePercentInitial: validAffiliateCode ? initialAffiliatePercent : 0,
      affiliatePercentRecurring: validAffiliateCode ? recurringAffiliatePercent : 0,
      recurringCommissionEnabled,
      buyerName,
      buyerEmail,
      productAmountCents,
      checkoutFeeCents,
      grossAmountCents,
      billingCycle: cycle,
      companyReleaseDelayDays: companyDelayDays,
      affiliateReleaseDelayDays: affiliateDelayDays,
      utmSource: utmSource || null,
      utmMedium: utmMedium || null,
      utmCampaign: utmCampaign || null,
      status: 'checkout_open',
      createdAt: now,
      updatedAt: now,
    }, { merge: true });

    return res.status(200).json({
      checkoutUrl: session.url,
      sessionId: session.id,
      attemptId,
      billingCycle: cycle,
      pricing: {
        productAmountCents,
        checkoutFeeCents,
        totalCents: grossAmountCents,
      },
    });
  } catch (error) {
    console.error('[Product subscription checkout]', error instanceof Error ? error.message : 'Erro desconhecido');
    return fail(
      res,
      500,
      'Não foi possível iniciar a assinatura Stripe. Tente novamente.',
      'SUBSCRIPTION_CHECKOUT_UNAVAILABLE',
    );
  }
}
