import { requireChatGPTUser } from "../chatgpt-auth";
import { openEditor } from "../../lib/garden";
import Editor from "./Editor";
export const dynamic = "force-dynamic";
export default async function Admin() {
 const user = await requireChatGPTUser("/admin");
 const { row, content } = await openEditor(user.userId);
 if (row?.ownerId !== user.userId) return <main className="access-message"><h1>这里是主人的工作台。</h1><p>当前账号没有编辑权限。</p><a href="/">回到庭院 →</a></main>;
 return <Editor initial={content} initialRevision={row.revision} />;
}