# Record Revision History & Audit Logging

## TL;DR

> **Quick Summary**: 기록(Record) 수정 시 이전 상태를 스냅샷으로 저장하고, 작성자/Admin에게 필드별 diff 타임라인을 제공하며, 감사 로그에 변경 이력을 기록하는 기능 추가
> 
> **Deliverables**:
> - `record_revisions` 테이블 + Drizzle 스키마 + 마이그레이션 0007
> - 수정 시 자동 리비전 생성 (동일 데이터 제출 시 skip)
> - 기록 상세 페이지: 작성자/Admin 전용 수정 타임라인 (필드별 diff 표시)
> - "수정됨" 뱃지: 카드/메타데이터 영역에 최근 수정 일자 표시
> - 감사 로그: record CRUD 시 beforeState/afterState 기록 + audit.tsx 버그 수정
> - Admin 기록 상세: 리비전 히스토리 섹션
> 
> **Estimated Effort**: Medium
> **Parallel Execution**: YES — 4 waves
> **Critical Path**: T1 → T5 → T10 → T11 → T12

---

## Context

### Original Request
기록 수정 시 최근 수정 일자와 수정 타임라인을 볼 수 있도록 하고, 감사 로그에 어떤 변화가 있는지 기록.

### Interview Summary
**Key Discussions**:
- 수정 이력 상세도: 필드별 변경 전/후 diff 표시 (전체 스냅샷 저장)
- 접근 권한: 작성자 + Admin만 수정 이력 확인 가능
- 감사 로그 범위: 모든 주요 엔티티 → **이번 태스크에서는 Record CRUD만** (foundation 구축)

### Research Findings
- `records` 테이블에 `updatedAt` 존재하지만 리비전 추적 없음
- `audit_logs` 테이블이 존재하지만 **코드베이스 전체에서 단 한 번도 INSERT된 적 없음**
- `audit.tsx`가 `log.details` 참조하지만 스키마에는 `beforeState`/`afterState` → 버그
- 2개의 편집 경로 존재: `$recordSlug.edit.tsx` (콘텐츠), `$recordSlug.details.tsx` (메타데이터)
- Admin 경로 (`admin/records/$recordId.tsx`)는 moderation만 수정
- `QuestionTimeline` 컴포넌트가 리비전 타임라인의 좋은 구조 템플릿
- 테스트 인프라 존재: Vitest + mocked DB pattern (`app/db/queries/__tests__/`)
- 마이그레이션 패턴: STRICT tables, `unixepoch()`, 다음 번호 0006

### Metis Review
**Identified Gaps** (addressed):
- `$recordSlug.details.tsx`의 메타데이터 변경도 리비전? → 아니오, audit log만
- Admin moderation 변경도 리비전? → 아니오, audit log만
- Article(TipTap JSON) diff 렌더링? → Phase 1에서는 "내용이 수정되었습니다" + 글자수 변화량만
- 첫 번째 버전(생성)을 리비전 0으로 저장? → createRecord() audit log의 afterState로 초기 상태 보존
- 동일 데이터 제출 시? → Deep compare로 리비전 생성 skip
- Tag 변경 추적? → 리비전 스냅샷에 태그 목록을 JSON 배열로 포함
- 54개 mutation 함수 전체 audit? → 이번 태스크는 Record CRUD만, 나머지는 후속 태스크

---

## Work Objectives

### Core Objective
기록 수정 이력을 추적하여 작성자와 Admin이 언제 무엇이 변경되었는지 확인할 수 있게 하고, 감사 로그 기반을 마련한다.

### Concrete Deliverables
- `record_revisions` 테이블 (마이그레이션 0007)
- `createAuditLog()` 유틸리티 함수 (모든 엔티티에 재사용 가능)
- `compareRecordStates()` diff 유틸리티
- 수정된 `updateRecord()` — 리비전 + 감사 로그 자동 생성
- `createRecord()` — 감사 로그 생성 추가
- `RevisionTimeline` + `RevisionDiffView` 컴포넌트
- `EditedIndicator` 컴포넌트 ("수정됨" 뱃지)
- 기록 상세 페이지: 작성자/Admin 전용 리비전 타임라인 섹션
- Admin 기록 상세: 리비전 히스토리 섹션
- audit.tsx 버그 수정 (details → beforeState/afterState)

### Definition of Done
- [ ] `pnpm typecheck` 통과
- [ ] `pnpm test` 통과 (신규 테스트 포함)
- [ ] `wrangler d1 migrations apply DB --local` 성공
- [ ] 기록 수정 → revision 행 생성됨
- [ ] 동일 데이터 제출 → revision 미생성
- [ ] 작성자로 기록 상세 → 수정 타임라인 표시
- [ ] 비작성자로 기록 상세 → 수정 타임라인 미표시
- [ ] Admin 기록 상세 → 리비전 히스토리 표시
- [ ] audit_logs에 record create/update 이벤트 기록됨

### Must Have
- 전체 스냅샷 저장 (수정 전 상태 전체 + 태그 목록)
- 동일 데이터 제출 시 리비전 생성하지 않음 (deep compare)
- 작성자 + Admin만 리비전 타임라인 접근 가능
- 간단한 필드의 old→new 표시 (title, format, type, rhythm, visibility 등)
- 콘텐츠 변경은 "내용이 수정되었습니다" + 글자수 변화량
- 태그 변경은 추가/제거된 태그 이름 표시
- `createAuditLog()` 유틸리티는 재사용 가능한 범용 함수
- Quiet Depth 디자인 가이드라인 준수

### Must NOT Have (Guardrails)
- ❌ Rich content diff 렌더링 (TipTap JSON diff viewer)
- ❌ `$recordSlug.details.tsx` 메타데이터 변경에 대한 리비전 (audit log만)
- ❌ Admin moderation 변경에 대한 리비전 (audit log만)
- ❌ Record 외 엔티티의 audit logging (이번 태스크 범위 밖)
- ❌ `db.transaction()` 도입 (코드베이스 패턴 따라 sequential operations)
- ❌ Route-level 직접 DB mutation 리팩터링
- ❌ Audit 페이지 리디자인 (버그 수정만)
- ❌ 리비전 복원(revert) 기능
- ❌ `as any`, `@ts-ignore`, `@ts-expect-error`
- ❌ 빈 catch 블록
- ❌ 글로벌 DB 인스턴스

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: YES — Vitest + mocked DB pattern
- **Automated tests**: YES (Tests-after) — 각 query function에 unit test 포함
- **Framework**: Vitest (`pnpm test`)
- **Test pattern**: `app/db/queries/__tests__/*.test.ts` 의 mock DB chain 패턴 따름

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **DB/Query**: Use Bash — `pnpm test` 실행, migration 적용 확인
- **Frontend/UI**: Use Playwright — 페이지 탐색, DOM 검증, 스크린샷
- **Type Safety**: Use Bash — `pnpm typecheck` 실행

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation — 4 parallel quick tasks):
├── T1:  Migration 0007 + Schema + Relations (record_revisions) [quick]
├── T2:  createAuditLog() 유틸리티 함수 + 테스트 [quick]
├── T3:  Record diff 유틸리티 (compareRecordStates, formatFieldChange) + 테스트 [quick]
└── T4:  audit.tsx 버그 수정 (log.details → beforeState/afterState) [quick]

Wave 2 (Queries + Components — 5 parallel tasks):
├── T5:  Revision 쿼리 함수 (createRevision, getRevisionsByRecord) + 테스트 [depends: T1]
├── T6:  createRecord()에 audit logging 추가 [depends: T2]
├── T7:  RevisionTimeline + RevisionDiffView 컴포넌트 [depends: T3]
├── T8:  EditedIndicator "수정됨" 컴포넌트 [no deps]
└── T9:  Admin audit 페이지 개선 (record 변경 표시) [depends: T4, T3]

Wave 3 (Integration — 6 tasks, T10→T11 sequential):
├── T10: updateRecord() 수정: pre-fetch → diff → revision → audit → update [depends: T2, T3, T5]
├── T11: $recordSlug.edit.tsx action 수정: tag snapshot + revision context [depends: T10]
├── T12: $recordSlug.tsx: 리비전 타임라인 통합 (author/admin only) [depends: T5, T7, T8]
├── T13: SceneCard/메타데이터 "수정됨" 표시 [depends: T8]
├── T14: Admin 기록 상세: 리비전 히스토리 섹션 [depends: T5, T7]
└── T15: Admin audit 페이지: record 변경 diff 인라인 표시 [depends: T4, T3]

Wave FINAL (Verification — 4 parallel):
├── F1:  Plan compliance audit [deep, subagent_type=oracle]
├── F2:  Code quality review [unspecified-high]
├── F3:  Real QA [unspecified-high + playwright]
└── F4:  Scope fidelity check [deep]

