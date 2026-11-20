import crypto from "crypto";

/**
 * TEMPORARY one-shot setup endpoint (remove after running).
 * POST /api/temp-index-setup → lists existing Firestore composite indexes and
 * creates any in DESIRED_INDEXES that are missing.
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
  return Buffer.from(input as any).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
async function getAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.exp - 60 > now) return cachedToken.token;
  const sa = loadServiceAccount();
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(JSON.stringify({ iss: sa.client_email, scope: "https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/datastore", aud: TOKEN_URL, iat: now, exp: now + 3600 }));
  const input = `${header}.${claims}`;
  const signature = b64url(crypto.createSign("RSA-SHA256").update(input).sign(sa.private_key));
  const res = await fetch(TOKEN_URL, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${input}.${signature}` });
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
const CORS_HEADERS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
function json(statusCode: number, body: any) {
  return { statusCode, headers: { "Content-Type": "application/json", ...CORS_HEADERS }, body: JSON.stringify(body) };
}

const PROJECT_ID = "gen-lang-client-0862975917";
const DATABASE_ID = "ai-studio-1aaee609-a922-43e7-9568-0b675490ff78";
const BASE = `https://firestore.googleapis.com/v1beta2/projects/${PROJECT_ID}/databases/${DATABASE_ID}`;
const DESIRED_INDEXES: any[] = [
  {
    collectionId: "kycb_questionnaires",
    fields: [
      { fieldPath: "userId", order: "ASCENDING" },
      { fieldPath: "createdAt", order: "DESCENDING" },
    ],
  },
];

export const handler = async () => {
  try {
    const listRes = await googleFetch(`${BASE}/indexes?pageSize=200`);
    if (!listRes.ok) return json(502, { ok: false, error: `list failed (${listRes.status}): ${await listRes.text()}` });
    const listData: any = await listRes.json();
    const existing = (listData.indexes || []).map((i: any) => ({ name: i.name, collectionId: i.collectionId, fields: (i.fields || []).map((f: any) => `${f.fieldPath}:${f.order || "ASCENDING"}`), state: i.state, queryScope: i.queryScope }));
    const results: any[] = [];
    for (const want of DESIRED_INDEXES) {
      const sig = want.fields.map((f: any) => `${f.fieldPath}:${f.order}`).sort().join("|");
      const dup = existing.find((e: any) => e.collectionId === want.collectionId && JSON.stringify([...e.fields].sort()) === JSON.stringify(sig.split("|")));
      if (dup) { results.push({ index: want.collectionId, action: "already-exists", state: dup.state }); continue; }
      const createRes = await googleFetch(`${BASE}/indexes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(want) });
      if (!createRes.ok) { results.push({ index: want.collectionId, action: "failed", status: createRes.status, error: (await createRes.text()).slice(0, 400) }); continue; }
      const created: any = await createRes.json();
      results.push({ index: want.collectionId, action: "created", name: created.name, state: created.state });
    }
    return json(200, { ok: true, existing, results });
  } catch (err: any) {
    return json(500, { ok: false, error: err.message || String(err) });
  }
};
