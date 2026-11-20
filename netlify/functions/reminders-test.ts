/**
 * Manual test trigger for the re-engagement email ladder (POST JSON).
 *
 *   { mode: "dry" }                    -> full scan of real data, sends nothing
 *   { mode: "sample", email, tier }    -> renders one tier (3/7/14/30) for a
 *                                         sample student and sends it
 *
 * The scheduled run itself lives in reminders-ladder.ts.
 */

import { getAccessToken, loadServiceAccount, runScan, emailHtml, tierCopyMeta, TIERS, sendZeptoHtml } from "./_remindersShared";
import type { ScanRow } from "./_remindersShared";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...CORS_HEADERS } });

export default async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response("", { status: 204, headers: CORS_HEADERS });
  if (req.method !== "POST") return json(405, { error: "method-not-allowed" });

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  try {
    const token = await getAccessToken();
    const projectId = loadServiceAccount().project_id;
    if (body.mode === "dry") {
      const out = await runScan(token, projectId, false);
      return json(200, { ok: true, mode: "dry", ...out });
    }
    if (body.mode === "sample") {
      const email = String(body.email || "").trim();
      const tier = TIERS.includes(Number(body.tier)) ? Number(body.tier) : 3;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(400, { ok: false, error: "invalid-email" });
      const firstName = String(body.firstName || "Adaeze");
      const courseName = String(body.courseName || "the Beginner course");
      const html = emailHtml({ firstName, courseName, tier });
      const meta = tierCopyMeta(tier, { uid: "", name: firstName, email, tier, daysSince: tier, courseName } as ScanRow);
      const res = await sendZeptoHtml(email, meta.subject, html);
      return json(200, { ok: res.ok, sent: res.ok, status: res.status, detail: res.detail, to: email, tier, subject: meta.subject });
    }
    return json(400, { ok: false, error: "unknown-mode", hint: 'body { mode: "dry" | "sample", email?, tier? }' });
  } catch (e: any) {
    console.error("reminders-test failed:", e);
    return json(500, { ok: false, error: e?.message || "scan-failed" });
  }
};
