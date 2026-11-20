/* CIYA push notification service worker.
 * Loaded by the main PWA service worker (workbox importScripts) so it shares
 * one registration. Handles background pushes and notification taps only:
 * it never reloads or refreshes any client. */
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

firebase.initializeApp({
  projectId: 'gen-lang-client-0862975917',
  appId: '1:261354048877:web:b8fe979fda1afa96879e64',
  apiKey: 'AIzaSyAeQTq9vY6sk5seX4xz1DeF-Z8qyE1NMaQ',
  authDomain: 'gen-lang-client-0862975917.firebaseapp.com',
  messagingSenderId: '261354048877'
});

try {
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    const title = (payload.notification && payload.notification.title) || (payload.data && payload.data.title) || 'CIYA';
    const bodyTxt = (payload.notification && payload.notification.body) || (payload.data && payload.data.message) || '';
    const link = (payload.data && payload.data.link) || '/dashboard';
    self.registration.showNotification(title, {
      body: bodyTxt,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: 'ciya-push',
      data: { link }
    });
  });
} catch (err) {
  // Messaging unavailable in this context; push silently unsupported.
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = (event.notification.data && event.notification.data.link) || '/dashboard';
  event.waitUntil((async () => {
    const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clientList) {
      if ('focus' in client) {
        client.postMessage({ type: 'CIYA_PUSH_NAVIGATE', link });
        return client.focus();
      }
    }
    return self.clients.openWindow(link);
  })());
});
