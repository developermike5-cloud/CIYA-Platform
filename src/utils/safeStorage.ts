const memoryStorage: Record<string, string> = {};

export const safeStorage = {
  getItem(key: string): string | null {
    try {
      if (typeof window === 'undefined') return null;
      // Accessing window.localStorage can throw SecurityError in restricted iframes
      return window.localStorage.getItem(key);
    } catch (e) {
      return memoryStorage[key] || null;
    }
  },

  setItem(key: string, value: string): void {
    try {
      if (typeof window === 'undefined') return;
      window.localStorage.setItem(key, value);
    } catch (e) {
      memoryStorage[key] = String(value);
    }
  },

  removeItem(key: string): void {
    try {
      if (typeof window === 'undefined') return;
      window.localStorage.removeItem(key);
    } catch (e) {
      delete memoryStorage[key];
    }
  },

  clear(): void {
    try {
      if (typeof window === 'undefined') return;
      window.localStorage.clear();
    } catch (e) {
      for (const key in memoryStorage) {
        delete memoryStorage[key];
      }
    }
  },

  key(index: number): string | null {
    try {
      if (typeof window === 'undefined') return null;
      return window.localStorage.key(index);
    } catch (e) {
      const keys = Object.keys(memoryStorage);
      return index >= 0 && index < keys.length ? keys[index] : null;
    }
  }
};
