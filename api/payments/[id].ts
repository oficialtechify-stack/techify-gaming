import { getAsaasPaymentStatus } from '../../lib/asaas';

export default async function handler(req: any, res: any) {
  try {
    if (res?.setHeader) {
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
      res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
      );
    }

    if (req?.method === 'OPTIONS') {
      return res.status(200).end();
    }

    const { id } = req?.query || {};
    const paymentId = id || req?.url?.split?.('/')?.pop()?.split?.('?')?.[0];

    if (!paymentId) {
      return res.status(200).json({ error: true, message: 'ID do pagamento é obrigatório' });
    }

    const paymentData = await getAsaasPaymentStatus(String(paymentId));
    const isApproved = paymentData.status === 'CONFIRMED' || paymentData.status === 'RECEIVED';

    return res.status(200).json({
      id: paymentData.id,
      status: isApproved ? 'approved' : paymentData.status?.toLowerCase(),
      status_detail: paymentData.status,
      date_approved: paymentData.confirmedDate || paymentData.paymentDate || null,
      amount: paymentData.value,
      total_amount: paymentData.value
    });
  } catch (err: any) {
    console.error('ERRO NA CONSULTA DE PAGAMENTO:', err);
    return res.status(200).json({ error: true, message: err?.message || 'Erro ao verificar status do pagamento no Asaas' });
  }
}
