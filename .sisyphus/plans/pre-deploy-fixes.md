# 배포 전 정합성 수정 계획

## TL;DR

> **Quick Summary**: 최종 배포를 막는 설정 누락, N+1 쿼리, 공개 노출 라우트, 디자인 토큰 이탈, 접근성 결함을 작은 파동으로 나눠 안전하게 정리한다.
>
> **Deliverables**:
> - 배포 설정 정합화 (`wrangler.deploy.toml`, 관리자 설정 체크리스트)
> - N+1 제거 및 dead code 정리
> - 스키마 제약 보강 마이그레이션
> - 공개/비공개 라우트 정리
> - 디자인 토큰/접근성/반경 일관성 복구
>
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 4 waves
> **Critical Path**: 테스트 기준선 정리 → N+1 제거 → 스키마 제약 추가 → 배포 설정/라우트 차단

---

## Context

### Original Request
코드베이스 전체를 배포 전에 전수 검토해 누락, 맥락 불일치, 결핍, 상호 충돌을 찾고 수정 계획까지 세운다.

### Interview Summary
**Key Discussions**:
- 전체 코드베이스(36k LOC)를 6개 병렬 에이전트와 직접 검색으로 전수 감사했다.
- 수정 범위는 배포 차단 이슈와 배포 직전 품질 이슈 중심으로 묶는다.
- 새 기능 구현보다 배포 안전성 확보가 우선이다.

**Research Findings**:
- 인증, 타입 안전성, XSS/SQLi 방어, 서버/클라이언트 분리, 스키마-릴레이션 정합성은 전반적으로 양호하다.
- 실제 수정 우선순위는 설정 누락, N+1, 라우트 노출, 디자인 토큰 이탈, 접근성이다.
- `challenges` 누락은 “미구현 기능”이라서 이번 배포 차단 범위에서는 제거하고, 대신 비활성 기능 문서 정합성으로 관리한다.

### Metis Review
**Identified Gaps** (addressed):
- `challenges` 라우트는 false positive로 분류해 이번 계획에서 제외한다.
- `Sentry DSN 3곳`은 아키텍처상 정상 패턴이라 수정 범위에서 제외한다.
- `getOptionalUser`를 쓰는 검색/프리뷰 API는 의도된 공개 패턴이라 blanket 변경하지 않는다.
- pre-existing `autosave` 테스트 실패 가능성을 기준선 복구 태스크로 승격한다.

---

## Work Objectives

### Core Objective
배포 전 코드베이스의 실제 차단 요인과 고위험 품질 문제를 제거해, 현재 기능 범위를 유지한 채 안정적으로 배포 가능한 상태를 만든다.

### Concrete Deliverables
- `wrangler.deploy.toml`와 관리자 설정 절차가 프로덕션 배포 기준에 맞게 정리된다.
- 확인된 loop-insert / per-item notification 패턴이 배치 처리로 바뀐다.
- `user_roles`, `mentions` 무결성을 강화하는 마이그레이션이 추가된다.
- `/style-reference` 공개 노출이 제거되거나 관리자 전용으로 제한된다.
- 하드코딩 색상, 접근성 결함, 카드 반경 불일치가 지정된 파일에서 해소된다.

### Definition of Done
- [ ] `pnpm typecheck` 통과
- [ ] `pnpm test`가 기준선 대비 추가 실패 없이 통과하거나, Wave 0 이후 완전 녹색 기준선(권장)을 확보
- [ ] 배포 설정 diff에서 `LOG_LEVEL`/관측 설정 누락이 사라짐
- [ ] N+1 대상 파일에서 per-item insert 루프가 제거됨
- [ ] `/style-reference`가 공개 경로에서 제거되거나 비관리자 접근이 차단됨

### Must Have
- 실제 배포를 막는 설정과 코드 경로만 수정한다.
- 기존 제품 철학(한국어 UI, Journey-first, no ranking/likes)을 훼손하지 않는다.
- D1 마이그레이션은 중복 데이터가 있어도 실패하지 않도록 방어적으로 작성한다.

### Must NOT Have (Guardrails)
- `challenges` 기능을 새로 구현하지 않는다.
- false positive였던 Sentry DSN 통합 작업을 끼워 넣지 않는다.
- 검색/프리뷰 공개 API를 무작정 인증 API로 바꾸지 않는다.
- 전면적인 디자인 리뉴얼, 전체 a11y 재설계, 전체 AGENTS.md 개편으로 범위를 키우지 않는다.

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — 가능한 검증은 모두 명령/도구 기반으로 수행한다.

### Test Decision
- **Infrastructure exists**: YES
- **Automated tests**: Tests-after
- **Framework**: `vitest`
- **Baseline note**: `app/routes/api/__tests__/autosave.test.ts`의 기존 실패 가능성을 우선 정리해 녹색 기준선을 확보한다.

### QA Policy
- DB/쿼리 수정: `pnpm test`, `pnpm typecheck`, grep/ast-grep로 old pattern 제거 확인
- 라우트/설정 수정: `pnpm build`, config diff 확인, 필요 시 `wrangler deploy --config wrangler.deploy.toml --dry-run` 또는 동등한 비파괴 검증
- UI 수정: Playwright 또는 DOM snapshot/grep로 클래스와 속성 존재 확인

