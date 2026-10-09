import React, { useMemo, useState } from 'react';
import { MailCheck, ShieldCheck, Smartphone, CheckCircle2, AlertCircle, LockKeyhole, XCircle } from 'lucide-react';
import { auth } from '../../lib/firebase';
import {
  completeSmsMfaEnrollment,
  disableSmsMfa,
  getAuthErrorMessage,
  getEnrolledSecondFactors,
  startSmsMfaEnrollment,
  type SmsMfaEnrollmentChallenge,
} from '../../services/authService';

export const AccountSecurityPanel: React.FC = () => {
  const user = auth.currentUser;
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [challenge, setChallenge] = useState<SmsMfaEnrollmentChallenge | null>(null);
  const [factorsVersion, setFactorsVersion] = useState(0);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const enrolledFactors = useMemo(() => {
    void factorsVersion;
    return getEnrolledSecondFactors();
  }, [factorsVersion]);

  const hasSmsMfa = enrolledFactors.some((factor) => factor.factorId === 'phone');

  const sendSmsCode = async () => {
    setFeedback(null);
    setBusy(true);
    try {
      challenge?.verifier.clear();
      const next = await startSmsMfaEnrollment(phone.trim(), 'leadspay-mfa-enroll-recaptcha');
      setChallenge(next);
      setFeedback({
        type: 'success',
        text: 'Código SMS enviado. Digite o código recebido para concluir a ativação.',
      });
    } catch (error) {
      setFeedback({ type: 'error', text: getAuthErrorMessage(error) });
    } finally {
      setBusy(false);
    }
  };

  const confirmSmsCode = async () => {
    if (!challenge || code.trim().length < 4) {
      setFeedback({ type: 'error', text: 'Digite o código recebido por SMS.' });
      return;
    }

    setFeedback(null);
    setBusy(true);
    try {
      await completeSmsMfaEnrollment(challenge, code, 'Telefone principal');
      setChallenge(null);
      setCode('');
      setPhone('');
      setFactorsVersion((value) => value + 1);
      setFeedback({
        type: 'success',
        text: 'Verificação em duas etapas por SMS ativada com sucesso.',
      });
    } catch (error) {
      setFeedback({ type: 'error', text: getAuthErrorMessage(error) });
    } finally {
      setBusy(false);
    }
  };

  const removeSmsFactor = async () => {
    const phoneFactor = enrolledFactors.find((factor) => factor.factorId === 'phone');
    if (!phoneFactor) return;

    setFeedback(null);
    setBusy(true);
    try {
      await disableSmsMfa(phoneFactor.uid);
      setFactorsVersion((value) => value + 1);
      setFeedback({
        type: 'success',
        text: 'Segundo fator por SMS desativado.',
      });
    } catch (error) {
      setFeedback({ type: 'error', text: getAuthErrorMessage(error) });
    } finally {
      setBusy(false);
    }
  };

  if (!user) return null;

  return (
    <section className="mb-6 rounded-3xl border border-white/10 bg-[#0a1222]/90 p-6 shadow-xl backdrop-blur-md">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[#D9F22A]" />
            <h3 className="text-base font-black text-white">Segurança da conta</h3>
          </div>
          <p className="mt-1 text-xs leading-5 text-white/55">
            Proteja o acesso com e-mail verificado e autenticação em duas etapas por SMS.
          </p>
        </div>

        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-bold text-emerald-300">
          <LockKeyhole className="h-3.5 w-3.5" />
          Conta protegida
        </span>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-[#060a15] p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-emerald-500/10 p-2 text-emerald-300">
              <MailCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-bold text-white">E-mail</p>
                {user.emailVerified ? (
                  <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-300">
                    Verificado
                  </span>
                ) : (
                  <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-300">
                    Pendente
                  </span>
                )}
              </div>
              <p className="mt-1 truncate text-xs text-white/55">{user.email || 'E-mail não disponível'}</p>
              <p className="mt-2 text-[11px] leading-5 text-white/40">
                O e-mail é obrigatório para validação da conta e recuperação de senha.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#060a15] p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-[#D9F22A]/10 p-2 text-[#D9F22A]">
              <Smartphone className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-bold text-white">SMS em duas etapas</p>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                  hasSmsMfa
                    ? 'bg-emerald-500/10 text-emerald-300'
                    : 'bg-white/5 text-white/45'
                }`}>
                  {hasSmsMfa ? 'Ativado' : 'Desativado'}
                </span>
              </div>

              {hasSmsMfa ? (
                <div className="mt-3">
                  <p className="text-xs leading-5 text-white/55">
                    Um código SMS será solicitado quando o Firebase exigir o segundo fator no login.
                  </p>
                  <button
                    type="button"
                    onClick={removeSmsFactor}
                    disabled={busy}
                    className="mt-3 inline-flex items-center gap-2 rounded-xl border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-300 transition hover:bg-rose-500/15 disabled:opacity-50"
                  >
                    <XCircle className="h-4 w-4" />
                    Desativar SMS
                  </button>
                </div>
              ) : (
                <div className="mt-3 space-y-3">
                  {!challenge ? (
                    <>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(event) => setPhone(event.target.value)}
                        placeholder="+5581999999999"
                        autoComplete="tel"
                        className="w-full rounded-xl border border-white/10 bg-[#09111b] px-3.5 py-3 text-xs text-white outline-none transition focus:border-[#D9F22A]"
                      />
                      <button
                        type="button"
                        onClick={sendSmsCode}
                        disabled={busy || !user.emailVerified}
                        className="w-full rounded-xl bg-[#D9F22A] px-4 py-3 text-xs font-black uppercase tracking-wider text-[#060A15] transition hover:bg-[#c8e217] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {busy ? 'Enviando...' : 'Enviar código por SMS'}
                      </button>
                    </>
                  ) : (
                    <>
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        value={code}
                        onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 8))}
                        placeholder="Código recebido"
                        className="w-full rounded-xl border border-white/10 bg-[#09111b] px-3.5 py-3 text-xs text-white outline-none transition focus:border-[#D9F22A]"
                      />
                      <button
                        type="button"
                        onClick={confirmSmsCode}
                        disabled={busy}
                        className="w-full rounded-xl bg-[#D9F22A] px-4 py-3 text-xs font-black uppercase tracking-wider text-[#060A15] transition hover:bg-[#c8e217] disabled:opacity-50"
                      >
                        {busy ? 'Confirmando...' : 'Confirmar e ativar SMS'}
                      </button>
                    </>
                  )}
                  <div id="leadspay-mfa-enroll-recaptcha" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {feedback && (
        <div className={`mt-4 flex items-start gap-2 rounded-xl border px-3.5 py-3 text-xs ${
          feedback.type === 'success'
            ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'
            : 'border-rose-500/25 bg-rose-500/10 text-rose-300'
        }`}>
          {feedback.type === 'success' ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}
    </section>
  );
};
