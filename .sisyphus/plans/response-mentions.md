# Response Mentions: @사람 + [[게시글]] 멘션 + 알림 + 역참조

## TL;DR

> **Quick Summary**: Dialogue Response(댓글)에 Article 에디터와 동일한 @mention(사람)과 [[recordRef]](게시글) 기능을 추가한다. 멘션 시 알림이 발송되고, 태그된 게시글 페이지에서 어떤 응답에서 언급됐는지 역참조를 표시한다.
> 
> **Deliverables**:
> - ResponseEditor 컴포넌트 (mini Tiptap + @mention + [[recordRef]])
> - response_mentions 신규 테이블 + response_record_refs 신규 테이블 (기존 mentions 비수정)
> - 응답 생성/수정/삭제 시 멘션 동기화 + 알림 발송
> - ResponseCard의 리치 텍스트 렌더링 + hover preview
> - Record 상세 페이지에 "이 글을 언급한 응답" 역참조 섹션
> 
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 4 waves
> **Critical Path**: Task 1 → Task 4 → Task 7 → Task 8 → Task 9

---

## Context

### Original Request
"댓글에 사람과 게시글 태그 기능 구현. 깊게 한번에 잘 될수있게. 그리고 알림도 가게. 그리고 태그된게시글에서 어떤 댓글에서 언급됐는지 볼수있게."
"이미 article에 있는 기능 그대로 가져와. @와 [["

