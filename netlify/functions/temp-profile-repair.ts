import crypto from "crypto";

/**
 * TEMPORARY one-off repair tool (remove after use).
 * POST { email, fields: { name: string|number|boolean } }
 * Looks up the auth uid by email, reads users/{uid} (plus accessCodes/{uid} and
 * the RTDB mirror for reference), then writes ONLY the supplied fields using a
 * per-field updateMask, so nothing else on the document is touched.
 * Returns before/after snapshots for verification.
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

function b64url(input: Buffer): string {
  return input.toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

async function getAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.exp - 60 > now) return cachedToken.token;
  const sa = loadServiceAccount();
  const header = b64url(Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })));
  const claims = b64url(
    Buffer.from(
      JSON.stringify({
        iss: sa.client_email,
        scope:
          "https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/firebase https://www.googleapis.com/auth/datastore",
        aud: TOKEN_URL,
        iat: now,
        exp: now + 3600,
      })
    )
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
  if (!res.ok || !data.access_token) throw new Error(`token mint failed (${res.status})`);
  cachedToken = { token: data.access_token, exp: now + (data.expires_in || 3600) };
  return cachedToken.token;
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(statusCode: number, body: any) {
  return { statusCode, headers: { "Content-Type": "application/json", ...CORS_HEADERS }, body: JSON.stringify(body) };
}

const S = (v: string) => ({ stringValue: String(v) });
const B = (v: boolean) => ({ booleanValue: !!v });
const N = (v: number) => ({ integerValue: String(Math.round(v)) });
const TS = (ms: number) => ({ timestampValue: new Date(ms).toISOString() });

function plain(fields: any): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(fields || {})) {
    if (typeof v !== "object" || v === null) continue;
    const anyV = v as any;
    if (anyV.stringValue !== undefined) out[k] = anyV.stringValue;
    else if (anyV.booleanValue !== undefined) out[k] = anyV.booleanValue;
    else if (anyV.integerValue !== undefined) out[k] = Number(anyV.integerValue);
    else if (anyV.doubleValue !== undefined) out[k] = Number(anyV.doubleValue);
    else if (anyV.timestampValue !== undefined) out[k] = anyV.timestampValue;
    else out[k] = anyV;
  }
  return out;
}

const handler = async (event: any) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: CORS_HEADERS, body: "" };
  if (event.httpMethod !== "POST") return json(405, { ok: false, error: "method-not-allowed" });
  try {
    const body = typeof event.body === "string" ? JSON.parse(event.body) : event.body || {};
    const email = String(body?.email || "").trim().toLowerCase();
    const fieldsIn = body?.fields && typeof body.fields === "object" ? body.fields : null;
    if (!email) return json(400, { ok: false, error: "email required" });

    const sa = loadServiceAccount();
    const projectId = sa.project_id;
    const databaseId =
      process.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || "ai-studio-1aaee609-a922-43e7-9568-0b675490ff78";
    const base = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents`;
    const token = await getAccessToken();
    const authHeaders = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

    // 1. uid by email
    const lkRes = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:lookup`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ email: [email] }),
    });
    const lk: any = await lkRes.json();
    const localId = String(lk?.users?.[0]?.localId || "");
    const displayName = String(lk?.users?.[0]?.displayName || "");
    if (!localId) return json(200, { ok: false, error: "no-auth-user", lookup: lk });

    // 2. current doc
    const getRes = await fetch(`${base}/users/${localId}`, { headers: { Authorization: `Bearer ${token}` } });
    const docData: any = getRes.ok ? await getRes.json() : {};
    const before = plain(docData?.fields || {});

    // 3. reference reads: accessCodes doc and the RTDB mirror
    const acRes = await fetch(`${base}/accessCodes/${localId}`, { headers: { Authorization: `Bearer ${token}` } });
    const accessCodes = acRes.ok ? plain((await acRes.json())?.fields || {}) : null;
    let rtdbMirror: any = null;
    try {
      const rtdbBase =
        process.env.VITE_FIREBASE_DATABASE_URL ||
        "https://gen-lang-client-0862975917-default-rtdb.europe-west1.firebasedatabase.app";
      const rRes = await fetch(`${rtdbBase}/users/${localId}.json?access_token=${encodeURIComponent(token)}`);
      if (rRes.ok) rtdbMirror = await rRes.json();
      else rtdbMirror = { error: rRes.status };
    } catch (e: any) {
      rtdbMirror = { error: String(e?.message || e) };
    }

    // 4. write the supplied fields with a per-field mask (merge, never replace)
    let applied: string[] = [];
    if (fieldsIn) {
      const writeFields: any = {};
      const masks: string[] = [];
      for (const [k, v] of Object.entries(fieldsIn)) {
        writeFields[k] =
          typeof v === "boolean" ? B(v) : typeof v === "number" ? N(v) : k.toLowerCase().includes("at") && String(v).length === 0 ? TS(Date.now()) : S(String(v));
        masks.push(`updateMask.fieldPaths=${encodeURIComponent(k)}`);
      }
      const patchRes = await fetch(`${base}/users/${localId}?${masks.join("&")}`, {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({ fields: writeFields }),
      });
      if (!patchRes.ok) {
        return json(200, { ok: false, error: "patch-failed", detail: (await patchRes.text()).slice(0, 500), before });
      }
      applied = Object.keys(fieldsIn);
      const afterRes = await fetch(`${base}/users/${localId}`, { headers: { Authorization: `Bearer ${token}` } });
      const afterData: any = afterRes.ok ? await afterRes.json() : {};
      return json(200, {
        ok: true,
        uid: localId,
        authDisplayName: displayName,
        before,
        applied,
        after: plain(afterData?.fields || {}),
        accessCodes,
        rtdbMirror,
      });
    }

    return json(200, { ok: true, uid: localId, authDisplayName: displayName, before, accessCodes, rtdbMirror });
  } catch (err: any) {
    return json(500, { ok: false, error: String(err?.message || err) });
  }
};

export { handler };
