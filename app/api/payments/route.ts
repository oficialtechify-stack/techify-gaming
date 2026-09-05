import { 
  getOrCreateCustomer, 
  createPixPayment, 
  createCreditCardPayment, 
  cleanDocument 
} from '@/lib/asaas';

/**
 * Endpoint de Checkout - API Asaas v3 (App Router)
 * POST /api/payments
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      paymentMethod,
      amount,
      valorTotal,
      total_amount,
      description,
      user,
      creditCard,
      holderInfo,
      planId,
      plan_id,
      companyId,
      company_id,
      refCode,
      affiliate_code,
      affiliateRef
    } = body || {};

    // 1. Validação do método de pagamento
    const normalizedMethod = String(paymentMethod || 'PIX').toUpperCase().trim();
    if (normalizedMethod !== 'PIX' && normalizedMethod !== 'CREDIT_CARD') {
      return Response.json(
        { 
          error: 'Método de pagamento inválido. Utilize "PIX" ou "CREDIT_CARD".',
          received: paymentMethod 
        },
        { status: 400 }
      );
    }

    // 2. Validação do valor da cobrança
    const rawAmount = amount ?? valorTotal ?? total_amount;
    const finalAmount = Number(parseFloat(String(rawAmount)).toFixed(2));
    if (isNaN(finalAmount) || finalAmount <= 0) {
      return Response.json(
        { error: 'Valor da cobrança inválido ou não informado.' },
        { status: 400 }
      );
    }

    // 3. Validação dos dados do cliente (user)
    const customerData = user || {
      name: body.nomeDoCliente || body.name || 'Cliente LeadsPay',
      email: body.emailDoCliente || body.email,
      cpfCnpj: body.cpfLimpo || body.cpf || body.documentNumber,
      phone: body.telefone || body.phone,
      mobilePhone: body.celular || body.mobilePhone
    };

    if (!customerData?.email) {
      return Response.json(
        { error: 'O e-mail do cliente é obrigatório para processar a cobrança.' },
        { status: 400 }
      );
    }

    const cleanCpf = cleanDocument(customerData.cpfCnpj);
    if (!cleanCpf) {
      return Response.json(
        { error: 'CPF ou CNPJ válido é obrigatório para o cadastro e cobrança no Asaas.' },
        { status: 400 }
      );
    }

    const finalDescription = description || `Assinatura Plano ${planId || plan_id || 'LeadsPay'}`;

    // 4. Obter ou Criar Cliente no Asaas
    let customerId: string;
    try {
      customerId = await getOrCreateCustomer({
        name: customerData.name || 'Cliente LeadsPay',
        email: customerData.email,
        cpfCnpj: cleanCpf,
        phone: customerData.phone,
        mobilePhone: customerData.mobilePhone || customerData.phone,
        postalCode: customerData.postalCode || customerData.cep,
        address: customerData.address,
        addressNumber: customerData.addressNumber
      });
    } catch (custError: any) {
      return Response.json(
        { 
          error: custError.message || 'Erro ao registrar cliente no Asaas.',
          code: 'CUSTOMER_CREATION_FAILED'
        },
        { status: 400 }
      );
    }

    // 5. Processar Pagamento conforme o método escolhido
    if (normalizedMethod === 'PIX') {
      try {
        const pixResult = await createPixPayment(customerId, finalAmount, finalDescription);

        return Response.json(
          {
            success: true,
            gateway: 'Asaas v3',
            billingType: 'PIX',
            paymentId: pixResult.paymentId,
            status: pixResult.status,
            amount: pixResult.value,
            payload: pixResult.payload, // Pix Copia e Cola
            encodedImage: pixResult.encodedImage, // QR Code Base64
            qr_code: pixResult.payload, // Compatibilidade com frontend
            qr_code_base64: pixResult.encodedImage, // Compatibilidade com frontend
            expirationDate: pixResult.expirationDate,
            invoiceUrl: pixResult.invoiceUrl,
            metadata: {
              planId: planId || plan_id,
              companyId: companyId || company_id,
              affiliateRef: refCode || affiliate_code || affiliateRef,
              customerId
            }
          },
          { status: 200 }
        );
      } catch (pixErr: any) {
        return Response.json(
          { 
            error: pixErr.message || 'Falha ao gerar cobrança PIX no Asaas.',
            code: 'PIX_GENERATION_FAILED' 
          },
          { status: 400 }
        );
      }
    }

    if (normalizedMethod === 'CREDIT_CARD') {
      if (!creditCard || !creditCard.number || !creditCard.expiryMonth || !creditCard.expiryYear || !creditCard.ccv) {
        return Response.json(
          { 
            error: 'Dados do cartão de crédito incompletos (número, mês, ano e CCV são obrigatórios).',
            code: 'INVALID_CREDIT_CARD'
          },
          { status: 400 }
        );
      }

      const cardHolderInfo = holderInfo || {
        name: creditCard.holderName || customerData.name,
        email: customerData.email,
        cpfCnpj: cleanCpf,
        postalCode: customerData.postalCode || '01310100',
        addressNumber: customerData.addressNumber || '100',
        phone: customerData.phone || customerData.mobilePhone || '11999999999'
      };

      try {
        const cardResult = await createCreditCardPayment(
          customerId,
          finalAmount,
          finalDescription,
          creditCard,
          cardHolderInfo
        );

        return Response.json(
          {
            success: true,
            gateway: 'Asaas v3',
            billingType: 'CREDIT_CARD',
            paymentId: cardResult.paymentId,
            status: cardResult.status,
            amount: cardResult.value,
            confirmedDate: cardResult.confirmedDate,
            invoiceUrl: cardResult.invoiceUrl,
            metadata: {
              planId: planId || plan_id,
              companyId: companyId || company_id,
              affiliateRef: refCode || affiliate_code || affiliateRef,
              customerId
            }
          },
          { status: 200 }
        );
      } catch (cardErr: any) {
        return Response.json(
          { 
            error: cardErr.message || 'Cartão de crédito recusado ou inválido.',
            code: 'CARD_PAYMENT_DECLINED'
          },
          { status: 400 }
        );
      }
    }

    return Response.json({ error: 'Operação não suportada' }, { status: 400 });

  } catch (serverErr: any) {
    console.error('[API Payments Route] Erro interno:', serverErr);
    return Response.json(
      { 
        error: serverErr.message || 'Erro interno no servidor ao processar pagamento.',
        code: 'INTERNAL_SERVER_ERROR'
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, access_token'
    }
  });
}
