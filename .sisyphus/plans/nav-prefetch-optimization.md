# 네비게이션 Prefetch & 캐싱 최적화

## TL;DR

> **Quick Summary**: 115개 Link에 prefetch가 전혀 없어 클릭 후에야 코드+데이터 로딩이 시작되는 문제를 SmartLink 래퍼, shouldRevalidate, clientLoader 캐싱, NavigationFade 전환 효과, v8_splitRouteModules 활성화로 해결한다.
> 
> **Deliverables**:
> - SmartLink 래퍼 컴포넌트 (기본 `prefetch="intent"`)
> - NavigationFade 전환 효과 컴포넌트 (useNavigation 기반 opacity fade)
> - 115개 Link → SmartLink 마이그레이션
> - 레이아웃 shouldRevalidate로 불필요한 재요청 제거
> - clientLoader 캐싱 (records, stages, learners 상세 페이지)
> - v8_splitRouteModules 활성화
> - 리소스 힌트 (links() export)
> - /tags/$tagSlug 순차 쿼리 병렬화
> 
> **Estimated Effort**: Medium
> **Parallel Execution**: YES — 3 waves
> **Critical Path**: SmartLink 생성 → Link 마이그레이션 → clientLoader 캐싱

---

## Context

### Original Request
"페이지 전체적으로 클릭하면 바로 바뀌는게 아니라 한발짝 느려. 미리 로딩되면 좋겠는데. 이걸 완전 빠르게 최적화해줘."

### Interview Summary
**Key Discussions**:
- 115개 Link 인스턴스 중 `prefetch` 설정이 **0개** — 모든 네비게이션이 클릭 후에야 코드+데이터 로딩 시작
- 51개 loader 중 39개 이미 `database.batch()` / `Promise.all()` 사용 (서버 쪽은 양호)
- clientLoader 0개, shouldRevalidate 미설정, Pending UI 없음
- 사용자 선택: SmartLink 래퍼 방식, clientLoader 포함, 페이지 fade 효과

**Research Findings**:
- React Router 7에 글로벌 prefetch 설정 없음 → 래퍼 컴포넌트 필수
- `v8_splitRouteModules: true`로 loader/component 분리 청크 가능 (무료 성능)
- `unstable_middleware`는 Cloudflare Pages 비호환 → 제외
- `useNavigation()`은 clientLoader 실행 중 pending state를 반영하지 않음 (GitHub #13373) → Pending UI를 clientLoader보다 먼저 구현

### Metis Review
**Identified Gaps** (addressed):
- `useNavigation()`이 clientLoader pending state 미반영 → Pending UI를 clientLoader보다 먼저 구현하여 해결. clientLoader 캐시 히트 시 instant이므로 fade 불필요, 캐시 미스 시 serverLoader 호출은 useNavigation에 반영됨
- `v8_splitRouteModules`에서 clientLoader와 Component가 같은 모듈 import 시 split 불가 → clientLoader를 최소한으로 유지 (캐시 조회 + serverLoader() 호출만)
- RR7 기본 prefetch가 "none"임 확인 → SmartLink 래퍼 접근 완전 검증됨
- `shouldRevalidate`에서 `formMethod` 체크 권장 → mutation만 revalidation 트리거하도록

---

## Work Objectives

### Core Objective
페이지 전환 체감 속도를 "클릭 후 기다림"에서 "즉시 전환"으로 개선한다. hover/focus 시 미리 로딩하고, 재방문 시 서버 왕복을 제거하며, 전환 중에는 시각적 피드백을 제공한다.

### Concrete Deliverables
- `app/components/SmartLink.tsx` — prefetch="intent" 기본 래퍼
- `app/components/NavigationFade.tsx` — useNavigation 기반 opacity fade
- `react-router.config.ts` — v8_splitRouteModules 활성화
- 모든 Link import를 SmartLink로 전환 (115개소)
- `_public.tsx`, `_admin.tsx` — shouldRevalidate 추가
- `$recordSlug.tsx`, `$stageSlug.tsx`, `$learnerSlug.tsx` — clientLoader 캐싱
- `root.tsx` — NavigationFade 통합 + links() 리소스 힌트
- `tags/$tagSlug.tsx` — 순차 쿼리 병렬화

### Definition of Done
- [x] `pnpm dev` → 정상 동작, 콘솔 에러 없음
- [x] `tsc --noEmit` → 타입 에러 없음
- [x] Link hover 시 브라우저 DevTools Network 탭에 prefetch 요청 확인
- [x] 페이지 전환 시 fade 효과 동작
- [x] 이미 방문한 상세 페이지 재방문 시 서버 요청 없이 즉시 렌더

### Must Have
- SmartLink 래퍼에서 `prefetch` prop override 가능 (viewport, render 등)
- clientLoader 캐시는 in-memory `Map` 사용 (sessionStorage 아님)
- clientLoader는 최소한의 코드만 포함 (캐시 조회 + serverLoader 호출)
- shouldRevalidate에서 GET 네비게이션은 revalidation 스킵, mutation(POST/PUT/DELETE)만 트리거
- NavigationFade는 Quiet Depth 디자인 톤에 맞는 은은한 opacity 전환
- `formMethod` 기반 shouldRevalidate 판단 (formAction 아님)

### Must NOT Have (Guardrails)
- SmartLink에 모바일/데스크톱 자동 감지 로직 넣지 않기 (불필요한 복잡도)
- `unstable_middleware` 사용 금지 (CF Pages 비호환)
- clientLoader에서 route-specific helper import 금지 (v8_splitRouteModules 호환)
- sessionStorage/localStorage 캐시 금지 (직렬화 오버헤드, useNavigation 미반영)
- 래퍼 컴포넌트에 불필요한 추상화(SmartLink용 context, provider 등) 금지
- `defer()`/스트리밍 패턴 이번에 도입하지 않기 (loaders 이미 병렬화 양호)
- bounce/confetti/parallax 등 Quiet Depth 위반 모션 금지
- `prefetch="render"`를 기본값으로 쓰지 않기 (과도한 대역폭 소비)
- `clientLoader.hydrate = true` 설정 금지 (SSR 초기 로드 성능 저하 방지)

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: NO (프로젝트에 테스트 프레임워크 없음)
- **Automated tests**: None
- **Framework**: N/A

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Frontend/UI**: Playwright (playwright skill) — Navigate, interact, assert DOM, screenshot
- **Config/Build**: Bash — `tsc --noEmit`, `pnpm dev` 실행 확인
- **Network**: Playwright DevTools — prefetch 요청 확인, 캐시 동작 검증

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation — 5 parallel, no deps):
├── Task 1: SmartLink 래퍼 컴포넌트 생성 [quick]
├── Task 2: NavigationFade 컴포넌트 생성 [quick]
├── Task 3: v8_splitRouteModules 활성화 [quick]
├── Task 4: _public.tsx shouldRevalidate 추가 [quick]
└── Task 5: _admin.tsx shouldRevalidate 추가 [quick]