---

## Execution Strategy

### Parallel Execution Waves

Wave 0 (기준선 복구):
├── Task 1: autosave 테스트 기준선 복구

Wave 1 (즉시 배포 차단 제거):
├── Task 2: deploy 설정 정합화
├── Task 3: 관리자 설정 체크리스트/placeholder 방어
├── Task 4: style-reference 공개 노출 차단

Wave 2 (데이터 계층 성능/무결성):
├── Task 5: tags/recordLinks 배치 insert 전환
├── Task 6: dead code mentions 정리 + participant notification 배치화
├── Task 7: unique constraint 마이그레이션 추가

Wave 3 (UI/디자인 정합성):
├── Task 8: read-state 색상 토큰 추가
├── Task 9: Scene/Timeline/editor 색상 하드코딩 제거
├── Task 10: 접근성 수정
├── Task 11: 카드 반경 일관화

Wave 4 (문서/정책 정합성):
├── Task 12: 비활성 라우트/실제 구현 범위 문서 동기화
├── Task 13: action 응답 타입 정리 후보 검토 및 최소 반영

Wave FINAL:
├── Task F1: Plan compliance audit
├── Task F2: Code quality review
├── Task F3: Real QA execution
└── Task F4: Scope fidelity check

Critical Path: 1 → 2 → 5 → 7 → 4 → FINAL

### Dependency Matrix
- **1**: — → 5, 6, 7, 13, FINAL
- **2**: — → FINAL
- **3**: — → FINAL
- **4**: 2 → FINAL
- **5**: 1 → 7, FINAL
- **6**: 1 → FINAL
- **7**: 5 → FINAL
- **8**: — → 9, 11, FINAL
- **9**: 8 → FINAL
- **10**: — → FINAL
- **11**: 8 → FINAL
- **12**: — → FINAL
- **13**: 1 → FINAL

### Agent Dispatch Summary
- **0**: **1** — T1 → `quick`
- **1**: **3** — T2 → `quick`, T3 → `unspecified-low`, T4 → `quick`
- **2**: **3** — T5 → `unspecified-high`, T6 → `unspecified-high`, T7 → `unspecified-high`
- **3**: **4** — T8 → `quick`, T9 → `visual-engineering`, T10 → `visual-engineering`, T11 → `quick`
- **4**: **2** — T12 → `writing`, T13 → `quick`
- **FINAL**: **4** — F1 → `deep`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `deep`

---

## TODOs

- [x] 1. 테스트 기준선 복구 (`autosave`)

  **What to do**:
  - `app/routes/api/__tests__/autosave.test.ts:100`의 기대값과 `app/routes/api/autosave.tsx:73` 실제 동작을 맞춘다.
  - 테스트를 코드에 맞추거나, 정말 코드가 잘못됐다면 autosave 동작을 고정하되 이번 배포 범위를 넘지 않게 최소 수정한다.

  **Must NOT do**:
  - autosave 기능을 재설계하지 않는다.
  - localStorage TTL, autosave UX, drafts 스키마까지 확장하지 않는다.

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 단일 테스트/핸들러 기준선 정리다.
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**:
    - `playwright`: 브라우저 QA보다 테스트 기준선 복구가 핵심이다.

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: 5, 6, 7, 13
  - **Blocked By**: None

  **References**:
  - `app/routes/api/__tests__/autosave.test.ts:100` - 현재 실패 기대값 (`visibility: "draft"`) 확인
  - `app/routes/api/autosave.tsx:73` - 실제 autosave 저장 payload는 `visibility: "public"`으로 덮어쓴다

  **Acceptance Criteria**:
  - [ ] `pnpm test app/routes/api/__tests__/autosave.test.ts` 또는 동등한 vitest 대상 실행 시 PASS
  - [ ] 기준선 복구 후 전체 `pnpm test` 실패 수가 증가하지 않음

  **QA Scenarios**:
  ```
  Scenario: autosave note request succeeds with current visibility semantics
    Tool: Bash (vitest)
    Preconditions: repository install complete
    Steps:
      1. Run `pnpm test app/routes/api/__tests__/autosave.test.ts`
      2. Confirm the valid note test passes with the resolved expectation/code path
    Expected Result: exit code 0 and autosave test file passes
    Failure Indicators: assertion mismatch on upsert payload or response body
    Evidence: .sisyphus/evidence/task-1-autosave-test.txt

  Scenario: invalid format still fails safely
    Tool: Bash (vitest)
    Preconditions: same as above
    Steps:
      1. Run the same targeted vitest file
      2. Verify the invalid format test still returns 400-path assertions
    Expected Result: invalid input test remains green
    Evidence: .sisyphus/evidence/task-1-autosave-invalid.txt
  ```

