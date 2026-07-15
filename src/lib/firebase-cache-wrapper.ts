import { 
  collection as realCollection,
  query as realQuery,
  orderBy as realOrderBy,
  limit as realLimit,
  where as realWhere,
  doc as realDoc,
  getDoc as realGetDoc,
  getDocs as realGetDocs,
  onSnapshot as realOnSnapshot,
  updateDoc as realUpdateDoc,
  setDoc as realSetDoc,
  addDoc as realAddDoc,
  deleteDoc as realDeleteDoc,
  writeBatch as realWriteBatch,
  serverTimestamp as realServerTimestamp,
  initializeFirestore as realInitializeFirestore,
  persistentLocalCache as realPersistentLocalCache,
  persistentMultipleTabManager as realPersistentMultipleTabManager,
  memoryLocalCache as realMemoryLocalCache,
  getFirestore as realGetFirestore,
  disableNetwork as realDisableNetwork,
  enableNetwork as realEnableNetwork,
} from '@firebase/firestore';

import { safeStorage } from '../utils/safeStorage';
import { coursesStore } from '../utils/coursesStore';
import { getAuth } from 'firebase/auth';
import staticCourses from '../data/courses.json';
import staticBlog from '../data/blog.json';
import staticFullPrompts from '../data/full_prompts.json';
import staticModularPrompts from '../data/modular_prompts.json';

// Get current logged-in user's UID to prevent administrative cache contamination
function getCurrentUserUid(): string | null {
  try {
    const auth = getAuth();
    return auth.currentUser?.uid || null;
  } catch (e) {
    return null;
  }
}

// Re-export standard helpers unmodified
export const collection = realCollection;
export const query = realQuery;
export const orderBy = realOrderBy;
export const limit = realLimit;
export const where = realWhere;
export const doc = realDoc;
export const serverTimestamp = realServerTimestamp;
export const initializeFirestore = realInitializeFirestore;
export const persistentLocalCache = realPersistentLocalCache;
export const persistentMultipleTabManager = realPersistentMultipleTabManager;
export const memoryLocalCache = realMemoryLocalCache;
export const getFirestore = realGetFirestore;
export const writeBatch = realWriteBatch;
export const disableNetwork = realDisableNetwork;
export const enableNetwork = realEnableNetwork;

// 6 Hours in milliseconds
const CACHE_EXPIRATION_MS = 6 * 60 * 60 * 1000;

export function isNetworkDisabled(): boolean {
  if (typeof window !== 'undefined') {
    try {
      return window.localStorage.getItem('ciya_db_connection_disabled') === 'true';
    } catch (e) {
      // ignore
    }
  }
  return false;
}

// Critical paths that require live, real-time responses and bypass cache completely
function isBypassCachePath(path: string): boolean {
  if (!path) return false;
  // Always bypass cache for settings/app, settings/system_signals, and all user profile paths
  if (path === 'settings/app' || path === 'settings/system_signals') {
    return true;
  }
  if (path.startsWith('users/')) {
    return true;
  }
  return false;
}

// Re-export custom Snapshot structures to act as the standard ones
export class CachedDocumentSnapshot {
  id: string;
  _exists: boolean;
  _data: any;
  ref: any;

  constructor(id: string, exists: boolean, data: any, ref?: any) {
    this.id = id;
    this._exists = exists;
    this._data = data;
    this.ref = ref;
  }

  exists(): boolean {
    return this._exists;
  }

  data(): any {
    return this._data;
  }
}

export class CachedQuerySnapshot {
  docs: CachedDocumentSnapshot[];
  empty: boolean;
  size: number;
  metadata: { fromCache: boolean; hasPendingWrites: boolean };

  constructor(docs: CachedDocumentSnapshot[]) {
    this.docs = docs;
    this.empty = docs.length === 0;
    this.size = docs.length;
    this.metadata = { fromCache: true, hasPendingWrites: false };
  }

  forEach(callback: (doc: CachedDocumentSnapshot) => void): void {
    this.docs.forEach(callback);
  }
}

