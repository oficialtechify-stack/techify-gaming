import React, { useState } from 'react';
import { CompanyPlan, UserSellerProfile, UserAffiliation } from '../../types/platform';
import { 
  Link as LinkIcon, 
  Copy, 
  Check, 
  Share2, 
  Lock, 
  Zap, 
  Instagram, 
  Facebook, 
  Youtube, 
  MessageCircle, 
  Send, 
  Video, 
  Globe, 
  QrCode, 
  ExternalLink, 
  ChevronDown, 
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  Award
} from 'lucide-react';
import { formatAffiliatePlanUrl } from '../../utils/affiliateTracking';

interface AfiliadosViewProps {
  platforms: CompanyPlan[];
  userProfile: UserSellerProfile;
  affiliations?: UserAffiliation[];
  onJoinAffiliate?: (plan: CompanyPlan) => void;
}

interface SocialPreset {
  id: string;
  name: string;
  icon: any;
  color: string;
  activeBg: string;
  activeBorder: string;
  badge: string;
  defaultMedium: string;
  campaignDefault: string;
  channels: { id: string; label: string; iconLabel?: string }[];
}

const SOCIAL_PRESETS: SocialPreset[] = [
  {
    id: 'instagram',
    name: 'Instagram',
    icon: Instagram,
    color: 'from-pink-500 via-rose-500 to-amber-500',
    activeBg: 'bg-gradient-to-r from-pink-500/20 to-purple-500/20',
    activeBorder: 'border-pink-500/50',
    badge: 'Mais Popular',
    defaultMedium: 'stories',
    campaignDefault: 'insta_bio_stories',
    channels: [
      { id: 'stories', label: 'Stories (Adesivo)' },
      { id: 'bio', label: 'Link da Bio' },
      { id: 'reels', label: 'Reels / Vídeos' },
      { id: 'direct', label: 'Direct Message (DM)' },
    ]
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    icon: Video,
    color: 'from-cyan-400 to-pink-500',
    activeBg: 'bg-cyan-500/15',
    activeBorder: 'border-cyan-400/50',
    badge: 'Viral',
    defaultMedium: 'bio',
    campaignDefault: 'tiktok_viral_2026',
    channels: [
      { id: 'bio', label: 'Link na Bio' },
      { id: 'video', label: 'Vídeo Fixado' },
      { id: 'live', label: 'Transmissão Live' },
      { id: 'ads', label: 'TikTok Ads' },
    ]
  },
  {
    id: 'facebook',
    name: 'Facebook',
    icon: Facebook,
    color: 'from-blue-600 to-indigo-600',
    activeBg: 'bg-blue-600/15',
    activeBorder: 'border-blue-500/50',
    badge: 'Grupos & Ads',
    defaultMedium: 'feed',
    campaignDefault: 'facebook_grupos_ads',
    channels: [
      { id: 'feed', label: 'Feed / Publicação' },
      { id: 'grupo', label: 'Grupos de Investidores' },
      { id: 'ads', label: 'Facebook Ads' },
      { id: 'messenger', label: 'Messenger Chat' },
    ]
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    icon: MessageCircle,
    color: 'from-emerald-500 to-teal-600',
    activeBg: 'bg-emerald-500/15',
    activeBorder: 'border-emerald-500/50',
    badge: 'Alta Conversão',
    defaultMedium: 'direct_chat',
    campaignDefault: 'whatsapp_direto_vip',
    channels: [
      { id: 'direct_chat', label: 'Conversa Individual' },
      { id: 'grupo_vip', label: 'Grupo VIP / Lista' },
      { id: 'status', label: 'Status do WhatsApp' },
    ]
  },
  {
    id: 'youtube',
    name: 'YouTube',
    icon: Youtube,
    color: 'from-red-500 to-rose-700',
    activeBg: 'bg-red-500/15',
    activeBorder: 'border-red-500/50',
    badge: 'Vídeos',
    defaultMedium: 'description',
    campaignDefault: 'youtube_review_shorts',
    channels: [
      { id: 'description', label: 'Descrição do Vídeo' },
      { id: 'shorts', label: 'YouTube Shorts' },
      { id: 'pinned_comment', label: 'Comentário Fixado' },
    ]
  },
  {
    id: 'telegram',
    name: 'Telegram',
    icon: Send,
    color: 'from-sky-400 to-blue-500',
    activeBg: 'bg-sky-500/15',
    activeBorder: 'border-sky-400/50',
    badge: 'Canal',
    defaultMedium: 'canal',
    campaignDefault: 'telegram_canal_vip',
    channels: [
      { id: 'canal', label: 'Canal Oficial' },
      { id: 'grupo', label: 'Grupo da Comunidade' },
      { id: 'bot', label: 'Mensagem Privada' },
    ]
  }
];

