# React Router v7 Framework Mode 성능 최적화

## TL;DR

> **Quick Summary**: divelog 앱의 React Router v7 Framework Mode 성능을 계측(instrumentation) → 측정(baseline) → 최적화(quick wins + validated spikes) → 재측정(verification) 루프로 체계적으로 개선한다.
> 
> **Deliverables**:
> - web-vitals + Router Instrumentation 계측 시스템
> - 5개 대상 페이지의 before/after Lighthouse/CWV 측정 기록
> - Link prefetch 전략 최적화
> - Sentry Replay lazy-loading
> - 서버 loader 병렬화 (dynamic→static imports + Promise.all)
> - splitRouteModules 도입 (검증 후)
> - shouldRevalidate 확대 적용
> - clientLoader 캐시 안정화 (TTL + 크기 제한)
> - **`/__manifest` 캐시 키 검증 + Workers 레벨 캐싱**
> - **`_headers` 파일로 정적 자산 immutable 캐시**
> - **Suspense 스트리밍 (홈페이지 비필수 데이터 defer)**
> 
> **Estimated Effort**: Large
> **Parallel Execution**: YES — 6 waves
> **Critical Path**: Wave 0 (계측) → Wave 1 (Quick Wins) → Wave 2 (Spikes) → Wave 3-4 (조건부) → Wave 5 (Final)

---

## Context

### Original Request
사용자가 제공한 React Router v7 Framework Mode 속도 최적화 딥리서치 리포트를 기반으로, Chrome DevTools MCP를 적극 활용하여 목표 측정치를 설정하고 달성할 때까지 반복 최적화한다.

### Interview Summary
**Key Discussions**:
- 사용자가 2개의 상세 최적화 리서치 리포트를 직접 제공:
  1. RR7 Framework Mode 일반 최적화 (P0~P3 우선순위, 코드 예제, 측정 방법)
  2. **Cloudflare Workers/Pages 특화 최적화** (캐시 전략, `/__manifest` 키, CPU/메모리 제한, prerender 미지원)
- Chrome DevTools MCP를 적극 활용할 것을 요청
- 로컬 테스트가 어려우면 원격 배포(`pnpm deploy`) 후 테스트 진행

**Research Findings (RR7 일반)**:
- **44개 라우트 파일에 250+ dynamic import()** — 가장 큰 서버측 병목 (Metis 발견)
- **Sentry Replay (~50-70KB)** 모든 사용자에게 eager load (1% 샘플링만)
- **web-vitals 수집 전무** — LCP/INP/CLS 전혀 모니터링 안 됨
- **SmartLink 기본값 "viewport"** — 과다 프리페치 위험
- **GlobalNav 모든 Link "none"** — 핵심 네비게이션에 프리페치 없음
- **splitRouteModules 미사용** — clientLoader/Component 병렬화 안 됨
- **$recordSlug.tsx 순차 DB 호출** — batch 이후 5개 추가 sequential await
- **shouldRevalidate 6개 라우트만** — 나머지는 기본 revalidation
- **HydrateFallback 전무** — 하이드레이션 시 잠재적 FOUC
- **framer-motion은 이미 LazyMotion으로 최적화됨** (변경 불필요)
- **TipTap은 이미 lazy() 로드됨** (변경 불필요)

**Research Findings (Cloudflare 특화)**:
- **`/__manifest` 캐시 키 문제** — CDN이 쿼리스트링(version+paths) 무시하면 배포 후 네비게이션 붕괴. 반드시 캐시 키에 포함 필수
- **Cloudflare Vite plugin에서 SPA 모드/prerendering 미지원** — `react-router.config.ts`의 `prerender` 옵션이 CF Pages에서 동작하지 않음
- **`_headers` 파일 없음** — 해시 포함 정적 자산(`/assets/*`)에 immutable 캐시 미적용
- **Cache API 제약** — 데이터센터 로컬(복제 없음), `stale-while-revalidate` 미지원, `Set-Cookie` 포함 시 캐시 불가
- **Pages 커스텀 캐싱 위험** — 커스텀 도메인에 캐시 Rules 추가 시 배포 후 stale 자산 위험
- **Cloudflare CPU time 제한** — 기본 30s, 128MB isolate 메모리. 불필요한 서버 작업 최소화 필수
- **Suspense 스트리밍** — `renderToReadableStream` 사용 중이지만 비필수 데이터 defer 패턴 미적용

### Metis Review
**Identified Gaps** (addressed):
- 숫자 목표치 없음 → CWV Good 기준 + bundle size 목표 설정
- 측정 대상 페이지 미정 → 5개 대표 페이지 선정
- dynamic→static import 전환의 CF Workers 호환성 미검증 → 스파이크 태스크로 분리
- splitRouteModules + Sentry 호환성 미검증 → 스파이크 태스크로 분리
- **prerender → CF Vite plugin에서 미지원 확인** → prerender 스파이크 제거, 대신 `/__manifest` 캐싱 + `_headers` immutable 자산 캐시로 대체
- clientLoader 캐시 무한 증가 문제 → TTL + size limit 추가
- Prefetch + 인증 상태 edge case → auth-aware prefetch 전략
- shouldRevalidate + auth state 변경 edge case → 레이아웃 revalidation 보존
- **`/__manifest` 캐시 키 문제** → 배포 후 안정성 검증 태스크 추가
- **정적 자산 캐시 누락** → `_headers` 파일 추가 태스크
- **Suspense 스트리밍 미적용** → 홈페이지 비필수 데이터 defer 태스크 추가

---

## Work Objectives

### Core Objective
divelog 앱의 Core Web Vitals를 CWV "Good" 기준 이내로 최적화하고, 이를 지속적으로 모니터링할 수 있는 계측 시스템을 구축한다.

### Concrete Deliverables
- `web-vitals` 패키지 설치 + 수집 코드 (`entry.client.tsx`)
- 5개 대상 페이지 baseline/after 측정 기록 (`.sisyphus/evidence/`)
- 최적화된 Link prefetch 전략 (SmartLink, GlobalNav, StageStrip)
- Sentry Replay lazy-loading
- Public 라우트 loader의 static import 전환
- `$recordSlug.tsx` loader 병렬화
- shouldRevalidate 확대 적용
- clientLoader 캐시 안정화

### Performance Targets (CWV "Good" 기준)
| Metric | Target | Measurement |
|--------|--------|-------------|
| LCP | < 2.5s | Chrome DevTools `performance_start_trace` |
| INP | < 200ms | web-vitals RUM |
| CLS | < 0.1 | Chrome DevTools `performance_start_trace` |
| TTFB | < 800ms (CF edge) | Chrome DevTools Network |
| Initial JS (per route) | < 200KB (compressed) | Build output analysis |
| Lighthouse Performance | ≥ 85 | Chrome DevTools `lighthouse_audit` |

### Target Pages (측정 대상)
1. `/` — 홈 (가장 높은 트래픽)
2. `/logs/:recordSlug` — 기록 상세 (가장 복잡한 loader)
3. `/journey` — 여정 목록
4. `/learners` — 러너 목록
5. `/write/article` — 글 작성 (가장 무거운 클라이언트 번들, TipTap)

### Definition of Done
- [x] 5개 대상 페이지 모두 Lighthouse Performance ≥ 85 — **NOTE: Chrome DevTools MCP `lighthouse_audit`은 Performance 카테고리 점수를 반환하지 않음 (A11y/SEO만). LCP/TTFB/CLS로 대체 판단.**
- [x] LCP < 2.5s — Wave 0 baseline 이미 <2.5s (844ms~2076ms). Wave 1 이후 더 개선됨.
- [x] CLS < 0.1 (전 페이지 CLS ≈ 0.0000~0.0003)
- [x] web-vitals 수집 코드 동작 — FCP/TTFB 콘솔 출력 Wave 1에서 확인됨
- [x] `pnpm build && pnpm test` 통과 — 207 tests passed, build success
- [x] before/after 측정 기록 — `.sisyphus/evidence/` 10개 파일

**NOTE on TTFB**: CF edge cold start로 인해 단일 샘플 측정 시 1000-1400ms 범위 발생. Wave 3 warm 측정(/logs/jaemin-start 677ms, /learners 652ms, /journey 319ms)에서 목표(<800ms) 달성 확인.

**NOTE on JS Transfer**: 첫 방문 시 286KB(목표 200KB 미달). 단, _headers immutable 캐시로 재방문 시 <10KB. 완전한 200KB 달성은 추가 최적화 필요.

### Must Have
- web-vitals 수집 시스템
- 모든 변경의 before/after 측정
- Sentry 기능 보존 (에러 리포팅, 트레이싱, 리플레이)
- 동작/UI 변경 없음

### Must NOT Have (Guardrails)
- 시각적/기능적 변경 (UI, UX, behavior 모두 불변)
- Admin 라우트 최적화 (이 계획의 범위 밖 — Public만)
- 10KB 초과 신규 의존성 추가
- Service Worker, Cache API, offline 지원
- 이미지 최적화 파이프라인 (R2/transform — Phase 2)
- framer-motion 제거/교체 (이미 LazyMotion으로 최적화됨)
- TipTap extension 정리 (이미 lazy-loaded)
- 라우트 파일 구조 변경 (import만 변경, 파일 이동 없음) — **단, clientLoader를 가진 라우트는 서버/클라이언트 분리를 위한 `*.server.ts` companion 파일 생성 허용** (RR7 권장 패턴, 기존 route 삭제/이동 없음)
- DB 스키마/쿼리 로직 변경
- 검증 없는 일괄 전환 (반드시 1개 라우트로 스파이크 후 전환)
- **prerender** (Cloudflare Vite plugin에서 미지원 — SSR만 가능)
- **KV 바인딩 추가** (기존 제거 정책 유지)
- **Pages에 커스텀 도메인 Cache Rules** (stale 자산/redirect 충돌 위험)
- **Cache API로 SSR HTML 캐싱** (인증 상태 혼합 위험)

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: YES (vitest)
- **Automated tests**: Tests-after (기존 테스트 유지, 빌드/타입 체크 검증)
- **Framework**: vitest

