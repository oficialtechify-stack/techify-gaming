import React from 'react';
import { Bot, Sparkles, AlertTriangle, Hammer, Terminal, ShieldAlert, Cpu } from 'lucide-react';
import { ApiKeySection } from './ApiKeySection';
import { UserProfile, UserRoleMode } from '../../types/platform';

interface AssistentesIaViewProps {
  userProfile?: UserProfile | null;
  onSaveProfile: (data: Partial<UserProfile>) => Promise<void>;
  roleMode?: UserRoleMode;
}

export const AssistentesIaView: React.FC<AssistentesIaViewProps> = ({
  userProfile,
  onSaveProfile,
  roleMode = 'afiliado'
}) => {
  return (
    <div className="flex flex-col gap-6 text-white min-w-0" id="leadspay-assistentes-ia-view">
      {/* Header with Title & Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#D9F22A]/10 border border-[#D9F22A]/30 flex items-center justify-center text-[#D9F22A] shadow-[0_0_15px_rgba(217,242,42,0.15)] flex-shrink-0">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white font-['Syne'] tracking-tight">
                Assistentes de IA & MCP
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                <Hammer className="w-3 h-3 animate-bounce" />
                Em Desenvolvimento
              </span>
            </div>
            <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
              Protocolo de contexto e integrações com GPT Actions, Claude Desktop e Gemini.
            </p>
          </div>
        </div>
      </div>

      {/* Prominent Warning Banner: Em Desenvolvimento */}
      <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 rounded-2xl p-4 sm:p-5 relative overflow-hidden backdrop-blur-md shadow-lg">
        <div className="flex items-start gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 flex-shrink-0 mt-0.5">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-amber-300 tracking-wide">
                Módulo em Desenvolvimento & Testes Beta
              </h3>
            </div>
            <p className="text-xs text-amber-200/80 mt-1 leading-relaxed">
              Esta aba é dedicada exclusivamente aos <strong>Assistentes de Inteligência Artificial</strong> e <strong>Servidores MCP (Model Context Protocol)</strong>. O recurso está atualmente em fase de homologação técnica. Chaves de API pessoais e schemas OpenAPI já podem ser configurados e testados no ambiente sandbox.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-amber-300/90 font-medium">
              <span className="flex items-center gap-1 bg-black/40 px-2.5 py-1 rounded-lg border border-amber-500/20">
                <Terminal className="w-3 h-3 text-[#D9F22A]" />
                MCP Server v1.0.4-dev
              </span>
              <span className="flex items-center gap-1 bg-black/40 px-2.5 py-1 rounded-lg border border-amber-500/20">
                <Cpu className="w-3 h-3 text-cyan-400" />
                OpenAPI Spec 3.1.0
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main ApiKeySection Component */}
      <div className="w-full">
        <ApiKeySection
          apiKey={userProfile?.apiKey}
          onApiKeyChange={(newKey) => onSaveProfile({ apiKey: newKey })}
        />
      </div>
    </div>
  );
};
