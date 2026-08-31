import React from 'react';
import { UserSellerProfile, WithdrawalRequest } from '../../types/platform';
import { 
  DollarSign, 
  ArrowUpRight, 
  CheckCircle2, 
  Clock, 
  Wallet, 
  ShieldCheck, 
  Sparkles,
  Building2
} from 'lucide-react';

interface FinanceiroViewProps {
  userProfile: UserSellerProfile;
  withdrawals: WithdrawalRequest[];
  onOpenWithdraw: () => void;
}

export const FinanceiroView: React.FC<FinanceiroViewProps> = ({
  userProfile,
  withdrawals,
  onOpenWithdraw
}) => {
  return (
    <div className="flex flex-col gap-6" id="techify-financeiro-view">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-['Syne']">
            Financeiro & Repasses PIX
          </h1>
          <p className="text-xs text-white/60 mt-1">
            Acompanhe seus saldos disponíveis, comissões em processamento e histórico de saques.
          </p>
        </div>

        <button
          onClick={onOpenWithdraw}
          disabled={userProfile.availableBalance <= 0}
          className="bg-[#D9F22A] hover:bg-[#c8e217] disabled:opacity-40 text-[#060A15] font-black px-6 py-3 rounded-xl text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(217,242,42,0.35)] transition-all cursor-pointer flex items-center justify-center gap-2"
        >
          <ArrowUpRight className="w-4 h-4" />
          Solicitar Saque Instantâneo PIX
        </button>
      </div>

      {/* Financial Balances Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Available Balance */}
        <div className="bg-[#080d1a] border-l-4 border-l-[#D9F22A] border-y border-r border-white/10 rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between text-white/60 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Saldo Disponível para Saque</span>
            <div className="w-8 h-8 rounded-full bg-[#D9F22A]/10 flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-[#D9F22A]" />
            </div>
          </div>
          <div className="text-3xl font-black text-[#D9F22A] font-['Syne'] tracking-tight">
            R$ {userProfile.availableBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-white/50 block mt-2">
            Disponível via PIX imediato (sem taxa de TED)
          </span>
        </div>

        {/* Pending Balance */}
        <div className="bg-[#080d1a] border-l-4 border-l-yellow-500 border-y border-r border-white/10 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between text-white/60 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Saldo em Liquidação</span>
            <div className="w-8 h-8 rounded-full bg-yellow-500/10 flex items-center justify-center">
              <Clock className="w-4 h-4 text-yellow-400" />
            </div>
          </div>
          <div className="text-3xl font-black text-white font-['Syne'] tracking-tight">
            R$ {userProfile.pendingBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-white/50 block mt-2">
            Contratos em validação técnica e compensação bancária
          </span>
        </div>

        {/* Total Historical Earnings */}
        <div className="bg-[#080d1a] border-l-4 border-l-blue-500 border-y border-r border-white/10 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between text-white/60 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Já Faturado</span>
            <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Wallet className="w-4 h-4 text-blue-400" />
            </div>
          </div>
          <div className="text-3xl font-black text-white font-['Syne'] tracking-tight">
            R$ {userProfile.totalEarned.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-white/50 block mt-2">
            Acumulado histórico como Parceiro Techify
          </span>
        </div>
      </div>

      {/* Chave PIX Cadastrada & Políticas de Repasse */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 bg-[#080d1a] border border-white/10 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
            <h3 className="text-base font-bold text-white font-['Syne'] flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#D9F22A]" />
              Dados Bancários & Chave PIX Padrão
            </h3>
            <span className="text-[10px] text-[#D9F22A] font-bold bg-[#D9F22A]/10 px-2 py-0.5 rounded">
              VERIFICADA
            </span>
          </div>

          <div className="space-y-3 text-xs bg-[#050811] p-4 rounded-xl border border-white/10">
            <div className="flex justify-between">
              <span className="text-white/50">Titular da Conta:</span>
              <span className="font-bold text-white">{userProfile.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/50">Tipo de Chave:</span>
              <span className="font-bold text-white">{userProfile.pixKeyType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/50">Chave PIX:</span>
              <span className="font-bold text-[#D9F22A] font-mono">{userProfile.pixKey}</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-6 bg-[#080d1a] border border-white/10 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="w-5 h-5 text-[#D9F22A]" />
              <h3 className="text-base font-bold text-white font-['Syne']">
                Políticas de Segurança e Liquidação D+0
              </h3>
            </div>
            <p className="text-xs text-white/70 leading-relaxed">
              Todos os repasses aos parceiros são operados com redundância bancária pelo Banco Central do Brasil.
              Os saques solicitados são liberados em poucos minutos na sua conta PJ ou PF cadastrada.
            </p>
          </div>

          <div className="mt-4 p-3 rounded-lg bg-white/[0.02] border border-white/5 text-[11px] text-white/50 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#D9F22A] flex-shrink-0" />
            <span>Sem taxa de administração, sem mensalidades para vendedores e repasse de 100% da sua comissão.</span>
          </div>
        </div>
      </div>

      {/* Histórico de Saques */}
      <div className="bg-[#080d1a] border border-white/10 rounded-2xl p-6 shadow-xl">
        <h3 className="text-base font-bold text-white font-['Syne'] mb-4">
          Histórico Recente de Saques
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-white/40 bg-[#050811] border-b border-white/10 uppercase tracking-wider">
                <th className="py-3 px-4 font-bold">ID do Saque</th>
                <th className="py-3 px-4 font-bold">Data da Solicitação</th>
                <th className="py-3 px-4 font-bold">Chave de Destino</th>
                <th className="py-3 px-4 font-bold">Valor</th>
                <th className="py-3 px-4 font-bold text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {withdrawals.map((w) => (
                <tr key={w.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-white">{w.id}</td>
                  <td className="py-3.5 px-4 text-white/70">{w.requestedAt}</td>
                  <td className="py-3.5 px-4 font-mono text-white/80">{w.pixKey} ({w.pixKeyType})</td>
                  <td className="py-3.5 px-4 font-bold text-[#D9F22A]">
                    R$ {w.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      <CheckCircle2 className="w-3 h-3" />
                      {w.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
