## 2026-03-17 Task 1
- `~/components/*` 경로를 도메인 하위 폴더로 일괄 치환할 때, `app` 전체 `.ts/.tsx`를 대상으로 문자열 치환하면 누락 없이 반영된다.
- 이동 직후 깨지는 상대 경로는 `app/components/activity/ActivityFeed.tsx`, `app/components/views/TimelineView.tsx`, `app/components/content/ContentRenderer.tsx` 3개가 핵심이었다.
- `SmartLink`는 fan-out이 높아서(`~/components/content/SmartLink` 52건) 우선 검증 포인트로 유용했다.
