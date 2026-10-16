import { verifyFirebaseIdentity } from './firebaseAdminServer.js';

export const LEADSPAY_GLOBAL_ADMIN_EMAIL = 'leadspay.oficial@gmail.com';

export const BUILTIN_ADMIN_EMAILS = new Set([
  LEADSPAY_GLOBAL_ADMIN_EMAIL,
]);

export function configuredAdminEmails(): Set<string> {
  // A administração global da LeadsPay é intencionalmente vinculada a uma
  // única identidade. Variáveis de ambiente não podem promover outras contas.
  return new Set(BUILTIN_ADMIN_EMAILS);
}

export async function requireAdminIdentity(
  headers: Record<string, string | string[] | undefined>,
) {
  const authorization = typeof headers.authorization === 'string' ? headers.authorization : undefined;
  const identity = await verifyFirebaseIdentity(authorization);
  if (
    !identity.email ||
    identity.emailVerified !== true ||
    !configuredAdminEmails().has(identity.email.toLowerCase())
  ) {
    throw Object.assign(new Error('Acesso administrativo não autorizado.'), { statusCode: 403 });
  }
  return identity;
}
