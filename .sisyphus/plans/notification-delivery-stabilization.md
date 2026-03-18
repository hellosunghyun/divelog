# Notification Delivery Stabilization

## TL;DR

> **Quick Summary**: 인앱 알림을 넓은 범위로 확장하되, 전달 실패가 사용자 액션을 깨뜨리지 않도록 중앙 Notification Service, 유형별 opt-out 설정, unread 배지 정확도, 링크/도달성 검증까지 한 번에 정리한다.
>
> **Deliverables**:
> - 알림 생성 단일 진입점과 중복/자기알림/설정 체크 로직
> - 알림 유형별 사용자 설정 저장 구조와 설정 UI
> - 멘션/응답/답글/댓글 내 멘션/참가자/리마인더/Stage 전환 알림 적용
> - 인박스/API/GlobalNav unread 배지 정확도 및 canonical 링크 정리
> - Queue 기반 비동기 전달 경로와 회귀 테스트
>
> **Estimated Effort**: Large
> **Parallel Execution**: YES - 4 waves
> **Critical Path**: T1 -> T5 -> T6/T7/T9 -> T11 -> T12

---

## Context

### Original Request
모든 코드에서 알림이 필요한 내용을 넓게 식별하고, 해당 유저에게 잘 도달하도록 안정화한다. 설정에서 특정 알림을 끌 수 있어야 하며, 맨션/댓글/댓글 내 맨션을 포함해야 한다. 네비게이션바 알림에는 unread 숫자 배지도 보여야 한다.

### Interview Summary
**Key Discussions**:
- 인앱 알림 안정화가 우선이며 이메일 실발송은 이번 범위에서 제외한다.
- 가능한 넓은 범위로 알림을 적용하되, 사용자별 유형 opt-out을 제공한다.
- 최소 포함 범위는 기록 응답, 답글, 기록/응답 내 멘션, unread 배지 갱신이다.
- 테스트 전략은 TDD로 확정했다.

**Research Findings**:
- `app/db/queries/social/notifications.server.ts`에 생성/조회 함수는 있으나 현재 실제 트리거는 일부만 연결되어 있다.
- `app/routes/public/logs/$recordSlug.server.ts`는 응답/답글 알림만 처리한다.
- `app/db/queries/dialogue/mentions.server.ts`는 멘션을 동기화하지만 알림은 만들지 않는다.
- `app/routes/public/settings.tsx`와 `app/db/schema.server.ts`에는 `notificationEmailEnabled`만 있고, 유형별 설정은 없다.
- `app/components/layout/GlobalNav.tsx`는 unread 배지를 렌더링하지만 알림 커버리지와 데이터 갱신 정확도 개선이 필요하다.
- `wrangler.toml`에는 Queue producer만 있고 `workers/app.ts`에 consumer가 없다.

### Metis Review
**Identified Gaps** (addressed in this plan):
- `actorId` 부재로 발신자 식별/아바타/추적이 어렵다 -> 스키마 보강 작업 포함
- `getUnreadCount()`가 전체 row를 읽어 count한다 -> COUNT + index 최적화 포함
- 참가자 알림이 재저장 시 중복될 수 있다 -> idempotency 작업 포함
- draft 가시성 콘텐츠에도 알림이 생길 수 있다 -> visibility guardrail 포함
- questionId 전용 알림 링크 정의가 불명확하다 -> canonical destination 규칙 포함

---

## Work Objectives

### Core Objective
알림 생성, 수신자 결정, 환경 설정, 전달 경로, 읽음 상태, unread 배지, 링크 이동을 하나의 일관된 시스템으로 정리해 사용자에게 필요한 알림이 빠지지 않고 과도하게 중복되지 않도록 만든다.

### Concrete Deliverables
- 알림 서비스 계층과 관련 DB 마이그레이션
- 유형별 알림 환경설정 저장/조회/적용 로직
- 멘션/응답/답글/참가자/리마인더/Stage 전환 트리거
- Queue consumer + producer 기반 비동기 전달 경로
- `/api/notifications`, `/inbox`, `GlobalNav` unread 배지/링크 정합성 개선
- 단위 테스트 + E2E/agent QA 시나리오

### Definition of Done
- [ ] `pnpm test`에서 알림 관련 신규/기존 테스트가 모두 통과한다.
- [ ] `pnpm typecheck`가 통과한다.
- [ ] 설정에서 특정 알림 유형을 끄면 해당 유형 알림 row가 생성되지 않는다.
- [ ] 새 알림이 생기면 GlobalNav unread 배지가 증가하고 읽음 처리 시 감소한다.
- [ ] 멘션/응답/답글/댓글 내 멘션이 모두 인앱 알림으로 도달한다.

