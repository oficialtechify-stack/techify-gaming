import { getServerAdminFirestore, verifyFirebaseIdentity } from '../../lib/firebaseAdminServer.js';

type RequestLike = { method?: string; body?: unknown; headers: Record<string, string | string[] | undefined> };
type ResponseLike = { setHeader(name: string, value: string): void; status(code: number): ResponseLike; json(body: unknown): unknown };

function onlyDigits(value: unknown): string {
  return typeof value === 'string' ? value.replace(/\D/g, '') : '';
}
function formatCpf(digits: string): string { return digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4'); }
function formatCnpj(digits: string): string { return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5'); }

export default async function handler(req: RequestLike, res: ResponseLike) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });
  if (typeof req.headers.authorization !== 'string' || !/^Bearer\s+\S+/i.test(req.headers.authorization)) {
    return res.status(401).json({ error: 'Faça login para validar o documento.' });
  }
  try {
    const identity = await verifyFirebaseIdentity(typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined);
    const body = req.body && typeof req.body === 'object' ? req.body as Record<string, unknown> : {};
    const kind = body.kind;
    const digits = onlyDigits(body.document);
    if ((kind === 'cpf' && digits.length !== 11) || (kind === 'cnpj' && digits.length !== 14)) {
      return res.status(400).json({ error: 'Documento inválido.' });
    }
    if (kind !== 'cpf' && kind !== 'cnpj') return res.status(400).json({ error: 'Tipo de documento inválido.' });

    const db = getServerAdminFirestore();
    const profileCollection = db.collection('user_profiles');
    const companyCollection = db.collection('companies');
    const formatted = kind === 'cpf' ? formatCpf(digits) : formatCnpj(digits);
    const queries = kind === 'cpf'
      ? [profileCollection.where('cleanCpf', '==', digits), profileCollection.where('cpf', '==', formatted), profileCollection.where('companyCnpj', '==', formatted), companyCollection.where('cleanCpf', '==', digits), companyCollection.where('cpf', '==', formatted)]
      : [profileCollection.where('cleanCnpj', '==', digits), profileCollection.where('cnpj', '==', formatted), profileCollection.where('companyCnpj', '==', formatted), companyCollection.where('cleanCnpj', '==', digits), companyCollection.where('cnpj', '==', formatted)];
    const snapshots = await Promise.all(queries.map((query) => query.limit(20).get()));
    const conflict = snapshots.some((snapshot) => snapshot.docs.some((document) => {
      const data = document.data();
      const ownerId = document.ref.parent.id === 'companies' ? String(data.ownerId || data.submittedBy || '') : document.id;
      return ownerId && ownerId !== identity.uid;
    }));
    return res.status(200).json({ exists: conflict });
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('[Check profile document]', detail);
    return res.status(503).json({ error: 'Não foi possível validar o documento neste momento.' });
  }
}
