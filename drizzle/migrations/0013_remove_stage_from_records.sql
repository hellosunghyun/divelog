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
ALTER TABLE records DROP COLUMN stage_id;
ALTER TABLE drafts DROP COLUMN stage_id;
ALTER TABLE collaboration_units DROP COLUMN stage_id;

-- 5. 템플릿에서 stage_kind 컬럼 제거
ALTER TABLE templates DROP COLUMN stage_kind;
