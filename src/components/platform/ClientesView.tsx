import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  Copy, 
  Check, 
  Mail, 
  Phone, 
  FileText, 
  Calendar, 
  DollarSign, 
  ShoppingBag, 
  ExternalLink,
  Trash2,
  X,
  MessageCircle,
  Building2,
  ArrowUpDown
} from 'lucide-react';
import { PlatformClient, CompanyStartup } from '../../types/platform';
import { 
  subscribeClients, 
  createManualClientInFirebase, 
  deleteClientInFirebase 
} from '../../services/firestoreService';

interface ClientesViewProps {
  companies?: CompanyStartup[];
  activeCompanyId?: string;
  userRole?: string;
}

export const ClientesView: React.FC<ClientesViewProps> = ({
  companies = [],
  activeCompanyId,
  userRole
}) => {
  const [clients, setClients] = useState<PlatformClient[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState<string>(activeCompanyId || 'all');

  // Manual Client Form State
  const [formName, setFormName] = useState<string>('');
  const [formEmail, setFormEmail] = useState<string>('');
  const [formPhone, setFormPhone] = useState<string>('');
  const [formDoc, setFormDoc] = useState<string>('');
  const [formCompanyId, setFormCompanyId] = useState<string>(activeCompanyId || companies[0]?.id || 'store_default');
  const [formSpent, setFormSpent] = useState<string>('0');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Subscribe to real clients from Firestore
  useEffect(() => {
    setLoading(true);
    const targetStore = selectedCompanyFilter !== 'all' ? selectedCompanyFilter : undefined;
    const unsub = subscribeClients(targetStore, (list) => {
      setClients(list);
      setLoading(false);
    });

    return () => unsub();
  }, [selectedCompanyFilter]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Deseja remover o cliente "${name}" da sua base de dados?`)) return;
    try {
      await deleteClientInFirebase(id);
    } catch (err: any) {
      alert(`Erro ao remover cliente: ${err.message}`);
    }
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formEmail.trim()) {
      alert('Preencha ao menos o nome completo e o e-mail do cliente.');
      return;
    }

    setIsSubmitting(true);
    try {
      await createManualClientInFirebase({
        store_id: formCompanyId,
        name: formName.trim(),
        email: formEmail.trim(),
        phone: formPhone.trim(),
        document: formDoc.replace(/\D/g, ''),
        total_spent: parseFloat(formSpent) || 0,
        orders_count: 1,
        last_plan_name: 'Cadastro Manual',
        is_test: false,
        environment: 'production'
      });

      setIsModalOpen(false);
      setFormName('');
      setFormEmail('');
      setFormPhone('');
      setFormDoc('');
      setFormSpent('0');
    } catch (err: any) {
      alert(`Erro ao cadastrar cliente: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredClients = clients.filter(c => {
    if (selectedCompanyFilter !== 'all' && c.store_id !== selectedCompanyFilter) return false;
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      (c.phone && c.phone.includes(q)) ||
      (c.document && c.document.includes(q)) ||
      c.id.toLowerCase().includes(q)
    );
  });

  const totalClientsCount = clients.length;
  const totalVolume = clients.reduce((acc, c) => acc + (c.total_spent || 0), 0);
  const avgTicket = totalClientsCount > 0 ? totalVolume / totalClientsCount : 0;
  const activeOrdersCount = clients.reduce((acc, c) => acc + (c.orders_count || 1), 0);

  return (
    <div className="space-y-6 animate-fadeIn" id="leadspay-clientes-module">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#D9F22A] mb-1">
            <Users className="w-4 h-4" />
            Base de Contatos & Compradores
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-['Syne']">
            Clientes da Empresa
          </h1>
          <p className="text-xs text-white/60 mt-1 max-w-xl">
            Compradores capturados automaticamente pelos checkouts e cadastros manuais para remarketing, suporte e gestão de relacionamento.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#D9F22A] hover:bg-[#cbe327] text-[#060A15] font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(217,242,42,0.2)] cursor-pointer"
            id="btn-add-client-manual"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            + Cadastrar Cliente
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[#080d1a] border border-white/10">
          <span className="text-[11px] font-bold uppercase tracking-wider text-white/50 block">Total de Clientes</span>
          <div className="text-2xl font-black text-white font-['Syne'] mt-1">
            {totalClientsCount}
          </div>
          <span className="text-[11px] text-[#D9F22A] font-semibold mt-1 block">
            Base sincronizada via Checkout
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[#080d1a] border border-white/10">
          <span className="text-[11px] font-bold uppercase tracking-wider text-white/50 block">Volume Total Faturado</span>
          <div className="text-2xl font-black text-emerald-400 font-['Syne'] mt-1">
            R$ {totalVolume.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-white/40 mt-1 block">
            Compras aprovadas
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[#080d1a] border border-white/10">
          <span className="text-[11px] font-bold uppercase tracking-wider text-white/50 block">Ticket Médio</span>
          <div className="text-2xl font-black text-white font-['Syne'] mt-1">
            R$ {avgTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-white/40 mt-1 block">Por comprador ativo</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#080d1a] border border-white/10">
          <span className="text-[11px] font-bold uppercase tracking-wider text-white/50 block">Pedidos Realizados</span>
          <div className="text-2xl font-black text-[#D9F22A] font-['Syne'] mt-1">
            {activeOrdersCount}
          </div>
          <span className="text-[11px] text-emerald-400 mt-1 block">Frequência e retenção</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-[#080d1a] border border-white/10 p-4 rounded-2xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nome, e-mail, celular, CPF/CNPJ ou ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#050811] border border-white/15 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#D9F22A]"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {companies.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/50 font-bold whitespace-nowrap">Empresa:</span>
              <select
                value={selectedCompanyFilter}
                onChange={(e) => setSelectedCompanyFilter(e.target.value)}
                className="bg-[#050811] border border-white/15 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[#D9F22A]"
              >
                <option value="all">Todas as Empresas</option>
                {companies.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Clients Table */}
      <div className="bg-[#080d1a] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-white/50 text-xs flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-[#D9F22A] border-t-transparent animate-spin" />
            Carregando lista de clientes...
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 mb-3">
              <Users className="w-7 h-7 text-[#D9F22A]/60" />
            </div>
            <h3 className="text-base font-bold text-white font-['Syne']">
              Nenhum cliente cadastrado ainda
            </h3>
            <p className="text-xs text-white/50 max-w-md mt-1.5">
              Assim que compradores realizarem pagamentos aprovados no seu checkout ou você registrar manualmente, os clientes serão exibidos aqui com todos os dados.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="mt-4 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-colors cursor-pointer"
            >
              + Cadastrar Primeiro Cliente
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[760px]">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02] text-white/50 uppercase tracking-wider font-bold">
                  <th className="p-4">ID do Cliente</th>
                  <th className="p-4">Nome & Documento</th>
                  <th className="p-4">E-mail & Celular</th>
                  <th className="p-4">Total Gasto / Pedidos</th>
                  <th className="p-4">Data de Criação</th>
                  <th className="p-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredClients.map((client) => {
                  const cleanPhone = (client.phone || '').replace(/\D/g, '');
                  const whatsappUrl = cleanPhone ? `https://wa.me/55${cleanPhone}` : null;
                  const dateFormatted = client.created_at ? new Date(client.created_at).toLocaleDateString('pt-BR') : '-';

                  return (
                    <tr key={client.id} className="hover:bg-white/[0.02] transition-colors">
                      {/* Client ID */}
                      <td className="p-4 font-mono text-[11px] text-white/60">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate max-w-[120px]">{client.id}</span>
                          {((client as any).is_test || (client as any).environment === 'development') && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase">
                              Sandbox
                            </span>
                          )}
                          <button
                            onClick={() => handleCopy(client.id, client.id)}
                            className="text-white/40 hover:text-[#D9F22A] transition-colors p-1"
                            title="Copiar ID"
                          >
                            {copiedId === client.id ? <Check className="w-3.5 h-3.5 text-[#D9F22A]" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>

                      {/* Name & Document */}
                      <td className="p-4">
                        <div className="font-bold text-white text-sm">{client.name}</div>
                        {client.document ? (
                          <div className="text-[11px] text-white/40 font-mono flex items-center gap-1 mt-0.5">
                            <FileText className="w-3 h-3" />
                            {client.document.length === 11 
                              ? client.document.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') 
                              : client.document}
                          </div>
                        ) : (
                          <span className="text-[10px] text-white/30">Sem documento</span>
                        )}
                      </td>

                      {/* Email & Phone */}
                      <td className="p-4">
                        <div className="flex items-center gap-1.5 text-white/80">
                          <Mail className="w-3.5 h-3.5 text-white/40 flex-shrink-0" />
                          <span className="truncate max-w-[200px]">{client.email}</span>
                        </div>
                        {client.phone && (
                          <div className="flex items-center gap-1.5 text-white/50 text-[11px] mt-1 font-mono">
                            <Phone className="w-3 h-3 text-white/40 flex-shrink-0" />
                            <span>{client.phone}</span>
                            {whatsappUrl && (
                              <a
                                href={whatsappUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-emerald-400 hover:text-emerald-300 ml-1 inline-flex items-center gap-0.5 text-[10px]"
                                title="Abrir WhatsApp"
                              >
                                <MessageCircle className="w-3 h-3" />
                                WhatsApp
                              </a>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Total Spent & Orders */}
                      <td className="p-4">
                        <div className="font-bold text-emerald-400 font-mono text-xs">
                          R$ {(client.total_spent || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-[10px] text-white/40 mt-0.5">
                          {client.orders_count || 1} pedido(s)
                          {client.last_plan_name && ` • ${client.last_plan_name}`}
                        </div>
                      </td>

                      {/* Created At */}
                      <td className="p-4 text-white/60 font-mono text-[11px]">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-white/40" />
                          {dateFormatted}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-right">
                        <button
                          onClick={() => handleDelete(client.id, client.name)}
                          className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors cursor-pointer"
                          title="Excluir cliente"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

      {/* Modal: Cadastrar Cliente Manualmente */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-[#080d1a] border border-[#D9F22A]/40 rounded-3xl p-6 sm:p-7 shadow-[0_0_50px_rgba(217,242,42,0.15)]">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 text-white/50 hover:text-white transition-colors cursor-pointer w-8 h-8 rounded-full bg-white/5 flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-[#D9F22A]/10 text-[#D9F22A] flex items-center justify-center">
                <Plus className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <h2 className="text-lg font-black text-white font-['Syne']">
                  Cadastrar Novo Cliente
                </h2>
                <p className="text-xs text-white/50">
                  Adicione um comprador manualmente para sua base da LeadsPay
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateClient} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-white/70 block mb-1.5">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Carlos Eduardo da Silva"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-[#050811] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#D9F22A]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-white/70 block mb-1.5">
                  E-mail do Cliente *
                </label>
                <input
                  type="email"
                  required
                  placeholder="cliente@exemplo.com"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full bg-[#050811] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#D9F22A]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-white/70 block mb-1.5">
                    Celular / WhatsApp
                  </label>
                  <input
                    type="text"
                    placeholder="(11) 99999-9999"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full bg-[#050811] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#D9F22A]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-white/70 block mb-1.5">
                    CPF ou CNPJ
                  </label>
                  <input
                    type="text"
                    placeholder="000.000.000-00"
                    value={formDoc}
                    onChange={(e) => setFormDoc(e.target.value)}
                    className="w-full bg-[#050811] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#D9F22A]"
                  />
                </div>
              </div>

              {companies.length > 0 && (
                <div>
                  <label className="text-xs font-bold text-white/70 block mb-1.5">
                    Vincular à Empresa
                  </label>
                  <select
                    value={formCompanyId}
                    onChange={(e) => setFormCompanyId(e.target.value)}
                    className="w-full bg-[#050811] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#D9F22A]"
                  >
                    {companies.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-white/70 block mb-1.5">
                  Valor Histórico de Compras (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formSpent}
                  onChange={(e) => setFormSpent(e.target.value)}
                  className="w-full bg-[#050811] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#D9F22A]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-[#D9F22A] hover:bg-[#cbe327] text-[#060A15] font-black text-xs uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Salvando...' : 'Cadastrar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
