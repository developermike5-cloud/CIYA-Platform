/**
 * TEMPORARY helper used once to patch the LIVE Realtime Database rules
 * (git pushes do not deploy database.rules.json). Removed after the patch runs.
 * GET  -> current state booleans
 * POST -> adds the comment reactions child rule under buzz_comments/$groupId/$messageId/$commentId
 *
 * Uses the same service-account JWT -> OAuth token approach as firebase-proxy.ts
 * (no firebase-admin dependency), then reads/writes the RTDB rules via the
 * .settings/rules.json REST endpoint.
 */
import type { Handler } from '@netlify/functions';
import crypto from 'crypto';

type ServiceAccount = { project_id: string; client_email: string; private_key: string };

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPES = 'https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/firebase https://www.googleapis.com/auth/datastore';
let cachedToken: { token: string; exp: number } | null = null;

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

async function getAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.exp - 60 > now) return cachedToken.token;
  const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '{}') as ServiceAccount;
  const input = b64url(JSON.stringify({
    iss: sa.client_email,
    scope: SCOPES,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
  })) + '.' + b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const signature = b64url(crypto.createSign('RSA-SHA256').update(input).sign(sa.private_key));
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${input}.${signature}` }),
  });
  const data: any = await res.json();
  if (!res.ok || !data.access_token) throw new Error(`token mint failed (${res.status})`);
  cachedToken = { token: data.access_token, exp: now + (data.expires_in || 3600) };
  return cachedToken.token;
}

function rtdbBase(): string {
  const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '{}') as ServiceAccount;
  return `https://${sa.project_id}-default-rtdb.europe-west1.firebasedatabase.app`;
}

async function readRules(token: string): Promise<any> {
  const res = await fetch(`${rtdbBase()}/.settings/rules.json`, { headers: { Authorization: `Bearer ${token}` } });
  const text = await res.text();
  if (!res.ok) throw new Error(`rules read failed (${res.status}): ${text.slice(0, 200)}`);
  return JSON.parse(text);
}

const handler: Handler = async (event) => {
  try {
    const token = await getAccessToken();
    if (event.httpMethod === 'GET') {
      const rules = await readRules(token);
      const b = JSON.stringify(rules?.buzz_comments || {});
      return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ hasBuzzComments: !!rules?.buzz_comments, hasReactionsChild: b.includes('"reactions"') }) };
    }
    if (event.httpMethod === 'POST') {
      const rules = await readRules(token);
      rules.buzz_comments = rules.buzz_comments || {};
      rules.buzz_comments['$groupId'] = rules.buzz_comments['$groupId'] || {};
      rules.buzz_comments['$groupId']['$messageId'] = rules.buzz_comments['$groupId']['$messageId'] || {};
      const c = rules.buzz_comments['$groupId']['$messageId']['$commentId'] = rules.buzz_comments['$groupId']['$messageId']['$commentId'] || {
        '.write': "auth != null && (!data.exists() || data.child('senderUid').val() === auth.uid)",
      };
      c.reactions = {
        '$uid': {
          '.write': 'auth != null && $uid === auth.uid',
          '.validate': 'newData.isString() && newData.val().length <= 8',
        },
      };
      rules.buzz_comments['$groupId']['$messageId'].commentsCount = { '.write': 'auth != null' };
      const res = await fetch(`${rtdbBase()}/.settings/rules.json`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify(rules),
      });
      const text = await res.text();
      if (!res.ok) return { statusCode: 500, body: `rules write failed (${res.status}): ${text.slice(0, 400)}` };
      const after = await readRules(token);
      const b = JSON.stringify(after?.buzz_comments || {});
      return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ buzzCommentsReactionsAdded: true, hasReactionsChild: b.includes('"reactions"'), hasCommentsCount: b.includes('commentsCount') }) };
    }
    return { statusCode: 405, body: 'Method not allowed' };
  } catch (err: any) {
    return { statusCode: 500, body: `error: ${err?.message || String(err)}` };
  }
};

export { handler };
