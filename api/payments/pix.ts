import asaasPaymentHandler from './index';

export default async function handler(req: any, res: any) {
  try {
    if (req) {
      if (!req.body) {
        req.body = { paymentMethod: 'PIX' };
      } else if (typeof req.body === 'object') {
        req.body.paymentMethod = 'PIX';
      }
    }
    return asaasPaymentHandler(req, res);
  } catch (error: any) {
    console.error('ERRO FATAL NA ROTA PAYMENTS (PIX):', error);
    return res?.status?.(200)?.json?.({
      error: true,
      message: error?.message || 'Erro interno no servidor de pagamentos'
    });
  }
}
