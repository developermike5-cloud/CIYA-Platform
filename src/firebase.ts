import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, initializeAuth, browserLocalPersistence, browserSessionPersistence, inMemoryPersistence } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, memoryLocalCache, getFirestore, doc, setDoc, updateDoc, disableNetwork, enableNetwork } from 'firebase/firestore';
import { getDatabase, ref, set, onValue } from 'firebase/database';
import firebaseConfig from '../firebase-applet-config.json';

// Use the official Firebase-hosted authDomain (which contains the compiled auth handlers).
// Overriding this to a Netlify domain fails because Netlify does not host Firebase's 
// Auth backend files (like /__/auth/handler), which causes the page to load blank or fail.
const activeFirebaseConfig = {
  ...firebaseConfig,
  authDomain: firebaseConfig.authDomain
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

// Simple session-based loader guard to prevent any infinite reload loops
export function safeReload() {
  if (typeof window === 'undefined') return;
  try {
    const reloadCountStr = window.sessionStorage.getItem('ciya_reload_count') || '0';
    const reloadCount = parseInt(reloadCountStr, 10);
    if (reloadCount > 2) {
      console.error("Excessive reload loop prevented (> 2 reloads). Stopping further reloads.");
      return;
    }
    window.sessionStorage.setItem('ciya_reload_count', String(reloadCount + 1));
    // Clear the reload count after 15 seconds of no reloads (normal usage)
    setTimeout(() => {
      try {
        window.sessionStorage.removeItem('ciya_reload_count');
      } catch (e) {}
    }, 15000);
  } catch (e) {
    // If sessionStorage throws (e.g. in sandboxed iframe), use a window property as backup
    const win = window as any;
    win.__ciya_reload_count = (win.__ciya_reload_count || 0) + 1;
    if (win.__ciya_reload_count > 2) {
      console.error("Excessive reload loop prevented (window fallback). Stopping further reloads.");
      return;
    }
  }
  window.location.reload();
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
try {
  // Use persistent local cache if not in a restricted iframe environment
  firestoreDb = initializeFirestore(app, {
    experimentalForceLongPolling: true,
    localCache: useMemoryCache 
      ? memoryLocalCache() 
      : persistentLocalCache({
          tabManager: persistentMultipleTabManager()
        })
  }, chosenDatabaseId || undefined);
} catch (initError) {
  // If already initialized or fails, fall back to basic getFirestore
  firestoreDb = getFirestore(app, chosenDatabaseId || undefined);
}
export const db = firestoreDb;

// --- FIRESTORE DISCONNECT / TOGGLE SYSTEM ---
let initialNetworkDisabled = false;
if (typeof window !== 'undefined') {
  initialNetworkDisabled = safeGetItem('ciya_db_connection_disabled') === 'true';
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
    } else {
      console.log("Firestore: Freezing network. Operating purely on browser cache...");
      if (firestoreDb) {
        await disableNetwork(firestoreDb);
      }
      dbNetworkEnabled = false;
    }
    
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('firestore-network-status', { detail: { enabled } }));
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
    safeReload();
  }
}

// 3. Resilient Auth initialization
let authInstance;
try {
  authInstance = getAuth(app);
} catch (e: any) {
  authInstance = initializeAuth(app, {
    persistence: [browserLocalPersistence, browserSessionPersistence, inMemoryPersistence]
  });
}

export const auth = authInstance;

// Initialize Realtime Database
let rtdbInstance;
try {
  const rtdbUrl = (firebaseConfig as any).databaseURL;
  rtdbInstance = rtdbUrl ? getDatabase(app, rtdbUrl) : getDatabase(app);
  
  if (typeof window !== 'undefined') {
    const connectedRef = ref(rtdbInstance, '.info/connected');
    onValue(connectedRef, (snap) => {
      const isConnected = !!snap.val();
      console.log(`[RTDB] connected: ${isConnected}`);
    });
  }
} catch (e) {
  console.warn("Could not initialize Realtime Database", e);
  rtdbInstance = getDatabase(app);
}

export const rtdb = rtdbInstance;

// Note: Global synchronization hook via Firestore moved to App.tsx to avoid initialization races

let isLocalToggleInitiated = false;

export async function setGlobalDbConnectionDisabled(disabled: boolean) {
  isLocalToggleInitiated = true;
  
  // Always update local storage first to guarantee local offline simulation works
  safeSetItem('ciya_db_connection_disabled', disabled ? 'true' : 'false');

  // Attempt to synchronize globally via Firestore
  if (firestoreDb) {
    try {
      const signalDocRef = doc(firestoreDb, 'settings', 'system_signals');
      await setDoc(signalDocRef, { db_connection_disabled: disabled }, { merge: true });
    } catch (err) {
      console.warn("Failed to push global db_connection_disabled state to Firestore (falling back to local-only toggle):", err);
    }
  }

  // Always apply local Firestore network state to make the change immediate for the user
  try {
    await setFirestoreNetworkState(!disabled);
  } catch (err) {
    console.warn("Failed to set Firestore network state:", err);
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
  if (
    errorStrLower.includes('offline') || 
    errorStrLower.includes('unavailable') || 
    errorStrLower.includes('fetching auth token failed') || 
    errorStrLower.includes('network-request-failed') || 
    !navigator.onLine
  ) {
    console.warn('Firestore Error (offline/unavailable/network): ', JSON.stringify(errInfo));
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
        safeReload();
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
          safeReload();
        }, 500);
      }
    }
  };

  window.addEventListener('error', (event) => {
    const msg = event.message || (event.error && event.error.message) || '';
    const lowerMsg = msg.toLowerCase();
    if (
      lowerMsg.includes('network-request-failed') ||
      lowerMsg.includes('fetching auth token failed') ||
      lowerMsg.includes('could not reach cloud firestore backend')
    ) {
      console.warn("Soft handling global network/auth notice:", msg);
      event.preventDefault();
      return;
    }
    handleDatabaseError(msg);
  });

  window.addEventListener('unhandledrejection', (event) => {
    const msg = event.reason?.message || String(event.reason || '');
    const lowerMsg = msg.toLowerCase();
    if (
      lowerMsg.includes('network-request-failed') ||
      lowerMsg.includes('fetching auth token failed') ||
      lowerMsg.includes('could not reach cloud firestore backend')
    ) {
      console.warn("Soft handling unhandled rejection for network/auth notice:", msg);
      event.preventDefault();
      return;
    }
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


