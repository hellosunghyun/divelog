# Learnings — ux-reflection-overhaul

## [2026-03-17] T1: UX Reflection Overhaul Schema
- 신규 스키마 5종(`drafts`, `question_reminders`, `question_carry_overs`, `saved_records`, `personal_stage_reflections`)은 migration SQL에서 STRICT + FK + 인덱스를 함께 정의하면 D1 로컬 적용이 안정적이다.
- `questions`에 `updated_at`/`closed_at`를 추가할 때 `DEFAULT (unixepoch())` + nullable 조합으로 기존 데이터와의 호환을 유지했다.
- 쿼리 모듈은 기존 패턴과 동일하게 `db(d1)` 팩토리를 사용하고, upsert성 로직은 `select -> insert/update -> select` 2단계 조회로 반환 일관성을 맞추는 패턴이 유효했다.
- query unit test는 실제 D1 없이 `db` 팩토리 모킹만으로도 핵심 플로우(생성/조회/갱신/삭제)를 검증할 수 있었다.
- seed QA fixture는 파일 끝 `-- QA FIXTURES` 섹션에 추가하고, 종료 상태 stage/타임라인 레코드/record_links/question_carry_overs를 함께 넣어 회귀 검증 데이터 세트를 만들었다.

## [2026-03-17] T2: Autosave Server Endpoint + Zod Validation
- API autosave는 `throw redirect` 대신 `Response.json` 상태코드(401/403/400/500)로 응답해야 작성 화면에서 앱 흐름이 깨지지 않는다.
- autosave 입력은 `application/json`과 `multipart/form-data`를 모두 수용하되, 최종 `upsertDraft` 호출 직전에 `visibility: "draft"`를 강제하면 요구사항 위반을 방지할 수 있다.
- route unit test에서 `getAuth`/`upsertDraft`만 모킹해도 인증 실패, Zod 실패, 성공 저장, 재저장(덮어쓰기 의도) 흐름을 빠르게 검증할 수 있다.
