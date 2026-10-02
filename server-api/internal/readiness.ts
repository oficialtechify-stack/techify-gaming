import { getServerAdminFirestore, ADMIN_PROJECT_ID } from '../../lib/firebaseAdminServer.js';

type Req = { method?: string };
type Res = { setHeader(name: string, value: string): void; status(code: number): Res; json(body: unknown): unknown };

async function restStatus(collectionName: string): Promise<number> {
  const key = String(process.env.VITE_FIREBASE_API_KEY || 'AIzaSyBZY9m-CFG7-l9H1bptd4eGcd6IL_aEWIM').trim();
  const url = `https://firestore.googleapis.com/v1/projects/${ADMIN_PROJECT_ID}/databases/(default)/documents/${collectionName}?pageSize=1&key=${encodeURIComponent(key)}`;
  const response = await fetch(url, { headers: { 'Cache-Control': 'no-store' } });
  return response.status;
}

export default async function handler(req: Req, res: Res) {
  res.setHeader('Cache-Control', 'no-store');
  if (process.env.VERCEL_ENV !== 'preview') return res.status(404).json({ error: 'Not found' });
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido.' });

  try {
    const db = getServerAdminFirestore();
    const now = new Date().toISOString();
    const [plans, releasesIndex, ordersIndex, publicPlansStatus, anonymousCouponsStatus] = await Promise.all([
      db.collection('plans').limit(1).get(),
      db.collection('balance_releases').where('status', '==', 'pending').where('availableAt', '<=', now).limit(1).get(),
      db.collection('stripe_checkout_orders').where('status', '==', 'paid').where('transferStatus', '==', 'not_started').where('availableAt', '<=', now).limit(1).get(),
      restStatus('plans'),
      restStatus('coupons'),
    ]);

    const rulesMatchExpected = publicPlansStatus === 200 && anonymousCouponsStatus === 403;
    return res.status(rulesMatchExpected ? 200 : 409).json({
      ok: rulesMatchExpected,
      firebaseProject: ADMIN_PROJECT_ID,
      adminFirestore: true,
      samplePlanReadable: plans.size >= 0,
      compositeIndexes: {
        balanceReleases: true,
        stripeOrders: true,
      },
      deployedRules: {
        publicPlansStatus,
        anonymousCouponsStatus,
        expected: { plans: 200, coupons: 403 },
        matchExpected: rulesMatchExpected,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha desconhecida';
    console.error('[Internal Firebase readiness]', message);
    return res.status(503).json({ ok: false, error: message.slice(0, 500) });
  }
}
