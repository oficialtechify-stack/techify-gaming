import React, { useState } from 'react';
import { 
  UserCheck, 
  ShieldCheck, 
  X, 
  Sparkles, 
  AlertCircle, 
  ArrowRight, 
  Wallet,
  CheckCircle2
} from 'lucide-react';
import { 
  formatCPF, 
  formatPhone, 
  isValidCPF, 
  getAuthErrorMessage 
} from '../../services/authService';

interface RegisterAffiliateModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName?: string;
  userEmail?: string;
  onSuccess: (data: {
    name: string;
    cpf: string;
    pixKey: string;
    pixKeyType: string;
    whatsapp?: string;
  }) => Promise<void>;
}

export const RegisterAffiliateModal: React.FC<RegisterAffiliateModalProps> = ({
  isOpen,
  onClose,
  userName = '',
  userEmail = '',
  onSuccess
}) => {
  const [name, setName] = useState(userName);
  const [cpf, setCpf] = useState('');
  const [pixKey, setPixKey] = useState('');
  const [pixKeyType, setPixKeyType] = useState('CPF');
  const [whatsapp, setWhatsapp] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCPF(e.target.value);
    setCpf(formatted);
    // If pixKeyType is CPF and user hasn't typed custom pixKey, keep in sync
    if (pixKeyType === 'CPF' && (!pixKey || pixKey === cpf)) {
      setPixKey(formatted);
    }
  };

  const handlePixKeyTypeChange = (type: string) => {
    setPixKeyType(type);
    if (type === 'CPF' && cpf) {
      setPixKey(cpf);
    } else if (type === 'E-mail' && userEmail) {
      setPixKey(userEmail);
    } else if (type === 'Celular' && whatsapp) {
      setPixKey(whatsapp);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanCpf = cpf.replace(/\D/g, '');
    if (cleanCpf.length !== 11) {
      setErrorMsg('Por favor, informe um CPF completo com 11 dígitos.');
      return;
    }

    if (!isValidCPF(cleanCpf)) {
      setErrorMsg('O CPF informado é inválido. Verifique os números digitados.');
      return;
    }

    if (!pixKey.trim()) {
      setErrorMsg('Informe sua chave PIX para recebimento de comissões instantâneas.');
      return;
    }

    if (!name.trim()) {
      setErrorMsg('Informe seu nome completo para o cadastro de afiliado.');
      return;
    }

    if (!acceptedTerms) {
      setErrorMsg('Você precisa aceitar os termos do programa de afiliados para continuar.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSuccess({
        name: name.trim(),
        cpf: cpf.trim(),
        pixKey: pixKey.trim(),
        pixKeyType,
        whatsapp: whatsapp.trim()
      });
      onClose();
    } catch (err: any) {
      console.error('Erro ao registrar afiliado:', err);
      const friendly = getAuthErrorMessage(err.code || err.message || 'custom/error');
      setErrorMsg(friendly);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#080d1a] border border-[#D9F22A]/40 rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(217,242,42,0.15)] max-h-[90vh] overflow-y-auto no-scrollbar">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-white/50 hover:text-white transition-colors cursor-pointer w-8 h-8 rounded-full bg-white/5 flex items-center justify-center"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#D9F22A] mb-1">
          <span className="w-2 h-2 rounded-full bg-[#D9F22A]" />
          Programa Oficial de Afiliados
        </div>

        <h3 className="text-xl sm:text-2xl font-black text-white font-['Syne'] mb-1.5">
          Cadastrar Perfil de Afiliado
        </h3>
        <p className="text-xs text-white/70 mb-5 leading-relaxed">
          Para acessar a visão de Afiliado, divulgar startups e receber comissões automáticas via PIX D+0, complete seus dados cadastrais e bancários.
        </p>

        {errorMsg && (
          <div className="mb-4 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-white/80 mb-1.5">
              Nome Completo do Afiliado *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Carlos Eduardo Silveira"
              className="w-full bg-[#050811] border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#D9F22A]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/80 mb-1.5">
                CPF do Titular *
              </label>
              <input
                type="text"
                required
                maxLength={14}
                value={cpf}
                onChange={handleCpfChange}
                placeholder="000.000.000-00"
                className="w-full bg-[#050811] border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#D9F22A]"
              />
              <span className="text-[10px] text-white/40 mt-1 block">Obrigatório para repasses fiscais</span>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/80 mb-1.5">
                WhatsApp / Celular
              </label>
              <input
                type="text"
                maxLength={15}
                value={whatsapp}
                onChange={(e) => setWhatsapp(formatPhone(e.target.value))}
                placeholder="(11) 99999-9999"
                className="w-full bg-[#050811] border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#D9F22A]"
              />
              <span className="text-[10px] text-white/40 mt-1 block">Para alertas de comissões</span>
            </div>
          </div>

          <div className="p-4 bg-[#050811] border border-white/10 rounded-2xl flex flex-col gap-3">
            <div className="flex items-center gap-2 text-xs font-bold text-[#D9F22A]">
              <Wallet className="w-4 h-4" />
              Chave PIX para Recebimento de Comissões (D+0)
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-white/70 mb-1">
                  Tipo de Chave PIX
                </label>
                <select
                  value={pixKeyType}
                  onChange={(e) => handlePixKeyTypeChange(e.target.value)}
                  className="w-full bg-[#080d1a] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#D9F22A]"
                >
                  <option value="CPF">CPF</option>
                  <option value="E-mail">E-mail</option>
                  <option value="Celular">Celular</option>
                  <option value="Chave Aleatória">Chave Aleatória (EVP)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-white/70 mb-1">
                  Chave PIX Cadastrada *
                </label>
                <input
                  type="text"
                  required
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
                  placeholder="Informe sua chave PIX"
                  className="w-full bg-[#080d1a] border border-white/15 rounded-xl px-3 py-2 text-xs text-white font-mono placeholder-white/40 focus:outline-none focus:border-[#D9F22A]"
                />
              </div>
            </div>
          </div>

          <label className="flex items-start gap-2.5 text-xs text-white/70 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="mt-0.5 accent-[#D9F22A] w-4 h-4 rounded cursor-pointer"
            />
            <span>
              Concordo com os Termos do Programa de Afiliados Techify e confirmo que os dados bancários pertencem ao meu CPF.
            </span>
          </label>

          <div className="flex items-center gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-xl text-xs uppercase tracking-wider transition-colors cursor-pointer border border-white/10"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-[#D9F22A] hover:bg-[#c8e217] text-[#060A15] font-black py-3 rounded-xl text-xs uppercase tracking-wider shadow-[0_0_25px_rgba(217,242,42,0.35)] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Salvando Perfil...</span>
              ) : (
                <>
                  <span>Concluir Cadastro</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