// Resilient serializer to construct unique cache keys for collection queries
function getQueryCacheKey(queryRef: any): string {
  if (!queryRef) return 'unknown';
  if (typeof queryRef.path === 'string') {
    return queryRef.path;
  }
  try {
    const parts: string[] = [];
    if (queryRef.path) {
      parts.push(queryRef.path);
    } else if (queryRef.type === 'collection') {
      parts.push(queryRef.path);
    } else if (queryRef._query) {
      const q = queryRef._query;
      if (q.path) parts.push(q.path.toString());
      if (q.filters) parts.push(JSON.stringify(q.filters));
      if (q.explicitOrderBy) parts.push(JSON.stringify(q.explicitOrderBy));
      if (q.limit) parts.push(String(q.limit));
    } else {
      const keys = Object.keys(queryRef);
      for (const k of keys) {
        const val = queryRef[k];
        if (val && typeof val === 'object' && val.path) {
          parts.push(val.path.toString());
        }
      }
    }
    if (parts.length === 0) {
      const seen = new WeakSet();
      const json = JSON.stringify(queryRef, (key, value) => {
        if (typeof value === 'object' && value !== null) {
          if (seen.has(value)) return '[Circular]';
          seen.add(value);
          if (value.path) return { path: value.path };
          if (value.id) return { id: value.id };
        }
        if (typeof value === 'function') return '[Function]';
        return value;
      });
      parts.push(json);
    }
    return parts.join('_').replace(/[^a-zA-Z0-9_]/g, '_');
  } catch (e) {
    return 'query_' + String(queryRef?.path || 'any');
  }
}

// Extract collection path from doc path to manage list cache invalidation
function getCollectionPathFromDocPath(docPath: string): string {
  const parts = docPath.split('/');
  if (parts.length % 2 === 0) {
    return parts.slice(0, -1).join('/');
  }
  return docPath;
}

// Invalidate list queries for a collection when document data changes
function invalidateQueryCaches(collectionPath: string) {
  try {
    const prefix = `ciya_fs_query_${collectionPath.replace(/[^a-zA-Z0-9_]/g, '_')}`;
    if (typeof window !== 'undefined') {
      const keysToClear: string[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          keysToClear.push(key);
        }
      }
      keysToClear.forEach(key => {
        window.localStorage.removeItem(key);
        window.localStorage.removeItem(`${key}_time`);
      });

      // Special handling for student assignments collection
      if (collectionPath === 'assignments') {
        window.localStorage.removeItem('ciya_cached_student_assignments');
      }

      // Special handling for app settings collection
      if (collectionPath === 'settings') {
        window.localStorage.removeItem('ciya_cached_app_settings');
      }
    }
  } catch (e) {
    console.warn("Error invalidating query caches:", e);
  }
}

// Local resolver for single getDoc / doc onSnapshot
function resolveLocalDoc(path: string): { exists: boolean; data: any } {
  if (!path) return { exists: false, data: null };

  // If we are looking for a specific course document (e.g. "courses/xyz")
  if (path.startsWith('courses/')) {
    const courseId = path.split('/').pop();
    const course = coursesStore.getCourses().find(c => c.id === courseId);
    if (course) {
      return { exists: true, data: course };
    }
  }

  // 1. Check custom user/assignments/etc. local caches first (as updated by writes)
  const cacheKey = `ciya_fs_doc_${path.replace(/[^a-zA-Z0-9_]/g, '_')}_data`;
  const cachedStr = safeStorage.getItem(cacheKey);
  if (cachedStr) {
    try {
      const parsed = JSON.parse(cachedStr);
      return { exists: parsed.exists, data: parsed.data };
    } catch (e) {}
  }

  // Fallback check for user profile cache in other standard keys
  if (path.startsWith('users/')) {
    const cachedProfile = safeStorage.getItem('ciya_cached_profile');
    if (cachedProfile) {
      try {
        const parsed = JSON.parse(cachedProfile);
        return { exists: true, data: parsed };
      } catch (e) {}
    }
    // Return a default skeleton profile instead of crashing or querying the live DB
    return {
      exists: true,
      data: {
        fullName: "Invited Student",
        progress: {},
        quizScores: {},
        completedKeys: [],
        manualDayUnlock: {}
      }
    };
  }

  // 2. Fallbacks for static paths
  if (path === 'settings/app') {
    const cachedSettings = safeStorage.getItem('ciya_cached_app_settings');
    if (cachedSettings) {
      try {
        return { exists: true, data: JSON.parse(cachedSettings) };
      } catch (e) {}
    }
    return { exists: true, data: { lockedSections: {} } };
  }
  if (path === 'settings/system_signals') {
    return { exists: true, data: { status: 'offline' } };
  }
  if (path === 'settings/full_prompts') {
    return { exists: true, data: staticFullPrompts };
  }
  if (path === 'settings/modular_prompts') {
    return { exists: true, data: staticModularPrompts };
  }

  // If we are looking for a specific blog document (e.g. "blog/xyz")
  if (path.startsWith('blog/')) {
    const blogId = path.split('/').pop();
    const post = (staticBlog as any[]).find(b => b.id === blogId);
    if (post) {
      return { exists: true, data: post };
    }
  }

  return { exists: false, data: null };
}

