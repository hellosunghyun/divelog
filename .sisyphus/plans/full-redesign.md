# 전체 UI 리디자인 — 하이브리드 블렌드

## TL;DR

> **Quick Summary**: divelog 앱의 전체 Public + Admin UI를 Quiet Depth 디자인 철학을 유지하면서 .agent/skills/ 4개 스킬 파일의 고급 기법(타이포그래피, 카드 구조, 미세 인터랙션, 레이아웃)을 하이브리드 블렌드하여 프리미엄 품질로 업그레이드한다. 기존 완성 페이지 시각 업그레이드 + 미구현 페이지 새 디자인 기준 구현.
>
> **Deliverables**:
> - 인프라: Pretendard+Geist 듀얼 폰트, Phosphor Icons, Framer Motion, Vitest, cn() 유틸, 토큰 통합
> - 28개 컴포넌트 시각 업그레이드
> - 21개 Public 라우트 완성 (8개 업그레이드 + 13개 신규 구현)
> - 23개 Admin 라우트 완성 (15개 업그레이드 + 8개 신규 구현)
> - Living Style Reference 페이지 (시각적 진실의 원천)
>
> **Estimated Effort**: XL
> **Parallel Execution**: YES — 8 waves
> **Critical Path**: Wave 0 (baseline) → Wave 1 (infra) → Wave 2 (components) → Wave 3-4 (public) → Wave 5-6 (admin) → Wave 7 (polish) → Final Verification

---

## Context

### Original Request
전체 리디자인 진행. `.agent/skills/` 파일 참고해서 모던하고 아름답게.

### Interview Summary
**Key Discussions**:
- **디자인 방향**: 하이브리드 블렌드 — Quiet Depth 색상/톤/철학 유지 + 스킬 파일 기법 차용
- **범위**: Public + Admin 전체 (44 라우트 + 28 컴포넌트 + 스타일 인프라)
- **폰트**: Pretendard (한글) + Geist (라틴/숫자) 듀얼 — unicode-range 분리
- **모션**: Framer Motion 도입 — subtle하게, Quiet Depth 제약 내
- **아이콘**: lucide-react → @phosphor-icons/react Light 변형
- **테스트**: Vitest 인프라 세팅 + Playwright QA 시나리오

**Research Findings**:
- Tailwind CSS v4.1.13 via @tailwindcss/vite — 완벽한 @theme 블록 존재
- tokens.css와 app.css @theme 중복 — 통합 필요
- lucide-react 사용처 3개 파일, 25개 아이콘 — 소규모 마이그레이션
- Admin 페이지 15개가 실제 CRUD 구현 있음 (단순 스텁 아님)
- TipTap 에디터 서브시스템 3,005줄 — 격리 필요
- 기존 Playwright 스모크 테스트가 "좋아요/인기순/베스트" 텍스트 부재를 검증 중

### Metis Review
**Identified Gaps** (addressed):
- **토큰 통합**: tokens.css + app.css @theme 중복 → Wave 1에서 통합, app.css @theme을 정본으로
- **cn() 유틸 부재**: template literal 방식 → clsx + tailwind-merge 설치
- **Framer Motion SSR**: LazyMotion + domAnimation 패턴 정의
- **에디터 격리**: TipTap 확장 건드리지 않음, 아이콘 교체 + 색상 업데이트만
- **Living Style Reference**: Wave 1에서 시각적 진실의 원천 페이지 생성
- **성능 예산**: 번들 사이즈 +20KB gzip 이내, LCP 2.5초 이내
- **접근성 회귀**: 기존 aria 속성 보존, 색 대비 4.5:1 이상, 터치 타겟 44px 이상

---

## Design Authority Hierarchy (CRITICAL — 모든 태스크에 적용)

```
1. AGENTS.md 제약사항 (절대 — 좋아요/인기순/베스트 금지, 해양 일러스트 금지 등)
2. .docs/design.md Quiet Depth 디자인 시스템 (색상, 톤, 여백 철학)
3. 하이브리드 블렌드 규칙 (아래 정의)
4. .agent/skills/ 스킬 파일 기법 (subtle 버전으로만 적용)
```

### 하이브리드 블렌드 규칙

**Quiet Depth에서 유지**:
- 색상 팔레트 전체 (ocean palette, stage tones, semantic colors)
- 톤/감성: 조용하고 깊은 에디토리얼 (Reflection over Stimulation)
- 여백 철학: 넉넉한 여백, 통일된 간격 (4px 배수)
- 접근성 기준: 16px↑, 44px↑ 터치 타겟, focus ring
- 모션 금지 목록: bubble, parallax 남발, wave, bouncing, confetti, particle
- 콘텐츠 우선: 기록과 질문이 가장 먼저 보이는 구조

**스킬 파일에서 차용 (subtle 버전)**:
- **타이포그래피**: tracking-tight for headlines, weight 500/600 활용, text-wrap: balance
- **카드 구조**: Double-Bezel 개념 → outer shell(bg-surface-secondary, ring-1 ring-border-subtle, p-1.5, rounded-lg) + inner core(bg-surface, rounded-md)
- **호버/활성**: active:scale-[0.98] 피드백, hover:shadow-card-hover 상승
- **레이아웃**: 일부 비대칭 도입 (split-screen hero, offset grid), 센터 일변도 탈피
- **Entry 애니메이션**: Staggered fade-up (duration-slow, ease-out, subtle translateY 12px)
- **Shadow**: 배경 hue로 tinted — rgba(11,36,71,0.03) 계열 유지
- **인터랙티브 상태**: 스켈레톤 shimmer 개선, 빈 상태 디자인 강화

**명시적 금지 (스킬 파일 기법 중 적용하지 않는 것)**:
- Magnetic button physics (마우스 추종)
- Parallax card stacks
- Horizontal scroll hijack
- Custom cursor
- Neon/outer glow
- Gradient text on large headers
- Text mask reveals, text scramble
- Particle explosion button
- Confetti/reward animation
- 3D tilt card
- Holographic foil effect

**Admin 페이지 예외**: 스킬 파일 기법 (Double-Bezel, spring physics, staggered entry) Admin에 적용 금지. Admin은 AGENTS.md §Admin 디자인 규칙만 따름: utilitarian, dense, neutral, compact.

---

## Work Objectives

### Core Objective
divelog 앱의 전체 UI를 Quiet Depth 기반 하이브리드 블렌드 디자인으로 업그레이드하여, 프리미엄 에디토리얼 품질을 달성한다.

### Concrete Deliverables
- 인프라: 폰트 듀얼 시스템, Phosphor Icons, Framer Motion LazyMotion, cn() 유틸, 토큰 통합, Vitest 설정
- Living Style Reference 페이지: 토큰·카드·버튼·타이포·모션의 시각적 기준
- 28개 컴포넌트 시각 업그레이드 (GlobalNav, Footer, 모든 Card, 상태 컴포넌트 등)
- 21개 Public 라우트 시각 완성
- 23개 Admin 라우트 시각 완성
- Vitest 컴포넌트 테스트 기반
- 기존 스모크 테스트 통과 유지

### Definition of Done
- [ ] `tsc --noEmit` 0 errors
- [ ] `npx react-router build` 성공
- [ ] `pnpm vitest run` 모든 테스트 통과
- [ ] `npx playwright test` 모든 스모크 테스트 통과
- [ ] 모든 라우트가 1440px / 768px / 375px에서 레이아웃 깨짐 없음
- [ ] Lighthouse 접근성 점수 90↑
- [ ] 번들 사이즈 증가 ≤ 20KB gzip (vs 현재 baseline)
- [ ] "좋아요", "인기순", "베스트", "추천순" 텍스트 어디에도 없음

### Must Have
- Pretendard + Geist 듀얼 폰트 (unicode-range 분리)
- Phosphor Icons Light 변형 (25개 아이콘 마이그레이션)
- Framer Motion (LazyMotion + domAnimation, client-only 래퍼)
- cn() 유틸 (clsx + tailwind-merge)
- 토큰 통합 (tokens.css → app.css @theme 정본화)
- Living Style Reference 페이지
- 모든 컴포넌트 hover/active/focus 상태
- 모든 페이지 empty/loading/error 상태
- prefers-reduced-motion에서 모든 Framer Motion 비활성화
- Korean UI 텍스트 (에러, 빈 상태, CTA 모두 한국어)

### Must NOT Have (Guardrails)
- 좋아요, 추천, 싫어요, 인기순 정렬, 베스트 댓글
- 말풍선/채팅 버블 UI
- 해양 일러스트, 물고기 아이콘
- Leaderboard, 개인 비교 차트, 상위 작성자 랭킹
- Rich text 에디터 교체 (기존 TipTap 유지)
- 자체 로그인/회원가입 UI
- `as any`, `@ts-ignore`, `@ts-expect-error`
- TipTap 확장 수정 (7개 커스텀 확장 건드리지 않음)
- DB 스키마, API 라우트, 인증 로직 변경
- 라우트 구조 변경 (URL 변경 없음)
- 승인 목록 외 의존성 설치
- Admin 페이지에 스킬 파일 기법 적용

### Approved Dependencies (이 목록 외 설치 금지)
```
framer-motion (latest)
@phosphor-icons/react (latest)
clsx (latest)
tailwind-merge (latest)
@fontsource-variable/pretendard (latest) — 또는 CDN
geist (latest) — Vercel의 Geist 폰트 패키지, 또는 CDN

# Testing dependencies (Task 9, 46):
@testing-library/react (latest)
@testing-library/jest-dom (latest)
jsdom (latest)
@axe-core/playwright (latest) — 접근성 자동 감사용
```

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: Vitest + Playwright 존재 (기초적)
- **Automated tests**: Tests-after (사용자가 명시적으로 선택 — TDD가 아닌 구현 후 테스트 작성 방식)
  - 사용자 인터뷰에서 "테스트 인프라 세팅하고 싶다" → "Vitest" 선택
  - TDD(RED-GREEN-REFACTOR) 워크플로우는 요청되지 않음
  - 각 태스크는 구현 완료 후 QA 시나리오 실행 + 필요 시 컴포넌트 테스트 작성
- **Framework**: Vitest (컴포넌트) + Playwright (E2E/스크린샷)
- **Visual regression**: Playwright 스크린샷 비교 (1440px, 768px, 375px)

### QA Policy
- 매 태스크: `tsc --noEmit` + Playwright 스크린샷
- 매 Wave 완료: `npx react-router build` + `pnpm vitest run` + `npx playwright test`
- Evidence: `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`

### QA Tools by Domain
- **Frontend/UI**: Playwright (`playwright` skill) — Navigate, interact, assert DOM, screenshot
- **Type Safety**: Bash — `tsc --noEmit`
- **Build**: Bash — `npx react-router build`
- **Tests**: Bash — `pnpm vitest run`
- **E2E**: Bash — `npx playwright test`

### 보호된 라우트 인증 QA 패턴 (MANDATORY)

일부 페이지는 인증이 필요합니다 (`requireAuth`, `requireVerified`, `requireRole`). Playwright QA에서 이러한 페이지에 접근하려면:

```typescript
// .dev.vars에 TEST_LEARNER_SESSION, TEST_ADMIN_SESSION 환경변수가 정의되어 있음
// Playwright에서 로컬 서버(localhost:5173) 보호된 라우트 접근 시:

// 로컬 개발 서버는 .dev.vars의 테스트 세션 값을 사용하므로,
// Playwright context에 localhost 도메인 쿠키를 직접 설정:
await context.addCookies([{
  name: 'adakrpos_session',
  value: process.env.TEST_LEARNER_SESSION, // .dev.vars에서 읽음
  domain: 'localhost',
  path: '/',
}]);

// Admin 접근 시:
await context.addCookies([{
  name: 'adakrpos_session',
  value: process.env.TEST_ADMIN_SESSION, // .dev.vars에서 읽음
  domain: 'localhost',
  path: '/',
}]);

// TEST_*_SESSION 값 로드:
// Playwright config(playwright.config.ts)의 use.env 또는
// dotenv로 .dev.vars 파일에서 로드
```

**보호된 라우트 목록**:
- `/write`, `/write/note`, `/write/article` → `requireVerified` → `TEST_LEARNER_SESSION` 사용
- `/inbox`, `/me`, `/settings` → `requireAuth` → `TEST_LEARNER_SESSION` 사용
- `/admin/*` 전체 → `requireRole` → `TEST_ADMIN_SESSION` 사용

**모든 보호된 라우트 QA 시나리오에서**: 위 `localhost` 도메인 쿠키 주입 절차를 Steps의 첫 번째로 포함할 것. 도메인은 반드시 `'localhost'`를 사용 (`.ada-kr-pos.com`은 프로덕션 전용). 환경변수는 `.dev.vars`에서 로드.

### Standard QA Protocol (모든 태스크 공통)

모든 태스크는 최소한 다음 QA를 실행해야 합니다:

```
Standard QA (every task):
  Tool: Bash
  Steps:
    1. tsc --noEmit → 0 errors
    2. npx react-router build → 성공 (exit code 0)
  Expected Result: 타입 에러 없음, 빌드 성공

Visual QA (page/component tasks):
  Tool: Playwright (playwright skill)
  Steps:
    1. [보호된 라우트인 경우] context.addCookies로 TEST_*_SESSION 주입
    2. 해당 페이지 1440px 뷰포트에서 접속
    3. 핵심 UI 요소 존재 확인 (heading, card, button 등)
    4. 375px 뷰포트에서 접속 → 가로 스크롤 없음, 레이아웃 깨짐 없음
    5. 스크린샷 캡처: .sisyphus/evidence/task-{N}-{page}-{viewport}.png
  Expected Result: 정상 렌더링, 반응형 레이아웃 정상

Philosophy Guard QA (every page task):
  Tool: Bash
  Steps:
    1. grep -ri "좋아요\|인기순\|베스트\|추천순" app/routes/ app/components/ → 결과 없음
    2. grep -ri "oops\|Oops" app/components/ → 결과 없음
  Expected Result: 금지 텍스트 없음
```

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 0 (Start Immediately — baseline capture, READ-ONLY):
├── Task 1: Baseline 스크린샷 캡처 (9개 완성 페이지 × 3 뷰포트)
├── Task 2: 번들 사이즈 & 성능 baseline 측정
└── Task 3: 기존 테스트 감사 & CTA 텍스트 인벤토리

Wave 1 (After Wave 0 — infrastructure, MAX PARALLEL):
├── Task 4: Pretendard + Geist 듀얼 폰트 설정
├── Task 5: Phosphor Icons 마이그레이션 (3 파일, 25 아이콘)
├── Task 6: Framer Motion 설치 + LazyMotion SSR 패턴
├── Task 7: cn() 유틸리티 생성 (clsx + tailwind-merge)
├── Task 8: 디자인 토큰 통합 (tokens.css → app.css @theme)
├── Task 9: Vitest 컴포넌트 테스트 인프라 확장
├── Task 10: 모션 유틸리티 & CSS 확장 (cubic-bezier, keyframes)
└── Task 11: Living Style Reference 페이지 구현

Wave 2 (After Wave 1 — core components redesign, MAX PARALLEL):
├── Task 12: GlobalNav 리디자인 (floating pill, mobile reveal)
├── Task 13: Footer 리디자인 (심플, 에디토리얼)
├── Task 14: HeroSection 리디자인 (비대칭, 향상된 그래디언트)
├── Task 15: SceneCard 리디자인 (Double-Bezel 적용, hover physics)
├── Task 16: QuestionCard + ResponseCard + SelfAnswerCard 리디자인
├── Task 17: LearnerCard + CollaborationUnitCard + HighlightedSentenceCard 리디자인
├── Task 18: StageStrip + TimelineView + ActivityFeed 리디자인
├── Task 19: FilterBar + SortBar + ViewToggle 리디자인
├── Task 20: EmptyState + LoadingSkeleton + ErrorState 리디자인
└── Task 21: CTABand + NavigationFade + ContentRenderer 리디자인

Wave 3 (After Wave 2 — implemented public pages upgrade, MAX PARALLEL):
├── Task 22: HOME 페이지 시각 업그레이드
├── Task 23: JOURNEY + Stage Detail 페이지
├── Task 24: LOGS 목록 페이지 시각 업그레이드
├── Task 25: RECORD DETAIL + Record Details 사이드바
├── Task 26: SEARCH 페이지 시각 업그레이드
└── Task 27: WRITE 선택 + Note 에디터 + Article 에디터 페이지

Wave 4 (After Wave 2 — new public pages implementation, MAX PARALLEL):
├── Task 28: LEARNERS 목록 업그레이드 + Learner Profile 구현
├── Task 29: CHALLENGES 목록 업그레이드 + Challenge Detail 구현
├── Task 30: TAGS 목록 + Tag Detail 구현
├── Task 31: ME (내 프로필) + SETTINGS 페이지 구현
├── Task 32: INBOX (알림) + GUIDE (가이드) 페이지 구현
├── Task 33: Collaboration Group + Collective Memory 페이지 구현
└── Task 34: Record Edit 페이지 구현

Wave 5 (After Wave 2 — admin infrastructure + layout, PARALLEL):
├── Task 35: Admin 레이아웃 토큰 + AdminSidebar 리디자인
├── Task 36: AdminContextBar 리디자인 + 공통 Admin 패턴 정의
└── Task 37: Admin Dashboard 시각 업그레이드

