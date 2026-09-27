const retired = () => Response.json({
  error: true,
  code: 'PAYMENT_PROVIDER_MIGRATED',
  message: 'Este endpoint foi aposentado. A LeadsPay usa exclusivamente as funções Stripe em /api/stripe.',
}, { status: 410, headers: { 'Cache-Control': 'no-store' } });

export async function POST() { return retired(); }
export async function GET() { return retired(); }
export async function OPTIONS() {
  return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store', 'Allow': 'GET, POST, OPTIONS' } });
}
