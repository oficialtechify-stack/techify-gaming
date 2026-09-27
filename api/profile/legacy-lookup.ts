import { getServerAdminFirestore, verifyFirebaseIdentity } from '../../lib/firebaseAdminServer';

type RequestLike = { method?: string; body?: unknown; headers: Record<string, string | string[] | undefined> };
type ResponseLike = { setHeader(name: string, value: string): void; status(code: number): ResponseLike; json(body: unknown): unknown };

export default async function handler(req: RequestLike, res: ResponseLike) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });
  if (typeof req.headers.authorization !== 'string' || !/^Bearer\s+\S+/i.test(req.headers.authorization)) {
    return res.status(401).json({ error: 'Faça login para consultar o cadastro antigo.' });
  }
  try {
    const identity = await verifyFirebaseIdentity(typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined);
    const body = req.body && typeof req.body === 'object' ? req.body as Record<string, unknown> : {};
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (!identity.email || !email || identity.email.toLowerCase() !== email) {
      return res.status(403).json({ error: 'A conta autenticada não corresponde ao e-mail solicitado.' });
    }
    const snapshot = await getServerAdminFirestore().collection('user_profiles').where('email', '==', email).limit(10).get();
    const legacy = snapshot.docs
      .filter((document) => document.id !== identity.uid)
      .sort((a, b) => String(b.data().updatedAt || b.data().createdAt || '').localeCompare(String(a.data().updatedAt || a.data().createdAt || '')))[0];
    return res.status(200).json({ profile: legacy?.data() || null });
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('[Legacy profile lookup]', detail);
    return res.status(503).json({ error: 'Não foi possível consultar o cadastro antigo neste momento.' });
  }
}