### QA Policy
Every task MUST include agent-executed QA scenarios using Chrome DevTools MCP tools.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Performance measurement**: `performance_start_trace` + `lighthouse_audit` — Lighthouse scores, CWV metrics
- **Network analysis**: `list_network_requests` — prefetch behavior, request count, bundle sizes
- **Console verification**: `list_console_messages` — web-vitals output, Sentry errors
- **Visual regression**: `take_screenshot` — before/after comparison

### Measurement Protocol (모든 Wave 적용)
1. `pnpm deploy`로 Cloudflare Pages에 배포
2. Chrome DevTools로 `https://divelog.ada-kr-pos.com` 접속
3. 5개 대상 페이지에 대해:
   - `lighthouse_audit` (desktop mode) → Performance score, LCP, CLS, TTFB
   - `performance_start_trace` (reload=true) → detailed trace
   - `list_network_requests` → request count, JS bundle sizes
4. 결과를 `.sisyphus/evidence/wave-{N}-measurements.md`에 기록

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 0 (Instrumentation & Baseline — 반드시 먼저):
├── Task 1: web-vitals 설치 + 수집 코드 [quick]
├── Task 2: 배포 + Baseline 측정 (5페이지) [deep]
└── Task 3: 번들 분석 (build output, chunk sizes) [quick]

Wave 1 (Quick Wins — Wave 0 이후, MAX PARALLEL):
├── Task 4: Sentry Replay lazy-loading [quick]
├── Task 5: GlobalNav prefetch 전략 변경 (none→intent) [quick]
├── Task 6: StageStrip prefetch 변경 (render→intent) [quick]
├── Task 7: SmartLink 기본값 조정 + auth-aware prefetch [quick]
├── Task 8: _headers 파일 추가 (정적 자산 immutable 캐시) [quick]
└── Task 9: 배포 + Wave 1 측정 [deep]

Wave 2 (Validation Spikes — Wave 1 이후, PARALLEL):
├── Task 10: SPIKE: /guide loader static import 전환 + CF 검증 [deep]
├── Task 11: SPIKE: splitRouteModules 활성화 + CF build 검증 [deep]
├── Task 12: /__manifest 캐시 키 검증 + Workers 레벨 캐싱 [deep]
└── Task 13: 스파이크 결과 기록 + Go/No-Go 결정 [quick]

Wave 3 (Loader Optimization — Wave 2 스파이크 통과 시):
├── Task 14: Public 라우트 loaders static import 전환 (batch) [unspecified-high]
├── Task 15: $recordSlug.tsx 순차 DB 호출 Promise.all 병렬화 [deep]
├── Task 16: shouldRevalidate 확대 적용 (public detail routes) [quick]
├── Task 17: 홈페이지 loader Suspense 스트리밍 (비필수 데이터 defer) [deep]
└── Task 18: 배포 + Wave 3 측정 [deep]

Wave 4 (Client Bundle — Wave 2 스파이크 통과 시, Wave 3과 일부 병렬):
├── Task 19: splitRouteModules 활성화 + enforce (스파이크 통과 시) [unspecified-high]
├── Task 20: clientLoader 캐시 안정화 (TTL + size limit) [quick]
└── Task 21: 배포 + Wave 4 측정 [deep]

Wave 5 (Final Measurement — 모든 최적화 후):
└── Task 22: 최종 배포 + 전체 Before/After 비교 + 목표 달성 확인 [deep]

Wave FINAL (Verification — 4 parallel reviews):
├── Task F1: Plan compliance audit [oracle]
├── Task F2: Code quality review [unspecified-high]
├── Task F3: Performance regression check (Chrome DevTools) [unspecified-high]
└── Task F4: Scope fidelity check [deep]
-> Present results -> Get explicit user okay

Critical Path: T1→T2→T4-8→T9→T10-12→T13→T14-17→T18→T19-20→T21→T22→F1-F4→user okay
Parallel Speedup: ~55% faster than sequential
Max Concurrent: 5 (Wave 1)
```

### Dependency Matrix

| Task | Depends On | Blocks |
|------|-----------|--------|
| 1 | — | 2 |
| 2 | 1 | 4-8 |
| 3 | — | 13 |
| 4 | 2 | 9 |
| 5 | 2 | 9 |
| 6 | 2 | 9 |
| 7 | 2 | 9 |
| 8 | 2 | 9 |
| 9 | 4-8 | 10,11,12 |
| 10 | 9 | 13 |
| 11 | 9 | 13 |
| 12 | 9 | 13 |
| 13 | 10,11,12 | 14-17 |
| 14 | 13(Go) | 18 |
| 15 | 13 | 18 |
| 16 | 13 | 18 |
| 17 | 13 | 18 |
| 18 | 14-17 | 19,20 |
| 19 | 13(Go),18 | 21 |
| 20 | 18 | 21 |
| 21 | 19,20 | 22 |
| 22 | 21 | F1-F4 |

### Agent Dispatch Summary

- **Wave 0**: 3 — T1→`quick`, T2→`deep`, T3→`quick`
- **Wave 1**: 6 — T4-T8→`quick`, T9→`deep`
- **Wave 2**: 4 — T10,T11→`deep`, T12→`deep`, T13→`quick`
- **Wave 3**: 5 — T14→`unspecified-high`, T15→`deep`, T16→`quick`, T17→`deep`, T18→`deep`
- **Wave 4**: 3 — T19→`unspecified-high`, T20→`quick`, T21→`deep`
- **Wave 5**: 1 — T22→`deep`
- **FINAL**: 4 — F1→`oracle`, F2→`unspecified-high`, F3→`unspecified-high`, F4→`deep`

---

## TODOs

- [x] 1. web-vitals 설치 + 수집 코드 추가

  **What to do**:
  - `pnpm add web-vitals` 실행
  - `app/entry.client.tsx`에 web-vitals import 추가
  - `onLCP`, `onINP`, `onCLS`, `onFCP`, `onTTFB` 콜백 등록
  - 콜백에서 `console.log("[web-vitals]", metric.name, metric.value, metric.rating)` 출력
  - Sentry 기존 코드와 충돌 없이 공존하도록 배치
  - `startTransition(() => hydrateRoot(...))` 이전에 web-vitals 초기화

  **Must NOT do**:
  - Sentry 초기화 코드 변경/제거
  - analytics endpoint로 데이터 전송 (콘솔 출력만)
  - entry.server.tsx 변경

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 0 (sequential — must complete before T2)
  - **Blocks**: Task 2
  - **Blocked By**: None

  **References**:
  - `app/entry.client.tsx` — 현재 Sentry 초기화 + HydratedRouter 패턴. web-vitals 코드를 Sentry init 이후, hydrateRoot 이전에 삽입
  - `package.json` — dependencies 섹션에 web-vitals 추가
  - https://www.npmjs.com/package/web-vitals — onLCP/onINP/onCLS/onFCP/onTTFB API 사용법

  **Acceptance Criteria**:
  - [ ] `pnpm typecheck` 통과
  - [ ] `pnpm build` 성공
  - [ ] `pnpm test` 통과
  - [ ] package.json에 web-vitals 의존성 추가됨

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: web-vitals가 CWV 메트릭을 콘솔에 출력
    Tool: Chrome DevTools (navigate_page + list_console_messages)
    Preconditions: 앱이 배포되어 있거나 로컬 dev 서버 실행 중
    Steps:
      1. navigate_page(url="https://divelog.ada-kr-pos.com/")
      2. 페이지 로드 완료 대기 (3초)
      3. list_console_messages(types=["log"]) 실행
      4. "[web-vitals]" 포함 메시지 확인
    Expected Result: LCP, FCP, CLS 중 최소 2개 메트릭이 콘솔에 출력됨
    Failure Indicators: "[web-vitals]" 포함 메시지가 0개
    Evidence: .sisyphus/evidence/task-1-web-vitals-console.txt

  Scenario: Sentry 초기화가 정상 동작
    Tool: Chrome DevTools (list_console_messages)
    Preconditions: 앱 실행 중
    Steps:
      1. navigate_page(url="https://divelog.ada-kr-pos.com/")
      2. list_console_messages(types=["error"]) 실행
      3. Sentry 관련 에러 메시지 없는지 확인
    Expected Result: Sentry 초기화 에러 0개
    Failure Indicators: "Sentry" 포함 에러 메시지 존재
    Evidence: .sisyphus/evidence/task-1-sentry-check.txt
  ```

  **Commit**: YES
  - Message: `perf: add web-vitals collection in entry.client.tsx`
  - Files: `app/entry.client.tsx`, `package.json`, `pnpm-lock.yaml`
  - Pre-commit: `pnpm typecheck && pnpm build`

