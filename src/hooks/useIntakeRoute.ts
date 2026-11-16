import { useEffect, useState } from 'react';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

/**
 * Where should "Start for Free" style CTAs send new students?
 * - /onboarding when a cohort is actively accepting registrations (settings/cohorts.onboardingActive)
 * - /waitingonboarding otherwise (no active cohort).
 *
 * The read is shared per page load and `ready` says when it settled, so CTAs can
 * wait for the real answer instead of silently sending students to the waiting
 * list while the setting is still loading on a fresh browser.
 */
let intakePromise: Promise<boolean> | null = null;

function readIntakeOpen(): Promise<boolean> {
  if (!intakePromise) {
    intakePromise = (async () => {
      try {
        const snap = await getDoc(doc(db, 'settings', 'cohorts'));
        return snap.exists() && snap.data().onboardingActive === true;
      } catch (err) {
        console.warn('Could not read cohort intake setting; defaulting to waiting list.', err);
        return false;
      }
    })();
  }
  return intakePromise;
}

export function useIntakeRoute(): { route: string; ready: boolean } {
  const [state, setState] = useState<{ route: string; ready: boolean }>({ route: '/waitingonboarding', ready: false });
  useEffect(() => {
    let cancelled = false;
    // Safety valve: never leave CTAs permanently stuck on a slow or blocked read.
    const timeout = setTimeout(() => {
      if (!cancelled) setState(s => (s.ready ? s : { ...s, ready: true }));
    }, 6000);
    readIntakeOpen().then(open => {
      if (!cancelled) setState({ route: open ? '/onboarding' : '/waitingonboarding', ready: true });
    });
    return () => { cancelled = true; clearTimeout(timeout); };
  }, []);
  return state;
}
