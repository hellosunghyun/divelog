# Learnings

## 프로젝트 컨벤션
- 워크트리: `/Users/hellosunghyun/Documents/Github/divelog-perf-opt`
- 브랜치: `perf/performance-optimization`
- 패키지 매니저: pnpm
- 빌드: `pnpm build` → `build/client/assets/` 에 JS 청크 생성
- 배포: `pnpm deploy` → `wrangler deploy --config wrangler.deploy.toml`
- 타입체크: `pnpm typecheck`
- 테스트: `pnpm test`

## 측정 기준 (Wave 1 Task 1에서 확인)
- 기존 TTFB: ~2.0~2.2s (curl 측정)
- 기존 FCP: ~6.25s
- 기존 JS 번들: ~567KB / 34파일

## 서버 환경
- Cloudflare Workers (Pages 아님) — `workers/app.ts`가 진입점
- D1: APAC 리전, `12a8007b-d92c-45cf-8bab-2d5692d704c1`
- 배포 설정: `wrangler.deploy.toml` (개발: `wrangler.toml`)

## 인증 아키텍처
- 쿠키 없음 → fast-path (외부 API 호출 없음) — `app/lib/auth/auth.server.ts:43-48`
- 쿠키 있음 → `https://ada-kr-pos.com/api/sdk/verify-session` POST 호출 (3s 타임아웃)
- WeakMap 캐시: 같은 Request 객체 내 1회만 호출

## Task 9: SmartLink & FloatingWriteCTA Prefetch Adjustment ✓

**Completed**: 2026-03-18

### Changes Made
1. **SmartLink.tsx** (line 9)
   - Default prefetch: `"intent"` → `"viewport"`
   - More conservative strategy: only prefetch when link enters viewport
   - Reduces unnecessary prefetch requests

2. **FloatingWriteCTA.tsx** (line 29)
   - Write link prefetch: `"render"` → `"none"`
   - Explicit override of SmartLink default
   - Prevents prefetch of write page from floating CTA

### Rationale
- SmartLink is used across many components; changing default affects all instances
- "viewport" is more conservative than "intent" (mouse hover)
- FloatingWriteCTA is fixed on all pages → high visibility but low click rate
- Explicit "none" prevents unnecessary prefetch overhead

### Verification
- ✓ SmartLink default changed to "viewport"
- ✓ FloatingWriteCTA prefetch set to "none"
- ✓ No other prefetch attributes affected
- ✓ Git commit: `perf(prefetch): SmartLink 기본 prefetch 조정`

### Evidence Files
- `.sisyphus/evidence/task-9-smartlink.txt`
- `.sisyphus/evidence/task-9-cta.txt`

## Task 10: High-Traffic Read Route Revalidation Guard

**Completed**: 2026-03-18

### Changes Made
1. `app/routes/public/journey/index.tsx`
   - Added `shouldRevalidate` to skip loader reruns on GET navigations
   - Kept mutation-driven revalidation intact
2. `app/routes/public/logs/index.tsx`
   - Added the same guard for filter-heavy read navigation
3. `app/routes/public/learners/index.tsx`
   - Added the same guard for cohort-filter navigation
4. `app/routes/public/challenges/index.tsx`
   - Added the same guard for read-only challenge listing

### Verification
- `grep -l "shouldRevalidate" ...` confirms all 4 target routes export the function
- `app/routes/public/write/*.tsx` has no `shouldRevalidate`
- `pnpm typecheck` still fails only on pre-existing repo errors outside this task scope

### Evidence Files
- `.sisyphus/evidence/task-10-revalidate.txt`
- `.sisyphus/evidence/task-10-write-safe.txt`
- `.sisyphus/evidence/task-10-typecheck.txt`

## Task 8 Completion: ArticleEditor React.lazy Conversion ✓

**Date**: 2026-03-18
**Commit**: 134c1b8

### Changes Made
1. **app/routes/public/write/article.tsx**:
   - Converted ArticleEditor from static import to `React.lazy()`
   - Added Suspense wrapper with fallback UI
   - Line 4: Added `Suspense, lazy` imports
   - Line 10-12: Created lazy ArticleEditor with dynamic import
   - Line 496-503: Wrapped ArticleEditor with Suspense

2. **app/routes/public/logs/$recordSlug.edit.tsx**:
   - Converted ArticleEditor from static import to `React.lazy()`
   - Added Suspense wrapper with fallback UI
   - Line 4: Added `Suspense, lazy` imports
   - Line 8-10: Created lazy ArticleEditor with dynamic import
   - Line 389-396: Wrapped ArticleEditor with Suspense

### Verification Results
- ✓ Static imports: 0 remaining (grep verified)
- ✓ Build status: SUCCESS (4.89s)
- ✓ ArticleEditor chunk: 696KB (separate lazy chunk)
- ✓ Suspense pattern: Applied in both files with animate-pulse fallback
- ✓ Bundle isolation: ArticleEditor not in main/route chunks

### Fallback UI Pattern
```jsx
<Suspense fallback={<div className="animate-pulse bg-surface-secondary rounded-lg h-64" />}>
  <ArticleEditor {...props} />
</Suspense>
```

### Bundle Impact
- ArticleEditor: 696KB lazy chunk (on-demand)
- Route chunks (article.tsx, edit.tsx): Not affected
- Main bundle: No ArticleEditor dependency

### Next Task
Task 9: Link component lazy loading (SmartLink audit + CTA conversion)

## Final Review F3: Real Manual QA

**Completed**: 2026-03-18

### Production Verification
- `https://divelog.ada-kr-pos.com/` returned `200`
- Public homepage cache headers stayed `public, s-maxage=60, stale-while-revalidate=300` with `Vary: Cookie`
- Homepage TTFB runs were `1.411054s`, `1.521899s`, `0.867826s` (avg `1.266926s`), improving on the `1.610s` baseline by about `21.3%`
- `/write` still redirects with `302`, and invalid session cookies still force `private, no-cache`
- `workers/app.ts` still uses `tracesSampleRate: 0.1`

### Evidence File
- `.sisyphus/evidence/f3-manual-qa.txt`
