CREATE TABLE `record_revisions` (
	`id` text PRIMARY KEY NOT NULL,
	`record_id` text NOT NULL,
	`author_id` text NOT NULL,
	`revision_number` integer NOT NULL,
	`snapshot` text NOT NULL,
	`changed_fields` text NOT NULL,
	`tags_snapshot` text,
	`created_at` integer NOT NULL DEFAULT (unixepoch()),
	FOREIGN KEY (`record_id`) REFERENCES `records`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`author_id`) REFERENCES `learner_profiles`(`user_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_revisions_record` ON `record_revisions` (`record_id`,`revision_number`);
--> statement-breakpoint
CREATE INDEX `idx_revisions_author` ON `record_revisions` (`author_id`);
