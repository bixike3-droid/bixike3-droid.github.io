import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { garden } from "../db/schema";
import { contentSchema, defaultContent } from "./content";
export async function readGarden() {
 const row = await getDb().select().from(garden).where(eq(garden.id, "home")).get();
 return { row, content: row ? contentSchema.parse(JSON.parse(row.content)) : defaultContent };
}
// Ownership is established while Sites is owner-private. Open /admin before
// changing the audience; all subsequent writes check the recorded owner ID.
export async function openEditor(userId: string) {
 await getDb().insert(garden).values({ id: "home", ownerId: userId, content: JSON.stringify(defaultContent), revision: 0, updatedAt: new Date().toISOString() }).onConflictDoNothing();
 return readGarden();
}