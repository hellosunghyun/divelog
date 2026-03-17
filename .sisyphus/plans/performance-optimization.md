# 사이트 성능 최적화 — Performance Optimization

## TL;DR

> **Quick Summary**: divelog.ada-kr-pos.com의 TTFB 2.2s / FCP 6.3s를 TTFB < 0.8s / FCP < 2.5s로 개선. 외부 인증 API 차단, 홈 DB 워터폴 4단→1단, 번들 567KB→400KB 이하, SSR 캐싱 추가.
> 
> **Deliverables**:
> - 홈 페이지 TTFB 60% 이상 개선 (미인증 기준)
> - JS 번들 30% 감량
> - SSR HTML edge 캐싱 적용
> - Sentry 100%→10% 트레이스 샘플링
> - 불필요한 prefetch 제거
> 
> **Estimated Effort**: Medium
> **Parallel Execution**: YES — 4 waves
> **Critical Path**: Task 1 (baseline) → Task 5-6 (DB optimize) → Task 7 (cache) → Final Verification

---

## Context

### Original Request
사이트가 느리고 반응속도가 낮다. Cloudflare 확인 및 직접 접속으로 원인 분석 요청.

### Interview Summary
**측정 데이터**:
- curl TTFB: 2.0~2.2s (3회 반복 측정)
- 브라우저 FCP: 6.25s
- JS 전송량: 567KB / 34파일
- D1: APAC 리전, 397KB, 정상 범위

**핵심 병목 7개 확인**:
1. 외부 auth API가 매 페이지 SSR 차단 (~1-2s)
2. 홈 loader에 4단 순차 DB 워터폴 (13+ 쿼리, redundant 포함)
3. ArticleEditor 218KB가 prefetch로 불필요 로딩 가능성
4. SSR HTML에 Cache-Control 없음
5. 모든 loader에서 dynamic import 오버헤드
6. Sentry 100% trace sampling + debug-build 청크 41KB
7. GlobalNav에서 `prefetch="render"` 8개 링크 — 페이지 로드 시 즉시 prefetch

### Metis Review
**Identified Gaps** (addressed):
- 홈 loader 워터폴이 3단이 아닌 **4단** (resolveStageCohort 중복 쿼리 발견)
- ArticleEditor 홈 로딩은 route code splitting으로 **격리 가능** → 빌드 분석 후 확인 필요
- GlobalNav가 `prefetch="intent"`가 아닌 **`prefetch="render"`** 사용 (더 심각)
- `tracesSampleRate: 1.0` — **100% 트레이스 샘플링** 프로덕션에서 실행 중
- dynamic import 오버헤드는 CF Workers에서 **sub-ms 수준** → 우선순위 하향
- API 키가 wrangler.toml에 평문 노출 (보안 이슈 발견)
- `shouldRevalidate` 레이아웃만 적용, 자식 라우트는 기본 revalidation

---

## Work Objectives

### Core Objective
기존 기능/데이터 형태를 100% 유지하면서 로딩 성능을 대폭 개선한다.

### Concrete Deliverables
- 미인증 홈 TTFB < 800ms
- 홈 FCP < 2.5s
- 클라이언트 JS < 400KB (전송 기준)
- SSR HTML에 적절한 Cache-Control 적용
- Sentry trace sampling 10%로 축소
- 불필요한 route prefetch 제거

### Definition of Done
- [ ] `curl -w "%{time_starttransfer}"` 미인증 홈 < 800ms (3회 평균)
- [ ] `pnpm build` 출력에서 클라이언트 JS 총량 < 400KB
- [ ] `pnpm typecheck && pnpm test && pnpm build` 전부 통과
- [ ] 인증/미인증 양쪽 페이지 정상 렌더링 확인

### Must Have
- 모든 loader 반환 데이터 형태(shape) 100% 유지
- 인증 플로우 정상 동작 (로그인/로그아웃 영향 없음)
- form action (쓰기, 수정, 설정) 정상 동작
- edge 캐시는 미인증 사용자만 적용

### Must NOT Have (Guardrails)
- KV 바인딩 사용 (프로젝트 제약)
- 인증된 사용자 HTML을 edge 캐시 (개인정보 누출 위험)
- Sentry 완전 제거 (축소만)
- 라우트 URL/리다이렉트 변경
- DB 스키마 변경
- UI/기능 변경
- Node.js 전용 API 사용 (edge runtime 호환 필수)
- 크리티컬 패스 외 라우트 최적화 (follow-up)
- `@adakrpos/auth` 패키지 변경 (외부 의존성)

---

## Verification Strategy

> **QA 시나리오는 전부 agent 자동 실행** — 사람이 수동 확인하는 acceptance criteria 금지.
> 단, Final Verification Wave 완료 후 사용자에게 결과 보고 및 승인 게이트는 오케스트레이터 프로세스의 일부로 허용.

### Test Decision
- **Infrastructure exists**: YES (`pnpm test` 스크립트 존재)
- **Automated tests**: Tests-after (기존 테스트 통과 확인 + 성능 회귀 테스트)
- **Framework**: 기존 프로젝트 테스트 프레임워크 사용

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **TTFB/성능**: Bash (`curl -w`) — 타이밍 측정, 반복 3회 평균
- **빌드 크기**: Bash (`pnpm build`) — 출력 파싱, 크기 비교
- **기능 회귀**: Bash (`pnpm typecheck && pnpm test`) — 타입체크 + 테스트
- **헤더 검증**: Bash (`curl -sI`) — 캐시 헤더 확인
- **번들 분석**: Bash (`ls -lhS build/client/assets/`) — 청크별 크기

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — baseline + trivial fixes):
├── Task 1: 성능 베이스라인 측정 [quick]
├── Task 2: Sentry tracesSampleRate 1.0 → 0.1 [quick]
├── Task 3: GlobalNav prefetch="render" → "intent"/"none" [quick]
└── Task 4: wrangler.toml API 키 → wrangler secret 이관 [quick]

Wave 2 (After Wave 1 — home loader 최적화):
├── Task 5: 홈 loader redundant query 제거 + getRecentActivity 인라인 [deep]
├── Task 6: 홈 loader 4단 워터폴 → 2단 병렬화 [deep]
└── Task 7: SSR HTML Cache-Control 헤더 추가 [unspecified-high]

Wave 3 (After Wave 2 — bundle + revalidation):
├── Task 8: ArticleEditor React.lazy 전환 [quick]
├── Task 9: SmartLink 기본 prefetch 조정 + write 링크 최적화 [quick]
├── Task 10: 고트래픽 자식 라우트 shouldRevalidate 추가 [unspecified-high]
└── Task 11: 크리티컬 패스 loader dynamic→static import [unspecified-high]

