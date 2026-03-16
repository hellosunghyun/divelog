# Route 파일 폴더형 구조 재구성

## TL;DR

> **Quick Summary**: 52개 flat route 파일(`_public.journey.$stageSlug.tsx` 형태)을 폴더 기반 구조(`public/journey/$stageSlug.tsx`)로 재배치하고, import를 `~/` alias로 통일한다. 런타임 동작 변경 제로.
> 
> **Deliverables**:
> - 50개 route 파일 → 폴더 구조로 재배치 (git mv로 히스토리 보존, layout 2개 제외)
> - ~312개 relative import → `~/` alias로 통일
> - `routes.ts` 파일 경로 문자열 업데이트 (URL 경로는 불변)
> - `+types` import 전체 업데이트
> - `AGENTS.md` 프로젝트 구조 섹션 반영
> 
> **Estimated Effort**: Short (순수 파일 이동 + import 치환)
> **Parallel Execution**: YES — 3 waves (Wave 1은 순차, Wave FINAL은 병렬)
> **Critical Path**: Task 1 → Task 2 → Task 3 → Task 4 (routes.ts + 빌드) → Task 5 (문서)

---

## Context

### Original Request
사용자가 52개 flat route 파일이 한 폴더에 dot-delimited 이름으로 있어 직관적이지 않다고 판단. Next.js App Router처럼 폴더형 구조를 원함.

### Interview Summary
**Key Discussions**:
- 현재 `routes.ts`가 수동으로 경로 → 파일 매핑을 하고 있어, 파일명 convention에 구속받을 필요 없음
- 3가지 선택지 중 **Option 1** 합의: 파일을 폴더로 정리하고 `routes.ts` 경로 문자열만 업데이트

**Research Findings**:
- `routes.ts`: `@react-router/dev/routes`의 `layout()`, `index()`, `route()` 수동 매핑 (56줄)
- `react-router.config.ts`: SSR + Sentry buildEnd 훅만. 라우트 관련 설정 없음
- file-system routing 미설정 — 모든 라우팅이 `routes.ts`에서 명시적

### Metis Review
**Identified Gaps** (addressed):
- **~312개 import 경로 변경 필요**: `~/` alias 전환으로 해결 (이미 `tsconfig`에 설정됨)
- **`+types` import 52개 업데이트 필요**: 각 파일 이동 시 함께 처리
- **`routes.ts` 동시 수정 충돌**: 파일 이동(Task 1~3)과 routes.ts 업데이트(Task 4) 분리
- **파일명 convention 불일치**: `index.tsx`로 통일 (수동 라우팅에서 `_` prefix 무의미)
- **orphaned API routes 2개**: `api.search-learners.tsx`, `api.search-records.tsx`가 `routes.ts`에 미등록 — 기존 버그, 이번 작업에서 수정 안 함
- **`useRouteLoaderData("routes/_public")`**: `GlobalNav.tsx`에서 사용 중 — layout 파일 미이동으로 안전, 검증 포함
- **AGENTS.md 구조 섹션 업데이트 필요**: 별도 Task로 포함

---

## Work Objectives

### Core Objective
52개 flat route 파일을 도메인별 폴더 구조로 재배치하여 개발자 경험(DX)을 개선한다. 런타임 동작 변경 없음.

### Concrete Deliverables
- `app/routes/` 하위에 `public/`, `admin/`, `api/` 폴더 트리 생성
- 50개 route 파일 이동 (23 public + 23 admin + 4 api, layout 2개 제외)
- `routes.ts` 파일 경로 전체 업데이트
- 모든 route 파일 import를 `~/` alias로 통일
- `AGENTS.md` 프로젝트 구조 반영

### Target Folder Structure

