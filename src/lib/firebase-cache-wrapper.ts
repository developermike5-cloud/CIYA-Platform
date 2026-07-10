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
import staticCourses from '../data/courses.json';
import staticBlog from '../data/blog.json';
import staticFullPrompts from '../data/full_prompts.json';
import staticModularPrompts from '../data/modular_prompts.json';

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

// Local resolver for single getDoc / doc onSnapshot
function resolveLocalDoc(path: string): { exists: boolean; data: any } {
  if (!path) return { exists: false, data: null };

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

  // If we are looking for a specific course document (e.g. "courses/xyz")
  if (path.startsWith('courses/')) {
    const courseId = path.split('/').pop();
    const course = (staticCourses as any[]).find(c => c.id === courseId);
    if (course) {
      return { exists: true, data: course };
    }
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

  // 2. Static fallbacks
  if (path === 'courses') {
    return (staticCourses as any[]).map(c => ({
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

// Overridden getDoc function to run 100% locally on the frontend
export async function getDoc(docRef: any): Promise<CachedDocumentSnapshot> {
  const path = docRef.path;
  const { exists, data } = resolveLocalDoc(path);
  return new CachedDocumentSnapshot(docRef.id, exists, data, docRef);
}

// Overridden getDocs function to run 100% locally on the frontend
export async function getDocs(queryRef: any): Promise<CachedQuerySnapshot> {
  const results = resolveLocalQuery(queryRef);
  const docs = results.map((r: any) => new CachedDocumentSnapshot(r.id, r.exists, r.data, queryRef));
  return new CachedQuerySnapshot(docs);
}

// Overridden onSnapshot to implement local real-time callback simulation with ZERO network listening
export function onSnapshot(
  ref: any,
  onNext: (snapshot: any) => void,
  onError?: (error: any) => void
): () => void {
  let path = ref?.path || '';
  if (!path && ref._query && ref._query.path) {
    path = ref._query.path.toString();
  }
  if (!path && ref.type === 'collection') {
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
  if (path.startsWith('users/')) {
    safeStorage.setItem('ciya_cached_profile', JSON.stringify(data));
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
