import { timingSafeEqual } from 'node:crypto';
import { getServerAdminFirestore } from '../../lib/firebaseAdminServer.js';
import { getStripeTestClient } from '../../lib/stripeServer.js';

type Req = { method?: string; headers: Record<string, string | string[] | undefined> };
type Res = { setHeader(name: string, value: string): void; status(code: number): Res; json(body: unknown): unknown };
function authorized(header: string | string[] | undefined) {
  const secret = process.env.STRIPE_RELEASE_CRON_SECRET || process.env.CRON_SECRET || '';
  const token = typeof header === 'string' ? header.replace(/^Bearer\s+/i, '') : '';
  const a = Buffer.from(token);
  const b = Buffer.from(secret);
  return a.length > 0 && b.length > 0 && a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Conservative reconciliation: only definitively paid payouts are marked completed.
 * Unknown transfer outcomes and payout failures stay reserved for human review.
 * Neither funds nor Stripe credentials are exposed to the browser.
 */
export async function reconcileKnownStripePayouts() {
  const db = getServerAdminFirestore();
  const stripe = getStripeTestClient();
  const snap = await db.collection('withdrawals')
    .where('status', '==', 'PAYOUT_PENDING')
    .limit(100).get();
  let checked = 0;
  let completed = 0;
  let stillPending = 0;
  let requiresReview = 0;
  for (const doc of snap.docs) {
    const data = doc.data();
    const account = String(data.stripeAccountId || '');
    const payoutId = String(data.stripePayoutId || '');
    if (!account.startsWith('acct_') || !payoutId.startsWith('po_')) {
      requiresReview++;
      continue;
    }
    try {
      const payout = await stripe.payouts.retrieve(payoutId, {}, { stripeAccount: account });
      checked++;
      if (payout.status === 'paid') {
        await db.runTransaction(async (tx) => {
          const fresh = await tx.get(doc.ref);
          if (!fresh.exists || fresh.data()?.status !== 'PAYOUT_PENDING' ||
              fresh.data()?.stripePayoutId !== payoutId) return;
          tx.set(doc.ref, {
            status: 'COMPLETED',
            completedAt: new Date().toISOString(),
            needsStripeReconciliation: false,
            updatedAt: new Date().toISOString(),
          }, { merge: true });
          completed++;
        });
      } else if (payout.status === 'failed' || payout.status === 'canceled') {
        // Do not release internal funds: the associated transfer may still exist.
        await db.runTransaction(async (tx) => {
          const fresh = await tx.get(doc.ref);
          if (!fresh.exists || fresh.data()?.status !== 'PAYOUT_PENDING' ||
              fresh.data()?.stripePayoutId !== payoutId) return;
          tx.set(doc.ref, {
            status: 'MANUAL_REVIEW_REQUIRED',
            needsStripeReconciliation: true,
            stripePayoutStatus: payout.status,
            updatedAt: new Date().toISOString(),
          }, { merge: true });
          requiresReview++;
        });
      } else {
        stillPending++;
      }
    } catch (error) {
      console.error('[Payout reconciliation]', doc.id, error instanceof Error ? error.message : 'unavailable');
      requiresReview++;
    }
  }
  return { checked, completed, stillPending, requiresReview };
}

export default async function handler(req: Req, res: Res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });
  if (!authorized(req.headers.authorization)) return res.status(401).json({ error: 'Não autorizado.' });
  try {
    return res.status(200).json({ ok: true, ...await reconcileKnownStripePayouts() });
  } catch (error) {
    console.error('[Payout reconciliation cron]', error instanceof Error ? error.message : 'unavailable');
    return res.status(503).json({ error: 'Reconciliação indisponível.' });
  }
}
