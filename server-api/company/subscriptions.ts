import { getServerAdminFirestore, verifyFirebaseIdentity } from '../../lib/firebaseAdminServer.js';
import { getStripeTestClient } from '../../lib/stripeServer.js';
import { applyVerificationRequest, profileHasRole, profileRoleIsApproved } from '../../lib/profileEligibility.js';

type Req = {
  method?: string;
  body?: unknown;
  headers: Record<string, string | string[] | undefined>;
};
type Res = {
  setHeader(name: string, value: string): void;
  status(code: number): Res;
  json(body: unknown): unknown;
};

export default async function handler(req: Req, res: Res) {
  res.setHeader('Cache-Control', 'no-store');

  try {
    const identity = await verifyFirebaseIdentity(
      typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined,
    );

    const db = getServerAdminFirestore();
    const [profileSnap, requestSnap] = await Promise.all([
      db.collection('user_profiles').doc(identity.uid).get(),
      db.collection('verification_requests').doc(identity.uid).get(),
    ]);

    if (!profileSnap.exists) return res.status(404).json({ error: 'Perfil não encontrado.' });

    const profile = applyVerificationRequest(
      profileSnap.data()!,
      requestSnap.exists ? requestSnap.data()! : null,
    ) as Record<string, any>;

    if (!profileHasRole(profile, 'empresa') || !profileRoleIsApproved(profile, 'empresa')) {
      return res.status(403).json({ error: 'A Empresa precisa estar aprovada.' });
    }

    const companyId = String(profile.companyId || '').trim();
    if (!companyId) return res.status(409).json({ error: 'Empresa não vinculada.' });

    const companySnap = await db.collection('companies').doc(companyId).get();
    if (!companySnap.exists) return res.status(404).json({ error: 'Empresa não encontrada.' });
    const company = companySnap.data()!;
    if (String(company.ownerId || company.submittedBy || '') !== identity.uid) {
      return res.status(403).json({ error: 'Esta empresa não pertence à conta autenticada.' });
    }

    if (req.method === 'GET') {
      const snap = await db.collection('product_subscriptions')
        .where('companyId', '==', companyId)
        .limit(300)
        .get();

      const subscriptions = snap.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .sort((a: any, b: any) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));

      return res.status(200).json({ success: true, companyId, subscriptions });
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Método não permitido.' });
    }

    const body = req.body && typeof req.body === 'object' ? req.body as Record<string, unknown> : {};
    const action = String(body.action || '').trim();
    const subscriptionId = String(body.subscriptionId || '').trim();

    if (action !== 'cancel_at_period_end') {
      return res.status(400).json({ error: 'Ação de assinatura inválida.' });
    }
    if (!/^sub_[A-Za-z0-9]+$/.test(subscriptionId)) {
      return res.status(400).json({ error: 'Assinatura inválida.' });
    }

    const subRef = db.collection('product_subscriptions').doc(subscriptionId);
    const subSnap = await subRef.get();
    if (!subSnap.exists) return res.status(404).json({ error: 'Assinatura não encontrada.' });

    const saved = subSnap.data()!;
    if (String(saved.companyId || '') !== companyId) {
      return res.status(403).json({ error: 'Esta assinatura pertence a outra empresa.' });
    }

    const stripe = getStripeTestClient();
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    if (
      subscription.metadata?.leadspay_product_subscription !== '1' ||
      String(subscription.metadata?.company_id || '') !== companyId ||
      String(subscription.metadata?.company_owner_id || '') !== identity.uid
    ) {
      return res.status(409).json({ error: 'A assinatura Stripe não corresponde a esta empresa.' });
    }

    const updated = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });

    await subRef.set({
      cancelAtPeriodEnd: true,
      status: updated.status,
      active: updated.status === 'active' || updated.status === 'trialing',
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    return res.status(200).json({
      success: true,
      subscription: {
        id: updated.id,
        status: updated.status,
        cancelAtPeriodEnd: updated.cancel_at_period_end,
      },
    });
  } catch (error) {
    console.error('[Company subscriptions]', error instanceof Error ? error.message : 'Falha');
    return res.status(503).json({ error: 'Não foi possível gerenciar assinaturas agora.' });
  }
}
