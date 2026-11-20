/**
 * FCM web push sender for CIYA.
 *
 * POST /api/push-send   { target: 'all' | <uid>, title, body, url? }
 *
 * Looks up the recipient's fcmTokens on their users/{uid} doc (server-side,
 * via the service account) and sends each token one FCM HTTP v1 message.
 * The calling client flow writes the history entry to the `notifications`
 * collection, so push and in-app history never double up. Dead tokens are
 * pruned from single-recipient sends.
 */

import crypto from "crypto";

const FIRESTORE_DB = process.env.FIRESTORE_DATABASE_ID || "ai-studio-1aaee609-a922-43e7-9568-0b675490ff78";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const FCM_SCOPE = "https://www.googleapis.com/auth/firebase.messaging";
const MAX_TARGETS = 2000;

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

async function getAccessToken(scope: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.exp - 60 > now) return cachedToken.token;
  const sa = loadServiceAccount();
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(
    JSON.stringify({
      iss: sa.client_email,
      scope,
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3600,
    })
  );
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(`${header}.${claims}`);
  const signature = signer.sign(sa.private_key, "base64");
  const assertion = `${header}.${claims}.${b64url(Buffer.from(signature, "base64"))}`;
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }).toString(),
  });
  const data: any = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(`Token exchange failed: ${data.error_description || data.error || res.status}`);
  }
  cachedToken = { token: data.access_token, exp: now + Number(data.expires_in || 3600) };
  return data.access_token;
}

const json = (code: number, body: any) =>
  new Response(JSON.stringify(body), {
    status: code,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });

function baseUrl(projectId: string): string {
  return `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${FIRESTORE_DB}/documents`;
}

async function readDoc(token: string, projectId: string, path: string): Promise<any> {
  const res = await fetch(`${baseUrl(projectId)}/${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return res.json();
}

/** Every user doc (one page, capped). Used for the "all students" broadcast. */
async function listUsers(token: string, projectId: string): Promise<any[]> {
  const res = await fetch(`${baseUrl(projectId)}:runQuery`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      structuredQuery: { from: [{ collectionId: "users" }], limit: 1000 },
    }),
  });
  if (!res.ok) throw new Error(`users query failed: ${res.status}`);
  const rows: any[] = await res.json();
  return rows.filter((r: any) => r.document);
}

function extractTokens(fields: any): string[] {
  const map = fields?.fcmTokens?.mapValue?.fields || {};
  return Object.keys(map);
}

async function sendFcm(token: string, projectId: string, deviceToken: string, payload: { title: string; body: string; link: string }): Promise<void> {
  const res = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      message: {
        token: deviceToken,
        notification: { title: payload.title, body: payload.body },
        data: { title: payload.title, message: payload.body, link: payload.link },
        webpush: {
          headers: { Urgency: "high" },
          notification: { icon: "/pwa-192x192.png", badge: "/pwa-192x192.png" },
          fcmOptions: { link: payload.link },
        },
      },
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    let detail = "";
    try {
      detail = JSON.parse(errText)?.error?.status || "";
    } catch {
      detail = errText.slice(0, 120);
    }
    throw new Error(`${res.status} ${detail}`);
  }
}

/** Rewrite users/{uid}.fcmTokens without the dead entries. */
async function patchTokens(token: string, projectId: string, uid: string, remaining: string[]): Promise<void> {
  const fields: any = { fcmTokens: { mapValue: { fields: {} } } };
  for (const tk of remaining) fields.fcmTokens.mapValue.fields[tk] = { booleanValue: true };
  const mask = remaining.length ? "?updateMask.fieldPaths=fcmTokens" : "?updateMask.fieldPaths=fcmTokens";
  await fetch(`${baseUrl(projectId)}/users/${uid}${mask}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ fields }),
  });
}

export default async (req: Request) => {
  if (req.method !== "POST") return json(405, { error: "POST only" });
  try {
    const raw: any = await req.json().catch(() => ({}));
    const target: string = raw.target;
    const title: string = String(raw.title || "").trim();
    const body: string = String(raw.body || "").trim();
    let link: string = typeof raw.url === "string" ? raw.url : "/dashboard";
    if (!link.startsWith("/")) link = "/dashboard";
    if (!target || !title || !body) return json(400, { error: "target, title and body are required" });

    const sa = loadServiceAccount();
    const projectId = sa.project_id;
    const token = await getAccessToken(FCM_SCOPE);

    let targets: { uid: string; tokens: string[] }[] = [];
    if (target === "all") {
      const docs = await listUsers(token, projectId);
      for (const d of docs) {
        const f = d.document?.fields || {};
        const uid = String(d.document?.name || "").split("/").pop();
        if (!uid) continue;
        if (f.isAdmin?.booleanValue === true) continue;
        const toks = extractTokens(f);
        if (toks.length) targets.push({ uid, tokens: toks });
      }
    } else {
      const doc = await readDoc(token, projectId, `users/${target}`);
      const toks = doc?.fields ? extractTokens(doc.fields) : [];
      if (toks.length) targets.push({ uid: target, tokens: toks });
    }
    targets = targets.slice(0, MAX_TARGETS);

    let sent = 0;
    let failed = 0;
    const deadByUid: Record<string, string[]> = {};
    for (const t of targets) {
      const dead: string[] = [];
      for (const deviceToken of t.tokens) {
        try {
          await sendFcm(token, projectId, deviceToken, { title, body, link });
          sent++;
        } catch (err: any) {
          failed++;
          const msg = String(err?.message || err || "");
          if (msg.includes("UNREGISTERED") || msg.includes("INVALID_ARGUMENT") || msg.includes("THIRD_PARTY_AUTH_ERROR")) {
            dead.push(deviceToken);
          }
        }
      }
      if (dead.length) deadByUid[t.uid] = dead;
    }

    if (target !== "all" && deadByUid[target]?.length) {
      try {
        await patchTokens(token, projectId, target, targets[0].tokens.filter((tk) => !deadByUid[target].includes(tk)));
      } catch {
        // Pruning is best-effort; the push result is already decided.
      }
    }

    return json(200, { ok: true, recipients: targets.length, sent, failed });
  } catch (err: any) {
    return json(500, { error: err?.message || "Push send failed." });
  }
};
