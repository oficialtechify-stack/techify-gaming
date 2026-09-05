import { 
  getOrCreateCustomer, 
  createPixPayment, 
  createCreditCardPayment, 
  cleanDocument 
} from '../../lib/asaas';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, access_token'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido. Use POST.' });
  }

  try {
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
    } = req.body || {};

    const normalizedMethod = String(paymentMethod || 'PIX').toUpperCase().trim();
    if (normalizedMethod !== 'PIX' && normalizedMethod !== 'CREDIT_CARD') {
      return res.status(400).json({ 
        error: 'Método de pagamento inválido. Utilize "PIX" ou "CREDIT_CARD".',
        received: paymentMethod 
      });
    }

    const rawAmount = amount ?? valorTotal ?? total_amount;
    const finalAmount = Number(parseFloat(String(rawAmount)).toFixed(2));
    if (isNaN(finalAmount) || finalAmount <= 0) {
      return res.status(400).json({ error: 'Valor da cobrança inválido ou não informado.' });
    }

    const customerData = user || {
      name: req.body.nomeDoCliente || req.body.name || 'Cliente LeadsPay',
      email: req.body.emailDoCliente || req.body.email,
      cpfCnpj: req.body.cpfLimpo || req.body.cpf || req.body.documentNumber,
      phone: req.body.telefone || req.body.phone,
      mobilePhone: req.body.celular || req.body.mobilePhone
    };

    if (!customerData?.email) {
      return res.status(400).json({ error: 'O e-mail do cliente é obrigatório para processar a cobrança.' });
    }

    const cleanCpf = cleanDocument(customerData.cpfCnpj);
    if (!cleanCpf) {
      return res.status(400).json({ error: 'CPF ou CNPJ válido é obrigatório para o cadastro e cobrança no Asaas.' });
    }

    const finalRefCode = refCode || affiliate_code || affiliateRef || null;
    const finalPlanId = (planId || plan_id || null)?.toString() || null;
    const finalDescription = description || `Assinatura Plano ${finalPlanId || 'LeadsPay'}`;

    // 1. Obter ou Criar Cliente no Asaas
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
      return res.status(400).json({ 
        error: custError.message || 'Erro ao registrar cliente no Asaas.',
        code: 'CUSTOMER_CREATION_FAILED'
      });
    }

    // 2. Cobrança PIX
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
            companyId: companyId || company_id,
            affiliateRef: finalRefCode,
            customerId
          }
        });
      } catch (pixErr: any) {
        return res.status(400).json({ 
          error: pixErr.message || 'Falha ao gerar cobrança PIX no Asaas.',
          code: 'PIX_GENERATION_FAILED' 
        });
      }
    }

    // 3. Cobrança Cartão de Crédito
    if (normalizedMethod === 'CREDIT_CARD') {
      if (!creditCard || !creditCard.number || !creditCard.expiryMonth || !creditCard.expiryYear || !creditCard.ccv) {
        return res.status(400).json({
          error: 'Dados do cartão de crédito incompletos (número, mês, ano e CCV são obrigatórios).',
          code: 'INVALID_CREDIT_CARD'
        });
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
            companyId: companyId || company_id,
            affiliateRef: finalRefCode,
            customerId
          }
        });
      } catch (cardErr: any) {
        return res.status(400).json({
          error: cardErr.message || 'Cartão de crédito recusado ou inválido.',
          code: 'CARD_PAYMENT_DECLINED'
        });
      }
    }

    return res.status(400).json({ error: 'Operação não suportada' });
  } catch (err: any) {
    console.error('[API Payments Serverless] Erro interno:', err);
    return res.status(500).json({ 
      error: err.message || 'Erro interno no servidor ao processar pagamento.',
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
}
