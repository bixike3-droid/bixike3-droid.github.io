import { and, desc, eq, gte } from "drizzle-orm";
import { getDb } from "../../../db";
import { guestMessages } from "../../../db/schema";
import { z } from "zod";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };
const emoji = new RegExp("\\p{Extended_Pictographic}", "u");
const payload = z.object({
 name: z.string().trim().min(1, "请填写昵称。").max(24, "昵称最多 24 个字符。"),
 message: z.string().trim().min(1, "写几句话再寄出吧。").max(400, "留言最多 400 个字符。"),
 website: z.string().max(0).optional(),
}).strict().refine(v => !emoji.test(v.name + v.message), "请使用文字留言，暂不支持表情符号。");
const selection = { id: guestMessages.id, name: guestMessages.name, message: guestMessages.message, createdAt: guestMessages.createdAt };
export async function GET() {
 try {
  const messages = await getDb().select(selection).from(guestMessages).orderBy(desc(guestMessages.createdAt)).limit(50).all();
  return Response.json({ messages }, { headers });
 } catch {
  return Response.json({ error: "访客簿暂时没有打开，请稍后再试。" }, { status: 503, headers });
 }
}
export async function POST(request: Request) {
 if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "请求来源无效。" }, { status: 403, headers });
 if (!request.headers.get("content-type")?.startsWith("application/json")) return Response.json({ error: "留言格式不正确。" }, { status: 415, headers });
 const raw = await request.text();
 if (raw.length > 5000) return Response.json({ error: "留言过长。" }, { status: 413, headers });
 let body; try { body = JSON.parse(raw); } catch { return Response.json({ error: "留言格式不正确。" }, { status: 400, headers }); }
 const parsed = payload.safeParse(body);
 if (!parsed.success) return Response.json({ error: parsed.error.issues[0].message }, { status: 400, headers });
 const cookie = request.headers.get("cookie")?.split(";").map(x => x.trim()).find(x => x.startsWith("garden-visitor="))?.slice(15);
 const visitorKey = cookie && /^[a-f0-9-]{36}$/.test(cookie) ? cookie : crypto.randomUUID();
 try {
  const db = getDb();
  const recent = await db.select({ id: guestMessages.id }).from(guestMessages).where(and(eq(guestMessages.visitorKey, visitorKey), gte(guestMessages.createdAt, new Date(Date.now() - 30000).toISOString()))).limit(1).get();
  if (recent) return Response.json({ error: "信已寄出，等半分钟再写下一封吧。" }, { status: 429, headers });
  const message = { id: crypto.randomUUID(), name: parsed.data.name, message: parsed.data.message, createdAt: new Date().toISOString() };
  await db.insert(guestMessages).values({ ...message, visitorKey });
  return Response.json({ message }, { status: 201, headers: { ...headers, "Set-Cookie": `garden-visitor=${visitorKey}; HttpOnly; SameSite=Lax; Path=/; Max-Age=31536000${new URL(request.url).protocol === "https:" ? "; Secure" : ""}` } });
 } catch {
  return Response.json({ error: "信暂时没能寄出，内容还在，请稍后重试。" }, { status: 503, headers });
 }
}
