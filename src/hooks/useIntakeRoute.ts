import { useEffect, useState } from 'react';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

/**
 * Where should "Start for Free" style CTAs send new students?
 * - /onboarding when a cohort is actively accepting registrations (settings/cohorts.onboardingActive)
 * - /waitingonboarding otherwise (no active cohort). Defaults to the waiting list while loading.
 */
export function useIntakeRoute(): string {
  const [route, setRoute] = useState<string>('/waitingonboarding');
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'settings', 'cohorts'));
        if (!cancelled && snap.exists() && snap.data().onboardingActive === true) {
          setRoute('/onboarding');
        }
      } catch (err) {
        console.warn('Could not read cohort intake setting; defaulting to waiting list.', err);
      }
    })();
    return () => { cancelled = true; };
  }, []);
  return route;
}
