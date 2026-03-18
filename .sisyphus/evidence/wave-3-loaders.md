# Wave 3: Loader Optimization Measurements
Date: 2026-03-18
Branch: perf/rr7-optimization
Deployed: 2026-03-18 02:57:31 KST
Version ID: `20b7e231-e5cc-4145-a2cc-d3a3aefcc331`

## Delta Table vs Wave 0 Baseline

| Page | Metric | Wave 0 | Wave 1 | Wave 3 | Delta W3-W0 | Better? |
|------|--------|--------|--------|--------|-------------|---------|
| / (홈) | TTFB (ms) | 517 | 558 | 519 | +2 | ❌ |
| / (홈) | LCP (ms) | 844 | 765 | 1052 | +208 | ❌ |
| / (홈) | JS Transfer | 399,617 B | 320,254 B | 286,248 B | -113,369 B | ✅ |
| / (홈) | Total Reqs | 66 | 39 | 37 | -29 | ✅ |
| /journey | TTFB (ms) | 319 | 638 | 906 | +587 | ❌ |
| /journey | LCP (ms) | 1224 | 711 | 1392 | +168 | ❌ |
| /journey | JS Transfer | 397,081 B | 283,714 B | 249,076 B | -148,005 B | ✅ |
| /journey | Total Reqs | 69 | 38 | 37 | -32 | ✅ |
| /learners | TTFB (ms) | 603 | 613 | 1588 | +985 | ❌ |
| /learners | LCP (ms) | 2076 | 1901 | 3948 | +1872 | ❌ |
| /learners | JS Transfer | 415,216 B | 341,321 B | 352,118 B | -63,098 B | ✅ |
| /learners | Total Reqs | 73 | 54 | 56 | -17 | ✅ |
| /logs/jaemin-start | TTFB (ms) | 1032 | 1101 | 677 | -355 | ✅ |
| /logs/jaemin-start | LCP (ms) | 1260 | 1165 | 1136 | -124 | ✅ |
| /logs/jaemin-start | JS Transfer | 417,672 B | 370,379 B | 295,278 B | -122,394 B | ✅ |
| /logs/jaemin-start | Total Reqs | 70 | 50 | 47 | -23 | ✅ |
| /write/article (redirect) | TTFB (ms) | 157 | 171 | 330 | +173 | ❌ |
| /write/article (redirect) | LCP (ms) | 428 | redirect | 1376 | +948 | ❌ |
| /write/article (redirect) | JS Transfer | 110,793 B | 111,491 B | 114,361 B | +3,568 B | ❌ |
| /write/article (redirect) | Total Reqs | 11 | 10 | 12 | +1 | ❌ |

## Key Improvements Expected
- `/logs/:slug` TTFB: 1032ms(W0) / 1101ms(W1) -> 677ms(W3)로 크게 감소 (목표 < 600ms에는 미도달).
- Homepage LCP: W1(765ms) 대비 W3(1052ms)로 이번 측정에서는 개선 확인 실패.

## Deployment / Runtime Checks
- Deploy command: `pnpm run build && pnpm run deploy`
- Deploy result: Success
- Console errors on homepage: none (`list_console_messages(types=["error"])`)

## Measurement Notes
- 측정 도구: Chrome DevTools MCP (`navigate_page`, `list_network_requests`, `evaluate_script`)
- JS Transfer는 `PerformanceResourceTiming.transferSize` 기반 JS 리소스 합계
- Total Reqs는 `list_network_requests(includePreservedRequests=false)` 결과 건수 사용
- `/write/article`는 비인증 상태로 `https://ada-kr-pos.com/login?...` 리다이렉트 페이지 기준 측정