// Local resolver for getDocs / collection/query onSnapshot
function resolveLocalQuery(ref: any): any[] {
  if (!ref) return [];
  
  // Resolve path safely (could be collection ref or query ref)
  let path = ref.path || '';
  if (!path && ref._query && ref._query.path) {
    path = ref._query.path.toString();
  }
  if (!path && ref.type === 'collection') {
    path = ref.path;
  }

  // Bypass cache completely for course lists and blog posts to guarantee dynamic reflecting
  if (path === 'courses') {
    return coursesStore.getCourses().map(c => ({
      id: c.id,
      exists: true,
      data: c
    }));
  }
  if (path === 'blog') {
    return (staticBlog as any[]).map(b => ({
      id: b.id,
      exists: true,
      data: b
    }));
  }
  
  const queryKey = getQueryCacheKey(ref);
  const cacheKey = `ciya_fs_query_${queryKey}_data`;

  // 1. If we have local cached results for this query (e.g., user-submitted assignments or user lists)
  const cachedStr = safeStorage.getItem(cacheKey);
  if (cachedStr) {
    try {
      const parsed = JSON.parse(cachedStr);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch (e) {}
  }

  // 2. Static fallbacks (Only other fallbacks continue here if not matched above)

  // If we are looking for assignments
  if (path === 'assignments') {
    // Attempt to aggregate assignments from local doc caches
    const list: any[] = [];
    try {
      if (typeof window !== 'undefined') {
        const prefix = 'ciya_fs_doc_assignments_';
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          if (key && key.startsWith(prefix) && key.endsWith('_data')) {
            const val = window.localStorage.getItem(key);
            if (val) {
              const parsed = JSON.parse(val);
              if (parsed.exists && parsed.data) {
                list.push({
                  id: parsed.id || key.substring(prefix.length, key.length - 5),
                  exists: true,
                  data: parsed.data
                });
              }
            }
          }
        }
      }
    } catch (e) {}
    
    // Also merge from standard cached student assignments if any
    const cachedStudentAssignments = safeStorage.getItem('ciya_cached_student_assignments');
    if (cachedStudentAssignments) {
      try {
        const parsed = JSON.parse(cachedStudentAssignments);
        if (Array.isArray(parsed)) {
          parsed.forEach((item: any) => {
            if (!list.some(existing => existing.id === item.id)) {
              list.push({
                id: item.id,
                exists: true,
                data: item
              });
            }
          });
        }
      } catch (e) {}
    }
    
    return list;
  }

  return [];
}

