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

-- records 테이블 재생성 (stage_id 제외)
CREATE TABLE records_new AS
SELECT id, slug, author_id, challenge_id, collaboration_unit_id, linked_record_id, 
       original_url, original_title, original_description, title, content, content_text,
       format, type, rhythm, visibility, response_preference, is_featured, 
       moderation_status, moderation_note, cohort, recorded_at, recorded_end_at, 
       created_at, updated_at
FROM records;
DROP TABLE records;
ALTER TABLE records_new RENAME TO records;

-- drafts 테이블 재생성 (stage_id 제외)
CREATE TABLE drafts_new AS
SELECT id, author_id, challenge_id, collaboration_unit_id, title, content, 
       format, type, rhythm, visibility, response_preference, cohort, 
       recorded_at, recorded_end_at, created_at, updated_at
FROM drafts;
DROP TABLE drafts;
ALTER TABLE drafts_new RENAME TO drafts;

-- collaboration_units 테이블 재생성 (stage_id 제외)
CREATE TABLE collaboration_units_new AS
SELECT id, name, slug, challenge_id, status, current_question, description, 
       cohort, created_at, updated_at
FROM collaboration_units;
DROP TABLE collaboration_units;
ALTER TABLE collaboration_units_new RENAME TO collaboration_units;

-- 템플릿에서 stage_kind 컬럼 제거
CREATE TABLE templates_new AS
SELECT id, name, slug, description, content, format, type, rhythm, 
       visibility, response_preference, cohort, created_at, updated_at
FROM templates;
DROP TABLE templates;
ALTER TABLE templates_new RENAME TO templates;

PRAGMA foreign_keys = ON;