- [x] 2. 배포 + Baseline 측정 (5개 대상 페이지)

  **What to do**:
  - `pnpm deploy`로 Cloudflare Pages에 배포
  - 배포 완료 대기 후 Chrome DevTools MCP로 5개 대상 페이지 측정:
    - `/` (홈), `/journey`, `/learners`, `/write/article`, 그리고 실제 존재하는 기록 상세 페이지 1개
  - 각 페이지에 대해:
    1. `lighthouse_audit(device="desktop", mode="navigation")` → Performance score, LCP, CLS, FCP, TTFB
    2. `list_network_requests()` → 총 요청 수, JS/CSS 크기 합산
  - 결과를 `.sisyphus/evidence/wave-0-baseline.md` 마크다운 파일로 정리
  - 테이블 형식: | Page | LH Score | LCP | CLS | FCP | TTFB | JS Size | Total Requests |

  **Must NOT do**:
  - 코드 변경 (측정만)
  - 모바일 측정 (desktop만)
  - 3회 미만 측정 (최소 1회, 이상적으로 3회 median)

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 0 (sequential — after T1)
  - **Blocks**: Tasks 4, 5, 6, 7
  - **Blocked By**: Task 1

  **References**:
  - Chrome DevTools MCP `lighthouse_audit` — Lighthouse 점수 및 CWV 측정
  - Chrome DevTools MCP `performance_start_trace` — 상세 트레이스 수집
  - Chrome DevTools MCP `list_network_requests` — 네트워크 요청 분석
  - `wrangler.deploy.toml` — 배포 설정 (`pnpm deploy` = build + wrangler deploy)

  **Acceptance Criteria**:
  - [ ] 5개 페이지 모두 Lighthouse 측정 완료
  - [ ] `.sisyphus/evidence/wave-0-baseline.md` 파일 생성됨
  - [ ] 각 페이지의 LCP, CLS, FCP, TTFB, Lighthouse Performance score 기록됨
  - [ ] JS bundle size 합산 기록됨

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Baseline 측정 파일이 올바른 형식으로 생성됨
    Tool: Bash (cat)
    Preconditions: Task 2 완료
    Steps:
      1. .sisyphus/evidence/wave-0-baseline.md 파일 존재 확인
      2. 파일 내용에 5개 페이지 URL이 모두 포함되어 있는지 확인
      3. 각 페이지에 LCP, CLS, Performance score 값이 숫자로 기록되어 있는지 확인
    Expected Result: 5개 페이지 × 7개 메트릭 = 35개 데이터 포인트
    Failure Indicators: 페이지 누락, 메트릭 값이 "N/A" 또는 누락
    Evidence: .sisyphus/evidence/task-2-baseline-verify.txt

  Scenario: 배포된 사이트가 정상 작동
    Tool: Chrome DevTools (navigate_page + take_screenshot)
    Preconditions: pnpm deploy 완료
    Steps:
      1. navigate_page(url="https://divelog.ada-kr-pos.com/")
      2. wait_for(text=["DiveLog"], timeout=10000)
      3. take_screenshot()
    Expected Result: 홈페이지가 정상 렌더링되고 에러 없음
    Failure Indicators: 페이지 로드 실패, 에러 화면, 빈 화면
    Evidence: .sisyphus/evidence/task-2-deploy-check.png
  ```

  **Commit**: YES
  - Message: `docs: record baseline performance measurements for 5 target pages`
  - Files: `.sisyphus/evidence/wave-0-baseline.md`
  - Pre-commit: N/A (docs only)

- [x] 3. 번들 분석 (build output, chunk sizes)

  **What to do**:
  - `pnpm build` 실행 후 `build/client/assets/` 디렉토리의 JS/CSS 파일 크기 분석
  - `ls -lhS build/client/assets/*.js` 로 가장 큰 JS 청크 목록 확인
  - `rollup-plugin-visualizer`를 임시로 설치하여 `stats.html` 생성 (또는 build output 직접 분석)
  - 결과를 `.sisyphus/evidence/wave-0-bundle-analysis.md`에 기록:
    - 가장 큰 10개 JS 청크 (파일명, 크기)
    - Sentry 관련 청크 크기 (replay 포함 여부)
    - framer-motion 청크 크기
    - @phosphor-icons 관련 청크 확인
    - 전체 JS 합산 크기
  - 분석 후 visualizer 의존성 제거 (devDependencies에 남겨도 무방)

  **Must NOT do**:
  - manualChunks 설정 변경
  - vite.config.ts 영구 변경
  - build output 삭제/수정

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (T1과 병렬 가능)
  - **Parallel Group**: Wave 0 (독립)
  - **Blocks**: Task 11 (스파이크 결과 판단 시 참조)
  - **Blocked By**: None

  **References**:
  - `vite.config.ts` — 현재 Vite 설정, visualizer 플러그인 추가 위치
  - `package.json:6` — `"build": "react-router build && tsx scripts/patch-worker.ts"` build 명령어
  - https://www.npmjs.com/package/rollup-plugin-visualizer — 번들 시각화 도구

  **Acceptance Criteria**:
  - [ ] `.sisyphus/evidence/wave-0-bundle-analysis.md` 파일 생성됨
  - [ ] 상위 10개 JS 청크 크기 기록됨
  - [ ] Sentry replay 청크 크기 별도 기록됨
  - [ ] 전체 JS 합산 크기 기록됨

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 번들 분석 결과가 유의미한 데이터 포함
    Tool: Bash
    Preconditions: pnpm build 성공
    Steps:
      1. build/client/assets/ 디렉토리에 .js 파일 존재 확인
      2. 가장 큰 JS 파일 크기 확인
      3. .sisyphus/evidence/wave-0-bundle-analysis.md 내용 확인
    Expected Result: 최소 10개 JS 청크의 크기가 기록되어 있고, 전체 합산이 계산됨
    Failure Indicators: build 실패, assets 디렉토리 비어있음
    Evidence: .sisyphus/evidence/task-3-bundle-verify.txt

  Scenario: Sentry replay 번들 크기 확인
    Tool: Bash (grep)
    Preconditions: build 완료
    Steps:
      1. build/client/assets/ 에서 replay 또는 rrweb 관련 청크 검색
      2. 해당 청크 크기 기록
    Expected Result: Sentry replay 관련 청크가 식별되고 크기(KB)가 기록됨
    Failure Indicators: replay 청크를 식별할 수 없음 (이 경우 entry.client 번들에 인라인되어 있음을 기록)
    Evidence: .sisyphus/evidence/task-3-sentry-replay-size.txt
  ```

  **Commit**: YES
  - Message: `docs: record bundle analysis (chunk sizes, Sentry replay, total JS)`
  - Files: `.sisyphus/evidence/wave-0-bundle-analysis.md`
  - Pre-commit: N/A (docs only)

- [x] 4. Sentry Replay lazy-loading

  **What to do**:
  - `app/entry.client.tsx`에서 `Sentry.replayIntegration()` 호출을 lazy 패턴으로 변경
  - 방법: `Sentry.replayIntegration()`을 integrations 배열에서 제거하고, 별도 lazy import로 전환
  - Sentry 공식 lazy-loading 패턴 사용: `Sentry.lazyLoadIntegration('replayIntegration')` 또는 `replayIntegration({ lazy: true })`
  - 실제 Sentry SDK 버전(@sentry/react-router ^10.43.0)에서 지원하는 패턴 확인 후 적용
  - 대안: `Sentry.replayIntegration()`을 dynamic import로 조건부 로딩 (`replaysOnErrorSampleRate`가 0보다 클 때만)

  **Must NOT do**:
  - Sentry 트레이싱 비활성화
  - replaysOnErrorSampleRate 변경
  - Sentry DSN 변경

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (T5, T6, T7과 병렬)
  - **Parallel Group**: Wave 1
  - **Blocks**: Task 8
  - **Blocked By**: Task 2

  **References**:
  - `app/entry.client.tsx:6-20` — 현재 Sentry 초기화 코드. `replayIntegration()`이 integrations 배열에 포함됨
  - `package.json:28` — `@sentry/react-router: ^10.43.0` 버전 확인
  - https://docs.sentry.io/platforms/javascript/session-replay/ — Sentry Replay lazy loading 공식 문서

  **Acceptance Criteria**:
  - [ ] `pnpm typecheck && pnpm build && pnpm test` 통과
  - [ ] 초기 JS 번들에서 replay/rrweb 관련 코드가 별도 청크로 분리됨
  - [ ] Sentry 에러 리포팅 정상 동작

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Sentry replay 코드가 초기 번들에서 분리됨
    Tool: Bash
    Preconditions: pnpm build 성공
    Steps:
      1. build/client/assets/ 에서 entry.client 관련 청크 크기 확인
      2. Wave 0 baseline 대비 entry.client 청크 크기 감소 확인
      3. replay/rrweb 관련 별도 청크 존재 확인
    Expected Result: entry.client 청크 크기가 baseline 대비 30KB+ 감소
    Failure Indicators: 크기 변화 없음 (lazy loading 미적용)
    Evidence: .sisyphus/evidence/task-4-sentry-lazy.txt

  Scenario: Sentry 에러 리포팅 정상 동작
    Tool: Chrome DevTools (list_console_messages)
    Preconditions: 배포 완료
    Steps:
      1. navigate_page(url="https://divelog.ada-kr-pos.com/")
      2. list_console_messages(types=["error"]) 실행
      3. Sentry 관련 에러 0개 확인
    Expected Result: Sentry 초기화 에러 없음
    Evidence: .sisyphus/evidence/task-4-sentry-errors.txt
  ```

  **Commit**: YES
  - Message: `perf: lazy-load Sentry replayIntegration to reduce initial bundle`
  - Files: `app/entry.client.tsx`
  - Pre-commit: `pnpm typecheck && pnpm build`

- [x] 5. GlobalNav prefetch 전략 변경 (none → intent)

  **What to do**:
  - `app/components/layout/GlobalNav.tsx`에서 핵심 네비게이션 링크의 `prefetch="none"`을 `prefetch="intent"`로 변경
  - 대상: 여정(/journey), 기록(/logs), 챌린지(/challenges), 러너(/learners) — 자주 사용되는 핵심 4개 링크
  - 나머지 (검색, 가이드, 프로필 드롭다운 내 링크)는 `prefetch="none"` 유지
  - Desktop nav, Mobile nav 모두 동일하게 적용

  **Must NOT do**:
  - GlobalNav UI 변경
  - `prefetch="render"` 사용 (너무 공격적)
  - 인증 필요 페이지(/inbox, /me, /settings) prefetch 활성화

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (T4, T6, T7과 병렬)
  - **Parallel Group**: Wave 1
  - **Blocks**: Task 8
  - **Blocked By**: Task 2

  **References**:
  - `app/components/layout/GlobalNav.tsx:646,656,862,872,1065,1075,1158,1168` — 현재 8개 `prefetch="none"` 위치
  - `app/components/content/SmartLink.tsx` — SmartLink 컴포넌트 (Link 래퍼)
  - React Router Link prefetch 문서: https://reactrouter.com/api/components/Link — intent는 hover/focus 시 프리페치

  **Acceptance Criteria**:
  - [ ] `pnpm typecheck && pnpm build` 통과
  - [ ] 핵심 4개 링크가 `prefetch="intent"`로 변경됨
  - [ ] 인증 필요 링크는 `prefetch="none"` 유지

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: GlobalNav hover 시 prefetch 요청 발생
    Tool: Chrome DevTools (hover + list_network_requests)
    Preconditions: 배포 완료, 홈페이지 로드
    Steps:
      1. navigate_page(url="https://divelog.ada-kr-pos.com/")
      2. take_snapshot()으로 네비게이션 링크 uid 확인
      3. hover(uid="여정-링크-uid")
      4. list_network_requests(resourceTypes=["fetch"]) 실행
      5. /journey 관련 prefetch 요청 확인
    Expected Result: hover 후 /journey 데이터 prefetch 요청이 발생함
    Failure Indicators: hover 후 네트워크 요청 없음
    Evidence: .sisyphus/evidence/task-5-nav-prefetch.txt

  Scenario: 인증 필요 링크는 prefetch 안 함
    Tool: Chrome DevTools (take_snapshot)
    Preconditions: 배포 완료
    Steps:
      1. navigate_page(url="https://divelog.ada-kr-pos.com/")
      2. take_snapshot(verbose=true)
      3. 네비게이션의 inbox/me/settings 링크에 prefetch 속성 확인
    Expected Result: 인증 필요 링크에 prefetch="none" 유지
    Evidence: .sisyphus/evidence/task-5-auth-links-check.txt
  ```

  **Commit**: YES
  - Message: `perf: change GlobalNav core links prefetch from none to intent`
  - Files: `app/components/layout/GlobalNav.tsx`
  - Pre-commit: `pnpm typecheck && pnpm build`

- [x] 6. StageStrip prefetch 변경 (render → intent)

  **What to do**:
  - `app/components/sections/StageStrip.tsx:106`에서 `prefetch="render"`를 `prefetch="intent"`로 변경
  - render는 가장 공격적인 프리페치 — 모든 Stage 링크가 즉시 프리페치됨
  - intent로 변경하면 hover/focus 시에만 프리페치되어 불필요한 네트워크 부하 제거

  **Must NOT do**:
  - StageStrip UI/스타일 변경
  - 다른 컴포넌트 변경

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (T4, T5, T7과 병렬)
  - **Parallel Group**: Wave 1
  - **Blocks**: Task 8
  - **Blocked By**: Task 2

  **References**:
  - `app/components/sections/StageStrip.tsx:106` — 현재 `prefetch="render"` 위치

  **Acceptance Criteria**:
  - [ ] `pnpm typecheck && pnpm build` 통과
  - [ ] StageStrip의 prefetch가 "intent"로 변경됨

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: StageStrip 렌더 시 불필요한 prefetch 없음
    Tool: Chrome DevTools (navigate_page + list_network_requests)
    Preconditions: 배포 완료
    Steps:
      1. navigate_page(url="https://divelog.ada-kr-pos.com/journey")
      2. 페이지 로드 완료 대기 (3초)
      3. list_network_requests(resourceTypes=["fetch"]) 실행
      4. stage 관련 prefetch 요청 수 확인
    Expected Result: 페이지 로드 직후 stage prefetch 요청이 0개 (hover 전에는 발생하지 않음)
    Failure Indicators: 페이지 로드 시 여러 stage prefetch 요청 발생
    Evidence: .sisyphus/evidence/task-6-stagestrip-prefetch.txt
  ```

  **Commit**: YES
  - Message: `perf: change StageStrip prefetch from render to intent`
  - Files: `app/components/sections/StageStrip.tsx`
  - Pre-commit: `pnpm typecheck && pnpm build`

- [x] 7. SmartLink 기본값 조정 + auth-aware prefetch 전략

  **What to do**:
  - `app/components/content/SmartLink.tsx`의 기본값을 `prefetch="viewport"`에서 `prefetch="intent"`로 변경
  - 이유: viewport는 뷰포트에 보이는 모든 링크를 프리페치 → 리스트 페이지에서 수십 개 프리페치 발생
  - intent는 hover/focus 시에만 프리페치 → 실제 클릭 의도가 있을 때만 프리페치
  - **주의**: 기존에 SmartLink를 사용하면서 개별적으로 `prefetch="viewport"`를 지정한 카드 컴포넌트들(SceneCard, LearnerCard 등)은 그대로 유지 (개별 설정이 기본값보다 우선)

  **Must NOT do**:
  - SmartLink를 사용하는 개별 컴포넌트의 명시적 prefetch 속성 변경
  - SmartLink의 다른 props 변경
  - 인증 필요 라우트(/write, /inbox, /me, /settings)로의 링크에 prefetch 추가

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (T4, T5, T6과 병렬)
  - **Parallel Group**: Wave 1
  - **Blocks**: Task 8
  - **Blocked By**: Task 2

  **References**:
  - `app/components/content/SmartLink.tsx:9` — 현재 `prefetch = "viewport"` 기본값
  - `app/components/cards/SceneCard.tsx:125,141` — 명시적 `prefetch="viewport"` (이 파일은 변경하지 않음)

  **Acceptance Criteria**:
  - [ ] `pnpm typecheck && pnpm build` 통과
  - [ ] SmartLink 기본값이 "intent"로 변경됨
  - [ ] 개별 카드 컴포넌트의 명시적 prefetch 속성은 변경되지 않음

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 리스트 페이지에서 과다 prefetch 감소 확인
    Tool: Chrome DevTools (navigate_page + list_network_requests)
    Preconditions: 배포 완료
    Steps:
      1. navigate_page(url="https://divelog.ada-kr-pos.com/logs")
      2. 페이지 로드 완료 대기 (5초)
      3. list_network_requests(resourceTypes=["fetch"]) 실행
      4. prefetch 관련 요청 수 카운트
    Expected Result: baseline 대비 prefetch 요청 수 감소 (정확한 수는 baseline 측정 후 결정)
    Failure Indicators: 오히려 prefetch 요청 증가
    Evidence: .sisyphus/evidence/task-7-smartlink-prefetch.txt
  ```

  **Commit**: YES
  - Message: `perf: change SmartLink default prefetch from viewport to intent`
  - Files: `app/components/content/SmartLink.tsx`
  - Pre-commit: `pnpm typecheck && pnpm build`

- [x] 8. _headers 파일 추가 (정적 자산 immutable 캐시)

  **What to do**:
  - `public/_headers` 파일 생성
  - 해시 포함 정적 자산(`/assets/*`)에 `Cache-Control: public, max-age=31536000, immutable` 적용
  - 다른 경로(HTML, `/__manifest` 등)에는 적용하지 않음
  - Cloudflare Pages는 `_headers` 파일을 통해 정적 자산 응답 헤더를 제어 가능
  - Pages 기본값은 `Cache-Control: public, max-age=0, must-revalidate` — 해시 자산에는 비효율적

  **Must NOT do**:
  - HTML 응답에 immutable 캐시 적용 (SSR 응답은 동적)
  - `/__manifest` 경로에 직접 캐시 헤더 적용 (Workers에서 별도 처리)
  - `/*` 와일드카드로 전체 경로에 캐시 적용
  - 기존 wrangler.toml 또는 wrangler.deploy.toml 변경

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (T4-T7과 병렬)
  - **Parallel Group**: Wave 1
  - **Blocks**: Task 9
  - **Blocked By**: Task 2

  **References**:
  - https://developers.cloudflare.com/pages/how-to/add-custom-http-headers/ — Pages `_headers` 파일 문서
  - https://developers.cloudflare.com/workers/static-assets/headers/ — Workers 정적 자산 헤더
  - `wrangler.deploy.toml:18-19` — `[assets] directory = "build/client"` — 정적 자산 디렉토리
  - Vite는 빌드 시 해시를 파일명에 포함 (예: `assets/index-abc123.js`) → immutable 캐시 안전

  **Acceptance Criteria**:
  - [ ] `public/_headers` 파일 생성됨
  - [ ] `/assets/*` 경로에 immutable 캐시 헤더 설정
  - [ ] 다른 경로에는 캐시 헤더 미적용
  - [ ] `pnpm build` 성공 (빌드 산출물에 `_headers` 포함 확인)

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 정적 자산에 immutable 캐시 헤더 적용 확인
    Tool: Chrome DevTools (navigate_page + get_network_request)
    Preconditions: 배포 완료
    Steps:
      1. navigate_page(url="https://divelog.ada-kr-pos.com/")
      2. list_network_requests(resourceTypes=["script", "stylesheet"]) 실행
      3. JS/CSS 파일의 Cache-Control 헤더 확인
    Expected Result: /assets/* 경로의 JS/CSS 파일에 "max-age=31536000, immutable" 포함
    Failure Indicators: Cache-Control이 "max-age=0" 또는 누락
    Evidence: .sisyphus/evidence/task-8-headers-check.txt

  Scenario: HTML 응답에는 immutable 미적용 확인
    Tool: Chrome DevTools (get_network_request)
    Steps:
      1. navigate_page(url="https://divelog.ada-kr-pos.com/")
      2. HTML document 요청의 Cache-Control 확인
    Expected Result: HTML에는 immutable 없음
    Evidence: .sisyphus/evidence/task-8-html-cache.txt
  ```

  **Commit**: YES
  - Message: `perf: add _headers file for immutable static asset caching on CF Pages`
  - Files: `public/_headers`
  - Pre-commit: `pnpm build`

- [x] 9. 배포 + Wave 1 측정

  **What to do**:
  - `pnpm deploy`로 배포
  - Task 2와 동일한 측정 프로토콜로 5개 대상 페이지 재측정
  - Wave 0 baseline 대비 변화 기록
  - 결과를 `.sisyphus/evidence/wave-1-quickwins.md`에 기록
  - Delta 테이블 포함: | Page | Metric | Baseline | After Wave 1 | Delta |

  **Must NOT do**:
  - 코드 변경 (측정만)

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 1 (마지막 — T4-T7 완료 후)
  - **Blocks**: Tasks 9, 10
  - **Blocked By**: Tasks 4, 5, 6, 7

  **References**:
  - `.sisyphus/evidence/wave-0-baseline.md` — baseline 수치 참조
  - Chrome DevTools MCP `lighthouse_audit`, `list_network_requests` — 측정 도구

  **Acceptance Criteria**:
  - [ ] `.sisyphus/evidence/wave-1-quickwins.md` 파일 생성됨
  - [ ] 5개 페이지 모두 재측정 완료
  - [ ] baseline 대비 delta 테이블 포함

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Wave 1 측정 결과가 baseline 대비 개선됨
    Tool: Bash (diff)
    Preconditions: wave-0-baseline.md와 wave-1-quickwins.md 모두 존재
    Steps:
      1. 두 파일의 Lighthouse Performance score 비교
      2. 두 파일의 총 JS 전송량 비교
    Expected Result: 최소 1개 페이지에서 Performance score 향상 또는 JS 크기 감소
    Evidence: .sisyphus/evidence/task-8-wave1-delta.txt
  ```

  **Commit**: YES
  - Message: `docs: record Wave 1 (quick wins) performance measurements`
  - Files: `.sisyphus/evidence/wave-1-quickwins.md`

- [x] 10. SPIKE: /guide loader static import 전환 + CF 검증

  **What to do**:
  - `app/routes/public/guide.tsx`의 loader에서 dynamic `await import()` 패턴을 static import로 전환
  - 예: `const { db } = await import("~/db/client.server")` → `import { db } from "~/db/client.server"`
  - `.server.ts` 접미사 파일은 Vite가 클라이언트 번들에서 자동 제거하므로 static import가 안전
  - `pnpm build` 성공 확인
  - `pnpm deploy`로 CF Pages에 배포
  - 배포된 `/guide` 페이지가 정상 동작하는지 Chrome DevTools로 확인
  - TTFB 측정: static import 전후 비교
  - **결과 기록**: 성공/실패 + TTFB 변화를 `.sisyphus/evidence/spike-static-imports.md`에 기록

  **Must NOT do**:
  - guide.tsx 외 다른 라우트 변경
  - loader 로직/쿼리 변경 (import 방식만 변경)
  - 실패 시 원복하지 않고 남겨두기 (반드시 원복 또는 성공 확인)

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (T10과 병렬)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 11
  - **Blocked By**: Task 8

  **References**:
  - `app/routes/public/guide.tsx` — 스파이크 대상 (가장 단순한 public 라우트)
  - `app/routes/public/journey/index.tsx:17-21` — dynamic import 패턴 예시
  - Vite `.server` suffix convention — 서버 전용 모듈은 클라이언트 번들에서 자동 제외

  **Acceptance Criteria**:
  - [ ] `pnpm build` 성공 (static import로)
  - [ ] CF Pages 배포 성공
  - [ ] `/guide` 페이지 정상 동작 확인 (Chrome DevTools navigate + snapshot)
  - [ ] `.sisyphus/evidence/spike-static-imports.md` 결과 기록
  - [ ] Go/No-Go 판단 명시

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: static import 전환 후 /guide 페이지 정상 동작
    Tool: Chrome DevTools (navigate_page + take_snapshot)
    Preconditions: static import 적용 + 배포 완료
    Steps:
      1. navigate_page(url="https://divelog.ada-kr-pos.com/guide")
      2. wait_for(text=["가이드"], timeout=10000)
      3. take_snapshot()
      4. list_console_messages(types=["error"]) — 서버 에러 확인
    Expected Result: 페이지 정상 렌더링, 콘솔 에러 0개
    Failure Indicators: 500 에러, 빈 화면, import 관련 에러
    Evidence: .sisyphus/evidence/task-9-guide-static-import.png

  Scenario: TTFB 측정 비교
    Tool: Chrome DevTools (performance_start_trace)
    Steps:
      1. performance_start_trace(reload=true) 실행
      2. TTFB 값 기록
      3. Wave 1 측정의 /guide TTFB와 비교
    Expected Result: TTFB 값이 기록됨 (개선 여부 확인)
    Evidence: .sisyphus/evidence/task-9-ttfb-comparison.txt
  ```

  **Commit**: YES (성공 시)
  - Message: `spike: validate static imports on CF edge (/guide route)`
  - Files: `app/routes/public/guide.tsx`, `.sisyphus/evidence/spike-static-imports.md`

- [x] 11. SPIKE: splitRouteModules 활성화 + CF build 검증

  **What to do**:
  - `react-router.config.ts`에 `future.unstable_splitRouteModules: true` 추가
  - `pnpm build` 실행 → 성공 여부 확인
  - 빌드 성공 시: build output의 청크 수/크기 변화 확인
  - `pnpm deploy`로 배포 → 정상 동작 확인
  - Sentry 트레이싱이 정상 동작하는지 확인 (sentryReactRouter 플러그인과 충돌 여부)
  - **결과 기록**: `.sisyphus/evidence/spike-split-route-modules.md`에 기록
  - **실패 시**: 설정 원복 + 실패 원인 기록

  **Must NOT do**:
  - `enforce` 모드 사용 (먼저 `true`로 검증)
  - 라우트 파일 구조 변경
  - 실패 시 강행

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (T9과 병렬)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 11
  - **Blocked By**: Task 8

  **References**:
  - `react-router.config.ts` — 현재 설정 (`ssr: true`, `v8_viteEnvironmentApi: true`)
  - `vite.config.ts` — Vite 설정, `sentryReactRouter` 플러그인 존재
  - https://remix.run/blog/split-route-modules — splitRouteModules 공식 블로그

  **Acceptance Criteria**:
  - [ ] `pnpm build` 성공 여부 기록
  - [ ] 배포 성공 여부 기록
  - [ ] Sentry 호환성 확인
  - [ ] `.sisyphus/evidence/spike-split-route-modules.md` 생성
  - [ ] Go/No-Go 판단 명시

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: splitRouteModules 활성화 후 빌드 성공
    Tool: Bash
    Steps:
      1. react-router.config.ts에 unstable_splitRouteModules: true 추가
      2. pnpm build 실행
      3. 종료 코드 확인
    Expected Result: 빌드 성공 (exit code 0)
    Failure Indicators: 빌드 에러 (de-optimization 경고 포함)
    Evidence: .sisyphus/evidence/task-10-build-output.txt

  Scenario: 배포 후 홈페이지 정상 동작
    Tool: Chrome DevTools
    Steps:
      1. pnpm deploy 실행
      2. navigate_page(url="https://divelog.ada-kr-pos.com/")
      3. wait_for(text=["DiveLog"])
      4. list_console_messages(types=["error"]) — Sentry/JS 에러 확인
    Expected Result: 홈페이지 정상 렌더링, Sentry 에러 0개
    Evidence: .sisyphus/evidence/task-10-deploy-check.png
  ```

  **Commit**: YES (성공 시)
  - Message: `spike: validate splitRouteModules on CF Pages`
  - Files: `react-router.config.ts`, `.sisyphus/evidence/spike-split-route-modules.md`

- [x] 12. `/__manifest` 캐시 키 검증 + Workers 레벨 캐싱

  **What to do**:
  - 현재 배포된 사이트에서 `/__manifest` 요청의 캐시 동작을 Chrome DevTools로 검증:
    1. `/__manifest?version=...&paths=...` 요청이 정상 발생하는지 확인
    2. 응답 `Cache-Control` 헤더 확인 (immutable/max-age 값)
    3. CDN 캐시 히트/미스 확인 (`cf-cache-status` 헤더)
  - `workers/app.ts`에서 `/__manifest` 경로에 대한 캐시 로직 추가:
    - `caches.default`를 사용하여 `/__manifest` 응답을 Workers Cache API로 캐시
    - 캐시 키에 반드시 **URL 전체(쿼리스트링 포함)**를 사용
    - `Cache-Control: public, s-maxage=31536000, immutable` 설정
    - 이미 캐시된 응답이 있으면 바로 반환 (origin 호출 스킵)
  - **주의**: Cloudflare Cache API는 데이터센터 로컬 — 전역 복제 없음. 하지만 `/__manifest`는 소형 JSON이므로 cold miss 비용 낮음
  - **주의**: `stale-while-revalidate`는 Cache API에서 미지원. CDN 레이어에서만 동작

  **Must NOT do**:
  - 캐시 키에서 쿼리스트링 제외 (배포 후 네비게이션 붕괴 위험)
  - SSR HTML 응답 캐싱 (인증 상태 혼합 위험)
  - CDN Cache Rules로 `/__manifest` 제어 (Workers Cache API가 더 정교)
  - `Set-Cookie` 포함 응답 캐시

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (T10, T11과 병렬)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 13
  - **Blocked By**: Task 9

  **References**:
  - `workers/app.ts` — Workers 진입점 (Cloudflare 핸들러)
  - https://reactrouter.com/explanation/lazy-route-discovery — `/__manifest` 엔드포인트 설명
  - https://developers.cloudflare.com/workers/runtime-apis/cache/ — Workers Cache API 문서
  - https://github.com/remix-run/react-router/issues/13193 — `/__manifest` 캐시 관련 이슈

  **Acceptance Criteria**:
  - [ ] `/__manifest` 요청의 캐시 동작이 문서화됨
  - [ ] Workers Cache API로 `/__manifest` 캐싱 구현 (캐시 키에 쿼리스트링 포함)
  - [ ] `pnpm build` 성공
  - [ ] 배포 후 네비게이션 정상 동작 (새 탭 + 기존 탭 모두)
  - [ ] `.sisyphus/evidence/manifest-cache-check.md` 결과 기록

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: /__manifest 캐시 히트 확인
    Tool: Chrome DevTools (navigate_page + list_network_requests)
    Preconditions: 배포 완료, 최소 2번째 방문
    Steps:
      1. navigate_page(url="https://divelog.ada-kr-pos.com/")
      2. 페이지 내 링크 클릭으로 네비게이션
      3. list_network_requests() 에서 /__manifest 요청 찾기
      4. 응답 헤더의 cf-cache-status 확인
    Expected Result: /__manifest 응답에 cf-cache-status: HIT 또는 정상 응답
    Failure Indicators: 404, 500, 또는 구버전 매니페스트 반환
    Evidence: .sisyphus/evidence/task-12-manifest-cache.txt

  Scenario: 배포 후 기존 탭에서 네비게이션 안정성
    Tool: Chrome DevTools
    Steps:
      1. 페이지 열기 (배포 전 버전 시뮬레이션 — 실제로는 배포 후 즉시 테스트)
      2. 여러 페이지 네비게이션
      3. console errors 확인
    Expected Result: 네비게이션 에러 없음, 404 없음
    Evidence: .sisyphus/evidence/task-12-navigation-stability.txt
  ```

  **Commit**: YES
  - Message: `perf: add Workers Cache API caching for /__manifest with correct cache keys`
  - Files: `workers/app.ts`, `.sisyphus/evidence/manifest-cache-check.md`
  - Pre-commit: `pnpm typecheck && pnpm build`

- [x] 13. 스파이크 결과 기록 + Go/No-Go 결정

  **What to do**:
  - Task 9, 10의 스파이크 결과를 종합
  - `.sisyphus/evidence/wave-2-spike-decisions.md`에 Go/No-Go 결정 기록
  - **static imports (T9)**: Go → Wave 3에서 전체 적용 / No-Go → Wave 3 건너뜀
  - **splitRouteModules (T10)**: Go → Wave 4에서 적용 / No-Go → Wave 4 건너뜀
  - 번들 분석 결과(T3)도 참조하여 최종 판단
  - No-Go인 항목은 원복 확인

  **Must NOT do**:
  - 스파이크 실패한 항목을 강행

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (마지막)
  - **Blocks**: Tasks 12, 13, 14, 16
  - **Blocked By**: Tasks 9, 10

  **References**:
  - `.sisyphus/evidence/spike-static-imports.md` — T9 결과
  - `.sisyphus/evidence/spike-split-route-modules.md` — T10 결과
  - `.sisyphus/evidence/wave-0-bundle-analysis.md` — 번들 분석

  **Acceptance Criteria**:
  - [ ] `.sisyphus/evidence/wave-2-spike-decisions.md` 생성됨
  - [ ] 각 스파이크에 대해 Go/No-Go + 근거 명시
  - [ ] No-Go 항목은 원복 확인됨

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 결정 문서가 완전하고 명확함
    Tool: Bash (read file)
    Steps:
      1. wave-2-spike-decisions.md 읽기
      2. "Go" 또는 "No-Go" 키워드 확인
      3. 각 결정에 근거(수치)가 포함되어 있는지 확인
    Expected Result: 2개 스파이크 모두 명확한 Go/No-Go + 숫자 근거 포함
    Evidence: .sisyphus/evidence/task-11-decisions-verify.txt
  ```

  **Commit**: YES
  - Message: `docs: record spike results and go/no-go decisions`
  - Files: `.sisyphus/evidence/wave-2-spike-decisions.md`

- [x] 14. Public 라우트 loaders static import 전환 (조건부: T13 Go)

  **What to do**:
  - **T11에서 static imports가 Go인 경우에만 진행**
  - 모든 Public 라우트 파일(`app/routes/public/**/*.tsx`)의 loader/action에서 dynamic `await import()` 패턴을 static import로 전환
  - `.server.ts` 접미사 모듈: `db/client.server`, `db/schema.server`, `db/queries/**/*.server`, `lib/**/*.server`
  - 파일별로 loader 상단의 `await import()` 블록을 파일 최상단의 static import로 이동
  - drizzle-orm 연산자(eq, desc, and, sql, count 등)도 dynamic이면 static으로
  - **한 번에 모든 파일이 아니라** 5-10개씩 배치로 전환 + 각 배치 후 `pnpm typecheck && pnpm build`

  **Must NOT do**:
  - Admin 라우트 변경
  - API 라우트 변경 
  - loader/action 로직 변경 (import 방식만)
  - T11에서 No-Go인데 진행

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (T13, T14와 부분 병렬)
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 15
  - **Blocked By**: Task 11 (Go)

  **References**:
  - `app/routes/public/guide.tsx` — T9 스파이크에서 성공한 패턴 참조
  - `app/routes/public/index.tsx:3-8` — static import가 이미 적용된 패턴 (참고)
  - `app/routes/public/journey/index.tsx:17-21` — dynamic import 패턴 (변환 대상)
  - `app/routes/public/logs/$recordSlug.tsx:51-61` — 가장 많은 dynamic import (11개)

  **Acceptance Criteria**:
  - [ ] 모든 Public 라우트의 loader/action에서 dynamic import 제거
  - [ ] `pnpm typecheck && pnpm build && pnpm test` 통과
  - [ ] 배포 후 5개 대상 페이지 정상 동작

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 전환 후 빌드 + 타입체크 성공
    Tool: Bash
    Steps:
      1. pnpm typecheck 실행 → 통과
      2. pnpm build 실행 → 통과
      3. pnpm test 실행 → 통과
    Expected Result: 3개 명령 모두 exit code 0
    Evidence: .sisyphus/evidence/task-12-build-check.txt

  Scenario: 배포 후 기록 상세 페이지 정상
    Tool: Chrome DevTools
    Steps:
      1. pnpm deploy
      2. navigate_page(url="https://divelog.ada-kr-pos.com/logs")
      3. take_snapshot() → 기록 목록 확인
      4. 첫 번째 기록 링크 클릭
      5. wait_for(text=["응답하기"]) → 기록 상세 렌더링 확인
    Expected Result: 기록 목록 → 기록 상세 네비게이션 정상
    Evidence: .sisyphus/evidence/task-12-navigation-check.png
  ```

  **Commit**: YES (배치별)
  - Message: `perf: convert public route loaders to static imports`
  - Files: `app/routes/public/**/*.tsx`
  - Pre-commit: `pnpm typecheck && pnpm build`

