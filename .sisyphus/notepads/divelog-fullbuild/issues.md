# Issues — divelog-fullbuild

## Known Issues
(none yet — will be populated as work progresses)

## [2026-03-14] T22
- 없음 (구현/타입체크/빌드 모두 통과)

## [2026-03-17] Task: Stage Groups Utility
- `pnpm typecheck`는 이번 변경 파일과 무관한 기존 오류로 실패했다. 주요 블로커는 `app/components/admin/AdminSidebar.tsx`의 icon prop 타입 불일치, `app/db/queries/dialogue/*.server.ts`의 Drizzle select 타입 오류, 일부 admin/public route의 누락 import이다.
