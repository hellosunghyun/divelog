# Dialogue Layer 답글 스레딩 시스템

## TL;DR

> **Quick Summary**: 기존 Dialogue Layer에 답글(reply) 기능을 추가하여, 질문이나 응답에 무제한 중첩 답글을 달 수 있게 한다. adjacency list + 클라이언트 트리 빌딩 패턴 사용.
> 
> **Deliverables**:
> - `parentResponseId` 컬럼 추가 (DB 마이그레이션)
> - 트리 빌딩 유틸리티 함수
> - 스레딩 UI (인덴트 + 답글 버튼 + 인라인 답글 폼)
> - 삭제 시 tombstone 패턴 (자식 답글 보존)
> - 답글 시 부모 응답 작성자에게 알림
> 
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: Task 1 → Task 3 → Task 5 → Task 6 → Task 7

---

## Context

### Original Request
"댓글의 답글같은 시스템" — 기존 질문 또는 기존 응답에 답글을 달 수 있어야 함. 기존 응답 유형(공명/질문/연결/제안) 유지. 무제한 중첩.

### Current State
- `responses` 테이블: 10개 컬럼, `parentResponseId` 없음 → 스레딩 불가
- 응답은 기록별 flat list, `createdAt DESC` 정렬
- ResponseCard에 답글 버튼 없음
- `createResponse()`에 `parentResponseId` 파라미터 없음

### Metis Review
**Key Decisions** (Metis 권고 반영):
- adjacency list 패턴 (`parentResponseId` nullable 컬럼)
- flat 쿼리 + 클라이언트 트리 빌딩 (recursive CTE 사용 안 함)
- 시각적 인덴트 3단계 cap (4단계부터 flatten)
- 삭제 시 tombstone 패턴 (자식이 있으면 `[삭제된 응답]`으로 대체)
- `self_answer` 타입은 답글에서 제외
- 답글 시 부모 응답 작성자에게 알림 (record 작성자와 같으면 1회만)

---

## Work Objectives

### Core Objective
기존 Dialogue Layer에 무제한 중첩 답글 시스템을 추가하여, 질문과 응답에 대한 깊이 있는 대화를 가능하게 한다.

### Concrete Deliverables
- D1 마이그레이션: `parent_response_id` 컬럼 추가
- Drizzle 스키마 + relations 업데이트
- `buildResponseTree()` 유틸리티 함수 + 테스트
- `createResponseSchema`에 `parentResponseId` 추가
- `create_response` 액션에 `parentResponseId` 처리 + 유효성 검증
- `deleteResponse()` tombstone 패턴 적용
- ResponseCard에 "답글" 버튼 추가
- 스레딩 UI 렌더링 (인덴트 + 커넥터)
- 인라인 답글 폼
- 답글 시 부모 작성자 알림

### Must Have
- `parentResponseId` nullable 컬럼 (마이그레이션)
- 트리 빌딩 유틸리티 (flat → tree)
- 답글 버튼 + 인라인 답글 폼
- 시각적 인덴트 (최대 3단계)
- tombstone 삭제 (`[삭제된 응답]` + 자식 유지)
- 답글 시 부모 응답 작성자 알림
- `parentResponseId` 서버사이드 유효성 검증 (같은 recordId, 존재하는 응답, clean/non-tombstone)

### Must NOT Have (Guardrails)
- ❌ 좋아요/투표 기반 답글 정렬
- ❌ 답글 수 카운트 표시 (engagement metric)
- ❌ WebSocket/SSE 실시간 답글 업데이트
- ❌ 말풍선/채팅 버블
- ❌ recursive CTE 사용 (flat 쿼리만)
- ❌ `self_answer` 타입 답글
- ❌ tombstoned/moderated 응답에 답글
- ❌ Rich text 에디터
- ❌ 인기순/응답많은순 접기

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed.

### Test Decision
- **Automated tests**: YES — `buildResponseTree()` 유닛 테스트
- **Framework**: vitest 또는 bun test

### QA Policy
- **Frontend/UI**: Playwright — 스레딩 렌더링, 답글 폼, 인덴트 확인
- **Backend**: `pnpm typecheck && pnpm build`
- **Migration**: `wrangler d1 migrations apply DB --local`

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start — 모두 독립):
├── Task 1: DB 마이그레이션 + 스키마 업데이트 [quick]
├── Task 2: buildResponseTree 유틸리티 + 테스트 [quick]
└── Task 3: createResponseSchema에 parentResponseId 추가 [quick]

