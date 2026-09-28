# LeadsPay — configuração segura, homologação e Vercel

## Estado confirmado nesta continuação

- Projeto Vercel encontrado: **`techify-gaming`**, no plano **Hobby**.
- O conector Vercel desta sessão não teve permissão para ler as variáveis ou listar os deployments deste projeto. Portanto, ainda não foi possível confirmar quais valores já existem. Nenhum segredo foi lido ou alterado nesta sessão.
- A aplicação Firebase que o backend aceita é **`techify-gaming-106fe`**.
- O backend Stripe desta branch é deliberadamente **somente teste**: a chave precisa começar por `sk_test_`. Não use chaves live.
- Nenhum valor de chave deve ser enviado no chat, e-mail, issue ou commit.

## Variáveis para homologação no Preview

No Vercel Dashboard, abra o time → projeto **`techify-gaming`** → **Settings → Environment Variables**. Cadastre as variáveis abaixo marcando **Preview**. Não use `VITE_` nos nomes; são segredos do servidor.

| Nome | Obrigatória? | Valor/origem |
|---|---:|---|
| `STRIPE_TEST_SECRET_KEY` | Sim | Chave secreta de teste `sk_test_…` do sandbox Stripe selecionado. O código atual rejeita chaves live e também não aceita uma restricted key `rk_test_…`. |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Sim | O JSON completo de uma service account dedicada do projeto Firebase `techify-gaming-106fe`. Cole o conteúdo integral no campo Value, sem envolver o JSON inteiro em aspas adicionais. Preserve as aspas e os `\\n` internos de `private_key`. |
| `FIREBASE_PROJECT_ID` | Recomendável | Valor literal `techify-gaming-106fe`. O código usa esse projeto por padrão, mas rejeita credenciais de outro projeto. |
| `STRIPE_WEBHOOK_SECRET` | Sim para webhooks | Signing secret `whsec_…` gerado para o endpoint Stripe de teste que aponta para a URL deste Preview. Cada endpoint tem seu próprio segredo. |
| `LEADSPAY_BASE_URL` | Opcional/recomendável | URL HTTPS exata do deployment Preview (sem caminho final). Se omitida, o backend usa `VERCEL_URL`; para evitar retorno ao domínio de Production, confirme que o valor é realmente o host Preview. |
| `CRON_SECRET` | Sim para autenticação de Cron da Vercel | String aleatória de alta entropia, criada/guardada diretamente no Vercel ou gerenciador de senhas. A Vercel a envia no cabeçalho `Authorization: Bearer …` quando chama o cron. |
| `STRIPE_RELEASE_CRON_SECRET` | Opcional se `CRON_SECRET` estiver definido | Se cadastrar, use **exatamente o mesmo valor** de `CRON_SECRET`. O handler prioriza `STRIPE_RELEASE_CRON_SECRET`; valores diferentes fazem a chamada automática da Vercel falhar em 401. Também é aceito manualmente como alternativa a `CRON_SECRET`. |

Marque a opção de segredo/Sensitive se ela estiver disponível. Depois de salvar as variáveis, faça um **redeploy novo da branch Preview**: alterações de variáveis não mudam deployments existentes. Não configure valores de Production durante esta primeira rodada de homologação.

## 1. Obter a chave de teste Stripe

