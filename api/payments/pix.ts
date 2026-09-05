import asaasPaymentHandler from './index';

export default async function handler(req: any, res: any) {
  // Garantir que a requisição seja processada pelo gateway oficial Asaas v3
  if (req.body) {
    req.body.paymentMethod = 'PIX';
  }
  return asaasPaymentHandler(req, res);
}
