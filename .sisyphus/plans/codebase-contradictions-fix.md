# 코드베이스 모순점 전체 수정

## TL;DR

> **Quick Summary**: 12개 병렬 감사 에이전트 탐색으로 발견된 코드베이스 모순점 32건을 체계적으로 수정. 보안(visibility 필터 누락 8건), 로직 오류(설정 단절/편집 동기화/중복 표시 등 7건), UI 갭(와이어프레임 미구현 13건)을 우선순위별로 해결.
> 
> **Deliverables**:
> - CRITICAL 보안 수정 8건 (draft 기록 데이터 노출 차단)
> - HIGH 로직 수정 5건 (설정 연동, 편집 동기화, /me 중복 제거, 응답 visibility)
> - MEDIUM UI 갭 수정 8건 (7개 라우트 대상: stage, learner, challenge, group, search, record, guide)
> - 모든 수정에 대한 vitest 단위 테스트
> 
> **Estimated Effort**: Large
> **Parallel Execution**: YES - 4 waves
> **Critical Path**: Task 1 (검증) → Task 2-5 (보안) → Task 6-10 (로직) → Task 11-18 (UI)

---

## Issue-to-Task Mapping (32건 전체 추적)

> 발견된 모든 이슈가 Task에 매핑되거나 명시적으로 Deferred됨. 누락 없음.

### IN SCOPE — Task에 매핑 (21건)

| Issue ID | 설명 | Task |
|----------|------|------|
| C-1 | getRecordBySlug visibility defense-in-depth | Task 5 |
| C-2 | searchAll() questions/sentences visibility | Task 2 |
| C-3 | search.tsx 인라인 questions/sentences visibility | Task 2 (C-2와 동일 근본 원인) |
| C-4 | 홈 sentences visibility | Task 3 |
| C-5 | Stage/Learner questions visibility | Task 3 |
| C-6 | mentions/recordLinks visibility | Task 4 |
| C-7 | 응답 생성 시 draft 체크 | Task 5 |
| H-1 | /me draft 중복 표시 | Task 6 |
| H-2 | 설정 defaultVisibility/responsePreference 글쓰기 단절 | Task 7 |
| H-5 | 편집 시 mention/recordLink 동기화 누락 | Task 8 |
| H-6 | 응답 visibility 하드코딩 | Task 9 |
| H-8 | note 생성 mention 동기화 전무 (Metis 발견) | Task 8 |
| H-9 | save_sentence draft 체크 누락 (Metis 발견) | Task 5 |
| M-1 | Stage 상세 Collective Memory 링크 누락 | Task 10 |
| M-2 | Learner 상세 아카이브/협업 누락 | Task 11 |
| M-3 | Challenge 상세 전환점/회고 누락 | Task 12 |
| M-4 | Collaboration Unit 전환점/회고 누락 | Task 12 |
| M-5 | Search sentences 탭 렌더링 미완성 | Task 13 |
| M-7 | Record Detail breadcrumb 누락 | Task 14 |
| M-8 | Guide FAQ 누락 | Task 14 |
| M-9 | 미사용 컴포넌트 활용 + 코드 품질 | Task 15 |

### EXPLICITLY DEFERRED — 별도 플랜 필요 (11건)

| Issue ID | 설명 | 제외 사유 | 후속 플랜 |
|----------|------|-----------|-----------|
| H-3 | 알림 시스템 95% 비어있음 (response/stage/memory 알림 미구현) | 범위 과대: 5개 알림 유형 + Queue consumer + email 배달 = 별도 대형 플랜 필요 | `notification-system-buildout` |
| H-4 | 글쓰기 UI 컨트롤 미구현 (rhythm/template/collab-unit/question) | 신규 기능: 기존 코드 "수정"이 아닌 새 UI 구현 | `write-flow-enhancement` |
| H-7 | Cohort 격리 불완전 (홈/공개 페이지에서 전체 cohort 혼합) | 아키텍처 결정 필요: active cohort 메커니즘 설계 후 진행 | `cohort-isolation-architecture` |
| M-6 | /me Bookmarks 누락 | DB 모델 없음: bookmark 스키마 설계부터 필요 | `bookmarks-feature` |
| M-10 | Admin learner detail read-only | Admin 확장: 기존 코드 모순이 아닌 기능 부족 | `admin-enhancements` |
| M-11 | Admin CREATE 기능 없음 | Admin 확장: 동일 | `admin-enhancements` |
| M-12 | Stage 순서 변경 UI 없음 | Admin 확장: 동일 | `admin-enhancements` |
| M-13 | deleteRecord 함수 미존재 | 신규 기능: cascade 설계 + UI 확인 모달 필요 | `record-management` |
| L-1 | cohort 필터 스타일 불일치 | Task 15에서 부분 해결 (search/questions/memories만) | — |
| L-4 | Visibility 상태 전이 제한 없음 | 설계 결정 필요: 의도적 자유 허용 vs 제한 | `visibility-policy` |
| L-5 | Editor 이중 export | 비차단: 동작에 영향 없음, 코드 리뷰 시 정리 | — |

---

## Context

### Original Request
코드베이스 전체를 탐색해서 모순점을 찾고, 하나하나 가설을 세워 검증한 후 수정 플랜을 세우기.

### Interview Summary
**탐색 방법**: 12개 병렬 에이전트 + 직접 grep/read/ast-grep 탐색
- 에이전트 1: /me 라우트 + 사용자 기록 쿼리
- 에이전트 2: 스키마 vs 쿼리 일관성
- 에이전트 3: 라우트 구조 vs AGENTS.md
- 에이전트 4: 인증 미들웨어 + visibility 로직
- 에이전트 5: Journey/Stage 데이터 흐름
- 에이전트 6: 컴포넌트 정의 vs 사용
- 에이전트 7: 글쓰기/편집 action 데이터 무결성
- 에이전트 8: FRD 요구사항 vs 실제 구현
- 에이전트 9: Admin 라우트 CRUD 수준
- 에이전트 10: 알림/인박스 + 응답 선호 로직
- 에이전트 11: Seed 데이터 + 스키마 제약조건
- 에이전트 12: 와이어프레임 vs UI 구현

### Metis Review
**Identified Gaps** (addressed):
- C-1 (getRecordBySlug)은 라우트에서 이미 방어하지만 defense-in-depth로 쿼리에도 추가
- C-3은 C-2와 동일 근본 원인 (searchAll 함수) — 중복 제거
- 신규 발견: H-8 (note 생성에 mention 동기화 전무), H-9 (save_sentence에 visibility 미확인)
- records.cohort 컬럼 인구 상태 검증 필요
- 기존 78개 테스트는 유틸리티만 커버 — 쿼리/라우트 테스트는 새로 작성 필요

---

## Work Objectives

### Core Objective
코드베이스에서 발견된 보안 취약점(draft 기록 데이터 노출), 로직 오류(설정 단절, 편집 동기화 누락), UI 불일치(와이어프레임 미구현)를 체계적으로 수정하여 설계 문서와 일치시킨다.

### Concrete Deliverables
- 8개 쿼리/라우트의 visibility 필터 추가 (보안)
- 글쓰기 페이지가 사용자 설정 기본값을 반영하도록 수정
- 기록 편집 시 mention/recordLink 동기화 추가
- /me 페이지 draft 중복 표시 해결
- 응답 visibility 사용자 선택 가능하게 수정
- 7개 라우트의 와이어프레임 미구현 섹션 추가 (stage, learner, challenge, group, search, record, guide)
- 모든 수정에 대한 vitest 단위 테스트

### Definition of Done
- [ ] `npm run typecheck` 통과
  - [ ] `npm run test` 전체 통과 (기존 78개 + 신규 테스트)
  - [ ] `npm run build` 성공
- [ ] Draft 기록의 질문/문장/멘션/링크가 비작성자에게 노출되지 않음
- [ ] 설정 페이지 기본값이 글쓰기 폼에 반영됨
- [ ] /me 페이지에서 draft가 한 곳에만 표시됨

### Must Have
- 모든 CRITICAL 보안 수정 (C-1~C-7, H-9)
- 설정-글쓰기 연동 (H-2)
- 편집 시 mention/recordLink 동기화 (H-5, H-8)
- /me 드래프트 중복 해결 (H-1)
- 각 수정에 대한 단위 테스트

