import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Check,
  Code2,
  Copy,
  ExternalLink,
  Key,
  RefreshCw,
  Send,
  ShieldCheck,
  Trash2,
  Webhook,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { CompanyPlan, CompanyStartup } from '../../types/platform';

interface IntegracoesViewProps {
  plans?: CompanyPlan[];
  company?: CompanyStartup | null;
}

type Action = 'generate-key' | 'revoke-key' | 'save-webhook' | 'test-webhook' | null;

const origin = () => typeof window !== 'undefined' ? window.location.origin : 'https://www.techify.sbs';

export const IntegracoesView: React.FC<IntegracoesViewProps> = ({ plans = [] }) => {
  const { currentUser } = useAuth();
  const [keyPrefix, setKeyPrefix] = useState('');
  const [freshKey, setFreshKey] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<Action>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const activePlans = useMemo(
    () => plans.filter((plan) => plan.status === 'Ativo' && plan.active !== false),
    [plans],
  );

  const authHeaders = async () => {
    if (!currentUser) throw new Error('Faça login novamente.');
    const token = await currentUser.getIdToken();
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  };

  const load = async () => {
    if (!currentUser) return;
    setLoading(true);
    setMessage(null);
    try {
      const headers = await authHeaders();
      const [keyRes, settingsRes] = await Promise.all([
        fetch('/api/partner/api-key', { headers, cache: 'no-store' }),
        fetch('/api/partner/settings', { headers, cache: 'no-store' }),
      ]);

      const keyData = await keyRes.json().catch(() => ({}));
      const settingsData = await settingsRes.json().catch(() => ({}));

      if (!keyRes.ok) {
        throw new Error(keyData.error || 'Não foi possível carregar a API Key.');
      }
      if (!settingsRes.ok) {
        throw new Error(settingsData.error || 'Não foi possível carregar o webhook.');
      }

      setKeyPrefix(keyData.key?.prefix || '');
      setFreshKey('');
      setWebhookUrl(settingsData.settings?.webhookUrl || '');
      setWebhookSecret(settingsData.settings?.webhookSecret || '');
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Não foi possível carregar integrações.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [currentUser?.uid]);

  const generateKey = async () => {
    setAction('generate-key');
    setMessage(null);
    try {
      const headers = await authHeaders();
      const res = await fetch('/api/partner/api-key', { method: 'POST', headers });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Falha ao gerar chave.');

      setFreshKey(data.apiKey || '');
      setKeyPrefix(data.key?.prefix || '');
      setMessage({
        type: 'success',
        text: 'Nova API Key criada. Copie a chave completa agora: por segurança, ela não será exibida novamente após recarregar a página.',
      });
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Falha ao gerar chave.' });
    } finally {
      setAction(null);
    }
  };

  const revokeKey = async () => {
    if (!keyPrefix) return;
    setAction('revoke-key');
    setMessage(null);
    try {
      const headers = await authHeaders();
      const res = await fetch('/api/partner/api-key', { method: 'DELETE', headers });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Falha ao revogar chave.');

      setKeyPrefix('');
      setFreshKey('');
      setMessage({ type: 'success', text: 'API Key revogada. Ela não pode mais criar pagamentos.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Falha ao revogar chave.' });
    } finally {
      setAction(null);
    }
  };

  const saveWebhook = async () => {
    setAction('save-webhook');
    setMessage(null);
    try {
      const headers = await authHeaders();
      const res = await fetch('/api/partner/settings', {
        method: 'POST',
        headers,
        body: JSON.stringify({ webhookUrl }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Falha ao salvar webhook.');

      setWebhookUrl(data.settings?.webhookUrl || '');
      setWebhookSecret(data.settings?.webhookSecret || '');
      setMessage({
        type: 'success',
        text: webhookUrl.trim()
          ? 'Webhook salvo. Eventos payment.succeeded serão assinados com HMAC SHA-256.'
          : 'Webhook removido.',
      });
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Falha ao salvar webhook.' });
    } finally {
      setAction(null);
    }
  };

  const testWebhook = async () => {
    if (!webhookUrl.trim()) {
      setMessage({ type: 'error', text: 'Salve primeiro uma URL HTTPS para testar o webhook.' });
      return;
    }

    setAction('test-webhook');
    setMessage(null);
    try {
      const headers = await authHeaders();
      const res = await fetch('/api/partner/test-webhook', {
        method: 'POST',
        headers,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `O endpoint respondeu com HTTP ${data.responseStatus || res.status}.`);
      }
      setMessage({
        type: 'success',
        text: `Webhook de teste entregue com sucesso${data.responseStatus ? ` (HTTP ${data.responseStatus})` : ''}.`,
      });
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Falha ao testar webhook.' });
    } finally {
      setAction(null);
    }
  };

  const copy = async (value: string, id: string) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(id);
      window.setTimeout(() => setCopied(null), 1800);
    } catch {
      setMessage({ type: 'error', text: 'Não foi possível copiar automaticamente. Selecione o texto manualmente.' });
    }
  };

  const examplePlan = activePlans[0];
  const apiUrl = `${origin()}/api/partner/payments`;
  const jsExample = examplePlan
    ? `const response = await fetch('${apiUrl}', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': process.env.LEADSPAY_API_KEY
  },
  body: JSON.stringify({
    planId: '${examplePlan.id}',
    buyerName: 'Cliente Exemplo',
    buyerEmail: 'cliente@exemplo.com',
    attemptId: crypto.randomUUID().replaceAll('-', '')
  })
});

if (!response.ok) {
  throw new Error(await response.text());
}

const payment = await response.json();
// Use payment.clientSecret com Stripe Elements no seu checkout.`
    : '// Cadastre uma oferta ativa para gerar o exemplo.';

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#080d1a] p-8 text-sm text-white/60">
        Carregando integrações reais...
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn" id="leadspay-integracoes-view">
      <div>
        <div className="text-xs font-bold uppercase tracking-widest text-[#D9F22A]">Integrações reais</div>
        <h1 className="text-2xl sm:text-3xl font-black text-white">API & Webhooks</h1>
        <p className="mt-1 max-w-3xl text-xs leading-5 text-white/55">
          Crie pagamentos para ofertas cadastradas, use links de checkout e receba eventos assinados no seu backend.
        </p>
      </div>

      {message && (
        <div
          role="status"
          className={`flex items-start gap-2 rounded-xl border p-3 text-xs ${
            message.type === 'error'
              ? 'border-red-500/20 bg-red-500/10 text-red-400'
              : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
          }`}
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{message.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <section className="rounded-2xl border border-white/10 bg-[#080d1a] p-5">
          <div className="mb-4 flex items-center gap-2">
            <Key className="h-4 w-4 text-[#D9F22A]" />
            <h2 className="font-bold text-white">API Key da empresa</h2>
          </div>

          <p className="mb-4 text-xs leading-5 text-white/50">
            A chave é criada no servidor e somente o hash fica armazenado. Regenerar revoga automaticamente a chave anterior.
          </p>

          <div className="rounded-xl border border-white/10 bg-[#050811] p-3 font-mono text-xs text-white/70 break-all">
            {freshKey || (keyPrefix ? `${keyPrefix}  •  chave ativa (valor completo oculto)` : 'Nenhuma chave ativa')}
          </div>

          {keyPrefix && !freshKey && (
            <p className="mt-2 text-[11px] leading-4 text-white/40">
              O valor completo não pode ser recuperado depois. Se você perdeu a chave, gere uma nova.
            </p>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            {freshKey && (
              <button
                type="button"
                onClick={() => copy(freshKey, 'key')}
                className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white transition hover:bg-white/10"
              >
                {copied === 'key' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                Copiar chave completa
              </button>
            )}

            <button
              type="button"
              disabled={action !== null}
              onClick={generateKey}
              className="flex items-center gap-2 rounded-lg bg-[#D9F22A] px-3 py-2 text-xs font-black text-[#060A15] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${action === 'generate-key' ? 'animate-spin' : ''}`} />
              {keyPrefix ? 'Regenerar' : 'Gerar chave'}
            </button>

            {keyPrefix && (
              <button
                type="button"
                disabled={action !== null}
                onClick={revokeKey}
                className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Revogar
              </button>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#080d1a] p-5">
          <div className="mb-4 flex items-center gap-2">
            <Webhook className="h-4 w-4 text-[#D9F22A]" />
            <h2 className="font-bold text-white">Webhook do parceiro</h2>
          </div>

          <label className="text-xs text-white/60" htmlFor="leadspay-webhook-url">URL HTTPS</label>
          <input
            id="leadspay-webhook-url"
            value={webhookUrl}
            onChange={(event) => setWebhookUrl(event.target.value)}
            placeholder="https://seusite.com/api/webhooks/leadspay"
            className="mt-2 w-full rounded-xl border border-white/10 bg-[#050811] px-3 py-2.5 text-xs text-white outline-none focus:border-[#D9F22A]/50"
          />

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={action !== null}
              onClick={saveWebhook}
              className="rounded-xl bg-[#D9F22A] px-4 py-2.5 text-xs font-black text-[#060A15] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {action === 'save-webhook' ? 'Salvando...' : 'Salvar webhook'}
            </button>

            <button
              type="button"
              disabled={action !== null || !webhookUrl.trim()}
              onClick={testWebhook}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Send className="h-3.5 w-3.5" />
              {action === 'test-webhook' ? 'Testando...' : 'Enviar teste'}
            </button>
          </div>

          {webhookSecret && (
            <div className="mt-4">
              <div className="mb-1 text-[11px] text-white/45">Segredo para validar x-leadspay-signature</div>
              <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#050811] p-2.5">
                <div className="min-w-0 flex-1 break-all font-mono text-[10px] text-white/60">{webhookSecret}</div>
                <button
                  type="button"
                  onClick={() => copy(webhookSecret, 'secret')}
                  className="shrink-0 rounded-md p-1.5 text-white/50 transition hover:bg-white/5 hover:text-white"
                  aria-label="Copiar segredo do webhook"
                >
                  {copied === 'secret' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}

          <p className="mt-3 text-[11px] leading-4 text-white/40">
            O teste envia o evento <code className="text-[#D9F22A]">integration.test</code>. Vendas reais enviam <code className="text-[#D9F22A]">payment.succeeded</code>.
          </p>
        </section>
      </div>

      <section className="rounded-2xl border border-white/10 bg-[#080d1a] p-5">
        <div className="mb-4 flex items-center gap-2">
          <Code2 className="h-4 w-4 text-[#D9F22A]" />
          <h2 className="font-bold text-white">Criar pagamento pela API</h2>
        </div>
        <div className="mb-2 text-xs text-white/50">
          POST <code className="text-[#D9F22A]">{apiUrl}</code>
        </div>
        <pre className="overflow-x-auto rounded-xl border border-white/10 bg-[#050811] p-4 text-[11px] leading-5 text-white/70">
          <code>{jsExample}</code>
        </pre>
        <button
          type="button"
          onClick={() => copy(jsExample, 'code')}
          className="mt-3 flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white transition hover:bg-white/10"
        >
          {copied === 'code' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          Copiar exemplo
        </button>
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#080d1a] p-5">
        <div className="mb-3 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-[#D9F22A]" />
          <h2 className="font-bold text-white">Links sem código</h2>
        </div>

        {activePlans.length === 0 ? (
          <p className="text-xs text-white/45">Cadastre uma oferta ativa para gerar um checkout real.</p>
        ) : (
          <div className="space-y-2">
            {activePlans.slice(0, 10).map((plan) => {
              const url = `${origin()}/checkout/${encodeURIComponent(plan.checkoutSlug || plan.slug || plan.id)}`;
              return (
                <div key={plan.id} className="flex items-center gap-2 rounded-xl border border-white/5 bg-[#050811] p-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-white">{plan.name}</div>
                    <div className="truncate font-mono text-[10px] text-white/35">{url}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => copy(url, plan.id)}
                    className="rounded-md p-2 text-white/60 transition hover:bg-white/5 hover:text-white"
                    aria-label={`Copiar checkout de ${plan.name}`}
                  >
                    {copied === plan.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </button>
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-md p-2 text-[#D9F22A] transition hover:bg-white/5"
                    aria-label={`Abrir checkout de ${plan.name}`}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
