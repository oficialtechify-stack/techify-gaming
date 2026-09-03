import React, { useState } from 'react';
import { UserSellerProfile, WithdrawalRequest } from '../../types/platform';
import { requestWithdrawalViaBackend } from '../../services/firestoreService';

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserSellerProfile;
  onWithdraw: (amount: number, pixKey: string, pixKeyType: string) => void;
}

export const WithdrawModal: React.FC<WithdrawModalProps> = ({
  isOpen,
  onClose,
  userProfile,
  onWithdraw
}) => {
  const availableBalance = userProfile?.availableBalance ?? 0;
  const [amount, setAmount] = useState<number>(availableBalance >= 50 ? Math.min(1000, availableBalance) : 50);
  const [pixKey, setPixKey] = useState<string>(userProfile?.pixKey || userProfile?.cpf || userProfile?.email || '');
  const [pixKeyType, setPixKeyType] = useState<string>(userProfile?.pixKeyType || 'CPF');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [completedWithdrawal, setCompletedWithdrawal] = useState<WithdrawalRequest | null>(null);

  if (!isOpen) return null;

  const feeAmount = 2.50; // Taxa de saque fixa Techify
  const netAmount = Math.max(0, amount - feeAmount);

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (amount < 50) {
      setErrorMessage('O valor mínimo para solicitação de saque via Pix é de R$ 50,00.');
      return;
    }

    if (amount > availableBalance) {
      setErrorMessage(`Saldo disponível insuficiente. Seu saldo é de R$ ${availableBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`);
      return;
    }

    if (!pixKey.trim()) {
      setErrorMessage('Por favor, informe a chave Pix do titular da conta.');
      return;
    }

    setIsProcessing(true);

    try {
      const result = await requestWithdrawalViaBackend(
        amount,
        pixKey.trim(),
        pixKeyType,
        userProfile?.userId || userProfile?.id || 'usr_techify_main',
        userProfile?.name || 'Usuário Techify'
      );

      if (result.success && result.withdrawal) {
        setCompletedWithdrawal(result.withdrawal);
        onWithdraw(amount, pixKey, pixKeyType);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao processar saque via Pix no servidor.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#080d1a] border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-white/50 hover:text-white transition-colors cursor-pointer w-8 h-8 rounded-full bg-white/5 flex items-center justify-center"
        >
          ✕
        </button>

        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#D9F22A] mb-1">
          <span className="w-2 h-2 rounded-full bg-[#D9F22A]" />
          Saque Instantâneo PIX Mercado Pago
        </div>

        <h3 className="text-xl sm:text-2xl font-black text-white font-['Syne'] mb-2">
          Solicitar Saque de Saldo
        </h3>

        {completedWithdrawal ? (
          <div className="py-6 flex flex-col items-center justify-center gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-[#D9F22A] text-[#060A15] flex items-center justify-center shadow-[0_0_30px_rgba(217,242,42,0.6)]">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <div>
              <h4 className="text-lg font-bold text-white">Transferência PIX Concluída!</h4>
              <p className="text-xs text-white/70 mt-1">
                O valor líquido de <strong className="text-[#D9F22A]">R$ {completedWithdrawal.netAmount?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong> foi transferido com sucesso.
              </p>
            </div>

            {/* Recibo Detalhado */}
            <div className="w-full bg-[#050811] border border-white/10 rounded-xl p-4 text-left space-y-2 text-xs">
              <div className="flex justify-between text-white/60">
                <span>Protocolo:</span>
                <span className="font-mono text-white font-bold">{completedWithdrawal.id}</span>
              </div>
              <div className="flex justify-between text-white/60">
                <span>Valor Solicitado:</span>
                <span className="text-white font-semibold">R$ {completedWithdrawal.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-white/60">
                <span>Taxa de Serviço PIX:</span>
                <span className="text-amber-400 font-semibold">- R$ {completedWithdrawal.feeAmount?.toFixed(2) || '2,50'}</span>
              </div>
              <div className="border-t border-white/10 pt-2 flex justify-between font-bold">
                <span className="text-white">Valor Transferido Líquido:</span>
                <span className="text-emerald-400">R$ {completedWithdrawal.netAmount?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-white/60 text-[11px] pt-1">
                <span>Chave PIX:</span>
                <span className="text-white font-mono">{completedWithdrawal.pixKey}</span>
              </div>
              {completedWithdrawal.endToEndId && (
                <div className="pt-1 text-[10px] text-white/40 font-mono break-all">
                  E2E: {completedWithdrawal.endToEndId}
                </div>
              )}
            </div>

            <button
              onClick={onClose}
              className="mt-2 w-full bg-[#D9F22A] hover:bg-[#c8e217] text-[#060A15] font-black py-3 px-6 rounded-full transition-all text-xs uppercase tracking-widest cursor-pointer shadow-[0_0_20px_rgba(217,242,42,0.3)]"
            >
              Fechar Comprovante
            </button>
          </div>
        ) : (
          <form onSubmit={handleWithdrawSubmit} className="flex flex-col gap-4 mt-3">
            {errorMessage && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 flex items-start gap-2">
                <span className="text-sm font-bold">⚠️</span>
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="p-4 rounded-xl bg-[#050811] border border-white/10 flex justify-between items-center">
              <div>
                <span className="text-xs text-white/60 block">Saldo Disponível para Saque:</span>
                <span className="text-[11px] text-white/40">Garantia de 9 dias já liberada</span>
              </div>
              <span className="text-lg font-black text-[#D9F22A]">
                R$ {availableBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-white/70">
                  Valor a Sacar (Mínimo R$ 50,00)
                </label>
                <span className="text-[10px] text-amber-400/90 font-medium">Taxa fixa: R$ 2,50</span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  min="50"
                  max={availableBalance}
                  step="1"
                  required
                  value={amount || ''}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  placeholder="50,00"
                  className="w-full bg-[#050811] border border-white/10 rounded-xl px-4 py-3 text-lg font-bold text-white focus:outline-none focus:border-[#D9F22A]"
                />
                <button
                  type="button"
                  onClick={() => setAmount(availableBalance)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] uppercase font-bold text-[#D9F22A] bg-[#D9F22A]/10 px-2.5 py-1 rounded cursor-pointer hover:bg-[#D9F22A]/20"
                >
                  Máximo
                </button>
              </div>
            </div>

            {/* Simulação de Valores e Taxa de R$ 2,50 */}
            <div className="bg-[#050811] border border-white/5 rounded-xl p-3 text-xs space-y-1.5">
              <div className="flex justify-between text-white/70">
                <span>Valor Solicitado (Débito da conta):</span>
                <span className="font-semibold text-white">R$ {amount > 0 ? amount.toFixed(2).replace('.', ',') : '0,00'}</span>
              </div>
              <div className="flex justify-between text-white/70">
                <span className="flex items-center gap-1">
                  Taxa de Saque Pix Techify:
                </span>
                <span className="font-semibold text-amber-400">- R$ 2,50</span>
              </div>
              <div className="border-t border-white/10 pt-1.5 flex justify-between font-bold text-white">
                <span>Valor Líquido a Receber via Pix:</span>
                <span className="text-emerald-400 font-mono text-sm">
                  R$ {netAmount > 0 ? netAmount.toFixed(2).replace('.', ',') : '0,00'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-white/70 mb-1">
                  Tipo Chave
                </label>
                <select
                  value={pixKeyType}
                  onChange={(e) => setPixKeyType(e.target.value)}
                  className="w-full bg-[#050811] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#D9F22A]"
                >
                  <option value="CPF">CPF</option>
                  <option value="CNPJ">CNPJ</option>
                  <option value="Email">E-mail</option>
                  <option value="Telefone">Telefone</option>
                  <option value="Aleatória">Aleatória</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-white/70 mb-1">
                  Chave PIX do Titular
                </label>
                <input
                  type="text"
                  required
                  placeholder="Digite sua chave Pix cadastrada"
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
                  className="w-full bg-[#050811] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#D9F22A]"
                />
              </div>
            </div>

            <div className="text-[11px] text-white/50 leading-relaxed bg-white/[0.02] p-3 rounded-lg border border-white/5 flex items-start gap-2">
              <span className="text-amber-400 text-xs">🛡️</span>
              <span>
                <strong>Regra de Segurança:</strong> Por conformidade e proteção contra fraudes, os saques só são autorizados para a chave Pix validada pertencente ao titular desta conta.
              </span>
            </div>

            <button
              type="submit"
              disabled={isProcessing || amount < 50 || amount > availableBalance}
              className="mt-2 w-full bg-[#D9F22A] disabled:opacity-50 hover:bg-[#c8e217] text-[#060A15] font-black py-3.5 px-6 rounded-full transition-all text-xs uppercase tracking-widest cursor-pointer shadow-[0_0_20px_rgba(217,242,42,0.3)] flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <span className="w-4 h-4 border-2 border-[#060A15] border-t-transparent rounded-full animate-spin" />
                  Processando Saque via Pix...
                </>
              ) : (
                <>Confirmar Saque Instantâneo (R$ {netAmount > 0 ? netAmount.toFixed(2).replace('.', ',') : '0,00'} líquido)</>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
