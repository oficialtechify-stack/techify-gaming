import { getServerAdminFirestore, verifyFirebaseIdentity } from './firebaseAdminServer.js';
import { configuredAdminEmails } from './adminAccess.js';

export type OfficeRole = 'ceo' | 'designer' | 'member';

export type OfficeIdentity = {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  officeRole: OfficeRole;
  isOfficeAdmin: boolean;
  displayName?: string | null;
};

export async function requireOfficeIdentity(
  headers: Record<string, string | string[] | undefined>,
): Promise<OfficeIdentity> {
  const authorization = typeof headers.authorization === 'string' ? headers.authorization : undefined;
  const identity = await verifyFirebaseIdentity(authorization);
  const normalizedEmail = String(identity.email || '').toLowerCase().trim();

  if (normalizedEmail && configuredAdminEmails().has(normalizedEmail)) {
    return {
      ...identity,
      officeRole: 'ceo',
      isOfficeAdmin: true,
      displayName: 'CEO LeadsPay',
    };
  }

  const db = getServerAdminFirestore();
  const memberSnap = await db.collection('admin_office_members').doc(identity.uid).get();
  if (!memberSnap.exists) {
    throw Object.assign(new Error('Sua conta não faz parte do LeadsPay Office.'), { statusCode: 403 });
  }

  const member = memberSnap.data() as Record<string, unknown>;
  if (member.active === false) {
    throw Object.assign(new Error('Seu acesso ao LeadsPay Office está desativado.'), { statusCode: 403 });
  }

  const role = String(member.officeRole || 'member').toLowerCase();
  const officeRole: OfficeRole = role === 'designer' ? 'designer' : role === 'ceo' ? 'ceo' : 'member';

  return {
    ...identity,
    officeRole,
    isOfficeAdmin: false,
    displayName: typeof member.displayName === 'string' ? member.displayName : null,
  };
}

export function assertOfficeAdmin(identity: OfficeIdentity) {
  if (!identity.isOfficeAdmin) {
    throw Object.assign(new Error('Somente o CEO/Admin pode executar esta ação.'), { statusCode: 403 });
  }
}
