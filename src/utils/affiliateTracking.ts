import Cookies from 'js-cookie';

/**
 * Utilitário de rastreamento de afiliados LeadsPay / Techify
 * Salva e recupera o código de afiliado com retenção via Cookie por 15 dias (max-age=1296000) e localStorage
 */

export const OFFICIAL_APP_URL = 'https://techify-gaming.vercel.app';
const COOKIE_NAME = 'affiliate_ref';
const COOKIE_EXPIRES_DAYS = 15;

/**
 * Captura o código do afiliado da URL (?ref=... ou ?r=...) e armazena em Cookie (15 dias) + localStorage
 * Conforme exigência estrita:
 * document.cookie = "affiliate_ref=LEADS; path=/; max-age=1296000; SameSite=Lax; Secure";
 */
export function handleAffiliateTracking(): string | null {
  if (typeof window === 'undefined') return null;

  try {
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref') || urlParams.get('r');

    if (refCode && refCode.trim()) {
      const cleanRef = refCode.trim();

      // Gravação explícita de Cookie com validade de 15 dias (1.296.000 segundos)
      document.cookie = `affiliate_ref=${cleanRef}; path=/; max-age=1296000; SameSite=Lax; Secure`;
      
      // Fallback com js-cookie e localStorage
      Cookies.set(COOKIE_NAME, cleanRef, { expires: COOKIE_EXPIRES_DAYS, path: '/', secure: true, sameSite: 'Lax' });
      localStorage.setItem('affiliate_ref', cleanRef);
      localStorage.setItem(COOKIE_NAME, cleanRef);
      localStorage.setItem('leadspay_affiliate_ref', cleanRef);
      localStorage.setItem('techify_affiliate_ref', cleanRef);

      console.log(`📌 [Affiliate Tracking] Código "${cleanRef}" gravado via Cookie (15 dias / max-age=1296000) e localStorage.`);
      return cleanRef;
    }

    // Se não há parâmetro na URL, tenta recuperar do cookie de 15 dias existente
    const match = document.cookie.match(/(?:^|;\s*)affiliate_ref=([^;]+)/);
    if (match && match[1]) {
      const cookieVal = decodeURIComponent(match[1]).trim();
      if (cookieVal) return cookieVal;
    }

    const existingCookie = Cookies.get(COOKIE_NAME);
    if (existingCookie && existingCookie.trim()) {
      return existingCookie.trim();
    }

    // Fallback para localStorage (e renova o cookie por mais 15 dias)
    const stored = localStorage.getItem('affiliate_ref') || 
                   localStorage.getItem(COOKIE_NAME) || 
                   localStorage.getItem('leadspay_affiliate_ref') || 
                   localStorage.getItem('techify_affiliate_ref');
    if (stored && stored.trim()) {
      const cleanStored = stored.trim();
      document.cookie = `affiliate_ref=${cleanStored}; path=/; max-age=1296000; SameSite=Lax; Secure`;
      Cookies.set(COOKIE_NAME, cleanStored, { expires: COOKIE_EXPIRES_DAYS, path: '/', secure: true, sameSite: 'Lax' });
      return cleanStored;
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

    const match = document.cookie.match(/(?:^|;\s*)affiliate_ref=([^;]+)/);
    if (match && match[1]) {
      const val = decodeURIComponent(match[1]).trim();
      if (val) return val;
    }

    const cookieRef = Cookies.get(COOKIE_NAME);
    if (cookieRef && cookieRef.trim()) return cookieRef.trim();

    const stored = localStorage.getItem('affiliate_ref') || 
                   localStorage.getItem(COOKIE_NAME) || 
                   localStorage.getItem('leadspay_affiliate_ref') || 
                   localStorage.getItem('techify_affiliate_ref');
    if (stored && stored.trim()) return stored.trim();
  } catch (err) {
    console.warn('Erro ao ler affiliate ref:', err);
  }

  return null;
}

/**
 * Retorna a URL base pública oficial da aplicação
 * Prioriza https://techify-gaming.vercel.app e VITE_PUBLIC_APP_URL
 */
export function getAppBaseUrl(): string {
  const envUrl = 
    (import.meta as any).env?.VITE_PUBLIC_APP_URL ||
    (import.meta as any).env?.VITE_APP_URL ||
    (import.meta as any).env?.NEXT_PUBLIC_APP_URL;

  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, '');
  }

  return OFFICIAL_APP_URL;
}

/**
 * Formata o link exclusivo do afiliado no padrão oficial especificado:
 * https://techify-gaming.vercel.app/plan/[id]?ref=[código_do_afiliado]
 */
export function formatAffiliatePlanUrl(planIdOrSlug: string, affiliateCode: string): string {
  const baseUrl = getAppBaseUrl();
  const cleanId = (planIdOrSlug || '').trim();
  const cleanCode = (affiliateCode || '').trim();
  return `${baseUrl}/plan/${cleanId}?ref=${cleanCode}`;
}

