import React, { useState } from 'react';
import { 
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft,
  X, 
  Zap, 
  ShoppingBag, 
  Share2, 
  Users2, 
  Trophy, 
  Calendar, 
  MessageCircle, 
  ShieldCheck, 
  TrendingUp,
  ExternalLink,
  Flame,
  HeartHandshake
} from 'lucide-react';

interface AffiliateOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCommunity?: () => void;
  onOpenVitrine?: () => void;
  userName?: string;
}

const WHATSAPP_COMMUNITY_URL = 'https://chat.whatsapp.com/BcS8hLxACB87gi54t31ipg?s=sw&p=a&mlu=4&ilr=4';

export const AffiliateOnboardingModal: React.FC<AffiliateOnboardingModalProps> = ({
  isOpen,
  onClose,
  onOpenCommunity,
  onOpenVitrine,
  userName = 'Afiliado'
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const totalSteps = 4;

  if (!isOpen) return null;

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const firstName = userName.trim().split(' ')[0] || 'Afiliado';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#080d1a] border border-white/10 rounded-2xl sm:rounded-3xl shadow-[0_0_50px_rgba(217,242,42,0.12)] overflow-hidden my-auto">
        
        {/* Glow ambient background */}
        <div className="absolute top-0 right-1/4 w-72 h-72 bg-[#D9F22A]/10 rounded-full blur-[90px] pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-72 h-72 bg-emerald-500/10 rounded-full blur-[90px] pointer-events-none" />

        {/* Header Bar */}
        <div className="relative px-5 py-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#D9F22A]/15 border border-[#D9F22A]/30 flex items-center justify-center text-[#D9F22A]">
              <HeartHandshake className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-[#D9F22A] font-['Syne']">
                BEM-VINDO À FAMÍLIA LEADSPAY
              </span>
              <h3 className="text-xs text-white/70 font-medium">
                Guia Rápido de Início • Passo {currentStep} de {totalSteps}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white flex items-center justify-center transition-colors border border-white/10 cursor-pointer"
            title="Fechar guia"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Indicator Progress Bar */}
        <div className="w-full bg-white/5 h-1">
          <div 
            className="h-full bg-gradient-to-r from-[#D9F22A] to-emerald-400 transition-all duration-300"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-7 space-y-5 max-h-[75vh] overflow-y-auto">

          {/* STEP 1: Boas-vindas & Propósito */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D9F22A]/10 border border-[#D9F22A]/20 text-[#D9F22A] text-xs font-bold font-['Syne']">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Uma Nova Fase Começa Aqui</span>
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-white font-['Syne'] tracking-tight leading-snug">
                Olá, {firstName}! Você não está mais sozinho na internet.
              </h2>

              <p className="text-sm text-white/80 leading-relaxed">
                A <strong className="text-white">LeadsPay</strong> não é apenas uma plataforma de tecnologia ou pagamentos. 
                Nós somos uma <strong className="text-[#D9F22A]">família de empreendedores digitais</strong> construída para crescer 
                lado a lado com você.
              </p>

              <div className="p-4 rounded-2xl bg-gradient-to-br from-[#102419] to-[#0a1510] border border-[#D9F22A]/30 space-y-2">
                <div className="flex items-center gap-2 text-[#D9F22A] font-bold text-xs font-['Syne'] uppercase tracking-wider">
                  <Flame className="w-4 h-4" />
                  <span>Nosso Compromisso com Você</span>
                </div>
                <p className="text-xs text-white/80 leading-relaxed">
                  Sabemos o quanto o mercado digital pode ser desafiador quando se está sozinho. Por isso, 
                  estruturamos a LeadsPay para oferecer <span className="text-white font-semibold">segurança matemática</span>, 
                  <span className="text-white font-semibold"> saques rápidos sem enrolação</span> e uma rede humana que te apoia em cada etapa.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 text-center">
                  <div className="text-lg font-black text-[#D9F22A] font-['Syne']">D+9</div>
                  <div className="text-[11px] text-white/70 font-medium">Saque PIX Líquido</div>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 text-center">
                  <div className="text-lg font-black text-[#D9F22A] font-['Syne']">100%</div>
                  <div className="text-[11px] text-white/70 font-medium">Split Automático</div>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 text-center">
                  <div className="text-lg font-black text-[#D9F22A] font-['Syne']">R$ 0,00</div>
                  <div className="text-[11px] text-white/70 font-medium">Zero Mensalidade</div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Tudo O que Fazemos */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D9F22A]/10 border border-[#D9F22A]/20 text-[#D9F22A] text-xs font-bold font-['Syne']">
                <Zap className="w-3.5 h-3.5" />
                <span>O Que Fazemos por Você</span>
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-white font-['Syne'] tracking-tight">
                Infraestrutura de Elite para o seu Negócio Digital
              </h2>

              <p className="text-sm text-white/70 leading-relaxed">
                Eliminamos toda a complexidade técnica para que sua única preocupação seja gerar tráfego e colocar comissões no bolso:
              </p>

              <div className="space-y-2.5">
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
                  <div className="w-8 h-8 rounded-xl bg-[#D9F22A]/15 text-[#D9F22A] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider font-['Syne']">
                      Split Instantâneo e Transparente
                    </h3>
                    <p className="text-xs text-white/70 leading-relaxed mt-0.5">
                      No momento exato em que o cliente paga via PIX ou Cartão, a LeadsPay divide o valor e credita sua comissão automaticamente. Sem depender de repasse manual do produtor.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
                  <div className="w-8 h-8 rounded-xl bg-[#D9F22A]/15 text-[#D9F22A] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider font-['Syne']">
                      Marketplace de Startups & Infoprodutos
                    </h3>
                    <p className="text-xs text-white/70 leading-relaxed mt-0.5">
                      Produtos e assinaturas validados com páginas de alta conversão, order bumps e funis prontos para você se afiliar em 1 clique.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
                  <div className="w-8 h-8 rounded-xl bg-[#D9F22A]/15 text-[#D9F22A] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider font-['Syne']">
                      Saques Rápidos em D+9 via PIX
                    </h3>
                    <p className="text-xs text-white/70 leading-relaxed mt-0.5">
                      Transfira seus lucros com agilidade diretamente para a sua chave PIX com histórico auditável e acompanhamento em tempo real.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Como Vamos Te Ajudar a Trabalhar na Internet */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D9F22A]/10 border border-[#D9F22A]/20 text-[#D9F22A] text-xs font-bold font-['Syne']">
                <Users2 className="w-3.5 h-3.5" />
                <span>Mentoria & Comunidade</span>
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-white font-['Syne'] tracking-tight">
                Como vamos te ajudar a faturar e escalar
              </h2>

              <p className="text-sm text-white/70 leading-relaxed">
                Não te deixamos à deriva. Criamos uma rede de suporte ativo com benefícios exclusivos para os membros da nossa família:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-1.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-white font-['Syne']">Reuniões Semanais com a Equipe</h4>
                  <p className="text-[11px] text-white/70 leading-relaxed">
                    Toda semana o time da LeadsPay realiza encontros ao vivo com estratégias de tráfego, análise de campanhas e mentoria direta.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-1.5">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                    <Trophy className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-white font-['Syne']">Premiações & Bonificações</h4>
                  <p className="text-[11px] text-white/70 leading-relaxed">
                    Rankings mensais com bônus em dinheiro direto no PIX e reconhecimentos para os afiliados que mais se destacarem.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-1.5">
                  <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                    <Users2 className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-white font-['Syne']">Squads & Troca de Ideias</h4>
                  <p className="text-[11px] text-white/70 leading-relaxed">
                    Monte parcerias, compartilhe copies e descubra o que os outros afiliados estão aplicando na prática com sucesso.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-1.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <MessageCircle className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-white font-['Syne']">Grupo VIP no WhatsApp</h4>
                  <p className="text-[11px] text-white/70 leading-relaxed">
                    Acesso imediato à maior e mais acolhedora comunidade de vendas e afiliação do Brasil.
                  </p>
                </div>
              </div>

              {/* WhatsApp direct box */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/60 to-[#0c1811] border border-emerald-500/30 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
                    <MessageCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white font-['Syne']">Grupo Oficial no WhatsApp</div>
                    <div className="text-[11px] text-white/70">Entre agora e conecte-se com a família.</div>
                  </div>
                </div>
                <a
                  href={WHATSAPP_COMMUNITY_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#060A15] font-black text-xs font-['Syne'] flex items-center gap-1.5 transition-all shadow-lg flex-shrink-0 active:scale-95"
                >
                  <span>Entrar</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}

          {/* STEP 4: Roteiro Rápido para Começar */}
          {currentStep === 4 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D9F22A]/10 border border-[#D9F22A]/20 text-[#D9F22A] text-xs font-bold font-['Syne']">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Seus Próximos Passos</span>
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-white font-['Syne'] tracking-tight">
                Pronto para dar o primeiro passo?
              </h2>

              <p className="text-sm text-white/70 leading-relaxed">
                Aqui está o roteiro simples para você iniciar com o pé direito hoje mesmo:
              </p>

              <div className="space-y-2">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5">
                  <div className="w-6 h-6 rounded-full bg-[#D9F22A] text-[#060A15] font-black text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white font-['Syne']">Escolha seu Primeiro Produto</div>
                    <div className="text-[11px] text-white/60">
                      Vá na aba <strong>Marketplace de Startups</strong>, veja as comissões e clique em Se Afiliar.
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5">
                  <div className="w-6 h-6 rounded-full bg-[#D9F22A] text-[#060A15] font-black text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white font-['Syne']">Copie seu Link com Rastreamento</div>
                    <div className="text-[11px] text-white/60">
                      Na aba <strong>Links & Redes Sociais</strong>, acesse seus links únicos e comece a divulgar com segurança.
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5">
                  <div className="w-6 h-6 rounded-full bg-[#D9F22A] text-[#060A15] font-black text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white font-['Syne']">Acesse a Aba Comunidade VIP</div>
                    <div className="text-[11px] text-white/60">
                      Conheça os detalhes das reuniões semanais e entre no grupo do WhatsApp da Família LeadsPay.
                    </div>
                  </div>
                </div>
              </div>

              {/* Family Manifesto Banner */}
              <div className="p-4 rounded-2xl bg-[#D9F22A]/10 border border-[#D9F22A]/30 text-center space-y-1">
                <div className="text-xs font-black text-[#D9F22A] uppercase tracking-wider font-['Syne']">
                  Somos uma Família. Vamos crescer juntos!
                </div>
                <div className="text-xs text-white/80">
                  Conte com nossa equipe para qualquer dúvida. Estamos ao seu lado a cada venda.
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer Navigation Controls */}
        <div className="px-5 py-4 border-t border-white/10 flex items-center justify-between bg-[#060a15] gap-3">
          {currentStep > 1 ? (
            <button
              onClick={handlePrev}
              className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-white/10"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Voltar</span>
            </button>
          ) : (
            <button
              onClick={onClose}
              className="text-xs text-white/50 hover:text-white transition-colors cursor-pointer"
            >
              Pular Introdução
            </button>
          )}

          <div className="flex items-center gap-1.5">
            {Array.from({ length: totalSteps }).map((_, idx) => (
              <span
                key={idx}
                className={`h-1.5 rounded-full transition-all ${
                  idx + 1 === currentStep 
                    ? 'w-6 bg-[#D9F22A]' 
                    : idx + 1 < currentStep 
                    ? 'w-2 bg-emerald-400' 
                    : 'w-2 bg-white/20'
                }`}
              />
            ))}
          </div>

          {currentStep < totalSteps ? (
            <button
              onClick={handleNext}
              className="px-4 py-2 rounded-xl bg-[#D9F22A] hover:bg-[#c8e224] text-[#060A15] text-xs font-black font-['Syne'] flex items-center gap-1.5 transition-all cursor-pointer shadow-lg active:scale-95"
            >
              <span>Próximo</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={() => {
                onClose();
                if (onOpenCommunity) onOpenCommunity();
              }}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#D9F22A] to-emerald-400 hover:from-[#c8e224] hover:to-emerald-300 text-[#060A15] text-xs font-black font-['Syne'] flex items-center gap-1.5 transition-all cursor-pointer shadow-lg active:scale-95"
            >
              <span>Explorar Plataforma</span>
              <CheckCircle2 className="w-4 h-4" />
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
