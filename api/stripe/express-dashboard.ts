import { verifyFirebaseIdentity, getServerAdminFirestore } from '../../lib/firebaseAdminServer.js';
import { getStripeTestClient } from '../../lib/stripeServer.js';

type RequestLike = { method?: string; body?: unknown; headers: Record<string, string | string[] | undefined> };
type ResponseLike = { setHeader(name: string, value: string): void; status(code: number): ResponseLike; json(body: unknown): unknown };

export default async function handler(req: RequestLike, res: ResponseLike) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });
  try {
    const identity = await verifyFirebaseIdentity(typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined);
    const body = (req.body && typeof req.body === 'object') ? req.body as Record<string, unknown> : {};
    const role = body.role;
    if (role !== 'empresa' && role !== 'afiliado') return res.status(400).json({ error: 'Papel inválido.' });
    const db = getServerAdminFirestore();
    const profileSnap = await db.collection('user_profiles').doc(identity.uid).get();
    if (!profileSnap.exists) return res.status(404).json({ error: 'Perfil não encontrado.' });
    const accountId = String(profileSnap.data()?.stripeAccounts?.[role] || '');
    if (!accountId) return res.status(409).json({ error: 'Conecte sua conta Stripe antes de abrir o painel.' });
    const stripe = getStripeTestClient();
    const account = await stripe.accounts.retrieve(accountId);
    if (account.metadata?.firebase_uid !== identity.uid || account.metadata?.leadspay_role !== role) return res.status(403).json({ error: 'A conta Stripe não pertence a este perfil.' });
    const loginLink = await stripe.accounts.createLoginLink(accountId);
    return res.status(200).json({ url: loginLink.url });
  } catch (error) {
    console.error('[Stripe Express dashboard]', error instanceof Error ? error.message : 'Falha desconhecida');
    return res.status(503).json({ error: 'Não foi possível abrir o painel Stripe.' });
  }
}
