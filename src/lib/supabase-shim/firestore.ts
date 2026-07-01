import { supabase } from '../supabase';

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
    return new DocumentSnapshot(true, data.data || {}, id);
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
  return new DocumentSnapshot(true, camelData, id);
}

export async function getDocs(queryRef: any) {
  const rawTable = queryRef.path;
  const table = getTableName(rawTable);
  let q = supabase.from(table).select('*');

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

  const docs = data.map((row: any) => {
    const camelData = keysToCamel(row);
    return new DocumentSnapshot(true, camelData, row.id);
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

function createEmptyDocsResult() {
  return {
    docs: [],
    forEach() {},
    get empty() { return true; },
    get size() { return 0; }
  };
}

export async function setDoc(docRef: any, data: any, options?: { merge?: boolean }) {
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
    return;
  }

  const snakeData = keysToSnake(data);
  snakeData.id = id;

  const { error } = await supabase
    .from(table)
    .upsert(snakeData);

  if (error) throw error;
}

export async function updateDoc(docRef: any, data: any) {
  const rawTable = docRef.path;
  const id = docRef.id;
  const table = getTableName(rawTable);

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
    return;
  }

  const snakeData = keysToSnake(data);
  const { error } = await supabase
    .from(table)
    .update(snakeData)
    .eq('id', id);

  if (error) throw error;
}

export async function addDoc(collRef: any, data: any) {
  const rawTable = collRef.path;
  const table = getTableName(rawTable);
  const snakeData = keysToSnake(data);

  if (!snakeData.id) {
    snakeData.id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  const { data: inserted, error } = await supabase
    .from(table)
    .insert(snakeData)
    .select()
    .single();

  if (error) throw error;
  const camelData = keysToCamel(inserted);
  return new DocumentSnapshot(true, camelData, inserted.id);
}

export async function deleteDoc(docRef: any) {
  const rawTable = docRef.path;
  const id = docRef.id;
  const table = getTableName(rawTable);

  const { error } = await supabase
    .from(table)
    .delete()
    .eq('id', id);

  if (error) throw error;
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

    const table = getTableName(ref.path);
    const channel = supabase
      .channel(`doc-${table}-${ref.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: table,
        filter: `id=eq.${ref.id}`
      }, () => {
        if (!unsubscribed) fetchAndCallback();
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

    const table = getTableName(ref.path);
    const channel = supabase
      .channel(`table-${table}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: table
      }, () => {
        if (!unsubscribed) fetchAndCallback();
      })
      .subscribe();

    return () => {
      unsubscribed = true;
      supabase.removeChannel(channel);
    };
  }
}