```
app/routes/
├── _public.tsx                    (레이아웃 — 이동 안 함)
├── _admin.tsx                     (레이아웃 — 이동 안 함)
├── public/
│   ├── index.tsx                  ← _public._index.tsx
│   ├── journey/
│   │   ├── index.tsx              ← _public.journey.tsx
│   │   └── $stageSlug.tsx         ← _public.journey.$stageSlug.tsx
│   ├── logs/
│   │   ├── index.tsx              ← _public.logs._index.tsx
│   │   ├── $recordSlug.tsx        ← _public.logs.$recordSlug.tsx
│   │   ├── $recordSlug.edit.tsx   ← _public.logs.$recordSlug.edit.tsx
│   │   └── $recordSlug.details.tsx← _public.logs.$recordSlug.details.tsx
│   ├── write/
│   │   ├── index.tsx              ← _public.write.tsx
│   │   ├── note.tsx               ← _public.write.note.tsx
│   │   └── article.tsx            ← _public.write.article.tsx
│   ├── learners/
│   │   ├── index.tsx              ← _public.learners._index.tsx
│   │   └── $learnerSlug.tsx       ← _public.learners.$learnerSlug.tsx
│   ├── challenges/
│   │   ├── index.tsx              ← _public.challenges._index.tsx
│   │   └── $challengeSlug.tsx     ← _public.challenges.$challengeSlug.tsx
│   ├── groups/
│   │   └── $groupSlug.tsx         ← _public.groups.$groupSlug.tsx
│   ├── memories/
│   │   └── $stageSlug.tsx         ← _public.memories.$stageSlug.tsx
│   ├── tags/
│   │   ├── index.tsx              ← _public.tags.tsx
│   │   └── $tagSlug.tsx           ← _public.tags.$tagSlug.tsx
│   ├── search.tsx                 ← _public.search.tsx
│   ├── inbox.tsx                  ← _public.inbox.tsx
│   ├── me.tsx                     ← _public.me.tsx
│   ├── settings.tsx               ← _public.settings.tsx
│   └── guide.tsx                  ← _public.guide.tsx
├── admin/
│   ├── index.tsx                  ← _admin.admin._index.tsx
│   ├── stages/
│   │   ├── index.tsx              ← _admin.admin.stages._index.tsx
│   │   └── $stageId.tsx           ← _admin.admin.stages.$stageId.tsx
│   ├── challenges/
│   │   ├── index.tsx              ← _admin.admin.challenges._index.tsx
│   │   └── $challengeId.tsx       ← _admin.admin.challenges.$challengeId.tsx
│   ├── learners/
│   │   ├── index.tsx              ← _admin.admin.learners._index.tsx
│   │   └── $learnerId.tsx         ← _admin.admin.learners.$learnerId.tsx
│   ├── records/
│   │   ├── index.tsx              ← _admin.admin.records._index.tsx
│   │   └── $recordId.tsx          ← _admin.admin.records.$recordId.tsx
│   ├── dialogue/
│   │   ├── index.tsx              ← _admin.admin.dialogue._index.tsx
│   │   └── $responseId.tsx        ← _admin.admin.dialogue.$responseId.tsx
│   ├── collaboration/
│   │   ├── index.tsx              ← _admin.admin.collaboration._index.tsx
│   │   └── $groupId.tsx           ← _admin.admin.collaboration.$groupId.tsx
│   ├── memories/
│   │   ├── index.tsx              ← _admin.admin.memories._index.tsx
│   │   └── $stageId.tsx           ← _admin.admin.memories.$stageId.tsx
│   ├── templates/
│   │   ├── index.tsx              ← _admin.admin.templates._index.tsx
│   │   └── $templateId.tsx        ← _admin.admin.templates.$templateId.tsx
│   ├── curation.tsx               ← _admin.admin.curation.tsx
│   ├── tags.tsx                   ← _admin.admin.tags.tsx
│   ├── analytics.tsx              ← _admin.admin.analytics.tsx
│   ├── settings.tsx               ← _admin.admin.settings.tsx
│   ├── roles.tsx                  ← _admin.admin.roles.tsx
│   └── audit.tsx                  ← _admin.admin.audit.tsx
├── api/
│   ├── upload.tsx                 ← api.upload.tsx
│   ├── images.$.tsx               ← api.images.$.tsx
│   ├── search-learners.tsx        ← api.search-learners.tsx
│   └── search-records.tsx         ← api.search-records.tsx
```

### Definition of Done
- [ ] `tsc -b` — exit code 0
- [ ] `npx react-router build` — exit code 0
- [ ] `npx playwright test tests/e2e/smoke.spec.ts` — 전체 통과
- [ ] `find app/routes -name '*.tsx' | wc -l` — 52 (23 public + 23 admin + 4 api + 2 layout)
- [ ] dot-delimited 파일 잔존 없음 (layout `_public.tsx`, `_admin.tsx` 2개 제외)
- [ ] `routes.ts` URL 경로(첫 번째 인자) 변경 없음

### Must Have
- git mv로 파일 이동 (히스토리 보존)
- `~/` alias 사용 (모든 route 파일 import 통일)
- `+types` import 전체 업데이트
- `.react-router/` 캐시 삭제 후 typegen 재실행
- `AGENTS.md` 프로젝트 구조 업데이트

### Must NOT Have (Guardrails)
- ❌ Layout 파일(`_public.tsx`, `_admin.tsx`) 이동 — `useRouteLoaderData("routes/_public")` 깨짐
- ❌ URL 경로 패턴 변경 — `routes.ts` 첫 번째 인자 불변
- ❌ Route 로직 수정 — loader, action, component, export 일체 건드리지 않음
- ❌ orphaned API routes(`search-learners`, `search-records`) `routes.ts` 등록 — 별도 이슈
- ❌ 명시적 route ID 추가 — 별도 이슈
- ❌ 파일 이름 변경 (경로 재배치만) — `$stageSlug.tsx`는 그대로
- ❌ route 파일 이외 코드 수정 (`components/`, `lib/`, `db/` 등)
- ❌ barrel export / index re-export 패턴 추가
- ❌ test 파일 수정

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: YES (Playwright e2e)
- **Automated tests**: NO (순수 파일 이동이므로 새 테스트 불필요)
- **Framework**: Playwright (e2e smoke test 기존 활용)

### QA Policy
Every task includes agent-executed QA scenarios. Evidence saved to `.sisyphus/evidence/task-{N}-*.{ext}`.

- **Build verification**: `tsc -b`, `react-router build`
- **File count**: `find` + `wc -l`
- **Route integrity**: URL 경로 diff 확인
- **Runtime**: E2E smoke test

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (순차 실행 — 파일 이동 + import 수정, 같은 git repo에서 순차 커밋):
├── Task 1: Public route 파일 이동 + import ~/로 변환 (23개) [deep]
├── Task 2: Admin route 파일 이동 + import ~/로 변환 (23개) [deep]
└── Task 3: API route 파일 이동 + import ~/로 변환 (4개) [quick]

Wave 2 (Wave 1 이후 — routes.ts + 빌드 검증):
├── Task 4: routes.ts 경로 전체 재작성 + layout import 정리 + typegen + 빌드 [deep]
└── Task 5: AGENTS.md 업데이트 + 최종 커밋 [writing]

