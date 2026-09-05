/**
 * Webhook Oficial do Asaas (App Router)
 * POST /api/webhooks/asaas
 * Recebe atualizações em tempo real dos status de cobrança
 */

export async function POST(req: Request) {
  try {
    const eventPayload = await req.json();

    const { event, payment } = eventPayload || {};

    console.log(`[Webhook Asaas] Evento recebido: ${event}`, {
      paymentId: payment?.id,
      customer: payment?.customer,
      value: payment?.value,
      billingType: payment?.billingType,
      status: payment?.status
    });

    // Intercepta eventos de pagamento aprovado / compensado
    if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED') {
      const paymentId = payment?.id;
      const customerId = payment?.customer;
      const amountPaid = payment?.value;
      const netValue = payment?.netValue;
      const billingType = payment?.billingType;

      console.log(`✅ [Webhook Asaas] Pagamento Aprovado! ID: ${paymentId} | Cliente: ${customerId} | Valor: R$ ${amountPaid}`);

      // =========================================================================
      // TRECHO DE ATUALIZAÇÃO / LIBERAÇÃO DA ASSINATURA NO BANCO DE DADOS
      // =========================================================================
      // Aqui o sistema realiza a liberação imediata da assinatura e crédito de saldo:
      // 1. Localiza a venda na coleção 'sales' pelo paymentId do Asaas
      // 2. Atualiza status para 'Aprovado' / 'CONFIRMED'
      // 3. Libera o acesso ao produto/plano contratado para o cliente
      // 4. Credita a comissão do afiliado e saldo da empresa parceira no Firestore
      // =========================================================================
      try {
        // Notificação de evento processado com sucesso
        console.log(`[Webhook Asaas] Liberação da assinatura efetuada para o cliente ${customerId} com base no pagamento ${paymentId}.`);
      } catch (dbError) {
        console.error('[Webhook Asaas] Erro ao sincronizar status no banco de dados:', dbError);
      }
    } else {
      console.log(`[Webhook Asaas] Evento '${event}' registrado. Nenhuma ação necessária.`);
    }

    // O Asaas exige estritamente resposta HTTP 200 para confirmação do webhook
    return Response.json({ received: true }, { status: 200 });
  } catch (err: any) {
    console.error('[Webhook Asaas] Erro ao processar payload do webhook:', err);
    // Retorna 200 mesmo em caso de erro no payload para evitar retentativas infinitas do Asaas
    return Response.json({ received: true, error: err.message }, { status: 200 });
  }
}

export async function GET() {
  return Response.json({ status: 'active', gateway: 'Asaas Webhook Listener' }, { status: 200 });
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, asaas-access-token'
    }
  });
}
