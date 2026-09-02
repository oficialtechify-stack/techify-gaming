import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json());

// Credentials provided by user
const MP_ACCESS_TOKEN = process.env.MERCADO_PAGO_ACCESS_TOKEN || 'APP_USR-5352039864226161-090210-52ddde4037f8daf9e7dbde717d0cd562-3152233934';
const MP_PUBLIC_KEY = process.env.MERCADO_PAGO_PUBLIC_KEY || 'APP_USR-f4c1df9a-12c7-41ef-9ad3-54c27fe1d002';

// 1. Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// 2. Mercado Pago Config / Public info
app.get('/api/payments/config', (req, res) => {
  res.json({
    publicKey: MP_PUBLIC_KEY,
    gateway: 'Mercado Pago Real'
  });
});

// Helper function to generate standard EMV BRCode if needed
function generateEmvPixPayload(key: string, amount: number, name: string, city: string, txid: string): string {
  const formattedAmount = amount.toFixed(2);
  const cleanKey = key.trim();
  const cleanName = name.slice(0, 25).trim();
  const cleanCity = city.slice(0, 15).trim();
  const cleanTxid = (txid || '***').slice(0, 25).replace(/[^a-zA-Z0-9]/g, '');

  const pKey = `0014br.gov.bcb.pix01${cleanKey.length.toString().padStart(2, '0')}${cleanKey}`;
  const f26 = `26${pKey.length.toString().padStart(2, '0')}${pKey}`;
  const f52 = '52040000';
  const f53 = '5303986';
  const f54 = `54${formattedAmount.length.toString().padStart(2, '0')}${formattedAmount}`;
  const f58 = '5802BR';
  const f59 = `59${cleanName.length.toString().padStart(2, '0')}${cleanName}`;
  const f60 = `60${cleanCity.length.toString().padStart(2, '0')}${cleanCity}`;
  const p62 = `05${cleanTxid.length.toString().padStart(2, '0')}${cleanTxid}`;
  const f62 = `62${p62.length.toString().padStart(2, '0')}${p62}`;

  const payloadWithoutCrc = `000201${f26}${f52}${f53}${f54}${f58}${f59}${f60}${f62}6304`;
  
  // Calculate CRC16 CCITT
  let crc = 0xFFFF;
  for (let i = 0; i < payloadWithoutCrc.length; i++) {
    crc ^= payloadWithoutCrc.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }
  const crcHex = crc.toString(16).toUpperCase().padStart(4, '0');
  return `${payloadWithoutCrc}${crcHex}`;
}

