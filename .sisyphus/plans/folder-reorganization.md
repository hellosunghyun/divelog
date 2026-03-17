# Folder Reorganization — 플랫 디렉토리 서브폴더 정리

## TL;DR

> **Quick Summary**: 파일이 과도하게 플랫하게 나열된 5개 디렉토리(components 29개, db/queries 21개, lib 19개, editor 10개, db/queries/admin 15개)를 도메인별 서브폴더로 재구성. 순수 구조 리팩토링으로 로직 변경 없음.
>
> **Deliverables**:
> - `app/components/` 29개 플랫 파일 → 8개 서브폴더로 재구성
> - `app/db/queries/` 21개 플랫 파일 → 6개 서브폴더로 재구성
> - `app/lib/` 19개 플랫 파일 → 5개 서브폴더로 재구성
> - `app/components/editor/` 10개 파일 → 2개 서브폴더(editors/extensions)
> - `app/db/queries/admin/` 15개 파일 → 3개 서브폴더 + barrel 유지
> - 모든 import path 업데이트 (tilde-absolute, dynamic, relative 3가지 스타일)
> - 디렉토리별 독립 커밋 (git mv로 히스토리 보존)
>
> **Estimated Effort**: Medium
> **Parallel Execution**: YES — 3 waves (sequential within Wave 2 due to cross-directory imports)
> **Critical Path**: Task 0 → Task 1 → Task 2 → Task 3 → Task 4 → Task 5 → Task 6

---

## Context

### Original Request
코드베이스 전체에서 한 폴더 안에 파일이 너무 많은 경우를 찾아 서브폴더로 정리해달라는 요청.

### Interview Summary
**Key Discussions**:
- 분석 결과 5개 디렉토리가 폴더링 필요: components(29), db/queries(21), lib(19), editor(10), db/queries/admin(15)
- 사용자 결정: 5개 전부 포함 (경계선 디렉토리 포함)

**Research Findings**:
- 239개 tilde-absolute import (`~/components/X`) across 70 files
- 111개 tilde-absolute import (`~/lib/X`) across 65 files  
- 40+ dynamic import (`await import("~/db/queries/X")`) in route loaders/actions
- 140+ relative import (`../`) within target directories
- 36개 기존 TS 에러 존재 (refactoring과 무관, baseline 필요)
- SmartLink이 52개 import site로 최고 fan-out
- `db/queries/admin/index.server.ts`가 barrel 파일로 존재
- `lib/cn.ts`와 `lib/utils.ts`가 중복 (이번 scope 아님)
- `lib/editor-config.ts`가 dead code (이번 scope 아님)

### Metis Review
**Identified Gaps** (addressed):
- Import 3가지 스타일(tilde, dynamic, relative) 모두 업데이트 필요 → Plan에 반영
- 기존 36 TS 에러 baseline 필수 → Task 0에 포함
- Cross-directory relative imports로 인해 병렬 실행 위험 → 순차 실행으로 변경
- Items 4-5 (admin/editor) 서브폴더 매핑 미정의 → 명시적 매핑 추가
- `__tests__/` 디렉토리 import도 업데이트 필요 → 각 Task에 포함
- Admin barrel 파일 업데이트 위험 → 별도 Wave로 분리

---

## Work Objectives

### Core Objective
5개 디렉토리의 플랫 파일 구조를 도메인별 서브폴더로 재구성하여 코드베이스 네비게이션과 유지보수성 개선.

### Concrete Deliverables
- `app/components/`: 29개 → layout(4), cards(7), sections(3), feedback(4), filters(3), views(3), activity(2), content(3)
- `app/db/queries/`: 21개 → records(6), dialogue(4), journey(3), social(3), learners(2), misc(3)
- `app/lib/`: 17개 이동 → auth(3), content(5), utils(5), infra(3), motion(2) + test-utils.tsx 루트 유지
- `app/components/editor/`: 10개 → editors(3), extensions(7)
- `app/db/queries/admin/`: 14개 이동 → data(6), ops(5), insights(2) + index.server.ts 루트 유지

### Definition of Done
- [x] `pnpm typecheck` → 기존 36개 에러와 동일 (새 에러 0)
- [x] `pnpm test` → 모든 테스트 통과 (baseline과 동일)
- [x] `pnpm build` → 프로덕션 빌드 성공
- [x] `git diff --stat --diff-filter=R` → 파일 rename 추적 확인
- [x] 원래 위치에 고아 파일 0개

### Must Have
- 모든 파일 `git mv`로 이동 (히스토리 보존)
- 3가지 import 스타일 모두 업데이트 (tilde-absolute, dynamic, relative)
- 디렉토리별 독립 커밋 (bisect-friendly)
- 매 Task 완료 후 typecheck + test 검증

### Must NOT Have (Guardrails)
- ❌ barrel/index.ts 파일 신규 생성 금지 (기존 admin barrel만 업데이트)
- ❌ 파일 rename 금지 (SceneCard.tsx → scene-card.tsx 등)
- ❌ export signature 변경 금지 (export default ↔ named)
- ❌ 함수 body 수정 금지 (import 라인만 변경)
- ❌ import 스타일 변경 금지 (relative는 relative로, tilde는 tilde로, dynamic은 dynamic으로 유지)
- ❌ 기존 36개 TS 에러 수정 금지
- ❌ dead code 삭제 금지 (editor-config.ts 등)
- ❌ 중복 파일 병합 금지 (cn.ts/utils.ts 등)
- ❌ tsconfig.json, vite.config.ts, vitest.config.ts 수정 금지
- ❌ AGENTS.md, .docs/ 문서 수정 금지
- ❌ app/hooks/, app/styles/ 디렉토리 변경 금지

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: YES (vitest + playwright)
- **Automated tests**: None (순수 파일 이동, 새 테스트 불필요)
- **Framework**: vitest (기존)
- **Verification**: 기존 테스트 + typecheck + build가 깨지지 않음을 확인

### QA Policy
Every task MUST verify:
1. `pnpm typecheck 2>&1 | grep 'error TS' | wc -l` → baseline과 동일
2. `pnpm test` → 모든 테스트 통과
3. 이동된 파일이 새 위치에 존재
4. 원래 위치에 파일 없음

Evidence saved to `.sisyphus/evidence/task-{N}-folder-reorg-{dir}.txt`.

---

## Execution Strategy

### Parallel Execution Waves

> Cross-directory relative imports 때문에 Wave 2 내부는 순차 실행 필수.
> Components가 lib과 db/queries를 relative로 import하므로 동시 이동 시 충돌.

```
Wave 1 (Baseline — 즉시 시작):
└── Task 0: Baseline 캡처 [quick]

Wave 2 (Wave 1 후 — 순차 실행, cross-directory imports 때문):
├── Task 1: components/ 재구성 (depends: 0) [deep]
├── Task 2: db/queries/ 재구성 (depends: 1) [deep]
└── Task 3: lib/ 재구성 (depends: 2) [deep]

Wave 3 (Wave 2 후 — 2개 병렬 가능):
├── Task 4: editor/ 서브그룹 (depends: 3) [quick]
└── Task 5: admin queries/ 서브그룹 (depends: 3) [deep]

Wave FINAL (Wave 3 후 — 4개 병렬):
├── Task F1: Plan compliance audit [oracle]
├── Task F2: Code quality review [unspecified-high]
├── Task F3: Real manual QA [unspecified-high]
└── Task F4: Scope fidelity check [deep]

Critical Path: Task 0 → Task 1 → Task 2 → Task 3 → Task 4/5 → F1-F4
Sequential Reason: Cross-directory relative imports between components↔lib, components↔queries
Max Concurrent: 2 (Wave 3), 4 (Wave FINAL)
```

