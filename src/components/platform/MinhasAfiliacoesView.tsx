import React, { useState } from 'react';
import { UserAffiliation, CompanyPlan } from '../../types/platform';
import { formatAffiliatePlanUrl, getAppBaseUrl } from '../../utils/affiliateTracking';
import { 
  Link2, 
  Copy, 
  Check, 
  DollarSign, 
  Share2, 
  Zap, 
  ExternalLink, 
  Percent, 
  TrendingUp, 
  ArrowUpRight, 
  ShoppingBag,
  Sparkles,
  Sliders
} from 'lucide-react';

interface MinhasAfiliacoesViewProps {
  affiliations: UserAffiliation[];
  plans: CompanyPlan[];
  onOpenRegisterSale: (planId?: string) => void;
  onNavigateToVitrine: () => void;
  onDeleteAffiliation: (affiliationId: string, planId?: string, companyId?: string) => void;
}

export const MinhasAfiliacoesView: React.FC<MinhasAfiliacoesViewProps> = ({
  affiliations = [],
  plans = [],
  onOpenRegisterSale,
  onNavigateToVitrine,
  onDeleteAffiliation
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedAffiliationForUtm, setSelectedAffiliationForUtm] = useState<UserAffiliation | null>(null);
  const [utmSource, setUtmSource] = useState('instagram');
  const [utmMedium, setUtmMedium] = useState('bio_link');
  const [utmCampaign, setUtmCampaign] = useState('lancamento');
  const [copiedUtm, setCopiedUtm] = useState(false);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const totalCommissions = affiliations.reduce((acc, a) => acc + (a.totalEarned || 0), 0);
  const totalSales = affiliations.reduce((acc, a) => acc + (a.salesCount || 0), 0);

  const currentOrigin = getAppBaseUrl();

  const generateUtmLink = (baseLink: string) => {
    const url = new URL(baseLink || `${currentOrigin}`);
    url.searchParams.set('utm_source', utmSource);
    url.searchParams.set('utm_medium', utmMedium);
    url.searchParams.set('utm_campaign', utmCampaign);
    return url.toString();
  };

  return (
    <div className="flex flex-col gap-6" id="leadspay-minhas-afiliacoes-view">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#D9F22A] mb-1">
            <Link2 className="w-3.5 h-3.5" />
            Painel do Afiliado
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-['Syne']">
            Meus Produtos Afiliados & Links de Venda
          </h1>
          <p className="text-xs text-white/60 mt-1 max-w-2xl">
            Gerencie os planos que você está divulgando, gere links personalizados com rastreamento UTM e registre vendas para receber comissões instantâneas.
          </p>
        </div>

        <button
          onClick={onNavigateToVitrine}
          className="bg-[#D9F22A] hover:bg-[#c8e217] text-[#060A15] font-black px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(217,242,42,0.3)] transition-all cursor-pointer flex items-center gap-2"
        >
          <ShoppingBag className="w-4 h-4" />
          Buscar Novos Produtos
        </button>
      </div>

      {/* Metric summary banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#080d1a] border border-white/10 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#D9F22A]/10 border border-[#D9F22A]/30 flex items-center justify-center text-[#D9F22A]">
            <Link2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase text-white/50 block">Produtos Afiliados</span>
            <span className="text-xl font-black text-white font-['Syne']">{affiliations.length} planos</span>
          </div>
        </div>

        <div className="bg-[#080d1a] border border-white/10 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase text-white/50 block">Vendas Fechadas</span>
            <span className="text-xl font-black text-white font-['Syne']">{totalSales} contratos</span>
          </div>
        </div>

        <div className="bg-[#080d1a] border border-white/10 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-green-500/10 border border-green-500/30 flex items-center justify-center text-green-400">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase text-green-400 block">Comissões Recebidas</span>
            <span className="text-xl font-black text-white font-['Syne']">
              R$ {totalCommissions.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* Affiliations List */}
      {affiliations.length === 0 ? (
        <div className="bg-[#080d1a] border-2 border-dashed border-[#D9F22A]/30 rounded-3xl p-10 text-center flex flex-col items-center justify-center gap-4">
          <ShoppingBag className="w-12 h-12 text-[#D9F22A]/50" />
          <div className="max-w-md">
            <h3 className="text-lg font-bold text-white font-['Syne'] mb-1">
              Você ainda não se afiliou a nenhum produto
            </h3>
            <p className="text-xs text-white/60 mb-5 leading-relaxed">
              Acesse o Marketplace de Startups & Planos, escolha as empresas parceiras e clique em "Afiliar-se com 1 Clique" para começar a divulgar e lucrar comissões.
            </p>
            <button
              onClick={onNavigateToVitrine}
              className="bg-[#D9F22A] hover:bg-[#c8e217] text-[#060A15] font-black px-5 py-3 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer inline-flex items-center gap-2"
            >
              <ShoppingBag className="w-4 h-4" />
              Explorar Marketplace de Startups
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {affiliations.map((aff) => {
            const plan = plans.find(p => p.id === aff.planId);
            return (
              <div
                key={aff.id}
                className="bg-[#080d1a] border border-white/10 hover:border-[#D9F22A]/40 rounded-2xl p-5 shadow-xl transition-all duration-300 flex flex-col justify-between gap-4 relative"
              >
                {/* Header: Company + Plan info */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={aff.companyLogo || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=100&q=80'}
                      alt={aff.companyName}
                      className="w-12 h-12 rounded-xl object-cover border border-[#D9F22A]/30 bg-[#050811] flex-shrink-0"
                    />
                    <div>
                      <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider block">
                        {aff.companyName}
                      </span>
                      <h4 className="text-base font-bold text-white font-['Syne']">
                        {aff.planName}
                      </h4>
                      <span className="text-[10px] font-mono text-[#D9F22A] bg-[#D9F22A]/10 px-2 py-0.5 rounded">
                        Código: {aff.affiliateCode}
                      </span>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-green-500/10 text-green-400 border border-green-500/30 flex-shrink-0">
                    {aff.status || 'Ativo'}
                  </span>
                </div>

                {/* Price & Commission Box */}
                <div className="grid grid-cols-2 gap-2 p-3 bg-[#050811] border border-white/5 rounded-xl text-xs">
                  <div>
                    <span className="text-[10px] uppercase text-white/50 block font-bold">Preço de Venda</span>
                    <span className="font-bold text-white">
                      R$ {aff.priceSetup.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase text-[#D9F22A] block font-bold">Sua Comissão ({aff.commissionPercentage}%)</span>
                    <span className="font-black text-[#D9F22A]">
                      R$ {aff.commissionValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Affiliate Link with Quick Copy */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-white/50 mb-1">
                    Seu Link Direto do Checkout com Código de Afiliado:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={formatAffiliatePlanUrl(aff.planId, aff.affiliateCode)}
                      className="flex-1 bg-[#050811] border border-white/15 rounded-xl px-3 py-2 text-xs text-white font-mono truncate select-all focus:outline-none"
                    />
                    <button
                      onClick={() => handleCopy(formatAffiliatePlanUrl(aff.planId, aff.affiliateCode), aff.id)}
                      className="bg-[#D9F22A] hover:bg-[#c8e217] text-[#060A15] px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 flex-shrink-0"
                      title="Copiar Link de Divulgação"
                    >
                      {copiedId === aff.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                          <span className="text-[10px]">Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span className="text-[10px]">Copiar</span>
                        </>
                      )}
                    </button>
                    <a
                      href={formatAffiliatePlanUrl(aff.planId, aff.affiliateCode)}
                      target="_blank"
                      rel="noreferrer"
                      className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center flex-shrink-0"
                      title="Abrir Checkout ao vivo"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-white/10 gap-2">
                  <button
                    onClick={() => setSelectedAffiliationForUtm(aff)}
                    className="text-[11px] font-bold text-white/70 hover:text-white flex items-center gap-1 cursor-pointer"
                  >
                    <Sliders className="w-3.5 h-3.5 text-[#D9F22A]" />
                    Gerar Link com UTM
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onOpenRegisterSale(aff.planId)}
                      className="bg-[#D9F22A] hover:bg-[#c8e217] text-[#060A15] font-black px-3 py-1.5 rounded-xl text-[11px] uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1"
                    >
                      <Zap className="w-3 h-3 fill-current" /> Registrar Venda
                    </button>
                    <button
                      onClick={() => onDeleteAffiliation(aff.id, aff.planId, aff.companyId)}
                      className="text-[10px] text-white/40 hover:text-red-400 p-1.5 cursor-pointer"
                      title="Cancelar Afiliação"
                    >
                      Remover
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* UTM Generator Modal */}
      {selectedAffiliationForUtm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-[#080d1a] border border-[#D9F22A]/40 rounded-3xl p-6 sm:p-8 shadow-2xl">
            <button
              onClick={() => setSelectedAffiliationForUtm(null)}
              className="absolute top-5 right-5 text-white/50 hover:text-white cursor-pointer"
            >
              ✕
            </button>

            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#D9F22A] mb-1">
              <Sliders className="w-3.5 h-3.5" />
              Gerador de Parâmetros UTM
            </div>
            <h3 className="text-xl font-black text-white font-['Syne'] mb-2">
              Rastreamento de Campanhas
            </h3>
            <p className="text-xs text-white/60 mb-5">
              Personalize o link para identificar a origem das suas vendas (ex: WhatsApp, Instagram, TikTok, Tráfego Pago).
            </p>

            <div className="space-y-3 mb-5">
              <div>
                <label className="block text-[11px] font-bold uppercase text-white/70 mb-1">
                  Origem (utm_source)
                </label>
                <div className="grid grid-cols-4 gap-1.5 mb-2">
                  {['instagram', 'whatsapp', 'tiktok', 'google_ads'].map((src) => (
                    <button
                      key={src}
                      type="button"
                      onClick={() => setUtmSource(src)}
                      className={`text-[10px] py-1.5 rounded-lg border font-bold capitalize cursor-pointer ${
                        utmSource === src
                          ? 'border-[#D9F22A] bg-[#D9F22A]/15 text-[#D9F22A]'
                          : 'border-white/10 text-white/60 hover:text-white'
                      }`}
                    >
                      {src.replace('_', ' ')}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={utmSource}
                  onChange={(e) => setUtmSource(e.target.value)}
                  className="w-full bg-[#050811] border border-white/15 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-white/70 mb-1">
                  Mídia / Formato (utm_medium)
                </label>
                <input
                  type="text"
                  value={utmMedium}
                  onChange={(e) => setUtmMedium(e.target.value)}
                  placeholder="Ex: bio_link, stories, direct, feed"
                  className="w-full bg-[#050811] border border-white/15 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-white/70 mb-1">
                  Campanha (utm_campaign)
                </label>
                <input
                  type="text"
                  value={utmCampaign}
                  onChange={(e) => setUtmCampaign(e.target.value)}
                  placeholder="Ex: lancamento_marzo, trafego_frio"
                  className="w-full bg-[#050811] border border-white/15 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            {/* Result link */}
            <div className="p-3.5 bg-[#050811] border border-[#D9F22A]/30 rounded-2xl mb-4">
              <span className="text-[10px] font-bold uppercase text-white/50 block mb-1">
                Link Parametrizado Gerado:
              </span>
              <p className="text-xs font-mono text-[#D9F22A] break-all">
                {generateUtmLink(selectedAffiliationForUtm.affiliateLink)}
              </p>
            </div>

            <button
              onClick={() => {
                navigator.clipboard.writeText(generateUtmLink(selectedAffiliationForUtm.affiliateLink));
                setCopiedUtm(true);
                setTimeout(() => setCopiedUtm(false), 2000);
              }}
              className="w-full bg-[#D9F22A] hover:bg-[#c8e217] text-[#060A15] font-black py-3 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {copiedUtm ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copiedUtm ? 'Link Parametrizado Copiado!' : 'Copiar Link com UTM'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
