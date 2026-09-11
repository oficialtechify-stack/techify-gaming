import React from 'react';
import { 
  ShieldAlert, 
  ShieldCheck, 
  Clock, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  ArrowRight,
  HelpCircle,
  Lock
} from 'lucide-react';

interface ProductionActivationModalProps {
  isOpen: boolean;
  onClose: () => void;
  isVerified: boolean;
  onConfirmActivateProduction: () => void;
  onNavigateToKYC: () => void;
  companyName?: string;
  currentKycStatus?: 'pending' | 'submitted' | 'verified';
}

export const ProductionActivationModal: React.FC<ProductionActivationModalProps> = ({
  isOpen,
  onClose,
  isVerified,
  onConfirmActivateProduction,
  onNavigateToKYC,
  companyName = 'Sua Empresa',
  currentKycStatus = 'pending'
}) => {
  if (!isOpen) return null;

  return (
    <div 
      id="production-activation-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-lg rounded-2xl bg-[#0a101f] border border-white/10 shadow-2xl overflow-hidden">
        {/* Header Ribbon */}
        <div className={`h-2 w-full ${isVerified ? 'bg-emerald-500' : 'bg-gradient-to-r from-amber-500 to-orange-500'}`} />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white flex items-center justify-center cursor-pointer transition-colors border border-white/10"
          title="Fechar"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-6 sm:p-7">
          {isVerified ? (
            /* ============================================================ */
            /* CASO 1: EMPRESA JÁ HOMOLOGADA E VALIDADA (KYC VERIFIED)      */
            /* ============================================================ */
            <div className="text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                <ShieldCheck className="w-8 h-8" />
              </div>

              <div>
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 mb-2">
                  Documentação Verificada (KYC OK)
                </span>
                <h3 className="text-xl font-black text-white font-['Syne']">
                  Ativar Modo de Produção Real?
                </h3>
                <p className="text-xs sm:text-sm text-white/70 mt-2 max-w-md mx-auto leading-relaxed">
                  Sua conta empresarial <strong className="text-white">{companyName}</strong> está 100% homologada e validada pelo compliance.
                </p>
              </div>

              <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4 text-left text-xs space-y-2">
                <div className="flex items-start gap-2 text-emerald-400">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span className="text-white/80">
                    Cobranças reais via PIX e Cartão com liquidação bancária via Asaas.
                  </span>
                </div>
                <div className="flex items-start gap-2 text-emerald-400">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span className="text-white/80">
                    Transferências e saques habilitados para a chave PIX da sua titularidade.
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white/70 hover:text-white hover:bg-white/5 cursor-pointer transition-colors"
                >
                  Permanecer no Sandbox
                </button>
                <button
                  type="button"
                  id="btn-confirm-production"
                  onClick={onConfirmActivateProduction}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 cursor-pointer transition-all active:scale-95"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Ativar Produção</span>
                </button>
              </div>
            </div>
          ) : (
            /* ============================================================ */
            /* CASO 2: EMPRESA AINDA NÃO HOMOLOGADA (KYC PENDING/SUBMITTED)  */
            /* ============================================================ */
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {currentKycStatus === 'submitted' ? 'Em Análise de Compliance' : 'Validação Obrigatória'}
                    </span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-black text-white font-['Syne'] mt-0.5">
                    Ambiente de Produção — KYC
                  </h3>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-white/80 leading-relaxed">
                Para processar transações financeiras reais com liquidação bancária e saques no Asaas, sua conta empresarial precisa ser homologada pela nossa equipe de compliance e auditoria.
              </p>

              {/* Informações detalhadas do processo de homologação */}
              <div className="bg-gradient-to-b from-white/[0.04] to-white/[0.01] border border-white/10 rounded-xl p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Prazo de Análise</h4>
                    <p className="text-[11px] text-white/60 mt-0.5">
                      O processo de verificação cadastral leva <strong>até 7 dias úteis</strong> após o envio de todos os documentos obrigatórios.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Documentação Necessária</h4>
                    <p className="text-[11px] text-white/60 mt-0.5">
                      Contrato Social / CCMEI atualizado, documento de identidade com foto dos sócios e comprovante de domicílio bancário com a mesma titularidade do CNPJ/CPF.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Modo Sandbox Disponível</h4>
                    <p className="text-[11px] text-white/60 mt-0.5">
                      Enquanto sua documentação é avaliada, você pode continuar cadastrando produtos, gerando cupons e simulando pagamentos livremente.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold text-white/70 hover:text-white hover:bg-white/5 cursor-pointer transition-colors text-center"
                >
                  Continuar no Modo Teste
                </button>
                <button
                  type="button"
                  id="btn-go-to-kyc"
                  onClick={() => {
                    onClose();
                    onNavigateToKYC();
                  }}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 cursor-pointer transition-all active:scale-95"
                >
                  <span>Prosseguir para Envio de Documentos (KYC)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
