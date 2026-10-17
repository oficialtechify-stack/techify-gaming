import React, { useState } from 'react';
import { createUserWithEmailAndPassword, sendEmailVerification, signOut, updateProfile } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { activateArea } from '../../services/accountAreaService';
import { validateStrongPassword, getAuthErrorMessage } from '../../services/authService';
import type { AccountArea } from '../../../lib/accountAreas';

export function UnifiedAccountRegistration({ onClose, onLogin }: { onClose: () => void; onLogin: () => void }) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [area, setArea] = useState<AccountArea>('empresa');
  const [invitation, setInvitation] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError('');
    if (step === 1) {
      if (!validateStrongPassword(password)) { setError('Use pelo menos 12 caracteres, com maiúscula, minúscula e número.'); return; }
      setStep(2); return;
    }
    if (!accepted) { setError('Confirme que leu os termos antes de continuar.'); return; }
    setBusy(true);
    try {
      // On a retry after an invalid invitation, reuse only the auth identity created here.
      let user = auth.currentUser;
      if (!user || user.email?.toLowerCase() !== email.trim().toLowerCase()) {
        user = (await createUserWithEmailAndPassword(auth, email.trim(), password)).user;
        await updateProfile(user, { displayName: name.trim() });
      }
      await activateArea(area, invitation.trim(), name.trim());
      await sendEmailVerification(user);
      await signOut(auth);
      setDone(true);
    } catch (err: any) { setError(err.message?.startsWith('Firebase:') ? getAuthErrorMessage(err) : err.message || 'Não foi possível criar a conta.'); }
    finally { setBusy(false); }
  }
  const input = 'w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white';
  return <div className="fixed inset-0 z-[80] overflow-auto bg-[#060a15] p-5 text-white flex items-center justify-center"><section className="w-full max-w-md rounded-3xl border border-white/15 bg-[#101725] p-6">
    <button type="button" onClick={onClose} disabled={busy} className="float-right p-2" aria-label="Fechar cadastro">✕</button>
    <h1 className="text-2xl font-bold">Criar conta no LeadsPay</h1><p className="mt-2 mb-6 text-sm text-white/65">Um acesso. Áreas de empresa e afiliado separadas.</p>
    {done ? <div role="status"><p>Conta criada. Confirme o link enviado ao seu e-mail antes de entrar.</p><button onClick={onLogin} className="mt-5 rounded-xl bg-lime-300 p-3 text-black">Ir para login</button></div> : <form onSubmit={submit} className="space-y-4">
      {step === 1 ? <><label className="block">Nome<input required autoComplete="name" value={name} onChange={e => setName(e.target.value)} className={input}/></label><label className="block">E-mail<input required type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} className={input}/></label><label className="block">Senha<input required type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} className={input}/></label><p className="text-xs text-white/60">Pelo menos 12 caracteres, com maiúscula, minúscula e número.</p></> : <>
      <h2 className="font-bold">Como você quer começar?</h2>
      <label className="block rounded-xl border border-white/20 p-4"><input type="radio" name="area" checked={area === 'empresa'} onChange={() => setArea('empresa')}/> Vender meus produtos</label>
      <label className="block rounded-xl border border-white/20 p-4"><input type="radio" name="area" checked={area === 'afiliado'} onChange={() => setArea('afiliado')}/> Ganhar comissões indicando produtos</label>
      {area === 'afiliado' && <label className="block">Código do convite<input required value={invitation} onChange={e => setInvitation(e.target.value)} className={input}/><span className="text-xs text-white/60">Convite pessoal, vinculado ao seu e-mail.</span></label>}
      <p className="text-sm text-white/65">Você pode ativar a outra área depois, sem criar outra conta. Dados e aprovação de recebimentos são solicitados em cada área.</p>
      <label className="flex items-start gap-2 text-sm"><input required type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)}/><span>Li e aceito os <a href="/legal.html" target="_blank" rel="noreferrer" className="underline">termos da plataforma</a>.</span></label>
      <button type="button" disabled={busy} onClick={() => setStep(1)} className="text-sm underline">Voltar</button></>}
      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
      <button disabled={busy} className="w-full rounded-xl bg-lime-300 p-3 font-bold text-black disabled:opacity-50">{busy ? 'Criando conta…' : step === 1 ? 'Continuar' : 'Criar conta'}</button>
      <button type="button" disabled={busy} onClick={onLogin} className="w-full text-sm underline">Já tenho uma conta</button>
    </form>}
  </section></div>;
}
