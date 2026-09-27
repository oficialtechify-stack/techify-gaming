import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, BookOpen, Check, CircleHelp, Lightbulb, PlayCircle, X } from 'lucide-react';
import type { PlatformTab, UserRoleMode } from '../../types/platform';

type GuideContent = {
  title: string;
  intro: string;
  steps: string[];
  exercise: string;
};

const sharedGuides: Partial<Record<PlatformTab, GuideContent>> = {
  dashboard: {
    title: 'Visão geral',
    intro: 'Use esta tela para entender a atividade da sua conta sem confundir estimativas com pagamentos confirmados.',
    steps: ['Escolha um período para ajustar os indicadores.', 'Confira vendas, comissões e valores em análise nos cartões da tela.', 'Abra Vendas ou Cobranças para consultar registros confirmados e seus detalhes.'],
    exercise: 'Troque o período do painel e observe quais indicadores mudam. Isso não cria nem altera pagamentos.'
  },
  meu_perfil: {
    title: 'Meu Perfil',
    intro: 'Seu cadastro é a primeira etapa para liberar as áreas de empresa ou afiliado.',
    steps: ['Confirme o tipo de perfil e preencha os campos obrigatórios.', 'Revise CPF ou CNPJ, telefone, endereço e e-mail antes de enviar.', 'Use Salvar rascunho para continuar depois ou Enviar para análise quando estiver tudo correto.', 'Acompanhe o status nesta tela; durante a análise os dados ficam bloqueados.'],
    exercise: 'Confira o vídeo de introdução e identifique no formulário onde editar contato e endereço. Só envie quando os dados estiverem corretos.'
  },
  vitrine: {
    title: 'Marketplace',
    intro: 'Explore produtos publicados por empresas e veja as condições antes de solicitar uma afiliação.',
    steps: ['Use a busca ou filtros para localizar uma oferta.', 'Abra os detalhes e confira preço, comissão, regras e materiais.', 'Use Solicitar afiliação quando estiver de acordo com as condições.'],
    exercise: 'Abra os detalhes de uma oferta para conhecer suas informações. Não confirme uma solicitação se estiver apenas explorando.'
  },
  minhas_afiliacoes: {
    title: 'Minhas afiliações',
    intro: 'Acompanhe os convites e as ofertas às quais você já está vinculado.',
    steps: ['Filtre ou pesquise pela empresa.', 'Confira o status de cada vínculo.', 'Abra uma afiliação para consultar seus links e orientações de divulgação.'],
    exercise: 'Pesquise o nome de uma empresa e compare o status das suas afiliações; a busca não altera vínculos.'
  },
  afiliados: {
    title: 'Links e divulgação',
    intro: 'Organize seus links de divulgação e consulte as orientações disponíveis para cada oferta.',
    steps: ['Escolha uma oferta aprovada para divulgação.', 'Copie o link atribuído à sua conta, quando disponível.', 'Compartilhe o link nos canais permitidos pela empresa e acompanhe cliques e vendas somente quando esses dados estiverem integrados.'],
    exercise: 'Abra um link em modo de visualização e confira se a oferta e a empresa correspondem antes de compartilhar. Não faça uma compra real para testar.'
  },
  vendas: {
    title: 'Minhas vendas',
    intro: 'Consulte vendas registradas e confirmadas pelo processamento de pagamentos.',
    steps: ['Use os filtros de período e produto.', 'Abra os detalhes para conferir valor, método e status.', 'Lembre-se: uma página de retorno do checkout, sozinha, não confirma uma venda.'],
    exercise: 'Filtre um período e pesquise um produto. A consulta é somente leitura e não cria vendas de teste.'
  },
  produtos: {
    title: 'Produtos',
    intro: 'Cadastre e organize as ofertas da sua empresa depois que o perfil for aprovado.',
    steps: ['Confira qual empresa está selecionada.', 'Abra uma oferta para verificar descrição, preço e comissão.', 'Use Criar produto/oferta somente quando os dados comerciais estiverem definidos.', 'Depois de salvar, use a área de links para compartilhar o checkout.'],
    exercise: 'Abra um produto existente e confira seus dados. Não salve alterações sem intenção de publicá-las.'
  },
  minha_empresa: {
    title: 'Minha empresa',
    intro: 'Gerencie a presença da sua empresa, ofertas e equipe em um único lugar.',
    steps: ['Confira o nome e o status cadastral da empresa.', 'Revise produtos e afiliados vinculados.', 'Se o cadastro ainda estiver em análise, conclua primeiro Meu Perfil.'],
    exercise: 'Navegue pelos detalhes da empresa e identifique quais itens dependem da aprovação do perfil.'
  },
  equipe: {
    title: 'Afiliados da empresa',
    intro: 'Acompanhe as pessoas vinculadas às suas ofertas e os respectivos status.',
    steps: ['Pesquise pelo nome do afiliado.', 'Confira qual oferta e qual situação estão vinculadas.', 'Use os controles de equipe apenas quando tiver certeza da alteração.'],
    exercise: 'Filtre a lista e consulte um vínculo sem aceitar, remover ou modificar ninguém.'
  },
  clientes: {
    title: 'Clientes',
    intro: 'O histórico é montado a partir de pagamentos confirmados; dados de checkout incompletos não aparecem como clientes pagantes.',
    steps: ['Busque pelo nome, e-mail ou produto.', 'Confira a data e o valor associado à compra confirmada.', 'Exporte ou contate clientes apenas quando os controles correspondentes estiverem habilitados e houver base legal/consentimento.'],
    exercise: 'Use a busca com um nome ou produto conhecido e confira como limpar o filtro.'
  },
  assinaturas: {
    title: 'Assinaturas',
    intro: 'A área está em preparação para gestão recorrente. Ela não representa cobranças automáticas ativas neste momento.',
    steps: ['Consulte esta tela para acompanhar a disponibilidade do módulo.', 'Não anuncie renovação automática até que o produto recorrente esteja habilitado.', 'Use ofertas de pagamento único enquanto a cobrança recorrente não estiver disponível.'],
    exercise: 'Confira o aviso de disponibilidade. Não crie uma assinatura de teste porque a renovação ainda não está configurada.'
  },
  cobrancas: {
    title: 'Cobranças confirmadas',
    intro: 'Esta tela apresenta pagamentos efetivamente confirmados pelo provedor de pagamentos e registrados no servidor.',
    steps: ['Confira o total de pagamentos e o valor bruto listado.', 'Pesquise por oferta, identificador ou método.', 'Confira status e data antes de reconciliar valores.', 'Reembolsos e disputas devem ser tratados no fluxo oficial do provedor, quando habilitado.'],
    exercise: 'Pesquise um identificador disponível e depois limpe a busca. A tela não cria nem altera cobranças.'
  },
  links_pagamento: {
    title: 'Links de pagamento',
    intro: 'Cada link deve estar associado a uma oferta real salva pela sua empresa.',
    steps: ['Confira se o perfil da empresa está aprovado e a conta de recebimento conectada.', 'Escolha uma oferta e revise o preço antes de criar o link.', 'Copie o endereço gerado e abra uma visualização para conferir o checkout.', 'Os métodos mostrados ao comprador dependem do país, moeda e configuração da conta.'],
    exercise: 'Abra um link já existente em uma nova aba sem concluir uma compra. Se não houver ofertas, conclua o cadastro de produto primeiro.'
  },
  saques: {
    title: 'Recebimentos e transferências',
    intro: 'Cadastre a conta de recebimento no fluxo seguro do provedor. A LeadsPay não pede senha bancária ou chave Pix.',
    steps: ['Abra Conectar conta e conclua os dados solicitados no ambiente seguro.', 'Acompanhe o status de requisitos da conta e corrija pendências por ali.', 'Consulte a data estimada e o estado dos repasses na tela.', 'A disponibilidade depende do pagamento, do prazo da plataforma e das regras de risco.'],
    exercise: 'Consulte apenas o status atual da conexão. Não altere banco ou titularidade se estiver apenas praticando.'
  },
  relatorios: {
    title: 'Relatórios',
    intro: 'Os relatórios dependem de dados confirmados e de eventos de atribuição recebidos pela plataforma.',
    steps: ['Escolha período e oferta.', 'Confira vendas e comissões no escopo da sua conta.', 'Interprete indicadores de tráfego somente quando a coleta estiver ativa.'],
    exercise: 'Altere o período do relatório e compare os resultados sem exportar ou compartilhar dados.'
  },
  integracoes: {
    title: 'Integrações',
    intro: 'Consulte o estado de checkout, recebimentos e configuração técnica da sua conta.',
    steps: ['Confira se o ambiente indicado é teste ou produção.', 'Abra a conta de recebimento para revisar requisitos pendentes.', 'Copie credenciais somente para sistemas próprios e nunca as publique no navegador ou em repositórios.'],
    exercise: 'Leia os estados exibidos sem regenerar segredos nem conectar uma integração desconhecida.'
  },
  comunidade: {
    title: 'Comunidade',
    intro: 'Encontre orientações, novidades e canais de apoio disponibilizados pela LeadsPay.',
    steps: ['Leia as regras do grupo antes de participar.', 'Use os canais oficiais para dúvidas de cadastro e divulgação.', 'Não compartilhe documentos pessoais ou dados de compradores no espaço público.'],
    exercise: 'Confira as regras e localize o link de suporte antes de publicar uma mensagem.'
  },
  cupons: {
    title: 'Cupons',
    intro: 'Consulte ou gerencie descontos vinculados às ofertas disponíveis na sua conta.',
    steps: ['Confirme a oferta associada ao cupom.', 'Revise código, validade e limite de uso.', 'Teste o código no checkout sem concluir uma compra real.'],
    exercise: 'Verifique um cupom ativo e confira seu período de validade sem criar nem publicar outro.'
  },
  assistentes_ia: {
    title: 'Assistentes e ferramentas',
    intro: 'Acesse recursos de produtividade disponibilizados dentro da plataforma.',
    steps: ['Escolha o assistente compatível com sua tarefa.', 'Revise as informações antes de usar em comunicação pública.', 'Não envie senhas, documentos de identidade ou dados de cartão.'],
    exercise: 'Explore uma ferramenta com uma pergunta genérica, sem informações pessoais ou financeiras.'
  },
  financeiro: {
    title: 'Financeiro',
    intro: 'Entenda valores confirmados, em análise e previstos para liberação.',
    steps: ['Confira o saldo calculado a partir de eventos confirmados.', 'Separe receita bruta, tarifa e comissão.', 'Use a aba Saques para verificar o recebimento; números estimados não são saldo disponível.'],
    exercise: 'Compare uma venda confirmada e a previsão de liberação sem solicitar transferência.'
  },
  carteira: {
    title: 'Carteira',
    intro: 'Acompanhe valores e estados da sua conta; o processamento efetivo é feito pelo provedor conectado.',
    steps: ['Confira o saldo em análise e o saldo elegível.', 'Verifique o histórico de movimentos.', 'Acesse Saques para requisitos de recebimento.'],
    exercise: 'Abra o histórico e confira as datas sem iniciar um repasse.'
  },
  configuracoes: {
    title: 'Configurações',
    intro: 'Personalize preferências da conta e confira os dados da plataforma.',
    steps: ['Revise o modo de exibição e as preferências disponíveis.', 'Salve somente ajustes que deseja manter.', 'Proteja o acesso com uma senha única e autenticação segura.'],
    exercise: 'Alterne o tema claro/escuro e retorne ao seu preferido.'
  },
  seguranca: {
    title: 'Segurança',
    intro: 'Mantenha a conta protegida e saiba reconhecer uma solicitação legítima.',
    steps: ['Use uma senha exclusiva e atualizada.', 'Não compartilhe códigos de acesso ou credenciais bancárias.', 'Revise dispositivos e sessões se a área correspondente estiver disponível.'],
    exercise: 'Confira quais opções de proteção estão habilitadas sem alterar credenciais durante o teste.'
  },
  planos: {
    title: 'Planos',
    intro: 'Consulte as ofertas e condições comerciais disponíveis para sua conta.',
    steps: ['Abra os detalhes de um plano.', 'Revise preço, periodicidade e comissão.', 'Confirme se a periodicidade é suportada antes de publicar ou compartilhar.'],
    exercise: 'Leia os detalhes de um plano sem editar preço ou ativar uma oferta.'
  },
  database: {
    title: 'Administração de dados',
    intro: 'Ferramentas administrativas só devem ser usadas por pessoas autorizadas.',
    steps: ['Confirme o registro antes de editar.', 'Faça uma cópia ou registre o motivo antes de mudanças em lote.', 'Nunca use esta tela para modificar status financeiro manualmente.'],
    exercise: 'Consulte o esquema ou um registro sem salvar alterações.'
  },
  modal_backgrounds: {
    title: 'Imagens dos modais',
    intro: 'Área administrativa para gerenciar elementos visuais de modais.',
    steps: ['Confira a imagem e o contexto onde será exibida.', 'Valide legibilidade e comportamento em celular.', 'Publique somente assets revisados e autorizados.'],
    exercise: 'Visualize as imagens cadastradas sem substituir o asset ativo.'
  },
  empresas_cadastradas: {
    title: 'Empresas cadastradas',
    intro: 'Consulte empresas e seus estados cadastrais dentro do seu nível de acesso.',
    steps: ['Pesquise pelo nome ou documento.', 'Abra um registro para conferir os dados e o status.', 'Antes de qualquer decisão, revise documentos e histórico.'],
    exercise: 'Filtre uma empresa e abra seus detalhes sem aprovar, recusar ou editar registros.'
  }
};

