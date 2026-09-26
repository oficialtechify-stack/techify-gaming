import { getAuth, type DecodedIdToken } from 'firebase-admin/auth';
import { getServerAdminApp } from './firebaseAdminServer';

/** Tokens come exclusively from the Authorization header, never from request bodies/URLs. */
export function extractBearerToken(header: string | undefined): string | null {
  const match = header?.trim().match(/^Bearer\s+([^\s]+)$/i);
  return match?.[1] || null;
}

/** Stable UIDs, not editable Firestore role fields or unverified email addresses. */
export function isAdminUid(uid: string, allowlist: string | undefined): boolean {
  if (!uid || !allowlist) return false;
  return allowlist.split(',').map((part) => part.trim()).filter(Boolean).includes(uid);
}

/**
 * Future guard for privileged endpoints. A caller must also pass a route-specific
 * ownership/role check before an Admin SDK write is made.
 */
export async function verifyFirebaseIdentity(header: string | undefined): Promise<DecodedIdToken> {
  const token = extractBearerToken(header);
  if (!token) throw new Error('É necessário entrar na conta para continuar.');
  return getAuth(getServerAdminApp()).verifyIdToken(token, true);
}
