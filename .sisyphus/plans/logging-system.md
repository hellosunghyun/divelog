# 코드베이스 전반 구조화 로깅 시스템 구축

## TL;DR

> **Quick Summary**: 현재 console.error 2개뿐인 블랙박스 상태의 코드베이스에 JSON 구조화 로깅을 전면 도입한다. 커스텀 로거 유틸리티 → worker 진입점 → 인증 → silent catch 수정 → 전체 route 순으로 계층적 적용.
> 
> **Deliverables**:
> - `app/lib/logger.server.ts` — 외부 의존성 없는 JSON 구조화 로거 유틸리티
> - `app/lib/__tests__/logger.server.test.ts` — 로거 단위 테스트
> - `workers/app.ts` — 전체 요청 로깅 + 에러 캐치 (최고 영향도)
> - 인증 플로우 로깅 (auth.server.ts, auth.middleware.ts)
> - 9개 server-side silent catch 블록 수정
> - 51개 route 파일 loader/action 로깅
> - `wrangler.toml` LOG_LEVEL 환경변수 추가
> 
> **Estimated Effort**: Large
> **Parallel Execution**: YES - 4 waves
> **Critical Path**: Task 1 → Task 3 → Task 6 → Task 9 → Final

---

## Context

### Original Request
코드베이스 전반적으로 로깅이 부족해서 모든 활동이 잘 기록되도록 로깅을 넣고, 규칙도 잘 정해달라는 요청.

### Interview Summary
**Key Discussions**:
- 로깅 목적: 디버깅, 감사(audit), 성능 모니터링, 보안 이벤트 — 4가지 전부
- 로그 출력: console 로그만 (wrangler tail / CF dashboard)
- 포맷: JSON 구조화 로그
- 레벨: 포괄적 (DEBUG/INFO/WARN/ERROR) + 환경변수 레벨 제어
- 세부사항은 조사 결과 기반 best practice 적용

**Research Findings**:
- 현재 상태: console.error 2개, silent catch 18개(server 9 + client 7 + 이미 로깅 1 + validation 1), 로깅 라이브러리 0개
- 49개 route 파일의 65개 loader/action에 로깅 0개
- 30개 DB 쿼리 모듈에 로깅 0개
- 인증 플로우 (외부 API, 재시도, 캐시) 전부 silent
- wrangler.toml observability 활성화됨 but 앱 레벨에서 미활용
- `cf-ray` 헤더로 무료 request ID 확보 가능
- `performance.now()` CF Workers에서 사용 가능 확인

### Metis Review
**Identified Gaps** (addressed):
- Silent catch 수를 18 → 9(server-side)로 정정. Client-side 7개는 스코프 아웃
- DB 쿼리 모듈에 try/catch 추가 금지 — loader/action 경계에서 로깅
- `cf-ray` 헤더 + `crypto.randomUUID()` 폴백 패턴 적용
- React Router의 Response throw vs Error throw 구분 필요
- 로거 자체의 infallibility (순환 참조, 대용량 값 대응)
- LOG_LEVEL 환경변수 + pnpm cf-typegen 재생성 필요
- 기존 debugCache 패턴은 유지 (교체 아님)

---

## Work Objectives

### Core Objective
코드베이스의 모든 서버 활동을 JSON 구조화 로그로 기록하여, wrangler tail / CF dashboard에서 요청 추적, 에러 디버깅, 성능 측정, 보안 이벤트 감지가 가능한 상태로 만든다.

### Concrete Deliverables
- `app/lib/logger.server.ts` — createLogger 팩토리, child logger, 타이밍 유틸, 민감정보 마스킹
- `app/lib/__tests__/logger.server.test.ts` — 로거 단위 테스트
- `wrangler.toml` [vars] LOG_LEVEL 추가 + worker-configuration.d.ts 재생성
- `workers/app.ts` — 전체 요청 래핑 (entry/exit/error 로깅 + 타이밍)
- `app/lib/auth.server.ts` — API 호출, 캐시 히트/미스, 재시도, 에러 로깅
- `app/lib/auth.middleware.ts` — 인증 성공/실패/리다이렉트 로깅
- 9개 silent catch 블록 → 적절한 로그 레벨로 수정
- 51개 route 파일 loader/action에 로거 주입

### Definition of Done
- [ ] `pnpm typecheck` → 에러 0
- [ ] `pnpm test` → 로거 테스트 포함 전체 통과
- [ ] `pnpm build` → 빌드 성공
- [ ] 모든 loader에 진입 로그, 모든 action에 진입+완료 로그 존재
- [ ] 모든 server-side catch 블록에 로그 호출 존재
- [ ] `wrangler tail`에서 JSON 구조화 로그 확인 가능

### Must Have
- JSON 구조화 포맷: `{ level, timestamp, message, requestId, route, method, userId?, durationMs?, error? }`
- 환경변수 기반 레벨 제어 (LOG_LEVEL)
- Request ID: `cf-ray` 헤더 우선, `crypto.randomUUID()` 폴백
- `performance.now()` 기반 소요시간 측정
- 민감정보 마스킹 (세션 토큰, API 키)
- 로거 infallibility — 로거 자체가 절대 throw하지 않음
- Response throw vs Error throw 구분 (React Router 패턴)

### Must NOT Have (Guardrails)
- ❌ DB 쿼리 모듈(30개)에 try/catch 추가 — 에러는 loader/action 경계에서 캐치
- ❌ Client-side 컴포넌트 터치 (ArticleEditor, SlashCommandMenu, MentionExtension, RecordRefExtension)
- ❌ 외부 npm 의존성 추가 — 순수 TypeScript, Web API만 사용
- ❌ loader/action 시그니처를 바꾸는 HOF/wrapper 패턴
- ❌ 기존 `debugCache` WeakMap 패턴 교체 — 보완만
- ❌ Response 헤더에 request ID 노출 (보안)
- ❌ D1 audit 테이블, 외부 로그 서비스, 대시보드
- ❌ `as any`, `@ts-ignore`, `@ts-expect-error` 사용
- ❌ 에러 핸들링 동작 변경 — 로그 추가만, return 값/throw 패턴 불변

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: YES (vitest 설정 존재)
- **Automated tests**: YES (TDD for logger utility, tests-after for integration)
- **Framework**: vitest (environment: "node" — CF 특정 API 불필요)
- **Logger TDD**: RED (failing test) → GREEN (minimal impl) → REFACTOR

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Logger utility**: vitest — spy on console.*, parse JSON output, assert structure
- **Route logging**: Bash (grep) — verify logger import/usage in all route files
- **Build verification**: Bash — `pnpm typecheck && pnpm test && pnpm build`

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation — start immediately):
├── Task 1: Logger utility + TDD tests [deep]
└── Task 2: LOG_LEVEL 환경변수 + 타입 재생성 [quick]

