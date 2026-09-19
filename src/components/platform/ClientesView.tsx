import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  Copy, 
  Check, 
  Mail, 
  Phone, 
  FileText, 
  Calendar, 
  DollarSign, 
  Trash2, 
  X, 
  MessageCircle, 
  Building2, 
  Tag, 
  Send, 
  CheckCircle2, 
  AlertCircle,
  Percent,
  Flame
} from 'lucide-react';
import { PlatformClient, CompanyStartup, CompanyPlan } from '../../types/platform';
import { 
  subscribeClients, 
  createManualClientInFirebase, 
  deleteClientInFirebase 
} from '../../services/firestoreService';

interface ClientesViewProps {
  companies?: CompanyStartup[];
  activeCompanyId?: string;
  userRole?: string;
  plans?: CompanyPlan[];
}

export const ClientesView: React.FC<ClientesViewProps> = ({
  companies = [],
  activeCompanyId,
  userRole,
  plans = []
}) => {
  const [clients, setClients] = useState<PlatformClient[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusTabFilter, setStatusTabFilter] = useState<'all' | 'PAGO' | 'PENDENTE' | 'RECUSADO'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState<string>(activeCompanyId || 'all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Manual Client Form State
  const [formName, setFormName] = useState<string>('');
  const [formEmail, setFormEmail] = useState<string>('');
  const [formPhone, setFormPhone] = useState<string>('');
  const [formDoc, setFormDoc] = useState<string>('');
  const [formStatus, setFormStatus] = useState<'PAGO' | 'PENDENTE' | 'RECUSADO'>('PAGO');
  const [formPlanName, setFormPlanName] = useState<string>(plans[0]?.name || 'Plano de Assinatura');
  const [formCompanyId, setFormCompanyId] = useState<string>(activeCompanyId || companies[0]?.id || 'store_default');
  const [formSpent, setFormSpent] = useState<string>('97.00');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Remarketing Modal State
  const [isRemarketingOpen, setIsRemarketingOpen] = useState<boolean>(false);
  const [remarketingClient, setRemarketingClient] = useState<PlatformClient | null>(null);
  const [couponCode, setCouponCode] = useState<string>('VOLTA10');
  const [discountValue, setDiscountValue] = useState<string>('10% OFF');
  const [customRemarketingMsg, setCustomRemarketingMsg] = useState<string>('');
  const [isSendingRemarketing, setIsSendingRemarketing] = useState<boolean>(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Subscribe to real clients from Firestore
  useEffect(() => {
    setLoading(true);
    const targetStore = selectedCompanyFilter !== 'all' ? selectedCompanyFilter : undefined;
    const unsub = subscribeClients(targetStore, (list) => {
      setClients(list);
      setLoading(false);
    });

    return () => unsub();
  }, [selectedCompanyFilter]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Deseja remover o cliente "${name}" da sua base de dados?`)) return;
    try {
      await deleteClientInFirebase(id);
      showToast('Cliente removido com sucesso.');
    } catch (err: any) {
      alert(`Erro ao remover cliente: ${err.message}`);
    }
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formEmail.trim()) {
      alert('Preencha ao menos o nome completo e o e-mail do cliente.');
      return;
    }

    setIsSubmitting(true);
    try {
      const amountVal = parseFloat(formSpent.replace(',', '.')) || 0;
      await createManualClientInFirebase({
        store_id: formCompanyId,
        name: formName.trim(),
        email: formEmail.trim().toLowerCase(),
        phone: formPhone.trim(),
        document: formDoc.replace(/\D/g, ''),
        total_spent: formStatus === 'PAGO' ? amountVal : 0,
        valor_pedido: amountVal,
        orders_count: formStatus === 'PAGO' ? 1 : 0,
        last_plan_name: formPlanName || 'Cadastro Manual',
        status_compra: formStatus,
        status: formStatus,
        is_test: false,
        environment: 'production'
      });

      showToast(`Cliente ${formName} cadastrado com sucesso!`);
      setIsModalOpen(false);
      setFormName('');
      setFormEmail('');
      setFormPhone('');
      setFormDoc('');
      setFormSpent('97.00');
    } catch (err: any) {
      alert(`Erro ao cadastrar cliente: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Disparar E-mail de Remarketing com Cupom
  const handleOpenRemarketing = (client: PlatformClient) => {
    setRemarketingClient(client);
    setCouponCode('VOLTA10');
    setDiscountValue('10% OFF');
    const isRefused = client.status_compra === 'RECUSADO';
    setCustomRemarketingMsg(
      isRefused
        ? `Notamos que seu pagamento para ${client.last_plan_name || 'seu pedido'} não foi concluído. Liberamos um cupom especial de 10% OFF para você tentar novamente!`
        : `Você iniciou seu pedido de ${client.last_plan_name || 'seu plano'} e reservamos sua vaga! Use o cupom abaixo para concluir com desconto especial.`
    );
    setIsRemarketingOpen(true);
  };

  const handleSendRemarketingEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!remarketingClient || !remarketingClient.email) {
      alert('Cliente sem e-mail cadastrado.');
      return;
    }

    setIsSendingRemarketing(true);
    try {
      const response = await fetch('/api/remarketing/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: remarketingClient.email,
          customerName: remarketingClient.name,
          planName: remarketingClient.last_plan_name || 'Plano de Assinatura',
          couponCode: couponCode.trim().toUpperCase(),
          discount: discountValue.trim(),
          customMessage: customRemarketingMsg.trim(),
          checkoutUrl: window.location.origin
        })
      });

      const res = await response.json().catch(() => ({}));
      if (response.ok && res.success) {
        showToast(`Cupom ${couponCode.toUpperCase()} enviado com sucesso para ${remarketingClient.email}!`);
        setIsRemarketingOpen(false);
      } else {
        alert(res.error || 'Não foi possível enviar o e-mail de remarketing.');
      }
    } catch (err) {
      console.error('Erro ao enviar remarketing:', err);
      alert('Erro de conexão ao enviar o e-mail de remarketing.');
    } finally {
      setIsSendingRemarketing(false);
    }
  };

  const filteredClients = clients.filter(c => {
    if (selectedCompanyFilter !== 'all' && c.store_id !== selectedCompanyFilter) return false;

    // Filter by status tab
    const clientStatus = (c.status_compra || c.status || 'PAGO').toUpperCase();
    if (statusTabFilter === 'PAGO') {
      if (clientStatus !== 'PAGO' && clientStatus !== 'APROVADO' && clientStatus !== 'CONFIRMED' && clientStatus !== 'RECEIVED') {
        return false;
      }
    } else if (statusTabFilter === 'PENDENTE') {
      if (clientStatus !== 'PENDENTE' && clientStatus !== 'PIX_GERADO' && clientStatus !== 'WAITING') {
        return false;
      }
    } else if (statusTabFilter === 'RECUSADO') {
      if (clientStatus !== 'RECUSADO' && clientStatus !== 'CANCELADO' && clientStatus !== 'FAILED') {
        return false;
      }
    }

    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      (c.phone && c.phone.includes(q)) ||
      (c.document && c.document.includes(q)) ||
      (c.last_plan_name && c.last_plan_name.toLowerCase().includes(q)) ||
      c.id.toLowerCase().includes(q)
    );
  });

  const totalClientsCount = clients.length;
  const paidClientsCount = clients.filter(c => {
    const s = (c.status_compra || c.status || 'PAGO').toUpperCase();
    return s === 'PAGO' || s === 'APROVADO' || s === 'CONFIRMED' || s === 'RECEIVED';
  }).length;
  const pendingClientsCount = clients.filter(c => {
    const s = (c.status_compra || c.status || '').toUpperCase();
    return s === 'PENDENTE' || s === 'PIX_GERADO';
  }).length;
  const refusedClientsCount = clients.filter(c => {
    const s = (c.status_compra || c.status || '').toUpperCase();
    return s === 'RECUSADO' || s === 'CANCELADO';
  }).length;

  const totalVolume = clients.reduce((acc, c) => acc + (c.total_spent || 0), 0);

  return (
    <div className="space-y-6 animate-fadeIn" id="leadspay-clientes-module">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-[#10B981] text-[#060A15] px-5 py-3 rounded-2xl font-bold text-xs shadow-2xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-[#060A15]" />
          {toastMessage}
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#D9F22A] mb-1">
            <Users className="w-4 h-4" />
            Base de Contatos & Leads do Checkout
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-['Syne']">
            Clientes & Remarketing
          </h1>
          <p className="text-xs text-white/60 mt-1 max-w-xl">
            Dados capturados instantaneamente no momento em que o comprador preenche o checkout ou cadastrados manualmente. Dispare cupons de desconto por e-mail e WhatsApp.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#D9F22A] hover:bg-[#cbe327] text-[#060A15] font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(217,242,42,0.2)] cursor-pointer"
            id="btn-add-client-manual"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            + Cadastrar Cliente
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[#080d1a] border border-white/10">
          <span className="text-[11px] font-bold uppercase tracking-wider text-white/50 block">Total de Contatos</span>
          <div className="text-2xl font-black text-white font-['Syne'] mt-1">
            {totalClientsCount}
          </div>
          <span className="text-[11px] text-[#D9F22A] font-semibold mt-1 block">
            Capturados no checkout
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[#080d1a] border border-white/10">
          <span className="text-[11px] font-bold uppercase tracking-wider text-white/50 block">Clientes Pagos</span>
          <div className="text-2xl font-black text-emerald-400 font-['Syne'] mt-1">
            {paidClientsCount}
          </div>
          <span className="text-[11px] text-white/40 mt-1 block">
            R$ {totalVolume.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} faturados
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[#080d1a] border border-white/10">
          <span className="text-[11px] font-bold uppercase tracking-wider text-white/50 block">Leads Pendentes (Pix/Boleto)</span>
          <div className="text-2xl font-black text-amber-400 font-['Syne'] mt-1">
            {pendingClientsCount}
          </div>
          <span className="text-[11px] text-amber-300 font-semibold mt-1 block">
            Aguardando pagamento
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[#080d1a] border border-white/10">
          <span className="text-[11px] font-bold uppercase tracking-wider text-white/50 block">Recusados (Cartão/Erro)</span>
          <div className="text-2xl font-black text-rose-400 font-['Syne'] mt-1">
            {refusedClientsCount}
          </div>
          <span className="text-[11px] text-rose-300 font-semibold mt-1 block">
            Prontos para remarketing
          </span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-[#080d1a] border border-white/10 p-4 rounded-2xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nome, e-mail, celular, CPF ou ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#050811] border border-white/15 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#D9F22A]"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Tabs Filter */}
          <div className="flex items-center gap-1 bg-[#050811] p-1 rounded-xl border border-white/10">
            <button
              onClick={() => setStatusTabFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusTabFilter === 'all' ? 'bg-[#D9F22A] text-[#060A15]' : 'text-white/60 hover:text-white'
              }`}
            >
              Todos ({totalClientsCount})
            </button>
            <button
              onClick={() => setStatusTabFilter('PAGO')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusTabFilter === 'PAGO' ? 'bg-emerald-500 text-black' : 'text-white/60 hover:text-white'
              }`}
            >
              Pagos ({paidClientsCount})
            </button>
            <button
              onClick={() => setStatusTabFilter('PENDENTE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusTabFilter === 'PENDENTE' ? 'bg-amber-500 text-black' : 'text-white/60 hover:text-white'
              }`}
            >
              Pendentes ({pendingClientsCount})
            </button>
            <button
              onClick={() => setStatusTabFilter('RECUSADO')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusTabFilter === 'RECUSADO' ? 'bg-rose-500 text-white' : 'text-white/60 hover:text-white'
              }`}
            >
              Recusados ({refusedClientsCount})
            </button>
          </div>

          {companies.length > 1 && (
            <select
              value={selectedCompanyFilter}
              onChange={(e) => setSelectedCompanyFilter(e.target.value)}
              className="bg-[#050811] border border-white/15 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[#D9F22A]"
            >
              <option value="all">Todas as Empresas</option>
              {companies.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Clients Table */}
      <div className="bg-[#080d1a] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-white/50 text-xs flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-[#D9F22A] border-t-transparent animate-spin" />
            Carregando lista de clientes...
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 mb-3">
              <Users className="w-7 h-7 text-[#D9F22A]/60" />
            </div>
            <h3 className="text-base font-bold text-white font-['Syne']">
              Nenhum cliente encontrado
            </h3>
            <p className="text-xs text-white/50 max-w-md mt-1.5">
              Assim que compradores começarem a preencher o checkout ou você cadastrar manualmente, os dados aparecerão aqui em tempo real.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="mt-4 px-4 py-2 rounded-xl bg-[#D9F22A] text-[#060A15] font-bold text-xs uppercase"
            >
              + Cadastrar Primeiro Cliente
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[920px]">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02] text-white/50 uppercase tracking-wider font-bold">
                  <th className="p-4">Cliente / Documento</th>
                  <th className="p-4">Contato (E-mail & Whats)</th>
                  <th className="p-4">Plano / Produto</th>
                  <th className="p-4">Status da Compra</th>
                  <th className="p-4">Valor / Histórico</th>
                  <th className="p-4">Data</th>
                  <th className="p-4 text-right">Remarketing & Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredClients.map((client) => {
                  const cleanPhone = (client.phone || '').replace(/\D/g, '');
                  const clientStatus = (client.status_compra || client.status || 'PAGO').toUpperCase();
                  const isPaid = clientStatus === 'PAGO' || clientStatus === 'APROVADO' || clientStatus === 'CONFIRMED' || clientStatus === 'RECEIVED';
                  const isPending = clientStatus === 'PENDENTE' || clientStatus === 'PIX_GERADO';
                  const isRefused = clientStatus === 'RECUSADO' || clientStatus === 'CANCELADO' || clientStatus === 'FAILED';

                  const dateFormatted = client.created_at ? new Date(client.created_at).toLocaleDateString('pt-BR') : '-';

                  // Dynamic WhatsApp recovery message
                  const waText = isPending
                    ? `Olá ${client.name}! Notamos que você gerou o pagamento para "${client.last_plan_name || 'seu pedido'}" no valor de R$ ${(client.valor_pedido || client.total_spent || 97).toFixed(2)}. Conseguiu realizar o pagamento? Caso precise de suporte ou de um cupom com desconto, me avise!`
                    : isRefused
                    ? `Olá ${client.name}! Vimos que houve uma recusa na tentativa de pagamento para "${client.last_plan_name || 'seu pedido'}". Deseja tentar via Pix com 10% de desconto ou outro cartão?`
                    : `Olá ${client.name}! Obrigado por ser nosso cliente na LeadsPay. Como podemos ajudar hoje?`;

                  const whatsappUrl = cleanPhone ? `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(waText)}` : null;

                  return (
                    <tr key={client.id} className="hover:bg-white/[0.02] transition-colors">
                      {/* Name & Document */}
                      <td className="p-4">
                        <div className="font-bold text-white text-sm">{client.name}</div>
                        {client.document ? (
                          <div className="text-[11px] text-white/40 font-mono flex items-center gap-1 mt-0.5">
                            <FileText className="w-3 h-3" />
                            {client.document.length === 11 
                              ? client.document.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') 
                              : client.document}
                          </div>
                        ) : (
                          <span className="text-[10px] text-white/30">Sem documento</span>
                        )}
                        <div className="text-[10px] text-white/30 font-mono mt-0.5">
                          ID: {client.id.slice(0, 15)}...
                        </div>
                      </td>

                      {/* Email & Phone */}
                      <td className="p-4">
                        <div className="flex items-center gap-1.5 text-white/80">
                          <Mail className="w-3.5 h-3.5 text-white/40 flex-shrink-0" />
                          <span className="truncate max-w-[200px]">{client.email}</span>
                        </div>
                        {client.phone ? (
                          <div className="flex items-center gap-1.5 text-white/50 text-[11px] mt-1 font-mono">
                            <Phone className="w-3 h-3 text-white/40 flex-shrink-0" />
                            <span>{client.phone}</span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-white/30 block mt-1">Sem telefone</span>
                        )}
                      </td>

                      {/* Plan Name */}
                      <td className="p-4">
                        <span className="font-bold text-white block">
                          {client.last_plan_name || 'Plano de Assinatura'}
                        </span>
                        <span className="text-[10px] text-white/40">
                          {client.orders_count || 1} pedido(s)
                        </span>
                      </td>

                      {/* Status da Compra */}
                      <td className="p-4">
                        {isPaid ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            Pago / Aprovado
                          </span>
                        ) : isPending ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                            Pendente (Checkout)
                          </span>
                        ) : isRefused ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                            Recusado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/10 text-white/70 border border-white/10">
                            {clientStatus}
                          </span>
                        )}
                      </td>

                      {/* Total Spent */}
                      <td className="p-4">
                        <div className="font-bold text-white font-mono text-xs">
                          R$ {(client.total_spent || client.valor_pedido || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                        {isPaid ? (
                          <span className="text-[10px] text-emerald-400 block mt-0.5">Concluído</span>
                        ) : (
                          <span className="text-[10px] text-amber-400 block mt-0.5">Aguardando</span>
                        )}
                      </td>

                      {/* Date */}
                      <td className="p-4 text-white/60 font-mono text-[11px]">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-white/40" />
                          {dateFormatted}
                        </div>
                      </td>

                      {/* Actions: Remarketing por Email & Whats */}
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Remarketing Email Button */}
                          <button
                            onClick={() => handleOpenRemarketing(client)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#D9F22A]/10 hover:bg-[#D9F22A]/25 text-[#D9F22A] font-bold text-[11px] transition-colors border border-[#D9F22A]/30 cursor-pointer"
                            title="Enviar Cupom de Remarketing por E-mail"
                          >
                            <Tag className="w-3 h-3" />
                            Enviar Cupom
                          </button>

                          {/* WhatsApp Direct Recovery */}
                          {whatsappUrl && (
                            <a
                              href={whatsappUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-400 transition-colors border border-emerald-500/20"
                              title="Recuperar no WhatsApp"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </a>
                          )}

                          {/* Delete Client */}
                          <button
                            onClick={() => handleDelete(client.id, client.name)}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-colors cursor-pointer"
                            title="Excluir cliente"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Remarketing Coupon Modal */}
      {isRemarketingOpen && remarketingClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-[#080d1a] border border-[#D9F22A]/40 rounded-3xl p-6 sm:p-7 shadow-[0_0_50px_rgba(217,242,42,0.2)]">
            <button
              onClick={() => setIsRemarketingOpen(false)}
              className="absolute top-5 right-5 text-white/50 hover:text-white transition-colors cursor-pointer w-8 h-8 rounded-full bg-white/5 flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-[#D9F22A]/15 text-[#D9F22A] flex items-center justify-center font-bold">
                <Tag className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-white font-['Syne']">
                  Enviar Cupom de Remarketing
                </h2>
                <p className="text-xs text-white/50">
                  Envie uma oferta por e-mail para <strong className="text-white">{remarketingClient.name}</strong> ({remarketingClient.email})
                </p>
              </div>
            </div>

            <form onSubmit={handleSendRemarketingEmail} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-white/70 font-bold mb-1">Código do Cupom</label>
                  <input
                    type="text"
                    required
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    placeholder="VOLTA10"
                    className="w-full bg-[#050811] border border-white/15 rounded-xl px-3.5 py-2.5 text-white font-mono font-bold uppercase focus:outline-none focus:border-[#D9F22A]"
                  />
                </div>

                <div>
                  <label className="block text-white/70 font-bold mb-1">Desconto</label>
                  <input
                    type="text"
                    required
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    placeholder="10% OFF ou R$ 20 OFF"
                    className="w-full bg-[#050811] border border-white/15 rounded-xl px-3.5 py-2.5 text-white font-bold focus:outline-none focus:border-[#D9F22A]"
                  />
                </div>
              </div>

              {/* Preset Coupons buttons */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-white/40">Sugestões rápidas:</span>
                <button
                  type="button"
                  onClick={() => { setCouponCode('VOLTA10'); setDiscountValue('10% OFF'); }}
                  className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white text-[10px] font-mono cursor-pointer"
                >
                  VOLTA10 (10%)
                </button>
                <button
                  type="button"
                  onClick={() => { setCouponCode('LEADSPAY15'); setDiscountValue('15% OFF'); }}
                  className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white text-[10px] font-mono cursor-pointer"
                >
                  LEADSPAY15 (15%)
                </button>
                <button
                  type="button"
                  onClick={() => { setCouponCode('DESCONTO20'); setDiscountValue('20% OFF'); }}
                  className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white text-[10px] font-mono cursor-pointer"
                >
                  DESCONTO20 (20%)
                </button>
              </div>

              <div>
                <label className="block text-white/70 font-bold mb-1">Mensagem Personalizada no E-mail</label>
                <textarea
                  rows={3}
                  required
                  value={customRemarketingMsg}
                  onChange={(e) => setCustomRemarketingMsg(e.target.value)}
                  className="w-full bg-[#050811] border border-white/15 rounded-xl p-3 text-white placeholder-white/30 focus:outline-none focus:border-[#D9F22A]"
                />
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] flex items-center gap-2">
                <Flame className="w-4 h-4 flex-shrink-0 text-amber-400" />
                <span>Remarketing aumenta em média 28% a taxa de recuperação de carrinhos abandonados e checkouts pendentes.</span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsRemarketingOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSendingRemarketing}
                  className="px-6 py-2.5 rounded-xl bg-[#D9F22A] hover:bg-[#cbe327] text-[#060A15] font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSendingRemarketing ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-[#060A15] border-t-transparent rounded-full animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      Disparar Cupom
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Cadastrar Cliente Manualmente */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-[#080d1a] border border-[#D9F22A]/40 rounded-3xl p-6 sm:p-7 shadow-[0_0_50px_rgba(217,242,42,0.15)] max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 text-white/50 hover:text-white transition-colors cursor-pointer w-8 h-8 rounded-full bg-white/5 flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-[#D9F22A]/10 text-[#D9F22A] flex items-center justify-center">
                <Plus className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <h2 className="text-lg font-black text-white font-['Syne']">
                  Cadastrar Novo Cliente
                </h2>
                <p className="text-xs text-white/50">
                  Adicione manualmente para sua base com status, CPF, celular e plano
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateClient} className="space-y-4 text-xs">
              <div>
                <label className="text-xs font-bold text-white/70 block mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Carlos Eduardo da Silva"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-[#050811] border border-white/15 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-[#D9F22A]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-white/70 block mb-1">
                  E-mail do Cliente *
                </label>
                <input
                  type="email"
                  required
                  placeholder="cliente@exemplo.com"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full bg-[#050811] border border-white/15 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-[#D9F22A]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-white/70 block mb-1">
                    Celular / WhatsApp (Número)
                  </label>
                  <input
                    type="text"
                    placeholder="(11) 99999-9999"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full bg-[#050811] border border-white/15 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-[#D9F22A]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-white/70 block mb-1">
                    CPF ou CNPJ
                  </label>
                  <input
                    type="text"
                    placeholder="000.000.000-00"
                    value={formDoc}
                    onChange={(e) => setFormDoc(e.target.value)}
                    className="w-full bg-[#050811] border border-white/15 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-[#D9F22A]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-white/70 block mb-1">
                    Status da Compra
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full bg-[#050811] border border-white/15 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-[#D9F22A]"
                  >
                    <option value="PAGO">Pago / Aprovado</option>
                    <option value="PENDENTE">Pendente (Checkout / Boleto)</option>
                    <option value="RECUSADO">Recusado (Falha de pagamento)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-white/70 block mb-1">
                    Valor (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="97.00"
                    value={formSpent}
                    onChange={(e) => setFormSpent(e.target.value)}
                    className="w-full bg-[#050811] border border-white/15 rounded-xl px-3.5 py-2.5 text-white font-mono focus:outline-none focus:border-[#D9F22A]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-white/70 block mb-1">
                  Plano / Produto
                </label>
                <input
                  type="text"
                  placeholder="Nome do Plano"
                  value={formPlanName}
                  onChange={(e) => setFormPlanName(e.target.value)}
                  className="w-full bg-[#050811] border border-white/15 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-[#D9F22A]"
                />
              </div>

              {companies.length > 0 && (
                <div>
                  <label className="text-xs font-bold text-white/70 block mb-1">
                    Vincular à Empresa
                  </label>
                  <select
                    value={formCompanyId}
                    onChange={(e) => setFormCompanyId(e.target.value)}
                    className="w-full bg-[#050811] border border-white/15 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-[#D9F22A]"
                  >
                    {companies.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-[#D9F22A] hover:bg-[#cbe327] text-[#060A15] font-black uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Salvando...' : 'Cadastrar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
