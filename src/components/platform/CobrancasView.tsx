import React, { useState } from 'react';
import { 
  CreditCard, 
  Search, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  QrCode, 
  ExternalLink, 
  Copy, 
  Check, 
  Calendar, 
  DollarSign, 
  Eye, 
  X, 
  FileText, 
  Building2, 
  RefreshCw, 
  Mail, 
  Plus, 
  Send, 
  MessageCircle, 
  Phone,
  AlertCircle,
  Trash2
} from 'lucide-react';
import { SaleTransaction, CompanyStartup, CompanyPlan } from '../../types/platform';
import { 
  createSaleTransactionInFirebase, 
  createOrUpdateClientInFirebase,
  deleteChargeAndClientInFirebase
} from '../../services/firestoreService';

interface CobrancasViewProps {
  sales?: SaleTransaction[];
  companies?: CompanyStartup[];
  activeCompanyId?: string;
  plans?: CompanyPlan[];
  onRefresh?: () => void;
  onAddSale?: (sale: SaleTransaction) => void;
  onDeleteSale?: (saleId: string) => void;
}

export const CobrancasView: React.FC<CobrancasViewProps> = ({
  sales = [],
  companies = [],
  activeCompanyId,
  plans = [],
  onRefresh,
  onAddSale,
  onDeleteSale
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Aprovado' | 'Pendente' | 'Cancelado' | 'Recusado'>('all');
  const [methodFilter, setMethodFilter] = useState<'all' | 'PIX' | 'Cartão' | 'Boleto'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedCharge, setSelectedCharge] = useState<SaleTransaction | null>(null);
  const [clientToDelete, setClientToDelete] = useState<SaleTransaction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Manual Billing Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formCpf, setFormCpf] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formPlanId, setFormPlanId] = useState(plans[0]?.id || 'custom');
  const [formPlanName, setFormPlanName] = useState(plans[0]?.name || 'Plano de Assinatura');
  const [formAmount, setFormAmount] = useState(plans[0]?.price ? String(plans[0].price) : '97.00');
  const [formDueDate, setFormDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split('T')[0];
  });
  const [formMethod, setFormMethod] = useState<'PIX' | 'Cartão de Crédito' | 'Boleto Bancário'>('PIX');
  const [formSendEmail, setFormSendEmail] = useState(true);
  const [formCompanyId, setFormCompanyId] = useState(activeCompanyId || companies[0]?.id || 'store_default');
  const [formDescription, setFormDescription] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Confirmar exclusão da cobrança e do cliente
  const handleConfirmDelete = async () => {
    if (!clientToDelete) return;
    setIsDeleting(true);
    try {
      const result = await deleteChargeAndClientInFirebase(
        clientToDelete.id,
        clientToDelete.buyerEmail,
        (clientToDelete as any).buyerDocument || (clientToDelete as any).buyerCpf
      );

      if (result.success) {
        showToast(`Cliente ${clientToDelete.buyerName || ''} e cobrança apagados com sucesso!`);
        if (onDeleteSale) {
          onDeleteSale(clientToDelete.id);
        }
        if (onRefresh) {
          onRefresh();
        }
        if (selectedCharge?.id === clientToDelete.id) {
          setSelectedCharge(null);
        }
        setClientToDelete(null);
      } else {
        alert('Não foi possível excluir a cobrança. Tente novamente.');
      }
    } catch (err: any) {
      console.error('Erro ao excluir cliente:', err);
      alert(err.message || 'Erro ao excluir cobrança.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Enviar cobrança por e-mail para o cliente/devedor
  const handleSendChargeEmail = async (charge: SaleTransaction) => {
    const targetEmail = charge.buyerEmail;
    if (!targetEmail || !targetEmail.includes('@')) {
      alert('Esta cobrança não possui um endereço de e-mail válido.');
      return;
    }

    setSendingEmailId(charge.id);
    try {
      const response = await fetch('/api/cobranca/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: targetEmail,
          customerName: charge.buyerName || 'Cliente',
          planName: charge.platformName || 'Cobrança',
          amount: charge.amount || 0,
          paymentUrl: (charge as any).paymentUrl || (charge as any).ticket_url || window.location.origin,
          dueDate: (charge as any).dueDate || charge.date,
          companyName: charge.companyName || 'LeadsPay',
          description: `Cobrança referente ao plano ${charge.platformName || ''}. ID: ${charge.id}`
        })
      });

      const resJson = await response.json().catch(() => ({}));
      if (response.ok && resJson.success) {
        showToast(`Cobrança enviada com sucesso para ${targetEmail}!`);
      } else {
        alert(resJson.error || 'Não foi possível enviar o e-mail no momento.');
      }
    } catch (err: any) {
      console.error('Erro ao enviar e-mail de cobrança:', err);
      alert('Erro de conexão ao enviar o e-mail.');
    } finally {
      setSendingEmailId(null);
    }
  };

  // Criar nova cobrança manualmente
  const handleCreateManualCharge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formEmail.trim() || !formAmount) {
      alert('Preencha ao menos Nome, E-mail e Valor da cobrança.');
      return;
    }

    const cleanAmount = parseFloat(formAmount.replace(',', '.')) || 0;
    if (cleanAmount <= 0) {
      alert('Informe um valor válido maior que zero.');
      return;
    }

    setIsSubmitting(true);
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const newTxId = `COB-${Date.now().toString().slice(-6)}`;
    const cleanDoc = formCpf.replace(/\D/g, '');
    const cleanPhone = formPhone.replace(/\D/g, '');

    const selectedCompany = companies.find(c => c.id === formCompanyId);
    const companyTitle = selectedCompany?.name || 'LeadsPay';

    const newSale: SaleTransaction = {
      id: newTxId,
      platformId: formPlanId,
      platformName: formPlanName,
      companyId: formCompanyId,
      companyName: companyTitle,
      buyerName: formName.trim(),
      buyerEmail: formEmail.trim(),
      buyerCompany: companyTitle,
      amount: cleanAmount,
      commissionEarned: 0,
      method: formMethod,
      status: 'Pendente',
      is_test: false,
      environment: 'production',
      date: dateStr,
      time: timeStr
    };

    // Attach extra metadata
    (newSale as any).buyerPhone = cleanPhone;
    (newSale as any).buyerDocument = cleanDoc;
    (newSale as any).dueDate = formDueDate;
    (newSale as any).description = formDescription;

    try {
      // 1. Gravar transação no Firestore
      await createSaleTransactionInFirebase(newSale);

      // 2. Gravar cliente na coleção 'clients' para remarketing imediato
      await createOrUpdateClientInFirebase({
        store_id: formCompanyId,
        name: formName.trim(),
        email: formEmail.trim(),
        phone: cleanPhone,
        document: cleanDoc,
        total_spent: cleanAmount,
        valor_pedido: cleanAmount,
        last_plan_name: formPlanName,
        status_compra: 'PENDENTE',
        status: 'PENDENTE',
        is_test: false,
        environment: 'production'
      });

      // 3. Atualizar estado local
      if (onAddSale) {
        onAddSale(newSale);
      }

      // 4. Se marcado para enviar e-mail imediatamente
      if (formSendEmail) {
        try {
          await fetch('/api/cobranca/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: formEmail.trim(),
              customerName: formName.trim(),
              planName: formPlanName,
              amount: cleanAmount,
              dueDate: formDueDate,
              companyName: companyTitle,
              description: formDescription || `Fatura gerada para ${formPlanName}.`
            })
          });
          showToast(`Cobrança criada e enviada com sucesso para ${formEmail}!`);
        } catch (e) {
          console.warn('Falha no envio do e-mail da cobrança:', e);
          showToast('Cobrança cadastrada com sucesso! (Aviso: e-mail pendente)');
        }
      } else {
        showToast('Cobrança cadastrada com sucesso!');
      }

      // Reset form and close modal
      setIsModalOpen(false);
      setFormName('');
      setFormEmail('');
      setFormCpf('');
      setFormPhone('');
      setFormDescription('');
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error('Erro ao cadastrar cobrança:', err);
      alert(`Erro ao cadastrar cobrança: ${err.message || 'Tente novamente.'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredSales = sales.filter((sale) => {
    if (statusFilter !== 'all') {
      if (statusFilter === 'Recusado' || statusFilter === 'Cancelado') {
        if (sale.status !== 'Recusado' && sale.status !== 'Cancelado') return false;
      } else if (sale.status !== statusFilter) {
        return false;
      }
    }
    if (methodFilter !== 'all') {
      const m = (sale.method || '').toLowerCase();
      if (methodFilter === 'PIX' && !m.includes('pix')) return false;
      if (methodFilter === 'Cartão' && !m.includes('cart') && !m.includes('card')) return false;
      if (methodFilter === 'Boleto' && !m.includes('boleto')) return false;
    }
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    const doc = (sale as any).buyerDocument || (sale as any).buyerCpf || '';
    const phone = (sale as any).buyerPhone || '';
    return (
      (sale.id && sale.id.toLowerCase().includes(q)) ||
      (sale.buyerName && sale.buyerName.toLowerCase().includes(q)) ||
      (sale.buyerEmail && sale.buyerEmail.toLowerCase().includes(q)) ||
      (sale.platformName && sale.platformName.toLowerCase().includes(q)) ||
      (doc && doc.includes(q)) ||
      (phone && phone.includes(q)) ||
      (sale.amount && String(sale.amount).includes(q))
    );
  });

  const totalVolume = sales.reduce((acc, s) => acc + (s.status === 'Aprovado' ? s.amount : 0), 0);
  const paidCount = sales.filter(s => s.status === 'Aprovado').length;
  const pendingCount = sales.filter(s => s.status === 'Pendente').length;
  const refusedCount = sales.filter(s => s.status === 'Recusado' || s.status === 'Cancelado').length;

  return (
    <div className="space-y-6 animate-fadeIn" id="leadspay-cobrancas-view">
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
            <CreditCard className="w-4 h-4" />
            Gestão Financeira & Cobranças
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-['Syne']">
            Cobranças dos Clientes & Planos
          </h1>
          <p className="text-xs text-white/60 mt-1 max-w-xl">
            Visualize clientes que assinaram planos, cobranças automáticas de checkouts e cadastre novas cobranças manuais com disparo para o e-mail do devedor.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white font-bold text-xs transition-colors cursor-pointer border border-white/10"
              title="Atualizar transações"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Atualizar
            </button>
          )}

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#D9F22A] hover:bg-[#cbe327] text-[#060A15] font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(217,242,42,0.25)] cursor-pointer"
            id="btn-nova-cobranca"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            + Nova Cobrança
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[#080d1a] border border-white/10">
          <span className="text-[11px] font-bold uppercase tracking-wider text-white/50 block">Volume Aprovado</span>
          <div className="text-2xl font-black text-emerald-400 font-['Syne'] mt-1">
            R$ {totalVolume.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-white/40 mt-1 block">
            {paidCount} cobrança(s) paga(s)
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[#080d1a] border border-white/10">
          <span className="text-[11px] font-bold uppercase tracking-wider text-white/50 block">Cobranças Pendentes</span>
          <div className="text-2xl font-black text-amber-400 font-['Syne'] mt-1">
            {pendingCount}
          </div>
          <span className="text-[11px] text-white/40 mt-1 block">Aguardando compensação</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#080d1a] border border-white/10">
          <span className="text-[11px] font-bold uppercase tracking-wider text-white/50 block">Recusadas / Canceladas</span>
          <div className="text-2xl font-black text-rose-400 font-['Syne'] mt-1">
            {refusedCount}
          </div>
          <span className="text-[11px] text-white/40 mt-1 block">Prontas para recuperação</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#080d1a] border border-white/10">
          <span className="text-[11px] font-bold uppercase tracking-wider text-white/50 block">Total de Cobranças</span>
          <div className="text-2xl font-black text-[#D9F22A] font-['Syne'] mt-1">
            {sales.length}
          </div>
          <span className="text-[11px] text-emerald-400 mt-1 block">Base ativa LeadsPay</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-[#080d1a] border border-white/10 p-4 rounded-2xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por ID, nome, e-mail, celular, CPF ou plano..."
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

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-[#050811] p-1 rounded-xl border border-white/10">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'all' ? 'bg-[#D9F22A] text-[#060A15]' : 'text-white/60 hover:text-white'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setStatusFilter('Aprovado')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'Aprovado' ? 'bg-emerald-500 text-black' : 'text-white/60 hover:text-white'
              }`}
            >
              Pagas
            </button>
            <button
              onClick={() => setStatusFilter('Pendente')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'Pendente' ? 'bg-amber-500 text-black' : 'text-white/60 hover:text-white'
              }`}
            >
              Pendentes
            </button>
            <button
              onClick={() => setStatusFilter('Recusado')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'Recusado' ? 'bg-rose-500 text-white' : 'text-white/60 hover:text-white'
              }`}
            >
              Recusadas
            </button>
          </div>

          {/* Method Filter */}
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value as any)}
            className="bg-[#050811] border border-white/15 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[#D9F22A]"
          >
            <option value="all">Todos os Métodos</option>
            <option value="PIX">PIX</option>
            <option value="Cartão">Cartão de Crédito</option>
            <option value="Boleto">Boleto Bancário</option>
          </select>
        </div>
      </div>

      {/* Charges Table */}
      <div className="bg-[#080d1a] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
        {filteredSales.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 mb-3">
              <CreditCard className="w-7 h-7 text-[#D9F22A]/60" />
            </div>
            <h3 className="text-base font-bold text-white font-['Syne']">
              Nenhuma cobrança encontrada
            </h3>
            <p className="text-xs text-white/50 max-w-md mt-1.5">
              Todas as cobranças dos clientes que assinaram planos e cobranças manuais emitidas aparecerão aqui.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="mt-4 px-4 py-2 rounded-xl bg-[#D9F22A] text-[#060A15] font-black text-xs uppercase tracking-wider"
            >
              + Criar Primeira Cobrança
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[920px]">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02] text-white/50 uppercase tracking-wider font-bold">
                  <th className="p-4">ID / Fatura</th>
                  <th className="p-4">Cliente / Devedor</th>
                  <th className="p-4">Plano / Produto</th>
                  <th className="p-4">Valor</th>
                  <th className="p-4">Método</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Data</th>
                  <th className="p-4 text-right">Ações & Disparo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredSales.map((sale) => {
                  const isApproved = sale.status === 'Aprovado' || (sale as any).status === 'RECEIVED' || (sale as any).status === 'CONFIRMED';
                  const isPending = sale.status === 'Pendente' || (sale as any).status === 'PENDING';
                  const isRefused = sale.status === 'Recusado' || sale.status === 'Cancelado';
                  const isPix = (sale.method || '').toLowerCase().includes('pix');
                  const buyerDoc = (sale as any).buyerDocument || (sale as any).buyerCpf || '';
                  const buyerPhone = (sale as any).buyerPhone || '';
                  const cleanPhone = buyerPhone.replace(/\D/g, '');
                  const whatsappLink = cleanPhone 
                    ? `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(`Olá ${sale.buyerName || 'Cliente'}! Segue sua cobrança do plano ${sale.platformName || 'LeadsPay'} no valor de R$ ${Number(sale.amount || 0).toFixed(2)}. Acesse para efetuar o pagamento: ${window.location.origin}`)}`
                    : null;

                  return (
                    <tr key={sale.id} className="hover:bg-white/[0.02] transition-colors">
                      {/* ID */}
                      <td className="p-4 font-mono text-[11px] text-white/60">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate max-w-[110px]">{sale.id}</span>
                          <button
                            onClick={() => handleCopy(sale.id, sale.id)}
                            className="text-white/40 hover:text-[#D9F22A] p-1"
                            title="Copiar ID"
                          >
                            {copiedId === sale.id ? <Check className="w-3.5 h-3.5 text-[#D9F22A]" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>

                      {/* Buyer */}
                      <td className="p-4">
                        <div className="font-bold text-white text-sm">
                          {sale.buyerName || 'Cliente LeadsPay'}
                        </div>
                        <div className="text-[11px] text-white/50 truncate max-w-[180px] flex items-center gap-1 mt-0.5">
                          <Mail className="w-3 h-3 text-white/30" />
                          <span>{sale.buyerEmail || 'Sem e-mail'}</span>
                        </div>
                        {(buyerDoc || buyerPhone) && (
                          <div className="text-[10px] text-white/40 font-mono flex items-center gap-2 mt-0.5">
                            {buyerDoc && <span>CPF: {buyerDoc}</span>}
                            {buyerPhone && <span>Tel: {buyerPhone}</span>}
                          </div>
                        )}
                      </td>

                      {/* Product */}
                      <td className="p-4">
                        <span className="font-bold text-white">
                          {sale.platformName || 'Plano de Assinatura'}
                        </span>
                        {sale.buyerCompany && (
                          <span className="text-[10px] text-white/40 block">
                            {sale.buyerCompany}
                          </span>
                        )}
                      </td>

                      {/* Amount */}
                      <td className="p-4">
                        <div className="font-black text-white font-mono text-sm">
                          R$ {Number(sale.amount || 0).toFixed(2)}
                        </div>
                        {sale.commissionEarned && sale.commissionEarned > 0 ? (
                          <div className="text-[10px] text-[#D9F22A] font-mono">
                            Comissão: R$ {sale.commissionEarned.toFixed(2)}
                          </div>
                        ) : null}
                      </td>

                      {/* Method */}
                      <td className="p-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/5 text-white/80 border border-white/10">
                          {isPix && <QrCode className="w-3 h-3 text-[#D9F22A]" />}
                          {!isPix && <CreditCard className="w-3 h-3 text-sky-400" />}
                          {sale.method || 'PIX'}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="p-4">
                        {isApproved ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3" />
                            Aprovado / Pago
                          </span>
                        ) : isPending ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                            Pendente
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                            <XCircle className="w-3 h-3" />
                            {isRefused ? 'Recusado' : 'Cancelado'}
                          </span>
                        )}
                      </td>

                      {/* Date */}
                      <td className="p-4 text-white/60 font-mono text-[11px]">
                        <div>{sale.date || '-'}</div>
                        <div className="text-[10px] text-white/40">{sale.time || ''}</div>
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Send by Email Button */}
                          <button
                            onClick={() => handleSendChargeEmail(sale)}
                            disabled={sendingEmailId === sale.id}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-[#D9F22A]/15 text-white/70 hover:text-[#D9F22A] transition-colors cursor-pointer border border-white/10"
                            title="Enviar fatura para o e-mail do devedor"
                          >
                            {sendingEmailId === sale.id ? (
                              <div className="w-3.5 h-3.5 border-2 border-[#D9F22A] border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Mail className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {/* Charge on WhatsApp Button */}
                          {whatsappLink && (
                            <a
                              href={whatsappLink}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-400 transition-colors border border-emerald-500/20"
                              title="Cobrar cliente no WhatsApp"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </a>
                          )}

                          {/* Details Button */}
                          <button
                            onClick={() => setSelectedCharge(sale)}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
                            title="Ver detalhes da cobrança"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Client & Charge Button */}
                          <button
                            onClick={() => setClientToDelete(sale)}
                            className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors cursor-pointer border border-red-500/20"
                            title="Apagar cliente e cobrança"
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

      {/* Manual Charge Creation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-xl bg-[#080d1a] border border-[#D9F22A]/40 rounded-3xl p-6 sm:p-7 shadow-[0_0_60px_rgba(217,242,42,0.2)] max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 text-white/50 hover:text-white transition-colors cursor-pointer w-8 h-8 rounded-full bg-white/5 flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-[#D9F22A]/15 text-[#D9F22A] flex items-center justify-center font-bold">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-black text-white font-['Syne']">
                  Cadastrar Nova Cobrança
                </h2>
                <p className="text-xs text-white/50">
                  Preencha os dados do cliente devedor para emitir a cobrança e enviar por e-mail.
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateManualCharge} className="space-y-4 text-xs">
              {/* Client Name & Document */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-white/70 font-bold mb-1">Nome Completo do Cliente *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: João da Silva"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full bg-[#050811] border border-white/15 rounded-xl px-3.5 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-[#D9F22A]"
                  />
                </div>
                <div>
                  <label className="block text-white/70 font-bold mb-1">CPF ou CNPJ</label>
                  <input
                    type="text"
                    placeholder="000.000.000-00"
                    value={formCpf}
                    onChange={(e) => setFormCpf(e.target.value)}
                    className="w-full bg-[#050811] border border-white/15 rounded-xl px-3.5 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-[#D9F22A]"
                  />
                </div>
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-white/70 font-bold mb-1">E-mail do Devedor *</label>
                  <input
                    type="email"
                    required
                    placeholder="cliente@exemplo.com"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full bg-[#050811] border border-white/15 rounded-xl px-3.5 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-[#D9F22A]"
                  />
                </div>
                <div>
                  <label className="block text-white/70 font-bold mb-1">Número de Celular / WhatsApp</label>
                  <input
                    type="text"
                    placeholder="(11) 99999-9999"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full bg-[#050811] border border-white/15 rounded-xl px-3.5 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-[#D9F22A]"
                  />
                </div>
              </div>

              {/* Plan & Amount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-white/70 font-bold mb-1">Plano ou Produto</label>
                  {plans.length > 0 ? (
                    <select
                      value={formPlanId}
                      onChange={(e) => {
                        const pid = e.target.value;
                        setFormPlanId(pid);
                        const sel = plans.find(p => p.id === pid);
                        if (sel) {
                          setFormPlanName(sel.name);
                          if (sel.price) setFormAmount(String(sel.price));
                        }
                      }}
                      className="w-full bg-[#050811] border border-white/15 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-[#D9F22A]"
                    >
                      {plans.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} - R$ {Number(p.price || 0).toFixed(2)}
                        </option>
                      ))}
                      <option value="custom">Outro (digitar manual)</option>
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder="Nome do Plano / Serviço"
                      value={formPlanName}
                      onChange={(e) => setFormPlanName(e.target.value)}
                      className="w-full bg-[#050811] border border-white/15 rounded-xl px-3.5 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-[#D9F22A]"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-white/70 font-bold mb-1">Valor da Cobrança (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    className="w-full bg-[#050811] border border-white/15 rounded-xl px-3.5 py-2.5 text-white placeholder-white/30 font-mono font-bold focus:outline-none focus:border-[#D9F22A]"
                  />
                </div>
              </div>

              {/* Due date & Payment method */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-white/70 font-bold mb-1">Data de Vencimento</label>
                  <input
                    type="date"
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    className="w-full bg-[#050811] border border-white/15 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-[#D9F22A]"
                  />
                </div>

                <div>
                  <label className="block text-white/70 font-bold mb-1">Método de Pagamento</label>
                  <select
                    value={formMethod}
                    onChange={(e) => setFormMethod(e.target.value as any)}
                    className="w-full bg-[#050811] border border-white/15 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-[#D9F22A]"
                  >
                    <option value="PIX">PIX</option>
                    <option value="Cartão de Crédito">Cartão de Crédito</option>
                    <option value="Boleto Bancário">Boleto Bancário</option>
                  </select>
                </div>
              </div>

              {/* Description / Instructions */}
              <div>
                <label className="block text-white/70 font-bold mb-1">Instruções / Observações (opcional)</label>
                <textarea
                  rows={2}
                  placeholder="Informações adicionais para o cliente..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full bg-[#050811] border border-white/15 rounded-xl p-3 text-white placeholder-white/30 focus:outline-none focus:border-[#D9F22A]"
                />
              </div>

              {/* Checkbox Send Email */}
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="chk-send-email"
                  checked={formSendEmail}
                  onChange={(e) => setFormSendEmail(e.target.checked)}
                  className="mt-0.5 accent-[#D9F22A] w-4 h-4 cursor-pointer"
                />
                <label htmlFor="chk-send-email" className="text-white/80 cursor-pointer">
                  <strong className="text-white block">Enviar fatura imediatamente para o e-mail do devedor</strong>
                  <span className="text-[11px] text-white/50 block">
                    O cliente receberá uma notificação formatada com detalhes do valor e instruções de pagamento.
                  </span>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-[#D9F22A] hover:bg-[#cbe327] text-[#060A15] font-black uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(217,242,42,0.2)] flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-[#060A15] border-t-transparent rounded-full animate-spin" />
                      Emitindo...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      Emitir Cobrança
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Charge Details Modal */}
      {selectedCharge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-[#080d1a] border border-[#D9F22A]/40 rounded-3xl p-6 sm:p-7 shadow-[0_0_50px_rgba(217,242,42,0.15)]">
            <button
              onClick={() => setSelectedCharge(null)}
              className="absolute top-5 right-5 text-white/50 hover:text-white transition-colors cursor-pointer w-8 h-8 rounded-full bg-white/5 flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-[#D9F22A]/10 text-[#D9F22A] flex items-center justify-center">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-white font-['Syne']">
                  Detalhes da Cobrança
                </h2>
                <span className="text-xs text-white/50 font-mono">
                  ID: {selectedCharge.id}
                </span>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-2xl bg-[#050811] border border-white/5 space-y-2">
                <div className="flex justify-between">
                  <span className="text-white/50">Valor Total:</span>
                  <span className="font-black text-emerald-400 font-mono text-sm">
                    R$ {Number(selectedCharge.amount).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">Status:</span>
                  <span className="font-bold text-white">{selectedCharge.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">Plano / Produto:</span>
                  <span className="font-bold text-white">{selectedCharge.platformName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">Método de Pagamento:</span>
                  <span className="font-bold text-white">{selectedCharge.method || 'PIX'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">Data / Horário:</span>
                  <span className="font-mono text-white/80">{selectedCharge.date} {selectedCharge.time}</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#050811] border border-white/5 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 block mb-1">
                  Dados do Cliente / Devedor
                </span>
                <div className="flex justify-between">
                  <span className="text-white/50">Nome:</span>
                  <span className="font-bold text-white">{selectedCharge.buyerName || 'Não informado'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">E-mail:</span>
                  <span className="text-white/80">{selectedCharge.buyerEmail || 'Não informado'}</span>
                </div>
                {((selectedCharge as any).buyerDocument || (selectedCharge as any).buyerCpf) && (
                  <div className="flex justify-between">
                    <span className="text-white/50">CPF / CNPJ:</span>
                    <span className="font-mono text-white/80">{(selectedCharge as any).buyerDocument || (selectedCharge as any).buyerCpf}</span>
                  </div>
                )}
                {(selectedCharge as any).buyerPhone && (
                  <div className="flex justify-between">
                    <span className="text-white/50">Celular / WhatsApp:</span>
                    <span className="font-mono text-white/80">{(selectedCharge as any).buyerPhone}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2">
                <button
                  onClick={() => handleSendChargeEmail(selectedCharge)}
                  disabled={sendingEmailId === selectedCharge.id}
                  className="w-full flex items-center justify-center gap-2 py-3 px-2 rounded-xl bg-white/10 hover:bg-[#D9F22A]/20 text-white hover:text-[#D9F22A] font-bold text-xs transition-all cursor-pointer border border-white/10"
                >
                  <Mail className="w-4 h-4" />
                  E-mail
                </button>

                {(selectedCharge as any).buyerPhone ? (
                  <a
                    href={`https://wa.me/55${(selectedCharge as any).buyerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá ${selectedCharge.buyerName}! Segue o link da sua fatura pendente de R$ ${Number(selectedCharge.amount).toFixed(2)}.`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full flex items-center justify-center gap-2 py-3 px-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 font-bold text-xs transition-all border border-emerald-500/30"
                  >
                    <MessageCircle className="w-4 h-4" />
                    WhatsApp
                  </a>
                ) : (
                  <button
                    onClick={() => handleCopy(`${window.location.origin}`, selectedCharge.id)}
                    className="w-full flex items-center justify-center gap-2 py-3 px-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition-all cursor-pointer"
                  >
                    <Copy className="w-4 h-4" />
                    Link
                  </button>
                )}

                <button
                  onClick={() => setClientToDelete(selectedCharge)}
                  className="w-full flex items-center justify-center gap-2 py-3 px-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-400 font-bold text-xs transition-all cursor-pointer border border-red-500/30"
                >
                  <Trash2 className="w-4 h-4" />
                  Apagar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal to Delete Client & Charge */}
      {clientToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-[#080d1a] border border-red-500/40 rounded-3xl p-6 shadow-[0_0_50px_rgba(239,68,68,0.25)]">
            <div className="w-12 h-12 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 mb-4 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-black text-white text-center font-['Syne'] mb-2">
              Apagar Cliente e Cobrança?
            </h3>

            <p className="text-xs text-white/60 text-center mb-5 leading-relaxed">
              Você está prestes a apagar o cliente <strong className="text-white">{clientToDelete.buyerName}</strong> ({clientToDelete.buyerEmail}) e remover esta cobrança de <strong className="text-[#D9F22A]">R$ {Number(clientToDelete.amount).toFixed(2)}</strong>. Esta ação não poderá ser desfeita.
            </p>

            <div className="p-3 bg-[#050811] rounded-xl border border-white/5 text-[11px] text-white/70 space-y-1 mb-5">
              <div className="flex justify-between">
                <span>Fatura ID:</span>
                <span className="font-mono text-white/50">{clientToDelete.id}</span>
              </div>
              <div className="flex justify-between">
                <span>Status Atual:</span>
                <span className="font-bold text-amber-400">{clientToDelete.status}</span>
              </div>
              {((clientToDelete as any).buyerDocument || (clientToDelete as any).buyerCpf) && (
                <div className="flex justify-between">
                  <span>Documento:</span>
                  <span className="font-mono text-white/80">{(clientToDelete as any).buyerDocument || (clientToDelete as any).buyerCpf}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setClientToDelete(null)}
                disabled={isDeleting}
                className="w-full py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs transition-colors cursor-pointer border border-white/10 disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="w-full py-3 px-4 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-xs transition-all cursor-pointer shadow-[0_0_20px_rgba(239,68,68,0.4)] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                {isDeleting ? 'Apagando...' : 'Sim, Apagar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
