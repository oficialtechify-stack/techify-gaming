# LeadsPay — painel administrativo e configuração de prévia

## O que mudou nesta revisão

- Quando a auditoria Firebase Admin está configurada, a lista exige que cada UID exista no Firebase Authentication. Solicitações e perfis repetidos são agrupados pelo UID; rascunhos não enviados ficam fora da fila. Se a auditoria estiver indisponível, os documentos Firestore continuam visíveis em modo somente leitura — uma falha de configuração nunca é tratada como “zero usuários”.
- Empresa e afiliado continuam em filas e áreas distintas. O envio de perfil agora é autenticado no servidor, valida dados/documentos, grava perfil + solicitação + empresa em uma operação atômica e usa o UID como identificador canônico da solicitação.
- Usuários só leem seus próprios documentos de perfil/usuário. As regras bloqueiam autopromoção a administrador, autoaprovação, alteração de status de empresa e gravação direta de pedidos KYC. O único administrador autorizado é `rickmarketing81@gmail.com`; ações de revisão ficam pausadas se a auditoria de identidade não concluir.
- O botão de atualização do painel volta a carregar as fontes em tempo real. A ferramenta de limpeza global do banco foi removida; os dados financeiros e históricos não são apagados por uma ação ampla.
- O onboarding de recebimentos retorna JSON claro, valida autorização e informa quando a configuração do servidor falta; a interface não deve tentar converter uma página HTML de erro em JSON.
- O tutorial em português tem legendas WebVTT e foi ligado ao formulário de primeiro acesso.

## Variáveis privadas necessárias para a prévia da Vercel

Defina-as em **Vercel → Project → Settings → Environment Variables**, pelo menos no ambiente **Preview**. Não coloque esses valores no repositório, em mensagens ou em variáveis `VITE_`.

| Variável | Necessidade | Observação |
|---|---|---|
| `STRIPE_TEST_SECRET_KEY` | Obrigatória para Connect/checkout de teste | Use apenas uma chave de teste `sk_test_…`. Esta branch bloqueia intencionalmente chaves live. |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Obrigatória para onboarding, validação segura e fila administrativa | JSON integral da service account do projeto Firebase `techify-gaming-106fe`; conceda as permissões mínimas de Firebase Authentication e Firestore necessárias. Preserve a chave privada e as quebras de linha escapadas. |
| `FIREBASE_PROJECT_ID` | Opcional | Se definida, deve ser `techify-gaming-106fe`; o servidor já usa esse ID como padrão e rejeita credenciais de outro projeto. |
| `STRIPE_WEBHOOK_SECRET` | Obrigatória para processar webhooks de teste | Segredo `whsec_…` do endpoint de webhook da prévia Stripe. Deve corresponder exatamente ao endpoint em teste. |
| `LEADSPAY_BASE_URL` | Recomendada | URL HTTPS da prévia que inicia o onboarding; a Vercel também fornece `VERCEL_URL` como fallback. |
| `STRIPE_RELEASE_CRON_SECRET` | Obrigatória para execução manual do cron | Segredo aleatório de alta entropia enviado como `Authorization: Bearer …`. Alternativamente, o endpoint reconhece `CRON_SECRET`; não reutilize segredos publicados. |

Depois de salvar variáveis, **redeploy a branch de preview** (variáveis novas não entram em uma implantação já existente). Não ative modo live até concluir homologação do Stripe Connect, regras da plataforma, reconciliação, estornos/disputas e uma bateria de testes internos.

### Resposta esperada de `/api/stripe/onboarding`

- Sem token Firebase válido: `401` com JSON.
- Perfil/conta não aprovado: `403` com JSON explicativo.
- Credenciais privadas ou base URL ausentes: `503` com `PAYMENTS_CONFIGURATION_REQUIRED` em JSON.
- Sucesso: `200` com a URL temporária segura de onboarding.

Um erro antigo `500` visto antes deste deploy não comprova qual segredo está faltando. O código agora diferencia configurações incompletas, mas a equipe ainda precisa confirmar os **nomes das variáveis no ambiente Preview da Vercel** e consultar os logs do deployment após o redeploy. Não envie valores de chaves aqui.

## Liberação D+9

O webhook calcula `availableAt` a partir da confirmação do pagamento (nove dias completos depois). O cron configurado em `vercel.json` roda diariamente às **12:15 UTC (09:15, horário de Brasília)** e transfere apenas pedidos pagos cuja data chegou, cuja divisão em centavos fecha e que não estejam em revisão de risco. Por rodar uma vez ao dia, a execução pode ocorrer até cerca de 24 horas depois do instante exato de elegibilidade.

A rotina usa chave de idempotência e verifica transferências anteriores, além de registrar estados `processing`, `completed`, `retry` ou `manual_review`. O payout bancário final segue os prazos/verificações da conta conectada e não é garantido como instantâneo pelo cron da LeadsPay.

## Proteção de credenciais

- Trate como comprometido qualquer valor privado que tenha sido gravado em um arquivo de exemplo rastreado ou compartilhado; gere novos valores para `CRON_SECRET`/`STRIPE_RELEASE_CRON_SECRET` e para chaves privadas de push, se usadas.
- Use credenciais de **teste** no ambiente Preview; não cole segredo de service account, Stripe, webhook, cron ou VAPID no chat ou em commit.
- O CPF/CNPJ do titular da plataforma e o cadastro Stripe da própria plataforma são responsabilidade da conta do titular junto ao Stripe. A implementação Connect não altera nem atesta o status fiscal ou a aprovação do Stripe.

## Validar painel e filas

1. Faça login com uma conta administradora já autorizada no projeto Firebase.
2. Confirme que o indicador de integridade valida as identidades; se mostrar “Auditoria indisponível”, os registros permanecem visíveis sem moderação. Configure `FIREBASE_SERVICE_ACCOUNT_JSON` em Preview e consulte os logs das funções antes de retomar ações administrativas.
3. Envie um perfil de teste completo de afiliado e depois um perfil de empresa, usando contas Firebase de teste separadas; verifique que cada pedido aparece apenas na fila correta.
4. Recarregue o painel e confirme que cada pedido aparece uma única vez e mantém status/nome; confira que perfis não enviados e UIDs inexistentes ficam ocultos.
5. Aprove/rejeite somente contas de teste. Não execute uma exclusão global nem movimentos com dinheiro real durante homologação.
