import type { IncomingMessage, ServerResponse } from 'http';
import stripeCheckoutHandler from '../server-api/stripe/checkout.js';
import stripeOnboardingHandler from '../server-api/stripe/onboarding.js';
import stripeConnectStatusHandler from '../server-api/stripe/connect-status.js';
import stripeExpressDashboardHandler from '../server-api/stripe/express-dashboard.js';
import stripeStatusHandler from '../server-api/stripe/status.js';
import stripeWebhookHandler from '../server-api/stripe/webhook.js';
import stripeReleasesCronHandler from '../server-api/crons/stripe-releases.js';
import checkDocumentHandler from '../server-api/profile/check-document.js';
import submitVerificationHandler from '../server-api/profile/submit-verification.js';
import legacyLookupHandler from '../server-api/profile/legacy-lookup.js';
import affiliateJoinHandler from '../server-api/affiliates/join.js';
import affiliateClickHandler from '../server-api/affiliates/click.js';
import affiliateLeaveHandler from '../server-api/affiliates/leave.js';
import auditIdentitiesHandler from '../server-api/admin/audit-identities.js';
import adminEntityActionHandler from '../server-api/admin/entity-action.js';
import adminExplorerHandler from '../server-api/admin/explorer.js';
import plansHandler from '../server-api/plans.js';
import subscriptionCheckoutHandler from '../server-api/stripe/subscription-checkout.js';
import productSubscriptionCheckoutHandler from '../server-api/stripe/product-subscription-checkout.js';
import productSubscriptionStatusHandler from '../server-api/stripe/product-subscription-status.js';
import stripeWithdrawalHandler from '../server-api/stripe/withdrawal.js';
import partnerApiKeyHandler from '../server-api/partner/api-key.js';
import partnerSettingsHandler from '../server-api/partner/settings.js';
import partnerPaymentsHandler from '../server-api/partner/payments.js';
import partnerTestWebhookHandler from '../server-api/partner/test-webhook.js';
import couponsHandler from '../server-api/coupons.js';
import companiesHandler from '../server-api/companies.js';
import companyContextHandler from '../server-api/company/context.js';
import companySubscriptionsHandler from '../server-api/company/subscriptions.js';
import enableAffiliateHandler from '../server-api/profile/enable-affiliate.js';
import mcpRestHandler from '../server-api/mcp/rest.js';
import mcpProtocolHandler from '../server-api/mcp/protocol.js';

export const config = {
  api: {
    bodyParser: false,
  },
};

type VercelRequest = IncomingMessage & {
  query: Record<string, string | string[]>;
  body: any;
  rawBody?: Buffer;
};

type VercelResponse = ServerResponse & {
  status: (code: number) => VercelResponse;
  json: (data: any) => void;
  send: (data: any) => void;
  end: (data?: any) => void;
  setHeader: (name: string, value: string) => void;
};

