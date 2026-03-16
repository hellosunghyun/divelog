# logging-system — Learnings

## [2026-03-16] Session ses_30a99251fffe — Initial Codebase Survey

### 프로젝트 구조 핵심 사실
- **Worktree**: `/Users/hellosunghyun/Documents/Github/divelog-logging` (branch: `develop/logging`)
- **Test runner**: `pnpm test` = `vitest run` (vite.config.ts의 cloudflare 플러그인과 함께 실행)
- **Typecheck**: `pnpm typecheck` = `npm run cf-typegen && react-router typegen && tsc -b` (cf-typegen이 자동 포함됨!)
- **Build**: `pnpm build`
- **Test 디렉토리**: `app/lib/__tests__/` (기존 파일: content.server.test.ts, r2-cleanup.test.ts, example.test.ts, content.integration.test.ts)
- **Import 패턴**: `import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"`

### workers/app.ts 현재 상태 (23줄)
```typescript
const requestHandler = createRequestHandler(...)
export default {
  async fetch(request, env, ctx) {
    return requestHandler(request, { cloudflare: { env, ctx } });
  }
}
```
→ try/catch + createLogger 주입이 매우 간단함

### wrangler.toml [vars] 현재 상태
```toml
[vars]
ADAKRPOS_API_KEY = "ak_..."
ADMIN_USER_ID = "usr_placeholder_..."
ADMIN_EMAILS = "sunkima26@pos.idserve.net"
```
→ LOG_LEVEL = "INFO" 추가 필요

### .dev.vars
→ 파일 자체가 없음. 새로 생성 필요.

### auth.server.ts 패턴 (96줄)
- authCache = new WeakMap<Request, AuthContext>()
- debugCache = new WeakMap<Request, string>()
- getSessionIdFromCookie: line 12-21 (catch at line 18)
- getAuth: line 27-96, catch at line 83
- **debugCache는 절대 제거/교체하지 않음 — X-Auth-Debug 헤더에 사용**

### db factory 패턴
```typescript
export function db(d1: D1Database) {
  return drizzle(d1, { schema: { ...schema, ...relations } });
}
```
→ logger도 비슷하게: `createLogger(request, env)` 팩토리

### createLogger에서 request 없는 유틸 파일 처리
content.server.ts, r2-cleanup.server.ts, extract-references.server.ts는 request 컨텍스트 없음
→ module-level 로거 또는 `createModuleLogger(moduleName)` 별도 export 고려
→ requestId는 없는 상태로 로깅

## [2026-03-16] Task 파일 충돌 해소
- **Task 4 (auth)**: auth.server.ts ALL (silent catch 포함) + auth.middleware.ts
- **Task 5 (lib catches)**: content.server.ts, r2-cleanup.server.ts, extract-references.server.ts ONLY
- auth.server.ts:18, :83의 silent catch는 Task 5가 아닌 Task 4에서 처리
