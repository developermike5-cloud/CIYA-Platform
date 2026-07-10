import { supabase } from '../supabase';
import { safeStorage } from '../../utils/safeStorage';
import staticCourses from '../../data/courses.json';
import staticBlogs from '../../data/blog.json';
import staticFullPrompts from '../../data/full_prompts.json';
import staticModularPrompts from '../../data/modular_prompts.json';
import staticAppSettings from '../../data/app_settings.json';

// Cache invalidation helper
export function invalidateCache(table: string, id?: string) {
  try {
    if (typeof window !== 'undefined') {
      const keysToClear: string[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key) {
          if (key.startsWith(`ciya_cache_docs_${table}_`) || 
              (id && key === `ciya_cache_doc_${table}_${id}`) ||
              (!id && key.startsWith(`ciya_cache_doc_${table}_`))) {
            keysToClear.push(key);
          }
        }
      }
      keysToClear.forEach(key => window.localStorage.removeItem(key));
    }
  } catch (e) {
    console.warn("Error invalidating cache:", e);
  }
}

// Helper functions to bridge PostgreSQL snake_case columns with Firestore camelCase properties
export function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

export function snakeToCamel(str: string): string {
  return str.replace(/([-_][a-z])/g, group =>
    group.toUpperCase().replace('-', '').replace('_', '')
  );
}

export function keysToSnake(obj: any): any {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  if (obj instanceof Date) return obj;
  const newObj: any = {};
  for (const key of Object.keys(obj)) {
    const snakeKey = camelToSnake(key);
    newObj[snakeKey] = obj[key];
  }
  return newObj;
}

export function keysToCamel(obj: any): any {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  const newObj: any = {};
  for (const key of Object.keys(obj)) {
    const camelKey = snakeToCamel(key);
    newObj[camelKey] = obj[key];
  }
  return newObj;
}

// Map Firestore collection paths to their clean plural PostgreSQL table names
function getTableName(path: string): string {
  // If collection name is 'blog', keep it, otherwise map if needed
  if (path === 'blog') return 'blog';
  return path;
}

export class DocumentSnapshot {
  constructor(private _exists: boolean, private _data: any, public id: string) {}
  exists() {
    return this._exists;
  }
  data() {
    return this._data;
  }
}

export const db = { name: '[SupabaseFirestoreDbShim]' };

export function getFirestore() {
  return db;
}

export function initializeFirestore() {
  return db;
}

export function persistentLocalCache() { return {}; }
export function persistentMultipleTabManager() { return {}; }
export function memoryLocalCache() { return {}; }

export function collection(dbInstance: any, path: string) {
  return { type: 'collection', path };
}

export function doc(...args: any[]) {
  let path = '';
  let id = '';
  if (args.length === 2) {
    // doc(collectionRef, id)
    path = args[0].path;
    id = args[1];
  } else if (args.length === 3) {
    // doc(db, collectionName, id)
    path = args[1];
    id = args[2];
  }
  return { type: 'doc', path, id };
}

export function where(field: string, op: string, val: any) {
  return { type: 'where', field, op, val };
}

export function orderBy(field: string, dir: 'asc' | 'desc' = 'asc') {
  return { type: 'orderBy', field, dir };
}

export function limit(value: number) {
  return { type: 'limit', value };
}

export function query(collRef: any, ...constraints: any[]) {
  return {
    type: 'query',
    path: collRef.path,
    constraints: constraints.filter(Boolean)
  };
}

export async function getDoc(docRef: any): Promise<DocumentSnapshot> {
  try {
    const rawTable = docRef.path;
    const id = docRef.id;
    const table = getTableName(rawTable);

    if (table === 'courses') {
      const found = (staticCourses as any[]).find(c => c.id === id);
      if (found) {
        return new DocumentSnapshot(true, found, id);
      }
    }
    if (table === 'blog') {
      const found = (staticBlogs as any[]).find(p => p.id === id);
      if (found) {
        return new DocumentSnapshot(true, found, id);
      }
    }
    if (table === 'settings') {
      if (id === 'full_prompts') {
        return new DocumentSnapshot(true, staticFullPrompts, id);
      }
      if (id === 'modular_prompts') {
        return new DocumentSnapshot(true, staticModularPrompts, id);
      }
      if (id === 'app_settings') {
        return new DocumentSnapshot(true, staticAppSettings, id);
      }
    }

    const cacheKey = `ciya_cache_doc_${table}_${id}`;

    // Read from cache if available
    let cachedDataStr = null;
    try {
      cachedDataStr = safeStorage.getItem(cacheKey);
    } catch (e) {}

    if (cachedDataStr) {
      const cachedDoc = JSON.parse(cachedDataStr);
      return new DocumentSnapshot(true, cachedDoc, id);
    }

    return await fetchAndCacheDoc(docRef, cacheKey);
  } catch (err) {
    console.warn("Supabase shim getDoc error handled gracefully:", err);
    return new DocumentSnapshot(false, null, docRef?.id || '');
  }
}

