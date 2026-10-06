import React, { useMemo, useState } from 'react';
import { UserAffiliation, CompanyPlan } from '../../types/platform';
import { formatAffiliatePlanUrl, getAppBaseUrl } from '../../utils/affiliateTracking';
import {
  AlertTriangle,
  Check,
  Copy,
  DollarSign,
  ExternalLink,
  Link2,
  Lock,
  Percent,
  Share2,
  ShieldAlert,
  ShoppingBag,
  Sliders,
  TrendingUp,
  UserMinus,
  Zap,
} from 'lucide-react';

interface MinhasAfiliacoesViewProps {
  affiliations: UserAffiliation[];
  plans: CompanyPlan[];
  isVerified?: boolean;
  verificationStatus?: string;
  onNavigateToVitrine: () => void;
  onNavigateToProfile?: () => void;
  onDeleteAffiliation: (affiliationId: string, planId?: string, companyId?: string) => void;
}

const normalizeStatus = (value: unknown) => String(value || '').trim().toLowerCase();
const isActive = (aff: UserAffiliation) => ['ativo', 'active', 'approved'].includes(normalizeStatus(aff.status));
const isPending = (aff: UserAffiliation) => ['pendente', 'pending', 'requested', 'solicitado'].includes(normalizeStatus(aff.status));
const isRejected = (aff: UserAffiliation) => ['recusada', 'rejected'].includes(normalizeStatus(aff.status));
const isEnded = (aff: UserAffiliation) => ['encerrada', 'ended', 'cancelled'].includes(normalizeStatus(aff.status));

const statusMeta = (aff: UserAffiliation) => {
  if (isActive(aff)) return { label: 'Ativa', className: 'border-green-500/30 bg-green-500/10 text-green-400' };
  if (isPending(aff)) return { label: 'Pendente', className: 'border-amber-500/30 bg-amber-500/10 text-amber-300' };
  if (isRejected(aff)) return { label: 'Recusada', className: 'border-red-500/30 bg-red-500/10 text-red-300' };
  if (isEnded(aff)) return { label: 'Encerrada', className: 'border-white/10 bg-white/5 text-white/45' };
  return { label: aff.status || 'Indefinida', className: 'border-white/10 bg-white/5 text-white/45' };
};