Wave FINAL (모든 Task 완료 후 — 4 병렬 검증):
├── Task F1: Plan compliance audit [oracle]
├── Task F2: Code quality review [unspecified-high]
├── Task F3: E2E Runtime Verification [unspecified-high]
└── Task F4: Scope fidelity check [deep]

Critical Path: Task 1 → Task 2 → Task 3 → Task 4 → Task 5 → F1~F4 (병렬)
Max Concurrent: 4 (Wave FINAL만 병렬)
```

> **왜 Wave 1이 순차인가**: Task 1~3은 각각 `git mv` + commit을 수행한다.
> 같은 repo에서 병렬로 `git` 작업을 하면 충돌이 발생하므로 순차 실행이 필수.
> 파일 이동은 빠른 작업이라 순차 실행이어도 전체 시간에 큰 영향 없음.

### Base SHA 기록 (MANDATORY — 작업 시작 전)

> Final Verification Wave에서 정확한 diff를 위해, **Task 1 시작 전에 base SHA를 기록**한다.
> ```bash
> echo $(git rev-parse HEAD) > .sisyphus/evidence/base-sha.txt
> ```
> 이후 모든 검증에서 `HEAD~N` 대신 이 SHA를 사용:
> ```bash
> BASE_SHA=$(cat .sisyphus/evidence/base-sha.txt)
> git diff $BASE_SHA..HEAD -- app/routes.ts
> ```

### 핵심 설계 결정: routes.ts 분리

Wave 1에서 파일 이동(Task 1~3)과 routes.ts 업데이트를 **분리**한다.
- Task 1~3: 파일 이동 + 파일 내부 import만 수정 (routes.ts 건드리지 않음), 각각 커밋
- Task 4: routes.ts를 한 번에 재작성 + typegen + 빌드 검증

Wave 1은 **순차 실행** (같은 git repo에서 `git mv` + commit이 충돌하지 않도록).
Wave 1 완료 전까지 `tsc -b`는 실패할 수 있음 (routes.ts가 아직 옛 경로를 가리키므로). 대신 파일 존재 여부 + import 구문 유효성으로 검증.

### Dependency Matrix

| Task | Depends On | Blocks | Wave |
|------|-----------|--------|------|
| 1 (Public) | — | 2 | 1 (순차) |
| 2 (Admin) | 1 | 3 | 1 (순차) |
| 3 (API) | 2 | 4 | 1 (순차) |
| 4 (routes.ts + build) | 3 | 5 | 2 |
| 5 (AGENTS.md) | 4 | F1~F4 | 2 |
| F1~F4 (검증) | 5 | — | FINAL (병렬) |

### Agent Dispatch Summary

- **Wave 1** (순차): 3 tasks — T1 (23 public) → `deep` + `git-master`, T2 (23 admin) → `deep` + `git-master`, T3 (4 api) → `quick` + `git-master`
- **Wave 2**: 2 tasks — T4 → `deep`, T5 → `writing` + `git-master`
- **FINAL**: 4 tasks — F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `deep`

---

## TODOs

- [x] 1. Public route 파일 이동 + import `~/` 변환 (23개)

  **What to do**:
  1. 폴더 생성: `app/routes/public/`, `public/journey/`, `public/logs/`, `public/write/`, `public/learners/`, `public/challenges/`, `public/groups/`, `public/memories/`, `public/tags/`
  2. `git mv`로 23개 Public route 파일을 새 위치로 이동 (Target Folder Structure 참조)
     - 예: `git mv app/routes/_public._index.tsx app/routes/public/index.tsx`
     - 예: `git mv app/routes/_public.journey.\$stageSlug.tsx app/routes/public/journey/\$stageSlug.tsx`
  3. 이동한 23개 파일의 모든 relative import를 `~/` alias로 변환:
     - `../db/client.server` → `~/db/client.server`
     - `../components/SceneCard` → `~/components/SceneCard`
     - `../lib/auth.middleware` → `~/lib/auth.middleware`
     - 패턴: `from "../` 또는 `from "../../` 또는 `from "../../../`를 모두 `from "~/`로 변환
     - **주의**: `./` 로컬 import (같은 routes 폴더 내 참조)는 건드리지 않음
  4. 각 파일의 `+types` import 업데이트:
     - 예: `import type { Route } from "./+types/_public.journey.$stageSlug"` → `import type { Route } from "./+types/$stageSlug"`
     - 예: `import type { Route } from "./+types/_public._index"` → `import type { Route } from "./+types/index"`
     - `+types` 경로는 새 파일명(확장자 제외)과 일치해야 함
  5. **routes.ts는 건드리지 않음** (Task 4에서 일괄 처리)

  **Must NOT do**:
  - layout 파일 `_public.tsx` 이동
  - routes.ts 수정
  - loader/action/component 로직 수정
  - `./` 로컬 import 변경 (같은 폴더 내 참조는 유지)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: 23개 파일의 import 패턴 분석 + 정확한 치환이 필요한 세밀한 작업
  - **Skills**: [`git-master`]
    - `git-master`: `git mv` 히스토리 보존 패턴 필요
  - **Skills Evaluated but Omitted**:
    - `frontend-design`: UI/스타일 작업 아님

  **Parallelization**:
  - **Can Run In Parallel**: NO (git commit 충돌 방지)
  - **Parallel Group**: Wave 1 (순차: Task 1 → 2 → 3)
  - **Blocks**: Task 2, Task 4
  - **Blocked By**: None (Wave 1 첫 번째)

  **References**:

  **Pattern References**:
  - `app/routes/_public._index.tsx` — 이동 대상 파일 예시. import 패턴 확인용
  - `app/routes/_public.journey.$stageSlug.tsx` — 가장 깊은 nesting 예시

  **API/Type References**:
  - `tsconfig.cloudflare.json` — `"~/*": ["./app/*"]` alias 설정 확인. Vite에서 `vite-tsconfig-paths`로 연동됨

  **External References**:
  - React Router typegen: `.react-router/types/` 디렉토리에 `+types` 자동 생성

  **WHY Each Reference Matters**:
  - `tsconfig`의 `~/` alias가 이미 설정되어 있으므로 별도 설정 불필요
  - `+types`는 파일명 기준으로 생성되므로 이동 후 새 파일명과 맞춰야 함

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 23개 Public 파일이 새 위치에 존재
    Tool: Bash
    Preconditions: git mv 완료
    Steps:
      1. find app/routes/public -name '*.tsx' | wc -l
      2. ls app/routes/public/index.tsx app/routes/public/journey/index.tsx app/routes/public/journey/\$stageSlug.tsx app/routes/public/logs/index.tsx
    Expected Result: 파일 수 23개, 모든 파일 존재
    Failure Indicators: 파일 수 불일치 또는 missing file
    Evidence: .sisyphus/evidence/task-1-file-count.txt

  Scenario: 옛 위치에 Public 파일 잔존 없음
    Tool: Bash
    Preconditions: git mv 완료
    Steps:
      1. ls app/routes/_public.*.tsx 2>/dev/null | grep -v '_public.tsx$' | wc -l
    Expected Result: 0 (layout _public.tsx만 남음)
    Failure Indicators: 1 이상
    Evidence: .sisyphus/evidence/task-1-no-leftover.txt

  Scenario: import에 상대경로(../) 잔존 없음
    Tool: Bash
    Preconditions: import 변환 완료
    Steps:
      1. grep -r 'from "\.\.' app/routes/public/ | grep -v '+types' | wc -l
    Expected Result: 0
    Failure Indicators: 1 이상 (아직 변환 안 된 상대경로 존재)
    Evidence: .sisyphus/evidence/task-1-no-relative-imports.txt
  ```

  **Commit**: YES
  - Message: `refactor: public route 파일을 폴더 구조로 재구성`
  - Files: `app/routes/public/**/*.tsx` (신규 위치), 삭제된 `app/routes/_public.*.tsx`
  - Pre-commit: 파일 존재 확인 (tsc는 routes.ts 미수정 상태라 실패 가능)