### Must Have
- 자기 자신에게는 어떤 유형도 알림이 생성되지 않아야 한다.
- draft 콘텐츠에는 외부 사용자 대상 알림이 생성되지 않아야 한다.
- 알림 생성 실패가 원래 사용자 액션을 실패시키면 안 된다.
- 알림 제목/본문 UI 텍스트는 한국어를 사용한다.

### Must NOT Have (Guardrails)
- 이메일 실발송 구현 금지
- WebSocket/SSE/Web Push 구현 금지
- 알림 삭제/보관함/그룹핑까지 범위 확장 금지
- 라우트 action에서 `createNotification()` 직접 호출 금지; 중앙 서비스만 사용
- 수동 검증에 의존하는 acceptance criteria 금지

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — 모든 검증은 agent가 실행한다.

### Test Decision
- **Infrastructure exists**: YES
- **Automated tests**: TDD
- **Framework**: `vitest` + Playwright
- **If TDD**: 각 작업은 RED -> GREEN -> REFACTOR 순서로 진행한다.

### QA Policy
각 작업은 서비스 레벨 테스트와 agent-executed QA 시나리오를 모두 포함한다. Evidence는 `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`에 저장한다.

- **Frontend/UI**: Playwright
- **API/Backend**: Bash (`curl`) 또는 test runner
- **Library/Module**: `pnpm test -- <target>`
- **Queue/Worker**: Worker-compatible test 또는 명시적 mock 기반 검증

---

## Execution Strategy

### Parallel Execution Waves

Wave 1 (Start Immediately — foundation):
- T1 Schema migration for actorId/preferences/indexes
- T2 Notification preference query module + defaults
- T3 Notification service RED tests
- T4 Notification API/nav contract RED tests

Wave 2 (After Wave 1 — service + core triggers):
- T5 Notification service implementation
- T6 Response/reply trigger migration to service
- T7 Mention trigger integration for record/response/reply
- T8 Participant notification idempotency + visibility guard

Wave 3 (After Wave 2 — broader coverage + user controls):
- T9 Reminder/stage-transition trigger integration
- T10 Settings UI/action for per-type opt-out
- T11 API/inbox/GlobalNav canonical link + badge refresh
- T12 Queue-backed async delivery path

Wave FINAL (After all tasks):
- F1 Plan compliance audit
- F2 Code quality review
- F3 Real QA execution
- F4 Scope fidelity check

Critical Path: T1 -> T5 -> T6/T7 -> T10/T11 -> T12 -> F1-F4
Parallel Speedup: ~60% faster than sequential
Max Concurrent: 4

### Dependency Matrix
- **T1**: none -> T2, T5, T10, T12
- **T2**: T1 -> T5, T10
- **T3**: none -> T5
- **T4**: none -> T11
- **T5**: T1, T2, T3 -> T6, T7, T8, T9, T12
- **T6**: T5 -> T11
- **T7**: T5 -> T11
- **T8**: T5 -> T11
- **T9**: T5 -> T10, T11, T12
- **T10**: T1, T2, T9 -> F1-F4
- **T11**: T4, T6, T7, T8, T9 -> F1-F4
- **T12**: T1, T5, T9 -> F1-F4

### Agent Dispatch Summary
- **Wave 1**: T1 `unspecified-high`, T2 `quick`, T3 `quick`, T4 `quick`
- **Wave 2**: T5 `deep`, T6 `unspecified-high`, T7 `unspecified-high`, T8 `quick`
- **Wave 3**: T9 `unspecified-high`, T10 `visual-engineering`, T11 `visual-engineering`, T12 `deep`
- **FINAL**: F1 `oracle`, F2 `unspecified-high`, F3 `unspecified-high`, F4 `deep`

---

## TODOs

- [x] T1. Notification schema foundation

  **What to do**:
  - `notifications`에 `actorId`와 unread-count 최적화를 위한 index를 추가한다.
  - 유형별 opt-out을 저장할 `notification_preferences` 테이블 또는 동등한 구조를 추가한다.
  - 기존 `notificationEmailEnabled`와 충돌 없이 공존하도록 migration 전략을 정리한다.

  **Acceptance Criteria**:
  - [x] migration 파일이 추가되고 Drizzle schema와 일치한다.
  - [x] notifications unread count용 index가 정의된다.
  - [x] preference 저장 구조가 유형별 boolean default true를 제공한다.

  **Commit**: YES
  - Message: `feat(notifications): add delivery schema foundation`

- [x] T2. Notification preference query layer

  **What to do**:
  - preference read/write/upsert query 모듈을 만든다.
  - 알림 유형 enum/source-of-truth를 한 곳으로 모은다.
  - 사용자 설정이 없을 때 default true로 해석되는 accessor를 제공한다.

  **Acceptance Criteria**:
  - [x] `getNotificationPreferences` 류 accessor가 default-true 해석을 제공한다.
  - [x] `upsertNotificationPreferences` 류 writer가 저장/수정 모두 처리한다.
  - [x] 알림 유형 상수가 서비스/UI와 공유 가능하다.

  **Commit**: YES
  - Message: `feat(notifications): add preference query layer`

