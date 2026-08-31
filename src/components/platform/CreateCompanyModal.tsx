import React, { useState } from 'react';
import { CompanyStartup } from '../../types/platform';
import { Building2, Globe, Mail, Phone, Tag, Sparkles, X, Image as ImageIcon } from 'lucide-react';

interface CreateCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCompanyCreated: (company: Omit<CompanyStartup, 'id' | 'createdAt'>) => void;
}

const CATEGORIES = [
  'SaaS / B2B',
  'iGaming & Apostas',
  'Fintech & Pagamentos',
  'Marketing & Vendas',
  'IA & Automação',
  'Educação / Cursos',
  'E-commerce / Dropship'
];

const PRESET_LOGOS = [
  { name: 'Modern Tech (Cyan)', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=150&q=80' },
  { name: 'Neon Sphere', url: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?auto=format&fit=crop&w=150&q=80' },
  { name: 'Cyber Minimal', url: 'https://images.unsplash.com/photo-1618172193763-c511deb635ca?auto=format&fit=crop&w=150&q=80' },
  { name: 'Vibrant Wave', url: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?auto=format&fit=crop&w=150&q=80' },
  { name: 'Gold Luxury', url: 'https://images.unsplash.com/photo-1633167606207-d840b5070fc2?auto=format&fit=crop&w=150&q=80' }
];

export const CreateCompanyModal: React.FC<CreateCompanyModalProps> = ({
  isOpen,
  onClose,
  onCompanyCreated
}) => {
  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [website, setWebsite] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [logo, setLogo] = useState(PRESET_LOGOS[0].url);
  const [commissionRange, setCommissionRange] = useState('30% a 50%');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !description.trim()) {
      alert('Por favor, preencha o nome e a descrição da empresa.');
      return;
    }

    onCompanyCreated({
      name: name.trim(),
      slug: name.toLowerCase().replace(/\s+/g, '-'),
      tagline: tagline.trim() || `${category} inovador e escalável`,
      logo: logo.trim() || PRESET_LOGOS[0].url,
      bannerImage: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=80',
      category: category as any,
      description: description.trim(),
      website: website.trim() || 'https://suaempresa.com',
      email: email.trim() || 'contato@empresa.com',
      whatsapp: whatsapp.trim() || '+55 11 99999-9999',
      totalPlansCount: 0,
      totalAffiliatesCount: 0,
      totalSalesVolume: 0,
      commissionRange: commissionRange.trim() || '30% a 50%',
      verified: true
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-[#080d1a] border border-[#D9F22A]/40 rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(217,242,42,0.15)] max-h-[90vh] overflow-y-auto no-scrollbar">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-white/50 hover:text-white transition-colors cursor-pointer w-8 h-8 rounded-full bg-white/5 flex items-center justify-center"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#D9F22A] mb-1">
          <span className="w-2 h-2 rounded-full bg-[#D9F22A]" />
          Área de Produtores & Startups
        </div>

        <h3 className="text-xl sm:text-2xl font-black text-white font-['Syne'] mb-2">
          Cadastrar Empresa ou Startup
        </h3>
        <p className="text-xs text-white/70 mb-6">
          Cadastre sua startup na plataforma para disponibilizar planos para a rede de afiliados venderem com comissão.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/80 mb-1.5">
                Nome da Empresa / Startup *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: SaaS Engine AI, BetFlow"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#050811] border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#D9F22A]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/80 mb-1.5">
                Setor / Categoria *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-[#050811] border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#D9F22A]"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat} className="bg-[#080d1a]">
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-white/80 mb-1.5">
              Slogan / Proposta de Valor
            </label>
            <input
              type="text"
              placeholder="Ex: A infraestrutura líder para operações de alta escala"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              className="w-full bg-[#050811] border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#D9F22A]"
            />
          </div>

          {/* Logo / Avatar Selection */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-white/80 mb-2">
              Logotipo da Empresa (URL ou selecione um preset)
            </label>
            <div className="flex items-center gap-3 mb-2">
              <img
                src={logo || PRESET_LOGOS[0].url}
                alt="Logo preview"
                className="w-12 h-12 rounded-xl object-cover border border-[#D9F22A]/40 bg-black/40 flex-shrink-0"
              />
              <input
                type="url"
                placeholder="https://sua-imagem.com/logo.png"
                value={logo}
                onChange={(e) => setLogo(e.target.value)}
                className="flex-1 bg-[#050811] border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#D9F22A]"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {PRESET_LOGOS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setLogo(p.url)}
                  className={`text-[10px] px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                    logo === p.url
                      ? 'border-[#D9F22A] bg-[#D9F22A]/10 text-[#D9F22A] font-bold'
                      : 'border-white/10 text-white/60 hover:text-white'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-white/80 mb-1.5">
              Descrição da Empresa & Soluções *
            </label>
            <textarea
              required
              rows={3}
              placeholder="Descreva o que a sua empresa faz, o público-alvo dos planos e por que os afiliados devem promover seus produtos..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-[#050811] border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#D9F22A] resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-white/70 mb-1">
                Website Oficial
              </label>
              <input
                type="text"
                placeholder="https://empresa.com"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="w-full bg-[#050811] border border-white/15 rounded-xl px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#D9F22A]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-white/70 mb-1">
                E-mail Corporativo
              </label>
              <input
                type="email"
                placeholder="comercial@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#050811] border border-white/15 rounded-xl px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#D9F22A]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-white/70 mb-1">
                Faixa de Comissão Afiliados
              </label>
              <input
                type="text"
                placeholder="Ex: 30% a 50%"
                value={commissionRange}
                onChange={(e) => setCommissionRange(e.target.value)}
                className="w-full bg-[#050811] border border-white/15 rounded-xl px-3 py-2 text-xs text-[#D9F22A] font-bold placeholder-white/30 focus:outline-none focus:border-[#D9F22A]"
              />
            </div>
          </div>

          <button
            type="submit"
            className="mt-3 w-full bg-[#D9F22A] hover:bg-[#c8e217] text-[#060A15] font-black py-3.5 rounded-xl text-xs uppercase tracking-wider shadow-[0_0_25px_rgba(217,242,42,0.4)] transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Building2 className="w-4 h-4" />
            Cadastrar Empresa & Liberar Planos
          </button>
        </form>
      </div>
    </div>
  );
};
