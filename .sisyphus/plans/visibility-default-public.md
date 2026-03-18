# Visibility 4단계 구분 + 기본값 Public 변경

## TL;DR

> **Quick Summary**: 모든 곳에서 "임시저장(draft)"과 "나만보기(private)"를 명확히 구분하고, 기본 visibility를 "cohort"에서 "public"으로 변경한다. 기존 워크트리 `feat/visibility-private` 에서 작업.
>
> **Deliverables**:
> - 모든 UI 폼에서 4단계 visibility (draft/private/cohort/public) 선택 가능
> - 기본값이 "public"으로 통일된 스키마, 유효성검증, UI
> - 공유 라벨 상수로 한국어 라벨 일관성 확보
> - 배지 중복 제거, 어드민 한국어 라벨 표시
>
> **Estimated Effort**: Short (1-2시간)
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: T1 → T3~T6 → T7 → T8

---

## Context

### Original Request
"모든곳에서 임시저장과 나만보기를 구분해줘. 워크트리로 생성해. 그리고 기본 값을 퍼블릭으로 하자"

### 현재 상태 분석

기존 `feat/visibility-private` 브랜치에서 "private" 옵션이 **부분 구현**됨:
- ✅ Zod 스키마에 "private" enum 추가됨
- ✅ 작성 폼(note.tsx, article.tsx)에 4단계 옵션 표시
- ✅ 기록 상세 페이지에 draft/private 별도 배너 존재
- ✅ /me 페이지에서 draft와 published(private/cohort/public) 분리
- ✅ 접근 제어 쿼리에서 private 필터링 처리

**아직 안 된 것** (이번 작업 범위):
- ❌ 기본값이 여전히 "cohort" (스키마, 유효성검증, 쿼리 fallback, UI 전체)
- ❌ 수정 폼(`$recordSlug.edit.tsx`)에 "private" 옵션 누락
- ❌ 설정 페이지에서 draft가 "임시저장 (나만 보기)"로 표시 — draft/private 혼동
- ❌ `VISIBILITY_LABELS`에 "private" 누락, "draft" 라벨 불일치 ("초안" vs "임시저장")
- ❌ 기록 상세 페이지에서 private일 때 배지 2개 중복 렌더링
- ❌ `draft-storage.ts` 타입에 "private" 누락
- ❌ 응답 폼 기본값 "cohort" 하드코딩
- ❌ 어드민 뷰에서 raw 영문 visibility 표시

### Metis 리뷰 반영
- D1 migration에서 기존 데이터 변경 금지 → 컬럼 DEFAULT만 변경
- 응답(response) visibility는 `["cohort", "public"]` 유지 — draft/private 추가 안 함
- drafts 테이블 default는 "draft" 유지 (변경하지 않음)
- 공유 라벨 상수 추출하여 라벨 drift 방지

---

## Work Objectives

### Core Objective
모든 visibility 관련 코드에서 draft≠private를 명확히 구분하고, 기본 visibility를 "public"으로 통일한다.

### Concrete Deliverables
- `app/lib/constants/visibility.ts` — 공유 라벨 상수
- 스키마/유효성검증/쿼리 fallback에서 기본값 "public"으로 변경
- 수정 폼, 설정 페이지, 응답 폼의 visibility 옵션 수정
- 기록 상세 배지 중복 제거
- 어드민 뷰 한국어 라벨

### Definition of Done
- [ ] `tsc --noEmit` 통과
- [ ] `pnpm test` 전체 통과
- [ ] 모든 Zod 스키마에서 `.parse({})` 시 visibility 기본값 = "public" (draft 스키마 제외)
- [ ] 모든 UI 폼에서 4단계 옵션 표시 (write/edit/settings)
- [ ] private 기록 상세에서 배지 1개만 렌더링

### Must Have
- 4단계 구분: draft(임시저장), private(나만 보기), cohort(코호트 공개), public(전체 공개)
- 기본값 "public" 통일 (drafts 테이블 제외)
- 한국어 라벨 일관성 (단일 소스 상수)
- 설정 페이지에서 draft/private 별도 옵션

### Must NOT Have (Guardrails)
- ❌ 기존 DB 데이터의 visibility 값 변경 (migration에서 UPDATE 금지)
- ❌ 응답(response) schema에 draft/private 추가
- ❌ drafts 테이블 default 변경 (계속 "draft")
- ❌ 쿼리 필터 로직 변경 (`IN ('cohort', 'public')` 패턴은 이미 올바름)
- ❌ visibility 이외의 코드 변경

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed.

### Test Decision
- **Infrastructure exists**: YES (vitest)
- **Automated tests**: Tests-after (기존 테스트 업데이트)
- **Framework**: vitest (`pnpm test`)

### QA Policy
Every task includes QA scenarios. Evidence → `.sisyphus/evidence/task-{N}-{slug}.{ext}`.
- **코드 변경**: Bash (grep + typecheck + test)
- **라벨 일관성**: Bash (grep 패턴 매칭)

