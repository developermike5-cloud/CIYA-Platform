import { useState, useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// Global state to persist the install prompt across component lifecycles
let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;
let globalIsInstallable = false;
const listeners = new Set<(prompt: BeforeInstallPromptEvent | null, installable: boolean) => void>();

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    globalDeferredPrompt = e as BeforeInstallPromptEvent;
    globalIsInstallable = true;
    listeners.forEach(l => l(globalDeferredPrompt, globalIsInstallable));
  });

  window.addEventListener('appinstalled', () => {
    globalDeferredPrompt = null;
    globalIsInstallable = false;
    listeners.forEach(l => l(null, false));
  });
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(globalDeferredPrompt);
  const [isInstallable, setIsInstallable] = useState(globalIsInstallable);
  const [isInstalled, setIsInstalled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true
    );
  });
  const [isIOS, setIsIOS] = useState(false);

  // Integrate Vite PWA registration hook for update detection
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered:', r);
      // Check for updates every 10 minutes
      if (r) {
        setInterval(() => {
          r.update();
        }, 10 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.error('SW Registration error:', error);
    },
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isAppleDevice);

    const handleChange = (prompt: BeforeInstallPromptEvent | null, installable: boolean) => {
      setDeferredPrompt(prompt);
      setIsInstallable(installable);
    };

    listeners.add(handleChange);
    return () => {
      listeners.delete(handleChange);
    };
  }, []);

  const installApp = async (): Promise<boolean> => {
    const promptToUse = deferredPrompt || globalDeferredPrompt;
    if (!promptToUse) {
      console.warn('PWA Install prompt not available yet');
      return false;
    }
    try {
      await promptToUse.prompt();
      const choice = await promptToUse.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
        setIsInstallable(false);
        globalDeferredPrompt = null;
        globalIsInstallable = false;
        listeners.forEach(l => l(null, false));
        return true;
      }
    } catch (err) {
      console.error('Error during PWA installation:', err);
    }
    return false;
  };

  return {
    isInstallable,
    isInstalled,
    isIOS,
    installApp,
    needRefresh,
    offlineReady,
    updateServiceWorker: () => updateServiceWorker(true),
  };
}
