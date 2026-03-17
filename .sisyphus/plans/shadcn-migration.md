# 네이티브 HTML → shadcn/ui 컴포넌트 마이그레이션

## TL;DR

> **Quick Summary**: 전체 앱(Public + Admin)의 네이티브 HTML 폼 요소(select, button, input, textarea, table 등)를 shadcn/ui 컴포넌트로 교체하여 일관된 디자인과 접근성을 확보한다. Quiet Depth 디자인 토큰을 shadcn 테마에 매핑하여 기존 디자인 언어를 유지한다.
>
> **Deliverables**:
> - shadcn/ui 초기화 및 Quiet Depth 테마 통합
> - 9개 shadcn 컴포넌트 설치 + 커스터마이징 (Button, Input, Textarea, Label, Select, Checkbox, RadioGroup, Table, Badge)
> - Public 영역 ~25개 라우트 파일의 네이티브 요소 교체
> - Admin 영역 ~20개 라우트 파일의 네이티브 요소 교체
> - 빌드/타입체크 통과 + Playwright 폼 기능 검증
>
> **Estimated Effort**: Large
> **Parallel Execution**: YES - 6 waves
> **Critical Path**: Task 1 → Task 2 → Tasks 3-5 → Tasks 6-11 → Tasks 12-16 → Task 17-18

---

## Context

### Original Request
네이티브 HTML 요소(select, button, input, textarea, table 등)를 shadcn/ui 등의 현대적 UI 컴포넌트로 전면 교체.

### Interview Summary
**Key Discussions**:
- UI 라이브러리: shadcn/ui 선택 (Radix UI 기반, Tailwind v4 호환, React Router 7 공식 가이드 존재)
- 범위: Public + Admin 전체 영역
- 제외: hidden inputs (React Router form action 패턴), Tiptap 에디터 (이미 커스텀)

**Research Findings**:
- 현재 프로젝트: 네이티브 select 20개, button 18+, table 12개, text input 8개, radio 5개, checkbox 7개, textarea 4개
- shadcn/ui React Router 7 공식 설치 가이드 존재 (`pnpm dlx shadcn@latest init`)
- Tailwind v4에서 `new-york` 스타일만 지원 (default 스타일 deprecated)
- `components.json`에서 `tailwind.config`는 빈 문자열이어야 함 (v4)
- lucide-react 이미 설치됨 (shadcn 아이콘 호환)
- Hex 값을 shadcn CSS 변수에 직접 사용 가능 (OKLCH 변환 불필요)

### Metis Review
**Identified Gaps** (addressed):
- shadcn Form 컴포넌트는 React Router Form과 비호환 → 개별 프리미티브만 사용, shadcn Form 컴포넌트 설치 금지
- GitHub issue #7333: 커스텀 utils 경로가 설치된 컴포넌트에 반영 안 될 수 있음 → 설치 후 import 경로 수동 검증 필수
- GitHub issue #6498: CLI init 시 `Cannot read properties of undefined` 에러 가능 → 트러블슈팅 가이드 포함
- new-york 스타일 기본 radius(6-8px)가 Quiet Depth(12-24px)와 불일치 → 테마 매핑에서 즉시 오버라이드
- Edge runtime 검증 부재 → Wave 1에 Cloudflare Pages 환경 PoC 포함
- 컴포넌트 개수 조정: 15개→9개 (Sonner, Tabs, Popover 등 현재 교체 대상 없는 것 제외)

---

## Work Objectives

### Core Objective
전체 앱의 네이티브 HTML 폼 요소를 shadcn/ui 컴포넌트로 교체하여, Quiet Depth 디자인 시스템과 일관된 시각적 품질 및 접근성을 달성한다.

### Concrete Deliverables
- `app/components/ui/` 디렉토리에 9개 shadcn 컴포넌트 설치
- `components.json` shadcn 설정 파일
- `app/lib/utils.ts` cn() 유틸리티
- CSS 테마 매핑 (Quiet Depth → shadcn variables)
- Public 라우트 6개 폼 파일 + 공유 컴포넌트 3개 마이그레이션
- Admin 라우트 ~20개 파일 (테이블 12개 + 폼 8개) 마이그레이션

### Definition of Done

> **검증 범위 예외**: `app/components/editor/` 디렉토리는 Tiptap 에디터 내부이므로 모든 네이티브 요소 검사에서 제외.

- [ ] `npx react-router build` 성공
- [ ] `tsc --noEmit` 에러 0개
- [ ] `wrangler pages dev ./build/client --d1 DB` 정상 작동
- [ ] 네이티브 `<select>` 0개 — `app/routes/`, `app/components/` 전체 (`components/editor/` 제외)
- [ ] 네이티브 `<button>` 0개 — `app/routes/`, `app/components/` 전체 (`components/editor/` 제외)
- [ ] 네이티브 `<table>` 0개 — `app/routes/` 전체
- [ ] 네이티브 `<input>` 0개 — 예외: `type="hidden"`, `type="color"`, `components/editor/`, `components/ui/`, tag-chip `type="checkbox"` ($recordSlug.edit.tsx와 $recordSlug.details.tsx에서만 허용)
- [ ] 네이티브 `<textarea>` 0개 — 예외: `components/editor/`, `components/ui/`
- [ ] 네이티브 `<label>` 0개 — 예외: `components/editor/`, `components/ui/`, tag-chip label ($recordSlug.edit.tsx와 $recordSlug.details.tsx에서만 허용)
- [ ] 모든 폼 제출 기능 정상 작동 (FormData name 속성 보존)
- [ ] 인증 필요 라우트는 정적 grep 검증 (Playwright 비인증 페이지만 브라우저 검증)

### Must Have
- shadcn/ui 컴포넌트가 Quiet Depth 디자인 토큰 (색상, radius, shadow, spacing)을 사용
- React Router `<Form>` 제출 패턴 유지 (action/loader 동작 보존)
- 기존 접근성 수준 유지 (focus ring, ARIA labels, keyboard nav)
- Admin 영역은 compact/dense 스타일 유지
- Public 영역은 generous spacing + 20-24px radius 유지

### Must NOT Have (Guardrails)
- shadcn `<Form>` 컴포넌트 사용 금지 (React Router Form과 충돌)
- OKLCH 색상 변환 시도 금지 (hex 직접 사용)
- 새로운 기능 추가 금지 (토스트, 다크모드 등 — 순수 마이그레이션만)
- Tiptap 에디터 내부 수정 금지
- hidden input 교체 금지 (React Router action 패턴 유지)
- 기존 CSS custom properties (tokens.css) 삭제 금지 — 추가만 허용
- `as any`, `@ts-ignore` 사용 금지
- 좋아요, 추천, 인기순 등 제품 guardrail 위반 요소 추가 금지

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: YES (vitest + Playwright)
- **Automated tests**: NO TDD (시각적 리팩토링이므로). 빌드/타입체크 + Playwright QA
- **Framework**: vitest (unit), Playwright (e2e)

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **빌드 검증**: `npx react-router build` + `tsc --noEmit`
- **Edge runtime**: `wrangler pages dev ./build/client --d1 DB`
- **폼 기능**: Playwright로 폼 제출 동작 검증
- **시각적 검증**: Playwright 스크린샷 캡처

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation — sequential, blocks everything):
├── Task 1: shadcn/ui 초기화 + PoC [quick]
└── Task 2: Quiet Depth 테마 매핑 [quick]

Wave 2 (Component Install — parallel, after Wave 1):
├── Task 3: Form primitives (Button, Input, Textarea, Label) [quick]
├── Task 4: Selection primitives (Select, Checkbox, RadioGroup) [quick]
└── Task 5: Data Display (Table, Badge) + Dialog [quick]

Wave 3 (Public 마이그레이션 — MAX PARALLEL, after Wave 2):
├── Task 6: 공유 컴포넌트 (FilterBar, SortBar, GlobalNav) [quick]
├── Task 7: Write Note 폼 (write/note.tsx) [quick]
├── Task 8: Edit + Details 폼 [unspecified-high]
├── Task 9: Record Detail 인라인 폼 ($recordSlug.tsx) [unspecified-high]
├── Task 10: Write Article 폼 (write/article.tsx) [unspecified-high]
└── Task 11: Settings + Inbox [quick]

Wave 4 (Admin 마이그레이션 — MAX PARALLEL, after Wave 2):
├── Task 12: Admin 테이블 A (stages, records, learners index) [unspecified-high]
├── Task 13: Admin 테이블 B (challenges, dialogue, collab, memories, templates index) [unspecified-high]
├── Task 14: Admin 테이블 C (curation, audit, tags, roles) [unspecified-high]
├── Task 15: Admin 폼 A (stages, records, challenges, collaboration detail) [unspecified-high]
└── Task 16: Admin 폼 B (tags, templates, memories, settings, roles, dialogue detail) [unspecified-high]

Wave 5 (Integration + Build 검증 — after Waves 3+4):
├── Task 17: 빌드 + 타입체크 + edge runtime 전체 검증 [deep]
└── Task 18: Playwright 폼 기능 통합 테스트 [unspecified-high]

Wave FINAL (독립 검증 — 4 parallel, after ALL):
├── Task F1: Plan compliance audit [oracle]
├── Task F2: Code quality review [unspecified-high]
├── Task F3: Real manual QA [unspecified-high]
└── Task F4: Scope fidelity check [deep]

