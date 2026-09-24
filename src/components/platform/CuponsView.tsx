import React, { useState, useEffect, useMemo } from 'react';
import { 
  Tag, 
  Plus, 
  Copy, 
  Check, 
  Percent, 
  DollarSign, 
  Calendar, 
  Trash2, 
  Search, 
  X, 
  Sparkles,
  Users,
  Package,
  Share2,
  ExternalLink,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { CompanyPlan, UserAffiliation } from '../../types/platform';
import { saveCouponToFirebase, deleteCouponInFirebase, getCouponsFromFirebase } from '../../services/firestoreService';

export interface CouponItem {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  value: number;
  maxUses: number;
  usedCount: number;
  expiresAt: string;
  status: 'active' | 'expired' | 'paused';
  applicablePlans: string[]; // ['all'] or array of plan IDs
  applicablePlansNames?: string[];
  applicableAffiliates: string[]; // ['all'] or array of affiliate codes or IDs
  applicableAffiliatesNames?: string[];
  companyId?: string;
}

interface CuponsViewProps {
  plans?: CompanyPlan[];
  affiliations?: UserAffiliation[];
}

const STORAGE_KEY = 'leadspay_coupons_list';

export const CuponsView: React.FC<CuponsViewProps> = ({ plans = [], affiliations = [] }) => {
  // Deduplicate unique affiliates from affiliations list
  const uniqueAffiliates = useMemo(() => {
    const map = new Map<string, { id: string; name: string; code: string; email?: string }>();
    affiliations.forEach(a => {
      const code = a.affiliateCode || a.affiliate_code;
      const id = a.userId || a.user_id || a.affiliateId || code;
      const name = a.userName || a.affiliateName || 'Afiliado Parceiro';
      if (code && !map.has(code)) {
        map.set(code, { id: String(id), name, code, email: a.userEmail });
      }
    });
    return Array.from(map.values());
  }, [affiliations]);

  const [coupons, setCoupons] = useState<CouponItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Filtra qualquer cupom padrão antigo que possa ter ficado no storage local
          return parsed.filter((c: any) => c.code !== 'LEADSPAY10' && c.code !== 'VIP20' && c.code !== 'TECHIFY10' && c.code !== 'DESCONTO10');
        }
      }
    } catch (e) {
      console.error('Error loading coupons:', e);
    }
    return [];
  });

  // Carrega cupons reais persistidos no Firestore criados pelas empresas ou para afiliados
  useEffect(() => {
    let isMounted = true;
    const loadRealCoupons = async () => {
      try {
        const firstCompId = plans[0]?.companyId;
        const firestoreCoupons = await getCouponsFromFirebase(firstCompId);
        if (isMounted && firestoreCoupons && firestoreCoupons.length > 0) {
          // Filtra cupons hardcoded residuais
          const cleaned = firestoreCoupons.filter((c: any) => c.code !== 'LEADSPAY10' && c.code !== 'VIP20' && c.code !== 'TECHIFY10' && c.code !== 'DESCONTO10');
          setCoupons(cleaned);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
        }
      } catch (err) {
        console.warn('Aviso ao sincronizar cupons do Firestore:', err);
      }
    };
    loadRealCoupons();
    return () => {
      isMounted = false;
    };
  }, [plans]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(coupons));
    } catch (e) {
      console.error('Error saving coupons:', e);
    }
  }, [coupons]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterPlan, setFilterPlan] = useState<string>('all');
  const [filterAffiliate, setFilterAffiliate] = useState<string>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  // Form State
  const [formCode, setFormCode] = useState('');
  const [formType, setFormType] = useState<'percentage' | 'fixed'>('percentage');
  const [formValue, setFormValue] = useState<number>(10);
  const [formMaxUses, setFormMaxUses] = useState<number>(100);
  const [formExpiresAt, setFormExpiresAt] = useState('');
  const [planScope, setPlanScope] = useState<'all' | 'specific'>('all');
  const [selectedPlanIds, setSelectedPlanIds] = useState<string[]>([]);
  const [affiliateScope, setAffiliateScope] = useState<'all' | 'specific'>('all');
  const [selectedAffiliateCodes, setSelectedAffiliateCodes] = useState<string[]>([]);

  const handleCreateCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCode.trim()) return;

    const expiry = formExpiresAt || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR');

    // Resolve plan names
    let applicablePlans: string[] = ['all'];
    let applicablePlansNames: string[] = ['Todos os Produtos'];
    if (planScope === 'specific' && selectedPlanIds.length > 0) {
      applicablePlans = selectedPlanIds;
      applicablePlansNames = plans
        .filter(p => selectedPlanIds.includes(p.id))
        .map(p => p.name);
    }

    // Resolve affiliate names
    let applicableAffiliates: string[] = ['all'];
    let applicableAffiliatesNames: string[] = ['Todos os Afiliados'];
    if (affiliateScope === 'specific' && selectedAffiliateCodes.length > 0) {
      applicableAffiliates = selectedAffiliateCodes;
      applicableAffiliatesNames = uniqueAffiliates
        .filter(a => selectedAffiliateCodes.includes(a.code))
        .map(a => `${a.name} (${a.code})`);
    }

    const newCoupon: CouponItem = {
      id: `cup_${Date.now()}`,
      code: formCode.trim().toUpperCase().replace(/\s+/g, ''),
      discountType: formType,
      value: Number(formValue) || 10,
      maxUses: Number(formMaxUses) || 50,
      usedCount: 0,
      expiresAt: expiry,
      status: 'active',
      applicablePlans,
      applicablePlansNames,
      applicableAffiliates,
      applicableAffiliatesNames
    };

    setCoupons([newCoupon, ...coupons]);
    setIsCreateModalOpen(false);

    // Persiste no Firestore para sincronização global com checkouts
    try {
      saveCouponToFirebase(newCoupon, plans[0]?.companyId);
    } catch (e) {
      console.warn('Aviso ao sincronizar cupom no Firestore:', e);
    }

    // Reset Form
    setFormCode('');
    setFormValue(10);
    setFormMaxUses(100);
    setFormExpiresAt('');
    setPlanScope('all');
    setSelectedPlanIds([]);
    setAffiliateScope('all');
    setSelectedAffiliateCodes([]);
  };

  const handleDeleteCoupon = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este cupom de desconto?')) {
      setCoupons(coupons.filter(c => c.id !== id));
      try {
        deleteCouponInFirebase(id);
      } catch (e) {
        console.warn('Aviso ao excluir cupom do Firestore:', e);
      }
    }
  };

  const handleToggleStatus = (id: string) => {
    setCoupons(coupons.map(c => {
      if (c.id === id) {
        const nextStatus = c.status === 'active' ? 'paused' : 'active';
        const updated = {
          ...c,
          status: nextStatus as 'active' | 'paused'
        };
        try {
          saveCouponToFirebase(updated, plans[0]?.companyId);
        } catch (e) {
          console.warn('Aviso ao atualizar status do cupom no Firestore:', e);
        }
        return updated;
      }
      return c;
    }));
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleCopyAffiliateCouponLink = (coupon: CouponItem, affiliateCode?: string) => {
    const targetPlanId = (coupon.applicablePlans && coupon.applicablePlans[0] !== 'all')
      ? coupon.applicablePlans[0]
      : (plans[0]?.id || 'checkout');

    const affRef = affiliateCode || 
      (coupon.applicableAffiliates && coupon.applicableAffiliates[0] !== 'all' ? coupon.applicableAffiliates[0] : '');

    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://www.leadspay.com.br';
    const link = `${origin}/?checkout=${targetPlanId}${affRef ? `&ref=${affRef}` : ''}&coupon=${coupon.code}`;

    navigator.clipboard.writeText(link);
    setCopiedLink(coupon.id);
    setTimeout(() => setCopiedLink(null), 2500);
  };

  const filteredCoupons = coupons.filter(c => {
    const matchesSearch = c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.applicablePlansNames || []).some(n => n.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.applicableAffiliatesNames || []).some(n => n.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesPlan = filterPlan === 'all' 
      ? true 
      : (c.applicablePlans.includes('all') || c.applicablePlans.includes(filterPlan));

    const matchesAffiliate = filterAffiliate === 'all'
      ? true
      : (c.applicableAffiliates.includes('all') || c.applicableAffiliates.includes(filterAffiliate));

    return matchesSearch && matchesPlan && matchesAffiliate;
  });

  const activeCouponsCount = coupons.filter(c => c.status === 'active').length;
  const totalUsedCount = coupons.reduce((acc, c) => acc + c.usedCount, 0);

  return (
    <div className="space-y-6 animate-fadeIn" id="leadspay-cupons-view">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#D9F22A] mb-1">
            <Tag className="w-3.5 h-3.5" />
            Promoções & Vínculos de Afiliados
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-['Syne']">
            Cupons de Desconto
          </h1>
          <p className="text-sm text-white/60 mt-1">
            Vincule cupons diretamente aos produtos cadastrados e conceda permissão a afiliados parceiros para utilizarem em suas vendas.
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          tabIndex={0}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#D9F22A] hover:bg-[#c8e217] text-[#060A15] font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-[0_0_20px_rgba(217,242,42,0.3)] hover:scale-105 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Novo Cupom
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#080d1a] border border-white/10 rounded-2xl p-4.5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#D9F22A]/10 border border-[#D9F22A]/30 flex items-center justify-center text-[#D9F22A]">
            <Tag className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-white font-mono">{activeCouponsCount}</div>
            <div className="text-xs text-white/50 font-bold uppercase tracking-wider">Cupons Ativos</div>
          </div>
        </div>

        <div className="bg-[#080d1a] border border-white/10 rounded-2xl p-4.5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-white font-mono">{totalUsedCount}</div>
            <div className="text-xs text-white/50 font-bold uppercase tracking-wider">Usos em Checkouts</div>
          </div>
        </div>

        <div className="bg-[#080d1a] border border-white/10 rounded-2xl p-4.5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-white font-mono">{uniqueAffiliates.length}</div>
            <div className="text-xs text-white/50 font-bold uppercase tracking-wider">Afiliados Vinculáveis</div>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-[#080d1a] border border-white/10 rounded-2xl p-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por código, produto ou afiliado..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#050811] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#D9F22A]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Filter by Product */}
          <select
            value={filterPlan}
            onChange={(e) => setFilterPlan(e.target.value)}
            className="bg-[#050811] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#D9F22A] cursor-pointer"
          >
            <option value="all">Todos os Produtos ({plans.length})</option>
            {plans.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          {/* Filter by Affiliate */}
          <select
            value={filterAffiliate}
            onChange={(e) => setFilterAffiliate(e.target.value)}
            className="bg-[#050811] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#D9F22A] cursor-pointer"
          >
            <option value="all">Todos os Afiliados ({uniqueAffiliates.length})</option>
            {uniqueAffiliates.map(a => (
              <option key={a.code} value={a.code}>{a.name} ({a.code})</option>
            ))}
          </select>
        </div>
      </div>

      {/* Coupons Table / Grid */}
      <div className="bg-[#080d1a] border border-white/10 rounded-3xl overflow-hidden">
        {filteredCoupons.length === 0 ? (
          <div className="p-12 text-center">
            <Tag className="w-12 h-12 text-white/20 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white mb-1">Nenhum cupom encontrado</h3>
            <p className="text-xs text-white/50 max-w-sm mx-auto mb-4">
              Crie cupons promocionais para seus produtos e vincule-os a afiliados para aumentar a conversão.
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#D9F22A] text-[#060A15] font-black text-xs uppercase tracking-wider"
            >
              <Plus className="w-4 h-4" /> Criar Primeiro Cupom
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/5 border-b border-white/10 text-white/50 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-4">Código do Cupom</th>
                  <th className="p-4">Desconto</th>
                  <th className="p-4">Produtos Vinculados</th>
                  <th className="p-4">Afiliados Autorizados</th>
                  <th className="p-4">Usos / Limite</th>
                  <th className="p-4">Validade</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredCoupons.map((coupon) => (
                  <tr key={coupon.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-white text-sm bg-white/5 px-2.5 py-1 rounded-lg border border-white/10">
                          {coupon.code}
                        </span>
                        <button
                          onClick={() => handleCopyCode(coupon.code)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
                          title="Copiar Código"
                        >
                          {copiedCode === coupon.code ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>

                    <td className="p-4">
                      <div className="inline-flex items-center gap-1 font-bold text-[#D9F22A] font-mono">
                        {coupon.discountType === 'percentage' ? (
                          <>
                            <Percent className="w-3.5 h-3.5" />
                            {coupon.value}% OFF
                          </>
                        ) : (
                          <>
                            <DollarSign className="w-3.5 h-3.5" />
                            R$ {Number(coupon.value).toFixed(2)} OFF
                          </>
                        )}
                      </div>
                    </td>

                    {/* Produtos Vinculados */}
                    <td className="p-4">
                      {coupon.applicablePlans.includes('all') ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          <Package className="w-3 h-3" />
                          Todos os Produtos
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {(coupon.applicablePlansNames || coupon.applicablePlans).map((name, idx) => (
                            <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-white/10 text-white/90 border border-white/10">
                              <Package className="w-2.5 h-2.5 text-[#D9F22A]" />
                              {name}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>

                    {/* Afiliados Autorizados */}
                    <td className="p-4">
                      {coupon.applicableAffiliates.includes('all') ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/20">
                          <Users className="w-3 h-3" />
                          Todos os Afiliados
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {(coupon.applicableAffiliatesNames || coupon.applicableAffiliates).map((aff, idx) => (
                            <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                              <Users className="w-2.5 h-2.5 text-emerald-400" />
                              {aff}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>

                    <td className="p-4">
                      <div className="font-mono font-bold text-white">
                        {coupon.usedCount} / {coupon.maxUses}
                      </div>
                      <div className="w-20 bg-white/10 rounded-full h-1.5 mt-1 overflow-hidden">
                        <div 
                          className="bg-[#D9F22A] h-full rounded-full transition-all"
                          style={{ width: `${Math.min(100, (coupon.usedCount / coupon.maxUses) * 100)}%` }}
                        />
                      </div>
                    </td>

                    <td className="p-4 text-white/70 font-mono">
                      {coupon.expiresAt}
                    </td>

                    <td className="p-4">
                      <button
                        onClick={() => handleToggleStatus(coupon.id)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer transition-all ${
                          coupon.status === 'active' 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20' 
                            : 'bg-white/10 text-white/50 border border-white/10 hover:bg-white/15'
                        }`}
                        title="Clique para alternar status"
                      >
                        {coupon.status === 'active' ? 'Ativo' : 'Pausado'}
                      </button>
                    </td>

                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Botão para copiar link rápido de checkout com cupom & afiliado */}
                        <button
                          onClick={() => handleCopyAffiliateCouponLink(coupon)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-[#D9F22A] text-white/80 hover:text-[#060A15] transition-colors cursor-pointer"
                          title="Copiar Link Pronto de Venda com Cupom"
                        >
                          {copiedLink === coupon.id ? (
                            <Check className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <Share2 className="w-4 h-4" />
                          )}
                        </button>

                        <button
                          onClick={() => handleDeleteCoupon(coupon.id)}
                          className="p-1.5 rounded-lg text-red-400/70 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                          title="Excluir Cupom"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Criar Novo Cupom */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#080d1a] border border-white/15 rounded-3xl w-full max-w-xl p-6 relative shadow-2xl animate-in zoom-in-95 duration-200 my-8">
            <button
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#D9F22A] mb-1">
              <Tag className="w-3.5 h-3.5" />
              Novo Cupom de Desconto
            </div>
            <h2 className="text-xl font-black text-white font-['Syne']">
              Criar & Vincular Cupom
            </h2>
            <p className="text-xs text-white/50 mt-1 mb-5">
              Defina o código, os produtos da empresa aos quais o cupom se aplica e os afiliados autorizados a divulgá-lo.
            </p>

            <form onSubmit={handleCreateCoupon} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-white/80 mb-1 uppercase tracking-wider">
                  Código do Cupom *
                </label>
                <input
                  type="text"
                  required
                  placeholder="EX: PROMO20, AFILIADOVIP, BLACKFRIDAY"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                  className="w-full bg-[#050811] border border-white/15 rounded-xl px-4 py-2.5 text-sm font-mono font-bold text-white placeholder-white/20 focus:outline-none focus:border-[#D9F22A]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-white/80 mb-1 uppercase tracking-wider">
                    Tipo de Desconto
                  </label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as any)}
                    className="w-full bg-[#050811] border border-white/15 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#D9F22A] cursor-pointer"
                  >
                    <option value="percentage">Porcentagem (%)</option>
                    <option value="fixed">Fixo (R$)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-white/80 mb-1 uppercase tracking-wider">
                    {formType === 'percentage' ? 'Valor (%)' : 'Valor (R$)'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={formType === 'percentage' ? 100 : 99999}
                    required
                    value={formValue}
                    onChange={(e) => setFormValue(Number(e.target.value))}
                    className="w-full bg-[#050811] border border-white/15 rounded-xl px-4 py-2.5 text-xs font-mono font-bold text-white focus:outline-none focus:border-[#D9F22A]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-white/80 mb-1 uppercase tracking-wider">
                    Limite de Usos
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formMaxUses}
                    onChange={(e) => setFormMaxUses(Number(e.target.value))}
                    className="w-full bg-[#050811] border border-white/15 rounded-xl px-4 py-2.5 text-xs font-mono font-bold text-white focus:outline-none focus:border-[#D9F22A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-white/80 mb-1 uppercase tracking-wider">
                    Data de Validade
                  </label>
                  <input
                    type="text"
                    placeholder="31/12/2026"
                    value={formExpiresAt}
                    onChange={(e) => setFormExpiresAt(e.target.value)}
                    className="w-full bg-[#050811] border border-white/15 rounded-xl px-4 py-2.5 text-xs font-mono text-white placeholder-white/30 focus:outline-none focus:border-[#D9F22A]"
                  />
                </div>
              </div>

              {/* SEÇÃO: Vincular aos Produtos da Empresa */}
              <div className="p-3.5 bg-[#050811] border border-white/10 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
                    <Package className="w-3.5 h-3.5 text-[#D9F22A]" />
                    Vincular a Produtos da Empresa
                  </div>
                  <div className="flex items-center gap-3 text-xs text-white/70">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input 
                        type="radio" 
                        name="planScope" 
                        checked={planScope === 'all'} 
                        onChange={() => setPlanScope('all')} 
                        className="accent-[#D9F22A]"
                      />
                      <span>Todos</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input 
                        type="radio" 
                        name="planScope" 
                        checked={planScope === 'specific'} 
                        onChange={() => setPlanScope('specific')} 
                        className="accent-[#D9F22A]"
                      />
                      <span>Específicos</span>
                    </label>
                  </div>
                </div>

                {planScope === 'specific' && (
                  <div className="pt-2 border-t border-white/5 space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {plans.length === 0 ? (
                      <p className="text-[11px] text-white/40 italic">Nenhum produto cadastrado no momento.</p>
                    ) : (
                      plans.map(p => {
                        const isChecked = selectedPlanIds.includes(p.id);
                        return (
                          <label key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer text-xs text-white">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedPlanIds([...selectedPlanIds, p.id]);
                                  } else {
                                    setSelectedPlanIds(selectedPlanIds.filter(id => id !== p.id));
                                  }
                                }}
                                className="accent-[#D9F22A] rounded"
                              />
                              <span className="font-semibold">{p.name}</span>
                            </div>
                            <span className="text-[10px] text-white/50 font-mono">
                              R$ {Number(p.priceSetup || 0).toFixed(2)}
                            </span>
                          </label>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* SEÇÃO: Vincular a Afiliados */}
              <div className="p-3.5 bg-[#050811] border border-white/10 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
                    <Users className="w-3.5 h-3.5 text-emerald-400" />
                    Vincular a Afiliados Parceiros
                  </div>
                  <div className="flex items-center gap-3 text-xs text-white/70">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input 
                        type="radio" 
                        name="affiliateScope" 
                        checked={affiliateScope === 'all'} 
                        onChange={() => setAffiliateScope('all')} 
                        className="accent-[#D9F22A]"
                      />
                      <span>Todos</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input 
                        type="radio" 
                        name="affiliateScope" 
                        checked={affiliateScope === 'specific'} 
                        onChange={() => setAffiliateScope('specific')} 
                        className="accent-[#D9F22A]"
                      />
                      <span>Específicos</span>
                    </label>
                  </div>
                </div>

                {affiliateScope === 'specific' && (
                  <div className="pt-2 border-t border-white/5 space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {uniqueAffiliates.length === 0 ? (
                      <p className="text-[11px] text-white/40 italic">Nenhum afiliado parceiro aprovado ainda.</p>
                    ) : (
                      uniqueAffiliates.map(a => {
                        const isChecked = selectedAffiliateCodes.includes(a.code);
                        return (
                          <label key={a.code} className="flex items-center justify-between p-2 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer text-xs text-white">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedAffiliateCodes([...selectedAffiliateCodes, a.code]);
                                  } else {
                                    setSelectedAffiliateCodes(selectedAffiliateCodes.filter(c => c !== a.code));
                                  }
                                }}
                                className="accent-[#D9F22A] rounded"
                              />
                              <div>
                                <span className="font-semibold block">{a.name}</span>
                                <span className="text-[10px] text-emerald-400 font-mono">Ref: {a.code}</span>
                              </div>
                            </div>
                            <span className="text-[10px] text-white/50">{a.email || 'Afiliado Ativo'}</span>
                          </label>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  className="w-full bg-[#D9F22A] hover:bg-[#c8e217] text-[#060A15] font-black py-3 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer shadow-[0_0_20px_rgba(217,242,42,0.3)] hover:scale-[1.02] active:scale-[0.98]"
                >
                  Salvar e Ativar Cupom
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
