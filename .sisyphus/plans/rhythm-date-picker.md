# 리듬별 날짜 입력 컴포넌트 분화

## TL;DR

> **Quick Summary**: 기록 리듬(7종)에 따라 날짜 입력 UI가 자동 변경되도록 컴포넌트 시스템을 만들고, Article 작성 폼과 편집 폼에 적용한다. 현재 독립적으로 동작하는 리듬 선택과 날짜 선택을 리듬이 날짜 UI를 결정하는 구조로 변경.
>
> **Deliverables**:
> - `RhythmDateInput` 오케스트레이터 컴포넌트 (리듬별 조건부 렌더링)
> - `WeekPicker` 컴포넌트 (월요일 시작, 주 단위 캘린더)
> - `MonthPicker` 컴포넌트 (연도 + 12개월 그리드)
> - `StageDatePicker` 컴포넌트 (날짜 범위 또는 Stage 드롭다운)
> - Article 작성 폼 통합 (기존 날짜 모드 UI 교체)
> - 편집 폼 통합 (스키마 확장 + 날짜 편집 지원)
>
> **Estimated Effort**: Medium
> **Parallel Execution**: YES — 3 waves
> **Critical Path**: WeekPicker/MonthPicker/StageDatePicker → RhythmDateInput → Article 폼 통합 → 스키마 확장 → Edit 폼 통합

---

## Context

### Original Request
리듬별로 날짜 입력 UI를 분화. 자유/스프린트/회고는 선택적 단일 날짜, 순간은 날짜 없음, 주간은 주 단위 캘린더, 월간은 월 그리드, 구간은 날짜 범위 또는 여정 선택. fit한 컴포넌트를 만들어 유려하게 적용.

### Interview Summary
**Key Discussions**:
- 적용 범위: Article 작성 폼 + 편집 폼 (Note 폼 제외)
- 주간 시작일: 월요일 (한국 기준)
- 월간 선택: 달력형 12개월 그리드
- 구간 여정 선택: Stage 드롭다운

**Research Findings**:
- 현재 Article 폼: 리듬 7개 버튼 + 날짜 3모드(없음/단일/범위)가 **독립적**으로 동작
- 편집 폼: 날짜 편집 UI가 **전혀 없음**, `updateRecord()`가 `Partial<CreateRecordInput>`을 받는데 `CreateRecordInput`에 `recordedAt`/`recordedEndAt` 필드가 없음
- 기존 Calendar: react-day-picker v9 래퍼, single/range 모드 지원. week/month 모드는 미지원
- DB: `recordedAt`(int nullable), `recordedEndAt`(int nullable), `stageId`(text nullable) — 스키마 변경 불필요

### Metis Review
**Identified Gaps** (addressed):
- 편집 폼 prerequisite: `createRecordSchema`에 date 필드 없어 `updateRecord()`로 날짜 전달 불가 → 스키마 확장 태스크 포함
- MonthPicker: react-day-picker가 월 선택 미지원 → 완전 커스텀 빌드
- Stage 피커 충돌: 기존 stageId 드롭다운과 rhythm="stage" 피커 → rhythm="stage"일 때 기존 stageId 드롭다운 숨기고 StageDatePicker가 stageId도 함께 관리
- 리듬 변경 시 상태 리셋: 모든 날짜 상태 초기화 (무조건 리셋, 기억 없음)

---

## Work Objectives

### Core Objective
리듬 선택이 날짜 입력 UI 형태를 결정하는 컴포넌트 시스템을 만들어 Article 작성/편집 폼에 적용한다.

### Concrete Deliverables
- `app/components/record/RhythmDateInput.tsx` — 오케스트레이터 컴포넌트
- `app/components/record/WeekPicker.tsx` — 주 단위 캘린더 피커
- `app/components/record/MonthPicker.tsx` — 12개월 그리드 피커
- `app/components/record/StageDatePicker.tsx` — 날짜 범위 + Stage 선택
- `app/routes/public/write/article.tsx` — 기존 날짜 UI 교체
- `app/routes/public/logs/$recordSlug.edit.tsx` — 날짜 편집 UI 추가
- `app/lib/auth/validation.ts` — `createRecordSchema`에 date 필드 추가

### Definition of Done
- [ ] 리듬 변경 시 해당 리듬에 맞는 날짜 UI만 표시됨
- [ ] Article 작성 폼에서 7종 리듬 모두 올바른 날짜 값으로 저장됨
- [ ] 편집 폼에서 기존 날짜가 로드되고 수정 가능함
- [ ] `tsc --noEmit` 통과
- [ ] 모바일 320px에서 모든 피커 사용 가능

### Must Have
- 리듬별 날짜 입력 UI 매핑 (7종 모두)
- 주간 피커: 월요일 시작 주 단위 선택
- 월간 피커: 연도 + 12개월 그리드
- 구간 피커: 날짜 범위와 Stage 드롭다운 토글
- 리듬 변경 시 날짜 상태 완전 초기화
- Hidden input으로 `recordedAt`/`recordedEndAt`/`stageId` 출력
- 한국어 로케일 (date-fns `ko`)
- 접근성: 키보드 내비게이션, focus ring, aria 라벨

