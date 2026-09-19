import webpush from 'web-push';

// Configuração VAPID
const DEFAULT_VAPID_PUBLIC_KEY = 'BEu_erJwoapomyrRNmdVadr04oayztlNAwTcGmZrMPxBPZlbMEyGLCiqxdCLXJl0_TfgR7fmAUpseFj9XpUcZ9Y';
const DEFAULT_VAPID_PRIVATE_KEY = '4wKx5iSGZBeQzP_fowqfSu6fcaRzp9LsCJt3HUC6re8';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY || DEFAULT_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || DEFAULT_VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:suporte@leadspay.com';

try {
  webpush.setVapidDetails(
    VAPID_SUBJECT,
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
} catch (err) {
  console.warn('[WebPush] Aviso ao configurar VAPID details:', err);
}

export function getVapidPublicKey(): string {
  return VAPID_PUBLIC_KEY;
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  badge?: string;
}

/**
 * Envia notificação Web Push genérica
 */
export async function sendPushNotification(subscription: any, payload: PushNotificationPayload) {
  if (!subscription || !subscription.endpoint) return null;
  try {
    const stringified = JSON.stringify({
      title: payload.title || 'LeadsPay',
      body: payload.body || 'Nova notificação da LeadsPay',
      url: payload.url || '/',
      icon: payload.icon || '/leadspay_3d_logo.jpg',
      badge: payload.badge || '/leadspay_3d_logo.jpg'
    });
    return await webpush.sendNotification(subscription, stringified);
  } catch (err: any) {
    // 404/410 indica subscrição expirada no browser
    if (err.statusCode === 410 || err.statusCode === 404) {
      console.warn('[WebPush] Subscrição expirada ou inválida:', err.statusCode);
    } else {
      console.warn('[WebPush] Erro ao enviar notificação:', err.message || err);
    }
    return null;
  }
}

// A. Notificação de Comissão para Afiliado
export async function notifyAffiliateCommission(subscription: any, amount: number) {
  const payload: PushNotificationPayload = {
    title: '🟢 Nova Comissão Recebida!',
    body: `Parabéns! Acaba de receber R$ ${Number(amount).toFixed(2)} de comissão na LeadsPay.`,
    url: '/dashboard'
  };

  return await sendPushNotification(subscription, payload);
}

// B. Notificação de Nova Venda para Empresa
export async function notifyCompanySale(subscription: any, amount: number, planName: string) {
  const payload: PushNotificationPayload = {
    title: '🚀 Nova Venda Realizada!',
    body: `Sua empresa vendeu o plano ${planName} no valor de R$ ${Number(amount).toFixed(2)}.`,
    url: '/dashboard'
  };

  return await sendPushNotification(subscription, payload);
}

// C. Notificação de Atualização do LeadsPay (Geral)
export async function notifySystemUpdate(subscriptions: any[], message: string) {
  const payload: PushNotificationPayload = {
    title: '⚡ Atualização LeadsPay',
    body: message,
    url: '/dashboard'
  };

  const results = [];
  for (const sub of subscriptions) {
    if (sub) {
      results.push(await sendPushNotification(sub, payload).catch(() => null));
    }
  }
  return results;
}
