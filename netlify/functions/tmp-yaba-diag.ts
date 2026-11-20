/** TEMP diagnostic (delete after use): find the "yaba" account and its saved details. */
import { Handler } from "@netlify/functions";
import { getAccessToken, FIRESTORE_DB } from "./_remindersShared";

const PROJECT = "gen-lang-client-0862975917";

async function runQuery(token: string, structuredQuery: any): Promise<any[]> {
  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/${FIRESTORE_DB}/documents:runQuery`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ structuredQuery }),
    }
  );
  const json: any = await res.json();
  if (!res.ok) throw new Error(`runQuery ${res.status}: ${JSON.stringify(json).slice(0, 300)}`);
  return (json || []).filter((r: any) => r.document).map((r: any) => {
    const fields = r.document.fields || {};
    const out: any = { _id: r.document.name.split("/").pop() as string };
    for (const [k, v] of Object.entries<any>(fields)) {
      out[k] = v.stringValue ?? v.integerValue ?? v.doubleValue ?? v.booleanValue ??
        (v.mapValue ? v.mapValue.fields : v.arrayValue ? (v.arrayValue.values || []) : v.timestampValue ?? null);
    }
    return out;
  });
}

const json = (h: Handler) => h;
export default json(async (req: any) => {
  if (req.httpMethod !== "POST") return { statusCode: 405, body: JSON.stringify({ error: "method-not-allowed" }) };
  const token = await getAccessToken("https://www.googleapis.com/auth/datastore");

  const users = await runQuery(token, {
    from: [{ collectionId: "users" }],
    limit: 400,
  });
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
    kycb = await runQuery(token, { from: [{ collectionId: "kycb_questionnaires" }], limit: 60 });
  } catch (e: any) {
    kycb = [{ _error: String(e).slice(0, 200) }];
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      totalUsers: users.length,
      yabaMatches: matches.map(strip),
      recentUsers: recent,
      kycbCount: kycb.filter((k: any) => !k._error).length,
      kycbList: kycb.slice(0, 30).map((k: any) => ({
        id: k._id, clientName: k.clientName, type: k.type, userEmail: k.userEmail, userId: k.userId, createdAt: k.createdAt,
        businessName: k.businessName || "",
      })),
    }),
  };
});
