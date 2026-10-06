import React, { useMemo, useState } from 'react';
import { SaleTransaction } from '../../types/platform';
import {
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  Search,
  XCircle,
} from 'lucide-react';

interface VendasViewProps {
  roleMode?: string;
  transactions: SaleTransaction[];
}

const money = (value: number) =>
  Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const maskName = (value: string) => {
  const parts = String(value || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'Cliente';
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[1].slice(0, 1).toUpperCase()}.`;
};

const maskEmail = (value: string) => {
  const email = String(value || '').trim();
  const [local, domain] = email.split('@');
  if (!local || !domain) return 'Contato protegido';
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${'*'.repeat(Math.max(3, Math.min(6, local.length - visible.length)))}@${domain}`;
};

const csvCell = (value: unknown) => {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
};

export const VendasView: React.FC<VendasViewProps> = ({
  roleMode = 'afiliado',
  transactions,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedTxDetail, setSelectedTxDetail] = useState<SaleTransaction | null>(null);
  const isAffiliate = roleMode === 'afiliado';

  const safeTransactions = Array.isArray(transactions) ? transactions : [];

  const statusKind = (value: unknown): 'Aprovado' | 'Pendente' | 'Cancelado' => {
    const status = String(value || '').trim().toLowerCase();
    if (['aprovado', 'approved', 'liberado', 'received', 'confirmed'].includes(status)) return 'Aprovado';
    if (['pendente', 'pending', 'processing', 'em análise', 'em analise'].includes(status)) return 'Pendente';
    return 'Cancelado';
  };

  const filteredTransactions = useMemo(() => safeTransactions.filter((t) => {
    if (!t) return false;
    if (statusFilter !== 'all' && statusKind(t.status) !== statusFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        (t.id || '').toLowerCase().includes(q) ||
        (t.platformName || '').toLowerCase().includes(q) ||
        (t.buyerName || '').toLowerCase().includes(q) ||
        (t.buyerCompany || '').toLowerCase().includes(q) ||
        (t.buyerEmail || '').toLowerCase().includes(q) ||
        (t.utmSource || '').toLowerCase().includes(q) ||
        (t.utmCampaign || '').toLowerCase().includes(q)
      );
    }
    return true;
  }), [safeTransactions, searchTerm, statusFilter]);

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

  const exportCsv = () => {
    if (!filteredTransactions.length) return;
    const headers = isAffiliate
      ? ['ID', 'Data', 'Produto', 'Cliente', 'Valor pago', 'Comissão', 'Status', 'Origem', 'Meio', 'Campanha', 'Tipo']
      : ['ID', 'Data', 'Produto', 'Cliente', 'E-mail', 'Empresa', 'Valor pago', 'Líquido da empresa', 'Status', 'Origem', 'Meio', 'Campanha', 'Tipo'];

    const rows = filteredTransactions.map((tx) => {
      const commission = Number(tx.commissionEarned ?? (tx as any)?.commissionValue) || 0;
      const companyNet = Number.isFinite(Number((tx as any).netCompanyAmount))
        ? Number((tx as any).netCompanyAmount)
        : Math.max(
            0,
            (Number(tx.amount) || 0) -
              commission -
              Number((tx as any).checkoutFee || (tx as any).financialBreakdown?.platformFee || 0),
          );
      const common = [
        tx.id,
        tx.createdAt || tx.date || '',
        tx.platformName || '',
      ];
      return isAffiliate
        ? [
            ...common,
            maskName(tx.buyerName || ''),
            Number(tx.amount || 0).toFixed(2),
            commission.toFixed(2),
            statusKind(tx.status),
            tx.utmSource || '',
            tx.utmMedium || '',
            tx.utmCampaign || '',
            tx.saleKind || (tx.recurring ? 'recorrente' : 'venda'),
          ]
        : [
            ...common,
            tx.buyerName || '',
            tx.buyerEmail || '',
            tx.buyerCompany || '',
            Number(tx.amount || 0).toFixed(2),
            companyNet.toFixed(2),
            statusKind(tx.status),
            tx.utmSource || '',
            tx.utmMedium || '',
            tx.utmCampaign || '',
            tx.saleKind || (tx.recurring ? 'recorrente' : 'venda'),
          ];
    });

    const csv = '\uFEFF' + [headers, ...rows].map((row) => row.map(csvCell).join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = href;
    anchor.download = `leadspay-${isAffiliate ? 'minhas-vendas' : 'vendas-empresa'}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(href);
  };

  return (
    <div className="flex flex-col gap-6" id="leadspay-vendas-view">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-['Syne']">
            {roleMode === 'empresa' ? 'Vendas & Pedidos da Empresa' : 'Minhas Vendas & Comissões'}
          </h1>
          <p className="mt-1 text-xs text-white/60">
            {roleMode === 'empresa'
              ? 'Histórico real de assinaturas e compras dos produtos desta empresa, incluindo vendas diretas e vendas da rede de afiliados.'
              : 'Histórico das vendas atribuídas aos seus links. Dados pessoais do comprador são reduzidos no painel do afiliado.'}
          </p>
        </div>
        <button
          type="button"
          onClick={exportCsv}
          disabled={!filteredTransactions.length}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-xs font-bold text-white/70 transition hover:bg-white/10 disabled:opacity-40"
        >
          <Download className="h-4 w-4 text-[#D9F22A]" />
          Exportar CSV
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-[#080d1a] p-4">
          <span className="block text-[11px] font-bold uppercase text-white/50">Transações listadas</span>
          <span className="mt-1 block text-xl font-black text-white font-['Syne']">{filteredTransactions.length} vendas</span>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#080d1a] p-4">
          <span className="block text-[11px] font-bold uppercase text-white/50">
            {roleMode === 'empresa' ? 'Faturamento bruto' : 'Volume bruto vendido'}
          </span>
          <span className="mt-1 block text-xl font-black text-white font-['Syne']">R$ {money(totalVolumeFiltered)}</span>
        </div>
        <div className="rounded-xl border border-[#D9F22A]/30 bg-[#D9F22A]/5 p-4">
          <span className="block text-[11px] font-bold uppercase text-[#D9F22A]">
            {roleMode === 'empresa' ? 'Receita líquida da empresa' : 'Comissões acumuladas'}
          </span>
          <span className="mt-1 block text-xl font-black text-[#D9F22A] font-['Syne']">
            R$ {money(roleMode === 'empresa' ? totalCompanyNet : totalCommissionsFiltered)}
          </span>
        </div>
      </div>

      <div className="flex flex-col justify-between gap-3 rounded-2xl border border-white/10 bg-[#080d1a] p-4 md:flex-row md:items-center">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            placeholder={isAffiliate ? 'Buscar por ID, produto ou campanha...' : 'Buscar por ID, cliente, empresa ou produto...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-white/15 bg-[#050811] py-2.5 pl-10 pr-4 text-xs text-white placeholder-white/40 focus:border-[#D9F22A] focus:outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="cursor-pointer rounded-xl border border-white/15 bg-[#050811] px-4 py-2.5 text-xs text-white focus:border-[#D9F22A] focus:outline-none"
        >
          <option value="all">Todos os status</option>
          <option value="Aprovado">Aprovado</option>
          <option value="Pendente">Pendente</option>
          <option value="Cancelado">Cancelado</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#080d1a] shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[940px] text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 bg-[#050811] uppercase tracking-wider text-white/40">
                <th className="px-4 py-3.5 font-bold">ID / Data</th>
                <th className="px-4 py-3.5 font-bold">Produto</th>
                <th className="px-4 py-3.5 font-bold">{isAffiliate ? 'Cliente' : 'Cliente / Empresa'}</th>
                <th className="px-4 py-3.5 font-bold">Meio</th>
                <th className="px-4 py-3.5 font-bold">Valor pago</th>
                <th className="px-4 py-3.5 font-bold text-[#D9F22A]">{roleMode === 'empresa' ? 'Líquido da empresa' : 'Sua comissão'}</th>
                <th className="px-4 py-3.5 text-center font-bold">Status</th>
                <th className="px-4 py-3.5 text-right font-bold">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-xs text-white/50">
                    Nenhuma venda encontrada com os filtros selecionados.
                  </td>
                </tr>
              ) : filteredTransactions.map((tx) => {
                const commission = Number(tx.commissionEarned ?? (tx as any)?.commissionValue) || 0;
                const companyNet = Number.isFinite(Number((tx as any).netCompanyAmount))
                  ? Number((tx as any).netCompanyAmount)
                  : Math.max(
                      0,
                      (Number(tx.amount) || 0) -
                        commission -
                        Number((tx as any).checkoutFee || (tx as any).financialBreakdown?.platformFee || 0),
                    );

                return (
                  <tr key={tx.id} className="transition-colors hover:bg-white/[0.02]">
                    <td className="px-4 py-4">
                      <span className="block font-mono font-bold text-white">{tx.id}</span>
                      <span className="text-[10px] text-white/50">{tx.date} {tx.time ? `às ${tx.time}` : ''}</span>
                    </td>
                    <td className="max-w-[220px] px-4 py-4 font-bold text-white">
                      <span className="block truncate">{tx.platformName}</span>
                      <span className="block text-[10px] font-normal text-white/35">
                        {tx.saleKind === 'subscription_renewal' ? 'Renovação recorrente' : tx.recurring ? 'Assinatura' : 'Venda'}
                      </span>
                      {tx.utmSource && <span className="text-[10px] font-mono text-white/40">utm: {tx.utmSource}</span>}
                    </td>
                    <td className="px-4 py-4">
                      <span className="block font-bold text-white">{isAffiliate ? maskName(tx.buyerName || '') : tx.buyerName}</span>
                      <span className="text-[10px] text-white/50">
                        {isAffiliate ? maskEmail(tx.buyerEmail || '') : tx.buyerCompany}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="rounded border border-white/10 bg-[#050811] px-2 py-1 text-[10px] font-bold text-white">{tx.method}</span>
                    </td>
                    <td className="px-4 py-4 font-bold text-white">R$ {money(Number(tx.amount) || 0)}</td>
                    <td className="px-4 py-4 font-black text-[#D9F22A]">
                      {roleMode === 'empresa' ? `R$ ${money(companyNet)}` : `+ R$ ${money(commission)}`}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold ${
                        statusKind(tx.status) === 'Aprovado'
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                          : statusKind(tx.status) === 'Pendente'
                            ? 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400'
                            : 'border-red-500/30 bg-red-500/10 text-red-400'
                      }`}>
                        {statusKind(tx.status) === 'Aprovado' && <CheckCircle2 className="h-3 w-3" />}
                        {statusKind(tx.status) === 'Pendente' && <Clock className="h-3 w-3" />}
                        {statusKind(tx.status) === 'Cancelado' && <XCircle className="h-3 w-3" />}
                        {statusKind(tx.status)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <button
                        onClick={() => setSelectedTxDetail(tx)}
                        className="cursor-pointer rounded-lg bg-white/5 p-1.5 text-white/70 transition-colors hover:bg-[#D9F22A] hover:text-[#060A15]"
                        title="Ver detalhes"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selectedTxDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="relative w-full max-w-md rounded-2xl border border-white/15 bg-[#080d1a] p-6 shadow-2xl">
            <button onClick={() => setSelectedTxDetail(null)} className="absolute right-4 top-4 cursor-pointer text-white/50 hover:text-white">✕</button>
            <div className="mb-1 flex items-center gap-2 text-[11px] font-bold uppercase text-[#D9F22A]">
              <CheckCircle2 className="h-4 w-4" />
              Detalhes da venda
            </div>
            <h3 className="mb-4 text-xl font-bold text-white font-['Syne']">{selectedTxDetail.id}</h3>

            <div className="mb-5 space-y-3 rounded-xl border border-white/10 bg-[#050811] p-4 text-xs">
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-white/50">Produto:</span>
                <span className="font-bold text-white">{selectedTxDetail.platformName}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-white/50">Comprador:</span>
                <span className="font-bold text-white">{isAffiliate ? maskName(selectedTxDetail.buyerName || '') : selectedTxDetail.buyerName}</span>
              </div>
              {isAffiliate && (
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-white/50">Contato:</span>
                  <span className="font-bold text-white">{maskEmail(selectedTxDetail.buyerEmail || '')}</span>
                </div>
              )}
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-white/50">Valor total:</span>
                <span className="font-bold text-white">R$ {money(Number(selectedTxDetail.amount) || 0)}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-white/50">{roleMode === 'empresa' ? 'Líquido da empresa:' : 'Sua comissão:'}</span>
                <span className="font-black text-[#D9F22A]">
                  R$ {money(
                    roleMode === 'empresa'
                      ? (
                          Number.isFinite(Number((selectedTxDetail as any).netCompanyAmount))
                            ? Number((selectedTxDetail as any).netCompanyAmount)
                            : Math.max(
                                0,
                                (Number(selectedTxDetail.amount) || 0) -
                                  (Number(selectedTxDetail.commissionEarned ?? (selectedTxDetail as any)?.commissionValue) || 0) -
                                  Number((selectedTxDetail as any).checkoutFee || (selectedTxDetail as any).financialBreakdown?.platformFee || 0),
                              )
                        )
                      : Number(selectedTxDetail.commissionEarned ?? (selectedTxDetail as any)?.commissionValue) || 0,
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Pagamento:</span>
                <span className="font-bold text-white">{selectedTxDetail.method}</span>
              </div>
            </div>

            <button onClick={() => setSelectedTxDetail(null)} className="w-full cursor-pointer rounded-xl bg-[#D9F22A] py-2.5 text-xs font-bold uppercase text-[#060A15]">
              Fechar detalhes
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
