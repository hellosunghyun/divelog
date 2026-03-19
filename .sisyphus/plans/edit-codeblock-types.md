# 수정 페이지 순서 + 코드블록 하이라이팅 + 유형 확장

## TL;DR

> **Quick Summary**: 수정 페이지 필드 순서를 작성 페이지와 맞추고(템플릿 제거), 코드블록에 서버사이드 구문 강조를 추가하고, 기록 유형을 6개로 확장한다.
> 
> **Deliverables**:
> - 수정 페이지에서 템플릿 제거 + 내용을 제목 바로 뒤로 이동
> - 게시된 글의 코드블록에 언어별 구문 강조 (Swift 포함 37개 언어)
> - 기록 유형 6개: 탐구, 학습, 프로젝트, 회고, 취미, 만남
> - 작성 페이지(note, article)에도 유형 선택기 추가
> 
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: Task 2 → Task 5 → Task 9 → F1-F4

---

## Context

### Original Request
1. 수정 페이지 순서가 이상 — 내용이 너무 아래에 있고, 템플릿 기능은 없어졌으니 제거. 순서를 저장/작성 페이지와 맞출 것.
2. 코드블록에서 언어별 색상이 안 나옴 — Swift 포함 대부분의 언어 자동 인식 필요.
3. 유형을 여러 개 넣자 — 탐구, 취미, 만남 등. 아카데미 활동과 개인 생활 모두 커버.

### Interview Summary
**Key Discussions**:
- 유형 선택: **단일 선택** (라디오 버튼)
- 유형 관리: **코드에 고정** (hardcoded)
- 유형 개수: **6개 핵심** — 탐구, 학습, 프로젝트, 회고, 취미, 만남
- 작성 페이지 유형 선택기: **추가** (기본값 탐구)

**Research Findings**:
- 템플릿 셀렉터는 dead code (action에서 templateId를 읽지 않음) — 안전하게 제거 가능
- lowlight v3.3.0 + CodeBlockLowlight는 에디터에서 작동 중, 뷰에서만 미작동
- content.server.ts가 lowlight 없이 plain text로 렌더링하는 것이 원인
- 기록 유형은 30+ 파일에 걸쳐 참조됨 (inline 중복, 공유 상수 없음)
- questions.server.ts에 COMPUTED type 로직 (challengeId 기반) → 교체 필요

### Metis Review
**Identified Gaps** (addressed):
- DB enum 값은 영어 (코드베이스 컨벤션: "exploration", "learning" 등)
- 기존 records 마이그레이션: personal→exploration, challenge→project, collaboration→project
- 기본 유형: exploration (탐구)
- 작성 페이지 유형 선택기 추가 필요 → 사용자 확인 완료
- hast-util-to-html 의존성 설치 필요
- 공유 상수 파일 생성 필요 (현재 5+ 파일에 inline 중복)
- questions.server.ts 계산 로직 교체 필요

---

## Work Objectives

### Core Objective
수정 페이지 UX 개선, 코드블록 가독성 향상, 기록 유형 다양화를 통해 Learner가 아카데미 활동과 개인 생활 모두를 적절히 분류하여 기록할 수 있게 한다.

### Concrete Deliverables
- `app/routes/public/logs/$recordSlug.edit.tsx` — 필드 순서 변경 + 템플릿 제거 + 6개 유형 옵션
- `app/lib/content/content.server.ts` — lowlight 서버사이드 구문 강조
- `app/styles/highlight.css` — 코드 구문 강조 테마 (Quiet Depth 호환)
- `app/lib/constants/record-types.ts` — 공유 유형 상수 (NEW)
- `app/lib/auth/validation.ts` — Zod enum 업데이트
- `drizzle/migrations/XXXX_record_type_expansion.sql` — D1 마이그레이션
- `app/routes/public/write/note.tsx` — 유형 선택기 추가
- `app/routes/public/write/article.tsx` — 유형 선택기 추가
- 15+ 파일에서 유형 라벨/필터/디스플레이 업데이트

### Definition of Done
- [ ] `pnpm typecheck` 통과
- [ ] `pnpm build` 통과
- [ ] `pnpm test` 통과
- [ ] `wrangler d1 migrations apply DB --local` 성공
- [ ] 수정 페이지 필드 순서: 유형 → 리듬 → 날짜 → 제목 → 내용 → (원문링크) → (참조) → 응답선호 → 태그 → 공개범위
- [ ] 코드블록에서 Swift/JS/Python 코드에 색상 적용
- [ ] 6개 유형이 수정/작성 페이지에서 선택 가능
- [ ] 기존 records가 새 유형으로 마이그레이션 완료

### Must Have
- 수정 페이지에서 템플릿 셀렉터 완전 제거
- 내용 필드가 제목 바로 뒤에 위치
- 코드블록 구문 강조가 **서버사이드**에서 처리 (클라이언트 JS 불필요)
- lowlight `common` 프리셋 사용 (Swift, JS, TS, Python, Java, Go, Rust 등 37개 언어)
- 언어 미지정 시 plain text 폴백
- 6개 유형: exploration(탐구), learning(학습), project(프로젝트), retrospective(회고), hobby(취미), encounter(만남)
- 유형 상수 파일 하나에서 관리 (inline 중복 금지)
- 작성 페이지에도 유형 선택기 (기본값: exploration)

### Must NOT Have (Guardrails)
- 코드블록 라인 넘버, 복사 버튼, 언어 배지 추가 금지
- highlight.js/lowlight를 클라이언트 번들에 추가 금지 (서버 전용)
- `common` 프리셋 범위 확장 금지
- 유형별 아이콘, 색상, CSS 변수 추가 금지
- `[COLLAB_DISABLED]`, `[STAGE_DISABLED]` 주석 코드 수정 금지 (유형 enum 참조만 업데이트)
- `challenges`, `collaborationUnits` 테이블/FK 수정 금지
- 유형용 DB 테이블 생성 금지 (코드에 고정)
- 작성 페이지(note.tsx, article.tsx)의 필드 순서 변경 금지 (유형 선택기 추가만)
- `guide.tsx` 본문 텍스트 수정 금지 (별도 작업)
- 기존 태그(학습, 취미, 회고 등)와 겹치는 태그 제거/변경 금지

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION PER TASK** — 개별 태스크의 QA 시나리오는 모두 에이전트가 자동 실행한다.
> 단, Final Verification Wave 완료 후 결과를 사용자에게 제시하고 승인을 받는 것은 의도된 오케스트레이션 게이트이다.
> 개별 태스크 수용 기준에서 "사용자가 수동 테스트/확인" 요구는 FORBIDDEN.

