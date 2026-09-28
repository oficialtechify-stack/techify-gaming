import Stripe from 'stripe';
import { timingSafeEqual } from 'node:crypto';
import { getServerAdminFirestore } from '../../lib/firebaseAdminServer.js';
import { getStripeTestClient } from '../../lib/stripeServer.js';

type RequestLike = { method?: string; headers: Record<string, string | string[] | undefined> };
type ResponseLike = { setHeader(name: string, value: string): void; status(code: number): ResponseLike; json(body: unknown): unknown };

type Recipient = { key: 'company' | 'affiliate'; accountId: string; amountCents: number };

function authorized(headerValue: string | string[] | undefined): boolean {
  const expected = process.env.STRIPE_RELEASE_CRON_SECRET || process.env.CRON_SECRET || '';
  const actual = typeof headerValue === 'string' ? headerValue.replace(/^Bearer\s+/i, '') : '';
  if (!expected || !actual) return false;
  const a = Buffer.from(actual);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function transferOnce(stripe: Stripe, params: { orderId: string; chargeId: string; group: string; recipient: Recipient }): Promise<string> {
  const { orderId, chargeId, group, recipient } = params;
  const prior = await stripe.transfers.list({ transfer_group: group, destination: recipient.accountId, limit: 100 });
  const match = prior.data.find((transfer) => transfer.source_transaction === chargeId && transfer.amount === recipient.amountCents);
  if (match) return match.id;
  const transfer = await stripe.transfers.create({
    amount: recipient.amountCents,
    currency: 'brl',
    destination: recipient.accountId,
    source_transaction: chargeId,
    transfer_group: group,
    metadata: { leadspay_order_id: orderId, recipient_role: recipient.key },
  }, { idempotencyKey: `leadspay-transfer-${orderId}-${recipient.key}` });
  return transfer.id;
}

export default async function handler(req: RequestLike, res: ResponseLike) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST' && req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido.' });
  if (!authorized(req.headers.authorization)) return res.status(401).json({ error: 'Não autorizado.' });

  try {
    const stripe = getStripeTestClient();
    const db = getServerAdminFirestore();
    const now = new Date();
    const due = await db.collection('stripe_checkout_orders')
      .where('status', '==', 'paid')
      .where('transferStatus', 'in', ['scheduled', 'retry'])
      .where('availableAt', '<=', now.toISOString())
      .limit(25).get();
    let released = 0;
    let failed = 0;

    for (const doc of due.docs) {
      const orderId = doc.id;
      const orderRef = doc.ref;
      const claimAt = Date.now();
      const claimed = await db.runTransaction(async (tx) => {
        const snap = await tx.get(orderRef);
        if (!snap.exists) return false;
        const order = snap.data()!;
        if (order.status !== 'paid' || !['scheduled', 'retry'].includes(order.transferStatus) || order.riskStatus) return false;
        if (order.transferStatus === 'processing' && claimAt - Number(order.transferLockAtMs || claimAt) < 120_000) return false;
        tx.set(orderRef, { transferStatus: 'processing', transferLockAtMs: claimAt, updatedAt: now.toISOString() }, { merge: true });
        return true;
      });
      if (!claimed) continue;

      try {
        const orderSnap = await orderRef.get();
        const order = orderSnap.data()!;
        if (!order.stripeChargeId || !order.companyAccountId) throw new Error('Faltam referências Stripe do pedido.');
        const grossAmountCents = Number(order.amountCents);
        const platformFeeCents = Number(order.platformFeeCents);
        const companyAmountCents = Number(order.companyAmountCents);
        const affiliateAmountCents = Number(order.affiliateAmountCents || 0);
        if (![grossAmountCents, platformFeeCents, companyAmountCents, affiliateAmountCents].every(Number.isSafeInteger)) {
          throw new Error('Valores do pedido não são centavos inteiros seguros.');
        }
        if (grossAmountCents <= 0 || platformFeeCents < 0 || companyAmountCents <= 0 || affiliateAmountCents < 0 || companyAmountCents + affiliateAmountCents + platformFeeCents !== grossAmountCents) {
          throw new Error('A divisão do pedido não fecha com o valor cobrado.');
        }
        if (affiliateAmountCents > 0 && !order.affiliateAccountId) {
          throw new Error('Pedido com comissão sem conta Stripe do afiliado.');
        }
        const recipients: Recipient[] = [
          { key: 'company', accountId: String(order.companyAccountId), amountCents: companyAmountCents },
          ...(affiliateAmountCents > 0 && order.affiliateAccountId
            ? [{ key: 'affiliate' as const, accountId: String(order.affiliateAccountId), amountCents: Number(order.affiliateAmountCents) }]
            : []),
        ];
        const transferIds: Record<string, string> = {};
        for (const recipient of recipients) {
          const latest = await orderRef.get();
          const latestOrder = latest.data();
          if (!latest.exists || latestOrder?.status !== 'paid' || latestOrder?.riskStatus || latestOrder?.transferStatus !== 'processing') {
            throw new Error('Pedido mudou para revisão ou risco antes do repasse.');
          }
          if (!Number.isSafeInteger(recipient.amountCents) || recipient.amountCents <= 0) throw new Error('Valor de repasse inválido.');
          transferIds[recipient.key] = await transferOnce(stripe, { orderId, chargeId: String(order.stripeChargeId), group: `LP_${orderId}`, recipient });
          await orderRef.set({ transferIds, updatedAt: new Date().toISOString() }, { merge: true });
        }
        const completedAt = new Date().toISOString();
        const completed = await db.runTransaction(async (tx) => {
          const latest = await tx.get(orderRef);
          if (!latest.exists) return false;
          const current = latest.data()!;
          if (current.status !== 'paid' || current.riskStatus || current.transferStatus !== 'processing') {
            tx.set(orderRef, { transferStatus: 'manual_review', updatedAt: completedAt }, { merge: true });
            return false;
          }
          tx.set(orderRef, { transferStatus: 'completed', transfersCompletedAt: completedAt, updatedAt: completedAt }, { merge: true });
          tx.set(db.collection('sales').doc(`stripe_${orderId}`), { releaseStatus: 'disponivel', releasedAt: completedAt, stripeTransferIds: transferIds }, { merge: true });
          return true;
        });
        if (completed) released += 1;
        else failed += 1;
      } catch (error) {
        console.error('[Stripe release]', orderId, error instanceof Error ? error.message : 'Falha desconhecida');
        await db.runTransaction(async (tx) => {
          const latest = await tx.get(orderRef);
          if (!latest.exists) return;
          const current = latest.data()!;
          if (current.status === 'paid' && !current.riskStatus && current.transferStatus === 'processing') {
            tx.set(orderRef, { transferStatus: 'retry', transferError: error instanceof Error ? error.message.slice(0, 300) : 'Falha desconhecida', updatedAt: new Date().toISOString() }, { merge: true });
          }
        });
        failed += 1;
      }
    }
    return res.status(200).json({ ok: true, examined: due.size, released, failed });
  } catch (error) {
    console.error('[Stripe release cron]', error instanceof Error ? error.message : 'Falha desconhecida');
    return res.status(503).json({ error: 'Não foi possível executar a liberação Stripe.' });
  }
}
