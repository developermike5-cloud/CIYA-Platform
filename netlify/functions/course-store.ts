import crypto from "crypto";

/**
 * Protected course content store backed by Cloudinary.
 *
 * Each course's full material (days, videos, assignments, checks) lives in
 * Cloudinary as a single authenticated (non-public) raw JSON file. Admins
 * publish the live copy through this function; students fetch it through this
 * function, which verifies their identity and registration before returning
 * anything. Cloudinary keys and the Firebase service account stay server-side.
 *
 * Ops (POST JSON): publish (admin) | get (registered student or admin) | delete (admin)
 */

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const PUBLIC_ID_PREFIX = "ciya-course-store/";

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

function json(statusCode: number, body: unknown) {
  return { statusCode, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

function fieldsToValues(f: any): any {
  if (f === null || f === undefined) return null;
  if (f.stringValue !== undefined) return f.stringValue;
  if (f.booleanValue !== undefined) return f.booleanValue;
  if (f.integerValue !== undefined) return Number(f.integerValue);
  if (f.doubleValue !== undefined) return Number(f.doubleValue);
  if (f.arrayValue !== undefined) return (f.arrayValue.values || []).map(fieldsToValues);
  if (f.mapValue !== undefined) {
    const o: Record<string, any> = {};
    Object.keys(f.mapValue.fields || {}).forEach((k) => (o[k] = fieldsToValues(f.mapValue.fields[k])));
    return o;
  }
  return null;
}

function cloudinaryCreds() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.VITE_CLOUDINARY_CLOUD_NAME || "dqrhmr7ms";
  const apiKey = process.env.CLOUDINARY_API_KEY || process.env.VITE_CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET || process.env.VITE_CLOUDINARY_API_SECRET;
  if (!apiKey || !apiSecret) {
    throw new Error("Cloudinary credentials not configured on serverless environment.");
  }
  return { cloudName, apiKey, apiSecret };
}

// Cloudinary upload/destroy signature: sorted params minus file/api_key/resource_type, then the secret.
function signParams(params: Record<string, string>, apiSecret: string): string {
  const toSign = Object.keys(params)
    .filter((k) => k !== "file" && k !== "api_key" && k !== "resource_type")
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return crypto.createHash("sha1").update(`${toSign}${apiSecret}`).digest("hex");
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

async function getRegisteredCourseIds(projectId: string, databaseId: string, uid: string): Promise<string[]> {
  const ids: string[] = [];
  const res = await googleFetch(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/users/${uid}`
  );
  if (res.ok) {
    const doc: any = await res.json().catch(() => null);
    const data = fieldsToValues({ mapValue: { fields: doc?.fields || {} } }) || {};
    if (Array.isArray(data.registeredCourses)) {
      data.registeredCourses.forEach((x: any) => {
        if (typeof x === "string") ids.push(x);
        else if (x && typeof x === "object" && x.id) ids.push(String(x.id));
      });
    }
    if (data.progress && typeof data.progress === "object") {
      Object.keys(data.progress).forEach((k) => {
        if (data.progress[k]?.accessStatus !== "revoked") ids.push(k);
      });
    }
  }
  return ids;
}

export async function handler(event: any) {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, x-firebase-id-token",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
      body: "",
    };
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
    const idToken = event.headers["x-firebase-id-token"] || event.headers["X-Firebase-Id-Token"];
    if (!idToken) return json(401, { error: "missing id token" });
    const caller = await verifyIdToken(idToken);
    const sa = loadServiceAccount();
    const projectId = sa.project_id;
    const databaseId = process.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || "ai-studio-1aaee609-a922-43e7-9568-0b675490ff78";
    const { cloudName, apiKey, apiSecret } = cloudinaryCreds();

    if (op === "publish") {
      const admin = await isAdminUid(projectId, databaseId, caller.uid);
      if (!admin) return json(403, { error: "caller is not an admin" });
      const courses = Array.isArray(body.courses) ? body.courses : [];
      if (!courses.length) return json(400, { error: "no courses to publish" });
      const results: any[] = [];
      for (const c of courses) {
        if (!c || !c.id) {
          results.push({ id: c?.id || "(missing id)", ok: false, error: "course has no id" });
          continue;
        }
        const publicId = PUBLIC_ID_PREFIX + String(c.id);
        const payload = JSON.stringify(c);
        const timestamp = String(Math.floor(Date.now() / 1000));
        const params: Record<string, string> = {
          public_id: publicId,
          timestamp,
          type: "authenticated",
          overwrite: "true",
          invalidate: "true",
        };
        const signature = signParams(params, apiSecret);
        const form = new URLSearchParams({
          file: `data:application/json;base64,${Buffer.from(payload).toString("base64")}`,
          api_key: apiKey,
          ...params,
          signature,
        });
        const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/raw/upload`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: form.toString(),
        });
        const data = await res.json().catch(() => ({}));
        results.push({
          id: String(c.id),
          ok: !!res.ok,
          error: res.ok ? undefined : (data?.error?.message || `HTTP ${res.status}`),
          bytes: payload.length,
        });
      }
      const failed = results.filter((r) => !r.ok);
      return json(200, { ok: failed.length === 0, results });
    }

    if (op === "get") {
      const courseId = String(body.courseId || "").trim();
      if (!courseId) return json(400, { error: "missing courseId" });
      const admin = await isAdminUid(projectId, databaseId, caller.uid);
      let registered = false;
      if (!admin) {
        const ids = await getRegisteredCourseIds(projectId, databaseId, caller.uid);
        registered = ids.includes(courseId);
      }
      if (!admin && !registered) {
        return json(403, { error: "not registered for this course" });
      }
      const publicId = PUBLIC_ID_PREFIX + courseId;
      const ts = String(Math.floor(Date.now() / 1000));
      // Authenticated assets need a signed delivery URL. Cloudinary signs the
      // sorted query params; the strictest signing mode also expects
      // public_id inside the signature, so try that variant too.
      const attempts = [
        crypto.createHash("sha1").update(`timestamp=${ts}${apiSecret}`).digest("hex"),
        crypto.createHash("sha1").update(`public_id=${publicId}&timestamp=${ts}${apiSecret}`).digest("hex"),
      ];
      let res: Response | null = null;
      let lastStatus = 0;
      for (const sig of attempts) {
        const url = `https://res.cloudinary.com/${cloudName}/raw/authenticated/${publicId}?api_key=${apiKey}&timestamp=${ts}&signature=${sig}`;
        res = await fetch(url);
        lastStatus = res.status;
        if (res.ok) break;
      }
      if (!res || !res.ok) {
        return json(404, { error: "course not published to the store yet", cloudinaryStatus: lastStatus });
      }
      const text = await res.text();
      let course: any;
      try {
        course = JSON.parse(text);
      } catch {
        return json(500, { error: "stored course file is not valid JSON" });
      }
      return json(200, { ok: true, course });
    }

    if (op === "delete") {
      const admin = await isAdminUid(projectId, databaseId, caller.uid);
      if (!admin) return json(403, { error: "caller is not an admin" });
      const courseId = String(body.courseId || "").trim();
      if (!courseId) return json(400, { error: "missing courseId" });
      const publicId = PUBLIC_ID_PREFIX + courseId;
      const timestamp = String(Math.floor(Date.now() / 1000));
      const params: Record<string, string> = { public_id: publicId, timestamp, type: "authenticated", invalidate: "true" };
      const signature = signParams(params, apiSecret);
      const form = new URLSearchParams({ api_key: apiKey, ...params, signature });
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/raw/destroy`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: form.toString(),
      });
      const data = await res.json().catch(() => ({}));
      return json(200, { ok: !!res.ok, result: data?.result || null, error: res.ok ? undefined : (data?.error?.message || `HTTP ${res.status}`) });
    }

    return json(400, { error: "unknown op", ops: ["publish", "get", "delete"] });
  } catch (err: any) {
    return json(500, { error: err.message || String(err) });
  }
}
