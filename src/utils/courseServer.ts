import { auth } from '../firebase';
import { Course } from '../types';

/**
 * Client bridge to the protected Cloudinary course store (/.netlify/functions/course-store).
 * - Students: fetch the latest published copy of a course they are registered for.
 * - Admins: publish the live copy of courses to Cloudinary (single source, no redeploys).
 * Cloudinary keys never reach the browser; every call is authorized by the
 * caller's Firebase ID token.
 */

const ENDPOINT = '/api/course-store';

// Session-level dedupe so we never hammer the store for the same course twice.
const hydratedThisSession = new Set<string>();
const inFlight = new Map<string, Promise<Course | null>>();

async function currentIdToken(): Promise<string | null> {
  try {
    const user: any = (auth as any).currentUser;
    if (!user) return null;
    return await user.getIdToken();
  } catch {
    return null;
  }
}

export function isCourseHydrated(courseId: string): boolean {
  return hydratedThisSession.has(courseId);
}

export async function fetchServerCourse(courseId: string): Promise<Course | null> {
  if (!courseId) return null;
  const existing = inFlight.get(courseId);
  if (existing) return existing;
  const p = (async () => {
    try {
      const token = await currentIdToken();
      if (!token) return null;
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-firebase-id-token': token },
        body: JSON.stringify({ op: 'get', courseId }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (data?.ok && data?.course?.id) {
        hydratedThisSession.add(courseId);
        return data.course as Course;
      }
      return null;
    } catch (e) {
      console.warn('[course-store] fetch failed for', courseId, e);
      return null;
    } finally {
      inFlight.delete(courseId);
    }
  })();
  inFlight.set(courseId, p);
  return p;
}


// Resolve once Firebase Auth has finished restoring the session (or immediately
// when signed out), so callers that run before hydration are not silently no-ops.
function authReady(timeoutMs = 8000): Promise<void> {
  return new Promise((resolve) => {
    const anyAuth = auth as any;
    if (anyAuth.currentUser) return resolve();
    let done = false;
    const finish = () => { if (!done) { done = true; resolve(); } };
    const timer = setTimeout(finish, timeoutMs);
    const unsub = anyAuth.onAuthStateChanged(() => { clearTimeout(timer); unsub(); finish(); });
  });
}

export type CourseGateResult =
  | { status: 'ok'; course: Course }
  | { status: 'needs-code'; codeType: 'ciya' | 'beginner' | 'advanced' }
  | { status: 'invalid-code'; codeType?: 'ciya' | 'beginner' | 'advanced' }
  | { status: 'error' };

// Fetch a course through the server-side access gate. When the course needs an
// access code (the student's CIYA code from their welcome email, or a rotating
// classroom passcode), the server answers with which kind, so the UI can ask
// for the right one. Passing accessCode submits it; a match unlocks the course
// server-side and returns the full content.
export async function fetchServerCourseGated(courseId: string, accessCode?: string): Promise<CourseGateResult> {
  if (!courseId) return { status: 'error' };
  try {
    const token = await currentIdToken();
    if (!token) return { status: 'error' };
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-firebase-id-token': token },
      body: JSON.stringify({ op: 'get', courseId, ...(accessCode ? { accessCode } : {}) }),
    });
    const data = await res.json().catch(() => ({} as any));
    if (res.ok && data?.ok && data?.course?.id) {
      hydratedThisSession.add(courseId);
      return { status: 'ok', course: data.course as Course };
    }
    if (res.status === 403) {
      const err = String(data?.error || '');
      const codeType = data?.codeType;
      if (err === 'access-code-required') return { status: 'needs-code', codeType };
      if (err === 'invalid-access-code') return { status: 'invalid-code', codeType };
    }
    return { status: 'error' };
  } catch (e) {
    console.warn('[course-store] gated fetch failed for', courseId, e);
    return { status: 'error' };
  }
}

// Admin-only: a student's unique CIYA access code (held server-side; students
// can never read it). Used by the admin student-details panel.
export async function getStudentAccessCode(
  uid: string
): Promise<{ ciyaCode?: string; usedForCourseId?: string } | null> {
  if (!uid) return null;
  try {
    const token = await currentIdToken();
    if (!token) return null;
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-firebase-id-token': token },
      body: JSON.stringify({ op: 'student-code', uid }),
    });
    const data = await res.json().catch(() => ({} as any));
    if (!res.ok || !data?.ok) return null;
    return { ciyaCode: data.ciyaCode, usedForCourseId: data.usedForCourseId };
  } catch (e) {
    console.warn('[course-store] student-code fetch failed:', e);
    return null;
  }
}