Wave 2 (After Wave 1):
├── Task 4: 쿼리 수정 + tombstone [quick] (depends: 1)
└── Task 5: create_response 액션 수정 [quick] (depends: 1, 3)

Wave 3 (After Wave 2):
├── Task 6: 답글 알림 [quick] (depends: 5)
└── Task 7: 스레딩 UI 렌더링 [visual-engineering] (depends: 1, 2, 4)

Wave 4 (After Wave 3):
└── Task 8: 답글 버튼 + 인라인 폼 [quick] (depends: 5, 7)

Wave 5 (After Wave 4):
└── Task 9: seed + 빌드 검증 [quick] (depends: 6, 7, 8)

Wave FINAL (After Wave 5):
├── F1: Plan Compliance Audit [deep]
├── F2: Code Quality Review [unspecified-high]
└── F3: Scope Fidelity Check [deep]
→ Present → user okay
```

### Dependency Matrix

| Task | Depends On | Blocks |
|------|-----------|--------|
| 1 | — | 4, 5, 7 |
| 2 | — | 7 |
| 3 | — | 5 |
| 4 | 1 | 7 |
| 5 | 1, 3 | 6, 8 |
| 6 | 5 | 9 |
| 7 | 1, 2, 4 | 9 |
| 8 | 5, 7 | 9 |
| 9 | 6, 7, 8 | F1-F3 |

---

## TODOs

- [x] 1. DB 마이그레이션 + 스키마 업데이트

  **What to do**:
  - `app/db/schema.server.ts`의 `responses` 테이블에 `parentResponseId` 컬럼 추가:
    ```typescript
    parentResponseId: text("parent_response_id").references(() => responses.id),
    ```
  - `app/db/relations.server.ts`에 `parentResponse` (one) + `childResponses` (many) 관계 추가
  - `npx drizzle-kit generate`로 마이그레이션 파일 생성
  - `wrangler d1 migrations apply DB --local`로 로컬 적용 확인

  **Must NOT do**: 기존 데이터 손실 없어야 함. nullable 컬럼 추가이므로 기존 rows는 NULL.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**: Wave 1 (Tasks 2, 3과 병렬) | Blocks: 4, 5, 7

  **References**:
  - `app/db/schema.server.ts:152-167` — 현재 responses 테이블
  - `app/db/relations.server.ts:169-182` — 현재 responses 관계
  - `drizzle/migrations/` — 기존 마이그레이션 패턴

  **QA Scenarios**:
  ```
  Scenario: 마이그레이션 적용 확인
    Tool: Bash
    Steps:
      1. npx drizzle-kit generate
      2. wrangler d1 migrations apply DB --local
      3. wrangler d1 execute DB --local --command "PRAGMA table_info(responses)" → parent_response_id 존재 확인
    Expected Result: parent_response_id TEXT nullable 컬럼 존재
    Evidence: .sisyphus/evidence/task-1-migration.txt
  ```

  **Commit**: `feat(db): responses 테이블에 parentResponseId 컬럼 추가`

- [x] 2. buildResponseTree 유틸리티 + 테스트

  **What to do**:
  - `app/lib/utils/thread-tree.ts` 생성:
    ```typescript
    export type ThreadedResponse<T> = T & { children: ThreadedResponse<T>[]; depth: number };
    
    export function buildResponseTree<T extends { id: string; parentResponseId: string | null }>(
      flat: T[]
    ): ThreadedResponse<T>[] {
      const map = new Map<string, ThreadedResponse<T>>();
      const roots: ThreadedResponse<T>[] = [];
      for (const r of flat) map.set(r.id, { ...r, children: [], depth: 0 });
      for (const r of flat) {
        const node = map.get(r.id)!;
        if (r.parentResponseId && map.has(r.parentResponseId)) {
          const parent = map.get(r.parentResponseId)!;
          node.depth = parent.depth + 1;
          parent.children.push(node);
        } else {
          roots.push(node);
        }
      }
      return roots;
    }
    ```
  - `app/lib/utils/thread-tree.test.ts` 생성: 최소 5개 테스트 케이스
    - 빈 배열 → 빈 roots
    - flat 응답만 (parentResponseId 모두 null) → 모두 root
    - 1단계 중첩 → 부모.children에 자식 포함
    - 3단계+ 깊은 중첩 → depth 값 정확
    - orphan (parentResponseId가 존재하지 않는 ID) → root로 처리

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**: Wave 1 (Tasks 1, 3과 병렬) | Blocks: 7

  **QA Scenarios**:
  ```
  Scenario: 트리 빌딩 테스트 통과
    Tool: Bash
    Steps:
      1. pnpm test app/lib/utils/thread-tree.test.ts
    Expected Result: 5+ 테스트 모두 통과
    Evidence: .sisyphus/evidence/task-2-tree-tests.txt
  ```

  **Commit**: `feat(lib): 응답 트리 빌딩 유틸리티 함수`

- [x] 3. createResponseSchema에 parentResponseId 추가

  **What to do**:
  - `app/lib/auth/validation.ts`의 `createResponseSchema`에 추가:
    ```typescript
    parentResponseId: z.string().optional(),
    ```
  - `CreateResponseInput` 타입 자동 업데이트됨

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**: Wave 1 (Tasks 1, 2와 병렬) | Blocks: 5

  **QA Scenarios**:
  ```
  Scenario: parentResponseId가 스키마에 포함됨
    Tool: Bash (grep)
    Steps:
      1. grep -n "parentResponseId" app/lib/auth/validation.ts
      2. CreateResponseInput 타입에 parentResponseId 포함 확인
    Expected Result: parentResponseId optional string 존재
    Evidence: .sisyphus/evidence/task-3-validation.txt
  ```

  **Commit**: `feat(validation): createResponseSchema에 parentResponseId 추가`

- [x] 4. getResponsesByRecord 쿼리 수정 + deleteResponse tombstone

  **What to do**:
  - `getResponsesByRecord()` select에 `parentResponseId` 필드 추가
  - `getResponsesByRecord()` WHERE 조건 수정: `moderationStatus IN ("clean", "tombstone")` — tombstone 응답도 포함해야 `[삭제된 응답]` 렌더링 가능
  - `getResponsesByRecord()`의 ORDER BY를 `createdAt ASC`로 변경 (트리 빌딩을 위해 시간순 정렬)
  - `deleteResponse()` 수정:
    - 자식 응답이 있는지 확인 (`SELECT COUNT(*) FROM responses WHERE parent_response_id = ?`)
    - 자식 있으면: content를 `"[삭제된 응답]"`로 업데이트, `moderationStatus`를 `"tombstone"`으로
    - 자식 없으면: 기존처럼 hard delete
  - `createResponse()`에 `parentResponseId` 필드 추가 (insert에 포함)
  - **핵심**: `$recordSlug.server.ts:75` 근방의 loader 내 인라인 쿼리도 수정해야 함. 현재 loader가 `getResponsesByRecord()`를 직접 호출하는지, 아니면 인라인 쿼리를 사용하는지 확인. 인라인이면 `getResponsesByRecord()` 호출로 대체하거나, 인라인 쿼리에도 동일한 `parentResponseId` + tombstone 필터 적용.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**: Wave 2 (Tasks 5, 6과 병렬) | Depends: 1 | Blocks: 7

  **References**:
  - `app/db/queries/dialogue/responses.server.ts:8-24` — getResponsesByRecord
  - `app/db/queries/dialogue/responses.server.ts:142-157` — deleteResponse
  - `app/routes/public/logs/$recordSlug.server.ts:75` — loader 내 응답 로딩 코드 (인라인 쿼리 또는 getResponsesByRecord 호출 확인)

  **QA Scenarios**:
  ```
  Scenario: parentResponseId가 select에 포함됨
    Tool: Bash (grep)
    Steps:
      1. grep -n "parentResponseId\|parent_response_id" app/db/queries/dialogue/responses.server.ts
      2. getResponsesByRecord 반환 타입에 parentResponseId 포함 확인
    Expected Result: parentResponseId 필드 존재
    Evidence: .sisyphus/evidence/task-4-query-threading.txt

  Scenario: tombstone 응답이 쿼리 결과에 포함됨
    Tool: Bash (grep)
    Steps:
      1. grep -n "tombstone\|moderationStatus" app/db/queries/dialogue/responses.server.ts
      2. WHERE 조건에 "tombstone" 포함 확인
    Expected Result: moderationStatus IN ("clean", "tombstone") 조건 존재
    Evidence: .sisyphus/evidence/task-4-tombstone-filter.txt

  Scenario: loader에서도 parentResponseId + tombstone 적용됨
    Tool: Bash (grep)
    Steps:
      1. grep -n "parentResponseId\|tombstone\|getResponsesByRecord" app/routes/public/logs/'$recordSlug.server.ts'
    Expected Result: loader가 올바른 쿼리 사용
    Evidence: .sisyphus/evidence/task-4-loader-check.txt
  ```

  **Commit**: `feat(query): 응답 쿼리 스레딩 지원 + tombstone 삭제`

- [x] 5. create_response 액션에 parentResponseId + 유효성 검증

  **What to do**:
  - `$recordSlug.server.ts`의 `create_response` 인텐트에서:
    - formData에서 `parentResponseId` 추출
    - 유효성 검증:
      1. parentResponseId가 있으면 → `getResponseById()`로 존재 확인
      2. 부모 응답의 `recordId`가 현재 기록의 `recordId`와 일치하는지 확인
      3. 부모 응답의 `moderationStatus`가 `"clean"`인지 (`"tombstone"`, `"flagged"` 거부)
      4. 답글 type이 `"self_answer"`이면 거부
    - 모든 검증 통과 후 `createResponse()`에 parentResponseId 전달
  - 에러 메시지: "답글을 달 수 없는 응답입니다."

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**: Wave 2 (Tasks 4, 6과 병렬) | Depends: 1, 3 | Blocks: 6, 8

  **QA Scenarios**:
  ```
  Scenario: parentResponseId 유효성 검증 코드 존재
    Tool: Bash (grep)
    Steps:
      1. grep -n "parentResponseId\|tombstone\|self_answer" app/routes/public/logs/'$recordSlug.server.ts'
      2. 부모 응답 존재 확인 + recordId 일치 + moderationStatus 체크 코드 확인
    Expected Result: 4가지 유효성 검증 모두 존재
    Evidence: .sisyphus/evidence/task-5-validation.txt

  Scenario: self_answer 타입 답글 거부
    Tool: Bash (grep)
    Steps:
      1. grep -n "self_answer" app/routes/public/logs/'$recordSlug.server.ts' 에서 답글 시 self_answer 거부 조건 확인
    Expected Result: self_answer 타입이면 에러 반환하는 조건 존재
    Evidence: .sisyphus/evidence/task-5-self-answer-reject.txt
  ```

  **Commit**: `feat(action): create_response에 parentResponseId 처리`

- [x] 6. 답글 시 부모 작성자 알림

  **What to do**:
  - `$recordSlug.server.ts`의 `create_response` 인텐트에서, 기존 알림 로직 수정:
    - `parentResponseId`가 있으면 → 부모 응답 작성자에게 알림
    - `parentResponseId`가 없으면 → 기존 로직 유지 (기록 작성자에게 알림)
    - 부모 응답 작성자 === 기록 작성자일 때 → 알림 1회만
    - 부모 응답 작성자 === 현재 사용자일 때 → 알림 미생성
  - 알림 title: `"${authorName}님이 답글을 남겼습니다"` (답글일 때)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**: Wave 2 (Tasks 4, 5와 병렬) | Depends: 5 | Blocks: 9

  **QA Scenarios**:
  ```
  Scenario: 답글 시 부모 작성자 알림 로직
    Tool: Bash (grep)
    Steps:
      1. grep -n "parentResponseId.*createNotification\|답글" app/routes/public/logs/'$recordSlug.server.ts'
      2. 부모 작성자와 기록 작성자가 같을 때 중복 알림 방지 코드 확인
    Expected Result: 조건 분기 + 중복 방지 코드 존재
    Evidence: .sisyphus/evidence/task-6-reply-notification.txt
  ```

  **Commit**: `feat(notification): 답글 시 부모 작성자 알림`

- [x] 7. 스레딩 UI 렌더링 (트리 → 인덴트 카드)

  **What to do**:
  - `$recordSlug.tsx`의 응답 목록 렌더링을 flat → tree로 변경:
    - `buildResponseTree()` import 및 적용
    - 재귀 렌더링 함수 `renderResponseThread(node, depth)`:
      - depth 0-2: `ml-{depth * 8}` 인덴트 + 왼쪽 thin border 커넥터
      - depth 3+: 인덴트 증가 없이 `↳ {authorName}님의 답글` 프리픽스
    - 기존 timeline 스타일(border-l + dot) → 트리 커넥터 스타일로 교체
    - tombstone 응답: `[삭제된 응답]` 텍스트 + 흐린 스타일 + 답글 버튼 숨김
  - Quiet Depth 준수: 인덴트는 subtle, 커넥터 라인은 border/30 opacity

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-design`]

  **Parallelization**: Wave 3 (Tasks 8, 9와 병렬) | Depends: 1, 2, 4

  **QA Scenarios**:
  ```
  Scenario: 트리 렌더링 코드 존재
    Tool: Bash (grep)
    Steps:
      1. grep -n "buildResponseTree\|renderResponseThread\|depth" app/routes/public/logs/'$recordSlug.tsx'
      2. 재귀 렌더링 함수 존재 확인
      3. depth >= 3 시 flatten 처리 확인
    Expected Result: 트리 빌딩 import + 재귀 렌더링 + depth cap 코드 존재
    Evidence: .sisyphus/evidence/task-7-threading-ui.txt

  Scenario: tombstone 응답 UI 표시
    Tool: Bash (grep)
    Steps:
      1. grep -n "tombstone\|삭제된 응답" app/routes/public/logs/'$recordSlug.tsx'
    Expected Result: tombstone 응답에 대한 조건부 렌더링 코드 존재
    Evidence: .sisyphus/evidence/task-7-tombstone-ui.txt
  ```

  **Commit**: `feat(ui): 스레딩 응답 렌더링 (인덴트 + 커넥터)`

