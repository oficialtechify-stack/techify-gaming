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

export async function sendBillingEmail({
  to,
  customerName,
  planName,
  amount,
  paymentUrl,
  dueDate,
  companyName = 'LeadsPay',
  pixCopyPaste,
  description
}: {
  to: string;
  customerName: string;
  planName: string;
  amount: number;
  paymentUrl?: string;
  dueDate?: string;
  companyName?: string;
  pixCopyPaste?: string;
  description?: string;
}) {
  const emailFrom = process.env.EMAIL_FROM || 'cobranca@leadspay.com';
  const formattedAmount = `R$ ${Number(amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  const htmlContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #060A15; color: #ffffff; padding: 40px 16px;">
      <div style="max-width: 520px; margin: 0 auto; background-color: #0B1120; padding: 32px 24px; border-radius: 16px; border: 1px solid #1E293B; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
        <div style="text-align: center; margin-bottom: 24px;">
          <span style="display: inline-block; padding: 6px 14px; background: rgba(217, 242, 42, 0.12); border: 1px solid rgba(217, 242, 42, 0.3); border-radius: 999px; color: #D9F22A; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">
            ${companyName} • Notificação de Cobrança
          </span>
        </div>

        <h2 style="color: #ffffff; margin-top: 0; text-align: center; font-size: 22px; font-weight: 800;">
          Nova Cobrança Emitida
        </h2>
        <p style="font-size: 15px; color: #E2E8F0; margin-top: 16px; text-align: center;">
          Olá, <strong>${customerName}</strong>! Seguem os detalhes da sua fatura pendente.
        </p>

        <div style="background-color: #10192C; padding: 20px; border-radius: 12px; border: 1px solid #1E293B; margin: 24px 0;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 12px; border-bottom: 1px solid #1E293B; padding-bottom: 10px;">
            <span style="font-size: 13px; color: #94A3B8;">Plano / Produto:</span>
            <strong style="font-size: 13px; color: #ffffff;">${planName}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 12px; border-bottom: 1px solid #1E293B; padding-bottom: 10px;">
            <span style="font-size: 13px; color: #94A3B8;">Valor Total:</span>
            <strong style="font-size: 16px; color: #10B981;">${formattedAmount}</strong>
          </div>
          ${dueDate ? `
          <div style="display: flex; justify-content: space-between; margin-bottom: 12px; border-bottom: 1px solid #1E293B; padding-bottom: 10px;">
            <span style="font-size: 13px; color: #94A3B8;">Vencimento:</span>
            <strong style="font-size: 13px; color: #F59E0B;">${dueDate}</strong>
          </div>
          ` : ''}
          ${description ? `
          <div style="margin-top: 8px;">
            <span style="font-size: 12px; color: #94A3B8; display: block; margin-bottom: 4px;">Observações:</span>
            <p style="margin: 0; font-size: 13px; color: #CBD5E1;">${description}</p>
          </div>
          ` : ''}
        </div>

        ${paymentUrl ? `
          <div style="text-align: center; margin: 28px 0;">
            <a href="${paymentUrl}" style="background-color: #D9F22A; color: #060A15; font-weight: 800; font-size: 14px; padding: 14px 28px; text-decoration: none; border-radius: 10px; display: inline-block; box-shadow: 0 4px 20px rgba(217, 242, 42, 0.25);">
              Efetuar Pagamento Agora
            </a>
          </div>
        ` : ''}

        ${pixCopyPaste ? `
          <div style="background: rgba(255,255,255,0.03); border: 1px dashed #334155; border-radius: 8px; padding: 12px; margin: 16px 0; font-size: 12px; color: #CBD5E1; word-break: break-all;">
            <strong style="color: #D9F22A; display: block; margin-bottom: 4px;">Código Copia e Cola PIX:</strong>
            <code>${pixCopyPaste}</code>
          </div>
        ` : ''}

        <hr style="border: 0; border-top: 1px solid #1E293B; margin: 24px 0;" />
        <p style="font-size: 12px; color: #64748B; text-align: center; margin: 0;">
          Cobrança gerada com segurança através do ecossistema ${companyName}.
        </p>
      </div>
    </div>
  `;

  const hasSmtp = Boolean(process.env.EMAIL_SERVER_HOST && process.env.EMAIL_SERVER_USER);

  if (hasSmtp) {
    try {
      const transporter = getTransporter();
      const info = await transporter.sendMail({
        from: `"${companyName}" <${emailFrom}>`,
        to,
        subject: `Fatura / Cobrança: ${planName} - ${formattedAmount}`,
        html: htmlContent,
      });
      console.log(`[Email Cobranca] E-mail enviado com sucesso para ${to} (MessageID: ${info.messageId})`);
      return { success: true, messageId: info.messageId };
    } catch (err: any) {
      console.error('[Email Cobranca Error] Falha ao enviar via SMTP:', err);
      return { success: false, error: err?.message || err };
    }
  } else {
    console.log(`[Email Cobranca Simulated] E-mail de cobrança gerado para ${to} [${planName} - ${formattedAmount}]:`);
    console.log(`-> Destinatário: ${to}`);
    console.log(`-> Valor: ${formattedAmount}`);
    console.log(`-> Link: ${paymentUrl || 'Sem link'}`);
    return { success: true, simulated: true };
  }
}

