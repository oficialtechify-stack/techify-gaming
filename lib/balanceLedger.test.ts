import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateUserLedgerBalances } from './balanceLedger';

function mockDb(releases: Record<string, unknown>[], withdrawals: Record<string, unknown>[]) {
  return {
    collection(name: string) {
      return {
        where(field: string, op: string, value: unknown) {
          assert.equal(field, 'userId');
          assert.equal(op, '==');
          assert.equal(value, 'affiliate_1');
          return {
            async get() {
              const items = name === 'balance_releases' ? releases : name === 'withdrawals' ? withdrawals : [];
              return { docs: items.map((data) => ({ data: () => data })) };
            },
          };
        },
      };
    },
  } as any;
}

test('comissões pendentes não são disponibilizadas para saque', async () => {
  const balances = await calculateUserLedgerBalances(mockDb([
    { userId: 'affiliate_1', role: 'afiliado', saleId: 's1', status: 'pending', amountCents: 2500 },
  ], []), 'affiliate_1');
  assert.equal(balances.afiliado.pendingCents, 2500);
  assert.equal(balances.afiliado.availableCents, 0);
});

test('não mistura saldo de afiliado e empresa', async () => {
  const balances = await calculateUserLedgerBalances(mockDb([
    { role: 'afiliado', saleId: 's1', status: 'available', amountCents: 3000 },
    { role: 'empresa', saleId: 's2', status: 'available', amountCents: 9000 },
  ], [{ role: 'afiliado', status: 'COMPLETED', amountCents: 1000 }]), 'affiliate_1');
  assert.equal(balances.afiliado.availableCents, 2000);
  assert.equal(balances.empresa.availableCents, 9000);
});

test('não contabiliza liberações sem venda real ou canceladas', async () => {
  const balances = await calculateUserLedgerBalances(mockDb([
    { role: 'afiliado', status: 'available', amountCents: 900000 },
    { role: 'afiliado', saleId: 's1', status: 'cancelled', amountCents: 5000 },
    { role: 'afiliado', saleId: 's2', status: 'available', amountCents: 1500 },
  ], []), 'affiliate_1');
  assert.equal(balances.afiliado.availableCents, 1500);
});

test('saque falho e estornado não consomem novamente o saldo', async () => {
  const balances = await calculateUserLedgerBalances(mockDb([
    { role: 'afiliado', saleId: 's1', status: 'available', amountCents: 5000 },
  ], [
    { role: 'afiliado', status: 'FAILED', amountCents: 2000 },
    { role: 'afiliado', status: 'COMPLETED', amountCents: 1000 },
  ]), 'affiliate_1');
  assert.equal(balances.afiliado.availableCents, 4000);
});
