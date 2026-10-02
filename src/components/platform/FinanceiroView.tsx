import React from 'react';
import { UserSellerProfile, WithdrawalRequest, SaleTransaction, UserRoleMode, CompanyStartup } from '../../types/platform';
import { DollarSign, ArrowUpRight, Clock, Wallet, ShieldCheck, TrendingUp, Receipt, CheckCircle2 } from 'lucide-react';

interface FinanceiroViewProps {
  roleMode?:UserRoleMode;
  userProfile:UserSellerProfile;
  company?:CompanyStartup|null;
  withdrawals:WithdrawalRequest[];
  transactions?:SaleTransaction[];
  onOpenWithdraw?:()=>void;
}

const money=(v:number)=>v.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});

export const FinanceiroView:React.FC<FinanceiroViewProps>=({roleMode='afiliado',userProfile,company=null,withdrawals=[],transactions=[],onOpenWithdraw})=>{
  const role=roleMode==='empresa'?'empresa':'afiliado';
  const availableCents=role==='empresa'?userProfile.empresaAvailableBalanceCents:userProfile.afiliadoAvailableBalanceCents;
  const pendingCents=role==='empresa'?userProfile.empresaPendingBalanceCents:userProfile.afiliadoPendingBalanceCents;
  const available=Number.isFinite(Number(availableCents))?Number(availableCents)/100:Number(userProfile.availableBalance||0);
  const pending=Number.isFinite(Number(pendingCents))?Number(pendingCents)/100:Number(userProfile.pendingBalance||0);
  const approved=transactions.filter(t=>['aprovado','approved','liberado','received','confirmed'].includes(String(t.status||'').toLowerCase()));
  const gross=role==='empresa'?Number(company?.grossRevenue ?? approved.reduce((s,t)=>s+Number(t.amount||0),0)):Number(userProfile.totalEarned||0);
  const commissions=role==='empresa'?Number(company?.totalAffiliateCommissions ?? approved.reduce((s,t)=>s+Number(t.commissionEarned||0),0)):Number(userProfile.totalEarned||0);
  const fees=role==='empresa'?Number(company?.totalCheckoutFees ?? approved.reduce((s,t)=>s+Number(t.checkoutFee||0),0)):0;
  const net=role==='empresa'?Number(company?.netRevenue ?? Math.max(0,gross-commissions-fees)):gross;
  const completed=withdrawals.filter(w=>String(w.status)==='COMPLETED').reduce((s,w)=>s+Number(w.amount||0),0);

  return <div className="space-y-6 animate-fadeIn">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"><div><div className="text-xs font-bold uppercase tracking-widest text-[#D9F22A]">Financeiro real</div><h1 className="text-2xl sm:text-3xl font-black text-white font-['Syne']">Carteira & Faturamento</h1><p className="text-xs text-white/50 mt-1">Saldos atualizados por webhooks da Stripe e liberados automaticamente após o prazo.</p></div>{onOpenWithdraw&&roleMode!=='admin'&&<button onClick={onOpenWithdraw} className="px-4 py-2.5 rounded-xl bg-[#D9F22A] text-[#060A15] font-black text-xs flex gap-2 items-center"><ArrowUpRight className="w-4 h-4"/>Solicitar saque</button>}</div>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="p-5 rounded-2xl bg-[#07120f] border border-emerald-500/30"><Wallet className="w-4 h-4 text-emerald-400"/><div className="text-[11px] uppercase font-bold text-white/45 mt-3">Disponível</div><div className="text-3xl font-black text-emerald-400">R$ {money(available)}</div></div>
      <div className="p-5 rounded-2xl bg-[#080d1a] border border-white/10"><Clock className="w-4 h-4 text-amber-400"/><div className="text-[11px] uppercase font-bold text-white/45 mt-3">Pendente</div><div className="text-3xl font-black text-white">R$ {money(pending)}</div><div className="text-[10px] text-white/35 mt-2">8 dias com plano pago; 15 dias sem plano pago.</div></div>
      <div className="p-5 rounded-2xl bg-[#080d1a] border border-white/10"><CheckCircle2 className="w-4 h-4 text-[#D9F22A]"/><div className="text-[11px] uppercase font-bold text-white/45 mt-3">Já sacado</div><div className="text-3xl font-black text-[#D9F22A]">R$ {money(completed)}</div></div>
    </div>
    {role==='empresa'&&<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[['Faturamento bruto',gross,TrendingUp],['Comissões',commissions,DollarSign],['Taxas checkout',fees,Receipt],['Líquido empresa',net,ShieldCheck]].map(([label,value,Icon]:any)=><div key={label} className="p-4 rounded-2xl bg-[#080d1a] border border-white/10"><Icon className="w-4 h-4 text-[#D9F22A]"/><div className="text-[10px] uppercase text-white/40 mt-2">{label}</div><div className="text-lg font-black text-white">R$ {money(Number(value))}</div></div>)}
    </div>}
    <div className="bg-[#080d1a] border border-white/10 rounded-2xl overflow-hidden"><div className="p-4 border-b border-white/10 font-bold text-sm text-white">Últimas vendas</div>{approved.length===0?<div className="p-8 text-xs text-center text-white/40">Nenhuma venda aprovada.</div>:<div className="divide-y divide-white/5">{approved.slice(0,12).map(t=><div key={t.id} className="p-4 flex justify-between gap-4"><div><div className="text-xs font-bold text-white">{t.platformName||'Venda'}</div><div className="text-[10px] text-white/40">{t.date||t.createdAt||''} · {t.method||'Stripe'}</div></div><div className="text-right"><div className="text-xs font-black text-[#D9F22A]">R$ {money(role==='afiliado'?Number(t.commissionEarned||0):Number(t.netCompanyAmount||t.amount||0))}</div><div className="text-[10px] text-white/35">{t.releaseStatus||'pendente'}</div></div></div>)}</div>}</div>
  </div>;
};
