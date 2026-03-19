CREATE TABLE record_views (
  record_id TEXT NOT NULL REFERENCES records(id) ON DELETE CASCADE,
  viewer_key TEXT NOT NULL,
  viewed_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (record_id, viewer_key)
);

CREATE INDEX idx_record_views_record ON record_views(record_id);
