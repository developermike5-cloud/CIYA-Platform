import crypto from "crypto";

export async function handler(event: any) {
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
