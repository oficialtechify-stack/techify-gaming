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


async function normalizeLegacyData() {
  const db = getServerAdminFirestore();
  const summary: Record<string, { scanned: number; updated: number }> = {};

  const normalizeClients = async () => {
    const snap = await db.collection('clients').limit(1000).get();
    let updated = 0;
    for (const doc of snap.docs) {
      const data = doc.data();
      const companyId = String(data.companyId || data.store_id || data.empresa_id || '').trim();
      const name = String(data.name || data.nome_completo || '').trim();
      const phone = String(data.phone || data.celular || '').trim();
      const document = String(data.document || data.cpf_cnpj || '').trim();
      const status = String(data.status || data.status_compra || '').trim();
      const createdAt = String(data.createdAt || data.created_at || data.data_criacao || '').trim();

      const patch: Record<string, any> = {};
      if (!data.companyId && companyId) patch.companyId = companyId;
      if (!data.name && name) patch.name = name;
      if (!data.phone && phone) patch.phone = phone;
      if (!data.document && document) patch.document = document;
      if (!data.status && status) patch.status = status;
      if (!data.createdAt && createdAt) patch.createdAt = createdAt;

      const legacyFields = ['store_id','empresa_id','nome_completo','celular','cpf_cnpj','valor_pedido','status_compra','data_criacao'];
      let hasLegacy = false;
      for (const field of legacyFields) {
        if (Object.prototype.hasOwnProperty.call(data, field)) {
          patch[field] = FieldValue.delete();
          hasLegacy = true;
        }
      }

      if (Object.keys(patch).length && (hasLegacy || Object.keys(patch).some((key) => !legacyFields.includes(key)))) {
        patch.updatedAt = new Date().toISOString();
        await doc.ref.set(patch, { merge: true });
        updated++;
      }
    }
    summary.clients = { scanned: snap.size, updated };
  };

  const normalizeAffiliations = async () => {
    const snap = await db.collection('affiliations').limit(1000).get();
    let updated = 0;
    for (const doc of snap.docs) {
      const data = doc.data();
      const patch: Record<string, any> = {};

      const userId = String(data.userId || data.user_id || data.affiliateId || '').trim();
      const planId = String(data.planId || data.plan_id || '').trim();
      const affiliateCode = String(data.affiliateCode || data.affiliate_code || '').trim();

      if (!data.userId && userId) patch.userId = userId;
      if (!data.planId && planId) patch.planId = planId;
      if (!data.affiliateCode && affiliateCode) patch.affiliateCode = affiliateCode;

      for (const field of ['user_id','plan_id','affiliate_code']) {
        if (Object.prototype.hasOwnProperty.call(data, field)) {
          patch[field] = FieldValue.delete();
        }
      }

      if (Object.keys(patch).length) {
        patch.updatedAt = new Date().toISOString();
        await doc.ref.set(patch, { merge: true });
        updated++;
      }
    }
    summary.affiliations = { scanned: snap.size, updated };
  };

  await normalizeClients();
  await normalizeAffiliations();
  return summary;
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

    if (action === 'normalize-legacy-data') {
      const summary = await normalizeLegacyData();
      return res.status(200).json({
        success: true,
        summary,
        message: 'Campos legados normalizados sem excluir documentos reais.',
      });
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
