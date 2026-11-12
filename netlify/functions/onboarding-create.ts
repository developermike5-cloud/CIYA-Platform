import crypto from "crypto";

/**
 * Public onboarding registration endpoint (POST JSON).
 *
 * Creates a real student account with the registration email plus a generated
 * temporary password that only reaches the student by email, saves the
 * registration profile to Firestore, issues the student's unique CIYA access
 * code (stored server-side in accessCodes, never readable by students), and
 * emails the login details through ZeptoMail when its keys are configured.
 * Gated by the admin intake toggle (settings/cohorts.onboardingActive).
 *
 * Env: FIREBASE_SERVICE_ACCOUNT_JSON, VITE_FIREBASE_API_KEY,
 * VITE_FIREBASE_FIRESTORE_DATABASE_ID, PUBLIC_APP_URL,
 * ZEPTO_API_KEY, ZEPTO_TEMPLATE_KEY, ZEPTO_FROM_ADDRESS, ZEPTO_FROM_NAME.
 */

const TOKEN_URL = "https://oauth2.googleapis.com/token";

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

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(statusCode: number, body: any) {
  return { statusCode, headers: { "Content-Type": "application/json", ...CORS_HEADERS }, body: JSON.stringify(body) };
}

// Unambiguous characters only (no I, L, O, 0, 1) so codes and passwords read
// cleanly off a phone screen.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ";
const PASS_LETTERS = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
const PASS_DIGITS = "23456789";

function randomFrom(charset: string, length: number): string {
  let out = "";
  for (let i = 0; i < length; i++) out += charset[crypto.randomInt(charset.length)];
  return out;
}

