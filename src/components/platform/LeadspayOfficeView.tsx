import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Building2,
  ExternalLink,
  Loader2,
  Maximize2,
  Minimize2,
  Settings2,
  X,
} from 'lucide-react';
import '../../styles/leadspay-office-workadventure.css';

interface LeadspayOfficeViewProps {
  standalone?: boolean;
}

const OFFICIAL_WORKADVENTURE_MAP =
  'https://workadventure.github.io/map-starter-kit/office.tmj';

const OFFICE_WORLD_STORAGE_KEY = 'leadspay-office-workadventure-world-url';

function getEnvironmentWorldUrl() {
  const env = import.meta.env as Record<string, string | undefined>;
  return env.VITE_WORKADVENTURE_FULL_URL?.trim() || '';
}

function buildFallbackWorkAdventureUrl() {
  const env = import.meta.env as Record<string, string | undefined>;
  const playBase = (env.VITE_WORKADVENTURE_PLAY_URL || 'https://play.workadventu.re').replace(/\/$/, '');
  const mapUrl = (env.VITE_WORKADVENTURE_MAP_URL || OFFICIAL_WORKADVENTURE_MAP).trim();
  const instance = (env.VITE_WORKADVENTURE_INSTANCE || 'leadspay-office').replace(/[^a-zA-Z0-9_-]/g, '-');
  const parsed = new URL(mapUrl);

  return playBase + '/_/' + instance + '/' + parsed.host + parsed.pathname;
}

function isManagedWorldUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' &&
      url.hostname === 'play.workadventu.re' &&
      url.pathname.startsWith('/@/');
  } catch {
    return false;
  }
}