1. Entre no [Dashboard Stripe](https://dashboard.stripe.com/) e selecione o **sandbox** que usará para homologar; não use o modo live.
2. Abra **Workbench/Developers → API keys** (a rota pode aparecer como **Developers → API keys**).
3. Copie a **Secret key** de teste com prefixo `sk_test_` e coloque-a diretamente em `STRIPE_TEST_SECRET_KEY` no Vercel, com target **Preview**.
4. Nunca coloque a secret key no código, em `VITE_*`, navegador ou chat. A chave pública `pk_test_…` pode ser exposta no cliente, mas esta etapa específica pede a chave secreta do servidor.

## 2. Criar a service account Firebase com privilégio mínimo

O Admin SDK ignora as Firestore Security Rules: a autorização do backend vem do IAM da service account. Por isso, não conceda Owner/Editor por conveniência.

1. Abra o [projeto Firebase](https://console.firebase.google.com/project/techify-gaming-106fe/settings/serviceaccounts/adminsdk) e confirme o ID **`techify-gaming-106fe`**.
2. No Google Cloud Console do mesmo projeto, crie uma conta de serviço exclusiva para o backend LeadsPay (IAM e administrador → Contas de serviço). Não reutilize uma conta de pessoa.
3. Atribua apenas o acesso exigido: **Firebase Authentication Viewer** para verificação/consulta de usuários no audit e **Cloud Datastore User** para leitura/gravação dos documentos Firestore. O segundo papel predefinido concede acesso amplo a dados de entidade, inclusive exclusão; para uma implantação com política IAM mais restrita, peça ao administrador do Google Cloud um papel personalizado apenas com permissões de entidades necessárias, em vez de `roles/datastore.user`. Não atribua Owner, Editor ou Auth Admin sem necessidade.
4. Gere uma chave JSON para essa conta apenas se o ambiente Vercel não estiver usando uma federação/identidade sem chave. Baixe-a em local seguro; não a envie para ninguém nem a adicione ao Git. Se a organização bloquear criação de chaves, não contorne a política: peça uma identidade/federação aprovada ao administrador.
5. Na Vercel, defina `FIREBASE_SERVICE_ACCOUNT_JSON` com o arquivo JSON inteiro e `FIREBASE_PROJECT_ID` como `techify-gaming-106fe`. O backend valida `project_id`, `client_email` e `private_key`, e converte as quebras `\\n` da chave privada.
6. Remova do Downloads/lixeira e de cópias temporárias qualquer chave que não precise mais manter. Se uma chave for exposta, desative-a e crie outra.

## 3. Configurar o webhook Stripe de teste

O handler está em **`POST /api/stripe/webhook`**. Primeiro pegue a URL completa do deployment Preview na aba **Deployments** da Vercel (não use `https://techify-gaming.vercel.app` se esse domínio estiver apontando para Production).

1. No mesmo sandbox Stripe usado para gerar `sk_test_…`, abra **Workbench → Webhooks** e crie um event destination para **Your account**.
2. URL do endpoint: `https://<URL-EXATA-DO-PREVIEW>/api/stripe/webhook`.
3. Selecione estes eventos (o handler atual os trata):
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `payment_intent.canceled`
   - `charge.refunded`
   - `charge.dispute.created`
4. Crie o endpoint e revele/copie o signing secret `whsec_…` mostrado para **aquele endpoint de teste**. Salve-o como `STRIPE_WEBHOOK_SECRET` no Preview.
5. Não use um `whsec_…` do Stripe CLI para esse endpoint do Dashboard; segredos de endpoints diferentes não são intercambiáveis. Não transforme o corpo da requisição antes da verificação de assinatura (o handler atual usa o corpo bruto).

## 4. Ajustar URL e segredo do cron

- Se `LEADSPAY_BASE_URL` for configurada, use o host Preview exato, em HTTPS e sem barra/caminho final. Os links de retorno do Connect voltam a essa origem. Se não configurar, o código usa o hostname `VERCEL_URL` fornecido pela Vercel.
- Gere um segredo aleatório forte diretamente no gerenciador de senhas/Vercel; não o invente a partir de nome, e-mail ou data. Coloque-o em `CRON_SECRET`. Se também preencher `STRIPE_RELEASE_CRON_SECRET`, copie exatamente o mesmo valor para evitar conflito de precedência.
- **Particularidade crítica do plano Hobby:** os cron jobs configurados no `vercel.json` são invocados pela Vercel no deployment **Production**, não no Preview. O plano Hobby permite no máximo uma execução diária por cron e pode dispará-la em qualquer momento da hora indicada. O schedule `15 12 * * *` significa a janela da hora 12 UTC — aproximadamente 09:00–09:59 no horário de Brasília (UTC−3), não necessariamente exatamente 09:15.
- Para a primeira homologação, mantenha `CRON_SECRET` no Preview para eventual teste manual autorizado do endpoint, mas não espere uma execução automática do cron no Preview. Não chame manualmente `/api/crons/stripe-releases` sem confirmar que há apenas um pedido de teste elegível: esse endpoint cria transfers Stripe para pedidos pagos com `availableAt` vencido.

## 5. Redeploy e verificação sem expor segredos

1. Salve as variáveis com target Preview.
2. Na Vercel, abra **Deployments**, localize uma deployment da branch de homologação e escolha **Redeploy** (ou envie um novo commit não-produtivo). Espere ficar `Ready` e abra a URL daquele deployment.
3. Consulte os logs do deployment/functions no período do teste. Não imprima variáveis de ambiente nos logs.
4. Com uma chamada de onboarding sem token Firebase válido, espere **401 JSON**; perfil sem aprovação deve receber **403 JSON**; falta de segredo deve retornar **503 JSON** com erro de configuração; usuário aprovado deve receber **200 JSON** com um Account Link Stripe temporário.
5. Se o painel indicar **“Auditoria indisponível”**, não aprove ninguém: confira `FIREBASE_SERVICE_ACCOUNT_JSON`, o projeto, permissões IAM e logs. A lista pode continuar visível em modo somente leitura; isso não comprova que Auth/Firestore estejam configurados.

## 6. Testar aprovação de perfis e Stripe Connect

1. Entre com o único administrador autorizado no sistema: **`rickmarketing81@gmail.com`**.
2. Confirme que a auditoria de identidades valida as contas Firebase. Não crie/administre outros administradores pelo perfil do cliente.
3. Crie duas contas Firebase de teste separadas: uma **Afiliado** e uma **Empresa**. Complete os campos obrigatórios e envie cada perfil para validação.
4. No painel, confirme cada solicitação na fila correta. Atualize a tela e verifique que há uma única solicitação por UID, com nome/status persistidos; rascunhos não enviados e UIDs inexistentes devem ficar ocultos.
5. Aprove/rejeite apenas contas de teste. Após aprovação, a empresa de teste deve estar em estado aprovado e o afiliado de teste aprovado para suas funcionalidades correspondentes.
6. Inicie o onboarding Connect nas contas aprovadas e confirme que o link abre o Stripe **sandbox/teste**, não uma conta live. O Account Link é temporário e de uso único; se expirar, inicie o fluxo novamente no LeadsPay.
7. Faça um checkout de teste. Confirme no webhook que o pagamento foi marcado como pago e o `availableAt` ficou nove dias completos após a confirmação. Use dados de teste e nunca uma cobrança real nesta etapa.

## 7. O que o D+9 faz — e o que não promete

- O webhook cria a elegibilidade após **nove dias completos** e o cron transfere em centavos do saldo da plataforma para as contas Stripe Connect da empresa e, quando aplicável, do afiliado.
- O cron só processa pedido pago, vencido, com soma correta de valores e sem sinalização de risco. Tem idempotência e estados de processamento/repetição; reembolso/disputa não deve gerar novo repasse automático.
- A execução diária pode ocorrer até cerca de um dia depois do momento de elegibilidade. No Hobby, além disso, a invocação ocorre dentro da hora do schedule.
- **Transfer para a conta conectada não é o mesmo que payout bancário.** A transferência D+9 move fundos entre saldos Stripe; o depósito bancário final segue o calendário, requisitos de cadastro e disponibilidade de cada conta conectada e pode exigir controle no Stripe. Não prometa crédito instantâneo.
- A implementação atual não chama a API Stripe `payouts.create`: a rotina D+9 faz `transfers.create` para o saldo conectado. O endpoint LeadsPay `/api/stripe/express-dashboard` gera um link de login do Express para a empresa/afiliado; o que o titular pode fazer ali depende das permissões e da configuração da conta Stripe.
- Em Preview, use apenas chaves/test data. Como o cron automático roda em Production, só considere ligar o cron de produção depois de testar e verificar explicitamente o endpoint, a conta Stripe, os secrets de Production e a política de risco. A branch continua recusando chaves live até mudança deliberada de implementação.

## 8. O que ainda depende de você

Você precisa entrar nos painéis Stripe, Google Cloud/Firebase e Vercel para obter e cadastrar os segredos; não envie esses valores aqui. A integração Vercel desta sessão encontrou o projeto `techify-gaming`, mas recusou leitura das variáveis e deployments por falta de permissão, então não consegui preencher ou redeployar pelo conector. Depois que você cadastrar as variáveis e criar um novo Preview, posso orientar a validação pelos códigos/logs de erro (sem que você revele os segredos).

## Referências oficiais

- [Stripe — API keys](https://docs.stripe.com/keys)
- [Stripe — Receive Stripe events / Webhooks](https://docs.stripe.com/webhooks)
- [Firebase — Add the Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
- [Firebase — IAM permissions](https://firebase.google.com/docs/projects/iam/permissions)
- [Google Cloud — Firestore/Datastore IAM](https://cloud.google.com/datastore/docs/access/iam)
- [Vercel — Managing environment variables](https://vercel.com/docs/environment-variables/managing-environment-variables)
- [Vercel — Securing Cron Jobs](https://vercel.com/docs/cron-jobs/manage-cron-jobs)
- [Vercel — Cron Jobs and how they work](https://vercel.com/docs/cron-jobs)