### Must NOT Have (Guardrails)
- ❌ 알림 시스템 확장 (response/stage/memory 알림 추가) — 별도 플랜으로 분리
- ❌ 글쓰기 UI 신규 컨트롤 추가 (rhythm/template/collab-unit 선택기) — 신규 기능, 별도 플랜
- ❌ Cohort 격리 시스템 구현 — 아키텍처 결정 필요, 별도 플랜
- ❌ Admin CREATE 기능 추가 (현재 UPDATE만 가능)
- ❌ `app/lib/auth.server.ts` 또는 `app/lib/auth.middleware.ts` 수정 — 인증 계층은 정상
- ❌ `app/db/schema.server.ts` 스키마 변경 (마이그레이션 불필요)
- ❌ 기존 UI 재디자인 또는 스타일 변경
- ❌ Cloudflare Queues 소비자 구현
- ❌ Bookmarks 기능 (M-6) — DB 모델 없음, 별도 플랜에서 스키마 설계부터 필요
- ❌ deleteRecord 기능 추가 — 별도 플랜
- ❌ Rich text 에디터 도입
- ❌ 좋아요, 추천, 인기순 등 제품 철학 위반 기능

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: YES (vitest 78개 테스트, Playwright E2E 6개)
- **Automated tests**: YES (Tests-after — 각 수정 후 테스트 작성)
- **Framework**: vitest (기존), Playwright (E2E)

### QA Policy — 3계층 검증

Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

**Layer 1 (모든 Task 필수)**: `npm run typecheck` + `npm run test` + `npm run build`
**Layer 2 (코드 레벨 검증)**: grep/ast-grep으로 수정 코드가 존재하는지 확인. 개별 Task QA에서 수행.
**Layer 3 (행동 검증 — F3에서 통합 수행)**: Playwright로 실제 페이지 동작 검증. 외부 인증 토큰 유효 시 auth 페이지 포함, 무효 시 public 페이지만. F3가 모든 Task의 행동 검증을 통합 담당.

> **설계 이유**: 개별 Task QA를 grep 코드 레벨로 유지하는 이유는 외부 인증 서비스(ada-kr-pos.com) 의존성 때문. 행동 검증은 F3(Final Verification)에서 Playwright skill + 실제 서버로 통합 수행하여 인증 토큰 관리를 1곳으로 집중.

- **Query/Action fixes (Tasks 2-9)**: Layer 1 + Layer 2 (코드 존재 확인)
- **UI fixes (Tasks 10-14)**: Layer 1 + Layer 2 + Layer 3 (Playwright — public 페이지)
- **Code quality (Task 15)**: Layer 1 + Layer 2

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — 검증 + 보안 수정):
├── Task 1: 환경 검증 + 테스트 기반라인 [quick]
├── Task 2: searchAll() visibility 필터 추가 (C-2) [quick]
├── Task 3: 홈/Stage/Learner 인라인 쿼리 visibility 필터 (C-4,C-5) [quick]
├── Task 4: mentions/recordLinks 쿼리 visibility 필터 (C-6) [quick]
└── Task 5: 응답/문장 생성 action draft 체크 (C-7,H-9) + getRecordBySlug defense-in-depth (C-1) [quick]

Wave 2 (After Wave 1 — 로직 수정):
├── Task 6: /me 페이지 draft 중복 해결 (H-1) [quick]
├── Task 7: 설정 defaultVisibility/defaultResponsePreference 글쓰기 연동 (H-2) [unspecified-high]
├── Task 8: 기록 편집 + note 생성 mention/recordLink 동기화 (H-5,H-8) [unspecified-high]
└── Task 9: 응답 visibility 사용자 선택 가능 (H-6) [quick]

Wave 3 (After Wave 2 — UI 갭 수정):
├── Task 10: Stage 상세 누락 섹션 추가 (M-1) [visual-engineering]
├── Task 11: Learner 상세 누락 섹션 추가 (M-2) [visual-engineering]
├── Task 12: Challenge/Collaboration 상세 누락 섹션 (M-3,M-4) [visual-engineering]
├── Task 13: Search sentences 탭 패널 렌더링 완성 (M-5) [visual-engineering]
├── Task 14: Record Detail breadcrumb + Guide FAQ (M-7,M-8) [visual-engineering]
└── Task 15: 미사용 컴포넌트 활용 + cohort 필터 패턴 통일 (M-9,L-1) [quick]

Wave FINAL (After ALL tasks — 독립 검증, 4 parallel):
├── Task F1: 플랜 준수 감사 (oracle)
├── Task F2: 코드 품질 리뷰 (unspecified-high)
├── Task F3: 실제 QA — Playwright (unspecified-high + playwright skill)
└── Task F4: 범위 충실도 확인 (deep)

