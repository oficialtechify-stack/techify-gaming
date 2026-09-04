import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#060A15] text-white flex items-center justify-center p-6 text-center">
          <div className="max-w-md w-full bg-[#080d1a] border border-white/15 rounded-3xl p-8 shadow-2xl flex flex-col items-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mb-4">
              <AlertTriangle className="w-7 h-7" />
            </div>
            
            <h2 className="text-xl font-extrabold font-['Syne'] text-white mb-2">
              {this.props.fallbackTitle || 'Ops! Ocorreu uma instabilidade'}
            </h2>
            
            <p className="text-xs text-white/70 mb-6 leading-relaxed">
              O ecossistema LeadsPay identificou um erro temporário na interface. Seus dados continuam preservados.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  if (this.props.onReset) this.props.onReset();
                  window.location.reload();
                }}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#D9F22A] text-[#060A15] font-black text-xs uppercase tracking-wider rounded-xl hover:bg-[#cbe31c] transition-all cursor-pointer shadow-[0_0_20px_rgba(217,242,42,0.3)]"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Recarregar Página</span>
              </button>

              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  if (this.props.onReset) this.props.onReset();
                  window.location.href = '/';
                }}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-white/10 hover:bg-white/15 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer border border-white/10"
              >
                <Home className="w-4 h-4" />
                <span>Início</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
