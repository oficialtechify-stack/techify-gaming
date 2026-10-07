import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Maximize2, Minimize2 } from 'lucide-react';
import '../../styles/leadspay-office-workadventure.css';

interface LeadspayOfficeViewProps {
  standalone?: boolean;
}

const OFFICIAL_WORKADVENTURE_MAP =
  'https://workadventure.github.io/map-starter-kit/office.tmj';

function resolveOfficialWorkAdventureUrl() {
  const env = import.meta.env as Record<string, string | undefined>;

  const direct = env.VITE_WORKADVENTURE_FULL_URL?.trim();
  if (direct) return direct;

  const playBase = (env.VITE_WORKADVENTURE_PLAY_URL || 'https://play.workadventu.re').replace(/\/$/, '');
  const mapUrl = (env.VITE_WORKADVENTURE_MAP_URL || OFFICIAL_WORKADVENTURE_MAP).trim();
  const instance = (env.VITE_WORKADVENTURE_INSTANCE || 'leadspay-office').replace(/[^a-zA-Z0-9_-]/g, '-');
  const parsed = new URL(mapUrl);

  return playBase + '/_/' + instance + '/' + parsed.host + parsed.pathname;
}

export const LeadspayOfficeView: React.FC<LeadspayOfficeViewProps> = ({
  standalone = false,
}) => {
  const shellRef = useRef<HTMLElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const workAdventureUrl = resolveOfficialWorkAdventureUrl();

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
      // Browsers can deny fullscreen when it is not initiated by a direct user gesture.
    }
  };

  return (
    <section ref={shellRef} className={'lp-office-native' + (standalone ? ' is-standalone' : '')}>
      {loading && (
        <div className="lp-office-native-loading">
          <Loader2 className="animate-spin" />
          <strong>Carregando WorkAdventure...</strong>
          <span>Sistema oficial do WorkAdventure.</span>
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

      <button
        type="button"
        className="lp-office-fullscreen-button"
        onClick={() => void toggleFullscreen()}
        title={isFullscreen ? 'Sair da tela cheia' : 'Abrir LeadsPay Office em tela cheia'}
      >
        {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        <span>{isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}</span>
      </button>

      <div className="lp-office-workadventure-login-shield" aria-hidden="true" />
    </section>
  );
};

export default LeadspayOfficeView;
