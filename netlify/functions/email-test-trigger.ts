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

export const handler = async (event: { httpMethod: string; body?: string | null }) => {
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