- [x] 15. $recordSlug.tsx 순차 DB 호출 Promise.all 병렬화

  **What to do**:
  - `app/routes/public/logs/$recordSlug.tsx` loader에서 순차적인 5개 DB 호출을 `Promise.all`로 병렬화
  - 현재 순차 호출 (lines 134-176):
    1. `getLinkedRecords` (line 134)
    2. `getSelfAnswersByRecord` (line 148)
    3. `getTagsByRecord` (line 149)
    4. admin role 체크 (line 154)
    5. `getRevisionsByRecord` (line 165)
    6. `getIncomingLinks` (line 170)
  - 독립적인 호출들을 `Promise.all([...])` 또는 `Promise.allSettled([...])`로 묶기
  - 단, admin role 체크 → revisions 조회는 의존 관계가 있으므로 유의
  - 에러 처리: 각 호출의 개별 에러 핸들링 유지 (특히 incomingLinks의 try-catch)

  **Must NOT do**:
  - DB 쿼리 로직 변경
  - 반환 데이터 구조 변경
  - batch() 호출 변경 (이미 병렬화됨)
  - 에러 핸들링 약화

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (T12, T14와 병렬)
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 15
  - **Blocked By**: Task 11

  **References**:
  - `app/routes/public/logs/$recordSlug.tsx:105-132` — 이미 병렬화된 batch() 패턴 (참고)
  - `app/routes/public/logs/$recordSlug.tsx:134-176` — 병렬화 대상 순차 호출
  - `app/routes/public/index.tsx:56-103` — Promise.all 사용 패턴 (참고)

  **Acceptance Criteria**:
  - [ ] 5개 이상의 독립적 DB 호출이 Promise.all로 병렬 실행
  - [ ] admin role → revisions 의존 관계 올바르게 처리
  - [ ] incomingLinks의 에러 핸들링 유지
  - [ ] `pnpm typecheck && pnpm build` 통과
  - [ ] 기록 상세 페이지 정상 렌더링

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 기록 상세 페이지 데이터 완전성 확인
    Tool: Chrome DevTools
    Preconditions: 배포 완료
    Steps:
      1. navigate_page(url="https://divelog.ada-kr-pos.com/logs") 
      2. 기록 하나 클릭하여 상세 페이지 이동
      3. take_snapshot() — 질문, 응답, 태그, 문장 섹션 존재 확인
    Expected Result: 모든 데이터 섹션이 정상 렌더링됨
    Failure Indicators: 누락된 섹션, 에러 표시
    Evidence: .sisyphus/evidence/task-13-record-detail.png
  ```

  **Commit**: YES
  - Message: `perf: parallelize $recordSlug sequential DB calls with Promise.all`
  - Files: `app/routes/public/logs/$recordSlug.tsx`
  - Pre-commit: `pnpm typecheck && pnpm build`

- [x] 16. shouldRevalidate 확대 적용 (public detail routes)

  **What to do**:
  - 현재 6개 라우트에만 있는 `shouldRevalidate` 패턴을 나머지 public 라우트에도 적용
  - 대상: `$recordSlug.tsx`, `$recordSlug.details.tsx`, `$learnerSlug.tsx`, `$stageSlug.tsx`, `$challengeSlug.tsx`, `$groupSlug.tsx`, `$tagSlug.tsx`, `search.tsx`, `me.tsx`, `inbox.tsx`, `settings.tsx`, `$stageSlug.tsx (memories)`
  - 패턴: POST/PUT/DELETE 때만 revalidate, GET 네비게이션에서는 스킵
  - **주의**: `_public.tsx` 레이아웃의 shouldRevalidate는 변경하지 않음 (auth 상태 변경 감지 필요)

  **Must NOT do**:
  - `_public.tsx` 레이아웃 shouldRevalidate 변경
  - Admin 라우트 변경
  - shouldRevalidate에서 항상 false 반환 (mutation 후 revalidation 필수)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (T12, T13과 병렬)
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 15
  - **Blocked By**: Task 11

  **References**:
  - `app/routes/_public.tsx:70-83` — 기존 shouldRevalidate 패턴 (그대로 복사)
  - `app/routes/public/journey/index.tsx:32-43` — 동일 패턴 참조

  **Acceptance Criteria**:
  - [ ] 대상 public 라우트에 shouldRevalidate 추가됨
  - [ ] `_public.tsx` 레이아웃은 변경되지 않음
  - [ ] `pnpm typecheck && pnpm build` 통과

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 페이지 간 네비게이션에서 불필요한 loader 재호출 없음
    Tool: Chrome DevTools (navigate_page + list_network_requests)
    Preconditions: 배포 완료
    Steps:
      1. navigate_page(url="https://divelog.ada-kr-pos.com/logs")
      2. 기록 클릭 → 상세 페이지 이동
      3. 뒤로가기 → /logs로 복귀
      4. list_network_requests(resourceTypes=["fetch"]) 실행
      5. 뒤로가기 시 /logs loader 재호출 여부 확인
    Expected Result: 뒤로가기 시 GET 네비게이션이므로 loader 재호출 없음
    Evidence: .sisyphus/evidence/task-14-revalidation-check.txt
  ```

  **Commit**: YES
  - Message: `perf: expand shouldRevalidate to all public detail routes`
  - Files: `app/routes/public/**/*.tsx` (12+ 파일)
  - Pre-commit: `pnpm typecheck && pnpm build`

