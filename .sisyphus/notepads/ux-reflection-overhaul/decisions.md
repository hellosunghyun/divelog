# Decisions — ux-reflection-overhaul

## [2026-03-17] T2: Autosave Server Endpoint + Zod Validation
- autosave 엔드포인트는 `request.json()`과 `request.formData()`를 모두 허용해 에디터 전송 방식 변화에 대응한다.
- autosave payload에 `visibility`가 포함되어도 서버에서 항상 `draft`로 강제해 임시저장 정책을 보장한다.
