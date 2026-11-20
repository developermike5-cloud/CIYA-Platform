import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { sendPushRequest } from '../firebaseMessaging';

export type CiyaEventNotification = {
  title: string;
  message: string;
  type: string;
  triggeredBy?: string;
  url?: string;
};

/** Best-effort push delivery; the server resolves the student's FCM tokens. */
const pushOne = (target: string, n: CiyaEventNotification) =>
  sendPushRequest(target, n.title, n.message, n.url || '/dashboard').catch(() => false);

/**
 * One call writes the in-app history entries AND fires the matching push, so
 * an event's two channels can never drift apart.
 */
export async function dispatchNotification(opts: CiyaEventNotification & {
  userIds?: string[];
  broadcast?: boolean;
}) {
  const { userIds = [], broadcast = false, title, message, type, triggeredBy = 'CIYA System', url } = opts;
  const payload = { title, message, type, isRead: false, triggeredBy, createdAt: serverTimestamp() };
  try {
    if (broadcast) {
      try {
        await addDoc(collection(db, 'notifications'), { userId: 'all', ...payload });
      } catch { /* keep going */ }
    }
    for (const uid of userIds) {
      if (!uid || uid === 'all') continue;
      try {
        await addDoc(collection(db, 'notifications'), { userId: uid, ...payload });
      } catch { /* keep going */ }
    }
  } catch { /* history is best-effort; push still goes */ }
  (broadcast ? ['all'] : userIds).forEach((t) => { void pushOne(t, { title, message, type, url }); });
}
