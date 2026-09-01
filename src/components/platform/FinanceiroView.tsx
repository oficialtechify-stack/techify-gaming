import React from 'react';
import { UserSellerProfile, WithdrawalRequest, SaleTransaction, PaymentMethodStat, UserRoleMode } from '../../types/platform';
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
  Receipt
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
  // Calculations for Company Mode
  const approvedSales = transactions.filter(t => t.status === 'Aprovado');
  const totalCompanyGross = approvedSales.reduce((acc, t) => acc + t.amount, 0);
  const totalCompanyCommissions = approvedSales.reduce((acc, t) => acc + t.commissionEarned, 0);
  const totalCompanyNet = totalCompanyGross - totalCompanyCommissions;

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
        </div>

        {/* Company Financial KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Faturamento Bruto */}
          <div className="bg-[#080d1a] border-l-4 border-l-blue-500 border-y border-r border-white/10 rounded-2xl p-6 shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between text-white/60 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Faturamento Bruto Total</span>
              <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Receipt className="w-4 h-4 text-blue-400" />
              </div>
            </div>
            <div className="text-3xl font-black text-white font-['Syne'] tracking-tight">
              R$ {totalCompanyGross.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-white/50 block mt-2">
              Total de vendas processadas pelos planos da empresa
            </span>
          </div>

          {/* Comissões Pagas aos Afiliados */}
          <div className="bg-[#080d1a] border-l-4 border-l-amber-500 border-y border-r border-white/10 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between text-white/60 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Comissões a Afiliados</span>
              <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center">
                <ArrowDownRight className="w-4 h-4 text-amber-400" />
              </div>
            </div>
            <div className="text-3xl font-black text-amber-400 font-['Syne'] tracking-tight">
              R$ {totalCompanyCommissions.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-white/50 block mt-2">
              Distribuído automaticamente para os afiliados vendedores
            </span>
          </div>

          {/* Receita Líquida da Empresa */}
          <div className="bg-[#080d1a] border-l-4 border-l-[#D9F22A] border-y border-r border-white/10 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between text-white/60 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Receita Líquida Retida</span>
              <div className="w-8 h-8 rounded-full bg-[#D9F22A]/10 flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-[#D9F22A]" />
              </div>
            </div>
            <div className="text-3xl font-black text-[#D9F22A] font-['Syne'] tracking-tight">
              R$ {totalCompanyNet.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-white/50 block mt-2">
              Lucro líquido creditado na conta corporativa da startup
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
                  Split Automático de Pagamentos & Segurança
                </h3>
              </div>
              <p className="text-xs text-white/70 leading-relaxed mb-4">
                Quando um cliente adquire uma solução da sua empresa, a Techify realiza o split inteligente em tempo real: a comissão acordada é creditada instantaneamente na carteira do afiliado, e o montante líquido fica reservado e disponível para a sua empresa sem risco de estorno de comissão.
              </p>

              <div className="space-y-2 text-xs text-white/60">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#D9F22A]" />
                  <span>Emissão de relatórios fiscais e conciliação de faturamento por CNPJ</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#D9F22A]" />
                  <span>Liquidação D+0 para transações via PIX instantâneo</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#D9F22A]" />
                  <span>Proteção antifraude integrada em todos os checkouts</span>
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
            Acompanhe suas comissões recebidas, saldo disponível e solicite saques instantâneos D+0.
          </p>
        </div>

        <button
          onClick={onOpenWithdraw}
          disabled={userProfile.availableBalance <= 0}
          className="bg-[#D9F22A] hover:bg-[#c8e217] disabled:opacity-40 text-[#060A15] font-black px-6 py-3 rounded-xl text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(217,242,42,0.35)] transition-all cursor-pointer flex items-center justify-center gap-2"
        >
          <ArrowUpRight className="w-4 h-4" />
          Solicitar Saque Instantâneo PIX
        </button>
      </div>

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
            Disponível via PIX imediato (sem taxa de TED)
          </span>
        </div>

        {/* Pending Balance */}
        <div className="bg-[#080d1a] border-l-4 border-l-yellow-500 border-y border-r border-white/10 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between text-white/60 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Saldo em Liquidação</span>
            <div className="w-8 h-8 rounded-full bg-yellow-500/10 flex items-center justify-center">
              <Clock className="w-4 h-4 text-yellow-400" />
            </div>
          </div>
          <div className="text-3xl font-black text-white font-['Syne'] tracking-tight">
            R$ {userProfile.pendingBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-white/50 block mt-2">
            Contratos em validação técnica e compensação bancária
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

      {/* Chave PIX Cadastrada & Políticas de Repasse */}
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
                Políticas de Segurança e Liquidação D+0
              </h3>
            </div>
            <p className="text-xs text-white/70 leading-relaxed">
              Todos os repasses aos parceiros são operados com redundância bancária pelo Banco Central do Brasil.
              Os saques solicitados são liberados em poucos minutos na sua chave PIX cadastrada.
            </p>
          </div>

          <div className="mt-4 p-3 rounded-lg bg-white/[0.02] border border-white/5 text-[11px] text-white/50 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#D9F22A] flex-shrink-0" />
            <span>Sem taxa de administração, sem mensalidades e repasse de 100% da sua comissão de afiliado.</span>
          </div>
        </div>
      </div>

      {/* Histórico de Saques */}
      <div className="bg-[#080d1a] border border-white/10 rounded-2xl p-6 shadow-xl">
        <h3 className="text-base font-bold text-white font-['Syne'] mb-4">
          Histórico Recente de Saques
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-white/40 bg-[#050811] border-b border-white/10 uppercase tracking-wider">
                <th className="py-3 px-4 font-bold">ID do Saque</th>
                <th className="py-3 px-4 font-bold">Data da Solicitação</th>
                <th className="py-3 px-4 font-bold">Chave de Destino</th>
                <th className="py-3 px-4 font-bold">Valor</th>
                <th className="py-3 px-4 font-bold text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {withdrawals.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-white/40">
                    Nenhum saque realizado até o momento.
                  </td>
                </tr>
              ) : (
                withdrawals.map((w) => (
                  <tr key={w.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-white">{w.id}</td>
                    <td className="py-3.5 px-4 text-white/70">{w.requestedAt}</td>
                    <td className="py-3.5 px-4 font-mono text-white/80">{w.pixKey} ({w.pixKeyType})</td>
                    <td className="py-3.5 px-4 font-bold text-[#D9F22A]">
                      R$ {w.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        <CheckCircle2 className="w-3 h-3" />
                        {w.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
