import crypto from "crypto";

/**
 * Admin-only endpoint (POST JSON): fully deletes a registered student and
 * cleans up every trace of them across the system.
 * Body: { uid, idToken } — idToken must belong to an admin.
 * Cleans up, in order:
 *   1. assignments documents where userId == uid
 *   2. notifications documents where userId == uid
 *   3. accessCodes/{uid} (server-only login credentials)
 *   4. the users/{uid} document
 *   5. Realtime Database: leaderboards/{cohort}/{uid} + presence/{uid}
 *   6. the Firebase Auth account itself (last, so nothing orphans)
 * Env: FIREBASE_SERVICE_ACCOUNT_JSON, VITE_FIREBASE_API_KEY,
 *      VITE_FIREBASE_FIRESTORE_DATABASE_ID.
 */

const TOKEN_URL = "https://oauth2.googleapis.com/token";

type ServiceAccount = { project_id: string; client_email: string; private_key: string };

let cachedToken: { token: string; exp: number } | null = null;

function loadServiceAccount(): ServiceAccount {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is not set");
  const sa = JSON.parse(raw) as ServiceAccount;
  if (sa.private_key.includes("\\n")) sa.private_key = sa.private_key.replace(/\\n/g, "\n");
  return sa;
}

function b64url(input: crypto.BinaryLike): string {
  return Buffer.from(input as any)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// cloud-platform covers Firestore, RTDB and Identity Toolkit in one scope.
async function getAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.exp - 60 > now) return cachedToken.token;
  const sa = loadServiceAccount();
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/firebase",
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
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${input}.${signature}`,
  });
  if (!res.ok) throw new Error(`google token failed (${res.status}): ${await res.text()}`);
  const data: any = await res.json();
  cachedToken = { token: data.access_token, exp: now + 3600 };
  return data.access_token as string;
}

async function googleFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const token = await getAccessToken();
  const headers: Record<string, string> = { Authorization: `Bearer ${token}`, ...((init.headers as any) || {}) };
  return fetch(url, { ...init, headers });
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(statusCode: number, body: any) {
  return { statusCode, headers: { "Content-Type": "application/json", ...CORS_HEADERS }, body: JSON.stringify(body) };
}

const BOOTSTRAP_UID = "a26a8d1a-84d2-4baf-9e14-c8c2dec6a164";
const BOOTSTRAP_EMAIL = "developermike5@gmail.com";

const FIRESTORE_BASE = (projectId: string, databaseId: string) =>
  `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents`;

function str(fields: any, key: string, fallback = ""): string {
  const f = fields?.[key];
  if (f?.stringValue !== undefined) return f.stringValue;
  if (f?.integerValue !== undefined) return String(f.integerValue);
  return fallback;
}

async function getDocFields(projectId: string, databaseId: string, path: string): Promise<any | null> {
  const res = await googleFetch(`${FIRESTORE_BASE(projectId, databaseId)}/${path}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`firestore get ${path} failed (${res.status})`);
  const data: any = await res.json();
  return data.fields || {};
}

async function deleteDocPath(projectId: string, databaseId: string, path: string): Promise<void> {
  const res = await googleFetch(`${FIRESTORE_BASE(projectId, databaseId)}/${path}`, { method: "DELETE" });
  if (!res.ok && res.status !== 404) throw new Error(`firestore delete ${path} failed (${res.status}): ${await res.text()}`);
}

/** Deletes every doc in `collectionId` where `field` == uid. Returns the count. */
async function deleteDocsWhereUid(projectId: string, databaseId: string, collectionId: string, field: string, uid: string): Promise<number> {
  const res = await googleFetch(`${FIRESTORE_BASE(projectId, databaseId)}:runQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId, allDescendants: false }],
        where: { fieldFilter: { field: { fieldPath: field }, op: "EQUAL", value: { stringValue: uid } } },
        limit: 1000,
      },
    }),
  });
  if (!res.ok) throw new Error(`firestore query ${collectionId} failed (${res.status}): ${await res.text()}`);
  const rows: any[] = await res.json();
  let deleted = 0;
  for (const row of rows) {
    if (!row?.document?.name) continue;
    const rel = row.document.name.split(`/databases/${databaseId}/documents/`)[1];
    if (!rel) continue;
    await deleteDocPath(projectId, databaseId, rel);
    deleted++;
  }
  return deleted;
}

async function deleteAuthUser(projectId: string, uid: string): Promise<void> {
  const res = await googleFetch(`https://identitytoolkit.googleapis.com/v2/projects/${projectId}/accounts:delete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ localId: uid }),
  });
  if (!res.ok) {
    const detail = await res.text();
    // NOT_FOUND just means the account was already gone; treat as done.
    if (res.status !== 404) throw new Error(`auth delete failed (${res.status}): ${detail}`);
  }
}

