# Decisions

## [2026-03-17] Session Start
- Wave 0: T1(web-vitals) + T3(bundle analysis) can run in parallel. T2(baseline measure) must wait for T1.
- prerender: REMOVED from plan (CF Vite plugin doesn't support it)
- Guardrail: Admin routes NOT touched in this plan
- Static imports: validate on /guide first (spike T10) before batch converting all 44 files
- splitRouteModules: validate on CF (spike T11) before enabling
- /__manifest caching: Workers Cache API (caches.default), cache key MUST include query string
- _headers: /assets/* only, NOT HTML or other dynamic routes

## [2026-03-18] Task 10 Spike Decision
- GO: `app/routes/public/guide.tsx` loader의 dynamic import -> static import 전환을 Cloudflare Pages에서 허용한다.
- 근거: 빌드/배포 성공, `/guide` 런타임 정상(200, 렌더/콘솔 오류 없음).
- 주의: 단일 샘플 TTFB 개선은 미확인(+85ms). Wave 3 대량 전환 시 경로별 다회 측정 병행.

## [2026-03-18] Task 11 Spike Decision
- NO-GO: `future.unstable_splitRouteModules`는 현재 스택에서 사용하지 않는다.
- 근거: React Router 7.12.0 빌드가 해당 키를 거부하며 즉시 실패한다.
- 후속 방침: split route modules 검증이 필요하면 `future.v8_splitRouteModules`로 별도 스파이크를 진행한다.

## [2026-03-18] Task 11 Retry Decision (Final)
- GO: `future.v8_splitRouteModules: true`를 채택한다.
- 근거: build/deploy 성공 + 프로덕션 `/`/`/journey` 렌더 및 콘솔 에러 없음.
- Wave 4(T19) 적용 방침: stabilized 키(`v8_splitRouteModules`) 기준으로 진행.

## [2026-03-18] Task 12 Decision
- GO: `/__manifest`는 Workers Cache API(`caches.default`)로만 캐시하고, 일반 SSR/기타 경로는 기존 handler 흐름을 유지한다.
- Cache key는 `request` 객체 그대로 사용해 query string 기반 버전 분기를 보존한다.
- 캐시는 성공 응답 + no `set-cookie` 조건에서만 저장하고, 저장 작업은 `ctx.waitUntil`로 비차단 처리한다.

## [2026-03-18] Wave 2 Spike Consolidation (Task 13)
- All 3 spikes: GO (no blockers for Wave 3/4)
- T10 (static imports): GO — CF safe, TTFB gain to be validated per-route
- T11 (v8_splitRouteModules): GO — already enabled in react-router.config.ts, Wave 4 just verifies
- T12 (/__manifest caching): DONE — deployed with immutable cache + query-string key
- Wave 3 focus: batch static imports + parallelize DB calls + shouldRevalidate expansion
- Wave 4 focus: verify v8_splitRouteModules + clientLoader cache strategy

## [2026-03-18] Task 14 Decision
- GO: public route loader/action의 dynamic import 제거는 유지한다.
- 단, `clientLoader`/`clientAction`가 있는 route(`journey/$stageSlug`, `learners/$learnerSlug`, `logs/$recordSlug`)는 route 파일에 `.server` 모듈을 직접 정적 import하지 않고, sibling `.server.ts` 파일로 loader/action 구현을 분리한다.
- 근거: direct top-level `.server` import는 client build에서 `Server-only module referenced by client` 오류를 유발했고, sibling `.server.ts` re-export 패턴은 `pnpm run build`를 통과했다.

## [2026-03-18] Task 15 Decision
- GO: `$recordSlug.server.ts` loader의 post-batch 독립 DB 조회는 `Promise.all` 병렬화를 기본으로 채택한다.
- `incomingLinks`는 실패 허용 쿼리이므로 전체 로더 실패를 막기 위해 개별 `.catch()` + warn 로깅 + 빈 배열 fallback을 유지한다.
- author/admin 권한 기반 `revisions` 조회는 권한 판별 이후 조건부 실행 구조를 유지한다.

## [2026-03-18] Task 18 Decision
- Wave 3 성능 비교 기준 문서는 `.sisyphus/evidence/wave-3-loaders.md`로 고정한다.
- Total Reqs는 `list_network_requests(includePreservedRequests=false)` count를 기준값으로 사용한다.
- `/write/article`는 비인증 리다이렉트 페이지(`ada-kr-pos.com/login`)를 계속 측정 대상으로 유지한다.
