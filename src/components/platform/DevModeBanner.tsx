import React from 'react';
import { FlaskConical, ArrowRight, ShieldCheck } from 'lucide-react';

interface DevModeBannerProps {
  environment?: 'development' | 'production';
  onSwitchToProduction?: () => void;
  onGoToProduction?: () => void;
  isVerified?: boolean;
}

export const DevModeBanner: React.FC<DevModeBannerProps> = ({
  environment = 'development',
  onSwitchToProduction,
  onGoToProduction,
  isVerified = false
}) => {
  if (environment === 'production') return null;

  const handleAction = onSwitchToProduction || onGoToProduction || (() => {});
  return (
    <div 
      id="dev-mode-sandbox-banner"
      className="sticky top-0 z-40 w-full bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 text-slate-950 font-semibold px-3 sm:px-6 py-2 shadow-lg flex items-center justify-between gap-3 text-xs sm:text-sm border-b border-amber-600/30"
    >
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <div className="w-7 h-7 rounded-lg bg-black/15 flex items-center justify-center flex-shrink-0">
          <FlaskConical className="w-4 h-4 text-slate-950 animate-pulse" />
        </div>
        <div className="flex items-center gap-2 truncate">
          <span className="font-extrabold uppercase tracking-wider text-[11px] sm:text-xs bg-black/20 px-2 py-0.5 rounded text-slate-950 flex-shrink-0">
            Sandbox Mode
          </span>
          <span className="truncate text-slate-950/90 font-medium hidden sm:inline">
            — Você está em um ambiente de teste simulado. Transações e saques não movimentam dinheiro real.
          </span>
          <span className="truncate text-slate-950/90 font-medium sm:hidden">
            — Ambiente de teste simulado
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          id="btn-banner-go-to-production"
          onClick={handleAction}
          className="cursor-pointer flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-lg bg-slate-950 text-amber-300 hover:bg-slate-900 hover:text-amber-200 text-xs font-black uppercase tracking-wider shadow transition-all active:scale-95"
          title="Alternar para o ambiente de produção real"
        >
          {isVerified ? (
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <ArrowRight className="w-3.5 h-3.5" />
          )}
          <span>Ir para produção</span>
        </button>
      </div>
    </div>
  );
};
