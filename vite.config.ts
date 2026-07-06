import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(
        process.env.VITE_SUPABASE_URL ||
        process.env.SUPABASE_URL ||
        env.VITE_SUPABASE_URL ||
        env.SUPABASE_URL ||
        'https://yfntfkblqsjgtgmmfqub.supabase.co'
      ),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(
        process.env.VITE_SUPABASE_ANON_KEY ||
        process.env.SUPABASE_ANON_KEY ||
        env.VITE_SUPABASE_ANON_KEY ||
        env.SUPABASE_ANON_KEY ||
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmbnRma2JscXNqZ3RnbW1mcXViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5MTM2MTIsImV4cCI6MjA5ODQ4OTYxMn0.r1b9MbLEUtoovsltbfVMq_tlHtHijKHdBiyGVkFDr3Y'
      ),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        'firebase/app': path.resolve(__dirname, 'src/lib/supabase-shim/app.ts'),
        'firebase/auth': path.resolve(__dirname, 'src/lib/supabase-shim/auth.ts'),
        'firebase/firestore': path.resolve(__dirname, 'src/lib/supabase-shim/firestore.ts'),
        'firebase/database': path.resolve(__dirname, 'src/lib/supabase-shim/database.ts'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
