import React, { useState, useEffect } from 'react';
import { 
  Upload, 
  Link as LinkIcon, 
  Trash2, 
  CheckCircle2, 
  Image as ImageIcon, 
  Eye, 
  RefreshCw, 
  Save, 
  ShieldCheck, 
  Sliders, 
  Layers, 
  Sparkles,
  ExternalLink,
  AlertCircle,
  HelpCircle,
  X
} from 'lucide-react';
import { 
  subscribeAuthModalSettings, 
  saveAuthModalSettings, 
  AuthModalSettings 
} from '../../services/firestoreService';
import { useAuth } from '../../context/AuthContext';
import { AuthScreenModal, AuthModalType } from '../auth/AuthScreenModal';

export const AdminModalImagesManager: React.FC = () => {
  const { currentUser } = useAuth();

  const [settings, setSettings] = useState<AuthModalSettings>({
    affiliateShowcaseUrl: '',
    companyShowcaseUrl: '',
    loginShowcaseUrl: '',
    forgotPasswordShowcaseUrl: '',
    displayMode: 'side_showcase',
    enableRightShowcase: true,
    showFloatingBadges: true
  });

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [activePreviewModal, setActivePreviewModal] = useState<AuthModalType | null>(null);

  // Subscribe to real-time settings
  useEffect(() => {
    const unsub = subscribeAuthModalSettings((data) => {
      if (data) {
        setSettings({
          affiliateShowcaseUrl: data.affiliateShowcaseUrl || '',
          companyShowcaseUrl: data.companyShowcaseUrl || '',
          loginShowcaseUrl: data.loginShowcaseUrl || '',
          forgotPasswordShowcaseUrl: data.forgotPasswordShowcaseUrl || '',
          displayMode: data.displayMode || 'side_showcase',
          enableRightShowcase: data.enableRightShowcase !== false,
          showFloatingBadges: data.showFloatingBadges !== false
        });
      }
    });
    return () => unsub();
  }, []);

  // Handle file reader to Base64
  const handleFileSlotUpload = (slot: keyof AuthModalSettings, file?: File) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFeedback({
        type: 'error',
        message: 'Por favor, selecione um arquivo de imagem válido (PNG, JPG, WebP, SVG).'
      });
      return;
    }

    // Limit 3MB to guarantee fast loading
    if (file.size > 3.5 * 1024 * 1024) {
      setFeedback({
        type: 'error',
        message: 'A imagem deve ter no máximo 3.5MB para não sobrecarregar o carregamento.'
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setSettings(prev => ({
        ...prev,
        [slot]: result
      }));
      setFeedback({
        type: 'success',
        message: `Imagem carregada para o campo! Clique em "Salvar Alterações" para confirmar no banco.`
      });
      setTimeout(() => setFeedback(null), 4000);
    };
    reader.onerror = () => {
      setFeedback({
        type: 'error',
        message: 'Erro ao converter a imagem selecionada.'
      });
    };
    reader.readAsDataURL(file);
  };

  // Handle Save
  const handleSaveAll = async () => {
    setIsSaving(true);
    setFeedback(null);
    try {
      await saveAuthModalSettings(settings, currentUser?.email || 'admin');
      setFeedback({
        type: 'success',
        message: 'Imagens e configurações dos modais salvas com sucesso no banco de dados!'
      });
      setTimeout(() => setFeedback(null), 5000);
    } catch (err: any) {
      console.error('Erro ao salvar imagens dos modais:', err);
      setFeedback({
        type: 'error',
        message: `Falha ao salvar: ${err.message || 'Verifique as permissões'}`
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Slot cleaner
  const handleClearSlot = (slot: keyof AuthModalSettings) => {
    setSettings(prev => ({
      ...prev,
      [slot]: ''
    }));
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Top Banner & Title */}
      <div className="bg-[#080d1a] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#D9F22A]/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D9F22A]/10 border border-[#D9F22A]/20 text-[#D9F22A] text-xs font-bold uppercase tracking-wider">
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Painel de Customização Visual</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white font-['Syne'] tracking-tight">
              Imagens & Fundos dos Modais
            </h2>
            <p className="text-sm text-white/60 max-w-2xl leading-relaxed">
              Faça o upload manual ou cole a URL de qualquer imagem para preencher o visual dos modais de Afiliado, Empresa e Login. Tudo funciona em tempo real com persistência no Firestore.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleSaveAll}
              disabled={isSaving}
              className="inline-flex items-center gap-2 bg-[#D9F22A] hover:bg-[#cbe31c] active:scale-[0.98] text-[#060A15] font-black py-3.5 px-7 rounded-2xl text-xs sm:text-sm uppercase tracking-wider shadow-[0_0_25px_rgba(217,242,42,0.3)] transition-all cursor-pointer disabled:opacity-60"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Salvando no Banco...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Salvar Alterações</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div className={`mt-6 p-4 rounded-2xl border flex items-center gap-3 animate-in fade-in duration-150 ${
            feedback.type === 'success' 
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}>
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
            )}
            <span className="text-xs font-semibold">{feedback.message}</span>
          </div>
        )}
      </div>

      {/* Global Display Controls */}
      <div className="bg-[#080d1a] border border-white/10 rounded-3xl p-6 shadow-xl space-y-5">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#D9F22A]">
          <Sliders className="w-4 h-4" />
          <span>Preferências de Exibição</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Toggle Right Showcase */}
          <div className="p-4 rounded-2xl bg-[#050811] border border-white/5 flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-white block">Coluna Lateral com Imagem</span>
              <span className="text-[11px] text-white/50 block">Exibe a imagem ao lado do formulário em telas médias/grandes</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.enableRightShowcase}
                onChange={(e) => setSettings(prev => ({ ...prev, enableRightShowcase: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#D9F22A]"></div>
            </label>
          </div>

          {/* Toggle Floating Badges */}
          <div className="p-4 rounded-2xl bg-[#050811] border border-white/5 flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-white block">Selos Flutuantes (Badges)</span>
              <span className="text-[11px] text-white/50 block">Exibir badges como "Mais Segurança" e "Pagamentos Rápidos"</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.showFloatingBadges}
                onChange={(e) => setSettings(prev => ({ ...prev, showFloatingBadges: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#D9F22A]"></div>
            </label>
          </div>

          {/* Display Mode */}
          <div className="p-4 rounded-2xl bg-[#050811] border border-white/5 flex flex-col justify-between gap-2">
            <span className="text-xs font-bold text-white">Modo de Exibição</span>
            <select
              value={settings.displayMode}
              onChange={(e) => setSettings(prev => ({ ...prev, displayMode: e.target.value as any }))}
              className="bg-[#0a1122] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none cursor-pointer focus:border-[#D9F22A]"
            >
              <option value="side_showcase">Showcase Lateral (Padrão)</option>
              <option value="modal_background">Fundo Completo do Modal</option>
              <option value="both">Ambos (Lateral + Fundo translúcido)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid of 4 Image Slots */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* SLOT 1: MODAL DE LOGIN */}
        <div className="bg-[#080d1a] border border-white/10 rounded-3xl p-6 shadow-xl flex flex-col justify-between gap-5 relative overflow-hidden">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-lime-500/10 text-[#a3e635] flex items-center justify-center font-bold text-xs">
                  1
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Tela de Login / Acesso</h3>
                  <span className="text-[10px] text-white/50">Exibida quando o usuário clica em "Entrar"</span>
                </div>
              </div>

              {settings.loginShowcaseUrl ? (
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                  Imagem Ativa
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-full bg-white/5 text-white/40 text-[10px] font-medium">
                  Sem Imagem (Padrão)
                </span>
              )}
            </div>

            {/* Preview Box */}
            <div className="w-full h-48 rounded-2xl bg-[#040810] border border-white/10 relative overflow-hidden flex items-center justify-center group">
              {settings.loginShowcaseUrl ? (
                <>
                  <img
                    src={settings.loginShowcaseUrl}
                    alt="Preview Login"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActivePreviewModal('login')}
                      className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-md text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Visualizar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleClearSlot('loginShowcaseUrl')}
                      className="px-3 py-1.5 rounded-xl bg-rose-500/80 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Remover
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center p-4">
                  <ImageIcon className="w-8 h-8 text-white/20 mx-auto mb-2" />
                  <span className="text-xs text-white/40 block">Nenhuma imagem customizada</span>
                  <span className="text-[10px] text-white/30 block mt-0.5">Faça upload ou cole um link abaixo</span>
                </div>
              )}
            </div>

            {/* Upload & URL Inputs */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-white/70 uppercase tracking-wider block">
                Arquivo de Imagem (Local)
              </label>
              <label className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl border border-dashed border-white/20 hover:border-[#D9F22A] bg-white/[0.02] hover:bg-white/[0.05] text-xs text-white/80 cursor-pointer transition-all">
                <Upload className="w-4 h-4 text-[#D9F22A]" />
                <span>Escolher arquivo de imagem (PNG, JPG, WebP)</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileSlotUpload('loginShowcaseUrl', e.target.files?.[0])}
                  className="hidden"
                />
              </label>

              <div className="pt-1">
                <label className="text-[10px] font-bold text-white/70 uppercase tracking-wider block mb-1">
                  Ou Cole a URL Direta da Imagem
                </label>
                <div className="relative flex items-center">
                  <LinkIcon className="w-3.5 h-3.5 text-white/40 absolute left-3" />
                  <input
                    type="url"
                    value={settings.loginShowcaseUrl || ''}
                    onChange={(e) => setSettings(prev => ({ ...prev, loginShowcaseUrl: e.target.value }))}
                    placeholder="https://exemplo.com/imagem-login.png"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-[#050811] border border-white/10 focus:border-[#D9F22A] text-xs text-white placeholder-white/30 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-white/5 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setActivePreviewModal('login')}
              className="text-xs text-[#D9F22A] hover:underline flex items-center gap-1 font-semibold cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              Testar Modal de Login Agora
            </button>
            {settings.loginShowcaseUrl && (
              <button
                type="button"
                onClick={() => handleClearSlot('loginShowcaseUrl')}
                className="text-xs text-rose-400/80 hover:text-rose-400 font-medium cursor-pointer"
              >
                Limpar
              </button>
            )}
          </div>
        </div>

        {/* SLOT 2: MODAL DE AFILIADO */}
        <div className="bg-[#080d1a] border border-white/10 rounded-3xl p-6 shadow-xl flex flex-col justify-between gap-5 relative overflow-hidden">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-lime-500/10 text-[#a3e635] flex items-center justify-center font-bold text-xs">
                  2
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Tela de Cadastro de Afiliado</h3>
                  <span className="text-[10px] text-white/50">Exibida ao clicar em "Criar Conta de Afiliado"</span>
                </div>
              </div>

              {settings.affiliateShowcaseUrl ? (
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                  Imagem Ativa
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-full bg-white/5 text-white/40 text-[10px] font-medium">
                  Sem Imagem (Padrão)
                </span>
              )}
            </div>

            {/* Preview Box */}
            <div className="w-full h-48 rounded-2xl bg-[#040810] border border-white/10 relative overflow-hidden flex items-center justify-center group">
              {settings.affiliateShowcaseUrl ? (
                <>
                  <img
                    src={settings.affiliateShowcaseUrl}
                    alt="Preview Afiliado"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActivePreviewModal('register_affiliate')}
                      className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-md text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Visualizar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleClearSlot('affiliateShowcaseUrl')}
                      className="px-3 py-1.5 rounded-xl bg-rose-500/80 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Remover
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center p-4">
                  <ImageIcon className="w-8 h-8 text-white/20 mx-auto mb-2" />
                  <span className="text-xs text-white/40 block">Nenhuma imagem customizada</span>
                  <span className="text-[10px] text-white/30 block mt-0.5">Faça upload ou cole um link abaixo</span>
                </div>
              )}
            </div>

            {/* Upload & URL Inputs */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-white/70 uppercase tracking-wider block">
                Arquivo de Imagem (Local)
              </label>
              <label className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl border border-dashed border-white/20 hover:border-[#D9F22A] bg-white/[0.02] hover:bg-white/[0.05] text-xs text-white/80 cursor-pointer transition-all">
                <Upload className="w-4 h-4 text-[#D9F22A]" />
                <span>Escolher arquivo de imagem (PNG, JPG, WebP)</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileSlotUpload('affiliateShowcaseUrl', e.target.files?.[0])}
                  className="hidden"
                />
              </label>

              <div className="pt-1">
                <label className="text-[10px] font-bold text-white/70 uppercase tracking-wider block mb-1">
                  Ou Cole a URL Direta da Imagem
                </label>
                <div className="relative flex items-center">
                  <LinkIcon className="w-3.5 h-3.5 text-white/40 absolute left-3" />
                  <input
                    type="url"
                    value={settings.affiliateShowcaseUrl || ''}
                    onChange={(e) => setSettings(prev => ({ ...prev, affiliateShowcaseUrl: e.target.value }))}
                    placeholder="https://exemplo.com/imagem-afiliado.png"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-[#050811] border border-white/10 focus:border-[#D9F22A] text-xs text-white placeholder-white/30 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-white/5 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setActivePreviewModal('register_affiliate')}
              className="text-xs text-[#D9F22A] hover:underline flex items-center gap-1 font-semibold cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              Testar Modal de Afiliado Agora
            </button>
            {settings.affiliateShowcaseUrl && (
              <button
                type="button"
                onClick={() => handleClearSlot('affiliateShowcaseUrl')}
                className="text-xs text-rose-400/80 hover:text-rose-400 font-medium cursor-pointer"
              >
                Limpar
              </button>
            )}
          </div>
        </div>

        {/* SLOT 3: MODAL DE EMPRESA / STARTUP */}
        <div className="bg-[#080d1a] border border-white/10 rounded-3xl p-6 shadow-xl flex flex-col justify-between gap-5 relative overflow-hidden">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-lime-500/10 text-[#a3e635] flex items-center justify-center font-bold text-xs">
                  3
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Tela de Cadastro de Empresa</h3>
                  <span className="text-[10px] text-white/50">Exibida ao clicar em "Cadastrar Empresa / Startup"</span>
                </div>
              </div>

              {settings.companyShowcaseUrl ? (
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                  Imagem Ativa
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-full bg-white/5 text-white/40 text-[10px] font-medium">
                  Sem Imagem (Padrão)
                </span>
              )}
            </div>

            {/* Preview Box */}
            <div className="w-full h-48 rounded-2xl bg-[#040810] border border-white/10 relative overflow-hidden flex items-center justify-center group">
              {settings.companyShowcaseUrl ? (
                <>
                  <img
                    src={settings.companyShowcaseUrl}
                    alt="Preview Empresa"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActivePreviewModal('register_company')}
                      className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-md text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Visualizar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleClearSlot('companyShowcaseUrl')}
                      className="px-3 py-1.5 rounded-xl bg-rose-500/80 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Remover
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center p-4">
                  <ImageIcon className="w-8 h-8 text-white/20 mx-auto mb-2" />
                  <span className="text-xs text-white/40 block">Nenhuma imagem customizada</span>
                  <span className="text-[10px] text-white/30 block mt-0.5">Faça upload ou cole um link abaixo</span>
                </div>
              )}
            </div>

            {/* Upload & URL Inputs */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-white/70 uppercase tracking-wider block">
                Arquivo de Imagem (Local)
              </label>
              <label className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl border border-dashed border-white/20 hover:border-[#D9F22A] bg-white/[0.02] hover:bg-white/[0.05] text-xs text-white/80 cursor-pointer transition-all">
                <Upload className="w-4 h-4 text-[#D9F22A]" />
                <span>Escolher arquivo de imagem (PNG, JPG, WebP)</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileSlotUpload('companyShowcaseUrl', e.target.files?.[0])}
                  className="hidden"
                />
              </label>

              <div className="pt-1">
                <label className="text-[10px] font-bold text-white/70 uppercase tracking-wider block mb-1">
                  Ou Cole a URL Direta da Imagem
                </label>
                <div className="relative flex items-center">
                  <LinkIcon className="w-3.5 h-3.5 text-white/40 absolute left-3" />
                  <input
                    type="url"
                    value={settings.companyShowcaseUrl || ''}
                    onChange={(e) => setSettings(prev => ({ ...prev, companyShowcaseUrl: e.target.value }))}
                    placeholder="https://exemplo.com/imagem-empresa.png"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-[#050811] border border-white/10 focus:border-[#D9F22A] text-xs text-white placeholder-white/30 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-white/5 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setActivePreviewModal('register_company')}
              className="text-xs text-[#D9F22A] hover:underline flex items-center gap-1 font-semibold cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              Testar Modal de Empresa Agora
            </button>
            {settings.companyShowcaseUrl && (
              <button
                type="button"
                onClick={() => handleClearSlot('companyShowcaseUrl')}
                className="text-xs text-rose-400/80 hover:text-rose-400 font-medium cursor-pointer"
              >
                Limpar
              </button>
            )}
          </div>
        </div>

        {/* SLOT 4: MODAL DE RECUPERAÇÃO DE SENHA */}
        <div className="bg-[#080d1a] border border-white/10 rounded-3xl p-6 shadow-xl flex flex-col justify-between gap-5 relative overflow-hidden">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-lime-500/10 text-[#a3e635] flex items-center justify-center font-bold text-xs">
                  4
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Tela de Recuperação de Senha</h3>
                  <span className="text-[10px] text-white/50">Exibida ao clicar em "Esqueceu a senha?"</span>
                </div>
              </div>

              {settings.forgotPasswordShowcaseUrl ? (
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                  Imagem Ativa
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-full bg-white/5 text-white/40 text-[10px] font-medium">
                  Sem Imagem (Padrão)
                </span>
              )}
            </div>

            {/* Preview Box */}
            <div className="w-full h-48 rounded-2xl bg-[#040810] border border-white/10 relative overflow-hidden flex items-center justify-center group">
              {settings.forgotPasswordShowcaseUrl ? (
                <>
                  <img
                    src={settings.forgotPasswordShowcaseUrl}
                    alt="Preview Reset"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActivePreviewModal('forgot_password')}
                      className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-md text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Visualizar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleClearSlot('forgotPasswordShowcaseUrl')}
                      className="px-3 py-1.5 rounded-xl bg-rose-500/80 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Remover
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center p-4">
                  <ImageIcon className="w-8 h-8 text-white/20 mx-auto mb-2" />
                  <span className="text-xs text-white/40 block">Nenhuma imagem customizada</span>
                  <span className="text-[10px] text-white/30 block mt-0.5">Faça upload ou cole um link abaixo</span>
                </div>
              )}
            </div>

            {/* Upload & URL Inputs */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-white/70 uppercase tracking-wider block">
                Arquivo de Imagem (Local)
              </label>
              <label className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl border border-dashed border-white/20 hover:border-[#D9F22A] bg-white/[0.02] hover:bg-white/[0.05] text-xs text-white/80 cursor-pointer transition-all">
                <Upload className="w-4 h-4 text-[#D9F22A]" />
                <span>Escolher arquivo de imagem (PNG, JPG, WebP)</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileSlotUpload('forgotPasswordShowcaseUrl', e.target.files?.[0])}
                  className="hidden"
                />
              </label>

              <div className="pt-1">
                <label className="text-[10px] font-bold text-white/70 uppercase tracking-wider block mb-1">
                  Ou Cole a URL Direta da Imagem
                </label>
                <div className="relative flex items-center">
                  <LinkIcon className="w-3.5 h-3.5 text-white/40 absolute left-3" />
                  <input
                    type="url"
                    value={settings.forgotPasswordShowcaseUrl || ''}
                    onChange={(e) => setSettings(prev => ({ ...prev, forgotPasswordShowcaseUrl: e.target.value }))}
                    placeholder="https://exemplo.com/imagem-recuperacao.png"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-[#050811] border border-white/10 focus:border-[#D9F22A] text-xs text-white placeholder-white/30 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-white/5 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setActivePreviewModal('forgot_password')}
              className="text-xs text-[#D9F22A] hover:underline flex items-center gap-1 font-semibold cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              Testar Modal de Recuperação Agora
            </button>
            {settings.forgotPasswordShowcaseUrl && (
              <button
                type="button"
                onClick={() => handleClearSlot('forgotPasswordShowcaseUrl')}
                className="text-xs text-rose-400/80 hover:text-rose-400 font-medium cursor-pointer"
              >
                Limpar
              </button>
            )}
          </div>
        </div>

      </div>

      {/* Floating Modal Preview */}
      {activePreviewModal && (
        <AuthScreenModal
          activeModal={activePreviewModal}
          onClose={() => setActivePreviewModal(null)}
        />
      )}
    </div>
  );
};
