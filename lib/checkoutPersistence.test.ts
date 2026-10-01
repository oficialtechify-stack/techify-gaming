import assert from 'node:assert/strict';
import test from 'node:test';
import { DocumentReference } from 'firebase-admin/firestore';
import checkout from '../server-api/stripe/checkout';
import { getStripeTestClient, resetStripeClientForTests } from './stripeServer';

for (const failedWrite of [1, 2]) {
  test(`checkout não entrega client secret quando a gravação ${failedWrite} falha`, async (t) => {
    const oldKey = process.env.STRIPE_SECRET_KEY;
    process.env.STRIPE_SECRET_KEY = 'sk_test_local_only';
    resetStripeClientForTests();
    t.after(() => {
      if (oldKey === undefined) delete process.env.STRIPE_SECRET_KEY;
      else process.env.STRIPE_SECRET_KEY = oldKey;
      resetStripeClientForTests();
    });
    const stripe = getStripeTestClient();
    let stripeCalls = 0;
    t.mock.method(stripe.paymentIntents, 'create', async () => {
      stripeCalls++;
      return { id: 'pi_test', client_secret: 'test_secret' };
    });
    t.mock.method(DocumentReference.prototype, 'get', async () => ({ exists: false }));
    let writes = 0;
    t.mock.method(DocumentReference.prototype, 'set', async () => {
      if (++writes === failedWrite) throw new Error('Simulated storage failure');
    });
    let code = 0;
    let response: any;
    const res = {
      setHeader() {},
      status(value: number) { code = value; return this; },
      json(value: unknown) { response = value; },
      end() {},
    };
    await checkout({ method: 'POST', headers: {}, body: {
      attemptId: 'test_attempt_123456', amount: 10, buyerName: 'Teste', buyerEmail: 'test@example.com',
    } }, res);
    assert.equal(code, 503);
    assert.equal(response.code, 'ORDER_STORAGE_UNAVAILABLE');
    assert.equal(response.clientSecret, undefined);
    assert.equal(stripeCalls, failedWrite === 1 ? 0 : 1);
  });
}
