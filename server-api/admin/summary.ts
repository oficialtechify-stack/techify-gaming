import { getServerAdminFirestore } from '../../lib/firebaseAdminServer.js';
import { LEADSPAY_GLOBAL_ADMIN_EMAIL, requireAdminIdentity } from '../../lib/adminAccess.js';
import { getSubscriptionPlan } from '../../lib/platformBilling.js';

type Req = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
};
type Res = {
  setHeader(name: string, value: string): void;
  status(code: number): Res;
  json(body: unknown): unknown;
};

const APPROVED_SALE_STATUSES = new Set(['aprovado', 'approved', 'liberado', 'received', 'confirmed']);
const NON_ACTIVE_WITHDRAWALS = new Set(['failed', 'recusado', 'rejected', 'cancelled', 'canceled', 'completed', 'concluido', 'concluído']);
const COMPLETED_WITHDRAWALS = new Set(['completed', 'concluido', 'concluído']);
const COMPLETED_CHECKOUTS = new Set(['paid', 'completed', 'succeeded', 'confirmed']);

function isRealMoney(data: Record<string, any>): boolean {
  return data.is_test !== true && !['development', 'test', 'sandbox', 'preview'].includes(String(data.environment || '').toLowerCase());
}

function isExplicitProductionRecord(data: Record<string, any>): boolean {
  return data.is_test === false && String(data.environment || '').toLowerCase() === 'production';
}

function centsFromProfile(profile: Record<string, any>, field: string): number {
  const value = Number(profile[field] || 0);
  return Number.isFinite(value) ? value : 0;
}