Wave 2 (Migration + Integration — 5 parallel, depends on Wave 1):
├── Task 6: GlobalNav Link → SmartLink 마이그레이션 (depends: 1) [quick]
├── Task 7: Card 컴포넌트 Link → SmartLink 마이그레이션 (depends: 1) [quick]
├── Task 8: Public route Link → SmartLink 마이그레이션 (depends: 1) [unspecified-low]
├── Task 9: Admin route Link → SmartLink 마이그레이션 (depends: 1) [unspecified-low]
└── Task 10: NavigationFade root.tsx 통합 (depends: 2) [quick]

Wave 3 (Deep Optimization — 5 parallel, depends on Wave 2):
├── Task 11: clientLoader — /logs/$recordSlug (depends: 8) [quick]
├── Task 12: clientLoader — /journey/$stageSlug (depends: 8) [quick]
├── Task 13: clientLoader — /learners/$learnerSlug (depends: 8) [quick]
├── Task 14: /tags/$tagSlug 순차 쿼리 병렬화 [quick]
└── Task 15: links() 리소스 힌트 추가 (depends: 10) [quick]

Wave FINAL (Verification — 4 parallel):
├── Task F1: Plan compliance audit (deep)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real QA — Playwright (unspecified-high)
└── Task F4: Scope fidelity check (deep)

