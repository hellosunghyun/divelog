-- Response mentions table (separate from record mentions to avoid contaminating existing "언급된 사람" UI)
CREATE TABLE `response_mentions` (
  `id` text PRIMARY KEY NOT NULL,
  `response_id` text NOT NULL REFERENCES `responses`(`id`) ON DELETE CASCADE,
  `record_id` text NOT NULL REFERENCES `records`(`id`) ON DELETE CASCADE,
  `mentioned_user_id` text NOT NULL REFERENCES `learner_profiles`(`user_id`) ON DELETE CASCADE,
  `mentioned_by_id` text NOT NULL REFERENCES `learner_profiles`(`user_id`) ON DELETE CASCADE,
  `created_at` integer NOT NULL DEFAULT (unixepoch())
);

-- Response record references table
CREATE TABLE `response_record_refs` (
  `id` text PRIMARY KEY NOT NULL,
  `response_id` text NOT NULL REFERENCES `responses`(`id`) ON DELETE CASCADE,
  `referenced_record_id` text NOT NULL REFERENCES `records`(`id`) ON DELETE CASCADE,
  `created_at` integer NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX `idx_response_mentions_response` ON `response_mentions` (`response_id`);
CREATE INDEX `idx_response_mentions_user` ON `response_mentions` (`mentioned_user_id`);
CREATE INDEX `idx_response_record_refs_referenced` ON `response_record_refs` (`referenced_record_id`);
CREATE INDEX `idx_response_record_refs_response` ON `response_record_refs` (`response_id`);