export default async function handler(req: Req, res: Res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido.' });

  try {
    await requireAdminIdentity(req.headers);
    const db = getServerAdminFirestore();

    const [
      salesSnap,
      withdrawalsSnap,
      releasesSnap,
      companiesSnap,
      profilesSnap,
      plansSnap,
      affiliationsSnap,
      financeSnap,
      checkoutOrdersSnap,
      productSubscriptionCheckoutsSnap,
      platformSubscriptionCheckoutsSnap,
      productSubscriptionsSnap,
    ] = await Promise.all([
      db.collection('sales').limit(5000).get(),
      db.collection('withdrawals').limit(5000).get(),
      db.collection('balance_releases').limit(5000).get(),
      db.collection('companies').limit(5000).get(),
      db.collection('user_profiles').limit(5000).get(),
      db.collection('plans').limit(5000).get(),
      db.collection('affiliations').limit(5000).get(),
      db.collection('platform_finances').doc('global_summary').get(),
      db.collection('stripe_checkout_orders').limit(5000).get(),
      db.collection('stripe_product_subscription_checkouts').limit(5000).get(),
      db.collection('stripe_subscription_checkouts').limit(5000).get(),
      db.collection('product_subscriptions').limit(5000).get(),
    ]);

    const profiles: Array<Record<string, any> & { id: string }> = profilesSnap.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Record<string, any>),
    }));

    const globalAdminIds = new Set(
      profiles
        .filter((profile) => String(profile.email || '').trim().toLowerCase() === LEADSPAY_GLOBAL_ADMIN_EMAIL)
        .map((profile) => String(profile.id)),
    );

    const userProfiles = profiles.filter(
      (profile) => String(profile.email || '').trim().toLowerCase() !== LEADSPAY_GLOBAL_ADMIN_EMAIL,
    );

    const realSales = salesSnap.docs
      .map((doc) => doc.data() as Record<string, any>)
      .filter((sale) => isExplicitProductionRecord(sale) && APPROVED_SALE_STATUSES.has(String(sale.status || '').toLowerCase()));

    let grossVolume = 0;
    let checkoutFees = 0;
    let affiliateCommissions = 0;
    let companyNet = 0;

    for (const sale of realSales) {
      const amount = Number(sale.amount || sale.financialBreakdown?.grossAmount || 0);
      const checkoutFee = Number(sale.checkoutFee ?? sale.financialBreakdown?.platformFee ?? 0);
      const commission = Number(sale.commissionEarned ?? sale.financialBreakdown?.affiliateCommission ?? 0);
      const explicitNet = Number(sale.netCompanyAmount ?? sale.financialBreakdown?.netCompanyAmount);

      grossVolume += Number.isFinite(amount) ? amount : 0;
      checkoutFees += Number.isFinite(checkoutFee) ? checkoutFee : 0;
      affiliateCommissions += Number.isFinite(commission) ? commission : 0;
      companyNet += Number.isFinite(explicitNet)
        ? explicitNet
        : Math.max(0, amount - checkoutFee - commission);
    }

    const averageTicket = realSales.length > 0 ? grossVolume / realSales.length : 0;

    const realWithdrawals = withdrawalsSnap.docs
      .map((doc) => doc.data() as Record<string, any>)
      .filter(isRealMoney);

    const withdrawalFees = realWithdrawals
      .filter((item) => !['failed', 'recusado', 'rejected', 'cancelled', 'canceled'].includes(String(item.status || '').toLowerCase()))
      .reduce((sum, item) => sum + Number(item.feeAmount ?? item.fee ?? 0), 0);

    const withdrawalsInFlight = realWithdrawals.filter((item) => {
      const status = String(item.status || '').trim().toLowerCase();
      return !NON_ACTIVE_WITHDRAWALS.has(status);
    }).length;

    const completedWithdrawals = realWithdrawals.filter((item) =>
      COMPLETED_WITHDRAWALS.has(String(item.status || '').trim().toLowerCase())
    );

    const totalWithdrawn = completedWithdrawals.reduce((sum, item) => {
      const value = Number(item.netAmount ?? item.amount ?? item.requestedAmount ?? 0);
      return sum + (Number.isFinite(value) ? value : 0);
    }, 0);

    const releasePendingBalance = releasesSnap.docs
      .map((doc) => doc.data() as Record<string, any>)
      .filter((item) => isRealMoney(item) && item.status === 'pending')
      .reduce((sum, item) => sum + Number(item.amountCents || 0) / 100, 0);

    const profilePendingBalanceCents = userProfiles.reduce(
      (sum, profile) =>
        sum +
        centsFromProfile(profile, 'empresaPendingBalanceCents') +
        centsFromProfile(profile, 'afiliadoPendingBalanceCents'),
      0,
    );

    const profileAvailableBalanceCents = userProfiles.reduce(
      (sum, profile) =>
        sum +
        centsFromProfile(profile, 'empresaAvailableBalanceCents') +
        centsFromProfile(profile, 'afiliadoAvailableBalanceCents'),
      0,
    );

    const pendingBalance =
      profilePendingBalanceCents > 0
        ? profilePendingBalanceCents / 100
        : releasePendingBalance;

    const availableBalance = profileAvailableBalanceCents / 100;

    const realCompanies: Array<Record<string, any> & { id: string }> = companiesSnap.docs
      .map((doc) => ({ id: doc.id, ...(doc.data() as Record<string, any>) }))
      .filter((item) => {
        const ownerId = String(item.ownerId || item.submittedBy || '').trim();
        const ownerEmail = String(item.submittedByEmail || item.email || '').trim().toLowerCase();
        return !globalAdminIds.has(ownerId) && ownerEmail !== LEADSPAY_GLOBAL_ADMIN_EMAIL;
      });

    const approvedCompanies = realCompanies.filter((item) =>
      item.verified === true &&
      String(item.status || '').toLowerCase() === 'approved' &&
      item.banned !== true &&
      item.archived !== true &&
      item.isArchived !== true
    ).length;

    const approvedAffiliates = userProfiles.filter((item) => {
      const status = String(item.affiliateVerificationStatus || item.verificationStatus || '').toLowerCase();
      return status === 'approved' && item.banned !== true;
    }).length;

    let activePlanSubscribers = 0;
    let platformPlanMrr = 0;

    for (const profile of userProfiles) {
      const status = String(profile.planStatus || profile.stripeSubscriptionStatus || '').trim().toLowerCase();
      if (status !== 'active') continue;

      const plan = getSubscriptionPlan(profile.subscriptionTier || profile.plan);
      if (!plan || plan.priceCents <= 0) continue;

      activePlanSubscribers += 1;
      platformPlanMrr += plan.priceCents / 100;
    }

    const checkoutDocuments = [
      ...checkoutOrdersSnap.docs.map((doc) => doc.data() as Record<string, any>),
      ...productSubscriptionCheckoutsSnap.docs.map((doc) => doc.data() as Record<string, any>),
      ...platformSubscriptionCheckoutsSnap.docs.map((doc) => doc.data() as Record<string, any>),
    ].filter(isExplicitProductionRecord);

    const checkoutAttempts = checkoutDocuments.length;
    const completedCheckouts = checkoutDocuments.filter((item) =>
      COMPLETED_CHECKOUTS.has(String(item.status || '').trim().toLowerCase())
    ).length;

    const activeProductSubscriptions = productSubscriptionsSnap.docs.filter((doc) => {
      const item = doc.data() as Record<string, any>;
      if (!isRealMoney(item)) return false;
      const status = String(item.status || '').trim().toLowerCase();
      return item.active === true || status === 'active' || status === 'trialing';
    }).length;

    const plans: Array<Record<string, any> & { id: string }> = plansSnap.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Record<string, any>),
    }));
    const affiliations: Array<Record<string, any> & { id: string }> = affiliationsSnap.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Record<string, any>),
    }));
    const productSubscriptions: Array<Record<string, any> & { id: string }> = productSubscriptionsSnap.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Record<string, any>),
    }));

    const companySummaries = realCompanies.map((company) => {
      const companyId = String(company.id);
      const ownerId = String(company.ownerId || company.submittedBy || '').trim();
      const ownerProfile = userProfiles.find((profile) =>
        String(profile.id) === ownerId || String(profile.companyId || '') === companyId
      );

      const companySales = realSales.filter((sale) =>
        String(sale.companyId || '') === companyId ||
        (ownerId && String(sale.companyOwnerId || '') === ownerId)
      );

      let companyGrossVolume = 0;
      let companyCheckoutFees = 0;
      let companyAffiliateCommissions = 0;
      let companyNetRevenue = 0;

      for (const sale of companySales) {
        const amount = Number(sale.amount || sale.financialBreakdown?.grossAmount || 0);
        const checkoutFee = Number(sale.checkoutFee ?? sale.financialBreakdown?.platformFee ?? 0);
        const commission = Number(sale.commissionEarned ?? sale.financialBreakdown?.affiliateCommission ?? 0);
        const explicitNet = Number(sale.netCompanyAmount ?? sale.financialBreakdown?.netCompanyAmount);

        companyGrossVolume += Number.isFinite(amount) ? amount : 0;
        companyCheckoutFees += Number.isFinite(checkoutFee) ? checkoutFee : 0;
        companyAffiliateCommissions += Number.isFinite(commission) ? commission : 0;
        companyNetRevenue += Number.isFinite(explicitNet)
          ? explicitNet
          : Math.max(0, amount - checkoutFee - commission);
      }

      const activeProducts = plans.filter((plan) =>
        String(plan.companyId || '') === companyId &&
        String(plan.status || '').toLowerCase() === 'ativo' &&
        plan.active !== false
      ).length;

      const connectedAffiliates = affiliations.filter((affiliation) => {
        if (String(affiliation.companyId || '') !== companyId) return false;
        const status = String(affiliation.status || '').trim().toLowerCase();
        return ['ativo', 'active', 'aprovado', 'approved'].includes(status);
      }).length;

      const companyCheckouts = checkoutDocuments.filter((item) =>
        String(item.companyId || '') === companyId ||
        (ownerId && String(item.companyOwnerId || '') === ownerId)
      );

      const companyCompletedCheckouts = companyCheckouts.filter((item) =>
        COMPLETED_CHECKOUTS.has(String(item.status || '').trim().toLowerCase())
      ).length;

      const activeSubscriptions = productSubscriptions.filter((subscription) => {
        if (
          String(subscription.companyId || '') !== companyId &&
          !(ownerId && String(subscription.companyOwnerId || '') === ownerId)
        ) return false;
        if (!isRealMoney(subscription)) return false;
        const status = String(subscription.status || '').trim().toLowerCase();
        return subscription.active === true || status === 'active' || status === 'trialing';
      }).length;

      const companyWithdrawals = realWithdrawals.filter((withdrawal) =>
        String(withdrawal.companyId || '') === companyId ||
        (ownerId && String(withdrawal.userId || '') === ownerId && String(withdrawal.role || 'empresa') === 'empresa')
      );

      const completedCompanyWithdrawals = companyWithdrawals.filter((withdrawal) =>
        COMPLETED_WITHDRAWALS.has(String(withdrawal.status || '').trim().toLowerCase())
      );

      const totalWithdrawnByCompany = completedCompanyWithdrawals.reduce((sum, withdrawal) => {
        const value = Number(withdrawal.netAmount ?? withdrawal.amount ?? withdrawal.requestedAmount ?? 0);
        return sum + (Number.isFinite(value) ? value : 0);
      }, 0);

      const stripeAccountId = String(
        company.stripeAccountId ||
        ownerProfile?.stripeAccounts?.empresa ||
        ownerProfile?.stripeAccountId ||
        ''
      ).trim();

      return {
        companyId,
        ownerId: ownerId || null,
        name: String(company.name || company.companyName || 'Empresa'),
        logo: String(company.logo || ''),
        email: String(company.email || ownerProfile?.email || ''),
        category: String(company.category || ''),
        status: String(company.status || 'pending'),
        verified: company.verified === true,
        banned: company.banned === true,
        stripeConnected: Boolean(stripeAccountId),
        salesCount: companySales.length,
        grossVolume: Number(companyGrossVolume.toFixed(2)),
        checkoutFees: Number(companyCheckoutFees.toFixed(2)),
        affiliateCommissions: Number(companyAffiliateCommissions.toFixed(2)),
        netRevenue: Number(companyNetRevenue.toFixed(2)),
        pendingBalance: Number((centsFromProfile(ownerProfile || {}, 'empresaPendingBalanceCents') / 100).toFixed(2)),
        availableBalance: Number((centsFromProfile(ownerProfile || {}, 'empresaAvailableBalanceCents') / 100).toFixed(2)),
        activeProducts,
        connectedAffiliates,
        checkoutAttempts: companyCheckouts.length,
        completedCheckouts: companyCompletedCheckouts,
        activeSubscriptions,
        withdrawalsInFlight: companyWithdrawals.filter((withdrawal) =>
          !NON_ACTIVE_WITHDRAWALS.has(String(withdrawal.status || '').trim().toLowerCase())
        ).length,
        completedWithdrawals: completedCompanyWithdrawals.length,
        totalWithdrawn: Number(totalWithdrawnByCompany.toFixed(2)),
      };
    }).sort((a, b) => {
      if (a.verified !== b.verified) return a.verified ? -1 : 1;
      return a.name.localeCompare(b.name, 'pt-BR');
    });

    const finance = financeSnap.exists ? financeSnap.data() as Record<string, any> : {};
    const platformRevenue = checkoutFees + withdrawalFees;
    const stripeSecret = String(process.env.STRIPE_SECRET_KEY || '').trim();
    const stripeWebhookSecret = String(process.env.STRIPE_WEBHOOK_SECRET || '').trim();
    const stripeConfig = {
      liveSecretConfigured: /^(sk|rk)_live_/.test(stripeSecret),
      webhookConfigured: /^whsec_/.test(stripeWebhookSecret),
    };

    return res.status(200).json({
      success: true,
      summary: {
        salesCount: realSales.length,
        grossVolume: Number(grossVolume.toFixed(2)),
        averageTicket: Number(averageTicket.toFixed(2)),
        checkoutFees: Number(checkoutFees.toFixed(2)),
        withdrawalFees: Number(withdrawalFees.toFixed(2)),
        platformRevenue: Number(platformRevenue.toFixed(2)),
        affiliateCommissions: Number(affiliateCommissions.toFixed(2)),
        companyNet: Number(companyNet.toFixed(2)),
        pendingBalance: Number(pendingBalance.toFixed(2)),
        availableBalance: Number(availableBalance.toFixed(2)),
        withdrawalsInFlight,
        completedWithdrawals: completedWithdrawals.length,
        totalWithdrawn: Number(totalWithdrawn.toFixed(2)),
        approvedCompanies,
        approvedAffiliates,
        activeProducts: plans.filter((plan) =>
          String(plan.status || '').toLowerCase() === 'ativo' && plan.active !== false
        ).length,
        checkoutAttempts,
        completedCheckouts,
        activeProductSubscriptions,
        activePlanSubscribers,
        platformPlanMrr: Number(platformPlanMrr.toFixed(2)),
        companySummaries,
        totalSalesProcessedCounter: Number(finance.totalSalesProcessed || 0),
        lastUpdated: String(finance.lastUpdated || new Date().toISOString()),
        stripeConfig,
        truncated:
          salesSnap.size >= 5000 ||
          withdrawalsSnap.size >= 5000 ||
          releasesSnap.size >= 5000 ||
          companiesSnap.size >= 5000 ||
          profilesSnap.size >= 5000 ||
          plansSnap.size >= 5000 ||
          affiliationsSnap.size >= 5000 ||
          checkoutOrdersSnap.size >= 5000 ||
          productSubscriptionCheckoutsSnap.size >= 5000 ||
          platformSubscriptionCheckoutsSnap.size >= 5000 ||
          productSubscriptionsSnap.size >= 5000,
      },
    });
  } catch (error: any) {
    const status = Number(error?.statusCode || 503);
    return res.status(status).json({
      error: error instanceof Error ? error.message : 'Não foi possível carregar o resumo administrativo.',
    });
  }
}
