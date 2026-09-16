import { doc, getDoc, setDoc, collection, addDoc, getDocs, query, orderBy, limit, deleteDoc } from 'firebase/firestore';
import { db } from '../../src/lib/firebase';

export interface AgencyOSWebhookPayload {
  event: 'sale.approved' | 'company.activated' | 'affiliate.commission' | 'balance.updated';
  timestamp: string;
  agency_id: string; // ID da empresa/agência cadastrada no AgencyOS
  data: {
    transaction_id: string;
    product_id?: string;
    product_name?: string;
    amount: number;
    net_amount: number;
    payment_method: 'pix' | 'credit_card' | 'boleto';
    customer?: {
      name: string;
      email: string;
      cpf_cnpj?: string;
    };
    affiliate?: {
      affiliate_id: string;
      name: string;
      commission_amount: number;
    };
    company_plan?: {
      plan_id: string;
      plan_name: string;
      status: 'active' | 'pending' | 'canceled';
    };
  };
}

export interface AgencyOSWebhookConfig {
  webhookUrl: string;
  secretToken: string;
  agency_id: string;
  enabled: boolean;
  events: string[];
  updatedAt?: string;
  updatedBy?: string;
  lastTestStatus?: 'success' | 'error' | null;
  lastTestAt?: string | null;
  lastTestResponse?: string | null;
}

export interface AgencyOSWebhookLog {
  id: string;
  event: string;
  agency_id: string;
  timestamp: string;
  payload: AgencyOSWebhookPayload;
  statusCode: number;
  status: 'success' | 'error';
  errorMessage?: string | null;
  responseBody?: string | null;
  createdAt: string;
}

export const AGENCY_OS_AUTHORIZED_EMAILS = [
  'agencyosoficial@gmail.com',
  'rickmarketing81@gmail.com'
];

export function isAgencyOSAuthorized(email?: string | null): boolean {
  if (!email) return false;
  return AGENCY_OS_AUTHORIZED_EMAILS.includes(email.trim().toLowerCase());
}

/**
 * Função para disparar o webhook do LeadsPay para o AgencyOS
 */
export async function sendWebhookToAgencyOS(
  webhookUrl: string,
  payload: AgencyOSWebhookPayload,
  secretToken: string
): Promise<{ success: boolean; status: number; body?: string; error?: string; durationMs?: number }> {
  const startTime = Date.now();
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-LeadsPay-Signature': secretToken || '', // Para validação de segurança no AgencyOS
        'User-Agent': 'LeadsPay-AgencyOS-Webhook/1.0',
      },
      body: JSON.stringify(payload),
    });

    const durationMs = Date.now() - startTime;
    const responseText = await response.text().catch(() => '');

    if (!response.ok) {
      console.error(`[LeadsPay Webhook Error] Status: ${response.status} - ${responseText}`);
      return {
        success: false,
        status: response.status,
        body: responseText,
        error: `HTTP ${response.status}: ${responseText || response.statusText}`,
        durationMs
      };
    } else {
      console.log(`[LeadsPay Webhook Success] Evento ${payload.event} enviado ao AgencyOS (${durationMs}ms).`);
      return {
        success: true,
        status: response.status,
        body: responseText,
        durationMs
      };
    }
  } catch (error: any) {
    const durationMs = Date.now() - startTime;
    console.error('[LeadsPay Webhook Exception]', error);
    return {
      success: false,
      status: 0,
      error: error?.message || 'Falha de conexão com a URL do AgencyOS',
      durationMs
    };
  }
}

/**
 * Carrega a configuração global do Webhook do AgencyOS no Firestore
 */