- [x] 2. 프로덕션 wrangler 설정 정합화

  **What to do**:
  - `wrangler.deploy.toml:11`에 `LOG_LEVEL = "INFO"`를 추가한다.
  - `wrangler.toml:23`에만 있는 `migrations_dir = "drizzle/migrations"`를 deploy config에도 반영할지 검토하고, 실제 deploy 경로와 맞춰 정리한다.
  - `observability.logs.invocation_logs = true`를 배포 설정에도 맞춘다.

  **Must NOT do**:
  - 다른 바인딩 구조를 재설계하지 않는다.
  - D1/R2/Queues 스펙 자체를 바꾸지 않는다.

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 작은 설정 파일 수정이다.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with 3, 4)
  - **Blocks**: FINAL
  - **Blocked By**: None

  **References**:
  - `package.json:8` - 실제 배포는 `wrangler.deploy.toml`을 사용한다
  - `wrangler.toml:11` - dev config의 정답값 (`LOG_LEVEL`, `migrations_dir`, logs 설정)
  - `wrangler.deploy.toml:11` - 현재 누락된 배포 vars/observability 위치

  **Acceptance Criteria**:
  - [ ] `wrangler.deploy.toml`에 `LOG_LEVEL`이 존재한다
  - [ ] 배포 설정에 invocation logs 설정이 명시된다
  - [ ] `pnpm build`가 설정 변경과 무관하게 계속 통과한다

  **QA Scenarios**:
  ```
  Scenario: production config contains required runtime vars
    Tool: Bash
    Preconditions: file saved
    Steps:
      1. Run `grep -n "LOG_LEVEL\|invocation_logs\|migrations_dir" wrangler.deploy.toml`
      2. Verify expected keys are present with intended values
    Expected Result: all required lines are printed once
    Failure Indicators: missing LOG_LEVEL or missing invocation_logs
    Evidence: .sisyphus/evidence/task-2-wrangler-grep.txt

  Scenario: build still succeeds with updated deploy config tracked in repo
    Tool: Bash
    Preconditions: config edits committed in working tree
    Steps:
      1. Run `pnpm build`
    Expected Result: build exits 0
    Evidence: .sisyphus/evidence/task-2-build.txt
  ```

- [x] 3. 관리자 bootstrap 전제조건 문서화 및 placeholder 가시화

  **What to do**:
  - `app/lib/auth/auth.middleware.ts:108`의 placeholder skip path가 실제 배포 전 체크리스트에서 드러나도록 문서 또는 경고를 추가한다.
  - 실제 `ADMIN_USER_ID`는 비밀값/배포값으로 넣어야 함을 `.sisyphus` 계획과 프로젝트 문서에 남긴다.

  **Must NOT do**:
  - 실제 관리자 ID를 저장소에 하드코딩하지 않는다.
  - bootstrap 로직 자체를 재작성하지 않는다.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: 코드와 문서 경계의 작은 안전장치 작업이다.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with 2, 4)
  - **Blocks**: FINAL
  - **Blocked By**: None

  **References**:
  - `app/lib/auth/auth.middleware.ts:108` - placeholder이면 bootstrap을 조용히 건너뛴다
  - `wrangler.deploy.toml:12` - 실제 배포 파일에도 placeholder가 들어 있다

  **Acceptance Criteria**:
  - [ ] 실제 배포 시 `ADMIN_USER_ID`가 필요하다는 사실이 코드/문서에서 숨지 않는다
  - [ ] 저장소에는 여전히 실제 관리자 ID가 커밋되지 않는다

  **QA Scenarios**:
  ```
  Scenario: placeholder path is visibly documented
    Tool: Bash
    Preconditions: documentation/code comment added
    Steps:
      1. Run `grep -R "ADMIN_USER_ID" app/lib/auth .sisyphus/plans README.md .docs 2>/dev/null`
      2. Verify there is an explicit deployment note or warning
    Expected Result: at least one actionable note references deploy-time requirement
    Evidence: .sisyphus/evidence/task-3-admin-id.txt

  Scenario: repository still contains no real admin id literal
    Tool: Bash
    Preconditions: no secret added
    Steps:
      1. Run `grep -R "usr_placeholder_replace_with_real_admin_id\|ADMIN_USER_ID" wrangler.toml wrangler.deploy.toml app/lib/auth/auth.middleware.ts`
    Expected Result: only placeholder and validation references appear
    Evidence: .sisyphus/evidence/task-3-placeholder-scan.txt
  ```

