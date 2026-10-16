import { getServerAdminFirestore } from '../../lib/firebaseAdminServer.js';

type Req = { method?: string; query?: Record<string, string | string[] | undefined> };
type Res = { setHeader(name: string, value: string): void; status(code: number): Res; json(body: unknown): unknown };
const BLOCKED = new Set(['iGaming & Apostas', 'Educação / Cursos']);
const clean = (value: unknown) => String(value || '').trim();

export default async function handler(req: Req, res: Res) {
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido.' });
  try {
    const db = getServerAdminFirestore();
    const companiesSnap = await db.collection('companies').limit(200).get();
    const approved = new Map<string, Record<string, any>>();
    for (const doc of companiesSnap.docs) {
      const data = doc.data();
      if (data.verified !== true || clean(data.status).toLowerCase() !== 'approved' || data.archived === true || data.isArchived === true || data.banned === true) continue;
      approved.set(doc.id, data);
    }
    const plansSnap = await db.collection('plans').limit(300).get();
    const offers = plansSnap.docs.flatMap(doc => {
      const p = doc.data();
      const company = approved.get(clean(p.companyId));
      if (!company || BLOCKED.has(clean(p.category)) || p.active === false || clean(p.status).toLowerCase() !== 'ativo' || p.archived === true || p.isArchived === true) return [];
      return [{
        id: doc.id, companyId: clean(p.companyId), companyName: clean(company.name || p.companyName),
        companySlug: clean(company.slug), companyLogo: clean(company.logo),
        name: clean(p.name), description: clean(p.description).slice(0,600),
        category: clean(p.category), bannerImage: clean(p.bannerImage),
        price: Number(p.price ?? p.priceSetup ?? p.priceMonthly ?? 0),
        billingType: clean(p.billingType || p.paymentType),
        billingCycle: clean(p.billingCycle || p.billingInterval),
      }];
    });
    return res.status(200).json({ offers, companies: Array.from(approved.entries()).map(([id, c]) => ({
      id, name: clean(c.name), slug: clean(c.slug), tagline: clean(c.tagline), logo: clean(c.logo),
      description: clean(c.description).slice(0,800), category: clean(c.category),
      bannerImage: clean(c.bannerImage), website: clean(c.website), ownerId: clean(c.ownerId || c.submittedBy),
    })) });
  } catch (error) {
    console.error('[Public marketplace]', error);
    return res.status(503).json({ error: 'Vitrine temporariamente indisponível.' });
  }
}