Wave FINAL (After ALL tasks — 4 parallel reviews, then user okay):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real manual QA (unspecified-high)
└── Task F4: Scope fidelity check (deep)
→ Present results → Get explicit user okay
```

Critical Path: Task 1 → Task 5 → Task 6 → Task 7 → F1-F4 → user okay
Parallel Speedup: ~55% faster than sequential
Max Concurrent: 4 (Wave 1)

### Dependency Matrix

| Task | Depends On | Blocks |
|------|-----------|--------|
| 1 | — | 5, 6, 7, 8, 11 (baseline 비교용) |
| 2 | — | — |
| 3 | — | 9 |
| 4 | — | — |
| 5 | 1 | 6 |
| 6 | 5 | 7 |
| 7 | 6 | — |
| 8 | 1 | — |
| 9 | 3 | — |
| 10 | — | — |
| 11 | 1 | — |
| F1-F4 | ALL | user okay |

### Agent Dispatch Summary

- **Wave 1**: **4** — T1 `quick`, T2 `quick`, T3 `quick`, T4 `quick`
- **Wave 2**: **3** — T5 `deep`, T6 `deep`, T7 `unspecified-high`
- **Wave 3**: **4** — T8 `quick`, T9 `quick`, T10 `unspecified-high`, T11 `unspecified-high`
- **FINAL**: **4** — F1 `oracle`, F2 `unspecified-high`, F3 `unspecified-high`, F4 `deep`

---

## TODOs

- [x] 1. 성능 베이스라인 측정 및 기록

  **What to do**:
  - 현재 프로덕션 사이트의 성능 지표를 정량적으로 측정하여 기록
  - `curl -w` 로 주요 페이지 TTFB 측정 (/, /journey, /logs, /learners) — 각 3회 반복, 미인증/인증 각각
  - `pnpm build` 실행 후 `build/client/assets/` 디렉토리의 파일별 크기 기록
  - 총 클라이언트 JS 크기, 가장 큰 5개 청크 이름+크기 기록
  - ArticleEditor 청크가 어떤 라우트에서 로드되는지 빌드 그래프로 확인
  - 모든 측정값을 `.sisyphus/evidence/task-1-baseline.md`에 정리

  **Must NOT do**:
  - 코드 변경 금지 — 측정만
  - 프로덕션 배포 금지

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 측정 명령어 실행과 결과 정리만 필요
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `playwright`: 브라우저 성능 측정은 curl로 충분, Lighthouse까지는 불필요

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3, 4)
  - **Blocks**: Tasks 5, 6, 7, 8, 11 (비교 기준)
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - 없음 (측정 태스크)

  **External References**:
  - `curl -w` format: `%{time_namelookup}`, `%{time_connect}`, `%{time_appconnect}`, `%{time_starttransfer}`, `%{time_total}`

  **WHY Each Reference Matters**:
  - curl timing으로 DNS/TCP/TLS/TTFB/Total을 분리 측정해야 병목 구간 식별 가능

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 베이스라인 파일 생성 확인
    Tool: Bash
    Preconditions: 프로덕션 사이트 접근 가능
    Steps:
      1. `curl -o /dev/null -s -w "TTFB:%{time_starttransfer}s Total:%{time_total}s\n" https://divelog.ada-kr-pos.com/` 3회 실행
      2. `curl -o /dev/null -s -w "TTFB:%{time_starttransfer}s\n" https://divelog.ada-kr-pos.com/journey` 3회 실행
      3. `pnpm build` 실행
      4. `ls -lhS build/client/assets/ | head -15` 실행
      5. `.sisyphus/evidence/task-1-baseline.md` 파일 내용 확인
    Expected Result: baseline 파일에 TTFB 평균값, 빌드 크기, 상위 5 청크가 기록됨
    Failure Indicators: baseline 파일 없거나 측정값 누락
    Evidence: .sisyphus/evidence/task-1-baseline.md
  ```

  **Commit**: YES
  - Message: `perf(baseline): 성능 베이스라인 측정 및 기록`
  - Files: `.sisyphus/evidence/task-1-baseline.md`
  - Pre-commit: —

- [x] 2. Sentry tracesSampleRate 1.0 → 0.1 축소

  **What to do**:
  - `workers/app.ts`에서 `tracesSampleRate: 1.0`을 `tracesSampleRate: 0.1`로 변경
  - 이 한 줄 변경으로 매 요청마다 실행되던 full trace 수집이 10%로 축소
  - Error capture는 100% 유지 (errorsSampleRate는 건드리지 않음)

  **Must NOT do**:
  - Sentry 완전 제거 금지
  - 에러 캡처 비율 변경 금지
  - 다른 Sentry 설정 변경 금지

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 단일 파일 1줄 변경
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3, 4)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `workers/app.ts:35` — 현재 `tracesSampleRate: 1.0` 위치

  **WHY Each Reference Matters**:
  - 정확한 위치를 알아야 올바른 값만 변경 가능

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: tracesSampleRate 값 확인
    Tool: Bash
    Preconditions: workers/app.ts 파일 존재
    Steps:
      1. `grep "tracesSampleRate" workers/app.ts`
    Expected Result: `tracesSampleRate: 0.1` 출력 (1.0이 아님)
    Failure Indicators: 값이 1.0이거나 해당 줄이 없음
    Evidence: .sisyphus/evidence/task-2-sentry-sampling.txt

  Scenario: 타입체크 통과
    Tool: Bash
    Preconditions: 의존성 설치 완료
    Steps:
      1. `pnpm typecheck`
    Expected Result: 에러 0개로 종료
    Failure Indicators: 타입 에러 발생
    Evidence: .sisyphus/evidence/task-2-typecheck.txt
  ```

  **Commit**: YES
  - Message: `perf(sentry): trace sampling 1.0→0.1 축소`
  - Files: `workers/app.ts`
  - Pre-commit: `pnpm typecheck`

