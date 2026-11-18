import crypto from "crypto";

/**
 * Access-code service.
 *
 * The real CIYA access code (CIYA-XXXX-XXXX, delivered to the student in the
 * welcome email) lives server-side in the accessCodes collection. Firestore
 * rules deny all web clients a read there, so every read goes through this
 * function with a verified Firebase ID token.
 *
 * - op "list"   (admin only): returns { codes: { uid: ciyaCode } } for every
 *   registered student, so the admin can read a student's code back to them
 *   when they lost or deleted the welcome email.
 * - op "verify" (student): compares a typed code against the caller's own
 *   accessCodes document (used by the dashboard access gate). The comparison
 *   happens here; the student client never sees the stored code.
 */

type ServiceAccount = { project_id: string; client_email: string; private_key: string };

const TOKEN_URL = "https://oauth2.googleapis.com/token";
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

function b64url(input: crypto.BinaryLike): string {
  return Buffer.from(input as any)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function getAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.exp - 60 > now) return cachedToken.token;
  const sa = loadServiceAccount();
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(
    JSON.stringify({
      iss: sa.client_email,
      scope:
        "https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/firebase https://www.googleapis.com/auth/datastore",
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
    throw new Error(`token mint failed (${res.status}): ${JSON.stringify(data)}`);
  }
  cachedToken = { token: data.access_token, exp: now + (data.expires_in || 3600) };
  return cachedToken.token;
}

async function googleFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const token = await getAccessToken();
  const headers: Record<string, string> = { Authorization: `Bearer ${token}`, ...((init.headers as any) || {}) };
  return fetch(url, { ...init, headers });
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-firebase-id-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(statusCode: number, body: any) {
  return { statusCode, headers: { "Content-Type": "application/json", ...CORS_HEADERS }, body: JSON.stringify(body) };
}

async function verifyIdToken(idToken: string): Promise<{ uid: string; email: string }> {
  const webKey = process.env.VITE_FIREBASE_API_KEY;
  if (!webKey) throw new Error("VITE_FIREBASE_API_KEY is not configured");
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${webKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.users || !data.users.length) {
    throw new Error("invalid id token");
  }
  return {
    uid: String(data.users[0].localId),
    email: String(data.users[0].email || "").toLowerCase(),
  };
}

async function isAdminUid(projectId: string, databaseId: string, uid: string): Promise<boolean> {
  const res = await googleFetch(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/admins/${uid}`
  );
  return res.ok;
}

function codeOf(fields: any): string {
  const v = fields?.ciyaCode;
  return typeof v?.stringValue === "string" ? v.stringValue : "";
}

async function handler(event: any) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: CORS_HEADERS, body: "" };
  }
  if (event.httpMethod !== "POST") return json(405, { error: "Method Not Allowed" });

  let body: any = {};
  try {
    body = event.body ? JSON.parse(event.body) : {};
  } catch {
    body = {};
  }
  const op = String(body.op || "");

  try {
    const idToken =
      event.headers["x-firebase-id-token"] || event.headers["X-Firebase-Id-Token"] || body.idToken || "";
    if (!idToken) return json(401, { error: "missing id token" });
    const caller = await verifyIdToken(idToken);
    const sa = loadServiceAccount();
    const projectId = sa.project_id;
    const databaseId =
      process.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || "ai-studio-1aaee609-a922-43e7-9568-0b675490ff78";
    const base = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents`;

    if (op === "list") {
      const admin = await isAdminUid(projectId, databaseId, caller.uid);
      if (!admin) return json(403, { error: "caller is not an admin" });
      const codes: Record<string, string> = {};
      let pageToken = "";
      for (;;) {
        const url = `${base}/accessCodes?pageSize=300${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ""}`;
        const res = await googleFetch(url);
        if (!res.ok) throw new Error(`accessCodes list failed (${res.status})`);
        const data: any = await res.json();
        for (const doc of data.documents || []) {
          const uid = String(doc?.name || "").split("/").pop() || "";
          const code = codeOf(doc?.fields);
          if (uid && code) codes[uid] = code;
        }
        pageToken = data.nextPageToken || "";
        if (!pageToken) break;
      }
      return json(200, { codes });
    }

    if (op === "purge-admincodes") {
      // One-time cleanup: strip the retired legacy adminCode field from every
      // user document. The service account writes directly, so this works
      // regardless of what the web-client Firestore rules allow.
      const admin = await isAdminUid(projectId, databaseId, caller.uid);
      if (!admin) return json(403, { error: "caller is not an admin" });
      let checked = 0;
      let removed = 0;
      let pageToken = "";
      for (;;) {
        const url = `${base}/users?pageSize=300${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ""}&mask.fieldPaths=adminCode`;
        const res = await googleFetch(url);
        if (!res.ok) throw new Error(`users list failed (${res.status})`);
        const data: any = await res.json();
        for (const doc of data.documents || []) {
          checked += 1;
          if (!doc?.fields?.adminCode) continue;
          const uid = String(doc?.name || "").split("/").pop() || "";
          if (!uid) continue;
          const patch = await googleFetch(
            `${base}/users/${uid}?updateMask=adminCode`,
            { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fields: {} }) }
          );
          if (patch.ok) removed += 1;
          else console.error(`adminCode purge failed for ${uid} (${patch.status})`);
        }
        pageToken = data.nextPageToken || "";
        if (!pageToken) break;
      }
      return json(200, { removed, checked });
    }

    if (op === "verify") {
      const typed = String(body.code || "").trim().toUpperCase();
      if (!typed) return json(400, { ok: false, error: "missing code" });
      const res = await googleFetch(`${base}/accessCodes/${caller.uid}`);
      if (!res.ok) return json(200, { ok: false, reason: "no-code" });
      const doc: any = await res.json();
      const real = codeOf(doc?.fields).trim().toUpperCase().replace(/[-\s]/g, "");
      const typedNorm = typed.toUpperCase().replace(/[-\s]/g, "");
      // A partial CIYA code reads as an incomplete entry, never as simply wrong.
      if (real && typedNorm !== real && typedNorm.length >= 4 && typedNorm.length < real.length && real.startsWith(typedNorm)) {
        return json(200, { ok: false, reason: "incomplete" });
      }
      return json(200, { ok: !!real && real === typedNorm });
    }

    return json(400, { error: "unknown op" });
  } catch (e: any) {
    console.error("access-codes failed:", e?.message || e);
    return json(500, { error: e?.message || "access-codes failed" });
  }
}


