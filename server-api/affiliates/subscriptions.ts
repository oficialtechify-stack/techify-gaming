import { getServerAdminFirestore, verifyFirebaseIdentity } from '../../lib/firebaseAdminServer.js';
import { applyVerificationRequest, profileRoleIsApproved } from '../../lib/profileEligibility.js';

type Req = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
};
type Res = {
  setHeader(name: string, value: string): void;
  status(code: number): Res;
  json(body: unknown): unknown;
};

const approvedSale = (value: unknown) =>
  ['aprovado', 'approved', 'liberado', 'received', 'confirmed'].includes(
    String(value || '').trim().toLowerCase(),
  );

export default async function handler(req: Req, res: Res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido.' });

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

    if (!profileRoleIsApproved(profile, 'afiliado')) {
      return res.status(403).json({ error: 'O perfil de Afiliado precisa estar aprovado.' });
    }

    const [subscriptionSnap, salesSnap] = await Promise.all([
      db.collection('product_subscriptions')
        .where('affiliateId', '==', identity.uid)
        .limit(300)
        .get(),
      db.collection('sales')
        .where('affiliateId', '==', identity.uid)
        .limit(1500)
        .get(),
    ]);

    const subscriptions = subscriptionSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Record<string, any>));
    const recurringSales = salesSnap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() } as Record<string, any>))
      .filter((sale) => {
        if (sale.recurring !== true || !approvedSale(sale.status)) return false;
        if (process.env.VERCEL_ENV !== 'production') return true;
        return sale.is_test !== true && String(sale.environment || '').toLowerCase() !== 'development';
      });

    const planIds = [...new Set(subscriptions.map((item) => String(item.planId || '')).filter(Boolean))];
    const companyIds = [...new Set(subscriptions.map((item) => String(item.companyId || '')).filter(Boolean))];

    const [planEntries, companyEntries] = await Promise.all([
      Promise.all(planIds.map(async (id) => {
        const snap = await db.collection('plans').doc(id).get();
        return [id, snap.exists ? snap.data() : null] as const;
      })),
      Promise.all(companyIds.map(async (id) => {
        const snap = await db.collection('companies').doc(id).get();
        return [id, snap.exists ? snap.data() : null] as const;
      })),
    ]);

    const planMap = new Map(planEntries);
    const companyMap = new Map(companyEntries);

    const sanitized = subscriptions
      .map((sub) => {
        const id = String(sub.id || '');
        const subSales = recurringSales.filter((sale) => String(sale.stripeSubscriptionId || '') === id);
        const renewalSales = subSales.filter((sale) => String(sale.saleKind || '') === 'subscription_renewal');
        const totalCommissionEarned = subSales.reduce((sum, sale) => sum + Number(sale.commissionEarned || 0), 0);
        const recurringCommissionEarned = renewalSales.reduce((sum, sale) => sum + Number(sale.commissionEarned || 0), 0);
        const plan = planMap.get(String(sub.planId || '')) || {};
        const company = companyMap.get(String(sub.companyId || '')) || {};

        return {
          id,
          planId: String(sub.planId || ''),
          planName: String((plan as any)?.name || sub.planName || 'Produto recorrente'),
          companyId: String(sub.companyId || ''),
          companyName: String((company as any)?.name || (company as any)?.companyName || sub.companyName || 'Empresa parceira'),
          billingCycle: String(sub.billingCycle || 'MONTHLY'),
          recurringCommissionEnabled: sub.recurringCommissionEnabled !== false,
          affiliatePercentInitial: Number(sub.affiliatePercentInitial || 0),
          affiliatePercentRecurring: Number(sub.affiliatePercentRecurring || 0),
          status: String(sub.status || ''),
          active: sub.active === true,
          cancelAtPeriodEnd: sub.cancelAtPeriodEnd === true,
          lastPaidAt: sub.lastPaidAt || null,
          updatedAt: sub.updatedAt || null,
          renewalsPaid: renewalSales.length,
          recurringCommissionEarned,
          totalCommissionEarned,
        };
      })
      .sort((a, b) => String(b.lastPaidAt || b.updatedAt || '').localeCompare(String(a.lastPaidAt || a.updatedAt || '')));

    return res.status(200).json({
      success: true,
      subscriptions: sanitized,
      totals: {
        subscriptions: sanitized.length,
        active: sanitized.filter((item) => item.active).length,
        renewalsPaid: sanitized.reduce((sum, item) => sum + item.renewalsPaid, 0),
        recurringCommissionEarned: sanitized.reduce((sum, item) => sum + item.recurringCommissionEarned, 0),
        totalCommissionEarned: sanitized.reduce((sum, item) => sum + item.totalCommissionEarned, 0),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha';
    console.error('[Affiliate subscriptions]', message);
    if (/Firebase ID token|token inválido|auth\/id-token/i.test(message)) {
      return res.status(401).json({ error: 'Sua sessão expirou. Entre novamente.' });
    }
    return res.status(503).json({ error: 'Não foi possível carregar suas comissões recorrentes agora.' });
  }
}
