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
import auditIdentitiesHandler from '../server-api/admin/audit-identities.js';

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
  const retiredAsaas = /^(?:payments|checkout|pix|subaccounts|asaas|withdrawals?|subscriptions?|plans\/checkout|cron\/release-balances|v3\/(?:accounts|payments|subaccounts)|webhooks\/asaas|admin\/(?:approve-company|reject-entity|ban-entity|unban-entity|purge-entity))/i.test(cleanPath);
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
      cron: 'Liberação Stripe Connect D+9 ativa',
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
    case 'stripe/webhook':
    case 'webhooks/stripe':
    case 'webhook/stripe':
      return stripeWebhookHandler(req as any, res as any);
    case 'crons/stripe-releases':
    case 'cron/stripe-releases':
      return stripeReleasesCronHandler(req as any, res as any);
    case 'profile/check-document':
      return checkDocumentHandler(req as any, res as any);
    case 'profile/submit-verification':
      return submitVerificationHandler(req as any, res as any);
    case 'profile/legacy-lookup':
      return legacyLookupHandler(req as any, res as any);
    case 'affiliates/join':
      return affiliateJoinHandler(req as any, res as any);
    case 'admin/audit-identities':
      return auditIdentitiesHandler(req as any, res as any);
    default:
      return res.status(404).json({ error: `Endpoint /api/${cleanPath} não encontrado.` });
  }
}
