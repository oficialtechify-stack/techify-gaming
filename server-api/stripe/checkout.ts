import { getServerAdminFirestore } from '../../lib/firebaseAdminServer.js';
import { getStripeTestClient } from '../../lib/stripeServer.js';
import { calculateSplit, toCents } from '../../lib/stripeSplit.js';
import { applyVerificationRequest, profileHasRole, profileRoleIsApproved } from '../../lib/profileEligibility.js';
import { releaseDelayDays } from '../../lib/platformBilling.js';

type RequestLike = { method?: string; body?: unknown; headers: Record<string, string | string[] | undefined> };
type ResponseLike = { setHeader(name: string, value: string): void; status(code: number): ResponseLike; json(body: unknown): unknown; end(): unknown };

function fail(res: ResponseLike, status: number, error: string, code?: string) {
  return res.status(status).json({ error, ...(code ? { code } : {}) });
}

function setHeaders(req: RequestLike, res: ResponseLike): void {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Vary', 'Origin');
  const rawBase = process.env.LEADSPAY_BASE_URL?.trim();
  try {
    const allowedOrigin = rawBase ? new URL(rawBase).origin : '';
    if (typeof req.headers.origin === 'string' && req.headers.origin === allowedOrigin) {
      res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
      res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    }
  } catch {}
}

function activePlan(plan: Record<string, any>): boolean {
  const status = String(plan.status || '').trim().toLowerCase();
  return plan.active !== false && (status === 'ativo' || status === 'active');
}

function activeAffiliation(affiliation: Record<string, any>): boolean {
  const status = String(affiliation.status || '').trim().toLowerCase();
  return status === 'ativo' || status === 'active';
}

function authoritativePrice(plan: Record<string, any>): number {
  for (const candidate of [plan.priceSetup, plan.price, plan.priceMonthly]) {
    const value = Number(candidate);
    if (Number.isFinite(value) && value > 0) return value;
  }
  return 0;
}

async function requireReadyConnectAccount(
  stripe: ReturnType<typeof getStripeTestClient>,
  accountId: string,
  uid: string,
  role: 'empresa' | 'afiliado',
): Promise<void> {
  if (!accountId) throw new Error('CONNECT_NOT_CONFIGURED');
  const account = await stripe.accounts.retrieve(accountId);
  if (account.metadata?.firebase_uid !== uid || account.metadata?.leadspay_role !== role) {
    throw new Error('CONNECT_OWNERSHIP_MISMATCH');
  }
  if (account.details_submitted !== true || account.payouts_enabled !== true || account.capabilities?.transfers !== 'active') {
    throw new Error('CONNECT_NOT_READY');
  }
}

