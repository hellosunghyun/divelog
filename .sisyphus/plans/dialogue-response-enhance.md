# Dialogue Layer 응답 기능 개선

## TL;DR

> **Quick Summary**: 기존 응답 시스템에 수정/삭제, 알림 연동, UI 리디자인, 질문 목록 응답 흐름을 추가하여 Dialogue Layer를 완성한다.
> 
> **Deliverables**:
> - 응답 수정/삭제 기능 (서버 액션 + UI)
> - 응답 등록 시 알림 자동 생성 + inbox 링크 수정
> - ResponseCard / 응답 폼 Quiet Depth 리디자인
> - 열린 질문 전용 페이지 (`/questions`) + 인라인 응답 흐름
> 
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: Task 1 → Task 2 → Task 3 → Task 5 → Task 7 → Task 9 → F1-F4

---

## Context

### Original Request
"질문에 답하는 기능이 필요해" → 구체화: 응답 수정/삭제, 질문 목록 페이지에서 답하기, 응답 UI 개선/리디자인, 응답 알림 기능

### Interview Summary
**Key Discussions**:
- 핵심 응답 시스템(4유형 + 자기답변 + 질문 연결)은 이미 구현됨
- 수정/삭제 코드 없음 (create만 존재)
- notifications 테이블과 inbox 페이지는 존재하지만 응답 시 알림 생성 로직 미연결
- ResponseCard는 기본 border-l 스타일로 기능적이나 Quiet Depth 수준에 미달
- 홈에 열린 질문 4개 표시되지만 전용 질문 목록 페이지 없음

**Research Findings**:
- `createNotification()` 함수가 `db/queries/social/notifications.server.ts`에 존재하지만 어디서도 호출되지 않음
- `AlertDialog` 컴포넌트 (`components/ui/alert-dialog.tsx`) 존재하나 미사용 — 삭제 확인에 활용 가능
- `EditedIndicator` 컴포넌트 존재 — 수정된 응답 표시에 재활용 가능
- inbox 링크 버그: `recordId`(내부 UUID) 사용 → slug 해결 필요
- ResponseCard props에 `authorId` 미포함 → 수정/삭제 권한 판단 불가

### Metis Review
**Identified Gaps** (addressed):
- Hard delete vs soft delete → Hard delete 채택 (스키마 변경 불필요, moderationStatus가 soft-hide 역할)
- 수정된 응답 표시 → EditedIndicator 재활용 (`createdAt !== updatedAt`)
- 알림 제목 포맷 → `"{authorName}님이 {typeLabel}을 남겼습니다"` 패턴
- 자기 응답 알림 방지 → `response.authorId !== record.authorId` 체크
- moderated 응답 수정 불가 → `moderationStatus === "clean"` 조건
- inbox recordId→slug 버그 → Feature 4에서 함께 수정

---

## Work Objectives

### Core Objective
Dialogue Layer 응답 시스템의 완성도를 높여, 수정/삭제/알림/질문 응답 흐름/UI 품질을 갖춘 프로덕션 수준으로 만든다.

### Concrete Deliverables
- `updateResponse()`, `deleteResponse()` 쿼리 함수
- `updateResponseSchema` Zod 검증 스키마
- `update_response`, `delete_response` 서버 액션 인텐트
- ResponseCard에 수정/삭제 UI (작성자만 표시)
- 응답 등록 시 `createNotification()` 호출 로직
- inbox 링크 recordId→slug 수정
- ResponseCard / 응답 폼 Quiet Depth 리디자인
- `/questions` 열린 질문 전용 페이지 + 응답 흐름 [DECISION NEEDED: 전용 페이지 vs 기록 상세 이동]

### Definition of Done
- [ ] `pnpm typecheck` 통과
- [ ] `pnpm build` 성공
- [ ] 응답 수정/삭제 작동 (작성자만 가능)
- [ ] 응답 등록 시 알림 생성됨 (자기 응답 제외)
- [ ] inbox에서 알림 클릭 → 해당 기록으로 이동

### Must Have
- 응답 작성자만 수정/삭제 가능
- 삭제 시 확인 다이얼로그 (AlertDialog)
- 수정된 응답에 EditedIndicator 표시
- 응답 시 기록 작성자에게 알림 (자기 응답 제외)
- ResponseCard Quiet Depth 디자인 준수

### Must NOT Have (Guardrails)
- ❌ 좋아요, 추천, 인기순 정렬, 응답 수 배지
- ❌ 말풍선/채팅 버블 UI (editorial card만)
- ❌ 응답 간 reply (스레딩 없음 — 질문 연결만)
- ❌ Rich text 에디터 (textarea만)
- ❌ 실시간 알림 (WebSocket/SSE 없음 — inbox 폴링만)
- ❌ 응답 버전 관리 (record revision과 다르게 응답은 버전 추적 불필요)
- ❌ 대량 응답 삭제 (단건만)
- ❌ DB 마이그레이션 (기존 스키마로 충분)
- ❌ 알림 이메일 발송 (Phase 1에서 제외)

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: YES (`pnpm test` 명령어 존재, `__tests__` 디렉토리 존재)
- **Automated tests**: YES (Tests-after) — 쿼리 함수 유닛 테스트
- **Framework**: vitest 또는 bun test (기존 테스트 패턴 따름)

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Frontend/UI**: Playwright — 기록 상세 페이지에서 응답 수정/삭제 흐름 검증
- **Backend**: Bash (curl 또는 pnpm test) — 쿼리 함수, 액션 핸들러 검증
- **Type check**: `pnpm typecheck` 전체 통과

### QA 인증 설정 (MANDATORY — Playwright 시나리오 사전 조건)
모든 Playwright 기반 QA 시나리오 실행 전, 아래 단계를 수행:
1. `pnpm dev`로 로컬 dev 서버 실행 (Wrangler + D1 로컬)
2. `wrangler d1 migrations apply DB --local && wrangler d1 execute DB --local --file=seeds/seed.sql`로 DB 초기화
3. `.dev.vars`의 `TEST_VERIFIED_SESSION` 값을 사용하여 Playwright에서 `adakrpos_session` 쿠키 설정:
   ```typescript
   await context.addCookies([{
     name: 'adakrpos_session',
     value: process.env.TEST_VERIFIED_SESSION || (await readDevVars()).TEST_VERIFIED_SESSION,
     domain: 'localhost',
     path: '/',
   }]);
   ```
