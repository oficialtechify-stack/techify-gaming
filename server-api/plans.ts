import { randomBytes } from 'node:crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { getServerAdminFirestore, verifyFirebaseIdentity } from '../lib/firebaseAdminServer.js';
import { applyVerificationRequest, profileHasRole, profileRoleIsApproved } from '../lib/profileEligibility.js';

type RequestLike = {
  method?: string;
  body?: unknown;
  query?: Record<string, string | string[] | undefined>;
  headers: Record<string, string | string[] | undefined>;
};
type ResponseLike = {
  setHeader(name: string, value: string): void;
  status(code: number): ResponseLike;
  json(body: unknown): unknown;
};

const SUPPORTED_DELIVERY_TYPES = new Set(['redirect', 'whatsapp', 'membership', 'download']);

function slugify(input: string): string {
  const clean = input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 70);
  return `${clean || 'oferta'}-${randomBytes(4).toString('hex')}`;
}

function safeHttpsUrl(value: unknown): string {
  const raw = String(value || '').trim();
  if (!raw) return '';
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:') return '';
    if (['localhost', '127.0.0.1', '::1'].includes(url.hostname)) return '';
    return url.toString().slice(0, 3000);
  } catch {
    return '';
  }
}

function normalizeBannerImage(value: unknown): string {
  const raw = String(value || '').trim();
  if (!raw) return '';

  if (/^https:\/\//i.test(raw)) {
    return raw.slice(0, 3000);
  }

  if (/^data:image\/(?:png|jpeg|jpg|webp);base64,/i.test(raw) && raw.length <= 600_000) {
    return raw;
  }

  return '';
}

function sanitizeFeatures(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item || '').trim().slice(0, 180))
    .filter(Boolean)
    .slice(0, 30);
}