// Overridden getDoc function to run 100% locally when offline, or use live Firestore when online
export async function getDoc(docRef: any): Promise<CachedDocumentSnapshot> {
  if (!docRef) {
    return new CachedDocumentSnapshot('', false, null);
  }
  const path = docRef.path || '';
  if (isNetworkDisabled()) {
    const { exists, data } = resolveLocalDoc(path);
    return new CachedDocumentSnapshot(docRef.id || '', exists, data, docRef);
  } else {
    if (!isBypassCachePath(path)) {
      try {
        const cacheKey = `ciya_fs_doc_${path.replace(/[^a-zA-Z0-9_]/g, '_')}`;
        const timeStr = safeStorage.getItem(`${cacheKey}_time`);
        const dataStr = safeStorage.getItem(`${cacheKey}_data`);
        if (timeStr && dataStr) {
          const age = Date.now() - Number(timeStr);
          if (age < CACHE_EXPIRATION_MS) {
            const parsed = JSON.parse(dataStr);
            console.log(`[Cache hit] returning cached doc for path: ${path} (age: ${Math.round(age / 1000)}s)`);
            return new CachedDocumentSnapshot(parsed.id || docRef.id || '', parsed.exists, parsed.data, docRef);
          }
        }
      } catch (cacheErr) {
        console.warn(`Error reading/parsing getDoc cache for path ${path}:`, cacheErr);
      }
    }

    try {
      const liveSnap = await realGetDoc(docRef);
      if (!liveSnap) {
        const { exists, data } = resolveLocalDoc(path);
        return new CachedDocumentSnapshot(docRef.id || '', exists, data, docRef);
      }
      const serialized = {
        id: liveSnap.id,
        exists: typeof liveSnap.exists === 'function' ? liveSnap.exists() : false,
        data: (typeof liveSnap.exists === 'function' && liveSnap.exists() && typeof liveSnap.data === 'function') ? liveSnap.data() : null
      };
      const cacheKey = `ciya_fs_doc_${path.replace(/[^a-zA-Z0-9_]/g, '_')}`;
      safeStorage.setItem(`${cacheKey}_data`, JSON.stringify(serialized));
      safeStorage.setItem(`${cacheKey}_time`, String(Date.now()));
      return new CachedDocumentSnapshot(liveSnap.id, serialized.exists, serialized.data, docRef);
    } catch (error) {
      console.warn(`getDoc live fetch failed for path ${path} (falling back to local cache):`, error);
      const { exists, data } = resolveLocalDoc(path);
      return new CachedDocumentSnapshot(docRef.id || '', exists, data, docRef);
    }
  }
}

// Overridden getDocs function to run 100% locally when offline, or use live Firestore when online
export async function getDocs(queryRef: any): Promise<CachedQuerySnapshot> {
  if (!queryRef) {
    return new CachedQuerySnapshot([]);
  }
  if (isNetworkDisabled()) {
    const results = resolveLocalQuery(queryRef);
    const docs = results.map((r: any) => new CachedDocumentSnapshot(r.id, r.exists, r.data, queryRef));
    return new CachedQuerySnapshot(docs);
  } else {
    let path = queryRef.path || '';
    if (!path && queryRef._query && queryRef._query.path) {
      path = queryRef._query.path.toString();
    }
    if (!path && queryRef.type === 'collection') {
      path = queryRef.path;
    }

    if (!isBypassCachePath(path)) {
      try {
        const queryKey = getQueryCacheKey(queryRef);
        const cacheKey = `ciya_fs_query_${queryKey}`;
        const timeStr = safeStorage.getItem(`${cacheKey}_time`);
        const dataStr = safeStorage.getItem(`${cacheKey}_data`);
        if (timeStr && dataStr) {
          const age = Date.now() - Number(timeStr);
          if (age < CACHE_EXPIRATION_MS) {
            const parsedList = JSON.parse(dataStr);
            if (Array.isArray(parsedList)) {
              console.log(`[Cache hit] returning cached getDocs for path/key: ${path || queryKey} (age: ${Math.round(age / 1000)}s)`);
              const docs = parsedList.map((item: any) =>
                new CachedDocumentSnapshot(item.id || '', item.exists, item.data, queryRef)
              );
              return new CachedQuerySnapshot(docs);
            }
          }
        }
      } catch (cacheErr) {
        console.warn(`Error reading/parsing getDocs cache:`, cacheErr);
      }
    }

    try {
      const liveSnap = await realGetDocs(queryRef);
      if (!liveSnap || !liveSnap.docs) {
        const results = resolveLocalQuery(queryRef);
        const docs = results.map((r: any) => new CachedDocumentSnapshot(r.id, r.exists, r.data, queryRef));
        return new CachedQuerySnapshot(docs);
      }
      const serialized: any[] = [];
      liveSnap.forEach((docSnap: any) => {
        if (docSnap) {
          serialized.push({
            id: docSnap.id,
            exists: typeof docSnap.exists === 'function' ? docSnap.exists() : false,
            data: (typeof docSnap.exists === 'function' && docSnap.exists() && typeof docSnap.data === 'function') ? docSnap.data() : null
          });
        }
      });
      const queryKey = getQueryCacheKey(queryRef);
      const cacheKey = `ciya_fs_query_${queryKey}`;
      const dataKey = `${cacheKey}_data`;
      const timeKey = `${cacheKey}_time`;
      safeStorage.setItem(dataKey, JSON.stringify(serialized));
      safeStorage.setItem(timeKey, String(Date.now()));

      const docs = liveSnap.docs.map((docSnap: any) => 
        new CachedDocumentSnapshot(
          docSnap?.id || '',
          typeof docSnap?.exists === 'function' ? docSnap.exists() : false,
          typeof docSnap?.data === 'function' ? docSnap.data() : null,
          docSnap?.ref
        )
      );
      return new CachedQuerySnapshot(docs);
    } catch (error) {
      console.warn(`getDocs live fetch failed (falling back to local cache):`, error);
      const results = resolveLocalQuery(queryRef);
      const docs = results.map((r: any) => new CachedDocumentSnapshot(r.id, r.exists, r.data, queryRef));
      return new CachedQuerySnapshot(docs);
    }
  }
}

