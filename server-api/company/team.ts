import { randomUUID } from 'node:crypto';
import { getServerAdminFirestore, verifyFirebaseIdentity } from '../../lib/firebaseAdminServer.js';
import { resolveApprovedOwnedCompany } from '../../lib/companyAccess.js';

type Req = {
  method?: string;
  body?: unknown;
  headers: Record<string, string | string[] | undefined>;
};
type Res = {
  setHeader(name: string, value: string): void;
  status(code: number): Res;
  json(body: unknown): unknown;
};

function clean(value: unknown, max: number): string {
  return String(value || '').trim().slice(0, max);
}

async function getCompanyContext(req: Req) {
  const identity = await verifyFirebaseIdentity(
    typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined,
  );

  const db = getServerAdminFirestore();
  const profileSnap = await db.collection('user_profiles').doc(identity.uid).get();

  if (!profileSnap.exists) throw new Error('PROFILE_NOT_FOUND');

  const rawProfile = profileSnap.data() as Record<string, any>;
  const approvedCompany = await resolveApprovedOwnedCompany(
    db,
    identity.uid,
    clean(rawProfile.companyId, 180),
  );
  if (!approvedCompany) throw new Error('COMPANY_NOT_APPROVED');

  return { identity, db, companyId: approvedCompany.companyId };
}

export default async function handler(req: Req, res: Res) {
  res.setHeader('Cache-Control', 'no-store');

  try {
    const { identity, db, companyId } = await getCompanyContext(req);

    if (req.method === 'GET') {
      const snap = await db.collection('team_members')
        .where('companyId', '==', companyId)
        .limit(200)
        .get();

      const members = snap.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .sort((a: any, b: any) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));

      return res.status(200).json({ success: true, companyId, members });
    }

    if (req.method === 'POST') {
      const body = req.body && typeof req.body === 'object'
        ? req.body as Record<string, unknown>
        : {};
      const action = clean(body.action, 40) || 'create';

      if (action === 'delete') {
        const memberId = clean(body.memberId, 180);
        if (!memberId) return res.status(400).json({ error: 'Membro inválido.' });

        const ref = db.collection('team_members').doc(memberId);
        const snap = await ref.get();
        if (!snap.exists) return res.status(404).json({ error: 'Membro não encontrado.' });
        if (String(snap.data()!.companyId || '') !== companyId) {
          return res.status(403).json({ error: 'Este membro pertence a outra empresa.' });
        }

        await ref.delete();
        return res.status(200).json({ success: true, deleted: memberId });
      }

      if (action !== 'create') {
        return res.status(400).json({ error: 'Ação inválida.' });
      }

      const name = clean(body.name, 140);
      const email = clean(body.email, 200).toLowerCase();
      const role = clean(body.role, 100);
      const status = clean(body.status, 30) || 'Ativo';

      if (name.length < 2) return res.status(400).json({ error: 'Informe o nome do membro.' });
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'Informe um e-mail válido.' });
      }
      if (!role) return res.status(400).json({ error: 'Informe a função do membro.' });
      if (!['Ativo', 'Pendente', 'Inativo'].includes(status)) {
        return res.status(400).json({ error: 'Status inválido.' });
      }

      const duplicate = await db.collection('team_members')
        .where('companyId', '==', companyId)
        .where('email', '==', email)
        .limit(1)
        .get();

      if (!duplicate.empty) {
        return res.status(409).json({ error: 'Este e-mail já está cadastrado na equipe desta empresa.' });
      }

      const now = new Date().toISOString();
      const memberId = `team_${randomUUID().replace(/-/g, '')}`;
      const member = {
        id: memberId,
        companyId,
        ownerId: identity.uid,
        name,
        email,
        role,
        salesCount: 0,
        commissionGenerated: 0,
        bonus: 0,
        status,
        createdAt: now,
        updatedAt: now,
      };

      await db.collection('team_members').doc(memberId).set(member);
      return res.status(200).json({ success: true, member });
    }

    return res.status(405).json({ error: 'Método não permitido.' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha';

    if (/Firebase ID token|token inválido|auth\/id-token/i.test(message)) {
      return res.status(401).json({ error: 'Sua sessão expirou. Entre novamente.' });
    }
    if (message === 'PROFILE_NOT_FOUND') return res.status(404).json({ error: 'Perfil não encontrado.' });
    if (message === 'COMPANY_NOT_APPROVED') return res.status(403).json({ error: 'A empresa precisa estar aprovada.' });
    if (message === 'COMPANY_NOT_LINKED') return res.status(409).json({ error: 'A conta ainda não está vinculada à empresa.' });
    if (message === 'COMPANY_NOT_FOUND') return res.status(404).json({ error: 'Empresa não encontrada.' });
    if (message === 'COMPANY_OWNERSHIP_MISMATCH') return res.status(403).json({ error: 'A empresa não pertence a esta conta.' });

    console.error('[Company team]', message);
    return res.status(503).json({ error: 'Não foi possível gerenciar a equipe agora.' });
  }
}
