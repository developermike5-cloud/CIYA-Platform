import { initializeApp } from 'firebase/app';
import { getAuth, initializeAuth, browserLocalPersistence, browserSessionPersistence, inMemoryPersistence } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, memoryLocalCache, getFirestore } from 'firebase/firestore';
import { getDatabase, ref, set } from 'firebase/database';
import firebaseConfig from '../firebase-applet-config.json';

// Dynamically use the custom Netlify domain if running in production on Netlify,
// otherwise fall back to the default gen-lang Firebase authDomain.
let customAuthDomain = firebaseConfig.authDomain;
if (typeof window !== 'undefined') {
  const hostname = window.location.hostname;
  if (hostname === 'ciyacademy.netlify.app') {
    customAuthDomain = 'ciyacademy.netlify.app';
  } else if (hostname.endsWith('.netlify.app')) {
    customAuthDomain = hostname;
  }
}

const activeFirebaseConfig = {
  ...firebaseConfig,
  authDomain: customAuthDomain
};

const app = initializeApp(activeFirebaseConfig);
let firestoreDb;
try {
  firestoreDb = initializeFirestore(app, {
    experimentalForceLongPolling: true,
    localCache: memoryLocalCache()
  }, firebaseConfig.firestoreDatabaseId);
} catch (error) {
  console.warn("Firestore initializeFirestore with memoryLocalCache failed, falling back to default getFirestore:", error);
  try {
    firestoreDb = getFirestore(app, firebaseConfig.firestoreDatabaseId);
  } catch (secondError) {
    console.error("Firestore safe fallback also failed, initializing default getFirestore:", secondError);
    firestoreDb = getFirestore(app);
  }
}
export const db = firestoreDb;

let authInstance;
try {
  // Use explicit persistence to bypass IDB issues in sandboxed frames
  authInstance = initializeAuth(app, {
    persistence: [browserLocalPersistence, browserSessionPersistence, inMemoryPersistence]
  });
} catch (e) {
  console.warn("initializeAuth failed (usually due to iframe constraints), trying inMemoryPersistence:", e);
  try {
    authInstance = initializeAuth(app, {
      persistence: inMemoryPersistence
    });
  } catch (err2) {
    console.error("Auth inMemoryPersistence fallback failed, using getAuth(app):", err2);
    authInstance = getAuth(app);
  }
}

export const auth = authInstance;

// Initialize Realtime Database for zero-cost high-frequency real-time events,
// such as live settings locks, which prevents wasting Firestore daily read/write quota rules!
let rtdbInstance;
try {
  // Safe regional construction supporting US/EU databases
  const defaultRtdbUrl = `https://${firebaseConfig.projectId}-default-rtdb.firebaseio.com`;
  const isEurope = firebaseConfig.projectId?.includes('europe-west') || firebaseConfig.firestoreDatabaseId?.includes('europe');
  const fallbackUrl = isEurope 
    ? `https://${firebaseConfig.projectId}-default-rtdb.europe-west1.firebasedatabase.app` 
    : defaultRtdbUrl;
  
  const rtdbUrl = (firebaseConfig as any).databaseURL || fallbackUrl;
  rtdbInstance = getDatabase(app, rtdbUrl);
} catch (e) {
  console.warn("Could not construct fallbacks for Realtime Database, using standard initialization", e);
  rtdbInstance = getDatabase(app);
}

export const rtdb = rtdbInstance;

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

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null, shouldThrow = false) {
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
  console.error('Firestore Error: ', JSON.stringify(errInfo));

  // Dispatch a global custom event so pages can show a friendly warning or offer fallbacks
  if (typeof window !== 'undefined') {
    const errorStr = errInfo.error.toLowerCase();
    if (errorStr.includes('quota') || errorStr.includes('limit exceeded') || errorStr.includes('exhausted')) {
      window.dispatchEvent(new CustomEvent('firestore-quota-exceeded', { detail: errInfo }));
    } else {
      window.dispatchEvent(new CustomEvent('firestore-general-error', { detail: errInfo }));
    }
  }

  if (shouldThrow) {
    throw new Error(JSON.stringify(errInfo));
  }
}

