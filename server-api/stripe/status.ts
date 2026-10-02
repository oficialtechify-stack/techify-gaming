import { getServerAdminFirestore } from '../../lib/firebaseAdminServer.js';
import { getStripeTestClient } from '../../lib/stripeServer.js';

type RequestLike = { method?: string; query?: Record<string, string | string[] | undefined> };
type ResponseLike = {
  setHeader(name: string, value: string): void;
  status(code: number): ResponseLike;
  json(body: unknown): unknown;
};

export default async function handler(req: RequestLike, res: ResponseLike) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.query?.retired === '1') {
    return res.status(410).json({
      error: true,
      code: 'PAYMENT_PROVIDER_MIGRATED',
      message: 'Este endpoint legado foi aposentado. Use os endpoints Stripe atuais da LeadsPay.',
    });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  const paymentIntentId =
    typeof req.query?.payment_intent === 'string' ? req.query.payment_intent : '';

  if (!/^pi_[A-Za-z0-9]+$/.test(paymentIntentId)) {
    return res.status(400).json({ error: 'Referência de pagamento inválida.' });
  }

  try {
    const stripe = getStripeTestClient();
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    const orderId = paymentIntent.metadata?.orderId;

    if (!orderId) {
      return res.status(404).json({ status: 'unavailable' });
    }

    const db = getServerAdminFirestore();
    const orderSnap = await db.collection('stripe_checkout_orders').doc(orderId).get();

    if (!orderSnap.exists) {
      return res.status(404).json({ status: 'unavailable' });
    }

    const order = orderSnap.data()!;
    if (
      order.stripePaymentIntentId !== paymentIntent.id ||
      paymentIntent.currency !== 'brl'
    ) {
      return res.status(404).json({ status: 'unavailable' });
    }

    const paid = paymentIntent.status === 'succeeded' && order.status === 'paid';
    const failed =
      paymentIntent.status === 'canceled' ||
      order.status === 'payment_failed' ||
      order.status === 'payment_canceled';

    let delivery: Record<string, string> | undefined;

    if (paid && order.planId) {
      const deliverySnap = await db.collection('plan_delivery').doc(String(order.planId)).get();
      if (deliverySnap.exists) {
        const data = deliverySnap.data()!;
        delivery = {
          deliveryType: String(data.deliveryType || 'redirect'),
          deliveryUrl: String(data.deliveryUrl || ''),
          deliveryInstructions: String(data.deliveryInstructions || ''),
        };
      } else {
        // Compatibilidade com ofertas antigas criadas antes da separação da configuração privada.
        const planSnap = await db.collection('plans').doc(String(order.planId)).get();
        if (planSnap.exists) {
          const plan = planSnap.data()!;
          delivery = {
            deliveryType: String(plan.deliveryType || 'redirect'),
            deliveryUrl: String(plan.deliveryUrl || plan.thankYouPageUrl || ''),
            deliveryInstructions: String(plan.deliveryInstructions || ''),
          };
        }
      }
    }

    return res.status(200).json({
      status: paid ? 'paid' : failed ? 'failed' : 'processing',
      orderId,
      planId: String(order.planId || ''),
      planName: String(order.planName || ''),
      amount: paid ? Number(order.amountCents || 0) / 100 : undefined,
      buyerName: paid ? String(order.buyerName || '') : undefined,
      buyerEmail: paid ? String(order.buyerEmail || '') : undefined,
      delivery: paid ? delivery : undefined,
    });
  } catch (error) {
    console.error('[Stripe status]', error instanceof Error ? error.message : 'Falha desconhecida');
    return res.status(503).json({ status: 'processing' });
  }
}
