# Spike: Static Imports on CF Edge
Date: 2026-03-18

## Decision: GO

## What Was Done
- Converted `app/routes/public/guide.tsx` loader from dynamic `await import()` to static import.
- Converted files: `app/routes/public/guide.tsx` (1 dynamic import -> 1 static import).

## Build Results
- `pnpm run build`: PASS
- Worker bundle size: N/A (before) -> 4.6 MB (after, build output `build/worker.js 4.6mb`)

## CF Pages Deployment
- Deploy: SUCCESS (`pnpm run deploy`)
- Current Version ID: `2cbd8ed4-ffce-4f5b-8efd-3a883fd1d3e7`
- `/guide` page renders: YES (Chrome DevTools snapshot 확인)
- Browser console errors on `/guide`: NONE

## TTFB Results
- `/guide` TTFB before deploy: 898 ms (`curl time_starttransfer`)
- `/guide` TTFB after deploy: 983 ms (`curl time_starttransfer`)
- Delta: +85 ms (single-run variance; no immediate TTFB improvement observed)

## Conclusion
Cloudflare Pages에서 `.server.ts` 정적 import는 정상 빌드/배포/런타임 동작을 확인했다. 기능 회귀는 없고 `/guide` 렌더링도 정상이다. 단, 단일 측정 기준 TTFB 개선은 확인되지 않았다.

## Recommendation for Wave 3
YES — 공개 라우트의 dynamic import를 static import로 점진 전환해도 된다(호환성 관점 GO). 다만 성능 이득은 경로별/다회 측정으로 검증하면서 진행한다.
