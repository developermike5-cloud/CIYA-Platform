/**
 * AI endpoints for CIYA.
 *
 * POST /api/ai/compile-smart-prompt
 *   Compiles a student's KYC answers into a tailored master developer prompt
 *   using Vertex AI on Google Cloud (the user's own GCP project and credits).
 *
 * The credential stays server-side as a Netlify environment variable and is
 * never committed or exposed to the client:
 *   KYCB_API_KEY  the KYCB API key generated for Vertex AI
 *
 * Vertex AI runs in API-key (express) mode here: the key authenticates the
 * call and carries the project itself, so the global endpoint is used and
 * neither VERTEX_PROJECT_ID nor VERTEX_LOCATION is needed. Calls use the
 * REST API directly so the function carries no extra SDK dependency.
 */

type VertexResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
  error?: { message?: string; status?: string };
};

const MODELS_TO_TRY = ["gemini-2.5-flash", "gemini-2.0-flash"];

const SYSTEM_INSTRUCTION = `You are an expert Prompt Engineer, Senior Web Architect, and Brand Strategist.
Your goal is to generate a comprehensive, professional, single-screen or multi-screen developer prompt for a student's business.
You are trained on a provided reference template which shows the standard level of high-quality detail, design directions, typography, sections structure, and production code guidelines.

Your output must be a single cohesive developer prompt that follows the high-quality structure, phrasing, and phases of the reference template, BUT adapted 100% to the student's actual business information.

CRITICAL INSTRUCTIONS:
1. STRICTLY EXCLUDE ANY DUMMY DATA FROM THE REFERENCE TEMPLATE. Do not include any business names, addresses, phone numbers, social handles, or products from the reference template.
2. EXTRACT AND USE ONLY the student's actual business info from the 'STUDENT DATA' provided. If the student has products, lists, colors, or vibes, use them exactly.
3. FLEXIBLE COVERAGE: treat the reference template as a style and quality guide, not a rigid mold. Wherever the template defines a section clearly, follow its structure. Wherever a section is vague, thin, or missing from the template, design it yourself from the student's answers, filling the gaps with professional, sensible defaults that suit their business and industry. Never leave a section empty, and never invent a specific business detail that contradicts the student's data.
4. The prompt you output MUST start directly with: 'System Instruction: You are an expert...' and contain Phase 1, Phase 2, Phase 3, etc. with exact, tailored specifications for the student's business.
5. DO NOT write any conversational introduction, footnotes, or wrappers. Simply output the generated developer prompt itself.`;

const json = (statusCode: number, body: Record<string, unknown>) => ({
  statusCode,
  headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  body: JSON.stringify(body),
});

async function callVertex(model: string, apiKey: string, contents: string): Promise<string> {
  // Express mode (API-key) uses the global endpoint: no project or location
  // in the URL, the key itself carries the project.
  const url = `https://aiplatform.googleapis.com/v1/publishers/google/models/${model}:generateContent`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: contents }] }],
      systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 16384,
        // gemini-2.5-flash spends its output budget on internal "thinking"
        // unless told otherwise, which can come back as an empty response.
        ...(model.startsWith("gemini-2.5") ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
      },
    }),
  });

  const data = (await resp.json()) as VertexResponse;
  if (!resp.ok) {
    const err: any = new Error(data.error?.message || `Vertex AI model ${model} failed.`);
    err.status = resp.status;
    throw err;
  }
  const text = (data.candidates?.[0]?.content?.parts || [])
    .map((p) => p.text || "")
    .join("")
    .trim();
  if (!text) {
    const reason = (data.candidates?.[0] as any)?.finishReason || (data as any).promptFeedback?.blockReason;
    throw new Error(`Vertex AI model ${model} returned an empty response${reason ? ` (finish reason: ${reason})` : ""}.`);
  }
  return text;
}

// Last-resort tailoring: if every model comes back empty, compose the tailored
// prompt directly from the reference template plus the student's KYCB answers,
// so a saved form always produces a usable prompt.
function buildFallbackPrompt(businessInfo: string, websiteType: string, referenceTemplate: string): string {
  return `System Instruction: You are an expert web developer, UI designer, and brand strategist. Build a complete, production-quality ${websiteType} for the business described below.

=== BUSINESS BRIEF (FROM THE CLIENT'S KYCB ANSWERS) ===
${businessInfo}

=== HOW TO WORK ===
1. Treat the business brief above as the single source of truth: every name, color, offer, section, and feature it specifies must appear exactly as stated.
2. Where the brief clearly defines a section, implement it as specified.
3. Where the brief is silent or thin, act as the business's designer: choose sensible, professional defaults that fit the business and its industry, and state each choice in your output.
4. Keep the overall structure, phrasing standard, and quality of the reference template below, but replace ALL of its placeholder business details with the client's own. Never copy the reference template's dummy business info into the output.

=== REFERENCE TEMPLATE (STRUCTURE AND QUALITY STANDARD) ===
${referenceTemplate || "(No reference template provided. Design a standard, high-quality structure for this website type.)"}`;
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
  if (!apiKey) {
    return json(500, {
      error: "AI not configured.",
      message:
        "The server's Vertex AI key is not set up yet. Set KYCB_API_KEY in the site's environment variables, then redeploy and try again.",
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
      generatedText = await callVertex(model, apiKey, contents);
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
    return json(200, { prompt: buildFallbackPrompt(businessInfo, websiteType, referenceTemplate) });
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
