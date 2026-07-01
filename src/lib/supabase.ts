import { createClient } from '@supabase/supabase-js';

// Fallback to the provided Supabase credentials so it works immediately out of the box
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://yfntfkblqsjgtgmmfqub.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmbnRma2JscXNqZ3RnbW1mcXViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5MTM2MTIsImV4cCI6MjA5ODQ4OTYxMn0.r1b9MbLEUtoovsltbfVMq_tlHtHijKHdBiyGVkFDr3Y';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  }
});
