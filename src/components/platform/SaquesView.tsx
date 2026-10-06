import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowUpRight, CheckCircle2, Clock, RefreshCw, Send, ShieldCheck, Wallet } from 'lucide-react';
import { UserRoleMode, UserSellerProfile, WithdrawalRequest } from '../../types/platform';
import { useAuth } from '../../context/AuthContext';

interface SaquesViewProps {
  userProfile: UserSellerProfile;
  roleMode: UserRoleMode;
  withdrawals?: WithdrawalRequest[];
  onWithdraw: (amount: number) => Promise<void>;
  onRefresh?: () => void;
}

const money = (value: number) =>
  Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const SaquesView: React.FC<SaquesViewProps> = ({
  userProfile,
  roleMode,
  withdrawals = [],
  onWithdraw,
  onRefresh,
}) => {
  const { currentUser } = useAuth();
  const role = roleMode === 'empresa' ? 'empresa' : 'afiliado';
  const pendingCents = role === 'empresa'
    ? userProfile.empresaPendingBalanceCents
    : userProfile.afiliadoPendingBalanceCents;
  const profilePendingBalance = Number.isFinite(Number(pendingCents)) ? Number(pendingCents) / 100 : 0;

  const [releasePendingCents, setReleasePendingCents] = useState<number | null>(null);
  const [releaseAvailableCents, setReleaseAvailableCents] = useState<number | null>(null);
  const [nextReleaseAt, setNextReleaseAt] = useState<string | null>(null);
  const [releasePolicyDays, setReleasePolicyDays] = useState<number>(10);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [amount, setAmount] = useState('10.00');
  const [processing, setProcessing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const roleWithdrawals = useMemo(
    () => withdrawals.filter((item) => item.role === role),
    [withdrawals, role],
  );
  const availableBalance = releaseAvailableCents !== null ? releaseAvailableCents / 100 : 0;
  const pendingBalance = releasePendingCents !== null ? releasePendingCents / 100 : profilePendingBalance;
  const value = Number(String(amount).replace(',', '.')) || 0;
  const fee = 2;
  const net = Math.max(0, value - fee);

  const totalWithdrawn = useMemo(
    () => roleWithdrawals
      .filter((w) => ['COMPLETED', 'concluido', 'Concluído'].includes(String(w.status)))
      .reduce((sum, w) => sum + Number(w.amount || 0), 0),
    [roleWithdrawals],
  );

  const loadReleases = useCallback(async () => {
    if (!currentUser || roleMode === 'admin') return;
    setLoadingBalance(true);
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch(`/api/balance/releases?role=${encodeURIComponent(role)}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Não foi possível carregar as liberações.');
      const nextAvailable = Number.isFinite(Number(data.availableAmountCents)) ? Number(data.availableAmountCents) : 0;
      setReleasePendingCents(Number.isFinite(Number(data.pendingAmountCents)) ? Number(data.pendingAmountCents) : 0);
      setReleaseAvailableCents(nextAvailable);
      setNextReleaseAt(data.nextReleaseAt || null);
      setReleasePolicyDays(Number.isFinite(Number(data.policyDays)) ? Number(data.policyDays) : 10);
      setAmount((current) => {
        const currentValue = Number(String(current).replace(',', '.')) || 0;
        const max = nextAvailable / 100;
        if (max < 10) return '10.00';
        if (currentValue > max || currentValue < 10) return Math.min(50, max).toFixed(2);
        return current;
      });
    } catch (error) {
      setReleasePendingCents(0);
      setReleaseAvailableCents(0);
      console.warn('[Withdraw releases]', error);
    } finally {
      setLoadingBalance(false);
    }
  }, [currentUser?.uid, role, roleMode]);

  useEffect(() => {
    void loadReleases();
  }, [loadReleases]);

  const nextReleaseLabel = nextReleaseAt
    ? `Próxima liberação em ${new Date(nextReleaseAt).toLocaleDateString('pt-BR')}`
    : pendingBalance > 0
      ? `Prazo de liberação: até ${releasePolicyDays} dias`
      : 'Nenhum saldo aguardando liberação';

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFeedback(null);
    if (roleMode === 'admin') {
      setFeedback({ type: 'error', text: 'Selecione Empresa ou Afiliado para movimentar um saldo.' });
      return;
    }
    if (value < 10) {
      setFeedback({ type: 'error', text: 'O valor mínimo de saque é R$ 10,00.' });
      return;
    }
    if (value > availableBalance) {
      setFeedback({ type: 'error', text: 'Saldo disponível insuficiente.' });
      return;
    }

    setProcessing(true);
    try {
      await onWithdraw(value);
      await loadReleases();
      onRefresh?.();
      setFeedback({
        type: 'success',
        text: `Saque solicitado. Valor líquido: R$ ${money(net)}. A Stripe encaminhará para a conta bancária cadastrada.`,
      });
    } catch (error: any) {
      setFeedback({ type: 'error', text: error?.message || 'Não foi possível solicitar o saque.' });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col justify-between gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-center">
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#D9F22A]">
            <ArrowUpRight className="h-4 w-4" />
            Stripe Connect
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-['Syne']">Saques & Transferências</h1>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-white/60">
            Você pode solicitar saque quando houver saldo realmente liberado na LeadsPay. Cada venda segue o prazo de 10 dias antes de entrar no saldo disponível. Saque mínimo de R$ 10,00 e taxa fixa de R$ 2,00.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadReleases()}
          disabled={loadingBalance}
          className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-white hover:bg-white/10 disabled:opacity-40"
        >
          <RefreshCw className={`h-3.5 w-3.5 text-[#D9F22A] ${loadingBalance ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-emerald-500/30 bg-[#07120f] p-5">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase text-emerald-400">
            <span>Disponível</span>
            <Wallet className="h-4 w-4" />
          </div>
          <div className="mt-2 text-3xl font-black text-emerald-400">R$ {money(availableBalance)}</div>
          <div className="mt-2 text-[11px] text-white/45">
            {availableBalance >= 10 ? 'Pode ser solicitado agora.' : 'Saque liberado a partir de R$ 10,00.'}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#080d1a] p-5">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase text-white/50">
            <span>A liberar</span>
            <Clock className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-2 text-3xl font-black text-white">R$ {money(pendingBalance)}</div>
          <div className="mt-2 text-[11px] text-white/45">{nextReleaseLabel}</div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#080d1a] p-5">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase text-white/50">
            <span>Total concluído neste perfil</span>
            <CheckCircle2 className="h-4 w-4 text-[#D9F22A]" />
          </div>
          <div className="mt-2 text-3xl font-black text-[#D9F22A]">R$ {money(totalWithdrawn)}</div>
          <div className="mt-2 text-[11px] text-white/45">
            Histórico separado entre Empresa e Afiliado.
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <form onSubmit={submit} className="rounded-2xl border border-white/10 bg-[#080d1a] p-6 lg:col-span-2">
          <h2 className="mb-4 text-base font-bold text-white">Nova solicitação</h2>
          {feedback && (
            <div className={`mb-4 flex gap-2 rounded-xl border p-3 text-xs ${
              feedback.type === 'error'
                ? 'border-red-500/20 bg-red-500/10 text-red-400'
                : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
            }`}>
              {feedback.type === 'error' ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
              <span>{feedback.text}</span>
            </div>
          )}

          <label className="text-xs font-bold text-white/70">Valor do saque</label>
          <div className="mt-2 flex gap-2">
            <input
              type="number"
              min="10"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="flex-1 rounded-xl border border-white/15 bg-[#050811] px-4 py-3 font-mono text-white focus:border-[#D9F22A] focus:outline-none"
            />
            <button
              type="button"
              disabled={availableBalance < 10}
              onClick={() => setAmount(availableBalance.toFixed(2))}
              className="rounded-xl border border-white/10 px-4 text-xs font-bold text-white/70 disabled:opacity-40"
            >
              Máximo
            </button>
          </div>

          <div className="mt-4 space-y-2 rounded-xl border border-white/5 bg-[#050811] p-4 text-xs">
            <div className="flex justify-between text-white/60"><span>Solicitado</span><span>R$ {money(value)}</span></div>
            <div className="flex justify-between text-white/60"><span>Taxa fixa</span><span>R$ 2,00</span></div>
            <div className="flex justify-between border-t border-white/5 pt-2 font-bold text-white">
              <span>Líquido</span><span className="text-emerald-400">R$ {money(net)}</span>
            </div>
          </div>

          <button
            disabled={processing || availableBalance < 10}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#D9F22A] py-3.5 text-xs font-black uppercase text-[#060A15] disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
            {processing ? 'Processando...' : 'Solicitar saque'}
          </button>
        </form>

        <div className="rounded-2xl border border-white/10 bg-[#080d1a] p-5">
          <ShieldCheck className="mb-3 h-5 w-5 text-[#D9F22A]" />
          <h3 className="text-sm font-bold text-white">Destino bancário seguro</h3>
          <p className="mt-2 text-xs leading-relaxed text-white/55">
            Os dados bancários ficam na Stripe Connect. A LeadsPay usa somente a conta Stripe vinculada a este perfil e não aceita um destino arbitrário enviado pelo navegador.
          </p>
          <p className="mt-4 text-[11px] text-white/40">O prazo final no banco depende do payout e da conta conectada.</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#080d1a]">
        <div className="border-b border-white/10 p-4 text-sm font-bold text-white">Histórico deste perfil</div>
        <div className="divide-y divide-white/5">
          {roleWithdrawals.length === 0 && <div className="p-6 text-center text-xs text-white/40">Nenhum saque solicitado neste perfil.</div>}
          {roleWithdrawals.slice(0, 20).map((w) => (
            <div key={w.id} className="flex items-center justify-between gap-4 p-4">
              <div>
                <div className="text-xs font-bold text-white">R$ {money(Number(w.amount || w.requestedAmount || 0))}</div>
                <div className="text-[10px] text-white/40">
                  {w.requestedAt || w.createdAt ? new Date(w.requestedAt || w.createdAt || '').toLocaleString('pt-BR') : ''}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-bold uppercase text-[#D9F22A]">{String(w.status || 'PROCESSING').replace(/_/g, ' ')}</div>
                {w.stripePayoutId && <div className="text-[9px] font-mono text-white/35">{w.stripePayoutId}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
