CREATE TABLE drafts (
  id TEXT PRIMARY KEY NOT NULL,
  author_id TEXT NOT NULL REFERENCES learner_profiles(user_id),
  format TEXT NOT NULL CHECK(format IN ('note', 'article')),
  title TEXT,
  content TEXT NOT NULL DEFAULT '',
  content_json TEXT,
  stage_id TEXT REFERENCES stages(id),
  challenge_id TEXT REFERENCES challenges(id),
  rhythm TEXT NOT NULL DEFAULT 'free',
  visibility TEXT NOT NULL DEFAULT 'draft' CHECK(visibility IN ('draft', 'cohort', 'public')),
  response_preference TEXT NOT NULL DEFAULT 'open' CHECK(response_preference IN ('open', 'question_only', 'closed')),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
) STRICT;

CREATE UNIQUE INDEX idx_drafts_author_format ON drafts(author_id, format);

CREATE TABLE question_reminders (
  id TEXT PRIMARY KEY NOT NULL,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  learner_id TEXT NOT NULL REFERENCES learner_profiles(user_id) ON DELETE CASCADE,
  remind_at INTEGER NOT NULL,
  sent_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
) STRICT;

CREATE INDEX idx_reminders_learner ON question_reminders(learner_id, sent_at);

CREATE TABLE question_carry_overs (
  id TEXT PRIMARY KEY NOT NULL,
  original_question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  new_question_id TEXT REFERENCES questions(id) ON DELETE SET NULL,
  from_stage_id TEXT NOT NULL REFERENCES stages(id),
  to_stage_id TEXT NOT NULL REFERENCES stages(id),
  carried_at INTEGER NOT NULL DEFAULT (unixepoch())
) STRICT;

CREATE TABLE saved_records (
  learner_id TEXT NOT NULL REFERENCES learner_profiles(user_id) ON DELETE CASCADE,
  record_id TEXT NOT NULL REFERENCES records(id) ON DELETE CASCADE,
  saved_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (learner_id, record_id)
) STRICT;

CREATE TABLE personal_stage_reflections (
  id TEXT PRIMARY KEY NOT NULL,
  stage_id TEXT NOT NULL REFERENCES stages(id),
  learner_id TEXT NOT NULL REFERENCES learner_profiles(user_id) ON DELETE CASCADE,
  let_go TEXT,
  carry_question TEXT,
  lasting_sentence TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
) STRICT;

CREATE UNIQUE INDEX idx_reflections_stage_learner ON personal_stage_reflections(stage_id, learner_id);

ALTER TABLE questions ADD COLUMN updated_at INTEGER DEFAULT NULL;
ALTER TABLE questions ADD COLUMN closed_at INTEGER;
