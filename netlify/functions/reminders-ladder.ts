/**
 * CIYA re-engagement email ladder (daily scheduled job).
 *
 * Runs once a day (08:00 Lagos, 07:00 UTC) and scans every users doc:
 * students with an unfinished course who have not opened the app for
 * 3 / 7 / 14 / 30 days get one branded CIYA email per tier, sent as raw
 * HTML straight to ZeptoMail (nothing is stored in ZeptoMail's console).
 * Returning to the app resets the ladder; after the Day 30 email it stops.
 *
 * The same endpoint answers POST for testing:
 *   { mode: "dry" }                         -> full scan, sends nothing
 *   { mode: "sample", email, tier? }        -> renders one tier for a sample
 *                                              student and sends it
 * Env: FIREBASE_SERVICE_ACCOUNT_JSON, FIRESTORE_DATABASE_ID,
 *      ZEPTOMAIL_API_KEY / ZEPTO_API_KEY, ZEPTO_FROM_ADDRESS, ZEPTO_FROM_NAME,
 *      PUBLIC_APP_URL.
 */

import crypto from "crypto";

export const config = { schedule: "0 7 * * *" };

const FIRESTORE_DB = process.env.FIRESTORE_DATABASE_ID || "ai-studio-1aaee609-a922-43e7-9568-0b675490ff78";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPES = "https://www.googleapis.com/auth/datastore";
const TIERS = [3, 7, 14, 30];
const ADMIN_EMAIL = "developermike5@gmail.com";
const APP_URL = (process.env.PUBLIC_APP_URL || "https://ciyacademy.netlify.app").replace(/\/+$/, "");

function b64url(input: crypto.BinaryLike): string {
  return Buffer.from(input as any).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
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
  const claims = b64url(JSON.stringify({ iss: sa.client_email, scope: SCOPES, aud: TOKEN_URL, iat: now, exp: now + 3600 }));
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(`${header}.${claims}`);
  const signature = signer.sign(sa.private_key, "base64");
  const assertion = `${header}.${claims}.${b64url(Buffer.from(signature, "base64"))}`;
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }).toString(),
  });
  const data: any = await res.json();
  if (!res.ok || !data.access_token) throw new Error(`Token exchange failed: ${data.error_description || data.error || res.status}`);
  cachedToken = { token: data.access_token, exp: now + Number(data.expires_in || 3600) };
  return data.access_token;
}

const baseUrl = (projectId: string) =>
  `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${FIRESTORE_DB}/documents`;

/** Paginated listing of every users doc. */
async function listUsers(token: string, projectId: string): Promise<{ id: string; fields: any }[]> {
  const res = await fetch(`${baseUrl(projectId)}:runQuery`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ structuredQuery: { from: [{ collectionId: "users" }], limit: 1000 } }),
  });
  if (!res.ok) throw new Error(`users query failed: ${res.status}`);
  const rows: any[] = await res.json();
  const out: { id: string; fields: any }[] = [];
  for (const r of rows) {
    if (r.document) {
      const m = String(r.document.name || "").match(/\/users\/([^/]+)$/);
      if (m) out.push({ id: m[1], fields: r.document.fields || {} });
    }
  }
  return out;
}

async function listAdminIds(token: string, projectId: string): Promise<Set<string>> {
  const res = await fetch(`${baseUrl(projectId)}/admins?pageSize=1000`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return new Set();
  const data: any = await res.json();
  const ids = (data.documents || []).map((d: any) => {
    const m = String(d.name || "").match(/\/admins\/([^/]+)$/);
    return m ? m[1] : "";
  });
  return new Set(ids.filter(Boolean));
}

async function readCourseTitle(token: string, projectId: string, cid: string): Promise<string> {
  try {
    const res = await fetch(`${baseUrl(projectId)}/courses/${encodeURIComponent(cid)}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return "";
    const data: any = await res.json();
    const f = data.fields || {};
    return String(f.title?.stringValue || f.name?.stringValue || "");
  } catch {
    return "";
  }
}

/** REST patch of one doc (bypasses security rules: service account is trusted). */
async function patchDoc(token: string, projectId: string, path: string, fields: Record<string, any> | null): Promise<boolean> {
  const mask = fields ? Object.keys(fields).map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join("&") : "updateMask.fieldPaths=reminderLadder";
  const res = await fetch(`${baseUrl(projectId)}/${path}?${mask}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ fields: fields || {} }),
  });
  return res.ok;
}

