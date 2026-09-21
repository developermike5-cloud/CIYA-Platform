import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Professional Cache-Busting for AI Studio Preview Environment
// This ensures that the development and preview links always show the latest code
// by unregistering any service workers that might be caching the application.
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  const isPreview = window.location.hostname.includes('europe-west2.run.app') || 
                  window.location.hostname.includes('localhost');
  
  if (isPreview) {
    // 1. Unregister all existing service workers to clear stagnant caches
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister();
        console.log('[CIYA] Service Worker unregistered for fresh preview.');
      }
    });

    // 2. Clear all cache storages manually as a secondary layer
    if (window.caches) {
      caches.keys().then((names) => {
        for (const name of names) {
          caches.delete(name);
          console.log(`[CIYA] Cache ${name} cleared for fresh preview.`);
        }
      });
    }
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