async function fetchAndCacheDoc(docRef: any, cacheKey: string): Promise<DocumentSnapshot> {
  const rawTable = docRef.path;
  const id = docRef.id;
  const table = getTableName(rawTable);

  if (table === 'settings') {
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return new DocumentSnapshot(false, null, id);
    }
    const finalData = data.data || {};
    try {
      safeStorage.setItem(cacheKey, JSON.stringify(finalData));
    } catch (e) {}
    return new DocumentSnapshot(true, finalData, id);
  }

  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    return new DocumentSnapshot(false, null, id);
  }

  const camelData = keysToCamel(data);
  try {
    safeStorage.setItem(cacheKey, JSON.stringify(camelData));
  } catch (e) {}
  return new DocumentSnapshot(true, camelData, id);
}

async function refreshDocBackground(docRef: any, cacheKey: string) {
  const rawTable = docRef.path;
  const id = docRef.id;
  const table = getTableName(rawTable);

  let freshData: any = null;

  if (table === 'settings') {
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return;
    freshData = data.data || {};
  } else {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return;
    freshData = keysToCamel(data);
  }

  const oldCached = safeStorage.getItem(cacheKey);
  const freshStr = JSON.stringify(freshData);

  if (oldCached !== freshStr) {
    safeStorage.setItem(cacheKey, freshStr);
    triggerListenersForPath(rawTable, id);
  }
}

export async function getDocs(queryRef: any) {
  try {
    const rawTable = queryRef.path;
    const table = getTableName(rawTable);

    if (table === 'courses') {
      const docs = (staticCourses as any[]).map(c => {
        return new DocumentSnapshot(true, c, c.id);
      });
      return {
        docs,
        forEach(callback: (doc: any) => void) {
          docs.forEach(callback);
        },
        get empty() {
          return docs.length === 0;
        },
        get size() {
          return docs.length;
        }
      };
    }
    if (table === 'blog') {
      const docs = (staticBlogs as any[]).map(p => {
        return new DocumentSnapshot(true, p, p.id);
      });
      return {
        docs,
        forEach(callback: (doc: any) => void) {
          docs.forEach(callback);
        },
        get empty() {
          return docs.length === 0;
        },
        get size() {
          return docs.length;
        }
      };
    }

    const cacheKey = `ciya_cache_docs_${table}_${JSON.stringify(queryRef.constraints || [])}`;

    // Read from cache if available
    let cachedDataStr = null;
    try {
      cachedDataStr = safeStorage.getItem(cacheKey);
    } catch (e) {}

    if (cachedDataStr) {
      const cachedDocs = JSON.parse(cachedDataStr);
      const docs = cachedDocs.map((row: any) => {
        return new DocumentSnapshot(true, row.data, row.id);
      });

      return {
        docs,
        forEach(callback: (doc: any) => void) {
          docs.forEach(callback);
        },
        get empty() {
          return docs.length === 0;
        },
        get size() {
          return docs.length;
        }
      };
    }

    return await fetchAndCacheDocs(queryRef, cacheKey);
  } catch (err) {
    console.warn("Supabase shim getDocs error handled gracefully:", err);
    return createEmptyDocsResult();
  }
}