- [x] 4. `style-reference` 공개 노출 차단

  **What to do**:
  - 기본값으로 `app/routes.ts:32`에서 `/style-reference`를 제거하거나, `app/routes/public/style-reference.tsx:1`에 관리자 전용 loader를 추가한다.
  - 의도적으로 공개하지 않는다면 `noindex`까지 포함해 재노출을 막는다.

  **Must NOT do**:
  - 디자인 레퍼런스 페이지 내용을 개편하지 않는다.
  - challenges 같은 다른 미구현 라우트까지 손대지 않는다.

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 라우트 등록/가드의 작은 수정이다.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with 2, 3)
  - **Blocks**: FINAL
  - **Blocked By**: 2 (if config/environment guard is chosen) | None (if route removal)

  **References**:
  - `app/routes.ts:32` - 현재 공개 라우트 등록 위치
  - `app/routes/public/style-reference.tsx:766` - 페이지 자체가 `/style-reference` 공개 경로를 명시한다

  **Acceptance Criteria**:
  - [ ] 비관리자 사용자가 `/style-reference`로 공개 접근할 수 없다
  - [ ] routes.ts grep 결과에서 공개 등록이 제거되거나 보호 근거가 명확하다

  **QA Scenarios**:
  ```
  Scenario: style-reference is not publicly reachable
    Tool: Bash or Playwright
    Preconditions: route removal or auth guard applied
    Steps:
      1. Start app in dev/preview mode
      2. Request `/style-reference` as unauthenticated user
      3. Assert 404, redirect, or admin-only response
    Expected Result: no public page render
    Failure Indicators: page title/content renders for anonymous user
    Evidence: .sisyphus/evidence/task-4-style-reference.txt

  Scenario: legal/help routes remain reachable
    Tool: Bash or Playwright
    Preconditions: same server session
    Steps:
      1. Request `/terms` and `/privacy`
      2. Assert both still render 200
    Expected Result: only style-reference changed, legal pages unaffected
    Evidence: .sisyphus/evidence/task-4-legal-routes.txt
  ```

- [x] 5. 확인된 loop-insert DB 쓰기 경로를 배치 처리로 전환

  **What to do**:
  - `app/db/queries/records/tags.server.ts:225`의 `syncTagsForRecord`를 `values(tagIds.map(...))` 패턴으로 바꾼다.
  - `app/db/queries/records/recordLinks.server.ts:25`와 `app/db/queries/records/recordLinks.server.ts:96`의 record link 동기화도 동일하게 batched insert로 바꾼다.
  - 필요하면 999 SQLite parameter limit를 넘지 않도록 작은 chunk helper를 같은 파일 또는 공용 util로 도입한다.

  **Must NOT do**:
  - SELECT 쿼리, 정렬, 공개 범위 로직까지 최적화하지 않는다.
  - 함수 시그니처를 크게 바꾸지 않는다.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 여러 DB query 모듈을 건드리지만 패턴은 단순하다.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with 6, 7)
  - **Blocks**: 7, FINAL
  - **Blocked By**: 1

  **References**:
  - `app/db/queries/records/tags.server.ts:236` - 현재 per-tag insert loop
  - `app/db/queries/records/recordLinks.server.ts:34` - reference link per-item insert
  - `app/db/queries/records/recordLinks.server.ts:114` - typed link per-item insert
  - `app/db/queries/records/recordReads.server.ts:54` - 이미 존재하는 canonical batch insert 예제

  **Acceptance Criteria**:
  - [ ] 세 파일에서 `for (...) { await database.insert(...) }` 패턴이 사라진다
  - [ ] `pnpm typecheck` 통과
  - [ ] 관련 테스트/저장 플로우가 기존 동작을 유지한다

  **QA Scenarios**:
  ```
  Scenario: batch insert pattern replaces loop inserts
    Tool: Bash
    Preconditions: code edited
    Steps:
      1. Run `grep -n "for (const .*await database.insert" -R app/db/queries/records/tags.server.ts app/db/queries/records/recordLinks.server.ts`
      2. Confirm no matching loop-insert pattern remains
    Expected Result: grep returns no matches for the fixed functions
    Evidence: .sisyphus/evidence/task-5-grep.txt

  Scenario: metadata save path still works after batching
    Tool: Playwright or Bash (targeted tests)
    Preconditions: app running and record metadata edit path available
    Steps:
      1. Save a record with multiple tags and mentioned records
      2. Reload and confirm tags/links persist
    Expected Result: persisted metadata matches submitted values
    Evidence: .sisyphus/evidence/task-5-save-metadata.txt
  ```

- [x] 6. dead code mentions 제거 + participant notification 배치화

  **What to do**:
  - `app/db/queries/dialogue/mentions.server.ts:10`의 deprecated `syncMentionsForRecord`가 실제 무호출인지 확인 후 삭제한다.
  - `app/routes/public/write/meta.$recordId.tsx:190`의 participant notification 루프를 batched helper로 전환한다.
  - 필요 시 `app/db/queries/social/notifications.server.ts:67`에 bulk create helper를 추가한다.

  **Must NOT do**:
  - `syncAllMentionsForRecord`의 현재 동작을 바꾸지 않는다.
  - 알림 큐/비동기 워커까지 확장하지 않는다.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: route + query helper를 함께 정리하는 데이터 계층 작업이다.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with 5, 7)
  - **Blocks**: FINAL
  - **Blocked By**: 1

  **References**:
  - `app/db/queries/dialogue/mentions.server.ts:10` - deprecated dead code 후보
  - `app/routes/public/write/meta.$recordId.tsx:190` - participant마다 notification을 한 번씩 insert한다
  - `app/db/queries/social/notifications.server.ts:67` - 현재 single notification helper 정의

  **Acceptance Criteria**:
  - [ ] dead code 확인 후 `syncMentionsForRecord`가 제거되거나 명시적으로 남겨야 할 이유가 주석으로 남는다
  - [ ] participant notification 생성이 per-item insert loop가 아닌 batch helper를 사용한다
  - [ ] 메타 저장 후 participant notification 기능이 유지된다

  **QA Scenarios**:
  ```
  Scenario: deprecated mention function has no remaining callers
    Tool: Grep / LSP references
    Preconditions: code edited
    Steps:
      1. Run symbol reference search or `grep -R "syncMentionsForRecord" app`
      2. Confirm only intended definition/removal diff remains
    Expected Result: zero runtime callers
    Evidence: .sisyphus/evidence/task-6-mentions-refs.txt

  Scenario: participant notifications still emit on metadata save
    Tool: Playwright or Bash
    Preconditions: authenticated verified user and editable record
    Steps:
      1. Add two participants in `/write/meta/:recordId`
      2. Save metadata and inspect notifications table or inbox
    Expected Result: both non-author participants receive notification entries
    Evidence: .sisyphus/evidence/task-6-participant-notify.txt
  ```

