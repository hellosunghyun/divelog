# 아티클 읽음 표시 (Read Tracking)

## TL;DR

> **Quick Summary**: 아티클(article) 형식 글에 읽음 추적 기능을 추가한다. 상세 페이지에서 5초 이상 체류하면 읽음 처리되며, 목록에서 읽은 글은 opacity가 낮아져 시각적으로 구분된다. 비로그인은 localStorage, 로그인은 DB에 저장하며 로그인 시 동기화한다.
> 
> **Deliverables**:
> - `record_reads` DB 테이블 + 마이그레이션
> - `recordReads.server.ts` 쿼리 모듈 + 테스트
> - `read-storage.ts` localStorage 유틸 + 테스트
> - `/api/track-read` API 엔드포인트
> - `useReadTracking` 훅 + 테스트
> - SceneCard `isRead` prop + opacity 디밍
> - 상세 페이지 읽음 추적 통합
> - `/logs` 목록 페이지 읽음 상태 표시
> - 설정 페이지 읽음 초기화 기능
> 
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: Task 1 → Task 2 → Task 5 → Task 7 → Task 8 → Task 9

---

## Context

### Original Request
아티클 류 글 중에 이미 읽은 글은 표시됐으면 좋겠다. 다른 글보다 연하게 보이고. 5초 이상 봤을 때 본 걸로. 그리고 메모류의 글들 본 걸 어떻게 알고리즘화할지도 고민.

### Interview Summary
**Key Discussions**:
- 노트 vs 아티클: 노트는 짧아서 "읽음" 개념이 안 맞음 → **아티클만 추적**
- 읽음 판정: 상세 페이지 mount 후 5초 setTimeout (visibility-based 아님)
- 저장 전략: 로그인 → DB, 비로그인 → localStorage, 로그인 직후 1회 동기화
- 본인 글: 작성 시점 자동 읽음 처리
- 시각적: SceneCard opacity 60~70%로 디밍
- 초기화: 개별(상세 페이지) + 전체(설정 페이지)
- 테스트: vitest 포함 (savedRecords.test.ts 패턴)

**Research Findings**:
- `saved_records` 테이블이 동일 패턴의 junction table → 복제 가능
- SceneCard가 10개 라우트에서 사용됨 → 클라이언트 사이드 resolve 필요
- `draft-storage.ts`가 localStorage 유틸 패턴 제공
- `clientLoader` 캐시가 일부 페이지에 존재 (상세 페이지)
- `_public.tsx` 레이아웃에서 auth 정보 제공 → `useRouteLoaderData`로 접근 가능

### Metis Review
**Identified Gaps** (addressed):
- SceneCard 10개 사용처 스코프 → Wave 1은 `/logs/index.tsx`만, 나머지는 후속
- mark_read auth 수준 → `getOptionalUser` 사용 (requireVerified 아님)
- localStorage 무한 증가 → TTL/크기 제한 추가
- useEffect cleanup → clearTimeout 필수
- 서버 로더 수정 10개 회피 → 클라이언트 사이드 resolve 아키텍처 채택
- 본인 글 읽음 시점 → 작성 action에서 자동 insert

---

## Work Objectives

### Core Objective
아티클을 읽으면 목록에서 연하게 표시되어, 아직 안 읽은 글을 쉽게 발견할 수 있게 한다.

### Concrete Deliverables
- DB: `record_reads` 테이블 (migration 0007)
- Server: `app/db/queries/records/recordReads.server.ts`
- Server: `app/routes/api/track-read.tsx`
- Client: `app/lib/infra/read-storage.ts`
- Client: `app/hooks/useReadTracking.ts`
- Client: `app/hooks/useReadState.ts`
- UI: SceneCard `isRead` prop 추가
- Route: `/logs/index.tsx` 읽음 상태 통합
- Route: `/logs/$recordSlug.tsx` 5초 타이머 통합
- Route: `/settings.tsx` 읽음 초기화 action
- Test: `recordReads.test.ts`, `read-storage.test.ts`

### Definition of Done
- [ ] `pnpm test` 전체 통과
- [ ] `tsc --noEmit` 타입 에러 없음
- [ ] 아티클 상세 5초 체류 → DB/localStorage에 읽음 기록
- [ ] `/logs` 목록에서 읽은 아티클 opacity 디밍 확인
- [ ] 노트는 절대 디밍되지 않음
- [ ] 설정에서 전체 초기화 동작

### Must Have
- 아티클 format만 읽음 추적 (노트 제외)
- 5초 타이머 useEffect cleanup (clearTimeout)
- localStorage → DB 로그인 동기화
- 개별/전체 읽음 초기화
- 본인 글 작성 시 자동 읽음

### Must NOT Have (Guardrails)
- 좋아요, 추천, 인기순 등 경쟁 지표
- 읽음 횟수, 읽은 사람 수 등 통계 노출
- "안 읽은 글 N개" 뱃지/카운터
- 노트 읽음 추적
- TimelineView 읽음 디밍 (SceneCard만)
- 서버 로더 10개 수정 (클라이언트 사이드 resolve)
- `/api/track-read`에 `requireVerified` 사용 (getOptionalUser만)
- draft 상태 기록 읽음 추적
- Rich interaction (confetti, 체크마크 애니메이션 등)

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: YES (vitest, 17개 테스트 파일)
- **Automated tests**: Tests-after (구현 후 테스트)
- **Framework**: vitest

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **DB 쿼리 모듈**: vitest 단위 테스트
- **localStorage 유틸**: vitest + localStorage mock
- **API 엔드포인트**: `tsc --noEmit` + vitest
- **UI 통합**: Playwright (playwright skill)

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — foundation):
├── Task 1: record_reads DB 테이블 스키마 + 마이그레이션 [quick]
├── Task 2: recordReads 쿼리 모듈 + 테스트 [quick]  (depends: 1)
├── Task 3: read-storage localStorage 유틸 + 테스트 [quick]
└── Task 4: SceneCard isRead prop + opacity 디밍 [quick]

Wave 2 (After Wave 1 — API + hooks):
├── Task 5: /api/track-read API 엔드포인트 [quick]  (depends: 2)
├── Task 6: useReadTracking 훅 (5초 타이머) [unspecified-high]  (depends: 3, 5)
└── Task 7: useReadState 훅 (목록용 읽음 상태) [unspecified-high]  (depends: 3, 5)