Wave 2 (Core instrumentation — after Wave 1):
├── Task 3: Worker entry point 로깅 (workers/app.ts) [quick]
├── Task 4: Auth module 로깅 (auth.server.ts + auth.middleware.ts) [unspecified-high]
├── Task 5: Silent catch 수정 — lib/ 파일 5개 [quick]
└── Task 6: Silent catch 수정 + Public layout 로깅 — route 파일 4개 [unspecified-high]

Wave 3 (Full coverage — after Wave 2):
├── Task 7: Public read route 로깅 (15개 route) [unspecified-high]
├── Task 8: Public action route 로깅 (inbox, settings, me) [quick]
├── Task 9: Admin route 로깅 (22개 route) [unspecified-high]
└── Task 10: API route 로깅 (4개 route) [quick]

Wave FINAL (Verification — after ALL tasks):
├── Task F1: Plan compliance audit [oracle]
├── Task F2: Code quality review [unspecified-high]
├── Task F3: Real QA [unspecified-high]
└── Task F4: Scope fidelity check [deep]

Critical Path: Task 1 → Task 3 → Task 7 → F1-F4
Parallel Speedup: ~60% faster than sequential
Max Concurrent: 4 (Waves 2 & 3)
```

### Dependency Matrix

| Task | Depends On | Blocks | Wave |
|------|-----------|--------|------|
| 1 | — | 3, 4, 5, 6, 7, 8, 9, 10 | 1 |
| 2 | — | 3 | 1 |
| 3 | 1, 2 | 7, 8, 9, 10 | 2 |
| 4 | 1 | — | 2 |
| 5 | 1 | — | 2 |
| 6 | 1 | — | 2 |
| 7 | 3 | — | 3 |
| 8 | 3 | — | 3 |
| 9 | 3 | — | 3 |
| 10 | 3 | — | 3 |
| F1-F4 | ALL | — | FINAL |

### Agent Dispatch Summary

- **Wave 1**: 2 tasks — T1 → `deep`, T2 → `quick`
- **Wave 2**: 4 tasks — T3 → `quick`, T4 → `unspecified-high`, T5 → `quick`, T6 → `unspecified-high`
- **Wave 3**: 4 tasks — T7 → `unspecified-high`, T8 → `quick`, T9 → `unspecified-high`, T10 → `quick`
- **FINAL**: 4 tasks — F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `deep`

---

## TODOs

- [x] 1. Logger 유틸리티 + TDD 단위 테스트

  **What to do**:
  - `app/lib/logger.server.ts` 생성 — 외부 의존성 없는 JSON 구조화 로거
  - **API 설계**:
    - `createLogger(request: Request, env: { LOG_LEVEL?: string })` → Logger 인스턴스
    - `logger.debug(message, data?)` / `.info()` / `.warn()` / `.error()`
    - `logger.child(context)` → 추가 컨텍스트가 주입된 자식 로거
    - `logger.time(label)` → 타이머 시작, `logger.timeEnd(label)` → durationMs와 함께 로그 출력
  - **JSON 출력 구조**: `{ level, timestamp, message, requestId, ...context, ...data }`
  - **Request ID**: `request.headers.get('cf-ray') ?? crypto.randomUUID()` — `WeakMap<Request, string>` 캐싱 (auth.server.ts 패턴 따름)
  - **레벨 제어**: `env.LOG_LEVEL` (기본: production `INFO`, dev `DEBUG`). DEBUG < INFO < WARN < ERROR 순서
  - **민감정보 마스킹**: `sanitize()` 내부 함수 — `adakrpos_session=xxx` → `adakrpos_session=***`, API 키 패턴 마스킹, email 주소 마스킹
  - **Infallibility**: 모든 public 메서드에 내부 try/catch — 순환 참조, undefined, Symbol 등에도 throw 안 함
  - **Safe JSON serialization**: 순환 참조 감지 + 1KB 초과 문자열 truncation
  - TDD: 테스트 먼저 작성 (`app/lib/__tests__/logger.server.test.ts`)
    - JSON 출력 포맷 검증 (console.log spy → JSON.parse)
    - 레벨 필터링 검증 (WARN일 때 DEBUG/INFO 무출력)
    - 민감정보 마스킹 검증 (`"adakrpos_session=abc123"` → `"adakrpos_session=***"`)
    - Infallibility 검증 (순환 참조 객체 전달 → throw 안 함)
    - child logger 컨텍스트 상속 검증
    - time/timeEnd 검증 (durationMs > 0)

  **Must NOT do**:
  - 외부 npm 패키지 추가 금지
  - Node.js 전용 API 사용 금지 (fs, process.env 등 — import.meta.env 사용)
  - async 로깅 금지 (모든 로그는 동기적)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: TDD 패턴 + 에지 케이스 처리(순환 참조, truncation, infallibility) 등 정교한 구현 필요
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `frontend-design`: 서버 유틸리티, UI 무관

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 2)
  - **Blocks**: Tasks 3, 4, 5, 6, 7, 8, 9, 10
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `app/lib/auth.server.ts:1-20` — WeakMap<Request, T> 캐싱 패턴. request ID도 이 패턴으로 요청당 1회 생성
  - `app/db/client.server.ts` — `db(d1: D1Database)` 팩토리 패턴. createLogger도 비슷한 팩토리 구조
  - `app/lib/auth.server.ts:60-96` — debugCache WeakMap 사용 예시. 이 패턴을 참고하되 교체하지 않음

  **Test References**:
  - `app/lib/__tests__/` — 기존 테스트 디렉토리 구조. vitest, describe/it/expect 패턴

  **API/Type References**:
  - `worker-configuration.d.ts` — Env 타입 정의. LOG_LEVEL이 추가될 위치 (Task 2에서 처리)
  - `wrangler.toml:32-35` — 이미 활성화된 observability 설정

  **External References**:
  - CF Workers에서 `performance.now()` 사용 가능 — `worker-configuration.d.ts:430` Performance 타입 확인됨
  - CF Workers 로그 메시지 최대 128KB 제한 — 대용량 값 truncation 필요

  **Acceptance Criteria**:

  - [ ] `app/lib/logger.server.ts` 파일 존재
  - [ ] `app/lib/__tests__/logger.server.test.ts` 파일 존재
  - [ ] `pnpm test -- logger` → 전체 통과 (최소 8개 테스트)

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: JSON 구조화 출력 검증
    Tool: Bash (pnpm vitest)
    Preconditions: logger.server.test.ts 작성 완료
    Steps:
      1. pnpm vitest run app/lib/__tests__/logger.server.test.ts --reporter=verbose
      2. 테스트 내부에서 vi.spyOn(console, 'log') 후 createLogger().info("test") 호출
      3. spy 호출 인자를 JSON.parse하여 level, timestamp, message, requestId 키 존재 확인
    Expected Result: 모든 테스트 PASS, JSON 구조 { level: "INFO", timestamp: string, message: "test", requestId: string }
    Failure Indicators: 테스트 FAIL 또는 JSON.parse 에러
    Evidence: .sisyphus/evidence/task-1-json-format.txt

  Scenario: Infallibility — 순환 참조 전달 시 throw 안 함
    Tool: Bash (pnpm vitest)
    Preconditions: infallibility 테스트 작성 완료
    Steps:
      1. 테스트에서 const circular = {}; circular.self = circular; logger.error("test", circular) 호출
      2. expect(() => logger.error("test", circular)).not.toThrow() 검증
    Expected Result: throw 없이 정상 완료, 로그에 [Circular] 또는 truncated 표시
    Failure Indicators: TypeError: Converting circular structure to JSON
    Evidence: .sisyphus/evidence/task-1-infallibility.txt

  Scenario: 민감정보 마스킹
    Tool: Bash (pnpm vitest)
    Preconditions: masking 테스트 작성 완료
    Steps:
      1. logger.info("cookie", { value: "adakrpos_session=abc123def" }) 호출
      2. spy 출력에서 "abc123def" 문자열이 없고 "***"가 포함됨을 검증
    Expected Result: 세션 토큰 값이 마스킹됨
    Failure Indicators: 원본 토큰 값이 로그에 노출
    Evidence: .sisyphus/evidence/task-1-masking.txt
  ```

  **Commit**: YES
  - Message: `feat(logging): JSON 구조화 로거 유틸리티 + 단위 테스트`
  - Files: `app/lib/logger.server.ts`, `app/lib/__tests__/logger.server.test.ts`
  - Pre-commit: `pnpm test -- logger`

