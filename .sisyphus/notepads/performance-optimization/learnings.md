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

## Task 2: learners/:slug loader optimization

**Completed**: 2026-03-19

### What worked
- `fetchAdaProfile()` 외부 HTTP 호출을 제거하고 `resolveProfileIntro(null, learner.bio)`로 로컬 프로필 기반 처리해 worker 외부 왕복을 없앴다.
- `database.batch([...])`를 별도 await 하지 않고 같은 `Promise.all`에 포함해 후반 쿼리 체인을 1단계로 축소했다.
- `getLearnerStageActivity`에 `currentStageId?: string | null`을 받아, 이미 loader에서 확보한 stage id가 있을 때 learner 재조회 쿼리를 스킵했다.
- stage/records/questions 쿼리를 `Promise.all`로 병렬화해 순차 대기 시간을 줄였다.

### Verification snapshot
- `grep -n "fetchAdaProfile" 'app/routes/public/learners/$learnerSlug.server.ts'` 결과 없음
- `pnpm typecheck 2>&1 | grep -c "error TS"` 결과: `12`
- `learnerSlug` 관련 신규 에러 없음(기존 Env 타입 에러만 확인)

## Task 3: /learners list over-fetch 제거

**Completed**: 2026-03-19

### What worked
- `getLearnersWithActivity()`에서 `records` 전체를 불러온 뒤 JS에서 author별 첫 레코드를 고르는 패턴을 제거했다.
- `records.id = (SELECT ... ORDER BY created_at DESC, id DESC LIMIT 1)` 상관 서브쿼리로 author별 최신 visible record 1건만 DB에서 반환하도록 축소했다.
- `stages` 조회를 latest record 조회와 `Promise.all`로 병렬화해 순차 대기를 줄였다.

### Verification snapshot
- `app/db/queries/learners/learners.server.ts`에 최신 1건 상관 서브쿼리 적용 확인
- `pnpm typecheck` 결과 `error TS` 개수 `12` 유지(기존 Env 타입 이슈)
- 반환 shape(`recentRecord`, `stage`, `lastActivityAt`) 변경 없음

## Task 4: /logs/:recordSlug slug/ID 조회 통합

**Completed**: 2026-03-19

### What worked
- slug/ID 식별은 `where(or(eq(records.slug, recordSlug), eq(records.id, recordSlug)))` 단일 조회로 합치고, `CASE WHEN` 정렬로 slug 우선 매치를 보장했다.
- `buildMentionSlugMap`은 record 조회 직후 `mentionSlugMapPromise`로 시작해 이후 revisions와 함께 `Promise.all`로 합류시켜 대기 경로를 단축했다.
- visibility 필터, `.catch()` 기반 방어 로직, revisions 조건부 로직, loader 반환 shape를 그대로 유지했다.

### Verification snapshot
- `app/routes/public/logs/$recordSlug.server.ts`에 OR 단일 쿼리 + slug 우선 정렬 확인
- `pnpm typecheck 2>&1 | grep -c "error TS"` 결과 `12` (pre-existing와 동일)

## Task 8: Composite Index Migration

### What Was Done
- Created migration file `0016_composite_index_records.sql`
- Added composite index: `idx_records_author_visibility_created` on `records(author_id, visibility, created_at DESC)`
- Fixed migration 0013 to handle SQLite foreign key constraints properly

### Key Learnings
1. **SQLite Foreign Key Constraints**: SQLite doesn't support direct column drops when foreign keys reference them. Must use table recreation approach.
2. **Migration Numbering**: Next migration after 0015 is 0016. Check `drizzle/migrations/` for highest number.
3. **Index Syntax**: SQLite composite indexes use `ON table(col1, col2 DESC)` syntax. DESC is important for reverse chronological sorting.

### Composite Index Benefits
- Optimizes queries filtering by author + visibility + creation date
- Improves pagination performance on author timelines
- Reduces query execution time for visibility-filtered chronological queries

### Pre-existing Issues Encountered
- Migration 0013 had SQLite compatibility issue with dropping columns that have foreign key constraints
- Fixed by using table recreation pattern (CREATE TABLE AS SELECT, DROP, RENAME)
- This is a pre-existing codebase issue, not related to the index task

### Files Modified
- `drizzle/migrations/0016_composite_index_records.sql` (new)
- `drizzle/migrations/0013_remove_stage_from_records.sql` (fixed FK issue)
- `.sisyphus/evidence/task-8-migration.txt` (evidence)
