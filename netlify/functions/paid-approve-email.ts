import crypto from "crypto";

/**
 * Admin-only endpoint (POST JSON): sends the paid-course login-details email
 * through ZeptoMail after the admin approves a pending payment request.
 * Body: { studentUid, idToken } — idToken must belong to an admin.
 * Reads the temp password + CIYA access code from the server-only
 * accessCodes document (written at signup), so the student receives their
 * real credentials only once the payment is approved.
 * Env: FIREBASE_SERVICE_ACCOUNT_JSON, VITE_FIREBASE_API_KEY,
 * VITE_FIREBASE_FIRESTORE_DATABASE_ID, PUBLIC_APP_URL,
 * ZEPTO_API_KEY, ZEPTO_TEMPLATE_KEY_PAID, ZEPTO_FROM_ADDRESS, ZEPTO_FROM_NAME.
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

const FIRESTORE_BASE = (projectId: string, databaseId: string) =>
  `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents`;

const S = (v: string) => ({ stringValue: String(v ?? "") });
const TS = (ms: number) => ({ timestampValue: new Date(ms).toISOString() });

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

async function patchDoc(projectId: string, databaseId: string, path: string, fields: any, updateMask?: string[]): Promise<any> {
  let url = `${FIRESTORE_BASE(projectId, databaseId)}/${path}`;
  if (updateMask?.length) {
    url += "?" + updateMask.map((f) => `updateMask.fieldPaths=${encodeURIComponent(f)}`).join("&");
  }
  const res = await googleFetch(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fields }) });
  if (!res.ok) throw new Error(`firestore write ${path} failed (${res.status}): ${await res.text()}`);
  return res.json();
}

async function sendLoginEmail(opts: {
  toEmail: string;
  fullName: string;
  tempPassword: string;
  ciyaCode: string;
  cohort: string;
  appUrl: string;
  courseTitle?: string;
}): Promise<{ queued: boolean; reason?: string }> {
  // Some Netlify env values are pasted with the "Zoho-enczapikey" prefix already
  // included; the header adds its own, so strip any duplicate prefix first.
  const apiKey = (process.env.ZEPTOMAIL_API_KEY || process.env.ZEPTO_API_KEY || "")
    .trim()
    .replace(/^Zoho-enczapikey\s*/i, "")
    .trim();
  const templateKey = process.env.ZEPTO_TEMPLATE_KEY_PAID || process.env.ZEPTO_TEMPLATE_KEY;
  const fromAddress = process.env.ZEPTO_FROM_ADDRESS;
  const fromName = process.env.ZEPTO_FROM_NAME || "CIYA Academy";
  if (!apiKey || !templateKey || !fromAddress) {
    return { queued: false, reason: "not-configured" };
  }
  const res = await fetch("https://api.zeptomail.com/v1.1/email/template", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Zoho-enczapikey ${apiKey}` },
    body: JSON.stringify({
      template_key: templateKey,
      from: { address: fromAddress, name: fromName },
      to: [{ email_address: { address: opts.toEmail, name: opts.fullName || "CIYA Student" } }],
      merge_info: {
        firstname: opts.fullName || "there",
        user_email: opts.toEmail,
        temp_password: opts.tempPassword,
        ciya_code: opts.ciyaCode,
        cohort: opts.cohort,
        app_link: opts.appUrl,
        course_title: opts.courseTitle || "",
      },
    }),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw Object.assign(new Error(`zeptomail send failed (${res.status}): ${detail}`), { code: "ZEPTO_FAIL" });
  }
  return { queued: true };
}

// Same admin check the Firestore rules apply: bootstrap admin by uid or email,
// or a users-doc admin role.
const BOOTSTRAP_UID = "a26a8d1a-84d2-4baf-9e14-c8c2dec6a164";
const BOOTSTRAP_EMAIL = "developermike5@gmail.com";

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
    const studentUid = String(body.studentUid || "");
    const idToken = String(body.idToken || "");
    if (!studentUid || !idToken) return json(400, { error: "missing-fields" });
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

    // 2. The caller must be an admin. Same check as the Firestore rules:
    // bootstrap uid/email, a users-doc admin role, or membership in the
    // admins collection.
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

    // 3. Load the student's server-only credentials and profile.
    const codeDoc = await getDocFields(projectId, databaseId, `accessCodes/${studentUid}`);
    const tempPassword = str(codeDoc, "tempPassword");
    const ciyaCode = str(codeDoc, "ciyaCode");
    if (!tempPassword || !ciyaCode) return json(404, { error: "credentials-not-found" });

    const userDoc = await getDocFields(projectId, databaseId, `users/${studentUid}`);
    if (!userDoc) return json(404, { error: "student-not-found" });
    const toEmail = str(userDoc, "email");
    const fullName = str(userDoc, "fullName") || (toEmail.split("@")[0] || "CIYA Student");
    const cohort = str(userDoc, "cohort") || "Cohort 1";
    const pr = userDoc?.paidCourseRequest?.mapValue?.fields || {};
    const courseTitle = str(pr, "courseTitle");

    // 4. Never double-send.
    if (str(userDoc, "loginDetailsEmail") === "sent") {
      return json(200, { ok: true, queued: true, alreadySent: true });
    }

    // 5. Send the approval email.
    const appUrl = (process.env.PUBLIC_APP_URL || "https://ciyacademy.netlify.app").replace(/\/+$/, "");
    try {
      await sendLoginEmail({ toEmail, fullName, tempPassword, ciyaCode, cohort, appUrl, courseTitle });
    } catch (e: any) {
      console.error("paid approval email failed:", e);
      return json(200, { ok: true, queued: false, reason: e?.code === "ZEPTO_FAIL" ? "zepto-failed" : "send-failed" });
    }
    await patchDoc(
      projectId,
      databaseId,
      `users/${studentUid}`,
      { loginDetailsEmail: S("sent"), emailSentAt: TS(Date.now()) },
      ["loginDetailsEmail", "emailSentAt"]
    );
    return json(200, { ok: true, queued: true });
  } catch (e: any) {
    console.error("paid-approve-email failed:", e);
    return json(500, { error: "internal", detail: String(e?.message || e) });
  }
};