// Modern Netlify Functions runtime (v2): adapts the legacy Lambda-style
// handler above so the function deploys on the new runtime, which reads
// environment variables at runtime instead of injecting them at creation
// (removes the 4KB env-var limit of Lambda compatibility mode).
export default async (req: Request) => {
  const url = new URL(req.url);
  const buf = Buffer.from(await req.arrayBuffer());
  const ct = req.headers.get("content-type") || "";
  const isText = buf.length === 0 || /json|text|urlencoded|multipart|form/.test(ct);
  const event: any = {
    path: url.pathname,
    httpMethod: req.method,
    headers: Object.fromEntries(req.headers.entries()),
    queryStringParameters: Object.fromEntries(url.searchParams.entries()),
    body: isText ? (buf.toString("utf8") || null) : buf.toString("base64"),
    isBase64Encoded: !isText,
  };
  const result: any = await handler(event);
  if (!result || typeof result.statusCode !== "number") {
    return new Response(JSON.stringify({ error: "Function returned no response" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
  const headers: Record<string, string> = {};
  for (const [k, v] of Object.entries(result.headers || {})) {
    if (v != null) headers[k] = String(v);
  }
  const payload = result.isBase64Encoded
    ? Buffer.from(String(result.body ?? ""), "base64")
    : (result.body ?? "");
  return new Response(payload, { status: result.statusCode, headers });
};
