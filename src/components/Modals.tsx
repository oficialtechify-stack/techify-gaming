import React, { useState } from 'react';
import { ActiveModal } from '../types';
import { Building2, UserCheck, ShieldCheck, Lock, Sparkles, CheckCircle } from 'lucide-react';

interface ModalsProps {
  activeModal: ActiveModal;
  onClose: () => void;
  onLoginSuccess?: () => void;
}

export const Modals: React.FC<ModalsProps> = ({ activeModal, onClose, onLoginSuccess }) => {
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [candidateName, setCandidateName] = useState('');
  const [candidateEmail, setCandidateEmail] = useState('');
  const [candidateRole, setCandidateRole] = useState('Afiliado de Alta Performance');

  // Login form state
  const [loginRole, setLoginRole] = useState<'afiliado' | 'empresa'>('afiliado');
  const [loginEmail, setLoginEmail] = useState('afiliado@techify.com');
  const [loginPassword, setLoginPassword] = useState('••••••••••••');
  const [loginSuccess, setLoginSuccess] = useState(false);

  if (!activeModal) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitted(true);
    setTimeout(() => {
      setFormSubmitted(false);
      onClose();
    }, 2500);
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginSuccess(true);
    setTimeout(() => {
      setLoginSuccess(false);
      onClose();
      if (onLoginSuccess) {
        onLoginSuccess();
      }
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#080d1a] border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto no-scrollbar">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white flex items-center justify-center transition-colors focus:outline-none cursor-pointer"
          aria-label="Fechar modal"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        {/* 1. CAREERS / TRABALHE CONOSCO & SEJA PARCEIRO */}
        {activeModal === 'careers' && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#D9F22A]">
              <span className="w-2 h-2 rounded-full bg-[#D9F22A]" />
              Ecossistema Techify
            </div>

            <h3 className="text-2xl sm:text-3xl font-extrabold text-white font-['Syne']">
              Seja Parceiro ou Faça Parte do Time
            </h3>

            <p className="text-sm text-white/80 leading-relaxed">
              Estamos transformando a distribuição comercial de startups na América Latina. Cadastre-se como afiliado profissional ou candidate-se ao time de produto e tecnologia.
            </p>

            {formSubmitted ? (
              <div className="p-6 rounded-xl bg-[#D9F22A]/10 border border-[#D9F22A]/30 text-center flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#D9F22A] text-[#060A15] flex items-center justify-center">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <h4 className="text-lg font-bold text-white">Solicitação enviada com sucesso!</h4>
                <p className="text-xs text-white/70">Nossa equipe de parcerias entrará em contato em menos de 24h.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-1.5">
                    Nome Completo / Razão Social
                  </label>
                  <input
                    type="text"
                    required
                    value={candidateName}
                    onChange={(e) => setCandidateName(e.target.value)}
                    placeholder="Seu nome ou empresa"
                    className="w-full bg-[#050811] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#D9F22A] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-1.5">
                    E-mail Corporativo ou Pessoal
                  </label>
                  <input
                    type="email"
                    required
                    value={candidateEmail}
                    onChange={(e) => setCandidateEmail(e.target.value)}
                    placeholder="seu.email@exemplo.com"
                    className="w-full bg-[#050811] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#D9F22A] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-1.5">
                    Perfil
                  </label>
                  <select
                    value={candidateRole}
                    onChange={(e) => setCandidateRole(e.target.value)}
                    className="w-full bg-[#050811] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#D9F22A] transition-colors"
                  >
                    <option value="Afiliado de Alta Performance">Afiliado / Vendedor de Performance</option>
                    <option value="Startup Fundador">Fundador de Startup (Quero cadastrar minha empresa)</option>
                    <option value="Tech & Engineering">Engenharia de Software / Produto</option>
                    <option value="Growth & Marketing">Growth Marketing & Tráfego Pago</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="mt-2 w-full bg-[#D9F22A] hover:bg-[#cbe31c] text-[#060A15] font-bold py-3 px-6 rounded-full transition-all duration-300 shadow-[0_0_20px_rgba(217,242,42,0.3)] cursor-pointer text-sm uppercase tracking-wider"
                >
                  Enviar Cadastro
                </button>
              </form>
            )}
          </div>
        )}

        {/* 2. ABOUT / QUEM SOMOS */}
        {activeModal === 'about' && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#D9F22A]">
              <span className="w-2 h-2 rounded-full bg-[#D9F22A]" />
              Marketplace de Startups B2B
            </div>

            <h3 className="text-2xl sm:text-3xl font-extrabold text-white font-['Syne']">
              Sobre a Techify
            </h3>

            <div className="space-y-4 text-sm text-white/80 leading-relaxed">
              <p>
                A <strong>Techify</strong> é o ecossistema e infraestrutura que acelera a aquisição de clientes para startups de tecnologia através de uma rede ativa de milhares de afiliados especializados.
              </p>
              <p>
                Garantimos que fundadores e empresas publiquem seus produtos com controle total das comissões, enquanto afiliados recebem comissões transparentes com liquidação automática em tempo real via <strong>PIX D+0</strong>.
              </p>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                  <div className="text-lg font-bold text-[#D9F22A]">+140</div>
                  <div className="text-xs text-white/60 uppercase">Startups Ativas</div>
                </div>
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                  <div className="text-lg font-bold text-[#D9F22A]">R$ 48M+</div>
                  <div className="text-xs text-white/60 uppercase">Em Comissões Repassadas</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3. CULTURE / NOSSA CULTURA */}
        {activeModal === 'culture' && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#D9F22A]">
              <span className="w-2 h-2 rounded-full bg-[#D9F22A]" />
              Valores e Infraestrutura
            </div>

            <h3 className="text-2xl sm:text-3xl font-extrabold text-white font-['Syne']">
              Cultura Techify
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-[#050811] border border-white/10 flex flex-col gap-2">
                <span className="text-[#D9F22A] font-bold text-sm font-['Syne']">01. Split em Tempo Real</span>
                <p className="text-xs text-white/70">O valor da venda é dividido no ato da transação, sem atrasos ou retenções indevidas.</p>
              </div>
              <div className="p-4 rounded-xl bg-[#050811] border border-white/10 flex flex-col gap-2">
                <span className="text-[#D9F22A] font-bold text-sm font-['Syne']">02. Meritocracia & Performance</span>
                <p className="text-xs text-white/70">Afiliados que geram resultados têm comissões progressivas e acesso a ofertas exclusivas.</p>
              </div>
              <div className="p-4 rounded-xl bg-[#050811] border border-white/10 flex flex-col gap-2">
                <span className="text-[#D9F22A] font-bold text-sm font-['Syne']">03. Transparência Algorítmica</span>
                <p className="text-xs text-white/70">Atribuição exata de cada clique, lead e conversão sem arbitrariedades.</p>
              </div>
              <div className="p-4 rounded-xl bg-[#050811] border border-white/10 flex flex-col gap-2">
                <span className="text-[#D9F22A] font-bold text-sm font-['Syne']">04. Foco em Tração</span>
                <p className="text-xs text-white/70">Ajudamos startups a atingirem escala global sem precisarem queimar capital antecipado.</p>
              </div>
            </div>
          </div>
        )}

        {/* 4. ETHICS / CANAL DE ÉTICA */}
        {activeModal === 'report' && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#D9F22A]">
              <span className="w-2 h-2 rounded-full bg-[#D9F22A]" />
              Governança & Canal de Ética
            </div>

            <h3 className="text-2xl sm:text-3xl font-extrabold text-white font-['Syne']">
              Canal de Conduta & Denúncias
            </h3>

            <p className="text-sm text-white/80 leading-relaxed">
              Nosso canal de conformidade é uma ferramenta independente e confidencial para relatar qualquer inconformidade nos pagamentos, fraudes de tráfego ou violação dos termos de afiliação.
            </p>

            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 flex flex-col gap-3 text-xs text-white/70">
              <div className="flex items-center gap-2 text-white font-semibold">
                <ShieldCheck className="w-4 h-4 text-[#D9F22A]" />
                <span>Garantia de Anonimato & Proteção ao Denunciante</span>
              </div>
              <p>Relatos analisados por comitê de compliance independente com retorno em até 48 horas.</p>
            </div>

            <button
              onClick={() => {
                alert('Mensagem enviada ao comitê de governança e compliance.');
                onClose();
              }}
              className="w-full text-center bg-[#0c1222] border border-[#D9F22A] text-white hover:bg-[#D9F22A] hover:text-[#060A15] font-bold py-3 px-6 rounded-full transition-all duration-300 text-sm uppercase tracking-wider block cursor-pointer"
            >
              Registrar Comunicação Confidencial
            </button>
          </div>
        )}

        {/* 5. RESPONSIBLE / SECURITY MODAL */}
        {activeModal === 'responsible' && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#D9F22A]">
              <span className="w-2 h-2 rounded-full bg-[#D9F22A]" />
              Segurança & Split Bancário
            </div>

            <h3 className="text-2xl sm:text-3xl font-extrabold text-white font-['Syne']">
              Diretrizes de Liquidação Financeira
            </h3>

            <div className="space-y-3 text-sm text-white/80">
              <p>
                Operamos com gateways de pagamento de alta resiliência e integração via API bancária para que as comissões cheguem diretamente à conta dos afiliados.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3.5 rounded-xl bg-[#050811] border border-white/5">
                  <div className="font-bold text-white text-xs mb-1">Repasse Instantâneo (PIX)</div>
                  <div className="text-xs text-white/60">Transferência imediata assim que a conversão é aprovada pela adquirente.</div>
                </div>
                <div className="p-3.5 rounded-xl bg-[#050811] border border-white/5">
                  <div className="font-bold text-white text-xs mb-1">Proteção Antifraude</div>
                  <div className="text-xs text-white/60">Filtros de tráfego robótico e auditoria de cookie tracking.</div>
                </div>
                <div className="p-3.5 rounded-xl bg-[#050811] border border-white/5">
                  <div className="font-bold text-white text-xs mb-1">Painel em Tempo Real</div>
                  <div className="text-xs text-white/60">Extratos auditáveis e conciliação financeira automática.</div>
                </div>
                <div className="p-3.5 rounded-xl bg-[#050811] border border-white/5">
                  <div className="font-bold text-white text-xs mb-1">LGPD & Criptografia</div>
                  <div className="text-xs text-white/60">Dados de clientes e afiliados protegidos de ponta a ponta.</div>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full text-center bg-[#D9F22A] text-[#060A15] font-bold py-3 px-6 rounded-full transition-all duration-300 text-sm uppercase tracking-wider block hover:bg-[#cbe31c] cursor-pointer"
            >
              Entendido
            </button>
          </div>
        )}

        {/* 6. LOGIN / PORTAL DE ACESSO */}
        {activeModal === 'login' && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#D9F22A]">
              <span className="w-2 h-2 rounded-full bg-[#D9F22A]" />
              Ambiente de Acesso
            </div>

            <h3 className="text-2xl sm:text-3xl font-extrabold text-white font-['Syne']">
              Entrar na Plataforma Techify
            </h3>

            <p className="text-sm text-white/80 leading-relaxed">
              Selecione o seu perfil para acessar a vitrine de startups ou o painel corporativo.
            </p>

            {loginSuccess ? (
              <div className="p-6 rounded-xl bg-[#D9F22A]/10 border border-[#D9F22A]/30 text-center flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#D9F22A] text-[#060A15] flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-[#060A15]" />
                </div>
                <h4 className="text-lg font-bold text-white">Login autenticado com sucesso!</h4>
                <p className="text-xs text-white/70">Redirecionando para a plataforma...</p>
              </div>
            ) : (
              <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4">
                {/* Role Selector */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-2">
                    Tipo de Conta
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setLoginRole('afiliado');
                        setLoginEmail('afiliado.rodrigo@techify.com');
                      }}
                      className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs font-bold transition-all cursor-pointer ${
                        loginRole === 'afiliado'
                          ? 'bg-[#D9F22A]/10 border-[#D9F22A] text-[#D9F22A]'
                          : 'bg-[#050811] border-white/10 text-white/60 hover:text-white'
                      }`}
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>Afiliado (Vender)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setLoginRole('empresa');
                        setLoginEmail('empresa.fundador@techify.com');
                      }}
                      className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs font-bold transition-all cursor-pointer ${
                        loginRole === 'empresa'
                          ? 'bg-[#D9F22A]/10 border-[#D9F22A] text-[#D9F22A]'
                          : 'bg-[#050811] border-white/10 text-white/60 hover:text-white'
                      }`}
                    >
                      <Building2 className="w-4 h-4" />
                      <span>Empresa (Postar)</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-1.5">
                    E-mail de Acesso
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="seu.email@exemplo.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full bg-[#050811] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#D9F22A] transition-colors"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-white/70">
                      Senha
                    </label>
                    <a href="#esqueci-senha" onClick={(e) => e.preventDefault()} className="text-xs text-[#D9F22A] hover:underline">
                      Esqueceu a senha?
                    </a>
                  </div>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full bg-[#050811] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#D9F22A] transition-colors"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input type="checkbox" id="remember" defaultChecked className="rounded border-white/20 bg-[#050811] text-[#D9F22A] focus:ring-0 cursor-pointer" />
                  <label htmlFor="remember" className="text-xs text-white/70 cursor-pointer">
                    Lembrar credenciais neste dispositivo
                  </label>
                </div>

                <button
                  type="submit"
                  className="mt-2 w-full bg-[#D9F22A] text-[#060A15] font-bold py-3.5 px-6 rounded-full transition-all duration-300 text-sm uppercase tracking-wider hover:bg-[#cbe31c] cursor-pointer flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(217,242,42,0.3)]"
                >
                  <span>Entrar como {loginRole === 'afiliado' ? 'Afiliado' : 'Empresa'}</span>
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