- [x] 8. ResponseCard 답글 버튼 + 인라인 답글 폼

  **What to do**:
  - `ResponseCard.tsx`에 props 추가:
    - `onReply?: (responseId: string) => void`
    - tombstone 상태면 답글 버튼 숨김
  - "답글" 버튼 추가 (수정/삭제 옆, ghost 스타일)
  - `$recordSlug.tsx`에서 인라인 답글 폼 state:
    - `replyingToId: string | null` (어떤 응답에 답글 중인지)
    - 답글 폼: `create_response` intent + hidden `parentResponseId` 필드
    - 유형 선택기(chip group) + textarea + 제출/취소 버튼
    - 답글 대상 ResponseCard 바로 아래에 인라인 표시
  - 질문(QuestionCard)에도 "답글" 버튼 추가 → 질문에 대한 응답 폼 열기 (기존 questionId 연결)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**: Wave 3 (Tasks 7, 9와 병렬) | Depends: 5, 7

  **QA Scenarios**:
  ```
  Scenario: 답글 버튼 + 인라인 폼
    Tool: Bash (grep)
    Steps:
      1. grep -n "onReply\|답글\|replyingToId" app/components/cards/ResponseCard.tsx app/routes/public/logs/'$recordSlug.tsx'
      2. ResponseCard에 onReply prop 존재 확인
      3. $recordSlug.tsx에 replyingToId state + 답글 폼 코드 확인
      4. 답글 폼에 hidden parentResponseId input 확인
    Expected Result: 답글 버튼 + 인라인 폼 + parentResponseId 전달 코드 존재
    Evidence: .sisyphus/evidence/task-8-reply-form.txt

  Scenario: tombstone 응답에 답글 버튼 숨김
    Tool: Bash (grep)
    Steps:
      1. grep -n "tombstone.*onReply\|isTombstone" app/components/cards/ResponseCard.tsx
    Expected Result: tombstone 상태 시 답글 버튼 미표시 조건 존재
    Evidence: .sisyphus/evidence/task-8-tombstone-no-reply.txt
  ```

  **Commit**: `feat(ui): ResponseCard 답글 버튼 + 인라인 답글 폼`