export const MinhasAfiliacoesView: React.FC<MinhasAfiliacoesViewProps> = ({
  affiliations = [],
  plans = [],
  isVerified = false,
  verificationStatus = 'unsubmitted',
  onNavigateToVitrine,
  onNavigateToProfile,
  onDeleteAffiliation,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedAffiliationForUtm, setSelectedAffiliationForUtm] = useState<UserAffiliation | null>(null);
  const [leavingAffiliationModal, setLeavingAffiliationModal] = useState<UserAffiliation | null>(null);
  const [utmSource, setUtmSource] = useState('instagram');
  const [utmMedium, setUtmMedium] = useState('bio_link');
  const [utmCampaign, setUtmCampaign] = useState('lancamento');
  const [copiedUtm, setCopiedUtm] = useState(false);

  const activeAffiliations = useMemo(() => affiliations.filter(isActive), [affiliations]);
  const orderedAffiliations = useMemo(
    () => [...affiliations].sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''))),
    [affiliations],
  );

  const handleCopy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleConfirmLeaveAffiliation = () => {
    if (!leavingAffiliationModal) return;
    const aff = leavingAffiliationModal;
    onDeleteAffiliation(aff.id, aff.planId, aff.companyId);
    setLeavingAffiliationModal(null);
  };

  const totalCommissions = affiliations.reduce((acc, a) => acc + Number(a.totalEarned || 0), 0);
  const totalSales = affiliations.reduce((acc, a) => acc + Number(a.salesCount || 0), 0);
  const currentOrigin = getAppBaseUrl();

  const baseLinkFor = (aff: UserAffiliation) => {
    if (!isActive(aff)) return '';
    const code = String(aff.affiliateCode || aff.affiliate_code || '').trim();
    const planId = String(aff.planId || aff.plan_id || '').trim();
    if (!code || !planId) return '';
    return formatAffiliatePlanUrl(planId, code);
  };

  const generateUtmLink = (baseLink: string) => {
    const url = new URL(baseLink || currentOrigin);
    url.searchParams.set('utm_source', utmSource);
    url.searchParams.set('utm_medium', utmMedium);
    url.searchParams.set('utm_campaign', utmCampaign);
    return url.toString();
  };

  const copyUtmLink = async () => {
    if (!selectedAffiliationForUtm) return;
    const base = baseLinkFor(selectedAffiliationForUtm);
    if (!base) return;
    await navigator.clipboard.writeText(generateUtmLink(base));
    setCopiedUtm(true);
    setTimeout(() => setCopiedUtm(false), 1800);
  };

  return (
    <div className="flex flex-col gap-6" id="leadspay-minhas-afiliacoes-view">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#D9F22A]">
            <Link2 className="h-4 w-4" />
            Seus vínculos de divulgação
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-['Syne']">Minhas Afiliações</h1>
          <p className="mt-1 text-xs text-white/60">Acompanhe afiliações ativas, pendentes, recusadas e encerradas sem perder o histórico de vendas.</p>
        </div>
        <button
          onClick={onNavigateToVitrine}
          className="flex items-center gap-2 rounded-xl bg-[#D9F22A] px-4 py-2.5 text-xs font-black text-[#060A15]"
        >
          <ShoppingBag className="h-4 w-4" />
          Buscar novos produtos
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-[#080d1a] p-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#D9F22A]/30 bg-[#D9F22A]/10 text-[#D9F22A]">
            <Link2 className="h-6 w-6" />
          </div>
          <div>
            <span className="block text-[11px] font-bold uppercase text-white/50">Afiliações ativas</span>
            <span className="text-xl font-black text-white font-['Syne']">{activeAffiliations.length}</span>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-[#080d1a] p-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-blue-500/30 bg-blue-500/10 text-blue-400">
            <Zap className="h-6 w-6" />
          </div>
          <div>
            <span className="block text-[11px] font-bold uppercase text-white/50">Vendas fechadas</span>
            <span className="text-xl font-black text-white font-['Syne']">{totalSales}</span>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-[#080d1a] p-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-green-500/30 bg-green-500/10 text-green-400">
            <DollarSign className="h-6 w-6" />
          </div>
          <div>
            <span className="block text-[11px] font-bold uppercase text-green-400">Comissões geradas</span>
            <span className="text-xl font-black text-white font-['Syne']">
              R$ {totalCommissions.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {!isVerified ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border-2 border-amber-500/30 bg-[#080d1a] p-10 text-center shadow-xl">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-500/40 bg-amber-500/20 text-amber-400">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <div className="max-w-md">
            <h3 className="mb-1 text-lg font-bold text-white font-['Syne']">Verificação obrigatória para afiliações</h3>
            <p className="mb-5 text-xs leading-relaxed text-white/70">
              {verificationStatus === 'pending' || verificationStatus === 'submitted'
                ? 'Sua conta está em análise pela administração. Assim que aprovada, você poderá ativar afiliações e gerar links comissionados.'
                : 'Conclua sua Stripe Connect e seus dados de perfil LeadsPay para enviar o cadastro à validação da administração.'}
            </p>
            {onNavigateToProfile && (
              <button
                onClick={onNavigateToProfile}
                className="inline-flex items-center gap-2 rounded-xl bg-[#D9F22A] px-5 py-3 text-xs font-black uppercase tracking-wider text-[#060A15]"
              >
                <Lock className="h-4 w-4" />
                {verificationStatus === 'pending' || verificationStatus === 'submitted' ? 'Ver status no perfil' : 'Completar verificação'}
              </button>
            )}
          </div>
        </div>
      ) : orderedAffiliations.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed border-[#D9F22A]/30 bg-[#080d1a] p-10 text-center">
          <ShoppingBag className="h-12 w-12 text-[#D9F22A]/50" />
          <div className="max-w-md">
            <h3 className="mb-1 text-lg font-bold text-white font-['Syne']">Você ainda não se afiliou a nenhum produto</h3>
            <p className="mb-5 text-xs leading-relaxed text-white/60">Acesse o Marketplace, escolha um produto e solicite sua afiliação.</p>
            <button onClick={onNavigateToVitrine} className="inline-flex items-center gap-2 rounded-xl bg-[#D9F22A] px-5 py-3 text-xs font-black uppercase text-[#060A15]">
              <ShoppingBag className="h-4 w-4" />
              Explorar Marketplace
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {orderedAffiliations.map((aff) => {
            const meta = statusMeta(aff);
            const plan = plans.find((p) => p.id === (aff.planId || aff.plan_id));
            const link = baseLinkFor(aff);
            const active = isActive(aff);

            return (
              <article key={aff.id} className="relative flex flex-col justify-between gap-4 rounded-2xl border border-white/10 bg-[#080d1a] p-5 shadow-xl">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {aff.companyLogo ? (
                      <img src={aff.companyLogo} alt={aff.companyName} className="h-12 w-12 flex-shrink-0 rounded-xl border border-[#D9F22A]/30 bg-[#050811] object-cover" />
                    ) : (
                      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border border-white/10 bg-[#050811] text-sm font-black text-[#D9F22A]">
                        {(aff.companyName || 'LP').slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-white/50">{aff.companyName}</span>
                      <h4 className="text-base font-bold text-white font-['Syne']">{aff.planName || plan?.name}</h4>
                      {active ? (
                        <span className="rounded bg-[#D9F22A]/10 px-2 py-0.5 font-mono text-[10px] text-[#D9F22A]">
                          Código: {aff.affiliateCode || aff.affiliate_code}
                        </span>
                      ) : (
                        <span className="rounded bg-white/5 px-2 py-0.5 text-[10px] font-bold text-white/40">Código bloqueado</span>
                      )}
                    </div>
                  </div>
                  <span className={`flex-shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black ${meta.className}`}>{meta.label}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/5 bg-[#050811] p-3 text-xs">
                  <div>
                    <span className="block text-[10px] font-bold uppercase text-white/50">Preço de venda</span>
                    <span className="font-bold text-white">R$ {Number(aff.priceSetup || plan?.priceSetup || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="text-right">
                    <span className="block text-[10px] font-bold uppercase text-[#D9F22A]">Sua comissão ({Number(aff.commissionPercentage || 0)}%)</span>
                    <span className="font-black text-[#D9F22A]">R$ {Number(aff.commissionValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3"><TrendingUp className="mx-auto mb-1 h-4 w-4 text-white/35" /><div className="text-sm font-black text-white">{Number(aff.clicks || aff.clicksCount || 0)}</div><div className="text-[9px] uppercase text-white/35">Cliques</div></div>
                  <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3"><Zap className="mx-auto mb-1 h-4 w-4 text-white/35" /><div className="text-sm font-black text-white">{Number(aff.salesCount || 0)}</div><div className="text-[9px] uppercase text-white/35">Vendas</div></div>
                  <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3"><DollarSign className="mx-auto mb-1 h-4 w-4 text-[#D9F22A]" /><div className="text-sm font-black text-[#D9F22A]">R$ {Number(aff.totalEarned || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div><div className="text-[9px] uppercase text-white/35">Comissão</div></div>
                </div>

                {isPending(aff) && (
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-200">
                    Aguardando aprovação da empresa. Nenhum link ou código pode ser usado antes da aprovação.
                  </div>
                )}
                {isRejected(aff) && (
                  <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-200">
                    A empresa recusou esta solicitação. Você pode voltar ao Marketplace e solicitar novamente quando permitido.
                  </div>
                )}
                {isEnded(aff) && (
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-white/50">
                    Esta afiliação foi encerrada. O histórico de vendas e comissões permanece registrado.
                  </div>
                )}

                {active && link && (
                  <>
                    <div className="break-all rounded-xl border border-white/5 bg-[#050811] p-3 font-mono text-[10px] text-white/55">{link}</div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <button onClick={() => void handleCopy(link, aff.id)} className="flex items-center justify-center gap-1.5 rounded-lg bg-[#D9F22A] px-3 py-2.5 text-[10px] font-black text-[#060A15]">
                        {copiedId === aff.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        {copiedId === aff.id ? 'Copiado' : 'Copiar'}
                      </button>
                      <button onClick={() => setSelectedAffiliationForUtm(aff)} className="flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-[10px] font-bold text-white/70">
                        <Sliders className="h-3.5 w-3.5" />
                        UTM
                      </button>
                      <a href={link} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-[10px] font-bold text-white/70">
                        <ExternalLink className="h-3.5 w-3.5" />
                        Abrir
                      </a>
                      <button onClick={() => setLeavingAffiliationModal(aff)} className="flex items-center justify-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-[10px] font-bold text-red-300">
                        <UserMinus className="h-3.5 w-3.5" />
                        Sair
                      </button>
                    </div>
                  </>
                )}
              </article>
            );
          })}
        </div>
      )}

      {selectedAffiliationForUtm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-[#080d1a] p-6">
            <button onClick={() => setSelectedAffiliationForUtm(null)} className="absolute right-4 top-4 text-white/45">✕</button>
            <div className="mb-1 flex items-center gap-2 text-xs font-black uppercase text-[#D9F22A]"><Share2 className="h-4 w-4" /> Link com UTM</div>
            <h3 className="text-lg font-bold text-white">{selectedAffiliationForUtm.planName}</h3>
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <input value={utmSource} onChange={(e) => setUtmSource(e.target.value)} placeholder="utm_source" className="rounded-xl border border-white/10 bg-[#050811] p-3 text-xs text-white" />
              <input value={utmMedium} onChange={(e) => setUtmMedium(e.target.value)} placeholder="utm_medium" className="rounded-xl border border-white/10 bg-[#050811] p-3 text-xs text-white" />
              <input value={utmCampaign} onChange={(e) => setUtmCampaign(e.target.value)} placeholder="utm_campaign" className="rounded-xl border border-white/10 bg-[#050811] p-3 text-xs text-white" />
            </div>
            <div className="mt-4 break-all rounded-xl border border-white/5 bg-[#050811] p-3 font-mono text-[10px] text-white/55">
              {generateUtmLink(baseLinkFor(selectedAffiliationForUtm))}
            </div>
            <button onClick={() => void copyUtmLink()} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#D9F22A] py-3 text-xs font-black text-[#060A15]">
              {copiedUtm ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copiedUtm ? 'Link copiado' : 'Copiar link com UTM'}
            </button>
          </div>
        </div>
      )}

      {leavingAffiliationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-red-500/20 bg-[#080d1a] p-6">
            <AlertTriangle className="mb-3 h-6 w-6 text-red-400" />
            <h3 className="text-lg font-bold text-white">Encerrar afiliação?</h3>
            <p className="mt-2 text-xs leading-5 text-white/60">
              Seu link deixará de ficar ativo para novas vendas. O histórico e as comissões já geradas continuarão registrados.
            </p>
            <div className="mt-5 flex gap-2">
              <button onClick={() => setLeavingAffiliationModal(null)} className="flex-1 rounded-xl border border-white/10 bg-white/5 py-3 text-xs font-bold text-white">Cancelar</button>
              <button onClick={handleConfirmLeaveAffiliation} className="flex-1 rounded-xl bg-red-500 py-3 text-xs font-black text-white">Encerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
