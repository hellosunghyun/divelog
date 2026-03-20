-- Stage 기능 제거: 게시글/초안에서 Stage 연결 해제 + Memories/Reflections/CarryOvers 삭제
-- stages 테이블과 learner_profiles.current_stage_id는 유지 (관리 + 현황 표시용)

-- 1. Memory junction 테이블 삭제 (collective_memories 의존)
DROP TABLE IF EXISTS memory_questions;
DROP TABLE IF EXISTS memory_sentences;
DROP TABLE IF EXISTS memory_records;

-- 2. Collective Memories 삭제
DROP TABLE IF EXISTS collective_memories;

-- 3. Stage 관련 junction/부속 테이블 삭제
DROP TABLE IF EXISTS challenge_stages;
DROP TABLE IF EXISTS personal_stage_reflections;
DROP TABLE IF EXISTS question_carry_overs;

-- 4. 게시글/초안/협업에서 stage_id 컬럼 제거
-- SQLite는 외래키 제약이 있는 컬럼 삭제를 지원하지 않으므로 테이블 재생성 필요
PRAGMA foreign_keys = OFF;

CREATE TABLE records_new (
  id TEXT PRIMARY KEY NOT NULL,
  slug TEXT NOT NULL,
  author_id TEXT NOT NULL REFERENCES learner_profiles(user_id),
  challenge_id TEXT REFERENCES challenges(id),
  collaboration_unit_id TEXT REFERENCES collaboration_units(id),
  linked_record_id TEXT,
  original_url TEXT,
  original_title TEXT,
  original_description TEXT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  content_text TEXT DEFAULT '',
  format TEXT NOT NULL DEFAULT 'note',
  type TEXT NOT NULL DEFAULT 'personal',
  rhythm TEXT NOT NULL DEFAULT 'free',
  visibility TEXT NOT NULL DEFAULT 'cohort',
  response_preference TEXT NOT NULL DEFAULT 'open',
  is_featured INTEGER NOT NULL DEFAULT false,
  moderation_status TEXT NOT NULL DEFAULT 'clean',
  moderation_note TEXT,
  cohort TEXT,
  recorded_at INTEGER,
  recorded_end_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
) STRICT;

INSERT INTO records_new (
  id,
  slug,
  author_id,
  challenge_id,
  collaboration_unit_id,
  linked_record_id,
  original_url,
  original_title,
  original_description,
  title,
  content,
  content_text,
  format,
  type,
  rhythm,
  visibility,
  response_preference,
  is_featured,
  moderation_status,
  moderation_note,
  cohort,
  recorded_at,
  recorded_end_at,
  created_at,
  updated_at
)
SELECT
  id,
  slug,
  author_id,
  challenge_id,
  collaboration_unit_id,
  linked_record_id,
  original_url,
  original_title,
  original_description,
  title,
  content,
  content_text,
  format,
  type,
  rhythm,
  visibility,
  response_preference,
  is_featured,
  moderation_status,
  moderation_note,
  cohort,
  recorded_at,
  recorded_end_at,
  created_at,
  updated_at
FROM records;

DROP TABLE records;
ALTER TABLE records_new RENAME TO records;
CREATE UNIQUE INDEX records_slug_unique ON records(slug);

CREATE TABLE drafts_new (
  id TEXT PRIMARY KEY NOT NULL,
  author_id TEXT NOT NULL REFERENCES learner_profiles(user_id),
  format TEXT NOT NULL CHECK(format IN ('note', 'article')),
  title TEXT,
  content TEXT NOT NULL DEFAULT '',
  content_json TEXT,
  challenge_id TEXT REFERENCES challenges(id),
  rhythm TEXT NOT NULL DEFAULT 'free',
  visibility TEXT NOT NULL DEFAULT 'draft' CHECK(visibility IN ('draft', 'private', 'cohort', 'public')),
  response_preference TEXT NOT NULL DEFAULT 'open' CHECK(response_preference IN ('open', 'question_only', 'closed')),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
) STRICT;

INSERT INTO drafts_new (
  id,
  author_id,
  format,
  title,
  content,
  content_json,
  challenge_id,
  rhythm,
  visibility,
  response_preference,
  created_at,
  updated_at
)
SELECT
  id,
  author_id,
  format,
  title,
  content,
  content_json,
  challenge_id,
  rhythm,
  visibility,
  response_preference,
  created_at,
  updated_at
FROM drafts;

DROP TABLE drafts;
ALTER TABLE drafts_new RENAME TO drafts;
CREATE UNIQUE INDEX idx_drafts_author_format ON drafts(author_id, format);

CREATE TABLE collaboration_units_new (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  challenge_id TEXT REFERENCES challenges(id),
  status TEXT NOT NULL DEFAULT 'forming',
  current_question TEXT,
  description TEXT,
  cohort TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
) STRICT;

INSERT INTO collaboration_units_new (
  id,
  name,
  slug,
  challenge_id,
  status,
  current_question,
  description,
  cohort,
  created_at,
  updated_at
)
SELECT
  id,
  name,
  slug,
  challenge_id,
  status,
  current_question,
  description,
  cohort,
  created_at,
  updated_at
FROM collaboration_units;

DROP TABLE collaboration_units;
ALTER TABLE collaboration_units_new RENAME TO collaboration_units;
CREATE UNIQUE INDEX collaboration_units_slug_unique ON collaboration_units(slug);

CREATE TABLE templates_new (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  prompt_body TEXT,
  context TEXT,
  form TEXT,
  rhythm TEXT,
  active INTEGER NOT NULL DEFAULT true,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

INSERT INTO templates_new (
  id,
  name,
  description,
  prompt_body,
  context,
  form,
  rhythm,
  active,
  created_at,
  updated_at
)
SELECT
  id,
  name,
  description,
  prompt_body,
  context,
  form,
  rhythm,
  active,
  created_at,
  updated_at
FROM templates;

DROP TABLE templates;
ALTER TABLE templates_new RENAME TO templates;

PRAGMA foreign_keys = ON;
