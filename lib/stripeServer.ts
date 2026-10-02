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
  const isPreview = process.env.VERCEL_ENV === 'preview';
  const secret = isPreview ? testSecret : (primary || testSecret);
  if (!secret) {
    throw new Error(isPreview
      ? 'Stripe de Preview indisponível: configure STRIPE_TEST_SECRET_KEY.'
      : 'Stripe indisponível: configure STRIPE_SECRET_KEY ou STRIPE_TEST_SECRET_KEY no servidor.');
  }
  if (!/^(sk|rk)_(test|live)_/.test(secret)) {
    throw new Error('Stripe bloqueado: configure uma chave secreta ou restrita válida.');
  }
  if (isPreview && !/^(sk|rk)_test_/.test(secret)) {
    throw new Error('Stripe bloqueado: Preview aceita somente STRIPE_TEST_SECRET_KEY.');
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
  const raw = (isPreview && deploymentUrl) || process.env.LEADSPAY_BASE_URL?.trim() || deploymentUrl;
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
