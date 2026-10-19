CREATE TABLE `guestbook_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`require_approval` integer DEFAULT true NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE `guest_messages` ADD `status` text DEFAULT 'approved' NOT NULL;