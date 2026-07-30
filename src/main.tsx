try {
  const patchFetch = (target: any) => {
    if (!target) return;
    try {
      let currentFetch = target.fetch;
      Object.defineProperty(target, 'fetch', {
        get() {
          return currentFetch;
        },
        set(val) {
          currentFetch = val;
        },
        configurable: true,
        enumerable: true
      });
    } catch (e) {
      try {
        target.fetch = target.fetch;
      } catch (err) {}
    }
  };
  if (typeof globalThis !== 'undefined') patchFetch(globalThis);
  if (typeof window !== 'undefined') patchFetch(window);
  if (typeof self !== 'undefined') patchFetch(self);
  if (typeof global !== 'undefined') patchFetch(global);
  if (typeof Window !== 'undefined' && Window.prototype) {
    patchFetch(Window.prototype);
  }
} catch (e) {
  console.warn("Failed to patch fetch property in main.tsx:", e);
}

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
