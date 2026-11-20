/** TEMP diagnostic (delete after use): find the "yaba" account and its saved details. */
import { getAccessToken, loadServiceAccount } from "./_remindersShared";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...CORS_HEADERS } });

async function runQuery(token: string, projectId: string, structuredQuery: any): Promise<any[]> {
  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ structuredQuery }),
    }
  );
  const arr: any[] = await res.json();
  if (!res.ok) throw new Error(`runQuery ${res.status}: ${JSON.stringify(arr).slice(0, 300)}`);
  return (arr || []).filter((r: any) => r.document).map((r: any) => {
    const fields = r.document.fields || {};
    const out: any = { _id: (r.document.name as string).split("/").pop() as string };
    for (const [k, v] of Object.entries<any>(fields)) {
      out[k] = v.stringValue ?? v.integerValue ?? v.doubleValue ?? v.booleanValue ??
        (v.mapValue ? v.mapValue.fields : v.arrayValue ? (v.arrayValue.values || []) : v.timestampValue ?? null);
    }
    return out;
  });
}

export default async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response("", { status: 204, headers: CORS_HEADERS });
  if (req.method !== "POST") return json(405, { error: "method-not-allowed" });
  try {
    const token = await getAccessToken();
    const projectId = loadServiceAccount().project_id;
    const users = await runQuery(token, projectId, { from: [{ collectionId: "users" }], limit: 400 });
    const needle = "yaba";
    const matches = users.filter((u: any) =>
      [u.email, u.fullName, u.displayName, u.whatsapp, u.phone, u.state, u.city, u.lga, u.address]
        .some((v: any) => typeof v === "string" && v.toLowerCase().includes(needle))
    );
    const strip = (u: any) => {
      const { fcmTokens, ...rest } = u;
      return rest;
    };
    const recent = [...users]
      .sort((a: any, b: any) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")))
      .slice(0, 14)
      .map((u: any) => ({
        name: u.fullName || u.displayName || "",
        email: u.email || "",
        whatsapp: u.whatsapp || u.phone || "",
        state: u.state || "",
        createdAt: u.createdAt || "",
      }));
    let kycb: any[] = [];
    try {
      kycb = await runQuery(token, projectId, { from: [{ collectionId: "kycb_questionnaires" }], limit: 60 });
    } catch (e: any) {
      kycb = [{ _error: String(e).slice(0, 200) }];
    }
    return json(200, {
      totalUsers: users.length,
      yabaMatches: matches.map(strip),
      recentUsers: recent,
      kycbCount: kycb.filter((k: any) => !k._error).length,
      kycbList: kycb.slice(0, 30).map((k: any) => ({
        id: k._id, clientName: k.clientName, type: k.type, userEmail: k.userEmail, userId: k.userId, createdAt: k.createdAt,
        businessName: k.businessName || "",
      })),
    });
  } catch (e: any) {
    return json(500, { error: String(e).slice(0, 400) });
  }
};