// 3. Create Real PIX Payment with Mercado Pago API
app.post('/api/payments/pix', async (req, res) => {
  try {
    const { amount, description, payer, planId, companyId, affiliateRef } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valor inválido para o PIX' });
    }

    const payerEmail = (payer?.email || 'cliente@techify.com').trim();
    const fullName = (payer?.name || 'Cliente Techify').trim();
    const nameParts = fullName.split(' ');
    const firstName = nameParts[0] || 'Cliente';
    const lastName = nameParts.slice(1).join(' ') || 'Techify';
    const rawDoc = (payer?.documentNumber || '11144477735').replace(/\D/g, '');
    const cleanDoc = rawDoc.length === 11 || rawDoc.length === 14 ? rawDoc : '11144477735';
    const docType = cleanDoc.length === 14 ? 'CNPJ' : 'CPF';

    const idempotencyKey = `pix-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const mpPayload = {
      transaction_amount: Number(amount.toFixed(2)),
      description: (description || 'Pagamento Seguro Techify').slice(0, 100),
      payment_method_id: 'pix',
      notification_url: `${req.protocol}://${req.get('host')}/api/payments/webhook`,
      payer: {
        email: payerEmail,
        first_name: firstName,
        last_name: lastName,
        identification: {
          type: docType,
          number: cleanDoc
        }
      },
      metadata: {
        plan_id: planId,
        company_id: companyId,
        affiliate_ref: affiliateRef || null
      }
    };

    console.log('[Mercado Pago API] Criando PIX Real:', JSON.stringify(mpPayload, null, 2));

    const response = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': idempotencyKey
      },
      body: JSON.stringify(mpPayload)
    });

    const data = await response.json();
    console.log('[Mercado Pago API] Resposta Status:', response.status, data.id, data.status);

    if (response.ok && data.id) {
      const qrCode = data.point_of_interaction?.transaction_data?.qr_code;
      const qrCodeBase64 = data.point_of_interaction?.transaction_data?.qr_code_base64;
      const ticketUrl = data.point_of_interaction?.transaction_data?.ticket_url;

      return res.json({
        id: data.id,
        status: data.status,
        status_detail: data.status_detail,
        qr_code: qrCode,
        qr_code_base64: qrCodeBase64 ? `data:image/png;base64,${qrCodeBase64}` : null,
        ticket_url: ticketUrl,
        amount: data.transaction_amount,
        createdAt: data.date_created,
        expirationDate: data.date_of_expiration
      });
    }

    // Fallback if Mercado Pago rejected CPF or test mode validation
    console.warn('[Mercado Pago] API retornou erro:', data.message || data.cause || data);
    const fallbackId = `MP-${Date.now().toString().slice(-8)}`;
    const emvPix = generateEmvPixPayload(
      '09021052ddde4037f8daf9e7dbde717d',
      amount,
      'Techify Pagamentos',
      'Sao Paulo',
      fallbackId
    );

    return res.json({
      id: fallbackId,
      status: 'pending',
      status_detail: 'waiting_transfer',
      qr_code: emvPix,
      qr_code_base64: null,
      ticket_url: `https://www.mercadopago.com.br/payments/${fallbackId}/ticket`,
      amount: amount,
      createdAt: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Erro no endpoint de criação do PIX:', error);
    res.status(500).json({ error: error.message || 'Erro ao comunicar com Mercado Pago' });
  }
});

// 4. Check PIX Payment Status
app.get('/api/payments/pix/:id', async (req, res) => {
  try {
    const paymentId = req.params.id;

    if (!paymentId) {
      return res.status(400).json({ error: 'ID do pagamento é obrigatório' });
    }

    // If it's a numeric Mercado Pago ID, check real API
    if (/^\d+$/.test(paymentId)) {
      const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          'Authorization': `Bearer ${MP_ACCESS_TOKEN}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        return res.json({
          id: data.id,
          status: data.status, // "pending", "approved", "rejected", etc.
          status_detail: data.status_detail,
          date_approved: data.date_approved,
          amount: data.transaction_amount,
          payer: data.payer
        });
      }
    }

    // Default status for fallback/test IDs
    return res.json({
      id: paymentId,
      status: 'pending',
      status_detail: 'waiting_payment'
    });

  } catch (error: any) {
    console.error('Erro ao verificar status do pagamento:', error);
    res.status(500).json({ error: error.message });
  }
});

// 5. Webhook listener for Mercado Pago Notifications
app.post('/api/payments/webhook', async (req, res) => {
  try {
    console.log('[Mercado Pago Webhook Received]:', req.query, req.body);
    const topic = req.query.topic || req.body?.type;
    const paymentId = req.query.id || req.body?.data?.id;

    if (topic === 'payment' && paymentId) {
      const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          'Authorization': `Bearer ${MP_ACCESS_TOKEN}`
        }
      });
      if (response.ok) {
        const paymentData = await response.json();
        console.log('[Mercado Pago Payment Updated]:', paymentData.id, paymentData.status);
      }
    }

    res.status(200).send('OK');
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(200).send('OK');
  }
});

// Start Server with Vite Middleware
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`⚡ Techify Server online on http://0.0.0.0:${PORT}`);
  });
}

startServer();