Wave 6 (After Wave 5 — admin pages implementation, MAX PARALLEL):
├── Task 38: Admin Stages 관리 (목록 + 상세)
├── Task 39: Admin Challenges 관리 (목록 + 상세)
├── Task 40: Admin Learners 관리 (목록 + 상세)
├── Task 41: Admin Records + Dialogue 관리
├── Task 42: Admin Collaboration + Memories 관리
├── Task 43: Admin Templates + Curation 관리
├── Task 44: Admin Tags + Analytics 관리
└── Task 45: Admin Settings + Roles + Audit 관리

Wave 7 (After Waves 3-6 — polish & regression):
├── Task 46: 전체 접근성 감사 + 수정
├── Task 47: 성능 최적화 + 번들 사이즈 감사
├── Task 48: 반응형 QA (모든 페이지 × 3 뷰포트)
└── Task 49: 에디터 시각 업데이트 (editor.css 색상/폰트 + 툴바 아이콘)

Wave FINAL (After ALL tasks — independent review, 4 parallel):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review
├── Task F3: Real manual QA (Playwright full sweep)
└── Task F4: Scope fidelity check

Critical Path: T1 → T4-T11 → T12-T21 → T22-T27 → T46-T49 → F1-F4
Parallel Speedup: ~65% faster than sequential
Max Concurrent: 8 (Waves 1, 2, 6)
```

### Dependency Matrix

| Task | Depends On | Blocks | Wave |
|------|-----------|--------|------|
| 1-3 | — | 4-11 | 0 |
| 4-11 | 1-3 | 12-21 | 1 |
| 12-21 | 4-11 | 22-34 | 2 |
| 22-27 | 12-21 | 46-49 | 3 |
| 28-34 | 12-21 | 46-49 | 4 |
| 35-37 | 12-21 | 38-45 | 5 |
| 38-45 | 35-37 | 46-49 | 6 |
| 46-49 | 22-45 | F1-F4 | 7 |
| F1-F4 | 46-49 | — | FINAL |

### Agent Dispatch Summary

| Wave | Tasks | Categories |
|------|-------|-----------|
| 0 | 3 | T1 → `unspecified-low`, T2-T3 → `quick` |
| 1 | 8 | T4-T5 → `quick`, T6-T7 → `quick`, T8 → `unspecified-high`, T9 → `quick`, T10-T11 → `visual-engineering` |
| 2 | 10 | T12-T14 → `visual-engineering`, T15-T21 → `visual-engineering` |
| 3 | 6 | T22-T27 → `visual-engineering` |
| 4 | 7 | T28-T34 → `visual-engineering` |
| 5 | 3 | T35-T37 → `visual-engineering` |
| 6 | 8 | T38-T45 → `visual-engineering` |
| 7 | 4 | T46 → `deep`, T47 → `unspecified-high`, T48 → `unspecified-high`, T49 → `visual-engineering` |
| FINAL | 4 | F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `deep` |

---

## TODOs

> Implementation + Test = ONE Task. Never separate.
> EVERY task MUST have: Recommended Agent Profile + Parallelization info + QA Scenarios.
> **Design Authority Hierarchy** 준수: AGENTS.md > design.md > Hybrid Blend > Skills
> **모든 한국어 UI 텍스트**: 에러, 빈 상태, CTA, placeholder 전부 한국어
> **.agent/skills/ 4개 스킬 파일**을 참조하여 디자인 품질 보장 (subtle 버전으로 적용)

### Wave 0 — Baseline Capture (READ-ONLY)

- [x] 1. Baseline 스크린샷 캡처

  **What to do**:
  - 현재 완성된 9개 페이지의 스크린샷을 3개 뷰포트(1440px, 768px, 375px)에서 캡처
  - 대상 페이지: `/`, `/journey`, `/logs`, `/logs/{any-record}`, `/learners`, `/challenges`, `/search`, `/write`, `/admin`
  - 각 페이지를 `pnpm dev`로 로컬 서버 실행 후 Playwright로 캡처
  - `.sisyphus/evidence/baseline/` 디렉토리에 `{page}-{viewport}.png` 형식으로 저장
  - 총 27장 (9페이지 × 3뷰포트)

  **Must NOT do**:
  - 어떤 파일도 수정하지 않음 (READ-ONLY)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
  - **Skills**: [`playwright`]
    - `playwright`: 브라우저 자동화로 스크린샷 캡처

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 0 (with Tasks 2, 3)
  - **Blocks**: Wave 1 전체 (Tasks 4-11)
  - **Blocked By**: None

  **References**:
  - `app/routes/public/index.tsx` — HOME 페이지 (스크린샷 대상)
  - `app/routes/public/journey/index.tsx` — JOURNEY 페이지
  - `app/routes/public/logs/index.tsx` — LOGS 페이지
  - `app/routes/public/logs/$recordSlug.tsx` — RECORD DETAIL 페이지
  - `app/routes/public/learners/index.tsx` — LEARNERS 페이지
  - `app/routes/public/challenges/index.tsx` — CHALLENGES 페이지
  - `app/routes/public/search.tsx` — SEARCH 페이지
  - `app/routes/public/write/index.tsx` — WRITE 선택 페이지
  - `app/routes/admin/index.tsx` — ADMIN DASHBOARD 페이지
  - `tests/e2e/smoke.spec.ts` — 기존 Playwright 설정 참고

  **Acceptance Criteria**:
  - [ ] `.sisyphus/evidence/baseline/` 디렉토리에 27장의 PNG 파일 존재
  - [ ] 모든 스크린샷이 정상 렌더링 (빈 페이지, 에러 화면 아님)

  **QA Scenarios**:
  ```
  Scenario: 모든 baseline 스크린샷 캡처 확인
    Tool: Bash
    Steps:
      1. ls -la .sisyphus/evidence/baseline/ | wc -l → 28 이상 (27 파일 + 디렉토리)
      2. file .sisyphus/evidence/baseline/home-1440.png → PNG image 확인
    Expected Result: 27개 PNG 파일 모두 존재하며 유효한 이미지
    Evidence: .sisyphus/evidence/task-1-baseline-complete.txt
  ```

  **Commit**: NO (read-only)

- [x] 2. 번들 사이즈 & 성능 Baseline 측정

  **What to do**:
  - `npx react-router build` 실행하여 현재 빌드 출력 사이즈 기록
  - `build/client/assets/` 디렉토리의 JS/CSS 파일 크기 합계 기록
  - 현재 설치된 의존성 목록 기록 (`pnpm list --depth=0`)
  - 결과를 `.sisyphus/evidence/baseline/bundle-baseline.txt`에 저장

  **Must NOT do**:
  - 어떤 파일도 수정하지 않음

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 0 (with Tasks 1, 3)
  - **Blocks**: Wave 1 전체
  - **Blocked By**: None

  **References**:
  - `package.json` — 현재 의존성 확인
  - `vite.config.ts` — 빌드 설정

  **Acceptance Criteria**:
  - [ ] `.sisyphus/evidence/baseline/bundle-baseline.txt` 파일 존재
  - [ ] JS/CSS 합계 사이즈(KB) 기록됨

  **QA Scenarios**:
  ```
  Scenario: 빌드 성공 및 사이즈 기록
    Tool: Bash
    Steps:
      1. npx react-router build → 빌드 성공
      2. cat .sisyphus/evidence/baseline/bundle-baseline.txt → 사이즈 숫자 포함
    Expected Result: 빌드 성공, baseline 수치 기록됨
    Evidence: .sisyphus/evidence/task-2-bundle-baseline.txt
  ```

  **Commit**: NO (read-only)

- [x] 3. 기존 테스트 감사 & CTA 텍스트 인벤토리

  **What to do**:
  - 기존 Playwright 스모크 테스트 (`tests/e2e/smoke.spec.ts`) 실행하여 현재 통과 상태 확인
  - 기존 Vitest 테스트 (`tests/` 디렉토리) 실행하여 현재 통과 상태 확인
  - 스모크 테스트에서 assert하는 모든 텍스트 문자열을 인벤토리화
  - 결과를 `.sisyphus/evidence/baseline/test-inventory.txt`에 저장
  - 형식: `파일:줄번호 — assert 내용 — "텍스트 문자열"`

  **Must NOT do**:
  - 어떤 파일도 수정하지 않음

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 0 (with Tasks 1, 2)
  - **Blocks**: Wave 1 전체
  - **Blocked By**: None

  **References**:
  - `tests/e2e/smoke.spec.ts` — Playwright 스모크 테스트 (66줄)
  - `tests/e2e/editor.spec.ts` — 에디터 E2E 테스트
  - `tests/` 디렉토리 — Vitest 서버 사이드 테스트 (6개)

  **Acceptance Criteria**:
  - [ ] `.sisyphus/evidence/baseline/test-inventory.txt` 파일 존재
  - [ ] 모든 assert 텍스트 문자열이 목록화됨
  - [ ] `npx playwright test` 현재 통과 상태 기록됨
  - [ ] `pnpm vitest run` 현재 통과 상태 기록됨

  **QA Scenarios**:
  ```
  Scenario: 테스트 인벤토리 완성 확인
    Tool: Bash
    Steps:
      1. cat .sisyphus/evidence/baseline/test-inventory.txt → assert 목록 포함
      2. grep -c "assert\|expect\|toContain\|toBeVisible" .sisyphus/evidence/baseline/test-inventory.txt → 1 이상
    Expected Result: 인벤토리 파일에 assert 목록이 기록되어 있음
    Evidence: .sisyphus/evidence/task-3-test-inventory.txt
  ```

  **Commit**: NO (read-only)

### Wave 1 — Infrastructure (Foundation)

- [x] 4. Pretendard + Geist 듀얼 폰트 설정

  **What to do**:
  - `@fontsource-variable/pretendard` 또는 CDN으로 Pretendard Variable 폰트 로드
  - `geist` 패키지 설치 또는 CDN으로 Geist Variable 폰트 로드
  - `app/root.tsx`에서 기존 Wanted Sans Variable CDN 링크 제거
  - `@font-face` 선언으로 unicode-range 분리:
    - Pretendard: `unicode-range: U+AC00-D7AF, U+1100-11FF, U+3130-318F, U+A960-A97F, U+D7B0-D7FF` (한글)
    - Geist: `unicode-range: U+0000-007F, U+0080-00FF, U+0100-024F` (라틴, 숫자)
  - `app/app.css` @theme 블록의 `--font-sans` 업데이트: `"Pretendard Variable", "Geist", ...시스템 폰트`
  - `font-display: swap` 설정
  - `<link rel="preload">` 추가로 FOUT 최소화

  **Must NOT do**:
  - 기존 폰트 사이즈/line-height 토큰 변경하지 않음 (폰트 자체만 교체)
  - 컴포넌트 파일 수정하지 않음

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []
    - 단순 패키지 설치 + CSS 설정 변경

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 5-11)
  - **Blocks**: Wave 2 전체
  - **Blocked By**: Wave 0 (Tasks 1-3)

  **References**:
  - `app/root.tsx:32-35` — 현재 Wanted Sans Variable CDN 링크 위치
  - `app/app.css:7-8` — 현재 --font-sans 정의 (`"Wanted Sans Variable", "Wanted Sans", ...`)
  - `app/styles/tokens.css:6-8` — 레거시 폰트 스택 정의
  - `.agent/skills/taste-skill/SKILL.md:40-42` — 타이포그래피 규칙 (Geist 사용, tracking-tighter)
  - `.agent/skills/redesign-skill/SKILL.md:22-29` — 타이포그래피 감사 기준

  **Acceptance Criteria**:
  - [ ] `tsc --noEmit` 0 errors
  - [ ] `pnpm dev` 실행 시 한글 텍스트가 Pretendard로 렌더링
  - [ ] 라틴/숫자 텍스트가 Geist로 렌더링
  - [ ] 폰트 로딩 중 FOUT가 100ms 이내

  **QA Scenarios**:
  ```
  Scenario: 듀얼 폰트 렌더링 확인
    Tool: Playwright (playwright skill)
    Steps:
      1. localhost:5173/ 접속
      2. Hero 타이틀 요소의 computed font-family 확인 → "Pretendard Variable" 포함
      3. 숫자가 포함된 메타 텍스트의 computed font-family 확인 → "Geist" 포함
      4. 스크린샷 캡처
    Expected Result: 한글은 Pretendard, 라틴/숫자는 Geist로 렌더링
    Evidence: .sisyphus/evidence/task-4-font-dual.png

  Scenario: 폰트 로드 실패 시 폴백
    Tool: Playwright
    Steps:
      1. Network throttling으로 폰트 CDN 차단
      2. 페이지 로드 → 시스템 폰트로 정상 렌더링 확인
    Expected Result: 폰트 로드 실패 시에도 레이아웃 깨짐 없음
    Evidence: .sisyphus/evidence/task-4-font-fallback.png
  ```

  **Commit**: YES
  - Message: `infra(fonts): Pretendard + Geist 듀얼 폰트 설정`
  - Files: `app/root.tsx`, `app/app.css`, `app/styles/fonts.css` (신규), `package.json`
  - Pre-commit: `tsc --noEmit`

- [x] 5. Phosphor Icons 마이그레이션

  **What to do**:
  - `@phosphor-icons/react` 설치
  - `lucide-react` 임포트를 Phosphor Icons Light 변형으로 교체 (3개 파일):
    - `app/components/GlobalNav.tsx` — 5 아이콘: User→UserLight, Inbox→EnvelopeSimpleLight, Settings→GearSixLight, ExternalLink→ArrowSquareOutLight, LogOut→SignOutLight 등
    - `app/components/editor/ArticleEditor.tsx` — 18 아이콘: Bold→TextBolderLight, Italic→TextItalicLight, 등
    - `app/routes/public/write/index.tsx` — 2 아이콘: FileText→FileTextLight, MessageSquare→ChatTeardropLight 등
  - Phosphor의 Light 변형 사용 (strokeWidth 대신 weight="light")
  - 나머지 인라인 SVG 아이콘은 유지 (이번 태스크 범위 아님)
  - `lucide-react` 패키지 제거 (`pnpm remove lucide-react`)
  - tree-shaking 확인: 빌드 후 번들에 전체 아이콘셋이 포함되지 않는지 확인

  **Must NOT do**:
  - 인라인 SVG 아이콘 교체하지 않음 (lucide-react 임포트만)
  - 아이콘 크기/색상 변경하지 않음 (1:1 교체)
  - TipTap 에디터 확장 수정하지 않음

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 4, 6-11)
  - **Blocks**: Wave 2 전체
  - **Blocked By**: Wave 0

  **References**:
  - `app/components/GlobalNav.tsx` — lucide-react 임포트 5개 (line ~2-5)
  - `app/components/editor/ArticleEditor.tsx` — lucide-react 임포트 18개
  - `app/routes/public/write/index.tsx` — lucide-react 임포트 2개
  - `.agent/skills/taste-skill/SKILL.md:32` — 아이콘 규칙 (Phosphor 사용)
  - `.agent/skills/soft-skill/SKILL.md:17` — 금지 아이콘 (thick Lucide, FontAwesome)

  **Acceptance Criteria**:
  - [ ] `tsc --noEmit` 0 errors
  - [ ] `lucide-react`가 package.json에 없음
  - [ ] `@phosphor-icons/react`가 package.json에 있음
  - [ ] `npx react-router build` 성공
  - [ ] grep -r "lucide-react" app/ → 결과 없음

  **QA Scenarios**:
  ```
  Scenario: 아이콘 렌더링 확인
    Tool: Playwright
    Steps:
      1. localhost:5173/ 접속
      2. GlobalNav의 아이콘이 정상 렌더링되는지 확인 (빈 공간 아님)
      3. /write 페이지의 아이콘 확인
    Expected Result: 모든 아이콘이 Phosphor Light 스타일로 정상 표시
    Evidence: .sisyphus/evidence/task-5-icons-nav.png

  Scenario: lucide-react 완전 제거 확인
    Tool: Bash
    Steps:
      1. grep -r "lucide-react" app/ → 결과 없음
      2. grep "lucide-react" package.json → 결과 없음
    Expected Result: lucide-react 흔적 없음
    Evidence: .sisyphus/evidence/task-5-no-lucide.txt
  ```

  **Commit**: YES
  - Message: `infra(icons): lucide-react → @phosphor-icons/react 마이그레이션`
  - Files: `app/components/GlobalNav.tsx`, `app/components/editor/ArticleEditor.tsx`, `app/routes/public/write/index.tsx`, `package.json`
  - Pre-commit: `tsc --noEmit`

- [x] 6. Framer Motion 설치 + LazyMotion SSR 패턴

  **What to do**:
  - `framer-motion` 설치
  - `app/lib/motion.tsx` 생성 — LazyMotion + domAnimation 래퍼:
    ```tsx
    "use client";
    import { LazyMotion, domAnimation } from "framer-motion";
    export function MotionProvider({ children }: { children: React.ReactNode }) {
      return <LazyMotion features={domAnimation} strict>{children}</LazyMotion>;
    }
    export { m as motion } from "framer-motion";
    ```
  - `app/lib/motion-utils.ts` 생성 — 공통 모션 프리셋:
    - `fadeUp`: 서서히 위로 올라오며 나타나는 애니메이션 (translateY 12px → 0, opacity 0 → 1)
    - `fadeIn`: 서서히 나타나는 애니메이션
    - `staggerContainer`: 자식 요소 순차 등장 (staggerChildren: 0.05)
    - `staggerItem`: stagger 자식 아이템
    - `hoverScale`: hover 시 미세 확대 (scale 1.02)
    - `tapScale`: 클릭 시 축소 (scale 0.98)
    - `reducedMotion`: prefers-reduced-motion 감지 유틸리티
  - `app/root.tsx`에 MotionProvider 래핑
  - SSR 호환성 확인: LazyMotion은 서버에서 빈 렌더, 클라이언트에서 hydrate

  **Must NOT do**:
  - 기존 컴포넌트에 모션 적용하지 않음 (패턴 정의만)
  - AnimatePresence 페이지 전환 추가하지 않음
  - Magnetic button physics 구현하지 않음
  - GSAP 또는 ThreeJS 설치하지 않음

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 4-5, 7-11)
  - **Blocks**: Wave 2 전체
  - **Blocked By**: Wave 0

  **References**:
  - `app/root.tsx` — 루트 레이아웃 (MotionProvider 래핑 위치)
  - `.agent/skills/taste-skill/SKILL.md:69-72` — Framer Motion 사용 규칙 (useMotionValue, staggerChildren)
  - `.agent/skills/taste-skill/SKILL.md:89-90` — MOTION_INTENSITY 레벨 정의
  - `.agent/skills/soft-skill/SKILL.md:55-70` — 모션 철학 (커스텀 cubic-bezier, spring physics)
  - `AGENTS.md` — 모션 금지 목록 (bubble, parallax, wave, bouncing, confetti)

  **Acceptance Criteria**:
  - [ ] `tsc --noEmit` 0 errors
  - [ ] `npx react-router build` 성공 (SSR 호환)
  - [ ] `framer-motion`이 package.json에 있음
  - [ ] `app/lib/motion.tsx` 파일 존재
  - [ ] `app/lib/motion-utils.ts` 파일 존재
  - [ ] `pnpm dev` 실행 시 hydration 에러 없음

  **QA Scenarios**:
  ```
  Scenario: SSR 호환성 확인
    Tool: Playwright
    Steps:
      1. localhost:5173/ 접속
      2. 브라우저 콘솔에 hydration mismatch 에러 없음 확인
      3. 페이지 정상 렌더링 확인
    Expected Result: hydration 에러 없이 정상 동작
    Evidence: .sisyphus/evidence/task-6-no-hydration-error.png

  Scenario: reduced-motion 지원 확인
    Tool: Playwright
    Steps:
      1. prefers-reduced-motion: reduce 에뮬레이션 활성화
      2. 페이지 로드 시 애니메이션 비활성화 확인
    Expected Result: reduced-motion에서 모든 모션 비활성화
    Evidence: .sisyphus/evidence/task-6-reduced-motion.png
  ```

  **Commit**: YES
  - Message: `infra(motion): Framer Motion + LazyMotion SSR 패턴 설정`
  - Files: `app/lib/motion.tsx`, `app/lib/motion-utils.ts`, `app/root.tsx`, `package.json`
  - Pre-commit: `tsc --noEmit`

- [x] 7. cn() 유틸리티 생성 (clsx + tailwind-merge)

  **What to do**:
  - `clsx` + `tailwind-merge` 설치
  - `app/lib/cn.ts` 생성:
    ```ts
    import { clsx, type ClassValue } from "clsx";
    import { twMerge } from "tailwind-merge";
    export function cn(...inputs: ClassValue[]) {
      return twMerge(clsx(inputs));
    }
    ```
  - 기존 컴포넌트의 조건부 클래스를 cn()으로 전환하지는 않음 (Wave 2에서 컴포넌트 리디자인 시 적용)

  **Must NOT do**:
  - 기존 컴포넌트 파일 수정하지 않음 (유틸리티 생성만)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 4-6, 8-11)
  - **Blocks**: Wave 2 전체
  - **Blocked By**: Wave 0

  **References**:
  - 현재 조건부 클래스 패턴: `` className={`base ${condition ? "a" : "b"}`} `` (GlobalNav.tsx 등)
  - `.agent/skills/soft-skill/SKILL.md:43-44` — Double-Bezel 패턴에서 조건부 클래스 필요

  **Acceptance Criteria**:
  - [ ] `tsc --noEmit` 0 errors
  - [ ] `app/lib/cn.ts` 파일 존재
  - [ ] `clsx`, `tailwind-merge` 가 package.json에 있음

  **QA Scenarios**:
  ```
  Scenario: cn() 유틸리티 동작 확인
    Tool: Bash
    Steps:
      1. tsc --noEmit → 0 errors
      2. grep "export function cn" app/lib/cn.ts → 존재
    Expected Result: cn() 함수가 올바르게 export됨
    Evidence: .sisyphus/evidence/task-7-cn-util.txt
  ```

  **Commit**: YES
  - Message: `infra(util): cn() 유틸리티 추가 (clsx + tailwind-merge)`
  - Files: `app/lib/cn.ts`, `package.json`
  - Pre-commit: `tsc --noEmit`

- [x] 8. 디자인 토큰 통합 + 확장

  **What to do**:
  - `app/styles/tokens.css`의 모든 CSS custom properties를 `app/app.css` @theme 블록으로 이전
  - 중복 토큰 통합 (값이 다른 경우 app.css @theme 값 우선):
    - `--duration-fast`: tokens.css 120ms vs app.css 150ms → 150ms 확정
  - `editor.css`가 `var(--color-*)` CSS 변수를 직접 참조하므로, tokens.css 제거 시 app.css @theme에서 동일한 CSS custom property 이름 유지
  - 토큰 통합 후 `@import "./styles/tokens.css"` 제거
  - 새 토큰 추가 (하이브리드 블렌드):
    - `--tracking-tight: -0.025em` (headline letter-spacing)
    - `--tracking-tighter: -0.05em` (display letter-spacing)
    - `--tracking-wide: 0.05em` (label/eyebrow)
    - `--font-weight-medium: 500`
    - `--font-weight-semibold: 600`
    - `--shadow-tinted-sm: 0 1px 3px 0 rgba(11,36,71,0.04)` (ocean-tinted shadow)
    - `--shadow-tinted-md: 0 4px 16px -2px rgba(11,36,71,0.06)`
    - `--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1)` (이미 존재하면 확인)
    - `--ease-premium: cubic-bezier(0.32, 0.72, 0, 1)` (soft-skill 권장)
  - tokens.css 파일은 삭제하지 말고 비워둠 (editor.css import 호환성)

  **Must NOT do**:
  - 기존 색상 값 변경하지 않음 (토큰 이름/값 보존)
  - 컴포넌트 파일 수정하지 않음
  - editor.css 수정하지 않음

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []
    - 토큰 통합은 세심한 작업, 잘못하면 전체 스타일 깨짐

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 4-7, 9-11)
  - **Blocks**: Wave 2 전체
  - **Blocked By**: Wave 0

  **References**:
  - `app/app.css:5-106` — 현재 @theme 블록
  - `app/styles/tokens.css` — 레거시 토큰 (138줄, 중복)
  - `app/styles/editor.css` — var(--color-*) 직접 참조 (707줄)
  - `app/styles/global.css` — var(--color-*) 사용
  - `.agent/skills/taste-skill/SKILL.md:39-42` — 타이포그래피 토큰 (tracking, weight)
  - `.agent/skills/soft-skill/SKILL.md:55` — 커스텀 cubic-bezier 이징
  - `.docs/design.md` — Quiet Depth 색상/타이포/간격 사양

  **Acceptance Criteria**:
  - [ ] `tsc --noEmit` 0 errors
  - [ ] `npx react-router build` 성공
  - [ ] `pnpm dev` 실행 시 모든 기존 페이지 스타일 정상 (색상, 폰트 크기 등)
  - [ ] editor.css의 var(--color-*) 참조가 정상 resolve
  - [ ] 새 토큰 (tracking, weight, tinted shadow, ease) 추가됨

  **QA Scenarios**:
  ```
  Scenario: 기존 스타일 유지 확인
    Tool: Playwright
    Steps:
      1. localhost:5173/ 접속
      2. HOME 페이지의 Hero 배경색 확인 → deep-ocean gradient 유지
      3. SceneCard의 border 색상 확인 → #E3E8EF
      4. body 텍스트 색상 → #1D1D1F
    Expected Result: 모든 기존 색상 토큰이 정상 적용
    Evidence: .sisyphus/evidence/task-8-tokens-preserved.png

  Scenario: 에디터 스타일 유지 확인
    Tool: Playwright
    Steps:
      1. /write/article 접속 (로그인 필요 시 시뮬레이션)
      2. 에디터 영역의 스타일 확인 (배경, 테두리, 폰트)
    Expected Result: 에디터 스타일이 토큰 통합 후에도 동일
    Evidence: .sisyphus/evidence/task-8-editor-style.png
  ```

  **Commit**: YES
  - Message: `infra(tokens): 디자인 토큰 통합 + 하이브리드 블렌드 토큰 추가`
  - Files: `app/app.css`, `app/styles/tokens.css`
  - Pre-commit: `tsc --noEmit && npx react-router build`

- [x] 9. Vitest 컴포넌트 테스트 인프라 확장

  **What to do**:
  - 기존 Vitest 설정이 서버 사이드 테스트용으로 존재하는지 확인
  - React 컴포넌트 테스트를 위한 설정 추가:
    - `@testing-library/react` + `@testing-library/jest-dom` 설치
    - `jsdom` 또는 `happy-dom` 환경 설정
    - `vitest.config.ts` (또는 기존 설정)에 `test.environment: 'jsdom'` 추가
  - `app/lib/test-utils.tsx` 생성 — 테스트 유틸리티:
    - customRender (MotionProvider 등 래퍼 포함)
    - createMockLoaderData 헬퍼
  - 예시 컴포넌트 테스트 1개 작성 (`app/components/__tests__/EmptyState.test.tsx`):
    - EmptyState 렌더링 확인
    - variant별 메시지 표시 확인

  **Must NOT do**:
  - 기존 서버 사이드 테스트 수정하지 않음
  - 대량의 테스트 작성하지 않음 (인프라 + 예시 1개만)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 4-8, 10-11)
  - **Blocks**: Wave 2 전체
  - **Blocked By**: Wave 0

  **References**:
  - 기존 테스트 파일들 (`tests/` 디렉토리) — 현재 Vitest 설정 구조
  - `vitest.config.ts` 또는 `vite.config.ts` 내 test 설정 — 현재 테스트 환경
  - `app/components/EmptyState.tsx` — 예시 테스트 대상

  **Acceptance Criteria**:
  - [ ] `pnpm vitest run` 기존 테스트 + 새 EmptyState 테스트 모두 통과
  - [ ] `@testing-library/react` 설치됨
  - [ ] `app/lib/test-utils.tsx` 존재

  **QA Scenarios**:
  ```
  Scenario: 컴포넌트 테스트 실행
    Tool: Bash
    Steps:
      1. pnpm vitest run → 모든 테스트 통과
      2. pnpm vitest run app/components/__tests__/EmptyState.test.tsx → PASS
    Expected Result: EmptyState 테스트 통과
    Evidence: .sisyphus/evidence/task-9-vitest-pass.txt
  ```

  **Commit**: YES
  - Message: `infra(test): Vitest 컴포넌트 테스트 인프라 확장`
  - Files: `vitest.config.ts`, `app/lib/test-utils.tsx`, `app/components/__tests__/EmptyState.test.tsx`, `package.json`
  - Pre-commit: `pnpm vitest run`

- [x] 10. 모션 유틸리티 & CSS 확장

  **What to do**:
  - `app/app.css`에 새 keyframe 애니메이션 추가:
    - `@keyframes slideUp` — 아래에서 위로 슬라이드 (카드 entry)
    - `@keyframes slideDown` — 위에서 아래로 (dropdown)
    - `@keyframes scaleIn` — 0.95 → 1 스케일 (modal)
    - `@keyframes pulse-soft` — 부드러운 펄스 (status indicator)
  - 커스텀 @utility 추가:
    - `animate-slide-up`, `animate-slide-down`, `animate-scale-in`, `animate-pulse-soft`
  - 커스텀 transition 유틸리티:
    - `transition-premium` — `transition: all var(--duration-normal) var(--ease-premium)`
    - `transition-spring` — `transition: all var(--duration-normal) var(--ease-spring)`
  - hover/active 유틸리티:
    - `.hover-lift` — `hover:translateY(-2px) hover:shadow-card-hover`
    - `.active-press` — `active:scale-[0.98]`
  - prefers-reduced-motion에서 모든 커스텀 애니메이션 비활성화

  **Must NOT do**:
  - 기존 fadeUp, fadeIn, shimmer 애니메이션 수정하지 않음
  - 컴포넌트 파일 수정하지 않음

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 4-9, 11)
  - **Blocks**: Wave 2 전체
  - **Blocked By**: Wave 0

  **References**:
  - `app/app.css:109-156` — 기존 keyframes + @utility 블록
  - `.agent/skills/taste-skill/SKILL.md:88-90` — CSS 모션 레벨 정의 (cubic-bezier, will-change)
  - `.agent/skills/soft-skill/SKILL.md:55` — 커스텀 cubic-bezier 곡선
  - `.agent/skills/redesign-skill/SKILL.md:65-76` — 인터랙티브 상태 가이드
  - `AGENTS.md` — 허용 모션: fade-up, subtle hover elevation, slow background drift

  **Acceptance Criteria**:
  - [ ] `npx react-router build` 성공
  - [ ] 새 유틸리티 클래스가 Tailwind에서 인식됨
  - [ ] prefers-reduced-motion에서 animation-duration: 0ms

  **QA Scenarios**:
  ```
  Scenario: 커스텀 유틸리티 확인
    Tool: Bash
    Steps:
      1. npx react-router build → 성공
      2. grep "animate-slide-up\|transition-premium\|hover-lift" app/app.css → 존재
    Expected Result: 새 유틸리티 정의됨
    Evidence: .sisyphus/evidence/task-10-utilities.txt
  ```

  **Commit**: YES
  - Message: `infra(css): 하이브리드 블렌드 모션 유틸리티 + CSS 확장`
  - Files: `app/app.css`
  - Pre-commit: `npx react-router build`

- [x] 11. Living Style Reference 페이지 구현

  **What to do**:
  - `app/routes/public/style-reference.tsx` 생성 (개발 환경에서만 접근 가능, production에서 숨김)
  - 다음 섹션을 포함하는 시각적 레퍼런스 페이지:
    - **Typography Scale**: Hero → Page Title → Section Title → Card Title → Body → Meta → Caption
    - **Color Palette**: 모든 토큰 색상 스와치 (이름 + hex + 사용처)
    - **Card Variants**: 기본 카드, Double-Bezel 카드, 플랫 카드 — hover/active 상태 포함
    - **Button States**: primary, secondary, ghost — hover, active, focus, disabled
    - **Motion Demos**: fade-up, stagger entry, hover-lift, active-press
    - **Icon Set**: Phosphor Light 주요 아이콘 미리보기
    - **Spacing Scale**: 4px → 96px 시각화
    - **Shadow Scale**: xs → lg 비교
    - **Stage Tone Colors**: Prelude, Bridge, Challenge, Epilogue 색상 비교
  - 이 페이지가 모든 후속 Wave의 시각적 기준점(visual truth) 역할

  **Must NOT do**:
  - 실제 데이터 로더 연결하지 않음 (정적 페이지)
  - Production 빌드에 포함하지 않음 (또는 /style-reference 경로에서만 접근)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-design`]
    - `frontend-design`: 프리미엄 UI 컴포넌트 구현

  **Parallelization**:
  - **Can Run In Parallel**: YES (단, Task 4, 5, 6, 7, 8, 10 완료 후 권장)
  - **Parallel Group**: Wave 1 후반
  - **Blocks**: Wave 2 전체 (시각적 기준점)
  - **Blocked By**: Tasks 4-10 (인프라 변경 후 적용)

  **References**:
  - `app/app.css` @theme 블록 — 모든 디자인 토큰
  - `app/lib/motion.tsx` — MotionProvider
  - `app/lib/motion-utils.ts` — 모션 프리셋
  - `app/lib/cn.ts` — cn() 유틸리티
  - `.agent/skills/redesign-skill/SKILL.md` — 전체 감사 기준
  - `.agent/skills/taste-skill/SKILL.md` — 디자인 엔지니어링 규칙
  - `.agent/skills/soft-skill/SKILL.md` — 고급 비주얼 패턴
  - `.docs/design.md` — Quiet Depth 가이드라인 전체
  - AGENTS.md §Quiet Depth 디자인 가이드라인 — 카드 스펙, 타이포, 색상 규칙

  **Acceptance Criteria**:
  - [ ] `tsc --noEmit` 0 errors
  - [ ] `/style-reference` 경로에서 모든 섹션 렌더링
  - [ ] 새 폰트(Pretendard + Geist) 적용 확인
  - [ ] Phosphor Icons 표시 확인
  - [ ] 모션 데모 동작 확인
  - [ ] 모든 색상 토큰 스와치 표시

  **QA Scenarios**:
  ```
  Scenario: Style Reference 페이지 전체 렌더링
    Tool: Playwright
    Steps:
      1. localhost:5173/style-reference 접속
      2. "Typography Scale" 섹션 존재 확인
      3. "Color Palette" 섹션에서 #0B2447 (deep-ocean) 색상 스와치 확인
      4. "Card Variants" 섹션에서 Double-Bezel 카드 hover 확인
      5. "Motion Demos" 섹션에서 fade-up 애니메이션 동작 확인
      6. 전체 페이지 1440px 스크린샷 캡처
    Expected Result: 모든 디자인 토큰이 시각적으로 확인 가능
    Evidence: .sisyphus/evidence/task-11-style-reference.png

  Scenario: 반응형 확인
    Tool: Playwright
    Steps:
      1. 375px 뷰포트에서 /style-reference 접속
      2. 레이아웃 깨짐 없음, 가로 스크롤 없음
    Expected Result: 모바일에서도 정상 표시
    Evidence: .sisyphus/evidence/task-11-style-reference-mobile.png
  ```

  **Commit**: YES
  - Message: `feat(style-ref): Living Style Reference 페이지 구현`
  - Files: `app/routes/public/style-reference.tsx`
  - Pre-commit: `tsc --noEmit`