Critical Path: Task 1 → Task 2 → Task 3 → Task 7 → Task 17 → F1-F4
Parallel Speedup: ~65% faster than sequential
Max Concurrent: 6 (Waves 3 & 4 overlap possible after Wave 2)
```

### Dependency Matrix

| Task | Depends On | Blocks | Wave |
|------|-----------|--------|------|
| 1 | — | 2 | 1 |
| 2 | 1 | 3, 4, 5 | 1 |
| 3 | 2 | 6-16 | 2 |
| 4 | 2 | 6-16 | 2 |
| 5 | 2 | 6-16 | 2 |
| 6 | 3, 4 | 17 | 3 |
| 7 | 3, 4 | 17 | 3 |
| 8 | 3, 4 | 17 | 3 |
| 9 | 3, 4 | 17 | 3 |
| 10 | 3, 4 | 17 | 3 |
| 11 | 3, 4 | 17 | 3 |
| 12 | 3, 5 | 17 | 4 |
| 13 | 3, 5 | 17 | 4 |
| 14 | 3, 5 | 17 | 4 |
| 15 | 3, 4, 5 | 17 | 4 |
| 16 | 3, 4, 5 | 17 | 4 |
| 17 | 6-16 | 18 | 5 |
| 18 | 17 | F1-F4 | 5 |
| F1-F4 | 18 | — | FINAL |

### Agent Dispatch Summary

- **Wave 1**: **2** — T1 → `quick`, T2 → `quick`
- **Wave 2**: **3** — T3-T5 → `quick`
- **Wave 3**: **6** — T6 → `quick`, T7-T9 → `unspecified-high`, T10-T11 → `quick`
- **Wave 4**: **5** — T12-T16 → `unspecified-high`
- **Wave 5**: **2** — T17 → `deep`, T18 → `unspecified-high`
- **FINAL**: **4** — F1 → `oracle`, F2-F3 → `unspecified-high`, F4 → `deep`

---

## TODOs

- [x] 1. shadcn/ui 초기화 + Edge Runtime PoC

  **What to do**:
  - `pnpm dlx shadcn@latest init` 실행 (React Router 7 감지 자동 설정)
    - 스타일: `new-york` (v4에서 유일한 옵션)
    - `components.json`에서 `tailwind.config`를 빈 문자열로 설정
    - base color: `slate`
    - `rsc: false` (React Router는 RSC 미사용)
  - `app/lib/utils.ts` 생성: `cn()` 유틸리티 (clsx + tailwind-merge)
  - 경로 alias 설정: `components.json`의 aliases를 `~/*` 패턴으로 설정 (`"utils": "~/lib/utils"`, `"components": "~/components"`, `"ui": "~/components/ui"`)
  - GitHub issue #7333 대응: 설치 후 모든 `app/components/ui/*.tsx` 파일에서 import 경로가 `~/lib/utils`를 사용하는지 확인. `@/lib/utils`로 되어있으면 `~/lib/utils`로 일괄 교체
  - GitHub issue #6498 대응: CLI init 실패 시 수동으로 `components.json` 작성 + 의존성 직접 설치 (`pnpm add class-variance-authority clsx tailwind-merge`)
  - PoC 검증: Button 컴포넌트 1개만 먼저 설치 (`pnpm dlx shadcn@latest add button`), 임시로 아무 라우트에 `<Button>Test</Button>` 추가 후 `pnpm dev` + `wrangler pages dev` 모두에서 렌더링 확인. 확인 후 임시 코드 제거.

  **Must NOT do**:
  - `@/` 경로 alias 추가 금지 (기존 `~/` 패턴 유지)
  - shadcn Form 컴포넌트 설치 금지
  - tailwind.config.ts에 shadcn 테마 추가 시도 금지 (v4는 CSS-first)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: CLI 명령어 실행 + 설정 파일 수정의 단순 작업
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `frontend-design`: 디자인 작업 아님, 인프라 설정

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 1 (sequential start)
  - **Blocks**: Task 2
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `vite.config.ts` — Vite 플러그인 설정 확인 (tailwindcss, tsconfigPaths 이미 존재)
  - `tsconfig.cloudflare.json` — 현재 `~/*` alias 설정 확인

  **API/Type References**:
  - `package.json` — 현재 의존성 목록 (lucide-react 이미 존재 확인)

  **External References**:
  - shadcn/ui React Router 설치 가이드: `https://ui.shadcn.com/docs/installation/react-router`
  - shadcn/ui Tailwind v4 가이드: `https://ui.shadcn.com/docs/tailwind-v4`
  - GitHub issue #7333 (커스텀 utils 경로 버그): `https://github.com/shadcn-ui/ui/issues/7333`
  - GitHub issue #6498 (CLI init 에러): `https://github.com/shadcn-ui/ui/issues/6498`

  **WHY Each Reference Matters**:
  - `vite.config.ts`: shadcn init이 Vite 설정을 감지하므로 현재 플러그인 구성 이해 필요
  - `tsconfig.cloudflare.json`: `~/*` alias가 있으므로 shadcn의 기본 `@/*`를 쓰지 않고 맞춤 설정 필요
  - 외부 참조들: CLI init 문제 발생 시 트러블슈팅에 필수

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: shadcn/ui 초기화 성공 검증
    Tool: Bash
    Preconditions: 프로젝트 루트에서 실행
    Steps:
      1. `cat components.json` — 파일 존재 확인
      2. `cat components.json | grep '"rsc": false'` — RSC 비활성화 확인
      3. `cat components.json | grep 'tailwind'` — tailwind.config가 빈 문자열인지 확인
      4. `cat app/lib/utils.ts` — cn() 함수 존재 확인
      5. `ls app/components/ui/button.tsx` — Button 컴포넌트 설치 확인
    Expected Result: 모든 파일 존재, 설정 값 올바름
    Failure Indicators: components.json 누락, rsc: true, button.tsx 없음
    Evidence: .sisyphus/evidence/task-1-init-verify.txt

  Scenario: import 경로 검증 (bug #7333 대응)
    Tool: Bash (grep)
    Preconditions: shadcn init + button 설치 완료
    Steps:
      1. `grep -r '@/lib/utils' app/components/ui/` — @/ 경로 사용 검색
      2. `grep -r '~/lib/utils' app/components/ui/` — ~/ 경로 사용 검색
    Expected Result: @/lib/utils 매치 0건, ~/lib/utils 매치 1건 이상
    Failure Indicators: @/lib/utils 매치가 1건 이상이면 수동 교체 필요
    Evidence: .sisyphus/evidence/task-1-import-verify.txt

  Scenario: Edge runtime PoC — wrangler pages dev 렌더링
    Tool: Bash
    Preconditions: Button 컴포넌트 임시 삽입 완료, 빌드 성공
    Steps:
      1. `npx react-router build` — 빌드 성공 확인
      2. `tsc --noEmit` — 타입 에러 없음 확인
      3. `wrangler pages dev ./build/client --d1 DB &` — 백그라운드로 wrangler 시작 (포트 8788)
      4. `sleep 5 && curl -s -o /dev/null -w '%{http_code}' http://localhost:8788/` — HTTP 200 확인
      5. `curl -s http://localhost:8788/ | grep -c 'DiveLog'` — 페이지 콘텐츠 렌더링 확인 (1 이상)
      6. wrangler 프로세스 종료
    Expected Result: 빌드 성공, wrangler 시작, HTTP 200, 페이지 콘텐츠 존재
    Failure Indicators: 빌드 실패, wrangler 시작 실패, HTTP 500/404, 빈 페이지
    Evidence: .sisyphus/evidence/task-1-edge-poc.txt
  ```

  **Evidence to Capture:**
  - [ ] task-1-init-verify.txt — components.json + utils.ts 내용
  - [ ] task-1-import-verify.txt — import 경로 grep 결과
  - [ ] task-1-edge-poc.txt — 빌드 + 타입체크 결과

  **Commit**: YES
  - Message: `chore(ui): initialize shadcn/ui for React Router 7`
  - Files: `components.json`, `app/lib/utils.ts`, `app/components/ui/button.tsx`, `package.json`, `pnpm-lock.yaml`
  - Pre-commit: `npx react-router build && tsc --noEmit`

- [x] 2. Quiet Depth → shadcn 테마 매핑

  **What to do**:
  - `app/styles/global.css`에 shadcn이 기대하는 CSS 변수 추가 (기존 tokens.css와 공존):
    ```css
    :root {
      /* shadcn/ui 테마 변수 — Quiet Depth 매핑 */
      --background: #F6F8FB;        /* = var(--color-bg) */
      --foreground: #1D1D1F;        /* = var(--color-text-primary) */
      --card: #FFFFFF;              /* = var(--color-surface) */
      --card-foreground: #1D1D1F;
      --popover: #FFFFFF;
      --popover-foreground: #1D1D1F;
      --primary: #146C94;           /* = var(--color-ocean-blue) */
      --primary-foreground: #FFFFFF;
      --secondary: #F2F5F8;         /* = var(--color-surface-secondary) */
      --secondary-foreground: #1D1D1F;
      --muted: #F2F5F8;
      --muted-foreground: #6E6E73;  /* = var(--color-text-secondary) */
      --accent: #EAF4FA;            /* = var(--color-mist-blue) */
      --accent-foreground: #0B2447; /* = var(--color-deep-ocean) */
      --destructive: #DC2626;       /* = var(--color-error) */
      --destructive-foreground: #FFFFFF;
      --border: #E3E8EF;            /* = var(--color-border) */
      --input: #E3E8EF;
      --ring: #146C94;              /* = var(--color-ocean-blue) */
      --radius: 0.75rem;            /* 12px = var(--radius-sm) — shadcn input 기본 */
    }
    ```
  - `@theme inline` 블록에 shadcn 색상을 Tailwind v4 유틸리티로 매핑:
    ```css
    @theme inline {
      --color-background: var(--background);
      --color-foreground: var(--foreground);
      --color-card: var(--card);
      --color-card-foreground: var(--card-foreground);
      --color-primary: var(--primary);
      --color-primary-foreground: var(--primary-foreground);
      --color-secondary: var(--secondary);
      --color-secondary-foreground: var(--secondary-foreground);
      --color-muted: var(--muted);
      --color-muted-foreground: var(--muted-foreground);
      --color-accent: var(--accent);
      --color-accent-foreground: var(--accent-foreground);
      --color-destructive: var(--destructive);
      --color-destructive-foreground: var(--destructive-foreground);
      --color-border: var(--border);
      --color-input: var(--input);
      --color-ring: var(--ring);
    }
    ```
  - 기존 `tokens.css`는 **수정하지 않음** — 기존 컴포넌트 호환성 유지
  - `global.css`의 `@layer base`에 shadcn 기본 스타일 추가:
    ```css
    @layer base {
      * { @apply border-border; }
      body { @apply bg-background text-foreground; }
    }
    ```
  - shadcn 컴포넌트의 radius를 Quiet Depth 스펙에 맞게 CSS 변수로 조정:
    - `--radius`: `0.75rem` (12px, input/small elements)
    - 카드 컴포넌트에서는 `rounded-[20px]` 또는 `rounded-[24px]` 직접 사용

  **Must NOT do**:
  - `tokens.css` 기존 변수 수정/삭제 금지
  - OKLCH 색상 형식 사용 금지 (hex 직접 사용)
  - 다크모드 변수 추가 금지 (현재 스코프 아님)
  - tailwind.config.ts 수정 금지 (v4는 CSS-first)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: CSS 변수 추가만, 로직 없음
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 1 (after Task 1)
  - **Blocks**: Tasks 3, 4, 5
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `app/styles/tokens.css:1-130` — 기존 Quiet Depth CSS 변수 전체 (색상, spacing, radius, shadow, motion). 이 파일의 변수명과 값을 shadcn 변수에 매핑해야 함
  - `app/styles/global.css` — 기존 @layer base, @import 구조. 여기에 shadcn 테마 추가

  **External References**:
  - shadcn Tailwind v4 테마 설정: `https://ui.shadcn.com/docs/tailwind-v4`
  - shadcn 테마 색상 변수 목록: `https://ui.shadcn.com/docs/theming`

  **WHY Each Reference Matters**:
  - `tokens.css`: 모든 Quiet Depth 색상값이 여기 정의됨. shadcn 변수와 1:1 매핑 필수
  - `global.css`: shadcn 테마 변수와 @theme inline 블록을 여기에 추가해야 함

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: shadcn 테마 변수 적용 확인
    Tool: Bash (grep)
    Preconditions: global.css 수정 완료
    Steps:
      1. `grep -- '--background:' app/styles/global.css` — shadcn background 변수 존재
      2. `grep -- '--primary:' app/styles/global.css` — primary 색상이 #146C94 (Ocean Blue)인지 확인
      3. `grep -- '--border:' app/styles/global.css` — border가 #E3E8EF인지 확인
      4. `grep -- '--radius:' app/styles/global.css` — radius가 0.75rem인지 확인
      5. `grep '@theme inline' app/styles/global.css` — @theme inline 블록 존재 확인
    Expected Result: 모든 변수 존재 + 올바른 값
    Failure Indicators: 변수 누락, 값 불일치, @theme inline 블록 없음
    Evidence: .sisyphus/evidence/task-2-theme-verify.txt

  Scenario: 기존 tokens.css 무결성 확인
    Tool: Bash
    Preconditions: 테마 매핑 완료
    Steps:
      1. `grep 'color-bg' app/styles/tokens.css` — 기존 변수 보존 확인
      2. `grep 'color-ocean-blue' app/styles/tokens.css` — 기존 ocean-blue 보존
      3. `npx react-router build` — 빌드 성공
    Expected Result: tokens.css 변경 없음, 빌드 성공
    Failure Indicators: tokens.css 수정됨, 빌드 실패
    Evidence: .sisyphus/evidence/task-2-tokens-intact.txt
  ```

  **Commit**: YES (groups with Task 1)
  - Message: `chore(ui): map Quiet Depth tokens to shadcn theme variables`
  - Files: `app/styles/global.css`
  - Pre-commit: `npx react-router build`

- [x] 3. shadcn Form Primitives 설치 + 커스터마이징 (Button, Input, Textarea, Label)

  **What to do**:
  - `pnpm dlx shadcn@latest add input textarea label` 실행 (button은 Task 1에서 이미 설치)
  - 각 컴포넌트 파일에서 import 경로 검증 (`~/lib/utils` 사용 확인)
  - **Button 커스터마이징** (`app/components/ui/button.tsx`):
    - `default` variant: `bg-primary text-primary-foreground` → Ocean Blue (#146C94)
    - `secondary` variant: `bg-secondary text-secondary-foreground` → Surface Secondary
    - `outline` variant: `border-input bg-background hover:bg-accent` → 현재 폼 버튼 스타일 매치
    - `ghost` variant: Admin 영역 액션 버튼용
    - `destructive` variant: 삭제 버튼용 (#DC2626)
    - 크기: `default` (h-10), `sm` (h-9, Admin 테이블 액션), `lg` (h-11, 주요 CTA)
    - focus ring: `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`
  - **Input 커스터마이징** (`app/components/ui/input.tsx`):
    - 기본 스타일: `border-input bg-background rounded-[var(--radius)]` (12px)
    - focus: `focus-visible:ring-2 focus-visible:ring-ring`
    - placeholder 색상: `text-muted-foreground`
    - 높이: `h-10` (기본), Admin에서는 `h-9` prop으로 조절
  - **Textarea 커스터마이징** (`app/components/ui/textarea.tsx`):
    - Input과 동일한 border/focus 스타일
    - `min-h-[80px]` 기본, resize 허용
    - line-height: `leading-relaxed` (1.75)
  - **Label 커스터마이징** (`app/components/ui/label.tsx`):
    - `text-sm font-medium leading-none` 기본
    - 에러 시: `text-destructive` variant

  **Must NOT do**:
  - shadcn Form 컴포넌트 설치 금지
  - 컴포넌트 내부에서 하드코딩 색상 사용 금지 (CSS 변수만 사용)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: CLI 설치 + 파일 내 스타일 클래스 조정
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 4, 5)
  - **Blocks**: Tasks 6-16
  - **Blocked By**: Task 2

  **References**:

  **Pattern References**:
  - `app/routes/public/write/article.tsx:210-219` — 현재 title Input 스타일 (Tailwind 클래스 `rounded-md border border-border bg-surface px-4 py-3`). 교체 후 동일한 시각적 결과 필요
  - `app/routes/public/write/note.tsx:172-178` — 현재 submit Button 스타일 (`rounded-md bg-ocean-blue px-6 py-3`). 교체 대상
  - `app/routes/public/logs/$recordSlug.details.tsx:168-176` — 현재 question Textarea 스타일. 교체 대상
  - `app/styles/tokens.css:101-105` — radius 토큰 (12px input, 20-24px card)

  **External References**:
  - shadcn Button API: `https://ui.shadcn.com/docs/components/button`
  - shadcn Input API: `https://ui.shadcn.com/docs/components/input`
  - shadcn Textarea API: `https://ui.shadcn.com/docs/components/textarea`

  **WHY Each Reference Matters**:
  - write/index.tsx 패턴들: 현재 네이티브 요소의 Tailwind 클래스를 보고 shadcn 커스터마이징에 반영해야 함
  - tokens.css: radius 값을 컴포넌트에 일관되게 적용하기 위해

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 설치된 컴포넌트 파일 검증
    Tool: Bash
    Preconditions: pnpm dlx shadcn@latest add 완료
    Steps:
      1. `ls app/components/ui/button.tsx app/components/ui/input.tsx app/components/ui/textarea.tsx app/components/ui/label.tsx` — 4개 파일 존재
      2. `grep -c '~/lib/utils' app/components/ui/input.tsx` — import 경로 올바름
      3. `grep 'focus-visible:ring' app/components/ui/input.tsx` — focus ring 존재
      4. `npx react-router build` — 빌드 성공
    Expected Result: 4파일 존재, import 올바름, focus ring 포함, 빌드 성공
    Failure Indicators: 파일 누락, @/ import, focus ring 없음, 빌드 실패
    Evidence: .sisyphus/evidence/task-3-form-primitives.txt

  Scenario: Button variants 검증
    Tool: Bash (grep)
    Preconditions: Button 커스터마이징 완료
    Steps:
      1. `grep 'destructive' app/components/ui/button.tsx` — destructive variant 존재
      2. `grep 'ghost' app/components/ui/button.tsx` — ghost variant 존재
      3. `grep 'outline' app/components/ui/button.tsx` — outline variant 존재
    Expected Result: 모든 variant 정의됨
    Evidence: .sisyphus/evidence/task-3-button-variants.txt
  ```

  **Commit**: YES (groups with Tasks 4, 5)
  - Message: `feat(ui): add shadcn form primitives with Quiet Depth styling`
  - Files: `app/components/ui/button.tsx`, `app/components/ui/input.tsx`, `app/components/ui/textarea.tsx`, `app/components/ui/label.tsx`
  - Pre-commit: `npx react-router build`

- [x] 4. shadcn Selection Primitives 설치 + 커스터마이징 (Select, Checkbox, RadioGroup)

  **What to do**:
  - `pnpm dlx shadcn@latest add select checkbox radio-group` 실행
  - 각 컴포넌트 import 경로 검증
  - **Select 커스터마이징** (`app/components/ui/select.tsx`):
    - Trigger: `border-input bg-background rounded-[var(--radius)]` — Input과 일관된 스타일
    - Content (dropdown): `bg-popover border border-border rounded-[var(--radius)] shadow-md`
    - Item hover: `bg-accent text-accent-foreground`
    - focus ring: Input과 동일한 패턴
    - 주의: 기존 네이티브 `<select>`의 `value`, `onChange` 패턴과 다름 — shadcn Select는 Radix Select 기반으로 `onValueChange` 사용
  - **Checkbox 커스터마이징** (`app/components/ui/checkbox.tsx`):
    - 기본: `border-primary` 체크 시 `bg-primary` (Ocean Blue)
    - Admin 토글용: 기본 크기 `h-4 w-4`
    - Tag chip 패턴 (Public 영역): 기존 hidden checkbox + styled label 패턴을 유지할지 shadcn Checkbox로 교체할지 결정 필요. **결정: Tag chips는 기존 패턴 유지** (시각적으로 chip이지 checkbox가 아님). Admin 토글만 shadcn Checkbox 사용.
  - **RadioGroup 커스터마이징** (`app/components/ui/radio-group.tsx`):
    - Item: `border-primary` 선택 시 `bg-primary` fill
    - Public 영역의 record type / format / question direction radio 교체용
    - Fieldset/legend 패턴과 함께 사용

  **Must NOT do**:
  - Tag chip checkbox (Public write/edit/details) 교체 금지 — 시각적 chip 패턴 유지
  - Combobox (검색 가능 select) 추가 금지 — 현재 스코프 아님

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: CLI 설치 + 스타일 클래스 조정
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 3, 5)
  - **Blocks**: Tasks 6-16
  - **Blocked By**: Task 2

  **References**:

  **Pattern References**:
  - `app/routes/public/write/note.tsx:124-133` — 현재 visibility native select. Radix Select의 `onValueChange` 패턴으로 교체해야 함
  - `app/routes/public/write/article.tsx:170-179` — 현재 visibility native select. 동일 교체 패턴
  - `app/routes/public/logs/$recordSlug.edit.tsx:196-215` — record type radio fieldset. RadioGroup으로 교체
  - `app/routes/admin/stages/$stageId.tsx:52` — Admin checkbox 예시 (isCurrent). 이것만 shadcn Checkbox로 교체

  **External References**:
  - shadcn Select API: `https://ui.shadcn.com/docs/components/select`
  - shadcn Checkbox API: `https://ui.shadcn.com/docs/components/checkbox`
  - shadcn RadioGroup API: `https://ui.shadcn.com/docs/components/radio-group`

  **WHY Each Reference Matters**:
  - write/index.tsx의 select/radio 패턴: 네이티브→Radix 전환 시 이벤트 핸들링이 달라지므로 현재 패턴 이해 필수
  - Tag chip 패턴: 교체 대상이 아님을 확인하기 위해

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Selection 컴포넌트 설치 검증
    Tool: Bash
    Preconditions: 설치 완료
    Steps:
      1. `ls app/components/ui/select.tsx app/components/ui/checkbox.tsx app/components/ui/radio-group.tsx` — 3파일 존재
      2. `grep '~/lib/utils' app/components/ui/select.tsx` — import 올바름
      3. `npx react-router build` — 빌드 성공
    Expected Result: 3파일 존재, import 올바름, 빌드 성공
    Evidence: .sisyphus/evidence/task-4-selection-primitives.txt

  Scenario: Select Trigger 스타일 검증
    Tool: Bash (grep)
    Preconditions: Select 커스터마이징 완료
    Steps:
      1. `grep 'border-input' app/components/ui/select.tsx` — border 스타일 존재
      2. `grep 'focus-visible' app/components/ui/select.tsx` — focus ring 존재
    Expected Result: 두 패턴 모두 존재
    Evidence: .sisyphus/evidence/task-4-select-style.txt
  ```

  **Commit**: YES (groups with Tasks 3, 5)
  - Message: `feat(ui): add shadcn selection primitives with Quiet Depth styling`
  - Files: `app/components/ui/select.tsx`, `app/components/ui/checkbox.tsx`, `app/components/ui/radio-group.tsx`
  - Pre-commit: `npx react-router build`

- [x] 5. shadcn Data Display + Overlay 설치 + 커스터마이징 (Table, Badge, Dialog)

  **What to do**:
  - `pnpm dlx shadcn@latest add table badge dialog alert-dialog` 실행
  - 각 컴포넌트 import 경로 검증
  - **Table 커스터마이징** (`app/components/ui/table.tsx`):
    - Admin 영역 전용 (Public에서는 미사용)
    - compact/dense 스타일: `text-sm`, `py-2 px-3` (Admin 디자인 가이드라인)
    - header: `bg-muted/50 font-medium text-muted-foreground`
    - row hover: `hover:bg-muted/50`
    - border: `border-b border-border`
    - 현재 12개 admin 테이블의 `<table>`, `<thead>`, `<tbody>`, `<tr>`, `<th>`, `<td>`를 shadcn Table, TableHeader, TableBody, TableRow, TableHead, TableCell로 1:1 교체
  - **Badge 커스터마이징** (`app/components/ui/badge.tsx`):
    - `default`: Ocean Blue 배경
    - `secondary`: Surface Secondary 배경
    - `outline`: border만
    - `destructive`: Error Red
    - Admin 테이블의 상태 표시(moderation status, visibility 등)에 사용
  - **Dialog + AlertDialog** (`app/components/ui/dialog.tsx`, `alert-dialog.tsx`):
    - Admin tags.tsx의 `window.confirm()` 패턴을 AlertDialog로 교체
    - overlay: `bg-black/80` → `bg-black/50` (Quiet Depth — 더 부드럽게)
    - content: `bg-card rounded-[20px] p-6`

  **Must NOT do**:
  - Public 영역에 Table 사용 금지 (카드 기반 디자인)
  - 새로운 모달/다이얼로그 기능 추가 금지 (기존 confirm() 교체만)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: CLI 설치 + 스타일 클래스 조정
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 3, 4)
  - **Blocks**: Tasks 12-16
  - **Blocked By**: Task 2

  **References**:

  **Pattern References**:
  - `app/routes/admin/stages/index.tsx:28` — 현재 admin stages 네이티브 테이블. shadcn Table로 교체 패턴 참조
  - `app/routes/admin/tags.tsx:241` — 현재 tags 테이블 + confirm() 삭제 패턴. AlertDialog로 교체
  - `.docs/admin.md` — Admin 디자인 원칙: utilitarian, dense, neutral

  **External References**:
  - shadcn Table API: `https://ui.shadcn.com/docs/components/table`
  - shadcn Badge API: `https://ui.shadcn.com/docs/components/badge`
  - shadcn AlertDialog API: `https://ui.shadcn.com/docs/components/alert-dialog`

  **WHY Each Reference Matters**:
  - admin 테이블 파일들: 현재 `<table>` 구조와 Tailwind 클래스를 보고 shadcn Table 매핑에 반영
  - admin.md: Admin 디자인 밀도와 톤을 유지하기 위해

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Data Display 컴포넌트 설치 검증
    Tool: Bash
    Preconditions: 설치 완료
    Steps:
      1. `ls app/components/ui/table.tsx app/components/ui/badge.tsx app/components/ui/dialog.tsx app/components/ui/alert-dialog.tsx` — 4파일 존재
      2. `grep 'TableHeader' app/components/ui/table.tsx` — Table 서브컴포넌트 존재
      3. `npx react-router build` — 빌드 성공
    Expected Result: 4파일 존재, 서브컴포넌트 정의됨, 빌드 성공
    Evidence: .sisyphus/evidence/task-5-data-display.txt

  Scenario: Badge variant 검증
    Tool: Bash (grep)
    Preconditions: Badge 커스터마이징 완료
    Steps:
      1. `grep 'destructive' app/components/ui/badge.tsx` — destructive variant 존재
      2. `grep 'secondary' app/components/ui/badge.tsx` — secondary variant 존재
    Expected Result: variant들 정의됨
    Evidence: .sisyphus/evidence/task-5-badge-variants.txt
  ```

  **Commit**: YES (groups with Tasks 3, 4)
  - Message: `feat(ui): add shadcn table, badge, dialog components`
  - Files: `app/components/ui/table.tsx`, `app/components/ui/badge.tsx`, `app/components/ui/dialog.tsx`, `app/components/ui/alert-dialog.tsx`
  - Pre-commit: `npx react-router build`

- [x] 6. 공유 컴포넌트 마이그레이션 (FilterBar, SortBar, GlobalNav + ViewToggle, ErrorState, QuestionCard)

  **What to do**:
  - **FilterBar** (`app/components/FilterBar.tsx`):
    - 네이티브 `<select>`를 shadcn `<Select>` + `<SelectTrigger>` + `<SelectContent>` + `<SelectItem>`으로 교체
    - 네이티브 `<label>`을 shadcn `<Label>`로 교체
    - 기존 `onChange` → Radix `onValueChange` 이벤트 핸들링 전환
  - **SortBar** (`app/components/SortBar.tsx`):
    - FilterBar와 동일 패턴으로 네이티브 select → shadcn Select 교체
  - **GlobalNav** (`app/components/GlobalNav.tsx`):
    - 모바일 메뉴 내 검색 `<input>`을 shadcn `<Input>`으로 교체 (line ~374-380)
  - **ViewToggle** (`app/components/ViewToggle.tsx`):
    - 네이티브 `<button>` (line 58) → shadcn `<Button variant="ghost">`
  - **ErrorState** (`app/components/ErrorState.tsx`):
    - 네이티브 `<button>` (line 34) → shadcn `<Button>`
  - **QuestionCard** (`app/components/QuestionCard.tsx`):
    - 네이티브 `<button>` (line 47) → shadcn `<Button variant="ghost">` (있다면)

  **Must NOT do**:
  - GlobalNav 레이아웃/구조 변경 금지
  - 새로운 필터/정렬 옵션 추가 금지
  - 네비게이션 링크 구조 변경 금지

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 3개 파일의 단순 요소 교체
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 7-11)
  - **Blocks**: Task 17
  - **Blocked By**: Tasks 3, 4

  **References**:

  **Pattern References**:
  - `app/components/FilterBar.tsx:34-44` — 현재 네이티브 select 구조. `<select name={f.key} value={...} onChange={...}>` 패턴
  - `app/components/SortBar.tsx:24-37` — 현재 정렬 select. 동일 교체 패턴
  - `app/components/GlobalNav.tsx:374-380` — 모바일 검색 input

  **API/Type References**:
  - `app/components/ui/select.tsx` — SelectTrigger, SelectContent, SelectItem export 확인

  **WHY Each Reference Matters**:
  - FilterBar/SortBar: `onChange` → `onValueChange` 전환이 필요하므로 현재 이벤트 핸들링 패턴 이해 필수
  - GlobalNav: 검색 input만 교체, 나머지 구조 건드리지 않기 위해 정확한 위치 파악 필요

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: FilterBar shadcn Select 동작 확인
    Tool: Bash (grep)
    Preconditions: 마이그레이션 완료
    Steps:
      1. `grep '<select' app/components/FilterBar.tsx` — 네이티브 select 잔존 0개
      2. `grep 'SelectTrigger' app/components/FilterBar.tsx` — shadcn Select 사용 중
      3. `grep '<label' app/components/FilterBar.tsx` — 네이티브 label 잔존 0개 (Label 사용)
      4. `npx react-router build` — 빌드 성공
    Expected Result: 네이티브 요소 0개, shadcn 컴포넌트 사용 확인, 빌드 성공
    Failure Indicators: 네이티브 요소 잔존, import 에러, 빌드 실패
    Evidence: .sisyphus/evidence/task-6-shared-components.txt

  Scenario: SortBar 정렬 기능 보존
    Tool: Bash (grep)
    Preconditions: 마이그레이션 완료
    Steps:
      1. `grep '<select' app/components/SortBar.tsx` — 네이티브 select 0개
      2. `grep 'onValueChange' app/components/SortBar.tsx` — Radix 이벤트 핸들러 존재
    Expected Result: 네이티브 select 제거, onValueChange 사용
    Evidence: .sisyphus/evidence/task-6-sortbar.txt
  ```

  **Commit**: YES
  - Message: `refactor(components): migrate FilterBar, SortBar, GlobalNav to shadcn`
  - Files: `app/components/FilterBar.tsx`, `app/components/SortBar.tsx`, `app/components/GlobalNav.tsx`
  - Pre-commit: `npx react-router build`

