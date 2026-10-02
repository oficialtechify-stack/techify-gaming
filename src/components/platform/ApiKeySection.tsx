import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Bot,
  Check,
  CheckCircle2,
  Code2,
  Copy,
  Cpu,
  ExternalLink,
  Key,
  Play,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Terminal,
  Trash2,
  WandSparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserRoleMode } from '../../types/platform';

interface ApiKeySectionProps {
  apiKey?: string;
  onApiKeyChange?: (newKey: string) => void;
  compact?: boolean;
  roleMode?: UserRoleMode;
}

type KeyMeta = {
  id: string;
  prefix: string;
  createdAt?: string | null;
  preferredRole?: string | null;
  allowedRoles?: string[];
  scopes?: string[];
  environment?: string | null;
};

type Tab = 'chatgpt' | 'mcp' | 'gemini' | 'prompts' | 'tester';
type TestAction = 'get_balance' | 'list_products' | 'get_affiliations' | 'create_coupon' | 'create_checkout';

export const ApiKeySection: React.FC<ApiKeySectionProps> = ({ roleMode = 'afiliado' }) => {
  const { currentUser } = useAuth();
  const [keyMeta, setKeyMeta] = useState<KeyMeta | null>(null);
  const [currentKey, setCurrentKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [loadingKey, setLoadingKey] = useState(true);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [keyError, setKeyError] = useState('');
  const [serviceOnline, setServiceOnline] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('chatgpt');
  const [testAction, setTestAction] = useState<TestAction>('get_balance');
  const [testParams, setTestParams] = useState(JSON.stringify({
    action: 'get_balance',
    params: { role: roleMode === 'empresa' ? 'empresa' : 'afiliado' }
  }, null, 2));
  const [testLoading, setTestLoading] = useState(false);
  const [testResponse, setTestResponse] = useState<any>(null);
  const [testError, setTestError] = useState('');

  const appOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://www.techify.sbs';
  const openApiUrl = appOrigin + '/openapi.json';
  const mcpEndpointUrl = appOrigin + '/api/mcp';
  const actionEndpointUrl = appOrigin + '/api/mcp/v1';
  const sessionKeyName = currentUser?.uid ? 'leadspay_api_key_session:' + currentUser.uid : '';

  const tokenHeaders = async () => {
    if (!currentUser) throw new Error('Faça login novamente.');
    const token = await currentUser.getIdToken();
    return {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token,
    };
  };

  const loadKey = async () => {
    if (!currentUser) {
      setLoadingKey(false);
      return;
    }
    setLoadingKey(true);
    setKeyError('');
    try {
      const headers = await tokenHeaders();
      const res = await fetch('/api/partner/api-key', { headers });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Não foi possível carregar a chave.');
      setKeyMeta(data.key || null);

      const saved = sessionKeyName ? sessionStorage.getItem(sessionKeyName) || '' : '';
      const expectedPrefix = String(data.key?.prefix || '').replace('…', '');
      if (saved && expectedPrefix && saved.startsWith(expectedPrefix)) {
        setCurrentKey(saved);
      } else {
        if (sessionKeyName) sessionStorage.removeItem(sessionKeyName);
        setCurrentKey('');
      }

      if (data.legacyKeyDetected && !data.key) {
        setKeyError('Uma chave antiga foi detectada. Gere uma nova chave segura para ativar as integrações.');
      }
    } catch (error: any) {
      setKeyError(error?.message || 'Falha ao carregar a API Key.');
    } finally {
      setLoadingKey(false);
    }
  };

  useEffect(() => {
    loadKey();
    fetch('/api/mcp/v1/status', { cache: 'no-store' })
      .then((res) => setServiceOnline(res.ok))
      .catch(() => setServiceOnline(false));
  }, [currentUser?.uid]);

  const generateKey = async () => {
    setIsRegenerating(true);
    setKeyError('');
    try {
      const headers = await tokenHeaders();
      const preferredRole = roleMode === 'empresa' || roleMode === 'afiliado' ? roleMode : undefined;
      const res = await fetch('/api/partner/api-key', {
        method: 'POST',
        headers,
        body: JSON.stringify({ preferredRole }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.apiKey) throw new Error(data.error || 'Não foi possível gerar a chave.');
      setCurrentKey(data.apiKey);
      setKeyMeta(data.key || null);
      if (sessionKeyName) sessionStorage.setItem(sessionKeyName, data.apiKey);
      setShowKey(true);
    } catch (error: any) {
      setKeyError(error?.message || 'Falha ao gerar a API Key.');
    } finally {
      setIsRegenerating(false);
    }
  };

  const revokeKey = async () => {
    if (!keyMeta) return;
    if (!confirm('Revogar a API Key atual? Integrações que usam esta chave deixarão de funcionar imediatamente.')) return;
    setIsRegenerating(true);
    try {
      const headers = await tokenHeaders();
      const res = await fetch('/api/partner/api-key', { method: 'DELETE', headers });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Não foi possível revogar a chave.');
      setCurrentKey('');
      setKeyMeta(null);
      if (sessionKeyName) sessionStorage.removeItem(sessionKeyName);
    } catch (error: any) {
      setKeyError(error?.message || 'Falha ao revogar a chave.');
    } finally {
      setIsRegenerating(false);
    }
  };

  const copy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 1800);
  };

  const selectTestAction = (action: TestAction) => {
    setTestAction(action);
    if (action === 'get_balance') {
      setTestParams(JSON.stringify({ action, params: { role: roleMode === 'empresa' ? 'empresa' : 'afiliado' } }, null, 2));
    } else if (action === 'list_products') {
      setTestParams(JSON.stringify({ action, params: { limit: 5 } }, null, 2));
    } else if (action === 'get_affiliations') {
      setTestParams(JSON.stringify({ action, params: {} }, null, 2));
    } else if (action === 'create_coupon') {
      setTestParams(JSON.stringify({ action, params: { code: 'IA15', discount: 15, discountType: 'percentage', maxUses: 50, planId: 'all' } }, null, 2));
    } else {
      setTestParams(JSON.stringify({ action, params: { productId: 'COLE_O_ID_DO_PRODUTO', couponCode: '' } }, null, 2));
    }
  };

  const runTest = async () => {
    if (!currentKey) {
      setTestError('Por segurança, a chave completa só aparece quando é criada. Gere/regere uma chave para testar nesta sessão.');
      return;
    }
    setTestLoading(true);
    setTestError('');
    setTestResponse(null);
    try {
      const body = JSON.parse(testParams);
      const res = await fetch('/api/mcp/v1', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + currentKey,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Erro HTTP ' + res.status);
      setTestResponse(data);
    } catch (error: any) {
      setTestError(error?.message || 'Falha ao executar a ação.');
    } finally {
      setTestLoading(false);
    }
  };

  const availableTestActions = useMemo<TestAction[]>(() => {
    const base: TestAction[] = ['get_balance', 'list_products', 'create_checkout'];
    if (roleMode === 'afiliado') base.splice(2, 0, 'get_affiliations');
    if (roleMode === 'empresa') base.splice(2, 0, 'create_coupon');
    return base;
  }, [roleMode]);

  useEffect(() => {
    if (!availableTestActions.includes(testAction)) selectTestAction(availableTestActions[0]);
  }, [roleMode]);

  const displayValue = loadingKey ? 'Carregando...' : currentKey || keyMeta?.prefix || 'Nenhuma chave ativa';

  const mcpConfig = JSON.stringify({
    url: mcpEndpointUrl,
    headers: { Authorization: 'Bearer ' + (currentKey || 'SUA_CHAVE_LEADSPAY') }
  }, null, 2);

  const curlExample =
    'curl -X POST "' + actionEndpointUrl + '" \\\n' +
    '  -H "Authorization: Bearer ' + (currentKey || 'SUA_CHAVE_LEADSPAY') + '" \\\n' +
    '  -H "Content-Type: application/json" \\\n' +
    '  -d \'{"action":"get_balance","params":{"role":"' + (roleMode === 'empresa' ? 'empresa' : 'afiliado') + '"}}\'';

  const prompts = [
    {
      title: 'Consultar saldo real',
      text: 'Consulte meu saldo ' + (roleMode === 'empresa' ? 'da empresa' : 'de afiliado') + ' na LeadsPay e informe o que está disponível e o que ainda está pendente.'
    },
    {
      title: 'Listar produtos',
      text: roleMode === 'empresa'
        ? 'Liste minhas ofertas ativas na LeadsPay com preço e link de checkout.'
        : 'Liste produtos ativos do marketplace LeadsPay com preço e comissão.'
    },
    {
      title: roleMode === 'empresa' ? 'Criar cupom' : 'Minhas afiliações',
      text: roleMode === 'empresa'
        ? 'Crie o cupom CLIENTE15 com 15% de desconto, 100 usos e válido para todas as minhas ofertas.'
        : 'Liste minhas afiliações ativas com código, comissão e link oficial.'
    },
    {
      title: 'Gerar checkout',
      text: 'Gere um link oficial de checkout para o produto que eu indicar. Não invente produto, cupom ou código de afiliado.'
    }
  ];

  const statusClass = serviceOnline === true
    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
    : serviceOnline === false
      ? 'bg-red-500/10 text-red-300 border-red-500/20'
      : 'bg-white/5 text-white/50 border-white/10';

  return (
    <div className="rounded-2xl border border-emerald-500/20 bg-[#0f172a]/95 overflow-hidden shadow-2xl">
      <div className="px-6 py-5 border-b border-emerald-500/20 bg-gradient-to-r from-emerald-950/40 via-[#0a1520] to-[#0d1f18] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-emerald-500 to-[#D9F22A] flex items-center justify-center text-black">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-bold text-base sm:text-lg text-white">Integração oficial de IA</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">API + MCP</span>
              <span className={'px-2 py-0.5 rounded-full text-[10px] font-bold border ' + statusClass}>
                {serviceOnline === true ? 'Serviço online' : serviceOnline === false ? 'Serviço indisponível' : 'Verificando...'}
              </span>
            </div>
            <p className="text-xs text-white/55 mt-1">A mesma chave autentica GPT Actions, MCP remoto e chamadas REST.</p>
          </div>
        </div>
        <a href="/openapi.json" target="_blank" rel="noreferrer" className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-bold text-white/70 flex items-center gap-2 border border-white/10">
          <Code2 className="w-3.5 h-3.5" /> OpenAPI Schema <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      <div className="p-6 space-y-6">
        <div className="rounded-xl border border-white/10 bg-[#060b13] p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2"><Key className="w-4 h-4 text-emerald-400" /><span className="text-xs font-bold uppercase tracking-wider">API Key pessoal</span></div>
            <span className="text-[11px] text-white/40">O servidor guarda somente o hash da chave.</span>
          </div>

          {keyError && <div className="mb-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex gap-2"><AlertCircle className="w-4 h-4 shrink-0" />{keyError}</div>}

          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <input type={showKey && currentKey ? 'text' : 'password'} readOnly value={displayValue} className="w-full bg-[#0a101d] text-emerald-300 font-mono text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-emerald-500/30 pr-10" />
              {currentKey && <button type="button" onClick={() => setShowKey(!showKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white" title={showKey ? 'Ocultar chave' : 'Mostrar chave'}>{showKey ? <ShieldCheck className="w-4 h-4" /> : <Key className="w-4 h-4" />}</button>}
            </div>

            <button type="button" disabled={!currentKey} onClick={() => copy(currentKey, 'key')} className="px-4 py-2.5 rounded-xl bg-emerald-500 text-black font-black text-xs flex items-center justify-center gap-2 disabled:opacity-40">
              {copied === 'key' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}{copied === 'key' ? 'Copiada' : 'Copiar chave'}
            </button>

            <button type="button" disabled={isRegenerating} onClick={generateKey} className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold border border-white/10 flex items-center justify-center gap-2 disabled:opacity-50">
              <RefreshCw className={'w-3.5 h-3.5 ' + (isRegenerating ? 'animate-spin' : '')} />{keyMeta ? 'Regenerar' : 'Gerar chave'}
            </button>

            {keyMeta && <button type="button" disabled={isRegenerating} onClick={revokeKey} className="px-3 py-2.5 rounded-xl bg-red-500/10 text-red-300 border border-red-500/20" title="Revogar chave"><Trash2 className="w-4 h-4" /></button>}
          </div>

          {keyMeta && <div className="mt-3 flex flex-wrap gap-2 text-[10px]">
            <span className="px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-white/60">Ambiente: {keyMeta.environment || 'ativo'}</span>
            {(keyMeta.allowedRoles || []).map((role) => <span key={role} className="px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">{role}</span>)}
            {(keyMeta.scopes || []).slice(0, 6).map((scope) => <span key={scope} className="px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-white/40">{scope}</span>)}
          </div>}

          {currentKey && <div className="mt-3 p-3 rounded-xl bg-amber-500/[0.06] border border-amber-500/20 text-[11px] text-amber-200/80">Copie e guarde esta chave agora. Depois desta sessão, a LeadsPay não consegue recuperar o valor completo; só é possível regenerar.</div>}
        </div>

        <div className="flex items-center gap-1 border-b border-white/10 pb-1 overflow-x-auto">
          {([
            ['chatgpt', 'ChatGPT', Bot],
            ['mcp', 'MCP remoto', Cpu],
            ['gemini', 'Gemini / OpenAPI', WandSparkles],
            ['prompts', 'Prompts', Sparkles],
            ['tester', 'Testador ao vivo', Play]
          ] as const).map(([id, label, Icon]) => (
            <button key={id} type="button" onClick={() => setActiveTab(id)} className={'px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 whitespace-nowrap ' + (activeTab === id ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'text-white/55 hover:text-white')}>
              <Icon className="w-3.5 h-3.5" />{label}
            </button>
          ))}
        </div>

        {activeTab === 'chatgpt' && <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10">
          <h4 className="text-sm font-bold text-white mb-3">GPT Actions com OpenAPI</h4>
          <ol className="text-xs text-white/65 space-y-2 list-decimal pl-5">
            <li>Crie ou edite seu GPT e adicione uma Action.</li>
            <li>Importe o schema OpenAPI abaixo.</li>
            <li>Configure autenticação por API Key no header Authorization usando Bearer.</li>
            <li>Cole a chave LeadsPay gerada acima e teste uma ação.</li>
          </ol>
          <div className="mt-3 flex gap-2 items-center p-3 rounded-xl bg-[#060b13] border border-white/10">
            <code className="flex-1 text-[11px] text-emerald-300 truncate">{openApiUrl}</code>
            <button type="button" onClick={() => copy(openApiUrl, 'openapi')} className="px-2 py-1 rounded bg-white/10 text-xs">{copied === 'openapi' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}</button>
          </div>
        </div>}

        {activeTab === 'mcp' && <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10">
          <h4 className="text-sm font-bold text-white mb-2">Servidor MCP remoto</h4>
          <p className="text-xs text-white/60">Use o endpoint abaixo em um cliente MCP com transporte HTTP remoto e envie sua chave no header Authorization.</p>
          <div className="mt-3 p-3 rounded-xl bg-[#060b13] border border-white/10 font-mono text-[11px] text-emerald-300 break-all">{mcpEndpointUrl}</div>
          <div className="relative mt-3">
            <pre className="p-4 rounded-xl bg-[#060b13] border border-white/10 text-[11px] text-emerald-300 overflow-x-auto">{mcpConfig}</pre>
            <button type="button" onClick={() => copy(mcpConfig, 'mcp')} className="absolute right-3 top-3 px-2 py-1 rounded bg-white/10 text-xs">{copied === 'mcp' ? 'Copiado' : 'Copiar'}</button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4">
            {['get_balance','list_products','create_checkout','get_affiliations','create_coupon','list_coupons'].map((tool) => <div key={tool} className="px-3 py-2 rounded-lg bg-white/5 border border-white/5 font-mono text-[10px] text-white/70">{tool}</div>)}
          </div>
        </div>}

        {activeTab === 'gemini' && <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10">
          <h4 className="text-sm font-bold text-white mb-2">Gemini e agentes compatíveis com OpenAPI</h4>
          <p className="text-xs text-white/60 leading-relaxed">Use o schema OpenAPI para transformar os endpoints LeadsPay em ferramentas do seu agente. A autenticação continua sendo Bearer e as permissões são as mesmas da chave.</p>
          <div className="mt-3 relative">
            <pre className="p-4 rounded-xl bg-[#060b13] border border-white/10 text-[11px] text-emerald-300 overflow-x-auto">{curlExample}</pre>
            <button type="button" onClick={() => copy(curlExample, 'curl')} className="absolute right-3 top-3 px-2 py-1 rounded bg-white/10 text-xs">{copied === 'curl' ? 'Copiado' : 'Copiar cURL'}</button>
          </div>
        </div>}

        {activeTab === 'prompts' && <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {prompts.map((item) => <div key={item.title} className="p-4 rounded-xl bg-white/[0.02] border border-white/10">
            <div className="flex justify-between gap-3">
              <h5 className="text-xs font-bold text-emerald-400">{item.title}</h5>
              <button type="button" onClick={() => copy(item.text, item.title)} className="text-white/50">{copied === item.title ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}</button>
            </div>
            <p className="text-xs text-white/70 mt-2 italic">“{item.text}”</p>
          </div>)}
        </div>}

        {activeTab === 'tester' && <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-3">
          <div className="flex flex-wrap gap-2">
            {availableTestActions.map((action) => <button key={action} type="button" onClick={() => selectTestAction(action)} className={'px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold ' + (testAction === action ? 'bg-emerald-500 text-black' : 'bg-white/5 text-white/60')}>{action}</button>)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] uppercase font-bold text-white/40">Payload real</label>
              <textarea rows={9} value={testParams} onChange={(event) => setTestParams(event.target.value)} className="mt-1 w-full rounded-xl bg-[#060b13] border border-white/10 p-3 font-mono text-xs text-emerald-300" />
              <button type="button" disabled={testLoading} onClick={runTest} className="w-full mt-2 py-2.5 rounded-xl bg-emerald-500 text-black text-xs font-black flex items-center justify-center gap-2 disabled:opacity-50">
                {testLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Terminal className="w-3.5 h-3.5" />}{testLoading ? 'Executando...' : 'Executar na API'}
              </button>
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-white/40">Resposta</label>
              <div className="mt-1 min-h-[245px] max-h-[320px] overflow-auto rounded-xl bg-[#060b13] border border-white/10 p-3 font-mono text-[11px]">
                {testError && <div className="text-red-400 flex gap-2"><AlertCircle className="w-4 h-4 shrink-0" />{testError}</div>}
                {testResponse && <pre className="text-emerald-300 whitespace-pre-wrap">{JSON.stringify(testResponse, null, 2)}</pre>}
                {!testError && !testResponse && !testLoading && <div className="h-[220px] flex flex-col items-center justify-center text-white/25"><CheckCircle2 className="w-6 h-6 mb-2" /><span>A resposta real aparecerá aqui.</span></div>}
              </div>
            </div>
          </div>
        </div>}
      </div>
    </div>
  );
};