Critical Path: T1 → T5 → T10 → T11 → F1-F4
Parallel Speedup: ~65% faster than sequential
Max Concurrent: 6 (Wave 3)
```

### Dependency Matrix

| Task | Depends On | Blocks | Wave |
|------|-----------|--------|------|
| T1  | — | T5, T10, T14 | 1 |
| T2  | — | T6, T10 | 1 |
| T3  | — | T7, T9, T10, T15 | 1 |
| T4  | — | T9, T15 | 1 |
| T5  | T1 | T10, T12, T14 | 2 |
| T6  | T2 | — | 2 |
| T7  | T3 | T12, T14 | 2 |
| T8  | — | T12, T13 | 2 |
| T9  | T4, T3 | — | 2 |
| T10 | T2, T3, T5 | T11 | 3 |
| T11 | T10 | — | 3 |
| T12 | T5, T7, T8 | — | 3 |
| T13 | T8 | — | 3 |
| T14 | T5, T7 | — | 3 |
| T15 | T4, T3 | — | 3 |

### Agent Dispatch Summary

- **Wave 1**: **4** — T1→`quick`, T2→`quick`, T3→`quick`, T4→`quick`
- **Wave 2**: **5** — T5→`quick`, T6→`quick`, T7→`visual-engineering`, T8→`visual-engineering`, T9→`quick`
- **Wave 3**: **6** — T10→`deep`, T11→`quick`, T12→`visual-engineering`, T13→`quick`, T14→`visual-engineering`, T15→`quick`
- **FINAL**: **4** — F1→`deep` (subagent_type=oracle), F2→`unspecified-high`, F3→`unspecified-high`, F4→`deep`

---

## TODOs

- [x] 1. Migration 0007 + Drizzle 스키마 + Relations (record_revisions)

  **What to do**:
  - `drizzle/migrations/0007_add_record_revisions.sql` 마이그레이션 파일 생성:
    ```sql
    CREATE TABLE record_revisions (
      id TEXT PRIMARY KEY NOT NULL,
      record_id TEXT NOT NULL REFERENCES records(id) ON DELETE CASCADE,
      author_id TEXT NOT NULL REFERENCES learner_profiles(user_id),
      revision_number INTEGER NOT NULL,
      snapshot TEXT NOT NULL,
      changed_fields TEXT NOT NULL,
      tags_snapshot TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    ) STRICT;
    CREATE INDEX idx_revisions_record ON record_revisions(record_id, revision_number);
    CREATE INDEX idx_revisions_author ON record_revisions(author_id);
    ```
  - `app/db/schema.server.ts`에 `recordRevisions` 테이블 정의 추가 (auditLogs 뒤에)
    - `id`: text PK (nanoid)
    - `recordId`: text NOT NULL, FK → records.id, onDelete cascade
    - `authorId`: text NOT NULL, FK → learnerProfiles.userId
    - `revisionNumber`: integer NOT NULL (per-record auto-incrementing, 1부터 시작)
    - `snapshot`: text NOT NULL (수정 전 전체 record 상태 JSON)
    - `changedFields`: text NOT NULL (변경된 필드 이름 배열 JSON, e.g. `["title","content"]`)
    - `tagsSnapshot`: text (수정 전 태그 ID/이름 배열 JSON)
    - `createdAt`: integer NOT NULL, default `now()` (unixepoch)
  - `app/db/relations.server.ts`에 relations 추가:
    - `recordRevisionsRelations`: recordId → records (many-to-one), authorId → learnerProfiles (many-to-one)
    - `recordsRelations`에 `revisions: many(recordRevisions)` 추가
  - `drizzle/migrations/meta/_journal.json`에 새 마이그레이션 엔트리 추가
  - `wrangler d1 migrations apply DB --local`로 로컬 적용 확인

  **Must NOT do**:
  - `db.transaction()` 사용 금지
  - 기존 테이블 ALTER 금지 (새 테이블만 CREATE)
  - integer auto-increment PK 사용 금지 (text + nanoid)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 스키마 정의 + SQL 마이그레이션은 단일 도메인의 명확한 작업
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `git-master`: 커밋은 별도 단계에서 처리

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T2, T3, T4)
  - **Blocks**: T5, T10, T14
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `app/db/schema.server.ts:276-285` — `auditLogs` 테이블 정의 패턴 (text PK, FK 패턴, timestamp 정의)
  - `app/db/schema.server.ts:98-122` — `records` 테이블 (리비전이 스냅샷할 대상 필드들)
  - `app/db/schema.server.ts:229-242` — `savedRecords` junction table 패턴 (FK with onDelete cascade)
  - `app/db/relations.server.ts:1-50` — 기존 relations 정의 패턴 (many/one 관계)
  - `drizzle/migrations/0005_ux_reflection_overhaul.sql` — 최신 STRICT table 마이그레이션 패턴, statement-breakpoint

  **API/Type References**:
  - `app/db/schema.server.ts:7` — `now()` 헬퍼 함수 (`sql\`(unixepoch())\``)
  - `app/db/schema.server.ts:3-5` — Drizzle import 패턴

  **External References**:
  - Drizzle ORM SQLite: `https://orm.drizzle.team/docs/get-started/d1-new`

  **WHY Each Reference Matters**:
  - `auditLogs` 테이블: 동일한 text PK + FK + timestamp 패턴을 따라야 함
  - `records` 테이블: 스냅샷 대상 필드 목록 확인 + FK 참조 대상
  - `0005` 마이그레이션: STRICT 키워드 사용법 + statement-breakpoint 구분자

  **Acceptance Criteria**:

  - [ ] `app/db/schema.server.ts`에 `recordRevisions` export 존재
  - [ ] `drizzle/migrations/0007_add_record_revisions.sql` 파일 존재
  - [ ] `app/db/relations.server.ts`에 `recordRevisionsRelations` 존재
  - [ ] `pnpm typecheck` → 0 errors (스키마 타입 정합)
  - [ ] `wrangler d1 migrations apply DB --local` → Migration 0007 applied

  **QA Scenarios**:

  ```
  Scenario: 마이그레이션 로컬 적용
    Tool: Bash
    Preconditions: 로컬 D1 데이터베이스 존재
    Steps:
      1. `wrangler d1 migrations apply DB --local` 실행
      2. stdout에 "0007" 포함 확인
      3. `wrangler d1 execute DB --local --command="SELECT name FROM sqlite_master WHERE type='table' AND name='record_revisions'"` 실행
      4. 결과에 "record_revisions" 포함 확인
    Expected Result: 테이블 생성됨, STRICT 모드
    Failure Indicators: "error" 출력, 테이블 미존재
    Evidence: .sisyphus/evidence/task-1-migration-apply.txt

  Scenario: 시드 데이터 호환성
    Tool: Bash
    Preconditions: Migration 0007 적용됨
    Steps:
      1. `wrangler d1 execute DB --local --file=seeds/seed.sql` 실행
      2. exit code 0 확인
    Expected Result: 기존 시드 데이터 정상 삽입
    Failure Indicators: FK constraint error, syntax error
    Evidence: .sisyphus/evidence/task-1-seed-compat.txt

  Scenario: 타입 체크 통과
    Tool: Bash
    Steps:
      1. `pnpm typecheck` 실행
      2. 신규 스키마 관련 에러 0개 확인
    Expected Result: 0 errors
    Evidence: .sisyphus/evidence/task-1-typecheck.txt
  ```

  **Commit**: YES
  - Message: `feat(db): record_revisions 테이블 스키마 + 마이그레이션 0007`
  - Files: `app/db/schema.server.ts`, `app/db/relations.server.ts`, `drizzle/migrations/0007_add_record_revisions.sql`, `drizzle/migrations/meta/_journal.json`
  - Pre-commit: `pnpm typecheck`

- [x] 2. createAuditLog() 유틸리티 함수 + 테스트

  **What to do**:
  - `app/db/queries/admin/insights/audit-helpers.server.ts` 파일 생성
  - `createAuditLog(d1, params)` 함수 구현:
    ```typescript
    interface AuditLogParams {
      actorId: string;
      targetType: string; // "record" | "response" | "question" | "stage" | ...
      targetId: string;
      action: string; // "create" | "update" | "delete" | "publish" | ...
      beforeState?: Record<string, unknown> | null;
      afterState?: Record<string, unknown> | null;
    }
    ```
  - `nanoid()`로 ID 생성, `Math.floor(Date.now() / 1000)`로 timestamp
  - `beforeState`/`afterState`는 `JSON.stringify()`로 직렬화하여 text 컬럼에 저장
  - `null`/`undefined` 값은 그대로 null로 저장
  - 기존 `adminGetAuditLogs`, `adminGetAuditLogById` 함수는 그대로 유지 (별도 파일)
  - `app/db/queries/__tests__/audit-helpers.test.ts` 유닛 테스트 작성:
    - 정상 생성 (beforeState/afterState 포함)
    - beforeState null인 경우 (create action)
    - afterState null인 경우 (delete action)

  **Must NOT do**:
  - 기존 `audit.server.ts` 파일 수정 금지 (새 파일에 작성)
  - 호출 측에서 JSON.stringify 하도록 하지 않음 (함수 내부에서 처리)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 단일 유틸리티 함수 + 테스트, 명확한 인터페이스
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T1, T3, T4)
  - **Blocks**: T6, T10
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `app/db/queries/admin/insights/audit.server.ts:6-22` — 기존 audit 쿼리 패턴 (db(d1) 사용, named export)
  - `app/db/queries/dialogue/responses.server.ts:1-30` — 쿼리 모듈 구조 (import 패턴, nanoid 사용)
  - `app/db/queries/__tests__/drafts.test.ts` — Vitest mock 패턴 (vi.mock, mock chain 구성)

  **API/Type References**:
  - `app/db/schema.server.ts:276-285` — `auditLogs` 테이블 스키마 (insert 대상 컬럼)

  **WHY Each Reference Matters**:
  - `audit.server.ts`: 같은 디렉토리의 기존 패턴을 따라야 함
  - `drafts.test.ts`: 테스트 mock 패턴의 정확한 구조를 복제해야 함

  **Acceptance Criteria**:

  - [ ] `app/db/queries/admin/insights/audit-helpers.server.ts` 파일 존재
  - [ ] `createAuditLog` 함수 export
  - [ ] `pnpm test` → audit-helpers.test.ts 통과
  - [ ] `pnpm typecheck` → 0 errors

  **QA Scenarios**:

  ```
  Scenario: audit-helpers 유닛 테스트 통과
    Tool: Bash
    Steps:
      1. `pnpm test app/db/queries/__tests__/audit-helpers.test.ts` 실행
      2. "Tests: 3 passed" 확인 (정상생성, create, delete 케이스)
    Expected Result: 모든 테스트 통과
    Failure Indicators: "FAIL", assertion error
    Evidence: .sisyphus/evidence/task-2-unit-tests.txt

  Scenario: beforeState/afterState JSON 직렬화
    Tool: Bash
    Steps:
      1. 테스트에서 `{ title: "old" }` 객체를 beforeState로 전달
      2. insert mock 호출 시 values.beforeState가 `'{"title":"old"}'` 문자열인지 확인
    Expected Result: 객체가 JSON 문자열로 직렬화됨
    Evidence: .sisyphus/evidence/task-2-serialization.txt
  ```

  **Commit**: YES
  - Message: `feat(audit): createAuditLog 유틸리티 함수 추가`
  - Files: `app/db/queries/admin/insights/audit-helpers.server.ts`, `app/db/queries/__tests__/audit-helpers.test.ts`
  - Pre-commit: `pnpm test app/db/queries/__tests__/audit-helpers.test.ts`

