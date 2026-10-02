import { createHmac, randomUUID } from 'node:crypto';
import { getServerAdminFirestore, verifyFirebaseIdentity } from '../../lib/firebaseAdminServer.js';
import { applyVerificationRequest, profileHasRole, profileRoleIsApproved } from '../../lib/profileEligibility.js';
import { assertSafeWebhookUrl, webhookUrlErrorMessage } from '../../lib/webhookSecurity.js';

type Req = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
};

type Res = {
  setHeader(name: string, value: string): void;
  status(code: number): Res;
  json(body: unknown): unknown;
};

export default async function handler(req: Req, res: Res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  try {
    const identity = await verifyFirebaseIdentity(
      typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined,
    );

    const db = getServerAdminFirestore();
    const [profileSnap, requestSnap, settingsSnap] = await Promise.all([
      db.collection('user_profiles').doc(identity.uid).get(),
      db.collection('verification_requests').doc(identity.uid).get(),
      db.collection('partner_settings').doc(identity.uid).get(),
    ]);

    if (!profileSnap.exists) {
      return res.status(404).json({ error: 'Perfil não encontrado.' });
    }

    const profile = applyVerificationRequest(
      profileSnap.data()!,
      requestSnap.exists ? requestSnap.data()! : null,
    ) as Record<string, any>;

    if (!profileHasRole(profile, 'empresa') || !profileRoleIsApproved(profile, 'empresa')) {
      return res.status(403).json({ error: 'A Empresa precisa estar aprovada para testar integrações.' });
    }

    const companyId = String(profile.companyId || '').trim();
    if (!companyId) {
      return res.status(409).json({ error: 'A conta ainda não está vinculada a uma empresa válida.' });
    }

    const companySnap = await db.collection('companies').doc(companyId).get();
    const company = companySnap.exists ? companySnap.data()! : null;
    if (
      !company ||
      String(company.ownerId || company.submittedBy || '') !== identity.uid ||
      company.verified !== true ||
      String(company.status || '').toLowerCase() !== 'approved' ||
      company.archived === true ||
      company.isArchived === true ||
      company.banned === true
    ) {
      return res.status(403).json({ error: 'A empresa vinculada não está aprovada para testar integrações.' });
    }

    if (!settingsSnap.exists) {
      return res.status(400).json({ error: 'Configure e salve um webhook antes de enviar o teste.' });
    }

    const settings = settingsSnap.data() as Record<string, any>;
    const rawWebhookUrl = String(settings.webhookUrl || '').trim();
    const webhookSecret = String(settings.webhookSecret || '').trim();

    if (!rawWebhookUrl || !webhookSecret) {
      return res.status(400).json({ error: 'Configure e salve um webhook antes de enviar o teste.' });
    }

    let webhookUrl: string;
    try {
      webhookUrl = await assertSafeWebhookUrl(rawWebhookUrl);
    } catch (error) {
      return res.status(400).json({ error: webhookUrlErrorMessage(error) });
    }
    const testId = `wht_${randomUUID().replace(/-/g, '')}`;
    const payloadObject = {
      event: 'integration.test',
      testId,
      companyId: companyId || null,
      sentAt: new Date().toISOString(),
    };
    const payload = JSON.stringify(payloadObject);
    const signature = createHmac('sha256', webhookSecret).update(payload).digest('hex');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    let response: Response;
    try {
      response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-leadspay-signature': signature,
          'x-leadspay-event': 'integration.test',
        },
        body: payload,
        signal: controller.signal,
      });
    } catch (error) {
      clearTimeout(timeout);
      const errorMessage = error instanceof Error ? error.message : 'Falha de conexão';
      await db.collection('partner_webhook_deliveries').doc(testId).set({
        userId: identity.uid,
        companyId: companyId || null,
        event: 'integration.test',
        testId,
        status: 'failed',
        error: errorMessage.slice(0, 250),
        updatedAt: new Date().toISOString(),
      });
      return res.status(502).json({
        error: 'Não foi possível conectar ao endpoint do webhook.',
        detail: errorMessage,
      });
    } finally {
      clearTimeout(timeout);
    }

    await db.collection('partner_webhook_deliveries').doc(testId).set({
      userId: identity.uid,
      companyId: companyId || null,
      event: 'integration.test',
      testId,
      status: response.ok ? 'delivered' : 'failed',
      responseStatus: response.status,
      updatedAt: new Date().toISOString(),
    });

    if (!response.ok) {
      return res.status(502).json({
        error: `O endpoint respondeu com HTTP ${response.status}.`,
        responseStatus: response.status,
      });
    }

    return res.status(200).json({
      success: true,
      delivered: true,
      event: 'integration.test',
      testId,
      responseStatus: response.status,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha';
    console.error('[Partner test webhook]', message);
    if (/Firebase ID token|token inválido|auth\/id-token/i.test(message)) {
      return res.status(401).json({ error: 'Sua sessão expirou. Entre novamente.' });
    }
    return res.status(503).json({ error: 'Não foi possível testar o webhook agora.' });
  }
}
