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

export async function handler(event: any) {
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
        html = html.replace(/<head([^>]*)>/i, (m) => `${m}\n<base href="${finalUrl}">`);
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
