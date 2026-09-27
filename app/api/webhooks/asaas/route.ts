const retired = () => Response.json({
  received: false,
  code: 'WEBHOOK_PROVIDER_MIGRATED',
  message: 'Este webhook foi aposentado. Use o webhook Stripe assinado configurado para a LeadsPay.',
}, { status: 410, headers: { 'Cache-Control': 'no-store' } });

export async function POST() { return retired(); }
export async function GET() { return retired(); }
export async function OPTIONS() {
  return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store', 'Allow': 'GET, POST, OPTIONS' } });
}
