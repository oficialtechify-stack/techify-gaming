import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
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
  const [loading, setLoading] = useState(true);
  const workAdventureUrl = resolveOfficialWorkAdventureUrl();

  return (
    <section className={'lp-office-native' + (standalone ? ' is-standalone' : '')}>
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
    </section>
  );
};

export default LeadspayOfficeView;
