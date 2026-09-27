import { getServerAdminFirestore } from '../../lib/firebaseAdminServer';
import { getStripeTestClient } from '../../lib/stripeServer';

type RequestLike = { method?: string; query?: Record<string, string | string[] | undefined> };
type ResponseLike = { setHeader(name: string, value: string): void; status(code: number): ResponseLike; json(body: unknown): unknown };

export default async function handler(req: RequestLike, res: ResponseLike) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido.' });
  const paymentIntentId = typeof req.query?.payment_intent === 'string' ? req.query.payment_intent : '';
  if (!/^pi_[A-Za-z0-9]+$/.test(paymentIntentId)) return res.status(400).json({ error: 'Referência de pagamento inválida.' });

  try {
    const stripe = getStripeTestClient();
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    const orderId = paymentIntent.metadata?.orderId;
    if (!orderId) return res.status(404).json({ status: 'unavailable' });
    const db = getServerAdminFirestore();
    const orderSnap = await db.collection('stripe_checkout_orders').doc(orderId).get();
    if (!orderSnap.exists) return res.status(404).json({ status: 'unavailable' });
    const order = orderSnap.data()!;
    if (order.stripePaymentIntentId !== paymentIntent.id || paymentIntent.currency !== 'brl') return res.status(404).json({ status: 'unavailable' });
    const paid = paymentIntent.status === 'succeeded' && order.status === 'paid';
    return res.status(200).json({
      status: paid ? 'paid' : (paymentIntent.status === 'canceled' || order.status === 'payment_failed' || order.status === 'payment_canceled' ? 'failed' : 'processing'),
      orderId,
      planId: String(order.planId || ''),
      planName: String(order.planName || ''),
      amount: paid ? Number(order.amountCents || 0) / 100 : undefined,
    });
  } catch (error) {
    console.error('[Stripe status]', error instanceof Error ? error.message : 'Falha desconhecida');
    return res.status(503).json({ status: 'processing' });
  }
}
