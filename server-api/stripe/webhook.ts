import Stripe from 'stripe';
import { createHash, createHmac } from 'node:crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { getServerAdminFirestore } from '../../lib/firebaseAdminServer.js';
import { getStripeTestClient, getStripeWebhookSecret } from '../../lib/stripeServer.js';
import { getSubscriptionPlan, roleAvailableCentsField, rolePendingCentsField, type PlatformRole } from '../../lib/platformBilling.js';
import { calculateSplit } from '../../lib/stripeSplit.js';
import { assertSafeWebhookUrl } from '../../lib/webhookSecurity.js';

type RequestLike = AsyncIterable<Buffer | string> & { method?: string; body?: unknown; headers: Record<string, string | string[] | undefined> };
type ResponseLike = { setHeader(name: string, value: string): void; status(code: number): ResponseLike; json(body: unknown): unknown; end(): unknown };

async function readRawBody(req: RequestLike): Promise<Buffer> {
  if ((req as any).rawBody && Buffer.isBuffer((req as any).rawBody)) return (req as any).rawBody;
  if (Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === 'string') return Buffer.from(req.body);
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks);
}

function header(req: RequestLike, name: string): string | undefined {
  const value = req.headers[name];
  return typeof value === 'string' ? value : undefined;
}

function paymentMethodLabel(methodType?: string | null): string {
  const labels: Record<string, string> = {
    pix: 'PIX', card: 'Cartão', boleto: 'Boleto', link: 'Link',
    us_bank_account: 'Conta bancária (EUA)', sepa_debit: 'Débito SEPA',
    ideal: 'iDEAL', klarna: 'Klarna', cashapp: 'Cash App', paypal: 'PayPal', affirm: 'Affirm',
  };
  if (!methodType) return 'Stripe';
  return labels[methodType] || `Stripe · ${methodType.replace(/_/g, ' ')}`;
}

function addDays(from: Date, days: number): string {
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}

