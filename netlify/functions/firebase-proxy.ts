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
    const named = matches.filter((n) => n.endsWith(`/releases/cloud.firestore/${db}`));
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
        `${RULES_API}/projects/${projectId}/releases/${release}`
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
        body: JSON.stringify({ source: { files: [{ name: "firestore.rules", content: body.rules }] } }),
      });
      const created = await createRes.json();
      if (!createRes.ok) return json(createRes.status, created);
      const patchRes = await googleFetch(
        `${RULES_API}/projects/${projectId}/releases/${release}`,
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

    if (op === "invite-admin") {
      // Invite-based admin provisioning. Authenticated by the signed-in superadmin's
      // Firebase ID token (NOT the proxy key), so the browser can call it without
      // holding any secret. Only superadmins / manage_admins may invite.
      const idToken = event.headers["x-firebase-id-token"] || event.headers["X-Firebase-Id-Token"];
      const body = event.body ? JSON.parse(event.body) : {};
      const email = String(body.email || "").trim().toLowerCase();
      const role = String(body.role || "CIYA Admin").trim() || "CIYA Admin";
      const permissions: string[] = Array.isArray(body.permissions)
        ? body.permissions.filter((p: unknown) => typeof p === "string" && p.length <= 60)
        : [];
      const tempPassword = String(body.tempPassword || "");
      const databaseId = process.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || "(default)";

      if (!idToken) return json(401, { error: "missing id token" });
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json(400, { error: "invalid email" });
      if (tempPassword.length < 8) return json(400, { error: "tempPassword must be at least 8 characters" });

      // 1. Verify the caller's identity token through Google itself
      const webKey = process.env.VITE_FIREBASE_API_KEY;
      if (!webKey) return json(503, { error: "VITE_FIREBASE_API_KEY is not configured" });
      const callerRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${webKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      const caller = await callerRes.json();
      if (!callerRes.ok || !caller.users || !caller.users.length) {
        return json(401, { error: "invalid id token" });
      }
      const callerUid: string = caller.users[0].localId;
      const callerEmail: string = String(caller.users[0].email || "").toLowerCase();

      // 2. Check the caller's admin record grants manage_admins (or wildcard)
      const callerDocRes = await googleFetch(
        `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/admins/${callerUid}`
      );
      if (!callerDocRes.ok) return json(403, { error: "caller has no admin record" });
      const callerDoc = await callerDocRes.json();
      const fieldsToValues = (f: any): any => {
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
      };
      const callerData = fieldsToValues(callerDoc.fields) || {};
      const callerPerms: string[] = Array.isArray(callerData.permissions) ? callerData.permissions : [];
      const canInvite =
        callerData.role === "superadmin" ||
        callerPerms.includes("all") ||
        callerPerms.includes("manage_admins") ||
        callerEmail === "developermike5@gmail.com";
      if (!canInvite) return json(403, { error: "caller cannot invite admins" });

      // 3. Find or create the invitee's auth account and set the temporary password
      let uid: string | null = null;
      let created = false;
      const lk = await googleFetch(`https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:lookup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: [email] }),
      });
      if (lk.ok) {
        const lj = await lk.json();
        if (lj.users && lj.users.length) uid = lj.users[0].localId;
      }
      if (!uid) {
        const cr = await googleFetch(`https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password: tempPassword, emailVerified: false }),
        });
        if (!cr.ok) {
          return json(cr.status, { error: "could not create the account", detail: await cr.text() });
        }
        uid = (await cr.json()).localId;
        created = true;
      } else {
        const up = await googleFetch(`https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:update`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ localId: uid, password: tempPassword }),
        });
        if (!up.ok) {
          return json(up.status, { error: "could not set the temporary password", detail: await up.text() });
        }
      }

      // 4. Upsert the admins record with the granted powers and the first-login flag
      const now = new Date().toISOString();
      const docBody = {
        fields: {
          email: { stringValue: email },
          role: { stringValue: role },
          permissions: { arrayValue: { values: permissions.map((p) => ({ stringValue: p })) } },
          mustChangePassword: { booleanValue: true },
          invitedBy: { stringValue: callerEmail },
          invitedAt: { stringValue: now },
          updatedAt: { stringValue: now },
        },
      };
      const wr = await googleFetch(
        `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/admins/${uid}`,
        { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(docBody) }
      );
      if (!wr.ok) {
        return json(wr.status, { error: "could not write the admin record", detail: await wr.text() });
      }

      return json(200, { ok: true, uid, created, email });
    }

    return json(400, { error: "unknown op", ops: ["ping", "rules-list", "rules-get", "rules-deploy", "google", "invite-admin"] });
  } catch (err: any) {
    return json(500, { error: err.message || String(err) });
  }
}
