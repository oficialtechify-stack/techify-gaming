import React, { useState } from 'react';
import { CompanyPlan, UserSellerProfile } from '../../types/platform';
import { 
  Link as LinkIcon, 
  Copy, 
  Check, 
  Calculator, 
  Award, 
  Sparkles, 
  TrendingUp, 
  DollarSign, 
  Share2, 
  ArrowRight,
  ShieldAlert,
  Download
} from 'lucide-react';

interface AfiliadosViewProps {
  platforms: CompanyPlan[];
  userProfile: UserSellerProfile;
  onSimulateSale: (product: CompanyPlan) => void;
}

export const AfiliadosView: React.FC<AfiliadosViewProps> = ({
  platforms,
  userProfile,
  onSimulateSale
}) => {
  const [selectedProductId, setSelectedProductId] = useState<string>(platforms[0]?.id || '');
  const [utmSource, setUtmSource] = useState<string>('instagram');
  const [utmMedium, setUtmMedium] = useState<string>('stories');
  const [utmCampaign, setUtmCampaign] = useState<string>('igaming_pro_2026');
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Commission Calculator state
  const [simulatedSalesCount, setSimulatedSalesCount] = useState<number>(3);

  const selectedProduct: CompanyPlan = platforms.find(p => p.id === selectedProductId) || platforms[0] || {
    id: 'custom',
    companyId: 'comp_default',
    companyName: 'Techify Platforms',
    companyLogo: '',
    bannerImage: '',
    name: 'Cadastre uma plataforma',
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

  const selectedSlug = (selectedProduct as any).slug || selectedProduct.id || 'checkout';
  const selectedCode = (selectedProduct as any).affiliateCode || 'TECH';
  const generatedAffiliateUrl = `https://techifygaming.com/checkout/${selectedSlug}?ref=${selectedCode}&utm_source=${utmSource}&utm_medium=${utmMedium}&utm_campaign=${utmCampaign}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedAffiliateUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const calculatedCommissionTotal = simulatedSalesCount * (selectedProduct.commissionValue || 0);
  const calculatedRecurrentTotal = simulatedSalesCount * ((selectedProduct.priceMonthly || 0) * (selectedProduct.recurrentCommission || 15) / 100);

  return (
    <div className="flex flex-col gap-8" id="techify-afiliados-view">
      {/* Header Banner */}
      <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-r from-[#0a1428] via-[#0e1d3a] to-[#0a1428] p-6 sm:p-8 shadow-xl">
        <div className="max-w-3xl flex flex-col items-start gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D9F22A]/10 border border-[#D9F22A]/30 text-[11px] font-bold text-[#D9F22A] uppercase tracking-wider">
            <Award className="w-3.5 h-3.5" />
            PROGRAMA DE PARCEIROS & REVENDEDORES TECHIFY
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-white font-['Syne']">
            Central de Afiliação & Rastreamento
          </h1>
          <p className="text-sm text-white/70 leading-relaxed">
            Gere links inteligentes parametrizados com rastreamento UTM, acompanhe métricas reais e calcule projeções de ganhos para prospecção de operadores e investidores.
          </p>
        </div>
      </div>

      {/* 1. GERADOR DE LINKS COM UTM BUILDER */}
      <div className="bg-[#080d1a] border border-white/10 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-2 mb-4">
          <LinkIcon className="w-5 h-5 text-[#D9F22A]" />
          <h2 className="text-xl font-bold text-white font-['Syne']">
            Gerador de Links de Afiliado com Rastreamento Avançado
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-5">
          <div className="md:col-span-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-1.5">
              1. Selecionar Plataforma
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full bg-[#050811] border border-white/15 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#D9F22A]"
            >
              {platforms.length === 0 ? (
                <option value="">Nenhum produto cadastrado no catálogo</option>
              ) : (
                platforms.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} (Comissão: R$ {(p.commissionValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-1.5">
              2. Origem (utm_source)
            </label>
            <input
              type="text"
              value={utmSource}
              onChange={(e) => setUtmSource(e.target.value)}
              placeholder="ex: instagram, linkedin, whatsapp"
              className="w-full bg-[#050811] border border-white/15 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#D9F22A]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-1.5">
              3. Campanha (utm_campaign)
            </label>
            <input
              type="text"
              value={utmCampaign}
              onChange={(e) => setUtmCampaign(e.target.value)}
              placeholder="ex: direct_pitch_2026"
              className="w-full bg-[#050811] border border-white/15 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#D9F22A]"
            />
          </div>
        </div>

        {/* Link Result Box */}
        <div className="p-4 rounded-xl bg-[#050811] border border-[#D9F22A]/30 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="w-full min-w-0">
            <span className="text-[10px] uppercase font-bold text-[#D9F22A] block mb-1">
              Link Rastreado Pronto para Divulgação & Contratos:
            </span>
            <div className="font-mono text-xs text-white/90 truncate select-all">
              {generatedAffiliateUrl}
            </div>
          </div>
          <button
            onClick={handleCopy}
            className="w-full sm:w-auto bg-[#D9F22A] hover:bg-[#c8e217] text-[#060A15] font-black px-6 py-3 rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(217,242,42,0.3)] whitespace-nowrap"
          >
            {copiedLink ? (
              <>
                <Check className="w-4 h-4" />
                Copiado com Sucesso!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copiar Link
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. CALCULADORA DE COMISSÕES */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-[#080d1a] border border-white/10 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Calculator className="w-5 h-5 text-[#D9F22A]" />
              <h3 className="text-xl font-bold text-white font-['Syne']">
                Calculadora de Projeção de Comissões
              </h3>
            </div>
            <p className="text-xs text-white/70 mb-6">
              Ajuste o número de contratos projetados para calcular sua receita direta de setup e o faturamento recorrente mensal que você construirá.
            </p>

            {/* Slider de Vendas */}
            <div className="mb-6 bg-[#050811] p-4 rounded-xl border border-white/5">
              <div className="flex items-center justify-between text-xs font-bold text-white mb-2">
                <span>Quantidade de Contratos Projetados:</span>
                <span className="text-lg text-[#D9F22A] font-black">{simulatedSalesCount} contratos</span>
              </div>
              <input
                type="range"
                min="1"
                max="20"
                value={simulatedSalesCount}
                onChange={(e) => setSimulatedSalesCount(Number(e.target.value))}
                className="w-full accent-[#D9F22A] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-white/40 mt-1">
                <span>1 venda</span>
                <span>10 vendas</span>
                <span>20 vendas</span>
              </div>
            </div>
          </div>

          {/* Result Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-[#D9F22A]/10 border border-[#D9F22A]/30">
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/70 block">
                Comissão Imediata (Setups)
              </span>
              <div className="text-2xl font-black text-[#D9F22A] font-['Syne'] mt-1">
                R$ {calculatedCommissionTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] text-white/50 block mt-1">Pago no ato da contratação D+0</span>
            </div>

            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/70 block">
                Receita Recorrente Mensal
              </span>
              <div className="text-2xl font-black text-white font-['Syne'] mt-1">
                R$ {calculatedRecurrentTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês
              </div>
              <span className="text-[10px] text-white/50 block mt-1">Enquanto os clientes operarem</span>
            </div>
          </div>
        </div>

        {/* Right Column: Níveis e Benefícios do Parceiro */}
        <div className="lg:col-span-5 bg-[#080d1a] border border-white/10 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#D9F22A]" />
                <h3 className="text-lg font-bold text-white font-['Syne']">
                  Seu Nível: {userProfile?.partnerLevel || 'Afiliado Starter'}
                </h3>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#D9F22A] text-[#060A15]">
                ATIVO
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-[#050811] border border-white/5 text-white/80">
                <span className="w-2 h-2 rounded-full bg-[#D9F22A]" />
                <span>Comissão máxima de até <strong>50% por contrato</strong></span>
              </div>
              <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-[#050811] border border-white/5 text-white/80">
                <span className="w-2 h-2 rounded-full bg-[#D9F22A]" />
                <span>Gerente de Contas dedicado para fechar reuniões B2B</span>
              </div>
              <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-[#050811] border border-white/5 text-white/80">
                <span className="w-2 h-2 rounded-full bg-[#D9F22A]" />
                <span>Saques PIX diários sem teto máximo e sem taxa</span>
              </div>
              <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-[#050811] border border-white/5 text-white/80">
                <span className="w-2 h-2 rounded-full bg-[#D9F22A]" />
                <span>Acesso a materiais de prospecção e integrações de API</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => onSimulateSale(selectedProduct)}
            className="mt-6 w-full bg-[#D9F22A] hover:bg-[#c8e217] text-[#060A15] font-black py-3.5 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <DollarSign className="w-4 h-4" />
            Registrar Venda Desta Plataforma
          </button>
        </div>
      </div>
    </div>
  );
};
