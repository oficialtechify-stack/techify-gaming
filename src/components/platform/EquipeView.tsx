import { AccountAreaDialog } from './AccountAreaDialog';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import type { TeamMember } from '../../types/platform';
import { Users, UserPlus, Search, Pencil, Trash2, RefreshCw, ShieldCheck, X } from 'lucide-react';

type Permission = 'view_sales' | 'view_clients' | 'manage_products' | 'manage_team' | 'view_reports';
const permissionOptions: { id: Permission; label: string }[] = [
  { id: 'view_sales', label: 'Visualizar vendas' },
  { id: 'view_clients', label: 'Visualizar clientes' },
  { id: 'manage_products', label: 'Gerenciar produtos' },
  { id: 'manage_team', label: 'Gerenciar equipe' },
  { id: 'view_reports', label: 'Visualizar relatórios' },
];
const roles = ['Vendedor B2B', 'Closer de Vendas', 'SDR Outbound', 'Supervisor de Vendas', 'Gerente Comercial', 'Atendimento', 'Analista Comercial'];
type MemberForm = { name: string; email: string; role: string; status: string; permissions: Permission[] };
const emptyForm = (): MemberForm => ({ name: '', email: '', role: 'Vendedor B2B', status: 'Pendente', permissions: [] });

export const EquipeView: React.FC = () => {
  const { currentUser } = useAuth();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('Todos');
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<MemberForm>(emptyForm());
  const request = useCallback(async (method: 'GET' | 'POST', body?: object) => {
    if (!currentUser) throw new Error('Entre na conta da empresa.');
    const token = await currentUser.getIdToken();
    const response = await fetch('/api/company/team', {
      method,
      headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
      cache: 'no-store',
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Não foi possível concluir a operação.');
    return data;
  }, [currentUser]);
  const reload = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const data = await request('GET');
      setMembers(Array.isArray(data.members) ? data.members : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar equipe.');
      setMembers([]);
    } finally { setLoading(false); }
  }, [request]);
  useEffect(() => { void reload(); }, [reload]);
  const filtered = useMemo(() => members.filter(m =>
    (filter === 'Todos' || m.status === filter) &&
    [m.name, m.email, m.role].some(value => String(value || '').toLowerCase().includes(search.toLowerCase()))
  ), [members, filter, search]);
  const openCreate = () => { setEditing(null); setForm(emptyForm()); setModalOpen(true); setError(''); };
  const openEdit = (m: TeamMember) => {
    setEditing(m);
    setForm({ name: m.name, email: m.email, role: m.role, status: m.status,
      permissions: Array.isArray(m.permissions) ? m.permissions as Permission[] : [] });
    setModalOpen(true); setError('');
  };
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true); setError(''); setNotice('');
    try {
      const data = await request('POST', editing
        ? { action: 'update', memberId: editing.id, ...form }
        : { action: 'create', ...form });
      setMembers(previous => editing
        ? previous.map(m => m.id === editing.id ? data.member : m)
        : [data.member, ...previous]);
      setModalOpen(false);
      setNotice(editing ? 'Colaborador atualizado.' : 'Colaborador cadastrado. O acesso ao sistema ainda não é concedido automaticamente.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Erro ao salvar.'); }
    finally { setSaving(false); }
  };
  const remove = async (m: TeamMember) => {
    if (!window.confirm(`Remover ${m.name} desta empresa?`)) return;
    setError(''); setNotice('');
    try {
      await request('POST', { action: 'delete', memberId: m.id });
      setMembers(previous => previous.filter(item => item.id !== m.id));
      setNotice('Colaborador removido.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Erro ao remover.'); }
  };
  const active = members.filter(m => m.status === 'Ativo').length;
  return <div className="space-y-6 text-white">
    {inviteOpen && <AccountAreaDialog area={null} companyInvite onClose={() => setInviteOpen(false)} onActivated={() => {}} />}
    <section className="rounded-xl border border-white/15 p-4"><h2 className="font-bold">Parceiros afiliados</h2><p className="my-2 text-sm text-white/60">Convide parceiros para o programa. Eles completam o perfil de afiliado e solicitam acesso às ofertas; não recebem permissões de colaborador.</p><button onClick={() => setInviteOpen(true)} className="rounded-xl bg-lime-300 px-4 py-2 font-bold text-black">Convidar afiliado</button></section>
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <div className="text-[11px] font-bold uppercase tracking-widest text-[#D9F22A] mb-2">Gestão de pessoas da empresa</div>
        <h1 className="text-2xl sm:text-3xl font-black">Equipe de Vendas e Colaboradores</h1>
        <p className="text-sm text-white/50 mt-2">Cadastre, organize e acompanhe a equipe desta empresa. Sem afiliados ou bônus automáticos.</p>
      </div>
      <button onClick={openCreate} className="flex items-center gap-2 rounded-xl bg-[#D9F22A] px-5 py-3 font-bold text-[#060A15]"><UserPlus size={17}/> Novo colaborador</button>
    </div>
    {error && <div role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-red-300">{error}</div>}
    {notice && <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-emerald-300">{notice}</div>}
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {[
        ['Total de colaboradores', members.length],
        ['Ativos', active],
        ['Pendentes ou inativos', members.length - active],
      ].map(([label, value]) => <div key={String(label)} className="rounded-2xl border border-white/10 bg-[#0e1423] p-5"><div className="text-sm text-white/50">{label}</div><div className="mt-2 text-3xl font-bold">{value}</div></div>)}
    </div>
    <div className="rounded-2xl border border-white/10 bg-[#0e1423] p-4 sm:p-5 space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex flex-1 min-w-[180px] items-center gap-2 rounded-xl border border-white/10 bg-[#070b15] px-3"><Search size={16} className="text-white/50"/><input aria-label="Buscar colaborador" className="w-full bg-transparent py-3 text-sm outline-none" placeholder="Buscar nome, e-mail ou função" value={search} onChange={e => setSearch(e.target.value)}/></div>
        <select aria-label="Filtrar status" className="rounded-xl border border-white/10 bg-[#070b15] p-3 text-sm" value={filter} onChange={e => setFilter(e.target.value)}>{['Todos','Ativo','Pendente','Inativo'].map(s => <option key={s}>{s}</option>)}</select>
        <button onClick={() => void reload()} title="Atualizar equipe" className="rounded-xl border border-white/10 p-3"><RefreshCw size={16}/></button>
      </div>
      {loading ? <p className="py-10 text-center text-white/50">Carregando equipe...</p> :
        filtered.length === 0 ? <div className="py-14 text-center text-white/50"><Users className="mx-auto mb-3" size={32}/>{members.length ? 'Nenhum colaborador corresponde aos filtros.' : 'Nenhum colaborador cadastrado. Comece adicionando um membro.'}</div> :
        <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead><tr className="border-b border-white/10 text-white/50"><th className="py-3">Colaborador</th><th>Função</th><th>Status</th><th>Permissões configuradas</th><th className="text-right">Ações</th></tr></thead><tbody>{filtered.map(m => <tr key={m.id} className="border-b border-white/5"><td className="py-4"><div className="font-semibold">{m.name}</div><div className="text-xs text-white/50">{m.email}</div></td><td>{m.role}</td><td><span className="rounded-full bg-white/10 px-2 py-1 text-xs">{m.status}</span></td><td>{Array.isArray(m.permissions) ? m.permissions.length : 0} selecionadas</td><td className="text-right"><button onClick={() => openEdit(m)} title="Editar" className="rounded-lg p-2 hover:bg-white/10"><Pencil size={16}/></button><button onClick={() => void remove(m)} title="Remover" className="rounded-lg p-2 text-red-300 hover:bg-red-500/10"><Trash2 size={16}/></button></td></tr>)}</tbody></table></div>}
    </div>
    <p className="text-xs text-white/40 flex items-center gap-2"><ShieldCheck size={14}/> Os registros pertencem exclusivamente à empresa autenticada. As permissões são configurações administrativas; ainda não concedem acesso ao painel nem a operações financeiras.</p>
    {modalOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3" role="dialog" aria-modal="true" aria-label="Cadastro de colaborador">
      <form onSubmit={save} className="max-h-[90dvh] w-full max-w-lg space-y-4 overflow-y-auto rounded-2xl border border-white/15 bg-[#0e1423] p-6">
        <div className="flex items-center justify-between"><h2 className="text-xl font-bold">{editing ? 'Editar colaborador' : 'Novo colaborador'}</h2><button type="button" onClick={() => setModalOpen(false)} aria-label="Fechar"><X/></button></div>
        {error && <p className="text-sm text-red-300">{error}</p>}
        <label className="block text-sm">Nome<input required minLength={2} maxLength={140} className="mt-1 w-full rounded-lg border border-white/15 bg-[#070b15] p-3" value={form.name} onChange={e => setForm(v => ({ ...v, name: e.target.value }))}/></label>
        <label className="block text-sm">E-mail<input type="email" required disabled={!!editing} className="mt-1 w-full rounded-lg border border-white/15 bg-[#070b15] p-3 disabled:opacity-50" value={form.email} onChange={e => setForm(v => ({ ...v, email: e.target.value }))}/></label>
        <label className="block text-sm">Função<select className="mt-1 w-full rounded-lg border border-white/15 bg-[#070b15] p-3" value={form.role} onChange={e => setForm(v => ({ ...v, role: e.target.value }))}>{roles.map(role => <option key={role}>{role}</option>)}</select></label>
        <label className="block text-sm">Status<select className="mt-1 w-full rounded-lg border border-white/15 bg-[#070b15] p-3" value={form.status} onChange={e => setForm(v => ({ ...v, status: e.target.value }))}>{['Pendente','Ativo','Inativo'].map(s => <option key={s}>{s}</option>)}</select></label>
        <fieldset className="space-y-2 rounded-xl border border-white/10 p-3"><legend className="px-2 text-sm font-bold">Permissões planejadas</legend>{permissionOptions.map(p => <label key={p.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.permissions.includes(p.id)} onChange={e => setForm(v => ({ ...v, permissions: e.target.checked ? [...v.permissions, p.id] : v.permissions.filter(x => x !== p.id) }))}/>{p.label}</label>)}<p className="text-xs text-amber-200/80">As permissões são registradas, mas ainda não autorizam login ou acesso às APIs.</p></fieldset>
        <div className="flex justify-end gap-3"><button type="button" onClick={() => setModalOpen(false)} className="rounded-xl border border-white/20 px-4 py-2">Cancelar</button><button disabled={saving} className="rounded-xl bg-[#D9F22A] px-5 py-2 font-bold text-[#060A15] disabled:opacity-50">{saving ? 'Salvando...' : 'Salvar colaborador'}</button></div>
      </form>
    </div>}
  </div>;
};