- [x] 2. Admin route 파일 이동 + import `~/` 변환 (23개)

  **What to do**:
  1. 폴더 생성: `app/routes/admin/`, `admin/stages/`, `admin/challenges/`, `admin/learners/`, `admin/records/`, `admin/dialogue/`, `admin/collaboration/`, `admin/memories/`, `admin/templates/`
  2. `git mv`로 23개 Admin route 파일을 새 위치로 이동 (Target Folder Structure 참조)
     - 예: `git mv app/routes/_admin.admin._index.tsx app/routes/admin/index.tsx`
     - 예: `git mv app/routes/_admin.admin.stages._index.tsx app/routes/admin/stages/index.tsx`
  3. 이동한 23개 파일의 모든 relative import를 `~/` alias로 변환 (Task 1과 동일 패턴)
  4. 각 파일의 `+types` import 업데이트:
     - 예: `import type { Route } from "./+types/_admin.admin._index"` → `import type { Route } from "./+types/index"`
     - 예: `import type { Route } from "./+types/_admin.admin.stages.$stageId"` → `import type { Route } from "./+types/$stageId"`
  5. **routes.ts는 건드리지 않음** (Task 4에서 일괄 처리)

  **Must NOT do**:
  - layout 파일 `_admin.tsx` 이동
  - routes.ts 수정
  - loader/action/component 로직 수정

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: 23개 파일 세밀한 치환 작업
  - **Skills**: [`git-master`]
    - `git-master`: `git mv` 히스토리 보존

  **Parallelization**:
  - **Can Run In Parallel**: NO (git commit 충돌 방지)
  - **Parallel Group**: Wave 1 (순차: Task 1 → 2 → 3)
  - **Blocks**: Task 3, Task 4
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `app/routes/_admin.admin._index.tsx` — Admin route 파일 예시
  - `app/routes/_admin.admin.stages.$stageId.tsx` — 서브폴더 이동 대상 예시

  **API/Type References**:
  - Task 1과 동일 (`tsconfig.cloudflare.json` ~/alias)

  **WHY Each Reference Matters**:
  - Admin 파일도 동일한 import 패턴 사용. Task 1과 동일 변환 로직 적용

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 23개 Admin 파일이 새 위치에 존재
    Tool: Bash
    Preconditions: git mv 완료
    Steps:
      1. find app/routes/admin -name '*.tsx' | wc -l
    Expected Result: 23
    Failure Indicators: 파일 수 불일치
    Evidence: .sisyphus/evidence/task-2-file-count.txt

  Scenario: 옛 위치에 Admin 파일 잔존 없음
    Tool: Bash
    Preconditions: git mv 완료
    Steps:
      1. ls app/routes/_admin.admin.*.tsx 2>/dev/null | wc -l
    Expected Result: 0
    Failure Indicators: 1 이상
    Evidence: .sisyphus/evidence/task-2-no-leftover.txt

  Scenario: import에 상대경로(../) 잔존 없음
    Tool: Bash
    Preconditions: import 변환 완료
    Steps:
      1. grep -r 'from "\.\.' app/routes/admin/ | grep -v '+types' | wc -l
    Expected Result: 0
    Failure Indicators: 1 이상
    Evidence: .sisyphus/evidence/task-2-no-relative-imports.txt
  ```

  **Commit**: YES
  - Message: `refactor: admin route 파일을 폴더 구조로 재구성`
  - Files: `app/routes/admin/**/*.tsx` (신규 23개), 삭제된 `app/routes/_admin.admin.*.tsx`
  - Pre-commit: 파일 존재 확인

- [x] 3. API route 파일 이동 + import `~/` 변환 (4개)

  **What to do**:
  1. 폴더 생성: `app/routes/api/`
  2. `git mv`로 4개 API route 파일을 새 위치로 이동:
     - `git mv app/routes/api.upload.tsx app/routes/api/upload.tsx`
     - `git mv app/routes/api.images.$.tsx app/routes/api/images.$.tsx`
     - `git mv app/routes/api.search-learners.tsx app/routes/api/search-learners.tsx`
     - `git mv app/routes/api.search-records.tsx app/routes/api/search-records.tsx`
  3. 이동한 4개 파일의 relative import를 `~/` alias로 변환
  4. 각 파일의 `+types` import 업데이트
  5. **routes.ts는 건드리지 않음** (Task 4에서 일괄 처리)
  6. **`api.search-learners.tsx`와 `api.search-records.tsx`는 `routes.ts`에 미등록 상태 — 이번 작업에서 등록하지 않음** (기존 버그, 별도 이슈)
  7. 위 2개 orphaned 파일의 `+types` import 라인을 **제거**: 이 파일들은 `routes.ts`에 미등록이라 typegen이 `+types` 모듈을 생성하지 않음. 기존에도 `+types` import가 깨져 있었고 (pre-existing 에러), fresh typegen 후에는 확실히 실패함. `import type { Route } from "./+types/..."` 라인을 삭제하고, `Route.LoaderArgs` 등을 인라인 타입으로 대체하거나 해당 파일에 로컬 타입을 정의:
     ```typescript
     // 기존 (깨진 import):
     // import type { Route } from "./+types/search-learners";
     // 대체:
     import type { LoaderFunctionArgs } from "react-router";
     ```
     **이것은 새 기능 추가가 아니라 기존 깨진 import의 정리**임

  **Must NOT do**:
  - orphaned API routes를 routes.ts에 등록
  - routes.ts 수정
  - loader/action 로직 수정 (단, orphaned 파일의 깨진 `+types` import 제거는 예외 — 이는 기존 에러 정리)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 4개 파일 이동 + 치환 + 2개 파일 깨진 import 정리
  - **Skills**: [`git-master`]
    - `git-master`: `git mv`

  **Parallelization**:
  - **Can Run In Parallel**: NO (git commit 충돌 방지)
  - **Parallel Group**: Wave 1 (순차: Task 1 → 2 → 3)
  - **Blocks**: Task 4
  - **Blocked By**: Task 2

  **References**:

  **Pattern References**:
  - `app/routes/api.upload.tsx` — API route 파일 예시
  - `app/routes/api.images.$.tsx` — splat route 파일명 (`$` 포함) 주의

  **WHY Each Reference Matters**:
  - `images.$.tsx`의 `$`는 파일시스템에서 유효하지만 shell에서 이스케이프 필요 (`\$`)

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 4개 API 파일이 새 위치에 존재
    Tool: Bash
    Preconditions: git mv 완료
    Steps:
      1. find app/routes/api -name '*.tsx' | wc -l
      2. ls app/routes/api/upload.tsx app/routes/api/images.\$.tsx
    Expected Result: 파일 수 4개, 주요 파일 존재
    Failure Indicators: 파일 수 불일치
    Evidence: .sisyphus/evidence/task-3-file-count.txt

  Scenario: 옛 위치에 API 파일 잔존 없음
    Tool: Bash
    Preconditions: git mv 완료
    Steps:
      1. ls app/routes/api.*.tsx 2>/dev/null | wc -l
    Expected Result: 0
    Failure Indicators: 1 이상
    Evidence: .sisyphus/evidence/task-3-no-leftover.txt
  ```

  **Commit**: YES
  - Message: `refactor: API route 파일을 폴더 구조로 재구성`
  - Files: `app/routes/api/**/*.tsx`
  - Pre-commit: 파일 존재 확인