Critical Path: Task 1 → Task 6/7/8/9 → Task 11/12/13 → F1-F4
Parallel Speedup: ~65% faster than sequential
Max Concurrent: 5 (all waves)
```

### Dependency Matrix

| Task | Depends On | Blocks | Wave |
|------|-----------|--------|------|
| 1 | — | 6, 7, 8, 9 | 1 |
| 2 | — | 10 | 1 |
| 3 | — | — | 1 |
| 4 | — | — | 1 |
| 5 | — | — | 1 |
| 6 | 1 | — | 2 |
| 7 | 1 | — | 2 |
| 8 | 1 | 11, 12, 13 | 2 |
| 9 | 1 | — | 2 |
| 10 | 2 | 15 | 2 |
| 11 | 8 | — | 3 |
| 12 | 8 | — | 3 |
| 13 | 8 | — | 3 |
| 14 | — | — | 3 |
| 15 | 10 | — | 3 |

### Agent Dispatch Summary

- **Wave 1**: 5 tasks — T1-T5 → `quick`
- **Wave 2**: 5 tasks — T6-T7,T10 → `quick`, T8-T9 → `unspecified-low`
- **Wave 3**: 5 tasks — T11-T15 → `quick`
- **FINAL**: 4 tasks — F1 → `deep`, F2 → `unspecified-high`, F3 → `unspecified-high` + `playwright`, F4 → `deep`

---

## TODOs

- [x] 1. SmartLink 래퍼 컴포넌트 생성

  **What to do**:
  - `app/components/SmartLink.tsx` 생성
  - React Router의 `Link`를 감싸는 래퍼 — 기본 `prefetch="intent"` 적용
  - `Link`의 모든 props를 그대로 전달 (React.ComponentProps<typeof Link> 사용)
  - `prefetch` prop을 override 가능하도록 (viewport, render, none 등)
  - named export로 `SmartLink`와 `Link` 둘 다 export (마이그레이션 편의)
  - 예: `export { SmartLink as Link }` — 기존 코드에서 import 경로만 바꾸면 됨

  **Must NOT do**:
  - 모바일/데스크톱 자동 감지 로직 금지
  - Context/Provider 패턴 금지
  - SmartLink 전용 추가 state 금지

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 단일 파일 생성, 20줄 미만의 간단한 래퍼
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `frontend-design`: UI 디자인이 아닌 유틸리티 컴포넌트

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3, 4, 5)
  - **Blocks**: Tasks 6, 7, 8, 9
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `app/components/GlobalNav.tsx` — 현재 Link import 및 사용 패턴 확인 (`import { Link } from "react-router"`)

  **API/Type References**:
  - React Router 7 Link 컴포넌트 — `prefetch` prop: `"none" | "intent" | "render" | "viewport"`
  - `React.ComponentProps<typeof Link>` — 모든 Link props 타입 포워딩

  **WHY Each Reference Matters**:
  - GlobalNav.tsx: 가장 많은 Link(23개)를 사용하는 파일로, SmartLink의 타입 호환성 검증 기준
  - React Router Link 타입: SmartLink가 기존 Link의 완벽한 drop-in replacement가 되려면 모든 props를 포워딩해야 함

  **Acceptance Criteria**:
  - [ ] `app/components/SmartLink.tsx` 파일 존재
  - [ ] `tsc --noEmit` 실행 시 SmartLink 관련 타입 에러 없음
  - [ ] `SmartLink`와 `Link` 두 가지 named export 확인
  - [ ] prefetch 기본값이 "intent"

  **QA Scenarios**:

  ```
  Scenario: SmartLink 타입 호환성 검증
    Tool: Bash
    Preconditions: SmartLink.tsx 파일 생성 완료
    Steps:
      1. `tsc --noEmit` 실행
      2. SmartLink 관련 에러 필터링
    Expected Result: SmartLink 관련 타입 에러 0건
    Failure Indicators: "SmartLink" 포함 에러 메시지 출력
    Evidence: .sisyphus/evidence/task-1-type-check.txt
  ```

  **Commit**: YES (Wave 1 그룹)
  - Message: `perf(nav): SmartLink 래퍼, NavigationFade, splitRouteModules, shouldRevalidate 기반 구조`
  - Files: `app/components/SmartLink.tsx`

- [x] 2. NavigationFade 전환 효과 컴포넌트 생성

  **What to do**:
  - `app/components/NavigationFade.tsx` 생성
  - `useNavigation()` 훅으로 `navigation.state` 감지
  - `state === "loading"` 일 때 children을 감싸는 wrapper에 `opacity: 0.6` + `transition: opacity 150ms ease` 적용
  - `state === "idle"` 일 때 `opacity: 1`로 복귀
  - Tailwind 클래스 사용: `transition-opacity duration-150` + 동적 opacity
  - 전환 지연(150ms 이상 걸릴 때만 fade 시작)을 위한 간단한 timeout — 빠른 전환에서는 깜빡임 방지
  - `reduced-motion` 미디어 쿼리 존중: `motion-safe:` prefix 사용

  **Must NOT do**:
  - bounce/parallax/confetti 등 과도한 모션 금지
  - skeleton UI 이 컴포넌트에서 구현 금지 (별도 관심사)
  - 150ms 미만 전환에서 opacity 변경 금지 (깜빡임 방지)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 단일 파일, 30줄 미만, Tailwind + useNavigation 조합
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `frontend-design`: 디자인 시스템 작업이 아닌 유틸리티 컴포넌트

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3, 4, 5)
  - **Blocks**: Task 10
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `app/root.tsx` — 현재 root 레이아웃 구조 확인 (NavigationFade가 통합될 위치)
  - `.docs/design.md` — Quiet Depth 모션 가이드 (허용: fade-up, subtle hover / 금지: bounce, parallax)

  **API/Type References**:
  - `useNavigation()` — `{ state: "idle" | "loading" | "submitting", location, formData }`

  **External References**:
  - React Router 7 Pending UI docs: `useNavigation()` 사용 패턴

  **WHY Each Reference Matters**:
  - root.tsx: NavigationFade가 감쌀 `<Outlet />` 위치 확인
  - design.md: Quiet Depth 톤에 맞는 모션 강도 결정 기준 (은은하고 존재감 최소)

  **Acceptance Criteria**:
  - [ ] `app/components/NavigationFade.tsx` 파일 존재
  - [ ] `tsc --noEmit` 에러 없음
  - [ ] `useNavigation` import 확인
  - [ ] `motion-safe:` 또는 `prefers-reduced-motion` 처리 존재

  **QA Scenarios**:

  ```
  Scenario: NavigationFade 타입 및 구조 검증
    Tool: Bash
    Preconditions: NavigationFade.tsx 생성 완료
    Steps:
      1. `tsc --noEmit` 실행
      2. NavigationFade 관련 에러 필터링
      3. 파일에 useNavigation import 및 opacity 관련 코드 존재 확인
    Expected Result: 타입 에러 0건, useNavigation 사용, opacity transition 코드 포함
    Failure Indicators: 타입 에러 또는 useNavigation 미사용
    Evidence: .sisyphus/evidence/task-2-type-check.txt
  ```

  **Commit**: YES (Wave 1 그룹)
  - Files: `app/components/NavigationFade.tsx`

- [x] 3. v8_splitRouteModules 활성화

  **What to do**:
  - `react-router.config.ts`에 `future` 객체 내 `v8_splitRouteModules: true` 추가
  - 기존 `future` 설정이 있으면 거기에 추가, 없으면 `future` 객체 생성
  - 이 설정으로 각 route의 loader/action과 component가 별도 청크로 분리됨
  - prefetch 시 loader 코드가 component 다운로드와 병렬로 실행 가능

  **Must NOT do**:
  - `"enforce"` 모드 사용 금지 (기존 코드와 호환성 문제 가능)
  - 다른 config 설정 변경 금지

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 단일 파일, 1줄 추가
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 4, 5)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `react-router.config.ts` — 현재 config 구조 확인 (ssr, Sentry 설정 등)

  **External References**:
  - React Router 7 `future.v8_splitRouteModules` — loader/component 분리 청크 설정

  **WHY Each Reference Matters**:
  - react-router.config.ts: 기존 설정과 충돌 없이 future flag 추가 위치 확인

  **Acceptance Criteria**:
  - [ ] `react-router.config.ts`에 `v8_splitRouteModules: true` 존재
  - [ ] `tsc --noEmit` 에러 없음
  - [ ] `pnpm dev` 정상 시작

  **QA Scenarios**:

  ```
  Scenario: splitRouteModules 설정 및 빌드 검증
    Tool: Bash
    Preconditions: react-router.config.ts 수정 완료
    Steps:
      1. `tsc --noEmit` 실행 — 타입 에러 확인
      2. `pnpm dev` 실행 — 서버 시작 확인 (5초 내 "ready" 메시지)
      3. react-router.config.ts에서 v8_splitRouteModules 설정 확인
    Expected Result: 타입 에러 0건, dev 서버 정상 시작
    Failure Indicators: "v8_splitRouteModules" 관련 에러, dev 서버 크래시
    Evidence: .sisyphus/evidence/task-3-config-verify.txt
  ```

  **Commit**: YES (Wave 1 그룹)
  - Files: `react-router.config.ts`

- [x] 4. _public.tsx shouldRevalidate 추가

  **What to do**:
  - `app/routes/_public.tsx`에 `shouldRevalidate` 함수 export 추가
  - GET 네비게이션(일반 페이지 이동)에서는 레이아웃 로더 재실행하지 않음
  - mutation(POST/PUT/DELETE — `formMethod` 기반 체크)에서만 revalidation 트리거
  - `defaultShouldRevalidate`를 escape hatch로 유지

  **Must NOT do**:
  - `formAction` 기반 판단 금지 (`formMethod` 사용)
  - 로더 자체 수정 금지 (shouldRevalidate만 추가)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 단일 파일, 10줄 미만 함수 추가
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3, 5)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `app/routes/_public.tsx` — 현재 레이아웃 로더 구조 (auth 검증, learner_profiles upsert)

  **API/Type References**:
  - `ShouldRevalidateFunctionArgs` — `{ formMethod, formAction, actionStatus, currentUrl, nextUrl, defaultShouldRevalidate }`

  **WHY Each Reference Matters**:
  - _public.tsx 로더가 `getAuth` + `upsertLearnerProfile`을 호출하는데, 이는 페이지 이동마다 재실행될 필요 없음. WeakMap 캐시가 있지만 shouldRevalidate로 아예 호출 자체를 방지

  **Acceptance Criteria**:
  - [ ] `_public.tsx`에 `shouldRevalidate` export 존재
  - [ ] `formMethod` 기반 조건 분기 코드 확인
  - [ ] `tsc --noEmit` 에러 없음

  **QA Scenarios**:

  ```
  Scenario: shouldRevalidate 함수 존재 및 타입 검증
    Tool: Bash
    Preconditions: _public.tsx 수정 완료
    Steps:
      1. _public.tsx 파일에서 "shouldRevalidate" export 존재 확인
      2. "formMethod" 문자열 포함 확인
      3. `tsc --noEmit` 실행
    Expected Result: shouldRevalidate export 존재, formMethod 기반 분기, 타입 에러 0건
    Failure Indicators: export 미존재, formMethod 미사용
    Evidence: .sisyphus/evidence/task-4-shouldrevalidate.txt
  ```

  **Commit**: YES (Wave 1 그룹)
  - Files: `app/routes/_public.tsx`

- [x] 5. _admin.tsx shouldRevalidate 추가

  **What to do**:
  - `app/routes/_admin.tsx`에 `shouldRevalidate` 함수 export 추가
  - Task 4와 동일한 로직: GET 네비게이션 스킵, mutation만 revalidation
  - `formMethod` 기반 체크, `defaultShouldRevalidate` escape hatch

  **Must NOT do**:
  - Task 4와 동일한 제약사항

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Task 4와 동일한 패턴, 단일 파일
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3, 4)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `app/routes/_admin.tsx` — 현재 admin 레이아웃 로더 구조 (requireRole 호출)
  - Task 4의 _public.tsx shouldRevalidate — 동일 패턴 적용

  **WHY Each Reference Matters**:
  - _admin.tsx 로더가 `requireRole`을 호출하는데, admin 내 페이지 이동마다 재실행 불필요

  **Acceptance Criteria**:
  - [ ] `_admin.tsx`에 `shouldRevalidate` export 존재
  - [ ] `formMethod` 기반 조건 분기 코드 확인
  - [ ] `tsc --noEmit` 에러 없음

  **QA Scenarios**:

  ```
  Scenario: admin shouldRevalidate 타입 검증
    Tool: Bash
    Preconditions: _admin.tsx 수정 완료
    Steps:
      1. _admin.tsx 파일에서 "shouldRevalidate" export 확인
      2. `tsc --noEmit` 실행
    Expected Result: shouldRevalidate export 존재, 타입 에러 0건
    Failure Indicators: export 미존재
    Evidence: .sisyphus/evidence/task-5-shouldrevalidate.txt
  ```

  **Commit**: YES (Wave 1 그룹)
  - Files: `app/routes/_admin.tsx`

- [x] 6. GlobalNav Link → SmartLink 마이그레이션

  **What to do**:
  - `app/components/GlobalNav.tsx`에서 `import { Link } from "react-router"` 제거
  - `import { Link } from "~/components/SmartLink"` 추가
  - 기존 `<Link>` JSX는 변경 불필요 (SmartLink가 `Link`로 export되므로)
  - 23개 Link 인스턴스 전부 자동으로 `prefetch="intent"` 적용됨
  - `/write/note` 및 `/write/article` CTA Link에는 `prefetch="render"` 명시 override (글쓰기 진입점으로 높은 클릭 확률)
  - 기타 다른 react-router import (useNavigate, useLocation 등)는 그대로 유지

  **Must NOT do**:
  - react-router에서 Link 외 다른 import 건드리지 않기
  - JSX 구조 변경 금지 (import만 변경)
  - `<Link>` → `<SmartLink>` 리네이밍 불필요 (aliased export 사용)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 단일 파일, import 변경 + 1개 prop override
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 7, 8, 9, 10)
  - **Blocks**: None
  - **Blocked By**: Task 1 (SmartLink 생성)

  **References**:

  **Pattern References**:
  - `app/components/GlobalNav.tsx` — 23개 Link 인스턴스, 현재 import 구조
  - `app/components/SmartLink.tsx` (Task 1 산출물) — `Link` aliased export 확인

  **WHY Each Reference Matters**:
  - GlobalNav는 모든 페이지에서 렌더되는 네비게이션으로, prefetch 효과가 가장 큰 곳

  **Acceptance Criteria**:
  - [ ] GlobalNav.tsx에서 `"~/components/SmartLink"` import 존재
  - [ ] `"react-router"`에서 `Link` import 제거됨
  - [ ] `/write/note` 및 `/write/article` CTA Link에 `prefetch="render"` 명시
  - [ ] `tsc --noEmit` 에러 없음

  **QA Scenarios**:

  ```
  Scenario: GlobalNav prefetch 적용 확인
    Tool: Playwright
    Preconditions: dev 서버 실행, SmartLink + GlobalNav 마이그레이션 완료
    Steps:
      1. http://localhost:5173/ 접속
      2. 네비게이션의 "여정" 링크에 마우스 hover
      3. 1초 대기
      4. DevTools Network 탭 또는 DOM에서 `<link rel="prefetch">` 요소 확인
    Expected Result: hover 시 prefetch 관련 네트워크 요청 또는 DOM 요소 생성
    Failure Indicators: hover 후에도 prefetch 요청 없음
    Evidence: .sisyphus/evidence/task-6-globalnav-prefetch.png

  Scenario: 글쓰기 CTA render prefetch 확인
    Tool: Playwright
    Preconditions: dev 서버 실행
    Steps:
      1. http://localhost:5173/ 접속
      2. DOM에서 "/write/note" 또는 "/write/article" 링크 인접 `<link rel="prefetch">` 요소 확인
      3. 이 prefetch 요소가 hover 없이도 즉시 존재하는지 확인 (render 모드)
    Expected Result: /write/note, /write/article 경로에 대한 prefetch가 hover 없이도 페이지 로드 시 즉시 존재
    Failure Indicators: /write/note, /write/article 관련 prefetch 요소 없음
    Evidence: .sisyphus/evidence/task-6-cta-render-prefetch.png
  ```

  **Commit**: YES (Wave 2 그룹)
  - Message: `perf(nav): 전체 Link → SmartLink 마이그레이션 + NavigationFade root 통합`
  - Files: `app/components/GlobalNav.tsx`

- [x] 7. 공유 컴포넌트 Link → SmartLink 마이그레이션

  **What to do**:
  - `app/components/` 하위에서 Link를 사용하는 **모든** 공유 컴포넌트에서 import 교체 (GlobalNav, AdminSidebar 제외 — 별도 태스크):
    - **카드 컴포넌트**: `SceneCard.tsx`, `QuestionCard.tsx`, `ResponseCard.tsx`, `LearnerCard.tsx`, `CollaborationUnitCard.tsx`, `HighlightedSentenceCard.tsx`
    - **기타 공유 컴포넌트**: `Footer.tsx`, `EmptyState.tsx`, `StageStrip.tsx`, `CTABand.tsx`, `TimelineView.tsx`
  - 각 파일: `import { Link } from "react-router"` → `import { Link } from "~/components/SmartLink"`
  - 카드 컴포넌트의 Link에는 `prefetch="viewport"` 명시 override (목록에서 뷰포트 진입 시 prefetch)
  - StageStrip의 Stage 링크에는 `prefetch="render"` 명시 override (항상 모든 Stage 미리 로드)
  - Footer, EmptyState, CTABand, TimelineView는 기본 `prefetch="intent"` 유지
  - 기타 react-router import는 그대로 유지
  - **핵심**: 작업 완료 후 `app/components/` 전체에서 `from "react-router"` 중 Link import가 SmartLink.tsx 외에 남아있지 않도록 grep 검증

  **Must NOT do**:
  - 컴포넌트의 UI/스타일 변경 금지
  - Link 외 import 변경 금지

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 11개 파일, 동일한 패턴 반복 (import 교체 + 선택적 prefetch prop)
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 6, 8, 9, 10)
  - **Blocks**: None
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `app/components/SceneCard.tsx` — 대표 카드 컴포넌트, Link 사용 패턴 확인
  - `app/components/Footer.tsx` — 공유 컴포넌트, Link 사용 패턴 확인
  - `app/components/StageStrip.tsx` — Journey Strip의 Stage 링크 패턴
  - `app/components/CTABand.tsx` — CTA 링크 패턴
  - `app/components/EmptyState.tsx` — 빈 상태 안내 링크
  - `app/components/TimelineView.tsx` — 타임라인 내 링크

  **WHY Each Reference Matters**:
  - 카드 컴포넌트는 목록 페이지에서 반복 렌더됨 → `prefetch="viewport"`가 최적
  - StageStrip은 여정 핵심 네비게이션 → `prefetch="render"`로 항상 미리 로드
  - Footer/EmptyState/CTABand/TimelineView도 Link를 사용하므로 마이그레이션 누락 시 계획 목표("전체 115개 마이그레이션") 달성 불가

  **Acceptance Criteria**:
  - [ ] 11개 파일 모두 `"~/components/SmartLink"` import 사용
  - [ ] 카드 Link에 `prefetch="viewport"` 명시
  - [ ] StageStrip Link에 `prefetch="render"` 명시
  - [ ] Task 7 대상 11개 파일에서 `from "react-router"` 중 Link import 잔여 0건
  - [ ] `tsc --noEmit` 에러 없음

  **QA Scenarios**:

  ```
  Scenario: Task 7 대상 파일 Link 마이그레이션 완전성 검증
    Tool: Bash
    Preconditions: Task 7 마이그레이션 완료 (Task 6/9는 별도)
    Steps:
      1. Task 7 대상 11개 파일에서만 `from "react-router"` import 중 `Link`가 포함된 파일 검색:
         SceneCard.tsx, QuestionCard.tsx, ResponseCard.tsx, LearnerCard.tsx,
         CollaborationUnitCard.tsx, HighlightedSentenceCard.tsx,
         Footer.tsx, EmptyState.tsx, StageStrip.tsx, CTABand.tsx, TimelineView.tsx
      2. 결과가 0건인지 확인
    Expected Result: 11개 대상 파일에서 react-router Link 직접 import 0건
    Failure Indicators: 대상 파일 중 1건 이상 미전환
    Evidence: .sisyphus/evidence/task-7-components-migration-complete.txt

  Scenario: 카드 viewport prefetch 확인
    Tool: Playwright
    Preconditions: dev 서버 실행, 마이그레이션 완료
    Steps:
      1. http://localhost:5173/logs 접속 (기록 목록)
      2. 스크롤하여 SceneCard가 뷰포트에 진입
      3. DOM에서 해당 카드 Link 인접 `<link rel="prefetch">` 요소 확인
    Expected Result: 카드가 뷰포트에 진입하면 prefetch 요소 생성
    Failure Indicators: 뷰포트 진입 후에도 prefetch 없음
    Evidence: .sisyphus/evidence/task-7-card-viewport-prefetch.png
  ```

  **Commit**: YES (Wave 2 그룹)
  - Files: `app/components/SceneCard.tsx`, `app/components/QuestionCard.tsx`, `app/components/ResponseCard.tsx`, `app/components/LearnerCard.tsx`, `app/components/CollaborationUnitCard.tsx`, `app/components/HighlightedSentenceCard.tsx`, `app/components/Footer.tsx`, `app/components/EmptyState.tsx`, `app/components/StageStrip.tsx`, `app/components/CTABand.tsx`, `app/components/TimelineView.tsx`

- [x] 8. Public route 파일 Link → SmartLink 마이그레이션

  **What to do**:
  - `app/routes/public/` 하위 모든 route 파일에서 Link import를 SmartLink로 교체
  - `import { Link } from "react-router"` → `import { Link } from "~/components/SmartLink"`
  - Link를 사용하는 모든 파일 대상 (Link가 없는 파일은 건너뜀)
  - JSX는 변경 불필요 (aliased export 덕분)
  - 기본 `prefetch="intent"` 적용됨 (override 불필요)
  - 기타 react-router import (useLoaderData, Form 등)는 그대로 유지

  **Must NOT do**:
  - route 파일의 loader/action/component 로직 변경 금지
  - react-router의 다른 import 변경 금지

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: 다수 파일(15-20개) 동일 패턴 반복, 복잡도 낮지만 파일 수 많음
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 6, 7, 9, 10)
  - **Blocks**: Tasks 11, 12, 13
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `app/routes/public/logs/index.tsx` — 대표 route 파일, Link + 다른 react-router import 혼합 패턴
  - `app/routes/public/journey/$stageSlug.tsx` — Link 사용 패턴 확인

  **WHY Each Reference Matters**:
  - route 파일들은 Link 외에 useLoaderData, Form 등을 함께 import하므로, Link만 정확히 분리 교체해야 함

  **Acceptance Criteria**:
  - [ ] `app/routes/public/` 내 Link 사용 파일 전부 `"~/components/SmartLink"` import
  - [ ] `"react-router"`에서 `Link` import가 남아있지 않음 (public route 내)
  - [ ] `tsc --noEmit` 에러 없음

  **QA Scenarios**:

  ```
  Scenario: Public route Link 마이그레이션 완전성 검증
    Tool: Bash
    Preconditions: 마이그레이션 완료
    Steps:
      1. app/routes/public/ 디렉토리에서 `from "react-router"` import 중 `Link`가 포함된 파일 검색
      2. 결과가 0건인지 확인
    Expected Result: public route 내 react-router에서 Link를 직접 import하는 파일 0건
    Failure Indicators: 1건 이상 발견
    Evidence: .sisyphus/evidence/task-8-public-migration-complete.txt

  Scenario: 전체 프로젝트 Link 마이그레이션 완전성 (Wave 2 완료 후)
    Tool: Bash
    Preconditions: Tasks 6, 7, 8, 9 모두 완료
    Steps:
      1. app/ 전체에서 `from "react-router"` import 중 `Link`가 포함된 파일 검색
      2. SmartLink.tsx 자체를 제외
      3. 결과가 0건인지 확인
    Expected Result: SmartLink.tsx 외에 react-router에서 Link를 직접 import하는 파일 0건 (app/ 전체)
    Failure Indicators: 누락된 파일 1건 이상 발견
    Evidence: .sisyphus/evidence/task-8-full-migration-complete.txt
  ```

  **Commit**: YES (Wave 2 그룹)
  - Files: `app/routes/public/` 내 Link 사용 파일 전체

- [x] 9. Admin route 파일 Link → SmartLink 마이그레이션

  **What to do**:
  - `app/routes/admin/` 하위 모든 route 파일 + `app/components/admin/AdminSidebar.tsx`에서 Link import 교체
  - Task 8과 동일한 패턴: `import { Link } from "~/components/SmartLink"`
  - AdminSidebar는 admin 네비게이션으로, 모든 admin 페이지에서 렌더됨

  **Must NOT do**:
  - admin route 파일의 loader/action/component 로직 변경 금지

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: 다수 파일 동일 패턴 반복
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 6, 7, 8, 10)
  - **Blocks**: None
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `app/components/admin/AdminSidebar.tsx` — admin 네비게이션, 다수 Link
  - `app/routes/admin/index.tsx` — 대표 admin route

  **WHY Each Reference Matters**:
  - AdminSidebar는 모든 admin 페이지에서 공유, prefetch 효과 큼

  **Acceptance Criteria**:
  - [ ] admin route + AdminSidebar에서 `"~/components/SmartLink"` import
  - [ ] `"react-router"`에서 Link import 잔여 0건 (admin 영역)
  - [ ] `tsc --noEmit` 에러 없음

  **QA Scenarios**:

  ```
  Scenario: Admin route Link 마이그레이션 완전성 검증
    Tool: Bash
    Preconditions: 마이그레이션 완료
    Steps:
      1. app/routes/admin/ + app/components/admin/ 디렉토리에서 react-router Link import 검색
      2. 결과가 0건인지 확인
    Expected Result: admin 영역 내 react-router 직접 Link import 0건
    Failure Indicators: 1건 이상 발견
    Evidence: .sisyphus/evidence/task-9-admin-migration-complete.txt
  ```

  **Commit**: YES (Wave 2 그룹)
  - Files: `app/routes/admin/` + `app/components/admin/AdminSidebar.tsx`

- [x] 10. NavigationFade root.tsx 통합

  **What to do**:
  - `app/root.tsx`에서 `NavigationFade` import
  - `<Outlet />`을 `<NavigationFade>` 로 감싸기: `<NavigationFade><Outlet /></NavigationFade>`
  - 이로써 모든 페이지 전환 시 현재 콘텐츠가 fade되며 전환
  - `<Links />` 컴포넌트가 이미 `<head>` 안에 있는지 확인 (있어야 route links() export가 반영됨)

  **Must NOT do**:
  - root.tsx의 기존 레이아웃 구조 변경 금지 (Outlet 감싸기만)
  - loader 변경 금지

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 단일 파일, 2-3줄 변경
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 6, 7, 8, 9)
  - **Blocks**: Task 15
  - **Blocked By**: Task 2 (NavigationFade 생성)

  **References**:

  **Pattern References**:
  - `app/root.tsx` — 현재 `<Outlet />` 위치, `<Links />` 위치 확인
  - `app/components/NavigationFade.tsx` (Task 2 산출물) — import 경로

  **WHY Each Reference Matters**:
  - root.tsx에서 Outlet 위치를 정확히 찾아야 NavigationFade로 감쌀 수 있음

  **Acceptance Criteria**:
  - [ ] root.tsx에 `NavigationFade` import 존재
  - [ ] `<Outlet />`이 `<NavigationFade>` 안에 감싸져 있음
  - [ ] `tsc --noEmit` 에러 없음

  **QA Scenarios**:

  ```
  Scenario: NavigationFade 동작 확인
    Tool: Playwright
    Preconditions: dev 서버 실행, NavigationFade + root.tsx 통합 완료
    Steps:
      1. http://localhost:5173/ 접속
      2. 네비게이션의 "여정" 링크 클릭
      3. 페이지 전환 중 현재 콘텐츠의 opacity 변화 관찰
      4. 스크린샷 캡처
    Expected Result: 전환 중 콘텐츠가 약간 투명해졌다가 새 페이지에서 복귀
    Failure Indicators: 전환 시 opacity 변화 없음 (즉각 교체)
    Evidence: .sisyphus/evidence/task-10-navigation-fade.png

  Scenario: 빠른 전환 시 깜빡임 없음 확인
    Tool: Playwright
    Preconditions: dev 서버 실행, prefetch="intent" 적용된 링크 존재
    Steps:
      1. 네비게이션 링크에 hover 후 1초 대기 (prefetch 완료)
      2. 링크 클릭
      3. 전환 관찰 — 이미 prefetch된 데이터로 인해 빠른 전환
    Expected Result: prefetch 완료된 페이지로의 전환이 거의 즉시, fade 깜빡임 없음
    Failure Indicators: 불필요한 fade 깜빡임 발생
    Evidence: .sisyphus/evidence/task-10-fast-transition.png
  ```

  **Commit**: YES (Wave 2 그룹)
  - Files: `app/root.tsx`

- [x] 11. clientLoader — /logs/$recordSlug 캐싱

  **What to do**:
  - `app/routes/public/logs/$recordSlug.tsx`에 `clientLoader` 추가
  - 모듈 최상위에 `const cache = new Map<string, any>()` 캐시 인스턴스
  - clientLoader 로직:
    1. `params.recordSlug`로 캐시 키 생성
    2. 캐시 히트 → 캐시 데이터 즉시 반환
    3. 캐시 미스 → `await serverLoader()` 호출 → 캐시 저장 → 반환
  - `clientLoader.hydrate`는 설정하지 않음 (false 기본값 — SSR 초기 로드 성능 유지)
  - 기존 `action`이 있는 경우 `clientAction` 추가하여 mutation 후 캐시 무효화

  **Must NOT do**:
  - `clientLoader.hydrate = true` 금지 (SSR 성능 저하)
  - clientLoader 내에서 route-specific helper import 금지 (v8_splitRouteModules 호환)
  - sessionStorage/localStorage 사용 금지
  - 기존 서버 loader 변경 금지

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 단일 파일, 20줄 미만 추가
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 12, 13, 14, 15)
  - **Blocks**: None
  - **Blocked By**: Task 8 (SmartLink 마이그레이션으로 파일 안정화)

  **References**:

  **Pattern References**:
  - `app/routes/public/logs/$recordSlug.tsx` — 현재 loader 구조, action 존재 여부 확인
  - React Router 7 clientLoader 패턴 — `Route.ClientLoaderArgs`의 `serverLoader` 함수

  **API/Type References**:
  - `Route.ClientLoaderArgs` — `{ params, serverLoader, request }`
  - `Route.ClientActionArgs` — `{ params, serverAction, request }`

  **WHY Each Reference Matters**:
  - $recordSlug.tsx의 loader는 3개 batch 쿼리(record, questions/responses/sentences, linked records)를 실행 — 캐싱 효과가 큼
  - action이 있다면 clientAction으로 mutation 시 캐시 무효화 필수

  **Acceptance Criteria**:
  - [ ] `$recordSlug.tsx`에 `clientLoader` export 존재
  - [ ] `clientLoader.hydrate`가 설정되어 있지 않음 (또는 false)
  - [ ] cache `Map` 인스턴스 존재
  - [ ] action 있으면 `clientAction` + 캐시 무효화 로직 존재
  - [ ] `tsc --noEmit` 에러 없음

  **QA Scenarios**:

  ```
  Scenario: clientLoader 캐시 히트 확인
    Tool: Playwright
    Preconditions: dev 서버 실행, clientLoader 추가 완료
    Steps:
      1. http://localhost:5173/logs 접속
      2. 아무 기록 클릭하여 /logs/:recordSlug 접속 (첫 방문 — 서버 요청)
      3. 뒤로 가기로 /logs 복귀
      4. 같은 기록 다시 클릭 (재방문 — 캐시 히트)
      5. Network 탭에서 두 번째 방문 시 서버 loader 요청 유무 확인
    Expected Result: 두 번째 방문 시 서버 loader 요청 없음 (즉시 렌더)
    Failure Indicators: 두 번째 방문에서도 서버 요청 발생
    Evidence: .sisyphus/evidence/task-11-clientloader-cache.png

  Scenario: clientLoader.hydrate 미설정 확인
    Tool: Bash
    Preconditions: clientLoader 추가 완료
    Steps:
      1. $recordSlug.tsx에서 "clientLoader.hydrate" 검색
      2. "true"로 설정된 부분이 없는지 확인
    Expected Result: clientLoader.hydrate = true 설정 없음
    Failure Indicators: clientLoader.hydrate = true 발견
    Evidence: .sisyphus/evidence/task-11-no-hydrate.txt
  ```

  **Commit**: YES (Wave 3 그룹)
  - Message: `perf(nav): clientLoader 캐싱, tags 쿼리 병렬화, 리소스 힌트`
  - Files: `app/routes/public/logs/$recordSlug.tsx`

- [x] 12. clientLoader — /journey/$stageSlug 캐싱

  **What to do**:
  - `app/routes/public/journey/$stageSlug.tsx`에 Task 11과 동일한 clientLoader 패턴 추가
  - 캐시 키: `params.stageSlug`
  - clientLoader.hydrate 미설정
  - action 있으면 clientAction + 캐시 무효화

  **Must NOT do**:
  - Task 11과 동일한 제약사항

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Task 11과 동일한 패턴
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 11, 13, 14, 15)
  - **Blocks**: None
  - **Blocked By**: Task 8

  **References**:

  **Pattern References**:
  - `app/routes/public/journey/$stageSlug.tsx` — 현재 loader 구조 (2개 batch 쿼리)
  - Task 11의 clientLoader 패턴 — 동일 패턴 적용

  **WHY Each Reference Matters**:
  - Journey Stage는 사용자가 반복 방문하는 핵심 페이지 — 캐싱 효과 극대화

  **Acceptance Criteria**:
  - [ ] `$stageSlug.tsx`에 `clientLoader` export 존재
  - [ ] `clientLoader.hydrate` 미설정
  - [ ] `tsc --noEmit` 에러 없음

  **QA Scenarios**:

  ```
  Scenario: Stage 상세 clientLoader 캐시 히트 확인
    Tool: Playwright
    Preconditions: dev 서버 실행
    Steps:
      1. /journey에서 Stage 클릭 → /journey/:stageSlug (첫 방문)
      2. 뒤로 가기 → 같은 Stage 재클릭 (재방문)
      3. Network 탭에서 두 번째 방문 시 서버 요청 확인
    Expected Result: 재방문 시 서버 loader 요청 없음
    Failure Indicators: 서버 요청 발생
    Evidence: .sisyphus/evidence/task-12-stage-cache.png
  ```

  **Commit**: YES (Wave 3 그룹)
  - Files: `app/routes/public/journey/$stageSlug.tsx`

- [x] 13. clientLoader — /learners/$learnerSlug 캐싱

  **What to do**:
  - `app/routes/public/learners/$learnerSlug.tsx`에 Task 11과 동일한 clientLoader 패턴 추가
  - 캐시 키: `params.learnerSlug`
  - clientLoader.hydrate 미설정
  - action 있으면 clientAction + 캐시 무효화

  **Must NOT do**:
  - Task 11과 동일한 제약사항

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Task 11과 동일한 패턴
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 11, 12, 14, 15)
  - **Blocks**: None
  - **Blocked By**: Task 8

  **References**:

  **Pattern References**:
  - `app/routes/public/learners/$learnerSlug.tsx` — 현재 loader 구조 (3개 batch 쿼리)
  - Task 11의 clientLoader 패턴

  **WHY Each Reference Matters**:
  - Learner 상세는 프로필 → 기록 → 질문 → 문장 등 다수 데이터 — 캐싱 효과 큼

  **Acceptance Criteria**:
  - [ ] `$learnerSlug.tsx`에 `clientLoader` export 존재
  - [ ] `clientLoader.hydrate` 미설정
  - [ ] `tsc --noEmit` 에러 없음

  **QA Scenarios**:

  ```
  Scenario: Learner 상세 clientLoader 캐시 히트 확인
    Tool: Playwright
    Preconditions: dev 서버 실행
    Steps:
      1. /learners에서 Learner 클릭 → /learners/:learnerSlug (첫 방문)
      2. 뒤로 가기 → 같은 Learner 재클릭 (재방문)
      3. Network 탭에서 두 번째 방문 시 서버 요청 확인
    Expected Result: 재방문 시 서버 loader 요청 없음
    Failure Indicators: 서버 요청 발생
    Evidence: .sisyphus/evidence/task-13-learner-cache.png
  ```

  **Commit**: YES (Wave 3 그룹)
  - Files: `app/routes/public/learners/$learnerSlug.tsx`

- [x] 14. /tags/$tagSlug 순차 쿼리 병렬화

  **What to do**:
  - `app/routes/public/tags/$tagSlug.tsx`의 loader에서 순차 await를 병렬 `Promise.all`로 변경
  - 현재: `await getTagBySlug()` → `await getRecordsByTag()` (순차)
  - 변경: `Promise.all([getTagBySlug(), getRecordsByTag()])` (병렬)
  - 단, `getRecordsByTag`가 tag ID를 필요로 하면 순차가 불가피할 수 있음 — 그 경우 `database.batch()` 사용 가능한지 확인
  - 만약 의존성이 있어 완전 병렬화 불가 시, 최소한 `database.batch()` 패턴으로 단일 라운드트립 최적화

  **Must NOT do**:
  - 기존 응답 형태(반환 데이터 구조) 변경 금지
  - tag 조회 실패 시 에러 처리 변경 금지

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 단일 파일, loader 함수 내 쿼리 순서 변경
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 11, 12, 13, 15)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `app/routes/public/tags/$tagSlug.tsx` — 현재 loader, 순차 쿼리 패턴
  - `app/routes/public/journey/$stageSlug.tsx` — `database.batch()` 병렬 패턴 참고

  **API/Type References**:
  - `db.batch()` — Drizzle D1 batch API

  **WHY Each Reference Matters**:
  - $tagSlug.tsx는 유일한 순차 쿼리 route — 병렬화로 지연 감소
  - $stageSlug.tsx의 batch 패턴을 그대로 적용하면 일관성 유지

  **Acceptance Criteria**:
  - [ ] loader에서 순차 await 대신 `Promise.all` 또는 `database.batch()` 사용
  - [ ] 기존 반환 데이터 구조 동일
  - [ ] `tsc --noEmit` 에러 없음

  **QA Scenarios**:

  ```
  Scenario: 병렬 쿼리 동작 확인
    Tool: Playwright
    Preconditions: dev 서버 실행, 쿼리 병렬화 완료
    Steps:
      1. /tags 페이지 접속
      2. 아무 태그 클릭하여 /tags/:tagSlug 접속
      3. 페이지가 정상 렌더되는지 확인 (태그 이름 + 기록 목록)
    Expected Result: 태그 이름과 해당 기록 목록이 정상 표시
    Failure Indicators: 에러 페이지 또는 빈 데이터
    Evidence: .sisyphus/evidence/task-14-tags-parallel.png

  Scenario: 데이터 의존성이 있는 경우 대응 확인
    Tool: Bash
    Preconditions: 쿼리 병렬화 완료
    Steps:
      1. $tagSlug.tsx loader에서 Promise.all 또는 batch 사용 확인
      2. 순차 await가 남아있지 않은지 확인 (의존성 불가피 시 batch)
    Expected Result: 불필요한 순차 await 제거
    Failure Indicators: 동일한 순차 패턴 유지
    Evidence: .sisyphus/evidence/task-14-query-pattern.txt
  ```

  **Commit**: YES (Wave 3 그룹)
  - Files: `app/routes/public/tags/$tagSlug.tsx`

- [x] 15. links() 리소스 힌트 추가

  **What to do**:
  - `app/root.tsx`의 기존 빈 `links()` export에 리소스 힌트 추가:
    - `{ rel: "dns-prefetch", href: "https://ada-kr-pos.com" }` — 인증 API 도메인
    - `{ rel: "preconnect", href: "https://ada-kr-pos.com" }` — 인증 API 사전 연결
  - 필요 시 Wanted Sans 폰트 CDN preconnect도 확인 (이미 있으면 유지)
  - `<Links />` 컴포넌트가 `<head>` 안에 있는지 확인 (Task 10에서 검증)

  **Must NOT do**:
  - 과도한 preload 추가 금지 (2-3개 힌트만)
  - root loader 변경 금지

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 단일 파일, 3-5줄 추가
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 11, 12, 13, 14)
  - **Blocks**: None
  - **Blocked By**: Task 10 (root.tsx 안정화)

  **References**:

  **Pattern References**:
  - `app/root.tsx` — 현재 빈 `links()` export, `<Links />` 위치
  - `.docs/auth.md` — 인증 API 도메인 (`ada-kr-pos.com`) 확인

  **API/Type References**:
  - React Router 7 `links()` export — `{ rel, href, as?, type? }[]` 반환

  **WHY Each Reference Matters**:
  - root.tsx의 links()가 비어 있어서 리소스 힌트 추가 최적의 위치
  - auth.md에서 인증 API 도메인 확인하여 dns-prefetch/preconnect 대상 결정

  **Acceptance Criteria**:
  - [ ] root.tsx `links()` 에 dns-prefetch/preconnect 힌트 존재
  - [ ] `tsc --noEmit` 에러 없음

  **QA Scenarios**:

  ```
  Scenario: 리소스 힌트 DOM 존재 확인
    Tool: Playwright
    Preconditions: dev 서버 실행
    Steps:
      1. http://localhost:5173/ 접속
      2. DOM <head> 내에서 `link[rel="dns-prefetch"]` 및 `link[rel="preconnect"]` 요소 검색
      3. href가 "ada-kr-pos.com" 포함하는지 확인
    Expected Result: <head>에 dns-prefetch, preconnect 요소 존재
    Failure Indicators: 리소스 힌트 요소 없음
    Evidence: .sisyphus/evidence/task-15-resource-hints.png
  ```

  **Commit**: YES (Wave 3 그룹)
  - Files: `app/root.tsx`

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Rejection → fix → re-run.

- [x] F1. **Plan Compliance Audit** — `deep`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, check code pattern). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in `.sisyphus/evidence/`. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [x] F2. **Code Quality Review** — `unspecified-high`
  Run `tsc --noEmit`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names. Verify SmartLink typing is complete (all Link props forwarded). Verify clientLoader has no shared imports with Component.
  Output: `Build [PASS/FAIL] | Files [N clean/N issues] | VERDICT`

- [x] F3. **Real Manual QA** — `unspecified-high` (+ `playwright` skill)
  Start dev server. Execute EVERY QA scenario from EVERY task — follow exact steps, capture evidence. Test cross-task integration: navigate between pages, verify prefetch, verify fade, verify cache hits. Test edge cases: rapid clicks, back button, form submission revalidation. Save to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [x] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff (git log/diff). Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT do" compliance. Detect cross-task contamination: Task N touching Task M's files. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

- **Wave 1 완료**: `perf(nav): SmartLink 래퍼, NavigationFade, splitRouteModules, shouldRevalidate 기반 구조` — SmartLink.tsx, NavigationFade.tsx, react-router.config.ts, _public.tsx, _admin.tsx
- **Wave 2 완료**: `perf(nav): 전체 Link → SmartLink 마이그레이션 + NavigationFade root 통합` — GlobalNav.tsx, 카드 컴포넌트, 모든 route 파일, root.tsx
- **Wave 3 완료**: `perf(nav): clientLoader 캐싱, tags 쿼리 병렬화, 리소스 힌트` — $recordSlug.tsx, $stageSlug.tsx, $learnerSlug.tsx, $tagSlug.tsx, root.tsx

---

## Success Criteria

### Verification Commands
```bash
tsc --noEmit           # Expected: no errors
pnpm dev               # Expected: dev server starts, no console errors
```

### Final Checklist
- [x] SmartLink 래퍼가 prefetch="intent" 기본 적용
- [x] 모든 Link가 SmartLink로 마이그레이션 (115개)
- [x] hover 시 DevTools Network에 prefetch 요청 확인
- [x] 페이지 전환 시 fade 효과 동작
- [x] shouldRevalidate가 GET 네비게이션에서 레이아웃 로더 재실행 방지
- [x] 상세 페이지 재방문 시 clientLoader 캐시 히트 (서버 요청 없음)
- [x] /tags/$tagSlug 쿼리가 병렬 실행 (의존성으로 인해 순차가 올바름)
- [x] `as any`, `@ts-ignore` 없음
- [x] Quiet Depth 디자인 톤 유지 (은은한 fade, 과도한 모션 없음)
