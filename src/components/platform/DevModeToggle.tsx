import React from 'react';
import { FlaskConical, ShieldCheck, Zap } from 'lucide-react';

interface DevModeToggleProps {
  environment: 'development' | 'production';
  onToggle: (newEnv: 'development' | 'production') => void;
  isLoading?: boolean;
}

export const DevModeToggle: React.FC<DevModeToggleProps> = ({
  environment,
  onToggle,
  isLoading = false
}) => {
  const isDev = environment === 'development';

  const handleClick = () => {
    if (isLoading) return;
    const targetEnv = isDev ? 'production' : 'development';
    onToggle(targetEnv);
  };

  return (
    <div 
      id="dev-mode-toggle-container"
      className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/10 text-xs select-none"
    >
      {/* Label and Badge */}
      <div className="flex items-center gap-1.5">
        {isDev ? (
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
        ) : (
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
        )}
        <span className="text-[11px] font-bold text-white/70 hidden sm:inline">
          {isDev ? 'Modo Teste' : 'Produção'}
        </span>
      </div>

      {/* Switch Button */}
      <button
        type="button"
        role="switch"
        aria-checked={isDev}
        id="dev-mode-switch-button"
        onClick={handleClick}
        disabled={isLoading}
        title={isDev ? "Ambiente Sandbox (Ativo). Clique para mudar para Produção." : "Ambiente de Produção (Ativo). Clique para ativar o Sandbox."}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
          isDev ? 'bg-amber-500' : 'bg-emerald-500'
        } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <span
          aria-hidden="true"
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out flex items-center justify-center ${
            isDev ? 'translate-x-5' : 'translate-x-0'
          }`}
        >
          {isDev ? (
            <FlaskConical className="w-3 h-3 text-amber-700" />
          ) : (
            <ShieldCheck className="w-3 h-3 text-emerald-700" />
          )}
        </span>
      </button>

      {/* Badge Indicator */}
      <span className={`text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded tracking-wider ${
        isDev 
          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
      }`}>
        {isDev ? 'Dev' : 'Prod'}
      </span>
    </div>
  );
};
