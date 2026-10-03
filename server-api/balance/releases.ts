import { getServerAdminFirestore, verifyFirebaseIdentity } from '../../lib/firebaseAdminServer.js';
import { releaseDelayDays, type PlatformRole } from '../../lib/platformBilling.js';
import { releaseStripeBalanceDocument } from '../crons/stripe-releases.js';
import { calculateUserLedgerBalances } from '../../lib/balanceLedger.js';

type Req = {
  method?: string;
  query?: Record<string, string | string[] | undefined>;
  headers: Record<string, string | string[] | undefined>;
};
type Res = {
  setHeader(name: string, value: string): void;
  status(code: number): Res;
  json(body: unknown): unknown;
};

function roleFromQuery(value: unknown): PlatformRole | null {
  return value === 'empresa' || value === 'afiliado' ? value : null;
}

export default async function handler(req: Req, res: Res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido.' });

  try {
    const identity = await verifyFirebaseIdentity(
      typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined,
    );
    const role = roleFromQuery(typeof req.query?.role === 'string' ? req.query.role : '');
    if (!role) return res.status(400).json({ error: 'Papel financeiro inválido.' });

    const db = getServerAdminFirestore();
    const profileRef = db.collection('user_profiles').doc(identity.uid);
    const profileSnap = await profileRef.get();
    if (!profileSnap.exists) return res.status(404).json({ error: 'Perfil financeiro não encontrado.' });

    const profile = profileSnap.data() as Record<string, any>;
    const hasRole =
      role === 'empresa'
        ? profile.hasCompanyProfile === true || profile.accountType === 'empresa' || profile.accountType === 'ambos'
        : profile.hasAffiliateProfile === true || profile.accountType === 'afiliado' || profile.accountType === 'ambos';

    if (!hasRole) return res.status(403).json({ error: 'Este perfil não possui o saldo solicitado.' });

    // Query only by userId to avoid composite-index dependency. Role/status are filtered in memory.
    let snapshot = await db.collection('balance_releases')
      .where('userId', '==', identity.uid)
      .get();

    const nowMs = Date.now();
    const due = snapshot.docs.filter((doc) => {
      const data = doc.data();
      const availableAtMs = Date.parse(String(data.availableAt || ''));
      return (
        data.role === role &&
        data.status === 'pending' &&
        Number.isFinite(availableAtMs) &&
        availableAtMs <= nowMs
      );
    });

    // Self-heal due balances when the user opens the financial area.
    // releaseStripeBalanceDocument revalidates status and balances transactionally.
    for (const doc of due.slice(0, 50)) {
      try {
        await releaseStripeBalanceDocument(db, doc.ref);
      } catch (error) {
        console.error('[Balance schedule release]', doc.id, error instanceof Error ? error.message : 'Falha');
      }
    }

    if (due.length) {
      snapshot = await db.collection('balance_releases')
        .where('userId', '==', identity.uid)
        .get();
    }

    const releases = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() } as Record<string, any>))
      .filter((item) => item.role === role)
      .sort((a, b) => Date.parse(String(a.availableAt || '')) - Date.parse(String(b.availableAt || '')));

    const visibleReleases = process.env.VERCEL_ENV === 'production'
      ? releases.filter((item) => item.is_test !== true && String(item.environment || '').toLowerCase() !== 'development')
      : releases;

    const pending = visibleReleases.filter((item) => item.status === 'pending');
    const ledger = await calculateUserLedgerBalances(db, identity.uid);
    const roleLedger = ledger[role];
    const nextRelease = pending.find((item) => Number.isFinite(Date.parse(String(item.availableAt || '')))) || null;

    return res.status(200).json({
      success: true,
      role,
      policyDays: releaseDelayDays(profile),
      pendingAmountCents: roleLedger.pendingCents,
      availableAmountCents: roleLedger.availableCents,
      releasedGrossCents: roleLedger.releasedGrossCents,
      withdrawnCents: roleLedger.withdrawnCents,
      nextReleaseAt: nextRelease?.availableAt || null,
      releases: visibleReleases.slice(0, 200).map((item) => ({
        id: item.id,
        saleId: item.saleId || null,
        orderId: item.orderId || null,
        subscriptionId: item.subscriptionId || null,
        invoiceId: item.invoiceId || null,
        amountCents: Number(item.amountCents || 0),
        amount: Number(item.amount || Number(item.amountCents || 0) / 100),
        status: String(item.status || ''),
        availableAt: item.availableAt || null,
        releasedAt: item.releasedAt || null,
        createdAt: item.createdAt || null,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha';
    console.error('[Balance schedule]', message);
    if (/Firebase ID token|token inválido|auth\/id-token/i.test(message)) {
      return res.status(401).json({ error: 'Sua sessão expirou. Entre novamente.' });
    }
    return res.status(503).json({ error: 'Não foi possível carregar as datas de liberação agora.' });
  }
}
