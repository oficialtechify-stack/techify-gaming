import React, { useState } from 'react';
import { 
  Tag, 
  Plus, 
  Copy, 
  Check, 
  Percent, 
  DollarSign, 
  Calendar, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  XCircle, 
  Zap,
  Clock,
  Sparkles,
  Search,
  X
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
  applicablePlans: string[]; // plan ids or 'all'
}

interface CuponsViewProps {
  plans?: CompanyPlan[];
}

export const CuponsView: React.FC<CuponsViewProps> = ({ plans = [] }) => {
  const [coupons, setCoupons] = useState<CouponItem[]>([
    {
      id: 'cup_01',
      code: 'LEADS10',
      discountType: 'percentage',
      value: 10,
      maxUses: 100,
      usedCount: 28,
      expiresAt: '31/12/2026',
      status: 'active',
      applicablePlans: ['all']
    },
    {
      id: 'cup_02',
      code: 'STARTUPVIP',
      discountType: 'fixed',
      value: 150,
      maxUses: 50,
      usedCount: 14,
      expiresAt: '15/11/2026',
      status: 'active',
      applicablePlans: ['all']
    },
    {
      id: 'cup_03',
      code: 'BLACKFRIDAY',
      discountType: 'percentage',
      value: 30,
      maxUses: 200,
      usedCount: 0,
      expiresAt: '30/11/2026',
      status: 'paused',
      applicablePlans: ['all']
    }
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // New Coupon Form
  const [formCode, setFormCode] = useState('');
  const [formType, setFormType] = useState<'percentage' | 'fixed'>('percentage');
  const [formValue, setFormValue] = useState<number>(10);
  const [formMaxUses, setFormMaxUses] = useState<number>(100);
  const [formExpiresAt, setFormExpiresAt] = useState('31/12/2026');

  const handleCreateCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCode.trim()) return;

    const newCoupon: CouponItem = {
      id: `cup_${Date.now()}`,
      code: formCode.trim().toUpperCase(),
      discountType: formType,
      value: Number(formValue) || 10,
      maxUses: Number(formMaxUses) || 50,
      usedCount: 0,
      expiresAt: formExpiresAt || '31/12/2026',
      status: 'active',
      applicablePlans: ['all']
    };

    setCoupons([newCoupon, ...coupons]);
    setIsCreateModalOpen(false);
    setFormCode('');
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
            {coupons.filter(c => c.status === 'active').length}
          </div>
          <span className="text-[11px] text-[#D9F22A] font-semibold mt-1 block">Prontos para checkout</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#080d1a] border border-white/10">
          <span className="text-xs font-bold uppercase tracking-wider text-white/50 block">Total de Resgates</span>
          <div className="text-2xl font-black text-white font-['Syne'] mt-1">
            {coupons.reduce((acc, c) => acc + c.usedCount, 0)}
          </div>
          <span className="text-[11px] text-white/40 mt-1 block">Vendas incentivadas</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#080d1a] border border-white/10">
          <span className="text-xs font-bold uppercase tracking-wider text-white/50 block">Desconto Médio</span>
          <div className="text-2xl font-black text-[#D9F22A] font-['Syne'] mt-1">15%</div>
          <span className="text-[11px] text-white/40 mt-1 block">Configuração padrão</span>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-[#080d1a] border border-white/10 p-4 rounded-2xl flex items-center justify-between gap-4">
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
        <span className="text-xs text-white/50 hidden sm:block">
          {filteredCoupons.length} {filteredCoupons.length === 1 ? 'cupom' : 'cupons'} cadastrados
        </span>
      </div>

      {/* Coupons Table */}
      <div className="bg-[#080d1a] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02] text-white/50 uppercase tracking-wider font-bold">
                <th className="p-4">Código do Cupom</th>
                <th className="p-4">Desconto</th>
                <th className="p-4">Usos / Limite</th>
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
                        className="text-white/40 hover:text-white p-1 cursor-pointer transition-colors"
                        title="Copiar código"
                      >
                        {copiedCode === coupon.code ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </td>
                  <td className="p-4 font-black text-white">
                    {coupon.discountType === 'percentage' ? `${coupon.value}% OFF` : `R$ ${coupon.value.toFixed(2)} OFF`}
                  </td>
                  <td className="p-4 text-white/80 font-mono">
                    {coupon.usedCount} / {coupon.maxUses}
                  </td>
                  <td className="p-4 text-white/60 font-mono">
                    {coupon.expiresAt}
                  </td>
                  <td className="p-4">
                    {coupon.status === 'active' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        <CheckCircle2 className="w-3 h-3" /> Ativo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                        <Clock className="w-3 h-3" /> Pausado
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => handleDeleteCoupon(coupon.id)}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-white/50 hover:text-rose-400 transition-colors cursor-pointer"
                      title="Excluir cupom"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Coupon Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-md bg-[#080d1a] border border-white/15 rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <h3 className="text-lg font-black text-white font-['Syne']">
                Criar Novo Cupom
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/70 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCoupon} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-1">
                  Código Promocional (Sem espaços) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: PROMO2026"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                  className="w-full bg-[#050811] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono uppercase focus:outline-none focus:border-[#D9F22A]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-1">
                    Tipo de Desconto
                  </label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as any)}
                    className="w-full bg-[#050811] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#D9F22A]"
                  >
                    <option value="percentage">Porcentagem (%)</option>
                    <option value="fixed">Valor Fixo (R$)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-1">
                    {formType === 'percentage' ? 'Valor (%)' : 'Valor (R$)'} *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formValue}
                    onChange={(e) => setFormValue(Number(e.target.value))}
                    className="w-full bg-[#050811] border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#D9F22A]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-1">
                    Limite Máximo de Usos
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formMaxUses}
                    onChange={(e) => setFormMaxUses(Number(e.target.value))}
                    className="w-full bg-[#050811] border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#D9F22A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-1">
                    Data de Expiração
                  </label>
                  <input
                    type="text"
                    value={formExpiresAt}
                    onChange={(e) => setFormExpiresAt(e.target.value)}
                    placeholder="31/12/2026"
                    className="w-full bg-[#050811] border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#D9F22A]"
                  />
                </div>
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 rounded-xl bg-[#D9F22A] hover:bg-[#cbe31c] text-[#060A15] font-black text-xs uppercase tracking-wider cursor-pointer shadow-lg shadow-[#D9F22A]/20"
                >
                  Salvar Cupom
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
