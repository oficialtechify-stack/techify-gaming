import { getServerAdminFirestore, verifyFirebaseIdentity } from '../../lib/firebaseAdminServer.js';
import { applyVerificationRequest, profileHasRole, profileRoleIsApproved } from '../../lib/profileEligibility.js';

type Req = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
};
type Res = {
  setHeader(name: string, value: string): void;
  status(code: number): Res;
  json(body: unknown): unknown;
};

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

    if (!profileHasRole(profile, 'empresa') || !profileRoleIsApproved(profile, 'empresa')) {
      return res.status(403).json({ error: 'A empresa precisa estar aprovada.' });
    }

    const companyId = String(profile.companyId || '').trim();
    if (!companyId) return res.status(409).json({ error: 'Empresa não vinculada.' });

    const companySnap = await db.collection('companies').doc(companyId).get();
    if (!companySnap.exists) return res.status(404).json({ error: 'Empresa não encontrada.' });
    const company = companySnap.data()!;
    if (String(company.ownerId || company.submittedBy || '') !== identity.uid) {
      return res.status(403).json({ error: 'Esta empresa não pertence à conta autenticada.' });
    }

    const clickSnap = await db.collection('affiliate_clicks')
      .where('companyId', '==', companyId)
      .limit(5000)
      .get();

    const sourceMap = new Map<string, number>();
    let totalClicks = 0;

    for (const doc of clickSnap.docs) {
      const data = doc.data();
      const source = String(data.utmSource || 'direto').trim().toLowerCase() || 'direto';
      sourceMap.set(source, (sourceMap.get(source) || 0) + 1);
      totalClicks += 1;
    }

    const sources = Array.from(sourceMap.entries())
      .map(([source, clicks]) => ({ source, clicks }))
      .sort((a, b) => b.clicks - a.clicks);

    return res.status(200).json({
      success: true,
      companyId,
      totalClicks,
      sources,
      truncated: clickSnap.size >= 5000,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha';
    console.error('[Company traffic report]', message);
    if (/Firebase ID token|token inválido|auth\/id-token/i.test(message)) {
      return res.status(401).json({ error: 'Sua sessão expirou. Entre novamente.' });
    }
    return res.status(503).json({ error: 'Não foi possível carregar os cliques agora.' });
  }
}
