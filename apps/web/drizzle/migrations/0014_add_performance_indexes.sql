-- Migration: Add missing indexes for frequently queried columns
-- These indexes improve query performance for common filter patterns

CREATE INDEX IF NOT EXISTS idx_records_author_id ON records(author_id);
CREATE INDEX IF NOT EXISTS idx_records_visibility ON records(visibility);
CREATE INDEX IF NOT EXISTS idx_records_cohort ON records(cohort);
CREATE INDEX IF NOT EXISTS idx_responses_record_id ON responses(record_id);
CREATE INDEX IF NOT EXISTS idx_questions_record_id ON questions(record_id);
CREATE INDEX IF NOT EXISTS idx_learner_profiles_cohort ON learner_profiles(cohort);
