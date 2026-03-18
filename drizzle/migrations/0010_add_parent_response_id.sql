ALTER TABLE `responses` ADD `parent_response_id` text REFERENCES responses(id);