- [x] 3. GlobalNav prefetch="render" → "intent" 변경

  **What to do**:
  - `app/components/layout/GlobalNav.tsx`에서 모든 `prefetch="render"` 를 찾아 `prefetch="intent"`로 변경
  - Metis 분석에 의하면 **8개 링크**가 `prefetch="render"` 사용 중 → 페이지 로드 즉시 8개 라우트의 JS+loader가 prefetch됨
  - `prefetch="intent"`로 변경하면 hover 시에만 prefetch → 초기 로딩 부하 대폭 감소
  - "글쓰기"(CTA) 관련 링크는 `prefetch="none"`으로 변경 (ArticleEditor 청크 prefetch 방지)

  **Must NOT do**:
  - GlobalNav 외 컴포넌트 변경 금지
  - 링크 URL이나 라벨 변경 금지
  - 레이아웃/스타일 변경 금지

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 단일 파일, 단순 속성값 변경
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 4)
  - **Blocks**: Task 9 (SmartLink 기본값 변경과 연관)
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `app/components/layout/GlobalNav.tsx` — `prefetch="render"` 검색하면 8개 위치 발견
  - `app/components/content/SmartLink.tsx:9` — 기본 prefetch가 "intent"인 SmartLink 래퍼

  **WHY Each Reference Matters**:
  - GlobalNav이 SmartLink(=Link)를 사용하므로, prop으로 전달된 `prefetch` 값이 우선
  - 글쓰기 링크는 ArticleEditor 번들 prefetch를 방지하기 위해 `prefetch="none"` 필요

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: prefetch="render" 완전 제거 확인
    Tool: Bash
    Preconditions: GlobalNav.tsx 수정 완료
    Steps:
      1. `grep -c 'prefetch="render"' app/components/layout/GlobalNav.tsx`
    Expected Result: 0 (render prefetch가 전혀 없음)
    Failure Indicators: 1 이상의 값
    Evidence: .sisyphus/evidence/task-3-prefetch-check.txt

  Scenario: 글쓰기 링크 prefetch="none" 확인
    Tool: Bash
    Preconditions: GlobalNav.tsx 수정 완료
    Steps:
      1. `grep -A2 '글쓰기\|/write' app/components/layout/GlobalNav.tsx | grep prefetch`
    Expected Result: `prefetch="none"` 포함
    Failure Indicators: prefetch="intent" 또는 prefetch="render"
    Evidence: .sisyphus/evidence/task-3-write-prefetch.txt

  Scenario: 타입체크 통과
    Tool: Bash
    Steps:
      1. `pnpm typecheck`
    Expected Result: 에러 0개
    Evidence: .sisyphus/evidence/task-3-typecheck.txt
  ```

  **Commit**: YES
  - Message: `perf(nav): GlobalNav prefetch render→intent 변경`
  - Files: `app/components/layout/GlobalNav.tsx`
  - Pre-commit: `pnpm typecheck`

- [x] 4. wrangler.toml API 키 → wrangler secret 이관

  **What to do**:
  - `wrangler.toml`의 `[vars]` 섹션에서 `ADAKRPOS_API_KEY = "ak_277c6498-..."` 줄 제거
  - `wrangler.deploy.toml`의 `[vars]` 섹션에서도 `ADAKRPOS_API_KEY = "ak_277c6498-..."` 줄 제거 (배포용 설정 파일)
  - `wrangler secret put ADAKRPOS_API_KEY` 실행하여 Cloudflare에 시크릿 등록 (프로덕션 배포가 동작하려면 이 단계 필수)
  - `.dev.vars` 파일에 `ADAKRPOS_API_KEY` 항목이 있는지 확인, 없으면 추가
  - 시크릿 등록 후 `pnpm deploy` 로 배포가 정상 동작하는지 확인

  **Must NOT do**:
  - `.dev.vars` 파일을 git에 커밋
  - ADMIN_USER_ID, ADMIN_EMAILS 등 다른 환경변수 변경
  - API 키 값을 코드나 주석에 남기기

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: wrangler.toml 1줄 제거 + 안내 문서
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `wrangler.toml:11` — `ADAKRPOS_API_KEY = "ak_277c6498-..."` 위치
  - `wrangler.deploy.toml:11` — 동일한 API 키 (배포용 설정)
  - `package.json:8` — `"deploy": "npm run build && wrangler deploy --config wrangler.deploy.toml"` (배포가 wrangler.deploy.toml 사용)
  - `.dev.vars` — 로컬 개발용 환경변수 파일

  **WHY Each Reference Matters**:
  - wrangler.toml과 wrangler.deploy.toml 모두 git에 커밋되므로 API 키 노출 위험
  - 배포 시 wrangler.deploy.toml 사용 → 이 파일도 반드시 수정
  - .dev.vars는 .gitignore에 포함되어 안전

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 양쪽 wrangler 설정에서 API 키 제거 확인
    Tool: Bash
    Preconditions: wrangler.toml, wrangler.deploy.toml 수정 완료
    Steps:
      1. `grep "ak_" wrangler.toml wrangler.deploy.toml`
    Expected Result: 출력 없음 (양쪽 모두 API 키 없음)
    Failure Indicators: ak_로 시작하는 값이 존재
    Evidence: .sisyphus/evidence/task-4-secret-check.txt

  Scenario: .dev.vars에 키 존재 확인
    Tool: Bash
    Steps:
      1. `grep "ADAKRPOS_API_KEY" .dev.vars`
    Expected Result: ADAKRPOS_API_KEY 항목 존재
    Failure Indicators: 항목 없음
    Evidence: .sisyphus/evidence/task-4-devvars-check.txt

  Scenario: Cloudflare secret 등록 + 배포 검증
    Tool: Bash
    Steps:
      1. `grep "ADAKRPOS_API_KEY" .dev.vars | cut -d= -f2 | wrangler secret put ADAKRPOS_API_KEY` — .dev.vars에서 키 값을 읽어 stdin으로 전달 (비대화형)
      2. `pnpm deploy` — 배포 성공 확인
      3. `curl -o /dev/null -s -w "%{http_code}" https://divelog.ada-kr-pos.com/` — 200 응답 확인
    Expected Result: secret 등록 성공, 배포 성공, 사이트 200 응답
    Failure Indicators: secret 등록 실패, 배포 오류, 500 응답
    Evidence: .sisyphus/evidence/task-4-deploy-verify.txt
  ```

  **Commit**: YES
  - Message: `security(config): API 키 wrangler secret 이관`
  - Files: `wrangler.toml`, `wrangler.deploy.toml`
  - Pre-commit: —

- [x] 5. 홈 loader redundant query 제거 + getRecentActivity 인라인

  **What to do**:
  - **문제**: `getRecentActivity()` 내부의 `resolveStageCohort()`가 현재 Stage를 다시 쿼리함 — 홈 loader의 Round 1 batch에서 이미 `currentStage`를 가져왔는데 중복
  - `app/db/queries/social/activity.server.ts`의 `getRecentActivity` 함수를 수정하여 외부에서 `cohort` 파라미터를 받을 수 있게 확장
  - 또는 `getNarrativeDigest`에 `cohort` 옵션을 추가하여 `resolveStageCohort` 호출을 스킵할 수 있게 함
  - `app/routes/public/index.tsx`의 홈 loader에서 Round 1에서 얻은 `currentStage.cohort`를 `getRecentActivity`에 전달
  - 이로써 Round 3의 `resolveStageCohort` 쿼리 1개가 완전 제거되고, Round 3→4 순차가 제거됨

  **Must NOT do**:
  - `getRecentActivity`의 기존 호출자(다른 곳에서 사용 시)를 깨뜨리지 않기 — 기존 시그니처 유지하되 옵션 확장
  - 반환 데이터 형태(ActivityItem[]) 변경 금지
  - `getNarrativeDigest`의 다른 호출자 동작 변경 금지

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: 두 파일의 함수 시그니처 변경 + 호출부 수정, 데이터 일관성 보장 필요
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (sequential: 5 → 6)
  - **Blocks**: Task 6
  - **Blocked By**: Task 1 (baseline)

  **References**:

  **Pattern References**:
  - `app/db/queries/social/activity.server.ts:77-97` — `resolveStageCohort` 함수 (중복 쿼리 원인)
  - `app/db/queries/social/activity.server.ts:99-246` — `getNarrativeDigest` 함수 (cohort를 자체 resolve)
  - `app/db/queries/social/activity.server.ts:275-287` — `getRecentActivity` 함수 (getNarrativeDigest 호출)
  - `app/routes/public/index.tsx:31` — `currentStageResult` 이미 batch에서 가져옴
  - `app/routes/public/index.tsx:98` — `currentStage` 변수 사용 (cohort 접근 가능)
  - `app/routes/public/index.tsx:101` — `getRecentActivity` 호출 지점

  **API/Type References**:
  - `app/db/queries/social/activity.server.ts:22-28` — `ActivityItem` 타입 정의 (반환 형태 유지 필수)
  - `app/db/queries/social/activity.server.ts:30-33` — `DigestQueryOptions` 인터페이스 (확장 대상)

  **WHY Each Reference Matters**:
  - `resolveStageCohort`가 별도로 DB 쿼리하는 이유를 이해해야 안전하게 제거 가능
  - `DigestQueryOptions`에 `cohort?: string` 옵션을 추가하면 기존 호출자는 영향 없음
  - 홈 loader에서 `currentStage?.cohort`를 전달하면 Round 3의 쿼리가 완전 스킵됨

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: getRecentActivity에 cohort 전달 시 쿼리 감소
    Tool: Bash
    Preconditions: 코드 수정 완료
    Steps:
      1. `grep -n "resolveStageCohort" app/db/queries/social/activity.server.ts` — 함수 존재 확인
      2. `grep -A5 "options.cohort\|opts.cohort" app/db/queries/social/activity.server.ts` — cohort 옵션이 있으면 DB 쿼리 스킵하는 분기 코드 확인
      3. `grep -n "getRecentActivity\|getNarrativeDigest" app/routes/public/index.tsx` — 호출부에서 cohort 파라미터 전달 확인
    Expected Result: Step 2에서 `if (options.cohort)` 또는 유사 분기가 출력, Step 3에서 cohort 인자 전달 확인
    Failure Indicators: Step 2에서 cohort 분기 없음, Step 3에서 cohort 미전달
    Evidence: .sisyphus/evidence/task-5-redundant-query.txt

  Scenario: 기존 getRecentActivity 호출자 호환성
    Tool: Bash
    Preconditions: 코드 수정 완료
    Steps:
      1. `grep -rn "getRecentActivity" app/` — 모든 호출 지점 확인
      2. cohort 파라미터 없는 호출이 여전히 정상 동작하는지 확인 (옵션이므로)
    Expected Result: 기존 호출자는 코드 변경 없이 동작
    Failure Indicators: 필수 파라미터로 변경되어 기존 호출자 컴파일 에러
    Evidence: .sisyphus/evidence/task-5-compat-check.txt

  Scenario: 타입체크 + 테스트 통과
    Tool: Bash
    Steps:
      1. `pnpm typecheck && pnpm test`
    Expected Result: 모두 통과
    Evidence: .sisyphus/evidence/task-5-typecheck.txt
  ```

  **Commit**: YES
  - Message: `perf(home): redundant stageCohort 쿼리 제거`
  - Files: `app/routes/public/index.tsx`, `app/db/queries/social/activity.server.ts`
  - Pre-commit: `pnpm typecheck && pnpm test`