Wave 3 (After Wave 2 — integration):
├── Task 8: 상세 페이지 읽음 추적 통합 [unspecified-high]  (depends: 6)
├── Task 9: /logs 목록 페이지 읽음 상태 통합 [unspecified-high]  (depends: 4, 7)
├── Task 10: 기록 작성 시 자동 읽음 처리 [quick]  (depends: 2)
└── Task 11: 설정 페이지 읽음 초기화 [quick]  (depends: 2)

Wave FINAL (After ALL tasks — verification):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real manual QA (unspecified-high)
└── Task F4: Scope fidelity check (deep)

Critical Path: Task 1 → Task 2 → Task 5 → Task 6 → Task 8
Parallel Speedup: ~60% faster than sequential
Max Concurrent: 4 (Wave 1)
```

### Dependency Matrix

| Task | Blocked By | Blocks |
|------|-----------|--------|
| 1 | — | 2 |
| 2 | 1 | 5, 10, 11 |
| 3 | — | 6, 7 |
| 4 | — | 9 |
| 5 | 2 | 6, 7 |
| 6 | 3, 5 | 8 |
| 7 | 3, 5 | 9 |
| 8 | 6 | F1-F4 |
| 9 | 4, 7 | F1-F4 |
| 10 | 2 | F1-F4 |
| 11 | 2 | F1-F4 |

### Agent Dispatch Summary

- **Wave 1**: **4** — T1 → `quick`, T2 → `quick`, T3 → `quick`, T4 → `quick`
- **Wave 2**: **3** — T5 → `quick`, T6 → `unspecified-high`, T7 → `unspecified-high`
- **Wave 3**: **4** — T8 → `unspecified-high`, T9 → `unspecified-high`, T10 → `quick`, T11 → `quick`
- **FINAL**: **4** — F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `deep`

---

## TODOs

- [x] 1. record_reads DB 테이블 스키마 + 마이그레이션

  **What to do**:
  - `app/db/schema.server.ts`에 `recordReads` 테이블 추가:
    - `learnerId: text("learner_id").notNull().references(() => learnerProfiles.userId, { onDelete: "cascade" })`
    - `recordId: text("record_id").notNull().references(() => records.id, { onDelete: "cascade" })`
    - `readAt: integer("read_at").notNull().default(now())`
    - Composite PK: `primaryKey({ columns: [table.learnerId, table.recordId] })`
  - `app/db/relations.server.ts`에 `recordReadsRelations` 추가 (learner ↔ record)
  - `drizzle/migrations/0007_add_record_reads.sql` 생성:
    ```sql
    CREATE TABLE record_reads (
      learner_id TEXT NOT NULL REFERENCES learner_profiles(user_id) ON DELETE CASCADE,
      record_id TEXT NOT NULL REFERENCES records(id) ON DELETE CASCADE,
      read_at INTEGER NOT NULL DEFAULT (unixepoch()),
      PRIMARY KEY (learner_id, record_id)
    ) STRICT;
    CREATE INDEX idx_record_reads_learner ON record_reads(learner_id);
    ```

  **Must NOT do**:
  - `read_duration_seconds` 같은 추가 컬럼 만들지 않음 (YAGNI)
  - 별도 `id` PK 만들지 않음 (composite PK만)
  - view_count 등 통계 컬럼 추가하지 않음

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 단일 테이블 추가, 기존 패턴 복제. 파일 3개.
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `frontend-design`: DB 스키마 작업이므로 불필요

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 3, 4)
  - **Blocks**: Task 2
  - **Blocked By**: None

  **References**:

  **Pattern References** (existing code to follow):
  - `app/db/schema.server.ts:413-425` — `savedRecords` 테이블 정의. 동일한 composite PK 패턴, `learnerId`/`recordId` FK 참조 방식, `ON DELETE CASCADE` 사용 확인
  - `app/db/relations.server.ts` — `savedRecordsRelations` 정의. `one()` 관계로 learner ↔ record 연결하는 패턴

  **API/Type References**:
  - `app/db/schema.server.ts:98-124` — `records` 테이블. `recordId` FK 대상
  - `app/db/schema.server.ts:15-30` (추정) — `learnerProfiles` 테이블. `learnerId` FK 대상

  **Test References**:
  - `drizzle/migrations/0005_ux_reflection_overhaul.sql` — `saved_records` CREATE TABLE 구문. STRICT, unixepoch() default, CASCADE 패턴 확인

  **WHY Each Reference Matters**:
  - `savedRecords` 스키마: 완전히 동일한 구조이므로 칼럼명, FK 패턴, index 방식을 그대로 복제
  - `relations.server.ts`: 양방향 관계 정의 패턴 확인
  - migration 0005: SQL 문법과 STRICT 테이블 선언 방식 확인

  **Acceptance Criteria**:

  - [ ] `tsc --noEmit` 통과
  - [ ] `app/db/schema.server.ts`에 `recordReads` export 존재
  - [ ] `app/db/relations.server.ts`에 `recordReadsRelations` export 존재
  - [ ] `drizzle/migrations/0007_add_record_reads.sql` 파일 존재
  - [ ] migration SQL이 STRICT 테이블로 선언됨

  **QA Scenarios:**

  ```
  Scenario: 마이그레이션 SQL 구조 검증
    Tool: Bash
    Preconditions: 마이그레이션 파일 생성 완료
    Steps:
      1. cat drizzle/migrations/0007_add_record_reads.sql
      2. 출력에서 "CREATE TABLE record_reads" 존재 확인
      3. "STRICT" 키워드 존재 확인
      4. "PRIMARY KEY (learner_id, record_id)" 존재 확인
      5. "ON DELETE CASCADE" 2회 존재 확인
    Expected Result: 모든 키워드가 SQL 파일에 포함됨
    Failure Indicators: STRICT 누락, CASCADE 누락, composite PK 누락
    Evidence: .sisyphus/evidence/task-1-migration-structure.txt

  Scenario: 타입 체크 통과
    Tool: Bash
    Preconditions: 스키마 + relations 파일 수정 완료
    Steps:
      1. tsc --noEmit 실행
    Expected Result: exit code 0, 에러 없음
    Failure Indicators: import 에러, 타입 불일치
    Evidence: .sisyphus/evidence/task-1-typecheck.txt
  ```

  **Commit**: YES
  - Message: `feat(db): record_reads 테이블 스키마 및 마이그레이션 추가`
  - Files: `app/db/schema.server.ts`, `app/db/relations.server.ts`, `drizzle/migrations/0007_add_record_reads.sql`
  - Pre-commit: `tsc --noEmit`

- [x] 2. recordReads 쿼리 모듈 + 테스트

  **What to do**:
  - `app/db/queries/records/recordReads.server.ts` 생성:
    - `markAsRead(d1, learnerId, recordId)` — `onConflictDoNothing` 사용. void 반환
    - `markAsUnread(d1, learnerId, recordId)` — delete. void 반환
    - `getReadRecordIds(d1, learnerId, recordIds: string[])` — 주어진 recordIds 중 읽은 것만 Set<string> 반환
    - `clearAllReads(d1, learnerId)` — 전체 삭제. void 반환
    - `bulkMarkAsRead(d1, learnerId, entries: { recordId: string; readAt: number }[])` — localStorage 동기화용 batch insert. onConflictDoNothing
  - `app/db/queries/__tests__/recordReads.test.ts` 생성:
    - `savedRecords.test.ts`의 mock DB 패턴 복제
    - markAsRead, markAsUnread, getReadRecordIds, clearAllReads, bulkMarkAsRead 각각 테스트

  **Must NOT do**:
  - `getReadCount()` 같은 통계 함수 만들지 않음
  - record의 format 필터링을 여기서 하지 않음 (호출자 책임)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 기존 savedRecords 패턴 복제. CRUD 함수 5개 + 테스트.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO (Task 1 필요)
  - **Parallel Group**: Wave 1 후반
  - **Blocks**: Tasks 5, 10, 11
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `app/db/queries/records/savedRecords.server.ts` — 전체 파일. saveRecord/unsaveRecord/getSavedRecords/isRecordSaved 패턴. `db(d1)` 팩토리, `onConflictDoNothing`, `and(eq(), eq())` WHERE 절 패턴
  - `app/db/queries/__tests__/savedRecords.test.ts` — 전체 파일. mock DB 생성 패턴, vi.fn() spy 구조, 테스트 구조

  **API/Type References**:
  - `app/db/schema.server.ts` — `recordReads` 테이블 (Task 1에서 생성). import 경로 확인
  - `app/db/client.server.ts` — `db(d1)` 팩토리 함수. 모든 쿼리 함수의 첫 줄

  **WHY Each Reference Matters**:
  - `savedRecords.server.ts`: 1:1 복제 대상. 함수 시그니처, 에러 처리, 반환 타입을 그대로 따라감
  - `savedRecords.test.ts`: 테스트 mock 패턴이 프로젝트 전체에서 일관성 유지되어야 함

  **Acceptance Criteria**:

  - [ ] `pnpm test -- recordReads` 통과
  - [ ] markAsRead 중복 호출 시 에러 없음 (onConflictDoNothing)
  - [ ] getReadRecordIds 빈 배열 입력 시 빈 Set 반환
  - [ ] clearAllReads 후 getReadRecordIds 빈 Set 반환
  - [ ] `tsc --noEmit` 통과

  **QA Scenarios:**

  ```
  Scenario: 쿼리 모듈 테스트 전체 통과
    Tool: Bash
    Preconditions: recordReads.server.ts + recordReads.test.ts 생성 완료
    Steps:
      1. pnpm test -- recordReads 실행
    Expected Result: 모든 테스트 PASS, exit code 0
    Failure Indicators: FAIL 표시, timeout, import 에러
    Evidence: .sisyphus/evidence/task-2-test-results.txt

  Scenario: 중복 markAsRead 호출 안정성
    Tool: Bash
    Preconditions: 테스트에 중복 호출 케이스 포함
    Steps:
      1. pnpm test -- recordReads 실행
      2. "onConflictDoNothing" 또는 "중복" 관련 테스트 PASS 확인
    Expected Result: 동일 (learnerId, recordId)로 2회 호출해도 에러 없음
    Evidence: .sisyphus/evidence/task-2-idempotent.txt
  ```

  **Commit**: YES
  - Message: `feat(db): recordReads 쿼리 모듈 및 테스트 추가`
  - Files: `app/db/queries/records/recordReads.server.ts`, `app/db/queries/__tests__/recordReads.test.ts`
  - Pre-commit: `pnpm test -- recordReads`

- [x] 3. read-storage localStorage 유틸 + 테스트

  **What to do**:
  - `app/lib/infra/read-storage.ts` 생성:
    - localStorage 키: `divelog-reads`
    - 저장 형식: `Record<string, number>` (recordId → unixepoch timestamp)
    - `getLocalReads(): Record<string, number>` — localStorage에서 읽음 목록 로드. 파싱 실패 시 `{}` 반환
    - `markLocalRead(recordId: string): void` — recordId를 현재 시각으로 저장
    - `unmarkLocalRead(recordId: string): void` — recordId 제거
    - `clearLocalReads(): void` — 전체 삭제
    - `isLocalRead(recordId: string): boolean` — 읽음 여부 확인
    - `getLocalReadIds(): Set<string>` — 읽은 recordId Set 반환
    - `popLocalReadsForSync(): { recordId: string; readAt: number }[]` — 동기화용 데이터 추출 후 localStorage 클리어. 반환값은 bulkMarkAsRead 입력 형식
    - TTL: 90일 초과된 엔트리는 자동 정리 (getLocalReads 호출 시)
    - 크기 제한: 최대 500개 엔트리 (초과 시 가장 오래된 것부터 삭제)
    - 모든 localStorage 접근은 try-catch로 감싸서 quota 초과/접근 불가 시 silent fail
  - `app/lib/__tests__/read-storage.test.ts` 생성:
    - localStorage mock 사용
    - 기본 CRUD, TTL 정리, 크기 제한, quota 에러, popForSync 테스트

  **Must NOT do**:
  - 복잡한 migration 시스템 만들지 않음
  - 버전 관리 시스템 만들지 않음
  - IndexedDB 사용하지 않음

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 단일 유틸 파일 + 테스트. localStorage 래퍼.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 4)
  - **Blocks**: Tasks 6, 7
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `app/lib/infra/draft-storage.ts` — localStorage 유틸 패턴. silent error handling, JSON 직렬화, TTL 패턴. 이 파일의 try-catch 구조와 에러 처리 방식을 복제

  **WHY Each Reference Matters**:
  - `draft-storage.ts`: 프로젝트의 localStorage 사용 관례. 에러 처리, 직렬화, 네이밍이 일관되어야 함

  **Acceptance Criteria**:

  - [ ] `pnpm test -- read-storage` 통과
  - [ ] TTL 90일 초과 엔트리 자동 정리 테스트 통과
  - [ ] 크기 500개 제한 테스트 통과
  - [ ] localStorage quota 초과 시 에러 없이 동작
  - [ ] `popLocalReadsForSync()` 호출 후 localStorage 비어있음
  - [ ] `tsc --noEmit` 통과

  **QA Scenarios:**

  ```
  Scenario: localStorage 유틸 전체 테스트 통과
    Tool: Bash
    Preconditions: read-storage.ts + read-storage.test.ts 생성 완료
    Steps:
      1. pnpm test -- read-storage 실행
    Expected Result: 모든 테스트 PASS
    Failure Indicators: FAIL, localStorage mock 에러
    Evidence: .sisyphus/evidence/task-3-test-results.txt

  Scenario: TTL 정리 동작 확인
    Tool: Bash
    Preconditions: 테스트에 TTL 케이스 포함
    Steps:
      1. pnpm test -- read-storage 실행
      2. "TTL" 또는 "expired" 관련 테스트 PASS 확인
    Expected Result: 90일 초과 엔트리 자동 제거됨
    Evidence: .sisyphus/evidence/task-3-ttl.txt
  ```

  **Commit**: YES
  - Message: `feat(client): read-storage localStorage 유틸 및 테스트 추가`
  - Files: `app/lib/infra/read-storage.ts`, `app/lib/__tests__/read-storage.test.ts`
  - Pre-commit: `pnpm test -- read-storage`

- [x] 4. SceneCard isRead prop + opacity 디밍

  **What to do**:
  - `app/components/cards/SceneCard.tsx` 수정:
    - `SceneCardProps`에 `isRead?: boolean` 추가
    - 외부 `motion.article`에 조건부 opacity: `isRead && "opacity-60"`
    - `cn()` 유틸로 기존 className에 조건부 추가
    - `isRead` 시 hover elevation 효과는 유지 (opacity만 변경)
    - `data-read` attribute 추가 (테스트/QA용)

  **Must NOT do**:
  - grayscale 필터 추가하지 않음 (opacity만)
  - "읽음" 텍스트 뱃지 추가하지 않음
  - hover 시 opacity 복원 효과 추가하지 않음 (항상 60%)
  - 노트/아티클 분기 로직 SceneCard에 넣지 않음 (isRead는 호출자가 결정)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 단일 컴포넌트 prop 추가 + className 수정. 5줄 미만 변경.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3)
  - **Blocks**: Task 9
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `app/components/cards/SceneCard.tsx:6-28` — SceneCardProps 인터페이스. `hasQuestions?: boolean` 같은 optional boolean prop 추가 패턴
  - `app/components/cards/SceneCard.tsx:68-82` — `motion.article` className과 `cn()` 사용 패턴

  **External References**:
  - Tailwind CSS: `opacity-60` 클래스 → 60% opacity 적용

  **WHY Each Reference Matters**:
  - SceneCardProps: 기존 optional boolean prop 패턴 확인하여 일관된 API 유지
  - motion.article: className 조합 위치와 `cn()` 사용법 확인

  **Acceptance Criteria**:

  - [ ] `tsc --noEmit` 통과
  - [ ] `isRead` 미전달 시 기존 동작과 완전 동일
  - [ ] `isRead={true}` 시 `opacity-60` 클래스 적용
  - [ ] `data-read="true"` attribute 존재

  **QA Scenarios:**

  ```
  Scenario: isRead 미전달 시 기존 동작 유지
    Tool: Bash
    Preconditions: SceneCard 수정 완료
    Steps:
      1. tsc --noEmit 실행
      2. grep -n "opacity-60" app/components/cards/SceneCard.tsx
      3. 조건부로만 적용되는지 확인 (isRead && "opacity-60")
    Expected Result: 타입 체크 통과, opacity-60이 조건부로만 존재
    Failure Indicators: 무조건 opacity-60 적용, 타입 에러
    Evidence: .sisyphus/evidence/task-4-scenecard-check.txt

  Scenario: data-read attribute 존재
    Tool: Bash
    Preconditions: SceneCard 수정 완료
    Steps:
      1. grep -n "data-read" app/components/cards/SceneCard.tsx
    Expected Result: data-read attribute가 조건부로 설정됨
    Evidence: .sisyphus/evidence/task-4-data-attr.txt
  ```

  **Commit**: YES
  - Message: `feat(ui): SceneCard isRead prop 및 opacity 디밍 추가`
  - Files: `app/components/cards/SceneCard.tsx`
  - Pre-commit: `tsc --noEmit`

- [x] 5. /api/track-read API 엔드포인트

  **What to do**:
  - `app/routes/api/track-read.tsx` 생성:
    - POST handler (action):
      - `intent: "mark_read"` — `markAsRead(d1, learnerId, recordId)` 호출
      - `intent: "unmark_read"` — `markAsUnread(d1, learnerId, recordId)` 호출
      - `intent: "sync_reads"` — body에서 `entries: { recordId, readAt }[]` 받아 `bulkMarkAsRead()` 호출
      - `intent: "clear_all_reads"` — `clearAllReads(d1, learnerId)` 호출
    - GET handler (loader):
      - query param `ids` (comma-separated recordIds)
      - `getReadRecordIds(d1, learnerId, ids)` 호출
      - JSON 반환: `{ readIds: string[] }`
    - 인증: `getOptionalUser` 사용 (mark/unmark/sync/clear는 인증 필수이므로 내부에서 체크)
    - GET은 비인증 시 빈 배열 반환 (localStorage fallback은 클라이언트가 처리)
    - 아티클 format 검증: mark_read 시 record의 format이 "article"인지 서버에서 확인
    - Zod validation으로 입력값 검증

  **Must NOT do**:
  - `requireVerified` 사용하지 않음
  - read count 반환하지 않음
  - 다른 사용자의 읽음 상태 조회 허용하지 않음

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 단일 API 라우트 파일. 기존 API 라우트 패턴 복제.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2
  - **Blocks**: Tasks 6, 7
  - **Blocked By**: Task 2

  **References**:

  **Pattern References**:
  - `app/routes/api/upload.tsx` — API 라우트 구조. action/loader 패턴, context.cloudflare.env.DB 접근
  - `app/routes/public/logs/$recordSlug.tsx:177-332` — multi-intent action 패턴 (intent switch). formData 파싱, Zod validation

  **API/Type References**:
  - `app/db/queries/records/recordReads.server.ts` — Task 2에서 생성된 쿼리 함수들
  - `app/lib/auth/auth.middleware.ts` — `getOptionalUser` 함수 시그니처

  **WHY Each Reference Matters**:
  - `upload.tsx`: API 라우트의 export 구조와 context 접근 방식 확인
  - `$recordSlug.tsx` action: intent 기반 분기 패턴과 Zod validation 방식

  **Acceptance Criteria**:

  - [ ] `tsc --noEmit` 통과
  - [ ] POST mark_read: 인증 시 200, 비인증 시 401
  - [ ] POST mark_read: 노트 recordId 전달 시 400 에러
  - [ ] GET ids: 인증 시 읽은 ID 배열, 비인증 시 빈 배열
  - [ ] POST sync_reads: batch insert 성공

  **QA Scenarios:**

  ```
  Scenario: API 타입 체크 통과
    Tool: Bash
    Preconditions: track-read.tsx 생성 완료
    Steps:
      1. tsc --noEmit 실행
    Expected Result: exit code 0
    Evidence: .sisyphus/evidence/task-5-typecheck.txt

  Scenario: 노트 읽음 시도 시 거부
    Tool: Bash (curl)
    Preconditions: 로컬 서버 실행, 인증 쿠키 있음
    Steps:
      1. curl -X POST /api/track-read -d "intent=mark_read&recordId={note-id}"
      2. 응답 상태코드 확인
    Expected Result: 400 Bad Request (format이 note이므로 거부)
    Failure Indicators: 200 OK (노트가 읽음 처리됨)
    Evidence: .sisyphus/evidence/task-5-note-reject.txt
  ```

  **Commit**: YES
  - Message: `feat(api): /api/track-read 읽음 추적 엔드포인트 추가`
  - Files: `app/routes/api/track-read.tsx`
  - Pre-commit: `tsc --noEmit`

- [x] 6. useReadTracking 훅 (5초 타이머 + 읽음 마킹)

  **What to do**:
  - `app/hooks/useReadTracking.ts` 생성:
    - `useReadTracking({ recordId, format, isAuthenticated }: { recordId: string; format: string; isAuthenticated: boolean })` 
    - format이 "article"이 아니면 아무것도 하지 않음 (early return)
    - component mount 후 5초 setTimeout 시작
    - 5초 경과 시:
      - 인증 사용자: `useFetcher`로 `POST /api/track-read` (intent: mark_read, recordId)
      - 비인증 사용자: `markLocalRead(recordId)` 호출
    - useEffect cleanup에서 `clearTimeout` 필수
    - `unmarkRead()` 함수 반환: 개별 읽음 초기화용
      - 인증: `useFetcher`로 `POST /api/track-read` (intent: unmark_read, recordId)
      - 비인증: `unmarkLocalRead(recordId)` 호출

  **Must NOT do**:
  - IntersectionObserver 사용하지 않음 (mount 기반 타이머만)
  - 타이머 진행 UI(프로그레스 바 등) 만들지 않음
  - 노트에 대해 동작하지 않음 (format 체크)
  - page visibility API로 탭 전환 감지하지 않음 (단순 5초)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: React 훅 + useFetcher + localStorage 조합. 조건 분기 복잡도 중간.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 8
  - **Blocked By**: Tasks 3, 5

  **References**:

  **Pattern References**:
  - `app/hooks/useAutosave.ts` — 커스텀 훅 패턴. useEffect + setTimeout/cleanup 구조. useFetcher 사용법
  - `app/components/layout/GlobalNav.tsx` — `useFetcher` 사용 예시. fetcher.load(), fetcher.submit() 패턴

  **API/Type References**:
  - `app/lib/infra/read-storage.ts` — Task 3에서 생성. markLocalRead, unmarkLocalRead 함수
  - `app/routes/api/track-read.tsx` — Task 5에서 생성. POST endpoint

  **WHY Each Reference Matters**:
  - `useAutosave.ts`: setTimeout + cleanup 패턴과 useFetcher 비네비게이팅 제출 방식
  - `GlobalNav.tsx`: fetcher.submit()의 실제 사용 예시 (FormData 구성)

  **Acceptance Criteria**:

  - [ ] `tsc --noEmit` 통과
  - [ ] format !== "article" 시 타이머 시작 안 함
  - [ ] mount 후 5초 경과 시 mark_read 호출
  - [ ] 5초 전 unmount 시 clearTimeout으로 정리

  **QA Scenarios:**

  ```
  Scenario: 타입 체크 통과
    Tool: Bash
    Preconditions: useReadTracking.ts 생성 완료
    Steps:
      1. tsc --noEmit 실행
    Expected Result: exit code 0
    Evidence: .sisyphus/evidence/task-6-typecheck.txt

  Scenario: format 체크 로직 확인
    Tool: Bash (grep)
    Preconditions: 훅 파일 생성 완료
    Steps:
      1. grep -n "article" app/hooks/useReadTracking.ts
      2. early return 패턴 확인
    Expected Result: format !== "article" 시 early return 존재
    Evidence: .sisyphus/evidence/task-6-format-check.txt
  ```

  **Commit**: YES
  - Message: `feat(hooks): useReadTracking 5초 타이머 훅 추가`
  - Files: `app/hooks/useReadTracking.ts`
  - Pre-commit: `tsc --noEmit`

- [x] 7. useReadState 훅 (목록용 읽음 상태 resolve)

  **What to do**:
  - `app/hooks/useReadState.ts` 생성:
    - `useReadState(recordIds: string[]): { isRead: (recordId: string) => boolean; isLoading: boolean }`
    - `_public` 레이아웃에서 auth 정보 가져옴: `useRouteLoaderData("routes/_public")`
    - 인증 사용자:
      - `useFetcher`로 `GET /api/track-read?ids={comma-separated}` 호출
      - 반환된 `readIds`를 Set으로 변환
      - recordIds가 변경될 때만 re-fetch
    - 비인증 사용자:
      - `getLocalReadIds()`로 localStorage에서 직접 읽음
      - isLoading은 항상 false (동기적)
    - `isRead(recordId)` 함수: Set.has()로 O(1) 조회
  - 로그인 직후 동기화 로직:
    - `_public.tsx` 레이아웃이나 이 훅 내부에서 1회 동기화 트리거
    - localStorage에 `divelog-reads-synced` 플래그 확인
    - 플래그 없고 + 인증됨 + localStorage에 읽음 데이터 있으면:
      - `popLocalReadsForSync()`로 데이터 추출
      - `POST /api/track-read` (intent: sync_reads) 호출
      - 성공 시 `divelog-reads-synced: true` 설정
    - 이 동기화는 페이지 로드 시 1회만 실행

  **Must NOT do**:
  - React Context/Provider로 글로벌 상태 만들지 않음
  - 매 페이지 로드마다 양방향 동기화하지 않음
  - SWR/React Query 같은 추가 라이브러리 사용하지 않음

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 인증 상태 분기 + useFetcher + localStorage + 동기화 로직. 중간 복잡도.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (Task 6과 병렬)
  - **Parallel Group**: Wave 2 (with Task 6)
  - **Blocks**: Task 9
  - **Blocked By**: Tasks 3, 5

  **References**:

  **Pattern References**:
  - `app/components/layout/GlobalNav.tsx` — `useRouteLoaderData("routes/_public")` 사용법. 레이아웃 auth 데이터 접근 패턴
  - `app/hooks/useAutosave.ts` — useFetcher 패턴

  **API/Type References**:
  - `app/routes/api/track-read.tsx` — Task 5. GET handler 응답 형식 `{ readIds: string[] }`
  - `app/lib/infra/read-storage.ts` — Task 3. getLocalReadIds, popLocalReadsForSync
  - `app/routes/_public.tsx` — 레이아웃 loader 반환값 타입 (auth 정보 구조)

  **WHY Each Reference Matters**:
  - `GlobalNav.tsx`: `useRouteLoaderData` 호출 패턴과 반환값 타입 캐스팅 방식
  - `_public.tsx`: auth 정보가 어떤 형태로 제공되는지 확인

  **Acceptance Criteria**:

  - [ ] `tsc --noEmit` 통과
  - [ ] 인증 사용자: API에서 readIds를 받아와 `isRead()` 동작
  - [ ] 비인증 사용자: localStorage에서 직접 resolve
  - [ ] 로그인 직후 localStorage → DB 동기화 1회 실행
  - [ ] 동기화 후 localStorage 클리어됨

  **QA Scenarios:**

  ```
  Scenario: 타입 체크 통과
    Tool: Bash
    Preconditions: useReadState.ts 생성 완료
    Steps:
      1. tsc --noEmit 실행
    Expected Result: exit code 0
    Evidence: .sisyphus/evidence/task-7-typecheck.txt

  Scenario: 동기화 플래그 로직 확인
    Tool: Bash (grep)
    Preconditions: 훅 파일 생성 완료
    Steps:
      1. grep -n "divelog-reads-synced" app/hooks/useReadState.ts
      2. 플래그 체크 + 설정 로직 존재 확인
    Expected Result: synced 플래그 read/write 로직 존재
    Evidence: .sisyphus/evidence/task-7-sync-flag.txt
  ```

  **Commit**: YES
  - Message: `feat(hooks): useReadState 목록용 읽음 상태 훅 추가`
  - Files: `app/hooks/useReadState.ts`
  - Pre-commit: `tsc --noEmit`

- [x] 8. 상세 페이지 읽음 추적 통합

  **What to do**:
  - `app/routes/public/logs/$recordSlug.tsx` 수정:
    - `useReadTracking` 훅 import 및 호출
    - 컴포넌트 상단에서: `const { unmarkRead } = useReadTracking({ recordId: record.id, format: record.format, isAuthenticated: !!currentUserId })`
    - format이 "article"일 때만 "읽지 않음으로 표시" 버튼 추가 (header 영역, 수정 버튼 옆):
      - `useFetcher` 또는 `unmarkRead()` 호출
      - 버튼 텍스트: "읽지 않음으로 표시"
      - 스타일: 기존 "수정" 버튼과 유사한 subtle 스타일 (ghost/outline)
    - clientLoader 캐시: `clientAction`에서 mark_read/unmark_read 후 캐시 무효화 불필요 (읽음 상태는 목록 페이지에서 resolve되므로)

  **Must NOT do**:
  - 기존 action (create_response, save_sentence, create_self_answer)에 mark_read를 섞지 않음
  - 읽음 진행 UI (프로그레스 바, 타이머 표시) 추가하지 않음
  - 노트 상세 페이지에 어떤 읽음 관련 UI도 추가하지 않음

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 기존 복잡한 라우트 수정. 훅 통합 + 조건부 UI 추가.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3
  - **Blocks**: F1-F4
  - **Blocked By**: Task 6

  **References**:

  **Pattern References**:
  - `app/routes/public/logs/$recordSlug.tsx:619-626` — "수정" 버튼 스타일. 동일한 `rounded-full border border-border px-3 py-1.5 text-xs font-medium` 스타일 복제
  - `app/routes/public/logs/$recordSlug.tsx:392-400` — 컴포넌트 상단 구조. loaderData destructuring, 훅 호출 위치
  - `app/routes/public/logs/$recordSlug.tsx:410-412` — `isRecordAuthor`, `recordFormat`, `isArticleRecord` 변수. format 체크 패턴

  **API/Type References**:
  - `app/hooks/useReadTracking.ts` — Task 6에서 생성. 훅 시그니처와 반환값
  - `./+types/$recordSlug` — Route.ComponentProps 타입

  **WHY Each Reference Matters**:
  - "수정" 버튼 스타일: "읽지 않음으로 표시" 버튼이 시각적으로 일관되어야 함
  - 컴포넌트 상단: 훅 호출 위치와 destructuring 패턴 확인
  - format 체크: 이미 `isArticleRecord` 변수가 있으므로 재사용

  **Acceptance Criteria**:

  - [ ] `tsc --noEmit` 통과
  - [ ] 아티클 상세 페이지 5초 체류 시 읽음 마킹 (네트워크 탭에서 POST /api/track-read 확인)
  - [ ] 노트 상세 페이지에서 읽음 관련 UI 없음
  - [ ] "읽지 않음으로 표시" 버튼이 아티클에만 표시
  - [ ] 기존 기능 (응답 작성, 문장 저장, 자기답변) 정상 동작

  **QA Scenarios:**

  ```
  Scenario: 아티클 상세 5초 체류 읽음 추적
    Tool: Playwright (playwright skill)
    Preconditions: 로컬 서버 실행, 인증된 상태, 아티클 기록 존재
    Steps:
      1. /logs/{article-slug} 페이지 이동
      2. 5초 대기 (page.waitForTimeout(6000))
      3. 네트워크 요청에서 POST /api/track-read 확인
    Expected Result: track-read API 호출됨, status 200
    Failure Indicators: API 호출 없음, 404/500 에러
    Evidence: .sisyphus/evidence/task-8-read-tracking.png

  Scenario: 노트 상세 페이지 읽음 UI 없음
    Tool: Playwright (playwright skill)
    Preconditions: 노트 기록 존재
    Steps:
      1. /logs/{note-slug} 페이지 이동
      2. "읽지 않음" 텍스트 존재 여부 확인
      3. 5초 대기
      4. 네트워크 요청에서 POST /api/track-read 없는지 확인
    Expected Result: 읽음 관련 UI 없음, API 호출 없음
    Evidence: .sisyphus/evidence/task-8-note-no-tracking.png
  ```

  **Commit**: YES
  - Message: `feat(pages): 상세 페이지 읽음 추적 통합`
  - Files: `app/routes/public/logs/$recordSlug.tsx`
  - Pre-commit: `tsc --noEmit`

- [x] 9. /logs 목록 페이지 읽음 상태 통합

  **What to do**:
  - `app/routes/public/logs/index.tsx` 수정:
    - `useReadState` 훅 import 및 호출
    - 아티클 recordIds만 추출: `records.filter(r => r.format === 'article').map(r => r.id)`
    - `const { isRead } = useReadState(articleRecordIds)`
    - SceneCard에 `isRead` prop 전달: `isRead={record.format === 'article' && isRead(record.id)}`
    - 노트는 항상 `isRead={false}` (format 체크로 보장)

  **Must NOT do**:
  - 서버 로더 수정하지 않음 (클라이언트 사이드 resolve)
  - "읽음 필터" 토글 추가하지 않음 (Wave 1 스코프 아님)
  - 다른 SceneCard 사용처 (journey, learners 등) 수정하지 않음

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 기존 라우트에 훅 통합. 데이터 변환 + prop 전달 로직.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (Task 8과 병렬)
  - **Parallel Group**: Wave 3 (with Tasks 8, 10, 11)
  - **Blocks**: F1-F4
  - **Blocked By**: Tasks 4, 7

  **References**:

  **Pattern References**:
  - `app/routes/public/logs/index.tsx` — 전체 파일. 로더 데이터 구조, SceneCard 렌더링 위치, 기존 filter/sort UI

  **API/Type References**:
  - `app/hooks/useReadState.ts` — Task 7에서 생성. `useReadState(recordIds)` → `{ isRead, isLoading }`
  - `app/components/cards/SceneCard.tsx` — Task 4에서 수정. `isRead?: boolean` prop

  **WHY Each Reference Matters**:
  - `logs/index.tsx`: SceneCard에 prop을 전달하는 정확한 위치와 데이터 구조 확인
  - `useReadState`: 훅 API 확인 (recordIds 전달, isRead 함수 반환)

  **Acceptance Criteria**:

  - [ ] `tsc --noEmit` 통과
  - [ ] 읽은 아티클 카드가 opacity-60으로 표시
  - [ ] 안 읽은 아티클 카드가 full opacity
  - [ ] 노트 카드는 항상 full opacity
  - [ ] 서버 로더 변경 없음 (git diff에서 loader 함수 수정 없음)

  **QA Scenarios:**

  ```
  Scenario: 읽은 아티클 디밍 확인
    Tool: Playwright (playwright skill)
    Preconditions: 로컬 서버 실행, 인증 상태, 최소 1개 읽은 아티클 + 1개 안 읽은 아티클
    Steps:
      1. /logs 페이지 이동
      2. [data-read="true"] 셀렉터로 읽은 카드 찾기
      3. 해당 카드의 computed opacity 확인 (0.6)
      4. [data-read] attribute 없는 카드의 opacity 확인 (1)
    Expected Result: 읽은 카드 opacity 0.6, 안 읽은 카드 opacity 1
    Failure Indicators: 모든 카드 동일 opacity, 디밍 안 됨
    Evidence: .sisyphus/evidence/task-9-logs-dimming.png

  Scenario: 노트 카드 디밍 안 됨
    Tool: Playwright (playwright skill)
    Preconditions: 노트 기록이 목록에 존재
    Steps:
      1. /logs 페이지 이동
      2. 노트 format badge "노트" 있는 카드 찾기
      3. 해당 카드에 [data-read="true"] 없는지 확인
    Expected Result: 노트 카드에 data-read="true" 없음
    Evidence: .sisyphus/evidence/task-9-note-no-dim.png
  ```

  **Commit**: YES
  - Message: `feat(pages): /logs 목록 읽음 상태 표시 통합`
  - Files: `app/routes/public/logs/index.tsx`
  - Pre-commit: `tsc --noEmit`

- [x] 10. 기록 작성 시 자동 읽음 처리

  **What to do**:
  - `app/routes/public/write/article.tsx` (또는 기록 작성 action이 있는 파일) 수정:
    - 아티클 작성 action 성공 후, `markAsRead(d1, authorId, newRecordId)` 호출
    - 작성 action의 기존 flow에 1줄 추가만으로 구현
    - 이미 createRecord 성공 후 redirect 하는 부분 직전에 삽입

  **Must NOT do**:
  - 노트 작성 시에는 자동 읽음 처리하지 않음
  - 수정 (edit) 시에는 자동 읽음 처리하지 않음 (이미 읽은 상태)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 기존 action에 1줄 추가.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 8, 9, 11)
  - **Blocks**: F1-F4
  - **Blocked By**: Task 2

  **References**:

  **Pattern References**:
  - `app/routes/public/write/article.tsx` (또는 해당 파일) — 기록 작성 action. createRecord 호출 후 redirect 패턴
  - 글 작성 라우트를 먼저 확인: `app/routes/public/write/` 디렉토리 탐색

  **API/Type References**:
  - `app/db/queries/records/recordReads.server.ts` — Task 2. `markAsRead(d1, learnerId, recordId)`

  **WHY Each Reference Matters**:
  - 작성 action: 정확한 삽입 위치 확인 (createRecord 성공 → markAsRead → redirect)

  **Acceptance Criteria**:

  - [ ] `tsc --noEmit` 통과
  - [ ] 아티클 작성 후 해당 기록이 record_reads에 존재
  - [ ] 노트 작성 후에는 record_reads에 행 없음

  **QA Scenarios:**

  ```
  Scenario: 아티클 작성 후 자동 읽음 확인
    Tool: Bash
    Preconditions: 로컬 서버 + 로컬 DB
    Steps:
      1. 아티클 작성 API 호출 (또는 Playwright로 작성 폼 제출)
      2. record_reads 테이블 조회
    Expected Result: 방금 작성한 아티클의 (author_id, record_id) 행 존재
    Evidence: .sisyphus/evidence/task-10-auto-read.txt
  ```

  **Commit**: YES (Task 11과 합쳐도 됨)
  - Message: `feat(pages): 기록 작성 시 자동 읽음 처리`
  - Files: `app/routes/public/write/article.tsx` (또는 해당 파일)
  - Pre-commit: `tsc --noEmit`

- [x] 11. 설정 페이지 읽음 초기화

  **What to do**:
  - `app/routes/public/settings.tsx` 수정:
    - action에 `intent: "reset_all_reads"` 추가:
      - `requireAuth` 로 인증 확인
      - `clearAllReads(d1, userId)` 호출
      - `clearLocalReads()` 호출을 위해 클라이언트에서도 처리 (actionData 성공 시)
      - 성공 메시지: "읽음 상태가 초기화되었습니다."
    - UI에 "읽음 상태 초기화" 섹션 추가:
      - 제목: "읽음 상태"
      - 설명: "읽은 기록의 표시를 초기화합니다."
      - 버튼: "모두 읽지 않음으로 표시"
      - 확인 다이얼로그 없이 즉시 실행 (되돌릴 수 있는 작업이므로)

  **Must NOT do**:
  - "읽음 기록 N개" 카운터 표시하지 않음
  - 기간별 선택 초기화 (최근 7일 등) 추가하지 않음

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 기존 settings 페이지에 action intent + UI 섹션 추가.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 8, 9, 10)
  - **Blocks**: F1-F4
  - **Blocked By**: Task 2

  **References**:

  **Pattern References**:
  - `app/routes/public/settings.tsx` — 전체 파일. 기존 설정 섹션 UI 구조, action intent 패턴

  **API/Type References**:
  - `app/db/queries/records/recordReads.server.ts` — Task 2. `clearAllReads(d1, learnerId)`
  - `app/lib/infra/read-storage.ts` — Task 3. `clearLocalReads()`
  - `app/lib/auth/auth.middleware.ts` — `requireAuth`

  **WHY Each Reference Matters**:
  - `settings.tsx`: 기존 UI 구조와 일관된 섹션 추가. action intent 패턴 확인

  **Acceptance Criteria**:

  - [ ] `tsc --noEmit` 통과
  - [ ] 설정 페이지에 "읽음 상태" 섹션 표시
  - [ ] 버튼 클릭 시 모든 record_reads 삭제
  - [ ] 성공 메시지 "읽음 상태가 초기화되었습니다." 표시

  **QA Scenarios:**

  ```
  Scenario: 전체 읽음 초기화
    Tool: Playwright (playwright skill)
    Preconditions: 인증 상태, 읽은 아티클 2개 이상
    Steps:
      1. /settings 페이지 이동
      2. "모두 읽지 않음으로 표시" 버튼 클릭
      3. 성공 메시지 확인
      4. /logs 페이지 이동
      5. 모든 아티클 카드가 full opacity인지 확인
    Expected Result: 읽음 초기화 후 모든 카드 opacity 1.0
    Failure Indicators: 디밍된 카드 잔존, 에러 메시지
    Evidence: .sisyphus/evidence/task-11-reset-all.png
  ```

  **Commit**: YES
  - Message: `feat(settings): 읽음 상태 초기화 기능 추가`
  - Files: `app/routes/public/settings.tsx`
  - Pre-commit: `tsc --noEmit`

---

## Final Verification Wave

> 4 review agents run in PARALLEL. ALL must APPROVE. Rejection → fix → re-run.

- [x] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [x] F2. **Code Quality Review** — `unspecified-high`
  Run `tsc --noEmit` + `pnpm test`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names. Verify Drizzle schema follows STRICT table conventions.
  Output: `Build [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [x] F3. **Real Manual QA** — `unspecified-high` (+ `playwright` skill)
  Start from clean state. Test full flow: visit article as guest → wait 5s → check localStorage → login → verify sync → check `/logs` dimming → reset in settings → verify restored. Test edge cases: navigate away before 5s, notes not dimmed, draft articles ignored.
  Save to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [x] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff. Verify 1:1 — everything in spec was built, nothing beyond spec was built. Check "Must NOT do" compliance (no read counts, no note tracking, no 10-loader modifications). Detect cross-task contamination.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

| # | Message | Files | Pre-commit |
|---|---------|-------|-----------|
| 1 | `feat(db): record_reads 테이블 스키마 및 마이그레이션 추가` | schema.server.ts, relations.server.ts, 0007_*.sql | `tsc --noEmit` |
| 2 | `feat(db): recordReads 쿼리 모듈 및 테스트 추가` | recordReads.server.ts, recordReads.test.ts | `pnpm test -- recordReads` |
| 3 | `feat(client): read-storage localStorage 유틸 및 테스트 추가` | read-storage.ts, read-storage.test.ts | `pnpm test -- read-storage` |
| 4 | `feat(ui): SceneCard isRead prop 및 opacity 디밍 추가` | SceneCard.tsx | `tsc --noEmit` |
| 5 | `feat(api): /api/track-read 읽음 추적 엔드포인트 추가` | track-read.tsx | `tsc --noEmit` |
| 6 | `feat(hooks): useReadTracking 5초 타이머 훅 추가` | useReadTracking.ts | `tsc --noEmit` |
| 7 | `feat(hooks): useReadState 목록용 읽음 상태 훅 추가` | useReadState.ts | `tsc --noEmit` |
| 8 | `feat(pages): 상세 페이지 읽음 추적 통합` | $recordSlug.tsx | `tsc --noEmit` |
| 9 | `feat(pages): /logs 목록 읽음 상태 표시 통합` | logs/index.tsx | `tsc --noEmit` |
| 10 | `feat(pages): 기록 작성 시 자동 읽음 처리` | write/article.tsx | `tsc --noEmit` |
| 11 | `feat(settings): 읽음 상태 초기화 기능 추가` | settings.tsx | `pnpm test && tsc --noEmit` |

---

## Success Criteria

### Verification Commands
```bash
pnpm test                    # Expected: all tests pass
tsc --noEmit                 # Expected: no type errors
```

### Final Checklist
- [ ] 아티클 상세 5초 체류 → record_reads에 행 추가됨
- [ ] 5초 전 이탈 → record_reads에 행 없음
- [ ] 노트 상세 아무리 오래 있어도 → record_reads에 행 없음
- [ ] `/logs`에서 읽은 아티클 opacity 디밍됨
- [ ] `/logs`에서 노트는 항상 full opacity
- [ ] 비로그인 시 localStorage에 읽음 저장
- [ ] 로그인 시 localStorage → DB 동기화 후 클리어
- [ ] 본인 아티클 작성 → 자동 읽음
- [ ] 설정에서 전체 초기화 → 모든 읽음 해제
- [ ] 상세 페이지에서 개별 읽음 해제 → 목록에서 full opacity 복원
- [ ] `as any`, `@ts-ignore` 없음
- [ ] 빈 catch 블록 없음
