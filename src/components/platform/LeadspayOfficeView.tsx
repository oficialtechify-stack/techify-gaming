import React, { useEffect, useRef, useState } from 'react';
import {
  Building2,
  ExternalLink,
  KeyRound,
  Loader2,
  LogIn,
  Maximize2,
  Minimize2,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import '../../styles/leadspay-office-workadventure.css';

interface LeadspayOfficeViewProps {
  standalone?: boolean;
}

const LEADSPAY_WORKADVENTURE_WORLD =
  'https://play.workadventu.re/@/leadspay/leadspay/leadspay-startup';

const RICK_AUTOLOGIN_STORAGE_KEY = 'leadspay-office-rick-autologin-url-v1';

function resolveWorkAdventureUrl() {
  const env = import.meta.env as Record<string, string | undefined>;
  return env.VITE_WORKADVENTURE_FULL_URL?.trim() || LEADSPAY_WORKADVENTURE_WORLD;
}

function isWorkAdventureAccessUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' && parsed.hostname.endsWith('workadventu.re');
  } catch {
    return false;
  }
}

function retargetRickAccessUrl(value: string, roomUrl: string) {
  try {
    const access = new URL(value);
    const room = new URL(roomUrl);

    if (access.searchParams.has('playUri')) {
      access.searchParams.set('playUri', roomUrl);
      return access.toString();
    }

    if (
      access.hostname === 'play.workadventu.re' &&
      access.pathname.startsWith('/@/leadspay/leadspay/')
    ) {
      access.pathname = room.pathname;
      return access.toString();
    }

    return value;
  } catch {
    return value;
  }
}

