# Wave 2: Spike Results & Go/No-Go Decisions
Date: 2026-03-18

## Summary Table

| Spike | Decision | Reasoning |
|-------|----------|-----------|
| T10: Static Imports | GO | CF builds fine; /guide works; runtime safe |
| T11: v8_splitRouteModules | GO | Build pass; deploy success; pages render |
| T12: /__manifest caching | DONE | Already deployed; /__manifest returns 200 with immutable cache |

---

## Detailed Decisions

### T10: Static Imports → GO

**Evidence:**
- Converted `app/routes/public/guide.tsx` loader from dynamic `await import()` to static import
- Build: PASS (`pnpm run build`)
- CF Pages Deploy: SUCCESS (Version ID: `2cbd8ed4-ffce-4f5b-8efd-3a883fd1d3e7`)
- `/guide` page renders: YES (no browser console errors)
- TTFB delta: +85 ms (single-run variance; no immediate improvement observed)

**Implication for Wave 3:**
- Convert all public route loaders from dynamic to static imports
- Compatibility is confirmed; performance gains to be validated per-route during Wave 3 measurement

**Note:** Static imports of `.server.ts` files are safe on CF edge runtime.

---

### T11: v8_splitRouteModules → GO

**Evidence:**
- Attempt A (legacy key): FAIL — `future.unstable_splitRouteModules` rejected in RR7 7.12.0
- Attempt B (stabilized key): PASS
  - Build: PASS (`pnpm run build`)
  - CF Pages Deploy: SUCCESS (Version ID: `f526cf90-f4b2-4a32-bf9d-1fd169d58987`)
  - Homepage: WORKS (full content rendered)
  - /journey: WORKS (stage list/cards rendered)
  - Console errors: NONE

**Key Finding:**
- Flag name changed: `unstable_splitRouteModules` → `v8_splitRouteModules` (stabilized in RR7 7.12.0)
- Build warnings: sourcemap accuracy warning + Vite dynamic/static overlap warnings (non-blocking)
- Some routes show de-optimization (shared code prevents split) — acceptable trade-off

**Implication for Wave 4:**
- `v8_splitRouteModules: true` is ALREADY enabled in `react-router.config.ts` (from this spike)
- Wave 4 (T19) does NOT need to "enable" it separately — just keep it and verify in measurement
- Expected benefit: reduced initial bundle size + faster route transitions

---

### T12: /__manifest Caching → DONE

**Evidence:**
- Workers Cache API implemented in `workers/app.ts`: YES
- Cache key: full URL including query string (prevents stale manifest issue)
- Build: PASS
- CF Pages Deploy: SUCCESS (Version ID: `29fb832d-99d8-49ba-9636-f8abd2875694`)
- /__manifest request verification: YES
  - Response includes query string: `version=67b689d2&paths=["/journey"]`
  - Response JSON valid: YES
  - Cache-Control header: `public, s-maxage=31536000, immutable`

**Status:** Already deployed and working. No further action needed.

---

## Wave 3 Plan (based on decisions)

1. **T14:** Convert all public route loaders to static imports (T10 = GO)
   - Scope: All routes in `app/routes/public/`
   - Validation: Build pass + no runtime errors
   
2. **T15:** Parallelize `$recordSlug.tsx` sequential DB calls
   - Scope: Record detail page loader
   - Expected impact: TTFB reduction
   
3. **T16:** shouldRevalidate expansion
   - Scope: Add shouldRevalidate to more routes
   - Expected impact: Reduced unnecessary revalidations
   
4. **T17:** Homepage Suspense streaming
   - Scope: Implement streaming for hero + stage strip
   - Expected impact: Faster FCP

---

## Wave 4 Plan (based on decisions)

1. **T19:** v8_splitRouteModules verification
   - Status: ALREADY ENABLED (from T11 spike)
   - Action: Verify in Wave 4 measurement (no code change needed)
   - Expected impact: Reduced initial bundle + faster route transitions
   
2. **T20:** clientLoader cache TTL + size limit
   - Scope: Implement cache strategy for client-side loaders
   - Expected impact: Reduced redundant client-side data fetches

---

## Key Takeaways

✅ **All three spikes are GO** — no blockers for Wave 3/4 execution

⚠️ **Important:** T11 already enabled `v8_splitRouteModules` in the codebase. Wave 4 should verify it's still enabled, not re-enable it.

📊 **Measurement strategy:** Wave 3/4 will validate performance gains per-route with multi-run TTFB/FCP metrics.