async function applyPaymentIntentPaid(stripe: Stripe, event: Stripe.Event, eventIntent: Stripe.PaymentIntent) {
  const orderId = eventIntent.metadata?.orderId;
  if (!orderId) throw new Error('PaymentIntent sem referência interna.');
  const paymentIntent = await stripe.paymentIntents.retrieve(eventIntent.id, { expand: ['latest_charge'] });
  if (paymentIntent.status !== 'succeeded') throw new Error('Pagamento ainda não confirmado pela Stripe.');
  if (paymentIntent.currency !== 'brl' || paymentIntent.metadata.orderId !== orderId) throw new Error('PaymentIntent não corresponde à cobrança BRL esperada.');
  const latestCharge = paymentIntent.latest_charge;
  const charge = typeof latestCharge === 'string' ? await stripe.charges.retrieve(latestCharge) : latestCharge;
  const chargeId = charge?.id;
  if (!chargeId) throw new Error('A cobrança confirmada não retornou charge ID.');

  const db = getServerAdminFirestore();
  const orderRef = db.collection('stripe_checkout_orders').doc(orderId);
  const saleRef = db.collection('sales').doc(`stripe_${orderId}`);

  await db.runTransaction(async (tx) => {
    const orderSnap = await tx.get(orderRef);
    if (!orderSnap.exists) throw new Error('Pedido Stripe não encontrado.');
    const order = orderSnap.data()!;
    if (order.stripePaymentIntentId && order.stripePaymentIntentId !== paymentIntent.id) throw new Error('PaymentIntent não corresponde ao pedido.');
    if (Number(order.amountCents) !== paymentIntent.amount || String(order.transferGroup || `LP_${orderId}`) !== String(paymentIntent.transfer_group || '')) {
      throw new Error('Valor ou grupo de transferência não corresponde ao pedido.');
    }
    if (order.status === 'refunded' || order.status === 'disputed') return;
    const saleSnap = await tx.get(saleRef);
    if (saleSnap.exists) return;

    const now = new Date();
    const companyAmountCents = Number(order.companyAmountCents || 0);
    const affiliateAmountCents = Number(order.affiliateAmountCents || 0);
    const companyDelayDays = Number(order.companyReleaseDelayDays || 10);
    const affiliateDelayDays = Number(order.affiliateReleaseDelayDays || 10);
    const companyAvailableAt = addDays(now, companyDelayDays);
    const affiliateAvailableAt = affiliateAmountCents > 0 ? addDays(now, affiliateDelayDays) : null;

    const participants: Array<{ role: PlatformRole; userId: string; amountCents: number; accountId: string; availableAt: string }> = [{
      role: 'empresa',
      userId: String(order.companyOwnerId || ''),
      amountCents: companyAmountCents,
      accountId: String(order.companyAccountId || ''),
      availableAt: companyAvailableAt,
    }];
    if (affiliateAmountCents > 0 && order.affiliateId) {
      participants.push({
        role: 'afiliado',
        userId: String(order.affiliateId),
        amountCents: affiliateAmountCents,
        accountId: String(order.affiliateAccountId || ''),
        availableAt: affiliateAvailableAt!,
      });
    }
    for (const participant of participants) {
      if (!participant.userId || !Number.isSafeInteger(participant.amountCents) || participant.amountCents <= 0) {
        throw new Error('Participante financeiro inválido.');
      }
    }

    const uniqueProfiles = new Map<string, FirebaseFirestore.DocumentReference>();
    for (const participant of participants) uniqueProfiles.set(participant.userId, db.collection('user_profiles').doc(participant.userId));
    const profileSnapshots = new Map<string, FirebaseFirestore.DocumentSnapshot>();
    for (const [uid, ref] of uniqueProfiles) {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new Error(`Perfil financeiro ${uid} não encontrado.`);
      profileSnapshots.set(uid, snap);
    }

    const planRefForOrder = order.planId ? db.collection('plans').doc(String(order.planId)) : null;
    const planSnapForOrder = planRefForOrder ? await tx.get(planRefForOrder) : null;
    const currentCustomCheckouts = planSnapForOrder?.exists && Array.isArray(planSnapForOrder.data()?.customCheckouts)
      ? planSnapForOrder.data()!.customCheckouts as Array<Record<string, any>>
      : [];
    const nextCustomCheckouts = order.checkoutVariant
      ? currentCustomCheckouts.map((checkout) =>
          String(checkout.checkoutSlug || '') === String(order.checkoutVariant || '')
            ? { ...checkout, salesCount: Number(checkout.salesCount || 0) + 1 }
            : checkout
        )
      : currentCustomCheckouts;

    const maxAvailableAt = [companyAvailableAt, affiliateAvailableAt].filter(Boolean).sort().at(-1) || companyAvailableAt;
    const sale = {
      id: saleRef.id,
      source: 'stripe',
      saleKind: String(order.saleKind || 'one_time'),
      parentOrderId: order.parentOrderId || null,
      upsellId: order.upsellId || null,
      upsellName: order.upsellName || null,
      orderBumpId: order.orderBumpId || null,
      orderBumpName: order.orderBumpName || null,
      orderBumpAmount: Number(order.orderBumpAmountCents || 0) / 100,
      checkoutVariant: order.checkoutVariant || null,
      checkoutName: order.checkoutName || null,
      stripeOrderId: orderId,
      stripePaymentIntentId: paymentIntent.id,
      stripeChargeId: chargeId,
      transferGroup: `LP_${orderId}`,
      companyId: order.companyId,
      companyName: order.companyName,
      companyOwnerId: order.companyOwnerId,
      companyStripeAccountId: order.companyAccountId,
      ...(order.affiliateId ? { affiliateId: String(order.affiliateId) } : {}),
      ...(order.affiliateCode ? { affiliateCode: String(order.affiliateCode) } : {}),
      ...(order.affiliateAccountId ? { affiliateStripeAccountId: String(order.affiliateAccountId) } : {}),
      platformId: order.planId,
      platformName: order.planName,
      buyerName: order.buyerName,
      customerName: order.buyerName,
      buyerEmail: order.buyerEmail,
      buyerCompany: order.companyName,
      amount: Number(order.amountCents) / 100,
      commissionEarned: affiliateAmountCents / 100,
      checkoutFee: Number(order.platformFeeCents) / 100,
      netCompanyAmount: companyAmountCents / 100,
      method: paymentMethodLabel(charge.payment_method_details?.type),
      status: 'Aprovado',
      releaseStatus: 'pendente',
      availableAt: maxAvailableAt,
      companyAvailableAt,
      affiliateAvailableAt,
      date: now.toISOString().slice(0, 10),
      time: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }),
      createdAt: now.toISOString(),
      paidAt: now.toISOString(),
      environment: paymentIntent.livemode ? 'production' : 'development',
      ...(!paymentIntent.livemode ? { is_test: true } : {}),
      couponCode: order.couponCode || null,
      utmSource: order.utmSource || null,
      utmMedium: order.utmMedium || null,
      utmCampaign: order.utmCampaign || null,
      discountAmount: Number(order.discountCents || 0) / 100,
      financialBreakdown: {
        originalProductAmount: Number(order.originalProductAmountCents || order.productAmountCents || 0) / 100,
        discountAmount: Number(order.discountCents || 0) / 100,
        grossAmount: Number(order.amountCents) / 100,
        platformFee: Number(order.platformFeeCents) / 100,
        affiliateCommission: affiliateAmountCents / 100,
        netCompanyAmount: companyAmountCents / 100,
      },
    };

    tx.create(saleRef, Object.fromEntries(Object.entries(sale).filter(([, value]) => value !== undefined)));

    const profileDeltas = new Map<string, { totalCents: number; roles: Record<string, number> }>();
    for (const participant of participants) {
      const current = profileDeltas.get(participant.userId) || { totalCents: 0, roles: {} };
      current.totalCents += participant.amountCents;
      current.roles[participant.role] = (current.roles[participant.role] || 0) + participant.amountCents;
      profileDeltas.set(participant.userId, current);

      const releaseId = `${orderId}_${participant.role}`;
      tx.create(db.collection('balance_releases').doc(releaseId), {
        id: releaseId,
        orderId,
        saleId: saleRef.id,
        paymentIntentId: paymentIntent.id,
        chargeId,
        userId: participant.userId,
        role: participant.role,
        stripeAccountId: participant.accountId,
        amountCents: participant.amountCents,
        amount: participant.amountCents / 100,
        status: 'pending',
        availableAt: participant.availableAt,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        environment: paymentIntent.livemode ? 'production' : 'development',
        ...(!paymentIntent.livemode ? { is_test: true } : {}),
      });
    }

    for (const [uid, delta] of profileDeltas) {
      const update: Record<string, any> = {
        pendingBalance: FieldValue.increment(delta.totalCents / 100),
        totalEarned: FieldValue.increment(delta.totalCents / 100),
        updatedAt: now.toISOString(),
      };
      for (const [role, cents] of Object.entries(delta.roles)) {
        update[rolePendingCentsField(role as PlatformRole)] = FieldValue.increment(cents);
      }
      tx.update(uniqueProfiles.get(uid)!, update);
    }

    tx.set(db.collection('platform_finances').doc('global_summary'), {
      totalPlatformRevenue: FieldValue.increment(Number(order.platformFeeCents || 0) / 100),
      totalCheckoutFees: FieldValue.increment(Number(order.platformFeeCents || 0) / 100),
      totalSalesProcessed: FieldValue.increment(1),
      lastUpdated: now.toISOString(),
    }, { merge: true });

    if (order.planId) {
      tx.set(db.collection('plans').doc(String(order.planId)), {
        totalSales: FieldValue.increment(1),
        totalSalesCount: FieldValue.increment(1),
        totalRevenue: FieldValue.increment(Number(order.productAmountCents || 0) / 100),
        ...(order.checkoutVariant && nextCustomCheckouts.length ? { customCheckouts: nextCustomCheckouts } : {}),
        updatedAt: now.toISOString(),
      }, { merge: true });
    }
    if (order.companyId) {
      tx.set(db.collection('companies').doc(String(order.companyId)), {
        totalSalesCount: FieldValue.increment(1),
        totalSalesVolume: FieldValue.increment(Number(order.productAmountCents || 0) / 100),
        grossRevenue: FieldValue.increment(Number(order.productAmountCents || 0) / 100),
        totalCheckoutFees: FieldValue.increment(Number(order.platformFeeCents || 0) / 100),
        totalAffiliateCommissions: FieldValue.increment(affiliateAmountCents / 100),
        netRevenue: FieldValue.increment(companyAmountCents / 100),
        updatedAt: now.toISOString(),
      }, { merge: true });
    }
    if (order.couponId) {
      tx.set(db.collection('coupons').doc(String(order.couponId)), {
        usedCount: FieldValue.increment(1),
        lastUsedAt: now.toISOString(),
        updatedAt: now.toISOString(),
      }, { merge: true });
    }

    if (order.affiliateId && order.planId && affiliateAmountCents > 0) {
      tx.set(db.collection('affiliations').doc(`aff_${order.affiliateId}_${order.planId}`), {
        salesCount: FieldValue.increment(1),
        totalEarned: FieldValue.increment(affiliateAmountCents / 100),
        updatedAt: now.toISOString(),
      }, { merge: true });
    }

    if (order.companyId && order.buyerEmail) {
      const emailHash = createHash('sha256').update(String(order.buyerEmail).toLowerCase()).digest('hex').slice(0, 20);
      const clientId = `${String(order.companyId).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 60)}_${emailHash}`;
      tx.set(db.collection('clients').doc(clientId), {
        id: clientId,
        companyId: order.companyId,
        name: order.buyerName,
        email: order.buyerEmail,
        total_spent: FieldValue.increment(Number(order.productAmountCents || 0) / 100),
        orders_count: FieldValue.increment(1),
        last_order_at: now.toISOString(),
        last_plan_name: order.planName,
        status: 'active',
        updatedAt: now.toISOString(),
        created_at: now.toISOString(),
        environment: paymentIntent.livemode ? 'production' : 'development',
        ...(!paymentIntent.livemode ? { is_test: true } : {}),
      }, { merge: true });
    }

    tx.set(orderRef, {
      status: 'paid',
      transferStatus: 'not_started',
      releaseStatus: 'pending',
      stripePaymentIntentId: paymentIntent.id,
      stripeChargeId: chargeId,
      paidAt: now.toISOString(),
      companyAvailableAt,
      affiliateAvailableAt,
      webhookEventId: event.id,
      updatedAt: now.toISOString(),
    }, { merge: true });
  });

  // Partner webhook delivery is best-effort and never blocks Stripe acknowledgement.
  try {
    const orderAfter = await orderRef.get();
    const orderData = orderAfter.data() || {};
    const settingsSnap = orderData.companyOwnerId
      ? await db.collection('partner_settings').doc(String(orderData.companyOwnerId)).get()
      : null;
    const settings = settingsSnap?.exists ? settingsSnap.data()! : null;
    if (settings?.webhookUrl && settings?.webhookSecret) {
      const payloadObject = {
        event: 'payment.succeeded',
        orderId,
        paymentIntentId: paymentIntent.id,
        planId: orderData.planId,
        companyId: orderData.companyId,
        buyerEmail: orderData.buyerEmail,
        amount: Number(orderData.amountCents || 0) / 100,
        productAmount: Number(orderData.productAmountCents || 0) / 100,
        discount: Number(orderData.discountCents || 0) / 100,
        couponCode: orderData.couponCode || null,
        affiliateCode: orderData.affiliateCode || null,
        paidAt: new Date().toISOString(),
      };
      const payload = JSON.stringify(payloadObject);
      const signature = createHmac('sha256', String(settings.webhookSecret)).update(payload).digest('hex');
      const deliveryRef = db.collection('partner_webhook_deliveries').doc(`${orderId}_payment_succeeded`);
      try {
        const webhookUrl = await assertSafeWebhookUrl(settings.webhookUrl);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        let response: Response;
        try {
          response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-leadspay-signature': signature,
              'x-leadspay-event': 'payment.succeeded',
            },
            body: payload,
            signal: controller.signal,
          });
        } finally {
          clearTimeout(timeout);
        }
        await deliveryRef.set({
          userId: orderData.companyOwnerId,
          companyId: orderData.companyId,
          event: 'payment.succeeded',
          orderId,
          status: response.ok ? 'delivered' : 'failed',
          responseStatus: response.status,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      } catch (deliveryError) {
        await deliveryRef.set({
          userId: orderData.companyOwnerId,
          companyId: orderData.companyId,
          event: 'payment.succeeded',
          orderId,
          status: 'failed',
          error: deliveryError instanceof Error ? deliveryError.message.slice(0, 250) : 'Falha de entrega',
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      }
    }
  } catch (deliverySetupError) {
    console.warn('[Partner webhook]', deliverySetupError instanceof Error ? deliverySetupError.message : 'Falha');
  }
}