---

## Execution Strategy

### Working Directory

> ⚠️ **모든 작업은 기존 워크트리에서 수행**
> - Path: `/Users/hellosunghyun/Documents/Github/divelog-visibility`
> - Branch: `feat/visibility-private`
> - 메인 리포가 아닌 워크트리 디렉토리에서 작업할 것

### Parallel Execution Waves

```
Wave 1 (Foundation — 병렬):
├── Task 1: 공유 visibility 라벨 상수 추출 [quick]
├── Task 2: 스키마 + 유효성검증 기본값 "public" 변경 [quick]

Wave 2 (UI + 지원 파일 — 최대 병렬, Wave 1 이후):
├── Task 3: 수정 폼 + 설정 페이지 수정 (depends: T1) [quick]
├── Task 4: 기록 상세 페이지 라벨/배지 수정 (depends: T1) [quick]
├── Task 5: draft-storage + record-diff 라벨 수정 (depends: T1) [quick]
├── Task 6: 어드민 뷰 한국어 라벨 + 필터 (depends: T1) [quick]

Wave 3 (통합 검증 — Wave 2 이후):
├── Task 7: 기존 테스트 업데이트 (depends: T2, T5) [quick]
├── Task 8: 전체 빌드 + 타입체크 검증 (depends: all) [quick]

Wave FINAL (전체 검증 — Wave 3 이후):
├── F1: Plan compliance audit [oracle]
├── F2: Code quality review [unspecified-high]
├── F3: Real QA [unspecified-high]
└── F4: Scope fidelity check [deep]
→ 결과 제시 → 사용자 확인
```

### Dependency Matrix

| Task | Depends On | Blocks |
|------|-----------|--------|
| T1   | —         | T3, T4, T5, T6 |
| T2   | —         | T7, T8 |
| T3   | T1        | T8 |
| T4   | T1        | T8 |
| T5   | T1        | T7, T8 |
| T6   | T1        | T8 |
| T7   | T2, T5    | T8 |
| T8   | ALL       | FINAL |

### Agent Dispatch Summary

- **Wave 1**: **2** — T1 → `quick`, T2 → `quick`
- **Wave 2**: **4** — T3~T6 → `quick`
- **Wave 3**: **2** — T7 → `quick`, T8 → `quick`
- **FINAL**: **4** — F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `deep`

---

## TODOs

- [x] 1. 공유 Visibility 라벨 상수 추출

  **What to do**:
  - `app/lib/constants/visibility.ts` 파일 생성
  - 4단계 라벨 맵 정의:
    ```ts
    export const VISIBILITY_LABELS: Record<string, string> = {
      draft: "임시저장",
      private: "나만 보기",
      cohort: "코호트 공개",
      public: "전체 공개",
    };
    ```
  - 선택 순서 상수 배열도 export (폼에서 재사용):
    ```ts
    export const VISIBILITY_OPTIONS = ["draft", "private", "cohort", "public"] as const;
    export type Visibility = (typeof VISIBILITY_OPTIONS)[number];
    ```

  **Must NOT do**:
  - 아직 다른 파일에서 import 변경하지 않음 (Wave 2에서 처리)
  - 응답용 visibility는 별도 상수 불필요 (cohort/public 2가지뿐)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 2)
  - **Blocks**: T3, T4, T5, T6
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `app/routes/public/logs/$recordSlug.tsx:111-115` — 현재 VISIBILITY_LABELS 정의 (private 누락). 이 파일의 패턴을 기반으로 상수 추출
  - `app/lib/utils/record-diff.ts:89-93` — VALUE_LABELS.visibility (private 누락, draft="초안"). 이 라벨도 통일 대상

  **Acceptance Criteria**:
  - [ ] `app/lib/constants/visibility.ts` 파일 존재
  - [ ] VISIBILITY_LABELS에 4개 키 모두 포함 (draft, private, cohort, public)
  - [ ] 한국어 라벨: draft=임시저장, private=나만 보기, cohort=코호트 공개, public=전체 공개
  - [ ] `tsc --noEmit` 통과

  **QA Scenarios**:

  ```
  Scenario: 라벨 상수 파일 구조 검증
    Tool: Bash (grep)
    Preconditions: 워크트리에서 작업
    Steps:
      1. grep -c "VISIBILITY_LABELS" app/lib/constants/visibility.ts → 1 이상
      2. grep "draft.*임시저장" app/lib/constants/visibility.ts → 매칭
      3. grep "private.*나만 보기" app/lib/constants/visibility.ts → 매칭
      4. grep "cohort.*코호트 공개" app/lib/constants/visibility.ts → 매칭
      5. grep "public.*전체 공개" app/lib/constants/visibility.ts → 매칭
      6. tsc --noEmit → exit 0
    Expected Result: 모든 grep 매칭, 타입 에러 없음
    Evidence: .sisyphus/evidence/task-1-visibility-constants.txt
  ```

  **Commit**: YES (단독)
  - Message: `feat(visibility): 공유 라벨 상수 추출`
  - Files: `app/lib/constants/visibility.ts`
  - Pre-commit: `tsc --noEmit`