### Test Decision
- **Infrastructure exists**: YES (vitest)
- **Automated tests**: Tests-after (content.server.ts 렌더링 + Zod 검증 테스트)
- **Framework**: vitest

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Frontend/UI**: Playwright — Navigate, interact, assert DOM, screenshot
- **Server rendering**: Bash (vitest) — unit test로 HTML 출력 검증
- **DB migration**: Bash (wrangler) — migration 적용 검증

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — 3 tasks, all independent):
├── Task 1: Edit page reorder + template removal [quick]
├── Task 2: Record type constants + Zod validation update [quick]
└── Task 3: Install hast-util-to-html + create highlight CSS theme [quick]

Wave 2 (After Wave 1 — 5 tasks, MAX PARALLEL):
├── Task 4: Server-side lowlight rendering (depends: 3) [deep]
├── Task 5: D1 migration for record types (depends: 2) [quick]
├── Task 6: Edit page type selector → 6 options (depends: 1, 2) [quick]
├── Task 7: Write pages type selector (depends: 2) [quick]
└── Task 8: Update all display/filter/admin UI (depends: 2) [unspecified-high]

Wave 3 (After Wave 2 — 1 task):
└── Task 9: Fix computed type in questions.server.ts (depends: 5, 8) [quick]

Wave FINAL (After ALL tasks — 4 parallel reviews, then user okay):
├── F1: Plan compliance audit (oracle)
├── F2: Code quality review (unspecified-high)
├── F3: Real manual QA (unspecified-high)
└── F4: Scope fidelity check (deep)
→ Present results → Get explicit user okay

Critical Path: Task 2 → Task 5 → Task 9 → F1-F4 → user okay
Parallel Speedup: ~60% faster than sequential
Max Concurrent: 5 (Wave 2)
```

### Dependency Matrix

| Task | Depends On | Blocks | Wave |
|------|-----------|--------|------|
| 1 | — | 6 | 1 |
| 2 | — | 5, 6, 7, 8 | 1 |
| 3 | — | 4 | 1 |
| 4 | 3 | — | 2 |
| 5 | 2 | 9 | 2 |
| 6 | 1, 2 | — | 2 |
| 7 | 2 | — | 2 |
| 8 | 2 | 9 | 2 |
| 9 | 5, 8 | — | 3 |

### Agent Dispatch Summary

- **Wave 1**: **3** — T1 → `quick`, T2 → `quick`, T3 → `quick`
- **Wave 2**: **5** — T4 → `deep`, T5 → `quick`, T6 → `quick`, T7 → `quick`, T8 → `unspecified-high`
- **Wave 3**: **1** — T9 → `quick`
- **FINAL**: **4** — F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `deep`

---

## TODOs

- [x] 1. 수정 페이지 필드 순서 변경 + 템플릿 제거

  **What to do**:
  - `app/routes/public/logs/$recordSlug.edit.tsx`에서 템플릿 관련 코드 모두 제거:
    - `templates` import 제거 (line 40 부근, `schema.server`에서)
    - `TemplateOption` type alias 제거
    - `NO_SELECTION_VALUE` 상수 제거
    - `templateValue` state 제거 (line 324 부근)
    - loader에서 templates 테이블 쿼리 제거 (line 89-90 부근)
    - `availableTemplates` destructuring 제거
    - 템플릿 셀렉터 JSX 블록 제거 (lines 451-471)
  - 필드 순서를 작성 페이지(article.tsx)와 맞춤 — 내용(Content)을 제목(Title) 바로 뒤로 이동:
    - 현재: 유형 → 리듬 → 날짜 → ~~템플릿~~ → 제목 → 원문링크 → **내용** → 참조 → 응답 → 태그 → 공개범위
    - 목표: 유형 → 리듬 → 날짜 → 제목 → **내용** → 원문링크 → 참조 → 응답 → 태그 → 공개범위
  - JSX 블록 순서만 변경. 내용 블록(NoteEditor/ArticleEditor)을 제목 블록 바로 뒤, 원문링크 블록 앞으로 이동

  **Must NOT do**:
  - form validation 로직이나 action 처리 로직 변경 금지
  - 유형 라디오 버튼 옵션 변경 금지 (Task 6에서 처리)
  - 작성 페이지(note.tsx, article.tsx) 수정 금지

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 단일 파일 JSX 순서 변경 + 코드 삭제. 로직 변경 없음.
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `frontend-design`: UI 구조 변경 아닌 순서 변경만이라 불필요

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3)
  - **Blocks**: Task 6
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `app/routes/public/logs/$recordSlug.edit.tsx:365-651` — 현재 전체 폼 JSX. 순서 변경 대상
  - `app/routes/public/logs/$recordSlug.edit.tsx:451-471` — 템플릿 셀렉터 JSX (삭제 대상)
  - `app/routes/public/logs/$recordSlug.edit.tsx:324` — `templateValue` state (삭제 대상)
  - `app/routes/public/logs/$recordSlug.edit.tsx:89-90` — loader에서 templates 쿼리 (삭제 대상)

  **API/Type References**:
  - `app/routes/public/write/article.tsx:253-313` — 작성 페이지의 목표 필드 순서 참조 (리듬 → 날짜 → 제목 → 내용)

  **WHY Each Reference Matters**:
  - edit.tsx 전체 폼 JSX를 읽어야 현재 순서를 이해하고 정확히 재배치 가능
  - article.tsx를 참조해 "작성 페이지 순서"가 무엇인지 확인
  - 템플릿 관련 코드는 7곳에 산재 — 모두 찾아 제거해야 typecheck 통과

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 템플릿 관련 코드 완전 제거
    Tool: Bash (grep)
    Preconditions: Task 1 완료
    Steps:
      1. grep -n "templateId\|NO_SELECTION_VALUE\|availableTemplates\|TemplateOption\|templateValue" app/routes/public/logs/\$recordSlug.edit.tsx
      2. 결과가 0줄이어야 함
    Expected Result: grep 반환 0 matches
    Failure Indicators: 템플릿 관련 문자열이 1개라도 남아있음
    Evidence: .sisyphus/evidence/task-1-template-removed.txt

  Scenario: 필드 순서 확인 (DOM order)
    Tool: Bash (grep)
    Preconditions: Task 1 완료
    Steps:
      1. grep -n "htmlFor=\|name=\"type\"\|name=\"rhythm\"\|name=\"title\"\|name=\"content\"\|Label.*제목\|Label.*내용\|Label.*리듬\|Label.*유형\|Label.*원문\|Label.*참조\|Label.*태그\|Label.*공개" app/routes/public/logs/\$recordSlug.edit.tsx 로 각 필드의 line number 확인
      2. 유형 < 리듬 < 날짜 < 제목 < 내용 < 원문링크 < 참조 < 응답선호 < 태그 < 공개범위 순서 확인
    Expected Result: line numbers가 순서대로 증가
    Failure Indicators: 내용이 제목보다 line number가 낮거나, 원문링크보다 높음
    Evidence: .sisyphus/evidence/task-1-field-order.txt

  Scenario: typecheck + build 통과
    Tool: Bash
    Preconditions: Task 1 완료
    Steps:
      1. pnpm typecheck
      2. pnpm build
    Expected Result: 두 명령 모두 exit code 0
    Failure Indicators: TypeScript 에러 또는 빌드 실패
    Evidence: .sisyphus/evidence/task-1-typecheck.txt
  ```

  **Commit**: YES
  - Message: `fix: 수정 페이지에서 미사용 템플릿 제거 및 필드 순서 변경`
  - Files: `app/routes/public/logs/$recordSlug.edit.tsx`
  - Pre-commit: `pnpm typecheck`

