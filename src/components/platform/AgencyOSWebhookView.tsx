import React, { useState, useEffect } from 'react';
import { 
  Radio, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Copy, 
  Check, 
  RefreshCw, 
  Send, 
  Shield, 
  Lock, 
  Globe, 
  Key, 
  Building2, 
  Activity, 
  Terminal, 
  Clock, 
  Code2, 
  Trash2, 
  ExternalLink,
  ChevronRight,
  Zap,
  Sliders,
  FileJson,
  Sparkles
} from 'lucide-react';
import { 
  AgencyOSWebhookConfig, 
  AgencyOSWebhookLog, 
  AgencyOSWebhookPayload,
  isAgencyOSAuthorized,
  AGENCY_OS_AUTHORIZED_EMAILS
} from '../../services/webhookDispatcher';
import { db } from '../../lib/firebase';
import { collection, query, orderBy, limit, onSnapshot, doc, getDoc, setDoc } from 'firebase/firestore';

interface AgencyOSWebhookViewProps {
  userEmail?: string;
}

const DEFAULT_EVENTS: { id: AgencyOSWebhookPayload['event']; name: string; description: string; tag: string }[] = [
  {
    id: 'sale.approved',
    name: 'sale.approved',
    description: 'Disparado no momento exato em que uma venda é aprovada e o pagamento é confirmado (PIX, Boleto ou Cartão).',
    tag: 'Financeiro'
  },
  {
    id: 'company.activated',
    name: 'company.activated',
    description: 'Disparado quando uma nova empresa ou agência é ativada ou confirma a contratação de um plano no sistema.',
    tag: 'Empresas'
  },
  {
    id: 'affiliate.commission',
    name: 'affiliate.commission',
    description: 'Disparado quando uma nova comissão é registrada ou liberada na carteira de um afiliado parceiro.',
    tag: 'Afiliados'
  },
  {
    id: 'balance.updated',
    name: 'balance.updated',
    description: 'Disparado quando o saldo da conta da agência/empresa é atualizado após vendas, taxas ou liquidação.',
    tag: 'Saldo & Carteira'
  }
];