Critical Path: Task 1 → Task 2-5 → Task 6-9 → Task 10-15 → F1-F4
Parallel Speedup: ~65% faster than sequential
Max Concurrent: 5 (Wave 1)
```

### Dependency Matrix

| Task | Depends On | Blocks |
|------|-----------|--------|
| 1 | — | 2,3,4,5 |
| 2 | 1 | 6,7,8,9 |
| 3 | 1 | 6,7,8,9 |
| 4 | 1 | 6,7,8,9 |
| 5 | 1 | 6,7,8,9 |
| 6 | 2-5 | 10-15 |
| 7 | 2-5 | 10-15 |
| 8 | 2-5 | 10-15 |
| 9 | 2-5 | 10-15 |
| 10 | 6-9 | F1-F4 |
| 11 | 6-9 | F1-F4 |
| 12 | 6-9 | F1-F4 |
| 13 | 6-9 | F1-F4 |
| 14 | 6-9 | F1-F4 |
| 15 | 6-9 | F1-F4 |
| F1-F4 | 10-15 | — |

### Agent Dispatch Summary

- **Wave 1**: 5 tasks — T1 `quick`, T2-T5 `quick`
- **Wave 2**: 4 tasks — T6 `quick`, T7-T8 `unspecified-high`, T9 `quick`
- **Wave 3**: 6 tasks — T10-T14 `visual-engineering`, T15 `quick`
- **FINAL**: 4 tasks — F1 `oracle`, F2 `unspecified-high`, F3 `unspecified-high` + `playwright`, F4 `deep`

---

## TODOs

- [x] 1. 환경 검증 + 테스트 기반라인 확립

  **What to do**:
  - `npm run typecheck`, `npm run test`, `npm run build` 실행하여 현재 상태 확인
  - 로컬 D1 초기화: `wrangler d1 migrations apply DB --local` 후 `wrangler d1 execute DB --local --file=seeds/seed.sql`
  - `wrangler d1 execute DB --local --command="SELECT cohort, COUNT(*) FROM records GROUP BY cohort"` 실행하여 records.cohort 인구 상태 확인
  - Playwright E2E 실행 가능 여부 확인: `npx playwright test` (실패 시 기록만)
  - 현재 테스트 커버리지 기록 (78개 테스트 기대)
  - **이후 모든 Playwright QA 시나리오는 이 Task에서 시드된 로컬 D1 데이터를 전제로 함**

  **Must NOT do**:
  - 코드 수정 없음 — 검증만 수행
  - schema.server.ts 변경 없음

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO (다른 모든 태스크의 전제)
  - **Blocks**: Tasks 2, 3, 4, 5
  - **Blocked By**: None

  **References**:
  - `package.json` — 빌드/테스트 스크립트 확인
  - `app/lib/__tests__/` — 기존 78개 테스트 위치
  - `seeds/seed.sql` — cohort 값 확인

  **Acceptance Criteria**:
  - [ ] `npm run typecheck` 통과 결과 기록
  - [ ] `npm run test` 결과 기록 (78개 테스트 통과 기대)
  - [ ] `npm run build` 성공 기록
  - [ ] records.cohort 인구 상태 기록 (NULL 여부 확인)

  **QA Scenarios**:
  ```
  Scenario: 빌드 시스템 정상 작동 확인
    Tool: Bash
    Steps:
      1. npm run typecheck 실행
      2. npm run test 실행
      3. npm run build 실행
    Expected Result: 모두 exit code 0
    Evidence: .sisyphus/evidence/task-1-baseline.txt
  ```

  **Commit**: NO (검증만)

- [x] 2. 검색 페이지 + searchAll() visibility 필터 추가 (C-2, C-3)

  **What to do**:
  - **핵심**: `app/routes/public/search.tsx:58` — questions 인라인 쿼리에 records JOIN + `sql\`${records.visibility} != 'draft'\`` 추가. 현재 `database.select().from(questions).where(like(questions.content, pattern)).limit(10)` → records와 innerJoin 후 visibility 필터 추가
  - **핵심**: `app/routes/public/search.tsx:64` — sentences 인라인 쿼리에 동일하게 records JOIN + visibility 필터 추가
  - **방어 심층**: `app/db/queries/search.server.ts:34-44` — searchAll() questions 쿼리에도 동일 수정 (현재 미사용이지만 defense-in-depth)
  - **방어 심층**: `app/db/queries/search.server.ts:61-71` — searchAll() sentences 쿼리에도 동일 수정
  - **주의**: search.tsx는 searchAll()을 호출하지 않고 직접 인라인 쿼리를 사용함. 실제 취약점은 search.tsx에 있음

  **Must NOT do**:
  - search.tsx의 records 검색(line 38-56)은 이미 `visibility != 'draft'` 적용 중 — 수정 금지
  - searchAll() 리팩토링 (route에서 호출하도록 변경)은 scope creep — 금지

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 3, 4, 5)
  - **Blocks**: Tasks 6-9
  - **Blocked By**: Task 1

  **References**:
  - `app/routes/public/search.tsx:38-56` — records 인라인 검색 (올바른 visibility 패턴 참고)
  - `app/routes/public/search.tsx:58` — **수정 대상 (핵심)**: questions 인라인 쿼리 (visibility 필터 없음)
  - `app/routes/public/search.tsx:64` — **수정 대상 (핵심)**: sentences 인라인 쿼리 (visibility 필터 없음)
  - `app/db/queries/search.server.ts:34-44` — 수정 대상 (방어 심층): searchAll questions
  - `app/db/queries/search.server.ts:61-71` — 수정 대상 (방어 심층): searchAll sentences
  - `app/db/schema.server.ts` — questions.recordId, sentences.recordId FK 확인

  **Acceptance Criteria**:
  - [ ] search.tsx:58 questions 인라인 쿼리에 records innerJoin + visibility 필터 추가됨
  - [ ] search.tsx:64 sentences 인라인 쿼리에 records innerJoin + visibility 필터 추가됨
  - [ ] search.server.ts questions/sentences에도 동일 필터 추가됨 (defense-in-depth)
  - [ ] `npm run typecheck` 통과

  **QA Scenarios**:
  ```
  Scenario: 검색 빌드 + 타입 체크
    Tool: Bash
    Steps:
      1. npm run typecheck
      2. npm run build
    Expected Result: exit code 0
    Evidence: .sisyphus/evidence/task-2-search-build.txt

  Scenario: 검색 기능 regression 테스트
    Tool: Bash
    Steps:
      1. npm run test
    Expected Result: ALL tests pass
    Evidence: .sisyphus/evidence/task-2-regression.txt

  Scenario: 검색 쿼리에서 draft 기록의 질문/문장 필터링 검증 (코드 레벨)
    Tool: Bash (grep + 코드 확인)
    Steps:
      1. grep -n "visibility.*draft\|innerJoin.*records" app/routes/public/search.tsx
      2. assert: search.tsx:58 부근의 questions 쿼리에 records innerJoin + visibility 필터가 존재
      3. assert: search.tsx:64 부근의 sentences 쿼리에 records innerJoin + visibility 필터가 존재
      4. grep -n "visibility.*draft" app/db/queries/search.server.ts
      5. assert: searchAll 함수의 questions/sentences 쿼리에도 동일 필터 존재
    Expected Result: 4개 쿼리 모두에 visibility != 'draft' 필터가 코드에 존재
    Failure Indicators: 해당 필터가 코드에서 발견되지 않음
    Evidence: .sisyphus/evidence/task-2-search-visibility-code-verify.txt
  ```

  **Commit**: YES (groups with 3, 4)
  - Message: `fix(security): add visibility filters to search, home, stage, learner, mentions, recordLinks queries`
  - Files: `app/routes/public/search.tsx`, `app/db/queries/search.server.ts`

- [x] 3. 홈/Stage/Learner 인라인 쿼리 visibility 필터 추가 (C-4, C-5)

  **What to do**:
  - `app/routes/public/index.tsx:65-79` — sentences 쿼리에 `.where(sql\`${records.visibility} != 'draft'\`)` 조건 추가 (records와 leftJoin 후)
  - `app/routes/public/journey/$stageSlug.tsx:55` — questions 쿼리에 `sql\`${records.visibility} != 'draft'\`` 추가
  - `app/routes/public/learners/$learnerSlug.tsx:31-33` — questions 쿼리에 `sql\`${records.visibility} != 'draft'\`` 추가
  - `app/routes/public/learners/$learnerSlug.tsx:34` — sentences 쿼리에 records JOIN + visibility 필터 추가

  **Must NOT do**:
  - index.tsx의 records 쿼리(line 45)와 questions 쿼리(line 62)는 이미 올바르게 필터링 — 수정 금지
  - $stageSlug.tsx의 records 쿼리(line 44)는 이미 올바르게 필터링 — 수정 금지

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 4, 5)
  - **Blocks**: Tasks 6-9
  - **Blocked By**: Task 1

  **References**:
  - `app/routes/public/index.tsx:45` — records 쿼리의 올바른 visibility 패턴
  - `app/routes/public/index.tsx:62` — questions 쿼리의 올바른 visibility 패턴
  - `app/routes/public/index.tsx:65-79` — 수정 대상: sentences 쿼리
  - `app/routes/public/journey/$stageSlug.tsx:44` — records 쿼리의 올바른 패턴
  - `app/routes/public/journey/$stageSlug.tsx:55` — 수정 대상: questions 쿼리
  - `app/routes/public/learners/$learnerSlug.tsx:30` — records 쿼리의 올바른 패턴
  - `app/routes/public/learners/$learnerSlug.tsx:31-34` — 수정 대상: questions/sentences 쿼리

  **Acceptance Criteria**:
  - [ ] 홈 sentences 쿼리에 `records.visibility != 'draft'` 필터 추가됨
  - [ ] Stage 상세 questions 쿼리에 visibility 필터 추가됨
  - [ ] Learner 상세 questions/sentences 쿼리에 visibility 필터 추가됨
  - [ ] `npm run typecheck` 통과
  - [ ] `npm run build` 성공

  **QA Scenarios**:
  ```
  Scenario: 빌드 정상 + 타입 체크 통과
    Tool: Bash
    Steps:
      1. npm run typecheck
      2. npm run build
    Expected Result: exit code 0
    Evidence: .sisyphus/evidence/task-3-build.txt
  ```

  **Commit**: YES (groups with 2, 4)
  - Files: `app/routes/public/index.tsx`, `app/routes/public/journey/$stageSlug.tsx`, `app/routes/public/learners/$learnerSlug.tsx`

- [x] 4. mentions/recordLinks 쿼리 visibility 필터 추가 (C-6)

  **What to do**:
  - `app/db/queries/mentions.server.ts:50-65` — `getMentionsOfUser()` 에 records JOIN + `sql\`${records.visibility} != 'draft'\`` 추가
  - `app/db/queries/recordLinks.server.ts:26-49` — `getRecordLinksByRecord()` 에 linked record visibility 체크 추가
  - `app/db/queries/recordLinks.server.ts:51-66` — `getIncomingLinks()` 에 source record visibility 체크 추가

  **Must NOT do**:
  - `syncMentionsForRecord()` (write 전용) 수정 금지
  - `syncRecordLinksForRecord()` (write 전용) 수정 금지
  - `records.server.ts`의 `getLinkedRecords()` (line 186-274)는 이미 visibility 체크 있음 — 수정 불필요

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3, 5)
  - **Blocks**: Tasks 6-9
  - **Blocked By**: Task 1

  **References**:
  - `app/db/queries/mentions.server.ts:50-66` — 수정 대상: getMentionsOfUser
  - `app/db/queries/recordLinks.server.ts:26-49` — 수정 대상: getRecordLinksByRecord
  - `app/db/queries/recordLinks.server.ts:51-66` — 수정 대상: getIncomingLinks
  - `app/db/queries/records.server.ts:216,255` — 올바른 visibility 패턴 참고 (getLinkedRecords)

  **Acceptance Criteria**:
  - [ ] getMentionsOfUser에 visibility 필터 추가됨
  - [ ] getRecordLinksByRecord에 visibility 필터 추가됨
  - [ ] getIncomingLinks에 visibility 필터 추가됨
  - [ ] `npm run typecheck` 통과

  **QA Scenarios**:
  ```
  Scenario: 타입 체크 + 기존 테스트 패스
    Tool: Bash
    Steps:
      1. npm run typecheck
      2. npm run test
    Expected Result: exit code 0
    Evidence: .sisyphus/evidence/task-4-mentions-links.txt
  ```

  **Commit**: YES (groups with 2, 3)

