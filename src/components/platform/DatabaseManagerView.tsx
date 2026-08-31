import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { COLLECTIONS, clearAllFirestoreData } from '../../services/firestoreService';
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
  AlertTriangle
} from 'lucide-react';
import firebaseConfig from '../../../firebase-applet-config.json';

export const DatabaseManagerView: React.FC = () => {
  const [activeCollection, setActiveCollection] = useState<string>(COLLECTIONS.COMPANIES);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  const filteredDocs = documents.filter((docItem) => {
    if (!searchTerm) return true;
    const str = JSON.stringify(docItem).toLowerCase();
    return str.includes(searchTerm.toLowerCase());
  });

  const collectionTabs = [
    { key: COLLECTIONS.COMPANIES, label: 'Empresas & Startups' },
    { key: COLLECTIONS.PLANS, label: 'Planos & Comissões' },
    { key: COLLECTIONS.AFFILIATIONS, label: 'Afiliações de Usuários' },
    { key: COLLECTIONS.SALES, label: 'Vendas & Comissões' },
    { key: COLLECTIONS.WITHDRAWALS, label: 'Saques PIX' },
    { key: COLLECTIONS.PROFILES, label: 'Perfil de Usuário' },
    { key: COLLECTIONS.TEAM, label: 'Equipe de Vendedores' }
  ];

  return (
    <div className="flex flex-col gap-6" id="techify-firebase-database-view">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-bold tracking-widest text-[#D9F22A] uppercase">
              Sincronização em Nuvem Ativa (D+0)
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-['Syne'] mt-1">
            Gerenciador de Banco de Dados & Registros
          </h1>
          <p className="text-xs text-white/60 mt-1">
            Persistência em tempo real de empresas, planos, comissões de afiliados e transações de venda.
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
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2">
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
          <span className="text-[10px] text-white/50 uppercase font-bold block">Engine de Persistência</span>
          <span className="text-xs font-mono font-bold text-[#D9F22A] mt-1 block truncate">
            {firebaseConfig.firestoreDatabaseId || 'cluster-prod-main'}
          </span>
        </div>
        <div className="bg-[#080d1a] border border-white/10 p-4 rounded-xl">
          <span className="text-[10px] text-white/50 uppercase font-bold block">Status da Conexão</span>
          <span className="text-xs font-bold text-emerald-400 mt-1 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4" /> Servidor Online (Operacional)
          </span>
        </div>
      </div>

      {/* Collection Selection Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-3">
        {collectionTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveCollection(tab.key)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeCollection === tab.key
                ? 'bg-[#D9F22A] text-[#060A15] shadow-[0_0_15px_rgba(217,242,42,0.3)]'
                : 'bg-[#080d1a] text-white/70 hover:text-white border border-white/10'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search & Document Count Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#080d1a] border border-white/10 p-4 rounded-2xl">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            placeholder={`Buscar em ${activeCollection}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#050811] border border-white/15 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#D9F22A]"
          />
        </div>

        <div className="flex items-center gap-3 text-xs text-white/60">
          <span>Coleção: <strong className="text-white font-mono">{activeCollection}</strong></span>
          <span>•</span>
          <span>Total: <strong className="text-[#D9F22A] font-bold">{filteredDocs.length} documentos</strong></span>
        </div>
      </div>

      {/* Document Explorer Grid / Cards */}
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
    </div>
  );
};