- [x] 2. LOG_LEVEL 환경변수 + 타입 재생성

  **What to do**:
  - `wrangler.toml` [vars] 섹션에 `LOG_LEVEL = "INFO"` 추가
  - `.dev.vars`에 `LOG_LEVEL=DEBUG` 추가 (개발 환경)
  - `pnpm cf-typegen` 실행하여 `worker-configuration.d.ts` 재생성
  - Env 타입에 `LOG_LEVEL` 포함 확인
  - 기존 코드에서 `(context.cloudflare.env as { ADMIN_EMAILS?: string })` 같은 캐스트 패턴이 있으나, LOG_LEVEL은 정식으로 [vars]에 추가하여 타입 안전하게 처리

  **Must NOT do**:
  - Env 타입을 수동 편집 금지 — cf-typegen이 자동 생성

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 설정 파일 수정 + 명령어 1개 실행
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 1)
  - **Blocks**: Task 3
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `wrangler.toml:1-35` — 현재 vars, bindings, observability 설정
  - `.dev.vars` — 개발 환경 변수 (ADAKRPOS_API_KEY, ADMIN_USER_ID, TEST_*_SESSION 등)

  **API/Type References**:
  - `worker-configuration.d.ts` — Env interface. cf-typegen 재실행 후 LOG_LEVEL이 여기에 나타나야 함

  **Acceptance Criteria**:

  - [ ] `wrangler.toml` [vars]에 LOG_LEVEL 존재
  - [ ] `.dev.vars`에 LOG_LEVEL=DEBUG 존재
  - [ ] `pnpm typecheck` → 에러 0

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: LOG_LEVEL 타입 안전성 검증
    Tool: Bash
    Preconditions: cf-typegen 실행 완료
    Steps:
      1. grep "LOG_LEVEL" worker-configuration.d.ts
      2. pnpm typecheck
    Expected Result: worker-configuration.d.ts에 LOG_LEVEL: string 포함, typecheck 통과
    Failure Indicators: LOG_LEVEL 미포함 또는 typecheck 실패
    Evidence: .sisyphus/evidence/task-2-env-type.txt

  Scenario: wrangler.toml 유효성 검증
    Tool: Bash
    Preconditions: wrangler.toml 수정 완료
    Steps:
      1. grep -A1 '\[vars\]' wrangler.toml 실행
      2. LOG_LEVEL = "INFO" 존재 확인
    Expected Result: [vars] 섹션에 LOG_LEVEL 설정 존재
    Failure Indicators: LOG_LEVEL 미존재
    Evidence: .sisyphus/evidence/task-2-wrangler-vars.txt
  ```

  **Commit**: YES
  - Message: `chore(config): LOG_LEVEL 환경변수 추가`
  - Files: `wrangler.toml`, `.dev.vars`, `worker-configuration.d.ts`
  - Pre-commit: `pnpm typecheck`

- [x] 3. Worker entry point 전체 요청 로깅

  **What to do**:
  - `workers/app.ts`에서 `requestHandler` 호출을 try/catch + 타이밍으로 래핑
  - **진입 로그**: `logger.info("request_start", { method, url, userAgent })`
  - **완료 로그**: `logger.info("request_end", { method, url, status, durationMs })`
  - **에러 로그**: Response throw (React Router redirect/error) vs Error throw 구분
    - `instanceof Response` → `logger.info("request_response_throw", { status })` (redirect는 정상 동작)
    - `instanceof Error` → `logger.error("request_error", { error: err.message, stack: err.stack })`
    - 기타 → `logger.error("request_unknown_error", { value: String(thrown) })`
  - createLogger에 request, env 전달하여 requestId(cf-ray) 자동 주입
  - 이 단일 변경이 **전체 앱의 모든 미처리 에러를 캡처** — 최고 영향도 태스크

  **Must NOT do**:
  - loader/action 개별 래핑 금지 (이 태스크는 entry point만)
  - Response throw를 ERROR 레벨로 로깅 금지 (redirect는 정상 동작)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 단일 파일, 명확한 패턴. try/catch + createLogger 주입
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 4, 5, 6)
  - **Blocks**: Tasks 7, 8, 9, 10
  - **Blocked By**: Tasks 1, 2

  **References**:

  **Pattern References**:
  - `workers/app.ts` — 현재 worker entry point. requestHandler 호출 위치 확인
  - `app/lib/logger.server.ts` — Task 1에서 생성될 createLogger API

  **API/Type References**:
  - React Router 7에서 `throw redirect()` → Response 객체, `throw data()` → Response 객체. instanceof Response로 구분

  **Acceptance Criteria**:

  - [ ] `workers/app.ts`에 createLogger import 존재
  - [ ] try/catch + 타이밍 래핑 존재
  - [ ] `pnpm typecheck && pnpm build` → 성공

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Entry point 로깅 구조 검증
    Tool: Bash (grep)
    Preconditions: workers/app.ts 수정 완료
    Steps:
      1. grep "createLogger" workers/app.ts
      2. grep "request_start" workers/app.ts
      3. grep "request_end" workers/app.ts
      4. grep "request_error" workers/app.ts
      5. pnpm typecheck && pnpm build
    Expected Result: 4개 패턴 모두 존재, typecheck + build 통과
    Failure Indicators: 패턴 미존재 또는 빌드 실패
    Evidence: .sisyphus/evidence/task-3-entry-logging.txt

  Scenario: Response throw vs Error throw 구분 검증
    Tool: Bash (grep)
    Preconditions: workers/app.ts 수정 완료
    Steps:
      1. grep "instanceof Response" workers/app.ts
      2. grep "instanceof Error" workers/app.ts
    Expected Result: 두 가지 분기 모두 존재
    Failure Indicators: 분기 없이 모든 throw를 ERROR로 처리
    Evidence: .sisyphus/evidence/task-3-throw-distinction.txt
  ```

  **Commit**: YES
  - Message: `feat(logging): worker entry point 전체 요청 로깅`
  - Files: `workers/app.ts`
  - Pre-commit: `pnpm typecheck && pnpm build`

