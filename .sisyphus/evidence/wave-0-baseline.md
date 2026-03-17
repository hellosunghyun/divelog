# Wave 0: Baseline Performance Measurements
Date: 2026-03-18
Branch: perf/rr7-optimization
Deployed: 2026-03-18 01:17:13 KST

## Summary Table
| Page | LH Perf | LCP (ms) | CLS | FCP (ms) | TTFB (ms) | Total Reqs | JS Transfer |
|------|---------|----------|-----|----------|-----------|------------|-------------|
| / (홈) | N/A* | 844 | 0.0003 | 776 | 517 | 66 | 399,617 B |
| /journey | N/A* | 1224 | 0.0000 | 1224 | 319 | 69 | 397,081 B |
| /learners | N/A* | 2076 | 0.0000 | 824 | 603 | 73 | 415,216 B |
| /logs/jaemin-start | N/A* | 1260 | 0.0000 | 1260 | 1032 | 70 | 417,672 B |
| /write/article** | N/A* | 428 | 0.0000 | 428 | 157 | 11 | 110,793 B |

\* Chrome DevTools MCP `lighthouse_audit`는 Performance 카테고리를 제공하지 않아 점수 추출 불가 (A11y/Best Practices/SEO만 제공).

\** `/write/article`는 비인증 상태에서 `https://ada-kr-pos.com/login?...`로 리다이렉트되어 로그인 페이지 기준 값 측정.

## Web Vitals Console Output
Verified: YES

Sample output:
- `[web-vitals] FCP 620 good`
- `[web-vitals] TTFB 493 good`

## Deployment Info
- Deploy command: `pnpm run deploy`
- Result: Success (Cloudflare Pages deploy completed)
- Current Version ID: `9cea2285-05e8-47f9-89fb-3a63432ad2d8`
- URL confirmed working: YES (`https://divelog.ada-kr-pos.com`)

## Screenshot Evidence
- `/Users/hellosunghyun/Documents/Github/divelog/.sisyphus/evidence/baseline-screenshots/home-desktop.png`
- `/Users/hellosunghyun/Documents/Github/divelog/.sisyphus/evidence/baseline-screenshots/journey-desktop.png`
- `/Users/hellosunghyun/Documents/Github/divelog/.sisyphus/evidence/baseline-screenshots/learners-desktop.png`
- `/Users/hellosunghyun/Documents/Github/divelog/.sisyphus/evidence/baseline-screenshots/log-detail-desktop.png`
- `/Users/hellosunghyun/Documents/Github/divelog/.sisyphus/evidence/baseline-screenshots/write-article-desktop.png`

## Notes
- Lighthouse는 모든 대상 페이지에서 `device=desktop`, `mode=navigation`으로 실행.
- `/write/article` 실제 편집 화면 baseline은 인증 세션 확보 후 재측정 필요.