- [x] 6. 홈 loader 4단 DB 워터폴 → 2단 병렬화

  **What to do**:
  - **현재 구조** (4단 순차):
    ```
    Round 1: await database.batch([5 queries])
    Round 2: await Promise.all([recentRecords, recentSentences])
    Round 3: (Task 5에서 제거됨)
    Round 4: await Promise.all([5 activity queries]) — getRecentActivity 내부
    ```
  - **목표 구조** (2단):
    ```
    Round 1: await database.batch([5 queries])  — 기존 batch 유지 (JOIN 컬럼 충돌 이슈)
    Round 2: await Promise.all([recentRecords, recentSentences, getNarrativeDigest(with cohort)])
             — recentRecords, recentSentences, activity 5개 쿼리를 동시 실행
    ```
  - Round 2의 `recentRecords`, `recentSentences`는 Round 1 결과에 의존하지 않으므로 activity와 병렬 가능
  - `getNarrativeDigest`에 Task 5에서 추가한 `cohort` 옵션을 활용하여 Round 1의 `currentStage.cohort` 전달
  - D1 batch의 JOIN 컬럼 충돌이 여전히 존재하는지 확인 — 해결됐으면 Round 1에 합치기, 아니면 2단 유지
  - `getPlainText` import + snippet 변환 로직도 Promise.all 이후로 이동 (IO가 아니므로 영향 적음)

  **Must NOT do**:
  - loader 반환 데이터 형태 변경 금지 — `allStages`, `currentStage`, `recentRecords`, `openQuestions`, `recentSentences`, `spotlightLearners`, `learnerCount`, `recentActivity` 모두 동일해야 함
  - D1 batch 내부의 쿼리 자체(SQL) 변경 금지
  - getPlainText 로직 변경 금지

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: 복잡한 비동기 흐름 재구성, 데이터 의존성 정확히 분석 필요
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO (Task 5 완료 후)
  - **Parallel Group**: Wave 2 (sequential after 5)
  - **Blocks**: Task 7
  - **Blocked By**: Task 5

  **References**:

  **Pattern References**:
  - `app/routes/public/index.tsx:29-51` — Round 1: `database.batch([5 queries])`
  - `app/routes/public/index.tsx:53-96` — Round 2: `Promise.all([recentRecords, recentSentences])`
  - `app/routes/public/index.tsx:101` — Round 3+4: `getRecentActivity` 호출
  - `app/routes/public/index.tsx:104-118` — 후처리: getPlainText + formatRelativeTime

  **API/Type References**:
  - `app/routes/public/index.tsx:121` — loader 반환 객체 shape (8개 필드 유지 필수)

  **WHY Each Reference Matters**:
  - Round 2의 recentRecords/recentSentences가 Round 1의 어떤 결과에도 의존하지 않음을 확인해야 병렬화 가능
  - batch의 JOIN 컬럼 충돌 주석(line 27-28)이 핵심 — 이 제약이 Round 1+2 합침을 막는 이유

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 홈 페이지 loader 반환 필드 동일성 확인
    Tool: Bash
    Preconditions: 코드 수정 완료
    Steps:
      1. `pnpm typecheck` — 타입 레벨에서 loader 반환 shape 보존 확인
      2. `grep -n "return {" app/routes/public/index.tsx` — loader 반환 객체 위치
      3. `grep -o "allStages\|currentStage\|recentRecords\|openQuestions\|recentSentences\|spotlightLearners\|learnerCount\|recentActivity" app/routes/public/index.tsx | sort -u | wc -l` — 8개 필드 모두 존재 확인
    Expected Result: typecheck 통과, 8개 필드 모두 존재 (출력값 8)
    Failure Indicators: typecheck 실패 또는 필드 수 < 8
    Evidence: .sisyphus/evidence/task-6-data-check.txt

  Scenario: loader 코드에 순차 대기 2단 이하 확인
    Tool: Bash
    Preconditions: 코드 수정 완료
    Steps:
      1. `grep -n "await " app/routes/public/index.tsx` — loader 내 모든 await 위치와 개수 출력
      2. `grep -n "Promise.all" app/routes/public/index.tsx` — Promise.all 사용 위치 확인
      3. `grep -B2 -A2 "getRecentActivity\|getNarrativeDigest" app/routes/public/index.tsx` — activity 호출이 Promise.all 인자 안에 있는지 컨텍스트와 함께 확인
    Expected Result: await가 최대 2개 블록 (batch + Promise.all), Step 3에서 activity 호출이 Promise.all([...]) 내부에 위치
    Failure Indicators: await가 3블록 이상이거나 getRecentActivity가 독립된 await로 호출
    Evidence: .sisyphus/evidence/task-6-waterfall-check.txt

  Scenario: 타입체크 + 테스트 통과
    Tool: Bash
    Steps:
      1. `pnpm typecheck && pnpm test`
    Expected Result: 모두 통과
    Evidence: .sisyphus/evidence/task-6-typecheck.txt
  ```

  **Commit**: YES
  - Message: `perf(home): 4단 DB 워터폴 → 2단 병렬화`
  - Files: `app/routes/public/index.tsx`
  - Pre-commit: `pnpm typecheck && pnpm test`

- [x] 7. 미인증 SSR HTML Cache-Control 헤더 추가

  **What to do**:
  - **핵심**: 미인증 사용자(쿠키 없음)의 SSR HTML을 Cloudflare edge에서 캐시하여 TTFB를 거의 0에 근접하게 만듦
  - `workers/app.ts` 또는 `app/entry.server.tsx`에서 응답 헤더에 Cache-Control 추가
  - **미인증 요청** (`adakrpos_session` 쿠키 없음): `Cache-Control: public, s-maxage=60, stale-while-revalidate=300`
  - **인증 요청** (쿠키 있음): `Cache-Control: private, no-cache` — edge 캐시 절대 금지 (개인정보 보호)
  - 쿠키 존재 여부 판단: `request.headers.get("cookie")?.includes("adakrpos_session")`
  - Vary 헤더 추가: `Vary: Cookie` — 같은 URL이라도 쿠키 유무에 따라 다른 캐시
  - `workers/app.ts`의 request handler 래퍼에서 응답을 가로채 헤더 추가하는 방식 권장

  **Must NOT do**:
  - 인증된 사용자의 HTML을 edge 캐시에 저장하지 않기 (개인정보 누출)
  - Cache-Control 외의 응답 변경 금지
  - 정적 에셋(JS/CSS/이미지)의 캐싱 변경 금지

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Workers 레벨 미들웨어 수정, 캐싱 전략 정확한 구현 필요
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO (Wave 2 순차)
  - **Parallel Group**: Wave 2 (after Task 6)
  - **Blocks**: None
  - **Blocked By**: Task 6

  **References**:

  **Pattern References**:
  - `workers/app.ts` — Sentry wrapRequestHandler가 있는 Worker 진입점
  - `app/entry.server.tsx:36` — 현재 `Content-Type: text/html`만 설정
  - `app/lib/auth/auth.server.ts:16-28` — `getSessionIdFromCookie` 함수 (쿠키 파싱 패턴 참조)

  **External References**:
  - CF Workers Cache-Control: `s-maxage`는 edge cache TTL, `max-age`는 브라우저 cache TTL
  - `stale-while-revalidate`: edge에서 캐시 만료 후에도 stale 응답을 즉시 제공하면서 백그라운드에서 새 응답 생성

  **WHY Each Reference Matters**:
  - Workers 진입점에서 응답을 감싸야 모든 SSR 응답에 일관된 캐시 헤더 적용 가능
  - auth.server.ts의 쿠키 파싱 패턴을 재사용하면 일관된 쿠키 판단 로직 유지
  - s-maxage=60은 edge에서 1분간 캐시, stale-while-revalidate=300은 5분간 stale 허용

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 미인증 분기에 Cache-Control 코드 존재 확인
    Tool: Bash
    Preconditions: 코드 수정 완료
    Steps:
      1. `grep -n "s-maxage" workers/app.ts app/entry.server.tsx 2>/dev/null` — s-maxage 설정 코드 위치
      2. `grep -n "Cache-Control" workers/app.ts app/entry.server.tsx 2>/dev/null` — Cache-Control 헤더 설정 위치
      3. `grep -B3 -A3 "s-maxage" workers/app.ts app/entry.server.tsx 2>/dev/null` — 컨텍스트와 함께 쿠키 분기 확인
    Expected Result: Step 1-2에서 각각 1건 이상 출력, Step 3에서 쿠키 유무 조건문 컨텍스트 확인
    Failure Indicators: grep 출력 0건 (Cache-Control 코드 없음)
    Evidence: .sisyphus/evidence/task-7-cache-code.txt

  Scenario: 인증 분기에 private Cache-Control 코드 확인
    Tool: Bash
    Preconditions: 코드 수정 완료
    Steps:
      1. `grep -n "private" workers/app.ts app/entry.server.tsx 2>/dev/null` — private 캐시 설정 위치
      2. `grep -B5 "private" workers/app.ts app/entry.server.tsx 2>/dev/null` — private 앞에 쿠키 존재 조건문 확인
    Expected Result: Step 1에서 `private` 포함 Cache-Control 코드 존재, Step 2에서 쿠키 조건문 컨텍스트
    Failure Indicators: private 관련 코드 없음 또는 조건 없이 무조건 적용
    Evidence: .sisyphus/evidence/task-7-cache-auth-code.txt

  Scenario: Vary 헤더 코드 존재
    Tool: Bash
    Steps:
      1. `grep -n "Vary" workers/app.ts app/entry.server.tsx 2>/dev/null`
    Expected Result: `Vary` 또는 `Cookie` 포함하는 헤더 설정 코드 존재 (1건 이상)
    Failure Indicators: grep 출력 0건
    Evidence: .sisyphus/evidence/task-7-vary-code.txt

  Scenario: 타입체크 통과
    Tool: Bash
    Steps:
      1. `pnpm typecheck`
    Expected Result: 에러 0개
    Evidence: .sisyphus/evidence/task-7-typecheck.txt
  ```

  **Commit**: YES
  - Message: `perf(ssr): 미인증 SSR HTML Cache-Control 추가`
  - Files: `workers/app.ts` (또는 `app/entry.server.tsx`)
  - Pre-commit: `pnpm typecheck`

