import { requireOfficeIdentity } from '../../lib/officeAccess.js';

type Req = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
};

type Res = {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => Res;
  json: (body: unknown) => void;
};

export default async function handler(req: Req, res: Res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  try {
    const identity = await requireOfficeIdentity(req.headers);
    return res.status(200).json({
      success: true,
      access: {
        uid: identity.uid,
        email: identity.email,
        displayName: identity.displayName || null,
        officeRole: identity.officeRole,
        isOfficeAdmin: identity.isOfficeAdmin,
      },
    });
  } catch (error: any) {
    const status = Number(error?.statusCode || 503);
    return res.status(status).json({
      error: error instanceof Error ? error.message : 'Não foi possível validar o acesso ao LeadsPay Office.',
    });
  }
}