- [x] 2. 스키마 + 유효성검증 + 쿼리 Fallback 기본값 "public" 변경

  **What to do**:
  - **Drizzle 스키마** (`app/db/schema.server.ts`):
    - Line 19: `defaultVisibility` default `"cohort"` → `"public"`
    - Line 114: `records.visibility` default `"cohort"` → `"public"`
    - Line 163: `responses.visibility` default `"cohort"` → `"public"`
    - ⚠️ Line 388: `drafts.visibility` default `"draft"` → **변경하지 않음**
  - **Zod 유효성검증** (`app/lib/auth/validation.ts`):
    - Line 11: `createRecordSchema.visibility` `.default("cohort")` → `.default("public")`
    - Line 65: `editRecordSchema.visibility` `.default("cohort")` → `.default("public")`
    - Line 89: `createResponseSchema.visibility` `.default("cohort")` → `.default("public")`
    - ⚠️ Line 56: draft 스키마 `.default("draft")` → **변경하지 않음**
    - Line 142: published-only `.default("cohort")` → `.default("public")`
  - **쿼리 및 로더 Fallback**:
    - `app/db/queries/records/records.server.ts:133` — `data.visibility ?? "cohort"` → `"public"`
    - `app/db/queries/dialogue/responses.server.ts:38` — `data.visibility ?? "cohort"` → `"public"`
    - `app/routes/public/write/note.tsx:53` — `learner?.defaultVisibility ?? "cohort"` → `"public"`
    - `app/routes/public/write/article.tsx:93` — `learner?.defaultVisibility ?? "cohort"` → `"public"`
  - **D1 Migration**: `drizzle-kit generate` 실행하여 마이그레이션 생성. 기존 데이터 UPDATE 없이 DEFAULT만 변경.

  **Must NOT do**:
  - drafts 테이블 default 변경 금지
  - 기존 데이터 UPDATE 금지
  - 쿼리 필터 로직(IN ('cohort', 'public')) 변경 금지

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 1)
  - **Blocks**: T7, T8
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `app/db/schema.server.ts:19` — learnerProfiles.defaultVisibility `.default("cohort")`
  - `app/db/schema.server.ts:114` — records.visibility `.default("cohort")`
  - `app/db/schema.server.ts:163` — responses.visibility `.default("cohort")`
  - `app/db/schema.server.ts:388` — drafts.visibility `.default("draft")` (변경 금지)
  - `app/lib/auth/validation.ts:11,56,65,89,142` — Zod 스키마 defaults
  - `app/db/queries/records/records.server.ts:133` — `data.visibility ?? "cohort"` fallback
  - `app/db/queries/dialogue/responses.server.ts:38` — `data.visibility ?? "cohort"` fallback
  - `app/routes/public/write/note.tsx:53` — `learner?.defaultVisibility ?? "cohort"` fallback
  - `app/routes/public/write/article.tsx:93` — `learner?.defaultVisibility ?? "cohort"` fallback

  **Acceptance Criteria**:
  - [ ] schema.server.ts의 records, responses, learnerProfiles default = "public"
  - [ ] schema.server.ts의 drafts default = "draft" (변경 안 됨)
  - [ ] validation.ts의 createRecord, editRecord, createResponse default = "public"
  - [ ] validation.ts의 draft 스키마 default = "draft" (변경 안 됨)
  - [ ] 쿼리 + 로더 fallback 값 = "public" (4곳: records.server.ts, responses.server.ts, note.tsx, article.tsx)
  - [ ] `tsc --noEmit` 통과

  **QA Scenarios**:

  ```
  Scenario: 스키마 기본값 검증
    Tool: Bash (grep)
    Preconditions: 워크트리에서 작업
    Steps:
      1. grep "default.*cohort" app/db/schema.server.ts → 0 매칭 (모두 제거됨)
      2. grep "default.*public" app/db/schema.server.ts → 3 매칭 (records, responses, learnerProfiles)
      3. grep 'default("draft")' app/db/schema.server.ts → 1 매칭 (drafts 테이블)
      4. grep '\.default("cohort")' app/lib/auth/validation.ts → 0 매칭
      5. grep '?? "cohort"' app/db/queries/records/records.server.ts → 0 매칭
      6. grep '?? "cohort"' app/db/queries/dialogue/responses.server.ts → 0 매칭
      7. grep '?? "cohort"' app/routes/public/write/note.tsx → 0 매칭
      8. grep '?? "cohort"' app/routes/public/write/article.tsx → 0 매칭
      9. tsc --noEmit → exit 0
    Expected Result: cohort 기본값/fallback 완전 제거 (drafts 제외), 타입 에러 없음
    Evidence: .sisyphus/evidence/task-2-schema-defaults.txt

  Scenario: Zod 스키마 파싱 기본값 확인
    Tool: Bash (node/bun REPL)
    Steps:
      1. validation.ts의 createRecordSchema.parse({ title: "t", content: "c" }).visibility → "public"
      2. draft 스키마의 .parse({...}).visibility → "draft"
    Expected Result: 기본값이 올바르게 "public" 또는 "draft"
    Evidence: .sisyphus/evidence/task-2-zod-defaults.txt
  ```

  **Commit**: YES (단독)
  - Message: `feat(visibility): 기본값 cohort → public 변경`
  - Files: `schema.server.ts`, `validation.ts`, `records.server.ts`, `responses.server.ts`, `note.tsx`, `article.tsx`, `drizzle/migrations/*`
  - Pre-commit: `tsc --noEmit`

