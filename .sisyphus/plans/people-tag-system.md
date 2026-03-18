# 함께하는 사람 시스템 & 태그 수정

## TL;DR

> **Quick Summary**: 기록(record)에 "함께하는 사람"(3역할: 공동작성/함께활동/멘토)과 "언급된 사람"을 명시적으로 선택하는 시스템을 신규 구축하고, 현재 생성 플로우에서 빠져있는 게시글 태그를 수정한다.
> 
> **Deliverables**:
> - `record_participants` DB 테이블 + Drizzle 스키마 + 마이그레이션
> - 재사용 가능한 `TagSelector`, `PersonSearch` 컴포넌트
> - 글 생성(note/article) 시 태그 + 사람 선택 UI
> - 기록 상세/편집에서 참여자·언급 표시 및 수정
> - SceneCard에 참여자 아바타 표시
> - Learner 프로필에 "함께한 글" / "언급된 글" 섹션
> - 참여자·언급 알림(중복 제거)
> - Admin tags TypeScript 에러 수정
> - 전체 TDD (vitest 기반, 기존 인프라 활용)
> 
> **Estimated Effort**: Large
> **Parallel Execution**: YES - 4 waves + Final
> **Critical Path**: T2(schema) → T5(queries) → T9/T10(write UI) → T11(display) → F1-F4

---

## Context

### Original Request
글마다 "함께하는 사람"과 "언급(태그)된 사람"을 구분해서 등록할 수 있는 시스템 제작. 현재 게시글 태그와 사람 태그가 동작하지 않는 문제 수정 포함.

### Interview Summary
**Key Discussions**:
- 함께하는 사람 = 공동작성자 + 함께활동한 사람 + 멘토 (3역할 구분)
- 사람 선택 UI = 검색 자동완성 (기존 `/api/search-learners` 활용)
- SceneCard(목록 카드)에도 참여자 아바타 표시
- 글 작성 시점부터 태그 + 사람 선택 가능
- 알림: 함께하는 사람 + 언급된 사람 모두 발송
- Learner 프로필에 "함께한 글" / "언급된 글" 섹션 추가
- 테스트: vitest 기존 인프라(24개 기존 테스트) 활용 + TDD

**Research Findings**:
- `mentions` 테이블 존재하나 UI 없음, regex 추출만 동작
- `tags` + `recordTags` 완전하나 생성 폼에 미포함
- `record_participants` 테이블 없음 → 신규 생성 필요
- `/api/search-learners` API 존재 (id, slug, displayName, profilePhotoUrl 반환)
- SceneCard에 태그/사람 미표시
- Admin tags에 `TagWithUsage` TypeScript 에러
- vitest 4.1.0 이미 설치·구성됨 (인프라 세팅 불필요)

### Metis Review
**Identified Gaps** (addressed):
- 언급 전략(regex + 명시 UI 공존): **명시 UI 우선, regex 보조 유지, 중복 제거** 적용
- 참여자 권한: **작성자만 추가 가능, 역할은 표시 전용(display-only)** 적용
- SceneCard N+1 쿼리 위험: **배치 JOIN 로딩 + 3명 초과 시 "+N명" 트렁케이션** 적용
- 알림 중복: **동일 (recipientId, recordId) 기준 1건만 발송** 적용
- 글쓰기 폼 복잡도: **접을 수 있는(collapsible) 부가 섹션으로 배치** 적용

---

## Work Objectives

### Core Objective
기록에 사람을 연결하는 두 가지 관계("함께하는 사람" / "언급된 사람")를 DB부터 UI까지 end-to-end로 구축하고, 기존 게시글 태그의 생성 시점 누락을 수정한다.

### Concrete Deliverables
- `drizzle/migrations/0010_add_record_participants.sql` 마이그레이션
- `app/db/schema.server.ts`에 `recordParticipants` 테이블 추가
- `app/db/queries/records/participants.server.ts` 쿼리 모듈
- `app/components/TagSelector.tsx` 재사용 컴포넌트
- `app/components/PersonSearch.tsx` 재사용 컴포넌트
- `/write/note`, `/write/article` 폼에 태그·참여자·언급 UI 추가
- 기록 상세 페이지에 참여자·언급 섹션
- SceneCard에 참여자 아바타 칩
- 편집 페이지에 참여자·언급 수정 UI
- Learner 프로필에 "함께한 글" / "언급된 글"
- 참여자·언급 알림 (중복 제거)
- Admin tags TypeScript 에러 수정

### Definition of Done

> **⚠️ 기존 코드베이스 typecheck 상태**: 현재 `pnpm typecheck`는 이 플랜 범위 밖 파일들(`AdminSidebar.tsx`, `analytics.tsx`, `questions.server.ts` 등)에서 이미 에러가 있음. 따라서 전역 `pnpm typecheck → 0 errors`는 이 플랜의 게이트로 부적합.
> 
> **이 플랜의 typecheck 기준**: "이 플랜에서 수정/생성한 파일에 새로운 type error가 0건"으로 한정.
> 검증 명령: `pnpm typecheck 2>&1 | grep -E "(PersonSearch|TagSelector|participants|recordParticipants|mentions\.server|note\.tsx|article\.tsx|recordSlug|learnerSlug|admin/tags)" | grep "error TS" | wc -l` → 0

- [ ] 이 플랜에서 변경한 파일의 type error = 0건 (위 scoped typecheck 명령)
- [ ] `pnpm test` → ALL PASS (기존 24개 + 신규 테스트)
- [ ] `wrangler d1 migrations apply DB --local` → exit 0
- [ ] Note/Article 생성 시 태그·참여자·언급 선택 가능
- [ ] 기록 상세에서 참여자·언급 표시
- [ ] SceneCard에 참여자 아바타 표시

### Must Have
- `record_participants` 테이블 (recordId, participantUserId, addedById, role, createdAt)
- 역할 3종: `coauthor`, `companion`, `mentor`
- 명시적 사람 선택 UI (검색 자동완성)
- 글 생성 시 태그 선택 (기존 edit-only에서 확장)
- 알림 중복 제거 (동일 사용자에게 1건만)

### Must NOT Have (Guardrails)
- ❌ 참여자 역할에 따른 편집/조회 권한 차이 (역할은 표시 전용 라벨)
- ❌ textarea 내 인라인 @-자동완성 (TipTap/ProseMirror 통합 금지)
- ❌ 일반 사용자의 태그 생성/편집 UI (관리자만)
- ❌ WebSocket/SSE 실시간 알림
- ❌ "자주 함께하는 사람" 등 소셜 그래프 기능
- ❌ 참여자 수/언급 수 기반 랭킹/리더보드
- ❌ 좋아요, 추천, 인기순 (제품 철학 위반)
- ❌ 작성자 본인을 참여자로 추가 (이미 작성자임)

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: YES (vitest 4.1.0, jsdom, 24 기존 테스트)
- **Automated tests**: TDD (RED → GREEN → REFACTOR)
- **Framework**: vitest (기존 설정 그대로 활용)
- **Pattern**: `app/db/queries/records/__tests__/*.test.ts` 기존 패턴 따름

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Frontend/UI**: Playwright — Navigate, interact, assert DOM, screenshot
- **DB/Query**: Bash (vitest) — 단위 테스트 실행
- **API**: Bash (curl) — 요청/응답 검증
- **Build**: Bash — `pnpm typecheck`, `pnpm test`

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation — 4 tasks, all independent):
├── T1:  Admin tags TypeScript 에러 수정 [quick]
├── T2:  record_participants DB 마이그레이션 + 스키마 + relations [quick]
├── T3:  TagSelector 재사용 컴포넌트 추출 [quick]
└── T4:  PersonSearch 자동완성 컴포넌트 신규 [unspecified-high]

Wave 2 (Query layer + Tags fix — 4 tasks):
├── T5:  Participant 쿼리 모듈 + TDD 테스트 (depends: T2) [deep]
├── T6:  Mention 쿼리 업데이트 + TDD 테스트 [quick]
├── T7:  Note 생성 폼에 태그 추가 (depends: T3) [quick]
└── T8:  Article 생성 폼에 태그 추가 (depends: T3) [quick]

Wave 3 (People in write + Display — 5 tasks):
├── T9:  Note 생성 폼에 참여자·언급 추가 (depends: T4, T5, T6) [unspecified-high]
├── T10: Article 생성 폼에 참여자·언급 추가 (depends: T4, T5, T6) [unspecified-high]
├── T11: 기록 상세 참여자·언급 표시 (depends: T5, T6) [visual-engineering]
├── T12: 편집 폼에 참여자·언급 수정 UI (depends: T4, T5, T6) [unspecified-high]
└── T13: 참여자·언급 알림 + 중복 제거 (depends: T5, T6) [quick]

Wave 4 (Card + Profile — 3 tasks):
├── T14: SceneCard 참여자 아바타 칩 + 배치 로딩 (depends: T5) [visual-engineering]
├── T15: Learner 프로필 "함께한 글"/"언급된 글" 섹션 (depends: T5, T6) [unspecified-high]
└── T16: Seed 데이터 업데이트 + 마이그레이션 검증 (depends: T2) [quick]