### Dependency Matrix

| Task | Depends On | Blocks | Wave |
|------|-----------|--------|------|
| 0 | — | 1, 2, 3 | 1 |
| 1 | 0 | 2 | 2 |
| 2 | 1 | 3 | 2 |
| 3 | 2 | 4, 5 | 2 |
| 4 | 3 | F1-F4 | 3 |
| 5 | 3 | F1-F4 | 3 |
| F1-F4 | 4, 5 | — | FINAL |

### Agent Dispatch Summary

- **Wave 1**: 1 task → `quick`
- **Wave 2**: 3 tasks → `deep` × 3
- **Wave 3**: 2 tasks → `quick` × 1, `deep` × 1
- **FINAL**: 4 tasks → `oracle` × 1, `unspecified-high` × 2, `deep` × 1

---

## TODOs

> Implementation + Verification = ONE Task.
> EVERY task has: Agent Profile + Parallelization + QA Scenarios.

- [x] 0. Baseline 캡처 + 검증 환경 준비

  **What to do**:
  - `pnpm typecheck 2>&1 | grep 'error TS' | sort > .sisyphus/evidence/ts-errors-baseline.txt` 실행하여 기존 TS 에러 baseline 캡처
  - `pnpm test 2>&1 > .sisyphus/evidence/test-baseline.txt` 실행하여 기존 테스트 결과 baseline 캡처
  - `pnpm build` 실행하여 빌드 성공 확인
  - baseline 파일의 에러 수 기록 (후속 Task에서 비교용)

  **Must NOT do**:
  - 코드 수정 금지
  - TS 에러 수정 금지

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`git-master`]
    - `git-master`: baseline 커밋 상태 확인용

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 1 (단독)
  - **Blocks**: Tasks 1, 2, 3
  - **Blocked By**: None

  **References**:
  - `package.json` — pnpm 스크립트 정의 (typecheck, test, build)
  - `vitest.config.ts` — 테스트 설정
  - `tsconfig.json` — TypeScript 설정

  **Acceptance Criteria**:
  - [ ] `.sisyphus/evidence/ts-errors-baseline.txt` 파일 존재
  - [ ] `.sisyphus/evidence/test-baseline.txt` 파일 존재
  - [ ] `pnpm build` 성공

  **QA Scenarios**:

  ```
  Scenario: Baseline 파일 생성 확인
    Tool: Bash
    Steps:
      1. cat .sisyphus/evidence/ts-errors-baseline.txt | wc -l → 0 이상의 숫자
      2. cat .sisyphus/evidence/test-baseline.txt | grep -E 'pass|fail' → 테스트 결과 포함
      3. ls build/client/index.html → 빌드 산출물 존재
    Expected Result: 3개 파일 모두 존재하고 유효한 내용 포함
    Evidence: .sisyphus/evidence/task-0-baseline.txt
  ```

  **Commit**: NO (baseline 캡처만)

- [x] 1. app/components/ 재구성 — 29개 플랫 파일 → 8개 서브폴더

  **What to do**:
  - 8개 서브디렉토리 생성:
    - `app/components/layout/` ← GlobalNav.tsx, Footer.tsx, NavigationFade.tsx, FloatingWriteCTA.tsx
    - `app/components/cards/` ← SceneCard.tsx, QuestionCard.tsx, ResponseCard.tsx, SelfAnswerCard.tsx, LearnerCard.tsx, CollaborationUnitCard.tsx, HighlightedSentenceCard.tsx
    - `app/components/sections/` ← HeroSection.tsx, CTABand.tsx, StageStrip.tsx
    - `app/components/feedback/` ← EmptyState.tsx, ErrorState.tsx, LoadingSkeleton.tsx, AutosaveIndicator.tsx
    - `app/components/filters/` ← FilterBar.tsx, FilterBottomSheet.tsx, SortBar.tsx
    - `app/components/views/` ← ViewToggle.tsx, TimelineView.tsx, QuestionTimeline.tsx
    - `app/components/activity/` ← ActivityFeed.tsx, NarrativeDigest.tsx
    - `app/components/content/` ← ContentRenderer.tsx, SmartLink.tsx, DraftRecoveryPrompt.tsx
  - `git mv`로 29개 파일 이동
  - **Tilde-absolute imports 업데이트** (239개 site, 70개 파일):
    - `~/components/SceneCard` → `~/components/cards/SceneCard`
    - `~/components/GlobalNav` → `~/components/layout/GlobalNav`
    - `~/components/EmptyState` → `~/components/feedback/EmptyState`
    - (29개 파일 모두에 대해 동일 패턴)
  - **Relative imports 업데이트** (컴포넌트 내부):
    - `ActivityFeed.tsx`의 `"../db/queries/activity.server"` → depth 변경 `"../../db/queries/activity.server"`
    - `TimelineView.tsx`의 `"../lib/date-groups"` → depth 변경 `"../../lib/date-groups"`
    - `ContentRenderer.tsx`의 `"../lib/editor-extensions"` → depth 변경 `"../../lib/editor-extensions"`
  - **Test import 업데이트**:
    - `components/__tests__/EmptyState.test.tsx`의 `"../EmptyState"` → `"../feedback/EmptyState"`
  - typecheck + test 검증

  **Must NOT do**:
  - ui/, admin/, editor/ 하위 디렉토리 변경 금지
  - barrel/index.ts 파일 생성 금지
  - export 시그니처 변경 금지
  - 함수 body 수정 금지

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: 239개 import site 업데이트 + cross-file 영향 분석 필요
  - **Skills**: [`git-master`]
    - `git-master`: git mv 사용, 커밋 관리

  **Parallelization**:
  - **Can Run In Parallel**: NO (Wave 2 내 순차)
  - **Parallel Group**: Wave 2 — 첫 번째
  - **Blocks**: Task 2
  - **Blocked By**: Task 0

  **References**:

  **Pattern References**:
  - `app/components/SceneCard.tsx` — 일반적인 컴포넌트 import 패턴 확인
  - `app/components/SmartLink.tsx` — 최다 fan-out (52 import sites), canary로 먼저 이동 추천

  **Import Site References** (업데이트 대상):
  - `app/routes/public/index.tsx` — 다수 컴포넌트 import 사용
  - `app/routes/public/logs/index.tsx` — FilterBar, SortBar, SceneCard, ViewToggle 등 import
  - `app/routes/public/journey/$stageSlug.tsx` — SceneCard, QuestionCard 등 import
  - `app/routes/_public.tsx` — GlobalNav, Footer, FloatingWriteCTA import

  **Cross-directory Relative Import References** (depth 변경 필요):
  - `app/components/ActivityFeed.tsx:1-5` — `../db/queries/activity.server` import
  - `app/components/TimelineView.tsx:1-5` — `../lib/date-groups` import
  - `app/components/ContentRenderer.tsx:1-5` — `../lib/editor-extensions` import
  - `app/components/NarrativeDigest.tsx:1-5` — import 확인 필요

  **Test Reference**:
  - `app/components/__tests__/EmptyState.test.tsx` — `"../EmptyState"` relative import

  **Acceptance Criteria**:
  - [ ] `ls app/components/*.tsx 2>/dev/null | wc -l` → 0 (플랫 파일 없음)
  - [ ] `ls app/components/cards/` → 7개 .tsx 파일
  - [ ] `ls app/components/layout/` → 4개 .tsx 파일
  - [ ] `ls app/components/sections/` → 3개 .tsx 파일
  - [ ] `ls app/components/feedback/` → 4개 .tsx 파일
  - [ ] `ls app/components/filters/` → 3개 .tsx 파일
  - [ ] `ls app/components/views/` → 3개 .tsx 파일
  - [ ] `ls app/components/activity/` → 2개 .tsx 파일
  - [ ] `ls app/components/content/` → 3개 .tsx 파일
  - [ ] `pnpm typecheck 2>&1 | grep 'error TS' | wc -l` → baseline과 동일
  - [ ] `pnpm test` → 통과

  **QA Scenarios**:

  ```
  Scenario: 모든 컴포넌트 파일이 서브폴더로 이동됨
    Tool: Bash
    Steps:
      1. ls app/components/*.tsx 2>/dev/null | wc -l → 0
      2. find app/components -maxdepth 2 -name "*.tsx" -not -path "*/__tests__/*" -not -path "*/ui/*" -not -path "*/admin/*" -not -path "*/editor/*" | wc -l → 29
    Expected Result: 플랫 파일 0, 서브폴더 내 파일 29
    Evidence: .sisyphus/evidence/task-1-file-count.txt

  Scenario: Import 경로 업데이트 검증
    Tool: Bash
    Steps:
      1. grep -rn '~/components/SceneCard' app/ → 0 결과 (old path 없음)
      2. grep -rn '~/components/cards/SceneCard' app/ → 1개 이상 (new path 존재)
      3. grep -rn '~/components/GlobalNav' app/ → 0 결과
      4. grep -rn '~/components/layout/GlobalNav' app/ → 1개 이상
    Expected Result: 모든 old path 0건, 모든 new path 1건 이상
    Evidence: .sisyphus/evidence/task-1-imports.txt

  Scenario: TypeCheck + Test 통과
    Tool: Bash
    Steps:
      1. pnpm typecheck 2>&1 | grep 'error TS' | wc -l → baseline과 동일
      2. pnpm test → 모든 테스트 통과
    Expected Result: 새 에러 0, 테스트 결과 baseline과 동일
    Evidence: .sisyphus/evidence/task-1-typecheck.txt
  ```

  **Commit**: YES
  - Message: `refactor: reorganize app/components into domain sub-folders`
  - Files: `app/components/**`, `app/routes/**`, 기타 import sites
  - Pre-commit: `pnpm typecheck && pnpm test`

