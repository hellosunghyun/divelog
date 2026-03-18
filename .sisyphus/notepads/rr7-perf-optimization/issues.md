# Issues
(empty — no issues yet)

## Wave 0: Bundle Analysis Findings (2026-03-18)

### Critical Issues Found

1. **Sentry Replay in entry.client (416 KB total)**
   - Sentry Replay (rrweb) is bundled in the main entry point
   - Estimated 150-180 KB (raw) / 45-54 KB (gzip) for Replay alone
   - Affects every page load, even if Replay is not needed
   - **Action**: Investigate lazy-loading or conditional loading of Replay

2. **ArticleEditor chunk is very large (696 KB)**
   - Largest single chunk in the bundle
   - Contains rich text editor + framer-motion + phosphor-icons
   - Only needed on /write/article route (already route-split, which is good)
   - **Action**: Profile editor dependencies; consider internal code-splitting

### Moderate Issues

1. **Total JS bundle size: 2.11 MB (raw) / 633 KB (gzip)**
   - Substantial for a Cloudflare Pages app
   - Recommend analyzing if all 106 chunks are necessary
   - **Action**: Measure Core Web Vitals impact with/without optimizations

2. **Manifest chunk: 35 KB**
   - React Router route definitions
   - **Action**: Verify if all routes are necessary or can be lazy-loaded

### Good Practices Confirmed

- ✅ Route-level code splitting is working (article, select, etc. are separate)
- ✅ @phosphor-icons are tree-shaken into individual icon chunks
- ✅ Vendor code is extracted into shared chunks
- ✅ No obvious duplicate dependencies

### Build Notes

- Build completed successfully despite Sentry auth token error (expected with SENTRY_AUTH_TOKEN=skip)
- Vite build time: 4.24s
- 106 total JS chunks generated
- No visualizer plugin used; analysis based on raw build output

### Next Steps

1. **Wave 1**: Analyze Sentry Replay integration in detail
2. **Wave 2**: Profile ArticleEditor dependencies
3. **Wave 3**: Measure Core Web Vitals impact
4. **Wave 4**: Implement optimizations and re-measure

Evidence file: `.sisyphus/evidence/wave-0-bundle-analysis.md`

## [2026-03-18] Task 11 Spike Blocker

1. **`future.unstable_splitRouteModules` is invalid on current RR version**
   - Build fails before bundling with hard error:
     - `The "future.unstable_splitRouteModules" flag has been stabilized as "future.v8_splitRouteModules"`
   - This prevents build/deploy/runtime validation for the exact unstable flag.
   - **Action**: Use `future.v8_splitRouteModules` for any real compatibility/perf validation.

## [2026-03-18] Task 11 Retry Observations

1. **Sourcemap quality warnings with split-route-modules plugin**
   - Warning: `Sourcemap is likely to be incorrect... plugin (react-router:split-route-modules) ... didn't generate a sourcemap`
   - Impact: Build/Deploy success에는 영향 없음, 디버깅 품질(맵 정확도) 점검 필요

2. **Dynamic+static mixed import warnings remain**
   - Vite reporter warns several modules are both dynamically and statically imported
   - Impact: 일부 모듈은 별도 chunk 이동 최적화가 적용되지 않음

## [2026-03-18] Task 12 Verification Blocker

1. **Chrome DevTools MCP attach 실패**
   - 에러: 기존 chrome profile 세션 충돌로 `chrome-devtools_*` 도구가 새 탭/페이지 attach 불가
   - 영향: 네트워크 패널에서 `/__manifest` 요청 직접 확인 불가
   - 우회: 배포 도메인에 직접 `curl` 요청으로 `version/paths` query + JSON 응답 + Cache-Control 헤더 검증

## [2026-03-18] Task 14 Verification Blocker

1. **`pnpm run typecheck` 전역 실패는 여전히 pre-existing**
   - 이번 public route static import 변경과 무관하게 admin/auth/query 계층에서 기존 TS 오류가 남아 있음
   - 대표 위치: `app/components/admin/AdminSidebar.tsx`, `app/db/queries/dialogue/*.server.ts`, `app/lib/auth/auth.middleware.ts`, 여러 admin route 파일
   - 영향: 요구된 전체 명령 `pnpm run typecheck && pnpm run build`는 typecheck 단계에서 중단됨
    - 우회 검증: 변경한 public route + 신규 `.server.ts` 파일에 대해 LSP diagnostics clean, `pnpm run build` success 확인

## [2026-03-18] Task 18 Measurement Issues

1. **Wave 3 일부 페이지에서 TTFB/LCP 회귀 관측**
   - `/`: TTFB 558 -> 519(개선)이나 LCP 765 -> 1052(악화)
   - `/journey`: TTFB 638 -> 906, LCP 711 -> 1392 (동반 악화)
   - `/learners`: TTFB 613 -> 1588, LCP 1901 -> 3948 (큰 폭 악화)
   - 영향: Wave 3 목적 중 homepage LCP 개선은 이번 측정에서 입증 실패

2. **`/logs/jaemin-start` 목표치 미도달**
   - 1101ms -> 677ms로 유의미 개선되었지만 target `<600ms`에는 미도달
   - 추가 병목(쿼리/네트워크/edge 상태) 분리 측정 필요
