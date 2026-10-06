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

const cleanDimension = (value: unknown, fallback: string) =>
  String(value || fallback).trim().toLowerCase() || fallback;

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

    const clickSnap = await db.collection('affiliate_clicks')
      .where('affiliateId', '==', identity.uid)
      .limit(5000)
      .get();

    const sourceMap = new Map<string, number>();
    const campaignMap = new Map<string, { source: string; medium: string; campaign: string; clicks: number }>();
    let totalClicks = 0;

    for (const doc of clickSnap.docs) {
      const data = doc.data();
      const source = cleanDimension(data.utmSource, 'direto');
      const medium = cleanDimension(data.utmMedium, 'sem_medium');
      const campaign = cleanDimension(data.utmCampaign, 'sem_campanha');
      sourceMap.set(source, (sourceMap.get(source) || 0) + 1);

      const key = `${source}\u0001${medium}\u0001${campaign}`;
      const current = campaignMap.get(key) || { source, medium, campaign, clicks: 0 };
      current.clicks += 1;
      campaignMap.set(key, current);
      totalClicks += 1;
    }

    const sources = Array.from(sourceMap.entries())
      .map(([source, clicks]) => ({ source, clicks }))
      .sort((a, b) => b.clicks - a.clicks);

    const campaigns = Array.from(campaignMap.values())
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 500);

    return res.status(200).json({
      success: true,
      affiliateId: identity.uid,
      totalClicks,
      sources,
      campaigns,
      truncated: clickSnap.size >= 5000,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha';
    console.error('[Affiliate traffic report]', message);
    if (/Firebase ID token|token inválido|auth\/id-token/i.test(message)) {
      return res.status(401).json({ error: 'Sua sessão expirou. Entre novamente.' });
    }
    return res.status(503).json({ error: 'Não foi possível carregar seus cliques agora.' });
  }
}
