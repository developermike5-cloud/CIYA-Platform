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
    }
  } catch (e) {
    console.warn("Error invalidating query caches:", e);
  }
}

// Overridden getDoc function to always fetch from the live backend, avoiding stale caching
export async function getDoc(docRef: any): Promise<CachedDocumentSnapshot> {
  const path = docRef.path;

  // Fetch from the live backend
  try {
    const liveSnap = await realGetDoc(docRef);
    const serialized = {
      id: liveSnap.id,
      exists: liveSnap.exists(),
      data: liveSnap.exists() ? liveSnap.data() : null
    };
    const cacheKey = `ciya_fs_doc_${path.replace(/[^a-zA-Z0-9_]/g, '_')}`;
    safeStorage.setItem(`${cacheKey}_data`, JSON.stringify(serialized));
    safeStorage.setItem(`${cacheKey}_time`, String(Date.now()));
    return new CachedDocumentSnapshot(liveSnap.id, liveSnap.exists(), liveSnap.data(), docRef);
  } catch (error) {
    console.error(`getDoc live fetch failed for path ${path}:`, error);
    // Graceful fallback to cached storage if offline/error occurs
    const cacheKey = `ciya_fs_doc_${path.replace(/[^a-zA-Z0-9_]/g, '_')}`;
    const cachedDataStr = safeStorage.getItem(`${cacheKey}_data`);
    if (cachedDataStr) {
      try {
        const parsed = JSON.parse(cachedDataStr);
        return new CachedDocumentSnapshot(docRef.id, parsed.exists, parsed.data, docRef);
      } catch (err) {
        // ignore
      }
    }
    throw error;
  }
}

// Overridden getDocs function to always fetch from the live backend
export async function getDocs(queryRef: any): Promise<CachedQuerySnapshot> {
  const queryKey = getQueryCacheKey(queryRef);
  const cacheKey = `ciya_fs_query_${queryKey}`;
  const dataKey = `${cacheKey}_data`;
  const timeKey = `${cacheKey}_time`;

  // Fetch from the live backend
  try {
    const liveSnap = await realGetDocs(queryRef);
    const serialized: any[] = [];
    liveSnap.forEach((docSnap: any) => {
      serialized.push({
        id: docSnap.id,
        exists: docSnap.exists(),
        data: docSnap.exists() ? docSnap.data() : null
      });
    });
    safeStorage.setItem(dataKey, JSON.stringify(serialized));
    safeStorage.setItem(timeKey, String(Date.now()));

    const docs = liveSnap.docs.map((docSnap: any) => 
      new CachedDocumentSnapshot(docSnap.id, docSnap.exists(), docSnap.data(), docSnap.ref)
    );
    return new CachedQuerySnapshot(docs);
  } catch (error) {
    console.error(`getDocs live fetch failed for query:`, error);
    // Graceful fallback to cached storage if offline/error occurs
    const cachedDataStr = safeStorage.getItem(dataKey);
    if (cachedDataStr) {
      try {
        const parsedArray = JSON.parse(cachedDataStr);
        const docs = parsedArray.map((d: any) => new CachedDocumentSnapshot(d.id, d.exists, d.data));
        return new CachedQuerySnapshot(docs);
      } catch (err) {
        // ignore
      }
    }
    throw error;
  }
}

// Overridden onSnapshot to implement real-time live synchronization for all paths
export function onSnapshot(
  ref: any,
  onNext: (snapshot: any) => void,
  onError?: (error: any) => void
): () => void {
  // Always establish the real Firebase SDK onSnapshot real-time listener
  return realOnSnapshot(ref, (liveSnap: any) => {
    const isDoc = typeof liveSnap.exists === 'function';
    if (isDoc) {
      const path = ref?.path || '';
      if (liveSnap.exists()) {
        updateLocalDocCache(path, true, liveSnap.data());
      } else {
        updateLocalDocCache(path, false, null);
      }
      onNext(new CachedDocumentSnapshot(liveSnap.id, liveSnap.exists(), liveSnap.data(), liveSnap.ref));
    } else {
      // It's a query snapshot (collection or query)
      const docs = liveSnap.docs.map((docSnap: any) =>
        new CachedDocumentSnapshot(docSnap.id, docSnap.exists(), docSnap.data(), docSnap.ref)
      );
      onNext(new CachedQuerySnapshot(docs));
    }
  }, onError);
}

// Helper to write a single document to local storage to keep user changes responsive
function updateLocalDocCache(path: string, exists: boolean, data: any) {
  const cacheKey = `ciya_fs_doc_${path.replace(/[^a-zA-Z0-9_]/g, '_')}`;
  const dataKey = `${cacheKey}_data`;
  const timeKey = `${cacheKey}_time`;
  const serialized = { id: path.split('/').pop() || '', exists, data };
  safeStorage.setItem(dataKey, JSON.stringify(serialized));
  safeStorage.setItem(timeKey, String(Date.now()));
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
  const path = docRef.path;
  const colPath = getCollectionPathFromDocPath(path);

  // Perform live write
  await realSetDoc(docRef, data, options);

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
}

// Overridden updateDoc to write live and immediately synchronize local cache
export async function updateDoc(docRef: any, data: any): Promise<void> {
  const path = docRef.path;
  const colPath = getCollectionPathFromDocPath(path);

  // Perform live write
  await realUpdateDoc(docRef, data);

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
}

// Overridden addDoc to write live and immediately synchronize local cache
export async function addDoc(collectionRef: any, data: any): Promise<any> {
  const colPath = collectionRef.path;

  // Perform live write
  const liveRef = await realAddDoc(collectionRef, data);

  // Synchronize local doc cache immediately
  updateLocalDocCache(liveRef.path, true, data);
  invalidateQueryCaches(colPath);

  return liveRef;
}

// Overridden deleteDoc to write live and immediately synchronize local cache
export async function deleteDoc(docRef: any): Promise<void> {
  const path = docRef.path;
  const colPath = getCollectionPathFromDocPath(path);

  // Perform live write
  await realDeleteDoc(docRef);

  // Synchronize local cache immediately
  updateLocalDocCache(path, false, null);
  invalidateQueryCaches(colPath);
}