- [x] 2. app/db/queries/ 재구성 — 21개 플랫 파일 → 6개 서브폴더

  **What to do**:
  - 6개 서브디렉토리 생성:
    - `app/db/queries/records/` ← records.server.ts, drafts.server.ts, savedRecords.server.ts, recordLinks.server.ts, sentences.server.ts, tags.server.ts
    - `app/db/queries/dialogue/` ← questions.server.ts, responses.server.ts, selfAnswers.server.ts, mentions.server.ts
    - `app/db/queries/journey/` ← stages.server.ts, challenges.server.ts, memories.server.ts
    - `app/db/queries/social/` ← collaboration.server.ts, activity.server.ts, notifications.server.ts
    - `app/db/queries/learners/` ← learners.server.ts, reflections.server.ts
    - `app/db/queries/misc/` ← search.server.ts, carryOvers.server.ts, reminders.server.ts
  - `git mv`로 21개 파일 이동
  - **Internal relative imports 업데이트** (각 쿼리 파일 내부):
    - `"../client.server"` → `"../../client.server"` (모든 이동 파일)
    - `"../schema.server"` → `"../../schema.server"` (모든 이동 파일)
    - `"../relations.server"` → `"../../relations.server"` (해당 파일)
    - `"../../lib/utils.server"` → `"../../../lib/utils.server"` (해당 파일)
    - `"../../lib/validation"` → `"../../../lib/validation"` (해당 파일)
  - **Tilde-absolute static imports 업데이트** (4개 site):
    - `~/db/queries/drafts.server` → `~/db/queries/records/drafts.server`
    - 기타 tilde import 검색하여 업데이트
  - **Dynamic imports 업데이트** (40+ site, route loaders/actions):
    - `await import("~/db/queries/records.server")` → `await import("~/db/queries/records/records.server")`
    - `await import("~/db/queries/stages.server")` → `await import("~/db/queries/journey/stages.server")`
    - `await import("~/db/queries/challenges.server")` → `await import("~/db/queries/journey/challenges.server")`
    - (21개 파일 모두에 대해 동일 패턴)
  - **Cross-module imports 업데이트**:
    - `app/components/activity/ActivityFeed.tsx` (Task 1에서 이동됨)의 `"../../db/queries/activity.server"` → `"../../db/queries/social/activity.server"`
    - `app/components/activity/NarrativeDigest.tsx`의 쿼리 import 경로 업데이트
  - **Test imports 업데이트** (`db/queries/__tests__/` 내 6개 파일):
    - `"../carryOvers.server"` → `"../misc/carryOvers.server"`
    - `"../drafts.server"` → `"../records/drafts.server"`
    - `"../notifications.server"` → `"../social/notifications.server"`
    - `"../reflections.server"` → `"../learners/reflections.server"`
    - `"../reminders.server"` → `"../misc/reminders.server"`
    - `"../savedRecords.server"` → `"../records/savedRecords.server"`
  - typecheck + test 검증

  **Must NOT do**:
  - admin/ 하위 디렉토리 변경 금지 (Task 5에서 처리)
  - `__tests__/` 디렉토리 이동 금지 (import 경로만 업데이트)
  - barrel/index.ts 파일 생성 금지
  - import 스타일 변경 금지 (relative → tilde 전환 등)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: 40+ dynamic import 업데이트 + 내부 relative import depth 변경
  - **Skills**: [`git-master`]
    - `git-master`: git mv 사용, 커밋 관리

  **Parallelization**:
  - **Can Run In Parallel**: NO (Wave 2 내 순차)
  - **Parallel Group**: Wave 2 — 두 번째
  - **Blocks**: Task 3
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `app/db/queries/records.server.ts:1-10` — 쿼리 파일의 일반적인 import 패턴 (`../client.server`, `../schema.server`)
  - `app/db/queries/admin/index.server.ts` — barrel 파일 패턴 (건드리지 않음)

  **Dynamic Import References** (실제 확인된 위치 — 35개 site, 11개 파일):
  - `app/routes/public/logs/$recordSlug.tsx:49-54,179-184` — records, sentences, selfAnswers, recordLinks, tags (10 sites, 최다)
  - `app/routes/public/logs/$recordSlug.details.tsx:29-30,69-70` — records, tags (4 sites)
  - `app/routes/public/logs/$recordSlug.edit.tsx:34-37,85-88` — mentions, records, recordLinks, tags (8 sites)
  - `app/routes/public/journey/$stageSlug.tsx:24-25` — stages, records (2 sites)
  - `app/routes/public/learners/index.tsx:14` — learners (1 site)
  - `app/routes/public/index.tsx:21` — activity (1 site)
  - `app/routes/public/me.tsx:31` — responses (1 site)
  - `app/routes/public/tags/index.tsx:14` — tags (1 site)
  - `app/routes/public/tags/$tagSlug.tsx:21` — tags (1 site)
  - `app/routes/public/write/article.tsx:32-33,61-62` — mentions, recordLinks (4 sites)
  - `app/routes/public/write/note.tsx:29,62` — mentions (2 sites)

  **Static Import References** (3 sites):
  - `app/routes/api/autosave.tsx:3` — `import { upsertDraft } from "~/db/queries/drafts.server"` (static)
  - `app/routes/admin/tags.tsx:33,45` — tags 쿼리 dynamic import (admin route에서도 사용)
  - `app/components/activity/NarrativeDigest.tsx:3` — `import type { DigestItem } from "~/db/queries/activity.server"` (static type)

  **Test References**:
  - `app/db/queries/__tests__/carryOvers.test.ts` — `"../carryOvers.server"` relative import
  - `app/db/queries/__tests__/drafts.test.ts` — `"../drafts.server"` relative import

  **Acceptance Criteria**:
  - [ ] `ls app/db/queries/*.server.ts 2>/dev/null | wc -l` → 0 (플랫 파일 없음)
  - [ ] `ls app/db/queries/records/` → 6개 .server.ts 파일
  - [ ] `ls app/db/queries/dialogue/` → 4개 .server.ts 파일
  - [ ] `ls app/db/queries/journey/` → 3개 .server.ts 파일
  - [ ] `ls app/db/queries/social/` → 3개 .server.ts 파일
  - [ ] `ls app/db/queries/learners/` → 2개 .server.ts 파일
  - [ ] `ls app/db/queries/misc/` → 3개 .server.ts 파일
  - [ ] `pnpm typecheck 2>&1 | grep 'error TS' | wc -l` → baseline과 동일
  - [ ] `pnpm test` → 통과

  **QA Scenarios**:

  ```
  Scenario: 모든 쿼리 파일이 서브폴더로 이동됨
    Tool: Bash
    Steps:
      1. ls app/db/queries/*.server.ts 2>/dev/null | wc -l → 0
      2. find app/db/queries -maxdepth 2 -name "*.server.ts" -not -path "*/admin/*" -not -path "*/__tests__/*" | wc -l → 21
    Expected Result: 플랫 파일 0, 서브폴더 내 파일 21
    Evidence: .sisyphus/evidence/task-2-file-count.txt

  Scenario: Dynamic import 경로 업데이트 검증
    Tool: Bash
    Steps:
      1. grep -rn 'import("~/db/queries/records\.server")' app/routes/ → 0 (old path)
      2. grep -rn 'import("~/db/queries/records/records\.server")' app/routes/ → 1+ (new path)
      3. grep -rn 'import("~/db/queries/stages\.server")' app/routes/ → 0 (old path)
      4. grep -rn 'import("~/db/queries/journey/stages\.server")' app/routes/ → 1+ (new path)
    Expected Result: old path 0건, new path 각 1건 이상
    Evidence: .sisyphus/evidence/task-2-dynamic-imports.txt

  Scenario: Internal relative import depth 검증
    Tool: Bash
    Steps:
      1. grep -n 'from "\.\./' app/db/queries/records/records.server.ts → "../../client.server" 패턴
      2. grep -rn 'from "\.\./client\.server"' app/db/queries/records/ → 0 (old depth)
      3. grep -rn 'from "\.\./\.\./client\.server"' app/db/queries/records/ → 파일 수와 동일
    Expected Result: 모든 서브폴더 내 파일이 ../../client.server로 import
    Evidence: .sisyphus/evidence/task-2-relative-imports.txt

  Scenario: TypeCheck + Test 통과
    Tool: Bash
    Steps:
      1. pnpm typecheck 2>&1 | grep 'error TS' | wc -l → baseline과 동일
      2. pnpm test → 모든 테스트 통과
    Expected Result: 새 에러 0
    Evidence: .sisyphus/evidence/task-2-typecheck.txt
  ```

  **Commit**: YES
  - Message: `refactor: reorganize app/db/queries into domain sub-folders`
  - Files: `app/db/queries/**`, `app/routes/**`, `app/components/activity/**`
  - Pre-commit: `pnpm typecheck && pnpm test`

