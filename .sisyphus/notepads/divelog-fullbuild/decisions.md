# Decisions — divelog-fullbuild

## Architectural Decisions
- Auth: @adakrpos/auth/generic (NOT hono/express)
- No self-hosted login/register UI
- learner_profiles caches: display_name, profile_photo_url, cohort from AdakrposUser
- cohort stored as TEXT string (NOT a separate cohorts table)
- M:N relationships via junction tables (NOT JSON arrays)
- Global DB instance: FORBIDDEN (create from binding per request)

## Seed Data Fixed Slugs
- Stage: prelude-1 (active, is_current=true), bridge-1 (completed), challenge-1 (active)
- Record: first-note (Note, Public), challenge-article (Article)
- Learner: learner-hana (3+ records, has questions)
- Challenge: team-challenge (has collaboration), solo-challenge (no collaboration)
- Collaboration Unit: collab-alpha (active)
- All cohort values: "cohort-2026"

## [2026-03-14] T21 Decisions
-  action 인증 정책은 수동 체크 대신  공통 미들웨어를 사용해 일관성 유지
- 기록 상세 로더의 다중 조회는 개별 await 대신 db.batch()로 고정해 페이지 로딩 패턴 통일

## [2026-03-14] T21 Decisions
- /logs/:recordSlug action 인증 정책은 수동 체크 대신 requireVerified 공통 미들웨어를 사용해 일관성 유지
- 기록 상세 로더의 다중 조회는 개별 await 대신 db.batch()로 고정해 페이지 로딩 패턴 통일

## [2026-03-14] T22 Decisions
- `/write` 접근 정책은 route loader/action 모두 `requireVerified`를 사용해 인증/검증 조건을 서버에서 강제
- 템플릿은 Phase 1에서 본문 자동주입 없이 선택 UI만 제공하고, 작성 본문은 사용자가 `textarea`에서 직접 입력하도록 유지
- 선택 질문은 record 생성 성공 이후에만 생성하며, 빈 문자열은 저장하지 않음

## [2026-03-18] Record Participants Decisions
- 참여자 싱크는 upsert 대신 `delete -> filtered bulk insert`로 고정해서 요청 payload가 source of truth가 되도록 결정.
- 작성자 본인 제외 로직은 클라이언트가 아니라 DAL(`syncParticipantsForRecord`)에서 강제해 모든 호출 경로에서 동일 동작을 보장.
- 참여자 프로필 로딩은 개별 조회를 금지하고 `getParticipantsBatch()` IN 쿼리 API를 기본 경로로 사용.

## [2026-03-18] Learner profile record sections
- 러너 프로필의 `함께한 기록`/`언급된 기록`은 새 탭을 만들지 않고 기존 `기록` 탭 하단 섹션으로 합쳐 정보 구조를 유지한다.
- 본인 프로필이 아닐 때는 서버 질의 결과가 `cohort`를 포함해도 UI에서 `public`만 노출해 현재 공개 정책과 페이지 구조를 동시에 지킨다.
