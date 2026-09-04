import React, { useState, useEffect, useRef } from 'react';
import { CompanyPlan, CompanyStartup } from '../../types/platform';
import { 
  Layers, 
  Sparkles, 
  X, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Building2, 
  Upload, 
  Link as LinkIcon, 
  Image as ImageIcon, 
  Edit3,
  Check
} from 'lucide-react';

interface CreatePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  companies: CompanyStartup[];
  defaultCompanyId?: string;
  initialData?: CompanyPlan | null;
  onPlanCreated: (plan: Omit<CompanyPlan, 'id' | 'createdAt'>) => void;
  onPlanUpdated?: (planId: string, plan: Partial<CompanyPlan>) => void;
}

const PRESET_BANNERS = [
  { name: 'SaaS Dashboard', url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=600&q=80' },
  { name: 'Fintech Terminal', url: 'https://images.unsplash.com/photo-1642543492481-44e81e3914a7?auto=format&fit=crop&w=600&q=80' },
  { name: 'AI Platform', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80' },
  { name: 'Marketing & Vendas', url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=600&q=80' },
  { name: 'Casino & Jogos', url: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=600&q=80' }
];

export const CreatePlanModal: React.FC<CreatePlanModalProps> = ({
  isOpen,
  onClose,
  companies = [],
  defaultCompanyId,
  initialData,
  onPlanCreated,
  onPlanUpdated
}) => {
  const isEditMode = Boolean(initialData);

  const [companyId, setCompanyId] = useState<string>('');
  const [customCompanyName, setCustomCompanyName] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [category, setCategory] = useState<string>('SaaS / B2B');
  const [priceSetup, setPriceSetup] = useState<string>('');
  const [priceMonthly, setPriceMonthly] = useState<string>('');
  const [commissionPercentage, setCommissionPercentage] = useState<string>('');
  const [recurrentCommissionPercent, setRecurrentCommissionPercent] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [badge, setBadge] = useState<string>('');
  const [bannerImage, setBannerImage] = useState<string>('');
  const [checkoutUrl, setCheckoutUrl] = useState<string>('');
  const [features, setFeatures] = useState<string[]>([]);
  const [newFeatureText, setNewFeatureText] = useState<string>('');
  const [imageTab, setImageTab] = useState<'upload' | 'url' | 'presets'>('upload');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize or reset form state based on mode
  useEffect(() => {
    if (!isOpen) return;

    if (initialData) {
      setCompanyId(initialData.companyId || (companies[0]?.id || ''));
      setCustomCompanyName(initialData.companyName || '');
      setName(initialData.name || '');
      setCategory(initialData.category || 'SaaS / B2B');
      setPriceSetup(initialData.priceSetup !== undefined ? String(initialData.priceSetup) : '');
      setPriceMonthly(initialData.priceMonthly ? String(initialData.priceMonthly) : '');
      setCommissionPercentage(initialData.commissionPercentage !== undefined ? String(initialData.commissionPercentage) : '');
      setRecurrentCommissionPercent(initialData.recurrentCommissionPercent ? String(initialData.recurrentCommissionPercent) : '');
      setDescription(initialData.description || '');
      setBadge(initialData.badge || '');
      setBannerImage(initialData.bannerImage || '');
      setCheckoutUrl(initialData.checkoutUrl || '');
      setFeatures(initialData.features ? [...initialData.features] : []);
    } else {
      // Create mode - start clean and empty
      const targetComp = defaultCompanyId || (companies.length > 0 ? companies[0].id : 'comp_default');
      setCompanyId(targetComp);
      setCustomCompanyName('');
      setName('');
      setCategory(companies.find(c => c.id === targetComp)?.category || 'SaaS / B2B');
      setPriceSetup('');
      setPriceMonthly('');
      setCommissionPercentage('');
      setRecurrentCommissionPercent('');
      setDescription('');
      setBadge('');
      setBannerImage('');
      setCheckoutUrl('');
      setFeatures([]);
    }
  }, [isOpen, initialData, defaultCompanyId, companies]);

  if (!isOpen) return null;

  const currentCompany = companies.find(c => c.id === companyId);
  const numSetup = parseFloat(priceSetup) || 0;
  const numMonthly = parseFloat(priceMonthly) || 0;
  const numCommission = parseFloat(commissionPercentage) || 0;
  const numRecurrentCommission = parseFloat(recurrentCommissionPercent) || 0;

  const calculatedCommissionValue = Number(((numSetup * numCommission) / 100).toFixed(2));
  const calculatedRecurrentVal = Number(((numMonthly * numRecurrentCommission) / 100).toFixed(2));

  // Handle local file image upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('A imagem deve ter no máximo 5MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setBannerImage(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddFeature = () => {
    if (newFeatureText.trim()) {
      setFeatures([...features, newFeatureText.trim()]);
      setNewFeatureText('');
    }
  };

  const handleRemoveFeature = (index: number) => {
    setFeatures(features.filter((_, i) => i !== index));
  };

  const handleSuggestFeatures = () => {
    setFeatures([
      'Suporte Técnico Dedicado 24/7',
      'Landing Page ou Site Institucional de Ultra Velocidade',
      'Design Responsivo para Celulares e Computadores',
      'Botão Direto para Conversão no WhatsApp',
      'Hospedagem em Nuvem de Alta Disponibilidade'
    ]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      alert('Por favor, preencha o nome do plano ou produto.');
      return;
    }

    if (!priceSetup || numSetup <= 0) {
      alert('Por favor, defina um preço de setup válido (ex: 197 ou 5000).');
      return;
    }

    if (!commissionPercentage || numCommission <= 0) {
      alert('Por favor, defina a porcentagem de comissão do afiliado (ex: 35 ou 50).');
      return;
    }

    if (!description.trim()) {
      alert('Por favor, preencha a descrição do plano.');
      return;
    }

    setIsSubmitting(true);

    try {
      const compId = currentCompany?.id || (isEditMode ? initialData?.companyId : `comp-${Date.now()}`) || 'comp-default';
      const compName = currentCompany?.name || customCompanyName.trim() || initialData?.companyName || 'Empresa Parceira';
      const compLogo = currentCompany?.logo || initialData?.companyLogo || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=150&q=80';
      const compCategory = category || currentCompany?.category || initialData?.category || 'SaaS / B2B';
      const finalImage = bannerImage.trim() || PRESET_BANNERS[0].url;

      const planPayload: Omit<CompanyPlan, 'id' | 'createdAt'> = {
        companyId: compId,
        companyName: compName,
        companyLogo: compLogo,
        category: compCategory,
        name: name.trim(),
        description: description.trim(),
        priceSetup: numSetup,
        priceMonthly: numMonthly,
        commissionPercentage: numCommission,
        commissionValue: calculatedCommissionValue,
        recurrentCommissionPercent: numRecurrentCommission,
        recurrentCommissionValue: calculatedRecurrentVal,
        features: features.length > 0 ? features : ['Ativação e setup imediato', 'Suporte dedicado'],
        bannerImage: finalImage,
        affiliatesCount: initialData?.affiliatesCount || 0,
        totalSales: initialData?.totalSales || 0,
        badge: badge.trim() || 'Destaque',
        checkoutUrl: checkoutUrl.trim() || 'https://pay.leadspay.com/checkout',
        status: initialData?.status || 'Ativo'
      };

      if (isEditMode && initialData && onPlanUpdated) {
        await onPlanUpdated(initialData.id, planPayload);
      } else {
        await onPlanCreated(planPayload);
      }

      onClose();
    } catch (err: any) {
      console.error('Error saving plan:', err);
      alert(`Erro ao salvar plano: ${err?.message || err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#080d1a] border border-[#D9F22A]/40 rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(217,242,42,0.15)] max-h-[90vh] overflow-y-auto no-scrollbar">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-white/50 hover:text-white transition-colors cursor-pointer w-8 h-8 rounded-full bg-white/5 flex items-center justify-center"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#D9F22A] mb-1">
          <span className="w-2 h-2 rounded-full bg-[#D9F22A]" />
          {isEditMode ? 'Edição de Produto / Plano' : 'Novo Plano & Comissões'}
        </div>

        <h3 className="text-xl sm:text-2xl font-black text-white font-['Syne'] mb-1">
          {isEditMode ? `Editar Plano: ${initialData?.name}` : 'Cadastrar Novo Plano da Empresa'}
        </h3>
        <p className="text-xs text-white/70 mb-5">
          {isEditMode 
            ? 'Atualize valores, comissões, imagem e benefícios deste produto no catálogo.'
            : 'Preencha os dados do plano e a comissão que os afiliados receberão a cada venda confirmada.'}
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Select Company or Company Name */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-white/80 mb-1.5">
              Empresa / Startup Responsável *
            </label>
            {companies.length > 0 ? (
              <select
                value={companyId}
                onChange={(e) => {
                  setCompanyId(e.target.value);
                  const found = companies.find(c => c.id === e.target.value);
                  if (found) setCategory(found.category);
                }}
                className="w-full bg-[#050811] border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#D9F22A]"
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id} className="bg-[#080d1a]">
                    {c.name} ({c.category})
                  </option>
                ))}
              </select>
            ) : (
              <div className="space-y-1.5">
                <div className="relative">
                  <Building2 className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#D9F22A]" />
                  <input
                    type="text"
                    required
                    placeholder="Nome da sua Empresa / Startup (ex: Minha Empresa Digital)"
                    value={customCompanyName}
                    onChange={(e) => setCustomCompanyName(e.target.value)}
                    className="w-full bg-[#050811] border border-[#D9F22A]/40 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#D9F22A]"
                  />
                </div>
                <span className="text-[11px] text-[#D9F22A] block font-medium">
                  ✓ Será vinculada automaticamente ao plano no catálogo.
                </span>
              </div>
            )}
          </div>

          {/* Plan Name & Badge */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/80 mb-1.5">
                Nome do Plano / Produto *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Starter • Tração & Vendas"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#050811] border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#D9F22A]"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-white/80">
                  Selo Curto / Tag (opcional)
                </label>
                <span className="text-[10px] text-white/40">max 25 letras</span>
              </div>
              <input
                type="text"
                maxLength={25}
                placeholder="Ex: Mais Vendido, Destaque"
                value={badge}
                onChange={(e) => setBadge(e.target.value)}
                className="w-full bg-[#050811] border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#D9F22A]"
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-white/80 mb-1.5">
              Categoria do Produto
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-[#050811] border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#D9F22A]"
            >
              <option value="SaaS / B2B">SaaS / B2B</option>
              <option value="iGaming & Apostas">iGaming & Apostas</option>
              <option value="Fintech & Pagamentos">Fintech & Pagamentos</option>
              <option value="Marketing & Vendas">Marketing & Vendas</option>
              <option value="IA & Automação">IA & Automação</option>
              <option value="Educação / Cursos">Educação / Cursos</option>
            </select>
          </div>

          {/* Pricing & Commission Setup */}
          <div className="p-4 rounded-2xl bg-[#050811] border border-white/10 space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#D9F22A]">
                Preços & Repasse de Comissão aos Afiliados
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-white/80 mb-1">
                  Preço de Venda / Setup Inicial (R$) *
                </label>
                <input
                  type="number"
                  step="any"
                  min="1"
                  required
                  placeholder="Ex: 197.00 ou 5000"
                  value={priceSetup}
                  onChange={(e) => setPriceSetup(e.target.value)}
                  className="w-full bg-[#080d1a] border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white font-bold placeholder-white/30 focus:border-[#D9F22A] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-white/80 mb-1">
                  Comissão do Afiliado no Setup (%) *
                </label>
                <input
                  type="number"
                  step="any"
                  min="1"
                  max="100"
                  required
                  placeholder="Ex: 35 ou 50"
                  value={commissionPercentage}
                  onChange={(e) => setCommissionPercentage(e.target.value)}
                  className="w-full bg-[#080d1a] border border-[#D9F22A]/40 rounded-xl px-3.5 py-2 text-xs text-[#D9F22A] font-black placeholder-white/30 focus:border-[#D9F22A] focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-white/60 mb-1">
                  Mensalidade Recorrente (R$/mês) (opcional)
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="Ex: 499 (deixe vazio se não houver)"
                  value={priceMonthly}
                  onChange={(e) => setPriceMonthly(e.target.value)}
                  className="w-full bg-[#080d1a] border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white placeholder-white/30 focus:border-[#D9F22A] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-white/60 mb-1">
                  Comissão Recorrente Mensal (%) (opcional)
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  max="100"
                  placeholder="Ex: 10"
                  value={recurrentCommissionPercent}
                  onChange={(e) => setRecurrentCommissionPercent(e.target.value)}
                  className="w-full bg-[#080d1a] border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white placeholder-white/30 focus:border-[#D9F22A] focus:outline-none"
                />
              </div>
            </div>

            {/* Live Calculation Preview */}
            <div className="p-3.5 rounded-xl bg-[#D9F22A]/10 border border-[#D9F22A]/30 flex items-center justify-between flex-wrap gap-2">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-white/70 block">
                  Valor Pago pelo Cliente:
                </span>
                <span className="text-sm font-bold text-white">
                  {numSetup > 0 ? `R$ ${numSetup.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'R$ 0,00'}
                  {numMonthly > 0 ? ` + R$ ${numMonthly.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês` : ''}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase tracking-wider text-[#D9F22A] font-bold block">
                  Comissão do Afiliado ({numCommission || 0}%):
                </span>
                <span className="text-base font-black text-[#D9F22A]">
                  + R$ {calculatedCommissionValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} por venda
                </span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-white/80 mb-1.5">
              Descrição do Plano & Soluções Incluídas *
            </label>
            <textarea
              required
              rows={2}
              placeholder="Explique o que o cliente recebe ao adquirir este plano..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-[#050811] border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#D9F22A] resize-none"
            />
          </div>

          {/* Features Builder */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-white/80">
                Benefícios & Recursos Inclusos ({features.length})
              </label>
              {features.length === 0 && (
                <button
                  type="button"
                  onClick={handleSuggestFeatures}
                  className="text-[11px] text-[#D9F22A] hover:underline cursor-pointer flex items-center gap-1 font-bold"
                >
                  <Sparkles className="w-3 h-3" /> Inserir exemplos
                </button>
              )}
            </div>

            {features.length > 0 && (
              <div className="space-y-1.5 mb-2 max-h-36 overflow-y-auto no-scrollbar">
                {features.map((feat, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-[#050811] border border-white/10 text-xs text-white/90">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#D9F22A] flex-shrink-0" />
                      <span>{feat}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveFeature(idx)}
                      className="text-white/40 hover:text-red-400 cursor-pointer p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Adicionar benefício (ex: Suporte VIP via WhatsApp, Integração com PIX)"
                value={newFeatureText}
                onChange={(e) => setNewFeatureText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddFeature();
                  }
                }}
                className="flex-1 bg-[#050811] border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white placeholder-white/30"
              />
              <button
                type="button"
                onClick={handleAddFeature}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Adicionar
              </button>
            </div>
          </div>

          {/* 🖼️ IMAGE UPLOAD / URL / PRESET SELECTION */}
          <div className="p-4 rounded-2xl bg-[#050811] border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-[#D9F22A] block">
                Imagem do Produto / Banner
              </label>
              <div className="flex items-center gap-1 bg-[#080d1a] p-1 rounded-xl border border-white/10 text-[10px]">
                <button
                  type="button"
                  onClick={() => setImageTab('upload')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    imageTab === 'upload' ? 'bg-[#D9F22A] text-[#060A15]' : 'text-white/60 hover:text-white'
                  }`}
                >
                  <Upload className="w-3 h-3" /> Fazer Upload
                </button>
                <button
                  type="button"
                  onClick={() => setImageTab('url')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    imageTab === 'url' ? 'bg-[#D9F22A] text-[#060A15]' : 'text-white/60 hover:text-white'
                  }`}
                >
                  <LinkIcon className="w-3 h-3" /> Link / URL
                </button>
                <button
                  type="button"
                  onClick={() => setImageTab('presets')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    imageTab === 'presets' ? 'bg-[#D9F22A] text-[#060A15]' : 'text-white/60 hover:text-white'
                  }`}
                >
                  <ImageIcon className="w-3 h-3" /> Modelos
                </button>
              </div>
            </div>

            {/* TAB 1: UPLOAD FILE */}
            {imageTab === 'upload' && (
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-white/20 hover:border-[#D9F22A] rounded-xl p-5 text-center cursor-pointer transition-all bg-[#080d1a]/50 hover:bg-[#080d1a]"
                >
                  <Upload className="w-6 h-6 text-[#D9F22A] mx-auto mb-2" />
                  <p className="text-xs font-bold text-white">Clique para selecionar imagem do seu dispositivo</p>
                  <p className="text-[10px] text-white/50 mt-1">PNG, JPG, WebP (máximo 5MB)</p>
                </div>
              </div>
            )}

            {/* TAB 2: PASTE URL */}
            {imageTab === 'url' && (
              <div>
                <input
                  type="url"
                  placeholder="https://exemplo.com/minha-imagem.png"
                  value={bannerImage}
                  onChange={(e) => setBannerImage(e.target.value)}
                  className="w-full bg-[#080d1a] border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white placeholder-white/30 focus:border-[#D9F22A] focus:outline-none"
                />
              </div>
            )}

            {/* TAB 3: PRESETS */}
            {imageTab === 'presets' && (
              <div className="flex flex-wrap gap-2">
                {PRESET_BANNERS.map((b, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setBannerImage(b.url)}
                    className={`text-[10px] px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer ${
                      bannerImage === b.url
                        ? 'border-[#D9F22A] bg-[#D9F22A]/15 text-[#D9F22A] font-bold shadow-sm'
                        : 'border-white/10 text-white/60 hover:text-white bg-[#080d1a]'
                    }`}
                  >
                    {b.name}
                  </button>
                ))}
              </div>
            )}

            {/* IMAGE PREVIEW */}
            {bannerImage && (
              <div className="relative rounded-xl overflow-hidden h-28 border border-[#D9F22A]/30 bg-black/40">
                <img
                  src={bannerImage}
                  alt="Prévia do produto"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end justify-between p-2.5">
                  <span className="text-[10px] text-white font-bold bg-black/60 px-2 py-0.5 rounded-md backdrop-blur-sm">
                    ✓ Imagem selecionada
                  </span>
                  <button
                    type="button"
                    onClick={() => setBannerImage('')}
                    className="p-1 rounded-md bg-red-500/80 hover:bg-red-500 text-white text-[10px] cursor-pointer flex items-center gap-1 font-bold"
                  >
                    <Trash2 className="w-3 h-3" /> Remover
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* SUBMIT BUTTON */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 w-full bg-[#D9F22A] hover:bg-[#c8e217] text-[#060A15] font-black py-3.5 rounded-xl text-xs uppercase tracking-wider shadow-[0_0_25px_rgba(217,242,42,0.4)] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isEditMode ? (
              <>
                <Check className="w-4 h-4 stroke-[3]" />
                {isSubmitting ? 'Salvando Alterações...' : 'Salvar Alterações do Plano'}
              </>
            ) : (
              <>
                <Layers className="w-4 h-4" />
                {isSubmitting ? 'Salvando Plano...' : 'Salvar Plano & Liberar para Afiliados'}
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