- [x] 9. Seed 데이터 + 빌드 최종 검증

  **What to do**:
  - `seeds/seed.sql`에 스레딩 답글 데이터 추가 (5-6개, 다양한 depth)
  - `pnpm typecheck && pnpm build` 최종 확인
  - `wrangler d1 migrations apply DB --local && wrangler d1 execute DB --local --file=seeds/seed.sql` 확인

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**: Wave 3 (마지막) | Depends: 6, 7, 8

  **QA Scenarios**:
  ```
  Scenario: seed 적용 + 빌드 확인
    Tool: Bash
    Steps:
      1. wrangler d1 migrations apply DB --local
      2. wrangler d1 execute DB --local --file=seeds/seed.sql
      3. pnpm build 2>&1 | tail -10
    Expected Result: 모두 성공, 빌드 통과
    Evidence: .sisyphus/evidence/task-9-seed-build.txt
  ```

  **Commit**: `feat(seed): 스레딩 답글 seed 데이터`

---

## Final Verification Wave

> 3 review agents run in PARALLEL. ALL must APPROVE.

- [x] F1. **Plan Compliance Audit** — `deep`
  ```
  Scenario: Must Have / Must NOT Have 검증
    Tool: Bash (grep)
    Steps:
      1. grep -rn "parentResponseId" app/ — Must Have: 스키마, 쿼리, 액션, UI 전부 존재
      2. grep -rn "buildResponseTree" app/ — Must Have: 트리 유틸리티 사용
      3. grep -rn "tombstone\|삭제된 응답" app/ — Must Have: tombstone 패턴 존재
      4. grep -rn "onReply\|답글" app/components/ — Must Have: 답글 버튼 존재
      5. grep -rn "as any\|@ts-ignore\|upvote\|like\b\|인기순\|WebSocket\|bubble" app/ — Must NOT Have: 0건
      6. ls .sisyphus/evidence/task-*.txt — Evidence 파일 존재
    Expected Result: Must Have 모두 존재, Must NOT Have 0건, Evidence 파일 9+개
    Evidence: .sisyphus/evidence/f1-compliance.txt
  ```

