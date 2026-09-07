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
  const apiKey = (process.env.ASAAS_API_KEY || '').trim();
  let apiUrl = (process.env.ASAAS_API_URL || '').trim();

  // Sincronia automática estrita de ambientes:
  // Chave de Sandbox: inicia com $aact_hml_ ou contém 'hml'/'sandbox'
  // Chave de Produção: inicia com $aact_prod_ ou $aact_
  const isSandbox = apiKey.includes('_hml_') || apiKey.includes('sandbox') || apiUrl.includes('sandbox');

  if (isSandbox) {
    apiUrl = 'https://sandbox.asaas.com/api/v3';
  } else {
    apiUrl = 'https://api.asaas.com/v3';
  }

  // Normalização caso contenha www.asaas.com ou barra final
  if (apiUrl.includes('www.asaas.com')) {
    apiUrl = apiUrl.replace('www.asaas.com', 'api.asaas.com');
  }
  apiUrl = apiUrl.replace(/\/+$/, '');

  if (!apiKey) {
    console.error('[Asaas Service] ERRO CRÍTICO: process.env.ASAAS_API_KEY está undefined ou vazia!');
  } else {
    console.log(`[Asaas Service] Ambiente sincronizado: ${isSandbox ? 'SANDBOX' : 'PRODUÇÃO'} (${apiUrl})`);
  }

  return { apiKey, apiUrl, isSandbox };
}

function getHeaders(subaccountId?: string) {
  const { apiKey } = getAsaasConfig();
  const token = process.env.ASAAS_API_KEY || apiKey;
  if (!token) {
    console.error('[Asaas Service] ERRO CRÍTICO: process.env.ASAAS_API_KEY está undefined ao montar headers!');
  }
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'access_token': (process.env.ASAAS_API_KEY || token || '') as string
  };

  if (subaccountId) {
    headers['account'] = subaccountId;
  }

  return headers;
}

/**
 * Normaliza e remove qualquer caractere não numérico de CPF ou CNPJ
 */
export function cleanDocument(docStr?: string | number | null): string {
  if (!docStr) return '';
  return String(docStr).replace(/\D/g, '').trim();
}

/**
 * getOrCreateCustomer(userData, subaccountId?)
 * 1. Limpa o CPF/CNPJ removendo qualquer pontuação (apenas dígitos).
 * 2. Faz GET para ${ASAAS_API_URL}/customers?cpfCnpj=${cpfCnpj} com o header 'access_token' (e 'account' se subconta).
 * 3. Se o cliente já existir no Asaas, retorna o id encontrado.
 * 4. Se não existir, faz POST para ${ASAAS_API_URL}/customers para cadastrar e retorna o novo id.
 */
