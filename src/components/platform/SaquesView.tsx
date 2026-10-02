import React, { useMemo, useState } from 'react';
import { ArrowUpRight, Wallet, Clock, CheckCircle2, AlertCircle, RefreshCw, Send, ShieldCheck } from 'lucide-react';
import { UserRoleMode, UserSellerProfile, WithdrawalRequest } from '../../types/platform';

interface SaquesViewProps {
  userProfile: UserSellerProfile;
  roleMode: UserRoleMode;
  withdrawals?: WithdrawalRequest[];
  onWithdraw: (amount: number) => Promise<void>;
  onRefresh?: () => void;
}

const money = (value: number) => value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const SaquesView: React.FC<SaquesViewProps> = ({ userProfile, roleMode, withdrawals = [], onWithdraw, onRefresh }) => {
  const role = roleMode === 'empresa' ? 'empresa' : 'afiliado';
  const availableCents = role === 'empresa' ? userProfile.empresaAvailableBalanceCents : userProfile.afiliadoAvailableBalanceCents;
  const pendingCents = role === 'empresa' ? userProfile.empresaPendingBalanceCents : userProfile.afiliadoPendingBalanceCents;
  const availableBalance = Number.isFinite(Number(availableCents)) ? Number(availableCents) / 100 : Number(userProfile.availableBalance || 0);
  const pendingBalance = Number.isFinite(Number(pendingCents)) ? Number(pendingCents) / 100 : Number(userProfile.pendingBalance || 0);
  const [amount, setAmount] = useState(availableBalance >= 50 ? '50.00' : Math.max(10, availableBalance).toFixed(2));
  const [processing, setProcessing] = useState(false);
  const [feedback, setFeedback] = useState<{type:'error'|'success'; text:string}|null>(null);
  const value = Number(String(amount).replace(',', '.')) || 0;
  const fee = 2.50;
  const net = Math.max(0, value - fee);
  const totalWithdrawn = useMemo(() => withdrawals.filter(w => ['COMPLETED','concluido','Concluído'].includes(String(w.status))).reduce((sum,w)=>sum+Number(w.amount||0),0), [withdrawals]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFeedback(null);
    if (roleMode === 'admin') return setFeedback({type:'error', text:'Selecione Empresa ou Afiliado para movimentar um saldo.'});
    if (value < 10) return setFeedback({type:'error', text:'O valor mínimo de saque é R$ 10,00.'});
    if (value > availableBalance) return setFeedback({type:'error', text:'Saldo disponível insuficiente.'});
    setProcessing(true);
    try {
      await onWithdraw(value);
      setFeedback({type:'success', text:`Saque solicitado. Valor líquido: R$ ${money(net)}. A Stripe encaminhará para a conta bancária cadastrada.`});
      onRefresh?.();
    } catch (error:any) {
      setFeedback({type:'error', text:error?.message || 'Não foi possível solicitar o saque.'});
    } finally { setProcessing(false); }
  };

  return <div className="space-y-6 animate-fadeIn">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/10">
      <div><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#D9F22A] mb-1"><ArrowUpRight className="w-4 h-4"/> Stripe Connect</div>
        <h1 className="text-2xl sm:text-3xl font-black text-white font-['Syne']">Saques</h1>
        <p className="text-xs text-white/60 mt-1 max-w-xl">O saldo liberado é enviado para sua conta Stripe conectada e segue para a conta bancária cadastrada nela.</p></div>
      {onRefresh && <button onClick={onRefresh} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold border border-white/10"><RefreshCw className="w-3.5 h-3.5 text-[#D9F22A]"/> Atualizar</button>}
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="p-5 rounded-2xl bg-[#07120f] border border-emerald-500/30"><div className="flex items-center justify-between text-[11px] font-bold uppercase text-emerald-400"><span>Disponível</span><Wallet className="w-4 h-4"/></div><div className="text-3xl font-black text-emerald-400 mt-2">R$ {money(availableBalance)}</div><div className="text-[11px] text-white/45 mt-2">Pode ser solicitado agora.</div></div>
      <div className="p-5 rounded-2xl bg-[#080d1a] border border-white/10"><div className="flex items-center justify-between text-[11px] font-bold uppercase text-white/50"><span>A liberar</span><Clock className="w-4 h-4 text-amber-400"/></div><div className="text-3xl font-black text-white mt-2">R$ {money(pendingBalance)}</div><div className="text-[11px] text-white/45 mt-2">8 dias com plano pago; 15 dias sem plano pago.</div></div>
      <div className="p-5 rounded-2xl bg-[#080d1a] border border-white/10"><div className="flex items-center justify-between text-[11px] font-bold uppercase text-white/50"><span>Total concluído</span><CheckCircle2 className="w-4 h-4 text-[#D9F22A]"/></div><div className="text-3xl font-black text-[#D9F22A] mt-2">R$ {money(totalWithdrawn)}</div><div className="text-[11px] text-white/45 mt-2">Payouts bancários confirmados.</div></div>
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <form onSubmit={submit} className="lg:col-span-2 bg-[#080d1a] border border-white/10 rounded-2xl p-6">
        <h2 className="text-base font-bold text-white mb-4">Nova solicitação</h2>
        {feedback && <div className={`mb-4 p-3 rounded-xl border text-xs flex gap-2 ${feedback.type==='error'?'bg-red-500/10 border-red-500/20 text-red-400':'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>{feedback.type==='error'?<AlertCircle className="w-4 h-4"/>:<CheckCircle2 className="w-4 h-4"/>}<span>{feedback.text}</span></div>}
        <label className="text-xs font-bold text-white/70">Valor do saque</label>
        <div className="flex gap-2 mt-2"><input type="number" min="10" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)} className="flex-1 bg-[#050811] border border-white/15 rounded-xl px-4 py-3 text-white font-mono focus:outline-none focus:border-[#D9F22A]"/><button type="button" onClick={()=>setAmount(availableBalance.toFixed(2))} className="px-4 rounded-xl border border-white/10 text-xs font-bold text-white/70">Máximo</button></div>
        <div className="mt-4 p-4 rounded-xl bg-[#050811] border border-white/5 text-xs space-y-2"><div className="flex justify-between text-white/60"><span>Solicitado</span><span>R$ {money(value)}</span></div><div className="flex justify-between text-white/60"><span>Taxa fixa</span><span>R$ 2,50</span></div><div className="flex justify-between font-bold text-white pt-2 border-t border-white/5"><span>Líquido</span><span className="text-emerald-400">R$ {money(net)}</span></div></div>
        <button disabled={processing || value < 10 || value > availableBalance} className="w-full mt-5 py-3.5 rounded-xl bg-[#D9F22A] text-[#060A15] font-black text-xs uppercase disabled:opacity-40 flex items-center justify-center gap-2"><Send className="w-4 h-4"/>{processing?'Processando...':'Solicitar saque'}</button>
      </form>
      <div className="bg-[#080d1a] border border-white/10 rounded-2xl p-5"><ShieldCheck className="w-5 h-5 text-[#D9F22A] mb-3"/><h3 className="text-sm font-bold text-white">Destino bancário seguro</h3><p className="text-xs text-white/55 mt-2 leading-relaxed">Os dados bancários ficam na Stripe Connect. A plataforma não aceita um destino arbitrário enviado pelo navegador.</p><p className="text-[11px] text-white/40 mt-4">O prazo final no banco depende do payout e da conta conectada.</p></div>
    </div>
    <div className="bg-[#080d1a] border border-white/10 rounded-2xl overflow-hidden"><div className="p-4 border-b border-white/10 text-sm font-bold text-white">Histórico</div><div className="divide-y divide-white/5">
      {withdrawals.length===0&&<div className="p-6 text-center text-xs text-white/40">Nenhum saque solicitado.</div>}
      {withdrawals.slice(0,20).map(w=><div key={w.id} className="p-4 flex items-center justify-between gap-4"><div><div className="text-xs font-bold text-white">R$ {money(Number(w.amount||w.requestedAmount||0))}</div><div className="text-[10px] text-white/40">{w.requestedAt||w.createdAt||''}</div></div><div className="text-right"><div className="text-[10px] font-bold uppercase text-[#D9F22A]">{String(w.status||'PROCESSING').replace(/_/g,' ')}</div>{w.stripePayoutId&&<div className="text-[9px] font-mono text-white/35">{w.stripePayoutId}</div>}</div></div>)}
    </div></div>
  </div>;
};
