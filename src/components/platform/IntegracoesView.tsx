import React, { useState, useEffect } from 'react';
import { 
  Key, 
  Webhook, 
  Copy, 
  Check, 
  Sparkles, 
  Code2, 
  Terminal, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle,
  Zap,
  Globe,
  Layers,
  ArrowRight,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { updateUserProfileInFirebase, subscribePlans } from '../../services/firestoreService';
import { CompanyPlan, CompanyStartup } from '../../types/platform';

interface IntegracoesViewProps {
  plans?: CompanyPlan[];
  company?: CompanyStartup | null;
}

export const IntegracoesView: React.FC<IntegracoesViewProps> = ({ 
  plans: initialPlans = [], 
  company = null 
}) => {
  const { currentUser, userProfile } = useAuth();

  // Chave de API única
  const defaultMasterKey = 'lp_live_99482710398471203948571290384';
  const effectiveUserId = currentUser?.uid || userProfile?.userId || userProfile?.id || 'trJPnA6UVDZrNZusv8e5t3UjmLg1';
  
  const [apiKey, setApiKey] = useState<string>(() => {
    return userProfile?.apiKey || (effectiveUserId === 'trJPnA6UVDZrNZusv8e5t3UjmLg1' ? defaultMasterKey : '');
  });

  const [webhookUrl, setWebhookUrl] = useState<string>(() => {
    return userProfile?.webhookUrl || company?.webhookUrl || '';
  });

  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [savedWebhook, setSavedWebhook] = useState(false);
  const [isSavingWebhook, setIsSavingWebhook] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Abas de documentação
  const [activeDocTab, setActiveDocTab] = useState<'prompt' | 'rest' | 'nocode'>('prompt');
  const [restSubTab, setRestSubTab] = useState<'js' | 'curl'>('js');

  // Planos para a Aba C (Modo sem código)
  const [plans, setPlans] = useState<CompanyPlan[]>(initialPlans);
  const [selectedPlanId, setSelectedPlanId] = useState<string>(() => {
    return initialPlans[0]?.id || 'pln_principal_exemplo';
  });

  // Se o usuário ainda não tiver apiKey, gera ou sincroniza uma
  useEffect(() => {
    if (userProfile?.apiKey) {
      setApiKey(userProfile.apiKey);
    } else if (!apiKey) {
      const generatedKey = effectiveUserId === 'trJPnA6UVDZrNZusv8e5t3UjmLg1' 
        ? defaultMasterKey 
        : `lp_live_${Date.now()}${Math.floor(1000000000 + Math.random() * 9000000000).toString().slice(0, 16)}`;
      
      setApiKey(generatedKey);
      
      // Salva no Firestore
      if (effectiveUserId) {
        updateUserProfileInFirebase({ apiKey: generatedKey }, effectiveUserId).catch(console.warn);
      }
    }
  }, [userProfile?.apiKey, effectiveUserId]);

  // Carrega planos se não vieram via props
  useEffect(() => {
    if (initialPlans.length > 0) {
      setPlans(initialPlans);
      if (!selectedPlanId || selectedPlanId === 'pln_principal_exemplo') {
        setSelectedPlanId(initialPlans[0].id);
      }
    } else {
      const unsub = subscribePlans((loadedPlans) => {
        if (loadedPlans.length > 0) {
          setPlans(loadedPlans);
          setSelectedPlanId(loadedPlans[0].id);
        }
      });
      return () => unsub();
    }
  }, [initialPlans]);

  // Sincroniza webhookUrl inicial do perfil
  useEffect(() => {
    if (userProfile?.webhookUrl && !webhookUrl) {
      setWebhookUrl(userProfile.webhookUrl);
    }
  }, [userProfile?.webhookUrl]);

  // Copiar chave de API
  const handleCopyKey = () => {
    navigator.clipboard.writeText(apiKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  // Salvar URL de Webhook Postback
  const handleSaveWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setIsSavingWebhook(true);

    const cleanUrl = webhookUrl.trim();

    try {
      // 1. Salva no Firestore do perfil
      await updateUserProfileInFirebase({ 
        webhookUrl: cleanUrl,
        apiKey: apiKey 
      }, effectiveUserId);

      // 2. Notifica API backend para sincronização imediata
      try {
        await fetch('/api/partner/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: effectiveUserId,
            companyId: company?.id || userProfile?.companyId,
            webhookUrl: cleanUrl,
            apiKey: apiKey
          })
        });
      } catch (_) {}

      setSavedWebhook(true);
      setTimeout(() => setSavedWebhook(false), 3000);
    } catch (err: any) {
      console.error('Erro ao salvar webhook:', err);
      setSaveError(err.message || 'Erro ao salvar URL de Webhook.');
    } finally {
      setIsSavingWebhook(false);
    }
  };

  // Conteúdo dinâmico do Prompt para IA (Aba A)
  const dynamicPromptText = `Preciso integrar o gateway de pagamentos LEADS PAY no meu site para processar vendas via PIX e liberar acesso automaticamente.

Dados da minha conta LeadsPay:
- API Key: ${apiKey}
- Endpoint de Criação de Pagamento: POST https://techify-gaming.vercel.app/api/payments

Requisitos da Integração:
1. Geração do PIX: Crie uma função/rota no meu servidor backend que receba os dados do comprador (Nome, E-mail, CPF e Celular) e envie um POST JSON para "https://techify-gaming.vercel.app/api/payments" contendo o Header "x-api-key: ${apiKey}".
2. Exibição na Tela: Ao receber a resposta, exiba na tela de checkout do meu site a imagem do QR Code PIX (pix.qrCodeBase64) e o botão "Copiar Código Pix" com o valor de "pix.copiaECola".
3. Recebimento de Webhook: Crie um endpoint POST na minha aplicação (ex: /api/webhooks/leadspay) para receber a notificação de confirmação (event: PAYMENT_RECEIVED e status: APPROVED) e liberar o produto/acesso do cliente.`;

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(dynamicPromptText);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2500);
  };

  // Exemplo de código JavaScript (Aba B)
  const jsCodeSnippet = `// Exemplo em Node.js / JavaScript moderno (Fetch API)
async function gerarPixLeadsPay() {
  const url = 'https://techify-gaming.vercel.app/api/payments';
  
  const payload = {
    amount: 197.99,
    description: "Acesso Plataforma Venda+",
    customer: {
      name: "Nome do Comprador",
      email: "comprador@email.com",
      cpfCnpj: "12345678900",
      phone: "81999999999"
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': '${apiKey}'
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();

  if (data.success) {
    console.log('ID do Pagamento:', data.paymentId);
    console.log('Pix Copia e Cola:', data.pix.copiaECola);
    console.log('QR Code Base64:', data.pix.qrCodeBase64);
    console.log('Data de Expiração:', data.pix.expirationDate);
  } else {
    console.error('Erro na criação do PIX:', data.message);
  }
}`;

  // Exemplo de código cURL (Aba B)
  const curlCodeSnippet = `curl -X POST https://techify-gaming.vercel.app/api/payments \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${apiKey}" \\
  -d '{
    "amount": 197.99,
    "description": "Acesso Plataforma Venda+",
    "customer": {
      "name": "Nome do Comprador",
      "email": "comprador@email.com",
      "cpfCnpj": "12345678900",
      "phone": "81999999999"
    }
  }'`;

  // Resposta esperada do Servidor (200 OK)
  const responseJsonSnippet = `{
  "success": true,
  "paymentId": "pay_asaas_123456",
  "value": 197.99,
  "pix": {
    "copiaECola": "00020126580014BR.GOV.BCB.PIX...",
    "qrCodeBase64": "data:image/png;base64,iVBORw0KGgo...",
    "expirationDate": "2026-09-08T15:00:00Z"
  }
}`;

  // Link direto de checkout (Aba C)
  const directCheckoutUrl = `https://techify-gaming.vercel.app/checkout/${selectedPlanId}?apiKey=${apiKey}`;

  const handleCopyDirectLink = () => {
    navigator.clipboard.writeText(directCheckoutUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const hasSubaccount = !!(userProfile?.asaasSubaccountId || company?.asaasSubaccountId);

  return (
    <div className="flex flex-col gap-6" id="leadspay-integracoes-view">
      {/* ================= HEADER PRINCIPAL ================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 bg-[#D9F22A]/10 border border-[#D9F22A]/30 text-[#D9F22A] text-[10px] font-mono font-bold uppercase rounded-full tracking-wider">
              Gateway de Pagamentos & APIs
            </span>
            {hasSubaccount ? (
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" /> Subconta Asaas Conectada
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] text-amber-400 font-medium">
                <AlertCircle className="w-3.5 h-3.5" /> Subconta em Configuração
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-['Syne']">
            Integrações & Webhooks (Postback)
          </h1>
          <p className="text-xs text-white/60 mt-1 max-w-3xl">
            Conecte sua automação externa, bots do WhatsApp, CRM e checkout transparente para processar cobranças PIX e receber notificações em tempo real.
          </p>
        </div>
      </div>

      {/* ================= 1. HEADER COM CREDENCIAIS (GRID 2 COLUNAS) ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Card 1: Chave de API REST */}
        <div className="lg:col-span-6 bg-[#080d1a] border border-white/10 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-[#D9F22A]/10 border border-[#D9F22A]/20 flex items-center justify-center text-[#D9F22A]">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-['Syne']">
                    Chave de API do Parceiro (REST)
                  </h3>
                  <span className="text-[10px] text-white/50 font-mono">Header: x-api-key</span>
                </div>
              </div>
              <span className="px-2 py-0.5 bg-white/5 border border-white/10 rounded text-[10px] font-mono text-white/70">
                PRODUÇÃO
              </span>
            </div>

            <p className="text-xs text-white/70 mb-4 leading-relaxed">
              Utilize sua chave de autenticação para autenticar chamadas à rota <code className="text-[#D9F22A] font-mono">/api/payments</code> e receber pagamentos diretamente na sua subconta Asaas.
            </p>
          </div>

          <div className="p-3 bg-[#050811] border border-white/10 rounded-xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <code className="text-xs font-mono text-white/90 truncate select-all">{apiKey}</code>
            </div>
            <button
              id="btn-copy-api-key"
              onClick={handleCopyKey}
              className="px-3 py-1.5 bg-[#D9F22A] text-[#060A15] font-bold text-xs rounded-lg cursor-pointer hover:bg-[#c8e217] transition-colors whitespace-nowrap flex items-center gap-1.5 shadow-sm active:scale-95"
            >
              {copiedKey ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey ? 'Copiado!' : 'Copiar Chave'}</span>
            </button>
          </div>
        </div>

        {/* Card 2: Webhook Postback */}
        <div className="lg:col-span-6 bg-[#080d1a] border border-white/10 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-[#D9F22A]/10 border border-[#D9F22A]/20 flex items-center justify-center text-[#D9F22A]">
                  <Webhook className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-['Syne']">
                    Configurar Webhook Postback
                  </h3>
                  <span className="text-[10px] text-white/50 font-mono">Evento: PAYMENT_RECEIVED</span>
                </div>
              </div>
              {webhookUrl ? (
                <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded text-[10px] font-bold">
                  ATIVO
                </span>
              ) : (
                <span className="px-2 py-0.5 bg-white/5 border border-white/10 rounded text-[10px] text-white/50">
                  NÃO CONFIGURADO
                </span>
              )}
            </div>

            <p className="text-xs text-white/70 mb-3 leading-relaxed">
              Insira o endpoint que receberá payload JSON via POST quando um pagamento for aprovado pelo Asaas para liberar o acesso imediatamente.
            </p>
          </div>

          <form onSubmit={handleSaveWebhook} className="flex flex-col gap-2.5">
            <input
              id="input-webhook-url"
              type="url"
              required
              placeholder="https://meusite.com.br/api/webhooks/leadspay"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              className="w-full bg-[#050811] border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white font-mono placeholder:text-white/30 focus:outline-none focus:border-[#D9F22A] transition-colors"
            />
            {saveError && (
              <p className="text-[11px] text-rose-400 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> {saveError}
              </p>
            )}
            <button
              id="btn-save-webhook"
              type="submit"
              disabled={isSavingWebhook}
              className={`w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                savedWebhook
                  ? 'bg-emerald-500 text-white font-bold'
                  : 'bg-white/10 hover:bg-[#D9F22A] hover:text-[#060A15] text-white'
              }`}
            >
              {isSavingWebhook ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : savedWebhook ? (
                <Check className="w-4 h-4" />
              ) : (
                <Zap className="w-3.5 h-3.5" />
              )}
              <span>
                {isSavingWebhook
                  ? 'Salvando...'
                  : savedWebhook
                  ? 'Webhook Atualizado com Sucesso! ✓'
                  : 'Salvar URL de Postback'}
              </span>
            </button>
          </form>
        </div>
      </div>

      {/* ================= 2. ABAS DE DOCUMENTAÇÃO INTEGRADA ================= */}
      <div className="bg-[#080d1a] border border-white/10 rounded-2xl p-6 shadow-xl flex flex-col gap-6">
        {/* Barra de Navegação das Abas */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <h2 className="text-lg font-bold text-white font-['Syne'] flex items-center gap-2">
              <Code2 className="w-5 h-5 text-[#D9F22A]" />
              Guia de Integração & Exemplos
            </h2>
            <p className="text-xs text-white/60 mt-0.5">
              Escolha a forma mais rápida de conectar o LeadsPay ao seu sistema.
            </p>
          </div>

          <div className="flex items-center gap-1 bg-[#050811] p-1 rounded-xl border border-white/10 overflow-x-auto">
            <button
              id="tab-btn-prompt"
              onClick={() => setActiveDocTab('prompt')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                activeDocTab === 'prompt'
                  ? 'bg-[#D9F22A] text-[#060A15] shadow-sm'
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>A: Gerador de Prompt IA</span>
            </button>

            <button
              id="tab-btn-rest"
              onClick={() => setActiveDocTab('rest')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                activeDocTab === 'rest'
                  ? 'bg-[#D9F22A] text-[#060A15] shadow-sm'
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>B: API REST</span>
            </button>

            <button
              id="tab-btn-nocode"
              onClick={() => setActiveDocTab('nocode')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                activeDocTab === 'nocode'
                  ? 'bg-[#D9F22A] text-[#060A15] shadow-sm'
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>C: Modo Sem Código</span>
            </button>
          </div>
        </div>

        {/* ================= ABA A: GERADOR DE PROMPT PARA IA ================= */}
        {activeDocTab === 'prompt' && (
          <div className="flex flex-col gap-4 animate-in fade-in duration-200" id="doc-tab-content-prompt">
            <div className="p-4 bg-gradient-to-r from-[#D9F22A]/10 via-white/5 to-transparent border border-[#D9F22A]/20 rounded-xl flex items-start gap-3">
              <div className="p-2 rounded-lg bg-[#D9F22A]/20 text-[#D9F22A] shrink-0 mt-0.5">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-bold text-white">
                  Integração em 1 Minuto com Agentes de IA
                </h4>
                <p className="text-xs text-white/70 mt-1 leading-relaxed">
                  Copie o prompt estruturado abaixo e cole diretamente no <strong>Cursor</strong>, <strong>ChatGPT</strong>, <strong>Bolt.new</strong>, <strong>v0</strong> ou <strong>Claude</strong>. A IA entenderá todos os endpoints, headers e formato do QR Code para gerar o código perfeito no seu projeto.
                </p>
              </div>
              <button
                id="btn-copy-prompt-main"
                onClick={handleCopyPrompt}
                className="shrink-0 px-4 py-2 bg-[#D9F22A] text-[#060A15] font-black text-xs rounded-xl cursor-pointer hover:bg-[#c8e217] transition-transform active:scale-95 shadow-md flex items-center gap-1.5"
              >
                {copiedPrompt ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedPrompt ? 'Prompt Copiado!' : 'Copiar Prompt para IA'}</span>
              </button>
            </div>

            {/* Caixa de Código Pronta com o Prompt Formatado */}
            <div className="relative rounded-xl border border-white/10 bg-[#050811] overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 bg-white/5 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                  </div>
                  <span className="text-[11px] font-mono text-white/50 ml-2">prompt-integracao-leadspay.md</span>
                </div>
                <button
                  onClick={handleCopyPrompt}
                  className="text-xs text-[#D9F22A] hover:underline flex items-center gap-1 font-mono font-bold"
                >
                  {copiedPrompt ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedPrompt ? 'Copiado!' : 'Copiar'}
                </button>
              </div>

              <pre className="p-4 text-xs font-mono text-white/90 leading-relaxed overflow-x-auto whitespace-pre-wrap select-all">
                {dynamicPromptText}
              </pre>
            </div>

            {/* Dica de Uso Rápido */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
              <div className="p-3 bg-white/5 border border-white/10 rounded-xl">
                <span className="text-[10px] font-mono text-[#D9F22A] font-bold">PASSO 1</span>
                <p className="text-xs text-white/80 mt-1 font-medium">Clique em "Copiar Prompt para IA"</p>
                <p className="text-[11px] text-white/50 mt-0.5">Sua chave única já está injetada no texto.</p>
              </div>
              <div className="p-3 bg-white/5 border border-white/10 rounded-xl">
                <span className="text-[10px] font-mono text-[#D9F22A] font-bold">PASSO 2</span>
                <p className="text-xs text-white/80 mt-1 font-medium">Cole no Cursor ou ChatGPT</p>
                <p className="text-[11px] text-white/50 mt-0.5">Peça para a IA implementar a rota de pagamento.</p>
              </div>
              <div className="p-3 bg-white/5 border border-white/10 rounded-xl">
                <span className="text-[10px] font-mono text-[#D9F22A] font-bold">PASSO 3</span>
                <p className="text-xs text-white/80 mt-1 font-medium">Cadastre seu Webhook</p>
                <p className="text-[11px] text-white/50 mt-0.5">Salve acima a URL que receberá os avisos de aprovação.</p>
              </div>
            </div>
          </div>
        )}

        {/* ================= ABA B: API REST (EXEMPLO NODE.JS / CURL) ================= */}
        {activeDocTab === 'rest' && (
          <div className="flex flex-col gap-6 animate-in fade-in duration-200" id="doc-tab-content-rest">
            {/* Seletor de Linguagem */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/60">Linguagem do Exemplo:</span>
                <div className="flex items-center gap-1 bg-[#050811] p-1 rounded-lg border border-white/10">
                  <button
                    onClick={() => setRestSubTab('js')}
                    className={`px-3 py-1 rounded text-xs font-mono font-bold transition-all cursor-pointer ${
                      restSubTab === 'js'
                        ? 'bg-[#D9F22A] text-[#060A15]'
                        : 'text-white/70 hover:text-white'
                    }`}
                  >
                    Node.js / Fetch
                  </button>
                  <button
                    onClick={() => setRestSubTab('curl')}
                    className={`px-3 py-1 rounded text-xs font-mono font-bold transition-all cursor-pointer ${
                      restSubTab === 'curl'
                        ? 'bg-[#D9F22A] text-[#060A15]'
                        : 'text-white/70 hover:text-white'
                    }`}
                  >
                    cURL / Terminal
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-white/50">Método:</span>
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 font-bold rounded">
                  POST
                </span>
                <span className="text-white/90">/api/payments</span>
              </div>
            </div>

            {/* Código da Requisição */}
            <div className="relative rounded-xl border border-white/10 bg-[#050811] overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 bg-white/5 border-b border-white/10">
                <span className="text-xs font-mono text-white/60">
                  {restSubTab === 'js' ? 'criar-pix.js' : 'requisicao-curl.sh'}
                </span>
                <button
                  onClick={() => {
                    const code = restSubTab === 'js' ? jsCodeSnippet : curlCodeSnippet;
                    navigator.clipboard.writeText(code);
                    setCopiedCode(restSubTab);
                    setTimeout(() => setCopiedCode(null), 2000);
                  }}
                  className="text-xs text-[#D9F22A] hover:underline flex items-center gap-1 font-mono font-bold cursor-pointer"
                >
                  {copiedCode === restSubTab ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedCode === restSubTab ? 'Copiado!' : 'Copiar Código'}
                </button>
              </div>

              <pre className="p-4 text-xs font-mono text-white/90 leading-relaxed overflow-x-auto whitespace-pre select-all">
                {restSubTab === 'js' ? jsCodeSnippet : curlCodeSnippet}
              </pre>
            </div>

            {/* Bloco de Resposta do Servidor (200 OK) */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  Resposta do Servidor (HTTP 200 OK):
                </span>
                <span className="text-[11px] font-mono text-emerald-400">Content-Type: application/json</span>
              </div>

              <div className="relative rounded-xl border border-white/10 bg-[#050811] overflow-hidden">
                <pre className="p-4 text-xs font-mono text-emerald-300/90 leading-relaxed overflow-x-auto whitespace-pre select-all">
                  {responseJsonSnippet}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* ================= ABA C: MODO SEM CÓDIGO (LINK / EMBED) ================= */}
        {activeDocTab === 'nocode' && (
          <div className="flex flex-col gap-6 animate-in fade-in duration-200" id="doc-tab-content-nocode">
            <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
              <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-[#D9F22A]" />
                Link de Checkout Transparente para WordPress & Elementor
              </h4>
              <p className="text-xs text-white/70 mt-1 leading-relaxed">
                Você não precisa programar nada. Crie botões de compra no seu site (Elementor, WordPress, Wix, Webflow ou Bio do Instagram) e aponte para o link direto abaixo. O LeadsPay gerará o PIX na sua subconta Asaas e notificará o seu webhook automaticamente.
              </p>
            </div>

            {/* Seletor de Plano */}
            {plans.length > 0 && (
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-white/80">
                  Selecione o Plano / Oferta para Gerar o Link:
                </label>
                <select
                  value={selectedPlanId}
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                  className="bg-[#050811] border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#D9F22A]"
                >
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — R$ {(p.priceSetup || p.priceMonthly || 0).toFixed(2)} (ID: {p.id})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Campo do Link Gerado */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-white/80 flex items-center justify-between">
                <span>Link Direto de Pagamento (Com sua API Key vinculada):</span>
                <span className="text-[10px] font-mono text-[#D9F22A]">PIX D+0 Asaas</span>
              </label>

              <div className="p-3 bg-[#050811] border border-white/10 rounded-xl flex items-center justify-between gap-3">
                <code className="text-xs font-mono text-white/90 truncate select-all">
                  {directCheckoutUrl}
                </code>
                <button
                  id="btn-copy-direct-checkout"
                  onClick={handleCopyDirectLink}
                  className="px-3.5 py-1.5 bg-[#D9F22A] text-[#060A15] font-bold text-xs rounded-lg cursor-pointer hover:bg-[#c8e217] transition-colors whitespace-nowrap flex items-center gap-1.5 shadow-sm active:scale-95"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Link Copiado!' : 'Copiar Link'}</span>
                </button>
              </div>
            </div>

            {/* Instruções para Elementor */}
            <div className="p-4 bg-[#050811] border border-white/10 rounded-xl flex flex-col gap-3">
              <h5 className="text-xs font-bold text-white uppercase tracking-wider font-mono text-[#D9F22A]">
                Como Configurar no Elementor (Passo a Passo)
              </h5>
              <ol className="text-xs text-white/70 space-y-2 list-decimal list-inside leading-relaxed">
                <li>Abra a sua página no editor do <strong>Elementor</strong> no WordPress.</li>
                <li>Clique no botão de compra ou chamada para ação (ex: <em>"Comprar Agora com PIX"</em>).</li>
                <li>No painel lateral, localize o campo <strong>Link / URL</strong>.</li>
                <li>Cole o link copiado acima e marque a opção <em>"Abrir em nova janela"</em> se desejar.</li>
                <li>Publique a página! O comprador abrirá o checkout com QR Code instantâneo.</li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