// Key resolver for subscription multiplexing
function getSubscriptionKey(ref: any): string {
  if (!ref) return 'unknown';
  const path = ref.path || (ref._query && ref._query.path && ref._query.path.toString()) || '';
  const isDoc = typeof path === 'string' && path.split('/').length % 2 === 0;
  if (isDoc) {
    return `doc:${path}`;
  }
  return `query:${getQueryCacheKey(ref)}`;
}

interface ActiveSubscription {
  realUnsubscribe: () => void;
  callbacks: Set<(snapshot: any) => void>;
  errorHandlers: Set<(error: any) => void>;
  lastSnapshot: any | null;
  refCount: number;
}

const activeSubscriptions = new Map<string, ActiveSubscription>();

// Overridden onSnapshot to implement local real-time simulation when offline, or reference-counted multiplexed sync when online
export function onSnapshot(
  ref: any,
  onNext: (snapshot: any) => void,
  onError?: (error: any) => void
): () => void {
  if (!ref) {
    const timer = setTimeout(() => {
      try {
        onNext(new CachedQuerySnapshot([]));
      } catch (err) {
        if (onError) onError(err);
      }
    }, 0);
    return () => clearTimeout(timer);
  }

  if (isNetworkDisabled()) {
    let path = ref?.path || '';
    if (!path && ref?._query && ref?._query.path) {
      path = ref._query.path.toString();
    }
    if (!path && ref?.type === 'collection') {
      path = ref.path;
    }

    const isDoc = typeof path === 'string' && path.split('/').length % 2 === 0;

    // Run asynchronously to mimic the real SDK and avoid React state updates during render
    const timer = setTimeout(() => {
      try {
        if (isDoc) {
          const { exists, data } = resolveLocalDoc(path);
          onNext(new CachedDocumentSnapshot(path.split('/').pop() || '', exists, data, ref));
        } else {
          const results = resolveLocalQuery(ref);
          const docs = results.map((r: any) => new CachedDocumentSnapshot(r.id, r.exists, r.data));
          onNext(new CachedQuerySnapshot(docs));
        }
      } catch (err) {
        if (onError) onError(err);
      }
    }, 0);

    return () => {
      clearTimeout(timer);
    };
  } else {
    const subKey = getSubscriptionKey(ref);
    let sub = activeSubscriptions.get(subKey);

    if (sub) {
      // Multiplex existing active listener: increment refCount & add listeners
      sub.refCount++;
      sub.callbacks.add(onNext);
      if (onError) sub.errorHandlers.add(onError);

      // If a snapshot is already loaded, deliver it immediately (async to prevent React render state warnings)
      if (sub.lastSnapshot) {
        const cachedSnap = sub.lastSnapshot;
        const immediateTimer = setTimeout(() => {
          try {
            const currentSub = activeSubscriptions.get(subKey);
            if (currentSub && currentSub.callbacks.has(onNext)) {
              onNext(cachedSnap);
            }
          } catch (err) {
            console.error("Multiplexed immediate onNext error:", err);
          }
        }, 0);

        return () => {
          clearTimeout(immediateTimer);
          const currentSub = activeSubscriptions.get(subKey);
          if (currentSub) {
            currentSub.callbacks.delete(onNext);
            if (onError) currentSub.errorHandlers.delete(onError);
            currentSub.refCount--;
            if (currentSub.refCount <= 0) {
              if (typeof currentSub.realUnsubscribe === 'function') {
                currentSub.realUnsubscribe();
              }
              activeSubscriptions.delete(subKey);
            }
          }
        };
      }

      return () => {
        const currentSub = activeSubscriptions.get(subKey);
        if (currentSub) {
          currentSub.callbacks.delete(onNext);
          if (onError) currentSub.errorHandlers.delete(onError);
          currentSub.refCount--;
          if (currentSub.refCount <= 0) {
            if (typeof currentSub.realUnsubscribe === 'function') {
              currentSub.realUnsubscribe();
            }
            activeSubscriptions.delete(subKey);
          }
        }
      };
    }

    // No active listener for this subscription key. Open a brand new one!
    const callbacks = new Set<(snapshot: any) => void>();
    const errorHandlers = new Set<(error: any) => void>();
    callbacks.add(onNext);
    if (onError) errorHandlers.add(onError);

    const newSub: ActiveSubscription = {
      realUnsubscribe: () => {}, // assigned below
      callbacks,
      errorHandlers,
      lastSnapshot: null,
      refCount: 1
    };

    activeSubscriptions.set(subKey, newSub);

    let realUnsubscribe: () => void = () => {};

    try {
      realUnsubscribe = realOnSnapshot(ref, (liveSnap: any) => {
        try {
          if (!liveSnap) {
            const emptySnap = new CachedQuerySnapshot([]);
            const currentSub = activeSubscriptions.get(subKey);
            if (currentSub) {
              currentSub.lastSnapshot = emptySnap;
              currentSub.callbacks.forEach(cb => cb(emptySnap));
            }
            return;
          }

          const isDoc = typeof liveSnap?.exists === 'function';
          let snapshotToEmit: any;

          if (isDoc) {
            const path = ref?.path || '';
            if (liveSnap.exists()) {
              updateLocalDocCache(path, true, liveSnap.data());
            } else {
              updateLocalDocCache(path, false, null);
            }
            snapshotToEmit = new CachedDocumentSnapshot(liveSnap.id, liveSnap.exists(), liveSnap.data(), liveSnap.ref);
          } else {
            // It's a query snapshot (collection or query)
            const docs = (liveSnap.docs || []).map((docSnap: any) =>
              new CachedDocumentSnapshot(
                docSnap?.id || '',
                typeof docSnap?.exists === 'function' ? docSnap.exists() : false,
                typeof docSnap?.data === 'function' ? docSnap.data() : null,
                docSnap?.ref
              )
            );
            
            // Save to cache so it's ready when going offline
            const queryKey = getQueryCacheKey(ref);
            const cacheKey = `ciya_fs_query_${queryKey}`;
            const dataKey = `${cacheKey}_data`;
            const timeKey = `${cacheKey}_time`;
            const serialized = (liveSnap.docs || []).map((docSnap: any) => ({
              id: docSnap?.id || '',
              exists: typeof docSnap?.exists === 'function' ? docSnap.exists() : false,
              data: typeof docSnap?.data === 'function' ? docSnap.data() : null
            }));
            safeStorage.setItem(dataKey, JSON.stringify(serialized));
            safeStorage.setItem(timeKey, String(Date.now()));

            snapshotToEmit = new CachedQuerySnapshot(docs);
          }

          const currentSub = activeSubscriptions.get(subKey);
          if (currentSub) {
            currentSub.lastSnapshot = snapshotToEmit;
            currentSub.callbacks.forEach(cb => {
              try {
                cb(snapshotToEmit);
              } catch (cbErr) {
                console.error("onSnapshot listener callback error:", cbErr);
              }
            });
          }
        } catch (callbackErr) {
          console.error("onSnapshot callback internal error:", callbackErr);
        }
      }, (error: any) => {
        const currentSub = activeSubscriptions.get(subKey);
        if (currentSub) {
          if (currentSub.errorHandlers.size > 0) {
            currentSub.errorHandlers.forEach(handler => {
              try {
                handler(error);
              } catch (hErr) {
                console.error("onSnapshot listener error handler error:", hErr);
              }
            });
          } else {
            console.warn("onSnapshot observer error:", error);
          }
        }
      });

      newSub.realUnsubscribe = realUnsubscribe;
    } catch (setupErr) {
      console.warn("realOnSnapshot setup failed (falling back to offline listener):", setupErr);
      activeSubscriptions.delete(subKey);

      let path = ref?.path || '';
      if (!path && ref?._query && ref?._query.path) {
        path = ref._query.path.toString();
      }
      if (!path && ref?.type === 'collection') {
        path = ref.path;
      }
      const isDoc = typeof path === 'string' && path.split('/').length % 2 === 0;
      const timer = setTimeout(() => {
        try {
          if (isDoc) {
            const { exists, data } = resolveLocalDoc(path);
            onNext(new CachedDocumentSnapshot(path.split('/').pop() || '', exists, data, ref));
          } else {
            const results = resolveLocalQuery(ref);
            const docs = results.map((r: any) => new CachedDocumentSnapshot(r.id, r.exists, r.data));
            onNext(new CachedQuerySnapshot(docs));
          }
        } catch (err) {
          if (onError) onError(err);
        }
      }, 0);
      return () => clearTimeout(timer);
    }

    return () => {
      const currentSub = activeSubscriptions.get(subKey);
      if (currentSub) {
        currentSub.callbacks.delete(onNext);
        if (onError) currentSub.errorHandlers.delete(onError);
        currentSub.refCount--;
        if (currentSub.refCount <= 0) {
          if (typeof currentSub.realUnsubscribe === 'function') {
            currentSub.realUnsubscribe();
          }
          activeSubscriptions.delete(subKey);
        }
      }
    };
  }
}

