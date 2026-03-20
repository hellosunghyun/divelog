-- 공개 범위에 'private'(나만 보기) 추가
-- records 테이블은 CHECK 제약이 없으므로 application-level 검증만으로 충분
-- drafts 테이블은 CHECK 제약이 있으므로 테이블 재생성 필요 (SQLite ALTER 제한)

-- Step 1: drafts 테이블 재생성 (CHECK 제약에 'private' 추가)
CREATE TABLE drafts_new (
  id TEXT PRIMARY KEY NOT NULL,
  author_id TEXT NOT NULL REFERENCES learner_profiles(user_id),
  format TEXT NOT NULL CHECK(format IN ('note', 'article')),
  title TEXT,
  content TEXT NOT NULL DEFAULT '',
  content_json TEXT,
  stage_id TEXT REFERENCES stages(id),
  challenge_id TEXT REFERENCES challenges(id),
  rhythm TEXT NOT NULL DEFAULT 'free',
  visibility TEXT NOT NULL DEFAULT 'draft' CHECK(visibility IN ('draft', 'private', 'cohort', 'public')),
  response_preference TEXT NOT NULL DEFAULT 'open' CHECK(response_preference IN ('open', 'question_only', 'closed')),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
) STRICT;

INSERT INTO drafts_new SELECT * FROM drafts;
DROP TABLE drafts;
ALTER TABLE drafts_new RENAME TO drafts;
CREATE UNIQUE INDEX idx_drafts_author_format ON drafts(author_id, format);
