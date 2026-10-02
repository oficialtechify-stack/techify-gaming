import dotenv from 'dotenv';
import path from 'path';
import express from 'express';
import { createServer as createViteServer } from 'vite';

dotenv.config({ path: path.resolve(process.cwd(), '.env'), override: true });
dotenv.config();

import stripeCheckoutHandler from './server-api/stripe/checkout.js';
import stripeOnboardingHandler from './server-api/stripe/onboarding.js';
import stripeConnectStatusHandler from './server-api/stripe/connect-status.js';
import stripeExpressDashboardHandler from './server-api/stripe/express-dashboard.js';
import stripeStatusHandler from './server-api/stripe/status.js';
import stripeSubscriptionCheckoutHandler from './server-api/stripe/subscription-checkout.js';
import stripeWebhookHandler from './server-api/stripe/webhook.js';
import stripeWithdrawalHandler from './server-api/stripe/withdrawal.js';
import stripeReleasesCronHandler from './server-api/crons/stripe-releases.js';
import plansHandler from './server-api/plans.js';
import couponsHandler from './server-api/coupons.js';
import companiesHandler from './server-api/companies.js';
import enableAffiliateHandler from './server-api/profile/enable-affiliate.js';
import affiliateJoinHandler from './server-api/affiliates/join.js';
import checkDocumentHandler from './server-api/profile/check-document.js';
import submitVerificationHandler from './server-api/profile/submit-verification.js';
import legacyLookupHandler from './server-api/profile/legacy-lookup.js';
import auditIdentitiesHandler from './server-api/admin/audit-identities.js';
import adminEntityActionHandler from './server-api/admin/entity-action.js';
import adminExplorerHandler from './server-api/admin/explorer.js';
import partnerApiKeyHandler from './server-api/partner/api-key.js';
import partnerSettingsHandler from './server-api/partner/settings.js';
import partnerPaymentsHandler from './server-api/partner/payments.js';
import mcpRestHandler from './server-api/mcp/rest.js';
import mcpProtocolHandler from './server-api/mcp/protocol.js';

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.json({
  limit: '2mb',
  verify: (req: any, _res, buf) => { req.rawBody = Buffer.from(buf); },
}));

const adapt = (handler: any) => (req: express.Request, res: express.Response) => handler(req as any, res as any);

app.get('/api/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    gateway: 'Stripe Connect',
    walletRelease: '8 dias com plano pago / 15 dias sem plano pago',
    time: new Date().toISOString(),
  });
});

app.all('/api/stripe/checkout', adapt(stripeCheckoutHandler));
app.all('/api/stripe/onboarding', adapt(stripeOnboardingHandler));
app.all('/api/stripe/connect-status', adapt(stripeConnectStatusHandler));
app.all('/api/stripe/express-dashboard', adapt(stripeExpressDashboardHandler));
app.all('/api/stripe/status', adapt(stripeStatusHandler));
app.all('/api/stripe/subscription-checkout', adapt(stripeSubscriptionCheckoutHandler));
app.all('/api/plans/checkout', adapt(stripeSubscriptionCheckoutHandler));
app.all('/api/stripe/withdrawal', adapt(stripeWithdrawalHandler));
app.all('/api/withdrawals/request', adapt(stripeWithdrawalHandler));
app.all(['/api/stripe/webhook','/api/webhooks/stripe','/api/webhook/stripe'], adapt(stripeWebhookHandler));
app.all(['/api/crons/stripe-releases','/api/cron/stripe-releases','/api/cron/release-balances'], adapt(stripeReleasesCronHandler));
app.all('/api/plans', adapt(plansHandler));
app.all('/api/coupons', adapt(couponsHandler));
app.all('/api/companies', adapt(companiesHandler));
app.all('/api/profile/enable-affiliate', adapt(enableAffiliateHandler));
app.all('/api/affiliates/join', adapt(affiliateJoinHandler));
app.all('/api/profile/check-document', adapt(checkDocumentHandler));
app.all('/api/profile/submit-verification', adapt(submitVerificationHandler));
app.all('/api/profile/legacy-lookup', adapt(legacyLookupHandler));
app.all('/api/admin/audit-identities', adapt(auditIdentitiesHandler));
app.all('/api/admin/entity-action', adapt(adminEntityActionHandler));
app.all('/api/admin/explorer', adapt(adminExplorerHandler));

for (const action of ['approve-company','reject-entity','ban-entity','unban-entity','purge-entity']) {
  app.all('/api/admin/' + action, (req, res) => {
    req.body = { ...(req.body || {}), action };
    return adminEntityActionHandler(req as any, res as any);
  });
}

app.all('/api/partner/api-key', adapt(partnerApiKeyHandler));
app.all('/api/partner/settings', adapt(partnerSettingsHandler));
app.all(['/api/partner/payments','/api/payments'], adapt(partnerPaymentsHandler));
app.all('/api/mcp', adapt(mcpProtocolHandler));
app.all('/api/mcp/v1', (req, res) => {
  (req as any).mcpRoute = '';
  return mcpRestHandler(req as any, res as any);
});
app.all('/api/mcp/v1/:route', (req, res) => {
  (req as any).mcpRoute = req.params.route;
  return mcpRestHandler(req as any, res as any);
});

app.all([
  '/api/checkout*','/api/pix*','/api/subaccounts*','/api/asaas*','/api/subscriptions*',
  '/api/v3/accounts*','/api/v3/payments*','/api/v3/subaccounts*','/api/webhooks/asaas*',
  '/webhooks/asaas*','/webhook/asaas*'
], (_req, res) => {
  res.status(410).json({
    error: true,
    code: 'PAYMENT_PROVIDER_MIGRATED',
    message: 'Rota financeira legada aposentada. Use Stripe Connect.',
  });
});

app.all('/__/auth/*', (req, res) => {
  res.redirect(307, 'https://techify-gaming-106fe.firebaseapp.com' + req.originalUrl);
});

for (const legalPath of ['/legal','/legal.html','/termos-de-uso','/termos-de-uso.html','/politica-privacidade','/politica-privacidade.html','/politica-de-cookies','/politica-de-cookies.html']) {
  app.get(legalPath, (_req, res) => res.sendFile(path.join(process.cwd(), 'public', 'legal.html')));
}

app.use('/api', (_req, res) => res.status(404).json({ error: 'Endpoint de API não encontrado.' }));

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: process.env.DISABLE_HMR !== 'true' },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log('LeadsPay online em http://0.0.0.0:' + PORT + ' — Stripe Connect é o único gateway financeiro ativo.');
  });
}

startServer().catch((error) => {
  console.error('Falha ao iniciar servidor:', error);
  process.exitCode = 1;
});
