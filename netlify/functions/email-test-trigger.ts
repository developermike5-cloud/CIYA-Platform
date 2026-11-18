/**
 * Email delivery test trigger (POST JSON).
 *
 * Sends the real ZeptoMail welcome/login-details template to any address the
 * caller types, using the chosen course tier's template key, with clearly
 * sample merge data. Lets the admin verify email delivery end to end without
 * creating throwaway student accounts.
 *
 * Body: { email: string, template: "beginner" | "advanced" }
 * Env: ZEPTOMAIL_API_KEY, ZEPTO_TEMPLATE_KEY, ZEPTO_TEMPLATE_KEY_PAID,
 * ZEPTO_FROM_ADDRESS, ZEPTO_FROM_NAME.
 */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(statusCode: number, body: unknown) {
  return { statusCode, headers: { "Content-Type": "application/json", ...CORS_HEADERS }, body: JSON.stringify(body) };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const handler = async (event: { httpMethod: string; body?: string | null }) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: CORS_HEADERS, body: "" };
  if (event.httpMethod !== "POST") return json(405, { error: "method-not-allowed" });

  let body: any = {};
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "bad-json" });
  }

  const email = String(body.email || "").trim();
  const template = body.template === "advanced" ? "advanced" : "beginner";
  if (!EMAIL_RE.test(email)) return json(400, { error: "invalid-email" });

  // Some Netlify env values are pasted with the "Zoho-enczapikey" prefix
  // already included; the header adds its own, so strip any duplicate first.
  const apiKey = (process.env.ZEPTOMAIL_API_KEY || process.env.ZEPTO_API_KEY || "")
    .trim()
    .replace(/^Zoho-enczapikey\s*/i, "")
    .trim();
  const templateKey =
    template === "advanced"
      ? process.env.ZEPTO_TEMPLATE_KEY_PAID || process.env.ZEPTO_TEMPLATE_KEY
      : process.env.ZEPTO_TEMPLATE_KEY;
  const fromAddress = process.env.ZEPTO_FROM_ADDRESS;
  const fromName = process.env.ZEPTO_FROM_NAME || "CIYA Academy";

  if (!apiKey || !templateKey || !fromAddress) {
    return json(200, { ok: false, sent: false, reason: "not-configured" });
  }

  const appUrl = process.env.PUBLIC_APP_URL || "https://ciyacademy.netlify.app";
  const res = await fetch("https://api.zeptomail.com/v1.1/email/template", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Zoho-enczapikey ${apiKey}` },
    body: JSON.stringify({
      template_key: templateKey,
      from: { address: fromAddress, name: fromName },
      to: [{ email_address: { address: email, name: "Email Test" } }],
      merge_info: {
        firstname: "Email Test",
        user_email: email,
        temp_password: "Test-Trigger-Sample",
        ciya_code: "CIYA-TEST-0000",
        cohort: "Test Trigger",
        app_link: appUrl,
        course_title: template === "advanced" ? "Advanced course (test send)" : "Beginner course (test send)",
      },
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    return json(200, { ok: false, sent: false, reason: `zeptomail-${res.status}`, detail: String(detail).slice(0, 400) });
  }

  return json(200, { ok: true, sent: true, template });
};


// Modern Netlify Functions runtime (v2): adapts the legacy Lambda-style
// handler above so the function deploys on the new runtime, which reads
// environment variables at runtime instead of injecting them at creation
// (removes the 4KB env-var limit of Lambda compatibility mode).
export default async (req: Request) => {
  const url = new URL(req.url);
  const buf = Buffer.from(await req.arrayBuffer());
  const ct = req.headers.get("content-type") || "";
  const isText = buf.length === 0 || /json|text|urlencoded|multipart|form/.test(ct);
  const event: any = {
    path: url.pathname,
    httpMethod: req.method,
    headers: Object.fromEntries(req.headers.entries()),
    queryStringParameters: Object.fromEntries(url.searchParams.entries()),
    body: isText ? (buf.toString("utf8") || null) : buf.toString("base64"),
    isBase64Encoded: !isText,
  };
  const result: any = await handler(event);
  if (!result || typeof result.statusCode !== "number") {
    return new Response(JSON.stringify({ error: "Function returned no response" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
  const headers: Record<string, string> = {};
  for (const [k, v] of Object.entries(result.headers || {})) {
    if (v != null) headers[k] = String(v);
  }
  const payload = result.isBase64Encoded
    ? Buffer.from(String(result.body ?? ""), "base64")
    : (result.body ?? "");
  return new Response(payload, { status: result.statusCode, headers });
};
