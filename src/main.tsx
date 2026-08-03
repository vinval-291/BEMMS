import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Register the service worker for Progressive Web App (PWA) offline usage.
// Production only: in development it would serve cached assets over the Vite
// dev server and mask edits behind stale responses.
if (import.meta.env.PROD && typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => {
        console.log('[BEMMS PWA] Service Worker registered successfully:', reg.scope);
      })
      .catch((err) => {
        console.warn('[BEMMS PWA] Service Worker registration failed:', err);
      });
  });
} else if (import.meta.env.DEV && typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  // Remove any worker left registered by a previous production build so the
  // dev server is never shadowed by a stale cache.
  navigator.serviceWorker.getRegistrations()
    .then((regs) => regs.forEach((reg) => reg.unregister()))
    .catch(() => { /* nothing to clean up */ });
}

