## 2026-03-17 Task 1
- `~/components/*` 경로를 도메인 하위 폴더로 일괄 치환할 때, `app` 전체 `.ts/.tsx`를 대상으로 문자열 치환하면 누락 없이 반영된다.
- 이동 직후 깨지는 상대 경로는 `app/components/activity/ActivityFeed.tsx`, `app/components/views/TimelineView.tsx`, `app/components/content/ContentRenderer.tsx` 3개가 핵심이었다.
- `SmartLink`는 fan-out이 높아서(`~/components/content/SmartLink` 52건) 우선 검증 포인트로 유용했다.

## 2026-03-17 Task 2 (queries reorg)
- `app/db/queries` flat 파일 21개를 6개 도메인 폴더로 이동하면, 내부 `from "../client.server"`, `from "../schema.server"`는 `../../`로 depth 보정이 필요하다.
- `from` 구문 외에도 `await import("../schema.server")` 같은 문자열 import가 남아 TS2307을 유발하므로 추가 grep으로 잔여 경로를 확인해야 한다.
- 대규모 경로 치환 시 `app/db/queries/admin`은 제외 대상으로 prune 처리해 Task 경계(관리자 쿼리 분리 작업)를 유지할 수 있다.
