import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../lib/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { 
  COLLECTIONS, 
  clearAllFirestoreData,
  subscribeVerifications,
  subscribeCompanies,
  approveVerificationInFirebase,
  rejectVerificationInFirebase,
  approveCompanyInFirebase,
  rejectCompanyInFirebase,
  deleteCompanyInFirebase,
  banEntityInFirebase,
  unbanEntityInFirebase,
  purgeEntityInFirebase
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
  Send,
  Ban,
  ShieldAlert,
  Users,
  Filter,
  Sliders,
  CheckCircle,
  XCircle,
  AlertOctagon,
  Unlock,
  Eye,
  Image as ImageIcon
} from 'lucide-react';
import { VerificationRequest, CompanyStartup } from '../../types/platform';
import { useAuth } from '../../context/AuthContext';
import { ADMIN_EMAILS, isSuperAdminEmail } from '../../data/platformData';
import firebaseConfig from '../../../firebase-applet-config.json';
import { AdminBrandingManager } from './AdminBrandingManager';
import { AdminModalImagesManager } from './AdminModalImagesManager';

type MainAdminTab = 'affiliates_approval' | 'companies_approval' | 'branding_manager' | 'modal_backgrounds' | 'database_explorer';
type StatusFilter = 'pending' | 'approved' | 'rejected' | 'banned' | 'all';

interface SecurityTarget {
  id: string;
  name: string;
  email?: string;
  type: 'user' | 'company';
  document?: string;
}

