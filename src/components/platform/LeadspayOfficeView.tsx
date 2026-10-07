import React, { useMemo, useRef, useState } from 'react';
import { ArrowLeft, Expand, Loader2, RefreshCw } from 'lucide-react';
import '../../styles/leadspay-office-workadventure.css';

interface LeadspayOfficeViewProps {
  standalone?: boolean;
  onExit?: () => void;
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
  onExit,
}) => {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const [frameKey, setFrameKey] = useState(0);
  const [loading, setLoading] = useState(true);

  const workAdventureUrl = useMemo(
    () => resolveOfficialWorkAdventureUrl(),
    [frameKey],
  );

  const requestFullscreen = async () => {
    const node = shellRef.current;
    if (!node || !document.fullscreenEnabled) return;

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await node.requestFullscreen();
      }
    } catch {
      // O navegador pode bloquear fullscreen sem interação explícita.
    }
  };

  return (
    <section
      ref={shellRef}
      className={'lp-office-native' + (standalone ? ' is-standalone' : '')}
    >
      {loading && (
        <div className="lp-office-native-loading">
          <Loader2 className="animate-spin" />
          <strong>Carregando WorkAdventure...</strong>
          <span>Usando o sistema oficial sem mapa personalizado do LeadsPay.</span>
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

      <div className="lp-office-native-actions" data-office-overlay="true">
        <button
          type="button"
          title="Recarregar WorkAdventure"
          onClick={() => {
            setLoading(true);
            setFrameKey((value) => value + 1);
          }}
        >
          <RefreshCw className="h-4 w-4" />
        </button>
        <button type="button" title="Tela cheia" onClick={() => void requestFullscreen()}>
          <Expand className="h-4 w-4" />
        </button>
        {onExit && (
          <button type="button" title="Voltar para LeadsPay" onClick={onExit}>
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
      </div>
    </section>
  );
};

export default LeadspayOfficeView;