### Current State
| 영역 | 현재 상태 |
|------|----------|
| Response 에디터 | 단순 `<textarea>` (plain text) |
| Article 에디터 | Tiptap v3 + `UserMentionExtension` (@) + `RecordRefExtension` ([[) 완전 구현 |
| mentions 테이블 | `record_id`만 있음, `response_id` 없음 |
| 알림 | `deliverMentionNotifications()` 존재, response 생성 시 호출하지만 plain text라 Tiptap JSON 파싱 불가 |
| 역참조 | 미구현 |
| ContentRenderer | `.user-mention`, `.record-ref` 클래스에 hover preview 이미 작동 |
| renderContentToHtml() | plain text / Tiptap JSON 자동 감지 → 기존 응답 하위 호환 보장 |

### Metis Review
**Identified Gaps** (addressed):
- **Tiptap 번들 사이즈**: ResponseEditor는 `React.lazy()` + `Suspense`로 lazy-load 필수
- **콘텐츠 유효성 검증**: JSON 크기가 아닌 plaintext 길이로 검증, raw JSON 별도 상한 (200KB)
- **자기 멘션 필터링**: 알림 발송 시 `recipientId !== actorId` 체크
- **Tombstone 응답 멘션 정리**: 삭제 action에서 mention/ref 명시적 삭제 필요
- **멘션 수 제한**: 응답당 @mention 10개, [[recordRef]] 10개 상한
- **알림 딥링크**: 현재는 record 페이지로 링크 (response anchor 링크는 향후 확장)
- **역참조 표시 위치**: Record 상세 페이지 하단, "연결된 기록" 근처 별도 섹션

---

## Work Objectives

### Core Objective
Response(댓글)에서 @로 사람, [[로 게시글을 멘션하고, 멘션된 사람에게 알림이 발송되며, 멘션된 게시글 페이지에서 어떤 응답이 이 글을 언급했는지 역참조로 확인할 수 있다.

### Concrete Deliverables
- `app/components/editor/editors/ResponseEditor.tsx` — 미니 Tiptap 에디터 (lazy-loaded)
- `drizzle/migrations/0017_response_mentions.sql` — D1 마이그레이션
- `app/db/schema.server.ts` — responseMentions + responseRecordRefs 신규 테이블 (기존 mentions 테이블 수정 안 함)
- `app/db/queries/dialogue/responseMentions.server.ts` — 응답 멘션 sync 함수
- `app/db/queries/dialogue/responseRecordRefs.server.ts` — 응답 record ref sync + 역참조 쿼리
- `app/routes/public/logs/$recordSlug.server.ts` — action 업데이트
- `app/routes/public/logs/$recordSlug.tsx` — ResponseEditor 통합 + 역참조 UI
- `app/components/cards/ResponseCard.tsx` — ContentRenderer 사용 렌더링

### Definition of Done
- [ ] `pnpm typecheck` 통과
- [ ] `pnpm build` 성공
- [ ] 새로 작성한 테스트 파일 통과 (`pnpm vitest run <new-test-files>`)
- [ ] 응답 작성 시 @로 사람 멘션 가능, 자동완성 팝업 표시
- [ ] 응답 작성 시 [[로 게시글 멘션 가능, 자동완성 팝업 표시
- [ ] 멘션된 사람에게 알림 발송 (inbox에서 확인)
- [ ] 멘션된 게시글 페이지에 "이 글을 언급한 응답" 섹션 표시
- [ ] 기존 plain text 응답이 동일하게 렌더링

### Must Have
- Article과 동일한 @mention, [[recordRef]] 동작 (Hangul 초성 검색 포함)
- 멘션 hover preview (MentionPreview 재활용)
- 멘션 알림 (기존 Queue 인프라 활용)
- 응답 수정 시 멘션 재동기화
- 응답 삭제 시 멘션/ref 정리
- 기존 plain text 응답 하위 호환
- ResponseEditor lazy loading (`React.lazy`)

### Must NOT Have (Guardrails)
- ResponseEditor에 이미지 업로드, 테이블, 코드 블록, 슬래시 명령어, heading, callout, toggle, TOC, TaskList, InlineTag 추가 금지
- Response에 자동 저장(autosave) 기능 추가 금지
- 기존 `syncAllMentionsForRecord()` 함수 수정 금지 — 새 함수 생성
- 기존 `mentions` 테이블 수정 금지 — 별도 `response_mentions` 테이블 생성 (기존 "언급된 사람" UI 오염 방지)
- 기존 `mentions.server.ts` 파일 수정 금지
- 기존 `record_links` 테이블 수정 금지 — 새 테이블 생성
- 기존 record mention/reference 흐름 변경 금지
- 좋아요, 인기순, 랭킹 관련 기능 절대 추가 금지
- `as any`, `@ts-ignore` 사용 금지

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: YES (vitest)
- **Automated tests**: YES (tests-after)
- **Framework**: vitest
- **Unit tests**: sync 함수들, 역참조 쿼리, 렌더링 호환성
- **⚠️ Baseline caveat**: 기존 test suite에 관련 없는 실패가 있음 (`ada-profile.test.ts`, `learnerSlug.server.test.ts`). `pnpm test` 전체 실행 대신 **새로 작성한 테스트 파일만** 실행하여 검증. 커밋 시 `pnpm vitest run <new-test-file>` 사용.

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Frontend/UI**: Playwright — Navigate, interact, assert DOM, screenshot
- **API/Backend**: Bash (curl) — Send requests, assert status + response fields
- **Build**: Bash — `pnpm typecheck`, `pnpm build`, `pnpm test`

---

## Execution Strategy

### Parallel Execution Waves

> **File Conflict Rule**: Tasks modifying the same file MUST run sequentially, not in parallel.
> - `$recordSlug.server.ts`: Tasks 6, 7, 8 (sequential within their waves)
> - `responseRecordRefs.server.ts`: Tasks 4, 5 (Task 5 after Task 4)

```
Wave 1 (Foundation — all parallel, no dependencies):
├── Task 1: DB migration + Drizzle schema + relations [quick]
├── Task 2: ResponseEditor component (mini Tiptap) [visual-engineering]
└── Task 3: Validation schema updates [quick]

Wave 2 (Backend — 2 parallel, depend on Task 1):
├── Task 4: syncMentionsForResponse() + syncRecordRefsForResponse() [unspecified-high]
└── Task 6: Loader HTML rendering + ResponseCard ContentRenderer [unspecified-high]
    (Task 4 creates responseRecordRefs.server.ts; Task 6 modifies $recordSlug.server.ts loader)

Wave 3 (Queries + Actions — 2 parallel, careful dependencies):
├── Task 5: getResponsesByReferencedRecord() [quick]
│   (depends: Task 4 — adds to responseRecordRefs.server.ts created by Task 4)
└── Task 7: Wire response actions + self-mention filter [deep]
    (depends: Tasks 3, 4 — modifies $recordSlug.server.ts actions, after Task 6 modified loader)

Wave 4 (Back-ref UI — sequential after Task 7):
└── Task 8: IncomingResponseRefs component [visual-engineering]
    (depends: Tasks 5, 6, 7 — modifies $recordSlug.server.ts loader, after Task 7)

Wave 5 (Final Integration — depends on all previous):
└── Task 9: Replace all response forms + integrate back-refs + lazy-load verification [deep]

Wave FINAL (Verification — 4 parallel reviews):
├── F1: Plan compliance audit (oracle)
├── F2: Code quality review (unspecified-high)
├── F3: Real manual QA (unspecified-high)
└── F4: Scope fidelity check (deep)
→ Present results → Get explicit user okay
```

### Critical Path
Task 1 → Task 4 → Task 7 → Task 8 → Task 9 → F1-F4 → user okay

### Dependency Matrix

| Task | Depends On | Blocks | Wave | Modifies File |
|------|-----------|--------|------|--------------|
| 1 | — | 4, 6 | 1 | schema, relations, migration |
| 2 | — | 9 | 1 | ResponseEditor.tsx (new) |
| 3 | — | 7 | 1 | validation.ts |
| 4 | 1 | 5, 7 | 2 | responseMentions.server.ts (new), responseRecordRefs.server.ts (new) |
| 6 | 1 | 7, 8, 9 | 2 | $recordSlug.server.ts (loader), ResponseCard.tsx |
| 5 | 4 | 8 | 3 | responseRecordRefs.server.ts (append) |
| 7 | 3, 4, 6 | 8, 9 | 3 | $recordSlug.server.ts (actions) |
| 8 | 5, 6, 7 | 9 | 4 | IncomingResponseRefs.tsx (new), $recordSlug.server.ts (loader append) |
| 9 | 2, 6, 7, 8 | F1-F4 | 5 | $recordSlug.tsx |

### Agent Dispatch Summary

- **Wave 1**: **3** — T1 → `quick`, T2 → `visual-engineering`, T3 → `quick`
- **Wave 2**: **2** — T4 → `unspecified-high`, T6 → `unspecified-high`
- **Wave 3**: **2** — T5 → `quick`, T7 → `deep`
- **Wave 4**: **1** — T8 → `visual-engineering`
- **Wave 5**: **1** — T9 → `deep`
- **FINAL**: **4** — F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `deep`

---

## TODOs

- [x] 1. DB Migration + Drizzle Schema + Relations

  **What to do**:
  - `drizzle/migrations/0017_response_mentions.sql` 생성:
    - `CREATE TABLE response_mentions (id TEXT PRIMARY KEY, response_id TEXT NOT NULL REFERENCES responses(id) ON DELETE CASCADE, record_id TEXT NOT NULL REFERENCES records(id) ON DELETE CASCADE, mentioned_user_id TEXT NOT NULL REFERENCES learner_profiles(user_id) ON DELETE CASCADE, mentioned_by_id TEXT NOT NULL REFERENCES learner_profiles(user_id) ON DELETE CASCADE, created_at INTEGER NOT NULL DEFAULT (unixepoch())) STRICT;`
    - `CREATE INDEX idx_response_mentions_response ON response_mentions(response_id);`
    - `CREATE INDEX idx_response_mentions_user ON response_mentions(mentioned_user_id);`
    - `CREATE TABLE response_record_refs (id TEXT PRIMARY KEY, response_id TEXT NOT NULL REFERENCES responses(id) ON DELETE CASCADE, referenced_record_id TEXT NOT NULL REFERENCES records(id) ON DELETE CASCADE, created_at INTEGER NOT NULL DEFAULT (unixepoch())) STRICT;`
    - `CREATE INDEX idx_response_record_refs_referenced ON response_record_refs(referenced_record_id);`
    - `CREATE INDEX idx_response_record_refs_response ON response_record_refs(response_id);`
  - `app/db/schema.server.ts` 수정:
    - **기존 `mentions` 테이블 수정 안 함** (오염 방지 — 기존 "언급된 사람" UI에 response 멘션이 노출되지 않도록)
    - `responseMentions` 새 테이블 정의 추가 (id, responseId FK, recordId FK, mentionedUserId FK, mentionedById FK, createdAt)
    - `responseRecordRefs` 새 테이블 정의 추가 (id, responseId FK, referencedRecordId FK, createdAt)
  - `app/db/relations.server.ts` 수정:
    - `responseMentions` relations 추가 (response, record, mentionedUser, mentionedBy)
    - `responseRecordRefs` relations 추가 (response, referencedRecord)
    - `responses` relations에 `responseMentions`, `responseRecordRefs` 역관계 추가
    - `records` relations에 `incomingResponseRefs` 역관계 추가

  **Must NOT do**:
  - **기존 `mentions` 테이블 수정 금지** (ALTER TABLE 금지 — 기존 `getMentionsByRecord()` 쿼리와 "언급된 사람" UI 오염 방지)
  - 기존 `record_links` 테이블 수정 금지
  - migration 번호는 기존 마이그레이션 다음 번호 사용 (ls drizzle/migrations/ 확인)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 스키마 추가는 패턴이 명확하고 파일 2-3개 수정
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3)
  - **Blocks**: Tasks 4, 5, 6
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `drizzle/migrations/` — 기존 마이그레이션 파일 네이밍 패턴 및 번호 확인
  - `app/db/schema.server.ts:304-316` — 기존 `mentions` 테이블 정의 (참고만 — 이 테이블은 수정하지 않음)
  - `app/db/schema.server.ts:142-158` — `responses` 테이블 정의 (FK 참조 대상)
  - `app/db/schema.server.ts:275-302` — `recordLinks` 테이블 (유사한 junction table 패턴, 참고만)
  - `app/db/relations.server.ts` — relations 패턴 전체 확인

  **WHY Each Reference Matters**:
  - 마이그레이션 파일 번호가 중복되면 안 됨. `ls drizzle/migrations/` 결과로 다음 번호 결정
  - mentions 테이블 구조를 참고하되, 별도 response_mentions 테이블을 생성 (기존 "언급된 사람" UI 오염 방지)
  - responseRecordRefs는 recordLinks와 유사한 junction table 패턴이지만, 별도 테이블로 생성

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Migration 적용 및 스키마 검증
    Tool: Bash
    Preconditions: 로컬 D1 데이터베이스 존재
    Steps:
      1. `wrangler d1 migrations apply DB --local` 실행
      2. `wrangler d1 execute DB --local --command "PRAGMA table_info(response_mentions)"` — 신규 테이블 구조 확인
      3. `wrangler d1 execute DB --local --command "PRAGMA table_info(response_record_refs)"` — 신규 테이블 구조 확인
      4. `wrangler d1 execute DB --local --command "SELECT name FROM sqlite_master WHERE type='index' AND name LIKE '%response%'"` — 인덱스 확인
      5. `wrangler d1 execute DB --local --command "PRAGMA table_info(mentions)"` — 기존 mentions 테이블에 변경 없음 확인
    Expected Result: response_mentions 테이블 (id/response_id/record_id/mentioned_user_id/mentioned_by_id/created_at), response_record_refs 테이블 (id/response_id/referenced_record_id/created_at), 인덱스 4개 생성, 기존 mentions 테이블 변경 없음
    Failure Indicators: 테이블 미생성, 기존 mentions에 새 컬럼 추가됨
    Evidence: .sisyphus/evidence/task-1-migration-apply.txt

  Scenario: Drizzle 타입 체크
    Tool: Bash
    Preconditions: 스키마 파일 수정 완료
    Steps:
      1. `pnpm typecheck` 실행
    Expected Result: 0 errors
    Failure Indicators: 타입 에러 발생
    Evidence: .sisyphus/evidence/task-1-typecheck.txt
  ```

  **Commit**: YES (1)
  - Message: `feat(db): add response mention and record ref schema`
  - Files: `drizzle/migrations/0017_response_mentions.sql`, `app/db/schema.server.ts`, `app/db/relations.server.ts`
  - Pre-commit: `pnpm typecheck`

- [x] 2. ResponseEditor Component (Mini Tiptap)

  **What to do**:
  - `app/components/editor/editors/ResponseEditor.tsx` 생성:
    - Tiptap v3 에디터, 최소 확장만 포함:
      - `StarterKit` (heading 비활성, codeBlock 비활성)
      - `Placeholder` ("공명, 질문, 연결, 제안... 자유롭게 남겨보세요")
      - `Underline`
      - `TiptapLink` (autolink, openOnClick: false)
      - `UserMentionExtension` (기존 `createUserMentionExtension()` 재활용)
      - `RecordRefExtension` (기존 `createRecordRefExtension()` 재활용)
    - Props: `{ content?: object; onChange: (json: object, text: string) => void; placeholder?: string; className?: string; editable?: boolean }`
    - `React.lazy()`로 export하는 wrapper 파일 또는 dynamic import 패턴 적용
    - 에디터 높이: min 80px, max 300px, 스크롤 가능
    - Quiet Depth 디자인: border `#E3E8EF`, radius 12px (카드보다 약간 작게), focus 시 `#146C94` border
    - 툴바 없음 — @와 [[는 자동완성 팝업으로만 동작
  - `app/styles/editor.css`에 `.response-editor` 스타일 추가 (ArticleEditor의 `.article-editor` 참고하되 컴팩트하게)
  - 기존 멘션 팝업 스타일이 ResponseEditor에서도 동작하는지 확인 (팝업은 portal로 렌더링되므로 대부분 작동)

  **Must NOT do**:
  - 이미지 업로드, 테이블, 코드 블록, 슬래시 명령어, heading, callout, toggle, TOC, TaskList, Color, Highlight, InlineTag 추가 금지
  - Autosave 기능 추가 금지
  - ArticleEditor.tsx 수정 금지

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: 에디터 UI 컴포넌트 구현, Tiptap 설정, CSS 스타일링 포함
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3)
  - **Blocks**: Task 9
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `app/components/editor/editors/ArticleEditor.tsx` — 에디터 설정 패턴, extension 초기화 방식 (useMemo로 extension 생성, useEditor hook 사용). **이 파일에서 extension import와 초기화 코드만 참고하고, 불필요한 extension은 제외**
  - `app/components/editor/extensions/MentionExtension.ts` — `createUserMentionExtension()` 함수. **이 함수를 그대로 import해서 사용**
  - `app/components/editor/extensions/RecordRefExtension.ts` — `createRecordRefExtension()` 함수. **이 함수를 그대로 import해서 사용**
  - `app/styles/editor.css` — 에디터 CSS. `.article-editor` 스타일에서 `.response-editor`용 컴팩트 버전 파생

  **API/Type References**:
  - `app/lib/content/editor-config.ts` — 기본 extension 목록 (StarterKit 설정 방식)
  - `app/lib/content/editor-extensions.ts` — ContentFormat 타입 정의

  **External References**:
  - Tiptap v3 useEditor: `https://tiptap.dev/docs/editor/getting-started/install/react`

  **WHY Each Reference Matters**:
  - ArticleEditor에서 extension 초기화 패턴 + useMemo + useEditor를 정확히 따라야 멘션 팝업이 작동함
  - MentionExtension/RecordRefExtension은 이미 완성된 코드. import만 하면 자동완성 팝업, 한글 검색, 노드 삽입 모두 작동
  - editor.css의 멘션 팝업 스타일(.mention-popup, .record-ref-popup)이 이미 정의되어 있으므로 별도 스타일 불필요

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: ResponseEditor 렌더링 및 기본 동작
    Tool: Bash
    Preconditions: 컴포넌트 파일 생성 완료
    Steps:
      1. `pnpm typecheck` 실행 — 타입 에러 없음
      2. `pnpm build` 실행 — 빌드 성공
    Expected Result: typecheck 0 errors, build success
    Failure Indicators: 타입 에러, 빌드 실패
    Evidence: .sisyphus/evidence/task-2-typecheck.txt

  Scenario: Export 및 import 가능 확인
    Tool: Bash
    Preconditions: 컴포넌트 파일 생성 완료
    Steps:
      1. `pnpm typecheck` 실행 — ResponseEditor의 export/import 타입 정합성 확인
      2. ResponseEditor.tsx 파일에 default export 존재 확인 (React.lazy 호환 필수)
    Expected Result: default export 존재, typecheck 통과
    Failure Indicators: named export만 있어서 React.lazy 사용 불가
    Evidence: .sisyphus/evidence/task-2-export-check.txt
  ```

  > **NOTE**: Lazy loading chunk 분리 검증은 Task 9에서 실행. Task 2 단독으로는 dynamic import가 없어 chunk가 생성되지 않음.

  **Commit**: YES (2)
  - Message: `feat(editor): add ResponseEditor with mention and record ref support`
  - Files: `app/components/editor/editors/ResponseEditor.tsx`, `app/styles/editor.css`
  - Pre-commit: `pnpm typecheck`

- [x] 3. Validation Schema Updates

  **What to do**:
  - `app/lib/auth/validation.ts` 수정:
    - `createResponseSchema.content`: `z.string().min(1).max(200000)` (Tiptap JSON 허용)
    - `updateResponseSchema.content`: 동일하게 `z.string().min(1).max(200000)`
    - 새 helper 함수 `validateResponseContentLength(jsonStr: string): boolean` 추가:
      - JSON 파싱 → `getPlainText()` 호출 → plaintext 길이 10000자 이하 검증
      - JSON 파싱 실패 시 plain text로 간주, 길이 10000자 검증
    - 새 helper 함수 `validateMentionLimits(jsonStr: string): { userMentions: number; recordRefs: number; valid: boolean }` 추가:
      - `extractUserMentions()`, `extractRecordRefs()` 호출
      - 각각 10개 이하 검증
  - 이 함수들은 action에서 Zod 검증 이후 호출될 예정 (Task 7에서 연결)

  **Must NOT do**:
  - 기존 record 관련 validation 스키마 수정 금지
  - Zod 스키마 외부에서 content를 파싱하지 말것 (helper 함수로 분리)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: validation.ts 한 파일 수정, 로직 단순
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2)
  - **Blocks**: Task 7
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `app/lib/auth/validation.ts:202-209` — 기존 `createResponseSchema` 정의. **이 스키마의 content 필드 max만 변경**
  - `app/lib/auth/validation.ts` — 기존 record 관련 스키마 (updateRecordSchema 등)를 보면 content max 값 패턴 확인 가능

  **API/Type References**:
  - `app/lib/content/content.server.ts` — `getPlainText(content, format)` 함수. plaintext 추출에 사용
  - `app/lib/content/extract-references.server.ts` — `extractUserMentions()`, `extractRecordRefs()`. 멘션 수 검증에 사용

  **WHY Each Reference Matters**:
  - createResponseSchema의 기존 구조를 유지하면서 content max만 올려야 다른 코드에 영향 없음
  - getPlainText는 Tiptap JSON에서 순수 텍스트를 추출하는 검증 완료된 함수

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Validation 함수 타입 체크
    Tool: Bash
    Preconditions: validation.ts 수정 완료
    Steps:
      1. `pnpm typecheck` 실행
    Expected Result: 0 errors
    Failure Indicators: 타입 에러
    Evidence: .sisyphus/evidence/task-3-typecheck.txt

  Scenario: Validation 로직 검증 (unit test)
    Tool: Bash
    Preconditions: 테스트 파일 `app/lib/auth/__tests__/response-validation.test.ts` 작성 완료
    Steps:
      1. `pnpm vitest run app/lib/auth/__tests__/response-validation.test.ts` 실행
      2. 테스트 케이스: (a) 짧은 Tiptap JSON → validateResponseContentLength 반환 true, (b) 10000자 초과 plaintext → false, (c) 5개 멘션 → validateMentionLimits.valid=true, (d) 15개 멘션 → valid=false
    Expected Result: 4개 테스트 모두 통과 (pass)
    Failure Indicators: vitest 실행 실패 또는 assertion 에러
    Evidence: .sisyphus/evidence/task-3-validation-test.txt
  ```

  **Commit**: YES (3)
  - Message: `feat(validation): update response schema for rich text content`
  - Files: `app/lib/auth/validation.ts`
  - Pre-commit: `pnpm typecheck`

- [x] 4. Mention/RecordRef Sync Functions for Responses

  **What to do**:
  - `app/db/queries/dialogue/responseMentions.server.ts` 생성:
    - `syncMentionsForResponse(d1, responseId, recordId, content, mentionedById)`:
      - `extractUserMentions(content)` 호출로 Tiptap JSON에서 userMention 추출
      - **`response_mentions` 테이블** (NOT `mentions`)에서 기존 데이터 삭제 (WHERE response_id = responseId)
      - 새 response_mentions insert (responseId + recordId + mentionedUserId + mentionedById)
      - 자기 멘션 저장은 허용 (알림에서만 필터링)
    - `deleteMentionsForResponse(d1, responseId)`:
      - **`response_mentions` 테이블**에서 WHERE response_id = responseId 전부 삭제 (응답 삭제 시 사용)
  - `app/db/queries/dialogue/responseRecordRefs.server.ts` 생성:
    - `syncRecordRefsForResponse(d1, responseId, content)`:
      - `extractRecordRefs(content)` 호출로 Tiptap JSON에서 recordRef 추출
      - 기존 refs 삭제 (WHERE response_id = responseId)
      - 새 refs insert (responseId + referencedRecordId)
    - `deleteRecordRefsForResponse(d1, responseId)`:
      - WHERE response_id = responseId 전부 삭제
  - 두 함수 모두 delete-reinsert 패턴 사용 (기존 `syncAllMentionsForRecord` 패턴 따름)
  - unit test 작성: 추출 → 저장 → 재동기화 시나리오

  **Must NOT do**:
  - 기존 `syncAllMentionsForRecord()` 수정 금지
  - 기존 `mentions.server.ts` 파일 수정 금지 (새 파일 생성)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: DB 쿼리 + 트랜잭션 로직 + 테스트 작성 포함
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 5, 6)
  - **Blocks**: Task 7
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `app/db/queries/dialogue/mentions.server.ts:56-118` — `syncAllMentionsForRecord()`. **delete-reinsert 패턴을 정확히 따름. FK 유효성 체크 로직도 참고**
  - `app/db/queries/records/recordLinks.server.ts:25-45` — record link sync 패턴 (delete + insert 트랜잭션)

  **API/Type References**:
  - `app/lib/content/extract-references.server.ts` — `extractUserMentions(jsonStr)`, `extractRecordRefs(jsonStr)`. **이 함수들을 import해서 직접 사용**
  - `app/db/schema.server.ts` — `responseMentions`, `responseRecordRefs` 테이블 (Task 1에서 추가)
  - `app/lib/utils/utils.server.ts` — `nanoid()` ID 생성

  **WHY Each Reference Matters**:
  - syncAllMentionsForRecord의 delete-reinsert 패턴이 idempotent하고 동시 수정에 안전함. 동일 패턴 복제
  - extractUserMentions/extractRecordRefs는 Tiptap JSON 파싱이 검증된 함수. 직접 재구현하면 안 됨

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Mention sync 함수 타입 체크
    Tool: Bash
    Steps:
      1. `pnpm typecheck` 실행
    Expected Result: 0 errors
    Evidence: .sisyphus/evidence/task-4-typecheck.txt

  Scenario: Sync 함수 unit test
    Tool: Bash
    Preconditions: 테스트 파일 `app/db/queries/dialogue/__tests__/responseMentions.test.ts` 작성 완료
    Steps:
      1. `pnpm vitest run app/db/queries/dialogue/__tests__/responseMentions.test.ts` 실행
      2. 테스트 케이스: (a) 멘션 0개 콘텐츠 → response_mentions 저장 0건, (b) 멘션 3개 → 저장 3건, (c) 수정 시 2개로 변경 → 저장 2건 (이전 3건 삭제), (d) deleteMentionsForResponse → 0건
    Expected Result: 4개 테스트 모두 통과
    Failure Indicators: vitest 실행 실패 또는 assertion 에러
    Evidence: .sisyphus/evidence/task-4-unit-test.txt
  ```

  **Commit**: YES (4)
  - Message: `feat(queries): add response mention and record ref sync functions`
  - Files: `app/db/queries/dialogue/responseMentions.server.ts`, `app/db/queries/dialogue/responseRecordRefs.server.ts`, 테스트 파일
  - Pre-commit: `pnpm typecheck`

- [x] 5. Back-Reference Query: getResponsesByReferencedRecord

  **What to do**:
  - `app/db/queries/dialogue/responseRecordRefs.server.ts`에 추가 (Task 4에서 생성한 파일):
    - `getResponsesByReferencedRecord(d1, recordId, limit = 20)`:
      - `response_record_refs` JOIN `responses` JOIN `learner_profiles` (author)
      - WHERE `referenced_record_id = recordId` AND `responses.moderation_status = 'clean'`
      - ORDER BY `responses.created_at DESC`
      - 반환: `{ responseId, responseType, content (excerpt), authorDisplayName, authorSlug, authorPhotoUrl, sourceRecordId, sourceRecordSlug, sourceRecordTitle, createdAt }`
    - source record 정보가 필요함 (응답이 달린 원본 기록) → `responses` JOIN `records` (sourceRecord)
  - unit test 작성

  **Must NOT do**:
  - 기존 record_links 쿼리 수정 금지

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 단일 쿼리 함수 + JOIN 패턴 명확
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 7, different files)
  - **Parallel Group**: Wave 3 (with Task 7)
  - **Blocks**: Task 8
  - **Blocked By**: Task 4 (Task 5 appends to file created by Task 4)

  **References**:

  **Pattern References**:
  - `app/db/queries/records/recordLinks.server.ts` — `getIncomingLinks()` 함수. **JOIN + WHERE 패턴 참고**
  - `app/db/queries/dialogue/responses.server.ts` — `getResponsesByRecord()`. **response + author JOIN 패턴**

  **API/Type References**:
  - `app/db/schema.server.ts` — `responseRecordRefs`, `responses`, `learnerProfiles`, `records` 테이블

  **WHY Each Reference Matters**:
  - getIncomingLinks는 "다른 기록에서 이 기록을 링크한 것"을 조회하는 역참조 패턴. 동일한 역방향 쿼리 구조
  - getResponsesByRecord의 response + author JOIN은 그대로 재활용 가능

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: 역참조 쿼리 타입 체크
    Tool: Bash
    Steps:
      1. `pnpm typecheck` 실행
    Expected Result: 0 errors
    Evidence: .sisyphus/evidence/task-5-typecheck.txt

  Scenario: 역참조 쿼리 로직 테스트
    Tool: Bash
    Preconditions: 테스트 파일 `app/db/queries/dialogue/__tests__/responseRecordRefs.test.ts` 작성 완료
    Steps:
      1. `pnpm vitest run app/db/queries/dialogue/__tests__/responseRecordRefs.test.ts` 실행
      2. 테스트 케이스: (a) response_record_refs에 데이터 있을 때 → getResponsesByReferencedRecord 결과 반환, (b) 참조 없는 record → 빈 배열, (c) tombstone 응답 → 결과에서 제외
    Expected Result: 3개 테스트 모두 통과
    Failure Indicators: vitest 실행 실패 또는 assertion 에러
    Evidence: .sisyphus/evidence/task-5-query-test.txt
  ```

  **Commit**: YES (groups with 4)
  - Message: `feat(queries): add back-reference query for response record refs`
  - Files: `app/db/queries/dialogue/responseRecordRefs.server.ts`
  - Pre-commit: `pnpm typecheck`

- [x] 6. Loader HTML Rendering + ResponseCard ContentRenderer

  **What to do**:
  - `app/routes/public/logs/$recordSlug.server.ts` (loader 부분) 수정:
    - 기존: response.content를 raw string으로 반환
    - 변경: 각 response의 content를 `renderContentToHtml(response.content, "article")` 호출하여 HTML로 변환
    - `MentionSlugMap` 빌드: 응답에 포함된 멘션 사용자의 slug 매핑 (기존 record 렌더링 패턴 따름)
    - 반환 데이터에 `contentHtml` 필드 추가
  - `app/components/cards/ResponseCard.tsx` 수정:
    - 기존: content를 `<p>` 태그로 plain text 표시
    - 변경: `contentHtml` prop 받아서 `ContentRenderer` 컴포넌트로 렌더링
    - ContentRenderer는 이미 `.user-mention`, `.record-ref` hover preview 지원
    - ResponseCard의 기존 레이아웃/스타일 유지, content 영역만 교체
  - 기존 plain text 응답은 `renderContentToHtml()`이 자동으로 plain text 감지 → `<p>` 태그 렌더링 (하위 호환 보장)

  **Must NOT do**:
  - loader의 action 부분 수정 금지 (Task 7에서 처리)
  - ResponseCard의 기존 props interface 삭제 금지 (contentHtml 추가만)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: loader + component 수정, 렌더링 파이프라인 이해 필요
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 4, 5)
  - **Blocks**: Tasks 8, 9
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `app/routes/public/logs/$recordSlug.server.ts:81-95` — 현재 loader에서 response 데이터 로딩 방식. **여기에 renderContentToHtml 호출 추가**
  - `app/routes/public/logs/$recordSlug.tsx:253-410` — 현재 response 렌더링 방식. **ResponseCard에 contentHtml prop 전달하도록 수정**
  - `app/components/content/ContentRenderer.tsx` — **이 컴포넌트를 ResponseCard 내부에서 사용. dangerouslySetInnerHTML + hover preview 자동 작동**

  **API/Type References**:
  - `app/lib/content/content.server.ts` — `renderContentToHtml(content, format, mentionSlugMap?)`. format "article"로 호출하면 Tiptap JSON 렌더링
  - `app/components/cards/ResponseCard.tsx` — 현재 props interface 확인 필요 (`lsp_find_references` 사용)

  **WHY Each Reference Matters**:
  - renderContentToHtml은 plain text와 Tiptap JSON 모두 처리 가능 → 기존 응답 깨짐 방지
  - ContentRenderer는 hover preview를 자동으로 제공 → 별도 구현 불필요
  - 기록 상세 페이지의 record 본문 렌더링 흐름과 동일한 패턴 적용

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: 기존 plain text 응답 렌더링 호환
    Tool: Bash
    Preconditions: 기존 plain text 응답 데이터 존재
    Steps:
      1. `pnpm typecheck` 실행
      2. `pnpm build` 실행
    Expected Result: typecheck 0 errors, build success
    Failure Indicators: 타입 에러, 렌더링 깨짐
    Evidence: .sisyphus/evidence/task-6-typecheck.txt

  Scenario: Tiptap JSON 응답 렌더링 (향후 검증)
    Tool: Playwright
    Preconditions: 응답 데이터가 Tiptap JSON 형식으로 존재 (Task 7/9 이후)
    Steps:
      1. `/logs/:recordSlug` 페이지 접근
      2. 응답 영역에서 `.user-mention` 링크 존재 확인
      3. `.user-mention` 호버 시 preview 카드 표시 확인
    Expected Result: 멘션이 링크로 렌더링되고 hover preview 작동
    Evidence: .sisyphus/evidence/task-6-mention-render.png
  ```

  **Commit**: YES (6)
  - Message: `feat(rendering): render response content as rich text with mention previews`
  - Files: `app/routes/public/logs/$recordSlug.server.ts` (loader만), `app/components/cards/ResponseCard.tsx`
  - Pre-commit: `pnpm typecheck`

- [x] 7. Wire Response Create/Update/Delete Actions + Self-Mention Filter

  **What to do**:
  - `app/routes/public/logs/$recordSlug.server.ts` (action 부분) 수정:

  **create_response intent (lines 203-402):**
    - Zod 파싱 후 `validateResponseContentLength(parsed.data.content)` 호출 → 실패 시 400 에러 반환
    - `validateMentionLimits(parsed.data.content)` 호출 → 실패 시 400 에러 ("멘션은 각각 10개까지 가능합니다")
    - response 생성 후 `context.cloudflare.ctx.waitUntil()`에서:
      - `syncMentionsForResponse(d1, responseId, recordId, content, currentUserId)` 호출
      - `syncRecordRefsForResponse(d1, responseId, content)` 호출
      - 기존 `deliverMentionNotifications()` 호출 유지 (이미 content에서 userMention 추출하므로 Tiptap JSON이면 자동 작동)
    - `deliverMentionNotifications()`의 인자에서 `content`가 Tiptap JSON이 되므로, `extractMentionUserIdsFromContent()` 함수가 Tiptap JSON을 파싱할 수 있는지 확인 → 이미 `extractUserMentions()`를 내부적으로 사용하므로 작동

  **Self-mention notification 방지 (CRITICAL):**
    - `app/lib/notifications/mention-delivery.server.ts` 수정:
      - `deliverMentionNotifications()` 함수 내에서, `recipientIds` 필터링 시 `actorId`를 제외:
        ```
        const recipientIds = Array.from(new Set(extractMentionUserIdsFromContent(content)))
          .filter(id => id !== params.actorId);  // ← 이 줄 추가
        ```
      - 현재 코드는 모든 recipient에게 Queue 메시지를 보내고, `notify()` 함수에서 `actorId === recipientId` 체크로 스킵. 이는 불필요한 Queue 메시지 발생.
      - 이 수정으로 Queue 메시지 자체를 보내지 않아 효율적으로 self-mention 방지.
    - **검증**: `notify.server.ts`의 기존 `actorId === recipientId` 체크도 유지 (2중 방어)

  **update_response intent:**
    - 수정 후 `syncMentionsForResponse()` 재호출 (delete-reinsert로 자동 정리)
    - `syncRecordRefsForResponse()` 재호출
    - 수정 시에는 알림 재발송 안 함 (새 멘션 추가 시에만 알림 → 이 부분은 복잡하므로 re-sync만 하고 알림은 스킵)

  **delete_response intent:**
    - 기존 tombstone 처리 후:
      - `deleteMentionsForResponse(d1, responseId)` 호출
      - `deleteRecordRefsForResponse(d1, responseId)` 호출
    - `waitUntil` 안에서 비동기 처리

  **Must NOT do**:
  - loader 수정 금지 (Task 6에서 처리)
  - 기존 record 관련 action 수정 금지
  - 응답 수정 시 알림 재발송 금지 (스팸 방지)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: action 핸들러의 복잡한 흐름 이해 + 여러 함수 연동 + 에러 처리
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 5, different files)
  - **Parallel Group**: Wave 3 (with Task 5)
  - **Blocks**: Tasks 8, 9
  - **Blocked By**: Tasks 3, 4, 6 (Task 6 modifies same file's loader; Task 7 modifies actions)

  **References**:

  **Pattern References**:
  - `app/routes/public/logs/$recordSlug.server.ts:203-402` — 현재 `create_response` intent 전체 흐름. **기존 코드 구조를 유지하면서 sync 호출 추가**
  - `app/routes/public/logs/$recordSlug.server.ts:476-506` — 현재 `update_response` intent. **sync 재호출 추가**
  - `app/routes/public/logs/$recordSlug.server.ts:508-560` — 현재 `delete_response` intent. **cleanup 호출 추가**
  - `app/routes/public/logs/$recordSlug.server.ts:308-318` — 기존 `deliverMentionNotifications()` 호출 패턴. **이 패턴 유지, sync 함수만 추가**
  - `app/lib/notifications/mention-delivery.server.ts:18` — `deliverMentionNotifications()` 내부. **recipientIds 필터링에 actorId 제외 추가**

  **API/Type References**:
  - `app/db/queries/dialogue/responseMentions.server.ts` — Task 4에서 생성한 sync 함수들
  - `app/db/queries/dialogue/responseRecordRefs.server.ts` — Task 4에서 생성한 sync 함수들
  - `app/lib/auth/validation.ts` — Task 3에서 추가한 validation helper 함수들
  - `app/lib/notifications/mention-delivery.server.ts` — `deliverMentionNotifications()` 함수. **self-mention 필터 추가 대상**. 현재 `extractMentionUserIdsFromContent()` → `recipientIds.map()` → `publishNotification()` 흐름에서 actorId 필터링이 없음
  - `app/lib/notifications/notify.server.ts` — `notify()` 함수의 기존 `actorId === recipientId` 체크 확인 (2중 방어)

  **WHY Each Reference Matters**:
  - create_response의 기존 흐름(인증 → 파싱 → 유효성 → insert → 알림)을 정확히 이해해야 올바른 위치에 sync 호출 삽입 가능
  - mention-delivery.server.ts에서 self-mention을 Queue 전에 필터링해야 불필요한 메시지 방지. 기존 notify()의 체크는 2중 방어로 유지

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Response 생성 action 타입 체크
    Tool: Bash
    Steps:
      1. `pnpm typecheck` 실행
    Expected Result: 0 errors
    Evidence: .sisyphus/evidence/task-7-typecheck.txt

  Scenario: Mention 유효성 검증 (10개 초과)
    Tool: Bash (curl)
    Preconditions: 로컬 개발 서버 실행, 인증 쿠키 보유
    Steps:
      1. 11개 userMention이 포함된 Tiptap JSON content로 POST /logs/:slug (intent=create_response)
      2. 응답 확인
    Expected Result: 400 에러, "멘션은 각각 10개까지 가능합니다" 메시지
    Failure Indicators: 200 성공 반환
    Evidence: .sisyphus/evidence/task-7-mention-limit.txt

  Scenario: Response 삭제 시 mention 정리
    Tool: Bash (curl + D1 query)
    Steps:
      1. 멘션 포함 응답 생성 (curl POST /logs/:slug intent=create_response)
      2. `wrangler d1 execute DB --local --command "SELECT COUNT(*) FROM response_mentions WHERE response_id='<id>'"` — 1건 이상 확인
      3. `wrangler d1 execute DB --local --command "SELECT COUNT(*) FROM response_record_refs WHERE response_id='<id>'"` — recordRef 있으면 1건 이상
      4. 응답 삭제 (curl POST /logs/:slug intent=delete_response)
      5. `wrangler d1 execute DB --local --command "SELECT COUNT(*) FROM response_mentions WHERE response_id='<id>'"` — 0건 확인
      6. `wrangler d1 execute DB --local --command "SELECT COUNT(*) FROM response_record_refs WHERE response_id='<id>'"` — 0건 확인
    Expected Result: 삭제 후 response_mentions 및 response_record_refs에서 해당 응답 데이터 모두 정리
    Failure Indicators: COUNT > 0 반환
    Evidence: .sisyphus/evidence/task-7-delete-cleanup.txt
  ```

  **Commit**: YES (7)
  - Message: `feat(actions): wire mention sync, self-mention filter, and notifications into response actions`
  - Files: `app/routes/public/logs/$recordSlug.server.ts` (action 부분), `app/lib/notifications/mention-delivery.server.ts`
  - Pre-commit: `pnpm typecheck`

- [x] 8. IncomingResponseRefs Component (Back-Reference UI)

  **What to do**:
  - `app/components/sections/IncomingResponseRefs.tsx` 생성:
    - Props: `{ refs: Array<{ responseId, responseType, contentExcerpt, authorDisplayName, authorSlug, authorPhotoUrl, sourceRecordSlug, sourceRecordTitle, createdAt }> }`
    - 빈 배열이면 렌더링 안 함 (display: none이 아니라 null 반환)
    - 섹션 헤더: "이 글을 언급한 응답" (Quiet Depth 스타일, Section Title 22-28px weight 600)
    - 각 항목:
      - 응답 유형 칩 (공명/질문/연결/제안)
      - 작성자 아바타 + 이름 (링크: /learners/:authorSlug)
      - 응답 내용 excerpt (2줄 max, 120자)
      - 출처 기록 제목 (링크: /logs/:sourceRecordSlug)
      - 작성일
    - Quiet Depth 카드 스타일: border `#E3E8EF`, radius 16px, padding 16px
    - 최대 10개 표시, 더 있으면 "더 보기" 없이 10개만 (초기 버전)
  - `app/routes/public/logs/$recordSlug.server.ts` (loader) 수정:
    - `getResponsesByReferencedRecord(d1, recordId)` 호출 추가
    - 반환 데이터에 `incomingResponseRefs` 필드 추가

  **Must NOT do**:
  - 기존 "연결된 기록" 섹션 수정 금지
  - 페이지네이션 구현 불필요 (초기 버전)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: UI 컴포넌트 디자인 + Quiet Depth 스타일 적용
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO (sequential — modifies $recordSlug.server.ts after Task 7)
  - **Parallel Group**: Wave 4 (alone)
  - **Blocks**: Task 9
  - **Blocked By**: Tasks 5, 6, 7 (Task 7 modifies same file; must wait)

  **References**:

  **Pattern References**:
  - `app/routes/public/logs/$recordSlug.tsx` — record 상세 페이지 전체 레이아웃. **"연결된 기록" 섹션 근처에 IncomingResponseRefs 배치**
  - `app/components/cards/ResponseCard.tsx` — 응답 카드 디자인 패턴 (타입 칩, 작성자, 날짜 레이아웃)
  - `app/components/sections/` — 기존 섹션 컴포넌트 패턴 (HeroSection, StageStrip, CTABand)

  **API/Type References**:
  - `app/db/queries/dialogue/responseRecordRefs.server.ts` — `getResponsesByReferencedRecord()` 반환 타입 (Task 5)
  - `.docs/design.md` — Quiet Depth 카드 스펙, 타이포그래피 스케일

  **WHY Each Reference Matters**:
  - ResponseCard의 기존 디자인 언어(타입 칩 색상, 작성자 레이아웃)를 따라야 일관성 유지
  - design.md의 카드 스펙(radius 20-24px → 여기선 16px로 약간 작게, 하위 카드이므로)

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: 역참조 컴포넌트 빌드 확인
    Tool: Bash
    Steps:
      1. `pnpm typecheck` 실행
      2. `pnpm build` 실행
    Expected Result: 0 errors, build success
    Evidence: .sisyphus/evidence/task-8-typecheck.txt

  Scenario: 빈 역참조 시 섹션 미표시
    Tool: Playwright
    Steps:
      1. 역참조가 없는 기록 페이지 `/logs/:slug` 접근
      2. "이 글을 언급한 응답" 텍스트 부재 확인
    Expected Result: 섹션 렌더링 안 됨
    Failure Indicators: 빈 섹션 헤더가 보임
    Evidence: .sisyphus/evidence/task-8-empty-state.png
  ```

  **Commit**: YES (8)
  - Message: `feat(ui): add incoming response references section for records`
  - Files: `app/components/sections/IncomingResponseRefs.tsx`, `app/routes/public/logs/$recordSlug.server.ts` (loader)
  - Pre-commit: `pnpm typecheck`

- [x] 9. Final Integration: Replace Forms + Wire Everything in Page

  **What to do**:
  - `app/routes/public/logs/$recordSlug.tsx` 수정:

  **응답 작성 폼 (페이지 하단, lines ~1005-1094):**
    - 기존 `<textarea>` → `ResponseEditor` (lazy import)로 교체
    - `React.lazy(() => import("~/components/editor/editors/ResponseEditor"))` + `<Suspense fallback={<LoadingSkeleton />}>`
    - ResponseEditor의 onChange에서 JSON과 plaintext를 각각 hidden input에 저장
    - hidden input: `name="content"` (Tiptap JSON string), `name="contentText"` (plaintext, 검색/미리보기용)
    - 기존 type selector, visibility dropdown, question selector 유지

  **답글(reply) 폼 (인라인):**
    - 기존 reply textarea → ResponseEditor로 동일하게 교체
    - reply 시 ResponseEditor 초기 content는 빈 상태
    - replyingToId 상태 관리 유지 (한 번에 하나의 에디터만 열림)

  **수정(edit) 폼 (인라인):**
    - 기존 edit textarea → ResponseEditor로 교체
    - 수정 시 ResponseEditor 초기 content는 기존 응답의 JSON 또는 plain text
    - plain text 응답 수정 시: `{ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: existingContent }] }] }` 형태로 변환하여 초기화
    - editingId 상태 관리 유지

  **역참조 섹션 배치:**
    - loader에서 받은 `incomingResponseRefs` 데이터를 `<IncomingResponseRefs>` 컴포넌트에 전달
    - 위치: 응답 목록 아래, 응답 작성 폼 위 (또는 "연결된 기록" 섹션 근처)

  **ResponseCard contentHtml 전달:**
    - loader에서 준비한 `contentHtml`을 각 ResponseCard에 전달
    - 기존 content prop 유지 (edit 시 원본 JSON 필요)

  **Must NOT do**:
  - ResponseCard 컴포넌트 자체 수정 금지 (Task 6에서 완료)
  - action 핸들러 수정 금지 (Task 7에서 완료)
  - loader 수정 금지 (Tasks 6, 8에서 완료)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: 페이지 전체 통합, 여러 컴포넌트 연결, 상태 관리 복잡성
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4 (단독)
  - **Blocks**: F1-F4
  - **Blocked By**: Tasks 2, 6, 7, 8

  **References**:

  **Pattern References**:
  - `app/routes/public/logs/$recordSlug.tsx:1005-1094` — 현재 응답 작성 폼 (textarea, type selector, visibility). **textarea만 ResponseEditor로 교체, 나머지 유지**
  - `app/routes/public/logs/$recordSlug.tsx:253-410` — 현재 응답 스레드 렌더링 + reply/edit 인라인 폼. **reply/edit textarea를 ResponseEditor로 교체**
  - `app/routes/public/write/article.tsx` — ArticleEditor 통합 패턴 (onChange, hidden input, lazy loading). **이 패턴을 따라 ResponseEditor 통합**

  **API/Type References**:
  - `app/components/editor/editors/ResponseEditor.tsx` — Task 2에서 생성한 컴포넌트 props
  - `app/components/sections/IncomingResponseRefs.tsx` — Task 8에서 생성한 컴포넌트 props
  - `app/components/feedback/LoadingSkeleton.tsx` — Suspense fallback으로 사용

  **WHY Each Reference Matters**:
  - $recordSlug.tsx의 현재 form 구조를 정확히 이해해야 textarea 교체 위치 파악 가능
  - article.tsx의 ArticleEditor 통합 패턴(hidden input + onChange + lazy)이 정확한 참고 자료
  - reply/edit 인라인 폼의 상태 관리(replyingToId, editingId)를 유지해야 한 번에 하나의 에디터만 열림

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: @mention 자동완성 및 삽입 (응답 작성 폼)
    Tool: Playwright
    Preconditions: 인증된 사용자, 기록 상세 페이지 접근
    Steps:
      1. `/logs/:recordSlug` 접근
      2. 하단 응답 작성 폼에서 ResponseEditor 클릭 (Suspense 로딩 후 에디터 표시 확인)
      3. `@` 입력 → 자동완성 팝업 표시 확인 (`.mention-popup` 셀렉터)
      4. 검색어 입력 (예: "김") → 한글 초성 검색 결과 확인
      5. 첫 번째 항목 클릭 또는 Enter → 멘션 노드 삽입 확인 (`.user-mention` 클래스)
      6. 응답 타입 선택 → Submit
      7. 새로 생성된 응답에서 `.user-mention` 링크 확인
      8. `.user-mention` 호버 → preview 카드 표시 확인
    Expected Result: @mention이 정상 동작하고, 저장 후 렌더링되며, hover preview 표시됨
    Failure Indicators: 자동완성 미표시, 멘션 노드 미삽입, 렌더링 실패
    Evidence: .sisyphus/evidence/task-9-mention-complete.png

  Scenario: [[recordRef]] 자동완성 및 삽입 (응답 작성 폼)
    Tool: Playwright
    Preconditions: 인증된 사용자, 다른 기록 존재
    Steps:
      1. 응답 작성 폼에서 `[[` 입력 → 자동완성 팝업 표시 확인 (`.record-ref-popup` 셀렉터)
      2. 검색어 입력 → 결과 확인
      3. 항목 선택 → recordRef 노드 삽입 확인 (`.record-ref` 클래스)
      4. Submit → 저장된 응답에서 `.record-ref` 링크 확인
    Expected Result: [[recordRef]]가 정상 동작
    Evidence: .sisyphus/evidence/task-9-recordref-complete.png

  Scenario: 멘션 알림 확인
    Tool: Playwright
    Preconditions: 사용자 A가 사용자 B를 @mention하는 응답 작성
    Steps:
      1. 사용자 A로 로그인, 응답에서 @사용자B 멘션 포함 작성
      2. 사용자 B로 로그인 (또는 .dev.vars의 TEST 세션 사용)
      3. `/inbox` 접근
      4. "~님이 회원님을 언급했습니다" 알림 존재 확인
    Expected Result: inbox에 멘션 알림 표시
    Failure Indicators: 알림 미생성
    Evidence: .sisyphus/evidence/task-9-notification.png

  Scenario: 역참조 섹션 표시
    Tool: Playwright
    Preconditions: 응답에서 [[recordB]]를 멘션한 상태
    Steps:
      1. `/logs/:recordBSlug` 접근 (멘션된 기록)
      2. "이 글을 언급한 응답" 섹션 존재 확인
      3. 섹션 내에 응답 작성자 이름, 출처 기록 링크, 응답 excerpt 확인
    Expected Result: 역참조 섹션에 해당 응답 정보 표시
    Failure Indicators: 섹션 미표시, 데이터 누락
    Evidence: .sisyphus/evidence/task-9-backreference.png

  Scenario: 기존 plain text 응답 하위 호환
    Tool: Playwright
    Preconditions: 기존 plain text 응답 데이터 존재
    Steps:
      1. plain text 응답이 있는 기록 페이지 접근
      2. 기존 응답이 정상 렌더링되는지 확인 (깨짐 없음)
      3. 기존 plain text 응답 편집 클릭 → ResponseEditor에 텍스트 로드 확인
    Expected Result: 기존 응답 정상 표시, 편집 시 에디터에 텍스트 로드
    Failure Indicators: 렌더링 깨짐, 에디터 초기화 실패
    Evidence: .sisyphus/evidence/task-9-backward-compat.png

  Scenario: Self-mention 알림 미발송
    Tool: Playwright
    Preconditions: 인증된 사용자
    Steps:
      1. 자신을 @mention하는 응답 작성
      2. `/inbox` 접근
      3. 자기 멘션 알림 부재 확인
    Expected Result: self-mention에 대한 알림 없음
    Evidence: .sisyphus/evidence/task-9-self-mention.png

  Scenario: ResponseEditor lazy loading chunk 분리 검증
    Tool: Bash
    Preconditions: Task 9 통합 완료, `pnpm build` 성공
    Steps:
      1. `pnpm build` 실행
      2. `ls build/client/assets/ | grep -i "editor\|tiptap\|mention"` — ResponseEditor 관련 chunk 존재 확인
      3. 메인 entry chunk 파일 크기가 ResponseEditor 미포함 시와 유사한지 확인 (Tiptap이 메인 번들에 없음)
    Expected Result: ResponseEditor + Tiptap 코드가 별도 chunk 파일에 분리됨
    Failure Indicators: 메인 번들에 Tiptap 코드 포함, chunk 미분리
    Evidence: .sisyphus/evidence/task-9-lazy-load-chunks.txt
  ```

  **Commit**: YES (9)
  - Message: `feat(response): integrate ResponseEditor with mention support into all response forms`
  - Files: `app/routes/public/logs/$recordSlug.tsx`
  - Pre-commit: `pnpm typecheck && pnpm build`

---

## Final Verification Wave

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.

- [x] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, curl endpoint, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in `.sisyphus/evidence/`. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [x] F2. **Code Quality Review** — `unspecified-high`
  Run `pnpm typecheck` + `pnpm build` + `pnpm vitest run app/db/queries/dialogue/__tests__/` (새 테스트만 — 기존 suite에 관련 없는 실패 있음). Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names. Verify ResponseEditor lazy loading pattern.
  Output: `Build [PASS/FAIL] | Typecheck [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [x] F3. **Real Manual QA** — `unspecified-high` (+ `playwright` skill)
  Start from clean state. Test: (1) @mention 자동완성 팝업, 선택, 렌더링, hover preview (2) [[recordRef]] 자동완성 팝업, 선택, 렌더링, hover preview (3) 멘션 알림 /inbox 확인 (4) 역참조 섹션 표시 (5) 기존 plain text 응답 렌더링 (6) 응답 수정 시 멘션 재동기화 (7) Edge cases: 빈 멘션, self-mention, 10개 초과 멘션. Save to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [x] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff. Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT do" compliance: no images/tables/slash commands in ResponseEditor, no autosave, no modification to existing record mention flow. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

| Commit | Scope | Files | Verification |
|--------|-------|-------|-------------|
| 1 | DB schema | migration, schema.server.ts, relations.server.ts | `pnpm typecheck` |
| 2 | ResponseEditor | ResponseEditor.tsx, editor.css | `pnpm typecheck && pnpm build` |
| 3 | Validation | validation.ts | `pnpm typecheck` |
| 4 | Sync queries | responseMentions.server.ts, responseRecordRefs.server.ts | `pnpm typecheck && pnpm vitest run <new-tests>` |
| 5 | Back-ref query | responseRecordRefs.server.ts | `pnpm typecheck && pnpm vitest run <new-tests>` |
| 6 | Rendering | $recordSlug.server.ts (loader), ResponseCard.tsx | `pnpm typecheck && pnpm build` |
| 7 | Actions | $recordSlug.server.ts (actions), mention-delivery.server.ts | `pnpm typecheck && pnpm vitest run <new-tests>` |
| 8 | Back-ref UI | IncomingResponseRefs component | `pnpm typecheck && pnpm build` |
| 9 | Integration | $recordSlug.tsx (forms + back-ref section) | `pnpm typecheck && pnpm build` |

---

## Success Criteria

### Verification Commands
```bash
pnpm typecheck                                    # Expected: 0 errors
pnpm build                                        # Expected: build success
pnpm vitest run app/db/queries/dialogue/__tests__  # Expected: 새 테스트 파일 all pass
```

> **NOTE**: `pnpm test` 전체 실행 시 기존 관련 없는 테스트 실패가 있음. 이 기능 범위의 테스트만 검증.

### Final Checklist
- [ ] @mention 자동완성 + 렌더링 + hover preview 작동
- [ ] [[recordRef]] 자동완성 + 렌더링 + hover preview 작동
- [ ] 멘션 알림 /inbox에서 확인 가능
- [ ] "이 글을 언급한 응답" 역참조 섹션 표시
- [ ] 기존 plain text 응답 하위 호환
- [ ] ResponseEditor lazy loading 확인 (bundle split)
- [ ] 응답 수정 시 멘션 재동기화
- [ ] 응답 삭제 시 멘션/ref 정리
- [ ] self-mention 알림 미발송
- [ ] 멘션 10개 / recordRef 10개 상한 적용