// ---- Firestore value decode helpers ------------------------------------

const s = (f: any): string => (f && typeof f.stringValue === "string" ? f.stringValue : "");
const num = (f: any): number => (f ? Number(f.integerValue ?? f.doubleValue ?? NaN) : NaN);
const strArr = (f: any): string[] => {
  const vals = f?.arrayValue?.values || [];
  return vals.map((v: any) => v.stringValue).filter((v: any) => typeof v === "string");
};
const tsMs = (f: any): number | null => (f?.timestampValue ? Date.parse(f.timestampValue) : null);

function firstNameOf(fields: any): string {
  const raw = s(fields.fullName) || s(fields.name) || s(fields.displayName);
  const first = raw.trim().split(/\s+/)[0];
  return first || "there";
}

function courseDone(fields: any, cid: string): boolean {
  if (strArr(fields.completedCoursesOverride).includes(cid)) return true;
  const prog = fields?.progress?.mapValue?.fields?.[cid]?.mapValue?.fields;
  return Boolean(prog?.completedAt);
}

function emailOff(fields: any): boolean {
  return fields?.notificationPrefs?.mapValue?.fields?.email?.booleanValue === false;
}

// ---- Email rendering ----------------------------------------------------

function esc(t: string): string {
  return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function emailHtml(opts: { firstName: string; courseName: string; tier: number }): string {
  const { firstName, courseName, tier } = opts;
  const courses = esc(courseName);
  const copy: Record<number, { subject: string; heading: string; lines: string[]; cta: string }> = {
    3: {
      subject: `Your ${courses} is waiting, ${esc(firstName)}`,
      heading: `Still with us, ${esc(firstName)}?`,
      lines: [
        `It has been three days since you last opened your <strong>${courses}</strong>.`,
        `Your next lesson is right where you left it. Ten focused minutes is enough to keep the streak alive.`,
      ],
      cta: "Continue my course",
    },
    7: {
      subject: `One week since you opened ${courses}`,
      heading: `A week went by, ${esc(firstName)}`,
      lines: [
        `You have not opened <strong>${courses}</strong> in seven days. It happens to everyone.`,
        `The good news: your progress is exactly as you left it, and picking it back up takes one tap.`,
      ],
      cta: "Pick up where I left off",
    },
    14: {
      subject: `${esc(firstName)}, your ${courses} progress is still safe`,
      heading: `Two weeks is a long break`,
      lines: [
        `Your <strong>${courses}</strong> has been waiting for two weeks. Everything you have completed is still saved.`,
        `Come back for one lesson today. That is all it takes to be back in the rhythm.`,
      ],
      cta: "Return to my course",
    },
    30: {
      subject: `Last reminder: your ${courses} place is still yours`,
      heading: `This is our final reminder, ${esc(firstName)}`,
      lines: [
        `It has been a month since you opened <strong>${courses}</strong>, so this is the last note we will send.`,
        `If now is not the time, that is completely fine. Your progress stays saved, and when you are ready, one tap brings it all back.`,
      ],
      cta: "Open my course",
    },
  };
  const t = copy[tier] || copy[3];
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f4f6f5;">
<div style="display:none;max-height:0;overflow:hidden;">${t.heading}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f5;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e3e8e6;">
  <tr><td style="background:#0f3d33;padding:20px 28px;">
    <span style="color:#5eead4;font-weight:bold;font-size:18px;letter-spacing:1px;">CIYA</span>
    <span style="color:#c9e8e0;font-size:13px;"> Academy</span>
  </td></tr>
  <tr><td style="padding:28px 32px 8px;font-family:Arial,Helvetica,sans-serif;">
    <h1 style="margin:0 0 14px;color:#0f3d33;font-size:22px;line-height:1.3;">${t.heading}</h1>
    ${t.lines.map((l) => `<p style="margin:0 0 14px;color:#28322e;font-size:15px;line-height:1.6;">${l}</p>`).join("")}
    <div style="margin:22px 0 6px;">
      <a href="${APP_URL}/dashboard" style="display:inline-block;background:#0f766e;color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;padding:13px 26px;border-radius:8px;">${t.cta}</a>
    </div>
  </td></tr>
  <tr><td style="padding:18px 32px 26px;font-family:Arial,Helvetica,sans-serif;border-top:1px solid #eef2f0;">
    <p style="margin:0;color:#6b7772;font-size:12px;line-height:1.5;">You are receiving this because you have an unfinished course at CIYA Academy. Your progress is always saved.</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

// ---- ZeptoMail raw-HTML send ---------------------------------------------

async function sendZeptoHtml(to: string, subject: string, html: string): Promise<{ ok: boolean; status: number; detail?: string }> {
  const apiKey = (process.env.ZEPTOMAIL_API_KEY || process.env.ZEPTO_API_KEY || "").trim().replace(/^Zoho-enczapikey\s*/i, "").trim();
  const fromAddress = process.env.ZEPTO_FROM_ADDRESS || "";
  const fromName = process.env.ZEPTO_FROM_NAME || "CIYA Academy";
  if (!apiKey || !fromAddress) return { ok: false, status: 0, detail: "zepto-not-configured" };
  const res = await fetch("https://api.zeptomail.com/v1.1/email", {
    method: "POST",
    headers: { Authorization: `Zoho-enczapikey ${apiKey}`, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      from: { address: fromAddress, name: fromName },
      to: [{ email_address: { address: to } }],
      subject,
      htmlbody: html,
    }),
  });
  if (!res.ok) {
    const detail = (await res.text()).slice(0, 300);
    return { ok: false, status: res.status, detail };
  }
  return { ok: true, status: res.status };
}

// ---- The scan ---------------------------------------------------------------

type ScanRow = {
  uid: string;
  name: string;
  email: string;
  tier: number;
  daysSince: number;
  courseName: string;
};

async function runScan(token: string, projectId: string, sendEmails: boolean): Promise<any> {
  const users = await listUsers(token, projectId);
  const adminIds = await listAdminIds(token, projectId);

  // Course title cache
  const courseTitles = new Map<string, string>();

  const dry: { wouldSend: ScanRow[]; resetLadder: number } = { wouldSend: [], resetLadder: 0 };
  const counts = {
    total: users.length,
    skippedAdmin: 0,
    skippedNoEmail: 0,
    emailOff: 0,
    skippedUnapproved: 0,
    noActivity: 0,
    activeRecently: 0,
    ladderDone: 0,
    nothingDue: 0,
    sent: 0,
    sendFailed: 0,
    laddersReset: 0,
  };
  const byTier: Record<number, number> = { 3: 0, 7: 0, 14: 0, 30: 0 };
  const now = Date.now();
  const DAY = 86400000;

  for (const { id: uid, fields } of users) {
    if (adminIds.has(uid) || ["admin", "super_admin", "superadmin"].includes(s(fields.role)) || s(fields.email).toLowerCase() === ADMIN_EMAIL) {
      counts.skippedAdmin++;
      continue;
    }
    const email = s(fields.email).trim();
    if (!email || !email.includes("@")) {
      counts.skippedNoEmail++;
      continue;
    }
    if (emailOff(fields)) {
      counts.emailOff++;
      continue;
    }
    const approval = s(fields.approvalStatus);
    if (approval && approval !== "Approved") {
      counts.skippedUnapproved++;
      continue;
    }

    let last = tsMs(fields.lastEngagedAt) ?? tsMs(fields.updatedAt);
    if (!last) {
      counts.noActivity++;
      continue;
    }
    const daysSince = Math.floor((now - last) / DAY);

    const ladder = fields?.reminderLadder?.mapValue?.fields || {};
    const sentTier = Number(ladder.tier?.integerValue ?? ladder.tier?.doubleValue ?? 0);

    if (daysSince < 3) {
      counts.activeRecently++;
      if (Object.keys(ladder).length) {
        if (await patchDoc(token, projectId, `users/${uid}`, null)) counts.laddersReset++;
      }
      continue;
    }

    const registered = strArr(fields.registeredCourses);
    const incomplete = registered.filter((cid) => cid && !courseDone(fields, cid));
    if (!incomplete.length) {
      counts.ladderDone++;
      continue;
    }

    const eligible = TIERS.filter((t) => t <= daysSince && t > sentTier);
    if (!eligible.length) {
      counts.nothingDue++;
      continue;
    }
    const tier = Math.max(...eligible);

    // Pick the first incomplete course that has a resolvable title.
    let courseName = "";
    for (const cid of incomplete.slice(0, 4)) {
      if (!courseTitles.has(cid)) courseTitles.set(cid, await readCourseTitle(token, projectId, cid));
      const title = courseTitles.get(cid) || "";
      if (title) {
        courseName = title;
        break;
      }
    }
    if (!courseName) courseName = "course";

    const row: ScanRow = {
      uid,
      name: firstNameOf(fields),
      email,
      tier,
      daysSince,
      courseName,
    };

    if (!sendEmails) {
      dry.wouldSend.push(row);
      byTier[tier]++;
      continue;
    }

    const html = emailHtml({ firstName: row.name, courseName: row.courseName, tier });
    const copy = tierCopyMeta(tier, row);
    const sent = await sendZeptoHtml(email, copy.subject, html);
    if (sent.ok) {
      counts.sent++;
      byTier[tier]++;
      await patchDoc(token, projectId, `users/${uid}`, {
        reminderLadder: { mapValue: { fields: { tier: { integerValue: String(tier) }, sentAt: { timestampValue: new Date().toISOString() }, course: { stringValue: row.courseName } } } },
      });
    } else {
      counts.sendFailed++;
      console.warn(`reminders-ladder: send failed for ${uid}: ${sent.status} ${sent.detail || ""}`);
    }
  }

  return { counts, byTier, wouldSend: sendEmails ? undefined : dry.wouldSend };
}

function tierCopyMeta(tier: number, row: ScanRow): { subject: string } {
  const c = esc(row.courseName);
  const n = esc(row.name);
  const map: Record<number, string> = {
    3: `Your ${c} is waiting, ${n}`,
    7: `One week since you opened ${c}`,
    14: `${n}, your ${c} progress is still safe`,
    30: `Last reminder: your ${c} place is still yours`,
  };
  return { subject: map[tier] || map[3] };
}

// ---- HTTP / scheduled entry -----------------------------------------------

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...CORS_HEADERS } });