- [x] 3. Record Diff 유틸리티 (compareRecordStates, formatFieldChange) + 테스트

  **What to do**:
  - `app/lib/utils/record-diff.server.ts` 파일 생성
  - `compareRecordStates(oldState, newState)` 함수:
    - 두 record 상태 객체를 받아 변경된 필드 목록 반환
    - 반환 타입: `FieldChange[]` where `FieldChange = { field: string; oldValue: unknown; newValue: unknown }`
    - 비교 대상 필드: title, content, contentText, format, type, rhythm, visibility, responsePreference, stageId, challengeId, collaborationUnitId
    - deep equality로 비교 (`JSON.stringify` 기반)
    - 변경 없으면 빈 배열 반환
  - `computeTagDiff(oldTags, newTags)` 함수:
    - 두 태그 배열을 받아 추가/제거된 태그 반환
    - 반환 타입: `TagDiff = { added: string[]; removed: string[] }`
  - `formatFieldChange(field, oldValue, newValue)` 함수:
    - 필드별 한국어 라벨 매핑: title→"제목", format→"형식", visibility→"공개 범위", etc.
    - 값의 한국어 매핑: "note"→"노트", "article"→"글", "cohort"→"코호트", "public"→"전체 공개", "draft"→"초안", etc.
    - content 필드: "내용이 수정되었습니다" + 글자수 변화량 (예: "+120자", "-45자")
    - 반환: `{ label: string; summary: string }` (예: `{ label: "공개 범위", summary: "코호트 → 전체 공개" }`)
  - `hasActualChanges(oldState, newState)` 함수:
    - `compareRecordStates`를 호출하여 변경 사항이 있는지 boolean 반환
    - `updateRecord()`에서 리비전 생성 여부 판단에 사용
  - `app/db/queries/__tests__/record-diff.test.ts` 유닛 테스트:
    - 필드 변경 감지 (title 변경, visibility 변경)
    - 변경 없음 감지 (동일 데이터)
    - content 변경 시 글자수 변화량 계산
    - 태그 diff (추가, 제거, 혼합)
    - formatFieldChange 한국어 라벨 매핑

  **Must NOT do**:
  - Rich diff 알고리즘 (line-by-line, word-by-word) 구현 금지
  - Article(TipTap JSON) content의 구조적 diff 금지

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 순수 유틸리티 함수, 외부 의존성 없음, 명확한 입출력
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T1, T2, T4)
  - **Blocks**: T7, T9, T10, T15
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `app/lib/utils/date-groups.ts` — 유틸리티 함수 파일 구조 패턴 (named export, TypeScript 인터페이스)
  - `app/db/schema.server.ts:98-122` — records 테이블 필드 목록 (비교 대상)
  - `app/lib/auth/validation.ts:3-47` — `createRecordSchema` (편집 가능 필드 + 값 enum 확인)

  **API/Type References**:
  - Record 타입: `typeof records.$inferSelect` — 스냅샷/비교 시 사용할 record 타입

  **WHY Each Reference Matters**:
  - `records` 테이블: 비교 대상 필드 11개의 정확한 이름과 타입
  - `createRecordSchema`: 각 필드의 가능한 값 (enum) — 한국어 라벨 매핑에 필요

  **Acceptance Criteria**:

  - [ ] `app/lib/utils/record-diff.server.ts` 파일 존재
  - [ ] `compareRecordStates`, `computeTagDiff`, `formatFieldChange`, `hasActualChanges` export
  - [ ] `pnpm test` → record-diff.test.ts 통과
  - [ ] content 변경 시 글자수 변화량 정확 (예: "+120자")

  **QA Scenarios**:

  ```
  Scenario: 필드 변경 감지 테스트
    Tool: Bash
    Steps:
      1. `pnpm test app/db/queries/__tests__/record-diff.test.ts` 실행
      2. "compareRecordStates" describe 블록 모든 테스트 통과 확인
    Expected Result: 변경된 필드만 정확히 반환, 동일 데이터는 빈 배열
    Evidence: .sisyphus/evidence/task-3-unit-tests.txt

  Scenario: 한국어 라벨 매핑 검증
    Tool: Bash
    Steps:
      1. 테스트에서 formatFieldChange("visibility", "cohort", "public") 호출
      2. 결과: { label: "공개 범위", summary: "코호트 → 전체 공개" }
    Expected Result: 모든 필드/값의 한국어 매핑 정확
    Evidence: .sisyphus/evidence/task-3-labels.txt

  Scenario: content 변경 글자수 계산
    Tool: Bash
    Steps:
      1. 테스트에서 100자 → 220자 content 변경
      2. formatFieldChange 결과의 summary에 "+120자" 포함 확인
    Expected Result: "내용이 수정되었습니다 (+120자)"
    Evidence: .sisyphus/evidence/task-3-content-diff.txt
  ```

  **Commit**: YES
  - Message: `feat(utils): record diff 유틸리티 함수 추가`
  - Files: `app/lib/utils/record-diff.server.ts`, `app/db/queries/__tests__/record-diff.test.ts`
  - Pre-commit: `pnpm test app/db/queries/__tests__/record-diff.test.ts`

- [x] 4. audit.tsx 버그 수정 (log.details → beforeState/afterState)

  **What to do**:
  - `app/routes/admin/audit.tsx` 수정:
    - Line 23: `auditLogs` import 누락 수정 — `app/db/schema.server.ts`에서 import
    - Line 170 근처: `log.details` 참조를 `log.beforeState` / `log.afterState`로 변경
    - "상세" 컬럼에서 beforeState/afterState가 있으면 JSON.parse하여 요약 표시
    - beforeState/afterState가 null이면 "—" 표시
    - 간단한 요약: "N개 필드 변경" 또는 action에 따라 "생성" / "삭제"
  - `alt` 속성 빈 문자열 → 의미 있는 대체 텍스트로 수정 (Line 115)

  **Must NOT do**:
  - Audit 페이지 전체 리디자인 금지
  - 새 컬럼/필드 추가 금지
  - 복잡한 diff 뷰어 추가 금지 (간단한 요약만)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 기존 파일의 버그 수정, 단일 파일 변경
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T1, T2, T3)
  - **Blocks**: T9, T15
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `app/routes/admin/audit.tsx:23` — auditLogs import 누락 위치
  - `app/routes/admin/audit.tsx:115` — 빈 alt 속성 위치
  - `app/routes/admin/audit.tsx:170` — log.details 참조 위치

  **API/Type References**:
  - `app/db/schema.server.ts:276-285` — auditLogs 스키마 (beforeState, afterState 컬럼)

  **WHY Each Reference Matters**:
  - audit.tsx: 수정 대상 파일의 정확한 라인 번호와 현재 버그 위치

  **Acceptance Criteria**:

  - [ ] `pnpm typecheck` → audit.tsx 관련 에러 0개
  - [ ] `log.details` 참조 완전 제거
  - [ ] `log.beforeState` / `log.afterState` 사용
  - [ ] 빈 alt 속성 수정

  **QA Scenarios**:

  ```
  Scenario: TypeScript 에러 해결
    Tool: Bash
    Steps:
      1. `pnpm typecheck` 실행
      2. audit.tsx 관련 에러가 이전보다 줄었는지 확인
      3. "Cannot find name 'auditLogs'" 에러 해소 확인
    Expected Result: audit.tsx 관련 TS 에러 0개
    Failure Indicators: "error TS" + "audit.tsx"
    Evidence: .sisyphus/evidence/task-4-typecheck.txt

  Scenario: log.details 참조 제거 확인
    Tool: Bash (grep)
    Steps:
      1. `grep -n "log.details" app/routes/admin/audit.tsx` 실행
      2. 결과 0줄 확인
    Expected Result: log.details 참조 없음
    Evidence: .sisyphus/evidence/task-4-no-details.txt
  ```

  **Commit**: YES
  - Message: `fix(admin): audit.tsx log.details → beforeState/afterState 수정`
  - Files: `app/routes/admin/audit.tsx`
  - Pre-commit: `pnpm typecheck`

