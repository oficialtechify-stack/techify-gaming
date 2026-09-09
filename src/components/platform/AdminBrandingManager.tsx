import React, { useState, useEffect } from 'react';
import { 
  subscribePlatformBranding, 
  savePlatformBranding, 
  PlatformBranding 
} from '../../services/firestoreService';
import { TechifyLogo } from '../TechifyLogo';
import { 
  Upload, 
  Link as LinkIcon, 
  Sparkles, 
  CheckCircle2, 
  RefreshCw, 
  Image as ImageIcon, 
  Sliders, 
  Palette, 
  Eye,
  RotateCcw,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const AdminBrandingManager: React.FC = () => {
  const { currentUser } = useAuth();
  const [branding, setBranding] = useState<PlatformBranding>({
    logoType: 'default_vector',
    logoText: 'LEADSPAY',
    logoSubtext: 'PAYMENTS & SPLIT',
    accentColor: '#D9F22A',
    logoUrl: ''
  });

  const [inputUrl, setInputUrl] = useState<string>('');
  const [selectedType, setSelectedType] = useState<'default_vector' | 'custom_image' | 'preset_neon_circle' | 'preset_3d_star'>('default_vector');
  const [logoText, setLogoText] = useState<string>('LEADSPAY');
  const [logoSubtext, setLogoSubtext] = useState<string>('PAYMENTS & SPLIT');
  const [accentColor, setAccentColor] = useState<string>('#D9F22A');
  const [hideTextWithCustomLogo, setHideTextWithCustomLogo] = useState<boolean>(false);

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribePlatformBranding((data) => {
      if (data) {
        setBranding(data);
        setSelectedType(data.logoType || 'default_vector');
        setInputUrl(data.logoUrl || '');
        setLogoText(data.logoText || 'LEADSPAY');
        setLogoSubtext(data.logoSubtext || 'PAYMENTS & SPLIT');
        setAccentColor(data.accentColor || '#D9F22A');
        setHideTextWithCustomLogo(Boolean(data.hideTextWithCustomLogo));
      }
    });

    return () => unsub();
  }, []);

  // Upload Manual de Arquivo Local (FileReader -> Base64)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setUploadError(null);

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Por favor, selecione um arquivo de imagem válido (PNG, SVG, JPG, WebP).');
      return;
    }

    // Limite de 2MB para Data URLs seguras no Firestore
    if (file.size > 2 * 1024 * 1024) {
      setUploadError('A imagem deve ter no máximo 2MB para garantir alta velocidade de carregamento.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setInputUrl(result);
      setSelectedType('custom_image');
      setFeedback({
        type: 'success',
        message: 'Arquivo de imagem carregado! Clique em "Salvar e Aplicar Logotipo" para confirmar.'
      });
      setTimeout(() => setFeedback(null), 5000);
    };
    reader.onerror = () => {
      setUploadError('Erro ao processar arquivo de imagem. Tente novamente.');
    };
    reader.readAsDataURL(file);
  };

  // Salvar Alterações no Firestore e Disparar Atualização Global
  const handleSave = async () => {
    setIsSaving(true);
    setFeedback(null);
    setUploadError(null);

    try {
      const payload: Partial<PlatformBranding> = {
        logoType: selectedType,
        logoUrl: selectedType === 'custom_image' ? inputUrl.trim() : '',
        logoText: logoText.trim() || 'LEADSPAY',
        logoSubtext: logoSubtext.trim() || 'PAYMENTS & SPLIT',
        accentColor: accentColor || '#D9F22A',
        hideTextWithCustomLogo: hideTextWithCustomLogo
      };

      await savePlatformBranding(payload, currentUser?.email || 'admin');

      setFeedback({
        type: 'success',
        message: 'Logotipo e identidade visual atualizados com sucesso em toda a plataforma LeadsPay!'
      });
      setTimeout(() => setFeedback(null), 5000);
    } catch (err: any) {
      console.error('Erro ao salvar logotipo:', err);
      setFeedback({
        type: 'error',
        message: err.message || 'Falha ao salvar configurações no Firestore.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Restaurar Padrão Oficial
  const handleResetToDefault = async () => {
    if (!confirm('Deseja restaurar a logo para o padrão oficial LeadsPay?')) return;

    setIsSaving(true);
    try {
      const defaultPayload: Partial<PlatformBranding> = {
        logoType: 'default_vector',
        logoUrl: '',
        logoText: 'LEADSPAY',
        logoSubtext: 'PAYMENTS & SPLIT',
        accentColor: '#D9F22A'
      };

      await savePlatformBranding(defaultPayload, currentUser?.email || 'admin');
      setSelectedType('default_vector');
      setInputUrl('');
      setLogoText('LEADSPAY');
      setLogoSubtext('PAYMENTS & SPLIT');
      setAccentColor('#D9F22A');

      setFeedback({
        type: 'success',
        message: 'Padrão oficial LeadsPay restaurado com sucesso!'
      });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-[#080d1a] border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-8" id="admin-branding-manager">
      {/* Header da Seção */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#D9F22A] mb-1">
            <Palette className="w-4 h-4" />
            Personalização do Sistema (Admin Mestre)
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white font-['Syne']">
            Gerenciador da Logo & Identidade Visual
          </h2>
          <p className="text-xs text-white/60 mt-1">
            Altere manualmente a logo da LeadsPay via upload de imagem, link externo ou escolha entre os presets oficiais. As alterações têm reflexo imediato em todo o site e no painel.
          </p>
        </div>

        <button
          onClick={handleResetToDefault}
          disabled={isSaving}
          className="self-start sm:self-auto px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Restaurar Padrão</span>
        </button>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-3 animate-in fade-in duration-200 ${
          feedback.type === 'success' 
            ? 'bg-[#D9F22A]/10 border border-[#D9F22A]/30 text-[#D9F22A]' 
            : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
        }`}>
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Grid Principal: Configurações vs Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Coluna 1: Opções e Inputs (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* 1. Escolha do Modo da Logo */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-white/80 flex items-center gap-2">
                <Sliders className="w-3.5 h-3.5 text-[#D9F22A]" />
                Como deseja definir sua Logo?
              </label>
              {selectedType === 'custom_image' && (
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Modo Personalizado Ativo
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Opção C: Imagem Personalizada (Upload / URL) - EM DESTAQUE */}
              <button
                type="button"
                onClick={() => setSelectedType('custom_image')}
                className={`p-4 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                  selectedType === 'custom_image'
                    ? 'bg-[#D9F22A]/15 border-[#D9F22A] text-white shadow-[0_0_20px_rgba(217,242,42,0.15)]'
                    : 'bg-[#050811] border-white/10 text-white/70 hover:border-white/30'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5 text-[#D9F22A]" />
                    Upload Manual
                  </span>
                  {selectedType === 'custom_image' && <span className="w-2 h-2 rounded-full bg-[#D9F22A]" />}
                </div>
                <p className="text-[11px] text-white/50">Envie o arquivo do seu computador ou link</p>
              </button>

              {/* Opção A: Presets Oficiais */}
              <button
                type="button"
                onClick={() => setSelectedType('default_vector')}
                className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                  selectedType === 'default_vector'
                    ? 'bg-[#D9F22A]/15 border-[#D9F22A] text-white shadow-[0_0_20px_rgba(217,242,42,0.15)]'
                    : 'bg-[#050811] border-white/10 text-white/70 hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-white">Raio Neon</span>
                  {selectedType === 'default_vector' && <span className="w-2 h-2 rounded-full bg-[#D9F22A]" />}
                </div>
                <p className="text-[11px] text-white/50">Vetor padrão LeadsPay</p>
              </button>

              {/* Opção B: Emblema 3D Estrela */}
              <button
                type="button"
                onClick={() => setSelectedType('preset_3d_star')}
                className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                  selectedType === 'preset_3d_star'
                    ? 'bg-[#D9F22A]/15 border-[#D9F22A] text-white shadow-[0_0_20px_rgba(217,242,42,0.15)]'
                    : 'bg-[#050811] border-white/10 text-white/70 hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-white">Estrela 3D</span>
                  {selectedType === 'preset_3d_star' && <span className="w-2 h-2 rounded-full bg-[#D9F22A]" />}
                </div>
                <p className="text-[11px] text-white/50">Emblema com estrela neon</p>
              </button>
            </div>
          </div>

          {/* 2. Área de Upload / Imagem Manual - Sempre acessível e clara */}
          <div className="space-y-4 p-5 rounded-2xl bg-[#080d1a] border border-white/15 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <label className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-[#D9F22A]" />
                Carregar Arquivo de Imagem da Sua Marca
              </label>
              <span className="text-[10px] text-white/40 font-mono">PNG, SVG, JPG, WebP</span>
            </div>

            {/* Se já tiver imagem carregada, exibir miniatura e opções */}
            {inputUrl && (
              <div className="p-4 rounded-xl bg-[#050811] border border-[#D9F22A]/30 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-14 h-14 rounded-lg bg-[#060A15] border border-white/10 p-1 flex items-center justify-center flex-shrink-0">
                    <img
                      src={inputUrl}
                      alt="Logo carregada"
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-white block truncate">
                      {inputUrl.startsWith('data:') ? 'Imagem carregada do seu computador' : inputUrl}
                    </span>
                    <span className="text-[10px] text-emerald-400 flex items-center gap-1 mt-0.5">
                      <CheckCircle2 className="w-3 h-3" />
                      Pronta para salvar e aplicar no site
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setInputUrl('');
                    setSelectedType('default_vector');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 text-xs font-bold border border-rose-500/30 transition-all cursor-pointer flex-shrink-0"
                >
                  Remover
                </button>
              </div>
            )}

            {/* Dropzone de Upload de Arquivo Local */}
            <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-white/20 hover:border-[#D9F22A] rounded-xl cursor-pointer bg-white/[0.02] hover:bg-white/[0.05] transition-all group">
              <Upload className="w-8 h-8 text-[#D9F22A] mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold text-white text-center">
                {inputUrl ? 'Clique para substituir por outra imagem' : 'Clique aqui para selecionar a imagem do seu computador'}
              </span>
              <span className="text-[10px] text-white/40 mt-1 text-center">
                Recomendado: imagem com fundo transparente (PNG ou SVG) até 2MB
              </span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            {uploadError && (
              <p className="text-xs text-rose-400 bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/20">{uploadError}</p>
            )}

            {/* Opção Alternativa de URL */}
            <div className="space-y-1.5 pt-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/50 flex items-center gap-1.5">
                <LinkIcon className="w-3 h-3" />
                Ou cole o link direto da imagem na internet:
              </span>
              <input
                type="url"
                value={inputUrl.startsWith('data:') ? '' : inputUrl}
                onChange={(e) => {
                  setInputUrl(e.target.value);
                  if (e.target.value) setSelectedType('custom_image');
                }}
                placeholder="https://exemplo.com/minha-logo.png"
                className="w-full px-4 py-2.5 bg-[#050811] border border-white/10 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-[#D9F22A] transition-colors"
              />
            </div>

            {/* Opção para ocultar texto padrão */}
            {selectedType === 'custom_image' && (
              <div className="pt-2 border-t border-white/10">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={hideTextWithCustomLogo}
                    onChange={(e) => setHideTextWithCustomLogo(e.target.checked)}
                    className="w-4 h-4 rounded border-white/20 text-[#D9F22A] focus:ring-0 cursor-pointer accent-[#D9F22A]"
                  />
                  <span className="text-xs font-bold text-white/90">
                    Ocultar texto padrão ("LEADSPAY") ao lado da logo
                  </span>
                </label>
                <p className="text-[10px] text-white/40 ml-6.5 mt-0.5">
                  Marque esta opção se sua imagem já contém o nome da sua empresa/marca desenhado nela.
                </p>
              </div>
            )}
          </div>

          {/* 3. Textos da Marca e Cores */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-white/80">
                Texto Principal
              </label>
              <input
                type="text"
                value={logoText}
                onChange={(e) => setLogoText(e.target.value)}
                placeholder="LEADSPAY"
                className="w-full px-4 py-3 bg-[#050811] border border-white/10 rounded-xl text-white text-sm font-bold focus:outline-none focus:border-[#D9F22A] transition-colors"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-white/80">
                Subtítulo / Slogan
              </label>
              <input
                type="text"
                value={logoSubtext}
                onChange={(e) => setLogoSubtext(e.target.value)}
                placeholder="PAYMENTS & SPLIT"
                className="w-full px-4 py-3 bg-[#050811] border border-white/10 rounded-xl text-white text-sm font-bold focus:outline-none focus:border-[#D9F22A] transition-colors"
              />
            </div>

            <div className="sm:col-span-2 space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-white/80 flex items-center justify-between">
                <span>Cor de Destaque Neon</span>
                <span className="font-mono text-[11px] text-[#D9F22A]">{accentColor}</span>
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="w-12 h-10 rounded-lg cursor-pointer bg-transparent border border-white/20"
                />
                {/* Paleta rápida de neon */}
                <div className="flex items-center gap-2">
                  {['#D9F22A', '#00FF88', '#00F0FF', '#FF0055', '#FFB800', '#FFFFFF'].map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setAccentColor(color)}
                      className="w-7 h-7 rounded-full border border-white/20 cursor-pointer hover:scale-110 transition-transform"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Botão de Gravação */}
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="w-full bg-[#D9F22A] hover:bg-[#cbe31c] disabled:opacity-50 text-[#060A15] font-black py-4 px-6 rounded-xl text-xs sm:text-sm uppercase tracking-wider shadow-[0_0_25px_rgba(217,242,42,0.35)] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Gravando no Banco de Dados...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Salvar e Aplicar Logotipo</span>
              </>
            )}
          </button>
        </div>

        {/* Coluna 2: Live Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#050811] border border-white/10 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 text-xs font-bold uppercase tracking-wider text-white/70">
              <span className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-[#D9F22A]" />
                Pré-visualização em Tempo Real
              </span>
              <span className="text-[10px] text-[#D9F22A] bg-[#D9F22A]/10 px-2 py-0.5 rounded">
                Live
              </span>
            </div>

            {/* Preview no Header da Página Inicial */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                Visualização no Topo do Site (Header):
              </span>
              <div className="p-4 rounded-xl bg-[#060A15] border border-white/10 flex items-center justify-between">
                <TechifyLogo 
                  size="md" 
                  overrideLogoUrl={selectedType === 'custom_image' ? inputUrl : undefined} 
                />
                <div className="flex items-center gap-2 text-[10px] text-white/40">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Online
                </div>
              </div>
            </div>

            {/* Preview em Tamanho Maior */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                Visualização Expandida (Hero / Login):
              </span>
              <div className="p-6 rounded-xl bg-[#060A15] border border-white/10 flex items-center justify-center">
                <TechifyLogo 
                  size="lg" 
                  overrideLogoUrl={selectedType === 'custom_image' ? inputUrl : undefined} 
                />
              </div>
            </div>

            {/* Preview em Tamanho Compacto (Sidebar) */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                Visualização Compacta (Menu Lateral):
              </span>
              <div className="p-3 rounded-xl bg-[#060A15] border border-white/10 flex items-center justify-start">
                <TechifyLogo 
                  size="sm" 
                  overrideLogoUrl={selectedType === 'custom_image' ? inputUrl : undefined} 
                />
              </div>
            </div>

            <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5 text-[11px] text-white/50 leading-relaxed">
              <Sparkles className="w-3.5 h-3.5 text-[#D9F22A] inline mr-1" />
              Ao salvar, a nova logo é sincronizada no Firestore e carregada automaticamente para todos os visitantes e usuários logados.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
