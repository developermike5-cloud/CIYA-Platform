/** TEMPORARY diagnostic: live Firestore ruleset + recent notifications + admins docs. GET only. */
import crypto from "crypto";

const FIRESTORE_DB = process.env.FIRESTORE_DATABASE_ID || "ai-studio-1aaee609-a922-43e7-9568-0b675490ff78";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPES = "https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/firebase";

function b64url(input: crypto.BinaryLike): string {
  return Buffer.from(input as any).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
type ServiceAccount = { project_id: string; client_email: string; private_key: string };
function loadServiceAccount(): ServiceAccount {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is not set");
  const sa = JSON.parse(raw) as ServiceAccount;
  if (sa.private_key?.includes("\\n")) sa.private_key = sa.private_key.replace(/\\n/g, "\n");
  return sa;
}
async function getAccessToken(scope: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const sa = loadServiceAccount();
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(JSON.stringify({ iss: sa.client_email, scope, aud: TOKEN_URL, iat: now, exp: now + 3600 }));
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(`${header}.${claims}`);
  const signature = signer.sign(sa.private_key, "base64");
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${header}.${claims}.${signature}`,
    }),
  });
  if (!res.ok) throw new Error(`token ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const j: any = await res.json();
  return j.access_token;
}
const g = (v: any) => {
  if (!v) return null;
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.booleanValue !== undefined) return v.booleanValue;
  if (v.integerValue !== undefined) return Number(v.integerValue);
  if (v.timestampValue !== undefined) return v.timestampValue;
  if (v.nullValue !== undefined) return null;
  if (v.mapValue) return Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k, x]: any) => [k, g(x)]));
  if (v.arrayValue) return (v.arrayValue.values || []).map((x: any) => g(x));
  return "?";
};
export default async (req: Request) => {
  if (req.method !== "GET") return new Response(JSON.stringify({ error: "GET only" }), { status: 405 });
  try {
    const sa = loadServiceAccount();
    const token = await getAccessToken(SCOPES);
    const H = { Authorization: `Bearer ${token}` };
    const out: any = {};

    // Latest deployed rulesets: dump services so nothing is mis-filtered.
    const rsList = await fetch(`https://firebaserules.googleapis.com/v1/projects/${sa.project_id}/rulesets?pageSize=25`, { headers: H }).then(r => r.json()) as any;
    if (rsList.error) out.rulesListError = rsList.error;
    const all = rsList.rulesets || [];
    out.rulesetServices = all.map((r: any) => ({ name: r.name, service: r.metadata?.service, created: r.createTime }));
    const newest = all[0];
    if (newest) {
      const full = await fetch(`https://firebaserules.googleapis.com/v1/${newest.name}`, { headers: H }).then(r => r.json()) as any;
      out.ruleset = { name: newest.name, created: newest.createTime, source: (full.source?.files || []).map((f: any) => f.content).join("\n") };
    }

    // Recent notifications docs via runQuery (ordered by createdAt desc).
    const runq = await fetch(`https://firestore.googleapis.com/v1/projects/${sa.project_id}/databases/${FIRESTORE_DB}/documents:runQuery`, {
      method: "POST",
      headers: { ...H, "Content-Type": "application/json" },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: "notifications" }],
          orderBy: [{ field: { fieldPath: "createdAt" }, direction: "DESCENDING" }],
          limit: 12,
        },
      }),
    }).then(r => r.json()) as any;
    out.notifications = (Array.isArray(runq) ? runq : []).filter((x: any) => x.document).map((x: any) => {
      const d = x.document;
      const f: any = {};
      for (const k of ["userId", "isRead", "title", "type", "createdAt"]) f[k] = g(d.fields?.[k]);
      return { id: d.name.split("/").pop(), ...f };
    });
    if (runq.error) out.notificationsError = runq.error;

    // Global offline-mode signal + the test broadcast's read receipts.
    const sigRes = await fetch(`https://firestore.googleapis.com/v1/projects/${sa.project_id}/databases/${FIRESTORE_DB}/documents/settings/system_signals`, { headers: H }).then(r => r.json()) as any;
    if (sigRes.error) out.systemSignalsError = sigRes.error;
    else {
      const sf: any = {};
      for (const k of Object.keys(sigRes.fields || {})) sf[k] = g(sigRes.fields[k]);
      out.system_signals = sf;
    }
    const nRes = await fetch(`https://firestore.googleapis.com/v1/projects/${sa.project_id}/databases/${FIRESTORE_DB}/documents/notifications/v7l5XuM1bxjTkiWFD5jk`, { headers: H }).then(r => r.json()) as any;
    if (nRes.error) out.testNotifError = nRes.error;
    else out.testNotif = { id: nRes.name.split('/').pop(), userId: g(nRes.fields?.userId), isRead: g(nRes.fields?.isRead), title: g(nRes.fields?.title), type: g(nRes.fields?.type) };
    const rrRes = await fetch(`https://firestore.googleapis.com/v1/projects/${sa.project_id}/databases/${FIRESTORE_DB}/documents/notifications/v7l5XuM1bxjTkiWFD5jk/readReceipts?pageSize=25`, { headers: H }).then(r => r.json()) as any;
    if (rrRes.error) out.readReceiptsError = rrRes.error;
    else out.readReceipts = (rrRes.documents || []).map((d: any) => ({ id: d.name.split('/').pop(), uid: g(d.fields?.uid), isRead: g(d.fields?.isRead), readAt: g(d.fields?.readAt), updatedAt: g(d.fields?.updatedAt) }));

    // Admins docs.
    const ares = await fetch(`https://firestore.googleapis.com/v1/projects/${sa.project_id}/databases/${FIRESTORE_DB}/documents/admins?pageSize=10`, { headers: H }).then(r => r.json()) as any;
    out.admins = (ares.documents || []).map((d: any) => {
      const f: any = {};
      for (const k of ["email", "role", "permissions"]) f[k] = g(d.fields?.[k]);
      return { id: d.name.split("/").pop(), ...f };
    });
    if (ares.error) out.adminsError = ares.error;

    return new Response(JSON.stringify(out), { headers: { "Content-Type": "application/json" } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || "diag failed" }), { status: 500 });
  }
};
