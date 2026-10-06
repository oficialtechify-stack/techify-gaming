import { getServerAdminFirestore } from '../../lib/firebaseAdminServer.js';
import { getStripeTestClient } from '../../lib/stripeServer.js';
import { calculateSplit, toCents } from '../../lib/stripeSplit.js';

type RequestLike = { method?: string; body?: unknown; headers: Record<string, string | string[] | undefined> };
type ResponseLike = { setHeader(name: string, value: string): void; status(code: number): ResponseLike; json(body: unknown): unknown; end(): unknown };

const fail = (res: ResponseLike, status: number, error: string, code?: string) =>
  res.status(status).json({ error, ...(code ? { code } : {}) });

function resolvePaymentMethods(plan: Record<string, any>): Array<'card' | 'pix' | 'boleto'> {
  const configured = Array.isArray(plan.paymentMethods)
    ? plan.paymentMethods.map((value: unknown) => String(value || '').trim().toUpperCase())
    : [];
  const result: Array<'card' | 'pix' | 'boleto'> = [];
  if (!configured.length || configured.some((item) => ['CARD', 'APPLE_PAY', 'GOOGLE_PAY'].includes(item))) result.push('card');
  if (!configured.length || configured.includes('PIX')) result.push('pix');
  if (!configured.length || configured.includes('BOLETO')) result.push('boleto');
  return result.length ? result : ['card'];
}

