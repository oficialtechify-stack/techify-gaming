import { createHash } from 'node:crypto';
import { getServerAdminFirestore } from './firebaseAdminServer.js';
import { getLeadspayBaseUrl } from './stripeServer.js';
import { applyVerificationRequest, profileHasRole, profileRoleIsApproved } from './profileEligibility.js';
import { releaseDelayDays, roleAvailableCentsField, rolePendingCentsField, type PlatformRole } from './platformBilling.js';

export type McpActionName =
  | 'get_balance'
  | 'list_products'
  | 'create_coupon'
  | 'list_coupons'
  | 'create_checkout'
  | 'get_affiliations'
  | 'get_affiliate_performance'
  | 'list_affiliate_coupons';

export type McpPrincipal = {
  userId: string;
  keyId: string;
  companyId: string;
  profile: Record<string, any>;
  approvedRoles: PlatformRole[];
  preferredRole?: PlatformRole;
  scopes: string[];
};

export const MCP_TOOLS = [
  {
    name: 'get_balance',
    description: 'Consulta o saldo disponível e pendente da conta LeadsPay autenticada.',
    inputSchema: {
      type: 'object',
      properties: {
        role: { type: 'string', enum: ['empresa', 'afiliado'], description: 'Perfil financeiro a consultar quando a conta possui mais de um papel.' }
      },
      additionalProperties: false,
    },
  },
  {
    name: 'list_products',
    description: 'Lista ofertas ativas. Afiliados recebem o marketplace; empresas recebem suas próprias ofertas.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'integer', minimum: 1, maximum: 50, default: 15 },
        scope: { type: 'string', enum: ['auto', 'mine', 'marketplace'], default: 'auto' }
      },
      additionalProperties: false,
    },
  },
  {
    name: 'create_coupon',
    description: 'Cria ou atualiza um cupom da empresa autenticada. Requer perfil Empresa aprovado.',
    inputSchema: {
      type: 'object',
      required: ['code', 'discount'],
      properties: {
        code: { type: 'string', minLength: 3, maxLength: 40 },
        discount: { type: 'number', exclusiveMinimum: 0 },
        discountType: { type: 'string', enum: ['percentage', 'fixed'], default: 'percentage' },
        maxUses: { type: 'integer', minimum: 0, default: 100 },
        expiresAt: { type: 'string', description: 'Data ISO ou DD/MM/AAAA.' },
        planId: { type: 'string', description: 'ID de uma oferta da empresa ou "all".' }
      },
      additionalProperties: false,
    },
  },
  {
    name: 'list_coupons',
    description: 'Lista os cupons cadastrados pela empresa autenticada.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'create_checkout',
    description: 'Gera um link de checkout oficial para uma oferta existente. Afiliados só recebem seu próprio código de afiliação ativo.',
    inputSchema: {
      type: 'object',
      required: ['productId'],
      properties: {
        productId: { type: 'string', minLength: 1, maxLength: 150 },
        couponCode: { type: 'string', maxLength: 40 }
      },
      additionalProperties: false,
    },
  },
  {
    name: 'get_affiliations',
    description: 'Retorna as afiliações ativas do afiliado autenticado e seus links oficiais.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'get_affiliate_performance',
    description: 'Resume o desempenho real do afiliado: vendas, comissões, cliques, conversão, recorrência e principais origens de tráfego.',
    inputSchema: {
      type: 'object',
      properties: {
        days: { type: 'integer', minimum: 1, maximum: 365, default: 30 }
      },
      additionalProperties: false,
    },
  },
  {
    name: 'list_affiliate_coupons',
    description: 'Lista somente os cupons atualmente liberados para as afiliações ativas do afiliado e devolve links oficiais com código e cupom.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
] as const;

function normalizeRole(value: unknown): PlatformRole | undefined {
  return value === 'empresa' || value === 'afiliado' ? value : undefined;
}