### Wave 2 — Core Components Redesign

- [x] 12. GlobalNav 리디자인

  **What to do**:
  - 현재 GlobalNav (521줄)을 하이브리드 블렌드 디자인으로 업그레이드:
  - **Floating pill nav**: 상단에서 약간 떨어진 floating 스타일 (`mt-4 mx-auto w-max rounded-full`)
  - 배경: `backdrop-blur-xl bg-surface/80` 글래스모피즘 (단, subtle하게 — Quiet Depth 적합)
  - 내부 ring: `ring-1 ring-border-subtle` (Double-Bezel의 outer shell 개념)
  - 로고 + 네비 링크 + 검색 + CTA 배치 유지, 간격 넉넉하게
  - 현재 위치 표시: 기존 방식 유지하되 `font-weight-semibold` + `text-text-primary` 강조
  - CTA 버튼 ("기록 남기기"): `rounded-full px-5 py-2 bg-deep-ocean text-white` + `active:scale-[0.98]` + `hover:bg-ocean-blue transition-premium`
  - **모바일 메뉴**: 햄버거 → X 모프, 풀스크린 오버레이 (`backdrop-blur-2xl bg-surface/95`), 링크 staggered fade-up 등장
  - Framer Motion `m.nav` + `AnimatePresence` 사용 (모바일 메뉴 열기/닫기)
  - cn() 유틸리티 적용
  - 기존 접근성 유지 (ARIA labels, focus management, keyboard escape)
  - `.agent/skills/` 참조: soft-skill의 "Fluid Island Nav", taste-skill의 "Staggered Mask Reveal"를 Quiet Depth 수준으로 절제

  **Must NOT do**:
  - 네비 링크 항목 변경하지 않음 (기존 구조 유지)
  - Magnetic button physics 적용하지 않음
  - 하단 탭바 추가하지 않음 (AGENTS.md 금지)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-design`]
    - `frontend-design`: 고품질 네비게이션 컴포넌트 구현

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 13-21)
  - **Blocks**: Wave 3, 4 (모든 페이지에서 사용)
  - **Blocked By**: Wave 1 (Tasks 4-11)

  **References**:
  - `app/components/GlobalNav.tsx` — 현재 구현 (521줄), nav 구조, 모바일 메뉴 상태
  - `app/lib/motion.tsx` — MotionProvider, motion 컴포넌트
  - `app/lib/motion-utils.ts` — fadeUp, staggerContainer 프리셋
  - `app/lib/cn.ts` — cn() 유틸리티
  - `.agent/skills/soft-skill/SKILL.md:57-61` — Fluid Island Nav, 햄버거 모프, Staggered Mask Reveal
  - `.agent/skills/taste-skill/SKILL.md:50-51` — Anti-center bias, Rule 3
  - `.docs/design.md` §네비게이션 — "얇고 조용, sticky 가능, 배경 투명 또는 약한 material"
  - `AGENTS.md` §네비게이션 — 구성 (로고/여정/기록/챌린지/Learner/가이드/검색/기록 CTA), 모바일 원칙

  **Acceptance Criteria**:
  - [ ] `tsc --noEmit` 0 errors
  - [ ] 데스크톱: floating pill 스타일, 글래스모피즘 배경
  - [ ] 모바일: 햄버거 → X 모프, staggered 메뉴 등장
  - [ ] CTA 버튼 active:scale-[0.98] 동작
  - [ ] 기존 ARIA 속성 모두 유지
  - [ ] 키보드 Escape로 모바일 메뉴 닫기 동작

  **QA Scenarios**:
  ```
  Scenario: 데스크톱 네비게이션 렌더링
    Tool: Playwright
    Steps:
      1. 1440px 뷰포트에서 localhost:5173/ 접속
      2. nav 요소가 floating pill 스타일인지 확인 (rounded-full, margin-top)
      3. "기록 남기기" CTA 버튼 클릭 → active 상태에서 scale 변화 확인
      4. 현재 페이지 네비 링크가 강조 표시되는지 확인
    Expected Result: floating pill nav, 글래스모피즘 배경, CTA 피드백
    Evidence: .sisyphus/evidence/task-12-nav-desktop.png

  Scenario: 모바일 메뉴 staggered 등장
    Tool: Playwright
    Steps:
      1. 375px 뷰포트에서 localhost:5173/ 접속
      2. 햄버거 버튼 클릭
      3. 메뉴 오버레이 등장, 링크들이 순차적으로 fade-up
      4. Escape 키 → 메뉴 닫힘
    Expected Result: staggered 등장 + Escape 닫기 동작
    Evidence: .sisyphus/evidence/task-12-nav-mobile-menu.png
  ```

  **Commit**: YES
  - Message: `component: GlobalNav — floating pill nav + staggered mobile reveal`
  - Files: `app/components/GlobalNav.tsx`
  - Pre-commit: `tsc --noEmit`

- [x] 13. Footer 리디자인

  **What to do**:
  - 현재 Footer를 심플하고 에디토리얼한 스타일로 업그레이드
  - 과도한 링크 팜 제거 (redesign-skill: "Footer link farm with 4 columns → simplify")
  - 구조: 로고 + 핵심 네비 링크 + 법적 링크 (개인정보처리방침, 이용약관) + 저작권
  - 배경: `bg-surface-secondary` + 상단 `border-t border-border`
  - 충분한 padding (`py-16 md:py-24`)
  - Phosphor Icons 사용
  - cn() 적용

  **Must NOT do**:
  - 4열 링크 팜 구조 사용하지 않음
  - 소셜 미디어 링크 추가하지 않음 (AGENTS.md에 명시 없음)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-design`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 12, 14-21)
  - **Blocks**: Wave 3, 4
  - **Blocked By**: Wave 1

  **References**:
  - `app/components/Footer.tsx` — 현재 구현
  - `.agent/skills/redesign-skill/SKILL.md:102` — Footer 가이드라인
  - `AGENTS.md` — 법적 링크 필요 (redesign-skill: "No legal links → add")

  **Acceptance Criteria**:
  - [ ] `tsc --noEmit` 0 errors
  - [ ] 심플한 1-2열 레이아웃
  - [ ] 개인정보처리방침, 이용약관 링크 포함
  - [ ] 모바일에서 단일열 스택

  **QA Scenarios**:
  ```
  Scenario: Footer 렌더링 확인
    Tool: Playwright
    Steps:
      1. localhost:5173/ 스크롤 최하단
      2. Footer 영역에 로고, 네비 링크, 법적 링크 존재 확인
      3. 375px에서 단일열 스택 확인
    Expected Result: 심플 에디토리얼 Footer
    Evidence: .sisyphus/evidence/task-13-footer.png
  ```

  **Commit**: YES
  - Message: `component: Footer — 심플 에디토리얼 리디자인`
  - Files: `app/components/Footer.tsx`
  - Pre-commit: `tsc --noEmit`

