import { getServerAdminApp, getServerAdminFirestore, ADMIN_PROJECT_ID } from '../../lib/firebaseAdminServer.js';

type Req = { method?: string };
type Res = { setHeader(name: string, value: string): void; status(code: number): Res; json(body: unknown): unknown };

async function restStatus(collectionName: string): Promise<number> {
  const key = String(process.env.VITE_FIREBASE_API_KEY || 'AIzaSyBZY9m-CFG7-l9H1bptd4eGcd6IL_aEWIM').trim();
  const url = `https://firestore.googleapis.com/v1/projects/${ADMIN_PROJECT_ID}/databases/(default)/documents/${collectionName}?pageSize=1&key=${encodeURIComponent(key)}`;
  const response = await fetch(url, { headers: { 'Cache-Control': 'no-store' } });
  return response.status;
}

async function buildGateResult() {
  try {
    const snap = await getServerAdminFirestore().collection('_internal').doc('firebase_deploy_gate').get();
    if (!snap.exists) return { ok:false, error:'Build gate result unavailable.', at:null };
    const data:any = snap.data() || {};
    return {
      ok: data.ok === true,
      error: data.error || null,
      at: data.updatedAt || null,
      indexes: Array.isArray(data.indexes) ? data.indexes : null,
      rules: data.rules || null,
    };
  } catch {
    return { ok:false, error:'Build gate result unavailable.', at:null };
  }
}

export default async function handler(req: Req, res: Res) {
  res.setHeader('Cache-Control', 'no-store');
  if (process.env.VERCEL_ENV !== 'preview') return res.status(404).json({ error: 'Not found' });
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido.' });

  try {
    const db = getServerAdminFirestore();
    await db.collection('plans').limit(1).get();

    const [publicPlansStatus, anonymousCouponsStatus, buildGate] = await Promise.all([
      restStatus('plans'),
      restStatus('coupons'),
      buildGateResult(),
    ]);

    let releaseQuery:any = { ok:true };
    try {
      await db.collection('balance_releases')
        .where('availableAt','<=',new Date().toISOString())
        .orderBy('availableAt','asc')
        .limit(1)
        .get();
    } catch (error) {
      releaseQuery = { ok:false, error:error instanceof Error ? error.message.slice(0,300) : 'failed' };
    }

    const rulesMatchExpected = publicPlansStatus === 200 && anonymousCouponsStatus === 403;
    const ok = rulesMatchExpected && releaseQuery.ok;

    return res.status(ok ? 200 : 409).json({
      ok,
      firebaseProject: ADMIN_PROJECT_ID,
      adminFirestore: true,
      deployedRules: {
        publicPlansStatus,
        anonymousCouponsStatus,
        expected: { plans: 200, coupons: 403 },
        matchExpected: rulesMatchExpected,
      },
      releaseQuery,
      buildGate,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha desconhecida';
    return res.status(503).json({ ok:false, error:message.slice(0,500) });
  }
}
