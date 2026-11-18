import { useEffect, useRef } from 'react';
import { doc, increment, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

// Tracks the student's active study time per calendar day (student's local time).
// Seconds only accrue while `active` is true (the student is inside the classroom)
// AND the tab is actually visible. The day's total lives in Firestore on the user
// document under `studyTime.<YYYY-MM-DD>` (seconds), flushed at most once a minute
// and again whenever the tab hides or the tracker unmounts.
export function useStudyTimeTracker(opts: { uid?: string | null; active: boolean }) {
  const { uid, active } = opts;
  const pendingRef = useRef(0);

  useEffect(() => {
    if (!uid || !active) return;

    const localDateKey = () => {
      const d = new Date();
      const m = `${d.getMonth() + 1}`.padStart(2, '0');
      const day = `${d.getDate()}`.padStart(2, '0');
      return `${d.getFullYear()}-${m}-${day}`;
    };

    const flush = (force = false) => {
      const seconds = pendingRef.current;
      if (seconds <= 0) return;
      if (seconds < 60 && !force) return;
      pendingRef.current = 0;
      updateDoc(doc(db, 'users', uid), { [`studyTime.${localDateKey()}`]: increment(seconds) })
        .catch(() => {
          // Offline or throttled: the interval keeps accruing and the next flush retries.
        });
    };

    const tick = setInterval(() => {
      if (document.visibilityState === 'visible') pendingRef.current += 30;
      flush();
    }, 30000);

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush(true);
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearInterval(tick);
      document.removeEventListener('visibilitychange', onVisibility);
      flush(true);
    };
  }, [uid, active]);
}