- [x] 14. HeroSection 리디자인

  **What to do**:
  - 현재 HeroSection (84줄)을 하이브리드 블렌드로 업그레이드:
  - **Home variant**: 비대칭 split 레이아웃 — 좌측 텍스트 (60%) + 우측 비주얼 (40%)
    - Eyebrow badge: `rounded-full px-3 py-1 text-caption uppercase tracking-wide font-medium bg-mist-blue text-ocean-blue`
    - 타이틀: `text-6xl md:text-8xl font-semibold tracking-tighter leading-hero`
    - 서브타이틀: `text-lg text-text-secondary leading-relaxed max-w-[50ch]`
    - CTA: rounded-full pill + active:scale-[0.98]
    - 배경: deep-ocean gradient 유지하되 mesh gradient 느낌으로 개선 (radial gradient overlay)
  - **Stage/Challenge/Learner/Memory variants**: 기존 centered 유지하되 타이포 강화 (tracking-tight)
  - Framer Motion fadeUp 적용 (텍스트 + CTA 순차 등장)
  - cn() 적용

  **Must NOT do**:
  - 해양 일러스트, 물고기 아이콘 추가하지 않음
  - parallax 효과 추가하지 않음
  - 모든 variant를 비대칭으로 변경하지 않음 (Home만)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-design`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 12-13, 15-21)
  - **Blocks**: Wave 3, 4
  - **Blocked By**: Wave 1

  **References**:
  - `app/components/HeroSection.tsx` — 현재 구현 (84줄), variant 분기
  - `.agent/skills/soft-skill/SKILL.md:52-53` — Eyebrow Tag, Macro-Whitespace 규칙
  - `.agent/skills/taste-skill/SKILL.md:50` — Anti-center bias (Home에만 적용)
  - `.agent/skills/redesign-skill/SKILL.md:132` — Standard Hero Paradigm 대안
  - `.docs/design.md` §Hero — "제품 설명이 아닌 정서 상태로 데려가는 공간"
  - `AGENTS.md` §Hero — 비주얼 규칙 (직접 해양 일러스트 금지, 수면 아래 깊이감 gradient)

  **Acceptance Criteria**:
  - [ ] `tsc --noEmit` 0 errors
  - [ ] Home hero: 비대칭 split (좌 텍스트 + 우 비주얼)
  - [ ] Eyebrow badge 표시
  - [ ] 타이틀 tracking-tighter 적용
  - [ ] CTA active:scale-[0.98] 동작
  - [ ] Stage/Challenge variants: centered + tracking-tight

  **QA Scenarios**:
  ```
  Scenario: Home Hero 비대칭 레이아웃
    Tool: Playwright
    Steps:
      1. 1440px에서 localhost:5173/ 접속
      2. Hero 영역이 좌우 split인지 확인
      3. Eyebrow badge 존재 확인
      4. 텍스트 fadeUp 애니메이션 확인
    Expected Result: 비대칭 Hero + eyebrow + fadeUp
    Evidence: .sisyphus/evidence/task-14-hero-home.png

  Scenario: 모바일 Hero 스택
    Tool: Playwright
    Steps:
      1. 375px에서 접속 → Hero가 단일열 스택으로 전환
    Expected Result: 모바일에서 깨짐 없이 세로 스택
    Evidence: .sisyphus/evidence/task-14-hero-mobile.png
  ```

  **Commit**: YES
  - Message: `component: HeroSection — 비대칭 split + eyebrow + fadeUp`
  - Files: `app/components/HeroSection.tsx`
  - Pre-commit: `tsc --noEmit`

- [x] 15. SceneCard 리디자인 (Double-Bezel 적용)

  **What to do**:
  - 현재 SceneCard (143줄)에 Double-Bezel 개념 적용 (subtle 버전):
  - **Outer shell**: `bg-surface-secondary ring-1 ring-border-subtle p-1.5 rounded-lg`
  - **Inner core**: `bg-surface rounded-md p-5 md:p-6` + `shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]`
  - hover: `hover:shadow-tinted-md transition-premium` + 미세한 translateY(-2px)
  - active: `active:scale-[0.98]`
  - 뱃지 (stage/format/rhythm): `rounded-full px-2.5 py-0.5 text-caption font-medium` + stage tone 색상
  - 타이틀: `text-xl font-semibold tracking-tight leading-title`
  - 스니펫: `text-base text-text-secondary leading-relaxed line-clamp-3`
  - 하단: 작성자 링크 + indicator 아이콘 (질문/자기답변/연결 수)
  - Framer Motion `whileInView` fadeUp 적용 (스크롤 시 등장)
  - cn() 적용

  **Must NOT do**:
  - 카드 구조 변경하지 않음 (뱃지 → 타이틀 → 스니펫 → 하단 유지)
  - 3D tilt, holographic foil 적용하지 않음
  - spotlight border 적용하지 않음

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-design`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 12-14, 16-21)
  - **Blocks**: Wave 3, 4
  - **Blocked By**: Wave 1

  **References**:
  - `app/components/SceneCard.tsx` — 현재 구현 (143줄)
  - `.agent/skills/soft-skill/SKILL.md:42-44` — Double-Bezel (Doppelrand) 아키텍처
  - `.agent/skills/taste-skill/SKILL.md:53-54` — Anti-card overuse, tinted shadow
  - `.docs/design.md` §카드 시스템 — "배경 Surface, border 1px, radius 20-24px, shadow 매우 약하게, padding 20-28px"
  - `AGENTS.md` §카드 시스템 — Scene Card 특성 ("가장 기본, hover 시 미세한 상승만")

  **Acceptance Criteria**:
  - [ ] `tsc --noEmit` 0 errors
  - [ ] Double-Bezel 구조 (outer shell + inner core) 적용
  - [ ] hover 시 tinted shadow + translateY 상승
  - [ ] active 시 scale(0.98)
  - [ ] 뱃지에 stage tone 색상 적용
  - [ ] 스크롤 시 fadeUp 등장

  **QA Scenarios**:
  ```
  Scenario: SceneCard Double-Bezel 확인
    Tool: Playwright
    Steps:
      1. /logs 접속
      2. SceneCard의 outer shell + inner core 구조 확인 (DOM 검사)
      3. 카드 hover → shadow 변화 + 미세 상승 확인
      4. 카드 클릭(mousedown) → scale 축소 확인
    Expected Result: Double-Bezel + hover/active 피드백
    Evidence: .sisyphus/evidence/task-15-scenecard.png

  Scenario: 뱃지 stage tone 색상
    Tool: Playwright
    Steps:
      1. /logs 접속
      2. "Prelude" stage 뱃지 → mist blue 톤 확인
      3. "Challenge" stage 뱃지 → deep ocean 톤 확인
    Expected Result: stage별 정확한 tone mapping
    Evidence: .sisyphus/evidence/task-15-badge-tones.png
  ```

  **Commit**: YES
  - Message: `component: SceneCard — Double-Bezel + hover physics + staggered entry`
  - Files: `app/components/SceneCard.tsx`
  - Pre-commit: `tsc --noEmit`

