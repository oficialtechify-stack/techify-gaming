import React from 'react';
import {
  ArrowRight,
  BadgeDollarSign,
  Bot,
  CheckCircle2,
  Link2,
  LineChart,
  ShoppingBag,
  Sparkles,
  Tags,
} from 'lucide-react';
import { ApiKeySection } from './ApiKeySection';
import { UserProfile, UserRoleMode } from '../../types/platform';
import { profileRoleStatus } from '../../../lib/profileEligibility';

interface AssistentesIaViewProps {
  userProfile?: UserProfile | null;
  onSaveProfile: (data: Partial<UserProfile>) => Promise<void>;
  roleMode?: UserRoleMode;
  onNavigateToProfile?: () => void;
}

export const AssistentesIaView: React.FC<AssistentesIaViewProps> = ({
  userProfile,
  roleMode = 'afiliado',
  onNavigateToProfile,
}) => {
  const activeRole = roleMode === 'empresa' ? 'empresa' : 'afiliado';
  const verificationStatus = profileRoleStatus((userProfile || {}) as Record<string, unknown>, activeRole);
  const approved = verificationStatus === 'approved';
  const isAffiliate = activeRole === 'afiliado';

  const affiliateBenefits = [
    {
      icon: BadgeDollarSign,
      title: 'Saldo e comissões',
      text: 'Pergunte quanto está disponível, quanto ainda está a liberar e o prazo do saldo.',
    },
    {
      icon: LineChart,
      title: 'Desempenho',
      text: 'Consulte vendas, comissão, cliques, conversão e comissão recorrente do seu perfil.',
    },
    {
      icon: Link2,
      title: 'Links e afiliações',
      text: 'A IA pode localizar suas afiliações ativas e devolver o link oficial com seu código.',
    },
    {
      icon: Tags,
      title: 'Cupons e checkout',
      text: 'Veja cupons liberados para você e gere checkout somente de produtos em que sua afiliação está ativa.',
    },
  ];

  const companyBenefits = [
    {
      icon: ShoppingBag,
      title: 'Produtos',
      text: 'Consulte as ofertas ativas da sua empresa e os links oficiais de checkout.',
    },
    {
      icon: BadgeDollarSign,
      title: 'Saldo',
      text: 'Consulte saldo disponível, saldo a liberar e o prazo financeiro real da conta.',
    },
    {
      icon: Tags,
      title: 'Cupons',
      text: 'Crie e consulte cupons da empresa usando permissões controladas pela chave.',
    },
    {
      icon: Bot,
      title: 'Automação',
      text: 'Conecte ChatGPT, agentes OpenAPI e clientes MCP sem expor credenciais internas.',
    },
  ];

  const benefits = isAffiliate ? affiliateBenefits : companyBenefits;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 text-white" id="leadspay-assistentes-ia-view">
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#07101d] p-5 sm:p-7">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-[#D9F22A]/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#D9F22A]/20 bg-[#D9F22A]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#D9F22A]">
              <Sparkles className="h-3.5 w-3.5" />
              {isAffiliate ? 'IA para vender melhor' : 'IA conectada à sua empresa'}
            </div>
            <h1 className="font-['Syne'] text-2xl font-black tracking-tight text-white sm:text-3xl">
              {isAffiliate ? 'Seu assistente conectado à LeadsPay' : 'Assistentes de IA da sua conta'}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">
              {isAffiliate
                ? 'Conecte ChatGPT, Gemini ou um cliente MCP para consultar seus próprios dados, analisar sua performance e gerar links oficiais sem misturar dados de outros afiliados.'
                : 'Conecte ferramentas de IA aos dados autorizados da sua empresa usando uma chave segura e permissões controladas.'}
            </p>
          </div>

          <div className={`min-w-[220px] rounded-2xl border p-4 ${
            approved
              ? 'border-emerald-500/20 bg-emerald-500/[0.07]'
              : 'border-amber-500/20 bg-amber-500/[0.07]'
          }`}>
            <div className="flex items-center gap-2">
              <CheckCircle2 className={`h-4 w-4 ${approved ? 'text-emerald-400' : 'text-amber-300'}`} />
              <span className="text-xs font-black uppercase tracking-wider text-white">
                {approved ? 'Pronto para conectar' : 'Falta liberar o perfil'}
              </span>
            </div>
            <p className="mt-2 text-[11px] leading-5 text-white/50">
              {approved
                ? 'Seu perfil está aprovado. Você já pode gerar a chave e conectar sua IA.'
                : 'A API só é liberada depois que este perfil estiver aprovado e ativo na LeadsPay.'}
            </p>
            {!approved && onNavigateToProfile && (
              <button
                type="button"
                onClick={onNavigateToProfile}
                className="mt-3 inline-flex items-center gap-2 rounded-xl bg-amber-400 px-3.5 py-2 text-[11px] font-black text-[#111827]"
              >
                Ir para Meu Perfil
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </section>

      <section>
        <div className="mb-3">
          <h2 className="font-['Syne'] text-base font-black text-white">
            {isAffiliate ? 'O que a IA pode fazer por você' : 'O que a integração pode fazer'}
          </h2>
          <p className="mt-1 text-xs text-white/45">
            Somente ações permitidas para o perfil atual aparecem aqui.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {benefits.map(({ icon: Icon, title, text }) => (
            <article key={title} className="rounded-2xl border border-white/8 bg-[#080e19] p-4">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl border border-[#D9F22A]/20 bg-[#D9F22A]/10 text-[#D9F22A]">
                <Icon className="h-4 w-4" />
              </div>
              <h3 className="text-xs font-black text-white">{title}</h3>
              <p className="mt-1.5 text-[11px] leading-5 text-white/45">{text}</p>
            </article>
          ))}
        </div>
      </section>

      <ApiKeySection
        roleMode={activeRole}
        profileStatus={verificationStatus}
        onNavigateToProfile={onNavigateToProfile}
      />
    </div>
  );
};