export const AfiliadosView: React.FC<AfiliadosViewProps> = ({
  platforms,
  userProfile,
  affiliations = [],
  onJoinAffiliate
}) => {
  // Find initial platform: prioritize affiliated platforms if any exist
  const firstAffiliatedPlanId = affiliations[0]?.planId || affiliations[0]?.plan_id;
  const initialPlatformId = firstAffiliatedPlanId && platforms.some(p => p.id === firstAffiliatedPlanId)
    ? firstAffiliatedPlanId
    : platforms[0]?.id || '';

  const [selectedProductId, setSelectedProductId] = useState<string>(initialPlatformId);
  const [selectedNetwork, setSelectedNetwork] = useState<string>('instagram');
  const [selectedChannel, setSelectedChannel] = useState<string>('stories');
  
  // UTM Parameters
  const [utmSource, setUtmSource] = useState<string>('instagram');
  const [utmMedium, setUtmMedium] = useState<string>('stories');
  const [utmCampaign, setUtmCampaign] = useState<string>('insta_bio_stories');
  
  // Collapsible sections - CLOSED BY DEFAULT per user request
  const [isAdvancedUtmOpen, setIsAdvancedUtmOpen] = useState<boolean>(false);
  const [isQrCodeOpen, setIsQrCodeOpen] = useState<boolean>(false);
  const [isTipsOpen, setIsTipsOpen] = useState<boolean>(false);

  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  const selectedProduct: CompanyPlan = platforms.find(p => p.id === selectedProductId) || platforms[0] || {
    id: 'custom',
    companyId: 'comp_default',
    companyName: 'LeadsPay Platforms',
    companyLogo: '',
    bannerImage: '',
    name: 'Plataforma LeadsPay',
    category: 'Geral',
    priceSetup: 20000,
    priceMonthly: 3000,
    commissionPercentage: 40,
    commissionValue: 8000,
    recurrentCommission: 15,
    description: '',
    features: [],
    totalSales: 0,
    status: 'Ativo'
  };

  // Enforce affiliate relationship & individual affiliate code
  const userAffiliation = affiliations.find(a => 
    (a.planId && a.planId === selectedProduct.id) || 
    (a.plan_id && a.plan_id === selectedProduct.id)
  );
  const isAffiliatedToSelected = Boolean(userAffiliation && (userAffiliation.affiliateCode || userAffiliation.affiliate_code));
  const activeAffiliateCode = userAffiliation?.affiliateCode || userAffiliation?.affiliate_code || '';

  const generatedAffiliateUrl = isAffiliatedToSelected
    ? `${formatAffiliatePlanUrl(selectedProduct.id, activeAffiliateCode)}&utm_source=${encodeURIComponent(utmSource)}&utm_medium=${encodeURIComponent(utmMedium)}&utm_campaign=${encodeURIComponent(utmCampaign)}`
    : '';

  // Select network and automatically populate UTMs
  const handleSelectNetwork = (preset: SocialPreset) => {
    setSelectedNetwork(preset.id);
    setSelectedChannel(preset.defaultMedium);
    setUtmSource(preset.id);
    setUtmMedium(preset.defaultMedium);
    setUtmCampaign(preset.campaignDefault);
  };

  const handleSelectChannel = (channelId: string) => {
    setSelectedChannel(channelId);
    setUtmMedium(channelId);
  };

  const handleCopy = () => {
    if (!isAffiliatedToSelected) return;
    navigator.clipboard.writeText(generatedAffiliateUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleShareWhatsApp = () => {
    if (!isAffiliatedToSelected) return;
    const shareText = `Olá! Conheça a plataforma oficial ${selectedProduct.name}. Acesse pelo meu link de parceiro autorizado: ${generatedAffiliateUrl}`;
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    window.open(waUrl, '_blank');
  };

  const currentPreset = SOCIAL_PRESETS.find(p => p.id === selectedNetwork) || SOCIAL_PRESETS[0];

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-5 sm:gap-6 px-1 sm:px-0" id="leadspay-afiliados-view">
      
      {/* Header Banner - Responsive & Mobile-friendly */}
      <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-br from-[#0a1428] via-[#0d1c38] to-[#060a15] p-5 sm:p-7 shadow-xl">
        <div className="flex flex-col items-center sm:items-start text-center sm:text-left gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D9F22A]/10 border border-[#D9F22A]/30 text-[11px] font-black text-[#D9F22A] uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            DIVULGAÇÃO & REDES SOCIAIS
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white font-['Syne'] tracking-tight">
            Gerador de Links de Afiliado
          </h1>
          <p className="text-xs sm:text-sm text-white/70 max-w-2xl leading-relaxed">
            Crie links rastreados prontos para o <strong className="text-white">Instagram, TikTok, Facebook, WhatsApp, YouTube e Telegram</strong>. Cada clique e venda é atribuído automaticamente ao seu código de parceiro.
          </p>
        </div>
      </div>

      {/* Main Link Generator Card */}
      <div className="bg-[#080d1a] border border-white/10 rounded-2xl p-4 sm:p-6 shadow-xl space-y-5 sm:space-y-6">
        
        {/* Step 1: Select Platform */}
        <div>
          <label className="block text-xs font-black uppercase tracking-wider text-white/80 mb-2">
            1. Selecione o Produto / Startup para Divulgar:
          </label>
          <select
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
            className="w-full bg-[#050811] border border-white/15 rounded-xl px-4 py-3.5 text-xs sm:text-sm text-white focus:outline-none focus:border-[#D9F22A] cursor-pointer"
          >
            {platforms.length === 0 ? (
              <option value="">Nenhum produto cadastrado no catálogo</option>
            ) : (
              platforms.map(p => {
                const isAff = affiliations.some(a => (a.planId === p.id || a.plan_id === p.id));
                return (
                  <option key={p.id} value={p.id}>
                    {isAff ? '✓ [AFILIADO] ' : '🔒 [NÃO AFILIADO] '}
                    {p.name} • Comissão: R$ {(p.commissionValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </option>
                );
              })
            )}
          </select>
        </div>

        {/* Step 2: Select Social Network */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-black uppercase tracking-wider text-white/80">
              2. Escolha onde vai divulgar (Rede Social):
            </label>
            <span className="text-[11px] text-[#D9F22A] font-bold">
              {currentPreset.name} selecionado
            </span>
          </div>

          <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
            {SOCIAL_PRESETS.map((preset) => {
              const Icon = preset.icon;
              const isSelected = selectedNetwork === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectNetwork(preset)}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer min-h-[72px] sm:min-h-[80px] active:scale-[0.98] ${
                    isSelected
                      ? `${preset.activeBg} ${preset.activeBorder} border-2 text-white shadow-lg shadow-black/40`
                      : 'bg-[#050811] border-white/10 text-white/60 hover:text-white hover:border-white/20'
                  }`}
                >
                  <Icon className={`w-5 h-5 sm:w-6 sm:h-6 mb-1.5 ${isSelected ? 'text-[#D9F22A]' : 'text-white/60'}`} />
                  <span className="text-xs font-bold truncate max-w-full">{preset.name}</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded-full font-medium mt-1 text-white/50">
                    {preset.badge}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 3: Social Placement Sub-Channels */}
        <div>
          <label className="block text-xs font-black uppercase tracking-wider text-white/80 mb-2">
            3. Local do Link no {currentPreset.name}:
          </label>
          <div className="flex flex-wrap gap-2">
            {currentPreset.channels.map((channel) => {
              const isChannelSelected = selectedChannel === channel.id;
              return (
                <button
                  key={channel.id}
                  type="button"
                  onClick={() => handleSelectChannel(channel.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 ${
                    isChannelSelected
                      ? 'bg-[#D9F22A] text-[#060A15] shadow-[0_0_12px_rgba(217,242,42,0.25)]'
                      : 'bg-[#050811] border border-white/10 text-white/70 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span>{channel.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Affiliate Link Generation Result Box */}
        {isAffiliatedToSelected ? (
          <div className="rounded-2xl bg-[#050811] border-2 border-[#D9F22A]/40 p-4 sm:p-5 space-y-4 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#D9F22A] animate-pulse" />
                <span className="text-xs font-black uppercase tracking-wider text-[#D9F22A]">
                  Link Pronto para {currentPreset.name} ({selectedChannel.toUpperCase()})
                </span>
              </div>
              <div className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold text-[#D9F22A] bg-[#D9F22A]/10 border border-[#D9F22A]/30 px-2.5 py-1 rounded-lg">
                <span>CÓDIGO:</span>
                <span className="text-white">{activeAffiliateCode}</span>
              </div>
            </div>

            {/* Generated Link Display */}
            <div className="p-3 sm:p-3.5 rounded-xl bg-black/40 border border-white/10 font-mono text-xs sm:text-sm text-white/90 break-all select-all flex items-center justify-between gap-3">
              <span className="line-clamp-2 sm:line-clamp-1">{generatedAffiliateUrl}</span>
            </div>

            {/* Action Buttons - Mobile friendly full-width */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              {/* Copy Link Button */}
              <button
                type="button"
                onClick={handleCopy}
                className="w-full bg-[#D9F22A] hover:bg-[#c8e217] text-[#060A15] font-black py-3.5 px-4 rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(217,242,42,0.3)] active:scale-[0.98] min-h-[48px]"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Copiado com Sucesso!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copiar Link</span>
                  </>
                )}
              </button>

              {/* Direct WhatsApp Share Button */}
              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="w-full bg-[#25D366] hover:bg-[#20ba59] text-white font-black py-3.5 px-4 rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] min-h-[48px] shadow-lg shadow-emerald-950/40"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Enviar no WhatsApp</span>
              </button>

              {/* Test / Open Link */}
              <a
                href={generatedAffiliateUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-3.5 px-4 rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 border border-white/15 cursor-pointer active:scale-[0.98] min-h-[48px]"
              >
                <ExternalLink className="w-4 h-4 text-white/70" />
                <span>Testar / Abrir</span>
              </a>
            </div>
          </div>
        ) : (
          /* Not affiliated to this specific plan yet */
          <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 flex-shrink-0">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-amber-300">
                  Código de Divulgação Protegido
                </h4>
                <p className="text-xs text-white/70 mt-1 max-w-md">
                  Você ainda não possui afiliação aprovada neste plano ({selectedProduct.name}). Solicite agora com 1 clique para desbloquear seus links parametrizados!
                </p>
              </div>
            </div>

            {onJoinAffiliate && (
              <button
                type="button"
                onClick={() => onJoinAffiliate(selectedProduct)}
                className="w-full sm:w-auto px-6 py-3.5 bg-[#D9F22A] hover:bg-[#c8e217] text-[#060A15] font-black text-xs rounded-xl cursor-pointer transition-all uppercase tracking-wider shadow-[0_0_15px_rgba(217,242,42,0.3)] whitespace-nowrap flex items-center justify-center gap-2 active:scale-95 min-h-[44px]"
              >
                <Zap className="w-4 h-4 fill-current" />
                <span>Quero me Afiliar e Obter Código</span>
              </button>
            )}
          </div>
        )}

        {/* Collapsible Sections: CLOSED BY DEFAULT per user request */}
        <div className="space-y-3 pt-2">
          
          {/* Section A: QR Code Generator - Closed by default */}
          <div className="border border-white/10 rounded-xl overflow-hidden bg-[#050811]">
            <button
              type="button"
              onClick={() => setIsQrCodeOpen(!isQrCodeOpen)}
              className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-white/[0.03] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <QrCode className="w-4 h-4 text-[#D9F22A]" />
                <span className="text-xs font-bold text-white">QR Code para Divulgação Impressa / Stories</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-white/50 transition-transform ${isQrCodeOpen ? 'rotate-180 text-[#D9F22A]' : ''}`} />
            </button>

            {isQrCodeOpen && (
              <div className="p-4 border-t border-white/10 flex flex-col sm:flex-row items-center gap-5 animate-in fade-in duration-200">
                {isAffiliatedToSelected ? (
                  <>
                    <div className="bg-white p-3 rounded-xl shadow-lg flex-shrink-0">
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(generatedAffiliateUrl)}`}
                        alt="QR Code de Afiliado"
                        className="w-32 h-32"
                      />
                    </div>
                    <div className="space-y-2 text-center sm:text-left">
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                        QR Code Direto do seu Link
                      </h4>
                      <p className="text-xs text-white/60 leading-relaxed">
                        Coloque este QR Code em seus stories do Instagram, panfletos físicos ou cartões de visita. Quando o cliente escanear com o celular, ele vai direto para o checkout com sua comissão garantida.
                      </p>
                      <a
                        href={`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(generatedAffiliateUrl)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        download="qrcode-afiliado.png"
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition-colors cursor-pointer"
                      >
                        Baixar Imagem em Alta Resolução
                      </a>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-white/60">
                    Ative a afiliação nesta plataforma acima para gerar o QR Code.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Section B: Advanced UTM Settings - Closed by default */}
          <div className="border border-white/10 rounded-xl overflow-hidden bg-[#050811]">
            <button
              type="button"
              onClick={() => setIsAdvancedUtmOpen(!isAdvancedUtmOpen)}
              className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-white/[0.03] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <SlidersHorizontal className="w-4 h-4 text-[#D9F22A]" />
                <span className="text-xs font-bold text-white">Parâmetros UTM Personalizados (Avançado)</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-white/50 transition-transform ${isAdvancedUtmOpen ? 'rotate-180 text-[#D9F22A]' : ''}`} />
            </button>

            {isAdvancedUtmOpen && (
              <div className="p-4 border-t border-white/10 space-y-4 animate-in fade-in duration-200">
                <p className="text-xs text-white/60">
                  Edite manualmente os parâmetros de rastreamento se estiver rodando anúncios pagos no Facebook Ads, TikTok Ads ou campanhas com influenciadores:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-white/70 mb-1">
                      utm_source (Origem)
                    </label>
                    <input
                      type="text"
                      value={utmSource}
                      onChange={(e) => setUtmSource(e.target.value)}
                      placeholder="ex: instagram"
                      className="w-full bg-[#080d1a] border border-white/15 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#D9F22A]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-white/70 mb-1">
                      utm_medium (Mídia / Posicionamento)
                    </label>
                    <input
                      type="text"
                      value={utmMedium}
                      onChange={(e) => setUtmMedium(e.target.value)}
                      placeholder="ex: stories, reels, bio"
                      className="w-full bg-[#080d1a] border border-white/15 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#D9F22A]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-white/70 mb-1">
                      utm_campaign (Campanha)
                    </label>
                    <input
                      type="text"
                      value={utmCampaign}
                      onChange={(e) => setUtmCampaign(e.target.value)}
                      placeholder="ex: direct_pitch_2026"
                      className="w-full bg-[#080d1a] border border-white/15 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#D9F22A]"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section C: Dicas de Vendas nas Redes - Closed by default */}
          <div className="border border-white/10 rounded-xl overflow-hidden bg-[#050811]">
            <button
              type="button"
              onClick={() => setIsTipsOpen(!isTipsOpen)}
              className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-white/[0.03] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Smartphone className="w-4 h-4 text-[#D9F22A]" />
                <span className="text-xs font-bold text-white">Dicas para Divulgar pelo Celular & Vender Mais</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-white/50 transition-transform ${isTipsOpen ? 'rotate-180 text-[#D9F22A]' : ''}`} />
            </button>

            {isTipsOpen && (
              <div className="p-4 border-t border-white/10 space-y-3 text-xs text-white/80 animate-in fade-in duration-200">
                <div className="p-3 rounded-lg bg-white/5 border border-white/5 flex items-start gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-[#D9F22A] mt-1.5 flex-shrink-0" />
                  <div>
                    <strong className="text-white">Stories do Instagram:</strong> Utilize o sticker de link do Instagram e insira o link gerado com <code>utm_medium=stories</code>. Faça um vídeo curto mostrando a plataforma e convide para clicar no sticker.
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-white/5 border border-white/5 flex items-start gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-[#D9F22A] mt-1.5 flex-shrink-0" />
                  <div>
                    <strong className="text-white">Bio do TikTok & Instagram:</strong> Coloque o link principal da sua bio com o nome da plataforma. Adicione uma chamada de ação nos seus vídeos: "Link na bio!".
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-white/5 border border-white/5 flex items-start gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-[#D9F22A] mt-1.5 flex-shrink-0" />
                  <div>
                    <strong className="text-white">WhatsApp & Grupos:</strong> Use o botão "Enviar no WhatsApp" acima para mandar uma mensagem já formatada para seus clientes e grupos de networking.
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
};