- [x] 2. 기록 유형 상수 파일 생성 + Zod 검증 업데이트

  **What to do**:
  - `app/lib/constants/record-types.ts` 파일 새로 생성:
    ```typescript
    export const RECORD_TYPES = ["exploration", "learning", "project", "retrospective", "hobby", "encounter"] as const;
    export type RecordType = (typeof RECORD_TYPES)[number];
    export const RECORD_TYPE_LABELS: Record<RecordType, string> = {
      exploration: "탐구",
      learning: "학습",
      project: "프로젝트",
      retrospective: "회고",
      hobby: "취미",
      encounter: "만남",
    };
    export const DEFAULT_RECORD_TYPE: RecordType = "exploration";
    ```
  - `app/lib/auth/validation.ts` line 18의 Zod enum 업데이트:
    - 기존: `z.enum(["personal", "challenge", "collaboration"])`
    - 변경: `z.enum(RECORD_TYPES)` (상수 import)
    - `.default("personal")` → `.default(DEFAULT_RECORD_TYPE)`

  **Must NOT do**:
  - 유형별 아이콘, 색상 추가 금지
  - DB 테이블 생성 금지
  - 다른 파일의 유형 참조 수정 금지 (Task 8에서 처리)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 새 파일 1개 생성 + 기존 파일 1개 수정. 단순한 상수 정의.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3)
  - **Blocks**: Tasks 5, 6, 7, 8
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `app/lib/auth/validation.ts:12-59` — createRecordSchema 전체. line 18의 type enum이 수정 대상
  - `app/lib/constants/visibility.ts` — 기존 상수 파일 패턴 참조 (같은 디렉토리에 생성)

  **API/Type References**:
  - `app/db/schema.server.ts:102` — DB 스키마의 type 필드 정의 (TEXT, default "personal")

  **WHY Each Reference Matters**:
  - validation.ts의 Zod enum이 유형의 진짜 gatekeeper — 여기를 먼저 업데이트해야 다른 작업이 가능
  - visibility.ts 패턴을 따라 일관된 상수 파일 구조 유지
  - schema.server.ts의 default 값은 D1 migration에서 처리 (Task 5)

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 상수 파일이 올바른 6개 유형 정의
    Tool: Bash (grep)
    Preconditions: Task 2 완료
    Steps:
      1. grep -c "exploration\|learning\|project\|retrospective\|hobby\|encounter" app/lib/constants/record-types.ts
      2. 6개 이상 매치 확인
      3. grep "RECORD_TYPE_LABELS" app/lib/constants/record-types.ts 에서 한국어 라벨 확인
    Expected Result: 6개 영문 값 + 6개 한국어 라벨 모두 존재
    Failure Indicators: 누락된 유형 또는 라벨
    Evidence: .sisyphus/evidence/task-2-constants.txt

  Scenario: Zod 검증이 새 유형 상수 import 사용
    Tool: Bash (grep)
    Preconditions: Task 2 완료
    Steps:
      1. grep "RECORD_TYPES" app/lib/auth/validation.ts 로 상수 import 확인
      2. grep -c '"personal"\|"challenge"\|"collaboration"' app/lib/auth/validation.ts 로 구 유형 리터럴 잔존 확인
      3. pnpm typecheck 실행
    Expected Result: Step 1에서 RECORD_TYPES 매치, Step 2에서 0 matches, Step 3에서 exit code 0
    Failure Indicators: RECORD_TYPES import 없거나, 구 유형 리터럴 잔존하거나, typecheck 실패
    Evidence: .sisyphus/evidence/task-2-zod.txt
  ```

  **Commit**: YES
  - Message: `feat: 기록 유형 상수 파일 생성 및 Zod 검증 업데이트`
  - Files: `app/lib/constants/record-types.ts` (NEW), `app/lib/auth/validation.ts`
  - Pre-commit: `pnpm typecheck`

- [x] 3. 코드블록 구문 강조 의존성 설치 + CSS 테마 생성

  **What to do**:
  - `pnpm add hast-util-to-html` 실행하여 의존성 추가
  - `app/styles/highlight.css` 파일 새로 생성 — Quiet Depth 디자인과 호환되는 구문 강조 테마:
    - 배경: `var(--color-surface-secondary)` (#F2F5F8)
    - 키워드: Deep Ocean 계열 (#0B2447 또는 약간 밝게)
    - 문자열: Ocean Blue 계열 (#146C94)
    - 주석: Text Tertiary (#8C8C91)
    - 함수/메서드: Reef Cyan 어둡게 (#0D8BA0)
    - 숫자/상수: muted warm tone
    - 전체적으로 Quiet Depth의 차분한 블루-그레이 팔레트 유지
  - CSS 클래스는 highlight.js 표준 클래스명 사용: `.hljs-keyword`, `.hljs-string`, `.hljs-comment`, `.hljs-function`, `.hljs-number`, `.hljs-built_in`, `.hljs-type`, `.hljs-title`, `.hljs-attr`, `.hljs-variable`, `.hljs-literal`, `.hljs-meta`, `.hljs-operator`, `.hljs-punctuation` 등
  - `app/root.tsx` 또는 `app/app.css`에서 highlight.css import 추가

  **Must NOT do**:
  - highlight.js JavaScript 라이브러리를 클라이언트에 추가 금지 (CSS만)
  - 에디터 코드블록 스타일(editor.css) 수정 금지
  - content.server.ts 수정 금지 (Task 4에서 처리)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: npm 설치 1개 + CSS 파일 1개 생성 + import 1줄 추가
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2)
  - **Blocks**: Task 4
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `app/styles/editor.css:176-195` — 에디터 코드블록 기존 스타일. 뷰 테마와 시각적 일관성 유지 참조
  - `app/styles/global.css` — 프로젝트 CSS 변수 정의 (Quiet Depth 색상 토큰)
  - `app/components/content/ContentRenderer.tsx:30-32` — 뷰 측 코드블록 기본 스타일

  **External References**:
  - highlight.js CSS 클래스 목록: https://highlightjs.readthedocs.io/en/latest/css-classes-reference.html

  **WHY Each Reference Matters**:
  - editor.css의 기존 코드블록 배경/폰트와 일관된 스타일 필요
  - global.css의 CSS 변수를 사용해 Quiet Depth 팔레트 내에서 색상 선택
  - ContentRenderer의 기존 Tailwind 클래스와 CSS 테마가 충돌하지 않도록 확인

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: hast-util-to-html 설치 확인
    Tool: Bash
    Preconditions: Task 3 완료
    Steps:
      1. grep "hast-util-to-html" package.json
      2. ls node_modules/hast-util-to-html/package.json
    Expected Result: package.json에 의존성 존재, node_modules에 설치됨
    Failure Indicators: 의존성 미존재
    Evidence: .sisyphus/evidence/task-3-dependency.txt

  Scenario: highlight CSS 테마 파일 존재 + 필수 클래스 포함
    Tool: Bash (grep)
    Preconditions: Task 3 완료
    Steps:
      1. test -f app/styles/highlight.css
      2. grep -c "hljs-keyword\|hljs-string\|hljs-comment\|hljs-function\|hljs-number" app/styles/highlight.css
      3. 최소 5개 매치 확인
    Expected Result: 파일 존재 + 5개 이상 hljs 클래스 정의
    Failure Indicators: 파일 미존재 또는 클래스 누락
    Evidence: .sisyphus/evidence/task-3-css-theme.txt

  Scenario: CSS import 추가 확인
    Tool: Bash (grep)
    Preconditions: Task 3 완료
    Steps:
      1. grep "highlight" app/app.css; echo "---"; grep "highlight" app/root.tsx
      2. 둘 중 최소 하나에서 highlight.css import 문 매치
    Expected Result: app/app.css 또는 app/root.tsx에서 "highlight" 문자열 1건 이상 매치
    Failure Indicators: 두 파일 모두 매치 없음
    Evidence: .sisyphus/evidence/task-3-css-import.txt
  ```

  **Commit**: YES
  - Message: `feat: 코드블록 구문 강조 의존성 및 CSS 테마 추가`
  - Files: `package.json`, `pnpm-lock.yaml`, `app/styles/highlight.css` (NEW), `app/app.css` or `app/root.tsx`
  - Pre-commit: `pnpm build`

