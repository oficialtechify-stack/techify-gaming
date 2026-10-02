import { getServerAdminFirestore } from '../../lib/firebaseAdminServer.js';
import { requireAdminIdentity } from '../../lib/adminAccess.js';

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

const READABLE_COLLECTIONS = new Set([
  'user_profiles',
  'companies',
  'plans',
  'affiliations',
  'sales',
  'withdrawals',
  'clients',
  'balance_releases',
  'team_members',
  'verification_requests',
  'platform_settings',
]);

const TEST_CLEANUP_COLLECTIONS = [
  'sales',
  'withdrawals',
  'clients',
  'balance_releases',
  'stripe_checkout_orders',
  'stripe_webhook_events',
  'affiliations',
  'plans',
  'companies',
  'verification_requests',
  'user_profiles',
  'team_members',
] as const;

function isTestRecord(id: string, data: Record<string, any>): boolean {
  const cleanId = id.toLowerCase();
  const environment = String(data.environment || '').toLowerCase();
  const buyerEmail = String(data.buyerEmail || data.email || '').toLowerCase();
  return data.is_test === true ||
    ['development', 'test', 'sandbox', 'preview'].includes(environment) ||
    cleanId.startsWith('e2e_') ||
    cleanId.startsWith('test_') ||
    cleanId.startsWith('evt_e2e_') ||
    cleanId.startsWith('pi_test_') ||
    buyerEmail.startsWith('e2e+');
}

async function deleteInChunks(refs: FirebaseFirestore.DocumentReference[]) {
  const db = getServerAdminFirestore();
  let deleted = 0;
  for (let i = 0; i < refs.length; i += 400) {
    const batch = db.batch();
    const chunk = refs.slice(i, i + 400);
    for (const ref of chunk) batch.delete(ref);
    await batch.commit();
    deleted += chunk.length;
  }
  return deleted;
}

export default async function handler(req: Req, res: Res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });

  try {
    await requireAdminIdentity(req.headers);
    const body = req.body && typeof req.body === 'object' ? req.body as Record<string, unknown> : {};
    const action = String(body.action || '').trim();
    const db = getServerAdminFirestore();

    if (action === 'list') {
      const collectionName = String(body.collection || '').trim();
      if (!READABLE_COLLECTIONS.has(collectionName)) {
        return res.status(400).json({ error: 'Coleção não permitida no explorador administrativo.' });
      }
      const snap = await db.collection(collectionName).limit(200).get();
      return res.status(200).json({
        success: true,
        collection: collectionName,
        documents: snap.docs.map((doc) => ({ _id: doc.id, ...doc.data() })),
      });
    }

    if (action === 'delete-test-document') {
      const collectionName = String(body.collection || '').trim();
      const id = String(body.id || '').trim();
      if (!READABLE_COLLECTIONS.has(collectionName) || !/^[A-Za-z0-9_:.+\-]{1,220}$/.test(id)) {
        return res.status(400).json({ error: 'Documento inválido.' });
      }
      const ref = db.collection(collectionName).doc(id);
      const snap = await ref.get();
      if (!snap.exists) return res.status(404).json({ error: 'Documento não encontrado.' });
      if (!isTestRecord(id, snap.data() || {})) {
        return res.status(409).json({
          error: 'Documentos reais não podem ser apagados pelo explorador. Use as ações específicas do Admin.',
          code: 'REAL_DOCUMENT_PROTECTED',
        });
      }
      await ref.delete();
      return res.status(200).json({ success: true, deleted: 1 });
    }

    if (action === 'cleanup-test-data') {
      const refs: FirebaseFirestore.DocumentReference[] = [];
      const byCollection: Record<string, number> = {};
      for (const collectionName of TEST_CLEANUP_COLLECTIONS) {
        const snap = await db.collection(collectionName).limit(1000).get();
        const matches = snap.docs.filter((doc) => isTestRecord(doc.id, doc.data()));
        byCollection[collectionName] = matches.length;
        refs.push(...matches.map((doc) => doc.ref));
      }
      const deleted = await deleteInChunks(refs);
      return res.status(200).json({
        success: true,
        deleted,
        byCollection,
        message: deleted
          ? `${deleted} registro(s) de teste foram removidos. Dados reais foram preservados.`
          : 'Nenhum registro de teste foi encontrado. Dados reais permaneceram intactos.',
      });
    }

    return res.status(400).json({ error: 'Ação administrativa inválida.' });
  } catch (error: any) {
    const status = Number(error?.statusCode || 503);
    return res.status(status).json({
      error: error instanceof Error ? error.message : 'Não foi possível executar a ação administrativa.',
    });
  }
}