export default async function handler(req: RequestLike, res: ResponseLike) {
  res.setHeader('Cache-Control', 'no-store');

  try {
    const db = getServerAdminFirestore();

    if (req.method === 'GET') {
      const includeDelivery = req.query?.includeDelivery === '1';
      const planId = typeof req.query?.planId === 'string' ? req.query.planId.trim() : '';

      if (includeDelivery) {
        if (!planId) return res.status(400).json({ error: 'planId é obrigatório.' });

        const identity = await verifyFirebaseIdentity(
          typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined,
        );
        const planSnap = await db.collection('plans').doc(planId).get();
        if (!planSnap.exists) return res.status(404).json({ error: 'Oferta não encontrada.' });

        const plan = planSnap.data()!;
        if (String(plan.ownerId || '') !== identity.uid) {
          return res.status(403).json({ error: 'Você não pode acessar a configuração privada desta oferta.' });
        }

        const deliverySnap = await db.collection('plan_delivery').doc(planId).get();
        const delivery = deliverySnap.exists
          ? deliverySnap.data()
          : {
              deliveryType: plan.deliveryType || 'redirect',
              deliveryUrl: plan.deliveryUrl || plan.thankYouPageUrl || '',
              deliveryInstructions: plan.deliveryInstructions || '',
            };

        return res.status(200).json({
          success: true,
          delivery: {
            deliveryType: String(delivery?.deliveryType || 'redirect'),
            deliveryUrl: String(delivery?.deliveryUrl || ''),
            deliveryInstructions: String(delivery?.deliveryInstructions || ''),
          },
        });
      }

      const companyId = typeof req.query?.companyId === 'string' ? req.query.companyId.trim() : '';
      let queryRef: FirebaseFirestore.Query = db.collection('plans');
      if (companyId) queryRef = queryRef.where('companyId', '==', companyId);
      const snap = await queryRef.limit(200).get();
      const plans = snap.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((plan: any) => plan.status === 'Ativo' && plan.active !== false);
      return res.status(200).json({ success: true, plans });
    }

    if (req.method !== 'POST' && req.method !== 'PUT') {
      return res.status(405).json({ error: 'Método não permitido.' });
    }

    const authHeader = typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined;
    const identity = await verifyFirebaseIdentity(authHeader);
    const body = req.body && typeof req.body === 'object' ? (req.body as Record<string, any>) : {};

    const companyId = String(body.companyId || '').trim();
    const name = String(body.name || '').trim().slice(0, 160);
    if (!companyId || !name) {
      return res.status(400).json({ error: 'Empresa e nome da oferta são obrigatórios.' });
    }

    const [profileSnap, requestSnap, companySnap] = await Promise.all([
      db.collection('user_profiles').doc(identity.uid).get(),
      db.collection('verification_requests').doc(identity.uid).get(),
      db.collection('companies').doc(companyId).get(),
    ]);

    if (!profileSnap.exists || !companySnap.exists) {
      return res.status(404).json({ error: 'Perfil ou empresa não encontrados.' });
    }

    const profile = applyVerificationRequest(
      profileSnap.data()!,
      requestSnap.exists ? requestSnap.data()! : null,
    ) as Record<string, any>;

    if (!profileHasRole(profile, 'empresa') || !profileRoleIsApproved(profile, 'empresa')) {
      return res.status(403).json({ error: 'A conta Empresa precisa estar aprovada para publicar ofertas.' });
    }

    const company = companySnap.data()!;
    if (
      String(company.ownerId || company.submittedBy || '') !== identity.uid ||
      company.verified !== true ||
      company.status !== 'approved' ||
      company.archived === true ||
      company.isArchived === true
    ) {
      return res.status(403).json({ error: 'Esta empresa não está habilitada para publicar ofertas.' });
    }

    const billingType = String(body.billingType || 'unico').toLowerCase();
    if (billingType !== 'unico') {
      return res.status(400).json({
        error: 'Assinatura recorrente para produtos de empresas ainda não está disponível. Use pagamento único.',
        code: 'RECURRING_PRODUCT_NOT_AVAILABLE',
      });
    }

    const priceSetup = Number(body.priceSetup ?? body.price ?? 0);
    const commissionPercentage = Number(body.commissionPercentage ?? 0);

    if (!Number.isFinite(priceSetup) || priceSetup < 0.5 || priceSetup > 1_000_000) {
      return res.status(400).json({ error: 'Informe um preço entre R$ 0,50 e R$ 1.000.000,00.' });
    }
    if (!Number.isFinite(commissionPercentage) || commissionPercentage <= 0 || commissionPercentage > 100) {
      return res.status(400).json({ error: 'A comissão do afiliado deve ficar entre 0,01% e 100%.' });
    }

    const description = String(body.description || '').trim().slice(0, 5000);
    if (description.length < 10) {
      return res.status(400).json({ error: 'Descreva o produto com pelo menos 10 caracteres.' });
    }

    const deliveryType = String(body.deliveryType || 'redirect').trim();
    if (!SUPPORTED_DELIVERY_TYPES.has(deliveryType)) {
      return res.status(400).json({
        error: 'Escolha um método de entrega disponível: redirecionamento, WhatsApp, área de membros ou download.',
      });
    }

    const deliveryUrl = safeHttpsUrl(body.deliveryUrl || body.thankYouPageUrl);
    if (!deliveryUrl) {
      return res.status(400).json({ error: 'Informe uma URL HTTPS pública válida para a entrega do produto.' });
    }

    const deliveryInstructions = String(body.deliveryInstructions || '').trim().slice(0, 3000);
    const bannerImage = normalizeBannerImage(body.bannerImage);
    if (body.bannerImage && !bannerImage) {
      return res.status(400).json({
        error: 'A imagem é inválida ou ficou grande demais. Envie JPG, PNG ou WebP compactado.',
      });
    }

    const requestedId = String(body.id || '').trim();
    const planId =
      requestedId && /^[A-Za-z0-9_-]{1,150}$/.test(requestedId)
        ? requestedId
        : `plan_${Date.now()}_${randomBytes(4).toString('hex')}`;

    const planRef = db.collection('plans').doc(planId);
    const deliveryRef = db.collection('plan_delivery').doc(planId);
    const existing = await planRef.get();

    if (
      existing.exists &&
      (String(existing.data()!.companyId || '') !== companyId ||
        String(existing.data()!.ownerId || '') !== identity.uid)
    ) {
      return res.status(403).json({ error: 'Esta oferta pertence a outra empresa.' });
    }

    const status = body.status === 'Pausado' ? 'Pausado' : 'Ativo';
    const now = new Date().toISOString();
    const checkoutSlug = String(body.checkoutSlug || existing.data()?.checkoutSlug || slugify(name))
      .replace(/[^A-Za-z0-9_-]/g, '')
      .slice(0, 100);

    const features = sanitizeFeatures(body.features);
    const payload: Record<string, any> = {
      companyId,
      companyName: String(company.name || company.companyName || '').slice(0, 160),
      companyLogo: String(company.logo || '').slice(0, 2000),
      ownerId: identity.uid,
      name,
      tagline: String(body.tagline || name).trim().slice(0, 200),
      description,
      category: String(body.category || company.category || 'Digital').trim().slice(0, 120),
      price: Number(priceSetup.toFixed(2)),
      priceSetup: Number(priceSetup.toFixed(2)),
      priceMonthly: 0,
      commissionPercentage: Number(commissionPercentage.toFixed(2)),
      commissionValue: Number(((priceSetup * commissionPercentage) / 100).toFixed(2)),
      recurrentCommissionPercent: 0,
      recurrentCommissionValue: 0,
      recurrentCommission: 0,
      features,
      bannerImage,
      badge: String(body.badge || '').trim().slice(0, 25),
      checkoutSlug,
      slug: String(body.slug || checkoutSlug).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 100),
      paymentType: 'Único',
      billingType: 'unico',
      deliveryType,
      deliveryConfigured: true,
      allowAffiliates: true,
      status,
      active: status === 'Ativo',
      updatedAt: now,

      // Configuração de entrega é privada e não fica no documento público do catálogo.
      deliveryUrl: FieldValue.delete(),
      thankYouPageUrl: FieldValue.delete(),
      deliveryInstructions: FieldValue.delete(),
      deliveryFileUrl: FieldValue.delete(),
      deliveryWebhookUrl: FieldValue.delete(),
      deliveryApiKeySecret: FieldValue.delete(),

      ...(existing.exists
        ? {}
        : {
            createdAt: now,
            affiliatesCount: 0,
            totalSales: 0,
            totalSalesCount: 0,
            totalRevenue: 0,
          }),
    };

    const privateDelivery = {
      planId,
      companyId,
      ownerId: identity.uid,
      deliveryType,
      deliveryUrl,
      deliveryInstructions,
      updatedAt: now,
      ...(existing.exists ? {} : { createdAt: now }),
    };

    const batch = db.batch();
    batch.set(planRef, payload, { merge: true });
    batch.set(deliveryRef, privateDelivery, { merge: true });
    await batch.commit();

    const savedPlanSnap = await planRef.get();
    const savedPlan = savedPlanSnap.exists ? savedPlanSnap.data() || {} : {};

    return res.status(200).json({
      success: true,
      plan: {
        id: planId,
        ...savedPlan,
        deliveryType,
        deliveryUrl,
        deliveryInstructions,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha desconhecida';
    console.error('[Plans API]', message);
    if (/Firebase ID token|token inválido|auth\/id-token/i.test(message)) {
      return res.status(401).json({ error: 'Sua sessão expirou. Entre novamente.' });
    }
    return res.status(503).json({ error: 'Não foi possível salvar a oferta agora.' });
  }
}
