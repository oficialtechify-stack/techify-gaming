export default function handler(_req: any, res: any) {
  return res.status(410).json({
    error: true,
    code: 'PAYMENT_PROVIDER_MIGRATED',
    message: 'Consulta de pagamento legada aposentada. O status Stripe é verificado pelo endpoint de confirmação da LeadsPay.',
  });
}
