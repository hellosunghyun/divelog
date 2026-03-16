# 노트/아티클 작성·열람 경험 분리

## TL;DR

> **Quick Summary**: 현재 12개 필드가 뒤섞인 단일 `/write` 폼을 해체하여, 노트는 찌그리듯 3필드로 빠르게, 아티클은 넓은 화면에서 여유롭게 쓸 수 있도록 분리한다. 질문·태그·응답선호는 저장 후 2단계로 분리.
> 
> **Deliverables**:
> - `/write` 모드 선택 랜딩
> - `/write/note` 노트 전용 작성 (3필드: 내용+공개범위+구간)
> - `/write/article` 아티클 전용 작성 (제목+에디터+공개범위+구간)
> - `/logs/:slug/details` 2단계 메타데이터 (질문·태그·응답선호)
> - `/logs` 목록 탭 분리 (전체/노트/글)
> - GlobalNav CTA 분리 (짧은 메모 / 글 쓰기)
> - 수정 페이지 format 감지 후 적절한 UI
> 
> **Estimated Effort**: Medium (1-2 days)
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: T1→T3→T5→T6→T7 (validation→note editor→note route→article route→details)

---

## Context

### Original Request
"짧은글과 긴글 보는곳을 나누고 입력하는방식도 다르게하자. 왜냐면 지금 기록남기기 UI UX가 너무 복잡해."
- 노트는 진짜 찌그리듯이 짧게도 적을 수 있어야 함. 마우스 없이도.
- 아티클은 좀더 화면이 넓어야 함
- 남겨줄 질문이나 응답원하시나요 같은건 다음 페이지로 넘겨도 될 것 같음
- 공개범위는 위로 옮겨도 될 것 같음

### Interview Summary
**Key Discussions**:
- 노트 = 트위터/슬랙 느낌, ⌘+Enter로 저장, auto-expand, 제목 자동 생성
- 아티클 = Notion 느낌, 넓은 에디터, 1단계(작성) → 2단계(메타데이터)
- 목록은 탭으로 노트/글 분리
- GlobalNav는 두 진입점 (짧은 메모 / 글 쓰기)

**Research Findings**:
- DB title: NOT NULL, min 1 → 노트 자동 생성 필요 (첫 30자, 마크다운 스트립)
- records 테이블 변경 없음, format 필드로 구분
- routes.ts에 명시적 라우트 등록 필요 (자동 감지 아님)
- NoteEditor에 ⌘+Enter 미지원 → 추가 필요
- 현재 article만 mentions/refs 추출 (note는 이미 스킵)

### Metis Review
**Identified Gaps** (addressed):
- 기존 `/write` 북마크 호환: `/write`를 모드 선택 페이지로 유지하여 해결
- 수정 페이지 format 전환: format 표시만 하고 변경 불가로 결정
- 노트 제목 자동 생성 엣지 케이스: generateNoteTitle() 유틸 + 단위 테스트로 커버
- `/details` 중복 접근: question upsert 패턴 적용
- 노트 @mention 힌트: NoteEditor에서 제거 (서버 처리 없으므로)
- 템플릿: article 전용 (노트에서 숨김)

---

## Work Objectives

### Core Objective
12개 필드의 단일 작성 폼을 해체하여 노트(3필드)와 아티클(4필드+2단계)로 분리하고, 열람도 탭으로 구분.

### Concrete Deliverables
- `app/routes/_public.write.tsx` — 모드 선택 랜딩 (rewrite)
- `app/routes/_public.write.note.tsx` — 노트 전용 작성 (new)
- `app/routes/_public.write.article.tsx` — 아티클 전용 작성 (new)
- `app/routes/_public.logs.$recordSlug.details.tsx` — 2단계 메타데이터 (new)
- `app/routes/_public.logs._index.tsx` — 탭 UI 추가 (modify)
- `app/routes/_public.logs.$recordSlug.edit.tsx` — format 감지 UI 분리 (modify)
- `app/components/GlobalNav.tsx` — CTA 분리 (modify)
- `app/components/editor/NoteEditor.tsx` — ⌘+Enter 지원 (modify)
- `app/lib/validation.ts` — createNoteSchema + createArticleSchema (modify)
- `app/lib/title.server.ts` — generateNoteTitle() (new)

### Definition of Done
- [ ] `pnpm test` 전체 통과
- [ ] `tsc --noEmit` 에러 없음
- [ ] `pnpm build` 성공
- [ ] `/write` 모드 선택 → `/write/note` → 3필드 폼 → ⌘+Enter 저장 → `/logs/:slug`
- [ ] `/write` 모드 선택 → `/write/article` → 4필드 폼 → 저장 → `/logs/:slug/details`
- [ ] `/logs` 탭 전환 (전체/노트/글) 동작
- [ ] GlobalNav에서 직접 진입 가능

### Must Have
- 노트: 내용 + 공개범위 + 구간만 보이는 초경량 폼
- 노트: ⌘+Enter (Mac) / Ctrl+Enter (Win) 키보드 저장
- 노트: 제목 자동 생성 (첫 30자, 마크다운 스트립)
- 아티클: 제목 + TipTap 에디터 + 공개범위 + 구간
- 2단계: 질문 · 태그 · 응답선호 (선택적, 건너뛸 수 있음)
- 목록: 전체/노트/글 탭
- GlobalNav: 두 진입점

### Must NOT Have (Guardrails)
- 자동 저장 (AGENTS.md 금지)
- 노트용 Rich text 에디터 (textarea만)
- DB 스키마 변경 / 마이그레이션
- 새 npm 패키지
- 좋아요/인기순/랭킹
- format 전환 기능 (수정 페이지에서)
- `as any`, `@ts-ignore`

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed.

### Test Decision
- **Infrastructure exists**: YES (Vitest, 4 test files, 47 tests)
- **Automated tests**: YES (Tests-after for validation + utility)
- **Framework**: Vitest

### QA Policy
- **Validation schemas**: unit test with Vitest
- **generateNoteTitle**: unit test with edge cases
- **Routes**: `tsc --noEmit` + `pnpm build` + Playwright smoke test
- **Full**: `pnpm test` after each wave

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation — TDD, 병렬):
├── T1: Validation 스키마 분리 (createNoteSchema + createArticleSchema) [quick]
├── T2: generateNoteTitle() 유틸 + 단위 테스트 [quick]
└── T3: NoteEditor ⌘+Enter 지원 + @mention 힌트 제거 [quick]

