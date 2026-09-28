import Stripe from 'stripe';

let stripeClient: Stripe | undefined;

/**
 * This migration branch is intentionally test-only. It refuses live credentials
 * so a preview deployment cannot accidentally move real money.
 */
export function getStripeTestClient(): Stripe {
  const secret = (process.env.STRIPE_TEST_SECRET_KEY || process.env.STRIPE_SECRET_KEY || '').trim();
  if (!secret) throw new Error('Stripe indisponível: configure STRIPE_TEST_SECRET_KEY no servidor.');
  if (!secret.startsWith('sk_test_')) {
    throw new Error('Stripe bloqueado: este ambiente aceita somente chaves sk_test_.');
  }
  if (!stripeClient) stripeClient = new Stripe(secret);
  return stripeClient;
}

export function getStripeWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret || !secret.startsWith('whsec_')) {
    throw new Error('Webhook Stripe de teste não configurado no servidor.');
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