- [x] 7. Write Note 폼 마이그레이션 (write/note.tsx)

  **What to do**:
  - `app/routes/public/write/note.tsx` — 짧은 메모 작성 폼 (189줄)
  - **참고: `write/index.tsx`는 64줄짜리 선택 페이지(Link 2개)이며 폼 요소가 없으므로 교체 대상 아님**
  - **Select 교체** (2개):
    - visibility select (line 124-133) → `<Select name="visibility" defaultValue="cohort">...<SelectItem>`
    - stageId select (line 143-157) → `<Select name="stageId" defaultValue={...}>...<SelectItem>`
  - **Button 교체** (1개):
    - submit button (line 172-178) → `<Button type="submit" disabled={isSubmitting}>`
  - **Label 교체** (2개):
    - visibility label (line 118-121) → `<Label htmlFor="visibility">`
    - stageId label (line 137-141) → `<Label htmlFor="stageId">`
  - **중요**: 이 폼은 네이티브 `<form method="post">`를 사용 (React Router `<Form>` 아님). shadcn Select에 `name` prop 전달하여 FormData 제출 동작 보존 필수.
  - **주의 — Select와 FormData**: Radix Select는 `name` prop으로 hidden input을 자동 생성하므로 FormData에 포함됨. `defaultValue`도 정확히 전달해야 함.

  **Must NOT do**:
  - NoteEditor 컴포넌트 수정 금지 (Tiptap 기반)
  - 폼 action/loader 로직 수정 금지
  - write/index.tsx 수정 금지 (폼 없음)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 1개 파일, 5개 요소 교체 (select 2, button 1, label 2)
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 6, 8-11)
  - **Blocks**: Task 17
  - **Blocked By**: Tasks 3, 4

  **References**:

  **Pattern References**:
  - `app/routes/public/write/note.tsx:115-186` — 전체 폼 JSX. `<form method="post">` 사용, 네이티브 select의 name/defaultValue 패턴
  - `app/routes/public/write/note.tsx:91-100` — 컴포넌트 state (noteContent, isSubmitting)

  **API/Type References**:
  - `app/components/ui/select.tsx` — Select API (name prop, defaultValue, SelectTrigger/Content/Item)
  - `app/components/ui/button.tsx` — Button API (type="submit", disabled)

  **External References**:
  - Radix Select와 HTML Forms: `https://www.radix-ui.com/primitives/docs/components/select` — name prop으로 FormData 지원 확인

  **WHY Each Reference Matters**:
  - note.tsx 폼: 정확한 name/defaultValue 매핑을 위해 현재 네이티브 select의 구조 이해 필수
  - Select API: Radix Select가 hidden input을 자동 생성하여 FormData에 값이 포함되는지 확인

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Note 폼 네이티브 요소 교체 확인
    Tool: Bash (grep)
    Preconditions: 마이그레이션 완료
    Steps:
      1. `grep -c '<select' app/routes/public/write/note.tsx` — 네이티브 select 0개
      2. `grep -c '<button' app/routes/public/write/note.tsx` — 네이티브 button 0개 (대문자 Button만)
      3. `grep -c '<label' app/routes/public/write/note.tsx` — 네이티브 label 0개 (대문자 Label만)
      4. `grep 'SelectTrigger\|<Button\|<Label' app/routes/public/write/note.tsx` — shadcn 컴포넌트 사용 확인
    Expected Result: 네이티브 select/button/label 0개, shadcn 컴포넌트 사용
    Failure Indicators: 네이티브 요소 잔존
    Evidence: .sisyphus/evidence/task-7-note-form.txt

  Scenario: Note 폼 FormData name 속성 확인
    Tool: Bash (grep)
    Preconditions: 마이그레이션 완료
    Steps:
      1. `grep 'name="visibility"' app/routes/public/write/note.tsx` — visibility name 존재
      2. `grep 'name="stageId"' app/routes/public/write/note.tsx` — stageId name 존재
      3. `npx react-router build` — 빌드 성공
    Expected Result: name 속성 보존, 빌드 성공
    Evidence: .sisyphus/evidence/task-7-note-formdata.txt
  ```

  **Commit**: YES
  - Message: `refactor(write): migrate note form to shadcn components`
  - Files: `app/routes/public/write/note.tsx`
  - Pre-commit: `npx react-router build`

- [x] 8. Edit + Details 폼 마이그레이션

  **What to do**:
  - **Edit 폼** (`app/routes/public/logs/$recordSlug.edit.tsx`):
    - Select 교체 (5개): rhythm, template, collaboration unit, response preference, visibility
    - RadioGroup 교체 (1개): record type
    - Input 교체 (1개): title
    - Label 교체 (8+개)
    - Button 교체: submit
    - Tag chip checkboxes는 유지 (Task 7과 동일 정책)
    - hidden inputs 유지 (format, stageId)
  - **Details 폼** (`app/routes/public/logs/$recordSlug.details.tsx`):
    - Select 교체 (1개): response preference
    - RadioGroup 교체 (1개): question direction
    - Textarea 교체 (1개): question
    - Label 교체 (4+개)
    - Tag chip checkboxes 유지
  - Write 폼 (Task 7)과 동일한 패턴 적용. FormData 호환성 동일 주의.

  **Must NOT do**:
  - Tag chip checkboxes 교체 금지
  - hidden inputs 교체 금지
  - Edit/Details 폼의 action/loader 수정 금지

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 2개 파일, 각각 5-8개 요소 교체. FormData 호환성 주의
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 17
  - **Blocked By**: Tasks 3, 4

  **References**:

  **Pattern References**:
  - `app/routes/public/logs/$recordSlug.edit.tsx:194-400` — Edit 폼 전체 JSX
  - `app/routes/public/logs/$recordSlug.details.tsx:160-250` — Details 폼 전체 JSX
  - Task 7(note.tsx) 및 Task 10(article.tsx)의 select→Select, label→Label 교체 패턴을 동일하게 적용

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Edit + Details 네이티브 요소 완전 교체
    Tool: Bash (grep)
    Steps:
      1. `grep -c '<select' app/routes/public/logs/\\$recordSlug.edit.tsx` — 0
      2. `grep -c '<select' app/routes/public/logs/\\$recordSlug.details.tsx` — 0
      3. `grep -c '<input type="radio"' app/routes/public/logs/\\$recordSlug.edit.tsx` — 0
      4. `npx react-router build` — 성공
    Expected Result: 네이티브 select/radio 0개, 빌드 성공
    Evidence: .sisyphus/evidence/task-8-edit-details.txt
  ```

  **Commit**: YES
  - Message: `refactor(logs): migrate edit and details forms to shadcn`
  - Files: `app/routes/public/logs/$recordSlug.edit.tsx`, `app/routes/public/logs/$recordSlug.details.tsx`

