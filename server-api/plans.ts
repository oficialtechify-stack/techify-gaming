import { randomBytes } from 'node:crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { getServerAdminFirestore, verifyFirebaseIdentity } from '../lib/firebaseAdminServer.js';
import { applyVerificationRequest } from '../lib/profileEligibility.js';
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
const SUPPORTED_BILLING_CYCLES = new Set([
  'WEEKLY',
  'BIWEEKLY',
  'MONTHLY',
  'BIMONTHLY',
  'QUARTERLY',
  'SEMIANNUALLY',
  'YEARLY',
]);

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

const PAYMENT_METHODS = new Set(['PIX', 'CARD', 'BOLETO', 'APPLE_PAY', 'GOOGLE_PAY']);
const PIXEL_PROVIDERS = new Set(['none', 'meta', 'google', 'tiktok', 'custom']);
const AFFILIATE_APPROVAL_MODES = new Set(['automatic', 'manual']);
const AFFILIATE_ATTRIBUTIONS = new Set(['last_click', 'first_click']);
const CONFIRMATION_EMAIL_TIMINGS = new Set(['immediate', 'after_upsell']);

function clampNumber(value: unknown, min: number, max: number, fallback = 0): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function sanitizePaymentMethods(value: unknown, billingType: string): string[] {
  if (!Array.isArray(value)) return billingType === 'recorrente' ? ['CARD'] : ['PIX', 'CARD', 'BOLETO'];
  const methods = [...new Set(
    value
      .map((item) => String(item || '').trim().toUpperCase())
      .filter((item) => PAYMENT_METHODS.has(item))
  )].slice(0, 5);

  // Stripe recurring subscriptions currently use card rails in this flow.
  if (billingType === 'recorrente') {
    return methods.some((method) => method === 'CARD' || method === 'APPLE_PAY' || method === 'GOOGLE_PAY')
      ? methods.filter((method) => method === 'CARD' || method === 'APPLE_PAY' || method === 'GOOGLE_PAY')
      : ['CARD'];
  }

  return methods.length ? methods : ['PIX', 'CARD', 'BOLETO'];
}

function sanitizeOrderBumps(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 8).map((item, index) => {
    const raw = item && typeof item === 'object' ? item as Record<string, unknown> : {};
    const id = String(raw.id || `bump_${index + 1}`).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 80);
    return {
      id: id || `bump_${index + 1}`,
      name: String(raw.name || 'Order Bump').trim().slice(0, 120),
      description: String(raw.description || '').trim().slice(0, 600),
      price: Number(clampNumber(raw.price, 0.5, 100000, 0).toFixed(2)),
      active: raw.active !== false,
      image: normalizeBannerImage(raw.image),
    };
  }).filter((item) => Number(item.price || 0) >= 0.5);
}

function sanitizeUpsells(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 8).map((item, index) => {
    const raw = item && typeof item === 'object' ? item as Record<string, unknown> : {};
    const id = String(raw.id || `upsell_${index + 1}`).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 80);
    return {
      id: id || `upsell_${index + 1}`,
      name: String(raw.name || 'Upsell').trim().slice(0, 120),
      description: String(raw.description || '').trim().slice(0, 600),
      price: Number(clampNumber(raw.price, 0.5, 100000, 0).toFixed(2)),
      active: raw.active !== false,
    };
  }).filter((item) => Number(item.price || 0) >= 0.5);
}

function sanitizeCoupons(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const result: Array<Record<string, unknown>> = [];

  for (const item of value.slice(0, 30)) {
    const raw = item && typeof item === 'object' ? item as Record<string, unknown> : {};
    const code = String(raw.code || '')
      .toUpperCase()
      .replace(/[^A-Z0-9_-]/g, '')
      .slice(0, 40);
    if (!code || seen.has(code)) continue;
    seen.add(code);

    const discountType = raw.discountType === 'fixed' ? 'fixed' : 'percentage';
    const maxDiscount = discountType === 'percentage' ? 100 : 100000;
    result.push({
      id: String(raw.id || code).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 80) || code,
      code,
      discountType,
      discountValue: Number(clampNumber(raw.discountValue, 0.01, maxDiscount, 0).toFixed(2)),
      active: raw.active !== false,
      usedCount: Math.max(0, Math.floor(clampNumber(raw.usedCount, 0, 100000000, 0))),
      maxUses: Math.max(0, Math.floor(clampNumber(raw.maxUses, 0, 100000000, 0))),
      expiresAt: String(raw.expiresAt || '').trim().slice(0, 80),
    });
  }

  return result.filter((coupon) => Number(coupon.discountValue || 0) > 0);
}

