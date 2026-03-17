# 기록 페이지 타임라인 + 캘린더 뷰

## TL;DR

> **Quick Summary**: 기록(/logs) 페이지에 Stage 기반 좌우 분리 타임라인 뷰(노트 좌측, 글 우측)를 기본 뷰로 추가하고, 월간 캘린더 뷰와 기간순 정렬 옵션을 구현한다. Git worktree로 격리된 환경에서 작업.
> 
> **Deliverables**:
> - Stage 기반 좌우 분리 타임라인 뷰 (기본 뷰)
> - CompactTimelineCard 컴포넌트 (밀도 높은 카드)
> - 월간 캘린더 뷰 (호버 팝오버)
> - 기간순(Stage 순서) 정렬 옵션
> - ViewToggle 3-way (그리드/타임라인/캘린더)
> - Stage 그룹핑 유틸리티 + 캘린더 유틸리티 (Vitest 테스트 포함)
> 
> **Estimated Effort**: Medium
> **Parallel Execution**: YES — 4 waves
> **Critical Path**: T1(worktree) → T2(popover dep) → T3(stage-groups util) → T7(TimelineView) → T10(integration)

---

## Context

### Original Request
기록 페이지의 노트를 타임라인 뷰 기본으로 하되, 가운데 세로선 기준으로 좌측에 노트, 우측에 글(Article)이 시간대별로 밀도 있게 보이도록. 기간순/생성순 정렬 옵션과 큰 캘린더 뷰(마우스 호버 시 상세 팝오버) 추가.

### Interview Summary
**Key Discussions**:
- Stage 단위로 타임라인 구간 구분 (월/주 대신 Academy Stage 기준)
- 컴팩트 카드 밀도 (제목 + 날짜 + 1-2줄 미리보기)
- 캘린더 호버 시 팝오버 카드 (제목 + 미리보기 3-4줄 + 유형 표시)

**Research Findings**:
- 기존 TimelineView.tsx (91줄) 존재 — 날짜 기반 그룹핑(today/yesterday/week/month). Stage 기반 좌우 분리와 다름 → 리디자인 필요
- CalendarView 없음 → 신규 개발
- `@radix-ui/react-popover` 미설치 → 설치 필요
- records.stageId nullable → "미분류" 버킷 필요
- Vitest + jsdom 인프라 존재 (16개 테스트 파일) → 유틸리티 테스트 작성
- Seed data: 25개 중 23개가 `stage-challenge-1`에 집중 — QA 시 유의
- 로더: 현재 20개/페이지 offset 기반 — 타임라인/캘린더는 확장 필요

### Metis Review
**Identified Gaps** (addressed):
- NULL stageId 처리 → "미분류" 섹션으로 해결
- 타임라인 페이지네이션 → 전체 로드 (합리적 상한선)
- 모바일 좌우 분리 → 단일 컬럼 폴백
- Tags 로더 미포함 → V1 팝오버에서 제외
- 빈 Stage 표시 → 레코드 있는 Stage만 표시
- 캘린더 월 범위 → 가장 오래된 레코드 ~ 현재 월

---

## Work Objectives

### Core Objective
기록 페이지에 Stage 기반 좌우 분리 타임라인 뷰를 기본 뷰로 추가하고, 월간 캘린더 뷰와 기간순 정렬을 지원하여 Learner의 기록을 시간 구조 속에서 밀도 있게 탐색할 수 있게 한다.

### Concrete Deliverables
- `app/lib/utils/stage-groups.ts` — Stage 기반 레코드 그룹핑 유틸리티
- `app/lib/utils/calendar.ts` — 캘린더 날짜 유틸리티
- `app/lib/utils/__tests__/stage-groups.test.ts` — 유닛 테스트
- `app/lib/utils/__tests__/calendar.test.ts` — 유닛 테스트
- `app/components/cards/CompactTimelineCard.tsx` — 밀도 높은 타임라인 카드
- `app/components/views/TimelineView.tsx` — Stage 기반 좌우 분리 리디자인
- `app/components/views/CalendarView.tsx` — 월간 캘린더 뷰
- `app/components/ui/popover.tsx` — Radix Popover 래퍼
- `app/components/views/ViewToggle.tsx` — 3-way 토글 (확장)
- `app/routes/public/logs/index.tsx` — 로더 확장 + 뷰 통합

### Definition of Done
- [ ] `/logs?view=timeline` 접근 시 Stage 기반 좌우 타임라인 렌더
- [ ] `/logs?view=calendar` 접근 시 월간 캘린더 렌더
- [ ] `/logs?view=grid` 기존 그리드 뷰 동일 동작
- [ ] `/logs?sort=stage` 기간순(Stage order) 정렬
- [ ] `pnpm test` 전체 통과
- [ ] `pnpm typecheck` 통과
- [ ] `pnpm build` 프로덕션 빌드 성공

### Must Have
- Stage 기반 좌우 분리 타임라인 (노트 좌, 글 우, 가운데 세로선)
- 컴팩트 카드 밀도 (제목 + 날짜 + 1-2줄)
- 기간순 정렬 옵션 (Stage order)
- 월간 캘린더 뷰 + 호버 팝오버
- 3-way ViewToggle (그리드/타임라인/캘린더)
- NULL stageId 레코드 "미분류" 섹션
- 모바일 단일 컬럼 폴백
- 빈 상태 처리 (모든 뷰)
- Stage 톤 컬러 헤더 (prelude→mist, bridge→cyan, challenge→deep-ocean, epilogue→neutral)

### Must NOT Have (Guardrails)
- 좋아요, 인기순, 랭킹, 베스트
- Tags 로더 JOIN (V1 제외 — 별도 이터레이션)
- 무한 스크롤
- 캘린더 드래그 스크롤
- Stage 진행률 표시 (game-like progress 금지)
- SceneCard.tsx 수정 (새 CompactTimelineCard 생성)
- groupRecordsByDate() 수정 (기존 유틸리티 보존)
- 기존 URL 파라미터 동작 변경
- Rich text 에디터
- framer-motion 직접 import (`~/lib/motion/motion` 래퍼 사용)

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: YES (Vitest + jsdom, 16개 기존 테스트)
- **Automated tests**: YES (Tests-after)
- **Framework**: Vitest
- **Coverage**: 유틸리티 함수 (stage-groups, calendar) 필수, 컴포넌트는 Agent QA

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Frontend/UI**: Playwright — Navigate, interact, assert DOM, screenshot
- **Utility Functions**: Bash (pnpm test) — Run tests, verify pass
- **Build**: Bash (pnpm typecheck && pnpm build) — Type safety + production build

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation — 즉시 시작):
├── T1: Git worktree + feature branch 생성 [quick]
├── T2: @radix-ui/react-popover 설치 [quick]
├── T3: Stage 그룹핑 유틸리티 + 테스트 [unspecified-high]
├── T4: 캘린더 날짜 유틸리티 + 테스트 [unspecified-high]
└── T5: Radix Popover UI 래퍼 컴포넌트 [quick]

Wave 2 (UI 프리미티브 — Wave 1 완료 후):
├── T6: CompactTimelineCard 컴포넌트 [visual-engineering]
├── T7: ViewToggle 3-way 확장 [quick]
└── T8: SortBar 기간순 옵션 + 로더 확장 [unspecified-high]

Wave 3 (뷰 조합 — Wave 2 완료 후):
├── T9: TimelineView Stage 기반 좌우 분리 리디자인 [visual-engineering]
└── T10: CalendarView 월간 그리드 + 팝오버 [visual-engineering]

