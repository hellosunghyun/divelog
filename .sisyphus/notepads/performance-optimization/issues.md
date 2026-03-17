# Issues & Gotchas

## 알려진 기술 제약
- D1 batch에서 JOIN 쿼리는 컬럼 매핑 충돌 — JOIN 있는 쿼리는 batch 밖에서 실행
- KV 바인딩 제거됨 — auth 캐싱은 CF Cache API만 허용
- `@adakrpos/auth` 패키지 수정 불가 (외부)

## wrangler.deploy.toml 주의
- `package.json:8`의 deploy 스크립트는 `wrangler.deploy.toml` 사용
- API 키가 `wrangler.toml`과 `wrangler.deploy.toml` 양쪽에 있음 — 둘 다 수정 필요

## 기존 LSP 에러 (수정 대상 아님)
- `app/routes/_admin.tsx:43:10` — Property 'title' is missing in AdminContextBarProps
  → 이번 스코프 외, 건드리지 않음

## Final Review F3 blocker
- 2026-03-18 manual QA에서 `curl -s https://divelog.ada-kr-pos.com/ | grep -c "data-testid"` 결과가 `2`로 측정됨
- 기대값 `7+`를 충족하지 못해 Final Review F3 verdict는 `REJECT`

## Final Review F2 blocker
- 2026-03-18 `pnpm typecheck 2>&1 | grep "error TS" | grep -v "autosave.test\|journey/index\|admin/tags\|_admin.tsx\|AdminSidebar\|questions.server" | head -20` 에서 제외 목록 밖 신규 TS 에러 9건이 확인됨
- 신규 에러 파일: `app/db/queries/dialogue/responses.server.ts`, `app/routes/admin/analytics.tsx`, `app/routes/admin/curation.tsx`, `app/routes/admin/index.tsx`, `app/routes/admin/roles.tsx`, `app/routes/admin/settings.tsx`
- `pnpm test` 는 `24 passed / 207 passed` 로 통과했고, 지정된 변경 파일 10개는 quality marker grep/LSP diagnostics 기준으로 모두 clean
- `build/client/assets/*.js` 총량은 `2.3M`, 파일 수는 `110`으로 baseline 총량과 동일하지만 파일 수는 `+1`
- 신규 타입 에러가 남아 있어 Final Review F2 verdict는 `REJECT`
