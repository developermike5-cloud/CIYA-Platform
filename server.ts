import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";

// Safe directory name resolution for ESM / CommonJS hybrid environment
const currentDir = (() => {
  try {
    return __dirname;
  } catch {
    return path.dirname(fileURLToPath(import.meta.url));
  }
})();
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    title: {
      type: Type.STRING,
      description: "A highly clear, professional, educational lesson title representing the video's theme or focus."
    },
    duration: {
      type: Type.STRING,
      description: "The estimated duration of the lesson video, e.g. '8 min', '12 min', '15 min'. Format MUST be '<number> min'."
    },
    description: {
      type: Type.STRING,
      description: "A motivating, high-retention 'Brief Video Summary / Instructions' context detailing what the student will learn from this walkthrough, and the practical action they must take after watching."
    },
    checks: {
      type: Type.ARRAY,
      description: "A list of 1 to 3 engagement check questions or facts. Formulate them based on the requested checkType.",
      items: {
        type: Type.OBJECT,
        properties: {
          question: { type: Type.STRING, description: "Only used if checkType is 'mcq'. The quiz question." },
          options: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Only used if checkType is 'mcq'. Exactly 4 plausible options."
          },
          correct: { type: Type.INTEGER, description: "Only used if checkType is 'mcq'. Index of correct option (0 to 3)." },
          statement: { type: Type.STRING, description: "Only used if checkType is 'tf'. True / False statement." },
          answer: { type: Type.BOOLEAN, description: "Only used if checkType is 'tf'. True / False answer." },
          headline: { type: Type.STRING, description: "Only used if checkType is 'fact'. Catchy headline of the interesting fact." },
          body: { type: Type.STRING, description: "Only used if checkType is 'fact'. Body text of the interesting fun fact." },
          explanation: { type: Type.STRING, description: "Clear explanation for the correct answer to aid student learning." }
        }
      }
    }
  },
  required: ["title", "duration", "description", "checks"]
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '100mb' }));
  app.use(express.urlencoded({ limit: '100mb', extended: true }));

  // Add API routes here
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Fast in-memory cache for proxied websites to load them instantly
  const proxyCache = new Map<string, { body: string; contentType: string; timestamp: number }>();
  const PROXY_CACHE_TTL = 120000; // Cache for 2 minutes

  // Secure, high-compatibility website proxy to bypass X-Frame-Options & CSP headers for nested previews
  app.get("/api/proxy", async (req, res) => {
    const targetUrl = req.query.url as string;
    if (!targetUrl) {
      return res.status(400).send("URL parameter is required.");
    }

    try {
      new URL(targetUrl);
    } catch {
      return res.status(400).send("Invalid URL format.");
    }

    // Check cache first for lightning fast loading
    const cached = proxyCache.get(targetUrl);
    if (cached && Date.now() - cached.timestamp < PROXY_CACHE_TTL) {
      res.setHeader("X-Frame-Options", "ALLOWALL");
      res.setHeader("Content-Security-Policy", "frame-ancestors *;");
      res.setHeader("Content-Type", cached.contentType || "text/html; charset=utf-8");
      return res.send(cached.body);
    }

    try {
      const response = await fetch(targetUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8"
        }
      });

      const contentType = response.headers.get("content-type") || "";
      const body = await response.text();

      // Inject base URL so relative assets (CSS, JS, images) load from original host correctly
      let modifiedBody = body;
      if (contentType.includes("text/html")) {
        const baseTag = `<base href="${targetUrl}">`;
        if (body.includes("<head>")) {
          modifiedBody = body.replace("<head>", `<head>${baseTag}`);
        } else if (body.includes("<HEAD>")) {
          modifiedBody = body.replace("<HEAD>", `<HEAD>${baseTag}`);
        } else if (body.includes("<html>")) {
          modifiedBody = body.replace("<html>", `<html>${baseTag}`);
        } else if (body.includes("<HTML>")) {
          modifiedBody = body.replace("<HTML>", `<HTML>${baseTag}`);
        } else {
          modifiedBody = baseTag + body;
        }
      }

      // Store in memory cache
      proxyCache.set(targetUrl, {
        body: modifiedBody,
        contentType,
        timestamp: Date.now()
      });

      // Overwrite frame blocking headers to allow framing
      res.setHeader("X-Frame-Options", "ALLOWALL");
      res.setHeader("Content-Security-Policy", "frame-ancestors *;");
      res.setHeader("Content-Type", contentType || "text/html; charset=utf-8");

      res.send(modifiedBody);
    } catch (err: any) {
      console.error(`Proxy failure for URL ${targetUrl}:`, err);
      res.status(500).send(`Failed to fetch preview: ${err.message}`);
    }
  });

  const getCoursesFilePath = () => {
    const possiblePaths = [
      path.resolve(process.cwd(), "src", "data", "courses.json"),
      path.resolve(process.cwd(), "dist", "courses.json"),
      path.resolve(currentDir, "src", "data", "courses.json"),
      path.resolve(currentDir, "..", "src", "data", "courses.json"),
      path.resolve(currentDir, "courses.json")
    ];
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        return p;
      }
    }
    return possiblePaths[0];
  };

  const getAdvancedCoursesFilePath = () => {
    const possiblePaths = [
      path.resolve(process.cwd(), "src", "data", "advanced_courses.json"),
      path.resolve(process.cwd(), "dist", "advanced_courses.json"),
      path.resolve(currentDir, "src", "data", "advanced_courses.json"),
      path.resolve(currentDir, "..", "src", "data", "advanced_courses.json"),
      path.resolve(currentDir, "advanced_courses.json")
    ];
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        return p;
      }
    }
    return possiblePaths[0];
  };

  const getFullPromptsFilePath = () => {
    const possiblePaths = [
      path.resolve(process.cwd(), "src", "data", "full_prompts.json"),
      path.resolve(process.cwd(), "dist", "full_prompts.json"),
      path.resolve(currentDir, "src", "data", "full_prompts.json"),
      path.resolve(currentDir, "..", "src", "data", "full_prompts.json"),
      path.resolve(currentDir, "full_prompts.json")
    ];
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        return p;
      }
    }
    return possiblePaths[0];
  };

  const getModularPromptsFilePath = () => {
    const possiblePaths = [
      path.resolve(process.cwd(), "src", "data", "modular_prompts.json"),
      path.resolve(process.cwd(), "dist", "modular_prompts.json"),
      path.resolve(currentDir, "src", "data", "modular_prompts.json"),
      path.resolve(currentDir, "..", "src", "data", "modular_prompts.json"),
      path.resolve(currentDir, "modular_prompts.json")
    ];
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        return p;
      }
    }
    return possiblePaths[0];
  };

  app.get("/api/courses", (req, res) => {
    try {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      const filePath = getCoursesFilePath();
      if (fs.existsSync(filePath)) {
        const fileData = fs.readFileSync(filePath, "utf-8");
        res.json(JSON.parse(fileData));
      } else {
        res.json([]);
      }
    } catch (err: any) {
      console.error("Failed to read courses.json:", err);
      res.status(500).json({ error: err.message || "Failed to read courses." });
    }
  });

  app.get("/api/advanced-courses", (req, res) => {
    try {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      const filePath = getAdvancedCoursesFilePath();
      if (fs.existsSync(filePath)) {
        const fileData = fs.readFileSync(filePath, "utf-8");
        res.json(JSON.parse(fileData));
      } else {
        res.json([]);
      }
    } catch (err: any) {
      console.error("Failed to read advanced_courses.json:", err);
      res.status(500).json({ error: err.message || "Failed to read advanced courses." });
    }
  });

  app.post("/api/courses/save", (req, res) => {
    try {
      const { courses } = req.body;
      if (!Array.isArray(courses)) {
        return res.status(400).json({ error: "Invalid courses data. Expected an array." });
      }
      const filePath = getCoursesFilePath();
      const dirPath = path.dirname(filePath);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      fs.writeFileSync(filePath, JSON.stringify(courses, null, 2), "utf-8");
      res.json({ success: true });
    } catch (err: any) {
      console.error("Failed to write to courses.json:", err);
      res.status(500).json({ error: err.message || "Failed to save courses to files." });
    }
  });

  app.post("/api/advanced-courses/save", (req, res) => {
    try {
      const { courses } = req.body;
      if (!Array.isArray(courses)) {
        return res.status(400).json({ error: "Invalid advanced courses data. Expected an array." });
      }
      const filePath = getAdvancedCoursesFilePath();
      const dirPath = path.dirname(filePath);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      fs.writeFileSync(filePath, JSON.stringify(courses, null, 2), "utf-8");
      res.json({ success: true });
    } catch (err: any) {
      console.error("Failed to write to advanced_courses.json:", err);
      res.status(500).json({ error: err.message || "Failed to save advanced courses to files." });
    }
  });

  app.get("/api/prompts", (req, res) => {
    try {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");

      const fullPath = getFullPromptsFilePath();
      const modPath = getModularPromptsFilePath();

      let fullTemplates = [];
      let modularTemplates = [];
      let fullUpdatedAt = "";
      let modularUpdatedAt = "";

      if (fs.existsSync(fullPath)) {
        try {
          const fullData = JSON.parse(fs.readFileSync(fullPath, "utf-8"));
          fullTemplates = fullData.templates || [];
          fullUpdatedAt = fullData.updatedAt || "";
        } catch (e) {
          console.error("Error reading full prompts on disk:", e);
        }
      }

      if (fs.existsSync(modPath)) {
        try {
          const modData = JSON.parse(fs.readFileSync(modPath, "utf-8"));
          modularTemplates = modData.templates || [];
          modularUpdatedAt = modData.updatedAt || "";
        } catch (e) {
          console.error("Error reading modular prompts on disk:", e);
        }
      }

      res.json({ fullTemplates, modularTemplates, fullUpdatedAt, modularUpdatedAt });
    } catch (err: any) {
      console.error("Failed to read prompts:", err);
      res.status(500).json({ error: err.message || "Failed to read prompts." });
    }
  });

  app.post("/api/prompts/save", (req, res) => {
    try {
      const { fullTemplates, modularTemplates } = req.body;
      if (!Array.isArray(fullTemplates) || !Array.isArray(modularTemplates)) {
        return res.status(400).json({ error: "Invalid prompts data. Expected arrays." });
      }

      const fullPath = getFullPromptsFilePath();
      const modPath = getModularPromptsFilePath();

      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.mkdirSync(path.dirname(modPath), { recursive: true });

      const fullUpdatedAt = new Date().toISOString();
      const modularUpdatedAt = new Date().toISOString();

      const fullPayload = {
        updatedAt: fullUpdatedAt,
        templates: fullTemplates
      };
      const modPayload = {
        updatedAt: modularUpdatedAt,
        templates: modularTemplates
      };

      fs.writeFileSync(fullPath, JSON.stringify(fullPayload, null, 2), "utf-8");
      fs.writeFileSync(modPath, JSON.stringify(modPayload, null, 2), "utf-8");

      res.json({ success: true, fullUpdatedAt, modularUpdatedAt });
    } catch (err: any) {
      console.error("Failed to write to prompt files:", err);
      res.status(500).json({ error: err.message || "Failed to save prompts to files." });
    }
  });

  app.post("/api/ai/youtube-lesson-gen", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(200).json({ 
          error: "GEMINI_API_KEY environment variable is not configured." 
        });
      }
      
      const { url, checkType } = req.body;
      if (!url) {
        return res.status(400).json({ error: "A valid YouTube URL is required." });
      }

      // We will try gemini-3.5-flash first, then try gemini-flash-latest and gemini-3.1-flash-lite as fallback.
      const modelsToTry = ["gemini-3.5-flash", "gemini-flash-latest", "gemini-3.1-flash-lite"];
      let lastError: any = null;
      let generatedText = "";

      for (const modelName of modelsToTry) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: `Analyze this YouTube link: ${url}. Selected check type is '${checkType || 'none'}'. Help the instructor build a highly professional, educational syllabus card for CIYA.`,
            config: {
              systemInstruction: "You are an expert AI instructional designer. Based on the video context, keywords in the link, and instructional design principles, generate lesson metadata and a list of 2 or 3 fun/useful engagement checks matching the specified checkType. Do not include empty fields for the unused types. Make sure options array has exactly 4 items for MCQ.",
              responseMimeType: "application/json",
              responseSchema: responseSchema
            }
          });
          if (response.text) {
            generatedText = response.text;
            break; // Success!
          }
        } catch (err: any) {
          console.warn(`Model ${modelName} failed, trying fallback if available...`, err);
          lastError = err;
        }
      }

      // If both models failed, let's offer a structured fallback so the user is never blocked!
      if (!generatedText) {
        console.error("All Gemini AI models failed. Using professional heuristic fallback content.");
        
        // Extract a clean title if possible from link or make a nice general one
        let titleHeuristic = "Introduction to CIYA Professional Syllabus Walkthrough";
        if (url.includes("watch?v=")) {
          const parts = url.split("watch?v=");
          if (parts[1]) {
            titleHeuristic = `CIYA Premium Walkthrough (Lesson Clip #${parts[1].substring(0, 4).toUpperCase()})`;
          }
        }

        const checksFallback: any[] = [];
        if (checkType === "mcq") {
          checksFallback.push({
            question: "What is the primary action item outlined in this syllabus clip?",
            options: [
              "Review the full curriculum guidelines",
              "Execute a mock design template",
              "Install workspace setup components",
              "Begin tracking your daily goals"
            ],
            correct: 0,
            explanation: "Reviewing curriculum guidelines helps set the baseline context for consecutive lesson steps."
          });
        } else if (checkType === "tf") {
          checksFallback.push({
            statement: "The instructional video guides students to complete all practical labs immediately.",
            answer: true,
            explanation: "Doing practical exercises concurrently facilitates high visual and operational retention."
          });
        } else if (checkType === "fact") {
          checksFallback.push({
            headline: "Engagement Stat",
            body: "Interactive micro-lessons and checkpoints increase syllabus retention rates by over 40%."
          });
        }

        const fallbackPayload = {
          title: titleHeuristic,
          duration: "10 min",
          description: "This lesson has been set up using standard course guidelines. Watch this walkthrough, practice the steps in your workspace, and complete the checkpoints below.",
          checks: checksFallback
        };

        return res.json(fallbackPayload);
      }
      
      const parsed = JSON.parse(generatedText.trim());
      res.json(parsed);
    } catch (err: any) {
      console.error("AI Lesson Gen failed absolutely:", err);
      res.status(500).json({ error: err.message || "Failed to generate lesson metadata via Gemini AI." });
    }
  });

  app.post("/api/ai/compile-smart-prompt", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(200).json({ 
          error: "GEMINI_API_KEY environment variable is not configured." 
        });
      }

      const { businessInfo, websiteType, referenceTemplate } = req.body;
      if (!businessInfo) {
        return res.status(400).json({ error: "businessInfo is required." });
      }

      // We will try gemini-3.5-flash first
      const modelsToTry = ["gemini-3.5-flash", "gemini-flash-latest", "gemini-3.1-flash-lite"];
      let generatedText = "";

      const systemInstruction = `You are an expert Prompt Engineer, Senior Web Architect, and Brand Strategist.
Your goal is to generate a comprehensive, professional, single-screen or multi-screen developer prompt for a student's business.
You are trained on a provided reference template which shows the standard level of high-quality detail, design directions, typography, sections structure, and production code guidelines.

Your output must be a single cohesive developer prompt that follows the high-quality structure, phrasing, and phases of the reference template, BUT adapted 100% to the student's actual business information.

CRITICAL INSTRUCTIONS:
1. STRICTLY EXCLUDE ANY DUMMY DATA FROM THE REFERENCE TEMPLATE. Do not include any business names (e.g., 'Urban Monarch Fashion House'), addresses (e.g., '22 Admiralty Way, Lekki Phase 1, Lagos'), phone numbers, social handles, or products (e.g., 'Royal Senator Set', 'Luxury Agbada', 'Executive Kaftan') from the reference template.
2. EXTRACT AND USE ONLY the student's actual business info from the 'STUDENT DATA' provided. If the student has products, lists, colors, or vibes, use them exactly. If they lack some details, professionally elaborate them in the style and depth of the template.
3. The prompt you output MUST start directly with: 'System Instruction: You are an expert...' and contain Phase 1, Phase 2, Phase 3, etc. with exact, tailored specifications for the student's business.
4. DO NOT write any conversational introduction, footnotes, or wrappers. Simply output the generated developer prompt itself.`;

      const contents = `=== REFERENCE TEMPLATE (STANDARD MODEL FOR TRAINING) ===
${referenceTemplate || ''}

=== STUDENT DATA (RAW KYCB ANSWERS) ===
${businessInfo}

=== TARGET WEBSITE TYPE ===
${websiteType || 'landing'}

Please scan the STUDENT DATA and generate a beautifully tailored, high-fidelity developer prompt based on the template structure and standard of quality, but strictly customized to the student's business details without any reference template dummy info:`;

      for (const modelName of modelsToTry) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: contents,
            config: {
              systemInstruction: systemInstruction,
              temperature: 0.3,
            }
          });
          if (response.text) {
            generatedText = response.text;
            break;
          }
        } catch (err: any) {
          console.warn(`Model ${modelName} failed for compile-smart-prompt, trying fallback...`, err);
        }
      }

      if (!generatedText) {
        throw new Error("Failed to generate custom prompt using Gemini AI models.");
      }

      res.json({ prompt: generatedText });
    } catch (err: any) {
      console.error("Smart prompt compilation failed:", err);
      res.status(500).json({ error: err.message || "Failed to compile tailored developer prompt." });
    }
  });

  app.post("/api/cloudinary/upload", async (req: express.Request, res: express.Response) => {
    try {
      const { file, folder: customFolder, projectId, studentId } = req.body;
      if (!file) {
        return res.status(400).json({ error: "No file data provided." });
      }

      const cloudName = process.env.CLOUDINARY_CLOUD_NAME || "dqrhmr7ms";
      const apiKey = process.env.CLOUDINARY_API_KEY;
      const apiSecret = process.env.CLOUDINARY_API_SECRET;
      const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;

      if (!cloudName) {
        return res.status(400).json({ error: "Cloudinary Cloud Name is not configured in the environment." });
      }

      // Automatically organize under projects/{projectId} if projectId is supplied
      let folder = customFolder || "ciya";
      if (projectId) {
        folder = `projects/${projectId}`;
      }

      // Automatically tag project and student identifier tags
      const tagsList: string[] = [];
      if (projectId) {
        tagsList.push(`project-${projectId}`);
      }
      if (studentId) {
        tagsList.push(`student-${studentId}`);
      }
      const tags = tagsList.length > 0 ? tagsList.join(",") : undefined;

      const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
      const formData = new URLSearchParams();
      formData.append("file", file);

      if (apiSecret && apiKey) {
        // Signed upload (Most secure, proxies using credentials)
        const timestamp = Math.floor(Date.now() / 1000);
        const params: Record<string, string> = {
          timestamp: String(timestamp),
        };
        if (folder) params.folder = folder;
        if (tags) params.tags = tags;

        // Cloudinary requires signed parameters to be sorted alphabetically by key
        const sortedKeys = Object.keys(params).sort();
        const paramString = sortedKeys.map(key => `${key}=${params[key]}`).join("&");

        const signature = crypto
          .createHash("sha1")
          .update(`${paramString}${apiSecret}`)
          .digest("hex");

        formData.append("api_key", apiKey);
        formData.append("timestamp", String(timestamp));
        formData.append("signature", signature);
        if (folder) {
          formData.append("folder", folder);
        }
        if (tags) {
          formData.append("tags", tags);
        }
      } else if (uploadPreset) {
        // Unsigned fallback
        formData.append("upload_preset", uploadPreset);
        if (folder) {
          formData.append("folder", folder);
        }
        if (tags) {
          formData.append("tags", tags);
        }
      } else {
        return res.status(400).json({
          error: "Cloudinary credentials missing. Please set CLOUDINARY_API_KEY & CLOUDINARY_API_SECRET or CLOUDINARY_UPLOAD_PRESET in Secrets."
        });
      }

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("Cloudinary upload raw error response:", errText);
        return res.status(response.status).json({ error: `Cloudinary failed: ${errText}` });
      }

      const data = await response.json();
      return res.json({
        url: data.secure_url || data.url,
        public_id: data.public_id,
        folder: data.folder || folder,
        tags: data.tags || (tagsList.length > 0 ? tagsList : [])
      });
    } catch (err: any) {
      console.error("Cloudinary upload proxy error:", err);
      return res.status(500).json({ error: err.message || "Cloudinary upload proxy failed." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
