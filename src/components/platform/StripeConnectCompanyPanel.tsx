import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, CreditCard, ExternalLink, Loader2, RefreshCw, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

type ConnectStatus =
  | 'loading'
  | 'not_connected'
  | 'onboarding_incomplete'
  | 'action_required'
  | 'pending_verification'
  | 'connected'
  | 'error';

export const StripeConnectCompanyPanel: React.FC<{ companyId?: string }> = ({ companyId }) => {
  const { currentUser } = useAuth();
  const [status, setStatus] = useState<ConnectStatus>('loading');
  const [message, setMessage] = useState('');
  const [requirementMessage, setRequirementMessage] = useState('');
  const [starting, setStarting] = useState(false);

  const loadStatus = useCallback(async () => {
    if (!currentUser || !companyId) {
      setStatus('not_connected');
      return;
    }

    setStatus('loading');
    setMessage('');
    setRequirementMessage('');
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch('/api/stripe/connect-status?role=empresa', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Não foi possível consultar a Stripe.');
      setStatus(data.status || 'not_connected');

      const errors = Array.isArray(data.requirements?.errors) ? data.requirements.errors : [];
      const due = Array.isArray(data.requirements?.currentlyDue) ? data.requirements.currentlyDue : [];
      const pastDue = Array.isArray(data.requirements?.pastDue) ? data.requirements.pastDue : [];

      const addressVerificationFailed = errors.some((item: any) =>
        /address|reside|residential|endereço|resid/i.test(
          `${item?.reason || ''} ${item?.requirement || ''}`
        )
      );

      if (addressVerificationFailed) {
        setRequirementMessage(
          'A Stripe não conseguiu verificar o endereço informado. Corrija o endereço residencial ou envie o comprovante solicitado pela Stripe.'
        );
      } else if (errors[0]?.reason) {
        setRequirementMessage(String(errors[0].reason));
      } else if (due.length > 0 || pastDue.length > 0) {
        setRequirementMessage(
          'A Stripe ainda precisa de informações adicionais para liberar recebimentos e saques.'
        );
      } else if (data.status === 'pending_verification') {
        setRequirementMessage(
          'Os dados foram enviados e estão em análise pela Stripe. Nenhuma ação é necessária agora.'
        );
      }
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Não foi possível consultar a Stripe.');
    }
  }, [currentUser, companyId]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const startOnboarding = async () => {
    if (!currentUser || !companyId || starting) return;
    setStarting(true);
    setMessage('');

    try {
      const token = await currentUser.getIdToken();
      const response = await fetch('/api/stripe/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: 'empresa' }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.url) throw new Error(data.error || 'Não foi possível iniciar a configuração Stripe.');
      window.location.assign(String(data.url));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível abrir a Stripe.');
      setStarting(false);
    }
  };

  return (
    <section className="mb-6 rounded-2xl border border-white/10 bg-[#0A1220] p-5 shadow-lg">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#D9F22A]/25 bg-[#D9F22A]/10 text-[#D9F22A]">
            <CreditCard className="h-5 w-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-black text-white">Conta bancária para receber saques</h3>
              {status === 'pending_verification' && (
            <div className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-sky-500/20 bg-sky-500/10 px-4 text-xs font-bold text-sky-300">
              <Loader2 className="h-4 w-4 animate-spin" />
              Em análise pela Stripe
            </div>
          )}

          {status === 'connected' && (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-400">
                  <CheckCircle2 className="h-3 w-3" />
                  Stripe conectada
                </span>
              )}
            </div>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-white/50">
              A Stripe é usada apenas para validar a empresa e encaminhar saques ao banco cadastrado. O dinheiro das vendas permanece na LeadsPay durante o prazo de liberação.
            </p>
            {status === 'connected' && (
              <p className="mt-2 text-[11px] text-emerald-300/80">
                Conta bancária configurada. O saldo só é enviado à Stripe depois que estiver disponível na LeadsPay e você solicitar o saque aqui.
              </p>
            )}
            {(status === 'onboarding_incomplete' || status === 'action_required') && (
              <p className="mt-2 text-[11px] text-amber-300/90">
                {requirementMessage || 'A conta Stripe foi criada, mas ainda faltam dados obrigatórios para liberar recebimentos.'}
              </p>
            )}
            {status === 'pending_verification' && (
              <p className="mt-2 text-[11px] text-sky-300/90">
                {requirementMessage || 'Os dados foram enviados e estão em análise pela Stripe.'}
              </p>
            )}
            {status === 'not_connected' && (
              <p className="mt-2 text-[11px] text-white/40">
                Configure seus dados bancários pela Stripe. Isso não libera nem transfere o saldo das vendas antecipadamente.
              </p>
            )}
            {message && <p className="mt-2 text-[11px] text-red-400">{message}</p>}
          </div>
        </div>

        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={loadStatus}
            disabled={status === 'loading'}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-bold text-white/70 transition hover:bg-white/10 disabled:opacity-40"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${status === 'loading' ? 'animate-spin' : ''}`} />
            Atualizar
          </button>

          {status !== 'connected' && status !== 'pending_verification' && (
            <button
              type="button"
              onClick={startOnboarding}
              disabled={starting || status === 'loading' || !companyId}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#D9F22A] px-4 text-xs font-black text-[#07100A] transition hover:bg-[#cde71f] disabled:opacity-40"
            >
              {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
              {status === 'action_required'
                ? 'Corrigir dados na Stripe'
                : status === 'onboarding_incomplete'
                  ? 'Continuar configuração bancária'
                  : 'Configurar recebimentos'}
            </button>
          )}

          {status === 'connected' && (
            <div className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 text-xs font-bold text-emerald-400">
              <ShieldCheck className="h-4 w-4" />
              Conta configurada
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
