import Cookies from 'js-cookie';

/**
 * Utilitário de rastreamento de afiliados LeadsPay
 * Salva e recupera o código de afiliado com retenção via Cookie por 15 dias e localStorage
 */

const COOKIE_NAME = 'affiliate_ref';
const COOKIE_EXPIRES_DAYS = 15;

/**
 * Captura o código do afiliado da URL (?ref=... ou ?r=...) e armazena em Cookie (15 dias) + localStorage
 */
export function handleAffiliateTracking(): string | null {
  if (typeof window === 'undefined') return null;

  try {
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref') || urlParams.get('r');

    if (refCode && refCode.trim()) {
      const cleanRef = refCode.trim();

      // Salva o código do afiliado por 15 dias (validez de 15 dias)
      Cookies.set(COOKIE_NAME, cleanRef, { expires: COOKIE_EXPIRES_DAYS, path: '/' });
      localStorage.setItem(COOKIE_NAME, cleanRef);

      // Chaves de compatibilidade
      localStorage.setItem('leadspay_affiliate_ref', cleanRef);
      localStorage.setItem('techify_affiliate_ref', cleanRef);

      console.log(`📌 [LeadsPay Tracking] Código de afiliado "${cleanRef}" salvo em Cookie (${COOKIE_EXPIRES_DAYS} dias) e localStorage.`);
      return cleanRef;
    }

    // Se não há parâmetro na URL, tenta recuperar do cookie de 15 dias existente
    const existingCookie = Cookies.get(COOKIE_NAME);
    if (existingCookie && existingCookie.trim()) {
      return existingCookie.trim();
    }

    // Fallback para localStorage (e renova o cookie por mais 15 dias)
    const stored = localStorage.getItem(COOKIE_NAME) || 
                   localStorage.getItem('leadspay_affiliate_ref') || 
                   localStorage.getItem('techify_affiliate_ref');
    if (stored && stored.trim()) {
      Cookies.set(COOKIE_NAME, stored.trim(), { expires: COOKIE_EXPIRES_DAYS, path: '/' });
      return stored.trim();
    }
  } catch (err) {
    console.warn('Erro ao capturar affiliate tracking:', err);
  }

  return null;
}

/**
 * Obtém o código de afiliado ativo (URL -> Cookie -> LocalStorage)
 */
export function getActiveAffiliateRef(): string | null {
  if (typeof window === 'undefined') return null;

  try {
    const urlParams = new URLSearchParams(window.location.search);
    const refParam = urlParams.get('ref') || urlParams.get('r');
    if (refParam && refParam.trim()) return refParam.trim();

    const cookieRef = Cookies.get(COOKIE_NAME);
    if (cookieRef && cookieRef.trim()) return cookieRef.trim();

    const stored = localStorage.getItem(COOKIE_NAME) || 
                   localStorage.getItem('leadspay_affiliate_ref') || 
                   localStorage.getItem('techify_affiliate_ref');
    if (stored && stored.trim()) return stored.trim();
  } catch (err) {
    console.warn('Erro ao ler affiliate ref:', err);
  }

  return null;
}

/**
 * Retorna a URL base pública da aplicação (window.location.origin ou VITE_PUBLIC_APP_URL / NEXT_PUBLIC_APP_URL)
 */
export function getAppBaseUrl(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return (
    (import.meta as any).env?.VITE_PUBLIC_APP_URL ||
    (import.meta as any).env?.NEXT_PUBLIC_APP_URL ||
    'https://leadspay.com'
  );
}

/**
 * Formata o link exclusivo do afiliado no padrão especificado:
 * https://seu-dominio.com/plan/[planId]?ref=CODIGO_UNICO_DO_AFILIADO
 */
export function formatAffiliatePlanUrl(planIdOrSlug: string, affiliateCode: string): string {
  const origin = getAppBaseUrl();
  const cleanId = (planIdOrSlug || '').trim();
  const cleanCode = (affiliateCode || '').trim();
  return `${origin}/plan/${cleanId}?ref=${cleanCode}`;
}
