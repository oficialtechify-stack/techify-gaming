import Stripe from 'stripe';
import dotenv from 'dotenv';
dotenv.config();

let stripeClient: Stripe | undefined;

/**
 * Legacy function name retained for callers. Production supports live credentials;
 * preview deployments and the test-only variable must never use live credentials.
 */
export function getStripeTestClient(): Stripe {
  const primary = process.env.STRIPE_SECRET_KEY?.trim() || '';
  const testSecret = process.env.STRIPE_TEST_SECRET_KEY?.trim() || '';
  const vercelEnv = process.env.VERCEL_ENV || '';
  const isProduction = vercelEnv === 'production' || (process.env.NODE_ENV === 'production' && vercelEnv !== 'preview');
  const isPreview = vercelEnv === 'preview';

  if (testSecret && !/^(sk|rk)_test_/.test(testSecret)) {
    throw new Error('Stripe bloqueado: STRIPE_TEST_SECRET_KEY aceita somente chaves sk_test_ ou rk_test_.');
  }

  if (isProduction) {
    if (!primary) {
      throw new Error('Stripe LIVE indisponível: configure STRIPE_SECRET_KEY na Production da Vercel.');
    }
    if (!/^(sk|rk)_live_/.test(primary)) {
      throw new Error('Stripe LIVE bloqueado: STRIPE_SECRET_KEY de Production precisa ser uma chave live.');
    }
  }

  const secret = isProduction ? primary : (isPreview ? testSecret : (primary || testSecret));
  if (!secret) {
    throw new Error(isPreview
      ? 'Stripe de Preview indisponível: configure STRIPE_TEST_SECRET_KEY.'
      : 'Stripe indisponível: configure uma chave secreta no servidor.');
  }
  if (!/^(sk|rk)_(test|live)_/.test(secret)) {
    throw new Error('Stripe bloqueado: configure uma chave secreta ou restrita válida.');
  }
  if (isPreview && !/^(sk|rk)_test_/.test(secret)) {
    throw new Error('Stripe bloqueado: Preview aceita somente chaves de teste em STRIPE_TEST_SECRET_KEY.');
  }

  if (!stripeClient) stripeClient = new Stripe(secret);
  return stripeClient;
}

export function getStripeWebhookSecret(): string {
  const secret = (process.env.VERCEL_ENV === 'preview'
    ? process.env.STRIPE_TEST_WEBHOOK_SECRET?.trim()
    : '') || process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret || !secret.startsWith('whsec_')) {
    throw new Error('Webhook Stripe não configurado no servidor.');
  }
  return secret;
}

export function getLeadspayBaseUrl(): string {
  const deploymentUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '';
  const isPreview = process.env.VERCEL_ENV === 'preview';
  const isProduction = process.env.VERCEL_ENV === 'production';
  const productionDefault = 'https://www.techify.sbs';
  const raw =
    (isPreview && deploymentUrl) ||
    process.env.LEADSPAY_BASE_URL?.trim() ||
    (isProduction ? productionDefault : deploymentUrl);

  if (!raw) throw new Error('LEADSPAY_BASE_URL não está configurada.');
  const url = new URL(raw);
  if (url.protocol !== 'https:' && !(url.hostname === 'localhost' && process.env.NODE_ENV !== 'production')) {
    throw new Error('LEADSPAY_BASE_URL deve usar HTTPS.');
  }
  return url.origin;
}

/** Internal test helper: prevents leaked client state across isolated tests. */
export function resetStripeClientForTests(): void {
  stripeClient = undefined;
}
