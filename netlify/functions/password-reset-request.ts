import crypto from "crypto";

/**
 * Password reset pipeline, step 1: request an OTP.
 * POST /api/password-reset-request  { email }
 *
 * Replaces Firebase's reset-link email with CIYA's own OTP flow. The response
 * is ALWAYS { ok: true } so it never reveals whether an email is registered.
 * When the email IS registered (and rate limits allow), a 6-digit OTP is
 * stored hashed in Firestore (password_reset_otps, server-only: the global
 * deny-all rules block client access; admin calls bypass rules) and emailed
 * through ZeptoMail as code-generated HTML (the ZeptoMail OTP template never
 * filled its merge tags, so the send no longer depends on one).
 *
 * Env: FIREBASE_SERVICE_ACCOUNT_JSON, VITE_FIREBASE_FIRESTORE_DATABASE_ID,
 * ZEPTO_FROM_ADDRESS, ZEPTOMAIL_API_KEY / ZEPTO_API_KEY, ZEPTO_FROM_NAME.
 */

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const OTP_TTL_MINUTES = 10;
const RESEND_COOLDOWN_MS = 300_000; // server-side 5-minute cooldown: no second OTP request within 5 minutes
const MAX_REQUESTS_PER_HOUR = 5;
const MAX_VERIFY_ATTEMPTS = 5; // mirrored by password-reset-confirm

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

// Firestore value helpers (REST typed values)
const S = (v: string) => ({ stringValue: String(v ?? "") });
const B = (v: boolean) => ({ booleanValue: !!v });
const N = (v: number) => ({ integerValue: String(Math.round(v ?? 0)) });
const TS = (ms: number) => ({ timestampValue: new Date(ms).toISOString() });

function num(fields: any, key: string, fallback = 0): number {
  const f = fields?.[key];
  if (f?.integerValue !== undefined) return Number(f.integerValue);
  if (f?.doubleValue !== undefined) return Number(f.doubleValue);
  if (f?.timestampValue !== undefined) return new Date(f.timestampValue).getTime();
  return fallback;
}

const OTP_SALT = "ciya-pw-reset-v1";
function hashOtp(otp: string, email: string): string {
  return crypto.createHash("sha256").update(`${otp}:${email.toLowerCase()}:${OTP_SALT}`).digest("hex");
}

