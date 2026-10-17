# Conta única e piloto de afiliados

A mesma identidade pode habilitar empresa e afiliado. Cada área mantém suas permissões, aprovação, conta Stripe, lançamentos e saques. Alternar área não transfere valores nem aprova cadastros.

## Fluxos implementados

- Criar conta: nome/e-mail/senha → escolher atividade → ativar área no servidor → confirmar e-mail → completar recebimentos e perfil.
- Perfil do dashboard: alternar área existente ou ativar a segunda. Afiliado exige convite pessoal; empresa é habilitada em rascunho, sujeita à verificação.
- Administrador: menu do perfil → convidar afiliado. Gera código vinculado a e-mail e válido por sete dias.
- Empresa aprovada: Equipe de Vendas → convidar afiliado. O servidor verifica titularidade e aprovação; o convite registra a empresa de origem. O afiliado ainda completa seu perfil e solicita afiliação a cada oferta, respeitando as regras do produto.
- Equipe interna continua separada no cadastro de colaboradores existente. Esta alteração não implementa login ou remuneração nova de funcionários.

Convites são copiados e enviados manualmente pelo responsável. Nenhuma mensagem externa é enviada automaticamente. Reutilização por outro usuário, e-mail diferente, expiração e revogação são rejeitados. Contas legadas com papel afiliado já habilitado continuam podendo acessar sua área sem novo convite.

## Implantação e validação

As regras Firestore precisam acompanhar a aplicação: novos perfis afiliados/duais passam pelo servidor, que também protege os convites. Antes de publicar as regras, confirmar que nenhuma versão antiga depende de criar perfis afiliados diretamente pelo navegador.

A rotina financeira existente é preservada. Contas Stripe empresariais antigas não são convertidas silenciosamente em pessoa física. O fluxo de afiliado já existente seleciona pessoa física e descreve recebimento de comissões; campos efetivos continuam sujeitos à Stripe.

Validação local: TypeScript, testes unitários de áreas/convites, suíte existente financeira e de elegibilidade, build estático e compilação do servidor. A revisão não comprova uma transação real nem substitui teste integrado de Stripe/Firebase.

Antes do piloto: validar com credenciais de teste a criação, confirmação de e-mail, resgate de convite, aprovação independente, onboarding Stripe individual, oferta/afiliação, link, compra, webhook, comissão, liberação e estorno. Validar ida e volta entre áreas no celular e desktop com saldos distintos. Confirmar as regras Firestore implantadas antes de abrir inscrições.

Nenhuma cobrança, transferência, regra Firebase ou implantação de produção foi realizada nesta alteração.