async function readRawBody(req: IncomingMessage): Promise<Buffer> {
  if ((req as any).rawBody && Buffer.isBuffer((req as any).rawBody)) return (req as any).rawBody;
  if (Buffer.isBuffer((req as any).body)) return (req as any).body;
  if (typeof (req as any).body === 'string') return Buffer.from((req as any).body);
  if ((req as any).body && typeof (req as any).body === 'object') {
    try {
      return Buffer.from(JSON.stringify((req as any).body));
    } catch {}
  }
  const chunks: Buffer[] = [];
  try {
    for await (const chunk of req) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
  } catch {}
  return Buffer.concat(chunks);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Ensure status and json helpers are present
  if (!res.status) {
    (res as any).status = function (code: number) {
      res.statusCode = code;
      return res;
    };
  }
  if (!res.json) {
    (res as any).json = function (data: any) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify(data));
    };
  }

  // Extract clean subpath
  const routeParam = req.query?.route;
  let subpath = '';
  if (Array.isArray(routeParam)) {
    subpath = routeParam.join('/');
  } else if (typeof routeParam === 'string') {
    subpath = routeParam;
  } else if (req.url) {
    try {
      const urlObj = new URL(req.url, 'http://localhost');
      subpath = urlObj.pathname.replace(/^\/api\/?/, '');
    } catch {
      subpath = req.url.replace(/^\/api\/?/, '').split('?')[0];
    }
  }

  const cleanPath = subpath.replace(/^\/+|\/+$/g, '').toLowerCase();

  // Retired Asaas check
  const retiredAsaas = /^(?:checkout|pix|subaccounts|asaas|subscriptions?|v3\/(?:accounts|payments|subaccounts)|webhooks\/asaas)/i.test(cleanPath);
  if (retiredAsaas) {
    return res.status(410).json({
      error: true,
      code: 'PAYMENT_PROVIDER_MIGRATED',
      message: 'Rota de pagamento legada aposentada. Use os endpoints Stripe da LeadsPay.',
    });
  }

  // Health check
  if (cleanPath === 'health' || cleanPath === '') {
    return res.status(200).json({
      status: 'ok',
      gateway: 'Stripe Connect',
      cron: 'Liberação de saldo 8/15 dias ativa',
      time: new Date().toISOString(),
    });
  }

  // Read raw body safely
  const rawBody = await readRawBody(req);
  req.rawBody = rawBody;

  // Parse JSON for non-webhook requests if req.body is not already parsed
  if ((!req.body || typeof req.body !== 'object') && rawBody.length > 0 && cleanPath !== 'stripe/webhook' && cleanPath !== 'webhooks/stripe' && cleanPath !== 'webhook/stripe') {
    try {
      req.body = JSON.parse(rawBody.toString('utf-8'));
    } catch {
      req.body = {};
    }
  }

  // Route dispatcher
  switch (cleanPath) {
    case 'stripe/checkout':
      return stripeCheckoutHandler(req as any, res as any);
    case 'stripe/onboarding':
      return stripeOnboardingHandler(req as any, res as any);
    case 'stripe/connect-status':
      return stripeConnectStatusHandler(req as any, res as any);
    case 'stripe/express-dashboard':
      return stripeExpressDashboardHandler(req as any, res as any);
    case 'stripe/status':
      return stripeStatusHandler(req as any, res as any);
    case 'stripe/subscription-checkout':
    case 'plans/checkout':
      return subscriptionCheckoutHandler(req as any, res as any);
    case 'stripe/product-subscription-checkout':
      return productSubscriptionCheckoutHandler(req as any, res as any);
    case 'stripe/product-subscription-status':
      return productSubscriptionStatusHandler(req as any, res as any);
    case 'stripe/withdrawal':
    case 'withdrawals/request':
      return stripeWithdrawalHandler(req as any, res as any);
    case 'plans':
      return plansHandler(req as any, res as any);
    case 'coupons':
      return couponsHandler(req as any, res as any);
    case 'companies':
      return companiesHandler(req as any, res as any);
    case 'company/context':
      return companyContextHandler(req as any, res as any);
    case 'company/subscriptions':
      return companySubscriptionsHandler(req as any, res as any);
    case 'profile/enable-affiliate':
      return enableAffiliateHandler(req as any, res as any);
    case 'partner/api-key':
      return partnerApiKeyHandler(req as any, res as any);
    case 'partner/settings':
      return partnerSettingsHandler(req as any, res as any);
    case 'partner/payments':
    case 'payments':
      return partnerPaymentsHandler(req as any, res as any);
    case 'partner/test-webhook':
      return partnerTestWebhookHandler(req as any, res as any);
    case 'stripe/webhook':
    case 'webhooks/stripe':
    case 'webhook/stripe':
      return stripeWebhookHandler(req as any, res as any);
    case 'crons/stripe-releases':
    case 'cron/stripe-releases':
    case 'cron/release-balances':
      return stripeReleasesCronHandler(req as any, res as any);
    case 'profile/check-document':
      return checkDocumentHandler(req as any, res as any);
    case 'profile/submit-verification':
      return submitVerificationHandler(req as any, res as any);
    case 'profile/legacy-lookup':
      return legacyLookupHandler(req as any, res as any);
    case 'affiliates/join':
      return affiliateJoinHandler(req as any, res as any);
    case 'affiliates/click':
      return affiliateClickHandler(req as any, res as any);
    case 'affiliates/leave':
      return affiliateLeaveHandler(req as any, res as any);
    case 'mcp':
      return mcpProtocolHandler(req as any, res as any);
    case 'mcp/v1':
      (req as any).mcpRoute = '';
      return mcpRestHandler(req as any, res as any);
    case 'mcp/v1/status':
    case 'mcp/v1/balance':
    case 'mcp/v1/products':
    case 'mcp/v1/affiliations':
    case 'mcp/v1/coupons':
    case 'mcp/v1/checkout':
      (req as any).mcpRoute = cleanPath.replace(/^mcp\/v1\/?/, '');
      return mcpRestHandler(req as any, res as any);
    case 'admin/audit-identities':
      return auditIdentitiesHandler(req as any, res as any);
    case 'admin/explorer':
      return adminExplorerHandler(req as any, res as any);
    case 'admin/entity-action':
    case 'admin/approve-company':
    case 'admin/reject-entity':
    case 'admin/ban-entity':
    case 'admin/unban-entity':
    case 'admin/purge-entity':
      if (cleanPath !== 'admin/entity-action') {
        req.body = { ...(req.body || {}), action: cleanPath.replace(/^admin\//, '') };
      }
      return adminEntityActionHandler(req as any, res as any);
    default:
      return res.status(404).json({ error: `Endpoint /api/${cleanPath} não encontrado.` });
  }
}
