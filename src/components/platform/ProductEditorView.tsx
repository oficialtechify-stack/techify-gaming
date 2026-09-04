import React, { useState } from 'react';
import { 
  CompanyPlan, 
  ProductOrderBump, 
  ProductUpsell, 
  ProductCoupon, 
  ProductCustomCheckout 
} from '../../types/platform';
import { 
  ArrowLeft, 
  Save, 
  Trash2, 
  Upload, 
  Image as ImageIcon, 
  Plus, 
  Search, 
  MoreVertical, 
  Link2, 
  ExternalLink, 
  Copy, 
  Check, 
  ShieldCheck, 
  Tag, 
  DollarSign, 
  Layers, 
  Users, 
  Sparkles,
  Edit3,
  Eye,
  Percent,
  CheckCircle2,
  X,
  CreditCard
} from 'lucide-react';
import { PLATFORM_CHECKOUT_FEE } from '../checkout/CustomCheckoutPage';

interface ProductEditorViewProps {
  plan: CompanyPlan;
  onSave: (updatedPlan: Partial<CompanyPlan>) => void;
  onDelete: (planId: string, companyId?: string) => void;
  onBack: () => void;
  onOpenCheckout: (plan: CompanyPlan, checkoutSlug?: string) => void;
}

export const ProductEditorView: React.FC<ProductEditorViewProps> = ({
  plan,
  onSave,
  onDelete,
  onBack,
  onOpenCheckout
}) => {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<
    'geral' | 'configuracoes' | 'order_bump' | 'upsell' | 'checkout' | 'coproducao' | 'cupons' | 'afiliados' | 'links'
  >('geral');

  // Form states (Geral)
  const [name, setName] = useState<string>(plan.name || '');
  const [description, setDescription] = useState<string>(plan.description || '');
  const [category, setCategory] = useState<string>(plan.category || 'Vendas & Automação');
  const [paymentType, setPaymentType] = useState<'Único' | 'Recorrente' | 'Assinatura'>(plan.paymentType || 'Único');
  const [bannerImage, setBannerImage] = useState<string>(plan.bannerImage || 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1000&q=80');

  // Form states (Configurações)
  const [priceSetup, setPriceSetup] = useState<number>(plan.priceSetup || 197.00);
  const [priceMonthly, setPriceMonthly] = useState<number>(plan.priceMonthly || 0);
  const [commissionPercentage, setCommissionPercentage] = useState<number>(plan.commissionPercentage || 30);
  const [supportEmail, setSupportEmail] = useState<string>(plan.supportEmail || 'suporte@empresa.com.br');
  const [warrantyDays, setWarrantyDays] = useState<number>(plan.warrantyDays || 7);
  const [thankYouPageUrl, setThankYouPageUrl] = useState<string>(plan.thankYouPageUrl || '');
  const [badge, setBadge] = useState<string>(plan.badge || 'Mais Vendido');

  // Checkout list
  const defaultCheckout: ProductCustomCheckout = {
    id: 'chk-default',
    name: 'Checkout Principal',
    isDefault: true,
    price: priceSetup,
    offerName: `${name} • Tração & Vendas`,
    visitsCount: 18,
    salesCount: plan.totalSales || 0,
    checkoutSlug: plan.id
  };

  const [checkouts, setCheckouts] = useState<ProductCustomCheckout[]>(
    plan.customCheckouts && plan.customCheckouts.length > 0 ? plan.customCheckouts : [defaultCheckout]
  );
  const [checkoutSearch, setCheckoutSearch] = useState<string>('');
  const [activeCheckoutMenu, setActiveCheckoutMenu] = useState<string | null>(null);
  const [isAddCheckoutModalOpen, setIsAddCheckoutModalOpen] = useState<boolean>(false);
  const [newCheckoutName, setNewCheckoutName] = useState<string>('');
  const [newCheckoutPrice, setNewCheckoutPrice] = useState<number>(priceSetup);
  const [newCheckoutOffer, setNewCheckoutOffer] = useState<string>('');

  // Coupons
  const [coupons, setCoupons] = useState<ProductCoupon[]>(
    plan.coupons || [
      { id: 'c-1', code: 'LEADSPAY10', discountType: 'percentage', discountValue: 10, active: true, usedCount: 5 }
    ]
  );
  const [newCouponCode, setNewCouponCode] = useState<string>('');
  const [newCouponDiscount, setNewCouponDiscount] = useState<number>(10);
  const [newCouponType, setNewCouponType] = useState<'percentage' | 'fixed'>('percentage');

  // Order Bumps
  const [orderBumps, setOrderBumps] = useState<ProductOrderBump[]>(
    plan.orderBumps || [
      { id: 'ob-1', name: 'Templates Prontos de Alta Conversão', description: 'Leve junto mais de 50 templates validados para dobrar suas vendas.', price: 29.90, active: true }
    ]
  );

  // Copied link toast state
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://leadspay.com';
  const directCheckoutUrl = `${currentOrigin}?checkout=${plan.id}`;
  const salesPageUrl = `${currentOrigin}?product=${plan.id}`;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(id);
    setTimeout(() => setCopiedLink(null), 3000);
  };

  const handleSaveProduct = () => {
    const commissionValue = Number(((priceSetup * commissionPercentage) / 100).toFixed(2));
    
    onSave({
      name,
      description,
      category,
      paymentType,
      bannerImage,
      priceSetup,
      priceMonthly,
      commissionPercentage,
      commissionValue,
      supportEmail,
      warrantyDays,
      thankYouPageUrl,
      badge,
      customCheckouts: checkouts,
      coupons,
      orderBumps
    });
  };

  const handleAddCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCheckoutName.trim()) return;

    const newChk: ProductCustomCheckout = {
      id: `chk-${Date.now()}`,
      name: newCheckoutName.trim(),
      isDefault: false,
      price: newCheckoutPrice || priceSetup,
      offerName: newCheckoutOffer || `${newCheckoutName} Especial`,
      visitsCount: 0,
      salesCount: 0,
      checkoutSlug: `${plan.id}-${Date.now().toString().slice(-4)}`
    };

    setCheckouts([...checkouts, newChk]);
    setNewCheckoutName('');
    setIsAddCheckoutModalOpen(false);
  };

  const handleDeleteCheckout = (chkId: string) => {
    if (checkouts.length <= 1) {
      alert('O produto precisa ter pelo menos um checkout configurado.');
      return;
    }
    setCheckouts(checkouts.filter(c => c.id !== chkId));
    setActiveCheckoutMenu(null);
  };

  const handleAddCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCouponCode.trim()) return;

    const newC: ProductCoupon = {
      id: `c-${Date.now()}`,
      code: newCouponCode.trim().toUpperCase(),
      discountType: newCouponType,
      discountValue: newCouponDiscount,
      active: true,
      usedCount: 0
    };

    setCoupons([...coupons, newC]);
    setNewCouponCode('');
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#070b14] text-white -m-3.5 sm:-m-5 md:-m-6 lg:-m-8 p-4 sm:p-6 lg:p-8 animate-in fade-in duration-200">
      {/* Top Navbar */}
      <div className="flex items-center justify-between pb-5 border-b border-white/10 mb-6">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-bold text-white/70 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>

        <button
          type="button"
          onClick={handleSaveProduct}
          className="bg-[#208b68] hover:bg-[#1a7356] text-white font-black px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider shadow-lg transition-all cursor-pointer flex items-center gap-2"
        >
          <Save className="w-4 h-4" /> Salvar Produto
        </button>
      </div>

      {/* Main Subtabs Header */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-3 mb-6 border-b border-white/10 no-scrollbar">
        {[
          { id: 'geral', label: 'Geral' },
          { id: 'configuracoes', label: 'Configurações' },
          { id: 'order_bump', label: 'Order Bump' },
          { id: 'upsell', label: 'Upsell / Downsell' },
          { id: 'checkout', label: 'Checkout' },
          { id: 'coproducao', label: 'Coprodução' },
          { id: 'cupons', label: 'Cupons' },
          { id: 'afiliados', label: 'Afiliados' },
          { id: 'links', label: 'Links' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-white/15 text-white shadow-sm border border-white/20'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: GERAL (Image 4) */}
      {activeTab === 'geral' && (
        <div className="space-y-6 max-w-4xl">
          {/* Helper Callout Box */}
          <div className="p-4 rounded-2xl bg-[#0b1322] border border-white/10">
            <h3 className="text-sm font-black text-white font-['Syne'] mb-1">
              Produto
            </h3>
            <p className="text-xs text-white/60 leading-relaxed">
              A aprovação do produto é instantânea, ou seja, você pode cadastrar e já começar a vender. A imagem do produto será exibida na área de membros e no seu programa de afiliados.
            </p>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            {/* Nome do Produto */}
            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1.5">
                Nome do produto
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Starter • Tração & Vendas"
                className="w-full bg-[#050811] border border-white/15 focus:border-[#208b68] rounded-xl px-4 py-3 text-xs text-white placeholder-white/30 focus:outline-none"
              />
            </div>

            {/* Descrição */}
            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1.5">
                Descrição
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva detalhadamente o produto, diferenciais e público-alvo..."
                className="w-full bg-[#050811] border border-white/15 focus:border-[#208b68] rounded-xl px-4 py-3 text-xs text-white placeholder-white/30 focus:outline-none"
              />
            </div>

            {/* Categoria & Tipo de Pagamento */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1.5">
                  Categoria
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-[#050811] border border-white/15 focus:border-[#208b68] rounded-xl px-4 py-3 text-xs text-white focus:outline-none cursor-pointer"
                >
                  <option value="Vendas & Automação">Vendas & Automação</option>
                  <option value="Marketing Digital">Marketing Digital</option>
                  <option value="SaaS & Software">SaaS & Software</option>
                  <option value="Educação & Cursos">Educação & Cursos</option>
                  <option value="Finanças & Gestão">Finanças & Gestão</option>
                  <option value="IA & Produtividade">IA & Produtividade</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1.5">
                  Tipo de pagamento
                </label>
                <select
                  value={paymentType}
                  onChange={(e) => setPaymentType(e.target.value as any)}
                  className="w-full bg-[#050811] border border-white/15 focus:border-[#208b68] rounded-xl px-4 py-3 text-xs text-white focus:outline-none cursor-pointer"
                >
                  <option value="Único">Pagamento Único</option>
                  <option value="Recorrente">Recorrente / Mensal</option>
                  <option value="Assinatura">Assinatura Anual</option>
                </select>
              </div>
            </div>

            {/* Imagem do Produto Box (Image 4) */}
            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1.5">
                Imagem do Produto
              </label>

              <div className="p-6 rounded-2xl bg-[#050811] border-2 border-dashed border-white/15 flex flex-col items-center justify-center text-center gap-3">
                {bannerImage ? (
                  <div className="relative w-48 h-32 rounded-xl overflow-hidden border border-white/20 shadow-lg group">
                    <img
                      src={bannerImage}
                      alt="Banner Preview"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const url = prompt('Cole a URL da imagem do produto (300x250):', bannerImage);
                          if (url) setBannerImage(url);
                        }}
                        className="p-2 rounded-lg bg-white/20 text-white text-xs hover:bg-white/30"
                      >
                        Trocar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const url = prompt('Insira a URL da imagem do produto:', bannerImage);
                      if (url) setBannerImage(url);
                    }}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border border-white/10"
                  >
                    <Upload className="w-3.5 h-3.5" /> Selecionar Arquivo
                  </button>
                </div>

                <div className="text-[11px] text-white/40 space-y-0.5">
                  <p>Arraste e solte o arquivo ou clique para selecionar</p>
                  <p>Recomendado: 300x250 px • Formatos aceitos: JPG ou PNG (máx. 10MB)</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CONFIGURAÇÕES */}
      {activeTab === 'configuracoes' && (
        <div className="space-y-4 max-w-4xl">
          <div className="p-4 rounded-2xl bg-[#0b1322] border border-white/10">
            <h3 className="text-sm font-black text-white font-['Syne'] mb-1">
              Preços, Comissões e Garantia
            </h3>
            <p className="text-xs text-white/60">
              Defina os valores de venda, comissionamento da sua rede de afiliados e canais de suporte ao cliente.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1.5">
                Preço de Venda / Setup (R$)
              </label>
              <input
                type="number"
                step="0.01"
                value={priceSetup}
                onChange={(e) => setPriceSetup(Number(e.target.value))}
                className="w-full bg-[#050811] border border-white/15 focus:border-[#208b68] rounded-xl px-4 py-3 text-xs text-white font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1.5">
                Comissão de Afiliados (%)
              </label>
              <input
                type="number"
                value={commissionPercentage}
                onChange={(e) => setCommissionPercentage(Number(e.target.value))}
                className="w-full bg-[#050811] border border-white/15 focus:border-[#208b68] rounded-xl px-4 py-3 text-xs text-white font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1.5">
                Dias de Garantia
              </label>
              <select
                value={warrantyDays}
                onChange={(e) => setWarrantyDays(Number(e.target.value))}
                className="w-full bg-[#050811] border border-white/15 focus:border-[#208b68] rounded-xl px-4 py-3 text-xs text-white"
              >
                <option value={7}>7 Dias (Padrão)</option>
                <option value={15}>15 Dias</option>
                <option value={30}>30 Dias</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1.5">
                Email de Suporte ao Aluno / Cliente
              </label>
              <input
                type="email"
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                placeholder="suporte@empresa.com.br"
                className="w-full bg-[#050811] border border-white/15 focus:border-[#208b68] rounded-xl px-4 py-3 text-xs text-white"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-white/80 mb-1.5">
                URL da Página de Obrigado / Área de Membros
              </label>
              <input
                type="url"
                value={thankYouPageUrl}
                onChange={(e) => setThankYouPageUrl(e.target.value)}
                placeholder="https://suaempresa.com/obrigado"
                className="w-full bg-[#050811] border border-white/15 focus:border-[#208b68] rounded-xl px-4 py-3 text-xs text-white"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ORDER BUMP */}
      {activeTab === 'order_bump' && (
        <div className="space-y-4 max-w-4xl">
          <div className="p-4 rounded-2xl bg-[#0b1322] border border-white/10 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-white font-['Syne']">
                Order Bump no Checkout
              </h3>
              <p className="text-xs text-white/60">
                Oferta complementar adicionada com 1 clique antes do cliente finalizar a compra.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                const title = prompt('Título do Order Bump:', 'Acelerador de Resultados');
                if (title) {
                  setOrderBumps([
                    ...orderBumps,
                    { id: `ob-${Date.now()}`, name: title, description: 'Complemento exclusivo com desconto único.', price: 19.90, active: true }
                  ]);
                }
              }}
              className="bg-[#208b68] text-white font-black px-3 py-1.5 rounded-xl text-xs uppercase"
            >
              + Adicionar Bump
            </button>
          </div>

          <div className="space-y-3">
            {orderBumps.map((bump) => (
              <div key={bump.id} className="p-4 rounded-2xl bg-[#050811] border border-white/10 flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-bold text-white">{bump.name}</h4>
                  <p className="text-[11px] text-white/60 mt-0.5">{bump.description}</p>
                </div>
                <div className="text-right flex items-center gap-3">
                  <span className="text-xs font-black text-emerald-400">R$ {bump.price.toFixed(2).replace('.', ',')}</span>
                  <button
                    type="button"
                    onClick={() => setOrderBumps(orderBumps.filter(b => b.id !== bump.id))}
                    className="p-1.5 text-white/40 hover:text-rose-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: UPSELL / DOWNSELL */}
      {activeTab === 'upsell' && (
        <div className="space-y-4 max-w-4xl">
          <div className="p-4 rounded-2xl bg-[#0b1322] border border-white/10">
            <h3 className="text-sm font-black text-white font-['Syne']">
              Ofertas de Upsell & Downsell (1-Click)
            </h3>
            <p className="text-xs text-white/60">
              Ofereça produtos de ticket maior ou pacotes VIP logo após a confirmação do pagamento principal.
            </p>
          </div>
          <div className="p-8 text-center rounded-2xl bg-[#050811] border border-white/10 text-xs text-white/50">
            Nenhuma oferta pós-checkout configurada ainda.
          </div>
        </div>
      )}

      {/* TAB 5: CHECKOUT (Image 5) */}
      {activeTab === 'checkout' && (
        <div className="space-y-5 max-w-4xl">
          {/* Header Controls */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                type="text"
                value={checkoutSearch}
                onChange={(e) => setCheckoutSearch(e.target.value)}
                placeholder="Pesquisar..."
                className="w-full bg-[#050811] border border-white/15 focus:border-[#208b68] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none"
              />
            </div>

            <button
              type="button"
              onClick={() => setIsAddCheckoutModalOpen(true)}
              className="bg-[#208b68] hover:bg-[#1a7356] text-white font-bold px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" /> Adicionar Checkout
            </button>
          </div>

          {/* Checkouts Table (Exact Match for Image 5) */}
          <div className="bg-[#050811] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-[11px] font-bold text-white/40 uppercase">
                  <th className="py-3 px-4">Nome</th>
                  <th className="py-3 px-4">Preço</th>
                  <th className="py-3 px-4">Oferta</th>
                  <th className="py-3 px-4">Visitas</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs">
                {checkouts
                  .filter(c => !checkoutSearch || c.name.toLowerCase().includes(checkoutSearch.toLowerCase()) || c.offerName.toLowerCase().includes(checkoutSearch.toLowerCase()))
                  .map((chk) => (
                    <tr key={chk.id} className="hover:bg-white/5 transition-colors">
                      {/* Nome with badge */}
                      <td className="py-4 px-4 font-bold text-white">
                        <div className="flex items-center gap-2">
                          <span>{chk.name}</span>
                          {chk.isDefault && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#208b68]/20 text-emerald-400 border border-emerald-500/30">
                              Padrão
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Preço */}
                      <td className="py-4 px-4 font-black text-white">
                        R$ {chk.price.toFixed(2).replace('.', ',')}
                      </td>

                      {/* Oferta */}
                      <td className="py-4 px-4 text-white/70">
                        {chk.offerName}
                      </td>

                      {/* Visitas */}
                      <td className="py-4 px-4 text-white/60">
                        {chk.visitsCount}
                      </td>

                      {/* Ações (3 Dots & Fast links) */}
                      <td className="py-4 px-4 text-right relative">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => onOpenCheckout(plan, chk.checkoutSlug)}
                            className="p-1.5 rounded-lg bg-emerald-950/60 text-emerald-400 hover:bg-emerald-900/80 border border-emerald-500/30 transition-colors cursor-pointer text-xs font-bold"
                            title="Abrir Checkout ao Vivo"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleCopy(`${currentOrigin}?checkout=${plan.id}`, chk.id)}
                            className="p-1.5 rounded-lg bg-white/10 text-white/70 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
                            title="Copiar Link"
                          >
                            {copiedLink === chk.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>

                          <button
                            type="button"
                            onClick={() => setActiveCheckoutMenu(activeCheckoutMenu === chk.id ? null : chk.id)}
                            className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors cursor-pointer"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </div>

                        {/* 3-dots Dropdown Menu */}
                        {activeCheckoutMenu === chk.id && (
                          <div className="absolute right-4 top-12 z-30 w-44 bg-[#0a1222] border border-white/15 rounded-xl shadow-2xl py-1.5 text-left animate-in fade-in duration-150">
                            <button
                              type="button"
                              onClick={() => {
                                onOpenCheckout(plan, chk.checkoutSlug);
                                setActiveCheckoutMenu(null);
                              }}
                              className="w-full px-3 py-2 text-xs text-white/80 hover:text-white hover:bg-white/10 flex items-center gap-2 cursor-pointer"
                            >
                              <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Testar Checkout</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                handleCopy(`${currentOrigin}?checkout=${plan.id}`, chk.id);
                                setActiveCheckoutMenu(null);
                              }}
                              className="w-full px-3 py-2 text-xs text-white/80 hover:text-white hover:bg-white/10 flex items-center gap-2 cursor-pointer"
                            >
                              <Copy className="w-3.5 h-3.5 text-[#D9F22A]" />
                              <span>Copiar Link</span>
                            </button>

                            {!chk.isDefault && (
                              <button
                                type="button"
                                onClick={() => handleDeleteCheckout(chk.id)}
                                className="w-full px-3 py-2 text-xs text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 cursor-pointer border-t border-white/5"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Excluir Checkout</span>
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: COPRODUÇÃO */}
      {activeTab === 'coproducao' && (
        <div className="space-y-4 max-w-4xl">
          <div className="p-4 rounded-2xl bg-[#0b1322] border border-white/10">
            <h3 className="text-sm font-black text-white font-['Syne']">
              Divisão de Receita / Coprodução
            </h3>
            <p className="text-xs text-white/60">
              Adicione parceiros e sócios para dividir automaticamente a receita de cada venda processada pelo LeadsPay.
            </p>
          </div>
          <div className="p-8 text-center rounded-2xl bg-[#050811] border border-white/10 text-xs text-white/50">
            Nenhum coprodutor cadastrado. 100% da receita líquida é repassada para sua conta.
          </div>
        </div>
      )}

      {/* TAB 7: CUPONS */}
      {activeTab === 'cupons' && (
        <div className="space-y-5 max-w-4xl">
          <div className="p-4 rounded-2xl bg-[#0b1322] border border-white/10 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-white font-['Syne']">
                Cupons de Desconto
              </h3>
              <p className="text-xs text-white/60">
                Crie códigos promocionais para campanhas de marketing ou afiliados específicos.
              </p>
            </div>
          </div>

          {/* Add Coupon Form */}
          <form onSubmit={handleAddCoupon} className="p-4 rounded-2xl bg-[#050811] border border-white/10 flex flex-col sm:flex-row items-end gap-3">
            <div className="flex-1 w-full">
              <label className="block text-[11px] text-white/70 mb-1">Código do Cupom</label>
              <input
                type="text"
                required
                placeholder="Ex: BLACKFRIDAY"
                value={newCouponCode}
                onChange={(e) => setNewCouponCode(e.target.value.toUpperCase())}
                className="w-full bg-[#080d1a] border border-white/15 rounded-xl px-3 py-2 text-xs text-white font-mono uppercase"
              />
            </div>

            <div className="w-full sm:w-36">
              <label className="block text-[11px] text-white/70 mb-1">Tipo</label>
              <select
                value={newCouponType}
                onChange={(e) => setNewCouponType(e.target.value as any)}
                className="w-full bg-[#080d1a] border border-white/15 rounded-xl px-3 py-2 text-xs text-white"
              >
                <option value="percentage">% Porcentagem</option>
                <option value="fixed">R$ Valor Fixo</option>
              </select>
            </div>

            <div className="w-full sm:w-32">
              <label className="block text-[11px] text-white/70 mb-1">Desconto</label>
              <input
                type="number"
                required
                value={newCouponDiscount}
                onChange={(e) => setNewCouponDiscount(Number(e.target.value))}
                className="w-full bg-[#080d1a] border border-white/15 rounded-xl px-3 py-2 text-xs text-white font-bold"
              />
            </div>

            <button
              type="submit"
              className="w-full sm:w-auto bg-[#208b68] hover:bg-[#1a7356] text-white font-bold px-4 py-2 rounded-xl text-xs uppercase cursor-pointer whitespace-nowrap"
            >
              Criar Cupom
            </button>
          </form>

          {/* Coupons List */}
          <div className="space-y-2.5">
            {coupons.map((coupon) => (
              <div key={coupon.id} className="p-3.5 rounded-xl bg-[#050811] border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Tag className="w-4 h-4 text-[#D9F22A]" />
                  <span className="font-mono text-xs font-black text-white">{coupon.code}</span>
                  <span className="text-[11px] text-emerald-400 font-bold">
                    {coupon.discountType === 'percentage' ? `${coupon.discountValue}% OFF` : `R$ ${coupon.discountValue.toFixed(2)} OFF`}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setCoupons(coupons.filter(c => c.id !== coupon.id))}
                  className="text-white/40 hover:text-rose-400 p-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 8: AFILIADOS */}
      {activeTab === 'afiliados' && (
        <div className="space-y-4 max-w-4xl">
          <div className="p-4 rounded-2xl bg-[#0b1322] border border-white/10">
            <h3 className="text-sm font-black text-white font-['Syne']">
              Programa de Afiliados
            </h3>
            <p className="text-xs text-white/60">
              Gerencie as regras de aceitação de afiliados para este produto na vitrine pública.
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-[#050811] border border-white/10 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span>Aprovação Automática de Afiliados:</span>
              <span className="text-emerald-400 font-bold">Ativada (1-Clique)</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Comissão Fixada por Venda:</span>
              <span className="text-[#D9F22A] font-bold">{commissionPercentage}% (R$ {((priceSetup * commissionPercentage) / 100).toFixed(2).replace('.', ',')})</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 9: LINKS */}
      {activeTab === 'links' && (
        <div className="space-y-4 max-w-4xl">
          <div className="p-4 rounded-2xl bg-[#0b1322] border border-white/10">
            <h3 className="text-sm font-black text-white font-['Syne']">
              Links Oficiais do Produto
            </h3>
            <p className="text-xs text-white/60">
              Links com taxa de checkout de R$ 0,99 processados com segurança pelo LeadsPay.
            </p>
          </div>

          <div className="space-y-3">
            <div className="p-4 rounded-2xl bg-[#050811] border border-white/10 space-y-2">
              <span className="text-xs font-bold text-emerald-400 block">Link Direto do Checkout</span>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={directCheckoutUrl}
                  className="flex-1 bg-[#080d1a] border border-white/15 rounded-xl px-3 py-2 text-xs font-mono text-white/80"
                />
                <button
                  type="button"
                  onClick={() => handleCopy(directCheckoutUrl, 'links-chk')}
                  className="bg-[#208b68] text-white font-bold px-3 py-2 rounded-xl text-xs uppercase"
                >
                  {copiedLink === 'links-chk' ? 'Copiado!' : 'Copiar'}
                </button>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#050811] border border-white/10 space-y-2">
              <span className="text-xs font-bold text-white block">Link da Vitrine / Página de Vendas</span>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={salesPageUrl}
                  className="flex-1 bg-[#080d1a] border border-white/15 rounded-xl px-3 py-2 text-xs font-mono text-white/80"
                />
                <button
                  type="button"
                  onClick={() => handleCopy(salesPageUrl, 'links-sales')}
                  className="bg-white/10 text-white font-bold px-3 py-2 rounded-xl text-xs uppercase"
                >
                  {copiedLink === 'links-sales' ? 'Copiado!' : 'Copiar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Action Buttons (Image 4 & 5) */}
      <div className="mt-10 pt-6 border-t border-white/10 flex items-center justify-between max-w-4xl">
        <button
          type="button"
          onClick={() => onDelete(plan.id, plan.companyId)}
          className="bg-[#d90429] hover:bg-[#b00320] text-white font-bold px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2"
        >
          <Trash2 className="w-4 h-4" /> Excluir Produto
        </button>

        <button
          type="button"
          onClick={handleSaveProduct}
          className="bg-[#208b68] hover:bg-[#1a7356] text-white font-black px-6 py-2.5 rounded-xl text-xs uppercase tracking-wider shadow-lg transition-all cursor-pointer flex items-center gap-2"
        >
          <Save className="w-4 h-4" /> Salvar Produto
        </button>
      </div>

      {/* Add Custom Checkout Modal */}
      {isAddCheckoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#080d1a] border border-white/10 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <h3 className="text-base font-black text-white font-['Syne']">
                Novo Checkout Personalizado
              </h3>
              <button
                type="button"
                onClick={() => setIsAddCheckoutModalOpen(false)}
                className="text-white/40 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCheckout} className="space-y-4">
              <div>
                <label className="block text-xs text-white/80 mb-1">Nome do Checkout</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Checkout Black Friday"
                  value={newCheckoutName}
                  onChange={(e) => setNewCheckoutName(e.target.value)}
                  className="w-full bg-[#050811] border border-white/15 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-white/80 mb-1">Preço Especial (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={newCheckoutPrice}
                  onChange={(e) => setNewCheckoutPrice(Number(e.target.value))}
                  className="w-full bg-[#050811] border border-white/15 rounded-xl px-3 py-2 text-xs text-white font-bold"
                />
              </div>

              <div>
                <label className="block text-xs text-white/80 mb-1">Título da Oferta</label>
                <input
                  type="text"
                  placeholder="Ex: Oferta Exclusiva 50% OFF"
                  value={newCheckoutOffer}
                  onChange={(e) => setNewCheckoutOffer(e.target.value)}
                  className="w-full bg-[#050811] border border-white/15 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddCheckoutModalOpen(false)}
                  className="px-4 py-2 text-xs text-white/60 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-[#208b68] text-white font-bold px-5 py-2 rounded-xl text-xs uppercase"
                >
                  Criar Checkout
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
