import { verifyFirebaseIdentity, getServerAdminFirestore } from '../../lib/firebaseAdminServer.js';
import { getStripeTestClient } from '../../lib/stripeServer.js';
import { applyVerificationRequest, profileHasRole, profileRoleIsApproved } from '../../lib/profileEligibility.js';

type RequestLike = { method?: string; query?: Record<string, string | string[] | undefined>; headers: Record<string, string | string[] | undefined> };
type ResponseLike = { setHeader(name: string, value: string): void; status(code: number): ResponseLike; json(body: unknown): unknown };

export default async function handler(req: RequestLike, res: ResponseLike) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido.' });
  try {
    const authHeader = typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined;
    const identity = await verifyFirebaseIdentity(authHeader);
    const role = req.query?.role;
    if (role !== 'empresa' && role !== 'afiliado') return res.status(400).json({ error: 'Papel inválido.' });
    const db = getServerAdminFirestore();
    const profileSnap = await db.collection('user_profiles').doc(identity.uid).get();
    if (!profileSnap.exists) return res.status(404).json({ error: 'Perfil não encontrado.' });
    const requestSnap = await db.collection('verification_requests').doc(identity.uid).get();
    const profile = applyVerificationRequest(profileSnap.data()!, requestSnap.exists ? requestSnap.data()! : null) as Record<string, any>;
    if (!profileHasRole(profile, role)) return res.status(403).json({ error: `O perfil autenticado não possui um cadastro de ${role === 'afiliado' ? 'Afiliado' : 'Empresa'}.` });
    if (!profileRoleIsApproved(profile, role)) return res.status(403).json({ error: `A aprovação do perfil de ${role === 'afiliado' ? 'Afiliado' : 'Empresa'} é necessária para consultar recebimentos.` });
    const accountId = String(profile.stripeAccounts?.[role] || '');
    if (!accountId) return res.status(200).json({ status: 'not_connected' });
    const stripe = getStripeTestClient();
    const account = await stripe.accounts.retrieve(accountId);
    if (account.metadata?.firebase_uid !== identity.uid || account.metadata?.leadspay_role !== role) {
      return res.status(409).json({ error: 'A conta Stripe precisa ser reconectada.' });
    }
    const ready = account.details_submitted === true && account.payouts_enabled === true && account.capabilities?.transfers === 'active';
    return res.status(200).json({ status: ready ? 'connected' : 'onboarding_incomplete', chargesEnabled: account.charges_enabled, payoutsEnabled: account.payouts_enabled, detailsSubmitted: account.details_submitted });
  } catch (error) {
    console.error('[Stripe Connect status]', error instanceof Error ? error.message : 'Falha desconhecida');
    return res.status(503).json({ error: 'Não foi possível verificar a conta Stripe.' });
  }
}
