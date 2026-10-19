import { z } from "zod";
const link = z.string().max(500).refine(value => {
 if (!value) return true;
 try { return ["https:", "http:"].includes(new URL(value).protocol); } catch { return false; }
}, "请填写完整的 http 或 https 链接");
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
 const parsed = new Date(value + "T00:00:00Z");
 return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, "日期无效");
const avatar = z.string().max(350000).refine(value => !value || /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value), "头像请使用 PNG、JPEG 或 WebP");
export const contentSchema = z.object({
 name: z.string().trim().min(1).max(40), title: z.string().trim().min(1).max(70),
 subtitle: z.string().trim().min(1).max(180), about: z.string().max(3000),
 interests: z.array(z.string().trim().min(1).max(30)).max(12), now: z.string().max(200),
 github: link, email: z.union([z.literal(""), z.string().email().max(150)]), avatar,
 footer: z.string().max(200),
 projects: z.array(z.object({
  id: z.string().min(1).max(80), name: z.string().trim().min(1).max(100),
  summary: z.string().max(1000), tags: z.array(z.string().max(30)).max(8),
  url: link, demo: link, featured: z.boolean(),
 }).strict()).max(12),
 notes: z.array(z.object({
  id: z.string().min(1).max(80), title: z.string().trim().min(1).max(100),
  date, text: z.string().max(5000),
 }).strict()).max(40),
}).strict();
export type Content = z.infer<typeof contentSchema>;
export const defaultContent: Content = {
 name: "bixike", title: "在夜樱下，\n坐一会儿。",
 subtitle: "这里放着我的作品，也留着一些日常。",
 about: "你好，我是 bixike。\n\n我喜欢夜间的樱花，也做一些自己想用的小东西。这里收着我的作品，往后还会慢慢添上日常和想法。欢迎你来坐一会儿。",
 interests: ["夜樱", "小工具", "慢慢探索"], now: "正在把这个小庭院，一点点布置好。",
 github: "https://github.com/bixike3-droid", email: "", avatar: "",
 footer: "谢谢你来。愿你今晚，也有一盏暖灯。",
 projects: [{ id: "edge-question-assistant", name: "题解侧栏", summary: "在网页旁边截题、解题和继续追问。支持网页框选与 PDF 截图，使用自己的 DeepSeek API Key，并把聊天记录留在本机。", tags: ["Edge 扩展", "JavaScript", "本地记录"], url: "https://github.com/bixike3-droid/edge-question-assistant", demo: "https://github.com/bixike3-droid/edge-question-assistant/releases/latest", featured: true }],
 notes: [],
};