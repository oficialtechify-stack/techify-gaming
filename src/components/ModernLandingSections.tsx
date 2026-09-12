import React, { useState } from 'react';
import { 
  ArrowRight, 
  Copy, 
  Check, 
  Plus, 
  MessageCircle, 
  FileCode2, 
  Calculator,
  Shield,
  Coins
} from 'lucide-react';

/* =========================================================================
   1. HERO AI BANNER (LeadsPay Harmonized Style)
   "Integre com IA: Claude, ChatGPT, Lovable e mais."
   "Construa seu produto. A gente ajuda a vender."
   "Pagamentos, distribuição e comunidade para SaaS e agentes de IA."
   ========================================================================= */
export const HeroAiBanner: React.FC<{ onOpenPlatform?: () => void }> = ({ onOpenPlatform }) => {
  return (
    <section className="relative w-full bg-[#060A15] text-white py-16 sm:py-20 md:py-24 border-y border-white/5 overflow-hidden">
      {/* Background neon ambient blur spots matching LeadsPay */}
      <div className="absolute top-1/2 -left-20 w-[450px] h-[450px] bg-[#D9F22A]/[0.07] rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="absolute top-10 right-10 w-[400px] h-[400px] bg-[#1e3a8a]/[0.10] rounded-full blur-[150px] pointer-events-none -z-10" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Top AI Badge */}
        <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-[#080d1a] border border-[#D9F22A]/30 shadow-[0_0_20px_rgba(217,242,42,0.15)] text-xs sm:text-sm font-medium text-white mb-8 hover:border-[#D9F22A]/60 transition-all backdrop-blur-md">
          {/* AI Platform Mini Icons */}
          <div className="flex items-center gap-1.5">
            {/* Claude Sparkle */}
            <span className="w-4 h-4 flex items-center justify-center text-[#f59e0b]" title="Claude by Anthropic">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" />
              </svg>
            </span>
            {/* ChatGPT OpenAI Spiral */}
            <span className="w-4 h-4 flex items-center justify-center text-[#38bdf8]" title="ChatGPT by OpenAI">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8v8M8 12h8" />
              </svg>
            </span>
            {/* Lovable Heart Gradient */}
            <span className="w-4 h-4 flex items-center justify-center" title="Lovable AI">
              <svg viewBox="0 0 24 24" fill="url(#lovableGradDark)" className="w-3.5 h-3.5">
                <defs>
                  <linearGradient id="lovableGradDark" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ec4899" />
                    <stop offset="100%" stopColor="#a855f7" />
                  </linearGradient>
                </defs>
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            </span>
          </div>
          <span className="font-bold text-[#D9F22A]">Integre com IA:</span>
          <span className="text-white/80">Claude, ChatGPT, Lovable e mais.</span>
        </div>

        {/* Large Typography Headlines */}
        <div className="max-w-4xl">
          <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.08] text-white font-['Syne']">
            Construa seu produto.
            <br />
            <span className="text-[#D9F22A] drop-shadow-[0_0_30px_rgba(217,242,42,0.4)]">
              A gente ajuda a vender.
            </span>
          </h2>

          <p className="mt-6 text-lg sm:text-xl md:text-2xl text-white/75 font-normal leading-relaxed max-w-2xl">
            Pagamentos, distribuição e comunidade para SaaS e agentes de IA.
          </p>

          {onOpenPlatform && (
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button
                onClick={onOpenPlatform}
                className="cursor-pointer inline-flex items-center gap-2.5 px-7 py-3.5 rounded-2xl bg-[#D9F22A] hover:bg-[#cbe31c] text-[#060A15] font-black text-xs sm:text-sm uppercase tracking-wider shadow-[0_0_25px_rgba(217,242,42,0.35)] hover:scale-105 transition-all duration-300"
              >
                <span>Conhecer a Vitrine</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

/* =========================================================================
   2. INTEGRE COMO QUISER SECTION (LeadsPay Harmonized Style)
   "Integre como quiser! Code, vibe-code, no-code!"
   "Integre com o nosso MCP via API ou use um dos 15+ SDKs prontos. Ideal até para quem programa com IA."
   Floating badges: Python, PHP, Ruby, Javascript, n8n, Lovable
   Button: "Veja nossa documentação ->" + "ou veja llms.txt"
   ========================================================================= */
export const CodeVibeIntegrationsSection: React.FC = () => {
  const [copiedLLM, setCopiedLLM] = useState(false);
  const [showDocsModal, setShowDocsModal] = useState(false);

  const handleCopyLLM = () => {
    navigator.clipboard.writeText('https://leadspay.com/llms.txt');
    setCopiedLLM(true);
    setTimeout(() => setCopiedLLM(false), 2500);
  };

  return (
    <section className="relative w-full bg-[#060A15] text-white py-20 sm:py-24 md:py-28 overflow-hidden border-b border-white/5">
      {/* Cyber/Tech Dot Matrix Pattern with LeadsPay neon tint */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-25"
        style={{
          backgroundImage: 'radial-gradient(rgba(217, 242, 42, 0.25) 1.25px, transparent 1.25px)',
          backgroundSize: '24px 24px'
        }}
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
        {/* Centered Pill Badge */}
        <div className="inline-flex items-center px-4 py-1.5 rounded-full border border-[#D9F22A]/30 bg-[#080d1a] text-xs font-bold uppercase tracking-wider text-[#D9F22A] shadow-[0_0_15px_rgba(217,242,42,0.15)] mb-6">
          Integrações
        </div>

        {/* Main Headline */}
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white font-['Syne'] leading-tight">
          Integre como quiser!
          <br className="hidden sm:inline" />{' '}
          <span className="text-[#D9F22A] drop-shadow-[0_0_20px_rgba(217,242,42,0.3)]">
            Code, vibe-code, no-code!
          </span>
        </h2>

        {/* Subtitle */}
        <p className="mt-4 text-sm sm:text-base md:text-lg text-white/70 max-w-xl mx-auto leading-relaxed">
          Integre com o nosso MCP via API ou use um dos 15+ SDKs prontos. Ideal até para quem programa com IA.
        </p>

        {/* Floating Language Badges with LeadsPay Dark Neon Cards */}
        <div className="relative my-10 sm:my-12 py-4">
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 max-w-2xl mx-auto">
            {/* Python Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-[#080d1a] border border-white/10 hover:border-[#D9F22A]/50 text-xs sm:text-sm font-bold text-white shadow-lg transition-all hover:scale-105">
              <span className="text-base">🐍</span>
              <span>Python</span>
            </div>

            {/* PHP Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-[#080d1a] border border-white/10 hover:border-[#D9F22A]/50 text-xs sm:text-sm font-bold text-white shadow-lg transition-all hover:scale-105">
              <span className="w-5 h-5 rounded-md bg-white/10 text-[#D9F22A] flex items-center justify-center text-[10px] font-black">php</span>
              <span>PHP</span>
            </div>

            {/* Javascript Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-[#080d1a] border border-white/10 hover:border-[#D9F22A]/50 text-xs sm:text-sm font-bold text-white shadow-lg transition-all hover:scale-105">
              <span className="w-4 h-4 rounded bg-[#f7df1e] text-black flex items-center justify-center text-[9px] font-black">JS</span>
              <span>Javascript</span>
            </div>

            {/* Ruby Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-[#080d1a] border border-white/10 hover:border-[#D9F22A]/50 text-xs sm:text-sm font-bold text-white shadow-lg transition-all hover:scale-105">
              <span className="text-red-400 text-sm">💎</span>
              <span>Ruby</span>
            </div>

            {/* n8n Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-[#080d1a] border border-white/10 hover:border-[#D9F22A]/50 text-xs sm:text-sm font-bold text-white shadow-lg transition-all hover:scale-105">
              <span className="w-4 h-4 rounded bg-orange-500 text-white text-[9px] font-bold flex items-center justify-center">n</span>
              <span>n8n</span>
            </div>

            {/* Lovable Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-[#080d1a] border border-white/10 hover:border-[#D9F22A]/50 text-xs sm:text-sm font-bold text-white shadow-lg transition-all hover:scale-105">
              <span className="text-pink-400">❤️</span>
              <span>Lovable</span>
            </div>
          </div>
        </div>

        {/* Action Button & Link */}
        <div className="flex flex-col items-center justify-center gap-3">
          <button
            onClick={() => setShowDocsModal(true)}
            className="cursor-pointer inline-flex items-center gap-2.5 px-8 py-3.5 rounded-2xl bg-[#D9F22A] hover:bg-[#cbe31c] text-[#060A15] font-black text-xs sm:text-sm uppercase tracking-wider shadow-[0_0_25px_rgba(217,242,42,0.35)] hover:scale-105 transition-all duration-300"
          >
            <span>Veja nossa documentação</span>
            <span className="w-5 h-5 rounded-full bg-[#060A15] text-[#D9F22A] flex items-center justify-center">
              <ArrowRight className="w-3 h-3" />
            </span>
          </button>

          <button
            onClick={handleCopyLLM}
            className="cursor-pointer text-xs font-semibold text-[#D9F22A] hover:text-[#e4f849] underline underline-offset-4 flex items-center gap-1 transition-colors mt-2"
          >
            {copiedLLM ? (
              <span className="text-[#D9F22A] flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Link copiado para a área de transferência!
              </span>
            ) : (
              <span>ou veja llms.txt</span>
            )}
          </button>
        </div>
      </div>

      {/* Docs Modal LeadsPay Dark Style */}
      {showDocsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#080d1a] rounded-3xl max-w-lg w-full p-6 sm:p-7 text-left shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-[#D9F22A]/30">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2.5 text-white font-black font-['Syne'] text-base sm:text-lg">
                <FileCode2 className="w-5 h-5 text-[#D9F22A]" />
                Documentação LeadsPay API & MCP
              </div>
              <button 
                onClick={() => setShowDocsModal(false)}
                className="text-white/60 hover:text-white text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="py-4 space-y-3 text-xs sm:text-sm text-white/75 leading-relaxed">
              <p>
                A documentação completa da LeadsPay fornece endpoints REST padronizados para criação de cobranças PIX instantâneas, webhooks criptografados com assinatura HMAC e split automatizado entre afiliados e fundadores.
              </p>
              <div className="p-3.5 bg-[#050811] border border-white/10 text-[#D9F22A] rounded-xl font-mono text-xs overflow-x-auto">
                curl -X POST https://leadspay.com/api/v1/charges \<br />
                &nbsp;&nbsp;-H "Authorization: Bearer SUA_API_KEY" \<br />
                &nbsp;&nbsp;-d '&#123;"amount": 100, "customer": &#123;"name": "João"&#125;&#125;'
              </div>
              <p className="text-xs text-white/50">
                Ideal para uso direto com agentes de IA através do protocolo Model Context Protocol (MCP) e integrações no-code.
              </p>
            </div>
            <div className="pt-3 border-t border-white/10 flex justify-end">
              <button
                onClick={() => setShowDocsModal(false)}
                className="px-5 py-2.5 bg-[#D9F22A] hover:bg-[#cbe31c] text-[#060A15] rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

/* =========================================================================
   3. DOCS & SUÍTE DE SOLUÇÕES (LeadsPay Harmonized Style)
   Top cards: "Documentação" & "Integrar fácil"
   Bottom: "Uma suite de soluções para o seu negócio." (with LeadsPay neon loop)
   ========================================================================= */
export const DocsAndSuiteSection: React.FC = () => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState<string | null>(null);

  const llmUrl = 'leadspay.com/llms.txt';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`https://${llmUrl}`);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleAiAction = (aiName: string) => {
    const prompt = `Por favor, leia o contexto da documentação da LeadsPay em https://${llmUrl} e me ajude a integrar cobranças PIX e checkout no meu app.`;
    navigator.clipboard.writeText(prompt);
    setCopiedPrompt(aiName);
    setTimeout(() => setCopiedPrompt(null), 3000);
  };

  return (
    <section className="relative w-full bg-[#060A15] text-white py-16 sm:py-20 md:py-24 border-b border-white/5">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top 2 Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-20 sm:mb-24">
          {/* Card 1: Documentação */}
          <div className="p-6 sm:p-8 rounded-3xl border border-white/10 bg-[#080d1a] flex flex-col justify-between hover:border-[#D9F22A]/40 transition-all duration-300 shadow-xl backdrop-blur-md">
            <div>
              <h3 className="text-xl sm:text-2xl font-black text-white font-['Syne']">
                Documentação
              </h3>
              <p className="mt-3 text-xs sm:text-sm text-white/70 leading-relaxed">
                Feita de desenvolvedores, para desenvolvedores, nossa plataforma foi projetada para ser fácil e intuitiva.
              </p>
            </div>
            <div className="mt-8">
              <a
                href="#integracoes"
                onClick={(e) => {
                  e.preventDefault();
                  alert('A documentação completa está disponível no link do llms.txt e na API integrada!');
                }}
                className="cursor-pointer inline-flex items-center gap-2 text-xs sm:text-sm font-bold uppercase tracking-wider text-[#D9F22A] hover:text-[#cbe31c] transition-colors"
              >
                <span>Acessar documentação</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Card 2: Integrar fácil */}
          <div className="p-6 sm:p-8 rounded-3xl border border-white/10 bg-[#080d1a] flex flex-col justify-between hover:border-[#D9F22A]/40 transition-all duration-300 shadow-xl backdrop-blur-md">
            <div>
              <h3 className="text-xl sm:text-2xl font-black text-white font-['Syne']">
                Integrar fácil
              </h3>
              <p className="mt-3 text-xs sm:text-sm text-white/70 leading-relaxed">
                A LeadsPay foi feita também para IAs e LLMs lerem — e isso deixa a integração muito mais simples. Cole o link de contexto na sua IA ou clique na sua favorita aqui embaixo:
              </p>

              {/* Copyable Box LeadsPay Dark Style */}
              <div className="mt-5 p-2 sm:p-2.5 rounded-2xl bg-[#050811] border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-mono text-white/90 truncate pl-2">
                  <span className="text-[#D9F22A]">⚡</span>
                  <span className="truncate">{llmUrl}</span>
                </div>
                <button
                  onClick={handleCopyLink}
                  className="cursor-pointer px-4 py-1.5 rounded-xl bg-[#D9F22A] hover:bg-[#cbe31c] text-[#060A15] text-xs font-black uppercase tracking-wider transition-all flex-shrink-0 flex items-center gap-1.5"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* AI Action Buttons LeadsPay Dark Style */}
            <div className="mt-6 flex flex-wrap items-center gap-2 pt-2">
              <button
                onClick={() => handleAiAction('Claude')}
                className="cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:border-[#D9F22A]/50 text-xs font-bold text-white transition-all active:scale-95"
              >
                <span className="text-[#f59e0b]">✳</span>
                <span>{copiedPrompt === 'Claude' ? 'Prompt copiado!' : 'Usar Claude'}</span>
              </button>

              <button
                onClick={() => handleAiAction('ChatGPT')}
                className="cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:border-[#D9F22A]/50 text-xs font-bold text-white transition-all active:scale-95"
              >
                <span className="text-[#38bdf8]">🌀</span>
                <span>{copiedPrompt === 'ChatGPT' ? 'Prompt copiado!' : 'Usar ChatGPT'}</span>
              </button>

              <button
                onClick={() => handleAiAction('Lovable')}
                className="cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:border-[#D9F22A]/50 text-xs font-bold text-white transition-all active:scale-95"
              >
                <span className="text-pink-400">❤️</span>
                <span>{copiedPrompt === 'Lovable' ? 'Prompt copiado!' : 'Usar Lovable'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Section: "Uma suite de soluções para o seu negócio." */}
        <div className="pt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center border-t border-white/10">
          <div className="lg:col-span-6">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white font-['Syne'] leading-[1.15]">
              Uma suite de{' '}
              <span className="relative inline-block px-1">
                {/* Hand-drawn neon LeadsPay SVG loop */}
                <span className="relative z-10 text-[#D9F22A] drop-shadow-[0_0_15px_rgba(217,242,42,0.4)]">
                  soluções
                </span>
                <svg
                  viewBox="0 0 160 55"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="absolute -inset-x-2 -inset-y-1 w-[114%] h-[120%] pointer-events-none text-[#D9F22A] stroke-current"
                  style={{ strokeWidth: '2.5px', strokeLinecap: 'round' }}
                >
                  <path
                    d="M 15 28 C 15 12, 145 10, 148 26 C 150 42, 25 48, 12 32 C 8 26, 45 18, 90 20"
                    fill="none"
                  />
                </svg>
              </span>
              <br />
              para o seu negócio.
            </h2>
          </div>

          <div className="lg:col-span-6">
            <p className="text-white/70 text-sm sm:text-base leading-relaxed font-normal">
              Centralize as operações da sua empresa com uma suíte completa que une pagamentos, dados e automações. Nossa tecnologia foi desenvolvida para garantir eficiência, segurança e escalabilidade à medida que o seu negócio evolui.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

/* =========================================================================
   4. ISOMETRIC FEATURE CARDS (LeadsPay Harmonized Dark Style)
   Card 1: Proteção antifraude. (Isometric Shield with LeadsPay Neon Accents)
   Card 2: Check-out integrado. (Isometric Coin with LeadsPay Neon Accents)
   ========================================================================= */
export const IsometricFeatureCardsSection: React.FC = () => {
  return (
    <section className="relative w-full bg-[#060A15] text-white py-14 sm:py-18 border-b border-white/5">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Proteção antifraude */}
          <div className="rounded-3xl border border-white/10 bg-[#080d1a] overflow-hidden shadow-xl hover:border-[#D9F22A]/40 transition-all duration-300 flex flex-col group">
            {/* Top Graphic Area with Cyber Dot Pattern and Isometric Shield */}
            <div 
              className="relative h-64 sm:h-72 w-full flex items-center justify-center overflow-hidden bg-[#050811]"
              style={{
                backgroundImage: 'radial-gradient(rgba(217, 242, 42, 0.15) 1.25px, transparent 1.25px)',
                backgroundSize: '16px 16px'
              }}
            >
              <div className="relative w-48 h-48 flex items-center justify-center">
                {/* Base neon glow */}
                <div className="absolute bottom-6 w-36 h-14 bg-[#D9F22A]/15 rounded-full blur-xl group-hover:scale-110 transition-transform duration-500" />
                
                {/* 3D Isometric Shield */}
                <svg viewBox="0 0 200 160" className="w-44 h-44 drop-shadow-[0_10px_25px_rgba(217,242,42,0.25)]">
                  <defs>
                    <linearGradient id="shieldPlateGradDark" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#1e293b" />
                      <stop offset="100%" stopColor="#0f172a" />
                    </linearGradient>
                    <linearGradient id="shieldBorderGradNeon" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#D9F22A" />
                      <stop offset="100%" stopColor="#84cc16" />
                    </linearGradient>
                    <radialGradient id="shieldCenterGlowDark" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#D9F22A" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#080d1a" stopOpacity="0.8" />
                    </radialGradient>
                  </defs>
                  {/* Isometric base plate */}
                  <path
                    d="M 100 20 L 170 50 L 140 130 L 100 150 L 60 130 L 30 50 Z"
                    fill="url(#shieldPlateGradDark)"
                    stroke="#334155"
                    strokeWidth="3"
                  />
                  {/* Glowing inner shield */}
                  <path
                    d="M 100 30 L 155 56 L 132 120 L 100 136 L 68 120 L 45 56 Z"
                    fill="url(#shieldCenterGlowDark)"
                    stroke="url(#shieldBorderGradNeon)"
                    strokeWidth="3.5"
                  />
                  {/* Dual Sync Neon Arrows inside shield */}
                  <g transform="translate(75, 60)">
                    {/* Top arrow */}
                    <path
                      d="M 10 20 C 10 5, 40 5, 40 20"
                      fill="none"
                      stroke="#D9F22A"
                      strokeWidth="5"
                      strokeLinecap="round"
                    />
                    <polygon points="36,22 44,22 40,30" fill="#D9F22A" />
                    {/* Bottom arrow */}
                    <path
                      d="M 40 25 C 40 40, 10 40, 10 25"
                      fill="none"
                      stroke="#D9F22A"
                      strokeWidth="5"
                      strokeLinecap="round"
                    />
                    <polygon points="14,23 6,23 10,15" fill="#D9F22A" />
                  </g>
                </svg>
              </div>
            </div>

            {/* Bottom Content Area */}
            <div className="p-6 sm:p-8 bg-[#080d1a] border-t border-white/5 flex-grow">
              <h4 className="text-base sm:text-lg font-black text-white font-['Syne']">
                Proteção antifraude.
              </h4>
              <p className="mt-2 text-xs sm:text-sm text-white/70 leading-relaxed">
                Detecte e previna fraudes automaticamente, garantindo segurança para você e seus clientes e principalmente seu negócio.
              </p>
            </div>
          </div>

          {/* Card 2: Check-out integrado */}
          <div className="rounded-3xl border border-white/10 bg-[#080d1a] overflow-hidden shadow-xl hover:border-[#D9F22A]/40 transition-all duration-300 flex flex-col group">
            {/* Top Graphic Area with Dot Pattern and 3D Isometric Coin */}
            <div 
              className="relative h-64 sm:h-72 w-full flex items-center justify-center overflow-hidden bg-[#050811]"
              style={{
                backgroundImage: 'radial-gradient(rgba(217, 242, 42, 0.15) 1.25px, transparent 1.25px)',
                backgroundSize: '16px 16px'
              }}
            >
              <div className="relative w-48 h-48 flex items-center justify-center">
                {/* Base neon glow */}
                <div className="absolute bottom-6 w-36 h-14 bg-[#D9F22A]/15 rounded-full blur-xl group-hover:scale-110 transition-transform duration-500" />

                <svg viewBox="0 0 200 160" className="w-48 h-48 drop-shadow-[0_10px_25px_rgba(217,242,42,0.25)]">
                  <defs>
                    <linearGradient id="coinBevelDark" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#1e293b" />
                      <stop offset="100%" stopColor="#0f172a" />
                    </linearGradient>
                    <radialGradient id="coinNeonGlowDark" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#D9F22A" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#080d1a" stopOpacity="0.8" />
                    </radialGradient>
                  </defs>
                  {/* Outer Isometric Cylinder Base */}
                  <ellipse cx="100" cy="95" rx="72" ry="34" fill="#0f172a" stroke="#334155" strokeWidth="2" />
                  <path d="M 28 85 L 28 95 C 28 114, 172 114, 172 95 L 172 85 Z" fill="url(#coinBevelDark)" />
                  <ellipse cx="100" cy="85" rx="72" ry="34" fill="#1e293b" stroke="#475569" strokeWidth="2" />
                  
                  {/* Glowing LeadsPay Neon Inner Pad */}
                  <ellipse cx="100" cy="85" rx="55" ry="25" fill="url(#coinNeonGlowDark)" stroke="#D9F22A" strokeWidth="2.5" />

                  {/* Isometric Currency Symbol */}
                  <g transform="translate(100, 85) skewX(-10) scale(1, 0.65)">
                    <text
                      x="0"
                      y="14"
                      textAnchor="middle"
                      fill="#D9F22A"
                      fontSize="44"
                      fontWeight="900"
                      fontFamily="sans-serif"
                    >
                      $
                    </text>
                  </g>
                </svg>
              </div>
            </div>

            {/* Bottom Content Area */}
            <div className="p-6 sm:p-8 bg-[#080d1a] border-t border-white/5 flex-grow">
              <h4 className="text-base sm:text-lg font-black text-white font-['Syne']">
                Check-out integrado.
              </h4>
              <p className="mt-2 text-xs sm:text-sm text-white/70 leading-relaxed">
                Ofereça um processo de pagamento rápido e intuitivo, totalmente integrado à sua plataforma ou site totalmente customizável.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

/* =========================================================================
   5. FEE CALCULATOR SECTION (LeadsPay Harmonized Dark Style)
   "Simule e veja quanto você recebe de verdade."
   "R$ 0,80 por Pix, sem mensalidade, e R$ 2,50 por boleto pago. Compare os valores na calculadora completa."
   ========================================================================= */
export const FeeCalculatorSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'pix' | 'boleto'>('pix');
  const [saleAmount, setSaleAmount] = useState<number>(600);
  const [isFullCalcOpen, setIsFullCalcOpen] = useState<boolean>(false);

  // Fee calculation
  const fee = activeTab === 'pix' ? 0.80 : 2.50;
  const netAmount = Math.max(0, saleAmount - fee);
  const effectiveRate = saleAmount > 0 ? ((fee / saleAmount) * 100).toFixed(2) : '0.00';

  const formatBRL = (val: number) => {
    return val.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  return (
    <section className="relative w-full bg-[#060A15] text-white py-20 sm:py-24 md:py-28 overflow-hidden border-b border-white/5">
      {/* Ambient Neon Lighting */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#D9F22A]/[0.05] rounded-full blur-[180px] pointer-events-none -z-10" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Title */}
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white font-['Syne'] leading-tight">
            Simule e veja quanto você{' '}
            <span className="text-[#D9F22A] drop-shadow-[0_0_25px_rgba(217,242,42,0.4)]">
              recebe de verdade.
            </span>
          </h2>

          <p className="mt-4 text-sm sm:text-base text-white/75 leading-relaxed">
            R$ 0,80 por Pix, sem mensalidade, e R$ 2,50 por boleto pago.
            <br />
            Compare os valores na calculadora completa.
          </p>

          {/* Action Buttons */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => setIsFullCalcOpen(true)}
              className="cursor-pointer inline-flex items-center gap-2 px-7 py-3 rounded-2xl bg-[#D9F22A] hover:bg-[#cbe31c] text-[#060A15] font-black text-xs sm:text-sm uppercase tracking-wider shadow-[0_0_20px_rgba(217,242,42,0.3)] hover:scale-105 transition-all duration-300"
            >
              <span>Abrir calculadora completa</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <a
              href="https://wa.me/5511999999999?text=Ol%C3%A1%2C%20gostaria%20de%20consultar%20taxas%20personalizadas%20na%20LeadsPay"
              target="_blank"
              rel="noopener noreferrer"
              className="cursor-pointer inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#080d1a] hover:bg-white/10 border border-white/15 text-white font-bold text-xs sm:text-sm transition-all"
            >
              <MessageCircle className="w-4 h-4 text-[#D9F22A]" />
              <span>Taxas personalizadas</span>
            </a>
          </div>
        </div>

        {/* Central Calculator Card */}
        <div className="max-w-xl mx-auto rounded-3xl bg-[#080d1a] border border-[#D9F22A]/30 p-6 sm:p-8 shadow-[0_0_50px_rgba(0,0,0,0.6)] backdrop-blur-md">
          {/* Tabs: Pix / Boleto */}
          <div className="grid grid-cols-2 p-1 rounded-2xl bg-[#050811] mb-6 border border-white/10">
            <button
              onClick={() => setActiveTab('pix')}
              className={`cursor-pointer py-2.5 text-xs sm:text-sm font-black uppercase tracking-wider rounded-xl transition-all ${
                activeTab === 'pix'
                  ? 'bg-[#D9F22A] text-[#060A15] shadow-[0_0_15px_rgba(217,242,42,0.3)]'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Pix
            </button>
            <button
              onClick={() => setActiveTab('boleto')}
              className={`cursor-pointer py-2.5 text-xs sm:text-sm font-black uppercase tracking-wider rounded-xl transition-all ${
                activeTab === 'boleto'
                  ? 'bg-[#D9F22A] text-[#060A15] shadow-[0_0_15px_rgba(217,242,42,0.3)]'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Boleto
            </button>
          </div>

          {/* Amount Input Box */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#050811] border border-white/10 mb-5">
            <div className="text-xs font-bold uppercase tracking-wider text-[#D9F22A] mb-1">
              Quanto você vende?
            </div>
            <div className="flex items-center justify-between">
              <span className="text-2xl sm:text-3xl font-black text-white font-['Syne']">
                R${' '}
              </span>
              <input
                type="number"
                min="1"
                step="10"
                value={saleAmount}
                onChange={(e) => setSaleAmount(Math.max(1, parseFloat(e.target.value) || 0))}
                className="w-full text-2xl sm:text-3xl font-black text-white bg-transparent border-none outline-none text-left pl-2 focus:ring-0 font-['Syne']"
              />
            </div>

            {/* Quick Amount Suggestion Buttons */}
            <div className="mt-3 flex items-center gap-2 pt-2 border-t border-white/10">
              <span className="text-[10px] text-white/50 font-medium">Exemplos:</span>
              {[100, 300, 600, 1500].map((v) => (
                <button
                  key={v}
                  onClick={() => setSaleAmount(v)}
                  className={`cursor-pointer text-[10px] px-2.5 py-1 rounded-lg border font-bold transition-all ${
                    saleAmount === v 
                      ? 'bg-[#D9F22A]/20 border-[#D9F22A] text-[#D9F22A]' 
                      : 'border-white/10 text-white/70 hover:bg-white/5'
                  }`}
                >
                  R$ {v}
                </button>
              ))}
            </div>
          </div>

          {/* Net Payout Box */}
          <div className="p-5 sm:p-6 rounded-2xl bg-[#050811] border border-white/10">
            <div className="text-xs sm:text-sm font-bold text-white mb-0.5">
              {activeTab === 'pix' ? 'Você recebe no Pix' : 'Você recebe no Boleto'}
            </div>
            <div className="text-[11px] text-white/60 mb-4">
              {activeTab === 'pix'
                ? 'Taxa fixa de R$ 0,80 por transação · Disponível em poucos segundos'
                : 'Taxa de R$ 2,50 por boleto pago · Sem custo por emissão'}
            </div>

            {/* Highlighted Net Value */}
            <div className="text-3xl sm:text-4xl md:text-5xl font-black text-[#D9F22A] mb-4 font-['Syne'] drop-shadow-[0_0_20px_rgba(217,242,42,0.4)]">
              {formatBRL(netAmount)}
            </div>

            {/* Fee Breakdown Rows */}
            <div className="space-y-1.5 pt-3 border-t border-white/10 text-xs">
              <div className="flex justify-between items-center text-white/80">
                <span>Taxa</span>
                <span className="font-bold text-white">
                  - {formatBRL(fee)}
                </span>
              </div>
              <div className="flex justify-between items-center text-white/50 text-[11px]">
                <span>Taxa efetiva</span>
                <span className="text-[#D9F22A] font-bold">{effectiveRate}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Full Comparison Calculator */}
      {isFullCalcOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#080d1a] border border-[#D9F22A]/30 rounded-3xl max-w-lg w-full p-6 sm:p-7 text-white shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2.5 font-bold text-lg text-[#D9F22A] font-['Syne']">
                <Calculator className="w-5 h-5" />
                Comparativo Completo de Taxas
              </div>
              <button 
                onClick={() => setIsFullCalcOpen(false)}
                className="text-white/60 hover:text-white font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="py-4 space-y-4 text-xs sm:text-sm">
              <p className="text-white/80">
                Veja o comparativo para uma venda simulada de <strong className="text-white font-bold">{formatBRL(saleAmount)}</strong>:
              </p>

              <div className="space-y-2.5">
                <div className="p-4 rounded-2xl bg-[#050811] border border-[#D9F22A]/40 flex justify-between items-center">
                  <div>
                    <div className="font-black text-white text-sm">LeadsPay (Pix D+9 / Imediato)</div>
                    <div className="text-[11px] text-[#D9F22A]">R$ 0,80 fixo por transação</div>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-[#D9F22A] text-base font-['Syne']">{formatBRL(saleAmount - 0.80)}</div>
                    <div className="text-[10px] text-[#D9F22A]">Maior lucro líquido</div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-[#050811] border border-white/10 flex justify-between items-center opacity-60">
                  <div>
                    <div className="font-bold text-white/80">Outros Gateways Tradicionais</div>
                    <div className="text-[11px] text-white/50">4,99% + R$ 0,50 por transação</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-white/80 text-base">{formatBRL(saleAmount - (saleAmount * 0.0499 + 0.50))}</div>
                    <div className="text-[10px] text-red-400">- {formatBRL(saleAmount * 0.0499 + 0.50)} em taxas</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-white/10 flex justify-end">
              <button
                onClick={() => setIsFullCalcOpen(false)}
                className="px-6 py-2.5 rounded-xl bg-[#D9F22A] hover:bg-[#cbe31c] text-[#060A15] text-xs font-black uppercase tracking-wider cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

/* =========================================================================
   6. FAQ SECTION (LeadsPay Harmonized Dark Style)
   "Tem dúvidas? Relaxa, nós temos as respostas."
   "Selecionamos algumas dúvidas que recebemos com frequência sobre nossos serviços, elas podem ser úteis para você!"
   Right side accordion list with LeadsPay neon '+' toggle
   ========================================================================= */
export const FaqSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqItems = [
    {
      question: 'O que é a LeadsPay e para quem ela serve?',
      answer: 'A LeadsPay é a plataforma marketplace de startups e infraestrutura de pagamentos feita para SaaS, criadores de software, produtos digitais e agentes de IA. Conectamos soluções inovadoras a uma rede ativa de afiliados B2B com comissões automáticas no PIX D+9.'
    },
    {
      question: 'Quais formas de pagamento aparecem nesta página?',
      answer: 'Processamos pagamentos via PIX instantâneo com confirmação em tempo real e QR Code dinâmico, cartões de crédito em até 12x com proteção antifraude ativa, e boleto bancário sem taxa de emissão.'
    },
    {
      question: 'Posso usar com pessoa física ou é necessário CNPJ?',
      answer: 'Você pode começar a vender tanto com CPF (Pessoa Física) quanto com CNPJ (MEI, ME ou LTDA). Ambas as modalidades contam com painel financeiro completo, checkout customizável e saques bancários rápidos.'
    },
    {
      question: 'A LeadsPay pode ser integrada apps feitos em lovable?',
      answer: 'Sim! A LeadsPay foi desenhada especialmente para quem programa com IA (Lovable, Cursor, Windsurf, v0). Basta utilizar nosso arquivo de contexto em leadspay.com/llms.txt ou nossa API REST/MCP.'
    },
    {
      question: 'É possível fazer split de pagamento entre diferentes recebedores?',
      answer: 'Sim! O split de pagamentos é nativo e automático. Você define os percentuais de cada sócio, parceiro ou afiliado, e o repasse é calculado e distribuído instantaneamente sem trabalho manual de conciliação.'
    },
    {
      question: 'Quanto tempo demora para a minha conta ser verificada?',
      answer: 'No modo Sandbox (ambiente de testes), a liberação é imediata. Para o modo Produção e saques bancários reais, a análise dos dados cadastrais (KYC) leva de alguns minutos até 7 dias úteis.'
    }
  ];

  const toggleIndex = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section className="relative w-full bg-[#060A15] text-white py-20 sm:py-24 md:py-28 border-b border-white/5">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
          {/* Left Column: Heading & Subtitle */}
          <div className="lg:col-span-5">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white font-['Syne'] leading-[1.15]">
              Tem dúvidas? Relaxa, nós temos as{' '}
              <span className="text-[#D9F22A] drop-shadow-[0_0_20px_rgba(217,242,42,0.3)]">
                respostas.
              </span>
            </h2>
            <p className="mt-4 text-sm sm:text-base text-white/70 leading-relaxed max-w-md">
              Selecionamos algumas dúvidas que recebemos com frequência sobre nossos serviços, elas podem ser úteis para você!
            </p>
          </div>

          {/* Right Column: Accordion List with LeadsPay Neon Accents */}
          <div className="lg:col-span-7 divide-y divide-white/10 border-y border-white/10">
            {faqItems.map((item, idx) => {
              const isOpen = openIndex === idx;
              return (
                <div key={idx} className="py-4 sm:py-5">
                  <button
                    onClick={() => toggleIndex(idx)}
                    className="w-full flex items-center justify-between text-left gap-4 group cursor-pointer focus:outline-none"
                  >
                    <div className="flex items-center gap-3.5">
                      <span className="w-6 h-6 rounded-lg bg-[#080d1a] border border-[#D9F22A]/30 flex items-center justify-center text-[#D9F22A] font-bold text-base flex-shrink-0 group-hover:border-[#D9F22A] transition-colors">
                        {isOpen ? '−' : '+'}
                      </span>
                      <span className="text-sm sm:text-base font-bold text-white group-hover:text-[#D9F22A] transition-colors font-['Syne']">
                        {item.question}
                      </span>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="mt-3 pl-9 pr-4 text-xs sm:text-sm text-white/75 leading-relaxed animate-fadeIn">
                      {item.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