- [x] 3. 수정 폼 + 설정 페이지 visibility 옵션 수정

  **What to do**:
  - **수정 폼** (`app/routes/public/logs/$recordSlug.edit.tsx`):
    - Line 436-440의 SelectContent에 `<SelectItem value="private">나만 보기</SelectItem>` 추가
    - 순서 통일: draft → private → cohort → public
    - 공유 라벨 상수 import하여 사용 (Task 1에서 생성)
  - **설정 페이지** (`app/routes/public/settings.tsx`):
    - Line 173: `<SelectItem value="draft">임시저장 (나만 보기)</SelectItem>` → `<SelectItem value="draft">임시저장</SelectItem>`
    - "private" 옵션 추가: `<SelectItem value="private">나만 보기</SelectItem>`
    - 순서: draft → private → cohort → public
    - Line 168: fallback `?? "cohort"` → `?? "public"`

  **Must NOT do**:
  - 작성 폼(note.tsx, article.tsx)은 이미 올바름 — 변경 불필요
  - 응답 폼은 Task 4에서 처리

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T4, T5, T6)
  - **Blocks**: T8
  - **Blocked By**: T1

  **References**:

  **Pattern References**:
  - `app/routes/public/write/note.tsx:212-217` — 올바른 4단계 SelectItem 패턴 (이 순서를 따름)
  - `app/routes/public/logs/$recordSlug.edit.tsx:436-440` — 현재 수정 폼 (private 누락)
  - `app/routes/public/settings.tsx:168-176` — 현재 설정 페이지 (draft/private 혼동)

  **Acceptance Criteria**:
  - [ ] 수정 폼에 4개 SelectItem 존재 (draft, private, cohort, public)
  - [ ] 설정 페이지에 4개 SelectItem 존재
  - [ ] 설정 페이지에서 "임시저장 (나만 보기)" 라벨 제거됨
  - [ ] 설정 페이지 fallback = "public"
  - [ ] `tsc --noEmit` 통과

  **QA Scenarios**:

  ```
  Scenario: 수정 폼 4단계 옵션 확인
    Tool: Bash (grep)
    Steps:
      1. grep -c "SelectItem" app/routes/public/logs/$recordSlug.edit.tsx | 해당 섹션에서 4개
      2. grep "value=\"private\"" app/routes/public/logs/$recordSlug.edit.tsx → 매칭
      3. grep "나만 보기" app/routes/public/logs/$recordSlug.edit.tsx → 매칭
    Expected Result: private 옵션 존재
    Evidence: .sisyphus/evidence/task-3-edit-form.txt

  Scenario: 설정 페이지 draft/private 분리 확인
    Tool: Bash (grep)
    Steps:
      1. grep "임시저장 (나만 보기)" app/routes/public/settings.tsx → 0 매칭 (혼동 라벨 제거)
      2. grep "value=\"private\"" app/routes/public/settings.tsx → 매칭
      3. grep "value=\"draft\"" app/routes/public/settings.tsx → 매칭 (별도 옵션)
      4. grep '?? "public"' app/routes/public/settings.tsx → 매칭
    Expected Result: draft와 private가 별도 옵션으로 분리
    Evidence: .sisyphus/evidence/task-3-settings.txt
  ```

  **Commit**: YES (단독)
  - Message: `fix(visibility): 수정 폼 + 설정 페이지 private 옵션 추가`
  - Files: `$recordSlug.edit.tsx`, `settings.tsx`
  - Pre-commit: `tsc --noEmit`