- [x] 8. ArticleEditor React.lazy 전환

  **What to do**:
  - Task 1의 빌드 분석 결과를 확인하여 ArticleEditor 청크가 실제로 어떤 라우트에 포함되는지 먼저 파악
  - `app/routes/public/write/article.tsx:10`의 정적 import를 `React.lazy()`로 전환:
    ```tsx
    // Before
    import { ArticleEditor } from "~/components/editor/editors/ArticleEditor";
    // After
    const ArticleEditor = React.lazy(() => import("~/components/editor/editors/ArticleEditor").then(m => ({ default: m.ArticleEditor })));
    ```
  - `app/routes/public/logs/$recordSlug.edit.tsx:8`도 동일하게 전환
  - `<Suspense fallback={<LoadingSkeleton />}>` 로 감싸기
  - Suspense fallback은 기존 `app/components/feedback/LoadingSkeleton.tsx` 컴포넌트 사용 또는 간단한 로딩 div

  **Must NOT do**:
  - ArticleEditor 컴포넌트 자체 수정 금지
  - 에디터 기능/동작 변경 금지
  - SSR에서 ArticleEditor가 렌더되는 경우 주의 — lazy는 클라이언트 전용이므로 SSR 호환성 확인 필요

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 2개 파일의 import 패턴 변경 + Suspense 감싸기
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 9, 10, 11)
  - **Blocks**: None
  - **Blocked By**: Task 1 (빌드 분석 결과 참조)

  **References**:

  **Pattern References**:
  - `app/routes/public/write/article.tsx:10` — `import { ArticleEditor } from "~/components/editor/editors/ArticleEditor"`
  - `app/routes/public/logs/$recordSlug.edit.tsx:8` — 동일 import
  - `app/components/feedback/LoadingSkeleton.tsx` — 기존 로딩 컴포넌트 (Suspense fallback 후보)

  **WHY Each Reference Matters**:
  - 두 파일만 ArticleEditor를 사용 — 영향 범위가 명확
  - LoadingSkeleton이 이미 존재하므로 fallback UI 새로 만들 필요 없음

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: ArticleEditor 정적 import 제거 확인
    Tool: Bash
    Preconditions: 코드 수정 완료
    Steps:
      1. `grep -rn "import.*ArticleEditor.*from" app/routes/`
    Expected Result: 정적 import 0건 (lazy만 존재)
    Failure Indicators: 정적 import 문이 남아있음
    Evidence: .sisyphus/evidence/task-8-lazy-check.txt

  Scenario: 빌드 성공 + ArticleEditor 청크 격리 확인
    Tool: Bash
    Steps:
      1. `pnpm build`
      2. `ls -lhS build/client/assets/ | head -10` — 빌드 결과물 확인
      3. `grep -l "ArticleEditor" build/client/assets/*.js` — ArticleEditor 문자열을 포함하는 청크 목록
      4. `grep -l "ArticleEditor" build/client/assets/*.js | grep -v -i "article\|editor\|write\|recordSlug"` — write/edit 라우트 외 청크에서 ArticleEditor 참조 여부
    Expected Result: Step 1 빌드 성공, Step 4 출력 없음 (ArticleEditor가 관련 라우트 청크에만 존재)
    Failure Indicators: 빌드 실패 또는 Step 4에서 entry.client나 root 등 공통 청크에 ArticleEditor 포함
    Evidence: .sisyphus/evidence/task-8-build.txt

  Scenario: Suspense + lazy import 코드 패턴 확인
    Tool: Bash
    Steps:
      1. `grep -n "React.lazy\|Suspense" app/routes/public/write/article.tsx`
      2. `grep -n "React.lazy\|Suspense" app/routes/public/logs/\\$recordSlug.edit.tsx`
    Expected Result: 두 파일 모두 React.lazy()와 <Suspense> 사용
    Failure Indicators: lazy 또는 Suspense 누락
    Evidence: .sisyphus/evidence/task-8-lazy-pattern.txt
  ```

  **Commit**: YES
  - Message: `perf(bundle): ArticleEditor React.lazy 전환`
  - Files: `app/routes/public/write/article.tsx`, `app/routes/public/logs/$recordSlug.edit.tsx`
  - Pre-commit: `pnpm build`

- [x] 9. SmartLink 기본 prefetch 조정 + write 링크 최적화

  **What to do**:
  - `app/components/content/SmartLink.tsx`의 기본 prefetch를 `"intent"`에서 `"viewport"`로 변경
  - viewport prefetch는 링크가 뷰포트에 들어올 때만 prefetch — intent보다 덜 적극적이면서도 사용성 유지
  - 또는 더 보수적으로 `"none"`으로 변경 후, 필요한 곳에서만 명시적으로 `prefetch="intent"` 부여
  - FloatingWriteCTA 컴포넌트(`app/components/layout/FloatingWriteCTA.tsx`)의 글쓰기 링크에 `prefetch="none"` 명시

  **Must NOT do**:
  - SmartLink 컴포넌트의 타입/props 인터페이스 변경 금지 (기본값만 변경)
  - 개별 컴포넌트에서 명시적으로 지정한 prefetch 값을 덮어쓰지 않기

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 기본값 1줄 변경 + FloatingWriteCTA 확인
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 8, 10, 11)
  - **Blocks**: None
  - **Blocked By**: Task 3 (GlobalNav prefetch 먼저 변경)

  **References**:

  **Pattern References**:
  - `app/components/content/SmartLink.tsx:9` — `prefetch = "intent"` 기본값
  - `app/components/layout/FloatingWriteCTA.tsx` — 떠다니는 글쓰기 CTA (prefetch 확인 필요)

  **WHY Each Reference Matters**:
  - SmartLink의 기본값이 모든 Link 사용처에 전파됨 — 변경 영향 범위가 넓음
  - FloatingWriteCTA는 모든 페이지에 표시되므로 write 라우트 prefetch를 막아야 함

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: SmartLink 기본 prefetch 값 확인
    Tool: Bash
    Steps:
      1. `grep "prefetch" app/components/content/SmartLink.tsx`
    Expected Result: 기본값이 "viewport" 또는 "none" (intent가 아님)
    Failure Indicators: 기본값이 여전히 "intent"
    Evidence: .sisyphus/evidence/task-9-smartlink.txt

  Scenario: FloatingWriteCTA prefetch="none" 확인
    Tool: Bash
    Steps:
      1. `grep -A5 "prefetch" app/components/layout/FloatingWriteCTA.tsx`
    Expected Result: prefetch="none" 명시
    Failure Indicators: prefetch 미지정 또는 "intent"/"render"
    Evidence: .sisyphus/evidence/task-9-cta.txt
  ```

  **Commit**: YES
  - Message: `perf(prefetch): SmartLink 기본 prefetch 조정`
  - Files: `app/components/content/SmartLink.tsx`, `app/components/layout/FloatingWriteCTA.tsx`
  - Pre-commit: `pnpm typecheck`