async function fetchAndCacheDocs(queryRef: any, cacheKey: string) {
  const rawTable = queryRef.path;
  const table = getTableName(rawTable);
  
  let selectCols = '*';

  let q = supabase.from(table).select(selectCols);

  const constraints = queryRef.constraints || [];
  for (const c of constraints) {
    if (c.type === 'where') {
      const snakeField = camelToSnake(c.field);
      if (c.op === '==') {
        q = q.eq(snakeField, c.val);
      } else if (c.op === '>=') {
        q = q.gte(snakeField, c.val);
      } else if (c.op === '<=') {
        q = q.lte(snakeField, c.val);
      } else if (c.op === 'in') {
        q = q.in(snakeField, c.val);
      }
    } else if (c.type === 'orderBy') {
      const snakeField = camelToSnake(c.field);
      q = q.order(snakeField, { ascending: c.dir === 'asc' });
    } else if (c.type === 'limit') {
      q = q.limit(c.value);
    }
  }

  const { data, error } = await q;
  if (error || !data) {
    return createEmptyDocsResult();
  }

  const serialized = data.map((row: any) => ({
    id: row.id,
    data: keysToCamel(row)
  }));
  try {
    safeStorage.setItem(cacheKey, JSON.stringify(serialized));
  } catch (e) {}

  const docs = serialized.map((row: any) => {
    return new DocumentSnapshot(true, row.data, row.id);
  });

  return {
    docs,
    forEach(callback: (doc: any) => void) {
      docs.forEach(callback);
    },
    get empty() {
      return docs.length === 0;
    },
    get size() {
      return docs.length;
    }
  };
}

async function refreshDocsBackground(queryRef: any, cacheKey: string) {
  const rawTable = queryRef.path;
  const table = getTableName(rawTable);
  
  let selectCols = '*';

  let q = supabase.from(table).select(selectCols);

  const constraints = queryRef.constraints || [];
  for (const c of constraints) {
    if (c.type === 'where') {
      const snakeField = camelToSnake(c.field);
      if (c.op === '==') {
        q = q.eq(snakeField, c.val);
      } else if (c.op === '>=') {
        q = q.gte(snakeField, c.val);
      } else if (c.op === '<=') {
        q = q.lte(snakeField, c.val);
      } else if (c.op === 'in') {
        q = q.in(snakeField, c.val);
      }
    } else if (c.type === 'orderBy') {
      const snakeField = camelToSnake(c.field);
      q = q.order(snakeField, { ascending: c.dir === 'asc' });
    } else if (c.type === 'limit') {
      q = q.limit(c.value);
    }
  }

  const { data, error } = await q;
  if (error || !data) return;

  const serialized = data.map((row: any) => ({
    id: row.id,
    data: keysToCamel(row)
  }));

  const oldCached = safeStorage.getItem(cacheKey);
  const newSerializedStr = JSON.stringify(serialized);

  if (oldCached !== newSerializedStr) {
    safeStorage.setItem(cacheKey, newSerializedStr);
    triggerListenersForPath(rawTable);
  }
}

function createEmptyDocsResult() {
  return {
    docs: [],
    forEach() {},
    get empty() { return true; },
    get size() { return 0; }
  };
}

// Helper to handle undefined column errors (PostgreSQL code 42703) dynamically by stripping missing columns and retrying
async function runWithFallback(
  operation: (payload: any) => Promise<{ error: any; data?: any }>,
  initialPayload: any
) {
  let currentPayload = { ...initialPayload };
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const { error, data } = await operation(currentPayload);
    if (!error) {
      return { error: null, data };
    }

    if (error && error.message) {
      const isMissingColumnError = 
        error.code === '42703' || 
        error.code === 'PGRST204' || 
        error.message.includes('column') && error.message.includes('does not exist') ||
        error.message.includes('Could not find the') && error.message.includes('column of');

      if (isMissingColumnError) {
        const match = 
          error.message.match(/column "([^"]+)"/i) || 
          error.message.match(/column ([a-zA-Z0-9_]+) does not exist/i) ||
          error.message.match(/Could not find the '([^']+)' column/i);

        if (match && match[1]) {
          const missingColumn = match[1];
          if (missingColumn in currentPayload) {
            console.warn(`[Supabase Shim] Column "${missingColumn}" does not exist in public database table. Stripping from write payload and retrying.`);
            delete currentPayload[missingColumn];
            attempts++;
            continue;
          }
        }
      }
    }
    return { error };
  }
  return { error: new Error('Too many column removal attempts') };
}

interface ActiveListener {
  ref: any;
  fetchAndCallback: () => Promise<void>;
  isUnsubscribed: () => boolean;
}

const activeListeners: ActiveListener[] = [];

