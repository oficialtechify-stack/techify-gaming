import { timingSafeEqual } from 'node:crypto';
import { getServerAdminFirestore } from '../../lib/firebaseAdminServer.js';
import { roleAvailableCentsField, rolePendingCentsField, type PlatformRole } from '../../lib/platformBilling.js';

type RequestLike = { method?: string; headers: Record<string, string | string[] | undefined> };
type ResponseLike = { setHeader(name: string, value: string): void; status(code: number): ResponseLike; json(body: unknown): unknown };

function authorized(headerValue: string | string[] | undefined): boolean {
  const expected = process.env.STRIPE_RELEASE_CRON_SECRET || process.env.CRON_SECRET || '';
  const actual = typeof headerValue === 'string' ? headerValue.replace(/^Bearer\s+/i, '') : '';
  if (!expected || !actual) return false;
  const a = Buffer.from(actual);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function releaseDueStripeBalances(
  db = getServerAdminFirestore(),
  now = new Date(),
): Promise<{ examined: number; released: number; failed: number }> {
  const due = await db.collection('balance_releases')
    .where('status', '==', 'pending')
    .where('availableAt', '<=', now.toISOString())
    .limit(50)
    .get();

  let released = 0;
  let failed = 0;

  for (const releaseDoc of due.docs) {
    try {
      const moved = await db.runTransaction(async (tx) => {
        const latest = await tx.get(releaseDoc.ref);
        if (!latest.exists) return false;
        const release = latest.data()!;
        if (release.status !== 'pending') return false;

        const role = release.role as PlatformRole;
        if (role !== 'empresa' && role !== 'afiliado') throw new Error('Papel de saldo inválido.');
        const amountCents = Number(release.amountCents);
        if (!Number.isSafeInteger(amountCents) || amountCents <= 0) throw new Error('Valor de liberação inválido.');

        const profileRef = db.collection('user_profiles').doc(String(release.userId || ''));
        const profileSnap = await tx.get(profileRef);
        if (!profileSnap.exists) throw new Error('Perfil financeiro não encontrado.');
        const profile = profileSnap.data()!;
        const pendingKey = rolePendingCentsField(role);
        const availableKey = roleAvailableCentsField(role);
        const rolePending = Number(profile[pendingKey] || 0);
        const roleAvailable = Number(profile[availableKey] || 0);
        if (!Number.isSafeInteger(rolePending) || rolePending < amountCents) {
          throw new Error('Saldo pendente inconsistente.');
        }

        const pendingBalance = Math.max(0, Number(profile.pendingBalance || 0) - amountCents / 100);
        const availableBalance = Number(profile.availableBalance || 0) + amountCents / 100;
        const releasedAt = new Date().toISOString();

        tx.set(profileRef, {
          [pendingKey]: rolePending - amountCents,
          [availableKey]: roleAvailable + amountCents,
          pendingBalance: Number(pendingBalance.toFixed(2)),
          availableBalance: Number(availableBalance.toFixed(2)),
          updatedAt: releasedAt,
        }, { merge: true });
        tx.set(releaseDoc.ref, {
          status: 'available',
          releasedAt,
          updatedAt: releasedAt,
        }, { merge: true });

        if (release.saleId) {
          tx.set(db.collection('sales').doc(String(release.saleId)), {
            releaseStatus: 'disponivel',
            releasedAt,
          }, { merge: true });
        }
        return true;
      });
      if (moved) released += 1;
    } catch (error) {
      failed += 1;
      console.error('[Balance release]', releaseDoc.id, error instanceof Error ? error.message : 'Falha desconhecida');
    }
  }

  return { examined: due.size, released, failed };
}

export default async function handler(req: RequestLike, res: ResponseLike) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });
  if (!authorized(req.headers.authorization)) return res.status(401).json({ error: 'Não autorizado.' });

  try {
    const result = await releaseDueStripeBalances();
    return res.status(200).json({ ok: true, ...result });
  } catch (error) {
    console.error('[Balance release cron]', error instanceof Error ? error.message : 'Falha desconhecida');
    return res.status(503).json({ error: 'Não foi possível liberar os saldos agora.' });
  }
}