4. 인증이 필요 없는 시나리오(비로그인 확인)는 쿠키 미설정 상태에서 실행

### QA 테스트 픽스처 (MANDATORY — 특수 상태 시나리오)
일부 QA 시나리오는 seed 데이터에 없는 상태를 필요로 함. 해당 시나리오 실행 전 SQL로 직접 설정:
- **Moderated 응답** (Task 8): `wrangler d1 execute DB --local --command "UPDATE responses SET moderation_status='flagged' WHERE id=(SELECT id FROM responses LIMIT 1)"` → 테스트 후 복원
- **Closed 기록** (Task 8): `wrangler d1 execute DB --local --command "UPDATE records SET response_preference='closed' WHERE id=(SELECT id FROM records LIMIT 1)"` → 테스트 후 복원
- **열린 질문 없음** (Task 7 empty state): `wrangler d1 execute DB --local --command "UPDATE questions SET is_open=0"` → 테스트 후 `UPDATE questions SET is_open=1`로 복원
- 각 픽스처 설정/해제는 QA 시나리오 Steps에 포함해야 함

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — 백엔드 기반):
├── Task 1: updateResponseSchema + 쿼리 함수 (update/delete) [quick]
├── Task 2: 응답 알림 생성 로직 + createNotification 연결 [quick]
└── Task 3: inbox recordId→slug 링크 수정 [quick]

Wave 2 (After Wave 1 — UI 연결):
├── Task 4: ResponseCard 수정/삭제 UI 추가 [quick]
├── Task 5: update_response / delete_response 서버 액션 [quick]
├── Task 6: 응답 폼 + ResponseCard Quiet Depth 리디자인 [visual-engineering]
└── Task 7: 열린 질문 전용 페이지 /questions [unspecified-high]

Wave 3 (After Wave 2 — 통합):
├── Task 8: 전체 통합 테스트 + 엣지 케이스 검증 [deep]
└── Task 9: 타입 체크 + 빌드 검증 [quick]

Wave FINAL (After ALL — 4 병렬 리뷰):
├── F1: Plan Compliance Audit (oracle)
├── F2: Code Quality Review (unspecified-high)
├── F3: Real Manual QA (unspecified-high + playwright)
└── F4: Scope Fidelity Check (deep)
→ Present results → Get explicit user okay
```

### Dependency Matrix

| Task | Depends On | Blocks |
|------|-----------|--------|
| 1 | — | 4, 5, 8 |
| 2 | — | 8 |
| 3 | — | 8 |
| 4 | 1 | 6, 8 |
| 5 | 1 | 8 |
| 6 | 4 | 8 |
| 7 | — | 8 |
| 8 | 1, 2, 3, 4, 5, 6, 7 | 9 |
| 9 | 8 | F1-F4 |

### Agent Dispatch Summary

- **Wave 1**: **3** — T1 → `quick`, T2 → `quick`, T3 → `quick`
- **Wave 2**: **4** — T4 → `quick`, T5 → `quick`, T6 → `visual-engineering`, T7 → `unspecified-high`
- **Wave 3**: **2** — T8 → `deep`, T9 → `quick`
- **FINAL**: **4** — F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `deep`

---

## TODOs

- [x] 1. 응답 수정/삭제 쿼리 함수 + 검증 스키마

  **What to do**:
  - `app/lib/auth/validation.ts`에 `updateResponseSchema` 추가: `responseId` (string, required) + `content` (string, 1~10000) + `type` (enum 5종, optional) + `visibility` (enum, optional)
  - `app/db/queries/dialogue/responses.server.ts`에 `updateResponse(d1, responseId, authorId, data)` 추가:
    - 먼저 response 조회 → `authorId` 일치 확인 + `moderationStatus === "clean"` 확인
    - 일치하면 content, type, visibility, updatedAt 업데이트
    - 불일치 시 `null` 반환 (호출측에서 에러 처리)
  - 같은 파일에 `deleteResponse(d1, responseId, authorId)` 추가:
    - 먼저 response 조회 → `authorId` 일치 확인
    - 일치하면 hard delete (`database.delete(responses).where(eq(responses.id, responseId))`)
    - 불일치 시 `false` 반환
  - 같은 파일에 `getResponseById(d1, responseId)` 추가 (수정 폼 pre-fill용)

  **Must NOT do**:
  - soft delete 컬럼 추가하지 않음 (DB 마이그레이션 금지)
  - 응답 버전 관리 추가하지 않음

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 2개 파일에 쿼리 함수 + Zod 스키마 추가. 기존 패턴 따르는 단순 작업.
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `git-master`: 커밋은 별도 태스크에서

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3)
  - **Blocks**: Tasks 4, 5, 8
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `app/db/queries/dialogue/responses.server.ts:26-45` — `createResponse()` 패턴 (insert, nanoid, timestamp). update/delete도 같은 구조.
  - `app/db/queries/dialogue/responses.server.ts:8-24` — `getResponsesByRecord()` — select with JOIN 패턴
  - `app/db/queries/dialogue/selfAnswers.server.ts` — 같은 dialogue 모듈의 유사 패턴

  **API/Type References**:
  - `app/lib/auth/validation.ts:139-147` — `createResponseSchema` 정의. updateResponseSchema는 이것에 `responseId` 추가하고, content/type/visibility를 optional로.
  - `app/db/schema.server.ts:152-167` — `responses` 테이블 스키마. `authorId`, `moderationStatus`, `updatedAt` 필드 확인.

  **WHY Each Reference Matters**:
  - `createResponse` 함수 구조를 그대로 따라야 일관성 유지 (db(d1) 호출, timestamp 패턴)
  - `createResponseSchema`의 필드 정의를 참조해 updateSchema를 만들면 validation 일관성

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 응답 수정 쿼리 함수 동작 확인
    Tool: Bash (pnpm typecheck)
    Preconditions: updateResponse, deleteResponse, getResponseById 함수 작성 완료
    Steps:
      1. pnpm typecheck 실행
      2. updateResponseSchema import 검증 — grep으로 validation.ts에서 export 확인
      3. responses.server.ts에서 updateResponse, deleteResponse, getResponseById export 확인
    Expected Result: pnpm typecheck 0 errors, 모든 함수 export 존재
    Failure Indicators: TypeScript 에러, 함수 미발견
    Evidence: .sisyphus/evidence/task-1-typecheck.txt

  Scenario: 잘못된 authorId로 수정 시도 시 null 반환
    Tool: Bash (pnpm typecheck — 타입 레벨에서 반환 타입 확인)
    Preconditions: updateResponse 함수 작성 완료
    Steps:
      1. updateResponse의 반환 타입이 nullable인지 타입 정의 확인
      2. deleteResponse의 반환 타입이 boolean인지 확인
    Expected Result: 반환 타입에 null / false 포함
    Evidence: .sisyphus/evidence/task-1-return-types.txt
  ```

  **Commit**: YES (group 1)
  - Message: `feat(dialogue): 응답 수정/삭제 쿼리 함수 및 검증 스키마 추가`
  - Files: `app/lib/auth/validation.ts`, `app/db/queries/dialogue/responses.server.ts`
  - Pre-commit: `pnpm typecheck`

