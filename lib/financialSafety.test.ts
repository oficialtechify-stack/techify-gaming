import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const withdrawal = readFileSync(new URL('../server-api/stripe/withdrawal.ts', import.meta.url), 'utf8');
const release = readFileSync(new URL('../server-api/crons/stripe-releases.ts', import.meta.url), 'utf8');

test('reserva um saque com transação Firestore antes de chamar Stripe', () => {
  assert.ok(withdrawal.indexOf('const reserved = await db.runTransaction') >= 0);
  assert.ok(withdrawal.indexOf('const reserved = await db.runTransaction') < withdrawal.indexOf('stripe.transfers.create({'));
  assert.match(withdrawal, /tx\.create\(withdrawalRef,/);
});

test('falha de rede no payout mantém dinheiro reservado, sem devolução indevida', () => {
  const segment = withdrawal.split('} catch (payoutError) {')[1]?.split('const completedAt')[0] || '';
  assert.match(segment, /MANUAL_REVIEW_REQUIRED/);
  assert.match(segment, /needsStripeReconciliation: true/);
  assert.doesNotMatch(segment, /createReversal|currentRoleAvailable \+ amountCents/);
});

test('falha de transferência não devolve saldo sem verificar a Stripe', () => {
  const segment = withdrawal.split('} catch (error) {')[1]?.split('let payoutId')[0] || '';
  assert.match(segment, /MANUAL_REVIEW_REQUIRED/);
  assert.doesNotMatch(segment, /\[availableField\]:.*\+ amountCents/);
});

test('liberações exigem prazo vencido e status pendente na transação', () => {
  assert.match(release, /release\.status !== 'pending'/);
  assert.match(release, /availableAtMs > Date\.now\(\)/);
  assert.match(release, /where\('status', '==', 'pending'\)/);
});

const reconciliation = readFileSync(new URL('../server-api/crons/stripe-payout-reconcile.ts', import.meta.url), 'utf8');

test('reconciliação confere Stripe e não cria saques adicionais', () => {
  assert.match(reconciliation, /stripe\.payouts\.retrieve/);
  assert.match(reconciliation, /stripe\.transfers\.retrieve/);
  assert.match(reconciliation, /MANUAL_REVIEW_REQUIRED/);
  assert.doesNotMatch(reconciliation, /stripe\.payouts\.create|stripe\.transfers\.create\(/);
});
