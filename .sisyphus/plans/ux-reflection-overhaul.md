# DiveLog UX 회고 경험 개선 — "기록 서비스 → 회고 플랫폼" 전환

## TL;DR

> **Quick Summary**: UX 전문가 피드백 42개 항목 전면 반영. "기록을 보여주는 UI"에서 "회고가 일어나는 UX"로 전환. 쓰기 마찰 제거(autosave, progressive disclosure), 질문 구조 강화(timeline, carry-over, capture), 다시 돌아오기 경험 설계(reminders, re-visit, ritual).
>
> **Deliverables**:
> - Autosave + Draft Recovery 시스템 (localStorage + D1 서버 동기화)
> - Write Flow 전면 개편 (progressive disclosure, 제목 선택형, 질문 캡처, warm-up prompt)
> - Home 내러티브 전환 (숫자 활동 블록 → 서술형 digest)
> - Record Detail 회고 UX (응답 접힘, 질문 타임라인, 응답 구분)
> - Mobile 회고 경험 (floating write CTA, bottom sheet 필터, compact footer)
> - Re-visit 시스템 (/me 재방문 UX, 질문 리마인드, Stage 회고 의식)
> - 기록 카드 의미 차별화 (질문/자기답변/연결 시각 표시)
> - Note → Article 확장, 문장 → 질문/기록 전환
>
> **Estimated Effort**: XL
> **Parallel Execution**: YES — 6 Waves + Final
> **Critical Path**: T1 → T2 → T6 → T10 → T20 → F1

---

## Context

### Original Request
UX 전문가 3개 리뷰 피드백을 기반으로 DiveLog의 모든 UX 개선 항목을 우선순위 상관없이 전부 반영하는 계획 수립. 핵심 진단: "기록을 잘 보여주는 것"이 아니라 "회고가 더 잘 일어나게 만드는 것"이 목표.

### Interview Summary
**Key Decisions**:
- 기존 48-task fullbuild 완료 상태 위에 UX 개선 레이어
- 자동 저장: 기존 "Must NOT Have" guardrail 해제 (사용자 명시적 요청)
- `records.title` NOT NULL 유지: SQLite 제약으로 nullable 변경 불가. 센티넬 값 `"(무제)"` 사용
- localStorage 우선 draft recovery (Dexie.js 불필요)
- React Router 7 `clientAction` + `setTimeout` + `request.signal` autosave 패턴
- Note 에디터는 textarea 유지, TipTap은 Article만
- 리마인드는 in-app 알림만 (이메일 발송 제외)
- 내러티브 digest는 쿼리 리팩터링 (LLM 아님)
- 질문 carry-over는 단일 홉만 (자동 연쇄 아님)

**Research Findings**:
- 코드베이스: 24 테이블, 16 쿼리 모듈, 모든 라우트 완전 구현
- Write: Note(textarea 309줄) + Article(TipTap 571줄), autosave 없음
- Home: ActivityFeed = 숫자형 ("N개의 새 기록"). Hero 존재.
- Record Detail: 845줄, 응답 폼 항상 노출, timeline 없음
- Mobile: Write CTA 존재하나 햄버거 메뉴 안에서 발견성 낮음
- Schema: drafts 테이블 없음, reminders 없음, carry-over 없음
- selfAnswers 테이블과 responses.type='self_answer' 이중 저장 존재
- collective_memories + junction tables로 Stage 회고 인프라 존재
- record_links로 Note→Article 확장 인프라 존재
- D1 write rate: autosave 5-10초 간격 안전
- TipTap `onUpdate` → `onChange(editor.getJSON())` 이미 연결

### Metis Review
**Identified Gaps** (addressed):
- `records.title` nullable 불가 → 센티넬 `"(무제)"` + drafts 테이블 분리
- Dexie.js 불필요 → localStorage 충분
- `createNotification()` 중앙화 필요 → Wave 1에서 유틸 함수 추출
- selfAnswers 이중 저장 → 계획에서 명시적으로 문서화 (변경하지 않음, 리스크만 인지)
- Queue consumer 미존재 → Queue 의존 기능 제외
- 템플릿 테이블 seed 데이터 미확인 → warm-up prompt는 하드코딩 (템플릿 테이블 미사용)
- 모바일 Write CTA "숨겨짐"은 부정확 → "발견성 낮음"으로 정정, floating CTA는 유효
- Dual-tab autosave 충돌 → last-write-wins 단순 전략

---

## Work Objectives

### Core Objective
DiveLog UX를 "기록 서비스"에서 "회고 플랫폼"으로 전환. 쓰기 시작 마찰 제거, 질문 구조 강화, 다시 돌아오기 경험 설계의 3축으로 42개 UX 개선 전면 반영.

### Concrete Deliverables
- Schema: 5개 신규 테이블 + 2개 컬럼 추가 D1 마이그레이션
- Infrastructure: autosave hook, localStorage recovery, createNotification 유틸
- Write Flow: progressive disclosure, warm-up prompt, question capture, title optional, note→article expansion
- Home: narrative digest, question card enrichment, hero tone, floating CTA
- Record List: card differentiation, mobile bottom sheet filter
- Record Detail: response collapse, question timeline, response UX 개선
- Mobile: floating write CTA, form density, compact footer
- Re-visit: /me 재방문 UX, question reminders, stage closing ritual, carry-over
- Connection: sentence expansion, question search tab

### Definition of Done
- [ ] `npx react-router build` 성공
- [ ] `tsc --noEmit` 타입 에러 0
- [ ] `pnpm test` 기존 + 신규 테스트 전부 통과
- [ ] 모든 migration `wrangler d1 migrations apply DB --local` 성공
- [ ] Playwright E2E: autosave, floating CTA, response collapse, progressive disclosure 통과

### Must Have
- Autosave (3초 debounce) + Draft Recovery (localStorage)
- Progressive Disclosure (내용 먼저, 메타데이터 나중에)
- 제목 선택형 (센티넬 `"(무제)"` fallback)
- 질문 캡처 (작성 중 질문 슬롯)
- Home 내러티브 digest (숫자 블록 대체)
- 응답 폼 기본 접힘
- 모바일 floating write CTA
- 기록 카드 의미 차별화 (질문/자기답변/이어진 기록 뱃지)
- /me 재방문 UX (미답변 질문 전면 배치)
- Stage 개인 회고 의식
- 질문 carry-over 메커니즘
- Note → Article 확장 버튼
- 모바일 필터 bottom sheet
- 허가형 warm-up prompt

### Must NOT Have (Guardrails)
- ❌ Autosave = Auto-Publish (초안 자동 공개 금지)
- ❌ `records.title` nullable 변경 (SQLite 제약)
- ❌ Dexie.js 또는 새 클라이언트 의존성 추가
- ❌ 이메일 발송, Cron Triggers, Queue consumer 구현
- ❌ Note 에디터 TipTap 전환 (textarea 유지)
- ❌ LLM/AI 통합 (내러티브 digest 포함)
- ❌ 좋아요/인기순/조회수/랭킹 (기존 guardrail 유지)
- ❌ SNS형 engagement feed
- ❌ 자동 질문 carry-over (작성자 수동 선택만)
- ❌ `records.title` / `records.content` nullable 변경
- ❌ 테이블 재생성이 필요한 destructive migration
- ❌ Node.js 전용 API (edge runtime 호환 필수)
- ❌ 응답을 댓글/말풍선처럼 보이는 UI
- ❌ 해양 일러스트/물고기 아이콘 추가

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed.

### Test Decision
- **Infrastructure exists**: YES (vitest 6개, Playwright 2개)
- **Automated tests**: YES (Tests-after — 구현 후 테스트)
- **Framework**: vitest (unit) + Playwright (E2E)

### QA Policy
- **Schema/Query 태스크**: vitest — 새 쿼리 함수마다 단위 테스트
- **컴포넌트 태스크**: vitest — 새 Zod 스키마, hook 테스트
- **페이지 UX 태스크**: Playwright — 핵심 UX 플로우 E2E
- **빌드 검증**: 매 Wave 후 `pnpm test && tsc --noEmit && npx react-router build`
- **Migration 검증**: `wrangler d1 migrations apply DB --local`
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`

### Playwright Auth Setup (MANDATORY — all authenticated E2E tests)

모든 인증 필요 E2E 테스트는 아래 패턴을 사용:

```typescript
// tests/e2e/helpers/auth.ts — Cookie injection helper
import { Page } from '@playwright/test';

export async function loginAsVerifiedUser(page: Page) {
  // .dev.vars의 TEST_VERIFIED_SESSION 값 사용
  await page.context().addCookies([{
    name: 'adakrpos_session',
    value: process.env.TEST_VERIFIED_SESSION || '',
    domain: 'localhost',
    path: '/',
  }]);
}

export async function loginAsAdmin(page: Page) {
  await page.context().addCookies([{
    name: 'adakrpos_session',
    value: process.env.TEST_ADMIN_SESSION || '',
    domain: 'localhost',
    path: '/',
  }]);
}
```

- T34 (E2E Test Suite)에서 `tests/e2e/helpers/auth.ts` 생성
- 모든 authenticated QA scenario에서 이 helper 사용
- `.dev.vars`의 `TEST_VERIFIED_SESSION`, `TEST_ADMIN_SESSION` 필요 (External Prerequisite — 기존 fullbuild QA convention과 동일)
- `playwright.config.ts`에 `.env` 로드 설정 (`dotenv` 또는 `--env-file` 옵션)

### Agent QA Convention
- Playwright 테스트는 `data-testid` 셀렉터 사용 (텍스트 매칭 아님)
- 기존 smoke 테스트 (`tests/e2e/smoke.spec.ts`) 반드시 통과 유지
- 새 E2E 테스트: `tests/e2e/{feature}.spec.ts`
- 인증 필요 테스트: `loginAsVerifiedUser(page)` 또는 `loginAsAdmin(page)` 호출 후 진행

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation — Schema + Infrastructure):
├── Task 1: Schema migrations (5 new tables + 2 column additions) [deep]
├── Task 2: Autosave server endpoint + query module [deep]
├── Task 3: createNotification() centralization [quick]
├── Task 4: localStorage draft recovery utility [quick]
└── Task 5: useAutosave hook (debounce + status indicator) [quick]

Wave 2 (Write Experience Overhaul — depends on Wave 1):
├── Task 6: Write Note: progressive disclosure + warm-up prompt [unspecified-high]
├── Task 7: Write Article: progressive disclosure + title optional [unspecified-high]
├── Task 8: Question capture during writing (note + article) [deep]
├── Task 9: Note → Article expansion flow [unspecified-high]
├── Task 10: Autosave integration (note) [unspecified-high]
├── Task 11: Autosave integration (article) [unspecified-high]
└── Task 12: Draft recovery UI (page load) [quick]

Wave 3 (Home + Navigation — partially parallel with Wave 2):
├── Task 13: Home: narrative digest (replace ActivityFeed) [deep]
├── Task 14: Home: question card enrichment [unspecified-high]
├── Task 15: Hero tone adjustment [visual-engineering]
├── Task 16: Mobile floating write CTA [visual-engineering]
└── Task 17: Mobile compact footer [quick]

Wave 4 (Record List + Detail — after Wave 2):
├── Task 18: Record list: card visual differentiation [visual-engineering]
├── Task 19: Record list: mobile filter bottom sheet [visual-engineering]
├── Task 20: Record detail: response form collapsed [unspecified-high]
├── Task 21: Record detail: question timeline visualization [deep]
├── Task 22: Record detail: response UX overhaul [unspecified-high]
└── Task 23: Record detail: mobile form density [quick]

Wave 5 (Re-visit, Ritual, Connection — after Waves 1+3):
├── Task 24: My Space (/me): re-visit UX overhaul [deep]
├── Task 25: Question reminders UI + backend [unspecified-high]
├── Task 26: Stage personal closing ritual [deep]
├── Task 27: Question carry-over mechanism + UI [deep]
├── Task 28: Sentence → Question/Record expansion [unspecified-high]
├── Task 29: Search: question tab [unspecified-high]
└── Task 30: Record connection UI enhancement [quick]

Wave 6 (Polish + Anti-patterns):
├── Task 31: Self-answer visual distinction [visual-engineering]
├── Task 32: Response editorial card styling [visual-engineering]
├── Task 33: Activity numbers reduction across pages [quick]
├── Task 34: E2E test suite for new UX flows [deep]
└── Task 35: Build verification + migration validation [quick]

Wave FINAL (Independent Review — 4 parallel):
├── F1: Plan compliance audit (oracle)
├── F2: Code quality review (unspecified-high)
├── F3: Full E2E QA (unspecified-high + playwright skill)
└── F4: Scope fidelity check (deep)

Critical Path: T1 → T2 → T6 → T10 → T20 → T34 → F1
Parallel Speedup: ~65% faster than sequential
Max Concurrent: 7 (Waves 2 & 5)
```

### Dependency Matrix

| Task | Depends On | Blocks | Wave |
|------|-----------|--------|------|
| T1 | — | T2-T5, T8, T25, T26, T27 | 1 |
| T2 | T1 | T10, T11 | 1 |
| T3 | T1 | T25 | 1 |
| T4 | — | T10, T11, T12 | 1 |
| T5 | T4 | T10, T11 | 1 |
| T6 | T4, T5 | T10 | 2 |
| T7 | T4, T5 | T11 | 2 |
| T8 | T1 | T21 | 2 |
| T9 | — | — | 2 |
| T10 | T2, T5, T6 | T34 | 2 |
| T11 | T2, T5, T7 | T34 | 2 |
| T12 | T4 | — | 2 |
| T13 | — | T33 | 3 |
| T14 | — | — | 3 |
| T15 | — | — | 3 |
| T16 | — | — | 3 |
| T17 | — | — | 3 |
| T18 | — | — | 4 |
| T19 | — | — | 4 |
| T20 | — | — | 4 |
| T21 | T8 | — | 4 |
| T22 | — | T32 | 4 |
| T23 | T20 | — | 4 |
| T24 | T1, T3 | — | 5 |
| T25 | T1, T3 | — | 5 |
| T26 | T1 | — | 5 |
| T27 | T1 | — | 5 |
| T28 | — | — | 5 |
| T29 | — | — | 5 |
| T30 | — | — | 5 |
| T31 | — | — | 6 |
| T32 | T22 | — | 6 |
| T33 | T13 | — | 6 |
| T34 | T10, T11, T16, T20 | F1-F4 | 6 |
| T35 | T34 | F1-F4 | 6 |

