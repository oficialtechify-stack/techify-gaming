import { randomBytes } from 'node:crypto';
import { getServerAdminFirestore, verifyFirebaseIdentity } from '../lib/firebaseAdminServer.js';

type Req = { method?: string; body?: unknown; headers: Record<string, string | string[] | undefined> };
type Res = { setHeader(name: string, value: string): void; status(code: number): Res; json(body: unknown): unknown };

function cleanText(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}
function digits(value: unknown): string {
  return typeof value === 'string' ? value.replace(/\D/g, '') : '';
}

export default async function handler(req: Req, res: Res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });

  try {
    const identity = await verifyFirebaseIdentity(
      typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined,
    );
    const body = req.body && typeof req.body === 'object' ? req.body as Record<string, unknown> : {};
    const name = cleanText(body.name || body.companyName, 160);
    if (!name) return res.status(400).json({ error: 'Informe o nome da empresa.' });

    const db = getServerAdminFirestore();
    const profileRef = db.collection('user_profiles').doc(identity.uid);
    const profileSnap = await profileRef.get();
    if (!profileSnap.exists) return res.status(404).json({ error: 'Perfil não encontrado.' });
    const profile = profileSnap.data()!;
    if (profile.banned === true || profile.status === 'banned') {
      return res.status(403).json({ error: 'Esta conta não pode cadastrar empresas.' });
    }

    const owned = await db.collection('companies').where('ownerId', '==', identity.uid).limit(10).get();
    const current = owned.docs.find((doc) => doc.data().archived !== true && doc.data().isArchived !== true);
    if (current) {
      return res.status(409).json({
        error: 'Você já possui uma empresa ativa. Edite a empresa existente em vez de criar outra.',
        companyId: current.id,
      });
    }

    const now = new Date().toISOString();
    const id = 'comp-' + Date.now() + '-' + randomBytes(3).toString('hex');
    const slugBase = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const cnpjDigits = digits(body.cnpj || body.companyCnpj);
    const cpfDigits = digits(body.cpf);
    const hadAffiliate = profile.hasAffiliateProfile === true || profile.accountType === 'afiliado' || profile.accountType === 'ambos';

    const company = {
      id,
      name,
      companyName: name,
      slug: (slugBase || id).slice(0, 100),
      tagline: cleanText(body.tagline, 240),
      description: cleanText(body.description, 5000),
      category: cleanText(body.category, 120) || 'SaaS / B2B',
      website: cleanText(body.website, 500),
      logo: cleanText(body.logo, 3000),
      bannerImage: cleanText(body.bannerImage, 3000),
      email: cleanText(body.email, 200) || identity.email || '',
      whatsapp: cleanText(body.whatsapp || body.phone, 40),
      phone: cleanText(body.phone || body.whatsapp, 40),
      cnpj: cleanText(body.cnpj || body.companyCnpj, 30),
      cpf: cleanText(body.cpf, 20),
      cleanCnpj: cnpjDigits.length === 14 ? cnpjDigits : '',
      cleanCpf: cpfDigits.length === 11 ? cpfDigits : '',
      companyDocType: cleanText(body.companyDocType, 20) || (cnpjDigits.length === 14 ? 'CNPJ' : 'CPF'),
      ownerId: identity.uid,
      submittedBy: identity.uid,
      submittedByName: cleanText(profile.name, 160),
      submittedByEmail: identity.email || '',
      status: 'pending',
      verified: false,
      kyc_status: 'submitted',
      archived: false,
      totalPlansCount: 0,
      totalAffiliatesCount: 0,
      totalSalesVolume: 0,
      grossRevenue: 0,
      netRevenue: 0,
      totalCheckoutFees: 0,
      totalAffiliateCommissions: 0,
      createdAt: now,
      submittedAt: now,
      updatedAt: now,
    };

    const batch = db.batch();
    batch.create(db.collection('companies').doc(id), company);
    batch.set(profileRef, {
      hasCompanyProfile: true,
      hasAffiliateProfile: hadAffiliate,
      accountType: hadAffiliate ? 'ambos' : 'empresa',
      activeRoleMode: 'empresa',
      companyId: id,
      companyName: name,
      empresaVerificationStatus: 'pending',
      companyVerificationStatus: 'pending',
      updatedAt: now,
    }, { merge: true });
    batch.set(db.collection('users').doc(identity.uid), {
      companyId: id,
      companyName: name,
      updatedAt: now,
    }, { merge: true });
    batch.set(db.collection('verification_requests').doc(identity.uid), {
      id: identity.uid,
      userId: identity.uid,
      roleType: 'empresa',
      companyId: id,
      companyName: name,
      companyCnpj: company.cnpj,
      email: company.email,
      phone: company.whatsapp,
      name: cleanText(profile.name, 160),
      status: 'pending',
      verified: false,
      kyc_status: 'submitted',
      submittedAt: now,
      updatedAt: now,
    }, { merge: true });
    await batch.commit();

    return res.status(200).json({ success: true, company });
  } catch (error) {
    console.error('[Company create]', error instanceof Error ? error.message : 'Falha');
    return res.status(503).json({ error: 'Não foi possível cadastrar a empresa agora.' });
  }
}