function randomPassword(): string {
  const chars: string[] = [
    ...randomFrom(PASS_LETTERS, 8).split(""),
    ...randomFrom(PASS_DIGITS, 4).split(""),
  ];
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

// Firestore value helpers (REST typed values)
const S = (v: string) => ({ stringValue: String(v ?? "") });
const B = (v: boolean) => ({ booleanValue: !!v });
const N = (v: number) => ({ integerValue: String(v ?? 0) });
const TS = (ms: number) => ({ timestampValue: new Date(ms).toISOString() });

function str(fields: any, key: string, fallback = ""): string {
  const f = fields?.[key];
  if (f?.stringValue !== undefined) return f.stringValue;
  if (f?.integerValue !== undefined) return String(f.integerValue);
  return fallback;
}
function bool(fields: any, key: string): boolean | undefined {
  const f = fields?.[key];
  if (f?.booleanValue !== undefined) return f.booleanValue;
  return undefined;
}

const FIRESTORE_BASE = (projectId: string, databaseId: string) =>
  `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents`;

async function getDocFields(projectId: string, databaseId: string, path: string): Promise<any | null> {
  const res = await googleFetch(`${FIRESTORE_BASE(projectId, databaseId)}/${path}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`firestore get ${path} failed (${res.status})`);
  const data: any = await res.json();
  return data.fields || {};
}

async function patchDoc(
  projectId: string,
  databaseId: string,
  path: string,
  fields: any,
  updateMask?: string[]
): Promise<any> {
  let url = `${FIRESTORE_BASE(projectId, databaseId)}/${path}`;
  if (updateMask?.length) {
    url += "?" + updateMask.map((f) => `updateMask.fieldPaths=${encodeURIComponent(f)}`).join("&");
  }
  const res = await googleFetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) throw new Error(`firestore write ${path} failed (${res.status}): ${await res.text()}`);
  return res.json();
}

async function createAuthUser(apiKey: string, email: string, password: string): Promise<string> {
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, returnSecureToken: false }),
  });
  const data: any = await res.json();
  if (!res.ok) {
    const msg = data?.error?.message || "signUp failed";
    if (msg.includes("EMAIL_EXISTS")) {
      throw Object.assign(new Error("EMAIL_EXISTS"), { code: "EMAIL_EXISTS" });
    }
    throw new Error(`account creation failed: ${msg}`);
  }
  return data.localId as string;
}

async function sendLoginEmail(opts: {
  toEmail: string;
  fullName: string;
  tempPassword: string;
  ciyaCode: string;
  cohort: string;
  appUrl: string;
  paid?: boolean;
  courseTitle?: string;
}): Promise<{ queued: boolean; reason?: string }> {
  const apiKey = process.env.ZEPTOMAIL_API_KEY || process.env.ZEPTO_API_KEY;
  const templateKey = (opts.paid && process.env.ZEPTO_TEMPLATE_KEY_PAID) || process.env.ZEPTO_TEMPLATE_KEY;
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
    const sa = loadServiceAccount();
    const projectId = sa.project_id;
    const databaseId =
      process.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || "ai-studio-1aaee609-a922-43e7-9568-0b675490ff78";
    const base = FIRESTORE_BASE(projectId, databaseId);

    // 1. Intake gate: only register students while a cohort is active.
    const cohortsFields = await getDocFields(projectId, databaseId, "settings/cohorts");
    const onboardingActive = bool(cohortsFields, "onboardingActive") === true;
    if (body?.paid !== true && !onboardingActive) {
      return json(403, { error: "intake-closed" });
    }
    const activeCohort = str(cohortsFields, "activeCohort", "Cohort 1");

    // 2. Validate the registration payload.
    const email = String(body.email || "").trim().toLowerCase();
    const fullName = String(body.fullName || "").trim() || (String(body.email || "").split("@")[0] || "CIYA Student");
    const gender = String(body.gender || "").trim();
    const ageRange = String(body.ageRange || "").trim();
    const whatsapp = String(body.whatsapp || "").trim();
    const country = String(body.country || "Nigeria").trim();
    const state = String(body.state || "").trim();
    if (!email || !email.includes("@")) return json(400, { error: "invalid-email" });
    if (!whatsapp) return json(400, { error: "missing-whatsapp" });
    if (!state) return json(400, { error: "missing-state" });

    // 3. Auto-approval follows the same settings the client flow used.
    let autoApprovalEnabled = true;
    try {
      const appFields = await getDocFields(projectId, databaseId, "settings/app");
      const appVal = bool(appFields, "autoApprovalEnabled");
      if (appVal === false) autoApprovalEnabled = false;
    } catch (e) {
      console.warn("settings/app read failed during registration:", e);
    }
    const finalApprovalStatus = autoApprovalEnabled ? "Approved" : "Pending";
    const finalDashboardUnlocked = autoApprovalEnabled;
    const finalActivated = autoApprovalEnabled;

    // 4. Create the Firebase Auth account with the temporary password.
    const apiKey = process.env.VITE_FIREBASE_API_KEY;
    if (!apiKey) return json(500, { error: "missing-api-key" });
    const tempPassword = randomPassword();
    let uid: string;
    try {
      uid = await createAuthUser(apiKey, email, tempPassword);
    } catch (e: any) {
      if (e?.code === "EMAIL_EXISTS") return json(409, { error: "email-exists" });
      throw e;
    }

    const now = Date.now();
    const generatedAdminCode = `CIYA-${Math.floor(100000 + Math.random() * 900000)}`;
    const userCode = String(uid).slice(0, 6).toUpperCase();
    const ciyaCode = `CIYA-${randomFrom(CODE_ALPHABET, 4)}-${randomFrom(CODE_ALPHABET, 4)}`;
    const recommendedPath = String(body.recommendedPath || "").trim();
    const referralCode = String(body.referralCode || "").trim().toUpperCase();

    // 5. Save the registration profile (login email marked pending until the
    //    send succeeds, so the admin always knows the true state).
    await patchDoc(projectId, databaseId, `users/${uid}`, {
      email: S(email),
      intent: S(body.intent),
      experience: S(body.experience),
      courseType: S(body.courseType),
      pathwaySelection: S(body.pathwaySelection),
      pathwayReason: S(body.pathwayReason),
      pathwayExperience: S(body.pathwayExperience),
      recommendedPath: S(recommendedPath),
      goal: S(body.goal),
      availability: S(body.availability),
      learningTool: S(body.learningTool),
      educationLevel: S(body.educationLevel),
      ageRange: S(ageRange),
      fullName: S(fullName),
      gender: S(gender),
      whatsapp: S(whatsapp),
      country: S(country),
      state: S(state),
      referralCode: S(referralCode),
      myReferralCode: S(userCode),
      isActivated: B(finalActivated),
      referralsCount: N(0),
      approvalStatus: S(finalApprovalStatus),
      adminCode: S(generatedAdminCode),
      isDashboardUnlocked: B(finalDashboardUnlocked),
      cohort: S(activeCohort),
      onboardingStatus: S("registered"),
      passwordChangeRequired: B(true),
      tempPasswordActive: B(true),
      loginDetailsEmail: S("pending"),
      createdAt: TS(now),
      updatedAt: TS(now),
    });

    // 6. Store the unique access code server-side only. Students unlock their
    //    first course by typing the code from their email; the app never reads
    //    this document (Firestore rules deny client access).
    await patchDoc(projectId, databaseId, `accessCodes/${uid}`, {
      ciyaCode: S(ciyaCode),
      tempPassword: S(tempPassword),
      usedForCourseId: { nullValue: null },
      createdAt: TS(now),
      updatedAt: TS(now),
    });

    // 7. Email the login details through ZeptoMail when configured.
    //    Paid enrollments send NOTHING now: the temp password lives in the
    //    server-only accessCodes doc and the email fires when the admin
    //    approves the payment proof (netlify/functions/paid-approve-email.ts).
    const appUrl = (process.env.PUBLIC_APP_URL || "https://ciyacademy.netlify.app").replace(/\/+$/, "");
    let emailQueued = false;
    if (body?.paid === true) {
      // Approval-gated: login details reach the student only after the admin confirms payment.
    } else {
      try {
      const sendResult = await sendLoginEmail({
        toEmail: email,
        fullName,
        tempPassword,
        ciyaCode,
        cohort: activeCohort,
        appUrl,
        paid: body?.paid === true,
        courseTitle: String(body?.courseTitle || ""),
      });
      emailQueued = sendResult.queued;
      if (emailQueued) {
        await patchDoc(
          projectId,
          databaseId,
          `users/${uid}`,
          { loginDetailsEmail: S("sent"), emailSentAt: TS(Date.now()) },
          ["loginDetailsEmail", "emailSentAt"]
        );
      }
    } catch (e: any) {
      console.error("login-details email failed:", e);
      // The account exists and the code is stored; the email stays "pending"
      // so the admin can resend rather than the student losing their details.
    }
    }

    // 8. Activate the referrer, best effort (same rules as the client flow).
    if (referralCode) {
      try {
        const res = await googleFetch(`${base}:runQuery`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            structuredQuery: {
              from: [{ collectionId: "users" }],
              where: {
                fieldFilter: { field: { fieldPath: "myReferralCode" }, op: "EQUAL", value: S(referralCode) },
              },
              limit: 1,
            },
          }),
        });
        if (res.ok) {
          const data: any = await res.json();
          const hit = Array.isArray(data) ? data.find((d: any) => d.document) : null;
          if (hit?.document?.name) {
            const referrerPath = hit.document.name.split("/databases/")[1].replace(/^.*?\/documents\//, "");
            const referrerFields = hit.document.fields || {};
            const prevCount = Number(referrerFields?.referralsCount?.integerValue || 0);
            await patchDoc(
              projectId,
              databaseId,
              referrerPath,
              { referralsCount: N(prevCount + 1), isActivated: B(true), updatedAt: TS(Date.now()) },
              ["referralsCount", "isActivated", "updatedAt"]
            );
          }
        }
      } catch (e) {
        console.warn("referral activation failed during registration:", e);
      }
    }

    return json(200, { ok: true, uid, cohort: activeCohort, emailQueued,
      // Email-fallback: when the welcome email could not be sent (mail keys
      // missing or provider rejected), hand the login details back to the
      // registration screen so the student is never stranded without them.
      ...(emailQueued ? {} : { tempPassword, ciyaCode, emailFallback: true }) });
  } catch (err: any) {
    console.error("onboarding-create failed:", err);
    return json(500, { error: "server-error", detail: String(err?.message || err) });
  }
};