- [x] 4. content.server.ts에 서버사이드 lowlight 구문 강조 적용

  **What to do**:
  - `app/lib/content/content.server.ts`의 `codeBlock` case (lines 154-158) 수정:
    - `lowlight`와 `common` preset import (에디터와 동일한 방식)
    - `hast-util-to-html`의 `toHtml` import
    - 언어가 지정된 경우: `lowlight.highlight(lang, code)` → HAST 결과를 `toHtml()`로 변환
    - 언어 미지정: `lowlight.highlightAuto(code)` 시도 → relevance 낮으면 plain text 폴백
    - 인식 불가 언어: try-catch로 감싸서 실패 시 plain text 폴백
    - 빈 코드블록: 빈 `<pre><code></code></pre>` 반환
  - 코드블록 HTML에 `hljs` 클래스 추가: `<pre><code class="hljs language-{lang}">`
  - escapeHtml은 lowlight가 처리하므로 직접 escape 제거 (lowlight 사용 시)
  - lowlight 미사용 폴백에서는 기존 escapeHtml 유지

  **Must NOT do**:
  - 에디터 설정(editor-config.ts, editor-extensions.ts) 수정 금지
  - 라인 넘버, 복사 버튼, 언어 배지 추가 금지
  - `common` 프리셋 외 언어 추가 금지
  - 클라이언트 번들에 lowlight 추가 금지 (이 파일은 .server.ts이므로 서버 전용)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: 서버 렌더링 파이프라인 수정. lowlight HAST → HTML 변환, 에지 케이스 처리(언어 미지정, 인식 불가, 빈 블록), Cloudflare Workers 호환성 확인 필요.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 2 내에서)
  - **Parallel Group**: Wave 2 (with Tasks 5, 6, 7, 8)
  - **Blocks**: None
  - **Blocked By**: Task 3 (hast-util-to-html 의존성 설치)

  **References**:

  **Pattern References**:
  - `app/lib/content/content.server.ts:154-158` — 현재 codeBlock 렌더링 로직 (수정 대상)
  - `app/lib/content/content.server.ts:1-20` — 기존 import 구조 및 escapeHtml 함수
  - `app/lib/content/editor-config.ts:10-18` — lowlight 사용 패턴 참조 (에디터에서의 사용 예시)

  **API/Type References**:
  - `lowlight` v3.3.0 API: `createLowlight(common)` → `lowlight.highlight(lang, code)` → HAST tree
  - `hast-util-to-html` API: `toHtml(hastTree)` → HTML string

  **External References**:
  - lowlight 공식 문서: https://github.com/wooorm/lowlight
  - hast-util-to-html: https://github.com/syntax-tree/hast-util-to-html

  **WHY Each Reference Matters**:
  - content.server.ts의 기존 렌더링 파이프라인을 이해해야 codeBlock case만 정확히 교체 가능
  - editor-config.ts의 lowlight 사용법을 그대로 따라야 에디터-뷰 간 일관성 유지
  - HAST → HTML 변환이 핵심 — toHtml이 hljs 클래스를 올바르게 출력하는지 확인 필요

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: JavaScript 코드에 구문 강조 적용
    Tool: Bash (vitest)
    Preconditions: Task 4 완료
    Steps:
      1. vitest 테스트 파일 작성하여 renderContentToHtml(content: string, format: ContentFormat) 호출.
         함수 시그니처: renderContentToHtml(content, format, mentionSlugMap?) — content는 JSON 문자열.
         테스트 입력: renderContentToHtml(JSON.stringify({ type: "doc", content: [{ type: "codeBlock", attrs: { language: "javascript" }, content: [{ type: "text", text: "const x = 1;" }] }] }), "article")
      2. 반환된 HTML에서 "hljs-keyword" 클래스 존재 확인
      3. "const" 텍스트가 span으로 감싸져 있는지 확인
    Expected Result: HTML에 <span class="hljs-keyword">const</span> 포함
    Failure Indicators: plain text로만 렌더링됨 (span 없음)
    Evidence: .sisyphus/evidence/task-4-js-highlight.txt

  Scenario: Swift 코드에 구문 강조 적용
    Tool: Bash (vitest)
    Preconditions: Task 4 완료
    Steps:
      1. renderContentToHtml(JSON.stringify({ type: "doc", content: [{ type: "codeBlock", attrs: { language: "swift" }, content: [{ type: "text", text: "var someInt = 3" }] }] }), "article") 호출
      2. "hljs-keyword" 또는 "hljs-type" 클래스 확인
    Expected Result: "var" 또는 "someInt"에 hljs 클래스 적용
    Failure Indicators: span 없음
    Evidence: .sisyphus/evidence/task-4-swift-highlight.txt

  Scenario: 언어 미지정 시 자동 감지 또는 plain text 폴백
    Tool: Bash (vitest)
    Preconditions: Task 4 완료
    Steps:
      1. renderContentToHtml(JSON.stringify({ type: "doc", content: [{ type: "codeBlock", attrs: {}, content: [{ type: "text", text: "hello world" }] }] }), "article") 호출
      2. 에러 없이 <pre><code> 반환 확인
    Expected Result: 에러 없이 HTML 반환 (plain text 또는 자동 감지)
    Failure Indicators: 에러 throw 또는 빈 출력
    Evidence: .sisyphus/evidence/task-4-no-lang.txt

  Scenario: 빈 코드블록 처리
    Tool: Bash (vitest)
    Preconditions: Task 4 완료
    Steps:
      1. renderContentToHtml(JSON.stringify({ type: "doc", content: [{ type: "codeBlock", attrs: { language: "python" }, content: [] }] }), "article") 호출
      2. 에러 없이 빈 <pre><code></code></pre> 반환 확인
    Expected Result: 빈 pre/code 블록, 에러 없음
    Failure Indicators: 에러 throw
    Evidence: .sisyphus/evidence/task-4-empty-block.txt

  Scenario: pnpm build 통과 (Cloudflare Workers 호환)
    Tool: Bash
    Preconditions: Task 4 완료
    Steps:
      1. pnpm build
    Expected Result: exit code 0
    Failure Indicators: edge runtime 비호환 에러
    Evidence: .sisyphus/evidence/task-4-build.txt
  ```

  **Commit**: YES
  - Message: `feat: content.server.ts에 서버사이드 구문 강조 적용`
  - Files: `app/lib/content/content.server.ts`
  - Pre-commit: `pnpm typecheck && pnpm build`

- [x] 5. 기록 유형 확장 D1 마이그레이션

  **What to do**:
  - 새 마이그레이션 파일 생성: `drizzle/migrations/XXXX_record_type_expansion.sql`
    - 기존 records 마이그레이션:
      ```sql
      UPDATE records SET type = 'exploration' WHERE type = 'personal';
      UPDATE records SET type = 'project' WHERE type = 'challenge';
      UPDATE records SET type = 'project' WHERE type = 'collaboration';
      ```
  - `app/db/schema.server.ts` line 102의 default 값 변경:
    - `text("type").notNull().default("personal")` → `text("type").notNull().default("exploration")`
  - `seeds/seed.sql` 업데이트:
    - 기존 seed records의 type 값을 새 유형으로 변경
    - `'personal'` → `'exploration'` 또는 적절한 새 유형
    - `'challenge'` → `'project'`
    - `'collaboration'` → `'project'`

  **Must NOT do**:
  - `challenges`, `collaborationUnits` 테이블 수정 금지
  - `challengeId`, `collaborationUnitId` FK 컬럼 제거 금지
  - CHECK constraint 추가 금지 (Zod가 validation 담당)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: SQL 마이그레이션 파일 생성 + schema default 변경 + seed 업데이트
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 2 내에서)
  - **Parallel Group**: Wave 2 (with Tasks 4, 6, 7, 8)
  - **Blocks**: Task 9
  - **Blocked By**: Task 2 (유형 상수 정의)

  **References**:

  **Pattern References**:
  - `drizzle/migrations/` — 기존 마이그레이션 파일 패턴 (파일명 규칙, SQL 문법)
  - `app/db/schema.server.ts:102` — records 테이블 type 컬럼 정의

  **API/Type References**:
  - `seeds/seed.sql` — 현재 seed 데이터 (17 personal, 5 challenge, 4 collaboration records)

  **WHY Each Reference Matters**:
  - 기존 마이그레이션 파일명 규칙을 따라야 wrangler가 인식
  - schema.server.ts의 default 값을 변경해야 새 records가 올바른 기본값으로 생성
  - seed.sql의 type 값을 업데이트해야 로컬 개발 환경에서도 새 유형 사용

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 마이그레이션 적용 성공
    Tool: Bash
    Preconditions: Task 5 완료
    Steps:
      1. wrangler d1 migrations apply DB --local
      2. exit code 확인
    Expected Result: exit code 0, 마이그레이션 성공
    Failure Indicators: SQL 에러
    Evidence: .sisyphus/evidence/task-5-migration.txt

  Scenario: 마이그레이션 후 기존 유형 없음
    Tool: Bash
    Preconditions: 마이그레이션 적용 후
    Steps:
      1. wrangler d1 execute DB --local --command="SELECT DISTINCT type FROM records"
      2. 결과에 'personal', 'challenge', 'collaboration' 없음 확인
    Expected Result: 새 유형만 존재 (exploration, project 등)
    Failure Indicators: 구 유형 값 잔존
    Evidence: .sisyphus/evidence/task-5-data-check.txt

  Scenario: schema default 변경 확인
    Tool: Bash (grep)
    Preconditions: Task 5 완료
    Steps:
      1. grep 'default(' app/db/schema.server.ts | grep type
    Expected Result: default("exploration") 확인
    Failure Indicators: default("personal") 잔존
    Evidence: .sisyphus/evidence/task-5-schema-default.txt
  ```

  **Commit**: YES
  - Message: `feat: 기록 유형 확장 D1 마이그레이션`
  - Files: `drizzle/migrations/XXXX_record_type_expansion.sql` (NEW), `app/db/schema.server.ts`, `seeds/seed.sql`
  - Pre-commit: `wrangler d1 migrations apply DB --local`

