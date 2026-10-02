import { randomBytes } from 'node:crypto';
import { getServerAdminFirestore, verifyFirebaseIdentity } from '../lib/firebaseAdminServer.js';
import { applyVerificationRequest, profileHasRole, profileRoleIsApproved } from '../lib/profileEligibility.js';

type RequestLike = {
  method?: string;
  body?: unknown;
  query?: Record<string, string | string[] | undefined>;
  headers: Record<string, string | string[] | undefined>;
};
type ResponseLike = { setHeader(name: string, value: string): void; status(code: number): ResponseLike; json(body: unknown): unknown };

function slugify(input: string): string {
  const clean = input.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70);
  return `${clean || 'oferta'}-${randomBytes(4).toString('hex')}`;
}

export default async function handler(req: RequestLike, res: ResponseLike) {
  res.setHeader('Cache-Control', 'no-store');
  const db = getServerAdminFirestore();

  if (req.method === 'GET') {
    const companyId = typeof req.query?.companyId === 'string' ? req.query.companyId.trim() : '';
    let queryRef: FirebaseFirestore.Query = db.collection('plans');
    if (companyId) queryRef = queryRef.where('companyId', '==', companyId);
    const snap = await queryRef.limit(200).get();
    const plans = snap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((plan: any) => plan.status === 'Ativo' && plan.active !== false);
    return res.status(200).json({ success: true, plans });
  }

  if (req.method !== 'POST' && req.method !== 'PUT') return res.status(405).json({ error: 'Método não permitido.' });

  try {
    const authHeader = typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined;
    const identity = await verifyFirebaseIdentity(authHeader);
    const body = req.body && typeof req.body === 'object' ? req.body as Record<string, any> : {};
    const companyId = String(body.companyId || '').trim();
    const name = String(body.name || '').trim().slice(0, 160);
    if (!companyId || !name) return res.status(400).json({ error: 'Empresa e nome da oferta são obrigatórios.' });

    const [profileSnap, requestSnap, companySnap] = await Promise.all([
      db.collection('user_profiles').doc(identity.uid).get(),
      db.collection('verification_requests').doc(identity.uid).get(),
      db.collection('companies').doc(companyId).get(),
    ]);
    if (!profileSnap.exists || !companySnap.exists) return res.status(404).json({ error: 'Perfil ou empresa não encontrados.' });
    const profile = applyVerificationRequest(profileSnap.data()!, requestSnap.exists ? requestSnap.data()! : null) as Record<string, any>;
    if (!profileHasRole(profile, 'empresa') || !profileRoleIsApproved(profile, 'empresa')) {
      return res.status(403).json({ error: 'A conta Empresa precisa estar aprovada para publicar ofertas.' });
    }
    const company = companySnap.data()!;
    if (String(company.ownerId || company.submittedBy || '') !== identity.uid || company.verified !== true || company.status !== 'approved' || company.archived === true || company.isArchived === true) {
      return res.status(403).json({ error: 'Esta empresa não está habilitada para publicar ofertas.' });
    }

    const priceSetup = Number(body.priceSetup ?? body.price ?? 0);
    const priceMonthly = Number(body.priceMonthly ?? 0);
    const price = priceSetup > 0 ? priceSetup : priceMonthly;
    const commissionPercentage = Number(body.commissionPercentage ?? 0);
    if (!Number.isFinite(price) || price < 0.5) return res.status(400).json({ error: 'O preço mínimo da oferta é R$ 0,50.' });
    if (!Number.isFinite(commissionPercentage) || commissionPercentage < 0 || commissionPercentage > 100) {
      return res.status(400).json({ error: 'A comissão deve ficar entre 0% e 100%.' });
    }

    const requestedId = String(body.id || '').trim();
    const planId = requestedId && /^[A-Za-z0-9_-]{1,150}$/.test(requestedId)
      ? requestedId
      : `plan_${Date.now()}_${randomBytes(4).toString('hex')}`;
    const planRef = db.collection('plans').doc(planId);
    const existing = await planRef.get();
    if (existing.exists && (String(existing.data()!.companyId || '') !== companyId || String(existing.data()!.ownerId || '') !== identity.uid)) {
      return res.status(403).json({ error: 'Esta oferta pertence a outra empresa.' });
    }

    const status = body.status === 'Pausado' ? 'Pausado' : 'Ativo';
    const now = new Date().toISOString();
    const checkoutSlug = String(body.checkoutSlug || existing.data()?.checkoutSlug || slugify(name)).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 100);
    const payload = {
      companyId,
      companyName: String(company.name || company.companyName || '').slice(0, 160),
      companyLogo: String(company.logo || '').slice(0, 2000),
      ownerId: identity.uid,
      name,
      tagline: String(body.tagline || name).slice(0, 200),
      description: String(body.description || '').slice(0, 5000),
      category: String(body.category || company.category || 'Digital').slice(0, 120),
      priceSetup: Number(priceSetup.toFixed(2)),
      priceMonthly: Number(priceMonthly.toFixed(2)),
      commissionPercentage: Number(commissionPercentage.toFixed(2)),
      commissionValue: Number(((price * commissionPercentage) / 100).toFixed(2)),
      recurrentCommissionPercent: Number(body.recurrentCommissionPercent || 0),
      features: Array.isArray(body.features) ? body.features.slice(0, 50) : [],
      bannerImage: String(body.bannerImage || '').slice(0, 3000),
      badge: String(body.badge || '').slice(0, 80),
      categoryLabel: String(body.categoryLabel || '').slice(0, 80),
      checkoutSlug,
      slug: String(body.slug || checkoutSlug).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 100),
      paymentType: body.paymentType || 'Único',
      billingType: body.billingType || 'unico',
      allowAffiliates: body.allowAffiliates !== false && commissionPercentage > 0,
      status,
      active: status === 'Ativo',
      updatedAt: now,
      ...(existing.exists ? {} : { createdAt: now, affiliatesCount: 0, totalSales: 0, totalSalesCount: 0, totalRevenue: 0 }),
    };

    await planRef.set(payload, { merge: true });
    return res.status(200).json({ success: true, plan: { id: planId, ...payload } });
  } catch (error) {
    console.error('[Plans API]', error instanceof Error ? error.message : 'Falha desconhecida');
    return res.status(503).json({ error: 'Não foi possível salvar a oferta agora.' });
  }
}