Wave 4 (통합 + 검증):
├── T11: 로그 페이지 통합 + 빌드 검증 [deep]
└── T12: 전체 QA + 빈 상태 + 모바일 검증 [unspecified-high]

Wave FINAL (독립 리뷰, 4 parallel):
├── F1: Plan compliance audit (oracle)
├── F2: Code quality review (unspecified-high)
├── F3: Real manual QA (unspecified-high)
└── F4: Scope fidelity check (deep)

Critical Path: T1 → T2 → T3 → T6 → T9 → T11 → F1-F4
Parallel Speedup: ~55% faster than sequential
Max Concurrent: 5 (Wave 1)
```

### Dependency Matrix

| Task | Depends On | Blocks |
|------|-----------|--------|
| T1 | — | T2-T12 (모든 작업은 worktree에서) |
| T2 | T1 | T5, T10 |
| T3 | T1 | T8, T9 |
| T4 | T1 | T10 |
| T5 | T2 | T10 |
| T6 | T1 | T9, T10 |
| T7 | T1 | T11 |
| T8 | T3 | T11 |
| T9 | T3, T6 | T11 |
| T10 | T4, T5, T6 | T11 |
| T11 | T7, T8, T9, T10 | T12 |
| T12 | T11 | F1-F4 |

### Agent Dispatch Summary

- **Wave 1**: **5** — T1 → `quick`, T2 → `quick`, T3 → `unspecified-high`, T4 → `unspecified-high`, T5 → `quick`
- **Wave 2**: **3** — T6 → `visual-engineering`, T7 → `quick`, T8 → `unspecified-high`
- **Wave 3**: **2** — T9 → `visual-engineering`, T10 → `visual-engineering`
- **Wave 4**: **2** — T11 → `deep`, T12 → `unspecified-high`
- **FINAL**: **4** — F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `deep`

---

## TODOs

- [x] 1. Git Worktree + Feature Branch 생성

  **What to do**:
  - `feature/logs-timeline-calendar` 브랜치를 main에서 생성
  - Git worktree를 `../divelog-timeline` 경로에 생성
  - worktree에서 작업 환경 확인 (`pnpm install` 필요 시 실행)

  **Must NOT do**:
  - main 브랜치에서 직접 작업
  - 기존 워킹 디렉토리의 상태 변경

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 단순 git 명령어 실행
  - **Skills**: [`git-master`]
    - `git-master`: worktree + branch 생성 패턴

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 1 (선행)
  - **Blocks**: T2, T3, T4, T5, T6, T7, T8, T9, T10, T11, T12
  - **Blocked By**: None

  **References**:
  - **Pattern References**: 없음 (표준 git 명령)
  - **External References**: `git worktree add ../divelog-timeline feature/logs-timeline-calendar`

  **Acceptance Criteria**:
  - [ ] `git worktree list`에 `../divelog-timeline` 경로 표시
  - [ ] `feature/logs-timeline-calendar` 브랜치 존재
  - [ ] worktree에서 `pnpm typecheck` 통과

  **QA Scenarios**:

  ```
  Scenario: Worktree 생성 확인
    Tool: Bash
    Preconditions: main 브랜치에 최신 커밋
    Steps:
      1. git worktree add ../divelog-timeline feature/logs-timeline-calendar
      2. git worktree list
      3. cd ../divelog-timeline && pnpm install && pnpm typecheck
    Expected Result: worktree list에 ../divelog-timeline 경로 + feature/logs-timeline-calendar 브랜치, typecheck 0 errors
    Failure Indicators: "fatal: " 에러, typecheck 실패
    Evidence: .sisyphus/evidence/task-1-worktree-created.txt
  ```

  **Commit**: NO (인프라 설정)

- [x] 2. @radix-ui/react-popover 설치

  **What to do**:
  - `pnpm add @radix-ui/react-popover` 실행
  - package.json에 의존성 추가 확인
  - typecheck 통과 확인

  **Must NOT do**:
  - 다른 Radix 패키지 업그레이드
  - 불필요한 peer dependency 설치

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 단일 패키지 설치
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T3, T4)
  - **Blocks**: T5, T10
  - **Blocked By**: T1

  **References**:
  - **Pattern References**: `package.json` — 기존 Radix 패키지 버전 패턴 확인 (`@radix-ui/react-dialog` 등)
  - **External References**: https://www.radix-ui.com/primitives/docs/components/popover

  **Acceptance Criteria**:
  - [ ] `@radix-ui/react-popover` in package.json dependencies
  - [ ] `pnpm typecheck` 통과

  **QA Scenarios**:

  ```
  Scenario: Popover 패키지 설치 확인
    Tool: Bash
    Preconditions: worktree 환경
    Steps:
      1. pnpm add @radix-ui/react-popover
      2. grep "react-popover" package.json
      3. pnpm typecheck
    Expected Result: package.json에 @radix-ui/react-popover 존재, typecheck 0 errors
    Failure Indicators: "ERR_PNPM_" 에러, 패키지 미발견
    Evidence: .sisyphus/evidence/task-2-popover-installed.txt
  ```

  **Commit**: YES
  - Message: `chore: add @radix-ui/react-popover`
  - Files: `package.json`, `pnpm-lock.yaml`
  - Pre-commit: `pnpm typecheck`

- [x] 3. Stage 기반 레코드 그룹핑 유틸리티 + 테스트

  **What to do**:
  - `app/lib/utils/stage-groups.ts` 생성
  - `groupRecordsByStage(records, stages)` 함수 구현:
    - records를 stageId별로 그룹핑
    - stages.order 기준 정렬
    - 각 Stage 그룹 내에서 createdAt 기준 정렬 (최신 먼저)
    - stageId가 null인 레코드는 "미분류" 그룹으로 (맨 아래)
    - 레코드 없는 Stage는 제외
    - 각 그룹 내에서 format("note"/"article")별 분리
  - 반환 타입:
    ```typescript
    type StageGroup = {
      stageId: string | null;
      stageName: string;
      stageType: string; // prelude, bridge, challenge, epilogue
      stageOrder: number;
      notes: Record[]; // format === "note"
      articles: Record[]; // format === "article"
      allRecords: Record[];
    }
    ```
  - `app/lib/utils/__tests__/stage-groups.test.ts` 작성:
    - 다수 Stage, 올바른 순서 검증
    - 빈 Stage 제외 검증
    - NULL stageId → "미분류" 그룹 검증
    - 단일 Stage 시나리오
    - notes/articles 분리 검증
    - 빈 입력 (0 records) 검증

  **Must NOT do**:
  - `date-groups.ts` 수정 (기존 유틸리티 보존)
  - DB 쿼리 포함 (순수 함수로)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 유틸리티 함수 + 테스트 작성, 중간 복잡도
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T2, T4)
  - **Blocks**: T8, T9
  - **Blocked By**: T1

  **References**:
  - **Pattern References**:
    - `app/lib/utils/date-groups.ts` — 기존 그룹핑 패턴 (DateGroup 타입, 정렬 로직). 이 파일의 구조를 참고하되 수정하지 말 것
    - `app/db/schema.server.ts:98-122` — records 테이블 스키마 (format, stageId, createdAt 필드 정의)
    - `app/db/schema.server.ts:50-70` — stages 테이블 스키마 (order, type, name 필드)
  - **Test References**:
    - `app/lib/utils/__tests__/` — 기존 테스트 파일 구조 참고
    - `vitest.config.ts` — 테스트 설정 확인
  - **API/Type References**:
    - `app/db/schema.server.ts` — `stages.type` 값: "prelude" | "challenge" | "bridge" | "epilogue"
    - `app/db/schema.server.ts` — `records.format` 값: "note" | "article"

  **Acceptance Criteria**:
  - [ ] `pnpm test -- stage-groups` → PASS (6+ tests, 0 failures)
  - [ ] `pnpm typecheck` 통과

  **QA Scenarios**:

  ```
  Scenario: Stage 그룹핑 정상 동작
    Tool: Bash
    Preconditions: stage-groups.ts 및 테스트 파일 생성됨
    Steps:
      1. pnpm test -- stage-groups --reporter=verbose
      2. 출력에서 "✓" 개수 확인 (6개 이상)
      3. 출력에서 "✗" 또는 "FAIL" 없음 확인
    Expected Result: 6+ tests passed, 0 failed
    Failure Indicators: "FAIL", "AssertionError", test count < 6
    Evidence: .sisyphus/evidence/task-3-stage-groups-tests.txt

  Scenario: NULL stageId 처리 검증
    Tool: Bash
    Preconditions: 테스트에 null stageId 케이스 포함
    Steps:
      1. pnpm test -- stage-groups -t "null" --reporter=verbose
    Expected Result: null stageId 관련 테스트 통과, "미분류" 그룹 생성 확인
    Failure Indicators: "미분류" 미포함, null 처리 에러
    Evidence: .sisyphus/evidence/task-3-null-stage-test.txt
  ```

  **Commit**: YES
  - Message: `feat(utils): Stage 기반 레코드 그룹핑 유틸리티`
  - Files: `app/lib/utils/stage-groups.ts`, `app/lib/utils/__tests__/stage-groups.test.ts`
  - Pre-commit: `pnpm test -- stage-groups`

- [x] 5. Radix Popover UI 래퍼 컴포넌트

  **What to do**:
  - `app/components/ui/popover.tsx` 생성
  - shadcn/ui 패턴 따라 Radix Popover 래핑:
    - `Popover` (Root)
    - `PopoverTrigger`
    - `PopoverContent` — Quiet Depth 스타일 (surface bg, border, radius-xl, shadow-tinted-sm)
    - `PopoverArrow` (선택)
  - 포탈 렌더링으로 z-index 충돌 방지
  - Quiet Depth 토큰 사용 (하드코딩 색상 금지)

  **Must NOT do**:
  - CSS `position: fixed` 직접 사용 (Radix 포탈 사용)
  - 기존 Radix 래퍼 수정 (dialog.tsx 등)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 기존 shadcn/ui 패턴 복제, 간단한 래핑
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T2, T3, T4 — T2 완료 후)
  - **Blocks**: T10
  - **Blocked By**: T2

  **References**:
  - **Pattern References**:
    - `app/components/ui/dialog.tsx` — 기존 Radix 래퍼 패턴 (forwardRef, cn(), Quiet Depth 스타일링)
    - `app/components/ui/select.tsx` — 또 다른 Radix 래퍼 패턴
    - `app/styles/global.css` — 디자인 토큰 (radius, shadow, colors)
  - **External References**:
    - https://www.radix-ui.com/primitives/docs/components/popover — API 레퍼런스

  **Acceptance Criteria**:
  - [ ] `app/components/ui/popover.tsx` 존재
  - [ ] `Popover`, `PopoverTrigger`, `PopoverContent` export 확인
  - [ ] `pnpm typecheck` 통과

  **QA Scenarios**:

  ```
  Scenario: Popover 컴포넌트 타입 체크
    Tool: Bash
    Preconditions: popover.tsx 생성됨
    Steps:
      1. pnpm typecheck
      2. grep -c "export" app/components/ui/popover.tsx
    Expected Result: typecheck 통과, export 3개 이상 (Popover, PopoverTrigger, PopoverContent)
    Failure Indicators: 타입 에러, export 누락
    Evidence: .sisyphus/evidence/task-5-popover-component.txt
  ```

  **Commit**: YES
  - Message: `feat(ui): Radix Popover 래퍼 컴포넌트`
  - Files: `app/components/ui/popover.tsx`
  - Pre-commit: `pnpm typecheck`

- [x] 6. CompactTimelineCard 컴포넌트

  **What to do**:
  - `app/components/cards/CompactTimelineCard.tsx` 생성
  - 밀도 높은 카드 디자인:
    - 제목 (text-sm font-semibold, 1줄 truncate)
    - 날짜 (text-caption text-tertiary, 상대 시간: "3일 전")
    - 미리보기 (text-sm text-secondary, 1-2줄 line-clamp-2)
    - format 뱃지 (노트/글 구분 — 작은 chip)
  - 카드 스타일: 
    - `px-3 py-2.5` (SceneCard보다 작은 패딩)
    - `rounded-lg` (SceneCard의 rounded-xl보다 작은 radius)
    - `border border-subtle` (Quiet Depth 톤)
    - hover: `bg-surface-secondary` 미세한 변화
  - `Link`로 래핑 → `/logs/:slug`
  - Stage 톤 좌측 액센트 바 (3px width, stage tone color)
  - `cn()` 유틸리티 사용
  - `motion` 래퍼 사용 (framer-motion 직접 import 금지)

  **Must NOT do**:
  - SceneCard.tsx 수정
  - framer-motion 직접 import
  - 하드코딩 색상 사용

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: UI 컴포넌트 디자인 + Quiet Depth 스타일링
  - **Skills**: [`frontend-design`]
    - `frontend-design`: 카드 UI 디자인 품질

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T7, T8)
  - **Blocks**: T9, T10
  - **Blocked By**: T1

  **References**:
  - **Pattern References**:
    - `app/components/cards/SceneCard.tsx` — 기존 카드 패턴 (stageToneClasses L45-50, Link 래핑, cn() 사용, motion.div 래퍼)
    - `app/components/cards/SceneCard.tsx:45-50` — Stage 톤 매핑 객체 (prelude→mist-blue, bridge→reef-cyan 등). 이 매핑을 공유 유틸로 추출하거나 동일 매핑 사용
    - `app/components/views/TimelineView.tsx:50-70` — 기존 타임라인 카드 스타일 (rounded-xl, border, px-4 py-3). 이보다 작은 패딩으로 컴팩트하게
  - **API/Type References**:
    - `app/db/schema.server.ts:98-122` — Record 타입 (title, content, format, createdAt, slug)
  - **External References**:
    - `.docs/design.md:240-276` — 카드 시스템 가이드라인 (radius, shadow, padding)
    - `.docs/design.md:128-158` — 간격 시스템 (4px 배수)

  **Acceptance Criteria**:
  - [ ] `app/components/cards/CompactTimelineCard.tsx` 존재
  - [ ] SceneCard보다 작은 padding (px-3 py-2.5 또는 유사)
  - [ ] Stage 톤 좌측 액센트 바 표시
  - [ ] format 뱃지 (노트/글) 표시
  - [ ] `pnpm typecheck` 통과

  **QA Scenarios**:

  ```
  Scenario: CompactTimelineCard 렌더링 확인
    Tool: Playwright
    Preconditions: 카드 컴포넌트 생성됨, 타임라인 뷰에서 사용
    Steps:
      1. /logs?view=timeline 페이지 로드
      2. [data-testid="compact-timeline-card"] 또는 카드 엘리먼트 존재 확인
      3. 카드 내 제목, 날짜, 미리보기 텍스트 존재 확인
      4. format 뱃지 ("노트" 또는 "글") 존재 확인
    Expected Result: 카드가 제목, 날짜, 미리보기, format 뱃지를 포함하여 렌더링
    Failure Indicators: 카드 미렌더링, 필드 누락
    Evidence: .sisyphus/evidence/task-6-compact-card.png
  ```

  **Commit**: YES
  - Message: `feat(ui): CompactTimelineCard 컴포넌트`
  - Files: `app/components/cards/CompactTimelineCard.tsx`
  - Pre-commit: `pnpm typecheck`

- [x] 7. ViewToggle 3-way 확장 (캘린더 추가)

  **What to do**:
  - `app/components/views/ViewToggle.tsx` 수정
  - `RecordView` 타입 확장: `"grid" | "timeline"` → `"grid" | "timeline" | "calendar"`
  - 캘린더 아이콘 추가 (SVG — 달력 형태, stroke 기반)
  - 3버튼 세그먼트 컨트롤 유지
  - 기존 grid/timeline 동작 보존
  - `lsp_find_references`로 RecordView 사용처 확인 후 수정

  **Must NOT do**:
  - 기존 grid/timeline 아이콘 변경
  - 컴포넌트 구조 변경 (세그먼트 컨트롤 유지)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 기존 컴포넌트에 아이콘 1개 추가
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T6, T8)
  - **Blocks**: T11
  - **Blocked By**: T1

  **References**:
  - **Pattern References**:
    - `app/components/views/ViewToggle.tsx` — 전체 파일. 기존 2버튼 세그먼트 구조, 아이콘 SVG 패턴, active state 스타일링. 여기에 3번째 버튼 추가
    - `app/components/views/ViewToggle.tsx:1-5` — RecordView 타입 정의. 이 타입을 확장
  - **API/Type References**:
    - RecordView 타입 사용처 확인 필요 (`lsp_find_references` 활용)

  **Acceptance Criteria**:
  - [ ] ViewToggle에 3개 버튼 (그리드/타임라인/캘린더)
  - [ ] `RecordView` 타입에 `"calendar"` 포함
  - [ ] 캘린더 아이콘 SVG stroke 기반
  - [ ] `pnpm typecheck` 통과 (모든 RecordView 사용처 호환)

  **QA Scenarios**:

  ```
  Scenario: ViewToggle 3-way 확인
    Tool: Playwright
    Preconditions: ViewToggle 수정됨
    Steps:
      1. /logs 페이지 로드
      2. ViewToggle 영역 내 버튼 3개 존재 확인
      3. 캘린더 버튼 클릭
      4. URL params에 ?view=calendar 확인
      5. 다시 그리드 버튼 클릭 → ?view=grid 확인
    Expected Result: 3개 뷰 전환 정상, URL params 갱신
    Failure Indicators: 버튼 2개만 존재, URL 미갱신
    Evidence: .sisyphus/evidence/task-7-view-toggle-3way.png
  ```

  **Commit**: YES
  - Message: `feat(ui): ViewToggle 3-way 확장 (캘린더 추가)`
  - Files: `app/components/views/ViewToggle.tsx`
  - Pre-commit: `pnpm typecheck`

- [x] 8. SortBar 기간순 옵션 + 로더 확장

  **What to do**:
  - `/logs` 로더에서 `sort=stage` 파라미터 처리 추가:
    - `ORDER BY stages."order" ASC, records.created_at DESC`
    - stages JOIN 이미 존재 — 정렬 조건만 추가
  - SortBar에 "기간순" 옵션 추가:
    - 기존: "최근 기록" (recent), "오래된 기록" (oldest)
    - 추가: "기간순" (stage) — Stage order 기준 정렬
  - 타임라인/캘린더 뷰에서 데이터 로딩 확장:
    - `view=timeline` 또는 `view=calendar` 시 페이지네이션 대신 전체 로드 (상한 200개)
    - `view=calendar` 시 `month` 파라미터 지원 (YYYY-MM, 기본값: 현재 월)
  - `getRecords()` 쿼리에 `sort=stage` 옵션 추가
  - 기존 `recent`/`oldest` 동작 보존

  **Must NOT do**:
  - 기존 recent/oldest 정렬 동작 변경
  - 무한 스크롤 추가
  - N+1 쿼리 발생

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 로더 로직 변경 + 쿼리 확장, 중간 복잡도
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T6, T7)
  - **Blocks**: T11
  - **Blocked By**: T3

  **References**:
  - **Pattern References**:
    - `app/routes/public/logs/index.tsx:22-126` — 현재 로더 (필터링, 정렬, 페이지네이션 로직). 여기에 sort=stage와 view 기반 페이지네이션 분기 추가
    - `app/db/queries/records/records.server.ts` — getRecords 함수 (현재 정렬 조건, WHERE 절, JOIN 패턴). ORDER BY 분기 추가
    - `app/components/filters/SortBar.tsx` — SortBar 컴포넌트 (options prop으로 옵션 전달 패턴). 새 옵션 추가 가능한 구조 확인
  - **API/Type References**:
    - `app/db/schema.server.ts:50-70` — stages.order 필드 (integer, 정렬 키)

  **Acceptance Criteria**:
  - [ ] `/logs?sort=stage` → Stage order 기준 정렬된 결과
  - [ ] SortBar에 "기간순" 옵션 표시
  - [ ] `/logs?view=timeline` → 페이지네이션 없이 전체 로드 (≤200)
  - [ ] `/logs?view=calendar&month=2026-03` → 해당 월 레코드
  - [ ] 기존 `sort=recent`, `sort=oldest` 동작 유지
  - [ ] `pnpm typecheck` 통과

  **QA Scenarios**:

  ```
  Scenario: 기간순 정렬 확인
    Tool: Playwright
    Preconditions: 로더 및 SortBar 수정됨, seed data 존재
    Steps:
      1. /logs?sort=stage 페이지 로드
      2. SortBar에서 "기간순" 선택됨 확인
      3. 첫 번째 레코드의 Stage → 마지막 레코드의 Stage 순서 확인
      4. Stage order가 오름차순인지 검증
    Expected Result: 레코드가 Stage order 순 정렬, 같은 Stage 내에서는 최신순
    Failure Indicators: 정렬 순서 불일치, Stage 순서 역전
    Evidence: .sisyphus/evidence/task-8-stage-sort.png

  Scenario: 타임라인 뷰 전체 로드 확인
    Tool: Playwright
    Preconditions: view=timeline 파라미터 지원
    Steps:
      1. /logs?view=timeline 페이지 로드
      2. 페이지네이션 컨트롤 미표시 확인
      3. 표시된 레코드 수 > 20 가능 확인 (seed data에 따라)
    Expected Result: 페이지네이션 없이 전체 레코드 표시 (상한 200)
    Failure Indicators: 페이지네이션 표시, 20개 제한
    Evidence: .sisyphus/evidence/task-8-timeline-no-pagination.png
  ```

  **Commit**: YES
  - Message: `feat(logs): 기간순 정렬 옵션 + 로더 확장`
  - Files: `app/routes/public/logs/index.tsx`, `app/db/queries/records/records.server.ts`
  - Pre-commit: `pnpm typecheck`

- [x] 4. 캘린더 날짜 유틸리티 + 테스트

  **What to do**:
  - `app/lib/utils/calendar.ts` 생성
  - `getCalendarDays(year, month)` — 해당 월의 캘린더 그리드 날짜 배열 (일요일 시작, 전후월 포함)
  - `getRecordsForMonth(records, year, month)` — 해당 월의 레코드를 날짜별로 매핑
    ```typescript
    type CalendarDay = {
      date: Date;
      day: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      records: Record[];
    }
    ```
  - `formatMonthLabel(year, month)` — "2026년 3월" 형식
  - Unix epoch(seconds) → 로컬 Date 변환 처리
  - `app/lib/utils/__tests__/calendar.test.ts` 작성:
    - 28/29/30/31일 월 처리
    - 일요일 시작 그리드 패딩
    - 레코드-날짜 매핑 정확성
    - 빈 월 (레코드 0개) 처리
    - 월 경계 (1일, 말일) 레코드 배치

  **Must NOT do**:
  - 외부 날짜 라이브러리 추가 (네이티브 Date API 사용)
  - 타임존 하드코딩 (사용자 로컬 타임존 존중)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 날짜 계산 로직 + 테스트, 엣지 케이스 주의 필요
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T2, T3)
  - **Blocks**: T10
  - **Blocked By**: T1

  **References**:
  - **Pattern References**:
    - `app/lib/utils/date-groups.ts` — 기존 날짜 유틸리티 패턴 (Date 생성, 비교 로직)
    - `app/lib/utils/date-groups.ts:5-15` — Unix epoch(seconds) → Date 변환 패턴
  - **Test References**:
    - `app/lib/utils/__tests__/` — 기존 테스트 구조

  **Acceptance Criteria**:
  - [ ] `pnpm test -- calendar` → PASS (6+ tests, 0 failures)
  - [ ] `pnpm typecheck` 통과

  **QA Scenarios**:

  ```
  Scenario: 캘린더 유틸리티 정상 동작
    Tool: Bash
    Preconditions: calendar.ts 및 테스트 파일 생성됨
    Steps:
      1. pnpm test -- calendar --reporter=verbose
      2. 출력에서 "✓" 개수 확인 (6개 이상)
    Expected Result: 6+ tests passed, 0 failed
    Failure Indicators: "FAIL", "AssertionError"
    Evidence: .sisyphus/evidence/task-4-calendar-tests.txt

  Scenario: 2월 윤년 처리
    Tool: Bash
    Preconditions: 테스트에 윤년 케이스 포함
    Steps:
      1. pnpm test -- calendar -t "윤년\|leap\|february\|29" --reporter=verbose
    Expected Result: 2월 28일/29일 정확히 처리
    Failure Indicators: 날짜 수 불일치
    Evidence: .sisyphus/evidence/task-4-leap-year-test.txt
  ```

  **Commit**: YES
  - Message: `feat(utils): 캘린더 날짜 유틸리티`
  - Files: `app/lib/utils/calendar.ts`, `app/lib/utils/__tests__/calendar.test.ts`
  - Pre-commit: `pnpm test -- calendar`

- [x] 9. TimelineView Stage 기반 좌우 분리 리디자인

  **What to do**:
  - `app/components/views/TimelineView.tsx` 완전 리디자인
  - 구조:
    ```
    [Stage 헤더 (Stage 이름 + 기간 + Stage 톤 색상)]
    ────────────────────────────────────────────────
    노트 카드    │ 세로선 │    글(Article) 카드
    노트 카드    │   │    │    글(Article) 카드  
    노트 카드    │   ●    │    
                 │   │    │    글(Article) 카드
    ────────────────────────────────────────────────
    [다음 Stage 헤더]
    ...
    [미분류 섹션 (stageId === null)]
    ```
  - Stage 헤더:
    - Stage 이름 (font-semibold)
    - Stage 기간 ("2026.02 ~ 2026.04" 형식)
    - 좌측 Stage 톤 컬러 바 (4px, stageToneClasses 사용)
    - 배경: surface-secondary
  - 가운데 세로선:
    - 2px width, gradient: ocean-blue/30 → border → transparent
    - 레코드 위치에 dot marker (6px circle, stage tone color)
  - 좌측 (Notes):
    - format === "note" 레코드만
    - CompactTimelineCard 사용
    - 우측 정렬 (text-right 느낌으로 세로선 쪽으로)
  - 우측 (Articles):
    - format === "article" 레코드만
    - CompactTimelineCard 사용
    - 좌측 정렬
  - 시간 기반 인터리빙:
    - 좌우 카드를 createdAt 기준으로 시간순 배치
    - 같은 시간대의 노트와 글은 같은 높이에 (가능한 범위 내)
  - "미분류" 섹션 (stageId === null):
    - 헤더: "미분류" (text-tertiary)
    - 맨 아래에 표시
  - `groupRecordsByStage()` 유틸리티 사용
  - 모바일 (md 이하):
    - 가운데 세로선 좌측으로 이동 (좌측 가장자리)
    - 좌우 분리 해제 → 단일 컬럼
    - format 뱃지로 노트/글 구분 (CompactTimelineCard에 이미 포함)
  - 빈 상태: EmptyState 컴포넌트 사용

  **Must NOT do**:
  - `groupRecordsByDate()` 함수 사용 또는 수정
  - SceneCard 사용 (CompactTimelineCard만)
  - 기록 없는 Stage 표시
  - Stage 진행률/퍼센트 표시
  - 화려한 애니메이션 (fade-up만 허용)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: 복잡한 레이아웃 + Quiet Depth 스타일링 + 반응형
  - **Skills**: [`frontend-design`]
    - `frontend-design`: 타임라인 레이아웃 디자인 품질

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (with T10)
  - **Blocks**: T11
  - **Blocked By**: T3, T6

  **References**:
  - **Pattern References**:
    - `app/components/views/TimelineView.tsx` — 현재 파일 구조 (props, import 패턴, motion 사용). 이 파일을 완전 리디자인하되 export 시그니처는 유지
    - `app/components/views/TimelineView.tsx:30-50` — 기존 세로선 스타일 (gradient, dot marker). 이 패턴을 확장하여 좌우 분리 구현
    - `app/components/cards/SceneCard.tsx:45-50` — stageToneClasses 매핑. Stage 헤더 톤 컬러에 사용
    - `app/components/cards/CompactTimelineCard.tsx` — T6에서 만든 컴팩트 카드 사용
  - **API/Type References**:
    - `app/lib/utils/stage-groups.ts` — T3에서 만든 groupRecordsByStage() 반환 타입 (StageGroup[])
  - **External References**:
    - `.docs/design.md:331-353` — Journey Strip/Timeline 가이드라인 (현재 Stage 강조, 과거 채도 낮게)
    - `.docs/design.md:240-276` — 카드 시스템 (깊이감 순서: 톤 → border → spacing)

  **Acceptance Criteria**:
  - [ ] Stage 헤더가 stage order 순서로 표시
  - [ ] 노트 좌측, 글 우측 분리
  - [ ] 가운데 세로선 + dot marker 표시
  - [ ] NULL stageId → "미분류" 섹션 맨 아래
  - [ ] 모바일 (< md) → 단일 컬럼 레이아웃
  - [ ] 빈 상태 처리
  - [ ] `pnpm typecheck` 통과

  **QA Scenarios**:

  ```
  Scenario: Stage 기반 좌우 분리 타임라인
    Tool: Playwright
    Preconditions: seed data 로드됨, TimelineView 리디자인됨
    Steps:
      1. /logs?view=timeline 페이지 로드 (desktop viewport 1280px)
      2. Stage 헤더 섹션 존재 확인 (Stage 이름 텍스트)
      3. 가운데 세로선 (div with border or bg gradient) 존재 확인
      4. 좌측 영역에 "노트" format 카드 존재 확인
      5. 우측 영역에 "글" format 카드 존재 확인
      6. Stage 순서가 order 오름차순인지 확인 (첫 Stage 이름 → 마지막 Stage 이름 비교)
    Expected Result: 좌우 분리 타임라인 렌더, Stage order 순서, 노트 좌측/글 우측
    Failure Indicators: 좌우 분리 미동작, Stage 순서 역전, 단일 컬럼
    Evidence: .sisyphus/evidence/task-9-timeline-desktop.png

  Scenario: 모바일 폴백 단일 컬럼
    Tool: Playwright
    Preconditions: 동일
    Steps:
      1. viewport를 375x812 (iPhone SE)로 설정
      2. /logs?view=timeline 페이지 로드
      3. 좌우 분리 없이 단일 컬럼 확인
      4. format 뱃지로 노트/글 구분 가능 확인
    Expected Result: 단일 컬럼, format 뱃지 표시
    Failure Indicators: 좌우 분리 유지, overflow 발생
    Evidence: .sisyphus/evidence/task-9-timeline-mobile.png

  Scenario: 빈 상태 처리
    Tool: Playwright
    Preconditions: seed data에 존재하지 않는 Stage + type 조합 필터
    Steps:
      1. /logs?view=timeline&type=collaboration&rhythm=stage (seed data에 collaboration+stage rhythm 레코드 없음)
      2. 위 조합으로 결과 0건 확인
      3. EmptyState 컴포넌트 렌더 확인 (텍스트 "기록이 없습니다" 또는 유사 포함)
    Expected Result: EmptyState 컴포넌트 표시, Stage 섹션 미렌더
    Failure Indicators: 에러 페이지, Stage 섹션 렌더, 빈 화면(메시지 없음)
    Evidence: .sisyphus/evidence/task-9-timeline-empty.png
  ```

  **Commit**: YES
  - Message: `feat(logs): Stage 기반 좌우 분리 타임라인 뷰`
  - Files: `app/components/views/TimelineView.tsx`
  - Pre-commit: `pnpm typecheck`

- [x] 10. CalendarView 월간 그리드 + 팝오버

  **What to do**:
  - `app/components/views/CalendarView.tsx` 생성
  - 월간 캘린더 그리드:
    - 7열 (일~토) 헤더 (text-caption, text-tertiary)
    - 5-6행 날짜 셀
    - 현재 월의 날짜: surface bg, text-primary
    - 다른 월의 날짜: text-tertiary, opacity 낮게
    - 오늘: ocean-blue bg 원형 하이라이트
  - 날짜 셀 내 레코드 표시:
    - 작은 dot (6px) — format별 색상 분리:
      - 노트: reef-cyan dot
      - 글: ocean-blue dot
    - 3개 이상이면 "+N" 텍스트
    - 전체 셀 높이: 최소 80px (레코드 표시 공간)
  - 호버 팝오버 (Radix Popover 사용):
    - 트리거: 레코드 dot 호버
    - 내용: 제목 (font-semibold), 미리보기 3-4줄, format 뱃지, 작성자, 상대 시간
    - 스타일: surface bg, border, rounded-xl, shadow-tinted-sm, max-w-80
    - 클릭 시 `/logs/:slug`로 이동
  - 월 네비게이션:
    - 이전/다음 월 버튼 (← →)
    - 현재 월 라벨 ("2026년 3월")
    - URL param: `?month=2026-03`
    - 범위: 가장 오래된 레코드 ~ 현재 월
  - `getCalendarDays()`, `getRecordsForMonth()` 유틸리티 사용
  - 모바일 (md 이하):
    - 캘린더 그리드 유지하되 셀 높이 축소
    - 팝오버 대신 날짜 클릭 → 아래에 날짜별 레코드 목록 확장
  - 빈 상태: 레코드 없는 월은 빈 캘린더 + "이 달에 기록이 없습니다" 안내

  **Must NOT do**:
  - 외부 캘린더 라이브러리 추가
  - 드래그 스크롤
  - 주간 뷰 (월간만)
  - Tags 표시 (V1 제외)
  - CSS `position: fixed` (Radix 포탈 사용)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: 복잡한 그리드 레이아웃 + 팝오버 인터랙션 + 반응형
  - **Skills**: [`frontend-design`]
    - `frontend-design`: 캘린더 UI 디자인 품질

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with T9)
  - **Blocks**: T11
  - **Blocked By**: T4, T5, T6

  **References**:
  - **Pattern References**:
    - `app/components/views/TimelineView.tsx` — 뷰 컴포넌트 패턴 (props 구조, EmptyState 사용, motion 래퍼)
    - `app/components/cards/CompactTimelineCard.tsx` — 팝오버 내 카드 형태 참고
    - `app/components/ui/popover.tsx` — T5에서 만든 Radix Popover 래퍼
    - `app/components/cards/SceneCard.tsx:45-50` — stageToneClasses (dot 색상 참고)
  - **API/Type References**:
    - `app/lib/utils/calendar.ts` — T4에서 만든 CalendarDay 타입, getCalendarDays(), getRecordsForMonth()
  - **External References**:
    - `.docs/design.md:240-276` — 카드 시스템 (popover 스타일 참고)
    - `.docs/design.md:128-158` — 간격 시스템 (그리드 gap)

  **Acceptance Criteria**:
  - [ ] 7열 × 5-6행 월간 캘린더 그리드 렌더
  - [ ] 레코드 있는 날짜에 색상 dot 표시
  - [ ] dot 호버 시 팝오버 (제목 + 미리보기 + format)
  - [ ] 월 네비게이션 (이전/다음 버튼)
  - [ ] `?month=YYYY-MM` URL param 지원
  - [ ] 오늘 날짜 하이라이트
  - [ ] 모바일 폴백
  - [ ] `pnpm typecheck` 통과

  **QA Scenarios**:

  ```
  Scenario: 캘린더 그리드 렌더링
    Tool: Playwright
    Preconditions: CalendarView 생성됨, seed data 존재
    Steps:
      1. /logs?view=calendar 페이지 로드
      2. 요일 헤더 7개 (일, 월, 화, 수, 목, 금, 토) 확인
      3. 날짜 셀 28-42개 확인 (전후월 포함)
      4. 현재 월 라벨 "2026년 3월" 확인
    Expected Result: 완전한 월간 캘린더 그리드, 현재 월 라벨
    Failure Indicators: 요일 헤더 누락, 셀 수 불일치, 월 라벨 누락
    Evidence: .sisyphus/evidence/task-10-calendar-grid.png

  Scenario: 레코드 dot + 호버 팝오버
    Tool: Playwright
    Preconditions: seed data에 레코드 있는 날짜 존재
    Steps:
      1. /logs?view=calendar 페이지 로드
      2. 레코드 있는 날짜 셀에 dot 존재 확인
      3. dot에 마우스 호버
      4. 팝오버 표시 확인 — 제목 텍스트 존재
      5. 팝오버 내 format 뱃지 ("노트" 또는 "글") 존재 확인
    Expected Result: dot 표시, 호버 시 팝오버 (제목 + format)
    Failure Indicators: dot 미표시, 팝오버 미표시, 내용 누락
    Evidence: .sisyphus/evidence/task-10-calendar-popover.png

  Scenario: 모바일 날짜 탭 → 확장 리스트
    Tool: Playwright
    Preconditions: CalendarView 생성됨, seed data 존재
    Steps:
      1. viewport를 375x812 (모바일)로 설정
      2. /logs?view=calendar 페이지 로드
      3. 레코드가 있는 날짜 셀 탭 (클릭)
      4. 캘린더 아래에 해당 날짜의 레코드 목록이 확장 표시되는지 확인
      5. 확장된 목록에서 레코드 제목 텍스트 존재 확인
      6. 다른 날짜 셀 탭 → 이전 확장 닫히고 새 날짜 레코드 표시
    Expected Result: 모바일에서 날짜 탭 시 아래에 레코드 목록 확장, 제목 표시
    Failure Indicators: 확장 미동작, 팝오버 표시(모바일에선 확장이어야 함), 목록 미표시
    Evidence: .sisyphus/evidence/task-10-calendar-mobile-expand.png

  Scenario: 월 네비게이션
    Tool: Playwright
    Preconditions: CalendarView에 네비게이션 버튼 존재
    Steps:
      1. /logs?view=calendar 페이지 로드 (현재 월)
      2. "이전" 버튼 클릭
      3. URL에 ?month=2026-02 확인
      4. 월 라벨이 "2026년 2월"로 변경 확인
      5. "다음" 버튼 2번 클릭 → 2026-03으로 복귀 확인
    Expected Result: 월 네비게이션 정상, URL param 갱신, 라벨 갱신
    Failure Indicators: URL 미갱신, 라벨 미변경, 네비게이션 미동작
    Evidence: .sisyphus/evidence/task-10-calendar-nav.png
  ```

  **Commit**: YES
  - Message: `feat(logs): 월간 캘린더 뷰 + 팝오버`
  - Files: `app/components/views/CalendarView.tsx`
  - Pre-commit: `pnpm typecheck`

- [x] 11. 로그 페이지 통합 + 빌드 검증

  **What to do**:
  - `app/routes/public/logs/index.tsx` 최종 통합:
    - `view=calendar` 뷰 렌더링 분기 추가
    - CalendarView 임포트 + 조건부 렌더
    - `view=timeline` → 리디자인된 TimelineView (Stage 기반)
    - `view=grid` → 기존 그리드 뷰 (변경 없음)
    - 기본 뷰를 `timeline`으로 변경 (view param 없을 때)
    - 모든 필터(stage, format, type, rhythm)가 3개 뷰 모두에 적용되는지 확인
    - sort=stage가 타임라인/캘린더에서 동작 확인
  - 빌드 검증:
    - `pnpm typecheck` 통과
    - `pnpm test` 전체 통과
    - `pnpm build` 프로덕션 빌드 성공
  - 기존 URL 파라미터 하위 호환성 확인

  **Must NOT do**:
  - 기존 그리드 뷰 수정
  - 다른 라우트 수정
  - 새 URL 파라미터 추가 (view, sort, month 외)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: 여러 컴포넌트 통합, 엣지 케이스 확인, 빌드 검증
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4 (sequential)
  - **Blocks**: T12
  - **Blocked By**: T7, T8, T9, T10

  **References**:
  - **Pattern References**:
    - `app/routes/public/logs/index.tsx` — 현재 전체 파일 (332줄). 뷰 분기 로직, 필터 적용, 로더 구조. 여기에 CalendarView 렌더 분기 추가
    - `app/routes/public/logs/index.tsx:150-200` — 현재 뷰 전환 로직 (grid vs timeline). calendar 분기 추가
  - **API/Type References**:
    - `app/components/views/CalendarView.tsx` — T10에서 만든 캘린더 뷰 props
    - `app/components/views/TimelineView.tsx` — T9에서 리디자인한 타임라인 뷰 props
    - `app/components/views/ViewToggle.tsx` — T7에서 확장한 RecordView 타입

  **Acceptance Criteria**:
  - [ ] `/logs` (기본) → 타임라인 뷰 렌더 (기본 뷰 변경)
  - [ ] `/logs?view=grid` → 기존 그리드 뷰 (변경 없음)
  - [ ] `/logs?view=calendar` → 캘린더 뷰 렌더
  - [ ] 모든 필터 3개 뷰 모두 적용
  - [ ] `pnpm typecheck` 통과
  - [ ] `pnpm test` 전체 통과
  - [ ] `pnpm build` 성공

  **QA Scenarios**:

  ```
  Scenario: 3-way 뷰 통합 정상 동작
    Tool: Playwright
    Preconditions: 모든 컴포넌트 통합됨
    Steps:
      1. /logs 페이지 로드 → 타임라인 뷰 기본 확인
      2. ViewToggle에서 "그리드" 클릭 → 그리드 뷰 전환 확인
      3. ViewToggle에서 "캘린더" 클릭 → 캘린더 뷰 전환 확인
      4. ViewToggle에서 "타임라인" 클릭 → 타임라인 뷰 복귀 확인
    Expected Result: 3개 뷰 전환 정상, 각 뷰 렌더 정상
    Failure Indicators: 뷰 전환 실패, 렌더 에러
    Evidence: .sisyphus/evidence/task-11-view-integration.png

  Scenario: 필터 + 뷰 조합 테스트
    Tool: Playwright
    Preconditions: seed data 존재
    Steps:
      1. /logs?view=timeline&format=note 로드
      2. 타임라인에 노트만 표시 확인
      3. ViewToggle → 캘린더 전환
      4. /logs?view=calendar&format=note 상태 확인
      5. 캘린더에 노트만 표시 확인 (dot 또는 팝오버에서)
    Expected Result: 필터가 뷰 전환 시에도 유지, 각 뷰에서 적용
    Failure Indicators: 필터 초기화, 필터 미적용
    Evidence: .sisyphus/evidence/task-11-filter-view-combo.png

  Scenario: 빌드 검증
    Tool: Bash
    Preconditions: 모든 변경 완료
    Steps:
      1. pnpm typecheck
      2. pnpm test
      3. pnpm build
    Expected Result: 모두 성공 (exit code 0)
    Failure Indicators: 타입 에러, 테스트 실패, 빌드 에러
    Evidence: .sisyphus/evidence/task-11-build-verification.txt
  ```

  **Commit**: YES
  - Message: `feat(logs): 3-way 뷰 통합 + 기본 뷰 타임라인 변경`
  - Files: `app/routes/public/logs/index.tsx`
  - Pre-commit: `pnpm build`

- [x] 12. 전체 QA + 빈 상태 + 모바일 검증

  **What to do**:
  - 모든 뷰 × 모든 상태 조합 QA:
    - 타임라인: 정상, 빈 상태, 노트만, 글만, 모바일
    - 캘린더: 정상, 빈 월, 호버 팝오버, 월 네비게이션, 모바일
    - 그리드: 기존 동작 보존 확인
  - 엣지 케이스 검증:
    - NULL stageId 레코드 → "미분류" 섹션
    - 단일 레코드만 있는 경우
    - 모든 레코드가 노트인 경우 (우측 빈 타임라인)
    - 모든 레코드가 글인 경우 (좌측 빈 타임라인)
  - 모바일 (375px) 검증:
    - 타임라인 단일 컬럼
    - 캘린더 셀 축소 + 클릭 확장
    - 터치 타겟 44px 이상
  - 접근성 검증:
    - 키보드 네비게이션 (Tab으로 카드 이동)
    - 팝오버 키보드 접근 (Enter/Space)
    - focus ring 표시
    - 스크린리더 라벨

  **Must NOT do**:
  - 코드 수정 (QA 전용 태스크)
  - 새 기능 추가

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 포괄적 QA + Playwright 테스트
  - **Skills**: [`playwright`]
    - `playwright`: 브라우저 자동화 QA

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4 (after T11)
  - **Blocks**: F1-F4
  - **Blocked By**: T11

  **References**:
  - **Pattern References**: 모든 이전 태스크의 QA 시나리오 참고
  - **External References**:
    - `.docs/design.md` — 접근성 가이드라인 (16px+, 44px+, focus ring)

  **Acceptance Criteria**:
  - [ ] 12개+ QA 시나리오 모두 통과
  - [ ] 모든 evidence 스크린샷 `.sisyphus/evidence/` 저장
  - [ ] 모바일 375px에서 타임라인/캘린더 레이아웃 정상
  - [ ] 키보드 네비게이션 동작

  **QA Scenarios**:

  ```
  Scenario: NULL stageId "미분류" 섹션 검증
    Tool: Bash + Playwright
    Preconditions: seed data에 null stageId 레코드 없음 → 픽스처 생성 필요
    Steps:
      1. wrangler d1 execute DB --local --command="INSERT INTO records (id, slug, author_id, title, content, content_text, format, type, rhythm, visibility, response_preference, cohort, created_at, updated_at) VALUES ('rec-null-stage-test', 'null-stage-test-abc123', (SELECT user_id FROM learner_profiles LIMIT 1), '미분류 테스트 노트', '이 기록은 Stage가 지정되지 않았습니다.', '이 기록은 Stage가 지정되지 않았습니다.', 'note', 'personal', 'free', 'cohort', 'open', 'cohort-2026', unixepoch(), unixepoch());"
      2. /logs?view=timeline 페이지 로드
      3. 페이지 최하단에 "미분류" 섹션 헤더 존재 확인
      4. "미분류 테스트 노트" 카드가 "미분류" 섹션 내에 표시 확인
      5. 다른 Stage 섹션보다 아래에 위치 확인
    Expected Result: "미분류" 섹션이 맨 아래에 표시, null stageId 레코드 포함
    Failure Indicators: "미분류" 섹션 미표시, 레코드 누락, 에러
    Evidence: .sisyphus/evidence/task-12-null-stage-section.png

  Scenario: 타임라인 — 노트만 있는 Stage
    Tool: Playwright
    Preconditions: 특정 Stage에 노트만 있는 필터
    Steps:
      1. /logs?view=timeline&format=note 로드
      2. 좌측에만 카드 표시, 우측 빈 영역 확인
      3. 레이아웃 깨짐 없음 확인
    Expected Result: 좌측 노트만 표시, 우측 빈 상태 자연스러움
    Failure Indicators: 레이아웃 깨짐, 에러
    Evidence: .sisyphus/evidence/task-12-notes-only.png

  Scenario: 캘린더 — 빈 월
    Tool: Playwright
    Preconditions: 레코드 없는 과거 월 존재
    Steps:
      1. /logs?view=calendar 로드
      2. 월 네비게이션으로 레코드 없는 월 이동
      3. 빈 캘린더 + 안내 메시지 확인
    Expected Result: 빈 캘린더 그리드 + "이 달에 기록이 없습니다" 메시지
    Failure Indicators: 에러, 빈 페이지
    Evidence: .sisyphus/evidence/task-12-empty-month.png

  Scenario: 모바일 접근성
    Tool: Playwright
    Preconditions: viewport 375x812
    Steps:
      1. /logs?view=timeline 로드
      2. 카드 터치 타겟 크기 확인 (최소 44px 높이)
      3. /logs?view=calendar 전환
      4. 날짜 셀 터치 타겟 크기 확인
      5. Tab 키로 카드/셀 이동 확인
      6. focus ring 표시 확인
    Expected Result: 44px+ 터치 타겟, focus ring 표시, Tab 이동
    Failure Indicators: 터치 타겟 < 44px, focus ring 미표시
    Evidence: .sisyphus/evidence/task-12-mobile-a11y.png

  Scenario: 그리드 뷰 회귀 테스트
    Tool: Playwright
    Preconditions: 기존 그리드 뷰 코드 미수정 확인
    Steps:
      1. /logs?view=grid 로드
      2. SceneCard 그리드 렌더 확인 (3열 desktop)
      3. 필터 적용 (stage 선택) → 결과 갱신 확인
      4. 페이지네이션 동작 확인
      5. 정렬 변경 (오래된 기록) → 순서 변경 확인
    Expected Result: 기존 그리드 뷰 완전 동일 동작
    Failure Indicators: SceneCard 미렌더, 필터/정렬/페이지네이션 고장
    Evidence: .sisyphus/evidence/task-12-grid-regression.png
  ```

  **Commit**: NO (QA 전용)

---

## Final Verification Wave

> 4 review agents run in PARALLEL. ALL must APPROVE. Rejection → fix → re-run.

- [x] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, curl endpoint, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [x] F2. **Code Quality Review** — `unspecified-high`
  Run `pnpm typecheck` + `pnpm test` + `pnpm build`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names. Verify Quiet Depth token usage (no hardcoded colors). Verify `cn()` for class merging.
  Output: `Build [PASS/FAIL] | Typecheck [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [x] F3. **Real Manual QA** — `unspecified-high` (+ `playwright` skill)
  Start from clean state. Execute EVERY QA scenario from EVERY task — follow exact steps, capture evidence. Test cross-view integration (filter + sort + view toggle). Test edge cases: empty state, single record, all notes (no articles), all articles (no notes), null stageId. Save to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [x] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff (git log/diff). Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT do" compliance. Detect cross-task contamination. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

| # | Message | Files | Pre-commit |
|---|---------|-------|------------|
| 1 | `chore: add @radix-ui/react-popover` | package.json, pnpm-lock.yaml | `pnpm typecheck` |
| 2 | `feat(utils): Stage 기반 레코드 그룹핑 유틸리티` | stage-groups.ts, stage-groups.test.ts | `pnpm test -- stage-groups` |
| 3 | `feat(utils): 캘린더 날짜 유틸리티` | calendar.ts, calendar.test.ts | `pnpm test -- calendar` |
| 4 | `feat(ui): Radix Popover 래퍼 컴포넌트` | popover.tsx | `pnpm typecheck` |
| 5 | `feat(ui): ViewToggle 3-way 확장 (캘린더 추가)` | ViewToggle.tsx | `pnpm typecheck` |
| 6 | `feat(ui): CompactTimelineCard 컴포넌트` | CompactTimelineCard.tsx | `pnpm typecheck` |
| 7 | `feat(logs): 기간순 정렬 옵션 + 로더 확장` | index.tsx, SortBar usage | `pnpm typecheck` |
| 8 | `feat(logs): Stage 기반 좌우 분리 타임라인 뷰` | TimelineView.tsx | `pnpm typecheck` |
| 9 | `feat(logs): 월간 캘린더 뷰 + 팝오버` | CalendarView.tsx | `pnpm typecheck` |
| 10 | `feat(logs): 3-way 뷰 통합 + 빌드 검증` | index.tsx | `pnpm build` |

---

## Success Criteria

### Verification Commands
```bash
pnpm typecheck          # Expected: no errors
pnpm test               # Expected: all tests pass (including new stage-groups, calendar tests)
pnpm build              # Expected: successful production build
```

### Final Checklist
- [ ] `/logs?view=timeline` → Stage 기반 좌우 분리 타임라인 렌더
- [ ] `/logs?view=calendar` → 월간 캘린더 렌더
- [ ] `/logs?view=grid` → 기존 그리드 뷰 동작 유지
- [ ] `/logs?sort=stage` → Stage order 정렬
- [ ] 모든 필터(stage, format, type, rhythm) 3개 뷰 모두 적용
- [ ] 빈 상태 3개 뷰 모두 처리
- [ ] 모바일 폴백 (타임라인 단일 컬럼, 캘린더 리스트)
- [ ] NULL stageId 레코드 "미분류" 처리
- [ ] 기존 URL 파라미터 호환
- [ ] All "Must NOT Have" absent