- [x] 5. Revision 쿼리 함수 (createRevision, getRevisionsByRecord) + 테스트

  **What to do**:
  - `app/db/queries/records/revisions.server.ts` 파일 생성
  - `createRevision(d1, params)` 함수:
    ```typescript
    interface CreateRevisionParams {
      recordId: string;
      authorId: string;
      revisionNumber: number;
      snapshot: Record<string, unknown>; // 수정 전 전체 record 상태
      changedFields: string[]; // ["title", "content", "visibility"]
      tagsSnapshot?: Array<{ id: string; name: string }>; // 수정 전 태그 목록
    }
    ```
    - `nanoid()`로 ID 생성
    - `snapshot`은 `JSON.stringify()`로 직렬화
    - `changedFields`는 `JSON.stringify()`로 직렬화
    - `tagsSnapshot`은 `JSON.stringify()`로 직렬화 (null이면 null)
    - 반환: revision ID (string)
  - `getRevisionsByRecord(d1, recordId)` 함수:
    - record_revisions에서 recordId로 조회
    - `revisionNumber DESC` 정렬 (최신 먼저)
    - LEFT JOIN learnerProfiles로 authorId의 displayName, slug 포함
    - 반환: `Array<{ revision, author }>`
  - `getRevisionCount(d1, recordId)` 함수:
    - COUNT(*) 반환 (타임라인 표시 여부 판단용)
  - `getLatestRevisionNumber(d1, recordId)` 함수:
    - MAX(revision_number) 반환, 없으면 0
    - 새 리비전 생성 시 `latestNumber + 1`로 사용
  - `app/db/queries/__tests__/revisions.test.ts` 유닛 테스트:
    - createRevision 정상 생성 (모든 필드)
    - getRevisionsByRecord 조회 + 정렬
    - getRevisionCount 카운트
    - getLatestRevisionNumber (없을 때 0, 있을 때 최대값)

  **Must NOT do**:
  - 리비전 삭제/수정 함수 금지 (immutable)
  - 리비전 복원(revert) 함수 금지

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: CRUD 쿼리 함수, 기존 패턴 따르기
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T6, T7, T8, T9)
  - **Blocks**: T10, T12, T14
  - **Blocked By**: T1

  **References**:

  **Pattern References**:
  - `app/db/queries/records/records.server.ts:1-30` — records 쿼리 모듈 구조 (import, db(d1) 패턴)
  - `app/db/queries/records/records.server.ts:130-142` — `updateRecord()` 함수 시그니처 패턴
  - `app/db/queries/dialogue/responses.server.ts:10-40` — LEFT JOIN + select 구조 패턴
  - `app/db/queries/__tests__/drafts.test.ts` — Vitest mock 패턴 (vi.mock, mock chain)

  **API/Type References**:
  - `app/db/schema.server.ts` — `recordRevisions` 테이블 (T1에서 생성)
  - `app/db/schema.server.ts:98-122` — `records` 테이블 (snapshot 대상)
  - `app/db/schema.server.ts:3-5` — Drizzle import (eq, desc, sql 등)

  **WHY Each Reference Matters**:
  - `records.server.ts`: 같은 도메인의 쿼리 모듈 패턴을 정확히 따라야 함
  - `responses.server.ts`: JOIN 패턴 (author displayName, slug 포함)
  - `drafts.test.ts`: mock DB 테스트 패턴 복제

  **Acceptance Criteria**:

  - [ ] `app/db/queries/records/revisions.server.ts` 존재
  - [ ] 4개 함수 export: `createRevision`, `getRevisionsByRecord`, `getRevisionCount`, `getLatestRevisionNumber`
  - [ ] `pnpm test` → revisions.test.ts 통과
  - [ ] `pnpm typecheck` → 0 errors

  **QA Scenarios**:

  ```
  Scenario: revision 쿼리 유닛 테스트
    Tool: Bash
    Steps:
      1. `pnpm test app/db/queries/__tests__/revisions.test.ts` 실행
      2. 모든 테스트 통과 확인
    Expected Result: 4개 이상 테스트, 모두 PASS
    Evidence: .sisyphus/evidence/task-5-unit-tests.txt

  Scenario: 타입 정합성
    Tool: Bash
    Steps:
      1. `pnpm typecheck` 실행
      2. revisions.server.ts 관련 에러 0개
    Expected Result: 타입 에러 없음
    Evidence: .sisyphus/evidence/task-5-typecheck.txt
  ```

  **Commit**: YES
  - Message: `feat(db): revision 쿼리 함수 추가`
  - Files: `app/db/queries/records/revisions.server.ts`, `app/db/queries/__tests__/revisions.test.ts`
  - Pre-commit: `pnpm test app/db/queries/__tests__/revisions.test.ts`

- [x] 6. createRecord()에 Audit Logging 추가

  **What to do**:
  - `app/db/queries/records/records.server.ts`의 `createRecord()` 함수 수정:
    - record INSERT 성공 후, `createAuditLog()` 호출:
      ```typescript
      await createAuditLog(d1, {
        actorId: authorId,
        targetType: "record",
        targetId: id,
        action: "create",
        beforeState: null,
        afterState: { ...insertedData, id },
      });
      ```
    - `createAuditLog`를 `audit-helpers.server.ts`에서 import
    - 기존 createRecord 반환값(id) 그대로 유지
  - `app/db/queries/__tests__/records.test.ts` 테스트 추가/수정:
    - createRecord 호출 시 audit log INSERT도 호출되는지 확인
    - afterState에 record 데이터 + id 포함 확인
    - beforeState가 null인지 확인

  **Must NOT do**:
  - createRecord의 기존 시그니처/반환값 변경 금지
  - 기존 테스트 삭제 금지
  - audit log 실패가 record 생성을 막아서는 안 됨 (try-catch로 감싸기)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 기존 함수에 한 줄 추가 수준
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T5, T7, T8, T9)
  - **Blocks**: —
  - **Blocked By**: T2

  **References**:

  **Pattern References**:
  - `app/db/queries/records/records.server.ts:100-128` — 기존 `createRecord()` 함수 전체
  - `app/db/queries/admin/insights/audit-helpers.server.ts` — `createAuditLog()` (T2에서 생성)

  **WHY Each Reference Matters**:
  - `createRecord()`: 수정 대상 함수의 현재 구조와 반환값
  - `audit-helpers`: import할 함수의 시그니처

  **Acceptance Criteria**:

  - [ ] `createRecord()` 내부에서 `createAuditLog()` 호출
  - [ ] audit log action: "create", beforeState: null
  - [ ] 기존 createRecord 반환값 변경 없음
  - [ ] `pnpm test` 통과

  **QA Scenarios**:

  ```
  Scenario: createRecord audit log 생성
    Tool: Bash
    Steps:
      1. `pnpm test app/db/queries/__tests__/records.test.ts` 실행
      2. "createRecord" describe 블록의 audit log 관련 테스트 통과 확인
    Expected Result: createRecord 호출 → audit log INSERT 호출됨
    Evidence: .sisyphus/evidence/task-6-audit-create.txt
  ```

  **Commit**: YES
  - Message: `feat(audit): createRecord audit logging 추가`
  - Files: `app/db/queries/records/records.server.ts`, `app/db/queries/__tests__/records.test.ts`
  - Pre-commit: `pnpm test`

