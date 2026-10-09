import React, { useCallback, useEffect, useState } from 'react';
import {
  BadgeDollarSign,
  Building2,
  CreditCard,
  RefreshCw,
  ShoppingCart,
  Users,
  Wallet,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

type AdminSummary = {
  salesCount?: number;
  grossVolume?: number;
  platformRevenue?: number;
  approvedCompanies?: number;
  approvedAffiliates?: number;
  activeProducts?: number;
  pendingBalance?: number;
  availableBalance?: number;
  activeProductSubscriptions?: number;
  platformPlanMrr?: number;
  lastUpdated?: string;
};

const money = (value: unknown) =>
  Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

export const AdminDashboardView: React.FC = () => {
  const { currentUser } = useAuth();
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    setError('');
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch('/api/admin/summary', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.summary) {
        throw new Error(data.error || 'Não foi possível carregar o Dashboard administrativo.');
      }
      setSummary(data.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar o Dashboard.');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    void load();
  }, [load]);

  const cards = [
    { label: 'Receita LeadsPay', value: money(summary?.platformRevenue), icon: BadgeDollarSign },
    { label: 'Volume processado', value: money(summary?.grossVolume), icon: CreditCard },
    { label: 'Vendas confirmadas', value: String(summary?.salesCount || 0), icon: ShoppingCart },
    { label: 'Empresas ativas', value: String(summary?.approvedCompanies || 0), icon: Building2 },
    { label: 'Afiliados aprovados', value: String(summary?.approvedAffiliates || 0), icon: Users },
    { label: 'Produtos ativos', value: String(summary?.activeProducts || 0), icon: ShoppingCart },
    { label: 'Saldo futuro', value: money(summary?.pendingBalance), icon: Wallet },
    { label: 'Saldo disponível', value: money(summary?.availableBalance), icon: Wallet },
    { label: 'Assinaturas de produtos', value: String(summary?.activeProductSubscriptions || 0), icon: CreditCard },
    { label: 'MRR dos planos', value: money(summary?.platformPlanMrr), icon: BadgeDollarSign },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[#D9F22A]">
            Conta Global LeadsPay
          </div>
          <h1 className="mt-1 text-2xl font-black text-white font-['Syne']">Dashboard</h1>
          <p className="mt-1 text-xs text-white/45">
            Visão rápida da operação da plataforma sem carregar listas administrativas inteiras.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-white/70 transition hover:bg-white/10 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-500/25 bg-rose-500/10 p-4 text-xs text-rose-300">
          {error}
        </div>
      )}

      {loading && !summary ? (
        <div className="flex min-h-48 items-center justify-center rounded-3xl border border-white/10 bg-[#080d1a] text-sm text-white/45">
          <RefreshCw className="mr-2 h-4 w-4 animate-spin text-[#D9F22A]" />
          Carregando resumo...
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {cards.map(({ label, value, icon: Icon }) => (
              <article key={label} className="rounded-2xl border border-white/10 bg-[#080d1a] p-4 shadow-lg">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[9px] font-black uppercase tracking-wider text-white/40">{label}</span>
                  <Icon className="h-4 w-4 text-[#D9F22A]" />
                </div>
                <div className="mt-2 text-xl font-black text-white">{value}</div>
              </article>
            ))}
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#080d1a] p-4 text-[11px] text-white/45">
            Este Dashboard usa o resumo administrativo. As listas completas de empresas, afiliados e ações ficam no
            <strong className="ml-1 text-white/70">Painel ADM</strong>.
            {summary?.lastUpdated && (
              <span className="ml-2 text-white/30">
                Atualizado {new Date(summary.lastUpdated).toLocaleString('pt-BR')}.
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
};
