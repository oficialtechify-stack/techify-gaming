import { getServerAdminFirestore, verifyFirebaseIdentity } from '../../lib/firebaseAdminServer.js';

type Req = { method?: string; body?: unknown; headers: Record<string, string | string[] | undefined> };
type Res = { setHeader(name: string, value: string): void; status(code: number): Res; json(body: unknown): unknown };

function digits(value: unknown): string { return typeof value === 'string' ? value.replace(/\D/g, '') : ''; }
function validCpf(value: string): boolean {
  if (!/^\d{11}$/.test(value) || /^([0-9])\1{10}$/.test(value)) return false;
  const check = (length: number) => {
    let sum = 0;
    for (let i = 0; i < length; i++) sum += Number(value[i]) * (length + 1 - i);
    const rest = (sum * 10) % 11;
    return (rest === 10 ? 0 : rest) === Number(value[length]);
  };
  return check(9) && check(10);
}

export default async function handler(req: Req, res: Res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });

  try {
    const identity = await verifyFirebaseIdentity(
      typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined,
      { requireVerifiedEmail: true },
    );
    const body = req.body && typeof req.body === 'object' ? req.body as Record<string, unknown> : {};
    const cpf = digits(body.cpf);
    const name = String(body.name || '').trim().slice(0, 160);
    if (!name || !validCpf(cpf)) return res.status(400).json({ error: 'Informe nome e CPF válidos.' });

    const db = getServerAdminFirestore();
    const profileRef = db.collection('user_profiles').doc(identity.uid);
    const profileSnap = await profileRef.get();
    if (!profileSnap.exists) return res.status(404).json({ error: 'Perfil não encontrado.' });
    const profile = profileSnap.data()!;
    if (profile.banned === true || profile.status === 'banned') return res.status(403).json({ error: 'Esta conta está bloqueada.' });

    const duplicates = await db.collection('user_profiles').where('cleanCpf', '==', cpf).limit(20).get();
    if (duplicates.docs.some((doc) => doc.id !== identity.uid)) {
      return res.status(409).json({ error: 'Este CPF já está associado a outro cadastro.' });
    }

    const hadCompany = profile.hasCompanyProfile === true || profile.accountType === 'empresa' || profile.accountType === 'ambos';
    const now = new Date().toISOString();
    const update = {
      name,
      cpf,
      cleanCpf: cpf,
      pixKey: String(body.pixKey || '').trim().slice(0, 160),
      pixKeyType: String(body.pixKeyType || '').trim().slice(0, 40),
      whatsapp: String(body.whatsapp || '').trim().slice(0, 40),
      hasAffiliateProfile: true,
      hasCompanyProfile: hadCompany,
      accountType: hadCompany ? 'ambos' : 'afiliado',
      activeRoleMode: 'afiliado',
      affiliateVerificationStatus: profile.affiliateVerificationStatus === 'approved' ? 'approved' : 'draft',
      updatedAt: now,
    };

    const batch = db.batch();
    batch.set(profileRef, update, { merge: true });
    batch.set(db.collection('users').doc(identity.uid), {
      accountType: hadCompany ? 'ambos' : 'afiliado',
      activeRoleMode: 'afiliado',
      updatedAt: now,
    }, { merge: true });
    await batch.commit();
    return res.status(200).json({ success: true, profile: { ...profile, ...update } });
  } catch (error) {
    console.error('[Enable affiliate role]', error instanceof Error ? error.message : 'Falha');
    return res.status(503).json({ error: 'Não foi possível ativar o perfil de afiliado agora.' });
  }
}