### Must NOT Have (Guardrails)
- DB 스키마 변경 (마이그레이션 없음) — 기존 nullable 필드로 충분
- 새로운 npm 의존성 추가 — react-day-picker v9 + date-fns v4만 사용
- Note 폼 변경 — Note는 현재 상태 유지
- 특정 리듬에 날짜 필수 검증 추가 — 모든 날짜 필드는 optional 유지
- article.tsx의 inline DB insert를 createRecord()로 리팩토링 — 별도 관심사
- 리듬 변환 간 애니메이션/트랜지션 — Quiet Depth 원칙에 따라 단순 교체
- 시간(hours/minutes) 선택 — 날짜만
- `as any`, `@ts-ignore`, `@ts-expect-error`

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: YES (pnpm test 존재)
- **Automated tests**: None (컴포넌트 단위 테스트 인프라가 없으므로 agent QA로 대체)
- **Framework**: N/A

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Frontend/UI**: Playwright — Navigate, interact, assert DOM, screenshot
- **Build**: Bash — `tsc --noEmit`, `pnpm build`

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — 4 parallel component builds):
├── Task 1: WeekPicker 컴포넌트 [visual-engineering]
├── Task 2: MonthPicker 컴포넌트 [visual-engineering]
├── Task 3: StageDatePicker 컴포넌트 [visual-engineering]
└── Task 4: createRecordSchema date 필드 확장 + updateRecord 수정 [quick]

Wave 2 (After Wave 1 — 통합):
├── Task 5: RhythmDateInput 오케스트레이터 + Article 작성 폼 통합 (depends: 1, 2, 3) [deep]
└── Task 6: Edit 폼 날짜 편집 통합 (depends: 4, 5) [unspecified-high]

Wave FINAL (After ALL — 4 parallel reviews):
├── F1: Plan compliance audit (oracle)
├── F2: Code quality review (unspecified-high)
├── F3: Real QA — 모든 리듬 시나리오 (unspecified-high + playwright)
└── F4: Scope fidelity check (deep)
-> Present results -> Get explicit user okay
```

### Dependency Matrix

| Task | Depends On | Blocks |
|------|-----------|--------|
| 1 (WeekPicker) | — | 5 |
| 2 (MonthPicker) | — | 5 |
| 3 (StageDatePicker) | — | 5 |
| 4 (Schema 확장) | — | 6 |
| 5 (RhythmDateInput + Article 통합) | 1, 2, 3 | 6 |
| 6 (Edit 폼 통합) | 4, 5 | FINAL |

### Agent Dispatch Summary

- **Wave 1**: **4** — T1 → `visual-engineering`, T2 → `visual-engineering`, T3 → `visual-engineering`, T4 → `quick`
- **Wave 2**: **2** — T5 → `deep`, T6 → `unspecified-high`
- **FINAL**: **4** — F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `deep`

---

## TODOs

- [ ] 1. WeekPicker 컴포넌트 — 월요일 시작 주 단위 캘린더

  **What to do**:
  - `app/components/record/WeekPicker.tsx` 생성
  - react-day-picker의 Calendar 컴포넌트를 기반으로 **주 단위 선택** 구현
  - 날짜를 클릭하면 해당 날짜가 속한 **전체 주**가 선택됨 (월~일 하이라이트)
  - `weekStartsOn: 1` (월요일 시작) 적용
  - 선택 시 콜백으로 `{ from: Date (월요일), to: Date (일요일) }` 반환
  - 선택된 주 표시: 해당 행 전체가 `bg-mist-blue` 배경, 월/일에 `bg-ocean-blue text-white` 뱃지
  - Popover 안에 Calendar를 넣는 구조 — 트리거 버튼에 "2025년 3월 3주차" 형태로 표시
  - 선택 안 된 상태: "주를 선택하세요" placeholder (text-text-tertiary)
  - `onWeekSelect: (range: { from: Date; to: Date } | undefined) => void` 콜백 prop
  - `selectedWeek?: { from: Date; to: Date }` prop으로 제어
  - date-fns의 `startOfWeek`, `endOfWeek`, `isSameWeek`, `getWeek` 사용
  - 한국어 로케일 (`ko`) 적용
  - 키보드: 방향키로 날짜 이동, Enter로 해당 주 선택
  - 모바일: Popover 대신 동일 구조, 터치 타겟 44px 이상

  **Must NOT do**:
  - react-day-picker 외 새 라이브러리 추가
  - 주 번호(ISO week number) UI 표시 — 자연어 "N주차" 만 사용
  - 복수 주 선택

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: UI 컴포넌트 빌드 — 캘린더 커스텀 렌더링, 스타일링, 인터랙션
  - **Skills**: [`frontend-design`]
    - `frontend-design`: Quiet Depth 디자인 토큰에 맞는 캘린더 스타일링

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3, 4)
  - **Blocks**: Task 5 (RhythmDateInput 통합)
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `app/components/ui/calendar.tsx:1-76` — 기존 Calendar 래퍼. DayPicker의 classNames 커스텀 패턴, ko 로케일 적용 방식, ocean-blue/mist-blue 색상 토큰 사용법 확인
  - `app/routes/public/write/article.tsx:395-420` — Popover + Calendar 조합 패턴. PopoverTrigger 안 Button, PopoverContent 안 Calendar 구조 그대로 따름

  **API/Type References**:
  - `app/routes/public/write/article.tsx:57` — `DateMode` 타입. 현재 "none"/"single"/"range" 패턴 참고하되, WeekPicker는 자체 타입 사용
  - `app/routes/public/write/article.tsx:67-72` — `parseDateToUnix()` 함수. 출력 포맷 `"yyyy-MM-dd"` 문자열을 이 함수가 Unix로 변환하는 흐름 이해

  **External References**:
  - react-day-picker v9 docs: `weekStartsOn` prop, `modifiers` API로 주 하이라이트 구현 — https://daypicker.dev/docs/customization
  - date-fns: `startOfWeek({ weekStartsOn: 1 })`, `endOfWeek`, `isSameWeek`, `getWeek` — https://date-fns.org/docs/startOfWeek

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 주 선택 — 날짜 클릭 시 전체 주 하이라이트
    Tool: Playwright
    Preconditions: dev server running, /write/article 페이지, rhythm="weekly" 선택됨
    Steps:
      1. WeekPicker 트리거 버튼 클릭 → Popover 열림
      2. 달력에서 수요일(예: 3월 12일) 클릭
      3. 해당 주 월~일(3/10~3/16) 전체가 하이라이트됨 확인
      4. 트리거 버튼 텍스트가 "2025년 3월 2주차" 형태로 업데이트
    Expected Result: 주 전체 하이라이트, 버튼 텍스트 업데이트
    Failure Indicators: 단일 날짜만 선택됨, 하이라이트가 주 전체가 아님
    Evidence: .sisyphus/evidence/task-1-week-select.png

  Scenario: 월요일 시작 확인
    Tool: Playwright
    Preconditions: WeekPicker Popover 열림
    Steps:
      1. 캘린더 헤더 요일 순서 확인
      2. 첫 번째 요일이 "월" 인지 확인
    Expected Result: 요일 순서 월/화/수/목/금/토/일
    Failure Indicators: 일요일이 첫 번째
    Evidence: .sisyphus/evidence/task-1-week-monday-start.png

  Scenario: 선택 초기 상태 — placeholder
    Tool: Playwright
    Preconditions: 리듬 "주간" 선택, 아직 주 미선택
    Steps:
      1. 트리거 버튼 텍스트 확인
    Expected Result: "주를 선택하세요" 텍스트, text-text-tertiary 색상
    Evidence: .sisyphus/evidence/task-1-week-placeholder.png
  ```

  **Commit**: YES (1)
  - Message: `feat(record): WeekPicker 컴포넌트 — 월요일 시작 주 단위 선택`
  - Files: `app/components/record/WeekPicker.tsx`
  - Pre-commit: `tsc --noEmit`

