import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
export const garden = sqliteTable("garden", {
 id: text("id").primaryKey(), ownerId: text("owner_id").notNull(),
 content: text("content").notNull(), revision: integer("revision").notNull().default(0),
 updatedAt: text("updated_at").notNull(),
});
export const guestMessages = sqliteTable("guest_messages", {
 id: text("id").primaryKey(),
 name: text("name").notNull(),
 message: text("message").notNull(),
 createdAt: text("created_at").notNull(),
 visitorKey: text("visitor_key").notNull(),
 status: text("status", { enum: ["pending", "approved", "hidden", "deleted"] }).notNull().default("approved"),
}, table => [index("guest_messages_created").on(table.createdAt), index("guest_messages_visitor").on(table.visitorKey, table.createdAt)]);
export const guestbookSettings = sqliteTable("guestbook_settings", {
 id: text("id").primaryKey(),
 requireApproval: integer("require_approval", { mode: "boolean" }).notNull().default(true),
 revision: integer("revision").notNull().default(0),
});