- [x] 7. `user_roles` / `mentions` 무결성 제약 마이그레이션 추가

  **What to do**:
  - `app/db/schema.server.ts:248`의 `userRoles`와 `app/db/schema.server.ts:281`의 `mentions`에 unique index를 반영한다.
  - `drizzle/migrations/`에 duplicate-safe migration을 추가한다.
  - migration SQL은 기존 중복 row를 먼저 dedup한 뒤 index를 만든다.

  **Must NOT do**:
  - 다른 테이블 제약/컬럼을 함께 손대지 않는다.
  - 프로덕션 데이터 정리를 수동 전제로 두지 않는다.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: schema + migration의 양방향 변경이 필요하다.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with 5, 6)
  - **Blocks**: FINAL
  - **Blocked By**: 5

  **References**:
  - `app/db/schema.server.ts:248` - `user_roles`는 코드상 중복 체크만 있고 DB 제약은 없다
  - `app/db/schema.server.ts:281` - `mentions`는 같은 사용자 멘션 중복 허용 상태다
  - `drizzle/migrations/` - 기존 migration naming/style를 따라야 한다

  **Acceptance Criteria**:
  - [ ] schema 정의와 migration SQL이 모두 unique 제약을 반영한다
  - [ ] `wrangler d1 migrations apply DB --local` 성공
  - [ ] duplicate insert 시 unique violation 또는 ignore 전략이 의도대로 동작한다

  **QA Scenarios**:
  ```
  Scenario: local migrations apply cleanly
    Tool: Bash
    Preconditions: local D1 configured
    Steps:
      1. Run `wrangler d1 migrations apply DB --local`
    Expected Result: migration exits 0
    Evidence: .sisyphus/evidence/task-7-migrate.txt

  Scenario: duplicate role or mention cannot be inserted twice
    Tool: Bash
    Preconditions: migrated local DB
    Steps:
      1. Execute duplicate insert SQL for `user_roles` and `mentions`
      2. Confirm duplicate row is rejected or deduped as designed
    Expected Result: no duplicate logical record remains
    Evidence: .sisyphus/evidence/task-7-unique-check.txt
  ```

- [x] 8. read-state 색상 토큰 정의 추가

  **What to do**:
  - `app/styles/global.css:5`에 read-state용 CSS custom properties를 추가한다.
  - 필요한 경우 `@theme inline`에도 매핑해 Tailwind 유틸리티로 참조 가능하게 만든다.

  **Must NOT do**:
  - 전체 색상 체계를 재설계하지 않는다.
  - 다크 모드/테마 전환까지 확장하지 않는다.

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 단일 스타일 파일에 토큰을 추가하는 작업이다.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with 10)
  - **Blocks**: 9, 11
  - **Blocked By**: None

  **References**:
  - `app/styles/global.css:5` - 현재 루트 디자인 토큰 정의 위치
  - `app/components/cards/SceneCard.tsx:124` - read-state 색이 토큰 없이 하드코딩되어 있다

  **Acceptance Criteria**:
  - [ ] read-state 색상 토큰이 global.css에 존재한다
  - [ ] 후속 컴포넌트가 토큰을 사용 가능하다

  **QA Scenarios**:
  ```
  Scenario: read-state CSS variables exist
    Tool: Bash
    Preconditions: style file saved
    Steps:
      1. Run `grep -n "read" app/styles/global.css`
    Expected Result: read-state token definitions are present
    Evidence: .sisyphus/evidence/task-8-read-tokens.txt

  Scenario: build still resolves Tailwind/CSS layers
    Tool: Bash
    Preconditions: token edits complete
    Steps:
      1. Run `pnpm build`
    Expected Result: CSS compiles with no token-related errors
    Evidence: .sisyphus/evidence/task-8-build.txt
  ```