async function updateOrderRisk(event: Stripe.Event, paymentIntentId: string | null, status: 'refunded' | 'disputed') {
  if (!paymentIntentId) return;
  const db = getServerAdminFirestore();
  const matches = await db.collection('stripe_checkout_orders').where('stripePaymentIntentId', '==', paymentIntentId).limit(1).get();
  if (matches.empty) return;
  const orderRef = matches.docs[0].ref;
  const orderId = matches.docs[0].id;
  const saleRef = db.collection('sales').doc(`stripe_${orderId}`);
  const releaseRefs = [
    db.collection('balance_releases').doc(`${orderId}_empresa`),
    db.collection('balance_releases').doc(`${orderId}_afiliado`),
  ];

  await db.runTransaction(async (tx) => {
    const orderSnap = await tx.get(orderRef);
    if (!orderSnap.exists) return;
    const saleSnap = await tx.get(saleRef);
    const releaseSnaps = [];
    for (const ref of releaseRefs) releaseSnaps.push(await tx.get(ref));

    const profiles = new Map<string, FirebaseFirestore.DocumentReference>();
    for (const snap of releaseSnaps) {
      if (snap.exists && snap.data()!.userId) profiles.set(String(snap.data()!.userId), db.collection('user_profiles').doc(String(snap.data()!.userId)));
    }
    const profileSnaps = new Map<string, FirebaseFirestore.DocumentSnapshot>();
    for (const [uid, ref] of profiles) profileSnaps.set(uid, await tx.get(ref));

    const adjustments = new Map<string, { pendingCents: number; availableCents: number; roles: Array<{ role: PlatformRole; pendingCents: number; availableCents: number }> }>();
    for (const snap of releaseSnaps) {
      if (!snap.exists) continue;
      const release = snap.data()!;
      if (release.status === 'reversed' || release.status === 'cancelled') continue;
      const uid = String(release.userId || '');
      const role = release.role as PlatformRole;
      const cents = Number(release.amountCents || 0);
      if (!uid || !Number.isSafeInteger(cents) || cents <= 0) continue;
      const current = adjustments.get(uid) || { pendingCents: 0, availableCents: 0, roles: [] };
      const wasPending = release.status === 'pending';
      current.pendingCents += wasPending ? cents : 0;
      current.availableCents += wasPending ? 0 : cents;
      current.roles.push({ role, pendingCents: wasPending ? cents : 0, availableCents: wasPending ? 0 : cents });
      adjustments.set(uid, current);
      tx.set(snap.ref, { status: 'reversed', riskStatus: status, reversedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, { merge: true });
    }

    for (const [uid, adjustment] of adjustments) {
      const snap = profileSnaps.get(uid);
      if (!snap?.exists) continue;
      const update: Record<string, any> = {
        pendingBalance: FieldValue.increment(-adjustment.pendingCents / 100),
        availableBalance: FieldValue.increment(-adjustment.availableCents / 100),
        updatedAt: new Date().toISOString(),
      };
      for (const roleDelta of adjustment.roles) {
        if (roleDelta.pendingCents) update[rolePendingCentsField(roleDelta.role)] = FieldValue.increment(-roleDelta.pendingCents);
        if (roleDelta.availableCents) update[roleAvailableCentsField(roleDelta.role)] = FieldValue.increment(-roleDelta.availableCents);
      }
      tx.update(profiles.get(uid)!, update);
    }

    tx.set(orderRef, {
      status,
      riskStatus: status,
      releaseStatus: 'cancelled',
      riskEventId: event.id,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    if (saleSnap.exists) {
      tx.set(saleRef, {
        status: status === 'refunded' ? 'Estornado' : 'Em análise',
        releaseStatus: 'cancelado',
        riskEventId: event.id,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    }
  });
}


function invoiceSubscriptionId(invoice: Stripe.Invoice): string {
  const raw = invoice as any;
  const direct = raw.subscription;
  if (typeof direct === 'string') return direct;
  if (direct?.id) return String(direct.id);

  const parentSubscription = raw.parent?.subscription_details?.subscription;
  if (typeof parentSubscription === 'string') return parentSubscription;
  if (parentSubscription?.id) return String(parentSubscription.id);

  return '';
}

async function syncProductSubscriptionStatus(
  subscription: Stripe.Subscription,
  forcedStatus?: string,
) {
  if (subscription.metadata?.leadspay_product_subscription !== '1') return false;

  const db = getServerAdminFirestore();
  const now = new Date().toISOString();
  const status = forcedStatus || subscription.status;
  const planId = String(subscription.metadata.plan_id || '');
  const companyId = String(subscription.metadata.company_id || '');
  const affiliateId = String(subscription.metadata.affiliate_id || '');

  await db.collection('product_subscriptions').doc(subscription.id).set({
    id: subscription.id,
    source: 'stripe',
    planId,
    companyId,
    companyOwnerId: String(subscription.metadata.company_owner_id || ''),
    affiliateId: affiliateId || null,
    affiliateCode: String(subscription.metadata.affiliate_code || '') || null,
    buyerName: String(subscription.metadata.buyer_name || ''),
    buyerEmail: String(subscription.metadata.buyer_email || ''),
    billingCycle: String(subscription.metadata.billing_cycle || 'MONTHLY'),
    recurringCommissionEnabled: subscription.metadata.recurring_commission_enabled === '1',
    affiliatePercentInitial: Number(subscription.metadata.affiliate_percent_initial || 0),
    affiliatePercentRecurring: Number(subscription.metadata.affiliate_percent_recurring || 0),
    status,
    active: status === 'active' || status === 'trialing',
    cancelAtPeriodEnd: Boolean((subscription as any).cancel_at_period_end),
    canceledAt: (subscription as any).canceled_at
      ? new Date(Number((subscription as any).canceled_at) * 1000).toISOString()
      : null,
    updatedAt: now,
  }, { merge: true });

  return true;
}

async function processProductSubscriptionInvoice(
  stripe: Stripe,
  event: Stripe.Event,
  invoice: Stripe.Invoice,
) {
  const subscriptionId = invoiceSubscriptionId(invoice);
  if (!subscriptionId) return false;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  if (subscription.metadata?.leadspay_product_subscription !== '1') return false;

  await syncProductSubscriptionStatus(subscription, 'active');

  const invoiceAny = invoice as any;
  if (invoiceAny.status !== 'paid' && Number(invoiceAny.amount_paid || 0) <= 0) {
    return true;
  }

  const metadata = subscription.metadata || {};
  const planId = String(metadata.plan_id || '');
  const companyId = String(metadata.company_id || '');
  const companyOwnerId = String(metadata.company_owner_id || '');
  const companyAccountId = String(metadata.company_account_id || '');
  const affiliateId = String(metadata.affiliate_id || '');
  const affiliateCode = String(metadata.affiliate_code || '');
  const affiliateAccountId = String(metadata.affiliate_account_id || '');
  const buyerName = String(metadata.buyer_name || '');
  const buyerEmail = String(metadata.buyer_email || '');
  const billingCycle = String(metadata.billing_cycle || 'MONTHLY');
  const recurringCommissionEnabled = metadata.recurring_commission_enabled === '1';
  const initialAffiliatePercent = Number(metadata.affiliate_percent_initial || 0);
  const recurringAffiliatePercent = recurringCommissionEnabled
    ? Number(metadata.affiliate_percent_recurring || 0)
    : 0;
  const configuredProductAmountCents = Number(metadata.product_amount_cents || 0);
  const configuredCheckoutFeeCents = Number(metadata.checkout_fee_cents || 99);
  const companyDelayDays = Number(metadata.company_release_delay_days || 15);
  const affiliateDelayDays = Number(metadata.affiliate_release_delay_days || 10);

  if (!planId || !companyId || !companyOwnerId || !companyAccountId) {
    throw new Error('Assinatura de produto sem metadados financeiros obrigatórios.');
  }

  const grossAmountCents = Number(invoiceAny.amount_paid || invoiceAny.total || 0);
  if (!Number.isSafeInteger(grossAmountCents) || grossAmountCents < 50) {
    throw new Error('Fatura recorrente paga com valor inválido.');
  }

  const checkoutFeeCents = Math.max(0, Math.min(configuredCheckoutFeeCents, grossAmountCents));
  const productAmountCents = Math.max(
    0,
    Math.min(
      configuredProductAmountCents > 0 ? configuredProductAmountCents : grossAmountCents - checkoutFeeCents,
      grossAmountCents - checkoutFeeCents,
    ),
  );

  const firstCharge = String(invoiceAny.billing_reason || '') === 'subscription_create';
  const affiliatePercent = affiliateId
    ? (firstCharge ? initialAffiliatePercent : recurringAffiliatePercent)
    : 0;

  const split = calculateSplit({
    grossAmountCents,
    affiliatePercent,
    platformFeeCents: checkoutFeeCents,
    commissionableAmountCents: productAmountCents,
  });

  if (split.companyAmountCents <= 0) {
    throw new Error('Fatura recorrente não cobre taxa e comissão configuradas.');
  }

  const db = getServerAdminFirestore();
  const invoiceId = String(invoice.id);
  const saleRef = db.collection('sales').doc(`stripe_sub_${invoiceId}`);
  const subscriptionRef = db.collection('product_subscriptions').doc(subscription.id);
  const planRef = db.collection('plans').doc(planId);
  const companyRef = db.collection('companies').doc(companyId);
  const companyProfileRef = db.collection('user_profiles').doc(companyOwnerId);
  const affiliateProfileRef = affiliateId
    ? db.collection('user_profiles').doc(affiliateId)
    : null;

  await db.runTransaction(async (tx) => {
    const saleSnap = await tx.get(saleRef);
    if (saleSnap.exists) return;

    const companyProfileSnap = await tx.get(companyProfileRef);
    if (!companyProfileSnap.exists) {
      throw new Error('Perfil financeiro da empresa não encontrado para renovação.');
    }

    let affiliateProfileSnap: FirebaseFirestore.DocumentSnapshot | null = null;
    if (split.affiliateAmountCents > 0 && affiliateProfileRef) {
      affiliateProfileSnap = await tx.get(affiliateProfileRef);
      if (!affiliateProfileSnap.exists) {
        throw new Error('Perfil financeiro do afiliado não encontrado para renovação.');
      }
    }

    const now = new Date();
    const companyAvailableAt = addDays(now, Number.isFinite(companyDelayDays) ? companyDelayDays : 15);
    const affiliateAvailableAt = split.affiliateAmountCents > 0
      ? addDays(now, Number.isFinite(affiliateDelayDays) ? affiliateDelayDays : 15)
      : null;

    const sale = {
      id: saleRef.id,
      source: 'stripe',
      saleKind: firstCharge ? 'subscription_initial' : 'subscription_renewal',
      recurring: true,
      stripeSubscriptionId: subscription.id,
      stripeInvoiceId: invoiceId,
      companyId,
      companyName: String((companyProfileSnap.data() as any)?.companyName || ''),
      companyOwnerId,
      companyStripeAccountId: companyAccountId,
      ...(affiliateId ? { affiliateId } : {}),
      ...(affiliateCode ? { affiliateCode } : {}),
      ...(affiliateAccountId ? { affiliateStripeAccountId: affiliateAccountId } : {}),
      platformId: planId,
      platformName: String((await tx.get(planRef)).data()?.name || 'Assinatura'),
      buyerName,
      customerName: buyerName,
      buyerEmail,
      buyerCompany: String((await tx.get(companyRef)).data()?.name || ''),
      amount: grossAmountCents / 100,
      commissionEarned: split.affiliateAmountCents / 100,
      checkoutFee: split.platformFeeCents / 100,
      netCompanyAmount: split.companyAmountCents / 100,
      method: 'Stripe • Assinatura',
      status: 'Aprovado',
      releaseStatus: 'pendente',
      availableAt: [companyAvailableAt, affiliateAvailableAt].filter(Boolean).sort().at(-1) || companyAvailableAt,
      companyAvailableAt,
      affiliateAvailableAt,
      billingCycle,
      billingReason: String(invoiceAny.billing_reason || ''),
      date: now.toISOString().slice(0, 10),
      time: now.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Sao_Paulo',
      }),
      createdAt: now.toISOString(),
      paidAt: now.toISOString(),
      environment: invoice.livemode ? 'production' : 'development',
      ...(!invoice.livemode ? { is_test: true } : {}),
      utmSource: metadata.utm_source || null,
      utmMedium: metadata.utm_medium || null,
      utmCampaign: metadata.utm_campaign || null,
      financialBreakdown: {
        grossAmount: grossAmountCents / 100,
        platformFee: split.platformFeeCents / 100,
        affiliateCommission: split.affiliateAmountCents / 100,
        netCompanyAmount: split.companyAmountCents / 100,
      },
    };

    tx.create(
      saleRef,
      Object.fromEntries(Object.entries(sale).filter(([, value]) => value !== undefined)),
    );

    const companyReleaseId = `sub_${invoiceId}_empresa`;
    tx.create(db.collection('balance_releases').doc(companyReleaseId), {
      id: companyReleaseId,
      subscriptionId: subscription.id,
      invoiceId,
      saleId: saleRef.id,
      userId: companyOwnerId,
      role: 'empresa',
      stripeAccountId: companyAccountId,
      amountCents: split.companyAmountCents,
      amount: split.companyAmountCents / 100,
      status: 'pending',
      availableAt: companyAvailableAt,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      environment: invoice.livemode ? 'production' : 'development',
      ...(!invoice.livemode ? { is_test: true } : {}),
    });

    tx.update(companyProfileRef, {
      pendingBalance: FieldValue.increment(split.companyAmountCents / 100),
      totalEarned: FieldValue.increment(split.companyAmountCents / 100),
      [rolePendingCentsField('empresa')]: FieldValue.increment(split.companyAmountCents),
      updatedAt: now.toISOString(),
    });

    if (split.affiliateAmountCents > 0 && affiliateProfileRef && affiliateProfileSnap?.exists) {
      const affiliateReleaseId = `sub_${invoiceId}_afiliado`;
      tx.create(db.collection('balance_releases').doc(affiliateReleaseId), {
        id: affiliateReleaseId,
        subscriptionId: subscription.id,
        invoiceId,
        saleId: saleRef.id,
        userId: affiliateId,
        role: 'afiliado',
        stripeAccountId: affiliateAccountId,
        amountCents: split.affiliateAmountCents,
        amount: split.affiliateAmountCents / 100,
        status: 'pending',
        availableAt: affiliateAvailableAt,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        is_test: !invoice.livemode,
        environment: invoice.livemode ? 'production' : 'development',
      });

      tx.update(affiliateProfileRef, {
        pendingBalance: FieldValue.increment(split.affiliateAmountCents / 100),
        totalEarned: FieldValue.increment(split.affiliateAmountCents / 100),
        [rolePendingCentsField('afiliado')]: FieldValue.increment(split.affiliateAmountCents),
        updatedAt: now.toISOString(),
      });

      tx.set(db.collection('affiliations').doc(`aff_${affiliateId}_${planId}`), {
        salesCount: FieldValue.increment(1),
        totalEarned: FieldValue.increment(split.affiliateAmountCents / 100),
        lastRecurringCommissionAt: now.toISOString(),
        updatedAt: now.toISOString(),
      }, { merge: true });
    }

    tx.set(db.collection('platform_finances').doc('global_summary'), {
      totalPlatformRevenue: FieldValue.increment(split.platformFeeCents / 100),
      totalCheckoutFees: FieldValue.increment(split.platformFeeCents / 100),
      totalSalesProcessed: FieldValue.increment(1),
      lastUpdated: now.toISOString(),
    }, { merge: true });

    tx.set(planRef, {
      totalSales: FieldValue.increment(1),
      totalSalesCount: FieldValue.increment(1),
      totalRevenue: FieldValue.increment(productAmountCents / 100),
      updatedAt: now.toISOString(),
    }, { merge: true });

    tx.set(companyRef, {
      totalSalesCount: FieldValue.increment(1),
      totalSalesVolume: FieldValue.increment(productAmountCents / 100),
      grossRevenue: FieldValue.increment(productAmountCents / 100),
      totalCheckoutFees: FieldValue.increment(split.platformFeeCents / 100),
      totalAffiliateCommissions: FieldValue.increment(split.affiliateAmountCents / 100),
      netRevenue: FieldValue.increment(split.companyAmountCents / 100),
      updatedAt: now.toISOString(),
    }, { merge: true });

    if (buyerEmail) {
      const emailHash = createHash('sha256').update(buyerEmail.toLowerCase()).digest('hex').slice(0, 20);
      const clientId = `${companyId.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 60)}_${emailHash}`;
      tx.set(db.collection('clients').doc(clientId), {
        id: clientId,
        companyId,
        name: buyerName,
        email: buyerEmail,
        total_spent: FieldValue.increment(productAmountCents / 100),
        orders_count: FieldValue.increment(1),
        last_order_at: now.toISOString(),
        last_plan_name: sale.platformName,
        status: 'active',
        subscriptionId: subscription.id,
        updatedAt: now.toISOString(),
        ...(firstCharge ? { createdAt: now.toISOString(), created_at: now.toISOString() } : {}),
      }, { merge: true });
    }

    tx.set(subscriptionRef, {
      id: subscription.id,
      planId,
      companyId,
      companyOwnerId,
      affiliateId: affiliateId || null,
      affiliateCode: affiliateCode || null,
      buyerName,
      buyerEmail,
      billingCycle,
      recurringCommissionEnabled,
      affiliatePercentInitial: initialAffiliatePercent,
      affiliatePercentRecurring: recurringAffiliatePercent,
      status: 'active',
      active: true,
      lastInvoiceId: invoiceId,
      lastPaidAt: now.toISOString(),
      updatedAt: now.toISOString(),
      ...(firstCharge ? { createdAt: now.toISOString() } : {}),
    }, { merge: true });
  });

  return true;
}

async function updateRecurringSaleRisk(
  event: Stripe.Event,
  invoiceId: string,
  status: 'refunded' | 'disputed',
) {
  if (!invoiceId) return false;

  const db = getServerAdminFirestore();
  const saleRef = db.collection('sales').doc(`stripe_sub_${invoiceId}`);
  const saleSnap = await saleRef.get();
  if (!saleSnap.exists) return false;

  const releaseRefs = [
    db.collection('balance_releases').doc(`sub_${invoiceId}_empresa`),
    db.collection('balance_releases').doc(`sub_${invoiceId}_afiliado`),
  ];

  await db.runTransaction(async (tx) => {
    const currentSale = await tx.get(saleRef);
    if (!currentSale.exists) return;
    if (currentSale.data()!.releaseStatus === 'cancelado') return;

    const releaseSnaps: FirebaseFirestore.DocumentSnapshot[] = [];
    for (const ref of releaseRefs) releaseSnaps.push(await tx.get(ref));

    const profileRefs = new Map<string, FirebaseFirestore.DocumentReference>();
    for (const snap of releaseSnaps) {
      if (snap.exists && snap.data()!.userId) {
        const uid = String(snap.data()!.userId);
        profileRefs.set(uid, db.collection('user_profiles').doc(uid));
      }
    }

    const profileSnaps = new Map<string, FirebaseFirestore.DocumentSnapshot>();
    for (const [uid, ref] of profileRefs) {
      profileSnaps.set(uid, await tx.get(ref));
    }

    const adjustments = new Map<
      string,
      {
        pendingCents: number;
        availableCents: number;
        roles: Array<{ role: PlatformRole; pendingCents: number; availableCents: number }>;
      }
    >();

    for (const snap of releaseSnaps) {
      if (!snap.exists) continue;
      const release = snap.data()!;
      if (release.status === 'reversed' || release.status === 'cancelled') continue;

      const uid = String(release.userId || '');
      const role = release.role as PlatformRole;
      const cents = Number(release.amountCents || 0);
      if (!uid || !Number.isSafeInteger(cents) || cents <= 0) continue;

      const current = adjustments.get(uid) || {
        pendingCents: 0,
        availableCents: 0,
        roles: [],
      };
      const wasPending = release.status === 'pending';

      current.pendingCents += wasPending ? cents : 0;
      current.availableCents += wasPending ? 0 : cents;
      current.roles.push({
        role,
        pendingCents: wasPending ? cents : 0,
        availableCents: wasPending ? 0 : cents,
      });
      adjustments.set(uid, current);

      tx.set(snap.ref, {
        status: 'reversed',
        riskStatus: status,
        reversedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    }

    for (const [uid, adjustment] of adjustments) {
      const profileSnap = profileSnaps.get(uid);
      const profileRef = profileRefs.get(uid);
      if (!profileSnap?.exists || !profileRef) continue;

      const update: Record<string, any> = {
        pendingBalance: FieldValue.increment(-adjustment.pendingCents / 100),
        availableBalance: FieldValue.increment(-adjustment.availableCents / 100),
        updatedAt: new Date().toISOString(),
      };

      for (const roleDelta of adjustment.roles) {
        if (roleDelta.pendingCents) {
          update[rolePendingCentsField(roleDelta.role)] = FieldValue.increment(-roleDelta.pendingCents);
        }
        if (roleDelta.availableCents) {
          update[roleAvailableCentsField(roleDelta.role)] = FieldValue.increment(-roleDelta.availableCents);
        }
      }

      tx.update(profileRef, update);
    }

    tx.set(saleRef, {
      status: status === 'refunded' ? 'Estornado' : 'Em análise',
      releaseStatus: 'cancelado',
      riskEventId: event.id,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  });

  return true;
}

async function applySubscription(stripe: Stripe, subscriptionId: string, forcedStatus?: string) {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const uid = String(subscription.metadata?.firebase_uid || '');
  const planId = String(subscription.metadata?.plan_id || '');
  const role = String(subscription.metadata?.role || '');
  const plan = getSubscriptionPlan(planId);
  if (!uid || !plan || role !== plan.role) return;

  const stripeStatus = forcedStatus || subscription.status;
  const active = stripeStatus === 'active' || stripeStatus === 'trialing';
  const pending = stripeStatus === 'past_due' || stripeStatus === 'incomplete';
  const planStatus = active ? 'active' : pending ? 'pending' : 'inactive';
  const now = new Date().toISOString();
  const update = {
    plan: active || pending ? plan.id : null,
    planStatus,
    subscriptionTier: active || pending ? plan.id : null,
    subscriptionName: active || pending ? plan.name : null,
    subscriptionPrice: active || pending ? plan.priceCents / 100 : 0,
    stripeSubscriptionId: subscription.id,
    stripeSubscriptionStatus: stripeStatus,
    subscriptionActiveAt: active ? now : null,
    updatedAt: now,
  };
  const db = getServerAdminFirestore();
  const batch = db.batch();
  batch.set(db.collection('user_profiles').doc(uid), update, { merge: true });
  batch.set(db.collection('users').doc(uid), update, { merge: true });
  await batch.commit();
}

async function processPayoutEvent(event: Stripe.Event, payout: Stripe.Payout) {
  const db = getServerAdminFirestore();
  const matches = await db.collection('withdrawals').where('stripePayoutId', '==', payout.id).limit(3).get();
  if (matches.empty) return;
  const batch = db.batch();
  for (const doc of matches.docs) {
    if (event.type === 'payout.paid') {
      batch.set(doc.ref, { status: 'COMPLETED', completedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, { merge: true });
    } else {
      batch.set(doc.ref, {
        status: 'PAYOUT_FAILED',
        failureReason: payout.failure_message || payout.failure_code || 'A Stripe não concluiu o payout bancário.',
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    }
  }
  await batch.commit();
}

async function processEvent(stripe: Stripe, event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'payment_intent.succeeded':
      await applyPaymentIntentPaid(stripe, event, event.data.object as Stripe.PaymentIntent);
      return;
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode === 'subscription' && session.subscription) {
        const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription.id;
        if (session.metadata?.leadspay_product_subscription === '1') {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          await syncProductSubscriptionStatus(subscription);
          const db = getServerAdminFirestore();
          const attemptId = String(session.client_reference_id || '');
          if (attemptId) {
            await db.collection('stripe_product_subscription_checkouts').doc(attemptId).set({
              status: 'completed',
              stripeSubscriptionId: subscriptionId,
              completedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }, { merge: true });
          }
          return;
        }
        await applySubscription(stripe, subscriptionId);
        const db = getServerAdminFirestore();
        await db.collection('stripe_subscription_checkouts').doc(session.id).set({
          status: 'completed',
          stripeSubscriptionId: subscriptionId,
          completedAt: new Date().toISOString(),
        }, { merge: true });
        return;
      }
      if (session.payment_intent) {
        const intentId = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent.id;
        const intent = await stripe.paymentIntents.retrieve(intentId);
        if (intent.status === 'succeeded') await applyPaymentIntentPaid(stripe, event, intent);
      }
      return;
    }
    case 'invoice.paid': {
      const invoice = event.data.object as Stripe.Invoice;
      if (await processProductSubscriptionInvoice(stripe, event, invoice)) return;
      const subscriptionId = invoiceSubscriptionId(invoice);
      if (subscriptionId) await applySubscription(stripe, subscriptionId, 'active');
      return;
    }
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = invoiceSubscriptionId(invoice);
      if (!subscriptionId) return;
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      if (await syncProductSubscriptionStatus(subscription, 'past_due')) return;
      await applySubscription(stripe, subscriptionId, 'past_due');
      return;
    }
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const forcedStatus = event.type.endsWith('.deleted') ? 'canceled' : subscription.status;
      if (await syncProductSubscriptionStatus(subscription, forcedStatus)) return;
      await applySubscription(stripe, subscription.id, forcedStatus);
      return;
    }
    case 'payment_intent.payment_failed':
    case 'payment_intent.canceled': {
      const intent = event.data.object as Stripe.PaymentIntent;
      const orderId = intent.metadata?.orderId;
      if (!orderId) return;
      const db = getServerAdminFirestore();
      const orderRef = db.collection('stripe_checkout_orders').doc(orderId);
      await db.runTransaction(async (tx) => {
        const snap = await tx.get(orderRef);
        if (!snap.exists) return;
        const order = snap.data()!;
        if (order.status === 'paid' || order.status === 'refunded' || order.status === 'disputed') return;
        if (order.stripePaymentIntentId && order.stripePaymentIntentId !== intent.id) return;
        tx.set(orderRef, {
          status: event.type.endsWith('.canceled') ? 'payment_canceled' : 'payment_failed',
          releaseStatus: 'cancelled',
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      });
      return;
    }
    case 'charge.refunded': {
      const charge = event.data.object as Stripe.Charge;
      const chargeAny = charge as any;
      const invoiceId = typeof chargeAny.invoice === 'string' ? chargeAny.invoice : chargeAny.invoice?.id || '';
      if (invoiceId && await updateRecurringSaleRisk(event, invoiceId, 'refunded')) return;
      const paymentIntentId = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id;
      await updateOrderRisk(event, paymentIntentId || null, 'refunded');
      return;
    }
    case 'charge.dispute.created': {
      const dispute = event.data.object as Stripe.Dispute;
      const chargeId = typeof dispute.charge === 'string' ? dispute.charge : dispute.charge.id;
      const charge = await stripe.charges.retrieve(chargeId);
      const chargeAny = charge as any;
      const invoiceId = typeof chargeAny.invoice === 'string' ? chargeAny.invoice : chargeAny.invoice?.id || '';
      if (invoiceId && await updateRecurringSaleRisk(event, invoiceId, 'disputed')) return;
      const paymentIntentId = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id;
      await updateOrderRisk(event, paymentIntentId || null, 'disputed');
      return;
    }
    case 'payout.paid':
    case 'payout.failed':
      await processPayoutEvent(event, event.data.object as Stripe.Payout);
      return;
    default:
      return;
  }
}

export const config = { api: { bodyParser: false } };

export default async function handler(req: RequestLike, res: ResponseLike) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });
  const signature = header(req, 'stripe-signature');
  if (!signature) return res.status(400).json({ error: 'Assinatura Stripe ausente.' });

  let eventRef: FirebaseFirestore.DocumentReference | undefined;
  let signatureValidated = false;
  try {
    const stripe = getStripeTestClient();
    const event = stripe.webhooks.constructEvent(await readRawBody(req), signature, getStripeWebhookSecret());
    signatureValidated = true;
    const db = getServerAdminFirestore();
    eventRef = db.collection('stripe_webhook_events').doc(event.id);
    const now = Date.now();
    const claim = await db.runTransaction(async (tx) => {
      const snap = await tx.get(eventRef!);
      if (snap.exists) {
        const saved = snap.data()!;
        if (saved.status === 'completed') return 'completed' as const;
        if (saved.status === 'processing' && now - Number(saved.startedAtMs || now) < 120_000) return 'processing' as const;
      }
      tx.set(eventRef!, { status: 'processing', type: event.type, startedAtMs: now, updatedAt: new Date(now).toISOString() }, { merge: true });
      return 'claimed' as const;
    });
    if (claim === 'completed') return res.status(200).json({ received: true, duplicate: true });
    if (claim === 'processing') {
      res.setHeader('Retry-After', '10');
      return res.status(503).json({ received: false, retry: true });
    }
    await processEvent(stripe, event);
    await eventRef.set({ status: 'completed', completedAt: new Date().toISOString() }, { merge: true });
    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('[Stripe webhook]', error instanceof Error ? error.message : 'Erro desconhecido');
    if (eventRef && signatureValidated) {
      try {
        await eventRef.set({ status: 'retry', retryAt: new Date().toISOString() }, { merge: true });
      } catch {
        console.error('[Stripe webhook] Não foi possível liberar claim para retry.');
      }
    }
    return res.status(signatureValidated ? 503 : 400).json({
      error: signatureValidated ? 'Evento válido, mas não processado; a Stripe pode tentar novamente.' : 'Webhook Stripe inválido.',
    });
  }
}
