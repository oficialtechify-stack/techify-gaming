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
  WandSparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserRoleMode } from '../../types/platform';

interface ApiKeySectionProps {
  roleMode?: UserRoleMode;
  profileStatus?: string;
  onNavigateToProfile?: () => void;
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

type Tab = 'connect' | 'prompts' | 'advanced';
type TestAction =
  | 'get_balance'
  | 'list_products'
  | 'get_affiliations'
  | 'get_affiliate_performance'
  | 'list_affiliate_coupons'
  | 'create_coupon'
  | 'list_coupons'
  | 'create_checkout';

export const ApiKeySection: React.FC<ApiKeySectionProps> = ({
  roleMode = 'afiliado',
  profileStatus = 'unsubmitted',
  onNavigateToProfile,
}) => {
  const { currentUser } = useAuth();
  const isAffiliate = roleMode === 'afiliado';
  const [keyMeta, setKeyMeta] = useState<KeyMeta | null>(null);
  const [currentKey, setCurrentKey] = useState('');
  const [showFullKey, setShowFullKey] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [loadingKey, setLoadingKey] = useState(true);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [keyError, setKeyError] = useState('');
  const [serviceOnline, setServiceOnline] = useState<boolean | null>(null);
  const [apiEligible, setApiEligible] = useState(profileStatus === 'approved');
  const [activeTab, setActiveTab] = useState<Tab>('connect');
  const [testAction, setTestAction] = useState<TestAction>('get_balance');
  const [testParams, setTestParams] = useState('');
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
      Authorization: 'Bearer ' + token,
    };
  };

  const copy = async (text: string, id: string) => {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 1800);
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
      const res = await fetch('/api/partner/api-key', { headers, cache: 'no-store' });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 403) {
          setApiEligible(false);
          setKeyMeta(null);
          setCurrentKey('');
          if (sessionKeyName) sessionStorage.removeItem(sessionKeyName);
          return;
        }
        throw new Error(data.error || 'Não foi possível carregar a integração.');
      }

      const serverRoleStatus = String(data.roleStatus?.[roleMode] || '').toLowerCase();
      const serverAllowedRoles = Array.isArray(data.allowedRoles) ? data.allowedRoles.map(String) : [];
      const roleEligible = serverRoleStatus === 'approved' && serverAllowedRoles.includes(roleMode);
      setApiEligible(roleEligible);
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
        setKeyError('Existe uma chave antiga nesta conta. Gere uma nova chave segura para continuar.');
      }
    } catch (error: any) {
      setKeyError(error?.message || 'Falha ao carregar a integração.');
    } finally {
      setLoadingKey(false);
    }
  };

  useEffect(() => {
    void loadKey();
    fetch('/api/mcp/v1/status', { cache: 'no-store' })
      .then((res) => setServiceOnline(res.ok))
      .catch(() => setServiceOnline(false));
  }, [currentUser?.uid, roleMode, profileStatus]);

  const generateKey = async () => {
    if (!apiEligible) return;
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
      setShowFullKey(false);
      setKeyMeta(data.key || null);
      if (sessionKeyName) sessionStorage.setItem(sessionKeyName, data.apiKey);
    } catch (error: any) {
      setKeyError(error?.message || 'Falha ao gerar a API Key.');
    } finally {
      setIsRegenerating(false);
    }
  };

  const revokeKey = async () => {
    if (!keyMeta) return;
    if (!confirm('Revogar a chave atual? As IAs conectadas com ela deixarão de acessar sua conta imediatamente.')) return;

    setIsRegenerating(true);
    setKeyError('');
    try {
      const headers = await tokenHeaders();
      const res = await fetch('/api/partner/api-key', { method: 'DELETE', headers });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Não foi possível revogar a chave.');
      setCurrentKey('');
      setShowFullKey(false);
      setKeyMeta(null);
      if (sessionKeyName) sessionStorage.removeItem(sessionKeyName);
    } catch (error: any) {
      setKeyError(error?.message || 'Falha ao revogar a chave.');
    } finally {
      setIsRegenerating(false);
    }
  };

  const availableTestActions = useMemo<TestAction[]>(() => {
    if (isAffiliate) {
      return [
        'get_balance',
        'get_affiliations',
        'get_affiliate_performance',
        'list_affiliate_coupons',
        'list_products',
        'create_checkout',
      ];
    }
    return ['get_balance', 'list_products', 'list_coupons', 'create_coupon', 'create_checkout'];
  }, [isAffiliate]);

  const payloadFor = (action: TestAction) => {
    if (action === 'get_balance') {
      return { action, params: { role: isAffiliate ? 'afiliado' : 'empresa' } };
    }
    if (action === 'list_products') {
      return { action, params: { limit: 5 } };
    }
    if (action === 'get_affiliations' || action === 'list_affiliate_coupons' || action === 'list_coupons') {
      return { action, params: {} };
    }
    if (action === 'get_affiliate_performance') {
      return { action, params: { days: 30 } };
    }
    if (action === 'create_coupon') {
      return {
        action,
        params: {
          code: 'CLIENTE15',
          discount: 15,
          discountType: 'percentage',
          maxUses: 50,
          planId: 'all',
        },
      };
    }
    return { action, params: { productId: 'COLE_O_ID_DO_PRODUTO', couponCode: '' } };
  };

  const selectTestAction = (action: TestAction) => {
    setTestAction(action);
    setTestParams(JSON.stringify(payloadFor(action), null, 2));
    setTestResponse(null);
    setTestError('');
  };

  useEffect(() => {
    const next = availableTestActions.includes(testAction) ? testAction : availableTestActions[0];
    selectTestAction(next);
  }, [roleMode]);

  const runTest = async () => {
    if (!currentKey) {
      setTestError('Gere uma nova chave nesta sessão para usar o testador ao vivo.');
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
          Authorization: 'Bearer ' + currentKey,
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

  const mcpConfig = JSON.stringify({
    url: mcpEndpointUrl,
    headers: {
      Authorization: 'Bearer ' + (currentKey || 'SUA_CHAVE_LEADSPAY'),
    },
  }, null, 2);

  const prompts = isAffiliate
    ? [
        {
          title: 'Analisar meu desempenho',
          text: 'Analise meu desempenho de afiliado na LeadsPay nos últimos 30 dias. Mostre vendas aprovadas, comissão, cliques, conversão e o que merece minha atenção.',
        },
        {
          title: 'Ver minhas afiliações',
          text: 'Liste minhas afiliações ativas com produto, empresa, percentual de comissão e link oficial para divulgação.',
        },
        {
          title: 'Encontrar oportunidade',
          text: 'Liste produtos ativos do marketplace LeadsPay e me mostre as melhores oportunidades por comissão, sem inventar dados que não vieram da plataforma.',
        },
        {
          title: 'Cupons disponíveis',
          text: 'Mostre os cupons liberados para minhas afiliações ativas e gere o link correto com meu código de afiliado quando houver.',
        },
        {
          title: 'Consultar saldo',
          text: 'Consulte meu saldo de afiliado e separe o valor disponível do valor que ainda está aguardando liberação.',
        },
        {
          title: 'Gerar checkout',
          text: 'Gere um checkout oficial para um produto em que eu já esteja afiliado. Use somente meu código de afiliado ativo.',
        },
      ]
    : [
        {
          title: 'Consultar saldo',
          text: 'Consulte o saldo da minha empresa na LeadsPay e informe o que está disponível e o que ainda está pendente.',
        },
        {
          title: 'Listar produtos',
          text: 'Liste minhas ofertas ativas na LeadsPay com preço e link oficial.',
        },
        {
          title: 'Criar cupom',
          text: 'Crie o cupom CLIENTE15 com 15% de desconto, 100 usos e válido para todas as minhas ofertas elegíveis.',
        },
        {
          title: 'Gerar checkout',
          text: 'Gere um link oficial de checkout para o produto que eu indicar sem inventar produto ou cupom.',
        },
      ];

  const tools = isAffiliate
    ? [
        ['get_balance', 'Saldo e valores a liberar'],
        ['get_affiliations', 'Suas afiliações e links'],
        ['get_affiliate_performance', 'Vendas, cliques e conversão'],
        ['list_affiliate_coupons', 'Cupons liberados para você'],
        ['list_products', 'Marketplace de produtos'],
        ['create_checkout', 'Checkout com seu código ativo'],
      ]
    : [
        ['get_balance', 'Saldo da empresa'],
        ['list_products', 'Produtos da empresa'],
        ['list_coupons', 'Cupons cadastrados'],
        ['create_coupon', 'Criar cupom'],
        ['create_checkout', 'Gerar checkout'],
      ];

  const hasActiveKey = Boolean(keyMeta && (keyMeta.allowedRoles || []).includes(roleMode));
  const statusClass = serviceOnline === true
    ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
    : serviceOnline === false
      ? 'border-red-500/20 bg-red-500/10 text-red-300'
      : 'border-white/10 bg-white/5 text-white/45';

  return (
    <section className="overflow-hidden rounded-3xl border border-white/10 bg-[#070d18]" id="leadspay-ai-key-section">
      <div className="border-b border-white/8 px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-['Syne'] text-lg font-black text-white">Conectar sua IA</h2>
              <span className={'rounded-full border px-2.5 py-1 text-[10px] font-black ' + statusClass}>
                {serviceOnline === true ? 'Serviço online' : serviceOnline === false ? 'Serviço indisponível' : 'Verificando serviço'}
              </span>
            </div>
            <p className="mt-1 text-xs leading-5 text-white/45">
              {isAffiliate
                ? 'Sua IA recebe somente os dados e ações do seu perfil de afiliado que a LeadsPay autorizar.'
                : 'A chave respeita as permissões e o tenant da empresa autenticada.'}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-[10px] lg:min-w-[420px]">
            <div className={`rounded-xl border px-3 py-2.5 ${apiEligible ? 'border-emerald-500/20 bg-emerald-500/[0.06]' : 'border-amber-500/20 bg-amber-500/[0.06]'}`}>
              <div className={`font-black ${apiEligible ? 'text-emerald-300' : 'text-amber-300'}`}>1. Perfil</div>
              <div className="mt-1 text-white/45">{apiEligible ? 'Aprovado' : 'Pendente'}</div>
            </div>
            <div className={`rounded-xl border px-3 py-2.5 ${hasActiveKey ? 'border-emerald-500/20 bg-emerald-500/[0.06]' : 'border-white/8 bg-white/[0.025]'}`}>
              <div className={`font-black ${hasActiveKey ? 'text-emerald-300' : 'text-white/55'}`}>2. Chave</div>
              <div className="mt-1 text-white/45">{hasActiveKey ? 'Ativa' : 'Não criada'}</div>
            </div>
            <div className="rounded-xl border border-white/8 bg-white/[0.025] px-3 py-2.5">
              <div className="font-black text-white/55">3. IA</div>
              <div className="mt-1 text-white/45">Conectar</div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-5 p-4 sm:p-6">
        {!apiEligible ? (
          <div className="flex flex-col gap-4 rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-black text-amber-200">
                <ShieldCheck className="h-4 w-4" />
                A integração ainda está bloqueada
              </div>
              <p className="mt-1.5 max-w-2xl text-[11px] leading-5 text-white/50">
                Conclua a Stripe, envie seu perfil para análise e aguarde a aprovação. Depois disso o botão de gerar chave será liberado automaticamente.
              </p>
            </div>
            {onNavigateToProfile && (
              <button
                type="button"
                onClick={onNavigateToProfile}
                className="shrink-0 rounded-xl bg-amber-400 px-4 py-2.5 text-xs font-black text-[#111827]"
              >
                Ver Meu Perfil
              </button>
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-white/8 bg-[#050a12] p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Key className="h-4 w-4 text-[#D9F22A]" />
                  <span className="text-xs font-black uppercase tracking-wider text-white">Chave LeadsPay</span>
                </div>
                <div className="mt-2 flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-[#080f1c] px-3.5">
                  <span className="min-w-0 flex-1 truncate font-mono text-xs text-emerald-300">
                    {loadingKey
                      ? 'Carregando...'
                      : currentKey
                        ? showFullKey
                          ? currentKey
                          : currentKey.slice(0, 10) + '••••••••••••••••••••••'
                        : hasActiveKey ? keyMeta?.prefix || 'Chave ativa' : 'Nenhuma chave ativa para este perfil'}
                  </span>
                  {currentKey && (
                    <button
                      type="button"
                      onClick={() => setShowFullKey((value) => !value)}
                      className="shrink-0 rounded-lg border border-white/8 bg-white/[0.03] px-2.5 py-1.5 text-[10px] font-bold text-white/55 hover:text-white"
                    >
                      {showFullKey ? 'Ocultar' : 'Mostrar'}
                    </button>
                  )}
                </div>
                <p className="mt-2 text-[10px] leading-4 text-white/35">
                  {currentKey
                    ? 'Esta é a única vez que a chave completa fica disponível nesta sessão. Copie e guarde com segurança.'
                    : hasActiveKey
                      ? 'Existe uma chave ativa para este perfil. Por segurança, o valor completo não pode ser recuperado; regenere apenas se precisar substituí-la.'
                      : 'Gere uma chave para conectar ChatGPT, Gemini, OpenAPI ou MCP.'}
                </p>
              </div>

              <div className="flex flex-wrap gap-2 lg:max-w-[360px] lg:justify-end">
                {currentKey && (
                  <button
                    type="button"
                    onClick={() => void copy(currentKey, 'key')}
                    className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#D9F22A] px-4 text-xs font-black text-[#07100a]"
                  >
                    {copied === 'key' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied === 'key' ? 'Chave copiada' : 'Copiar chave'}
                  </button>
                )}
                <button
                  type="button"
                  disabled={isRegenerating}
                  onClick={() => void generateKey()}
                  className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-xs font-bold text-white transition hover:bg-white/10 disabled:opacity-40"
                >
                  <RefreshCw className={'h-3.5 w-3.5 ' + (isRegenerating ? 'animate-spin' : '')} />
                  {hasActiveKey ? 'Regenerar' : 'Gerar chave'}
                </button>
                {keyMeta && (
                  <button
                    type="button"
                    disabled={isRegenerating}
                    onClick={() => void revokeKey()}
                    className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3.5 text-xs font-bold text-red-300 disabled:opacity-40"
                    title="Revogar chave"
                  >
                    <Trash2 className="h-4 w-4" />
                    Revogar
                  </button>
                )}
              </div>
            </div>

            {keyMeta && (
              <div className="mt-3 flex flex-wrap gap-2 text-[10px]">
                <span className="rounded-lg border border-white/8 bg-white/[0.03] px-2 py-1 text-white/45">
                  {keyMeta.environment === 'production' ? 'Produção' : keyMeta.environment || 'Ativa'}
                </span>
                {(keyMeta.allowedRoles || []).map((role) => (
                  <span key={role} className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-emerald-300">
                    {role}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {keyError && (
          <div className="flex gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{keyError}</span>
          </div>
        )}

        <div className="grid grid-cols-3 gap-1 rounded-2xl border border-white/8 bg-[#050a12] p-1">
          {([
            ['connect', 'Conectar', Bot],
            ['prompts', 'Como usar', Sparkles],
            ['advanced', 'Avançado', Code2],
          ] as const).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`flex min-h-10 items-center justify-center gap-2 rounded-xl px-3 text-xs font-black transition ${
                activeTab === id
                  ? 'bg-[#D9F22A] text-[#07100a]'
                  : 'text-white/45 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        {activeTab === 'connect' && (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            <article className="rounded-2xl border border-white/8 bg-[#080e19] p-4">
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-[#D9F22A]" />
                <h3 className="text-xs font-black text-white">ChatGPT Actions</h3>
              </div>
              <p className="mt-2 text-[11px] leading-5 text-white/45">
                Importe o schema da LeadsPay na Action do seu GPT e use a chave acima como Bearer.
              </p>
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-white/8 bg-[#050a12] p-2.5">
                <code className="min-w-0 flex-1 truncate text-[10px] text-emerald-300">{openApiUrl}</code>
                <button type="button" onClick={() => void copy(openApiUrl, 'openapi')} className="rounded-lg bg-white/5 p-2 text-white/60">
                  {copied === 'openapi' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            </article>

            <article className="rounded-2xl border border-white/8 bg-[#080e19] p-4">
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-cyan-300" />
                <h3 className="text-xs font-black text-white">MCP remoto</h3>
              </div>
              <p className="mt-2 text-[11px] leading-5 text-white/45">
                Para clientes compatíveis com MCP. O servidor usa as mesmas permissões da sua chave.
              </p>
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-white/8 bg-[#050a12] p-2.5">
                <code className="min-w-0 flex-1 truncate text-[10px] text-cyan-300">{mcpEndpointUrl}</code>
                <button type="button" onClick={() => void copy(mcpEndpointUrl, 'mcp-url')} className="rounded-lg bg-white/5 p-2 text-white/60">
                  {copied === 'mcp-url' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            </article>

            <article className="rounded-2xl border border-white/8 bg-[#080e19] p-4">
              <div className="flex items-center gap-2">
                <WandSparkles className="h-4 w-4 text-purple-300" />
                <h3 className="text-xs font-black text-white">Gemini / OpenAPI</h3>
              </div>
              <p className="mt-2 text-[11px] leading-5 text-white/45">
                Use o mesmo schema em agentes compatíveis com OpenAPI ou faça chamadas REST autenticadas.
              </p>
              <a
                href="/openapi.json"
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5 text-[11px] font-bold text-white/70"
              >
                Abrir OpenAPI 3.1
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </article>

            <div className="lg:col-span-3 rounded-2xl border border-[#D9F22A]/15 bg-[#D9F22A]/[0.035] p-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[#D9F22A]" />
                <h3 className="text-xs font-black text-white">
                  {isAffiliate ? 'Ações disponíveis para o afiliado' : 'Ações disponíveis para a empresa'}
                </h3>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {tools.map(([name, description]) => (
                  <div key={name} className="rounded-xl border border-white/8 bg-[#050a12] px-3 py-2.5">
                    <div className="font-mono text-[10px] font-bold text-[#D9F22A]">{name}</div>
                    <div className="mt-1 text-[10px] text-white/40">{description}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'prompts' && (
          <div>
            <div className="mb-3">
              <h3 className="text-sm font-black text-white">Exemplos prontos</h3>
              <p className="mt-1 text-[11px] text-white/45">Copie uma pergunta e envie para a IA depois que a integração estiver conectada.</p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {prompts.map((item) => (
                <article key={item.title} className="rounded-2xl border border-white/8 bg-[#080e19] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-black text-[#D9F22A]">{item.title}</h4>
                      <p className="mt-2 text-xs leading-5 text-white/60">“{item.text}”</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void copy(item.text, item.title)}
                      className="shrink-0 rounded-lg border border-white/8 bg-white/[0.03] p-2 text-white/50"
                    >
                      {copied === item.title ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'advanced' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              <article className="rounded-2xl border border-white/8 bg-[#080e19] p-4">
                <div className="flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-cyan-300" />
                  <h3 className="text-xs font-black text-white">Configuração MCP</h3>
                </div>
                <pre className="mt-3 overflow-x-auto rounded-xl border border-white/8 bg-[#050a12] p-3 text-[10px] text-cyan-300">{mcpConfig}</pre>
                <button type="button" onClick={() => void copy(mcpConfig, 'mcp-config')} className="mt-2 inline-flex items-center gap-2 text-[11px] font-bold text-white/55">
                  <Copy className="h-3.5 w-3.5" />
                  {copied === 'mcp-config' ? 'Configuração copiada' : 'Copiar configuração'}
                </button>
              </article>

              <article className="rounded-2xl border border-white/8 bg-[#080e19] p-4">
                <div className="flex items-center gap-2">
                  <Code2 className="h-4 w-4 text-purple-300" />
                  <h3 className="text-xs font-black text-white">REST / OpenAPI</h3>
                </div>
                <p className="mt-2 text-[11px] leading-5 text-white/45">
                  Endpoint principal: <span className="font-mono text-purple-300">{actionEndpointUrl}</span>
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <a href="/openapi.json" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-[11px] font-bold text-white/65">
                    <ExternalLink className="h-3.5 w-3.5" />
                    Abrir schema
                  </a>
                  <button type="button" onClick={() => void copy(actionEndpointUrl, 'rest-url')} className="inline-flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-[11px] font-bold text-white/65">
                    <Copy className="h-3.5 w-3.5" />
                    Copiar endpoint
                  </button>
                </div>
              </article>
            </div>

            <article className="rounded-2xl border border-white/8 bg-[#080e19] p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Play className="h-4 w-4 text-[#D9F22A]" />
                    <h3 className="text-xs font-black text-white">Testador ao vivo</h3>
                  </div>
                  <p className="mt-1 text-[10px] text-white/40">Executa uma chamada real usando a chave criada nesta sessão.</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {availableTestActions.map((action) => (
                    <button
                      key={action}
                      type="button"
                      onClick={() => selectTestAction(action)}
                      className={`rounded-lg px-2.5 py-1.5 font-mono text-[9px] font-bold ${
                        testAction === action ? 'bg-[#D9F22A] text-[#07100a]' : 'bg-white/5 text-white/45'
                      }`}
                    >
                      {action}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-white/35">Requisição</label>
                  <textarea
                    rows={10}
                    value={testParams}
                    onChange={(event) => setTestParams(event.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-white/8 bg-[#050a12] p-3 font-mono text-[10px] text-emerald-300 outline-none focus:border-[#D9F22A]/40"
                  />
                  <button
                    type="button"
                    disabled={testLoading || !currentKey}
                    onClick={() => void runTest()}
                    className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#D9F22A] py-2.5 text-xs font-black text-[#07100a] disabled:opacity-40"
                  >
                    {testLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Terminal className="h-3.5 w-3.5" />}
                    {testLoading ? 'Executando...' : currentKey ? 'Executar na API' : 'Gere a chave para testar'}
                  </button>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-white/35">Resposta</label>
                  <div className="mt-1.5 min-h-[286px] max-h-[360px] overflow-auto rounded-xl border border-white/8 bg-[#050a12] p-3 font-mono text-[10px]">
                    {testError && (
                      <div className="flex gap-2 text-red-300">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        {testError}
                      </div>
                    )}
                    {testResponse && <pre className="whitespace-pre-wrap text-emerald-300">{JSON.stringify(testResponse, null, 2)}</pre>}
                    {!testError && !testResponse && !testLoading && (
                      <div className="flex min-h-[250px] flex-col items-center justify-center text-center text-white/25">
                        <CheckCircle2 className="mb-2 h-6 w-6" />
                        <span>A resposta real aparecerá aqui.</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </article>
          </div>
        )}
      </div>
    </section>
  );
};