- [x] 5. 응답/문장 생성 action draft 체크 + getRecordBySlug defense-in-depth (C-1, C-7, H-9)

  **What to do**:
  - `app/routes/public/logs/$recordSlug.tsx` response creation action (line ~152-167):
    - responsePreference 확인 직전에 `if (record.visibility === "draft" && record.authorId !== auth.user.id)` 체크 추가
  - `app/routes/public/logs/$recordSlug.tsx` save_sentence action (line ~194-212):
    - sentence 저장 전에 대상 record의 visibility 확인 (draft이고 본인 아니면 거부)
  - `app/db/queries/records.server.ts:63-81` getRecordBySlug():
    - 선택적 `currentUserId` 파라미터 추가. 제공 시 draft 기록은 작성자만 반환 (defense-in-depth)
    - 또는: 쿼리 레벨은 그대로 두고 caller 의존 (이미 $recordSlug.tsx:61-64에서 체크)
    - **권장**: 쿼리 레벨에서도 체크하되, 호출자 인터페이스 변경 최소화

  **Must NOT do**:
  - self_answer action은 이미 `records.authorId === auth.user.id` 확인 중 — 수정 불필요
  - 기존 $recordSlug.tsx:61-64의 draft 체크 제거 금지 (defense-in-depth)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3, 4)
  - **Blocks**: Tasks 6-9
  - **Blocked By**: Task 1

  **References**:
  - `app/routes/public/logs/$recordSlug.tsx:61-64` — 기존 draft 체크 (loader)
  - `app/routes/public/logs/$recordSlug.tsx:152-167` — 수정 대상: response creation
  - `app/routes/public/logs/$recordSlug.tsx:194-212` — 수정 대상: save_sentence
  - `app/routes/public/logs/$recordSlug.tsx:237-239` — self_answer (이미 올바름, 참고)
  - `app/db/queries/records.server.ts:63-81` — 수정 대상: getRecordBySlug

  **Acceptance Criteria**:
  - [ ] 비작성자가 draft 기록에 response 생성 시 에러 반환
  - [ ] 비작성자가 draft 기록에 sentence 저장 시 에러 반환
  - [ ] getRecordBySlug에 defense-in-depth visibility 로직 추가됨
  - [ ] `npm run typecheck` 통과

  **QA Scenarios**:
  ```
  Scenario: 타입 체크 + 빌드 통과
    Tool: Bash
    Steps:
      1. npm run typecheck
      2. npm run build
    Expected Result: exit code 0
    Evidence: .sisyphus/evidence/task-5-build.txt

  Scenario: draft 기록에 대한 응답 생성 거부 로직 존재 검증 (코드 레벨)
    Tool: Bash (grep)
    Steps:
      1. grep -n "visibility.*draft\|draft.*visibility" app/routes/public/logs/\$recordSlug.tsx
      2. assert: response creation action (create_response intent 부근)에 draft visibility 체크 코드 존재
      3. assert: save_sentence action (save_sentence intent 부근)에 draft visibility 체크 코드 존재
      4. grep -n "visibility.*draft" app/db/queries/records.server.ts | grep -i "getRecordBySlug"
      5. assert: getRecordBySlug에 defense-in-depth 필터 존재
    Expected Result: 3곳 모두에 draft 체크 코드가 존재
    Failure Indicators: grep 결과 미발견
    Evidence: .sisyphus/evidence/task-5-draft-guard-code.txt
  ```

  **Commit**: YES
  - Message: `fix(security): add draft-record guards to response/sentence actions + defense-in-depth on getRecordBySlug`

- [x] 6. /me 페이지 draft 중복 표시 해결 (H-1)

  **What to do**:
  - `app/routes/public/me.tsx:83` — myRecordsWithStage 쿼리에 `ne(records.visibility, "draft")` 필터 추가. "나의 여정" 섹션에서 draft 제외
  - 결과: draft는 "임시저장" 섹션(line 35-41)에서만 표시, "나의 여정"에서는 published만 표시
  - stage별 record count(line ~187)가 정확해짐 (draft 미포함)

  **Must NOT do**:
  - "임시저장" 섹션 쿼리(line 35-41)는 수정하지 않음 — draft 전용 조회로 올바름
  - myQuestions/unansweredQuestions 쿼리는 본인 기록 대상이므로 visibility 필터 불필요

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 7, 8, 9)
  - **Blocks**: Tasks 10-15
  - **Blocked By**: Tasks 2-5

  **References**:
  - `app/routes/public/me.tsx:35-41` — drafts 전용 쿼리 (올바름, 참고)
  - `app/routes/public/me.tsx:73-84` — 수정 대상: myRecordsWithStage 쿼리
  - `app/routes/public/me.tsx:93-99` — recordsByStage 그룹핑 로직 (수정 불필요)
  - `app/routes/public/me.tsx:186-188` — record count 표시 (자동으로 정확해짐)
  - `app/routes/public/me.tsx:205-207` — draft badge 렌더링 (제거 필요 — draft가 여정 섹션에 안 나오므로)

  **Acceptance Criteria**:
  - [ ] myRecordsWithStage 쿼리에 `ne(records.visibility, "draft")` 추가됨
  - [ ] "나의 여정" 섹션에 draft 기록 미표시
  - [ ] "임시저장" 섹션에만 draft 기록 표시
  - [ ] stage별 "N개의 기록" 카운트에 draft 미포함
  - [ ] `npm run typecheck` 통과

  **QA Scenarios**:
  ```
  Scenario: /me 페이지 빌드 정상
    Tool: Bash
    Steps:
      1. npm run typecheck
      2. npm run build
    Expected Result: exit code 0
    Evidence: .sisyphus/evidence/task-6-build.txt

  Scenario: /me myRecordsWithStage 쿼리에서 draft 제외 검증 (코드 레벨)
    Tool: Bash (grep)
    Steps:
      1. grep -n "myRecordsWithStage\|visibility.*draft\|ne.*visibility" app/routes/public/me.tsx
      2. assert: myRecordsWithStage 쿼리 (line ~83 부근)에 visibility != "draft" 필터가 추가됨
      3. assert: 기존 drafts 전용 쿼리 (line ~39)는 여전히 eq(records.visibility, "draft") 유지
    Expected Result: 두 쿼리가 분리됨 — 여정용은 draft 제외, 임시저장용은 draft만
    Failure Indicators: myRecordsWithStage 쿼리에 visibility 필터 없음
    Evidence: .sisyphus/evidence/task-6-me-query-verify.txt
  ```

  **Commit**: YES
  - Message: `fix(me): exclude drafts from journey section to prevent duplicate display`
  - Files: `app/routes/public/me.tsx`

