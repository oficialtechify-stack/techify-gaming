import React, { useEffect, useState } from 'react';

type CookiePreferences = {
  version: 1;
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  updatedAt: string;
};

const STORAGE_KEY = 'leadspay_cookie_consent_v1';

function persistConsent(analytics: boolean, marketing: boolean) {
  const payload: CookiePreferences = {
    version: 1,
    necessary: true,
    analytics,
    marketing,
    updatedAt: new Date().toISOString(),
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    // Remove o formato legado para evitar interpretações ambíguas.
    localStorage.removeItem('cookie_consent');
  } catch (_) {}

  window.dispatchEvent(new CustomEvent('leadspay-cookie-consent', { detail: payload }));
  return payload;
}

export const CookieConsentBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) {
        setIsVisible(true);
        return;
      }

      const parsed = JSON.parse(saved) as Partial<CookiePreferences>;
      if (parsed.version !== 1 || parsed.necessary !== true) {
        setIsVisible(true);
        return;
      }

      setAnalytics(parsed.analytics === true);
      setMarketing(parsed.marketing === true);
    } catch (_) {
      setIsVisible(true);
    }
  }, []);

  const finish = (nextAnalytics: boolean, nextMarketing: boolean) => {
    persistConsent(nextAnalytics, nextMarketing);
    setAnalytics(nextAnalytics);
    setMarketing(nextMarketing);
    setShowSettings(false);
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div
      id="cookie-banner"
      role="region"
      aria-label="Preferências de cookies"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/15 bg-[#0b1329]/95 px-4 py-4 shadow-2xl backdrop-blur-md sm:px-6"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl text-xs leading-relaxed text-white/90 sm:text-sm">
            <p className="font-semibold text-white">Sua privacidade importa.</p>
            <p className="mt-1">
              Usamos cookies necessários para o funcionamento da LeadsPay. Cookies de analytics e marketing só serão ativados com sua permissão.
              {' '}
              <a href="/legal.html#cookies" target="_blank" rel="noreferrer" className="font-semibold text-[#D9F22A] underline hover:text-white">
                Ver política de cookies
              </a>
              .
            </p>
          </div>

          {!showSettings && (
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap lg:justify-end">
              <button
                type="button"
                onClick={() => finish(false, false)}
                className="rounded-xl border border-white/20 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-white/10"
              >
                Recusar não essenciais
              </button>
              <button
                type="button"
                onClick={() => setShowSettings(true)}
                className="rounded-xl border border-[#D9F22A]/40 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-[#D9F22A] transition hover:bg-[#D9F22A]/10"
              >
                Configurar
              </button>
              <button
                type="button"
                onClick={() => finish(true, true)}
                className="rounded-xl bg-[#D9F22A] px-5 py-2.5 text-xs font-black uppercase tracking-wider text-[#060A15] transition hover:bg-[#c8e217]"
              >
                Aceitar todos
              </button>
            </div>
          )}
        </div>

        {showSettings && (
          <div className="rounded-2xl border border-white/10 bg-[#07101f] p-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-white">Necessários</p>
                    <p className="mt-1 text-xs text-white/60">Login, segurança, sessão e funções essenciais.</p>
                  </div>
                  <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-[10px] font-bold uppercase text-emerald-300">Sempre ativos</span>
                </div>
              </div>

              <label className="flex cursor-pointer items-start justify-between gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
                <div>
                  <p className="text-sm font-bold text-white">Analytics</p>
                  <p className="mt-1 text-xs text-white/60">Mede uso e desempenho para melhorar a plataforma.</p>
                </div>
                <input
                  type="checkbox"
                  checked={analytics}
                  onChange={(e) => setAnalytics(e.target.checked)}
                  className="mt-1 h-4 w-4 accent-[#D9F22A]"
                />
              </label>

              <label className="flex cursor-pointer items-start justify-between gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
                <div>
                  <p className="text-sm font-bold text-white">Marketing</p>
                  <p className="mt-1 text-xs text-white/60">Personalização de campanhas e medição de anúncios.</p>
                </div>
                <input
                  type="checkbox"
                  checked={marketing}
                  onChange={(e) => setMarketing(e.target.checked)}
                  className="mt-1 h-4 w-4 accent-[#D9F22A]"
                />
              </label>
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => finish(false, false)}
                className="rounded-xl border border-white/20 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-white/10"
              >
                Recusar não essenciais
              </button>
              <button
                type="button"
                onClick={() => finish(analytics, marketing)}
                className="rounded-xl bg-[#D9F22A] px-5 py-2.5 text-xs font-black uppercase tracking-wider text-[#060A15] transition hover:bg-[#c8e217]"
              >
                Salvar preferências
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
