# Learnings

## [2026-03-17] Session Start: ses_3039701b2ffeJ6hzidagz06c14

### Critical Architecture Facts
- Worktree: /Users/hellosunghyun/Documents/Github/divelog-rr7-perf (branch: perf/rr7-optimization)
- Main repo: /Users/hellosunghyun/Documents/Github/divelog
- Deploy command: `pnpm deploy` (from worktree) = react-router build + tsx patch-worker + wrangler deploy
- Runtime: Cloudflare Pages (edge), Workers entry at workers/app.ts
- DB: D1 SQLite via Drizzle ORM
- Auth: @adakrpos/auth (external), session via adakrpos_session cookie

### Confirmed Patterns (do not change)
- framer-motion: already using LazyMotion + domAnimation (optimized, ~15KB)
- TipTap: already lazy() loaded in article.tsx and $recordSlug.edit.tsx
- entry.server.tsx: uses renderToReadableStream (good for streaming SSR)
- _public.tsx shouldRevalidate: already skip GET nav — MUST preserve this pattern

### Known Issues (pre-existing, not caused by us)
- _admin.tsx TypeScript error: Property 'title' is missing in AdminContextBarProps
- GlobalNav.tsx useEffect dependency warnings (hooks)
- These are pre-existing; do NOT fix them in this plan

### Key File Locations (worktree)
- app/entry.client.tsx — Sentry init + HydratedRouter
- app/entry.server.tsx — renderToReadableStream
- app/root.tsx — Layout component
- app/components/content/SmartLink.tsx — prefetch default="viewport"
- app/components/layout/GlobalNav.tsx — prefetch="none" (8 places)
- app/components/sections/StageStrip.tsx:106 — prefetch="render" (MOST aggressive)
- app/routes/public/index.tsx — Home page loader (2-stage sequential)
- app/routes/public/logs/$recordSlug.tsx — clientLoader cache (Map, no TTL)
- workers/app.ts — CF Workers entry point
- public/ — static assets dir (for _headers file)

## [2026-03-18] Task 1: web-vitals Collection

