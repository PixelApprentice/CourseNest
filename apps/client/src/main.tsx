import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { applyTheme, getCurrentThemeId } from './lib/themeManager';
import './styles/global.css';

// Ensure persistent theme is initialized before React render
try {
  applyTheme(getCurrentThemeId());
} catch {}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Register progressive offline-first service worker in browser environments
if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((err) => {
      // In development or sandbox mode, registration failure is expected and non-blocking
      console.debug('ServiceWorker registration skipped or failed:', err?.message);
    });
  });
}