function sanitizeCustomCheckouts(value: unknown, planId: string, defaultPrice: number, planName: string): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) return [];
  const seenSlugs = new Set<string>();
  return value.slice(0, 12).map((item, index) => {
    const raw = item && typeof item === 'object' ? item as Record<string, unknown> : {};
    let checkoutSlug = String(raw.checkoutSlug || `${planId}-${index + 1}`)
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '')
      .slice(0, 100);
    if (!checkoutSlug || seenSlugs.has(checkoutSlug)) checkoutSlug = `${planId}-${index + 1}`;
    seenSlugs.add(checkoutSlug);
    return {
      id: String(raw.id || `checkout_${index + 1}`).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 80) || `checkout_${index + 1}`,
      name: String(raw.name || (index === 0 ? 'Checkout Principal' : `Checkout ${index + 1}`)).trim().slice(0, 120),
      isDefault: index === 0 ? true : raw.isDefault === true,
      price: Number(clampNumber(raw.price, 0.5, 1000000, defaultPrice).toFixed(2)),
      offerName: String(raw.offerName || planName).trim().slice(0, 160),
      visitsCount: Math.max(0, Math.floor(clampNumber(raw.visitsCount, 0, 100000000, 0))),
      salesCount: Math.max(0, Math.floor(clampNumber(raw.salesCount, 0, 100000000, 0))),
      checkoutSlug,
      bannerImage: normalizeBannerImage(raw.bannerImage),
      timerMinutes: Math.max(0, Math.floor(clampNumber(raw.timerMinutes, 0, 1440, 0))),
      buttonText: String(raw.buttonText || 'Continuar para pagamento').trim().slice(0, 80),
    };
  });
}

