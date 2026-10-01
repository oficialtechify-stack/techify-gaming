# Techify / LeadsPay — revisão inicial de produção

Verificação em 01/10/2026, baseada no commit c8d5a58. Esta revisão não certifica o lançamento.

## Bloqueios observados

- A página https://www.techify.sbs responde HTTP 200, mas GET /api/health retorna FUNCTION_INVOCATION_FAILED. É necessário acessar os logs da função na Vercel para determinar a causa. O plugin não retornou equipes acessíveis nesta sessão.
- O checkout aceita amount vindo do cliente quando o plano não é encontrado, inclusive para IDs lp_ e dyn_. Definir se esses links representam produtos cadastrados ou cobranças avulsas; produtos precisam de preço autoritativo no servidor e cobranças avulsas precisam de autorização do vendedor.
- O checkout ainda permite pedidos sem conta conectada da empresa; o job de repasse rejeita esses pedidos. A aprovação e a capacidade de transferência dos destinatários precisam ser verificadas antes da cobrança.
- A busca de afiliação usa apenas o código, sem validar obrigatoriamente que planId/companyId correspondem à oferta comprada.
- vercel.json agenda /api/crons/motivational, ausente no catch-all. /api/crons/stripe-releases existe, mas não é agendada. Não habilitar repasses automáticos antes de revisar os destinatários e concluir testes no sandbox.
- O webhook live está habilitado em https://www.techify.sbs/api/stripe/webhook. Na inspeção, assina checkout.session.completed, payment_intent.succeeded, account.updated e transfer.created. O handler de PaymentIntent também trata payment_intent.payment_failed, payment_intent.canceled, charge.refunded e charge.dispute.created; esses eventos precisam ser configurados para que as proteções existentes recebam os avisos.
- Há um segredo fixo de cron no histórico público de .env.example. Foi removido do exemplo nesta alteração. Caso tenha sido utilizado, substituir o valor no ambiente de implantação.
- Revisar regras Firestore de criação de perfis/empresas e proteger campos de Stripe e autorização tanto na criação quanto nas atualizações.

## Correções desta branch

- Falhas ao salvar o pedido ou vincular o PaymentIntent retornam 503 sem expor client_secret. A primeira gravação precisa ter sucesso antes de criar o pagamento.
- Vendas usam paymentIntent.livemode para diferenciar produção e teste.
- Chaves live são bloqueadas em previews e na variável STRIPE_TEST_SECRET_KEY. Chaves restritas rk_ são aceitas.
- Remoção do segredo compartilhado de cron do arquivo de exemplo.
- Testes de falha das duas gravações e de seleção de ambiente Stripe.

## Validação e limites

- TypeScript e build executados localmente; build apresenta avisos de bundle grande e import.meta no servidor CJS legado.
- 27 testes locais passaram, sem fazer cobranças ou transferências.
- npm install inicialmente falhou ao buscar baseline-browser-mapping 2.11.27 (404). A instalação local foi realizada com override temporário para 2.8.6; package.json foi restaurado. A instalação exata do bun.lock e a compilação no ambiente Vercel ainda precisam ser verificadas.
- Nenhuma mudança de produção, regra Firebase, segredo ou configuração Stripe foi aplicada.

## Critério de liberação

1. API funcionando no preview e domínio final, com logs sem erro de inicialização.
2. Preço, produto, empresa, afiliado e destinatários validados no servidor.
3. Configuração Firebase, índices, regras e isolamento entre teste/produção confirmados.
4. No sandbox: compra → webhook assinado → venda única → comissão → repasse; repetir eventos, simular falhas de armazenamento, reembolso e disputa.
5. Confirmar regra de prazo (o código atual usa D+9), taxa de R$ 0,99, responsável pelas tarifas Stripe e comportamento das cobranças avulsas.
6. Só então ativar o agendamento de repasses e validar a implantação final.
