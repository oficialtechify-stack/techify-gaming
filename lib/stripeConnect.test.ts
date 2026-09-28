import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateSplit, toCents } from './stripeSplit';
import { getLeadspayBaseUrl, getStripeTestClient, getStripeWebhookSecret, resetStripeClientForTests } from './stripeServer';

test('divide em centavos e conserva exatamente o bruto entre três partes', () => {
  const split = calculateSplit({ grossAmountCents: 10000, affiliatePercent: 20, platformFeeCents: 99 });
  assert.deepEqual(split, {
    grossAmountCents: 10000,
    platformFeeCents: 99,
    affiliateAmountCents: 2000,
    companyAmountCents: 7901,
  });
  assert.equal(split.platformFeeCents + split.affiliateAmountCents + split.companyAmountCents, 10000);
});

test('permite venda direta sem afiliado', () => {
  assert.equal(calculateSplit({ grossAmountCents: 1000, affiliatePercent: 0 }).companyAmountCents, 901);
});

test('arredonda comissão uma única vez em centavos', () => {
  assert.equal(calculateSplit({ grossAmountCents: 1999, affiliatePercent: 12.5 }).affiliateAmountCents, 250);
});

test('calcula comissão somente sobre o preço do produto, sem comissão sobre taxa LeadsPay', () => {
  const split = calculateSplit({ grossAmountCents: 10099, commissionableAmountCents: 10000, affiliatePercent: 20, platformFeeCents: 99 });
  assert.equal(split.affiliateAmountCents, 2000);
  assert.equal(split.companyAmountCents, 8000);
});

test('rejeita fee/comissão acima do valor da venda', () => {
  assert.throws(() => calculateSplit({ grossAmountCents: 100, affiliatePercent: 0, platformFeeCents: 101 }), /não cobre/);
});

test('rejeita comissão inválida e valores fora do limite', () => {
  assert.throws(() => calculateSplit({ grossAmountCents: 49, affiliatePercent: 10 }), /mínimo/);
  assert.throws(() => calculateSplit({ grossAmountCents: 100, affiliatePercent: 101 }), /Percentual/);
  assert.equal(toCents('19.99'), 1999);
  assert.throws(() => toCents(NaN), /Valor inválido/);
});

test('não inicializa Stripe sem segredo nem aceita chave live', () => {
  const old = process.env.STRIPE_SECRET_KEY;
  const oldTest = process.env.STRIPE_TEST_SECRET_KEY;
  resetStripeClientForTests();
  delete process.env.STRIPE_SECRET_KEY;
  delete process.env.STRIPE_TEST_SECRET_KEY;
  assert.throws(() => getStripeTestClient(), /configure STRIPE_TEST_SECRET_KEY/);
  process.env.STRIPE_TEST_SECRET_KEY = 'sk_live_should_never_be_used';
  assert.throws(() => getStripeTestClient(), /somente chaves sk_test_/);
  if (old === undefined) delete process.env.STRIPE_SECRET_KEY;
  else process.env.STRIPE_SECRET_KEY = old;
  if (oldTest === undefined) delete process.env.STRIPE_TEST_SECRET_KEY;
  else process.env.STRIPE_TEST_SECRET_KEY = oldTest;
  resetStripeClientForTests();
});

test('webhook e endereço base são obrigatoriamente configurados', () => {
  const oldSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const oldBase = process.env.LEADSPAY_BASE_URL;
  const oldVercelUrl = process.env.VERCEL_URL;
  const oldVercelEnv = process.env.VERCEL_ENV;
  delete process.env.STRIPE_WEBHOOK_SECRET;
  delete process.env.LEADSPAY_BASE_URL;
  delete process.env.VERCEL_URL;
  delete process.env.VERCEL_ENV;
  assert.throws(() => getStripeWebhookSecret(), /não configurado/);
  assert.throws(() => getLeadspayBaseUrl(), /não está configurada/);
  if (oldSecret !== undefined) process.env.STRIPE_WEBHOOK_SECRET = oldSecret;
  if (oldBase !== undefined) process.env.LEADSPAY_BASE_URL = oldBase;
  if (oldVercelUrl !== undefined) process.env.VERCEL_URL = oldVercelUrl;
  if (oldVercelEnv !== undefined) process.env.VERCEL_ENV = oldVercelEnv;
});

test('Preview usa URL da implantação atual em vez de URL base antiga', () => {
  const oldBase = process.env.LEADSPAY_BASE_URL;
  const oldVercelUrl = process.env.VERCEL_URL;
  const oldVercelEnv = process.env.VERCEL_ENV;
  process.env.LEADSPAY_BASE_URL = 'https://deploy-antigo.example';
  process.env.VERCEL_URL = 'leadspay-preview-atual.vercel.app';
  process.env.VERCEL_ENV = 'preview';
  assert.equal(getLeadspayBaseUrl(), 'https://leadspay-preview-atual.vercel.app');
  if (oldBase !== undefined) process.env.LEADSPAY_BASE_URL = oldBase;
  else delete process.env.LEADSPAY_BASE_URL;
  if (oldVercelUrl !== undefined) process.env.VERCEL_URL = oldVercelUrl;
  else delete process.env.VERCEL_URL;
  if (oldVercelEnv !== undefined) process.env.VERCEL_ENV = oldVercelEnv;
  else delete process.env.VERCEL_ENV;
});
