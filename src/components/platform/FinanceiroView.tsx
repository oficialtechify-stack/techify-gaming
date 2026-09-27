import React, { useState } from 'react';
import { StripeConnectPanel } from './StripeConnectPanel';
import { UserSellerProfile, WithdrawalRequest, SaleTransaction, PaymentMethodStat, UserRoleMode, CompanyStartup } from '../../types/platform';
import { triggerReleaseBalancesCron, requestWithdrawalViaBackend } from '../../services/firestoreService';
import { 
  DollarSign, 
  ArrowUpRight, 
  CheckCircle2, 
  Clock, 
  Wallet, 
  ShieldCheck, 
  Sparkles, 
  Building2,
  TrendingUp,
  CreditCard,
  Layers,
  ArrowDownRight,
  Receipt,
  RefreshCw,
  AlertCircle,
  Send,
  HelpCircle
} from 'lucide-react';

interface FinanceiroViewProps {
  roleMode?: UserRoleMode;
  userProfile: UserSellerProfile;
  company?: CompanyStartup | null;
  withdrawals: WithdrawalRequest[];
  transactions?: SaleTransaction[];
  paymentStats?: PaymentMethodStat[];
  onOpenWithdraw?: () => void;
}

export const FinanceiroView: React.FC<FinanceiroViewProps> = ({
  roleMode = 'afiliado',
  userProfile,
  company = null,
  withdrawals = [],
  transactions = [],
  paymentStats = [],
  onOpenWithdraw
}) => {
  // Aba ativa na visão de empresa: 'carteira_saques' ou 'faturamento'
  const [activeCompanyTab, setActiveCompanyTab] = useState<'carteira_saques' | 'faturamento'>('carteira_saques');

  // Estados do Cron de Liberação D+9
  const [isSyncingCron, setIsSyncingCron] = useState<boolean>(false);
  const [cronFeedback, setCronFeedback] = useState<string | null>(null);

  // Estados do Formulário de Saque PIX Integrado
  const availableBalance = Number((userProfile?.availableBalance ?? 0).toFixed(2));
  const pendingBalance = Number((userProfile?.pendingBalance ?? 0).toFixed(2));

  const [withdrawAmount, setWithdrawAmount] = useState<string>(availableBalance >= 50 ? '50' : '');
  const [pixKeyType, setPixKeyType] = useState<string>(userProfile?.pixKeyType || 'CPF');
  const [pixKey, setPixKey] = useState<string>(userProfile?.pixKey || userProfile?.cpf || userProfile?.email || '');
  const [isSubmittingWithdraw, setIsSubmittingWithdraw] = useState<boolean>(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [withdrawSuccess, setWithdrawSuccess] = useState<string | null>(null);
  const [lastCompletedWithdrawal, setLastCompletedWithdrawal] = useState<WithdrawalRequest | null>(null);

  // Calculations for Company Mode (Fallback dinâmico a partir das transações)
  const isApprovedStatus = (s: string) => {
    const lower = (s || '').toLowerCase();
    return lower === 'aprovado' || lower === 'approved';
  };
  const approvedSales = transactions.filter(t => isApprovedStatus(t.status));
  const fallbackCompanyGross = approvedSales.reduce((acc, t) => acc + (t.amount || 0), 0);
  const fallbackCompanyCommissions = approvedSales.reduce((acc, t) => acc + (t.commissionEarned || t.financialBreakdown?.affiliateCommission || 0), 0);
  const fallbackCheckoutFees = approvedSales.reduce((acc, t) => acc + (t.checkoutFee || t.financialBreakdown?.platformFee || 0.99), 0);
  const fallbackCompanyNet = Math.max(0, fallbackCompanyGross - fallbackCompanyCommissions - fallbackCheckoutFees);

  // Valores acumulados do Firestore (Prioriza campos do documento companies/{companyId} ou user_profiles/{sellerId})
  const grossRevenue = company?.grossRevenue !== undefined ? company.grossRevenue : (userProfile?.grossRevenue !== undefined ? userProfile.grossRevenue : fallbackCompanyGross);
  const totalSalesCount = company?.totalSalesCount !== undefined ? company.totalSalesCount : (userProfile?.totalSalesCount !== undefined ? userProfile.totalSalesCount : approvedSales.length);
  const totalCheckoutFees = company?.totalCheckoutFees !== undefined ? company.totalCheckoutFees : (userProfile?.totalCheckoutFees !== undefined ? userProfile.totalCheckoutFees : fallbackCheckoutFees);
  const totalAffiliateCommissions = company?.totalAffiliateCommissions !== undefined ? company.totalAffiliateCommissions : (userProfile?.totalAffiliateCommissions !== undefined ? userProfile.totalAffiliateCommissions : fallbackCompanyCommissions);
  const netRevenue = company?.netRevenue !== undefined ? company.netRevenue : (userProfile?.netRevenue !== undefined ? userProfile.netRevenue : fallbackCompanyNet);

  // Executa o Cron de 9 Dias
  const handleSyncCron = async () => {
    setIsSyncingCron(true);
    setCronFeedback(null);
    try {
      const res = await triggerReleaseBalancesCron();
      setCronFeedback(res.message || 'Verificação concluída!');
      setTimeout(() => setCronFeedback(null), 5000);
    } catch (err: any) {
      setCronFeedback('Erro ao acionar rotina cron de 9 dias no servidor');
      setTimeout(() => setCronFeedback(null), 5000);
    } finally {
      setIsSyncingCron(false);
    }
  };

  // Submissão do Formulário de Saque PIX
  const parsedWithdrawAmount = parseFloat(withdrawAmount) || 0;
  const fixedFee = 2.50;
  const netWithdrawalEstimate = Math.max(0, parsedWithdrawAmount - fixedFee);

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawError(null);
    setWithdrawSuccess(null);
    setLastCompletedWithdrawal(null);

    // Validação 1: Valor Mínimo R$ 50,00
    if (parsedWithdrawAmount < 50) {
      setWithdrawError('O valor mínimo para solicitação de saque via Pix é de R$ 50,00.');
      return;
    }

    // Validação 2: Saldo Disponível
    if (parsedWithdrawAmount > availableBalance) {
      setWithdrawError(`Saldo disponível insuficiente. Seu saldo para saque é de R$ ${availableBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`);
      return;
    }

    // Validação 3: Chave PIX
    if (!pixKey.trim()) {
      setWithdrawError('Chave PIX válida é obrigatória para processar o saque.');
      return;
    }

    setIsSubmittingWithdraw(true);

    try {
      const targetUserId = userProfile?.userId || userProfile?.id || (company ? company.id : 'usr_leadspay_main');
      const targetUserName = userProfile?.name || company?.name || 'Parceiro LeadsPay';

      const response = await requestWithdrawalViaBackend(
        parsedWithdrawAmount,
        pixKey.trim(),
        pixKeyType,
        targetUserId,
        targetUserName
      );

      if (response.success && response.withdrawal) {
        setWithdrawSuccess(`Saque PIX de R$ ${response.withdrawal.netAmount?.toFixed(2) || netWithdrawalEstimate.toFixed(2)} transferido com sucesso!`);
        setLastCompletedWithdrawal(response.withdrawal);
        setWithdrawAmount('');
      } else {
        setWithdrawError(response.message || 'Erro inesperado ao processar saque.');
      }
    } catch (err: any) {
      console.error('Erro na solicitação de saque:', err);
      setWithdrawError(err.message || 'Erro ao processar solicitação de saque no servidor.');
    } finally {
      setIsSubmittingWithdraw(false);
    }
  };

  // Seletor de Atalho de Valores Rápidos
  const handleQuickAmount = (value: number) => {
    if (value <= availableBalance) {
      setWithdrawAmount(value.toString());
      setWithdrawError(null);
    }
  };

  const handleMaxAmount = () => {
    if (availableBalance >= 50) {
      setWithdrawAmount(availableBalance.toFixed(2));
      setWithdrawError(null);
    }
  };

  return (
    <div className="flex flex-col gap-6" id="leadspay-financeiro-view">
      {/* Header Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#D9F22A] mb-1">
            <Wallet className="w-3.5 h-3.5" />
            {roleMode === 'empresa' ? 'Gestão Financeira & Carteira Empresa' : 'Carteira & Comissões de Afiliado'}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-['Syne']">
            {roleMode === 'empresa' && activeCompanyTab === 'faturamento' 
              ? 'Faturamento & Repasses a Afiliados' 
              : 'Carteira & Recebimentos'}
          </h1>
          <p className="text-xs text-white/60 mt-1">
            {roleMode === 'empresa'
              ? 'Consulte a atividade financeira e conecte a conta Stripe da empresa para receber os repasses.'
              : 'Acompanhe as comissões registradas e conecte sua conta Stripe para receber os repasses da plataforma.'}
          </p>
        </div>

        <div className="flex items-center gap-3" aria-label="Recebimentos Stripe" />
      </div>

      {/* Feedback do Cron */}
      {cronFeedback && (
        <div className="p-3.5 bg-[#D9F22A]/10 border border-[#D9F22A]/30 rounded-xl text-xs text-[#D9F22A] font-semibold flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{cronFeedback}</span>
        </div>
      )}

      {/* Toggle de Abas para Empresas */}
      {roleMode === 'empresa' && (
        <div className="flex items-center gap-2 border-b border-white/10 pb-2">
          <button
            onClick={() => setActiveCompanyTab('carteira_saques')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeCompanyTab === 'carteira_saques'
                ? 'bg-[#D9F22A] text-[#060A15] shadow-[0_0_15px_rgba(217,242,42,0.25)]'
                : 'text-white/70 hover:text-white hover:bg-white/5'
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span>Carteira & Saques PIX</span>
          </button>
          <button
            onClick={() => setActiveCompanyTab('faturamento')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeCompanyTab === 'faturamento'
                ? 'bg-[#D9F22A] text-[#060A15] shadow-[0_0_15px_rgba(217,242,42,0.25)]'
                : 'text-white/70 hover:text-white hover:bg-white/5'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>Faturamento & Taxas LeadsPay</span>
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SEÇÃO 1: CARTEIRA & SAQUES PIX (Cards D+9, Formulário e Histórico)       */}
      {/* ========================================================================= */}
      {(roleMode === 'afiliado' || activeCompanyTab === 'carteira_saques') && (
        <div className="space-y-6">
          {/* 1. Cards de Saldos (Saldo Pendente Garantia 9 dias & Saldo Disponível) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Saldo Pendente (Garantia 9 dias) */}
            <div className="bg-[#080d1a] border-l-4 border-l-amber-500 border-y border-r border-white/10 rounded-2xl p-6 shadow-xl relative overflow-hidden">
              <div className="flex items-center justify-between text-white/60 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Saldo Pendente (Garantia 9 dias)</span>
                <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-amber-400" />
                </div>
              </div>
              <div className="text-3xl font-black text-amber-400 font-['Syne'] tracking-tight">
                R$ {pendingBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[11px] text-white/50 block mt-2">
                Retido temporariamente contra contestações e estornos (D+9)
              </span>
            </div>

            {/* Saldo Disponível para Saque */}
            <div className="bg-[#080d1a] border-l-4 border-l-[#D9F22A] border-y border-r border-white/10 rounded-2xl p-6 shadow-xl relative overflow-hidden">
              <div className="flex items-center justify-between text-white/60 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Saldo Disponível para Saque</span>
                <div className="w-8 h-8 rounded-full bg-[#D9F22A]/10 flex items-center justify-center">
                  <DollarSign className="w-4 h-4 text-[#D9F22A]" />
                </div>
              </div>
              <div className="text-3xl font-black text-[#D9F22A] font-['Syne'] tracking-tight">
                R$ {availableBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[11px] text-white/50 block mt-2">
                Liberado e apto para transferência imediata via PIX
              </span>
            </div>

            {/* Total Histórico */}
            <div className="bg-[#080d1a] border-l-4 border-l-blue-500 border-y border-r border-white/10 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center justify-between text-white/60 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">
                  {roleMode === 'empresa' ? 'Receita Líquida Acumulada' : 'Total de Comissões Ganhas'}
                </span>
                <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <Wallet className="w-4 h-4 text-blue-400" />
                </div>
              </div>
              <div className="text-3xl font-black text-white font-['Syne'] tracking-tight">
                R$ {(roleMode === 'empresa' ? netRevenue : (userProfile?.totalEarned ?? 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[11px] text-white/50 block mt-2">
                Volume financeiro total acumulado na LeadsPay
              </span>
            </div>
          </div>

          {/* Banner Informativo da Regra D+9 */}
          <div className="p-4 rounded-2xl bg-[#080d1a] border border-white/10 flex items-start gap-3">
            <Clock className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs">
              <h4 className="font-bold text-white mb-0.5">Como funciona a Regra de Liberação em D+9?</h4>
              <p className="text-white/60 leading-relaxed">
                Cada venda aprovada tem seus valores (líquido da empresa e comissão do afiliado) alocados inicialmente em <strong>Saldo Pendente</strong>. Após decorridos exatamente 9 dias da data de pagamento, o <strong>Cron de Liberação do Servidor</strong> migra o valor automaticamente para o <strong>Saldo Disponível</strong>, possibilitando transferências bancárias instantâneas via Pix.
              </p>
            </div>
          </div>

          <StripeConnectPanel roleMode={roleMode} userProfile={userProfile} />

          {/* 3. Tabela de Histórico legado de solicitações (Asaas) */}
          <div className="bg-[#080d1a] border border-white/10 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
              <div>
                <h3 className="text-base font-bold text-white font-['Syne']">
                  Histórico legado de solicitações (Asaas)
                </h3>
                <p className="text-xs text-white/50">
                  Todas as transferências bancárias solicitadas através da plataforma LeadsPay.
                </p>
              </div>
              <span className="text-xs text-white/40 bg-white/5 px-2.5 py-1 rounded-lg">
                {withdrawals.length} repasse(s)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-white/40 bg-[#050811] border-b border-white/10 uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4 font-bold">ID do Saque</th>
                    <th className="py-3 px-4 font-bold">Data / Hora</th>
                    <th className="py-3 px-4 font-bold">Chave de Destino</th>
                    <th className="py-3 px-4 font-bold">Valor Solicitado</th>
                    <th className="py-3 px-4 font-bold text-amber-400">Taxa PIX</th>
                    <th className="py-3 px-4 font-bold text-emerald-400">Valor Líquido</th>
                    <th className="py-3 px-4 font-bold text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {withdrawals.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-white/40">
                        <Wallet className="w-8 h-8 text-white/20 mx-auto mb-2" />
                        <span>Nenhum saque realizado até o momento.</span>
                      </td>
                    </tr>
                  ) : (
                    withdrawals.map((w) => {
                      const fee = w.fee !== undefined ? w.fee : (w.feeAmount !== undefined ? w.feeAmount : 2.50);
                      const requestedAmt = w.requestedAmount !== undefined ? w.requestedAmount : (w.amount || 0);
                      const net = w.netAmount !== undefined ? w.netAmount : Math.max(0, requestedAmt - fee);
                      const isDone = w.status === 'COMPLETED' || w.status === 'concluido' || w.status === 'Concluído';

                      return (
                        <tr key={w.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-white">
                            {w.id}
                            {w.asaasTransferId && (
                              <span className="block text-[9px] text-white/40 font-normal truncate max-w-[130px]" title={w.asaasTransferId}>
                                Asaas: {w.asaasTransferId}
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-white/70">
                            {w.requestedAt || (w.createdAt ? new Date(w.createdAt).toLocaleString('pt-BR') : 'Recentemente')}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-white/80">
                            {w.pixKey} <span className="text-[10px] text-white/40">({w.pixKeyType || 'CPF'})</span>
                          </td>
                          <td className="py-3.5 px-4 font-bold text-white">
                            R$ {requestedAmt.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-amber-400">
                            - R$ {fee.toFixed(2).replace('.', ',')}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-emerald-400">
                            R$ {net.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                              isDone 
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            }`}>
                              <CheckCircle2 className="w-3 h-3" />
                              {isDone ? 'Concluído' : 'Processando'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SEÇÃO 2: FATURAMENTO & TAXAS CORPORATIVAS (Visão Exclusiva para Empresas) */}
      {/* ========================================================================= */}
      {roleMode === 'empresa' && activeCompanyTab === 'faturamento' && (
        <div className="space-y-6">
          {/* Company Financial KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Faturamento Bruto */}
            <div className="bg-[#080d1a] border border-white/10 rounded-2xl p-5 shadow-xl">
              <div className="flex items-center justify-between text-white/60 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Faturamento Bruto</span>
                <Receipt className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-2xl font-black text-white font-['Syne']">
                R$ {grossRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[11px] text-white/50 block mt-1">
                {totalSalesCount} venda(s) aprovada(s)
              </span>
            </div>

            {/* Taxas de Checkout Plataforma (R$ 0,99 por venda) */}
            <div className="bg-[#080d1a] border border-white/10 rounded-2xl p-5 shadow-xl">
              <div className="flex items-center justify-between text-white/60 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Taxas Checkout LeadsPay</span>
                <DollarSign className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="text-2xl font-black text-indigo-400 font-['Syne']">
                R$ {totalCheckoutFees.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[11px] text-white/50 block mt-1">
                R$ 0,99 por checkout aprovado
              </span>
            </div>

            {/* Comissões Pagas aos Afiliados */}
            <div className="bg-[#080d1a] border border-white/10 rounded-2xl p-5 shadow-xl">
              <div className="flex items-center justify-between text-white/60 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Comissões a Afiliados</span>
                <ArrowDownRight className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-black text-amber-400 font-['Syne']">
                R$ {totalAffiliateCommissions.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[11px] text-white/50 block mt-1">
                Repasse aos afiliados vendedores
              </span>
            </div>

            {/* Receita Líquida da Empresa */}
            <div className="bg-[#080d1a] border-l-4 border-l-[#D9F22A] border-y border-r border-white/10 rounded-2xl p-5 shadow-xl">
              <div className="flex items-center justify-between text-white/60 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Receita Líquida da Empresa</span>
                <DollarSign className="w-4 h-4 text-[#D9F22A]" />
              </div>
              <div className="text-2xl font-black text-[#D9F22A] font-['Syne']">
                R$ {netRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[11px] text-white/50 block mt-1">
                Líquido retido após comissões e taxas
              </span>
            </div>
          </div>

          {/* Métodos de Liquidação & Divisão */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-6 bg-[#080d1a] border border-white/10 rounded-2xl p-6 shadow-xl">
              <h3 className="text-base font-bold text-white font-['Syne'] mb-3 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-[#D9F22A]" />
                Distribuição por Meio de Pagamento
              </h3>
              <p className="text-xs text-white/60 mb-4">
                Volume recebido através dos canais de pagamento integrados à plataforma.
              </p>

              <div className="space-y-3">
                {paymentStats.map((stat, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-[#050811] border border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-[#D9F22A] font-bold text-xs">
                        {idx + 1}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-white block">{stat.method}</span>
                        <span className="text-[10px] text-white/50">{stat.count} transações ({stat.conversionRate} conversão)</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-[#D9F22A] block">
                        R$ {stat.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-[10px] text-white/40">{stat.percentage || 0}% do volume</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-6 bg-[#080d1a] border border-white/10 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <ShieldCheck className="w-5 h-5 text-[#D9F22A]" />
                  <h3 className="text-base font-bold text-white font-['Syne']">
                    Split Automático de Pagamentos & Taxas da Plataforma
                  </h3>
                </div>
                <p className="text-xs text-white/70 leading-relaxed mb-4">
                  Quando um cliente adquire uma solução, o LeadsPay retém R$ 0,99 da taxa de checkout, credita a comissão acordada para o afiliado, e o montante líquido da empresa é garantido e liberado após o período de 9 dias.
                </p>

                <div className="space-y-2 text-xs text-white/60">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#D9F22A]" />
                    <span>Taxa de Checkout fixa: R$ 0,99 por transação aprovada</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#D9F22A]" />
                    <span>Taxa de Saque Pix: R$ 2,50 por repasse solicitado</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#D9F22A]" />
                    <span>Rotina cron diária de migração de saldos (Garantia de 9 dias)</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-3.5 rounded-xl bg-white/[0.02] border border-white/5 text-[11px] text-white/50 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#D9F22A] flex-shrink-0" />
                <span>Painel corporativo exclusivo para Startups e Produtores homologados.</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