- [x] 7. RevisionTimeline + RevisionDiffView 컴포넌트

  **What to do**:
  - `app/components/revision/RevisionTimeline.tsx` 생성:
    - Props:
      ```typescript
      interface RevisionTimelineProps {
        revisions: RevisionItem[];        // revision + author (최신 먼저 정렬)
        currentRecord: Record<string, unknown>;  // 현재 record 상태 (최신 리비전의 afterState로 사용)
        currentTags: Array<{ id: string; name: string }>;  // 현재 태그 (최신 리비전의 afterTags로 사용)
      }
      ```
    - **Per-revision afterState 계산 로직** (컴포넌트 내부):
      - revisions는 revisionNumber DESC로 정렬 (최신 먼저)
      - 최신 리비전(index 0)의 afterState = `currentRecord`, afterTags = `currentTags`
      - 리비전 N(index i)의 afterState = 리비전 N-1(index i-1이 아닌, revisionNumber가 하나 큰 것)의 `snapshot`
      - 즉: `revisions[i]`의 afterState = `i === 0 ? currentRecord : JSON.parse(revisions[i-1].revision.snapshot)`
      - 태그 동일: `revisions[i]`의 afterTags = `i === 0 ? currentTags : JSON.parse(revisions[i-1].revision.tagsSnapshot)`
    - 구조: `QuestionTimeline.tsx` 패턴 활용 — 세로 타임라인, 원형 노드
    - 각 revision 노드:
      - 왼쪽: revision number 원형 뱃지 (1, 2, 3...)
      - 가운데: 세로 연결선 (1px border-left, `var(--color-border)`)
      - 오른쪽 상단: 상대 시간 (formatRelativeTime 활용) + 작성자 이름
      - 오른쪽 하단: 변경된 필드 요약 (RevisionDiffView)
    - 각 리비전 항목에 `data-testid="revision-item"` 추가 (QA 셀렉터)
    - 빈 배열이면 아무것도 렌더링하지 않음 (null 반환)
    - 최대 20개까지 표시 (추후 pagination 가능)
  - `app/components/revision/RevisionDiffView.tsx` 생성:
    - Props:
      ```typescript
      interface RevisionDiffViewProps {
        changedFields: string[];       // 변경된 필드 이름 배열
        beforeSnapshot: Record<string, unknown>;  // 이 리비전의 snapshot (수정 전 상태)
        afterState: Record<string, unknown>;       // 수정 후 상태 (다음 리비전의 snapshot 또는 현재 record)
        beforeTags?: Array<{ id: string; name: string }>;  // 수정 전 태그
        afterTags?: Array<{ id: string; name: string }>;   // 수정 후 태그
      }
      ```
    - **Per-revision diff 계약** (핵심):
      - 리비전 N의 `beforeSnapshot` = 리비전 N의 `snapshot` (수정 전 상태)
      - 리비전 N의 `afterState` = 리비전 (N+1)의 `snapshot` (다음 수정 전 상태 = 이번 수정 후 상태)
      - 가장 최신 리비전의 `afterState` = 현재 record 상태
      - 태그: 리비전 N의 `beforeTags` = 리비전 N의 `tagsSnapshot`, 리비전 N의 `afterTags` = 리비전 (N+1)의 `tagsSnapshot` 또는 현재 태그
    - 각 변경 필드에 대해 `formatFieldChange()` 호출하여 표시:
      - 간단한 필드: "공개 범위: 코호트 → 전체 공개" 형식
      - content 필드: "내용이 수정되었습니다 (+120자)"
    - 태그 변경: `computeTagDiff(beforeTags, afterTags)` → "태그: +디자인, -개발" 형식
    - 스타일: 텍스트 기반, 조용한 디자인 (text-secondary 색상, body default 크기)
  - Quiet Depth 디자인 준수:
    - 원형 노드: `var(--color-ocean-blue)` 배경, 작은 크기 (24px)
    - 연결선: `var(--color-border)`, 1px
    - 텍스트: `var(--color-text-secondary)` 메타 크기 (13-14px)
    - 변경 내용: `var(--color-text-primary)` body default (16px)
    - 카드/배경 없이 타이포와 여백으로만 깊이감 표현

  **Must NOT do**:
  - Rich diff viewer (코드 diff 스타일) 금지
  - 빨간색/초록색 삽입/삭제 하이라이트 금지
  - 애니메이션 과다 사용 금지 (subtle fade-up만 허용)
  - 말풍선/채팅 버블 UI 금지

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: UI 컴포넌트 디자인, Quiet Depth 가이드라인 준수 필요
  - **Skills**: [`frontend-design`]
    - `frontend-design`: 디자인 품질 높은 UI 컴포넌트 구현

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T5, T6, T8, T9)
  - **Blocks**: T12, T14
  - **Blocked By**: T3

  **References**:

  **Pattern References**:
  - `app/components/views/QuestionTimeline.tsx:1-153` — 타임라인 구조 패턴 (세로 라인, 원형 노드, 시간 표시)
  - `app/components/views/TimelineView.tsx:1-91` — 날짜 그룹핑 타임라인 패턴
  - `app/components/cards/SceneCard.tsx` — 메타데이터 표시 패턴 (날짜, 작성자)

  **API/Type References**:
  - `app/lib/utils/record-diff.server.ts` — `formatFieldChange()` 반환 타입 (T3에서 생성)
  - `app/components/views/QuestionTimeline.tsx:35-50` — `formatRelativeTime()` 로컬 함수 (공유 유틸리티 아님, 복사하여 사용)
  - 참고: `formatRelativeTime()`은 `QuestionTimeline.tsx`, `TimelineView.tsx`, `ActivityFeed.tsx`, `NarrativeDigest.tsx`에 동일 패턴으로 로컬 정의됨. 이 컴포넌트에도 로컬로 정의하거나 공유 유틸리티로 추출.

  **External References**:
  - `.docs/design.md` — Quiet Depth 디자인 가이드라인 (색상, 타이포, 간격, 모션)

  **WHY Each Reference Matters**:
  - `QuestionTimeline.tsx`: 가장 유사한 UI 패턴 — 세로 타임라인 + 노드 타입별 표시
  - `design.md`: 색상 토큰, 간격 시스템, 모션 가이드 준수 필수

  **Acceptance Criteria**:

  - [ ] `app/components/revision/RevisionTimeline.tsx` 존재
  - [ ] `app/components/revision/RevisionDiffView.tsx` 존재
  - [ ] 빈 배열 전달 시 null 반환 (아무것도 렌더링 안 함)
  - [ ] `pnpm typecheck` → 0 errors
  - [ ] Quiet Depth 색상 토큰 사용 (하드코딩 색상 없음)

  **QA Scenarios**:

  ```
  Scenario: 타입 체크 통과
    Tool: Bash
    Steps:
      1. `pnpm typecheck` 실행
      2. RevisionTimeline.tsx, RevisionDiffView.tsx 관련 에러 0개
    Expected Result: 타입 에러 없음
    Evidence: .sisyphus/evidence/task-7-typecheck.txt

  Scenario: Quiet Depth 컬러 토큰 사용 확인
    Tool: Bash (grep)
    Steps:
      1. `grep -c "#[0-9a-fA-F]" app/components/revision/RevisionTimeline.tsx` 실행
      2. 결과 0 확인 (하드코딩 색상 없음)
      3. `grep -c "var(--color" app/components/revision/RevisionTimeline.tsx` 실행
      4. 1 이상 확인
    Expected Result: CSS 변수만 사용, 하드코딩 색상 없음
    Evidence: .sisyphus/evidence/task-7-color-tokens.txt
  ```

  **Commit**: YES
  - Message: `feat(ui): RevisionTimeline + RevisionDiffView 컴포넌트`
  - Files: `app/components/revision/RevisionTimeline.tsx`, `app/components/revision/RevisionDiffView.tsx`
  - Pre-commit: `pnpm typecheck`

- [x] 8. EditedIndicator "수정됨" 컴포넌트

  **What to do**:
  - `app/components/ui/EditedIndicator.tsx` 생성:
    - Props: `createdAt: number`, `updatedAt: number` (unix seconds)
    - `updatedAt > createdAt + 60` 일 때만 렌더링 (1분 이내 수정은 무시)
    - 표시: "수정됨" 텍스트 + 상대 시간 (예: "수정됨 · 2시간 전")
    - hover 시 tooltip으로 정확한 날짜/시간 표시
    - 스타일: text-tertiary, caption 크기 (12px), font-weight 500
    - inline으로 사용 가능 (span 기반)
  - Quiet Depth 준수: 조용하고 보조적인 정보 표시, 주의를 끌지 않는 디자인

  **Must NOT do**:
  - "수정됨" 아이콘/배지 과장 금지
  - 수정 횟수 표시 금지 (이 컴포넌트에서는)
  - 빨간/경고 색상 사용 금지

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: 작지만 디자인 가이드라인 준수가 중요한 UI 컴포넌트
  - **Skills**: [`frontend-design`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T5, T6, T7, T9)
  - **Blocks**: T12, T13
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `app/components/cards/SceneCard.tsx:130-145` — 날짜 메타데이터 표시 패턴
  - `app/lib/utils/date-groups.ts` — `formatRelativeTime()` 상대 시간 함수
  - `app/routes/public/logs/$recordSlug.tsx:615-617` — 기존 날짜 표시 코드

  **External References**:
  - `.docs/design.md` — Caption 스타일 (12px, 500, 1.5 line-height), text-tertiary 색상

  **WHY Each Reference Matters**:
  - `SceneCard.tsx`: 기존 날짜 표시와 일관성 유지
  - `formatRelativeTime()`: 상대 시간 표시 재사용

  **Acceptance Criteria**:

  - [ ] `app/components/ui/EditedIndicator.tsx` 존재
  - [ ] `updatedAt > createdAt + 60`일 때만 렌더링
  - [ ] `pnpm typecheck` → 0 errors

  **QA Scenarios**:

  ```
  Scenario: 타입 체크
    Tool: Bash
    Steps:
      1. `pnpm typecheck` 실행
      2. EditedIndicator.tsx 에러 없음
    Expected Result: 0 errors
    Evidence: .sisyphus/evidence/task-8-typecheck.txt
  ```

  **Commit**: YES
  - Message: `feat(ui): EditedIndicator 수정됨 뱃지 컴포넌트`
  - Files: `app/components/ui/EditedIndicator.tsx`
  - Pre-commit: `pnpm typecheck`

- [x] 9. Admin Audit 페이지 Record 변경 표시 개선

  **What to do**:
  - `app/routes/admin/audit.tsx`의 "상세" 컬럼 개선 (T4에서 기본 버그 수정 후):
    - `beforeState`/`afterState`가 모두 있으면 (update 이벤트):
      - `compareRecordStates()`로 변경 필드 계산
      - 각 변경 필드를 `formatFieldChange()`로 포매팅
      - 테이블 셀에 간결한 요약 표시: "제목, 공개 범위 변경" 형식
    - `afterState`만 있으면 (create 이벤트): "기록 생성"
    - `beforeState`만 있으면 (delete 이벤트): "기록 삭제"
    - 클릭 시 확장하여 필드별 old→new 표시 (disclosure/collapse 패턴)
  - `compareRecordStates`, `formatFieldChange`를 `record-diff.server.ts`에서 import
  - targetType이 "record"일 때만 diff 표시 (다른 타입은 기존 방식 유지)

  **Must NOT do**:
  - 전체 audit 페이지 리디자인 금지
  - Record 외 엔티티의 diff 표시 금지
  - 별도 모달/드로어 추가 금지

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 기존 페이지의 부분 개선, 명확한 범위
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T5, T6, T7, T8)
  - **Blocks**: —
  - **Blocked By**: T4, T3

  **References**:

  **Pattern References**:
  - `app/routes/admin/audit.tsx:66-187` — 현재 audit 컴포넌트 구조
  - `app/routes/admin/audit.tsx:46-54` — action 스타일 정의

  **API/Type References**:
  - `app/lib/utils/record-diff.server.ts` — `compareRecordStates()`, `formatFieldChange()` (T3에서 생성)
  - `app/db/schema.server.ts:276-285` — auditLogs 스키마

  **WHY Each Reference Matters**:
  - `audit.tsx`: 수정 대상 파일의 현재 구조
  - `record-diff`: diff 포매팅 함수 import

  **Acceptance Criteria**:

  - [ ] targetType "record" + action "update" → 변경 필드 요약 표시
  - [ ] targetType "record" + action "create" → "기록 생성" 표시
  - [ ] 클릭 확장 시 필드별 old→new 표시
  - [ ] Record 외 타입은 기존 방식 유지
  - [ ] `pnpm typecheck` → 0 errors

  **QA Scenarios**:

  ```
  Scenario: 타입 체크
    Tool: Bash
    Steps:
      1. `pnpm typecheck` 실행
      2. audit.tsx 에러 0개
    Expected Result: 타입 에러 없음
    Evidence: .sisyphus/evidence/task-9-typecheck.txt
  ```

  **Commit**: YES
  - Message: `feat(admin): audit 페이지 record 변경 표시 개선`
  - Files: `app/routes/admin/audit.tsx`
  - Pre-commit: `pnpm typecheck`