- [x] 9. Record Detail 인라인 폼 마이그레이션 ($recordSlug.tsx)

  **What to do**:
  - `app/routes/public/logs/$recordSlug.tsx` — 기록 상세 페이지 내 인라인 폼 3개:
    - **Self-answer 폼** (line ~583-600):
      - Textarea 교체 → shadcn `<Textarea>`
      - Button 교체 → shadcn `<Button>`
      - Label 교체 → shadcn `<Label>`
      - hidden inputs 유지 (intent, questionId, recordId)
    - **Response 폼** (line ~657-700):
      - Textarea 교체 → shadcn `<Textarea>`
      - Select 교체 (2개): response type select (line 664, 공명/질문/연결/제안) + questionId select (line 678) → shadcn `<Select name=...>`
      - Button 교체 (line 696) → shadcn `<Button>`
      - hidden inputs 유지 (intent, recordId)
    - **Highlighted Sentence 폼** (line ~702-725):
      - Input/Textarea 교체
      - Button 교체 (line 721) → shadcn `<Button>`
      - hidden inputs 유지
    - **기타 Button** (line 541, 602, 609, 619):
      - 각종 인라인 버튼 (좋아요, 공유, 북마크 등 — 실제 컨트롤 확인 후 `<Button variant="ghost" size="sm">` 적용)

  **Must NOT do**:
  - 상세 페이지 본문 렌더링 수정 금지
  - ContentRenderer 컴포넌트 수정 금지
  - hidden inputs 교체 금지

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 1개 파일이지만 3개 독립 폼, 각각 FormData 호환성 확인 필요
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 17
  - **Blocked By**: Tasks 3, 4

  **References**:

  **Pattern References**:
  - `app/routes/public/logs/$recordSlug.tsx:580-720` — 3개 인라인 폼 JSX
  - `app/routes/public/logs/$recordSlug.tsx:1-50` — action 함수 (intent 분기 로직)

  **WHY Each Reference Matters**:
  - 인라인 폼 위치: 이 파일은 긴 파일(700+ lines)이므로 정확한 라인 범위 알아야 함
  - action 함수: intent 기반 분기 — hidden inputs가 올바르게 전달되어야 함

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Record Detail 인라인 폼 교체 확인
    Tool: Bash (grep)
    Steps:
      1. `grep -c '<textarea' app/routes/public/logs/\\$recordSlug.tsx` — 네이티브 textarea 0개
      2. `grep -c '<select' app/routes/public/logs/\\$recordSlug.tsx` — 네이티브 select 0개
      3. `grep -c '<button' app/routes/public/logs/\\$recordSlug.tsx` — 네이티브 button 0개
      4. `grep 'type="hidden"' app/routes/public/logs/\\$recordSlug.tsx` — hidden inputs 보존 확인 (0보다 큼)
      5. `npx react-router build` — 성공
    Expected Result: 네이티브 textarea/select/button 0개, hidden inputs 보존, 빌드 성공
    Evidence: .sisyphus/evidence/task-9-record-detail.txt
  ```

  **Commit**: YES
  - Message: `refactor(logs): migrate record detail inline forms to shadcn`
  - Files: `app/routes/public/logs/$recordSlug.tsx`

- [x] 10. Write Article 폼 마이그레이션 (write/article.tsx)

  **What to do**:
  - `app/routes/public/write/article.tsx` — 글 쓰기 폼 (274줄). note.tsx보다 복잡.
  - **Select 교체** (3개):
    - visibility select (line 170-179) → `<Select name="visibility" defaultValue="cohort">...<SelectItem>`
    - stageId select (line 189-203) → `<Select name="stageId" defaultValue={...}>...<SelectItem>`
    - templateId select (line 241-253) → `<Select name="templateId">...<SelectItem>` (조건부 렌더링 내)
  - **Input 교체** (1개):
    - title input (line 210-219) → `<Input id="title" name="title" type="text" required value={title} onChange={...}>`
  - **Button 교체** (1개):
    - submit button (line 257-263) → `<Button type="submit" disabled={isSubmitting}>`
  - **Label 교체** (4개):
    - visibility label (line 164-168)
    - stageId label (line 183-187)
    - title label (line 207-209)
    - templateId label (line 238-240)
  - **중요**: note.tsx와 동일하게 네이티브 `<form method="post">` 사용. Select의 `name` prop 전달 필수.
  - **주의**: templateId select는 `{availableTemplates.length > 0 && (...)}` 조건부 렌더링 내에 있음.

  **Must NOT do**:
  - ArticleEditor 컴포넌트 수정 금지 (Tiptap 기반)
  - 폼 action/loader 로직 수정 금지

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 1개 파일이지만 9개 요소 교체 (select 3, input 1, button 1, label 4) + 조건부 렌더링 처리
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 17
  - **Blocked By**: Tasks 3, 4

  **References**:

  **Pattern References**:
  - `app/routes/public/write/article.tsx:161-271` — 전체 폼 JSX. 3개 select, 1개 input, 1개 button, 4개 label. `<form method="post">` 사용
  - `app/routes/public/write/article.tsx:137-148` — 컴포넌트 state (title, articleContent, isSubmitting, errors)
  - `app/routes/public/write/article.tsx:236-254` — 조건부 templateId select (availableTemplates.length > 0)

  **API/Type References**:
  - `app/components/ui/select.tsx` — Select API
  - `app/components/ui/input.tsx` — Input API (value, onChange 지원)
  - `app/components/ui/button.tsx` — Button API

  **WHY Each Reference Matters**:
  - article.tsx 폼: title input은 controlled component (value + onChange)이므로 shadcn Input에서도 동일하게 동작해야 함
  - 조건부 select: templateId select가 조건부로 렌더링되므로 교체 시에도 조건부 구조 유지

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Article 폼 네이티브 요소 완전 교체
    Tool: Bash (grep)
    Preconditions: 마이그레이션 완료
    Steps:
      1. `grep -c '<select' app/routes/public/write/article.tsx` — 0
      2. `grep -c '<input' app/routes/public/write/article.tsx` — 0 (대문자 Input만)
      3. `grep -c '<button' app/routes/public/write/article.tsx` — 0
      4. `grep -c '<label' app/routes/public/write/article.tsx` — 0
      5. `grep 'SelectTrigger\|<Input\|<Button\|<Label' app/routes/public/write/article.tsx` — shadcn 컴포넌트 사용 확인
    Expected Result: 네이티브 요소 0개, shadcn 컴포넌트 사용
    Evidence: .sisyphus/evidence/task-10-article-form.txt

  Scenario: Article 폼 FormData name 속성 확인
    Tool: Bash (grep)
    Steps:
      1. `grep 'name="visibility"' app/routes/public/write/article.tsx` — 존재
      2. `grep 'name="stageId"' app/routes/public/write/article.tsx` — 존재
      3. `grep 'name="title"' app/routes/public/write/article.tsx` — 존재
      4. `grep 'name="templateId"' app/routes/public/write/article.tsx` — 존재
      5. `npx react-router build` — 성공
    Expected Result: 모든 name 속성 보존, 빌드 성공
    Evidence: .sisyphus/evidence/task-10-article-formdata.txt
  ```

  **Commit**: YES (groups with Task 11)
  - Message: `refactor(write): migrate article form to shadcn components`
  - Files: `app/routes/public/write/article.tsx`

