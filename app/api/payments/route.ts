import { 
  getOrCreateCustomer, 
  createPixPayment, 
  createCreditCardPayment, 
  cleanDocument 
} from '../../../lib/asaas';

// Helper de compatibilidade NextResponse / Response para Next.js e Vercel Serverless
const NextResponse = {
  json: (data: any, init?: { status?: number; headers?: HeadersInit }) => {
    if (typeof Response !== 'undefined' && typeof Response.json === 'function') {
      return Response.json(data, init);
    }
    return new Response(JSON.stringify(data), {
      status: init?.status || 200,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers || {})
      }
    });
  }
};

/**
 * Endpoint de Checkout - API Asaas v3 (App Router / Next.js / Vercel Serverless)
 * POST /api/payments
 */
export async function POST(req: Request) {
  try {
    // 1. Tratamento seguro do corpo da requisição
    let body: any = {};
    try {
      if (req && typeof req.json === 'function') {
        body = await req.json().catch(() => null);
      }
    } catch {
      body = null;
    }

    if (!body || typeof body !== 'object') {
      try {
        if (req && typeof req.text === 'function') {
          const rawText = await req.text().catch(() => '');
          body = rawText ? JSON.parse(rawText) : {};
        }
      } catch {
        body = {};
      }
    }

    if (!body || typeof body !== 'object') {
      body = {};
    }

    const {
      paymentMethod,
      billingType,
      amount,
      valorTotal,
      total_amount,
      value,
      description,
      user,
      customer,
      creditCard,
      holderInfo,
      planId,
      plan_id,
      companyId,
      company_id,
      refCode,
      affiliate_code,
      affiliateRef
    } = body;

    // 2. Validação do método de pagamento
    const normalizedMethod = String(paymentMethod || billingType || 'PIX').toUpperCase().trim();
    if (normalizedMethod !== 'PIX' && normalizedMethod !== 'CREDIT_CARD') {
      return NextResponse.json(
        { 
          error: true,
          message: 'Método de pagamento inválido. Utilize "PIX" ou "CREDIT_CARD".',
          received: paymentMethod || billingType 
        },
        { status: 400 }
      );
    }

    // 3. Validação segura do valor da cobrança
    const rawAmount = amount ?? valorTotal ?? total_amount ?? value;
    const finalAmount = Number(parseFloat(String(rawAmount || 0)).toFixed(2));
    if (isNaN(finalAmount) || finalAmount <= 0) {
      return NextResponse.json(
        { 
          error: true, 
          message: 'Valor da cobrança inválido ou não informado. Deve ser um número maior que zero.' 
        },
        { status: 400 }
      );
    }

    // 4. Validação segura e normalização dos dados do cliente (evita undefined)
    const rawCustomer = (user && typeof user === 'object') 
      ? user 
      : (customer && typeof customer === 'object') 
        ? customer 
        : {};

    const customerName = String(
      rawCustomer.name || 
      body?.nomeDoCliente || 
      body?.name || 
      'Cliente LeadsPay'
    ).trim();

    const customerEmail = String(
      rawCustomer.email || 
      body?.emailDoCliente || 
      body?.email || 
      ''
    ).trim().toLowerCase();

    const customerCpfRaw = String(
      rawCustomer.cpfCnpj || 
      rawCustomer.cpf || 
      body?.cpfLimpo || 
      body?.cpf || 
      body?.documentNumber || 
      ''
    ).trim();

    const customerPhone = String(
      rawCustomer.phone || 
      rawCustomer.mobilePhone || 
      body?.telefone || 
      body?.phone || 
      ''
    ).trim();

    const customerMobile = String(
      rawCustomer.mobilePhone || 
      rawCustomer.celular || 
      body?.celular || 
      customerPhone || 
      ''
    ).trim();

    const postalCode = String(
      rawCustomer.postalCode || 
      rawCustomer.cep || 
      body?.cep || 
      ''
    ).trim();

    const address = String(
      rawCustomer.address || 
      rawCustomer.endereco || 
      body?.address || 
      ''
    ).trim();

    const addressNumber = String(
      rawCustomer.addressNumber || 
      rawCustomer.numero || 
      body?.addressNumber || 
      ''
    ).trim();

    if (!customerEmail || !customerEmail.includes('@')) {
      return NextResponse.json(
        { 
          error: true, 
          message: 'O e-mail do cliente é obrigatório e deve ser válido para processar a cobrança.' 
        },
        { status: 400 }
      );
    }

    const cleanCpf = cleanDocument(customerCpfRaw);
    if (!cleanCpf || cleanCpf.length < 11) {
      return NextResponse.json(
        { 
          error: true, 
          message: 'CPF ou CNPJ válido é obrigatório para o cadastro e cobrança no Asaas.' 
        },
        { status: 400 }
      );
    }

    const finalPlanId = (planId || plan_id || null)?.toString() || null;
    const finalRefCode = (refCode || affiliate_code || affiliateRef || null)?.toString() || null;
    const finalCompanyId = (companyId || company_id || null)?.toString() || null;
    const finalDescription = description || `Assinatura Plano ${finalPlanId || 'LeadsPay'}`;

    // 5. Obter ou Criar Cliente no Asaas com tratamento de erro
    let customerId: string;
    try {
      customerId = await getOrCreateCustomer({
        name: customerName,
        email: customerEmail,
        cpfCnpj: cleanCpf,
        phone: customerPhone || undefined,
        mobilePhone: customerMobile || undefined,
        postalCode: postalCode || undefined,
        address: address || undefined,
        addressNumber: addressNumber || undefined
      });
    } catch (custError: any) {
      console.error('[Route Asaas Customer Error] Erro ao cadastrar/obter cliente Asaas:', custError);
      const status = custError.status || custError.statusCode || 400;
      const errMsg = custError.errors?.[0]?.description || custError.message || 'Erro desconhecido na API do Asaas ao registrar cliente';
      const errList = custError.errors || custError.details?.errors || (Array.isArray(custError.details) ? custError.details : [{ description: errMsg }]);
      return NextResponse.json(
        { 
          error: true,
          message: errMsg,
          description: errMsg,
          errors: errList,
          details: custError.details || custError.responseData || null,
          code: 'CUSTOMER_CREATION_FAILED'
        },
        { status }
      );
    }

    // 6. Cobrança via PIX
    if (normalizedMethod === 'PIX') {
      try {
        const pixResult = await createPixPayment(customerId, finalAmount, finalDescription);

        return NextResponse.json(
          {
            success: true,
            gateway: 'Asaas v3',
            billingType: 'PIX',
            paymentId: pixResult.paymentId,
            payment_id: pixResult.paymentId,
            id: pixResult.paymentId,
            status: pixResult.status,
            amount: pixResult.value,
            qrCodeBase64: pixResult.encodedImage,
            copyAndPaste: pixResult.payload,
            payload: pixResult.payload,
            encodedImage: pixResult.encodedImage,
            qr_code: pixResult.payload,
            qr_code_base64: pixResult.encodedImage,
            expirationDate: pixResult.expirationDate,
            invoiceUrl: pixResult.invoiceUrl,
            ticket_url: pixResult.invoiceUrl,
            metadata: {
              planId: finalPlanId,
              companyId: finalCompanyId,
              affiliateRef: finalRefCode,
              customerId
            }
          },
          { status: 200 }
        );
      } catch (pixErr: any) {
        console.error('[Route Asaas PIX Error] Erro detalhado ao gerar cobrança PIX:', pixErr);
        const status = pixErr.status || pixErr.statusCode || 400;
        const errMsg = pixErr.errors?.[0]?.description || pixErr.message || 'Erro desconhecido na API do Asaas ao gerar PIX';
        const errList = pixErr.errors || pixErr.details?.errors || (Array.isArray(pixErr.details) ? pixErr.details : [{ description: errMsg }]);
        return NextResponse.json(
          { 
            error: true,
            message: errMsg,
            description: errMsg,
            errors: errList,
            details: pixErr.details || pixErr.responseData || null,
            invoiceUrl: pixErr.invoiceUrl || null,
            code: 'PIX_GENERATION_FAILED' 
          },
          { status }
        );
      }
    }

    // 7. Cobrança via Cartão de Crédito
    if (normalizedMethod === 'CREDIT_CARD') {
      if (
        !creditCard || 
        typeof creditCard !== 'object' || 
        !creditCard.number || 
        !creditCard.expiryMonth || 
        !creditCard.expiryYear || 
        !creditCard.ccv
      ) {
        return NextResponse.json(
          { 
            error: true,
            message: 'Dados do cartão de crédito incompletos (número, mês, ano e CCV são obrigatórios).',
            code: 'INVALID_CREDIT_CARD'
          },
          { status: 400 }
        );
      }

      const holderObj = (holderInfo && typeof holderInfo === 'object') ? holderInfo : {};
      const cardHolderInfo = {
        name: holderObj.name || creditCard.holderName || customerName,
        email: holderObj.email || customerEmail,
        cpfCnpj: cleanDocument(holderObj.cpfCnpj) || cleanCpf,
        postalCode: cleanDocument(holderObj.postalCode || postalCode || '01310100'),
        addressNumber: String(holderObj.addressNumber || addressNumber || '100').trim(),
        phone: String(holderObj.phone || customerPhone || customerMobile || '11999999999').trim()
      };

      try {
        const cardResult = await createCreditCardPayment(
          customerId,
          finalAmount,
          finalDescription,
          creditCard,
          cardHolderInfo
        );

        return NextResponse.json(
          {
            success: true,
            gateway: 'Asaas v3',
            billingType: 'CREDIT_CARD',
            paymentId: cardResult.paymentId,
            payment_id: cardResult.paymentId,
            id: cardResult.paymentId,
            status: cardResult.status,
            amount: cardResult.value,
            confirmedDate: cardResult.confirmedDate,
            invoiceUrl: cardResult.invoiceUrl,
            metadata: {
              planId: finalPlanId,
              companyId: finalCompanyId,
              affiliateRef: finalRefCode,
              customerId
            }
          },
          { status: 200 }
        );
      } catch (cardErr: any) {
        return NextResponse.json(
          { 
            error: true,
            message: cardErr.message || 'Cartão de crédito recusado ou inválido.',
            code: 'CARD_PAYMENT_DECLINED'
          },
          { status: 400 }
        );
      }
    }

    return NextResponse.json({ error: true, message: 'Operação não suportada' }, { status: 400 });

  } catch (error: any) {
    console.error('ERRO FATAL NA ROTA PAYMENTS:', error);
    return NextResponse.json(
      { 
        error: true, 
        message: error?.message || 'Erro interno no servidor de pagamentos' 
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
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, access_token'
    }
  });
}