- [x] 4. 기록 상세 페이지 라벨 + 배지 중복 제거 + 응답 폼 기본값

  **What to do**:
  - **VISIBILITY_LABELS** (`app/routes/public/logs/$recordSlug.tsx`):
    - Line 111-115: 로컬 VISIBILITY_LABELS 삭제 → `app/lib/constants/visibility.ts`에서 import
  - **배지 중복 제거**:
    - Line 499-512: 현재 `visibility === "draft"` 일 때 warning 배지, 그 외 VISIBILITY_LABELS 배지, 그리고 `visibility === "private"` 일 때 별도 "나만 보기" 배지 → **중복 제거**
    - VISIBILITY_LABELS에 "private"가 포함되므로 별도 배지 블록(Line 508-512) 삭제
    - draft는 warning 스타일 유지, private는 별도 스타일 (surface-secondary 배경)
    - 수정된 로직:
      ```tsx
      {record.visibility === "draft" ? (
        <span className="... bg-warning/10 text-warning ...">임시저장</span>
      ) : record.visibility === "private" ? (
        <span className="... bg-surface-secondary text-text-secondary border border-border ...">나만 보기</span>
      ) : (
        <span className="... border border-border bg-surface text-text-secondary ...">
          {VISIBILITY_LABELS[record.visibility] ?? record.visibility}
        </span>
      )}
      ```
  - **응답 폼 기본값**:
    - Line 751: `defaultValue="cohort"` → `defaultValue="public"`

  **Must NOT do**:
  - draft/private 배너(Line 444-455)는 이미 올바름 — 변경 불필요
  - 응답 폼의 SelectItem은 cohort/public만 유지 (draft/private 추가 금지)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T3, T5, T6)
  - **Blocks**: T8
  - **Blocked By**: T1

  **References**:

  **Pattern References**:
  - `app/routes/public/logs/$recordSlug.tsx:111-115` — 현재 VISIBILITY_LABELS (private 누락)
  - `app/routes/public/logs/$recordSlug.tsx:499-512` — 배지 렌더링 로직 (중복 문제)
  - `app/routes/public/logs/$recordSlug.tsx:751` — 응답 폼 defaultValue="cohort"
  - `app/lib/constants/visibility.ts` — Task 1에서 생성한 공유 상수 (import 대상)

  **Acceptance Criteria**:
  - [ ] 로컬 VISIBILITY_LABELS 정의 삭제, import로 대체
  - [ ] private 기록에서 배지 1개만 렌더링 (중복 없음)
  - [ ] 응답 폼 defaultValue = "public"
  - [ ] `tsc --noEmit` 통과

  **QA Scenarios**:

  ```
  Scenario: 배지 중복 제거 확인
    Tool: Bash (grep)
    Steps:
      1. grep -c "나만 보기" app/routes/public/logs/$recordSlug.tsx → 정확히 2 (배너 1 + 배지 1)
         (배너는 Line 452, 배지는 조건부 렌더링 1곳)
      2. grep "VISIBILITY_LABELS" app/routes/public/logs/$recordSlug.tsx → import문 존재
      3. grep "const VISIBILITY_LABELS" app/routes/public/logs/$recordSlug.tsx → 0 매칭 (로컬 정의 삭제)
    Expected Result: 로컬 정의 삭제, import 사용, 배지 중복 없음
    Evidence: .sisyphus/evidence/task-4-badge-dedup.txt

  Scenario: 응답 폼 기본값 확인
    Tool: Bash (grep)
    Steps:
      1. grep 'defaultValue="public"' app/routes/public/logs/$recordSlug.tsx → 매칭 (응답 폼)
      2. grep 'defaultValue="cohort"' app/routes/public/logs/$recordSlug.tsx → 0 매칭
    Expected Result: 응답 폼 기본값이 "public"
    Evidence: .sisyphus/evidence/task-4-response-default.txt
  ```

  **Commit**: YES (단독)
  - Message: `fix(visibility): 상세 페이지 라벨 + 배지 중복 제거`
  - Files: `$recordSlug.tsx`
  - Pre-commit: `tsc --noEmit`