- [x] 10. updateRecord() 수정: 리비전 + Audit Log 생성 로직

  **What to do**:
  - `app/db/queries/records/records.server.ts`의 `updateRecord()` 함수 대폭 수정:
    1. **Pre-fetch**: 업데이트 전 현재 record 상태 조회
       ```typescript
       const [currentRecord] = await database.select().from(records)
         .where(and(eq(records.id, id), eq(records.authorId, authorId)));
       if (!currentRecord) throw new Error("Record not found");
       ```
    2. **Deep compare**: `hasActualChanges(currentRecord, data)` 호출
       - 변경 사항 없으면 바로 return (리비전/audit 생성 안 함)
    3. **Diff 계산**: `compareRecordStates(currentRecord, data)` 호출
       - `changedFields` 배열 추출
    4. **Latest revision number**: `getLatestRevisionNumber(d1, id)` 호출
    5. **Create revision**: `createRevision(d1, { recordId: id, authorId, revisionNumber: latest + 1, snapshot: currentRecord, changedFields, tagsSnapshot })` 호출
       - `tagsSnapshot`는 새 파라미터로 받음 (edit route에서 전달)
    6. **Create audit log**: `createAuditLog(d1, { actorId: authorId, targetType: "record", targetId: id, action: "update", beforeState: currentRecord, afterState: { ...currentRecord, ...data } })` 호출
    7. **Update**: 기존 `.update().set({ ...data, updatedAt }).where()` 실행
  - **시그니처 변경**:
    ```typescript
    export async function updateRecord(
      d1: D1Database,
      id: string,
      authorId: string,
      data: Partial<CreateRecordInput>,
      options?: {
        oldTags?: Array<{ id: string; name: string }>; // 수정 전 태그 목록
        newTags?: Array<{ id: string; name: string }>; // 수정 후 태그 목록
      }
    ): Promise<{ updated: boolean; revisionCreated: boolean }>
    ```
    - 반환값 변경: `{ updated: boolean, revisionCreated: boolean }`
    - `options.oldTags`: 수정 전 태그 (revision snapshot에 저장)
    - `options.newTags`: 수정 후 태그 (tag diff 감지에 사용)
  - **Tag-aware 변경 감지** (핵심):
    - `hasActualChanges(currentRecord, data)` 외에도 `computeTagDiff(oldTags, newTags)` 호출
    - record 필드 변경 없어도 태그가 변경되면 리비전 생성
    - `changedFields`에 "tags" 항목 추가 (태그 변경 시)
  - **에러 처리**: audit log/revision 실패가 record 업데이트를 막지 않음 (try-catch)
  - **테스트 추가/수정** (`app/db/queries/__tests__/records.test.ts`):
    - 필드 변경 있을 때: revision 생성됨, audit log 생성됨, record 업데이트됨
    - 태그만 변경 있을 때 (필드 동일): revision 생성됨 (changedFields에 "tags" 포함)
    - 변경 없을 때 (필드 + 태그 모두 동일): revision 미생성, audit log 미생성
    - revision/audit 실패 시: record 업데이트는 정상 진행

  **Must NOT do**:
  - `db.transaction()` 사용 금지
  - 기존 호출 측(edit route) 즉시 수정 금지 (T11에서 처리)
  - 리비전 복원 로직 금지

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: 기존 함수의 핵심 로직 변경, 여러 모듈 조합, 에러 핸들링 필요
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (T12, T13, T14, T15와 병렬)
  - **Parallel Group**: Wave 3 (T10→T11은 sequential)
  - **Blocks**: T11
  - **Blocked By**: T2, T3, T5

  **References**:

  **Pattern References**:
  - `app/db/queries/records/records.server.ts:130-142` — 현재 `updateRecord()` 전체 코드
  - `app/db/queries/records/records.server.ts:100-128` — `createRecord()` 패턴 (audit log 추가된 버전, T6)

  **API/Type References**:
  - `app/db/queries/records/revisions.server.ts` — `createRevision()`, `getLatestRevisionNumber()` (T5)
  - `app/db/queries/admin/insights/audit-helpers.server.ts` — `createAuditLog()` (T2)
  - `app/lib/utils/record-diff.server.ts` — `hasActualChanges()`, `compareRecordStates()` (T3)
  - `app/lib/auth/validation.ts:3-47` — `CreateRecordInput` 타입

  **WHY Each Reference Matters**:
  - 현재 `updateRecord()`: 수정 대상 함수의 정확한 구조
  - `createRevision()`: 리비전 생성 함수의 시그니처
  - `hasActualChanges()`: 동일 데이터 제출 감지 로직

  **Acceptance Criteria**:

  - [ ] 변경 있는 업데이트 → revision 생성됨 + audit log 생성됨
  - [ ] 변경 없는 업데이트 → revision 미생성 + audit log 미생성
  - [ ] revision/audit 실패 → record 업데이트는 정상 진행
  - [ ] `pnpm test` → 모든 테스트 통과 (기존 + 신규)

  **QA Scenarios**:

  ```
  Scenario: updateRecord 리비전 생성 통합 테스트
    Tool: Bash
    Steps:
      1. `pnpm test app/db/queries/__tests__/records.test.ts` 실행
      2. "updateRecord" describe 블록 모든 테스트 통과
      3. "revision created" 테스트 PASS
      4. "no revision on identical data" 테스트 PASS
      5. "audit log failure does not block update" 테스트 PASS
    Expected Result: 모든 시나리오 통과
    Evidence: .sisyphus/evidence/task-10-unit-tests.txt

  Scenario: 동일 데이터 제출 시 리비전 미생성
    Tool: Bash
    Steps:
      1. 테스트에서 현재 record와 동일한 data로 updateRecord 호출
      2. createRevision mock이 호출되지 않았는지 확인
      3. 반환값 { updated: false, revisionCreated: false } 확인
    Expected Result: 리비전 생성 안 됨
    Evidence: .sisyphus/evidence/task-10-no-revision.txt
  ```

  **Commit**: YES
  - Message: `feat(db): updateRecord에 리비전 + audit log 생성 로직 추가`
  - Files: `app/db/queries/records/records.server.ts`, `app/db/queries/__tests__/records.test.ts`
  - Pre-commit: `pnpm test`

- [x] 11. $recordSlug.edit.tsx Action 수정: 리비전 Context 전달

  **What to do**:
  - `app/routes/public/logs/$recordSlug.edit.tsx`의 action 수정:
    1. 기존 `getRecordBySlug()` 호출 결과에서 현재 태그 목록 조회 추가:
       ```typescript
       const currentTags = await getTagsByRecord(context.cloudflare.env.DB, recordData.record.id);
       const tagsSnapshot = currentTags.map(t => ({ id: t.id, name: t.name }));
       ```
    2. 수정 후 태그 목록 구성:
       ```typescript
       const newTagIds = formData.getAll("tagIds") as string[];
       const newTags = allTags.filter(t => newTagIds.includes(t.id)).map(t => ({ id: t.id, name: t.name }));
       ```
    3. `updateRecord()` 호출 시 `options.oldTags`/`options.newTags` 전달:
       ```typescript
       const result = await updateRecord(context.cloudflare.env.DB, recordData.record.id, auth.user.id, {
         ...parsedData,
       }, { oldTags: tagsSnapshot, newTags });
       ```
    4. 기존 태그 sync 로직은 그대로 유지 (updateRecord 이후 실행)
    5. 반환값 활용: `result.revisionCreated` 로깅 가능 (optional)
  - `getTagsByRecord` import 확인 (이미 loader에서 사용 중일 수 있음)

  **Must NOT do**:
  - Loader 수정 금지 (이 태스크에서는 action만)
  - 태그 sync 로직 변경 금지
  - 새 UI 요소 추가 금지

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 기존 route action의 인자 전달 수정, 작은 변경
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO (T10 이후 sequential)
  - **Parallel Group**: Wave 3 (T10 이후)
  - **Blocks**: —
  - **Blocked By**: T10

  **References**:

  **Pattern References**:
  - `app/routes/public/logs/$recordSlug.edit.tsx:82-201` — 현재 action 전체 코드
  - `app/routes/public/logs/$recordSlug.edit.tsx:187-198` — 태그 sync 로직
  - `app/db/queries/records/tags.server.ts` — `getTagsByRecord()` 함수

  **API/Type References**:
  - `app/db/queries/records/records.server.ts` — 수정된 `updateRecord()` 시그니처 (T10)

  **WHY Each Reference Matters**:
  - 현재 action 코드: 수정 위치와 기존 로직 파악
  - 태그 쿼리: tagsSnapshot 생성에 필요한 함수

  **Acceptance Criteria**:

  - [ ] `updateRecord()` 호출 시 `tagsSnapshot` 옵션 전달
  - [ ] 기존 태그 sync 로직 변경 없음
  - [ ] `pnpm typecheck` → 0 errors

  **QA Scenarios**:

  ```
  Scenario: 타입 체크
    Tool: Bash
    Steps:
      1. `pnpm typecheck` 실행
      2. $recordSlug.edit.tsx 관련 에러 0개
    Expected Result: 0 errors
    Evidence: .sisyphus/evidence/task-11-typecheck.txt
  ```

  **Commit**: YES
  - Message: `feat(route): 기록 수정 action에 리비전 context 전달`
  - Files: `app/routes/public/logs/$recordSlug.edit.tsx`
  - Pre-commit: `pnpm typecheck`

