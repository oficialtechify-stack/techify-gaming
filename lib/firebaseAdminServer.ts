import { cert, getApp, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

export const ADMIN_PROJECT_ID = 'techify-gaming-106fe';

export function parseServerServiceAccount(raw: string): { projectId: string; clientEmail: string; privateKey: string } {
  let credential: Record<string, unknown>;
  try {
    credential = JSON.parse(raw);
  } catch {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON precisa conter JSON válido.');
  }
  if (credential.project_id !== ADMIN_PROJECT_ID) throw new Error('Credencial Firebase Admin de outro projeto.');
  if (typeof credential.client_email !== 'string' || typeof credential.private_key !== 'string') {
    throw new Error('Credencial Firebase Admin incompleta.');
  }
  return {
    projectId: ADMIN_PROJECT_ID,
    clientEmail: credential.client_email,
    privateKey: credential.private_key.replace(/\\n/g, '\n'),
  };
}

function loadAdminApp(): App {
  const existing = getApps().find((app) => app.name === 'leadspay-server');
  if (existing) return existing;

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  const projectId = process.env.FIREBASE_PROJECT_ID?.trim() || ADMIN_PROJECT_ID;

  if (!raw) {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT_JSON não está configurado neste ambiente da Vercel. ' +
      'Adicione a variável também em Production e faça um novo deploy.'
    );
  }

  const parsed = parseServerServiceAccount(raw);
  return initializeApp({
    credential: cert({
      projectId: parsed.projectId,
      clientEmail: parsed.clientEmail,
      privateKey: parsed.privateKey,
    }),
    projectId: parsed.projectId,
  }, 'leadspay-server');
}

export function getServerAdminApp(): App {
  return loadAdminApp();
}

export function getServerAdminFirestore() {
  return getFirestore(loadAdminApp());
}

export async function verifyFirebaseIdentity(
  authorization?: string,
  options: { requireVerifiedEmail?: boolean } = {},
) {
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  if (!match) throw new Error('Firebase ID token ausente.');

  const decoded = await getAuth(loadAdminApp()).verifyIdToken(match[1], true);
  if (!decoded.uid) throw new Error('Firebase ID token inválido.');

  const emailVerified = decoded.email_verified === true;
  if (options.requireVerifiedEmail && decoded.email && !emailVerified) {
    const error = new Error('E-mail ainda não verificado.');
    (error as any).code = 'EMAIL_NOT_VERIFIED';
    throw error;
  }

  return {
    uid: decoded.uid,
    email: decoded.email || null,
    emailVerified,
  };
}
