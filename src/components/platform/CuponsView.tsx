import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Check,
  Copy,
  DollarSign,
  ExternalLink,
  Percent,
  Plus,
  Search,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import { CompanyPlan, UserAffiliation, UserRoleMode } from '../../types/platform';
import { useAuth } from '../../context/AuthContext';
import { formatAffiliatePlanUrl } from '../../utils/affiliateTracking';

export interface CouponItem {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  value: number;
  maxUses: number;
  usedCount: number;
  expiresAt: string;
  status: 'active' | 'expired' | 'paused';
  applicablePlans: string[];
  applicableAffiliates: string[];
  companyId?: string;
  companyName?: string;
  eligiblePlans?: Array<{ planId: string; affiliateCode: string; companyId: string }>;
}

interface CuponsViewProps {
  roleMode?: UserRoleMode;
  plans?: CompanyPlan[];
  affiliations?: UserAffiliation[];
  activeCompanyId?: string;
}

export const CuponsView: React.FC<CuponsViewProps> = ({
  roleMode = 'empresa',
  plans = [],
  affiliations = [],
  activeCompanyId,
}) => {
  const { currentUser } = useAuth();
  const isAffiliate = roleMode === 'afiliado';
  const companyId = activeCompanyId || plans[0]?.companyId || '';
  const couponEligiblePlans = useMemo(
    () => plans.filter(
      (p) =>
        p.billingType !== 'recorrente' &&
        p.paymentType !== 'Recorrente' &&
        p.paymentType !== 'Assinatura',
    ),
    [plans],
  );
  const [coupons, setCoupons] = useState<CouponItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [type, setType] = useState<'percentage' | 'fixed'>('percentage');
  const [value, setValue] = useState(10);
  const [maxUses, setMaxUses] = useState(100);
  const [expiresAt, setExpiresAt] = useState('');
  const [planId, setPlanId] = useState('all');
  const [affiliateCode, setAffiliateCode] = useState('all');

  const authHeaders = async () => {
    if (!currentUser) throw new Error('Faça login novamente.');
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${await currentUser.getIdToken()}`,
    };
  };

  const load = async () => {
    if (!currentUser) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const endpoint = isAffiliate ? '/api/coupons?role=afiliado' : '/api/coupons';
      const res = await fetch(endpoint, { headers: await authHeaders(), cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Falha ao carregar cupons.');
      setCoupons(Array.isArray(data.coupons) ? data.coupons : []);
    } catch (err: any) {
      setCoupons([]);
      setError(err?.message || 'Falha ao carregar cupons.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [currentUser?.uid, companyId, roleMode]);

  const uniqueAffiliates = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of affiliations) {
      const c = String(a.affiliateCode || a.affiliate_code || '');
      if (c) map.set(c, String(a.userName || a.affiliateName || c));
    }
    return [...map.entries()];
  }, [affiliations]);

  const filtered = coupons.filter((c) => !search || c.code.includes(search.toUpperCase()));

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAffiliate) return;
    setError('');
    if (!code.trim()) return setError('Informe o código.');
    try {
      const res = await fetch('/api/coupons', {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({
          code,
          discountType: type,
          value,
          maxUses,
          expiresAt,
          applicablePlans: [planId],
          applicableAffiliates: [affiliateCode],
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Não foi possível criar o cupom.');
      setCoupons((prev) => [data.coupon, ...prev.filter((c) => c.id !== data.coupon.id)]);
      setModal(false);
      setCode('');
    } catch (err: any) {
      setError(err?.message || 'Não foi possível criar o cupom.');
    }
  };

  const remove = async (item: CouponItem) => {
    if (isAffiliate) return;
    if (!confirm(`Excluir o cupom ${item.code}?`)) return;
    try {
      const res = await fetch('/api/coupons', {
        method: 'DELETE',
        headers: await authHeaders(),
        body: JSON.stringify({ id: item.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Falha ao excluir.');
      setCoupons((prev) => prev.filter((c) => c.id !== item.id));
    } catch (err: any) {
      setError(err?.message || 'Falha ao excluir cupom.');
    }
  };

  const affiliateLinkFor = (item: CouponItem) => {
    const eligible = item.eligiblePlans?.[0];
    if (!eligible?.planId || !eligible?.affiliateCode) return '';
    try {
      const url = new URL(formatAffiliatePlanUrl(eligible.planId, eligible.affiliateCode));
      url.searchParams.set('coupon', item.code);
      url.searchParams.set('utm_source', 'coupon');
      url.searchParams.set('utm_medium', 'affiliate_coupon');
      url.searchParams.set('utm_campaign', item.code.toLowerCase());
      return url.toString();
    } catch {
      return '';
    }
  };

  const companyLinkFor = (item: CouponItem) => {
    const target = item.applicablePlans.find((p) => p !== 'all') || couponEligiblePlans[0]?.id;
    const plan = couponEligiblePlans.find((p) => p.id === target);
    if (!plan) return '';
    return `${window.location.origin}/checkout/${encodeURIComponent(plan.checkoutSlug || plan.slug || plan.id)}?coupon=${encodeURIComponent(item.code)}`;
  };

  const copy = async (text: string, id: string) => {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 1800);
  };

  const discountText = (item: CouponItem) =>
    item.discountType === 'percentage'
      ? `${item.value}% de desconto`
      : `R$ ${Number(item.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} de desconto`;

  if (loading) return <div className="p-8 text-sm text-white/50">Carregando cupons...</div>;

  if (isAffiliate) {
    return (
      <div className="space-y-6 animate-fadeIn" id="leadspay-meus-cupons-view">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#D9F22A]">
            <Tag className="h-4 w-4" />
            Benefícios liberados pelas empresas
          </div>
          <h1 className="text-2xl font-black text-white font-['Syne']">Meus Cupons</h1>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-white/50">
            Aqui aparecem somente os cupons que uma empresa liberou para produtos aos quais você está afiliado. O afiliado não cria, edita ou exclui descontos.
          </p>
        </div>

        {error && (
          <div className="flex gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-white/30" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar cupom..."
            className="w-full rounded-xl border border-white/10 bg-[#080d1a] py-2.5 pl-10 pr-4 text-sm text-white"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {filtered.map((item) => {
            const url = affiliateLinkFor(item);
            const eligibleIds = item.eligiblePlans?.map((entry) => entry.planId) || [];
            const eligibleNames = [...new Set(
              eligibleIds
                .map((id) => plans.find((plan) => plan.id === id)?.name)
                .filter(Boolean),
            )] as string[];
            return (
              <article key={item.id} className="rounded-2xl border border-white/10 bg-[#080d1a] p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-mono text-lg font-black text-[#D9F22A]">{item.code}</div>
                    <div className="mt-1 text-xs font-bold text-white">{discountText(item)}</div>
                    <div className="mt-2 text-[11px] text-white/45">
                      {eligibleNames.length
                        ? `Válido em: ${eligibleNames.slice(0, 3).join(', ')}${eligibleNames.length > 3 ? '…' : ''}`
                        : 'Válido para sua afiliação ativa.'}
                    </div>
                    {item.expiresAt && (
                      <div className="mt-1 text-[10px] text-white/35">
                        Validade: {new Date(item.expiresAt).toLocaleString('pt-BR')}
                      </div>
                    )}
                  </div>
                  <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-400">
                    Liberado
                  </span>
                </div>

                {url ? (
                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      onClick={() => void copy(url, item.id)}
                      className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 py-2.5 text-xs font-bold text-white"
                    >
                      {copied === item.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      {copied === item.id ? 'Link copiado' : 'Copiar link com cupom'}
                    </button>
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border border-white/10 p-2.5 text-[#D9F22A]"
                      title="Abrir link"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                ) : (
                  <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">
                    O cupom existe, mas nenhuma afiliação ativa sua está elegível para gerar o link agora.
                  </div>
                )}
              </article>
            );
          })}
          {filtered.length === 0 && (
            <div className="md:col-span-2 rounded-2xl border border-dashed border-white/10 p-10 text-center text-xs text-white/40">
              Nenhum cupom foi liberado para suas afiliações ativas.
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#D9F22A]">
            <Tag className="h-4 w-4" />
            Descontos reais
          </div>
          <h1 className="text-2xl font-black text-white font-['Syne']">Cupons</h1>
          <p className="mt-1 text-xs text-white/50">
            O desconto é validado no backend e aplicado ao pagamento único da Stripe. Assinaturas recorrentes usam preço recorrente próprio e não aceitam estes cupons.
          </p>
        </div>
        <button
          onClick={() => setModal(true)}
          disabled={!companyId || couponEligiblePlans.length === 0}
          className="flex gap-2 rounded-xl bg-[#D9F22A] px-4 py-2.5 text-xs font-black text-[#060A15] disabled:opacity-40"
        >
          <Plus className="h-4 w-4" />
          Novo cupom
        </button>
      </div>

      {error && (
        <div className="flex gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-white/30" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar cupom..."
          className="w-full rounded-xl border border-white/10 bg-[#080d1a] py-2.5 pl-10 pr-4 text-sm text-white"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {filtered.map((item) => {
          const url = companyLinkFor(item);
          return (
            <div key={item.id} className="rounded-2xl border border-white/10 bg-[#080d1a] p-5">
              <div className="flex justify-between gap-3">
                <div>
                  <div className="font-mono font-black text-[#D9F22A]">{item.code}</div>
                  <div className="mt-1 text-xs text-white/45">
                    {item.discountType === 'percentage' ? (
                      <><Percent className="inline h-3 w-3" /> {item.value}%</>
                    ) : (
                      <><DollarSign className="inline h-3 w-3" /> R$ {Number(item.value).toFixed(2)}</>
                    )}
                    {' · '}usados {item.usedCount || 0}{item.maxUses > 0 ? `/${item.maxUses}` : ''}
                  </div>
                </div>
                <button onClick={() => void remove(item)} className="p-2 text-red-400">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              {url && (
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => void copy(url, item.id)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 py-2 text-xs text-white"
                  >
                    {copied === item.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    Copiar link com cupom
                  </button>
                  <a href={url} target="_blank" rel="noreferrer" className="rounded-lg border border-white/10 p-2 text-[#D9F22A]">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="md:col-span-2 rounded-2xl border border-dashed border-white/10 p-10 text-center text-xs text-white/40">
            Nenhum cupom cadastrado.
          </div>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <form onSubmit={create} className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-[#080d1a] p-6 text-white">
            <button type="button" onClick={() => setModal(false)} className="absolute right-4 top-4 text-white/50">
              <X className="h-5 w-5" />
            </button>
            <h2 className="mb-5 font-bold">Criar cupom</h2>
            <div className="grid grid-cols-2 gap-3">
              <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="PROMO10" className="col-span-2 rounded-xl border border-white/10 bg-[#050811] p-3 text-sm uppercase" />
              <select value={type} onChange={(e) => setType(e.target.value as any)} className="rounded-xl border border-white/10 bg-[#050811] p-3 text-sm">
                <option value="percentage">Percentual</option>
                <option value="fixed">Valor fixo</option>
              </select>
              <input type="number" min="0.01" step="0.01" value={value} onChange={(e) => setValue(Number(e.target.value))} className="rounded-xl border border-white/10 bg-[#050811] p-3 text-sm" />
              <input type="number" min="0" value={maxUses} onChange={(e) => setMaxUses(Number(e.target.value))} placeholder="Máximo de usos" className="rounded-xl border border-white/10 bg-[#050811] p-3 text-sm" />
              <input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className="rounded-xl border border-white/10 bg-[#050811] p-3 text-sm" />
              <select value={planId} onChange={(e) => setPlanId(e.target.value)} className="rounded-xl border border-white/10 bg-[#050811] p-3 text-sm">
                <option value="all">Todos os produtos de pagamento único</option>
                {couponEligiblePlans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <select value={affiliateCode} onChange={(e) => setAffiliateCode(e.target.value)} className="rounded-xl border border-white/10 bg-[#050811] p-3 text-sm">
                <option value="all">Todos os afiliados</option>
                {uniqueAffiliates.map(([c, n]) => <option key={c} value={c}>{n} · {c}</option>)}
              </select>
            </div>
            <button className="mt-5 w-full rounded-xl bg-[#D9F22A] py-3 text-xs font-black text-[#060A15]">
              Salvar cupom
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
