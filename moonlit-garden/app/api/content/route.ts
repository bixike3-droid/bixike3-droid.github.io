import { eq, and } from "drizzle-orm";
import { getDb } from "../../../db";
import { garden } from "../../../db/schema";
import { contentSchema } from "../../../lib/content";
import { readGarden } from "../../../lib/garden";
import { getChatGPTUser } from "../../chatgpt-auth";
import { z } from "zod";
export const dynamic = "force-dynamic";
export async function GET() {
 const { row, content } = await readGarden();
 return Response.json({ content, revision: row?.revision ?? 0 }, { headers: { "Cache-Control": "no-store" } });
}
export async function PUT(request: Request) {
 const user = await getChatGPTUser();
 if (!user) return Response.json({ error: "请先登录再保存。" }, { status: 401 });
 if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "请求来源无效。" }, { status: 403 });
 const { row } = await readGarden();
 if (!row || row.ownerId !== user.userId) return Response.json({ error: "只有庭院主人可以修改内容。" }, { status: 403 });
 if (!request.headers.get("content-type")?.startsWith("application/json")) return Response.json({ error: "请提交 JSON 格式的内容。" }, { status: 415 });
 const raw = await request.text();
 if (raw.length > 600000) return Response.json({ error: "内容过大，请缩小头像或减少文字。" }, { status: 413 });
 let body; try { body = JSON.parse(raw); } catch { return Response.json({ error: "内容格式不正确。" }, { status: 400 }); }
 const parsed = z.object({ content: contentSchema, revision: z.number().int().min(0) }).strict().safeParse(body);
 if (!parsed.success) return Response.json({ error: parsed.error.issues.map(i => i.path.join(".") + "：" + i.message).join("；") }, { status: 400 });
 const saved = await getDb().update(garden).set({ content: JSON.stringify(parsed.data.content), revision: parsed.data.revision + 1, updatedAt: new Date().toISOString() }).where(and(eq(garden.id, "home"), eq(garden.ownerId, user.userId), eq(garden.revision, parsed.data.revision))).returning({ revision: garden.revision }).get();
 if (!saved) return Response.json({ error: "另一个页面已经更新了内容。先导出你的修改，再刷新页面合并。" }, { status: 409 });
 return Response.json(saved, { headers: { "Cache-Control": "no-store" } });
}