export default async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response("", { status: 204, headers: CORS_HEADERS });

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  // POST { mode: "dry" } or { mode: "sample", email, tier } = testing.
  // Anything else (the scheduled invocation) = the real daily run.
  const mode = body?.mode;
  if (mode === "dry" || mode === "sample") {
    try {
      const token = await getAccessToken();
      const projectId = loadServiceAccount().project_id;
      if (mode === "dry") {
        const out = await runScan(token, projectId, false);
        return json(200, { ok: true, mode, ...out });
      }
      const email = String(body.email || "").trim();
      const tier = TIERS.includes(Number(body.tier)) ? Number(body.tier) : 3;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(400, { ok: false, error: "invalid-email" });
      const firstName = String(body.firstName || "Adaeze");
      const courseName = String(body.courseName || "the Beginner course");
      const html = emailHtml({ firstName, courseName, tier });
      const meta = tierCopyMeta(tier, { uid: "", name: firstName, email, tier, daysSince: tier, courseName } as ScanRow);
      const res = await sendZeptoHtml(email, meta.subject, html);
      return json(200, { ok: res.ok, sent: res.ok, status: res.status, detail: res.detail, to: email, tier, subject: meta.subject });
    } catch (e: any) {
      console.error("reminders-ladder test failed:", e);
      return json(500, { ok: false, error: e?.message || "scan-failed" });
    }
  }

  // Scheduled daily run.
  try {
    const token = await getAccessToken();
    const projectId = loadServiceAccount().project_id;
    const out = await runScan(token, projectId, true);
    console.log("reminders-ladder daily run:", JSON.stringify({ counts: out.counts, byTier: out.byTier }));
    return json(200, { ok: true, ran: true, ...out });
  } catch (e: any) {
    console.error("reminders-ladder daily run failed:", e);
    return json(500, { ok: false, error: e?.message || "run-failed" });
  }
};