export const LeadspayOfficeView: React.FC<LeadspayOfficeViewProps> = ({
  standalone = false,
}) => {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const baseWorldUrl = resolveWorkAdventureUrl();

  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [rickAccessUrl, setRickAccessUrl] = useState('');
  const [draftRickAccessUrl, setDraftRickAccessUrl] = useState('');
  const [loginSetupOpen, setLoginSetupOpen] = useState(false);
  const [loginSetupError, setLoginSetupError] = useState('');
  const [allowAnonymous, setAllowAnonymous] = useState(false);
  const [frameKey, setFrameKey] = useState(0);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(RICK_AUTOLOGIN_STORAGE_KEY)?.trim() || '';
      if (stored && isWorkAdventureAccessUrl(stored)) {
        const retargeted = retargetRickAccessUrl(stored, baseWorldUrl);
        setRickAccessUrl(retargeted);
        setDraftRickAccessUrl(retargeted);
        if (retargeted !== stored) {
          window.localStorage.setItem(RICK_AUTOLOGIN_STORAGE_KEY, retargeted);
        }
      }
    } catch {
      // Sem storage persistente, o usuário ainda pode usar o World como anônimo.
    }
  }, [baseWorldUrl]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === shellRef.current);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const activeWorldUrl = rickAccessUrl || baseWorldUrl;
  const hasRickAccess = Boolean(rickAccessUrl);

  const toggleFullscreen = async () => {
    const shell = shellRef.current;
    if (!shell || !document.fullscreenEnabled) return;

    try {
      if (document.fullscreenElement === shell) {
        await document.exitFullscreen();
      } else {
        await shell.requestFullscreen();
      }
    } catch {
      // O navegador pode bloquear fullscreen sem um gesto direto do usuário.
    }
  };

  const saveRickAccess = () => {
    const value = retargetRickAccessUrl(draftRickAccessUrl.trim(), baseWorldUrl);

    if (!isWorkAdventureAccessUrl(value)) {
      setLoginSetupError('Cole a URL de Token access / autologin gerada pelo WorkAdventure para o membro rick.');
      return;
    }

    if (value === LEADSPAY_WORKADVENTURE_WORLD) {
      setLoginSetupError('Essa é a URL normal do World. Precisamos da URL de Token access / autologin do membro rick.');
      return;
    }

    try {
      window.localStorage.setItem(RICK_AUTOLOGIN_STORAGE_KEY, value);
    } catch {
      // Continua válido nesta sessão mesmo se o navegador bloquear localStorage.
    }

    setRickAccessUrl(value);
    setLoginSetupError('');
    setLoginSetupOpen(false);
    setAllowAnonymous(false);
    setLoading(true);
    setFrameKey((value) => value + 1);
  };

  const clearRickAccess = () => {
    try {
      window.localStorage.removeItem(RICK_AUTOLOGIN_STORAGE_KEY);
    } catch {
      // Ignora falhas de limpeza do storage.
    }

    setRickAccessUrl('');
    setDraftRickAccessUrl('');
    setLoginSetupError('');
    setAllowAnonymous(false);
    setLoading(true);
    setFrameKey((value) => value + 1);
  };

  return (
    <div
      ref={shellRef}
      className={'lp-office-owned-world' + (standalone ? ' is-standalone' : '')}
    >
      <div className="lp-office-owned-toolbar">
        <div className="lp-office-owned-title">
          <span className="lp-office-owned-icon">
            <Building2 className="h-4 w-4" />
          </span>
          <div>
            <strong>LeadsPay Office</strong>
            <span>
              {hasRickAccess
                ? 'Acesso rick Admin configurado neste navegador'
                : 'World oficial da LeadsPay · WorkAdventure'}
            </span>
          </div>
        </div>

        <div className="lp-office-owned-actions">
          <button
            type="button"
            className={hasRickAccess ? 'secondary is-connected' : 'secondary'}
            onClick={() => {
              setDraftRickAccessUrl(rickAccessUrl);
              setLoginSetupError('');
              setLoginSetupOpen(true);
            }}
            title="Configurar o acesso do membro rick"
          >
            {hasRickAccess ? <ShieldCheck className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
            <span>{hasRickAccess ? 'Acesso rick' : 'Entrar como rick'}</span>
          </button>

          <button
            type="button"
            className="secondary"
            onClick={() => window.open(baseWorldUrl, '_blank', 'noopener,noreferrer')}
            title="Abrir este World diretamente no WorkAdventure"
          >
            <ExternalLink className="h-4 w-4" />
            <span>Abrir no WorkAdventure</span>
          </button>

          <button
            type="button"
            className="primary"
            onClick={() => void toggleFullscreen()}
            title={isFullscreen ? 'Sair da tela cheia' : 'Abrir LeadsPay Office em tela cheia'}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            <span>{isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}</span>
          </button>
        </div>
      </div>

      <section className="lp-office-owned-stage">
        {loading && (
          <div className="lp-office-native-loading">
            <Loader2 className="animate-spin" />
            <strong>Entrando no LeadsPay Office...</strong>
            <span>{hasRickAccess ? 'Conectando como rick.' : 'Carregando seu World do WorkAdventure.'}</span>
          </div>
        )}

        <iframe
          key={frameKey}
          className="lp-office-native-frame"
          src={activeWorldUrl}
          title="LeadsPay Office · WorkAdventure"
          allow="camera *; microphone *; fullscreen *; display-capture *; clipboard-read *; clipboard-write *; autoplay *"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          onLoad={() => setLoading(false)}
        />

        {!hasRickAccess && !allowAnonymous && (
          <div className="lp-office-rick-gate">
            <div className="lp-office-rick-gate-card">
              <span className="lp-office-rick-gate-icon">
                <KeyRound className="h-5 w-5" />
              </span>
              <div>
                <strong>Entre como rick Admin</strong>
                <p>
                  O login Google dentro do iframe pode falhar. Use a URL de Token access do seu membro rick para entrar direto como administrador.
                </p>
              </div>
              <div className="lp-office-rick-gate-actions">
                <button
                  type="button"
                  className="primary"
                  onClick={() => {
                    setDraftRickAccessUrl('');
                    setLoginSetupError('');
                    setLoginSetupOpen(true);
                  }}
                >
                  <LogIn className="h-4 w-4" />
                  Conectar rick
                </button>
                <button type="button" className="ghost" onClick={() => setAllowAnonymous(true)}>
                  Continuar como anônimo
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      {loginSetupOpen && (
        <div
          className="lp-office-rick-modal-backdrop"
          role="presentation"
          onMouseDown={() => setLoginSetupOpen(false)}
        >
          <div
            className="lp-office-rick-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Conectar conta rick"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button type="button" className="lp-office-rick-modal-close" onClick={() => setLoginSetupOpen(false)}>
              <X className="h-4 w-4" />
            </button>

            <div className="lp-office-rick-modal-heading">
              <span><KeyRound className="h-5 w-5" /></span>
              <div>
                <strong>Conectar rick Admin</strong>
                <p>Use o autologin oficial do WorkAdventure. A URL fica salva somente neste navegador.</p>
              </div>
            </div>

            <div className="lp-office-rick-steps">
              <div><b>1</b><p>Abra o painel administrativo do WorkAdventure.</p></div>
              <div><b>2</b><p>Entre no World LeadsPay, abra Members e clique no membro <strong>rick</strong>.</p></div>
              <div><b>3</b><p>Copie a URL <strong>Token access</strong> / autologin desse membro.</p></div>
              <div><b>4</b><p>Cole a URL abaixo. Não envie esse link pelo chat nem compartilhe com outras pessoas.</p></div>
            </div>

            <button
              type="button"
              className="lp-office-rick-open-admin"
              onClick={() => window.open('https://admin.workadventu.re/', '_blank', 'noopener,noreferrer')}
            >
              <ExternalLink className="h-4 w-4" />
              Abrir painel do WorkAdventure
            </button>

            <label className="lp-office-rick-url-field">
              <span>Token access URL do rick</span>
              <input
                value={draftRickAccessUrl}
                onChange={(event) => {
                  setDraftRickAccessUrl(event.target.value);
                  setLoginSetupError('');
                }}
                placeholder="Cole aqui a URL de autologin do WorkAdventure"
                autoComplete="off"
                spellCheck={false}
              />
            </label>

            {loginSetupError && <p className="lp-office-rick-error">{loginSetupError}</p>}

            <div className="lp-office-rick-modal-actions">
              {hasRickAccess && (
                <button type="button" className="danger" onClick={clearRickAccess}>
                  <Trash2 className="h-4 w-4" />
                  Remover acesso salvo
                </button>
              )}
              <button type="button" className="save" onClick={saveRickAccess}>
                <ShieldCheck className="h-4 w-4" />
                Entrar como rick
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadspayOfficeView;