- [x] T3. Notification service RED tests

  **What to do**:
  - 중앙 Notification Service의 expected behavior를 먼저 실패 테스트로 정의한다.
  - self-notification 방지, draft guard, opt-out, dedupe, actor fallback을 모두 RED 상태로 고정한다.

  **Acceptance Criteria**:
  - [x] service tests가 최소 self-notify, opt-out, dedupe, draft-guard, actor fallback을 포함한다.
  - [x] RED 상태에서 실패 이유가 명확하다.

  **Commit**: YES
  - Message: `test(notifications): define service behavior contracts`

- [x] T4. Notification API and badge RED tests

  **What to do**:
  - `/api/notifications` contract를 unread count, canonical slug, type payload까지 검증하는 RED 테스트로 고정한다.
  - `GlobalNav` badge와 dropdown link data contract를 테스트한다.

  **Acceptance Criteria**:
  - [x] API contract tests가 `recordSlug` 또는 canonical destination을 요구한다.
  - [x] badge count rendering test가 unread 0/1/9+를 모두 검증한다.

  **Commit**: YES
  - Message: `test(notifications): lock api and badge contracts`

- [x] T5. Centralized notification service implementation

  **What to do**:
  - `app/lib/notifications/notify.server.ts` 같은 중앙 service를 구현한다.
  - 모든 알림 생성 전 self-check, draft guard, preference check, dedupe, actor metadata normalization을 수행한다.
  - 내부적으로만 `createNotification()`을 호출하도록 제한한다.
  - 실패 시 route action을 깨지 않도록 safe wrapper 결과를 반환한다.

  **Acceptance Criteria**:
  - [x] T3 RED 테스트가 GREEN으로 전환된다.
  - [x] service가 actorId, recipientId, type, target identifiers, visibility context를 받아 결정한다.
  - [x] 동일 이벤트 dedupe 규칙이 서비스 단에서 강제된다.

  **Commit**: YES
  - Message: `feat(notifications): add centralized notification service`

- [x] T6. Response and reply trigger migration

  **What to do**:
  - `$recordSlug` action의 top-level response, reply notification 생성을 service 호출로 교체한다.
  - 기록 작성자와 부모 응답 작성자 알림 정책을 service 입력으로 정리한다.
  - question response / connection / suggestion / resonance 모두 동일 규칙 아래 다룬다.

  **Must NOT do**:
  - 기존 성공/에러 메시지 UX를 바꾸지 않는다.
  - self-answer를 일반 response 알림 흐름에 섞지 않는다.

  **Acceptance Criteria**:
  - [ ] top-level response는 기록 작성자에게만 적절히 도달한다.
  - [ ] reply는 부모 응답 작성자와 필요한 경우 기록 작성자까지 도달한다.
  - [ ] actor == recipient인 경우 row가 생성되지 않는다.

  **Commit**: YES
  - Message: `refactor(notifications): route responses through service`

- [x] T7. Mention trigger integration for record, response, reply

  **What to do**:
  - 기록 content, 응답 content, 답글 content에서 멘션된 사용자에게 mention 알림을 생성한다.
  - 같은 콘텐츠에서 같은 사용자를 여러 번 멘션해도 1회만 보내도록 dedupe한다.
  - question-only target 또는 response target의 canonical destination 규칙을 정한다.

  **Must NOT do**:
  - self-mention 알림을 만들지 않는다.
  - draft visibility 콘텐츠 멘션 알림을 보내지 않는다.

  **Acceptance Criteria**:
  - [ ] 기록 작성/수정 후 멘션된 사용자에게 mention 알림이 간다.
  - [ ] 응답/답글 내 멘션도 동일하게 작동한다.
  - [ ] 같은 사용자 중복 멘션은 1건으로 제한된다.

  **Commit**: YES
  - Message: `feat(notifications): add mention event delivery`

- [x] T8. Participant notification hardening

  **What to do**:
  - participant_added 알림을 중앙 service로 옮긴다.
  - 재저장/재동기화 시 같은 참가자에게 중복 알림이 쌓이지 않게 idempotency를 넣는다.
  - draft/private visibility에서 알림 생성 여부를 명시적으로 통제한다.

  **Acceptance Criteria**:
  - [ ] 같은 참가자 집합을 다시 저장해도 participant_added 중복 row가 늘지 않는다.
  - [ ] draft visibility에서는 외부 참가자 알림이 차단된다.

  **Commit**: YES
  - Message: `fix(notifications): harden participant delivery`

