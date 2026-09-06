import { 
  getOrCreateCustomer, 
  createPixPayment, 
  createCreditCardPayment, 
  cleanDocument 
} from '../../lib/asaas';

/**
 * Extrai e normaliza o corpo da requisição com total segurança para Serverless Functions
 */
async function parseRequestBody(req: any): Promise<any> {
  if (!req) return {};
  if (req.body) {
    if (typeof req.body === 'object' && req.body !== null) {
      return req.body;
    }
    if (typeof req.body === 'string') {
      try {
        return JSON.parse(req.body);
      } catch {
        return {};
      }
    }
  }

  // Fallback se req for stream
  if (typeof req.on === 'function') {
    try {
      const chunks: any[] = [];
      for await (const chunk of req) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
      }
      const raw = Buffer.concat(chunks).toString('utf8');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  return {};
}

/**
 * Handler Vercel Serverless Function
 * POST /api/payments
 */
export default async function handler(req: any, res: any) {
  // Configuração global de CORS
  try {
    if (res?.setHeader) {
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PUT');
      res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, access_token'
      );
    }
  } catch (corsErr) {
    console.error('[API Payments Serverless] Aviso ao setar headers CORS:', corsErr);
  }

  if (req?.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req?.method !== 'POST') {
    return res.status(405).json({ error: true, message: 'Método não permitido. Use POST.' });
  }

  try {
    const body = await parseRequestBody(req);

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

    // 1. Validação do método de pagamento
    const normalizedMethod = String(paymentMethod || billingType || 'PIX').toUpperCase().trim();
    if (normalizedMethod !== 'PIX' && normalizedMethod !== 'CREDIT_CARD') {
      return res.status(400).json({ 
        error: true,
        message: 'Método de pagamento inválido. Utilize "PIX" ou "CREDIT_CARD".',
        received: paymentMethod || billingType 
      });
    }

    // 2. Validação segura do valor da cobrança
    const rawAmount = amount ?? valorTotal ?? total_amount ?? value;
    const finalAmount = Number(parseFloat(String(rawAmount || 0)).toFixed(2));
    if (isNaN(finalAmount) || finalAmount <= 0) {
      return res.status(400).json({ 
        error: true, 
        message: 'Valor da cobrança inválido ou não informado. Deve ser um número maior que zero.' 
      });
    }

    // 3. Validação segura e normalização dos dados do cliente (evita undefined)
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
      return res.status(400).json({ 
        error: true, 
        message: 'O e-mail do cliente é obrigatório e deve ser válido para processar a cobrança.' 
      });
    }

    const cleanCpf = cleanDocument(customerCpfRaw);
    if (!cleanCpf || cleanCpf.length < 11) {
      return res.status(400).json({ 
        error: true, 
        message: 'CPF ou CNPJ válido é obrigatório para o cadastro e cobrança no Asaas.' 
      });
    }

    const finalPlanId = (planId || plan_id || null)?.toString() || null;
    const finalRefCode = (refCode || affiliate_code || affiliateRef || null)?.toString() || null;
    const finalCompanyId = (companyId || company_id || null)?.toString() || null;
    const finalDescription = description || `Assinatura Plano ${finalPlanId || 'LeadsPay'}`;

    // 4. Obter ou Criar Cliente no Asaas com tratamento de erro
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
      console.error('[API Payments Customer Error] Erro ao registrar cliente no Asaas:', custError);
      const status = custError.status || custError.statusCode || 400;
      const errMsg = custError.errors?.[0]?.description || custError.message || 'Erro desconhecido na API do Asaas ao registrar cliente';
      const errList = custError.errors || custError.details?.errors || (Array.isArray(custError.details) ? custError.details : [{ description: errMsg }]);
      return res.status(status).json({ 
        error: true,
        message: errMsg,
        description: errMsg,
        errors: errList,
        details: custError.details || custError.responseData || null,
        code: 'CUSTOMER_CREATION_FAILED'
      });
    }

    // 5. Cobrança PIX
    if (normalizedMethod === 'PIX') {
      try {
        const pixResult = await createPixPayment(customerId, finalAmount, finalDescription);

        return res.status(200).json({
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
        });
      } catch (pixErr: any) {
        console.error('[API Payments PIX Error] Erro detalhado ao gerar cobrança PIX:', pixErr);
        const status = pixErr.status || pixErr.statusCode || 400;
        const errMsg = pixErr.errors?.[0]?.description || pixErr.message || 'Erro desconhecido na API do Asaas ao gerar PIX';
        const errList = pixErr.errors || pixErr.details?.errors || (Array.isArray(pixErr.details) ? pixErr.details : [{ description: errMsg }]);
        return res.status(status).json({ 
          error: true,
          message: errMsg,
          description: errMsg,
          errors: errList,
          details: pixErr.details || pixErr.responseData || null,
          invoiceUrl: pixErr.invoiceUrl || null,
          code: 'PIX_GENERATION_FAILED' 
        });
      }
    }

    // 6. Cobrança Cartão de Crédito
    if (normalizedMethod === 'CREDIT_CARD') {
      if (
        !creditCard || 
        typeof creditCard !== 'object' || 
        !creditCard.number || 
        !creditCard.expiryMonth || 
        !creditCard.expiryYear || 
        !creditCard.ccv
      ) {
        return res.status(400).json({
          error: true,
          message: 'Dados do cartão de crédito incompletos (número, mês, ano e CCV são obrigatórios).',
          code: 'INVALID_CREDIT_CARD'
        });
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

        return res.status(200).json({
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
        });
      } catch (cardErr: any) {
        return res.status(400).json({
          error: true,
          message: cardErr.message || 'Cartão de crédito recusado ou inválido.',
          code: 'CARD_PAYMENT_DECLINED'
        });
      }
    }

    return res.status(400).json({ error: true, message: 'Operação não suportada' });

  } catch (error: any) {
    console.error('ERRO FATAL NA ROTA PAYMENTS:', error);
    return res.status(500).json({ 
      error: true,
      message: error?.message || 'Erro interno no servidor de pagamentos'
    });
  }
}
