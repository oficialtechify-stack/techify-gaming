import React, { useState } from 'react';
import { X, Wallet, ShieldCheck, AlertCircle, ArrowUpRight } from 'lucide-react';
import { UserRoleMode, UserSellerProfile } from '../../types/platform';

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile?: UserSellerProfile;
  roleMode: UserRoleMode;
  onWithdraw?: (amount: number) => Promise<void>;
}

export const WithdrawModal: React.FC<WithdrawModalProps> = ({ isOpen, onClose, userProfile, roleMode, onWithdraw }) => {
  const role = roleMode === 'empresa' ? 'empresa' : 'afiliado';
  const cents = role === 'empresa' ? userProfile?.empresaAvailableBalanceCents : userProfile?.afiliadoAvailableBalanceCents;
  const available = Number.isFinite(Number(cents)) ? Number(cents) / 100 : Number(userProfile?.availableBalance || 0);
  const [amount,setAmount]=useState('50.00');
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const [success,setSuccess]=useState(false);
  if(!isOpen) return null;
  const value=Number(amount.replace(',','.'))||0;
  const submit=async(e:React.FormEvent)=>{
    e.preventDefault(); setError('');
    if(roleMode==='admin') return setError('Selecione Empresa ou Afiliado para sacar.');
    if(value<10) return setError('O valor mínimo é R$ 10,00.');
    if(value>available) return setError('Saldo disponível insuficiente.');
    setLoading(true);
    try{await onWithdraw?.(value);setSuccess(true);setTimeout(()=>{setSuccess(false);onClose();},1200);}
    catch(err:any){setError(err?.message||'Erro ao processar saque.');}
    finally{setLoading(false);}
  };
  return <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"><div className="relative w-full max-w-md bg-[#0a0f1d] border border-white/10 rounded-2xl p-6 shadow-2xl text-white">
    <button onClick={onClose} className="absolute top-4 right-4 text-white/50 hover:text-white"><X className="w-5 h-5"/></button>
    <div className="flex gap-3 items-center mb-5"><div className="w-10 h-10 rounded-xl bg-[#D9F22A]/10 flex items-center justify-center text-[#D9F22A]"><Wallet className="w-5 h-5"/></div><div><h3 className="font-bold">Solicitar saque</h3><p className="text-xs text-white/50">Via Stripe Connect</p></div></div>
    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex justify-between text-xs mb-4"><span>Disponível</span><b className="text-[#D9F22A]">R$ {available.toLocaleString('pt-BR',{minimumFractionDigits:2})}</b></div>
    {error&&<div className="p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex gap-2"><AlertCircle className="w-4 h-4"/>{error}</div>}
    {success&&<div className="p-3 mb-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex gap-2"><ShieldCheck className="w-4 h-4"/>Saque enviado à Stripe.</div>}
    <form onSubmit={submit} className="space-y-4"><label className="block text-xs font-semibold text-white/70">Valor (R$)</label><input type="number" min="10" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)} className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white"/><div className="p-3 rounded-xl bg-white/[0.03] text-xs text-white/55">Taxa fixa de R$ 2,50. O destino bancário é o cadastrado na sua conta Stripe Connect.</div><button disabled={loading} className="w-full bg-[#D9F22A] text-[#060A15] font-black text-xs py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50">{loading?'Processando...':'Confirmar saque'}<ArrowUpRight className="w-4 h-4"/></button></form>
  </div></div>;
};
