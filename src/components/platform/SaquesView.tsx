import React, { useState } from 'react';
import { 
  ArrowUpRight, 
  DollarSign, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  ShieldCheck, 
  QrCode, 
  Copy, 
  Check, 
  Calendar, 
  Send,
  Zap,
  RefreshCw,
  Wallet
} from 'lucide-react';
import { UserSellerProfile, WithdrawalRequest } from '../../types/platform';
import { requestWithdrawalViaBackend } from '../../services/firestoreService';

interface SaquesViewProps {
  userProfile: UserSellerProfile;
  withdrawals?: WithdrawalRequest[];
  onWithdrawSuccess?: (amount: number, pixKey: string, pixKeyType: string) => void;
  onRefresh?: () => void;
}

export const SaquesView: React.FC<SaquesViewProps> = ({
  userProfile,
  withdrawals = [],
  onWithdrawSuccess,
  onRefresh
}) => {
  const availableBalance = Number(userProfile?.availableBalance ?? 0);
  const pendingBalance = Number(userProfile?.pendingBalance ?? 0);
  
  const [amount, setAmount] = useState<string>(availableBalance >= 50 ? '50.00' : '50.00');
  const [pixKey, setPixKey] = useState<string>(userProfile?.pixKey || userProfile?.cpf || userProfile?.email || '');
  const [pixKeyType, setPixKeyType] = useState<string>(userProfile?.pixKeyType || 'CPF');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const numAmount = parseFloat(amount.replace(',', '.')) || 0;
  const feeAmount = 2.50; // Taxa de saque fixa da LeadsPay
  const netAmount = Math.max(0, numAmount - feeAmount);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    // Validação de valor mínimo de saque de R$ 50,00
    if (numAmount < 50.00) {
      setErrorMessage('O valor mínimo para solicitação de saque na LeadsPay é de R$ 50,00.');
      return;
    }

    if (numAmount > availableBalance) {
      setErrorMessage(`Saldo disponível insuficiente. Seu saldo disponível é de R$ ${availableBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`);
      return;
    }

    if (!pixKey.trim()) {
      setErrorMessage('Por favor, informe a chave PIX de destino.');
      return;
    }

    setIsProcessing(true);
    try {
      const result = await requestWithdrawalViaBackend(
        numAmount,
        pixKey.trim(),
        pixKeyType,
        userProfile?.userId || userProfile?.id || 'usr_leadspay_main',
        userProfile?.name || 'Titular da Conta'
      );

      if (result.success) {
        setSuccessMessage(`Saque de R$ ${numAmount.toFixed(2)} solicitado com sucesso! O valor líquido de R$ ${netAmount.toFixed(2)} será transferido para a sua chave PIX.`);
        if (onWithdrawSuccess) {
          onWithdrawSuccess(numAmount, pixKey, pixKeyType);
        }
        if (onRefresh) onRefresh();
      } else {
        setErrorMessage(result.message || 'Erro ao processar transferência.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao comunicar com o servidor financeiro.');
    } finally {
      setIsProcessing(false);
    }
  };

  const totalWithdrawn = withdrawals
    .filter(w => w.status === 'Aprovado' || (w as any).status === 'COMPLETED')
    .reduce((acc, w) => acc + (w.amount || 0), 0);

  return (
    <div className="space-y-6 animate-fadeIn" id="leadspay-saques-view">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#D9F22A] mb-1">
            <ArrowUpRight className="w-4 h-4" />
            Transferências PIX & Liquidação
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-['Syne']">
            Módulo de Saques
          </h1>
          <p className="text-xs text-white/60 mt-1 max-w-xl">
            Transfira seus lucros acumulados diretamente para sua chave PIX bancária com liquidação instantânea.
          </p>
        </div>

        {onRefresh && (
          <button
            onClick={onRefresh}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Atualizar Saldos
          </button>
        )}
      </div>

      {/* Financial Balances Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Available Balance */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-[#0a1410] to-[#080d1a] border border-emerald-500/30 relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
              Saldo Disponível para Saque
            </span>
            <Wallet className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-emerald-400 font-['Syne']">
            R$ {availableBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-white/50 block mt-2">
            Pronto para resgate imediato via PIX
          </span>
        </div>

        {/* Pending Balance */}
        <div className="p-5 rounded-2xl bg-[#080d1a] border border-white/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-white/50">
              Saldo a Liberar (Pendente)
            </span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-black text-white font-['Syne']">
            R$ {pendingBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-white/40 block mt-2">
            Vendas em período de liquidação D+9
          </span>
        </div>

        {/* Total Withdrawn */}
        <div className="p-5 rounded-2xl bg-[#080d1a] border border-white/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-white/50">
              Total Já Sacado
            </span>
            <CheckCircle2 className="w-4 h-4 text-[#D9F22A]" />
          </div>
          <div className="text-3xl font-black text-[#D9F22A] font-['Syne']">
            R$ {totalWithdrawn.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-white/40 block mt-2">
            Transferências concluídas com sucesso
          </span>
        </div>
      </div>

      {/* Main Form & Rules Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Withdrawal Form */}
        <div className="lg:col-span-2 bg-[#080d1a] border border-white/10 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center gap-2 mb-4 pb-4 border-b border-white/5">
            <Zap className="w-4 h-4 text-[#D9F22A]" />
            <h2 className="text-base font-bold text-white font-['Syne']">
              Nova Solicitação de Saque PIX
            </h2>
          </div>

          {errorMessage && (
            <div className="p-3.5 mb-5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 mb-5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleWithdrawSubmit} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-white/70">
                  Valor a Sacar (R$) *
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-[#D9F22A] font-bold">
                    Mínimo: R$ 50,00
                  </span>
                  {availableBalance >= 50 && (
                    <button
                      type="button"
                      onClick={() => setAmount(availableBalance.toFixed(2))}
                      className="text-[11px] text-emerald-400 hover:underline cursor-pointer"
                    >
                      Sacar Máximo
                    </button>
                  )}
                </div>
              </div>

              <input
                type="number"
                step="0.01"
                min="50.00"
                required
                placeholder="50.00"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  const v = parseFloat(e.target.value) || 0;
                  if (v > 0 && v < 50.00) {
                    setErrorMessage('O valor mínimo para solicitação de saque na LeadsPay é de R$ 50,00.');
                  } else {
                    setErrorMessage('');
                  }
                }}
                className="w-full bg-[#050811] border border-white/15 rounded-xl px-4 py-3 text-sm text-white font-bold font-mono focus:outline-none focus:border-[#D9F22A]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-white/70 block mb-1.5">
                  Tipo de Chave PIX *
                </label>
                <select
                  value={pixKeyType}
                  onChange={(e) => setPixKeyType(e.target.value)}
                  className="w-full bg-[#050811] border border-white/15 rounded-xl px-3 py-3 text-xs text-white focus:outline-none focus:border-[#D9F22A]"
                >
                  <option value="CPF">CPF</option>
                  <option value="CNPJ">CNPJ</option>
                  <option value="EMAIL">E-mail</option>
                  <option value="PHONE">Celular</option>
                  <option value="EVP">Chave Aleatória (EVP)</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-white/70 block mb-1.5">
                  Chave PIX de Destino *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Informe a sua chave Pix correspondente"
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
                  className="w-full bg-[#050811] border border-white/15 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#D9F22A]"
                />
              </div>
            </div>

            {/* Financial calculation breakdown */}
            <div className="p-4 rounded-2xl bg-[#050811] border border-white/5 space-y-2 text-xs">
              <div className="flex justify-between text-white/60">
                <span>Valor Solicitado:</span>
                <span className="font-mono font-bold text-white">R$ {numAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-white/60">
                <span>Taxa de Transferência Fixa:</span>
                <span className="font-mono text-white/60">R$ {feeAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-white/5">
                <span className="font-bold text-white">Valor Líquido a Receber:</span>
                <span className="font-mono font-black text-emerald-400 text-sm">
                  R$ {netAmount.toFixed(2)}
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isProcessing || availableBalance < 50 || numAmount < 50}
              className="w-full py-3.5 px-6 rounded-xl bg-[#D9F22A] hover:bg-[#cbe327] disabled:opacity-40 disabled:cursor-not-allowed text-[#060A15] font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(217,242,42,0.2)] cursor-pointer flex items-center justify-center gap-2"
              id="btn-submit-withdrawal"
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-[#060A15] border-t-transparent rounded-full animate-spin" />
                  Processando Transferência...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 stroke-[2.5]" />
                  Solicitar Transferência Imediata
                </>
              )}
            </button>
          </form>
        </div>

        {/* Withdrawal Rules Card */}
        <div className="bg-[#080d1a] border border-white/10 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-white/5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white font-['Syne']">
              Regras e Diretrizes de Saque
            </h3>
          </div>

          <ul className="space-y-3 text-xs text-white/60 leading-relaxed">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D9F22A] mt-1.5 flex-shrink-0" />
              <div>
                <strong className="text-white">Valor Mínimo:</strong> O valor mínimo exigido para qualquer saque é de <strong>R$ 50,00</strong>.
              </div>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D9F22A] mt-1.5 flex-shrink-0" />
              <div>
                <strong className="text-white">Taxa Fixa:</strong> Cobrada uma taxa operacional de R$ 2,50 por transferência bancária PIX.
              </div>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D9F22A] mt-1.5 flex-shrink-0" />
              <div>
                <strong className="text-white">Titularidade:</strong> A chave PIX deve pertencer ao mesmo CPF/CNPJ titular da conta para evitar recusas na compensação bancária.
              </div>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D9F22A] mt-1.5 flex-shrink-0" />
              <div>
                <strong className="text-white">Prazo de Compensação:</strong> Saques solicitados em dias úteis são liquidados via PIX em até 60 minutos.
              </div>
            </li>
          </ul>
        </div>
      </div>

      {/* Withdrawals History Table */}
      <div className="bg-[#080d1a] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white font-['Syne']">
              Histórico de Transferências & Saques
            </h3>
            <span className="text-[11px] text-white/40">
              Extrato completo de solicitações e comprovantes
            </span>
          </div>
          <span className="text-xs text-white/50 font-mono">
            {withdrawals.length} transferência(s)
          </span>
        </div>

        {withdrawals.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 mb-3">
              <ArrowUpRight className="w-6 h-6 text-[#D9F22A]/60" />
            </div>
            <h4 className="text-sm font-bold text-white">Nenhum saque realizado ainda</h4>
            <p className="text-xs text-white/50 max-w-sm mt-1">
              Assim que você solicitar seu primeiro resgate de comissões ou vendas, o registro completo com recibo aparecerá aqui.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[700px]">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02] text-white/50 uppercase tracking-wider font-bold">
                  <th className="p-4">ID do Saque</th>
                  <th className="p-4">Chave PIX / Destino</th>
                  <th className="p-4">Valor Bruto</th>
                  <th className="p-4">Taxa / Líquido</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Data da Solicitação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {withdrawals.map((item) => {
                  const isApproved = item.status === 'Aprovado' || (item as any).status === 'COMPLETED';
                  const isPending = item.status === 'Pendente' || (item as any).status === 'PROCESSING';

                  return (
                    <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-4 font-mono text-[11px] text-white/60">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate max-w-[120px]">{item.id}</span>
                          <button
                            onClick={() => handleCopy(item.id, item.id)}
                            className="text-white/40 hover:text-[#D9F22A] p-1"
                            title="Copiar ID"
                          >
                            {copiedId === item.id ? <Check className="w-3.5 h-3.5 text-[#D9F22A]" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="font-bold text-white font-mono">{item.pixKey}</div>
                        <span className="text-[10px] text-white/40 uppercase font-mono">
                          {item.pixKeyType || 'PIX'}
                        </span>
                      </td>

                      <td className="p-4 font-black text-white font-mono text-sm">
                        R$ {Number(item.amount).toFixed(2)}
                      </td>

                      <td className="p-4">
                        <div className="text-emerald-400 font-bold font-mono">
                          R$ {Number(item.netAmount || (item.amount - 2.50)).toFixed(2)}
                        </div>
                        <span className="text-[10px] text-white/40 font-mono">
                          Taxa: R$ 2,50
                        </span>
                      </td>

                      <td className="p-4">
                        {isApproved ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" />
                            Aprovado
                          </span>
                        ) : isPending ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            <Clock className="w-3 h-3" />
                            Processando
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20">
                            <XCircle className="w-3 h-3" />
                            Rejeitado
                          </span>
                        )}
                      </td>

                      <td className="p-4 text-white/60 font-mono text-[11px]">
                        <div>{item.requestedAt ? new Date(item.requestedAt).toLocaleDateString('pt-BR') : '-'}</div>
                        <div className="text-[10px] text-white/40">
                          {item.requestedAt ? new Date(item.requestedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
