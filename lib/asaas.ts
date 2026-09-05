/**
 * Módulo de Serviços da API v3 do Asaas (LeadsPay)
 * Comunicação direta com a API REST do Asaas utilizando fetch nativo
 */

export interface AsaasCustomerData {
  name: string;
  email: string;
  cpfCnpj: string;
  phone?: string;
  mobilePhone?: string;
  postalCode?: string;
  address?: string;
  addressNumber?: string;
  complement?: string;
  province?: string;
  externalReference?: string;
}

export interface AsaasCreditCard {
  holderName: string;
  number: string;
  expiryMonth: string;
  expiryYear: string;
  ccv: string;
}

export interface AsaasCreditCardHolderInfo {
  name: string;
  email: string;
  cpfCnpj: string;
  postalCode: string;
  addressNumber: string;
  addressComplement?: string;
  phone?: string;
  mobilePhone?: string;
}

export interface AsaasPixResponse {
  paymentId: string;
  status: string;
  value: number;
  netValue?: number;
  payload: string; // Código Pix Copia e Cola
  encodedImage: string; // QR Code em imagem Base64
  expirationDate?: string;
  invoiceUrl?: string;
  bankSlipUrl?: string;
}

export interface AsaasCreditCardResponse {
  paymentId: string;
  status: string;
  value: number;
  netValue?: number;
  billingType: string;
  confirmedDate?: string;
  creditCard?: {
    creditCardNumber?: string;
    creditCardBrand?: string;
    creditCardToken?: string;
  };
  invoiceUrl?: string;
  bankSlipUrl?: string;
}

function getAsaasConfig() {
  const apiKey = process.env.ASAAS_API_KEY || '';
  let apiUrl = (process.env.ASAAS_API_URL || 'https://www.asaas.com/api/v3').trim();
  if (apiUrl.endsWith('/')) {
    apiUrl = apiUrl.slice(0, -1);
  }
  return { apiKey, apiUrl };
}

function getHeaders() {
  const { apiKey } = getAsaasConfig();
  if (!apiKey) {
    console.warn('[Asaas Service] AVISO: ASAAS_API_KEY não configurada no ambiente.');
  }
  return {
    'Content-Type': 'application/json',
    'access_token': apiKey,
    'User-Agent': 'LeadsPay/1.0'
  };
}

/**
 * Normaliza e remove caracteres não numéricos de CPF ou CNPJ
 */
export function cleanDocument(docStr: string): string {
  if (!docStr) return '';
  return String(docStr).replace(/\D/g, '').trim();
}

/**
 * getOrCreateCustomer(userData)
 * 1. Limpa o CPF/CNPJ removendo caracteres não numéricos.
 * 2. Faz GET para ${ASAAS_API_URL}/customers?cpfCnpj=${cpfCnpj} com o header 'access_token'.
 * 3. Se o cliente já existir no Asaas, retorna o id encontrado.
 * 4. Se não existir, faz POST para ${ASAAS_API_URL}/customers para cadastrar e retorna o novo id.
 */
