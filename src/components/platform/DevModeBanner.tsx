import React from 'react';
import { 
  FlaskConical, 
  ArrowRight, 
  ShieldCheck, 
  Zap, 
  ShoppingCart, 
  Repeat, 
  Lock, 
  CheckCircle2,
  Sparkles
} from 'lucide-react';

interface DevModeBannerProps {
  environment?: 'development' | 'production';
  onSwitchToProduction?: () => void;
  onSwitchToDevelopment?: () => void;
  onGoToProduction?: () => void;
  onSimulateSale?: () => void;
  onOpenTestCheckout?: () => void;
  isVerified?: boolean;
  isSimulating?: boolean;
}

export const DevModeBanner: React.FC<DevModeBannerProps> = ({
  environment = 'development',
  onSwitchToProduction,
  onSwitchToDevelopment,
  onGoToProduction,
  onSimulateSale,
  onOpenTestCheckout,
  isVerified = false,
  isSimulating = false
}) => {
  const isDev = environment === 'development';
  const handleProductionAction = onSwitchToProduction || onGoToProduction || (() => {});

  if (!isDev) {
    // =========================================================================
    // 🟢 BANNER MODO PRODUÇÃO REAL (SISTEMA DE PRODUÇÃO ATIVO)
    // =========================================================================
    return (
      <div 
        id="production-mode-active-banner"
        className="sticky top-0 z-40 w-full bg-[#060A15]/95 backdrop-blur-md border-b border-emerald-500/30 px-3 sm:px-6 py-2.5 shadow-[0_4px_25px_rgba(16,185,129,0.15)] flex items-center justify-between gap-3 text-xs flex-wrap"
      >
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-7 h-7 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center flex-shrink-0 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-2 truncate">
            <span className="inline-flex items-center gap-1.5 font-black uppercase tracking-wider text-[10px] sm:text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full flex-shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Produção Real</span>
            </span>
            <span className="truncate text-white/90 font-medium hidden md:inline">
              — Transacionando em ambiente bancário oficial com liquidação D+9 e Gateway Asaas/Mercado Pago ativo.
            </span>
            <span className="truncate text-white/90 font-medium md:hidden">
              — Sistema bancário real ativo (D+9)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
          <span className="hidden lg:inline-flex items-center gap-1 text-[11px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" />
            <span>Homologado</span>
          </span>

          {onSwitchToDevelopment && (
            <button
              id="btn-banner-switch-to-sandbox"
              type="button"
              onClick={onSwitchToDevelopment}
              className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white text-xs font-bold transition-all border border-white/10 active:scale-95"
              title="Alternar de volta para o Sandbox de Testes"
            >
              <FlaskConical className="w-3.5 h-3.5 text-amber-400" />
              <span>Modo Teste (Sandbox)</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // 🧪 BANNER MODO SANDBOX DE TESTES (SITE FAKE PARA TESTAR TUDO)
  // =========================================================================
  return (
    <div 
      id="dev-mode-sandbox-banner"
      className="sticky top-0 z-40 w-full bg-gradient-to-r from-amber-500 via-[#e0a816] to-[#D9F22A] text-slate-950 font-semibold px-3 sm:px-6 py-2 shadow-lg flex items-center justify-between gap-3 text-xs border-b border-amber-600/30 flex-wrap"
    >
      {/* Left Info */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <div className="w-7 h-7 rounded-lg bg-black/15 flex items-center justify-center flex-shrink-0">
          <FlaskConical className="w-4 h-4 text-slate-950 animate-bounce" />
        </div>
        <div className="flex items-center gap-2 truncate">
          <span className="font-extrabold uppercase tracking-wider text-[11px] sm:text-xs bg-black/20 px-2 py-0.5 rounded text-slate-950 flex-shrink-0 flex items-center gap-1">
            <span>Ambiente de Teste</span>
          </span>
          <span className="truncate text-slate-950/90 font-bold hidden md:inline">
            — Simulação livre: teste checkouts, afiliações e produtos sem necessidade de verificação.
          </span>
          <span className="truncate text-slate-950/90 font-bold md:hidden">
            — Testes livres sem verificação
          </span>
        </div>
      </div>

      {/* Right Sandbox Test Tools & Switch */}
      <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
        {/* Quick Simulation Button: Simular Venda Teste */}
        {onSimulateSale && (
          <button
            type="button"
            onClick={onSimulateSale}
            disabled={isSimulating}
            id="btn-sandbox-simulate-sale"
            className="cursor-pointer hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/15 hover:bg-black/25 text-slate-950 hover:text-black text-xs font-black transition-all border border-black/10 active:scale-95 disabled:opacity-50"
            title="Gera uma venda PIX simulada aprovada com comissão em tempo real"
          >
            <Zap className="w-3.5 h-3.5 text-slate-950" />
            <span>{isSimulating ? 'Simulando...' : '⚡ Simular Venda'}</span>
          </button>
        )}

        {/* Quick Simulation Button: Testar Checkout Fake */}
        {onOpenTestCheckout && (
          <button
            type="button"
            onClick={onOpenTestCheckout}
            id="btn-sandbox-open-checkout"
            className="cursor-pointer hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/15 hover:bg-black/25 text-slate-950 hover:text-black text-xs font-black transition-all border border-black/10 active:scale-95"
            title="Abre o fluxo completo de checkout para testar pagamentos simulados"
          >
            <ShoppingCart className="w-3.5 h-3.5 text-slate-950" />
            <span>🛒 Testar Checkout</span>
          </button>
        )}

        {/* Action Button to switch or request verification */}
        <button
          id="btn-banner-go-to-production"
          type="button"
          onClick={handleProductionAction}
          className="cursor-pointer flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-lg bg-slate-950 text-[#D9F22A] hover:bg-slate-900 hover:text-white text-xs font-black uppercase tracking-wider shadow-md transition-all active:scale-95 border border-black/20"
          title={isVerified ? "Mudar para o Sistema Real de Produção" : "Preencher perfil para a administração aprovar e entrar em Produção"}
        >
          {isVerified ? (
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <Lock className="w-3.5 h-3.5 text-amber-400" />
          )}
          <span>{isVerified ? 'Entrar em Produção' : 'Mudar para Produção'}</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