- [x] 4. routes.ts 경로 재작성 + layout import 정리 + typegen + 빌드 검증

  **What to do**:
  1. `routes.ts`의 모든 파일 경로 문자열(두 번째 인자)을 새 위치로 업데이트:
     - Public: `"routes/_public._index.tsx"` → `"routes/public/index.tsx"` 등 (23개)
     - Admin: `"routes/_admin.admin._index.tsx"` → `"routes/admin/index.tsx"` 등 (23개)
     - API: `"routes/api.upload.tsx"` → `"routes/api/upload.tsx"` 등 (2개 — orphaned 제외)
     - Layout: `"routes/_public.tsx"`, `"routes/_admin.tsx"` 그대로 유지
     - **URL 경로(첫 번째 인자)는 절대 변경하지 않음**
  2. Layout 파일 2개(`_public.tsx`, `_admin.tsx`)의 relative import도 `~/` alias로 변환 (일관성)
  3. `.react-router/` 캐시 삭제: `rm -rf .react-router`
  4. typegen 재실행: `npx react-router typegen`
  5. 타입 체크: `tsc -b`
  6. 프로덕션 빌드: `npx react-router build`
  7. `useRouteLoaderData("routes/_public")` 검증:
     - `GlobalNav.tsx`에서 사용하는 문자열이 `routes.ts`의 layout 파일 경로와 일치하는지 확인
  8. E2E smoke test: `npx playwright test tests/e2e/smoke.spec.ts`

  **Must NOT do**:
  - URL 경로 패턴(첫 번째 인자) 변경
  - route 로직(loader/action) 수정
  - orphaned API routes 등록
  - 명시적 route ID 추가

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: routes.ts 정밀 수정 + 전체 빌드 파이프라인 검증
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `git-master`: 단순 커밋이므로 불필요

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (sequential)
  - **Blocks**: Task 5
  - **Blocked By**: Tasks 1, 2, 3

  **References**:

  **Pattern References**:
  - `app/routes.ts` — 현재 56줄의 수동 라우트 매핑. 두 번째 인자만 수정 대상
  - `app/components/GlobalNav.tsx:25` — `useRouteLoaderData("routes/_public")` 사용처

  **API/Type References**:
  - `@react-router/dev/routes` — `layout()`, `index()`, `route()` 함수 시그니처
  - `.react-router/types/` — typegen이 생성하는 `+types` 디렉토리

  **WHY Each Reference Matters**:
  - `routes.ts`의 URL 경로(첫 번째 인자)와 파일 경로(두 번째 인자) 구분이 핵심
  - `GlobalNav.tsx`의 `useRouteLoaderData` 문자열은 layout 파일 경로에서 파생되므로 layout을 안 옮긴 이상 안전

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: TypeScript 컴파일 성공
    Tool: Bash
    Preconditions: 모든 파일 이동 + routes.ts 업데이트 + typegen 완료
    Steps:
      1. rm -rf .react-router
      2. npx react-router typegen
      3. tsc -b
    Expected Result: exit code 0, 에러 없음
    Failure Indicators: 컴파일 에러 (import 미스매치, +types 경로 오류 등)
    Evidence: .sisyphus/evidence/task-4-tsc.txt

  Scenario: 프로덕션 빌드 성공
    Tool: Bash
    Preconditions: tsc -b 통과
    Steps:
      1. npx react-router build
    Expected Result: exit code 0
    Failure Indicators: 빌드 에러
    Evidence: .sisyphus/evidence/task-4-build.txt

  Scenario: URL 경로 불변 검증
    Tool: Bash
    Preconditions: routes.ts 업데이트 완료, base SHA 기록됨 (.sisyphus/evidence/base-sha.txt)
    Steps:
      1. BASE_SHA=$(cat .sisyphus/evidence/base-sha.txt)
      2. git show $BASE_SHA:app/routes.ts | sed -n 's/.*route("\([^"]*\)".*/\1/p' | sort > /tmp/old-urls.txt
      3. sed -n 's/.*route("\([^"]*\)".*/\1/p' app/routes.ts | sort > /tmp/new-urls.txt
      4. diff /tmp/old-urls.txt /tmp/new-urls.txt
    Expected Result: diff 출력 없음 (URL 경로 완전 동일)
    Failure Indicators: diff에 변경 줄 존재
    Evidence: .sisyphus/evidence/task-4-url-paths-unchanged.txt

  Scenario: 전체 파일 수 52개 확인
    Tool: Bash
    Preconditions: 모든 이동 완료
    Steps:
      1. find app/routes -name '*.tsx' | wc -l
    Expected Result: 52
    Failure Indicators: 52가 아닌 수
    Evidence: .sisyphus/evidence/task-4-total-file-count.txt

  Scenario: E2E smoke test 통과
    Tool: Bash
    Preconditions: 빌드 성공
    Steps:
      1. npx playwright test tests/e2e/smoke.spec.ts
    Expected Result: 전체 통과
    Failure Indicators: 실패 테스트 존재
    Evidence: .sisyphus/evidence/task-4-e2e.txt
  ```

  **Commit**: YES
  - Message: `refactor: routes.ts 경로 업데이트 및 빌드 검증`
  - Files: `app/routes.ts`, `app/routes/_public.tsx`, `app/routes/_admin.tsx`
  - Pre-commit: `tsc -b && npx react-router build`

- [x] 5. AGENTS.md 프로젝트 구조 섹션 업데이트

  **What to do**:
  1. `AGENTS.md`의 "프로젝트 구조" 섹션에서 `app/routes/` 하위를 새 폴더 구조로 업데이트:
     - 기존 dot-delimited 파일명 목록 → 폴더 트리 구조로 교체
     - 이 계획의 "Target Folder Structure" 섹션 참조
     - 트리 내에서 경로 표기 시 `routes/public/`, `routes/admin/`, `routes/api/` 접두사가 포함되도록 작성 (QA 검증용)
  2. route 관련 설명이 있는 다른 섹션도 확인하여 일관성 유지 (예: 라우트 파일명 언급 부분)
  3. 최종 상태 검증: `tsc -b && npx react-router build`

  **Must NOT do**:
  - AGENTS.md의 route 외 섹션 수정
  - 코드 변경

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: 문서 업데이트 작업
  - **Skills**: [`git-master`]
    - `git-master`: 최종 커밋

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (sequential after Task 4)
  - **Blocks**: F1~F4
  - **Blocked By**: Task 4

  **References**:

  **Pattern References**:
  - `AGENTS.md` "프로젝트 구조" 섹션 — 현재 dot-delimited 파일명으로 작성됨
  - 이 계획의 "Target Folder Structure" 섹션 — 새 구조 참조

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: AGENTS.md에 새 폴더 구조 반영
    Tool: Bash
    Preconditions: Task 4 완료
    Steps:
      1. grep -c 'public/' AGENTS.md → 1 이상 (새 폴더 구조 언급 확인)
      2. grep -c 'admin/' AGENTS.md → 1 이상 (새 폴더 구조 언급 확인)
      3. grep -c '_public\._index\|_public\.journey\|_admin\.admin\.' AGENTS.md → 0 (옛 dot-delimited 이름 잔존 없음)
    Expected Result: Steps 1, 2는 1 이상. Step 3은 0.
    Failure Indicators: 새 구조 미반영 (Steps 1, 2가 0) 또는 옛 이름 잔존 (Step 3이 1 이상)
    Evidence: .sisyphus/evidence/task-5-agents-md.txt
  ```

  **Commit**: YES
  - Message: `docs: AGENTS.md 프로젝트 구조 섹션 업데이트`
  - Files: `AGENTS.md`
  - Pre-commit: N/A

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Rejection → fix → re-run.
> **ZERO HUMAN INTERVENTION** — 모든 검증은 agent가 도구로 직접 수행.

