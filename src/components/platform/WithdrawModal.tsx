import React, { useState } from 'react';
import { UserSellerProfile, WithdrawalRequest } from '../../types/platform';

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
  const [amount, setAmount] = useState<number>(userProfile.availableBalance > 0 ? Math.min(10000, userProfile.availableBalance) : 0);
  const [pixKey, setPixKey] = useState<string>(userProfile.pixKey);
  const [pixKeyType, setPixKeyType] = useState<string>(userProfile.pixKeyType);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleWithdrawSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0 || amount > userProfile.availableBalance) return;

    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setSuccess(true);
      onWithdraw(amount, pixKey, pixKeyType);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1800);
    }, 1200);
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
          Saque Instantâneo PIX D+0
        </div>

        <h3 className="text-xl sm:text-2xl font-black text-white font-['Syne'] mb-2">
          Solicitar Saque de Comissões
        </h3>

        {success ? (
          <div className="py-8 flex flex-col items-center justify-center gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-[#D9F22A] text-[#060A15] flex items-center justify-center shadow-[0_0_30px_rgba(217,242,42,0.6)]">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <div>
              <h4 className="text-lg font-bold text-white">Saque Solicitado com Sucesso!</h4>
              <p className="text-xs text-white/70 mt-1">
                O valor de <strong className="text-[#D9F22A]">R$ {amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong> foi enviado para sua chave PIX.
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleWithdrawSubmit} className="flex flex-col gap-4 mt-4">
            <div className="p-4 rounded-xl bg-[#050811] border border-white/10 flex justify-between items-center">
              <span className="text-xs text-white/60">Saldo Disponível:</span>
              <span className="text-base font-black text-[#D9F22A]">
                R$ {userProfile.availableBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-1">
                Valor a Sacar (R$)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="50"
                  max={userProfile.availableBalance}
                  step="10"
                  required
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full bg-[#050811] border border-white/10 rounded-xl px-4 py-3 text-lg font-bold text-white focus:outline-none focus:border-[#D9F22A]"
                />
                <button
                  type="button"
                  onClick={() => setAmount(userProfile.availableBalance)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] uppercase font-bold text-[#D9F22A] bg-[#D9F22A]/10 px-2.5 py-1 rounded cursor-pointer hover:bg-[#D9F22A]/20"
                >
                  Máximo
                </button>
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
                  <option value="Aleatória">Aleatória</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-white/70 mb-1">
                  Chave PIX de Destino
                </label>
                <input
                  type="text"
                  required
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
                  className="w-full bg-[#050811] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#D9F22A]"
                />
              </div>
            </div>

            <div className="text-[11px] text-white/50 leading-relaxed bg-white/[0.02] p-3 rounded-lg border border-white/5">
              💡 Repasses via PIX pela Techify Gaming são processados automaticamente em até 10 minutos sem cobrança de taxas de saque.
            </div>

            <button
              type="submit"
              disabled={isProcessing || amount <= 0 || amount > userProfile.availableBalance}
              className="mt-2 w-full bg-[#D9F22A] disabled:opacity-50 hover:bg-[#c8e217] text-[#060A15] font-black py-3.5 px-6 rounded-full transition-all text-xs uppercase tracking-widest cursor-pointer shadow-[0_0_20px_rgba(217,242,42,0.3)] flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <span className="w-4 h-4 border-2 border-[#060A15] border-t-transparent rounded-full animate-spin" />
                  Processando Transferência...
                </>
              ) : (
                <>Confirmar Saque Instantâneo</>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
