import React, { useEffect, useMemo, useState } from 'react';
import { LockKeyhole, LogIn, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

type GateState = 'signed-out' | 'checking' | 'allowed' | 'denied' | 'error';

type OfficeAccess = {
  uid: string;
  email: string | null;
  displayName: string | null;
  officeRole: 'ceo' | 'designer' | 'member';
  isOfficeAdmin: boolean;
};

const LEADSPAY_HOME = (import.meta as any).env?.VITE_LEADSPAY_URL || 'https://www.leadspay.com.br';

export const OfficeAuthGate: React.FC<React.PropsWithChildren> = ({ children }) => {
  const { currentUser, loading: authLoading, login, logout } = useAuth();
  const [gateState, setGateState] = useState<GateState>('checking');
  const [access, setAccess] = useState<OfficeAccess | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const roleLabel = useMemo(() => {
    if (!access) return '';
    if (access.isOfficeAdmin || access.officeRole === 'ceo') return 'CEO';
    if (access.officeRole === 'designer') return 'Designer';
    return 'Equipe';
  }, [access]);

  useEffect(() => {
    let cancelled = false;

    const validate = async () => {
      if (authLoading) return;
      if (!currentUser) {
        setAccess(null);
        setGateState('signed-out');
        return;
      }

      setGateState('checking');
      setMessage('');

      try {
        const token = await currentUser.getIdToken();
        const response = await fetch('/api/office/access', {
          method: 'GET',
          cache: 'no-store',
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json().catch(() => ({}));

        if (cancelled) return;

        if (response.ok && data.access) {
          setAccess(data.access as OfficeAccess);
          setGateState('allowed');
          return;
        }

        setAccess(null);
        setMessage(data.error || 'Esta conta não possui acesso ao LeadsPay Office.');
        setGateState(response.status === 401 || response.status === 403 ? 'denied' : 'error');
      } catch {
        if (cancelled) return;
        setAccess(null);
        setMessage('Não foi possível validar o acesso ao Office agora.');
        setGateState('error');
      }
    };

    void validate();
    return () => {
      cancelled = true;
    };
  }, [authLoading, currentUser?.uid]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !password || busy) return;

    setBusy(true);
    setMessage('');
    try {
      await login(email.trim(), password);
    } catch (error: any) {
      setMessage(error?.message || 'Não foi possível entrar no LeadsPay Office.');
      setGateState('signed-out');
    } finally {
      setBusy(false);
    }
  };

  const signOutOffice = async () => {
    setBusy(true);
    try {
      await logout();
    } finally {
      setBusy(false);
      setAccess(null);
      setGateState('signed-out');
    }
  };

  if (gateState === 'allowed' && access) {
    return (
      <>
        <div className="fixed right-3 top-3 z-[30000] rounded-full border border-white/10 bg-[#071019]/90 px-3 py-1.5 text-[10px] font-bold text-white/80 shadow-xl backdrop-blur">
          Office · {roleLabel}
        </div>
        {children}
      </>
    );
  }

  if (gateState === 'checking') {
    return (
      <div className="min-h-[100dvh] bg-[#071019] text-white grid place-items-center p-6">
        <div className="text-center">
          <ShieldCheck className="mx-auto mb-3 h-8 w-8 text-[#D9F22A]" />
          <strong className="block text-sm">Validando acesso ao Office…</strong>
          <span className="mt-1 block text-xs text-white/50">A sessão da LeadsPay não concede acesso ao HQ sozinha.</span>
        </div>
      </div>
    );
  }

  if (gateState === 'denied' || gateState === 'error') {
    return (
      <div className="min-h-[100dvh] bg-[#071019] text-white grid place-items-center p-6">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0b131d] p-7 shadow-2xl">
          <LockKeyhole className="mb-4 h-9 w-9 text-[#D9F22A]" />
          <h1 className="text-xl font-black">{gateState === 'denied' ? 'Acesso ao Office não autorizado' : 'Não foi possível validar o Office'}</h1>
          <p className="mt-2 text-sm text-white/60">{message}</p>
          <div className="mt-6 grid gap-2">
            <button type="button" onClick={() => void signOutOffice()} disabled={busy} className="rounded-xl bg-[#D9F22A] px-4 py-3 text-sm font-black text-[#071019]">
              Entrar com outra conta
            </button>
            <button type="button" onClick={() => window.location.assign(LEADSPAY_HOME)} className="rounded-xl border border-white/10 px-4 py-3 text-sm font-bold text-white/80">
              Voltar para LeadsPay
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#071019] text-white grid place-items-center p-6">
      <form onSubmit={submit} className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0b131d] p-7 shadow-2xl">
        <div className="mb-5 flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl border border-[#D9F22A]/30 bg-[#D9F22A]/10 text-[#D9F22A]">
            <span className="text-lg font-black">LP</span>
          </div>
          <div>
            <h1 className="text-xl font-black">LeadsPay Office</h1>
            <p className="text-xs text-white/50">Acesso separado e restrito à equipe autorizada.</p>
          </div>
        </div>

        <label className="mb-3 block">
          <span className="mb-1.5 block text-xs font-bold text-white/70">E-mail</span>
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            autoComplete="username"
            required
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-[#D9F22A]/50"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-bold text-white/70">Senha</span>
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            autoComplete="current-password"
            required
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-[#D9F22A]/50"
          />
        </label>

        {message && <p className="mt-3 rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-xs text-red-100">{message}</p>}

        <button type="submit" disabled={busy} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#D9F22A] px-4 py-3 text-sm font-black text-[#071019] disabled:opacity-60">
          <LogIn className="h-4 w-4" />
          {busy ? 'Entrando…' : 'Entrar no Office'}
        </button>

        <button type="button" onClick={() => window.location.assign(LEADSPAY_HOME)} className="mt-2 w-full rounded-xl border border-white/10 px-4 py-3 text-sm font-bold text-white/70">
          Voltar para LeadsPay
        </button>
      </form>
    </div>
  );
};