- [x] T9. Reminder and stage-transition event coverage

  **What to do**:
  - FRD 기준으로 self-answer reminder, reread reminder, stage transition 알림 생성 경로를 구현한다.
  - 현재 존재하는 reminder query/test 자산을 활용해 인앱 알림 row 생성으로 연결한다.
  - 질문만 가리키는 알림 destination 규칙을 정의한다.

  **Acceptance Criteria**:
  - [ ] unanswered self-question reminder가 opt-out과 self-notify guard를 지키며 생성된다.
  - [ ] reread reminder가 별도 type으로 생성된다.
  - [ ] stage transition 시 대상 사용자에게 stage-type 알림이 생성된다.

  **Commit**: YES
  - Message: `feat(notifications): add reminder and stage events`

- [x] T10. Settings UI and persistence for per-type opt-out

  **What to do**:
  - `/settings`의 알림 섹션을 유형별 토글 UI로 확장한다.
  - 기존 `notificationEmailEnabled`와 인앱 유형별 토글을 함께 저장하되 의미를 분리한다.
  - 설정 저장 후 다시 로드해도 상태가 정확히 유지되도록 한다.

  **Acceptance Criteria**:
  - [ ] 설정 화면에 최소 응답, 멘션, 리마인더, Stage 전환 토글이 나타난다.
  - [ ] 저장 후 재로딩 시 토글 상태가 유지된다.
  - [ ] 꺼진 유형은 이후 서비스 레벨에서 실제 생성이 차단된다.

  **Commit**: YES
  - Message: `feat(settings): add notification type controls`

- [x] T11. API, inbox, and GlobalNav unread badge correctness

  **What to do**:
  - `/api/notifications`가 unread count와 canonical destination data를 함께 반환하도록 정리한다.
  - `inbox`와 `GlobalNav`가 동일한 destination rule을 사용하도록 맞춘다.
  - GlobalNav unread 배지가 새 알림 발생 후 polling으로 갱신되고 읽음 처리 후 감소하도록 한다.

  **Acceptance Criteria**:
  - [ ] unread count는 COUNT 기반 쿼리와 일치한다.
  - [ ] badge는 0일 때 숨고, 1 이상이면 보이며, 10 이상이면 `9+`로 축약된다.
  - [ ] dropdown/inbox 링크가 canonical destination으로 이동한다.

  **Commit**: YES
  - Message: `feat(notifications): sync nav badge and destinations`

- [x] T12. Queue-backed async delivery path

  **What to do**:
  - `wrangler.toml`에 consumer 설정을 추가하고 `workers/app.ts`에 `queue` handler를 구현한다.
  - route/service는 직접 insert 대신 queue publish를 우선 사용하고, 필요한 경우 graceful fallback을 둔다.
  - queue consumer가 service 또는 lower-level insert path를 호출해 알림을 최종 저장하게 한다.

  **Acceptance Criteria**:
  - [ ] queue consumer가 알림 payload를 수신해 최종 알림 row를 생성한다.
  - [ ] producer publish 실패 시 원래 액션은 성공하고 fallback/logging이 남는다.
  - [ ] queue path 테스트가 payload shape와 consumer 처리 결과를 검증한다.

  **Commit**: YES
  - Message: `feat(notifications): add queue-backed delivery`

---

## Final Verification Wave

- [x] F1. **Plan Compliance Audit** — `oracle`
  모든 Must Have / Must NOT Have / evidence 파일을 계획과 대조한다.

- [x] F2. **Code Quality Review** — `unspecified-high`
  `pnpm typecheck`, `pnpm test`, lint 성격 점검, direct `createNotification` 잔존 여부를 확인한다.

- [x] F3. **Real QA** — `unspecified-high`
  알림 생성, unread 배지, 설정 opt-out, 링크 이동, 읽음 처리, queue 전달 흐름을 모두 실행한다.

- [x] F4. **Scope Fidelity Check** — `deep`
  알림 외 영역으로 수정이 새지 않았는지, 제외 범위가 지켜졌는지 확인한다.

---

## Commit Strategy

- T1: `feat(notifications): add delivery schema foundation`
- T5: `feat(notifications): add centralized notification service`
- T6-T9: `feat(notifications): wire event triggers`
- T10-T11: `feat(notifications): add preferences and badge refresh`
- T12: `feat(notifications): add queue-backed delivery`

---

## Success Criteria

### Verification Commands
```bash
pnpm typecheck
pnpm test
```

### Final Checklist
- [ ] 모든 신규 알림 유형이 서비스 계층을 통해 생성된다.
- [ ] 사용자 opt-out이 DB insertion 전에 적용된다.
- [ ] unread 배지와 인박스 수치가 일치한다.
- [ ] queue 경로 실패 시에도 사용자 액션은 성공한다.