- [x] 2. 응답 등록 시 알림 생성 로직

  **What to do**:
  - `app/routes/public/logs/$recordSlug.server.ts`의 `create_response` 인텐트 핸들러 (line 172-231)에서:
    - 응답 insert 성공 후, 기록 작성자(`targetRecord[0].authorId`)에게 알림 생성
    - `createNotification()` 호출: `{ recipientId: record.authorId, type: "response", title: "${authorName}님이 ${typeLabel}을 남겼습니다", recordId: parsed.data.recordId }`
    - **자기 응답 방지**: `auth.user.id !== targetRecord[0].authorId` 조건에서만 알림 생성
  - 알림 title에 사용할 `typeLabel` 매핑: `{ resonance: "공명", question: "질문", connection: "연결", suggestion: "제안" }`
  - `createNotification` import 추가 (`~/db/queries/social/notifications.server.ts`)
  - 알림 생성 작성자 이름 조회: `learnerProfiles`에서 auth.user.id로 displayName 조회 (이미 DB 접근 가능)

  **Must NOT do**:
  - 실시간 알림 (WebSocket/SSE) 추가하지 않음
  - 알림 이메일 발송 추가하지 않음
  - self_answer 타입 응답 시 알림 생성하지 않음

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 기존 action handler에 알림 생성 코드 5-10줄 추가. createNotification 이미 존재.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3)
  - **Blocks**: Task 8
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `app/routes/public/logs/$recordSlug.server.ts:172-231` — `create_response` 인텐트 핸들러. line 208-222에서 insert 후 line 230에서 success 반환. 그 사이에 알림 생성 코드 삽입.
  - `app/db/queries/social/notifications.server.ts` — `createNotification()` 함수. 호출 시그니처와 필드 확인.

  **API/Type References**:
  - `app/db/schema.server.ts:183-195` — `notifications` 테이블 스키마. `recipientId`, `type`, `title`, `content`, `recordId`, `questionId` 필드.

  **WHY Each Reference Matters**:
  - action handler의 정확한 위치(line 208-222)에 코드를 삽입해야 하므로 현재 구조 파악 필수
  - createNotification의 시그니처를 정확히 따라야 타입 에러 방지

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 응답 등록 시 알림 생성 확인
    Tool: Bash (pnpm typecheck)
    Preconditions: create_response 인텐트에 알림 생성 코드 추가 완료
    Steps:
      1. pnpm typecheck 실행
      2. $recordSlug.server.ts에서 createNotification import 확인
      3. 자기 응답 방지 조건 (`auth.user.id !== targetRecord[0].authorId`) 코드 존재 확인
    Expected Result: typecheck 통과, 조건문 존재
    Evidence: .sisyphus/evidence/task-2-notification-wiring.txt

  Scenario: 자기 응답 시 알림 미생성 확인
    Tool: Bash (grep)
    Preconditions: 알림 생성 코드 작성 완료
    Steps:
      1. grep으로 `auth.user.id !== targetRecord` 또는 유사 조건 확인
      2. 해당 조건이 createNotification 호출을 감싸고 있는지 확인
    Expected Result: 조건문이 createNotification 호출을 감싸는 구조
    Evidence: .sisyphus/evidence/task-2-self-response-guard.txt
  ```

  **Commit**: YES (group 4)
  - Message: `feat(notification): 응답 등록 시 알림 생성 연결`
  - Files: `app/routes/public/logs/$recordSlug.server.ts`
  - Pre-commit: `pnpm typecheck`

- [x] 3. Inbox 알림 링크 recordId→slug 수정

  **What to do**:
  - `app/routes/public/inbox.tsx`의 loader (line 38-43)에서:
    - 현재: `notifications` 테이블만 select → `recordId`(내부 UUID)를 그대로 링크에 사용
    - 수정: notifications를 records 테이블과 LEFT JOIN하여 `records.slug`를 함께 가져옴
    - 또는 별도 쿼리로 notification에 있는 recordId들의 slug를 batch 조회
  - `inbox.tsx` line 156-160의 링크를 `n.recordId` → `n.recordSlug`(또는 JOIN 결과)로 변경
  - recordId가 없거나 해당 record가 삭제된 경우 링크 미표시 (graceful degradation)

  **Must NOT do**:
  - notifications 테이블 스키마 변경 금지
  - record가 없는 알림 자체를 삭제하지 않음

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: inbox.tsx 하나의 loader + 렌더링 수정. JOIN 추가만.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2)
  - **Blocks**: Task 8
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `app/routes/public/inbox.tsx:30-49` — 현재 loader. notifications만 select하고 있음.
  - `app/routes/public/inbox.tsx:155-160` — 현재 링크 렌더링. `/logs/${n.recordId}` 사용 중 (버그).
  - `app/routes/public/logs/$recordSlug.server.ts:37-56` — records LEFT JOIN 패턴 참조.

  **API/Type References**:
  - `app/db/schema.server.ts:183-195` — notifications 스키마. `recordId` 필드.
  - `app/db/schema.server.ts:98-124` — records 스키마. `slug` 필드.

  **WHY Each Reference Matters**:
  - inbox loader의 현재 쿼리 구조를 이해해야 JOIN 추가 위치 파악
  - records 테이블의 slug 필드로 올바른 URL 생성

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 알림 링크가 record slug 사용 확인
    Tool: Bash (grep)
    Preconditions: inbox.tsx 수정 완료
    Steps:
      1. inbox.tsx에서 `/logs/${n.recordId}` 패턴이 더 이상 없는지 확인
      2. 대신 slug 기반 링크 (`/logs/${...slug...}`)가 사용되는지 확인
      3. pnpm typecheck 실행
    Expected Result: recordId 기반 링크 제거, slug 기반 링크 존재, typecheck 통과
    Evidence: .sisyphus/evidence/task-3-inbox-link-fix.txt

  Scenario: record가 없는 알림의 graceful degradation
    Tool: Bash (grep)
    Preconditions: inbox.tsx 수정 완료
    Steps:
      1. 조건부 링크 렌더링 코드 확인 (slug가 null일 때 링크 미표시)
    Expected Result: null/undefined slug 체크 조건 존재
    Evidence: .sisyphus/evidence/task-3-graceful-degradation.txt
  ```

  **Commit**: YES (group 5)
  - Message: `fix(inbox): 알림 링크 recordId→slug 수정`
  - Files: `app/routes/public/inbox.tsx`
  - Pre-commit: `pnpm typecheck`

