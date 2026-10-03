import { getServerAdminFirestore } from '../../lib/firebaseAdminServer.js';
import { requireAdminIdentity } from '../../lib/adminAccess.js';

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

function isRealMoney(data: Record<string, any>): boolean {
  return data.is_test !== true && String(data.environment || '').toLowerCase() !== 'development';
}

export default async function handler(req: Req, res: Res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido.' });

  try {
    await requireAdminIdentity(req.headers);
    const db = getServerAdminFirestore();

    const [salesSnap, withdrawalsSnap, releasesSnap, companiesSnap, profilesSnap, plansCount, financeSnap] = await Promise.all([
      db.collection('sales').limit(5000).get(),
      db.collection('withdrawals').limit(5000).get(),
      db.collection('balance_releases').limit(5000).get(),
      db.collection('companies').limit(5000).get(),
      db.collection('user_profiles').limit(5000).get(),
      db.collection('plans').where('status', '==', 'Ativo').count().get(),
      db.collection('platform_finances').doc('global_summary').get(),
    ]);

    const realSales = salesSnap.docs
      .map((doc) => doc.data() as Record<string, any>)
      .filter((sale) => isRealMoney(sale) && APPROVED_SALE_STATUSES.has(String(sale.status || '').toLowerCase()));

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

    const pendingBalance = releasesSnap.docs
      .map((doc) => doc.data() as Record<string, any>)
      .filter((item) => isRealMoney(item) && item.status === 'pending')
      .reduce((sum, item) => sum + Number(item.amountCents || 0) / 100, 0);

    const approvedCompanies = companiesSnap.docs.filter((doc) => {
      const item = doc.data() as Record<string, any>;
      return item.verified === true &&
        String(item.status || '').toLowerCase() === 'approved' &&
        item.banned !== true &&
        item.archived !== true &&
        item.isArchived !== true;
    }).length;

    const approvedAffiliates = profilesSnap.docs.filter((doc) => {
      const item = doc.data() as Record<string, any>;
      const status = String(item.affiliateVerificationStatus || item.verificationStatus || '').toLowerCase();
      return status === 'approved' && item.banned !== true;
    }).length;

    const finance = financeSnap.exists ? financeSnap.data() as Record<string, any> : {};
    const platformRevenue = checkoutFees + withdrawalFees;

    return res.status(200).json({
      success: true,
      summary: {
        salesCount: realSales.length,
        grossVolume: Number(grossVolume.toFixed(2)),
        checkoutFees: Number(checkoutFees.toFixed(2)),
        withdrawalFees: Number(withdrawalFees.toFixed(2)),
        platformRevenue: Number(platformRevenue.toFixed(2)),
        affiliateCommissions: Number(affiliateCommissions.toFixed(2)),
        companyNet: Number(companyNet.toFixed(2)),
        pendingBalance: Number(pendingBalance.toFixed(2)),
        withdrawalsInFlight,
        approvedCompanies,
        approvedAffiliates,
        activeProducts: Number(plansCount.data().count || 0),
        totalSalesProcessedCounter: Number(finance.totalSalesProcessed || 0),
        lastUpdated: String(finance.lastUpdated || new Date().toISOString()),
        truncated:
          salesSnap.size >= 5000 ||
          withdrawalsSnap.size >= 5000 ||
          releasesSnap.size >= 5000 ||
          companiesSnap.size >= 5000 ||
          profilesSnap.size >= 5000,
      },
    });
  } catch (error: any) {
    const status = Number(error?.statusCode || 503);
    return res.status(status).json({
      error: error instanceof Error ? error.message : 'Não foi possível carregar o resumo administrativo.',
    });
  }
}