export const AgencyOSWebhookView: React.FC<AgencyOSWebhookViewProps> = ({ userEmail = '' }) => {
  const isAuthorized = isAgencyOSAuthorized(userEmail);

  // Estados de Configuração
  const [webhookUrl, setWebhookUrl] = useState('');
  const [secretToken, setSecretToken] = useState('');
  const [agencyId, setAgencyId] = useState('agency_leadspay');
  const [enabled, setEnabled] = useState(true);
  const [selectedEvents, setSelectedEvents] = useState<string[]>([
    'sale.approved',
    'company.activated',
    'affiliate.commission',
    'balance.updated'
  ]);

  // Estados de Interface e Feedback
  const [showToken, setShowToken] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Estados de Teste e Simulação
  const [testEvent, setTestEvent] = useState<AgencyOSWebhookPayload['event']>('sale.approved');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    status: number;
    body?: string;
    error?: string;
    durationMs?: number;
    payloadSent?: any;
  } | null>(null);

  // Histórico de Logs
  const [logs, setLogs] = useState<AgencyOSWebhookLog[]>([]);
  const [selectedLog, setSelectedLog] = useState<AgencyOSWebhookLog | null>(null);
  const [activeTab, setActiveTab] = useState<'config' | 'simulator' | 'logs' | 'docs'>('config');

  // Carrega a configuração do backend/Firestore/LocalStorage
  useEffect(() => {
    const fetchConfig = async () => {
      setLoadingConfig(true);
      try {
        let loaded = false;

        // 1. Tenta API do backend
        try {
          const res = await fetch('/api/agencyos/config', {
            headers: {
              'x-user-email': userEmail || 'admin@leadspay.com'
            }
          });

          if (res.ok) {
            const data = await res.json();
            if (data && (data.webhookUrl || data.secretToken || data.agency_id)) {
              if (data.webhookUrl) setWebhookUrl(data.webhookUrl);
              if (data.secretToken) setSecretToken(data.secretToken);
              if (data.agency_id) setAgencyId(data.agency_id);
              setEnabled(data.enabled !== false);
              if (Array.isArray(data.events) && data.events.length > 0) {
                setSelectedEvents(data.events);
              }
              loaded = true;
            }
          }
        } catch (apiErr) {
          console.warn('Aviso ao consultar /api/agencyos/config:', apiErr);
        }

        // 2. Fallback Firestore direto
        if (!loaded) {
          try {
            const snap = await getDoc(doc(db, 'system_settings', 'agencyos_webhook'));
            if (snap.exists()) {
              const data = snap.data();
              if (data.webhookUrl) setWebhookUrl(data.webhookUrl);
              if (data.secretToken) setSecretToken(data.secretToken);
              if (data.agency_id) setAgencyId(data.agency_id);
              setEnabled(data.enabled !== false);
              if (Array.isArray(data.events)) setSelectedEvents(data.events);
              loaded = true;
            }
          } catch (dbErr) {
            console.warn('Aviso ao carregar Firestore:', dbErr);
          }
        }

        // 3. Fallback LocalStorage
        if (!loaded) {
          try {
            const savedLocal = localStorage.getItem('leadspay_agencyos_webhook_config');
            if (savedLocal) {
              const data = JSON.parse(savedLocal);
              if (data.webhookUrl) setWebhookUrl(data.webhookUrl);
              if (data.secretToken) setSecretToken(data.secretToken);
              if (data.agency_id) setAgencyId(data.agency_id);
              setEnabled(data.enabled !== false);
              if (Array.isArray(data.events)) setSelectedEvents(data.events);
              loaded = true;
            }
          } catch {}
        }

        // Se ainda não houver token configurado, gera um token inicial amigável
        setSecretToken(prev => prev || 'whsec_agencyos_' + Math.random().toString(36).substring(2, 12) + Math.random().toString(36).substring(2, 12));
      } catch (err: any) {
        console.warn('Erro ao carregar config AgencyOS:', err);
      } finally {
        setLoadingConfig(false);
      }
    };

    fetchConfig();
  }, [userEmail]);

  // Listener em tempo real dos logs no Firestore
  useEffect(() => {
    if (!isAuthorized) return;

    try {
      const logsColl = collection(db, 'agencyos_webhook_logs');
      const q = query(logsColl, orderBy('createdAt', 'desc'), limit(30));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const items: AgencyOSWebhookLog[] = [];
        snapshot.forEach((d) => {
          items.push({ id: d.id, ...d.data() } as AgencyOSWebhookLog);
        });
        setLogs(items);
      }, (err) => {
        console.warn('Aviso no listener de logs:', err);
      });

      return () => unsubscribe();
    } catch (err) {
      console.warn('Erro ao conectar logs do Firestore:', err);
    }
  }, [isAuthorized]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleGenerateSecret = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';
    let token = 'whsec_agencyos_';
    for (let i = 0; i < 32; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setSecretToken(token);
  };

  const toggleEvent = (eventId: string) => {
    setSelectedEvents(prev => 
      prev.includes(eventId) ? prev.filter(e => e !== eventId) : [...prev, eventId]
    );
  };

  const handleSaveConfig = async () => {
    let cleanUrl = (webhookUrl || '').trim();
    if (cleanUrl && !cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = 'https://' + cleanUrl;
      setWebhookUrl(cleanUrl);
    }

    let tokenToSave = (secretToken || '').trim();
    if (!tokenToSave) {
      tokenToSave = 'whsec_agencyos_' + Math.random().toString(36).substring(2, 12) + Math.random().toString(36).substring(2, 12);
      setSecretToken(tokenToSave);
    }

    setSaving(true);
    setErrorMessage('');
    setSaveSuccess(false);

    const configData = {
      webhookUrl: cleanUrl,
      secretToken: tokenToSave,
      agency_id: (agencyId || '').trim() || 'agency_leadspay',
      enabled,
      events: selectedEvents,
      updatedAt: new Date().toISOString(),
      updatedBy: userEmail || 'admin@leadspay.com'
    };

    try {
      // 1. Salva via API Express
      const res = await fetch('/api/agencyos/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': userEmail || 'admin@leadspay.com'
        },
        body: JSON.stringify(configData)
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Falha ao salvar configurações no servidor.');
      }

      // 2. Persistência de redundância no Firestore e LocalStorage
      try {
        localStorage.setItem('leadspay_agencyos_webhook_config', JSON.stringify(configData));
        await setDoc(doc(db, 'system_settings', 'agencyos_webhook'), configData, { merge: true });
      } catch (storageErr) {
        console.warn('Persistência secundária client-side:', storageErr);
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 8000);
    } catch (err: any) {
      console.warn('Aviso ao salvar via API (tentando persistência direta):', err);
      // Fallback seguro: persiste direto no Firestore e LocalStorage
      try {
        localStorage.setItem('leadspay_agencyos_webhook_config', JSON.stringify(configData));
        await setDoc(doc(db, 'system_settings', 'agencyos_webhook'), configData, { merge: true });
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 8000);
      } catch (fbErr: any) {
        setErrorMessage(err.message || fbErr?.message || 'Erro ao salvar configuração.');
        setTimeout(() => setErrorMessage(''), 5000);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleRunTest = async (overrideEvent?: AgencyOSWebhookPayload['event']) => {
    const targetEvent = overrideEvent || testEvent;
    let cleanUrl = (webhookUrl || '').trim();
    if (!cleanUrl) {
      setErrorMessage('Por favor, informe a URL do Webhook do AgencyOS antes de realizar o teste.');
      setTimeout(() => setErrorMessage(''), 4000);
      return;
    }

    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = 'https://' + cleanUrl;
      setWebhookUrl(cleanUrl);
    }

    setTesting(true);
    setTestResult(null);
    setErrorMessage('');

    try {
      const res = await fetch('/api/agencyos/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': userEmail || 'admin@leadspay.com'
        },
        body: JSON.stringify({
          event: targetEvent,
          webhookUrl: cleanUrl,
          secretToken: (secretToken || '').trim(),
          agency_id: (agencyId || '').trim() || 'agency_leadspay'
        })
      });

      const data = await res.json();
      setTestResult(data);
    } catch (err: any) {
      setTestResult({
        success: false,
        status: 0,
        error: err.message || 'Erro ao conectar com o serviço de webhook.'
      });
    } finally {
      setTesting(false);
    }
  };

  const handleClearLogs = async () => {
    if (!confirm('Deseja limpar todos os registros do histórico de disparos do AgencyOS?')) return;
    try {
      await fetch('/api/agencyos/logs/clear', {
        method: 'POST',
        headers: { 'x-user-email': userEmail }
      });
      setLogs([]);
    } catch (err) {
      console.warn('Erro ao limpar logs:', err);
    }
  };

  // Se não estiver na lista restrita de emails, exibe bloqueio de segurança intransponível
  if (!isAuthorized) {
    return (
      <div className="min-h-[500px] flex items-center justify-center p-6">
        <div className="bg-[#080d1a] border border-red-500/30 rounded-3xl p-8 sm:p-10 max-w-lg w-full text-center shadow-2xl flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mb-2">
            <Lock className="w-8 h-8" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-red-400 bg-red-500/10 px-3 py-1 rounded-full border border-red-500/20">
            Acesso Restrito ao AgencyOS
          </span>
          <h2 className="text-2xl font-black text-white font-['Syne']">
            Área Exclusiva AgencyOS
          </h2>
          <p className="text-xs text-white/60 leading-relaxed">
            Esta funcionalidade é estritamente confidencial e liberada exclusivamente para os e-mails autorizados do sistema:
          </p>
          <div className="bg-[#050811] border border-white/10 rounded-xl p-3 w-full space-y-1.5 font-mono text-xs text-[#D9F22A] font-bold">
            {AGENCY_OS_AUTHORIZED_EMAILS.map((email) => (
              <div key={email} className="flex items-center justify-center gap-2">
                <Shield className="w-3.5 h-3.5 text-cyan-400" />
                <span>{email}</span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-white/40 mt-1">
            Seu e-mail atual ({userEmail || 'Visitante'}) não possui permissão para visualizar ou configurar este webhook.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16 animate-in fade-in duration-300">
      {/* ================= HEADER PRINCIPAL ================= */}
      <div className="bg-gradient-to-r from-[#091326] via-[#060D1E] to-[#040814] border border-cyan-500/30 rounded-2xl p-6 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 flex items-center gap-1.5">
                <Radio className="w-3 h-3 animate-pulse text-cyan-400" />
                AgencyOS Webhook Global
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#D9F22A]/10 text-[#D9F22A] border border-[#D9F22A]/20">
                HTTP POST em Tempo Real
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono text-white/60 bg-white/5 border border-white/10">
                Headers: X-LeadsPay-Signature
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white font-['Syne'] tracking-tight">
              Webhook Global do AgencyOS
            </h1>
            <p className="text-xs sm:text-sm text-white/70 max-w-2xl leading-relaxed">
              Dispara automaticamente eventos de vendas aprovadas, ativação de empresas, comissões de afiliados e atualizações de saldo diretamente para a URL da sua aplicação no AgencyOS.
            </p>
          </div>

          <div className="flex flex-col items-start md:items-end gap-2 shrink-0">
            <div className={`px-4 py-2 rounded-xl text-xs font-bold border flex items-center gap-2 ${
              enabled && webhookUrl 
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.15)]' 
                : !enabled
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                : 'bg-white/5 border-white/10 text-white/50'
            }`}>
              <div className={`w-2.5 h-2.5 rounded-full ${
                enabled && webhookUrl ? 'bg-emerald-400 animate-ping' : !enabled ? 'bg-amber-400' : 'bg-white/30'
              }`} />
              <span>
                {enabled && webhookUrl ? 'Webhook Ativo & Pronto' : !enabled ? 'Webhook Pausado' : 'Aguardando Configuração'}
              </span>
            </div>
            <div className="text-[11px] text-white/50 font-mono">
              Autorizado: <span className="text-cyan-300 font-bold">{userEmail}</span>
            </div>
          </div>
        </div>

        {/* SUBNAVEGAÇÃO POR ABAS */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-white/10 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('config')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'config'
                ? 'bg-cyan-500 text-[#060A15] shadow-[0_0_15px_rgba(6,182,212,0.3)] font-black'
                : 'text-white/70 hover:text-white hover:bg-white/5'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            Configurações & Endpoint
          </button>

          <button
            onClick={() => setActiveTab('simulator')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'simulator'
                ? 'bg-cyan-500 text-[#060A15] shadow-[0_0_15px_rgba(6,182,212,0.3)] font-black'
                : 'text-white/70 hover:text-white hover:bg-white/5'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            Simulador & Disparo de Teste
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'logs'
                ? 'bg-cyan-500 text-[#060A15] shadow-[0_0_15px_rgba(6,182,212,0.3)] font-black'
                : 'text-white/70 hover:text-white hover:bg-white/5'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            Histórico de Disparos
            {logs.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/40 font-mono">
                {logs.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('docs')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'docs'
                ? 'bg-cyan-500 text-[#060A15] shadow-[0_0_15px_rgba(6,182,212,0.3)] font-black'
                : 'text-white/70 hover:text-white hover:bg-white/5'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            Documentação do Payload
          </button>
        </div>
      </div>

      {/* FEEDBACK DE SUCESSO OU ERRO */}
      {saveSuccess && (
        <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-2xl p-5 space-y-3 animate-in fade-in shadow-[0_0_25px_rgba(16,185,129,0.15)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-emerald-400 text-sm font-black">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>Configuração salva com sucesso! Todos os dados e o token estão ativos.</span>
            </div>
            <button
              onClick={() => setSaveSuccess(false)}
              className="text-white/40 hover:text-white text-xs px-2 py-1 rounded"
            >
              ✕ Fechar
            </button>
          </div>

          <div className="bg-[#050811] border border-emerald-500/20 rounded-xl p-4 space-y-2.5 text-xs text-white/80">
            <div className="font-bold text-white flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-emerald-300">
                <Key className="w-4 h-4 text-emerald-400" />
                Como colocar esse token no seu AgencyOS:
              </span>
              <button
                type="button"
                onClick={() => handleCopy(secretToken, 'saved_token')}
                className="px-3 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-all"
              >
                {copiedKey === 'saved_token' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-300" />
                    Token Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copiar Token do AgencyOS
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-[11px]">
              <div className="bg-white/[0.03] p-3 rounded-lg border border-white/5 space-y-1">
                <div className="font-bold text-white">Opção 1: Painel do AgencyOS</div>
                <div className="text-white/60">
                  Acesse seu painel AgencyOS &rarr; <span className="text-cyan-300">Configurações / Integrações</span> &rarr; selecione Webhook LeadsPay e cole o token acima no campo de <strong>Secret / Chave de Assinatura</strong>.
                </div>
              </div>
              <div className="bg-white/[0.03] p-3 rounded-lg border border-white/5 space-y-1">
                <div className="font-bold text-white">Opção 2: Variável de Ambiente</div>
                <div className="text-white/60">
                  No seu projeto Vercel/Next.js do AgencyOS, defina a variável <code className="text-cyan-300">LEADSPAY_WEBHOOK_SECRET={secretToken || 'seu_token'}</code>.
                </div>
              </div>
            </div>

            <div className="text-[10px] text-white/40 pt-1">
              O LeadsPay envia esse token autenticado automaticamente em: <code className="text-emerald-300">X-LeadsPay-Signature</code>, <code className="text-emerald-300">Authorization: Bearer</code> e no JSON em <code className="text-emerald-300">payload.token</code>.
            </div>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="bg-red-500/15 border border-red-500/40 rounded-xl p-4 flex items-center gap-3 text-red-300 text-xs font-bold animate-in fade-in">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* ================= ABA 1: CONFIGURAÇÕES & ENDPOINT ================= */}
      {activeTab === 'config' && (
        <div className="space-y-6">
          <div className="bg-[#080d1a] border border-white/10 rounded-2xl p-6 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2 font-['Syne']">
                  <Globe className="w-4 h-4 text-cyan-400" />
                  Destino do Webhook HTTP POST
                </h3>
                <p className="text-xs text-white/60 mt-0.5">
                  Insira o endpoint do AgencyOS que receberá os payloads JSON das ações financeiras do LeadsPay.
                </p>
              </div>

              {/* Interruptor Geral */}
              <div className="flex items-center gap-3 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
                <span className="text-xs text-white/80 font-bold">Envio Ativo:</span>
                <button
                  type="button"
                  onClick={() => setEnabled(!enabled)}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                    enabled ? 'bg-cyan-500' : 'bg-white/20'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                      enabled ? 'right-1' : 'left-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* URL do Webhook */}
              <div className="md:col-span-2 space-y-2">
                <label className="text-xs font-bold text-white/80 flex items-center justify-between">
                  <span>URL do Endpoint (AgencyOS)</span>
                  <span className="text-[10px] text-cyan-400 font-mono">POST / HTTPS Recomendado</span>
                </label>
                <div className="relative">
                  <input
                    type="url"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://seu-agencyos.com/api/webhooks/leadspay"
                    className="w-full bg-[#050811] border border-white/15 focus:border-cyan-400 rounded-xl px-4 py-3 text-xs text-white font-mono placeholder:text-white/30 focus:outline-none transition-colors"
                  />
                  {webhookUrl && (
                    <button
                      onClick={() => handleCopy(webhookUrl, 'url')}
                      className="absolute right-3 top-3 text-white/50 hover:text-white cursor-pointer"
                      title="Copiar URL"
                    >
                      {copiedKey === 'url' ? <Check className="w-4 h-4 text-[#D9F22A]" /> : <Copy className="w-4 h-4" />}
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-white/50">
                  O LeadsPay fará requisições <code className="text-cyan-300">POST</code> com <code className="text-cyan-300">Content-Type: application/json</code> sempre que ocorrer um evento habilitado.
                </p>

                {/* Dica de Rota AgencyOS */}
                {webhookUrl && !webhookUrl.includes('/api/') && (
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="text-[11px] text-cyan-400 font-semibold flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      Dica de rota padrão AgencyOS:
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const base = webhookUrl.replace(/\/+$/, '');
                        setWebhookUrl(`${base}/api/webhooks/leadspay`);
                      }}
                      className="text-[10px] bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded cursor-pointer transition-colors"
                    >
                      + /api/webhooks/leadspay
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const base = webhookUrl.replace(/\/+$/, '');
                        setWebhookUrl(`${base}/api/webhook`);
                      }}
                      className="text-[10px] bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded cursor-pointer transition-colors"
                    >
                      + /api/webhook
                    </button>
                  </div>
                )}
              </div>

              {/* Agency ID */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-white/80 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                  Agency ID (ID da Agência no AgencyOS)
                </label>
                <input
                  type="text"
                  value={agencyId}
                  onChange={(e) => setAgencyId(e.target.value)}
                  placeholder="ex: agency_leadspay_oficial ou uuid"
                  className="w-full bg-[#050811] border border-white/15 focus:border-cyan-400 rounded-xl px-4 py-3 text-xs text-white font-mono placeholder:text-white/30 focus:outline-none transition-colors"
                />
                <p className="text-[11px] text-white/50">
                  Enviado no campo <code className="text-cyan-300">agency_id</code> na raiz do payload para roteamento interno.
                </p>
              </div>

              {/* Secret Token */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-white/80 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-cyan-400" />
                    Token Secreto (X-LeadsPay-Signature)
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateSecret}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 font-bold cursor-pointer underline"
                  >
                    Gerar Novo Token
                  </button>
                </div>

                <div className="relative">
                  <input
                    type={showToken ? 'text' : 'password'}
                    value={secretToken}
                    onChange={(e) => setSecretToken(e.target.value)}
                    placeholder="whsec_agencyos_..."
                    className="w-full bg-[#050811] border border-white/15 focus:border-cyan-400 rounded-xl px-4 py-3 pr-20 text-xs text-white font-mono placeholder:text-white/30 focus:outline-none transition-colors"
                  />
                  <div className="absolute right-3 top-2.5 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setShowToken(!showToken)}
                      className="text-[11px] font-bold px-2 py-1 bg-white/5 hover:bg-white/10 rounded-md text-white/70 hover:text-white cursor-pointer"
                    >
                      {showToken ? 'Ocultar' : 'Ver'}
                    </button>
                    {secretToken && (
                      <button
                        type="button"
                        onClick={() => handleCopy(secretToken, 'secret')}
                        className="p-1 text-white/50 hover:text-white cursor-pointer"
                        title="Copiar Token"
                      >
                        {copiedKey === 'secret' ? <Check className="w-4 h-4 text-[#D9F22A]" /> : <Copy className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-[11px] text-white/50">
                  Enviado no header <code className="text-cyan-300">X-LeadsPay-Signature</code> para o AgencyOS validar a autenticidade.
                </p>
              </div>
            </div>

            {/* SELEÇÃO DE EVENTOS */}
            <div className="pt-4 border-t border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Activity className="w-4 h-4 text-cyan-400" />
                    Eventos a Disparar ({selectedEvents.length} de {DEFAULT_EVENTS.length} ativos)
                  </h4>
                  <p className="text-xs text-white/60">
                    Selecione quais ações do LeadsPay devem acionar uma notificação para o AgencyOS.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (selectedEvents.length === DEFAULT_EVENTS.length) setSelectedEvents([]);
                    else setSelectedEvents(DEFAULT_EVENTS.map(e => e.id));
                  }}
                  className="text-[11px] text-cyan-400 hover:text-cyan-300 font-bold cursor-pointer"
                >
                  {selectedEvents.length === DEFAULT_EVENTS.length ? 'Desmarcar Todos' : 'Marcar Todos'}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                {DEFAULT_EVENTS.map((ev) => {
                  const isChecked = selectedEvents.includes(ev.id);
                  return (
                    <div
                      key={ev.id}
                      onClick={() => toggleEvent(ev.id)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                        isChecked
                          ? 'bg-cyan-500/10 border-cyan-500/40 text-white shadow-[0_0_12px_rgba(6,182,212,0.1)]'
                          : 'bg-white/[0.02] border-white/10 text-white/60 hover:border-white/20'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-lg border flex items-center justify-center mt-0.5 shrink-0 transition-colors ${
                        isChecked ? 'bg-cyan-500 border-cyan-400 text-[#060A15]' : 'border-white/20 bg-black/20'
                      }`}>
                        {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-cyan-300">{ev.name}</span>
                          <span className="text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.2 rounded bg-white/10 text-white/70">
                            {ev.tag}
                          </span>
                        </div>
                        <p className="text-[11px] leading-relaxed text-white/60">
                          {ev.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* BOTÕES DE AÇÃO */}
            <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-[11px] text-white/50">
                Alterações entram em vigor imediatamente após salvar.
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => handleRunTest()}
                  disabled={testing || !webhookUrl}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-40 disabled:pointer-events-none"
                >
                  <Send className={`w-3.5 h-3.5 ${testing ? 'animate-bounce' : ''}`} />
                  {testing ? 'Disparando Teste...' : 'Testar URL Atual'}
                </button>

                <button
                  type="button"
                  onClick={handleSaveConfig}
                  disabled={saving}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-[#060A15] text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.3)] disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Salvar Configuração
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* RESULTADO DO TESTE INLINE NA ABA 1 */}
            {testResult && (
              <div className={`p-4 rounded-xl border text-xs space-y-2.5 animate-in fade-in ${
                testResult.success
                  ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
                  : 'bg-amber-950/30 border-amber-500/30 text-amber-200'
              }`}>
                <div className="flex items-center justify-between font-bold">
                  <div className="flex items-center gap-2">
                    {testResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-amber-400" />
                    )}
                    <span>
                      {testResult.success
                        ? 'Teste do Webhook Executado com Sucesso!'
                        : 'Resposta do Endpoint AgencyOS'}
                    </span>
                  </div>
                  <div className="font-mono text-[11px] px-2 py-0.5 rounded bg-black/40 text-white">
                    HTTP {testResult.status} {testResult.durationMs ? `(${testResult.durationMs}ms)` : ''}
                  </div>
                </div>

                {testResult.error && (
                  <p className="text-[11px] text-white/70 leading-relaxed font-mono bg-black/30 p-2 rounded border border-white/5">
                    {testResult.error}
                  </p>
                )}

                {/* Ajuda se deu 404 em domínio raiz */}
                {!testResult.success && testResult.status === 404 && !webhookUrl.includes('/api/') && (
                  <div className="bg-black/40 p-3 rounded-lg border border-amber-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 mt-2">
                    <span className="text-[11px] text-white/80">
                      O endpoint raiz retornou 404. Deseja apontar para a rota padrão <strong>/api/webhooks/leadspay</strong>?
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const base = webhookUrl.replace(/\/+$/, '');
                        const newUrl = `${base}/api/webhooks/leadspay`;
                        setWebhookUrl(newUrl);
                        setTimeout(() => handleRunTest(), 100);
                      }}
                      className="px-3 py-1 bg-cyan-500 hover:bg-cyan-400 text-[#060A15] text-[11px] font-bold rounded-lg cursor-pointer whitespace-nowrap transition-all"
                    >
                      Ajustar Rota & Retestar
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= ABA 2: SIMULADOR & DISPARO DE TESTE ================= */}
      {activeTab === 'simulator' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Painel Esquerdo: Controle de Disparo */}
          <div className="bg-[#080d1a] border border-white/10 rounded-2xl p-6 space-y-5">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2 font-['Syne']">
                <Zap className="w-4 h-4 text-cyan-400" />
                Simulador de Eventos LeadsPay
              </h3>
              <p className="text-xs text-white/60 mt-0.5">
                Selecione um evento para enviar uma requisição HTTP POST real ao endpoint configurado do AgencyOS.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-white/80">Escolha o Tipo de Evento:</label>
              <div className="grid grid-cols-2 gap-2">
                {DEFAULT_EVENTS.map((ev) => (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => setTestEvent(ev.id)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      testEvent === ev.id
                        ? 'bg-cyan-500/20 border-cyan-400 text-white font-bold'
                        : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:border-white/20'
                    }`}
                  >
                    <div className="text-xs font-mono text-cyan-300">{ev.name}</div>
                    <div className="text-[10px] text-white/50">{ev.tag}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-[#050811] border border-white/10 rounded-xl p-4 space-y-2 text-xs">
              <div className="flex justify-between text-white/60">
                <span>Destino Atual:</span>
                <span className="font-mono text-cyan-300 truncate max-w-[200px]">
                  {webhookUrl || 'Nenhuma URL configurada'}
                </span>
              </div>
              <div className="flex justify-between text-white/60">
                <span>Agency ID:</span>
                <span className="font-mono text-white/90">{agencyId}</span>
              </div>
              <div className="flex justify-between text-white/60">
                <span>Header de Assinatura:</span>
                <span className="font-mono text-white/90">
                  {secretToken ? 'Ativa (X-LeadsPay-Signature)' : 'Nenhum'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleRunTest()}
              disabled={testing || !webhookUrl}
              className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-[#060A15] text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.3)] disabled:opacity-40"
            >
              <Send className={`w-4 h-4 ${testing ? 'animate-spin' : ''}`} />
              {testing ? 'Disparando Requisição...' : `Enviar Evento '${testEvent}' Agora`}
            </button>
          </div>

          {/* Painel Direito: Resposta do Servidor em Tempo Real */}
          <div className="bg-[#080d1a] border border-white/10 rounded-2xl p-6 space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white flex items-center gap-2 font-['Syne']">
                  <Terminal className="w-4 h-4 text-cyan-400" />
                  Resposta do AgencyOS
                </h4>
                {testResult && (
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                    testResult.success
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-red-500/20 text-red-300 border border-red-500/40'
                  }`}>
                    HTTP {testResult.status} {testResult.durationMs ? `(${testResult.durationMs}ms)` : ''}
                  </span>
                )}
              </div>

              {testResult ? (
                <div className="space-y-3">
                  <div className={`p-3.5 rounded-xl border text-xs font-mono ${
                    testResult.success 
                      ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300' 
                      : 'bg-red-950/40 border-red-500/30 text-red-300'
                  }`}>
                    <div className="font-bold flex items-center gap-2">
                      {testResult.success ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                      {testResult.success ? 'Requisição Entregue com Sucesso!' : 'Falha na Entrega do Webhook'}
                    </div>
                    {testResult.error && (
                      <div className="mt-1 text-[11px] text-red-200/80 break-all">
                        {testResult.error}
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="text-[11px] font-bold text-white/60 mb-1">Corpo da Resposta Recebida:</div>
                    <pre className="bg-[#050811] border border-white/10 rounded-xl p-3 text-[11px] font-mono text-cyan-300 overflow-x-auto max-h-36">
                      {testResult.body || '(Corpo da resposta vazio ou status 200 OK)'}
                    </pre>
                  </div>

                  {testResult.payloadSent && (
                    <div>
                      <div className="text-[11px] font-bold text-white/60 mb-1">Payload JSON Enviado:</div>
                      <pre className="bg-[#050811] border border-white/10 rounded-xl p-3 text-[10px] font-mono text-white/80 overflow-x-auto max-h-48">
                        {JSON.stringify(testResult.payloadSent, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-[#050811] border border-dashed border-white/10 rounded-xl p-8 text-center text-white/40 space-y-2">
                  <Activity className="w-8 h-8 mx-auto text-white/20" />
                  <p className="text-xs">Nenhum teste disparado nesta sessão.</p>
                  <p className="text-[11px] text-white/30">
                    Clique em "Enviar Evento" para inspecionar a resposta HTTP do AgencyOS.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= ABA 3: HISTÓRICO DE LOGS ================= */}
      {activeTab === 'logs' && (
        <div className="bg-[#080d1a] border border-white/10 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2 font-['Syne']">
                <Activity className="w-4 h-4 text-cyan-400" />
                Histórico de Disparos em Tempo Real ({logs.length})
              </h3>
              <p className="text-xs text-white/60 mt-0.5">
                Logs de todas as notificações enviadas pelo LeadsPay para o endpoint do AgencyOS.
              </p>
            </div>

            {logs.length > 0 && (
              <button
                type="button"
                onClick={handleClearLogs}
                className="text-xs text-red-400 hover:text-red-300 font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Limpar Logs
              </button>
            )}
          </div>

          {logs.length === 0 ? (
            <div className="text-center py-12 bg-[#050811] rounded-xl border border-white/5 space-y-2">
              <Activity className="w-8 h-8 text-white/20 mx-auto" />
              <p className="text-xs text-white/60">Nenhum evento registrado ainda.</p>
              <p className="text-[11px] text-white/40">
                Dispare um evento no Simulador ou realize uma venda de teste para registrar os primeiros logs.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-white/50 text-[10px] uppercase font-bold tracking-wider">
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Evento</th>
                    <th className="py-2.5 px-3">Transação / Ref</th>
                    <th className="py-2.5 px-3">Data / Hora</th>
                    <th className="py-2.5 px-3 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold inline-flex items-center gap-1 ${
                          log.status === 'success' || (log.statusCode >= 200 && log.statusCode < 300)
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-red-500/20 text-red-300 border border-red-500/30'
                        }`}>
                          {log.statusCode || (log.status === 'success' ? 200 : 500)}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-cyan-300">
                        {log.event}
                      </td>
                      <td className="py-3 px-3 font-mono text-white/70 text-[11px]">
                        {log.payload?.data?.transaction_id || log.payload?.agency_id || '-'}
                      </td>
                      <td className="py-3 px-3 text-white/50 text-[11px]">
                        {new Date(log.createdAt || log.timestamp).toLocaleString('pt-BR')}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedLog(log)}
                          className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-cyan-500/20 text-cyan-300 hover:text-cyan-200 text-[11px] font-bold border border-white/10 hover:border-cyan-500/30 transition-all cursor-pointer inline-flex items-center gap-1"
                        >
                          <FileJson className="w-3 h-3" />
                          Ver JSON
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ================= ABA 4: DOCUMENTAÇÃO DO PAYLOAD ================= */}
      {activeTab === 'docs' && (
        <div className="space-y-6">
          <div className="bg-[#080d1a] border border-white/10 rounded-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2 font-['Syne']">
              <Code2 className="w-4 h-4 text-cyan-400" />
              Estrutura Oficial do Payload AgencyOS
            </h3>
            <p className="text-xs text-white/60">
              Todos os webhooks enviados pelo LeadsPay possuem o formato estrito demonstrado abaixo:
            </p>

            <div className="bg-[#050811] border border-white/10 rounded-xl p-4 text-[11px] font-mono text-cyan-300 overflow-x-auto">
              <pre>{`// Headers da Requisição HTTP POST:
Content-Type: application/json
X-LeadsPay-Signature: seu_secret_token_aqui
User-Agent: LeadsPay-AgencyOS-Webhook/1.0

// Payload JSON:
{
  "event": "sale.approved", // 'sale.approved' | 'company.activated' | 'affiliate.commission' | 'balance.updated'
  "timestamp": "2026-09-15T20:00:00.000Z",
  "agency_id": "${agencyId || 'agency_leadspay'}",
  "data": {
    "transaction_id": "pay_asaas_123456",
    "product_id": "prod_ia_whatsapp",
    "product_name": "Agente IA WhatsApp Pro",
    "amount": 197.00,
    "net_amount": 156.61,
    "payment_method": "pix", // 'pix' | 'credit_card' | 'boleto'
    "customer": {
      "name": "Cliente Exemplo",
      "email": "cliente@email.com",
      "cpf_cnpj": "123.456.789-00"
    },
    "affiliate": {
      "affiliate_id": "usr_afiliado_789",
      "name": "Afiliado Parceiro",
      "commission_amount": 39.40
    },
    "company_plan": {
      "plan_id": "plan_scale",
      "plan_name": "Scale Agency",
      "status": "active"
    }
  }
}`}</pre>
            </div>
          </div>

          <div className="bg-[#080d1a] border border-white/10 rounded-2xl p-6 space-y-4">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Terminal className="w-4 h-4 text-cyan-400" />
              Exemplo de Endpoint Receptor no AgencyOS (Next.js App Router / Express)
            </h4>

            <div className="bg-[#050811] border border-white/10 rounded-xl p-4 text-[11px] font-mono text-white/80 overflow-x-auto">
              <pre>{`// app/api/webhooks/leadspay/route.ts (No AgencyOS)
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const signature = req.headers.get('x-leadspay-signature');
  const expectedSecret = process.env.LEADSPAY_WEBHOOK_SECRET;

  if (expectedSecret && signature !== expectedSecret) {
    return NextResponse.json({ error: 'Assinatura inválida' }, { status: 401 });
  }

  const payload = await req.json();
  const { event, agency_id, data } = payload;

  switch (event) {
    case 'sale.approved':
      // Atualizar faturamento e liberar acesso no AgencyOS
      console.log(\`Venda aprovada para agência \${agency_id}: R$ \${data.amount}\`);
      break;

    case 'company.activated':
      // Ativar empresa/agência no sistema
      break;

    case 'affiliate.commission':
      // Creditar comissão de afiliado
      break;

    case 'balance.updated':
      // Atualizar balanço da agência
      break;
  }

  return NextResponse.json({ received: true });
}`}</pre>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL DE DETALHES DO LOG ================= */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#080d1a] border border-cyan-500/30 rounded-2xl p-6 max-w-2xl w-full shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <FileJson className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white font-['Syne']">
                  Detalhes do Log ({selectedLog.event})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 overflow-y-auto pr-1">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="bg-[#050811] p-2.5 rounded-xl border border-white/10">
                  <div className="text-white/50 text-[10px]">Status HTTP</div>
                  <div className="font-mono font-bold text-cyan-300">{selectedLog.statusCode || 200}</div>
                </div>
                <div className="bg-[#050811] p-2.5 rounded-xl border border-white/10">
                  <div className="text-white/50 text-[10px]">Agency ID</div>
                  <div className="font-mono font-bold text-white truncate">{selectedLog.agency_id || '-'}</div>
                </div>
                <div className="bg-[#050811] p-2.5 rounded-xl border border-white/10 col-span-2">
                  <div className="text-white/50 text-[10px]">Data & Hora</div>
                  <div className="font-mono text-white/80">{new Date(selectedLog.createdAt || selectedLog.timestamp).toLocaleString('pt-BR')}</div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-white/70">Payload Completo Enviado:</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(JSON.stringify(selectedLog.payload, null, 2), 'modal-payload')}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                  >
                    {copiedKey === 'modal-payload' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    Copiar JSON
                  </button>
                </div>
                <pre className="bg-[#050811] border border-white/10 rounded-xl p-4 text-[10px] font-mono text-cyan-300 overflow-x-auto max-h-60">
                  {JSON.stringify(selectedLog.payload, null, 2)}
                </pre>
              </div>

              {selectedLog.responseBody && (
                <div>
                  <div className="text-xs font-bold text-white/70 mb-1">Resposta do Servidor:</div>
                  <pre className="bg-[#050811] border border-white/10 rounded-xl p-3 text-[10px] font-mono text-white/80 overflow-x-auto max-h-32">
                    {selectedLog.responseBody}
                  </pre>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-white/10 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
