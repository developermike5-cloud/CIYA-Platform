/**
 * TEMPORARY one-shot utility (remove after use).
 *
 * The deployed Realtime Database rules predate the Buzz comments feature, so
 * every comment write fails with permission_denied. This endpoint uses the
 * server-side service account to patch the rules:
 *
 *  GET  -> reports whether the buzz_comments rules exist (no data returned)
 *  POST -> merges the buzz_comments rules and a commentsCount write rule into
 *          the live rules, mirroring the existing buzz_messages policy. The
 *          request body is ignored; the change is fixed and idempotent.
 */

import crypto from "crypto";

const RTDB_URL =
  "https://gen-lang-client-0862975917-default-rtdb.europe-west1.firebasedatabase.app";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

type ServiceAccount = { project_id: string; client_email: string; private_key: string };

function b64url(input: crypto.BinaryLike): string {
  return Buffer.from(input as any)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function loadServiceAccount(): ServiceAccount {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is not set");
  const sa = JSON.parse(raw) as ServiceAccount;
  if (sa.private_key.includes("\\n")) sa.private_key = sa.private_key.replace(/\\n/g, "\n");
  return sa;
}

async function getAccessToken(): Promise<string> {
  const sa = loadServiceAccount();
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(
    JSON.stringify({
      iss: sa.client_email,
      scope:
        "https://www.googleapis.com/auth/firebase.database https://www.googleapis.com/auth/userinfo.email",
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
  if (!res.ok || !data.access_token) throw new Error(`token mint failed (${res.status})`);
  return data.access_token;
}

const json = (statusCode: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status: statusCode,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });

async function readRules(token: string): Promise<any> {
  const res = await fetch(`${RTDB_URL}/.settings/rules.json?access_token=${token}`);
  const text = await res.text();
  if (!res.ok) throw new Error(`rules read failed (${res.status}): ${text.slice(0, 200)}`);
  return JSON.parse(text);
}

async function writeRules(token: string, rules: any): Promise<void> {
  const res = await fetch(`${RTDB_URL}/.settings/rules.json?access_token=${token}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(rules),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`rules write failed (${res.status}): ${text.slice(0, 300)}`);
}

export default async (req: Request) => {
  if (req.method === "OPTIONS") return json(200, { ok: true });

  try {
    const token = await getAccessToken();

    if (req.method === "GET") {
      const rules = await readRules(token);
      return json(200, {
        hasBuzzComments: !!rules.rules?.buzz_comments,
        hasCommentsCountRule: !!rules.rules?.buzz_messages?.$groupId?.$messageId?.commentsCount,
        buzzMessagesWriteRule: rules.rules?.buzz_messages?.$groupId?.$messageId?.[".write"] || null,
      });
    }

    if (req.method === "POST") {
      const rules = await readRules(token);
      const before = !!rules.rules?.buzz_comments;
      if (!rules.rules.buzz_comments) {
        rules.rules.buzz_comments = {
          ".read": "auth != null",
          "$groupId": {
            ".read": "auth != null",
            "$messageId": {
              ".read": "auth != null",
              "$commentId": {
                ".write":
                  "auth != null && (!data.exists() || data.child('senderUid').val() === auth.uid)",
              },
            },
          },
        };
      }
      const msg = rules.rules.buzz_messages?.["$groupId"]?.["$messageId"];
      const countBefore = !!msg?.commentsCount;
      if (msg && !msg.commentsCount) {
        msg.commentsCount = { ".write": "auth != null" };
      }
      await writeRules(token, rules);
      const after = await readRules(token);
      return json(200, {
        ok: true,
        buzzCommentsAddedNow: before === false && !!after.rules?.buzz_comments,
        commentsCountRuleAddedNow: countBefore === false && !!after.rules?.buzz_messages?.["$groupId"]?.["$messageId"]?.commentsCount,
      });
    }

    return json(405, { error: "Use GET or POST." });
  } catch (e: any) {
    return json(500, { error: String(e?.message || e) });
  }
};
