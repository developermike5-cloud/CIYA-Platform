import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, initializeAuth, browserLocalPersistence, browserSessionPersistence, inMemoryPersistence } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, memoryLocalCache, getFirestore, doc, setDoc, updateDoc, disableNetwork, enableNetwork } from 'firebase/firestore';
import { getDatabase, ref, set, onValue } from 'firebase/database';
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
export function safeGetItem(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(key);
  } catch (e) {
    return null;
  }
}

export function safeSetItem(key: string, val: string) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, val);
  } catch (e) {
    // ignore
  }
}

export function safeRemoveItem(key: string) {
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

// Determine if we should use memory cache (essential for sandboxed iframes where IndexedDB fails asynchronously)
let useMemoryCache = false;
if (typeof window !== 'undefined') {
  const isIframe = window.self !== window.top;
  let hasIndexedDB = false;
  try {
    hasIndexedDB = !!window.indexedDB;
  } catch (e) {
    hasIndexedDB = false;
  }
  if (isIframe || !hasIndexedDB) {
    useMemoryCache = true;
  }
}

// 2. Resilient firestore initialization
if (useMemoryCache) {
  try {
    firestoreDb = initializeFirestore(app, {
      experimentalForceLongPolling: true,
      localCache: memoryLocalCache()
    }, chosenDatabaseId || undefined);
  } catch (err) {
    firestoreDb = getFirestore(app, chosenDatabaseId || undefined);
  }
} else {
  try {
    // Try to initialize with persistent local cache first for high performance and disk-based offline support
    firestoreDb = initializeFirestore(app, {
      experimentalForceLongPolling: true,
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      })
    }, chosenDatabaseId || undefined);
  } catch (initError) {
    try {
      // If it's already initialized or fails, fall back to getFirestore
      firestoreDb = getFirestore(app, chosenDatabaseId || undefined);
    } catch (getDbError) {
      try {
        // Fall back to memory cache with forced long polling if IndexedDB is blocked
        firestoreDb = initializeFirestore(app, {
          experimentalForceLongPolling: true,
          localCache: memoryLocalCache()
        }, chosenDatabaseId || undefined);
      } catch (secondError: any) {
        firestoreDb = getFirestore(app, chosenDatabaseId || undefined);
      }
    }
  }
}
export const db = firestoreDb;

// --- FIRESTORE DISCONNECT / TOGGLE SYSTEM ---
let initialNetworkDisabled = false;
if (typeof window !== 'undefined') {
  try {
    initialNetworkDisabled = window.localStorage.getItem('ciya_db_connection_disabled') === 'true';
  } catch (e) {
    // ignore
  }
}

let dbNetworkEnabled = !initialNetworkDisabled;

// Instantly freeze Firestore network on boot if stored as offline
if (initialNetworkDisabled && firestoreDb) {
  disableNetwork(firestoreDb).catch(err => {
    console.warn("Failed to set initial offline state for Firestore on startup:", err);
  });
}

export async function setFirestoreNetworkState(enabled: boolean) {
  if (enabled === dbNetworkEnabled) return;
  try {
    if (enabled) {
      console.log("Firestore: Activating online cloud synchronizer...");
      if (firestoreDb) {
        await enableNetwork(firestoreDb);
      }
      dbNetworkEnabled = true;
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('firestore-network-status', { detail: { enabled: true } }));
      }
    } else {
      console.log("Firestore: Freezing network. Operating purely on browser cache...");
      if (firestoreDb) {
        await disableNetwork(firestoreDb);
      }
      dbNetworkEnabled = false;
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('firestore-network-status', { detail: { enabled: false } }));
      }
    }
  } catch (err) {
    console.warn("Failed to switch Firestore network state:", err);
  }
}

export function isFirestoreNetworkEnabled(): boolean {
  return dbNetworkEnabled;
}

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

// Set up global synchronization hook via Realtime Database
let isLocalToggleInitiated = false;

if (typeof window !== 'undefined' && rtdbInstance) {
  try {
    const dbToggleRef = ref(rtdbInstance, 'settings/db_connection_disabled');
    onValue(dbToggleRef, (snapshot) => {
      const isDisabled = !!snapshot.val();
      const shouldBeEnabled = !isDisabled;
      const isChange = shouldBeEnabled !== dbNetworkEnabled;
      
      try {
        window.localStorage.setItem('ciya_db_connection_disabled', isDisabled ? 'true' : 'false');
      } catch (e) {
        // ignore
      }

      if (isChange) {
        if (isLocalToggleInitiated) {
          isLocalToggleInitiated = false;
          setFirestoreNetworkState(shouldBeEnabled);
        } else {
          setFirestoreNetworkState(shouldBeEnabled).then(() => {
            if (typeof window !== 'undefined') {
              window.location.reload();
            }
          });
        }
      }
    }, (error) => {
      console.warn("Failed to retrieve db_connection_disabled toggle value from RTDB:", error);
    });
  } catch (err) {
    console.warn("Failed to set up RTDB database sync trigger:", err);
  }
}

export async function setGlobalDbConnectionDisabled(disabled: boolean) {
  isLocalToggleInitiated = true;
  if (rtdbInstance) {
    try {
      await set(ref(rtdbInstance, 'settings/db_connection_disabled'), disabled);
      try {
        window.localStorage.setItem('ciya_db_connection_disabled', disabled ? 'true' : 'false');
      } catch (e) {
        // ignore
      }
      await setFirestoreNetworkState(!disabled);
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    } catch (err) {
      console.error("Failed to push global db_connection_disabled state to RTDB:", err);
    }
  } else {
    try {
      window.localStorage.setItem('ciya_db_connection_disabled', disabled ? 'true' : 'false');
    } catch (e) {
      // ignore
    }
    await setFirestoreNetworkState(!disabled);
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  }
}

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
  let errorMessage = '';
  if (error instanceof Error) {
    errorMessage = error.message;
  } else if (error && typeof error === 'object') {
    errorMessage = (error as any).message || (error as any).hint || JSON.stringify(error);
  } else {
    errorMessage = String(error);
  }

  const errInfo: FirestoreErrorInfo = {
    error: errorMessage,
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

export async function triggerSystemSignal(field: 'courses' | 'settings' | 'blog' | 'assignments' | 'notifications' | 'user_signals', subField?: string) {
  try {
    const signalDocRef = doc(firestoreDb, 'settings', 'system_signals');
    if (field === 'user_signals' && subField) {
      await updateDoc(signalDocRef, {
        [`user_signals.${subField}`]: Date.now()
      });
    } else {
      await updateDoc(signalDocRef, {
        [field]: Date.now()
      });
    }
  } catch (err) {
    console.warn("Failed to update system_signals in Firestore. Initiating create/merge if document is missing.", err);
    try {
      await setDoc(doc(firestoreDb, 'settings', 'system_signals'), {
        [field]: Date.now(),
        ...(field === 'user_signals' && subField ? { user_signals: { [subField]: Date.now() } } : {})
      }, { merge: true });
    } catch (e) {
      console.warn("Could not update system_signals in Firestore (likely permission-restricted in current session):", e);
    }
  }
}