function sanitizeCoproducers(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 10).map((item, index) => {
    const raw = item && typeof item === 'object' ? item as Record<string, unknown> : {};
    return {
      id: String(raw.id || `cop_${index + 1}`).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 80) || `cop_${index + 1}`,
      name: String(raw.name || 'Coprodutor').trim().slice(0, 160),
      email: String(raw.email || '').trim().toLowerCase().slice(0, 200),
      commissionPercentage: Number(clampNumber(raw.commissionPercentage, 0, 100, 0).toFixed(2)),
      status: raw.status === 'active' ? 'active' : 'pending',
      createdAt: String(raw.createdAt || new Date().toISOString()).slice(0, 80),
    };
  }).filter((item) => item.email && Number(item.commissionPercentage || 0) > 0);
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

    const requestedDeliveryUrl = safeHttpsUrl(body.deliveryUrl || body.thankYouPageUrl);
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
    const existingDelivery = existing.exists ? await deliveryRef.get() : null;
    const deliveryUrl = requestedDeliveryUrl || String(existingDelivery?.data()?.deliveryUrl || '');
    const resolvedDeliveryInstructions = body.deliveryInstructions !== undefined
      ? deliveryInstructions
      : String(existingDelivery?.data()?.deliveryInstructions || '').slice(0, 3000);

    if (!isPaymentLink && !deliveryUrl) {
      return res.status(400).json({ error: 'Informe uma URL HTTPS pública válida para a entrega do produto.' });
    }

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
    const paymentMethods = sanitizePaymentMethods(body.paymentMethods, billingType);
    const requestedDefaultPaymentMethod = String(body.defaultPaymentMethod || '').toUpperCase();
    const defaultPaymentMethod = paymentMethods.includes(requestedDefaultPaymentMethod)
      ? requestedDefaultPaymentMethod
      : paymentMethods[0];
    const orderBumps = sanitizeOrderBumps(body.orderBumps);
    const upsells = sanitizeUpsells(body.upsells);
    const coupons = sanitizeCoupons(body.coupons);
    const customCheckouts = sanitizeCustomCheckouts(body.customCheckouts, planId, priceSetup, name);
    const coproducers = sanitizeCoproducers(body.coproducers);
    const pixelProvider = PIXEL_PROVIDERS.has(String(body.pixelProvider || 'none'))
      ? String(body.pixelProvider || 'none')
      : 'none';
    const affiliateApprovalMode = AFFILIATE_APPROVAL_MODES.has(String(body.affiliateApprovalMode || 'automatic'))
      ? String(body.affiliateApprovalMode || 'automatic')
      : 'automatic';
    const affiliateAttribution = AFFILIATE_ATTRIBUTIONS.has(String(body.affiliateAttribution || 'last_click'))
      ? String(body.affiliateAttribution || 'last_click')
      : 'last_click';
    const confirmationEmailTiming = CONFIRMATION_EMAIL_TIMINGS.has(String(body.confirmationEmailTiming || 'immediate'))
      ? String(body.confirmationEmailTiming || 'immediate')
      : 'immediate';

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
      priceMonthly: billingType === 'recorrente'
        ? Number(clampNumber(body.priceMonthly ?? priceSetup, 0.5, 1000000, priceSetup).toFixed(2))
        : 0,
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
      supportEmail: String(body.supportEmail || '').trim().toLowerCase().slice(0, 200),
      warrantyDays: Math.floor(clampNumber(body.warrantyDays, 0, 365, 7)),
      paymentMethods,
      defaultPaymentMethod,
      maxInstallments: Math.floor(clampNumber(body.maxInstallments, 1, 12, 12)),
      affiliateApprovalMode,
      affiliateSupportEmail: String(body.affiliateSupportEmail || '').trim().toLowerCase().slice(0, 200),
      affiliateDescription: String(body.affiliateDescription || '').trim().slice(0, 3000),
      affiliateCookieDays: Math.floor(clampNumber(body.affiliateCookieDays, 1, 365, 30)),
      affiliateAttribution,
      affiliateMarketplaceVisible: body.affiliateMarketplaceVisible !== false,
      affiliateCommissionOnOrderBump: body.affiliateCommissionOnOrderBump !== false,
      affiliateCommissionOnUpsell: body.affiliateCommissionOnUpsell === true,
      pixelProvider,
      pixelId: String(body.pixelId || '').trim().slice(0, 180),
      pixelPurchaseEventEnabled: body.pixelPurchaseEventEnabled !== false,
      thankYouUpsellEnabled: body.thankYouUpsellEnabled === true,
      upsellIgnoreOrderBumpFailure: body.upsellIgnoreOrderBumpFailure === true,
      confirmationEmailEnabled: body.confirmationEmailEnabled !== false,
      confirmationEmailTiming,
      orderBumps,
      upsells,
      coupons,
      customCheckouts,
      coproducers,
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
      deliveryInstructions: isPaymentLink ? '' : resolvedDeliveryInstructions,
      updatedAt: now,
      ...(existing.exists ? {} : { createdAt: now }),
    };

    const batch = db.batch();
    batch.set(planRef, payload, { merge: true });
    batch.set(deliveryRef, privateDelivery, { merge: true });

    const previousCoupons = Array.isArray(existing.data()?.coupons) ? existing.data()!.coupons as Array<Record<string, any>> : [];
    const nextCouponCodes = new Set(coupons.map((coupon) => String(coupon.code || '')));
    for (const previousCoupon of previousCoupons) {
      const previousCode = String(previousCoupon.code || '').toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 40);
      if (previousCode && !nextCouponCodes.has(previousCode)) {
        batch.delete(db.collection('coupons').doc(`${companyId}_${previousCode}`));
      }
    }
    for (const coupon of coupons) {
      const code = String(coupon.code || '');
      if (!code) continue;
      const couponRef = db.collection('coupons').doc(`${companyId}_${code}`);
      const existingCoupon = previousCoupons.find((item) => String(item.code || '').toUpperCase() === code);
      batch.set(couponRef, {
        id: `${companyId}_${code}`,
        companyId,
        code,
        discountType: coupon.discountType,
        value: coupon.discountValue,
        maxUses: coupon.maxUses || 0,
        usedCount: Number(existingCoupon?.usedCount || coupon.usedCount || 0),
        expiresAt: coupon.expiresAt || '',
        status: coupon.active === false ? 'paused' : 'active',
        applicablePlans: [planId],
        applicablePlansNames: [name],
        applicableAffiliates: ['all'],
        applicableAffiliatesNames: ['Todos os afiliados'],
        updatedAt: now,
        ...(existingCoupon ? {} : { createdAt: now }),
      }, { merge: true });
    }

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