### Agent Dispatch Summary

- **Wave 1**: **5** — T1 → `deep`, T2 → `deep`, T3 → `quick`, T4 → `quick`, T5 → `quick`
- **Wave 2**: **7** — T6 → `unspecified-high`, T7 → `unspecified-high`, T8 → `deep`, T9 → `unspecified-high`, T10 → `unspecified-high`, T11 → `unspecified-high`, T12 → `quick`
- **Wave 3**: **5** — T13 → `deep`, T14 → `unspecified-high`, T15 → `visual-engineering`, T16 → `visual-engineering`, T17 → `quick`
- **Wave 4**: **6** — T18 → `visual-engineering`, T19 → `visual-engineering`, T20 → `unspecified-high`, T21 → `deep`, T22 → `unspecified-high`, T23 → `quick`
- **Wave 5**: **7** — T24 → `deep`, T25 → `unspecified-high`, T26 → `deep`, T27 → `deep`, T28 → `unspecified-high`, T29 → `unspecified-high`, T30 → `quick`
- **Wave 6**: **5** — T31 → `visual-engineering`, T32 → `visual-engineering`, T33 → `quick`, T34 → `deep`, T35 → `quick`
- **FINAL**: **4** — F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high` + `playwright`, F4 → `deep`

---

## TODOs

> Implementation + Test = ONE Task. Never separate.
> EVERY task MUST have: Recommended Agent Profile + Parallelization info + QA Scenarios.

### Wave 1: Foundation — Schema + Infrastructure

- [x] 1. Schema Migrations: 신규 테이블 5개 + 컬럼 추가 2개

  **What to do**:
  - D1 migration SQL 작성: `0005_ux_reflection_overhaul.sql`
  - 신규 테이블:
    - `drafts` (id, author_id, format, title, content, content_json, stage_id, challenge_id, rhythm, visibility, response_preference, created_at, updated_at) — autosave 임시 저장
    - `question_reminders` (id, question_id, learner_id, remind_at, sent_at, created_at) — 질문 리마인드
    - `question_carry_overs` (id, original_question_id, new_question_id, from_stage_id, to_stage_id, carried_at) — Stage 간 질문 이동
    - `saved_records` (learner_id, record_id, saved_at, PRIMARY KEY(learner_id, record_id)) — 북마크
    - `personal_stage_reflections` (id, stage_id, learner_id, let_go, carry_question, lasting_sentence, created_at, updated_at) — 개인 Stage 회고 의식
  - 컬럼 추가:
    - `questions`: `updated_at INTEGER DEFAULT (unixepoch())`, `closed_at INTEGER`
  - Drizzle 스키마 업데이트: `app/db/schema.server.ts`에 새 테이블 정의 추가
  - Relations 업데이트: `app/db/relations.server.ts`에 새 관계 추가
  - 쿼리 모듈 생성: `app/db/queries/drafts.server.ts`, `app/db/queries/reminders.server.ts`, `app/db/queries/carryOvers.server.ts`, `app/db/queries/savedRecords.server.ts`, `app/db/queries/reflections.server.ts`
  - 각 쿼리 모듈에 기본 CRUD 함수 작성
  - `seeds/seed.sql` 업데이트: 새 테이블용 QA test fixtures 추가:
    - closed status Stage 1개 (T26 QA용)
    - 질문 1개 + 자기답변 2개 + 응답 1개인 기록 (T21 QA용)
    - record_links 레코드 2개 (T30 QA용: expansion + reference 타입)
    - question_carry_overs 레코드 1개 (T27 QA용)
  - vitest 단위 테스트: 각 새 쿼리 함수

  **Must NOT do**:
  - `records.title` nullable 변경 시도 (SQLite 제약)
  - 기존 테이블 컬럼 삭제/이름 변경
  - NOT NULL without DEFAULT 추가

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: 5개 테이블 + 관계 + 쿼리 모듈 + 테스트 — 스키마 설계 깊이 필요
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 1 내에서)
  - **Parallel Group**: Wave 1
  - **Blocks**: T2, T3, T8, T25, T26, T27
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `app/db/schema.server.ts` — 기존 24개 테이블 정의 패턴 (sqliteTable, text, integer, primaryKey)
  - `app/db/relations.server.ts` — relations() 패턴
  - `app/db/queries/records.server.ts` — 쿼리 모듈 패턴 (db(d1) factory, Drizzle query builder)
  - `drizzle/migrations/0004_add_email_to_learner_profiles.sql` — 최신 migration 포맷

  **API/Type References**:
  - `app/db/schema.server.ts:records` — records 테이블 구조 (drafts 테이블 참고용)
  - `app/db/schema.server.ts:questions` — questions 테이블 (컬럼 추가 대상)
  - `app/db/schema.server.ts:notifications` — notifications 테이블 (reminders 참고)
  - `app/db/schema.server.ts:collectiveMemories` — collective_memories (reflections 참고)

  **WHY Each Reference Matters**:
  - `schema.server.ts` — Drizzle의 sqliteTable 정의 패턴, text/integer/primaryKey 사용법 확인
  - `relations.server.ts` — one(), many() 관계 정의 방식 확인
  - `queries/records.server.ts` — db 팩토리 패턴, eq/and/desc 등 Drizzle 쿼리 빌더 사용법
  - 최신 migration — SQL 포맷과 네이밍 컨벤션 확인

  **Acceptance Criteria**:
  - [ ] `wrangler d1 migrations apply DB --local` 성공
  - [ ] `wrangler d1 execute DB --local --command "SELECT sql FROM sqlite_master WHERE name='drafts'"` — 테이블 존재 확인
  - [ ] `tsc --noEmit` 타입 에러 0
  - [ ] vitest: 새 쿼리 함수 전부 PASS

  **QA Scenarios**:

  ```
  Scenario: drafts 테이블 CRUD 동작
    Tool: Bash (vitest)
    Preconditions: Migration 적용 완료, seed data 로드
    Steps:
      1. `pnpm vitest run app/db/queries/__tests__/drafts.test.ts`
      2. 테스트: createDraft → getDraftByAuthor → updateDraft → deleteDraft
      3. 테스트: getDraftByAuthor가 최신 draft만 반환하는지 확인
    Expected Result: 4개 테스트 PASS
    Failure Indicators: 테스트 FAIL, SQL 에러
    Evidence: .sisyphus/evidence/task-1-drafts-crud.txt

  Scenario: questions 컬럼 추가 확인
    Tool: Bash (wrangler)
    Preconditions: Migration 적용 완료
    Steps:
      1. `wrangler d1 execute DB --local --command "PRAGMA table_info(questions)"`
      2. updated_at, closed_at 컬럼 존재 확인
    Expected Result: 두 컬럼 모두 존재, DEFAULT 값 정상
    Failure Indicators: 컬럼 미존재
    Evidence: .sisyphus/evidence/task-1-questions-columns.txt
  ```

  **Commit**: YES
  - Message: `schema: add drafts, reminders, carry-overs, saved_records, reflections tables`
  - Files: `drizzle/migrations/0005_*.sql`, `app/db/schema.server.ts`, `app/db/relations.server.ts`, `app/db/queries/drafts.server.ts`, `app/db/queries/reminders.server.ts`, `app/db/queries/carryOvers.server.ts`, `app/db/queries/savedRecords.server.ts`, `app/db/queries/reflections.server.ts`
  - Pre-commit: `pnpm test && tsc --noEmit`

- [x] 2. Autosave Server Endpoint + Query Module

  **What to do**:
  - API route: `app/routes/api/autosave.tsx` — POST endpoint
    - `requireVerified` 인증 체크
    - Request body: `{ format, title?, content, contentJson?, stageId?, rhythm?, visibility? }`
    - Zod validation schema
    - drafts 테이블 upsert (author_id + format 기준)
    - Response: `{ draftId, updatedAt }` 또는 에러
  - Zod schema: `app/lib/validation.ts`에 `autosaveDraftSchema` 추가
  - 쿼리 함수: `upsertDraft()`, `getDraftByAuthorAndFormat()`, `deleteDraft()`, `cleanupOldDrafts()`
  - D1 작업: 단일 upsert 쿼리 (ON CONFLICT 또는 SELECT → INSERT/UPDATE)
  - Rate limiting: 같은 사용자 같은 format에 대해 최소 1초 간격 (서버 side)
  - vitest: endpoint action 함수 단위 테스트

  **Must NOT do**:
  - Autosave가 visibility를 draft 이외로 변경
  - 인증 없이 draft 저장 허용
  - records 테이블 직접 수정 (drafts 테이블만)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: API endpoint + Zod validation + DB upsert + race condition 고려
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (T3, T4, T5와 병렬)
  - **Parallel Group**: Wave 1 (after T1)
  - **Blocks**: T10, T11
  - **Blocked By**: T1

  **References**:

  **Pattern References**:
  - `app/routes/api/upload.tsx` — 기존 API route action 패턴
  - `app/db/queries/records.server.ts:createRecord()` — DB insert 패턴
  - `app/lib/validation.ts` — 기존 Zod schema 정의 패턴
  - `app/lib/auth.middleware.ts:requireVerified()` — 인증 미들웨어 사용법

  **WHY Each Reference Matters**:
  - `upload.tsx` — API route의 action export 형태, context.cloudflare.env 접근 패턴
  - `createRecord()` — Drizzle insert + returning 패턴, slug 생성
  - `validation.ts` — Zod schema 네이밍 컨벤션, optional/default 사용법
  - `requireVerified()` — 인증 체크 + 리다이렉트 패턴

  **Acceptance Criteria**:
  - [ ] `tsc --noEmit` 타입 에러 0
  - [ ] vitest: upsert, get, delete, cleanup 테스트 PASS
  - [ ] Zod schema validation 테스트 PASS

  **QA Scenarios**:

  ```
  Scenario: Draft upsert 동작
    Tool: Bash (vitest)
    Preconditions: T1 migration 완료
    Steps:
      1. `pnpm vitest run app/db/queries/__tests__/drafts.test.ts`
      2. 같은 author_id + format으로 두 번 upsert → 레코드 1개만 존재 확인
    Expected Result: upsert 정상 동작, 중복 없음
    Failure Indicators: 중복 레코드 생성, SQL 에러
    Evidence: .sisyphus/evidence/task-2-draft-upsert.txt

  Scenario: 인증 없이 autosave 요청 거부
    Tool: Bash (vitest)
    Preconditions: API route 구현 완료
    Steps:
      1. 인증 없는 요청으로 POST /api/autosave 호출
      2. 401 또는 redirect 응답 확인
    Expected Result: 인증 없으면 저장 거부
    Failure Indicators: 200 응답, draft 생성
    Evidence: .sisyphus/evidence/task-2-auth-reject.txt
  ```

  **Commit**: YES
  - Message: `feat(autosave): add server endpoint and query module`
  - Files: `app/routes/api/autosave.tsx`, `app/db/queries/drafts.server.ts`, `app/lib/validation.ts`
  - Pre-commit: `pnpm test && tsc --noEmit`

- [x] 3. createNotification() 중앙화

  **What to do**:
  - `app/db/queries/notifications.server.ts`에 `createNotification()` 유틸 함수 추출
    - 파라미터: `{ recipientId, type, title, content?, recordId?, questionId? }`
    - 타입 enum: `response | mention | reminder | reread_reminder | carry_over | stage_closing`
  - 기존 코드에서 inline notification insert 찾아서 `createNotification()` 호출로 교체
    - `ast_grep_search`로 `insert(notifications)` 패턴 검색
    - 각 호출 지점을 함수 호출로 변경
  - vitest: createNotification 테스트

  **Must NOT do**:
  - 이메일 발송 구현
  - 기존 notification 읽기/마크 쿼리 변경

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 단순 리팩터링 — 기존 패턴 추출 + 호출 교체
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (T2, T4, T5와 병렬)
  - **Parallel Group**: Wave 1 (after T1)
  - **Blocks**: T25
  - **Blocked By**: T1

  **References**:

  **Pattern References**:
  - `app/db/queries/notifications.server.ts` — 기존 notification 쿼리 모듈
  - `ast_grep_search` 패턴: `insert(notifications)` — inline insert 위치 찾기

  **WHY Each Reference Matters**:
  - 기존 notifications.server.ts의 함수 시그니처와 DB 접근 패턴 확인
  - inline insert 위치를 정확히 찾아야 빠짐없이 교체 가능

  **Acceptance Criteria**:
  - [ ] `ast_grep_search`로 `insert(notifications)` 검색 시 직접 호출 0건
  - [ ] `tsc --noEmit` 타입 에러 0
  - [ ] vitest: createNotification 테스트 PASS

  **QA Scenarios**:

  ```
  Scenario: createNotification 유틸 동작
    Tool: Bash (vitest)
    Preconditions: T1 migration 완료
    Steps:
      1. `pnpm vitest run app/db/queries/__tests__/notifications.test.ts`
      2. 6개 type으로 각각 notification 생성 확인
    Expected Result: 모든 type 정상 생성, is_read=false
    Failure Indicators: 테스트 FAIL
    Evidence: .sisyphus/evidence/task-3-create-notification.txt
  ```

  **Commit**: YES
  - Message: `refactor(notifications): centralize createNotification utility`
  - Files: `app/db/queries/notifications.server.ts`, 기존 inline insert 사용 파일들
  - Pre-commit: `pnpm test && tsc --noEmit`

- [x] 4. localStorage Draft Recovery Utility

  **What to do**:
  - `app/lib/draft-storage.ts` (클라이언트 전용, `.server.ts` 아님)
    - `saveDraftToLocal(format: 'note'|'article', data: DraftData): void`
    - `loadDraftFromLocal(format: 'note'|'article'): DraftData | null`
    - `clearLocalDraft(format: 'note'|'article'): void`
    - `hasDraftLocal(format: 'note'|'article'): boolean`
  - DraftData 타입: `{ title?, content, contentJson?, stageId?, rhythm?, visibility?, savedAt: number }`
  - localStorage key: `divelog-draft-note`, `divelog-draft-article`
  - JSON serialize/deserialize with try-catch (localStorage 접근 실패 대비)
  - TTL: 30일. loadDraft 시 만료 체크.
  - vitest 단위 테스트 (localStorage mock)

  **Must NOT do**:
  - Dexie.js 또는 IndexedDB 사용
  - 서버 사이드에서 이 유틸 import
  - 여러 draft 저장 (format당 1개만)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 순수 클라이언트 유틸 함수 — 로직 단순
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (T2, T3, T5와 병렬)
  - **Parallel Group**: Wave 1
  - **Blocks**: T10, T11, T12
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `app/hooks/useUnsavedWarning.ts` — 기존 클라이언트 사이드 hook 패턴

  **WHY Each Reference Matters**:
  - 클라이언트 사이드 코드의 네이밍/위치 컨벤션 확인

  **Acceptance Criteria**:
  - [ ] `tsc --noEmit` 타입 에러 0
  - [ ] vitest: save, load, clear, hasDraft, TTL 만료 테스트 PASS

  **QA Scenarios**:

  ```
  Scenario: localStorage draft 저장 및 로드
    Tool: Bash (vitest)
    Preconditions: localStorage mock 설정
    Steps:
      1. `pnpm vitest run app/lib/__tests__/draft-storage.test.ts`
      2. save → load → 같은 데이터 반환 확인
      3. 30일 후 만료 확인 (Date.now mock)
    Expected Result: 5개 테스트 PASS
    Failure Indicators: 데이터 불일치, 만료 미작동
    Evidence: .sisyphus/evidence/task-4-local-draft.txt
  ```

  **Commit**: YES (T5와 함께)
  - Message: `feat(draft): add localStorage recovery and useAutosave hook`
  - Files: `app/lib/draft-storage.ts`, `app/lib/__tests__/draft-storage.test.ts`
  - Pre-commit: `pnpm test && tsc --noEmit`

- [x] 5. useAutosave Hook

  **What to do**:
  - `app/hooks/useAutosave.ts` — React hook
    - `useAutosave({ format, getFormData, enabled }): AutosaveState`
    - React Router `useFetcher`로 POST `/api/autosave`
    - Debounce: `clientAction` + `setTimeout(3000, serverAction, { signal: request.signal })` 패턴
    - 또는 hook 내부 `useEffect` + `setTimeout` 3초 debounce
    - 반환: `{ status: 'idle'|'saving'|'saved'|'error', lastSavedAt: Date|null }`
    - content 변경 시 자동 트리거
    - localStorage도 동시 저장 (서버 실패 대비)
  - `app/components/AutosaveIndicator.tsx` — 상태 표시 컴포넌트
    - idle: 표시 없음
    - saving: "저장 중..."
    - saved: "자동 저장됨 HH:MM"
    - error: "저장 실패" + 재시도 버튼

  **Must NOT do**:
  - 1초 미만 debounce (서버 부하)
  - 빈 content 저장
  - visibility를 draft 이외로 설정

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: hook + 작은 컴포넌트
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (T2, T3, T4와 병렬)
  - **Parallel Group**: Wave 1
  - **Blocks**: T10, T11
  - **Blocked By**: T4

  **References**:

  **Pattern References**:
  - `app/hooks/useUnsavedWarning.ts` — 기존 hook 패턴
  - `app/routes/public/logs/$recordSlug.tsx` — useFetcher 사용 패턴

  **WHY Each Reference Matters**:
  - hook 파일 구조, export 패턴
  - useFetcher submit/state 접근 패턴

  **Acceptance Criteria**:
  - [ ] `tsc --noEmit` 타입 에러 0
  - [ ] vitest: status 전환 테스트 PASS

  **QA Scenarios**:

  ```
  Scenario: Autosave status 전환
    Tool: Bash (vitest)
    Preconditions: useFetcher mock
    Steps:
      1. `pnpm vitest run app/hooks/__tests__/useAutosave.test.ts`
      2. content 변경 → 3초 후 saving → idle 전환 확인
      3. 빈 content → 저장 안 함 확인
    Expected Result: 3개 테스트 PASS
    Failure Indicators: status 전환 오류
    Evidence: .sisyphus/evidence/task-5-useAutosave.txt
  ```

  **Commit**: YES (T4와 함께)
  - Message: `feat(draft): add localStorage recovery and useAutosave hook`
  - Files: `app/hooks/useAutosave.ts`, `app/components/AutosaveIndicator.tsx`
  - Pre-commit: `pnpm test && tsc --noEmit`

### Wave 2: Write Experience Overhaul

- [x] 6. Write Note: Progressive Disclosure + Warm-up Prompt

  **What to do**:
  - `app/routes/public/write/note.tsx` 개편:
    - 초기 화면: warm-up prompt + textarea만 표시
    - Warm-up prompt 텍스트 (하드코딩, 랜덤 선택):
      - "무엇이 남았는지부터 적어도 좋습니다."
      - "지금 가장 오래 붙들고 있는 문장은?"
      - "오늘 가장 선명했던 장면은?"
    - 20자 이상 입력 OR "설정" 버튼 클릭 시 메타데이터 패널 fade-in
    - 메타데이터 패널: visibility, stage, rhythm, response_preference
    - fade-in 애니메이션 (opacity + translateY, 300ms)
    - `data-testid="write-settings-panel"` 추가
    - `data-testid="warm-up-prompt"` 추가
  - 기존 `useUnsavedWarning` 유지
  - 기존 markdown shortcuts 유지

  **Must NOT do**:
  - TipTap으로 전환
  - 템플릿 테이블에서 prompt 로드 (하드코딩)
  - 기존 NoteEditor 컴포넌트 삭제 (래핑)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 기존 라우트 대폭 개편 — UI 로직 + 상태 관리
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (T7, T8, T9와 병렬)
  - **Parallel Group**: Wave 2
  - **Blocks**: T10
  - **Blocked By**: T4, T5

  **References**:

  **Pattern References**:
  - `app/routes/public/write/note.tsx` — 현재 Note 작성 전체 코드 (190줄)
  - `app/components/editor/NoteEditor.tsx` — textarea 에디터 컴포넌트 (309줄)

  **WHY Each Reference Matters**:
  - note.tsx의 현재 폼 구조, action 핸들러, metadata 수집 방식 파악
  - NoteEditor의 markdown shortcuts, auto-height 로직 유지 필요

  **Acceptance Criteria**:
  - [ ] 초기 화면: textarea + warm-up prompt만 보임
  - [ ] 20자 입력 후 메타데이터 패널 표시
  - [ ] "설정" 버튼으로도 패널 열기 가능
  - [ ] `tsc --noEmit` 타입 에러 0

  **QA Scenarios**:

  ```
  Scenario: Progressive disclosure 동작
    Tool: Playwright
    Preconditions: 인증된 verified 사용자, /write/note 접속
    Steps:
      1. 페이지 로드 → data-testid="write-settings-panel" hidden 확인
      2. data-testid="warm-up-prompt" 텍스트 존재 확인
      3. textarea에 "이것은 스무자가 넘는 테스트 텍스트입니다" 입력
      4. 800ms 후 data-testid="write-settings-panel" visible 확인
    Expected Result: 패널이 fade-in으로 나타남
    Failure Indicators: 패널이 처음부터 보이거나, 입력 후에도 안 나타남
    Evidence: .sisyphus/evidence/task-6-progressive-disclosure.png

  Scenario: 설정 버튼으로 패널 열기
    Tool: Playwright
    Preconditions: /write/note, textarea 비어있음
    Steps:
      1. data-testid="write-settings-toggle" 클릭
      2. data-testid="write-settings-panel" visible 확인
    Expected Result: 입력 없이도 설정 패널 접근 가능
    Evidence: .sisyphus/evidence/task-6-settings-toggle.png
  ```

  **Commit**: YES
  - Message: `feat(write): progressive disclosure + warm-up prompt for notes`
  - Files: `app/routes/public/write/note.tsx`
  - Pre-commit: `pnpm test && tsc --noEmit`

- [x] 7. Write Article: Progressive Disclosure + Title Optional

  **What to do**:
  - `app/routes/public/write/article.tsx` 개편:
    - 초기 화면: TipTap 에디터만 (제목 필드 숨김)
    - warm-up prompt (Note와 다른 세트):
      - "깊이 들어가고 싶은 생각이 있나요?"
      - "최근 기록에서 더 이어가고 싶은 것은?"
      - "아직 정리되지 않은 경험을 풀어보세요."
    - 에디터 내용 입력 시작 후 제목 필드 + 메타데이터 패널 fade-in
    - 제목 필드: placeholder "제목 (나중에 붙여도 됩니다)", 비필수
    - action에서 제목 비어있으면 `"(무제)"` 센티넬 값 자동 설정
    - 기존 TipTap extensions, slash commands, mentions 유지
    - template 선택은 2차 메타데이터 패널 안으로 이동
  - Zod schema 업데이트: title optional (`.optional().default("(무제)")`)

  **Must NOT do**:
  - `records.title` nullable 변경
  - TipTap 에디터 기능 제거
  - 템플릿 기능 삭제 (위치만 이동)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: TipTap 통합 복잡도 + progressive disclosure 상태 관리
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (T6, T8, T9와 병렬)
  - **Parallel Group**: Wave 2
  - **Blocks**: T11
  - **Blocked By**: T4, T5

  **References**:

  **Pattern References**:
  - `app/routes/public/write/article.tsx` — 현재 Article 작성 (275줄)
  - `app/components/editor/ArticleEditor.tsx` — TipTap 에디터 (571줄)

  **WHY Each Reference Matters**:
  - article.tsx의 TipTap JSON 처리, mention extraction, record link extraction 패턴
  - ArticleEditor의 onUpdate/onChange 콜백 구조 (autosave 연결점)

  **Acceptance Criteria**:
  - [ ] 초기: TipTap 에디터만 표시, 제목/메타 숨김
  - [ ] 입력 시작 후 제목 + 메타 fade-in
  - [ ] 제목 없이 발행 → `"(무제)"` 자동 설정
  - [ ] `tsc --noEmit` 타입 에러 0

  **QA Scenarios**:

  ```
  Scenario: 제목 없이 Article 발행
    Tool: Playwright
    Preconditions: 인증된 verified 사용자
    Steps:
      1. /write/article 접속
      2. TipTap 에디터에 "이것은 테스트 글입니다" 입력
      3. 제목 필드 비워둔 채 발행 버튼 클릭
      4. 리다이렉트된 기록 상세 페이지에서 제목 "(무제)" 확인
    Expected Result: 발행 성공, 제목 "(무제)"
    Failure Indicators: validation 에러, 발행 실패
    Evidence: .sisyphus/evidence/task-7-untitled-article.png
  ```

  **Commit**: YES
  - Message: `feat(write): progressive disclosure + title optional for articles`
  - Files: `app/routes/public/write/article.tsx`, `app/lib/validation.ts`
  - Pre-commit: `pnpm test && tsc --noEmit`

- [x] 8. Question Capture During Writing (Note + Article)

  **What to do**:
  - Note 에디터: 본문 하단에 고정 질문 슬롯 추가
    - "이 기록에서 남은 질문이 있나요?" 라벨 + textarea
    - 선택적 (비워두면 질문 미생성)
    - direction 선택: 스스로에게(inward) / 함께 생각해볼(outward) / 다음 구간으로(next_stage)
    - `data-testid="question-capture-slot"`
  - Article 에디터: 하단 동일 질문 슬롯 추가
  - action 수정: record 생성 + question 생성을 단일 트랜잭션으로
    - record INSERT → question INSERT (recordId 참조)
  - Note/Article 모두 기존 `/logs/:slug/details` 페이지에서도 질문 추가 가능 유지

  **Must NOT do**:
  - Slash command로 질문 캡처 (textarea에는 부적합)
  - 자동 질문 감지 (물음표 기반 등)
  - 질문 필수 입력 강제

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: 두 에디터 모두 수정 + action 트랜잭션 로직
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (T6, T7, T9와 병렬)
  - **Parallel Group**: Wave 2
  - **Blocks**: T21
  - **Blocked By**: T1

  **References**:

  **Pattern References**:
  - `app/routes/public/write/note.tsx` — action 함수의 createRecord 호출
  - `app/routes/public/logs/$recordSlug.details.tsx` — 기존 질문 추가 폼 (action 참고)
  - `app/db/queries/questions.server.ts:createQuestion()` — 질문 생성 쿼리

  **WHY Each Reference Matters**:
  - note.tsx action에서 record 생성 후 question 생성을 연결하는 방식 확인
  - details.tsx의 기존 질문 추가 UI/UX 패턴을 작성 화면에도 적용

  **Acceptance Criteria**:
  - [ ] Note 작성 화면에 질문 슬롯 표시
  - [ ] Article 작성 화면에 질문 슬롯 표시
  - [ ] 질문 입력 후 발행 → DB에 record + question 둘 다 생성
  - [ ] 질문 비워두고 발행 → question 미생성
  - [ ] `tsc --noEmit` 타입 에러 0

  **QA Scenarios**:

  ```
  Scenario: 질문과 함께 Note 발행
    Tool: Playwright
    Preconditions: 인증된 verified 사용자
    Steps:
      1. /write/note 접속
      2. 본문 입력: "오늘의 기록"
      3. data-testid="question-capture-slot" 내 textarea에 "왜 이런 선택을 했을까?" 입력
      4. direction "inward" 선택
      5. 발행 클릭
      6. 리다이렉트된 상세 페이지에서 질문 표시 확인
    Expected Result: record + question 모두 생성됨
    Failure Indicators: question 미생성, 에러 표시
    Evidence: .sisyphus/evidence/task-8-question-capture.png

  Scenario: 질문 없이 발행
    Tool: Playwright
    Preconditions: 인증된 verified 사용자
    Steps:
      1. /write/note, 본문만 입력, 질문 슬롯 비움
      2. 발행 → 상세 페이지에서 질문 섹션 비어있음 확인
    Expected Result: record만 생성, question 없음
    Evidence: .sisyphus/evidence/task-8-no-question.png
  ```

  **Commit**: YES
  - Message: `feat(write): question capture during writing`
  - Files: `app/routes/public/write/note.tsx`, `app/routes/public/write/article.tsx`
  - Pre-commit: `pnpm test && tsc --noEmit`

- [x] 9. Note → Article Expansion Flow

  **What to do**:
  - 기록 상세 페이지(`/logs/:recordSlug`)에 "이 메모를 글로 확장" 버튼 추가
    - Note format인 경우만 표시
    - 작성자 본인만 볼 수 있음
    - `data-testid="expand-to-article"`
  - 버튼 클릭 → `/write/article?expandFrom=:recordSlug` 으로 이동
  - `/write/article` loader에서 `expandFrom` 파라미터 처리:
    - 원본 Note 내용을 TipTap JSON으로 변환 (markdown → TipTap blocks)
    - 제목, stage, rhythm 등 메타데이터 프리필
  - action에서 발행 시:
    - 새 Article record 생성
    - `record_links` 테이블에 `{ sourceId: newArticle, targetId: originalNote, linkType: 'expansion' }` 생성
  - 원본 Note에도 "이 메모에서 확장된 글" 링크 표시

  **Must NOT do**:
  - 원본 Note 수정/삭제
  - 원본 Note의 응답/질문 이동
  - 기존 record_links 테이블 구조 변경

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 두 라우트 수정 + markdown→TipTap 변환 + record_links 생성
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (T6, T7, T8와 병렬)
  - **Parallel Group**: Wave 2
  - **Blocks**: None
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `app/routes/public/logs/$recordSlug.tsx` — 기록 상세 페이지 (845줄)
  - `app/db/queries/recordLinks.server.ts:createLink()` — 링크 생성 쿼리
  - `app/components/editor/ArticleEditor.tsx` — TipTap 에디터 초기화

  **WHY Each Reference Matters**:
  - recordSlug.tsx에서 작성자 판별 로직, 버튼 위치 결정
  - createLink의 파라미터 구조 확인
  - ArticleEditor의 initialContent props 확인

  **Acceptance Criteria**:
  - [ ] Note 상세 페이지: 작성자 본인에게 "이 메모를 글로 확장" 버튼 표시
  - [ ] 버튼 클릭 → /write/article에서 내용 프리필
  - [ ] 발행 시 record_links 레코드 생성
  - [ ] 원본 Note에 확장 링크 표시

  **QA Scenarios**:

  ```
  Scenario: Note를 Article로 확장
    Tool: Playwright
    Preconditions: 내가 작성한 Note 기록 존재
    Steps:
      1. /logs/:myNoteSlug 접속
      2. data-testid="expand-to-article" 클릭
      3. /write/article 페이지에서 원본 내용 프리필 확인
      4. 추가 내용 입력 후 발행
      5. 새 Article 상세 페이지에서 "원본 메모" 링크 존재 확인
      6. 원본 Note 페이지에서 "확장된 글" 링크 존재 확인
    Expected Result: 양방향 링크 생성, 원본 유지
    Evidence: .sisyphus/evidence/task-9-note-expansion.png
  ```

  **Commit**: YES
  - Message: `feat(write): note to article expansion`
  - Files: `app/routes/public/logs/$recordSlug.tsx`, `app/routes/public/write/article.tsx`
  - Pre-commit: `pnpm test && tsc --noEmit`

- [x] 10. Autosave Integration (Note)

  **What to do**:
  - `app/routes/public/write/note.tsx`에 autosave 통합:
    - `useAutosave` hook 연결
    - content 변경 시 자동 트리거 (3초 debounce)
    - `AutosaveIndicator` 컴포넌트 에디터 상단에 배치
    - localStorage에도 동시 저장 (`saveDraftToLocal('note', ...)`)
    - progressive disclosure 상태도 localStorage에 저장 (메타데이터 패널 open 여부)
  - 페이지 로드 시 draft recovery:
    - `loadDraftFromLocal('note')` 체크
    - 서버 `getDraftByAuthorAndFormat` 체크
    - local > server 우선순위
    - recovery prompt UI: "이전에 작성하던 메모가 있습니다" + "이어서 쓰기" / "새로 시작"
  - 발행 성공 후: localStorage + 서버 draft 삭제

  **Must NOT do**:
  - 빈 content 저장
  - 발행 전에 visibility를 draft 이외로 변경
  - `useUnsavedWarning` 제거 (autosave와 공존)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: hook 통합 + recovery 로직 + 상태 관리 복합
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO (T6 이후)
  - **Parallel Group**: Wave 2 (sequential after T6)
  - **Blocks**: T34
  - **Blocked By**: T2, T5, T6

  **References**:

  **Pattern References**:
  - `app/routes/public/write/note.tsx` — T6에서 개편된 Note 작성 라우트
  - `app/hooks/useAutosave.ts` — T5에서 만든 hook
  - `app/lib/draft-storage.ts` — T4에서 만든 localStorage 유틸

  **Acceptance Criteria**:
  - [ ] 3초 후 autosave 동작, "자동 저장됨 HH:MM" 표시
  - [ ] 페이지 새로고침 → draft recovery prompt 표시
  - [ ] "이어서 쓰기" → 이전 내용 복구
  - [ ] 발행 후 draft 삭제

  **QA Scenarios**:

  ```
  Scenario: Note autosave + recovery
    Tool: Playwright
    Preconditions: 인증된 verified 사용자
    Steps:
      1. /write/note 접속
      2. "테스트 메모 내용입니다" 입력
      3. 4초 대기 → data-testid="autosave-indicator" 텍스트에 "저장됨" 포함 확인
      4. 페이지 새로고침
      5. data-testid="draft-recovery-prompt" 표시 확인
      6. "이어서 쓰기" 클릭 → textarea에 이전 내용 복구 확인
    Expected Result: 자동 저장 → 복구 성공
    Failure Indicators: indicator 미표시, 내용 미복구
    Evidence: .sisyphus/evidence/task-10-note-autosave.png
  ```

  **Commit**: YES
  - Message: `feat(autosave): integrate into note write flow`
  - Files: `app/routes/public/write/note.tsx`
  - Pre-commit: `pnpm test && tsc --noEmit`

- [x] 11. Autosave Integration (Article)

  **What to do**:
  - `app/routes/public/write/article.tsx`에 autosave 통합:
    - T10과 동일 패턴 적용
    - TipTap의 `onUpdate` → JSON + plaintext 추출 → autosave 트리거
    - `contentJson` (TipTap JSON)과 `contentText` 모두 저장
    - 제목도 함께 autosave
    - recovery 시 TipTap에 JSON content 복원
  - expandFrom 모드와 autosave 공존:
    - expandFrom이 있으면 draft보다 expand content 우선
    - expand 시작 후부터 autosave 활성화

  **Must NOT do**:
  - TipTap editor unmount/remount (content 변경은 setContent으로)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: TipTap JSON 처리 + expand mode 공존 로직
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (T10과 병렬 가능)
  - **Parallel Group**: Wave 2
  - **Blocks**: T34
  - **Blocked By**: T2, T5, T7

  **References**:

  **Pattern References**:
  - `app/routes/public/write/article.tsx` — T7에서 개편된 Article 작성 라우트
  - `app/components/editor/ArticleEditor.tsx:onUpdate` — TipTap 변경 콜백

  **Acceptance Criteria**:
  - [ ] TipTap 입력 → 3초 후 autosave (JSON + text)
  - [ ] recovery 시 TipTap에 JSON 복원
  - [ ] expandFrom + autosave 공존

  **QA Scenarios**:

  ```
  Scenario: Article autosave + recovery
    Tool: Playwright
    Preconditions: 인증된 verified 사용자
    Steps:
      1. /write/article 접속, TipTap에 내용 입력
      2. 4초 후 autosave indicator 확인
      3. 새로고침 → draft recovery → TipTap에 이전 내용 복원 확인
    Expected Result: JSON content 정상 복원
    Evidence: .sisyphus/evidence/task-11-article-autosave.png
  ```

  **Commit**: YES
  - Message: `feat(autosave): integrate into article write flow`
  - Files: `app/routes/public/write/article.tsx`
  - Pre-commit: `pnpm test && tsc --noEmit`

- [x] 12. Draft Recovery UI

  **What to do**:
  - `app/components/DraftRecoveryPrompt.tsx` — 재사용 컴포넌트
    - props: `{ draft: DraftData, onRecover: () => void, onDiscard: () => void }`
    - UI: 이전 내용 snippet (150자) + "이어서 작성하기" / "새로 시작" 버튼
    - 디자인: mist-blue 배경, border, 부드러운 톤
    - `data-testid="draft-recovery-prompt"`
    - `data-testid="draft-recover-button"`
    - `data-testid="draft-discard-button"`
  - `/write` 선택 페이지에서도 draft 존재 시 알림 표시
    - "작성 중인 메모가 있습니다" / "작성 중인 글이 있습니다"

  **Must NOT do**:
  - 자동 복구 (사용자 선택 필수)
  - 두 개 이상 draft 동시 표시

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 단일 컴포넌트 + 간단한 로직
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (T10, T11과 병렬)
  - **Parallel Group**: Wave 2
  - **Blocks**: None
  - **Blocked By**: T4

  **References**:

  **Pattern References**:
  - `app/components/EmptyState.tsx` — 기존 상태 컴포넌트 패턴
  - `.docs/design.md` — Quiet Depth 색상/카드 스펙

  **Acceptance Criteria**:
  - [ ] draft 존재 시 recovery prompt 표시
  - [ ] "이어서 작성하기" → 내용 복구
  - [ ] "새로 시작" → draft 삭제 + 빈 에디터
  - [ ] `tsc --noEmit` 타입 에러 0

  **QA Scenarios**:

  ```
  Scenario: Draft recovery prompt 표시
    Tool: Playwright
    Preconditions: localStorage에 note draft 존재
    Steps:
      1. /write/note 접속
      2. data-testid="draft-recovery-prompt" 존재 확인
      3. snippet 텍스트 확인 (150자 이내)
    Expected Result: recovery prompt 정상 표시
    Evidence: .sisyphus/evidence/task-12-recovery-prompt.png
  ```

  **Commit**: YES
  - Message: `feat(draft): recovery UI component`
  - Files: `app/components/DraftRecoveryPrompt.tsx`, `app/routes/public/write/index.tsx`
  - Pre-commit: `pnpm test && tsc --noEmit`

### Wave 3: Home + Navigation

- [x] 13. Home: Narrative Digest (Replace ActivityFeed)

  **What to do**:
  - `app/db/queries/activity.server.ts` 리팩터링:
    - `getRecentActivity()` → `getNarrativeDigest()` 변경
    - 반환: 숫자 대신 구조화된 활동 아이템
    - 각 아이템: `{ type, text, linkTo, authorName?, recordTitle? }`
    - 타입: new_record, new_question, new_response, new_self_answer, new_sentence
    - 텍스트 예: "[Author]님이 새 기록을 남겼습니다: [Title]"
    - 최대 5-8개 아이템
  - `app/components/NarrativeDigest.tsx` — 새 컴포넌트
    - ActivityFeed 대체
    - 각 아이템에 record/question 링크
    - 숫자 없음, 서술형 텍스트만
    - empty state: "아직 이번 구간에서 활동이 없습니다"
  - Home 라우트(`app/routes/public/index.tsx`) 수정:
    - ActivityFeed → NarrativeDigest 교체
    - 섹션 제목: "여정에서 일어나는 일" 유지 또는 "이 구간의 이야기"
    - `data-testid="narrative-digest"`
  - 보조 서술형 요약 추가 (선택적):
    - "지금은 개인 탐색과 첫 질문이 많아지는 구간입니다."
    - Stage type 기반 동적 생성

  **Must NOT do**:
  - LLM/AI 요약 사용
  - engagement feed 패턴 (좋아요, 인기)
  - 개인별 맞춤 피드 (전체 코호트 공통)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: 쿼리 리팩터링 + 컴포넌트 + 라우트 수정
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (T14-T17과 병렬)
  - **Parallel Group**: Wave 3
  - **Blocks**: T33
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `app/db/queries/activity.server.ts` — 현재 getRecentActivity 쿼리
  - `app/routes/public/index.tsx` — Home 라우트 (513줄, ActivityFeed 사용 부분)
  - `app/components/SceneCard.tsx` — 기록 카드 링크 패턴

  **WHY Each Reference Matters**:
  - activity.server.ts의 현재 쿼리 구조와 DB join 패턴
  - index.tsx에서 ActivityFeed 위치와 props 구조
  - SceneCard의 링크 생성 패턴 참고

  **Acceptance Criteria**:
  - [ ] Home에서 숫자 기반 활동 블록 제거됨
  - [ ] NarrativeDigest에 서술형 아이템 5-8개
  - [ ] 각 아이템에 기록/질문 링크
  - [ ] `data-testid="narrative-digest"` 존재
  - [ ] `tsc --noEmit` 타입 에러 0

  **QA Scenarios**:

  ```
  Scenario: Narrative digest 표시
    Tool: Playwright
    Preconditions: seed data로 최근 활동 존재
    Steps:
      1. / (홈) 접속
      2. data-testid="narrative-digest" 존재 확인
      3. 아이템 개수 >= 1 확인
      4. 각 아이템에 anchor tag 존재 확인
      5. 숫자 패턴 ("N개의 기록") 부재 확인 (regex /$\d+개/)
    Expected Result: 서술형 활동 표시, 숫자 없음
    Evidence: .sisyphus/evidence/task-13-narrative-digest.png
  ```

  **Commit**: YES
  - Message: `feat(home): narrative digest replacing activity stats`
  - Files: `app/db/queries/activity.server.ts`, `app/components/NarrativeDigest.tsx`, `app/routes/public/index.tsx`
  - Pre-commit: `pnpm test && tsc --noEmit`

- [x] 14. Home: Question Card Enrichment

  **What to do**:
  - `app/components/QuestionCard.tsx` 수정:
    - 메타데이터 뱃지 추가 (기존 direction label 아래):
      - 개인 질문 / 챌린지 질문 구분 뱃지
      - "아직 답 없음" 뱃지 (self-answer 0개 && response 0개)
      - "이전 구간에서 가져온 질문" 뱃지 (carry-over 여부)
      - "자기답변 있음" 뱃지 (self-answer 1개 이상)
    - 뱃지 디자인: 작은 pill shape, secondary text color, border
  - Home 라우트 loader 수정: 질문 데이터에 메타 정보 포함
    - type (개인/챌린지), self_answer_count, response_count, is_carry_over
  - 쿼리 수정: `getOpenQuestions()`에 join으로 메타 데이터 포함

  **Must NOT do**:
  - 인기순/응답 수 기반 정렬
  - 질문 카드 크기 차별화 (밀도 동일)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 컴포넌트 + 쿼리 수정 + 데이터 모델 확장
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (T13, T15-T17과 병렬)
  - **Parallel Group**: Wave 3
  - **Blocks**: None
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `app/components/QuestionCard.tsx` — 현재 질문 카드 (58줄)
  - `app/db/queries/questions.server.ts:getOpenQuestions()` — 쿼리
  - `app/routes/public/index.tsx` — Home에서 질문 데이터 로딩 부분

  **Acceptance Criteria**:
  - [ ] 질문 카드에 type/답변상태 뱃지 표시
  - [ ] "아직 답 없음" 뱃지가 미답변 질문에 표시
  - [ ] `tsc --noEmit` 타입 에러 0

  **QA Scenarios**:

  ```
  Scenario: 질문 카드 메타데이터 표시
    Tool: Playwright
    Preconditions: seed data에 다양한 질문 (개인/챌린지, 답변 있음/없음)
    Steps:
      1. / (홈) 접속
      2. 열린 질문 섹션에서 질문 카드 확인
      3. 미답변 질문에 "아직 답 없음" 뱃지 확인
    Expected Result: 질문별 상태 차이 시각화
    Evidence: .sisyphus/evidence/task-14-question-enrichment.png
  ```

  **Commit**: YES
  - Message: `feat(home): question card enrichment`
  - Files: `app/components/QuestionCard.tsx`, `app/db/queries/questions.server.ts`, `app/routes/public/index.tsx`
  - Pre-commit: `pnpm test && tsc --noEmit`

- [x] 15. Hero Tone Adjustment

  **What to do**:
  - `app/components/HeroSection.tsx` 수정:
    - "스타트업 랜딩" 톤 → "에디토리얼 + 수면 아래 깊이감" 톤
    - 배경: 현재 → 더 깊은 gradient (Deep Ocean → Mist Blue 방향)
    - CTA 버튼: 현재 밝은 톤 → 더 절제된 톤
    - 카피: 필요시 더 문학적이되 모호하지 않게 조정
    - Hero 높이: 데스크톱에서 더 여유 (min-h 조정)
    - 모바일: Hero 컴팩트하게 (스크롤 단축)
  - Quiet Depth 디자인 가이드라인 준수:
    - 배경 visual: 직접 해양 일러스트 금지, 수면 아래 빛의 층위/푸른 안개/깊이감 gradient
    - 카피: 짧고 선명, 과도한 브랜딩 슬로건 금지

  **Must NOT do**:
  - 해양 일러스트/물고기 추가
  - 과도한 애니메이션
  - 카피를 영어로 변경

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: 순수 비주얼 디자인 개선
  - **Skills**: [`frontend-design`]
    - `frontend-design`: 에디토리얼 톤의 Hero 디자인 품질 보장

  **Parallelization**:
  - **Can Run In Parallel**: YES (T13, T14, T16, T17과 병렬)
  - **Parallel Group**: Wave 3
  - **Blocks**: None
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `app/components/HeroSection.tsx` — 현재 Hero 구현
  - `.docs/design.md` — Hero 디자인 가이드라인 (배경 visual, 카피 톤, 구성 요소)
  - `app/styles/tokens.css` — CSS custom properties (색상 변수)

  **Acceptance Criteria**:
  - [ ] Hero가 에디토리얼 톤 (스타트업 느낌 제거)
  - [ ] gradient 깊이감 강화
  - [ ] 모바일 Hero 높이 적절

  **QA Scenarios**:

  ```
  Scenario: Hero 디자인 톤 확인
    Tool: Playwright
    Preconditions: 홈 페이지 접속
    Steps:
      1. / 접속
      2. 데스크톱 스크린샷 캡처
      3. 모바일 (375px) 리사이즈 후 스크린샷 캡처
    Expected Result: 에디토리얼 깊이감, 해양 일러스트 없음
    Evidence: .sisyphus/evidence/task-15-hero-desktop.png, .sisyphus/evidence/task-15-hero-mobile.png
  ```

  **Commit**: YES
  - Message: `style(home): hero editorial tone adjustment`
  - Files: `app/components/HeroSection.tsx`, `app/styles/tokens.css` (필요시)
  - Pre-commit: `tsc --noEmit`

- [x] 16. Mobile Floating Write CTA

  **What to do**:
  - `app/components/FloatingWriteCTA.tsx` — 새 컴포넌트
    - 모바일 (<1024px)에서만 표시
    - 하단 우측, safe-area-inset-bottom 존중
    - 48px 이상 터치 타겟 (44px WCAG 최소)
    - 펜 아이콘 (stroke 기반, 단순)
    - 클릭 → 짧은 메모/글쓰기 선택 모달 또는 /write로 이동
    - 200px 이상 스크롤 후 표시 (Hero 이후)
    - 키보드 열릴 때 숨김
    - z-index: 다른 floating 요소보다 높게
    - `data-testid="floating-write-cta"`
    - `aria-label="기록 남기기"`
    - focus ring 지원
    - Quiet Depth: 작고 절제된 디자인 (큰 FAB 아님)
  - 표시 페이지: /, /logs, /journey, /logs/:slug, /learners, /challenges
  - 숨김 페이지: /write/*, /admin/*, /settings, /me

  **Must NOT do**:
  - 데스크톱에서 표시
  - 기존 GlobalNav write CTA 제거 (공존)
  - 큰 attention-grabbing FAB

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: 반응형 + 접근성 + Quiet Depth 톤 필요
  - **Skills**: [`frontend-design`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (T13-T15, T17과 병렬)
  - **Parallel Group**: Wave 3
  - **Blocks**: T34
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `app/components/GlobalNav.tsx` — 기존 nav write CTA (위치, 스타일 참고)
  - `.docs/design.md` — 접근성 요구사항 (44px 터치 타겟, focus ring)

  **Acceptance Criteria**:
  - [ ] 모바일 375px에서 floating CTA 표시
  - [ ] 데스크톱 1440px에서 floating CTA 숨김
  - [ ] /write/note에서 숨김
  - [ ] 터치 타겟 48px 이상
  - [ ] aria-label 존재

  **QA Scenarios**:

  ```
  Scenario: Mobile floating CTA 표시/숨김
    Tool: Playwright
    Preconditions: 인증된 사용자
    Steps:
      1. 모바일 viewport (375x812)
      2. / 접속, 200px 스크롤
      3. data-testid="floating-write-cta" visible 확인
      4. /write/note 접속
      5. data-testid="floating-write-cta" hidden 확인
      6. 데스크톱 viewport (1440x900) 전환
      7. / 접속, data-testid="floating-write-cta" hidden 확인
    Expected Result: 모바일 public만 표시
    Evidence: .sisyphus/evidence/task-16-floating-cta.png
  ```

  **Commit**: YES
  - Message: `feat(mobile): floating write CTA`
  - Files: `app/components/FloatingWriteCTA.tsx`, `app/routes/_public.tsx` (또는 layout에 삽입)
  - Pre-commit: `tsc --noEmit`

- [x] 17. Mobile Compact Footer

  **What to do**:
  - `app/components/Footer.tsx` 수정:
    - 데스크톱: 기존 유지
    - 모바일 (<768px): 압축형 레이아웃
      - 링크 그룹 1줄 (가로 나열, 주요 링크만)
      - 저작권 1줄
      - 총 3줄 이내
    - `lg:` breakpoint로 레이아웃 전환
    - 모바일에서 과도한 설명/링크 목록 숨김

  **Must NOT do**:
  - 데스크톱 footer 변경
  - 법적 필수 정보 제거

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: CSS 반응형 조정만
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (T13-T16과 병렬)
  - **Parallel Group**: Wave 3
  - **Blocks**: None
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `app/components/Footer.tsx` — 현재 footer

  **Acceptance Criteria**:
  - [ ] 모바일 footer 3줄 이내
  - [ ] 데스크톱 footer 변경 없음

  **QA Scenarios**:

  ```
  Scenario: 모바일 footer 높이
    Tool: Playwright
    Preconditions: 모바일 viewport
    Steps:
      1. 375px viewport, / 접속, 하단 스크롤
      2. footer 높이 < 120px 확인
    Expected Result: 압축 footer
    Evidence: .sisyphus/evidence/task-17-compact-footer.png
  ```

  **Commit**: YES
  - Message: `style(mobile): compact footer`
  - Files: `app/components/Footer.tsx`
  - Pre-commit: `tsc --noEmit`

### Wave 4: Record List + Detail

- [x] 18. Record List: Card Visual Differentiation

  **What to do**:
  - `app/components/SceneCard.tsx` 수정:
    - 질문 있는 기록: "Q" 뱃지 아이콘 (또는 물음표 아이콘)
    - 자기답변 있는 기록: "↺" 또는 회전 화살표 뱃지
    - 다른 기록과 이어진 기록: "∞" 또는 체인 아이콘
    - 뱃지 위치: 카드 우상단 또는 footer 영역
    - 자기답변 있는 기록: mist-blue 배경 또는 좌측 accent border
    - `data-testid="card-badge-question"`, `data-testid="card-badge-self-answer"`, `data-testid="card-badge-linked"`
  - 쿼리 수정: `getRecords()`에 question_count, self_answer_count, linked_count 포함
  - Record list 라우트: 새 필드를 SceneCard에 전달

  **Must NOT do**:
  - 카드 크기 차별화 (밀도 통일)
  - 인기순/조회순 표시

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: 아이콘 뱃지 디자인 + 데이터 모델 확장
  - **Skills**: [`frontend-design`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (T19-T23과 병렬)
  - **Parallel Group**: Wave 4
  - **Blocks**: None
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `app/components/SceneCard.tsx` — 현재 카드 (143줄)
  - `app/db/queries/records.server.ts:getRecords()` — 목록 쿼리

  **Acceptance Criteria**:
  - [ ] 질문 있는 카드에 Q 뱃지
  - [ ] 자기답변 있는 카드에 ↺ 뱃지 + accent 스타일
  - [ ] 이어진 기록 카드에 ∞ 뱃지

  **QA Scenarios**:

  ```
  Scenario: 카드 뱃지 표시
    Tool: Playwright
    Preconditions: seed data에 질문/자기답변/링크 다양한 기록
    Steps:
      1. /logs 접속
      2. data-testid="card-badge-question" 존재하는 카드 확인
      3. data-testid="card-badge-self-answer" 존재하는 카드 확인
    Expected Result: 뱃지별 시각 차이 확인
    Evidence: .sisyphus/evidence/task-18-card-badges.png
  ```

  **Commit**: YES
  - Message: `feat(logs): card visual differentiation`
  - Files: `app/components/SceneCard.tsx`, `app/db/queries/records.server.ts`, `app/routes/public/logs/index.tsx`
  - Pre-commit: `pnpm test && tsc --noEmit`

- [x] 19. Record List: Mobile Filter Bottom Sheet

  **What to do**:
  - `app/components/FilterBottomSheet.tsx` — 새 컴포넌트
    - 모바일 (<768px)에서만 사용
    - 1차 필터 (항상 상단 보임): 전체/개인/챌린지 + Stage + 정렬
    - 2차 필터 (bottom sheet 안): Note/Article, Rhythm, 질문 있음, 자기답변 있음, 협업 연결
    - "필터 더보기" 버튼 → bottom sheet 열기
    - bottom sheet: 하단에서 올라오는 오버레이, 배경 dim
    - 적용 버튼으로 닫기
    - `data-testid="filter-bottom-sheet"`
  - `app/routes/public/logs/index.tsx` 수정:
    - 데스크톱: 기존 FilterBar 유지
    - 모바일: 1차 필터 + FilterBottomSheet

  **Must NOT do**:
  - 데스크톱 필터 변경
  - gesture resize (단순 open/close만)
  - nested panels

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: bottom sheet 반응형 UI + 터치 인터랙션
  - **Skills**: [`frontend-design`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (T18, T20-T23과 병렬)
  - **Parallel Group**: Wave 4
  - **Blocks**: None
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `app/components/FilterBar.tsx` — 기존 필터 컴포넌트
  - `app/routes/public/logs/index.tsx` — 목록 라우트의 필터 사용 부분

  **Acceptance Criteria**:
  - [ ] 모바일: 1차 필터 상단 + "필터 더보기" 버튼
  - [ ] "필터 더보기" → bottom sheet 열림
  - [ ] 데스크톱: 기존 FilterBar 유지
  - [ ] URL search params 연동

  **QA Scenarios**:

  ```
  Scenario: Mobile bottom sheet 필터
    Tool: Playwright
    Preconditions: 모바일 viewport
    Steps:
      1. 375px, /logs 접속
      2. "필터 더보기" 버튼 클릭
      3. data-testid="filter-bottom-sheet" visible 확인
      4. Rhythm 필터 선택 → "적용" 클릭
      5. URL search params에 rhythm 포함 확인
    Expected Result: bottom sheet 동작, 필터 적용
    Evidence: .sisyphus/evidence/task-19-filter-sheet.png
  ```

  **Commit**: YES
  - Message: `feat(logs): mobile filter bottom sheet`
  - Files: `app/components/FilterBottomSheet.tsx`, `app/routes/public/logs/index.tsx`
  - Pre-commit: `tsc --noEmit`

- [x] 20. Record Detail: Response Form Collapsed

  **What to do**:
  - `app/routes/public/logs/$recordSlug.tsx` 수정:
    - 응답 작성 폼: 기본 숨김 상태
    - "응답 남기기" 버튼 클릭 시 폼 확장
    - 글쓴이의 응답 선호도 폼 바로 위에 표시 (예: "이 기록은 공명과 질문을 환영합니다")
    - 2개 이상 응답 시: 첫 2개만 표시, "응답 N개 더 보기" expand 버튼
    - `data-testid="response-form-toggle"` — 폼 열기 버튼
    - `data-testid="response-form"` — 폼 영역
    - `data-testid="response-expand-button"` — 더 보기 버튼
    - 문장 저장 폼도 기본 접힘 처리: "문장 남기기" 클릭 후 열림

  **Must NOT do**:
  - 응답 정렬/필터링 추가
  - threading 구현
  - 응답 삭제 기능

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 845줄 파일의 상태 관리 + collapse 로직
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (T18, T19, T21-T23과 병렬)
  - **Parallel Group**: Wave 4
  - **Blocks**: T23, T34
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `app/routes/public/logs/$recordSlug.tsx` — 전체 상세 페이지 (845줄, 응답 폼/리스트 부분)
  - `app/components/ResponseCard.tsx` — 응답 카드 (69줄)

  **Acceptance Criteria**:
  - [ ] 응답 폼 기본 숨김
  - [ ] "응답 남기기" 클릭 → 폼 표시
  - [ ] 응답 >2개 시 더 보기 버튼
  - [ ] 응답 선호도 텍스트 표시

  **QA Scenarios**:

  ```
  Scenario: 응답 폼 접힘/열림
    Tool: Playwright
    Preconditions: 기록 상세 페이지, 응답 3개 이상
    Steps:
      1. /logs/:slug 접속
      2. data-testid="response-form" hidden 확인
      3. data-testid="response-form-toggle" 클릭
      4. data-testid="response-form" visible 확인
      5. data-testid="response-expand-button" 클릭 → 나머지 응답 표시
    Expected Result: 기본 접힘, 클릭으로 열림
    Evidence: .sisyphus/evidence/task-20-response-collapse.png
  ```

  **Commit**: YES
  - Message: `feat(detail): response form collapsed by default`
  - Files: `app/routes/public/logs/$recordSlug.tsx`
  - Pre-commit: `pnpm test && tsc --noEmit`

- [x] 21. Record Detail: Question Timeline Visualization

  **What to do**:
  - `app/components/QuestionTimeline.tsx` — 새 컴포넌트
    - 질문의 시간 흐름을 시각화:
      - 질문 생성 (created_at)
      - 자기답변들 (self_answers.created_at)
      - 타인 응답들 (responses WHERE question_id, created_at)
      - carry-over (question_carry_overs.carried_at)
    - UI: 세로 타임라인, 얇은 연결선
      - 각 노드: 아이콘 + 짧은 텍스트 + 상대 시간
      - 질문: 물음표 아이콘
      - 자기답변: 회전 화살표
      - 응답: 응답 유형 아이콘
      - carry-over: 화살표 → "다음 구간으로"
    - `data-testid="question-timeline"`
  - 기록 상세 페이지 수정:
    - 기존 질문 + 자기답변 카드 나열 → QuestionTimeline으로 래핑
    - 질문이 1개이고 자기답변/응답이 없으면 타임라인 대신 기존 카드
  - 쿼리 수정: 질문별 자기답변, 응답, carry-over 타임스탬프 포함

  **Must NOT do**:
  - 수평 타임라인 (세로만)
  - 복잡한 branching visualization
  - 자기답변/응답 전문 표시 (snippet만, 클릭하면 full)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: 데이터 조합 + 시간순 시각화 로직 + UI 복합도
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (T18-T20, T22-T23과 병렬)
  - **Parallel Group**: Wave 4
  - **Blocks**: None
  - **Blocked By**: T8

  **References**:

  **Pattern References**:
  - `app/routes/public/logs/$recordSlug.tsx` — 질문/자기답변/응답 섹션
  - `app/db/queries/selfAnswers.server.ts` — 자기답변 쿼리
  - `app/db/queries/responses.server.ts` — 응답 쿼리 (question_id 필터)
  - `.docs/design.md` — Quiet Depth 카드/연결선 디자인 가이드

  **Acceptance Criteria**:
  - [ ] 질문 + 자기답변 + 응답이 시간순 타임라인으로 표시
  - [ ] 연결선으로 시각적 궤적 표현
  - [ ] 단독 질문(답변 0)은 기존 카드 형태 유지

  **QA Scenarios**:

  ```
  Scenario: 질문 타임라인 표시
    Tool: Playwright
    Preconditions: T1에서 추가한 seed fixture — 질문 1개 + 자기답변 2개 + 응답 1개인 기록 (seed.sql의 test record)
    Setup: loginAsVerifiedUser(page) → navigate to fixture record
    Steps:
      1. /logs/:slug 접속
      2. data-testid="question-timeline" 존재 확인
      3. 타임라인 노드 개수 >= 4 (질문 + 자기답변2 + 응답1)
      4. 시간순 정렬 확인
    Expected Result: 질문 궤적 시각화
    Evidence: .sisyphus/evidence/task-21-question-timeline.png
  ```

  **Commit**: YES
  - Message: `feat(detail): question timeline visualization`
  - Files: `app/components/QuestionTimeline.tsx`, `app/routes/public/logs/$recordSlug.tsx`, `app/db/queries/questions.server.ts`
  - Pre-commit: `pnpm test && tsc --noEmit`

- [x] 22. Record Detail: Response UX Overhaul

  **What to do**:
  - 응답 유형 칩 라벨 단축:
    - "공명 — 이 기록에서 무엇이 남았는지 말합니다" → 칩: "공명" / 툴팁: 설명
    - "질문", "연결", "제안", "자기답변" — 칩만, 설명은 hover/tooltip
  - 응답 선호도 표시: 폼 바로 위에 명시
    - "이 기록은 [열린 응답/질문만/응답 받지 않음]을 선호합니다"
  - 질문 응답 vs 기록 전체 응답 구분:
    - 질문 카드에서 "이 질문에 응답하기" → 질문 맥락 폼 (질문 참조 자동 연결)
    - 기록 전체 하단 "응답 남기기" → 기록 전체 응답 (questionId = null)
    - UI: 질문 응답은 질문 카드 바로 아래에 inline
  - `data-testid="response-type-chip"`

  **Must NOT do**:
  - 응답 유형 설명 제거 (위치만 변경: 칩→tooltip)
  - 기존 응답 데이터 구조 변경

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 응답 폼 위치/동작 변경 + 칩 디자인 + 질문 맥락 연결
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (T18-T21, T23과 병렬)
  - **Parallel Group**: Wave 4
  - **Blocks**: T32
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `app/routes/public/logs/$recordSlug.tsx` — 응답 폼/리스트 섹션
  - `app/components/ResponseCard.tsx` — 응답 카드의 type 뱃지

  **Acceptance Criteria**:
  - [ ] 응답 유형: 칩만 표시, 설명은 tooltip
  - [ ] 응답 선호도 폼 위에 텍스트 표시
  - [ ] 질문 카드에서 시작하는 응답 → questionId 자동 연결

  **QA Scenarios**:

  ```
  Scenario: 질문 맥락 응답
    Tool: Playwright
    Preconditions: 질문 있는 기록 상세 페이지
    Steps:
      1. 질문 카드의 "이 질문에 응답하기" 클릭
      2. 응답 폼에 questionId가 자동 설정됨 확인
      3. 응답 작성 후 제출
      4. DB에서 response.question_id != null 확인
    Expected Result: 질문에 연결된 응답 생성
    Evidence: .sisyphus/evidence/task-22-question-response.png
  ```

  **Commit**: YES
  - Message: `feat(detail): response UX improvements`
  - Files: `app/routes/public/logs/$recordSlug.tsx`, `app/components/ResponseCard.tsx`
  - Pre-commit: `pnpm test && tsc --noEmit`

- [x] 23. Record Detail: Mobile Form Density

  **What to do**:
  - 모바일 (<768px) 기록 상세 페이지 밀도 최적화:
    - 응답 폼: T20에서 이미 접힘 (여기서는 모바일 최적화)
    - 문장 저장 폼: 기본 접힘, "문장 남기기" 클릭 후 펼침
    - 연결된 기록 섹션: accordion으로 접기 가능
    - 문장 섹션: accordion으로 접기 가능
    - 읽은 응답: 요약된 높이 (1줄 snippet + "더 보기")
  - `data-testid="section-accordion-linked"`, `data-testid="section-accordion-sentences"`

  **Must NOT do**:
  - 데스크톱 레이아웃 변경
  - 섹션 완전 삭제

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: CSS 반응형 + accordion 패턴
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (T18-T22와 병렬)
  - **Parallel Group**: Wave 4
  - **Blocks**: None
  - **Blocked By**: T20

  **References**:

  **Pattern References**:
  - `app/routes/public/logs/$recordSlug.tsx` — 전체 상세 페이지

  **Acceptance Criteria**:
  - [ ] 모바일: 문장/연결 섹션 accordion 접기 가능
  - [ ] 데스크톱: 기존 유지

  **QA Scenarios**:

  ```
  Scenario: 모바일 accordion 동작
    Tool: Playwright
    Preconditions: 모바일 viewport, 기록 상세 with 연결된 기록
    Steps:
      1. 375px, /logs/:slug 접속
      2. data-testid="section-accordion-linked" 접힌 상태 확인
      3. 클릭 → 확장 확인
    Expected Result: accordion 동작
    Evidence: .sisyphus/evidence/task-23-mobile-accordion.png
  ```

  **Commit**: YES
  - Message: `style(detail): mobile form density compression`
  - Files: `app/routes/public/logs/$recordSlug.tsx`
  - Pre-commit: `tsc --noEmit`

### Wave 5: Re-visit, Ritual, Connection

- [x] 24. My Space (/me): Re-visit UX Overhaul

  **What to do**:
  - `app/routes/public/me.tsx` 전면 개편:
    - **첫 번째 섹션**: "아직 답하지 않은 내 질문" — 전면 배치
      - 자기답변이 0개인 내 질문 목록
      - 질문별: 질문 텍스트 + 원본 기록 링크 + "답변하기" CTA
      - carry-over 질문 표시
    - **두 번째 섹션**: "최근 응답이 달린 내 기록"
      - 최근 7일 내 새 응답이 달린 내 기록
      - 기록 제목 + 새 응답 수 + 마지막 응답 시간
    - **세 번째 섹션**: "이어서 작성하기" (기존 drafts)
      - 서버 draft + localStorage draft 모두 표시
    - **네 번째 섹션**: "내 기록 여정" (기존 Stage별 기록)
    - `data-testid="unanswered-questions-section"`
  - 쿼리: `getUnansweredQuestionsByAuthor()`, `getRecentlyRespondedRecords()`

  **Must NOT do**:
  - 기록 수/응답 수 통계 대시보드
  - 활동 히스토리 타임라인

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: 전면 개편 + 2개 신규 쿼리 + 섹션 재구성
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (T25-T30과 병렬)
  - **Parallel Group**: Wave 5
  - **Blocks**: None
  - **Blocked By**: T1, T3

  **References**:

  **Pattern References**:
  - `app/routes/public/me.tsx` — 현재 /me 페이지 (328줄)
  - `app/db/queries/questions.server.ts:getUnansweredQuestions()` — 기존 미답변 질문 쿼리

  **Acceptance Criteria**:
  - [ ] "아직 답하지 않은 내 질문" 첫 번째 섹션
  - [ ] "최근 응답이 달린 내 기록" 두 번째 섹션
  - [ ] 각 질문에 "답변하기" CTA

  **QA Scenarios**:

  ```
  Scenario: /me 재방문 UX
    Tool: Playwright
    Preconditions: 인증된 사용자, 미답변 질문 + 최근 응답 존재
    Steps:
      1. /me 접속
      2. data-testid="unanswered-questions-section" 첫 번째 섹션 확인
      3. 질문 카드에 "답변하기" 링크 존재 확인
    Expected Result: 미답변 질문 전면 배치
    Evidence: .sisyphus/evidence/task-24-me-revisit.png
  ```

  **Commit**: YES
  - Message: `feat(me): re-visit UX overhaul`
  - Files: `app/routes/public/me.tsx`, `app/db/queries/questions.server.ts`, `app/db/queries/responses.server.ts`
  - Pre-commit: `pnpm test && tsc --noEmit`

- [x] 25. Question Reminders UI + Backend

  **What to do**:
  - 기록 상세 페이지 질문 카드에 리마인드 버튼 추가:
    - "1주 후 다시 답해볼까요?" 토글 또는 링크
    - 클릭 → `question_reminders` 테이블에 레코드 생성 (`remind_at = now + 7일`, `sent_at = null`)
    - 이 시점에서 `notifications` 테이블에는 아무것도 생성하지 않음
  - **Lazy Evaluation 모델** (유일한 전달 경로):
    - /me 또는 /inbox loader에서 `getDueReminders(learnerId)` 호출
    - `WHERE remind_at <= unixepoch() AND sent_at IS NULL` 조건
    - 만기된 리마인드 발견 시: `createNotification()` 호출 + `markReminderSent()` 호출
    - 결과: /me 또는 /inbox에 "다시 읽어볼 시간입니다" 알림 표시
    - 질문 링크 포함
  - 쿼리: `createReminder()`, `getDueReminders()`, `markReminderSent()`
  - Zod schema: reminderCreateSchema

  **Must NOT do**:
  - Cron Trigger 구현
  - 이메일 발송
  - 반복 리마인드 (1회만)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 프론트엔드 + 백엔드 + 쿼리 모듈
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (T24, T26-T30과 병렬)
  - **Parallel Group**: Wave 5
  - **Blocks**: None
  - **Blocked By**: T1, T3

  **References**:

  **Pattern References**:
  - `app/db/queries/notifications.server.ts` — createNotification 패턴
  - `app/db/queries/reminders.server.ts` — T1에서 만든 쿼리 모듈
  - `app/routes/public/logs/$recordSlug.tsx` — 질문 카드 영역

  **Acceptance Criteria**:
  - [ ] 질문 카드에 리마인드 버튼
  - [ ] 클릭 → question_reminders 레코드 생성
  - [ ] /me 방문 시 만기 리마인드 표시

  **QA Scenarios**:

  ```
  Scenario: 질문 리마인드 생성 (lazy evaluation 모델)
    Tool: Playwright
    Preconditions: seed data에 열린 질문 있는 기록
    Setup: loginAsVerifiedUser(page)
    Steps:
      1. /logs/:slug 접속
      2. 질문 카드의 리마인드 버튼 클릭
      3. "1주 후 알림이 설정되었습니다" 확인
      4. DB 확인: question_reminders 레코드 존재 (remind_at = now+7d, sent_at = NULL)
      5. DB 확인: notifications 테이블에 새 레코드 없음 (lazy — 아직 미생성)
    Expected Result: question_reminders만 생성, notifications는 미생성
    Failure Indicators: notifications에 즉시 레코드 생성됨 (lazy 모델 위반)
    Evidence: .sisyphus/evidence/task-25-reminder.png

  Scenario: 리마인드 lazy delivery
    Tool: Bash (vitest)
    Preconditions: question_reminders에 remind_at이 과거인 레코드
    Steps:
      1. getDueReminders() 호출 → 만기 리마인드 반환
      2. createNotification() + markReminderSent() 호출
      3. notifications에 reread_reminder 레코드 존재 확인
      4. question_reminders.sent_at != NULL 확인
    Expected Result: lazy delivery 정상 동작
    Evidence: .sisyphus/evidence/task-25-lazy-delivery.txt
  ```

  **Commit**: YES
  - Message: `feat(reminders): question reminder UI and backend`
  - Files: `app/routes/public/logs/$recordSlug.tsx`, `app/db/queries/reminders.server.ts`, `app/routes/public/me.tsx`
  - Pre-commit: `pnpm test && tsc --noEmit`

- [x] 26. Stage Personal Closing Ritual

  **What to do**:
  - Stage 상세 페이지(`/journey/:stageSlug`) 수정:
    - Stage status가 "closed"일 때, 인증된 사용자에게 개인 회고 폼 표시
    - 폼 3개 질문:
      1. "이 구간에서 버릴 것 한 가지" (textarea)
      2. "다음 구간으로 가져갈 질문 한 가지" (textarea)
      3. "가장 오래 남은 문장 한 가지" (textarea)
    - 제출 → personal_stage_reflections 테이블에 저장
    - 이미 작성한 경우: 읽기 전용으로 표시 + "수정" 버튼
    - `data-testid="personal-closing-ritual"`
  - 쿼리: `getPersonalReflection()`, `upsertPersonalReflection()`
  - Zod schema: personalReflectionSchema

  **Must NOT do**:
  - 필수 입력 강제 (선택적)
  - 다른 사용자의 회고 표시 (개인만)
  - 복잡한 multi-step wizard

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: 조건부 UI + 폼 + 쿼리 + 상태 전환
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (T24, T25, T27-T30과 병렬)
  - **Parallel Group**: Wave 5
  - **Blocks**: None
  - **Blocked By**: T1

  **References**:

  **Pattern References**:
  - `app/routes/public/journey/$stageSlug.tsx` — Stage 상세 페이지
  - `app/db/queries/reflections.server.ts` — T1에서 만든 쿼리 모듈
  - `.docs/operational-principles.md` — 운영 원칙 (허가형 문구 톤)

  **Acceptance Criteria**:
  - [ ] closed Stage에서 개인 회고 폼 표시
  - [ ] 3개 질문 입력 → personal_stage_reflections 저장
  - [ ] 이미 작성 시 읽기 전용 표시

  **QA Scenarios**:

  ```
  Scenario: Stage closing ritual 작성
    Tool: Playwright
    Preconditions: T1에서 추가한 seed fixture — status='closed'인 Stage (seed.sql의 test stage)
    Setup: loginAsVerifiedUser(page)
    Steps:
      1. /journey/:closedStageSlug 접속 (seed의 closed stage slug 사용)
      2. data-testid="personal-closing-ritual" 존재 확인
      3. 3개 필드 입력 후 제출
      4. 새로고침 → 읽기 전용으로 내용 표시 확인
    Expected Result: 회고 저장 + 표시
    Evidence: .sisyphus/evidence/task-26-closing-ritual.png
  ```

  **Commit**: YES
  - Message: `feat(ritual): personal stage closing reflection`
  - Files: `app/routes/public/journey/$stageSlug.tsx`, `app/db/queries/reflections.server.ts`
  - Pre-commit: `pnpm test && tsc --noEmit`

- [x] 27. Question Carry-Over Mechanism + UI

  **What to do**:
  - 기록 상세 페이지 질문 카드 수정:
    - 열린 질문에 "다음 구간으로 가져가기" 옵션 추가
    - 작성자 본인만 볼 수 있음
    - 클릭 → question_carry_overs 레코드 생성 (from_stage_id, to_stage_id)
    - 새 Stage에서: 원본 질문 content로 새 question 생성 (new_question_id에 연결)
    - carry-over된 질문에 "이전 구간에서 가져온 질문" 뱃지
  - Stage 변경 시점 (admin이 Stage status 변경):
    - carry-over 대기 질문을 새 Stage로 이동
  - QuestionCard에 carry-over 뱃지 표시
  - 쿼리: `createCarryOver()`, `getCarryOversForStage()`, `getPendingCarryOvers()`

  **Must NOT do**:
  - 자동 carry-over (작성자 수동만)
  - 연쇄 carry-over (단일 홉)
  - 원본 질문 삭제/수정

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: 복잡한 데이터 흐름 + 조건부 UI + Stage 전환 로직
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (T24-T26, T28-T30과 병렬)
  - **Parallel Group**: Wave 5
  - **Blocks**: None
  - **Blocked By**: T1

  **References**:

  **Pattern References**:
  - `app/routes/public/logs/$recordSlug.tsx` — 질문 카드 영역
  - `app/db/queries/carryOvers.server.ts` — T1에서 만든 쿼리 모듈
  - `app/db/queries/questions.server.ts:createQuestion()` — 새 질문 생성

  **Acceptance Criteria**:
  - [ ] 열린 질문에 "다음 구간으로 가져가기" 옵션
  - [ ] carry-over → question_carry_overs 레코드 생성
  - [ ] 새 Stage에서 carry-over 질문 표시
  - [ ] "이전 구간에서 가져온 질문" 뱃지

  **QA Scenarios**:

  ```
  Scenario: 질문 carry-over
    Tool: Playwright
    Preconditions: 인증된 사용자, 열린 질문, 다음 Stage 존재
    Steps:
      1. /logs/:slug 접속, 내 질문의 "다음 구간으로 가져가기" 클릭
      2. 확인 → question_carry_overs 레코드 생성
      3. 다음 Stage 페이지에서 carry-over 질문 뱃지 확인
    Expected Result: carry-over 성공
    Evidence: .sisyphus/evidence/task-27-carry-over.png
  ```

  **Commit**: YES
  - Message: `feat(carry-over): question carry-over mechanism`
  - Files: `app/routes/public/logs/$recordSlug.tsx`, `app/db/queries/carryOvers.server.ts`, `app/components/QuestionCard.tsx`
  - Pre-commit: `pnpm test && tsc --noEmit`

- [x] 28. Sentence → Question/Record Expansion

  **What to do**:
  - 기록 상세 페이지 문장(sentence) 섹션 수정:
    - 각 저장된 문장에 action 버튼 추가:
      - "이 문장에서 질문 만들기" → 질문 생성 폼 (content 프리필)
      - "이 문장으로 기록 시작하기" → /write/note?from=sentence&id=:sentenceId
    - /write/note에서 from=sentence 파라미터 처리:
      - 원본 문장을 에디터에 인용 형태로 프리필
  - 쿼리: 기존 sentence/question 쿼리 활용

  **Must NOT do**:
  - 문장 공유 기능 (외부 공유)
  - 문장 삭제 시 파생 질문/기록 삭제

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 두 경로 (질문/기록) + 프리필 로직
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (T24-T27, T29, T30과 병렬)
  - **Parallel Group**: Wave 5
  - **Blocks**: None
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `app/routes/public/logs/$recordSlug.tsx` — 문장 섹션
  - `app/db/queries/sentences.server.ts` — 문장 쿼리

  **Acceptance Criteria**:
  - [ ] 문장에 "질문 만들기" 버튼
  - [ ] 문장에 "기록 시작하기" 버튼
  - [ ] /write/note?from=sentence → 인용 프리필

  **QA Scenarios**:

  ```
  Scenario: 문장에서 기록 시작
    Tool: Playwright
    Preconditions: 저장된 문장 있는 기록 상세
    Steps:
      1. 문장의 "기록 시작하기" 클릭
      2. /write/note 이동 → textarea에 인용 형태 문장 존재 확인
    Expected Result: 프리필 성공
    Evidence: .sisyphus/evidence/task-28-sentence-expand.png
  ```

  **Commit**: YES
  - Message: `feat(sentence): expansion to question/record`
  - Files: `app/routes/public/logs/$recordSlug.tsx`, `app/routes/public/write/note.tsx`
  - Pre-commit: `pnpm test && tsc --noEmit`

- [x] 29. Search: Question Tab

  **What to do**:
  - `/search` 페이지 수정:
    - 탭 추가: 기록 / **질문** / 러너 / 문장
    - 질문 탭: 질문 content 전문 검색
    - 검색 결과: QuestionCard 형태 (direction, 원본 기록 링크)
    - URL: `/search?tab=questions&q=검색어`
  - 쿼리: `searchQuestions()` — questions.content LIKE 검색
  - `data-testid="search-tab-questions"`

  **Must NOT do**:
  - AI/semantic 검색
  - 인기순 정렬

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 탭 UI + 새 검색 쿼리 + 라우트 수정
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (T24-T28, T30과 병렬)
  - **Parallel Group**: Wave 5
  - **Blocks**: None
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `app/routes/public/search.tsx` — 현재 검색 페이지
  - `app/db/queries/search.server.ts` — 기존 검색 쿼리

  **Acceptance Criteria**:
  - [ ] 검색 페이지에 "질문" 탭
  - [ ] 질문 검색 결과 QuestionCard 형태

  **QA Scenarios**:

  ```
  Scenario: 질문 검색
    Tool: Playwright
    Preconditions: seed data에 질문 존재
    Steps:
      1. /search?tab=questions&q=왜 접속
      2. data-testid="search-tab-questions" active 확인
      3. 검색 결과에 질문 카드 존재 확인
    Expected Result: 질문 검색 동작
    Evidence: .sisyphus/evidence/task-29-question-search.png
  ```

  **Commit**: YES
  - Message: `feat(search): question search tab`
  - Files: `app/routes/public/search.tsx`, `app/db/queries/search.server.ts`
  - Pre-commit: `pnpm test && tsc --noEmit`

- [x] 30. Record Connection UI Enhancement

  **What to do**:
  - 기록 상세 페이지 연결된 기록 섹션 개선:
    - "이 기록에서 이어진 기록" → 더 시각적 연결 (화살표/선 아이콘)
    - "이 기록으로 이어온 기록" (incoming links) → 별도 구분
    - 각 연결에 link_type 표시 (reference/expansion/related)
    - "이 기록을 이어서 쓰기" CTA (작성자 본인)
      - 클릭 → /write/note?linkedTo=:recordSlug
      - 발행 시 record_links 자동 생성

  **Must NOT do**:
  - 복잡한 graph visualization
  - 자동 연결 제안

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 기존 연결 UI 개선 + CTA 추가
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (T24-T29와 병렬)
  - **Parallel Group**: Wave 5
  - **Blocks**: None
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `app/routes/public/logs/$recordSlug.tsx` — 연결된 기록 섹션
  - `app/db/queries/recordLinks.server.ts` — 링크 쿼리

  **Acceptance Criteria**:
  - [ ] 연결 방향 구분 (→ outgoing / ← incoming)
  - [ ] link_type 표시
  - [ ] "이어서 쓰기" CTA (작성자 본인)

  **QA Scenarios**:

  ```
  Scenario: 연결된 기록 방향 구분
    Tool: Playwright
    Preconditions: T1에서 추가한 seed fixture — record_links 2개 (expansion + reference 타입)
    Setup: loginAsVerifiedUser(page) → navigate to fixture record with links
    Steps:
      1. /logs/:slug 접속
      2. outgoing/incoming 연결 섹션 구분 확인
    Expected Result: 방향별 구분 표시
    Evidence: .sisyphus/evidence/task-30-record-connection.png
  ```

  **Commit**: YES
  - Message: `feat(detail): record connection UI enhancement`
  - Files: `app/routes/public/logs/$recordSlug.tsx`
  - Pre-commit: `tsc --noEmit`

### Wave 6: Polish + Anti-patterns

- [x] 31. Self-Answer Visual Distinction

  **What to do**:
  - 기록 상세 + 목록에서 자기답변 시각 강화:
    - 자기답변 카드: mist-blue 배경 + 좌측 accent border (4px, Ocean Blue)
    - "시간이 지나 다시 돌아와 쓴 답변" 느낌의 subtle 시각 차별화
    - 자기답변 아이콘: ↺ 또는 시계 화살표
    - 질문 타임라인(T21)에서 자기답변 노드도 같은 스타일
  - `app/components/ResponseCard.tsx` 수정
  - `app/components/QuestionTimeline.tsx` 수정 (T21에서 만든 컴포넌트)

  **Must NOT do**:
  - 자기답변을 일반 응답과 같은 스타일
  - 과도한 애니메이션

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: 순수 디자인 개선
  - **Skills**: [`frontend-design`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (T32-T35와 병렬)
  - **Parallel Group**: Wave 6
  - **Blocks**: None
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `app/components/ResponseCard.tsx` — 현재 응답 카드
  - `.docs/design.md` — 카드 스펙, Quiet Depth 색상

  **Acceptance Criteria**:
  - [ ] 자기답변 카드가 일반 응답과 시각적으로 구분됨
  - [ ] mist-blue 배경 + accent border

  **QA Scenarios**:

  ```
  Scenario: 자기답변 시각 구분
    Tool: Playwright
    Steps:
      1. 자기답변 있는 기록 상세 접속
      2. 자기답변 카드 스크린샷 캡처
      3. 일반 응답 카드와 배경/border 차이 확인
    Expected Result: 시각적 차별화 확인
    Evidence: .sisyphus/evidence/task-31-self-answer-style.png
  ```

  **Commit**: YES
  - Message: `style(detail): self-answer visual distinction`
  - Files: `app/components/ResponseCard.tsx`
  - Pre-commit: `tsc --noEmit`

- [x] 32. Response Editorial Card Styling

  **What to do**:
  - 모든 응답 카드를 "댓글"이 아닌 "정리된 메모 카드" 느낌으로 스타일링:
    - radius 20-24px (Quiet Depth 카드 스펙)
    - padding 20-28px
    - 여백 충분히 (응답 간 gap 16-24px)
    - type 칩은 상단 좌측 (T22에서 단축한 라벨)
    - 작성자 정보 하단 (아바타 없이 이름 + 시간)
    - hover: subtle elevation만
    - 드롭다운/스레딩 UI 요소 제거
  - 기존 ResponseCard 컴포넌트 디자인 정밀 조정

  **Must NOT do**:
  - 말풍선/채팅 버블
  - 인기 응답 하이라이트
  - 응답 중첩/스레딩

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: 디자인 정밀 조정
  - **Skills**: [`frontend-design`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (T31, T33-T35와 병렬)
  - **Parallel Group**: Wave 6
  - **Blocks**: None
  - **Blocked By**: T22

  **References**:

  **Pattern References**:
  - `app/components/ResponseCard.tsx` — 현재 응답 카드
  - `.docs/design.md` — 카드 시스템 스펙 (radius, padding, shadow, hover)

  **Acceptance Criteria**:
  - [ ] 응답 카드가 메모 카드 느낌 (댓글 아님)
  - [ ] radius 20-24px, padding 20-28px
  - [ ] 말풍선 요소 없음

  **QA Scenarios**:

  ```
  Scenario: 응답 카드 editorial 스타일
    Tool: Playwright
    Steps:
      1. 응답 있는 기록 상세 스크린샷
    Expected Result: 메모 카드 느낌, 댓글 느낌 아님
    Evidence: .sisyphus/evidence/task-32-response-editorial.png
  ```

  **Commit**: YES
  - Message: `style(detail): response editorial card styling`
  - Files: `app/components/ResponseCard.tsx`
  - Pre-commit: `tsc --noEmit`

- [x] 33. Activity Numbers Reduction

  **What to do**:
  - Home 이외 페이지에서도 활동 숫자 전면 노출 축소:
    - Journey 페이지: Stage별 기록 수 → "기록이 시작되었습니다" / "아직 기록이 없습니다" 서술형
    - Learner 프로필: 기록 수/응답 수 제거 또는 최하단으로 이동
    - Stage 상세: 숫자 대신 최근 활동 서술형
  - `ast_grep_search`로 "개" + 숫자 패턴 찾아서 서술형 전환
  - 목표: "얼마나 많이" 대신 "어떤 일이"

  **Must NOT do**:
  - Admin 페이지의 숫자 제거 (Admin은 정보 밀도 유지)
  - 완전 숫자 제거 (보조 위치에는 허용)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 여러 파일의 텍스트/UI 조정
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (T31, T32, T34, T35와 병렬)
  - **Parallel Group**: Wave 6
  - **Blocks**: None
  - **Blocked By**: T13

  **References**:

  **Pattern References**:
  - `app/routes/public/index.tsx` — Home (T13에서 개편 후)
  - `app/routes/public/journey/index.tsx` — Journey
  - `app/routes/public/learners/$learnerSlug.tsx` — Learner 프로필

  **Acceptance Criteria**:
  - [ ] Public 페이지에서 활동 숫자 전면 노출 없음
  - [ ] 서술형 텍스트로 대체
  - [ ] Admin 페이지 숫자 유지

  **QA Scenarios**:

  ```
  Scenario: 숫자 노출 감소 확인
    Tool: Bash (grep)
    Steps:
      1. Public routes에서 "N개" 패턴 검색
      2. Hero/상단 영역에서 숫자 메트릭 부재 확인
    Expected Result: Public 전면에 숫자 메트릭 없음
    Evidence: .sisyphus/evidence/task-33-numbers-reduction.txt
  ```

  **Commit**: YES
  - Message: `style: reduce activity numbers across pages`
  - Files: 여러 route 파일
  - Pre-commit: `tsc --noEmit`

- [x] 34. E2E Test Suite for New UX Flows

  **What to do**:
  - `tests/e2e/autosave.spec.ts` — autosave + recovery E2E
  - `tests/e2e/progressive-disclosure.spec.ts` — 작성 progressive disclosure
  - `tests/e2e/floating-cta.spec.ts` — mobile floating CTA
  - `tests/e2e/response-collapse.spec.ts` — 응답 접힘/열림
  - `tests/e2e/question-capture.spec.ts` — 작성 중 질문 캡처
  - 기존 smoke.spec.ts 통과 확인
  - Cookie injection 패턴 (기존 QA convention) 사용

  **Must NOT do**:
  - 텍스트 기반 셀렉터 (data-testid만)
  - 실제 외부 인증 호출

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: 5개 E2E spec 파일 + 복합 시나리오
  - **Skills**: [`playwright`]

  **Parallelization**:
  - **Can Run In Parallel**: NO (모든 UX 태스크 완료 후)
  - **Parallel Group**: Wave 6 (sequential)
  - **Blocks**: F1-F4
  - **Blocked By**: T10, T11, T16, T20

  **References**:

  **Pattern References**:
  - `tests/e2e/smoke.spec.ts` — 기존 E2E 패턴
  - `.dev.vars` — 테스트 세션 쿠키

  **Acceptance Criteria**:
  - [ ] 5개 E2E spec 모두 PASS
  - [ ] 기존 smoke.spec.ts PASS 유지
  - [ ] 모든 셀렉터 data-testid 사용

  **QA Scenarios**:

  ```
  Scenario: E2E suite 전체 실행
    Tool: Bash
    Steps:
      1. `pnpm exec playwright test`
      2. 전체 통과 확인
    Expected Result: 모든 E2E 테스트 PASS
    Evidence: .sisyphus/evidence/task-34-e2e-results.txt
  ```

  **Commit**: YES
  - Message: `test(e2e): comprehensive E2E test suite`
  - Files: `tests/e2e/*.spec.ts`
  - Pre-commit: `pnpm exec playwright test`

- [x] 35. Build Verification + Migration Validation

  **What to do**:
  - 전체 빌드 검증:
    - `wrangler d1 migrations apply DB --local` — 모든 migration 성공
    - `pnpm test` — 기존 + 신규 테스트 전부 PASS
    - `tsc --noEmit` — 타입 에러 0
    - `npx react-router build` — 프로덕션 빌드 성공
  - seed data 검증:
    - `wrangler d1 execute DB --local --file=seeds/seed.sql` — seed 적용 성공
    - 새 테이블에 seed data 필요 시 `seeds/seed.sql` 업데이트

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 명령어 실행 + 결과 확인
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO (T34 이후)
  - **Parallel Group**: Wave 6 (last)
  - **Blocks**: F1-F4
  - **Blocked By**: T34

  **References**: 없음 (검증 태스크)

  **Acceptance Criteria**:
  - [ ] 4개 검증 명령 모두 성공

  **QA Scenarios**:

  ```
  Scenario: 전체 빌드 검증
    Tool: Bash
    Steps:
      1. `wrangler d1 migrations apply DB --local`
      2. `pnpm test`
      3. `tsc --noEmit`
      4. `npx react-router build`
    Expected Result: 4개 모두 exit code 0
    Evidence: .sisyphus/evidence/task-35-build-verify.txt
  ```

  **Commit**: YES
  - Message: `chore: build verification + migration validation`
  - Files: `seeds/seed.sql` (필요시)
  - Pre-commit: 없음

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Rejection → fix → re-run.

- [x] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, curl endpoint, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [x] F2. **Code Quality Review** — `unspecified-high`
  Run `tsc --noEmit` + `pnpm test`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names. Verify all new queries follow `db(d1)` factory pattern. Verify Zod schemas in `app/lib/validation.ts`.
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [x] F3. **Real Manual QA** — `unspecified-high` + `playwright` skill
  Start from clean state. Execute EVERY QA scenario from EVERY task. Test cross-task integration. Test edge cases: autosave on dual tabs, empty draft recovery, progressive disclosure restore after autosave. Save to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [x] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff. Verify 1:1. Check "Must NOT do" compliance. Verify no좋아요/인기순/engagement 패턴 추가. Detect cross-task contamination. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

- **T1**: `schema: add drafts, reminders, carry-overs, saved_records, reflections tables` — migration SQL + schema.server.ts + relations
- **T2**: `feat(autosave): add server endpoint and query module` — API route + queries + Zod schema
- **T3**: `refactor(notifications): centralize createNotification utility` — extract + migrate inline inserts
- **T4-T5**: `feat(draft): add localStorage recovery and useAutosave hook` — lib + hook
- **T6-T7**: `feat(write): progressive disclosure + warm-up prompt` — note + article routes
- **T8**: `feat(write): question capture during writing` — editor slot + action
- **T9**: `feat(write): note to article expansion` — button + pre-fill + record_links
- **T10-T11**: `feat(autosave): integrate into write flows` — note + article autosave
- **T12**: `feat(draft): recovery UI on page load` — recovery prompt component
- **T13**: `feat(home): narrative digest replacing activity stats` — query + component
- **T14**: `feat(home): question card enrichment` — metadata badges
- **T15**: `style(home): hero editorial tone adjustment` — visual refinement
- **T16**: `feat(mobile): floating write CTA` — component + responsive behavior
- **T17**: `style(mobile): compact footer` — mobile footer compression
- **T18**: `feat(logs): card visual differentiation` — badges + indicators
- **T19**: `feat(logs): mobile filter bottom sheet` — component + progressive disclosure
- **T20**: `feat(detail): response form collapsed by default` — toggle behavior
- **T21**: `feat(detail): question timeline visualization` — timeline component
- **T22**: `feat(detail): response UX improvements` — preference display + type simplification + distinction
- **T23**: `style(detail): mobile form density compression` — collapse by default
- **T24**: `feat(me): re-visit UX overhaul` — unanswered Qs + recent responses + draft view
- **T25**: `feat(reminders): question reminder UI and backend` — form + notification + scheduling
- **T26**: `feat(ritual): personal stage closing reflection` — form + display
- **T27**: `feat(carry-over): question carry-over mechanism` — UI + backend
- **T28**: `feat(sentence): expansion to question/record` — action buttons
- **T29**: `feat(search): question search tab` — tab + query
- **T30**: `feat(detail): record connection UI enhancement` — visual + navigation
- **T31**: `style(detail): self-answer visual distinction` — design refinement
- **T32**: `style(detail): response editorial card styling` — card redesign
- **T33**: `style: reduce activity numbers across pages` — home + profile
- **T34**: `test(e2e): comprehensive E2E test suite` — Playwright tests
- **T35**: `chore: build verification + migration validation` — final checks

---

## Success Criteria

### Verification Commands
```bash
wrangler d1 migrations apply DB --local        # Expected: 모든 migration 성공
pnpm test                                       # Expected: 기존 + 신규 테스트 전부 PASS
tsc --noEmit                                    # Expected: 타입 에러 0
npx react-router build                          # Expected: 프로덕션 빌드 성공
```

### Final Checklist
- [ ] Autosave 동작: 3초 후 자동 저장, 상태 표시, localStorage 복구
- [ ] Progressive Disclosure: 첫 화면은 에디터만, 20자 이상 입력 후 메타 필드
- [ ] 질문 캡처: 작성 중 질문 슬롯, 발행 시 record + question 트랜잭션
- [ ] Home 내러티브: 숫자 대신 서술형 활동 digest
- [ ] 응답 접힘: 기본 접힘, "응답 남기기" 클릭 후 열림
- [ ] Floating CTA: 모바일 <1024px, 48px 이상, 하단 우측, /write/* 제외
- [ ] 기록 카드 뱃지: Q(질문), ↺(자기답변), ∞(이어진 기록) 아이콘
- [ ] /me 재방문: 미답변 질문 전면, 최근 응답 기록, 초안 목록
- [ ] Stage 회고: 버릴 것/가져갈 질문/남은 문장 3개 질문
- [ ] 질문 carry-over: "다음 Stage에 가져갈까요?" → question_carry_overs 레코드
- [ ] Note → Article: "이 메모를 글로 확장" 버튼 → record_links 연결
- [ ] 모바일 필터: bottom sheet, 1차 필터 상단 고정, 2차 필터 시트 안
- [ ] 질문 타임라인: 질문 → 자기답변 → 응답 연결선 시각화
- [ ] Compact footer: 모바일 푸터 3줄 이내 압축
- [ ] 기존 smoke 테스트 통과 유지
