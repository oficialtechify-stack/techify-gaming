/**
 * Handler Vercel Serverless Function
 * POST /api/payments
 * Blindagem 100% contra FUNCTION_INVOCATION_FAILED na Vercel
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
    return res.status(200).json({ error: true, message: 'Método não permitido. Utilize POST.' });
  }

  try {
    // 1. Validação e Tratamento de Entrada com parse seguro do body
    let body: any = {};
    try {
      body = await parseRequestBody(req);
    } catch (e) {
      body = {};
    }

    if (!body || typeof body !== 'object') {
      body = {};
    }

    // 2. Trate todas as variáveis com fallbacks seguros para evitar leitura de propriedade em undefined
    const rawCustomer = (body.user && typeof body.user === 'object')
      ? body.user
      : (body.customer && typeof body.customer === 'object' ? body.customer : {});

    const customerName = String(
      body.name || 
      body.userName || 
      rawCustomer.name || 
      body.nomeDoCliente || 
      "Cliente"
    ).trim();

    const customerEmail = String(
      body.email || 
      body.userEmail || 
      rawCustomer.email || 
      body.emailDoCliente || 
      "email@dominio.com"
    ).trim().toLowerCase();

    // Documento: Remova pontos e traços com .replace(/\D/g, '') garantindo que não quebre se o campo for nulo
    const rawDoc = String(
      body.documentNumber || 
      body.cpfCnpj || 
      body.cpf || 
      body.cpfLimpo || 
      rawCustomer.cpfCnpj || 
      rawCustomer.cpf || 
      ""
    );
    const cleanCpf = rawDoc.replace(/\D/g, '').trim();

    // Valor: Number(body.amount || body.value || 197.99)
    const rawAmount = body.amount ?? body.value ?? body.valorTotal ?? body.total_amount;
    const finalAmount = Number(parseFloat(String(rawAmount || 197.99)).toFixed(2));

    const paymentMethod = String(body.paymentMethod || body.billingType || 'PIX').toUpperCase().trim();
    const description = String(body.description || `Assinatura Plano ${body.planId || body.plan_id || 'LeadsPay'}`).trim();

    // Validações com retorno status 200 ({ error: true, message: ... }) para evitar crash 500 na Vercel
    if (!customerEmail || !customerEmail.includes('@')) {
      return res.status(200).json({ 
        error: true, 
        message: 'O e-mail do cliente é obrigatório e deve ser válido para processar a cobrança.' 
      });
    }

    if (!cleanCpf || cleanCpf.length < 11) {
      return res.status(200).json({ 
        error: true, 
        message: 'CPF ou CNPJ válido é obrigatório para processar a cobrança no Asaas.' 
      });
    }

    if (isNaN(finalAmount) || finalAmount <= 0) {
      return res.status(200).json({ 
        error: true, 
        message: 'Valor da cobrança inválido. Deve ser maior que zero.' 
      });
    }

    // 3. Obter configuração do Asaas
    const apiKey = (process.env.ASAAS_API_KEY || '').trim();
    const isSandbox = process.env.ASAAS_ENV === 'sandbox' || apiKey.startsWith('$aact_YTU5YTE0M2M6N2I4');
    const apiUrl = process.env.ASAAS_API_URL || (isSandbox ? 'https://sandbox.asaas.com/api/v3' : 'https://api.asaas.com/v3');

    if (!apiKey) {
      return res.status(200).json({ 
        error: true, 
        message: 'Chave de API do Asaas (ASAAS_API_KEY) não configurada nas variáveis de ambiente da Vercel.' 
      });
    }

    const headers = {
      'Content-Type': 'application/json',
      'access_token': apiKey
    };

    // 4. Localizar ou Criar Cliente no Asaas em bloco try/catch isolado (sem throw)
    let customerId = '';
    try {
      const searchRes = await fetch(`${apiUrl}/customers?cpfCnpj=${encodeURIComponent(cleanCpf)}`, {
        method: 'GET',
        headers
      });
      const searchData = await searchRes.json().catch(() => null);
      if (searchRes.ok && searchData?.data && Array.isArray(searchData.data) && searchData.data.length > 0) {
        customerId = searchData.data[0].id;
      }
    } catch (searchErr: any) {
      console.warn('[Asaas] Falha não impeditiva na busca de cliente:', searchErr?.message);
    }

    if (!customerId) {
      try {
        const createRes = await fetch(`${apiUrl}/customers`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            name: customerName,
            email: customerEmail,
            cpfCnpj: cleanCpf,
            phone: String(body.phone || rawCustomer.phone || '').replace(/\D/g, '') || undefined,
            notificationDisabled: false
          })
        });

        const createData = await createRes.json().catch(() => null);

        if (!createRes.ok || !createData?.id) {
          const errMsg = createData?.errors?.[0]?.description || createData?.message || 'Erro ao cadastrar cliente no Asaas.';
          return res.status(200).json({ 
            error: true, 
            message: errMsg, 
            description: errMsg,
            errors: createData?.errors || [{ description: errMsg }],
            code: 'CUSTOMER_CREATION_FAILED'
          });
        }
        customerId = createData.id;
      } catch (custErr: any) {
        return res.status(200).json({ 
          error: true, 
          message: custErr?.message || 'Falha de conexão com a API do Asaas ao cadastrar cliente.' 
        });
      }
    }

    // 5. Chamada de Cobrança PIX sem Throw/Crash
    if (paymentMethod === 'PIX') {
      try {
        const today = new Date().toISOString().split('T')[0];
        const paymentPayload = {
          customer: customerId,
          billingType: 'PIX',
          value: finalAmount,
          dueDate: today,
          description: description
        };

        const paymentRes = await fetch(`${apiUrl}/payments`, {
          method: 'POST',
          headers,
          body: JSON.stringify(paymentPayload)
        });

        const paymentData = await paymentRes.json().catch(() => null);

        if (!paymentRes.ok || !paymentData?.id) {
          const errMsg = paymentData?.errors?.[0]?.description || paymentData?.message || 'Erro ao gerar cobrança PIX no Asaas.';
          return res.status(200).json({ 
            error: true, 
            message: errMsg, 
            description: errMsg,
            errors: paymentData?.errors || [{ description: errMsg }],
            code: 'PIX_GENERATION_FAILED'
          });
        }

        const paymentId = paymentData.id;

        // Buscar QR Code PIX
        const qrRes = await fetch(`${apiUrl}/payments/${paymentId}/pixQrCode`, {
          method: 'GET',
          headers
        });
        const qrData = await qrRes.json().catch(() => null);

        if (!qrRes.ok) {
          const errMsg = qrData?.errors?.[0]?.description || qrData?.message || 'Erro ao resgatar QR Code do PIX no Asaas.';
          return res.status(200).json({ 
            error: true, 
            message: errMsg, 
            description: errMsg,
            errors: qrData?.errors || [{ description: errMsg }],
            invoiceUrl: paymentData.invoiceUrl,
            code: 'PIX_QRCODE_FAILED'
          });
        }

        const qrCodeBase64 = qrData?.encodedImage || '';
        const copyAndPaste = qrData?.payload || qrData?.copyAndPaste || '';

        return res.status(200).json({
          success: true,
          gateway: 'Asaas v3',
          billingType: 'PIX',
          paymentId: paymentId,
          payment_id: paymentId,
          id: paymentId,
          status: paymentData.status || 'PENDING',
          amount: paymentData.value || finalAmount,
          qrCodeBase64: qrCodeBase64,
          copyAndPaste: copyAndPaste,
          payload: copyAndPaste,
          encodedImage: qrCodeBase64,
          qr_code: copyAndPaste,
          qr_code_base64: qrCodeBase64,
          expirationDate: qrData?.expirationDate || paymentData.dueDate,
          invoiceUrl: paymentData.invoiceUrl,
          ticket_url: paymentData.invoiceUrl,
          metadata: {
            planId: body.planId || body.plan_id || null,
            companyId: body.companyId || body.company_id || null,
            affiliateRef: body.refCode || body.affiliate_code || body.affiliateRef || null,
            customerId
          }
        });
      } catch (pixErr: any) {
        return res.status(200).json({ 
          error: true, 
          message: pixErr?.message || 'Falha de rede ao processar cobrança PIX no Asaas.' 
        });
      }
    }

    // 6. Chamada de Cobrança Cartão de Crédito sem Throw/Crash
    if (paymentMethod === 'CREDIT_CARD') {
      try {
        const creditCard = body.creditCard || {};
        const holderInfo = body.holderInfo || {};

        if (!creditCard.number || !creditCard.expiryMonth || !creditCard.expiryYear || !creditCard.ccv) {
          return res.status(200).json({ 
            error: true, 
            message: 'Dados do cartão de crédito incompletos (número, mês, ano e CCV são obrigatórios).' 
          });
        }

        const today = new Date().toISOString().split('T')[0];
        const cardPayload = {
          customer: customerId,
          billingType: 'CREDIT_CARD',
          value: finalAmount,
          dueDate: today,
          description: description,
          creditCard: {
            holderName: creditCard.holderName || customerName,
            number: String(creditCard.number).replace(/\D/g, ''),
            expiryMonth: String(creditCard.expiryMonth).padStart(2, '0'),
            expiryYear: String(creditCard.expiryYear).length === 2 ? `20${creditCard.expiryYear}` : String(creditCard.expiryYear),
            ccv: String(creditCard.ccv).trim()
          },
          creditCardHolderInfo: {
            name: holderInfo.name || creditCard.holderName || customerName,
            email: holderInfo.email || customerEmail,
            cpfCnpj: String(holderInfo.cpfCnpj || cleanCpf).replace(/\D/g, ''),
            postalCode: String(holderInfo.postalCode || '01310100').replace(/\D/g, ''),
            addressNumber: String(holderInfo.addressNumber || '100').trim(),
            phone: String(holderInfo.phone || '11999999999').replace(/\D/g, '')
          }
        };

        const cardRes = await fetch(`${apiUrl}/payments`, {
          method: 'POST',
          headers,
          body: JSON.stringify(cardPayload)
        });

        const cardData = await cardRes.json().catch(() => null);

        if (!cardRes.ok || !cardData?.id) {
          const errMsg = cardData?.errors?.[0]?.description || cardData?.message || 'Cartão de crédito recusado ou inválido.';
          return res.status(200).json({ 
            error: true, 
            message: errMsg, 
            description: errMsg,
            errors: cardData?.errors || [{ description: errMsg }] 
          });
        }

        return res.status(200).json({
          success: true,
          gateway: 'Asaas v3',
          billingType: 'CREDIT_CARD',
          paymentId: cardData.id,
          payment_id: cardData.id,
          id: cardData.id,
          status: cardData.status || 'CONFIRMED',
          amount: cardData.value || finalAmount,
          confirmedDate: cardData.confirmedDate,
          invoiceUrl: cardData.invoiceUrl,
          metadata: {
            planId: body.planId || body.plan_id || null,
            companyId: body.companyId || body.company_id || null,
            affiliateRef: body.refCode || body.affiliate_code || body.affiliateRef || null,
            customerId
          }
        });
      } catch (cardErr: any) {
        return res.status(200).json({ 
          error: true, 
          message: cardErr?.message || 'Falha de comunicação ao processar cartão de crédito no Asaas.' 
        });
      }
    }

    return res.status(200).json({ 
      error: true, 
      message: 'Método de pagamento não suportado. Utilize "PIX" ou "CREDIT_CARD".' 
    });

  } catch (error: any) {
    console.error('ERRO FATAL NA ROTA PAYMENTS:', error);
    return res.status(200).json({ 
      error: true, 
      message: error?.message || "Erro interno no servidor" 
    });
  }
}