export default async function handler(req: RequestLike, res: ResponseLike) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return fail(res, 405, 'Método não permitido.');

  try {
    const body = req.body && typeof req.body === 'object' ? req.body as Record<string, unknown> : {};
    const originalOrderId = String(body.originalOrderId || '').trim();
    const upsellId = String(body.upsellId || '').trim().replace(/[^A-Za-z0-9_-]/g, '').slice(0, 80);
    const attemptId = String(body.attemptId || '').trim().replace(/[^A-Za-z0-9_-]/g, '').slice(0, 90);

    if (!/^[A-Za-z0-9_-]{8,150}$/.test(originalOrderId)) {
      return fail(res, 400, 'Pedido original inválido.', 'INVALID_ORIGINAL_ORDER');
    }
    if (!upsellId || !/^[A-Za-z0-9_-]{1,80}$/.test(upsellId)) {
      return fail(res, 400, 'Oferta adicional inválida.', 'INVALID_UPSELL');
    }
    if (!/^[A-Za-z0-9_-]{10,90}$/.test(attemptId)) {
      return fail(res, 400, 'Atualize a página e tente novamente.', 'INVALID_ATTEMPT');
    }

    const db = getServerAdminFirestore();
    const originalOrderSnap = await db.collection('stripe_checkout_orders').doc(originalOrderId).get();
    if (!originalOrderSnap.exists) return fail(res, 404, 'Compra original não encontrada.', 'ORDER_NOT_FOUND');

    const original = originalOrderSnap.data()! as Record<string, any>;
    if (String(original.status || '').toLowerCase() !== 'paid') {
      return fail(res, 409, 'A compra principal ainda não foi confirmada.', 'ORIGINAL_ORDER_NOT_PAID');
    }

    const planId = String(original.planId || '').trim();
    const companyId = String(original.companyId || '').trim();
    if (!planId || !companyId) return fail(res, 409, 'Compra original incompleta.', 'ORDER_INVALID');

    const planSnap = await db.collection('plans').doc(planId).get();
    if (!planSnap.exists) return fail(res, 404, 'Produto não encontrado.', 'PLAN_NOT_FOUND');
    const plan = planSnap.data()! as Record<string, any>;

    if (plan.thankYouUpsellEnabled !== true) {
      return fail(res, 409, 'Este produto não possui oferta pós-compra ativa.', 'UPSELL_DISABLED');
    }

    const upsells = Array.isArray(plan.upsells) ? plan.upsells : [];
    const upsell = upsells.find((item: any) => String(item?.id || '') === upsellId && item?.active !== false);
    if (!upsell) return fail(res, 404, 'A oferta adicional não está mais disponível.', 'UPSELL_NOT_FOUND');

    const upsellAmount = Number(upsell.price || 0);
    if (!Number.isFinite(upsellAmount) || upsellAmount < 0.5) {
      return fail(res, 409, 'A oferta adicional possui valor inválido.', 'INVALID_UPSELL_PRICE');
    }

    const productAmountCents = toCents(upsellAmount);
    const grossAmountCents = productAmountCents + 99;
    const affiliatePercent = original.affiliateId && plan.affiliateCommissionOnUpsell === true
      ? Number(original.affiliatePercent || plan.commissionPercentage || 0)
      : 0;
    const split = calculateSplit({
      grossAmountCents,
      affiliatePercent,
      platformFeeCents: 99,
      commissionableAmountCents: productAmountCents,
    });
    if (split.companyAmountCents <= 0) {
      return fail(res, 422, 'O valor da oferta não cobre as taxas e comissões configuradas.', 'INVALID_SPLIT');
    }

    const stripe = getStripeTestClient();
    const companyAccountId = String(original.companyAccountId || '');
    if (!companyAccountId) return fail(res, 409, 'Conta de recebimento da empresa indisponível.', 'COMPANY_CONNECT_NOT_READY');
    const companyAccount = await stripe.accounts.retrieve(companyAccountId);
    if (companyAccount.payouts_enabled !== true || companyAccount.capabilities?.transfers !== 'active') {
      return fail(res, 409, 'A empresa precisa revisar sua conta Stripe antes de receber novas vendas.', 'COMPANY_CONNECT_NOT_READY');
    }

    let affiliateAccountId = '';
    let affiliateAmountCents = 0;
    if (affiliatePercent > 0 && original.affiliateId) {
      affiliateAccountId = String(original.affiliateAccountId || '');
      if (!affiliateAccountId) return fail(res, 409, 'Conta Stripe do afiliado indisponível.', 'AFFILIATE_CONNECT_NOT_READY');
      const affiliateAccount = await stripe.accounts.retrieve(affiliateAccountId);
      if (affiliateAccount.payouts_enabled !== true || affiliateAccount.capabilities?.transfers !== 'active') {
        return fail(res, 409, 'O afiliado precisa revisar sua conta Stripe antes de receber comissão.', 'AFFILIATE_CONNECT_NOT_READY');
      }
      affiliateAmountCents = split.affiliateAmountCents;
    }

    const orderId = `ups_${attemptId}`;
    const orderRef = db.collection('stripe_checkout_orders').doc(orderId);
    const existing = await orderRef.get();
    if (existing.exists) {
      const saved = existing.data()! as Record<string, any>;
      if (
        String(saved.parentOrderId || '') !== originalOrderId ||
        String(saved.upsellId || '') !== upsellId ||
        Number(saved.amountCents || 0) !== split.grossAmountCents
      ) {
        return fail(res, 409, 'Esta tentativa não corresponde à oferta adicional atual.', 'UPSELL_SNAPSHOT_MISMATCH');
      }
      if (saved.stripePaymentIntentId) {
        const intent = await stripe.paymentIntents.retrieve(String(saved.stripePaymentIntentId));
        if (intent.status === 'succeeded') return res.status(200).json({ paid: true, orderId });
        if (intent.client_secret && intent.status !== 'canceled') {
          return res.status(200).json({ clientSecret: intent.client_secret, orderId });
        }
      }
    }

    const now = new Date().toISOString();
    await orderRef.set({
      saleKind: 'upsell',
      parentOrderId: originalOrderId,
      upsellId,
      upsellName: String(upsell.name || 'Oferta adicional').slice(0, 160),
      planId,
      planName: String(plan.name || original.planName || 'Produto LeadsPay').slice(0, 160),
      companyId,
      companyName: String(original.companyName || plan.companyName || '').slice(0, 160),
      companyOwnerId: String(original.companyOwnerId || ''),
      companyAccountId,
      affiliateId: affiliateAmountCents > 0 ? String(original.affiliateId || '') : null,
      affiliateCode: affiliateAmountCents > 0 ? String(original.affiliateCode || '') : null,
      affiliateAccountId: affiliateAmountCents > 0 ? affiliateAccountId : null,
      affiliatePercent: affiliateAmountCents > 0 ? affiliatePercent : 0,
      buyerName: String(original.buyerName || '').slice(0, 120),
      buyerEmail: String(original.buyerEmail || '').toLowerCase().slice(0, 200),
      amountCents: split.grossAmountCents,
      originalProductAmountCents: productAmountCents,
      productAmountCents,
      discountCents: 0,
      platformFeeCents: 99,
      affiliateAmountCents,
      companyAmountCents: split.companyAmountCents,
      companyReleaseDelayDays: Number(original.companyReleaseDelayDays || 15),
      affiliateReleaseDelayDays: affiliateAmountCents > 0 ? Number(original.affiliateReleaseDelayDays || 15) : null,
      currency: 'brl',
      status: 'checkout_pending',
      transferStatus: 'not_started',
      releaseStatus: 'pending',
      transferGroup: `LP_${orderId}`,
      createdAt: now,
      updatedAt: now,
    }, { merge: true });

    const paymentIntent = await stripe.paymentIntents.create({
      amount: split.grossAmountCents,
      currency: 'brl',
      payment_method_types: resolvePaymentMethods(plan),
      receipt_email: String(original.buyerEmail || ''),
      description: String(upsell.name || 'Oferta adicional LeadsPay').slice(0, 160),
      transfer_group: `LP_${orderId}`,
      metadata: {
        orderId,
        parentOrderId: originalOrderId,
        planId,
        companyId,
        upsellId,
        checkoutSource: 'leadspay-upsell',
      },
    }, { idempotencyKey: `leadspay-upsell-${orderId}` });

    if (!paymentIntent.client_secret) throw new Error('Stripe não retornou client_secret para a oferta adicional.');

    await orderRef.set({
      stripePaymentIntentId: paymentIntent.id,
      is_test: !paymentIntent.livemode,
      environment: paymentIntent.livemode ? 'production' : 'development',
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    return res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      orderId,
      pricing: {
        productAmountCents,
        checkoutFeeCents: 99,
        totalCents: split.grossAmountCents,
      },
      upsell: {
        id: upsellId,
        name: String(upsell.name || ''),
        price: upsellAmount,
      },
    });
  } catch (error) {
    console.error('[Stripe upsell checkout]', error);
    return fail(res, 500, 'Não foi possível iniciar a oferta adicional agora.', 'UPSELL_CHECKOUT_UNAVAILABLE');
  }
}
