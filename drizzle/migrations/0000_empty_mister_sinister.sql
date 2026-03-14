CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_id` text NOT NULL,
	`target_type` text NOT NULL,
	`target_id` text NOT NULL,
	`action` text NOT NULL,
	`before_state` text,
	`after_state` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `challenge_stages` (
	`challenge_id` text NOT NULL,
	`stage_id` text NOT NULL,
	PRIMARY KEY(`challenge_id`, `stage_id`),
	FOREIGN KEY (`challenge_id`) REFERENCES `challenges`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`stage_id`) REFERENCES `stages`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `challenges` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`problem_definition` text,
	`current_question` text,
	`description` text,
	`status` text DEFAULT 'active' NOT NULL,
	`cohort` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `challenges_slug_unique` ON `challenges` (`slug`);--> statement-breakpoint
CREATE TABLE `collaboration_members` (
	`unit_id` text NOT NULL,
	`learner_id` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`joined_at` integer DEFAULT (unixepoch()) NOT NULL,
	PRIMARY KEY(`unit_id`, `learner_id`),
	FOREIGN KEY (`unit_id`) REFERENCES `collaboration_units`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`learner_id`) REFERENCES `learner_profiles`(`user_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `collaboration_units` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`challenge_id` text,
	`stage_id` text,
	`status` text DEFAULT 'forming' NOT NULL,
	`current_question` text,
	`description` text,
	`cohort` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`challenge_id`) REFERENCES `challenges`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`stage_id`) REFERENCES `stages`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `collaboration_units_slug_unique` ON `collaboration_units` (`slug`);--> statement-breakpoint
CREATE TABLE `collective_memories` (
	`id` text PRIMARY KEY NOT NULL,
	`stage_id` text NOT NULL,
	`summary` text,
	`carry_forward_question` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`cohort` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`stage_id`) REFERENCES `stages`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `curation_slots` (
	`id` text PRIMARY KEY NOT NULL,
	`slot_type` text NOT NULL,
	`target_id` text NOT NULL,
	`target_type` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`pinned` integer DEFAULT false NOT NULL,
	`hidden` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `learner_profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`display_name` text NOT NULL,
	`profile_photo_url` text,
	`cohort` text,
	`bio` text,
	`current_stage_id` text,
	`current_question` text,
	`notification_email_enabled` integer DEFAULT true NOT NULL,
	`default_visibility` text DEFAULT 'cohort' NOT NULL,
	`default_response_preference` text DEFAULT 'open' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`current_stage_id`) REFERENCES `stages`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `learner_profiles_slug_unique` ON `learner_profiles` (`slug`);--> statement-breakpoint
CREATE TABLE `memory_questions` (
	`memory_id` text NOT NULL,
	`question_id` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`memory_id`, `question_id`),
	FOREIGN KEY (`memory_id`) REFERENCES `collective_memories`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `memory_records` (
	`memory_id` text NOT NULL,
	`record_id` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`memory_id`, `record_id`),
	FOREIGN KEY (`memory_id`) REFERENCES `collective_memories`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`record_id`) REFERENCES `records`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `memory_sentences` (
	`memory_id` text NOT NULL,
	`sentence_id` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`memory_id`, `sentence_id`),
	FOREIGN KEY (`memory_id`) REFERENCES `collective_memories`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`sentence_id`) REFERENCES `sentences`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`recipient_id` text NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`content` text,
	`record_id` text,
	`question_id` text,
	`is_read` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`recipient_id`) REFERENCES `learner_profiles`(`user_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`record_id`) REFERENCES `records`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `questions` (
	`id` text PRIMARY KEY NOT NULL,
	`record_id` text NOT NULL,
	`content` text NOT NULL,
	`direction` text DEFAULT 'outward' NOT NULL,
	`is_open` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`record_id`) REFERENCES `records`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `records` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`author_id` text NOT NULL,
	`stage_id` text,
	`challenge_id` text,
	`collaboration_unit_id` text,
	`linked_record_id` text,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`format` text DEFAULT 'note' NOT NULL,
	`type` text DEFAULT 'personal' NOT NULL,
	`rhythm` text DEFAULT 'free' NOT NULL,
	`visibility` text DEFAULT 'cohort' NOT NULL,
	`response_preference` text DEFAULT 'open' NOT NULL,
	`is_featured` integer DEFAULT false NOT NULL,
	`moderation_status` text DEFAULT 'clean' NOT NULL,
	`moderation_note` text,
	`cohort` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`author_id`) REFERENCES `learner_profiles`(`user_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`stage_id`) REFERENCES `stages`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`challenge_id`) REFERENCES `challenges`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`collaboration_unit_id`) REFERENCES `collaboration_units`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `records_slug_unique` ON `records` (`slug`);--> statement-breakpoint
CREATE TABLE `responses` (
	`id` text PRIMARY KEY NOT NULL,
	`record_id` text NOT NULL,
	`question_id` text,
	`author_id` text NOT NULL,
	`type` text NOT NULL,
	`content` text NOT NULL,
	`visibility` text DEFAULT 'cohort' NOT NULL,
	`moderation_status` text DEFAULT 'clean' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`record_id`) REFERENCES `records`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`author_id`) REFERENCES `learner_profiles`(`user_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `self_answers` (
	`id` text PRIMARY KEY NOT NULL,
	`question_id` text NOT NULL,
	`author_id` text NOT NULL,
	`content` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`author_id`) REFERENCES `learner_profiles`(`user_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sentences` (
	`id` text PRIMARY KEY NOT NULL,
	`record_id` text NOT NULL,
	`saved_by_id` text NOT NULL,
	`content` text NOT NULL,
	`reason` text,
	`paragraph_index` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`record_id`) REFERENCES `records`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`saved_by_id`) REFERENCES `learner_profiles`(`user_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`value` text,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `settings_key_unique` ON `settings` (`key`);--> statement-breakpoint
CREATE TABLE `stages` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`type` text NOT NULL,
	`status` text DEFAULT 'upcoming' NOT NULL,
	`description` text,
	`accent_tone` text,
	`order` integer DEFAULT 0 NOT NULL,
	`start_date` integer,
	`end_date` integer,
	`is_current` integer DEFAULT false NOT NULL,
	`hero_content` text,
	`cohort` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `stages_slug_unique` ON `stages` (`slug`);--> statement-breakpoint
CREATE TABLE `templates` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`prompt_body` text,
	`context` text,
	`form` text,
	`rhythm` text,
	`stage_kind` text,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `user_roles` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`role` text NOT NULL,
	`granted_at` integer DEFAULT (unixepoch()) NOT NULL,
	`granted_by` text
);