function registerListener(ref: any, fetchAndCallback: () => Promise<void>, isUnsubscribed: () => boolean) {
  activeListeners.push({ ref, fetchAndCallback, isUnsubscribed });
}

export function triggerListenersForPath(path: string, docId?: string) {
  const table = getTableName(path);
  invalidateCache(table, docId);
  // Clean up stale listeners
  for (let i = activeListeners.length - 1; i >= 0; i--) {
    if (activeListeners[i].isUnsubscribed()) {
      activeListeners.splice(i, 1);
    }
  }

  activeListeners.forEach((listener) => {
    const lTable = getTableName(listener.ref.path);
    if (lTable !== table) return;

    if (listener.ref.type === 'doc') {
      if (docId && listener.ref.id !== docId) return;
      listener.fetchAndCallback().catch((err) => console.warn("Listener trigger error:", err));
    } else {
      listener.fetchAndCallback().catch((err) => console.warn("Listener trigger error:", err));
    }
  });
}

export async function setDoc(docRef: any, data: any, options?: { merge?: boolean }) {
  try {
    const rawTable = docRef.path;
    const id = docRef.id;
    const table = getTableName(rawTable);

    if (table === 'settings') {
      let finalData = data;
      if (options?.merge) {
        const { data: existing } = await supabase
          .from('settings')
          .select('data')
          .eq('id', id)
          .single();
        finalData = { ...(existing?.data || {}), ...data };
      }
      const { error } = await supabase
        .from('settings')
        .upsert({ id, data: finalData, updated_at: new Date().toISOString() });
      if (error) throw error;
      setTimeout(() => triggerListenersForPath(docRef.path, docRef.id), 50);
      return;
    }

    const snakeData = keysToSnake(data);
    snakeData.id = id;

    const { error } = await runWithFallback(async (payload) => {
      const { error } = await supabase
        .from(table)
        .upsert(payload);
      return { error };
    }, snakeData);

    if (error) throw error;
    setTimeout(() => triggerListenersForPath(docRef.path, docRef.id), 50);
  } catch (err) {
    console.warn("Supabase shim setDoc error handled gracefully:", err);
  }
}

export async function updateDoc(docRef: any, data: any) {
  try {
    const rawTable = docRef.path;
    const id = docRef.id;
    const table = getTableName(rawTable);

    if (table === 'users') {
      const { data: existingUser } = await supabase
        .from('users')
        .select('progress')
        .eq('id', id)
        .single();

      let progressObj = { ...(existingUser?.progress || {}) };
      let normalUpdates: any = {};

      for (const key of Object.keys(data)) {
        if (key.startsWith('progress.')) {
          const parts = key.substring('progress.'.length).split('.');
          let current = progressObj;
          for (let i = 0; i < parts.length - 1; i++) {
            if (!current[parts[i]] || typeof current[parts[i]] !== 'object') {
              current[parts[i]] = {};
            }
            current = current[parts[i]];
          }
          current[parts[parts.length - 1]] = data[key];
        } else if (key === 'progress') {
          progressObj = data[key];
        } else {
          normalUpdates[key] = data[key];
        }
      }

      const snakeData = keysToSnake({
        ...normalUpdates,
        progress: progressObj
      });

      const { error } = await runWithFallback(async (payload) => {
        const { error } = await supabase
          .from('users')
          .update(payload)
          .eq('id', id);
        return { error };
      }, snakeData);

      if (error) throw error;
      setTimeout(() => triggerListenersForPath(docRef.path, docRef.id), 50);
      return;
    }

    if (table === 'settings') {
      const { data: existing } = await supabase
        .from('settings')
        .select('data')
        .eq('id', id)
        .single();
      
      // Resolve any dot-notation keys in the update object (e.g. `user_signals.xyz` inside triggerSystemSignal)
      let merged = { ...(existing?.data || {}) };
      for (const key of Object.keys(data)) {
        if (key.includes('.')) {
          const parts = key.split('.');
          let current = merged;
          for (let i = 0; i < parts.length - 1; i++) {
            if (!current[parts[i]] || typeof current[parts[i]] !== 'object') {
              current[parts[i]] = {};
            }
            current = current[parts[i]];
          }
          current[parts[parts.length - 1]] = data[key];
        } else {
          merged[key] = data[key];
        }
      }

      const { error } = await supabase
        .from('settings')
        .upsert({ id, data: merged, updated_at: new Date().toISOString() });
      if (error) throw error;
      setTimeout(() => triggerListenersForPath(docRef.path, docRef.id), 50);
      return;
    }

    const snakeData = keysToSnake(data);
    
    const { error } = await runWithFallback(async (payload) => {
      const { error } = await supabase
        .from(table)
        .update(payload)
        .eq('id', id);
      return { error };
    }, snakeData);

    if (error) throw error;
    setTimeout(() => triggerListenersForPath(docRef.path, docRef.id), 50);
  } catch (err) {
    console.warn("Supabase shim updateDoc error handled gracefully:", err);
  }
}

