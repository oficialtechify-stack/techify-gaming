import React, { useState } from 'react';
import { SaleTransaction } from '../../types/platform';
import { 
  ShoppingBag, 
  Search, 
  Filter, 
  Download, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  ExternalLink,
  Zap,
  DollarSign
} from 'lucide-react';

interface VendasViewProps {
  roleMode?: string;
  transactions: SaleTransaction[];
}

export const VendasView: React.FC<VendasViewProps> = ({
  roleMode = 'afiliado',
  transactions
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedTxDetail, setSelectedTxDetail] = useState<SaleTransaction | null>(null);

  const safeTransactions = Array.isArray(transactions) ? transactions : [];

  const statusKind = (value: unknown): 'Aprovado' | 'Pendente' | 'Cancelado' => {
    const status = String(value || '').trim().toLowerCase();
    if (['aprovado', 'approved', 'liberado', 'received', 'confirmed'].includes(status)) return 'Aprovado';
    if (['pendente', 'pending', 'processing', 'em análise', 'em analise'].includes(status)) return 'Pendente';
    return 'Cancelado';
  };

  const filteredTransactions = safeTransactions.filter(t => {
    if (!t) return false;
    if (statusFilter !== 'all' && statusKind(t.status) !== statusFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        (t.id || '').toLowerCase().includes(q) ||
        (t.platformName || '').toLowerCase().includes(q) ||
        (t.buyerName || '').toLowerCase().includes(q) ||
        (t.buyerCompany || '').toLowerCase().includes(q) ||
        (t.buyerEmail || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const approvedFiltered = filteredTransactions.filter((t) => statusKind(t.status) === 'Aprovado');
  const totalCommissionsFiltered = approvedFiltered.reduce(
    (acc, t) => acc + (Number(t.commissionEarned ?? (t as any)?.commissionValue) || 0),
    0,
  );
  const totalVolumeFiltered = approvedFiltered.reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
  const totalCompanyNet = approvedFiltered.reduce((acc, t) => {
    const explicitNet = Number((t as any).netCompanyAmount);
    if (Number.isFinite(explicitNet)) return acc + explicitNet;
    const commission = Number(t.commissionEarned ?? (t as any)?.commissionValue) || 0;
    const checkoutFee = Number((t as any).checkoutFee || (t as any).financialBreakdown?.platformFee || 0);
    return acc + Math.max(0, (Number(t.amount) || 0) - commission - checkoutFee);
  }, 0);

  return (
    <div className="flex flex-col gap-6" id="leadspay-vendas-view">
      {/* Header with Quick KPI Cards */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-['Syne']">
            {roleMode === 'empresa' ? 'Vendas & Pedidos da Empresa' : 'Minhas Vendas & Comissões'}
          </h1>
          <p className="text-xs text-white/60 mt-1">
            {roleMode === 'empresa'
              ? 'Histórico real de assinaturas e compras dos produtos desta empresa, incluindo vendas diretas e vendas da rede de afiliados.'
              : 'Histórico completo de contratos gerados através dos seus links de afiliação.'}
          </p>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#080d1a] border border-white/10 p-4 rounded-xl">
          <span className="text-[11px] text-white/50 uppercase font-bold block">Transações Listadas</span>
          <span className="text-xl font-black text-white font-['Syne'] mt-1 block">
            {filteredTransactions.length} vendas
          </span>
        </div>
        <div className="bg-[#080d1a] border border-white/10 p-4 rounded-xl">
          <span className="text-[11px] text-white/50 uppercase font-bold block">
            {roleMode === 'empresa' ? 'Faturamento Bruto' : 'Volume Bruto Vendido'}
          </span>
          <span className="text-xl font-black text-white font-['Syne'] mt-1 block">
            R$ {(Number(totalVolumeFiltered) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div className="bg-[#080d1a] border border-[#D9F22A]/30 p-4 rounded-xl bg-[#D9F22A]/5">
          <span className="text-[11px] text-[#D9F22A] uppercase font-bold block">
            {roleMode === 'empresa' ? 'Receita Líquida da Empresa' : 'Comissões Acumuladas'}
          </span>
          <span className="text-xl font-black text-[#D9F22A] font-['Syne'] mt-1 block">
            R$ {(Number(roleMode === 'empresa' ? totalCompanyNet : totalCommissionsFiltered) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#080d1a] border border-white/10 p-4 rounded-2xl">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            placeholder="Buscar por ID, cliente, empresa ou plataforma..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#050811] border border-white/15 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#D9F22A]"
          />
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#050811] border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#D9F22A] cursor-pointer"
          >
            <option value="all">Todos os Status</option>
            <option value="Aprovado">Aprovado</option>
            <option value="Pendente">Pendente</option>
            <option value="Cancelado">Cancelado</option>
          </select>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-[#080d1a] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-white/40 bg-[#050811] border-b border-white/10 uppercase tracking-wider">
                <th className="py-3.5 px-4 font-bold">ID / Data</th>
                <th className="py-3.5 px-4 font-bold">Produto</th>
                <th className="py-3.5 px-4 font-bold">Cliente / Empresa</th>
                <th className="py-3.5 px-4 font-bold">Meio</th>
                <th className="py-3.5 px-4 font-bold">Valor Pago</th>
                <th className="py-3.5 px-4 font-bold text-[#D9F22A]">{roleMode === 'empresa' ? 'Líquido da Empresa' : 'Sua Comissão'}</th>
                <th className="py-3.5 px-4 font-bold text-center">Status</th>
                <th className="py-3.5 px-4 font-bold text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-white/50 text-xs">
                    Nenhuma venda encontrada com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-4 px-4">
                      <span className="font-mono font-bold text-white block">{tx.id}</span>
                      <span className="text-[10px] text-white/50">{tx.date} às {tx.time}</span>
                    </td>

                    <td className="py-4 px-4 font-bold text-white max-w-[200px]">
                      <span className="truncate block">{tx.platformName}</span>
                      {tx.utmSource && (
                        <span className="text-[10px] text-white/40 font-mono">utm: {tx.utmSource}</span>
                      )}
                    </td>

                    <td className="py-4 px-4">
                      <span className="font-bold text-white block">{tx.buyerName}</span>
                      <span className="text-[10px] text-white/60">{tx.buyerCompany}</span>
                    </td>

                    <td className="py-4 px-4">
                      <span className="px-2 py-1 rounded bg-[#050811] border border-white/10 text-white font-bold text-[10px]">
                        {tx.method}
                      </span>
                    </td>

                    <td className="py-4 px-4 font-bold text-white">
                      R$ {(Number(tx.amount) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>

                    <td className="py-4 px-4 font-black text-[#D9F22A]">
                      {roleMode === 'empresa'
                        ? `R$ ${(
                            Number.isFinite(Number((tx as any).netCompanyAmount))
                              ? Number((tx as any).netCompanyAmount)
                              : Math.max(
                                  0,
                                  (Number(tx.amount) || 0) -
                                    (Number(tx.commissionEarned ?? (tx as any)?.commissionValue) || 0) -
                                    Number((tx as any).checkoutFee || (tx as any).financialBreakdown?.platformFee || 0)
                                )
                          ).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                        : `+ R$ ${(Number(tx.commissionEarned ?? (tx as any)?.commissionValue) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    </td>

                    <td className="py-4 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          statusKind(tx.status) === 'Aprovado'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : statusKind(tx.status) === 'Pendente'
                            ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30'
                            : 'bg-red-500/10 text-red-400 border border-red-500/30'
                        }`}
                      >
                        {statusKind(tx.status) === 'Aprovado' && <CheckCircle2 className="w-3 h-3" />}
                        {statusKind(tx.status) === 'Pendente' && <Clock className="w-3 h-3" />}
                        {statusKind(tx.status) === 'Cancelado' && <XCircle className="w-3 h-3" />}
                        {statusKind(tx.status)}
                      </span>
                    </td>

                    <td className="py-4 px-4 text-right">
                      <button
                        onClick={() => setSelectedTxDetail(tx)}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-[#D9F22A] hover:text-[#060A15] text-white/70 transition-colors cursor-pointer"
                        title="Ver Comprovante"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedTxDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-[#080d1a] border border-white/15 rounded-2xl p-6 shadow-2xl">
            <button
              onClick={() => setSelectedTxDetail(null)}
              className="absolute top-4 right-4 text-white/50 hover:text-white cursor-pointer"
            >
              ✕
            </button>
            <div className="flex items-center gap-2 text-[11px] font-bold text-[#D9F22A] uppercase mb-1">
              <CheckCircle2 className="w-4 h-4" /> Comprovante de Contrato
            </div>
            <h3 className="text-xl font-bold text-white font-['Syne'] mb-4">
              {selectedTxDetail.id}
            </h3>

            <div className="space-y-3 text-xs bg-[#050811] p-4 rounded-xl border border-white/10 mb-5">
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-white/50">Produto:</span>
                <span className="font-bold text-white">{selectedTxDetail.platformName}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-white/50">Comprador:</span>
                <span className="font-bold text-white">{selectedTxDetail.buyerName}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-white/50">Empresa:</span>
                <span className="font-bold text-white">{selectedTxDetail.buyerCompany}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-white/50">Valor Total:</span>
                <span className="font-bold text-white">R$ {(Number(selectedTxDetail.amount) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-white/50">
                  {roleMode === 'empresa' ? 'Líquido da empresa:' : `Sua comissão (${statusKind(selectedTxDetail.status)}):`}
                </span>
                <span className="font-black text-[#D9F22A]">
                  R$ {(roleMode === 'empresa'
                    ? (
                        Number.isFinite(Number((selectedTxDetail as any).netCompanyAmount))
                          ? Number((selectedTxDetail as any).netCompanyAmount)
                          : Math.max(
                              0,
                              (Number(selectedTxDetail.amount) || 0) -
                                (Number(selectedTxDetail.commissionEarned ?? (selectedTxDetail as any)?.commissionValue) || 0) -
                                Number((selectedTxDetail as any).checkoutFee || (selectedTxDetail as any).financialBreakdown?.platformFee || 0)
                            )
                      )
                    : (Number(selectedTxDetail.commissionEarned ?? (selectedTxDetail as any)?.commissionValue) || 0)
                  ).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Pagamento:</span>
                <span className="font-bold text-white">{selectedTxDetail.method}</span>
              </div>
            </div>

            <button
              onClick={() => setSelectedTxDetail(null)}
              className="w-full bg-[#D9F22A] text-[#060A15] font-bold py-2.5 rounded-xl text-xs uppercase cursor-pointer"
            >
              Fechar Detalhes
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
