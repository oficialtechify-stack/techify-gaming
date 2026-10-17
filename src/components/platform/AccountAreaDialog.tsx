import React, { useState } from 'react';
import { activateArea, accountAreaRequest } from '../../services/accountAreaService';
import type { AccountArea } from '../../../lib/accountAreas';
export function AccountAreaDialog({ area, admin, companyInvite, onClose, onActivated }: { area: AccountArea | null; admin?: boolean; companyInvite?: boolean; onClose: () => void; onActivated: (area: AccountArea) => void }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      if (admin || companyInvite) {
        const data = await accountAreaRequest({ action: companyInvite ? 'company-invite' : 'invite', email: value });
        setResult(data.token);
      } else if (area) {
        await activateArea(area, value);
        onActivated(area);
      }
    } catch (err: any) { setError(err.message); }
    finally { setBusy(false); }
  }
  return <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-auto bg-black/75 p-5"><form onSubmit={submit} className="w-full max-w-md space-y-4 rounded-2xl border border-white/20 bg-[#101725] p-6 text-white">
    <button type="button" disabled={busy} onClick={onClose} className="float-right p-2" aria-label="Fechar">✕</button>
    <h2 className="text-xl font-bold">{(admin || companyInvite) ? 'Convidar afiliado' : area === 'afiliado' ? 'Ativar área de afiliado' : 'Ativar área da empresa'}</h2>
    <p className="text-sm text-white/65">{(admin || companyInvite) ? 'Convite pessoal válido por sete dias. Envie o código ao titular do e-mail.' : 'Mesmo acesso, com perfil, aprovação e recebimentos separados. A ativação não libera vendas ou saques automaticamente.'}</p>
    {(admin || companyInvite || area === 'afiliado') && <label className="block text-sm">{(admin || companyInvite) ? 'E-mail do convidado' : 'Código do convite'}<input required type={(admin || companyInvite) ? 'email' : 'text'} value={value} onChange={e => setValue(e.target.value)} className="mt-2 w-full rounded-xl border border-white/20 bg-white/5 p-3"/></label>}
    {result && <div role="status"><label className="block text-sm">Código do convite<input readOnly value={result} onFocus={e => e.target.select()} className="mt-2 w-full rounded-xl border border-white/20 bg-white/5 p-3"/></label><p className="mt-2 text-xs">O titular entra ou cria uma conta e informa este código ao ativar a área de afiliado.</p></div>}
    {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
    <button disabled={busy} className="rounded-xl bg-lime-300 px-5 py-3 font-bold text-black disabled:opacity-50">{busy ? 'Aguarde…' : (admin || companyInvite) ? 'Gerar convite' : 'Ativar e completar perfil'}</button>
  </form></div>;
}
