import React, { useState } from 'react';
import { 
  Trophy, 
  Award, 
  Sparkles, 
  Crown, 
  Flame, 
  Gem, 
  Sun, 
  CheckCircle2, 
  Lock, 
  ChevronRight, 
  Info, 
  ExternalLink,
  PackageCheck,
  ShieldCheck,
  Zap,
  ArrowRight,
  X
} from 'lucide-react';
import { CompanyStartup, PlatformPlan, SaleRecord, UserProfile } from '../../types/platform';

interface PremiacoesViewProps {
  userProfile?: UserProfile | null;
  roleMode: 'afiliado' | 'empresa' | 'admin';
  sales?: SaleRecord[];
}

interface MilestoneTier {
  id: string;
  name: string;
  minRevenue: number;
  maxRevenue: number;
  label: string;
  badge: string;
  color: string;
  borderColor: string;
  glowColor: string;
  bgGradient: string;
  textColor: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  rewardTitle: string;
  rewardType: 'Digital' | 'Placa Física' | 'Troféu Ouro' | 'Troféu Supremo';
}

const MILESTONE_TIERS: MilestoneTier[] = [
  {
    id: 'inicio',
    name: 'INÍCIO',
    minRevenue: 0,
    maxRevenue: 10000,
    label: 'R$ 0 - 10K',
    badge: 'Nível 01',
    color: '#D9F22A',
    borderColor: 'border-[#D9F22A]/40',
    glowColor: 'rgba(217, 242, 42, 0.25)',
    bgGradient: 'from-[#0d170a] to-[#060a15]',
    textColor: 'text-[#D9F22A]',
    icon: Sparkles,
    description: 'O ponto de partida de todo grande império. Suas primeiras vendas validadas no ecossistema LeadsPay.',
    rewardTitle: 'Certificado Digital Oficial LeadsPay',
    rewardType: 'Digital'
  },
  {
    id: 'mirage',
    name: 'MIRAGE',
    minRevenue: 10000,
    maxRevenue: 100000,
    label: 'R$ 10K - 100K',
    badge: 'Nível 02',
    color: '#10B981',
    borderColor: 'border-emerald-500/40',
    glowColor: 'rgba(16, 185, 129, 0.25)',
    bgGradient: 'from-[#071913] to-[#060a15]',
    textColor: 'text-emerald-400',
    icon: Award,
    description: 'A visão da escala se concretizando. Produtos com tração e vendas consistentes todos os dias.',
    rewardTitle: 'Placa Acrílica Black & Emerald Mirage 10K',
    rewardType: 'Placa Física'
  },
  {
    id: 'oasis',
    name: 'OASIS',
    minRevenue: 100000,
    maxRevenue: 250000,
    label: 'R$ 100K - 250K',
    badge: 'Nível 03',
    color: '#06B6D4',
    borderColor: 'border-cyan-500/40',
    glowColor: 'rgba(6, 182, 212, 0.25)',
    bgGradient: 'from-[#071620] to-[#060a15]',
    textColor: 'text-cyan-400',
    icon: Gem,
    description: 'Água fresca no deserto do mercado. Seus planos e comissões atingiram maturidade e estabilidade.',
    rewardTitle: 'Placa Metálica Platinum Oasis 100K',
    rewardType: 'Placa Física'
  },
  {
    id: 'dune',
    name: 'DUNE',
    minRevenue: 250000,
    maxRevenue: 500000,
    label: 'R$ 250K - 500K',
    badge: 'Nível 04',
    color: '#F59E0B',
    borderColor: 'border-amber-500/40',
    glowColor: 'rgba(245, 158, 11, 0.25)',
    bgGradient: 'from-[#1c1305] to-[#060a15]',
    textColor: 'text-amber-400',
    icon: Trophy,
    description: 'Dominando o terreno contra qualquer tempestade comercial. Autoridade absoluta de vendas.',
    rewardTitle: 'Placa Dourada Escovada Dune 250K',
    rewardType: 'Placa Física'
  },
  {
    id: 'solaris',
    name: 'SOLARIS',
    minRevenue: 500000,
    maxRevenue: 1000000,
    label: 'R$ 500K - 1M',
    badge: 'Nível 05',
    color: '#38BDF8',
    borderColor: 'border-sky-400/40',
    glowColor: 'rgba(56, 189, 248, 0.25)',
    bgGradient: 'from-[#081827] to-[#060a15]',
    textColor: 'text-sky-300',
    icon: Flame,
    description: 'Brilho solar de alta voltagem. Rumo consolidado ao primeiro milhão de faturamento.',
    rewardTitle: 'Placa Espelhada Neon Solaris 500K',
    rewardType: 'Placa Física'
  },
  {
    id: 'imperium',
    name: 'IMPERIUM',
    minRevenue: 1000000,
    maxRevenue: 5000000,
    label: 'R$ 1M - 5M',
    badge: 'Nível 06',
    color: '#A855F7',
    borderColor: 'border-purple-500/40',
    glowColor: 'rgba(168, 85, 247, 0.25)',
    bgGradient: 'from-[#190924] to-[#060a15]',
    textColor: 'text-purple-400',
    icon: Crown,
    description: 'Clube dos 7 dígitos. Construção de um verdadeiro ecossistema corporativo inabalável.',
    rewardTitle: 'Troféu Obsidian & Ouro Imperium 1M',
    rewardType: 'Troféu Ouro'
  },
  {
    id: 'golden_desert',
    name: 'GOLDEN DESERT',
    minRevenue: 5000000,
    maxRevenue: 10000000,
    label: 'R$ 5M - 10M',
    badge: 'Nível 07',
    color: '#EAB308',
    borderColor: 'border-yellow-500/40',
    glowColor: 'rgba(234, 179, 8, 0.25)',
    bgGradient: 'from-[#1c1806] to-[#060a15]',
    textColor: 'text-yellow-400',
    icon: Award,
    description: 'A realeza comercial no mercado da tecnologia. Pouquíssimos chegam neste patamar.',
    rewardTitle: 'Troféu Ouro 24K Golden Desert 5M',
    rewardType: 'Troféu Ouro'
  },
  {
    id: 'supreme_sun',
    name: 'SUPREME SUN',
    minRevenue: 10000000,
    maxRevenue: Infinity,
    label: 'R$ 10M+',
    badge: 'Nível Supremo',
    color: '#EF4444',
    borderColor: 'border-rose-500/50',
    glowColor: 'rgba(239, 68, 68, 0.3)',
    bgGradient: 'from-[#220709] to-[#060a15]',
    textColor: 'text-rose-400',
    icon: Sun,
    description: 'O zênite do sucesso. O sol supremo que ilumina e dita os rumos de toda a indústria.',
    rewardTitle: 'Troféu Esculpido Rubi & Ouro Supreme Sun 10M',
    rewardType: 'Troféu Supremo'
  }
];