- [x] 5. draft-storage + record-diff 라벨 수정

  **What to do**:
  - **draft-storage.ts** (`app/lib/infra/draft-storage.ts`):
    - Line 12: 타입 유니온에 "private" 추가
    - `'draft' | 'cohort' | 'public'` → `'draft' | 'private' | 'cohort' | 'public'`
  - **record-diff.ts** (`app/lib/utils/record-diff.ts`):
    - Line 89-93: `VALUE_LABELS.visibility` 를 공유 상수 import로 교체
    - 현재: `{ draft: "초안", cohort: "코호트", public: "전체 공개" }`
    - 변경: `app/lib/constants/visibility.ts`에서 `VISIBILITY_LABELS` import하여 사용
    - 또는 인라인: `{ draft: "임시저장", private: "나만 보기", cohort: "코호트 공개", public: "전체 공개" }`
  - **EditedIndicator.tsx** (`app/components/ui/EditedIndicator.tsx`):
    - Line 34: `visibility: "공개 범위"` — 이것은 필드 이름 라벨이므로 변경 불필요 (값 라벨과 다름)

  **Must NOT do**:
  - EditedIndicator의 필드 이름 라벨은 변경 불필요

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T3, T4, T6)
  - **Blocks**: T7, T8
  - **Blocked By**: T1

  **References**:

  **Pattern References**:
  - `app/lib/infra/draft-storage.ts:12` — 현재 타입 유니온 (`'draft' | 'cohort' | 'public'`)
  - `app/lib/utils/record-diff.ts:89-93` — 현재 VALUE_LABELS.visibility (private 누락, draft="초안")
  - `app/components/ui/EditedIndicator.tsx:34` — 필드 이름 라벨 (변경 불필요)
  - `app/lib/constants/visibility.ts` — Task 1에서 생성한 공유 상수

  **Acceptance Criteria**:
  - [ ] draft-storage.ts 타입에 "private" 포함
  - [ ] record-diff.ts visibility 라벨에 4개 키 모두 포함
  - [ ] "draft" 라벨이 "임시저장" (더 이상 "초안" 아님)
  - [ ] `tsc --noEmit` 통과

  **QA Scenarios**:

  ```
  Scenario: draft-storage 타입 + record-diff 라벨 검증
    Tool: Bash (grep)
    Steps:
      1. grep "private" app/lib/infra/draft-storage.ts → 매칭 (타입 유니온에 포함)
      2. grep "초안" app/lib/utils/record-diff.ts → 0 매칭 (제거됨)
      3. grep "임시저장" app/lib/utils/record-diff.ts → 매칭
      4. grep "나만 보기" app/lib/utils/record-diff.ts → 매칭
      5. tsc --noEmit → exit 0
    Expected Result: private 타입 추가, 라벨 통일
    Evidence: .sisyphus/evidence/task-5-supporting-files.txt
  ```

  **Commit**: YES (그룹: T6과 함께)
  - Message: `fix(visibility): draft-storage + record-diff + admin 라벨 수정`
  - Files: `draft-storage.ts`, `record-diff.ts`
  - Pre-commit: `tsc --noEmit`

- [x] 6. 어드민 뷰 한국어 라벨 + 필터 옵션

  **What to do**:
  - **admin/records/index.tsx** (`app/routes/admin/records/index.tsx`):
    - Line 18: VISIBILITY_OPTIONS에 "private" 추가
      - `["all", "draft", "cohort", "public"]` → `["all", "draft", "private", "cohort", "public"]`
    - Line 91-104: `getVisibilityBadgeVariant`에 "private" case 추가
      - `case "private": return "outline";` (draft와 같은 스타일)
    - Line 227-228: `{record.visibility}` → 한국어 라벨로 변경
      - 공유 상수 import: `import { VISIBILITY_LABELS } from "~/lib/constants/visibility";`
      - `{VISIBILITY_LABELS[record.visibility] ?? record.visibility}`
    - 필터 탭에도 한국어 라벨 사용
  - **admin/records/$recordId.tsx** (`app/routes/admin/records/$recordId.tsx`):
    - Line 155: `{record.visibility}` → `{VISIBILITY_LABELS[record.visibility] ?? record.visibility}`
  - **admin/learners/$learnerId.tsx** (`app/routes/admin/learners/$learnerId.tsx`):
    - Line 173: `{learner.defaultVisibility}` → `{VISIBILITY_LABELS[learner.defaultVisibility] ?? learner.defaultVisibility}` (기본 공개 범위)
    - Line 206: `{r.visibility}` → `{VISIBILITY_LABELS[r.visibility] ?? r.visibility}` (기록 visibility)

  **Must NOT do**:
  - 어드민 기능 로직 변경 금지
  - 필터링 쿼리 변경 금지

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T3, T4, T5)
  - **Blocks**: T8
  - **Blocked By**: T1

  **References**:

  **Pattern References**:
  - `app/routes/admin/records/index.tsx:18` — VISIBILITY_OPTIONS 배열
  - `app/routes/admin/records/index.tsx:91-104` — getVisibilityBadgeVariant switch
  - `app/routes/admin/records/index.tsx:227-228` — 뱃지에서 raw visibility 표시
  - `app/routes/admin/records/$recordId.tsx:155` — 상세에서 raw visibility 표시
  - `app/routes/admin/learners/$learnerId.tsx:173` — learner의 defaultVisibility raw 표시
  - `app/routes/admin/learners/$learnerId.tsx:206` — learner 기록에서 raw visibility 표시
  - `app/lib/constants/visibility.ts` — 공유 라벨 상수 (Task 1)

  **Acceptance Criteria**:
  - [ ] VISIBILITY_OPTIONS에 "private" 포함 (5개: all, draft, private, cohort, public)
  - [ ] getVisibilityBadgeVariant에 "private" case 존재
  - [ ] 3개 어드민 뷰 모두 한국어 라벨 사용 (records/index, records/$recordId, learners/$learnerId의 2곳)
  - [ ] `tsc --noEmit` 통과

  **QA Scenarios**:

  ```
  Scenario: 어드민 필터 + 라벨 검증
    Tool: Bash (grep)
    Steps:
      1. grep '"private"' app/routes/admin/records/index.tsx → 매칭 (VISIBILITY_OPTIONS + badge variant)
      2. grep "VISIBILITY_LABELS" app/routes/admin/records/index.tsx → import 존재
      3. grep "VISIBILITY_LABELS" app/routes/admin/records/$recordId.tsx → import 존재
      4. grep "VISIBILITY_LABELS" app/routes/admin/learners/$learnerId.tsx → import 존재 (2곳: defaultVisibility + record visibility)
      5. tsc --noEmit → exit 0
    Expected Result: private 필터 옵션 존재, 한국어 라벨 사용
    Evidence: .sisyphus/evidence/task-6-admin-labels.txt
  ```

  **Commit**: YES (그룹: T5와 함께)
  - Message: `fix(visibility): draft-storage + record-diff + admin 라벨 수정`
  - Files: `admin/records/index.tsx`, `admin/records/$recordId.tsx`, `admin/learners/$learnerId.tsx`
  - Pre-commit: `tsc --noEmit`

