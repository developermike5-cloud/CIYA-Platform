/**
 * CIYA push notifications (Firebase Cloud Messaging, web).
 *
 * - registerStudentPush(): asks for notification permission once, gets an FCM
 *   token bound to the app's service worker (which handles background pushes)
 *   and stores it on users/{uid}.fcmTokens so the server can reach the device.
 * - sendPushRequest(): asks the server (/api/push-send) to deliver a push to
 *   one student or to all students. The calling flow writes the history entry
 *   to the `notifications` collection, so push and history never double up.
 *
 * This module never reloads or refreshes the app.
 */
import { doc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getMessaging, getToken, onMessage, isSupported, type Messaging } from 'firebase/messaging';
import { db } from './firebase';
import firebaseConfig from '../firebase-applet-config.json';

let messagingInstance: Messaging | null = null;
let foregroundHandler: ((title: string, body: string) => void) | null = null;

/** Fire-and-forget request to the server to deliver a push. */
export async function sendPushRequest(target: 'all' | string, title: string, message: string, url: string = '/dashboard'): Promise<boolean> {
  try {
    const res = await fetch('/api/push-send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target, title, body: message, url })
    });
    if (!res.ok) {
      console.warn('Push send refused by server:', res.status);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Push send failed:', err);
    return false;
  }
}

/**
 * Ask for permission (once, silently skipping when denied or unsupported),
 * register the device token on the user's profile, and wire foreground pushes
 * to a branded in-app handler. Returns true when the device can receive pushes.
 */
export async function registerStudentPush(
  uid: string,
  onForeground?: (title: string, body: string) => void
): Promise<boolean> {
  try {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return false;
    if (typeof Notification === 'undefined') return false;
    if (!(await isSupported().catch(() => false))) return false;

    let permission: NotificationPermission = Notification.permission;
    if (permission === 'default') {
      try {
        permission = await Notification.requestPermission();
      } catch {
        return false;
      }
    }
    if (permission !== 'granted') return false;

    const registration = await navigator.serviceWorker.ready;
    if (!messagingInstance) messagingInstance = getMessaging();
    if (onForeground) foregroundHandler = onForeground;

    const token = await getToken(messagingInstance, {
      vapidKey: (firebaseConfig as any).vapidPublicKey as string,
      serviceWorkerRegistration: registration
    });
    if (!token) return false;

    onMessage(messagingInstance, (payload) => {
      const t = payload.notification?.title || (payload.data && payload.data.title) || 'CIYA';
      const b = payload.notification?.body || (payload.data && payload.data.message) || '';
      try {
        foregroundHandler?.(t, b);
      } catch {
        // Toast helpers can fail in odd states; never break the app for a toast.
      }
    });

    // Store the token as a map entry so several devices can be registered at once.
    const tokenRef = doc(db, 'users', uid);
    try {
      await updateDoc(tokenRef, { [`fcmTokens.${token}`]: true, updatedAt: serverTimestamp() });
    } catch {
      await setDoc(tokenRef, { fcmTokens: { [token]: true } }, { merge: true });
    }
    return true;
  } catch (err) {
    console.warn('Push registration skipped:', err);
    return false;
  }
}
