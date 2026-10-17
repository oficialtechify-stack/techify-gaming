import { createHash, randomBytes } from 'node:crypto';
import { getServerAdminFirestore, verifyFirebaseIdentity } from '../../lib/firebaseAdminServer.js';
import { resolveApprovedOwnedCompany } from '../../lib/companyAccess.js';
import { requireAdminIdentity } from '../../lib/adminAccess.js';
import { activateAccountArea, hasAccountArea, validateAffiliateInvitation } from '../../lib/accountAreas.js';
type Req = { method?: string; body?: unknown; headers: Record<string, string | string[] | undefined> };
type Res = { setHeader(name: string, value: string): void; status(code: number): Res; json(body: unknown): unknown };
export function createAccountAreaHandler({
  getDb = getServerAdminFirestore,
  verifyIdentity = verifyFirebaseIdentity,
  requireAdmin = requireAdminIdentity,
  resolveCompany = resolveApprovedOwnedCompany,
} = {}) {
return async function handler(req: Req, res: Res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });
  try {
    const body = req.body && typeof req.body === 'object' ? req.body as Record<string, unknown> : {};
    const db = getDb();
    if (body.action === 'invite' || body.action === 'company-invite') {
      let issuer: { uid: string };
      let companyId = '';
      if (body.action === 'invite') issuer = await requireAdmin(req.headers);
      else {
        issuer = await verifyIdentity(typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined, { requireVerifiedEmail: true });
        const owned = await resolveCompany(db, issuer.uid, '');
        if (!owned) return res.status(403).json({ error: 'Apenas o titular de uma empresa aprovada pode convidar afiliados.' });
        companyId = owned.companyId;
      }
      const email = String(body.email || '').trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return res.status(400).json({ error: 'Informe um e-mail válido.' });
      const token = randomBytes(32).toString('hex');
      const hash = createHash('sha256').update(token).digest('hex');
      const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
      await db.collection('affiliate_invitations').doc(hash).create({ email, expiresAt, createdBy: issuer.uid, companyId, createdAt: Date.now() });
      return res.status(201).json({ token, expiresAt });
    }
    const identity = await verifyIdentity(typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined);
    const area = body.area;
    if (area !== 'empresa' && area !== 'afiliado') return res.status(400).json({ error: 'Escolha uma área válida.' });
    if (!identity.email) return res.status(400).json({ error: 'A conta precisa de um e-mail.' });
    const ref = db.collection('user_profiles').doc(identity.uid);
    const token = String(body.invitation || '').trim();
    const inviteRef = /^[a-f0-9]{64}$/.test(token) ? db.collection('affiliate_invitations').doc(createHash('sha256').update(token).digest('hex')) : null;
    const result = await db.runTransaction(async tx => {
      const snap = await tx.get(ref);
      const current = snap.exists ? snap.data()! : {};
      if (current.banned === true || current.archived === true || current.isArchived === true || ['banned', 'archived'].includes(current.status)) throw Object.assign(new Error('Esta conta não pode ativar áreas.'), { statusCode: 403 });
      if (current.accountType === 'admin') throw Object.assign(new Error('Use uma conta de participante.'), { statusCode: 403 });
      let invitedCompanyId = '';
      if (area === 'afiliado' && (!hasAccountArea(current, area) || token)) {
        const invite = inviteRef ? (await tx.get(inviteRef)).data() : undefined;
        const invalid = validateAffiliateInvitation(invite, identity.email!, identity.uid);
        if (invalid) throw Object.assign(new Error(invalid), { statusCode: 403 });
        invitedCompanyId = String(invite?.companyId || '');
        tx.set(inviteRef!, { usedBy: identity.uid, usedAt: Date.now() }, { merge: true });
      }
      const now = new Date().toISOString();
      const update = { ...(!snap.exists ? { userId: identity.uid, name: String(body.name || identity.email!.split('@')[0]).trim().slice(0, 160), email: identity.email, availableBalance: 0, pendingBalance: 0, totalEarned: 0, totalSalesCount: 0, verified: false, createdAt: now } : {}), ...activateAccountArea(current, area), ...(invitedCompanyId ? { affiliateInvitedCompanyIds: [...new Set([...(Array.isArray(current.affiliateInvitedCompanyIds) ? current.affiliateInvitedCompanyIds : []), invitedCompanyId])] } : {}), updatedAt: now };
      tx.set(ref, update, { merge: true });
      tx.set(db.collection('users').doc(identity.uid), { ...activateAccountArea(current, area), updatedAt: now }, { merge: true });
      return { ...current, ...update };
    });
    return res.status(200).json({ profile: result });
  } catch (error: any) {
    return res.status(error.statusCode || 503).json({ error: error.statusCode ? error.message : 'Não foi possível ativar a área. Confira seu acesso e tente novamente.' });
  }
}

}
export default createAccountAreaHandler();
