import assert from 'node:assert/strict';
import test from 'node:test';
import { DocumentReference } from 'firebase-admin/firestore';
import checkout from '../server-api/stripe/checkout';
import { getStripeTestClient, resetStripeClientForTests } from './stripeServer';

for (const failedWrite of [1, 2]) {
  test(`checkout não entrega client secret quando a gravação ${failedWrite} falha`, async (t) => {
    const oldKey = process.env.STRIPE_SECRET_KEY;
    const oldTestKey = process.env.STRIPE_TEST_SECRET_KEY;
    const oldEnv = process.env.VERCEL_ENV;
    delete process.env.STRIPE_SECRET_KEY;
    process.env.STRIPE_TEST_SECRET_KEY = 'sk_test_local_only';
    process.env.VERCEL_ENV = 'preview';
    resetStripeClientForTests();
    t.after(() => {
      if (oldKey === undefined) delete process.env.STRIPE_SECRET_KEY; else process.env.STRIPE_SECRET_KEY = oldKey;
      if (oldTestKey === undefined) delete process.env.STRIPE_TEST_SECRET_KEY; else process.env.STRIPE_TEST_SECRET_KEY = oldTestKey;
      if (oldEnv === undefined) delete process.env.VERCEL_ENV; else process.env.VERCEL_ENV = oldEnv;
      resetStripeClientForTests();
    });

    const stripe = getStripeTestClient();
    let stripeCalls = 0;
    t.mock.method(stripe.accounts, 'retrieve', async () => ({
      id: 'acct_company',
      metadata: { firebase_uid: 'owner_1', leadspay_role: 'empresa' },
      details_submitted: true,
      payouts_enabled: true,
      capabilities: { transfers: 'active' },
    }) as any);
    t.mock.method(stripe.paymentIntents, 'create', async () => {
      stripeCalls++;
      return { id: 'pi_test', client_secret: 'test_secret' } as any;
    });

    t.mock.method(DocumentReference.prototype, 'get', async function () {
      const path = String((this as any).path || '');
      if (path.startsWith('plans/')) return { exists: true, data: () => ({
        companyId: 'company_1', ownerId: 'owner_1', name: 'Oferta Teste',
        priceSetup: 10, commissionPercentage: 0, status: 'Ativo', active: true, allowAffiliates: false,
      }) } as any;
      if (path.startsWith('companies/')) return { exists: true, data: () => ({
        ownerId: 'owner_1', name: 'Empresa', verified: true, status: 'approved',
      }) } as any;
      if (path.startsWith('user_profiles/')) return { exists: true, data: () => ({
        accountType: 'empresa', empresaVerificationStatus: 'approved', verified: true,
        stripeAccounts: { empresa: 'acct_company' }, planStatus: 'inactive',
      }) } as any;
      if (path.startsWith('verification_requests/')) return { exists: false, data: () => ({}) } as any;
      return { exists: false, data: () => ({}) } as any;
    });

    let writes = 0;
    t.mock.method(DocumentReference.prototype, 'set', async () => {
      if (++writes === failedWrite) throw new Error('Simulated storage failure');
    });

    let code = 0;
    let response: any;
    const res = {
      setHeader() {},
      status(value: number) { code = value; return this; },
      json(value: unknown) { response = value; return value; },
      end() {},
    };

    await checkout({ method: 'POST', headers: {}, body: {
      planId: 'plan_test',
      attemptId: 'test_attempt_123456',
      buyerName: 'Teste',
      buyerEmail: 'test@example.com',
    } }, res as any);

    assert.equal(code, 503);
    assert.equal(response.code, 'ORDER_STORAGE_UNAVAILABLE');
    assert.equal(response.clientSecret, undefined);
    assert.equal(stripeCalls, failedWrite === 1 ? 0 : 1);
  });
}

test('checkout rejeita oferta inexistente em vez de aceitar preço enviado pelo navegador', async (t) => {
  const oldKey = process.env.STRIPE_SECRET_KEY;
  process.env.STRIPE_SECRET_KEY = 'sk_test_local_only';
  resetStripeClientForTests();
  t.after(() => {
    if (oldKey === undefined) delete process.env.STRIPE_SECRET_KEY; else process.env.STRIPE_SECRET_KEY = oldKey;
    resetStripeClientForTests();
  });
  t.mock.method(DocumentReference.prototype, 'get', async () => ({ exists: false, data: () => ({}) }) as any);
  let code = 0;
  let response: any;
  const res = {
    setHeader() {},
    status(value: number) { code = value; return this; },
    json(value: unknown) { response = value; return value; },
    end() {},
  };
  await checkout({ method: 'POST', headers: {}, body: {
    planId: 'plan_inexistente',
    amount: 0.50,
    attemptId: 'test_attempt_654321',
    buyerName: 'Teste',
    buyerEmail: 'test@example.com',
  } }, res as any);
  assert.equal(code, 404);
  assert.equal(response.code, 'PLAN_NOT_FOUND');
});