export async function getOrCreateCustomer(userData: AsaasCustomerData): Promise<string> {
  const { apiUrl } = getAsaasConfig();
  const headers = getHeaders();
  const cpfCnpj = cleanDocument(userData.cpfCnpj);

  if (!cpfCnpj) {
    throw new Error('CPF ou CNPJ obrigatório para localizar ou criar cliente no Asaas.');
  }

  // 1. Busca cliente existente por CPF/CNPJ
  try {
    const searchUrl = `${apiUrl}/customers?cpfCnpj=${encodeURIComponent(cpfCnpj)}`;
    const searchRes = await fetch(searchUrl, {
      method: 'GET',
      headers
    });

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData.data && Array.isArray(searchData.data) && searchData.data.length > 0) {
        const existingCustomer = searchData.data[0];
        console.log(`[Asaas] Cliente existente encontrado: ${existingCustomer.id} (${existingCustomer.name})`);
        return existingCustomer.id;
      }
    } else {
      console.warn(`[Asaas] Consulta de cliente retornou status ${searchRes.status}. Tentando criar.`);
    }
  } catch (searchErr) {
    console.warn('[Asaas] Erro ao pesquisar cliente existente:', searchErr);
  }

  // 2. Não encontrado -> Cadastra novo cliente no Asaas
  const cleanPhone = userData.phone ? cleanDocument(userData.phone) : undefined;
  const cleanMobile = userData.mobilePhone ? cleanDocument(userData.mobilePhone) : cleanPhone;

  const payload = {
    name: userData.name || 'Cliente LeadsPay',
    email: userData.email || 'cliente@leadspay.com',
    cpfCnpj: cpfCnpj,
    phone: cleanPhone || undefined,
    mobilePhone: cleanMobile || undefined,
    postalCode: userData.postalCode ? cleanDocument(userData.postalCode) : undefined,
    address: userData.address || undefined,
    addressNumber: userData.addressNumber || undefined,
    complement: userData.complement || undefined,
    province: userData.province || undefined,
    externalReference: userData.externalReference || undefined,
    notificationDisabled: false
  };

  const createRes = await fetch(`${apiUrl}/customers`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });

  const createData = await createRes.json();

  if (!createRes.ok) {
    const errorMessage = 
      createData?.errors?.[0]?.description || 
      createData?.message || 
      `Falha ao criar cliente no Asaas (${createRes.status})`;
    console.error('[Asaas] Erro ao criar cliente:', createData);
    throw new Error(errorMessage);
  }

  console.log(`[Asaas] Novo cliente criado com sucesso: ${createData.id}`);
  return createData.id;
}

/**
 * createPixPayment(customerId, amount, description)
 * 1. Faz POST para ${ASAAS_API_URL}/payments com billingType: 'PIX', valor e vencimento hoje.
 * 2. Faz GET para ${ASAAS_API_URL}/payments/${paymentId}/pixQrCode para obter Copia e Cola e QR Code em Base64.
 * 3. Retorna os dados completos do PIX.
 */
export async function createPixPayment(
  customerId: string, 
  amount: number, 
  description?: string
): Promise<AsaasPixResponse> {
  const { apiUrl } = getAsaasConfig();
  const headers = getHeaders();

  if (!customerId) {
    throw new Error('ID do cliente Asaas é obrigatório para gerar PIX.');
  }

  const cleanAmount = Number(parseFloat(String(amount)).toFixed(2));
  if (isNaN(cleanAmount) || cleanAmount <= 0) {
    throw new Error('Valor inválido para cobrança PIX no Asaas.');
  }

  // Data de vencimento: hoje (formato YYYY-MM-DD)
  const today = new Date().toISOString().split('T')[0];

  const paymentPayload = {
    customer: customerId,
    billingType: 'PIX',
    value: cleanAmount,
    dueDate: today,
    description: description || 'Pagamento LeadsPay'
  };

  console.log('[Asaas] Criando cobrança PIX:', paymentPayload);

  const paymentRes = await fetch(`${apiUrl}/payments`, {
    method: 'POST',
    headers,
    body: JSON.stringify(paymentPayload)
  });

  const paymentData = await paymentRes.json();

  if (!paymentRes.ok) {
    const errorMsg = 
      paymentData?.errors?.[0]?.description || 
      paymentData?.message || 
      `Erro ao gerar cobrança PIX no Asaas (${paymentRes.status})`;
    console.error('[Asaas] Erro ao criar pagamento PIX:', paymentData);
    throw new Error(errorMsg);
  }

  const paymentId = paymentData.id;

  // 2. Busca QR Code dinâmico e código Pix Copia e Cola
  const qrRes = await fetch(`${apiUrl}/payments/${paymentId}/pixQrCode`, {
    method: 'GET',
    headers
  });

  const qrData = await qrRes.json();

  if (!qrRes.ok) {
    const qrError = qrData?.errors?.[0]?.description || 'Erro ao resgatar QR Code PIX do Asaas.';
    console.error('[Asaas] Erro ao resgatar QR Code PIX:', qrData);
    throw new Error(qrError);
  }

  return {
    paymentId: paymentId,
    status: paymentData.status || 'PENDING',
    value: paymentData.value,
    netValue: paymentData.netValue,
    payload: qrData.payload, // Código PIX Copia e Cola
    encodedImage: qrData.encodedImage, // QR Code em imagem Base64
    expirationDate: qrData.expirationDate,
    invoiceUrl: paymentData.invoiceUrl,
    bankSlipUrl: paymentData.bankSlipUrl
  };
}