- [x] 4. Auth module 로깅

  **What to do**:
  - **`app/lib/auth.server.ts`**:
    - `getAuth()` 진입: `logger.debug("auth_verify_start")`
    - WeakMap 캐시 히트: `logger.debug("auth_cache_hit")`
    - 외부 API 호출: `logger.info("auth_api_call", { url, attempt })` + 타이밍
    - API 응답: `logger.info("auth_api_response", { status, durationMs })`
    - 재시도: `logger.warn("auth_api_retry", { attempt, error })`
    - 타임아웃: `logger.warn("auth_api_timeout", { timeoutMs: 3000 })`
    - 인증 성공: `logger.info("auth_success", { userId, isVerified })`
    - 인증 실패: `logger.info("auth_unauthenticated")` (WARN 아님 — 미인증은 정상 동작)
    - 에러: `logger.error("auth_error", { error })` — 기존 catch 블록(line 18, 83)에 추가
    - **debugCache 유지** — 로거는 보완, 교체 아님
  - **`app/lib/auth.middleware.ts`**:
    - `getOptionalUser()`: catch 블록(line 23)에 `logger.warn("auth_optional_error", { error })` 추가
    - `requireAuth()`: 인증 성공 `logger.debug`, 리다이렉트 `logger.info("auth_redirect", { returnUrl })`
    - `requireVerified()`: 검증 실패 `logger.info("auth_unverified_redirect")`
    - `requireRole()`: 역할 없음 `logger.info("auth_role_denied", { requiredRole })`
    - `bootstrapAdmin()`: 실행 `logger.info("admin_bootstrap", { userId })`
    - `ensureAdminByEmail()`: 역할 부여 `logger.info("admin_email_grant", { email: MASKED })`

  **Must NOT do**:
  - debugCache WeakMap 제거/교체 금지
  - getAuth의 return 값 변경 금지
  - error handling 동작 변경 금지 (로그만 추가)
  - email 주소 로그에 원문 노출 금지

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 2개 파일, 인증 로직 이해 필요, 기존 패턴 보존하며 로깅 주입
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 3, 5, 6)
  - **Blocks**: None
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `app/lib/auth.server.ts:1-96` — 전체 파일. WeakMap 캐시(line 4), getAuth 함수(line 6-96), debugCache(line 67-88)
  - `app/lib/auth.middleware.ts:1-150` — 전체 파일. getOptionalUser(line 10-25), requireAuth(line 27-50), requireVerified, requireRole, bootstrapAdmin, ensureAdminByEmail

  **API/Type References**:
  - `app/lib/logger.server.ts` — Task 1에서 생성될 createLogger, child, time/timeEnd API
  - `.docs/auth.md` — 인증 아키텍처 설명. verifyRequest 패턴, 에러 코드

  **Acceptance Criteria**:

  - [ ] `auth.server.ts`에 logger import 존재
  - [ ] `auth.middleware.ts`에 logger import 존재
  - [ ] 기존 2개 catch 블록에 로거 호출 추가됨
  - [ ] `pnpm typecheck` → 성공

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Auth 모듈 로깅 완전성 검증
    Tool: Bash (grep)
    Preconditions: auth 파일 수정 완료
    Steps:
      1. grep -c "logger\." app/lib/auth.server.ts → 최소 8개
      2. grep -c "logger\." app/lib/auth.middleware.ts → 최소 6개
      3. grep "debugCache" app/lib/auth.server.ts → 여전히 존재
      4. pnpm typecheck
    Expected Result: 로거 호출 충분, debugCache 유지, typecheck 통과
    Failure Indicators: 로거 호출 부족, debugCache 제거됨, typecheck 실패
    Evidence: .sisyphus/evidence/task-4-auth-logging.txt

  Scenario: 민감정보 비노출 검증
    Tool: Bash (grep)
    Preconditions: auth 파일 수정 완료
    Steps:
      1. grep -n "ADAKRPOS_API_KEY" app/lib/auth.server.ts에서 logger 호출 인자에 포함 안 됨 확인
      2. grep -n "email" app/lib/auth.middleware.ts의 logger 호출에서 MASKED 또는 마스킹 함수 사용 확인
    Expected Result: API 키, 이메일 원문이 logger 호출에 직접 전달되지 않음
    Failure Indicators: 민감정보가 logger에 직접 전달됨
    Evidence: .sisyphus/evidence/task-4-auth-sensitive.txt
  ```

  **Commit**: YES
  - Message: `feat(logging): auth module 로깅 (API 호출, 캐시, 재시도)`
  - Files: `app/lib/auth.server.ts`, `app/lib/auth.middleware.ts`
  - Pre-commit: `pnpm typecheck`

- [x] 5. Silent catch 수정 — lib/ 파일들

  **What to do**:
  - 5개 server-side silent catch 블록에 적절한 레벨의 로깅 추가
  - 각 catch 블록의 **기존 동작은 절대 변경하지 않음** — 로그만 추가
  - 수정 대상:
    1. `app/lib/auth.server.ts:18` — `catch { return match[1] }` → `logger.debug("auth_cookie_decode_fallback")` 추가
    2. `app/lib/auth.server.ts:83` — `catch (e) { debugCache.set(...) }` → `logger.warn("auth_verify_error", { error: e })` 추가
    3. `app/lib/content.server.ts:221` — `catch {}` (parseTiptapDocument) → `logger.warn("content_parse_error")` 추가
    4. `app/lib/r2-cleanup.server.ts:40` — `catch { return [] }` → `logger.warn("r2_cleanup_parse_error")` 추가
    5. `app/lib/extract-references.server.ts:31` — `catch {}` → `logger.warn("reference_extract_error")` 추가
  - **참고**: `content.server.ts:63`은 이미 console.error 있음 → logger.error로 마이그레이션
  - **참고**: `validation.ts:38`은 Zod issue 변환이므로 변경 불필요 (정상 동작)
  - 각 파일 상단에 createLogger import 추가. 이 파일들은 request 컨텍스트가 없는 유틸이므로 request 없이 기본 로거 사용 (requestId 없음) 또는 함수 파라미터로 logger를 전달받는 패턴 선택

  **Must NOT do**:
  - return 값 변경 금지
  - throw 동작 추가/변경 금지
  - validation.ts 수정 금지
  - client-side 파일(editor) 수정 금지

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 5개 catch 블록에 각 1줄 로거 호출 추가. 패턴 반복 작업
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 3, 4, 6)
  - **Blocks**: None
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `app/lib/auth.server.ts:18` — decodeURIComponent catch. 현재: silent fallback
  - `app/lib/auth.server.ts:83` — verifyRequest catch. 현재: debugCache에만 저장
  - `app/lib/content.server.ts:63` — 이미 console.error 있는 catch. 마이그레이션 대상
  - `app/lib/content.server.ts:221` — parseTiptapDocument catch. 현재: returns null silently
  - `app/lib/r2-cleanup.server.ts:40` — JSON.parse catch. 현재: returns []
  - `app/lib/extract-references.server.ts:31` — reference extraction catch. 현재: silent

  **Acceptance Criteria**:

  - [ ] 5개 catch 블록 모두에 logger 호출 존재
  - [ ] content.server.ts:63의 console.error → logger.error 마이그레이션
  - [ ] `pnpm typecheck` → 성공

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Silent catch 수정 완전성 검증
    Tool: Bash (grep)
    Preconditions: 5개 파일 수정 완료
    Steps:
      1. grep -n "catch" app/lib/auth.server.ts | 각 catch 블록 내 logger 호출 확인
      2. grep -n "catch" app/lib/content.server.ts | 각 catch 블록 내 logger 호출 확인
      3. grep -n "catch" app/lib/r2-cleanup.server.ts | logger 호출 확인
      4. grep -n "catch" app/lib/extract-references.server.ts | logger 호출 확인
      5. grep "console.error" app/lib/content.server.ts → 0개 (logger로 마이그레이션)
      6. pnpm typecheck
    Expected Result: 모든 server-side catch에 logger 호출, console.error 제거, typecheck 통과
    Failure Indicators: catch 블록에 logger 미존재, console.error 잔존
    Evidence: .sisyphus/evidence/task-5-silent-catches.txt

  Scenario: 기존 동작 보존 검증
    Tool: Bash (grep)
    Preconditions: 수정 완료
    Steps:
      1. auth.server.ts:18 근처에서 return match[1] 여전히 존재 확인
      2. r2-cleanup.server.ts:40 근처에서 return [] 여전히 존재 확인
      3. pnpm test (기존 테스트 전부 통과)
    Expected Result: return 값 불변, 기존 테스트 통과
    Failure Indicators: return 값 변경됨 또는 테스트 실패
    Evidence: .sisyphus/evidence/task-5-behavior-preserved.txt
  ```

  **Commit**: YES (groups with 4)
  - Message: `fix(logging): lib/ silent catch 블록 로깅 추가`
  - Files: `app/lib/content.server.ts`, `app/lib/r2-cleanup.server.ts`, `app/lib/extract-references.server.ts`
  - Pre-commit: `pnpm typecheck`

