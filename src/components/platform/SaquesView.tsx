import React from 'react';
import { ArrowUpRight, Clock3 } from 'lucide-react';
import { UserRoleMode, UserSellerProfile } from '../../types/platform';
import { StripeConnectPanel } from './StripeConnectPanel';

interface SaquesViewProps {
  userProfile: UserSellerProfile;
  roleMode?: UserRoleMode;
}

export const SaquesView: React.FC<SaquesViewProps> = ({ userProfile, roleMode = 'afiliado' }) => (
  <div className="space-y-6" id="leadspay-saques-view">
    <header className="space-y-2">
      <div className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-slate-500">
        <ArrowUpRight className="h-4 w-4" /> Recebimentos e repasses
      </div>
      <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Conta de recebimento</h1>
      <p className="max-w-2xl text-sm leading-6 text-slate-600">Os dados bancários e a programação de payout são gerenciados diretamente na Stripe. A LeadsPay não coleta sua chave Pix nem promete saque instantâneo.</p>
    </header>
    <StripeConnectPanel roleMode={roleMode} userProfile={userProfile} />
    <aside className="flex gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
      <Clock3 className="mt-1 h-4 w-4 shrink-0 text-slate-500" />
      <p>O repasse depende da confirmação do pagamento, do prazo de disponibilidade D+9 e das verificações da conta de recebimento. Solicitações registradas no provedor anterior permanecem apenas como histórico e não serão reenviadas.</p>
    </aside>
  </div>
);