- [x] 9. Scene/Timeline/editor 색상 하드코딩 제거

  **What to do**:
  - `SceneCard.tsx`, `CompactTimelineCard.tsx`, `SlashCommandMenu.tsx`, `ArticleEditor.tsx`의 확인된 색상 하드코딩을 토큰 기반 참조로 바꾼다.
  - editor 색상 팔레트는 제품적으로 의도된 값이면 상수화/토큰화만 하고 팔레트 자체는 바꾸지 않는다.

  **Must NOT do**:
  - 새로운 시각 언어를 도입하지 않는다.
  - read state 외 다른 카드 스타일을 손대지 않는다.

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: 스타일 일관성 복구지만 구조 변화는 작다.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with 10, 11)
  - **Blocks**: FINAL
  - **Blocked By**: 8

  **References**:
  - `app/components/cards/SceneCard.tsx:124` - read-state 배경/링/텍스트 하드코딩
  - `app/components/cards/CompactTimelineCard.tsx:48` - read-state + 반경 하드코딩 위치
  - `app/components/editor/editors/SlashCommandMenu.tsx:37` - 인라인 border/background/shadow 하드코딩
  - `app/components/editor/editors/ArticleEditor.tsx:111` - 팔레트 상수 하드코딩

  **Acceptance Criteria**:
  - [ ] 지정된 파일에서 확인된 hex literal이 제거된다
  - [ ] read-state 시각 차이는 유지된다

  **QA Scenarios**:
  ```
  Scenario: targeted hardcoded colors are gone
    Tool: Bash
    Preconditions: edits complete
    Steps:
      1. Run `grep -R "#ECEEF1\|#D8DCE3\|#F0F2F5\|#A0A4AB\|#E0E3E8\|#8C8F96\|#FFFFFF" app/components/cards app/components/editor`
    Expected Result: only allowed palette constants remain, or no targeted read-state literals remain in fixed files
    Evidence: .sisyphus/evidence/task-9-color-scan.txt

  Scenario: read-state cards still render distinctly
    Tool: Playwright
    Preconditions: app running with read/unread records visible
    Steps:
      1. Open a page containing SceneCard and CompactTimelineCard entries
      2. Compare read vs unread card appearance
    Expected Result: read cards remain visually muted without broken styling
    Evidence: .sisyphus/evidence/task-9-read-cards.png
  ```

- [x] 10. 접근성 결함 보정

  **What to do**:
  - `GlobalNav.tsx:457`, `PersonSearch.tsx:362/393`, `MentionPreview.tsx:313/386` 등 장식성 프로필 이미지에 `aria-hidden="true"` 또는 의미 있는 alt를 추가한다.
  - `ResponseCard.tsx:127`의 액션 버튼에 focus-visible ring과 44px 터치 타깃을 준다.

  **Must NOT do**:
  - 전역 a11y overhaul을 하지 않는다.
  - 컴포넌트 구조를 대대적으로 바꾸지 않는다.

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: DOM 속성과 인터랙션 affordance 조정이 핵심이다.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with 8, 9, 11)
  - **Blocks**: FINAL
  - **Blocked By**: None

  **References**:
  - `app/components/layout/GlobalNav.tsx:457` - alt empty profile image
  - `app/components/PersonSearch.tsx:362` - 검색 결과 avatar 이미지
  - `app/components/content/MentionPreview.tsx:313` - preview avatar 이미지
  - `app/components/cards/ResponseCard.tsx:127` - focus ring 없는 action buttons

  **Acceptance Criteria**:
  - [ ] 확인된 이미지 요소가 장식/정보 용도에 맞는 alt/aria-hidden을 가진다
  - [ ] 확인된 버튼 요소에 focus-visible ring과 충분한 클릭 영역이 생긴다

  **QA Scenarios**:
  ```
  Scenario: targeted img elements have accessibility attributes
    Tool: Bash
    Preconditions: files edited
    Steps:
      1. Run grep on the targeted files for `<img` blocks
      2. Confirm each has either meaningful `alt` or `aria-hidden="true"`
    Expected Result: no empty-alt decorative image remains unmarked in the targeted set
    Evidence: .sisyphus/evidence/task-10-img-a11y.txt

  Scenario: response action buttons expose visible keyboard focus
    Tool: Playwright
    Preconditions: response card rendered
    Steps:
      1. Tab to `답글`, `수정`, `삭제`
      2. Capture focus state screenshot
    Expected Result: focus ring is visible and buttons are easily targetable
    Evidence: .sisyphus/evidence/task-10-focus.png
  ```

- [x] 11. 카드 반경 일관화

  **What to do**:
  - `CompactTimelineCard.tsx:48`, `SelfAnswerCard.tsx:32`를 기준 반경값에 맞춘다.
  - 이미 `rounded-2xl`을 쓰는 `QuestionCard`, `LearnerCard`, `HighlightedSentenceCard`, `ResponseCard`, `SceneCard`와 조화되도록 맞춘다.

  **Must NOT do**:
  - padding, shadow, layout까지 조정하지 않는다.

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 클래스 치환 중심의 단순 수정이다.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with 9, 10)
  - **Blocks**: FINAL
  - **Blocked By**: 8

  **References**:
  - `app/components/cards/CompactTimelineCard.tsx:48` - `rounded-xl`
  - `app/components/cards/SelfAnswerCard.tsx:32` - `rounded-r-xl`
  - `app/components/cards/QuestionCard.tsx:40` - 기준이 되는 `rounded-2xl`

  **Acceptance Criteria**:
  - [ ] 대상 카드 두 곳이 기준 반경값으로 통일된다
  - [ ] 시각적 레이아웃 회귀가 없다

  **QA Scenarios**:
  ```
  Scenario: target cards use normalized radius classes
    Tool: Bash
    Preconditions: classes updated
    Steps:
      1. Run `grep -n "rounded" app/components/cards/CompactTimelineCard.tsx app/components/cards/SelfAnswerCard.tsx`
    Expected Result: old `rounded-xl`/`rounded-r-xl` values are replaced by intended normalized value
    Evidence: .sisyphus/evidence/task-11-radius-grep.txt

  Scenario: cards still render without clipping artifacts
    Tool: Playwright
    Preconditions: pages containing both cards available
    Steps:
      1. Capture screenshots of both card types
    Expected Result: corners look consistent with the rest of the card system
    Evidence: .sisyphus/evidence/task-11-cards.png
  ```

