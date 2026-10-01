import { getServerAdminFirestore, verifyFirebaseIdentity } from '../../lib/firebaseAdminServer.js';
import { getLeadspayBaseUrl, getStripeTestClient } from '../../lib/stripeServer.js';
import { applyVerificationRequest, profileHasRole } from '../../lib/profileEligibility.js';
import { getSubscriptionPlan } from '../../lib/platformBilling.js';

type RequestLike = { method?: string; body?: unknown; headers: Record<string, string | string[] | undefined> };
type ResponseLike = { setHeader(name: string, value: string): void; status(code: number): ResponseLike; json(body: unknown): unknown };

async function activateFreePlan(db: FirebaseFirestore.Firestore, uid: string, planId: string, planName: string) {
  const now = new Date().toISOString();
  const update = {
    plan: planId,
    planStatus: 'active',
    subscriptionTier: planId,
    subscriptionName: planName,
    subscriptionPrice: 0,
    stripeSubscriptionId: null,
    stripeSubscriptionStatus: 'free',
    subscriptionActiveAt: now,
    updatedAt: now,
  };
  const batch = db.batch();
  batch.set(db.collection('user_profiles').doc(uid), update, { merge: true });
  batch.set(db.collection('users').doc(uid), update, { merge: true });
  await batch.commit();
}

export default async function handler(req: RequestLike, res: ResponseLike) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });

  try {
    const identity = await verifyFirebaseIdentity(typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined);
    const body = req.body && typeof req.body === 'object' ? req.body as Record<string, unknown> : {};
    const plan = getSubscriptionPlan(body.planId);
    if (!plan) return res.status(400).json({ error: 'Plano de assinatura inválido.' });
    if (body.role && body.role !== plan.role) return res.status(400).json({ error: 'Este plano não corresponde ao perfil selecionado.' });

    const db = getServerAdminFirestore();
    const [profileSnap, requestSnap] = await Promise.all([
      db.collection('user_profiles').doc(identity.uid).get(),
      db.collection('verification_requests').doc(identity.uid).get(),
    ]);
    if (!profileSnap.exists) return res.status(404).json({ error: 'Perfil não encontrado.' });
    const profile = applyVerificationRequest(profileSnap.data()!, requestSnap.exists ? requestSnap.data()! : null) as Record<string, any>;
    if (!profileHasRole(profile, plan.role)) return res.status(403).json({ error: 'Este plano não pertence ao tipo da sua conta.' });
    if (profile.banned === true || profile.archived === true || profile.isArchived === true) return res.status(403).json({ error: 'Esta conta não pode contratar planos.' });

    if (plan.priceCents === 0) {
      await activateFreePlan(db, identity.uid, plan.id, plan.name);
      return res.status(200).json({ success: true, activated: true, planId: plan.id });
    }

    const existingTier = String(profile.subscriptionTier || profile.plan || '');
    const existingStatus = String(profile.planStatus || '').toLowerCase();
    if (existingStatus === 'active' && existingTier === plan.id) {
      return res.status(200).json({ success: true, alreadyActive: true, planId: plan.id });
    }
    if (profile.stripeSubscriptionId && existingStatus === 'active' && existingTier && existingTier !== plan.id) {
      return res.status(409).json({ error: 'Você já possui uma assinatura paga ativa. Cancele ou altere a assinatura atual antes de contratar outro plano.', code: 'ACTIVE_SUBSCRIPTION_EXISTS' });
    }

    const stripe = getStripeTestClient();
    let customerId = String(profile.stripeCustomerId || '');
    if (customerId) {
      try {
        await stripe.customers.retrieve(customerId);
      } catch {
        customerId = '';
      }
    }
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: identity.email || undefined,
        name: String(profile.name || '').slice(0, 120) || undefined,
        metadata: { firebase_uid: identity.uid },
      }, { idempotencyKey: `leadspay-customer-${identity.uid}` });
      customerId = customer.id;
      await db.collection('user_profiles').doc(identity.uid).set({ stripeCustomerId: customerId, updatedAt: new Date().toISOString() }, { merge: true });
    }

    const baseUrl = getLeadspayBaseUrl();
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{
        quantity: 1,
        price_data: {
          currency: 'brl',
          unit_amount: plan.priceCents,
          recurring: { interval: 'month' },
          product_data: { name: `LeadsPay ${plan.name}` },
        },
      }],
      success_url: `${baseUrl}/?tab=planos&subscription=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/?tab=planos&subscription=cancelled`,
      metadata: {
        firebase_uid: identity.uid,
        plan_id: plan.id,
        role: plan.role,
      },
      subscription_data: {
        metadata: {
          firebase_uid: identity.uid,
          plan_id: plan.id,
          role: plan.role,
        },
      },
    });

    await db.collection('stripe_subscription_checkouts').doc(session.id).set({
      userId: identity.uid,
      customerId,
      planId: plan.id,
      role: plan.role,
      amountCents: plan.priceCents,
      status: 'pending',
      createdAt: new Date().toISOString(),
    }, { merge: true });

    return res.status(200).json({ success: true, url: session.url, sessionId: session.id });
  } catch (error) {
    console.error('[Subscription checkout]', error instanceof Error ? error.message : 'Falha desconhecida');
    return res.status(503).json({ error: 'Não foi possível iniciar a assinatura Stripe agora.' });
  }
}