export async function sendRemarketingEmail({
  to,
  customerName,
  planName,
  couponCode,
  discountText = '10% de desconto',
  checkoutUrl,
  companyName = 'LeadsPay'
}: {
  to: string;
  customerName: string;
  planName: string;
  couponCode: string;
  discountText?: string;
  checkoutUrl: string;
  companyName?: string;
}) {
  const emailFrom = process.env.EMAIL_FROM || 'oferta@leadspay.com';

  const htmlContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #060A15; color: #ffffff; padding: 40px 16px;">
      <div style="max-width: 520px; margin: 0 auto; background-color: #0B1120; padding: 32px 24px; border-radius: 16px; border: 1px solid #1E293B; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
        <div style="text-align: center; margin-bottom: 20px;">
          <span style="display: inline-block; padding: 6px 14px; background: rgba(217, 242, 42, 0.15); border: 1px solid rgba(217, 242, 42, 0.3); border-radius: 999px; color: #D9F22A; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">
            Oferta Especial • ${companyName}
          </span>
        </div>

        <h2 style="color: #ffffff; margin-top: 0; text-align: center; font-size: 22px; font-weight: 800;">
          Você deixou algo especial para trás! 🎁
        </h2>
        <p style="font-size: 15px; color: #E2E8F0; margin-top: 16px; text-align: center; line-height: 1.5;">
          Olá, <strong>${customerName}</strong>! Vimos que você estava quase garantindo seu acesso ao <strong>${planName}</strong>.
        </p>

        <div style="background: linear-gradient(135deg, rgba(217,242,42,0.1), rgba(16,185,129,0.1)); border: 1px solid rgba(217, 242, 42, 0.3); padding: 24px; border-radius: 12px; margin: 24px 0; text-align: center;">
          <p style="margin: 0 0 8px 0; font-size: 13px; color: #94A3B8; font-weight: 600;">USE O CUPOM EXCLUSIVO:</p>
          <div style="display: inline-block; background: #060A15; border: 2px dashed #D9F22A; padding: 10px 24px; border-radius: 8px; font-size: 20px; font-weight: 900; color: #D9F22A; letter-spacing: 2px;">
            ${couponCode}
          </div>
          <p style="margin: 10px 0 0 0; font-size: 13px; color: #10B981; font-weight: 700;">
            Ganhe ${discountText} imediatamente na finalização da sua compra!
          </p>
        </div>

        <div style="text-align: center; margin: 28px 0;">
          <a href="${checkoutUrl}" style="background-color: #D9F22A; color: #060A15; font-weight: 800; font-size: 15px; padding: 16px 32px; text-decoration: none; border-radius: 10px; display: inline-block; box-shadow: 0 4px 25px rgba(217, 242, 42, 0.3);">
            Concluir Meu Pedido com Desconto
          </a>
        </div>

        <hr style="border: 0; border-top: 1px solid #1E293B; margin: 24px 0;" />
        <p style="font-size: 12px; color: #64748B; text-align: center; margin: 0;">
          Essa oferta é exclusiva e por tempo limitado para seu e-mail (${to}).
        </p>
      </div>
    </div>
  `;

  const hasSmtp = Boolean(process.env.EMAIL_SERVER_HOST && process.env.EMAIL_SERVER_USER);

  if (hasSmtp) {
    try {
      const transporter = getTransporter();
      const info = await transporter.sendMail({
        from: `"${companyName}" <${emailFrom}>`,
        to,
        subject: `${customerName}, seu cupom exclusivo de desconto para ${planName} chegou!`,
        html: htmlContent,
      });
      console.log(`[Email Remarketing] E-mail enviado com sucesso para ${to} (MessageID: ${info.messageId})`);
      return { success: true, messageId: info.messageId };
    } catch (err: any) {
      console.error('[Email Remarketing Error] Falha ao enviar via SMTP:', err);
      return { success: false, error: err?.message || err };
    }
  } else {
    console.log(`[Email Remarketing Simulated] E-mail enviado para ${to} [Cupom: ${couponCode}]:`);
    console.log(`-> Destinatário: ${to}`);
    console.log(`-> Cupom: ${couponCode} (${discountText})`);
    console.log(`-> Link Checkout: ${checkoutUrl}`);
    return { success: true, simulated: true };
  }
}