- [x] F1. **Plan Compliance Audit** — `oracle`

  **What to do**: 계획의 Must Have / Must NOT Have 항목을 하나씩 검증.

  **Recommended Agent Profile**:
  - **Category**: N/A (oracle subagent)
  - **Skills**: []

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Must Have 항목 전체 충족 확인
    Tool: Bash
    Preconditions: 모든 Task 1~5 완료
    Steps:
      1. find app/routes/public -name '*.tsx' | wc -l → 23 확인
      2. find app/routes/admin -name '*.tsx' | wc -l → 23 확인
      3. find app/routes/api -name '*.tsx' | wc -l → 4 확인
      4. grep -r 'from "~/' app/routes/public/ app/routes/admin/ app/routes/api/ | head -5 → ~/alias 사용 확인
      5. grep -c 'public/' AGENTS.md → 1 이상 (AGENTS.md에 새 구조 반영 확인)
      6. ls .sisyphus/evidence/task-*.txt | wc -l → evidence 파일 존재 확인
    Expected Result: 모든 수치 일치, ~/alias 사용, AGENTS.md 반영, evidence 존재
    Failure Indicators: 어느 하나라도 불일치
    Evidence: .sisyphus/evidence/f1-must-have-audit.txt

  Scenario: Must NOT Have 위반 없음 확인
    Tool: Bash
    Preconditions: 모든 Task 완료
    Steps:
      1. ls app/routes/_public.tsx app/routes/_admin.tsx → layout 파일 존재 확인 (이동 안 함)
      2. ls app/routes/_public.*.tsx 2>/dev/null | grep -v '_public.tsx$' | wc -l → 0 (잔존 없음)
      3. ls app/routes/_admin.admin.*.tsx 2>/dev/null | wc -l → 0 (잔존 없음)
      4. grep -r 'useRouteLoaderData.*routes/_public' app/components/GlobalNav.tsx → 매치 있음 (깨지지 않음)
    Expected Result: layout 존재, 잔존 파일 0, GlobalNav 정상
    Failure Indicators: layout 누락 또는 잔존 파일 발견
    Evidence: .sisyphus/evidence/f1-must-not-have-audit.txt
  ```

  Output: `Must Have [N/N] | Must NOT Have [N/N] | VERDICT: APPROVE/REJECT`

- [x] F2. **Code Quality Review** — `unspecified-high`

  **What to do**: 빌드 파이프라인 + import 품질 검사.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: TypeScript + 빌드 통과
    Tool: Bash
    Preconditions: 모든 파일 이동 + routes.ts 업데이트 완료
    Steps:
      1. rm -rf .react-router && npx react-router typegen
      2. tsc -b
      3. npx react-router build
    Expected Result: 세 명령 모두 exit code 0
    Failure Indicators: 컴파일/빌드 에러
    Evidence: .sisyphus/evidence/f2-build.txt

  Scenario: stale +types 참조 없음
    Tool: Bash
    Preconditions: typegen 완료
    Steps:
      1. grep -r '+types/_public\.' app/routes/ | wc -l → 0 (옛 +types 패턴 잔존 없음)
      2. grep -r '+types/_admin\.admin\.' app/routes/ | wc -l → 0
      3. grep -r '+types/api\.' app/routes/ | wc -l → 0
    Expected Result: 모두 0
    Failure Indicators: 1 이상 (stale 참조 존재)
    Evidence: .sisyphus/evidence/f2-stale-types.txt

  Scenario: route 로직 미변경 확인
    Tool: Bash
    Preconditions: 모든 커밋 완료, base SHA 기록됨 (.sisyphus/evidence/base-sha.txt)
    Steps:
      1. BASE_SHA=$(cat .sisyphus/evidence/base-sha.txt)
      2. git diff $BASE_SHA..HEAD -- '*.tsx' | grep -E '^\+.*export (async )?function (loader|action|default)' | wc -l → 0
    Expected Result: 0 (loader/action/component export 추가/변경 없음)
    Failure Indicators: 1 이상 (로직 변경 발생)
    Evidence: .sisyphus/evidence/f2-no-logic-change.txt
  ```

  Output: `Build [PASS/FAIL] | Types [PASS/FAIL] | Logic [UNCHANGED/CHANGED] | VERDICT`