- [x] 4. ResponseCard 수정/삭제 UI 추가

  **What to do**:
  - `app/components/cards/ResponseCard.tsx` props 확장:
    - `response` 객체에 `authorId: string` 추가
    - 새 prop: `currentUserId?: string | null`
    - 새 prop: `onEdit?: (responseId: string) => void`
    - 새 prop: `onDelete?: (responseId: string) => void`
  - 소유자 판별: `response.authorId === currentUserId`일 때만 수정/삭제 버튼 표시
  - 수정 버튼: "수정" 텍스트 버튼 (ghost variant, 작은 크기)
  - 삭제 버튼: "삭제" 텍스트 버튼 (ghost variant, 작은 크기, text-error 색상)
  - 삭제 시 `AlertDialog` 사용하여 확인: "이 응답을 삭제하시겠습니까? 삭제된 응답은 복구할 수 없습니다."
  - 수정된 응답 표시: `response.updatedAt`이 `response.createdAt`보다 크면 `EditedIndicator` 표시
  - `response` props에 `updatedAt: number` 추가

  **Must NOT do**:
  - 응답 폼 자체를 리디자인하지 않음 (Feature 3 = Task 6의 범위)
  - 좋아요/추천 버튼 추가하지 않음
  - 응답 신고 버튼 추가하지 않음

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 기존 컴포넌트에 props 확장 + 조건부 버튼 추가. AlertDialog 이미 존재.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 5, 6, 7)
  - **Blocks**: Tasks 6, 8
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `app/components/cards/ResponseCard.tsx:1-94` — 현재 전체 코드. props 확장 기준점.
  - `app/components/ui/alert-dialog.tsx` — AlertDialog 컴포넌트. import 경로와 사용법.
  - `app/components/ui/EditedIndicator.tsx` — EditedIndicator 컴포넌트. createdAt/updatedAt 비교 패턴.
  - `app/routes/public/logs/$recordSlug.tsx:724-732` — 현재 ResponseCard 사용 위치. 여기서 새 props 전달 필요.

  **WHY Each Reference Matters**:
  - ResponseCard의 현재 구조를 정확히 파악해야 비파괴적 확장 가능
  - AlertDialog 사용법을 확인해야 올바른 import와 API 사용
  - $recordSlug.tsx의 ResponseCard 호출 위치에서 currentUserId 전달 필요

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 응답 작성자에게만 수정/삭제 버튼 표시
    Tool: Playwright
    Preconditions: dev server 실행 (pnpm dev), DB 초기화 (seed.sql 적용), TEST_VERIFIED_SESSION 쿠키 설정 완료, 테스트 사용자가 응답을 작성한 기록 존재 (없으면 먼저 응답 1개 등록)
    Steps:
      1. Playwright context에 adakrpos_session 쿠키 설정 (.dev.vars의 TEST_VERIFIED_SESSION 값 사용)
      2. /logs/{자신이 응답한 기록 slug} 이동
      3. 응답 섹션에서 자신의 응답 카드 찾기 — [data-testid="response-card"] 내 "수정", "삭제" 버튼 존재 확인
      4. 다른 사람의 응답 카드에는 "수정", "삭제" 버튼 미존재 확인
    Expected Result: 자기 응답에만 수정/삭제 버튼, 타인 응답에는 없음
    Failure Indicators: 모든 응답에 버튼 표시되거나 아무 응답에도 표시 안 됨
    Evidence: .sisyphus/evidence/task-4-owner-buttons.png

  Scenario: 삭제 클릭 시 AlertDialog 확인 표시
    Tool: Playwright
    Preconditions: 위와 동일 (인증 + 자신의 응답 존재)
    Steps:
      1. 자신의 응답 카드에서 "삭제" 버튼 클릭
      2. AlertDialog가 나타나는지 확인 — "삭제된 응답은 복구할 수 없습니다" 텍스트 포함
      3. "취소" 클릭 → 다이얼로그 닫힘, 응답 유지 확인
    Expected Result: AlertDialog 표시, 취소 시 복귀
    Evidence: .sisyphus/evidence/task-4-delete-dialog.png
  ```

  **Commit**: YES (group 3)
  - Message: `feat(dialogue): ResponseCard 수정/삭제 UI`
  - Files: `app/components/cards/ResponseCard.tsx`, `app/routes/public/logs/$recordSlug.tsx`
  - Pre-commit: `pnpm typecheck && pnpm build`

- [x] 5. update_response / delete_response 서버 액션 인텐트

  **What to do**:
  - `app/routes/public/logs/$recordSlug.server.ts`의 action 함수에 두 개 인텐트 추가:
  - `update_response` 인텐트:
    - formData에서 `responseId`, `content`, `type`, `visibility` 추출
    - `updateResponseSchema.safeParse()` 검증
    - `updateResponse(d1, responseId, auth.user.id, parsed.data)` 호출
    - null 반환 시 `{ error: "응답을 수정할 수 없습니다." }` (권한 없음 또는 moderated)
    - 성공 시 `{ success: "응답이 수정되었습니다." }`
  - `delete_response` 인텐트:
    - formData에서 `responseId` 추출
    - `deleteResponse(d1, responseId, auth.user.id)` 호출
    - false 반환 시 `{ error: "응답을 삭제할 수 없습니다." }`
    - 성공 시 `{ success: "응답이 삭제되었습니다." }`
  - 두 인텐트 모두 `requireVerified` 사용 (기존 패턴)
  - 두 인텐트 모두 `logger.info()` 로깅
  - `$recordSlug.tsx`에서 수정 폼 UI 추가:
    - "수정" 클릭 시 해당 ResponseCard가 인라인 편집 모드로 전환
    - textarea에 기존 content pre-fill
    - "저장" / "취소" 버튼
    - 삭제는 form submit (hidden input `intent=delete_response`, `responseId`)

  **Must NOT do**:
  - 응답 수정 시 responsePreference 재검증하지 않음 (이미 응답한 것이므로 수정은 허용)
  - 모든 응답을 일괄 수정/삭제하지 않음 (단건만)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 기존 action handler 패턴 복제 + 인라인 수정 폼 state 관리
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 4, 6, 7)
  - **Blocks**: Task 8
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `app/routes/public/logs/$recordSlug.server.ts:172-231` — `create_response` 인텐트 패턴. 같은 구조로 update/delete 인텐트 추가.
  - `app/routes/public/logs/$recordSlug.server.ts:268-303` — `create_self_answer` 인텐트. 소유권 체크 패턴 (`recordData[0].authorId !== auth.user.id`).
  - `app/routes/public/logs/$recordSlug.tsx:554-606` — 자기답변 인라인 수정 폼 UI 패턴. expandedState + textarea + submit/cancel 버튼.

  **WHY Each Reference Matters**:
  - create_response 인텐트의 구조를 그대로 따라 update/delete 추가해야 일관성
  - 자기답변 인라인 폼 패턴은 응답 수정 인라인 폼의 정확한 모범 사례

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 응답 수정 전체 흐름
    Tool: Playwright
    Preconditions: dev server 실행, DB 초기화, TEST_VERIFIED_SESSION 쿠키 설정, 자신이 작성한 응답이 있는 기록 (없으면 먼저 응답 폼에서 1개 등록)
    Steps:
      1. 자신의 응답 카드에서 "수정" 클릭
      2. 인라인 편집 모드 전환 확인 — textarea에 기존 content pre-fill
      3. content를 "수정된 응답입니다" 로 변경
      4. "저장" 클릭
      5. 응답 카드에 "수정된 응답입니다" 텍스트 표시 확인
      6. EditedIndicator 표시 확인
    Expected Result: 응답 내용 변경, 수정 표시 존재
    Evidence: .sisyphus/evidence/task-5-edit-flow.png

  Scenario: 응답 삭제 전체 흐름
    Tool: Playwright
    Preconditions: 위와 동일 (인증 + 자신의 응답 존재)
    Steps:
      1. 자신의 응답 카드에서 "삭제" 클릭
      2. AlertDialog 확인 → "삭제" 클릭
      3. 응답 목록에서 해당 응답 사라짐 확인
    Expected Result: 응답 삭제됨, 목록에서 제거
    Evidence: .sisyphus/evidence/task-5-delete-flow.png

  Scenario: 타인 응답 수정 시도 시 에러
    Tool: Bash (curl 또는 직접 action 호출)
    Preconditions: 타인의 응답 ID 확보
    Steps:
      1. update_response intent로 타인의 responseId 전송
      2. 응답 확인
    Expected Result: { error: "응답을 수정할 수 없습니다." } 반환
    Evidence: .sisyphus/evidence/task-5-auth-error.txt
  ```

  **Commit**: YES (group 2)
  - Message: `feat(dialogue): 응답 수정/삭제 서버 액션 핸들러`
  - Files: `app/routes/public/logs/$recordSlug.server.ts`, `app/routes/public/logs/$recordSlug.tsx`
  - Pre-commit: `pnpm typecheck`

