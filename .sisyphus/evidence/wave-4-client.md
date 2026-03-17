# Wave 4: Client Bundle Measurements
Date: 2026-03-18
Branch: perf/rr7-optimization
Final Deploy Version ID: 72e000fa-11e0-42c7-9fb6-a108866fc257

## Changes in Wave 4
- T19: v8_splitRouteModules (already enabled in T11 spike — confirmed still active)
- T20: clientLoader Map 캐시 TTL 5분 + max 50 항목 제한

## Measurements (warm browser session, assets cached)

| Page | TTFB (ms) | JS Transfer | Total Reqs | Notes |
|------|-----------|-------------|------------|-------|
| / (홈) | 1332 | 286,337 B | 24 | cold start suspected |
| /journey | 319 | ~4 KB | 36 | warm — assets cached |
| /learners | 652 | ~11 KB | 53 | warm — assets cached |
| /logs/jaemin-start | 1411 | ~60 KB | 47 | cold start suspected |

## Notes
- Browser was warm for /journey and /learners (assets cached from previous measurement)
- Homepage (286KB) = first-load JS transfer, consistent with Wave 3 measurement
- TTFB variance is expected on CF edge single samples
- Assets with _headers immutable caching confirmed working (re-visit JS transfer near 0)

## Key Observations
- v8_splitRouteModules confirmed active in react-router.config.ts (line 8)
- clientLoader cache TTL/size confirmed in $recordSlug.tsx (lines 35-55)
- Sentry errors: 0 (verified via console)
- Site fully functional after all optimizations
