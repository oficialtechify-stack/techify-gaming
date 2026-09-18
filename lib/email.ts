import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

let cachedTransporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!cachedTransporter) {
    cachedTransporter = nodemailer.createTransport({
      host: process.env.EMAIL_SERVER_HOST || 'smtp.mailtrap.io',
      port: Number(process.env.EMAIL_SERVER_PORT) || 587,
      auth: {
        user: process.env.EMAIL_SERVER_USER || '',
        pass: process.env.EMAIL_SERVER_PASSWORD || '',
      },
    });
  }
  return cachedTransporter;
}

export async function sendFulfillmentEmail({
  to,
  customerName,
  planName,
  accessUrl,
  deliveryType,
  instructions,
}: {
  to: string;
  customerName: string;
  planName: string;
  accessUrl?: string;
  deliveryType: string;
  instructions?: string;
}) {
  const emailFrom = process.env.EMAIL_FROM || 'entrega@leadspay.com';

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; background-color: #090A0F; color: #ffffff; padding: 40px 20px; border-radius: 8px;">
      <div style="max-width: 500px; margin: 0 auto; background-color: #12141D; padding: 30px; border-radius: 12px; border: 1px solid #27272A;">
        <div style="text-align: center; margin-bottom: 20px;">
          <span style="display: inline-block; padding: 6px 14px; background: rgba(132, 204, 22, 0.15); border: 1px solid rgba(132, 204, 22, 0.3); border-radius: 20px; color: #84CC16; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">
            LeadsPay • Acesso Imediato
          </span>
        </div>

        <h2 style="color: #84CC16; margin-top: 0; text-align: center;">Pagamento Confirmado! 🎉</h2>
        <p style="font-size: 16px; color: #E4E4E7; margin-top: 20px;">Olá, <strong>${customerName}</strong>!</p>
        <p style="color: #A1A1AA; font-size: 14px; line-height: 1.5;">
          Seu pagamento para o plano <strong>${planName}</strong> foi aprovado com sucesso.
        </p>

        ${instructions ? `
          <div style="background-color: #18181B; padding: 15px; border-radius: 8px; border-left: 4px solid #84CC16; margin: 20px 0;">
            <p style="margin: 0; font-size: 13px; color: #D4D4D8;"><strong>Instruções de Acesso:</strong></p>
            <p style="margin: 5px 0 0 0; font-size: 14px; color: #A1A1AA; white-space: pre-line;">${instructions}</p>
          </div>
        ` : ''}

        ${accessUrl ? `
          <div style="text-align: center; margin: 30px 0;">
            <a href="${accessUrl}" style="background-color: #84CC16; color: #000000; font-weight: bold; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; box-shadow: 0 4px 15px rgba(132, 204, 22, 0.3);">
              Acessar Produto / Liberar Acesso
            </a>
          </div>
        ` : ''}

        <div style="background: rgba(255,255,255,0.03); border: 1px solid #27272A; border-radius: 8px; padding: 12px; margin-top: 20px; font-size: 12px; color: #71717A;">
          <p style="margin: 0;"><strong>Método de Entrega:</strong> ${
            deliveryType === 'redirect' ? 'Redirecionamento Direto / Site' :
            deliveryType === 'whatsapp' ? 'Grupo VIP / Suporte WhatsApp' :
            deliveryType === 'membership' ? 'Área de Membros / App' :
            deliveryType === 'download' ? 'Download de Arquivo / Guia' :
            deliveryType === 'api_key' ? 'Chave de API / Token' :
            deliveryType === 'webhook' ? 'Integração Webhook do Sistema' : 'Entrega Digital'
          }</p>
        </div>

        <hr style="border: 0; border-top: 1px solid #27272A; margin: 30px 0;" />
        <p style="font-size: 12px; color: #71717A; text-align: center; margin: 0;">
          Se tiver qualquer dúvida, responda a este e-mail ou entre em contato com nosso suporte.
        </p>
      </div>
    </div>
  `;

  // Check if SMTP is configured
  const hasSmtp = Boolean(process.env.EMAIL_SERVER_HOST && process.env.EMAIL_SERVER_USER);

  if (hasSmtp) {
    try {
      const transporter = getTransporter();
      const info = await transporter.sendMail({
        from: `"LeadsPay Entrega" <${emailFrom}>`,
        to,
        subject: `Seu acesso ao ${planName} está liberado!`,
        html: htmlContent,
      });
      console.log(`[Email Fulfillment] E-mail enviado com sucesso para ${to} (MessageID: ${info.messageId})`);
      return { success: true, messageId: info.messageId };
    } catch (err: any) {
      console.error('[Email Fulfillment Error] Falha ao enviar via SMTP:', err);
      return { success: false, error: err?.message || err };
    }
  } else {
    // When in sandbox or without SMTP credentials configured in .env, simulate and log gracefully
    console.log(`[Email Fulfillment Simulated] E-mail de entrega gerado para ${to} [${planName}]:`);
    console.log(`-> Destinatário: ${to}`);
    console.log(`-> Produto: ${planName}`);
    console.log(`-> Acesso: ${accessUrl || 'Nenhum link direto'}`);
    console.log(`-> Instruções: ${instructions || 'Nenhuma instrução'}`);
    return { success: true, simulated: true };
  }
}