Wave 2 (Core Routes — 순차, T1-T3 완료 후):
├── T4: /write 모드 선택 랜딩 페이지 (rewrite) [visual-engineering]
├── T5: /write/note 노트 전용 작성 라우트 [deep]
├── T6: /write/article 아티클 전용 작성 라우트 [deep]
└── T7: /logs/:slug/details 2단계 메타데이터 라우트 [deep]

Wave 3 (Polish — T4-T7 완료 후, 병렬):
├── T8: /logs 목록 탭 UI (전체/노트/글) [quick]
├── T9: GlobalNav CTA 분리 (짧은 메모 / 글 쓰기) [quick]
├── T10: 수정 페이지 format 감지 UI 분리 [unspecified-high]
└── T11: 빌드 + 배포 + 검증 [quick]

Wave FINAL (검증):
├── F1: Plan compliance audit [oracle]
├── F2: Code quality review [unspecified-high]
├── F3: Real manual QA [unspecified-high]
└── F4: Scope fidelity check [deep]

Critical Path: T1 → T5 → T6 → T7 → T11
Parallel Speedup: ~50% faster than sequential
Max Concurrent: 3 (Wave 1)
```

### Dependency Matrix

| Task | Depends On | Blocks |
|------|-----------|--------|
| T1 | — | T5, T6, T7 |
| T2 | — | T5 |
| T3 | — | T5 |
| T4 | — | T11 |
| T5 | T1, T2, T3 | T7, T11 |
| T6 | T1 | T7, T11 |
| T7 | T5, T6 | T11 |
| T8 | — | T11 |
| T9 | — | T11 |
| T10 | T1 | T11 |
| T11 | ALL | F1-F4 |

### Agent Dispatch Summary

| Wave | Tasks | Categories |
|------|-------|-----------|
| 1 | 3 | T1→`quick`, T2→`quick`, T3→`quick` |
| 2 | 4 | T4→`visual-engineering`, T5→`deep`, T6→`deep`, T7→`deep` |
| 3 | 4 | T8→`quick`, T9→`quick`, T10→`unspecified-high`, T11→`quick` |
| FINAL | 4 | F1→`oracle`, F2→`unspecified-high`, F3→`unspecified-high`, F4→`deep` |

---

## TODOs

### Wave 1 (Foundation — 병렬)

- [x] 1. Validation 스키마 분리

  **What to do**:
  - `app/lib/validation.ts`에서 `createRecordSchema`를 유지하면서 `createNoteSchema`와 `createArticleSchema`를 추가
  - `createNoteSchema`: content(min 1, max 50000) + visibility(default "cohort") + stageId(optional). title 불필요, format/type/rhythm/responsePreference는 스키마에 포함하지 않음 (action에서 하드코딩)
  - `createArticleSchema`: title(min 1, max 200) + content(min 1, max 50000, JSON 검증) + visibility(default "cohort") + stageId(optional). type/rhythm/responsePreference는 스키마에 포함하지 않음 (2단계로 이동)
  - `updateRecordMetadataSchema` 추가: question(optional, max 500) + questionDirection(optional) + responsePreference(optional) + tagIds(optional, string[])
  - 기존 `createRecordSchema`는 edit 라우트에서 계속 사용하므로 삭제하지 않음
  - 단위 테스트 작성: valid/invalid 케이스, 빈 title로 note 통과 확인, article은 title 필수 확인

  **Must NOT do**:
  - 기존 `createRecordSchema` 삭제 (edit 라우트에서 사용 중)
  - `as any` 사용

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T2, T3)
  - **Blocks**: T5, T6, T7
  - **Blocked By**: None

  **References**:
  - `app/lib/validation.ts` — 현재 createRecordSchema 정의 (lines 3-45), superRefine으로 article JSON 검증
  - `app/lib/__tests__/` — 기존 테스트 패턴

  **Acceptance Criteria**:
  - [ ] `createNoteSchema.parse({ content: "hello", visibility: "cohort" })` 성공
  - [ ] `createNoteSchema.parse({ content: "" })` 실패 (content min 1)
  - [ ] `createArticleSchema.parse({ title: "제목", content: '{"type":"doc"}', visibility: "cohort" })` 성공
  - [ ] `createArticleSchema.parse({ content: '{"type":"doc"}' })` 실패 (title 필수)
  - [ ] `updateRecordMetadataSchema.parse({})` 성공 (모든 필드 선택적)
  - [ ] `pnpm test` 통과

  **QA Scenarios**:
  ```
  Scenario: 노트 스키마 — content만으로 통과
    Tool: Bash (pnpm test)
    Steps:
      1. 테스트 파일에서 createNoteSchema.parse({ content: "test" }) 실행
      2. 에러 없이 통과 확인
    Expected Result: parse 성공, format/type/rhythm 없이 통과
    Evidence: .sisyphus/evidence/task-1-note-schema.txt

  Scenario: 아티클 스키마 — title 없이 실패
    Tool: Bash (pnpm test)
    Steps:
      1. createArticleSchema.parse({ content: '{"type":"doc"}' }) 실행
      2. ZodError 발생 확인
    Expected Result: title required 에러
    Evidence: .sisyphus/evidence/task-1-article-schema.txt
  ```

  **Commit**: `feat(validation): split createRecordSchema into note/article variants`
  - Files: `app/lib/validation.ts`, `app/lib/__tests__/validation.test.ts`
  - Pre-commit: `pnpm test`

- [x] 2. generateNoteTitle 유틸 + 테스트

  **What to do**:
  - `app/lib/title.server.ts` 신규 생성
  - `generateNoteTitle(content: string): string` 함수:
    - 마크다운 심볼 제거 (`**`, `__`, `~~`, `#`, `>`, `-`, `*`, `` ` ``)
    - 앞뒤 공백 제거
    - 첫 30자 truncate, 초과 시 "…" 추가
    - 빈 문자열이면 "메모" 반환
    - emoji만 있으면 그대로 사용
  - 단위 테스트 (6+ 케이스):
    - 일반 한국어 텍스트 30자 이하 → 그대로
    - 30자 초과 → truncate + "…"
    - `**bold**` → `bold`
    - emoji만 (`🤔🤔🤔`) → `🤔🤔🤔`
    - 빈 문자열 / 공백만 → `"메모"`
    - `# heading\nmore text` → `heading`

  **Must NOT do**:
  - 복잡한 마크다운 파서 사용 (정규식으로 간단히)
  - 새 패키지 설치

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T1, T3)
  - **Blocks**: T5
  - **Blocked By**: None

  **References**:
  - `app/lib/content.server.ts` — `getPlainText()` 함수 패턴
  - `app/lib/__tests__/content.server.test.ts` — 테스트 패턴

  **Acceptance Criteria**:
  - [ ] `generateNoteTitle("안녕하세요 오늘은 좋은 날")` → `"안녕하세요 오늘은 좋은 날"`
  - [ ] `generateNoteTitle("**bold** and _italic_")` → `"bold and italic"`
  - [ ] `generateNoteTitle("")` → `"메모"`
  - [ ] `generateNoteTitle("  ")` → `"메모"`
  - [ ] 30자 초과 → truncate + "…"
  - [ ] `pnpm test` 통과

  **QA Scenarios**:
  ```
  Scenario: 마크다운 스트립 + 30자 truncate
    Tool: Bash (pnpm test)
    Steps:
      1. generateNoteTitle("**bold** 텍스트가 30자를 넘는 아주 긴 내용의 노트입니다") 실행
      2. 결과가 마크다운 제거되고 30자 + "…"인지 확인
    Expected Result: "bold 텍스트가 30자를 넘는 아주 긴 내용의 노…"
    Evidence: .sisyphus/evidence/task-2-title-gen.txt
  ```

  **Commit**: `feat(util): add generateNoteTitle with markdown stripping`
  - Files: `app/lib/title.server.ts`, `app/lib/__tests__/title.server.test.ts`
  - Pre-commit: `pnpm test`