- [x] 11. Settings + Inbox + 기타 Public 라우트 마이그레이션

  **What to do**:
  - **Settings** (`app/routes/public/settings.tsx`):
    - Select 교체 (2개): default visibility (line ~82-91), default response preference (line ~101-110)
    - Checkbox 교체 (1개): notification email (line ~115-120) → shadcn `<Checkbox>`
    - Label 교체 (3개)
    - Button 교체 (1개): submit (line ~131-136)
  - **Inbox** (`app/routes/public/inbox.tsx`):
    - Button 교체: mark_all_read 버튼 (line ~107)
    - Button 교체: 개별 mark_read 버튼들
    - hidden inputs 유지
  - **Learners Index** (`app/routes/public/learners/index.tsx`):
    - Select 교체 (1개): 필터 select (line 71) → shadcn `<Select>`
  - **Search** (`app/routes/public/search.tsx`):
    - Input 교체 (1개): 검색 input (line 110) → shadcn `<Input>`
    - Button 교체 (1개): 검색 버튼 (line 117) → shadcn `<Button>`
  - **Logs Index** (`app/routes/public/logs/index.tsx`):
    - Button 교체 (1개): 더보기/필터 버튼 (line 187) → shadcn `<Button>`

  **Must NOT do**:
  - Settings의 name/bio 편집 추가 금지 (ada-kr-pos.com에서 관리)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 2개 파일, 소수 요소 교체
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 17
  - **Blocked By**: Tasks 3, 4

  **References**:

  **Pattern References**:
  - `app/routes/public/settings.tsx:76-136` — Settings 폼 전체
  - `app/routes/public/inbox.tsx:100-160` — Inbox 버튼들

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Settings + Inbox 네이티브 요소 교체
    Tool: Bash (grep)
    Steps:
      1. `grep -c '<select' app/routes/public/settings.tsx` — 0
      2. `grep -c '<button' app/routes/public/settings.tsx` — 0 (Button 대문자)
      3. `grep -c '<button' app/routes/public/inbox.tsx` — 0
      4. `npx react-router build` — 성공
    Expected Result: 네이티브 요소 0개, 빌드 성공
    Evidence: .sisyphus/evidence/task-11-settings-inbox.txt
  ```

  **Commit**: YES (groups with Task 10)
  - Message: `refactor(public): migrate settings and inbox to shadcn`
  - Files: `app/routes/public/settings.tsx`, `app/routes/public/inbox.tsx`

- [x] 12. Admin 테이블 마이그레이션 A (stages, records, learners index)

  **What to do**:
  - 3개 Admin index 파일의 `<table>` → shadcn Table 교체:
  - **stages/index.tsx** (`app/routes/admin/stages/index.tsx`):
    - `<table>` → `<Table>`, `<thead>` → `<TableHeader>`, `<tbody>` → `<TableBody>`
    - `<tr>` → `<TableRow>`, `<th>` → `<TableHead>`, `<td>` → `<TableCell>`
    - Admin 스타일 유지: compact, dense, `text-sm`
  - **records/index.tsx** (`app/routes/admin/records/index.tsx`):
    - 동일 패턴. 더 많은 컬럼 (moderation status 등)
    - 상태 텍스트에 `<Badge>` 적용 (clean/flagged/hidden 등)
  - **learners/index.tsx** (`app/routes/admin/learners/index.tsx`):
    - 동일 패턴. learner 목록 테이블

  **Must NOT do**:
  - 테이블 컬럼 추가/삭제 금지
  - 데이터 로딩 로직 (loader) 수정 금지
  - 정렬/필터 기능 추가 금지 (기존에 없으면 추가 안 함)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 3개 파일의 반복적이지만 정확한 태그 교체 필요
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 13-16)
  - **Blocks**: Task 17
  - **Blocked By**: Tasks 3, 5

  **References**:

  **Pattern References**:
  - `app/routes/admin/stages/index.tsx:28` — stages 테이블 시작점
  - `app/routes/admin/records/index.tsx:33` — records 테이블 시작점
  - `app/routes/admin/learners/index.tsx:23` — learners 테이블 시작점
  - `.docs/admin.md` — Admin 디자인: dense table 허용, utilitarian, compact

  **API/Type References**:
  - `app/components/ui/table.tsx` — Table, TableHeader, TableBody, TableRow, TableHead, TableCell exports
  - `app/components/ui/badge.tsx` — Badge variants (moderation status 표시용)

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Admin 테이블 A — 네이티브 table 교체
    Tool: Bash (grep)
    Steps:
      1. `grep -c '<table' app/routes/admin/stages/index.tsx` — 0
      2. `grep -c '<table' app/routes/admin/records/index.tsx` — 0
      3. `grep -c '<table' app/routes/admin/learners/index.tsx` — 0
      4. `grep 'Table' app/routes/admin/stages/index.tsx` — shadcn Table import 존재
      5. `npx react-router build` — 성공
    Expected Result: 네이티브 table 0개, shadcn Table 사용, 빌드 성공
    Evidence: .sisyphus/evidence/task-12-admin-tables-a.txt
  ```

  **Commit**: YES
  - Message: `refactor(admin): migrate stages, records, learners tables to shadcn`
  - Files: `app/routes/admin/stages/index.tsx`, `app/routes/admin/records/index.tsx`, `app/routes/admin/learners/index.tsx`

