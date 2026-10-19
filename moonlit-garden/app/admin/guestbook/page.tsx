import { requireChatGPTUser } from "../../chatgpt-auth";
import { isGardenOwner } from "../../../lib/guestbook";
import GuestbookManager from "./GuestbookManager";
export const dynamic = "force-dynamic";
export default async function Page() {
 await requireChatGPTUser("/admin/guestbook");
 if (!await isGardenOwner()) return <main className="access-message"><h1>这里是主人的访客簿。</h1><p>当前账号没有留言管理权限。</p><a href="/#guestbook">回到庭院</a></main>;
 return <GuestbookManager />;
}
