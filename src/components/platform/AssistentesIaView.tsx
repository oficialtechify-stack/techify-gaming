import React from 'react';
import { Bot, CheckCircle2, Code2, Radio, ShieldCheck } from 'lucide-react';
import { ApiKeySection } from './ApiKeySection';
import { UserProfile, UserRoleMode } from '../../types/platform';

interface AssistentesIaViewProps {
  userProfile?: UserProfile | null;
  onSaveProfile: (data: Partial<UserProfile>) => Promise<void>;
  roleMode?: UserRoleMode;
}

export const AssistentesIaView: React.FC<AssistentesIaViewProps> = ({
  userProfile,
  roleMode = 'afiliado'
}) => {
  return (
    <div className="flex flex-col gap-6 text-white min-w-0" id="leadspay-assistentes-ia-view">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#D9F22A]/10 border border-[#D9F22A]/30 flex items-center justify-center text-[#D9F22A] shadow-[0_0_15px_rgba(217,242,42,0.15)]">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white font-['Syne'] tracking-tight">Assistentes de IA & MCP</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Produção
              </span>
            </div>
            <p className="text-xs sm:text-sm text-gray-400 mt-0.5">API segura para GPT Actions e servidor MCP remoto conectado à sua conta LeadsPay.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.05] p-4">
          <ShieldCheck className="w-4 h-4 text-emerald-400 mb-2" />
          <div className="text-xs font-bold text-white">Chaves protegidas</div>
          <p className="text-[11px] text-white/50 mt-1">Geradas no servidor e armazenadas somente como hash.</p>
        </div>
        <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/[0.04] p-4">
          <Radio className="w-4 h-4 text-cyan-400 mb-2" />
          <div className="text-xs font-bold text-white">MCP remoto</div>
          <p className="text-[11px] text-white/50 mt-1">Saldo, produtos, afiliações, cupons e checkout usando dados reais.</p>
        </div>
        <div className="rounded-xl border border-[#D9F22A]/20 bg-[#D9F22A]/[0.04] p-4">
          <Code2 className="w-4 h-4 text-[#D9F22A] mb-2" />
          <div className="text-xs font-bold text-white">OpenAPI 3.1</div>
          <p className="text-[11px] text-white/50 mt-1">Schema pronto para Actions e agentes compatíveis com OpenAPI.</p>
        </div>
      </div>

      <ApiKeySection apiKey={userProfile?.apiKey} roleMode={roleMode} />
    </div>
  );
};