- [x] 13. Admin 테이블 마이그레이션 B (challenges, dialogue, collaboration, memories, templates index)

  **What to do**:
  - 5개 Admin index 파일의 `<table>` → shadcn Table 교체:
    - `app/routes/admin/challenges/index.tsx` (line ~23)
    - `app/routes/admin/dialogue/index.tsx` (line ~23)
    - `app/routes/admin/collaboration/index.tsx` (line ~24)
    - `app/routes/admin/memories/index.tsx` (line ~22)
    - `app/routes/admin/templates/index.tsx` (line ~22)
  - Task 12와 동일한 교체 패턴 (table→Table, thead→TableHeader, etc.)
  - 상태 필드에 `<Badge>` 적용 (있는 경우)

  **Must NOT do**:
  - 테이블 구조/컬럼 변경 금지

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 5개 파일 반복 패턴 교체
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4
  - **Blocks**: Task 17
  - **Blocked By**: Tasks 3, 5

  **References**:

  **Pattern References**:
  - `app/routes/admin/challenges/index.tsx:23` — challenges 테이블
  - `app/routes/admin/dialogue/index.tsx:23` — dialogue 테이블
  - `app/routes/admin/collaboration/index.tsx:24` — collaboration 테이블
  - `app/routes/admin/memories/index.tsx:22` — memories 테이블
  - `app/routes/admin/templates/index.tsx:22` — templates 테이블

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Admin 테이블 B — 5개 파일 교체
    Tool: Bash (grep)
    Steps:
      1. `for f in challenges/index dialogue/index collaboration/index memories/index templates/index; do grep -c '<table' "app/routes/admin/$f.tsx"; done` — 모두 0
      2. `npx react-router build` — 성공
    Expected Result: 5개 파일 모두 네이티브 table 0개, 빌드 성공
    Evidence: .sisyphus/evidence/task-13-admin-tables-b.txt
  ```

  **Commit**: YES
  - Message: `refactor(admin): migrate remaining list tables to shadcn`
  - Files: 위 5개 파일

- [x] 14. Admin 테이블 + 폼 통합 마이그레이션 (curation, audit, tags, roles)

  **What to do**:
  - **이 태스크가 tags.tsx와 roles.tsx의 유일한 소유자** (Task 16에서 이 파일들 제외):
  - **curation.tsx** (`app/routes/admin/curation.tsx`):
    - 테이블 교체 (line ~42): `<table>` → shadcn Table
    - Button 교체: pin/unpin, hide/show → `<Button>`
  - **audit.tsx** (`app/routes/admin/audit.tsx`):
    - 테이블 교체 (line ~33): `<table>` → shadcn Table
  - **tags.tsx** (`app/routes/admin/tags.tsx`) — **테이블 + 폼 모두 이 태스크에서 처리**:
    - 테이블 교체 (line ~241): `<table>` → shadcn Table
    - Button 교체: 삭제 버튼 → `<Button>`, `window.confirm()` → `<AlertDialog>`
    - Create tag 폼: Input 교체 (3개: name, slug, description), Label 교체 (4개), Button 교체 (추가)
    - Input type="color" → 네이티브 유지 허용
    - hidden intent input 유지
  - **roles.tsx** (`app/routes/admin/roles.tsx`) — **테이블 + 폼 모두 이 태스크에서 처리**:
    - 테이블 교체 (line ~87): `<table>` → shadcn Table
    - Button 교체: revoke, grant → `<Button>`
    - Grant 폼: Select 교체 (role selection), Label 교체 (2개)
    - hidden intent input 유지

  **Must NOT do**:
  - tags.tsx의 `<input type="color">` 교체 금지

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 4개 파일, 테이블 + 버튼 + AlertDialog 통합
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4
  - **Blocks**: Task 17
  - **Blocked By**: Tasks 3, 5

  **References**:

  **Pattern References**:
  - `app/routes/admin/curation.tsx:42-70` — 큐레이션 테이블 + 액션 버튼
  - `app/routes/admin/tags.tsx:241-295` — 태그 테이블 + 삭제 confirm 패턴
  - `app/routes/admin/roles.tsx:87-140` — 역할 테이블 + revoke/grant 버튼

  **API/Type References**:
  - `app/components/ui/alert-dialog.tsx` — AlertDialog API (tags 삭제 확인용)

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Admin 테이블 C + 버튼 교체
    Tool: Bash (grep)
    Steps:
      1. `grep -c '<table' app/routes/admin/curation.tsx app/routes/admin/audit.tsx app/routes/admin/tags.tsx app/routes/admin/roles.tsx` — 모두 0
      2. `grep -c '<button' app/routes/admin/curation.tsx` — 0
      3. `grep 'AlertDialog' app/routes/admin/tags.tsx` — 존재 (confirm 교체)
      4. `npx react-router build` — 성공
    Expected Result: 네이티브 table/button 0개, AlertDialog 사용, 빌드 성공
    Evidence: .sisyphus/evidence/task-14-admin-tables-c.txt
  ```

  **Commit**: YES
  - Message: `refactor(admin): migrate curation, audit, tags, roles tables to shadcn`
  - Files: 위 4개 파일

