import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { garden, guestbookSettings } from "../db/schema";
import { getChatGPTUser } from "../app/chatgpt-auth";

export const messageStatuses = ["pending", "approved", "hidden", "deleted"] as const;
export type MessageStatus = typeof messageStatuses[number];
export async function isGardenOwner() {
 const user = await getChatGPTUser();
 if (!user) return false;
 const owner = await getDb().select({ ownerId: garden.ownerId }).from(garden).where(eq(garden.id, "home")).get();
 return Boolean(owner && owner.ownerId === user.userId);
}
export async function readGuestbookSettings() {
 const settings = await getDb().select().from(guestbookSettings).where(eq(guestbookSettings.id, "home")).get();
 return { requireApproval: settings?.requireApproval ?? true, revision: settings?.revision ?? 0 };
}
