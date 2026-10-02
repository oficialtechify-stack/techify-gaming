import { createHash, randomUUID } from 'node:crypto';
import { FieldValue } from 'firebase-admin/firestore';
import type Stripe from 'stripe';
import { getServerAdminFirestore } from '../../lib/firebaseAdminServer.js';
import { getStripeTestClient, getStripeWebhookSecret } from '../../lib/stripeServer.js';
import { calculateSplit } from '../../lib/stripeSplit.js';
import stripeWebhookHandler from '../stripe/webhook.js';
import { releaseStripeBalanceDocument } from '../crons/stripe-releases.js';

type Req = { method?: string };
type Res = { setHeader(name: string, value: string): void; status(code: number): Res; json(body: unknown): unknown };

async function deliverSignedEvent(stripe: Stripe, event: Stripe.Event) {
  const payload = JSON.stringify(event);
  const signature = stripe.webhooks.generateTestHeaderString({
    payload,
    secret: getStripeWebhookSecret(),
  });
  let statusCode = 200;
  let responseBody: any = null;
  const mockRes: any = {
    setHeader() {},
    status(code: number) { statusCode = code; return this; },
    json(body: unknown) { responseBody = body; return body; },
    end() { return undefined; },
  };
  const mockReq: any = {
    method: 'POST',
    headers: { 'stripe-signature': signature },
    rawBody: Buffer.from(payload),
  };
  await stripeWebhookHandler(mockReq, mockRes);
  if (statusCode !== 200) {
    throw new Error(`Webhook E2E respondeu ${statusCode}: ${JSON.stringify(responseBody)}`);
  }
  return responseBody;
}

function eventFor(id: string, type: Stripe.Event.Type, object: any): Stripe.Event {
  return {
    id,
    object: 'event',
    api_version: null,
    created: Math.floor(Date.now() / 1000),
    data: { object },
    livemode: false,
    pending_webhooks: 0,
    request: { id: null, idempotency_key: null },
    type,
  } as Stripe.Event;
}