export async function addDoc(collRef: any, data: any) {
  try {
    const rawTable = collRef.path;
    const table = getTableName(rawTable);
    const snakeData = keysToSnake(data);

    if (!snakeData.id) {
      snakeData.id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }

    let finalInserted: any = null;
    const { error } = await runWithFallback(async (payload) => {
      const { data: inserted, error } = await supabase
        .from(table)
        .insert(payload)
        .select()
        .single();
      if (!error) {
        finalInserted = inserted;
      }
      return { error };
    }, snakeData);

    if (error) throw error;
    const camelData = keysToCamel(finalInserted);
    setTimeout(() => triggerListenersForPath(collRef.path), 50);
    return new DocumentSnapshot(true, camelData, finalInserted.id);
  } catch (err) {
    console.warn("Supabase shim addDoc error handled gracefully:", err);
    return new DocumentSnapshot(false, {}, '');
  }
}

export async function deleteDoc(docRef: any) {
  try {
    const rawTable = docRef.path;
    const id = docRef.id;
    const table = getTableName(rawTable);

    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id);

    if (error) throw error;
    setTimeout(() => triggerListenersForPath(docRef.path, docRef.id), 50);
  } catch (err) {
    console.warn("Supabase shim deleteDoc error handled gracefully:", err);
  }
}

export function serverTimestamp() {
  return new Date().toISOString();
}

export function writeBatch() {
  const operations: (() => Promise<void>)[] = [];
  return {
    set(docRef: any, data: any) {
      operations.push(() => setDoc(docRef, data));
    },
    update(docRef: any, data: any) {
      operations.push(() => updateDoc(docRef, data));
    },
    delete(docRef: any) {
      operations.push(() => deleteDoc(docRef));
    },
    async commit() {
      for (const op of operations) {
        await op();
      }
    }
  };
}

export function onSnapshot(ref: any, callback: (snap: any) => void) {
  let unsubscribed = false;

  if (ref.type === 'doc') {
    const fetchAndCallback = async () => {
      try {
        const snap = await getDoc(ref);
        if (!unsubscribed) callback(snap);
      } catch (e) {
        console.error("onSnapshot fetch error:", e);
      }
    };

    fetchAndCallback();
    registerListener(ref, fetchAndCallback, () => unsubscribed);

    const table = getTableName(ref.path);
    const uniqueSuffix = Math.random().toString(36).substring(2, 9);
    const channel = supabase
      .channel(`doc-${table}-${ref.id}-${uniqueSuffix}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: table,
        filter: `id=eq.${ref.id}`
      }, () => {
        if (!unsubscribed) {
          try {
            safeStorage.removeItem(`ciya_cache_doc_${table}_${ref.id}`);
          } catch (e) {}
          fetchAndCallback();
        }
      })
      .subscribe();

    return () => {
      unsubscribed = true;
      supabase.removeChannel(channel);
    };
  } else {
    // Collection or query snapshot
    const fetchAndCallback = async () => {
      try {
        const snap = await getDocs(ref);
        if (!unsubscribed) callback(snap);
      } catch (e) {
        console.error("onSnapshot fetch error:", e);
      }
    };

    fetchAndCallback();
    registerListener(ref, fetchAndCallback, () => unsubscribed);

    const table = getTableName(ref.path);
    const uniqueSuffix = Math.random().toString(36).substring(2, 9);
    const channel = supabase
      .channel(`table-${table}-${uniqueSuffix}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: table
      }, () => {
        if (!unsubscribed) {
          try {
            invalidateCache(table);
          } catch (e) {}
          fetchAndCallback();
        }
      })
      .subscribe();

    return () => {
      unsubscribed = true;
      supabase.removeChannel(channel);
    };
  }
}
