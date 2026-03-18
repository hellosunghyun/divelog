# Learnings — people-tag-system

## [2026-03-18] Session Start: ses_3001ca68cffe09ORafvZ5CRrzM

### Key Conventions
- Worktree: /Users/hellosunghyun/Documents/Github/divelog-people-tag
- Branch: feat/people-tag-system
- All work must happen in the worktree path above

### Codebase Patterns (from plan research)
- `mentions` 테이블 존재하나 UI 없음, regex 추출만 동작
- `tags` + `recordTags` 완전하나 생성 폼에 미포함
- `record_participants` 테이블 없음 → 신규 생성 필요
- `/api/search-learners` API 존재 (id, slug, displayName, profilePhotoUrl 반환) — 응답은 `response.results` 배열로 접근
- vitest 4.1.0 이미 설치·구성됨 (인프라 세팅 불필요)
- Admin tags에 `TagWithUsage` TypeScript 에러 (33행, 45행, 284행)

### typecheck 기준
- 전역 `pnpm typecheck → 0 errors`는 이 플랜의 게이트로 부적합 (다른 파일들에 기존 에러 존재)
- 이 플랜 기준: `pnpm typecheck 2>&1 | grep -E "(PersonSearch|TagSelector|participants|recordParticipants|mentions\.server|note\.tsx|article\.tsx|recordSlug|learnerSlug|admin/tags)" | grep "error TS" | wc -l` → 0

### DB Patterns
- STRICT tables, `unixepoch()` for timestamps
- junction tables: 복합 PK 패턴 (recordTags 참조)
- `collaborationMembers`에 role 필드가 있는 패턴 참조
- `app/db/queries/__tests__/` — 테스트 파일 위치

### 알림 중복 제거
- 동일 `(recipientId, recordId)` 기준 1건만 발송
- 참여자 알림 > 언급 알림 우선순위
