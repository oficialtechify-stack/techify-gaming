import assert from 'node:assert/strict';
import test from 'node:test';
import { getSubscriptionPlan, profileHasPaidPlan, releaseDelayDays, WITHDRAWAL_FEE_CENTS } from './platformBilling';

test('plano pago ativo libera saldo em 10 dias', () => {
  assert.equal(profileHasPaidPlan({ planStatus: 'active', subscriptionTier: 'pro' }), true);
  assert.equal(releaseDelayDays({ planStatus: 'active', subscriptionTier: 'pro' }), 10);
});

test('plano gratuito ou inativo libera saldo em 10 dias', () => {
  assert.equal(releaseDelayDays({ planStatus: 'active', subscriptionTier: 'starter' }), 10);
  assert.equal(releaseDelayDays({ planStatus: 'inactive', subscriptionTier: 'scale' }), 10);
});

test('preços das assinaturas e taxa de saque são autoritativos no servidor', () => {
  assert.equal(getSubscriptionPlan('afiliado_vip')?.priceCents, 2990);
  assert.equal(getSubscriptionPlan('pro')?.priceCents, 4990);
  assert.equal(getSubscriptionPlan('scale')?.priceCents, 14990);
  assert.equal(WITHDRAWAL_FEE_CENTS, 200);
});