- [x] F2. **Code Quality Review** — `unspecified-high`
  ```
  Scenario: 빌드 + 코드 품질 확인
    Tool: Bash
    Steps:
      1. pnpm build 2>&1 | tail -5 → "built in" 확인 (워크트리 디렉토리에서 실행)
      2. grep -rn "as any\|@ts-ignore\|@ts-expect-error" app/db/queries/dialogue/responses.server.ts app/routes/public/logs/'$recordSlug.server.ts' app/components/cards/ResponseCard.tsx app/lib/utils/thread-tree.ts app/routes/public/logs/'$recordSlug.tsx' → 0건
      3. grep -rn "console\.log" 위 동일 파일들 → 0건
    Expected Result: 빌드 성공, anti-pattern 0건
    Evidence: .sisyphus/evidence/f2-quality.txt
  ```

- [x] F3. **Scope Fidelity Check** — `deep`
  ```
  Scenario: 스코프 준수 확인
    Tool: Bash (git diff)
    Steps:
      1. git diff --name-only main..HEAD — 변경 파일 목록
      2. 변경 파일이 플랜 범위 내인지 확인 (schema, relations, responses.server, validation, $recordSlug.server, $recordSlug.tsx, ResponseCard, thread-tree, seed.sql, routes.ts, migration)
      3. drizzle/migrations/ 에 새 마이그레이션 파일 존재 확인
      4. package.json 변경 없음 확인 (새 패키지 추가 없어야 함)
    Expected Result: 모든 변경이 플랜 범위 내, 스코프 크립 없음
    Evidence: .sisyphus/evidence/f3-scope.txt
  ```