- [x] 6. Route silent catch 수정 + Public layout/write 로깅

  **What to do**:
  - **Silent catch 수정** (4개):
    1. `app/routes/_public.tsx:18` — `.catch(() => {})` → `.catch((err) => logger.error("background_task_error", { error: err }))`. waitUntil 컨텍스트이므로 logger를 미리 생성하여 클로저로 캡처
    2. `app/routes/_public.write.tsx:61` — `catch {}` (JSON.parse) → `logger.debug("write_content_parse_fallback")` 추가
    3. `app/routes/_public.logs.$recordSlug.edit.tsx:86` — `catch {}` → `logger.debug("edit_content_parse_fallback")` 추가
    4. `app/routes/_public.logs.$recordSlug.tsx` — action의 catch 블록(있다면) 수정
  - **Loader/Action 로깅 추가** (위 4개 파일):
    - 각 loader 상단: `const logger = createLogger(request, context.cloudflare.env).child({ route: "route_name" })`
    - loader 진입: `logger.info("loader_start")`
    - action 진입: `logger.info("action_start", { intent })` — formData에서 intent/action 추출
    - action 완료: `logger.info("action_complete", { intent, result })` — 생성된 record ID 등
    - `_public.write.tsx` action: `logger.info("record_create", { recordId, format, type })` — 감사 로깅
    - `_public.logs.$recordSlug.edit.tsx` action: `logger.info("record_update", { recordId })` — 감사 로깅
    - `_public.logs.$recordSlug.tsx` action: intent별 로깅 (response_create, question_create, sentence_save, self_answer_create)

  **Must NOT do**:
  - loader/action 함수 시그니처 변경 금지
  - waitUntil 내 에러 throw 동작 변경 금지 (로그만 추가)
  - formData의 content 필드 전체 로깅 금지 (대용량)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 4개 route 파일, 각각 loader+action 구조 이해 필요, intent 분기 파악
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 3, 4, 5)
  - **Blocks**: None
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `app/routes/_public.tsx:1-30` — layout loader. waitUntil 패턴, getAuth 호출
  - `app/routes/_public.write.tsx:1-199` — 전체 파일. loader(templates/stages 조회) + action(record 생성 + question + tags + mentions + links)
  - `app/routes/_public.logs.$recordSlug.edit.tsx:1-100+` — edit loader + action (record 업데이트)
  - `app/routes/_public.logs.$recordSlug.tsx` — record detail loader + action (response/question/sentence/self-answer 생성)

  **API/Type References**:
  - `app/lib/logger.server.ts` — createLogger, child API

  **Acceptance Criteria**:

  - [ ] 4개 route 파일의 silent catch에 logger 호출 존재
  - [ ] 4개 route 파일의 loader/action에 logger 진입 로그 존재
  - [ ] write/edit action에 감사 로그 (record_create, record_update) 존재
  - [ ] `pnpm typecheck` → 성공

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Route 로깅 완전성 검증
    Tool: Bash (grep)
    Preconditions: 4개 route 파일 수정 완료
    Steps:
      1. grep "createLogger" app/routes/_public.tsx → 존재
      2. grep "createLogger" app/routes/_public.write.tsx → 존재
      3. grep "record_create" app/routes/_public.write.tsx → 존재
      4. grep "record_update" app/routes/_public.logs.\$recordSlug.edit.tsx → 존재
      5. grep "background_task_error" app/routes/_public.tsx → 존재 (waitUntil catch 수정)
      6. pnpm typecheck
    Expected Result: 모든 패턴 존재, typecheck 통과
    Failure Indicators: 패턴 미존재 또는 typecheck 실패
    Evidence: .sisyphus/evidence/task-6-route-logging.txt

  Scenario: waitUntil catch 수정 검증
    Tool: Bash (grep)
    Preconditions: _public.tsx 수정 완료
    Steps:
      1. grep -A2 "catch" app/routes/_public.tsx에서 기존 .catch(() => {}) 패턴이 .catch((err) => logger.error(...))로 변경됨 확인
    Expected Result: 빈 catch가 로거 호출로 교체됨
    Failure Indicators: .catch(() => {}) 패턴 잔존
    Evidence: .sisyphus/evidence/task-6-waituntil-catch.txt
  ```

  **Commit**: YES
  - Message: `feat(logging): public layout + write/edit route 로깅`
  - Files: `app/routes/_public.tsx`, `app/routes/_public.write.tsx`, `app/routes/_public.logs.$recordSlug.edit.tsx`, `app/routes/_public.logs.$recordSlug.tsx`
  - Pre-commit: `pnpm typecheck`

- [x] 7. Public read route 전체 로깅

  **What to do**:
  - 다음 15개 public read-only route 파일의 loader에 로깅 추가:
    1. `_public._index.tsx` — 홈: loader_start, recent activity 조회
    2. `_public.journey.tsx` — 여정 목록: stages 조회
    3. `_public.journey.$stageSlug.tsx` — Stage 상세: stage + records 조회
    4. `_public.logs._index.tsx` — 기록 목록: paginated records + filters
    5. `_public.learners._index.tsx` — Learner 목록
    6. `_public.learners.$learnerSlug.tsx` — Learner 프로필 + records
    7. `_public.challenges._index.tsx` — Challenge 목록
    8. `_public.challenges.$challengeSlug.tsx` — Challenge 상세 + records
    9. `_public.groups.$groupSlug.tsx` — 그룹 상세
    10. `_public.memories.$stageSlug.tsx` — Collective memory
    11. `_public.search.tsx` — 검색: 검색어 로깅 (query param)
    12. `_public.tags.tsx` — 태그 목록
    13. `_public.tags.$tagSlug.tsx` — 태그별 기록
    14. `_public.guide.tsx` — 가이드 (static loader)
    15. `_public.me.tsx` — 내 프로필 (requireAuth)
  - **패턴** (모든 route 동일):
    ```
    const logger = createLogger(request, context.cloudflare.env).child({ route: "route_name" });
    logger.info("loader_start");
    // ... 기존 로직 ...
    logger.info("loader_end", { resultCount: data.length }); // 또는 적절한 메타
    return { ... };
    ```
  - search route: `logger.info("search_query", { query, filters })` — 검색 분석용
  - 404 throw 전: `logger.info("not_found", { slug })` — 존재하지 않는 페이지 추적

  **Must NOT do**:
  - loader 반환값/구조 변경 금지
  - DB 쿼리 함수에 try/catch 추가 금지
  - action이 없는 route에 action 추가 금지

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 15개 파일 대량 수정. 각 route의 loader 구조 파악 필요
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 8, 9, 10)
  - **Blocks**: None
  - **Blocked By**: Task 3

  **References**:

  **Pattern References**:
  - Task 6에서 수정된 route 파일들의 로깅 패턴 — 동일하게 적용
  - `app/routes/_public.journey.tsx` — 가장 단순한 loader 예시 (stages 조회만)
  - `app/routes/_public.search.tsx` — 검색 파라미터 처리 패턴

  **API/Type References**:
  - `app/lib/logger.server.ts` — createLogger, child API

  **Acceptance Criteria**:

  - [ ] 15개 route 파일 모두에 createLogger import 존재
  - [ ] 15개 route 파일 loader에 logger.info("loader_start") 존재
  - [ ] search route에 search_query 로그 존재
  - [ ] `pnpm typecheck` → 성공

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Public read route 로깅 커버리지 100% 검증
    Tool: Bash (grep)
    Preconditions: 15개 파일 수정 완료
    Steps:
      1. 각 파일에 대해 grep "createLogger" 실행:
         _public._index.tsx, _public.journey.tsx, _public.journey.\$stageSlug.tsx,
         _public.logs._index.tsx, _public.learners._index.tsx, _public.learners.\$learnerSlug.tsx,
         _public.challenges._index.tsx, _public.challenges.\$challengeSlug.tsx,
         _public.groups.\$groupSlug.tsx, _public.memories.\$stageSlug.tsx,
         _public.search.tsx, _public.tags.tsx, _public.tags.\$tagSlug.tsx,
         _public.guide.tsx, _public.me.tsx
      2. 15/15 파일에서 createLogger 존재 확인
      3. pnpm typecheck
    Expected Result: 15개 파일 100% 커버리지, typecheck 통과
    Failure Indicators: 누락된 파일 존재 또는 typecheck 실패
    Evidence: .sisyphus/evidence/task-7-public-read-coverage.txt

  Scenario: 검색 로깅 검증
    Tool: Bash (grep)
    Preconditions: search.tsx 수정 완료
    Steps:
      1. grep "search_query" app/routes/_public.search.tsx → 존재
    Expected Result: 검색어 로깅 패턴 존재
    Failure Indicators: 검색 로깅 미존재
    Evidence: .sisyphus/evidence/task-7-search-logging.txt
  ```

  **Commit**: YES
  - Message: `feat(logging): public read route 전체 로깅`
  - Files: 15개 public route files
  - Pre-commit: `pnpm typecheck`

