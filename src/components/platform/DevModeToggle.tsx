import React from 'react';
import { FlaskConical, ShieldCheck, Lock } from 'lucide-react';

interface DevModeToggleProps {
  environment: 'development' | 'production';
  onToggle?: (newEnv: 'development' | 'production') => void;
  onChange?: (newEnv: 'development' | 'production') => void;
  isLoading?: boolean;
  isVerified?: boolean;
}

export const DevModeToggle: React.FC<DevModeToggleProps> = ({
  environment,
  onToggle,
  onChange,
  isLoading = false,
  isVerified = false
}) => {
  const isDev = environment === 'development';

  const handleClick = () => {
    if (isLoading) return;
    const targetEnv = isDev ? 'production' : 'development';
    const callback = onToggle || onChange;
    if (callback) {
      callback(targetEnv);
    }
  };

  return (
    <div 
      id="dev-mode-toggle-container"
      className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/10 text-xs select-none shadow-sm"
    >
      {/* Label and Indicator */}
      <div className="flex items-center gap-1.5">
        {isDev ? (
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
          </span>
        ) : (
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
        )}
        <span className="text-[11px] font-bold text-white/80 hidden sm:inline">
          {isDev ? 'Modo Teste' : 'Produção Real'}
        </span>
        {isDev && !isVerified && (
          <span title="Produção bloqueada até verificação cadastral" className="hidden sm:inline-flex items-center">
            <Lock className="w-3 h-3 text-amber-400" />
          </span>
        )}
      </div>

      {/* Switch Button */}
      <button
        type="button"
        role="switch"
        aria-checked={!isDev}
        id="dev-mode-switch-button"
        onClick={handleClick}
        disabled={isLoading}
        title={
          isDev 
            ? (isVerified ? "Ambiente de Testes Ativo. Clique para entrar no Sistema de Produção Real." : "Ambiente de Testes Ativo. Requer verificação para liberar a Produção Real.")
            : "Sistema de Produção Ativo. Clique para alternar para o Modo de Teste."
        }
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
          isDev ? 'bg-amber-500/80 hover:bg-amber-500' : 'bg-emerald-500 hover:bg-emerald-400'
        } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <span
          aria-hidden="true"
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-slate-950 shadow-lg ring-0 transition duration-200 ease-in-out flex items-center justify-center ${
            isDev ? 'translate-x-0' : 'translate-x-5'
          }`}
        >
          {isDev ? (
            <FlaskConical className="w-3 h-3 text-amber-400" />
          ) : (
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
          )}
        </span>
      </button>
    </div>
  );
};