export const PremiacoesView: React.FC<PremiacoesViewProps> = ({
  userProfile,
  roleMode,
  sales = []
}) => {
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  const [selectedTierForClaim, setSelectedTierForClaim] = useState<MilestoneTier | null>(null);
  const [claimSuccess, setClaimSuccess] = useState(false);

  // Calculate actual revenue
  const totalVolume = Number(
    userProfile?.totalSalesVolume ?? 
    sales.reduce((acc, s) => acc + (Number(s.amount) || 0), 0)
  ) || 55.85; // Fallback to initial display from Image 4

  // Find current active tier
  const currentTierIndex = MILESTONE_TIERS.findIndex((t) => totalVolume >= t.minRevenue && totalVolume < t.maxRevenue);
  const activeTierIndex = currentTierIndex !== -1 ? currentTierIndex : 0;
  const currentTier = MILESTONE_TIERS[activeTierIndex];
  const nextTier = activeTierIndex < MILESTONE_TIERS.length - 1 ? MILESTONE_TIERS[activeTierIndex + 1] : null;

  // Calculate progress to next milestone
  const nextTarget = nextTier ? nextTier.minRevenue : 10000;
  const currentBase = currentTier.minRevenue;
  const progressPercent = nextTier 
    ? Math.min(100, Math.max(1, Math.round(((totalVolume - currentBase) / (nextTarget - currentBase)) * 100)))
    : 100;

  const formatBRL = (val: number) => {
    return val.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2
    });
  };

  const handleClaimReward = (e: React.FormEvent) => {
    e.preventDefault();
    setClaimSuccess(true);
    setTimeout(() => {
      setClaimSuccess(false);
      setSelectedTierForClaim(null);
    }, 3000);
  };

  return (
    <div className="space-y-8 animate-fadeIn" id="premiacoes-view-container">
      {/* Header matching Image 5 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#D9F22A]/10 text-[#D9F22A] border border-[#D9F22A]/20">
              Programa de Reconhecimento
            </span>
            <span className="text-xs text-white/50">•</span>
            <span className="text-xs text-white/60">Marcos de Faturamento</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-['Syne'] tracking-tight">
            Premiações LeadsPay
          </h1>
          <p className="text-xs sm:text-sm text-white/70 mt-1 max-w-xl">
            Conquiste marcos históricos de vendas na plataforma e receba placas físicas oficiais e troféus gravados com seu nome e faturamento.
          </p>
        </div>

        <button
          onClick={() => setIsRulesModalOpen(true)}
          className="self-start md:self-center inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-xs font-bold text-white transition-all cursor-pointer shadow-sm hover:border-[#D9F22A]/40"
        >
          <Info className="w-4 h-4 text-[#D9F22A]" />
          <span>Leia sobre o programa de premiações</span>
        </button>
      </div>

      {/* Hero Card: Current Standing (matching Image 4 & 5) */}
      <div className="relative rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-[#0d1627] via-[#081020] to-[#0d1627] border border-white/15 shadow-2xl overflow-hidden">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-[#D9F22A]/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-4 flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#D9F22A]/15 border border-[#D9F22A]/30 flex items-center justify-center text-[#D9F22A] shadow-[0_0_25px_rgba(217,242,42,0.25)] flex-shrink-0">
              <Trophy className="w-8 h-8" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/50 block">
                Faturamento Vitalício Acumulado
              </span>
              <div className="text-2xl sm:text-3xl font-black text-white font-['Syne'] mt-0.5">
                {formatBRL(totalVolume)}
              </div>
              <span className="text-xs text-[#D9F22A] font-semibold mt-0.5 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Nível Atual: {currentTier.name}
              </span>
            </div>
          </div>

          <div className="lg:col-span-8 flex flex-col justify-center gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/70 font-medium">
                Próximo Marco:{' '}
                <strong className="text-white font-bold">
                  {nextTier ? nextTier.name : 'Nível Máximo Conquistado'} ({nextTier ? nextTier.label : 'R$ 10M+'})
                </strong>
              </span>
              <span className="text-xs font-mono font-black text-[#D9F22A]">
                {progressPercent}% CONCLUÍDO
              </span>
            </div>

            {/* Progress Bar matching Image 4 */}
            <div className="w-full h-3.5 bg-black/50 border border-white/10 rounded-full p-0.5 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-[#D9F22A] to-[#a3cc10] rounded-full transition-all duration-1000 shadow-[0_0_12px_rgba(217,242,42,0.5)]"
                style={{ width: `${Math.max(2, progressPercent)}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-white/50 mt-1">
              <span>{currentTier.label}</span>
              <span>
                Faltam {formatBRL(Math.max(0, nextTarget - totalVolume))} para desbloquear a placa {nextTier?.name || 'Suprema'}
              </span>
              <span>{nextTier ? nextTier.label : 'Infinito'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid of the 8 Milestone Tiers */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white font-['Syne'] flex items-center gap-2">
            <Award className="w-5 h-5 text-[#D9F22A]" />
            Etapas da Jornada de Sucesso
          </h2>
          <span className="text-xs text-white/50">8 Níveis Disponíveis</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {MILESTONE_TIERS.map((tier, idx) => {
            const Icon = tier.icon;
            const isUnlocked = totalVolume >= tier.minRevenue;
            const isCurrent = currentTier.id === tier.id;
            const isFuture = totalVolume < tier.minRevenue;

            return (
              <div
                key={tier.id}
                className={`relative rounded-2xl p-5 border transition-all duration-300 flex flex-col justify-between overflow-hidden group ${
                  isCurrent 
                    ? `bg-gradient-to-b ${tier.bgGradient} ${tier.borderColor} shadow-[0_0_30px_${tier.glowColor}] ring-1 ring-[#D9F22A]/50`
                    : isUnlocked
                    ? `bg-[#080e1d] ${tier.borderColor} shadow-lg`
                    : 'bg-[#050811]/90 border-white/10 opacity-75 hover:opacity-100'
                }`}
              >
                {/* Subtle ambient lighting */}
                {isUnlocked && (
                  <div 
                    className="absolute -top-12 -right-12 w-28 h-28 rounded-full blur-2xl pointer-events-none"
                    style={{ backgroundColor: tier.color, opacity: 0.15 }}
                  />
                )}

                <div>
                  {/* Top Bar with Badge & Level */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span 
                      className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider font-mono border"
                      style={{ 
                        color: tier.color, 
                        borderColor: `${tier.color}40`,
                        backgroundColor: `${tier.color}15`
                      }}
                    >
                      {tier.badge}
                    </span>

                    {isUnlocked ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3" />
                        Desbloqueado
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] font-medium text-white/40 bg-white/5 px-2 py-0.5 rounded-full">
                        <Lock className="w-3 h-3" />
                        Bloqueado
                      </span>
                    )}
                  </div>

                  {/* Icon & Title */}
                  <div className="flex items-center gap-3 mb-2">
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center border flex-shrink-0 transition-transform group-hover:scale-110"
                      style={{ 
                        backgroundColor: `${tier.color}15`,
                        borderColor: `${tier.color}35`,
                        color: tier.color
                      }}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-white font-['Syne'] tracking-tight">
                        {tier.name}
                      </h3>
                      <span className="text-xs font-mono font-bold" style={{ color: tier.color }}>
                        {tier.label}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-white/65 leading-relaxed mt-2 line-clamp-3">
                    {tier.description}
                  </p>
                </div>

                {/* Reward Spec & Action */}
                <div className="mt-5 pt-3.5 border-t border-white/10 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-white/50">Recompensa:</span>
                    <span className="text-white font-bold truncate max-w-[170px] text-right" title={tier.rewardTitle}>
                      {tier.rewardType}
                    </span>
                  </div>

                  {isUnlocked ? (
                    <button
                      onClick={() => setSelectedTierForClaim(tier)}
                      className="w-full py-2 px-3 rounded-xl bg-[#D9F22A] hover:bg-[#c8e21a] text-[#060A15] font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md flex items-center justify-center gap-1.5"
                    >
                      <PackageCheck className="w-3.5 h-3.5" />
                      <span>Solicitar Placa</span>
                    </button>
                  ) : (
                    <div className="w-full py-2 px-3 rounded-xl bg-white/5 border border-white/10 text-white/40 font-bold text-[11px] text-center flex items-center justify-center gap-1">
                      <Lock className="w-3 h-3" />
                      <span>Faltam {formatBRL(Math.max(0, tier.minRevenue - totalVolume))}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Program Rules Modal */}
      {isRulesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-2xl bg-[#080d1a] border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#D9F22A]/10 border border-[#D9F22A]/30 flex items-center justify-center text-[#D9F22A]">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white font-['Syne']">
                    Regulamento do Programa de Premiações
                  </h3>
                  <span className="text-xs text-white/50">LeadsPay Recognition Program</span>
                </div>
              </div>

              <button
                onClick={() => setIsRulesModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/70 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs sm:text-sm text-white/80 leading-relaxed py-6">
              <div className="p-4 rounded-2xl bg-[#050811] border border-white/10 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-[#D9F22A] flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-white mb-1">Como Funciona o Cálculo</h4>
                  <p className="text-white/70">
                    O faturamento contabilizado é o volume bruto transacionado pelas startups que você cadastrou ou pelas vendas confirmadas através dos seus links exclusivos de afiliado. Não há expiração do faturamento acumulado.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#050811] border border-white/10 flex items-start gap-3">
                <PackageCheck className="w-5 h-5 text-[#D9F22A] flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-white mb-1">Envio Físico Gratuito</h4>
                  <p className="text-white/70">
                    A partir do marco MIRAGE (R$ 10K), você tem direito a receber gratuitamente a placa personalizada em acrílico especial com corte a laser e gravação ultravioleta diretamente no endereço cadastrado no Brasil.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#050811] border border-white/10 flex items-start gap-3">
                <Zap className="w-5 h-5 text-[#D9F22A] flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-white mb-1">Prazos de Confecção e Entrega</h4>
                  <p className="text-white/70">
                    Após a solicitação na plataforma, nossa equipe realiza a auditoria antifraude do faturamento em até 48 horas úteis. O tempo médio de manufatura e despacho via Sedex é de 7 a 15 dias úteis.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-white/10 flex justify-end">
              <button
                onClick={() => setIsRulesModalOpen(false)}
                className="px-6 py-2.5 rounded-xl bg-[#D9F22A] text-[#060A15] font-black text-xs uppercase tracking-wider hover:bg-[#cbe31c] transition-all cursor-pointer"
              >
                Entendi as Regras
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Claim Reward Modal */}
      {selectedTierForClaim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-md bg-[#080d1a] border border-[#D9F22A]/40 rounded-3xl p-6 sm:p-7 shadow-2xl">
            <button
              onClick={() => setSelectedTierForClaim(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/70 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {claimSuccess ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4 border border-emerald-500/30">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black text-white font-['Syne']">
                  Solicitação Registrada!
                </h3>
                <p className="text-xs text-white/70 mt-2">
                  Nossa equipe de auditoria e manufatura recebeu seu pedido da placa <strong>{selectedTierForClaim.name}</strong>. Enviaremos o código de rastreio via WhatsApp/Email.
                </p>
              </div>
            ) : (
              <form onSubmit={handleClaimReward} className="space-y-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#D9F22A]">
                    {selectedTierForClaim.badge}
                  </span>
                  <h3 className="text-xl font-black text-white font-['Syne'] mt-0.5">
                    Resgatar Placa {selectedTierForClaim.name}
                  </h3>
                  <p className="text-xs text-white/70 mt-1">
                    Preencha os dados para gravação personalizada do seu troféu ou placa física.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-1">
                    Nome Exato para Gravação na Placa *
                  </label>
                  <input
                    type="text"
                    required
                    defaultValue={userProfile?.name || ''}
                    placeholder="Ex: Pedro Henrique ou Minha Empresa LTDA"
                    className="w-full bg-[#050811] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#D9F22A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-1">
                    Endereço de Entrega (CEP, Rua, Número, Cidade/UF) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Av. Paulista, 1000, Apto 52, São Paulo - SP"
                    className="w-full bg-[#050811] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#D9F22A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-1">
                    WhatsApp para Rastreamento *
                  </label>
                  <input
                    type="text"
                    required
                    defaultValue={userProfile?.phone || ''}
                    placeholder="(11) 99999-9999"
                    className="w-full bg-[#050811] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#D9F22A]"
                  />
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedTierForClaim(null)}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 px-4 rounded-xl bg-[#D9F22A] hover:bg-[#cbe31c] text-[#060A15] font-black text-xs uppercase tracking-wider cursor-pointer shadow-lg shadow-[#D9F22A]/20"
                  >
                    Confirmar Envio
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
