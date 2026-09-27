export default function handler(_req: any, res: any) {
  return res.status(410).json({
    received: false,
    error: true,
    code: 'WEBHOOK_PROVIDER_MIGRATED',
    message: 'Webhook legado aposentado. A confirmação de pagamentos é feita pelo webhook Stripe assinado.',
  });
}
