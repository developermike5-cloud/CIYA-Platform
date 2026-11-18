/**
 * AI endpoints for CIYA.
 *
 * POST /api/ai/compile-smart-prompt
 *   Compiles a student's KYC answers into a tailored master developer prompt
 *   using Gemini. The GEMINI_API_KEY stays server-side; it is never committed
 *   or exposed to the client.
 *
 * The Gemini call uses the REST API directly so the function carries no extra
 * SDK dependency.
 */

type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
  error?: { message?: string; status?: string };
};

const MODELS_TO_TRY = ["gemini-3.5-flash", "gemini-flash-latest", "gemini-3.1-flash-lite"];

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

async function callGemini(model: string, apiKey: string, contents: string): Promise<string> {
  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: contents }] }],
        systemInstruction: { role: "system", parts: [{ text: SYSTEM_INSTRUCTION }] },
        generationConfig: { temperature: 0.3 },
      }),
    }
  );

  const data = (await resp.json()) as GeminiResponse;
  if (!resp.ok) {
    const err: any = new Error(data.error?.message || `Gemini model ${model} failed.`);
    err.status = resp.status;
    throw err;
  }
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error(`Gemini model ${model} returned an empty response.`);
  return text;
}

export async function handler(event: any) {
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

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return json(500, {
      error: "AI key not configured.",
      message:
        "The server's AI key is not set up yet. Add GEMINI_API_KEY in the site's environment variable settings, then try again.",
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
      generatedText = await callGemini(model, apiKey, contents);
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
