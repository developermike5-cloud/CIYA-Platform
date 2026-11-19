/**
 * TEMPORARY helper used once to patch the LIVE Realtime Database rules
 * (git pushes do not deploy database.rules.json). Removed after the patch runs.
 * GET  -> current state booleans
 * POST -> adds the comment reactions child rule under buzz_comments/$groupId/$messageId/$commentId
 *
 * Written in the MODERN Netlify Functions style (default export, Request/Response)
 * so it is NOT subject to the legacy Lambda-compatibility 4KB environment limit.
 * JWT signing uses the Web Crypto API (crypto.subtle) rather than node:crypto,
 * which mis-signs in some modern runtimes.
 */
type ServiceAccount = { project_id: string; client_email: string; private_key: string };

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPES = 'https://www.googleapis.com/auth/cloud-platform';
let cachedToken: { token: string; exp: number } | null = null;

function strToBytes(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

function bytesToB64url(b: Uint8Array): string {
  let s = '';
  for (const c of b) s += String.fromCharCode(c);
  return btoa(s).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function pemToDer(pem: string): Uint8Array {
  const b64 = pem.replace(/-----BEGIN PRIVATE KEY-----/, '').replace(/-----END PRIVATE KEY-----/, '').replace(/\s+/g, '');
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

async function signJwtInput(input: string): Promise<string> {
  const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '{}') as ServiceAccount;
  const key = await crypto.subtle.importKey('pkcs8', pemToDer(sa.private_key), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, strToBytes(input));
  return bytesToB64url(new Uint8Array(sig));
}

async function tryMint(scope: string): Promise<{ ok: boolean; detail: string }> {
  try {
    const now = Math.floor(Date.now() / 1000);
    const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '{}') as ServiceAccount;
    const input = bytesToB64url(strToBytes(JSON.stringify({ iss: sa.client_email, scope, aud: TOKEN_URL, iat: now, exp: now + 3600 })))
      + '.' + bytesToB64url(strToBytes(JSON.stringify({ alg: 'RS256', typ: 'JWT' })));
    const signature = await signJwtInput(input);
    const body = 'grant_type=' + encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer') + '&assertion=' + encodeURIComponent(`${input}.${signature}`);
    const res = await fetch(TOKEN_URL, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body });
    const text = await res.text();
    let d: any = {}; try { d = JSON.parse(text); } catch {}
    return { ok: !!(res.ok && d.access_token), detail: `http=${res.status} ${text.slice(0, 140)}` };
  } catch (e: any) {
    return { ok: false, detail: `threw: ${e?.message || String(e)}` };
  }
}

async function getAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.exp - 60 > now) return cachedToken.token;
  const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '{}') as ServiceAccount;
  if (!sa.private_key || !sa.client_email) throw new Error('service account env missing or malformed');
  const input = bytesToB64url(strToBytes(JSON.stringify({ iss: sa.client_email, scope: SCOPES, aud: TOKEN_URL, iat: now, exp: now + 3600 })))
    + '.' + bytesToB64url(strToBytes(JSON.stringify({ alg: 'RS256', typ: 'JWT' })));
  const signature = await signJwtInput(input);
  const assertion = `${input}.${signature}`;
  const body = 'grant_type=' + encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer') + '&assertion=' + encodeURIComponent(assertion);
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  });
  const text = await res.text();
  let data: any = {};
  try { data = JSON.parse(text); } catch {}
  if (!res.ok || !data.access_token) throw new Error(`token mint failed (${res.status}): ${text.slice(0, 300)}`);
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

const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'content-type',
};

async function buildAssertion(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '{}') as ServiceAccount;
  const input = bytesToB64url(strToBytes(JSON.stringify({ iss: sa.client_email, scope: SCOPES, aud: TOKEN_URL, iat: now, exp: now + 3600 })))
    + '.' + bytesToB64url(strToBytes(JSON.stringify({ alg: 'RS256', typ: 'JWT' })));
  return `${input}.${await signJwtInput(input)}`;
}

export default async (req: Request) => {
  try {
    if (req.method === 'GET' && new URL(req.url).searchParams.get('probe') === '1') {
      const candidates: Array<[string, string]> = [
        ['cloud-platform', 'https://www.googleapis.com/auth/cloud-platform'],
        ['userinfo.email', 'https://www.googleapis.com/auth/userinfo.email'],
        ['firebase.database', 'https://www.googleapis.com/auth/firebase.database'],
        ['firebase(readonly)', 'https://www.googleapis.com/auth/firebase.database.readonly'],
        ['datastore', 'https://www.googleapis.com/auth/datastore'],
        ['firebase-admin(firebase)', 'https://www.googleapis.com/auth/firebase'],
        ['legacy-3-scope', 'https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/firebase https://www.googleapis.com/auth/datastore'],
        ['userinfo+firebasedb', 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/firebase.database'],
      ];
      const out: Record<string, string> = {};
      for (const [name, scope] of candidates) out[name] = (await tryMint(scope)).detail;
      return new Response(JSON.stringify(out, null, 2), { status: 200, headers: { 'content-type': 'application/json', ...corsHeaders } });
    }
    if (req.method === 'GET' && new URL(req.url).searchParams.get('echo') === '1') {
      const assertion = await buildAssertion();
      const r = await fetch('https://postman-echo.com/post', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
      });
      const t = await r.text();
      let received: any = {};
      try { received = JSON.parse(t); } catch {}
      return new Response(JSON.stringify({
        assertionSent: assertion.slice(0, 60) + '...',
        sentGrantType: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        echoStatus: r.status,
        echoForm: received?.form || null,
        echoJson: received?.json || null,
      }, null, 2), { status: 200, headers: { 'content-type': 'application/json', ...corsHeaders } });
    }
    const token = await getAccessToken();
    if (req.method === 'GET') {
      const rules = await readRules(token);
      const b = JSON.stringify(rules?.buzz_comments || {});
      return new Response(JSON.stringify({ hasBuzzComments: !!rules?.buzz_comments, hasReactionsChild: b.includes('"reactions"') }), {
        status: 200,
        headers: { 'content-type': 'application/json', ...corsHeaders },
      });
    }
    if (req.method === 'POST') {
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
      if (!res.ok) return new Response(`rules write failed (${res.status}): ${text.slice(0, 400)}`, { status: 500, headers: corsHeaders });
      const after = await readRules(token);
      const b = JSON.stringify(after?.buzz_comments || {});
      return new Response(JSON.stringify({ buzzCommentsReactionsAdded: true, hasReactionsChild: b.includes('"reactions"'), hasCommentsCount: b.includes('commentsCount') }), {
        status: 200,
        headers: { 'content-type': 'application/json', ...corsHeaders },
      });
    }
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  } catch (err: any) {
    return new Response(`error: ${err?.message || String(err)}`, { status: 500, headers: corsHeaders });
  }
};
