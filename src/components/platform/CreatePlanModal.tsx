import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Building2,
  Check,
  CheckCircle2,
  CircleDollarSign,
  Image as ImageIcon,
  Layers,
  Link as LinkIcon,
  Loader2,
  PackageCheck,
  Plus,
  Send,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { CompanyPlan, CompanyStartup, ProductDeliveryType } from '../../types/platform';
import { getCompanyPlanDeliverySettings } from '../../services/firestoreService';

interface CreatePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  companies: CompanyStartup[];
  defaultCompanyId?: string;
  initialData?: CompanyPlan | null;
  onPlanCreated: (plan: Omit<CompanyPlan, 'id' | 'createdAt'>) => Promise<unknown> | unknown;
  onPlanUpdated?: (planId: string, plan: Partial<CompanyPlan>) => Promise<unknown> | unknown;
}

type MainTab = 'produto' | 'pagamento';
type ImageTab = 'upload' | 'url' | 'presets';

const PRESET_BANNERS = [
  {
    name: 'SaaS Dashboard',
    url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=82',
  },
  {
    name: 'Fintech',
    url: 'https://images.unsplash.com/photo-1642543492481-44e81e3914a7?auto=format&fit=crop&w=1200&q=82',
  },
  {
    name: 'IA & Automação',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=82',
  },
  {
    name: 'Marketing & Vendas',
    url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=82',
  },
];

const DELIVERY_OPTIONS: Array<{
  value: ProductDeliveryType;
  label: string;
  description: string;
  placeholder: string;
}> = [
  {
    value: 'redirect',
    label: 'Página / URL externa',
    description: 'O cliente recebe o link somente depois do pagamento confirmado.',
    placeholder: 'https://seusite.com/acesso',
  },
  {
    value: 'whatsapp',
    label: 'WhatsApp / Grupo VIP',
    description: 'Libera um botão para grupo ou atendimento no WhatsApp.',
    placeholder: 'https://chat.whatsapp.com/... ou https://wa.me/55...',
  },
  {
    value: 'membership',
    label: 'Área de membros / App',
    description: 'Libera o endereço da área de membros após a compra.',
    placeholder: 'https://membros.seusite.com/login',
  },
  {
    value: 'download',
    label: 'Download / Material digital',
    description: 'Libera um arquivo, Drive, Notion ou material hospedado.',
    placeholder: 'https://drive.google.com/... ou https://notion.so/...',
  },
];

const fieldClass =
  'w-full rounded-xl border border-white/10 bg-[#070c16] px-3.5 py-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-[#D9F22A]/70 focus:ring-2 focus:ring-[#D9F22A]/10';

const labelClass =
  'mb-1.5 block text-[11px] font-bold uppercase tracking-[0.08em] text-white/60';

function formatMoney(value: number) {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function isHttpsUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !['localhost', '127.0.0.1', '::1'].includes(url.hostname);
  } catch {
    return false;
  }
}

async function compressImageFile(file: File): Promise<string> {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Use uma imagem JPG, PNG ou WebP.');
  }
  if (file.size > 8 * 1024 * 1024) {
    throw new Error('A imagem original deve ter no máximo 8 MB.');
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
    reader.onload = () => resolve(String(reader.result || ''));
    reader.readAsDataURL(file);
  });

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image();
    element.onload = () => resolve(element);
    element.onerror = () => reject(new Error('Não foi possível processar a imagem.'));
    element.src = dataUrl;
  });

  const maxWidth = 1400;
  const maxHeight = 900;
  const scale = Math.min(1, maxWidth / image.naturalWidth, maxHeight / image.naturalHeight);
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Seu navegador não conseguiu preparar a imagem.');
  }

  context.drawImage(image, 0, 0, width, height);

  let quality = 0.84;
  let output = canvas.toDataURL('image/webp', quality);
  while (output.length > 520_000 && quality > 0.42) {
    quality -= 0.08;
    output = canvas.toDataURL('image/webp', quality);
  }

  if (output.length > 580_000) {
    throw new Error('A imagem continuou grande demais após a compactação. Tente outra imagem.');
  }

  return output;
}

