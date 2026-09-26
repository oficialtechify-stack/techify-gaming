import {
  applicationDefault,
  cert,
  getApp,
  initializeApp,
  type App,
  type ServiceAccount,
} from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

const ADMIN_APP_NAME = 'leadspay-server';
export const ADMIN_PROJECT_ID = 'techify-gaming-106fe';

type ServiceAccountJson = {
  project_id?: unknown;
  client_email?: unknown;
  private_key?: unknown;
};

/**
 * Parses only server-side credentials. Never put this value in a VITE_* variable,
 * a frontend bundle, a GitHub file, a log, or a user-facing error message.
 */
export function parseServerServiceAccount(raw: string): ServiceAccount {
  let value: ServiceAccountJson;
  try {
    value = JSON.parse(raw) as ServiceAccountJson;
  } catch {
    throw new Error('A credencial Firebase Admin não está em formato JSON válido.');
  }

  if (!value || typeof value !== 'object' ||
      typeof value.project_id !== 'string' ||
      typeof value.client_email !== 'string' ||
      typeof value.private_key !== 'string' ||
      !value.client_email.endsWith('.gserviceaccount.com') ||
      !value.private_key.includes('-----BEGIN PRIVATE KEY-----')) {
    throw new Error('A credencial Firebase Admin está incompleta.');
  }
  if (value.project_id !== ADMIN_PROJECT_ID) {
    throw new Error('A credencial Firebase Admin pertence a outro projeto.');
  }

  return {
    projectId: value.project_id,
    clientEmail: value.client_email,
    privateKey: value.private_key.replace(/\\n/g, '\n'),
  };
}

export function isServerAdminConfigured(): boolean {
  return Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_APPLICATION_CREDENTIALS);
}

/**
 * This app is privileged and therefore must never be shared with the frontend
 * or used before the HTTP handler has authenticated and authorized its caller.
 */
export function getServerAdminApp(): App {
  if (!isServerAdminConfigured()) {
    throw new Error('A credencial Firebase Admin não foi configurada no servidor.');
  }

  try {
    return getApp(ADMIN_APP_NAME);
  } catch {
    const credential = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
      ? cert(parseServerServiceAccount(process.env.FIREBASE_SERVICE_ACCOUNT_JSON))
      : applicationDefault();
    return initializeApp({ credential, projectId: ADMIN_PROJECT_ID }, ADMIN_APP_NAME);
  }
}

/** Admin SDK reads/writes bypass all Firestore Security Rules. */
export function getServerAdminFirestore(): Firestore {
  return getFirestore(getServerAdminApp());
}