- [x] 7. 설정 defaultVisibility/defaultResponsePreference 글쓰기 연동 (H-2)

  **What to do**:
  - `app/routes/public/write/note.tsx` loader:
    - `requireVerified` 후 `auth.user.id`로 learnerProfile 조회 추가
    - return에 `learnerDefaults: { defaultVisibility, defaultResponsePreference }` 추가
  - `app/routes/public/write/note.tsx` action:
    - `formData.get("visibility") || "cohort"` → `formData.get("visibility") || learner.defaultVisibility || "cohort"` 로 변경
    - `responsePreference: "open"` → `formData.get("responsePreference") || learner.defaultResponsePreference || "open"` 로 변경
  - `app/routes/public/write/note.tsx` component:
    - visibility select의 `defaultValue`를 `loaderData.learnerDefaults.defaultVisibility`로 변경
  - `app/routes/public/write/article.tsx` — 동일 변경 적용
  - Note: rhythm은 이번 스코프에서 하드코딩 유지 (UI 컨트롤 추가는 별도 플랜)

  **Must NOT do**:
  - rhythm 선택기 UI 추가 금지 (별도 플랜)
  - template 선택기 UI 추가 금지
  - collaboration unit 선택기 추가 금지
  - auth.server.ts / auth.middleware.ts 수정 금지

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 6, 8, 9)
  - **Blocks**: Tasks 10-15
  - **Blocked By**: Tasks 2-5

  **References**:
  - `app/routes/public/write/note.tsx:20-36` — 수정 대상: loader (learnerProfile 조회 추가)
  - `app/routes/public/write/note.tsx:47` — 수정 대상: visibility 기본값
  - `app/routes/public/write/note.tsx:78-80` — 수정 대상: rhythm/responsePreference 하드코딩
  - `app/routes/public/write/article.tsx:22-36` — 수정 대상: loader
  - `app/routes/public/write/article.tsx:56` — 수정 대상: visibility 기본값
  - `app/routes/public/write/article.tsx:84-86` — 수정 대상: rhythm/responsePreference 하드코딩
  - `app/routes/public/settings.tsx:47-55` — 설정 저장 로직 (참고: defaultVisibility/defaultResponsePreference 필드)
  - `app/db/schema.server.ts:19-20` — learnerProfiles.defaultVisibility, defaultResponsePreference 스키마

  **Acceptance Criteria**:
  - [ ] note/article loader가 learnerProfile의 defaultVisibility, defaultResponsePreference 반환
  - [ ] visibility select의 defaultValue가 사용자 설정 반영
  - [ ] action에서 formData 없을 시 사용자 설정 fallback
  - [ ] defaultVisibility="public"인 사용자가 note 생성 시 record.visibility가 "public"
  - [ ] `npm run typecheck` 통과

  **QA Scenarios**:
  ```
  Scenario: 글쓰기 페이지 빌드 + 타입 체크
    Tool: Bash
    Steps:
      1. npm run typecheck
      2. npm run build
    Expected Result: exit code 0
    Evidence: .sisyphus/evidence/task-7-build.txt

  Scenario: 글쓰기 loader에서 learnerProfile 기본값 조회 검증 (코드 레벨)
    Tool: Bash (grep)
    Steps:
      1. grep -n "defaultVisibility\|defaultResponsePreference\|learnerProfiles" app/routes/public/write/note.tsx
      2. assert: loader에서 learnerProfiles 조회 코드 존재
      3. assert: return 값에 defaultVisibility/defaultResponsePreference 포함
      4. grep -n "defaultVisibility\|defaultResponsePreference\|learnerProfiles" app/routes/public/write/article.tsx
      5. assert: 동일하게 loader에서 learnerProfile 조회
      6. grep -n 'formData.get.*visibility.*||.*default\|learner.*defaultVisibility' app/routes/public/write/note.tsx
      7. assert: action에서 formData fallback이 사용자 설정값 사용
    Expected Result: loader가 learnerProfile 기본값을 반환하고 action이 이를 fallback으로 사용
    Failure Indicators: learnerProfiles import/조회 없음, 하드코딩 "cohort" 잔존
    Evidence: .sisyphus/evidence/task-7-settings-code-verify.txt
  ```

  **Commit**: YES
  - Message: `fix(write): respect user settings for default visibility and responsePreference`
  - Files: `app/routes/public/write/note.tsx`, `app/routes/public/write/article.tsx`

- [x] 8. 기록 편집 + note 생성 mention/recordLink 동기화 (H-5, H-8)

  **What to do**:
  - `app/routes/public/logs/$recordSlug.edit.tsx` action (line ~117 이후):
    - article format인 경우 `extractUserMentions()`으로 멘션 추출 → `syncMentionsForRecord()` 호출
    - article format인 경우 `extractRecordRefs()`로 링크 추출 → `syncRecordLinksForRecord()` 호출
    - 필요한 import 추가: `syncMentionsForRecord`, `syncRecordLinksForRecord`, `extractUserMentions`, `extractRecordRefs`
  - `app/routes/public/write/note.tsx` action (line ~86 이후):
    - note 내용에서 @mention 패턴이 있으면 `syncMentionsForRecord()` 호출
    - 알림 생성 (article.tsx:115-126 패턴 복사)
  - 기존 `article.tsx:94-132`의 mention/link 동기화 패턴을 정확히 따름

  **Must NOT do**:
  - article 생성 로직(article.tsx) 수정 금지 — 이미 올바르게 동작
  - 알림 시스템 확장 금지 (기존 mention 알림 패턴만 복사)
  - 공유 유틸리티 함수로 리팩토링 금지 (scope creep)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 6, 7, 9)
  - **Blocks**: Tasks 10-15
  - **Blocked By**: Tasks 2-5

  **References**:
  - `app/routes/public/write/article.tsx:94-132` — 올바른 mention/link 동기화 패턴 (복사 대상)
  - `app/routes/public/logs/$recordSlug.edit.tsx:64-158` — 수정 대상: edit action
  - `app/routes/public/write/note.tsx:69-86` — 수정 대상: note 생성 action
  - `app/db/queries/mentions.server.ts:6-33` — syncMentionsForRecord 함수
  - `app/db/queries/recordLinks.server.ts:6-24` — syncRecordLinksForRecord 함수
  - `app/lib/extract-references.server.ts` — extractUserMentions, extractRecordRefs 함수 위치 (article.tsx에서 import하는 패턴 확인: `app/routes/public/write/article.tsx` 상단 import문 참조)

  **Acceptance Criteria**:
  - [ ] article 편집 후 새로 추가된 @mention이 mentions 테이블에 반영됨
  - [ ] article 편집 후 삭제된 @mention이 mentions 테이블에서 제거됨
  - [ ] article 편집 후 새로 추가된 [[record-ref]]가 record_links 테이블에 반영됨
  - [ ] note 생성 시 @mention이 있으면 mentions 테이블 + notifications 생성
  - [ ] `npm run typecheck` 통과

  **QA Scenarios**:
  ```
  Scenario: 편집/생성 빌드 정상
    Tool: Bash
    Steps:
      1. npm run typecheck
      2. npm run build
    Expected Result: exit code 0
    Evidence: .sisyphus/evidence/task-8-build.txt

  Scenario: 편집 action의 mention/link 동기화 코드 존재 검증 (코드 레벨)
    Tool: Bash (grep)
    Steps:
      1. grep -n "syncMentionsForRecord\|syncRecordLinksForRecord" app/routes/public/logs/\$recordSlug.edit.tsx
      2. assert: syncMentionsForRecord 호출이 edit action 내에 존재
      3. assert: syncRecordLinksForRecord 호출이 edit action 내에 존재
      4. grep -n "syncMentionsForRecord\|extractUserMentions" app/routes/public/write/note.tsx
      5. assert: note 생성 action 내에 mention 관련 코드 존재
    Expected Result: edit action과 note action 모두에 mention/link 동기화 코드가 존재
    Failure Indicators: grep 결과가 비어있음 (해당 함수 호출 없음)
    Evidence: .sisyphus/evidence/task-8-sync-code-verify.txt
  ```

  **Commit**: YES
  - Message: `fix(edit): sync mentions and record links on article edit + add mention sync to note`
  - Files: `app/routes/public/logs/$recordSlug.edit.tsx`, `app/routes/public/write/note.tsx`

