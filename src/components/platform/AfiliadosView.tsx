import React, { useEffect, useMemo, useState } from 'react';
import { CompanyPlan, UserSellerProfile, UserAffiliation } from '../../types/platform';
import {
  Copy,
  Check,
  Lock,
  Zap,
  Instagram,
  Facebook,
  Youtube,
  MessageCircle,
  Send,
  Video,
  QrCode,
  ExternalLink,
  ChevronDown,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  AlertCircle,
  ShoppingBag
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
  badge: string;
  defaultMedium: string;
  campaignDefault: string;
  channels: { id: string; label: string }[];
}

const SOCIAL_PRESETS: SocialPreset[] = [
  {
    id: 'instagram',
    name: 'Instagram',
    icon: Instagram,
    badge: 'Mais Popular',
    defaultMedium: 'stories',
    campaignDefault: 'instagram_stories',
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
    badge: 'Viral',
    defaultMedium: 'bio',
    campaignDefault: 'tiktok_bio',
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
    badge: 'Grupos & Ads',
    defaultMedium: 'feed',
    campaignDefault: 'facebook_feed',
    channels: [
      { id: 'feed', label: 'Feed / Publicação' },
      { id: 'grupo', label: 'Grupos' },
      { id: 'ads', label: 'Facebook Ads' },
      { id: 'messenger', label: 'Messenger Chat' },
    ]
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    icon: MessageCircle,
    badge: 'Alta Conversão',
    defaultMedium: 'direct_chat',
    campaignDefault: 'whatsapp_direct',
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
    badge: 'Vídeos',
    defaultMedium: 'description',
    campaignDefault: 'youtube_description',
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
    badge: 'Canal',
    defaultMedium: 'canal',
    campaignDefault: 'telegram_canal',
    channels: [
      { id: 'canal', label: 'Canal Oficial' },
      { id: 'grupo', label: 'Grupo da Comunidade' },
      { id: 'bot', label: 'Mensagem Privada' },
    ]
  }
];

const isActiveAffiliation = (aff?: UserAffiliation | null) => {
  const status = String(aff?.status || '').trim().toLowerCase();
  return status === 'ativo' || status === 'active' || status === 'approved';
};

const isPromotablePlan = (plan: CompanyPlan) => {
  const status = String(plan.status || '').trim().toLowerCase();
  const active = plan.active !== false && (status === 'ativo' || status === 'active' || status === 'approved');
  return active && plan.allowAffiliates !== false && Number(plan.commissionPercentage || 0) > 0;
};

