CREATE INDEX IF NOT EXISTS idx_records_visibility_created_at
  ON records (visibility, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_record_participants_record_id
  ON record_participants (record_id);