- [x] 9. 응답 visibility 사용자 선택 가능 (H-6)

  **What to do**:
  - `app/routes/public/logs/$recordSlug.tsx` response creation:
    - line ~145: `visibility: "cohort"` → `visibility: parsed.data.visibility ?? "cohort"` 로 변경
    - line ~179: 동일 변경
  - `app/lib/validation.ts` createResponseSchema:
    - `visibility: z.enum(["cohort", "public"]).default("cohort")` 필드 추가
  - `app/routes/public/logs/$recordSlug.tsx` response form UI:
    - visibility 선택 dropdown 추가 (cohort/public, 기본값 cohort)
    - "draft" 응답은 허용하지 않음 (응답은 즉시 게시)

  **Must NOT do**:
  - 응답에 "draft" visibility 옵션 추가 금지
  - 응답 편집/삭제 기능 추가 금지
  - 기존 응답의 visibility 일괄 변경 금지

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 6, 7, 8)
  - **Blocks**: Tasks 10-15
  - **Blocked By**: Tasks 2-5

  **References**:
  - `app/routes/public/logs/$recordSlug.tsx:139-192` — 수정 대상: response creation action
  - `app/routes/public/logs/$recordSlug.tsx:638-670` — 수정 대상: response form UI
  - `app/lib/validation.ts:12` — createRecordSchema의 visibility 패턴 참고
  - `app/components/ResponseCard.tsx` — 응답 표시 컴포넌트 (visibility badge 추가 가능)

  **Acceptance Criteria**:
  - [ ] response form에 visibility 선택 dropdown 표시
  - [ ] 사용자가 "public" 선택 시 response.visibility = "public"으로 저장
  - [ ] 기본값은 "cohort" 유지
  - [ ] Zod 검증에 visibility 필드 포함
  - [ ] `npm run typecheck` 통과

  **QA Scenarios**:
  ```
  Scenario: 응답 생성 빌드 정상
    Tool: Bash
    Steps:
      1. npm run typecheck
      2. npm run build
    Expected Result: exit code 0
    Evidence: .sisyphus/evidence/task-9-build.txt

  Scenario: 응답 폼에 visibility 필드 + validation 스키마 검증 (코드 레벨)
    Tool: Bash (grep)
    Steps:
      1. grep -n "visibility" app/lib/validation.ts | grep -i "response"
      2. assert: createResponseSchema에 visibility 필드 존재 (z.enum(["cohort", "public"]))
      3. grep -n 'visibility.*cohort\|parsed.data.visibility' app/routes/public/logs/\$recordSlug.tsx
      4. assert: response insert에서 `parsed.data.visibility` 사용 (하드코딩 "cohort" 아님)
      5. grep -n 'name="visibility"\|id="visibility"' app/routes/public/logs/\$recordSlug.tsx
      6. assert: response form UI에 visibility select 요소 존재
    Expected Result: validation에 visibility 필드, action에서 동적 사용, UI에 select 존재
    Failure Indicators: 하드코딩 "cohort" 잔존 또는 UI select 미존재
    Evidence: .sisyphus/evidence/task-9-response-vis-code.txt
  ```

  **Commit**: YES
  - Message: `fix(response): allow user-selected response visibility`
  - Files: `app/routes/public/logs/$recordSlug.tsx`, `app/lib/validation.ts`

- [x] 10. Stage 상세 누락 섹션 추가 (M-1)

  **What to do**:
  - `app/routes/public/journey/$stageSlug.tsx`:
    - loader에 collectiveMemory 쿼리 추가: `database.select().from(collectiveMemories).where(and(eq(collectiveMemories.stageId, stage.id), eq(collectiveMemories.status, "published"))).limit(1)`
    - 컴포넌트에 "Collective Memory" 링크 섹션 추가 (published된 Memory가 있을 때만 표시)
    - `/memories/${stage.slug}`로 연결하는 CTA 카드
  - Quiet Check-in Summary는 FRD에서 "서술형만" 명시 → 현재 check-in 데이터가 없으므로 SKIP (의도적 미구현)

  **Must NOT do**:
  - 새 컴포넌트 파일 생성 금지 (인라인 섹션으로 구현)
  - 기존 Hero/Records/Questions/Collaboration 섹션 수정 금지
  - 스타일 재디자인 금지

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 11-15)
  - **Blocks**: F1-F4
  - **Blocked By**: Tasks 6-9

  **References**:
  - `app/routes/public/journey/$stageSlug.tsx` — 수정 대상
  - `app/routes/public/memories/$stageSlug.tsx` — Collective Memory 페이지 (링크 대상)
  - `app/db/schema.server.ts` — collectiveMemories 테이블 스키마
  - `.docs/wireframe.md` — Stage 상세 와이어프레임 (Carry Forward/Collective Memory 섹션)
  - `.docs/design.md` — Quiet Depth 디자인 가이드라인 (카드 스타일, 간격)

  **Acceptance Criteria**:
  - [ ] published Collective Memory가 있는 stage에서 Memory 링크 섹션 표시
  - [ ] Memory 없는 stage에서 해당 섹션 미표시
  - [ ] 링크 클릭 시 `/memories/{stageSlug}`로 이동
  - [ ] `npm run typecheck` 통과

  **QA Scenarios**:
  ```
  Scenario: Stage 상세 빌드 정상
    Tool: Bash
    Steps:
      1. npm run typecheck && npm run build
    Expected Result: exit code 0
    Evidence: .sisyphus/evidence/task-10-stage-build.txt

  Scenario: published Memory가 있는 Stage에서 Memory 링크 표시
    Tool: Playwright (playwright skill)
    Preconditions: seed 데이터 적용 (bridge-1 stage에 published memory 존재 — seeds/seed.sql:272)
    Steps:
      1. navigate to /journey/bridge-1
      2. scroll to bottom sections
      3. assert: text "Collective Memory" 또는 "기억 아카이브" 링크 섹션 존재
      4. assert: link href contains "/memories/bridge-1"
      5. screenshot 캡처
    Expected Result: Memory 링크 섹션이 존재하고 올바른 URL로 연결
    Failure Indicators: Memory 링크 섹션이 렌더링되지 않거나 href 누락
    Evidence: .sisyphus/evidence/task-10-stage-memory-link.png
  ```

  **Commit**: YES (groups with 11, 12)
  - Message: `feat(ui): add missing wireframe sections to stage, learner, challenge, collaboration pages`

- [x] 11. Learner 상세 누락 섹션 추가 (M-2)

  **What to do**:
  - `app/routes/public/learners/$learnerSlug.tsx`:
    - loader에 stage별 기록 그룹핑 쿼리 추가 (records LEFT JOIN stages, GROUP BY stageId)
    - loader에 collaboration units 쿼리 추가 (collaborationUnits WHERE member includes learner)
    - 컴포넌트에 "기록 아카이브" 섹션 추가: stage별로 기록 count 표시, 각 stage 클릭 시 해당 기록 목록
    - 컴포넌트에 "협업 이력" 섹션 추가: 참여한 Collaboration Unit 카드 표시

  **Must NOT do**:
  - 기존 Questions/Records/Sentences 섹션 재배치 금지
  - LearnerCard 컴포넌트 props 변경 금지

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 10, 12-15)
  - **Blocks**: F1-F4
  - **Blocked By**: Tasks 6-9

  **References**:
  - `app/routes/public/learners/$learnerSlug.tsx` — 수정 대상
  - `app/routes/public/me.tsx:73-99` — stage별 기록 그룹핑 패턴 (복사 가능)
  - `app/db/schema.server.ts` — collaborationUnits, collaborationMembers 스키마
  - `app/components/CollaborationUnitCard.tsx` — 협업 유닛 카드 (재사용)
  - `.docs/wireframe.md` — Learner 상세 와이어프레임 (Record Archive, Collaboration Traces)

  **Acceptance Criteria**:
  - [ ] "기록 아카이브" 섹션에 stage별 기록 count 표시
  - [ ] "협업 이력" 섹션에 참여 CollaborationUnit 카드 표시
  - [ ] 협업이 없는 learner는 해당 섹션 미표시 또는 EmptyState
  - [ ] `npm run typecheck` 통과

  **QA Scenarios**:
  ```
  Scenario: Learner 상세 빌드 정상
    Tool: Bash
    Steps:
      1. npm run typecheck && npm run build
    Expected Result: exit code 0
    Evidence: .sisyphus/evidence/task-11-learner-build.txt

  Scenario: Learner 상세에 기록 아카이브 + 협업 이력 섹션 존재
    Tool: Playwright (playwright skill)
    Preconditions: seed 데이터 적용 (learner-hana — seeds/seed.sql:60, collaboration unit 참여)
    Steps:
      1. navigate to /learners/learner-hana
      2. scroll to "기록 아카이브" 섹션
      3. assert: stage별 기록 count가 표시됨 (예: "Challenge 1 · 5개의 기록")
      4. scroll to "협업 이력" 섹션
      5. assert: CollaborationUnitCard 또는 EmptyState 존재
      6. screenshot 캡처
    Expected Result: 아카이브/협업 섹션이 올바르게 렌더링
    Failure Indicators: 해당 섹션이 존재하지 않거나 데이터 로드 실패
    Evidence: .sisyphus/evidence/task-11-learner-sections.png
  ```

  **Commit**: YES (groups with 10, 12)