- [x] 10. 고트래픽 자식 라우트 shouldRevalidate 추가

  **What to do**:
  - 현재 `shouldRevalidate`는 `_public.tsx`와 `_admin.tsx` 레이아웃에만 존재
  - 자식 라우트는 React Router 기본 revalidation → 매 GET 네비게이션마다 loader 재실행
  - **읽기 전용** 고트래픽 라우트에 `shouldRevalidate` 추가:
    - `app/routes/public/journey/index.tsx` — 여정 목록
    - `app/routes/public/logs/index.tsx` — 기록 목록
    - `app/routes/public/learners/index.tsx` — 러너 목록
    - `app/routes/public/challenges/index.tsx` — 챌린지 목록
  - 패턴: `_public.tsx`의 기존 패턴 복사 — POST/PUT/DELETE에서만 revalidation, GET에서는 스킵
  - 이로써 클라이언트 네비게이션 시 불필요한 loader 재호출 방지

  **Must NOT do**:
  - 쓰기/수정 라우트(write/, $recordSlug.edit)에 shouldRevalidate 추가 금지 — form action 후 데이터 갱신 필요
  - mutation 후 revalidation까지 막지 않기 (POST/PUT/DELETE는 반드시 revalidation)
  - 상세 페이지($stageSlug, $recordSlug 등)는 이번 스코프에서 제외

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 4개 파일에 동일 패턴 추가, revalidation 동작 이해 필요
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 8, 9, 11)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `app/routes/_public.tsx:71-84` — 기존 shouldRevalidate 패턴 (그대로 복사)

  **WHY Each Reference Matters**:
  - 이 패턴이 이미 검증된 표준이므로 그대로 사용 — mutation에서만 revalidation, GET에서 스킵

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: shouldRevalidate 함수 존재 확인
    Tool: Bash
    Steps:
      1. `grep -l "shouldRevalidate" app/routes/public/journey/index.tsx app/routes/public/logs/index.tsx app/routes/public/learners/index.tsx app/routes/public/challenges/index.tsx`
    Expected Result: 4개 파일 모두 출력
    Failure Indicators: 누락된 파일 존재
    Evidence: .sisyphus/evidence/task-10-revalidate.txt

  Scenario: 쓰기 라우트에 shouldRevalidate 없음 확인
    Tool: Bash
    Steps:
      1. `grep -l "shouldRevalidate" app/routes/public/write/*.tsx`
    Expected Result: 출력 없음 (쓰기 라우트에는 추가 안 함)
    Failure Indicators: write 라우트에 shouldRevalidate 존재
    Evidence: .sisyphus/evidence/task-10-write-safe.txt

  Scenario: 타입체크 + 테스트 통과
    Tool: Bash
    Steps:
      1. `pnpm typecheck && pnpm test`
    Expected Result: 모두 통과
    Evidence: .sisyphus/evidence/task-10-typecheck.txt
  ```

  **Commit**: YES
  - Message: `perf(revalidation): 고트래픽 라우트 shouldRevalidate 추가`
  - Files: `app/routes/public/journey/index.tsx`, `app/routes/public/logs/index.tsx`, `app/routes/public/learners/index.tsx`, `app/routes/public/challenges/index.tsx`
  - Pre-commit: `pnpm typecheck && pnpm test`

- [x] 11. 크리티컬 패스 loader dynamic → static import 전환

  **What to do**:
  - 크리티컬 패스 라우트의 loader에서 `await import("~/db/client.server")` 패턴을 정적 import로 전환
  - **대상 파일** (크리티컬 패스만):
    - `app/routes/_public.tsx` — 레이아웃 loader (5개 dynamic import)
    - `app/routes/public/index.tsx` — 홈 loader (5개 dynamic import)
  - **전환 패턴**:
    ```tsx
    // Before (loader 내부)
    const { db } = await import("~/db/client.server");
    const { stages, records } = await import("~/db/schema.server");
    
    // After (파일 상단)
    import { db } from "~/db/client.server";
    import { stages, records } from "~/db/schema.server";
    ```
  - `.server.ts` 접미사가 있는 모듈은 서버 번들에만 포함됨 — 클라이언트 번들에 누출 안 됨 (React Router 7 컨벤션)
  - 전환 후 `pnpm build` 로 클라이언트 번들에 서버 코드가 포함되지 않았는지 반드시 확인

  **Must NOT do**:
  - `.server.ts` 접미사가 **없는** 모듈을 정적 import하지 않기 (클라이언트 번들 누출 가능)
  - 크리티컬 패스 외 라우트 변경 금지 (follow-up)
  - 클라이언트 컴포넌트에서 서버 모듈 import 금지

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 서버/클라이언트 경계 정확한 이해 필요, 잘못하면 빌드 실패 또는 서버 코드 노출
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 8, 9, 10)
  - **Blocks**: None
  - **Blocked By**: Task 1 (baseline)

  **References**:

  **Pattern References**:
  - `app/routes/_public.tsx:11-15` — 레이아웃 loader의 5개 dynamic import
  - `app/routes/public/index.tsx:18-21` — 홈 loader의 4개 dynamic import (+ line 104의 getPlainText)
  - `app/routes/public/logs/index.tsx:63-66` — 참고용 (다른 라우트도 동일 패턴이지만 이번 스코프 외)

  **WHY Each Reference Matters**:
  - `.server.ts` 파일은 React Router 7의 서버 경계 컨벤션으로 보호됨 — 정적 import 안전
  - loader 내 dynamic import는 매 요청마다 모듈 해석 오버헤드 (CF Workers에서 sub-ms이지만 5개×2파일=축적)

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 크리티컬 패스에서 dynamic import 제거 확인
    Tool: Bash
    Steps:
      1. `grep -c "await import" app/routes/_public.tsx app/routes/public/index.tsx`
    Expected Result: 각 파일에서 0개 (loader 내 dynamic import 전부 제거)
    Failure Indicators: 1개 이상 남아있음
    Evidence: .sisyphus/evidence/task-11-static-import.txt

  Scenario: 빌드 성공 + 서버 코드 누출 없음
    Tool: Bash
    Steps:
      1. `pnpm build`
      2. `grep -r "drizzle" build/client/assets/ | head -5`
    Expected Result: 빌드 성공, 클라이언트 에셋에서 "drizzle" 문자열 없음
    Failure Indicators: 빌드 실패 또는 서버 코드가 클라이언트 번들에 포함
    Evidence: .sisyphus/evidence/task-11-build-check.txt

  Scenario: 타입체크 + 테스트 통과
    Tool: Bash
    Steps:
      1. `pnpm typecheck && pnpm test`
    Expected Result: 모두 통과
    Evidence: .sisyphus/evidence/task-11-typecheck.txt
  ```

  **Commit**: YES
  - Message: `perf(imports): 크리티컬 패스 loader static import 전환`
  - Files: `app/routes/_public.tsx`, `app/routes/public/index.tsx`
  - Pre-commit: `pnpm typecheck && pnpm build`

