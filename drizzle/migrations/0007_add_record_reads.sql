CREATE TABLE record_reads (
  learner_id TEXT NOT NULL REFERENCES learner_profiles(user_id) ON DELETE CASCADE,
  record_id TEXT NOT NULL REFERENCES records(id) ON DELETE CASCADE,
  read_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (learner_id, record_id)
) STRICT;

CREATE INDEX idx_record_reads_learner ON record_reads(learner_id);
