import crypto from "crypto";

function parseCloudinaryUrl(url: string): { publicId: string; resourceType: 'image' | 'video' | 'raw' } | null {
  if (!url || typeof url !== 'string' || !url.includes('cloudinary.com')) return null;

  try {
    const isVideo = url.includes('/video/');
    const resourceType: 'image' | 'video' | 'raw' = isVideo ? 'video' : 'image';

    const uploadIdx = url.indexOf('/upload/');
    if (uploadIdx === -1) return null;

    let pathAfterUpload = url.substring(uploadIdx + 8);
    const queryIdx = pathAfterUpload.indexOf('?');
    if (queryIdx !== -1) {
      pathAfterUpload = pathAfterUpload.substring(0, queryIdx);
    }

    const parts = pathAfterUpload.split('/');
    const cleanParts: string[] = [];
    for (const part of parts) {
      if (/^v\d+$/.test(part)) continue;
      if (part.includes('_') && (part.startsWith('c_') || part.startsWith('w_') || part.startsWith('h_') || part.startsWith('f_') || part.startsWith('q_') || part.startsWith('r_'))) {
        continue;
      }
      cleanParts.push(part);
    }

    const fullPath = cleanParts.join('/');
    const lastDotIdx = fullPath.lastIndexOf('.');
    const publicId = lastDotIdx !== -1 ? fullPath.substring(0, lastDotIdx) : fullPath;

    if (!publicId) return null;
    return { publicId, resourceType };
  } catch (err) {
    return null;
  }
}

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

    const mediaUrl = body.url;
    if (!mediaUrl) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "Missing required 'url' parameter." }),
      };
    }

    const parsed = parseCloudinaryUrl(mediaUrl);
    if (!parsed || !parsed.publicId) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "Could not extract valid Cloudinary public_id from provided URL." }),
      };
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME || "qgvszym1";
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!apiKey || !apiSecret) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "Cloudinary credentials missing in serverless environment." }),
      };
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const { publicId, resourceType } = parsed;

    const paramString = `public_id=${publicId}&timestamp=${timestamp}`;
    const signature = crypto
      .createHash("sha1")
      .update(`${paramString}${apiSecret}`)
      .digest("hex");

    const destroyUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/destroy`;
    const formData = new URLSearchParams();
    formData.append("public_id", publicId);
    formData.append("timestamp", String(timestamp));
    formData.append("api_key", apiKey);
    formData.append("signature", signature);

    const cloudRes = await fetch(destroyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
    });

    const resData = await cloudRes.json();
    const result = resData.result;

    if (result === "ok" || result === "not_found") {
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ success: true, result, public_id: publicId }),
      };
    }

    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ success: false, result, error: resData.error?.message || "Cloudinary deletion failed" }),
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: err.message || "Failed to execute Cloudinary deletion" }),
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
