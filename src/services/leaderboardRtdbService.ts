import {
  ref,
  get,
  set,
  update,
  remove,
  onValue
} from 'firebase/database';
import { rtdb } from '../firebase';
import { safeStorage } from '../utils/safeStorage';

/**
 * Live leaderboard service backed by Firebase Realtime Database.
 *
 * Firestore stays the source of truth for progress. Whenever a student's
 * progress changes (lesson watched, check passed, quiz scored, course
 * completed) the aggregated entry for that student is mirrored into
 * `leaderboards/{cohort}/{uid}` in Realtime Database. Every connected
 * dashboard subscribes to that node with a native RTDB listener, so the
 * board updates for everyone in real time without billing a Firestore
 * read per document on every change.
 */

export interface LiveLeaderboardEntry {
  uid: string;
  rank: number;
  fullName: string;
  email: string;
  cohort: string;
  lessonsCompleted: number;
  quizzesPassed: number;
  totalScore: number;
  currentCourse: string;
  updatedAt?: number;
}

export const LEADERBOARD_RTDB_ROOT = 'leaderboards';

// Legacy cohorts stay off the live board permanently.
export function isLegacyCohort(cohort: string | undefined | null): boolean {
  return cohort === 'Cohort 1' || cohort === 'Cohort 2';
}

// Admin accounts never appear on the board.
export function isLeaderboardExcluded(user: any): boolean {
  if (!user) return true;
  const email = String(user.email || '').toLowerCase();
  return user.role === 'admin' || email === 'developermike5@gmail.com';
}

/**
 * Same gamified formula the admin console uses:
 * (lessons watched * 15) + (quizzes passed * 50) + sum of quiz scores.
 */
export function computeLeaderboardStats(user: any): {
  lessonsCompleted: number;
  quizzesPassed: number;
  aggregateQuizScore: number;
} {
  const progressStore = user?.progress || {};
  let lessonsCompleted = 0;
  let quizzesPassed = 0;
  let aggregateQuizScore = 0;

  Object.keys(progressStore).forEach((courseId) => {
    const courseData = progressStore[courseId] || {};

    if (Array.isArray(courseData.watched)) {
      lessonsCompleted += courseData.watched.length;
    }

    if (Array.isArray(courseData.checkPassed)) {
      quizzesPassed += courseData.checkPassed.length;
    }

    if (courseData.quizScores && typeof courseData.quizScores === 'object') {
      Object.values(courseData.quizScores).forEach((val: any) => {
        // quizScores values are score records like { score, passed, ... }
        const scoreNum =
          val && typeof val === 'object' ? Number(val.score) || 0 : Number(val) || 0;
        aggregateQuizScore += scoreNum;
      });
    }
  });

  return { lessonsCompleted, quizzesPassed, aggregateQuizScore };
}

export function buildLeaderboardEntry(user: any): LiveLeaderboardEntry | null {
  const uid = user?.uid || user?.id;
  if (!uid) return null;

  const cohort = user?.cohort || 'Cohort 1';
  if (isLegacyCohort(cohort)) return null;

  const { lessonsCompleted, quizzesPassed, aggregateQuizScore } =
    computeLeaderboardStats(user);

  return {
    uid,
    rank: 0,
    fullName: user?.fullName || user?.displayName || 'Anonymous Student',
    email: user?.email || 'N/A',
    cohort,
    lessonsCompleted,
    quizzesPassed,
    totalScore: lessonsCompleted * 15 + quizzesPassed * 50 + aggregateQuizScore,
    currentCourse:
      user?.courseType || user?.pathwaySelection || 'Beginners Syllabus',
    updatedAt: Date.now()
  };
}

/** Mirror one student's current stats onto the live board (their own node). */
export async function upsertLeaderboardEntry(user: any): Promise<void> {
  if (isLeaderboardExcluded(user)) return;
  const entry = buildLeaderboardEntry(user);
  if (!entry) return;

  await set(
    ref(rtdb, `${LEADERBOARD_RTDB_ROOT}/${entry.cohort}/${entry.uid}`),
    entry
  );
}

