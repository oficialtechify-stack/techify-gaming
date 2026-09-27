import Stripe from 'stripe';
import { getServerAdminFirestore } from '../../lib/firebaseAdminServer';
import { getStripeTestClient, getStripeWebhookSecret } from '../../lib/stripeServer';

type RequestLike = AsyncIterable<Buffer | string> & { method?: string; body?: unknown; headers: Record<string, string | string[] | undefined> };
type ResponseLike = { setHeader(name: string, value: string): void; status(code: number): ResponseLike; json(body: unknown): unknown; end(): unknown };

async function readRawBody(req: RequestLike): Promise<Buffer> {
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

async function applyPaymentIntentPaid(stripe: Stripe, event: Stripe.Event, eventIntent: Stripe.PaymentIntent) {
  const orderId = eventIntent.metadata?.orderId;
  if (!orderId) throw new Error('PaymentIntent sem referência interna.');
  const paymentIntent = await stripe.paymentIntents.retrieve(eventIntent.id, { expand: ['latest_charge'] });
  if (paymentIntent.status !== 'succeeded') throw new Error('Pagamento ainda não confirmado pela Stripe.');
  if (paymentIntent.currency !== 'brl' || paymentIntent.metadata.orderId !== orderId) throw new Error('PaymentIntent não corresponde à cobrança BRL esperada.');
  const latestCharge = paymentIntent.latest_charge;
  const charge = typeof latestCharge === 'string' ? await stripe.charges.retrieve(latestCharge) : latestCharge;
  const chargeId = charge?.id;
  if (!chargeId) throw new Error('A cobrança Stripe confirmada não retornou charge ID.');

  const db = getServerAdminFirestore();
  const orderRef = db.collection('stripe_checkout_orders').doc(orderId);
  const salesRef = db.collection('sales').doc(`stripe_${orderId}`);
  await db.runTransaction(async (tx) => {
    const orderSnap = await tx.get(orderRef);
    if (!orderSnap.exists) throw new Error('Pedido Stripe não encontrado.');
    const order = orderSnap.data()!;
    if (order.stripePaymentIntentId && order.stripePaymentIntentId !== paymentIntent.id) throw new Error('PaymentIntent não corresponde ao pedido.');
    if (Number(order.amountCents) !== paymentIntent.amount || String(order.transferGroup || `LP_${orderId}`) !== String(paymentIntent.transfer_group || '')) throw new Error('Valor ou grupo de transferência não corresponde ao pedido.');
    if (order.status === 'refunded' || order.status === 'disputed') return;
    const saleSnap = await tx.get(salesRef);
    if (saleSnap.exists) return;
    const now = new Date();
    const availableAt = new Date(now.getTime() + 9 * 24 * 60 * 60 * 1000);
    const sale = {
      id: salesRef.id,
      source: 'stripe',
      stripeOrderId: orderId,
      stripePaymentIntentId: paymentIntent.id,
      stripeChargeId: chargeId,
      transferGroup: `LP_${orderId}`,
      companyId: order.companyId,
      companyName: order.companyName,
      companyOwnerId: order.companyOwnerId,
      companyStripeAccountId: order.companyAccountId,
      affiliateId: order.affiliateId || undefined,
      affiliateName: order.affiliateName || undefined,
      affiliateCode: order.affiliateCode || undefined,
      affiliateStripeAccountId: order.affiliateAccountId || undefined,
      platformId: order.planId,
      platformName: order.planName,
      buyerName: order.buyerName,
      customerName: order.buyerName,
      buyerEmail: order.buyerEmail,
      buyerCompany: order.companyName,
      amount: Number(order.amountCents) / 100,
      commissionEarned: Number(order.affiliateAmountCents) / 100,
      checkoutFee: Number(order.platformFeeCents) / 100,
      netCompanyAmount: Number(order.companyAmountCents) / 100,
      method: charge.payment_method_details?.type === 'pix' ? 'PIX' : (charge.payment_method_details?.type || 'Stripe'),
      status: 'Aprovado',
      releaseStatus: 'pendente',
      availableAt: availableAt.toISOString(),
      date: now.toISOString().slice(0, 10),
      time: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }),
      createdAt: now.toISOString(),
      paidAt: now.toISOString(),
      is_test: true,
      environment: 'development',
      financialBreakdown: {
        grossAmount: Number(order.amountCents) / 100,
        platformFee: Number(order.platformFeeCents) / 100,
        affiliateCommission: Number(order.affiliateAmountCents) / 100,
        netCompanyAmount: Number(order.companyAmountCents) / 100,
      },
    };
    tx.create(salesRef, sale);
    tx.set(orderRef, {
      status: 'paid',
      transferStatus: 'scheduled',
      stripePaymentIntentId: paymentIntent.id,
      stripeChargeId: chargeId,
      paidAt: now.toISOString(),
      availableAt: availableAt.toISOString(),
      webhookEventId: event.id,
      updatedAt: now.toISOString(),
    }, { merge: true });
  });
}

