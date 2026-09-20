import React, { useState, useEffect } from 'react';
import { 
  Key, 
  Copy, 
  Check, 
  Eye, 
  EyeOff, 
  RefreshCw, 
  Bot, 
  Sparkles, 
  ExternalLink, 
  HelpCircle, 
  Code2, 
  Play, 
  CheckCircle2, 
  AlertCircle,
  Terminal,
  Layers,
  ChevronRight,
  ShieldCheck,
  Cpu
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { updateUserProfileInFirebase } from '../../services/firestoreService';

interface ApiKeySectionProps {
  apiKey?: string;
  onApiKeyChange?: (newKey: string) => void;
  compact?: boolean;
}

export const ApiKeySection: React.FC<ApiKeySectionProps> = ({ 
  apiKey: initialKey,
  onApiKeyChange,
  compact = false
}) => {
  const { currentUser, userProfile } = useAuth();
  const effectiveUserId = currentUser?.uid || userProfile?.userId || userProfile?.id || '';

  const [currentKey, setCurrentKey] = useState<string>(
    initialKey || userProfile?.apiKey || ''
  );
  const [showKey, setShowKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState<string | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<'chatgpt' | 'claude' | 'prompts' | 'tester'>('chatgpt');

  // Test Runner State
  const [testAction, setTestAction] = useState<'get_balance' | 'list_products' | 'create_coupon' | 'create_checkout'>('get_balance');
  const [testParams, setTestParams] = useState<string>('{\n  "action": "get_balance"\n}');
  const [testLoading, setTestLoading] = useState(false);
  const [testResponse, setTestResponse] = useState<any>(null);
  const [testError, setTestError] = useState<string | null>(null);

  // Sync state if prop or profile changes
  useEffect(() => {
    if (initialKey) {
      setCurrentKey(initialKey);
    } else if (userProfile?.apiKey) {
      setCurrentKey(userProfile.apiKey);
    }
  }, [initialKey, userProfile?.apiKey]);

  // Host URL detection
  const appOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://techify-gaming.vercel.app';
  const openApiUrl = `${appOrigin}/openapi.json`;
  const mcpEndpointUrl = `${appOrigin}/api/mcp`;
  const v1EndpointUrl = `${appOrigin}/api/mcp/v1`;

  // Generate or regenerate key
  const handleGenerateKey = async () => {
    setIsRegenerating(true);
    try {
      const timestamp = Date.now().toString();
      const rand1 = Math.floor(10000000 + Math.random() * 90000000).toString();
      const rand2 = Math.floor(10000000 + Math.random() * 90000000).toString();
      const newKey = `lp_live_${timestamp}${rand1}${rand2}`;

      setCurrentKey(newKey);
      if (onApiKeyChange) {
        onApiKeyChange(newKey);
      }

      if (effectiveUserId) {
        await updateUserProfileInFirebase({ apiKey: newKey }, effectiveUserId);
      }
    } catch (e) {
      console.error('Erro ao gerar chave de API:', e);
    } finally {
      setIsRegenerating(false);
    }
  };

  const copyToClipboard = (text: string, type: 'key' | 'url' | 'prompt') => {
    navigator.clipboard.writeText(text);
    if (type === 'key') {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    } else if (type === 'url') {
      setCopiedUrl(text);
      setTimeout(() => setCopiedUrl(null), 2000);
    } else if (type === 'prompt') {
      setCopiedPrompt(text);
      setTimeout(() => setCopiedPrompt(null), 2000);
    }
  };

  // Run live API test
  const handleRunTest = async () => {
    if (!currentKey) {
      setTestError('Gere uma chave de API primeiro antes de testar.');
      return;
    }

    setTestLoading(true);
    setTestError(null);
    setTestResponse(null);

    try {
      let bodyData: any;
      try {
        bodyData = JSON.parse(testParams);
      } catch (jsonErr) {
        bodyData = { action: testAction };
      }

      const res = await fetch('/api/mcp/v1', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentKey.trim()}`
        },
        body: JSON.stringify(bodyData)
      });

      const data = await res.json();
      if (!res.ok) {
        setTestError(data.error || `Erro HTTP ${res.status}`);
      } else {
        setTestResponse(data);
      }
    } catch (err: any) {
      setTestError(err.message || 'Erro de conexão com o servidor LeadsPay MCP');
    } finally {
      setTestLoading(false);
    }
  };

  // Switch test action helper
  const handleSelectTestAction = (action: typeof testAction) => {
    setTestAction(action);
    if (action === 'get_balance') {
      setTestParams(JSON.stringify({ action: 'get_balance' }, null, 2));
    } else if (action === 'list_products') {
      setTestParams(JSON.stringify({ action: 'list_products', params: { limit: 5 } }, null, 2));
    } else if (action === 'create_coupon') {
      setTestParams(JSON.stringify({ 
        action: 'create_coupon', 
        params: { 
          code: `IA${Math.floor(10 + Math.random() * 90)}`, 
          discount: 15, 
          discountType: 'percentage',
          maxUses: 50 
        } 
      }, null, 2));
    } else if (action === 'create_checkout') {
      setTestParams(JSON.stringify({ 
        action: 'create_checkout', 
        params: { 
          productId: 'pln_principal_exemplo', 
          couponCode: 'LEADSPAY10' 
        } 
      }, null, 2));
    }
  };

  const claudeConfigSnippet = `{
  "mcpServers": {
    "leadspay": {
      "url": "${mcpEndpointUrl}",
      "headers": {
        "Authorization": "Bearer ${currentKey || 'SUA_CHAVE_LEADSPAY'}"
      }
    }
  }
}`;

  return (
    <div className="rounded-2xl border border-emerald-500/20 bg-[#0f172a]/95 backdrop-blur-md overflow-hidden shadow-2xl">
      {/* Header Banner */}
      <div className="px-6 py-5 border-b border-emerald-500/20 bg-gradient-to-r from-emerald-950/40 via-[#0a1520] to-[#0d1f18] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-emerald-500 to-[#D9F22A] flex items-center justify-center text-black shadow-lg shadow-emerald-500/20 shrink-0">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base sm:text-lg text-white tracking-tight">
                Assistentes de IA & Protocolo MCP
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                GPT Actions & MCP
              </span>
            </div>
            <p className="text-xs text-white/60 mt-0.5 max-w-xl leading-relaxed">
              Conecte o <strong>ChatGPT</strong>, <strong>Claude</strong> ou <strong>Gemini</strong> à sua conta LeadsPay para consultar saldo, emitir cupons e gerar checkouts comissionados diretamente pelo chat.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-auto">
          <a
            href="/openapi.json"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors border border-white/10"
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>OpenAPI Schema</span>
            <ExternalLink className="w-3 h-3 text-white/40" />
          </a>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Key Card Box */}
        <div className="rounded-xl border border-white/10 bg-[#060b13] p-4 sm:p-5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Sua Chave API Pessoal (Bearer Token)
              </span>
            </div>
            <span className="text-[11px] text-white/40">
              Uso pessoal e confidencial • Nunca compartilhe publicamente
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="relative flex-1">
              <input
                type={showKey ? 'text' : 'password'}
                readOnly
                value={currentKey || 'Nenhuma chave gerada ainda'}
                placeholder="Clique em 'Gerar Chave' para criar..."
                className="w-full bg-[#0a101d] text-emerald-300 font-mono text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-emerald-500/30 focus:outline-none focus:border-emerald-400 select-all pr-10"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors cursor-pointer"
                title={showKey ? 'Ocultar chave' : 'Exibir chave'}
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={!currentKey}
                onClick={() => copyToClipboard(currentKey, 'key')}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
              >
                {copiedKey ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copiar Chave</span>
                  </>
                )}
              </button>

              <button
                type="button"
                disabled={isRegenerating}
                onClick={handleGenerateKey}
                className="px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 border border-white/10 active:scale-95 transition-all cursor-pointer"
                title="Gera uma nova chave e substitui a anterior"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin text-emerald-400' : ''}`} />
                <span className="hidden sm:inline">{currentKey ? 'Regenerar' : 'Gerar'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Integration Guides Tabs */}
        <div>
          <div className="flex items-center gap-1 border-b border-white/10 pb-1 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('chatgpt')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'chatgpt'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <Bot className="w-3.5 h-3.5" />
              <span>ChatGPT (Custom GPT)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('claude')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'claude'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Claude (MCP Server)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('prompts')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'prompts'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Prompts Prontos</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('tester')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'tester'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <Play className="w-3.5 h-3.5" />
              <span>Testador Ao Vivo</span>
            </button>
          </div>

          {/* TAB 1: CHATGPT */}
          {activeTab === 'chatgpt' && (
            <div className="pt-4 space-y-4">
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-3">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-black">1</span>
                  Passo a Passo: Criando uma Ação no seu Custom GPT
                </h4>

                <ol className="text-xs text-white/70 space-y-2.5 ml-1">
                  <li className="flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>
                      Acesse o ChatGPT e vá em <strong>Explore GPTs</strong> &gt; <strong>Create a GPT</strong> (ou edite um GPT existente).
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>
                      Na aba <strong>Configure</strong>, desça até a seção <strong>Actions</strong> e clique em <strong>Create new action</strong>.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div className="space-y-1.5 flex-1">
                      <span>
                        No campo <strong>Schema</strong>, cole o link direto da especificação OpenAPI ou clique em "Import from URL":
                      </span>
                      <div className="flex items-center gap-2 bg-[#060b13] p-2 rounded-lg border border-white/10 font-mono text-emerald-300">
                        <span className="text-[11px] select-all flex-1 truncate">{openApiUrl}</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(openApiUrl, 'url')}
                          className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                        >
                          {copiedUrl === openApiUrl ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedUrl === openApiUrl ? 'Copiado' : 'Copiar URL'}</span>
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>
                      Em <strong>Authentication</strong>, clique no ícone de engrenagem, selecione <strong>API Key</strong>, marque o tipo <strong>Bearer</strong>, e cole sua chave acima.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>
                      Pronto! Salve o GPT e faça uma pergunta como <em>"Qual é o meu saldo na LeadsPay?"</em>.
                    </span>
                  </li>
                </ol>
              </div>

              {/* Ready Instructions Template */}
              <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                    Prompt de Instruções Recomendado para o GPT (Instructions)
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(
                      `Você é o Copiloto Oficial da LeadsPay. Você possui acesso direto à API da LeadsPay via Actions para consultar saldo de afiliados, listar produtos ativos, gerar cupons de desconto e criar links de checkout comissionados. Sempre que o usuário perguntar sobre saldo, produtos ou checkouts, use a ação correspondente e apresente os valores formatados em R$ (Real Brasileiro).`,
                      'prompt'
                    )}
                    className="text-[11px] text-emerald-300 hover:text-emerald-200 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    {copiedPrompt ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedPrompt ? 'Copiado' : 'Copiar Instruções'}</span>
                  </button>
                </div>
                <p className="text-xs text-white/70 italic font-mono bg-black/40 p-2.5 rounded-lg border border-white/5">
                  "Você é o Copiloto Oficial da LeadsPay. Você possui acesso direto à API da LeadsPay via Actions para consultar saldo de afiliados, listar produtos ativos, gerar cupons de desconto e criar links de checkout comissionados..."
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: CLAUDE MCP */}
          {activeTab === 'claude' && (
            <div className="pt-4 space-y-4">
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-3">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-emerald-400" />
                  Configuração para Claude Desktop & Extensões MCP
                </h4>
                <p className="text-xs text-white/70 leading-relaxed">
                  O Claude Desktop suporta o <strong>Model Context Protocol (MCP)</strong>. Adicione o bloco abaixo no arquivo de configuração do Claude Desktop (<code>claude_desktop_config.json</code>):
                </p>

                <div className="relative">
                  <pre className="p-3.5 rounded-xl bg-[#060b13] border border-white/10 text-emerald-300 font-mono text-xs overflow-x-auto">
                    {claudeConfigSnippet}
                  </pre>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(claudeConfigSnippet, 'prompt')}
                    className="absolute right-3 top-3 px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs flex items-center gap-1.5 shadow transition-all cursor-pointer"
                  >
                    {copiedPrompt === claudeConfigSnippet ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedPrompt === claudeConfigSnippet ? 'Copiado' : 'Copiar JSON'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
                  <div className="p-2.5 rounded-lg bg-white/5 border border-white/5 text-center">
                    <span className="text-[10px] text-white/50 uppercase block font-bold">Ferramenta 1</span>
                    <span className="text-xs font-mono text-emerald-400 font-bold">get_balance</span>
                    <p className="text-[10px] text-white/60 mt-0.5">Saldo disponível e pendente</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white/5 border border-white/5 text-center">
                    <span className="text-[10px] text-white/50 uppercase block font-bold">Ferramenta 2</span>
                    <span className="text-xs font-mono text-emerald-400 font-bold">create_coupon</span>
                    <p className="text-[10px] text-white/60 mt-0.5">Cria cupons com desconto</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white/5 border border-white/5 text-center">
                    <span className="text-[10px] text-white/50 uppercase block font-bold">Ferramenta 3</span>
                    <span className="text-xs font-mono text-emerald-400 font-bold">create_checkout</span>
                    <p className="text-[10px] text-white/60 mt-0.5">Links com código de afiliado</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PROMPTS */}
          {activeTab === 'prompts' && (
            <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                {
                  title: 'Consultar Saldo e Recebíveis',
                  prompt: 'Qual é o meu saldo atual na LeadsPay? Quanto tenho liberado para saque imediato e quanto está pendente para os próximos 9 dias?',
                  desc: 'Executa get_balance e formata o extrato detalhado'
                },
                {
                  title: 'Criar Cupom de 20% de Desconto',
                  prompt: 'Crie um cupom de desconto de 20% chamado PROMO20 válido para todos os produtos na LeadsPay com limite de 50 usos.',
                  desc: 'Executa create_coupon e retorna o código cadastrado'
                },
                {
                  title: 'Gerar Link de Checkout Comissionado',
                  prompt: 'Gere um link de checkout com o meu código de afiliado para o produto pln_principal_exemplo aplicando o cupom VIP10.',
                  desc: 'Executa create_checkout com rastreamento'
                },
                {
                  title: 'Listar Produtos e Comissões',
                  prompt: 'Liste quais são os produtos e planos disponíveis para eu me afiliar e divulgar na LeadsPay com seus preços e comissões.',
                  desc: 'Executa list_products da vitrine oficial'
                }
              ].map((item, idx) => (
                <div 
                  key={idx}
                  className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10 hover:border-emerald-500/30 transition-all space-y-2 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-bold text-emerald-400">{item.title}</h5>
                      <span className="text-[10px] text-white/40">{item.desc}</span>
                    </div>
                    <p className="text-xs text-white/80 italic mt-1.5 leading-relaxed bg-black/30 p-2 rounded-lg border border-white/5">
                      "{item.prompt}"
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(item.prompt, 'prompt')}
                    className="self-end mt-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-emerald-500 hover:text-black text-white text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {copiedPrompt === item.prompt ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedPrompt === item.prompt ? 'Copiado!' : 'Copiar Prompt'}</span>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* TAB 4: TESTADOR AO VIVO */}
          {activeTab === 'tester' && (
            <div className="pt-4 space-y-4">
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-emerald-400" />
                    Playground de Teste em Tempo Real
                  </h4>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {(['get_balance', 'list_products', 'create_coupon', 'create_checkout'] as const).map(act => (
                      <button
                        key={act}
                        type="button"
                        onClick={() => handleSelectTestAction(act)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition-colors cursor-pointer ${
                          testAction === act
                            ? 'bg-emerald-500 text-black'
                            : 'bg-white/5 text-white/70 hover:bg-white/10'
                        }`}
                      >
                        {act}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[11px] text-white/50 uppercase font-bold tracking-wider">
                      Payload JSON da Requisição (POST /api/mcp/v1)
                    </label>
                    <textarea
                      rows={6}
                      value={testParams}
                      onChange={(e) => setTestParams(e.target.value)}
                      className="w-full bg-[#060b13] text-emerald-300 font-mono text-xs p-3 rounded-xl border border-white/10 focus:outline-none focus:border-emerald-400"
                    />
                    <button
                      type="button"
                      disabled={testLoading}
                      onClick={handleRunTest}
                      className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs flex items-center justify-center gap-2 shadow transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {testLoading ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Executando requisição...</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Testar Ação com Minha Chave</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] text-white/50 uppercase font-bold tracking-wider">
                      Resposta da API LeadsPay
                    </label>
                    <div className="h-[185px] bg-[#060b13] rounded-xl border border-white/10 p-3 overflow-y-auto font-mono text-xs text-white/80">
                      {testError && (
                        <div className="text-red-400 flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                          <span>{testError}</span>
                        </div>
                      )}
                      {testResponse && (
                        <pre className="text-emerald-400 text-[11px] leading-relaxed">
                          {JSON.stringify(testResponse, null, 2)}
                        </pre>
                      )}
                      {!testLoading && !testError && !testResponse && (
                        <div className="h-full flex flex-col items-center justify-center text-white/30 text-center">
                          <Terminal className="w-6 h-6 mb-1.5 opacity-40" />
                          <span>Clique em "Testar Ação" para simular a resposta</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