export const LeadspayOfficeView: React.FC<LeadspayOfficeViewProps> = ({
  standalone = false,
}) => {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const envWorldUrl = getEnvironmentWorldUrl();

  const [savedWorldUrl, setSavedWorldUrl] = useState('');
  const [draftWorldUrl, setDraftWorldUrl] = useState('');
  const [setupOpen, setSetupOpen] = useState(false);
  const [setupError, setSetupError] = useState('');
  const [loading, setLoading] = useState(true);
  const [frameKey, setFrameKey] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(OFFICE_WORLD_STORAGE_KEY)?.trim() || '';
      if (stored && isManagedWorldUrl(stored)) {
        setSavedWorldUrl(stored);
        setDraftWorldUrl(stored);
      } else if (envWorldUrl && isManagedWorldUrl(envWorldUrl)) {
        setDraftWorldUrl(envWorldUrl);
      }
    } catch {
      if (envWorldUrl && isManagedWorldUrl(envWorldUrl)) {
        setDraftWorldUrl(envWorldUrl);
      }
    }
  }, [envWorldUrl]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === shellRef.current);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const connectedWorldUrl = savedWorldUrl || (isManagedWorldUrl(envWorldUrl) ? envWorldUrl : '');
  const isManagedWorld = Boolean(connectedWorldUrl);

  const workAdventureUrl = useMemo(
    () => connectedWorldUrl || buildFallbackWorkAdventureUrl(),
    [connectedWorldUrl],
  );

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

  const reloadWorld = () => {
    setLoading(true);
    setFrameKey((value) => value + 1);
  };

  const saveWorld = () => {
    const value = draftWorldUrl.trim();

    if (!isManagedWorldUrl(value)) {
      setSetupError(
        'Cole a URL do seu World do WorkAdventure. Ela deve começar com https://play.workadventu.re/@/.',
      );
      return;
    }

    try {
      window.localStorage.setItem(OFFICE_WORLD_STORAGE_KEY, value);
    } catch {
      // Mesmo sem storage persistente, a sessão atual pode usar a URL.
    }

    setSavedWorldUrl(value);
    setSetupError('');
    setSetupOpen(false);
    setLoading(true);
    setFrameKey((current) => current + 1);
  };

  const useDemoWorld = () => {
    try {
      window.localStorage.removeItem(OFFICE_WORLD_STORAGE_KEY);
    } catch {
      // Ignora falhas de storage.
    }
    setSavedWorldUrl('');
    setDraftWorldUrl('');
    setSetupError('');
    setSetupOpen(false);
    setLoading(true);
    setFrameKey((current) => current + 1);
  };

  const openAdmin = () => {
    window.open('https://admin.workadventu.re/', '_blank', 'noopener,noreferrer');
  };

  const openWorldInNewTab = () => {
    window.open(workAdventureUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      ref={shellRef}
      className={'lp-office-native-shell' + (standalone ? ' is-standalone' : '')}
    >
      <div className="lp-office-external-toolbar">
        <div className="lp-office-external-title">
          <Building2 className="h-4 w-4" />
          <div>
            <strong>LeadsPay Office</strong>
            <span>{isManagedWorld ? 'Seu World do WorkAdventure está conectado' : 'Demonstração oficial do WorkAdventure'}</span>
          </div>
        </div>

        <div className="lp-office-external-actions">
          <button
            type="button"
            className="secondary"
            onClick={() => {
              setDraftWorldUrl(connectedWorldUrl);
              setSetupError('');
              setSetupOpen(true);
            }}
          >
            <Settings2 className="h-4 w-4" />
            <span>{isManagedWorld ? 'Trocar escritório' : 'Escolher escritório'}</span>
          </button>

          {isManagedWorld && (
            <button type="button" className="secondary" onClick={openAdmin}>
              <ExternalLink className="h-4 w-4" />
              <span>Administrar</span>
            </button>
          )}

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

      <section className="lp-office-native">
        {loading && (
          <div className="lp-office-native-loading">
            <Loader2 className="animate-spin" />
            <strong>Carregando WorkAdventure...</strong>
            <span>{isManagedWorld ? 'Entrando no seu escritório.' : 'Sistema oficial do WorkAdventure.'}</span>
          </div>
        )}

        <iframe
          key={frameKey}
          className="lp-office-native-frame"
          src={workAdventureUrl}
          title="LeadsPay Office · WorkAdventure"
          allow="camera *; microphone *; fullscreen *; display-capture *; clipboard-read *; clipboard-write *; autoplay *"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          onLoad={() => setLoading(false)}
        />

        {!isManagedWorld && (
          <div
            className="lp-office-workadventure-login-shield"
            title="O login deste mapa de demonstração não possui administração. Escolha seu próprio escritório na barra acima."
          />
        )}
      </section>

      {setupOpen && (
        <div className="lp-office-world-setup-backdrop" role="presentation" onMouseDown={() => setSetupOpen(false)}>
          <div
            className="lp-office-world-setup"
            role="dialog"
            aria-modal="true"
            aria-label="Configurar escritório WorkAdventure"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button type="button" className="lp-office-world-setup-close" onClick={() => setSetupOpen(false)}>
              <X className="h-4 w-4" />
            </button>

            <div className="lp-office-world-setup-heading">
              <Building2 className="h-6 w-6" />
              <div>
                <strong>Escolha seu escritório</strong>
                <span>Use um World que pertença a você para liberar edição e administração.</span>
              </div>
            </div>

            <div className="lp-office-world-setup-steps">
              <div>
                <b>1</b>
                <p>Abra o painel do WorkAdventure, crie seu World e escolha um dos modelos de escritório.</p>
              </div>
              <div>
                <b>2</b>
                <p>Entre no World como administrador e copie a URL que começa com <code>https://play.workadventu.re/@/</code>.</p>
              </div>
              <div>
                <b>3</b>
                <p>Cole a URL abaixo. A partir daí o LeadsPay Office sempre abrirá o seu mundo.</p>
              </div>
            </div>

            <button type="button" className="lp-office-open-admin" onClick={openAdmin}>
              <ExternalLink className="h-4 w-4" />
              Abrir painel do WorkAdventure
            </button>

            <label className="lp-office-world-url-field">
              <span>URL do seu World</span>
              <input
                value={draftWorldUrl}
                onChange={(event) => {
                  setDraftWorldUrl(event.target.value);
                  setSetupError('');
                }}
                placeholder="https://play.workadventu.re/@/sua-organizacao/seu-world/..."
                autoComplete="off"
              />
            </label>

            {setupError && <p className="lp-office-world-setup-error">{setupError}</p>}

            <div className="lp-office-world-setup-actions">
              {isManagedWorld && (
                <button type="button" className="ghost" onClick={openWorldInNewTab}>
                  Abrir mundo em nova aba
                </button>
              )}
              <button type="button" className="ghost" onClick={useDemoWorld}>
                Usar demonstração
              </button>
              <button type="button" className="save" onClick={saveWorld}>
                Conectar escritório
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadspayOfficeView;
