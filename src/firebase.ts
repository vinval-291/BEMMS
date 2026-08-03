import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Reuse the default app if it is already initialized. Without this a hot reload
// re-runs this module and Firebase throws "app/duplicate-app".
export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Connect to the project's "(default)" Firestore database unless a named database is
// supplied via VITE_FIRESTORE_DATABASE_ID. Pointing at a database that has not been
// provisioned makes every read and write fail with NOT_FOUND, so the default is used
// here rather than a hardcoded ID.
const namedDatabaseId = import.meta.env.VITE_FIRESTORE_DATABASE_ID;

export const db = namedDatabaseId ? getFirestore(app, namedDatabaseId) : getFirestore(app);
export const auth = getAuth(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  // The full diagnostic payload goes to the console; the thrown error carries a
  // message that is safe to show in the UI, since callers surface it directly.
  console.error('Firestore Error: ', JSON.stringify(errInfo));

  const code = (error as { code?: string })?.code;
  const readable =
    code === 'permission-denied'
      ? `You do not have permission to ${operationType} ${path ?? 'this record'}.`
      : errInfo.error || `Firestore ${operationType} on ${path ?? 'unknown path'} failed.`;

  throw new Error(readable);
}
