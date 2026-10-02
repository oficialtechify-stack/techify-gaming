import { getServerAdminFirestore } from '../../lib/firebaseAdminServer.js';

type RequestLike = { method?: string };
type ResponseLike = {
  setHeader(name: string, value: string): void;
  status(code: number): ResponseLike;
  json(body: unknown): unknown;
};

function sumField(docs: FirebaseFirestore.QueryDocumentSnapshot[], field: string): number {
  return docs.reduce((total, doc) => total + Number(doc.data()?.[field] || 0), 0);
}

export default async function handler(req: RequestLike, res: ResponseLike) {
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  try {
    const db = getServerAdminFirestore();

    const [
      usersCount,
      approvedCompanies,
      activeProductsCount,
      affiliateWithdrawals,
      financeSnap,
    ] = await Promise.all([
      db.collection('user_profiles').count().get(),
      db.collection('companies').where('status', '==', 'approved').get(),
      db.collection('plans').where('status', '==', 'Ativo').count().get(),
      db.collection('withdrawals').where('role', '==', 'afiliado').get(),
      db.collection('platform_finances').doc('global_summary').get(),
    ]);

    const approvedCompanyDocs = approvedCompanies.docs.filter((doc) => {
      const data = doc.data();
      return data.verified === true && data.archived !== true && data.isArchived !== true && data.banned !== true;
    });

    const commissionGenerated = approvedCompanyDocs.reduce(
      (total, doc) => total + Number(doc.data().totalAffiliateCommissions || 0),
      0,
    );

    const paidWithdrawalDocs = affiliateWithdrawals.docs.filter((doc) =>
      ['COMPLETED', 'PAYOUT_PENDING', 'TRANSFERRED_TO_STRIPE'].includes(String(doc.data().status || ''))
    );
    const commissionsSent = sumField(paidWithdrawalDocs, 'netAmount');

    const grossSales = approvedCompanyDocs.reduce(
      (total, doc) => total + Number(doc.data().grossRevenue || 0),
      0,
    );

    const finance = financeSnap.exists ? financeSnap.data()! : {};

    return res.status(200).json({
      success: true,
      metrics: {
        totalRegisteredUsers: Number(usersCount.data().count || 0),
        totalStartups: approvedCompanyDocs.length,
        totalPlans: Number(activeProductsCount.data().count || 0),
        totalCommissionsGenerated: Number(commissionGenerated.toFixed(2)),
        totalCommissionsPaid: Number(commissionsSent.toFixed(2)),
        totalGrossSales: Number(grossSales.toFixed(2)),
        totalSalesCount: Number(finance.totalSalesProcessed || 0),
      },
      updatedAt: String(finance.lastUpdated || new Date().toISOString()),
    });
  } catch (error) {
    console.error('[Public metrics]', error instanceof Error ? error.message : 'Falha');
    return res.status(503).json({ error: 'Métricas temporariamente indisponíveis.' });
  }
}