- [x] 7. 기존 테스트 업데이트

  **What to do**:
  - **record-diff.test.ts** (`app/db/queries/__tests__/record-diff.test.ts`):
    - Line 76-77: `formatFieldChange("visibility", "cohort", "public")` 테스트 — 라벨 업데이트 반영
    - "초안" → "임시저장" 라벨 변경 반영
    - "private" → "나만 보기" 변환 테스트 추가
    - Line 42, 47: `visibility: "cohort"` → 필요 시 "public"으로 (기본값 테스트)
  - **records.test.ts** (`app/db/queries/__tests__/records.test.ts`):
    - Line 64, 99, 119: `visibility: "cohort"` → 기본값이 "public"으로 변경된 부분 반영
  - **draft-storage.test.ts** (`app/lib/__tests__/draft-storage.test.ts`):
    - Line 45, 58: `visibility: "cohort"` → "public" (기본값 변경 반영)
    - Line 68, 77: `visibility: "public"` — 이미 올바름
    - "private" visibility 저장/로드 테스트 추가
  - **autosave.test.ts** (`app/routes/api/__tests__/autosave.test.ts`):
    - Line 94: `formData.set("visibility", "public")` — 이미 올바름
    - Line 108: `visibility: "draft"` — autosave 기본값이므로 유지
  - 모든 테스트 실행: `pnpm test`

  **Must NOT do**:
  - 테스트 삭제 금지
  - 테스트 skip 금지

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Task 8)
  - **Blocks**: T8
  - **Blocked By**: T2, T5

  **References**:

  **Pattern References**:
  - `app/db/queries/__tests__/record-diff.test.ts:25-77` — visibility 변경 관련 테스트
  - `app/db/queries/__tests__/records.test.ts:64-119` — records 기본값 테스트
  - `app/lib/__tests__/draft-storage.test.ts:45-77` — draft 저장/로드 테스트
  - `app/routes/api/__tests__/autosave.test.ts:94-108` — autosave 테스트

  **Acceptance Criteria**:
  - [ ] `pnpm test` 전체 통과
  - [ ] record-diff 테스트에 "private" → "나만 보기" 변환 테스트 존재
  - [ ] draft-storage 테스트에 "private" visibility 저장/로드 테스트 존재
  - [ ] 기본값 관련 테스트가 "public" 반영

  **QA Scenarios**:

  ```
  Scenario: 전체 테스트 통과
    Tool: Bash
    Steps:
      1. pnpm test → exit 0
      2. 출력에서 "fail" 또는 "FAIL" 검색 → 0 매칭
    Expected Result: 모든 테스트 통과, 실패 없음
    Evidence: .sisyphus/evidence/task-7-test-results.txt
  ```

  **Commit**: YES (단독)
  - Message: `test(visibility): 기존 테스트 기본값 + 라벨 업데이트`
  - Files: `record-diff.test.ts`, `records.test.ts`, `draft-storage.test.ts`
  - Pre-commit: `pnpm test`

