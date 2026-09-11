import React, { useState } from 'react';
import { 
  CreditCard, 
  Search, 
  Filter, 
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
  UserCheck,
  RefreshCw
} from 'lucide-react';
import { SaleTransaction, CompanyStartup } from '../../types/platform';

interface CobrancasViewProps {
  sales?: SaleTransaction[];
  companies?: CompanyStartup[];
  activeCompanyId?: string;
  onRefresh?: () => void;
}

export const CobrancasView: React.FC<CobrancasViewProps> = ({
  sales = [],
  companies = [],
  activeCompanyId,
  onRefresh
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Aprovado' | 'Pendente' | 'Cancelado'>('all');
  const [methodFilter, setMethodFilter] = useState<'all' | 'PIX' | 'Cartão' | 'Boleto'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedCharge, setSelectedCharge] = useState<SaleTransaction | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredSales = sales.filter((sale) => {
    if (statusFilter !== 'all' && sale.status !== statusFilter) return false;
    if (methodFilter !== 'all') {
      const m = (sale.method || '').toLowerCase();
      if (methodFilter === 'PIX' && !m.includes('pix')) return false;
      if (methodFilter === 'Cartão' && !m.includes('cart') && !m.includes('card')) return false;
      if (methodFilter === 'Boleto' && !m.includes('boleto')) return false;
    }
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      (sale.id && sale.id.toLowerCase().includes(q)) ||
      (sale.buyerName && sale.buyerName.toLowerCase().includes(q)) ||
      (sale.buyerEmail && sale.buyerEmail.toLowerCase().includes(q)) ||
      (sale.platformName && sale.platformName.toLowerCase().includes(q)) ||
      (sale.amount && String(sale.amount).includes(q))
    );
  });

  const totalVolume = sales.reduce((acc, s) => acc + (s.status === 'Aprovado' ? s.amount : 0), 0);
  const paidCount = sales.filter(s => s.status === 'Aprovado').length;
  const pendingCount = sales.filter(s => s.status === 'Pendente').length;
  const conversionRate = sales.length > 0 ? (paidCount / sales.length) * 100 : 0;

  return (
    <div className="space-y-6 animate-fadeIn" id="leadspay-cobrancas-view">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#D9F22A] mb-1">
            <CreditCard className="w-4 h-4" />
            Histórico & Gateway (Asaas / Mercado Pago)
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-['Syne']">
            Cobranças & Transações
          </h1>
          <p className="text-xs text-white/60 mt-1 max-w-xl">
            Acompanhe em tempo real todas as cobranças emitidas pelos seus checkouts com status, métodos de pagamento e links de 2ª via.
          </p>
        </div>

        {onRefresh && (
          <button
            onClick={onRefresh}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Atualizar
          </button>
        )}
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
          <span className="text-[11px] font-bold uppercase tracking-wider text-white/50 block">Taxa de Conversão</span>
          <div className="text-2xl font-black text-[#D9F22A] font-['Syne'] mt-1">
            {conversionRate.toFixed(1)}%
          </div>
          <span className="text-[11px] text-emerald-400 mt-1 block">Eficiência do checkout</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#080d1a] border border-white/10">
          <span className="text-[11px] font-bold uppercase tracking-wider text-white/50 block">Total de Cobranças</span>
          <div className="text-2xl font-black text-white font-['Syne'] mt-1">
            {sales.length}
          </div>
          <span className="text-[11px] text-white/40 mt-1 block">Emitidas na plataforma</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-[#080d1a] border border-white/10 p-4 rounded-2xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por ID, comprador, produto ou valor..."
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
              Aprovadas
            </button>
            <button
              onClick={() => setStatusFilter('Pendente')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'Pendente' ? 'bg-amber-500 text-black' : 'text-white/60 hover:text-white'
              }`}
            >
              Pendentes
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
              Todas as cobranças geradas via PIX, Cartão ou Boleto aparecerão aqui com status atualizado.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[760px]">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02] text-white/50 uppercase tracking-wider font-bold">
                  <th className="p-4">ID da Cobrança</th>
                  <th className="p-4">Comprador</th>
                  <th className="p-4">Produto / Plano</th>
                  <th className="p-4">Valor</th>
                  <th className="p-4">Método</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Data / Hora</th>
                  <th className="p-4 text-right">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredSales.map((sale) => {
                  const isApproved = sale.status === 'Aprovado' || (sale as any).status === 'RECEIVED' || (sale as any).status === 'CONFIRMED';
                  const isPending = sale.status === 'Pendente' || (sale as any).status === 'PENDING';
                  const isPix = (sale.method || '').toLowerCase().includes('pix');

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
                        <div className="text-[11px] text-white/50 truncate max-w-[180px]">
                          {sale.buyerEmail || 'cliente@email.com'}
                        </div>
                      </td>

                      {/* Product */}
                      <td className="p-4">
                        <span className="font-bold text-white">
                          {sale.platformName || 'Plano'}
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
                        {sale.commissionEarned && sale.commissionEarned > 0 && (
                          <div className="text-[10px] text-[#D9F22A] font-mono">
                            Comissão: R$ {sale.commissionEarned.toFixed(2)}
                          </div>
                        )}
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
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" />
                            Aprovado
                          </span>
                        ) : isPending ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            <Clock className="w-3 h-3" />
                            Pendente
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20">
                            <XCircle className="w-3 h-3" />
                            Cancelado
                          </span>
                        )}
                      </td>

                      {/* Date */}
                      <td className="p-4 text-white/60 font-mono text-[11px]">
                        <div>{sale.date || '-'}</div>
                        <div className="text-[10px] text-white/40">{sale.time || ''}</div>
                      </td>

                      {/* Action */}
                      <td className="p-4 text-right">
                        <button
                          onClick={() => setSelectedCharge(sale)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
                          title="Ver detalhes da cobrança"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
                  Dados do Comprador
                </span>
                <div className="flex justify-between">
                  <span className="text-white/50">Nome:</span>
                  <span className="font-bold text-white">{selectedCharge.buyerName || 'Não informado'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">E-mail:</span>
                  <span className="text-white/80">{selectedCharge.buyerEmail || 'Não informado'}</span>
                </div>
                {(selectedCharge as any).buyerCpf && (
                  <div className="flex justify-between">
                    <span className="text-white/50">Documento:</span>
                    <span className="font-mono text-white/80">{(selectedCharge as any).buyerCpf}</span>
                  </div>
                )}
              </div>

              {(selectedCharge as any).ticket_url && (
                <div className="pt-2">
                  <a
                    href={(selectedCharge as any).ticket_url}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#D9F22A] hover:bg-[#cbe327] text-[#060A15] font-black text-xs uppercase tracking-wider transition-all"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Visualizar Fatura / 2ª Via no Asaas
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