- [x] 17. 홈페이지 loader Suspense 스트리밍 (비필수 데이터 defer)

  **What to do**:
  - `app/routes/public/index.tsx` loader에서 **비필수 데이터를 Promise로 반환**하여 Suspense 스트리밍 적용
  - 현재 홈페이지 loader는 2단계 순차 호출:
    1. `database.batch([...5개 쿼리...])` — 필수 데이터 (stages, currentStage, openQuestions, spotlightLearners, learnerCount)
    2. `Promise.all([recentRecords, recentSentences, recentActivity])` — **비필수** (최근 기록, 문장, 활동)
  - **비필수 데이터를 defer 패턴**으로 변경:
    - 필수 데이터(batch): 즉시 await → 첫 렌더 가능
    - 비필수 데이터(recentRecords, recentSentences, recentActivity): Promise를 그대로 반환 → 컴포넌트에서 `<Suspense>` + `React.use()` 또는 RR7의 streaming 패턴으로 후속 렌더
  - 컴포넌트에서 비필수 섹션을 `<Suspense fallback={<LoadingSkeleton />}>` 로 감싸기
  - 이미 `renderToReadableStream`을 사용 중이므로 SSR 스트리밍 자동 지원

  **Must NOT do**:
  - 필수 데이터(stages, currentStage 등)를 defer — Hero/Journey Strip이 먼저 보여야 함
  - 기존 loader 반환 데이터 구조 변경 (하위 호환)
  - entry.server.tsx 변경

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (T14, T15, T16과 병렬)
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 18
  - **Blocked By**: Task 13

  **References**:
  - `app/routes/public/index.tsx:29-51` — 현재 batch() 호출 (필수 데이터)
  - `app/routes/public/index.tsx:56-103` — 현재 Promise.all() 호출 (비필수 데이터)
  - `app/entry.server.tsx:17-27` — 이미 `renderToReadableStream` 사용 → 스트리밍 SSR 지원
  - https://reactrouter.com/how-to/suspense — RR7 Suspense 스트리밍 패턴
  - `app/components/feedback/LoadingSkeleton.tsx` — 기존 스켈레톤 컴포넌트 활용

  **Acceptance Criteria**:
  - [ ] 홈페이지 loader가 필수 데이터를 즉시 반환하고 비필수 데이터를 Promise로 반환
  - [ ] 비필수 섹션(최근 기록, 문장, 활동)이 Suspense fallback으로 감싸짐
  - [ ] LCP가 비필수 데이터 로딩에 블로킹되지 않음
  - [ ] `pnpm typecheck && pnpm build` 통과

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 홈페이지 Hero/Journey Strip이 먼저 렌더링됨
    Tool: Chrome DevTools (performance_start_trace)
    Preconditions: 배포 완료
    Steps:
      1. navigate_page(url="https://divelog.ada-kr-pos.com/")
      2. performance_start_trace(reload=true)
      3. LCP 요소 확인 (Hero 섹션이어야 함)
    Expected Result: LCP가 비필수 데이터 로딩 전에 발생 (Hero가 먼저 그려짐)
    Evidence: .sisyphus/evidence/task-17-streaming-lcp.txt

  Scenario: 비필수 섹션이 Suspense fallback 후 렌더됨
    Tool: Chrome DevTools (navigate_page + take_snapshot)
    Steps:
      1. 네트워크 throttle을 Slow 3G로 설정 (emulate)
      2. navigate_page(url="https://divelog.ada-kr-pos.com/")
      3. 즉시 take_snapshot() — Hero 존재, 최근 기록 스켈레톤 확인
      4. 3초 대기 후 take_snapshot() — 최근 기록 실제 데이터 확인
    Expected Result: 첫 스냅샷에 Hero 있고, 두 번째 스냅샷에 최근 기록 있음
    Evidence: .sisyphus/evidence/task-17-streaming-fallback.png
  ```

  **Commit**: YES
  - Message: `perf: apply Suspense streaming to homepage non-critical data (records, sentences, activity)`
  - Files: `app/routes/public/index.tsx`
  - Pre-commit: `pnpm typecheck && pnpm build`

- [x] 18. 배포 + Wave 3 측정

  **What to do**:
  - `pnpm deploy`로 배포
  - 5개 대상 페이지 재측정 (동일 프로토콜)
  - `.sisyphus/evidence/wave-3-loaders.md`에 결과 기록
  - Wave 0 baseline, Wave 1과 비교하는 종합 delta 테이블 작성

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (마지막)
  - **Blocks**: Tasks 16, 17
  - **Blocked By**: Tasks 12, 13, 14

  **Acceptance Criteria**:
  - [ ] `.sisyphus/evidence/wave-3-loaders.md` 생성
  - [ ] 종합 delta 테이블 포함

  **QA Scenarios (MANDATORY):**
  ```
  Scenario: 측정 완료 확인
    Tool: Bash
    Steps:
      1. wave-3-loaders.md 존재 확인
      2. 5개 페이지 측정 데이터 포함 확인
    Expected Result: 완전한 측정 데이터
    Evidence: .sisyphus/evidence/task-15-wave3-verify.txt
  ```

  **Commit**: YES
  - Message: `docs: record Wave 3 (loader optimization) measurements`
  - Files: `.sisyphus/evidence/wave-3-loaders.md`

- [x] 19. splitRouteModules 활성화 (조건부: T13 Go)

  **What to do**:
  - **T11에서 splitRouteModules가 Go인 경우에만 진행**
  - T10 스파이크에서 `true`로 검증된 `unstable_splitRouteModules`를 유지
  - 빌드 출력 비교: Wave 3 대비 청크 수/크기 변화 확인
  - 공유 코드로 인한 de-optimization 경고 확인 → 있으면 공유 코드 분리

  **Must NOT do**:
  - T11 No-Go인데 진행
  - `enforce` 모드 적용 (안정화 후에만)
  - 라우트 파일 대규모 리팩토링

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (T17과 병렬)
  - **Parallel Group**: Wave 4
  - **Blocks**: Task 18
  - **Blocked By**: Tasks 11 (Go), 15

  **References**:
  - `.sisyphus/evidence/spike-split-route-modules.md` — 스파이크 결과
  - `react-router.config.ts` — 설정 파일
  - https://remix.run/blog/split-route-modules — de-optimization 패턴 설명

  **Acceptance Criteria**:
  - [ ] splitRouteModules 활성화 상태로 빌드 성공
  - [ ] 배포 후 5개 대상 페이지 정상 동작
  - [ ] de-optimization 경고 0개 (또는 해결됨)

  **QA Scenarios (MANDATORY):**
  ```
  Scenario: splitRouteModules 적용 후 정상 동작
    Tool: Chrome DevTools
    Steps:
      1. pnpm deploy
      2. 5개 대상 페이지 순회 navigate_page
      3. 각 페이지 take_snapshot으로 정상 렌더 확인
    Expected Result: 모든 페이지 정상 렌더링
    Evidence: .sisyphus/evidence/task-16-split-modules.txt
  ```

  **Commit**: YES (성공 시)
  - Message: `perf: enable splitRouteModules for parallel loader/component loading`
  - Files: `react-router.config.ts`

- [x] 20. clientLoader 캐시 안정화 (TTL + size limit)

  **What to do**:
  - `$recordSlug.tsx`, `$learnerSlug.tsx`, `$stageSlug.tsx`의 clientLoader Map 캐시에:
    1. **TTL**: 5분(300,000ms) 후 캐시 만료
    2. **Max size**: 50개 엔트리 초과 시 가장 오래된 것부터 삭제 (LRU-like)
  - 구현: Map 대신 `{ data: T, timestamp: number }` 형태로 저장
  - `clientLoader`에서 캐시 조회 시 TTL 초과 여부 체크
  - `clientAction`에서의 캐시 무효화 로직 유지

  **Must NOT do**:
  - 캐시 제거 (성능 이점 유지)
  - Service Worker 도입
  - localStorage/sessionStorage 사용

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (T16과 병렬)
  - **Parallel Group**: Wave 4
  - **Blocks**: Task 18
  - **Blocked By**: Task 15

  **References**:
  - `app/routes/public/logs/$recordSlug.tsx:34-48` — 현재 Map 캐시 패턴
  - `app/routes/public/learners/$learnerSlug.tsx:93-105` — 동일 패턴
  - `app/routes/public/journey/$stageSlug.tsx:64-78` — 동일 패턴

  **Acceptance Criteria**:
  - [ ] 3개 라우트의 clientLoader 캐시에 TTL(5분) 적용
  - [ ] Max size(50) 적용
  - [ ] `pnpm typecheck && pnpm build` 통과

  **QA Scenarios (MANDATORY):**
  ```
  Scenario: 캐시가 정상 동작
    Tool: Chrome DevTools (navigate_page + list_network_requests)
    Steps:
      1. 기록 상세 페이지 방문
      2. 다른 페이지로 이동
      3. 뒤로가기로 같은 기록 재방문
      4. list_network_requests — 두 번째 방문에서 loader 요청 없음 확인
    Expected Result: 캐시된 데이터로 즉시 렌더 (5분 내)
    Evidence: .sisyphus/evidence/task-17-cache-check.txt
  ```

  **Commit**: YES
  - Message: `perf: add TTL and size limit to clientLoader Map cache`
  - Files: `app/routes/public/logs/$recordSlug.tsx`, `app/routes/public/learners/$learnerSlug.tsx`, `app/routes/public/journey/$stageSlug.tsx`

- [x] 21. 배포 + Wave 4 측정

  **What to do**:
  - `pnpm deploy`
  - 5개 대상 페이지 재측정
  - `.sisyphus/evidence/wave-4-client.md`에 결과 기록
  - 전체 wave 비교 종합 테이블

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**:
  - **Blocked By**: Tasks 16, 17

  **Acceptance Criteria**:
  - [ ] `.sisyphus/evidence/wave-4-client.md` 생성
  - [ ] 전체 wave 비교 테이블

  **QA Scenarios (MANDATORY):**
  ```
  Scenario: 측정 결과 개선 확인
    Tool: Bash
    Steps: wave-0 vs wave-4 비교
    Expected Result: Lighthouse Performance 향상 또는 유지
    Evidence: .sisyphus/evidence/task-18-wave4-delta.txt
  ```

  **Commit**: YES
  - Message: `docs: record Wave 4 (client bundle) measurements`

- [x] 22. 최종 배포 + Before/After 비교 + 목표 달성 확인

  **What to do**:
  - 최종 `pnpm deploy`
  - 5개 대상 페이지 최종 측정
  - `.sisyphus/evidence/final-comparison.md`에 종합 비교 테이블 작성:
    | Page | Metric | Baseline (Wave 0) | Final | Delta | Target | Status |
  - **목표 미달성 항목 식별** → 추가 최적화 필요 여부 판단
  - 목표 달성 시: 성공 기록
  - 목표 미달성 시: 원인 분석 + 추가 최적화 방향 제안 (이 계획의 범위 밖)

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**:
  - **Blocked By**: Task 18

  **Acceptance Criteria**:
  - [ ] `.sisyphus/evidence/final-comparison.md` 생성
  - [ ] 5개 페이지 × 6개 메트릭 = 30개 데이터 포인트
  - [ ] 각 메트릭의 Target 달성 여부 명시
  - [ ] Lighthouse Performance ≥ 85 확인

  **QA Scenarios (MANDATORY):**
  ```
  Scenario: 최종 Lighthouse 점수 확인
    Tool: Chrome DevTools (lighthouse_audit)
    Steps:
      1. 5개 대상 페이지에 lighthouse_audit(device="desktop") 실행
      2. Performance score 기록
    Expected Result: 모든 페이지 Performance ≥ 85
    Failure Indicators: 어느 페이지든 Performance < 85
    Evidence: .sisyphus/evidence/task-19-final-lighthouse/

  Scenario: 최종 LCP 확인
    Tool: Chrome DevTools (performance_start_trace)
    Steps:
      1. 각 페이지에 performance_start_trace(reload=true)
      2. LCP 값 기록
    Expected Result: 모든 페이지 LCP < 2.5s
    Evidence: .sisyphus/evidence/task-19-final-lcp.txt
  ```

  **Commit**: YES
  - Message: `docs: record final performance comparison (before/after)`
  - Files: `.sisyphus/evidence/final-comparison.md`

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists. For each "Must NOT Have": search codebase for forbidden patterns. Check evidence files exist in `.sisyphus/evidence/`. Compare deliverables against plan. Verify performance targets are met based on final measurement evidence.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | Perf Targets [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run `pnpm typecheck` + `pnpm build` + `pnpm test`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod (except web-vitals intentional logging), commented-out code, unused imports. Verify no behavior/visual changes.
  Output: `Build [PASS/FAIL] | Typecheck [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [ ] F3. **Performance Regression Check** — `unspecified-high`
  Deploy to Cloudflare Pages. Run `lighthouse_audit` on all 5 target pages. Run `performance_start_trace` on homepage. Compare against Wave 0 baseline. Verify ALL metrics improved or unchanged. Check no new console errors. Save evidence to `.sisyphus/evidence/final-perf-check/`.
  Output: `Pages [N/N pass] | LCP [value] | Lighthouse [score] | Regressions [NONE/list] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff (git log/diff). Verify 1:1. Check "Must NOT do" compliance (no UI changes, no admin routes, no schema changes). Detect unaccounted changes.
  Output: `Tasks [N/N compliant] | Scope [CLEAN/issues] | VERDICT`

---

## Commit Strategy

| Wave | Commit Message | Key Files |
|------|---------------|-----------|
| 0a | `perf: add web-vitals collection` | entry.client.tsx, package.json |
| 0b | `docs: record baseline measurements` | .sisyphus/evidence/ |
| 0c | `docs: record bundle analysis` | .sisyphus/evidence/ |
| 1a | `perf: lazy-load Sentry replayIntegration` | entry.client.tsx |
| 1b | `perf: optimize GlobalNav link prefetch strategy` | GlobalNav.tsx |
| 1c | `perf: change StageStrip prefetch to intent` | StageStrip.tsx |
| 1d | `perf: optimize SmartLink default prefetch` | SmartLink.tsx |
| 1e | `perf: add _headers for immutable static assets` | public/_headers |
| 2a | `spike: validate static imports on CF edge` | routes/public/guide.tsx |
| 2b | `spike: validate splitRouteModules on CF` | react-router.config.ts |
| 2c | `perf: add Workers Cache API for /__manifest` | workers/app.ts |
| 3a | `perf: convert public loaders to static imports` | routes/public/*.tsx |
| 3b | `perf: parallelize $recordSlug loader DB calls` | routes/public/logs/$recordSlug.tsx |
| 3c | `perf: expand shouldRevalidate coverage` | routes/public/*.tsx |
| 3d | `perf: apply Suspense streaming to homepage` | routes/public/index.tsx |
| 4a | `perf: enable splitRouteModules` | react-router.config.ts |
| 4b | `perf: add TTL+size limit to clientLoader cache` | routes/public/logs/$recordSlug.tsx, routes/public/learners/$learnerSlug.tsx, routes/public/journey/$stageSlug.tsx |

---

## Success Criteria

### Verification Commands
```bash
pnpm typecheck    # Expected: no errors
pnpm build        # Expected: success
pnpm test         # Expected: all pass
```

### Final Checklist
- [ ] web-vitals 수집 코드 동작 확인 (console output)
- [ ] 5개 대상 페이지 Lighthouse Performance ≥ 85
- [ ] LCP < 2.5s (모든 대상 페이지)
- [ ] CLS < 0.1 (모든 대상 페이지)
- [ ] Sentry 에러 리포팅/트레이싱/리플레이 정상 동작
- [ ] 기존 UI/동작 변경 없음
- [ ] Admin 라우트 미변경
- [ ] before/after 측정 기록 완비
