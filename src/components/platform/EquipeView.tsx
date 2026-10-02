import React, { useState, useEffect, useCallback } from 'react';
import { TeamMember, CompanyStartup, CompanyPlan, UserAffiliation } from '../../types/platform';
import { deleteAffiliationInFirebase } from '../../services/firestoreService';
import { useAuth } from '../../context/AuthContext';
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
  UserCheck,
  UserX,
  Search,
  Copy,
  ExternalLink,
  DollarSign,
  MousePointer,
  Building2,
  Tag,
  AlertTriangle
} from 'lucide-react';

interface EquipeViewProps {
  companies?: CompanyStartup[];
  plans?: CompanyPlan[];
  affiliations?: UserAffiliation[];
  currentUserId?: string;
  onRemoveAffiliate?: (affiliationId: string, planId?: string, companyId?: string, affiliateName?: string) => Promise<void> | void;
}

export const EquipeView: React.FC<EquipeViewProps> = ({
  companies = [],
  plans = [],
  affiliations = [],
  currentUserId,
  onRemoveAffiliate
}) => {
  const { currentUser } = useAuth();
  const [activeSection, setActiveSection] = useState<'afiliados' | 'equipe_interna'>('afiliados');
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Vendedor B2B');
  const [status, setStatus] = useState<'Ativo' | 'Pendente' | 'Inativo'>('Ativo');
  const [loading, setLoading] = useState(false);
  const [searchAffiliate, setSearchAffiliate] = useState('');
  const [selectedPlanFilter, setSelectedPlanFilter] = useState('all');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [removingAffiliateModal, setRemovingAffiliateModal] = useState<UserAffiliation | null>(null);
  const [teamError, setTeamError] = useState('');
  const [teamNotice, setTeamNotice] = useState('');
  const [teamLoading, setTeamLoading] = useState(true);

  const loadTeamMembers = useCallback(async () => {
    if (!currentUser) {
      setTeamMembers([]);
      setTeamLoading(false);
      return;
    }

    setTeamLoading(true);
    setTeamError('');
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch('/api/company/team', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Não foi possível carregar a equipe.');
      setTeamMembers(Array.isArray(data.members) ? data.members : []);
    } catch (error) {
      setTeamMembers([]);
      setTeamError(error instanceof Error ? error.message : 'Não foi possível carregar a equipe.');
    } finally {
      setTeamLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    void loadTeamMembers();
  }, [loadTeamMembers]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    if (!currentUser) return;
    setLoading(true);
    setTeamError('');
    setTeamNotice('');
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch('/api/company/team', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'create',
          name: name.trim(),
          email: email.trim(),
          role,
          status,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.member) {
        throw new Error(data.error || 'Não foi possível adicionar o membro.');
      }
      setTeamMembers((current) => [data.member, ...current.filter((item) => item.id !== data.member.id)]);
      setName('');
      setEmail('');
      setIsInviteModalOpen(false);
      setTeamNotice('Membro cadastrado na equipe desta empresa.');
    } catch (err: any) {
      console.error('Error adding team member:', err);
      setTeamError(err?.message || 'Não foi possível adicionar o membro.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMember = async (id: string, memberName: string) => {
    if (!window.confirm(`Deseja remover ${memberName} da equipe?`)) return;
    if (!currentUser) return;
    setTeamError('');
    setTeamNotice('');
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch('/api/company/team', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'delete', memberId: id }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Não foi possível remover o membro.');
      setTeamMembers((current) => current.filter((member) => member.id !== id));
      setTeamNotice(`${memberName} foi removido da equipe.`);
    } catch (err: any) {
      console.error('Error deleting member:', err);
      setTeamError(err?.message || 'Não foi possível remover o membro.');
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  // Filtra as afiliações para mostrar as vinculadas às empresas/produtos da empresa atual
  const companyIds = companies.map(c => c.id);
  const companyPlanIds = plans.map(p => p.id);

  const relevantAffiliations = affiliations.filter(aff => {
    if (companies.length === 0 && plans.length === 0) return true;
    const matchCompany = aff.companyId && companyIds.includes(aff.companyId);
    const matchPlan = (aff.planId && companyPlanIds.includes(aff.planId)) || 
                      (aff.plan_id && companyPlanIds.includes(aff.plan_id));
    return matchCompany || matchPlan;
  });

  const filteredAffiliations = relevantAffiliations.filter(aff => {
    const affName = (aff.userName || aff.affiliateName || '').toLowerCase();
    const affEmail = (aff.userEmail || '').toLowerCase();
    const affCode = (aff.affiliateCode || aff.affiliate_code || '').toLowerCase();
    const planName = (aff.planName || aff.platformName || '').toLowerCase();
    const term = searchAffiliate.toLowerCase();

    const matchesSearch = !term || affName.includes(term) || affEmail.includes(term) || affCode.includes(term) || planName.includes(term);
    const planId = aff.planId || aff.plan_id;
    const matchesPlan = selectedPlanFilter === 'all' || planId === selectedPlanFilter;

    return matchesSearch && matchesPlan;
  });

  const totalAffiliates = relevantAffiliations.length;
  const totalAffiliateSales = relevantAffiliations.reduce((acc, a) => acc + (a.salesCount || 0), 0);
  const totalAffiliateClicks = relevantAffiliations.reduce((acc, a) => acc + (a.clicks || a.clicksCount || 0), 0);
  const totalCommissionPaid = relevantAffiliations.reduce((acc, a) => acc + (a.totalEarned || a.totalCommissionEarned || 0), 0);

  const totalTeamSales = teamMembers.reduce((acc, m) => acc + (m.salesCount || 0), 0);

  const handleConfirmRemoveAffiliate = async () => {
    if (!removingAffiliateModal) return;
    const aff = removingAffiliateModal;
    try {
      if (onRemoveAffiliate) {
        await onRemoveAffiliate(aff.id, aff.planId || aff.plan_id, aff.companyId, aff.userName || aff.affiliateName);
      } else {
        await deleteAffiliationInFirebase(aff.id, aff.planId || aff.plan_id, aff.companyId);
      }
      setRemovingAffiliateModal(null);
    } catch (err: any) {
      console.error('Erro ao remover afiliado pela empresa:', err);
      alert(`Erro ao desvincular afiliado: ${err.message}`);
    }
  };

  return (
    <div className="flex flex-col gap-6" id="leadspay-equipe-view">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#D9F22A] bg-[#D9F22A]/10 px-3 py-1 rounded-full border border-[#D9F22A]/20 inline-block mb-2">
            Gestão Comercial da Empresa
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-['Syne']">
            Afiliados & Equipe de Vendas
          </h1>
          <p className="text-xs text-white/60 mt-1 max-w-2xl">
            Acompanhe os afiliados vinculados aos produtos desta empresa, remova vínculos e organize os vendedores internos do mesmo tenant.
          </p>
        </div>

        {activeSection === 'equipe_interna' && (
          <button 
            onClick={() => setIsInviteModalOpen(true)}
            className="bg-[#D9F22A] hover:bg-[#c8e217] text-[#060A15] font-black px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(217,242,42,0.3)] transition-all cursor-pointer flex items-center justify-center gap-2 flex-shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            Cadastrar Vendedor
          </button>
        )}
      </div>

      {(teamError || teamNotice) && (
        <div className={`rounded-xl border px-4 py-3 text-xs ${
          teamError
            ? 'border-red-500/20 bg-red-500/10 text-red-300'
            : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
        }`}>
          {teamError || teamNotice}
        </div>
      )}

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2">
        <button
          onClick={() => setActiveSection('afiliados')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSection === 'afiliados'
              ? 'bg-[#D9F22A] text-[#060A15] shadow-lg shadow-[#D9F22A]/20'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Afiliados dos Seus Produtos</span>
          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
            activeSection === 'afiliados' ? 'bg-[#060A15]/20 text-[#060A15]' : 'bg-white/10 text-white'
          }`}>
            {totalAffiliates}
          </span>
        </button>

        <button
          onClick={() => setActiveSection('equipe_interna')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSection === 'equipe_interna'
              ? 'bg-[#D9F22A] text-[#060A15] shadow-lg shadow-[#D9F22A]/20'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          <span>Vendedores Internos & Sub-Afiliados</span>
          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
            activeSection === 'equipe_interna' ? 'bg-[#060A15]/20 text-[#060A15]' : 'bg-white/10 text-white'
          }`}>
            {teamMembers.length}
          </span>
        </button>
      </div>

      {/* SECTION 1: AFILIADOS OFICIAIS */}
      {activeSection === 'afiliados' && (
        <div className="space-y-6">
          {/* Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#080d1a] border border-white/10 p-5 rounded-2xl">
              <div className="flex items-center justify-between text-white/50 mb-2">
                <span className="text-xs uppercase font-bold">Afiliados Ativos</span>
                <Users className="w-4 h-4 text-[#D9F22A]" />
              </div>
              <div className="text-2xl font-black text-white font-['Syne']">
                {totalAffiliates}
              </div>
              <span className="text-[11px] text-emerald-400 mt-1 block font-bold">
                Divulgando seus produtos
              </span>
            </div>

            <div className="bg-[#080d1a] border border-white/10 p-5 rounded-2xl">
              <div className="flex items-center justify-between text-white/50 mb-2">
                <span className="text-xs uppercase font-bold">Cliques Gerados</span>
                <MousePointer className="w-4 h-4 text-[#D9F22A]" />
              </div>
              <div className="text-2xl font-black text-white font-['Syne']">
                {totalAffiliateClicks}
              </div>
              <span className="text-[11px] text-white/50 mt-1 block">
                Tráfego enviado aos checkouts
              </span>
            </div>

            <div className="bg-[#080d1a] border border-white/10 p-5 rounded-2xl">
              <div className="flex items-center justify-between text-white/50 mb-2">
                <span className="text-xs uppercase font-bold">Vendas Fechadas</span>
                <Award className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-emerald-400 font-['Syne']">
                {totalAffiliateSales}
              </div>
              <span className="text-[11px] text-white/50 mt-1 block">
                Conversões via link de afiliado
              </span>
            </div>

            <div className="bg-[#080d1a] border border-[#D9F22A]/30 bg-[#D9F22A]/5 p-5 rounded-2xl">
              <div className="flex items-center justify-between text-[#D9F22A] mb-2">
                <span className="text-xs uppercase font-bold">Comissões Pagas</span>
                <DollarSign className="w-4 h-4" />
              </div>
              <div className="text-2xl font-black text-[#D9F22A] font-['Syne']">
                R$ {totalCommissionPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[11px] text-white/60 mt-1 block">
                Ganhos distribuídos aos parceiros
              </span>
            </div>
          </div>

          {/* Filters & Search */}
          <div className="bg-[#080d1a] border border-white/10 p-4 rounded-2xl flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchAffiliate}
                onChange={(e) => setSearchAffiliate(e.target.value)}
                placeholder="Buscar afiliado por nome, e-mail, código ou produto..."
                className="w-full bg-[#050811] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#D9F22A]"
              />
            </div>

            {plans.length > 0 && (
              <div className="w-full sm:w-64">
                <select
                  value={selectedPlanFilter}
                  onChange={(e) => setSelectedPlanFilter(e.target.value)}
                  className="w-full bg-[#050811] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#D9F22A]"
                >
                  <option value="all">Todos os Produtos</option>
                  {plans.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Affiliates Table / List */}
          <div className="bg-[#080d1a] border border-white/10 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-white font-['Syne']">
                  Afiliados Vinculados aos Seus Produtos ({filteredAffiliations.length})
                </h3>
                <p className="text-xs text-white/50 mt-0.5">
                  Apenas a sua empresa possui autorização para remover ou desvincular um afiliado.
                </p>
              </div>
            </div>

            {filteredAffiliations.length === 0 ? (
              <div className="text-center py-12 px-4 bg-[#050811] rounded-xl border border-white/5">
                <Users className="w-12 h-12 text-[#D9F22A]/40 mx-auto mb-3" />
                <h4 className="text-sm font-bold text-white">Nenhum afiliado conectado ainda</h4>
                <p className="text-xs text-white/50 max-w-md mx-auto mt-1">
                  Assim que os usuários clicarem em <strong>"Afiliar-se com 1 Clique"</strong> nos seus produtos na Vitrine, eles aparecerão aqui instantaneamente.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="text-white/40 bg-[#050811] border-b border-white/10 uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4 font-bold">Afiliado</th>
                      <th className="py-3 px-4 font-bold">Código Exclusivo</th>
                      <th className="py-3 px-4 font-bold">Produto Vinculado</th>
                      <th className="py-3 px-4 font-bold text-center">Cliques</th>
                      <th className="py-3 px-4 font-bold text-center">Vendas</th>
                      <th className="py-3 px-4 font-bold">Comissão Paga</th>
                      <th className="py-3 px-4 font-bold text-center">Data</th>
                      <th className="py-3 px-4 font-bold text-right">Ação Exclusiva</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredAffiliations.map((aff) => {
                      const affName = aff.userName || aff.affiliateName || 'Afiliado LeadsPay';
                      const affCode = aff.affiliateCode || aff.affiliate_code || '---';
                      const planName = aff.planName || aff.platformName || 'Produto Oficial';
                      const clicksCount = aff.clicks ?? aff.clicksCount ?? 0;
                      const salesCount = aff.salesCount ?? 0;
                      const totalEarned = aff.totalEarned ?? aff.totalCommissionEarned ?? 0;
                      const dateFormatted = aff.createdAt ? new Date(aff.createdAt).toLocaleDateString('pt-BR') : 'Recente';

                      return (
                        <tr key={aff.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-[#D9F22A]/15 border border-[#D9F22A]/30 flex items-center justify-center text-[#D9F22A] font-bold text-xs flex-shrink-0">
                                {affName.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <span className="font-bold text-white block truncate max-w-[180px]">{affName}</span>
                                <span className="text-[10px] text-white/50 block truncate max-w-[180px]">{aff.userEmail || 'afiliado@leadspay.com'}</span>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-[11px] font-bold text-[#D9F22A] bg-[#D9F22A]/10 border border-[#D9F22A]/20 px-2 py-0.5 rounded">
                                {affCode}
                              </span>
                              <button
                                onClick={() => handleCopy(affCode, aff.id)}
                                className="text-white/40 hover:text-white p-1 transition-colors cursor-pointer"
                                title="Copiar código do afiliado"
                              >
                                {copiedCode === aff.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="font-bold text-white block">{planName}</span>
                            <span className="text-[10px] text-white/40">{aff.companyName || 'Sua Startup'}</span>
                          </td>

                          <td className="py-3.5 px-4 text-center font-bold text-white/80">
                            {clicksCount}
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                              {salesCount}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 font-black text-emerald-400">
                            R$ {totalEarned.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>

                          <td className="py-3.5 px-4 text-center text-white/50 text-[11px]">
                            {dateFormatted}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => setRemovingAffiliateModal(aff)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 hover:border-red-500/40 text-[11px] font-bold transition-all cursor-pointer"
                              title="Remover este afiliado (Ação exclusiva da empresa)"
                            >
                              <UserX className="w-3.5 h-3.5" />
                              <span>Remover Afiliado</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION 2: EQUIPE INTERNA & SUB-AFILIADOS */}
      {activeSection === 'equipe_interna' && (
        <div className="space-y-6">
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

            {teamLoading ? (
            <div className="rounded-2xl border border-white/10 bg-[#080d1a] p-10 text-center text-xs text-white/50">
              Carregando equipe desta empresa...
            </div>
          ) : teamMembers.length === 0 ? (
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
        </div>
      )}

      {/* Modal Convidar / Cadastrar Vendedor */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#080d1a] border border-[#D9F22A]/40 rounded-3xl w-full max-w-md p-6 shadow-[0_0_40px_rgba(217,242,42,0.15)] relative">
            <button
              onClick={() => setIsInviteModalOpen(false)}
              className="absolute top-5 right-5 text-white/50 hover:text-white cursor-pointer"
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
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white/70 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-[#D9F22A] hover:bg-[#c8e217] text-[#060A15] font-black px-5 py-2 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer"
                >
                  {loading ? 'Salvando...' : 'Adicionar Membro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal da Empresa: Remover Afiliado */}
      {removingAffiliateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-[#080d1a] border border-red-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col gap-4">
            <button
              onClick={() => setRemovingAffiliateModal(null)}
              className="absolute top-5 right-5 text-white/50 hover:text-white cursor-pointer text-sm"
            >
              ✕
            </button>

            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-red-400">
                Ação Exclusiva da Empresa
              </span>
              <h3 className="text-xl font-black text-white font-['Syne'] mt-1">
                Remover Afiliado?
              </h3>
              <p className="text-xs text-white/70 mt-2 leading-relaxed">
                Tem certeza que deseja desvincular o afiliado <strong className="text-white">{removingAffiliateModal.userName || removingAffiliateModal.affiliateName || 'Afiliado'}</strong> do produto <strong className="text-white">{removingAffiliateModal.planName || removingAffiliateModal.platformName}</strong>?
              </p>
            </div>

            <div className="bg-[#050811] border border-white/10 rounded-2xl p-3.5 space-y-1.5 text-xs text-white/60">
              <div className="flex items-center justify-between text-[11px]">
                <span>Código do Afiliado:</span>
                <span className="font-mono text-[#D9F22A] font-bold">{removingAffiliateModal.affiliateCode || removingAffiliateModal.affiliate_code}</span>
              </div>
              <p className="text-[11px] text-amber-300/80">
                • O link exclusivo do afiliado deixará de funcionar imediatamente.
              </p>
              <p className="text-[11px] text-white/50">
                • Ele não receberá comissões por novas compras deste produto.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRemovingAffiliateModal(null)}
                className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmRemoveAffiliate}
                className="w-full bg-red-500 hover:bg-red-600 text-white font-black py-2.5 rounded-xl text-xs uppercase tracking-wider transition-colors cursor-pointer shadow-lg shadow-red-500/20"
              >
                Confirmar Remoção
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