- [x] 12. Challenge/Collaboration 상세 누락 섹션 (M-3, M-4)

  **What to do**:
  - `app/routes/public/challenges/$challengeSlug.tsx`:
    - "전환점(Turning Points)" 섹션은 현재 데이터 모델에 해당 테이블 없음 → EmptyState placeholder로 추가 ("아직 기록된 전환점이 없습니다")
    - "회고(Retrospective)" 섹션도 동일하게 placeholder 추가
  - `app/routes/public/groups/$groupSlug.tsx`:
    - 동일하게 "전환점" + "회고" placeholder 섹션 추가

  **Must NOT do**:
  - 새 DB 테이블 생성 금지
  - 기존 Hero/Records/Collaboration 섹션 수정 금지

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 10, 11, 13-15)
  - **Blocks**: F1-F4
  - **Blocked By**: Tasks 6-9

  **References**:
  - `app/routes/public/challenges/$challengeSlug.tsx` — 수정 대상
  - `app/routes/public/groups/$groupSlug.tsx` — 수정 대상
  - `app/components/EmptyState.tsx` — 빈 상태 컴포넌트 (재사용)
  - `.docs/wireframe.md` — Challenge/Collaboration 와이어프레임

  **Acceptance Criteria**:
  - [ ] Challenge 상세에 "전환점" placeholder 섹션 존재
  - [ ] Challenge 상세에 "회고" placeholder 섹션 존재
  - [ ] Collaboration Unit 상세에 동일 섹션 존재
  - [ ] `npm run typecheck` 통과

  **QA Scenarios**:
  ```
  Scenario: Challenge/Collab 빌드 정상
    Tool: Bash
    Steps:
      1. npm run typecheck && npm run build
    Expected Result: exit code 0
    Evidence: .sisyphus/evidence/task-12-build.txt

  Scenario: Challenge 상세에 전환점/회고 placeholder 존재
    Tool: Playwright (playwright skill)
    Preconditions: seed 데이터 적용 (team-challenge — seeds/seed.sql:79)
    Steps:
      1. navigate to /challenges/team-challenge
      2. scroll to bottom
      3. assert: "전환점" 섹션 존재 (EmptyState 포함 가능)
      4. assert: "회고" 섹션 존재 (EmptyState 포함 가능)
      5. screenshot 캡처
    Expected Result: 두 placeholder 섹션 모두 렌더링
    Failure Indicators: 섹션 미존재
    Evidence: .sisyphus/evidence/task-12-challenge-sections.png

  Scenario: Collaboration Unit 상세에 동일 placeholder 존재
    Tool: Playwright (playwright skill)
    Preconditions: seed 데이터 적용 (collab-alpha — seeds/seed.sql:101)
    Steps:
      1. navigate to /groups/collab-alpha
      2. scroll to bottom
      3. assert: "전환점" + "회고" 섹션 존재
      4. screenshot 캡처
    Expected Result: 두 placeholder 섹션 모두 렌더링
    Evidence: .sisyphus/evidence/task-12-collab-sections.png
  ```

  **Commit**: YES (groups with 10, 11)

- [x] 13. Search sentences 탭 패널 렌더링 완성 (M-5)

  **What to do**:
  - `app/routes/public/search.tsx`:
    - **참고**: sentences 탭 라벨은 이미 존재 (line ~135). 핵심 작업은 탭 패널의 렌더링 컴포넌트 추가
    - sentences 탭 선택 시 HighlightedSentenceCard로 렌더링하는 패널 추가
    - loader의 foundSentences는 이미 존재 (line 64) — UI 패널만 추가하면 됨

  **Must NOT do**:
  - 검색 쿼리 로직 변경 금지 (Task 2에서 이미 visibility 수정)
  - 기존 records/questions/learners 탭 수정 금지

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 10-12, 14-15)
  - **Blocks**: F1-F4
  - **Blocked By**: Tasks 6-9

  **References**:
  - `app/routes/public/search.tsx:135-155` — 기존 탭 구현 (패턴 복사)
  - `app/routes/public/search.tsx:64` — foundSentences 데이터 (이미 로드됨)
  - `app/components/HighlightedSentenceCard.tsx` — 문장 카드 컴포넌트

  **Acceptance Criteria**:
  - [ ] search 페이지에 "문장" 탭 표시
  - [ ] 검색 시 문장 결과가 HighlightedSentenceCard로 표시
  - [ ] 결과 없을 시 EmptyState 표시
  - [ ] `npm run typecheck` 통과

  **QA Scenarios**:
  ```
  Scenario: Search 빌드 정상
    Tool: Bash
    Steps:
      1. npm run typecheck && npm run build
    Expected Result: exit code 0
    Evidence: .sisyphus/evidence/task-13-search-build.txt

  Scenario: 검색 페이지에 문장 탭 존재 + 결과 렌더링
    Tool: Playwright (playwright skill)
    Preconditions: seed 데이터 적용 (sentences 12개 존재)
    Steps:
      1. navigate to /search?q=물&tab=sentences
      2. assert: "문장" 탭이 활성화됨 (aria-selected="true" 또는 active class)
      3. assert: HighlightedSentenceCard 최소 1개 렌더링 OR EmptyState 표시
      4. screenshot 캡처
    Expected Result: 문장 탭 존재하고 결과 또는 빈 상태 표시
    Failure Indicators: 탭 자체가 없거나 에러 페이지
    Evidence: .sisyphus/evidence/task-13-search-sentences-tab.png
  ```

  **Commit**: YES (groups with 14)
  - Message: `feat(ui): add search sentences tab, record breadcrumb, guide FAQ`

- [x] 14. Record Detail breadcrumb + Guide FAQ (M-7, M-8)

  **What to do**:
  - `app/routes/public/logs/$recordSlug.tsx` 컴포넌트:
    - 상단에 간단한 breadcrumb 추가: 기록 > {stage.name} > {record.title}
    - `<nav aria-label="breadcrumb">` 접근성 준수
    - 스타일: `text-sm text-text-tertiary` + 링크는 hover 시 구분
  - `app/routes/public/guide.tsx`:
    - FAQ 섹션 추가 (하드코딩 Q&A 5-7개)
    - 질문: "기록이란?", "응답 유형은?", "Visibility란?", "협업은 어떻게?", "설정은 어디서?"
    - `.docs/operational-principles.md`와 `.docs/glossary.md` 참조하여 답변 작성

  **Must NOT do**:
  - Record Detail의 기존 content/questions/responses 섹션 수정 금지
  - Guide 기존 섹션 수정 금지

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 10-13, 15)
  - **Blocks**: F1-F4
  - **Blocked By**: Tasks 6-9

  **References**:
  - `app/routes/public/logs/$recordSlug.tsx` — 수정 대상 (breadcrumb)
  - `app/routes/public/guide.tsx` — 수정 대상 (FAQ)
  - `.docs/operational-principles.md` — 운영 원칙 (FAQ 답변 참고)
  - `.docs/glossary.md` — 용어집 (FAQ 답변 참고)
  - `.docs/design.md` — Quiet Depth 접근성 가이드 (breadcrumb 스타일)

  **Acceptance Criteria**:
  - [ ] Record Detail에 breadcrumb nav 표시 (aria-label 포함)
  - [ ] Guide에 FAQ 섹션 최소 5개 Q&A 포함
  - [ ] FAQ 내용이 한국어이고 운영 원칙에 부합
  - [ ] `npm run typecheck` 통과

  **QA Scenarios**:
  ```
  Scenario: Record/Guide 빌드 정상
    Tool: Bash
    Steps:
      1. npm run typecheck && npm run build
    Expected Result: exit code 0
    Evidence: .sisyphus/evidence/task-14-build.txt

  Scenario: Record Detail에 breadcrumb 네비게이션 존재
    Tool: Playwright (playwright skill)
    Preconditions: seed 데이터 적용
    Steps:
      1. navigate to /logs/first-note (seed의 첫 번째 기록 — seeds/seed.sql:130)
      2. assert: nav[aria-label="breadcrumb"] 요소 존재
      3. assert: breadcrumb 내에 "기록" 또는 stage 이름 링크 존재
      4. screenshot 캡처
    Expected Result: breadcrumb nav가 상단에 렌더링
    Failure Indicators: nav[aria-label="breadcrumb"] 미존재
    Evidence: .sisyphus/evidence/task-14-breadcrumb.png

  Scenario: Guide에 FAQ 섹션 존재
    Tool: Playwright (playwright skill)
    Steps:
      1. navigate to /guide
      2. scroll to "FAQ" 또는 "자주 묻는 질문" 섹션
      3. assert: 최소 5개의 Q&A 항목 존재 (heading + paragraph 쌍)
      4. screenshot 캡처
    Expected Result: FAQ 섹션에 5개 이상 Q&A
    Failure Indicators: FAQ 섹션 미존재 또는 항목 5개 미만
    Evidence: .sisyphus/evidence/task-14-guide-faq.png
  ```

  **Commit**: YES (groups with 13)

