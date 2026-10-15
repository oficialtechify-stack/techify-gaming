type Req = { method?: string };
type Res = { setHeader(name: string, value: string): void; status(code: number): Res; json(body: unknown): unknown };

// Cadastro de afiliados temporariamente pausado. Os perfis existentes não são alterados.
export default async function handler(req: Req, res: Res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });
  return res.status(403).json({
    error: 'Novos cadastros de afiliados estão temporariamente indisponíveis.',
    code: 'AFFILIATE_SIGNUP_PAUSED',
  });
}
