import React, { useState } from 'react';
import { Network, Check, Copy, Webhook, Zap, Shield, Key } from 'lucide-react';

export const IntegracoesView: React.FC = () => {
  const [copiedKey, setCopiedKey] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('https://meuservidor.com.br/api/postback/leadspay');
  const [savedWebhook, setSavedWebhook] = useState(false);

  const apiKey = 'lp_live_99482710398471203948571290384';

  const handleCopyKey = () => {
    navigator.clipboard.writeText(apiKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleSaveWebhook = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedWebhook(true);
    setTimeout(() => setSavedWebhook(false), 2500);
  };

  return (
    <div className="flex flex-col gap-6" id="leadspay-integracoes-view">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-white font-['Syne']">
          Integrações & Webhooks (Postback)
        </h1>
        <p className="text-xs text-white/60 mt-1">
          Conecte sua automação externa, bots do WhatsApp, CRM e pixels de conversão para receber avisos em tempo real a cada venda.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* API Key */}
        <div className="lg:col-span-6 bg-[#080d1a] border border-white/10 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center gap-2 mb-3">
            <Key className="w-5 h-5 text-[#D9F22A]" />
            <h3 className="text-lg font-bold text-white font-['Syne']">
              Chave de API do Parceiro (REST)
            </h3>
          </div>
          <p className="text-xs text-white/70 mb-4 leading-relaxed">
            Utilize sua chave de autenticação para consultar saldo, links de afiliados e status de vendas programaticamente.
          </p>

          <div className="p-3 bg-[#050811] border border-white/10 rounded-xl flex items-center justify-between gap-3">
            <code className="text-xs font-mono text-white/80 truncate">{apiKey}</code>
            <button
              onClick={handleCopyKey}
              className="px-3 py-1.5 bg-[#D9F22A] text-[#060A15] font-bold text-xs rounded-lg cursor-pointer hover:bg-[#c8e217] transition-colors whitespace-nowrap flex items-center gap-1"
            >
              {copiedKey ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedKey ? 'Copiado!' : 'Copiar'}
            </button>
          </div>
        </div>

        {/* Webhook Postback */}
        <div className="lg:col-span-6 bg-[#080d1a] border border-white/10 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center gap-2 mb-3">
            <Webhook className="w-5 h-5 text-[#D9F22A]" />
            <h3 className="text-lg font-bold text-white font-['Syne']">
              Configurar Webhook Postback
            </h3>
          </div>
          <p className="text-xs text-white/70 mb-4 leading-relaxed">
            Insira o endpoint que receberá payload JSON via POST quando um contrato de plataforma for aprovado.
          </p>

          <form onSubmit={handleSaveWebhook} className="flex flex-col gap-3">
            <input
              type="url"
              required
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              className="w-full bg-[#050811] border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#D9F22A]"
            />
            <button
              type="submit"
              className="w-full bg-white/10 hover:bg-[#D9F22A] hover:text-[#060A15] text-white font-bold py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer"
            >
              {savedWebhook ? 'Webhook Atualizado com Sucesso! ✓' : 'Salvar URL de Postback'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
