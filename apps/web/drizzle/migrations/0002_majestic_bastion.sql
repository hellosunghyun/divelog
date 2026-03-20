CREATE TABLE `record_tags` (
	`record_id` text NOT NULL,
	`tag_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	PRIMARY KEY(`record_id`, `tag_id`),
	FOREIGN KEY (`record_id`) REFERENCES `records`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `tags` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text DEFAULT '',
	`color` text DEFAULT '#6E6E73',
	`created_by` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tags_name_unique` ON `tags` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `tags_slug_unique` ON `tags` (`slug`);