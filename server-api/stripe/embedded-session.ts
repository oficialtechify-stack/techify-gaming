import { verifyFirebaseIdentity, getServerAdminFirestore } from '../../lib/firebaseAdminServer.js';
import { getStripeTestClient } from '../../lib/stripeServer.js';

type Req = { method?: string; headers: Record<string, string | string[] | undefined> };
type Res = { setHeader(name: string, value: string): void; status(code: number): Res; json(body: unknown): unknown };

export default async function handler(req: Req, res: Res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });
  try {
    const identity = await verifyFirebaseIdentity(
      typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined,
      { requireVerifiedEmail: true },
    );
    const db = getServerAdminFirestore();
    const profileSnap = await db.collection('user_profiles').doc(identity.uid).get();
    if (!profileSnap.exists) return res.status(404).json({ error: 'Perfil não encontrado.' });
    const profile = profileSnap.data() || {};
    if (profile.banned || profile.status === 'banned') return res.status(403).json({ error: 'Conta bloqueada.' });
    const accountId = String(profile.stripeAccounts?.empresa || '');
    if (!accountId) return res.status(409).json({
      error: 'A conta financeira da empresa ainda não foi criada. Conclua primeiro a configuração inicial.',
      code: 'CONNECTED_ACCOUNT_MISSING',
    });
    const stripe = getStripeTestClient();
    const account = await stripe.accounts.retrieve(accountId);
    if (account.metadata?.firebase_uid !== identity.uid || account.metadata?.leadspay_role !== 'empresa') {
      return res.status(403).json({ error: 'Conta Stripe não pertence a esta empresa.' });
    }
    const companyId = String(profile.companyId || '').trim();
    if (companyId && account.metadata?.leadspay_company_id && account.metadata.leadspay_company_id !== companyId) {
      return res.status(403).json({ error: 'Conta Stripe vinculada a outra empresa.' });
    }
    if (account.details_submitted && account.payouts_enabled && account.capabilities?.transfers === 'active') {
      return res.status(409).json({ error: 'Conta já verificada.', code: 'ALREADY_VERIFIED' });
    }
    const session = await stripe.accountSessions.create({
      account: accountId,
      components: { account_onboarding: { enabled: true } },
    });
    return res.status(200).json({ clientSecret: session.client_secret });
  } catch (error) {
    console.error('[Stripe embedded onboarding]', error instanceof Error ? error.message : 'falha');
    return res.status(503).json({ error: 'Não foi possível iniciar o cadastro integrado agora.' });
  }
}