- [x] 16. QuestionCard + ResponseCard + SelfAnswerCard 리디자인

  **What to do**:
  - **QuestionCard**: 더 조용하고 여유 있는 여백 (Quiet Depth 원칙). 질문이 가장 크게.
    - 배경: `bg-mist-blue/30` (미스트 블루 힌트)
    - 질문 텍스트: `text-xl md:text-2xl font-medium leading-relaxed`
    - direction 라벨: 작은 pill badge
    - 하단: 기록 링크 + 응답하기 CTA
    - cn() + Framer Motion fadeUp
  - **ResponseCard**: 댓글이 아닌 정리된 메모 카드 스타일.
    - 말풍선/버블 UI 절대 금지
    - 응답 유형별 좌측 accent 바: 공명(reef-cyan), 질문(ocean-blue), 연결(mist-blue-deep), 제안(prelude), 자기답변(bridge)
    - 본문: `text-base leading-relaxed`
    - 작성자 + 작성일: meta 스타일
  - **SelfAnswerCard**: ResponseCard와 유사하되 자기답변 특성 반영
    - 좌측 accent 바: bridge 톤
    - "자기답변" 라벨 표시

  **Must NOT do**:
  - 말풍선/채팅 버블 UI 사용하지 않음 (AGENTS.md 절대 금지)
  - 좋아요/추천 버튼 추가하지 않음

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-design`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: Wave 3 (Record Detail에서 사용)
  - **Blocked By**: Wave 1

  **References**:
  - `app/components/QuestionCard.tsx` — 현재 구현 (58줄)
  - `app/components/ResponseCard.tsx` — 현재 구현
  - `app/components/SelfAnswerCard.tsx` — 현재 구현
  - `.docs/design.md` §카드 시스템 — QuestionCard("더 조용하고 여유 있는 여백"), ResponseCard("더 단순하고 플랫, 말풍선 아닌 정리된 메모")
  - `AGENTS.md` — "말풍선/채팅 버블 (editorial card만)" 금지
  - `.docs/frd.md` — 응답 유형 5종 (공명/질문/연결/제안/자기답변)

  **Acceptance Criteria**:
  - [ ] `tsc --noEmit` 0 errors
  - [ ] QuestionCard: 넉넉한 여백, 질문 텍스트 가장 크게
  - [ ] ResponseCard: accent 바 + 유형별 색상, 말풍선 없음
  - [ ] SelfAnswerCard: bridge 톤 accent 바
  - [ ] 모바일에서 깨짐 없음

  **QA Scenarios**:
  ```
  Scenario: 응답 카드 말풍선 없음 확인
    Tool: Playwright + Bash
    Steps:
      1. /logs 접속 → 첫 번째 SceneCard 클릭하여 기록 상세 페이지 진입 (응답 있는 기록)
      2. DOM에서 "bubble", "chat" 클래스 없음 확인
      3. ResponseCard가 accent 바 + 플랫 카드 스타일인지 확인
    Expected Result: 말풍선 없는 editorial card 스타일
    Evidence: .sisyphus/evidence/task-16-response-card.png
  ```

  **Commit**: YES
  - Message: `component: QuestionCard + ResponseCard + SelfAnswerCard — 에디토리얼 리디자인`
  - Files: `app/components/QuestionCard.tsx`, `app/components/ResponseCard.tsx`, `app/components/SelfAnswerCard.tsx`
  - Pre-commit: `tsc --noEmit`

- [x] 17. LearnerCard + CollaborationUnitCard + HighlightedSentenceCard 리디자인

  **What to do**:
  - **LearnerCard**: 프로필보다 질문이 먼저. 아바타는 보조.
    - 현재 질문(Left Question)이 카드 상단에 크게
    - 아바타 + 이름 + cohort: 하단 메타
    - Double-Bezel subtle 적용
  - **CollaborationUnitCard**: 팀 장식보다 질문 중심.
    - 그룹명 + 현재 질문 + 참여자 수
    - 협업 후에만 등장 (조건부 렌더링)
  - **HighlightedSentenceCard**: 큰 인용문 + 남긴 이유 + 남긴 사람. 타이포로 해결.
    - 인용문: `text-2xl md:text-3xl font-medium leading-title italic`
    - 남긴 이유: `text-sm text-text-secondary`
    - 남긴 사람: meta 스타일
    - 따옴표 장식: 큰 서체의 " (CSS pseudo-element)

  **Must NOT do**:
  - 아바타 원형 강제하지 않음 (squircle 사용 가능 — redesign-skill)
  - Leaderboard/랭킹 요소 추가하지 않음

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-design`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: Wave 3, 4
  - **Blocked By**: Wave 1

  **References**:
  - `app/components/LearnerCard.tsx` — 현재 구현
  - `app/components/CollaborationUnitCard.tsx` — 현재 구현
  - `app/components/HighlightedSentenceCard.tsx` — 현재 구현
  - `.docs/design.md` §카드 시스템 — 각 카드 특성 설명
  - `AGENTS.md` — Learner Card("프로필보다 질문이 먼저"), Highlighted Sentence Card("큰 인용문 + 타이포로 해결")

  **Acceptance Criteria**:
  - [ ] `tsc --noEmit` 0 errors
  - [ ] LearnerCard: 질문이 상단에 크게, 프로필 하단
  - [ ] HighlightedSentenceCard: 큰 인용문 + 따옴표 장식

  **QA Scenarios**:
  ```
  Scenario: LearnerCard 질문 우선 배치
    Tool: Playwright
    Steps:
      1. /learners 접속
      2. LearnerCard에서 질문 텍스트가 이름/아바타보다 시각적으로 먼저인지 확인
    Expected Result: 질문이 카드의 주역, 프로필은 보조
    Evidence: .sisyphus/evidence/task-17-learner-card.png
  ```

  **Commit**: YES
  - Message: `component: LearnerCard + CollaborationUnitCard + HighlightedSentenceCard — 콘텐츠 우선 리디자인`
  - Files: 3개 컴포넌트 파일
  - Pre-commit: `tsc --noEmit`

- [x] 18. StageStrip + TimelineView + ActivityFeed 리디자인

  **What to do**:
  - **StageStrip**: 각 Stage capsule 디자인 강화
    - 현재 Stage: 진한 톤 + 약한 glow (`box-shadow: 0 0 12px rgba(20,108,148,0.2)`)
    - 과거: 채도 낮게, 미래: outline 위주
    - hover 시 설명 노출 (tooltip 또는 expand)
    - 모바일: 가로 스크롤 유지
  - **TimelineView**: 세로 타임라인 라인 + 노드 디자인 강화
    - 타임라인 라인: `border-l-2 border-border` → gradient 라인
    - 각 노드: 원형 dot + SceneCard 연결
  - **ActivityFeed**: 최근 활동 목록 디자인 강화
    - 아이콘 + 활동 설명 + 시간
    - 구분선: `divide-y` 패턴

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-design`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: Wave 3 (HOME, JOURNEY에서 사용)
  - **Blocked By**: Wave 1

  **References**:
  - `app/components/StageStrip.tsx`, `app/components/TimelineView.tsx`, `app/components/ActivityFeed.tsx`
  - `.docs/design.md` §Journey Strip — capsule 디자인, 현재/과거/미래 상태
  - `AGENTS.md` — "game-like progress UI 금지, 퍼센트 진행률 과장 금지"

  **Acceptance Criteria**:
  - [ ] StageStrip: 현재 Stage glow, 과거 desaturate, 미래 outline
  - [ ] TimelineView: gradient 라인 + dot 노드
  - [ ] 모바일 가로 스크롤 동작

  **QA Scenarios**:
  ```
  Scenario: StageStrip 상태별 스타일
    Tool: Playwright
    Steps:
      1. /journey 접속
      2. 현재 Stage가 glow 효과 있는지 확인
      3. 과거 Stage가 채도 낮은지 확인
    Expected Result: 상태별 시각 구분 명확
    Evidence: .sisyphus/evidence/task-18-stage-strip.png
  ```

  **Commit**: YES
  - Message: `component: StageStrip + TimelineView + ActivityFeed — 시각 강화`
  - Files: 3개 컴포넌트 파일
  - Pre-commit: `tsc --noEmit`

- [x] 19. FilterBar + SortBar + ViewToggle 리디자인

  **What to do**:
  - **FilterBar**: 필터 칩/드롭다운 스타일 개선
    - 칩: `rounded-full px-3 py-1.5 text-sm border border-border hover:bg-surface-secondary transition-premium`
    - 활성 칩: `bg-mist-blue text-ocean-blue border-ocean-blue/30`
    - active:scale-[0.98] 피드백
  - **SortBar**: 정렬 드롭다운 개선
    - select 또는 segmented control
  - **ViewToggle**: 그리드/타임라인 토글 개선
    - segmented control 스타일: `rounded-full bg-surface-secondary p-1`
    - 활성: `bg-surface shadow-xs rounded-full`
  - cn() 적용

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-design`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: Wave 3 (LOGS에서 사용)
  - **Blocked By**: Wave 1

  **References**:
  - `app/components/FilterBar.tsx`, `app/components/SortBar.tsx`, `app/components/ViewToggle.tsx`
  - `.docs/design.md` §폼/에디터 — "입력창 radius는 카드보다 약간 작게, focus: semantic blue"

  **Acceptance Criteria**:
  - [ ] 필터 칩 rounded-full + 활성 상태 스타일
  - [ ] ViewToggle segmented control 스타일
  - [ ] active:scale-[0.98] 피드백

  **QA Scenarios**:
  ```
  Scenario: 필터 인터랙션
    Tool: Playwright
    Steps:
      1. /logs 접속
      2. 필터 칩 클릭 → 활성 스타일 변화 확인
      3. ViewToggle 전환 → 그리드/타임라인 뷰 변경 확인
    Expected Result: 인터랙티브 필터 + 토글 정상 동작
    Evidence: .sisyphus/evidence/task-19-filter-toggle.png
  ```

  **Commit**: YES
  - Message: `component: FilterBar + SortBar + ViewToggle — 인터랙션 개선`
  - Files: 3개 컴포넌트 파일
  - Pre-commit: `tsc --noEmit`

- [x] 20. EmptyState + LoadingSkeleton + ErrorState 리디자인

  **What to do**:
  - **EmptyState**: "getting started" 뷰로 업그레이드
    - Phosphor Icon (큰 사이즈, light weight, text-text-tertiary)
    - 안내 메시지: 허가형 톤 ("완성된 글이 아니어도 괜찮습니다")
    - CTA 버튼: 다음 행동 제안 ("첫 기록 남기기")
    - variant별 적절한 아이콘 + 메시지
  - **LoadingSkeleton**: shimmer 개선
    - 레이아웃 매칭 스켈레톤 (카드/리스트/그리드 모양)
    - `animate-shimmer` 개선: 배경 gradient 더 자연스럽게
    - 원형 스피너 사용하지 않음 (redesign-skill: "skeleton loaders that match layout shape")
  - **ErrorState**: 인라인 에러
    - "Oops!" 메시지 금지 → 직접적 안내 ("연결에 실패했습니다. 다시 시도해주세요.")
    - 재시도 CTA 버튼
    - Phosphor WarningCircle 아이콘

  **Must NOT do**:
  - "Oops!" 에러 메시지 사용하지 않음
  - 원형 스피너 사용하지 않음
  - 느낌표(!) 남발하지 않음

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-design`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: Wave 3, 4, 6 (모든 페이지에서 사용)
  - **Blocked By**: Wave 1

  **References**:
  - `app/components/EmptyState.tsx`, `app/components/LoadingSkeleton.tsx`, `app/components/ErrorState.tsx`
  - `.agent/skills/redesign-skill/SKILL.md:69-72` — 상태 가이드라인 (skeleton, empty, error)
  - `.agent/skills/taste-skill/SKILL.md:57-62` — 상태 UI 규칙
  - `.docs/operational-principles.md` — 허가형 문구 원칙
  - `AGENTS.md` — 카피 톤 ("완성된 글이 아니어도 괜찮습니다")

  **Acceptance Criteria**:
  - [ ] EmptyState: 아이콘 + 허가형 메시지 + CTA
  - [ ] LoadingSkeleton: 레이아웃 매칭 shimmer
  - [ ] ErrorState: 직접적 안내 + 재시도 CTA, "Oops!" 없음

  **QA Scenarios**:
  ```
  Scenario: EmptyState 허가형 톤 확인
    Tool: Bash
    Steps:
      1. grep -i "oops\|Oops" app/components/EmptyState.tsx app/components/ErrorState.tsx → 결과 없음
      2. grep "괜찮" app/components/EmptyState.tsx → 허가형 문구 포함
    Expected Result: 허가형 톤, "Oops" 없음
    Evidence: .sisyphus/evidence/task-20-states.txt
  ```

  **Commit**: YES
  - Message: `component: EmptyState + LoadingSkeleton + ErrorState — 프리미엄 상태 UI`
  - Files: 3개 컴포넌트 파일
  - Pre-commit: `tsc --noEmit`

- [x] 21. CTABand + NavigationFade + ContentRenderer 리디자인

  **What to do**:
  - **CTABand**: CTA 섹션 디자인 강화
    - 배경: `bg-mist-blue` 또는 subtle gradient
    - CTA 버튼: pill 스타일 + active:scale-[0.98]
    - 카피: 허가형 톤
    - 충분한 padding (`py-16 md:py-24`)
  - **NavigationFade**: 기존 CSS transition → Framer Motion `AnimatePresence` + `m.div` fadeIn 전환
    - 단, 페이지 전환은 subtle하게 (fade-in만, slide 없음)
  - **ContentRenderer**: 마크다운/HTML 콘텐츠 렌더링 스타일 개선
    - heading 스타일: tracking-tight 적용
    - code block: 개선된 스타일
    - blockquote: 좌측 accent 바
    - link: text-link color, hover underline

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-design`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: Wave 3, 4
  - **Blocked By**: Wave 1

  **References**:
  - `app/components/CTABand.tsx`, `app/components/NavigationFade.tsx`, `app/components/ContentRenderer.tsx`
  - `.docs/operational-principles.md` — CTA 톤 원칙

  **Acceptance Criteria**:
  - [ ] CTABand: pill CTA + 허가형 카피 + 넉넉한 여백
  - [ ] NavigationFade: Framer Motion fade 전환
  - [ ] ContentRenderer: heading tracking-tight, blockquote accent 바

  **QA Scenarios**:
  ```
  Scenario: CTABand 렌더링 + 카피 톤
    Tool: Playwright
    Steps:
      1. localhost:5173/ 스크롤 최하단 → CTABand 섹션 존재 확인
      2. CTA 버튼이 rounded-full pill 스타일인지 확인
      3. 카피 텍스트에 허가형 톤 포함 ("괜찮" 또는 "좋습니다" 등)
      4. 버튼 active:scale-[0.98] 피드백 확인
    Expected Result: pill CTA + 허가형 카피 + active 피드백
    Evidence: .sisyphus/evidence/task-21-cta-band.png

  Scenario: ContentRenderer heading 스타일
    Tool: Playwright
    Steps:
      1. /logs 접속 → 첫 번째 SceneCard 클릭하여 기록 상세 진입
      2. h2/h3 요소의 computed letter-spacing 확인 → negative (tracking-tight)
      3. blockquote 요소의 좌측 border 확인 → accent 색상
    Expected Result: heading tracking-tight, blockquote accent 바
    Evidence: .sisyphus/evidence/task-21-content-renderer.png
  ```

  **Commit**: YES
  - Message: `component: CTABand + NavigationFade + ContentRenderer — 시각 강화`
  - Files: 3개 컴포넌트 파일
  - Pre-commit: `tsc --noEmit`

### Wave 3 — Implemented Public Pages Upgrade

- [x] 22. HOME 페이지 시각 업그레이드

  **What to do**:
  - 현재 HOME (513줄)을 업그레이드된 컴포넌트들로 재구성:
  - 리디자인된 HeroSection (비대칭 split) 적용
  - Journey Timeline 섹션: StageStrip 사용, 섹션 제목 tracking-tight
  - Open Questions 섹션: QuestionCard 그리드, staggered entry
  - Recent Records 섹션: SceneCard 그리드 (Double-Bezel), staggered entry
  - Highlighted Sentences 섹션: HighlightedSentenceCard 그리드
  - Learner Spotlight 섹션: LearnerCard 그리드
  - CTABand: 리디자인된 CTA 적용
  - 섹션 간 간격: `py-16 md:py-24` (soft-skill: macro-whitespace)
  - 섹션 제목: `text-3xl md:text-4xl font-semibold tracking-tight`
  - Framer Motion staggered entry 각 섹션별 적용

  **Must NOT do**:
  - 섹션 순서 변경하지 않음 (기존 구조 유지)
  - 데이터 로더/액션 변경하지 않음

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-design`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 23-27)
  - **Blocks**: Wave 7 (polish)
  - **Blocked By**: Wave 2 (컴포넌트 리디자인 완료)

  **References**:
  - `app/routes/public/index.tsx` — 현재 HOME 구현 (513줄)
  - Living Style Reference 페이지 (Task 11) — 시각적 기준점
  - 모든 리디자인된 컴포넌트 (Tasks 12-21)

  **Acceptance Criteria**:
  - [ ] `tsc --noEmit` 0 errors
  - [ ] 비대칭 Hero 적용
  - [ ] 모든 섹션 staggered entry 동작
  - [ ] 기존 스모크 테스트 텍스트 ("여정 보기", "기록 남기기") 유지
  - [ ] 1440px / 768px / 375px 레이아웃 정상

  **QA Scenarios**:
  ```
  Scenario: HOME 전체 렌더링
    Tool: Playwright
    Steps:
      1. 1440px에서 localhost:5173/ 접속
      2. Hero → Journey → Questions → Records → Sentences → Learners → CTA 순서 확인
      3. 각 섹션의 staggered entry 동작 확인 (스크롤)
      4. 전체 페이지 스크린샷
    Expected Result: 모든 섹션 정상, staggered entry 동작
    Evidence: .sisyphus/evidence/task-22-home-1440.png

  Scenario: 기존 스모크 테스트 호환
    Tool: Bash
    Steps:
      1. npx playwright test tests/e2e/smoke.spec.ts → 통과
    Expected Result: 기존 스모크 테스트 100% 통과
    Evidence: .sisyphus/evidence/task-22-smoke-pass.txt
  ```

  **Commit**: YES
  - Message: `page: / — HOME 시각 업그레이드`
  - Files: `app/routes/public/index.tsx`
  - Pre-commit: `tsc --noEmit`

- [x] 23. JOURNEY + Stage Detail 페이지

  **What to do**:
  - **JOURNEY** (/journey, 139줄): StageStrip 강화, stage 카드 Double-Bezel 적용, staggered entry
  - **Stage Detail** (/journey/:stageSlug, 스텁): 새로 구현
    - HeroSection (stage variant)
    - Stage 설명 + 기간 + 상태
    - 이 Stage의 기록 목록 (SceneCard 그리드)
    - 이 Stage의 질문 목록 (QuestionCard)
    - 이 Stage의 도전 과제 (있다면)
    - 데이터 로더: stages + records 쿼리 (기존 db/queries/ 활용)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-design`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: Wave 7
  - **Blocked By**: Wave 2

  **References**:
  - `app/routes/public/journey/index.tsx` — JOURNEY 현재 구현
  - `app/routes/public/journey/$stageSlug.tsx` — Stage Detail 스텁
  - `app/db/queries/stages.server.ts` — Stage 쿼리 모듈
  - `app/db/queries/records.server.ts` — Record 쿼리 모듈
  - `.docs/frd.md` — Stage 기능 요구사항
  - `.docs/wireframe.md` — Stage Detail 와이어프레임

  **Acceptance Criteria**:
  - [ ] JOURNEY: stage 카드 Double-Bezel, staggered entry
  - [ ] Stage Detail: 설명 + 기록 목록 + 질문 목록 표시
  - [ ] 1440px / 768px / 375px 레이아웃 정상

  **QA Scenarios**:
  ```
  Scenario: Stage Detail 렌더링
    Tool: Playwright
    Steps:
      1. /journey 접속 → stage 카드 클릭
      2. Stage Detail 페이지 로드 → 설명 + 기록 목록 표시
    Expected Result: Stage Detail 정상 렌더링
    Evidence: .sisyphus/evidence/task-23-stage-detail.png
  ```

  **Commit**: YES
  - Message: `page: /journey — 시각 업그레이드 + Stage Detail 구현`
  - Files: `app/routes/public/journey/index.tsx`, `app/routes/public/journey/$stageSlug.tsx`
  - Pre-commit: `tsc --noEmit`

