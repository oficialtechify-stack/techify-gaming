import React, { useCallback, useEffect, useState } from 'react';
import { ArrowUpRight, CheckCircle2, Clock3, CreditCard, Loader2, ShieldCheck } from 'lucide-react';
import { auth } from '../../lib/firebase';
import { UserRoleMode, UserSellerProfile } from '../../types/platform';

type StripeRole = 'empresa' | 'afiliado';

type Props = {
  roleMode: UserRoleMode;
  userProfile: UserSellerProfile;
};

export const StripeConnectPanel: React.FC<Props> = ({ roleMode, userProfile }) => {
  const role: StripeRole = roleMode === 'empresa' ? 'empresa' : 'afiliado';
  const [status, setStatus] = useState<'loading' | 'not_connected' | 'onboarding_incomplete' | 'connected' | 'error'>('loading');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const fetchStatus = useCallback(async () => {
    const token = await auth.currentUser?.getIdToken();
    if (!token) {
      setStatus('error');
      setMessage('Entre novamente na sua conta para consultar a Stripe.');
      return;
    }
    try {
      const response = await fetch(`/api/stripe/connect-status?role=${role}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Não foi possível consultar a conta Stripe.');
      setStatus(result.status);
      setMessage('');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Não foi possível consultar a conta Stripe.');
    }
  }, [role]);

  useEffect(() => { void fetchStatus(); }, [fetchStatus]);

  const startOnboarding = async () => {
    setBusy(true);
    setMessage('');
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Entre novamente na sua conta para continuar.');
      const response = await fetch('/api/stripe/onboarding', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      const result = await response.json();
      if (!response.ok || !result.url) throw new Error(result.error || 'Não foi possível abrir o cadastro Stripe.');
      window.location.assign(result.url);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Erro ao iniciar cadastro Stripe.');
      setBusy(false);
    }
  };

  const openExpress = async () => {
    setBusy(true);
    setMessage('');
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Entre novamente na sua conta para continuar.');
      const response = await fetch('/api/stripe/express-dashboard', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      const result = await response.json();
      if (!response.ok || !result.url) throw new Error(result.error || 'Não foi possível abrir o painel Stripe.');
      window.location.assign(result.url);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Erro ao abrir painel Stripe.');
      setBusy(false);
    }
  };

  const roleName = role === 'empresa' ? 'Empresa' : 'Afiliado';
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="stripe-connect-heading">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700"><CreditCard className="h-5 w-5" /></div>
          <div>
            <h2 id="stripe-connect-heading" className="text-base font-semibold text-slate-950">Recebimentos pela Stripe</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">Conecte a conta de recebimento da sua área de {roleName}. O cadastro e os dados bancários são preenchidos diretamente na Stripe.</p>
          </div>
        </div>
        <span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${status === 'connected' ? 'bg-slate-100 text-slate-800' : 'bg-slate-50 text-slate-600'}`} aria-live="polite">
          {status === 'connected' ? <CheckCircle2 className="h-3.5 w-3.5" /> : status === 'loading' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Clock3 className="h-3.5 w-3.5" />}
          {status === 'connected' ? 'Conectada' : status === 'loading' ? 'Verificando' : status === 'onboarding_incomplete' ? 'Cadastro pendente' : 'Não conectada'}
        </span>
      </div>
      <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
        <p className="flex gap-2"><ShieldCheck className="mt-1 h-4 w-4 shrink-0 text-slate-700" /><span>Os valores ficam sujeitos aos prazos, verificações e disponibilidade definidos pela Stripe. A confirmação de uma compra não significa que o saldo já pode ser sacado.</span></p>
      </div>
      {message && <p className="mt-3 text-sm text-rose-700" role="alert">{message}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        {status === 'connected' ? (
          <button type="button" onClick={() => void openExpress()} disabled={busy} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Abrir painel de recebimentos <ArrowUpRight className="h-4 w-4" />
          </button>
        ) : (
          <button type="button" onClick={() => void startOnboarding()} disabled={busy || status === 'loading'} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{status === 'onboarding_incomplete' ? 'Continuar cadastro Stripe' : 'Conectar conta Stripe'}<ArrowUpRight className="h-4 w-4" />
          </button>
        )}
        {status === 'error' && <button type="button" onClick={() => void fetchStatus()} className="min-h-10 rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50">Tentar novamente</button>}
      </div>
      <p className="mt-3 text-xs text-slate-500">Perfil: {userProfile.name || roleName} · área {roleName}</p>
    </section>
  );
};