- [x] 6. 응답 폼 + ResponseCard Quiet Depth 리디자인

  **What to do**:
  - **ResponseCard 리디자인** (`app/components/cards/ResponseCard.tsx`):
    - border-l-2 스타일 → 카드 전체 배경 + 상단 유형 라벨 레이아웃으로 전환
    - 유형별 accent: 좌측 border가 아닌, 상단 라벨에 배경색 chip (e.g., 공명=reef-cyan/20, 질문=ocean-blue/20)
    - padding 20-28px, radius 16-20px (Quiet Depth card spec)
    - 작성자 영역: displayName + timestamp + EditedIndicator를 한 줄에
    - content: text-base leading-relaxed (본문 가독성)
    - 호버: `hover:border-border/60` 미세 변화만 (과도한 elevation 금지)
  - **응답 폼 리디자인** (`app/routes/public/logs/$recordSlug.tsx` line 634-711):
    - 현재: 기본 form 카드. 개선: 더 넉넉한 padding, 유형 선택기 chip group 스타일
    - 유형 선택: Select dropdown → chip/segmented control로 전환 (4개 옵션이므로 가능)
    - 각 유형 선택 시 해당 유형에 맞는 placeholder 변경:
      - 공명: "이 기록에서 무엇이 남았는지 적어보세요"
      - 질문: "더 듣고 싶은 지점을 적어보세요"
      - 연결: "내 경험이나 다른 기록과 어떻게 이어지는지 적어보세요"
      - 제안: "다음 시도를 조심스럽게 제안해보세요"
    - 제출 버튼: 기존 `bg-deep-ocean` 유지, rounded-full
  - **응답 섹션 레이아웃** (`$recordSlug.tsx` line 718-738):
    - 현재 timeline-style (border-l-2 + dot) 유지하되, dot 크기와 색상 미세 조정
    - 응답 간 gap 넉넉하게 (gap-8 → gap-10)
  - `.docs/design.md` Quiet Depth 가이드라인 철저 준수

  **Must NOT do**:
  - 말풍선/채팅 버블 UI 금지
  - 응답 수 배지나 카운트 강조 금지
  - bouncing/confetti 모션 금지
  - 3D/skeuomorphic 아이콘 금지
  - Rich text 에디터 도입 금지

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: UI 리디자인 태스크. Quiet Depth 디자인 시스템 준수 필요.
  - **Skills**: [`frontend-design`]
    - `frontend-design`: UI/UX 디자인 품질 향상에 특화

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 4, 5, 7)
  - **Blocks**: Task 8
  - **Blocked By**: Task 4 (수정/삭제 버튼이 추가된 후 전체 리디자인)

  **References**:

  **Pattern References**:
  - `app/components/cards/ResponseCard.tsx:1-94` — 현재 ResponseCard 전체 코드
  - `app/components/cards/QuestionCard.tsx:36-75` — QuestionCard 디자인 참조. rounded-2xl, p-6 md:p-8, mist-blue/30 배경.
  - `app/routes/public/logs/$recordSlug.tsx:634-711` — 현재 응답 폼 코드
  - `app/routes/public/logs/$recordSlug.tsx:718-738` — 현재 응답 목록 레이아웃

  **External References**:
  - `.docs/design.md` — Quiet Depth 디자인 가이드라인 전체. 카드 스펙(radius 20-24px, padding 20-28px), 색상 시스템, 타이포그래피.
  - `.docs/frontend.md` — ResponseCard 컴포넌트 사양.

  **WHY Each Reference Matters**:
  - QuestionCard의 디자인은 ResponseCard 리디자인의 시각적 형제 — 같은 페이지에서 조화롭게 보여야 함
  - design.md의 카드 스펙을 정확히 따라야 Quiet Depth 일관성 유지

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: ResponseCard Quiet Depth 리디자인 확인
    Tool: Playwright
    Preconditions: dev server 실행, DB 초기화, TEST_VERIFIED_SESSION 쿠키 설정, 응답이 있는 기록 존재
    Steps:
      1. /logs/{응답이 있는 기록 slug} 이동
      2. ResponseCard의 시각적 스타일 확인:
         - rounded-2xl 또는 rounded-xl radius 적용
         - padding 20px 이상
         - 유형별 상단 라벨 chip 표시
         - border-l-2 스타일이 아닌 카드 전체 배경 사용
      3. 스크린샷 캡처
    Expected Result: Quiet Depth 디자인 가이드라인에 부합하는 카드 스타일
    Evidence: .sisyphus/evidence/task-6-response-card-redesign.png

  Scenario: 응답 유형별 placeholder 변경 확인
    Tool: Playwright
    Preconditions: dev server 실행, DB 초기화, TEST_VERIFIED_SESSION 쿠키 설정, responsePreference='open'인 기록 존재
    Steps:
      1. 응답 폼에서 "공명" 유형 선택 → placeholder "이 기록에서 무엇이 남았는지" 포함 확인
      2. "질문" 유형 선택 → placeholder "더 듣고 싶은 지점" 포함 확인
      3. "연결" 유형 선택 → placeholder 변경 확인
      4. "제안" 유형 선택 → placeholder 변경 확인
    Expected Result: 각 유형 선택 시 고유한 placeholder 표시
    Evidence: .sisyphus/evidence/task-6-type-placeholders.png
  ```

  **Commit**: YES (group 6)
  - Message: `style(dialogue): ResponseCard 및 응답 폼 Quiet Depth 리디자인`
  - Files: `app/components/cards/ResponseCard.tsx`, `app/routes/public/logs/$recordSlug.tsx`
  - Pre-commit: `pnpm build`

- [x] 7. 열린 질문 전용 페이지

  **What to do**:
  - `app/routes/public/questions/index.tsx` 새 파일 생성 (또는 `app/routes/public/questions.tsx`)
  - Loader:
    - `getOpenQuestions(d1, cohort)` 호출 (이미 구현된 쿼리)
    - 선택적: `getOpenQuestionsForStage(d1, stageId)` 로 stage 필터
    - 현재 Stage 목록도 함께 로드 (필터용)
  - UI:
    - HeroSection: title "열린 질문들", subtitle "동료들이 남긴 질문에 귀 기울여보세요"
    - Stage 필터: 상단에 chip group으로 stage 선택 (전체 / stage별)
    - 질문 카드 목록: QuestionCard 컴포넌트 사용
    - 각 QuestionCard에 "응답하기" 버튼 → 해당 기록 상세 페이지의 응답 폼으로 이동 (`/logs/{recordSlug}#response-form`)
    - 질문별 자기답변 수 + 응답 수 표시 (이미 getOpenQuestions에서 반환)
    - EmptyState: 열린 질문이 없을 때
  - GlobalNav에 질문 링크 추가 또는 기존 네비 구조에 맞게 배치
  - react-router route config에 등록

  **Must NOT do**:
  - 인라인 응답 폼 (이 페이지에서 바로 응답 작성) — 기록 상세로 이동하여 응답
  - 질문 텍스트 검색 기능
  - 질문 정렬 옵션 (시간순만)
  - 질문 인기순/응답 많은 순 정렬 (경쟁 지표 금지)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 새 라우트 파일 생성 + loader + UI 구성. 기존 패턴 따르지만 새 페이지.
  - **Skills**: [`frontend-design`]
    - `frontend-design`: Quiet Depth 디자인에 맞는 새 페이지 구성

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 4, 5, 6)
  - **Blocks**: Task 8
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `app/routes/public/index.tsx:31,119,129,343-345` — 홈 페이지에서 openQuestions 표시 패턴. 같은 쿼리 함수 사용.
  - `app/routes/public/journey/$stageSlug.tsx` — Stage 페이지 구조. HeroSection + 콘텐츠 섹션 패턴.
  - `app/db/queries/dialogue/questions.server.ts:29-96` — `getOpenQuestions()` 쿼리. selfAnswerCount, responseCount 포함.
  - `app/db/queries/dialogue/questions.server.ts:98-165` — `getOpenQuestionsForStage()` 쿼리.

  **API/Type References**:
  - `app/db/queries/dialogue/questions.server.ts:8-21` — `OpenQuestionListItem` 타입 정의. 반환 형태.
  - `app/components/cards/QuestionCard.tsx:6-19` — QuestionCard props. `question`, `record`, `onRespond` 필드.

  **External References**:
  - `.docs/wireframe.md` — 와이어프레임 명세. 질문 관련 화면 구조.
  - `.docs/design.md` — Quiet Depth 디자인 가이드라인.

  **WHY Each Reference Matters**:
  - 홈 페이지의 openQuestions 패턴을 전용 페이지로 확장하는 것이므로 같은 데이터 흐름
  - QuestionCard에 이미 `onRespond` 콜백이 있어 기록 상세 이동에 활용 가능

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 열린 질문 페이지 로드 및 표시
    Tool: Playwright
    Preconditions: dev server 실행, DB 초기화 (seed.sql — 열린 질문 포함), TEST_VERIFIED_SESSION 쿠키 설정
    Steps:
      1. /questions 이동
      2. HeroSection "열린 질문들" 제목 확인
      3. QuestionCard가 1개 이상 렌더링 확인 — [data-testid="question-card"] 존재
      4. 각 QuestionCard에 "응답하기" 버튼 또는 링크 존재 확인
    Expected Result: 페이지 로드, 질문 카드 표시, 응답 링크 존재
    Evidence: .sisyphus/evidence/task-7-questions-page.png

  Scenario: 질문 카드에서 기록 상세로 이동
    Tool: Playwright
    Preconditions: 위와 동일 (인증 + 열린 질문 존재)
    Steps:
      1. /questions 이동
      2. 첫 번째 QuestionCard의 "응답하기" 버튼 클릭
      3. /logs/{recordSlug} 페이지로 이동 확인
      4. 응답 폼 섹션이 보이는지 확인
    Expected Result: 기록 상세 페이지로 이동, 응답 폼 표시
    Evidence: .sisyphus/evidence/task-7-question-to-record.png

  Scenario: 열린 질문 없을 때 빈 상태
    Tool: Playwright
    Preconditions: dev server 실행, 인증 쿠키 설정
    Steps:
      1. 픽스처 설정: wrangler d1 execute DB --local --command "UPDATE questions SET is_open=0"
      2. /questions 이동
      3. EmptyState 컴포넌트 표시 확인
      4. 픽스처 복원: wrangler d1 execute DB --local --command "UPDATE questions SET is_open=1"
    Expected Result: 빈 상태 메시지 표시
    Evidence: .sisyphus/evidence/task-7-empty-state.png
  ```

  **Commit**: YES (group 7)
  - Message: `feat(questions): 열린 질문 전용 페이지`
  - Files: `app/routes/public/questions/index.tsx` (또는 `questions.tsx`)
  - Pre-commit: `pnpm typecheck && pnpm build`

- [x] 8. 전체 통합 테스트 + 엣지 케이스 검증

  **What to do**:
  - 모든 기능(Tasks 1-7)이 함께 동작하는지 통합 검증:
    - 응답 등록 → 알림 생성 → inbox에서 확인 → 기록 상세 이동 → 응답 수정 → 응답 삭제
    - 열린 질문 페이지 → 기록 상세 → 응답 작성 → 알림 확인
  - 엣지 케이스 검증:
    - moderated 응답(`moderationStatus !== "clean"`)에 수정/삭제 버튼 미표시 확인
    - responsePreference="closed" 기록에 응답 폼 미표시 확인
    - responsePreference="question_only" 기록에 질문 유형만 선택 가능 확인
    - 마지막 응답 삭제 후 EmptyState 표시 확인
    - 비로그인 사용자에게 수정/삭제/응답 폼 미표시 확인
  - `pnpm typecheck && pnpm build` 최종 확인

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: 전체 기능 교차 검증. 여러 파일의 연동 상태를 깊이 확인.
  - **Skills**: [`playwright`]

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (순차)
  - **Blocks**: Task 9
  - **Blocked By**: Tasks 1-7 (ALL)

  **References**:
  - 모든 이전 태스크의 결과물

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 전체 흐름 통합 테스트
    Tool: Playwright
    Preconditions: dev server 실행, DB 초기화 (seed.sql), TEST_VERIFIED_SESSION 쿠키 설정
    Steps:
      1. /questions 이동 → 질문 카드 표시 확인
      2. "응답하기" 클릭 → 기록 상세 이동
      3. 응답 폼에서 "공명" 선택, 내용 작성, 제출
      4. 응답 목록에 새 응답 표시 확인
      5. /inbox 이동 → 새 알림 표시 확인 (단, 자기 기록이 아닌 경우)
      6. 알림 클릭 → 기록 상세 이동 확인
      7. 자신의 응답 "수정" → 내용 변경 → 저장 → 수정 확인
      8. "삭제" → AlertDialog → 확인 → 삭제 확인
    Expected Result: 전체 흐름 에러 없이 완료
    Evidence: .sisyphus/evidence/task-8-integration.png

  Scenario: 엣지 케이스 — closed 기록에 응답 폼 미표시
    Tool: Playwright
    Preconditions: dev server 실행, 인증 쿠키 설정
    Steps:
      1. 픽스처 설정: wrangler d1 execute DB --local --command "UPDATE records SET response_preference='closed' WHERE id=(SELECT id FROM records LIMIT 1)"
      2. wrangler d1 execute DB --local --command "SELECT slug FROM records WHERE response_preference='closed' LIMIT 1" → slug 확보
      3. /logs/{slug} 이동
      4. "응답 남기기" 섹션 미표시 확인
      5. 픽스처 복원: wrangler d1 execute DB --local --command "UPDATE records SET response_preference='open' WHERE response_preference='closed'"
    Expected Result: 응답 폼 없음
    Evidence: .sisyphus/evidence/task-8-closed-record.png

  Scenario: 엣지 케이스 — moderated 응답에 수정/삭제 미표시
    Tool: Playwright
    Preconditions: dev server 실행, 인증 쿠키 설정
    Steps:
      1. 픽스처 설정: wrangler d1 execute DB --local --command "UPDATE responses SET moderation_status='flagged' WHERE id=(SELECT id FROM responses LIMIT 1)"
      2. 해당 응답이 있는 기록 상세 이동
      3. flagged 응답에 수정/삭제 버튼 미표시 확인 (또는 응답 자체가 목록에서 제외됨 — moderationStatus='clean' 필터에 의해)
      4. 픽스처 복원: wrangler d1 execute DB --local --command "UPDATE responses SET moderation_status='clean' WHERE moderation_status='flagged'"
    Expected Result: moderated 응답은 수정/삭제 불가
    Evidence: .sisyphus/evidence/task-8-moderated-response.png
  ```

  **Commit**: NO (검증 태스크)