- [ ] 2. MonthPicker 컴포넌트 — 연도 + 12개월 그리드

  **What to do**:
  - `app/components/record/MonthPicker.tsx` 생성
  - react-day-picker 미사용 — **완전 커스텀** 12개월 그리드 빌드
  - 레이아웃: 상단에 연도 + 좌/우 화살표, 하단에 3×4 그리드 (1월~12월)
  - 각 월 셀: 크기 균일, 패딩 충분, 한국어 표기 ("1월", "2월", ... "12월")
  - 선택 시 `bg-ocean-blue text-white` 스타일, hover 시 `bg-surface-secondary`
  - 현재 월: `bg-surface-secondary font-semibold` 강조 (today와 동일)
  - Popover 안에 그리드를 넣는 구조 — 트리거 버튼에 "2025년 3월" 형태로 표시
  - 선택 안 된 상태: "월을 선택하세요" placeholder
  - `onMonthSelect: (month: { from: Date; to: Date } | undefined) => void` 콜백
    - `from`: 해당 월 1일, `to`: 해당 월 마지막 날
  - `selectedMonth?: { year: number; month: number }` prop
  - date-fns: `startOfMonth`, `endOfMonth`, `getDaysInMonth` 사용
  - 키보드: 방향키로 월 이동, Enter로 선택, 좌우 화살표로 연도 이동
  - 그리드는 `role="grid"`, 각 셀 `role="gridcell"` + `aria-label="2025년 3월"`
  - 모바일: 그리드 셀 터치 타겟 44px 이상

  **Must NOT do**:
  - react-day-picker 사용 시도 (월 선택 미지원)
  - 연도 직접 입력 필드
  - 월 범위 선택 (단일 월만)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: 완전 커스텀 UI 컴포넌트. 그리드 레이아웃, ARIA, 키보드 접근성 모두 필요
  - **Skills**: [`frontend-design`]
    - `frontend-design`: Quiet Depth 색상 토큰과 간격 시스템에 맞는 그리드 디자인

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3, 4)
  - **Blocks**: Task 5
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `app/components/ui/calendar.tsx:58-63` — ocean-blue/mist-blue selected 스타일 패턴. MonthPicker의 선택 스타일을 이와 일치시킴
  - `app/routes/public/write/article.tsx:398-420` — Popover + 트리거 버튼 패턴. 동일 구조 사용

  **API/Type References**:
  - `app/components/ui/button.tsx` — Button variant="outline" 스타일. 트리거 버튼에 사용
  - `app/components/ui/popover.tsx` — Popover/PopoverTrigger/PopoverContent. 기존 import 경로 확인

  **External References**:
  - date-fns: `startOfMonth`, `endOfMonth`, `getDaysInMonth`, `setMonth`, `setYear` — https://date-fns.org/docs/startOfMonth
  - ARIA grid pattern: https://www.w3.org/WAI/ARIA/apd/patterns/grid/

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 월 선택 — 그리드에서 월 클릭
    Tool: Playwright
    Preconditions: dev server, /write/article, rhythm="monthly"
    Steps:
      1. MonthPicker 트리거 버튼 클릭 → Popover 열림
      2. "3월" 셀 클릭
      3. "3월" 셀이 bg-ocean-blue text-white로 변경
      4. 트리거 버튼 텍스트가 "2025년 3월"으로 업데이트
      5. Popover 닫힘
    Expected Result: 월 선택 반영, 버튼 텍스트 업데이트
    Evidence: .sisyphus/evidence/task-2-month-select.png

  Scenario: 연도 이동 — 화살표 클릭
    Tool: Playwright
    Preconditions: MonthPicker Popover 열림, 현재 2025년
    Steps:
      1. 왼쪽 화살표 버튼 클릭
      2. 연도 표시가 "2024"로 변경
      3. 오른쪽 화살표 2번 클릭
      4. 연도 표시가 "2026"으로 변경
    Expected Result: 연도 정상 이동
    Evidence: .sisyphus/evidence/task-2-month-year-nav.png

  Scenario: 현재 월 강조
    Tool: Playwright
    Preconditions: MonthPicker Popover 열림
    Steps:
      1. 현재 월(예: 3월) 셀의 스타일 확인
      2. font-semibold + bg-surface-secondary 적용됨
    Expected Result: 현재 월이 시각적으로 구분됨
    Evidence: .sisyphus/evidence/task-2-month-today.png
  ```

  **Commit**: YES (2)
  - Message: `feat(record): MonthPicker 컴포넌트 — 12개월 그리드 선택`
  - Files: `app/components/record/MonthPicker.tsx`
  - Pre-commit: `tsc --noEmit`

- [ ] 3. StageDatePicker 컴포넌트 — 날짜 범위 또는 Stage 선택

  **What to do**:
  - `app/components/record/StageDatePicker.tsx` 생성
  - 상단에 **모드 토글**: "기간 선택" / "여정 선택" — 2개 탭/세그먼트 컨트롤
  - **기간 선택 모드**: 기존 Calendar `mode="range"` + `numberOfMonths={2}` (article.tsx의 기존 범위 선택과 동일)
    - Popover + 트리거 버튼에 "2025년 3월 1일 — 3월 31일" 표시
  - **여정 선택 모드**: Stage 드롭다운 (Select 컴포넌트)
    - `stages` prop으로 Stage 목록 전달
    - 선택 시 해당 Stage의 `stageId`를 출력
    - Stage에 `startDate`/`endDate`가 있으면 자동으로 `recordedAt`/`recordedEndAt`에도 반영
    - Stage에 날짜가 없으면 `stageId`만 설정, dates는 null
    - 선택된 Stage가 `isCurrent === true`이면 "(현재)" 표시
  - 출력 (콜백): `onSelect: (result: { recordedAt?: string; recordedEndAt?: string; stageId?: string }) => void`
  - 모드 전환 시 이전 선택 초기화
  - Props: `stages: Array<{ id: string; name: string; isCurrent: boolean; startDate?: number | null; endDate?: number | null }>`, `selectedValue?`, `onSelect`

  **Must NOT do**:
  - 기간+여정 동시 선택 허용 — 택1
  - Stage 생성/편집 UI
  - 복잡한 Stage 필터링

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: 2모드 토글 UI + Calendar range + Select 드롭다운 조합
  - **Skills**: [`frontend-design`]
    - `frontend-design`: 세그먼트 컨트롤 스타일링, Quiet Depth 톤 맞춤

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 4)
  - **Blocks**: Task 5
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `app/routes/public/write/article.tsx:424-465` — 기존 range Calendar 패턴. Popover + Calendar mode="range" + numberOfMonths={2} 구조 그대로 재사용
  - `app/routes/public/write/article.tsx:307-328` — 기존 Stage Select 드롭다운 패턴. SelectTrigger/SelectContent/SelectItem 구조, NO_STAGE_VALUE 패턴, isCurrent "(현재)" 표시 방식 따름
  - `app/routes/public/write/article.tsx:370-392` — 기존 모드 토글 버튼 그룹 패턴 (none/single/range). 동일한 chip-group 스타일 사용

  **API/Type References**:
  - `app/db/schema.server.ts` — stages 테이블의 `startDate`, `endDate` 필드 (nullable integer). Stage에 날짜가 있을 때만 dates 자동 설정
  - `app/components/ui/select.tsx` — Select/SelectTrigger/SelectContent/SelectItem import 경로

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 기간 선택 모드 — 날짜 범위 선택
    Tool: Playwright
    Preconditions: dev server, /write/article, rhythm="stage"
    Steps:
      1. StageDatePicker 렌더됨, 기본 모드 "기간 선택" 활성
      2. 트리거 버튼 클릭 → 2개월 Calendar Popover 열림
      3. 시작일(3/1) 클릭 → 종료일(3/31) 클릭
      4. 트리거 버튼에 "2025년 3월 1일 — 3월 31일" 표시
    Expected Result: 범위 선택 반영, hidden inputs에 recordedAt/recordedEndAt 설정
    Evidence: .sisyphus/evidence/task-3-stage-range.png

  Scenario: 여정 선택 모드 — Stage 드롭다운
    Tool: Playwright
    Preconditions: dev server, /write/article, rhythm="stage"
    Steps:
      1. "여정 선택" 탭 클릭 → Calendar 사라지고 Stage 드롭다운 나타남
      2. 드롭다운 열기 → Stage 목록 표시 (현재 Stage에 "(현재)" 뱃지)
      3. Stage 선택
    Expected Result: stageId hidden input에 선택된 Stage ID 설정
    Evidence: .sisyphus/evidence/task-3-stage-dropdown.png

  Scenario: 모드 전환 시 초기화
    Tool: Playwright
    Steps:
      1. "기간 선택" 모드에서 날짜 범위 선택 (3/1~3/31)
      2. "여정 선택" 탭 클릭
      3. 다시 "기간 선택" 탭 클릭
    Expected Result: 이전 날짜 범위 초기화, 빈 상태
    Evidence: .sisyphus/evidence/task-3-stage-mode-reset.png
  ```

  **Commit**: YES (3)
  - Message: `feat(record): StageDatePicker 컴포넌트 — 범위/Stage 선택`
  - Files: `app/components/record/StageDatePicker.tsx`
  - Pre-commit: `tsc --noEmit`