export async function getOrCreateCustomer(userData: AsaasCustomerData, subaccountId?: string): Promise<string> {
  const { apiUrl, apiKey } = getAsaasConfig();
  if (!apiKey) {
    throw new Error('Chave de API do Asaas (ASAAS_API_KEY) não configurada nas variáveis de ambiente.');
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'access_token': (process.env.ASAAS_API_KEY || apiKey) as string
  };

  if (subaccountId) {
    headers['account'] = subaccountId;
  }
  const cpfCnpj = cleanDocument(userData?.cpfCnpj);

  if (!cpfCnpj) {
    throw new Error('CPF ou CNPJ obrigatório para localizar ou criar cliente no Asaas.');
  }

  // 1. Busca cliente existente por CPF/CNPJ (apenas dígitos)
  try {
    const searchUrl = `${apiUrl}/customers?cpfCnpj=${encodeURIComponent(cpfCnpj)}`;
    const searchRes = await fetch(searchUrl, {
      method: 'GET',
      headers
    });

    const searchData = await searchRes.json().catch(() => null);

    if (searchRes.ok && searchData) {
      if (searchData.data && Array.isArray(searchData.data) && searchData.data.length > 0) {
        const existingCustomer = searchData.data[0];
        console.log(`[Asaas] Cliente existente localizado no Asaas: ${existingCustomer.id} (${existingCustomer.name})`);
        return existingCustomer.id;
      }
    } else {
      console.error('[Asaas API Error] Erro ao consultar cliente existente (searchData.errors):', {
        status: searchRes.status,
        errors: searchData?.errors,
        fullResponse: searchData
      });
    }
  } catch (searchErr) {
    console.error('[Asaas API Error] Exceção de rede ao pesquisar cliente existente:', searchErr);
  }

  // 2. Não encontrado -> Cadastra novo cliente no Asaas com dados formatados
  const cleanPhone = userData.phone ? cleanDocument(userData.phone) : undefined;
  const cleanMobile = userData.mobilePhone ? cleanDocument(userData.mobilePhone) : cleanPhone;

  const payload = {
    name: userData.name || 'Cliente LeadsPay',
    email: userData.email || 'cliente@leadspay.com',
    cpfCnpj: cpfCnpj, // Estritamente numérico sem pontuação
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

  let createRes: Response;
  try {
    createRes = await fetch(`${apiUrl}/customers`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
  } catch (netErr: any) {
    console.error('[Asaas API Error] Falha de rede ao criar cliente no Asaas:', netErr);
    throw new Error(`Falha de conexão com Asaas: ${netErr.message}`);
  }

  const createData = await createRes.json().catch(() => null);
  console.error('RESPOSTA BRUTA ASAAS (CLIENTE):', JSON.stringify(createData, null, 2));

  if (!createRes.ok) {
    const errorMessage = 
      createData?.errors?.[0]?.description || 
      createData?.message || 
      'Erro desconhecido na API do Asaas ao cadastrar cliente';
    const errorObj: any = new Error(errorMessage);
    errorObj.status = createRes.status;
    errorObj.statusCode = createRes.status;
    errorObj.responseData = createData;
    errorObj.details = createData?.errors || createData;
    errorObj.errors = createData?.errors || [{ description: errorMessage }];
    throw errorObj;
  }

  console.log(`[Asaas] Novo cliente criado com sucesso: ${createData.id}`);
  return createData.id;
}

/**
 * createPixPayment(customerId, amount, description, subaccountId?)
 * 1. Faz POST para ${ASAAS_API_URL}/payments com billingType: 'PIX', valor numérico e vencimento YYYY-MM-DD.
 * 2. Faz GET para ${ASAAS_API_URL}/payments/${paymentId}/pixQrCode para obter Copia e Cola e QR Code em Base64.
 * 3. Injeta o header 'account' quando subaccountId for fornecido.
 * 4. Retorna os dados completos do PIX com logs de erro detalhados.
 */
export async function createPixPayment(
  customerId: string, 
  amount: number, 
  description?: string,
  subaccountId?: string
): Promise<AsaasPixResponse> {
  const { apiUrl, apiKey } = getAsaasConfig();
  if (!apiKey) {
    throw new Error('Chave de API do Asaas (ASAAS_API_KEY) não configurada nas variáveis de ambiente.');
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'access_token': (process.env.ASAAS_API_KEY || apiKey) as string
  };

  if (subaccountId) {
    headers['account'] = subaccountId;
  }

  if (!customerId) {
    throw new Error('ID do cliente Asaas é obrigatório para gerar PIX.');
  }

  // 1. Valor numérico (ex: 197.99)
  const cleanAmount = Number(parseFloat(String(amount)).toFixed(2));
  if (isNaN(cleanAmount) || cleanAmount <= 0) {
    throw new Error('Valor inválido para cobrança PIX no Asaas.');
  }

  // 2. Data de vencimento estritamente no formato YYYY-MM-DD
  const today = new Date().toISOString().split('T')[0];

  const paymentPayload = {
    customer: customerId,
    billingType: 'PIX',
    value: cleanAmount,
    dueDate: today,
    description: description || 'Pagamento LeadsPay'
  };

  console.log('[Asaas] Solicitando criação de cobrança PIX:', paymentPayload, subaccountId ? `(Subconta: ${subaccountId})` : '(Conta Master)');

  let paymentRes: Response;
  try {
    paymentRes = await fetch(`${apiUrl}/payments`, {
      method: 'POST',
      headers,
      body: JSON.stringify(paymentPayload)
    });
  } catch (netErr: any) {
    console.error('[Asaas API Error] Erro de rede ao requisitar criação de pagamento PIX:', netErr);
    throw new Error(`Falha de conexão com Asaas: ${netErr.message}`);
  }

  const responseData = await paymentRes.json().catch(() => null);
  console.error('RESPOSTA BRUTA ASAAS:', JSON.stringify(responseData, null, 2));

  if (!paymentRes.ok) {
    const errorMsg = 
      responseData?.errors?.[0]?.description || 
      responseData?.message || 
      'Erro desconhecido na API do Asaas';
    const errorObj: any = new Error(errorMsg);
    errorObj.status = paymentRes.status;
    errorObj.statusCode = paymentRes.status;
    errorObj.responseData = responseData;
    errorObj.details = responseData?.errors || responseData;
    errorObj.errors = responseData?.errors || [{ description: errorMsg }];
    throw errorObj;
  }

  const paymentData = responseData;
  if (!paymentData || !paymentData.id) {
    throw new Error('Resposta do Asaas não contém o identificador da cobrança criada.');
  }

  const paymentId = paymentData.id;
  console.log(`[Asaas] Cobrança criada com ID ${paymentId}. Resgatando QR Code PIX...`);

  // 3. Busca QR Code dinâmico e código Pix Copia e Cola
  let qrRes: Response;
  try {
    qrRes = await fetch(`${apiUrl}/payments/${paymentId}/pixQrCode`, {
      method: 'GET',
      headers
    });
  } catch (qrNetErr: any) {
    console.error('[Asaas API Error] Erro de rede ao resgatar QR Code PIX:', qrNetErr);
    throw new Error(`Falha ao buscar QR Code PIX: ${qrNetErr.message}`);
  }

  const qrData = await qrRes.json().catch(() => null);
  console.error('RESPOSTA BRUTA ASAAS (PIX QR CODE):', JSON.stringify(qrData, null, 2));

  if (!qrRes.ok) {
    const qrError = 
      qrData?.errors?.[0]?.description || 
      qrData?.message || 
      'Erro desconhecido ao resgatar QR Code Pix';
    const errorObj: any = new Error(qrError);
    errorObj.status = qrRes.status;
    errorObj.statusCode = qrRes.status;
    errorObj.responseData = qrData;
    errorObj.details = qrData?.errors || qrData;
    errorObj.errors = qrData?.errors || [{ description: qrError }];
    errorObj.invoiceUrl = paymentData.invoiceUrl;
    throw errorObj;
  }

  console.log(`[Asaas] QR Code PIX e Copia e Cola obtidos com sucesso para ${paymentId}`);

  return {
    paymentId: paymentId,
    status: paymentData.status || 'PENDING',
    value: paymentData.value || cleanAmount,
    netValue: paymentData.netValue,
    payload: qrData?.payload || qrData?.copyAndPaste || '',
    encodedImage: qrData?.encodedImage || '',
    expirationDate: qrData?.expirationDate || paymentData.dueDate,
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
  holderInfo: AsaasCreditCardHolderInfo,
  subaccountId?: string
): Promise<AsaasCreditCardResponse> {
  const { apiUrl, apiKey } = getAsaasConfig();
  if (!apiKey) {
    throw new Error('Chave de API do Asaas (ASAAS_API_KEY) não configurada nas variáveis de ambiente.');
  }
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'access_token': (process.env.ASAAS_API_KEY || apiKey) as string
  };

  if (subaccountId) {
    headers['account'] = subaccountId;
  }

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

  let response: Response;
  try {
    response = await fetch(`${apiUrl}/payments`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
  } catch (netErr: any) {
    console.error('[Asaas API Error] Falha de rede ao processar cartão de crédito:', netErr);
    throw new Error(`Falha de conexão com Asaas: ${netErr.message}`);
  }

  const responseData = await response.json().catch(() => null);

  if (!response.ok) {
    console.error('[Asaas API Error] Erro completo no pagamento de cartão (payment.errors):', JSON.stringify(responseData, null, 2));
    const errorDetail = 
      responseData?.errors?.map((e: any) => e.description).join(' | ') || 
      responseData?.errors?.[0]?.description || 
      responseData?.message || 
      `Cartão de crédito recusado ou inválido (${response.status})`;
    const errorObj: any = new Error(errorDetail);
    errorObj.details = responseData?.errors || responseData;
    throw errorObj;
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

/**
 * Consulta o status de um pagamento específico no Asaas
 */
export async function getAsaasPaymentStatus(paymentId: string): Promise<any> {
  const { apiKey, apiUrl } = getAsaasConfig();
  if (!apiKey) {
    throw new Error('Chave de API do Asaas não configurada');
  }

  const headers = getHeaders();
  const response = await fetch(`${apiUrl}/payments/${paymentId}`, {
    method: 'GET',
    headers
  });

  if (!response.ok) {
    throw new Error(`Falha ao consultar pagamento no Asaas: ${response.status}`);
  }

  return await response.json();
}

