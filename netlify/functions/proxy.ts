/**
 * Same-origin live-preview proxy for CIYA template previews.
 *
 * Serves /api/proxy?url=<target>: fetches the target website, strips the
 * headers that block iframe embedding (X-Frame-Options, CSP frame-ancestors),
 * rewrites navigational links so clicks stay inside the preview frame, and
 * injects <base> so images, CSS and scripts resolve against the target site.
 * This lets students interact with generated websites (scroll, click, browse)
 * directly inside the template "screen" in the app.
 */
const BLOCKED_RESPONSE_HEADERS = ["content-security-policy", "x-frame-options", "content-encoding", "content-length", "set-cookie"];

function absolutize(base: string, u: string): string | null {
  try {
    return new URL(u, base).href;
  } catch {
    return null;
  }
}

/** Rewrite <a href> navigation to route through the proxy so browsing stays in-frame. */
function rewriteNavigation(html: string, finalUrl: string): string {
  const target = new URL(finalUrl);
  const proxyPrefix = "/api/proxy?url=";
  return html.replace(/(<a\b[^>]*?href=)(["'])(.*?)\2/gi, (m, pre: string, q: string, href: string) => {
    const h = href.trim();
    if (!h || h.startsWith("#") || h.startsWith(proxyPrefix) || /^(mailto:|tel:|javascript:|data:)/i.test(h)) return m;
    if (/^https?:\/\//i.test(h)) {
      try {
        const u = new URL(h);
        if (u.hostname === target.hostname) return `${pre}${q}${proxyPrefix}${encodeURIComponent(u.href)}${q}`;
      } catch {
        return m;
      }
      return m; // different host: leave the real link
    }
    const abs = absolutize(finalUrl, h);
    if (abs) return `${pre}${q}${proxyPrefix}${encodeURIComponent(abs)}${q}`;
    return m;
  });
}

/**
 * Inline script injected into proxied HTML before any site script runs.
 * Sites whose routers call history.pushState/replaceState with absolute URLs
 * (Next.js and friends resolve them against the injected <base>) crash with a
 * SecurityError in the proxy origin, which freezes render frameworks mid-
 * hydration and leaves the page visually blank. We sanitize those calls to
 * same-origin URLs and swallow any residue.
 */
const HISTORY_PATCH = `<script>(function(){var s=function(n){var o;try{o=history[n].bind(history);}catch(e){return;}if(typeof o!=="function")return;history[n]=function(st,t,u){if(u!=null&&u!==""){try{var a=new URL(u,location.href);if(a.origin!==location.origin){u=location.pathname+location.search+location.hash;}}catch(e){return;}}try{return o(st,t,u);}catch(e){}};};try{s("pushState");s("replaceState");}catch(e){}})();</script>`;

function injectHead(html: string, finalUrl: string): string {
  const head = html.match(/<head[^>]*>/i);
  if (head && head.index !== undefined) {
    const at = head.index + head[0].length;
    return html.slice(0, at) + HISTORY_PATCH + `\n<base href="${finalUrl}">` + html.slice(at);
  }
  return html;
}

async function handler(event: any) {
  const qs = (event && event.queryStringParameters) || {};
  const target = qs.url;
  if (!target || !/^https?:\/\//i.test(target)) {
    return { statusCode: 400, body: "Missing or invalid ?url= parameter" };
  }

  try {
    const upstream = await fetch(target, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
    });

    const finalUrl = upstream.url || target;
    const contentType = upstream.headers.get("content-type") || "application/octet-stream";
    const headers: Record<string, string> = {
      "Content-Type": contentType,
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
      "X-Proxied-For": finalUrl,
    };

    if (contentType.includes("text/html")) {
      let html = await upstream.text();
      html = rewriteNavigation(html, finalUrl);
      if (!/<base\b/i.test(html)) {
        html = injectHead(html, finalUrl);
      }
      return { statusCode: 200, headers, body: html };
    }

    const buf = Buffer.from(await upstream.arrayBuffer());
    return { statusCode: upstream.status, headers, body: buf.toString("base64"), isBase64Encoded: true };
  } catch (err: any) {
    return { statusCode: 502, body: "Proxy error: " + (err?.message || String(err)) };
  }
}

export { BLOCKED_RESPONSE_HEADERS };


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
