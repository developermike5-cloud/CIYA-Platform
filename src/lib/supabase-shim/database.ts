import { supabase } from '../supabase';

export function getDatabase() {
  return { name: '[SupabaseRTDBShim]' };
}

export function ref(rtdb: any, path: string) {
  return { type: 'rtdb_ref', path };
}

export async function set(refObj: any, value: any) {
  const docId = 'rtdb_' + refObj.path.replace(/\//g, '_');
  const { error } = await supabase
    .from('settings')
    .upsert({ id: docId, data: { value }, updated_at: new Date().toISOString() });
  if (error) throw error;
}

export function onValue(refObj: any, callback: (snapshot: any) => void) {
  let unsubscribed = false;
  const docId = 'rtdb_' + refObj.path.replace(/\//g, '_');

  const fetchAndCallback = async () => {
    const { data } = await supabase
      .from('settings')
      .select('data')
      .eq('id', docId)
      .single();
    if (!unsubscribed) {
      const val = data?.data?.value ?? null;
      callback({
        val: () => val,
        exists: () => val !== null
      });
    }
  };

  fetchAndCallback();

  const channel = supabase
    .channel(`rtdb-${docId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'settings',
      filter: `id=eq.${docId}`
    }, () => {
      if (!unsubscribed) fetchAndCallback();
    })
    .subscribe();

  return () => {
    unsubscribed = true;
    supabase.removeChannel(channel);
  };
}