export const DatabaseManagerView: React.FC = () => {
  const { currentUser, userProfile } = useAuth();
  
  // Tab Principal de Navegação
  const [mainTab, setMainTab] = useState<MainAdminTab>('affiliates_approval');
  
  // Sub-filtro de Status (Padrão 'all' para exibir todas as empresas e afiliados cadastrados)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  
  // Coleção selecionada quando estiver no Explorador de Banco de Dados
  const [explorerCollection, setExplorerCollection] = useState<string>(COLLECTIONS.PROFILES);

  const userEmail = (currentUser?.email || userProfile?.email || '').toLowerCase().trim();
  const isSuperAdmin = ADMIN_EMAILS.includes(userEmail);

  const [documents, setDocuments] = useState<any[]>([]);
  const [verifications, setVerifications] = useState<VerificationRequest[]>([]);
  const [companies, setCompanies] = useState<CompanyStartup[]>([]);
  const [registeredProfiles, setRegisteredProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Modais de Segurança (Ban, Exclusão Total e Recusa)
  const [banModal, setBanModal] = useState<{
    isOpen: boolean;
    target: SecurityTarget | null;
    reason: string;
    isProcessing: boolean;
  }>({
    isOpen: false,
    target: null,
    reason: 'Descumprimento das diretrizes e termos de uso da plataforma.',
    isProcessing: false
  });

  const [purgeModal, setPurgeModal] = useState<{
    isOpen: boolean;
    target: SecurityTarget | null;
    confirmationInput: string;
    isProcessing: boolean;
  }>({
    isOpen: false,
    target: null,
    confirmationInput: '',
    isProcessing: false
  });

  const [rejectModal, setRejectModal] = useState<{
    isOpen: boolean;
    target: { id: string; name: string; email?: string; type: 'user' | 'company' } | null;
    reason: string;
    isProcessing: boolean;
  }>({
    isOpen: false,
    target: null,
    reason: 'Dados cadastrais necessitam de ajuste ou confirmação.',
    isProcessing: false
  });

  // Rastreamento em memória de IDs excluídos e recém-aprovados para garantir sincronização perfeita
  const [deletedEntityIds, setDeletedEntityIds] = useState<Set<string>>(new Set());
  const [recentlyApprovedIds, setRecentlyApprovedIds] = useState<Set<string>>(new Set());

  // Assinatura em Tempo Real para Solicitações de Verificação, Empresas e Perfis
  useEffect(() => {
    if (!isSuperAdmin) return;
    const unsubVerifs = subscribeVerifications((reqs) => {
      setVerifications(reqs);
    });
    const unsubComps = subscribeCompanies((comps) => {
      setCompanies(comps);
    });
    const unsubProfiles = onSnapshot(collection(db, COLLECTIONS.PROFILES), (snap) => {
      const pList: any[] = [];
      snap.forEach((d) => {
        pList.push({ id: d.id, ...d.data() });
      });
      setRegisteredProfiles(pList);
    }, (err) => {
      console.warn('Erro ao carregar perfis para o admin:', err);
    });

    return () => {
      unsubVerifs();
      unsubComps();
      unsubProfiles();
    };
  }, [isSuperAdmin]);

  // Carregar dados brutos quando no explorador
  const fetchExplorerDocs = async (collName: string) => {
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
      setErrorMessage(`Erro ao buscar dados: ${err.message}`);
      setTimeout(() => setErrorMessage(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mainTab === 'database_explorer') {
      fetchExplorerDocs(explorerCollection);
    }
  }, [mainTab, explorerCollection]);

  // Se não for superadmin, bloquear
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
            O painel de validação e gerenciamento do banco de dados Cloud é protegido e acessível apenas pelos administradores autorizados:
          </p>
          <div className="bg-[#050811] border border-white/10 rounded-xl px-4 py-2.5 font-mono text-xs text-[#D9F22A] font-bold space-y-1">
            <div>rickmarketing81@gmail.com</div>
            <div>leadspay.oficial@gmail.com</div>
          </div>
          <p className="text-[11px] text-white/40 mt-1">
            Seu usuário atual ({currentUser?.email || 'Visitante'}) não possui privilégios de superadministrador.
          </p>
        </div>
      </div>
    );
  }

  // ================= AÇÕES DE APROVAÇÃO E RECUSA =================

  // Aprovar Usuário / Afiliado
  const handleApproveUser = async (userId: string, userName: string) => {
    setProcessingId(userId);
    try {
      await approveVerificationInFirebase(userId);
      
      // Marca como recém-aprovado para nunca sumir da tela
      setRecentlyApprovedIds(prev => {
        const next = new Set(prev);
        next.add(userId);
        return next;
      });

      // Atualização imediata em todos os estados locais preservando o perfil real
      setVerifications(prev => prev.map(v => (v.userId === userId || v.id === userId) ? { 
        ...v, 
        status: 'approved', 
        verified: true, 
        kyc_status: 'verified', 
        banned: false, 
        rejectionReason: undefined 
      } : v));
      
      setRegisteredProfiles(prev => prev.map(p => (p.userId === userId || p.id === userId) ? { 
        ...p, 
        verified: true, 
        verificationStatus: 'approved', 
        kyc_status: 'verified', 
        status: 'approved', 
        banned: false, 
        verificationRejectionReason: null 
      } : p));
      
      // Se estava na aba de pendentes, muda automaticamente para 'all' para o usuário ver o item aprovado
      if (statusFilter === 'pending') {
        setStatusFilter('all');
      }

      setStatusMessage(`O afiliado "${userName}" foi APROVADO com sucesso! Cadastro verificado e liberado para vendas.`);
      setTimeout(() => setStatusMessage(''), 7000);
    } catch (err: any) {
      setErrorMessage(`Erro ao aprovar afiliado: ${err.message}`);
      setTimeout(() => setErrorMessage(''), 7000);
    } finally {
      setProcessingId(null);
    }
  };

  // Abrir Modal de Recusa / Solicitação de Ajuste
  const openRejectModal = (target: { id: string; name: string; email?: string; type: 'user' | 'company' }) => {
    setRejectModal({
      isOpen: true,
      target,
      reason: target.type === 'company'
        ? 'Dados cadastrais ou documentação da empresa necessitam de ajuste.'
        : 'Dados cadastrais necessitam de ajuste ou confirmação.',
      isProcessing: false
    });
  };

  // Confirmar Recusa através do Modal Seguro
  const handleConfirmReject = async () => {
    if (!rejectModal.target) return;
    const { id, name, type } = rejectModal.target;
    const reason = rejectModal.reason.trim() || 'Dados cadastrais necessitam de ajuste ou confirmação.';

    setRejectModal(prev => ({ ...prev, isProcessing: true }));
    setProcessingId(id);
    try {
      if (type === 'user') {
        await rejectVerificationInFirebase(id, reason);
        setVerifications(prev => prev.map(v => (v.userId === id || v.id === id) ? { ...v, status: 'rejected', rejectionReason: reason, verified: false } : v));
        setRegisteredProfiles(prev => prev.map(p => (p.userId === id || p.id === id) ? { ...p, verified: false, verificationStatus: 'rejected', rejectionReason: reason } : p));
        setStatusMessage(`Validação do afiliado "${name}" recusada com motivo registrado.`);
      } else {
        await rejectCompanyInFirebase(id, reason);
        setCompanies(prev => prev.map(c => c.id === id ? { ...c, status: 'rejected', rejectionReason: reason, verified: false } : c));
        setVerifications(prev => prev.map(v => (v.id === id || v.userId === id || v.companyId === id) ? { ...v, status: 'rejected', rejectionReason: reason, verified: false } : v));
        setStatusMessage(`Empresa "${name}" recusada com motivo registrado.`);
      }

      if (statusFilter === 'pending') {
        setStatusFilter('all');
      }

      setTimeout(() => setStatusMessage(''), 7000);
      setRejectModal({ isOpen: false, target: null, reason: '', isProcessing: false });
    } catch (err: any) {
      setErrorMessage(`Erro ao recusar: ${err.message}`);
      setTimeout(() => setErrorMessage(''), 7000);
      setRejectModal(prev => ({ ...prev, isProcessing: false }));
    } finally {
      setProcessingId(null);
    }
  };

  // Aprovar Empresa (Startup / Produtor)
  const handleApproveCompany = async (companyId: string, companyName: string) => {
    setProcessingId(companyId);
    try {
      await approveCompanyInFirebase(companyId);

      // Marca como recém-aprovada para nunca sumir da tela
      setRecentlyApprovedIds(prev => {
        const next = new Set(prev);
        next.add(companyId);
        return next;
      });

      // Atualiza companies preservando todos os dados reais
      const existingCompanyData = allCompanies.find(c => c.id === companyId);
      setCompanies(prev => {
        const exists = prev.some(c => c.id === companyId);
        if (exists) {
          return prev.map(c => c.id === companyId ? { ...c, status: 'approved', verified: true, banned: false, rejectionReason: undefined } : c);
        }
        return [...prev, {
          ...(existingCompanyData || {}),
          id: companyId,
          name: existingCompanyData?.name || companyName,
          status: 'approved',
          verified: true,
          banned: false,
          rejectionReason: undefined,
          category: existingCompanyData?.category || 'SaaS / B2B',
          commissionRange: existingCompanyData?.commissionRange || '10% - 50%',
          createdAt: existingCompanyData?.createdAt || new Date().toISOString()
        } as CompanyStartup];
      });

      // Atualiza verifications
      setVerifications(prev => prev.map(v => 
        (v.id === companyId || v.userId === companyId || v.companyId === companyId) 
          ? { ...v, status: 'approved', verified: true, rejectionReason: undefined } 
          : v
      ));

      // Atualiza registeredProfiles
      setRegisteredProfiles(prev => prev.map(p => 
        (p.id === companyId || p.userId === companyId || p.companyId === companyId)
          ? { ...p, verified: true, verificationStatus: 'approved' }
          : p
      ));

      // Se estava na aba de pendentes, muda para 'all' para o administrador ver a empresa aprovada com destaque!
      if (statusFilter === 'pending') {
        setStatusFilter('all');
      }

      setStatusMessage(`Empresa "${companyName}" APROVADA com sucesso! Status atualizado para Aprovada & Ativa.`);
      setTimeout(() => setStatusMessage(''), 7000);
    } catch (err: any) {
      setErrorMessage(`Erro ao aprovar empresa: ${err.message}`);
      setTimeout(() => setErrorMessage(''), 7000);
    } finally {
      setProcessingId(null);
    }
  };

  // ================= AÇÕES DE BANIMENTO (BAN & UNBAN) =================

  const openBanModal = (target: SecurityTarget) => {
    setBanModal({
      isOpen: true,
      target,
      reason: 'Descumprimento das diretrizes e termos de uso da plataforma.',
      isProcessing: false
    });
  };

  const handleConfirmBan = async () => {
    if (!banModal.target) return;
    setBanModal(prev => ({ ...prev, isProcessing: true }));

    try {
      const { id, type, name } = banModal.target;
      await banEntityInFirebase(id, type, banModal.reason);

      // Atualiza listas locais
      if (type === 'user') {
        setVerifications(prev => prev.map(v => (v.userId === id || v.id === id) ? { ...v, banned: true, banReason: banModal.reason } : v));
        setRegisteredProfiles(prev => prev.map(p => (p.userId === id || p.id === id) ? { ...p, banned: true, banReason: banModal.reason } : p));
      } else {
        setCompanies(prev => prev.map(c => (c.id === id || c.ownerId === id) ? { ...c, banned: true, banReason: banModal.reason, verified: false } : c));
        setVerifications(prev => prev.map(v => (v.companyId === id || v.id === id) ? { ...v, banned: true, banReason: banModal.reason } : v));
      }

      setStatusMessage(`"${name}" foi BANIDO com sucesso. O acesso à plataforma foi imediatamente revogado.`);
      setTimeout(() => setStatusMessage(''), 7000);
      setBanModal({ isOpen: false, target: null, reason: '', isProcessing: false });
    } catch (err: any) {
      setErrorMessage(`Falha ao banir: ${err.message}`);
      setBanModal(prev => ({ ...prev, isProcessing: false }));
    }
  };

  const handleUnban = async (target: SecurityTarget) => {
    if (!confirm(`Deseja realmente desbanir e restaurar o acesso de "${target.name}"?`)) return;
    setProcessingId(target.id);

    try {
      await unbanEntityInFirebase(target.id, target.type);

      if (target.type === 'user') {
        setVerifications(prev => prev.map(v => (v.userId === target.id || v.id === target.id) ? { ...v, banned: false, banReason: undefined, status: 'approved' } : v));
        setRegisteredProfiles(prev => prev.map(p => (p.userId === target.id || p.id === target.id) ? { ...p, banned: false, banReason: undefined, status: 'approved' } : p));
      } else {
        setCompanies(prev => prev.map(c => (c.id === target.id || c.ownerId === target.id) ? { ...c, banned: false, banReason: undefined, status: 'approved', verified: true } : c));
        setVerifications(prev => prev.map(v => (v.companyId === target.id || v.id === target.id) ? { ...v, banned: false, banReason: undefined, status: 'approved' } : v));
      }

      setStatusMessage(`"${target.name}" foi DESBANIDO e teve seu acesso restabelecido.`);
      setTimeout(() => setStatusMessage(''), 7000);
    } catch (err: any) {
      setErrorMessage(`Falha ao desbanir: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  // ================= AÇÕES DE EXCLUSÃO TOTAL (PURGE / HARD DELETE DEFINITIVO) =================

  const openPurgeModal = (target: SecurityTarget) => {
    setPurgeModal({
      isOpen: true,
      target,
      confirmationInput: '',
      isProcessing: false
    });
  };

  const handleConfirmPurge = async () => {
    if (!purgeModal.target) return;
    const inputUpper = purgeModal.confirmationInput.trim().toUpperCase();
    if (inputUpper !== 'EXCLUIR') {
      alert('Para confirmar a exclusão definitiva, digite a palavra EXCLUIR.');
      return;
    }

    setPurgeModal(prev => ({ ...prev, isProcessing: true }));

    try {
      const { id, type, name } = purgeModal.target;

      // 1. Marca imediatamente no conjunto de IDs deletados da sessão para nunca reaparecer
      setDeletedEntityIds(prev => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });

      // 2. Chama a exclusão profunda e em cascata no servidor / Firestore
      await purgeEntityInFirebase(id, type, 'EXCLUIR');

      // 3. Remove de TODOS os estados locais
      setVerifications(prev => prev.filter(v => v.userId !== id && v.id !== id && v.companyId !== id));
      setCompanies(prev => prev.filter(c => c.id !== id && c.ownerId !== id));
      setRegisteredProfiles(prev => prev.filter(p => p.id !== id && p.userId !== id).map(p => 
        p.companyId === id ? { ...p, companyId: null, companyName: null, hasCompanyProfile: false } : p
      ));
      setDocuments(prev => prev.filter(d => d._id !== id && d.userId !== id && d.companyId !== id));

      // 4. Limpeza de caches do localStorage
      try {
        if (typeof window !== 'undefined') {
          const keysToRemove = Object.keys(localStorage).filter(k => 
            k.includes(id) || k.includes('leadspay_') || k.includes('companies') || k.includes('affiliations') || k.includes('verification')
          );
          keysToRemove.forEach(k => localStorage.removeItem(k));
        }
      } catch (e) {}

      setStatusMessage(`"${name}" e todos os seus vínculos foram COMPLETAMENTE EXCLUÍDOS do banco de dados como se nunca tivessem existido.`);
      setTimeout(() => setStatusMessage(''), 8000);
      setPurgeModal({ isOpen: false, target: null, confirmationInput: '', isProcessing: false });
    } catch (err: any) {
      setErrorMessage(`Falha ao excluir registro: ${err.message}`);
      setPurgeModal(prev => ({ ...prev, isProcessing: false }));
    }
  };

  // Limpeza Geral do Banco de Dados
  const handleWipeAllData = async () => {
    const confirmation = prompt('ZONA DE PERIGO EXTREMO: Para zerar TODOS os dados de testes do banco em nuvem, digite "ZERAR BANCO":');
    if (confirmation !== 'ZERAR BANCO') return;

    setLoading(true);
    const res = await clearAllFirestoreData();
    if (res.success) {
      setStatusMessage('Banco de dados zerado e sincronizado com sucesso!');
      if (mainTab === 'database_explorer') {
        await fetchExplorerDocs(explorerCollection);
      }
    } else {
      setErrorMessage(`Erro ao limpar: ${res.error}`);
    }
    setTimeout(() => setStatusMessage(''), 5000);
    setLoading(false);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // ================= FILTROS E CONTAGENS =================

  // Unificação Inteligente: Afiliados (KYC + Perfis de Usuários Registrados)
  const allAffiliates: VerificationRequest[] = useMemo(() => {
    const map = new Map<string, VerificationRequest>();

    // 1. Verificações explícitas (apenas afiliados)
    verifications.forEach((v) => {
      const key = v.userId || v.id;
      if (deletedEntityIds.has(key) || deletedEntityIds.has(v.id)) return;
      if (isSuperAdminEmail(v.email)) return;

      const isCompanyVerif = v.roleType === 'empresa' || (Boolean(v.companyCnpj) && v.roleType !== 'afiliado');
      if (!isCompanyVerif || v.roleType === 'afiliado') {
        map.set(key, v);
      }
    });

    // 2. Perfis de usuários cadastrados
    registeredProfiles.forEach((p) => {
      const key = p.userId || p.id;
      if (deletedEntityIds.has(key) || deletedEntityIds.has(p.id)) return;
      
      // Contas de administrador da plataforma JAMAIS são listadas como afiliados
      const isAdmin = p.accountType === 'admin' || 
                      isSuperAdminEmail(p.email) || 
                      p.role === 'Administrador do Sistema' || 
                      p.partnerLevel === 'Super Administrador';
      if (isAdmin) {
        map.delete(key);
        if (p.id) map.delete(p.id);
        if (p.userId) map.delete(p.userId);
        return;
      }

      // Apenas perfis estritamente corporativos (sem nenhum perfil ou papel de afiliado) são omitidos
      const hasAffiliate = p.hasAffiliateProfile === true || p.accountType === 'afiliado' || p.accountType === 'ambos';
      const isExclusivelyCompany = !hasAffiliate && (
        p.accountType === 'empresa' || 
        (p.hasCompanyProfile === true && !p.hasAffiliateProfile) ||
        p.activeRoleMode === 'empresa' ||
        p.verificationRoleType === 'empresa'
      );

      if (isExclusivelyCompany) {
        map.delete(key);
        if (p.id) map.delete(p.id);
        if (p.userId) map.delete(p.userId);
        return;
      }

      const isVerified = p.verified === true || p.verificationStatus === 'approved' || p.kyc_status === 'verified';
      const isBanned = p.banned === true;
      let status: any = 'pending';
      if (isBanned) status = 'banned';
      else if (p.verificationStatus === 'rejected') status = 'rejected';
      else if (isVerified) status = 'approved';
      else status = 'pending';

      const existing = map.get(key);
      if (existing) {
        // FUNDE SEMPRE! NUNCA DEIXE NOME, FOTO OU DADOS CADASTRAIS VAZIOS
        const isApprovedFinal = isVerified || existing.status === 'approved' || (existing as any).verified;
        const resolvedStatus = isBanned 
          ? 'banned' 
          : isApprovedFinal 
            ? 'approved' 
            : (existing.status || status);

        map.set(key, {
          ...existing,
          id: key,
          userId: key,
          name: p.name || p.fullName || existing.name || (p.email ? p.email.split('@')[0] : 'Afiliado ' + key.slice(0, 5)),
          email: p.email || existing.email || '',
          phone: p.phone || p.whatsapp || existing.phone || '',
          cpf: p.cpf || existing.cpf || '',
          city: p.city || existing.city || '',
          state: p.state || existing.state || '',
          address: p.address || existing.address || '',
          cep: p.cep || existing.cep || '',
          pixKey: p.pixKey || existing.pixKey || '',
          pixKeyType: p.pixKeyType || existing.pixKeyType || 'CPF',
          avatar: p.avatar || existing.avatar || '',
          roleType: 'afiliado',
          status: resolvedStatus,
          verified: resolvedStatus === 'approved',
          banned: isBanned || Boolean(existing.banned),
          rejectionReason: resolvedStatus === 'approved' ? undefined : (existing.rejectionReason || p.verificationRejectionReason || undefined),
          submittedAt: existing.submittedAt || p.submittedAt || p.createdAt || p.updatedAt || new Date().toISOString()
        } as VerificationRequest);
      } else {
        map.set(key, {
          id: key,
          userId: key,
          name: p.name || p.fullName || (p.email ? p.email.split('@')[0] : 'Afiliado ' + key.slice(0, 5)),
          email: p.email || '',
          phone: p.phone || p.whatsapp || '',
          cpf: p.cpf || '',
          city: p.city || '',
          state: p.state || '',
          address: p.address || '',
          cep: p.cep || '',
          pixKey: p.pixKey || '',
          pixKeyType: p.pixKeyType || 'CPF',
          roleType: 'afiliado',
          status,
          verified: status === 'approved',
          banned: isBanned,
          rejectionReason: status === 'approved' ? undefined : (p.verificationRejectionReason || undefined),
          avatar: p.avatar || '',
          submittedAt: p.submittedAt || p.createdAt || p.updatedAt || new Date().toISOString()
        } as VerificationRequest);
      }
    });

    return Array.from(map.values());
  }, [verifications, registeredProfiles, deletedEntityIds]);

  // Unificação Inteligente: Empresas (Lista de Companies + Solicitações Reais)
  const allCompanies: CompanyStartup[] = useMemo(() => {
    const map = new Map<string, CompanyStartup>();

    // 1. Empresas reais existentes na coleção companies do banco
    companies.forEach((c) => {
      if (deletedEntityIds.has(c.id) || (c.ownerId && deletedEntityIds.has(c.ownerId))) return;
      // Pula registros órfãos ou corrompidos sem nenhum dado identificável
      if (!c.name && !c.companyName && !c.ownerId && !c.submittedBy && !c.email) return;

      map.set(c.id, {
        ...c,
        name: c.name || c.companyName || 'Empresa Cadastrada',
        category: c.category || 'SaaS / B2B',
        status: (c.status || (c.verified ? 'approved' : 'pending')) as any
      });
    });

    // 2. Solicitações de verificação genuínas de empresa (NUNCA converte afiliados em empresas)
    verifications.forEach((v) => {
      const isCompanyVerif = v.roleType === 'empresa' || 
                             (Boolean(v.companyCnpj) && v.roleType !== 'afiliado' && Boolean(v.companyName));
      if (isCompanyVerif) {
        const key = v.companyId || (v.roleType === 'empresa' ? (v.userId || v.id) : null);
        if (!key || deletedEntityIds.has(key) || deletedEntityIds.has(v.id)) return;
        
        const existing = map.get(key);
        if (existing) {
          // Funde dados reais para nunca sobrescrever com campos vazios
          map.set(key, {
            ...existing,
            name: existing.name || v.companyName || v.name || '',
            tagline: existing.tagline || v.companyTagline || '',
            logo: existing.logo || v.companyLogo || v.avatar || '',
            website: existing.website || v.companyWebsite || '',
            cnpj: existing.cnpj || v.companyCnpj || v.cpf || '',
            category: existing.category || (v.companyCategory as any) || 'SaaS / B2B',
            description: existing.description || v.companyTagline || '',
            email: existing.email || v.email || '',
            whatsapp: existing.whatsapp || v.phone || '',
            ownerId: existing.ownerId || v.userId || v.id,
            status: existing.status || v.status || 'pending',
            verified: Boolean(existing.verified || v.status === 'approved')
          });
        } else {
          map.set(key, {
            id: key,
            name: v.companyName || v.name || 'Empresa Cadastrada',
            slug: (v.companyName || v.name || 'empresa').toLowerCase().replace(/[^a-z0-9]/g, '-'),
            tagline: v.companyTagline || '',
            logo: v.companyLogo || v.avatar || '',
            bannerImage: '',
            website: v.companyWebsite || '',
            commissionRange: '10% - 50%',
            cnpj: v.companyCnpj || v.cpf || '',
            category: (v.companyCategory as any) || 'SaaS / B2B',
            description: v.companyTagline || '',
            email: v.email || '',
            whatsapp: v.phone || '',
            ownerId: v.userId || v.id,
            submittedBy: v.userId || v.id,
            status: v.status === 'approved' ? 'approved' : (v.status || 'pending'),
            verified: v.status === 'approved',
            totalPlansCount: 0,
            totalAffiliatesCount: 0,
            totalSalesVolume: 0,
            createdAt: v.submittedAt || new Date().toISOString()
          } as CompanyStartup);
        }
      }
    });

    // 3. Perfis cadastrados com perfil de empresa
    registeredProfiles.forEach((p) => {
      // Ignorar contas de admin sem empresa
      const isAdmin = p.accountType === 'admin' || 
                      isSuperAdminEmail(p.email) || 
                      p.role === 'Administrador do Sistema' || 
                      p.partnerLevel === 'Super Administrador';
      if (isAdmin && !p.companyId && !p.companyName) return;

      const isCompanyProfile = p.accountType === 'empresa' ||
                               p.hasCompanyProfile === true ||
                               Boolean(p.companyId?.trim()) ||
                               Boolean(p.companyName?.trim()) ||
                               p.activeRoleMode === 'empresa' ||
                               p.verificationRoleType === 'empresa' ||
                               (typeof p.role === 'string' && (
                                 p.role.toLowerCase().includes('startup') || 
                                 p.role.toLowerCase().includes('empresa') || 
                                 p.role.toLowerCase().includes('produtor') ||
                                 p.role.toLowerCase().includes('fundador')
                               )) ||
                               (typeof p.partnerLevel === 'string' && p.partnerLevel.toLowerCase().includes('empresa'));

      if (!isCompanyProfile) return;

      const compId = p.companyId || (p.userId || p.id);
      if (compId && !deletedEntityIds.has(compId) && !deletedEntityIds.has(p.id) && !deletedEntityIds.has(p.userId)) {
        const existing = map.get(compId);
        const isApprv = Boolean(p.verified || p.verificationStatus === 'approved');
        const companyDisplayName = p.companyName?.trim() || p.name?.trim() || 'Empresa Cadastrada';

        if (existing) {
          map.set(compId, {
            ...existing,
            name: existing.name || companyDisplayName,
            tagline: existing.tagline || p.companyTagline || p.tagline || '',
            logo: existing.logo || p.companyLogo || p.logo || p.avatar || '',
            website: existing.website || p.companyWebsite || p.website || '',
            cnpj: existing.cnpj || p.companyCnpj || p.cnpj || p.cpf || '',
            category: existing.category || (p.companyCategory as any) || 'SaaS / B2B',
            description: existing.description || p.companyDescription || '',
            email: existing.email || p.companyEmail || p.email || '',
            whatsapp: existing.whatsapp || p.companyWhatsapp || p.whatsapp || p.phone || '',
            ownerId: existing.ownerId || p.userId || p.id,
            status: existing.status || (isApprv ? 'approved' : (p.verificationStatus || 'pending')),
            verified: Boolean(existing.verified || isApprv)
          });
        } else {
          map.set(compId, {
            id: compId,
            name: companyDisplayName,
            slug: companyDisplayName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
            tagline: p.companyTagline || p.tagline || '',
            logo: p.companyLogo || p.logo || p.avatar || '',
            bannerImage: '',
            website: p.companyWebsite || p.website || '',
            commissionRange: '10% - 50%',
            cnpj: p.companyCnpj || p.cnpj || p.cpf || '',
            category: (p.companyCategory as any) || 'SaaS / B2B',
            description: p.companyDescription || '',
            email: p.companyEmail || p.email || '',
            whatsapp: p.companyWhatsapp || p.whatsapp || p.phone || '',
            ownerId: p.userId || p.id,
            submittedBy: p.userId || p.id,
            status: isApprv ? 'approved' : (p.verificationStatus || 'pending'),
            verified: isApprv,
            totalPlansCount: 0,
            totalAffiliatesCount: 0,
            totalSalesVolume: 0,
            createdAt: p.createdAt || new Date().toISOString()
          } as CompanyStartup);
        }
      }
    });

    return Array.from(map.values());
  }, [companies, verifications, registeredProfiles, deletedEntityIds]);

  // Helper para verificar status de um registro
  const getStatusOfVerification = (v: VerificationRequest): StatusFilter => {
    if (v.banned) return 'banned';
    if (v.status === 'approved' || (v as any).status === 'active' || (v as any).verified || (v as any).kyc_status === 'verified') return 'approved';
    if (v.status === 'rejected') return 'rejected';
    return 'pending';
  };

  const getStatusOfCompany = (c: CompanyStartup): StatusFilter => {
    if (c.banned) return 'banned';
    if (c.status === 'approved' || (c.status as string) === 'active' || c.verified || (c as any).kyc_status === 'verified') return 'approved';
    if (c.status === 'rejected') return 'rejected';
    return 'pending';
  };

  // Afiliados filtrados
  const filteredAffiliates = allAffiliates.filter(v => {
    const vId = v.userId || v.id;
    if (deletedEntityIds.has(vId) || deletedEntityIds.has(v.id)) return false;

    const currentStatus = getStatusOfVerification(v);
    const isRecentlyApproved = recentlyApprovedIds.has(vId) || recentlyApprovedIds.has(v.id);

    // Se acabou de aprovar na sessão, não some da tela do admin
    if (statusFilter !== 'all' && currentStatus !== statusFilter && !isRecentlyApproved) return false;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchName = (v.name || '').toLowerCase().includes(term);
      const matchEmail = (v.email || '').toLowerCase().includes(term);
      const matchCpf = (v.cpf || '').toLowerCase().includes(term);
      const matchCity = (v.city || '').toLowerCase().includes(term);
      const matchPhone = (v.phone || '').toLowerCase().includes(term);
      if (!matchName && !matchEmail && !matchCpf && !matchCity && !matchPhone) return false;
    }
    return true;
  });

  // Empresas filtradas
  const filteredCompanies = allCompanies.filter(c => {
    if (deletedEntityIds.has(c.id) || (c.ownerId && deletedEntityIds.has(c.ownerId))) return false;

    const currentStatus = getStatusOfCompany(c);
    const isRecentlyApproved = recentlyApprovedIds.has(c.id);

    // Se acabou de aprovar na sessão, não some da tela do admin
    if (statusFilter !== 'all' && currentStatus !== statusFilter && !isRecentlyApproved) return false;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchName = (c.name || '').toLowerCase().includes(term);
      const matchEmail = (c.email || '').toLowerCase().includes(term);
      const matchDoc = (c.cnpj || c.cpf || '').toLowerCase().includes(term);
      const matchCat = (c.category || '').toLowerCase().includes(term);
      const matchDesc = (c.description || '').toLowerCase().includes(term);
      if (!matchName && !matchEmail && !matchDoc && !matchCat && !matchDesc) return false;
    }
    return true;
  });

  // Contagens para os badges
  const pendingAffiliatesCount = allAffiliates.filter(v => getStatusOfVerification(v) === 'pending').length;
  const approvedAffiliatesCount = allAffiliates.filter(v => getStatusOfVerification(v) === 'approved').length;
  const rejectedAffiliatesCount = allAffiliates.filter(v => getStatusOfVerification(v) === 'rejected').length;
  const bannedAffiliatesCount = allAffiliates.filter(v => getStatusOfVerification(v) === 'banned').length;

  const pendingCompaniesCount = allCompanies.filter(c => getStatusOfCompany(c) === 'pending').length;
  const approvedCompaniesCount = allCompanies.filter(c => getStatusOfCompany(c) === 'approved').length;
  const rejectedCompaniesCount = allCompanies.filter(c => getStatusOfCompany(c) === 'rejected').length;
  const bannedCompaniesCount = allCompanies.filter(c => getStatusOfCompany(c) === 'banned').length;

  return (
    <div className="flex flex-col gap-6" id="leadspay-database-view">
      {/* Header com Boas-Vindas e Ações Globais */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-bold tracking-widest text-[#D9F22A] uppercase">
              Super Painel Administrativo LeadsPay
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-['Syne'] mt-1">
            Gestão de Cadastros, Segurança & Banco de Dados
          </h1>
          <p className="text-xs text-white/60 mt-1 max-w-2xl">
            Aprovação separada de Afiliados e Empresas, controle de suspensão/banimento e expurgo total com segurança reforçada.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => {
              if (mainTab === 'database_explorer') fetchExplorerDocs(explorerCollection);
            }}
            disabled={loading}
            className="bg-white/10 hover:bg-white/15 text-white font-bold px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </button>

          <button
            onClick={handleWipeAllData}
            disabled={loading}
            className="bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 font-bold px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2"
            title="Limpeza geral para testes"
          >
            <Trash2 className="w-4 h-4" />
            <span>Zerar Banco</span>
          </button>
        </div>
      </div>

      {/* Feedback Notifications */}
      {statusMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2.5 shadow-lg animate-in fade-in duration-200">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold flex items-center gap-2.5 shadow-lg animate-in fade-in duration-200">
          <AlertOctagon className="w-5 h-5 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* NAVEGAÇÃO PRINCIPAL (SEPARAÇÃO CLARA ENTRE AFILIADOS, EMPRESAS, LOGO E IMAGENS) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Aba 1: Afiliados */}
        <button
          onClick={() => {
            setMainTab('affiliates_approval');
            setStatusFilter('pending');
          }}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
            mainTab === 'affiliates_approval'
              ? 'bg-[#D9F22A] text-[#060A15] border-[#D9F22A] shadow-[0_0_25px_rgba(217,242,42,0.3)]'
              : 'bg-[#080d1a] text-white hover:border-white/30 border-white/10'
          }`}
        >
          <div className="flex items-center justify-between w-full mb-2">
            <div className={`p-2 rounded-xl ${mainTab === 'affiliates_approval' ? 'bg-black/20 text-black' : 'bg-white/5 text-[#D9F22A]'}`}>
              <Users className="w-5 h-5" />
            </div>
            {pendingAffiliatesCount > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                mainTab === 'affiliates_approval' ? 'bg-black text-[#D9F22A]' : 'bg-amber-400 text-black'
              }`}>
                {pendingAffiliatesCount} Pendente{pendingAffiliatesCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div>
            <h3 className="font-['Syne'] font-black text-sm uppercase tracking-tight">
              Aprovação de Afiliados
            </h3>
            <p className={`text-[11px] mt-0.5 ${mainTab === 'affiliates_approval' ? 'text-black/80 font-medium' : 'text-white/50'}`}>
              Validação de KYC, dados bancários e liberação de vendas
            </p>
          </div>
        </button>

        {/* Aba 2: Empresas */}
        <button
          onClick={() => {
            setMainTab('companies_approval');
            setStatusFilter('pending');
          }}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
            mainTab === 'companies_approval'
              ? 'bg-[#D9F22A] text-[#060A15] border-[#D9F22A] shadow-[0_0_25px_rgba(217,242,42,0.3)]'
              : 'bg-[#080d1a] text-white hover:border-white/30 border-white/10'
          }`}
        >
          <div className="flex items-center justify-between w-full mb-2">
            <div className={`p-2 rounded-xl ${mainTab === 'companies_approval' ? 'bg-black/20 text-black' : 'bg-white/5 text-indigo-400'}`}>
              <Building2 className="w-5 h-5" />
            </div>
            {pendingCompaniesCount > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                mainTab === 'companies_approval' ? 'bg-black text-[#D9F22A]' : 'bg-amber-400 text-black'
              }`}>
                {pendingCompaniesCount} Pendente{pendingCompaniesCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div>
            <h3 className="font-['Syne'] font-black text-sm uppercase tracking-tight">
              Aprovação de Empresas
            </h3>
            <p className={`text-[11px] mt-0.5 ${mainTab === 'companies_approval' ? 'text-black/80 font-medium' : 'text-white/50'}`}>
              Startups, produtores, CNPJ e liberação de catálogo
            </p>
          </div>
        </button>

        {/* Aba 3: Logotipo do Site */}
        <button
          onClick={() => setMainTab('branding_manager')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
            mainTab === 'branding_manager'
              ? 'bg-[#D9F22A] text-[#060A15] border-[#D9F22A] shadow-[0_0_25px_rgba(217,242,42,0.3)]'
              : 'bg-[#080d1a] text-white hover:border-white/30 border-white/10'
          }`}
        >
          <div className="flex items-center justify-between w-full mb-2">
            <div className={`p-2 rounded-xl ${mainTab === 'branding_manager' ? 'bg-black/20 text-black' : 'bg-white/5 text-emerald-400'}`}>
              <Sliders className="w-5 h-5" />
            </div>
            <span className={`text-[10px] font-bold uppercase tracking-wider ${mainTab === 'branding_manager' ? 'text-black' : 'text-[#D9F22A]'}`}>
              Upload Manual
            </span>
          </div>
          <div>
            <h3 className="font-['Syne'] font-black text-sm uppercase tracking-tight">
              Logotipo do Site
            </h3>
            <p className={`text-[11px] mt-0.5 ${mainTab === 'branding_manager' ? 'text-black/80 font-medium' : 'text-white/50'}`}>
              Upload de imagem personalizada e logotipo
            </p>
          </div>
        </button>

        {/* Aba 4: Imagens dos Modais (Upload Manual) */}
        <button
          onClick={() => setMainTab('modal_backgrounds')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
            mainTab === 'modal_backgrounds'
              ? 'bg-[#D9F22A] text-[#060A15] border-[#D9F22A] shadow-[0_0_25px_rgba(217,242,42,0.3)]'
              : 'bg-[#080d1a] text-white hover:border-white/30 border-white/10'
          }`}
        >
          <div className="flex items-center justify-between w-full mb-2">
            <div className={`p-2 rounded-xl ${mainTab === 'modal_backgrounds' ? 'bg-black/20 text-black' : 'bg-white/5 text-cyan-400'}`}>
              <ImageIcon className="w-5 h-5" />
            </div>
            <span className={`text-[10px] font-bold uppercase tracking-wider ${mainTab === 'modal_backgrounds' ? 'text-black' : 'text-cyan-400'}`}>
              Upload Manual
            </span>
          </div>
          <div>
            <h3 className="font-['Syne'] font-black text-sm uppercase tracking-tight">
              Imagens dos Modais
            </h3>
            <p className={`text-[11px] mt-0.5 ${mainTab === 'modal_backgrounds' ? 'text-black/80 font-medium' : 'text-white/50'}`}>
              Fundos de Afiliado, Empresa e Login
            </p>
          </div>
        </button>

        {/* Aba 5: Coleções / Banco de Dados */}
        <button
          onClick={() => setMainTab('database_explorer')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
            mainTab === 'database_explorer'
              ? 'bg-[#D9F22A] text-[#060A15] border-[#D9F22A] shadow-[0_0_25px_rgba(217,242,42,0.3)]'
              : 'bg-[#080d1a] text-white hover:border-white/30 border-white/10'
          }`}
        >
          <div className="flex items-center justify-between w-full mb-2">
            <div className={`p-2 rounded-xl ${mainTab === 'database_explorer' ? 'bg-black/20 text-black' : 'bg-white/5 text-purple-400'}`}>
              <Database className="w-5 h-5" />
            </div>
            <span className={`text-[10px] font-bold uppercase tracking-wider ${mainTab === 'database_explorer' ? 'text-black' : 'text-white/40'}`}>
              Firestore
            </span>
          </div>
          <div>
            <h3 className="font-['Syne'] font-black text-sm uppercase tracking-tight">
              Explorador do Banco
            </h3>
            <p className={`text-[11px] mt-0.5 ${mainTab === 'database_explorer' ? 'text-black/80 font-medium' : 'text-white/50'}`}>
              Inspeção de coleções: vendas, planos, saques, logs
            </p>
          </div>
        </button>
      </div>

      {/* SE FOR BRANDING MANAGER, EXIBE O COMPONENTE COMPLETO */}
      {mainTab === 'branding_manager' && (
        <div className="animate-in fade-in duration-200">
          <AdminBrandingManager />
        </div>
      )}

      {/* SE FOR MODAL BACKGROUNDS, EXIBE O GERENCIADOR DE IMAGENS */}
      {mainTab === 'modal_backgrounds' && (
        <div className="animate-in fade-in duration-200">
          <AdminModalImagesManager />
        </div>
      )}

      {/* SE FOR AFILIADOS OU EMPRESAS: BARRA DE PESQUISA + SUB-ABAS DE STATUS */}
      {(mainTab === 'affiliates_approval' || mainTab === 'companies_approval') && (
        <div className="space-y-4">
          {/* Sub-abas de Status (Pendentes, Aprovados, Recusados, Banidos, Todos) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#080d1a] p-4 rounded-2xl border border-white/10">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={mainTab === 'affiliates_approval' ? "Buscar afiliado por nome, e-mail, CPF, celular..." : "Buscar empresa por nome, CNPJ, categoria..."}
                className="w-full bg-[#050811] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#D9F22A] transition-colors"
              />
            </div>

            {/* Status Pills */}
            <div className="flex items-center gap-1.5 bg-[#050811] p-1.5 rounded-xl border border-white/10 overflow-x-auto scrollbar-none">
              {/* Pendentes */}
              <button
                onClick={() => setStatusFilter('pending')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  statusFilter === 'pending'
                    ? 'bg-amber-400 text-[#060A15] shadow-[0_0_15px_rgba(251,191,36,0.3)]'
                    : 'text-amber-400/80 hover:text-amber-400 hover:bg-white/5'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Pendentes</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/30 font-mono">
                  {mainTab === 'affiliates_approval' ? pendingAffiliatesCount : pendingCompaniesCount}
                </span>
              </button>

              {/* Aprovados */}
              <button
                onClick={() => setStatusFilter('approved')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  statusFilter === 'approved'
                    ? 'bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                    : 'text-emerald-400/80 hover:text-emerald-400 hover:bg-white/5'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Aprovados</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/30 font-mono">
                  {mainTab === 'affiliates_approval' ? approvedAffiliatesCount : approvedCompaniesCount}
                </span>
              </button>

              {/* Recusados */}
              <button
                onClick={() => setStatusFilter('rejected')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  statusFilter === 'rejected'
                    ? 'bg-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.3)]'
                    : 'text-rose-400/80 hover:text-rose-400 hover:bg-white/5'
                }`}
              >
                <X className="w-3.5 h-3.5" />
                <span>Recusados</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/30 font-mono">
                  {mainTab === 'affiliates_approval' ? rejectedAffiliatesCount : rejectedCompaniesCount}
                </span>
              </button>

              {/* Banidos */}
              <button
                onClick={() => setStatusFilter('banned')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  statusFilter === 'banned'
                    ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)]'
                    : 'text-red-400/80 hover:text-red-400 hover:bg-white/5'
                }`}
              >
                <Ban className="w-3.5 h-3.5" />
                <span>Banidos</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/30 font-mono">
                  {mainTab === 'affiliates_approval' ? bannedAffiliatesCount : bannedCompaniesCount}
                </span>
              </button>

              {/* Todos */}
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  statusFilter === 'all'
                    ? 'bg-white/20 text-white'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <span>Todos</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/30 font-mono">
                  {mainTab === 'affiliates_approval' ? allAffiliates.length : allCompanies.length}
                </span>
              </button>
            </div>
          </div>

          {/* LISTA DE AFILIADOS */}
          {mainTab === 'affiliates_approval' && (
            <div className="flex flex-col gap-4">
              {filteredAffiliates.length === 0 ? (
                <div className="py-16 text-center text-white/50 text-xs bg-[#080d1a] border border-white/10 rounded-2xl p-8 flex flex-col items-center justify-center">
                  <ShieldCheck className="w-10 h-10 text-white/20 mb-3" />
                  <p className="font-bold text-white/80 text-sm">
                    Nenhum cadastro de afiliado encontrado nesta aba ({statusFilter === 'pending' ? 'Pendentes' : statusFilter === 'approved' ? 'Aprovados' : statusFilter === 'rejected' ? 'Recusados' : statusFilter === 'banned' ? 'Banidos' : 'Todos'}).
                  </p>
                  <p className="text-white/40 mt-1 max-w-md">
                    {statusFilter === 'pending'
                      ? 'Quando os usuários preencherem seus dados na aba "Meu Perfil" e enviarem para validação, as solicitações aparecerão aqui imediatamente para sua aprovação.'
                      : 'Nenhum registro corresponde ao filtro selecionado.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {filteredAffiliates.map((req) => {
                    const currentStatus = getStatusOfVerification(req);
                    const isPending = currentStatus === 'pending';
                    const isApproved = currentStatus === 'approved';
                    const isRejected = currentStatus === 'rejected';
                    const isBanned = currentStatus === 'banned';
                    const targetId = req.userId || req.id;

                    return (
                      <div
                        key={req.id}
                        className={`bg-[#080d1a] border rounded-2xl p-6 shadow-xl flex flex-col justify-between transition-all ${
                          isBanned
                            ? 'border-red-600/50 bg-red-950/10'
                            : isPending
                              ? 'border-amber-500/40 hover:border-amber-500/70 shadow-[0_0_25px_rgba(245,158,11,0.08)]'
                              : isApproved
                                ? 'border-emerald-500/30 hover:border-emerald-500/50'
                                : 'border-rose-500/30 hover:border-rose-500/50'
                        }`}
                      >
                        <div>
                          {/* Header do Afiliado */}
                          <div className="flex items-start justify-between gap-4 pb-4 border-b border-white/10 mb-4">
                            <div className="flex items-center gap-3">
                              <img
                                src={req.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(req.userId || req.email || 'affiliate')}`}
                                alt={req.name}
                                className="w-12 h-12 rounded-full object-cover border-2 border-white/20"
                              />
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="text-base font-bold text-white font-['Syne']">
                                    {req.name || 'Usuário Sem Nome'}
                                  </h3>
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-[#D9F22A]/20 text-[#D9F22A] border border-[#D9F22A]/40">
                                    Afiliado
                                  </span>
                                  {isApproved && (
                                    <span className="p-0.5 rounded-full bg-emerald-500 text-black" title="Selo Verificado">
                                      <Check className="w-3 h-3 stroke-[3]" />
                                    </span>
                                  )}
                                </div>
                                <span className="text-xs text-white/50">{req.email}</span>
                              </div>
                            </div>

                            {/* Badge de Status */}
                            <div>
                              {isBanned ? (
                                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-600/20 text-red-400 border border-red-500/50 flex items-center gap-1.5 shadow-sm">
                                  <Ban className="w-3 h-3" />
                                  Conta Banida
                                </span>
                              ) : isPending ? (
                                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1.5 shadow-sm">
                                  <Clock className="w-3 h-3" />
                                  Aguardando Análise
                                </span>
                              ) : isApproved ? (
                                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                  {recentlyApprovedIds.has(targetId) && (
                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-400 text-black shadow-sm animate-pulse">
                                      ✓ Aprovado Agora
                                    </span>
                                  )}
                                  <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5 shadow-sm">
                                    <ShieldCheck className="w-3 h-3" />
                                    Aprovado & Verificado
                                  </span>
                                </div>
                              ) : (
                                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1.5 shadow-sm">
                                  <X className="w-3 h-3" />
                                  Recusado
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Dados Detalhados */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div className="bg-[#050811] p-3 rounded-xl border border-white/5">
                              <span className="text-[10px] font-bold text-white/40 uppercase block">CPF do Afiliado</span>
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

                            {/* Informações de Chave PIX se houver */}
                            {req.pixKey && (
                              <div className="bg-[#050811] p-3 rounded-xl border border-white/5 sm:col-span-2">
                                <span className="text-[10px] font-bold text-[#D9F22A] uppercase block">Chave PIX Cadastrada</span>
                                <span className="font-mono font-bold text-white mt-0.5 block">{req.pixKey} ({req.pixKeyType || 'Aleatória'})</span>
                              </div>
                            )}

                            {isBanned && req.banReason && (
                              <div className="bg-red-950/40 border border-red-500/40 p-3 rounded-xl sm:col-span-2 text-red-300 text-xs">
                                <strong className="flex items-center gap-1.5 text-red-400 mb-0.5">
                                  <Ban className="w-3.5 h-3.5" /> Motivo do Banimento:
                                </strong>
                                {req.banReason}
                              </div>
                            )}

                            {isRejected && req.rejectionReason && (
                              <div className="bg-rose-950/40 border border-rose-500/30 p-3 rounded-xl sm:col-span-2 text-rose-300 text-xs">
                                <strong>Motivo da Recusa:</strong> {req.rejectionReason}
                              </div>
                            )}

                            <div className="bg-[#050811] p-2.5 rounded-xl border border-white/5 sm:col-span-2 flex items-center justify-between text-[11px] text-white/40">
                              <span>Submetido: {req.submittedAt ? new Date(req.submittedAt).toLocaleString('pt-BR') : 'Recente'}</span>
                              <span className="font-mono">ID: {targetId}</span>
                            </div>
                          </div>
                        </div>

                        {/* Barra de Ações com Segurança */}
                        <div className="mt-5 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-2.5">
                          {/* Botão de Excluir Totalmente (Sempre acessível ao Admin) */}
                          <button
                            onClick={() => openPurgeModal({ id: targetId, name: req.name, email: req.email, type: 'user', document: req.cpf })}
                            className="px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                            title="Expurgar do banco de dados"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Excluir Total</span>
                          </button>

                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Se banido: botão de Desbanir */}
                            {isBanned ? (
                              <button
                                onClick={() => handleUnban({ id: targetId, name: req.name, email: req.email, type: 'user' })}
                                disabled={processingId === targetId}
                                className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5"
                              >
                                <Unlock className="w-3.5 h-3.5" />
                                <span>Desbanir Conta</span>
                              </button>
                            ) : (
                              /* Se não banido: botão de Banir */
                              <button
                                onClick={() => openBanModal({ id: targetId, name: req.name, email: req.email, type: 'user', document: req.cpf })}
                                className="px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                                title="Suspender acesso e banir"
                              >
                                <Ban className="w-3.5 h-3.5" />
                                <span>Banir</span>
                              </button>
                            )}

                            {/* Se pendente ou recusado: botões de aprovar/recusar */}
                            {!isApproved && !isBanned && (
                              <>
                                <button
                                  onClick={() => openRejectModal({ id: targetId, name: req.name || 'Afiliado', email: req.email, type: 'user' })}
                                  disabled={processingId === targetId}
                                  className="px-3.5 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  <span>Recusar</span>
                                </button>

                                <button
                                  onClick={() => handleApproveUser(targetId, req.name)}
                                  disabled={processingId === targetId}
                                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-black font-black text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
                                >
                                  {processingId === targetId ? (
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <ShieldCheck className="w-4 h-4" />
                                  )}
                                  <span>Aprovar Afiliado</span>
                                </button>
                              </>
                            )}

                            {/* Se aprovado: opção de solicitar ajuste */}
                            {isApproved && !isBanned && (
                              <button
                                onClick={() => openRejectModal({ id: targetId, name: req.name || 'Afiliado', email: req.email, type: 'user' })}
                                disabled={processingId === targetId}
                                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                              >
                                <span>Revogar / Solicitar Ajuste</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* LISTA DE EMPRESAS (STARTUPS) */}
          {mainTab === 'companies_approval' && (
            <div className="flex flex-col gap-4">
              {filteredCompanies.length === 0 ? (
                <div className="py-16 text-center text-white/50 text-xs bg-[#080d1a] border border-white/10 rounded-2xl p-8 flex flex-col items-center justify-center">
                  <Building2 className="w-10 h-10 text-white/20 mb-3" />
                  <p className="font-bold text-white/80 text-sm">
                    Nenhuma empresa encontrada nesta aba ({statusFilter === 'pending' ? 'Pendentes' : statusFilter === 'approved' ? 'Aprovadas' : statusFilter === 'rejected' ? 'Recusadas' : statusFilter === 'banned' ? 'Banidas' : 'Todas'}).
                  </p>
                  <p className="text-white/40 mt-1 max-w-md">
                    {statusFilter === 'pending'
                      ? 'Quando os usuários cadastrarem suas startups na plataforma LeadsPay, as solicitações aparecerão aqui com todos os dados (CNPJ/CPF, WhatsApp, email) para aprovação.'
                      : 'Nenhuma empresa corresponde ao filtro selecionado.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {filteredCompanies.map((comp) => {
                    const currentStatus = getStatusOfCompany(comp);
                    const isPending = currentStatus === 'pending';
                    const isApproved = currentStatus === 'approved';
                    const isRejected = currentStatus === 'rejected';
                    const isBanned = currentStatus === 'banned';

                    return (
                      <div
                        key={comp.id}
                        className={`bg-[#080d1a] border rounded-2xl p-6 shadow-xl flex flex-col justify-between transition-all ${
                          isBanned
                            ? 'border-red-600/50 bg-red-950/10'
                            : isPending
                              ? 'border-amber-500/40 hover:border-amber-500/70 shadow-[0_0_30px_rgba(245,158,11,0.09)]'
                              : isApproved
                                ? 'border-emerald-500/30 hover:border-emerald-500/50'
                                : 'border-rose-500/30 hover:border-rose-500/50'
                        }`}
                      >
                        <div>
                          {/* Header da Empresa */}
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
                                    {comp.category || 'Geral'}
                                  </span>
                                </div>
                                {comp.tagline && (
                                  <p className="text-xs text-white/60 line-clamp-1 mt-0.5">{comp.tagline}</p>
                                )}
                              </div>
                            </div>

                            {/* Badge de Status da Empresa */}
                            <div className="flex-shrink-0">
                              {isBanned ? (
                                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-600/20 text-red-400 border border-red-500/50 flex items-center gap-1.5 shadow-sm">
                                  <Ban className="w-3 h-3" />
                                  Empresa Banida
                                </span>
                              ) : isPending ? (
                                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1.5 shadow-sm">
                                  <Clock className="w-3 h-3" />
                                  Pendente de Análise
                                </span>
                              ) : isApproved ? (
                                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                  {recentlyApprovedIds.has(comp.id) && (
                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-400 text-black shadow-sm animate-pulse">
                                      ✓ Aprovada Agora
                                    </span>
                                  )}
                                  <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5 shadow-sm">
                                    <CheckCircle2 className="w-3 h-3" />
                                    Aprovada & Ativa
                                  </span>
                                </div>
                              ) : (
                                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1.5 shadow-sm">
                                  <X className="w-3 h-3" />
                                  Recusada
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Dados da Empresa */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div className="bg-[#050811] p-3 rounded-xl border border-white/5">
                              <span className="text-[10px] font-bold text-white/40 uppercase block">Documento da Empresa</span>
                              <span className="font-mono font-bold text-white mt-0.5 block">
                                {comp.cnpj ? `CNPJ: ${comp.cnpj}` : comp.cpf ? `CPF: ${comp.cpf}` : (comp as any).hasNoCnpj ? 'Pessoa Física (Sem CNPJ)' : 'Não informado'}
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
                                <span className="text-white mt-0.5 block truncate max-w-[180px]">{comp.email || 'Não informado'}</span>
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
                                <span className="text-[#D9F22A] mt-0.5 block truncate max-w-[180px]">{comp.website || 'Não informado'}</span>
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
                                {comp.description || comp.tagline || 'Nenhuma descrição detalhada informada.'}
                              </p>
                            </div>

                            <div className="bg-[#050811] p-3 rounded-xl border border-white/5 sm:col-span-2 flex items-center justify-between">
                              <div>
                                <span className="text-[10px] font-bold text-white/40 uppercase block">Faixa de Comissão Afiliados</span>
                                <span className="text-sm font-black text-[#D9F22A]">{comp.commissionRange || 'A definir'}</span>
                              </div>
                              <div className="text-right text-[11px] text-white/40">
                                <span>Solicitado por: <strong className="text-white/80">{comp.submittedByName || comp.name || 'Produtor'}</strong></span>
                                <span className="block">{comp.submittedAt ? new Date(comp.submittedAt).toLocaleString('pt-BR') : comp.createdAt ? new Date(comp.createdAt).toLocaleString('pt-BR') : 'Data recente'}</span>
                              </div>
                            </div>

                            {isBanned && comp.banReason && (
                              <div className="bg-red-950/40 border border-red-500/40 p-3 rounded-xl sm:col-span-2 text-red-300 text-xs">
                                <strong className="flex items-center gap-1.5 text-red-400 mb-0.5">
                                  <Ban className="w-3.5 h-3.5" /> Motivo do Banimento:
                                </strong>
                                {comp.banReason}
                              </div>
                            )}

                            {isRejected && comp.rejectionReason && (
                              <div className="bg-rose-950/40 border border-rose-500/30 p-3 rounded-xl sm:col-span-2 text-rose-300 text-xs">
                                <strong>Motivo da Recusa:</strong> {comp.rejectionReason}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Ações da Empresa */}
                        <div className="mt-5 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
                          {/* Exclusão Total da Empresa */}
                          <button
                            onClick={() => openPurgeModal({ id: comp.id, name: comp.name, email: comp.email, type: 'company', document: comp.cnpj || comp.cpf })}
                            className="px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                            title="Excluir Empresa Definitivamente"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Excluir Empresa</span>
                          </button>

                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Banir / Desbanir */}
                            {isBanned ? (
                              <button
                                onClick={() => handleUnban({ id: comp.id, name: comp.name, email: comp.email, type: 'company' })}
                                disabled={processingId === comp.id}
                                className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5"
                              >
                                <Unlock className="w-3.5 h-3.5" />
                                <span>Desbanir Empresa</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => openBanModal({ id: comp.id, name: comp.name, email: comp.email, type: 'company', document: comp.cnpj || comp.cpf })}
                                className="px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                                title="Suspender empresa do catálogo"
                              >
                                <Ban className="w-3.5 h-3.5" />
                                <span>Banir</span>
                              </button>
                            )}

                            {!isApproved && !isBanned && (
                              <>
                                <button
                                  onClick={() => openRejectModal({ id: comp.id, name: comp.name, email: comp.email, type: 'company' })}
                                  disabled={processingId === comp.id}
                                  className="px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  <span>Recusar</span>
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
                                  <span>Aprovar Empresa</span>
                                </button>
                              </>
                            )}

                            {isApproved && !isBanned && (
                              <button
                                onClick={() => openRejectModal({ id: comp.id, name: comp.name, email: comp.email, type: 'company' })}
                                disabled={processingId === comp.id}
                                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                              >
                                <span>Suspender / Solicitar Ajuste</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* EXPLORADOR DE BANCO DE DADOS (FIRESTORE) */}
      {mainTab === 'database_explorer' && (
        <div className="space-y-4">
          {/* Seletor de Coleções Firestore */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#080d1a] p-4 rounded-2xl border border-white/10">
            <div className="flex items-center gap-3">
              <label className="text-xs font-bold uppercase tracking-wider text-white/60">
                Coleção Firestore:
              </label>
              <select
                value={explorerCollection}
                onChange={(e) => setExplorerCollection(e.target.value)}
                className="bg-[#050811] border border-white/15 text-white font-mono text-xs px-3 py-2 rounded-xl focus:outline-none focus:border-[#D9F22A]"
              >
                <option value={COLLECTIONS.PROFILES}>Perfis de Usuário ({COLLECTIONS.PROFILES})</option>
                <option value={COLLECTIONS.PLANS}>Planos e Produtos ({COLLECTIONS.PLANS})</option>
                <option value={COLLECTIONS.AFFILIATIONS}>Afiliações Ativas ({COLLECTIONS.AFFILIATIONS})</option>
                <option value={COLLECTIONS.SALES}>Histórico de Vendas ({COLLECTIONS.SALES})</option>
                <option value={COLLECTIONS.WITHDRAWALS}>Saques PIX ({COLLECTIONS.WITHDRAWALS})</option>
                <option value={COLLECTIONS.TEAM}>Equipe de Vendedores ({COLLECTIONS.TEAM})</option>
                <option value="settings">Configurações Gerais (settings)</option>
              </select>
            </div>

            <div className="relative flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar no JSON..."
                className="w-full bg-[#050811] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#D9F22A]"
              />
            </div>
          </div>

          {/* Registros Brutos da Coleção */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {loading ? (
              <div className="col-span-2 py-16 text-center text-white/50 text-xs flex flex-col items-center gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-[#D9F22A]" />
                Carregando documentos da coleção...
              </div>
            ) : documents.length === 0 ? (
              <div className="col-span-2 py-16 text-center text-white/40 text-xs bg-[#080d1a] border border-white/5 rounded-2xl">
                Nenhum documento encontrado nesta coleção Firestore.
              </div>
            ) : (
              documents
                .filter(docItem => !searchTerm || JSON.stringify(docItem).toLowerCase().includes(searchTerm.toLowerCase()))
                .map((item) => (
                  <div
                    key={item._id}
                    className="bg-[#080d1a] border border-white/10 rounded-2xl p-5 shadow-lg flex flex-col justify-between hover:border-[#D9F22A]/40 transition-colors"
                  >
                    <div>
                      <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] uppercase font-bold text-[#D9F22A] bg-[#D9F22A]/10 px-2 py-0.5 rounded">
                            ID
                          </span>
                          <span className="font-mono text-xs font-bold text-white truncate max-w-[180px]">
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
                            onClick={async () => {
                              if (!confirm(`Excluir documento ${item._id}?`)) return;
                              await deleteDoc(doc(db, explorerCollection, item._id));
                              setDocuments(prev => prev.filter(d => d._id !== item._id));
                            }}
                            className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 cursor-pointer"
                            title="Excluir Documento"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <pre className="text-[11px] font-mono text-white/80 bg-[#050811] p-3 rounded-xl overflow-x-auto max-h-56 scrollbar-thin border border-white/5">
                        {JSON.stringify(item, null, 2)}
                      </pre>
                    </div>

                    <div className="text-[10px] text-white/40 mt-3 pt-2 border-t border-white/5 flex justify-between">
                      <span>{item.title || item.name || item.platformName || item.email || 'Documento'}</span>
                      {copiedId === item._id && <span className="text-[#D9F22A] font-bold">Copiado!</span>}
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      )}

      {/* ================= MODAL DE SEGURANÇA 1: BANIMENTO ================= */}
      {banModal.isOpen && banModal.target && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#080d1a] border border-red-500/40 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 flex-shrink-0">
                <Ban className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                  Bloqueio de Acesso
                </span>
                <h3 className="text-lg font-black text-white font-['Syne'] mt-0.5">
                  Banir {banModal.target.type === 'user' ? 'Conta de Afiliado' : 'Empresa / Produtor'}
                </h3>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#050811] border border-white/10 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-white/40">Nome:</span>
                <strong className="text-white">{banModal.target.name}</strong>
              </div>
              {banModal.target.email && (
                <div className="flex justify-between">
                  <span className="text-white/40">E-mail:</span>
                  <span className="text-white font-mono">{banModal.target.email}</span>
                </div>
              )}
              {banModal.target.document && (
                <div className="flex justify-between">
                  <span className="text-white/40">Documento:</span>
                  <span className="text-white font-mono">{banModal.target.document}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-white/40">ID:</span>
                <span className="text-white/60 font-mono text-[10px] truncate max-w-[180px]">{banModal.target.id}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-white/80">
                Motivo do Banimento:
              </label>
              <textarea
                value={banModal.reason}
                onChange={(e) => setBanModal(prev => ({ ...prev, reason: e.target.value }))}
                rows={3}
                placeholder="Informe o motivo da suspensão..."
                className="w-full px-3.5 py-2.5 bg-[#050811] border border-white/15 rounded-xl text-white text-xs focus:outline-none focus:border-red-500 transition-colors"
              />
              <p className="text-[10px] text-white/40">
                Esta justificativa será registrada no histórico e impedirá logins e movimentações financeiras.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setBanModal({ isOpen: false, target: null, reason: '', isProcessing: false })}
                disabled={banModal.isProcessing}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-xs font-bold transition-all cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleConfirmBan}
                disabled={banModal.isProcessing || !banModal.reason.trim()}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(220,38,38,0.4)] transition-all cursor-pointer flex items-center gap-2"
              >
                {banModal.isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Bloqueando...</span>
                  </>
                ) : (
                  <>
                    <Ban className="w-4 h-4" />
                    <span>Confirmar Banimento</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL DE SEGURANÇA 2: EXCLUSÃO TOTAL (PURGE) ================= */}
      {purgeModal.isOpen && purgeModal.target && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#0c0507] border-2 border-red-600 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-[0_0_50px_rgba(220,38,38,0.3)] space-y-5">
            {/* Header de Perigo */}
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-red-600/20 border-2 border-red-500 flex items-center justify-center text-red-500 flex-shrink-0 animate-pulse">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-white bg-red-600 px-2.5 py-0.5 rounded-full shadow-sm">
                  ZONA DE PERIGO EXTREMO
                </span>
                <h3 className="text-xl font-black text-white font-['Syne'] mt-1">
                  Exclusão Total e Permanente
                </h3>
                <p className="text-xs text-red-300/80 mt-0.5">
                  Esta ação é irreversível e expurgará todos os dados do banco.
                </p>
              </div>
            </div>

            {/* O que será apagado */}
            <div className="p-4 rounded-2xl bg-red-950/30 border border-red-600/30 text-xs space-y-2 text-red-200">
              <span className="font-bold block uppercase tracking-wider text-[11px] text-red-400">
                Os seguintes dados serão apagados para sempre:
              </span>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-white/80">
                <li>Perfil e credenciais de acesso ({purgeModal.target.email || 'E-mail cadastrado'})</li>
                <li>Documentos e registros de KYC no Firestore</li>
                {purgeModal.target.type === 'company' && (
                  <>
                    <li>Registro da empresa e dados cadastrais no catálogo</li>
                    <li>Planos, produtos e links de afiliação vinculados</li>
                  </>
                )}
                <li>Histórico de afiliações e comissões da conta</li>
              </ul>
            </div>

            {/* Detalhes do Alvo */}
            <div className="p-3.5 rounded-xl bg-black/50 border border-white/10 text-xs font-mono space-y-1">
              <div className="text-white font-bold">{purgeModal.target.name}</div>
              <div className="text-white/60 text-[11px]">E-mail: {purgeModal.target.email || 'N/A'}</div>
              <div className="text-white/40 text-[10px]">ID: {purgeModal.target.id}</div>
            </div>

            {/* Input de Confirmação por Texto */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-white">
                <span>Confirmação de Segurança:</span>
                <button
                  type="button"
                  onClick={() => setPurgeModal(prev => ({ ...prev, confirmationInput: 'EXCLUIR' }))}
                  className="text-[10px] text-red-400 hover:text-red-300 underline cursor-pointer normal-case"
                >
                  ⚡ Preencher "EXCLUIR"
                </button>
              </div>
              <input
                type="text"
                value={purgeModal.confirmationInput}
                onChange={(e) => setPurgeModal(prev => ({ ...prev, confirmationInput: e.target.value }))}
                placeholder="Digite EXCLUIR para liberar o botão"
                className="w-full px-4 py-3 bg-black border-2 border-red-500/40 rounded-xl text-white font-mono font-bold text-center tracking-widest text-sm focus:outline-none focus:border-red-500 transition-colors uppercase"
              />
            </div>

            {/* Botões */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPurgeModal({ isOpen: false, target: null, confirmationInput: '', isProcessing: false })}
                disabled={purgeModal.isProcessing}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-xs font-bold transition-all cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleConfirmPurge}
                disabled={purgeModal.isProcessing || purgeModal.confirmationInput.trim().toUpperCase() !== 'EXCLUIR'}
                className="px-6 py-3 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:hover:bg-red-600 text-white font-black text-xs uppercase tracking-wider shadow-[0_0_25px_rgba(220,38,38,0.5)] transition-all cursor-pointer flex items-center gap-2"
              >
                {purgeModal.isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Excluindo do Banco...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Excluir Definitivamente</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL DE RECUSA / SOLICITAÇÃO DE AJUSTE ================= */}
      {rejectModal.isOpen && rejectModal.target && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#12080a] border border-rose-500/40 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-[0_0_50px_rgba(244,63,94,0.25)] space-y-5">
            {/* Header */}
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 flex-shrink-0">
                <X className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-rose-400 bg-rose-950/60 border border-rose-800/40 px-2.5 py-0.5 rounded-full">
                  {rejectModal.target.type === 'company' ? 'Empresa / Produtor' : 'Afiliado'}
                </span>
                <h3 className="text-xl font-black text-white font-['Syne'] mt-1">
                  Recusar / Solicitar Ajuste
                </h3>
                <p className="text-xs text-white/60 mt-0.5">
                  Informe ao usuário o motivo para que ele possa regularizar seu cadastro.
                </p>
              </div>
            </div>

            {/* Target Info */}
            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 text-xs space-y-1">
              <div className="text-white font-bold">{rejectModal.target.name}</div>
              {rejectModal.target.email && (
                <div className="text-white/60 text-[11px]">E-mail: {rejectModal.target.email}</div>
              )}
              <div className="text-white/40 text-[10px] font-mono">ID: {rejectModal.target.id}</div>
            </div>

            {/* Sugestões rápidas de motivos */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-white/70 uppercase tracking-wider block">
                Sugestões Rápidas:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Dados cadastrais necessitam de ajuste ou confirmação.',
                  'Documento de identificação ilegível ou incompleto.',
                  'Chave PIX divergente do titular cadastrado.',
                  'CNPJ ou dados societários necessitam de revisão.'
                ].map((sug, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setRejectModal(prev => ({ ...prev, reason: sug }))}
                    className="text-[10px] px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/5 transition-all text-left"
                  >
                    {sug}
                  </button>
                ))}
              </div>
            </div>

            {/* Motivo detalhado */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-white uppercase tracking-wider block">
                Motivo da Recusa / Ajuste Necessário:
              </label>
              <textarea
                value={rejectModal.reason}
                onChange={(e) => setRejectModal(prev => ({ ...prev, reason: e.target.value }))}
                rows={3}
                placeholder="Descreva claramente o que o usuário precisa corrigir..."
                className="w-full px-3.5 py-2.5 bg-black/60 border border-rose-500/30 rounded-xl text-white text-xs focus:outline-none focus:border-rose-500 transition-colors placeholder:text-white/30 resize-none"
              />
            </div>

            {/* Ações */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRejectModal({ isOpen: false, target: null, reason: '', isProcessing: false })}
                disabled={rejectModal.isProcessing}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-xs font-bold transition-all cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={rejectModal.isProcessing || !rejectModal.reason.trim()}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(225,29,72,0.3)] transition-all cursor-pointer flex items-center gap-2"
              >
                {rejectModal.isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Processando...</span>
                  </>
                ) : (
                  <>
                    <X className="w-4 h-4" />
                    <span>Confirmar Recusa</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
