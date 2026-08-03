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
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.VITE_CLOUDINARY_CLOUD_NAME || "dqrhmr7ms";
    const apiKey = process.env.CLOUDINARY_API_KEY || process.env.VITE_CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET || process.env.VITE_CLOUDINARY_API_SECRET;

    if (!apiKey || !apiSecret) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "Cloudinary credentials not configured on serverless environment." }),
      };
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const params: Record<string, string> = {
      timestamp: String(timestamp),
    };
    if (folder) {
      params.folder = folder;
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