- [x] 15. Admin 폼 마이그레이션 A (stages, records, challenges, collaboration detail)

  **What to do**:
  - 4개 Admin detail 폼의 네이티브 요소 → shadcn 교체:
  - **AdminSidebar** (`app/components/admin/AdminSidebar.tsx`):
    - Button 교체 (1개): 모바일 토글 버튼 (line 98) → shadcn `<Button variant="ghost" size="sm">`
  - **stages/$stageId.tsx** (`app/routes/admin/stages/$stageId.tsx`):
    - Input/Textarea 교체: 이름, 설명 등
    - Select 교체 (line ~44): 상태/순서 select → shadcn `<Select>`
    - Checkbox 교체 (1개): isCurrent (line ~52) → shadcn `<Checkbox>`
    - Label 교체 (4개)
    - Button 교체 (1개): submit
  - **records/$recordId.tsx** (`app/routes/admin/records/$recordId.tsx`):
    - Select 교체 (1개): moderation status (line ~45-49)
    - Textarea 교체 (1개): moderation note (line ~51)
    - Label 교체 (2개)
    - Button 교체 (1개): submit
  - **challenges/$challengeId.tsx** (`app/routes/admin/challenges/$challengeId.tsx`):
    - Input 교체: 제목, 설명 등
    - Select 교체 (line ~48): 상태 select → shadcn `<Select>`
    - Label 교체 (4개)
    - Button 교체 (1개): submit
  - **collaboration/$groupId.tsx** (`app/routes/admin/collaboration/$groupId.tsx`):
    - Input 교체
    - Select 교체 (line ~36): 상태 select → shadcn `<Select>`
    - Label 교체 (2개)
    - Button 교체 (1개): submit

  **Must NOT do**:
  - Admin 폼 action/loader 수정 금지

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 4개 파일의 다양한 폼 요소 교체
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4
  - **Blocks**: Task 17
  - **Blocked By**: Tasks 3, 4, 5

  **References**:

  **Pattern References**:
  - `app/routes/admin/stages/$stageId.tsx:35-57` — stages 폼
  - `app/routes/admin/records/$recordId.tsx:44-52` — records moderation 폼
  - `app/routes/admin/challenges/$challengeId.tsx:35-55` — challenges 폼
  - `app/routes/admin/collaboration/$groupId.tsx:35-48` — collaboration 폼

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Admin 폼 A — 4개 파일 교체
    Tool: Bash (grep)
    Steps:
      1. `for f in stages/\\$stageId records/\\$recordId challenges/\\$challengeId collaboration/\\$groupId; do grep -c '<select\|<button\|<input type' "app/routes/admin/$f.tsx" 2>/dev/null; done` — 모두 0 (hidden 제외)
      2. `npx react-router build` — 성공
    Expected Result: 네이티브 폼 요소 0개, 빌드 성공
    Evidence: .sisyphus/evidence/task-15-admin-forms-a.txt
  ```

  **Commit**: YES
  - Message: `refactor(admin): migrate stage, record, challenge, collab detail forms to shadcn`
  - Files: 위 4개 파일

- [x] 16. Admin 폼 마이그레이션 B (templates, memories, settings, dialogue detail)

  **What to do**:
  - **4개 Admin 파일의 폼 요소 교체** (tags.tsx, roles.tsx는 Task 14에서 처리 완료):
  - **templates/$templateId.tsx** (`app/routes/admin/templates/$templateId.tsx`):
    - Input 교체 (2개): name, description
    - Select 교체 (3개): context, form, rhythm (line ~51-65)
    - Textarea 교체 (1개): promptBody
    - Checkbox 교체 (1개): active (line ~70)
    - Label 교체 (7개)
    - Button 교체 (1개): submit
  - **memories/$stageId.tsx** (`app/routes/admin/memories/$stageId.tsx`):
    - Input/Textarea 교체
    - Select 교체 (line ~44): 상태 select → shadcn `<Select>`
    - Label 교체 (3개)
    - Button 교체 (1개)
  - **settings.tsx** (`app/routes/admin/settings.tsx`):
    - Checkbox 교체: 설정 토글 (line ~47)
    - Label 교체
    - Button 교체 (1개)
  - **dialogue/$responseId.tsx** (`app/routes/admin/dialogue/$responseId.tsx`):
    - Select 교체 (1개): moderation status (line ~49-53)
    - Label 교체 (1개)
    - Button 교체 (1개)

  **Must NOT do**:
  - tags.tsx, roles.tsx 수정 금지 (Task 14 소유)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 6개 파일, 다양한 폼 요소 조합
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4
  - **Blocks**: Task 17
  - **Blocked By**: Tasks 3, 4, 5

  **References**:

  **Pattern References**:
  - `app/routes/admin/tags.tsx:165-233` — tag create 폼
  - `app/routes/admin/templates/$templateId.tsx:37-75` — template 폼
  - `app/routes/admin/memories/$stageId.tsx:35-50` — memories 폼
  - `app/routes/admin/settings.tsx:46-53` — settings 폼
  - `app/routes/admin/roles.tsx:121-139` — grant 폼
  - `app/routes/admin/dialogue/$responseId.tsx:48-54` — dialogue moderation 폼

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Admin 폼 B — 4개 파일 교체
    Tool: Bash (grep)
    Steps:
      1. `grep -c '<select' app/routes/admin/templates/\\$templateId.tsx app/routes/admin/dialogue/\\$responseId.tsx` — 모두 0
      2. `grep -c '<button' app/routes/admin/settings.tsx app/routes/admin/memories/\\$stageId.tsx` — 모두 0
      3. `npx react-router build` — 성공
    Expected Result: 네이티브 select/button 0개, 빌드 성공
    Evidence: .sisyphus/evidence/task-16-admin-forms-b.txt
  ```

  **Commit**: YES
  - Message: `refactor(admin): migrate remaining admin forms to shadcn`
  - Files: 위 6개 파일