const tabLabels: Partial<Record<PlatformTab, string>> = {
  dashboard: 'Visão geral', meu_perfil: 'Meu Perfil', vitrine: 'Marketplace', minhas_afiliacoes: 'Minhas afiliações', afiliados: 'Links e divulgação', vendas: 'Minhas vendas', produtos: 'Produtos', minha_empresa: 'Minha empresa', equipe: 'Equipe', clientes: 'Clientes', assinaturas: 'Assinaturas', cobrancas: 'Cobranças', links_pagamento: 'Links de pagamento', saques: 'Recebimentos', relatorios: 'Relatórios', integracoes: 'Integrações', comunidade: 'Comunidade', cupons: 'Cupons', assistentes_ia: 'Assistentes', financeiro: 'Financeiro', carteira: 'Carteira', configuracoes: 'Configurações', seguranca: 'Segurança', planos: 'Planos', database: 'Administração', modal_backgrounds: 'Imagens dos modais', empresas_cadastradas: 'Empresas cadastradas'
};

const adminGuide: GuideContent = {
  title: 'Administração',
  intro: 'A visão administrativa pode executar ações que afetam outras contas. Faça a prática somente em leitura.',
  steps: ['Confira o papel e o escopo do registro.', 'Revise documentos e histórico antes de aprovar ou recusar.', 'Não altere saldo, venda ou repasse manualmente; a conciliação deve vir dos eventos verificados.'],
  exercise: 'Abra um registro em modo de consulta e identifique o status sem aprovar ou recusar.'
};

