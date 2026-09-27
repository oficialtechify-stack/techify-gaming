export default function handler(_req: any, res: any) {
  return res.status(410).json({
    error: true,
    code: 'PAYMENT_PROVIDER_MIGRATED',
    message: 'Endpoint aposentado. Use o checkout Stripe da LeadsPay.',
  });
}
