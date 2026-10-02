import { getAuth } from 'firebase-admin/auth';
import { getServerAdminApp } from '../../lib/firebaseAdminServer.js';
import { requireAdminIdentity } from '../../lib/adminAccess.js';

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

  try {
    await requireAdminIdentity(req.headers);
    const body = req.body && typeof req.body === 'object' ? req.body as Record<string, unknown> : {};
    const requested = Array.isArray(body.uids) ? body.uids : [];
    if (requested.length > 100) return res.status(400).json({ error: 'A auditoria aceita até 100 IDs por solicitação.' });
    const uids = [...new Set(requested.filter((id): id is string =>
      typeof id === 'string' && /^[\w:-]{1,128}$/.test(id) && !id.startsWith('comp-'),
    ))];
    if (!uids.length) return res.status(200).json({ existingUids: [] });

    const result = await getAuth(getServerAdminApp()).getUsers(uids.map((uid) => ({ uid })));
    return res.status(200).json({ existingUids: result.users.map((user) => user.uid) });
  } catch (error: any) {
    const status = Number(error?.statusCode || 503);
    const detail = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('[Admin identity audit]', detail);
    return res.status(status).json({
      error: detail === 'Acesso administrativo não autorizado.'
        ? detail
        : 'Não foi possível validar as identidades neste ambiente.',
    });
  }
}
