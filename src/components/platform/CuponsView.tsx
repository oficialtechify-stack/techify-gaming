import React, { useState, useEffect } from 'react';
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
  Sparkles
} from 'lucide-react';
import { CompanyPlan } from '../../types/platform';

interface CouponItem {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  value: number;
  maxUses: number;
  usedCount: number;
  expiresAt: string;
  status: 'active' | 'expired' | 'paused';
  applicablePlans: string[];
}

interface CuponsViewProps {
  plans?: CompanyPlan[];
}

const STORAGE_KEY = 'leadspay_coupons_list';

export const CuponsView: React.FC<CuponsViewProps> = ({ plans = [] }) => {
  const [coupons, setCoupons] = useState<CouponItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(coupons));
    } catch (e) {
      console.error(e);
    }
  }, [coupons]);

  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // New Coupon Form
  const [formCode, setFormCode] = useState('');
  const [formType, setFormType] = useState<'percentage' | 'fixed'>('percentage');
  const [formValue, setFormValue] = useState<number>(10);
  const [formMaxUses, setFormMaxUses] = useState<number>(100);
  const [formExpiresAt, setFormExpiresAt] = useState('');

  const handleCreateCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCode.trim()) return;

    const expiry = formExpiresAt || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR');

    const newCoupon: CouponItem = {
      id: `cup_${Date.now()}`,
      code: formCode.trim().toUpperCase().replace(/\s+/g, ''),
      discountType: formType,
      value: Number(formValue) || 10,
      maxUses: Number(formMaxUses) || 50,
      usedCount: 0,
      expiresAt: expiry,
      status: 'active',
      applicablePlans: ['all']
    };

    setCoupons([newCoupon, ...coupons]);
    setIsCreateModalOpen(false);
    setFormCode('');
    setFormValue(10);
    setFormMaxUses(100);
    setFormExpiresAt('');
  };

  const handleDeleteCoupon = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este cupom de desconto?')) {
      setCoupons(coupons.filter(c => c.id !== id));
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const filteredCoupons = coupons.filter(c => 
    c.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeCouponsCount = coupons.filter(c => c.status === 'active').length;
  const totalUsedCount = coupons.reduce((acc, c) => acc + c.usedCount, 0);
  const avgDiscount = coupons.length > 0 
    ? Math.round(coupons.reduce((acc, c) => acc + (c.discountType === 'percentage' ? c.value : 10), 0) / coupons.length) 
    : 0;

  return (
    <div className="space-y-6 animate-fadeIn" id="leadspay-cupons-view">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#D9F22A] mb-1">
            <Tag className="w-3.5 h-3.5" />
            Promoções & Conversão
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-['Syne']">
            Cupons de Desconto
          </h1>
          <p className="text-xs text-white/60 mt-1 max-w-xl">
            Crie códigos promocionais para aumentar a conversão de vendas nos checkouts e conceder condições especiais a leads.
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-[#D9F22A] hover:bg-[#c8e217] text-[#060A15] font-black px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(217,242,42,0.3)] self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Criar Novo Cupom</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-[#080d1a] border border-white/10">
          <span className="text-xs font-bold uppercase tracking-wider text-white/50 block">Cupons Ativos</span>
          <div className="text-2xl font-black text-white font-['Syne'] mt-1">
            {activeCouponsCount}
          </div>
          <span className="text-[11px] text-[#D9F22A] font-semibold mt-1 block">
            {activeCouponsCount > 0 ? 'Disponíveis no checkout' : 'Nenhum cupom ativo'}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[#080d1a] border border-white/10">
          <span className="text-xs font-bold uppercase tracking-wider text-white/50 block">Total de Resgates</span>
          <div className="text-2xl font-black text-white font-['Syne'] mt-1">
            {totalUsedCount}
          </div>
          <span className="text-[11px] text-white/40 mt-1 block">Vendas incentivadas</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#080d1a] border border-white/10">
          <span className="text-xs font-bold uppercase tracking-wider text-white/50 block">Desconto Médio</span>
          <div className="text-2xl font-black text-[#D9F22A] font-['Syne'] mt-1">
            {avgDiscount > 0 ? `${avgDiscount}%` : '0%'}
          </div>
          <span className="text-[11px] text-white/40 mt-1 block">Média configurada</span>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-[#080d1a] border border-white/10 p-4 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por código de cupom..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#050811] border border-white/15 rounded-xl pl-10 pr-4 py-2 text-xs text-white focus:outline-none focus:border-[#D9F22A]"
          />
        </div>

        <div className="text-xs text-white/50">
          Total de {coupons.length} {coupons.length === 1 ? 'cupom' : 'cupons'}
        </div>
      </div>

      {/* Coupons Table / Empty State */}
      <div className="bg-[#080d1a] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
        {filteredCoupons.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 mb-3">
              <Tag className="w-7 h-7 text-[#D9F22A]/60" />
            </div>
            <h3 className="text-base font-bold text-white font-['Syne']">
              Nenhum cupom cadastrado ainda
            </h3>
            <p className="text-xs text-white/50 max-w-md mt-1.5 mb-4">
              Crie cupons promocionais para disponibilizar descontos especiais aos seus afiliados e compradores nos checkouts oficiais.
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-[#D9F22A] hover:bg-[#c8e217] text-[#060A15] font-black px-4 py-2 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Criar Primeiro Cupom</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[650px]">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02] text-white/50 uppercase tracking-wider font-bold">
                  <th className="p-4">Código</th>
                  <th className="p-4">Tipo & Desconto</th>
                  <th className="p-4">Uso / Limite</th>
                  <th className="p-4">Validade</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredCoupons.map((coupon) => (
                  <tr key={coupon.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-sm text-[#D9F22A] bg-[#D9F22A]/10 border border-[#D9F22A]/20 px-2.5 py-1 rounded-lg">
                          {coupon.code}
                        </span>
                        <button
                          onClick={() => handleCopyCode(coupon.code)}
                          className="p-1 rounded-md text-white/50 hover:text-white transition-colors cursor-pointer"
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
                      <div className="font-bold text-white">
                        {coupon.discountType === 'percentage' ? `${coupon.value}% OFF` : `R$ ${coupon.value.toFixed(2)} OFF`}
                      </div>
                      <div className="text-[10px] text-white/40">
                        {coupon.discountType === 'percentage' ? 'Percentual' : 'Valor Fixo'}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="font-mono font-bold text-white">
                        {coupon.usedCount} / {coupon.maxUses}
                      </div>
                      <div className="w-24 bg-white/10 rounded-full h-1.5 mt-1 overflow-hidden">
                        <div 
                          className="bg-[#D9F22A] h-full rounded-full"
                          style={{ width: `${Math.min(100, (coupon.usedCount / coupon.maxUses) * 100)}%` }}
                        />
                      </div>
                    </td>
                    <td className="p-4 text-white/70 font-mono">
                      {coupon.expiresAt}
                    </td>
                    <td className="p-4">
                      {coupon.status === 'active' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          Ativo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-white/50">
                          Pausado
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleDeleteCoupon(coupon.id)}
                        className="p-1.5 rounded-lg text-red-400/70 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                        title="Excluir Cupom"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#080d1a] border border-white/10 rounded-3xl w-full max-w-md p-6 relative shadow-2xl animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#D9F22A] mb-1">
              <Tag className="w-3.5 h-3.5" />
              Novo Desconto
            </div>
            <h2 className="text-xl font-black text-white font-['Syne']">
              Criar Cupom de Desconto
            </h2>
            <p className="text-xs text-white/50 mt-1 mb-6">
              Configure o código que os clientes aplicarão na página de checkout.
            </p>

            <form onSubmit={handleCreateCoupon} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-white/70 mb-1.5 uppercase tracking-wider">
                  Código do Cupom
                </label>
                <input
                  type="text"
                  required
                  placeholder="EX: PROMO10, DESCONTOVIP"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                  className="w-full bg-[#050811] border border-white/15 rounded-xl px-4 py-2.5 text-sm font-mono font-bold text-white placeholder-white/20 focus:outline-none focus:border-[#D9F22A]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-white/70 mb-1.5 uppercase tracking-wider">
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
                  <label className="block text-xs font-bold text-white/70 mb-1.5 uppercase tracking-wider">
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
                  <label className="block text-xs font-bold text-white/70 mb-1.5 uppercase tracking-wider">
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
                  <label className="block text-xs font-bold text-white/70 mb-1.5 uppercase tracking-wider">
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

              <div className="pt-3">
                <button
                  type="submit"
                  className="w-full bg-[#D9F22A] hover:bg-[#c8e217] text-[#060A15] font-black py-3 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer shadow-[0_0_20px_rgba(217,242,42,0.3)] flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>Salvar & Ativar Cupom</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