- [x] 8. 전체 빌드 + 타입체크 통합 검증

  **What to do**:
  - 전체 타입체크: `tsc --noEmit`
  - 전체 테스트: `pnpm test`
  - 프로덕션 빌드: `pnpm build`
  - 최종 grep 검증:
    - `grep -r '?? "cohort"' app/` → 0 매칭 (fallback 모두 제거)
    - `grep -r 'default("cohort")' app/` → 0 매칭
    - `grep -r 'defaultValue="cohort"' app/` → 0 매칭
    - `grep -r '"초안"' app/` → 0 매칭

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (after T7)
  - **Blocks**: FINAL
  - **Blocked By**: ALL (T1-T7)

  **References**: 모든 이전 태스크의 결과물

  **Acceptance Criteria**:
  - [ ] `tsc --noEmit` exit 0
  - [ ] `pnpm test` 전체 통과
  - [ ] `pnpm build` exit 0
  - [ ] "cohort" 기본값/fallback 잔재 없음
  - [ ] "초안" 라벨 잔재 없음

  **QA Scenarios**:

  ```
  Scenario: 전체 통합 검증
    Tool: Bash
    Steps:
      1. tsc --noEmit → exit 0
      2. pnpm test → exit 0
      3. pnpm build → exit 0
      4. grep -r '?? "cohort"' app/ → 0 매칭
      5. grep -r 'default("cohort")' app/ → 0 매칭
      6. grep -r 'defaultValue="cohort"' app/ → 0 매칭
      7. grep -r '"초안"' app/ → 0 매칭
    Expected Result: 빌드 성공, cohort 잔재 없음
    Failure Indicators: 타입 에러, 테스트 실패, 빌드 실패, cohort 잔재 발견
    Evidence: .sisyphus/evidence/task-8-integration.txt

  Scenario: cohort 기본값 잔재 검사 (누락 방지)
    Tool: Bash (grep)
    Steps:
      1. grep -rn 'cohort' app/lib/auth/validation.ts → "cohort"가 enum 값으로만 존재, default로는 불가
      2. grep -rn 'cohort' app/db/schema.server.ts → "cohort" 컬럼 이름/enum은 OK, default는 불가
    Expected Result: "cohort"는 유효한 enum 값으로만 존재, default/fallback으로 사용되지 않음
    Evidence: .sisyphus/evidence/task-8-cohort-residual.txt
  ```

  **Commit**: NO (검증만)

---

## Final Verification Wave

> 4 review agents run in PARALLEL. ALL must APPROVE. 결과를 사용자에게 제시하고 명시적 "okay" 대기.

- [x] F1. **Plan Compliance Audit** — `oracle`
  플랜의 모든 "Must Have" 항목이 구현되었는지 확인. "Must NOT Have" 패턴이 코드에 없는지 검색. evidence 파일 존재 확인.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [x] F2. **Code Quality Review** — `unspecified-high`
  `tsc --noEmit` + `pnpm test` 실행. 변경 파일에서 `as any`, 빈 catch, console.log, 주석처리 코드 검사. 라벨 상수 import 일관성 확인.
  Output: `Build [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [x] F3. **Real QA** — `unspecified-high`
  visibility 관련 모든 QA 시나리오 실행: grep으로 4단계 옵션 존재 확인, 라벨 일관성 검증, 배지 중복 없음 확인.
  Output: `Scenarios [N/N pass] | VERDICT`

- [x] F4. **Scope Fidelity Check** — `deep`
  각 태스크의 "What to do"와 실제 diff 비교. visibility 이외 코드 변경 없는지 확인. 태스크 간 파일 오염 검사.
  Output: `Tasks [N/N compliant] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

> 모든 커밋은 워크트리(`divelog-visibility`)에서 수행

| # | Message | Files | Verification |
|---|---------|-------|-------------|
| 1 | `feat(visibility): 공유 라벨 상수 추출` | `app/lib/constants/visibility.ts` | `tsc --noEmit` |
| 2 | `feat(visibility): 기본값 cohort → public 변경` | `schema.server.ts`, `validation.ts`, `records.server.ts`, `responses.server.ts` | `tsc --noEmit` |
| 3 | `fix(visibility): 수정 폼 + 설정 페이지 private 옵션 추가` | `$recordSlug.edit.tsx`, `settings.tsx` | `tsc --noEmit` |
| 4 | `fix(visibility): 상세 페이지 라벨 + 배지 중복 제거` | `$recordSlug.tsx` | `tsc --noEmit` |
| 5 | `fix(visibility): draft-storage + record-diff + admin 라벨 수정` | `draft-storage.ts`, `record-diff.ts`, `admin/records/index.tsx`, `admin/records/$recordId.tsx`, `admin/learners/$learnerId.tsx` | `tsc --noEmit` |
| 6 | `test(visibility): 기존 테스트 기본값 + 라벨 업데이트` | `*.test.ts` | `pnpm test` |

---

## Success Criteria

### Verification Commands
```bash
tsc --noEmit          # Expected: exit 0
pnpm test             # Expected: all tests pass
pnpm build            # Expected: exit 0
```

### Final Checklist
- [ ] 모든 Zod 스키마 기본값 = "public" (draft 스키마 제외)
- [ ] 수정 폼에 4단계 옵션 존재 (draft/private/cohort/public)
- [ ] 설정 페이지에 4단계 옵션 존재 (draft/private 분리)
- [ ] 기록 상세 private 배지 1개만 렌더링
- [ ] 라벨 상수 단일 소스 (VISIBILITY_LABELS)
- [ ] 어드민 필터에 "private" 포함
- [ ] 어드민 뷰에서 한국어 라벨 표시
- [ ] 기존 테스트 전체 통과