- [x] 8. Public action route 로깅 (inbox, settings)

  **What to do**:
  - 다음 2개 public action route의 loader + action에 로깅 추가:
    1. `_public.inbox.tsx` — loader: 알림 조회, action: mark_read/mark_all_read intent
    2. `_public.settings.tsx` — loader: 프로필 조회, action: visibility/response preference/notification 업데이트
  - **Action 로깅 패턴**:
    ```
    logger.info("action_start", { intent });
    // ... 기존 로직 ...
    logger.info("action_complete", { intent, result });
    ```
  - inbox: `logger.info("notification_mark_read", { notificationId })` 또는 `logger.info("notification_mark_all_read")`
  - settings: `logger.info("settings_update", { fields: ["visibility", "responsePreference"] })` — 변경된 필드만

  **Must NOT do**:
  - action 반환값/리다이렉트 변경 금지
  - formData 전체 로깅 금지

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 2개 파일, Task 6/7과 동일 패턴 반복
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 7, 9, 10)
  - **Blocks**: None
  - **Blocked By**: Task 3

  **References**:

  **Pattern References**:
  - Task 6에서 수정된 route 파일들의 action 로깅 패턴
  - `app/routes/_public.inbox.tsx` — notification loader + mark_read/mark_all_read action
  - `app/routes/_public.settings.tsx` — settings loader + update action

  **Acceptance Criteria**:

  - [ ] 2개 route 파일에 createLogger import 존재
  - [ ] loader + action 모두에 로깅 존재
  - [ ] `pnpm typecheck` → 성공

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Action route 로깅 검증
    Tool: Bash (grep)
    Preconditions: 2개 파일 수정 완료
    Steps:
      1. grep "createLogger" app/routes/_public.inbox.tsx → 존재
      2. grep "createLogger" app/routes/_public.settings.tsx → 존재
      3. grep "action_start" app/routes/_public.inbox.tsx → 존재
      4. grep "settings_update" app/routes/_public.settings.tsx → 존재
      5. pnpm typecheck
    Expected Result: 모든 패턴 존재, typecheck 통과
    Failure Indicators: 패턴 미존재 또는 typecheck 실패
    Evidence: .sisyphus/evidence/task-8-action-routes.txt
  ```

  **Commit**: YES (groups with 7)
  - Message: `feat(logging): inbox/settings action route 로깅`
  - Files: `app/routes/_public.inbox.tsx`, `app/routes/_public.settings.tsx`
  - Pre-commit: `pnpm typecheck`

- [x] 9. Admin route 전체 로깅

  **What to do**:
  - 다음 22개 admin route의 loader + action에 로깅 추가:
    - **Layout**: `_admin.tsx` — requireRole 로깅, bootstrapAdmin 로깅
    - **Dashboard**: `_admin.admin._index.tsx` — analytics loader
    - **Records**: `_admin.admin.records._index.tsx` (loader), `_admin.admin.records.$recordId.tsx` (loader + moderation action)
    - **Stages**: `_admin.admin.stages._index.tsx` (loader), `_admin.admin.stages.$stageId.tsx` (loader + update action)
    - **Challenges**: `_admin.admin.challenges._index.tsx` (loader), `_admin.admin.challenges.$challengeId.tsx` (loader + update action)
    - **Learners**: `_admin.admin.learners._index.tsx` (loader), `_admin.admin.learners.$learnerId.tsx` (loader)
    - **Dialogue**: `_admin.admin.dialogue._index.tsx` (loader), `_admin.admin.dialogue.$responseId.tsx` (loader + moderation action)
    - **Collaboration**: `_admin.admin.collaboration._index.tsx` (loader), `_admin.admin.collaboration.$groupId.tsx` (loader + status update action)
    - **Memories**: `_admin.admin.memories._index.tsx` (loader), `_admin.admin.memories.$stageId.tsx` (loader + update action)
    - **Curation**: `_admin.admin.curation.tsx` (loader + update action)
    - **Templates**: `_admin.admin.templates._index.tsx` (loader), `_admin.admin.templates.$templateId.tsx` (loader + update action)
    - **Roles**: `_admin.admin.roles.tsx` (loader + grant/revoke action)
    - **Settings**: `_admin.admin.settings.tsx` (loader + update action)
    - **Audit**: `_admin.admin.audit.tsx` (loader)
    - **Analytics**: `_admin.admin.analytics.tsx` (loader)
    - **Tags**: `_admin.admin.tags.tsx` (loader + manage action)
  - **Admin action 감사 로깅** (보안 이벤트):
    - moderation 변경: `logger.info("admin_moderate_record", { recordId, newStatus })`
    - 역할 부여/회수: `logger.info("admin_role_change", { targetUserId, role, action: "grant"|"revoke" })`
    - stage/challenge 변경: `logger.info("admin_update_stage", { stageId })`
    - settings 변경: `logger.info("admin_update_settings", { changedKeys })`
  - Admin action은 감사 목적으로 **모든 쓰기 작업에 구체적인 이벤트명** 사용

  **Must NOT do**:
  - Admin 라우트 구조 변경 금지
  - AdminSidebar/AdminContextBar (클라이언트) 수정 금지

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 22개 파일 대량 수정. 각 route의 action intent 구조 파악 필요. 감사 로깅 이벤트명 설계
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 7, 8, 10)
  - **Blocks**: None
  - **Blocked By**: Task 3

  **References**:

  **Pattern References**:
  - `app/routes/_admin.tsx` — admin layout loader. requireRole, bootstrapAdmin
  - `app/routes/_admin.admin.records.$recordId.tsx` — moderation action 패턴
  - `app/routes/_admin.admin.roles.tsx` — grant/revoke action 패턴
  - `.docs/admin.md` — Admin 역할과 기능 목록

  **Acceptance Criteria**:

  - [ ] 22개 admin route 파일 + _admin.tsx에 createLogger import 존재
  - [ ] action이 있는 route 파일에 admin_* 이벤트 로그 존재
  - [ ] roles action에 admin_role_change 로그 존재
  - [ ] `pnpm typecheck` → 성공

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Admin route 로깅 커버리지 100% 검증
    Tool: Bash (grep + wc)
    Preconditions: 22개 파일 수정 완료
    Steps:
      1. grep -rl "createLogger" app/routes/_admin* | wc -l → 23 이상 (22 routes + _admin.tsx layout)
      2. grep -rl "admin_" app/routes/_admin.admin.records.\$recordId.tsx → moderation 이벤트 존재
      3. grep -rl "admin_role_change" app/routes/_admin.admin.roles.tsx → 역할 감사 이벤트 존재
      4. pnpm typecheck
    Expected Result: 23+ 파일에서 로거 존재, 감사 이벤트 존재, typecheck 통과
    Failure Indicators: 누락된 파일 또는 감사 이벤트 미존재
    Evidence: .sisyphus/evidence/task-9-admin-coverage.txt

  Scenario: Admin 감사 로깅 이벤트 검증
    Tool: Bash (grep)
    Preconditions: admin action routes 수정 완료
    Steps:
      1. grep "admin_moderate" app/routes/_admin.admin.records.\$recordId.tsx → 존재
      2. grep "admin_moderate" app/routes/_admin.admin.dialogue.\$responseId.tsx → 존재
      3. grep "admin_role_change" app/routes/_admin.admin.roles.tsx → 존재
      4. grep "admin_update" app/routes/_admin.admin.settings.tsx → 존재
    Expected Result: 주요 admin action에 감사 이벤트 로그 존재
    Failure Indicators: 감사 이벤트 누락
    Evidence: .sisyphus/evidence/task-9-admin-audit-events.txt
  ```

  **Commit**: YES
  - Message: `feat(logging): admin route 전체 로깅`
  - Files: 22개 admin route files + _admin.tsx
  - Pre-commit: `pnpm typecheck`

