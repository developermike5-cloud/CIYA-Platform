import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Kill the browser's native pull-to-refresh at the gesture level. Chrome's
// overscroll-behavior alone is not enough on every surface, so any single
// mostly-vertical downward drag at the top of its scroll chain is cancelled
// before the browser can turn it into a refresh. The CIYA pull strip runs on
// its own touch handlers, which still fire, so it keeps working.
(window as any).__CIYA_PTR_GUARD__ = true;
let ciyaTouchStartY = 0;
let ciyaTouchStartX = 0;
const ciyaChainAtTop = (target: EventTarget | null): boolean => {
  let el = target instanceof Element ? target : null;
  while (el && el !== document.documentElement) {
    if (el.scrollHeight > el.clientHeight + 1) {
      const overflowY = getComputedStyle(el).overflowY;
      if (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') {
        return el.scrollTop <= 0;
      }
    }
    el = el.parentElement;
  }
  return true;
};
document.addEventListener('touchstart', (e) => {
  ciyaTouchStartY = e.touches[0].clientY;
  ciyaTouchStartX = e.touches[0].clientX;
}, { passive: true });
const ciyaIsStandalone = (): boolean =>
  (typeof window.matchMedia === 'function' &&
    window.matchMedia('(display-mode: standalone)').matches) ||
  (window.navigator as any).standalone === true;
document.addEventListener('touchmove', (e) => {
  if (!ciyaIsStandalone()) return; // the regular website keeps native pull-to-refresh
  if (e.touches.length !== 1) return;
  const dy = e.touches[0].clientY - ciyaTouchStartY;
  const dx = e.touches[0].clientX - ciyaTouchStartX;
  if (dy > 0 && dy > Math.abs(dx) && ciyaChainAtTop(e.target)) {
    e.preventDefault();
  }
}, { passive: false });

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
