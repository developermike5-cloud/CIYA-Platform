import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Self-heal: if a chunk fails to load after a redeploy, refresh once so the
// browser picks up the new build instead of showing a blank screen.
try { sessionStorage.removeItem('ciya_preload_reload'); } catch {}
window.addEventListener('vite:preloadError', () => {
  try {
    if (sessionStorage.getItem('ciya_preload_reload')) return;
    sessionStorage.setItem('ciya_preload_reload', '1');
  } catch {}
  window.location.reload();
});
