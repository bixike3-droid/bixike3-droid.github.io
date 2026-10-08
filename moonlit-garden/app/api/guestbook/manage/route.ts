import { and, count, desc, eq, lt, or } from "drizzle-orm";
import { getDb } from "../../../../db";
import { guestMessages, guestbookSettings } from "../../../../db/schema";
import { isGardenOwner, messageStatuses, readGuestbookSettings } from "../../../../lib/guestbook";
import { getChatGPTUser } from "../../../chatgpt-auth";
import { z } from "zod";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };
const selection = { id: guestMessages.id, name: guestMessages.name, message: guestMessages.message, createdAt: guestMessages.createdAt, status: guestMessages.status };
const changes = z.discriminatedUnion("action", [
 z.object({ action: z.literal("message"), id: z.string().uuid(), status: z.enum(messageStatuses), expectedStatus: z.enum(messageStatuses) }).strict(),
 z.object({ action: z.literal("settings"), requireApproval: z.boolean(), revision: z.number().int().min(0) }).strict(),
]);
async function authorize() {
 if (!await getChatGPTUser()) return Response.json({ error: "请先登录主人工作台。" }, { status: 401, headers });
 if (!await isGardenOwner()) return Response.json({ error: "只有庭院主人可以管理留言。" }, { status: 403, headers });
 return null;
}
export async function GET(request: Request) {
 const denied = await authorize(); if (denied) return denied;
 const url = new URL(request.url);
 const filter = z.enum(["all", ...messageStatuses]).safeParse(url.searchParams.get("status") || "pending");
 if (!filter.success) return Response.json({ error: "留言分类无效。" }, { status: 400, headers });
 const conditions = filter.data === "all" ? [] : [eq(guestMessages.status, filter.data)];
 const cursor = url.searchParams.get("cursor");
 if (cursor) {
  let parsed; try { parsed = z.object({ createdAt: z.string().datetime(), id: z.string().uuid() }).strict().safeParse(JSON.parse(cursor)); } catch {}
  if (!parsed?.success) return Response.json({ error: "分页位置无效。" }, { status: 400, headers });
  conditions.push(or(lt(guestMessages.createdAt, parsed.data.createdAt), and(eq(guestMessages.createdAt, parsed.data.createdAt), lt(guestMessages.id, parsed.data.id)))!);
 }
 const db = getDb();
 const [rows, groups, settings] = await Promise.all([
  db.select(selection).from(guestMessages).where(and(...conditions)).orderBy(desc(guestMessages.createdAt), desc(guestMessages.id)).limit(31).all(),
  db.select({ status: guestMessages.status, total: count() }).from(guestMessages).groupBy(guestMessages.status).all(),
  readGuestbookSettings(),
 ]);
 const messages = rows.slice(0, 30);
 const last = messages[messages.length - 1];
 return Response.json({ messages, settings, counts: Object.fromEntries(messageStatuses.map(s => [s, groups.find(g => g.status === s)?.total ?? 0])), nextCursor: rows.length > 30 && last ? JSON.stringify({ createdAt: last.createdAt, id: last.id }) : null }, { headers });
}
export async function PATCH(request: Request) {
 const denied = await authorize(); if (denied) return denied;
 if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "请求来源无效。" }, { status: 403, headers });
 if (!request.headers.get("content-type")?.startsWith("application/json")) return Response.json({ error: "请求格式不正确。" }, { status: 415, headers });
 const raw = await request.text(); if (raw.length > 2000) return Response.json({ error: "请求内容过长。" }, { status: 413, headers });
 let body; try { body = JSON.parse(raw); } catch { return Response.json({ error: "请求格式不正确。" }, { status: 400, headers }); }
 const parsed = changes.safeParse(body); if (!parsed.success) return Response.json({ error: "更新内容无效。" }, { status: 400, headers });
 const db = getDb(); const data = parsed.data;
 if (data.action === "message") {
  const current = await db.select({ status: guestMessages.status }).from(guestMessages).where(eq(guestMessages.id, data.id)).get();
  if (!current) return Response.json({ error: "这封留言不存在。" }, { status: 404, headers });
  const updated = await db.update(guestMessages).set({ status: data.status }).where(and(eq(guestMessages.id, data.id), eq(guestMessages.status, data.expectedStatus))).returning(selection).get();
  if (!updated) return Response.json({ error: "这封留言已在另一处更新，列表已刷新，请重新操作。" }, { status: 409, headers });
  return Response.json({ message: updated }, { headers });
 }
 await db.insert(guestbookSettings).values({ id: "home", requireApproval: true, revision: 0 }).onConflictDoNothing();
 const settings = await db.update(guestbookSettings).set({ requireApproval: data.requireApproval, revision: data.revision + 1 }).where(and(eq(guestbookSettings.id, "home"), eq(guestbookSettings.revision, data.revision))).returning({ requireApproval: guestbookSettings.requireApproval, revision: guestbookSettings.revision }).get();
 if (!settings) return Response.json({ error: "展示方式已在另一处更新，列表已刷新，请重新操作。" }, { status: 409, headers });
 return Response.json({ settings }, { headers });
}
