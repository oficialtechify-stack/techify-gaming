import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PlatformProduct } from '../../types/platform';
import { 
  Plus, 
  X, 
  Sparkles, 
  DollarSign, 
  Layers, 
  Tag, 
  FileText, 
  CheckCircle2, 
  Image as ImageIcon,
  Zap,
  Server
} from 'lucide-react';

interface CreatePlatformModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlatformCreated: (platform: Omit<PlatformProduct, 'id' | 'createdAt'>) => Promise<void>;
}

const CATEGORIES = [
  'Cassino',
  'Sportsbook',
  'White-Label',
  'Instant Games',
  'Fintech / Gateway',
  'SaaS & Afiliados'
];

const PRESET_IMAGES = [
  { label: 'Cassino / Slots', url: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=800&q=80' },
  { label: 'Sportsbook / Apostas', url: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=800&q=80' },
  { label: 'White-Label Suite', url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=800&q=80' },
  { label: 'Crash / Instant', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80' },
  { label: 'Fintech / PIX', url: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=800&q=80' }
];

export const CreatePlatformModal: React.FC<CreatePlatformModalProps> = ({
  isOpen,
  onClose,
  onPlatformCreated
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Cassino');
  const [tag, setTag] = useState('Destaque');
  const [priceSetup, setPriceSetup] = useState<number>(15000);
  const [priceMonthly, setPriceMonthly] = useState<number>(3500);
  const [commissionPercentage, setCommissionPercentage] = useState<number>(40);
  const [recurrentCommission, setRecurrentCommission] = useState<number>(15);
  const [description, setDescription] = useState('');
  const [featuresText, setFeaturesText] = useState('API Unificada de Alta Performance\nPainel Administrativo Completo\nIntegração PIX Instantânea\nSuporte Técnico 24/7');
  const [bannerImage, setBannerImage] = useState(PRESET_IMAGES[0].url);
  const [badge, setBadge] = useState('Lançamento ✨');
  const [latency, setLatency] = useState('< 35ms');
  const [uptime, setUptime] = useState('99.99%');
  const [compliance, setCompliance] = useState('GLI-19 & SPA/MF');
  const [integrationTime, setIntegrationTime] = useState('24 a 48 horas');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const commissionValue = (priceSetup * commissionPercentage) / 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Por favor, informe o nome da plataforma.');
      return;
    }

    setIsSubmitting(true);

    const slug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

    const affiliateCode = `TECH-${category.slice(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

    const features = featuresText
      .split('\n')
      .map(f => f.trim())
      .filter(f => f.length > 0);

    const newPlatform: Omit<PlatformProduct, 'id' | 'createdAt'> = {
      companyId: 'comp_leadspay_main',
      companyName: 'LeadsPay',
      companyLogo: 'https://stellargaming.com/wp-content/uploads/2025/08/Stellar_Icon_v1-1.svg',
      status: 'Ativo',
      name: name.trim(),
      slug: slug || `platform-${Date.now()}`,
      tag: tag.trim() || 'Nova',
      category,
      priceSetup: Number(priceSetup),
      priceMonthly: Number(priceMonthly),
      commissionPercentage: Number(commissionPercentage),
      commissionValue,
      recurrentCommission: Number(recurrentCommission),
      description: description.trim() || `Plataforma de alta performance ${name} desenvolvida pela LeadsPay.`,
      features: features.length > 0 ? features : ['Infraestrutura em Nuvem Escalável', 'Suporte Técnico 24/7'],
      specs: {
        latency,
        uptime,
        compliance,
        integrationTime
      },
      activeSellersCount: 0,
      totalSales: 0,
      conversionRate: '0%',
      badge,
      bannerImage,
      affiliateCode
    };

    try {
      await onPlatformCreated(newPlatform);
      // Reset form
      setName('');
      setDescription('');
      onClose();
    } catch (err: any) {
      console.error('Error creating platform:', err);
      alert(`Erro ao cadastrar plataforma: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-[#080d1a] border border-[#D9F22A]/40 rounded-3xl w-full max-w-2xl overflow-hidden shadow-[0_0_50px_rgba(217,242,42,0.15)] my-8"
        >
          {/* Header */}
          <div className="p-6 bg-[#060a15] border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#D9F22A]/10 border border-[#D9F22A]/30 flex items-center justify-center">
                <Plus className="w-5 h-5 text-[#D9F22A]" />
              </div>
              <div>
                <h2 className="text-lg font-black text-white font-['Syne']">
                  Cadastrar Nova Plataforma
                </h2>
                <p className="text-xs text-white/60">
                  Adicione um produto oficial ao catálogo e libere links de comissão para parceiros.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto scrollbar-thin">
            {/* Nome da Plataforma & Categoria */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-white/80 block mb-1.5">
                  Nome da Plataforma *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: LeadsPay SaaS Growth Suite VIP"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#050811] border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#D9F22A]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-white/80 block mb-1.5">
                  Categoria
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-[#050811] border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#D9F22A]"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat} className="bg-[#080d1a] text-white">
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Valores & Comissões */}
            <div className="bg-[#050811] border border-white/10 p-4 rounded-2xl space-y-4">
              <span className="text-[11px] font-bold text-[#D9F22A] uppercase tracking-wider block">
                Precificação & Comissões de Afiliados
              </span>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-[11px] text-white/70 block mb-1">
                    Valor de Setup (R$)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={priceSetup}
                    onChange={(e) => setPriceSetup(Number(e.target.value))}
                    className="w-full bg-[#080d1a] border border-white/15 rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-[#D9F22A]"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-white/70 block mb-1">
                    Mensalidade SaaS (R$)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={priceMonthly}
                    onChange={(e) => setPriceMonthly(Number(e.target.value))}
                    className="w-full bg-[#080d1a] border border-white/15 rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-[#D9F22A]"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-white/70 block mb-1">
                    Comissão do Setup (%)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={commissionPercentage}
                    onChange={(e) => setCommissionPercentage(Number(e.target.value))}
                    className="w-full bg-[#080d1a] border border-white/15 rounded-xl px-3 py-2 text-xs text-[#D9F22A] font-bold focus:outline-none focus:border-[#D9F22A]"
                  />
                </div>
              </div>

              {/* Commission preview calculation */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#D9F22A]/10 border border-[#D9F22A]/20">
                <span className="text-xs text-white/80 font-medium">Comissão Imediata por Venda:</span>
                <span className="text-sm font-black text-[#D9F22A] font-['Syne']">
                  R$ {commissionValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Descrição */}
            <div>
              <label className="text-xs font-bold text-white/80 block mb-1.5">
                Descrição Completa da Solução
              </label>
              <textarea
                rows={3}
                placeholder="Descreva as vantagens comerciais, jogos inclusos, tecnologia e diferenciais..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-[#050811] border border-white/15 rounded-xl p-3 text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#D9F22A]"
              />
            </div>

            {/* Funcionalidades */}
            <div>
              <label className="text-xs font-bold text-white/80 block mb-1.5">
                Funcionalidades Principais (uma por linha)
              </label>
              <textarea
                rows={3}
                placeholder="Uma funcionalidade por linha..."
                value={featuresText}
                onChange={(e) => setFeaturesText(e.target.value)}
                className="w-full bg-[#050811] border border-white/15 rounded-xl p-3 text-xs text-white font-mono placeholder-white/40 focus:outline-none focus:border-[#D9F22A]"
              />
            </div>

            {/* Imagem de Capa */}
            <div>
              <label className="text-xs font-bold text-white/80 block mb-2">
                Imagem de Capa / Banner
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {PRESET_IMAGES.map((img, i) => (
                  <button
                    type="button"
                    key={i}
                    onClick={() => setBannerImage(img.url)}
                    className={`px-3 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                      bannerImage === img.url
                        ? 'bg-[#D9F22A] text-[#060A15] border-[#D9F22A]'
                        : 'bg-[#050811] text-white/70 border-white/10 hover:text-white'
                    }`}
                  >
                    {img.label}
                  </button>
                ))}
              </div>
              <input
                type="url"
                placeholder="Ou cole a URL direta da imagem..."
                value={bannerImage}
                onChange={(e) => setBannerImage(e.target.value)}
                className="w-full bg-[#050811] border border-white/15 rounded-xl px-4 py-2 text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#D9F22A]"
              />
            </div>

            {/* Tags e Especificações Rápidas */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-[10px] text-white/60 block mb-1">Tag / Selo</label>
                <input
                  type="text"
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  className="w-full bg-[#050811] border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[10px] text-white/60 block mb-1">Badge</label>
                <input
                  type="text"
                  value={badge}
                  onChange={(e) => setBadge(e.target.value)}
                  className="w-full bg-[#050811] border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[10px] text-white/60 block mb-1">Latência</label>
                <input
                  type="text"
                  value={latency}
                  onChange={(e) => setLatency(e.target.value)}
                  className="w-full bg-[#050811] border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[10px] text-white/60 block mb-1">Tempo Setup</label>
                <input
                  type="text"
                  value={integrationTime}
                  onChange={(e) => setIntegrationTime(e.target.value)}
                  className="w-full bg-[#050811] border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl border border-white/15 text-xs font-bold text-white/70 hover:text-white hover:bg-white/5 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-[#D9F22A] hover:bg-[#c8e217] text-[#060A15] font-black px-6 py-2.5 rounded-xl text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(217,242,42,0.3)] transition-all cursor-pointer flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>Salvando no Catálogo...</>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Cadastrar Plataforma
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
