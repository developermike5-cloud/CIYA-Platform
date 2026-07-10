/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

const rawUrl = import.meta.env.VITE_SUPABASE_URL;
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Clean up, trim, and strip any literal double or single quotes or prefix from URL
let cleanUrl = typeof rawUrl === 'string' ? rawUrl.trim() : '';
if (cleanUrl.startsWith('VITE_SUPABASE_URL=')) {
  cleanUrl = cleanUrl.replace('VITE_SUPABASE_URL=', '').trim();
} else if (cleanUrl.startsWith('SUPABASE_URL=')) {
  cleanUrl = cleanUrl.replace('SUPABASE_URL=', '').trim();
}

if (cleanUrl.startsWith('"') && cleanUrl.endsWith('"')) {
  cleanUrl = cleanUrl.slice(1, -1).trim();
}
if (cleanUrl.startsWith("'") && cleanUrl.endsWith("'")) {
  cleanUrl = cleanUrl.slice(1, -1).trim();
}

// Remove trailing /rest/v1 or /rest/v1/ suffix if present, as Supabase client appends it automatically
if (cleanUrl.includes('/rest/v1')) {
  cleanUrl = cleanUrl.split('/rest/v1')[0].trim();
}

// Remove trailing slash if present
if (cleanUrl.endsWith('/')) {
  cleanUrl = cleanUrl.slice(0, -1).trim();
}

const supabaseUrl = (cleanUrl && !cleanUrl.includes('YOUR_') && cleanUrl.startsWith('http'))
  ? cleanUrl
  : 'https://yfntfkblqsjgtgmmfqub.supabase.co';

// Clean up, trim, and strip any literal double or single quotes or prefix from Key (Supabase keys are long JWTs)
let cleanKey = typeof rawKey === 'string' ? rawKey.trim() : '';
if (cleanKey.startsWith('VITE_SUPABASE_ANON_KEY=')) {
  cleanKey = cleanKey.replace('VITE_SUPABASE_ANON_KEY=', '').trim();
} else if (cleanKey.startsWith('SUPABASE_ANON_KEY=')) {
  cleanKey = cleanKey.replace('SUPABASE_ANON_KEY=', '').trim();
}

if (cleanKey.startsWith('"') && cleanKey.endsWith('"')) {
  cleanKey = cleanKey.slice(1, -1).trim();
}
if (cleanKey.startsWith("'") && cleanKey.endsWith("'")) {
  cleanKey = cleanKey.slice(1, -1).trim();
}

const supabaseAnonKey = (cleanKey && !cleanKey.includes('YOUR_') && cleanKey.length >= 20)
  ? cleanKey
  : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmbnRma2JscXNqZ3RnbW1mcXViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5MTM2MTIsImV4cCI6MjA5ODQ4OTYxMn0.r1b9MbLEUtoovsltbfVMq_tlHtHijKHdBiyGVkFDr3Y';

console.log('[Supabase Config] Initializing client with:', {
  url: supabaseUrl,
  keyLength: supabaseAnonKey ? supabaseAnonKey.length : 0,
  isFallbackUsed: supabaseAnonKey.startsWith('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9')
});

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  }
});

/**
 * Helper to get the correct public URL for an uploaded file path.
 * If a custom storage URL or S3 public endpoint is configured, we'll map it.
 */
export function getStoragePublicUrl(bucket: string, filePath: string): string {
  if (!filePath) return '';
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    return filePath;
  }
  const customStorageUrl = import.meta.env.VITE_SUPABASE_STORAGE_URL || import.meta.env.VITE_SUPABASE_S3_ENDPOINT;
  if (customStorageUrl) {
    let baseUrl = String(customStorageUrl).trim();
    
    // Clean up quotes if present
    if (baseUrl.startsWith('"') && baseUrl.endsWith('"')) {
      baseUrl = baseUrl.slice(1, -1).trim();
    }
    if (baseUrl.startsWith("'") && baseUrl.endsWith("'")) {
      baseUrl = baseUrl.slice(1, -1).trim();
    }
    
    if (baseUrl.endsWith('/')) {
      baseUrl = baseUrl.slice(0, -1);
    }
    
    // If they provided a raw S3 endpoint or custom URL, we append the bucket and filePath
    // E.g. https://xxxxxx.supabase.co/storage/v1/object/public/assignments/file.png
    if (baseUrl.includes('/storage/v1')) {
      // Supabase-style URL
      return `${baseUrl}/object/public/${bucket}/${filePath}`;
    } else {
      // S3 or other bucket URL
      return `${baseUrl}/${bucket}/${filePath}`;
    }
  }

  // Fallback: build the expected public URL structure offline without calling active API routes that fail on suspended projects
  const cleanBaseUrl = supabaseUrl.replace(/\/$/, '');
  return `${cleanBaseUrl}/storage/v1/object/public/${bucket}/${filePath}`;
}

