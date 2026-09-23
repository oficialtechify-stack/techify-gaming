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
  Sliders, 
  AlertCircle,
  Sparkles,
  Info,
  Check
} from 'lucide-react';
import { 
  subscribeAuthModalSettings, 
  saveAuthModalSettings, 
  AuthModalSettings 
} from '../../services/firestoreService';
import { useAuth } from '../../context/AuthContext';
import { AuthScreenModal, AuthModalType } from '../auth/AuthScreenModal';
import { compressImageFileToBase64 } from '../../utils/imageCompressor';

export const AdminModalImagesManager: React.FC = () => {
  const { currentUser } = useAuth();

  const [settings, setSettings] = useState<AuthModalSettings>({
    loginBgUrl: '',
    affiliateBgUrl: '',
    companyBgUrl: '',
    mobileSlidePaymentBgUrl: '',
    mobileSlideCompanyBgUrl: '',
    mobileSlideAuraBgUrl: '',
    overlayDarkness: 78
  });

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [activePreviewModal, setActivePreviewModal] = useState<AuthModalType | null>(null);

  // Inscreve-se nas configurações em tempo real do Firestore
  useEffect(() => {
    const unsub = subscribeAuthModalSettings((data) => {
      if (data) {
        setSettings({
          loginBgUrl: data.loginBgUrl || data.loginShowcaseUrl || data.forgotPasswordShowcaseUrl || '',
          affiliateBgUrl: data.affiliateBgUrl || data.affiliateShowcaseUrl || '',
          companyBgUrl: data.companyBgUrl || data.companyShowcaseUrl || '',
          mobileSlidePaymentBgUrl: data.mobileSlidePaymentBgUrl || '',
          mobileSlideCompanyBgUrl: data.mobileSlideCompanyBgUrl || '',
          mobileSlideAuraBgUrl: data.mobileSlideAuraBgUrl || '',
          overlayDarkness: typeof data.overlayDarkness === 'number' ? data.overlayDarkness : 78
        });
      }
    });
    return () => unsub();
  }, []);

  // Leitor e compressor de arquivo de imagem local para base64 otimizado
  const handleFileSlotUpload = async (
    slot: 'loginBgUrl' | 'affiliateBgUrl' | 'companyBgUrl' | 'mobileSlidePaymentBgUrl' | 'mobileSlideCompanyBgUrl' | 'mobileSlideAuraBgUrl', 
    file?: File
  ) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFeedback({
        type: 'error',
        message: 'Por favor, selecione um arquivo de imagem válido (PNG, JPG, WebP).'
      });
      return;
    }

    try {
      setIsSaving(true);
      setFeedback({
        type: 'success',
        message: 'Otimizando e salvando imagem...'
      });

      // Comprime a imagem para dimensões ideais de tela (max 1920px) e tamanho ultraleve
      const compressedDataUrl = await compressImageFileToBase64(file, 1920, 0.80);

      const updatedSettings = {
        ...settings,
        [slot]: compressedDataUrl
      };
      setSettings(updatedSettings);

      // Auto-salva imediatamente no Firestore e no cache local
      await persistSettings(updatedSettings);

      setFeedback({
        type: 'success',
        message: `Imagem salva e aplicada com sucesso! Já está ativa.`
      });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      console.error('Falha ao processar/salvar imagem:', err);
      setFeedback({
        type: 'error',
        message: `Erro ao processar imagem: ${err.message || 'Tente outra imagem'}`
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Função central de persistência
  const persistSettings = async (targetSettings: AuthModalSettings) => {
    const payload: Partial<AuthModalSettings> = {
      loginBgUrl: targetSettings.loginBgUrl || '',
      affiliateBgUrl: targetSettings.affiliateBgUrl || '',
      companyBgUrl: targetSettings.companyBgUrl || '',
      mobileSlidePaymentBgUrl: targetSettings.mobileSlidePaymentBgUrl || '',
      mobileSlideCompanyBgUrl: targetSettings.mobileSlideCompanyBgUrl || '',
      mobileSlideAuraBgUrl: targetSettings.mobileSlideAuraBgUrl || '',
      // chaves legadas sincronizadas
      loginShowcaseUrl: targetSettings.loginBgUrl || '',
      affiliateShowcaseUrl: targetSettings.affiliateBgUrl || '',
      companyShowcaseUrl: targetSettings.companyBgUrl || '',
      forgotPasswordShowcaseUrl: targetSettings.loginBgUrl || '',
      overlayDarkness: targetSettings.overlayDarkness ?? 78
    };

    await saveAuthModalSettings(payload, currentUser?.email || 'admin');
  };

  // Salvar no Firestore e localStorage
  const handleSaveAll = async () => {
    setIsSaving(true);
    setFeedback(null);
    try {
      await persistSettings(settings);
      setFeedback({
        type: 'success',
        message: 'Todas as imagens de fundo foram salvas com sucesso no banco de dados!'
      });
      setTimeout(() => setFeedback(null), 5000);
    } catch (err: any) {
      console.error('Erro ao salvar imagens dos modais:', err);
      setFeedback({
        type: 'error',
        message: `Falha ao salvar: ${err.message || 'Verifique sua conexão'}`
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Limpar slot
  const handleClearSlot = async (slot: 'loginBgUrl' | 'affiliateBgUrl' | 'companyBgUrl' | 'mobileSlidePaymentBgUrl' | 'mobileSlideCompanyBgUrl' | 'mobileSlideAuraBgUrl') => {
    const updated = {
      ...settings,
      [slot]: ''
    };
    setSettings(updated);
    try {
      await persistSettings(updated);
      setFeedback({
        type: 'success',
        message: 'Imagem restaurada para o padrão oficial com sucesso!'
      });
      setTimeout(() => setFeedback(null), 3000);
    } catch (e: any) {
      console.warn('Erro ao restaurar slot:', e);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="bg-[#080d1a] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#D9F22A]/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D9F22A]/10 border border-[#D9F22A]/20 text-[#D9F22A] text-xs font-bold uppercase tracking-wider">
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Personalização de Fundo</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white font-['Syne'] tracking-tight">
              Imagens de Fundo das Telas
            </h2>
            <p className="text-sm text-white/60 max-w-2xl leading-relaxed">
              Defina as 3 imagens de fundo para a plataforma: 1 para a tela de <strong>Login</strong>, 1 para o <strong>Cadastro de Afiliado</strong> e 1 para o <strong>Cadastro de Empresa</strong>. A imagem preenche o fundo de tela inteira com alta resolução e legibilidade preservada.
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
                  <span>Salvar Imagens no Banco</span>
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

      {/* Ajuste de Contraste e Opacidade do Fundo */}
      <div className="bg-[#080d1a] border border-white/10 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#D9F22A]">
            <Sliders className="w-4 h-4" />
            <span>Opacidade do Filtro Escuro sobre o Fundo</span>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-white/10 text-white border border-white/10">
            {settings.overlayDarkness ?? 78}% Escurecimento
          </span>
        </div>
        <p className="text-xs text-white/50">
          Ajuste a intensidade do filtro escuro sobre as imagens de fundo para garantir que o formulário, textos e botões continuem 100% nítidos e fáceis de ler.
        </p>
        <div className="flex items-center gap-4 pt-2">
          <span className="text-xs text-white/40">Mais Claro (50%)</span>
          <input
            type="range"
            min="50"
            max="95"
            step="1"
            value={settings.overlayDarkness ?? 78}
            onChange={(e) => setSettings(prev => ({ ...prev, overlayDarkness: Number(e.target.value) }))}
            className="flex-1 accent-[#D9F22A] cursor-pointer h-2 bg-white/10 rounded-lg"
          />
          <span className="text-xs text-white/40">Mais Escuro (95%)</span>
        </div>
      </div>

      {/* As 3 Imagens Oficiais: 1 pra cada tela */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ============================================================== */}
        {/* 1. IMAGEM DE FUNDO - LOGIN                                      */}
        {/* ============================================================== */}
        <div className="bg-[#080d1a] border border-white/10 rounded-3xl p-6 shadow-xl flex flex-col justify-between gap-5 relative overflow-hidden">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-lime-500/10 text-[#a3e635] flex items-center justify-center font-bold text-xs">
                  1
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Fundo: Tela de Login</h3>
                  <span className="text-[10px] text-white/50">Login & Recuperação de Senha</span>
                </div>
              </div>

              {settings.loginBgUrl ? (
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold flex items-center gap-1">
                  <Check className="w-3 h-3" /> Ativa
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-full bg-white/5 text-white/40 text-[10px] font-medium">
                  Padrão Escuro
                </span>
              )}
            </div>

            {/* Preview da Imagem de Fundo (Widescreen Mockup) */}
            <div className="w-full h-44 rounded-2xl bg-[#040810] border border-white/10 relative overflow-hidden flex items-center justify-center group">
              {settings.loginBgUrl ? (
                <>
                  <img
                    src={settings.loginBgUrl}
                    alt="Fundo Login"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {/* Overlay Mockup para simular o formulário por cima */}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center pointer-events-none">
                    <div className="px-4 py-2 rounded-xl bg-black/70 border border-white/20 backdrop-blur-md text-[11px] font-bold text-white/90">
                      Formulário de Login
                    </div>
                  </div>
                  {/* Botões de Ação sobre a imagem */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 z-10">
                    <button
                      type="button"
                      onClick={() => setActivePreviewModal('login')}
                      className="px-3 py-1.5 rounded-xl bg-[#D9F22A] text-[#060A15] text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-lg hover:brightness-105"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Testar na Tela
                    </button>
                    <button
                      type="button"
                      onClick={() => handleClearSlot('loginBgUrl')}
                      className="px-3 py-1.5 rounded-xl bg-rose-500/90 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-lg hover:bg-rose-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Remover
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center p-4">
                  <ImageIcon className="w-8 h-8 text-white/20 mx-auto mb-2" />
                  <span className="text-xs text-white/40 block font-medium">Sem imagem de fundo</span>
                  <span className="text-[10px] text-white/30 block mt-0.5">Faça upload da imagem abaixo</span>
                </div>
              )}
            </div>

            {/* Inputs de Upload & Link */}
            <div className="space-y-2.5">
              <label className="text-[10px] font-bold text-white/70 uppercase tracking-wider block">
                1. Upload da Imagem do Computador
              </label>
              <label className="flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-xl border border-dashed border-white/20 hover:border-[#D9F22A] bg-white/[0.02] hover:bg-white/[0.05] text-xs text-white/80 cursor-pointer transition-all">
                <Upload className="w-4 h-4 text-[#D9F22A]" />
                <span className="truncate">Escolher Imagem (PNG, JPG, WebP)</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileSlotUpload('loginBgUrl', e.target.files?.[0])}
                  className="hidden"
                />
              </label>

              <div className="pt-1">
                <label className="text-[10px] font-bold text-white/70 uppercase tracking-wider block mb-1">
                  2. Ou Cole a URL da Imagem
                </label>
                <div className="relative flex items-center">
                  <LinkIcon className="w-3.5 h-3.5 text-white/40 absolute left-3" />
                  <input
                    type="url"
                    value={settings.loginBgUrl || ''}
                    onChange={(e) => setSettings(prev => ({ ...prev, loginBgUrl: e.target.value }))}
                    placeholder="https://exemplo.com/fundo-login.jpg"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#050811] border border-white/10 focus:border-[#D9F22A] text-xs text-white placeholder-white/30 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-white/5 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setActivePreviewModal('login')}
              className="text-xs text-[#D9F22A] hover:underline flex items-center gap-1.5 font-bold cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              Testar Fundo de Login ao Vivo
            </button>
            {settings.loginBgUrl && (
              <button
                type="button"
                onClick={() => handleClearSlot('loginBgUrl')}
                className="text-xs text-rose-400 hover:text-rose-300 font-semibold cursor-pointer"
              >
                Limpar
              </button>
            )}
          </div>
        </div>

        {/* ============================================================== */}
        {/* 2. IMAGEM DE FUNDO - CADASTRO DE AFILIADO                      */}
        {/* ============================================================== */}
        <div className="bg-[#080d1a] border border-white/10 rounded-3xl p-6 shadow-xl flex flex-col justify-between gap-5 relative overflow-hidden">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-lime-500/10 text-[#a3e635] flex items-center justify-center font-bold text-xs">
                  2
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Fundo: Cadastro Afiliado</h3>
                  <span className="text-[10px] text-white/50">Tela de Registro de Afiliado</span>
                </div>
              </div>

              {settings.affiliateBgUrl ? (
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold flex items-center gap-1">
                  <Check className="w-3 h-3" /> Ativa
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-full bg-white/5 text-white/40 text-[10px] font-medium">
                  Padrão Escuro
                </span>
              )}
            </div>

            {/* Preview da Imagem de Fundo */}
            <div className="w-full h-44 rounded-2xl bg-[#040810] border border-white/10 relative overflow-hidden flex items-center justify-center group">
              {settings.affiliateBgUrl ? (
                <>
                  <img
                    src={settings.affiliateBgUrl}
                    alt="Fundo Afiliado"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {/* Overlay Mockup */}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center pointer-events-none">
                    <div className="px-4 py-2 rounded-xl bg-black/70 border border-white/20 backdrop-blur-md text-[11px] font-bold text-white/90">
                      Cadastro de Afiliado
                    </div>
                  </div>
                  {/* Botões de Ação */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 z-10">
                    <button
                      type="button"
                      onClick={() => setActivePreviewModal('register_affiliate')}
                      className="px-3 py-1.5 rounded-xl bg-[#D9F22A] text-[#060A15] text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-lg hover:brightness-105"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Testar na Tela
                    </button>
                    <button
                      type="button"
                      onClick={() => handleClearSlot('affiliateBgUrl')}
                      className="px-3 py-1.5 rounded-xl bg-rose-500/90 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-lg hover:bg-rose-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Remover
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center p-4">
                  <ImageIcon className="w-8 h-8 text-white/20 mx-auto mb-2" />
                  <span className="text-xs text-white/40 block font-medium">Sem imagem de fundo</span>
                  <span className="text-[10px] text-white/30 block mt-0.5">Faça upload da imagem abaixo</span>
                </div>
              )}
            </div>

            {/* Inputs de Upload & Link */}
            <div className="space-y-2.5">
              <label className="text-[10px] font-bold text-white/70 uppercase tracking-wider block">
                1. Upload da Imagem do Computador
              </label>
              <label className="flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-xl border border-dashed border-white/20 hover:border-[#D9F22A] bg-white/[0.02] hover:bg-white/[0.05] text-xs text-white/80 cursor-pointer transition-all">
                <Upload className="w-4 h-4 text-[#D9F22A]" />
                <span className="truncate">Escolher Imagem (PNG, JPG, WebP)</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileSlotUpload('affiliateBgUrl', e.target.files?.[0])}
                  className="hidden"
                />
              </label>

              <div className="pt-1">
                <label className="text-[10px] font-bold text-white/70 uppercase tracking-wider block mb-1">
                  2. Ou Cole a URL da Imagem
                </label>
                <div className="relative flex items-center">
                  <LinkIcon className="w-3.5 h-3.5 text-white/40 absolute left-3" />
                  <input
                    type="url"
                    value={settings.affiliateBgUrl || ''}
                    onChange={(e) => setSettings(prev => ({ ...prev, affiliateBgUrl: e.target.value }))}
                    placeholder="https://exemplo.com/fundo-afiliado.jpg"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#050811] border border-white/10 focus:border-[#D9F22A] text-xs text-white placeholder-white/30 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-white/5 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setActivePreviewModal('register_affiliate')}
              className="text-xs text-[#D9F22A] hover:underline flex items-center gap-1.5 font-bold cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              Testar Fundo Afiliado ao Vivo
            </button>
            {settings.affiliateBgUrl && (
              <button
                type="button"
                onClick={() => handleClearSlot('affiliateBgUrl')}
                className="text-xs text-rose-400 hover:text-rose-300 font-semibold cursor-pointer"
              >
                Limpar
              </button>
            )}
          </div>
        </div>

        {/* ============================================================== */}
        {/* 3. IMAGEM DE FUNDO - CADASTRO DE EMPRESA                       */}
        {/* ============================================================== */}
        <div className="bg-[#080d1a] border border-white/10 rounded-3xl p-6 shadow-xl flex flex-col justify-between gap-5 relative overflow-hidden">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-lime-500/10 text-[#a3e635] flex items-center justify-center font-bold text-xs">
                  3
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Fundo: Cadastro Empresa</h3>
                  <span className="text-[10px] text-white/50">Tela de Registro de Startup/Empresa</span>
                </div>
              </div>

              {settings.companyBgUrl ? (
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold flex items-center gap-1">
                  <Check className="w-3 h-3" /> Ativa
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-full bg-white/5 text-white/40 text-[10px] font-medium">
                  Padrão Escuro
                </span>
              )}
            </div>

            {/* Preview da Imagem de Fundo */}
            <div className="w-full h-44 rounded-2xl bg-[#040810] border border-white/10 relative overflow-hidden flex items-center justify-center group">
              {settings.companyBgUrl ? (
                <>
                  <img
                    src={settings.companyBgUrl}
                    alt="Fundo Empresa"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {/* Overlay Mockup */}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center pointer-events-none">
                    <div className="px-4 py-2 rounded-xl bg-black/70 border border-white/20 backdrop-blur-md text-[11px] font-bold text-white/90">
                      Cadastro de Empresa
                    </div>
                  </div>
                  {/* Botões de Ação */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 z-10">
                    <button
                      type="button"
                      onClick={() => setActivePreviewModal('register_company')}
                      className="px-3 py-1.5 rounded-xl bg-[#D9F22A] text-[#060A15] text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-lg hover:brightness-105"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Testar na Tela
                    </button>
                    <button
                      type="button"
                      onClick={() => handleClearSlot('companyBgUrl')}
                      className="px-3 py-1.5 rounded-xl bg-rose-500/90 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-lg hover:bg-rose-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Remover
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center p-4">
                  <ImageIcon className="w-8 h-8 text-white/20 mx-auto mb-2" />
                  <span className="text-xs text-white/40 block font-medium">Sem imagem de fundo</span>
                  <span className="text-[10px] text-white/30 block mt-0.5">Faça upload da imagem abaixo</span>
                </div>
              )}
            </div>

            {/* Inputs de Upload & Link */}
            <div className="space-y-2.5">
              <label className="text-[10px] font-bold text-white/70 uppercase tracking-wider block">
                1. Upload da Imagem do Computador
              </label>
              <label className="flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-xl border border-dashed border-white/20 hover:border-[#D9F22A] bg-white/[0.02] hover:bg-white/[0.05] text-xs text-white/80 cursor-pointer transition-all">
                <Upload className="w-4 h-4 text-[#D9F22A]" />
                <span className="truncate">Escolher Imagem (PNG, JPG, WebP)</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileSlotUpload('companyBgUrl', e.target.files?.[0])}
                  className="hidden"
                />
              </label>

              <div className="pt-1">
                <label className="text-[10px] font-bold text-white/70 uppercase tracking-wider block mb-1">
                  2. Ou Cole a URL da Imagem
                </label>
                <div className="relative flex items-center">
                  <LinkIcon className="w-3.5 h-3.5 text-white/40 absolute left-3" />
                  <input
                    type="url"
                    value={settings.companyBgUrl || ''}
                    onChange={(e) => setSettings(prev => ({ ...prev, companyBgUrl: e.target.value }))}
                    placeholder="https://exemplo.com/fundo-empresa.jpg"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#050811] border border-white/10 focus:border-[#D9F22A] text-xs text-white placeholder-white/30 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-white/5 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setActivePreviewModal('register_company')}
              className="text-xs text-[#D9F22A] hover:underline flex items-center gap-1.5 font-bold cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              Testar Fundo Empresa ao Vivo
            </button>
            {settings.companyBgUrl && (
              <button
                type="button"
                onClick={() => handleClearSlot('companyBgUrl')}
                className="text-xs text-rose-400 hover:text-rose-300 font-semibold cursor-pointer"
              >
                Limpar
              </button>
            )}
          </div>
        </div>

      </div>

      {/* ============================================================== */}
      {/* 📱 SEÇÃO DEDICADA: FUNDOS DOS SLIDES MOBILE (CELULAR)           */}
      {/* ============================================================== */}
      <div className="bg-[#080d1a] border border-[#b5f617]/30 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#b5f617]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#b5f617]/10 border border-[#b5f617]/25 text-[#b5f617] text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Exclusivo Mobile • Celular</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-white font-['Syne'] tracking-tight">
            Imagens de Fundo dos 2 Slides Mobile
          </h3>
          <p className="text-sm text-white/60 leading-relaxed max-w-3xl">
            Personalize diretamente as imagens de fundo em tela cheia que aparecem para os usuários no celular para as duas partes: <strong>"Pague com simplicidade."</strong> (Slide 2) e <strong>"Sua empresa vai mais longe."</strong> (Slide 3). O slide passa sozinho automaticamente.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* 📱 SLIDE 2: Pague com simplicidade */}
          <div className="bg-[#050811] border border-white/10 rounded-2xl p-5 shadow-lg flex flex-col justify-between gap-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-[#b5f617]/15 text-[#b5f617] flex items-center justify-center font-bold text-xs font-['Syne']">
                    S2
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">Fundo: Pague com simplicidade.</h4>
                    <span className="text-[10px] text-[#b5f617]">Slide 2 Mobile (Cartão / Maquininha)</span>
                  </div>
                </div>
                {settings.mobileSlidePaymentBgUrl ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold flex items-center gap-1">
                    <Check className="w-3 h-3" /> Customizada
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-white/5 text-white/40 text-[10px]">
                    Foto Padrão
                  </span>
                )}
              </div>

              {/* Thumbnail */}
              <div className="w-full h-36 rounded-xl bg-black/50 border border-white/10 overflow-hidden relative group">
                {settings.mobileSlidePaymentBgUrl ? (
                  <img
                    src={settings.mobileSlidePaymentBgUrl}
                    alt="Preview Slide 2"
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-white/40 text-center p-3 gap-1">
                    <ImageIcon className="w-6 h-6 stroke-[1.5] text-[#b5f617]" />
                    <span className="text-[11px]">Foto oficial de pagamento/cartão ativa</span>
                  </div>
                )}
              </div>

              {/* Inputs */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-white/70 uppercase tracking-wider block">
                  1. Upload Imagem Slide 2 (Celular)
                </label>
                <label className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-xl border border-dashed border-[#b5f617]/40 hover:border-[#b5f617] bg-[#b5f617]/[0.03] hover:bg-[#b5f617]/[0.08] text-xs text-white/90 cursor-pointer transition-all">
                  <Upload className="w-4 h-4 text-[#b5f617]" />
                  <span className="truncate">Escolher Imagem (PNG, JPG, WebP)</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileSlotUpload('mobileSlidePaymentBgUrl', e.target.files?.[0])}
                    className="hidden"
                  />
                </label>

                <div className="pt-1 space-y-1.5">
                  <label className="text-[10px] font-bold text-white/70 uppercase tracking-wider block mb-1">
                    2. Ou Cole a URL da Imagem
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1 flex items-center">
                      <LinkIcon className="w-3.5 h-3.5 text-white/40 absolute left-3" />
                      <input
                        type="url"
                        value={settings.mobileSlidePaymentBgUrl || ''}
                        onChange={(e) => setSettings(prev => ({ ...prev, mobileSlidePaymentBgUrl: e.target.value }))}
                        placeholder="https://exemplo.com/slide2-pagamento.jpg"
                        className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#080d1a] border border-white/10 focus:border-[#b5f617] text-xs text-white placeholder-white/30 outline-none"
                      />
                    </div>
                    {settings.mobileSlidePaymentBgUrl && (
                      <button
                        type="button"
                        onClick={handleSaveAll}
                        disabled={isSaving}
                        className="px-3 py-1.5 rounded-xl bg-[#b5f617] hover:bg-[#c8ff21] text-black font-bold text-xs flex items-center gap-1 cursor-pointer shrink-0 disabled:opacity-50"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>Salvar</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-white/5 flex items-center justify-between">
              <span className="text-[10px] text-white/40">
                {settings.mobileSlidePaymentBgUrl ? 'Imagem pronta para o app mobile' : 'Usando imagem padrão do sistema'}
              </span>
              <div className="flex items-center gap-2">
                {settings.mobileSlidePaymentBgUrl && (
                  <button
                    type="button"
                    onClick={() => handleClearSlot('mobileSlidePaymentBgUrl')}
                    className="text-xs text-rose-400 hover:text-rose-300 font-semibold cursor-pointer"
                  >
                    Restaurar padrão
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSaveAll}
                  disabled={isSaving}
                  className="px-3 py-1.5 rounded-xl bg-[#b5f617]/10 hover:bg-[#b5f617]/20 border border-[#b5f617]/30 text-[#b5f617] font-bold text-xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3 h-3" />
                  <span>Salvar Slide 2</span>
                </button>
              </div>
            </div>
          </div>

          {/* 📱 SLIDE 3: Sua empresa vai mais longe */}
          <div className="bg-[#050811] border border-white/10 rounded-2xl p-5 shadow-lg flex flex-col justify-between gap-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-[#b5f617]/15 text-[#b5f617] flex items-center justify-center font-bold text-xs font-['Syne']">
                    S3
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">Fundo: Sua empresa vai mais longe.</h4>
                    <span className="text-[10px] text-[#b5f617]">Slide 3 Mobile (Crescimento de Startups)</span>
                  </div>
                </div>
                {settings.mobileSlideCompanyBgUrl ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold flex items-center gap-1">
                    <Check className="w-3 h-3" /> Customizada
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-white/5 text-white/40 text-[10px]">
                    Foto Padrão
                  </span>
                )}
              </div>

              {/* Thumbnail */}
              <div className="w-full h-36 rounded-xl bg-black/50 border border-white/10 overflow-hidden relative group">
                {settings.mobileSlideCompanyBgUrl ? (
                  <img
                    src={settings.mobileSlideCompanyBgUrl}
                    alt="Preview Slide 3"
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-white/40 text-center p-3 gap-1">
                    <ImageIcon className="w-6 h-6 stroke-[1.5] text-[#b5f617]" />
                    <span className="text-[11px]">Foto oficial de esportes/empresa ativa</span>
                  </div>
                )}
              </div>

              {/* Inputs */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-white/70 uppercase tracking-wider block">
                  1. Upload Imagem Slide 3 (Celular)
                </label>
                <label className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-xl border border-dashed border-[#b5f617]/40 hover:border-[#b5f617] bg-[#b5f617]/[0.03] hover:bg-[#b5f617]/[0.08] text-xs text-white/90 cursor-pointer transition-all">
                  <Upload className="w-4 h-4 text-[#b5f617]" />
                  <span className="truncate">Escolher Imagem (PNG, JPG, WebP)</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileSlotUpload('mobileSlideCompanyBgUrl', e.target.files?.[0])}
                    className="hidden"
                  />
                </label>

                <div className="pt-1 space-y-1.5">
                  <label className="text-[10px] font-bold text-white/70 uppercase tracking-wider block mb-1">
                    2. Ou Cole a URL da Imagem
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1 flex items-center">
                      <LinkIcon className="w-3.5 h-3.5 text-white/40 absolute left-3" />
                      <input
                        type="url"
                        value={settings.mobileSlideCompanyBgUrl || ''}
                        onChange={(e) => setSettings(prev => ({ ...prev, mobileSlideCompanyBgUrl: e.target.value }))}
                        placeholder="https://exemplo.com/slide3-empresa.jpg"
                        className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#080d1a] border border-white/10 focus:border-[#b5f617] text-xs text-white placeholder-white/30 outline-none"
                      />
                    </div>
                    {settings.mobileSlideCompanyBgUrl && (
                      <button
                        type="button"
                        onClick={handleSaveAll}
                        disabled={isSaving}
                        className="px-3 py-1.5 rounded-xl bg-[#b5f617] hover:bg-[#c8ff21] text-black font-bold text-xs flex items-center gap-1 cursor-pointer shrink-0 disabled:opacity-50"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>Salvar</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-white/5 flex items-center justify-between">
              <span className="text-[10px] text-white/40">
                {settings.mobileSlideCompanyBgUrl ? 'Imagem pronta para o app mobile' : 'Usando imagem padrão do sistema'}
              </span>
              <div className="flex items-center gap-2">
                {settings.mobileSlideCompanyBgUrl && (
                  <button
                    type="button"
                    onClick={() => handleClearSlot('mobileSlideCompanyBgUrl')}
                    className="text-xs text-rose-400 hover:text-rose-300 font-semibold cursor-pointer"
                  >
                    Restaurar padrão
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSaveAll}
                  disabled={isSaving}
                  className="px-3 py-1.5 rounded-xl bg-[#b5f617]/10 hover:bg-[#b5f617]/20 border border-[#b5f617]/30 text-[#b5f617] font-bold text-xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3 h-3" />
                  <span>Salvar Slide 3</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dica de Boas Práticas */}
      <div className="bg-[#050811] border border-white/10 rounded-2xl p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-[#D9F22A] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="text-xs font-bold text-white block">Dica para melhores resultados visuais:</span>
          <p className="text-xs text-white/60 leading-relaxed">
            Recomendamos imagens panorâmicas de alta resolução (1920x1080 ou 2560x1440) em tons escuros ou tecnológicos (3D render, fintech, dashboard, texturas escuras). Como as imagens preenchem o fundo de tela inteira em qualquer monitor ou celular, elas darão um visual ultra moderno e imersivo a cada uma das 3 telas.
          </p>
        </div>
      </div>

      {/* Modal de Teste em Tempo Real */}
      {activePreviewModal && (
        <AuthScreenModal
          activeModal={activePreviewModal}
          onClose={() => setActivePreviewModal(null)}
        />
      )}
    </div>
  );
};
