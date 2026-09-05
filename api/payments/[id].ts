import { MercadoPagoConfig, Payment } from 'mercadopago';

const MP_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN || process.env.MERCADO_PAGO_ACCESS_TOKEN || 'APP_USR-5352039864226161-090210-52ddde4037f8daf9e7dbde717d0cd562-3152233934';

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
    const client = new MercadoPagoConfig({ accessToken: MP_ACCESS_TOKEN });
    const payment = new Payment(client);
    const paymentData = await payment.get({ id: String(paymentId) });

    return res.status(200).json({
      id: paymentData.id,
      status: paymentData.status,
      status_detail: paymentData.status_detail,
      date_approved: paymentData.date_approved
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Erro ao verificar status do pagamento' });
  }
}