- [x] 3. app/lib/ 재구성 — 18개 파일 이동 → 5개 서브폴더

  **What to do**:
  - 5개 서브디렉토리 생성:
    - `app/lib/auth/` ← auth.server.ts, auth.middleware.ts, validation.ts
    - `app/lib/content/` ← content.server.ts, editor-config.ts, editor-extensions.ts, compress-image.ts, extract-references.server.ts
    - `app/lib/utils/` ← utils.ts, utils.server.ts, cn.ts, title.server.ts, date-groups.ts
    - `app/lib/infra/` ← logger.server.ts, r2-cleanup.server.ts, draft-storage.ts
    - `app/lib/motion/` ← motion.tsx, motion-utils.ts
  - `test-utils.tsx`는 루트에 유지 (테스트 유틸리티, 단독)
  - `git mv`로 18개 파일 이동 (19개 중 test-utils.tsx 제외)
  - **Tilde-absolute static imports 업데이트** (111개 site, 65개 파일):
    - `~/lib/cn` → `~/lib/utils/cn`
    - `~/lib/auth.server` → `~/lib/auth/auth.server`
    - `~/lib/auth.middleware` → `~/lib/auth/auth.middleware`
    - `~/lib/validation` → `~/lib/auth/validation`
    - `~/lib/content.server` → `~/lib/content/content.server`
    - `~/lib/logger.server` → `~/lib/infra/logger.server`
    - `~/lib/motion` → `~/lib/motion/motion`
    - `~/lib/motion-utils` → `~/lib/motion/motion-utils`
    - `~/lib/utils` → `~/lib/utils/utils`
    - `~/lib/utils.server` → `~/lib/utils/utils.server`
    - `~/lib/title.server` → `~/lib/utils/title.server`
    - `~/lib/date-groups` → `~/lib/utils/date-groups`
    - `~/lib/draft-storage` → `~/lib/infra/draft-storage`
    - `~/lib/compress-image` → `~/lib/content/compress-image`
    - `~/lib/editor-config` → `~/lib/content/editor-config`
    - `~/lib/editor-extensions` → `~/lib/content/editor-extensions`
    - `~/lib/extract-references.server` → `~/lib/content/extract-references.server`
    - `~/lib/r2-cleanup.server` → `~/lib/infra/r2-cleanup.server`
  - **Dynamic imports 업데이트** (route loaders/actions):
    - `await import("~/lib/logger.server")` → `await import("~/lib/infra/logger.server")`
    - `await import("~/lib/content.server")` → `await import("~/lib/content/content.server")`
    - (기타 dynamic import 패턴 검색 후 업데이트)
  - **Internal relative imports 업데이트** (lib 내부 cross-import):
    - `auth.middleware.ts`의 `"./utils.server"` → `"../utils/utils.server"`
    - `auth.middleware.ts`의 `"./auth.server"` → `"./auth.server"` (같은 auth/ 폴더, 변경 없음)
    - `auth.middleware.ts`의 `"./logger.server"` → `"../infra/logger.server"`
    - 기타 lib 내부 상호 import 모두 확인 및 업데이트
  - **Cross-module relative imports 업데이트 — 컴포넌트** (Task 1에서 이동됨):
    - `components/views/TimelineView.tsx`의 `"../../lib/date-groups"` → `"../../lib/utils/date-groups"`
    - `components/content/ContentRenderer.tsx`의 `"../../lib/editor-extensions"` → `"../../lib/content/editor-extensions"`
    - `components/editor/ArticleEditor.tsx`의 `"../../lib/compress-image"` → `"../../lib/content/compress-image"`
    - `components/editor/ArticleEditor.tsx`의 `"../../lib/editor-extensions"` → `"../../lib/content/editor-extensions"`
  - **Cross-module relative imports 업데이트 — 쿼리 파일** (Task 2에서 이동됨):
    - Task 2에서 쿼리 파일들이 서브폴더로 이동되면서 `../../../lib/validation` 또는 `../../../lib/utils.server` 경로로 업데이트됨
    - lib 파일 이동 후 이 경로들을 다시 업데이트 필요:
      - `app/db/queries/*/`의 `"../../../lib/validation"` → `"../../../lib/auth/validation"` (해당 파일 모두)
      - `app/db/queries/*/`의 `"../../../lib/utils.server"` → `"../../../lib/utils/utils.server"` (해당 파일 모두)
      - `app/db/queries/*/`의 `"../../../lib/utils"` → `"../../../lib/utils/utils"` (해당 파일)
      - `app/db/queries/*/`의 `"../../../lib/logger.server"` → `"../../../lib/infra/logger.server"` (해당 파일)
    - ⚠️ 실행 전 `grep -rn '../../../lib/' app/db/queries/` 로 모든 대상 확인 필수
  - **Cross-module relative imports 업데이트 — 쿼리 테스트 파일** (Task 2에서 경로 변경됨):
    - `app/db/queries/__tests__/`의 lib 참조도 동일하게 업데이트 (있는 경우)
    - `grep -rn '../lib/' app/db/queries/__tests__/` 로 대상 확인
  - **Test imports 업데이트** (`lib/__tests__/` 내 7개 파일):
    - `"../title.server"` → `"../utils/title.server"`
    - `"../content.server"` → `"../content/content.server"`
    - `"../logger.server"` → `"../infra/logger.server"`
    - `"../r2-cleanup.server"` → `"../infra/r2-cleanup.server"`
    - `"../draft-storage"` → `"../infra/draft-storage"`
  - `test-utils.tsx` import 업데이트: `"~/lib/motion"` → `"~/lib/motion/motion"`
  - typecheck + test 검증

  **Must NOT do**:
  - `__tests__/` 디렉토리 이동 금지
  - `test-utils.tsx` 이동 금지 (루트 유지)
  - barrel/index.ts 파일 생성 금지
  - import 스타일 변경 금지

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: 111개 import site + 내부 cross-import + cross-module import 업데이트
  - **Skills**: [`git-master`]
    - `git-master`: git mv 사용, 커밋 관리

  **Parallelization**:
  - **Can Run In Parallel**: NO (Wave 2 내 순차)
  - **Parallel Group**: Wave 2 — 세 번째
  - **Blocks**: Tasks 4, 5
  - **Blocked By**: Task 2

  **References**:

  **Pattern References**:
  - `app/lib/auth.middleware.ts:1-15` — lib 내부 import 패턴 (relative cross-import)
  - `app/lib/content.server.ts:1-10` — content 관련 import 패턴
  - `app/lib/utils.ts` — 유틸리티 export 패턴

  **Import Site References** (주요 업데이트 대상):
  - `app/routes/_public.tsx` — auth.server, auth.middleware import
  - `app/routes/_admin.tsx` — auth.middleware, auth.server import
  - `app/components/layout/GlobalNav.tsx` (Task 1에서 이동됨) — cn import
  - `app/routes/public/logs/$recordSlug.tsx` — content.server import

  **Cross-module References** (Task 1 이후 경로):
  - `app/components/views/TimelineView.tsx` — `../../lib/date-groups`
  - `app/components/content/ContentRenderer.tsx` — `../../lib/editor-extensions`
  - `app/components/editor/ArticleEditor.tsx` — `../../lib/compress-image`, `../../lib/editor-extensions`

  **Acceptance Criteria**:
  - [ ] `ls app/lib/*.ts app/lib/*.tsx 2>/dev/null` → `test-utils.tsx`만 존재
  - [ ] `ls app/lib/auth/` → 3개 파일
  - [ ] `ls app/lib/content/` → 5개 파일
  - [ ] `ls app/lib/utils/` → 5개 파일
  - [ ] `ls app/lib/infra/` → 3개 파일
  - [ ] `ls app/lib/motion/` → 2개 파일
  - [ ] `pnpm typecheck 2>&1 | grep 'error TS' | wc -l` → baseline과 동일
  - [ ] `pnpm test` → 통과

  **QA Scenarios**:

  ```
  Scenario: 모든 lib 파일이 서브폴더로 이동됨
    Tool: Bash
    Steps:
      1. ls app/lib/*.ts app/lib/*.tsx 2>/dev/null → test-utils.tsx만 출력
      2. find app/lib -maxdepth 2 -name "*.ts" -o -name "*.tsx" | grep -v __tests__ | grep -v test-utils | wc -l → 18
    Expected Result: 루트에 test-utils.tsx만, 서브폴더에 17개 파일
    Evidence: .sisyphus/evidence/task-3-file-count.txt

  Scenario: Tilde import 경로 업데이트 검증
    Tool: Bash
    Steps:
      1. grep -rn '"~/lib/cn"' app/ → 0 (old path)
      2. grep -rn '"~/lib/utils/cn"' app/ → 1+ (new path)
      3. grep -rn '"~/lib/auth\.server"' app/ → 0 (old path)
      4. grep -rn '"~/lib/auth/auth\.server"' app/ → 1+ (new path)
    Expected Result: old path 0건, new path 각 1건 이상
    Evidence: .sisyphus/evidence/task-3-imports.txt

  Scenario: Cross-module relative import 검증
    Tool: Bash
    Steps:
      1. grep -n 'date-groups' app/components/views/TimelineView.tsx → "../../lib/utils/date-groups"
      2. grep -n 'editor-extensions' app/components/content/ContentRenderer.tsx → "../../lib/content/editor-extensions"
      3. grep -n 'compress-image' app/components/editor/ArticleEditor.tsx → "../../lib/content/compress-image"
    Expected Result: 모든 cross-module import가 새 경로로 업데이트
    Evidence: .sisyphus/evidence/task-3-cross-module.txt

  Scenario: TypeCheck + Test 통과
    Tool: Bash
    Steps:
      1. pnpm typecheck 2>&1 | grep 'error TS' | wc -l → baseline과 동일
      2. pnpm test → 모든 테스트 통과
    Expected Result: 새 에러 0
    Evidence: .sisyphus/evidence/task-3-typecheck.txt
  ```

  **Commit**: YES
  - Message: `refactor: reorganize app/lib into concern-based sub-folders`
  - Files: `app/lib/**`, `app/routes/**`, `app/components/**`
  - Pre-commit: `pnpm typecheck && pnpm test`