export async function getAgencyOSWebhookConfig(firestoreDb = db): Promise<AgencyOSWebhookConfig> {
  try {
    const configDocRef = doc(firestoreDb, 'system_settings', 'agencyos_webhook');
    const snap = await getDoc(configDocRef);
    if (snap.exists()) {
      const data = snap.data();
      return {
        webhookUrl: data.webhookUrl || '',
        secretToken: data.secretToken || '',
        agency_id: data.agency_id || 'agency_leadspay',
        enabled: data.enabled !== false,
        events: Array.isArray(data.events) ? data.events : [
          'sale.approved',
          'company.activated',
          'affiliate.commission',
          'balance.updated'
        ],
        updatedAt: data.updatedAt,
        updatedBy: data.updatedBy,
        lastTestStatus: data.lastTestStatus,
        lastTestAt: data.lastTestAt,
        lastTestResponse: data.lastTestResponse
      };
    }
  } catch (err) {
    console.warn('[AgencyOS Webhook] Aviso ao carregar config:', err);
  }

  // Padrão caso ainda não exista no Firestore
  return {
    webhookUrl: '',
    secretToken: '',
    agency_id: 'agency_leadspay',
    enabled: true,
    events: [
      'sale.approved',
      'company.activated',
      'affiliate.commission',
      'balance.updated'
    ]
  };
}

/**
 * Salva ou atualiza a configuração do Webhook do AgencyOS no Firestore
 */
export async function saveAgencyOSWebhookConfig(
  config: Partial<AgencyOSWebhookConfig>,
  userEmail: string,
  firestoreDb = db
): Promise<AgencyOSWebhookConfig> {
  const current = await getAgencyOSWebhookConfig(firestoreDb);
  const updated: AgencyOSWebhookConfig = {
    ...current,
    ...config,
    updatedAt: new Date().toISOString(),
    updatedBy: userEmail
  };

  const configDocRef = doc(firestoreDb, 'system_settings', 'agencyos_webhook');
  await setDoc(configDocRef, updated, { merge: true });
  return updated;
}

/**
 * Registra um log de disparo para auditoria e histórico no painel
 */
export async function logAgencyOSWebhookDispatch(
  payload: AgencyOSWebhookPayload,
  result: { success: boolean; status: number; body?: string; error?: string },
  firestoreDb = db
) {
  try {
    const logsColl = collection(firestoreDb, 'agencyos_webhook_logs');
    await addDoc(logsColl, {
      event: payload.event,
      agency_id: payload.agency_id,
      timestamp: payload.timestamp,
      payload,
      statusCode: result.status,
      status: result.success ? 'success' : 'error',
      errorMessage: result.error || null,
      responseBody: result.body ? result.body.slice(0, 1000) : null,
      createdAt: new Date().toISOString()
    });
  } catch (err) {
    console.warn('[AgencyOS Webhook Log Error] Falha ao registrar log:', err);
  }
}

/**
 * Disparador Global: Aciona o envio automático do webhook para o AgencyOS
 */
export async function dispatchAgencyOSWebhook(
  event: 'sale.approved' | 'company.activated' | 'affiliate.commission' | 'balance.updated',
  data: AgencyOSWebhookPayload['data'],
  customAgencyId?: string,
  firestoreDb = db
): Promise<{ success: boolean; status: number; error?: string; skipped?: boolean }> {
  try {
    const config = await getAgencyOSWebhookConfig(firestoreDb);

    if (!config.enabled) {
      console.log(`[AgencyOS Webhook] Disparo ignorado para '${event}' (Webhook global está desativado).`);
      return { success: false, status: 0, skipped: true, error: 'Webhook desativado' };
    }

    if (!config.webhookUrl || !config.webhookUrl.startsWith('http')) {
      console.log(`[AgencyOS Webhook] Disparo ignorado para '${event}' (URL do webhook não configurada).`);
      return { success: false, status: 0, skipped: true, error: 'URL do webhook vazia' };
    }

    if (config.events && !config.events.includes(event)) {
      console.log(`[AgencyOS Webhook] Evento '${event}' não está habilitado na lista de eventos.`);
      return { success: false, status: 0, skipped: true, error: `Evento ${event} desabilitado` };
    }

    const payload: AgencyOSWebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      agency_id: customAgencyId || config.agency_id || 'agency_leadspay',
      data
    };

    console.log(`📡 [AgencyOS Webhook Dispatch] Enviando evento '${event}' para ${config.webhookUrl}...`);
    const result = await sendWebhookToAgencyOS(config.webhookUrl, payload, config.secretToken || '');

    // Grava o log no Firestore de forma assíncrona
    logAgencyOSWebhookDispatch(payload, result, firestoreDb).catch(() => {});

    return result;
  } catch (err: any) {
    console.error('[AgencyOS Webhook Dispatch Exception]', err);
    return { success: false, status: 0, error: err.message };
  }
}
