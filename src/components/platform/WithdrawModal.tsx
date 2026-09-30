import React, { useState } from 'react';
import { X, Wallet, ShieldCheck, ExternalLink, AlertCircle, ArrowUpRight } from 'lucide-react';
import { UserSellerProfile } from '../../types/platform';

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile?: UserSellerProfile;
  onWithdraw?: (amount: number, pixKey: string, pixKeyType: string) => Promise<void>;
}

export const WithdrawModal: React.FC<WithdrawModalProps> = ({
  isOpen,
  onClose,
  userProfile,
  onWithdraw,
}) => {
  const [amount, setAmount] = useState<string>('50.00');
  const [pixKey, setPixKey] = useState<string>(userProfile?.pixKey || userProfile?.cpf || '');
  const [pixKeyType, setPixKeyType] = useState<string>(userProfile?.pixKeyType || 'CPF');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const available = Number(userProfile?.availableBalance ?? 0);
  const numAmount = parseFloat(amount.replace(',', '.')) || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (numAmount < 10) {
      setError('O valor mínimo para solicitação de saque é de R$ 10,00.');
      return;
    }
    if (numAmount > available) {
      setError('Saldo disponível insuficiente.');
      return;
    }
    setLoading(true);
    try {
      if (onWithdraw) {
        await onWithdraw(numAmount, pixKey, pixKeyType);
      }
      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
      }, 1500);
    } catch (err: any) {
      setError(err?.message || 'Erro ao processar saque.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-md bg-[#0a0f1d] border border-white/10 rounded-2xl p-6 shadow-2xl text-white">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-[#D9F22A]/10 border border-[#D9F22A]/20 flex items-center justify-center text-[#D9F22A]">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold">Solicitar Saque</h3>
            <p className="text-xs text-white/50">Repasse para sua conta bancária</p>
          </div>
        </div>

        <div className="bg-white/[0.03] border border-white/5 rounded-xl p-3.5 mb-5 flex items-center justify-between">
          <span className="text-xs text-white/60">Saldo Disponível:</span>
          <span className="text-sm font-black text-[#D9F22A]">
            R$ {available.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>Solicitação de saque efetuada com sucesso!</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-white/70 mb-1.5">
              Valor do Saque (R$)
            </label>
            <input
              type="number"
              step="0.01"
              min="10"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#D9F22A]"
              placeholder="0,00"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/70 mb-1.5">
              Tipo de Chave
            </label>
            <select
              value={pixKeyType}
              onChange={(e) => setPixKeyType(e.target.value)}
              className="w-full bg-[#0d1424] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#D9F22A]"
            >
              <option value="CPF">CPF</option>
              <option value="CNPJ">CNPJ</option>
              <option value="EMAIL">E-mail</option>
              <option value="TELEFONE">Telefone</option>
              <option value="ALEATORIA">Chave Aleatória</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/70 mb-1.5">
              Chave de Destino
            </label>
            <input
              type="text"
              value={pixKey}
              onChange={(e) => setPixKey(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#D9F22A]"
              placeholder="Digite sua chave"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-[#D9F22A] hover:bg-[#c8e220] text-[#060A15] font-black text-xs uppercase tracking-wider py-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Processando...' : 'Confirmar Saque'}
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
