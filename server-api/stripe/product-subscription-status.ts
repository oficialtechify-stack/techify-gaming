import { getServerAdminFirestore } from '../../lib/firebaseAdminServer.js';
import { getStripeTestClient } from '../../lib/stripeServer.js';

type RequestLike = {
  method?: string;
  query?: Record<string, string | string[] | undefined>;
};
type ResponseLike = {
  setHeader(name: string, value: string): void;
  status(code: number): ResponseLike;
  json(body: unknown): unknown;
};

export default async function handler(req: RequestLike, res: ResponseLike) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido.' });

  const sessionId = typeof req.query?.session_id === 'string'
    ? req.query.session_id.trim()
    : '';

  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId)) {
    return res.status(400).json({ error: 'Referência de assinatura inválida.' });
  }

  try {
    const stripe = getStripeTestClient();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.mode !== 'subscription' || session.metadata?.leadspay_product_subscription !== '1') {
      return res.status(404).json({ status: 'unavailable' });
    }

    const subscriptionId = typeof session.subscription === 'string'
      ? session.subscription
      : session.subscription?.id || '';

    if (!subscriptionId) {
      return res.status(200).json({
        status: session.status === 'expired' ? 'failed' : 'processing',
      });
    }

    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const subscriptionActive = ['active', 'trialing'].includes(subscription.status);
    const paid = subscriptionActive && session.payment_status === 'paid';

    if (!paid) {
      const failed =
        session.status === 'expired' ||
        ['canceled', 'unpaid', 'incomplete_expired'].includes(subscription.status);

      return res.status(200).json({
        status: failed ? 'failed' : 'processing',
      });
    }

    const planId = String(subscription.metadata?.plan_id || session.metadata?.plan_id || '');
    const db = getServerAdminFirestore();
    const [planSnap, deliverySnap] = await Promise.all([
      planId ? db.collection('plans').doc(planId).get() : Promise.resolve(null),
      planId ? db.collection('plan_delivery').doc(planId).get() : Promise.resolve(null),
    ]);

    const plan = planSnap && planSnap.exists ? planSnap.data()! : null;
    const delivery = deliverySnap && deliverySnap.exists
      ? deliverySnap.data()!
      : plan
        ? {
            deliveryType: plan.deliveryType || 'redirect',
            deliveryUrl: plan.deliveryUrl || plan.thankYouPageUrl || '',
            deliveryInstructions: plan.deliveryInstructions || '',
          }
        : null;

    return res.status(200).json({
      status: 'paid',
      subscriptionId,
      planId,
      planName: String(plan?.name || ''),
      buyerName: String(subscription.metadata?.buyer_name || session.metadata?.buyer_name || ''),
      buyerEmail: String(subscription.metadata?.buyer_email || session.customer_details?.email || ''),
      amount: Number(subscription.metadata?.product_amount_cents || 0) / 100,
      billingCycle: String(subscription.metadata?.billing_cycle || 'MONTHLY'),
      delivery: delivery
        ? {
            deliveryType: String(delivery.deliveryType || 'redirect'),
            deliveryUrl: String(delivery.deliveryUrl || ''),
            deliveryInstructions: String(delivery.deliveryInstructions || ''),
          }
        : undefined,
    });
  } catch (error) {
    console.error('[Product subscription status]', error instanceof Error ? error.message : 'Falha');
    return res.status(503).json({ status: 'processing' });
  }
}
