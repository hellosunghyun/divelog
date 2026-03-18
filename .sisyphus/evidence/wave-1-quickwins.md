# Wave 1: Quick Wins Performance Measurements
Date: 2026-03-18
Branch: perf/rr7-optimization
Deployed: 2026-03-18 01:33:59 KST

## Delta Table vs Wave 0 Baseline

| Page | Metric | Wave 0 | Wave 1 | Delta | Better? |
|------|--------|--------|--------|-------|---------|
| / (홈) | JS Transfer | 399,617 B | 320,254 B | -79,363 B | ✅ |
| / (홈) | LCP (ms) | 844 | 765 | -79 | ✅ |
| / (홈) | TTFB (ms) | 517 | 558 | +41 | ❌ |
| / (홈) | Total Reqs | 66 | 39 | -27 | ✅ |
| /journey | JS Transfer | 397,081 B | 283,714 B | -113,367 B | ✅ |
| /journey | LCP (ms) | 1224 | 711 | -513 | ✅ |
| /journey | TTFB (ms) | 319 | 638 | +319 | ❌ |
| /journey | Total Reqs | 69 | 38 | -31 | ✅ |
| /learners | JS Transfer | 415,216 B | 341,321 B | -73,895 B | ✅ |
| /learners | LCP (ms) | 2076 | 1901 | -175 | ✅ |
| /learners | TTFB (ms) | 603 | 613 | +10 | ❌ |
| /learners | Total Reqs | 73 | 54 | -19 | ✅ |
| /logs/jaemin-start | JS Transfer | 417,672 B | 370,379 B | -47,293 B | ✅ |
| /logs/jaemin-start | LCP (ms) | 1260 | 1165 | -95 | ✅ |
| /logs/jaemin-start | TTFB (ms) | 1032 | 1101 | +69 | ❌ |
| /logs/jaemin-start | Total Reqs | 70 | 50 | -20 | ✅ |
| /write/article (redirect) | JS Transfer | 110,793 B | 111,491 B | +698 B | ❌ |
| /write/article (redirect) | LCP (ms) | redirect | redirect | - | - |
| /write/article (redirect) | TTFB (ms) | 157 | 171 | +14 | ❌ |
| /write/article (redirect) | Total Reqs | 11 | 10 | -1 | ✅ |

## Key Improvements
- entry.client bundle: 416 KB -> 301.54 KB (build artifact `entry.client-CJeN94QT.js`)
- prefetch behavior: `/journey` total requests reduced 69 -> 38, `/learners` reduced 73 -> 54
- `/journey` 네트워크에서 Stage 상세 페이지로의 다중 prefetch 요청은 관찰되지 않았고, `__manifest` 1건만 확인됨

## Web Vitals Console
Still working: YES (`[web-vitals] TTFB 558 good` 로그 확인)

## Notes
- `pnpm deploy` 직접 호출은 workspace 에러로 실패했고 `pnpm run deploy`로 배포 완료
- deploy 중 Sentry sourcemap upload auth token 미설정 경고가 있었지만 Pages 배포 자체는 성공
- 측정은 Chrome DevTools trace (no throttling) 기준이며 Wave 0과 완전 동일한 네트워크 상태를 보장하지 않음
