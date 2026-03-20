ALTER TABLE `records` ADD `original_url` text;

CREATE TABLE `record_references` (
  `id` text PRIMARY KEY NOT NULL,
  `record_id` text NOT NULL,
  `url` text NOT NULL,
  `title` text,
  `sort_order` integer NOT NULL DEFAULT 0,
  `created_at` integer NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (`record_id`) REFERENCES `records`(`id`) ON UPDATE no action ON DELETE cascade
);