export async function fetchAllServerCourses(): Promise<Course[]> {
  try {
    await authReady();
    const token = await currentIdToken();
    if (!token) return [];
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-firebase-id-token': token },
      body: JSON.stringify({ op: 'get', courseId: 'all' }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const courses: any[] = Array.isArray(data?.courses) ? data.courses : [];
    courses.forEach((c) => { if (c?.id) hydratedThisSession.add(String(c.id)); });
    return courses as Course[];
  } catch (e) {
    console.warn('[course-store] admin fetch-all failed:', e);
    return [];
  }
}

export async function publishCoursesToServer(
  courses: Course[]
): Promise<{ ok: boolean; published?: number; failed?: number; error?: string }> {
  try {
    const token = await currentIdToken();
    if (!token) return { ok: false, error: 'not signed in' };
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-firebase-id-token': token },
      body: JSON.stringify({ op: 'publish', courses }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data?.error || `HTTP ${res.status}` };
    const results: any[] = Array.isArray(data.results) ? data.results : [];
    const failed = results.filter((r) => !r.ok);
    return {
      ok: data.ok !== false && failed.length === 0,
      published: results.length - failed.length,
      failed: failed.length,
      error: failed.length ? failed.map((f) => `${f.id}: ${f.error}`).join('; ') : undefined,
    };
  } catch (e: any) {
    return { ok: false, error: e?.message || String(e) };
  }
}

export async function deleteServerCourse(courseId: string): Promise<boolean> {
  try {
    const token = await currentIdToken();
    if (!token) return false;
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-firebase-id-token': token },
      body: JSON.stringify({ op: 'delete', courseId }),
    });
    const data = await res.json().catch(() => ({}));
    return !!res.ok && data?.ok !== false;
  } catch (e) {
    console.warn('[course-store] delete failed for', courseId, e);
    return false;
  }
}

export async function hydrateRegisteredCourses(
  courseIds: string[],
  onEach?: (c: Course) => void
): Promise<void> {
  const pending = courseIds.filter((id) => id && !hydratedThisSession.has(id) && !inFlight.has(id));
  await Promise.all(
    pending.map(async (id) => {
      const c = await fetchServerCourse(id);
      if (c && onEach) onEach(c);
    })
  );
}


// Drafts: admin-only working copies of courses, auto-saved on every edit.
// Students only ever read the published store; Publish promotes the draft.
export async function saveCourseDrafts(
  courses: Course[]
): Promise<{ ok: boolean; saved?: number; skipped?: number; error?: string }> {
  try {
    const token = await currentIdToken();
    if (!token) return { ok: false, error: 'not signed in' };
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-firebase-id-token': token },
      body: JSON.stringify({ op: 'draft-save', courses }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data?.error || `HTTP ${res.status}` };
    const results: any[] = Array.isArray(data?.results) ? data.results : [];
    const skipped = results.filter((r) => !r.ok && r.skipped);
    const failed = results.filter((r) => !r.ok && !r.skipped);
    return {
      ok: data.ok !== false && failed.length === 0,
      saved: results.filter((r) => r.ok).length,
      skipped: skipped.length,
      error: failed.length ? failed.map((f) => `${f.id}: ${f.error}`).join('; ') : undefined,
    };
  } catch (e: any) {
    return { ok: false, error: e?.message || String(e) };
  }
}

export async function fetchAllDraftsCourses(): Promise<Course[]> {
  try {
    await authReady();
    const token = await currentIdToken();
    if (!token) return [];
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-firebase-id-token': token },
      body: JSON.stringify({ op: 'draft-get' }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.courses) ? (data.courses as Course[]) : [];
  } catch (e) {
    console.warn('[course-store] admin draft fetch failed:', e);
    return [];
  }
}

// Admin working copies: unpublished drafts override the published copy of the
// same course, so the editor always opens with the latest saved edits.
export async function fetchAdminWorkingCopies(): Promise<Course[]> {
  const [published, drafts] = await Promise.all([fetchAllServerCourses(), fetchAllDraftsCourses()]);
  const map = new Map<string, Course>();
  published.forEach((c) => { if (c?.id) map.set(String(c.id), c); });
  drafts.forEach((c) => { if (c?.id) map.set(String(c.id), c); });
  return Array.from(map.values());
}
