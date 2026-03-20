ALTER TABLE `notifications` ADD `actor_id` text REFERENCES `learner_profiles`(`user_id`);
--> statement-breakpoint
CREATE TABLE `notification_preferences` (
	`id` text PRIMARY KEY NOT NULL,
	`learner_id` text NOT NULL,
	`type` text NOT NULL,
	`enabled` integer NOT NULL DEFAULT 1,
	`updated_at` integer,
	FOREIGN KEY (`learner_id`) REFERENCES `learner_profiles`(`user_id`) ON UPDATE no action ON DELETE cascade
) STRICT;
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_notification_preferences_learner_type` ON `notification_preferences` (`learner_id`,`type`);
--> statement-breakpoint
CREATE INDEX `idx_notifications_recipient_read_created_at` ON `notifications` (`recipient_id`,`is_read`,`created_at`);
