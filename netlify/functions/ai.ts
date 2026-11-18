/**
 * AI endpoints for CIYA.
 *
 * POST /api/ai/compile-smart-prompt
 *   Compiles a student's KYC answers into a tailored master developer prompt
 *   using Vertex AI on Google Cloud (the user's own GCP project and credits).
 *
 * All three credentials stay server-side as Netlify environment variables and
 * are never committed or exposed to the client:
 *   KYCB_API_KEY       the KYCB API key generated for Vertex AI
 *   VERTEX_PROJECT_ID  the Vertex project ID
 *   VERTEX_LOCATION    the Vertex location (e.g. europe-west2)
 *
 * Vertex AI runs in API-key (express) mode here: the key authenticates the
 * call and the project ID and location go in the request URL, so all three
 * variables are needed. Calls use the REST API directly so the function
 * carries no extra SDK dependency.
 */

type VertexResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
  error?: { message?: string; status?: string };
};

const MODELS_TO_TRY = ["gemini-1.5-pro", "gemini-1.5-flash"];

const SYSTEM_INSTRUCTION = `You are an expert Prompt Engineer, Senior Web Architect, and Brand Strategist.
Your goal is to generate a comprehensive, professional, single-screen or multi-screen developer prompt for a student's business.
You are trained on a provided reference template which shows the standard level of high-quality detail, design directions, typography, sections structure, and production code guidelines.

Your output must be a single cohesive developer prompt that follows the high-quality structure, phrasing, and phases of the reference template, BUT adapted 100% to the student's actual business information.

CRITICAL INSTRUCTIONS:
1. STRICTLY EXCLUDE ANY DUMMY DATA FROM THE REFERENCE TEMPLATE. Do not include any business names, addresses, phone numbers, social handles, or products from the reference template.
2. EXTRACT AND USE ONLY the student's actual business info from the 'STUDENT DATA' provided. If the student has products, lists, colors, or vibes, use them exactly. If they lack some details, professionally elaborate them in the style and depth of the template.
3. The prompt you output MUST start directly with: 'System Instruction: You are an expert...' and contain Phase 1, Phase 2, Phase 3, etc. with exact, tailored specifications for the student's business.
4. DO NOT write any conversational introduction, footnotes, or wrappers. Simply output the generated developer prompt itself.`;

const json = (statusCode: number, body: Record<string, unknown>) => ({
  statusCode,
  headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  body: JSON.stringify(body),
});

async function callVertex(model: string, apiKey: string, project: string, location: string, contents: string): Promise<string> {
  const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/${model}:generateContent`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: contents }] }],
      systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
      generationConfig: { temperature: 0.3 },
    }),
  });

  const data = (await resp.json()) as VertexResponse;
  if (!resp.ok) {
    const err: any = new Error(data.error?.message || `Vertex AI model ${model} failed.`);
    err.status = resp.status;
    throw err;
  }
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error(`Vertex AI model ${model} returned an empty response.`);
  return text;
}

async function handler(event: any) {
  if (event.httpMethod === "OPTIONS") return json(200, { ok: true });
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed." });

  const path = (event.path || "").replace("/.netlify/functions/ai", "");
  if (!path.includes("compile-smart-prompt")) {
    return json(404, { error: "Unknown AI endpoint.", message: "This AI endpoint is not implemented yet." });
  }

  let businessInfo: string = "";
  let websiteType: string = "landing";
  let referenceTemplate: string = "";
  try {
    const body = JSON.parse(event.body || "{}");
    businessInfo = body.businessInfo || "";
    websiteType = body.websiteType || "landing";
    referenceTemplate = body.referenceTemplate || "";
  } catch {
    return json(400, { error: "Invalid JSON body." });
  }

  if (!businessInfo) return json(400, { error: "businessInfo is required." });

  const apiKey = process.env.KYCB_API_KEY || process.env.VERTEX_API_KEY;
  const project = process.env.VERTEX_PROJECT_ID;
  const location = process.env.VERTEX_LOCATION;
  if (!apiKey || !project || !location) {
    return json(500, {
      error: "AI not configured.",
      message:
        "The server's Vertex AI settings are incomplete. KYCB_API_KEY, VERTEX_PROJECT_ID and VERTEX_LOCATION must all be set in the site's environment variables, then redeploy and try again.",
    });
  }

  const contents = `=== REFERENCE TEMPLATE (STANDARD MODEL FOR TRAINING) ===
${referenceTemplate}

=== STUDENT DATA (RAW KYCB ANSWERS) ===
${businessInfo}

=== TARGET WEBSITE TYPE ===
${websiteType}

Please scan the STUDENT DATA and generate a beautifully tailored, high-fidelity developer prompt based on the template structure and standard of quality, but strictly customized to the student's business details without any reference template dummy info:`;

  let generatedText = "";
  let lastError: any = null;
  for (const model of MODELS_TO_TRY) {
    try {
      generatedText = await callVertex(model, apiKey, project, location, contents);
      break;
    } catch (err: any) {
      lastError = err;
    }
  }

  if (!generatedText) {
    const msg = lastError?.message || "Failed to generate the master prompt with AI.";
    const isQuota =
      /quota|rate limit|resource_exhausted|exhausted/i.test(msg) || lastError?.status === 429;
    if (isQuota) {
      return json(429, {
        error: "AI Quota Exceeded",
        message: "The AI generation limit has been reached. Please wait a moment and try again.",
      });
    }
    return json(500, { error: msg });
  }

  return json(200, { prompt: generatedText });
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
