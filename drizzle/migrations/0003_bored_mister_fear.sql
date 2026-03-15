CREATE TABLE `mentions` (
	`id` text PRIMARY KEY NOT NULL,
	`record_id` text NOT NULL,
	`mentioned_user_id` text NOT NULL,
	`mentioned_by_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`record_id`) REFERENCES `records`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`mentioned_user_id`) REFERENCES `learner_profiles`(`user_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`mentioned_by_id`) REFERENCES `learner_profiles`(`user_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `record_links` (
	`id` text PRIMARY KEY NOT NULL,
	`source_record_id` text NOT NULL,
	`target_record_id` text NOT NULL,
	`link_type` text DEFAULT 'reference' NOT NULL,
	`quoted_text` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`source_record_id`) REFERENCES `records`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`target_record_id`) REFERENCES `records`(`id`) ON UPDATE no action ON DELETE cascade
);
