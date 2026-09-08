import React, { useState } from 'react';
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
              : 'Carteira & Saques PIX'}
          </h1>
          <p className="text-xs text-white/60 mt-1">
            {roleMode === 'empresa'
              ? 'Monitore saldo em garantia de 9 dias, solicite transferências via PIX e consulte o faturamento corporativo.'
              : 'Acompanhe suas comissões recebidas, saldo liberado após garantia (D+9) e solicite saques via Pix com segurança.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSyncCron}
            disabled={isSyncingCron}
            className="bg-white/5 hover:bg-white/10 text-white/80 hover:text-white px-3.5 py-2.5 rounded-xl border border-white/10 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
            title="Executa a verificação no Firestore de transações com mais de 9 dias para migração de saldo"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncingCron ? 'animate-spin text-[#D9F22A]' : ''}`} />
            <span className="hidden sm:inline">{isSyncingCron ? 'Verificando...' : 'Verificar D+9 (Cron)'}</span>
          </button>

          {onOpenWithdraw && (
            <button
              onClick={onOpenWithdraw}
              disabled={availableBalance < 50}
              className="bg-[#D9F22A] hover:bg-[#c8e217] disabled:opacity-40 text-[#060A15] font-black px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider shadow-[0_0_15px_rgba(217,242,42,0.25)] transition-all cursor-pointer flex items-center gap-1.5"
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>Sacar via PIX</span>
            </button>
          )}
        </div>
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

          {/* 2. Formulário de Saque PIX Integrado na Tela */}
          <div className="bg-[#080d1a] border border-white/10 rounded-2xl p-6 sm:p-8 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6 pb-4 border-b border-white/10">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#D9F22A] mb-1">
                  <ArrowUpRight className="w-4 h-4" />
                  Transferência Bancária Instantânea
                </div>
                <h3 className="text-xl font-bold text-white font-['Syne']">
                  Solicitar Saque PIX
                </h3>
              </div>
              <div className="text-left sm:text-right">
                <span className="text-xs text-white/50 block">Saldo liberado:</span>
                <span className="text-base font-black text-[#D9F22A]">
                  R$ {availableBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Aviso Visual Obrigatório de Mínimo e Taxa */}
            <div className="mb-6 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center gap-3 text-xs text-amber-300">
              <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
              <div className="leading-snug">
                <strong>Aviso de Repasse:</strong> Mínimo <strong>R$ 50,00</strong> | Taxa administrativa de <strong>R$ 2,50</strong> deduzida por transferência PIX.
              </div>
            </div>

            {withdrawError && (
              <div className="mb-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-400 font-semibold flex items-center gap-2 animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{withdrawError}</span>
              </div>
            )}

            {withdrawSuccess && (
              <div className="mb-6 p-4 rounded-xl bg-[#D9F22A]/10 border border-[#D9F22A]/30 text-xs text-[#D9F22A] font-semibold flex flex-col gap-1.5 animate-in fade-in duration-200">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                  <span>{withdrawSuccess}</span>
                </div>
                {lastCompletedWithdrawal && (
                  <p className="text-white/70 pl-7 text-[11px]">
                    Protocolo: <span className="font-mono text-white">{lastCompletedWithdrawal.id}</span>
                    {lastCompletedWithdrawal.asaasTransferId && (
                      <> | Asaas ID: <span className="font-mono text-white">{lastCompletedWithdrawal.asaasTransferId}</span></>
                    )}
                  </p>
                )}
              </div>
            )}

            <form onSubmit={handleWithdrawSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                {/* Campo: Valor do Saque */}
                <div className="md:col-span-6 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-white/80">
                      Valor do Saque (R$) *
                    </label>
                    <span className="text-[11px] text-white/40">Mínimo R$ 50,00</span>
                  </div>

                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 font-bold text-sm">
                      R$
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="50"
                      max={availableBalance > 0 ? availableBalance : undefined}
                      value={withdrawAmount}
                      onChange={(e) => {
                        setWithdrawAmount(e.target.value);
                        setWithdrawError(null);
                      }}
                      placeholder="0,00"
                      className="w-full pl-11 pr-4 py-3.5 bg-[#050811] border border-white/10 rounded-xl text-white font-bold text-lg focus:outline-none focus:border-[#D9F22A] transition-colors"
                      required
                    />
                  </div>

                  {/* Atalhos Rápidos */}
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-[10px] text-white/40">Atalhos:</span>
                    <button
                      type="button"
                      onClick={() => handleQuickAmount(50)}
                      disabled={availableBalance < 50}
                      className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-white/70 text-[10px] font-bold border border-white/5 disabled:opacity-30 cursor-pointer"
                    >
                      R$ 50
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickAmount(100)}
                      disabled={availableBalance < 100}
                      className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-white/70 text-[10px] font-bold border border-white/5 disabled:opacity-30 cursor-pointer"
                    >
                      R$ 100
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickAmount(250)}
                      disabled={availableBalance < 250}
                      className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-white/70 text-[10px] font-bold border border-white/5 disabled:opacity-30 cursor-pointer"
                    >
                      R$ 250
                    </button>
                    <button
                      type="button"
                      onClick={handleMaxAmount}
                      disabled={availableBalance < 50}
                      className="px-2.5 py-1 rounded bg-[#D9F22A]/10 hover:bg-[#D9F22A]/20 text-[#D9F22A] text-[10px] font-bold border border-[#D9F22A]/30 disabled:opacity-30 cursor-pointer ml-auto"
                    >
                      Saldo Máximo
                    </button>
                  </div>
                </div>

                {/* Campo: Tipo de Chave PIX */}
                <div className="md:col-span-6 space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-white/80">
                    Tipo de Chave PIX *
                  </label>
                  <select
                    value={pixKeyType}
                    onChange={(e) => setPixKeyType(e.target.value)}
                    className="w-full px-4 py-3.5 bg-[#050811] border border-white/10 rounded-xl text-white text-sm font-semibold focus:outline-none focus:border-[#D9F22A] transition-colors cursor-pointer"
                  >
                    <option value="CPF">CPF (Pessoa Física)</option>
                    <option value="CNPJ">CNPJ (Pessoa Jurídica)</option>
                    <option value="EMAIL">E-mail</option>
                    <option value="PHONE">Telefone / Celular</option>
                    <option value="EVP">Chave Aleatória (EVP)</option>
                  </select>
                  <span className="text-[11px] text-white/40 block">
                    Selecione o formato cadastrado na sua instituição financeira
                  </span>
                </div>

                {/* Campo: Chave PIX de Destino */}
                <div className="md:col-span-12 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-white/80">
                      Chave PIX de Destino *
                    </label>
                    {userProfile?.pixKey && userProfile.pixKey !== pixKey && (
                      <button
                        type="button"
                        onClick={() => setPixKey(userProfile.pixKey || '')}
                        className="text-[10px] text-[#D9F22A] hover:underline cursor-pointer"
                      >
                        Preencher com chave salva no perfil
                      </button>
                    )}
                  </div>

                  <input
                    type="text"
                    value={pixKey}
                    onChange={(e) => {
                      setPixKey(e.target.value);
                      setWithdrawError(null);
                    }}
                    placeholder={
                      pixKeyType === 'CPF' ? '000.000.000-00' :
                      pixKeyType === 'CNPJ' ? '00.000.000/0000-00' :
                      pixKeyType === 'EMAIL' ? 'seu-email@dominio.com' :
                      pixKeyType === 'PHONE' ? '(11) 99999-9999' : 'Cole sua chave aleatória (UUID)...'
                    }
                    className="w-full px-4 py-3.5 bg-[#050811] border border-white/10 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-[#D9F22A] transition-colors"
                    required
                  />
                </div>
              </div>

              {/* Prévia Financeira da Transferência */}
              <div className="p-4 rounded-xl bg-[#050811] border border-white/5 space-y-2 text-xs">
                <div className="flex justify-between text-white/60">
                  <span>Valor bruto solicitado:</span>
                  <span className="font-bold text-white font-mono">
                    R$ {parsedWithdrawAmount > 0 ? parsedWithdrawAmount.toFixed(2).replace('.', ',') : '0,00'}
                  </span>
                </div>
                <div className="flex justify-between text-white/60">
                  <span>Taxa administrativa de repasse:</span>
                  <span className="font-bold text-amber-400 font-mono">
                    - R$ {fixedFee.toFixed(2).replace('.', ',')}
                  </span>
                </div>
                <div className="border-t border-white/10 pt-2 flex justify-between items-center">
                  <span className="font-bold text-white">Valor Líquido a Receber via PIX:</span>
                  <span className="text-base font-black text-[#D9F22A] font-['Syne']">
                    R$ {netWithdrawalEstimate > 0 ? netWithdrawalEstimate.toFixed(2).replace('.', ',') : '0,00'}
                  </span>
                </div>
              </div>

              {/* Botão de Envio */}
              <button
                type="submit"
                disabled={isSubmittingWithdraw || availableBalance < 50 || parsedWithdrawAmount < 50 || parsedWithdrawAmount > availableBalance}
                className="w-full bg-[#D9F22A] hover:bg-[#c8e217] disabled:opacity-40 text-[#060A15] font-black py-4 px-6 rounded-xl text-sm uppercase tracking-wider shadow-[0_0_20px_rgba(217,242,42,0.35)] transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {isSubmittingWithdraw ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Processando Transferência via Asaas...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Solicitar Saque PIX</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* 3. Tabela de Histórico de Saques PIX */}
          <div className="bg-[#080d1a] border border-white/10 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
              <div>
                <h3 className="text-base font-bold text-white font-['Syne']">
                  Histórico de Saques PIX
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