- [x] 15. 미사용 컴포넌트 활용 + cohort 필터 패턴 통일 (M-9, L-1)

  **What to do**:
  - `app/components/ErrorState.tsx` — 삭제하지 말고, 적절한 라우트의 ErrorBoundary에서 import하여 활용. 최소 1곳에서 사용되도록 연결 (예: _public.tsx ErrorBoundary)
  - `app/components/LoadingSkeleton.tsx` — 동일하게 최소 1곳에서 사용 연결 (예: 검색 페이지 로딩 상태)
  - `app/db/queries/search.server.ts` — cohort 필터 스타일 통일: `sql\`1=1\`` → 조건부 배열 패턴으로 변경
  - `app/db/queries/questions.server.ts:28` — 동일 통일
  - `app/db/queries/memories.server.ts:22` — 동일 통일

  **Must NOT do**:
  - 컴포넌트 삭제 금지 (대신 활용)
  - 대규모 리팩토링 금지 (패턴 통일만)
  - schema.server.ts 수정 금지

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 10-14)
  - **Blocks**: F1-F4
  - **Blocked By**: Tasks 6-9

  **References**:
  - `app/components/ErrorState.tsx` — 미사용 컴포넌트
  - `app/components/LoadingSkeleton.tsx` — 미사용 컴포넌트
  - `app/routes/_public.tsx` — ErrorBoundary 연결 대상
  - `app/db/queries/search.server.ts:28,57` — `sql\`1=1\`` 패턴 통일 대상
  - `app/db/queries/questions.server.ts:28` — 동일
  - `app/db/queries/memories.server.ts:22` — 동일
  - `app/db/queries/records.server.ts:19-39` — 올바른 조건부 배열 패턴 (참고)

  **Acceptance Criteria**:
  - [ ] ErrorState가 최소 1곳에서 import/사용됨
  - [ ] LoadingSkeleton이 최소 1곳에서 import/사용됨
  - [ ] `sql\`1=1\`` 패턴이 조건부 배열로 대체됨
  - [ ] `npm run typecheck` 통과
  - [ ] `npm run test` 전체 통과

  **QA Scenarios**:
  ```
  Scenario: 코드 품질 정리 빌드 + 테스트
    Tool: Bash
    Steps:
      1. npm run typecheck
      2. npm run test
      3. npm run build
    Expected Result: all exit code 0
    Evidence: .sisyphus/evidence/task-15-cleanup.txt
  ```

  **Commit**: YES
  - Message: `chore: integrate unused components into routes and standardize cohort filter pattern`
  - Files: `app/components/ErrorState.tsx` (수정 없음, import 대상), `app/components/LoadingSkeleton.tsx` (수정 없음, import 대상), `app/routes/_public.tsx` (ErrorBoundary 추가), `app/routes/public/search.tsx` (LoadingSkeleton 연결), `app/db/queries/search.server.ts`, `app/db/queries/questions.server.ts`, `app/db/queries/memories.server.ts`
  - **주의**: 컴포넌트를 삭제하는 것이 아니라 기존 라우트에서 import하여 활용하는 것

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Rejection → fix → re-run.

- [x] F1. **플랜 준수 감사** — `subagent_type="oracle"` (category가 아닌 subagent_type으로 실행)
  Read the plan end-to-end. For each "Must Have": verify implementation exists. For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [x] F2. **코드 품질 리뷰** — `unspecified-high`
  Run `npm run typecheck` + `npm run test` + `npm run build`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction.
  Output: `Build [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [x] F3. **실제 QA — Playwright** — `unspecified-high` (+ `playwright` skill)
  Precondition:
    1. `npm run build` (최신 빌드)
    2. `wrangler d1 migrations apply DB --local && wrangler d1 execute DB --local --file=seeds/seed.sql` (DB 초기화)
    3. `.dev.vars` 파일의 TEST_ADMIN_SESSION, TEST_VERIFIED_SESSION 값 확인 — 이 값들은 외부 인증 서비스(ada-kr-pos.com)에서 발급된 실제 세션. 유효하지 않으면 인증 필요 페이지 QA는 SKIP하고 public 페이지만 테스트.
    4. `wrangler pages dev ./build/client --d1 DB` 로컬 서버 시작 (http://localhost:8788)
  **인증 필요 테스트 전략**: 외부 인증 토큰 의존성으로 인해, 인증 필요 페이지(/me, /write, /inbox, /settings)의 행동 검증은 세션 토큰이 유효할 때만 수행. 토큰 만료 시 public 페이지 + 코드 레벨 검증으로 대체.
  Execute EVERY QA scenario from EVERY task. Test cross-task integration on public pages. Test edge cases: draft records not visible in search/home/stage/learner pages.
  Output: `Scenarios [N/N pass] | Skipped (auth) [N] | Integration [N/N] | VERDICT`

- [x] F4. **범위 충실도 확인** — `deep`
  For each task: read "What to do", read actual diff. Verify 1:1 — everything in spec was built, nothing beyond spec was built. Check "Must NOT do" compliance. Detect scope creep.
  Output: `Tasks [N/N compliant] | Scope [CLEAN/N issues] | VERDICT`

---

## Commit Strategy

- **Commit 1** (Wave 1): `fix(security): add visibility filters to search, home, stage, learner, mentions, recordLinks queries` — C-2,C-4,C-5,C-6 + tests
- **Commit 2** (Wave 1): `fix(security): add draft-record guards to response/sentence actions + defense-in-depth on getRecordBySlug` — C-1,C-7,H-9 + tests
- **Commit 3** (Wave 2): `fix(me): exclude drafts from journey section to prevent duplicate display` — H-1
- **Commit 4** (Wave 2): `fix(write): respect user settings for default visibility and responsePreference` — H-2
- **Commit 5** (Wave 2): `fix(edit): sync mentions and record links on article edit + add mention sync to note` — H-5,H-8
- **Commit 6** (Wave 2): `fix(response): allow user-selected response visibility` — H-6
- **Commit 7** (Wave 3): `feat(ui): add missing wireframe sections to stage, learner, challenge, collaboration pages` — M-1~M-4
- **Commit 8** (Wave 3): `feat(ui): add search sentences tab, record breadcrumb, guide FAQ` — M-5,M-7,M-8
- **Commit 9** (Wave 3): `chore: integrate unused components into routes and standardize cohort filter pattern` — M-9,L-1

---

## Success Criteria

### Verification Commands
```bash
npm run typecheck                    # Expected: 0 errors
npm run test                         # Expected: ALL pass (78 + new tests)
npm run build                        # Expected: success
```
> **주의**: `package.json:6`의 build 스크립트는 patch 단계를 포함. 모든 빌드 검증은 `npm run build`로 통일.

### Final Checklist
- [ ] All CRITICAL visibility filters added (8건)
- [ ] Draft 기록 데이터가 비작성자에게 검색/홈/Stage/Learner 페이지에서 노출되지 않음
- [ ] Settings defaultVisibility → 글쓰기 폼 기본값으로 반영
- [ ] /me 페이지에서 draft 한 곳에만 표시
- [ ] 기록 편집 시 mention/recordLink 동기화 작동
- [ ] 응답 visibility 사용자 선택 가능
- [ ] 와이어프레임 누락 섹션 7개 라우트에 추가 (stage, learner, challenge, group, search, record, guide / bookmarks 제외 — DB 모델 없음)
- [ ] 모든 "Must NOT Have" 항목 부재 확인
