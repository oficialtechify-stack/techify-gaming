import React, { useState } from 'react';
import { UserSellerProfile, WithdrawalRequest, SaleTransaction, PaymentMethodStat, UserRoleMode } from '../../types/platform';
import { triggerReleaseBalancesCron } from '../../services/firestoreService';
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
  RefreshCw
} from 'lucide-react';

interface FinanceiroViewProps {
  roleMode?: UserRoleMode;
  userProfile: UserSellerProfile;
  withdrawals: WithdrawalRequest[];
  transactions?: SaleTransaction[];
  paymentStats?: PaymentMethodStat[];
  onOpenWithdraw: () => void;
}

export const FinanceiroView: React.FC<FinanceiroViewProps> = ({
  roleMode = 'afiliado',
  userProfile,
  withdrawals,
  transactions = [],
  paymentStats = [],
  onOpenWithdraw
}) => {
  const [isSyncingCron, setIsSyncingCron] = useState<boolean>(false);
  const [cronFeedback, setCronFeedback] = useState<string | null>(null);

  // Calculations for Company Mode
  const approvedSales = transactions.filter(t => t.status === 'Aprovado');
  const totalCompanyGross = approvedSales.reduce((acc, t) => acc + t.amount, 0);
  const totalCompanyCommissions = approvedSales.reduce((acc, t) => acc + t.commissionEarned, 0);
  const totalCheckoutFees = approvedSales.length * 0.99;
  const totalCompanyNet = Math.max(0, totalCompanyGross - totalCompanyCommissions - totalCheckoutFees);

  const handleSyncCron = async () => {
    setIsSyncingCron(true);
    setCronFeedback(null);
    try {
      const res = await triggerReleaseBalancesCron();
      setCronFeedback(res.message || 'Verificação concluída!');
      setTimeout(() => setCronFeedback(null), 4000);
    } catch (err: any) {
      setCronFeedback('Erro ao acionar cron de 9 dias');
      setTimeout(() => setCronFeedback(null), 4000);
    } finally {
      setIsSyncingCron(false);
    }
  };

  if (roleMode === 'empresa') {
    return (
      <div className="flex flex-col gap-6" id="techify-financeiro-empresa-view">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#D9F22A] mb-1">
              <Building2 className="w-3.5 h-3.5" />
              Gestão Financeira & Repasses da Empresa
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white font-['Syne']">
              Faturamento & Repasses a Afiliados
            </h1>
            <p className="text-xs text-white/60 mt-1">
              Acompanhe o faturamento bruto das suas soluções, comissões distribuídas e receita líquida retida.
            </p>
          </div>

          <button
            onClick={handleSyncCron}
            disabled={isSyncingCron}
            className="self-start sm:self-auto bg-white/5 hover:bg-white/10 text-white/80 hover:text-white px-4 py-2.5 rounded-xl border border-white/10 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncingCron ? 'animate-spin text-[#D9F22A]' : ''}`} />
            {isSyncingCron ? 'Verificando Regra de 9 Dias...' : 'Sincronizar Liberações (Cron 9 Dias)'}
          </button>
        </div>

        {cronFeedback && (
          <div className="p-3.5 bg-[#D9F22A]/10 border border-[#D9F22A]/30 rounded-xl text-xs text-[#D9F22A] font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{cronFeedback}</span>
          </div>
        )}

        {/* Company Financial KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Faturamento Bruto */}
          <div className="bg-[#080d1a] border border-white/10 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between text-white/60 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Faturamento Bruto</span>
              <Receipt className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl font-black text-white font-['Syne']">
              R$ {totalCompanyGross.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-white/50 block mt-1">
              {approvedSales.length} venda(s) aprovada(s)
            </span>
          </div>

          {/* Taxas de Checkout Plataforma (R$ 0,99 por venda) */}
          <div className="bg-[#080d1a] border border-white/10 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between text-white/60 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Taxas de Checkout Techify</span>
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
              R$ {totalCompanyCommissions.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
              R$ {totalCompanyNet.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-white/50 block mt-1">
              Faturamento líquido após comissões e taxas
            </span>
          </div>
        </div>

        {/* Banner Informativo da Regra de 9 Dias */}
        <div className="p-4 rounded-2xl bg-[#080d1a] border border-white/10 flex items-start gap-3">
          <Clock className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs">
            <h4 className="font-bold text-white mb-0.5">Regra de Garantia e Liberação em 9 Dias</h4>
            <p className="text-white/60 leading-relaxed">
              Para conformidade jurídica e segurança contra contestações e estornos de compras, os saldos de vendas são mantidos em <strong>status pendente por 9 dias</strong>. Após este período, a rotina cron diária do servidor migra os valores automaticamente para o <strong>status disponível</strong>.
            </p>
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
                Quando um cliente adquire uma solução, a Techify retém R$ 0,99 da taxa de checkout, credita a comissão acordada para o afiliado, e o montante líquido da empresa é garantido e liberado após o período de 9 dias.
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
    );
  }

  // Affiliate Mode Rendering
  return (
    <div className="flex flex-col gap-6" id="techify-financeiro-view">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#D9F22A] mb-1">
            <Wallet className="w-3.5 h-3.5" />
            Carteira & Comissões de Afiliado
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-['Syne']">
            Saldo & Saques PIX
          </h1>
          <p className="text-xs text-white/60 mt-1">
            Acompanhe suas comissões recebidas, saldo disponível após 9 dias de garantia e solicite saques via Pix (mínimo R$ 50,00).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSyncCron}
            disabled={isSyncingCron}
            className="bg-white/5 hover:bg-white/10 text-white/80 hover:text-white px-3.5 py-3 rounded-xl border border-white/10 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
            title="Verificar transações com 9 dias para liberação de saldo"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncingCron ? 'animate-spin text-[#D9F22A]' : ''}`} />
            <span className="hidden sm:inline">{isSyncingCron ? 'Sincronizando...' : 'Verificar 9 Dias'}</span>
          </button>

          <button
            onClick={onOpenWithdraw}
            disabled={userProfile.availableBalance < 50}
            className="bg-[#D9F22A] hover:bg-[#c8e217] disabled:opacity-40 text-[#060A15] font-black px-6 py-3 rounded-xl text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(217,242,42,0.35)] transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <ArrowUpRight className="w-4 h-4" />
            Solicitar Saque PIX (Mín. R$ 50)
          </button>
        </div>
      </div>

      {cronFeedback && (
        <div className="p-3.5 bg-[#D9F22A]/10 border border-[#D9F22A]/30 rounded-xl text-xs text-[#D9F22A] font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{cronFeedback}</span>
        </div>
      )}

      {/* Financial Balances Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Available Balance */}
        <div className="bg-[#080d1a] border-l-4 border-l-[#D9F22A] border-y border-r border-white/10 rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between text-white/60 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Saldo Disponível para Saque</span>
            <div className="w-8 h-8 rounded-full bg-[#D9F22A]/10 flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-[#D9F22A]" />
            </div>
          </div>
          <div className="text-3xl font-black text-[#D9F22A] font-['Syne'] tracking-tight">
            R$ {userProfile.availableBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-white/50 block mt-2">
            Liberado após o período de 9 dias (Saque imediato via Pix)
          </span>
        </div>

        {/* Pending Balance */}
        <div className="bg-[#080d1a] border-l-4 border-l-amber-500 border-y border-r border-white/10 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between text-white/60 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Saldo em Garantia (9 Dias)</span>
            <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center">
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
          </div>
          <div className="text-3xl font-black text-amber-400 font-['Syne'] tracking-tight">
            R$ {userProfile.pendingBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-white/50 block mt-2">
            Período de garantia e proteção do consumidor contra estornos
          </span>
        </div>

        {/* Total Historical Earnings */}
        <div className="bg-[#080d1a] border-l-4 border-l-blue-500 border-y border-r border-white/10 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between text-white/60 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total de Comissões Ganhas</span>
            <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Wallet className="w-4 h-4 text-blue-400" />
            </div>
          </div>
          <div className="text-3xl font-black text-white font-['Syne'] tracking-tight">
            R$ {userProfile.totalEarned.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-white/50 block mt-2">
            Acumulado histórico como Afiliado Techify
          </span>
        </div>
      </div>

      {/* Regras de Taxas e Chave Pix */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 bg-[#080d1a] border border-white/10 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
            <h3 className="text-base font-bold text-white font-['Syne'] flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#D9F22A]" />
              Dados Bancários & Chave PIX Padrão
            </h3>
            <span className="text-[10px] text-[#D9F22A] font-bold bg-[#D9F22A]/10 px-2 py-0.5 rounded">
              VERIFICADA
            </span>
          </div>

          <div className="space-y-3 text-xs bg-[#050811] p-4 rounded-xl border border-white/10">
            <div className="flex justify-between">
              <span className="text-white/50">Titular da Conta:</span>
              <span className="font-bold text-white">{userProfile.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/50">Tipo de Chave:</span>
              <span className="font-bold text-white">{userProfile.pixKeyType || 'CPF'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/50">Chave PIX:</span>
              <span className="font-bold text-[#D9F22A] font-mono">{userProfile.pixKey || 'Não cadastrada'}</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-6 bg-[#080d1a] border border-white/10 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="w-5 h-5 text-[#D9F22A]" />
              <h3 className="text-base font-bold text-white font-['Syne']">
                Políticas de Liquidação & Taxas de Saque
              </h3>
            </div>
            <p className="text-xs text-white/70 leading-relaxed mb-3">
              Os repasses aos parceiros são operados com segurança pelo Mercado Pago e Banco Central do Brasil.
            </p>
            <div className="space-y-2 text-xs text-white/60">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#D9F22A]" />
                <span><strong>Garantia de 9 dias:</strong> Saldo liberado automaticamente pelo cron do servidor.</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#D9F22A]" />
                <span><strong>Taxa de Saque Pix:</strong> R$ 2,50 deduzidos no momento do repasse.</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#D9F22A]" />
                <span><strong>Valor mínimo de saque:</strong> R$ 50,00 via Pix.</span>
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 rounded-lg bg-white/[0.02] border border-white/5 text-[11px] text-white/50 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#D9F22A] flex-shrink-0" />
            <span>Saques autorizados exclusivamente para a chave Pix validada em nome do titular.</span>
          </div>
        </div>
      </div>

      {/* Histórico de Saques */}
      <div className="bg-[#080d1a] border border-white/10 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-white font-['Syne']">
            Histórico Recente de Saques via Pix
          </h3>
          <span className="text-xs text-white/40">Taxa fixa de R$ 2,50 por repasse</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-white/40 bg-[#050811] border-b border-white/10 uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4 font-bold">ID do Saque</th>
                <th className="py-3 px-4 font-bold">Data / Hora</th>
                <th className="py-3 px-4 font-bold">Chave de Destino</th>
                <th className="py-3 px-4 font-bold">Valor Solicitado</th>
                <th className="py-3 px-4 font-bold text-amber-400">Taxa Pix</th>
                <th className="py-3 px-4 font-bold text-emerald-400">Valor Líquido</th>
                <th className="py-3 px-4 font-bold text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {withdrawals.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-white/40">
                    Nenhum saque realizado até o momento.
                  </td>
                </tr>
              ) : (
                withdrawals.map((w) => {
                  const fee = w.feeAmount !== undefined ? w.feeAmount : 2.50;
                  const net = w.netAmount !== undefined ? w.netAmount : Math.max(0, w.amount - fee);
                  const isDone = w.status === 'concluido' || w.status === 'Concluído';

                  return (
                    <tr key={w.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-white">
                        {w.id}
                        {w.endToEndId && (
                          <span className="block text-[9px] text-white/30 font-normal truncate max-w-[120px]">
                            {w.endToEndId}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-white/70">{w.requestedAt}</td>
                      <td className="py-3.5 px-4 font-mono text-white/80">{w.pixKey} ({w.pixKeyType})</td>
                      <td className="py-3.5 px-4 font-bold text-white">
                        R$ {w.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                          {isDone ? 'Concluído' : 'Pendente Processamento'}
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
  );
};

