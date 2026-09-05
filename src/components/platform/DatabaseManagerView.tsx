import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { 
  COLLECTIONS, 
  clearAllFirestoreData,
  subscribeVerifications,
  subscribeCompanies,
  approveVerificationInFirebase,
  rejectVerificationInFirebase,
  approveCompanyInFirebase,
  rejectCompanyInFirebase,
  deleteCompanyInFirebase
} from '../../services/firestoreService';
import { 
  Database, 
  RefreshCw, 
  CheckCircle2, 
  Trash2, 
  Layers, 
  PlusCircle, 
  Search, 
  ShieldCheck, 
  Server,
  Zap,
  Copy,
  AlertTriangle,
  UserCheck,
  UserX,
  Clock,
  Check,
  X,
  MessageCircle,
  ExternalLink,
  Lock,
  Mail,
  Phone,
  MapPin,
  FileText,
  Building2,
  Globe,
  Tag,
  Send
} from 'lucide-react';
import { VerificationRequest, CompanyStartup } from '../../types/platform';
import { useAuth } from '../../context/AuthContext';
import firebaseConfig from '../../../firebase-applet-config.json';

const SUPERADMIN_EMAIL = 'rickmarketing81@gmail.com';

export const DatabaseManagerView: React.FC = () => {
  const { currentUser, userProfile } = useAuth();
  const [activeCollection, setActiveCollection] = useState<string>(COLLECTIONS.VERIFICATIONS);

  const isSuperAdmin = Boolean(
    (currentUser?.email && currentUser.email.toLowerCase() === SUPERADMIN_EMAIL) ||
    (userProfile?.email && userProfile.email.toLowerCase() === SUPERADMIN_EMAIL)
  );

  const [documents, setDocuments] = useState<any[]>([]);
  const [verifications, setVerifications] = useState<VerificationRequest[]>([]);
  const [companies, setCompanies] = useState<CompanyStartup[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Subscribe to realtime verification requests & companies
  useEffect(() => {
    if (!isSuperAdmin) return;
    const unsubVerifs = subscribeVerifications((reqs) => {
      setVerifications(reqs);
    });
    const unsubComps = subscribeCompanies((comps) => {
      setCompanies(comps);
    });
    return () => {
      unsubVerifs();
      unsubComps();
    };
  }, [isSuperAdmin]);

  if (!isSuperAdmin) {
    return (
      <div className="min-h-[500px] flex items-center justify-center p-6">
        <div className="bg-[#080d1a] border border-red-500/30 rounded-3xl p-8 sm:p-10 max-w-lg w-full text-center shadow-2xl flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mb-2">
            <Lock className="w-8 h-8" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-red-400 bg-red-500/10 px-3 py-1 rounded-full border border-red-500/20">
            Acesso Restrito
          </span>
          <h2 className="text-2xl font-black text-white font-['Syne']">
            Área Exclusiva do Administrador
          </h2>
          <p className="text-xs text-white/60 leading-relaxed">
            O painel de validação e gerenciamento do banco de dados Cloud é protegido e acessível apenas pelo administrador mestre da plataforma:
          </p>
          <div className="bg-[#050811] border border-white/10 rounded-xl px-4 py-2.5 font-mono text-xs text-[#D9F22A] font-bold">
            rickmarketing81@gmail.com
          </div>
          <p className="text-[11px] text-white/40 mt-1">
            Seu usuário atual ({currentUser?.email || 'Visitante'}) não possui privilégios de superadministrador.
          </p>
        </div>
      </div>
    );
  }

  const fetchCollectionDocs = async (collName: string) => {
    setLoading(true);
    try {
      const q = collection(db, collName);
      const snap = await getDocs(q);
      const list: any[] = [];
      snap.forEach((d) => {
        list.push({ _id: d.id, ...d.data() });
      });
      setDocuments(list);
    } catch (err: any) {
      console.error('Error fetching collection:', err);
      setStatusMessage(`Erro ao buscar dados: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCollectionDocs(activeCollection);
  }, [activeCollection]);

  const handleApproveUser = async (userId: string, userName: string) => {
    setProcessingId(userId);
    try {
      await approveVerificationInFirebase(userId);
      setStatusMessage(`Usuário "${userName}" aprovado com sucesso! Selo de Verificado concedido.`);
      setTimeout(() => setStatusMessage(''), 5000);
      if (activeCollection === COLLECTIONS.VERIFICATIONS || activeCollection === COLLECTIONS.PROFILES) {
        await fetchCollectionDocs(activeCollection);
      }
    } catch (err: any) {
      alert(`Erro ao aprovar usuário: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectUser = async (userId: string, userName: string) => {
    const reason = prompt(`Motivo da recusa para o usuário "${userName}":`, 'Dados cadastrais necessitam de ajuste ou confirmação.');
    if (reason === null) return; // user cancelled

    setProcessingId(userId);
    try {
      await rejectVerificationInFirebase(userId, reason);
      setStatusMessage(`Validação do usuário "${userName}" recusada com motivo registrado.`);
      setTimeout(() => setStatusMessage(''), 5000);
      if (activeCollection === COLLECTIONS.VERIFICATIONS || activeCollection === COLLECTIONS.PROFILES) {
        await fetchCollectionDocs(activeCollection);
      }
    } catch (err: any) {
      alert(`Erro ao recusar usuário: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleApproveCompany = async (companyId: string, companyName: string) => {
    setProcessingId(companyId);
    try {
      await approveCompanyInFirebase(companyId);
      setStatusMessage(`Empresa "${companyName}" aprovada com sucesso! Painel e catálogo liberados.`);
      setTimeout(() => setStatusMessage(''), 5000);
      if (activeCollection === COLLECTIONS.COMPANIES) {
        await fetchCollectionDocs(activeCollection);
      }
    } catch (err: any) {
      alert(`Erro ao aprovar empresa: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectCompany = async (companyId: string, companyName: string) => {
    const reason = prompt(`Motivo da recusa para a empresa "${companyName}":`, 'Dados cadastrais ou documentação da empresa necessitam de ajuste.');
    if (reason === null) return;

    setProcessingId(companyId);
    try {
      await rejectCompanyInFirebase(companyId, reason);
      setStatusMessage(`Empresa "${companyName}" recusada com motivo registrado.`);
      setTimeout(() => setStatusMessage(''), 5000);
      if (activeCollection === COLLECTIONS.COMPANIES) {
        await fetchCollectionDocs(activeCollection);
      }
    } catch (err: any) {
      alert(`Erro ao recusar empresa: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleWipeAllData = async () => {
    if (!window.confirm('ATENÇÃO: Deseja realmente zerar todos os dados do banco em nuvem (empresas, planos, vendas, saques, afiliados)? Esta ação deixará o sistema limpo.')) {
      return;
    }

    setLoading(true);
    const res = await clearAllFirestoreData();
    if (res.success) {
      setStatusMessage('Banco de dados zerado e sincronizado com sucesso!');
      await fetchCollectionDocs(activeCollection);
    } else {
      setStatusMessage(`Erro ao limpar: ${res.error}`);
    }
    setTimeout(() => setStatusMessage(''), 4000);
    setLoading(false);
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir o documento ${docId}?`)) return;
    try {
      await deleteDoc(doc(db, activeCollection, docId));
      setDocuments((prev) => prev.filter((d) => d._id !== docId));
      setStatusMessage(`Documento ${docId} removido com sucesso.`);
      setTimeout(() => setStatusMessage(''), 3000);
    } catch (err: any) {
      alert(`Erro ao deletar: ${err.message}`);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredVerifications = verifications.filter((v) => {
    if (statusFilter !== 'all' && v.status !== statusFilter) return false;
    if (searchTerm) {
      const matchName = (v.name || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchEmail = (v.email || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchCpf = (v.cpf || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchCity = (v.city || '').toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchName && !matchEmail && !matchCpf && !matchCity) return false;
    }
    return true;
  });

  const filteredCompanies = companies.filter((c) => {
    const compStatus = c.status || (c.verified ? 'approved' : 'pending');
    if (statusFilter !== 'all' && compStatus !== statusFilter) return false;
    if (searchTerm) {
      const matchName = (c.name || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchEmail = (c.email || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchDoc = (c.cnpj || c.cpf || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchCat = (c.category || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchDesc = (c.description || '').toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchName && !matchEmail && !matchDoc && !matchCat && !matchDesc) return false;
    }
    return true;
  });

  const filteredDocs = documents.filter((docItem) => {
    if (!searchTerm) return true;
    const str = JSON.stringify(docItem).toLowerCase();
    return str.includes(searchTerm.toLowerCase());
  });

  const collectionTabs = [
    { 
      key: COLLECTIONS.VERIFICATIONS, 
      label: '🛡️ Validações de Usuários (KYC)',
      badge: verifications.filter(v => v.status === 'pending').length || undefined 
    },
    { 
      key: COLLECTIONS.COMPANIES, 
      label: '🏢 Validações de Empresas (Startups)',
      badge: companies.filter(c => c.status === 'pending').length || undefined
    },
    { key: COLLECTIONS.PROFILES, label: 'Perfil de Usuário' },
    { key: COLLECTIONS.PLANS, label: 'Planos & Comissões' },
    { key: COLLECTIONS.AFFILIATIONS, label: 'Afiliações de Usuários' },
    { key: COLLECTIONS.SALES, label: 'Vendas & Comissões' },
    { key: COLLECTIONS.WITHDRAWALS, label: 'Saques PIX' },
    { key: COLLECTIONS.TEAM, label: 'Equipe de Vendedores' }
  ];

  return (
    <div className="flex flex-col gap-6" id="leadspay-database-view">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-bold tracking-widest text-[#D9F22A] uppercase">
              Painel Administrativo & Controle em Nuvem
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-['Syne'] mt-1">
            Validação de Usuários & Banco de Dados
          </h1>
          <p className="text-xs text-white/60 mt-1">
            Aprovação de cadastros de afiliados para liberação de afiliações e gerenciamento de coleções Firestore.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchCollectionDocs(activeCollection)}
            disabled={loading}
            className="bg-white/10 hover:bg-white/15 text-white font-bold px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>

          <button
            onClick={handleWipeAllData}
            disabled={loading}
            className="bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 font-bold px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Limpar / Zerar Banco
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          {statusMessage}
        </div>
      )}

      {/* Cloud Cluster Info Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#080d1a] border border-white/10 p-4 rounded-xl">
          <span className="text-[10px] text-white/50 uppercase font-bold block">Cluster de Dados</span>
          <span className="text-xs font-mono font-bold text-white mt-1 block truncate">
            {firebaseConfig.projectId}
          </span>
        </div>
        <div className="bg-[#080d1a] border border-white/10 p-4 rounded-xl">
          <span className="text-[10px] text-white/50 uppercase font-bold block">Validações Pendentes</span>
          <span className="text-xs font-mono font-bold text-amber-400 mt-1 block">
            {verifications.filter(v => v.status === 'pending').length} cadastros aguardando
          </span>
        </div>
        <div className="bg-[#080d1a] border border-white/10 p-4 rounded-xl">
          <span className="text-[10px] text-white/50 uppercase font-bold block">Usuários Verificados</span>
          <span className="text-xs font-mono font-bold text-emerald-400 mt-1 block">
            {verifications.filter(v => v.status === 'approved').length} aprovados
          </span>
        </div>
      </div>

      {/* Collection Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-white/10 scrollbar-none">
        {collectionTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveCollection(tab.key)}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 ${
              activeCollection === tab.key
                ? 'bg-[#D9F22A] text-[#060A15] shadow-[0_0_20px_rgba(217,242,42,0.3)] font-black'
                : 'bg-[#080d1a] text-white/70 hover:text-white hover:bg-white/5 border border-white/10'
            }`}
          >
            <span>{tab.label}</span>
            {tab.badge !== undefined && tab.badge > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                activeCollection === tab.key ? 'bg-black text-[#D9F22A]' : 'bg-amber-400 text-black'
              }`}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#080d1a] p-4 rounded-2xl border border-white/10">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome, email, CPF ou cidade..."
            className="w-full bg-[#050811] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#D9F22A]"
          />
        </div>

        {activeCollection === COLLECTIONS.VERIFICATIONS && (
          <div className="flex items-center gap-1.5 bg-[#050811] p-1 rounded-xl border border-white/10">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'all' ? 'bg-[#D9F22A] text-[#060A15]' : 'text-white/60 hover:text-white'
              }`}
            >
              Todos ({verifications.length})
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'pending' ? 'bg-amber-400 text-[#060A15]' : 'text-amber-400/80 hover:text-amber-400'
              }`}
            >
              <Clock className="w-3 h-3" />
              Pendentes ({verifications.filter(v => v.status === 'pending').length})
            </button>
            <button
              onClick={() => setStatusFilter('approved')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'approved' ? 'bg-emerald-500 text-white' : 'text-emerald-400/80 hover:text-emerald-400'
              }`}
            >
              <ShieldCheck className="w-3 h-3" />
              Aprovados ({verifications.filter(v => v.status === 'approved').length})
            </button>
          </div>
        )}

        {activeCollection === COLLECTIONS.COMPANIES && (
          <div className="flex items-center gap-1.5 bg-[#050811] p-1 rounded-xl border border-white/10">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'all' ? 'bg-[#D9F22A] text-[#060A15]' : 'text-white/60 hover:text-white'
              }`}
            >
              Todas ({companies.length})
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'pending' ? 'bg-amber-400 text-[#060A15]' : 'text-amber-400/80 hover:text-amber-400'
              }`}
            >
              <Clock className="w-3 h-3" />
              Pendentes ({companies.filter(c => (c.status || (!c.verified ? 'pending' : 'approved')) === 'pending').length})
            </button>
            <button
              onClick={() => setStatusFilter('approved')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'approved' ? 'bg-emerald-500 text-white' : 'text-emerald-400/80 hover:text-emerald-400'
              }`}
            >
              <Building2 className="w-3 h-3" />
              Aprovadas ({companies.filter(c => (c.status || (c.verified ? 'approved' : 'pending')) === 'approved').length})
            </button>
          </div>
        )}
      </div>

      {/* ================= SPECIAL VIEW FOR KYC VERIFICATION REQUESTS ================= */}
      {activeCollection === COLLECTIONS.VERIFICATIONS ? (
        <div className="flex flex-col gap-4">
          {filteredVerifications.length === 0 ? (
            <div className="py-16 text-center text-white/50 text-xs bg-[#080d1a] border border-white/10 rounded-2xl p-8 flex flex-col items-center justify-center">
              <ShieldCheck className="w-10 h-10 text-white/20 mb-3" />
              <p className="font-bold text-white/80 text-sm">Nenhuma solicitação de validação encontrada.</p>
              <p className="text-white/40 mt-1 max-w-md">
                Quando os usuários preencherem seus dados na aba 'Meu Perfil' e clicarem em 'Enviar para Validação', os cadastros aparecerão aqui para sua aprovação.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredVerifications.map((req) => (
                <div
                  key={req.id}
                  className={`bg-[#080d1a] border rounded-2xl p-6 shadow-xl flex flex-col justify-between transition-all ${
                    req.status === 'pending'
                      ? 'border-amber-500/40 hover:border-amber-500/70 shadow-[0_0_25px_rgba(245,158,11,0.08)]'
                      : req.status === 'approved'
                        ? 'border-emerald-500/30 hover:border-emerald-500/50'
                        : 'border-rose-500/30 hover:border-rose-500/50'
                  }`}
                >
                  <div>
                    {/* User Header */}
                    <div className="flex items-start justify-between gap-4 pb-4 border-b border-white/10 mb-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={req.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'}
                          alt={req.name}
                          className="w-12 h-12 rounded-full object-cover border-2 border-white/20"
                        />
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-base font-bold text-white font-['Syne']">
                              {req.name || 'Usuário Sem Nome'}
                            </h3>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                              req.roleType === 'empresa'
                                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                                : 'bg-[#D9F22A]/20 text-[#D9F22A] border border-[#D9F22A]/40'
                            }`}>
                              {req.roleType === 'empresa' ? 'Empresa / Produtor' : 'Afiliado'}
                            </span>
                            {req.status === 'approved' && (
                              <span className="p-0.5 rounded-full bg-emerald-500 text-black" title="Selo Verificado">
                                <Check className="w-3 h-3 stroke-[3]" />
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-white/50">{req.email}</span>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div>
                        {req.status === 'pending' ? (
                          <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1.5 shadow-sm">
                            <Clock className="w-3 h-3" />
                            Pendente de Análise
                          </span>
                        ) : req.status === 'approved' ? (
                          <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5 shadow-sm">
                            <ShieldCheck className="w-3 h-3" />
                            Aprovado & Verificado
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1.5 shadow-sm">
                            <X className="w-3 h-3" />
                            Recusado
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Detailed User Data */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      {req.roleType === 'empresa' && (
                        <div className="bg-indigo-950/30 border border-indigo-500/30 p-3 rounded-xl sm:col-span-2 space-y-1.5">
                          <span className="text-[10px] font-bold text-indigo-300 uppercase flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5" /> Dados da Empresa / Startup
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-white/40 text-[10px] block">Razão Social / Nome Fantasia:</span>
                              <span className="text-white font-bold">{req.companyLegalName || req.companyName || 'Não informado'}</span>
                            </div>
                            <div>
                              <span className="text-white/40 text-[10px] block">CNPJ / Inscrição:</span>
                              <span className="text-white font-mono font-bold">{req.companyCnpj || 'Não informado'}</span>
                            </div>
                            {req.companyCategory && (
                              <div>
                                <span className="text-white/40 text-[10px] block">Segmento:</span>
                                <span className="text-[#D9F22A] font-bold">{req.companyCategory}</span>
                              </div>
                            )}
                            {req.companyWebsite && (
                              <div>
                                <span className="text-white/40 text-[10px] block">Website / Landing:</span>
                                <span className="text-blue-300 truncate block">{req.companyWebsite}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="bg-[#050811] p-3 rounded-xl border border-white/5">
                        <span className="text-[10px] font-bold text-white/40 uppercase block">CPF do Responsável</span>
                        <span className="font-mono font-bold text-white mt-0.5 block">{req.cpf || 'Não informado'}</span>
                      </div>

                      <div className="bg-[#050811] p-3 rounded-xl border border-white/5 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-bold text-white/40 uppercase block">WhatsApp / Celular</span>
                          <span className="font-mono font-bold text-white mt-0.5 block">{req.phone || 'Não informado'}</span>
                        </div>
                        {req.phone && (
                          <a
                            href={`https://api.whatsapp.com/send?phone=${req.phone.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
                            title="Conversar no WhatsApp"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </a>
                        )}
                      </div>

                      <div className="bg-[#050811] p-3 rounded-xl border border-white/5 sm:col-span-2">
                        <span className="text-[10px] font-bold text-white/40 uppercase block">Endereço Completo</span>
                        <span className="text-white/90 font-medium mt-0.5 block">
                          {req.address ? `${req.address} - ` : ''}{req.city ? `${req.city}/${req.state} - ` : ''}CEP: {req.cep || 'N/A'} ({req.country || 'Brasil'})
                        </span>
                      </div>

                      <div className="bg-[#050811] p-3 rounded-xl border border-white/5 sm:col-span-2 flex items-center justify-between text-[11px] text-white/40">
                        <span>Enviado em: {new Date(req.submittedAt).toLocaleString('pt-BR')}</span>
                        <span className="font-mono">User ID: {req.userId || req.id}</span>
                      </div>

                      {req.rejectionReason && (
                        <div className="bg-rose-950/40 border border-rose-500/30 p-3 rounded-xl sm:col-span-2 text-rose-300 text-xs">
                          <strong>Motivo da Recusa:</strong> {req.rejectionReason}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Controls for Admin */}
                  <div className="mt-5 pt-4 border-t border-white/10 flex flex-wrap items-center justify-end gap-3">
                    <button
                      onClick={() => handleRejectUser(req.userId || req.id, req.name)}
                      disabled={processingId === (req.userId || req.id)}
                      className="px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <X className="w-3.5 h-3.5" />
                      Recusar / Solicitar Ajuste
                    </button>

                    <button
                      onClick={() => handleApproveUser(req.userId || req.id, req.name)}
                      disabled={processingId === (req.userId || req.id)}
                      className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-black font-black text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
                    >
                      {processingId === (req.userId || req.id) ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <ShieldCheck className="w-4 h-4" />
                      )}
                      <span>Aprovar & Conceder Selo Verificado</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : activeCollection === COLLECTIONS.COMPANIES ? (
        /* ================= SPECIAL VIEW FOR COMPANY APPROVALS ================= */
        <div className="flex flex-col gap-4">
          {filteredCompanies.length === 0 ? (
            <div className="py-16 text-center text-white/50 text-xs bg-[#080d1a] border border-white/10 rounded-2xl p-8 flex flex-col items-center justify-center">
              <Building2 className="w-10 h-10 text-white/20 mb-3" />
              <p className="font-bold text-white/80 text-sm">Nenhuma empresa encontrada nesta categoria.</p>
              <p className="text-white/40 mt-1 max-w-md">
                Quando os usuários cadastrarem suas startups na plataforma, as solicitações aparecerão aqui com todos os dados (CNPJ/CPF, WhatsApp, email) para aprovação do Administrador.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {filteredCompanies.map((comp) => {
                const compStatus = comp.status || (comp.verified ? 'approved' : 'pending');
                const isPending = compStatus === 'pending';
                const isApproved = compStatus === 'approved' || (comp.verified && compStatus !== 'rejected');
                const isRejected = compStatus === 'rejected';

                return (
                  <div
                    key={comp.id}
                    className={`bg-[#080d1a] border rounded-2xl p-6 shadow-xl flex flex-col justify-between transition-all ${
                      isPending
                        ? 'border-amber-500/40 hover:border-amber-500/70 shadow-[0_0_30px_rgba(245,158,11,0.09)]'
                        : isApproved
                          ? 'border-emerald-500/30 hover:border-emerald-500/50'
                          : 'border-rose-500/30 hover:border-rose-500/50'
                    }`}
                  >
                    <div>
                      {/* Company Header */}
                      <div className="flex items-start justify-between gap-4 pb-4 border-b border-white/10 mb-4">
                        <div className="flex items-center gap-3.5">
                          <img
                            src={comp.logo || `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(comp.name)}`}
                            alt={comp.name}
                            className="w-14 h-14 rounded-2xl object-cover border border-[#D9F22A]/30 bg-[#050811] flex-shrink-0"
                          />
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-base sm:text-lg font-black text-white font-['Syne']">
                                {comp.name}
                              </h3>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#D9F22A]/10 text-[#D9F22A] border border-[#D9F22A]/30">
                                {comp.category}
                              </span>
                            </div>
                            <p className="text-xs text-white/60 line-clamp-1 mt-0.5">{comp.tagline || 'Startup LeadsPay'}</p>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className="flex-shrink-0">
                          {isPending ? (
                            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1.5 shadow-sm">
                              <Clock className="w-3 h-3" />
                              Pendente de Análise
                            </span>
                          ) : isApproved ? (
                            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5 shadow-sm">
                              <CheckCircle2 className="w-3 h-3" />
                              Aprovada & Ativa
                            </span>
                          ) : (
                            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1.5 shadow-sm">
                              <X className="w-3 h-3" />
                              Recusada
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Detailed Company Data */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="bg-[#050811] p-3 rounded-xl border border-white/5">
                          <span className="text-[10px] font-bold text-white/40 uppercase block">Documento da Empresa</span>
                          <span className="font-mono font-bold text-white mt-0.5 block">
                            {comp.cnpj ? `CNPJ: ${comp.cnpj}` : comp.cpf ? `CPF: ${comp.cpf}` : 'Sem CNPJ (Pessoa Física)'}
                          </span>
                        </div>

                        <div className="bg-[#050811] p-3 rounded-xl border border-white/5 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] font-bold text-white/40 uppercase block">WhatsApp / Contato</span>
                            <span className="font-mono font-bold text-white mt-0.5 block">{comp.whatsapp || 'Não informado'}</span>
                          </div>
                          {comp.whatsapp && (
                            <a
                              href={`https://api.whatsapp.com/send?phone=${comp.whatsapp.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
                              title="Falar no WhatsApp com o Produtor"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </a>
                          )}
                        </div>

                        <div className="bg-[#050811] p-3 rounded-xl border border-white/5 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] font-bold text-white/40 uppercase block">E-mail Oficial</span>
                            <span className="text-white mt-0.5 block truncate max-w-[180px]">{comp.email || 'contato@empresa.com'}</span>
                          </div>
                          {comp.email && (
                            <a
                              href={`mailto:${comp.email}`}
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                              title="Enviar E-mail"
                            >
                              <Mail className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>

                        <div className="bg-[#050811] p-3 rounded-xl border border-white/5 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] font-bold text-white/40 uppercase block">Website / Landing</span>
                            <span className="text-[#D9F22A] mt-0.5 block truncate max-w-[180px]">{comp.website || 'https://suaempresa.com'}</span>
                          </div>
                          {comp.website && (
                            <a
                              href={comp.website.startsWith('http') ? comp.website : `https://${comp.website}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                              title="Abrir Website"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>

                        <div className="bg-[#050811] p-3 rounded-xl border border-white/5 sm:col-span-2">
                          <span className="text-[10px] font-bold text-white/40 uppercase block mb-1">Descrição & Proposta de Valor</span>
                          <p className="text-white/80 leading-relaxed text-xs">
                            {comp.description || 'Nenhuma descrição detalhada fornecida.'}
                          </p>
                        </div>

                        <div className="bg-[#050811] p-3 rounded-xl border border-white/5 sm:col-span-2 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] font-bold text-white/40 uppercase block">Faixa de Comissão Afiliados</span>
                            <span className="text-sm font-black text-[#D9F22A]">{comp.commissionRange || '30% a 50%'}</span>
                          </div>
                          <div className="text-right text-[11px] text-white/40">
                            <span>Solicitado por: <strong className="text-white/80">{comp.submittedByName || 'Produtor LeadsPay'}</strong></span>
                            <span className="block">{comp.submittedAt ? new Date(comp.submittedAt).toLocaleString('pt-BR') : 'Data recente'}</span>
                          </div>
                        </div>

                        {comp.rejectionReason && (
                          <div className="bg-rose-950/40 border border-rose-500/30 p-3 rounded-xl sm:col-span-2 text-rose-300 text-xs">
                            <strong>Motivo da Recusa:</strong> {comp.rejectionReason}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Controls for Admin */}
                    <div className="mt-5 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
                      <button
                        onClick={() => handleDeleteDocument(comp.id)}
                        className="px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                        title="Excluir Empresa"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Excluir
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleRejectCompany(comp.id, comp.name)}
                          disabled={processingId === comp.id}
                          className="px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <X className="w-3.5 h-3.5" />
                          Recusar / Solicitar Ajuste
                        </button>

                        <button
                          onClick={() => handleApproveCompany(comp.id, comp.name)}
                          disabled={processingId === comp.id}
                          className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-black font-black text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
                        >
                          {processingId === comp.id ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <ShieldCheck className="w-4 h-4" />
                          )}
                          <span>Aprovar Empresa & Liberar Catálogo</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* ================= GENERAL DOCUMENT EXPLORER FOR OTHER COLLECTIONS ================= */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {loading ? (
            <div className="col-span-2 py-16 text-center text-white/50 text-xs flex flex-col items-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-[#D9F22A]" />
              Carregando registros em nuvem...
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="col-span-2 py-16 text-center text-white/50 text-xs bg-[#080d1a] border border-white/10 rounded-2xl p-6">
              Nenhum documento na coleção <code className="text-[#D9F22A]">{activeCollection}</code>.
              <p className="text-white/40 mt-1">
                Coleção zerada e pronta para receber novos cadastros.
              </p>
            </div>
          ) : (
            filteredDocs.map((item) => (
              <div
                key={item._id}
                className="bg-[#080d1a] border border-white/10 rounded-2xl p-5 shadow-lg flex flex-col justify-between hover:border-[#D9F22A]/40 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-bold text-[#D9F22A] bg-[#D9F22A]/10 px-2 py-0.5 rounded">
                        DOC_ID
                      </span>
                      <span className="font-mono text-xs font-bold text-white truncate max-w-[200px]">
                        {item._id}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCopy(JSON.stringify(item, null, 2), item._id)}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white cursor-pointer"
                        title="Copiar JSON"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteDocument(item._id)}
                        className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 cursor-pointer"
                        title="Excluir Documento"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Structured Fields Preview */}
                  <pre className="text-[11px] font-mono text-white/80 bg-[#050811] p-3 rounded-xl overflow-x-auto max-h-56 scrollbar-thin border border-white/5">
                    {JSON.stringify(item, null, 2)}
                  </pre>
                </div>

                <div className="text-[10px] text-white/40 mt-3 pt-2 border-t border-white/5 flex justify-between">
                  <span>{item.title || item.name || item.platformName || item.email || 'Documento'}</span>
                  {copiedId === item._id && <span className="text-[#D9F22A] font-bold">JSON Copiado!</span>}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