export interface TabGuideModalProps {
  tab: PlatformTab;
  roleMode: UserRoleMode;
  onClose: () => void;
  onNavigate: (tab: PlatformTab) => void;
}

export function TabGuideModal({ tab, roleMode, onClose, onNavigate }: TabGuideModalProps) {
  const [checked, setChecked] = useState<number[]>([]);
  const dialogRef = useRef<HTMLElement>(null);
  const content = useMemo(() => {
    const item = (roleMode === 'admin' ? adminGuide : undefined) || sharedGuides[tab];
    return item || {
      title: tabLabels[tab] || 'Esta aba',
      intro: 'Use esta área para consultar as informações disponíveis no seu perfil.',
      steps: ['Confira o título e o status exibidos.', 'Use filtros para localizar informações.', 'Antes de confirmar uma ação, revise os dados e o efeito esperado.'],
      exercise: 'Explore os dados em modo de consulta, sem salvar ou confirmar operações.'
    };
  }, [roleMode, tab]);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    const focusable = () => Array.from(dialog?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])') || []);
    dialog?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { onClose(); return; }
      if (event.key !== 'Tab') return;
      const items = focusable();
      if (!items.length) { event.preventDefault(); dialog?.focus(); return; }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => { window.removeEventListener('keydown', handleKeyDown); previouslyFocused?.focus(); };
  }, [onClose]);

  const progress = Math.round((checked.length / content.steps.length) * 100);

  return (
    <div className="lp-guide-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <section ref={dialogRef} tabIndex={-1} className="lp-guide-dialog" role="dialog" aria-modal="true" aria-labelledby="lp-guide-title">
        <div className="lp-guide-topline">
          <span className="lp-guide-icon"><BookOpen size={18} aria-hidden="true" /></span>
          <div className="min-w-0 flex-1">
            <p className="lp-guide-eyebrow">GUIA PRÁTICO · {roleMode === 'afiliado' ? 'ÁREA DO AFILIADO' : roleMode === 'empresa' ? 'ÁREA DA EMPRESA' : 'ÁREA ADMINISTRATIVA'}</p>
            <h2 id="lp-guide-title">{content.title}</h2>
          </div>
          <button type="button" className="lp-guide-close" onClick={onClose} aria-label="Fechar guia"><X size={18} /></button>
        </div>

        <div className="lp-guide-body">
          <p className="lp-guide-intro">{content.intro}</p>
          <div className="lp-guide-section-title"><span>Passo a passo</span><span>{checked.length}/{content.steps.length} concluídos</span></div>
          <div className="lp-guide-progress" role="progressbar" aria-label="Progresso do guia" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><span style={{ width: `${progress}%` }} /></div>
          <ol className="lp-guide-steps">
            {content.steps.map((step, index) => {
              const done = checked.includes(index);
              return <li key={step} className={done ? 'is-done' : ''}>
                <button type="button" className="lp-guide-check" aria-label={`${done ? 'Desmarcar' : 'Marcar'} passo ${index + 1}`} aria-pressed={done} onClick={() => setChecked(previous => done ? previous.filter(value => value !== index) : [...previous, index])}>
                  {done ? <Check size={14} aria-hidden="true" /> : index + 1}
                </button>
                <span>{step}</span>
              </li>;
            })}
          </ol>
          <div className="lp-guide-exercise">
            <Lightbulb size={18} aria-hidden="true" />
            <div><strong>Pratique com segurança</strong><p>{content.exercise}</p></div>
          </div>
          {tab === 'meu_perfil' && (
            <a className="lp-guide-video-link" href="/leadspay-primeiros-passos.mp4" target="_blank" rel="noreferrer">
              <PlayCircle size={17} aria-hidden="true" /> Assistir vídeo de introdução <ArrowRight size={15} aria-hidden="true" />
            </a>
          )}
        </div>

        <div className="lp-guide-footer">
          <span className="lp-guide-tab-label"><CircleHelp size={15} aria-hidden="true" /> Guia: {tabLabels[tab] || 'área atual'}</span>
          {tab !== 'meu_perfil' && <button type="button" className="lp-guide-primary" onClick={() => { onNavigate('meu_perfil'); onClose(); }}>Ir para Meu Perfil <ArrowRight size={15} aria-hidden="true" /></button>}
          {tab === 'meu_perfil' && <button type="button" className="lp-guide-primary" onClick={onClose}>Voltar ao formulário <ArrowRight size={15} aria-hidden="true" /></button>}
        </div>
      </section>
    </div>
  );
}