- [x] 24. LOGS 목록 페이지 시각 업그레이드

  **What to do**:
  - LOGS (254줄) 리디자인된 컴포넌트 적용:
  - FilterBar + SortBar + ViewToggle 리디자인 적용
  - SceneCard Double-Bezel 그리드, staggered entry
  - 페이지네이션 스타일 개선 (rounded-full 버튼)
  - 빈 상태: 리디자인된 EmptyState
  - 그리드/타임라인 뷰 전환 시 Framer Motion `AnimatePresence` 적용

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-design`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: Wave 7
  - **Blocked By**: Wave 2

  **References**:
  - `app/routes/public/logs/index.tsx` — LOGS 현재 구현 (254줄)

  **Acceptance Criteria**:
  - [ ] 리디자인 컴포넌트 적용 (FilterBar, SceneCard 등)
  - [ ] staggered entry 동작
  - [ ] 뷰 전환 애니메이션

  **QA Scenarios**:
  ```
  Scenario: LOGS 페이지 컴포넌트 + staggered entry
    Tool: Playwright
    Steps:
      1. 1440px에서 localhost:5173/logs 접속
      2. FilterBar 칩 존재 → 클릭 시 활성 스타일 변화 확인
      3. SceneCard가 Double-Bezel 구조인지 확인 (outer shell + inner core)
      4. 스크롤 시 카드들이 staggered fade-up으로 등장하는지 확인
      5. ViewToggle 클릭 → 그리드/타임라인 뷰 전환 + AnimatePresence 전환
      6. 375px 뷰포트 → 단일열 스택, 가로 스크롤 없음
    Expected Result: 리디자인 컴포넌트 적용, staggered entry, 뷰 전환 동작
    Evidence: .sisyphus/evidence/task-24-logs-1440.png, .sisyphus/evidence/task-24-logs-375.png

  Scenario: 기존 스모크 테스트 호환
    Tool: Bash
    Steps:
      1. npx playwright test tests/e2e/smoke.spec.ts → PASS
    Expected Result: 스모크 테스트 통과
    Evidence: .sisyphus/evidence/task-24-smoke.txt
  ```

  **Commit**: YES
  - Message: `page: /logs — 시각 업그레이드`
  - Files: `app/routes/public/logs/index.tsx`
  - Pre-commit: `tsc --noEmit`

- [x] 25. RECORD DETAIL + Record Details 사이드바

  **What to do**:
  - **RECORD DETAIL** (845줄): 읽기 경험 업그레이드
    - 본문: `max-w-reading` (720px), `text-lg leading-relaxed`
    - 제목: `text-4xl md:text-5xl font-semibold tracking-tighter`
    - 메타 정보: stage badge + format + rhythm + 작성일 + 작성자
    - 질문 섹션: QuestionCard, 충분한 여백
    - 응답 섹션: ResponseCard (accent 바), staggered entry
    - 문장 저장 모달: 개선된 모달 디자인
  - **Record Details** 사이드바: 스텁 → 구현
    - 관련 기록 링크
    - 태그
    - 연결된 기록

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-design`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: Wave 7
  - **Blocked By**: Wave 2

  **References**:
  - `app/routes/public/logs/$recordSlug.tsx` — RECORD DETAIL (845줄)
  - `app/routes/public/logs/$recordSlug.details.tsx` — 사이드바 스텁
  - `.docs/design.md` — 읽기 중심 상세 (720px)

  **Acceptance Criteria**:
  - [ ] 본문 max-w-reading 적용
  - [ ] 응답 섹션 accent 바 + staggered entry
  - [ ] Record Details 사이드바 구현

  **QA Scenarios**:
  ```
  Scenario: Record Detail 읽기 경험
    Tool: Playwright
    Steps:
      1. 1440px에서 /logs 접속 → 첫 번째 SceneCard 클릭하여 기록 상세 진입
      2. 본문 영역의 max-width 확인 → 720px (max-w-reading)
      3. 제목의 font-size 확인 → text-4xl 이상
      4. 제목의 letter-spacing 확인 → negative (tracking-tighter)
      5. 응답 섹션: ResponseCard에 좌측 accent 바 존재 확인
      6. 응답이 staggered fade-up으로 등장하는지 확인
    Expected Result: 720px 읽기 폭, tracking-tighter 제목, accent 바 응답
    Evidence: .sisyphus/evidence/task-25-record-detail.png

  Scenario: 말풍선 없음 확인
    Tool: Bash
    Steps:
      1. grep -ri "bubble\|chat-bubble\|말풍선" app/routes/public/logs/\$recordSlug.tsx app/components/ResponseCard.tsx → 결과 없음
    Expected Result: 말풍선/채팅 UI 패턴 없음
    Evidence: .sisyphus/evidence/task-25-no-bubble.txt
  ```

  **Commit**: YES
  - Message: `page: /logs/:recordSlug — 읽기 경험 업그레이드 + Details 사이드바`
  - Files: `app/routes/public/logs/$recordSlug.tsx`, `app/routes/public/logs/$recordSlug.details.tsx`
  - Pre-commit: `tsc --noEmit`

- [x] 26. SEARCH 페이지 시각 업그레이드

  **What to do**:
  - SEARCH (220줄) 리디자인 적용:
  - 검색 입력: 큰 rounded-full 입력창, focus ring ocean-blue
  - 탭 UI: segmented control 스타일
  - 결과 카드: 유형별 스타일 (SceneCard/QuestionCard/LearnerCard)
  - staggered entry 결과 등장
  - 빈 결과: EmptyState

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-design`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: Wave 7
  - **Blocked By**: Wave 2

  **References**:
  - `app/routes/public/search.tsx` — SEARCH 현재 구현 (220줄)

  **Acceptance Criteria**:
  - [ ] 검색 입력 rounded-full + focus ring
  - [ ] 탭 segmented control
  - [ ] 결과 staggered entry

  **QA Scenarios**:
  ```
  Scenario: Search 페이지 인터랙션
    Tool: Playwright
    Steps:
      1. 1440px에서 /search 접속
      2. 검색 입력창이 rounded-full인지 확인
      3. 입력창 focus → ocean-blue ring 표시 확인
      4. "기록" 검색어 입력 → 결과 카드 staggered 등장
      5. 탭(기록/질문/학습자/문장) 전환 → segmented control 스타일 확인
      6. 375px → 입력창 full-width, 탭 가로 스크롤 또는 스택
    Expected Result: rounded-full 입력, segmented 탭, staggered 결과
    Evidence: .sisyphus/evidence/task-26-search.png
  ```

  **Commit**: YES
  - Message: `page: /search — 시각 업그레이드`
  - Files: `app/routes/public/search.tsx`
  - Pre-commit: `tsc --noEmit`

- [x] 27. WRITE 선택 + Note/Article 에디터 페이지

  **What to do**:
  - **WRITE 선택** (/write, 64줄): 카드 선택 UI 업그레이드
    - Double-Bezel 카드 2개 (Note / Article)
    - Phosphor Icons: FileText, Article
    - hover 상승 + active:scale-[0.98]
  - **Note 에디터** (/write/note): 페이지 레이아웃 구현
    - distraction-free 레이아웃
    - 충분한 여백, centered content (max-w-reading)
    - 에디터 컴포넌트(NoteEditor)는 수정하지 않고 래핑만
  - **Article 에디터** (/write/article): 페이지 레이아웃 구현
    - 에디터 컴포넌트(ArticleEditor)는 수정하지 않고 래핑만
    - 발행 설정 사이드패널 (visibility, format, type, rhythm 선택)

  **Must NOT do**:
  - NoteEditor, ArticleEditor 컴포넌트 내부 수정하지 않음
  - TipTap 확장 수정하지 않음
  - Rich text 에디터 추가하지 않음

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-design`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: Wave 7
  - **Blocked By**: Wave 2

  **References**:
  - `app/routes/public/write/index.tsx` — WRITE 선택 (64줄)
  - `app/routes/public/write/note.tsx` — Note 에디터 스텁
  - `app/routes/public/write/article.tsx` — Article 에디터 스텁 (275줄 — TipTap 통합 있음)
  - `app/components/editor/NoteEditor.tsx`, `app/components/editor/ArticleEditor.tsx`
  - `.docs/design.md` §폼/에디터 — "distraction-free, 쓰기 흐름 방해 최소"

  **Acceptance Criteria**:
  - [ ] WRITE 선택: Double-Bezel 카드 2개
  - [ ] Note/Article: distraction-free 레이아웃
  - [ ] 에디터 컴포넌트 내부 미수정

  **QA Scenarios**:
  ```
  Scenario: Write 선택 페이지 (보호된 라우트)
    Tool: Playwright
    Steps:
      1. context.addCookies([{ name:'adakrpos_session', value:TEST_LEARNER_SESSION, domain:'localhost', path:'/' }])
      2. 1440px에서 /write 접속
      3. 카드 2개 (Note / Article) Double-Bezel 구조 확인
      4. 카드 hover → shadow + translateY 확인
      5. 카드 클릭 → /write/note 또는 /write/article 이동
    Expected Result: Double-Bezel 카드 2개, hover 피드백, 네비게이션
    Evidence: .sisyphus/evidence/task-27-write-choice.png

  Scenario: Note 에디터 distraction-free 레이아웃
    Tool: Playwright
    Steps:
      1. context.addCookies([{ name:'adakrpos_session', value:TEST_LEARNER_SESSION, domain:'localhost', path:'/' }])
      2. /write/note 접속
      3. 에디터 영역이 max-w-reading (720px) 중심 배치인지 확인
      4. 여백 충분 (py-16 이상)
      5. NoteEditor 컴포넌트가 정상 렌더링되는지 확인
    Expected Result: distraction-free, 720px 중심, 에디터 정상
    Evidence: .sisyphus/evidence/task-27-note-editor.png
  ```

  **Commit**: YES
  - Message: `page: /write — 선택 + Note/Article 에디터 레이아웃`
  - Files: `app/routes/public/write/index.tsx`, `app/routes/public/write/note.tsx`, `app/routes/public/write/article.tsx`
  - Pre-commit: `tsc --noEmit`

### Wave 4 — New Public Pages Implementation