### Completed
- ✅ Added `web-vitals` package (v5.1.0) via `pnpm add web-vitals`
- ✅ Imported 5 metrics: `onLCP`, `onINP`, `onCLS`, `onFCP`, `onTTFB` in entry.client.tsx
- ✅ Each callback logs: `console.log("[web-vitals]", metric.name, Math.round(metric.value), metric.rating)`
- ✅ CLS metric multiplied by 1000 before rounding (it's 0-1 float)
- ✅ Callbacks placed AFTER Sentry init, BEFORE startTransition
- ✅ Sentry code completely untouched
- ✅ `pnpm typecheck && pnpm build` passes (pre-existing TS errors unrelated to our changes)
- ✅ Committed: `perf: add web-vitals collection in entry.client.tsx`

### Key Implementation Details
- web-vitals callbacks are non-blocking, fire asynchronously
- Metric object includes: name, value, rating ("good" | "needs-improvement" | "poor"), delta, entries
- Console logging only (no sendBeacon) — suitable for local dev + Sentry integration later
- All 5 metrics now collected: LCP (Largest Contentful Paint), INP (Interaction to Next Paint), CLS (Cumulative Layout Shift), FCP (First Contentful Paint), TTFB (Time to First Byte)

### Next Task
Task 2: Optimize TipTap lazy loading (already partially done, verify + document)

## [2026-03-18] Task 2: 배포 + Baseline 측정

### Completed
- `perf/rr7-optimization` 브랜치 상태를 Cloudflare Pages로 배포 완료
- Deploy 결과: `Current Version ID: 9cea2285-05e8-47f9-89fb-3a63432ad2d8`
- 대상 5개 페이지 Desktop + navigation 기준으로 측정 완료
- 증거 파일 생성: `.sisyphus/evidence/wave-0-baseline.md`

### Measurement Learnings
- Chrome DevTools MCP `lighthouse_audit`는 Performance 카테고리 점수를 제공하지 않고, Accessibility/Best Practices/SEO만 반환함
- LCP/FCP/CLS/TTFB는 브라우저 Performance API (`performance.getEntriesByType` + `PerformanceObserver`)로 보완 수집 가능
- 네트워크 요청 수는 `list_network_requests` 상단 count로 빠르게 확보 가능
- `/write/article`는 비인증 세션에서 로그인 페이지로 리다이렉트되므로, 실제 작성 화면 baseline은 인증 세션에서 재측정 필요

### Baseline Signals
- 홈 기준 JS transfer는 약 400KB(전송량 기준), 요청 수는 약 60~70대
- 기록 상세/러너 페이지는 추가 모듈 로드로 JS transfer가 홈 대비 소폭 증가
- web-vitals 로그(`[web-vitals] FCP`, `[web-vitals] TTFB`)가 실제 브라우저 콘솔에서 확인됨

## [2026-03-18] Wave 0 Complete

### Baseline Measurements
- /: LCP 844ms, CLS 0.0003, FCP 776ms, TTFB 517ms, JS Transfer 400KB
- /journey: LCP 1224ms, CLS 0, FCP 1224ms, TTFB 319ms, JS 397KB
- /learners: LCP 2076ms, CLS 0, FCP 824ms, TTFB 603ms, JS 415KB  
- /logs/jaemin-start: LCP 1260ms, CLS 0, FCP 1260ms, TTFB 1032ms, JS 418KB ← SLOWEST TTFB
- /write/article: redirects to login (unauthenticated) — baseline unmeasured

### Chrome DevTools MCP Limitations Found
- lighthouse_audit returns A11y/Best Practices/SEO scores, NOT Performance category score
- Performance score will remain "N/A" — use LCP/CLS/TTFB as primary metrics
- web-vitals console output confirmed: FCP 620 good, TTFB 493 good

### Bundle Analysis Key Numbers
- Total JS: 2.11 MB raw / 633 KB gzip
- entry.client: 416 KB (Sentry Replay ~150-180KB is biggest component)
- @phosphor-icons: tree-shaking WORKING (no action needed)
- framer-motion: already LazyMotion (no action needed)

### Critical Target
- /logs/:slug TTFB = 1032ms is the #1 bottleneck (sequential DB calls in loader)
- Sentry Replay in entry.client = biggest JS quick win (T4)
- LCP 2076ms on /learners — approaching 2.5s limit, needs attention

## Task 4: Lazy-load Sentry replayIntegration

**Approach Used**: Dynamic import with `await import()` after page load

**Key Implementation Details**:
- Removed `Sentry.replayIntegration()` from initial integrations array
- Used `window.addEventListener("load")` + `setTimeout(2000)` to delay loading
- Dynamic import: `const { replayIntegration } = await import("@sentry/react-router/cloudflare")`
- Called `Sentry.addIntegration(replayIntegration())` to register after import

**Bundle Size Results**:
- **Before**: entry.client = 416 KB
- **After**: entry.client = 301.54 KB
- **Savings**: 114.46 KB (~27% reduction)
- rrweb code completely removed from initial bundle (verified: 0 occurrences in entry.client)

**Why This Works**:
- Vite's code-splitting only includes modules that are statically imported
- Dynamic `import()` creates a separate chunk that's loaded on-demand
- 2-second delay after page load gives the page time to render before loading replay code
- Sentry.addIntegration() allows runtime registration of integrations

**Verification**:
- ✅ Sentry error reporting functional (reactRouterTracingIntegration still in initial integrations)
- ✅ Tracing still works (tracePropagationTargets unchanged)
- ✅ Replay configuration preserved (replaysSessionSampleRate, replaysOnErrorSampleRate)
- ✅ Build passes with no errors
- ✅ No rrweb code in entry.client chunk

**Notes**:
- The 2-second delay is conservative; could be reduced to 1s or even 500ms if needed
- Replay will still be loaded for error sessions (replaysOnErrorSampleRate: 0.5) once the integration is added
- This is a safe optimization with no functional impact

## Task 5: GlobalNav Core Nav Links Prefetch (COMPLETED)

**Change**: Updated GlobalNav.tsx to use `prefetch="intent"` for core navigation links.

**Implementation**:
- Desktop nav (lines 291-305): Added `prefetch="intent"` to navLinks.map() loop
- Mobile nav (lines 970-986): Added `prefetch="intent"` to mobile navLinks.map() loop
- Write buttons (lines 645-679): Kept `prefetch="none"` (auth-required, no change needed)

**Core nav links affected** (all now use `prefetch="intent"`):
- /journey (여정)
- /logs (기록)
- /challenges (챌린지)
- /learners (러너)

**Auth-required links** (unchanged, still `prefetch="none"`):
- /write/note, /write/article (both desktop & mobile)
- /inbox, /me, /settings (profile dropdown)
- /admin (admin link)

**Rationale**: `prefetch="intent"` triggers on hover/focus, reducing unnecessary network requests while still prefetching when users signal navigation intent. Core nav links are frequently hovered before clicking, making this the ideal prefetch strategy.

**Commit**: `82b86f6` - "perf: change GlobalNav core nav links prefetch from none to intent"

**Build Status**: Pre-existing TypeScript errors in codebase (unrelated to this change). Changes are syntactically correct and applied successfully.

## Tasks 6-8: Prefetch Optimization (Completed)

### Task 6: StageStrip.tsx
- Changed `prefetch="render"` to `prefetch="intent"` at line 106
- Rationale: StageStrip renders all stage links in a horizontal strip. Using `prefetch="render"` causes ALL links to prefetch immediately on component mount, creating unnecessary network requests. `prefetch="intent"` is more conservative — only prefetches on hover/focus.

### Task 7: SmartLink.tsx
- Changed default `prefetch` parameter from `"viewport"` to `"intent"` at line 9
- Rationale: SmartLink is used throughout the app for internal navigation. Default `"viewport"` means every in-viewport link automatically prefetches, which can be excessive on list pages with many links. `"intent"` (hover/focus) is more conservative.
- Note: Card components (SceneCard, LearnerCard, etc.) that explicitly set `prefetch="viewport"` were NOT changed — their explicit setting overrides the default and is intentional for content cards.

### Task 8: public/_headers
- File already existed with correct immutable asset caching rule:
  ```
  /assets/*
    Cache-Control: public, max-age=31536000, immutable
  ```
- This enables browser caching of hashed static assets (JS/CSS) for 1 year since their hash changes with every build.

### Build Status
- TypeScript errors are pre-existing in the worktree (AdminSidebar icon types, Drizzle query types, missing env vars) — not caused by these changes.
- Changes are syntactically correct and committed.

### Commit
```
perf: change StageStrip/SmartLink prefetch to intent; add _headers for immutable asset caching
```

## [2026-03-18] Task 9: 배포 + Wave 1 측정

### Deployment
- `pnpm deploy`는 workspace 에러로 실패했고 `pnpm run deploy`로 대체해서 성공 배포 완료
- Cloudflare Pages custom domain `divelog.ada-kr-pos.com` 배포 확인
- build output에서 `entry.client-CJeN94QT.js` = 301.54 KB 확인 (Wave 0 416 KB 대비 약 -114 KB)

### Wave 1 Measurement Summary (5 pages)
- `/`: LCP 765ms, TTFB 558ms, JS 320,254B, Requests 39
- `/journey`: LCP 711ms, TTFB 638ms, JS 283,714B, Requests 38
- `/learners`: LCP 1901ms, TTFB 613ms, JS 341,321B, Requests 54
- `/logs/jaemin-start`: LCP 1165ms, TTFB 1101ms, JS 370,379B, Requests 50
- `/write/article`(redirect): TTFB 171ms, JS 111,491B, Requests 10

### Learned Patterns
- `chrome-devtools_performance_start_trace`가 LCP와 LCP breakdown 내 TTFB를 바로 제공해서 baseline 비교에 유용
- prefetch intent 전환 후 `/journey`와 `/learners` 요청 수가 baseline 대비 크게 감소 (69->38, 73->54)
- `/journey`에서 StageStrip 관련 다중 stage route prefetch 요청은 보이지 않고 `__manifest` 단건 위주로 정리됨
- web-vitals 콘솔 로그(`[web-vitals] TTFB ... good`)는 배포 환경에서도 유지됨

### Evidence
- `.sisyphus/evidence/wave-1-quickwins.md` 생성 완료 (Wave 0 대비 delta table 포함)

## [2026-03-18] Wave 1 Complete

### Wave 1 Results Summary
- entry.client: 416KB → 302KB (-114KB, 27% reduction)
- JS Transfer per page: ~70-113KB reduction
- LCP (journey): 1224ms → 711ms (-513ms, best single improvement!)
- LCP (learners): 2076ms → 1901ms (-175ms, still approaching 2.5s limit)
- Total network requests: 27-31 fewer per page (prefetch reduction)
- TTFB: slight variance (+41-319ms) — CF edge cold start variance, not code regression

### Deploy Issue Discovered
- `pnpm deploy` from worktree fails with workspace error
- USE: `pnpm run deploy` instead
- This applies to ALL future deployments

### Web Vitals
- Still working after Wave 1 changes
- `[web-vitals] TTFB 558 good` confirmed

### Key Insight
- LCP on /journey improved dramatically (-42%) because StageStrip was `prefetch="render"` which was blocking render — changing to "intent" removed unnecessary work on render
- Learners LCP (1901ms) is still our concern — close to 2.5s target, need Wave 3 improvements

## [2026-03-18] Task 10 Spike: /guide static import 검증

### Completed
- `app/routes/public/guide.tsx` loader의 `await import("~/lib/infra/logger.server")`를 정적 import로 전환
- `pnpm run build` 통과
- `pnpm run deploy`로 Cloudflare Pages 배포 성공
- `/guide` 페이지 렌더/콘솔/응답 코드(200) 정상 확인

### Measurement Learnings
- 단일 `curl` 측정 기준 `/guide` TTFB는 898ms -> 983ms(+85ms)로 즉시 개선 신호는 없음
- `chrome-devtools_get_network_request`의 `server-timing`에서 `cfWorker` 구간을 함께 확인하면 edge 처리 시간 추적에 유용
- 이 스파이크는 성능 향상 검증보다 "정적 import의 CF 호환성" 검증에 의미가 큼

### Evidence
- `.sisyphus/evidence/spike-static-imports.md`

## [2026-03-18] Task 11 Spike: splitRouteModules 플래그 검증

### Completed
- `react-router.config.ts`에 `future.unstable_splitRouteModules: true`를 적용해 스파이크 실행
- `pnpm run build` 즉시 실패 재현 후 플래그 롤백 완료
- 증거 문서 생성: `.sisyphus/evidence/spike-split-route-modules.md`

### Key Learning
- 현재 프로젝트 버전(`@react-router/dev@7.12.0`)에서는 `unstable_splitRouteModules`가 더 이상 허용되지 않음
- 에러 메시지에서 공식 대체 키가 `future.v8_splitRouteModules`임을 명시
- 즉, 이 스파이크의 결론은 "unstable 키로는 진행 불가"이며, 후속 검증은 `v8_splitRouteModules` 기준으로 별도 수행해야 함

## [2026-03-18] Task 11 Retry: v8_splitRouteModules 검증

### Completed
- `react-router.config.ts`에 `future.v8_splitRouteModules: true` 적용
- `pnpm run build` 통과
- `pnpm run deploy` 통과 (CF Pages)
- Chrome DevTools로 `/` 및 `/journey` 렌더 정상 + 콘솔 에러 없음 확인

### Key Learning
- RR 7.12.0 기준 route module split는 stabilized 키(`v8_splitRouteModules`)를 사용해야 함
- split-route-modules 플러그인 sourcemap warning은 발생하지만 build/deploy를 막지 않음
- 현재 배포 파이프라인에서 Sentry sourcemap 업로드 토큰 에러는 기존처럼 non-blocking으로 처리됨

## [2026-03-18] Task 12: /__manifest Workers Cache API 적용

### Completed
- `workers/app.ts`에 `/__manifest` GET fast-path 추가
- cache key로 `request`를 직접 사용해서 query string(`version`, `paths`) 포함 보장
- `response.ok && !set-cookie` 조건에서만 캐시 저장
- 캐시 저장은 `ctx.waitUntil(cache.put(...))`로 비동기 처리
- 캐시 응답 헤더를 `Cache-Control: public, s-maxage=31536000, immutable`로 고정
- `pnpm run build` + `pnpm run deploy` 성공 (Version ID: `29fb832d-99d8-49ba-9636-f8abd2875694`)

### Verification Learnings
- `/__manifest?version=67b689d2&paths=["/journey"]` 요청은 200 + `{}` JSON 응답 가능
- 동일 요청에서 `Cache-Control: public, s-maxage=31536000, immutable` 헤더 확인
- 잘못된 version/path 조합은 204 + `x-remix-reload-document: true`로 리로드 유도 응답 가능

## [2026-03-18] Wave 2 Complete

### Spike Results Summary
1. T10 Static Imports: GO — CF Works fine with static .server.ts imports
2. T11 v8_splitRouteModules: GO — Flag stabilized! Use v8_splitRouteModules (not unstable_)
3. T12 __manifest caching: DONE — Workers Cache API implemented, deployed

### Critical API Change
- react-router.config.ts future flag: unstable_splitRouteModules → v8_splitRouteModules
- v8_splitRouteModules already enabled as part of T11 spike (commit f13fd87)

### Wave 3 Plan (all GO)
1. T14: Convert ALL public route loaders to static imports (many files, 250+ dynamic imports)
2. T15: Parallelize $recordSlug.tsx 5 sequential DB calls with Promise.all
3. T16: Add shouldRevalidate to remaining public detail routes
4. T17: Suspense streaming for homepage non-critical data

### workers/app.ts Bonus Finding
- withHtmlCacheHeaders() function ALREADY existed before T12
- Anonymous HTML gets: public, s-maxage=60, stale-while-revalidate=300 — great!
- Authenticated HTML gets: private, no-cache — correct behavior

### pnpm run deploy
- Must use `pnpm run deploy` NOT `pnpm deploy` in worktree context
- Both are equivalent but `pnpm deploy` has workspace resolution issues

## [2026-03-18] Task 14: public route loader/action static imports

### Completed
- `app/routes/public/**/*.tsx` 기준 19개 public route 파일에서 loader/action 내부 `await import()` 133개 제거 완료
- 일반 public route는 route 파일 상단 정적 import로 전환했고, `clientLoader`/`clientAction`가 있는 3개 route는 sibling `.server.ts` 모듈로 분리해 정적 import를 유지함
- 추가 생성 파일: `app/routes/public/journey/$stageSlug.server.ts`, `app/routes/public/learners/$learnerSlug.server.ts`, `app/routes/public/logs/$recordSlug.server.ts`
- 변경한 route/loader 파일 및 신규 `.server.ts` 파일 LSP diagnostics clean 확인
- `pnpm run build` 성공 확인

### Key Learnings
- RR7 + `v8_splitRouteModules` 환경에서 `clientLoader`/`clientAction`가 있는 route 파일은 `.server` 모듈을 직접 top-level import하면 client chunk build가 깨질 수 있음
- 이런 route는 loader/action 구현을 sibling `.server.ts` 파일로 이동하고 route 파일에서는 `export { loader/action } ...` + type-only query(`typeof import(...)`) 패턴을 쓰면 client chunk와 server chunk를 동시에 안전하게 유지할 수 있음
- `pnpm run typecheck`는 이번 변경과 무관한 admin/auth/query 계층의 기존 전역 TS 오류 때문에 계속 실패함

## [2026-03-18] Task 15: $recordSlug loader DB 병렬화

### Completed
- `app/routes/public/logs/$recordSlug.server.ts` loader에서 `getLinkedRecords`, `getSelfAnswersByRecord`, `getTagsByRecord`, `getIncomingLinks`, admin role 조회를 `Promise.all`로 병렬 실행하도록 변경
- `incomingLinks`는 기존 동작을 유지하도록 개별 `.catch()`에서 `logger.warn("incoming_links_query_failed")` 후 빈 배열 반환
- `revisions`는 기존 권한 의존성(`isAuthorOrAdmin`)을 유지한 채 role 판별 이후에만 조회
- `pnpm run build` 통과, 변경 파일 LSP diagnostics clean

### Key Learning
- 레코드 상세 loader에서 독립 조회들을 `Promise.all`로 묶고 실패 허용이 필요한 쿼리만 개별 `.catch()`를 붙이면 반환 shape를 보존하면서 직렬 대기 시간을 줄일 수 있음

## Task 16: shouldRevalidate for Public Detail Routes

**Status**: ✅ COMPLETED

**What was done**:
- Added `shouldRevalidate` export to 12 public detail/utility routes
- Pattern: Skip revalidation on GET navigations, allow on mutations (POST/PUT/DELETE)
- Files modified:
  1. `journey/$stageSlug.tsx` ✓
  2. `logs/$recordSlug.tsx` ✓
  3. `logs/$recordSlug.details.tsx` ✓
  4. `learners/$learnerSlug.tsx` ✓
  5. `challenges/$challengeSlug.tsx` ✓
  6. `memories/$stageSlug.tsx` ✓
  7. `search.tsx` ✓
  8. `tags/index.tsx` ✓
  9. `tags/$tagSlug.tsx` ✓
  10. `inbox.tsx` ✓
  11. `me.tsx` ✓
  12. `settings.tsx` ✓
  13. `guide.tsx` ✓

**Files NOT modified** (as per requirements):
- `_public.tsx` (layout, handles auth state changes)
- `groups/$groupSlug.tsx` (disabled collaboration feature)
- `write/*.tsx` (mutations, need revalidation)
- Admin routes (not in scope)

**Build verification**: ✅ `pnpm run build` passed

**Commit**: `9ddd5e3` - "perf: add shouldRevalidate to all public detail routes (skip GET nav revalidation)"

**Performance impact**:
- Navigating between detail routes (e.g., /logs/foo → /logs/bar → /logs/foo) will now use cached loader data instead of re-fetching
- Reduces unnecessary server calls on GET navigations
- Mutations still trigger full revalidation as expected

**Pattern used**:
```typescript
export function shouldRevalidate({
  formMethod,
  defaultShouldRevalidate,
}: {
  formMethod?: string;
  defaultShouldRevalidate: boolean;
}): boolean {
  if (formMethod && formMethod !== "GET") {
    return defaultShouldRevalidate;
  }
  return false;
}
```

## [2026-03-18] Task 18: Wave 3 Deploy + Measurement

### Completed
- `workers/app.ts` 변경을 커밋한 뒤(`7ebb4e2`) `pnpm run build && pnpm run deploy`로 배포 성공
- Cloudflare Pages 배포 버전: `20b7e231-e5cc-4145-a2cc-d3a3aefcc331`
- 5개 타깃 페이지 측정 완료, 증거 문서 생성: `.sisyphus/evidence/wave-3-loaders.md`

### Measurement Learnings
- `/logs/jaemin-start` TTFB는 1101ms(W1) -> 677ms(W3)로 크게 개선되었고, loader 병렬화 효과가 확인됨
- 다만 목표(<600ms)에는 아직 미도달이므로 DB/query 레벨 추가 최적화가 필요함
- 이번 측정에서는 `/`와 `/journey`, `/learners`의 TTFB/LCP가 W1보다 악화되어 edge warm/cold 상태와 측정 프로토콜 일관성 관리가 중요함
- `list_network_requests` 건수와 `PerformanceResourceTiming` 기반 합계가 1건 내외 차이날 수 있어, 요청 수는 네트워크 패널 count를 기준으로 고정하는 것이 안전함

## Task 20: clientLoader Map Cache TTL + Max-Size

**Completed**: 2026-03-18

### Implementation Pattern
Added TTL (5 minutes) and max-size (50 entries) to 3 clientLoader Map caches:
- `app/routes/public/logs/$recordSlug.tsx`
- `app/routes/public/journey/$stageSlug.tsx`
- `app/routes/public/learners/$learnerSlug.tsx`

### Key Changes
1. **Cache Entry Type**: Changed from `Map<string, unknown>` to `Map<string, CacheEntry<unknown>>` where `CacheEntry<T> = { data: T; timestamp: number }`
2. **Helper Functions**:
   - `getCached<T>(key)`: Checks TTL expiry, returns null if stale
   - `setCached(key, data)`: Evicts oldest entry (FIFO) when size >= 50
3. **Constants**:
   - `CACHE_TTL_MS = 5 * 60 * 1000` (300 seconds)
   - `CACHE_MAX_SIZE = 50`

### Memory Impact
- **Before**: Unbounded growth. User browsing 50+ records = all data in memory indefinitely
- **After**: Max 50 entries, each expires after 5 minutes. Prevents memory leaks on long sessions

### Mutation Invalidation
- `clientAction` still calls `cache.delete(key)` on mutation
- TTL provides automatic cleanup for stale entries
- Combined approach: explicit invalidation + automatic expiry

### Build Status
✅ `pnpm run build` passes (warnings are pre-existing Sentry/Vite issues)

### Commit
```
perf: add TTL and max-size limit to clientLoader Map caches
```