function escapeHtml(v: string): string {
  return v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function otpEmailHtml(firstname: string, otp: string, expiryMinutes: string): string {
  const name = escapeHtml(firstname || "there");
  const code = escapeHtml(otp);
  const expiry = escapeHtml(expiryMinutes);
  return [
    '<!DOCTYPE html><html><body style="margin:0;padding:0;background:#042f2e;">',
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#042f2e;padding:32px 16px;"><tr><td align="center">',
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">',
    '<tr><td align="center" style="padding-bottom:24px;">',
    '<div style="font-size:22px;font-weight:800;color:#f59e0b;letter-spacing:4px;">CIYA</div>',
    '<div style="font-size:11px;color:#5eead4;letter-spacing:3px;text-transform:uppercase;">Create It Yourself Academy</div>',
    '</td></tr>',
    '<tr><td style="background:#0b3d3a;border-radius:16px;padding:32px 28px;border:1px solid #134e4a;">',
    `<p style="margin:0 0 12px;font-size:16px;color:#ffffff;font-weight:700;">Hi ${name},</p>`,
    `<p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#99f6e4;">Use the code below to reset your CIYA password. It expires in ${expiry} minutes.</p>`,
    '<div style="background:#f59e0b;border-radius:12px;padding:16px 12px;text-align:center;">',
    `<span style="font-size:32px;font-weight:800;letter-spacing:10px;color:#042f2e;">${code}</span>`,
    '</div>',
    '<p style="margin:20px 0 0;font-size:13px;line-height:1.6;color:#99f6e4;">If you didn\'t request a password reset, you can safely ignore this email. Your password will stay unchanged.</p>',
    '</td></tr>',
    '<tr><td align="center" style="padding-top:20px;"><span style="font-size:12px;color:#5eead4;">The CIYA Team</span></td></tr>',
    '</table>',
    '</td></tr></table>',
    '</body></html>',
  ].join("");
}

function otpEmailText(firstname: string, otp: string, expiryMinutes: string): string {
  return [
    `Hi ${firstname || "there"},`,
    "",
    `Use the code below to reset your CIYA password. It expires in ${expiryMinutes} minutes.`,
    "",
    otp,
    "",
    "If you didn't request a password reset, you can safely ignore this email. Your password will stay unchanged.",
    "",
    "The CIYA Team",
  ].join("\n");
}

async function sendOtpEmail(opts: { toEmail: string; firstname: string; otp: string; expiryMinutes: string }): Promise<boolean> {
  const apiKey = (process.env.ZEPTOMAIL_API_KEY || process.env.ZEPTO_API_KEY || "")
    .trim()
    .replace(/^Zoho-enczapikey\s*/i, "")
    .trim();
  const fromAddress = process.env.ZEPTO_FROM_ADDRESS;
  const fromName = process.env.ZEPTO_FROM_NAME || "CIY Academy";
  if (!apiKey || !fromAddress) {
    console.log("password-reset-request: zepto not configured, OTP email not sent", {
      hasKey: !!apiKey,
      hasFrom: !!fromAddress,
    });
    return false;
  }
  const firstname = opts.firstname || "there";
  const res = await fetch("https://api.zeptomail.com/v1.1/email", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Zoho-enczapikey ${apiKey}` },
    body: JSON.stringify({
      from: { address: fromAddress, name: fromName },
      to: [{ email_address: { address: opts.toEmail, name: firstname === "there" ? "CIYA Student" : firstname } }],
      subject: "Your CIYA password reset code",
      htmlbody: otpEmailHtml(firstname, opts.otp, opts.expiryMinutes),
      textbody: otpEmailText(firstname, opts.otp, opts.expiryMinutes),
    }),
  });
  if (!res.ok) {
    const detail = await res.text();
    console.log(`password-reset-request: zeptomail send failed (${res.status}): ${detail.slice(0, 400)}`);
    return false;
  }
  return true;
}

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
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      // Same generic answer for malformed input: never hint at what was wrong.
      return json(200, { ok: true });
    }

    const sa = loadServiceAccount();
    const projectId = sa.project_id;
    const databaseId =
      process.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || "ai-studio-1aaee609-a922-43e7-9568-0b675490ff78";
    const base = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents`;

    // Rate limits (server-side backstops; the UI enforces its own 60s resend).
    const now = Date.now();
    const docPath = `password_reset_otps/${encodeURIComponent(email)}`;
    let requestCount = 1;
    let windowStart = now;
    let cooldownLeftSeconds = 0;
    let hourlyCapped = false;
    try {
      const existing = await googleFetch(`${base}/${docPath}`);
      if (existing.ok) {
        const data: any = await existing.json();
        const fields = data?.fields || {};
        const createdAtMs = num(fields, "createdAt", 0);
        const wStart = num(fields, "windowStart", 0);
        const rCount = num(fields, "requestCount", 0);
        if (createdAtMs && now - createdAtMs < RESEND_COOLDOWN_MS) {
          cooldownLeftSeconds = Math.max(1, Math.ceil((createdAtMs + RESEND_COOLDOWN_MS - now) / 1000));
        }
        if (wStart && now - wStart < 3_600_000) {
          windowStart = wStart;
          requestCount = rCount + 1;
          if (rCount >= MAX_REQUESTS_PER_HOUR) hourlyCapped = true;
        }
      }
    } catch {
      // no existing doc: fresh window
    }

    // Rate-limited answers name the wait instead of pretending to succeed.
    if (cooldownLeftSeconds > 0) {
      const mins = Math.ceil(cooldownLeftSeconds / 60);
      const wait =
        mins >= 1
          ? `${mins} minute${mins === 1 ? "" : "s"}`
          : `${cooldownLeftSeconds} second${cooldownLeftSeconds === 1 ? "" : "s"}`;
      return json(200, {
        ok: false,
        error: "rate-limited",
        retryAfterSeconds: cooldownLeftSeconds,
        message: `A reset code was already sent to this email. Please wait ${wait} before requesting another one.`,
      });
    }
    if (hourlyCapped) {
      const hourlyLeftSeconds = Math.max(60, Math.ceil((windowStart + 3_600_000 - now) / 1000));
      return json(200, {
        ok: false,
        error: "rate-limited",
        retryAfterSeconds: hourlyLeftSeconds,
        message: "Too many reset codes requested for this email in the last hour. Please try again later.",
      });
    }

    // Does this email belong to a real Firebase Auth user?
    const lookupToken = await getAccessToken();
    const lkRes = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:lookup`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${lookupToken}` },
      body: JSON.stringify({ email: [email] }),
    });
    let localId = "";
    let displayName = "";
    if (lkRes.ok) {
      const lk: any = await lkRes.json();
      const user = lk?.users?.[0];
      if (user?.localId) {
        localId = String(user.localId);
        displayName = String(user.displayName || "");
      }
    }
    if (!localId) {
      // Unregistered email: answer the same as success, store and send nothing.
      return json(200, { ok: true });
    }

    {
      const otp = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
      const expiresAt = now + OTP_TTL_MINUTES * 60_000;
      const firstname = (displayName || "").trim().split(/\s+/)[0] || "there";

      await googleFetch(`${base}/${docPath}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fields: {
            email: S(email),
            localId: S(localId),
            otpHash: S(hashOtp(otp, email)),
            expiresAt: TS(expiresAt),
            createdAt: TS(now),
            attempts: N(0),
            used: B(false),
            requestCount: N(requestCount),
            windowStart: TS(windowStart),
          },
        }),
      });

      await sendOtpEmail({ toEmail: email, firstname, otp, expiryMinutes: String(OTP_TTL_MINUTES) });
    }

    return json(200, { ok: true });
  } catch (err: any) {
    console.log(`password-reset-request error: ${err?.message || err}`);
    // Never leak internals; the generic success answer covers real failures too.
    return json(200, { ok: true });
  }
};

export { handler };
