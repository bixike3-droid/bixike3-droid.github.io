CREATE TABLE `garden` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`content` text NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL
);