export const CreatePlanModal: React.FC<CreatePlanModalProps> = ({
  isOpen,
  onClose,
  companies = [],
  defaultCompanyId,
  initialData,
  onPlanCreated,
  onPlanUpdated,
}) => {
  const isEditMode = Boolean(initialData);

  const [activeTab, setActiveTab] = useState<MainTab>('produto');
  const [companyId, setCompanyId] = useState('');
  const [name, setName] = useState('');
  const [badge, setBadge] = useState('');
  const [category, setCategory] = useState('SaaS / B2B');
  const [description, setDescription] = useState('');
  const [features, setFeatures] = useState<string[]>([]);
  const [newFeatureText, setNewFeatureText] = useState('');
  const [deliveryType, setDeliveryType] = useState<ProductDeliveryType>('redirect');
  const [deliveryUrl, setDeliveryUrl] = useState('');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  const [bannerImage, setBannerImage] = useState('');
  const [imageTab, setImageTab] = useState<ImageTab>('upload');

  const [priceSetup, setPriceSetup] = useState('');
  const [commissionPercentage, setCommissionPercentage] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingPrivateSettings, setIsLoadingPrivateSettings] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [formError, setFormError] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    setActiveTab('produto');
    setFormError('');
    setNewFeatureText('');
    setImageTab('upload');

    if (initialData) {
      setCompanyId(initialData.companyId || companies[0]?.id || '');
      setName(initialData.name || '');
      setBadge(initialData.badge || '');
      setCategory(initialData.category || 'SaaS / B2B');
      setDescription(initialData.description || '');
      setFeatures(initialData.features ? [...initialData.features] : []);
      setBannerImage(initialData.bannerImage || '');
      setPriceSetup(initialData.priceSetup !== undefined ? String(initialData.priceSetup) : '');
      setCommissionPercentage(
        initialData.commissionPercentage !== undefined
          ? String(initialData.commissionPercentage)
          : '',
      );

      setDeliveryType(initialData.deliveryType || 'redirect');
      setDeliveryUrl(initialData.deliveryUrl || initialData.thankYouPageUrl || '');
      setDeliveryInstructions(initialData.deliveryInstructions || '');

      let cancelled = false;
      setIsLoadingPrivateSettings(true);

      getCompanyPlanDeliverySettings(initialData.id)
        .then((settings) => {
          if (cancelled) return;
          setDeliveryType(settings.deliveryType || 'redirect');
          setDeliveryUrl(settings.deliveryUrl || '');
          setDeliveryInstructions(settings.deliveryInstructions || '');
        })
        .catch((error) => {
          if (cancelled) return;
          console.warn('[Plan delivery settings]', error);
          setFormError(
            error instanceof Error
              ? error.message
              : 'Não foi possível carregar a configuração privada de entrega.',
          );
        })
        .finally(() => {
          if (!cancelled) setIsLoadingPrivateSettings(false);
        });

      return () => {
        cancelled = true;
      };
    }

    const targetCompany =
      (defaultCompanyId && companies.find((company) => company.id === defaultCompanyId)) ||
      companies[0];

    setCompanyId(targetCompany?.id || '');
    setName('');
    setBadge('');
    setCategory(targetCompany?.category || 'SaaS / B2B');
    setDescription('');
    setFeatures([]);
    setDeliveryType('redirect');
    setDeliveryUrl('');
    setDeliveryInstructions('');
    setBannerImage('');
    setPriceSetup('');
    setCommissionPercentage('');
    setIsLoadingPrivateSettings(false);
  }, [isOpen, initialData, defaultCompanyId, companies]);

  const currentCompany = useMemo(
    () => companies.find((company) => company.id === companyId),
    [companies, companyId],
  );

  const price = Number.parseFloat(priceSetup.replace(',', '.')) || 0;
  const commissionPercent =
    Number.parseFloat(commissionPercentage.replace(',', '.')) || 0;
  const commissionValue = Number(((price * commissionPercent) / 100).toFixed(2));
  const companyBeforeFees = Math.max(0, price - commissionValue);

  const deliveryOption =
    DELIVERY_OPTIONS.find((option) => option.value === deliveryType) || DELIVERY_OPTIONS[0];

  if (!isOpen) return null;

  const addFeature = () => {
    const clean = newFeatureText.trim();
    if (!clean) return;

    if (features.length >= 30) {
      setFormError('Você pode cadastrar até 30 benefícios por produto.');
      return;
    }

    if (features.some((feature) => feature.toLowerCase() === clean.toLowerCase())) {
      setFormError('Esse benefício já foi adicionado.');
      return;
    }

    setFeatures((current) => [...current, clean.slice(0, 180)]);
    setNewFeatureText('');
    setFormError('');
  };

  const suggestFeatures = () => {
    setFeatures([
      'Acesso imediato após aprovação do pagamento',
      'Suporte ao cliente',
      'Atualizações incluídas',
      'Compatível com celular e computador',
    ]);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessingImage(true);
    setFormError('');

    try {
      const compressed = await compressImageFile(file);
      setBannerImage(compressed);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Não foi possível carregar a imagem.');
    } finally {
      setIsProcessingImage(false);
      event.target.value = '';
    }
  };

  const validateProductTab = () => {
    if (!currentCompany) return 'Selecione uma empresa válida.';
    if (currentCompany.verified !== true || currentCompany.status !== 'approved') {
      return 'A empresa precisa estar aprovada antes de publicar produtos.';
    }
    if (name.trim().length < 3) {
      return 'Informe um nome de produto com pelo menos 3 caracteres.';
    }
    if (description.trim().length < 10) {
      return 'Descreva o produto com pelo menos 10 caracteres.';
    }
    if (!DELIVERY_OPTIONS.some((option) => option.value === deliveryType)) {
      return 'Escolha um método de entrega disponível.';
    }
    if (!deliveryUrl.trim() || !isHttpsUrl(deliveryUrl.trim())) {
      return 'Informe uma URL HTTPS pública válida para a entrega.';
    }
    if (bannerImage && !bannerImage.startsWith('data:image/') && !isHttpsUrl(bannerImage)) {
      return 'A URL da imagem precisa usar HTTPS.';
    }
    return '';
  };

  const validatePaymentTab = () => {
    if (price < 0.5) {
      return 'O preço mínimo da oferta é R$ 0,50.';
    }
    if (commissionPercent <= 0 || commissionPercent > 100) {
      return 'A comissão do afiliado deve ficar entre 0,01% e 100%.';
    }
    return '';
  };

  const goToPaymentTab = () => {
    const error = validateProductTab();
    if (error) {
      setFormError(error);
      setActiveTab('produto');
      return;
    }
    setFormError('');
    setActiveTab('pagamento');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting || isLoadingPrivateSettings || isProcessingImage) return;

    const productError = validateProductTab();
    if (productError) {
      setFormError(productError);
      setActiveTab('produto');
      return;
    }

    const paymentError = validatePaymentTab();
    if (paymentError) {
      setFormError(paymentError);
      setActiveTab('pagamento');
      return;
    }

    const targetCompany = currentCompany!;
    setIsSubmitting(true);
    setFormError('');

    try {
      const planPayload: Omit<CompanyPlan, 'id' | 'createdAt'> = {
        companyId: targetCompany.id,
        companyName: targetCompany.companyName || targetCompany.name,
        companyLogo: targetCompany.logo || '',
        category,
        name: name.trim(),
        description: description.trim(),
        price: Number(price.toFixed(2)),
        priceSetup: Number(price.toFixed(2)),
        priceMonthly: 0,
        paymentType: 'Único',
        billingType: 'unico',
        commissionPercentage: Number(commissionPercent.toFixed(2)),
        commissionValue,
        recurrentCommissionPercent: 0,
        recurrentCommissionValue: 0,
        recurrentCommission: 0,
        features,
        bannerImage: bannerImage.trim(),
        affiliatesCount: initialData?.affiliatesCount || 0,
        totalSales: initialData?.totalSales || 0,
        badge: badge.trim(),
        deliveryType,
        deliveryUrl: deliveryUrl.trim(),
        deliveryInstructions: deliveryInstructions.trim() || undefined,
        thankYouPageUrl: deliveryUrl.trim(),
        status: initialData?.status || 'Ativo',
        allowAffiliates: true,
      };

      if (isEditMode && initialData && onPlanUpdated) {
        await onPlanUpdated(initialData.id, planPayload);
      } else {
        await onPlanCreated(planPayload);
      }

      onClose();
    } catch (error) {
      console.error('[CreatePlanModal]', error);
      setFormError(
        error instanceof Error
          ? error.message
          : 'Não foi possível salvar o produto. Tente novamente.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-2 backdrop-blur-md sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-label={isEditMode ? 'Editar produto' : 'Cadastrar novo produto'}
    >
      <div className="flex max-h-[95vh] w-full max-w-5xl flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[#0A101C] shadow-[0_30px_120px_rgba(0,0,0,0.65)]">
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 px-5 py-5 sm:px-7">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#D9F22A]/25 bg-[#D9F22A]/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#D9F22A]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#D9F22A]" />
                {isEditMode ? 'Editar oferta' : 'Nova oferta'}
              </span>
              <span className="text-[11px] text-white/35">Stripe Connect • Pagamento único</span>
            </div>
            <h2 className="text-xl font-extrabold tracking-tight text-white sm:text-2xl">
              {isEditMode ? 'Editar produto e comissão' : 'Cadastrar novo produto'}
            </h2>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-white/50">
              Primeiro configure o produto. Depois defina preço e comissão na aba de pagamento.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/50 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="shrink-0 border-b border-white/10 bg-[#080d17] px-5 py-3 sm:px-7">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setFormError('');
                setActiveTab('produto');
              }}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${
                activeTab === 'produto'
                  ? 'border-[#D9F22A]/45 bg-[#D9F22A]/10'
                  : 'border-white/8 bg-white/[0.025] hover:bg-white/[0.04]'
              }`}
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                  activeTab === 'produto'
                    ? 'bg-[#D9F22A] text-[#07100A]'
                    : 'bg-white/5 text-white/45'
                }`}
              >
                <PackageCheck className="h-4 w-4" />
              </span>
              <div>
                <div className={`text-xs font-bold ${activeTab === 'produto' ? 'text-white' : 'text-white/60'}`}>
                  1. Produto
                </div>
                <div className="mt-0.5 hidden text-[10px] text-white/35 sm:block">
                  Dados, entrega e imagem
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={goToPaymentTab}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${
                activeTab === 'pagamento'
                  ? 'border-[#D9F22A]/45 bg-[#D9F22A]/10'
                  : 'border-white/8 bg-white/[0.025] hover:bg-white/[0.04]'
              }`}
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                  activeTab === 'pagamento'
                    ? 'bg-[#D9F22A] text-[#07100A]'
                    : 'bg-white/5 text-white/45'
                }`}
              >
                <CircleDollarSign className="h-4 w-4" />
              </span>
              <div>
                <div className={`text-xs font-bold ${activeTab === 'pagamento' ? 'text-white' : 'text-white/60'}`}>
                  2. Pagamento
                </div>
                <div className="mt-0.5 hidden text-[10px] text-white/35 sm:block">
                  Preço e comissão
                </div>
              </div>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
            {formError && (
              <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs leading-5 text-red-300">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {activeTab === 'produto' && (
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]">
                <div className="space-y-5">
                  <section className="rounded-2xl border border-white/10 bg-[#0D1422] p-4 sm:p-5">
                    <div className="mb-4 flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-[#D9F22A]" />
                      <div>
                        <h3 className="text-sm font-bold text-white">Informações do produto</h3>
                        <p className="text-[11px] text-white/40">Dados exibidos no catálogo e no checkout.</p>
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className={labelClass}>Empresa responsável</label>
                      {companies.length === 0 ? (
                        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300">
                          Nenhuma empresa aprovada disponível.
                        </div>
                      ) : companies.length === 1 ? (
                        <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#070c16] p-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/5">
                              {companies[0].logo ? (
                                <img src={companies[0].logo} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <Building2 className="h-4 w-4 text-[#D9F22A]" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="truncate text-sm font-bold text-white">{companies[0].name}</div>
                              <div className="mt-0.5 flex items-center gap-1 text-[10px] text-emerald-400">
                                <BadgeCheck className="h-3 w-3" />
                                Empresa vinculada
                              </div>
                            </div>
                          </div>
                          <span className="hidden rounded-full border border-[#D9F22A]/20 bg-[#D9F22A]/10 px-2.5 py-1 text-[10px] font-bold text-[#D9F22A] sm:inline-flex">
                            Oferta exclusiva
                          </span>
                        </div>
                      ) : (
                        <select
                          value={companyId}
                          onChange={(event) => {
                            const nextId = event.target.value;
                            setCompanyId(nextId);
                            const nextCompany = companies.find((company) => company.id === nextId);
                            if (nextCompany?.category) setCategory(nextCompany.category);
                          }}
                          className={fieldClass}
                        >
                          {companies.map((company) => (
                            <option key={company.id} value={company.id} className="bg-[#0A101C]">
                              {company.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className={labelClass}>Nome do produto *</label>
                        <input
                          value={name}
                          onChange={(event) => setName(event.target.value)}
                          maxLength={160}
                          placeholder="Ex: Starter • Tração & Vendas"
                          className={fieldClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Selo / tag</label>
                        <input
                          value={badge}
                          onChange={(event) => setBadge(event.target.value)}
                          maxLength={25}
                          placeholder="Ex: Mais vendido"
                          className={fieldClass}
                        />
                      </div>
                    </div>

                    <div className="mt-4">
                      <label className={labelClass}>Categoria</label>
                      <select
                        value={category}
                        onChange={(event) => setCategory(event.target.value)}
                        className={fieldClass}
                      >
                        <option value="SaaS / B2B">SaaS / B2B</option>
                        <option value="iGaming & Apostas">iGaming & Apostas</option>
                        <option value="Fintech & Pagamentos">Fintech & Pagamentos</option>
                        <option value="Marketing & Vendas">Marketing & Vendas</option>
                        <option value="IA & Automação">IA & Automação</option>
                        <option value="Educação / Cursos">Educação / Cursos</option>
                        <option value="E-commerce / Dropship">E-commerce / Dropship</option>
                      </select>
                    </div>

                    <div className="mt-4">
                      <label className={labelClass}>Descrição *</label>
                      <textarea
                        rows={4}
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
                        maxLength={5000}
                        placeholder="Explique claramente o que o cliente recebe ao comprar este produto."
                        className={`${fieldClass} resize-none`}
                      />
                      <div className="mt-1 text-right text-[10px] text-white/25">
                        {description.length}/5000
                      </div>
                    </div>
                  </section>

                  <section className="rounded-2xl border border-white/10 bg-[#0D1422] p-4 sm:p-5">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-[#D9F22A]" />
                        <div>
                          <h3 className="text-sm font-bold text-white">Benefícios e recursos</h3>
                          <p className="text-[11px] text-white/40">{features.length} item(ns) cadastrados.</p>
                        </div>
                      </div>
                      {features.length === 0 && (
                        <button
                          type="button"
                          onClick={suggestFeatures}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-[#D9F22A] hover:underline"
                        >
                          <Sparkles className="h-3 w-3" />
                          Inserir exemplos
                        </button>
                      )}
                    </div>

                    {features.length > 0 && (
                      <div className="mb-3 grid gap-2 sm:grid-cols-2">
                        {features.map((feature, index) => (
                          <div
                            key={`${feature}-${index}`}
                            className="flex items-start justify-between gap-2 rounded-xl border border-white/8 bg-[#070c16] px-3 py-2.5"
                          >
                            <div className="flex min-w-0 items-start gap-2">
                              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#D9F22A]" />
                              <span className="text-xs leading-5 text-white/75">{feature}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                setFeatures((current) => current.filter((_, itemIndex) => itemIndex !== index))
                              }
                              className="shrink-0 rounded-md p-1 text-white/30 transition hover:bg-red-500/10 hover:text-red-400"
                              aria-label="Remover benefício"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input
                        value={newFeatureText}
                        onChange={(event) => setNewFeatureText(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            addFeature();
                          }
                        }}
                        maxLength={180}
                        placeholder="Ex: Suporte VIP via WhatsApp"
                        className={`${fieldClass} flex-1`}
                      />
                      <button
                        type="button"
                        onClick={addFeature}
                        className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-4 text-xs font-bold text-white transition hover:bg-white/10"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Adicionar
                      </button>
                    </div>
                  </section>

                  <section className="rounded-2xl border border-[#D9F22A]/15 bg-[#0D1422] p-4 sm:p-5">
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Send className="h-4 w-4 text-[#D9F22A]" />
                        <div>
                          <h3 className="text-sm font-bold text-white">Entrega após o pagamento</h3>
                          <p className="text-[11px] text-white/40">
                            O endereço fica privado e só é liberado depois da confirmação da Stripe.
                          </p>
                        </div>
                      </div>
                      <span className="hidden rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-400 sm:inline-flex">
                        Protegido
                      </span>
                    </div>

                    {isLoadingPrivateSettings ? (
                      <div className="flex items-center gap-2 rounded-xl border border-white/8 bg-[#070c16] p-4 text-xs text-white/50">
                        <Loader2 className="h-4 w-4 animate-spin text-[#D9F22A]" />
                        Carregando configuração privada de entrega...
                      </div>
                    ) : (
                      <>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {DELIVERY_OPTIONS.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => setDeliveryType(option.value)}
                              className={`rounded-xl border p-3 text-left transition ${
                                deliveryType === option.value
                                  ? 'border-[#D9F22A]/45 bg-[#D9F22A]/10'
                                  : 'border-white/8 bg-[#070c16] hover:border-white/15'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-bold text-white">{option.label}</span>
                                {deliveryType === option.value && <Check className="h-3.5 w-3.5 text-[#D9F22A]" />}
                              </div>
                              <p className="mt-1 text-[10px] leading-4 text-white/40">{option.description}</p>
                            </button>
                          ))}
                        </div>

                        <div className="mt-4">
                          <label className={labelClass}>URL de entrega *</label>
                          <input
                            type="url"
                            value={deliveryUrl}
                            onChange={(event) => setDeliveryUrl(event.target.value)}
                            placeholder={deliveryOption.placeholder}
                            className={fieldClass}
                          />
                          <p className="mt-1.5 text-[10px] leading-4 text-white/35">
                            Use HTTPS. O cliente não verá esse link antes do pagamento aprovado.
                          </p>
                        </div>

                        <div className="mt-4">
                          <label className={labelClass}>Instruções para o comprador</label>
                          <textarea
                            rows={3}
                            value={deliveryInstructions}
                            onChange={(event) => setDeliveryInstructions(event.target.value)}
                            maxLength={3000}
                            placeholder="Ex: Use o mesmo e-mail da compra para acessar sua conta."
                            className={`${fieldClass} resize-none`}
                          />
                        </div>
                      </>
                    )}
                  </section>
                </div>

                <aside className="space-y-5">
                  <section className="rounded-2xl border border-white/10 bg-[#0D1422] p-4 sm:p-5">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-bold text-white">Imagem do produto</h3>
                        <p className="mt-0.5 text-[11px] text-white/40">Usada no catálogo e no checkout.</p>
                      </div>
                      <ImageIcon className="h-4 w-4 text-[#D9F22A]" />
                    </div>

                    <div className="mb-3 grid grid-cols-3 gap-1 rounded-xl border border-white/8 bg-[#070c16] p-1">
                      {([
                        ['upload', 'Upload'],
                        ['url', 'URL'],
                        ['presets', 'Modelos'],
                      ] as Array<[ImageTab, string]>).map(([tab, text]) => (
                        <button
                          key={tab}
                          type="button"
                          onClick={() => setImageTab(tab)}
                          className={`rounded-lg px-2 py-2 text-[10px] font-bold transition ${
                            imageTab === tab
                              ? 'bg-[#D9F22A] text-[#07100A]'
                              : 'text-white/45 hover:text-white'
                          }`}
                        >
                          {text}
                        </button>
                      ))}
                    </div>

                    {imageTab === 'upload' && (
                      <>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isProcessingImage}
                          className="flex min-h-32 w-full flex-col items-center justify-center rounded-xl border border-dashed border-white/15 bg-[#070c16] p-4 text-center transition hover:border-[#D9F22A]/45 disabled:opacity-50"
                        >
                          {isProcessingImage ? (
                            <Loader2 className="mb-2 h-6 w-6 animate-spin text-[#D9F22A]" />
                          ) : (
                            <Upload className="mb-2 h-6 w-6 text-[#D9F22A]" />
                          )}
                          <span className="text-xs font-bold text-white">
                            {isProcessingImage ? 'Compactando imagem...' : 'Selecionar imagem'}
                          </span>
                          <span className="mt-1 text-[10px] text-white/35">JPG, PNG ou WebP • até 8 MB</span>
                        </button>
                      </>
                    )}

                    {imageTab === 'url' && (
                      <div>
                        <label className={labelClass}>Link HTTPS da imagem</label>
                        <div className="relative">
                          <LinkIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/25" />
                          <input
                            type="url"
                            value={bannerImage.startsWith('data:image/') ? '' : bannerImage}
                            onChange={(event) => setBannerImage(event.target.value)}
                            placeholder="https://..."
                            className={`${fieldClass} pl-9`}
                          />
                        </div>
                      </div>
                    )}

                    {imageTab === 'presets' && (
                      <div className="grid gap-2">
                        {PRESET_BANNERS.map((banner) => (
                          <button
                            key={banner.name}
                            type="button"
                            onClick={() => setBannerImage(banner.url)}
                            className={`flex items-center gap-3 rounded-xl border p-2 text-left transition ${
                              bannerImage === banner.url
                                ? 'border-[#D9F22A]/45 bg-[#D9F22A]/10'
                                : 'border-white/8 bg-[#070c16] hover:border-white/15'
                            }`}
                          >
                            <img
                              src={banner.url}
                              alt=""
                              className="h-10 w-14 rounded-lg object-cover"
                            />
                            <span className="text-[11px] font-semibold text-white/70">{banner.name}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {bannerImage && (
                      <div className="mt-3 overflow-hidden rounded-xl border border-white/10">
                        <div className="relative h-40 bg-[#070c16]">
                          <img src={bannerImage} alt="Prévia" className="h-full w-full object-cover" />
                          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/90 to-transparent p-3 pt-10">
                            <span className="text-[10px] font-bold text-white">Prévia selecionada</span>
                            <button
                              type="button"
                              onClick={() => setBannerImage('')}
                              className="rounded-lg bg-black/60 p-1.5 text-white/60 backdrop-blur transition hover:text-red-400"
                              aria-label="Remover imagem"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </section>

                  <section className="rounded-2xl border border-white/10 bg-[#0D1422] p-4 sm:p-5">
                    <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/35">
                      Visão rápida
                    </div>
                    <div className="mt-3 space-y-3">
                      <div>
                        <div className="text-[10px] text-white/35">Produto</div>
                        <div className="mt-0.5 text-sm font-bold text-white">
                          {name.trim() || 'Nome do produto'}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-white/35">Empresa</div>
                        <div className="mt-0.5 text-xs font-medium text-white/70">
                          {currentCompany?.name || 'Não selecionada'}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-white/35">Entrega</div>
                        <div className="mt-0.5 text-xs font-medium text-white/70">
                          {deliveryOption.label}
                        </div>
                      </div>
                    </div>
                  </section>
                </aside>
              </div>
            )}

            {activeTab === 'pagamento' && (
              <div className="mx-auto max-w-4xl space-y-5">
                <section className="rounded-2xl border border-white/10 bg-[#0D1422] p-4 sm:p-6">
                  <div className="mb-5 flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#D9F22A]/10 text-[#D9F22A]">
                        <CircleDollarSign className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-white">Pagamento do produto</h3>
                        <p className="mt-1 text-xs leading-5 text-white/45">
                          Estes valores são usados pelo checkout real da Stripe. A empresa e o afiliado recebem conforme as regras da plataforma.
                        </p>
                      </div>
                    </div>
                    <span className="hidden rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-400 sm:inline-flex">
                      Stripe Connect
                    </span>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-[#D9F22A]/40 bg-[#D9F22A]/10 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-bold text-white">Pagamento único</div>
                        <Check className="h-4 w-4 text-[#D9F22A]" />
                      </div>
                      <p className="mt-1 text-[11px] leading-5 text-white/45">
                        O cliente paga uma única vez no checkout.
                      </p>
                    </div>
                    <div className="rounded-xl border border-white/8 bg-[#070c16] p-4 opacity-55">
                      <div className="text-sm font-bold text-white/60">Assinatura recorrente</div>
                      <p className="mt-1 text-[11px] leading-5 text-white/35">
                        Ainda não está liberada para produtos de empresas.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className={labelClass}>Preço de venda (R$) *</label>
                      <input
                        inputMode="decimal"
                        value={priceSetup}
                        onChange={(event) =>
                          setPriceSetup(event.target.value.replace(/[^0-9.,]/g, ''))
                        }
                        placeholder="197,00"
                        className={fieldClass}
                      />
                      <p className="mt-1.5 text-[10px] text-white/35">Mínimo: R$ 0,50.</p>
                    </div>

                    <div>
                      <label className={labelClass}>Comissão do afiliado (%) *</label>
                      <input
                        inputMode="decimal"
                        value={commissionPercentage}
                        onChange={(event) =>
                          setCommissionPercentage(event.target.value.replace(/[^0-9.,]/g, ''))
                        }
                        placeholder="40"
                        className={fieldClass}
                      />
                      <p className="mt-1.5 text-[10px] text-white/35">De 0,01% até 100%.</p>
                    </div>
                  </div>
                </section>

                <section className="overflow-hidden rounded-2xl border border-[#D9F22A]/20 bg-[#0D1422]">
                  <div className="border-b border-white/8 px-5 py-4">
                    <div className="text-sm font-bold text-white">Resumo da venda</div>
                    <div className="mt-1 text-[11px] text-white/40">
                      Prévia antes das taxas operacionais da plataforma.
                    </div>
                  </div>

                  <div className="grid gap-px bg-white/8 sm:grid-cols-3">
                    <div className="bg-[#0D1422] p-5">
                      <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-white/35">
                        Cliente paga
                      </div>
                      <div className="mt-2 text-xl font-black text-white">{formatMoney(price)}</div>
                    </div>
                    <div className="bg-[#0D1422] p-5">
                      <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#D9F22A]/70">
                        Afiliado recebe
                      </div>
                      <div className="mt-2 text-xl font-black text-[#D9F22A]">
                        {formatMoney(commissionValue)}
                      </div>
                      <div className="mt-1 text-[10px] text-white/35">
                        {commissionPercent > 0 ? `${commissionPercent}% por venda` : 'Defina a comissão'}
                      </div>
                    </div>
                    <div className="bg-[#0D1422] p-5">
                      <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-white/35">
                        Empresa antes das taxas
                      </div>
                      <div className="mt-2 text-xl font-black text-white">
                        {formatMoney(companyBeforeFees)}
                      </div>
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-white/10 bg-[#0D1422] p-5">
                  <div className="flex items-start gap-3">
                    <Layers className="mt-0.5 h-4 w-4 shrink-0 text-[#D9F22A]" />
                    <div>
                      <div className="text-sm font-bold text-white">{name.trim() || 'Seu produto'}</div>
                      <p className="mt-1 text-xs leading-5 text-white/45">
                        Ao salvar, a oferta ficará disponível para afiliação quando estiver ativa e a empresa estiver aprovada.
                      </p>
                    </div>
                  </div>
                </section>
              </div>
            )}
          </div>

          <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-white/10 bg-[#080d17] px-5 py-4 sm:px-7">
            {activeTab === 'produto' ? (
              <>
                <div className="hidden text-[11px] text-white/35 sm:block">
                  Etapa 1 de 2 • Dados do produto
                </div>
                <button
                  type="button"
                  onClick={goToPaymentTab}
                  disabled={isLoadingPrivateSettings || isProcessingImage}
                  className="ml-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#D9F22A] px-5 text-xs font-black text-[#07100A] transition hover:bg-[#cde71f] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Ir para pagamento
                  <ArrowRight className="h-4 w-4" />
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setFormError('');
                    setActiveTab('produto');
                  }}
                  disabled={isSubmitting}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-xs font-bold text-white transition hover:bg-white/10 disabled:opacity-50"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Voltar ao produto
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting || isLoadingPrivateSettings || isProcessingImage}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#D9F22A] px-5 text-xs font-black text-[#07100A] shadow-[0_0_25px_rgba(217,242,42,0.18)] transition hover:bg-[#cde71f] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : isEditMode ? (
                    <>
                      <Check className="h-4 w-4" />
                      Salvar alterações
                    </>
                  ) : (
                    <>
                      <Layers className="h-4 w-4" />
                      Salvar e liberar para afiliados
                    </>
                  )}
                </button>
              </>
            )}
          </footer>
        </form>
      </div>
    </div>
  );
};