---

## Commit Strategy

| # | Message | Files |
|---|---------|-------|
| 1 | `feat(db): responses 테이블에 parentResponseId 컬럼 추가` | schema.server.ts, relations.server.ts, migration |
| 2 | `feat(lib): 응답 트리 빌딩 유틸리티 함수` | thread-tree.ts, thread-tree.test.ts |
| 3 | `feat(validation): createResponseSchema에 parentResponseId 추가` | validation.ts |
| 4 | `feat(query): 응답 쿼리 스레딩 지원 + tombstone 삭제` | responses.server.ts |
| 5 | `feat(action): create_response에 parentResponseId 처리` | $recordSlug.server.ts |
| 6 | `feat(notification): 답글 시 부모 작성자 알림` | $recordSlug.server.ts |
| 7 | `feat(ui): 스레딩 응답 렌더링 (인덴트 + 커넥터)` | $recordSlug.tsx |
| 8 | `feat(ui): ResponseCard 답글 버튼 + 인라인 답글 폼` | ResponseCard.tsx, $recordSlug.tsx |
| 9 | `feat(seed): 스레딩 답글 seed 데이터` | seed.sql |

---

## Success Criteria

### Verification Commands
```bash
pnpm typecheck          # Expected: 0 new errors
pnpm build              # Expected: build success
wrangler d1 migrations apply DB --local  # Expected: success
```

### Final Checklist
- [ ] parentResponseId 마이그레이션 적용됨
- [ ] 기존 flat 응답이 정상 렌더링됨 (하위 호환)
- [ ] 응답/질문에 "답글" 버튼 표시
- [ ] 답글 폼이 인라인으로 열림
- [ ] 스레딩 인덴트 최대 3단계 적용
- [ ] 자식 있는 응답 삭제 시 tombstone 표시
- [ ] 답글 시 부모 작성자에게 알림
- [ ] self_answer 타입 답글 불가
- [ ] 좋아요/인기순/답글수 배지 없음