- [x] 12. 비활성 기능/실제 구현 범위 문서 동기화

  **What to do**:
  - AGENTS.md 또는 인접 프로젝트 문서에서 실제 비활성 라우트 상태를 반영한다.
  - `journey/:stageSlug`, `groups`, `memories`, `admin/collaboration`, `admin/memories`는 routes.ts와 파일 상태가 엇갈리지 않게 문서화한다.
  - `questions`, `guide/full`, `terms`, `privacy`, `write/meta/:recordId` 같은 현재 활성 추가 라우트도 문서에 반영한다.

  **Must NOT do**:
  - 기능 구현 범위를 넓히지 않는다.
  - 사이트맵을 실제 코드와 다른 이상적인 상태로 다시 쓰지 않는다.

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: 문서 정합성 작업이다.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with 13)
  - **Blocks**: FINAL
  - **Blocked By**: None

  **References**:
  - `app/routes.ts:7` - stage/collab/memory 라우트 주석 상태
  - `app/routes/public/journey/$stageSlug.tsx:8` - 실제 파일은 존재하지만 route 등록은 꺼져 있다
  - `app/routes/admin/collaboration/index.tsx:1` - 비활성 명시 파일
  - `.sisyphus/drafts/pre-deploy-audit.md:97` - 감사 중 정리한 문서 불일치 목록

  **Acceptance Criteria**:
  - [ ] 문서가 현재 구현/비활성 상태를 사실대로 반영한다
  - [ ] `challenges`는 “미구현” 또는 별도 phase로만 기록된다

  **QA Scenarios**:
  ```
  Scenario: route docs match actual route registration
    Tool: Bash
    Preconditions: docs updated
    Steps:
      1. Compare `app/routes.ts` commented/active entries with updated docs
    Expected Result: no documented active route contradicts current registration state
    Evidence: .sisyphus/evidence/task-12-route-doc-sync.txt

  Scenario: added public helper routes are documented
    Tool: Bash
    Preconditions: same docs
    Steps:
      1. Search docs for `questions`, `guide/full`, `terms`, `privacy`, `write/meta`
    Expected Result: current live routes are discoverable in docs
    Evidence: .sisyphus/evidence/task-12-extra-routes.txt
  ```

- [x] 13. action 응답 타입 최소 정리

  **What to do**:
  - `app/routes/public/logs/$recordSlug.server.ts:210`, `:356`, `:391`, `:428`, `:450`, `:467`, `:470`처럼 plain object를 반환하는 action 응답을 `data()` 헬퍼 기준으로 최소 정리할지 검토한다.
  - 이 작업은 타입 안정성 향상이 목적이며, 범위는 해당 파일과 즉시 연결된 `useActionData` 소비부만으로 제한한다.

  **Must NOT do**:
  - 모든 action 파일을 일괄 개편하지 않는다.
  - redirect/revalidation 흐름을 바꾸지 않는다.

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 단일 route module 내 응답 shape 정리 작업이다.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with 12)
  - **Blocks**: FINAL
  - **Blocked By**: 1

  **References**:
  - `app/routes/public/logs/$recordSlug.server.ts:210` - validation failure plain object
  - `app/routes/public/logs/$recordSlug.server.ts:356` - success plain object
  - `app/routes/public/logs/$recordSlug.tsx:415` - `useActionData<Action>()` 소비부
  - `app/routes/public/logs/$recordSlug.details.tsx:114` - 비교용 `data()` 에러 응답 패턴

  **Acceptance Criteria**:
  - [ ] 선택된 action 응답이 `useActionData`와 더 잘 맞는 명시적 shape를 가진다
  - [ ] route 동작(응답 작성/문장 저장/수정/삭제)이 깨지지 않는다

  **QA Scenarios**:
  ```
  Scenario: action data still drives UI feedback correctly
    Tool: Playwright
    Preconditions: record detail page with response form
    Steps:
      1. Submit invalid response input
      2. Submit valid response input
      3. Update and delete a response
    Expected Result: each path shows the same Korean feedback messages as before
    Evidence: .sisyphus/evidence/task-13-action-feedback.txt

  Scenario: typecheck confirms response shape safety
    Tool: Bash
    Preconditions: code edited
    Steps:
      1. Run `pnpm typecheck`
    Expected Result: no new type errors from `useActionData` consumers
    Evidence: .sisyphus/evidence/task-13-typecheck.txt
  ```