- [x] 12. $recordSlug.tsx: 리비전 타임라인 통합 (Author/Admin Only)

  **What to do**:
  - `app/routes/public/logs/$recordSlug.tsx` loader 수정:
    1. `getRevisionsByRecord(d1, recordId)` 호출 추가
    2. `getRevisionCount(d1, recordId)` 호출 추가
    3. 현재 사용자가 작성자인지 확인: `currentUserId === record.authorId`
    4. 현재 사용자가 Admin인지 확인: userRole 체크 (Admin layout에서 role 정보 전달 방식 확인)
    5. 작성자 또는 Admin인 경우에만 revisions 데이터 반환, 아니면 빈 배열
    ```typescript
    const isAuthorOrAdmin = currentUserId === record.authorId || userRole === 'admin';
    const revisions = isAuthorOrAdmin ? await getRevisionsByRecord(d1, record.id) : [];
    const revisionCount = isAuthorOrAdmin ? await getRevisionCount(d1, record.id) : 0;
    ```
  - `$recordSlug.tsx` 컴포넌트 수정:
    1. Header metadata 영역 (line ~615-617)에 `EditedIndicator` 추가:
       - 기존 `createdAt` 날짜 옆에 표시
       - `updatedAt > createdAt + 60`일 때만 렌더링
    2. Content 섹션 아래, Responses 섹션 위에 `RevisionTimeline` 배치:
       - `revisionCount > 0`일 때만 렌더링
       - 섹션 제목: "수정 이력" (Section Title 스타일, 22-28px, weight 600)
       - 접이식(disclosure) 패턴: 기본 접힌 상태, 클릭 시 펼침
       - `<details>` + `<summary>` 또는 state 기반 toggle
    3. RevisionTimeline에 `revisions`, `currentRecord` (현재 record 상태), `currentTags` (현재 태그 목록) 전달
       - `currentRecord`: loader에서 이미 로드하는 `record` 객체 사용
       - `currentTags`: loader에서 이미 로드하는 `tags` 배열 사용
    4. RevisionTimeline이 내부에서 per-revision afterState를 계산하여 RevisionDiffView에 전달

  **Must NOT do**:
  - 비작성자/비Admin에게 리비전 데이터 노출 금지
  - 리비전 타임라인이 콘텐츠 읽기 경험을 방해하지 않도록 (접이식)
  - 로딩 상태 과도한 표시 금지

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: 기존 페이지에 UI 섹션 통합, 조건부 렌더링, 디자인 일관성
  - **Skills**: [`frontend-design`]
    - `frontend-design`: Quiet Depth 가이드라인에 맞는 섹션 통합

  **Parallelization**:
  - **Can Run In Parallel**: YES (T10/T11과 병렬 가능)
  - **Parallel Group**: Wave 3 (T5, T7, T8에만 의존)
  - **Blocks**: —
  - **Blocked By**: T5, T7, T8

  **References**:

  **Pattern References**:
  - `app/routes/public/logs/$recordSlug.tsx:578-628` — Header 섹션 (EditedIndicator 배치 위치)
  - `app/routes/public/logs/$recordSlug.tsx:630-926` — Main content 영역 (RevisionTimeline 배치 위치)
  - `app/routes/public/logs/$recordSlug.tsx:160-174` — Loader 반환 shape
  - `app/routes/public/logs/$recordSlug.tsx:615-617` — 기존 날짜 표시 코드

  **API/Type References**:
  - `app/db/queries/records/revisions.server.ts` — `getRevisionsByRecord()`, `getRevisionCount()` (T5)
  - `app/components/revision/RevisionTimeline.tsx` — RevisionTimeline props (T7)
  - `app/components/ui/EditedIndicator.tsx` — EditedIndicator props (T8)

  **External References**:
  - `.docs/design.md` — Section Title 스타일 (22-28px, weight 600), 간격 시스템

  **WHY Each Reference Matters**:
  - `$recordSlug.tsx`: 수정 대상 페이지의 정확한 구조와 삽입 위치
  - `RevisionTimeline`: 통합할 컴포넌트의 인터페이스

  **Acceptance Criteria**:

  - [ ] Loader에서 revisions 데이터 로드 (작성자/Admin만)
  - [ ] Header에 EditedIndicator 표시 (updatedAt > createdAt + 60일 때)
  - [ ] Content 아래에 RevisionTimeline 렌더링 (revisionCount > 0일 때)
  - [ ] 접이식(disclosure) 패턴 적용
  - [ ] 비작성자/비Admin → revisions 빈 배열
  - [ ] `pnpm typecheck` → 0 errors

  **QA Scenarios**:

  ```
  Scenario: 작성자로 기록 상세 페이지 접근
    Tool: Playwright (playwright skill)
    Preconditions: 로컬 dev 서버 실행 중, 수정된 기록 존재 (seed 데이터 + 직접 수정)
    Steps:
      1. `loginAsVerifiedUser(page)` 호출 (`tests/e2e/helpers/auth.ts:5`)
         — `adakrpos_session` 쿠키를 `process.env.TEST_VERIFIED_SESSION` 값으로 설정
         — `.dev.vars`의 `TEST_VERIFIED_SESSION` 환경변수 필요
      2. `/logs/{testRecordSlug}` 페이지 탐색
      3. DOM에 "수정됨" 텍스트 존재 확인 (`page.getByText('수정됨')`)
      4. "수정 이력" 텍스트 존재 확인 (`page.getByText('수정 이력')`)
      5. 접이식 toggle 클릭 (`page.getByText('수정 이력').click()`)
      6. 리비전 항목 1개 이상 존재 확인 (`page.locator('[data-testid="revision-item"]').count() >= 1`)
         — T7의 RevisionTimeline에서 각 리비전 항목에 `data-testid="revision-item"` 추가 필요
    Expected Result: 수정 이력 타임라인 정상 표시
    Failure Indicators: "수정됨" 미표시, 빈 타임라인, 인증 실패
    Evidence: .sisyphus/evidence/task-12-author-view.png

  Scenario: 비작성자로 기록 상세 페이지 접근 (인증 없는 상태)
    Tool: Playwright (playwright skill)
    Preconditions: 로컬 dev 서버 실행 중, adakrpos_session 쿠키 미설정
    Steps:
      1. 쿠키 설정하지 않고 `/logs/{testRecordSlug}` 페이지 탐색
      2. "수정 이력" 텍스트 부재 확인 (`await expect(page.getByText('수정 이력')).not.toBeVisible()`)
    Expected Result: 수정 이력 타임라인 미표시
    Evidence: .sisyphus/evidence/task-12-non-author-view.png
  ```

  **Commit**: YES
  - Message: `feat(route): 기록 상세 페이지 리비전 타임라인 통합`
  - Files: `app/routes/public/logs/$recordSlug.tsx`
  - Pre-commit: `pnpm typecheck`

- [x] 13. SceneCard/메타데이터에 "수정됨" 표시

  **What to do**:
  - `app/components/cards/SceneCard.tsx` 수정:
    - 기존 날짜 표시 영역에 `EditedIndicator` 추가
    - Props에 `updatedAt`이 이미 있는지 확인 (record에서 전달되면 사용)
    - `createdAt`과 `updatedAt`을 비교하여 표시
    - 레이아웃: 날짜 텍스트 옆에 " · 수정됨" 형태
  - `app/routes/public/logs/$recordSlug.tsx` Header 영역에서도 확인:
    - T12에서 EditedIndicator 추가했으므로, 기존 날짜 표시와 겹치지 않는지 확인
    - 필요 시 위치 조정

  **Must NOT do**:
  - SceneCard의 기존 레이아웃 파괴 금지
  - "수정됨" 표시가 카드 내 다른 요소를 밀어내지 않도록

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 기존 컴포넌트에 작은 요소 추가
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with T10, T12, T14, T15)
  - **Blocks**: —
  - **Blocked By**: T8

  **References**:

  **Pattern References**:
  - `app/components/cards/SceneCard.tsx:130-163` — 현재 메타데이터 영역 구조
  - `app/components/ui/EditedIndicator.tsx` — EditedIndicator 컴포넌트 (T8)

  **WHY Each Reference Matters**:
  - `SceneCard.tsx`: 수정 대상, 기존 날짜 표시 위치 확인

  **Acceptance Criteria**:

  - [ ] SceneCard에서 수정된 기록은 "수정됨" 표시
  - [ ] 수정되지 않은 기록은 "수정됨" 미표시
  - [ ] 기존 레이아웃 유지
  - [ ] `pnpm typecheck` → 0 errors

  **QA Scenarios**:

  ```
  Scenario: SceneCard 수정됨 표시
    Tool: Playwright (playwright skill)
    Preconditions: 로컬 dev 서버 실행 중, seed 데이터에 수정된/수정 안 된 기록 모두 존재
    Steps:
      1. `/logs` 페이지 탐색 (인증 불필요 — 공개 페이지)
      2. `page.locator('[data-testid="scene-card"]').filter({ hasText: '수정됨' }).count()` ≥ 1 확인
         — 기존 SceneCard.tsx:70에 `data-testid="scene-card"` 이미 존재
      3. 수정되지 않은 기록 카드에 "수정됨" 미표시 확인
    Expected Result: updatedAt > createdAt + 60인 카드만 "수정됨" 표시
    Evidence: .sisyphus/evidence/task-13-scenecards.png
  ```

  **Commit**: YES
  - Message: `feat(ui): SceneCard/메타데이터에 수정됨 표시 추가`
  - Files: `app/components/cards/SceneCard.tsx`
  - Pre-commit: `pnpm typecheck`

