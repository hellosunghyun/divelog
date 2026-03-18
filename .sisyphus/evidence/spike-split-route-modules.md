# Spike: splitRouteModules on CF Pages
Date: 2026-03-18

## Decision: GO

## Attempt A: unstable_splitRouteModules (legacy key)
- Result: NO-GO
- Reason: build hard-fails on React Router 7.12.0 because `future.unstable_splitRouteModules` is no longer accepted.

## Build Results
- pnpm run build: FAIL
- De-optimization warnings: NONE (build aborted before bundling)
- Build output chunk count: before N/A vs after N/A
- Failure detail: `future.unstable_splitRouteModules` is rejected in React Router 7.12.0 with message: "The \"future.unstable_splitRouteModules\" flag has been stabilized as \"future.v8_splitRouteModules\""

## CF Pages Deployment
- Deploy: FAILED (not attempted after build failure)
- Version ID: N/A

## Site Verification
- Homepage: WORKS (fetched successfully)
- /journey: WORKS (fetched successfully)
- Console errors: N/A (Chrome DevTools session unavailable in current environment)

## Recommendation for Wave 4
Enable `future.v8_splitRouteModules: true` for Wave 4 (T19).

---

## Retry Attempt B: v8_splitRouteModules (stabilized key)

### Build Results
- pnpm run build: PASS
- De-optimization warnings: NONE explicitly reported
- Other notable warnings:
  - `[plugin react-router:split-route-modules] Sourcemap is likely to be incorrect...`
  - Vite dynamic-import/static-import overlap warnings (chunk split not applied for those modules)
  - Sentry sourcemap upload warning/error due to missing auth token (non-blocking in this pipeline)
- Build output chunk count: N/A (not directly emitted as count in build log)

### CF Pages Deployment
- Deploy: SUCCESS
- Version ID: `f526cf90-f4b2-4a32-bf9d-1fd169d58987`

### Site Verification (Chrome DevTools)
- Homepage: WORKS (`https://divelog.ada-kr-pos.com/` rendered with full content)
- /journey: WORKS (`https://divelog.ada-kr-pos.com/journey` rendered with stage list/cards)
- Console errors: NONE

### Final Recommendation for Wave 4
YES — use `future.v8_splitRouteModules: true`. It is compatible with current CF Pages deployment flow and runtime rendering in production.
