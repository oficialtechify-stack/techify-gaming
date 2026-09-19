// Helper to convert base64 url to Uint8Array for PushManager
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Fallback VAPID Public Key (matches server default when env is not set)
const DEFAULT_VAPID_PUBLIC_KEY = 'BEu_erJwoapomyrRNmdVadr04oayztlNAwTcGmZrMPxBPZlbMEyGLCiqxdCLXJl0_TfgR7fmAUpseFj9XpUcZ9Y';

/**
 * Solicita permissão e subscreve o utilizador (afiliado ou empresa) ao Web Push
 */
export async function requestNotificationPermission(
  userId: string, 
  role: 'affiliate' | 'company'
): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    console.warn('[WebPush] Notificações ou Service Worker não suportados neste navegador.');
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('[WebPush] Permissão de notificação negada ou ignorada pelo utilizador.');
      return false;
    }

    // Registrar o service worker
    const registration = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;

    // Obter chave pública VAPID do servidor ou variável de ambiente
    let vapidPublicKey = (import.meta as any).env?.VITE_PUBLIC_VAPID_PUBLIC_KEY || 
                         (import.meta as any).env?.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 
                         DEFAULT_VAPID_PUBLIC_KEY;

    try {
      const resKey = await fetch('/api/notifications/vapid-public-key');
      if (resKey.ok) {
        const keyData = await resKey.json();
        if (keyData?.publicKey) {
          vapidPublicKey = keyData.publicKey;
        }
      }
    } catch (_) {}

    // Verificar se já existe subscrição prévia
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey
      });
    }

    // Guardar a subscrição no perfil do utilizador via API backend
    const res = await fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        userId, 
        role, 
        subscription: subscription.toJSON() 
      }),
    });

    if (res.ok) {
      console.log(`✅ [WebPush] Subscrição ativada com sucesso para ${role} (${userId})`);
      return true;
    } else {
      console.warn('[WebPush] Falha ao registar subscrição no servidor:', await res.text());
      return false;
    }
  } catch (err) {
    console.error('[WebPush] Erro ao subscrever notificações Push:', err);
    return false;
  }
}