- [x] 17. 빌드 + 타입체크 + Edge Runtime 전체 검증

  **What to do**:
  - 전체 프로젝트 빌드 검증:
    1. `npx react-router build` — 빌드 성공 확인
    2. `tsc --noEmit` — 타입 에러 0개 확인
    3. 모든 `app/components/ui/*.tsx` 파일의 import 경로 검증 (`~/lib/utils`)
  - 네이티브 요소 잔존 검사:
    1. `grep -r '<select' app/routes/ app/components/` — 0건 (tag chip checkbox 라벨 내 select 텍스트 제외)
    2. `grep -r '<table' app/routes/` — 0건
    3. `grep -r '<textarea' app/routes/` — 소문자 0건 (Textarea 컴포넌트는 대문자)
  - 금지 패턴 검사:
    1. `grep -r 'from.*@/lib/utils' app/` — 0건 (@/ import 없어야 함)
    2. `grep -r 'as any' app/` — 0건
    3. `grep -r '@ts-ignore' app/` — 0건
    4. `grep -r 'shadcn.*Form\|from.*form' app/components/ui/` — shadcn Form 미설치 확인
  - 빌드 에러가 발견되면 해당 파일을 수정하여 모든 에러 해결

  **Must NOT do**:
  - 빌드 에러를 `@ts-ignore`로 무시 금지
  - 코드 로직 변경 금지 (import/타입 수정만)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: 전체 프로젝트 대상 종합 검증, 에러 발견 시 디버깅 필요
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 5 (after all Wave 3+4)
  - **Blocks**: Task 18, F1-F4
  - **Blocked By**: Tasks 6-16

  **References**:

  **Pattern References**:
  - `package.json:6-14` — 빌드/타입체크 스크립트
  - `tsconfig.cloudflare.json` — TypeScript 설정

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 전체 빌드 + 타입체크 성공
    Tool: Bash
    Steps:
      1. `npx react-router build 2>&1` — 빌드 출력 캡처
      2. `tsc --noEmit 2>&1` — 타입체크 출력 캡처
      3. `echo $?` — exit code 0 확인
    Expected Result: 빌드 성공, 타입 에러 0개
    Failure Indicators: Build failed, Type error 존재
    Evidence: .sisyphus/evidence/task-17-build-verify.txt

  Scenario: 네이티브 요소 잔존 검사
    Tool: Bash (grep)
    Steps:
      1. `grep -r '<select\b' app/routes/ app/components/ --include='*.tsx' | grep -v 'components/editor/' | grep -v 'components/ui/'` — 에디터/ui래퍼 제외 후 0건
      2. `grep -r '<table\b' app/routes/ --include='*.tsx' -l` — 파일 0개
      3. `grep -r '<button\b' app/routes/ app/components/ --include='*.tsx' | grep -v 'components/editor/' | grep -v 'components/ui/'` — 에디터/ui래퍼 제외 후 0건
      4. `grep -r '<input\b' app/routes/ app/components/ --include='*.tsx' | grep -v 'type="hidden"' | grep -v 'type="color"' | grep -v 'components/editor/' | grep -v 'components/ui/'` — 예외(hidden/color/에디터/ui래퍼) 제외 후 0건. 참고: tag-chip checkbox는 write/index.tsx(폼 없음), $recordSlug.edit.tsx, $recordSlug.details.tsx에만 존재하며 이 파일들의 checkbox는 시각적 chip 패턴이므로 허용. 단, 이 3개 파일 외 다른 파일의 native checkbox 잔존은 불허.
      5. `grep -r '<textarea\b' app/routes/ app/components/ --include='*.tsx' | grep -v 'components/editor/' | grep -v 'components/ui/'` — 에디터/ui래퍼 제외 후 0건
      6. `grep -r '<label\b' app/routes/ app/components/ --include='*.tsx' | grep -v 'components/editor/' | grep -v 'components/ui/'` — 에디터/ui래퍼 제외 후 0건. 참고: tag-chip의 label은 위 3개 파일에서만 허용.
      7. `grep -r 'as any' app/ --include='*.tsx' --include='*.ts' -l` — 파일 0개
    Expected Result: 모든 네이티브 폼 요소 0건 (예외: hidden input, color input, 에디터 내부)
    Evidence: .sisyphus/evidence/task-17-native-check.txt
  ```

  **Commit**: YES (if fixes needed)
  - Message: `fix(ui): resolve build errors from shadcn migration`
  - Pre-commit: `npx react-router build && tsc --noEmit`

- [x] 18. Playwright 폼 기능 통합 테스트

  **What to do**:
  - **인증 전략 (현실적 범위 한정)**:
    - `.dev.vars`의 `TEST_VERIFIED_SESSION`과 `TEST_ADMIN_SESSION`은 **플레이스홀더**임. 이 프로젝트는 외부 인증(ada-kr-pos.com)을 사용하므로 로컬에서 유효한 세션을 자동 생성할 수 없음.
    - **따라서 Playwright 브라우저 QA는 비인증 접근 가능 페이지에만 한정**:
      - 비인증 접근 가능: `/logs`, `/journey`, `/tags`, `/learners`, `/search`, `/guide`
      - 인증 필요 (Playwright 불가): `/write/*`, `/settings`, `/inbox`, `/admin/*`
    - **인증 필요 페이지의 마이그레이션 검증은 정적 grep 기반으로 수행** (Task 17에서 이미 실행):
      - 네이티브 요소 잔존 검사 (grep)
      - import 경로 검증 (grep)
      - 빌드/타입체크 통과 확인
  - Playwright로 주요 폼 기능이 마이그레이션 후에도 정상 동작하는지 검증
  - **테스트 시나리오**:
    1. 비인증 Public 페이지: FilterBar/SortBar Select 동작 확인 (`/logs` 등)
    2. 인증 가능 시: Write Note 폼 — visibility select 선택 → 제출
    3. 인증 가능 시: Settings 폼 — default visibility 변경 → 저장
    4. Admin 접근 가능 시: stages 테이블 렌더링 확인
  - 스크린샷 캡처하여 시각적 검증
  - `pnpm dev` 환경에서 테스트 실행

  **Must NOT do**:
  - 프로덕션 배포 금지
  - `.dev.vars` 내 실제 API 키 수정 금지
  - 인증 미들웨어 우회 코드 추가 금지

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Playwright 테스트 + 인증 부트스트랩 처리
  - **Skills**: [`playwright`]
    - `playwright`: 브라우저 자동화, 쿠키 주입, 폼 동작 검증

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 5 (after Task 17)
  - **Blocks**: F1-F4
  - **Blocked By**: Task 17

  **References**:

  **Pattern References**:
  - `app/lib/auth.middleware.ts:141-160` — requireVerified, requireRole 미들웨어. 인증 강제 로직 이해
  - `.dev.vars:1-5` — TEST_VERIFIED_SESSION, TEST_ADMIN_SESSION 플레이스홀더. 쿠키 주입용
  - `app/routes/public/write/note.tsx:115-186` — Note 폼 구조 (Playwright 셀렉터용)
  - `app/routes/public/settings.tsx:76-136` — Settings 폼 구조
  - `app/routes/admin/stages/index.tsx` — Admin 테이블 구조
  - `app/components/FilterBar.tsx` — FilterBar shadcn Select (비인증 접근 가능)

  **External References**:
  - Playwright 쿠키 설정: `https://playwright.dev/docs/api/class-browsercontext#browser-context-add-cookies`

  **WHY Each Reference Matters**:
  - auth.middleware.ts: 어떤 라우트가 인증 없이 접근 가능한지 파악하여 테스트 시나리오 결정
  - .dev.vars: 테스트 세션 쿠키값 — 실제 값이 있으면 인증 페이지 테스트 가능
  - FilterBar: 비인증으로도 테스트 가능한 shadcn Select 컴포넌트

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Public 비인증 페이지 — FilterBar Select 동작
    Tool: Playwright (playwright skill)
    Preconditions: pnpm dev 실행 중, seed data 로드됨
    Steps:
      1. Navigate to /logs (비인증 접근 가능)
      2. FilterBar의 Select 컴포넌트 탐색 — `button[role="combobox"]` 또는 `[data-slot="select-trigger"]`
      3. Select 클릭 → 드롭다운 열림 확인
      4. 옵션 선택 → 선택값 반영 확인
      5. 스크린샷 캡처
    Expected Result: shadcn Select 정상 렌더링 + 동작
    Failure Indicators: 네이티브 select 렌더링, 드롭다운 미표시
    Evidence: .sisyphus/evidence/task-18-filterbar-select.png

  Scenario: 빌드 산출물 정적 검증 (인증 불필요)
    Tool: Bash (grep)
    Preconditions: Task 17 빌드 성공
    Steps:
      1. `grep -r '<select' app/routes/ app/components/ --include='*.tsx' -l` — 네이티브 select 잔존 파일 0개
      2. `grep -r '<table' app/routes/ --include='*.tsx' -l` — 네이티브 table 잔존 파일 0개
      3. `grep -r 'from.*~/components/ui/' app/routes/ --include='*.tsx' -c | sort -t: -k2 -rn | head -20` — shadcn 컴포넌트 사용 빈도 확인 (1건 이상)
      4. `grep -rl 'SelectTrigger\|<Button\|<Input\|<Textarea\|<Label\|<Table\|<Badge' app/routes/ --include='*.tsx' | wc -l` — shadcn 컴포넌트 사용 파일 수 (20+개 예상)
    Expected Result: 네이티브 요소 0파일, shadcn 사용 20+ 파일
    Failure Indicators: 네이티브 요소 잔존, shadcn 사용 파일 부족
    Evidence: .sisyphus/evidence/task-18-static-verify.txt
  ```

  **Commit**: NO (검증 전용, 코드 변경 없음)

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Rejection → fix → re-run.

- [x] F1. **Plan Compliance Audit** — `oracle`

  **What to do**: 플랜의 Must Have / Must NOT Have 항목을 코드베이스에서 검증

  **QA Scenarios:**

  ```
  Scenario: Must Have 검증
    Tool: Bash (grep)
    Steps:
      1. `grep -rl 'from.*~/components/ui/' app/routes/ --include='*.tsx' | wc -l` — shadcn 사용 파일 20+개 확인
      2. `grep 'focus-visible' app/components/ui/button.tsx app/components/ui/input.tsx app/components/ui/select.tsx` — focus ring 존재
      3. `grep 'name=' app/routes/public/write/note.tsx app/routes/public/write/article.tsx` — FormData name 보존
      4. `ls .sisyphus/evidence/task-*.txt .sisyphus/evidence/task-*.png 2>/dev/null | wc -l` — evidence 파일 10+개 존재
    Expected Result: Must Have 항목 전체 충족
    Evidence: .sisyphus/evidence/final-qa/f1-compliance.txt

  Scenario: Must NOT Have 검증
    Tool: Bash (grep)
    Steps:
      1. `grep -rl "from.*shadcn.*Form\|from.*~/components/ui/form" app/ --include='*.tsx'` — shadcn Form 0건
      2. `grep -r 'oklch' app/styles/ --include='*.css'` — OKLCH 0건
      3. `grep -r 'as any\|@ts-ignore\|@ts-expect-error' app/ --include='*.tsx' --include='*.ts'` — 금지 패턴 0건
      4. `grep -r '<select\b' app/routes/ app/components/ --include='*.tsx' | grep -v 'components/editor/' | grep -v 'components/ui/'` — 에디터/ui래퍼 제외 후 0건
      5. `grep -r '<button\b' app/routes/ app/components/ --include='*.tsx' | grep -v 'components/editor/' | grep -v 'components/ui/'` — 에디터/ui래퍼 제외 후 0건
      6. `grep -r '<input\b' app/routes/ app/components/ --include='*.tsx' | grep -v 'type="hidden"' | grep -v 'type="color"' | grep -v 'components/editor/' | grep -v 'components/ui/'` — 예외 제외 후 0건 (tag-chip checkbox는 $recordSlug.edit.tsx, $recordSlug.details.tsx에서만 허용)
      7. `grep -r '<table\b' app/routes/ --include='*.tsx' -l` — 0파일
      8. `grep -r '<textarea\b' app/routes/ app/components/ --include='*.tsx' | grep -v 'components/editor/' | grep -v 'components/ui/'` — 에디터/ui래퍼 제외 후 0건
      9. `grep -r '<label\b' app/routes/ app/components/ --include='*.tsx' | grep -v 'components/editor/' | grep -v 'components/ui/'` — 에디터/ui래퍼 제외 후 0건 (tag-chip label은 $recordSlug.edit.tsx, $recordSlug.details.tsx에서만 허용)
    Expected Result: 모든 네이티브 폼 요소 0건 (예외: hidden input, color input, 에디터 내부)
    Evidence: .sisyphus/evidence/final-qa/f1-guardrails.txt
  ```

  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [x] F2. **Code Quality Review** — `unspecified-high`

  **What to do**: 빌드, 타입, 코드 품질 종합 검증

  **QA Scenarios:**

  ```
  Scenario: 빌드 + 타입 검증
    Tool: Bash
    Steps:
      1. `npx react-router build 2>&1` — exit code 0 확인
      2. `tsc --noEmit 2>&1` — exit code 0 확인
    Expected Result: 빌드/타입 모두 성공
    Evidence: .sisyphus/evidence/final-qa/f2-build.txt

  Scenario: 코드 품질 검사
    Tool: Bash (grep)
    Steps:
      1. `grep -rn 'console\.log' app/routes/ app/components/ --include='*.tsx' --include='*.ts' | grep -v '\/\/'` — console.log 잔존 0건 (주석 제외)
      2. `grep -rn 'catch\s*{\s*}' app/ --include='*.tsx' --include='*.ts'` — 빈 catch 0건
      3. `grep -rn '#[0-9a-fA-F]\{3,8\}' app/components/ui/ --include='*.tsx'` — ui/ 내 하드코딩 색상 0건 (CSS 변수 사용 확인)
    Expected Result: 품질 이슈 0건
    Evidence: .sisyphus/evidence/final-qa/f2-quality.txt
  ```

  Output: `Build [PASS/FAIL] | TypeCheck [PASS/FAIL] | Quality Issues [N] | VERDICT`

- [x] F3. **Real QA — 비인증 접근 가능 페이지** — `unspecified-high` (+ `playwright` skill)

  **What to do**: 인증 불필요한 Public 페이지에서 shadcn 컴포넌트 렌더링 + 동작 검증. 이 프로젝트는 외부 인증(ada-kr-pos.com)을 사용하고 `.dev.vars`의 테스트 세션은 플레이스홀더이므로, **인증 필요 페이지는 빌드/정적 검증으로 대체**하고 비인증 접근 가능 페이지만 Playwright로 검증.

  **QA Scenarios:**

  ```
  Scenario: Public /logs 페이지 — FilterBar Select 동작
    Tool: Playwright (playwright skill)
    Preconditions: pnpm dev 실행, seed data 로드
    Steps:
      1. Navigate to http://localhost:5173/logs
      2. FilterBar 영역에서 `button[role="combobox"]` 탐색
      3. Select 클릭 → 드롭다운 열림 확인 (`[role="listbox"]` 존재)
      4. 옵션 1개 클릭 → 드롭다운 닫힘 + 선택값 반영
      5. 스크린샷 캡처
    Expected Result: shadcn Select 정상 렌더링 + 상호작용
    Evidence: .sisyphus/evidence/final-qa/f3-filterbar.png

  Scenario: Public /journey 페이지 — 컴포넌트 렌더링
    Tool: Playwright (playwright skill)
    Steps:
      1. Navigate to http://localhost:5173/journey
      2. 페이지 정상 로드 확인 (200 OK, 에러 없음)
      3. 네이티브 `<select>` 태그 잔존 확인 → `document.querySelectorAll('select').length === 0`
      4. 스크린샷 캡처
    Expected Result: 네이티브 select 0개, 페이지 정상 렌더링
    Evidence: .sisyphus/evidence/final-qa/f3-journey.png
  ```

  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [x] F4. **Scope Fidelity Check** — `deep`

  **What to do**: 모든 태스크의 "What to do"와 실제 변경 사항 1:1 대조

  **QA Scenarios:**

  ```
  Scenario: Scope 일치 확인
    Tool: Bash (git)
    Steps:
      1. `git diff --name-only HEAD~5..HEAD` — 변경된 파일 목록 추출 (커밋 수에 따라 조정)
      2. 변경 파일 중 app/components/ui/ → 예상된 shadcn 컴포넌트 파일만 있는지 확인
      3. 변경 파일 중 app/routes/ → 플랜에 명시된 파일만 변경되었는지 확인
      4. `git diff HEAD~5..HEAD -- app/components/editor/` — Tiptap 에디터 변경 0건 확인
      5. `git diff HEAD~5..HEAD -- app/db/ app/lib/auth.server.ts app/lib/auth.middleware.ts` — DB/인증 로직 변경 0건 확인
    Expected Result: 변경이 플랜 범위 내, 금지 영역 미변경
    Evidence: .sisyphus/evidence/final-qa/f4-scope.txt

  Scenario: Must NOT do 위반 검사
    Tool: Bash (grep)
    Steps:
      1. `grep -r 'type="hidden"' app/routes/ --include='*.tsx' | wc -l` — hidden input 개수 보존 확인 (변경 전 후 비교)
      2. `git diff HEAD~5..HEAD -- app/styles/tokens.css` — tokens.css 변경 0건 (추가만 허용)
    Expected Result: hidden input 보존, tokens.css 미수정
    Evidence: .sisyphus/evidence/final-qa/f4-guardrails.txt
  ```

  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

- **Wave 1**: `chore(ui): initialize shadcn/ui with Quiet Depth theme mapping` — components.json, app/lib/utils.ts, app/styles/global.css, tsconfig 변경
- **Wave 2**: `chore(ui): install and customize shadcn components` — app/components/ui/*.tsx
- **Wave 3**: `refactor(public): migrate native elements to shadcn components` — app/routes/public/**, app/components/FilterBar.tsx, SortBar.tsx, GlobalNav.tsx
- **Wave 4**: `refactor(admin): migrate native elements to shadcn components` — app/routes/admin/**
- **Wave 5**: `test(qa): add Playwright form verification tests` — 테스트 파일

---

## Success Criteria

### Verification Commands
```bash
npx react-router build          # Expected: Build successful, no errors
tsc --noEmit                     # Expected: 0 errors
wrangler pages dev ./build/client --d1 DB  # Expected: Server starts, pages render
```

### Final Checklist
- [ ] 네이티브 `<select>` 잔존 0개 (grep 확인)
- [ ] 네이티브 `<button>` 중 submit이 아닌 것 잔존 0개
- [ ] 네이티브 `<table>` 잔존 0개
- [ ] 모든 `app/components/ui/` 파일이 Quiet Depth CSS 변수 사용
- [ ] shadcn `Form` 컴포넌트 import 0건
- [ ] React Router `<Form>` action/loader 정상 동작
- [ ] Public 영역 radius 20-24px 유지
- [ ] Admin 영역 compact 스타일 유지
- [ ] focus ring, keyboard nav 정상 작동