export default async function handler(req: Req, res: Res) {
  res.setHeader('Cache-Control', 'no-store');
  if (process.env.VERCEL_ENV !== 'preview') return res.status(404).json({ error: 'Not found' });
  if (req.method !== 'POST' && req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido.' });

  const testKey = String(process.env.STRIPE_TEST_SECRET_KEY || '').trim();
  if (!/^(sk|rk)_test_/.test(testKey)) {
    return res.status(409).json({
      ok: false,
      code: 'STRIPE_TEST_KEY_MISSING',
      error: 'Configure STRIPE_TEST_SECRET_KEY no ambiente Preview antes do E2E.',
    });
  }

  const db = getServerAdminFirestore();
  const stripe = getStripeTestClient();
  const suffix = randomUUID().replace(/-/g, '').slice(0, 18);
  const orderId = `e2e_${suffix}`;
  const ownerId = `e2e_owner_${suffix}`;
  const affiliateId = `e2e_aff_${suffix}`;
  const companyId = `e2e_company_${suffix}`;
  const planId = `e2e_plan_${suffix}`;
  const affiliationId = `aff_${affiliateId}_${planId}`;
  const buyerEmail = `e2e+${suffix}@example.com`;
  const saleId = `stripe_${orderId}`;
  const companyReleaseId = `${orderId}_empresa`;
  const affiliateReleaseId = `${orderId}_afiliado`;
  const transferGroup = `LP_${orderId}`;
  const split = calculateSplit({
    grossAmountCents: 1099,
    affiliatePercent: 20,
    platformFeeCents: 99,
    commissionableAmountCents: 1000,
  });
  const clientId = `${companyId}_${createHash('sha256').update(buyerEmail).digest('hex').slice(0, 20)}`;
  let financeApplied = false;
  let paymentIntentId = '';
  let refundId = '';

  try {
    const now = new Date().toISOString();
    const batch = db.batch();
    batch.set(db.collection('user_profiles').doc(ownerId), {
      userId: ownerId,
      name: 'E2E Empresa',
      email: buyerEmail,
      accountType: 'empresa',
      hasCompanyProfile: true,
      hasAffiliateProfile: false,
      verified: true,
      verificationStatus: 'approved',
      empresaVerificationStatus: 'approved',
      companyVerificationStatus: 'approved',
      kyc_status: 'verified',
      pendingBalance: 0,
      availableBalance: 0,
      totalEarned: 0,
      empresaPendingBalanceCents: 0,
      empresaAvailableBalanceCents: 0,
      createdAt: now,
      updatedAt: now,
    });
    batch.set(db.collection('user_profiles').doc(affiliateId), {
      userId: affiliateId,
      name: 'E2E Afiliado',
      email: buyerEmail,
      accountType: 'afiliado',
      hasAffiliateProfile: true,
      hasCompanyProfile: false,
      verified: true,
      verificationStatus: 'approved',
      affiliateVerificationStatus: 'approved',
      kyc_status: 'verified',
      pendingBalance: 0,
      availableBalance: 0,
      totalEarned: 0,
      afiliadoPendingBalanceCents: 0,
      afiliadoAvailableBalanceCents: 0,
      createdAt: now,
      updatedAt: now,
    });
    batch.set(db.collection('companies').doc(companyId), {
      id: companyId,
      name: 'E2E Company',
      ownerId,
      submittedBy: ownerId,
      verified: true,
      status: 'approved',
      kyc_status: 'verified',
      totalSalesCount: 0,
      totalSalesVolume: 0,
      grossRevenue: 0,
      netRevenue: 0,
      totalCheckoutFees: 0,
      totalAffiliateCommissions: 0,
      createdAt: now,
      updatedAt: now,
    });
    batch.set(db.collection('plans').doc(planId), {
      id: planId,
      name: 'E2E Produto',
      companyId,
      ownerId,
      companyName: 'E2E Company',
      active: true,
      status: 'Ativo',
      priceSetup: 10,
      priceMonthly: 0,
      commissionPercentage: 20,
      allowAffiliates: true,
      totalSales: 0,
      totalSalesCount: 0,
      totalRevenue: 0,
      createdAt: now,
      updatedAt: now,
    });
    batch.set(db.collection('affiliations').doc(affiliationId), {
      id: affiliationId,
      affiliateId,
      userId: affiliateId,
      planId,
      plan_id: planId,
      companyId,
      companyOwnerId: ownerId,
      affiliateCode: `E2E${suffix.slice(0, 8).toUpperCase()}`,
      status: 'Ativo',
      salesCount: 0,
      totalEarned: 0,
      createdAt: now,
      updatedAt: now,
    });
    batch.set(db.collection('stripe_checkout_orders').doc(orderId), {
      planId,
      planName: 'E2E Produto',
      companyId,
      companyName: 'E2E Company',
      companyOwnerId: ownerId,
      companyAccountId: `acct_test_company_${suffix}`,
      affiliateId,
      affiliateCode: `E2E${suffix.slice(0, 8).toUpperCase()}`,
      affiliateAccountId: `acct_test_aff_${suffix}`,
      affiliatePercent: 20,
      buyerName: 'Cliente E2E',
      buyerEmail,
      amountCents: split.grossAmountCents,
      originalProductAmountCents: 1000,
      productAmountCents: 1000,
      discountCents: 0,
      platformFeeCents: split.platformFeeCents,
      affiliateAmountCents: split.affiliateAmountCents,
      companyAmountCents: split.companyAmountCents,
      companyReleaseDelayDays: 15,
      affiliateReleaseDelayDays: 15,
      currency: 'brl',
      status: 'checkout_pending',
      transferStatus: 'not_started',
      releaseStatus: 'pending',
      transferGroup,
      createdAt: now,
      updatedAt: now,
    });
    await batch.commit();

    const intent = await stripe.paymentIntents.create({
      amount: split.grossAmountCents,
      currency: 'brl',
      payment_method: 'pm_card_visa',
      payment_method_types: ['card'],
      confirm: true,
      description: 'LeadsPay E2E sandbox',
      transfer_group: transferGroup,
      metadata: {
        orderId,
        planId,
        companyId,
        companyOwnerId: ownerId,
        affiliateId,
        checkoutSource: 'leadspay-e2e-preview',
      },
    }, { idempotencyKey: `leadspay-e2e-${orderId}` });
    paymentIntentId = intent.id;
    if (intent.status !== 'succeeded') throw new Error(`PaymentIntent E2E terminou em ${intent.status}.`);

    await db.collection('stripe_checkout_orders').doc(orderId).set({
      stripePaymentIntentId: intent.id,
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    const paidEventId = `evt_e2e_paid_${suffix}`;
    await deliverSignedEvent(stripe, eventFor(paidEventId, 'payment_intent.succeeded', intent));

    const [saleSnap, ownerPendingSnap, affiliatePendingSnap, companyReleaseSnap, affiliateReleaseSnap] = await Promise.all([
      db.collection('sales').doc(saleId).get(),
      db.collection('user_profiles').doc(ownerId).get(),
      db.collection('user_profiles').doc(affiliateId).get(),
      db.collection('balance_releases').doc(companyReleaseId).get(),
      db.collection('balance_releases').doc(affiliateReleaseId).get(),
    ]);
    if (!saleSnap.exists || !companyReleaseSnap.exists || !affiliateReleaseSnap.exists) {
      throw new Error('Webhook não persistiu venda/liberações esperadas.');
    }
    financeApplied = true;
    const ownerPending = Number(ownerPendingSnap.data()?.empresaPendingBalanceCents || 0);
    const affiliatePending = Number(affiliatePendingSnap.data()?.afiliadoPendingBalanceCents || 0);
    if (ownerPending !== split.companyAmountCents || affiliatePending !== split.affiliateAmountCents) {
      throw new Error(`Saldo pendente incorreto: empresa=${ownerPending}, afiliado=${affiliatePending}.`);
    }

    const dueAt = new Date(Date.now() - 60_000).toISOString();
    await Promise.all([
      companyReleaseSnap.ref.set({ availableAt: dueAt }, { merge: true }),
      affiliateReleaseSnap.ref.set({ availableAt: dueAt }, { merge: true }),
    ]);
    const companyReleased = await releaseStripeBalanceDocument(db, companyReleaseSnap.ref);
    const affiliateReleased = await releaseStripeBalanceDocument(db, affiliateReleaseSnap.ref);
    if (!companyReleased || !affiliateReleased) throw new Error('Liberação de saldo E2E não ocorreu.');

    const [ownerAvailableSnap, affiliateAvailableSnap] = await Promise.all([
      db.collection('user_profiles').doc(ownerId).get(),
      db.collection('user_profiles').doc(affiliateId).get(),
    ]);
    const ownerAvailable = Number(ownerAvailableSnap.data()?.empresaAvailableBalanceCents || 0);
    const affiliateAvailable = Number(affiliateAvailableSnap.data()?.afiliadoAvailableBalanceCents || 0);
    if (ownerAvailable !== split.companyAmountCents || affiliateAvailable !== split.affiliateAmountCents) {
      throw new Error(`Saldo disponível incorreto: empresa=${ownerAvailable}, afiliado=${affiliateAvailable}.`);
    }

    const refund = await stripe.refunds.create({ payment_intent: intent.id }, { idempotencyKey: `leadspay-e2e-refund-${orderId}` });
    refundId = refund.id;
    const expanded = await stripe.paymentIntents.retrieve(intent.id, { expand: ['latest_charge'] });
    const latestCharge = expanded.latest_charge;
    const charge = typeof latestCharge === 'string' ? await stripe.charges.retrieve(latestCharge) : latestCharge;
    if (!charge) throw new Error('Charge E2E não encontrada após reembolso.');

    const refundEventId = `evt_e2e_refund_${suffix}`;
    await deliverSignedEvent(stripe, eventFor(refundEventId, 'charge.refunded', charge));

    const [finalOrder, finalSale, finalOwner, finalAffiliate, finalCompanyRelease, finalAffiliateRelease] = await Promise.all([
      db.collection('stripe_checkout_orders').doc(orderId).get(),
      db.collection('sales').doc(saleId).get(),
      db.collection('user_profiles').doc(ownerId).get(),
      db.collection('user_profiles').doc(affiliateId).get(),
      db.collection('balance_releases').doc(companyReleaseId).get(),
      db.collection('balance_releases').doc(affiliateReleaseId).get(),
    ]);

    const finalOwnerAvailable = Number(finalOwner.data()?.empresaAvailableBalanceCents || 0);
    const finalAffiliateAvailable = Number(finalAffiliate.data()?.afiliadoAvailableBalanceCents || 0);
    const refundReversed = finalOrder.data()?.status === 'refunded'
      && finalSale.data()?.status === 'Estornado'
      && finalCompanyRelease.data()?.status === 'reversed'
      && finalAffiliateRelease.data()?.status === 'reversed'
      && finalOwnerAvailable === 0
      && finalAffiliateAvailable === 0;

    if (!refundReversed) throw new Error('Reembolso não reverteu integralmente os saldos E2E.');

    return res.status(200).json({
      ok: true,
      environment: 'preview/test',
      stripePayment: { created: true, succeeded: true, refunded: true },
      webhook: { signatureValidated: true, paidProcessed: true, refundProcessed: true },
      firestore: { saleCreated: true, companyLedger: true, affiliateLedger: true },
      walletRelease: { companyReleased: true, affiliateReleased: true },
      refundReversal: true,
      amounts: {
        totalCents: split.grossAmountCents,
        platformFeeCents: split.platformFeeCents,
        companyCents: split.companyAmountCents,
        affiliateCents: split.affiliateAmountCents,
      },
      testRefs: { orderId, paymentIntentId, refundId },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha desconhecida';
    console.error('[Finance E2E]', message);
    return res.status(503).json({
      ok: false,
      error: message.slice(0, 600),
      testRefs: { orderId, paymentIntentId: paymentIntentId || null, refundId: refundId || null },
    });
  } finally {
    try {
      const cleanup = db.batch();
      for (const [collection, id] of [
        ['sales', saleId],
        ['balance_releases', companyReleaseId],
        ['balance_releases', affiliateReleaseId],
        ['stripe_checkout_orders', orderId],
        ['stripe_webhook_events', `evt_e2e_paid_${suffix}`],
        ['stripe_webhook_events', `evt_e2e_refund_${suffix}`],
        ['affiliations', affiliationId],
        ['clients', clientId],
        ['plans', planId],
        ['companies', companyId],
        ['user_profiles', ownerId],
        ['user_profiles', affiliateId],
      ] as const) cleanup.delete(db.collection(collection).doc(id));
      if (financeApplied) {
        cleanup.set(db.collection('platform_finances').doc('global_summary'), {
          totalPlatformRevenue: FieldValue.increment(-split.platformFeeCents / 100),
          totalCheckoutFees: FieldValue.increment(-split.platformFeeCents / 100),
          totalSalesProcessed: FieldValue.increment(-1),
          lastUpdated: new Date().toISOString(),
        }, { merge: true });
      }
      await cleanup.commit();
    } catch (cleanupError) {
      console.error('[Finance E2E cleanup]', cleanupError instanceof Error ? cleanupError.message : 'Falha');
    }
  }
}
