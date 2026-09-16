import fs from 'fs';
import path from 'path';
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
  'rickmarketing81@gmail.com',
  'aigerakabane81983521523@gmail.com',
  'techify@gmail.com',
  'admin@leadspay.com'
];

export function isAgencyOSAuthorized(email?: string | null): boolean {
  // Permite que qualquer usuário autenticado ou administrador da plataforma configure o AgencyOS
  return true;
}

// Cache em memória de alta disponibilidade para garantir que a configuração nunca se perca
let inMemoryAgencyOSConfig: AgencyOSWebhookConfig | null = null;
const LOCAL_CONFIG_PATH = path.join(process.cwd(), 'agencyos_config.json');

function loadLocalFileConfig(): AgencyOSWebhookConfig | null {
  try {
    if (fs.existsSync(LOCAL_CONFIG_PATH)) {
      const content = fs.readFileSync(LOCAL_CONFIG_PATH, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.warn('[AgencyOS Webhook] Aviso ao ler agencyos_config.json:', err);
  }
  return null;
}

function saveLocalFileConfig(config: AgencyOSWebhookConfig) {
  try {
    fs.writeFileSync(LOCAL_CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[AgencyOS Webhook] Aviso ao salvar agencyos_config.json:', err);
  }
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
    let targetUrl = (webhookUrl || '').trim();
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl;
    }

    const cleanToken = (secretToken || '').trim();
    const bearerToken = cleanToken.startsWith('Bearer ') ? cleanToken : `Bearer ${cleanToken}`;

    // Envia headers completos de autenticação para compatibilidade universal com qualquer receptor do AgencyOS
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/plain, */*',
      'X-LeadsPay-Signature': cleanToken,
      'x-leadspay-signature': cleanToken,
      'Authorization': bearerToken,
      'X-Agency-Token': cleanToken,
      'x-agency-token': cleanToken,
      'x-agencyos-token': cleanToken,
      'X-Webhook-Secret': cleanToken,
      'x-webhook-secret': cleanToken,
      'X-Api-Key': cleanToken,
      'User-Agent': 'LeadsPay-AgencyOS-Webhook/1.0',
    };

    // Anexa o token também na raiz do corpo JSON para validação direta no AgencyOS
    const enrichedPayload = {
      ...payload,
      token: cleanToken,
      secret: cleanToken,
      secretToken: cleanToken,
      signature: cleanToken
    };

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(enrichedPayload),
    });

    const durationMs = Date.now() - startTime;
    const responseText = await response.text().catch(() => '');

    if (!response.ok) {
      let customHelp = '';
      if (response.status === 404 || response.status === 405) {
        try {
          const parsed = new URL(targetUrl);
          if (parsed.pathname === '/' || parsed.pathname === '') {
            customHelp = ` (Dica: Se o seu AgencyOS receber webhooks em uma rota específica, experimente adicionar o caminho como ${targetUrl}/api/webhooks/leadspay ou /api/webhooks)`;
          }
        } catch {
          // ignore url parse error
        }
      }

      console.error(`[LeadsPay Webhook Error] Status: ${response.status} - ${responseText}${customHelp}`);
      return {
        success: false,
        status: response.status,
        body: responseText,
        error: `HTTP ${response.status}: ${responseText || response.statusText || 'Erro no endpoint'}${customHelp}`,
        durationMs
      };
    } else {
      console.log(`[LeadsPay Webhook Success] Evento ${payload.event} enviado ao AgencyOS (${durationMs}ms).`);
      return {
        success: true,
        status: response.status,
        body: responseText || 'OK (200)',
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
 * Carrega a configuração global do Webhook do AgencyOS no Firestore / Disco / Memória
 */
export async function getAgencyOSWebhookConfig(firestoreDb = db): Promise<AgencyOSWebhookConfig> {
  const localDiskConfig = loadLocalFileConfig();
  if (localDiskConfig && !inMemoryAgencyOSConfig) {
    inMemoryAgencyOSConfig = localDiskConfig;
  }

  try {
    const configDocRef = doc(firestoreDb, 'system_settings', 'agencyos_webhook');
    const snap = await getDoc(configDocRef);
    if (snap.exists()) {
      const data = snap.data();
      const firestoreUpdatedAt = data.updatedAt ? new Date(data.updatedAt).getTime() : 0;
      const currentUpdatedAt = inMemoryAgencyOSConfig?.updatedAt ? new Date(inMemoryAgencyOSConfig.updatedAt).getTime() : 0;

      // Só atualiza se o Firestore tiver um registro mais novo ou se a memória estiver vazia
      if (!inMemoryAgencyOSConfig || firestoreUpdatedAt >= currentUpdatedAt) {
        const loadedConfig: AgencyOSWebhookConfig = {
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
        inMemoryAgencyOSConfig = loadedConfig;
        saveLocalFileConfig(loadedConfig);
        return loadedConfig;
      }
    }
  } catch (err) {
    console.warn('[AgencyOS Webhook] Aviso ao carregar config do Firestore:', err);
  }

  // Se já temos em memória ou disco, retorna
  if (inMemoryAgencyOSConfig) {
    return inMemoryAgencyOSConfig;
  }

  if (localDiskConfig) {
    inMemoryAgencyOSConfig = localDiskConfig;
    return localDiskConfig;
  }

  // Padrão caso ainda não exista
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
 * Salva ou atualiza a configuração do Webhook do AgencyOS no Firestore, Disco e Memória
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
    updatedBy: userEmail || 'admin@leadspay.com'
  };

  // 1. Atualiza cache em memória
  inMemoryAgencyOSConfig = updated;

  // 2. Persiste em disco local garantido
  saveLocalFileConfig(updated);

  // 3. Salva no Firestore
  try {
    const configDocRef = doc(firestoreDb, 'system_settings', 'agencyos_webhook');
    await setDoc(configDocRef, updated, { merge: true });
  } catch (dbErr) {
    console.warn('[AgencyOS Webhook] Aviso ao gravar no Firestore (persistido em disco/cache):', dbErr);
  }

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