- [x] 4. app/components/editor/ 서브그룹 — Editors vs Extensions 분리

  **What to do**:
  - 2개 서브디렉토리 생성:
    - `app/components/editor/editors/` ← ArticleEditor.tsx, NoteEditor.tsx, SlashCommandMenu.tsx
    - `app/components/editor/extensions/` ← CalloutExtension.ts, MentionExtension.ts, RecordRefExtension.ts, ResizableImage.ts, TagExtension.ts, TocExtension.ts, ToggleExtension.ts
  - `git mv`로 10개 파일 이동
  - **Internal relative imports 업데이트** (editor 내부):
    - `ArticleEditor.tsx`의 `"./CalloutExtension"` → `"../extensions/CalloutExtension"`
    - `ArticleEditor.tsx`의 `"./MentionExtension"` → `"../extensions/MentionExtension"`
    - `ArticleEditor.tsx`의 `"./RecordRefExtension"` → `"../extensions/RecordRefExtension"`
    - `ArticleEditor.tsx`의 `"./ResizableImage"` → `"../extensions/ResizableImage"`
    - `ArticleEditor.tsx`의 `"./TagExtension"` → `"../extensions/TagExtension"`
    - `ArticleEditor.tsx`의 `"./TocExtension"` → `"../extensions/TocExtension"`
    - `ArticleEditor.tsx`의 `"./ToggleExtension"` → `"../extensions/ToggleExtension"`
    - `NoteEditor.tsx`의 유사한 extension import 업데이트
    - `SlashCommandMenu.tsx`의 editor 관련 import 업데이트
  - **External imports 업데이트** (editor를 사용하는 route 파일):
    - `~/components/editor/ArticleEditor` → `~/components/editor/editors/ArticleEditor`
    - `~/components/editor/NoteEditor` → `~/components/editor/editors/NoteEditor`
    - `~/components/editor/SlashCommandMenu` → `~/components/editor/editors/SlashCommandMenu`
  - typecheck + test 검증

  **Must NOT do**:
  - 함수 body 수정 금지
  - export 시그니처 변경 금지

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 10개 파일 이동 + 제한된 import 업데이트
  - **Skills**: [`git-master`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (Task 5와 병렬 가능)
  - **Parallel Group**: Wave 3
  - **Blocks**: F1-F4
  - **Blocked By**: Task 3

  **References**:
  - `app/components/editor/ArticleEditor.tsx:1-20` — extension import 패턴 확인
  - `app/components/editor/NoteEditor.tsx:1-20` — extension import 패턴 확인
  - `app/routes/public/write/article.tsx` — ArticleEditor import site
  - `app/routes/public/write/note.tsx` — NoteEditor import site

  **Acceptance Criteria**:
  - [ ] `ls app/components/editor/*.tsx app/components/editor/*.ts 2>/dev/null | wc -l` → 0
  - [ ] `ls app/components/editor/editors/` → 3개 파일
  - [ ] `ls app/components/editor/extensions/` → 7개 파일
  - [ ] `pnpm typecheck 2>&1 | grep 'error TS' | wc -l` → baseline과 동일
  - [ ] `pnpm test` → 통과

  **QA Scenarios**:

  ```
  Scenario: Editor 파일 분리 확인
    Tool: Bash
    Steps:
      1. ls app/components/editor/*.tsx app/components/editor/*.ts 2>/dev/null | wc -l → 0
      2. ls app/components/editor/editors/ | wc -l → 3
      3. ls app/components/editor/extensions/ | wc -l → 7
    Expected Result: 루트 0, editors 3, extensions 7
    Evidence: .sisyphus/evidence/task-4-file-count.txt

  Scenario: Internal import 경로 검증
    Tool: Bash
    Steps:
      1. grep -n 'CalloutExtension' app/components/editor/editors/ArticleEditor.tsx → "../extensions/CalloutExtension"
      2. grep -rn '~/components/editor/ArticleEditor' app/routes/ → 0 (old)
      3. grep -rn '~/components/editor/editors/ArticleEditor' app/routes/ → 1+ (new)
    Expected Result: 모든 import 새 경로로 업데이트
    Evidence: .sisyphus/evidence/task-4-imports.txt

  Scenario: TypeCheck + Test 통과
    Tool: Bash
    Steps:
      1. pnpm typecheck 2>&1 | grep 'error TS' | wc -l → baseline과 동일
      2. pnpm test → 모든 테스트 통과
    Expected Result: 새 에러 0, 테스트 결과 baseline과 동일
    Evidence: .sisyphus/evidence/task-4-typecheck.txt
  ```

  **Commit**: YES
  - Message: `refactor: split editor components into editors and extensions`
  - Files: `app/components/editor/**`, `app/routes/public/write/**`
  - Pre-commit: `pnpm typecheck && pnpm test`

- [x] 5. app/db/queries/admin/ 서브그룹 — 14개 파일 → 3개 서브폴더 + barrel 유지

  **What to do**:
  - 3개 서브디렉토리 생성:
    - `app/db/queries/admin/data/` ← learners.server.ts, records.server.ts, stages.server.ts, challenges.server.ts, memories.server.ts, collaboration.server.ts
    - `app/db/queries/admin/ops/` ← curation.server.ts, dialogue.server.ts, settings.server.ts, templates.server.ts, roles.server.ts, roles.ts
    - `app/db/queries/admin/insights/` ← analytics.server.ts, audit.server.ts
  - `index.server.ts`는 **루트에 유지** (barrel 파일)
  - `git mv`로 14개 파일 이동 (index.server.ts 제외)
  - **Barrel 파일 업데이트** (`index.server.ts`):
    - `export * from "./analytics.server"` → `export * from "./insights/analytics.server"`
    - `export * from "./audit.server"` → `export * from "./insights/audit.server"`
    - `export * from "./challenges.server"` → `export * from "./data/challenges.server"`
    - (14개 re-export 모두 경로 업데이트)
  - **Internal relative imports 업데이트**:
    - `roles.server.ts`의 `"./roles"` → `"./roles"` (같은 ops/ 폴더, 변경 없음)
    - 각 파일의 `"../../client.server"` → `"../../../client.server"` (depth 증가)
    - 각 파일의 `"../../schema.server"` → `"../../../schema.server"` (depth 증가)
  - **Dynamic imports 업데이트** (admin route loaders/actions):
    - `await import("~/db/queries/admin/challenges.server")` → `await import("~/db/queries/admin/data/challenges.server")`
    - `await import("~/db/queries/admin/analytics.server")` → `await import("~/db/queries/admin/insights/analytics.server")`
    - `await import("~/db/queries/admin/curation.server")` → `await import("~/db/queries/admin/ops/curation.server")`
    - (14개 파일 모두에 대해 동일 패턴)
  - typecheck + test + build 검증

  **Must NOT do**:
  - `index.server.ts` 삭제 금지 (barrel 유지)
  - `index.server.ts` 이동 금지 (admin/ 루트에 유지)
  - `roles.ts`를 `roles.server.ts`와 분리하지 않음 (같은 ops/ 폴더에 위치)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: barrel 파일 업데이트 + 14개 dynamic import 업데이트 + relative import depth 변경
  - **Skills**: [`git-master`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (Task 4와 병렬 가능)
  - **Parallel Group**: Wave 3
  - **Blocks**: F1-F4
  - **Blocked By**: Task 3

  **References**:

  **Internal References**:
  - `app/db/queries/admin/index.server.ts` — barrel 파일 (re-export 패턴 확인 필수, 모든 sub-module 경로 업데이트)
  - `app/db/queries/admin/roles.server.ts` — `"./roles"` import (roles.ts dependency, 같은 ops/ 폴더 이동)
  - `app/db/queries/admin/roles.ts` — non-.server 파일, ADMIN_ROLES 상수 export (roles.server.ts에서 import됨)

  **External Consumer References** (실제 확인된 위치 — 유일한 외부 소비자):
  - `app/routes/admin/learners/$learnerId.tsx:14` — `import { ADMIN_ROLES, type AdminRole } from "~/db/queries/admin/roles"` (static import, roles.ts 직접 참조)
  - `app/routes/admin/learners/$learnerId.tsx:20` — `await import("~/db/queries/admin/roles.server")` (dynamic import)
  - `app/routes/admin/learners/$learnerId.tsx:76` — `await import("~/db/queries/admin/roles.server")` (dynamic import, action 함수)
  - ⚠️ NOTE: admin route들은 대부분 admin barrel(`~/db/queries/admin`)을 통해 import하지 않고, 직접 개별 파일을 dynamic import함. grep으로 확인 결과, `~/db/queries/admin/` 패턴으로 외부 import하는 파일은 `$learnerId.tsx` **단 1개**뿐.

  **Acceptance Criteria**:
  - [ ] `ls app/db/queries/admin/*.server.ts app/db/queries/admin/*.ts 2>/dev/null` → `index.server.ts`만 존재
  - [ ] `ls app/db/queries/admin/data/` → 6개 .server.ts 파일
  - [ ] `ls app/db/queries/admin/ops/` → 5개 .server.ts + 1개 .ts 파일
  - [ ] `ls app/db/queries/admin/insights/` → 2개 .server.ts 파일
  - [ ] `pnpm typecheck 2>&1 | grep 'error TS' | wc -l` → baseline과 동일
  - [ ] `pnpm test` → 통과
  - [ ] `pnpm build` → 성공

  **QA Scenarios**:

  ```
  Scenario: Admin 쿼리 서브그룹 파일 분리 확인
    Tool: Bash
    Steps:
      1. ls app/db/queries/admin/*.server.ts app/db/queries/admin/*.ts 2>/dev/null → index.server.ts만
      2. ls app/db/queries/admin/data/ | wc -l → 6
      3. ls app/db/queries/admin/ops/ | wc -l → 6 (5 .server.ts + 1 .ts)
      4. ls app/db/queries/admin/insights/ | wc -l → 2
    Expected Result: 루트에 barrel만, 서브폴더에 14개 파일
    Evidence: .sisyphus/evidence/task-5-file-count.txt

  Scenario: Barrel 파일 re-export 경로 검증
    Tool: Bash
    Steps:
      1. grep 'analytics' app/db/queries/admin/index.server.ts → "./insights/analytics.server"
      2. grep 'challenges' app/db/queries/admin/index.server.ts → "./data/challenges.server"
      3. grep 'curation' app/db/queries/admin/index.server.ts → "./ops/curation.server"
    Expected Result: 모든 re-export가 새 서브폴더 경로 사용
    Evidence: .sisyphus/evidence/task-5-barrel.txt

  Scenario: 최종 Build + TypeCheck + Test
    Tool: Bash
    Steps:
      1. pnpm typecheck 2>&1 | grep 'error TS' | wc -l → baseline과 동일
      2. pnpm test → 모든 테스트 통과
      3. pnpm build → 성공
    Expected Result: 빌드 성공, 새 에러 0
    Evidence: .sisyphus/evidence/task-5-final-verify.txt
  ```

  **Commit**: YES
  - Message: `refactor: sub-group admin query modules`
  - Files: `app/db/queries/admin/**`, `app/routes/admin/**`
  - Pre-commit: `pnpm typecheck && pnpm test`

---

## Final Verification Wave

> 4 review agents run in PARALLEL. ALL must APPROVE.

- [x] F1. **Plan Compliance Audit** — `deep`

  **What to do**: Plan의 "Must Have"와 "Must NOT Have"를 하나씩 검증.

  **QA Scenarios**:

  ```
  Scenario: Must Have 항목 검증
    Tool: Bash
    Steps:
      1. git log --oneline -5 → 5개 refactor 커밋 존재 확인
      2. ls app/components/cards/ app/components/layout/ app/components/sections/ app/components/feedback/ app/components/filters/ app/components/views/ app/components/activity/ app/components/content/ → 8개 디렉토리 모두 존재
      3. ls app/db/queries/records/ app/db/queries/dialogue/ app/db/queries/journey/ app/db/queries/social/ app/db/queries/learners/ app/db/queries/misc/ → 6개 디렉토리 모두 존재
      4. ls app/lib/auth/ app/lib/content/ app/lib/utils/ app/lib/infra/ app/lib/motion/ → 5개 디렉토리 모두 존재
      5. ls app/components/editor/editors/ app/components/editor/extensions/ → 2개 디렉토리 존재
      6. ls app/db/queries/admin/data/ app/db/queries/admin/ops/ app/db/queries/admin/insights/ → 3개 디렉토리 존재
      7. ls .sisyphus/evidence/task-*-*.txt | wc -l → 각 task의 evidence 파일 존재
    Expected Result: 모든 디렉토리 존재, 모든 evidence 파일 존재
    Evidence: .sisyphus/evidence/f1-must-have.txt

  Scenario: Must NOT Have 항목 검증
    Tool: Bash
    Steps:
      1. find app/components app/db/queries app/lib -name "index.ts" -not -path "*/admin/index.server.ts" | wc -l → 0 (새 barrel 없음)
      2. git diff HEAD~5 --name-only | grep -v '.tsx\|.ts\|.server.ts' | head → import 외 파일 변경 없음
      3. git diff HEAD~5 -- app/hooks/ app/styles/ | wc -l → 0 (scope 외 변경 없음)
      4. git diff HEAD~5 -- tsconfig.json vite.config.ts vitest.config.ts | wc -l → 0 (config 변경 없음)
      5. git diff HEAD~5 -- AGENTS.md .docs/ | wc -l → 0 (문서 변경 없음)
    Expected Result: 모든 forbidden 패턴 0건
    Evidence: .sisyphus/evidence/f1-must-not-have.txt
  ```

  Output: `Must Have [N/N] | Must NOT Have [N/N] | VERDICT: APPROVE/REJECT`

- [x] F2. **Code Quality Review** — `unspecified-high`

  **What to do**: 빌드, 타입체크, 테스트 실행 및 코드 품질 검증.

  **QA Scenarios**:

  ```
  Scenario: Build + TypeCheck + Test 통과
    Tool: Bash
    Steps:
      1. pnpm typecheck 2>&1 | grep 'error TS' | sort > /tmp/ts-errors-after.txt
      2. diff .sisyphus/evidence/ts-errors-baseline.txt /tmp/ts-errors-after.txt → 차이 없음 (동일 에러)
      3. pnpm test → 모든 테스트 통과
      4. pnpm build → 성공, exit code 0
    Expected Result: TS 에러 baseline과 동일, 테스트 통과, 빌드 성공
    Evidence: .sisyphus/evidence/f2-build-check.txt

  Scenario: 코드 품질 위반 검사
    Tool: Bash
    Steps:
      1. find app/components app/db/queries app/lib -name "index.ts" -not -path "*/admin/*" | wc -l → 0 (새 barrel 금지)
      2. git diff HEAD~5 -S "export default" --stat | wc -l → 0 (export 시그니처 변경 없음)
      3. git diff HEAD~5 -- "*.tsx" "*.ts" | grep "^+" | grep -v "^+++" | grep -v "import\|from\|export \*" | head -20 → import/export 라인 외 변경 없음 확인
    Expected Result: barrel 0, export 변경 0, import 외 변경 최소
    Evidence: .sisyphus/evidence/f2-quality-check.txt
  ```

  Output: `Build [PASS/FAIL] | TypeCheck [baseline 동일] | Tests [N pass/N fail] | VERDICT`

- [x] F3. **Real Manual QA** — `unspecified-high` (+ `playwright` skill)

  **What to do**: 개발 서버에서 주요 라우트를 방문하여 실제 렌더링 검증.

  **QA Scenarios**:

  ```
  Scenario: Dev 서버 시작 + Public 라우트 렌더링 검증
    Tool: Bash + Playwright (playwright skill)
    Preconditions: 없음 (이 시나리오에서 직접 서버 시작)
    Steps:
      1. Bash: wrangler d1 migrations apply DB --local (DB 준비)
      2. Bash: wrangler d1 execute DB --local --file=seeds/seed.sql (시드 데이터)
      3. Bash: pnpm dev & (백그라운드로 dev 서버 시작, PID 기록)
      4. Bash: sleep 5 && curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/ → 200 (서버 준비 확인)
      5. Playwright: Navigate to http://localhost:5173/ → 페이지 로드, HTML body 존재
      6. Playwright: Navigate to http://localhost:5173/journey → 페이지 로드
      7. Playwright: Navigate to http://localhost:5173/logs → 페이지 로드
      8. Playwright: Navigate to http://localhost:5173/learners → 페이지 로드
      9. Playwright: Navigate to http://localhost:5173/guide → 페이지 로드
      10. Playwright: 각 페이지에서 browser_console_messages(level="error") 확인 → "Failed to resolve import" 또는 "Module not found" 에러 0건
      11. Bash: kill $DEV_PID (서버 종료)
    Expected Result: 5개 라우트 모두 HTTP 200 + 정상 렌더링, import 관련 console error 0건
    Failure Indicators: "Failed to resolve import", "Module not found", "Cannot find module", HTTP 500, 빈 화면
    Evidence: .sisyphus/evidence/final-qa/f3-public-routes.png

  Scenario: Admin 라우트 렌더링 검증
    Tool: Bash + Playwright (playwright skill)
    Preconditions: .dev.vars에 TEST_ADMIN_SESSION 설정 필요 (없으면 이 시나리오 SKIP하고 evidence에 "SKIPPED: no admin session" 기록)
    Steps:
      1. Bash: pnpm dev & (백그라운드로 dev 서버 시작)
      2. Bash: sleep 5
      3. Playwright: browser_evaluate로 document.cookie에 .dev.vars의 TEST_ADMIN_SESSION 값을 adakrpos_session 쿠키로 설정 (domain: localhost)
      4. Playwright: Navigate to http://localhost:5173/admin → 관리자 대시보드 렌더링 또는 로그인 리다이렉트
      5. Playwright: browser_console_messages(level="error") 확인 → import 관련 에러 0건
      6. Bash: kill $DEV_PID (서버 종료)
    Expected Result: admin 라우트 접근 시 import error 없음 (인증 실패로 리다이렉트는 OK, import 깨짐은 NOT OK)
    Failure Indicators: "Failed to resolve import", "Module not found", "Cannot find module"
    Evidence: .sisyphus/evidence/final-qa/f3-admin-routes.png
  ```

  Output: `Routes [N/N render] | Console Errors [0] | VERDICT`

- [x] F4. **Scope Fidelity Check** — `deep`

  **What to do**: 각 Task의 diff를 읽고, spec과 1:1 일치하는지 검증.

  **QA Scenarios**:

  ```
  Scenario: Git 히스토리 rename 추적 확인
    Tool: Bash
    Steps:
      1. git log --oneline -5 → 5개 refactor 커밋 확인
      2. git diff --diff-filter=R --stat HEAD~5 | tail -1 → N files changed (rename으로 추적)
      3. git diff --diff-filter=D --stat HEAD~5 | wc -l → 0 또는 최소 (delete가 아닌 rename)
      4. git diff --diff-filter=A --stat HEAD~5 | wc -l → 0 또는 최소 (add가 아닌 rename)
    Expected Result: 대부분의 파일 변경이 rename으로 추적됨
    Evidence: .sisyphus/evidence/f4-git-renames.txt

  Scenario: Scope 외 파일 변경 없음 확인
    Tool: Bash
    Steps:
      1. git diff --name-only HEAD~5 | grep -v "^app/components/" | grep -v "^app/db/queries/" | grep -v "^app/lib/" | grep -v "^app/routes/" | grep -v "^app/hooks/" → scope 외 변경 파일 목록
      2. 위 결과가 0건이거나, 정당한 cross-import 업데이트만 포함
      3. git diff HEAD~5 -- app/hooks/ app/styles/ app/welcome/ → 0 (scope 외 디렉토리 무변경)
    Expected Result: scope 외 변경 0건
    Evidence: .sisyphus/evidence/f4-scope-check.txt

  Scenario: 고아 파일 없음 확인
    Tool: Bash
    Steps:
      1. ls app/components/*.tsx 2>/dev/null | wc -l → 0
      2. ls app/db/queries/*.server.ts 2>/dev/null | wc -l → 0
      3. ls app/lib/*.ts 2>/dev/null | grep -v test-utils | wc -l → 0
      4. ls app/components/editor/*.tsx app/components/editor/*.ts 2>/dev/null | wc -l → 0
      5. ls app/db/queries/admin/*.server.ts app/db/queries/admin/*.ts 2>/dev/null → index.server.ts만
    Expected Result: 모든 플랫 파일이 서브폴더로 이동됨
    Evidence: .sisyphus/evidence/f4-orphan-check.txt
  ```

  Output: `Tasks [N/N compliant] | Unaccounted [CLEAN/N files] | Renames [N tracked] | VERDICT`

---

## Commit Strategy

| # | Message | Files | Pre-commit |
|---|---------|-------|------------|
| 1 | `refactor: reorganize app/components into domain sub-folders` | app/components/**, app/routes/**, 기타 import sites | `pnpm typecheck && pnpm test` |
| 2 | `refactor: reorganize app/db/queries into domain sub-folders` | app/db/queries/**, app/routes/**, 기타 import sites | `pnpm typecheck && pnpm test` |
| 3 | `refactor: reorganize app/lib into concern-based sub-folders` | app/lib/**, app/routes/**, app/components/**, 기타 | `pnpm typecheck && pnpm test` |
| 4 | `refactor: split editor components into editors and extensions` | app/components/editor/** | `pnpm typecheck && pnpm test` |
| 5 | `refactor: sub-group admin query modules` | app/db/queries/admin/** | `pnpm typecheck && pnpm test` |

---

## Success Criteria

### Verification Commands
```bash
pnpm typecheck 2>&1 | grep 'error TS' | wc -l  # Expected: 36 (unchanged)
pnpm test                                        # Expected: all pass
pnpm build                                       # Expected: success
git diff --stat --diff-filter=R HEAD~5           # Expected: renames tracked
ls app/components/*.tsx 2>/dev/null | wc -l      # Expected: 0
ls app/db/queries/*.server.ts 2>/dev/null | wc -l # Expected: 0
ls app/lib/*.ts app/lib/*.tsx 2>/dev/null         # Expected: only test-utils.tsx
```

### Final Checklist
- [x] 모든 "Must Have" 충족
- [x] 모든 "Must NOT Have" 위반 없음
- [x] 모든 테스트 통과
- [x] 프로덕션 빌드 성공
- [x] Git 히스토리에 rename으로 추적
- [x] 5개 디렉토리 모두 서브폴더 구조 완성