- [x] 6. 수정 페이지 유형 선택기 6개 옵션 확장

  **What to do**:
  - `app/routes/public/logs/$recordSlug.edit.tsx`의 유형 RadioGroup 수정:
    - `app/lib/constants/record-types.ts`에서 `RECORD_TYPES`, `RECORD_TYPE_LABELS` import
    - 기존 하드코딩된 `[{ value: "personal", label: "개인 탐구" }]` 배열을 RECORD_TYPES + RECORD_TYPE_LABELS 기반으로 동적 생성
    - 6개 라디오 버튼: 탐구, 학습, 프로젝트, 회고, 취미, 만남

  **Must NOT do**:
  - 유형별 아이콘, 색상 추가 금지
  - 다른 필드 수정 금지
  - RadioGroup을 Select 등 다른 컴포넌트로 변경 금지

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 단일 파일에서 라디오 옵션 배열만 변경
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 2 내에서)
  - **Parallel Group**: Wave 2 (with Tasks 4, 5, 7, 8)
  - **Blocks**: None
  - **Blocked By**: Tasks 1 (edit page reorder 완료 후), 2 (상수 파일)

  **References**:

  **Pattern References**:
  - `app/routes/public/logs/$recordSlug.edit.tsx:369-388` — 현재 유형 RadioGroup JSX
  - `app/lib/constants/record-types.ts` — Task 2에서 생성한 상수 (import 대상)

  **WHY Each Reference Matters**:
  - 기존 RadioGroup 구조를 유지하면서 옵션만 교체해야 함
  - 상수 파일에서 import하여 inline 중복 방지

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 6개 유형 라디오 버튼 존재
    Tool: Bash (grep)
    Preconditions: Task 6 완료
    Steps:
      1. grep "RECORD_TYPES\|RECORD_TYPE_LABELS" app/routes/public/logs/\$recordSlug.edit.tsx
      2. 상수 import 확인
      3. grep -c "exploration\|learning\|project\|retrospective\|hobby\|encounter" 또는 RECORD_TYPES 순회 확인
    Expected Result: 상수 import + 동적 생성 확인
    Failure Indicators: 하드코딩된 "personal" 잔존
    Evidence: .sisyphus/evidence/task-6-type-radio.txt

  Scenario: typecheck 통과
    Tool: Bash
    Preconditions: Task 6 완료
    Steps:
      1. pnpm typecheck
    Expected Result: exit code 0
    Failure Indicators: 타입 에러
    Evidence: .sisyphus/evidence/task-6-typecheck.txt
  ```

  **Commit**: YES
  - Message: `feat: 수정 페이지 유형 선택기 6개 옵션으로 확장`
  - Files: `app/routes/public/logs/$recordSlug.edit.tsx`
  - Pre-commit: `pnpm typecheck`

- [x] 7. 작성 페이지에 유형 선택기 추가

  **What to do**:
  - `app/routes/public/write/note.tsx`:
    - `RECORD_TYPES`, `RECORD_TYPE_LABELS`, `DEFAULT_RECORD_TYPE` import
    - 유형 RadioGroup 추가 (내용 필드 위에, 기존 visibility 옆 또는 위)
    - 기존 action의 `type: "personal"` → `formData.get("type") || DEFAULT_RECORD_TYPE`
    - 기본 선택값: `DEFAULT_RECORD_TYPE` ("exploration")
  - `app/routes/public/write/article.tsx`:
    - 동일하게 RadioGroup 추가 (리듬 필드 위에)
    - 기존 action의 `type: "personal"` → `formData.get("type") || DEFAULT_RECORD_TYPE`
    - 기본 선택값: `DEFAULT_RECORD_TYPE` ("exploration")
  - 두 페이지 모두 compact한 chip/button 그룹 스타일 (수정 페이지와 동일한 RadioGroup 패턴)

  **Must NOT do**:
  - 작성 페이지의 기존 필드 순서 변경 금지
  - meta.$recordId.tsx 수정 금지
  - 유형별 아이콘/색상 추가 금지

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 두 파일에 동일한 RadioGroup 패턴 추가 + action 수정
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 2 내에서)
  - **Parallel Group**: Wave 2 (with Tasks 4, 5, 6, 8)
  - **Blocks**: None
  - **Blocked By**: Task 2 (상수 파일)

  **References**:

  **Pattern References**:
  - `app/routes/public/write/note.tsx:93` — 현재 `type: "personal"` 하드코딩 위치
  - `app/routes/public/write/note.tsx:151-209` — 현재 폼 JSX (유형 선택기 삽입 위치 결정)
  - `app/routes/public/write/article.tsx:130` — 현재 `type: "personal"` 하드코딩 위치
  - `app/routes/public/write/article.tsx:204-313` — 현재 폼 JSX
  - `app/routes/public/logs/$recordSlug.edit.tsx:369-388` — RadioGroup 패턴 참조 (동일 UI 복사)

  **WHY Each Reference Matters**:
  - note.tsx와 article.tsx의 action에서 type 하드코딩을 formData 기반으로 변경해야 함
  - 기존 JSX 구조를 읽어야 유형 선택기 삽입 위치 결정 가능
  - edit.tsx의 RadioGroup 패턴을 그대로 복사하여 UI 일관성 유지

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Note 작성 페이지에 유형 선택기 존재
    Tool: Bash (grep)
    Preconditions: Task 7 완료
    Steps:
      1. grep "RECORD_TYPES\|RECORD_TYPE_LABELS\|RadioGroup" app/routes/public/write/note.tsx
      2. import + JSX 확인
      3. grep 'type:.*"personal"' app/routes/public/write/note.tsx — 하드코딩 잔존 확인
    Expected Result: RadioGroup 존재, "personal" 하드코딩 없음
    Failure Indicators: RadioGroup 없음 또는 "personal" 잔존
    Evidence: .sisyphus/evidence/task-7-note.txt

  Scenario: Article 작성 페이지에 유형 선택기 존재
    Tool: Bash (grep)
    Preconditions: Task 7 완료
    Steps:
      1. grep "RECORD_TYPES\|RECORD_TYPE_LABELS\|RadioGroup" app/routes/public/write/article.tsx
      2. import + JSX 확인
      3. grep 'type:.*"personal"' app/routes/public/write/article.tsx — 하드코딩 잔존 확인
    Expected Result: RadioGroup 존재, "personal" 하드코딩 없음
    Failure Indicators: RadioGroup 없음 또는 "personal" 잔존
    Evidence: .sisyphus/evidence/task-7-article.txt

  Scenario: typecheck + build 통과
    Tool: Bash
    Preconditions: Task 7 완료
    Steps:
      1. pnpm typecheck && pnpm build
    Expected Result: exit code 0
    Failure Indicators: 타입 에러 또는 빌드 실패
    Evidence: .sisyphus/evidence/task-7-build.txt
  ```

  **Commit**: YES
  - Message: `feat: 작성 페이지에 유형 선택기 추가`
  - Files: `app/routes/public/write/note.tsx`, `app/routes/public/write/article.tsx`
  - Pre-commit: `pnpm typecheck`

