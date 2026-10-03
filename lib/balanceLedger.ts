import type { PlatformRole } from './platformBilling.js';

export type RoleLedgerBalance = {
  pendingCents: number;
  releasedGrossCents: number;
  withdrawnCents: number;
  availableCents: number;
};

export type UserLedgerBalances = Record<PlatformRole, RoleLedgerBalance>;

const EMPTY = (): RoleLedgerBalance => ({
  pendingCents: 0,
  releasedGrossCents: 0,
  withdrawnCents: 0,
  availableCents: 0,
});

const NON_CONSUMING_WITHDRAWAL_STATUSES = new Set([
  'failed',
  'recusado',
  'rejected',
  'cancelled',
  'canceled',
  'estornado',
]);

function isProductionMoney(data: Record<string, any>): boolean {
  if (process.env.VERCEL_ENV !== 'production') return true;
  return data.is_test !== true && String(data.environment || '').toLowerCase() !== 'development';
}

function amountCentsFromWithdrawal(data: Record<string, any>): number {
  const cents = Number(data.amountCents);
  if (Number.isSafeInteger(cents) && cents > 0) return cents;

  const amount = Number(data.requestedAmount ?? data.amount ?? 0);
  const converted = Math.round(amount * 100);
  return Number.isSafeInteger(converted) && converted > 0 ? converted : 0;
}

export async function calculateUserLedgerBalances(
  db: FirebaseFirestore.Firestore,
  userId: string,
): Promise<UserLedgerBalances> {
  const balances: UserLedgerBalances = {
    empresa: EMPTY(),
    afiliado: EMPTY(),
  };

  const [releaseSnap, withdrawalSnap] = await Promise.all([
    db.collection('balance_releases').where('userId', '==', userId).get(),
    db.collection('withdrawals').where('userId', '==', userId).get(),
  ]);

  for (const doc of releaseSnap.docs) {
    const data = doc.data() as Record<string, any>;
    if (!isProductionMoney(data)) continue;

    const role = data.role as PlatformRole;
    if (role !== 'empresa' && role !== 'afiliado') continue;

    // Liberação financeira válida precisa nascer de uma venda criada pelo backend Stripe.
    if (!String(data.saleId || '').trim()) continue;

    const cents = Number(data.amountCents || 0);
    if (!Number.isSafeInteger(cents) || cents <= 0) continue;

    const status = String(data.status || '').toLowerCase();
    if (status === 'pending') balances[role].pendingCents += cents;
    if (status === 'available') balances[role].releasedGrossCents += cents;
  }

  for (const doc of withdrawalSnap.docs) {
    const data = doc.data() as Record<string, any>;
    if (!isProductionMoney(data)) continue;

    const role = data.role as PlatformRole;
    if (role !== 'empresa' && role !== 'afiliado') continue;

    const status = String(data.status || '').trim().toLowerCase();
    if (NON_CONSUMING_WITHDRAWAL_STATUSES.has(status)) continue;

    balances[role].withdrawnCents += amountCentsFromWithdrawal(data);
  }

  for (const role of ['empresa', 'afiliado'] as PlatformRole[]) {
    balances[role].availableCents = Math.max(
      0,
      balances[role].releasedGrossCents - balances[role].withdrawnCents,
    );
  }

  return balances;
}
