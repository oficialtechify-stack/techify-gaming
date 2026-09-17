import React, { useEffect, useState } from 'react';
import { 
  CheckCircle2, 
  ArrowRight, 
  Download, 
  MessageSquare, 
  Globe, 
  Users, 
  Key, 
  Copy, 
  Check, 
  ExternalLink,
  Mail,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { CompanyPlan, ProductDeliveryType } from '../../types/platform';
import { getCompanyPlanByIdOrSlug } from '../../services/firestoreService';

interface ThankYouPageProps {
  planId?: string;
  transactionId?: string;
  amount?: number;
  customerName?: string;
  customerEmail?: string;
  plan?: CompanyPlan | null;
  onBackToHome?: () => void;
}

export const ThankYouPage: React.FC<ThankYouPageProps> = ({
  planId: initialPlanId,
  transactionId: initialTxId,
  amount: initialAmount,
  customerName: initialName,
  customerEmail: initialEmail,
  plan: initialPlan,
  onBackToHome
}) => {
  const [plan, setPlan] = useState<CompanyPlan | null>(initialPlan || null);
  const [loading, setLoading] = useState<boolean>(!initialPlan);
  const [copiedKey, setCopiedKey] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(5);

  // Extract from URL params if props not supplied
  const [txId, setTxId] = useState<string>(initialTxId || '');
  const [amount, setAmount] = useState<number>(initialAmount || 0);
  const [customerName, setCustomerName] = useState<string>(initialName || '');
  const [customerEmail, setCustomerEmail] = useState<string>(initialEmail || '');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlPlanId = initialPlanId || params.get('plan') || params.get('planId') || params.get('checkout') || '';
      const urlTx = initialTxId || params.get('txId') || params.get('transactionId') || params.get('id') || `LP-${Date.now().toString().slice(-6)}`;
      const urlAmount = initialAmount || parseFloat(params.get('amount') || params.get('value') || '0');
      const urlName = initialName || params.get('name') || params.get('customerName') || 'Cliente';
      const urlEmail = initialEmail || params.get('email') || params.get('customerEmail') || '';

      setTxId(urlTx);
      if (urlAmount) setAmount(urlAmount);
      if (urlName) setCustomerName(urlName);
      if (urlEmail) setCustomerEmail(urlEmail);

      if (!initialPlan && urlPlanId) {
        setLoading(true);
        getCompanyPlanByIdOrSlug(urlPlanId)
          .then((p) => {
            if (p) setPlan(p);
          })
          .catch((err) => console.warn('Erro ao carregar plano na Thank You page:', err))
          .finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    }
  }, [initialPlanId, initialTxId, initialAmount, initialName, initialEmail, initialPlan]);

  const deliveryType: ProductDeliveryType = plan?.deliveryType || 'redirect';
  const deliveryUrl = plan?.deliveryUrl || plan?.thankYouPageUrl || '';
  const deliveryInstructions = plan?.deliveryInstructions;

  // Auto-redirect countdown if redirect type with URL
  useEffect(() => {
    if (deliveryType === 'redirect' && deliveryUrl && countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    } else if (deliveryType === 'redirect' && deliveryUrl && countdown === 0) {
      window.location.href = deliveryUrl;
    }
  }, [deliveryType, deliveryUrl, countdown]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 3000);
  };

  const generatedApiKey = `leadspay_live_${txId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12)}_${Date.now().toString(36)}`;

  return (
    <div className="min-h-screen bg-[#070b14] text-white flex flex-col items-center justify-center p-4 sm:p-6 font-sans relative overflow-hidden">
      {/* Glow effect */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-[#84CC16]/10 blur-[120px] pointer-events-none rounded-full" />

      <div className="w-full max-w-xl bg-[#0b1322] border border-white/10 rounded-3xl p-6 sm:p-10 shadow-2xl relative z-10 animate-in fade-in zoom-in-95 duration-300">
        
        {/* Top Success Badge */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-[#84CC16]/15 border border-[#84CC16]/30 flex items-center justify-center text-[#84CC16] mb-4 shadow-[0_0_30px_rgba(132,204,22,0.25)]">
            <CheckCircle2 className="w-9 h-9 stroke-[2.5]" />
          </div>

          <span className="px-3.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-[#84CC16]/10 text-[#84CC16] border border-[#84CC16]/30 mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> Pagamento Aprovado com Sucesso
          </span>

          <h1 className="text-2xl sm:text-3xl font-black text-white font-['Syne'] tracking-tight">
            Parabéns pela sua compra!
          </h1>

          <p className="text-xs sm:text-sm text-white/60 mt-1 max-w-md leading-relaxed">
            {customerName ? `Olá, ${customerName}! ` : ''}Seu acesso ao produto{' '}
            <strong className="text-white">{plan?.name || 'Digital'}</strong> foi liberado e confirmado.
          </p>
        </div>

        {/* Order Details Mini-Card */}
        <div className="p-4 rounded-2xl bg-[#050811] border border-white/10 space-y-2 mb-6 text-xs">
          <div className="flex justify-between items-center text-white/60">
            <span>Transação LeadsPay:</span>
            <span className="font-mono font-bold text-white/90">{txId}</span>
          </div>
          {amount > 0 && (
            <div className="flex justify-between items-center text-white/60">
              <span>Valor Total:</span>
              <span className="font-bold text-[#84CC16] text-sm">
                R$ {amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}
          {customerEmail && (
            <div className="flex justify-between items-center text-white/60 pt-1 border-t border-white/5">
              <span>E-mail do Comprador:</span>
              <span className="font-medium text-white/90 truncate max-w-[220px]">{customerEmail}</span>
            </div>
          )}
        </div>

        {/* DYNAMIC DELIVERY CARD BASED ON DELIVERY METHOD */}
        <div className="space-y-4 mb-6">
          
          {/* Method 1: Direct Redirect */}
          {deliveryType === 'redirect' && (
            <div className="p-5 rounded-2xl bg-gradient-to-br from-[#84CC16]/10 to-transparent border border-[#84CC16]/30 space-y-3 text-center">
              <div className="w-10 h-10 rounded-xl bg-[#84CC16]/20 border border-[#84CC16]/40 flex items-center justify-center text-[#84CC16] mx-auto">
                <Globe className="w-5 h-5" />
              </div>
              <h3 className="text-base font-black text-white font-['Syne']">
                Redirecionamento para o Conteúdo
              </h3>
              <p className="text-xs text-white/70 leading-relaxed">
                Você será redirecionado para a página do seu produto em{' '}
                <strong className="text-[#84CC16] font-mono text-sm">{countdown}s</strong>.
              </p>
              {deliveryUrl ? (
                <a
                  href={deliveryUrl}
                  className="w-full inline-flex items-center justify-center gap-2 bg-[#84CC16] hover:bg-[#74b816] text-black font-black py-3 px-6 rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-[#84CC16]/20"
                >
                  Acessar Conteúdo Agora <ArrowRight className="w-4 h-4" />
                </a>
              ) : (
                <p className="text-xs text-white/40 italic">Link de destino sendo processado...</p>
              )}
            </div>
          )}

          {/* Method 2: VIP WhatsApp Group / Support */}
          {deliveryType === 'whatsapp' && (
            <div className="p-5 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 space-y-3 text-center">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mx-auto">
                <MessageSquare className="w-5 h-5" />
              </div>
              <h3 className="text-base font-black text-white font-['Syne']">
                Grupo VIP & Suporte no WhatsApp
              </h3>
              <p className="text-xs text-white/70 leading-relaxed">
                Clique no botão abaixo para entrar imediatamente no grupo exclusivo ou falar com o suporte via WhatsApp.
              </p>
              <a
                href={deliveryUrl || 'https://chat.whatsapp.com'}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black font-black py-3.5 px-6 rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-500/20"
              >
                <MessageSquare className="w-4 h-4" /> Entrar no WhatsApp VIP
              </a>
            </div>
          )}

          {/* Method 3: Membership Platform */}
          {deliveryType === 'membership' && (
            <div className="p-5 rounded-2xl bg-[#050811] border border-white/15 space-y-3 text-center">
              <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white mx-auto">
                <Users className="w-5 h-5 text-[#84CC16]" />
              </div>
              <h3 className="text-base font-black text-white font-['Syne']">
                Área de Membros / Plataforma
              </h3>
              <p className="text-xs text-white/70 leading-relaxed">
                Seu acesso foi liberado! Acesse a plataforma utilizando o seu e-mail cadastrado:{' '}
                <strong className="text-white">{customerEmail || 'o mesmo da compra'}</strong>.
              </p>
              {deliveryUrl && (
                <a
                  href={deliveryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 bg-[#84CC16] hover:bg-[#74b816] text-black font-black py-3 px-6 rounded-xl text-xs uppercase tracking-wider transition-all"
                >
                  Fazer Login na Plataforma <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          )}

          {/* Method 4: Download File / Guide */}
          {deliveryType === 'download' && (
            <div className="p-5 rounded-2xl bg-cyan-950/30 border border-cyan-500/40 space-y-3 text-center">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 mx-auto">
                <Download className="w-5 h-5" />
              </div>
              <h3 className="text-base font-black text-white font-['Syne']">
                Arquivo Digital Disponível
              </h3>
              <p className="text-xs text-white/70 leading-relaxed">
                Seu material digital (PDF, Drive ou Notion) está pronto para download imediato.
              </p>
              <a
                href={deliveryUrl || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-black font-black py-3.5 px-6 rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-cyan-500/20"
              >
                <Download className="w-4 h-4" /> Baixar Arquivo / Acessar Guia
              </a>
            </div>
          )}

          {/* Method 5: API Key Generation */}
          {deliveryType === 'api_key' && (
            <div className="p-5 rounded-2xl bg-[#050811] border border-amber-500/30 space-y-3">
              <div className="flex items-center gap-2 text-amber-400">
                <Key className="w-4 h-4" />
                <h3 className="text-sm font-black font-['Syne']">Sua Chave de API / Token de Acesso</h3>
              </div>
              <p className="text-xs text-white/60">
                Utilize esta chave nos cabeçalhos das suas requisições como <code className="text-amber-300">Authorization: Bearer</code>.
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={generatedApiKey}
                  className="flex-1 bg-[#080d1a] border border-white/15 rounded-xl px-3 py-2 text-xs font-mono text-amber-300"
                />
                <button
                  type="button"
                  onClick={() => handleCopy(generatedApiKey)}
                  className="bg-amber-500 hover:bg-amber-400 text-black font-bold px-3.5 py-2 rounded-xl text-xs uppercase flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedKey ? <Check className="w-4 h-4 stroke-[3]" /> : <Copy className="w-4 h-4" />}
                  {copiedKey ? 'Copiado!' : 'Copiar'}
                </button>
              </div>
              {deliveryUrl && (
                <div className="pt-2">
                  <a
                    href={deliveryUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-amber-400 hover:underline inline-flex items-center gap-1"
                  >
                    Ver Documentação da API <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Method 6: Webhook / Custom System */}
          {deliveryType === 'webhook' && (
            <div className="p-5 rounded-2xl bg-[#050811] border border-lime-500/30 space-y-3 text-center">
              <div className="w-10 h-10 rounded-xl bg-lime-500/10 border border-lime-500/30 flex items-center justify-center text-lime-400 mx-auto">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-black text-white font-['Syne']">
                Liberação Automática no Sistema
              </h3>
              <p className="text-xs text-white/70 leading-relaxed">
                Nosso servidor notificou o sistema da empresa via Webhook com sucesso. O seu usuário já está ativo com todas as permissões liberadas.
              </p>
              {deliveryUrl && (
                <a
                  href={deliveryUrl}
                  className="w-full inline-flex items-center justify-center gap-2 bg-[#84CC16] hover:bg-[#74b816] text-black font-black py-3 px-6 rounded-xl text-xs uppercase tracking-wider transition-all"
                >
                  Ir para a Minha Conta <ArrowRight className="w-4 h-4" />
                </a>
              )}
            </div>
          )}

          {/* Delivery Instructions Box */}
          {deliveryInstructions && (
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 text-left space-y-1">
              <span className="text-[11px] font-bold text-white/70 uppercase tracking-wider block">
                Instruções do Vendedor:
              </span>
              <p className="text-xs text-white/80 leading-relaxed whitespace-pre-line">
                {deliveryInstructions}
              </p>
            </div>
          )}

          {/* Email Confirmation Notice */}
          <div className="flex items-center gap-2 p-3 rounded-xl bg-white/[0.02] border border-white/5 text-[11px] text-white/50">
            <Mail className="w-4 h-4 text-[#84CC16] flex-shrink-0" />
            <span>
              Uma cópia deste recibo e das instruções de entrega foi enviada para{' '}
              <strong className="text-white/80">{customerEmail || 'seu e-mail'}</strong>.
            </span>
          </div>
        </div>

        {/* Back button */}
        {onBackToHome && (
          <button
            onClick={onBackToHome}
            className="w-full text-center py-2 text-xs text-white/40 hover:text-white transition-colors cursor-pointer"
          >
            Voltar ao Início
          </button>
        )}
      </div>
    </div>
  );
};