- [x] 8. 전체 UI에서 새 기록 유형 반영

  **What to do**:
  - 아래 모든 파일에서 `"personal"`, `"challenge"`, `"collaboration"` 관련 유형 참조를 새 유형으로 업데이트:

  **Display Labels (인라인 → 상수 import로 교체)**:
  - `app/routes/public/index.tsx:156-160` — TYPE_LABELS 매핑 → RECORD_TYPE_LABELS import
  - `app/routes/public/logs/$recordSlug.tsx:718-722` — 인라인 삼항 연산자 → RECORD_TYPE_LABELS[record.type]
  - `app/lib/utils/record-diff.ts:72-76` — VALUE_LABELS 매핑 → RECORD_TYPE_LABELS import
  - `app/routes/public/search.tsx:298-302` — 인라인 삼항 연산자 → RECORD_TYPE_LABELS import

  **Filter Options**:
  - `app/routes/public/logs/index.tsx:200-208` — FILTER_OPTIONS의 type values → RECORD_TYPES 기반
  - `app/components/filters/FilterBottomSheet.tsx:18-21` — TYPE_OPTIONS → RECORD_TYPES + RECORD_TYPE_LABELS

  **Type Casting (TypeScript)**:
  - `app/db/queries/records/records.server.ts:29-30, 120` — type 타입을 RecordType으로 업데이트
  - `app/routes/public/me.tsx` — record type 캐스팅 업데이트
  - `app/routes/public/learners/$learnerSlug.tsx` — record type 캐스팅 업데이트
  - `app/routes/public/tags/$tagSlug.tsx` — record type 캐스팅 업데이트

  **Admin Pages**:
  - `app/routes/admin/records/index.tsx` — 유형 필터 옵션 업데이트 (존재 시)
  - `app/routes/admin/templates/$templateId.tsx` — 유형 선택기 업데이트 (personal/challenge → 새 유형)
  - 주의: `app/routes/admin/audit.tsx`의 TARGET_TYPES는 record type이 아닌 엔티티 유형(record/stage/learner/response 등)이므로 수정 대상 아님

  **AST Grep으로 누락 찾기**: `ast_grep_search`로 `"personal" | "challenge" | "collaboration"` 문자열 리터럴을 전체 검색하여 누락된 참조 찾기

  **Must NOT do**:
  - `[COLLAB_DISABLED]` 주석 코드 블록 수정 금지 (주석 안의 코드는 건드리지 않음)
  - guide.tsx 본문 텍스트 수정 금지
  - 유형별 아이콘/색상 추가 금지
  - 새로운 UI 컴포넌트 생성 금지 (기존 패턴만 업데이트)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 15+ 파일에 걸친 광범위한 변경. TypeScript 타입 캐스팅, 인라인 라벨 교체, 필터 옵션 업데이트. typecheck가 safety net.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 2 내에서)
  - **Parallel Group**: Wave 2 (with Tasks 4, 5, 6, 7)
  - **Blocks**: Task 9
  - **Blocked By**: Task 2 (상수 파일)

  **References**:

  **Pattern References**:
  - `app/routes/public/index.tsx:156-160` — 홈페이지 유형 라벨 매핑
  - `app/routes/public/logs/$recordSlug.tsx:718-722` — 기록 상세 유형 배지
  - `app/routes/public/logs/index.tsx:200-208` — 기록 목록 필터 옵션
  - `app/components/filters/FilterBottomSheet.tsx:18-21` — 모바일 필터 유형 옵션
  - `app/lib/utils/record-diff.ts:72-76` — 변경 감지 유형 라벨
  - `app/routes/public/search.tsx:298-302` — 검색 결과 유형 표시
  - `app/db/queries/records/records.server.ts:29-30, 120` — 쿼리 유형 필터 + default
  - `app/routes/public/me.tsx` — 내 기록 유형 캐스팅
  - `app/routes/public/learners/$learnerSlug.tsx` — Learner 프로필 유형 캐스팅
  - `app/routes/public/tags/$tagSlug.tsx` — 태그 페이지 유형 캐스팅
  - `app/routes/admin/templates/$templateId.tsx` — Admin 템플릿 유형 선택기
  - 주의: `app/routes/admin/audit.tsx`는 TARGET_TYPES(record/stage/learner 등 엔티티 유형)이므로 수정 대상 아님. 건드리지 않는다.

  **API/Type References**:
  - `app/lib/constants/record-types.ts` — Task 2에서 생성한 상수 (모든 파일에서 import)

  **WHY Each Reference Matters**:
  - 각 파일이 유형을 inline 문자열로 참조하므로 모두 상수 import로 교체해야 중복 제거
  - TypeScript 캐스팅을 업데이트하지 않으면 typecheck 실패
  - `ast_grep_search`로 전체 검색해야 누락 방지

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 유형 라벨/필터/캐스팅 파일에서 구 유형 잔존 없음
    Tool: Bash (grep)
    Preconditions: Task 8 완료
    Steps:
      1. Task 8에서 수정 대상인 핵심 파일들만 정확히 검사 (audit, activity, test 파일은 범위 외):
         grep -n '"personal"\|"challenge"\|"collaboration"' \
           app/routes/public/index.tsx \
           app/routes/public/logs/index.tsx \
           app/routes/public/logs/\$recordSlug.tsx \
           app/routes/public/search.tsx \
           app/routes/public/me.tsx \
           app/routes/public/learners/\$learnerSlug.tsx \
           app/routes/public/tags/\$tagSlug.tsx \
           app/components/filters/FilterBottomSheet.tsx \
           app/lib/utils/record-diff.ts \
           app/db/queries/records/records.server.ts
      2. 위 파일들에서 구 유형 문자열이 0건이어야 함
      3. 주의: app/routes/admin/audit.tsx, app/components/activity/ActivityFeed.tsx, __tests__/ 파일은 이 검사에서 제외 (audit은 record type이 아닌 TARGET_TYPES, activity는 별도 문맥, test는 별도 업데이트 가능)
    Expected Result: 위 10개 파일에서 "personal"/"challenge"/"collaboration" 문자열 0 matches
    Failure Indicators: 1개 이상 매치
    Evidence: .sisyphus/evidence/task-8-old-types-check.txt

  Scenario: 홈페이지 유형 라벨 업데이트
    Tool: Bash (grep)
    Preconditions: Task 8 완료
    Steps:
      1. grep "RECORD_TYPE_LABELS" app/routes/public/index.tsx
    Expected Result: RECORD_TYPE_LABELS import 사용 확인
    Failure Indicators: 인라인 라벨 잔존
    Evidence: .sisyphus/evidence/task-8-home-labels.txt

  Scenario: 필터 옵션에 6개 유형
    Tool: Bash (grep)
    Preconditions: Task 8 완료
    Steps:
      1. grep "RECORD_TYPES" app/routes/public/logs/index.tsx app/components/filters/FilterBottomSheet.tsx
    Expected Result: 두 파일 모두 RECORD_TYPES import 사용
    Failure Indicators: 하드코딩된 옵션 배열 잔존
    Evidence: .sisyphus/evidence/task-8-filter-options.txt

  Scenario: pnpm typecheck 통과
    Tool: Bash
    Preconditions: Task 8 완료
    Steps:
      1. pnpm typecheck
    Expected Result: exit code 0
    Failure Indicators: 타입 에러 (캐스팅 누락)
    Evidence: .sisyphus/evidence/task-8-typecheck.txt
  ```

  **Commit**: YES
  - Message: `feat: 전체 UI에서 새 기록 유형 반영`
  - Files: ~15 files (routes, components, lib, admin)
  - Pre-commit: `pnpm typecheck`

- [x] 9. questions.server.ts 계산 유형 로직 교체

  **What to do**:
  - `app/db/queries/dialogue/questions.server.ts` line 61의 COMPUTED type SQL 교체:
    - 기존: `type: sql<"personal" | "challenge">\`case when ${records.challengeId} is not null then 'challenge' else 'personal' end\`.as("type")`
    - 변경: `type: records.type` (직접 컬럼 읽기)
  - `OpenQuestionListItem` 인터페이스 또는 관련 타입의 `type` 필드를 `RecordType`으로 업데이트
  - 이 파일에서 `RecordType`을 `app/lib/constants/record-types.ts`에서 import

  **Must NOT do**:
  - challengeId 컬럼 제거 금지
  - questions 테이블 스키마 변경 금지
  - 다른 쿼리 파일 수정 금지 (Task 8에서 처리됨)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 단일 파일에서 SQL 표현식 1개 교체 + 타입 업데이트
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (단독)
  - **Blocks**: None
  - **Blocked By**: Tasks 5 (마이그레이션 — DB에 새 유형 존재해야 함), 8 (타입 캐스팅 업데이트)

  **References**:

  **Pattern References**:
  - `app/db/queries/dialogue/questions.server.ts:61` — 수정 대상: COMPUTED type SQL
  - `app/db/queries/dialogue/questions.server.ts:1-80` — 전체 함수 컨텍스트 (어떤 쿼리에서 사용되는지)

  **API/Type References**:
  - `app/lib/constants/record-types.ts` — RecordType 타입 import 대상
  - `app/db/schema.server.ts:102` — records.type 컬럼 (직접 참조 대상)

  **WHY Each Reference Matters**:
  - line 61의 SQL case 문이 새 유형 체계와 완전 비호환 — 반드시 직접 컬럼 읽기로 교체
  - 관련 타입 인터페이스도 함께 업데이트해야 typecheck 통과

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: COMPUTED type SQL 제거 확인
    Tool: Bash (grep)
    Preconditions: Task 9 완료
    Steps:
      1. grep "case when.*challengeId.*then.*challenge" app/db/queries/dialogue/questions.server.ts
    Expected Result: 0 matches
    Failure Indicators: COMPUTED type SQL 잔존
    Evidence: .sisyphus/evidence/task-9-computed-type.txt

  Scenario: 직접 컬럼 읽기 확인
    Tool: Bash (grep)
    Preconditions: Task 9 완료
    Steps:
      1. grep "records.type" app/db/queries/dialogue/questions.server.ts
    Expected Result: records.type 직접 참조 확인
    Failure Indicators: records.type 미사용
    Evidence: .sisyphus/evidence/task-9-direct-read.txt

  Scenario: pnpm typecheck + build 통과
    Tool: Bash
    Preconditions: Task 9 완료
    Steps:
      1. pnpm typecheck && pnpm build
    Expected Result: exit code 0
    Failure Indicators: 타입 에러
    Evidence: .sisyphus/evidence/task-9-typecheck.txt
  ```

  **Commit**: YES
  - Message: `fix: questions.server.ts 계산 유형을 직접 컬럼 읽기로 교체`
  - Files: `app/db/queries/dialogue/questions.server.ts`
  - Pre-commit: `pnpm typecheck`

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, grep for code). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run `pnpm typecheck` + `pnpm build` + `pnpm test`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names. Verify no inline type string literals outside constants file.
  Output: `Build [PASS/FAIL] | Typecheck [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high` (+ `playwright` skill if needed)
  Start from clean state. Execute EVERY QA scenario from EVERY task. Test cross-task integration: edit page with new types + code block highlighting + correct field order. Test edge cases: empty code block, unknown language, type filter with new values. Save to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff (git log/diff). Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT do" compliance. Detect cross-task contamination. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

- **Task 1**: `fix: 수정 페이지에서 미사용 템플릿 제거 및 필드 순서 변경` — $recordSlug.edit.tsx
- **Task 2**: `feat: 기록 유형 상수 파일 생성 및 Zod 검증 업데이트` — record-types.ts (NEW), validation.ts
- **Task 3**: `feat: 코드블록 구문 강조 의존성 및 CSS 테마 추가` — package.json, highlight.css (NEW)
- **Task 4**: `feat: content.server.ts에 서버사이드 구문 강조 적용` — content.server.ts
- **Task 5**: `feat: 기록 유형 확장 D1 마이그레이션` — migration SQL, seed.sql
- **Task 6**: `feat: 수정 페이지 유형 선택기 6개 옵션으로 확장` — $recordSlug.edit.tsx
- **Task 7**: `feat: 작성 페이지에 유형 선택기 추가` — note.tsx, article.tsx
- **Task 8**: `feat: 전체 UI에서 새 기록 유형 반영` — 15+ files
- **Task 9**: `fix: questions.server.ts 계산 유형을 직접 컬럼 읽기로 교체` — questions.server.ts

---

## Success Criteria

### Verification Commands
```bash
pnpm typecheck           # Expected: no errors
pnpm build               # Expected: build success
pnpm test                # Expected: all tests pass
wrangler d1 migrations apply DB --local  # Expected: migration applied
```

### Final Checklist
- [ ] 수정 페이지 필드 순서: 유형→리듬→날짜→제목→내용→(url)→(refs)→응답→태그→공개범위
- [ ] 템플릿 관련 코드 0줄 (grep "templateId" returns 0)
- [ ] 코드블록에 `.hljs-keyword` 등 토큰 클래스 적용
- [ ] 6개 유형 라디오 버튼 (수정 + 작성 페이지)
- [ ] 유형 필터에 6개 옵션
- [ ] 기존 records 마이그레이션 완료
- [ ] `[COLLAB_DISABLED]` 코드 건드리지 않음
- [ ] 클라이언트 번들에 lowlight/highlight.js 없음