export async function removeLeaderboardEntry(
  cohort: string,
  uid: string
): Promise<void> {
  await remove(ref(rtdb, `${LEADERBOARD_RTDB_ROOT}/${cohort}/${uid}`));
}

/**
 * Admin action: recount every student of a cohort from Firestore data and
 * publish the whole board in one multi-path write.
 * Returns the number of students written.
 */
export async function seedLeaderboardCohort(
  cohort: string,
  users: any[]
): Promise<number> {
  if (isLegacyCohort(cohort)) return 0;

  const entries: LiveLeaderboardEntry[] = [];

  users.forEach((user) => {
    if (isLeaderboardExcluded(user)) return;
    const entry = buildLeaderboardEntry(user);
    // Only students whose actual cohort matches the board being published.
    if (!entry || entry.cohort !== cohort) return;
    entries.push(entry);
  });

  // Rank 1..n before writing so the stored board reads correctly too.
  const ranked = sortLeaderboardEntries(entries);
  const updates: Record<string, LiveLeaderboardEntry | null> = {};
  ranked.forEach((entry) => {
    updates[entry.uid] = entry;
  });

  // Drop stale rows (students who moved cohort or left) so a re-publish
  // always leaves the node exactly matching the Firestore source.
  const boardRef = ref(rtdb, `${LEADERBOARD_RTDB_ROOT}/${cohort}`);
  const existing = await get(boardRef);
  Object.keys(existing.val() || {}).forEach((key) => {
    if (!updates[key]) updates[key] = null;
  });

  await update(boardRef, updates);
  return ranked.length;
}

/** Score desc, then lessons, then alphabetical. Same order the admin uses. */
export function sortLeaderboardEntries(
  entries: LiveLeaderboardEntry[]
): LiveLeaderboardEntry[] {
  const sorted = [...entries].sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    if (b.lessonsCompleted !== a.lessonsCompleted)
      return b.lessonsCompleted - a.lessonsCompleted;
    return a.fullName.localeCompare(b.fullName);
  });

  return sorted.map((entry, index) => ({ ...entry, rank: index + 1 }));
}

/**
 * Native RTDB listener for one cohort's board. Fires within milliseconds of
 * any student's score changing. Returns the unsubscribe function.
 */
export function subscribeCohortLeaderboard(
  cohort: string,
  cb: (entries: LiveLeaderboardEntry[]) => void,
  onError?: (err: any) => void
): () => void {
  const boardRef = ref(rtdb, `${LEADERBOARD_RTDB_ROOT}/${cohort}`);

  return onValue(
    boardRef,
    (snap) => {
      const raw = snap.val() || {};
      const entries: LiveLeaderboardEntry[] = Object.keys(raw)
        .map((key) => ({ ...(raw[key] as LiveLeaderboardEntry) }))
        .filter((e) => e && e.uid);
      cb(sortLeaderboardEntries(entries));
    },
    (err) => {
      console.warn('[leaderboard-rtdb] listener error:', err);
      if (onError) onError(err);
    }
  );
}

// Cached last board so the widget paints instantly before the first tick.
const LIVE_CACHE_KEY = 'ciya_live_leaderboard_cache';

export function cacheLiveLeaderboard(cohort: string, entries: LiveLeaderboardEntry[]) {
  try {
    safeStorage.setItem(LIVE_CACHE_KEY, JSON.stringify({ cohort, entries }));
  } catch (e) {
    // ignore
  }
}

export function readCachedLiveLeaderboard(): { cohort: string; entries: LiveLeaderboardEntry[] } | null {
  try {
    const stored = safeStorage.getItem(LIVE_CACHE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    if (parsed && parsed.cohort && Array.isArray(parsed.entries)) return parsed;
    return null;
  } catch (e) {
    return null;
  }
}