- [x] 14. Admin 기록 상세: 리비전 히스토리 섹션

  **What to do**:
  - `app/routes/admin/records/$recordId.tsx` loader 수정:
    1. `getRevisionsByRecord(d1, recordId)` 호출 추가
    2. `getRevisionCount(d1, recordId)` 호출 추가
    3. 반환 데이터에 `revisions`, `revisionCount` 추가
  - 컴포넌트 수정:
    1. Moderation 폼 위에 "수정 이력" 섹션 추가
    2. `revisionCount > 0`일 때만 표시
    3. `RevisionTimeline` + `RevisionDiffView` 사용
    4. Admin은 항상 접근 가능 (권한 체크 불필요 — Admin layout에서 이미 처리)
    5. 기본 펼친 상태 (Admin은 정보 밀도가 높은 UI)
  - Admin 디자인 원칙 준수: compact 여백, neutral 톤

  **Must NOT do**:
  - 리비전 편집/삭제 UI 금지
  - Public 페이지와 동일한 넉넉한 여백 금지 (Admin은 compact)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Admin UI 통합, 디자인 원칙 차이 반영
  - **Skills**: [`frontend-design`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with T10, T12, T13, T15)
  - **Blocks**: —
  - **Blocked By**: T5, T7

  **References**:

  **Pattern References**:
  - `app/routes/admin/records/$recordId.tsx:12-57` — Admin loader 구조
  - `app/routes/admin/records/$recordId.tsx:104-266` — Admin 컴포넌트 섹션 구조
  - `.docs/admin.md` — Admin 디자인 원칙 (compact, dense, neutral)

  **API/Type References**:
  - `app/db/queries/records/revisions.server.ts` — 리비전 쿼리 함수 (T5)
  - `app/components/revision/RevisionTimeline.tsx` — 타임라인 컴포넌트 (T7)

  **WHY Each Reference Matters**:
  - Admin record detail: 수정 대상 페이지와 기존 섹션 구조
  - Admin 디자인 원칙: Public과 다른 compact 스타일 적용

  **Acceptance Criteria**:

  - [ ] Admin 기록 상세에 "수정 이력" 섹션 존재
  - [ ] 리비전 없으면 섹션 미표시
  - [ ] Admin compact 스타일 적용
  - [ ] `pnpm typecheck` → 0 errors

  **QA Scenarios**:

  ```
  Scenario: Admin 리비전 히스토리 표시
    Tool: Playwright (playwright skill)
    Preconditions: 로컬 dev 서버 실행 중, 수정된 기록 존재
    Steps:
      1. `loginAsAdmin(page)` 호출 (`tests/e2e/helpers/auth.ts:16`)
         — `adakrpos_session` 쿠키를 `process.env.TEST_ADMIN_SESSION` 값으로 설정
      2. `/admin/records/{testRecordId}` 페이지 탐색
      3. "수정 이력" 텍스트 존재 확인 (`page.getByText('수정 이력')`)
      4. 리비전 항목 1개 이상 표시 확인 (`page.locator('[data-testid="revision-item"]').count() >= 1`)
    Expected Result: Admin에서 리비전 정상 표시
    Failure Indicators: "수정 이력" 미표시, 인증 실패, 403 에러
    Evidence: .sisyphus/evidence/task-14-admin-revisions.png
  ```

  **Commit**: YES
  - Message: `feat(admin): 기록 상세에 리비전 히스토리 섹션 추가`
  - Files: `app/routes/admin/records/$recordId.tsx`
  - Pre-commit: `pnpm typecheck`

- [x] 15. Admin Audit 페이지: Record Diff 인라인 표시

  **What to do**:
  - T9에서 개선한 audit 페이지에 추가 개선:
    - targetType "record" 항목의 "상세" 컬럼에서:
      - 확장 시 `RevisionDiffView` 컴포넌트 활용하여 필드별 diff 표시
      - `beforeState`/`afterState` JSON.parse → `compareRecordStates` → `formatFieldChange`
    - 다른 targetType은 `beforeState`/`afterState`를 축약된 JSON으로 표시
  - UI 마무리:
    - 확장/접기 아이콘 (chevron down/up)
    - 확장 시 subtle 배경색 (`var(--color-surface-secondary)`)

  **Must NOT do**:
  - Record 외 엔티티의 diff 분석 금지 (JSON raw 표시만)
  - 모달/드로어 추가 금지
  - 전체 리디자인 금지

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: T9에서 대부분 구현, 마무리 개선
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with T10, T12, T13, T14)
  - **Blocks**: —
  - **Blocked By**: T4, T3

  **References**:

  **Pattern References**:
  - `app/routes/admin/audit.tsx` — T9에서 개선된 상태의 audit 페이지
  - `app/components/revision/RevisionDiffView.tsx` — Diff 표시 컴포넌트 (T7)

  **API/Type References**:
  - `app/lib/utils/record-diff.server.ts` — diff 유틸리티 (T3)

  **WHY Each Reference Matters**:
  - audit.tsx: T9 이후 상태에서 추가 개선
  - RevisionDiffView: 재사용할 diff 표시 컴포넌트

  **Acceptance Criteria**:

  - [ ] Record 타입 audit 항목 확장 시 필드별 diff 표시
  - [ ] 비-Record 타입은 JSON raw 표시
  - [ ] 확장/접기 동작 정상
  - [ ] `pnpm typecheck` → 0 errors

  **QA Scenarios**:

  ```
  Scenario: Audit 페이지 record diff 인라인
    Tool: Playwright (playwright skill)
    Preconditions: 로컬 dev 서버 실행 중, audit_logs에 record update 항목 존재
    Steps:
      1. `loginAsAdmin(page)` 호출 (`tests/e2e/helpers/auth.ts:16`)
      2. `/admin/audit` 페이지 탐색
      3. `page.locator('td').filter({ hasText: 'record' }).first()` 존재 확인
      4. 해당 행의 상세 컬럼 클릭하여 확장
      5. 필드별 변경 내역 텍스트 존재 확인 (`page.getByText('→').count() >= 1`)
    Expected Result: diff 인라인 정상 표시, 필드별 old→new 확인 가능
    Failure Indicators: 확장 안 됨, diff 미표시, JSON raw 표시
    Evidence: .sisyphus/evidence/task-15-audit-diff.png
  ```

  **Commit**: YES
  - Message: `feat(admin): audit 페이지 record diff 인라인 표시`
  - Files: `app/routes/admin/audit.tsx`
  - Pre-commit: `pnpm typecheck`

---

## Final Verification Wave

- [x] F1. **Plan Compliance Audit** — `deep` (invoke oracle via `subagent_type="oracle"`)
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [x] F2. **Code Quality Review** — `unspecified-high`
  Run `pnpm typecheck` + `pnpm test`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names (data/result/item/temp). Verify STRICT table in migration. Verify nanoid for PKs. Verify unix epoch seconds (not ms).
  Output: `Build [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [x] F3. **Real QA** — `unspecified-high` (+ `playwright` skill)
  Start from clean state (apply migration + seed). **Auth setup**: Use `loginAsVerifiedUser(page)` from `tests/e2e/helpers/auth.ts:5` for author tests, `loginAsAdmin(page)` from `tests/e2e/helpers/auth.ts:16` for admin tests. Requires `.dev.vars` env vars: `TEST_VERIFIED_SESSION`, `TEST_ADMIN_SESSION`. Execute EVERY QA scenario from EVERY task. Test cross-task integration: edit record → verify revision created → view timeline → verify diff correct. Test edge cases: submit identical data, empty revision timeline, non-author access. Save to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [x] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff. Verify 1:1. Check "Must NOT do" compliance. Detect: rich diff rendering, transaction usage, non-record audit logging, details.tsx revision creation. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

| # | Message | Files | Pre-commit |
|---|---------|-------|------------|
| 1 | `feat(db): record_revisions 테이블 스키마 + 마이그레이션 0007` | schema.server.ts, relations.server.ts, 0007_*.sql | `pnpm typecheck` |
| 2 | `feat(audit): createAuditLog 유틸리티 함수 추가` | audit-helpers.server.ts, audit-helpers.test.ts | `pnpm test` |
| 3 | `feat(utils): record diff 유틸리티 함수 추가` | record-diff.server.ts, record-diff.test.ts | `pnpm test` |
| 4 | `fix(admin): audit.tsx log.details → beforeState/afterState 수정` | audit.tsx | `pnpm typecheck` |
| 5 | `feat(db): revision 쿼리 함수 추가` | revisions.server.ts, revisions.test.ts | `pnpm test` |
| 6 | `feat(audit): createRecord audit logging 추가` | records.server.ts, records.test.ts | `pnpm test` |
| 7 | `feat(ui): RevisionTimeline + RevisionDiffView 컴포넌트` | RevisionTimeline.tsx, RevisionDiffView.tsx | `pnpm typecheck` |
| 8 | `feat(ui): EditedIndicator 수정됨 뱃지 컴포넌트` | EditedIndicator.tsx | `pnpm typecheck` |
| 9 | `feat(admin): audit 페이지 record 변경 표시 개선` | audit.tsx | `pnpm typecheck` |
| 10 | `feat(db): updateRecord에 리비전 + audit log 생성 로직 추가` | records.server.ts, records.test.ts | `pnpm test` |
| 11 | `feat(route): 기록 수정 action에 리비전 context 전달` | $recordSlug.edit.tsx | `pnpm typecheck` |
| 12 | `feat(route): 기록 상세 페이지 리비전 타임라인 통합` | $recordSlug.tsx | `pnpm typecheck` |
| 13 | `feat(ui): SceneCard/메타데이터에 수정됨 표시 추가` | SceneCard.tsx, $recordSlug.tsx | `pnpm typecheck` |
| 14 | `feat(admin): 기록 상세에 리비전 히스토리 섹션 추가` | $recordId.tsx | `pnpm typecheck` |
| 15 | `feat(admin): audit 페이지 record diff 인라인 표시` | audit.tsx | `pnpm typecheck` |

---

## Success Criteria

### Verification Commands
```bash
pnpm typecheck                              # Expected: 0 errors
pnpm test                                   # Expected: all pass (existing + new)
wrangler d1 migrations apply DB --local     # Expected: Migration 0007 applied
wrangler d1 execute DB --local --file=seeds/seed.sql  # Expected: Seed succeeds
```

### Final Checklist
- [ ] record_revisions 테이블 생성됨 (STRICT)
- [ ] 기록 수정 → revision 행 생성됨
- [ ] 동일 데이터 제출 → revision 미생성
- [ ] 작성자로 기록 상세 → 수정 타임라인 보임
- [ ] 비작성자/비로그인 → 수정 타임라인 안 보임
- [ ] Admin 기록 상세 → 리비전 히스토리 보임
- [ ] audit_logs에 record create/update 기록됨
- [ ] audit.tsx에서 beforeState/afterState 정상 렌더링
- [ ] "수정됨" 뱃지 표시됨 (updatedAt > createdAt 일 때)
- [ ] Rich diff 렌더링 없음 (Must NOT)
- [ ] details.tsx 변경에 대한 리비전 없음 (Must NOT)
- [ ] `as any` / `@ts-ignore` 없음 (Must NOT)