// Helper to write a single document to local storage to keep user changes responsive
function updateLocalDocCache(path: string, exists: boolean, data: any) {
  const cacheKey = `ciya_fs_doc_${path.replace(/[^a-zA-Z0-9_]/g, '_')}`;
  const dataKey = `${cacheKey}_data`;
  const timeKey = `${cacheKey}_time`;
  const serialized = { id: path.split('/').pop() || '', exists, data };
  safeStorage.setItem(dataKey, JSON.stringify(serialized));
  safeStorage.setItem(timeKey, String(Date.now()));

  // Special synchronization: update general user profile cache if users table is written
  // and the updated profile matches the currently logged-in student's UID.
  if (path.startsWith('users/')) {
    const docUid = path.split('/').pop();
    const currentUid = getCurrentUserUid();
    if (docUid && currentUid && docUid === currentUid) {
      safeStorage.setItem('ciya_cached_profile', JSON.stringify(data));
    }
  }
}

// Set nested properties supporting dot-notation correctly (e.g. "manualDayUnlock.pathway_A.2")
function setNestedProperty(obj: any, pathStr: string, value: any) {
  const parts = pathStr.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!(part in current) || typeof current[part] !== 'object' || current[part] === null) {
      current[part] = {};
    }
    current = current[part];
  }
  current[parts[parts.length - 1]] = value;
}

