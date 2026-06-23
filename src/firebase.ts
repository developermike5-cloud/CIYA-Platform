import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getDatabase, ref, set } from 'firebase/database';
import firebaseConfig from '../firebase-applet-config.json';

// Dynamically use the custom Netlify domain if running in production on Netlify,
// otherwise fall back to the default gen-lang Firebase authDomain.
let customAuthDomain = firebaseConfig.authDomain;
if (typeof window !== 'undefined') {
  const hostname = window.location.hostname;
  if (hostname === 'ciyacademy.netlify.app') {
    customAuthDomain = 'ciyacademy.netlify.app';
  } else if (hostname.endsWith('.netlify.app')) {
    customAuthDomain = hostname;
  }
}

const activeFirebaseConfig = {
  ...firebaseConfig,
  authDomain: customAuthDomain
};

const app = initializeApp(activeFirebaseConfig);
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
}, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth();

// Initialize Realtime Database for zero-cost high-frequency real-time events,
// such as Leaderboard live scoring synchronization and live settings locks,
// which prevents wasting Firestore daily read/write quota rules!
let rtdbInstance;
try {
  // Safe regional construction supporting US/EU databases
  const defaultRtdbUrl = `https://${firebaseConfig.projectId}-default-rtdb.firebaseio.com`;
  const isEurope = firebaseConfig.projectId?.includes('europe-west') || firebaseConfig.firestoreDatabaseId?.includes('europe');
  const fallbackUrl = isEurope 
    ? `https://${firebaseConfig.projectId}-default-rtdb.europe-west1.firebasedatabase.app` 
    : defaultRtdbUrl;
  
  const rtdbUrl = (firebaseConfig as any).databaseURL || fallbackUrl;
  rtdbInstance = getDatabase(app, rtdbUrl);
} catch (e) {
  console.warn("Could not construct fallbacks for Realtime Database, using standard initialization", e);
  rtdbInstance = getDatabase(app);
}

export const rtdb = rtdbInstance;

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null, shouldThrow = false) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));

  // Dispatch a global custom event so pages can show a friendly warning or offer fallbacks
  if (typeof window !== 'undefined') {
    const errorStr = errInfo.error.toLowerCase();
    if (errorStr.includes('quota') || errorStr.includes('limit exceeded') || errorStr.includes('exhausted')) {
      window.dispatchEvent(new CustomEvent('firestore-quota-exceeded', { detail: errInfo }));
    } else {
      window.dispatchEvent(new CustomEvent('firestore-general-error', { detail: errInfo }));
    }
  }

  if (shouldThrow) {
    throw new Error(JSON.stringify(errInfo));
  }
}

// Function to synchronize a student's profile progress to Firebase Realtime Database.
// This allows students to load the leaderboard without consuming any Firestore reads,
// preventing quota exceeding blocks for the entire academy!
export function syncUserProfileToRTDB(userId: string, profileData: any) {
  if (!rtdb || !userId || !profileData) return;
  if (profileData.email === 'developermike5@gmail.com') return; // Skip admin account

  let totalScore = 0;
  const dayScores: { [dayNum: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let totalQuizzesTaken = 0;

  if (profileData.progress) {
    Object.keys(profileData.progress).forEach((courseId) => {
      const courseProgress = profileData.progress[courseId];
      if (courseProgress && courseProgress.quizScores) {
        const quizScores = courseProgress.quizScores;
        Object.entries(quizScores).forEach(([checkKey, record]: [string, any]) => {
          // Key format: "activeDayIdx-activeVideoIdx" (e.g., "0-1")
          const parts = checkKey.split('-');
          const dayIdx = parseInt(parts[0], 10);
          if (!isNaN(dayIdx)) {
            const dayNum = dayIdx + 1; // 1-indexed (Day 1 to 5)
            const score = typeof record.score === 'number' ? record.score : 0;

            if (dayNum >= 1 && dayNum <= 5) {
              dayScores[dayNum] = (dayScores[dayNum] || 0) + score;
              totalScore += score;
              totalQuizzesTaken += 1;
            }
          }
        });
      }
    });
  }

  // Update Realtime Database leaderboard ref
  try {
    const userRef = ref(rtdb, `leaderboard/${userId}`);
    set(userRef, {
      id: userId,
      fullName: profileData.fullName || 'Anonymous Student',
      state: profileData.state || 'Global',
      email: profileData.email || '',
      totalScore,
      dayScores,
      totalQuizzesTaken,
      lastUpdated: Date.now()
    }).catch(e => {
      console.warn("RTDB write promise rejected (possibly missing rules or auth not fully initialized):", e);
    });
  } catch (err) {
    console.error("RTDB Leaderboard Sync Error: ", err);
  }
}