- [x] 3. NoteEditor ⌘+Enter 지원 + @mention 힌트 제거

  **What to do**:
  - `app/components/editor/NoteEditor.tsx` 수정:
    - `onKeyDown` 핸들러에 `(e.metaKey || e.ctrlKey) && e.key === "Enter"` 감지 추가
    - 조건 충족 시 `e.preventDefault()` + 가장 가까운 form의 submit 버튼 클릭 (`textarea.closest("form")?.querySelector('button[type="submit"]')?.click()`)
    - keyboard hints에서 `@이름 러너 태그` / `[[제목]] 기록 참조` 제거 (노트는 서버에서 처리 안 하므로)
    - 새 키보드 힌트: `⌘+Enter 저장` 추가

  **Must NOT do**:
  - NoteEditor를 Rich text 에디터로 변경
  - auto-save 추가

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T1, T2)
  - **Blocks**: T5
  - **Blocked By**: None

  **References**:
  - `app/components/editor/NoteEditor.tsx` — 현재 키보드 핸들러 (onKeyDown, lines 50-130)
  - `app/components/editor/ArticleEditor.tsx` lines 257-274 — formSubmit extension 패턴 (⌘+Enter)

  **Acceptance Criteria**:
  - [ ] NoteEditor textarea에서 ⌘+Enter 입력 시 폼 제출 트리거
  - [ ] 키보드 힌트에 `⌘+Enter 저장` 표시
  - [ ] @mention, [[reference]] 힌트 제거됨
  - [ ] 기존 마크다운 단축키 (⌘B, ⌘I, ⌘K) 유지
  - [ ] `tsc --noEmit` 에러 없음

  **QA Scenarios**:
  ```
  Scenario: ⌘+Enter 폼 제출
    Tool: Bash (tsc --noEmit)
    Steps:
      1. NoteEditor의 onKeyDown에 metaKey+Enter 핸들러 존재 확인
      2. closest("form") + submit button click 로직 확인
    Expected Result: 타입 에러 없이 컴파일
    Evidence: .sisyphus/evidence/task-3-cmd-enter.txt
  ```

  **Commit**: `feat(note-editor): add ⌘+Enter submit, remove @mention hints`
  - Files: `app/components/editor/NoteEditor.tsx`
  - Pre-commit: `tsc --noEmit`

### Wave 2 (Core Routes — T1-T3 완료 후)

