// Temporary diagnostic: reports the shape (not the value) of every mail env var
// the email functions read, in the deploy context it runs in. Delete after use.
export const handler = async () => {
  const names = [
    "ZEPTOMAIL_API_KEY", "ZEPTO_API_KEY", "ZEPTO_TEMPLATE_KEY", "ZEPTO_TEMPLATE_KEY_PAID",
    "ZEPTO_FROM_ADDRESS", "ZEPTO_FROM_NAME", "ZEPTOMAIL_HOST", "ZEPTOMAIL_AGENT_ALIAS",
  ];
  const report: Record<string, unknown> = {};
  for (const n of names) {
    const v = process.env[n];
    if (v === undefined) { report[n] = "unset"; continue; }
    if (!v.trim()) { report[n] = "empty/whitespace"; continue; }
    report[n] = {
      length: v.length,
      starts: v.slice(0, 5),
      ends: v.slice(-3).replace(/[^.]/g, "*"),
      hasWhitespace: /\s/.test(v) || v !== v.trim(),
      looksLikeZohoToken: /^1000\./.test(v.trim()),
      hasEnczPrefix: /^Zoho-enczapikey/i.test(v.trim()),
    };
  }
  return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify(report) };
};
