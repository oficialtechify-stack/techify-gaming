import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, DollarSign, Globe, Loader2, RefreshCw, Target, TrendingUp } from 'lucide-react';
import { SaleTransaction } from '../../types/platform';
import { useAuth } from '../../context/AuthContext';

interface RelatoriosViewProps {
  transactions?: SaleTransaction[];
}

interface TrafficSourceMetric {
  source: string;
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

export const RelatoriosView: React.FC<RelatoriosViewProps> = ({ transactions = [] }) => {
  const { currentUser } = useAuth();
  const [clickSources, setClickSources] = useState<TrafficSourceMetric[]>([]);
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

  const loadTraffic = async () => {
    if (!currentUser) {
      setClickSources([]);
      setTotalClicks(0);
      setTrafficLoading(false);
      return;
    }

    setTrafficLoading(true);
    setTrafficError('');

    try {
      const token = await currentUser.getIdToken();
      const response = await fetch('/api/company/traffic-report', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Não foi possível carregar os cliques.');

      setClickSources(Array.isArray(data.sources) ? data.sources : []);
      setTotalClicks(Number(data.totalClicks || 0));
    } catch (error) {
      setClickSources([]);
      setTotalClicks(0);
      setTrafficError(error instanceof Error ? error.message : 'Não foi possível carregar os cliques.');
    } finally {
      setTrafficLoading(false);
    }
  };

  useEffect(() => {
    void loadTraffic();
  }, [currentUser?.uid]);

  const conversionMap = useMemo(() => {
    const map = new Map<string, { conversions: number; revenue: number }>();

    for (const transaction of approvedSales) {
      const source = String(transaction.utmSource || 'direto').trim().toLowerCase() || 'direto';
      const current = map.get(source) || { conversions: 0, revenue: 0 };
      current.conversions += 1;
      current.revenue += Number(transaction.amount || 0);
      map.set(source, current);
    }

    return map;
  }, [approvedSales]);

  const trafficSources = useMemo(() => {
    const allSources = new Set<string>([
      ...clickSources.map((item) => item.source),
      ...Array.from(conversionMap.keys()),
    ]);

    return Array.from(allSources)
      .map((source) => {
        const clicks = clickSources.find((item) => item.source === source)?.clicks || 0;
        const conversions = conversionMap.get(source)?.conversions || 0;
        const revenue = conversionMap.get(source)?.revenue || 0;
        const conversionRate = clicks > 0 ? (conversions / clicks) * 100 : null;

        return {
          source,
          clicks,
          conversions,
          revenue,
          conversionRate,
        };
      })
      .sort((a, b) => b.revenue - a.revenue || b.clicks - a.clicks);
  }, [clickSources, conversionMap]);

  return (
    <div className="flex flex-col gap-6" id="leadspay-relatorios-view">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-1 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.14em] text-[#D9F22A]">
            <BarChart3 className="h-4 w-4" />
            Dados reais da empresa
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-['Syne']">
            Relatórios & Performance
          </h1>
          <p className="text-xs text-white/60 mt-1">
            Vendas confirmadas pela Stripe e cliques reais registrados nos links de afiliados desta empresa.
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
          <span className="text-xs font-bold uppercase text-white/50">Ticket médio</span>
          <div className="mt-1 text-2xl font-black text-white font-['Syne']">{money(averageTicket)}</div>
        </div>

        <div className="rounded-2xl border border-[#D9F22A]/30 bg-[#D9F22A]/5 p-5">
          <span className="text-xs font-bold uppercase text-[#D9F22A]">Comissões geradas</span>
          <div className="mt-1 text-2xl font-black text-[#D9F22A] font-['Syne']">{money(totalCommissions)}</div>
          <span className="mt-1 block text-[11px] text-white/50">Somente vendas confirmadas</span>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#080d1a] p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-base font-bold text-white font-['Syne']">
              <Globe className="h-4 w-4 text-[#D9F22A]" />
              Origem do tráfego
            </h3>
            <p className="mt-1 text-[11px] text-white/40">
              UTM Source capturado nos cliques e mantido nas vendas atribuídas.
            </p>
          </div>
        </div>

        {trafficLoading ? (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-white/5 bg-[#050811] py-12 text-xs text-white/45">
            <Loader2 className="h-4 w-4 animate-spin text-[#D9F22A]" />
            Carregando cliques reais...
          </div>
        ) : trafficSources.length === 0 ? (
          <div className="rounded-xl border border-white/5 bg-[#050811] px-4 py-10 text-center">
            <Globe className="mx-auto mb-3 h-10 w-10 text-white/20" />
            <h4 className="text-sm font-bold text-white">Nenhum tráfego registrado ainda</h4>
            <p className="mx-auto mt-1 max-w-sm text-xs text-white/50">
              Quando os links de afiliado receberem cliques, os canais e conversões aparecerão aqui automaticamente.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-[#050811] uppercase tracking-wider text-white/40">
                  <th className="px-4 py-3 font-bold">Canal / origem</th>
                  <th className="px-4 py-3 text-center font-bold">Cliques reais</th>
                  <th className="px-4 py-3 text-center font-bold">Vendas</th>
                  <th className="px-4 py-3 text-center font-bold">Conversão</th>
                  <th className="px-4 py-3 text-right font-bold">Volume bruto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {trafficSources.map((item) => (
                  <tr key={item.source} className="transition-colors hover:bg-white/[0.02]">
                    <td className="px-4 py-3.5 font-bold text-white">{item.source.toUpperCase()}</td>
                    <td className="px-4 py-3.5 text-center text-white/80">{item.clicks}</td>
                    <td className="px-4 py-3.5 text-center font-bold text-[#D9F22A]">{item.conversions}</td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="rounded bg-white/5 px-2 py-0.5 font-mono">
                        {item.conversionRate === null ? '—' : `${item.conversionRate.toFixed(2)}%`}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right font-bold text-white">{money(item.revenue)}</td>
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