- [x] 28. LEARNERS 업그레이드 + Learner Profile 구현

  **What to do**:
  - **LEARNERS** (/learners, 127줄): LearnerCard 그리드 업그레이드, cohort 필터 개선
  - **Learner Profile** (/learners/:learnerSlug, 스텁): 새로 구현
    - 프로필 헤더: 아바타 + 이름 + cohort + 현재 질문 (크게)
    - 기록 탭: 이 학습자의 기록 목록 (SceneCard 그리드)
    - 질문 탭: 이 학습자의 질문 목록
    - 활동 타임라인
    - 데이터 로더: learners + records 쿼리

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-design`]

  **Parallelization**: Wave 4 (parallel with 29-34), Blocked By: Wave 2

  **References**:
  - `app/routes/public/learners/index.tsx`, `app/routes/public/learners/$learnerSlug.tsx`
  - `app/db/queries/learners.server.ts`
  - `.docs/wireframe.md` — Learner Profile 와이어프레임
  - `.docs/frd.md` — Learner 기능 요구사항

  **QA Scenarios**:
  ```
  Scenario: Learner Profile 렌더링
    Tool: Playwright
    Steps:
      1. 1440px에서 /learners 접속 → LearnerCard 그리드 확인
      2. LearnerCard 클릭 → /learners/{slug} 이동
      3. Profile 헤더: 아바타 + 이름 + cohort + 현재 질문 확인
      4. 기록 탭 → SceneCard 목록 표시 확인
      5. 375px → 단일열 스택, 깨짐 없음
    Expected Result: Profile 정상 렌더링, 질문이 프로필보다 우선
    Evidence: .sisyphus/evidence/task-28-learner-profile.png
  ```

  **Commit**: YES — `page: /learners — 업그레이드 + Profile 구현`

- [x] 29. CHALLENGES 업그레이드 + Challenge Detail 구현

  **What to do**:
  - **CHALLENGES** (/challenges, 65줄): Challenge 카드 업그레이드
  - **Challenge Detail** (/challenges/:challengeSlug, 스텁): 새로 구현
    - Challenge 설명 + 문제 정의 + 현재 질문
    - 참여 기록 목록
    - 관련 Stage 링크

  **Recommended Agent Profile**: `visual-engineering` + `frontend-design`
  **Parallelization**: Wave 4, Blocked By: Wave 2

  **References**: `app/routes/public/challenges/`, `app/db/queries/challenges.server.ts`, `.docs/frd.md`

  **QA Scenarios**:
  ```
  Scenario: Challenge Detail 렌더링
    Tool: Playwright
    Steps:
      1. 1440px에서 /challenges 접속 → Challenge 카드 확인
      2. Challenge 카드 클릭 → /challenges/{slug} 이동
      3. 문제 정의 + 현재 질문 + 참여 기록 목록 표시 확인
      4. 375px → 단일열, 깨짐 없음
    Expected Result: Challenge Detail 정상 렌더링
    Evidence: .sisyphus/evidence/task-29-challenge-detail.png
  ```

  **Commit**: YES — `page: /challenges — 업그레이드 + Detail 구현`

- [x] 30. TAGS 목록 + Tag Detail 구현

  **What to do**:
  - **Tags** (/tags, 스텁): 태그 클라우드 또는 목록
  - **Tag Detail** (/tags/:tagSlug, 스텁): 해당 태그의 기록 목록

  **Recommended Agent Profile**: `visual-engineering` + `frontend-design`
  **Parallelization**: Wave 4, Blocked By: Wave 2
  **References**: `app/routes/public/tags/`, `app/db/queries/search.server.ts`

  **QA Scenarios**:
  ```
  Scenario: Tags 목록 + Tag Detail
    Tool: Playwright
    Steps:
      1. 1440px에서 /tags 접속 → 태그 클라우드/목록 렌더링 확인
      2. 태그 클릭 → /tags/{slug} → 해당 태그의 기록 목록 표시
      3. 375px → 레이아웃 깨짐 없음
    Expected Result: 태그 목록 + 상세 정상 렌더링
    Evidence: .sisyphus/evidence/task-30-tags.png
  ```

  **Commit**: YES — `page: /tags — 목록 + Detail 구현`

- [x] 31. ME (내 프로필) + SETTINGS 페이지 구현

  **What to do**:
  - **ME** (/me, 스텁): 내 프로필 대시보드
    - 내 기록 목록 + 내 질문 + 내 응답
    - 활동 요약
  - **SETTINGS** (/settings, 142줄 — 기존 구현 있음): 시각 업그레이드
    - 설정 폼 스타일: label + input + helper 패턴
    - 알림 설정, 개인정보 설정
    - 이름/bio 편집 없음 (ada-kr-pos.com에서 관리 — AGENTS.md 규칙)

  **Must NOT do**: Settings에서 name/bio 편집 UI 만들지 않음

  **Recommended Agent Profile**: `visual-engineering` + `frontend-design`
  **Parallelization**: Wave 4, Blocked By: Wave 2
  **References**: `app/routes/public/me.tsx`, `app/routes/public/settings.tsx`, `.docs/frd.md`

  **QA Scenarios**:
  ```
  Scenario: ME + Settings 보호된 라우트 접근
    Tool: Playwright
    Steps:
      1. context.addCookies([{ name:'adakrpos_session', value:TEST_LEARNER_SESSION, domain:'localhost', path:'/' }])
      2. /me 접속 → 내 기록/질문/응답 목록 표시 확인
      3. /settings 접속 → 설정 폼 렌더링 확인
      4. Settings에서 name/bio 편집 필드가 없는지 확인
      5. 375px → 단일열, 깨짐 없음
    Expected Result: 인증 후 정상 접근, name/bio 편집 없음
    Evidence: .sisyphus/evidence/task-31-me-settings.png
  ```

  **Commit**: YES — `page: /me + /settings — 구현 + 업그레이드`

- [x] 32. INBOX (알림) + GUIDE (가이드) 페이지 구현

  **What to do**:
  - **INBOX** (/inbox, 스텁): 알림 목록
    - 알림 유형별 아이콘 + 메시지 + 시간
    - 읽음/안읽음 구분
    - 빈 상태: "새로운 알림이 없습니다"
  - **GUIDE** (/guide, 스텁): 도움말/가이드
    - 사용법 안내 (FAQ 아코디언 대신 인라인 확장 — redesign-skill 권장)
    - 용어 설명 (glossary 참조)

  **Recommended Agent Profile**: `visual-engineering` + `frontend-design`
  **Parallelization**: Wave 4, Blocked By: Wave 2
  **References**: `app/routes/public/inbox.tsx`, `app/routes/public/guide.tsx`, `.docs/glossary.md`

  **QA Scenarios**:
  ```
  Scenario: Inbox 보호된 라우트 + 빈 상태
    Tool: Playwright
    Steps:
      1. context.addCookies([{ name:'adakrpos_session', value:TEST_LEARNER_SESSION, domain:'localhost', path:'/' }])
      2. /inbox 접속 → 알림 목록 또는 빈 상태 확인
      3. 빈 상태인 경우: "새로운 알림이 없습니다" 메시지 확인
    Expected Result: 인증 후 정상 접근, 빈 상태 허가형 메시지
    Evidence: .sisyphus/evidence/task-32-inbox.png

  Scenario: Guide 페이지 렌더링
    Tool: Playwright
    Steps:
      1. /guide 접속 → 도움말/용어 설명 표시 확인
      2. FAQ 아코디언이 아닌 인라인 확장 방식인지 확인
    Expected Result: 인라인 확장 가이드, 아코디언 아님
    Evidence: .sisyphus/evidence/task-32-guide.png
  ```

  **Commit**: YES — `page: /inbox + /guide — 구현`

- [x] 33. Collaboration Group + Collective Memory 페이지 구현

  **What to do**:
  - **Collaboration Group** (/groups/:groupSlug, 스텁): 협업 그룹 상세
    - 그룹명 + 질문 + 참여자 + 상태 (Forming/Active/Restructured/Archived)
    - 그룹 기록 목록
  - **Collective Memory** (/memories/:stageSlug, 스텁): Stage 종합 기억
    - Stage 요약 + 하이라이트 기록 + 핵심 질문

  **Recommended Agent Profile**: `visual-engineering` + `frontend-design`
  **Parallelization**: Wave 4, Blocked By: Wave 2
  **References**: `app/routes/public/groups/$groupSlug.tsx`, `app/routes/public/memories/$stageSlug.tsx`, `.docs/frd.md`

  **QA Scenarios**:
  ```
  Scenario: Collaboration Group + Memory 렌더링
    Tool: Playwright
    Steps:
      1. /journey 접속 → 첫 Stage 클릭 → Stage Detail에서 관련 그룹 링크 클릭 (또는 seed 데이터 기반 URL 직접 접속) → 그룹명 + 질문 + 참여자 + 상태 확인
      2. /journey 접속 → 첫 Stage 클릭 → Collective Memory 링크 클릭 (또는 seed 데이터 기반 URL 직접 접속) → Stage 요약 + 하이라이트 기록 확인
      3. 375px → 깨짐 없음
    Expected Result: 그룹/메모리 정상 렌더링
    Evidence: .sisyphus/evidence/task-33-groups-memories.png
  ```

  **Commit**: YES — `page: /groups + /memories — 구현`

- [x] 34. Record Edit 페이지 구현

  **What to do**:
  - **Record Edit** (/logs/:recordSlug/edit, 스텁): 기록 수정 페이지
    - 기존 에디터 컴포넌트 재사용 (NoteEditor 또는 ArticleEditor)
    - 기존 기록 데이터 로드 후 에디터에 주입
    - 발행 설정 수정 가능

  **Must NOT do**: 에디터 컴포넌트 내부 수정하지 않음

  **Recommended Agent Profile**: `visual-engineering` + `frontend-design`
  **Parallelization**: Wave 4, Blocked By: Wave 2
  **References**: `app/routes/public/logs/$recordSlug.edit.tsx`, `app/db/queries/records.server.ts`

  **QA Scenarios**:
  ```
  Scenario: Record Edit 보호된 라우트
    Tool: Playwright
    Steps:
      1. context.addCookies([{ name:'adakrpos_session', value:TEST_LEARNER_SESSION, domain:'localhost', path:'/' }])
      2. /logs 접속 → 첫 번째 기록 클릭 → 기록 상세에서 "편집" 버튼 클릭 → 에디터 로드 확인
      3. 기존 기록 데이터가 에디터에 주입되어 있는지 확인
      4. 에디터 컴포넌트(NoteEditor/ArticleEditor) 정상 렌더링
    Expected Result: 기존 데이터 로드 + 에디터 정상 동작
    Evidence: .sisyphus/evidence/task-34-record-edit.png
  ```

  **Commit**: YES — `page: /logs/:recordSlug/edit — 구현`

### Wave 5 — Admin Infrastructure

- [x] 35. Admin 레이아웃 토큰 + AdminSidebar 리디자인

  **What to do**:
  - Admin 전용 디자인 토큰 확인 및 보강 (app.css @theme의 admin-* 토큰)
  - AdminSidebar (158줄) 리디자인:
    - 좌측 사이드바: `bg-admin-sidebar text-admin-sidebar-text`, compact padding
    - 5개 카테고리 접기/펼치기 동작 개선
    - 활성 메뉴 아이템: `bg-admin-sidebar-active`
    - Phosphor Icons 적용
    - 사이드바 축소/확장 토글 (wide ↔ icon-only)

  **Must NOT do**: 스킬 파일 기법 (Double-Bezel, spring physics) 적용하지 않음

  **Recommended Agent Profile**: `visual-engineering` + `frontend-design`
  **Parallelization**: Wave 5 (parallel with 36-37), Blocked By: Wave 2

  **References**:
  - `app/components/admin/AdminSidebar.tsx`
  - `app/routes/_admin.tsx` — Admin 레이아웃
  - `.docs/admin.md` — Admin 디자인 원칙
  - `AGENTS.md` §Admin 디자인

  **QA Scenarios**:
  ```
  Scenario: AdminSidebar 보호된 라우트
    Tool: Playwright
    Steps:
      1. context.addCookies([{ name:'adakrpos_session', value:TEST_ADMIN_SESSION, domain:'localhost', path:'/' }])
      2. 1440px에서 /admin 접속
      3. 좌측 사이드바 존재 확인 → 5개 카테고리 + 14개 메뉴
      4. 메뉴 아이콘이 Phosphor Icons인지 확인
      5. 활성 메뉴 아이템 하이라이트 확인
      6. 사이드바 축소 토글 → icon-only 모드 확인
    Expected Result: utilitarian 사이드바, Phosphor Icons, 축소/확장
    Evidence: .sisyphus/evidence/task-35-admin-sidebar.png
  ```

  **Commit**: YES — `component: AdminSidebar — utilitarian 리디자인`

- [x] 36. AdminContextBar 리디자인 + 공통 Admin 패턴 정의

  **What to do**:
  - AdminContextBar 리디자인: 상단 컨텍스트 바
    - 페이지 제목 + breadcrumb + 액션 버튼
    - 검색 바 (admin 검색)
  - 공통 Admin 패턴 정의 (재사용 가능):
    - Admin 테이블 스타일: dense, 1px borders, hover 행
    - Admin 폼 스타일: label + input + helper
    - Admin 카드: 단순한 border + padding (Double-Bezel 아님)
    - Admin 뱃지: status badge, role badge
    - Admin 버튼: primary(admin-accent), secondary, ghost

  **Recommended Agent Profile**: `visual-engineering` + `frontend-design`
  **Parallelization**: Wave 5, Blocked By: Wave 2
  **References**: `app/components/admin/AdminContextBar.tsx`, `.docs/admin.md`

  **QA Scenarios**:
  ```
  Scenario: AdminContextBar + 공통 패턴
    Tool: Playwright
    Steps:
      1. context.addCookies([{ name:'adakrpos_session', value:TEST_ADMIN_SESSION, domain:'localhost', path:'/' }])
      2. /admin 접속 → 상단 컨텍스트 바 존재 확인 (제목 + breadcrumb)
      3. /admin/stages 접속 → 테이블 스타일 확인 (dense, 1px borders)
    Expected Result: ContextBar + 공통 패턴 적용
    Evidence: .sisyphus/evidence/task-36-admin-context.png
  ```

  **Commit**: YES — `component: AdminContextBar + Admin 공통 패턴`

- [x] 37. Admin Dashboard 시각 업그레이드

  **What to do**:
  - Admin Dashboard (64줄): 통계 패널 + 최근 기록 + 플래그된 기록
  - 통계 카드: 숫자 tabular-nums, dense layout
  - 최근 기록: admin 테이블 스타일
  - 플래그된 기록: 경고 배경 + 바로가기

  **Recommended Agent Profile**: `visual-engineering` + `frontend-design`
  **Parallelization**: Wave 5, Blocked By: Wave 2
  **References**: `app/routes/admin/index.tsx`

  **QA Scenarios**:
  ```
  Scenario: Admin Dashboard 렌더링
    Tool: Playwright
    Steps:
      1. context.addCookies([{ name:'adakrpos_session', value:TEST_ADMIN_SESSION, domain:'localhost', path:'/' }])
      2. /admin 접속
      3. 통계 패널의 숫자가 tabular-nums 폰트인지 확인
      4. 최근 기록 테이블 렌더링 확인
      5. Double-Bezel 카드가 사용되지 않았는지 확인 (Admin은 단순 border)
    Expected Result: utilitarian dashboard, tabular-nums, no Double-Bezel
    Evidence: .sisyphus/evidence/task-37-admin-dashboard.png
  ```

  **Commit**: YES — `page: /admin — Dashboard 시각 업그레이드`

### Wave 6 — Admin Pages Implementation

> **모든 Admin 페이지 QA 공통 패턴**: 
> 1. `context.addCookies([{ name:'adakrpos_session', value:TEST_ADMIN_SESSION, domain:'localhost', path:'/' }])`
> 2. 해당 `/admin/*` 경로 접속
> 3. 목록 페이지: 테이블 렌더링 + 필터/검색 동작 확인
> 4. 상세 페이지: 폼/상세 정보 렌더링 확인
> 5. `tsc --noEmit` + `npx react-router build` 성공
> 6. 1440px 스크린샷 캡처 → `.sisyphus/evidence/task-{N}-admin-{page}.png`
> 7. Double-Bezel/spring physics 미적용 확인 (Admin 규칙)

- [x] 38. Admin Stages 관리 (목록 + 상세)

  **What to do**: `/admin/stages` 목록 (테이블) + `/admin/stages/:stageId` 상세/편집 (폼)
  **Recommended Agent Profile**: `visual-engineering`, **Skills**: [`frontend-design`]
  **References**: `app/routes/admin/stages/`, `app/db/queries/stages.server.ts`, `.docs/admin.md` §Stage 관리

  **QA Scenarios**:
  ```
  Scenario: Admin Stages CRUD
    Tool: Playwright
    Steps:
      1. context.addCookies([{ name:'adakrpos_session', value:TEST_ADMIN_SESSION, domain:'localhost', path:'/' }])
      2. /admin/stages 접속 → Stage 테이블 렌더링 (이름, 타입, 상태 열)
      3. 행 클릭 → /admin/stages/{id} → 상세/편집 폼 렌더링
      4. 폼 필드: label 위 input, helper text 아래
    Expected Result: 테이블 + 폼 정상 렌더링
    Evidence: .sisyphus/evidence/task-38-admin-stages.png
  ```

  **Commit**: YES — `page: /admin/stages — 관리 UI`

- [x] 39. Admin Challenges 관리 (목록 + 상세)

  **What to do**: `/admin/challenges` 목록 + `/admin/challenges/:challengeId` 상세/편집
  **References**: `app/routes/admin/challenges/`, `.docs/admin.md`

  **QA Scenarios**:
  ```
  Scenario: Admin Challenges CRUD
    Tool: Playwright
    Steps:
      1. context.addCookies([{ name:'adakrpos_session', value:TEST_ADMIN_SESSION, domain:'localhost', path:'/' }])
      2. /admin/challenges 접속 → 테이블 렌더링
      3. 행 클릭 → 상세 폼 렌더링
    Expected Result: 테이블 + 폼 정상
    Evidence: .sisyphus/evidence/task-39-admin-challenges.png
  ```

  **Commit**: YES — `page: /admin/challenges — 관리 UI`

- [x] 40. Admin Learners 관리 (목록 + 상세)

  **What to do**: `/admin/learners` 목록 + `/admin/learners/:learnerId` 상세 (읽기 전용 + 역할 할당)
  **References**: `app/routes/admin/learners/`, `app/db/queries/learners.server.ts`, `.docs/admin.md`

  **QA Scenarios**:
  ```
  Scenario: Admin Learners 관리
    Tool: Playwright
    Steps:
      1. context.addCookies([{ name:'adakrpos_session', value:TEST_ADMIN_SESSION, domain:'localhost', path:'/' }])
      2. /admin/learners 접속 → Learner 테이블 렌더링
      3. 행 클릭 → 상세 (읽기 전용 + 역할 할당 UI)
    Expected Result: 테이블 + 상세 정상
    Evidence: .sisyphus/evidence/task-40-admin-learners.png
  ```

  **Commit**: YES — `page: /admin/learners — 관리 UI`

- [x] 41. Admin Records + Dialogue 관리

  **What to do**:
  - `/admin/records` 기록 목록 (필터 + 모더레이션 상태) + `/admin/records/:recordId` 기록 상세/모더레이션
  - `/admin/dialogue` 응답 목록 + `/admin/dialogue/:responseId` 응답 상세/모더레이션
  **References**: `app/routes/admin/records/`, `app/routes/admin/dialogue/`, `.docs/admin.md`

  **QA Scenarios**:
  ```
  Scenario: Admin Records + Dialogue
    Tool: Playwright
    Steps:
      1. context.addCookies([{ name:'adakrpos_session', value:TEST_ADMIN_SESSION, domain:'localhost', path:'/' }])
      2. /admin/records 접속 → 기록 테이블 + 모더레이션 상태 필터
      3. /admin/dialogue 접속 → 응답 테이블
      4. 행 클릭 → 상세/모더레이션 UI
    Expected Result: 기록 + 응답 관리 정상
    Evidence: .sisyphus/evidence/task-41-admin-records.png
  ```

  **Commit**: YES — `page: /admin/records + /admin/dialogue — 관리 UI`

- [x] 42. Admin Collaboration + Memories 관리

  **What to do**:
  - `/admin/collaboration` 협업 그룹 목록 + `/admin/collaboration/:groupId` 상세
  - `/admin/memories` Collective Memory 목록 + `/admin/memories/:stageId` 상세/발행
  **References**: `app/routes/admin/collaboration/`, `app/routes/admin/memories/`, `.docs/admin.md`

  **QA Scenarios**:
  ```
  Scenario: Admin Collaboration + Memories
    Tool: Playwright
    Steps:
      1. context.addCookies([{ name:'adakrpos_session', value:TEST_ADMIN_SESSION, domain:'localhost', path:'/' }])
      2. /admin/collaboration → 그룹 목록 테이블
      3. /admin/memories → Memory 목록 + 발행 UI
    Expected Result: 그룹 + 메모리 관리 정상
    Evidence: .sisyphus/evidence/task-42-admin-collab.png
  ```

  **Commit**: YES — `page: /admin/collaboration + /admin/memories — 관리 UI`

- [x] 43. Admin Templates + Curation 관리

  **What to do**:
  - `/admin/templates` 템플릿 목록 + `/admin/templates/:templateId` 상세/편집
  - `/admin/curation` 큐레이션 대시보드
  **References**: `app/routes/admin/templates/`, `app/routes/admin/curation.tsx`, `.docs/admin.md`

  **QA Scenarios**:
  ```
  Scenario: Admin Templates + Curation
    Tool: Playwright
    Steps:
      1. context.addCookies([{ name:'adakrpos_session', value:TEST_ADMIN_SESSION, domain:'localhost', path:'/' }])
      2. /admin/templates → 템플릿 테이블
      3. /admin/curation → 큐레이션 대시보드
    Expected Result: 템플릿 + 큐레이션 정상
    Evidence: .sisyphus/evidence/task-43-admin-templates.png
  ```

  **Commit**: YES — `page: /admin/templates + /admin/curation — 관리 UI`

- [x] 44. Admin Tags + Analytics 관리

  **What to do**:
  - `/admin/tags` (306줄 — 기존 CRUD 있음): 시각 업그레이드
  - `/admin/analytics`: 분석 대시보드 (차트 X, 요약 통계만 — tabular-nums)
  **References**: `app/routes/admin/tags.tsx`, `app/routes/admin/analytics.tsx`, `.docs/admin.md`

  **QA Scenarios**:
  ```
  Scenario: Admin Tags + Analytics
    Tool: Playwright
    Steps:
      1. context.addCookies([{ name:'adakrpos_session', value:TEST_ADMIN_SESSION, domain:'localhost', path:'/' }])
      2. /admin/tags → 태그 CRUD 테이블 (기존 업그레이드)
      3. /admin/analytics → 요약 통계 (tabular-nums 숫자)
      4. 차트가 없고 요약 통계만 있는지 확인
    Expected Result: CRUD 테이블 + 요약 통계, 차트 없음
    Evidence: .sisyphus/evidence/task-44-admin-tags-analytics.png
  ```

  **Commit**: YES — `page: /admin/tags + /admin/analytics — 관리 UI`

- [x] 45. Admin Settings + Roles + Audit 관리

  **What to do**:
  - `/admin/settings`: 시스템 설정 폼
  - `/admin/roles` (145줄 — 기존 CRUD 있음): 역할 관리 시각 업그레이드
  - `/admin/audit`: 감사 로그 테이블
  **References**: `app/routes/admin/settings.tsx`, `app/routes/admin/roles.tsx`, `app/routes/admin/audit.tsx`, `.docs/admin.md`

  **QA Scenarios**:
  ```
  Scenario: Admin Settings + Roles + Audit
    Tool: Playwright
    Steps:
      1. context.addCookies([{ name:'adakrpos_session', value:TEST_ADMIN_SESSION, domain:'localhost', path:'/' }])
      2. /admin/settings → 시스템 설정 폼 렌더링
      3. /admin/roles → 역할 CRUD 테이블
      4. /admin/audit → 감사 로그 테이블 (타임스탬프 + 액션 + 사용자)
    Expected Result: Settings 폼 + Roles 테이블 + Audit 로그
    Evidence: .sisyphus/evidence/task-45-admin-settings.png
  ```

  **Commit**: YES — `page: /admin/settings + /admin/roles + /admin/audit — 관리 UI`

### Wave 7 — Polish & Regression

- [x] 46. 전체 접근성 감사 + 수정

  **What to do**:
  - 모든 페이지에 대해 접근성 검사:
    - Playwright + axe-core로 자동 감사
    - 색 대비 4.5:1 이상 확인
    - 터치 타겟 44px 이상 확인
    - 모든 이미지 alt 텍스트 확인
    - focus ring 일관성 확인
    - ARIA 속성 유효성 확인
    - prefers-reduced-motion 지원 확인
  - 발견된 이슈 수정

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: [`playwright`]

  **Parallelization**: Wave 7, Blocked By: Waves 3-6

  **QA Scenarios**:
  ```
  Scenario: 접근성 자동 감사
    Tool: Playwright (playwright skill)
    Steps:
      1. 모든 Public 페이지 (/, /journey, /logs, /search 등)에 접속
      2. 각 페이지에서 axe-core 실행 → violations 0개 확인 (critical/serious)
      3. 모든 img 태그에 alt 속성 확인
      4. 모든 button/a 태그에 접근 가능한 이름(aria-label 또는 텍스트) 확인
      5. prefers-reduced-motion 에뮬레이션 → 모든 애니메이션 비활성화 확인
    Expected Result: critical/serious 접근성 위반 0건
    Evidence: .sisyphus/evidence/task-46-a11y-audit.txt

  Scenario: focus ring 일관성
    Tool: Playwright
    Steps:
      1. / 접속 → Tab 키로 인터랙티브 요소 순회
      2. 모든 focus 상태에서 ocean-blue ring 표시 확인
    Expected Result: 모든 인터랙티브 요소에 일관된 focus ring
    Evidence: .sisyphus/evidence/task-46-focus-ring.png
  ```

  **Commit**: YES — `fix(a11y): 접근성 감사 수정`

- [x] 47. 성능 최적화 + 번들 사이즈 감사

  **What to do**:
  - `npx react-router build` 실행 → 번들 사이즈 측정
  - Wave 0 baseline 대비 증가량 확인 (≤ 20KB gzip 목표)
  - 초과 시 최적화:
    - Framer Motion: LazyMotion + domAnimation으로 축소
    - Phosphor Icons: tree-shaking 확인
    - Pretendard/Geist: font subset 또는 CDN 최적화
  - `root.tsx`의 `theme-color` meta 태그가 현재 배경색과 일치하는지 확인

  **Recommended Agent Profile**: `unspecified-high`
  **Parallelization**: Wave 7, Blocked By: Waves 3-6

  **QA Scenarios**:
  ```
  Scenario: 번들 사이즈 비교
    Tool: Bash
    Steps:
      1. npx react-router build → 성공
      2. du -sh build/client/assets/ → 전체 사이즈 기록
      3. cat .sisyphus/evidence/baseline/bundle-baseline.txt → baseline 사이즈 확인
      4. 증가량 계산 → ≤ 20KB gzip 확인
    Expected Result: 번들 증가 ≤ 20KB gzip
    Evidence: .sisyphus/evidence/task-47-bundle-size.txt

  Scenario: theme-color meta 확인
    Tool: Bash
    Steps:
      1. grep "theme-color" app/root.tsx → content 값이 #F6F8FB인지 확인
    Expected Result: theme-color가 현재 bg 색상과 일치
    Evidence: .sisyphus/evidence/task-47-meta.txt
  ```

  **Commit**: YES — `perf: 번들 최적화`

- [x] 48. 반응형 QA (모든 페이지 × 3 뷰포트)

  **What to do**:
  - 모든 구현된 페이지를 1440px, 768px, 375px에서 스크린샷 캡처
  - 각 뷰포트에서 확인:
    - 가로 스크롤 없음
    - 텍스트 잘림 없음
    - 터치 타겟 충분
    - 레이아웃 깨짐 없음
  - 발견된 이슈 수정

  **Recommended Agent Profile**: `unspecified-high` + `playwright`
  **Parallelization**: Wave 7, Blocked By: Waves 3-6

  **QA Scenarios**:
  ```
  Scenario: 전체 반응형 스크린샷 캡처
    Tool: Playwright (playwright skill)
    Steps:
      1. 모든 Public 페이지를 1440px, 768px, 375px에서 순회
      2. [보호된 라우트] context.addCookies로 인증
      3. 각 페이지에서:
         a. 가로 스크롤 없음 확인 (document.body.scrollWidth <= window.innerWidth)
         b. 텍스트 잘림 없음 (overflow:hidden으로 숨겨진 콘텐츠 없음)
         c. 스크린샷 캡처
      4. 모든 Admin 페이지도 동일 (TEST_ADMIN_SESSION 인증)
    Expected Result: 모든 페이지 × 3 뷰포트 정상, 가로 스크롤 0건
    Evidence: .sisyphus/evidence/task-48-responsive/ 디렉토리에 전체 스크린샷
  ```

  **Commit**: YES — `fix(responsive): 반응형 QA 수정`

- [x] 49. 에디터 시각 업데이트

  **What to do**:
  - `app/styles/editor.css` 색상/폰트 업데이트:
    - 기존 색상 토큰이 통합된 @theme에서 정상 resolve되는지 확인
    - 폰트: Pretendard + Geist 적용 확인
    - heading 스타일: tracking-tight 추가
  - ArticleEditor 툴바 아이콘: Phosphor Icons로 교체 (Task 5에서 이미 완료됐으면 확인만)
  - editor.css의 callout/blockquote 색상이 새 토큰 체계와 일치하는지 확인

  **Must NOT do**: TipTap 확장 수정하지 않음. 에디터 구조 변경하지 않음.

  **Recommended Agent Profile**: `visual-engineering`
  **Parallelization**: Wave 7, Blocked By: Waves 3-6

  **QA Scenarios**:
  ```
  Scenario: 에디터 스타일 무결성
    Tool: Playwright
    Steps:
      1. context.addCookies([{ name:'adakrpos_session', value:TEST_LEARNER_SESSION, domain:'localhost', path:'/' }])
      2. /write/article 접속 → 에디터 로드
      3. 에디터 heading의 font-family 확인 → Pretendard 포함
      4. 에디터 heading의 letter-spacing → negative (tracking-tight)
      5. 툴바 아이콘이 Phosphor Icons인지 확인
      6. callout 블록의 색상이 토큰 체계와 일치하는지 확인
    Expected Result: 에디터 폰트/아이콘/색상 업데이트, 기능 유지
    Evidence: .sisyphus/evidence/task-49-editor-visual.png

  Scenario: TipTap 확장 미수정 확인
    Tool: Bash
    Steps:
      1. git diff --name-only -- app/components/editor/CalloutExtension.ts app/components/editor/MentionExtension.ts app/components/editor/RecordRefExtension.ts app/components/editor/TagExtension.ts app/components/editor/TocExtension.ts app/components/editor/ToggleExtension.ts → 변경 없음
      2. grep -r "lucide-react" app/components/editor/ → 결과 없음
    Expected Result: TipTap 확장 파일 미수정, lucide 참조 없음
    Evidence: .sisyphus/evidence/task-49-no-extension-change.txt
  ```

  **Commit**: YES — `fix(editor): 에디터 시각 업데이트`

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Rejection → fix → re-run.

- [x] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, curl endpoint, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan. Verify Design Authority Hierarchy was respected (AGENTS.md > design.md > Hybrid Blend > Skills).
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

  **QA Scenarios**:
  ```
  Scenario: Must Have 검증
    Tool: Bash + Read
    Steps:
      1. grep "@phosphor-icons/react" package.json → 존재
      2. grep "framer-motion" package.json → 존재
      3. grep "clsx" package.json → 존재
      4. grep "tailwind-merge" package.json → 존재
      5. ls app/lib/cn.ts → 존재
      6. ls app/lib/motion.tsx → 존재
      7. ls app/routes/public/style-reference.tsx → 존재
    Expected Result: 모든 Must Have 항목 존재
    Evidence: .sisyphus/evidence/f1-must-have.txt

  Scenario: Must NOT Have 검증
    Tool: Bash
    Steps:
      1. grep -ri "좋아요\|인기순\|베스트\|추천순\|leaderboard" app/routes/ app/components/ → 결과 없음
      2. grep -ri "lucide-react" app/ → 결과 없음
      3. grep -r "as any\|@ts-ignore\|@ts-expect-error" app/ → 결과 없음
      4. grep -ri "bubble\|chat-bubble" app/components/ → 결과 없음
    Expected Result: 모든 Must NOT Have 부재 확인
    Evidence: .sisyphus/evidence/f1-must-not-have.txt
  ```

- [x] F2. **Code Quality Review** — `unspecified-high`
  Run `tsc --noEmit` + `npx react-router build` + `pnpm vitest run`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names. Verify no emoji in code (taste-skill rule). Verify no Inter/Arial/Roboto font usage. Verify no `h-screen` (use `min-h-[100dvh]`). Check cn() usage consistency.
  Output: `Build [PASS/FAIL] | tsc [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

  **QA Scenarios**:
  ```
  Scenario: 전체 빌드 + 테스트
    Tool: Bash
    Steps:
      1. tsc --noEmit → exit code 0
      2. npx react-router build → exit code 0
      3. pnpm vitest run → 모든 테스트 PASS
      4. npx playwright test → 모든 테스트 PASS
    Expected Result: 모든 빌드/테스트 통과
    Evidence: .sisyphus/evidence/f2-build-test.txt

  Scenario: 코드 품질 검사
    Tool: Bash
    Steps:
      1. grep -rn "as any" app/ → 0 결과
      2. grep -rn "console.log" app/routes/ app/components/ | grep -v "// debug" → 0 결과
      3. grep -rn "h-screen" app/ → 0 결과 (min-h-[100dvh] 사용해야 함)
      4. grep -rn "Inter\|Arial\|Roboto" app/ → 0 결과
    Expected Result: 코드 품질 기준 충족
    Evidence: .sisyphus/evidence/f2-code-quality.txt
  ```

- [x] F3. **Real Manual QA** — `unspecified-high` (+ `playwright` skill)
  Start from clean state. Execute EVERY QA scenario from EVERY task — follow exact steps, capture evidence. Test cross-task integration (components in pages, pages in layouts). Test edge cases: empty state, invalid input, rapid actions, mobile viewport. Save to `.sisyphus/evidence/final-qa/`. Capture screenshots of ALL pages at 1440px, 768px, 375px. Compare against Wave 0 baseline screenshots.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

  **QA Scenarios**:
  ```
  Scenario: 전체 페이지 스크린샷 캡처
    Tool: Playwright (playwright skill)
    Steps:
      1. 모든 Public 페이지를 1440px, 768px, 375px에서 캡처
      2. [보호 라우트] context.addCookies로 TEST_LEARNER_SESSION 주입 후 /write, /me, /settings, /inbox 캡처
      3. [Admin] context.addCookies로 TEST_ADMIN_SESSION 주입 후 모든 /admin/* 캡처
      4. .sisyphus/evidence/final-qa/ 에 저장
    Expected Result: 모든 페이지 정상 렌더링, 깨짐 없음
    Evidence: .sisyphus/evidence/final-qa/ 디렉토리

  Scenario: Philosophy guard 최종 확인
    Tool: Bash
    Steps:
      1. grep -ri "좋아요\|인기순\|베스트\|추천순\|likes\|popular\|trending\|best" app/ → 0 결과
      2. grep -ri "oops\|Oops" app/ → 0 결과
      3. grep -r "confetti\|particle\|bounce\|parallax" app/ → 0 결과 (모션 금지)
    Expected Result: 금지 패턴 없음
    Evidence: .sisyphus/evidence/f3-philosophy-guard.txt
  ```

- [x] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff (git log/diff). Verify 1:1 — everything in spec was built, nothing beyond spec was built. Check "Must NOT do" compliance. Detect cross-task contamination: Task N touching Task M's files. Flag unaccounted changes. Verify no TipTap extensions modified. Verify no DB/API/auth changes. Verify no route structure changes.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

  **QA Scenarios**:
  ```
  Scenario: TipTap 확장 미수정 최종 확인
    Tool: Bash
    Steps:
      1. git diff --name-only HEAD~50 -- app/components/editor/CalloutExtension.ts app/components/editor/MentionExtension.ts app/components/editor/RecordRefExtension.ts app/components/editor/TagExtension.ts app/components/editor/TocExtension.ts app/components/editor/ToggleExtension.ts → 변경 파일 0개
      2. git diff --name-only HEAD~50 -- app/db/ → DB 스키마 변경 0개
      3. git diff --name-only HEAD~50 -- app/routes/api/ → API 라우트 변경 0개
      4. git diff --name-only HEAD~50 -- app/lib/auth.server.ts app/lib/auth.middleware.ts → 인증 로직 변경 0개
    Expected Result: 보호 영역 미변경
    Evidence: .sisyphus/evidence/f4-scope-fidelity.txt

  Scenario: 라우트 구조 보존 확인
    Tool: Bash
    Steps:
      1. ls app/routes/public/ → 기존 라우트 구조 유지 (URL 변경 없음)
      2. ls app/routes/admin/ → 기존 라우트 구조 유지
    Expected Result: 라우트 구조 미변경
    Evidence: .sisyphus/evidence/f4-route-structure.txt
  ```

---

## Commit Strategy

### Per-Wave Commits
- **Wave 0**: No commits (read-only baseline)
- **Wave 1**: `infra(fonts): Pretendard + Geist 듀얼 폰트 설정`, `infra(icons): lucide → phosphor 마이그레이션`, `infra(motion): Framer Motion + LazyMotion 패턴`, `infra(util): cn() 유틸리티 추가`, `infra(tokens): 디자인 토큰 통합`, `infra(test): Vitest 확장`, `infra(css): 모션 유틸리티 추가`, `feat(style-ref): Living Style Reference 페이지`
- **Waves 2-6**: `component: {ComponentName} — 시각 업그레이드`, `page: {routePath} — 시각 업그레이드/구현`
- **Wave 7**: `fix(a11y): 접근성 감사 수정`, `perf: 번들 최적화`, `fix(responsive): 반응형 QA 수정`

### Commit Gates (Every commit MUST pass)
```bash
tsc --noEmit        # 0 errors
npx react-router build  # 성공
```

### Wave Gates (Every wave completion MUST pass)
```bash
tsc --noEmit              # 0 errors
npx react-router build    # 성공
pnpm vitest run           # 모든 테스트 통과
npx playwright test       # 스모크 테스트 통과
```

---

## Success Criteria

### Verification Commands
```bash
tsc --noEmit                    # Expected: 0 errors
npx react-router build          # Expected: 성공, 번들 사이즈 baseline + ≤20KB
pnpm vitest run                 # Expected: 모든 테스트 통과
npx playwright test              # Expected: 모든 스모크 테스트 통과
```

### Final Checklist
- [ ] 모든 "Must Have" 구현 완료
- [ ] 모든 "Must NOT Have" 부재 확인
- [ ] 모든 테스트 통과 (vitest + playwright)
- [ ] 모든 페이지 1440px/768px/375px 레이아웃 정상
- [ ] 번들 사이즈 증가 ≤ 20KB gzip
- [ ] 접근성 점수 90↑
- [ ] "좋아요/인기순/베스트/추천순" 텍스트 없음
- [ ] TipTap 확장 7개 파일 미수정
- [ ] DB/API/auth 미변경
- [ ] 라우트 구조 미변경
