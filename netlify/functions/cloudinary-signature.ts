import crypto from "crypto";

async function handler(event: any) {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
      body: "",
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  try {
    let body: any = {};
    if (event.body) {
      try {
        body = JSON.parse(event.body);
      } catch (e) {
        body = {};
      }
    }

    const folder = body.folder || "ciya";
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME || "qgvszym1";
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!apiKey || !apiSecret) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "Cloudinary credentials not configured on serverless environment." }),
      };
    }

    // Cloudinary validates the signature over EVERY param sent with the upload,
    // so tags (e.g. student ids on payment proofs) must be signed too.
    const tags = typeof body.tags === "string" && body.tags ? body.tags : "";
    const timestamp = Math.floor(Date.now() / 1000);
    const params: Record<string, string> = {
      timestamp: String(timestamp),
    };
    if (folder) {
      params.folder = folder;
    }
    if (tags) {
      params.tags = tags;
    }

    const sortedKeys = Object.keys(params).sort();
    const paramString = sortedKeys.map((key) => `${key}=${params[key]}`).join("&");

    const signature = crypto
      .createHash("sha1")
      .update(`${paramString}${apiSecret}`)
      .digest("hex");

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        signature,
        timestamp,
        apiKey,
        cloudName,
        folder,
        tags,
      }),
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: err.message || "Failed to generate Cloudinary signature" }),
    };
  }
}


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
