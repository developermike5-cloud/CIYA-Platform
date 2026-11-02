import crypto from "crypto";

/**
 * Secured Firebase admin proxy.
 * Lets a trusted caller (x-proxy-key header) read and publish Firestore rules
 * and make allowed googleapis.com API calls using FIREBASE_SERVICE_ACCOUNT_JSON.
 * Ops: ?op=ping | rules-list | rules-get&release=NAME | rules-deploy (POST) | google (POST)
 */

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const RULES_API = "https://firebaserules.googleapis.com/v1";

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

function findFirestoreRelease(releases: any[], database?: string): string | null {
  const db = database && database !== "(default)" ? database : null;
  let matches = releases
    .map((r: any) => r.name as string)
    .filter((n) => n.includes("/releases/cloud.firestore"));
  if (db) {
    const named = matches.filter((n) => n.includes(`/database/${db}`));
    if (named.length) return named[0];
    return null;
  }
  const def = matches.filter((n) => n.endsWith("/releases/cloud.firestore"));
  return def.length ? def[0] : matches[0] || null;
}

export async function handler(event: any) {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, body: "" };

  const expected = process.env.FIREBASE_PROXY_KEY;
  const provided = event.headers["x-proxy-key"] || event.headers["X-Proxy-Key"];
  if (!expected) return json(503, { error: "FIREBASE_PROXY_KEY is not configured" });
  if (provided !== expected) return json(401, { error: "unauthorized" });

  const op = (event.queryStringParameters || {}).op;
  const q = event.queryStringParameters || {};

  try {
    const sa = loadServiceAccount();
    const projectId = sa.project_id;

    if (op === "ping") {
      return json(200, {
        ok: true,
        projectId,
        database: process.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || "(default)",
      });
    }

    if (op === "rules-list") {
      const res = await googleFetch(`${RULES_API}/projects/${projectId}/releases`);
      return json(res.status, await res.json());
    }

    if (op === "rules-get") {
      const release = q.release;
      if (!release) return json(400, { error: "release query param required" });
      const relRes = await googleFetch(
        `${RULES_API}/projects/${projectId}/releases/${encodeURIComponent(release)}`
      );
      const rel = await relRes.json();
      if (!relRes.ok) return json(relRes.status, rel);
      const rsetRes = await googleFetch(`${RULES_API}/${rel.rulesetName}`);
      const rset = await rsetRes.json();
      if (!rsetRes.ok) return json(rsetRes.status, rset);
      return json(200, { release: rel.name, rulesetName: rel.rulesetName, source: rset.source });
    }

    if (op === "rules-deploy") {
      const body = event.body ? JSON.parse(event.body) : {};
      if (!body.rules || typeof body.rules !== "string") {
        return json(400, { error: "body.rules (string) required" });
      }
      let release = body.release;
      if (!release) {
        const listRes = await googleFetch(`${RULES_API}/projects/${projectId}/releases`);
        const list = await listRes.json();
        if (!listRes.ok) return json(listRes.status, list);
        release = findFirestoreRelease(list.releases || [], body.database);
        if (!release) {
          return json(404, {
            error: "no Firestore release found for the requested database",
            available: (list.releases || []).map((r: any) => r.name),
          });
        }
      }
      const createRes = await googleFetch(`${RULES_API}/projects/${projectId}/rulesets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: [{ name: "firestore.rules", content: body.rules }] }),
      });
      const created = await createRes.json();
      if (!createRes.ok) return json(createRes.status, created);
      const patchRes = await googleFetch(
        `${RULES_API}/projects/${projectId}/releases/${encodeURIComponent(release)}`,
        { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rulesetName: created.name }) }
      );
      const patched = await patchRes.json();
      if (!patchRes.ok) return json(patchRes.status, patched);
      return json(200, { release: patched.name, rulesetName: patched.rulesetName, oldRulesetRetired: true });
    }

    if (op === "google") {
      const body = event.body ? JSON.parse(event.body) : {};
      const url = body.url as string;
      const method = (body.method || "GET").toUpperCase();
      let host: string;
      try {
        host = new URL(url).hostname;
      } catch {
        return json(400, { error: "invalid url" });
      }
      if (!(host === "googleapis.com" || host.endsWith(".googleapis.com"))) {
        return json(400, { error: "only googleapis.com hosts are allowed" });
      }
      if (!["GET", "POST", "PUT", "PATCH"].includes(method)) {
        return json(400, { error: "method not allowed" });
      }
      const init: RequestInit = { method, headers: body.headers || {} };
      if (body.body !== undefined) {
        init.body = typeof body.body === "string" ? body.body : JSON.stringify(body.body);
        if (!init.headers || !((init.headers as any)["Content-Type"] || (init.headers as any)["content-type"])) {
          (init.headers as any) = { ...(init.headers as any), "Content-Type": "application/json" };
        }
      }
      const res = await googleFetch(url, init);
      const text = await res.text();
      try {
        return json(res.status, JSON.parse(text));
      } catch {
        return json(res.status, { raw: text });
      }
    }

    return json(400, { error: "unknown op", ops: ["ping", "rules-list", "rules-get", "rules-deploy", "google"] });
  } catch (err: any) {
    return json(500, { error: err.message || String(err) });
  }
}