// Overridden setDoc to write live and immediately synchronize local cache
export async function setDoc(docRef: any, data: any, options?: any): Promise<void> {
  if (!docRef) return;
  const path = docRef.path || '';
  const colPath = getCollectionPathFromDocPath(path);

  // Synchronize local doc cache immediately so UI matches the written data
  let finalData = data;
  if (options && options.merge) {
    const cacheKey = `ciya_fs_doc_${path.replace(/[^a-zA-Z0-9_]/g, '_')}_data`;
    const cachedStr = safeStorage.getItem(cacheKey);
    if (cachedStr) {
      try {
        const parsed = JSON.parse(cachedStr);
        finalData = JSON.parse(JSON.stringify(parsed.data || {})); // deep copy
        Object.keys(data).forEach(key => {
          setNestedProperty(finalData, key, data[key]);
        });
      } catch (err) {
        finalData = data;
      }
    }
  }
  updateLocalDocCache(path, true, finalData);
  invalidateQueryCaches(colPath);

  try {
    // Perform live write
    await realSetDoc(docRef, data, options);
  } catch (error) {
    console.warn(`setDoc live write failed for path ${path} (saved locally):`, error);
    if (safeStorage.getItem('ciya_db_connection_disabled') !== 'true') {
      throw error;
    }
  }
}