async function deleteRtdbPaths(rtdbUrl: string, paths: string[]): Promise<void> {
  const token = await getAccessToken();
  for (const p of paths) {
    try {
      const res = await fetch(`${rtdbUrl}/${p}.json?access_token=${encodeURIComponent(token)}`, { method: "DELETE" });
      if (!res.ok && res.status !== 404) console.error(`rtdb delete ${p} failed (${res.status})`);
    } catch (e) {
      console.error(`rtdb delete ${p} failed:`, e);
    }
  }
}

export const handler = async (event: any) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS_HEADERS, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return json(405, { error: "method-not-allowed" });
  }

  let body: any = {};
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "bad-json" });
  }

  try {
    const uid = String(body.uid || "");
    const idToken = String(body.idToken || "");
    if (!uid || !idToken) return json(400, { error: "missing-fields" });
    const apiKey = process.env.VITE_FIREBASE_API_KEY;
    if (!apiKey) return json(500, { error: "not-configured", reason: "missing-api-key" });

    // 1. Verify the caller's token is a real user of this project.
    const lk = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    });
    if (!lk.ok) return json(401, { error: "invalid-admin-token" });
    const info: any = await lk.json();
    const caller = info?.users?.[0];
    const callerUid = caller?.localId;
    if (!callerUid) return json(401, { error: "invalid-admin-token" });

    const sa = loadServiceAccount();
    const projectId = sa.project_id;
    const databaseId =
      process.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || "ai-studio-1aaee609-a922-43e7-9568-0b675490ff78";

    // 2. The caller must be an admin. Same check as the Firestore rules.
    const callerDoc = await getDocFields(projectId, databaseId, `users/${callerUid}`);
    const role = str(callerDoc, "role");
    const baseAdmin =
      callerUid === BOOTSTRAP_UID || String(caller?.email || "").toLowerCase() === BOOTSTRAP_EMAIL;
    let adminsDoc: Record<string, any> = {};
    if (!baseAdmin && !["admin", "super_admin", "superadmin"].includes(role)) {
      try {
        adminsDoc = await getDocFields(projectId, databaseId, `admins/${callerUid}`);
      } catch {
        adminsDoc = {};
      }
    }
    if (!(baseAdmin || ["admin", "super_admin", "superadmin"].includes(role) || Object.keys(adminsDoc).length > 0)) {
      return json(403, { error: "not-admin" });
    }

    // 3. Read the student before anything is removed (cohort needed for RTDB).
    const student = await getDocFields(projectId, databaseId, `users/${uid}`);
    if (!student) return json(404, { error: "student-not-found" });
    const cohort = str(student, "cohort");

    const rtdbUrl =
      process.env.VITE_FIREBASE_DATABASE_URL ||
      "https://gen-lang-client-0862975917-default-rtdb.europe-west1.firebasedatabase.app";

    // 4. Clean up every trace, most granular first, auth account last.
    const assignmentsDeleted = await deleteDocsWhereUid(projectId, databaseId, "assignments", "userId", uid);
    const notificationsDeleted = await deleteDocsWhereUid(projectId, databaseId, "notifications", "userId", uid);
    await deleteDocPath(projectId, databaseId, `accessCodes/${uid}`);
    await deleteDocPath(projectId, databaseId, `users/${uid}`);
    const rtdbPaths = [`presence/${uid}`];
    if (cohort) rtdbPaths.push(`leaderboards/${cohort}/${uid}`);
    await deleteRtdbPaths(rtdbUrl, rtdbPaths);
    await deleteAuthUser(projectId, uid);

    return json(200, {
      ok: true,
      uid,
      deleted: { assignments: assignmentsDeleted, notifications: notificationsDeleted, cohort: cohort || null },
    });
  } catch (e: any) {
    console.error("student-delete failed:", e);
    return json(500, { error: "delete-failed", detail: String(e?.message || e) });
  }
};
