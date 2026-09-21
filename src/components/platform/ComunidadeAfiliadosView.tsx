import React, { useState } from 'react';
import { 
  Users2, 
  MessageCircle, 
  Sparkles, 
  Calendar, 
  Trophy, 
  HeartHandshake, 
  Zap, 
  CheckCircle2, 
  ExternalLink, 
  Copy, 
  Check, 
  ShieldCheck, 
  ArrowRight, 
  Flame, 
  Compass, 
  Award,
  Video,
  Clock,
  HelpCircle
} from 'lucide-react';

interface ComunidadeAfiliadosViewProps {
  userName?: string;
  onOpenOnboardingTour?: () => void;
  onNavigateToVitrine?: () => void;
}

const WHATSAPP_COMMUNITY_URL = 'https://chat.whatsapp.com/BcS8hLxACB87gi54t31ipg?s=sw&p=a&mlu=4&ilr=4';

export const ComunidadeAfiliadosView: React.FC<ComunidadeAfiliadosViewProps> = ({
  userName = 'Afiliado',
  onOpenOnboardingTour,
  onNavigateToVitrine
}) => {
  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(WHATSAPP_COMMUNITY_URL);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const firstName = userName.trim().split(' ')[0] || 'Afiliado';

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      
      {/* ======================= HERO BANNER ======================= */}
      <div className="relative rounded-3xl bg-gradient-to-b from-[#0e1728] via-[#09101d] to-[#060a15] border border-white/10 p-6 sm:p-10 shadow-2xl overflow-hidden">
        {/* Glow ambient spots */}
        <div className="absolute -top-24 right-1/4 w-96 h-96 bg-[#D9F22A]/15 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute -bottom-24 left-10 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-4">
          
          {/* Badges Row */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D9F22A]/15 border border-[#D9F22A]/30 text-[#D9F22A] text-xs font-black uppercase tracking-wider font-['Syne']">
              <Sparkles className="w-3.5 h-3.5" />
              <span>COMUNIDADE OFICIAL VIP</span>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold font-['Syne']">
              <HeartHandshake className="w-3.5 h-3.5" />
              <span>SOMOS UMA FAMÍLIA</span>
            </div>

            <span className="text-xs text-white/50 hidden sm:inline">• A Maior Comunidade do Brasil</span>
          </div>

          {/* Main Title */}
          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white font-['Syne'] tracking-tight leading-tight">
            Você nunca mais vai empreender ou vender <span className="text-[#D9F22A]">sozinho</span> na internet.
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-base text-white/80 leading-relaxed max-w-2xl font-normal">
            Olá, <strong className="text-white">{firstName}</strong>! A LeadsPay não é apenas tecnologia e split de pagamentos: 
            somos um ecossistema vivo de pessoas reais. Aqui nós conectamos afiliados, formamos squads de vendas, 
            compartilhamos ideias e <strong className="text-[#D9F22A]">crescemos juntos com você</strong>.
          </p>

          {/* Action CTAs Box */}
          <div className="pt-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <a
              href={WHATSAPP_COMMUNITY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3.5 rounded-2xl bg-[#D9F22A] hover:bg-[#c8e224] text-[#060A15] font-black text-sm font-['Syne'] flex items-center justify-center gap-2.5 transition-all shadow-[0_0_25px_rgba(217,242,42,0.3)] hover:shadow-[0_0_35px_rgba(217,242,42,0.45)] active:scale-[0.98] cursor-pointer"
            >
              <MessageCircle className="w-5 h-5 fill-current" />
              <span>Entrar no Grupo Oficial do WhatsApp</span>
              <ExternalLink className="w-4 h-4 ml-1" />
            </a>

            <button
              onClick={handleCopyLink}
              className="px-4 py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 text-white/90 hover:text-white border border-white/10 text-xs font-bold font-['Syne'] flex items-center justify-center gap-2 transition-all cursor-pointer"
              title="Copiar link do convite"
            >
              {copiedLink ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">Link Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-[#D9F22A]" />
                  <span>Copiar Link do Grupo</span>
                </>
              )}
            </button>

            {onOpenOnboardingTour && (
              <button
                onClick={onOpenOnboardingTour}
                className="px-4 py-3.5 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 text-xs font-bold font-['Syne'] flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Compass className="w-4 h-4" />
                <span>Ver Guia da Plataforma</span>
              </button>
            )}
          </div>

          {/* Trust Mini-bar */}
          <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-white/60">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Grupo Ativo e Moderado
            </span>
            <span>•</span>
            <span>Reuniões Semanais ao Vivo</span>
            <span>•</span>
            <span>Premiações e Bônus via PIX</span>
            <span>•</span>
            <span>100% Gratuito para Afiliados</span>
          </div>

        </div>
      </div>

      {/* ======================= MANIFESTO DA FAMÍLIA ======================= */}
      <div className="rounded-3xl bg-gradient-to-r from-[#102419]/90 via-[#0a1510] to-[#070b14] border border-[#D9F22A]/30 p-6 sm:p-8 relative overflow-hidden shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 text-[#D9F22A] font-black text-xs uppercase tracking-widest font-['Syne']">
              <HeartHandshake className="w-4 h-4" />
              <span>MANIFESTO LEADSPAY • SOMOS UMA FAMÍLIA</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white font-['Syne'] leading-snug">
              "Aqui você não é um número de afiliado. Você é nosso parceiro de jornada."
            </h2>
            <p className="text-xs sm:text-sm text-white/80 leading-relaxed">
              No mercado tradicional, muitos produtores e plataformas tratam o afiliado como uma engrenagem fria. 
              Na <strong>LeadsPay</strong>, invertemos esse jogo. Criamos este espaço para que você tenha voz, suporte humano direto, 
              celebre suas conquistas e encontre as pessoas certas para alavancar seu faturamento. 
              <strong className="text-white"> Quando você vende, todo o ecossistema comemora junto.</strong>
            </p>
          </div>

          <div className="w-full md:w-auto flex-shrink-0 p-5 rounded-2xl bg-black/40 border border-white/10 text-center space-y-2">
            <div className="text-3xl font-black text-[#D9F22A] font-['Syne']">100%</div>
            <div className="text-xs font-bold text-white uppercase tracking-wider">Unidos no Propósito</div>
            <div className="text-[11px] text-white/60 max-w-[200px]">
              Trabalhamos para criar a comunidade mais acolhedora e lucrativa do Brasil.
            </div>
          </div>
        </div>
      </div>

      {/* ======================= OS 6 PILARES DA COMUNIDADE ======================= */}
      <div className="space-y-4">
        <div>
          <div className="text-xs font-black uppercase tracking-wider text-[#D9F22A] font-['Syne']">
            VANTAGENS EXCLUSIVAS DA COMUNIDADE
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white font-['Syne'] mt-1">
            Como a nossa comunidade acelera seus resultados
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

          {/* Pilar 1: Conexão e Squads */}
          <div className="p-5 rounded-2xl bg-[#080d1a] border border-white/10 hover:border-[#D9F22A]/40 transition-all space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#D9F22A]/15 text-[#D9F22A] flex items-center justify-center">
              <Users2 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white font-['Syne']">
              Conexões e Formação de Squads
            </h3>
            <p className="text-xs text-white/70 leading-relaxed">
              Encontre outros afiliados com expertises complementares. Afiliados de tráfego se unem a especialistas em copy e automação para formar equipes de alta conversão.
            </p>
          </div>

          {/* Pilar 2: Troca de Ideias e Criativos */}
          <div className="p-5 rounded-2xl bg-[#080d1a] border border-white/10 hover:border-[#D9F22A]/40 transition-all space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white font-['Syne']">
              Demonstração & Troca de Ideias
            </h3>
            <p className="text-xs text-white/70 leading-relaxed">
              Descubra quais ângulos de anúncio, copies e criativos estão gerando mais vendas na prática. Troque testes reais e melhore seu ROI rapidamente.
            </p>
          </div>

          {/* Pilar 3: Reuniões Semanais ao Vivo */}
          <div className="p-5 rounded-2xl bg-[#080d1a] border border-white/10 hover:border-[#D9F22A]/40 transition-all space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center">
              <Video className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white font-['Syne']">
              Reuniões Semanais com o Time LeadsPay
            </h3>
            <p className="text-xs text-white/70 leading-relaxed">
              Encontros ao vivo todas as semanas diretamente com a equipe técnica e de vendas da LeadsPay para mentoria, suporte em tempo real e novidades de produtos.
            </p>
          </div>

          {/* Pilar 4: Premiações & Bonificações */}
          <div className="p-5 rounded-2xl bg-[#080d1a] border border-white/10 hover:border-[#D9F22A]/40 transition-all space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
              <Trophy className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white font-['Syne']">
              Premiações & Bonificações em Dinheiro
            </h3>
            <p className="text-xs text-white/70 leading-relaxed">
              Rankings mensais com bonificações extras no PIX, troféus físicos de reconhecimento de faturamento e prêmios especiais para os membros mais engajados.
            </p>
          </div>

          {/* Pilar 5: Networking de Alto Nível */}
          <div className="p-5 rounded-2xl bg-[#080d1a] border border-white/10 hover:border-[#D9F22A]/40 transition-all space-y-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center">
              <Flame className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white font-['Syne']">
              Networking Real e Produtivo
            </h3>
            <p className="text-xs text-white/70 leading-relaxed">
              Converse diretamente com quem vive de internet, compartilhando desafios do dia a dia, ferramentas úteis, novos nichos e formas de escalar no tráfego.
            </p>
          </div>

          {/* Pilar 6: A Maior Comunidade do Brasil */}
          <div className="p-5 rounded-2xl bg-[#080d1a] border border-white/10 hover:border-[#D9F22A]/40 transition-all space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#D9F22A]/15 text-[#D9F22A] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white font-['Syne']">
              A Maior Comunidade do Brasil
            </h3>
            <p className="text-xs text-white/70 leading-relaxed">
              Estamos erguendo juntos o ecossistema de vendas online mais respeitado do país, pautado na honestidade, na segurança e na divisão justa de lucros.
            </p>
          </div>

        </div>
      </div>

      {/* ======================= CRONOGRAMA DE ENCONTROS AO VIVO ======================= */}
      <div className="rounded-3xl bg-[#080d1a] border border-white/10 p-6 sm:p-8 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-xs font-black uppercase tracking-wider text-[#D9F22A] font-['Syne']">
              AGENDA SEMANAL AO VIVO
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white font-['Syne']">
              Reuniões de Suporte, Estratégia e Premiação
            </h2>
          </div>

          <span className="text-xs px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/70 w-fit">
            Avisos de links compartilhados no grupo do WhatsApp
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Card 1 */}
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-[#D9F22A] font-['Syne'] uppercase">Toda Terça-Feira</span>
              <span className="text-[11px] text-white/50 flex items-center gap-1">
                <Clock className="w-3 h-3" /> 20:00h
              </span>
            </div>
            <h3 className="text-sm font-bold text-white font-['Syne']">
              Call de Estratégias & Tráfego
            </h3>
            <p className="text-xs text-white/70 leading-relaxed">
              Novas ofertas validadas, técnicas de anúncio (Meta, Google, TikTok), esteiras de conversão e tira-dúvidas prático.
            </p>
          </div>

          {/* Card 2 */}
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-emerald-400 font-['Syne'] uppercase">Toda Quinta-Feira</span>
              <span className="text-[11px] text-white/50 flex items-center gap-1">
                <Clock className="w-3 h-3" /> 19:30h
              </span>
            </div>
            <h3 className="text-sm font-bold text-white font-['Syne']">
              Plantão de Suporte Técnico
            </h3>
            <p className="text-xs text-white/70 leading-relaxed">
              Ajuda com rastreamento UTM, pixel de conversão, links de pagamento e dúvidas operacionais da plataforma.
            </p>
          </div>

          {/* Card 3 */}
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-amber-400 font-['Syne'] uppercase">Última Sexta do Mês</span>
              <span className="text-[11px] text-white/50 flex items-center gap-1">
                <Clock className="w-3 h-3" /> 20:00h
              </span>
            </div>
            <h3 className="text-sm font-bold text-white font-['Syne']">
              Gala de Premiações & Bônus
            </h3>
            <p className="text-xs text-white/70 leading-relaxed">
              Celebração das metas alcançadas, entrega de bonificações no PIX para os top afiliados e sorteios exclusivos.
            </p>
          </div>

        </div>
      </div>

      {/* ======================= BOTÃO FINAL DE CONEXÃO ======================= */}
      <div className="rounded-3xl bg-gradient-to-b from-[#102419] to-[#080d1a] border border-[#D9F22A]/40 p-6 sm:p-10 text-center space-y-4 shadow-2xl">
        <div className="w-16 h-16 rounded-3xl bg-[#D9F22A]/20 border border-[#D9F22A]/40 text-[#D9F22A] flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(217,242,42,0.2)]">
          <HeartHandshake className="w-8 h-8" />
        </div>

        <div className="space-y-1 max-w-xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-black text-white font-['Syne']">
            Seja muito bem-vindo à Família LeadsPay!
          </h2>
          <p className="text-xs sm:text-sm text-white/80 leading-relaxed">
            Clique no botão abaixo para garantir sua vaga no nosso grupo VIP oficial do WhatsApp e dar o próximo passo na sua jornada digital.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <a
            href={WHATSAPP_COMMUNITY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-[#D9F22A] hover:bg-[#c8e224] text-[#060A15] font-black text-sm font-['Syne'] flex items-center justify-center gap-3 transition-all shadow-[0_0_30px_rgba(217,242,42,0.35)] hover:shadow-[0_0_45px_rgba(217,242,42,0.55)] active:scale-[0.98] cursor-pointer"
          >
            <MessageCircle className="w-5 h-5 fill-current" />
            <span>Acessar Grupo do WhatsApp Agora</span>
            <ArrowRight className="w-4 h-4" />
          </a>

          {onNavigateToVitrine && (
            <button
              onClick={onNavigateToVitrine}
              className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white border border-white/10 text-xs font-bold font-['Syne'] flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <span>Explorar Produtos para Vender</span>
            </button>
          )}
        </div>

        <div className="pt-2 text-[11px] text-white/50">
          Link oficial permanente: <code className="text-[#D9F22A]/80 select-all">{WHATSAPP_COMMUNITY_URL}</code>
        </div>
      </div>

    </div>
  );
};
