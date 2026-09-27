import { getAuth } from 'firebase-admin/auth';
import { getServerAdminApp, verifyFirebaseIdentity } from '../../lib/firebaseAdminServer';

const ADMIN_EMAILS = new Set([
  'leadspay.oficial@gmail.com',
  'rickmarketing81@gmail.com',
  'agencyosoficial@gmail.com',
  'aigerakabane81983521523@gmail.com',
  'admin@leadspay.com',
]);

type RequestLike = {
  method?: string;
  body?: unknown;
  headers: Record<string, string | string[] | undefined>;
};
type ResponseLike = {
  setHeader(name: string, value: string): void;
  status(code: number): ResponseLike;
  json(body: unknown): unknown;
};

export default async function handler(req: RequestLike, res: ResponseLike) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });
  if (typeof req.headers.authorization !== 'string' || !/^Bearer\s+\S+/i.test(req.headers.authorization)) {
    return res.status(401).json({ error: 'Faça login para verificar os cadastros.' });
  }

  try {
    const identity = await verifyFirebaseIdentity(
      typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined,
    );
    if (!identity.email || !ADMIN_EMAILS.has(identity.email.toLowerCase())) {
      return res.status(403).json({ error: 'Acesso administrativo não autorizado.' });
    }

    const body = req.body && typeof req.body === 'object' ? req.body as Record<string, unknown> : {};
    const requested = Array.isArray(body.uids) ? body.uids : [];
    if (requested.length > 100) return res.status(400).json({ error: 'A auditoria aceita até 100 IDs por solicitação.' });
    const uids = [...new Set(requested.filter((id): id is string =>
      typeof id === 'string' && /^[\w:-]{1,128}$/.test(id) && !id.startsWith('comp-'),
    ))];
    if (!uids.length) return res.status(200).json({ existingUids: [] });

    const result = await getAuth(getServerAdminApp()).getUsers(uids.map((uid) => ({ uid })));
    return res.status(200).json({ existingUids: result.users.map((user) => user.uid) });
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('[Admin identity audit]', detail);
    return res.status(503).json({ error: 'Não foi possível validar as identidades neste ambiente.' });
  }
}