async function updateOrderRisk(event: Stripe.Event, paymentIntentId: string | null, status: 'refunded' | 'disputed') {
  if (!paymentIntentId) return;
  const db = getServerAdminFirestore();
  const matches = await db.collection('stripe_checkout_orders').where('stripePaymentIntentId', '==', paymentIntentId).limit(1).get();
  if (matches.empty) return;
  const orderRef = matches.docs[0].ref;
  await db.runTransaction(async (tx) => {
    const orderSnap = await tx.get(orderRef);
    if (!orderSnap.exists) return;
    const order = orderSnap.data()!;
    const wasReleased = order.transferStatus === 'completed';
    tx.set(orderRef, {
      status,
      riskStatus: status,
      transferStatus: wasReleased ? 'manual_review' : 'cancelled',
      riskEventId: event.id,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    const saleRef = db.collection('sales').doc(`stripe_${orderSnap.id}`);
    const saleSnap = await tx.get(saleRef);
    if (saleSnap.exists) tx.set(saleRef, { status: status === 'refunded' ? 'Estornado' : 'Em análise', releaseStatus: 'cancelado', riskEventId: event.id }, { merge: true });
  });
}

async function processEvent(stripe: Stripe, event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'payment_intent.succeeded':
      await applyPaymentIntentPaid(stripe, event, event.data.object as Stripe.PaymentIntent);
      return;
    case 'payment_intent.payment_failed':
    case 'payment_intent.canceled': {
      const intent = event.data.object as Stripe.PaymentIntent;
      const orderId = intent.metadata?.orderId;
      if (!orderId) return;
      const db = getServerAdminFirestore();
      await db.collection('stripe_checkout_orders').doc(orderId).set({
        status: event.type.endsWith('.canceled') ? 'payment_canceled' : 'payment_failed',
        transferStatus: 'cancelled',
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      return;
    }
    case 'charge.refunded':
      {
        const charge = event.data.object as Stripe.Charge;
        const paymentIntentId = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id;
        await updateOrderRisk(event, paymentIntentId || null, 'refunded');
      }
      return;
    case 'charge.dispute.created':
      {
        const dispute = event.data.object as Stripe.Dispute;
        const chargeId = typeof dispute.charge === 'string' ? dispute.charge : dispute.charge.id;
        const charge = await stripe.charges.retrieve(chargeId);
        const paymentIntentId = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id;
        await updateOrderRisk(event, paymentIntentId || null, 'disputed');
      }
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

  try {
    const stripe = getStripeTestClient();
    const event = stripe.webhooks.constructEvent(await readRawBody(req), signature, getStripeWebhookSecret());
    const db = getServerAdminFirestore();
    const eventRef = db.collection('stripe_webhook_events').doc(event.id);
    const now = Date.now();
    const claim = await db.runTransaction(async (tx) => {
      const snap = await tx.get(eventRef);
      if (snap.exists) {
        const saved = snap.data()!;
        if (saved.status === 'completed') return false;
        if (saved.status === 'processing' && now - Number(saved.startedAtMs || now) < 120_000) return false;
      }
      tx.set(eventRef, { status: 'processing', type: event.type, startedAtMs: now, updatedAt: new Date(now).toISOString() }, { merge: true });
      return true;
    });
    if (!claim) return res.status(200).json({ received: true, duplicate: true });
    await processEvent(stripe, event);
    await eventRef.set({ status: 'completed', completedAt: new Date().toISOString() }, { merge: true });
    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('[Stripe webhook]', error instanceof Error ? error.message : 'Erro desconhecido');
    return res.status(400).json({ error: 'Webhook Stripe inválido ou não processado.' });
  }
}