export const AfiliadosView: React.FC<AfiliadosViewProps> = ({
  platforms,
  userProfile,
  affiliations = [],
  onJoinAffiliate
}) => {
  const promotablePlatforms = useMemo(
    () => platforms.filter(isPromotablePlan),
    [platforms]
  );

  const firstActiveAffiliatedPlanId = useMemo(() => {
    const affiliation = affiliations.find((aff) =>
      isActiveAffiliation(aff) &&
      promotablePlatforms.some((plan) => plan.id === (aff.planId || aff.plan_id))
    );
    return affiliation?.planId || affiliation?.plan_id || '';
  }, [affiliations, promotablePlatforms]);

  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedNetwork, setSelectedNetwork] = useState('instagram');
  const [selectedChannel, setSelectedChannel] = useState('stories');
  const [utmSource, setUtmSource] = useState('instagram');
  const [utmMedium, setUtmMedium] = useState('stories');
  const [utmCampaign, setUtmCampaign] = useState('instagram_stories');
  const [isAdvancedUtmOpen, setIsAdvancedUtmOpen] = useState(false);
  const [isQrCodeOpen, setIsQrCodeOpen] = useState(false);
  const [isTipsOpen, setIsTipsOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (!promotablePlatforms.length) {
      setSelectedProductId('');
      return;
    }
    if (selectedProductId && promotablePlatforms.some((plan) => plan.id === selectedProductId)) return;
    setSelectedProductId(firstActiveAffiliatedPlanId || promotablePlatforms[0].id);
  }, [promotablePlatforms, firstActiveAffiliatedPlanId, selectedProductId]);

  const selectedProduct = useMemo(
    () => promotablePlatforms.find((plan) => plan.id === selectedProductId) || null,
    [promotablePlatforms, selectedProductId]
  );

  const userAffiliation = useMemo(() => {
    if (!selectedProduct) return null;
    return affiliations.find((aff) =>
      (aff.planId === selectedProduct.id || aff.plan_id === selectedProduct.id) &&
      isActiveAffiliation(aff)
    ) || null;
  }, [affiliations, selectedProduct]);

  const activeAffiliateCode = String(
    userAffiliation?.affiliateCode || userAffiliation?.affiliate_code || ''
  ).trim();
  const isAffiliatedToSelected = Boolean(userAffiliation && activeAffiliateCode);

  const generatedAffiliateUrl = useMemo(() => {
    if (!selectedProduct || !isAffiliatedToSelected) return '';
    try {
      const url = new URL(formatAffiliatePlanUrl(selectedProduct.id, activeAffiliateCode));
      url.searchParams.set('utm_source', utmSource.trim() || selectedNetwork);
      url.searchParams.set('utm_medium', utmMedium.trim() || selectedChannel);
      url.searchParams.set('utm_campaign', utmCampaign.trim() || `${selectedNetwork}_${selectedChannel}`);
      return url.toString();
    } catch {
      return '';
    }
  }, [
    selectedProduct,
    isAffiliatedToSelected,
    activeAffiliateCode,
    utmSource,
    utmMedium,
    utmCampaign,
    selectedNetwork,
    selectedChannel
  ]);

  const currentPreset = SOCIAL_PRESETS.find((preset) => preset.id === selectedNetwork) || SOCIAL_PRESETS[0];

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

  const handleCopy = async () => {
    if (!generatedAffiliateUrl) return;
    await navigator.clipboard.writeText(generatedAffiliateUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleShareWhatsApp = () => {
    if (!selectedProduct || !generatedAffiliateUrl) return;
    const shareText = `Conheça ${selectedProduct.name}: ${generatedAffiliateUrl}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-5 sm:gap-6 px-1 sm:px-0" id="leadspay-afiliados-view">
      <section className="affiliate-links-hero rounded-2xl p-5 sm:p-7">
        <div className="flex flex-col items-center sm:items-start text-center sm:text-left gap-3">
          <div className="affiliate-links-kicker inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            Divulgação & Redes Sociais
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight">
            Gerador de Links de Afiliado
          </h1>
          <p className="text-xs sm:text-sm max-w-2xl leading-relaxed affiliate-links-muted">
            Gere links rastreados para Instagram, TikTok, Facebook, WhatsApp, YouTube e Telegram.
            O código de afiliado é validado pelo backend no checkout e os UTMs acompanham a venda.
          </p>
        </div>
      </section>

      <section className="affiliate-links-card rounded-2xl p-4 sm:p-6 space-y-5 sm:space-y-6">
        <div>
          <label className="block text-xs font-black uppercase tracking-wider mb-2">
            1. Selecione o Produto / Startup para Divulgar:
          </label>
          <select
            value={selectedProductId}
            onChange={(event) => setSelectedProductId(event.target.value)}
            className="affiliate-links-input w-full rounded-xl px-4 py-3.5 text-xs sm:text-sm focus:outline-none cursor-pointer"
          >
            {promotablePlatforms.length === 0 ? (
              <option value="">Nenhuma oferta ativa com afiliação disponível</option>
            ) : (
              promotablePlatforms.map((plan) => {
                const activeAff = affiliations.find((aff) =>
                  (aff.planId === plan.id || aff.plan_id === plan.id) && isActiveAffiliation(aff)
                );
                return (
                  <option key={plan.id} value={plan.id}>
                    {activeAff ? '✓ [AFILIADO] ' : '[DISPONÍVEL] '}
                    {plan.name} • Comissão {Number(plan.commissionPercentage || 0).toLocaleString('pt-BR')}%
                  </option>
                );
              })
            )}
          </select>
        </div>

        {!selectedProduct ? (
          <div className="affiliate-links-empty rounded-2xl p-7 text-center">
            <ShoppingBag className="w-9 h-9 mx-auto mb-3" />
            <h3 className="text-sm font-extrabold">Nenhuma oferta divulgável disponível</h3>
            <p className="text-xs mt-1 affiliate-links-muted">
              Quando uma empresa publicar uma oferta ativa com comissão para afiliados, ela aparecerá aqui automaticamente.
            </p>
          </div>
        ) : (
          <>
            <div>
              <div className="flex items-center justify-between gap-3 mb-2">
                <label className="block text-xs font-black uppercase tracking-wider">
                  2. Escolha onde vai divulgar:
                </label>
                <span className="text-[11px] affiliate-links-accent font-bold">
                  {currentPreset.name} selecionado
                </span>
              </div>

              <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
                {SOCIAL_PRESETS.map((preset) => {
                  const Icon = preset.icon;
                  const selected = selectedNetwork === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelectNetwork(preset)}
                      className={`affiliate-social-option ${selected ? 'is-selected' : ''} flex flex-col items-center justify-center p-3 rounded-xl text-center min-h-[72px] sm:min-h-[80px]`}
                    >
                      <Icon className="w-5 h-5 sm:w-6 sm:h-6 mb-1.5" />
                      <span className="text-xs font-bold truncate max-w-full">{preset.name}</span>
                      <span className="text-[9px] mt-1 affiliate-links-muted">{preset.badge}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider mb-2">
                3. Local do Link no {currentPreset.name}:
              </label>
              <div className="flex flex-wrap gap-2">
                {currentPreset.channels.map((channel) => (
                  <button
                    key={channel.id}
                    type="button"
                    onClick={() => handleSelectChannel(channel.id)}
                    className={`affiliate-channel-option ${selectedChannel === channel.id ? 'is-selected' : ''} px-3.5 py-2 rounded-xl text-xs font-bold`}
                  >
                    {channel.label}
                  </button>
                ))}
              </div>
            </div>

            {isAffiliatedToSelected ? (
              <div className="affiliate-link-result rounded-2xl p-4 sm:p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 affiliate-result-divider">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full affiliate-pulse-dot" />
                    <span className="text-xs font-black uppercase tracking-wider affiliate-links-accent">
                      Link rastreado pronto
                    </span>
                  </div>
                  <code className="text-[11px] px-2.5 py-1 rounded-lg">
                    CÓDIGO: {activeAffiliateCode}
                  </code>
                </div>

                <div className="affiliate-link-code p-3 sm:p-3.5 rounded-xl font-mono text-xs sm:text-sm break-all select-all">
                  {generatedAffiliateUrl}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button type="button" onClick={handleCopy} className="affiliate-primary-button min-h-[48px] rounded-xl text-xs font-black uppercase flex items-center justify-center gap-2">
                    {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copiedLink ? 'Copiado!' : 'Copiar Link'}
                  </button>
                  <button type="button" onClick={handleShareWhatsApp} className="min-h-[48px] rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white text-xs font-black uppercase flex items-center justify-center gap-2">
                    <MessageCircle className="w-4 h-4" />
                    WhatsApp
                  </button>
                  <a href={generatedAffiliateUrl} target="_blank" rel="noopener noreferrer" className="affiliate-secondary-button min-h-[48px] rounded-xl text-xs font-bold uppercase flex items-center justify-center gap-2">
                    <ExternalLink className="w-4 h-4" />
                    Testar / Abrir
                  </a>
                </div>
              </div>
            ) : (
              <div className="affiliate-locked-box p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
                <div className="flex flex-col sm:flex-row items-center gap-3.5">
                  <div className="affiliate-lock-icon w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Lock className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider">
                      Código de divulgação protegido
                    </h4>
                    <p className="text-xs mt-1 max-w-md affiliate-links-muted">
                      Você ainda não possui uma afiliação ativa para {selectedProduct.name}. A afiliação é criada no backend e o código é exclusivo da sua conta.
                    </p>
                  </div>
                </div>

                {onJoinAffiliate && (
                  <button
                    type="button"
                    onClick={() => onJoinAffiliate(selectedProduct)}
                    className="affiliate-primary-button w-full sm:w-auto px-6 py-3.5 rounded-xl text-xs font-black uppercase flex items-center justify-center gap-2"
                  >
                    <Zap className="w-4 h-4" />
                    Quero me afiliar
                  </button>
                )}
              </div>
            )}

            <div className="space-y-3 pt-2">
              <div className="affiliate-collapsible rounded-xl overflow-hidden">
                <button type="button" onClick={() => setIsQrCodeOpen(!isQrCodeOpen)} className="w-full px-4 py-3 flex items-center justify-between text-left">
                  <div className="flex items-center gap-2.5">
                    <QrCode className="w-4 h-4 affiliate-links-accent" />
                    <span className="text-xs font-bold">QR Code do link rastreado</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 transition-transform ${isQrCodeOpen ? 'rotate-180' : ''}`} />
                </button>
                {isQrCodeOpen && (
                  <div className="p-4 affiliate-collapsible-body flex flex-col sm:flex-row items-center gap-5">
                    {generatedAffiliateUrl ? (
                      <>
                        <div className="bg-white p-3 rounded-xl shadow-sm">
                          <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(generatedAffiliateUrl)}`}
                            alt="QR Code do link de afiliado"
                            className="w-32 h-32"
                          />
                        </div>
                        <div className="space-y-2 text-center sm:text-left">
                          <h4 className="text-xs font-bold uppercase">QR Code direto do seu link</h4>
                          <p className="text-xs affiliate-links-muted">
                            O QR aponta para a mesma URL rastreada, incluindo seu código de afiliado e UTMs.
                          </p>
                          <a
                            href={`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(generatedAffiliateUrl)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="affiliate-secondary-button inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold"
                          >
                            Abrir QR em alta resolução
                          </a>
                        </div>
                      </>
                    ) : (
                      <p className="text-xs affiliate-links-muted">Ative a afiliação acima para gerar o QR Code.</p>
                    )}
                  </div>
                )}
              </div>

              <div className="affiliate-collapsible rounded-xl overflow-hidden">
                <button type="button" onClick={() => setIsAdvancedUtmOpen(!isAdvancedUtmOpen)} className="w-full px-4 py-3 flex items-center justify-between text-left">
                  <div className="flex items-center gap-2.5">
                    <SlidersHorizontal className="w-4 h-4 affiliate-links-accent" />
                    <span className="text-xs font-bold">Parâmetros UTM personalizados</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 transition-transform ${isAdvancedUtmOpen ? 'rotate-180' : ''}`} />
                </button>
                {isAdvancedUtmOpen && (
                  <div className="p-4 affiliate-collapsible-body space-y-4">
                    <p className="text-xs affiliate-links-muted">
                      Estes parâmetros são gravados no pedido e na venda quando o cliente conclui o pagamento.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <input value={utmSource} onChange={(event) => setUtmSource(event.target.value)} placeholder="utm_source" className="affiliate-links-input rounded-xl px-3 py-2.5 text-xs" />
                      <input value={utmMedium} onChange={(event) => setUtmMedium(event.target.value)} placeholder="utm_medium" className="affiliate-links-input rounded-xl px-3 py-2.5 text-xs" />
                      <input value={utmCampaign} onChange={(event) => setUtmCampaign(event.target.value)} placeholder="utm_campaign" className="affiliate-links-input rounded-xl px-3 py-2.5 text-xs" />
                    </div>
                  </div>
                )}
              </div>

              <div className="affiliate-collapsible rounded-xl overflow-hidden">
                <button type="button" onClick={() => setIsTipsOpen(!isTipsOpen)} className="w-full px-4 py-3 flex items-center justify-between text-left">
                  <div className="flex items-center gap-2.5">
                    <Smartphone className="w-4 h-4 affiliate-links-accent" />
                    <span className="text-xs font-bold">Como usar o link nas redes</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 transition-transform ${isTipsOpen ? 'rotate-180' : ''}`} />
                </button>
                {isTipsOpen && (
                  <div className="p-4 affiliate-collapsible-body grid gap-2.5 text-xs affiliate-links-muted">
                    <p><strong>Instagram:</strong> use o link em Stories, Bio ou Reels e selecione o posicionamento acima.</p>
                    <p><strong>WhatsApp:</strong> o botão acima já abre a mensagem com seu link rastreado.</p>
                    <p><strong>Anúncios:</strong> personalize os UTMs para separar campanhas e posicionamentos nos relatórios.</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {userProfile?.verificationStatus !== 'approved' && userProfile?.verified !== true && (
          <div className="affiliate-info-box rounded-xl p-3 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            Sua conta precisa continuar aprovada para novas afiliações e recebimento de comissão.
          </div>
        )}
      </section>
    </div>
  );
};
