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
