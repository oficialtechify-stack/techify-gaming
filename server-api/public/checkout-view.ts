import { getServerAdminFirestore } from '../../lib/firebaseAdminServer.js';

type RequestLike = {
  method?: string;
  body?: unknown;
  headers: Record<string, string | string[] | undefined>;
};
type ResponseLike = {
  setHeader(name: string, value: string): void;
  status(code: number): ResponseLike;
  json(body: unknown): unknown;
  end(): unknown;
};

export default async function handler(req: RequestLike, res: ResponseLike) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });

  try {
    const body = req.body && typeof req.body === 'object' ? req.body as Record<string, unknown> : {};
    const planId = String(body.planId || '').trim();
    const variant = String(body.variant || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 100);

    if (!/^[A-Za-z0-9_-]{1,150}$/.test(planId)) {
      return res.status(400).json({ error: 'Produto inválido.' });
    }

    const db = getServerAdminFirestore();
    const planRef = db.collection('plans').doc(planId);

    const updated = await db.runTransaction(async (tx) => {
      const snap = await tx.get(planRef);
      if (!snap.exists) return false;
      const plan = snap.data()! as Record<string, any>;
      if (
        plan.active === false ||
        String(plan.status || '').toLowerCase() !== 'ativo' ||
        plan.archived === true ||
        plan.isArchived === true
      ) return false;

      const checkouts = Array.isArray(plan.customCheckouts)
        ? plan.customCheckouts as Array<Record<string, any>>
        : [];
      if (!checkouts.length) return false;

      const targetIndex = variant
        ? checkouts.findIndex((item) => String(item.checkoutSlug || '').toLowerCase() === variant)
        : checkouts.findIndex((item) => item.isDefault === true);
      if (targetIndex < 0) return false;

      const next = checkouts.map((item, index) =>
        index === targetIndex
          ? { ...item, visitsCount: Number(item.visitsCount || 0) + 1 }
          : item
      );
      tx.set(planRef, { customCheckouts: next, updatedAt: new Date().toISOString() }, { merge: true });
      return true;
    });

    return res.status(200).json({ success: true, counted: updated });
  } catch (error) {
    console.warn('[checkout-view]', error);
    return res.status(200).json({ success: true, counted: false });
  }
}
