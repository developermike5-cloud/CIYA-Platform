import { initializeApp, getApps, getApp } from 'firebase/app';
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

// Safe localStorage wrapper to prevent crash in sandboxed iframes
function safeGetItem(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(key);
  } catch (e) {
    return null;
  }
}

function safeSetItem(key: string, val: string) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, val);
  } catch (e) {
    // ignore
  }
}

function safeRemoveItem(key: string) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(key);
  } catch (e) {
    // ignore
  }
}

// Always use the correct, custom provisioned database ID from the configuration.
// Do not allow switching to '(default)' since the default database does not exist on this project.
const chosenDatabaseId = firebaseConfig.firestoreDatabaseId;

// Instantly force overwrite of any old localStorage database selection values
safeSetItem('ciya_active_database_id', firebaseConfig.firestoreDatabaseId);

// 1. Resilient app initialization (never crash on duplicate app initialization due to hot reloads)
const app = getApps().length > 0 ? getApp() : initializeApp(activeFirebaseConfig);
let firestoreDb;

// 2. Resilient firestore initialization
try {
  // If it's already been initialized, we shouldn't re-initialize it
  firestoreDb = getFirestore(app, chosenDatabaseId || undefined);
} catch (getDbError) {
  try {
    // Try to initialize with persistent local cache for high performance and disk-based offline support
    firestoreDb = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      })
    }, chosenDatabaseId || undefined);
  } catch (error: any) {
    if (error && error.code === 'failed-precondition') {
      // Multiple tabs open, fallback to standard getFirestore
      console.warn("Firestore persistentLocalCache failed-precondition (multiple tabs active):", error);
      firestoreDb = getFirestore(app, chosenDatabaseId || undefined);
    } else {
      console.warn("Firestore persistentLocalCache failed (usually due to iframe constraints), falling back to memoryLocalCache + long polling:", error);
      try {
        // Fall back to memory cache with forced long polling if IndexedDB is blocked
        firestoreDb = initializeFirestore(app, {
          experimentalForceLongPolling: true,
          localCache: memoryLocalCache()
        }, chosenDatabaseId || undefined);
      } catch (secondError: any) {
        if (secondError && secondError.code === 'failed-precondition') {
          firestoreDb = getFirestore(app, chosenDatabaseId || undefined);
        } else {
          console.error("Firestore memory cache fallback also failed, using default getFirestore:", secondError);
          firestoreDb = getFirestore(app, chosenDatabaseId || undefined);
        }
      }
    }
  }
}
export const db = firestoreDb;

export function getActiveDatabaseId(): string {
  return firebaseConfig.firestoreDatabaseId || 'ai-studio-1aaee609-a922-43e7-9568-0b675490ff78';
}

export function setActiveDatabaseId(dbId: string) {
  if (typeof window !== 'undefined') {
    safeSetItem('ciya_active_database_id', firebaseConfig.firestoreDatabaseId);
    // Clear admin list cache
    safeRemoveItem('ciya_admin_cached_users_list');
    safeRemoveItem('ciya_admin_cached_users_time');
    safeRemoveItem('ciya_admin_cached_admins_list');
    safeRemoveItem('ciya_admin_cached_admins_data');
    window.location.reload();
  }
}

// 3. Resilient Auth initialization (avoid already-initialized errors and gracefully fall back under sandboxed limitations)
let authInstance;
try {
  // Try to retrieve existing auth instance first to prevent "already-initialized" errors on reload
  authInstance = getAuth(app);
} catch (getAuthErr) {
  try {
    // Try to initialize with custom multi-persistence config
    authInstance = initializeAuth(app, {
      persistence: [browserLocalPersistence, browserSessionPersistence, inMemoryPersistence]
    });
  } catch (e: any) {
    if (e && e.code === 'auth/already-initialized') {
      authInstance = getAuth(app);
    } else {
      console.warn("initializeAuth standard persistence failed (usually iframe constraints), falling back to inMemoryPersistence:", e);
      try {
        authInstance = initializeAuth(app, {
          persistence: inMemoryPersistence
        });
      } catch (err2: any) {
        if (err2 && err2.code === 'auth/already-initialized') {
          authInstance = getAuth(app);
        } else {
          console.error("Auth inMemoryPersistence fallback failed, using getAuth(app):", err2);
          authInstance = getAuth(app);
        }
      }
    }
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
  const errorStrLower = errInfo.error.toLowerCase();
  if (errorStrLower.includes('offline') || errorStrLower.includes('unavailable') || !navigator.onLine) {
    console.warn('Firestore Error (offline/unavailable): ', JSON.stringify(errInfo));
  } else {
    console.error('Firestore Error: ', JSON.stringify(errInfo));
  }

  // Dispatch a global custom event so pages can show a friendly warning or offer fallbacks
  if (typeof window !== 'undefined') {
    const errorStr = errInfo.error.toLowerCase();
    
    // Auto-heal if database not found or offline/unavailable due to database mismatch
    const currentDb = safeGetItem('ciya_active_database_id');
    const targetDb = firebaseConfig.firestoreDatabaseId;
    if (currentDb && currentDb !== targetDb && (
      errorStr.includes('database') || 
      errorStr.includes('offline') || 
      errorStr.includes('unavailable') || 
      errorStr.includes('not found') || 
      errorStr.includes('permission')
    )) {
      console.warn(`Auto-healing: Firestore error on custom database choice. Reverting from "${currentDb}" to "${targetDb}"`);
      safeSetItem('ciya_active_database_id', targetDb);
      setTimeout(() => {
        window.location.reload();
      }, 500);
      return;
    }

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

// Global unhandled error capturing for auto-healing Firestore database mismatch
if (typeof window !== 'undefined') {
  const handleDatabaseError = (msg: string) => {
    const lowerMsg = msg.toLowerCase();
    if (
      (lowerMsg.includes('database') && lowerMsg.includes('not found')) ||
      lowerMsg.includes('client is offline') ||
      lowerMsg.includes('offline') ||
      lowerMsg.includes('unavailable')
    ) {
      const currentDb = safeGetItem('ciya_active_database_id');
      const targetDb = firebaseConfig.firestoreDatabaseId;
      if (currentDb && currentDb !== targetDb) {
        console.warn(`Auto-healing from unhandled error: Database issue. Reverting database from "${currentDb}" to "${targetDb}"`);
        safeSetItem('ciya_active_database_id', targetDb);
        setTimeout(() => {
          window.location.reload();
        }, 500);
      }
    }
  };

  window.addEventListener('error', (event) => {
    const msg = event.message || (event.error && event.error.message) || '';
    handleDatabaseError(msg);
  });

  window.addEventListener('unhandledrejection', (event) => {
    const msg = event.reason?.message || String(event.reason || '');
    handleDatabaseError(msg);
  });
}

