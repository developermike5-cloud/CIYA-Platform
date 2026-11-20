import crypto from "crypto";

/**
 * Password reset pipeline, step 2: verify the OTP and set the new password.
 * POST /api/password-reset-confirm  { email, otp, newPassword }
 *   or { email, otp, verifyOnly: true } to only validate the code (the UI's
 *   separate code screen). verifyOnly counts attempts but burns nothing.
 *
 * Checks the hashed OTP from password_reset_otps (Firestore, server-only),
 * then updates the password through the Identity Toolkit admin API and
 * invalidates older sign-in sessions with validSince. The OTP is single-use
 * and capped at 5 verification attempts.
 */

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const MAX_VERIFY_ATTEMPTS = 5;

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
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(statusCode: number, body: any) {
  return { statusCode, headers: { "Content-Type": "application/json", ...CORS_HEADERS }, body: JSON.stringify(body) };
}

const S = (v: string) => ({ stringValue: String(v ?? "") });
const B = (v: boolean) => ({ booleanValue: !!v });
const N = (v: number) => ({ integerValue: String(Math.round(v ?? 0)) });
const TS = (ms: number) => ({ timestampValue: new Date(ms).toISOString() });

function str(fields: any, key: string, fallback = ""): string {
  const f = fields?.[key];
  if (f?.stringValue !== undefined) return f.stringValue;
  if (f?.integerValue !== undefined) return String(f.integerValue);
  return fallback;
}
function num(fields: any, key: string, fallback = 0): number {
  const f = fields?.[key];
  if (f?.integerValue !== undefined) return Number(f.integerValue);
  if (f?.doubleValue !== undefined) return Number(f.doubleValue);
  if (f?.timestampValue !== undefined) return new Date(f.timestampValue).getTime();
  return fallback;
}
function bool(fields: any, key: string): boolean {
  return fields?.[key]?.booleanValue === true;
}

const OTP_SALT = "ciya-pw-reset-v1";
function hashOtp(otp: string, email: string): string {
  return crypto.createHash("sha256").update(`${otp}:${email.toLowerCase()}:${OTP_SALT}`).digest("hex");
}

function passwordOk(pw: string): boolean {
  return (
    typeof pw === "string" &&
    pw.length >= 8 &&
    /[A-Z]/.test(pw) &&
    /[a-z]/.test(pw) &&
    /[0-9]/.test(pw) &&
    /[^A-Za-z0-9]/.test(pw)
  );
}

const INVALID_MSG = "That code is invalid or has expired. Request a new one and try again.";

const handler = async (event: any) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: CORS_HEADERS, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return json(405, { ok: false, error: "method-not-allowed" });
  }

  try {
    const body = typeof event.body === "string" ? JSON.parse(event.body) : event.body || {};
    const email = String(body?.email || "").trim().toLowerCase();
    const otp = String(body?.otp || "").trim();
    const newPassword = String(body?.newPassword || "");
    const verifyOnly = body?.verifyOnly === true;

    if (!email || !/^\d{6}$/.test(otp) || (!verifyOnly && !passwordOk(newPassword))) {
      return json(400, {
        ok: false,
        error: "bad-request",
        message:
          !verifyOnly && !passwordOk(newPassword)
            ? "Your new password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number and a symbol."
            : "Enter the 6-digit code from your email.",
      });
    }

    const sa = loadServiceAccount();
    const projectId = sa.project_id;
    const databaseId =
      process.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || "ai-studio-1aaee609-a922-43e7-9568-0b675490ff78";
    const base = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents`;
    const docPath = `password_reset_otps/${encodeURIComponent(email)}`;

    const getRes = await googleFetch(`${base}/${docPath}`);
    if (!getRes.ok) return json(200, { ok: false, error: "invalid", message: INVALID_MSG });
    const docData: any = await getRes.json();
    const fields = docData?.fields || {};

    if (bool(fields, "used")) return json(200, { ok: false, error: "invalid", message: INVALID_MSG });

    const now = Date.now();
    const expiresAtMs = num(fields, "expiresAt", 0);
    if (!expiresAtMs || now > expiresAtMs) {
      await googleFetch(`${base}/${docPath}`, { method: "DELETE" });
      return json(200, { ok: false, error: "expired", message: "That code has expired. Request a new one and try again." });
    }

    const attempts = num(fields, "attempts", 0);
    if (attempts >= MAX_VERIFY_ATTEMPTS) {
      await googleFetch(`${base}/${docPath}`, { method: "DELETE" });
      return json(200, {
        ok: false,
        error: "too-many-attempts",
        message: "Too many incorrect attempts. Request a new code and try again.",
      });
    }

    const storedHash = str(fields, "otpHash", "");
    const givenHash = Buffer.from(hashOtp(otp, email), "hex");
    const expected = Buffer.from(storedHash, "hex");
    const ok = expected.length === givenHash.length && crypto.timingSafeEqual(expected, givenHash);

    if (!ok) {
      const left = MAX_VERIFY_ATTEMPTS - (attempts + 1);
      await googleFetch(`${base}/${docPath}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields: { ...fields, attempts: N(attempts + 1) } }),
      });
      return json(200, {
        ok: false,
        error: "invalid",
        attemptsLeft: left,
        message:
          left > 0
            ? `That code is incorrect. ${left} attempt${left === 1 ? "" : "s"} left before it is locked.`
            : "Too many incorrect attempts. Request a new code and try again.",
      });
    }

    if (verifyOnly) {
      return json(200, { ok: true, verified: true, message: "Code verified" });
    }

    // Find the auth account and set the new password.
    const lookupToken = await getAccessToken();
    const lkRes = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:lookup`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${lookupToken}` },
      body: JSON.stringify({ email: [email] }),
    });
    let localId = "";
    if (lkRes.ok) {
      const lk: any = await lkRes.json();
      localId = String(lk?.users?.[0]?.localId || "");
    }
    if (!localId) {
      await googleFetch(`${base}/${docPath}`, { method: "DELETE" });
      return json(200, { ok: false, error: "invalid", message: INVALID_MSG });
    }

    const upRes = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:update`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${lookupToken}` },
      body: JSON.stringify({ localId, password: newPassword, validSince: Math.floor(Date.now() / 1000) }),
    });
    if (!upRes.ok) {
      const detail = await upRes.text();
      console.log(`password-reset-confirm: accounts:update failed (${upRes.status}): ${detail.slice(0, 400)}`);
      if (/WEAK_PASSWORD/i.test(detail)) {
        return json(200, {
          ok: false,
          error: "weak-password",
          message: "That password is too weak. It must meet every requirement listed.",
        });
      }
      return json(200, { ok: false, error: "update-failed", message: "Could not change your password. Please try again." });
    }

    // Single use: burn the OTP, and clear any pending temporary-password state.
    await googleFetch(`${base}/${docPath}`, { method: "DELETE" });
    try {
      await googleFetch(`${base}/users/${localId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fields: { passwordChangeRequired: B(false), tempPasswordActive: B(false), updatedAt: TS(Date.now()) },
        }),
      });
    } catch {
      // non-critical
    }

    return json(200, { ok: true, message: "Password changed" });
  } catch (err: any) {
    console.log(`password-reset-confirm error: ${err?.message || err}`);
    return json(500, { ok: false, error: "server-error", message: "Could not change your password. Please try again." });
  }
};

export { handler };