- [ ] 4. createRecordSchema에 recordedAt/recordedEndAt 추가 + updateRecord 수정

  **What to do**:
  - `app/lib/auth/validation.ts`의 `createRecordSchema`에 `recordedAt: z.string().optional()`, `recordedEndAt: z.string().optional()` 추가
  - 이로써 `CreateRecordInput` 타입에 date 필드가 자동 포함됨
  - `app/db/queries/records/records.server.ts`의 `updateRecord()` 함수 수정:
    - `data` 파라미터에서 `recordedAt`, `recordedEndAt` 추출
    - 문자열 → Unix 변환 후 DB update에 포함
    - `parseDateToUnix()` 유틸을 `app/lib/utils/date.ts`로 추출 (article.tsx에서 import 가능하도록)
  - `app/routes/public/logs/$recordSlug.edit.tsx`의 action에서 `recordedAt`/`recordedEndAt` formData 추출 + parsed.data에 포함하여 `updateRecord()`에 전달
  - **주의**: `lsp_find_references`로 `CreateRecordInput` 사용처 모두 확인 — 기존 호출이 깨지지 않는지 검증 (optional 필드 추가이므로 기존 코드 영향 없어야 함)

  **Must NOT do**:
  - DB 스키마/마이그레이션 변경
  - `createArticleSchema` 수정 (이미 recordedAt/recordedEndAt 있음)
  - date 필드를 required로 만들기

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 스키마 필드 추가 + 함수 수정 — 단순 코드 변경, 로직 복잡도 낮음
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3)
  - **Blocks**: Task 6 (Edit 폼 통합)
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `app/lib/auth/validation.ts:74-122` — `createArticleSchema` 패턴. recordedAt/recordedEndAt가 이미 optional string으로 정의됨. 동일 패턴을 `createRecordSchema`에 적용
  - `app/routes/public/write/article.tsx:116-134` — Article action에서 recordedAt/recordedEndAt formData 추출 + parseDateToUnix 호출 패턴

  **API/Type References**:
  - `app/lib/auth/validation.ts:3-47` — `createRecordSchema` 전체. line 47의 `CreateRecordInput` 타입이 자동 변경됨
  - `app/db/queries/records/records.server.ts:160-169` — `updateRecord()` 시그니처. `Partial<CreateRecordInput>` 파라미터

  **Tool Guidance**:
  - `lsp_find_references`로 `CreateRecordInput` 사용처 확인 — 파일: `app/lib/auth/validation.ts`, line 47, character 12
  - `lsp_find_references`로 `updateRecord` 사용처 확인

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 타입 체크 통과
    Tool: Bash
    Steps:
      1. tsc --noEmit 실행
    Expected Result: 에러 없음
    Evidence: .sisyphus/evidence/task-4-typecheck.txt

  Scenario: CreateRecordInput에 date 필드 포함 확인
    Tool: Bash (grep)
    Steps:
      1. grep "recordedAt" app/lib/auth/validation.ts
      2. createRecordSchema에 recordedAt, recordedEndAt 필드 존재 확인
    Expected Result: 두 필드 모두 optional string으로 정의됨
    Evidence: .sisyphus/evidence/task-4-schema-check.txt

  Scenario: 기존 코드 호환성 — createRecordSchema 사용처 미파손
    Tool: Bash
    Steps:
      1. tsc --noEmit 실행 후 createRecordSchema 관련 에러 없음
      2. grep으로 createRecordSchema 사용 파일 확인 — 모두 정상 작동
    Expected Result: 기존 호출 모두 호환 (optional 필드 추가이므로)
    Evidence: .sisyphus/evidence/task-4-compat.txt
  ```

  **Commit**: YES (4)
  - Message: `fix(validation): createRecordSchema에 recordedAt/recordedEndAt 추가`
  - Files: `app/lib/auth/validation.ts`, `app/db/queries/records/records.server.ts`, `app/lib/utils/date.ts`
  - Pre-commit: `tsc --noEmit`

- [ ] 5. RhythmDateInput 오케스트레이터 + Article 작성 폼 통합

  **What to do**:
  - `app/components/record/RhythmDateInput.tsx` 생성 — 리듬별 조건부 렌더링 컨테이너
  - Props:
    ```typescript
    interface RhythmDateInputProps {
      rhythm: string;
      stages?: Array<{ id: string; name: string; isCurrent: boolean; startDate?: number | null; endDate?: number | null }>;
      onChange: (values: { recordedAt?: string; recordedEndAt?: string; stageId?: string }) => void;
      initialValues?: { recordedAt?: string; recordedEndAt?: string; stageId?: string };
    }
    ```
  - 리듬별 매핑:
    - `free` / `sprint` / `reflection`: 기존 Calendar `mode="single"`, optional — Popover + 단일 날짜 선택. "날짜를 선택하세요" placeholder
    - `moment`: `null` 반환 (아무 UI 없음) — "순간의 기록은 날짜를 지정하지 않습니다" 안내 텍스트만 표시
    - `weekly`: WeekPicker (Task 1)
    - `monthly`: MonthPicker (Task 2)
    - `stage`: StageDatePicker (Task 3)
  - 내부에서 hidden inputs 관리: `<input type="hidden" name="recordedAt">`, `<input type="hidden" name="recordedEndAt">`
  - `rhythm` prop 변경 시 모든 날짜 상태 초기화 (`useEffect` + rhythm dependency)
  - `app/routes/public/write/article.tsx` 수정:
    - 기존 `dateMode` 상태, `singleDate`/`dateRange` 상태, `handleDateModeChange` 함수 **제거**
    - 기존 "기록 날짜" 섹션 (line 365-467: 모드 토글 + single Calendar + range Calendar) **전체 교체** → `<RhythmDateInput rhythm={rhythm} stages={availableStages} onChange={...} />`
    - `CalendarIcon` 함수는 RhythmDateInput 내부로 이동 또는 공유 유틸로 추출
    - `parseDateToUnix`는 Task 4에서 추출한 `app/lib/utils/date.ts`에서 import
    - **rhythm="stage" 일 때 기존 stageId 드롭다운(line 307-328) 숨기기** — StageDatePicker가 stageId도 관리하므로 중복 방지
    - hidden input `recordedAt`/`recordedEndAt` 출력은 RhythmDateInput 내부에서 처리하므로, 기존 recordedAtValue/recordedEndAtValue 계산 코드도 제거
  - 기존 imports 정리: `DateRange` 타입, 미사용 Calendar import 등 제거

  **Must NOT do**:
  - Note 폼 수정
  - action 로직 변경 (hidden input 이름이 동일하므로 action은 그대로)
  - 리듬 버튼 그룹 UI 변경 (기존 RHYTHM_OPTIONS 버튼 유지)
  - article.tsx의 inline DB insert를 createRecord()로 리팩토링

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: 4개 하위 컴포넌트 오케스트레이션 + 기존 폼의 복잡한 상태 관리 교체. 기존 코드 제거와 새 코드 통합이 동시에 필요
  - **Skills**: [`frontend-design`]
    - `frontend-design`: 전체 섹션의 레이아웃 흐름과 Quiet Depth 톤 유지

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 6
  - **Blocked By**: Tasks 1, 2, 3

  **References**:

  **Pattern References**:
  - `app/routes/public/write/article.tsx:219-256` — 현재 상태 관리 코드. rhythm/dateMode/singleDate/dateRange 상태 → rhythm만 남기고 나머지 제거
  - `app/routes/public/write/article.tsx:338-467` — **교체 대상 영역**. 기록 리듬 버튼(338-363)은 유지, 기록 날짜 섹션(365-467)은 RhythmDateInput으로 교체
  - `app/routes/public/write/article.tsx:307-328` — 기존 stageId 드롭다운. rhythm="stage"일 때만 숨기는 조건부 렌더링 추가
  - `app/routes/public/write/article.tsx:249-256` — 기존 recordedAtValue/recordedEndAtValue 계산. RhythmDateInput이 내부에서 처리하므로 제거

  **API/Type References**:
  - Task 1의 WeekPicker — `onWeekSelect`, `selectedWeek` props
  - Task 2의 MonthPicker — `onMonthSelect`, `selectedMonth` props
  - Task 3의 StageDatePicker — `onSelect`, `stages` props

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 리듬 "자유" → 선택적 단일 날짜
    Tool: Playwright
    Preconditions: dev server, /write/article
    Steps:
      1. 리듬 "자유" 선택 (기본값)
      2. 날짜 Popover 트리거 표시됨 — "날짜를 선택하세요" placeholder
      3. 날짜 선택 안 해도 폼 제출 가능
    Expected Result: 단일 날짜 선택 UI, 선택 optional
    Evidence: .sisyphus/evidence/task-5-rhythm-free.png

  Scenario: 리듬 "순간" → 날짜 UI 없음
    Tool: Playwright
    Steps:
      1. 리듬 "순간" 선택
      2. 기록 날짜 영역에 날짜 선택 UI 없음
      3. "순간의 기록은 날짜를 지정하지 않습니다" 안내 텍스트 표시
    Expected Result: 날짜 입력 UI 미표시
    Evidence: .sisyphus/evidence/task-5-rhythm-moment.png

  Scenario: 리듬 "주간" → WeekPicker
    Tool: Playwright
    Steps:
      1. 리듬 "주간" 선택
      2. WeekPicker 트리거 버튼 표시됨
      3. 기존 모드 토글(지정안함/특정일/기간) 미표시
    Expected Result: WeekPicker 렌더됨
    Evidence: .sisyphus/evidence/task-5-rhythm-weekly.png

  Scenario: 리듬 "구간" → StageDatePicker + stageId 드롭다운 숨김
    Tool: Playwright
    Steps:
      1. 리듬 "구간" 선택
      2. StageDatePicker (기간/여정 토글) 표시됨
      3. 기존 "구간" 라벨의 stageId 드롭다운 숨겨짐
    Expected Result: StageDatePicker만 표시, stageId 중복 없음
    Evidence: .sisyphus/evidence/task-5-rhythm-stage.png

  Scenario: 리듬 변경 시 날짜 초기화
    Tool: Playwright
    Steps:
      1. 리듬 "주간" 선택 → 3월 2주차 선택
      2. 리듬 "월간" 변경
      3. MonthPicker 표시됨, 선택 없음 (초기화됨)
      4. 리듬 "주간" 다시 변경
      5. WeekPicker 표시됨, 선택 없음 (이전 선택 기억 안 됨)
    Expected Result: 리듬 변경마다 날짜 상태 완전 초기화
    Evidence: .sisyphus/evidence/task-5-rhythm-reset.png

  Scenario: 전체 폼 제출 — rhythm="weekly" + 주 선택
    Tool: Playwright
    Steps:
      1. 리듬 "주간" 선택 → 3월 2주차(3/10~3/16) 선택
      2. 제목 입력 + 내용 입력
      3. 폼 제출
      4. 리다이렉트된 기록 상세 페이지 확인
    Expected Result: 제출 성공, DB에 recordedAt=3/10, recordedEndAt=3/16 저장
    Evidence: .sisyphus/evidence/task-5-submit-weekly.png
  ```

  **Commit**: YES (5)
  - Message: `feat(write): 리듬별 날짜 입력 UI — Article 작성 폼 통합`
  - Files: `app/components/record/RhythmDateInput.tsx`, `app/routes/public/write/article.tsx`
  - Pre-commit: `tsc --noEmit`

