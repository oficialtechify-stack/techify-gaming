import { getAsaasPaymentStatus } from '../../lib/asaas';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { id } = req.query || {};
  const paymentId = id || req.url.split('/').pop()?.split('?')[0];

  if (!paymentId) {
    return res.status(400).json({ error: 'ID do pagamento é obrigatório' });
  }

  try {
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
    return res.status(500).json({ error: err.message || 'Erro ao verificar status do pagamento no Asaas' });
  }
}