---

## Final Verification Wave

- [x] F1. **Plan Compliance Audit** — `deep`
  Read the plan and verify each must-have fix exists in the diff/config/migrations. Reject any attempt to sneak in challenges implementation, Sentry DSN refactor, or broad auth changes.

  ```
  Scenario: every must-have maps to an actual change artifact
    Tool: Bash + Read
    Preconditions: implementation completed, diff available
    Steps:
      1. Run `git diff --name-only` and compare changed files against Tasks 1-13
      2. Read the changed files for `wrangler.deploy.toml`, affected DB query modules, schema/migrations, routes, and UI files
      3. Confirm each must-have item in this plan has a corresponding code/config/doc change
    Expected Result: all required fix areas are represented and no false-positive tasks were implemented
    Failure Indicators: missing fix area, challenges implementation added, or unrelated auth/Sentry refactor appears
    Evidence: .sisyphus/evidence/final-f1-plan-compliance.txt
  ```

- [x] F2. **Code Quality Review** — `unspecified-high`
  Run `pnpm typecheck`, `pnpm test`, and review changed files for stray hardcoded colors, leftover placeholder values, and loop-insert patterns.

  ```
  Scenario: code quality gates pass after all fixes
    Tool: Bash
    Preconditions: implementation completed
    Steps:
      1. Run `pnpm typecheck`
      2. Run `pnpm test`
      3. Run targeted grep for placeholder values, banned color literals, and loop-insert remnants
    Expected Result: typecheck passes, tests pass at agreed baseline, and targeted greps show no unresolved planned issues
    Failure Indicators: new type errors, failing tests, placeholder still present, or hardcoded literals remain in targeted files
    Evidence: .sisyphus/evidence/final-f2-quality.txt
  ```

- [x] F3. **Real QA** — `unspecified-high`
  Exercise fixed paths: autosave test, metadata save path, bookmark/read APIs, admin bootstrap guard, and `/style-reference` access policy.

  ```
  Scenario: fixed user-facing paths behave correctly end-to-end
    Tool: Playwright + Bash
    Preconditions: app running locally with required test data/session
    Steps:
      1. Run targeted autosave vitest file and verify green baseline
      2. Open metadata edit flow and save tags/participants/mentioned records
      3. Hit bookmark/read APIs with authenticated request flow
      4. Request `/style-reference` as anonymous user
    Expected Result: save flows succeed, API mutations respond correctly, and style-reference is blocked from public access
    Failure Indicators: broken metadata persistence, API auth regressions, or public style-reference rendering
    Evidence: .sisyphus/evidence/final-f3-real-qa.txt
  ```

- [x] F4. **Scope Fidelity Check** — `deep`
  Ensure the work only addresses confirmed audit findings and keeps deferred items (`challenges`, Sentry DSN refactor, global auth changes) out of scope.

  ```
  Scenario: final diff stays inside approved scope boundaries
    Tool: Bash + Read
    Preconditions: implementation completed
    Steps:
      1. Run `git diff --stat` and `git diff --name-only`
      2. Compare file list against planned scope in Tasks 1-13
      3. Read any unexpected file and determine whether it is justified by a planned dependency
    Expected Result: no out-of-scope feature work, no challenges implementation, no broad auth/Sentry redesign
    Failure Indicators: unexpected feature files, unrelated refactors, or scope creep beyond listed tasks
    Evidence: .sisyphus/evidence/final-f4-scope-fidelity.txt
  ```

---

## Commit Strategy

- Wave 0: `fix(test): restore autosave baseline`
- Wave 1: `fix(deploy): align production wrangler config` / `chore(auth): document admin bootstrap prerequisites` / `fix(routes): restrict style reference`
- Wave 2: `fix(db): batch record metadata writes` / `fix(db): batch participant notifications` / `fix(db): add uniqueness constraints`
- Wave 3: `fix(ui): replace hardcoded read-state colors` / `fix(a11y): tighten interactive affordances` / `fix(ui): normalize card radius`
- Wave 4: `docs(project): sync disabled-route status and implementation notes`

---

## Success Criteria

### Verification Commands
```bash
pnpm typecheck
pnpm test
pnpm build
grep -R "usr_placeholder_replace_with_real_admin_id" wrangler.toml wrangler.deploy.toml app/lib/auth/auth.middleware.ts
grep -R "bg-\[#\|text-\[#\|border-\[#\|#E3E8EF\|#FFFFFF\|#A0A4AB\|#D8DCE3\|#F0F2F5\|#E0E3E8\|#8C8F96" app/components/cards app/components/editor
```

### Final Checklist
- [ ] Deploy config no longer omits required production vars/log settings
- [ ] Admin bootstrap path is documented and no placeholder-only deployment path remains hidden
- [ ] Confirmed N+1 write paths are batch-based or deleted if dead code
- [ ] Unique constraints added with duplicate-safe migration strategy
- [ ] `/style-reference` is no longer publicly exposed by accident
- [ ] Identified UI token/a11y/radius inconsistencies are fixed without broader redesign
