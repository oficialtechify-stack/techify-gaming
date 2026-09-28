import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Check, 
  ArrowRight, 
  ShieldCheck, 
  Flame, 
  MessageSquare, 
  ShoppingBag, 
  BarChart3, 
  Zap, 
  CheckCircle2, 
  Copy, 
  TrendingUp, 
  CreditCard, 
  QrCode, 
  X,
  ExternalLink,
  RefreshCw,
  Info,
  Radio,
  Code2,
  Lock
} from 'lucide-react';
import { UserRoleMode, UserSellerProfile, CompanyStartup } from '../../types/platform';
import { doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';

interface PlanosAssinaturasViewProps {
  roleMode: UserRoleMode;
  userProfile: UserSellerProfile;
  myCompany?: CompanyStartup;
  onUpdateProfile?: (updated: Partial<UserSellerProfile>) => void;
}

interface PlanFeature {
  text: string;
  isHighlighted?: boolean;
}

interface SubscriptionPlanCard {
  id: string;
  name: string;
  badge?: string;
  price: number;
  period: string;
  description: string;
  features: PlanFeature[];
  highlight: boolean;
  ctaText: string;
}

export const PlanosAssinaturasView: React.FC<PlanosAssinaturasViewProps> = ({
  roleMode,
  userProfile,
  myCompany,
  onUpdateProfile
}) => {
  const [selectedPlanModal, setSelectedPlanModal] = useState<SubscriptionPlanCard | null>(null);
  const [isGeneratingCheckout, setIsGeneratingCheckout] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [activationSuccess, setActivationSuccess] = useState<string | null>(null);

  // Estado sincronizado em tempo real via Firestore onSnapshot
  const [liveUserData, setLiveUserData] = useState<{
    plan?: string;
    planStatus?: string;
    subscriptionTier?: string;
    subscriptionName?: string;
  } | null>(null);

  const currentUserId = userProfile.id || userProfile.userId || auth.currentUser?.uid || 'user_demo';
  const isAffiliate = roleMode === 'afiliado';

  // ──────────────────────────────────────────────────────────────────────────
  // 4. ESCUTA EM TEMPO REAL NO FIRESTORE (onSnapshot)
  // Mantém o estado do plano sincronizado com atualizações do backend.
  // ──────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUserId || currentUserId === 'user_demo') return;

    try {
      const handleDataUpdate = (data: any) => {
        if (!data) return;
        setLiveUserData((prev) => ({
          ...prev,
          plan: data.plan !== undefined ? data.plan : prev?.plan,
          planStatus: data.planStatus !== undefined ? data.planStatus : prev?.planStatus,
          subscriptionTier: data.subscriptionTier !== undefined ? data.subscriptionTier : prev?.subscriptionTier,
          subscriptionName: data.subscriptionName !== undefined ? data.subscriptionName : prev?.subscriptionName
        }));

        // Se a janela de checkout estava aberta e o plano foi confirmado via webhook
        if (data.planStatus === 'active' && data.plan) {
          if (selectedPlanModal && (selectedPlanModal.id === data.plan || selectedPlanModal.id === data.subscriptionTier)) {
            setActivationSuccess(`Plano ${data.subscriptionName || selectedPlanModal.name} ativado com sucesso!`);
            setTimeout(() => {
              setSelectedPlanModal(null);
              setCheckoutError(null);
            }, 2500);
          }

          // Propaga atualização para o restante do applet
          if (onUpdateProfile) {
            onUpdateProfile({
              plan: data.plan,
              planStatus: 'active',
              subscriptionTier: data.subscriptionTier || data.plan,
              subscriptionName: data.subscriptionName
            });
          }
        }
      };

      const userDocRef = doc(db, 'users', currentUserId);
      const unsubUser = onSnapshot(userDocRef, (snapshot) => {
        if (snapshot.exists()) {
          handleDataUpdate(snapshot.data());
        }
      }, (err) => {
        console.warn('[Planos onSnapshot users] Aviso:', err);
      });

      const profileDocRef = doc(db, 'user_profiles', currentUserId);
      const unsubProfile = onSnapshot(profileDocRef, (snapshot) => {
        if (snapshot.exists()) {
          handleDataUpdate(snapshot.data());
        }
      }, (err) => {
        console.warn('[Planos onSnapshot user_profiles] Aviso:', err);
      });

      return () => {
        unsubUser();
        unsubProfile();
      };
    } catch (err) {
      console.warn('[Planos onSnapshot] Erro ao registrar listener:', err);
    }
  }, [currentUserId, selectedPlanModal, onUpdateProfile]);

  // Função para checar se determinado plano está ATIVO
  // REGRA: O plano pago (ex: Afiliado VIP) NUNCA vem ativado por padrão.
  // Somente se torna 'active' quando planStatus === 'active' no banco de dados!
  const checkIsPlanActive = (planId: string, price: number) => {
    const currentPlanStatus = liveUserData?.planStatus || userProfile.planStatus;
    const currentActivePlan = liveUserData?.plan || userProfile.plan || liveUserData?.subscriptionTier || userProfile.subscriptionTier;

    if (price === 0) {
      // Plano grátis é o padrão inicial caso nenhum plano pago esteja ativo
      if (currentPlanStatus === 'active' && currentActivePlan && currentActivePlan !== planId) {
        return false;
      }
      return currentActivePlan === planId || (!currentActivePlan && (planId === 'afiliado_starter' || planId === 'starter'));
    }

    // Plano pago: estritamente requer planStatus === 'active'
    return currentPlanStatus === 'active' && currentActivePlan === planId;
  };

  // Planos exclusivos para AFILIADO
  const affiliatePlans: SubscriptionPlanCard[] = [
    {
      id: 'afiliado_starter',
      name: 'Afiliado Starter',
      price: 0,
      period: 'grátis',
      description: 'Ideal para quem está iniciando suas primeiras vendas como afiliado.',
      highlight: false,
      features: [
        { text: 'Acesso completo ao Marketplace de Startups' },
        { text: 'Links parametrizados com rastreamento anti-fraude' },
        { text: 'Repasses diretos no PIX com saque mínimo de R$ 10,00' },
        { text: 'Painel de métricas e conversões em tempo real' },
        { text: 'Taxa padrão de saque PIX: R$ 2,50' },
        { text: 'Suporte por e-mail' }
      ],
      ctaText: 'Plano Gratuito'
    },
    {
      id: 'afiliado_vip',
      name: 'Afiliado VIP',
      badge: 'Mais Recomendado',
      price: 29.90,
      period: '/mês',
      description: 'O arsenal definitivo para quem quer vender infoprodutos e soluções todos os dias.',
      highlight: true,
      features: [
        { text: 'Radar de Criativos: Anúncios validados e criativos em alta', isHighlighted: true },
        { text: 'Copys Prontas: Textos persuasivos de alta conversão para WhatsApp e Ads', isHighlighted: true },
        { text: 'Pixel Avançado: Disparos inteligentes Meta, TikTok e Google Ads', isHighlighted: true },
        { text: 'Acesso prioritário a produtos de alto ticket com comissões de até 50%' },
        { text: 'Suporte VIP prioritário no WhatsApp' },
        { text: 'Canal exclusivo com estratégias semanais de vendas' },
        { text: 'Saque mínimo de apenas R$ 10,00 direto no PIX' }
      ],
      ctaText: 'Ativar Plano'
    }
  ];

  // Planos exclusivos para EMPRESA / PRODUTOR
  const companyPlans: SubscriptionPlanCard[] = [
    {
      id: 'starter',
      name: 'Starter',
      price: 0,
      period: 'grátis',
      description: 'Para quem quer começar a vender infoprodutos e serviços sem custo fixo mensal.',
      highlight: false,
      features: [
        { text: 'Checkout de alta conversão LeadsPay' },
        { text: 'Taxa fixa por checkout: R$ 0,99' },
        { text: 'Split automático PJ por venda confirmada' },
        { text: 'Saque mínimo de R$ 10,00 via PIX' },
        { text: 'Publicação na Vitrine de Startups' },
        { text: 'Rastreamento de UTMs e afiliados' }
      ],
      ctaText: 'Plano Gratuito'
    },
    {
      id: 'pro',
      name: 'Pro',
      badge: 'Mais Popular',
      price: 49.90,
      period: '/mês',
      description: 'Para infoprodutores e empresas que já vendem e buscam alavancar a taxa de conversão.',
      highlight: true,
      features: [
        { text: 'Recuperador de Carrinho via WhatsApp automático', isHighlighted: true },
        { text: 'Order Bumps ilimitados para aumentar seu ticket médio', isHighlighted: true },
        { text: 'Taxa reduzida por checkout para maior margem de lucro', isHighlighted: true },
        { text: 'Gestão avançada e recrutamento de afiliados' },
        { text: 'Webhooks em tempo real e integração via API REST' },
        { text: 'Suporte prioritário via WhatsApp' },
        { text: 'Split automático de comissões PJ sem bitributação' }
      ],
      ctaText: 'Ativar Plano'
    },
    {
      id: 'scale',
      name: 'Scale',
      badge: 'Potência Máxima',
      price: 149.90,
      period: '/mês',
      description: 'Para grandes operações digitais, infoprodutos de alto volume e empresas de escala.',
      highlight: false,
      features: [
        { text: 'Menor taxa fixa por checkout do mercado', isHighlighted: true },
        { text: 'Recuperador WhatsApp Inteligente com IA personalizado', isHighlighted: true },
        { text: 'Order Bumps & Upsell 1-Click no checkout', isHighlighted: true },
        { text: 'Domínio próprio personalizado no checkout' },
        { text: 'Gerente de Contas dedicado e suporte VIP 24/7' },
        { text: 'Relatórios fiscais e conciliação bancária completa' },
        { text: 'Subcontas ilimitadas e múltiplos usuários na equipe' }
      ],
      ctaText: 'Ativar Plano'
    }
  ];

  const currentPlans = isAffiliate ? affiliatePlans : companyPlans;

  // Assinaturas mensais só podem ser ativadas depois de o Stripe Billing e os
  // webhooks de ciclo de vida estarem configurados. Não simular cobranças.
  const handleOpenCheckoutFlow = async (plan: SubscriptionPlanCard) => {
    setSelectedPlanModal(plan);
    setCheckoutError(null);

    if (plan.price === 0) {
      // Ativação do plano gratuito direto
      try {
        const nowIso = new Date().toISOString();
        if (currentUserId) {
          await setDoc(doc(db, 'users', currentUserId), {
            plan: plan.id,
            planStatus: 'active',
            subscriptionTier: plan.id,
            subscriptionName: plan.name,
            updatedAt: nowIso
          }, { merge: true });
        }
        setActivationSuccess(`Plano ${plan.name} ativado.`);
        setTimeout(() => setActivationSuccess(null), 2500);
      } catch (err) {
        console.warn('Erro ao ativar plano grátis:', err);
      }
      return;
    }

    setCheckoutError('Assinaturas mensais pagas ainda não estão habilitadas no piloto Stripe. Nenhuma cobrança foi iniciada. As vendas de produtos no Marketplace usam o checkout Stripe próprio.');
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      {/* Toast de Confirmação */}
      {activationSuccess && (
        <div className="fixed top-6 right-6 z-50 p-4 rounded-2xl bg-[#D9F22A] text-black font-black text-xs sm:text-sm shadow-[0_0_30px_rgba(217,242,42,0.6)] flex items-center gap-3 animate-slideDown max-w-md border border-black/10">
          <CheckCircle2 className="w-5 h-5 text-black fill-current flex-shrink-0" />
          <span>{activationSuccess}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-[#060A15] via-[#0b1326] to-[#060A15] border border-white/10 p-6 sm:p-8 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-[450px] h-[450px] bg-[#D9F22A]/[0.05] rounded-full blur-[140px] pointer-events-none" />

        <div className="relative z-10 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#D9F22A]/30 bg-[#080d1a] text-xs font-bold uppercase tracking-wider text-[#D9F22A]">
              <Sparkles className="w-3.5 h-3.5 fill-current" />
              <span>Perfil: {isAffiliate ? 'Conta de Afiliado' : 'Conta de Produtor / Empresa'}</span>
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-[11px] font-medium text-white/70">
              <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
              <span>Sincronização Firestore Real-Time Ativa</span>
            </div>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black text-white font-['Syne'] tracking-tight">
            Planos & Assinaturas
          </h1>

          <p className="mt-2 text-sm sm:text-base text-white/70 leading-relaxed">
            {isAffiliate 
              ? 'Maximize seus resultados como afiliado. Desbloqueie criativos testados, copys validadas e rastreamento avançado de pixel para vender mais todos os dias.'
              : 'Escale a operação da sua empresa com as menores taxas do mercado, recuperador de vendas via WhatsApp e order bumps no checkout.'}
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-4 text-xs font-semibold text-white/80">
            <div className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-[#D9F22A]" />
              <span>Saque mínimo de apenas R$ 10,00</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-[#D9F22A]" />
              <span>Taxa fixa de saque PIX R$ 2,50</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-[#D9F22A]" />
              <span>Sem fidelidade • Cancele quando quiser</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid de Planos Condicionais */}
      <div className={`grid grid-cols-1 ${isAffiliate ? 'md:grid-cols-2 max-w-4xl' : 'md:grid-cols-3 max-w-6xl'} mx-auto gap-6 sm:gap-8`}>
        {currentPlans.map((plan) => {
          const isPlanActive = checkIsPlanActive(plan.id, plan.price);

          return (
            <div
              key={plan.id}
              className={`rounded-3xl relative flex flex-col justify-between p-6 sm:p-8 transition-all duration-300 ${
                plan.highlight
                  ? 'bg-gradient-to-b from-[#0e172e] to-[#070b16] border-2 border-[#D9F22A] shadow-[0_0_40px_rgba(217,242,42,0.18)] scale-[1.02]'
                  : 'bg-[#080d1a] border border-white/10 hover:border-white/20'
              }`}
            >
              {/* Badge superior (Mais Recomendado / Mais Popular) */}
              {plan.badge && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-[#D9F22A] text-[#060A15] text-xs font-black uppercase tracking-wider shadow-[0_0_15px_rgba(217,242,42,0.5)]">
                  {plan.badge}
                </div>
              )}

              {/* Informações Básicas */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xl sm:text-2xl font-black text-white font-['Syne']">
                    {plan.name}
                  </h3>
                  
                  {/* Badge PLANO ATUAL: aparece SOMENTE se o plano estiver ativado no banco */}
                  {isPlanActive && (
                    <span className="px-3 py-1 rounded-full bg-[#D9F22A]/15 border border-[#D9F22A]/40 text-[#D9F22A] text-[11px] font-black uppercase tracking-wider shadow-[0_0_10px_rgba(217,242,42,0.2)]">
                      Plano Atual
                    </span>
                  )}
                </div>

                <p className="text-xs text-white/60 min-h-[36px] leading-relaxed mb-6">
                  {plan.description}
                </p>

                {/* Preço */}
                <div className="mb-6 pb-6 border-b border-white/10">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl sm:text-4xl font-black text-white font-['Syne']">
                      {plan.price === 0 ? 'Grátis' : `R$ ${plan.price.toFixed(2).replace('.', ',')}`}
                    </span>
                    {plan.price > 0 && (
                      <span className="text-xs sm:text-sm text-white/50 font-bold">
                        {plan.period}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-white/40 mt-1">
                    {plan.price === 0 ? 'Sem cobrança mensal ou taxa de adesão' : 'Cobrança mensal recorrente via PIX / Cartão'}
                  </p>
                </div>

                {/* Lista de Recursos */}
                <div className="space-y-3 mb-8">
                  <div className="text-xs font-bold uppercase tracking-wider text-white/50 mb-2">
                    Recursos Inclusos:
                  </div>
                  {plan.features.map((feat, fIdx) => (
                    <div
                      key={fIdx}
                      className={`flex items-start gap-2.5 text-xs sm:text-sm ${
                        feat.isHighlighted
                          ? 'text-[#D9F22A] font-bold'
                          : 'text-white/80'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        feat.isHighlighted
                          ? 'bg-[#D9F22A] text-black'
                          : 'bg-white/10 text-[#D9F22A]'
                      }`}>
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                      <span>{feat.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Botão de Ação:
                  - Se ativado: exibe "PLANO ATIVO" (desabilitado)
                  - Se não ativado: exibe "Ativar Plano" (com destaque amarelo)
              */}
              <div>
                {isPlanActive ? (
                  <button
                    disabled
                    className="w-full py-3.5 px-6 rounded-2xl bg-white/5 border border-white/10 text-white/40 font-black text-xs sm:text-sm uppercase tracking-wider cursor-not-allowed text-center flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Plano Ativo</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleOpenCheckoutFlow(plan)}
                    className={`w-full py-3.5 px-6 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer shadow-lg hover:scale-102 ${
                      plan.highlight
                        ? 'bg-[#D9F22A] hover:bg-[#cbe31c] text-[#060A15] shadow-[0_0_25px_rgba(217,242,42,0.4)]'
                        : 'bg-white/10 hover:bg-white/20 text-white border border-white/15'
                    }`}
                  >
                    <span>{plan.price === 0 ? 'Plano Gratuito' : 'Ativar Plano'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Destaque Visual dos Recursos do Plano VIP (se Afiliado) */}
      {isAffiliate && (
        <div className="max-w-4xl mx-auto rounded-3xl bg-[#080d1a] border border-[#D9F22A]/20 p-6 sm:p-8 mt-12">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#D9F22A] mb-2">
            <Flame className="w-4 h-4 fill-current" />
            <span>Exclusivo para Afiliado VIP</span>
          </div>

          <h3 className="text-xl sm:text-2xl font-black text-white font-['Syne'] mb-4">
            O que você desbloqueia com o Afiliado VIP:
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-[#050811] border border-white/5 flex flex-col gap-2">
              <div className="w-10 h-10 rounded-xl bg-[#D9F22A]/10 border border-[#D9F22A]/30 flex items-center justify-center text-[#D9F22A]">
                <Flame className="w-5 h-5" />
              </div>
              <div className="font-bold text-sm text-white">Radar de Criativos</div>
              <p className="text-xs text-white/60 leading-relaxed">
                Acesse anúncios que já foram testados e aprovados com ROI positivo em tráfego pago e orgânico.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#050811] border border-white/5 flex flex-col gap-2">
              <div className="w-10 h-10 rounded-xl bg-[#D9F22A]/10 border border-[#D9F22A]/30 flex items-center justify-center text-[#D9F22A]">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div className="font-bold text-sm text-white">Copys Prontas</div>
              <p className="text-xs text-white/60 leading-relaxed">
                Mensagens de alta conversão para abordar clientes no WhatsApp, e-mail marketing e anúncios.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#050811] border border-white/5 flex flex-col gap-2">
              <div className="w-10 h-10 rounded-xl bg-[#D9F22A]/10 border border-[#D9F22A]/30 flex items-center justify-center text-[#D9F22A]">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div className="font-bold text-sm text-white">Pixel Avançado</div>
              <p className="text-xs text-white/60 leading-relaxed">
                Dispare eventos precisos para a API de conversões do Meta (Facebook/Instagram), TikTok e Google.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Destaque Visual dos Recursos do Plano Pro/Scale (se Empresa) */}
      {!isAffiliate && (
        <div className="max-w-6xl mx-auto rounded-3xl bg-[#080d1a] border border-[#D9F22A]/20 p-6 sm:p-8 mt-12">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#D9F22A] mb-2">
            <Zap className="w-4 h-4 fill-current" />
            <span>Ferramentas de Conversão em Massa</span>
          </div>

          <h3 className="text-xl sm:text-2xl font-black text-white font-['Syne'] mb-4">
            Recursos inclusos nos planos de escala:
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-[#050811] border border-white/5 flex flex-col gap-2">
              <div className="w-10 h-10 rounded-xl bg-[#D9F22A]/10 border border-[#D9F22A]/30 flex items-center justify-center text-[#D9F22A]">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div className="font-bold text-sm text-white">Recuperador WhatsApp</div>
              <p className="text-xs text-white/60 leading-relaxed">
                Recupere até 35% dos Pix e carrinhos abandonados através de disparos automáticos inteligentes.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#050811] border border-white/5 flex flex-col gap-2">
              <div className="w-10 h-10 rounded-xl bg-[#D9F22A]/10 border border-[#D9F22A]/30 flex items-center justify-center text-[#D9F22A]">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div className="font-bold text-sm text-white">Order Bumps Ilimitados</div>
              <p className="text-xs text-white/60 leading-relaxed">
                Adicione ofertas complementares com 1 clique diretamente na tela de checkout para elevar o ticket médio.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#050811] border border-white/5 flex flex-col gap-2">
              <div className="w-10 h-10 rounded-xl bg-[#D9F22A]/10 border border-[#D9F22A]/30 flex items-center justify-center text-[#D9F22A]">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div className="font-bold text-sm text-white">Taxa Reduzida por Checkout</div>
              <p className="text-xs text-white/60 leading-relaxed">
                Economize em todas as transações aprovadas com as menores taxas fixas do mercado brasileiro.
              </p>
            </div>
          </div>
        </div>
      )}

      <section className="max-w-4xl mx-auto rounded-3xl bg-[#080d1a] border border-white/10 p-6 sm:p-8 mt-6" aria-labelledby="billing-status-heading">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#D9F22A] shrink-0"><Info className="w-5 h-5" /></div>
          <div>
            <h2 id="billing-status-heading" className="text-sm font-bold text-white">Assinaturas pagas ainda não estão habilitadas</h2>
            <p className="mt-1 text-xs text-white/60 leading-relaxed">Os planos gratuitos podem ser ativados. Stripe Billing, recorrência, cancelamentos e webhooks de assinatura ainda precisam de configuração e homologação; nenhum pagamento recorrente será iniciado nesta prévia.</p>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────────────────────
          MODAL DE ATIVAÇÃO & CHECKOUT (VINCULANDO USER ID E PLAN ID)
         ────────────────────────────────────────────────────────────────────────── */}
      {selectedPlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
          <div className="w-full max-w-xl rounded-3xl bg-[#080d1a] border border-[#D9F22A]/40 p-6 sm:p-8 relative shadow-2xl my-8">
            <button
              onClick={() => {
                setSelectedPlanModal(null);
                setCheckoutError(null);
              }}
              className="absolute top-5 right-5 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#D9F22A] mb-1">
              <Sparkles className="w-4 h-4 fill-current" />
              <span>Plano LeadsPay</span>
            </div>

            <h3 className="text-2xl sm:text-3xl font-black text-white font-['Syne'] mb-1">
              {selectedPlanModal.name}
            </h3>

            <p className="text-xs text-white/70 leading-relaxed mb-5">
              {selectedPlanModal.description}
            </p>

            {/* Resumo da Cobrança */}
            <div className="p-4 rounded-2xl bg-[#050811] border border-white/10 mb-5 space-y-2 text-xs">
              <div className="flex justify-between items-center text-white/70">
                <span>Plano selecionado:</span>
                <span className="font-bold text-white">{selectedPlanModal.name}</span>
              </div>
              <div className="flex justify-between items-center text-white/70">
                <span>Cobrança:</span>
                <span className="font-bold text-white">Mensal Recorrente (Sem Fidelidade)</span>
              </div>
              <div className="pt-2 border-t border-white/10 flex justify-between items-center">
                <span className="text-sm font-bold text-white">Valor da Mensalidade:</span>
                <span className="text-2xl font-black text-[#D9F22A]">
                  R$ {selectedPlanModal.price.toFixed(2).replace('.', ',')}
                </span>
              </div>
            </div>

            {isGeneratingCheckout && <p className="text-sm text-white/60" aria-live="polite">Ativando o plano gratuito…</p>}
            {checkoutError && <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-6 text-amber-200" role="status">{checkoutError}</div>}

            {/* Ações do Modal */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedPlanModal(null);
                  setCheckoutError(null);
                }}
                className="w-full py-3 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer text-center"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