- [x] F3. **E2E Runtime Verification** — `unspecified-high`

  **What to do**: dev server 기동 + Playwright로 주요 경로 자동 접근.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`playwright`]

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: E2E smoke test 전체 통과
    Tool: Bash
    Preconditions: 빌드 성공
    Steps:
      1. npx playwright test tests/e2e/smoke.spec.ts
    Expected Result: 모든 테스트 통과
    Failure Indicators: 실패 테스트 존재
    Evidence: .sisyphus/evidence/f3-e2e-smoke.txt

  Scenario: 주요 Public 경로 접근 가능
    Tool: Playwright (playwright skill)
    Preconditions: dev server 기동 (pnpm dev)
    Steps:
      1. Navigate to http://localhost:5173/ → 페이지 로드 확인
      2. Navigate to http://localhost:5173/journey → 페이지 로드 확인
      3. Navigate to http://localhost:5173/logs → 페이지 로드 확인
      4. Navigate to http://localhost:5173/search → 페이지 로드 확인
      5. Navigate to http://localhost:5173/guide → 페이지 로드 확인
      6. 각 페이지에서 콘솔 에러 없음 확인
    Expected Result: 5개 페이지 모두 HTTP 200, 콘솔 에러 없음
    Failure Indicators: HTTP 4xx/5xx 또는 콘솔 에러
    Evidence: .sisyphus/evidence/f3-public-routes-screenshots/

  Scenario: Admin 경로 접근 가능 (인증 리다이렉트 확인)
    Tool: Playwright (playwright skill)
    Preconditions: dev server 기동
    Steps:
      1. Navigate to http://localhost:5173/admin → 응답 확인 (인증 리다이렉트 또는 페이지 로드)
    Expected Result: 라우트가 존재하고 응답 반환 (401/302 또는 200)
    Failure Indicators: 404 Not Found
    Evidence: .sisyphus/evidence/f3-admin-route.txt
  ```

  Output: `E2E [N/N pass] | Public Routes [N/N] | Admin [OK/FAIL] | VERDICT`

- [x] F4. **Scope Fidelity Check** — `deep`

  **What to do**: git diff로 변경 범위가 계획과 정확히 일치하는지 검증.

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: [`git-master`]

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: URL 경로 불변 확인
    Tool: Bash
    Preconditions: 모든 커밋 완료, base SHA 기록됨 (.sisyphus/evidence/base-sha.txt)
    Steps:
      1. BASE_SHA=$(cat .sisyphus/evidence/base-sha.txt)
      2. git show $BASE_SHA:app/routes.ts | sed -n 's/.*route("\([^"]*\)".*/\1/p' | sort > /tmp/old-urls-f4.txt
      3. sed -n 's/.*route("\([^"]*\)".*/\1/p' app/routes.ts | sort > /tmp/new-urls-f4.txt
      4. diff /tmp/old-urls-f4.txt /tmp/new-urls-f4.txt
    Expected Result: diff 출력 없음 (URL 경로 완전 동일)
    Failure Indicators: diff에 변경 줄 존재
    Evidence: .sisyphus/evidence/f4-url-paths.txt

  Scenario: 변경 파일이 허용 범위 내로 제한
    Tool: Bash
    Preconditions: 모든 커밋 완료, base SHA 기록됨 (.sisyphus/evidence/base-sha.txt)
    Steps:
      1. BASE_SHA=$(cat .sisyphus/evidence/base-sha.txt)
      2. git diff $BASE_SHA..HEAD --name-only | grep -v '^app/routes/' | grep -v '^app/routes\.ts$' | grep -v '^AGENTS.md$' | grep -v '\.react-router/' | wc -l
    Expected Result: 0 (app/routes/, app/routes.ts, AGENTS.md, .react-router/ 외 변경 없음)
    Failure Indicators: 1 이상 (scope 밖 파일 변경)
    Evidence: .sisyphus/evidence/f4-scope-check.txt

  Scenario: 파일 총 수 52개 유지
    Tool: Bash
    Preconditions: 모든 이동 완료
    Steps:
      1. find app/routes -name '*.tsx' | wc -l
    Expected Result: 52 (23 public + 23 admin + 4 api + 2 layout)
    Failure Indicators: 52가 아닌 수
    Evidence: .sisyphus/evidence/f4-total-count.txt
  ```

  Output: `URL Paths [UNCHANGED/CHANGED] | Scope [CLEAN/N issues] | File Count [52/N] | VERDICT`