- [x] 9. 타입 체크 + 빌드 최종 검증

  **What to do**:
  - `pnpm typecheck` 실행 → 0 errors
  - `pnpm build` 실행 → 성공
  - `pnpm test` 실행 → 모든 테스트 통과
  - 모든 evidence 파일 존재 확인

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (Task 8 이후)
  - **Blocks**: F1-F4
  - **Blocked By**: Task 8

  **Acceptance Criteria**:

  ```
  Scenario: 최종 빌드 검증
    Tool: Bash
    Steps:
      1. pnpm typecheck
      2. pnpm build
      3. pnpm test
    Expected Result: 모두 0 errors, 빌드 성공, 테스트 통과
    Evidence: .sisyphus/evidence/task-9-final-build.txt
  ```

  **Commit**: NO (검증 태스크)

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.

- [x] F1. **Plan Compliance Audit** — `deep`
  Read the plan end-to-end with oracle-style thoroughness. For each "Must Have": verify implementation exists (read file, grep for function, run command). For each "Must NOT Have": search codebase for forbidden patterns (좋아요, 인기순, 말풍선 등) — reject with file:line if found. Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [x] F2. **Code Quality Review** — `unspecified-high`
  Run `pnpm typecheck` + `pnpm build`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names (data/result/item/temp).
  Output: `Build [PASS/FAIL] | Typecheck [PASS/FAIL] | Files [N clean/N issues] | VERDICT`

