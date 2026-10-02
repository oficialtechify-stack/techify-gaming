import { verifyFirebaseIdentity } from './firebaseAdminServer.js';

export const BUILTIN_ADMIN_EMAILS = new Set([
  'rickmarketing81@gmail.com',
  'leadspay.oficial@gmail.com',
]);

export function configuredAdminEmails(): Set<string> {
  const extra = String(process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  return new Set([...BUILTIN_ADMIN_EMAILS, ...extra]);
}

export async function requireAdminIdentity(
  headers: Record<string, string | string[] | undefined>,
) {
  const authorization = typeof headers.authorization === 'string' ? headers.authorization : undefined;
  const identity = await verifyFirebaseIdentity(authorization);
  if (!identity.email || !configuredAdminEmails().has(identity.email.toLowerCase())) {
    throw Object.assign(new Error('Acesso administrativo não autorizado.'), { statusCode: 403 });
  }
  return identity;
}