Wave FINAL (4 parallel reviews → user okay):
├── F1: Plan compliance audit [oracle]
├── F2: Code quality review [unspecified-high]
├── F3: Real manual QA [unspecified-high]
└── F4: Scope fidelity check [deep]
→ Present results → Get explicit user okay
```

### Dependency Matrix

| Task | Depends On | Blocks | Wave |
|------|-----------|--------|------|
| T1 | — | — | 1 |
| T2 | — | T5, T16 | 1 |
| T3 | — | T7, T8 | 1 |
| T4 | — | T9, T10, T12 | 1 |
| T5 | T2 | T9, T10, T11, T12, T13, T14, T15 | 2 |
| T6 | — | T9, T10, T11, T12, T13, T15 | 2 |
| T7 | T3 | — | 2 |
| T8 | T3 | — | 2 |
| T9 | T4, T5, T6 | — | 3 |
| T10 | T4, T5, T6 | — | 3 |
| T11 | T5, T6 | T14 | 3 |
| T12 | T4, T5, T6 | — | 3 |
| T13 | T5, T6 | — | 3 |
| T14 | T5 | — | 4 |
| T15 | T5, T6 | — | 4 |
| T16 | T2 | — | 4 |

### Agent Dispatch Summary

- **Wave 1**: **4** — T1 → `quick`, T2 → `quick`, T3 → `quick`, T4 → `unspecified-high`
- **Wave 2**: **4** — T5 → `deep`, T6 → `quick`, T7 → `quick`, T8 → `quick`
- **Wave 3**: **5** — T9 → `unspecified-high`, T10 → `unspecified-high`, T11 → `visual-engineering`, T12 → `unspecified-high`, T13 → `quick`
- **Wave 4**: **3** — T14 → `visual-engineering`, T15 → `unspecified-high`, T16 → `quick`
- **FINAL**: **4** — F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `deep`

---

## TODOs

- [x] 1. Admin tags TypeScript 에러 수정

  **What to do**:
  - `app/routes/admin/tags.tsx`에서 `TagWithUsage` 타입 임포트 에러 수정
  - 동적 import(`await import()`)에서 타입을 destructure 할 수 없는 문제
  - `import type { TagWithUsage }` 정적 타입 임포트로 변경하거나, 인라인 타입 추론으로 대체
  - 에러 위치: 33행, 45행, 284행

  **Must NOT do**:
  - `as any` 등 타입 우회 사용 금지
  - 다른 파일 변경 금지 (이 태스크는 단독 버그픽스)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 단일 파일, 3곳의 타입 임포트 수정
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `frontend-design`: UI 변경 아님

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T2, T3, T4)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  **Pattern References**:
  - `app/routes/admin/tags.tsx:33,45,284` — `TagWithUsage` 사용 위치
  - `app/db/queries/records/tags.server.ts` — `TagWithUsage` 타입 export 확인

  **Acceptance Criteria**:

  **If TDD**: N/A (타입 수정이므로)

  **QA Scenarios**:

  ```
  Scenario: TypeScript 컴파일 에러 해결
    Tool: Bash
    Preconditions: 현재 admin/tags.tsx에 TagWithUsage 타입 에러 3개 존재
    Steps:
      1. pnpm typecheck 2>&1 | grep "admin/tags" | grep "error TS" | wc -l 실행
      2. 결과 = 0 확인 (admin/tags.tsx 관련 에러 0건)
    Expected Result: admin/tags.tsx의 TagWithUsage 에러 해결됨 (기존 다른 파일 에러는 이 태스크 범위 밖)
    Failure Indicators: TagWithUsage 관련 에러 잔존
    Evidence: .sisyphus/evidence/task-1-typecheck.txt
  ```

  **Commit**: YES
  - Message: `fix(admin): TagWithUsage 타입 임포트 수정`
  - Files: `app/routes/admin/tags.tsx`
  - Pre-commit: scoped typecheck — `pnpm typecheck 2>&1 | grep "admin/tags" | grep "error TS" | wc -l` → 0

- [x] 2. record_participants DB 마이그레이션 + 스키마 + relations

  **What to do**:
  - `drizzle/migrations/0010_add_record_participants.sql` 생성:
    ```sql
    CREATE TABLE record_participants (
      record_id TEXT NOT NULL REFERENCES records(id) ON DELETE CASCADE,
      participant_user_id TEXT NOT NULL REFERENCES learner_profiles(user_id) ON DELETE CASCADE,
      added_by_id TEXT NOT NULL REFERENCES learner_profiles(user_id) ON DELETE CASCADE,
      role TEXT NOT NULL DEFAULT 'companion',
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      PRIMARY KEY (record_id, participant_user_id)
    ) STRICT;
    ```
  - `app/db/schema.server.ts`에 `recordParticipants` Drizzle 테이블 정의 추가
    - role: `text("role").notNull().default("companion")` — 값: `coauthor`, `companion`, `mentor`
    - 복합 PK: `(recordId, participantUserId)`
  - `app/db/relations.server.ts`에 relations 추가:
    - `recordParticipants` ↔ `records` (many-to-one)
    - `recordParticipants` ↔ `learnerProfiles` (many-to-one, participantUserId)
    - `recordParticipants` ↔ `learnerProfiles` (many-to-one, addedById)
    - `records` → `recordParticipants` (one-to-many) 추가
    - `learnerProfiles` → `recordParticipants` (one-to-many) 추가

  **Must NOT do**:
  - 기존 테이블 수정 금지
  - KV 바인딩 사용 금지

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: SQL 마이그레이션 1개 + 스키마/relations 추가. 기존 패턴 따르기
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T1, T3, T4)
  - **Blocks**: T5, T16
  - **Blocked By**: None

  **References**:
  **Pattern References**:
  - `drizzle/migrations/0008_add_record_reads.sql` — junction table 마이그레이션 패턴 (STRICT, CASCADE, unixepoch())
  - `app/db/schema.server.ts:recordTags` — 기존 junction table Drizzle 정의 패턴 (복합 PK)
  - `app/db/schema.server.ts:collaborationMembers` — `role` 필드가 있는 junction table 패턴
  - `app/db/relations.server.ts` — 전체 relations 패턴

  **API/Type References**:
  - `app/db/schema.server.ts:records` — records 테이블 FK 참조
  - `app/db/schema.server.ts:learnerProfiles` — learner_profiles 테이블 FK 참조

  **Acceptance Criteria**:

  **QA Scenarios**:

  ```
  Scenario: 마이그레이션 적용 성공
    Tool: Bash
    Preconditions: 로컬 D1 데이터베이스 존재
    Steps:
      1. wrangler d1 migrations apply DB --local 실행
      2. exit code 0 확인
    Expected Result: 마이그레이션 성공, record_participants 테이블 생성
    Failure Indicators: SQL 에러, FK constraint 실패
    Evidence: .sisyphus/evidence/task-2-migration.txt

  Scenario: TypeScript 스키마 컴파일 확인
    Tool: Bash
    Preconditions: schema.server.ts, relations.server.ts 수정 완료
    Steps:
      1. pnpm typecheck 실행
      2. schema/relations 관련 에러 0개 확인
    Expected Result: 타입 체크 통과
    Failure Indicators: Drizzle 스키마 타입 에러
    Evidence: .sisyphus/evidence/task-2-typecheck.txt
  ```

  **Commit**: YES
  - Message: `feat(db): record_participants 테이블 추가`
  - Files: `drizzle/migrations/0010_add_record_participants.sql`, `app/db/schema.server.ts`, `app/db/relations.server.ts`
  - Pre-commit: scoped typecheck — `pnpm typecheck 2>&1 | grep -E "(schema\.server|relations\.server)" | grep "error TS" | wc -l` → 0

- [x] 3. TagSelector 재사용 컴포넌트 추출

  **What to do**:
  - `app/components/TagSelector.tsx` 생성
  - `$recordSlug.edit.tsx` (386-426행)의 태그 체크박스 칩 UI를 재사용 컴포넌트로 추출
  - Props: `tags: Tag[]`, `selectedTagIds: string[]`, `name?: string` (기본값 `"tagIds"`)
  - 기존 스타일 유지: hidden checkbox + styled span chip, 선택 시 `border-ocean-blue bg-mist-blue text-ocean-blue`
  - `tags`가 빈 배열일 때 "등록된 태그가 없습니다" 빈 상태 표시
  - `<fieldset>`으로 감싸서 접근성 확보, `<legend>` 포함
  - 기존 edit.tsx와 details.tsx에서 인라인 코드를 `<TagSelector>` 컴포넌트로 교체

  **Must NOT do**:
  - 태그 생성/편집 UI 추가 금지 (admin만 가능)
  - 기존 동작 변경 금지 (리팩토링만)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 기존 코드 추출 + 2곳 교체. 새 로직 없음
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T1, T2, T4)
  - **Blocks**: T7, T8
  - **Blocked By**: None

  **References**:
  **Pattern References**:
  - `app/routes/public/logs/$recordSlug.edit.tsx:386-426` — 태그 체크박스 칩 원본 코드
  - `app/routes/public/logs/$recordSlug.details.tsx:253-288` — 동일 패턴 두 번째 사용처
  - `app/db/queries/records/tags.server.ts:getAllTags` — Tag 타입 정의 확인

  **Acceptance Criteria**:

  **QA Scenarios**:

  ```
  Scenario: TagSelector 컴포넌트 렌더링 (태그 있음)
    Tool: Bash
    Preconditions: TagSelector 컴포넌트 생성 완료
    Steps:
      1. pnpm typecheck 실행
      2. edit.tsx, details.tsx에서 TagSelector 임포트 확인
      3. 기존 인라인 태그 코드가 제거되고 <TagSelector> 로 교체됨 확인
    Expected Result: 타입 체크 통과, 기존 2곳에서 TagSelector 사용
    Failure Indicators: TagSelector import 에러, 기존 인라인 코드 잔존
    Evidence: .sisyphus/evidence/task-3-typecheck.txt

  Scenario: TagSelector 빈 상태 처리
    Tool: Bash (grep)
    Preconditions: TagSelector.tsx 생성 완료
    Steps:
      1. TagSelector.tsx에서 빈 배열 처리 코드 확인
      2. "등록된 태그가 없습니다" 텍스트 존재 확인
    Expected Result: 빈 상태 안내 문구 포함
    Failure Indicators: 빈 배열 시 아무것도 렌더링 안 됨
    Evidence: .sisyphus/evidence/task-3-empty-state.txt
  ```

  **Commit**: YES
  - Message: `feat(components): TagSelector 재사용 컴포넌트 추출`
  - Files: `app/components/TagSelector.tsx`, `app/routes/public/logs/$recordSlug.edit.tsx`, `app/routes/public/logs/$recordSlug.details.tsx`
  - Pre-commit: scoped typecheck — `pnpm typecheck 2>&1 | grep -E "(TagSelector|recordSlug)" | grep "error TS" | wc -l` → 0

- [x] 4. PersonSearch 자동완성 컴포넌트 신규

  **What to do**:
  - `app/components/PersonSearch.tsx` 생성
  - 기능:
    - 텍스트 입력 → 300ms 디바운스 → `/api/search-learners?q=` fetch → 드롭다운 결과 표시
    - **API 응답 형식**: `{ results: {id, slug, displayName, profilePhotoUrl}[] }` — 반드시 `response.results`로 배열 접근
    - 최소 입력 2자 이상에서 검색 시작 (한글 1자 = 1 character, "김"은 1자이므로 불충분)
    - 결과에서 선택 → 칩으로 추가 (아바타 + 이름 + 제거 버튼)
    - 이미 선택된 사람은 결과에서 제외
    - 작성자 본인은 결과에서 제외 (`excludeUserId` prop)
  - Props:
    - `selectedPeople: {userId: string, displayName: string, profilePhotoUrl: string | null}[]`
    - `label: string` (예: "함께하는 사람", "언급된 사람")
    - `name: string` (hidden input name)
    - `excludeUserId?: string` (작성자 ID 제외용)
    - `roleOptions?: {value: string, label: string}[]` (역할 선택 — 함께하는 사람에만 사용)
  - 역할 선택 (roleOptions 존재 시):
    - 사람 선택 후 역할 드롭다운 표시 (공동작성 / 함께활동 / 멘토)
    - hidden input: `name` 값으로 JSON 배열 전송 `[{userId, role}]`
  - 역할 없음 (roleOptions 미존재 시):
    - hidden input: `name` 값으로 userId 배열 전송
  - 스타일: Quiet Depth 디자인 — 얇은 border, 충분한 여백, focus ring
  - 접근성: aria-label, keyboard navigation (↑↓ 선택, Enter 확정, Escape 닫기)
  - 드롭다운: 검색 결과가 없을 때 "검색 결과가 없습니다" 표시
  - 모바일: 드롭다운 위치 조정, 터치 타겟 44px↑

  **Must NOT do**:
  - textarea 내 인라인 @-자동완성 (별도 입력 필드만)
  - `/api/search-learners` API 수정 (기존 그대로 사용)
  - 새로운 사람 생성 UI

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 새 컴포넌트, 디바운스 fetch, 드롭다운, 키보드 내비게이션, 역할 선택 등 복합 로직
  - **Skills**: [`frontend-design`]
    - `frontend-design`: 자동완성 드롭다운 + 칩 UI는 정교한 인터랙션 디자인 필요

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T1, T2, T3)
  - **Blocks**: T9, T10, T12
  - **Blocked By**: None

  **References**:
  **API/Type References**:
  - `app/routes/api/search-learners.tsx` — API 엔드포인트 (GET, ?q= 파라미터, **응답: `{ results: {id, slug, displayName, profilePhotoUrl}[] }`**, limit 8, 반드시 `response.results`로 접근)
  - `app/db/schema.server.ts:learnerProfiles` — learner 데이터 구조

  **Pattern References**:
  - `app/routes/public/logs/$recordSlug.edit.tsx:386-426` — 칩 스타일 패턴 (border-ocean-blue, bg-mist-blue)
  - `app/components/cards/SceneCard.tsx` — 기존 카드 스타일 톤 참조

  **External References**:
  - Quiet Depth 디자인: `.docs/design.md` — 폼/입력 디자인 가이드라인 (focus ring, border, radius)

  **Acceptance Criteria**:

  **QA Scenarios**:

  > NOTE: 이 태스크는 독립 컴포넌트 생성이므로 마운트할 라우트가 아직 없음.
  > 인터랙티브 QA(Playwright)는 T9/T10에서 실제 폼에 통합된 후 실행.
  > 이 태스크의 QA는 빌드 + 구조 검증에 집중.

  ```
  Scenario: TypeScript 컴파일 + export 검증
    Tool: Bash
    Preconditions: PersonSearch.tsx 생성 완료
    Steps:
      1. pnpm typecheck 실행 → 에러 0건 확인
      2. grep -c "export" app/components/PersonSearch.tsx → default export 또는 named export 존재 확인
      3. grep "response.results" app/components/PersonSearch.tsx → API 응답에서 results 배열 접근 확인
    Expected Result: 타입 체크 통과, export 존재, API 파싱 올바름
    Failure Indicators: 타입 에러, export 없음, response를 직접 배열로 사용
    Evidence: .sisyphus/evidence/task-4-typecheck.txt

  Scenario: 핵심 기능 구현 확인
    Tool: Bash (grep)
    Preconditions: PersonSearch.tsx 생성 완료
    Steps:
      1. grep "debounce\|setTimeout\|300" app/components/PersonSearch.tsx → 디바운스 로직 존재
      2. grep "excludeUserId\|exclude" app/components/PersonSearch.tsx → 작성자 제외 로직 존재
      3. grep "roleOptions\|role" app/components/PersonSearch.tsx → 역할 선택 지원
      4. grep "ArrowDown\|ArrowUp\|Escape\|keydown\|onKeyDown" app/components/PersonSearch.tsx → 키보드 내비게이션
      5. grep "검색 결과가 없습니다\|결과 없\|no.result" app/components/PersonSearch.tsx → 빈 결과 처리
    Expected Result: 디바운스, 제외, 역할, 키보드, 빈 결과 모두 구현됨
    Failure Indicators: 핵심 기능 코드 미존재
    Evidence: .sisyphus/evidence/task-4-feature-check.txt

  Scenario: 통합 인터랙션 QA (T9/T10에서 실행)
    Tool: Playwright
    Preconditions: T9 또는 T10 완료 후 /write/note 또는 /write/article에 PersonSearch 마운트됨
    Steps:
      1. /write/note 이동
      2. "함께하는 사람" PersonSearch에 "김성" 입력 (2자 이상)
      3. 300ms 후 드롭다운 결과 표시 확인
      4. 결과 클릭 → 칩 추가 확인
      5. "zzzzzzzzz" 입력 → "검색 결과가 없습니다" 표시 확인
      6. ArrowDown → Enter → 키보드 선택 확인
    Expected Result: 검색, 선택, 빈 결과, 키보드 모두 동작
    Failure Indicators: 드롭다운 미표시, API 파싱 에러
    Evidence: .sisyphus/evidence/task-4-integration-qa.png
    NOTE: 이 시나리오는 T9/T10 QA 시 함께 실행
  ```

  **Commit**: YES
  - Message: `feat(components): PersonSearch 자동완성 컴포넌트`
  - Files: `app/components/PersonSearch.tsx`
  - Pre-commit: scoped typecheck — `pnpm typecheck 2>&1 | grep "PersonSearch" | grep "error TS" | wc -l` → 0

- [x] 5. Participant 쿼리 모듈 + TDD 테스트

  **What to do**:
  - **RED 먼저**: `app/db/queries/__tests__/participants.test.ts` 테스트 작성 (기존 테스트와 같은 디렉토리)
  - **GREEN**: `app/db/queries/records/participants.server.ts` 구현
  - 함수 목록:
    - `getParticipantsByRecord(d1, recordId)` → 참여자 목록 (displayName, profilePhotoUrl, role, createdAt)
    - `syncParticipantsForRecord(d1, recordId, participants: {userId: string, role: string}[], addedById: string)` → 전체 삭제 후 재삽입 패턴
    - `getRecordsWithParticipant(d1, userId, limit?, offset?)` → 특정 사용자가 참여한 기록 목록 (프로필 페이지용)
    - `getParticipantCountByRecord(d1, recordId)` → 참여자 수 (SceneCard용)
    - `getParticipantsBatch(d1, recordIds: string[])` → 여러 기록의 참여자를 한 번에 로드 (N+1 방지, SceneCard 목록용)
  - 기존 `syncMentionsForRecord` delete-all-then-insert 패턴 따르기
  - 작성자 본인이 참여자로 추가되는 것 방지 (recordId로 records.authorId 조회 후 필터)
  - 타입 export: `RecordParticipant`, `ParticipantWithProfile`

  **Must NOT do**:
  - 권한 검사 로직 추가 금지 (쿼리 레이어는 순수 데이터 접근)
  - N+1 쿼리 패턴 금지 — `getParticipantsBatch`는 `WHERE record_id IN (...)` 사용

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: TDD 패턴, 5개 쿼리 함수 + 배치 로딩 로직, 테스트 작성 포함
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T6, T7, T8)
  - **Blocks**: T9, T10, T11, T12, T13, T14, T15
  - **Blocked By**: T2 (스키마 필요)

  **References**:
  **Pattern References**:
  - `app/db/queries/records/tags.server.ts` — 쿼리 모듈 구조 패턴 (export 함수, Drizzle 쿼리, 타입)
  - `app/db/queries/dialogue/mentions.server.ts:syncMentionsForRecord` — delete-all-then-insert 동기화 패턴
  - `app/db/queries/__tests__/records.test.ts` — 기존 테스트 파일 구조 및 vi.mock 패턴 (모든 쿼리 테스트가 이 디렉토리에 위치)

  **API/Type References**:
  - `app/db/schema.server.ts:recordParticipants` — T2에서 생성할 테이블 정의
  - `app/db/schema.server.ts:learnerProfiles` — JOIN 대상 테이블

  **Acceptance Criteria**:

  **If TDD**:
  - [ ] 테스트 파일: `app/db/queries/__tests__/participants.test.ts`
  - [ ] `pnpm test` → 신규 테스트 ALL PASS

  **QA Scenarios**:

  ```
  Scenario: 참여자 CRUD 테스트 통과
    Tool: Bash
    Preconditions: T2 마이그레이션 적용 완료
    Steps:
      1. pnpm test app/db/queries/__tests__/participants.test.ts 실행
      2. 모든 테스트 케이스 PASS 확인
    Expected Result: syncParticipants, getParticipants, getBatch 등 모든 함수 테스트 통과
    Failure Indicators: 테스트 실패, 타입 에러
    Evidence: .sisyphus/evidence/task-5-test-results.txt

  Scenario: 작성자 본인 참여자 추가 방지
    Tool: Bash (vitest)
    Preconditions: 테스트에 작성자=참여자 케이스 포함
    Steps:
      1. syncParticipantsForRecord에 작성자 ID를 참여자로 전달
      2. getParticipantsByRecord 호출 시 작성자가 목록에 없음 확인
    Expected Result: 작성자는 참여자 목록에서 제외
    Failure Indicators: 작성자가 참여자로 저장됨
    Evidence: .sisyphus/evidence/task-5-author-exclusion.txt
  ```

  **Commit**: YES
  - Message: `feat(queries): participant 쿼리 모듈 + 테스트`
  - Files: `app/db/queries/records/participants.server.ts`, `app/db/queries/__tests__/participants.test.ts`
  - Pre-commit: `pnpm test`

- [ ] 6. Mention 쿼리 업데이트 + TDD 테스트

  **What to do**:
  - **RED 먼저**: `app/db/queries/__tests__/mentions.test.ts` 테스트 작성 (기존 테스트와 같은 디렉토리)
  - **GREEN**: `app/db/queries/dialogue/mentions.server.ts` 수정
  - 추가/수정 함수:
    - `syncAllMentionsForRecord(d1, recordId, explicitUserIds: string[], content: string, mentionedById: string)` — **기존 `syncMentionsForRecord`를 대체하는 통합 함수**:
      1. 명시 UI에서 선택된 userIds 수집
      2. content에서 `@username` regex로 추출된 userIds 수집
      3. 두 소스를 **Set으로 병합** (중복 제거)
      4. 해당 record의 기존 mentions 전체 삭제
      5. 병합된 userId 전체를 한 번에 INSERT
      → 이 방식으로 "전체 삭제 후 재삽입" 패턴을 1회만 실행하여, 기존 `syncMentionsForRecord`의 delete-all이 explicit mentions를 지우는 문제를 근본 방지
    - 기존 `syncMentionsForRecord` 함수는 **deprecated 처리** (기존 호출 사이트를 `syncAllMentionsForRecord`로 교체)
    - `getRecordsWithMention(d1, userId, limit?, offset?)` — 특정 사용자가 언급된 기록 목록 (프로필 페이지용)
    - `getMentionsBatch(d1, recordIds: string[])` — 여러 기록의 mentions 배치 로드
  - **핵심**: 절대로 explicit sync와 regex sync를 별도 호출하지 않음. 하나의 `syncAllMentionsForRecord`가 모든 소스를 병합 후 1회 delete+insert
  - 타입 export: `MentionWithProfile`

  **Must NOT do**:
  - 기존 `syncMentionsForRecord` 삭제 금지 (regex 추출 기능 유지)
  - 기존 테스트 깨뜨리지 않기

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 기존 패턴에 2-3개 함수 추가, 기존 코드 구조 따름
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T5, T7, T8)
  - **Blocks**: T9, T10, T11, T12, T13, T15
  - **Blocked By**: None

  **References**:
  **Pattern References**:
  - `app/db/queries/dialogue/mentions.server.ts` — 기존 mentions 모듈 전체 (syncMentionsForRecord, getMentionsByRecord, getMentionsOfUser)
  - `app/db/queries/records/tags.server.ts:getRecordsByTag` — visibility 필터링 포함 목록 쿼리 패턴

  **Acceptance Criteria**:

  **If TDD**:
  - [ ] 테스트 파일: `app/db/queries/__tests__/mentions.test.ts`
  - [ ] `pnpm test` → 신규 + 기존 테스트 ALL PASS

  **QA Scenarios**:

  ```
  Scenario: 통합 mentions 병합 (explicit + regex)
    Tool: Bash (vitest)
    Preconditions: 테스트에 동일 유저가 명시 + regex 양쪽에 존재하는 케이스 포함
    Steps:
      1. syncAllMentionsForRecord(d1, recordId, explicitUserIds=["A", "B"], content="@A와 @C가 참여", mentionedById) 호출
      2. getMentionsByRecord(d1, recordId) 호출
      3. 결과에서 유저 ID 목록 확인
    Expected Result: A, B, C 각 1건씩 = 3건 (A는 explicit+regex 중복이나 Set으로 1건만)
    Failure Indicators: A가 2건 저장, 에러 발생, explicit mentions 누락
    Evidence: .sisyphus/evidence/task-6-mention-merge.txt

  Scenario: regex만 있는 경우 (하위 호환)
    Tool: Bash (vitest)
    Steps:
      1. syncAllMentionsForRecord(d1, recordId, explicitUserIds=[], content="@A가 좋은 기록을 남김", mentionedById) 호출
      2. getMentionsByRecord → A 1건 확인
    Expected Result: explicit 없어도 regex로 정상 추출
    Failure Indicators: mentions 0건
    Evidence: .sisyphus/evidence/task-6-regex-only.txt
  ```

  **Commit**: YES
  - Message: `feat(queries): mention 쿼리 업데이트 + 테스트`
  - Files: `app/db/queries/dialogue/mentions.server.ts`, `app/db/queries/__tests__/mentions.test.ts`
  - Pre-commit: `pnpm test`

- [ ] 7. Note 생성 폼에 태그 선택 추가

  **What to do**:
  - `app/routes/public/write/note.tsx` 수정:
    - **Loader**: `getAllTags(d1)` 호출 추가, tags 반환
    - **Form**: TagSelector 컴포넌트 추가 (본문 아래, 접을 수 있는 "부가 정보" 섹션)
    - **Action**: `formData.getAll("tagIds")` 파싱 → record 생성 후 `recordTags` INSERT
    - **Validation**: `createNoteSchema`에 `tagIds: z.array(z.string()).optional()` 추가
  - 부가 정보 섹션 디자인:
    - `<details>` 또는 collapsible 패턴
    - 제목: "부가 정보" (기본 닫힘 또는 열림은 태그가 있을 때만)
    - 태그 선택은 이 섹션 안에 배치
  - 폼 검증 실패 시 선택한 태그 유지 (defaultValue 처리)

  **Must NOT do**:
  - 태그 생성 UI 추가 금지
  - 참여자/언급 UI는 이 태스크에서 추가하지 않음 (T9에서)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 기존 패턴(edit.tsx) 따라 loader + form + action 수정
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T5, T6, T8)
  - **Blocks**: None
  - **Blocked By**: T3 (TagSelector 컴포넌트)

  **References**:
  **Pattern References**:
  - `app/routes/public/logs/$recordSlug.edit.tsx` — 태그 로딩 + action에서 recordTags INSERT 패턴 (loader에서 getAllTags, action에서 formData.getAll("tagIds") → delete all → insert)
  - `app/routes/public/write/note.tsx` — 현재 note 생성 폼 전체 구조

  **API/Type References**:
  - `app/db/queries/records/tags.server.ts:getAllTags` — 태그 로딩 함수
  - `app/lib/auth/validation.ts` — createNoteSchema 위치

  **Acceptance Criteria**:

  **QA Scenarios**:

  ```
  Scenario: Note 생성 시 태그 선택
    Tool: Playwright
    Preconditions: 로컬 서버 실행, 인증 상태, 태그 1개 이상 존재
    Steps:
      1. /write/note 페이지 이동
      2. 태그 섹션 존재 확인
      3. 태그 1개 이상 선택 (칩 클릭)
      4. content 입력 후 제출
      5. 생성된 기록 상세 페이지에서 태그 표시 확인
    Expected Result: 태그 선택 → 저장 → 상세에서 태그 표시
    Failure Indicators: 태그 섹션 없음, 저장 후 태그 미연결
    Evidence: .sisyphus/evidence/task-7-note-tags.png

  Scenario: 태그 없이 Note 생성 (선택 안 함)
    Tool: Playwright
    Steps:
      1. /write/note에서 태그 선택하지 않고 제출
      2. 정상 생성 확인
    Expected Result: 태그 없이도 정상 생성
    Failure Indicators: 태그 필수 에러
    Evidence: .sisyphus/evidence/task-7-note-no-tags.png
  ```

  **Commit**: YES (T8과 함께)
  - Message: `feat(write): note/article 생성 폼에 태그 선택 추가`
  - Files: `app/routes/public/write/note.tsx`, `app/routes/public/write/article.tsx`
  - Pre-commit: scoped typecheck — `pnpm typecheck 2>&1 | grep -E "(note\.tsx|article\.tsx)" | grep "error TS" | wc -l` → 0

- [ ] 8. Article 생성 폼에 태그 선택 추가

  **What to do**:
  - `app/routes/public/write/article.tsx` 수정 — T7과 동일한 패턴:
    - **Loader**: `getAllTags(d1)` 호출 추가
    - **Form**: TagSelector 컴포넌트 추가 (부가 정보 섹션)
    - **Action**: `formData.getAll("tagIds")` → recordTags INSERT
    - **Validation**: `createArticleSchema`에 `tagIds: z.array(z.string()).optional()` 추가
  - 부가 정보 섹션: article에는 이미 rhythm, recordedAt 등 부가 필드가 있으므로, 기존 부가 필드 영역에 태그 추가

  **Must NOT do**:
  - T7과 동일한 제약

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: T7과 동일 패턴, article 폼에 적용
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T5, T6, T7)
  - **Blocks**: None
  - **Blocked By**: T3 (TagSelector 컴포넌트)

  **References**:
  **Pattern References**:
  - `app/routes/public/write/article.tsx` — 현재 article 생성 폼 전체 구조
  - T7의 note.tsx 수정 결과 — 동일 패턴 참조

  **Acceptance Criteria**:

  **QA Scenarios**:

  ```
  Scenario: Article 생성 시 태그 선택
    Tool: Playwright
    Preconditions: 로컬 서버 실행, 인증 상태, 태그 존재
    Steps:
      1. /write/article 페이지 이동
      2. 태그 섹션 존재 확인
      3. 태그 2개 선택
      4. title, content 입력 후 제출
      5. 생성된 기록 상세에서 태그 2개 표시 확인
    Expected Result: 복수 태그 선택 → 저장 → 표시
    Failure Indicators: 태그 미저장 또는 1개만 저장
    Evidence: .sisyphus/evidence/task-8-article-tags.png
  ```

  **Commit**: YES (T7과 함께)
  - Message: `feat(write): note/article 생성 폼에 태그 선택 추가`
  - Files: `app/routes/public/write/article.tsx`
  - Pre-commit: scoped typecheck (T7과 동일)

- [ ] 9. Note 생성 폼에 참여자·언급 선택 추가

  **What to do**:
  - `app/routes/public/write/note.tsx` 수정:
    - **Loader**: 현재 사용자 정보(userId) 전달 (PersonSearch의 excludeUserId용)
    - **Form**: 부가 정보 섹션에 PersonSearch 2개 추가:
      1. "함께하는 사람" — `roleOptions`와 함께 (`coauthor`/`companion`/`mentor`)
      2. "언급된 사람" — `roleOptions` 없이
    - **Action**:
      - `participantsJson` 파싱 → `syncParticipantsForRecord(d1, recordId, participants, authorId)`
      - `mentionUserIds` 파싱 → `syncAllMentionsForRecord(d1, recordId, mentionUserIds, content, authorId)` 호출 (explicit + regex 통합 함수, T6에서 구현)
      - 기존 `syncMentionsForRecord` 호출을 `syncAllMentionsForRecord`로 교체
      - 참여자·언급 알림 생성 (T13에서 구현할 함수 호출 — 이 시점에서는 빈 함수 또는 직접 createNotification)
  - 부가 정보 섹션 순서: 태그 → 함께하는 사람 → 언급된 사람
  - 각 PersonSearch 사이에 적절한 간격과 라벨

  **Must NOT do**:
  - textarea 내 인라인 @-자동완성 금지
  - 참여자 역할에 따른 권한 차이 금지

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: PersonSearch 통합, JSON 파싱, 다중 sync 함수 호출, 폼 데이터 구조 설계
  - **Skills**: [`frontend-design`]
    - `frontend-design`: 부가 정보 섹션 레이아웃과 복수 PersonSearch 배치

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with T10, T11, T12, T13)
  - **Blocks**: None
  - **Blocked By**: T4 (PersonSearch), T5 (participant queries), T6 (mention queries)

  **References**:
  **Pattern References**:
  - `app/routes/public/write/note.tsx` — 현재 note 폼 (T7 수정 후 상태)
  - `app/routes/public/logs/$recordSlug.edit.tsx` — action에서 mentions sync 패턴 참조

  **API/Type References**:
  - `app/db/queries/records/participants.server.ts:syncParticipantsForRecord` — T5에서 구현
  - `app/db/queries/dialogue/mentions.server.ts:syncAllMentionsForRecord` — T6에서 구현 (explicit + regex 통합 함수)
  - `app/components/PersonSearch.tsx` — T4에서 구현

  **Acceptance Criteria**:

  **QA Scenarios**:

  ```
  Scenario: Note 생성 시 함께하는 사람 + 언급된 사람 선택
    Tool: Playwright
    Preconditions: 로컬 서버 실행, 인증 상태, learner 2명 이상 존재
    Steps:
      1. /write/note 페이지 이동
      2. "함께하는 사람" 섹션에서 Learner 검색 → 1명 선택 → 역할 "공동작성" 선택
      3. "언급된 사람" 섹션에서 다른 Learner 검색 → 1명 선택
      4. content 입력 후 제출
      5. 생성된 기록 상세에서 참여자·언급 표시 확인 (T11 완료 후)
    Expected Result: 참여자와 언급이 정상 저장
    Failure Indicators: PersonSearch 미표시, 저장 실패
    Evidence: .sisyphus/evidence/task-9-note-people.png

  Scenario: 사람 없이 Note 생성
    Tool: Playwright
    Steps:
      1. /write/note에서 참여자·언급 선택하지 않고 제출
      2. 정상 생성 확인
    Expected Result: 선택 없이도 정상 생성 (선택은 optional)
    Failure Indicators: 필수 에러
    Evidence: .sisyphus/evidence/task-9-note-no-people.png
  ```

  **Commit**: YES (T10과 함께)
  - Message: `feat(write): note/article에 참여자·언급 선택 추가`
  - Files: `app/routes/public/write/note.tsx`
  - Pre-commit: scoped typecheck — `pnpm typecheck 2>&1 | grep "note\.tsx" | grep "error TS" | wc -l` → 0

- [ ] 10. Article 생성 폼에 참여자·언급 선택 추가

  **What to do**:
  - `app/routes/public/write/article.tsx` 수정 — T9와 동일 패턴:
    - Loader에 userId 전달
    - Form에 PersonSearch 2개 (함께하는 사람 + 언급된 사람)
    - Action에서 participants sync + `syncAllMentionsForRecord` (explicit + regex 통합)
  - article은 note보다 필드가 많으므로, 부가 정보 섹션에 적절히 배치

  **Must NOT do**:
  - T9와 동일한 제약

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: T9와 동일 복잡도, article 폼에 적용
  - **Skills**: [`frontend-design`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with T9, T11, T12, T13)
  - **Blocks**: None
  - **Blocked By**: T4, T5, T6

  **References**:
  **Pattern References**:
  - `app/routes/public/write/article.tsx` — 현재 article 폼 (T8 수정 후 상태)
  - T9의 note.tsx 수정 결과 — 동일 패턴 참조

  **Acceptance Criteria**:

  **QA Scenarios**:

  ```
  Scenario: Article 생성 시 멘토 역할 참여자 저장 확인
    Tool: Bash
    Preconditions: 로컬 서버 실행, learner 존재, 마이그레이션 적용
    Steps:
      1. /write/article에서 참여자(멘토 역할) 포함하여 article 제출 (Playwright로 폼 작성 + 제출)
      2. 제출 후 리다이렉트된 URL에서 recordSlug 추출
      3. wrangler d1 execute DB --local --command="SELECT rp.role, lp.display_name FROM record_participants rp JOIN learner_profiles lp ON rp.participant_user_id = lp.user_id JOIN records r ON rp.record_id = r.id WHERE r.slug = '{recordSlug}'" 실행
      4. 결과에서 role = "mentor" 행 존재 확인
    Expected Result: record_participants에 role="mentor" 데이터 저장됨
    Failure Indicators: role이 기본값 "companion"으로 저장, 참여자 행 없음
    Evidence: .sisyphus/evidence/task-10-article-mentor-db.txt

  Scenario: Article 생성 시 참여자 없이 정상 동작
    Tool: Playwright
    Steps:
      1. /write/article에서 참여자 선택 없이 title + content 입력 후 제출
      2. 정상 리다이렉트 확인 (에러 없음)
    Expected Result: 참여자 없이도 정상 생성
    Failure Indicators: 필수 에러 발생
    Evidence: .sisyphus/evidence/task-10-article-no-participants.png
  ```

  **Commit**: YES (T9와 함께)
  - Message: `feat(write): note/article에 참여자·언급 선택 추가`
  - Files: `app/routes/public/write/article.tsx`
  - Pre-commit: scoped typecheck (T9와 동일)

- [ ] 11. 기록 상세 페이지에 참여자·언급 표시

  **What to do**:
  - `app/routes/public/logs/$recordSlug.server.ts` (loader) 수정:
    - `getParticipantsByRecord(d1, recordId)` 호출 추가
    - `getMentionsByRecord(d1, recordId)` 호출 추가 (기존 미호출)
    - 반환 데이터에 `participants`, `mentions` 추가
  - `app/routes/public/logs/$recordSlug.tsx` (컴포넌트) 수정:
    - 기존 사이드바 태그 섹션 아래에 추가:
    - **"함께한 사람" 섹션**: 역할별 그룹핑 → 각 사람 표시 (아바타 + 이름 + 역할 뱃지)
      - 역할 뱃지: 공동작성=`text-ocean-blue`, 함께활동=`text-text-secondary`, 멘토=`text-reef-cyan`
    - **"언급된 사람" 섹션**: 사람 목록 (아바타 + 이름, 클릭 시 프로필 링크)
    - 각 사람 이름은 `/learners/:slug` 링크
    - 섹션이 비어있으면 해당 섹션 숨김
  - Quiet Depth 디자인 준수:
    - 사이드바 톤과 일관, 여백 충분
    - 프로필 아바타 fallback: 이니셜 원형 (profilePhotoUrl 없을 때)
    - 역할 뱃지는 작고 조용하게 (meta 크기, 500 weight)

  **Must NOT do**:
  - 참여자 수 기반 강조/하이라이트 금지
  - 참여자/언급 정렬에 인기순 사용 금지

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: UI 표시 섹션 디자인, 아바타 + 역할 뱃지 + 링크 스타일링
  - **Skills**: [`frontend-design`]
    - `frontend-design`: Quiet Depth 디자인에 맞는 사람 섹션 UI

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with T9, T10, T12, T13)
  - **Blocks**: T14
  - **Blocked By**: T5 (participant queries), T6 (mention queries)

  **References**:
  **Pattern References**:
  - `app/routes/public/logs/$recordSlug.tsx:883-895` — 기존 사이드바 태그 표시 패턴
  - `app/routes/public/logs/$recordSlug.server.ts:111` — loader에서 태그 쿼리 호출 패턴
  - `app/components/cards/LearnerCard.tsx` — 아바타 + 이름 표시 패턴

  **External References**:
  - `.docs/design.md` — Quiet Depth 사이드바 디자인, 아바타 스타일, 역할 뱃지 톤

  **Acceptance Criteria**:

  **QA Scenarios**:

  ```
  Scenario: 참여자 있는 기록 상세 표시
    Tool: Playwright
    Preconditions: 참여자가 있는 기록 존재 (T9/T10에서 생성)
    Steps:
      1. /logs/:recordSlug 페이지 이동
      2. 사이드바에서 "함께한 사람" 섹션 확인
      3. 참여자 아바타, 이름, 역할 뱃지 표시 확인
      4. 이름 클릭 → /learners/:slug 이동 확인
    Expected Result: 참여자가 역할별로 그룹핑되어 표시, 프로필 링크 동작
    Failure Indicators: 섹션 미표시, 역할 뱃지 없음
    Evidence: .sisyphus/evidence/task-11-detail-participants.png

  Scenario: 참여자·언급 없는 기록은 섹션 숨김
    Tool: Playwright
    Preconditions: 참여자·언급 없는 기록 존재
    Steps:
      1. 해당 기록 상세 이동
      2. "함께한 사람" / "언급된 사람" 섹션 미표시 확인
    Expected Result: 빈 섹션은 렌더링되지 않음
    Failure Indicators: 빈 섹션 헤더가 보임
    Evidence: .sisyphus/evidence/task-11-empty-sections.png
  ```

  **Commit**: YES
  - Message: `feat(display): 기록 상세에 참여자·언급 섹션`
  - Files: `app/routes/public/logs/$recordSlug.tsx`, `app/routes/public/logs/$recordSlug.server.ts`
  - Pre-commit: scoped typecheck — `pnpm typecheck 2>&1 | grep "recordSlug" | grep "error TS" | wc -l` → 0

- [ ] 12. 편집 폼에 참여자·언급 수정 UI

  **What to do**:
  - `app/routes/public/logs/$recordSlug.edit.tsx` 수정:
    - **Loader**: `getParticipantsByRecord`, `getMentionsByRecord` 호출 추가
    - **Form**: TagSelector 아래에 PersonSearch 2개 추가:
      1. "함께하는 사람" — 기존 참여자를 `selectedPeople`로 전달, 역할 포함
      2. "언급된 사람" — 기존 언급을 `selectedPeople`로 전달
    - **Action**: `syncParticipantsForRecord` + `syncAllMentionsForRecord` 추가 (기존 tags sync와 공존, 기존 `syncMentionsForRecord` 호출을 `syncAllMentionsForRecord`로 교체)
    - **Revision history**: `changedFields`에 `participants`, `mentions` 추가 가능하도록
  - `app/routes/public/logs/$recordSlug.details.tsx` 수정:
    - 동일하게 참여자·언급 수정 UI 추가 (details 페이지에서도 메타데이터 수정 가능)

  **Must NOT do**:
  - 참여자 역할 변경에 따른 알림 발송 (이 태스크에서는 저장만)
  - 기존 edit 동작 변경 금지

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 기존 복잡한 edit 폼에 2개 PersonSearch 통합, 기존 로직과 공존
  - **Skills**: [`frontend-design`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with T9, T10, T11, T13)
  - **Blocks**: None
  - **Blocked By**: T4, T5, T6

  **References**:
  **Pattern References**:
  - `app/routes/public/logs/$recordSlug.edit.tsx` — 현재 edit 전체 구조 (T3에서 TagSelector 교체 후)
  - `app/routes/public/logs/$recordSlug.details.tsx` — 현재 details 전체 구조

  **Acceptance Criteria**:

  **QA Scenarios**:

  ```
  Scenario: 기존 기록 편집 시 참여자 수정
    Tool: Playwright
    Preconditions: 참여자가 있는 기록 존재
    Steps:
      1. /logs/:slug/edit 이동
      2. 기존 참여자가 칩으로 표시됨 확인
      3. 새 참여자 추가 (검색 → 선택)
      4. 기존 참여자 1명 제거 (X 클릭)
      5. 저장
      6. 상세 페이지에서 변경 반영 확인
    Expected Result: 참여자 추가/제거 후 저장 → 반영
    Failure Indicators: 기존 참여자 미로딩, 변경 미저장
    Evidence: .sisyphus/evidence/task-12-edit-participants.png
  ```

  **Commit**: YES
  - Message: `feat(edit): 편집 폼에 참여자·언급 수정 UI`
  - Files: `app/routes/public/logs/$recordSlug.edit.tsx`, `app/routes/public/logs/$recordSlug.details.tsx`
  - Pre-commit: scoped typecheck — `pnpm typecheck 2>&1 | grep "recordSlug" | grep "error TS" | wc -l` → 0

- [ ] 13. 참여자·언급 알림 + 중복 제거

  **What to do**:
  - 알림 생성 로직 구현 (쿼리 유틸리티 또는 write action 내):
    - 참여자 추가 시: `"X님이 기록 '{title}'에 당신을 {역할명}(으)로 추가했습니다"`
    - 언급 추가 시: `"X님이 기록 '{title}'에서 당신을 언급했습니다"`
  - **중복 제거 로직** (핵심):
    - 동일 `(recipientId, recordId)` 조합에 대해 1건만 발송
    - 우선순위: 참여자 알림 > 언급 알림 (같은 사람이 양쪽이면 참여자 알림만)
    - `createNotification` 호출 전 기존 알림 조회 → 중복 시 스킵
  - 역할명 매핑: `coauthor` → "공동작성자", `companion` → "함께한 사람", `mentor` → "멘토"
  - 기존 mention regex 기반 알림과도 중복 제거 필요
  - write action (note.tsx, article.tsx)에서 알림 생성 호출 추가
  - edit action에서도 새로 추가된 참여자/언급에 대해 알림 생성

  **Must NOT do**:
  - WebSocket/SSE 실시간 알림 금지
  - 참여자 제거 시 알림 발송 금지

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 기존 createNotification 패턴 따르기, 중복 체크 로직 추가
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with T9, T10, T11, T12)
  - **Blocks**: None
  - **Blocked By**: T5, T6

  **References**:
  **Pattern References**:
  - `app/db/queries/social/notifications.server.ts:68` — `createNotification` 기존 알림 생성 함수 (정확한 경로: `social/` 하위)
  - `app/routes/public/write/note.tsx` — 기존 mention 알림 생성 패턴 (action 내)

  **Acceptance Criteria**:

  **If TDD**:
  - [ ] 알림 중복 제거 테스트 작성
  - [ ] `pnpm test` → ALL PASS

  **QA Scenarios**:

  ```
  Scenario: 참여자 + 언급 동일 인물 알림 중복 제거
    Tool: Bash (vitest)
    Preconditions: User A를 참여자이자 언급으로 추가
    Steps:
      1. 기록 생성 시 User A를 participant + mention 모두에 포함
      2. notifications 테이블 조회
      3. User A에 대한 알림이 1건만 존재 확인
    Expected Result: 알림 1건 (참여자 알림 우선)
    Failure Indicators: 알림 2건 이상 생성
    Evidence: .sisyphus/evidence/task-13-dedup-notification.txt

  Scenario: 서로 다른 사람에 대한 알림 개별 생성
    Tool: Bash (vitest)
    Steps:
      1. User A를 참여자, User B를 언급으로 추가
      2. 알림 조회: A는 참여자 알림, B는 언급 알림
    Expected Result: 각각 1건씩 총 2건
    Failure Indicators: 알림 누락 또는 중복
    Evidence: .sisyphus/evidence/task-13-separate-notifications.txt
  ```

  **Commit**: YES
  - Message: `feat(notifications): 참여자·언급 알림 + 중복 제거`
  - Files: notification 관련 파일, note.tsx, article.tsx
  - Pre-commit: `pnpm test`

- [ ] 14. SceneCard 참여자 아바타 칩 + 배치 로딩

  **What to do**:
  - `app/components/cards/SceneCard.tsx` 수정:
    - Props에 `participants?: {displayName: string, profilePhotoUrl: string | null, role: string}[]` 추가
    - 카드 하단 author 영역 옆에 참여자 아바타 칩 표시:
      - 최대 3명: 겹치는 원형 아바타 (avatar stack)
      - 3명 초과: `+N명` 텍스트
      - 아바타 클릭 불가 (카드 전체 클릭이 우선)
    - 프로필 이미지 없을 때: 이니셜 원형 fallback
    - 0명일 때: 참여자 영역 숨김
  - 참여자 데이터 배치 로딩 (N+1 방지):
    - SceneCard를 사용하는 모든 로더에서 `getParticipantsBatch(d1, recordIds)` 호출
    - 주요 사용처 확인 (lsp_find_references로): `/logs/index.tsx`, `/learners/$learnerSlug.tsx`, `/tags/$tagSlug.tsx`, `/journey/$stageSlug.tsx` 등
    - 각 로더에서 records 로드 후 → recordIds 추출 → `getParticipantsBatch` → SceneCard에 전달
  - 스타일: 아바타 24x24px, -8px overlap, border 2px white

  **Must NOT do**:
  - 참여자 수 기반 카드 정렬/강조 금지
  - 각 카드마다 개별 쿼리 호출 금지 (반드시 배치)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: avatar stack UI + 다수 로더 파일 수정 + 성능 최적화
  - **Skills**: [`frontend-design`]
    - `frontend-design`: avatar stack 디자인, 겹침 효과, truncation UX

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with T15, T16)
  - **Blocks**: None
  - **Blocked By**: T5 (getParticipantsBatch)

  **References**:
  **Pattern References**:
  - `app/components/cards/SceneCard.tsx` — 현재 SceneCard 전체 구조, author 표시 영역
  - `app/db/queries/records/participants.server.ts:getParticipantsBatch` — T5에서 구현

  **WHY Each Reference Matters**:
  - SceneCard의 기존 레이아웃 구조를 이해해야 아바타 칩 배치 위치 결정 가능
  - `lsp_find_references`로 SceneCard 사용처를 모두 찾아 각 로더에 배치 로딩 추가 필요

  **Acceptance Criteria**:

  **QA Scenarios**:

  ```
  Scenario: SceneCard에 참여자 아바타 표시
    Tool: Playwright
    Preconditions: 참여자가 있는 기록이 목록에 포함
    Steps:
      1. /logs 페이지 이동
      2. 참여자 있는 카드에서 아바타 칩 확인 (원형 이미지/이니셜)
      3. 3명 초과 시 "+N명" 텍스트 확인
    Expected Result: 아바타 stack 표시, 3명 초과 시 truncation
    Failure Indicators: 아바타 미표시, N+1 쿼리 발생 (네트워크 탭 확인)
    Evidence: .sisyphus/evidence/task-14-scenecard-avatars.png

  Scenario: 참여자 없는 카드는 아바타 미표시
    Tool: Playwright
    Steps:
      1. /logs에서 참여자 없는 카드 확인
      2. 아바타 영역 비어있음 확인 (빈 공간 아닌 숨김)
    Expected Result: 참여자 0명이면 해당 영역 렌더링 안 됨
    Failure Indicators: 빈 아바타 placeholder 보임
    Evidence: .sisyphus/evidence/task-14-no-participants.png
  ```

  **Commit**: YES
  - Message: `feat(cards): SceneCard 참여자 아바타 칩`
  - Files: `app/components/cards/SceneCard.tsx`, 각 로더 파일들
  - Pre-commit: scoped typecheck — `pnpm typecheck 2>&1 | grep "SceneCard" | grep "error TS" | wc -l` → 0

- [ ] 15. Learner 프로필에 "함께한 글" / "언급된 글" 섹션

  **What to do**:
  - **Loader** (`app/routes/public/learners/$learnerSlug.server.ts` — 실제 loader 위치):
    - 추가 쿼리 호출:
      - `getRecordsWithParticipant(d1, userId, limit: 10)` — 함께한 글
      - `getRecordsWithMention(d1, userId, limit: 10)` — 언급된 글
    - 반환 데이터에 `participatedRecords`, `mentionedRecords` 추가
  - **Component** (`app/routes/public/learners/$learnerSlug.tsx`):
    - 기존 탭/섹션 아래에 새 섹션 추가:
      1. "함께한 기록" 섹션 — SceneCard 목록, 최신순, "더보기" 링크 (10개 초과 시)
      2. "언급된 기록" 섹션 — SceneCard 목록, 최신순
    - 각 섹션이 비어있으면 숨김 (빈 상태 메시지 불필요 — 프로필에서는 조용히 생략)
  - 본인 프로필에서만 보일지 / 타인 프로필에서도 보일지:
    - **둘 다 표시** — 단, visibility 필터 적용 (public 기록만 타인에게 보임)

  **Must NOT do**:
  - "함께한 글 N건" 등 카운트 뱃지/강조 금지
  - 프로필 탭 3개 초과 금지 (기존 2 + 새 섹션은 탭이 아닌 하단 섹션으로)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 프로필 페이지 로더 + 컴포넌트 수정, 기존 구조에 맞춤
  - **Skills**: [`frontend-design`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with T14, T16)
  - **Blocks**: None
  - **Blocked By**: T5, T6

  **References**:
  **Pattern References**:
  - `app/routes/public/learners/$learnerSlug.server.ts` — 실제 loader 파일 (쿼리 호출, 데이터 반환)
  - `app/routes/public/learners/$learnerSlug.tsx` — 컴포넌트 파일 (UI 렌더링, loader 데이터 소비)

  **API/Type References**:
  - `app/db/queries/records/participants.server.ts:getRecordsWithParticipant` — T5에서 구현
  - `app/db/queries/dialogue/mentions.server.ts:getRecordsWithMention` — T6에서 구현

  **Acceptance Criteria**:

  **QA Scenarios**:

  ```
  Scenario: 프로필에 "함께한 기록" 표시
    Tool: Playwright
    Preconditions: 해당 Learner가 참여자로 등록된 기록 존재
    Steps:
      1. /learners/:slug 페이지 이동
      2. "함께한 기록" 섹션 존재 확인
      3. SceneCard 형태로 기록 표시 확인
      4. 기록 클릭 → 상세 페이지 이동 확인
    Expected Result: 참여한 기록이 카드 목록으로 표시
    Failure Indicators: 섹션 미표시, 빈 상태에서 보임
    Evidence: .sisyphus/evidence/task-15-profile-participated.png

  Scenario: 참여/언급 기록 없는 프로필
    Tool: Playwright
    Steps:
      1. 참여·언급 기록이 없는 Learner 프로필 이동
      2. "함께한 기록" / "언급된 기록" 섹션 미표시 확인
    Expected Result: 빈 섹션은 렌더링되지 않음
    Failure Indicators: 빈 섹션 헤더 보임
    Evidence: .sisyphus/evidence/task-15-profile-empty.png
  ```

  **Commit**: YES
  - Message: `feat(profile): 함께한 글·언급된 글 섹션`
  - Files: `app/routes/public/learners/$learnerSlug.server.ts`, `app/routes/public/learners/$learnerSlug.tsx`
  - Pre-commit: scoped typecheck (변경 파일 type error 0건)

- [ ] 16. Seed 데이터 업데이트 + 마이그레이션 검증

  **What to do**:
  - `seeds/seed.sql` 수정:
    - `record_participants` 테이블에 샘플 데이터 추가 (기존 records + learner_profiles 참조)
    - 각 역할별 1건 이상: coauthor 2건, companion 3건, mentor 1건
    - 작성자 본인이 참여자인 케이스는 포함하지 않음
  - 전체 마이그레이션 + 시드 적용 검증:
    - `wrangler d1 migrations apply DB --local` → exit 0
    - `wrangler d1 execute DB --local --file=seeds/seed.sql` → exit 0
  - FK 무결성 확인: 시드 데이터의 모든 userId, recordId가 실제 존재하는 값 참조

  **Must NOT do**:
  - 기존 시드 데이터 변경 금지 (추가만)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: SQL INSERT 문 추가 + 검증 커맨드 실행
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with T14, T15)
  - **Blocks**: None
  - **Blocked By**: T2 (마이그레이션)

  **References**:
  **Pattern References**:
  - `seeds/seed.sql` — 기존 시드 데이터 형식 (INSERT 패턴, 값 참조)

  **Acceptance Criteria**:

  **QA Scenarios**:

  ```
  Scenario: 클린 마이그레이션 + 시드 적용
    Tool: Bash
    Preconditions: 로컬 D1 DB 초기화
    Steps:
      1. wrangler d1 migrations apply DB --local 실행 → exit 0
      2. wrangler d1 execute DB --local --file=seeds/seed.sql 실행 → exit 0
      3. record_participants 테이블에 6건 이상 데이터 확인
    Expected Result: 마이그레이션 + 시드 모두 성공, 참여자 데이터 존재
    Failure Indicators: SQL 에러, FK constraint 실패
    Evidence: .sisyphus/evidence/task-16-seed-verification.txt
  ```

  **Commit**: YES
  - Message: `chore(seed): 참여자 샘플 데이터 + 마이그레이션 검증`
  - Files: `seeds/seed.sql`
  - Pre-commit: `wrangler d1 migrations apply DB --local`

---

## Final Verification Wave

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.

- [ ] F1. **Plan Compliance Audit** — `oracle`

  **What to do**:
  `.sisyphus/plans/people-tag-system.md` 전체를 읽고 각 "Must Have" 구현 존재 여부 확인. 각 "Must NOT Have" 패턴 코드베이스 검색 → 발견 시 file:line과 함께 거부. `.sisyphus/evidence/` 증거 파일 존재 확인.

  **QA Scenarios**:

  ```
  Scenario: Must Have 항목 검증
    Tool: Bash
    Steps:
      1. grep -r "recordParticipants\|record_participants" app/db/schema.server.ts → 테이블 존재 확인
      2. ls app/db/queries/records/participants.server.ts → 쿼리 모듈 존재
      3. ls app/components/TagSelector.tsx → 컴포넌트 존재
      4. ls app/components/PersonSearch.tsx → 컴포넌트 존재
      5. grep -r "syncParticipantsForRecord" app/routes/public/write/note.tsx → write에서 사용 확인
      6. grep -r "syncParticipantsForRecord" app/routes/public/write/article.tsx → write에서 사용 확인
      7. grep -c "tagIds" app/routes/public/write/note.tsx → 태그 필드 존재 (1 이상)
      8. ls drizzle/migrations/0010_add_record_participants.sql → 마이그레이션 존재
    Expected Result: 모든 grep/ls 성공, 파일 존재
    Evidence: .sisyphus/evidence/f1-must-have-audit.txt

  Scenario: Must NOT Have 항목 검증
    Tool: Bash
    Steps:
      1. grep -rn "as any" app/components/PersonSearch.tsx app/components/TagSelector.tsx app/db/queries/records/participants.server.ts → 0건
      2. grep -rn "@ts-ignore\|@ts-expect-error" app/ --include="*.ts" --include="*.tsx" | grep -v node_modules → 신규 파일에 0건
      3. grep -rn "WebSocket\|EventSource\|SSE" app/ --include="*.ts" --include="*.tsx" → 0건
      4. grep -rn "leaderboard\|ranking\|인기순" app/ --include="*.tsx" → 0건
    Expected Result: 금지 패턴 0건
    Evidence: .sisyphus/evidence/f1-must-not-have-audit.txt
  ```

  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`

  **What to do**:
  `pnpm typecheck` + `pnpm test` 실행. 모든 변경 파일 코드 품질 검사.

  **QA Scenarios**:

  ```
  Scenario: Scoped typecheck + 테스트 통과
    Tool: Bash
    Steps:
      1. pnpm typecheck 2>&1 | grep -E "(PersonSearch|TagSelector|participants|recordParticipants|mentions\.server|note\.tsx|article\.tsx|recordSlug|learnerSlug|admin/tags)" | grep "error TS" | wc -l → 0건
      2. pnpm test 실행 → exit 0, "FAIL" 0건 확인
      3. 결과에서 전체 테스트 수, 통과 수 캡처
    Expected Result: 변경 파일 type error 0건, test ALL PASS
    Evidence: .sisyphus/evidence/f2-build-test.txt

  Scenario: 코드 품질 패턴 검사 (이 플랜 변경 파일만)
    Tool: Bash
    Steps:
      1. grep -rn "as any" app/components/PersonSearch.tsx app/components/TagSelector.tsx app/db/queries/records/participants.server.ts → 0건
      2. grep -rn "console\.log" app/components/PersonSearch.tsx app/components/TagSelector.tsx app/db/queries/records/participants.server.ts app/db/queries/dialogue/mentions.server.ts → 0건
      3. grep -rn "catch\s*(" app/components/PersonSearch.tsx app/components/TagSelector.tsx app/db/queries/records/participants.server.ts | grep -v "catch (e\|catch (err" → 빈 catch 0건
    Expected Result: 이 플랜 변경 파일에서 코드 품질 이슈 0건
    Evidence: .sisyphus/evidence/f2-code-quality.txt
  ```

  Output: `Build [PASS/FAIL] | Tests [N pass/N fail] | Quality Issues [N] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high` + `playwright` skill

  **What to do**:
  로컬 서버에서 end-to-end 사용자 시나리오 실행.

  **QA Scenarios**:

  ```
  Scenario: Note 생성 → 태그 + 참여자 + 언급 전체 플로우
    Tool: Playwright
    Preconditions: pnpm dev 실행, 인증된 세션, 태그 + learner 시드 데이터 존재
    Steps:
      1. /write/note 이동
      2. content에 "테스트 기록입니다" 입력
      3. 태그 섹션에서 태그 1개 선택 (칩 클릭 → border-ocean-blue 변경 확인)
      4. "함께하는 사람"에서 "김성" 입력 → 드롭다운 → 선택 → 역할 "공동작성" 선택
      5. "언급된 사람"에서 다른 learner 검색 → 선택
      6. 제출 버튼 클릭
      7. 리다이렉트된 기록 상세에서: 태그 칩, 참여자(이름+역할), 언급 사람 표시 확인
    Expected Result: 전체 플로우 성공, 상세에서 모든 데이터 표시
    Evidence: .sisyphus/evidence/f3-note-full-flow.png

  Scenario: Article 편집 → 참여자 수정
    Tool: Playwright
    Steps:
      1. 참여자가 있는 기록의 /logs/:slug/edit 이동
      2. 기존 참여자 칩 표시 확인
      3. 새 참여자 추가, 기존 참여자 1명 제거
      4. 저장
      5. 상세에서 변경 반영 확인
    Expected Result: 편집 후 참여자 변경 반영
    Evidence: .sisyphus/evidence/f3-edit-participants.png

  Scenario: SceneCard 참여자 아바타 + 프로필 섹션
    Tool: Playwright
    Steps:
      1. /logs 이동 → 참여자 있는 카드에서 아바타 칩 확인
      2. /learners/:slug 이동 → "함께한 기록" 섹션 확인
    Expected Result: 카드에 아바타, 프로필에 섹션 표시
    Evidence: .sisyphus/evidence/f3-card-profile.png

  Scenario: 엣지 케이스 — 빈 상태, 잘못된 입력
    Tool: Playwright + Bash
    Steps:
      1. wrangler d1 execute DB --local --command="DELETE FROM record_tags; DELETE FROM tags;" 실행하여 태그 0개 상태 생성
      2. /write/note 이동 → 태그 섹션에서 "등록된 태그가 없습니다" 텍스트 확인
      3. wrangler d1 execute DB --local --file=seeds/seed.sql 실행하여 태그 복원
      4. /write/note 새로고침 → PersonSearch에 "김" (1자) 입력 → 드롭다운 미표시 확인 (최소 2자)
      5. 참여자·언급 선택 없이 content만 입력 후 제출 → 정상 생성 확인
    Expected Result: 태그 0개 시 빈 상태 메시지, 1자 검색 차단, 선택 없이 정상 제출
    Evidence: .sisyphus/evidence/f3-edge-cases.png
  ```

  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`

  **What to do**:
  각 태스크의 스펙 vs 실제 구현 1:1 비교.

  **QA Scenarios**:

  ```
  Scenario: 태스크별 스펙 대 구현 검증
    Tool: Bash
    Steps:
      1. git diff main --stat → 변경된 파일 목록 캡처
      2. 플랜의 각 태스크 "Files" 목록과 실제 변경 파일 대조
      3. 플랜에 없는 변경 파일 식별 (unaccounted changes)
      4. 플랜에 있으나 미변경 파일 식별 (missing implementations)
    Expected Result: 변경 파일 == 플랜 파일, unaccounted 0건
    Evidence: .sisyphus/evidence/f4-scope-diff.txt

  Scenario: Must NOT Do 크로스 태스크 오염 검사
    Tool: Bash
    Steps:
      1. 각 커밋별 변경 파일 검사: git log --oneline --name-only
      2. T1 커밋이 admin/tags.tsx만 변경했는지 확인
      3. T2 커밋이 migration + schema + relations만 변경했는지 확인
      4. 다른 태스크의 파일을 변경한 커밋 식별
    Expected Result: 각 커밋이 해당 태스크 파일만 변경, 오염 0건
    Evidence: .sisyphus/evidence/f4-contamination-check.txt
  ```

  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

| # | Message | Files | Pre-commit |
|---|---------|-------|------------|
| 1 | `fix(admin): TagWithUsage 타입 임포트 수정` | admin/tags.tsx | `pnpm typecheck` |
| 2 | `feat(db): record_participants 테이블 추가` | migration, schema, relations | `pnpm typecheck` |
| 3 | `feat(components): TagSelector 재사용 컴포넌트 추출` | TagSelector.tsx | `pnpm typecheck` |
| 4 | `feat(components): PersonSearch 자동완성 컴포넌트` | PersonSearch.tsx | `pnpm typecheck` |
| 5 | `feat(queries): participant 쿼리 모듈 + 테스트` | participants.server.ts, tests | `pnpm test` |
| 6 | `feat(queries): mention 쿼리 업데이트 + 테스트` | mentions.server.ts, tests | `pnpm test` |
| 7 | `feat(write): note/article 생성 폼에 태그 선택 추가` | note.tsx, article.tsx | `pnpm typecheck` |
| 8 | `feat(write): note/article에 참여자·언급 선택 추가` | note.tsx, article.tsx | `pnpm typecheck` |
| 9 | `feat(display): 기록 상세에 참여자·언급 섹션` | $recordSlug.tsx, .server.ts | `pnpm typecheck` |
| 10 | `feat(edit): 편집 폼에 참여자·언급 수정 UI` | $recordSlug.edit.tsx | `pnpm typecheck` |
| 11 | `feat(notifications): 참여자·언급 알림 + 중복 제거` | notification files | `pnpm test` |
| 12 | `feat(cards): SceneCard 참여자 아바타 칩` | SceneCard.tsx, loaders | `pnpm typecheck` |
| 13 | `feat(profile): 함께한 글·언급된 글 섹션` | $learnerSlug.tsx | `pnpm typecheck` |
| 14 | `chore(seed): 참여자 샘플 데이터 + 마이그레이션 검증` | seed.sql | migrations apply |

---

## Success Criteria

### Verification Commands
```bash
# Scoped typecheck (이 플랜 변경 파일만):
pnpm typecheck 2>&1 | grep -E "(PersonSearch|TagSelector|participants|recordParticipants|mentions\.server|note\.tsx|article\.tsx|recordSlug|learnerSlug|admin/tags)" | grep "error TS" | wc -l
# Expected: 0

pnpm test                                    # Expected: ALL PASS
wrangler d1 migrations apply DB --local      # Expected: exit 0
wrangler d1 execute DB --local --file=seeds/seed.sql  # Expected: exit 0
```

### Final Checklist
- [ ] Note/Article 생성 시 태그 선택 가능
- [ ] Note/Article 생성 시 "함께하는 사람" 검색·선택 가능 (3역할)
- [ ] Note/Article 생성 시 "언급된 사람" 검색·선택 가능
- [ ] 기록 상세에서 참여자·언급 사람 확인
- [ ] SceneCard에 참여자 아바타 표시 (+N명 트렁케이션)
- [ ] 편집 시 참여자·언급 수정 가능
- [ ] 참여자·언급 추가 시 알림 발송 (중복 제거)
- [ ] Learner 프로필에 "함께한 글"/"언급된 글" 표시
- [ ] Admin tags TypeScript 에러 해결
- [ ] 기존 테스트 + 신규 테스트 모두 통과