- [x] F3. **Real Manual QA** — `unspecified-high` (+ `playwright` skill)
  Start from clean state. Execute EVERY QA scenario from EVERY task — follow exact steps, capture evidence. Test cross-task integration (features working together). Test edge cases: empty state, invalid input, rapid actions. Save to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [x] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff (git log/diff). Verify 1:1 — everything in spec was built, nothing beyond spec was built. Check "Must NOT do" compliance. Detect cross-task contamination. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

| # | Message | Files | Pre-commit |
|---|---------|-------|-----------|
| 1 | `feat(dialogue): 응답 수정/삭제 쿼리 함수 및 검증 스키마 추가` | validation.ts, responses.server.ts | `pnpm typecheck` |
| 2 | `feat(dialogue): 응답 수정/삭제 서버 액션 핸들러` | $recordSlug.server.ts | `pnpm typecheck` |
| 3 | `feat(dialogue): ResponseCard 수정/삭제 UI` | ResponseCard.tsx, $recordSlug.tsx | `pnpm typecheck && pnpm build` |
| 4 | `feat(notification): 응답 등록 시 알림 생성 연결` | $recordSlug.server.ts | `pnpm typecheck` |
| 5 | `fix(inbox): 알림 링크 recordId→slug 수정` | inbox.tsx | `pnpm typecheck` |
| 6 | `style(dialogue): ResponseCard 및 응답 폼 Quiet Depth 리디자인` | ResponseCard.tsx, $recordSlug.tsx | `pnpm build` |
| 7 | `feat(questions): 열린 질문 전용 페이지` | questions/index.tsx | `pnpm typecheck && pnpm build` |

---

## Success Criteria

### Verification Commands
```bash
pnpm typecheck          # Expected: 0 errors
pnpm build              # Expected: build success
pnpm test               # Expected: all tests pass
```

### Final Checklist
- [ ] 응답 수정/삭제 작동 (작성자만)
- [ ] 삭제 시 AlertDialog 확인 표시
- [ ] 수정된 응답에 EditedIndicator 표시
- [ ] 응답 등록 시 기록 작성자에게 알림 생성
- [ ] 자기 응답 시 알림 미생성
- [ ] inbox 알림 클릭 → 해당 기록 상세 이동
- [ ] ResponseCard Quiet Depth 디자인 적용
- [ ] 열린 질문 페이지에서 응답 흐름 작동
- [ ] 좋아요/인기순/응답수 배지 어디에도 없음