// Overridden updateDoc to write live and immediately synchronize local cache
export async function updateDoc(docRef: any, data: any): Promise<void> {
  if (!docRef) return;
  const path = docRef.path || '';
  const colPath = getCollectionPathFromDocPath(path);

  // Synchronize local doc cache immediately
  let finalData = {};
  const cacheKey = `ciya_fs_doc_${path.replace(/[^a-zA-Z0-9_]/g, '_')}_data`;
  const cachedStr = safeStorage.getItem(cacheKey);
  if (cachedStr) {
    try {
      const parsed = JSON.parse(cachedStr);
      finalData = JSON.parse(JSON.stringify(parsed.data || {})); // deep copy
    } catch (err) {
      finalData = {};
    }
  }
  
  // Apply update fields, resolving dot-notated nested paths correctly
  Object.keys(data).forEach(key => {
    setNestedProperty(finalData, key, data[key]);
  });

  updateLocalDocCache(path, true, finalData);
  invalidateQueryCaches(colPath);

  try {
    // Perform live write
    await realUpdateDoc(docRef, data);
  } catch (error) {
    console.warn(`updateDoc live write failed for path ${path} (saved locally):`, error);
    if (safeStorage.getItem('ciya_db_connection_disabled') !== 'true') {
      throw error;
    }
  }
}

// Overridden addDoc to write live and immediately synchronize local cache
export async function addDoc(collectionRef: any, data: any): Promise<any> {
  if (!collectionRef) {
    throw new Error("Invalid collection reference in addDoc");
  }
  const colPath = collectionRef.path || '';
  const randomId = 'local_' + Math.random().toString(36).substring(2, 11);
  const path = colPath ? `${colPath}/${randomId}` : `unknown/${randomId}`;

  // Synchronize local doc cache immediately
  updateLocalDocCache(path, true, data);
  invalidateQueryCaches(colPath);

  let liveRef: any = null;
  try {
    // Perform live write
    liveRef = await realAddDoc(collectionRef, data);
    if (liveRef && liveRef.path && liveRef.path !== path) {
      updateLocalDocCache(liveRef.path, true, data);
      safeStorage.removeItem(`ciya_fs_doc_${path.replace(/[^a-zA-Z0-9_]/g, '_')}_data`);
      safeStorage.removeItem(`ciya_fs_doc_${path.replace(/[^a-zA-Z0-9_]/g, '_')}_time`);
    }
  } catch (error) {
    console.warn(`addDoc live write failed for collection ${colPath} (saved locally):`, error);
    if (safeStorage.getItem('ciya_db_connection_disabled') !== 'true') {
      throw error;
    }
    liveRef = {
      id: randomId,
      path: path
    };
  }

  return liveRef;
}

// Overridden deleteDoc to write live and immediately synchronize local cache
export async function deleteDoc(docRef: any): Promise<void> {
  if (!docRef) return;
  const path = docRef.path || '';
  const colPath = getCollectionPathFromDocPath(path);

  // Synchronize local cache immediately
  updateLocalDocCache(path, false, null);
  invalidateQueryCaches(colPath);

  try {
    // Perform live write
    await realDeleteDoc(docRef);
  } catch (error) {
    console.warn(`deleteDoc live write failed for path ${path} (saved locally):`, error);
    if (safeStorage.getItem('ciya_db_connection_disabled') !== 'true') {
      throw error;
    }
  }
}
