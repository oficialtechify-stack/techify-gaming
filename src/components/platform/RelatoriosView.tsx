import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, DollarSign, Globe, Loader2, RefreshCw, Target, TrendingUp } from 'lucide-react';
import { SaleTransaction, UserRoleMode } from '../../types/platform';
import { useAuth } from '../../context/AuthContext';

interface RelatoriosViewProps {
  roleMode?: UserRoleMode;
  transactions?: SaleTransaction[];
}

interface TrafficCampaignMetric {
  source: string;
  medium?: string;
  campaign?: string;
  clicks: number;
}

const approvedStatus = (value: unknown) =>
  ['aprovado', 'approved', 'liberado', 'received', 'confirmed'].includes(
    String(value || '').trim().toLowerCase(),
  );

const money = (value: number) =>
  Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

const clean = (value: unknown, fallback: string) =>
  String(value || fallback).trim().toLowerCase() || fallback;

export const RelatoriosView: React.FC<RelatoriosViewProps> = ({
  roleMode = 'empresa',
  transactions = [],
}) => {
  const { currentUser } = useAuth();
  const isAffiliate = roleMode === 'afiliado';
  const [clickCampaigns, setClickCampaigns] = useState<TrafficCampaignMetric[]>([]);
  const [totalClicks, setTotalClicks] = useState(0);
  const [trafficLoading, setTrafficLoading] = useState(true);
  const [trafficError, setTrafficError] = useState('');

  const approvedSales = useMemo(
    () => transactions.filter((transaction) => approvedStatus(transaction.status)),
    [transactions],
  );

  const totalGrossRevenue = approvedSales.reduce((acc, transaction) => acc + Number(transaction.amount || 0), 0);
  const totalCommissions = approvedSales.reduce(
    (acc, transaction) => acc + Number(transaction.commissionEarned || 0),
    0,
  );
  const salesCount = approvedSales.length;
  const averageTicket = salesCount > 0 ? totalGrossRevenue / salesCount : 0;
  const overallConversion = totalClicks > 0 ? (salesCount / totalClicks) * 100 : 0;

  const loadTraffic = async () => {
    if (!currentUser || roleMode === 'admin') {
      setClickCampaigns([]);
      setTotalClicks(0);
      setTrafficLoading(false);
      return;
    }

    setTrafficLoading(true);
    setTrafficError('');

    try {
      const token = await currentUser.getIdToken();
      const endpoint = isAffiliate ? '/api/affiliates/traffic-report' : '/api/company/traffic-report';
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Não foi possível carregar os cliques.');

      const campaigns = Array.isArray(data.campaigns)
        ? data.campaigns
        : Array.isArray(data.sources)
          ? data.sources.map((item: any) => ({
              source: item.source,
              medium: 'sem_medium',
              campaign: 'sem_campanha',
              clicks: item.clicks,
            }))
          : [];

      setClickCampaigns(campaigns);
      setTotalClicks(Number(data.totalClicks || 0));
    } catch (error) {
      setClickCampaigns([]);
      setTotalClicks(0);
      setTrafficError(error instanceof Error ? error.message : 'Não foi possível carregar os cliques.');
    } finally {
      setTrafficLoading(false);
    }
  };

  useEffect(() => {
    void loadTraffic();
  }, [currentUser?.uid, roleMode]);

  const conversionMap = useMemo(() => {
    const map = new Map<string, { conversions: number; revenue: number; commission: number }>();

    for (const transaction of approvedSales) {
      const source = clean(transaction.utmSource, 'direto');
      const medium = clean(transaction.utmMedium, 'sem_medium');
      const campaign = clean(transaction.utmCampaign, 'sem_campanha');
      const key = `${source}\u0001${medium}\u0001${campaign}`;
      const current = map.get(key) || { conversions: 0, revenue: 0, commission: 0 };
      current.conversions += 1;
      current.revenue += Number(transaction.amount || 0);
      current.commission += Number(transaction.commissionEarned || 0);
      map.set(key, current);
    }

    return map;
  }, [approvedSales]);

  const trafficRows = useMemo(() => {
    const clickMap = new Map<string, TrafficCampaignMetric>();
    for (const item of clickCampaigns) {
      const source = clean(item.source, 'direto');
      const medium = clean(item.medium, 'sem_medium');
      const campaign = clean(item.campaign, 'sem_campanha');
      clickMap.set(`${source}\u0001${medium}\u0001${campaign}`, {
        source,
        medium,
        campaign,
        clicks: Number(item.clicks || 0),
      });
    }

    const keys = new Set<string>([...clickMap.keys(), ...conversionMap.keys()]);
    return Array.from(keys)
      .map((key) => {
        const [source, medium, campaign] = key.split('\u0001');
        const clicks = clickMap.get(key)?.clicks || 0;
        const conversions = conversionMap.get(key)?.conversions || 0;
        const revenue = conversionMap.get(key)?.revenue || 0;
        const commission = conversionMap.get(key)?.commission || 0;
        return {
          source,
          medium,
          campaign,
          clicks,
          conversions,
          revenue,
          commission,
          conversionRate: clicks > 0 ? (conversions / clicks) * 100 : null,
        };
      })
      .sort((a, b) =>
        (isAffiliate ? b.commission - a.commission : b.revenue - a.revenue) ||
        b.clicks - a.clicks,
      );
  }, [clickCampaigns, conversionMap, isAffiliate]);

  return (
    <div className="flex flex-col gap-6" id="leadspay-relatorios-view">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-1 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.14em] text-[#D9F22A]">
            <BarChart3 className="h-4 w-4" />
            {isAffiliate ? 'Performance do afiliado' : 'Dados reais da empresa'}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-['Syne']">
            Relatórios & UTMs
          </h1>
          <p className="mt-1 text-xs text-white/60">
            {isAffiliate
              ? 'Cliques, vendas, conversões e comissões atribuídos aos seus links e campanhas.'
              : 'Vendas confirmadas pela Stripe e cliques reais registrados nos links de afiliados desta empresa.'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadTraffic()}
          disabled={trafficLoading}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-xs font-bold text-white/70 transition hover:bg-white/10 disabled:opacity-40"
        >
          {trafficLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Atualizar tráfego
        </button>
      </div>

      {trafficError && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
          {trafficError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
        <div className="rounded-2xl border border-white/10 bg-[#080d1a] p-5">
          <Target className="mb-3 h-4 w-4 text-[#D9F22A]" />
          <span className="text-xs font-bold uppercase text-white/50">Vendas confirmadas</span>
          <div className="mt-1 text-2xl font-black text-white font-['Syne']">{salesCount}</div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#080d1a] p-5">
          <Globe className="mb-3 h-4 w-4 text-[#D9F22A]" />
          <span className="text-xs font-bold uppercase text-white/50">Cliques rastreados</span>
          <div className="mt-1 text-2xl font-black text-white font-['Syne']">
            {trafficLoading ? '—' : totalClicks}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#080d1a] p-5">
          <DollarSign className="mb-3 h-4 w-4 text-[#D9F22A]" />
          <span className="text-xs font-bold uppercase text-white/50">Volume bruto</span>
          <div className="mt-1 text-2xl font-black text-white font-['Syne']">{money(totalGrossRevenue)}</div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#080d1a] p-5">
          <TrendingUp className="mb-3 h-4 w-4 text-[#D9F22A]" />
          <span className="text-xs font-bold uppercase text-white/50">
            {isAffiliate ? 'Conversão geral' : 'Ticket médio'}
          </span>
          <div className="mt-1 text-2xl font-black text-white font-['Syne']">
            {isAffiliate ? (totalClicks > 0 ? `${overallConversion.toFixed(2)}%` : '—') : money(averageTicket)}
          </div>
        </div>

        <div className="rounded-2xl border border-[#D9F22A]/30 bg-[#D9F22A]/5 p-5">
          <span className="text-xs font-bold uppercase text-[#D9F22A]">
            {isAffiliate ? 'Suas comissões' : 'Comissões geradas'}
          </span>
          <div className="mt-1 text-2xl font-black text-[#D9F22A] font-['Syne']">{money(totalCommissions)}</div>
          <span className="mt-1 block text-[11px] text-white/50">Somente vendas confirmadas</span>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#080d1a] p-5 shadow-xl">
        <div className="mb-4">
          <h3 className="flex items-center gap-2 text-base font-bold text-white font-['Syne']">
            <Globe className="h-4 w-4 text-[#D9F22A]" />
            Origem do tráfego e campanhas
          </h3>
          <p className="mt-1 text-[11px] text-white/40">
            UTM Source, Medium e Campaign são capturados nos cliques e mantidos nas vendas atribuídas.
          </p>
        </div>

        {trafficLoading ? (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-white/5 bg-[#050811] py-12 text-xs text-white/45">
            <Loader2 className="h-4 w-4 animate-spin text-[#D9F22A]" />
            Carregando cliques reais...
          </div>
        ) : trafficRows.length === 0 ? (
          <div className="rounded-xl border border-white/5 bg-[#050811] px-4 py-10 text-center">
            <Globe className="mx-auto mb-3 h-10 w-10 text-white/20" />
            <h4 className="text-sm font-bold text-white">Nenhum tráfego registrado ainda</h4>
            <p className="mx-auto mt-1 max-w-sm text-xs text-white/50">
              Quando seus links receberem cliques e vendas, as campanhas aparecerão aqui automaticamente.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-[#050811] uppercase tracking-wider text-white/40">
                  <th className="px-4 py-3 font-bold">Origem</th>
                  <th className="px-4 py-3 font-bold">Meio</th>
                  <th className="px-4 py-3 font-bold">Campanha</th>
                  <th className="px-4 py-3 text-center font-bold">Cliques</th>
                  <th className="px-4 py-3 text-center font-bold">Vendas</th>
                  <th className="px-4 py-3 text-center font-bold">Conversão</th>
                  <th className="px-4 py-3 text-right font-bold">{isAffiliate ? 'Comissão' : 'Volume bruto'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {trafficRows.map((item) => (
                  <tr key={`${item.source}:${item.medium}:${item.campaign}`} className="transition-colors hover:bg-white/[0.02]">
                    <td className="px-4 py-3.5 font-bold text-white">{item.source.toUpperCase()}</td>
                    <td className="px-4 py-3.5 text-white/60">{item.medium}</td>
                    <td className="px-4 py-3.5 text-white/60">{item.campaign}</td>
                    <td className="px-4 py-3.5 text-center text-white/80">{item.clicks}</td>
                    <td className="px-4 py-3.5 text-center font-bold text-[#D9F22A]">{item.conversions}</td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="rounded bg-white/5 px-2 py-0.5 font-mono">
                        {item.conversionRate === null ? '—' : `${item.conversionRate.toFixed(2)}%`}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right font-bold text-white">
                      {money(isAffiliate ? item.commission : item.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
