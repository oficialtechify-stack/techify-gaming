import React, { useState } from 'react';
import { Bell, LoaderCircle, ShieldCheck } from 'lucide-react';
import { UserSellerProfile } from '../../types/platform';

type Props = {
  userProfile: UserSellerProfile;
  onSaveProfile: (updates: Partial<UserSellerProfile>) => Promise<void>;
};

export const NotificationPreferencesPanel: React.FC<Props> = ({ userProfile, onSaveProfile }) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const enabled = userProfile.communicationPreferences?.inApp?.enabled === true;

  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    const nextEnabled = !enabled;
    const now = new Date().toISOString();
    try {
      await onSaveProfile({
        communicationPreferences: {
          ...userProfile.communicationPreferences,
          inApp: {
            enabled: nextEnabled,
            updatedAt: now,
            consentVersion: 'in-app-account-activity-v1',
            source: 'profile-settings',
          },
        },
      });
      setNotice(nextEnabled ? 'Avisos no painel ativados.' : 'Avisos no painel desativados.');
    } catch {
      setError('Não foi possível salvar sua preferência. Tente novamente.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mt-8 rounded-3xl border border-white/10 bg-[#0a1222]/90 p-5 shadow-xl backdrop-blur-md sm:p-7" aria-labelledby="notification-preferences-title">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-400/10 text-emerald-300">
          <ShieldCheck className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="notification-preferences-title" className="text-base font-black text-white sm:text-lg">Avisos dentro do painel</h2>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-white/60">
            Receba um aviso na central da LeadsPay quando houver atividade da sua conta, como uma venda aprovada ou comissão. Não enviamos e-mail, Push ou WhatsApp.
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-4 rounded-2xl border border-white/10 bg-black/10 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Bell className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" aria-hidden="true" />
          <div>
            <p className="text-sm font-bold text-white">Central de notificações</p>
            <p className="mt-1 text-xs leading-relaxed text-white/55">A preferência é opcional e começa desativada. Você pode ativar ou desativar quando quiser.</p>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label={`Avisos dentro do painel: ${enabled ? 'ativados' : 'desativados'}`}
          disabled={busy}
          onClick={() => void toggle()}
          className={`inline-flex min-h-11 min-w-[132px] items-center justify-center gap-2 self-start rounded-xl border px-4 text-xs font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300 disabled:cursor-wait disabled:opacity-60 sm:self-center ${enabled ? 'border-emerald-400/40 bg-emerald-400/15 text-emerald-200' : 'border-white/15 bg-white/5 text-white/75 hover:bg-white/10'}`}
        >
          {busy ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
          {busy ? 'Salvando…' : enabled ? 'Ativado' : 'Ativar'}
        </button>
      </div>
      <p className="mt-4 text-[11px] leading-relaxed text-white/45">Os avisos são exibidos apenas dentro da sua conta e não usam serviços externos de mensagem.</p>
      {error && <p className="mt-3 rounded-xl border border-rose-400/20 bg-rose-400/10 p-3 text-xs text-rose-200" role="alert">{error}</p>}
      {notice && <p className="mt-3 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-xs text-emerald-200" role="status">{notice}</p>}
    </section>
  );
};