---

## Final Verification Wave

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.

- [x] F1. **Plan Compliance Audit** — `oracle`

  **What to do**:
  - `.sisyphus/plans/performance-optimization.md`를 처음부터 끝까지 읽기
  - "Must Have" 각 항목을 코드에서 직접 확인 (Read 도구로 파일 읽기, grep으로 패턴 검색)
  - "Must NOT Have" 각 항목을 코드베이스에서 금지 패턴 검색 — 발견 시 file:line과 함께 REJECT
  - `.sisyphus/evidence/` 디렉토리에 각 태스크 evidence 파일 존재 확인

  **QA Scenarios:**

  ```
  Scenario: Must Have 항목 검증
    Tool: Bash
    Steps:
      1. `grep "tracesSampleRate" workers/app.ts` — 0.1인지 확인
      2. `grep -c 'prefetch="render"' app/components/layout/GlobalNav.tsx` — 0인지 확인
      3. `grep "ak_" wrangler.toml wrangler.deploy.toml` — API 키 평문 없는지 확인
      4. `grep "shouldRevalidate" app/routes/public/journey/index.tsx app/routes/public/logs/index.tsx` — 존재 확인
      5. `grep "s-maxage\|Cache-Control" workers/app.ts app/entry.server.tsx` — 캐싱 코드 존재 확인
      6. `grep "React.lazy" app/routes/public/write/article.tsx` — lazy import 확인
      7. `grep -c "await import" app/routes/_public.tsx app/routes/public/index.tsx` — 0인지 확인
    Expected Result: 모든 Must Have 항목 충족
    Evidence: .sisyphus/evidence/f1-compliance.txt

  Scenario: Must NOT Have 금지 패턴 검색
    Tool: Bash
    Steps:
      1. `grep -rn "as any\|@ts-ignore\|@ts-expect-error" app/routes/_public.tsx app/routes/public/index.tsx workers/app.ts` — 0건
      2. `grep -rn "kv\|KV" wrangler.toml` — KV 바인딩 없는지 확인
    Expected Result: 금지 패턴 0건
    Evidence: .sisyphus/evidence/f1-forbidden.txt

  Scenario: Evidence 파일 존재
    Tool: Bash
    Steps:
      1. `ls .sisyphus/evidence/task-*.* | wc -l`
    Expected Result: 11개 이상의 evidence 파일 존재
    Evidence: .sisyphus/evidence/f1-evidence-list.txt
  ```

  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [x] F2. **Code Quality Review** — `unspecified-high`

  **What to do**:
  - `pnpm typecheck`(tsc --noEmit) + `pnpm test` 실행하여 빌드/테스트 통과 확인
  - 변경된 파일들에서 코드 품질 이슈 검사
  - AI slop 패턴 검사: 과도한 주석, 과도한 추상화, 제너릭 변수명

  **QA Scenarios:**

  ```
  Scenario: 타입체크 + 테스트 + 빌드 통과
    Tool: Bash
    Steps:
      1. `pnpm typecheck 2>&1 | tail -5`
      2. `pnpm test 2>&1 | tail -10`
      3. `pnpm build 2>&1 | tail -10`
    Expected Result: 세 명령 모두 exit code 0
    Failure Indicators: 에러 메시지 또는 non-zero exit
    Evidence: .sisyphus/evidence/f2-build-test.txt

  Scenario: 코드 품질 이슈 검사
    Tool: Bash
    Steps:
      1. `grep -rn "as any\|@ts-ignore\|console\.log" app/routes/_public.tsx app/routes/public/index.tsx app/db/queries/social/activity.server.ts workers/app.ts app/components/content/SmartLink.tsx app/components/layout/GlobalNav.tsx`
      2. `grep -rn "TODO\|FIXME\|HACK" app/routes/_public.tsx app/routes/public/index.tsx workers/app.ts`
    Expected Result: 0건 (또는 기존에 있던 것만)
    Evidence: .sisyphus/evidence/f2-quality.txt

  Scenario: 번들 크기 목표 확인
    Tool: Bash
    Steps:
      1. `pnpm build`
      2. `du -sh build/client/assets/*.js | sort -rh | head -5`
      3. `du -ch build/client/assets/*.js | tail -1` — 총 JS 크기
    Expected Result: 총 클라이언트 JS < baseline 대비 20% 감소
    Evidence: .sisyphus/evidence/f2-bundle-size.txt
  ```

  Output: `Build [PASS/FAIL] | Tests [N pass/N fail] | Quality [N clean/N issues] | VERDICT`

- [x] F3. **Real Manual QA** — `unspecified-high`

  **What to do**:
  - **먼저 `pnpm deploy`로 프로덕션 배포 실행** (모든 코드 변경이 적용된 상태)
  - 배포 후 각 태스크의 QA 시나리오를 순서대로 실행하고 evidence 캡처
  - 크로스 태스크 통합 테스트: 여러 최적화가 동시에 적용된 상태에서 정상 동작 확인
  - edge case 테스트: 미인증 접근, 잘못된 URL

  **QA Scenarios:**

  ```
  Scenario: 프로덕션 배포
    Tool: Bash
    Preconditions: 모든 Task 1-11 커밋 완료, pnpm build 성공, Task 4에서 `wrangler secret put ADAKRPOS_API_KEY` 완료
    Steps:
      1. `pnpm deploy`
      2. 배포 성공 확인 (exit code 0)
      3. 30초 대기 후 사이트 접근 가능 확인: `curl -o /dev/null -s -w "%{http_code}" https://divelog.ada-kr-pos.com/`
    Expected Result: 배포 성공, HTTP 200
    Failure Indicators: 배포 실패 또는 502/503 응답
    Evidence: .sisyphus/evidence/f3-deploy.txt

  Scenario: 배포 후 홈 페이지 데이터 섹션 완전성
    Tool: Bash
    Preconditions: 위 배포 시나리오 통과
    Steps:
      1. `curl -s https://divelog.ada-kr-pos.com/ | grep -c "data-testid"`
    Expected Result: 7개 이상의 data-testid 섹션 존재 (journey, activity, questions, records, sentence, learners, start-cta)
    Evidence: .sisyphus/evidence/f3-home-sections.txt

  Scenario: 배포 후 미인증 홈 TTFB 측정
    Tool: Bash
    Preconditions: 위 배포 시나리오 통과
    Steps:
      1. `for i in 1 2 3; do curl -o /dev/null -s -w "%{time_starttransfer}\n" https://divelog.ada-kr-pos.com/; done`
    Expected Result: 3회 평균 TTFB 값을 baseline(.sisyphus/evidence/task-1-baseline.md)과 비교하여 개선 확인
    Evidence: .sisyphus/evidence/f3-ttfb-final.txt

  Scenario: 배포 후 주요 페이지 200 응답 확인
    Tool: Bash
    Preconditions: 위 배포 시나리오 통과
    Steps:
      1. `for url in / /journey /logs /learners /challenges /guide; do echo -n "$url: "; curl -o /dev/null -s -w "%{http_code}\n" "https://divelog.ada-kr-pos.com$url"; done`
    Expected Result: 모든 페이지 200 응답
    Failure Indicators: 404, 500, 또는 리다이렉트
    Evidence: .sisyphus/evidence/f3-status-codes.txt

  Scenario: 배포 후 글쓰기 라우트 코드 무결성 확인
    Tool: Bash
    Preconditions: 위 배포 시나리오 통과
    Steps:
      1. `grep -c "ArticleEditor\|React.lazy\|Suspense" app/routes/public/write/article.tsx` — lazy 패턴 확인
      2. `curl -o /dev/null -s -w "%{http_code}" https://divelog.ada-kr-pos.com/write` — 글쓰기 인덱스 200 확인 (인증 리다이렉트 302도 정상)
    Expected Result: lazy 패턴 존재, /write 접근 시 200 또는 302 응답
    Evidence: .sisyphus/evidence/f3-write-check.txt

  Scenario: 배포 후 Cache-Control 헤더 검증
    Tool: Bash
    Preconditions: 위 배포 시나리오 통과
    Steps:
      1. `curl -sI https://divelog.ada-kr-pos.com/ | grep -i "cache-control"`
      2. `curl -sI https://divelog.ada-kr-pos.com/ | grep -i "vary"`
    Expected Result: Cache-Control에 s-maxage 포함, Vary에 Cookie 포함
    Failure Indicators: 헤더 없음
    Evidence: .sisyphus/evidence/f3-cache-headers.txt
  ```

  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [x] F4. **Scope Fidelity Check** — `deep`

  **What to do**:
  - `git diff` 로 변경된 모든 파일 목록 확인
  - 각 태스크의 "Files" 목록과 실제 변경 파일 비교 — 스코프 외 변경 감지
  - "Must NOT do" 항목별 위반 검사
  - 태스크 간 오염 감지: Task N이 Task M의 파일을 수정했는지

  **QA Scenarios:**

  ```
  Scenario: 변경 파일 목록 추출
    Tool: Bash
    Steps:
      1. `git diff --name-only HEAD~11..HEAD` (또는 작업 시작 커밋부터)
      2. 변경 파일 목록을 플랜의 Commit Strategy 테이블과 대조
    Expected Result: 플랜에 명시된 파일만 변경됨
    Failure Indicators: 플랜에 없는 파일이 변경됨
    Evidence: .sisyphus/evidence/f4-changed-files.txt

  Scenario: 스코프 외 변경 감지
    Tool: Bash
    Steps:
      1. `git diff --name-only HEAD~11..HEAD | grep -v -E "(workers/app|_public|public/index|activity\.server|GlobalNav|SmartLink|FloatingWriteCTA|wrangler\.toml|article\.tsx|recordSlug\.edit|journey/index|logs/index|learners/index|challenges/index|\.sisyphus/)"` 
    Expected Result: 출력 없음 (스코프 외 파일 변경 0건)
    Failure Indicators: 예상 외 파일 변경
    Evidence: .sisyphus/evidence/f4-scope-check.txt

  Scenario: 라우트 URL 변경 없음 확인
    Tool: Bash
    Steps:
      1. `git diff HEAD~11..HEAD -- app/routes/ | grep "^[+-].*path\|^[+-].*pattern" | head -20`
    Expected Result: 라우트 경로 변경 0건
    Evidence: .sisyphus/evidence/f4-routes-unchanged.txt
  ```

  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

| Order | Commit | Files | Pre-commit check |
|-------|--------|-------|------------------|
| 1 | `perf(baseline): 성능 베이스라인 측정 및 기록` | `.sisyphus/evidence/` | — |
| 2 | `perf(sentry): trace sampling 1.0→0.1 축소` | `workers/app.ts` | `pnpm typecheck` |
| 3 | `perf(nav): GlobalNav prefetch render→intent 변경` | `app/components/layout/GlobalNav.tsx` | `pnpm typecheck` |
| 4 | `security(config): API 키 wrangler secret 이관` | `wrangler.toml`, `wrangler.deploy.toml` | `pnpm deploy` (secret 등록 후) |
| 5 | `perf(home): redundant stageCohort 쿼리 제거` | `app/routes/public/index.tsx`, `app/db/queries/social/activity.server.ts` | `pnpm typecheck && pnpm test` |
| 6 | `perf(home): 4단 DB 워터폴 → 2단 병렬화` | `app/routes/public/index.tsx` | `pnpm typecheck && pnpm test` |
| 7 | `perf(ssr): 미인증 SSR HTML Cache-Control 추가` | `workers/app.ts` 또는 `app/entry.server.tsx` | `pnpm typecheck` |
| 8 | `perf(bundle): ArticleEditor React.lazy 전환` | `app/routes/public/write/article.tsx`, `app/routes/public/logs/$recordSlug.edit.tsx` | `pnpm build` |
| 9 | `perf(prefetch): SmartLink 기본 prefetch 조정` | `app/components/content/SmartLink.tsx`, `app/components/layout/FloatingWriteCTA.tsx` | `pnpm typecheck` |
| 10 | `perf(revalidation): 고트래픽 라우트 shouldRevalidate 추가` | `app/routes/public/journey/index.tsx`, `app/routes/public/logs/index.tsx` 등 | `pnpm typecheck && pnpm test` |
| 11 | `perf(imports): 크리티컬 패스 loader static import 전환` | `app/routes/_public.tsx`, `app/routes/public/index.tsx` 등 | `pnpm typecheck && pnpm build` |

---

## Success Criteria

### Verification Commands
```bash
# TTFB 측정 (미인증, 3회 평균)
for i in 1 2 3; do curl -o /dev/null -s -w "TTFB: %{time_starttransfer}s\n" https://divelog.ada-kr-pos.com/; done

# 빌드 크기 확인
pnpm build 2>&1 | tail -20

# 타입체크 + 테스트
pnpm typecheck && pnpm test

# 캐시 헤더 확인 (미인증)
curl -sI https://divelog.ada-kr-pos.com/ | grep -i cache-control

# Sentry 샘플링 확인
grep -r "tracesSampleRate" workers/app.ts
```

### Final Checklist
- [ ] 미인증 TTFB < 800ms (3회 평균)
- [ ] 클라이언트 JS < 400KB (전송 기준)
- [ ] `pnpm typecheck` 통과
- [ ] `pnpm test` 통과
- [ ] `pnpm build` 성공
- [ ] 인증/미인증 모두 정상 렌더링
- [ ] form action (쓰기/수정/설정) 정상 동작
- [ ] Cache-Control 헤더 미인증 응답에 존재
- [ ] Sentry tracesSampleRate = 0.1
- [ ] wrangler.toml, wrangler.deploy.toml에 API 키 평문 없음