- [ ] 6. Edit 폼 날짜 편집 통합

  **What to do**:
  - `app/routes/public/logs/$recordSlug.edit.tsx` 수정
  - loader에서 Stage 목록 전체 조회 추가 (현재 `currentStage`만 조회 — `allStages` 추가 필요, article.tsx의 loader 패턴 참고)
  - 컴포넌트에서:
    - 기존 rhythm Select(line 278-296)를 리듬 **버튼 그룹**으로 교체 (article.tsx의 RHYTHM_OPTIONS 패턴, 일관성)
    - rhythm 상태를 `useState`로 관리 (현재 `defaultValue`만 사용)
    - rhythm 아래에 `<RhythmDateInput>` 추가
    - `initialValues`로 기존 record의 `recordedAt`/`recordedEndAt`/`stageId` 전달
      - Unix timestamp → Date 변환: `new Date(record.recordedAt * 1000)` → `format(date, "yyyy-MM-dd")`
    - `rhythm="stage"`일 때 기존 stageId hidden input(line 320) 숨기기
  - action에서:
    - formData에서 `recordedAt`/`recordedEndAt` 추출
    - `parsed.data`에 포함 (Task 4에서 스키마에 추가했으므로 자동 포함)
    - `updateRecord()` 호출에 `recordedAt`/`recordedEndAt` 전달
    - `parseDateToUnix`를 `app/lib/utils/date.ts`에서 import하여 문자열→Unix 변환 후 `updateRecord()`에 전달
  - `updateRecord()` 내부 수정 (`records.server.ts`):
    - `data` 파라미터에서 `recordedAt`, `recordedEndAt` 추출
    - 문자열이면 `parseDateToUnix()`로 변환
    - DB update SET 절에 `recordedAt`, `recordedEndAt` 포함
  - imports 추가: `RhythmDateInput`, `format` (date-fns), `parseDateToUnix`

  **Must NOT do**:
  - Note 편집 시 리듬/날짜 UI 추가 — 기존과 동일하게 유지
  - record.format === "note"인 경우에는 리듬 버튼/RhythmDateInput 비표시
  - article.tsx 재수정

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: loader/action/컴포넌트 3곳 수정 + 기존 데이터 round-trip (Unix→Date→display→Date→Unix)
  - **Skills**: [`frontend-design`]
    - `frontend-design`: 편집 폼 레이아웃에 날짜 피커 자연스럽게 삽입

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (Task 5 완료 후)
  - **Blocks**: FINAL
  - **Blocked By**: Tasks 4, 5

  **References**:

  **Pattern References**:
  - `app/routes/public/write/article.tsx:78-97` — Article loader의 stages 전체 조회 패턴. `allStages` 쿼리 + 반환 패턴 그대로 사용
  - `app/routes/public/write/article.tsx:338-362` — 리듬 버튼 그룹 패턴. Edit 폼에서도 동일 RHYTHM_OPTIONS + 버튼 UI 사용
  - `app/routes/public/write/article.tsx:116-134` — Article action의 recordedAt/recordedEndAt formData 추출 + parseDateToUnix 패턴. Edit action에도 동일 적용

  **API/Type References**:
  - `app/db/queries/records/records.server.ts:160-169` — `updateRecord()` 시그니처. Task 4에서 `Partial<CreateRecordInput>`에 date 필드 추가됨
  - `app/routes/public/logs/$recordSlug.edit.tsx:76-83` — 현재 loader 반환 타입. `stages` 추가 필요
  - `app/db/schema.server.ts:120-121` — `recordedAt`/`recordedEndAt` DB 필드 (integer, nullable)

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 기존 날짜가 있는 기록 편집 — 날짜 로드 확인
    Tool: Playwright
    Preconditions: DB에 rhythm="weekly", recordedAt=월요일 Unix, recordedEndAt=일요일 Unix인 기록 존재
    Steps:
      1. 해당 기록의 편집 페이지 이동
      2. 리듬 "주간" 버튼 활성 상태
      3. WeekPicker에 기존 주가 선택된 상태로 표시
    Expected Result: 기존 날짜가 피커에 사전 선택됨
    Evidence: .sisyphus/evidence/task-6-edit-load.png

  Scenario: 편집 폼 — 날짜 수정 후 저장
    Tool: Playwright
    Steps:
      1. 기존 기록 편집 페이지 → 리듬 "월간" 변경
      2. MonthPicker에서 다른 월 선택
      3. "수정 저장" 클릭
      4. 리다이렉트 후 기록 확인
    Expected Result: 수정된 날짜 저장 성공
    Evidence: .sisyphus/evidence/task-6-edit-save.png

  Scenario: Note 편집 시 — 리듬/날짜 UI 미표시
    Tool: Playwright
    Preconditions: Note format 기록 존재
    Steps:
      1. Note 편집 페이지 이동
      2. 리듬 버튼 그룹 미표시 확인
      3. RhythmDateInput 미표시 확인
    Expected Result: Note 편집은 기존과 동일
    Evidence: .sisyphus/evidence/task-6-edit-note.png

  Scenario: 타입 체크
    Tool: Bash
    Steps:
      1. tsc --noEmit 실행
    Expected Result: 에러 없음
    Evidence: .sisyphus/evidence/task-6-typecheck.txt
  ```

  **Commit**: YES (6)
  - Message: `feat(edit): 편집 폼 날짜 편집 지원`
  - Files: `app/routes/public/logs/$recordSlug.edit.tsx`, `app/db/queries/records/records.server.ts`
  - Pre-commit: `tsc --noEmit`

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run `tsc --noEmit` + `pnpm build`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names (data/result/item/temp). Verify Quiet Depth design tokens used correctly (colors, spacing, radius).
  Output: `Build [PASS/FAIL] | TypeCheck [PASS/FAIL] | Files [N clean/N issues] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high` (+ `playwright` skill)
  Start dev server. For EVERY rhythm type (7종): select rhythm → verify correct picker appears → select date → verify hidden input values → submit form → verify DB record. Test edge cases: rhythm change clears state, empty stage list, year boundary week, February month. Test mobile viewport (320px). Save screenshots to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff (`git log/diff`). Verify: everything in spec was built, nothing beyond spec. Check Note form NOT touched. Check no DB migrations created. Check no new npm dependencies. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

| Commit | Message | Files | Pre-commit |
|--------|---------|-------|------------|
| 1 | `feat(record): WeekPicker 컴포넌트 — 월요일 시작 주 단위 선택` | `app/components/record/WeekPicker.tsx` | `tsc --noEmit` |
| 2 | `feat(record): MonthPicker 컴포넌트 — 12개월 그리드 선택` | `app/components/record/MonthPicker.tsx` | `tsc --noEmit` |
| 3 | `feat(record): StageDatePicker 컴포넌트 — 범위/Stage 선택` | `app/components/record/StageDatePicker.tsx` | `tsc --noEmit` |
| 4 | `fix(validation): createRecordSchema에 recordedAt/recordedEndAt 추가` | `app/lib/auth/validation.ts`, `app/db/queries/records/records.server.ts` | `tsc --noEmit` |
| 5 | `feat(write): 리듬별 날짜 입력 UI — Article 작성 폼 통합` | `app/components/record/RhythmDateInput.tsx`, `app/routes/public/write/article.tsx` | `tsc --noEmit` |
| 6 | `feat(edit): 편집 폼 날짜 편집 지원` | `app/routes/public/logs/$recordSlug.edit.tsx` | `tsc --noEmit` |

---

## Success Criteria

### Verification Commands
```bash
tsc --noEmit        # Expected: no errors
pnpm build          # Expected: build succeeds
```

### Final Checklist
- [ ] 7종 리듬 모두 올바른 날짜 UI 표시
- [ ] Article 작성 → 저장 → DB에 올바른 recordedAt/recordedEndAt
- [ ] 편집 폼에서 기존 날짜 로드 + 수정 가능
- [ ] 리듬 변경 시 날짜 상태 초기화
- [ ] Note 폼 미변경
- [ ] 새 npm 의존성 없음
- [ ] DB 마이그레이션 없음
- [ ] 모바일 320px 사용 가능
