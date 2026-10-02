import fs from 'node:fs/promises';
import path from 'node:path';
import { getServerAdminApp, getServerAdminFirestore, ADMIN_PROJECT_ID } from '../../lib/firebaseAdminServer.js';

type Req = { method?: string };
type Res = { setHeader(name: string, value: string): void; status(code: number): Res; json(body: unknown): unknown };

async function restStatus(collectionName: string): Promise<number> {
  const key = String(process.env.VITE_FIREBASE_API_KEY || 'AIzaSyBZY9m-CFG7-l9H1bptd4eGcd6IL_aEWIM').trim();
  const url = `https://firestore.googleapis.com/v1/projects/${ADMIN_PROJECT_ID}/databases/(default)/documents/${collectionName}?pageSize=1&key=${encodeURIComponent(key)}`;
  const response = await fetch(url, { headers: { 'Cache-Control': 'no-store' } });
  return response.status;
}

async function indexState(collectionGroup: string, expectedFields: string[]) {
  const credential = getServerAdminApp().options.credential;
  if (!credential) return { found: false, state: 'NO_CREDENTIAL' };
  const token = await credential.getAccessToken();
  const parent = `projects/${ADMIN_PROJECT_ID}/databases/(default)/collectionGroups/${encodeURIComponent(collectionGroup)}`;
  const response = await fetch(`https://firestore.googleapis.com/v1/${parent}/indexes`, {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
  if (!response.ok) return { found: false, state: `HTTP_${response.status}` };
  const body:any = await response.json();
  const indexes = Array.isArray(body.indexes) ? body.indexes : [];
  const match = indexes.find((index:any) => {
    const fields = (index.fields || []).map((field:any) => field.fieldPath).filter((x:string) => x !== '__name__');
    return expectedFields.length === fields.length && expectedFields.every((field, i) => fields[i] === field);
  });
  return match ? { found: true, state: match.state || 'UNKNOWN', name: match.name } : { found: false, state: 'MISSING' };
}

async function buildGateResult() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), 'public', 'firebase-deploy-gate.json'), 'utf8');
    const data = JSON.parse(raw);
    return {
      ok: data.ok === true,
      error: data.error || null,
      at: data.at || null,
      indexes: Array.isArray(data.indexes) ? data.indexes : null,
      rules: data.rules || null,
    };
  } catch {
    return { ok: false, error: 'Build gate result unavailable.', at: null };
  }
}

export default async function handler(req: Req, res: Res) {
  res.setHeader('Cache-Control', 'no-store');
  if (process.env.VERCEL_ENV !== 'preview') return res.status(404).json({ error: 'Not found' });
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido.' });

  try {
    const db = getServerAdminFirestore();
    await db.collection('plans').limit(1).get();

    const [publicPlansStatus, anonymousCouponsStatus, releaseIndex, orderIndex, buildGate] = await Promise.all([
      restStatus('plans'),
      restStatus('coupons'),
      indexState('balance_releases', ['status','availableAt']),
      indexState('stripe_checkout_orders', ['status','transferStatus','availableAt']),
      buildGateResult(),
    ]);

    const queryChecks:any = {};
    try {
      await db.collection('balance_releases').where('status','==','pending').where('availableAt','<=',new Date().toISOString()).limit(1).get();
      queryChecks.balanceReleases = { ok: true };
    } catch (error) {
      queryChecks.balanceReleases = { ok: false, error: error instanceof Error ? error.message.slice(0,300) : 'failed' };
    }
    try {
      await db.collection('stripe_checkout_orders').where('status','==','paid').where('transferStatus','==','not_started').where('availableAt','<=',new Date().toISOString()).limit(1).get();
      queryChecks.stripeOrders = { ok: true };
    } catch (error) {
      queryChecks.stripeOrders = { ok: false, error: error instanceof Error ? error.message.slice(0,300) : 'failed' };
    }

    const rulesMatchExpected = publicPlansStatus === 200 && anonymousCouponsStatus === 403;
    const indexesReady = queryChecks.balanceReleases.ok && queryChecks.stripeOrders.ok;
    const ok = rulesMatchExpected && indexesReady;

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
      indexes: {
        balanceReleases: releaseIndex,
        stripeOrders: orderIndex,
        queryChecks,
        ready: indexesReady,
      },
      buildGate,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha desconhecida';
    return res.status(503).json({ ok:false, error:message.slice(0,500) });
  }
}
