# Issues — divelog-fullbuild

## Known Issues
(none yet — will be populated as work progresses)

## [2026-03-14] T22
- 없음 (구현/타입체크/빌드 모두 통과)

## [2026-03-17] Task: Stage Groups Utility
- `pnpm typecheck`는 이번 변경 파일과 무관한 기존 오류로 실패했다. 주요 블로커는 `app/components/admin/AdminSidebar.tsx`의 icon prop 타입 불일치, `app/db/queries/dialogue/*.server.ts`의 Drizzle select 타입 오류, 일부 admin/public route의 누락 import이다.

## [2026-03-18] Task: PersonSearch Component
- `app/components/PersonSearch.tsx` 자체 LSP 진단과 `PersonSearch` 필터 타입체크는 통과했지만, 전체 `pnpm typecheck`는 기존 저장소 오류로 계속 실패했다. 이번 실행에서도 `app/components/admin/AdminSidebar.tsx`, `app/db/queries/dialogue/*.server.ts`, `app/lib/auth/auth.middleware.ts`, 일부 admin/public route와 API 테스트 파일이 동일하게 막고 있다.

## [2026-03-18] Task: Record Participants Query Module
- `pnpm test` 전체 실행은 이번 변경과 무관한 기존 `app/db/queries/__tests__/mentions.test.ts` 2건 실패로 non-zero 상태다(`getMentionsByRecord` mock shape mismatch).
- 신규 `participants.test.ts`는 별도 실행에서 6/6 PASS, `pnpm typecheck | grep "participants" | grep "error TS" | wc -l` 결과는 0으로 확인했다.