function cleanCouponCode(value: unknown): string {
  return String(value || '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 40);
}

function formatBRL(value: number): string {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function normalizeExpiry(value: unknown): string {
  const raw = String(value || '').trim();
  if (!raw) return new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

  const br = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) {
    const iso = new Date(`${br[3]}-${br[2]}-${br[1]}T23:59:59.999Z`);
    if (Number.isFinite(iso.getTime())) return iso.toISOString();
  }

  const parsed = new Date(raw);
  if (!Number.isFinite(parsed.getTime())) throw new Error('Data de expiração inválida. Use ISO ou DD/MM/AAAA.');
  return parsed.toISOString();
}

function activeState(value: unknown): boolean {
  const state = String(value || '').trim().toLowerCase();
  return state === 'ativo' || state === 'active' || state === 'approved';
}

function approvedSaleState(value: unknown): boolean {
  return ['aprovado', 'approved', 'liberado', 'received', 'confirmed'].includes(
    String(value || '').trim().toLowerCase(),
  );
}

function dateMillis(value: unknown): number {
  if (!value) return 0;
  if (typeof value === 'object' && value !== null) {
    const maybe = value as Record<string, any>;
    if (typeof maybe.toMillis === 'function') {
      const ms = Number(maybe.toMillis());
      return Number.isFinite(ms) ? ms : 0;
    }
    if (Number.isFinite(Number(maybe._seconds))) return Number(maybe._seconds) * 1000;
    if (Number.isFinite(Number(maybe.seconds))) return Number(maybe.seconds) * 1000;
  }
  const parsed = Date.parse(String(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

function profileScopes(roles: PlatformRole[]): string[] {
  const scopes = new Set<string>(['balance:read', 'products:read', 'checkout:create']);
  if (roles.includes('afiliado')) scopes.add('affiliations:read');
  if (roles.includes('empresa')) {
    scopes.add('coupons:read');
    scopes.add('coupons:write');
    scopes.add('payments:create');
  }
  return [...scopes];
}

export async function authenticateMcpApiKey(rawKey: string): Promise<McpPrincipal> {
  const key = String(rawKey || '').trim();
  if (!/^lp_(live|test)_[A-Za-z0-9_-]{20,}$/.test(key)) throw new Error('API Key inválida.');

  const isProduction = process.env.VERCEL_ENV === 'production';
  if (isProduction && !key.startsWith('lp_live_')) throw new Error('Use uma chave lp_live_ no ambiente de produção.');
  if (!isProduction && key.startsWith('lp_live_')) throw new Error('Chaves live não são aceitas fora da produção.');

  const db = getServerAdminFirestore();
  const keyHash = createHash('sha256').update(key).digest('hex');
  const keyQuery = await db.collection('partner_api_keys').where('keyHash', '==', keyHash).limit(2).get();
  if (keyQuery.empty) throw new Error('API Key inválida ou revogada.');

  const keyDoc = keyQuery.docs.find((doc) => doc.data().active === true);
  if (!keyDoc) throw new Error('API Key inválida ou revogada.');
  const keyData = keyDoc.data() as Record<string, any>;
  const userId = String(keyData.userId || '').trim();
  if (!userId) throw new Error('API Key sem proprietário válido.');

  const [profileSnap, requestSnap] = await Promise.all([
    db.collection('user_profiles').doc(userId).get(),
    db.collection('verification_requests').doc(userId).get(),
  ]);
  if (!profileSnap.exists) throw new Error('Perfil da API Key não foi encontrado.');

  const rawProfile = profileSnap.data()!;
  const profile = applyVerificationRequest(rawProfile, requestSnap.exists ? requestSnap.data()! : null) as Record<string, any>;
  if (profile.banned === true || profile.archived === true || profile.isArchived === true || ['banned', 'archived'].includes(String(profile.status || '').toLowerCase())) {
    throw new Error('A conta vinculada a esta chave está bloqueada ou arquivada.');
  }

  const approvedRoles: PlatformRole[] = [];
  if (profileHasRole(profile, 'afiliado') && profileRoleIsApproved(profile, 'afiliado')) approvedRoles.push('afiliado');

  const profileCompanyId = String(profile.companyId || '').trim();
  const storedCompanyId = String(keyData.companyId || '').trim();
  let validatedCompanyId = '';

  if (profileHasRole(profile, 'empresa') && profileRoleIsApproved(profile, 'empresa') && profileCompanyId) {
    const companySnap = await db.collection('companies').doc(profileCompanyId).get();
    const company = companySnap.exists ? companySnap.data()! : null;
    const keyMatchesTenant = !storedCompanyId || storedCompanyId === profileCompanyId;

    if (
      keyMatchesTenant &&
      company &&
      String(company.ownerId || company.submittedBy || '') === userId &&
      company.verified === true &&
      String(company.status || '').toLowerCase() === 'approved' &&
      company.archived !== true &&
      company.isArchived !== true &&
      company.banned !== true
    ) {
      approvedRoles.push('empresa');
      validatedCompanyId = profileCompanyId;
    }
  }

  if (!approvedRoles.length) throw new Error('A conta ainda não possui um perfil aprovado e ativo para usar a API.');

  const storedRoles = Array.isArray(keyData.allowedRoles)
    ? keyData.allowedRoles.map(normalizeRole).filter(Boolean) as PlatformRole[]
    : approvedRoles;
  const effectiveRoles = approvedRoles.filter((role) => storedRoles.includes(role));
  if (!effectiveRoles.length) throw new Error('Esta chave não possui mais permissões válidas.');

  const preferredRole = normalizeRole(keyData.preferredRole);
  const scopes = Array.isArray(keyData.scopes)
    ? keyData.scopes.map(String)
    : profileScopes(effectiveRoles);

  return {
    userId,
    keyId: keyDoc.id,
    companyId: validatedCompanyId,
    profile,
    approvedRoles: effectiveRoles,
    preferredRole: preferredRole && effectiveRoles.includes(preferredRole) ? preferredRole : undefined,
    scopes,
  };
}

export function extractApiKey(headers: Record<string, string | string[] | undefined>): string {
  const authorization = typeof headers.authorization === 'string' ? headers.authorization : '';
  const xApiKey = typeof headers['x-api-key'] === 'string' ? headers['x-api-key'] : '';
  return (authorization.replace(/^Bearer\s+/i, '') || xApiKey).trim();
}

function resolveRole(principal: McpPrincipal, params: Record<string, any>): PlatformRole {
  const requested = normalizeRole(params.role);
  if (requested) {
    if (!principal.approvedRoles.includes(requested)) throw new Error(`O perfil ${requested} não está aprovado para esta chave.`);
    return requested;
  }
  if (principal.preferredRole && principal.approvedRoles.includes(principal.preferredRole)) return principal.preferredRole;
  const activeRole = normalizeRole(principal.profile.activeRoleMode);
  if (activeRole && principal.approvedRoles.includes(activeRole)) return activeRole;
  return principal.approvedRoles[0];
}

function requireScope(principal: McpPrincipal, scope: string) {
  if (!principal.scopes.includes(scope)) throw new Error(`A API Key não possui a permissão ${scope}.`);
}

async function findPlan(productId: string) {
  const db = getServerAdminFirestore();
  const exact = await db.collection('plans').doc(productId).get();
  if (exact.exists) return { id: exact.id, ...exact.data()! } as Record<string, any>;

  for (const field of ['checkoutSlug', 'slug'] as const) {
    const snap = await db.collection('plans').where(field, '==', productId).limit(1).get();
    if (!snap.empty) return { id: snap.docs[0].id, ...snap.docs[0].data() } as Record<string, any>;
  }
  return null;
}

async function validateCouponForCheckout(
  companyId: string,
  planId: string,
  couponCode: string,
  affiliateCode?: string,
  affiliateUserId?: string,
) {
  if (!couponCode) return null;
  const db = getServerAdminFirestore();
  const ref = db.collection('coupons').doc(`${companyId}_${couponCode}`);
  const snap = await ref.get();
  if (!snap.exists) throw new Error('Cupom não encontrado.');
  const coupon = snap.data()!;
  const expiresAt = coupon.expiresAt ? Date.parse(String(coupon.expiresAt)) : NaN;
  const maxUses = Number(coupon.maxUses || 0);
  const usedCount = Number(coupon.usedCount || 0);
  const plans = Array.isArray(coupon.applicablePlans) ? coupon.applicablePlans.map(String) : ['all'];
  const affiliates = Array.isArray(coupon.applicableAffiliates) ? coupon.applicableAffiliates.map(String) : ['all'];
  if (
    String(coupon.companyId || '') !== companyId ||
    String(coupon.status || '').toLowerCase() !== 'active' ||
    (Number.isFinite(expiresAt) && expiresAt < Date.now()) ||
    (maxUses > 0 && usedCount >= maxUses) ||
    (!plans.includes('all') && !plans.includes(planId)) ||
    (
      !affiliates.includes('all') &&
      (!affiliateCode || !affiliates.includes(affiliateCode)) &&
      (!affiliateUserId || !affiliates.includes(affiliateUserId))
    )
  ) throw new Error('Este cupom não está disponível para este checkout.');
  return { id: snap.id, code: couponCode, discountType: coupon.discountType, value: Number(coupon.value || 0) };
}

export async function executeMcpAction(
  action: McpActionName,
  rawParams: Record<string, any> | undefined,
  principal: McpPrincipal,
): Promise<Record<string, any>> {
  const params = rawParams && typeof rawParams === 'object' ? rawParams : {};
  const db = getServerAdminFirestore();
  const baseUrl = getLeadspayBaseUrl();

  if (action === 'get_balance') {
    requireScope(principal, 'balance:read');
    const role = resolveRole(principal, params);
    const availableCents = Number(principal.profile[roleAvailableCentsField(role)] || 0);
    const pendingCents = Number(principal.profile[rolePendingCentsField(role)] || 0);
    const available = availableCents / 100;
    const pending = pendingCents / 100;
    const delayDays = releaseDelayDays(principal.profile);
    return {
      success: true,
      action,
      role,
      currency: 'BRL',
      availableBalance: available,
      pendingBalance: pending,
      totalBalance: available + pending,
      formattedAvailable: formatBRL(available),
      formattedPending: formatBRL(pending),
      releaseDelayDays: delayDays,
      payoutProvider: 'Stripe Connect',
      payoutMessage: pending > 0
        ? `O saldo pendente segue a regra atual de liberação em ${delayDays} dias.`
        : 'Não há saldo pendente neste perfil.',
    };
  }

  if (action === 'list_products') {
    requireScope(principal, 'products:read');
    const role = resolveRole(principal, params);
    const limit = Math.max(1, Math.min(50, Math.floor(Number(params.limit || 15))));
    const scope = ['mine', 'marketplace'].includes(String(params.scope)) ? String(params.scope) : (role === 'empresa' ? 'mine' : 'marketplace');

    let queryRef: FirebaseFirestore.Query = db.collection('plans');
    if (scope === 'mine') {
      if (!principal.companyId) throw new Error('Nenhuma empresa vinculada à chave.');
      queryRef = queryRef.where('companyId', '==', principal.companyId);
    }

    const snap = await queryRef.limit(200).get();
    const candidates = snap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() } as Record<string, any>))
      .filter((plan) =>
        String(plan.status || '').toLowerCase() === 'ativo' &&
        plan.active !== false &&
        plan.archived !== true &&
        plan.isArchived !== true
      )
      .filter((plan) => scope === 'mine' || (plan.allowAffiliates !== false && Number(plan.commissionPercentage || 0) > 0));

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

    const plans = candidates
      .filter((plan) => companyStates.get(String(plan.companyId || '')) === true)
      .slice(0, limit)
      .map((plan) => ({
        id: plan.id,
        name: plan.name,
        companyId: plan.companyId,
        companyName: plan.companyName || '',
        price: Number(plan.priceSetup || plan.priceMonthly || 0),
        formattedPrice: formatBRL(Number(plan.priceSetup || plan.priceMonthly || 0)),
        commissionPercentage: Number(plan.commissionPercentage || 0),
        allowAffiliates: plan.allowAffiliates !== false,
        checkoutUrl: `${baseUrl}/checkout/${encodeURIComponent(String(plan.checkoutSlug || plan.slug || plan.id))}`,
      }));

    return { success: true, action, scope, count: plans.length, products: plans };
  }

  if (action === 'get_affiliations') {
    requireScope(principal, 'affiliations:read');
    if (!principal.approvedRoles.includes('afiliado')) throw new Error('Esta ação requer perfil Afiliado aprovado.');
    const snap = await db.collection('affiliations').where('userId', '==', principal.userId).limit(100).get();
    const affiliations = snap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() } as Record<string, any>))
      .filter((item) => activeState(item.status))
      .map((item) => ({
        id: item.id,
        planId: item.planId || item.plan_id,
        planName: item.planName || '',
        companyId: item.companyId || '',
        companyName: item.companyName || '',
        affiliateCode: item.affiliateCode || item.affiliate_code || '',
        commissionPercentage: Number(item.commissionPercentage || 0),
        salesCount: Number(item.salesCount || 0),
        totalEarned: Number(item.totalEarned || 0),
        affiliateLink: item.affiliateLink || `${baseUrl}/checkout/${encodeURIComponent(String(item.planId || item.plan_id || ''))}?ref=${encodeURIComponent(String(item.affiliateCode || item.affiliate_code || ''))}`,
      }));
    return { success: true, action, count: affiliations.length, affiliations };
  }

  if (action === 'get_affiliate_performance') {
    requireScope(principal, 'affiliations:read');
    if (!principal.approvedRoles.includes('afiliado')) throw new Error('Esta ação requer perfil Afiliado aprovado.');

    const days = Math.max(1, Math.min(365, Math.floor(Number(params.days || 30))));
    const sinceMs = Date.now() - days * 24 * 60 * 60 * 1000;

    const [salesSnap, clicksSnap, affiliationsSnap] = await Promise.all([
      db.collection('sales').where('affiliateId', '==', principal.userId).limit(1500).get(),
      db.collection('affiliate_clicks').where('affiliateId', '==', principal.userId).limit(5000).get(),
      db.collection('affiliations').where('userId', '==', principal.userId).limit(300).get(),
    ]);

    const sales = salesSnap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() } as Record<string, any>))
      .filter((sale) => approvedSaleState(sale.status))
      .filter((sale) => {
        const ms = dateMillis(sale.createdAt || sale.paidAt || sale.updatedAt || sale.date);
        return !ms || ms >= sinceMs;
      });

    const clicks = clicksSnap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() } as Record<string, any>))
      .filter((click) => {
        const ms = dateMillis(click.createdAt || click.clickedAt || click.date);
        return !ms || ms >= sinceMs;
      });

    const activeAffiliations = affiliationsSnap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() } as Record<string, any>))
      .filter((item) => activeState(item.status));

    const totalCommission = sales.reduce((sum, sale) => sum + Number(sale.commissionEarned || 0), 0);
    const recurringCommission = sales
      .filter((sale) => String(sale.saleKind || '') === 'subscription_renewal')
      .reduce((sum, sale) => sum + Number(sale.commissionEarned || 0), 0);

    const sourceMap = new Map<string, { clicks: number; sales: number; commission: number }>();
    for (const click of clicks) {
      const source = String(click.utmSource || 'direto').trim().toLowerCase() || 'direto';
      const row = sourceMap.get(source) || { clicks: 0, sales: 0, commission: 0 };
      row.clicks += 1;
      sourceMap.set(source, row);
    }
    for (const sale of sales) {
      const source = String(sale.utmSource || 'direto').trim().toLowerCase() || 'direto';
      const row = sourceMap.get(source) || { clicks: 0, sales: 0, commission: 0 };
      row.sales += 1;
      row.commission += Number(sale.commissionEarned || 0);
      sourceMap.set(source, row);
    }

    const sources = [...sourceMap.entries()]
      .map(([source, row]) => ({
        source,
        ...row,
        conversionRate: row.clicks > 0 ? Number(((row.sales / row.clicks) * 100).toFixed(2)) : null,
      }))
      .sort((a, b) => b.commission - a.commission || b.sales - a.sales || b.clicks - a.clicks)
      .slice(0, 10);

    return {
      success: true,
      action,
      periodDays: days,
      activeAffiliations: activeAffiliations.length,
      approvedSales: sales.length,
      totalClicks: clicks.length,
      conversionRate: clicks.length > 0 ? Number(((sales.length / clicks.length) * 100).toFixed(2)) : null,
      totalCommission,
      formattedCommission: formatBRL(totalCommission),
      recurringCommission,
      formattedRecurringCommission: formatBRL(recurringCommission),
      sources,
    };
  }

  if (action === 'list_affiliate_coupons') {
    requireScope(principal, 'affiliations:read');
    if (!principal.approvedRoles.includes('afiliado')) throw new Error('Esta ação requer perfil Afiliado aprovado.');

    const affiliationSnap = await db.collection('affiliations').where('userId', '==', principal.userId).limit(300).get();
    const affiliations = affiliationSnap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() } as Record<string, any>))
      .filter((item) => activeState(item.status));

    if (!affiliations.length) {
      return { success: true, action, count: 0, coupons: [] };
    }

    const couponSnap = await db.collection('coupons').limit(1000).get();
    const planIds = [...new Set(affiliations.map((aff) => String(aff.planId || aff.plan_id || '')).filter(Boolean))];
    const planEntries = await Promise.all(planIds.map(async (id) => {
      const snap = await db.collection('plans').doc(id).get();
      return [id, snap.exists ? ({ id: snap.id, ...snap.data()! } as Record<string, any>) : null] as const;
    }));
    const planMap = new Map(planEntries);
    const now = Date.now();

    const coupons = couponSnap.docs.flatMap((doc) => {
      const coupon = { id: doc.id, ...doc.data() } as Record<string, any>;
      if (String(coupon.status || '').toLowerCase() !== 'active') return [];
      const expiresMs = coupon.expiresAt ? Date.parse(String(coupon.expiresAt)) : NaN;
      if (Number.isFinite(expiresMs) && expiresMs <= now) return [];
      const maxUses = Number(coupon.maxUses || 0);
      const usedCount = Number(coupon.usedCount || 0);
      if (maxUses > 0 && usedCount >= maxUses) return [];

      const planRules = Array.isArray(coupon.applicablePlans) ? coupon.applicablePlans.map(String) : ['all'];
      const affiliateRules = Array.isArray(coupon.applicableAffiliates) ? coupon.applicableAffiliates.map(String) : ['all'];

      const eligibleLinks = affiliations.flatMap((aff) => {
        const planId = String(aff.planId || aff.plan_id || '');
        const companyId = String(aff.companyId || '');
        const affiliateCode = String(aff.affiliateCode || aff.affiliate_code || '');
        if (!planId || !companyId || !affiliateCode || companyId !== String(coupon.companyId || '')) return [];
        if (!planRules.includes('all') && !planRules.includes(planId)) return [];
        if (
          !affiliateRules.includes('all') &&
          !affiliateRules.includes(principal.userId) &&
          !affiliateRules.includes(affiliateCode)
        ) return [];

        const plan = planMap.get(planId);
        if (!plan) return [];
        const slug = String(plan.checkoutSlug || plan.slug || planId);
        const query = new URLSearchParams();
        query.set('ref', affiliateCode);
        query.set('coupon', String(coupon.code || ''));
        return [{
          planId,
          planName: String(plan.name || aff.planName || 'Produto'),
          companyId,
          affiliateCode,
          url: `${baseUrl}/checkout/${encodeURIComponent(slug)}?${query.toString()}`,
        }];
      });

      if (!eligibleLinks.length) return [];
      return [{
        id: coupon.id,
        code: String(coupon.code || ''),
        discountType: String(coupon.discountType || 'percentage'),
        value: Number(coupon.value || 0),
        formattedDiscount: String(coupon.discountType || 'percentage') === 'percentage'
          ? `${Number(coupon.value || 0)}%`
          : formatBRL(Number(coupon.value || 0)),
        expiresAt: coupon.expiresAt || null,
        eligibleLinks,
      }];
    }).slice(0, 200);

    return { success: true, action, count: coupons.length, coupons };
  }

  if (action === 'list_coupons') {
    requireScope(principal, 'coupons:read');
    if (!principal.approvedRoles.includes('empresa') || !principal.companyId) throw new Error('Esta ação requer perfil Empresa aprovado.');
    const snap = await db.collection('coupons').where('companyId', '==', principal.companyId).limit(200).get();
    const coupons = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Record<string, any>));
    return { success: true, action, count: coupons.length, coupons };
  }

  if (action === 'create_coupon') {
    requireScope(principal, 'coupons:write');
    if (!principal.approvedRoles.includes('empresa') || !principal.companyId) throw new Error('Esta ação requer perfil Empresa aprovado.');

    const code = cleanCouponCode(params.code || params.couponCode);
    const discountType = params.discountType === 'fixed' ? 'fixed' : 'percentage';
    const value = Number(params.discount ?? params.value);
    const maxUses = Math.max(0, Math.floor(Number(params.maxUses ?? 100)));
    const planId = String(params.planId || 'all').trim();
    if (code.length < 3) throw new Error('O cupom precisa ter pelo menos 3 caracteres.');
    if (!Number.isFinite(value) || value <= 0 || (discountType === 'percentage' && value > 100)) throw new Error('Desconto inválido.');

    if (planId !== 'all') {
      const plan = await findPlan(planId);
      if (!plan || String(plan.companyId || '') !== principal.companyId) throw new Error('A oferta escolhida não pertence à empresa autenticada.');
      if (String(plan.billingType || '').toLowerCase() === 'recorrente' || String(plan.paymentType || '').toLowerCase() === 'recorrente') {
        throw new Error('Cupons desta API são válidos somente para produtos de pagamento único.');
      }
    }

    const companySnap = await db.collection('companies').doc(principal.companyId).get();
    if (!companySnap.exists || companySnap.data()!.verified !== true || companySnap.data()!.status !== 'approved') {
      throw new Error('A empresa não está aprovada para criar cupons.');
    }

    const id = `${principal.companyId}_${code}`;
    const ref = db.collection('coupons').doc(id);
    const existing = await ref.get();
    const now = new Date().toISOString();
    const coupon = {
      id,
      companyId: principal.companyId,
      code,
      discountType,
      value,
      maxUses,
      usedCount: Number(existing.data()?.usedCount || 0),
      expiresAt: normalizeExpiry(params.expiresAt),
      status: 'active',
      applicablePlans: planId === 'all' ? ['all'] : [planId],
      applicableAffiliates: ['all'],
      createdBy: principal.userId,
      updatedAt: now,
      ...(existing.exists ? {} : { createdAt: now }),
    };
    await ref.set(coupon, { merge: true });
    return {
      success: true,
      action,
      message: `Cupom ${code} salvo com sucesso.`,
      coupon: {
        id,
        code,
        discountType,
        value,
        formattedDiscount: discountType === 'percentage' ? `${value}%` : formatBRL(value),
        maxUses,
        expiresAt: coupon.expiresAt,
        planId,
      },
    };
  }

  if (action === 'create_checkout') {
    requireScope(principal, 'checkout:create');
    const productId = String(params.productId || params.planId || '').trim();
    if (!/^[A-Za-z0-9_-]{1,150}$/.test(productId)) throw new Error('productId inválido.');

    const plan = await findPlan(productId);
    if (!plan || String(plan.status || '').toLowerCase() !== 'ativo' || plan.active === false) throw new Error('Oferta não encontrada ou indisponível.');
    const planId = String(plan.id);
    const companyId = String(plan.companyId || '');
    if (!companyId) throw new Error('Oferta sem empresa responsável.');

    const companySnap = await db.collection('companies').doc(companyId).get();
    const company = companySnap.exists ? companySnap.data()! : null;
    if (
      !company ||
      company.verified !== true ||
      String(company.status || '').toLowerCase() !== 'approved' ||
      company.archived === true ||
      company.isArchived === true ||
      company.banned === true
    ) {
      throw new Error('A empresa responsável não está aprovada para vender.');
    }

    let affiliateCode = '';
    const isOwnCompanyPlan = principal.approvedRoles.includes('empresa') && principal.companyId === companyId;
    if (!isOwnCompanyPlan) {
      if (!principal.approvedRoles.includes('afiliado')) throw new Error('Esta chave não possui afiliação válida para a oferta.');
      const affiliationRef = db.collection('affiliations').doc(`aff_${principal.userId}_${planId}`);
      let affiliationSnap = await affiliationRef.get();
      if (!affiliationSnap.exists) {
        const all = await db.collection('affiliations').where('userId', '==', principal.userId).limit(100).get();
        const match = all.docs.find((doc) => String(doc.data().planId || doc.data().plan_id || '') === planId);
        if (match) affiliationSnap = match;
      }
      if (!affiliationSnap.exists || !activeState(affiliationSnap.data()!.status)) {
        throw new Error('Você precisa possuir uma afiliação ativa com esta oferta antes de gerar o checkout.');
      }
      affiliateCode = String(affiliationSnap.data()!.affiliateCode || affiliationSnap.data()!.affiliate_code || '').trim();
      if (!affiliateCode) throw new Error('A afiliação ativa não possui código válido.');
    }

    const couponCode = cleanCouponCode(params.couponCode || params.coupon);
    const coupon = await validateCouponForCheckout(
      companyId,
      planId,
      couponCode,
      affiliateCode || undefined,
      principal.userId,
    );
    const query = new URLSearchParams();
    if (affiliateCode) query.set('ref', affiliateCode);
    if (coupon) query.set('coupon', coupon.code);
    const slug = String(plan.checkoutSlug || plan.slug || planId);
    const checkoutUrl = `${baseUrl}/checkout/${encodeURIComponent(slug)}${query.size ? `?${query.toString()}` : ''}`;

    const price = Number(plan.priceSetup || plan.priceMonthly || 0);
    return {
      success: true,
      action,
      product: {
        id: planId,
        name: plan.name || 'Oferta',
        companyId,
        companyName: plan.companyName || '',
        price,
        formattedPrice: formatBRL(price),
        commissionPercentage: Number(plan.commissionPercentage || 0),
      },
      affiliateCode: affiliateCode || null,
      coupon: coupon || null,
      checkoutUrl,
      message: 'Checkout oficial gerado a partir de uma oferta persistida na LeadsPay.',
    };
  }

  throw new Error('Ação não reconhecida.');
}

export function actionExists(value: unknown): value is McpActionName {
  return [
    'get_balance',
    'list_products',
    'create_coupon',
    'list_coupons',
    'create_checkout',
    'get_affiliations',
    'get_affiliate_performance',
    'list_affiliate_coupons',
  ].includes(String(value));
}

export function scopesForApprovedRoles(roles: PlatformRole[]): string[] {
  return profileScopes(roles);
}
