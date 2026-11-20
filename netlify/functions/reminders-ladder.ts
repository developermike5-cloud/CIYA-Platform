/**
 * CIYA re-engagement email ladder (daily scheduled job).
 *
 * Runs once a day (08:00 Lagos, 07:00 UTC): students with an unfinished
 * course who have not opened the app for 3 / 7 / 14 / 30 days get one
 * branded CIYA email per tier, sent as raw HTML straight to ZeptoMail
 * (nothing is stored in ZeptoMail's console). Returning to the app resets
 * the ladder; after the Day 30 email it stops.
 *
 * Manual testing lives in reminders-test.ts (scheduled functions cannot be
 * called over HTTP).
 * Env: FIREBASE_SERVICE_ACCOUNT_JSON, FIRESTORE_DATABASE_ID,
 *      ZEPTOMAIL_API_KEY / ZEPTO_API_KEY, ZEPTO_FROM_ADDRESS, ZEPTO_FROM_NAME,
 *      PUBLIC_APP_URL.
 */

import { getAccessToken, loadServiceAccount, runScan } from "./_remindersShared";

export const config = { schedule: "0 7 * * *" };

export default async (): Promise<Response> => {
  try {
    const token = await getAccessToken();
    const projectId = loadServiceAccount().project_id;
    const out = await runScan(token, projectId, true);
    console.log("reminders-ladder daily run:", JSON.stringify({ counts: out.counts, byTier: out.byTier }));
    return new Response(JSON.stringify({ ok: true, ran: true, ...out }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("reminders-ladder daily run failed:", e);
    return new Response(JSON.stringify({ ok: false, error: e?.message || "run-failed" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
};