- [x] 10. API route 로깅

  **What to do**:
  - 다음 4개 API route에 로깅 추가:
    1. `api.search-records.tsx` — loader: 검색어, 인증 상태, 결과 수
    2. `api.search-learners.tsx` — loader: 검색어, 결과 수
    3. `api.upload.tsx` — action: 업로드 파일 타입/크기, 인증 상태, R2 키, 성공/실패
    4. `api.images.$.tsx` — loader: 이미지 키, 캐시 히트/미스, R2 요청
  - **upload action 감사 로깅**: `logger.info("file_upload", { fileType, fileSize, r2Key })`
  - **API 에러 응답 로깅**: 401/403/404 등 에러 응답 시 로깅
  - **성능 로깅**: 특히 upload + image serving의 소요시간

  **Must NOT do**:
  - API 응답 형식 변경 금지
  - 인증 로직 변경 금지
  - 파일 내용/바이너리 데이터 로깅 금지

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 4개 파일, 기존 패턴 반복. upload는 약간의 추가 메타데이터
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 7, 8, 9)
  - **Blocks**: None
  - **Blocked By**: Task 3

  **References**:

  **Pattern References**:
  - `app/routes/api.upload.tsx` — 파일 업로드 action. R2 PUT, file validation
  - `app/routes/api.images.$.tsx` — 이미지 서빙 loader. R2 GET
  - `app/routes/api.search-records.tsx` — 검색 API loader. auth required
  - `app/routes/api.search-learners.tsx` — learner 검색 API loader

  **Acceptance Criteria**:

  - [ ] 4개 API route 파일에 createLogger import 존재
  - [ ] upload action에 file_upload 감사 로그 존재
  - [ ] `pnpm typecheck && pnpm test && pnpm build` → 전부 성공

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: API route 로깅 커버리지 검증
    Tool: Bash (grep)
    Preconditions: 4개 파일 수정 완료
    Steps:
      1. grep "createLogger" app/routes/api.search-records.tsx → 존재
      2. grep "createLogger" app/routes/api.search-learners.tsx → 존재
      3. grep "createLogger" app/routes/api.upload.tsx → 존재
      4. grep "createLogger" app/routes/api.images.\$.tsx → 존재
      5. grep "file_upload" app/routes/api.upload.tsx → 존재
      6. pnpm typecheck && pnpm test && pnpm build
    Expected Result: 4개 파일 100% 커버리지, 빌드 성공
    Failure Indicators: 파일 누락 또는 빌드 실패
    Evidence: .sisyphus/evidence/task-10-api-coverage.txt

  Scenario: 전체 빌드 최종 검증
    Tool: Bash
    Preconditions: 모든 구현 태스크 완료
    Steps:
      1. pnpm typecheck
      2. pnpm test
      3. pnpm build
    Expected Result: 3개 명령 모두 exit code 0
    Failure Indicators: 어떤 명령이든 실패
    Evidence: .sisyphus/evidence/task-10-final-build.txt
  ```

  **Commit**: YES
  - Message: `feat(logging): API route 로깅`
  - Files: 4개 API route files
  - Pre-commit: `pnpm typecheck && pnpm test && pnpm build`

---

## Final Verification Wave

- [x] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (grep for logger imports, JSON format, request ID pattern). For each "Must NOT Have": search codebase for forbidden patterns (try/catch in query modules, client-side changes, external deps). Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [x] F2. **Code Quality Review** — `unspecified-high`
  Run `pnpm typecheck` + `pnpm test` + `pnpm build`. Review all changed files for: `as any`/`@ts-ignore`, empty catches remaining, console.log without logger, unused imports. Check AI slop: excessive comments, over-abstraction, generic variable names. Verify logger is infallible (no throw paths).
  Output: `Build [PASS/FAIL] | Types [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [x] F3. **Real QA** — `unspecified-high`
  Start from clean state. Verify JSON log format by grepping all logger calls. Verify every route file has logger import. Verify all 9 silent catches now have logging. Verify LOG_LEVEL env var works. Run full test suite.
  Output: `Routes [N/N logged] | Catches [N/N fixed] | Tests [N/N pass] | VERDICT`

- [x] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff. Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT do" compliance: no try/catch in query modules, no client-side changes, no external deps, no HOF wrappers. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Guardrails [N/N respected] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

| # | Type | Scope | Message | Files | Gate |
|---|------|-------|---------|-------|------|
| 1 | feat | logging | `feat(logging): JSON 구조화 로거 유틸리티 + 단위 테스트` | logger.server.ts, logger.server.test.ts | `pnpm test` |
| 2 | chore | config | `chore(config): LOG_LEVEL 환경변수 추가` | wrangler.toml, worker-configuration.d.ts | `pnpm typecheck` |
| 3 | feat | logging | `feat(logging): worker entry point 전체 요청 로깅` | workers/app.ts | `pnpm typecheck && pnpm build` |
| 4 | feat | logging | `feat(logging): auth module 로깅 (API 호출, 캐시, 재시도)` | auth.server.ts, auth.middleware.ts | `pnpm typecheck` |
| 5 | fix | logging | `fix(logging): lib/ silent catch 블록 로깅 추가` | content, r2-cleanup, extract-references | `pnpm typecheck` |
| 6 | feat | logging | `feat(logging): public layout + write/edit route 로깅` | _public.tsx, _public.write.tsx, edit.tsx, recordSlug.tsx | `pnpm typecheck` |
| 7 | feat | logging | `feat(logging): public read route 전체 로깅` | 15개 public route files | `pnpm typecheck` |
| 8 | feat | logging | `feat(logging): inbox/settings/me action route 로깅` | 3개 route files | `pnpm typecheck` |
| 9 | feat | logging | `feat(logging): admin route 전체 로깅` | 22개 admin route files | `pnpm typecheck` |
| 10 | feat | logging | `feat(logging): API route 로깅` | 4개 API route files | `pnpm typecheck && pnpm test && pnpm build` |

---

## Success Criteria

### Verification Commands
```bash
pnpm typecheck        # Expected: 에러 0
pnpm test             # Expected: 전체 통과 (로거 테스트 포함)
pnpm build            # Expected: 빌드 성공
```

### Final Checklist
- [ ] 모든 "Must Have" 존재
- [ ] 모든 "Must NOT Have" 부재
- [ ] 모든 테스트 통과
- [ ] 모든 route 파일에 logger import 존재
- [ ] 모든 server-side silent catch에 로그 호출 존재
- [ ] wrangler tail에서 JSON 로그 확인 가능 (수동 검증 가이드 포함)
