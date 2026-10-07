import React, { useEffect, useRef, useState } from 'react';
import { Building2, ExternalLink, Loader2, Maximize2, Minimize2 } from 'lucide-react';
import '../../styles/leadspay-office-workadventure.css';

interface LeadspayOfficeViewProps {
  standalone?: boolean;
}

const LEADSPAY_WORKADVENTURE_WORLD =
  'https://play.workadventu.re/@/leadspay/leadspay/great-place-to-work';

function resolveWorkAdventureUrl() {
  const env = import.meta.env as Record<string, string | undefined>;
  return env.VITE_WORKADVENTURE_FULL_URL?.trim() || LEADSPAY_WORKADVENTURE_WORLD;
}

export const LeadspayOfficeView: React.FC<LeadspayOfficeViewProps> = ({
  standalone = false,
}) => {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const workAdventureUrl = resolveWorkAdventureUrl();

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === shellRef.current);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

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
            <span>World oficial da LeadsPay · WorkAdventure</span>
          </div>
        </div>

        <div className="lp-office-owned-actions">
          <button
            type="button"
            className="secondary"
            onClick={() => window.open(workAdventureUrl, '_blank', 'noopener,noreferrer')}
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
            <span>Carregando seu World do WorkAdventure.</span>
          </div>
        )}

        <iframe
          className="lp-office-native-frame"
          src={workAdventureUrl}
          title="LeadsPay Office · WorkAdventure"
          allow="camera *; microphone *; fullscreen *; display-capture *; clipboard-read *; clipboard-write *; autoplay *"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          onLoad={() => setLoading(false)}
        />
      </section>
    </div>
  );
};

export default LeadspayOfficeView;
