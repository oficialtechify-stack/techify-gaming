import { verifyFirebaseIdentity, getServerAdminFirestore } from '../../lib/firebaseAdminServer.js';
import { getStripeTestClient } from '../../lib/stripeServer.js';
import { calculateSplit, toCents } from '../../lib/stripeSplit.js';
import { applyVerificationRequest, profileHasRole, profileRoleIsApproved } from '../../lib/profileEligibility.js';

type RequestLike = { method?: string; body?: unknown; headers: Record<string, string | string[] | undefined> };
type ResponseLike = { setHeader(name: string, value: string): void; status(code: number): ResponseLike; json(body: unknown): unknown; end(): unknown };

function setHeaders(req: RequestLike, res: ResponseLike): void {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Vary', 'Origin');
  const rawBase = process.env.LEADSPAY_BASE_URL?.trim();
  const allowedOrigin = rawBase ? new URL(rawBase).origin : '';
  if (typeof req.headers.origin === 'string' && req.headers.origin === allowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  }
}

function fail(res: ResponseLike, status: number, error: string, code?: string) {
  return res.status(status).json({ error, ...(code ? { code } : {}) });
}

export default async function handler(req: RequestLike, res: ResponseLike) {
  setHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return fail(res, 405, 'Método não permitido.');

  try {
    const body = (req.body && typeof req.body === 'object') ? req.body as Record<string, unknown> : {};
    const planId = String(body.planId || '').trim();
    const attemptId = String(body.attemptId || '').trim();
    const buyerName = String(body.buyerName || '').trim().slice(0, 120);
    const buyerEmail = String(body.buyerEmail || '').trim().toLowerCase().slice(0, 200);
    const affiliateCode = String(body.affiliateCode || '').trim().slice(0, 64);
    if (!planId || planId.length > 180) return fail(res, 400, 'Oferta inválida.');
    if (!/^[a-zA-Z0-9_-]{20,80}$/.test(attemptId)) return fail(res, 400, 'Atualize a página e tente novamente.');
    if (!buyerName || !buyerEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyerEmail)) return fail(res, 400, 'Informe nome e e-mail válidos.');
    if (body.couponCode || body.orderBump) return fail(res, 422, 'Cupons e adicionais ainda não estão habilitados neste checkout Stripe piloto. Nenhum valor foi cobrado.');

    const db = getServerAdminFirestore();
    const planSnap = await db.collection('plans').doc(planId).get();
    if (!planSnap.exists) return fail(res, 404, 'Oferta não encontrada.');
    const plan = planSnap.data()!;
    if (plan.status !== 'Ativo' || plan.active === false) return fail(res, 409, 'Esta oferta não está disponível para compra.');
    if (plan.paymentType === 'Recorrente' || plan.paymentType === 'Assinatura' || plan.billingType === 'recorrente') {
      return fail(res, 422, 'Este checkout Stripe piloto aceita somente compras avulsas. Assinaturas serão habilitadas depois de configurar Stripe Billing e seus webhooks.');
    }

    const companyId = String(plan.companyId || '');
    const companySnap = companyId ? await db.collection('companies').doc(companyId).get() : null;
    if (!companySnap?.exists) return fail(res, 422, 'A empresa responsável por esta oferta não foi encontrada.');
    const company = companySnap.data()!;
    const companyOwnerId = String(plan.ownerId || company.ownerId || '');
    if (!companyOwnerId || company.ownerId !== companyOwnerId || company.verified !== true || company.status !== 'approved' || company.archived === true || company.isArchived === true) {
      return fail(res, 409, 'A empresa ainda não está aprovada para receber pela Stripe.');
    }

    const companyProfileSnap = await db.collection('user_profiles').doc(companyOwnerId).get();
    const companyRequestSnap = await db.collection('verification_requests').doc(companyOwnerId).get();
    const companyProfileRaw = companyProfileSnap.data();
    const companyProfile = companyProfileRaw
      ? applyVerificationRequest(companyProfileRaw, companyRequestSnap.exists ? companyRequestSnap.data()! : null) as Record<string, any>
      : undefined;
    if (!companyProfile || !profileHasRole(companyProfile, 'empresa') || !profileRoleIsApproved(companyProfile, 'empresa')) {
      return fail(res, 409, 'O perfil da empresa responsável precisa estar aprovado para vender pela Stripe.');
    }
    const companyAccountId = String(companyProfile?.stripeAccounts?.empresa || company.stripeAccountId || '');
    if (!companyAccountId) return fail(res, 409, 'A empresa ainda não conectou sua conta Stripe.');

    let affiliateId = '';
    let affiliateAccountId = '';
    let affiliatePercent = 0;
    if (affiliateCode) {
      let affiliationSnap = await db.collection('affiliations').where('affiliateCode', '==', affiliateCode).limit(1).get();
      if (affiliationSnap.empty) affiliationSnap = await db.collection('affiliations').where('affiliate_code', '==', affiliateCode).limit(1).get();
      if (!affiliationSnap.empty) {
        const affiliation = affiliationSnap.docs[0].data();
        const affiliationStatus = String(affiliation.status || '').toLowerCase();
        if ((affiliationStatus === 'ativo' || affiliationStatus === 'active') && String(affiliation.companyId || '') === companyId && String(affiliation.planId || affiliation.plan_id || '') === planId) {
          affiliateId = String(affiliation.affiliateId || affiliation.userId || affiliation.user_id || '');
          affiliatePercent = Number(affiliation.commissionPercentage ?? plan.commissionPercentage ?? 0);
          const affiliateProfileSnap = affiliateId ? await db.collection('user_profiles').doc(affiliateId).get() : null;
          const affiliateRequestSnap = affiliateId ? await db.collection('verification_requests').doc(affiliateId).get() : null;
          const affiliateProfileRaw = affiliateProfileSnap?.data();
          const affiliateProfile = affiliateProfileRaw
            ? applyVerificationRequest(affiliateProfileRaw, affiliateRequestSnap?.exists ? affiliateRequestSnap.data()! : null) as Record<string, any>
            : undefined;
          if (affiliatePercent > 0 && (!affiliateProfile || !profileHasRole(affiliateProfile, 'afiliado') || !profileRoleIsApproved(affiliateProfile, 'afiliado'))) {
            return fail(res, 409, 'O perfil do afiliado vinculado precisa estar aprovado antes de receber comissões.');
          }
          affiliateAccountId = String(affiliateProfile?.stripeAccounts?.afiliado || '');
          if (affiliatePercent > 0 && !affiliateAccountId) return fail(res, 409, 'O afiliado vinculado ainda não conectou sua conta Stripe.');
        }
      }
    }

    const baseAmount = plan.priceSetup ?? plan.price ?? plan.priceMonthly;
    const productAmountCents = toCents(baseAmount);
    const grossAmountCents = productAmountCents + 99;
    const split = calculateSplit({ grossAmountCents, affiliatePercent, platformFeeCents: 99, commissionableAmountCents: productAmountCents });
    if (split.companyAmountCents <= 0) return fail(res, 422, 'O preço não cobre a taxa da plataforma e a comissão configurada.');

    const stripe = getStripeTestClient();
    const recipients = [
      { id: companyAccountId, ownerId: companyOwnerId },
      ...(affiliateAccountId ? [{ id: affiliateAccountId, ownerId: affiliateId }] : []),
    ];
    for (const recipient of recipients) {
      const account = await stripe.accounts.retrieve(recipient.id);
      if (account.metadata?.firebase_uid !== recipient.ownerId) return fail(res, 409, 'Uma conta conectada precisa ser reconfirmada pelo titular.');
      if (!account.details_submitted || !account.payouts_enabled || account.capabilities?.transfers !== 'active') {
        return fail(res, 409, 'O onboarding Stripe de um dos recebedores ainda não foi concluído.');
      }
    }

    const orderId = attemptId;
    const orderRef = db.collection('stripe_checkout_orders').doc(orderId);
    const existing = await orderRef.get();
    if (existing.exists) {
      const saved = existing.data()!;
      const immutableSnapshotMatches = saved.planId === planId &&
        saved.buyerName === buyerName && saved.buyerEmail === buyerEmail &&
        saved.companyId === companyId && saved.companyOwnerId === companyOwnerId &&
        saved.companyAccountId === companyAccountId &&
        (saved.affiliateId || '') === (affiliateId || '') &&
        (saved.affiliateAccountId || '') === (affiliateAccountId || '') &&
        Number(saved.affiliatePercent || 0) === affiliatePercent &&
        Number(saved.amountCents) === split.grossAmountCents &&
        Number(saved.productAmountCents) === productAmountCents &&
        Number(saved.platformFeeCents) === split.platformFeeCents &&
        Number(saved.companyAmountCents) === split.companyAmountCents &&
        Number(saved.affiliateAmountCents || 0) === split.affiliateAmountCents;
      if (!immutableSnapshotMatches) return fail(res, 409, 'Esta tentativa tem dados de preço, empresa ou comissão diferentes e não pode ser reutilizada. Inicie um novo checkout.', 'CHECKOUT_SNAPSHOT_MISMATCH');
      if (saved.stripePaymentIntentId) {
        const existingIntent = await stripe.paymentIntents.retrieve(String(saved.stripePaymentIntentId));
        if (existingIntent.status === 'succeeded' && saved.status === 'paid') return fail(res, 409, 'Este pagamento já foi concluído. Não tente pagar novamente; confira a confirmação da compra.', 'PAYMENT_ALREADY_COMPLETED');
        if (existingIntent.status === 'succeeded') return fail(res, 503, 'O pagamento foi recebido e está aguardando a confirmação do sistema. Não tente pagar novamente; atualize em alguns instantes.', 'PAYMENT_PROCESSING');
        if (existingIntent.status === 'canceled') return fail(res, 409, 'Esta tentativa foi cancelada. Inicie uma nova tentativa de pagamento.', 'PAYMENT_ATTEMPT_CANCELED');
        if (existingIntent.client_secret) return res.status(200).json({ clientSecret: existingIntent.client_secret, orderId });
      }
    } else {
      const createdAt = new Date();
      const availableAt = new Date(createdAt.getTime() + 9 * 24 * 60 * 60 * 1000);
      await orderRef.create({
        firebaseUid: null,
        planId,
        planName: String(plan.name || 'Produto').slice(0, 160),
        companyId,
        companyName: String(company.name || plan.companyName || 'Empresa').slice(0, 160),
        companyOwnerId,
        companyAccountId,
        affiliateId: affiliateId || null,
        affiliateName: null,
        affiliateCode: affiliateId ? affiliateCode : null,
        affiliateAccountId: affiliateAccountId || null,
        affiliatePercent,
        buyerName,
        buyerEmail,
        amountCents: split.grossAmountCents,
        productAmountCents,
        platformFeeCents: split.platformFeeCents,
        affiliateAmountCents: split.affiliateAmountCents,
        companyAmountCents: split.companyAmountCents,
        currency: 'brl',
        status: 'checkout_pending',
        transferStatus: 'not_started',
        createdAt: createdAt.toISOString(),
        availableAt: availableAt.toISOString(),
      });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: grossAmountCents,
      currency: 'brl',
      automatic_payment_methods: { enabled: true },
      receipt_email: buyerEmail,
      description: String(plan.name || 'Compra LeadsPay').slice(0, 160),
      transfer_group: `LP_${orderId}`,
      metadata: { orderId, planId, companyId, companyOwnerId, affiliateId: affiliateId || '', checkoutSource: 'leadspay-elements' },
    }, { idempotencyKey: `leadspay-payment-intent-${orderId}` });

    if (!paymentIntent.client_secret) throw new Error('Stripe não retornou a chave do PaymentIntent.');
    await orderRef.set({
      stripePaymentIntentId: paymentIntent.id,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    return res.status(200).json({ clientSecret: paymentIntent.client_secret, orderId });
  } catch (error) {
    console.error('[Stripe checkout]', error instanceof Error ? error.message : 'Erro desconhecido');
    return fail(res, 503, 'Não foi possível iniciar o checkout Stripe. Confira a configuração e tente novamente.');
  }
}
