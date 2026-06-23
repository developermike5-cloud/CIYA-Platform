class MemoryStorage implements Storage {
  private data: Record<string, string> = {};

  get length(): number {
    return Object.keys(this.data).length;
  }

  clear(): void {
    this.data = {};
  }

  getItem(key: string): string | null {
    return Object.prototype.hasOwnProperty.call(this.data, key) ? this.data[key] : null;
  }

  key(index: number): string | null {
    const keys = Object.keys(this.data);
    return index >= 0 && index < keys.length ? keys[index] : null;
  }

  removeItem(key: string): void {
    delete this.data[key];
  }

  setItem(key: string, value: string): void {
    this.data[key] = String(value);
  }
}

function polyfillStorage() {
  if (typeof window === 'undefined') return;

  const memoryLocalStorageInstance = new MemoryStorage();
  const memorySessionStorageInstance = new MemoryStorage();

  let localStorageWorks = false;
  try {
    const testKey = '__storage_test_key__';
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
    localStorageWorks = true;
  } catch (e) {
    localStorageWorks = false;
  }

  let sessionStorageWorks = false;
  try {
    const testKey = '__storage_test_key__';
    window.sessionStorage.setItem(testKey, '1');
    window.sessionStorage.removeItem(testKey);
    sessionStorageWorks = true;
  } catch (e) {
    sessionStorageWorks = false;
  }

  if (!localStorageWorks) {
    console.warn("localStorage is not accessible. Overriding via Window.prototype.");
    try {
      Object.defineProperty(Window.prototype, 'localStorage', {
        get: function () {
          return memoryLocalStorageInstance;
        },
        configurable: true,
        enumerable: true
      });
    } catch (err) {
      console.error("Failed to define localStorage on Window.prototype:", err);
      try {
        Object.defineProperty(window, 'localStorage', {
          value: memoryLocalStorageInstance,
          writable: true,
          configurable: true,
          enumerable: true
        });
      } catch (err2) {
        console.error("Failed to define localStorage helper directly on window:", err2);
      }
    }
  }

  if (!sessionStorageWorks) {
    console.warn("sessionStorage is not accessible. Overriding via Window.prototype.");
    try {
      Object.defineProperty(Window.prototype, 'sessionStorage', {
        get: function () {
          return memorySessionStorageInstance;
        },
        configurable: true,
        enumerable: true
      });
    } catch (err) {
      console.error("Failed to define sessionStorage on Window.prototype:", err);
      try {
        Object.defineProperty(window, 'sessionStorage', {
          value: memorySessionStorageInstance,
          writable: true,
          configurable: true,
          enumerable: true
        });
      } catch (err2) {
        console.error("Failed to define sessionStorage helper directly on window:", err2);
      }
    }
  }
}

try {
  polyfillStorage();
} catch (e) {
  console.error("Storage polyfill execution failed:", e);
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

