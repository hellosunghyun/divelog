CREATE INDEX IF NOT EXISTS idx_records_author_visibility_created
  ON records (author_id, visibility, created_at DESC);