export default async function handler(req: RequestLike, res: ResponseLike) {
  setHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return fail(res, 405, 'Método não permitido.');

  try {
    const body = req.body && typeof req.body === 'object' ? req.body as Record<string, unknown> : {};
    const planId = String(body.planId || '').trim();
    const attemptId = String(body.attemptId || '').trim();
    const buyerName = String(body.buyerName || '').trim().slice(0, 120);
    const buyerEmail = String(body.buyerEmail || '').trim().toLowerCase().slice(0, 200);
    const affiliateCode = String(body.affiliateCode || '').trim().slice(0, 64);
    const couponCode = String(body.couponCode || '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 40);

    if (!/^[A-Za-z0-9_-]{1,150}$/.test(planId)) return fail(res, 400, 'Oferta inválida.', 'INVALID_PLAN');
    if (!/^[A-Za-z0-9_-]{10,90}$/.test(attemptId)) return fail(res, 400, 'Atualize a página e tente novamente.', 'INVALID_ATTEMPT');
    if (!buyerName || !buyerEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyerEmail)) {
      return fail(res, 400, 'Informe nome e e-mail válidos.', 'INVALID_BUYER');
    }

    let db: FirebaseFirestore.Firestore;
    try {
      db = getServerAdminFirestore();
    } catch {
      return fail(res, 503, 'Não foi possível registrar o pedido. Tente novamente mais tarde.', 'ORDER_STORAGE_UNAVAILABLE');
    }

    const planSnap = await db.collection('plans').doc(planId).get();
    if (!planSnap.exists) return fail(res, 404, 'Esta oferta não existe ou foi removida.', 'PLAN_NOT_FOUND');
    const plan = planSnap.data()!;
    if (!activePlan(plan)) return fail(res, 409, 'Esta oferta está pausada ou indisponível.', 'PLAN_UNAVAILABLE');

    const companyId = String(plan.companyId || '').trim();
    if (!companyId) return fail(res, 409, 'A oferta não possui uma empresa responsável válida.', 'COMPANY_NOT_READY');
    const companySnap = await db.collection('companies').doc(companyId).get();
    if (!companySnap.exists) return fail(res, 409, 'A empresa responsável não foi encontrada.', 'COMPANY_NOT_FOUND');
    const company = companySnap.data()!;

    const companyOwnerId = String(plan.ownerId || company.ownerId || company.submittedBy || '').trim();
    if (!companyOwnerId || String(company.ownerId || company.submittedBy || '') !== companyOwnerId) {
      return fail(res, 409, 'A oferta não corresponde ao proprietário da empresa.', 'COMPANY_OWNERSHIP_MISMATCH');
    }
    const companyStatus = String(company.status || '').toLowerCase();
    if (company.verified !== true || companyStatus !== 'approved' || company.archived === true || company.isArchived === true || company.banned === true) {
      return fail(res, 409, 'A empresa responsável não está habilitada para vender.', 'COMPANY_NOT_APPROVED');
    }

    const [companyProfileSnap, companyRequestSnap] = await Promise.all([
      db.collection('user_profiles').doc(companyOwnerId).get(),
      db.collection('verification_requests').doc(companyOwnerId).get(),
    ]);
    if (!companyProfileSnap.exists) return fail(res, 409, 'O perfil da empresa não está disponível.', 'COMPANY_PROFILE_NOT_READY');
    const companyProfile = applyVerificationRequest(
      companyProfileSnap.data()!,
      companyRequestSnap.exists ? companyRequestSnap.data()! : null,
    ) as Record<string, any>;
    if (!profileHasRole(companyProfile, 'empresa') || !profileRoleIsApproved(companyProfile, 'empresa')) {
      return fail(res, 409, 'O perfil da empresa precisa estar aprovado para receber pagamentos.', 'COMPANY_PROFILE_NOT_APPROVED');
    }

    const stripe = getStripeTestClient();
    const companyAccountId = String(companyProfile.stripeAccounts?.empresa || company.stripeAccountId || '');
    try {
      await requireReadyConnectAccount(stripe, companyAccountId, companyOwnerId, 'empresa');
    } catch {
      return fail(res, 409, 'A empresa precisa concluir a configuração de recebimentos na Stripe antes de vender.', 'COMPANY_CONNECT_NOT_READY');
    }

    let affiliateId = '';
    let affiliateAccountId = '';
    let affiliatePercent = 0;
    let affiliateProfile: Record<string, any> | null = null;
    let validAffiliateCode = '';

    if (affiliateCode && plan.allowAffiliates !== false) {
      let affiliationSnap = await db.collection('affiliations').where('affiliateCode', '==', affiliateCode).limit(1).get();
      if (affiliationSnap.empty) {
        affiliationSnap = await db.collection('affiliations').where('affiliate_code', '==', affiliateCode).limit(1).get();
      }
      if (!affiliationSnap.empty) {
        const affiliation = affiliationSnap.docs[0].data();
        const linkedPlanId = String(affiliation.planId || affiliation.plan_id || '');
        const linkedCompanyId = String(affiliation.companyId || '');
        if (activeAffiliation(affiliation) && linkedPlanId === planId && linkedCompanyId === companyId) {
          affiliateId = String(affiliation.affiliateId || affiliation.userId || affiliation.user_id || '');
          affiliatePercent = Number(plan.commissionPercentage || 0);
          if (affiliateId && affiliatePercent > 0) {
            const [affiliateProfileSnap, affiliateRequestSnap] = await Promise.all([
              db.collection('user_profiles').doc(affiliateId).get(),
              db.collection('verification_requests').doc(affiliateId).get(),
            ]);
            if (!affiliateProfileSnap.exists) return fail(res, 409, 'O afiliado vinculado não possui perfil válido.', 'AFFILIATE_NOT_READY');
            affiliateProfile = applyVerificationRequest(
              affiliateProfileSnap.data()!,
              affiliateRequestSnap.exists ? affiliateRequestSnap.data()! : null,
            ) as Record<string, any>;
            if (!profileHasRole(affiliateProfile, 'afiliado') || !profileRoleIsApproved(affiliateProfile, 'afiliado')) {
              return fail(res, 409, 'O afiliado vinculado ainda não está aprovado para receber comissão.', 'AFFILIATE_NOT_READY');
            }
            affiliateAccountId = String(affiliateProfile.stripeAccounts?.afiliado || '');
            try {
              await requireReadyConnectAccount(stripe, affiliateAccountId, affiliateId, 'afiliado');
            } catch {
              return fail(res, 409, 'O afiliado precisa concluir a configuração de recebimentos na Stripe.', 'AFFILIATE_CONNECT_NOT_READY');
            }
            validAffiliateCode = affiliateCode;
          }
        }
      }
    }

    const baseAmount = authoritativePrice(plan);
    if (!Number.isFinite(baseAmount) || baseAmount <= 0) return fail(res, 409, 'A oferta não possui preço válido.', 'INVALID_SERVER_PRICE');

    const originalProductAmountCents = toCents(baseAmount);
    let productAmountCents = originalProductAmountCents;
    let discountCents = 0;
    let couponId = '';
    let validCouponCode = '';

    if (couponCode) {
      const candidateRef = db.collection('coupons').doc(`${companyId}_${couponCode}`);
      const couponSnap = await candidateRef.get();
      if (!couponSnap.exists) return fail(res, 400, 'Cupom inválido ou inexistente.', 'INVALID_COUPON');
      const coupon = couponSnap.data()!;
      const nowMs = Date.now();
      const expiresMs = coupon.expiresAt ? Date.parse(String(coupon.expiresAt)) : NaN;
      const maxUses = Number(coupon.maxUses || 0);
      const usedCount = Number(coupon.usedCount || 0);
      const plans = Array.isArray(coupon.applicablePlans) ? coupon.applicablePlans.map(String) : ['all'];
      const affiliates = Array.isArray(coupon.applicableAffiliates) ? coupon.applicableAffiliates.map(String) : ['all'];
      const affiliateAllowed = affiliates.includes('all') || (!!validAffiliateCode && (affiliates.includes(validAffiliateCode) || affiliates.includes(affiliateId)));
      if (
        String(coupon.companyId || '') !== companyId ||
        String(coupon.status || '').toLowerCase() !== 'active' ||
        (Number.isFinite(expiresMs) && expiresMs < nowMs) ||
        (maxUses > 0 && usedCount >= maxUses) ||
        (!plans.includes('all') && !plans.includes(planId)) ||
        !affiliateAllowed
      ) {
        return fail(res, 400, 'Este cupom não está disponível para esta compra.', 'COUPON_NOT_APPLICABLE');
      }
      const couponValue = Number(coupon.value || 0);
      if (coupon.discountType === 'fixed') discountCents = Math.round(couponValue * 100);
      else discountCents = Math.round(originalProductAmountCents * couponValue / 100);
      discountCents = Math.max(0, Math.min(discountCents, Math.max(0, originalProductAmountCents - 50)));
      productAmountCents = originalProductAmountCents - discountCents;
      couponId = couponSnap.id;
      validCouponCode = couponCode;
    }

    const grossAmountCents = productAmountCents + 99;
    const split = calculateSplit({
      grossAmountCents,
      affiliatePercent,
      platformFeeCents: 99,
      commissionableAmountCents: productAmountCents,
    });
    if (split.companyAmountCents <= 0) {
      return fail(res, 422, 'O preço não cobre a taxa da plataforma e a comissão configurada.', 'INVALID_SPLIT');
    }

    const orderId = attemptId;
    const orderRef = db.collection('stripe_checkout_orders').doc(orderId);
    const existing = await orderRef.get();
    if (existing.exists) {
      const saved = existing.data()!;
      if (
        String(saved.planId || '') !== planId ||
        String(saved.buyerEmail || '').toLowerCase() !== buyerEmail ||
        Number(saved.amountCents || 0) !== split.grossAmountCents
      ) {
        return fail(res, 409, 'Esta tentativa de pagamento não corresponde à oferta atual. Atualize a página.', 'CHECKOUT_SNAPSHOT_MISMATCH');
      }
      if (saved.stripePaymentIntentId) {
        try {
          const existingIntent = await stripe.paymentIntents.retrieve(String(saved.stripePaymentIntentId));
          if (existingIntent.status === 'succeeded') {
            return res.status(200).json({ paid: saved.status === 'paid', orderId });
          }
          if (existingIntent.client_secret && existingIntent.status !== 'canceled') {
            return res.status(200).json({ clientSecret: existingIntent.client_secret, orderId });
          }
        } catch {}
      }
    }

    const createdAt = new Date();
    const companyDelayDays = releaseDelayDays(companyProfile);
    const affiliateDelayDays = affiliateProfile ? releaseDelayDays(affiliateProfile) : null;
    const planName = String(plan.name || 'Produto LeadsPay').slice(0, 160);
    const companyName = String(company.name || plan.companyName || 'Empresa LeadsPay').slice(0, 160);
    const transferGroup = `LP_${orderId}`;

    try {
      await orderRef.set({
        planId,
        planName,
        companyId,
        companyName,
        companyOwnerId,
        companyAccountId,
        affiliateId: affiliateId || null,
        affiliateCode: validAffiliateCode || null,
        affiliateAccountId: affiliateAccountId || null,
        affiliatePercent,
        buyerName,
        buyerEmail,
        amountCents: split.grossAmountCents,
        originalProductAmountCents,
        productAmountCents,
        discountCents,
        couponId: couponId || null,
        couponCode: validCouponCode || null,
        platformFeeCents: split.platformFeeCents,
        affiliateAmountCents: split.affiliateAmountCents,
        companyAmountCents: split.companyAmountCents,
        companyReleaseDelayDays: companyDelayDays,
        affiliateReleaseDelayDays: affiliateDelayDays,
        currency: 'brl',
        status: 'checkout_pending',
        transferStatus: 'not_started',
        releaseStatus: 'pending',
        transferGroup,
        createdAt: createdAt.toISOString(),
        updatedAt: createdAt.toISOString(),
      }, { merge: true });
    } catch {
      return fail(res, 503, 'Não foi possível registrar o pedido. Tente novamente mais tarde.', 'ORDER_STORAGE_UNAVAILABLE');
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: split.grossAmountCents,
      currency: 'brl',
      automatic_payment_methods: { enabled: true },
      receipt_email: buyerEmail,
      description: planName,
      transfer_group: transferGroup,
      metadata: {
        orderId,
        planId,
        companyId,
        companyOwnerId,
        affiliateId: affiliateId || '',
        couponCode: validCouponCode || '',
        checkoutSource: 'leadspay-elements',
      },
    }, { idempotencyKey: `leadspay-pi-${orderId}` });

    if (!paymentIntent.client_secret) throw new Error('Stripe não retornou a chave do PaymentIntent.');

    try {
      await orderRef.set({
        stripePaymentIntentId: paymentIntent.id,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    } catch {
      return fail(res, 503, 'Não foi possível preparar o pagamento. Tente novamente com o mesmo pedido.', 'ORDER_STORAGE_UNAVAILABLE');
    }

    return res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      orderId,
      pricing: {
        originalProductAmountCents,
        discountCents,
        productAmountCents,
        checkoutFeeCents: 99,
        totalCents: split.grossAmountCents,
        couponCode: validCouponCode || null,
      },
    });
  } catch (error) {
    console.error('[Stripe checkout]', error instanceof Error ? error.message : 'Erro desconhecido');
    return fail(res, 500, 'Não foi possível iniciar o checkout Stripe. Tente novamente.', 'CHECKOUT_UNAVAILABLE');
  }
}
