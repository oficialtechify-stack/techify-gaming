import React, { useState, useEffect } from 'react';
import { TeamMember } from '../../types/platform';
import { 
  subscribeTeamMembers, 
  createTeamMemberInFirebase, 
  deleteTeamMemberInFirebase 
} from '../../services/firestoreService';
import { 
  Users, 
  Award, 
  TrendingUp, 
  Sparkles, 
  UserPlus, 
  Shield, 
  Trash2, 
  X, 
  Check, 
  Mail, 
  Briefcase,
  UserCheck
} from 'lucide-react';

export const EquipeView: React.FC = () => {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Vendedor B2B');
  const [status, setStatus] = useState<'Ativo' | 'Pendente' | 'Inativo'>('Ativo');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsub = subscribeTeamMembers((members) => {
      setTeamMembers(members);
    });
    return () => unsub();
  }, []);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    setLoading(true);
    try {
      await createTeamMemberInFirebase({
        name: name.trim(),
        email: email.trim(),
        role,
        salesCount: 0,
        commissionGenerated: 0,
        bonus: 0,
        status
      });
      setName('');
      setEmail('');
      setIsInviteModalOpen(false);
    } catch (err: any) {
      console.error('Error adding team member:', err);
      alert(`Erro ao adicionar membro: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMember = async (id: string, memberName: string) => {
    if (!window.confirm(`Deseja remover ${memberName} da equipe?`)) return;
    try {
      await deleteTeamMemberInFirebase(id);
    } catch (err: any) {
      console.error('Error deleting member:', err);
      alert(`Erro ao remover: ${err.message}`);
    }
  };

  const totalTeamSales = teamMembers.reduce((acc, m) => acc + (m.salesCount || 0), 0);

  return (
    <div className="flex flex-col gap-6" id="leadspay-equipe-view">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-['Syne']">
            Rede de Vendas & Sub-Afiliados
          </h1>
          <p className="text-xs text-white/60 mt-1">
            Construa sua equipe comercial no Firebase e receba 5% de bônus sobre todas as plataformas vendidas pelos membros do seu time.
          </p>
        </div>

        <button 
          onClick={() => setIsInviteModalOpen(true)}
          className="bg-[#D9F22A] hover:bg-[#c8e217] text-[#060A15] font-black px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(217,242,42,0.3)] transition-all cursor-pointer flex items-center justify-center gap-2"
        >
          <UserPlus className="w-4 h-4" />
          Convidar / Cadastrar Vendedor
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#080d1a] border border-white/10 p-5 rounded-2xl">
          <span className="text-xs text-white/50 uppercase font-bold">Membros na Equipe</span>
          <div className="text-2xl font-black text-white font-['Syne'] mt-1">
            {teamMembers.length} {teamMembers.length === 1 ? 'Vendedor' : 'Vendedores'}
          </div>
          <span className="text-[11px] text-[#D9F22A] mt-1 block">
            {teamMembers.length > 0 ? 'Equipe sincronizada em tempo real' : 'Nenhum membro cadastrado ainda'}
          </span>
        </div>
        <div className="bg-[#080d1a] border border-white/10 p-5 rounded-2xl">
          <span className="text-xs text-white/50 uppercase font-bold">Vendas Fechadas pelo Time</span>
          <div className="text-2xl font-black text-white font-['Syne'] mt-1">
            {totalTeamSales} {totalTeamSales === 1 ? 'Plataforma' : 'Plataformas'}
          </div>
          <span className="text-[11px] text-white/50 mt-1 block">Volume em tempo real</span>
        </div>
        <div className="bg-[#080d1a] border border-[#D9F22A]/30 bg-[#D9F22A]/5 p-5 rounded-2xl">
          <span className="text-xs text-[#D9F22A] uppercase font-bold">Seu Bônus de Rede (5%)</span>
          <div className="text-2xl font-black text-[#D9F22A] font-['Syne'] mt-1">
            R$ 0,00
          </div>
          <span className="text-[11px] text-white/60 mt-1 block">Creditado automaticamente</span>
        </div>
      </div>

      <div className="bg-[#080d1a] border border-white/10 rounded-2xl p-5 shadow-xl">
        <h3 className="text-base font-bold text-white font-['Syne'] mb-4">
          Membros da Sua Rede Comercial ({teamMembers.length})
        </h3>

        {teamMembers.length === 0 ? (
          <div className="text-center py-12 px-4 bg-[#050811] rounded-xl border border-white/5">
            <UserCheck className="w-12 h-12 text-[#D9F22A]/40 mx-auto mb-3" />
            <h4 className="text-sm font-bold text-white">Nenhum membro cadastrado na sua equipe</h4>
            <p className="text-xs text-white/50 max-w-sm mx-auto mt-1 mb-4">
              Convide novos vendedores e afiliados para expandir sua operação e lucrar em escala.
            </p>
            <button
              onClick={() => setIsInviteModalOpen(true)}
              className="bg-[#D9F22A] hover:bg-[#c8e217] text-[#060A15] font-black px-4 py-2 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer inline-flex items-center gap-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Cadastrar Primeiro Vendedor
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-white/40 bg-[#050811] border-b border-white/10 uppercase tracking-wider">
                  <th className="py-3 px-4 font-bold">Nome & Cargo</th>
                  <th className="py-3 px-4 font-bold">Contato</th>
                  <th className="py-3 px-4 font-bold text-center">Vendas Feitas</th>
                  <th className="py-3 px-4 font-bold">Comissões Geradas</th>
                  <th className="py-3 px-4 font-bold text-[#D9F22A]">Seu Bônus (5%)</th>
                  <th className="py-3 px-4 font-bold text-center">Status</th>
                  <th className="py-3 px-4 font-bold text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {teamMembers.map((m) => (
                  <tr key={m.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-white block">{m.name}</span>
                      <span className="text-[10px] text-white/50">{m.role}</span>
                    </td>
                    <td className="py-3.5 px-4 text-white/70 font-mono text-[11px]">{m.email}</td>
                    <td className="py-3.5 px-4 text-center font-bold text-white">{m.salesCount}</td>
                    <td className="py-3.5 px-4 font-bold text-white">
                      R$ {(typeof m.commissionGenerated === 'number' ? m.commissionGenerated : 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 font-black text-[#D9F22A]">
                      R$ {(typeof m.bonus === 'number' ? m.bonus : 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        {m.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleDeleteMember(m.id, m.name)}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-white/50 hover:text-red-400 cursor-pointer transition-colors"
                        title="Remover da equipe"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Convidar / Cadastrar Vendedor */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#080d1a] border border-[#D9F22A]/40 rounded-3xl w-full max-w-md p-6 shadow-[0_0_40px_rgba(217,242,42,0.15)] relative">
            <button
              onClick={() => setIsInviteModalOpen(false)}
              className="absolute top-5 right-5 text-white/50 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-[#D9F22A]/10 border border-[#D9F22A]/30 flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-[#D9F22A]" />
              </div>
              <div>
                <h3 className="text-base font-black text-white font-['Syne']">
                  Cadastrar Novo Vendedor
                </h3>
                <p className="text-xs text-white/60">Adicione um parceiro à sua equipe comercial.</p>
              </div>
            </div>

            <form onSubmit={handleAddMember} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-white/80 block mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Lucas Pinheiro"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#050811] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#D9F22A]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-white/80 block mb-1">E-mail *</label>
                <input
                  type="email"
                  required
                  placeholder="Ex: lucas@vendas.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#050811] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#D9F22A]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-white/80 block mb-1">Cargo / Função</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-[#050811] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#D9F22A]"
                >
                  <option value="Vendedor B2B">Vendedor B2B</option>
                  <option value="Closer de Vendas">Closer de Vendas</option>
                  <option value="SDR Outbound">SDR Outbound</option>
                  <option value="Afiliado Pro">Afiliado Pro</option>
                  <option value="Gerente de Contas">Gerente de Contas</option>
                </select>
              </div>

              <div className="pt-3 border-t border-white/10 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white/70 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-[#D9F22A] hover:bg-[#c8e217] text-[#060A15] font-black px-5 py-2 rounded-xl text-xs uppercase tracking-wider transition-all"
                >
                  {loading ? 'Salvando...' : 'Adicionar Membro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
