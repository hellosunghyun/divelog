CREATE TABLE record_participants (
  record_id TEXT NOT NULL REFERENCES records(id) ON DELETE CASCADE,
  participant_user_id TEXT NOT NULL REFERENCES learner_profiles(user_id) ON DELETE CASCADE,
  added_by_id TEXT NOT NULL REFERENCES learner_profiles(user_id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'companion',
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (record_id, participant_user_id)
) STRICT;

CREATE INDEX idx_record_participants_participant ON record_participants(participant_user_id);
CREATE INDEX idx_record_participants_added_by ON record_participants(added_by_id);
