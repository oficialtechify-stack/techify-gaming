import { randomBytes } from 'node:crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { getServerAdminFirestore, verifyFirebaseIdentity } from '../lib/firebaseAdminServer.js';
import { applyVerificationRequest, profileHasRole, profileRoleIsApproved } from '../lib/profileEligibility.js';
import { getStripeTestClient } from '../lib/stripeServer.js';

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
const SUPPORTED_BILLING_CYCLES = new Set(['WEEKLY', 'MONTHLY', 'YEARLY']);

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

      const lookup = typeof req.query?.lookup === 'string' ? req.query.lookup.trim() : '';
      if (lookup) {
        if (!/^[A-Za-z0-9_-]{1,150}$/.test(lookup)) {
          return res.status(400).json({ error: 'Identificador de produto inválido.' });
        }

        let productDoc = await db.collection('plans').doc(lookup).get();

        if (!productDoc.exists) {
          const byCheckoutSlug = await db.collection('plans')
            .where('checkoutSlug', '==', lookup)
            .limit(1)
            .get();
          productDoc = byCheckoutSlug.docs[0] || productDoc;
        }

        if (!productDoc.exists) {
          const bySlug = await db.collection('plans')
            .where('slug', '==', lookup)
            .limit(1)
            .get();
          productDoc = bySlug.docs[0] || productDoc;
        }

        if (!productDoc.exists) {
          return res.status(404).json({ error: 'Produto não encontrado.' });
        }

        const plan = productDoc.data()!;
        if (
          plan.active === false ||
          String(plan.status || '').toLowerCase() !== 'ativo' ||
          plan.archived === true ||
          plan.isArchived === true
        ) {
          return res.status(404).json({ error: 'Produto indisponível.' });
        }

        const productCompanyId = String(plan.companyId || '').trim();
        if (!productCompanyId) {
          return res.status(404).json({ error: 'Produto indisponível.' });
        }

        const companySnap = await db.collection('companies').doc(productCompanyId).get();
        if (!companySnap.exists) {
          return res.status(404).json({ error: 'Produto indisponível.' });
        }

        const company = companySnap.data()!;
        if (
          company.verified !== true ||
          String(company.status || '').toLowerCase() !== 'approved' ||
          company.archived === true ||
          company.isArchived === true ||
          company.banned === true
        ) {
          return res.status(404).json({ error: 'Produto indisponível.' });
        }

        return res.status(200).json({
          success: true,
          plan: { id: productDoc.id, ...plan },
        });
      }

      const companyId = typeof req.query?.companyId === 'string' ? req.query.companyId.trim() : '';
      let queryRef: FirebaseFirestore.Query = db.collection('plans');
      if (companyId) queryRef = queryRef.where('companyId', '==', companyId);
      const snap = await queryRef.limit(200).get();
      const candidates = snap.docs
        .map((doc) => ({ id: doc.id, ...doc.data() } as Record<string, any>))
        .filter((plan) =>
          String(plan.status || '').toLowerCase() === 'ativo' &&
          plan.active !== false &&
          plan.archived !== true &&
          plan.isArchived !== true
        );

      const companyIds = [...new Set(candidates.map((plan) => String(plan.companyId || '')).filter(Boolean))];
      const companyStates = new Map<string, boolean>();
      await Promise.all(companyIds.map(async (id) => {
        const companySnap = await db.collection('companies').doc(id).get();
        const company = companySnap.exists ? companySnap.data()! : null;
        companyStates.set(id, Boolean(
          company &&
          company.verified === true &&
          String(company.status || '').toLowerCase() === 'approved' &&
          company.archived !== true &&
          company.isArchived !== true &&
          company.banned !== true
        ));
      }));

      const plans = candidates.filter((plan) => companyStates.get(String(plan.companyId || '')) === true);
      return res.status(200).json({ success: true, plans });
    }

    if (req.method === 'DELETE') {
      const authHeader = typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined;
      const identity = await verifyFirebaseIdentity(authHeader);
      const body = req.body && typeof req.body === 'object' ? (req.body as Record<string, any>) : {};
      const planId = String(body.planId || body.id || '').trim();

      if (!/^[A-Za-z0-9_-]{1,150}$/.test(planId)) {
        return res.status(400).json({ error: 'Produto inválido.' });
      }

      const planRef = db.collection('plans').doc(planId);
      const planSnap = await planRef.get();
      if (!planSnap.exists) return res.status(404).json({ error: 'Produto não encontrado.' });

      const plan = planSnap.data()!;
      const companyId = String(plan.companyId || '').trim();

      if (plan.archived === true || plan.isArchived === true) {
        return res.status(200).json({ success: true, archived: true, planId, companyId });
      }
      const companySnap = companyId ? await db.collection('companies').doc(companyId).get() : null;
      if (
        String(plan.ownerId || '') !== identity.uid ||
        !companySnap?.exists ||
        String(companySnap.data()!.ownerId || companySnap.data()!.submittedBy || '') !== identity.uid
      ) {
        return res.status(403).json({ error: 'Este produto não pertence à empresa desta conta.' });
      }

      const [activeFlag, activeStatus, trialingStatus, pastDueStatus] = await Promise.all([
        db.collection('product_subscriptions').where('planId', '==', planId).where('active', '==', true).limit(1).get(),
        db.collection('product_subscriptions').where('planId', '==', planId).where('status', '==', 'active').limit(1).get(),
        db.collection('product_subscriptions').where('planId', '==', planId).where('status', '==', 'trialing').limit(1).get(),
        db.collection('product_subscriptions').where('planId', '==', planId).where('status', '==', 'past_due').limit(1).get(),
      ]);

      const hasActiveSubscription =
        !activeFlag.empty ||
        !activeStatus.empty ||
        !trialingStatus.empty ||
        !pastDueStatus.empty;

      if (hasActiveSubscription) {
        return res.status(409).json({
          error: 'Este produto possui assinaturas ativas. Cancele as renovações antes de arquivar o produto.',
          code: 'ACTIVE_SUBSCRIPTIONS_EXIST',
        });
      }

      const now = new Date().toISOString();
      const batch = db.batch();
      batch.set(planRef, {
        active: false,
        status: 'Pausado',
        archived: true,
        archivedAt: now,
        updatedAt: now,
      }, { merge: true });

      batch.set(companySnap.ref, {
        totalPlansCount: FieldValue.increment(-1),
        updatedAt: now,
      }, { merge: true });

      const affiliationSnap = await db.collection('affiliations')
        .where('planId', '==', planId)
        .limit(400)
        .get();

      for (const affiliation of affiliationSnap.docs) {
        batch.set(affiliation.ref, {
          status: 'Encerrada',
          endedAt: now,
          updatedAt: now,
        }, { merge: true });
      }

      await batch.commit();
      return res.status(200).json({ success: true, archived: true, planId, companyId });
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

    const rawProfile = profileSnap.data()! as Record<string, any>;
    const requestedProfile = applyVerificationRequest(
      rawProfile,
      requestSnap.exists ? requestSnap.data()! : null,
    ) as Record<string, any>;

    const company = companySnap.data()!;
    const companyApproved =
      String(company.ownerId || company.submittedBy || '') === identity.uid &&
      company.verified === true &&
      String(company.status || '').toLowerCase() === 'approved' &&
      company.archived !== true &&
      company.isArchived !== true &&
      company.banned !== true;

    if (!companyApproved) {
      return res.status(403).json({ error: 'Esta empresa não está habilitada para publicar ofertas.' });
    }

    const profileCompanyId = String(rawProfile.companyId || requestedProfile.companyId || '').trim();
    if (profileCompanyId && profileCompanyId !== companyId) {
      return res.status(403).json({ error: 'Este produto só pode pertencer à empresa vinculada a esta conta.' });
    }

    // A empresa canônica aprovada é a fonte de verdade. Pedidos antigos de
    // verificação não podem rebaixar o perfil e bloquear produtos já homologados.
    const currentType = String(rawProfile.accountType || '').toLowerCase();
    const repairedAccountType =
      currentType === 'admin'
        ? 'admin'
        : currentType === 'afiliado' || rawProfile.hasAffiliateProfile === true
          ? 'ambos'
          : currentType === 'ambos'
            ? 'ambos'
            : 'empresa';
    const approvalRepair = {
      companyId,
      companyName: company.name || company.companyName || rawProfile.companyName || null,
      hasCompanyProfile: true,
      accountType: repairedAccountType,
      verified: true,
      verificationStatus: 'approved',
      empresaVerificationStatus: 'approved',
      companyVerificationStatus: 'approved',
      kyc_status: 'verified',
      updatedAt: new Date().toISOString(),
    };

    const profile = { ...requestedProfile, ...approvalRepair } as Record<string, any>;

    if (!profileHasRole(profile, 'empresa') || !profileRoleIsApproved(profile, 'empresa')) {
      return res.status(403).json({ error: 'Não foi possível sincronizar a aprovação da Empresa. Atualize a página e tente novamente.' });
    }

    if (
      rawProfile.companyId !== companyId ||
      rawProfile.empresaVerificationStatus !== 'approved' ||
      rawProfile.companyVerificationStatus !== 'approved' ||
      rawProfile.verified !== true
    ) {
      await Promise.all([
        db.collection('user_profiles').doc(identity.uid).set(approvalRepair, { merge: true }),
        db.collection('users').doc(identity.uid).set(approvalRepair, { merge: true }),
      ]);
    }

    const requestedBillingType = String(body.billingType || 'unico').toLowerCase();
    const billingType = requestedBillingType === 'recorrente'
      ? 'recorrente'
      : requestedBillingType === 'avulso'
        ? 'avulso'
        : 'unico';
    const isPaymentLink = billingType === 'avulso';
    const billingCycle = billingType === 'recorrente'
      ? String(body.billingCycle || 'MONTHLY').toUpperCase()
      : '';
    if (billingType === 'recorrente' && !SUPPORTED_BILLING_CYCLES.has(billingCycle)) {
      return res.status(400).json({ error: 'Escolha uma recorrência semanal, mensal ou anual.' });
    }

    const priceSetup = Number(body.priceSetup ?? body.price ?? body.priceMonthly ?? 0);
    const commissionPercentage = Number(body.commissionPercentage ?? 0);
    const recurringCommissionEnabled = billingType === 'recorrente' && body.recurringCommissionEnabled !== false;
    const recurrentCommissionPercent = recurringCommissionEnabled
      ? Number(body.recurrentCommissionPercent ?? commissionPercentage)
      : 0;

    if (!Number.isFinite(priceSetup) || priceSetup < 0.5 || priceSetup > 1_000_000) {
      return res.status(400).json({ error: 'Informe um preço entre R$ 0,50 e R$ 1.000.000,00.' });
    }
    const allowAffiliates = isPaymentLink ? false : body.allowAffiliates !== false;
    if (
      !Number.isFinite(commissionPercentage) ||
      commissionPercentage < 0 ||
      commissionPercentage > 100 ||
      (allowAffiliates && commissionPercentage <= 0)
    ) {
      return res.status(400).json({
        error: allowAffiliates
          ? 'A comissão do afiliado deve ficar entre 0,01% e 100%.'
          : 'A comissão informada é inválida.',
      });
    }
    if (
      billingType === 'recorrente' &&
      recurringCommissionEnabled &&
      (!Number.isFinite(recurrentCommissionPercent) || recurrentCommissionPercent <= 0 || recurrentCommissionPercent > 100)
    ) {
      return res.status(400).json({ error: 'A comissão nas renovações deve ficar entre 0,01% e 100%.' });
    }

    const requestedStatus = body.status === 'Pausado' ? 'Pausado' : 'Ativo';
    if (requestedStatus === 'Ativo') {
      const companyAccountId = String(
        profile.stripeAccounts?.empresa ||
        company.stripeAccountId ||
        ''
      ).trim();

      if (!companyAccountId) {
        return res.status(409).json({
          error: 'Conecte a conta Stripe da empresa antes de publicar um produto ativo.',
          code: 'COMPANY_CONNECT_NOT_CONFIGURED',
        });
      }

      try {
        const stripe = getStripeTestClient();
        let account = await stripe.accounts.retrieve(companyAccountId);

        if (
          account.metadata?.firebase_uid !== identity.uid ||
          account.metadata?.leadspay_role !== 'empresa' ||
          (account.metadata?.leadspay_company_id && account.metadata.leadspay_company_id !== companyId)
        ) {
          return res.status(409).json({
            error: 'A conta Stripe vinculada não corresponde a esta empresa.',
            code: 'COMPANY_CONNECT_MISMATCH',
          });
        }

        if (!account.metadata?.leadspay_company_id) {
          account = await stripe.accounts.update(companyAccountId, {
            metadata: {
              ...account.metadata,
              firebase_uid: identity.uid,
              leadspay_role: 'empresa',
              leadspay_company_id: companyId,
            },
          });
        }

        const ready =
          account.details_submitted === true &&
          account.payouts_enabled === true &&
          account.capabilities?.transfers === 'active';

        if (!ready) {
          return res.status(409).json({
            error: 'Finalize o onboarding da Stripe Connect antes de publicar o produto.',
            code: 'COMPANY_CONNECT_NOT_READY',
          });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : '';
        if (/COMPANY_CONNECT/.test(message)) throw error;
        return res.status(503).json({
          error: 'Não foi possível confirmar a conta Stripe da empresa agora. Tente novamente.',
          code: 'COMPANY_CONNECT_CHECK_FAILED',
        });
      }
    }

    const description = String(body.description || '').trim().slice(0, 5000);
    if (description.length < 10) {
      return res.status(400).json({ error: 'Descreva o produto com pelo menos 10 caracteres.' });
    }

    const deliveryType = String(body.deliveryType || 'redirect').trim();
    if (!isPaymentLink && !SUPPORTED_DELIVERY_TYPES.has(deliveryType)) {
      return res.status(400).json({
        error: 'Escolha um método de entrega disponível: redirecionamento, WhatsApp, área de membros ou download.',
      });
    }

    const deliveryUrl = safeHttpsUrl(body.deliveryUrl || body.thankYouPageUrl);
    if (!isPaymentLink && !deliveryUrl) {
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

    const status = requestedStatus;
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
      priceMonthly: billingType === 'recorrente' ? Number(priceSetup.toFixed(2)) : 0,
      commissionPercentage: Number(commissionPercentage.toFixed(2)),
      commissionValue: Number(((priceSetup * commissionPercentage) / 100).toFixed(2)),
      recurrentCommissionPercent: billingType === 'recorrente' ? Number(recurrentCommissionPercent.toFixed(2)) : 0,
      recurrentCommissionValue: billingType === 'recorrente'
        ? Number(((priceSetup * recurrentCommissionPercent) / 100).toFixed(2))
        : 0,
      recurrentCommission: billingType === 'recorrente' ? Number(recurrentCommissionPercent.toFixed(2)) : 0,
      recurringCommissionEnabled,
      features,
      bannerImage,
      badge: String(body.badge || '').trim().slice(0, 25),
      checkoutSlug,
      slug: String(body.slug || checkoutSlug).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 100),
      paymentType: billingType === 'recorrente' ? 'Recorrente' : 'Único',
      billingType,
      billingCycle: billingType === 'recorrente' ? billingCycle : FieldValue.delete(),
      billingInterval: billingType === 'recorrente'
        ? (billingCycle === 'WEEKLY' ? 'weekly' : billingCycle === 'YEARLY' ? 'yearly' : 'monthly')
        : FieldValue.delete(),
      deliveryType: isPaymentLink ? 'redirect' : deliveryType,
      deliveryConfigured: !isPaymentLink,
      allowAffiliates,
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
      deliveryType: isPaymentLink ? 'redirect' : deliveryType,
      deliveryUrl: isPaymentLink ? '' : deliveryUrl,
      deliveryInstructions: isPaymentLink ? '' : deliveryInstructions,
      updatedAt: now,
      ...(existing.exists ? {} : { createdAt: now }),
    };

    const batch = db.batch();
    batch.set(planRef, payload, { merge: true });
    batch.set(deliveryRef, privateDelivery, { merge: true });
    if (!existing.exists) {
      batch.set(companySnap.ref, {
        totalPlansCount: FieldValue.increment(1),
        updatedAt: now,
      }, { merge: true });
    }
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