/**
 * createCreditCardPayment(customerId, amount, description, creditCard, holderInfo)
 * 1. Faz POST para ${ASAAS_API_URL}/payments com billingType: 'CREDIT_CARD'.
 * 2. Envia os objetos creditCard e creditCardHolderInfo.
 * 3. Trata erros de recusa de cartão e retorna o status da transação.
 */
export async function createCreditCardPayment(
  customerId: string,
  amount: number,
  description: string,
  creditCard: AsaasCreditCard,
  holderInfo: AsaasCreditCardHolderInfo
): Promise<AsaasCreditCardResponse> {
  const { apiUrl } = getAsaasConfig();
  const headers = getHeaders();

  if (!customerId) {
    throw new Error('ID do cliente Asaas é obrigatório para pagamento via Cartão de Crédito.');
  }

  const cleanAmount = Number(parseFloat(String(amount)).toFixed(2));
  if (isNaN(cleanAmount) || cleanAmount <= 0) {
    throw new Error('Valor inválido para cobrança no cartão de crédito.');
  }

  // Normalização dos dados do cartão
  const cleanCardNumber = String(creditCard.number || '').replace(/\D/g, '');
  const cleanExpiryMonth = String(creditCard.expiryMonth || '').padStart(2, '0');
  let cleanExpiryYear = String(creditCard.expiryYear || '');
  if (cleanExpiryYear.length === 2) {
    cleanExpiryYear = `20${cleanExpiryYear}`;
  }

  const cleanCpfCnpj = cleanDocument(holderInfo.cpfCnpj);
  const cleanPostalCode = cleanDocument(holderInfo.postalCode || '01310100');
  const cleanPhone = cleanDocument(holderInfo.phone || holderInfo.mobilePhone || '11999999999');

  const today = new Date().toISOString().split('T')[0];

  const payload = {
    customer: customerId,
    billingType: 'CREDIT_CARD',
    value: cleanAmount,
    dueDate: today,
    description: description || 'Assinatura / Plano LeadsPay',
    creditCard: {
      holderName: (creditCard.holderName || holderInfo.name || '').toUpperCase().trim(),
      number: cleanCardNumber,
      expiryMonth: cleanExpiryMonth,
      expiryYear: cleanExpiryYear,
      ccv: String(creditCard.ccv || '').trim()
    },
    creditCardHolderInfo: {
      name: (holderInfo.name || creditCard.holderName || '').trim(),
      email: holderInfo.email?.trim(),
      cpfCnpj: cleanCpfCnpj,
      postalCode: cleanPostalCode,
      addressNumber: String(holderInfo.addressNumber || '100').trim(),
      addressComplement: holderInfo.addressComplement || undefined,
      phone: cleanPhone,
      mobilePhone: cleanPhone
    }
  };

  console.log('[Asaas] Processando pagamento com Cartão de Crédito:', {
    customer: customerId,
    value: cleanAmount,
    cardMask: `**** **** **** ${cleanCardNumber.slice(-4)}`,
    holderName: payload.creditCard.holderName
  });

  const response = await fetch(`${apiUrl}/payments`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });

  const responseData = await response.json();

  if (!response.ok) {
    const errorDetail = 
      responseData?.errors?.[0]?.description || 
      responseData?.message || 
      `Cartão de crédito recusado ou inválido (${response.status})`;
    console.error('[Asaas] Erro no pagamento de cartão:', responseData);
    throw new Error(errorDetail);
  }

  // Verifica status de recusa imediata pelo adquirente
  if (responseData.status === 'REFUNDED' || responseData.status === 'CANCELLED') {
    throw new Error(`Pagamento com cartão não autorizado. Status: ${responseData.status}`);
  }

  return {
    paymentId: responseData.id,
    status: responseData.status || 'CONFIRMED',
    value: responseData.value,
    netValue: responseData.netValue,
    billingType: 'CREDIT_CARD',
    confirmedDate: responseData.confirmedDate,
    creditCard: responseData.creditCard,
    invoiceUrl: responseData.invoiceUrl,
    bankSlipUrl: responseData.bankSlipUrl
  };
}