---

## Commit Strategy

| Commit | Contents | Gate |
|--------|----------|------|
| `refactor: public route 파일을 폴더 구조로 재구성` | 23 public 파일 이동 + import ~/화 | 파일 존재 확인 |
| `refactor: admin route 파일을 폴더 구조로 재구성` | 23 admin 파일 이동 + import ~/화 | 파일 존재 확인 |
| `refactor: API route 파일을 폴더 구조로 재구성` | 4 API 파일 이동 + import ~/화 | 파일 존재 확인 |
| `refactor: routes.ts 경로 업데이트 및 빌드 검증` | routes.ts 재작성 + layout import 정리 + typegen | `tsc -b && react-router build` |
| `docs: AGENTS.md 프로젝트 구조 섹션 업데이트` | AGENTS.md | N/A |

---

## Success Criteria

### Verification Commands
```bash
tsc -b                              # Expected: exit code 0
npx react-router build              # Expected: exit code 0
npx playwright test tests/e2e/smoke.spec.ts  # Expected: all pass
find app/routes -name '*.tsx' | wc -l         # Expected: 52
```

### Final Checklist
- [ ] 모든 "Must Have" 충족
- [ ] 모든 "Must NOT Have" 위반 없음
- [ ] dot-delimited route 파일 잔존 없음 (layout 제외)
- [ ] `routes.ts` URL 경로 byte-identical
- [ ] `useRouteLoaderData("routes/_public")` 정상 동작
- [ ] AGENTS.md 프로젝트 구조 반영 완료
