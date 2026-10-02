import { FieldValue } from 'firebase-admin/firestore';
import { getServerAdminFirestore } from '../../lib/firebaseAdminServer.js';

type Req = { method?: string; body?: unknown };
type Res = { status(code:number):Res; json(body:unknown):unknown; setHeader(name:string,value:string):void; end():unknown };

const cleanText = (value: unknown, max = 120) =>
  String(value || '').trim().replace(/[\u0000-\u001F\u007F]/g, '').slice(0, max);

const activeState = (value: unknown) => {
  const state = String(value || '').trim().toLowerCase();
  return state === 'ativo' || state === 'active' || state === 'approved';
};

export default async function handler(req: Req, res: Res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });

  const body = req.body && typeof req.body === 'object' ? req.body as Record<string, unknown> : {};
  const planId = cleanText(body.planId, 150);
  const affiliateCode = cleanText(body.affiliateCode, 90);
  const eventId = cleanText(body.eventId, 120);
  const utmSource = cleanText(body.utmSource, 100);
  const utmMedium = cleanText(body.utmMedium, 100);
  const utmCampaign = cleanText(body.utmCampaign, 140);

  if (!/^[A-Za-z0-9_-]{1,150}$/.test(planId)) return res.status(400).json({ error: 'Oferta inválida.' });
  if (!/^[A-Za-z0-9_-]{3,90}$/.test(affiliateCode)) return res.status(400).json({ error: 'Código de afiliado inválido.' });
  if (!/^[A-Za-z0-9_-]{16,120}$/.test(eventId)) return res.status(400).json({ error: 'Identificador de clique inválido.' });

  try {
    const db = getServerAdminFirestore();
    const [planSnap, byPrimary] = await Promise.all([
      db.collection('plans').doc(planId).get(),
      db.collection('affiliations').where('affiliateCode', '==', affiliateCode).limit(1).get(),
    ]);
    let affiliationDoc = byPrimary.docs[0];
    if (!affiliationDoc) {
      const legacy = await db.collection('affiliations').where('affiliate_code', '==', affiliateCode).limit(1).get();
      affiliationDoc = legacy.docs[0];
    }
    if (!planSnap.exists || !affiliationDoc) return res.status(404).json({ error: 'Link de afiliado não encontrado.' });

    const plan = planSnap.data()!;
    const affiliation = affiliationDoc.data();
    const companyId = String(plan.companyId || '');
    const linkedPlanId = String(affiliation.planId || affiliation.plan_id || '');
    const linkedCompanyId = String(affiliation.companyId || '');

    if (
      !activeState(plan.status) ||
      plan.active === false ||
      plan.allowAffiliates === false ||
      !activeState(affiliation.status) ||
      linkedPlanId !== planId ||
      linkedCompanyId !== companyId
    ) {
      return res.status(409).json({ error: 'Este link de afiliado não está ativo.' });
    }

    const clickRef = db.collection('affiliate_clicks').doc(eventId);
    const now = new Date().toISOString();
    const result = await db.runTransaction(async (tx) => {
      const existing = await tx.get(clickRef);
      if (existing.exists) return { duplicate: true };

      tx.create(clickRef, {
        id: eventId,
        planId,
        companyId,
        affiliateId: String(affiliation.affiliateId || affiliation.userId || ''),
        affiliateCode,
        utmSource: utmSource || null,
        utmMedium: utmMedium || null,
        utmCampaign: utmCampaign || null,
        createdAt: now,
      });
      tx.set(affiliationDoc.ref, {
        clicks: FieldValue.increment(1),
        lastClickAt: now,
        updatedAt: now,
      }, { merge: true });
      return { duplicate: false };
    });

    return res.status(200).json({ success: true, tracked: !result.duplicate, duplicate: result.duplicate });
  } catch (error) {
    console.error('[affiliate-click]', error instanceof Error ? error.message : error);
    return res.status(503).json({ error: 'Não foi possível registrar o clique agora.' });
  }
}
