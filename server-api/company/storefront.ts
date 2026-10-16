import { getServerAdminFirestore, verifyFirebaseIdentity } from '../../lib/firebaseAdminServer.js';
type Req = { method?: string; body?: Record<string, unknown>; headers: Record<string, string | string[] | undefined> };
type Res = { setHeader(name: string, value: string): void; status(code: number): Res; json(data: unknown): unknown };
const field = (value: unknown, max: number) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const safeImage = (value: unknown) => { const url = field(value, 3000); return !url || /^https:\/\//i.test(url) ? url : null; };
export default async function handler(req: Req, res: Res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'PATCH') return res.status(405).json({ error: 'Método não permitido.' });
  try {
    const identity = await verifyFirebaseIdentity(typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined);
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const companyId = field(body.companyId, 180);
    if (!companyId) return res.status(400).json({ error: 'Empresa inválida.' });
    const logo = safeImage(body.logo), bannerImage = safeImage(body.bannerImage);
    if (logo === null || bannerImage === null) return res.status(400).json({ error: 'Imagens devem usar endereço HTTPS.' });
    const website = field(body.website, 500);
    if (website && !/^https:\/\//i.test(website)) return res.status(400).json({ error: 'O site deve começar com https://.' });
    const db = getServerAdminFirestore();
    const ref = db.collection('companies').doc(companyId);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: 'Empresa não encontrada.' });
    const company = snap.data()!;
    if (company.archived || company.isArchived) return res.status(403).json({ error: 'Empresa arquivada.' });
    if (String(company.ownerId || company.submittedBy || '') !== identity.uid) return res.status(403).json({ error: 'Apenas o proprietário pode editar esta vitrine.' });
    const profileSnap = await db.collection('user_profiles').doc(identity.uid).get();
    const profile = profileSnap.data();
    if (!profileSnap.exists || String(profile?.companyId || '') !== companyId || profile?.hasCompanyProfile !== true) {
      return res.status(403).json({ error: 'Esta conta não está vinculada à empresa proprietária.' });
    }
    const update = { logo, bannerImage, tagline: field(body.tagline, 240), description: field(body.description, 1500), website, updatedAt: new Date().toISOString() };
    await ref.update(update);
    return res.status(200).json({ success: true, companyId, ...update });
  } catch (error) {
    console.error('[Storefront update]', error instanceof Error ? error.message : 'error');
    return res.status(503).json({ error: 'Não foi possível salvar a vitrine.' });
  }
}