- [x] 4. /write 모드 선택 랜딩 페이지

  **What to do**:
  - `app/routes/_public.write.tsx`를 완전히 rewrite
  - 기존 576줄 통합 폼 → 모드 선택 카드 2개로 교체
  - 카드 1: "짧은 메모" — 설명: "떠오르는 생각을 빠르게 남기세요. ⌘+Enter로 저장." → Link to `/write/note`
  - 카드 2: "글 쓰기" — 설명: "여유롭게 탐구의 기록을 남기세요." → Link to `/write/article`
  - loader: `requireVerified` 유지 (인증 필요)
  - action: 삭제 (이 페이지에서 폼 제출 없음)
  - meta: `{ title: "기록하기 — divelog" }` 유지
  - Quiet Depth 디자인: 두 카드를 중앙 정렬, 적절한 간격, hover 효과
  - `routes.ts`에 라우트 등록: `/write` 유지 (기존과 동일한 URL)

  **Must NOT do**:
  - 기존 action 로직 유지 (새 라우트로 이전됨)
  - 자동 리다이렉트 (사용자가 선택해야 함)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-design`]

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (sequential with T5, T6, T7)
  - **Blocks**: T11
  - **Blocked By**: None (but starts after Wave 1)

  **References**:
  - `app/routes/_public.write.tsx` — 현재 통합 폼 (전체 rewrite 대상)
  - `app/routes/_public.guide.tsx` — 비슷한 정적 페이지 패턴
  - `.docs/design.md` — Quiet Depth 카드 스펙 (radius 20-24px, padding 20-28px)

  **Acceptance Criteria**:
  - [ ] `/write` 접속 시 모드 선택 카드 2개 표시
  - [ ] 각 카드 클릭 시 `/write/note`, `/write/article`로 이동
  - [ ] 미인증 시 로그인 리다이렉트
  - [ ] `tsc --noEmit` 에러 없음

  **QA Scenarios**:
  ```
  Scenario: 모드 선택 페이지 렌더링
    Tool: Bash (tsc --noEmit + pnpm build)
    Steps:
      1. /write 라우트 타입 체크
      2. 빌드 성공 확인
    Expected Result: 에러 없이 빌드 완료
    Evidence: .sisyphus/evidence/task-4-write-landing.txt
  ```

  **Commit**: `feat(routes): add /write mode selection landing page`
  - Files: `app/routes/_public.write.tsx`, `app/routes.ts`
  - Pre-commit: `tsc --noEmit`

- [x] 5. /write/note 노트 전용 작성 라우트

  **What to do**:
  - `app/routes/_public.write.note.tsx` 신규 생성
  - **Loader**: `requireVerified` + currentStage 조회 + stages 목록 조회 (templates, collaborations 불필요)
  - **Form (3필드만)**:
    - 공개범위 select (위쪽, 기본 cohort) — `draft | cohort | public`
    - 구간 select (기본 현재 구간)
    - 내용 NoteEditor (auto-expand, placeholder "떠오르는 생각을 자유롭게...")
    - 저장 버튼 + 취소 링크
  - **Action**:
    - `createNoteSchema`로 검증
    - `generateNoteTitle(content)`로 제목 자동 생성
    - `type: "personal"`, `rhythm: "free"`, `responsePreference: "open"` 하드코딩
    - records INSERT
    - redirect to `/logs/${slug}`
    - 멘션/참조 추출 스킵
  - **State**: noteContent, hasChanges → useUnsavedWarning
  - **Layout**: max-width 640px (노트는 좁게), 중앙 정렬
  - **meta**: `{ title: "짧은 기록 — divelog" }`
  - `routes.ts`에 등록: `route("write/note", "routes/_public.write.note.tsx")`

  **Must NOT do**:
  - 제목 입력 필드 표시 (자동 생성)
  - 질문/태그/응답선호 필드 (2단계로 이동)
  - 유형/리듬 선택 (하드코딩)
  - 템플릿/협업유닛 선택
  - ArticleEditor 사용

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO (Wave 2 내 순차)
  - **Blocks**: T7, T11
  - **Blocked By**: T1, T2, T3

  **References**:
  - `app/routes/_public.write.tsx` lines 24-45 — loader 패턴 (stages, currentStage 조회)
  - `app/routes/_public.write.tsx` lines 47-199 — action 패턴 (record INSERT, slug 생성)
  - `app/components/editor/NoteEditor.tsx` — 노트 에디터 컴포넌트
  - `app/lib/validation.ts` — createNoteSchema (T1에서 생성)
  - `app/lib/title.server.ts` — generateNoteTitle (T2에서 생성)
  - `app/hooks/useUnsavedWarning.ts` — unsaved 경고 훅
  - `app/lib/utils.server.ts` — nanoid, slugify 유틸

  **Acceptance Criteria**:
  - [ ] `/write/note` 접속 시 3필드 폼 표시 (내용 + 공개범위 + 구간)
  - [ ] 내용 입력 후 ⌘+Enter로 저장 가능
  - [ ] 저장 후 `/logs/:slug`로 리다이렉트
  - [ ] 제목이 내용 첫 30자에서 자동 생성됨
  - [ ] type=personal, rhythm=free, responsePreference=open 하드코딩됨
  - [ ] `tsc --noEmit` 에러 없음

  **QA Scenarios**:
  ```
  Scenario: 노트 저장 → 리다이렉트
    Tool: Bash (tsc --noEmit + pnpm build)
    Steps:
      1. 타입 체크 통과 확인
      2. 빌드 성공 확인
      3. action 코드에서 generateNoteTitle 호출, format: "note" 하드코딩 확인
    Expected Result: 컴파일 성공, action에 title 자동 생성 로직 존재
    Evidence: .sisyphus/evidence/task-5-write-note.txt

  Scenario: 빈 내용 검증 에러
    Tool: Bash (grep)
    Steps:
      1. action에서 createNoteSchema.safeParse 호출 확인
      2. 빈 content 시 errors 반환 확인
    Expected Result: 검증 에러 인라인 표시
    Evidence: .sisyphus/evidence/task-5-validation.txt
  ```

  **Commit**: `feat(routes): add /write/note minimal note creation`
  - Files: `app/routes/_public.write.note.tsx`, `app/routes.ts`
  - Pre-commit: `tsc --noEmit`

- [x] 6. /write/article 아티클 전용 작성 라우트

  **What to do**:
  - `app/routes/_public.write.article.tsx` 신규 생성
  - **Loader**: `requireVerified` + currentStage + stages 목록 + templates (아티클은 템플릿 지원)
  - **Form (4필드)**:
    - 공개범위 select (위쪽)
    - 구간 select (기본 현재 구간)
    - 제목 input (필수)
    - 내용 ArticleEditor (TipTap, placeholder "여기에 글을 쓰세요...")
    - 저장 버튼 + 취소 링크
    - 템플릿 select (선택적, 있으면 표시)
  - **Action**:
    - `createArticleSchema`로 검증
    - `format: "article"`, `type: "personal"`, `rhythm: "free"`, `responsePreference: "open"` 하드코딩
    - records INSERT
    - 멘션/참조 추출 + 알림 생성 (기존 로직 유지)
    - redirect to `/logs/${slug}/details` (2단계로)
  - **State**: title, articleContent, appliedTemplateId, hasChanges → useUnsavedWarning
  - **Layout**: max-width 960px (현재와 동일, 넓은 에디터)
  - **meta**: `{ title: "글 쓰기 — divelog" }`
  - `routes.ts`에 등록: `route("write/article", "routes/_public.write.article.tsx")`

  **Must NOT do**:
  - 질문/태그/응답선호 필드 (2단계로 이동)
  - 유형/리듬 선택 (하드코딩)
  - NoteEditor 사용

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (T5와 동시 가능, 파일 충돌 없음)
  - **Blocks**: T7, T11
  - **Blocked By**: T1

  **References**:
  - `app/routes/_public.write.tsx` lines 47-199 — 현재 action (멘션/참조 추출 로직)
  - `app/components/editor/ArticleEditor.tsx` — 아티클 에디터 props
  - `app/lib/validation.ts` — createArticleSchema (T1에서 생성)
  - `app/lib/extract-references.server.ts` — extractUserMentions, extractRecordRefs
  - `app/db/queries/mentions.server.ts` — syncMentionsForRecord
  - `app/db/queries/recordLinks.server.ts` — syncRecordLinksForRecord

  **Acceptance Criteria**:
  - [ ] `/write/article` 접속 시 4필드 폼 표시 (공개범위 + 구간 + 제목 + 에디터)
  - [ ] 제목 필수 — 빈 제목 시 검증 에러
  - [ ] TipTap 에디터 정상 로드 (슬래시 메뉴, 멘션, 이미지 업로드)
  - [ ] 저장 후 `/logs/:slug/details`로 리다이렉트
  - [ ] 멘션/참조 추출 + 알림 생성 동작
  - [ ] `tsc --noEmit` 에러 없음

  **QA Scenarios**:
  ```
  Scenario: 아티클 저장 → details 리다이렉트
    Tool: Bash (tsc --noEmit + pnpm build)
    Steps:
      1. action에서 redirect(`/logs/${slug}/details`) 확인
      2. 멘션/참조 추출 로직 존재 확인
    Expected Result: 저장 후 2단계 페이지로 리다이렉트
    Evidence: .sisyphus/evidence/task-6-write-article.txt
  ```

  **Commit**: `feat(routes): add /write/article article creation`
  - Files: `app/routes/_public.write.article.tsx`, `app/routes.ts`
  - Pre-commit: `tsc --noEmit`

- [x] 7. /logs/:slug/details 2단계 메타데이터

  **What to do**:
  - `app/routes/_public.logs.$recordSlug.details.tsx` 신규 생성
  - **Loader**: 
    - record 조회 (by slug)
    - 작성자만 접근 가능 (`currentUserId === record.authorId`)
    - 기존 question 조회 (있으면 pre-populate)
    - 기존 tags 조회 (있으면 pre-populate)
    - 전체 tags 목록 조회
  - **Form**:
    - "이 기록에 세부 설정을 추가할 수 있습니다" 안내 텍스트
    - 질문 textarea (선택적, 기존 값 있으면 표시)
    - 질문 방향 radio (질문이 있을 때만 표시)
    - 응답 선호도 select
    - 태그 체크박스 그룹
    - "저장" 버튼 + "건너뛰기" 링크 (→ `/logs/:slug`)
  - **Action**:
    - `updateRecordMetadataSchema`로 검증
    - question: 기존 question 있으면 UPDATE, 없으면 INSERT
    - responsePreference: records UPDATE
    - tags: 기존 삭제 + 새로 INSERT (기존 edit 패턴)
    - redirect to `/logs/${slug}`
  - **Layout**: max-width 640px
  - **meta**: `{ title: "세부 설정 — divelog" }`
  - `routes.ts`에 등록: `route("logs/:recordSlug/details", "routes/_public.logs.$recordSlug.details.tsx")`

  **Must NOT do**:
  - 비작성자 접근 허용
  - 제목/내용 수정 (그건 edit 페이지)
  - 자동 저장

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocks**: T11
  - **Blocked By**: T5, T6

  **References**:
  - `app/routes/_public.logs.$recordSlug.edit.tsx` lines 24-70 — record 조회 + 권한 체크 패턴
  - `app/routes/_public.logs.$recordSlug.edit.tsx` lines 134-147 — tag sync 패턴
  - `app/routes/_public.write.tsx` lines 134-143 — question INSERT 패턴
  - `app/db/queries/tags.server.ts` — getAllTags, getTagsByRecord
  - `app/lib/validation.ts` — updateRecordMetadataSchema (T1에서 생성)

  **Acceptance Criteria**:
  - [ ] `/logs/:slug/details` 접속 시 질문·태그·응답선호 폼 표시
  - [ ] "건너뛰기" 클릭 시 `/logs/:slug`로 이동
  - [ ] 질문 입력 + 저장 시 questions 테이블에 INSERT/UPDATE
  - [ ] 태그 선택 + 저장 시 recordTags 동기화
  - [ ] 비작성자 접근 시 404
  - [ ] `tsc --noEmit` 에러 없음

  **QA Scenarios**:
  ```
  Scenario: 메타데이터 저장 flow
    Tool: Bash (tsc --noEmit + pnpm build)
    Steps:
      1. loader에서 record 소유자 확인 로직 존재
      2. action에서 question upsert + tag sync 로직 존재
      3. 빌드 성공
    Expected Result: 2단계 폼이 올바르게 작동
    Evidence: .sisyphus/evidence/task-7-details.txt

  Scenario: 건너뛰기 → 기록 상세 이동
    Tool: Bash (grep)
    Steps:
      1. "건너뛰기" Link 컴포넌트가 /logs/:slug로 향하는지 확인
    Expected Result: Link to={`/logs/${slug}`} 존재
    Evidence: .sisyphus/evidence/task-7-skip.txt
  ```

  **Commit**: `feat(routes): add /logs/:slug/details step-2 metadata`
  - Files: `app/routes/_public.logs.$recordSlug.details.tsx`, `app/routes.ts`
  - Pre-commit: `tsc --noEmit`

### Wave 3 (Polish — T4-T7 완료 후, 병렬)

- [x] 8. /logs 목록 탭 UI

  **What to do**:
  - `app/routes/_public.logs._index.tsx` 수정
  - FilterBar 위에 탭 UI 추가: "전체" / "노트" / "글"
  - 탭은 URL 파라미터 사용: `?format=note`, `?format=article`, 파라미터 없으면 전체
  - 기존 FilterBar의 "형식" 필터를 제거 (탭으로 대체)
  - 탭 스타일: Quiet Depth 디자인, active 탭 underline or 배경 강조
  - 기존 FILTER_OPTIONS에서 "format" 항목 제거

  **Must NOT do**:
  - 좋아요/인기순/랭킹 추가
  - 기존 sort/view/page 로직 변경

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 3 내 병렬)
  - **Blocks**: T11
  - **Blocked By**: None (독립적)

  **References**:
  - `app/routes/_public.logs._index.tsx` lines 113-144 — FILTER_OPTIONS 정의
  - `app/routes/_public.logs._index.tsx` lines 160-219 — JSX 렌더링
  - `app/components/FilterBar.tsx` — 필터 컴포넌트

  **Acceptance Criteria**:
  - [ ] 3개 탭 (전체/노트/글) 표시
  - [ ] 탭 클릭 시 URL 파라미터 변경 + 목록 갱신
  - [ ] 기존 FilterBar에서 "형식" 필터 제거
  - [ ] `tsc --noEmit` 에러 없음

  **QA Scenarios**:
  ```
  Scenario: 탭 URL 파라미터 반영
    Tool: Bash (grep + tsc --noEmit)
    Steps:
      1. _public.logs._index.tsx에서 "전체" / "노트" / "글" 탭 렌더링 코드 존재 확인
      2. 탭이 ?format=note, ?format=article 파라미터를 Link/useSearchParams로 설정하는지 확인
      3. FILTER_OPTIONS에서 format 항목이 제거되었는지 확인
      4. tsc --noEmit 통과
    Expected Result: 3개 탭 렌더링, URL 파라미터 연동, format 필터 제거, 타입 에러 없음
    Evidence: .sisyphus/evidence/task-8-tabs.txt
  ```

  **Commit**: `feat(logs): add format tabs to listing page`
  - Files: `app/routes/_public.logs._index.tsx`
  - Pre-commit: `tsc --noEmit`

- [x] 9. GlobalNav CTA 분리

  **What to do**:
  - `app/components/GlobalNav.tsx` 수정
  - 기존 "기록 남기기" 단일 버튼 → 두 버튼으로 분리:
    - "짧은 메모" → `/write/note` (보조 스타일, 작은 버튼)
    - "글 쓰기" → `/write/article` (기본 CTA 스타일)
  - 4곳 모두 업데이트: desktop auth (line 124-133), desktop unauth (line 156-166), mobile auth (line 241-249), mobile unauth (line 270-278)
  - 모바일 메뉴: 세로 배치로 두 버튼 나열

  **Must NOT do**:
  - nav links 구조 변경 (여정/기록/챌린지/러너/가이드)
  - 인증 로직 변경

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 3 내 병렬)
  - **Blocks**: T11
  - **Blocked By**: None (독립적)

  **References**:
  - `app/components/GlobalNav.tsx` — 현재 CTA 4곳 (lines 124-133, 156-166, 241-249, 270-278)

  **Acceptance Criteria**:
  - [ ] Desktop: "짧은 메모" + "글 쓰기" 두 버튼 표시
  - [ ] Mobile: 메뉴에서 두 진입점 표시
  - [ ] 인증/비인증 모두 올바른 버튼 표시
  - [ ] `tsc --noEmit` 에러 없음

  **QA Scenarios**:
  ```
  Scenario: 4곳 CTA 모두 교체 확인
    Tool: Bash (grep + tsc --noEmit)
    Steps:
      1. GlobalNav.tsx에서 "/write" 단독 링크가 0개인지 확인 (grep -c '"/write"' — 0이어야 함, /write/note와 /write/article만 존재)
      2. "/write/note" 링크가 최소 2개 존재 확인 (desktop + mobile)
      3. "/write/article" 링크가 최소 2개 존재 확인 (desktop + mobile)
      4. tsc --noEmit 통과
    Expected Result: 기존 /write 단독 링크 0개, /write/note + /write/article 각 2+개, 타입 에러 없음
    Evidence: .sisyphus/evidence/task-9-globalnav.txt
  ```

  **Commit**: `feat(nav): split GlobalNav CTA into note/article entries`
  - Files: `app/components/GlobalNav.tsx`
  - Pre-commit: `tsc --noEmit`

- [x] 10. 수정 페이지 format 감지 UI 분리

  **What to do**:
  - `app/routes/_public.logs.$recordSlug.edit.tsx` 수정
  - record.format 감지하여 적절한 에디터 UI 표시:
    - note: 제목 input + NoteEditor + 공개범위 + 구간 + 태그 + 응답선호
    - article: 제목 input + ArticleEditor + 공개범위 + 구간 + 태그 + 응답선호
  - format 전환 라디오 제거 (format은 표시만, 변경 불가)
  - **hidden input 추가**: `<input type="hidden" name="format" value={record.format} />` — 현재 action(line 76)이 formData에서 format을 읽으므로, hidden input으로 기존 format 값을 전달해야 함. 이것이 없으면 article 수정이 note로 저장됨.
  - 기존 action 로직 유지 (format 기반 분기, 태그 sync 포함)
  - note 수정 시에도 제목 편집 가능 (자동 생성된 제목 수정 허용)
  - 질문 편집은 이 페이지 범위에 포함하지 않음 — 질문 관리는 `/details`에서 처리
  - 기존 edit action은 이미 태그 sync (lines 134-147)와 record update (lines 101-133)를 지원하므로 action 변경 불필요

  **Must NOT do**:
  - format 전환 허용
  - action 로직 대폭 변경 (태그 sync와 record update는 기존 그대로)
  - 질문 필드 추가 (질문은 /details에서 관리)
  - 새 라우트 생성 (기존 edit 라우트 유지)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 3 내 병렬)
  - **Blocks**: T11
  - **Blocked By**: T1

  **References**:
  - `app/routes/_public.logs.$recordSlug.edit.tsx` — 현재 수정 폼 (452줄)
  - `app/routes/_public.logs.$recordSlug.edit.tsx` lines 209-231 — format 전환 경고 (제거 대상)
  - `app/routes/_public.logs.$recordSlug.edit.tsx` lines 101-133 — record UPDATE action
  - `app/routes/_public.logs.$recordSlug.edit.tsx` lines 134-147 — tag sync action
  - `app/routes/_public.logs.$recordSlug.edit.tsx` lines 23-59 — loader (record + tags 조회)

  **Acceptance Criteria**:
  - [ ] note 수정 시 NoteEditor 표시, format 라디오 없음
  - [ ] article 수정 시 ArticleEditor 표시, format 라디오 없음
  - [ ] 기존 저장/업데이트 로직 정상 동작
  - [ ] 질문 필드 미포함 (질문 관리는 /details)
  - [ ] `tsc --noEmit` 에러 없음

  **QA Scenarios**:
  ```
  Scenario: format 라디오 제거 + hidden input + 에디터 분기 확인
    Tool: Bash (grep + tsc --noEmit)
    Steps:
      1. edit.tsx에서 format 라디오 input (type="radio" name="format") 이 제거되었는지 확인
      2. hidden format input (type="hidden" name="format" value={record.format}) 존재 확인
      3. record.format === "note" 분기에서 NoteEditor 렌더링 확인
      4. record.format === "article" 분기에서 ArticleEditor 렌더링 확인
      5. action에서 기존 updateRecord + tag sync 로직 유지 확인
      6. tsc --noEmit 통과
    Expected Result: format 라디오 0개, hidden format 1개, format 기반 에디터 분기, 타입 에러 없음
    Evidence: .sisyphus/evidence/task-10-edit.txt
  ```

  **Commit**: `refactor(edit): split edit UI by format detection`
  - Files: `app/routes/_public.logs.$recordSlug.edit.tsx`
  - Pre-commit: `tsc --noEmit`

- [x] 11. 빌드 + 배포 + 검증

  **What to do**:
  - `pnpm test` 전체 통과 확인
  - `tsc --noEmit` 에러 없음 확인
  - `pnpm build` 성공 확인
  - `npx wrangler deploy --config wrangler.deploy.toml` 배포

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Blocked By**: ALL (T1-T10)

  **Acceptance Criteria**:
  - [ ] `pnpm test` 전체 통과
  - [ ] `tsc --noEmit` 에러 없음
  - [ ] `pnpm build` 성공
  - [ ] 배포 성공

  **QA Scenarios**:
  ```
  Scenario: 전체 빌드 파이프라인 통과
    Tool: Bash
    Steps:
      1. pnpm test 실행 → 전체 테스트 통과 확인 (exit code 0)
      2. npx tsc --noEmit 실행 → 에러 없음 확인 (exit code 0)
      3. pnpm build 실행 → 빌드 성공 확인 ("built in" 메시지)
      4. npx wrangler deploy --config wrangler.deploy.toml → 배포 성공 ("Deployed" 메시지)
    Expected Result: 4단계 모두 성공, 각 exit code 0
    Evidence: .sisyphus/evidence/task-11-build-deploy.txt

  Scenario: 라우트 등록 확인
    Tool: Bash (grep)
    Steps:
      1. routes.ts에서 "write/note" 라우트 등록 확인
      2. routes.ts에서 "write/article" 라우트 등록 확인
      3. routes.ts에서 "logs/:recordSlug/details" 라우트 등록 확인
    Expected Result: 3개 신규 라우트 모두 routes.ts에 등록됨
    Evidence: .sisyphus/evidence/task-11-routes.txt
  ```

  **Commit**: `chore: final build + deploy`
  - Pre-commit: `pnpm test && tsc --noEmit && pnpm build`

---

## Final Verification Wave (4 parallel)

- [ ] F1. **Plan Compliance Audit** — `deep`
  Read the plan end-to-end. For each "Must Have" in Work Objectives: verify implementation exists (read file, grep for key code). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Compare deliverables against plan.

  **QA Scenarios**:
  ```
  Scenario: Must Have 항목 전체 검증
    Tool: Bash (grep)
    Steps:
      1. grep -r "createNoteSchema" app/routes/_public.write.note.tsx → 존재 확인
      2. grep -r "generateNoteTitle" app/routes/_public.write.note.tsx → 존재 확인
      3. grep -r "createArticleSchema" app/routes/_public.write.article.tsx → 존재 확인
      4. grep -r "metaKey.*Enter\|ctrlKey.*Enter" app/components/editor/NoteEditor.tsx → ⌘+Enter 존재 확인
      5. grep -r "/write/note\|/write/article" app/components/GlobalNav.tsx → 두 진입점 확인
      6. grep -rn "format.*tab\|전체.*노트.*글" app/routes/_public.logs._index.tsx → 탭 존재 확인
    Expected Result: 모든 grep 결과 매치 (exit code 0)
    Evidence: .sisyphus/evidence/f1-must-have.txt

  Scenario: Must NOT Have 항목 부재 확인
    Tool: Bash (grep)
    Steps:
      1. grep -rn "as any" app/routes/_public.write.note.tsx app/routes/_public.write.article.tsx → 0건
      2. grep -rn "auto.save\|autoSave\|auto_save" app/ → 0건
      3. git diff --stat HEAD~11 → DB migration 파일 0건
    Expected Result: 금지 항목 모두 부재
    Evidence: .sisyphus/evidence/f1-must-not-have.txt
  ```
  Output: `Must Have [N/N] | Must NOT Have [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run `tsc --noEmit` + `pnpm test` + grep-based quality checks. (이 프로젝트에 별도 linter/eslint 설정이 없으므로 grep으로 대체.)

  **QA Scenarios**:
  ```
  Scenario: 빌드 + 타입 + 테스트 전체 통과
    Tool: Bash
    Steps:
      1. npx tsc --noEmit → exit code 0
      2. pnpm test → 전체 통과
      3. pnpm build → 성공
    Expected Result: 3단계 모두 성공
    Evidence: .sisyphus/evidence/f2-build.txt

  Scenario: grep 기반 코드 품질 검사
    Tool: Bash (grep)
    Steps:
      1. grep -rn "as any\|@ts-ignore\|@ts-expect" app/routes/_public.write.*.tsx app/routes/_public.logs.*details.tsx → 0건
      2. grep -rn "console\.log" app/routes/_public.write.*.tsx app/routes/_public.logs.*details.tsx → 0건
      3. grep -rn "catch\s*{\s*}" app/routes/_public.write.*.tsx → 빈 catch 0건
    Expected Result: 모든 검사 0건
    Evidence: .sisyphus/evidence/f2-quality.txt
  ```
  Output: `Build [PASS/FAIL] | Tests [N pass/N fail] | Quality [CLEAN/N issues] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high` (+ `playwright` skill)
  Start from clean state with auth bootstrap. Test the 3 core flows end-to-end.

  **Auth Bootstrap** (모든 시나리오 전 필수):
  `.dev.vars`에 `TEST_VERIFIED_SESSION` 환경변수가 있음. Playwright에서 `adakrpos_session` 쿠키를 `.ada-kr-pos.com` 도메인에 설정하여 인증 상태를 시뮬레이션.
  ```javascript
  // Playwright에서 인증 설정
  await context.addCookies([{
    name: 'adakrpos_session',
    value: process.env.TEST_VERIFIED_SESSION,
    domain: '.ada-kr-pos.com',
    path: '/',
  }]);
  ```
  만약 `.dev.vars`에 테스트 세션이 없거나 만료되었으면, 비인증 상태에서 `/logs` 탭 전환만 테스트하고 나머지는 `tsc --noEmit` + `pnpm build` 기반 정적 검증으로 대체.

  **QA Scenarios**:
  ```
  Scenario: 노트 작성 → 저장 → 상세 페이지
    Tool: Playwright (browser, 인증 쿠키 설정 후)
    Preconditions: adakrpos_session 쿠키 설정됨
    Steps:
      1. /write 접속 → 모드 선택 카드 2개 확인
      2. "짧은 메모" 카드 클릭 → /write/note 이동
      3. 폼 필드 3개만 존재 확인 (내용, 공개범위, 구간)
      4. 내용 입력 → 저장 버튼 클릭 → /logs/:slug 리다이렉트 확인
    Expected Result: 노트 작성 flow 정상 동작
    Fallback (쿠키 없을 시): /write 접속 시 로그인 리다이렉트 확인, 이후 정적 검증으로 대체
    Evidence: .sisyphus/evidence/f3-note-flow.png

  Scenario: 아티클 작성 → 저장 → details → 상세 페이지
    Tool: Playwright (browser, 인증 쿠키 설정 후)
    Preconditions: adakrpos_session 쿠키 설정됨
    Steps:
      1. /write/article 접속 → 4필드 폼 확인 (공개범위, 구간, 제목, 에디터)
      2. 제목 + 내용 입력 → 저장 → /logs/:slug/details 리다이렉트 확인
      3. details에서 "건너뛰기" 클릭 → /logs/:slug 이동 확인
    Expected Result: 아티클 2단계 flow 정상 동작
    Fallback: 정적 검증 (action redirect 코드 확인)
    Evidence: .sisyphus/evidence/f3-article-flow.png

  Scenario: /logs 탭 전환 (인증 불필요)
    Tool: Playwright (browser)
    Steps:
      1. /logs 접속 → 탭 3개 확인 (전체/노트/글)
      2. "노트" 탭 클릭 → URL에 ?format=note 확인
      3. "글" 탭 클릭 → URL에 ?format=article 확인
    Expected Result: 탭 전환 + 필터링 정상
    Evidence: .sisyphus/evidence/f3-tabs.png
  ```
  Output: `Scenarios [N/N pass] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff. Verify 1:1 — everything in spec was built, nothing beyond spec was built.

  **QA Scenarios**:
  ```
  Scenario: 범위 초과 변경 없음 확인
    Tool: Bash (git)
    Steps:
      1. git diff --stat HEAD~11 → 변경 파일 목록 확인
      2. 변경 파일이 plan에 명시된 파일만인지 확인 (예상 외 파일 = scope creep)
      3. DB migration 파일 없음 확인
      4. package.json에 새 dependency 없음 확인 (lucide-react 제외)
    Expected Result: 모든 변경이 plan 범위 내, scope creep 없음
    Evidence: .sisyphus/evidence/f4-scope.txt
  ```
  Output: `Tasks [N/N compliant] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

| # | Message | Files | Gate |
|---|---------|-------|------|
| 1 | `feat(validation): split createRecordSchema into note/article variants` | validation.ts, tests | `pnpm test` |
| 2 | `feat(util): add generateNoteTitle with markdown stripping` | title.server.ts, tests | `pnpm test` |
| 3 | `feat(note-editor): add ⌘+Enter submit, remove @mention hints` | NoteEditor.tsx | `tsc --noEmit` |
| 4 | `feat(routes): add /write mode selection landing page` | _public.write.tsx, routes.ts | `tsc --noEmit` |
| 5 | `feat(routes): add /write/note minimal note creation` | _public.write.note.tsx, routes.ts | `tsc --noEmit` |
| 6 | `feat(routes): add /write/article article creation` | _public.write.article.tsx, routes.ts | `tsc --noEmit` |
| 7 | `feat(routes): add /logs/:slug/details step-2 metadata` | _public.logs.$recordSlug.details.tsx, routes.ts | `tsc --noEmit` |
| 8 | `refactor(edit): split edit UI by format detection` | _public.logs.$recordSlug.edit.tsx | `tsc --noEmit` |
| 9 | `feat(logs): add format tabs to listing page` | _public.logs._index.tsx | `tsc --noEmit` |
| 10 | `feat(nav): split GlobalNav CTA into note/article entries` | GlobalNav.tsx | `tsc --noEmit` |
| 11 | `chore: final build + deploy verification` | — | `pnpm build && pnpm test` |

---

## Success Criteria

### Verification Commands
```bash
pnpm test          # Expected: all tests pass (47+ existing + new validation/title tests)
tsc --noEmit       # Expected: no errors
pnpm build         # Expected: build success
```

### Final Checklist
- [ ] `/write` 모드 선택 페이지 렌더링
- [ ] `/write/note` 3필드 폼 동작, ⌘+Enter 저장, 제목 자동 생성
- [ ] `/write/article` 4필드 폼 동작, TipTap 에디터, 저장 후 details 이동
- [ ] `/logs/:slug/details` 질문·태그·응답선호 추가 가능
- [ ] `/logs` 전체/노트/글 탭 전환
- [ ] GlobalNav 두 진입점 동작
- [ ] 수정 페이지 format 감지 후 적절한 UI
- [ ] 기존 기록 상세 페이지 영향 없음
- [ ] 모든 "Must NOT Have" 항목 부재 확인
