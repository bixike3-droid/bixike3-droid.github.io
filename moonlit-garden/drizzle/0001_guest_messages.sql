CREATE TABLE `guest_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`message` text NOT NULL,
	`created_at` text NOT NULL,
	`visitor_key` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `guest_messages_created` ON `guest_messages` (`created_at`);--> statement-breakpoint
CREATE INDEX `guest_messages_visitor` ON `guest_messages` (`visitor_key`,`created_at`);