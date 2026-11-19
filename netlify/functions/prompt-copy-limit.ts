/**
 * Server-side enforcement of the daily prompt-copy limit.
 *
 * POST { uid }
 * The limit is 3 prompt copies per day for EVERY student (free or paid) and is
 * enforced here, in Firestore, not in the app: the client asks this endpoint
 * before each copy, and the endpoint refuses once the student has copied 3
 * times since the daily reset.
 *
 * The count lives in users/{uid}.promptCopies (an array of timestamps in ms),
 * the same field the app already reads, and resets every day at the
 * appSettings promptLimitResetTime (Nigeria time, default 00:00).
 */

import crypto from "crypto";

const DAILY_LIMIT = 3;

const TOKEN_URL = "https://oauth2.googleapis.com/token";

function b64url(input: crypto.BinaryLike): string {
  return Buffer.from(input as any)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

type ServiceAccount = { project_id: string; client_email: string; private_key: string };

let cachedToken: { token: string; exp: number } | null = null;

function loadServiceAccount(): ServiceAccount {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is not set");
  const sa = JSON.parse(raw) as ServiceAccount;
  if (!sa.private_key || !sa.client_email || !sa.project_id) {
    throw new Error("service account JSON is missing private_key, client_email or project_id");
  }
  if (sa.private_key.includes("\\n")) sa.private_key = sa.private_key.replace(/\\n/g, "\n");
  return sa;
}

async function getAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.exp - 60 > now) return cachedToken.token;
  const sa = loadServiceAccount();
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/datastore",
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3600,
    })
  );
  const input = `${header}.${claims}`;
  const signature = b64url(crypto.createSign("RSA-SHA256").update(input).sign(sa.private_key));
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${input}.${signature}`,
    }).toString(),
  });
  const data: any = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(`token mint failed (${res.status})`);
  }
  cachedToken = { token: data.access_token, exp: now + (data.expires_in || 3600) };
  return cachedToken.token;
}

const json = (statusCode: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status: statusCode,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });

// The last daily reset, in ms, for the promptLimitResetTime wall clock in
// Lagos (UTC+1, no DST). E.g. "00:00" resets at midnight Lagos time.
function lastResetTimestamp(resetTimeStr: string): number {
  const [hh, mm] = (resetTimeStr || "00:00").split(":").map((n) => parseInt(n, 10));
  const h = Number.isFinite(hh) ? hh : 0;
  const m = Number.isFinite(mm) ? mm : 0;
  const lagosNowMs = Date.now() - 60 * 60 * 1000; // Lagos wall clock as if UTC
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(new Date(lagosNowMs));
  const get = (t: string) => parseInt(parts.find((p) => p.type === t)?.value || "0", 10);
  const y = get("year"), mo = get("month"), d = get("day");
  const lh = get("hour"), lm = get("minute");
  const lagosMinutesNow = lh * 60 + lm;
  const resetMinutes = h * 60 + m;
  const daysBack = lagosMinutesNow >= resetMinutes ? 0 : 1;
  const resetLagosWallMs = Date.UTC(y, mo - 1, d - daysBack, h, m, 0, 0);
  return resetLagosWallMs - 60 * 60 * 1000; // back to UTC ms
}

async function readDoc(token: string, projectId: string, path: string): Promise<any> {
  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${path}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) return null;
  return res.json();
}

const copiesField = (copies: number[]) => ({
  fields: {
    promptCopies: { arrayValue: { values: copies.map((t) => ({ integerValue: String(t) })) } },
  },
});

async function writeCopies(token: string, projectId: string, uid: string, copies: number[], userExists: boolean) {
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const body = JSON.stringify(copiesField(copies));
  let res: Response;
  if (userExists) {
    // Existing user document: patch just the promptCopies field.
    res = await fetch(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}?updateMask.fieldPaths=promptCopies`,
      { method: "PATCH", headers, body }
    );
    if (res.ok) return;
    if (res.status !== 404) throw new Error(`copy count update failed (${res.status})`);
  }
  // No user document yet (or it vanished): create it with the count.
  res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users?documentId=${encodeURIComponent(uid)}`,
    { method: "POST", headers, body }
  );
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`copy count create failed (${res.status}): ${detail.slice(0, 300)}`);
  }
}

export default async (req: Request) => {
  if (req.method === "OPTIONS") return json(200, { ok: true });
  if (req.method !== "POST") return json(405, { error: "Method not allowed." });

  let uid = "";
  try {
    uid = (await req.json())?.uid || "";
  } catch {
    return json(400, { error: "Invalid JSON body." });
  }

  // No identity to enforce against (e.g. an admin previewing): allow, don't count.
  if (!uid) return json(200, { allowed: true, remaining: DAILY_LIMIT, limit: DAILY_LIMIT });

  try {
    const token = await getAccessToken();
    const projectId = loadServiceAccount().project_id;

    let resetTimeStr = "00:00";
    const appSettings = await readDoc(token, projectId, "settings/app");
    const stored = appSettings?.fields?.promptLimitResetTime?.stringValue;
    if (stored) resetTimeStr = stored;
    const lastReset = lastResetTimestamp(resetTimeStr);

    const userDoc = await readDoc(token, projectId, `users/${uid}`);
    const userExists = !!userDoc?.fields;
    const values = userDoc?.fields?.promptCopies?.arrayValue?.values || [];
    const copies: number[] = values
      .map((v: any) => Number(v.integerValue ?? v.doubleValue ?? 0))
      .filter((t: number) => Number.isFinite(t) && t > 0);

    const todayCount = copies.filter((t) => t >= lastReset).length;
    if (todayCount >= DAILY_LIMIT) {
      return json(200, { allowed: false, remaining: 0, limit: DAILY_LIMIT });
    }

    const now = Date.now();
    const updated = [...copies.filter((t) => t >= now - 48 * 60 * 60 * 1000), now];
    await writeCopies(token, projectId, uid, updated, userExists);
    return json(200, {
      allowed: true,
      remaining: DAILY_LIMIT - todayCount - 1,
      limit: DAILY_LIMIT,
      updatedCopies: updated,
    });
  } catch (err: any) {
    return json(500, { error: err?.message || "Copy limit check failed." });
  }
};
