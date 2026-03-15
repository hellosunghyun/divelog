# 에디터 업그레이드 + 서비스 풍부화

## TL;DR

> **Quick Summary**: Tiptap 듀얼 모드 에디터(Note=향상된 textarea, Article=블록 에디터)로 글쓰기 경험을 혁신하고, 탐색·발견·여정 시각화·인터랙션·활동 피드로 서비스를 전방위 풍부화한다.
> 
> **Deliverables**:
> - Tiptap 블록 에디터 (slash commands, 코드블록, 이미지 업로드)
> - 향상된 Note 에디터 (마크다운 단축키, 문자 수 표시)
> - R2 이미지 업로드 (드래그&드롭, 클립보드 붙여넣기)
> - 기록 수정 페이지
> - 콘텐츠 추상화 레이어 (JSON/plain text 듀얼 렌더링)
> - Self-answer 생성 UI
> - 태그 시스템 (admin-curated)
> - 개인 여정 타임라인 + Stage별 분포
> - 여정 활동 피드
> - Learners 목록 강화
> - 검색 개선 (content_text 기반)
> - Vitest 테스트 인프라
> 
> **Estimated Effort**: XL
> **Parallel Execution**: YES — 6 waves
> **Critical Path**: T1/T2 → T4 → T12/T13 → T15 → T16/T17 → Final

---

## Context

### Original Request
글 쓰는 과정의 사용자 경험 개선. 짧은 글은 빠르고 쉽게, 긴 글은 Notion처럼 이미지·코드블록 등을 편하게. 서비스 전반을 더 풍부하게.

### Interview Summary
**Key Discussions**:
- **에디터 방향**: 듀얼 모드 — Note는 향상된 textarea, Article은 Tiptap 블록 에디터
- **저장 포맷**: JSON 블록 구조 (Tiptap/ProseMirror JSON)
- **이미지**: R2 업로드 포함 (wrangler.toml에 바인딩 이미 존재)
- **마이그레이션**: 런칭 전이므로 깨끗한 전환 + seed 재생성
- **수정 기능**: 기록 수정 페이지 신규 추가
- **Note 모드**: Tiptap 아닌 향상된 textarea (Metis 권고 반영)
- **실시간/소셜**: 여정 활동 피드 (조용한 요약, SNS 아님)
- **풍부화**: 5개 방향 전부 — 콘텐츠 표현력, 인터랙션, 탐색, 시각화, 활동 피드
- **테스트**: Vitest 세팅 + 핵심 로직 테스트

**Research Findings**:
- **Tiptap 추천**: Edge 완전 호환(~56KB), 커뮤니티 최대(주 1.2M DL), 확장성 최고
- **BlockNote 제외**: JSDOM 필요 → Cloudflare Workers 불가
- **Novel 제외**: 11개월 릴리즈 없음, AI SDK 의존
- **서비스 완성도 높음**: 21 테이블, 39개 라우트 구현. 주요 갭은 에디터/Self-Answer UI/Learners 스텁

### Metis Review
**Identified Gaps** (addressed):
- **검색 깨짐 위험**: JSON content에 LIKE 쿼리 → `content_text` 컬럼 추가로 해결
- **콘텐츠 렌더링 6곳 regression**: `getPlainText()` + `ContentRenderer` 유틸리티로 해결
- **기록 수정 페이지 없음**: edit 라우트 신규 추가
- **Self-answer 이중 저장**: `selfAnswers` 테이블을 canonical로 통일
- **자동저장 금지**: `beforeunload` 프롬프트로 미저장 경고
- **R2 이미지 orphan**: 기록 삭제 시 + 편집 시 diff 기반 정리
- **Format detection**: `format` 필드 + `JSON.parse` try/catch 이중 체크

---

## Work Objectives

### Core Objective
글쓰기 경험을 듀얼 모드 에디터로 혁신하고, 탐색·발견·시각화·인터랙션·활동 피드로 서비스를 전방위 풍부화한다.

### Concrete Deliverables
- `app/components/editor/NoteEditor.tsx` — 향상된 textarea
- `app/components/editor/ArticleEditor.tsx` — Tiptap 블록 에디터
- `app/components/editor/SlashCommandMenu.tsx` — 슬래시 명령 UI
- `app/components/ContentRenderer.tsx` — JSON/plain text 통합 렌더러
- `app/lib/content.server.ts` — getPlainText, renderToHtml 유틸리티
- `app/routes/api.upload.tsx` — R2 이미지 업로드 API
- `app/routes/_public.write.tsx` — 듀얼 모드 통합
- `app/routes/_public.logs.$recordSlug.edit.tsx` — 기록 수정 페이지
- `app/routes/_public.tags.tsx` — 태그 브라우징
- `app/routes/_public.me.tsx` — 여정 타임라인 강화
- `app/db/schema.server.ts` — content_text, tags, record_tags 추가
- `vitest.config.ts` — 테스트 인프라

### Definition of Done
- [ ] `pnpm build` 성공
- [ ] `tsc --noEmit` 에러 없음
- [ ] `pnpm vitest run` 모든 테스트 통과
- [ ] Note 모드로 짧은 글 작성 → 저장 → 올바르게 렌더링
- [ ] Article 모드로 이미지·코드블록 포함 긴 글 작성 → 저장 → 올바르게 렌더링
- [ ] 기존 plain text 기록 정상 렌더링 (backward compat)
- [ ] 기록 수정 → 저장 → 변경 반영

### Must Have
- Tiptap 블록 에디터 (heading, bold/italic, lists, code blocks, images, blockquote)
- 슬래시 명령 (`/heading`, `/code`, `/image`, `/quote`, `/list`)
- R2 이미지 업로드 (드래그&드롭 + 클립보드)
- 듀얼 모드 (Note=textarea, Article=Tiptap)
- 기록 수정 페이지
- `content_text` 컬럼 + 검색 연동
- Self-answer 생성 UI
- 태그 시스템 (admin-curated)
- 개인 여정 타임라인
- 여정 활동 피드

### Must NOT Have (Guardrails)
- ❌ 자동 저장 (AGENTS.md 명시적 금지)
- ❌ AI 글쓰기 지원/자동완성 (Reflection over Stimulation)
- ❌ Rich text 에디터를 Note 모드에 (과도한 번들)
- ❌ 알고리즘 기반 추천/유사도 ("유사한 기록" 등)
- ❌ 개인별 활동 횟수/랭킹 표시 (Belonging without Competition)
- ❌ 실시간 업데이트 (polling, SSE, WebSocket)
- ❌ 게임형 진행률 UI, 스트릭, 퍼센트
- ❌ 사용자 생성 태그 (admin-curated만)
- ❌ 좋아요, 추천, 인기순 (제품 철학)
- ❌ 말풍선/채팅 UI (editorial card만)
- ❌ base64 이미지 데이터를 JSON에 저장
- ❌ `as any`, `@ts-ignore` 사용

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.
> **단, 사전 준비(one-time setup) 제외**: `.dev.vars`에 유효한 테스트 세션 값 설정은 실행 전 1회 수동 작업으로 허용. Auth가 필요 없는 태스크(T1~T13 등)는 이 준비 없이도 실행 가능.

### Test Decision
- **Infrastructure exists**: NO → 설치 필요
- **Automated tests**: YES (Tests-after) — Vitest 세팅 후 핵심 로직 테스트
- **Framework**: Vitest + @cloudflare/vitest-pool-workers
- **Scope**: content utilities, image validation, search queries, editor serialization

### Route Registration (CRITICAL)
이 프로젝트는 `app/routes.ts`에서 **명시적 라우트 등록**을 사용한다. 새 라우트 파일을 만드는 모든 태스크는 반드시 `app/routes.ts`에도 엔트리를 추가해야 한다.

**필요한 신규 라우트 등록:**
```typescript
// Public 레이아웃 내 추가:
route("logs/:recordSlug/edit", "routes/_public.logs.$recordSlug.edit.tsx"),  // T16
route("tags", "routes/_public.tags.tsx"),                                     // T24
route("tags/:tagSlug", "routes/_public.tags.$tagSlug.tsx"),                   // T24

// Public 레이아웃 밖 (API):
route("api/upload", "routes/api.upload.tsx"),                                 // T10
route("api/images/*", "routes/api.images.$.tsx"),                               // T10 (이미지 서빙, splat route)

// Admin 레이아웃 내 추가:
route("admin/tags", "routes/_admin.admin.tags.tsx"),                           // T22
```

### R2 Image Serving Strategy
R2 버킷에 public URL이 설정되어 있지 않으므로, **splat 프록시 라우트 `/api/images/*`**를 통해 이미지를 서빙한다:
- `app/routes/api.images.$.tsx`: GET → `const key = params["*"]; R2.get(key)` → Response (적절한 Content-Type)
- 이미지 src는 `/api/images/records/{id}.{ext}` 형태로 저장
- T10에서 업로드 + 서빙 라우트 모두 구현

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Frontend/UI**: Playwright — Navigate, interact, assert DOM, screenshot
- **API**: Bash (curl) — Send requests, assert status + response fields
- **Library/Module**: Bash (vitest) — Import, call functions, compare output

### Auth Setup for QA (MANDATORY — Wave 1 전제조건)

> **⚠️ 현재 `.dev.vars`의 TEST_*_SESSION 값은 placeholder이다.** 
> Auth-dependent QA 실행 전에 실제 유효한 세션 값으로 교체되어야 한다.

**사전 준비 (Wave 1 시작 전 수동):**
1. `ada-kr-pos.com`에서 테스트 계정 로그인
2. 브라우저 DevTools → Application → Cookies → `adakrpos_session` 값 복사
3. `.dev.vars` 업데이트: `TEST_VERIFIED_SESSION=실제_세션_값`
4. Admin 계정도 동일하게: `TEST_ADMIN_SESSION=실제_admin_세션_값`

**Auth가 필요 없는 태스크 (T1~T13, T18~T21 등)는 이 준비 없이 실행 가능.**

**Auth 필요 태스크의 QA 전략:**
- Playwright: 각 테스트 전에 `page.context().addCookies([{ name: 'adakrpos_session', value: process.env.TEST_VERIFIED_SESSION, domain: '.ada-kr-pos.com', path: '/' }])` 설정
- curl: `-H "Cookie: adakrpos_session=$(grep TEST_VERIFIED_SESSION .dev.vars | cut -d= -f2)"`
- 비인증 테스트: 쿠키 없이 요청
- **Auth 준비가 안 된 경우**: 해당 QA 시나리오를 SKIP하고, T36 (Final QA)에서 일괄 검증

---

## Execution Strategy

### Parallel Execution Waves

> **Collision-safe waves**: 같은 wave 내 태스크는 같은 파일을 수정하지 않으며, 서로 의존하지 않는다.
> T9, T11, T17은 T8에 통합 (모두 ArticleEditor.tsx 수정). T26은 T25에 통합 (/me 동시 수정). T29는 T28에 통합 (활동 피드 + 홈 통합).

```
Wave 1a (Bootstrap — 2 sequential, package.json 공유):
├── T1: Vitest 세팅 [quick] → vitest.config.ts(new), package.json(scripts)
└── T5: Tiptap 의존성 [quick] → package.json(deps), editor-config.ts(new)
    Note: T1 먼저, T5 이후 (package.json 충돌 방지)

Wave 1b (Foundation — 2 parallel, T1/T5와 독립):
├── T6: NoteEditor [visual-engineering] → NoteEditor.tsx(new)
└── T14: Self-answer UI [visual-engineering] → SelfAnswerCard.tsx(new), selfAnswers queries(new)

Wave 2 (Schema + Content — 4 parallel, T2→T3 sequential):
├── T2 then T3: Schema 업데이트 (sequential — schema.server.ts 공유) [quick]
├── T4: 콘텐츠 추상화 레이어 (deps: T5) [unspecified-high] → content.server.ts(new), ContentRenderer.tsx(new)
└── T19: Learners 목록 강화 [visual-engineering] → learners page, queries

Wave 3 (Core Build — 4 parallel, 파일 충돌 없음):
├── T7: ArticleEditor 베이스 (deps: T5) [deep] → ArticleEditor.tsx(new)
├── T10: R2 업로드 API [unspecified-high] → api.upload.tsx(new), api.images.$.tsx(new)
├── T12: 6곳 consumption 업데이트 (deps: T4) [unspecified-high] → SceneCard, logs pages, admin, search
└── T13: 콘텐츠 유틸리티 테스트 (deps: T1, T4) [quick] → test files(new)

Wave 4 (Extensions + Discovery — 6 parallel, 파일 충돌 없음):
├── T8: ArticleEditor 전체 확장 ★통합★ (deps: T7, T10) [deep] → ArticleEditor.tsx, SlashMenu(new), extensions(new)
├── T18: Seed 데이터 (deps: T2, T3, T12) [quick] → seed.sql
├── T20: 검색 content_text (deps: T2, T12) [quick] → search.server.ts, _public.search.tsx
├── T21: 연결된 기록 [visual-engineering] → logs page, records queries
├── T22: 태그 Admin (deps: T3) [visual-engineering] → admin tags(new), tags queries(new)
└── T27: 문장 하이라이팅 (deps: T4) [unspecified-high] → ContentRenderer.tsx

Wave 5 (Integration — 4 parallel):
├── T15: Write 페이지 듀얼 모드 (deps: T6, T8) [deep] → _public.write.tsx
├── T25: /me 타임라인 + 분포 ★통합★ [visual-engineering] → _public.me.tsx
├── T24: 태그 브라우징 (deps: T3, T22) [visual-engineering] → tags pages(new)
└── T28: 활동 피드 + 홈 통합 ★통합★ [visual-engineering] → ActivityFeed(new), _public._index.tsx

Wave 6 (Edit — T16 first, then T23):
├── T16: 기록 수정 (deps: T15) [deep] → edit.tsx(new), logs page(edit link)
└── T23: 태그 선택 (deps: T3, T16) [quick] → write.tsx, edit.tsx ← runs after T16

Wave 7 (Polish + Tests — 4 parallel):
├── T30: 이미지 cleanup, edit-time only (deps: T10, T16) [quick] → edit action
├── T31: beforeunload (deps: T15, T16) [quick] → write hooks, edit hooks
├── T32: 키보드 단축키 (deps: T15) [visual-engineering] → editor components
└── T33: 통합 테스트 (deps: T15, T16) [unspecified-high] → test files(new)

Wave FINAL (Verification — 4 parallel):
├── T34: Plan compliance audit [oracle]
├── T35: Code quality review [unspecified-high]
├── T36: Real manual QA [unspecified-high]
└── T37: Scope fidelity check [deep]

Critical Path: T1 → T13, T5 → T7 → T8 → T15 → T16 → T33 → FINAL
Max Concurrent: 5 (Waves 3, 4)
Merged Tasks: T9→T8, T11→T8, T17→T8, T26→T25, T29→T28
```

### Dependency Matrix

| Task | Depends On | Blocks | Wave |
|------|-----------|--------|------|
| T1 | — | T13 | 1 |
| T5 | — | T4, T7 | 1 |
| T6 | — | T15 | 1 |
| T14 | — | — | 1 |
| T2 | — | T3, T18, T20 | 2 |
| T3 | T2 | T22, T23, T24 | 2 (after T2) |
| T4 | T5 | T12, T13, T27 | 2 |
| T19 | — | — | 2 |
| T7 | T5 | T8 | 3 |
| T10 | — | T8, T30 | 3 |
| T12 | T4 | T18, T20 | 3 |
| T13 | T1, T4 | — | 3 |
| T21 | — | — | 3 |
| T8 | T7, T10 | T15 | 4 (includes T9, T11, T17) |
| T20 | T2, T12 | — | 4 |
| T22 | T3 | T24 | 4 |
| T27 | T4 | — | 4 |
| T15 | T6, T8 | T16, T23, T31, T32 | 5 |
| T25 | — | — | 5 (includes T26) |
| T24 | T3, T22 | — | 5 |
| T28 | — | — | 5 (includes T29) |
| T16 | T15 | T23, T30, T31, T33 | 6 |
| T23 | T3, T16 | — | 6 (after T16) |
| T30 | T10, T16 | — | 7 |
| T31 | T15, T16 | — | 7 |
| T32 | T15 | — | 7 |
| T33 | T15, T16 | — | 7 |
| T34-37 | ALL | — | FINAL |

> **통합된 태스크**: T9→T8, T11→T8, T17→T8 (ArticleEditor 파일 충돌 방지), T26→T25 (/me 파일 충돌 방지), T29→T28 (의존 관계)

### Agent Dispatch Summary

- **Wave 1a**: **2 sequential** — T1→`quick`, T5→`quick` (package.json 공유)
- **Wave 1b**: **2 parallel** — T6→`visual-engineering`, T14→`visual-engineering`
- **Wave 2**: **4** — T2→T3(sequential)`quick`, T4→`unspecified-high`, T19→`visual-engineering`
- **Wave 3**: **4** — T7→`deep`, T10→`unspecified-high`, T12→`unspecified-high`, T13→`quick`
- **Wave 4**: **6** — T8→`deep`, T18→`quick`, T20→`quick`, T21→`visual-engineering`, T22→`visual-engineering`, T27→`unspecified-high`
- **Wave 5**: **4** — T15→`deep`, T25→`visual-engineering`, T24→`visual-engineering`, T28→`visual-engineering`
- **Wave 6**: **2** — T16→`deep`, T23→`quick`(after T16)
- **Wave 7**: **4** — T30→`quick`, T31→`quick`, T32→`visual-engineering`, T33→`unspecified-high`
- **FINAL**: **4** — T34→`deep`, T35→`unspecified-high`, T36→`unspecified-high`+`playwright`, T37→`deep`

---

## TODOs

> Implementation + Test = ONE Task. Never separate.
> EVERY task MUST have: Recommended Agent Profile + Parallelization info + QA Scenarios.

- [x] 1. Vitest 테스트 인프라 세팅

  **What to do**:
  - `pnpm add -D vitest @cloudflare/vitest-pool-workers` 설치
  - `vitest.config.ts` 생성: Cloudflare Workers pool 설정, `app/**/*.test.ts` glob
  - `package.json`에 `"test": "vitest run"`, `"test:watch": "vitest"` 스크립트 추가
  - `app/lib/__tests__/example.test.ts` 예제 테스트 작성 (2+2=4 등 smoke test)
  - `pnpm vitest run` 실행하여 통과 확인

  **Must NOT do**:
  - Jest 설치 (Vitest 사용)
  - 복잡한 mock 설정 (기본 설정만)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []
    - 단순 설정 작업, 스킬 불필요

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T2, T3, T4, T5, T6)
  - **Blocks**: T13
  - **Blocked By**: None

  **References**:
  - `package.json` — 현재 의존성 확인, scripts 섹션에 test 추가
  - `wrangler.toml` — Cloudflare 바인딩 구성 확인 (D1, R2)
  - https://developers.cloudflare.com/workers/testing/vitest-integration/ — Cloudflare Vitest pool 공식 문서

  **Acceptance Criteria**:
  - [ ] `vitest.config.ts` 존재
  - [ ] `pnpm vitest run` → 예제 테스트 1개 이상 PASS

  **QA Scenarios**:
  ```
  Scenario: Vitest 실행 성공
    Tool: Bash
    Steps:
      1. `pnpm vitest run --reporter=verbose`
      2. 출력에서 "Tests" 라인 확인
    Expected Result: "1 passed" 또는 그 이상, exit code 0
    Evidence: .sisyphus/evidence/task-1-vitest-run.txt

  Scenario: Watch 모드 스크립트 존재 확인
    Tool: Bash
    Steps:
      1. `node -e "const pkg = require('./package.json'); console.log(pkg.scripts['test:watch'])"`
      2. 출력이 "vitest" 포함 확인
    Expected Result: test:watch 스크립트가 "vitest" 명령 포함
    Evidence: .sisyphus/evidence/task-1-vitest-watch.txt
  ```

  **Commit**: YES
  - Message: `chore(test): vitest 인프라 세팅`
  - Files: `vitest.config.ts`, `package.json`, `app/lib/__tests__/example.test.ts`
  - Pre-commit: `pnpm vitest run`

- [x] 2. Drizzle 스키마: content_text 컬럼 마이그레이션

  **What to do**:
  - `app/db/schema.server.ts`의 `records` 테이블에 `contentText` 컬럼 추가 (`text("content_text").default("")`)
  - `npx drizzle-kit generate` 실행하여 마이그레이션 파일 생성
  - `wrangler d1 migrations apply DB --local` 로 로컬 적용 확인
  - `app/db/queries/records.server.ts`의 레코드 생성/수정 쿼리에 `contentText` 필드 반영

  **Must NOT do**:
  - 기존 `content` 컬럼 수정 또는 삭제
  - `contentText`를 NOT NULL로 설정 (기존 레코드 호환)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T1, T3, T4, T5, T6)
  - **Blocks**: T12, T18, T20
  - **Blocked By**: None

  **References**:
  - `app/db/schema.server.ts:95-130` — records 테이블 현재 구조
  - `app/db/queries/records.server.ts:20-50` — createRecord 함수
  - `drizzle/migrations/` — 기존 마이그레이션 파일 패턴

  **Acceptance Criteria**:
  - [ ] `content_text` 컬럼이 records 테이블에 존재
  - [ ] `wrangler d1 migrations apply DB --local` 성공

  **QA Scenarios**:
  ```
  Scenario: 마이그레이션 적용 성공
    Tool: Bash
    Steps:
      1. `wrangler d1 migrations apply DB --local`
      2. `wrangler d1 execute DB --local --command="PRAGMA table_info(records)"`
      3. 출력에서 "content_text" 컬럼 존재 확인
    Expected Result: content_text 컬럼이 테이블에 추가됨
    Evidence: .sisyphus/evidence/task-2-migration.txt

  Scenario: 기존 레코드 호환
    Tool: Bash
    Steps:
      1. `wrangler d1 execute DB --local --file=seeds/seed.sql`
      2. `wrangler d1 execute DB --local --command="SELECT id, content_text FROM records LIMIT 3"`
    Expected Result: 기존 레코드의 content_text가 빈 문자열, 에러 없음
    Evidence: .sisyphus/evidence/task-2-compat.txt
  ```

  **Commit**: YES
  - Message: `feat(db): records 테이블에 content_text 컬럼 추가`
  - Files: `app/db/schema.server.ts`, `drizzle/migrations/*.sql`, `app/db/queries/records.server.ts`
  - Pre-commit: `tsc --noEmit`

- [x] 3. Drizzle 스키마: tags + record_tags 테이블 마이그레이션

  **What to do**:
  - `app/db/schema.server.ts`에 `tags` 테이블 추가: `id`, `name` (unique), `slug` (unique), `description`, `color`, `createdBy`, `createdAt`, `updatedAt`
  - `recordTags` junction 테이블 추가: `recordId` (FK→records), `tagId` (FK→tags), `createdAt`
  - `app/db/relations.server.ts`에 관계 정의 추가
  - `npx drizzle-kit generate`로 마이그레이션 생성
  - 로컬 적용 확인

  **Must NOT do**:
  - 사용자 생성 태그 로직 (admin-curated만)
  - JSON 배열로 태그 저장 (junction table 사용)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T1, T2, T4, T5, T6)
  - **Blocks**: T22, T23, T24
  - **Blocked By**: None

  **References**:
  - `app/db/schema.server.ts` — 기존 테이블 패턴 (challengeStages junction 참고: 라인 ~70)
  - `app/db/relations.server.ts` — 기존 관계 정의 패턴
  - `.docs/glossary.md` — 용어 정의 확인

  **Acceptance Criteria**:
  - [ ] `tags`, `record_tags` 테이블 생성
  - [ ] junction 테이블에 적절한 FK 제약 조건
  - [ ] `wrangler d1 migrations apply DB --local` 성공

  **QA Scenarios**:
  ```
  Scenario: 태그 테이블 생성 확인
    Tool: Bash
    Steps:
      1. `wrangler d1 migrations apply DB --local`
      2. `wrangler d1 execute DB --local --command="PRAGMA table_info(tags)"`
      3. `wrangler d1 execute DB --local --command="PRAGMA table_info(record_tags)"`
    Expected Result: 두 테이블 모두 올바른 컬럼으로 생성
    Evidence: .sisyphus/evidence/task-3-tables.txt

  Scenario: FK 무결성 테스트
    Tool: Bash
    Steps:
      1. `wrangler d1 execute DB --local --command="INSERT INTO record_tags (record_id, tag_id, created_at) VALUES ('nonexistent', 'nonexistent', 0)"`
    Expected Result: FK 제약 위반 에러
    Evidence: .sisyphus/evidence/task-3-fk-error.txt
  ```

  **Commit**: YES
  - Message: `feat(db): tags 및 record_tags 테이블 추가`
  - Files: `app/db/schema.server.ts`, `app/db/relations.server.ts`, `drizzle/migrations/*.sql`
  - Pre-commit: `tsc --noEmit`

- [x] 4. 콘텐츠 추상화 레이어 (getPlainText, renderToHtml, ContentRenderer)

  **What to do**:
  - **모듈 경계 설계** (`.server.ts` 제약 준수):
    - `app/lib/content.server.ts` (서버 전용 — loader/action에서만 import):
      - `getPlainText(content: string, format: "note" | "article"): string` — Tiptap JSON에서 텍스트 추출
      - `renderContentToHtml(content: string, format: "note" | "article"): string` — `@tiptap/html`의 `generateHTML()` 사용
      - `detectContentFormat(content: string): "json" | "plaintext"` — JSON.parse try/catch
    - `app/components/ContentRenderer.tsx` (클라이언트 컴포넌트 — `.server.ts` import 금지):
      - Props: `contentHtml: string`, `format: "note" | "article"`, `className?: string`
      - **HTML은 loader에서 사전 계산하여 전달** — 컴포넌트는 `dangerouslySetInnerHTML`로 렌더링만
      - Note: `<div className="whitespace-pre-wrap">{plainContent}</div>` (HTML 변환 불필요)
      - Article: `<div className="prose" dangerouslySetInnerHTML={{ __html: contentHtml }} />`
    - **패턴**: loader에서 `renderContentToHtml()` 호출 → 결과를 `contentHtml`로 컴포넌트에 전달
  - 에디터 확장 목록 타입 정의: `app/lib/editor-extensions.ts` — 서버/클라이언트 공유 확장 목록 (순수 타입/상수, `.server` 아님)

  **Must NOT do**:
  - `marked`, `remark` 등 별도 마크다운 라이브러리 추가 (Tiptap HTML 생성 사용)
  - 콘텐츠 정화를 위한 DOMPurify 추가 (Tiptap generateHTML이 이미 안전)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 다수 파일에서 참조되는 핵심 유틸리티, 정확성 중요
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T2→T3, T19)
  - **Blocks**: T12, T13, T27
  - **Blocked By**: T5 (`@tiptap/html` 패키지 필요)

  **References**:
  - `app/routes/_public.logs.$recordSlug.tsx:232-234` — 현재 렌더링 (`whitespace-pre-wrap`)
  - `app/components/SceneCard.tsx:47` — 현재 snippet 추출 (`.substring(0, 120)`)
  - `@tiptap/html` 공식 문서 — `generateHTML(json, extensions)` API (T5에서 설치)
  - `.docs/design.md` — Quiet Depth 디자인 가이드라인, 본문 타이포그래피

  **Acceptance Criteria**:
  - [ ] `getPlainText("plain text", "note")` → `"plain text"` 반환
  - [ ] `getPlainText(tiptapJson, "article")` → 블록 내 텍스트만 추출
  - [ ] `ContentRenderer` 가 note/article 포맷 모두 렌더링

  **QA Scenarios**:
  ```
  Scenario: Plain text 감지 및 추출
    Tool: Bash (vitest)
    Steps:
      1. `pnpm vitest run app/lib/content.server.test.ts -t "getPlainText"`
    Expected Result: plain text 입력 → 그대로 반환, JSON 입력 → 텍스트만 추출
    Evidence: .sisyphus/evidence/task-4-plaintext.txt

  Scenario: 잘못된 JSON 처리
    Tool: Bash (vitest)
    Steps:
      1. `pnpm vitest run app/lib/content.server.test.ts -t "malformed"`
    Expected Result: `{broken json`으로 시작하는 문자열 → plaintext로 fallback, 에러 없음
    Evidence: .sisyphus/evidence/task-4-malformed.txt
  ```

  **Commit**: YES
  - Message: `feat(lib): 콘텐츠 추상화 유틸리티 및 ContentRenderer 컴포넌트`
  - Files: `app/lib/content.server.ts`, `app/lib/editor-extensions.ts`, `app/components/ContentRenderer.tsx`
  - Pre-commit: `tsc --noEmit`

- [x] 5. Tiptap 의존성 설치 + 베이스 설정

  **What to do**:
  - 패키지 설치:
    - `@tiptap/react`, `@tiptap/pm` (ProseMirror)
    - `@tiptap/starter-kit` (기본 확장 번들)
    - `@tiptap/html` (서버사이드 HTML 생성)
    - `@tiptap/extension-placeholder`
    - `@tiptap/extension-image`
    - `@tiptap/extension-code-block-lowlight`
    - `lowlight` (syntax highlighting)
    - `@tiptap/extension-underline`
  - `app/lib/editor-config.ts` 생성: 확장 목록 정의, 공통 에디터 설정
  - 에디터 Tailwind 스타일: `app/styles/editor.css` — ProseMirror 기본 스타일 오버라이드, Quiet Depth 톤 적용

  **Must NOT do**:
  - `@tiptap/extension-collaboration` (실시간 협업 편집 불필요)
  - `@tiptap/extension-ai` 또는 AI 관련 패키지

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T1, T2, T3, T4, T6)
  - **Blocks**: T7
  - **Blocked By**: None

  **References**:
  - `package.json` — 현재 의존성
  - `app/styles/global.css` — 기존 글로벌 스타일
  - `app/styles/tokens.css` — Quiet Depth 디자인 토큰
  - `.docs/design.md` — 에디터/폼 디자인 가이드라인 (distraction-free, focus blue)

  **Acceptance Criteria**:
  - [ ] 모든 Tiptap 패키지 설치 완료
  - [ ] `pnpm build` 성공 (tree-shaking 가능)
  - [ ] `tsc --noEmit` 에러 없음

  **QA Scenarios**:
  ```
  Scenario: 빌드 성공 확인
    Tool: Bash
    Steps:
      1. `pnpm build 2>&1`
      2. exit code 확인
    Expected Result: 빌드 성공, @tiptap 관련 에러 없음
    Evidence: .sisyphus/evidence/task-5-build.txt

  Scenario: 타입 체크 통과
    Tool: Bash
    Steps:
      1. `tsc --noEmit 2>&1`
    Expected Result: @tiptap 관련 타입 에러 없음
    Evidence: .sisyphus/evidence/task-5-typecheck.txt
  ```

  **Commit**: YES
  - Message: `chore(deps): tiptap 의존성 설치 및 에디터 베이스 설정`
  - Files: `package.json`, `pnpm-lock.yaml`, `app/lib/editor-config.ts`, `app/styles/editor.css`
  - Pre-commit: `pnpm build`

- [x] 6. NoteEditor 컴포넌트 (향상된 textarea)

  **What to do**:
  - `app/components/editor/NoteEditor.tsx` 생성:
    - 향상된 `<textarea>` (Tiptap 아님, 가볍고 빠름)
    - 마크다운 단축키: `Ctrl/Cmd+B` (bold `**`), `Ctrl/Cmd+I` (italic `*`), `Ctrl/Cmd+K` (link `[]()`)
    - 실시간 문자 수 표시 (max 50,000)
    - 자동 높이 조절 (min 4줄, max 화면의 60%)
    - placeholder: "짧은 생각, 메모, 기록을 남겨보세요..."
    - Quiet Depth 스타일: border `#E3E8EF`, focus시 `#146C94`, radius 12px
  - Props: `name`, `defaultValue`, `maxLength`, `error`, `onChange`
  - 접근성: `aria-label`, `aria-describedby` (문자 수), focus ring

  **Must NOT do**:
  - Tiptap이나 ProseMirror 사용 (순수 textarea)
  - 마크다운 미리보기 (Note는 simple)
  - 자동 저장

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: UI 컴포넌트, Quiet Depth 디자인 적용 필요
  - **Skills**: [`frontend-design`]
    - `frontend-design`: Quiet Depth 디자인 토큰 적용

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T1, T2, T3, T4, T5)
  - **Blocks**: T15
  - **Blocked By**: None

  **References**:
  - `app/routes/_public.write.tsx:265-278` — 현재 textarea 구현
  - `app/styles/tokens.css` — 디자인 토큰 (색상, radius)
  - `.docs/design.md` — 폼/에디터 디자인 가이드 ("distraction-free", "line-height 충분히")
  - `.docs/frontend.md` — 접근성 요구사항 (44px 타겟, focus ring)

  **Acceptance Criteria**:
  - [ ] NoteEditor 렌더링 + 입력 동작
  - [ ] 문자 수 실시간 표시
  - [ ] Cmd+B → `**`selection`**` 삽입

  **QA Scenarios**:
  > NoteEditor는 T15 전까지 어떤 라우트에도 마운트되지 않으므로, 이 태스크의 QA는 빌드/타입 수준.
  > Playwright E2E는 T15(write 페이지 통합) 및 T36(Final QA)에서 수행.
  ```
  Scenario: NoteEditor 빌드 및 타입 검증
    Tool: Bash
    Steps:
      1. `tsc --noEmit 2>&1 | grep -i "NoteEditor"` → 에러 없음
      2. `pnpm build 2>&1` → 성공
    Expected Result: NoteEditor 컴포넌트 컴파일 성공, 타입 에러 없음
    Evidence: .sisyphus/evidence/task-6-build.txt

  Scenario: NoteEditor export 확인
    Tool: Bash
    Steps:
      1. `grep -n "export" app/components/editor/NoteEditor.tsx`
    Expected Result: default export 또는 named export 존재
    Evidence: .sisyphus/evidence/task-6-export.txt
  ```

  **Commit**: YES
  - Message: `feat(editor): NoteEditor 향상된 textarea 컴포넌트`
  - Files: `app/components/editor/NoteEditor.tsx`
  - Pre-commit: `tsc --noEmit`

- [x] 7. ArticleEditor 베이스 (Tiptap 블록 에디터)

  **What to do**:
  - `app/components/editor/ArticleEditor.tsx` 생성:
    - `useEditor` hook으로 Tiptap 에디터 초기화
    - `immediatelyRender: false` 설정 (edge runtime timing 이슈 방지)
    - 확장: Document, Paragraph, Text, Heading (1-3), Bold, Italic, Strike, BulletList, OrderedList, ListItem, Blockquote, HorizontalRule, HardBreak, Underline
    - 플로팅 툴바: 텍스트 선택 시 서식 옵션 (bold, italic, heading, list, quote)
    - Placeholder 확장: "여기에 글을 쓰세요. `/`를 입력하면 블록을 추가할 수 있습니다."
    - Quiet Depth 스타일: 에디토리얼 타이포그래피, 넉넉한 여백, 조용한 border
  - Props: `content` (Tiptap JSON string), `onChange` (JSON string 반환), `className`
  - 에디터 output: `editor.getJSON()` → JSON.stringify → onChange

  **Must NOT do**:
  - 이미지/코드블록 확장 (T9, T11에서 별도 추가)
  - 슬래시 명령 (T8에서 별도)
  - AI 자동완성, 글쓰기 어시스턴트

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Tiptap 통합은 복잡하며, ProseMirror 이해 필요
  - **Skills**: [`frontend-design`]
    - `frontend-design`: 에디토리얼 타이포그래피 + Quiet Depth 스타일링

  **Parallelization**:
  - **Can Run In Parallel**: YES (T5 완료 후)
  - **Parallel Group**: Wave 2 (with T8-T14)
  - **Blocks**: T8, T9, T11, T15, T17
  - **Blocked By**: T5

  **References**:
  - `app/lib/editor-config.ts` (T5에서 생성) — 확장 목록, 공통 설정
  - `app/styles/editor.css` (T5에서 생성) — ProseMirror 스타일
  - `app/styles/tokens.css` — Quiet Depth 디자인 토큰
  - `.docs/design.md` — 에디터 디자인 가이드 (distraction-free, typography scale)
  - Tiptap React 공식 문서 — useEditor hook, EditorContent 컴포넌트

  **Acceptance Criteria**:
  - [ ] ArticleEditor 렌더링 + 텍스트 입력 동작
  - [ ] Heading, Bold, Italic, List 서식 동작
  - [ ] `editor.getJSON()` → 유효한 Tiptap JSON 출력

  **QA Scenarios**:
  > ArticleEditor는 T15 전까지 어떤 라우트에도 마운트되지 않으므로, 이 태스크의 QA는 빌드/타입 수준.
  > Playwright E2E는 T15(write 페이지 통합) 및 T36(Final QA)에서 수행.
  ```
  Scenario: ArticleEditor 빌드 및 타입 검증
    Tool: Bash
    Steps:
      1. `tsc --noEmit 2>&1 | grep -i "ArticleEditor"` → 에러 없음
      2. `pnpm build 2>&1` → 성공
    Expected Result: ArticleEditor 컴포넌트 컴파일 성공
    Evidence: .sisyphus/evidence/task-7-build.txt

  Scenario: Tiptap useEditor 초기화 확인
    Tool: Bash (grep)
    Steps:
      1. `grep -n "useEditor\|immediatelyRender" app/components/editor/ArticleEditor.tsx`
    Expected Result: useEditor hook 사용, immediatelyRender: false 설정 확인
    Evidence: .sisyphus/evidence/task-7-editor-init.txt
  ```

  **Commit**: YES
  - Message: `feat(editor): ArticleEditor tiptap 블록 에디터 베이스`
  - Files: `app/components/editor/ArticleEditor.tsx`
  - Pre-commit: `tsc --noEmit`

- [x] 8. ArticleEditor 전체 확장 ★T9, T11, T17 통합★

  > **통합 범위**: 슬래시 명령(구 T8) + 코드블록(구 T9) + 이미지 확장(구 T11) + 붙여넣기 정화(구 T17)
  > 모두 ArticleEditor.tsx를 수정하므로 하나의 태스크로 통합하여 파일 충돌 방지.

  **What to do**:

  **A. 슬래시 명령 시스템:**
  - `app/components/editor/SlashCommandMenu.tsx` 생성:
    - `/` 입력 시 드롭다운 메뉴 표시
    - 명령 목록: 제목 1/2/3, 글머리 기호, 번호 매기기, 인용구, 구분선, 코드 블록, 이미지
    - 타이핑으로 필터링 (예: `/코` → "코드 블록" 필터)
    - 키보드 네비게이션: ↑↓ 이동, Enter 선택, Esc 닫기
    - 각 명령에 아이콘 + 설명 텍스트
  - Tiptap `Extension.create()` 사용하여 suggestion 플러그인으로 구현
  - Quiet Depth 스타일: surface 배경, 얇은 border, 부드러운 shadow

  **Must NOT do**:
  - AI 명령 (`/ai`, `/generate` 등)
  - 임베드 명령 (`/youtube`, `/embed`) — 추후 확장 가능하게 구조만

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Tiptap suggestion 플러그인 이해 필요
  - **Skills**: [`frontend-design`]
    - `frontend-design`: 메뉴 UI 디자인

  **Parallelization**:
  - **Can Run In Parallel**: YES (T7 완료 후)
  - **Parallel Group**: Wave 2
  - **Blocks**: T15
  - **Blocked By**: T7

  **References**:
  - `app/components/editor/ArticleEditor.tsx` (T7) — 에디터 인스턴스
  - Tiptap Suggestion 공식 문서 — suggestion 확장 API
  - `.docs/design.md` — 카드/드롭다운 디자인 (surface, border, shadow)

  **Acceptance Criteria**:
  - [ ] `/` 입력 시 명령 메뉴 표시
  - [ ] `/제` 입력 시 "제목" 관련 명령만 필터
  - [ ] 명령 선택 시 해당 블록으로 전환

  **QA Scenarios**:
  ```
  Scenario: 슬래시 명령 메뉴 표시 및 선택
    Tool: Playwright
    Steps:
      1. ArticleEditor에서 빈 줄에 "/" 입력
      2. 드롭다운 메뉴 표시 확인
      3. "제목 1" 클릭 또는 Enter
      4. "테스트 제목" 입력
    Expected Result: h1 스타일로 "테스트 제목" 표시, 드롭다운 닫힘
    Evidence: .sisyphus/evidence/task-8-slash-command.png

  Scenario: 키보드 네비게이션
    Tool: Playwright
    Steps:
      1. "/" 입력 → 메뉴 표시
      2. ↓ 키 2번 → 3번째 항목 하이라이트
      3. Enter → 해당 블록 삽입
    Expected Result: 키보드로 메뉴 탐색 및 선택 가능
    Evidence: .sisyphus/evidence/task-8-keyboard-nav.png
  ```

  **B. 코드블록 확장 + Syntax Highlighting:**
  - ArticleEditor에 `CodeBlockLowlight` 확장 추가
  - `lowlight`로 syntax highlighting: JS, TS, Python, HTML, CSS, SQL, JSON, Bash, Go, Rust
  - 코드블록 UI: 언어 선택 드롭다운, 복사 버튼
  - Quiet Depth 스타일: `#F2F5F8` 배경, monospace, 부드러운 border
  - 슬래시 메뉴에 `/code` 명령 등록

  **C. 이미지 확장 + R2 통합:**
  - Image 확장 + 커스텀 NodeView: 드래그&드롭, 클립보드 붙여넣기 → `/api/upload` → 이미지 노드 삽입
  - 업로드 중 로딩 표시, 실패 시 에러 + 재시도
  - 슬래시 메뉴에 `/image` 명령: 파일 선택 다이얼로그

  **D. 붙여넣기 정화 + 콘텐츠 제한:**
  - 외부 소스 paste 시 불필요한 스타일/속성 제거
  - 허용 노드만 유지, data:URL 이미지는 R2 업로드로 전환
  - JSON 크기 100KB 제한, 글자 수 표시

  **Must NOT do**:
  - AI 명령 (`/ai`, `/generate`)
  - 코드 실행 기능
  - 40개 이상 언어 번들
  - base64 이미지 JSON 저장
  - 이미지 리사이징/캡션 (Phase 2)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Tiptap 확장 4개 통합, ProseMirror 깊은 이해 필요
  - **Skills**: [`frontend-design`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (T7, T10 완료 후)
  - **Parallel Group**: Wave 4
  - **Blocks**: T15
  - **Blocked By**: T7, T10

  **References**:
  - `app/components/editor/ArticleEditor.tsx` (T7) — 베이스 에디터
  - `app/routes/api.upload.tsx` (T10) — R2 업로드 API
  - Tiptap Suggestion 공식 문서 — slash command
  - `@tiptap/extension-code-block-lowlight` — 코드블록
  - `@tiptap/extension-image` — 이미지
  - `.docs/design.md` — Surface Secondary `#F2F5F8`, 카드/드롭다운 디자인

  **Acceptance Criteria**:
  - [ ] `/` 입력 시 명령 메뉴 표시, 필터링, 키보드 네비게이션
  - [ ] 코드블록에 syntax highlighting + 언어 선택 + 복사 버튼
  - [ ] 이미지 드래그&드롭/클립보드 → R2 업로드 → 에디터 표시
  - [ ] 외부 붙여넣기 시 불필요한 스타일 제거
  - [ ] JSON 100KB 제한 적용

  **QA Scenarios**:
  > ArticleEditor는 T15 전까지 어떤 라우트에도 마운트되지 않으므로, 이 태스크의 QA는 빌드/타입/구조 수준.
  > 슬래시 명령, 코드블록, 이미지, 붙여넣기의 Playwright E2E는 T15(write 통합) 및 T36(Final QA)에서 수행.
  ```
  Scenario: 확장 통합 빌드 검증
    Tool: Bash
    Steps:
      1. `tsc --noEmit 2>&1` → 에러 없음
      2. `pnpm build 2>&1` → 성공
    Expected Result: 모든 확장 포함 ArticleEditor 컴파일 성공
    Evidence: .sisyphus/evidence/task-8-build.txt

  Scenario: 확장 파일 구조 확인
    Tool: Bash
    Steps:
      1. `ls app/components/editor/SlashCommandMenu.tsx` → 존재
      2. `grep -n "CodeBlockLowlight\|Image\|pasteRules" app/components/editor/ArticleEditor.tsx`
    Expected Result: 슬래시 메뉴 컴포넌트 존재, ArticleEditor에 CodeBlock/Image/paste 확장 등록
    Evidence: .sisyphus/evidence/task-8-extensions.txt
  ```

  **Commit**: YES
  - Message: `feat(editor): ArticleEditor 전체 확장 (slash, code, image, paste)`
  - Files: ArticleEditor.tsx, SlashCommandMenu.tsx(new), extension files(new)
  - Pre-commit: `tsc --noEmit`

- [ ] 9. ⚠️ **T8에 통합됨** — 코드블록 확장은 T8 "ArticleEditor 전체 확장"의 일부로 실행됩니다. 이 태스크는 skip.

- [x] 10. R2 업로드 API 라우트

  **What to do**:
  - `app/routes/api.upload.tsx` 생성:
    - POST action: multipart form data 수신
    - 파일 검증: image/jpeg, image/png, image/webp, image/gif만 허용
    - 크기 제한: 5MB 이하
    - R2 키: `records/{nanoid()}.{ext}` (recordId는 아직 없을 수 있으므로 nanoid 사용)
    - `context.cloudflare.env.R2.put(key, file)` 으로 저장
    - 응답: `{ url: "/api/images/records/{nanoid}.{ext}", key: "records/..." }` — **프록시 라우트 경유**
    - **인증: API 전용 auth guard 구현** — `getAuth()`로 인증 확인 후, 미인증 시 redirect 대신 `Response.json({ error: "인증이 필요합니다" }, { status: 401 })` 반환
  - `app/routes/api.images.$.tsx` 생성 (이미지 서빙 프록시, splat route):
    - GET loader: `const key = params["*"]; context.cloudflare.env.R2.get(key)` → Response with Content-Type
    - URL 예시: `/api/images/records/abc123.jpg` → R2 key `records/abc123.jpg`
    - 캐시: `Cache-Control: public, max-age=31536000, immutable` (immutable keys)
    - 존재하지 않는 키 → 404
  - `app/routes.ts`에 두 라우트 등록: `route("api/upload", ...)`, `route("api/images/*", ...)`
  - `app/lib/validation.ts`에 이미지 업로드 Zod 스키마 추가

  **Must NOT do**:
  - base64 인코딩 (직접 binary upload)
  - 이미지 리사이징/크롭 (원본 저장)
  - 비인증 사용자 업로드 허용
  - `requireVerified` 사용 (redirect 방식이므로 API 라우트에 부적합)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: R2 API + 보안 검증
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: T11, T30
  - **Blocked By**: None

  **References**:
  - `wrangler.toml:16-17` — R2 바인딩 설정 (`divelog-r2`)
  - `app/lib/auth.middleware.ts` — requireVerified 미들웨어
  - `app/lib/validation.ts` — 기존 Zod 스키마 패턴
  - Cloudflare R2 Workers API 문서 — put/get/delete 메서드

  **Acceptance Criteria**:
  - [ ] POST `/api/upload` → 이미지 업로드 성공, URL 반환
  - [ ] 5MB 초과 파일 → 400 에러
  - [ ] text/html 파일 → 400 에러
  - [ ] 비인증 요청 → 401 에러

  **QA Scenarios**:
  ```
  Scenario: 정상 이미지 업로드
    Tool: Bash (curl)
    Steps:
      1. 테스트용 1KB JPEG 파일 생성: `convert -size 100x100 xc:red test.jpg` 또는 `dd if=/dev/urandom of=test.jpg bs=1024 count=1`
      2. `.dev.vars`에서 세션 추출: `SESSION=$(grep TEST_VERIFIED_SESSION .dev.vars | cut -d= -f2)`
      3. `curl -X POST http://localhost:8788/api/upload -H "Cookie: adakrpos_session=$SESSION" -F "file=@test.jpg;type=image/jpeg"`
    Expected Result: 200, `{"url":"...","key":"records/..."}`
    Evidence: .sisyphus/evidence/task-10-upload-success.txt

  Scenario: 잘못된 파일 타입 거부
    Tool: Bash (curl)
    Steps:
      1. `SESSION=$(grep TEST_VERIFIED_SESSION .dev.vars | cut -d= -f2)`
      2. `curl -X POST http://localhost:8788/api/upload -H "Cookie: adakrpos_session=$SESSION" -F "file=@test.html;type=text/html"`
    Expected Result: 400, 에러 메시지 포함
    Evidence: .sisyphus/evidence/task-10-invalid-type.txt
  ```

  **Commit**: YES
  - Message: `feat(api): R2 이미지 업로드 API 라우트`
  - Files: `app/routes/api.upload.tsx`, `app/lib/validation.ts`
  - Pre-commit: `tsc --noEmit`

- [ ] 11. ⚠️ **T8에 통합됨** — 이미지 확장은 T8 "ArticleEditor 전체 확장"의 일부로 실행됩니다. 이 태스크는 skip.

  아래는 원래 내용 (T8 실행 시 참고):
  - ArticleEditor에 Image 확장 추가 + 커스텀 NodeView:
    - 드래그&드롭: 에디터 영역에 이미지 파일 드롭 → `/api/upload` 호출 → 이미지 노드 삽입
    - 클립보드 붙여넣기: 이미지 paste → 동일 업로드 플로우
    - 업로드 중 로딩 상태 표시 (placeholder with spinner)
    - 업로드 실패 시 에러 표시 + 재시도 버튼
    - 이미지 노드: `src` (R2 URL), `alt` (선택), `title` (선택)
  - 슬래시 메뉴에 `/image` 또는 `/이미지` 명령: 파일 선택 다이얼로그 열기
  - 이미지 크기: 에디터 폭에 맞춤, max-width 100%

  **Must NOT do**:
  - 이미지 리사이징 핸들 (Phase 2)
  - 이미지 캡션 (Phase 2)
  - base64 이미지를 JSON에 저장 (URL만)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`frontend-design`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (T7, T10 완료 후)
  - **Parallel Group**: Wave 2
  - **Blocks**: T15
  - **Blocked By**: T7, T10

  **References**:
  - `app/components/editor/ArticleEditor.tsx` (T7)
  - `app/routes/api.upload.tsx` (T10) — 업로드 API
  - `@tiptap/extension-image` 공식 문서

  **Acceptance Criteria**:
  - [ ] 이미지 드래그&드롭 → R2 업로드 → 에디터에 표시
  - [ ] 클립보드 붙여넣기 동작
  - [ ] 업로드 중 로딩 표시

  **QA Scenarios**:
  ```
  Scenario: 이미지 드래그&드롭 업로드
    Tool: Playwright
    Steps:
      1. ArticleEditor에 테스트 이미지 파일 드래그&드롭
      2. 로딩 표시 확인
      3. 업로드 완료 후 이미지 렌더링 확인
    Expected Result: 이미지가 에디터에 표시, src가 R2 URL
    Evidence: .sisyphus/evidence/task-11-drag-drop.png

  Scenario: 업로드 실패 처리
    Tool: Playwright
    Steps:
      1. 5MB 초과 이미지 드래그&드롭 시도
    Expected Result: 에러 메시지 표시, 에디터 상태 정상 유지
    Evidence: .sisyphus/evidence/task-11-upload-error.png
  ```

  **Commit**: YES
  - Message: `feat(editor): tiptap 이미지 확장 및 R2 업로드 통합`
  - Files: ArticleEditor 업데이트, 이미지 NodeView 컴포넌트
  - Pre-commit: `tsc --noEmit`

- [x] 12. 6곳 콘텐츠 소비 지점 업데이트

  **What to do**:
  - T4에서 만든 `getPlainText()` + `ContentRenderer`를 6곳에 적용:
    1. `app/components/SceneCard.tsx:47` — `record.content.substring(0,120)` → `getPlainText(record.content, record.format).substring(0,120)`
    2. `app/routes/_public.logs.$recordSlug.tsx:232-234` — `whitespace-pre-wrap` 직접 출력 → `<ContentRenderer content={record.content} format={record.format} />`
    3. `app/routes/_public.logs.$recordSlug.tsx:187` — meta description → `getPlainText().slice(0,150)`
    4. `app/routes/_public.logs._index.tsx` — meta description 동일 처리
    5. `app/routes/_admin.admin.records.$recordId.tsx:30` — admin preview → `getPlainText()`
    6. `app/routes/_public.search.tsx` — 검색 결과 snippet → `getPlainText()`
  - 모든 변경 후 기존 plain text 레코드가 여전히 올바르게 렌더링되는지 확인

  **Must NOT do**:
  - 기존 plain text 렌더링 깨뜨리기
  - ContentRenderer에서 직접 HTML 파싱 (Tiptap generateHTML만 사용)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 여러 파일 동시 수정, regression 위험
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (T4 완료 후)
  - **Parallel Group**: Wave 2
  - **Blocks**: T18, T20
  - **Blocked By**: T4

  **References**:
  - `app/components/SceneCard.tsx:47` — 현재 snippet
  - `app/routes/_public.logs.$recordSlug.tsx:187,232-234` — 현재 렌더링/meta
  - `app/routes/_admin.admin.records.$recordId.tsx:30` — admin preview
  - `app/lib/content.server.ts` (T4) — getPlainText, ContentRenderer

  **Acceptance Criteria**:
  - [ ] 6곳 모두 `getPlainText()` 또는 `ContentRenderer` 사용
  - [ ] plain text 레코드 정상 렌더링
  - [ ] JSON 레코드 (seed에 추가 후) 정상 렌더링

  **QA Scenarios**:
  ```
  Scenario: 기존 plain text 레코드 렌더링
    Tool: Playwright
    Steps:
      1. plain text 형식의 기록 상세 페이지 접근
      2. 본문 영역 확인
    Expected Result: whitespace-pre-wrap 스타일로 기존처럼 렌더링
    Evidence: .sisyphus/evidence/task-12-plaintext-render.png

  Scenario: SceneCard snippet 정상
    Tool: Playwright
    Steps:
      1. /logs 페이지 접근
      2. SceneCard의 본문 snippet 확인
    Expected Result: JSON 구조가 아닌 읽을 수 있는 텍스트 snippet
    Evidence: .sisyphus/evidence/task-12-scene-card.png
  ```

  **Commit**: YES
  - Message: `refactor(content): 6곳 콘텐츠 소비 지점에 ContentRenderer/getPlainText 적용`
  - Files: SceneCard.tsx, _public.logs.$recordSlug.tsx, _public.logs._index.tsx, _admin.admin.records.$recordId.tsx, _public.search.tsx
  - Pre-commit: `tsc --noEmit`

- [x] 13. 콘텐츠 유틸리티 단위 테스트

  **What to do**:
  - `app/lib/__tests__/content.server.test.ts` 생성:
    - `getPlainText` 테스트:
      - plain text 입력 → 그대로 반환
      - Tiptap JSON (paragraph) → 텍스트만 추출
      - Tiptap JSON (heading + paragraph + list) → 모든 텍스트 추출
      - 빈 문자열 → 빈 문자열
      - 잘못된 JSON → fallback으로 원본 반환
    - `detectContentFormat` 테스트:
      - Tiptap JSON → "json"
      - plain text → "plaintext"
      - `{`로 시작하는 plain text → "plaintext" (유효한 Tiptap JSON이 아님)
    - `renderContentToHtml` 테스트:
      - note + plain text → whitespace-pre-wrap div
      - article + Tiptap JSON → HTML 태그 포함

  **Must NOT do**:
  - E2E 테스트 (단위 테스트만)
  - 브라우저 환경 필요한 테스트

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (T1, T4 완료 후)
  - **Parallel Group**: Wave 2
  - **Blocks**: None
  - **Blocked By**: T1, T4

  **References**:
  - `app/lib/content.server.ts` (T4) — 테스트 대상
  - `vitest.config.ts` (T1) — 테스트 설정

  **Acceptance Criteria**:
  - [ ] `pnpm vitest run app/lib/__tests__/content.server.test.ts` → 모든 테스트 PASS

  **QA Scenarios**:
  ```
  Scenario: 콘텐츠 유틸리티 테스트 실행
    Tool: Bash
    Steps:
      1. `pnpm vitest run app/lib/__tests__/content.server.test.ts --reporter=verbose`
    Expected Result: 모든 테스트 PASS, 0 failures
    Evidence: .sisyphus/evidence/task-13-tests.txt
  ```

  **Commit**: YES
  - Message: `test(content): 콘텐츠 유틸리티 단위 테스트`
  - Files: `app/lib/__tests__/content.server.test.ts`
  - Pre-commit: `pnpm vitest run`

- [x] 14. Self-answer 생성 UI

  **What to do**:
  - `app/routes/_public.logs.$recordSlug.tsx`에 self-answer 액션 추가:
    - 기록의 작성자가 자기 기록에 달린 질문에 답변하는 UI
    - 질문 카드 하단에 "답변하기" 버튼 (작성자에게만 표시)
    - 클릭 시 textarea 폼 확장 (inline)
    - 제출: `selfAnswers` 테이블에 저장 (canonical storage)
  - `app/db/queries/selfAnswers.server.ts` 생성 (없으면):
    - `createSelfAnswer(db, { questionId, authorId, content })`
    - `getSelfAnswersByQuestion(db, questionId)`
  - `app/components/SelfAnswerCard.tsx` 생성:
    - editorial card 스타일 (말풍선 아님)
    - "자기 답변" 뱃지 표시
    - 작성 시간 표시

  **Must NOT do**:
  - 다른 사람의 질문에 self-answer (본인 기록의 질문에만)
  - self-answer 수정/삭제 (Phase 2)
  - 말풍선/채팅 UI

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: UI 컴포넌트 + Quiet Depth 디자인
  - **Skills**: [`frontend-design`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - `app/db/schema.server.ts` — selfAnswers 테이블 스키마
  - `app/routes/_public.logs.$recordSlug.tsx:300-400` — 현재 질문/응답 표시 영역
  - `app/components/ResponseCard.tsx` — 응답 카드 디자인 패턴
  - `app/components/QuestionCard.tsx` — 질문 카드 디자인
  - `.docs/frd.md` FR-010 — Self-answer 기능 요구사항

  **Acceptance Criteria**:
  - [ ] 기록 작성자에게 "답변하기" 버튼 표시
  - [ ] self-answer 제출 → selfAnswers 테이블 저장
  - [ ] self-answer가 질문 카드 아래에 editorial card로 표시

  **QA Scenarios**:
  ```
  Scenario: Self-answer 생성
    Tool: Playwright
    Steps:
      1. 인증된 사용자로 자기 기록 상세 페이지 접근
      2. 질문이 있는 기록에서 "답변하기" 버튼 확인
      3. 클릭 → textarea 표시
      4. "이 질문에 대한 답변입니다" 입력 → 제출
    Expected Result: self-answer가 질문 아래에 "자기 답변" 뱃지와 함께 표시
    Evidence: .sisyphus/evidence/task-14-self-answer.png

  Scenario: 타인 기록에서 답변 버튼 미표시
    Tool: Playwright
    Steps:
      1. 다른 사용자의 기록 상세 페이지 접근
      2. 질문 카드 영역 확인
    Expected Result: "답변하기" 버튼이 보이지 않음
    Evidence: .sisyphus/evidence/task-14-no-button.png
  ```

  **Commit**: YES
  - Message: `feat(dialogue): self-answer 생성 UI 및 표시`
  - Files: `_public.logs.$recordSlug.tsx`, `app/db/queries/selfAnswers.server.ts`, `app/components/SelfAnswerCard.tsx`
  - Pre-commit: `tsc --noEmit`

- [x] 15. Write 페이지 듀얼 모드 통합

  **What to do**:
  - `app/routes/_public.write.tsx` 대폭 수정:
    - `format` 선택 (Note/Article) 시 에디터 전환:
      - Note → `NoteEditor` (T6)
      - Article → `ArticleEditor` (T7, 슬래시/코드블록/이미지 포함)
    - Note 제출: content를 plain text로 저장, `contentText`도 동일 값
    - Article 제출: content를 Tiptap JSON 문자열로 저장, `contentText`에 `getPlainText()` 결과
    - hidden input으로 JSON 데이터 전달 또는 JavaScript로 form data 구성
    - action 함수에서 format에 따라 validation 분기
  - `app/lib/validation.ts` 수정:
    - `createRecordSchema` 확장: article format일 때 content가 유효한 JSON인지 확인
    - contentText 필드 추가

  **Must NOT do**:
  - 자동 저장
  - format 자동 전환 (사용자 수동 선택만)
  - client-side fetch (React Router form action 패턴 유지)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: 기존 write 페이지 대폭 수정, 듀얼 모드 통합 복잡
  - **Skills**: [`frontend-design`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: T16, T23, T27, T31, T32
  - **Blocked By**: T6, T7, T8, T9, T11

  **References**:
  - `app/routes/_public.write.tsx` — 현재 write 페이지 전체 (355줄)
  - `app/components/editor/NoteEditor.tsx` (T6)
  - `app/components/editor/ArticleEditor.tsx` (T7)
  - `app/lib/validation.ts` — createRecordSchema
  - `app/lib/content.server.ts` (T4) — getPlainText
  - `app/db/queries/records.server.ts` — createRecord

  **Acceptance Criteria**:
  - [ ] Note 선택 → NoteEditor 표시, 제출 시 plain text 저장
  - [ ] Article 선택 → ArticleEditor 표시, 제출 시 JSON 저장
  - [ ] contentText 필드 자동 채워짐
  - [ ] 기존 메타데이터 필드 (type, rhythm, visibility 등) 정상 동작

  **QA Scenarios**:
  ```
  Scenario: Note 모드 글 작성 및 저장
    Tool: Playwright
    Steps:
      1. /write 접근 (인증 필요)
      2. format "메모" 선택
      3. 제목 "테스트 메모" 입력
      4. NoteEditor에 "짧은 메모입니다" 입력
      5. 제출 버튼 클릭
    Expected Result: /logs/[slug]로 리다이렉트, 본문이 plain text로 렌더링
    Evidence: .sisyphus/evidence/task-15-note-write.png

  Scenario: Article 모드 리치 글 작성
    Tool: Playwright
    Steps:
      1. /write 접근
      2. format "글" 선택 → ArticleEditor 표시 확인
      3. 제목 "테스트 글" 입력
      4. "/" → "제목 1" → "소제목" 입력
      5. Enter → 본문 텍스트 입력
      6. "/" → "코드 블록" → JS 코드 입력
      7. 제출
    Expected Result: /logs/[slug]로 리다이렉트, heading + paragraph + code block 렌더링
    Evidence: .sisyphus/evidence/task-15-article-write.png
  ```

  **Commit**: YES
  - Message: `feat(write): 듀얼 모드 에디터 write 페이지 통합`
  - Files: `app/routes/_public.write.tsx`, `app/lib/validation.ts`
  - Pre-commit: `tsc --noEmit`

- [x] 16. 기록 수정 페이지

  **What to do**:
  - `app/routes/_public.logs.$recordSlug.edit.tsx` 신규 생성:
    - loader: 기록 조회 + 권한 확인 (작성자만 수정 가능)
    - 기존 content를 에디터에 로드:
      - Note: NoteEditor의 defaultValue로 전달
      - Article: ArticleEditor의 content prop으로 Tiptap JSON 전달
    - format 변경 허용? → 허용하되 경고 ("글 형식을 변경하면 서식이 사라질 수 있습니다")
    - action: record 업데이트, contentText 재계산
    - 성공 시 기록 상세 페이지로 리다이렉트
  - 기록 상세 페이지에 "수정" 링크 추가 (작성자에게만 표시)

  **Must NOT do**:
  - 버전 히스토리
  - 동시 편집 충돌 감지
  - 삭제 기능 (이미 있거나 별도)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: 기존 write 패턴 복제 + 수정 로직
  - **Skills**: [`frontend-design`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (T15 완료 후)
  - **Parallel Group**: Wave 3
  - **Blocks**: T23, T30, T31, T32, T33
  - **Blocked By**: T15

  **References**:
  - `app/routes/_public.write.tsx` (T15) — write 페이지 패턴
  - `app/routes/_public.logs.$recordSlug.tsx` — 기록 상세 (수정 링크 추가 대상)
  - `app/db/queries/records.server.ts` — updateRecord 함수 (없으면 생성)
  - `app/lib/auth.middleware.ts` — requireVerified

  **Acceptance Criteria**:
  - [ ] /logs/[slug]/edit 접근 → 기존 콘텐츠 로드
  - [ ] 수정 후 저장 → 변경 반영
  - [ ] 비작성자 접근 → 403 또는 리다이렉트

  **QA Scenarios**:
  ```
  Scenario: 기록 수정 및 저장
    Tool: Playwright
    Steps:
      1. 자기 기록 상세 페이지에서 "수정" 링크 클릭
      2. 제목 수정
      3. 본문에 내용 추가
      4. 저장
    Expected Result: 기록 상세로 리다이렉트, 수정 내용 반영
    Evidence: .sisyphus/evidence/task-16-edit.png

  Scenario: 비작성자 수정 시도
    Tool: Playwright
    Steps:
      1. 다른 사용자의 기록 /logs/[slug]/edit 직접 접근
    Expected Result: 403 에러 또는 기록 상세로 리다이렉트
    Evidence: .sisyphus/evidence/task-16-forbidden.png
  ```

  **Commit**: YES
  - Message: `feat(edit): 기록 수정 페이지 및 수정 링크`
  - Files: `app/routes/_public.logs.$recordSlug.edit.tsx`, `_public.logs.$recordSlug.tsx` (수정 링크), `app/db/queries/records.server.ts`
  - Pre-commit: `tsc --noEmit`

- [ ] 17. ⚠️ **T8에 통합됨** — 붙여넣기 정화는 T8 "ArticleEditor 전체 확장"의 일부로 실행됩니다. 이 태스크는 skip.

  아래는 원래 내용 (T8 실행 시 참고):
  - ArticleEditor에 paste 핸들러 설정:
    - 외부 소스(Google Docs, Notion 등) 붙여넣기 시 불필요한 스타일/속성 제거
    - 허용 노드: paragraph, heading, bold, italic, list, code, blockquote, image(URL만), hardBreak
    - font-size, color, background 등 인라인 스타일 제거
    - 이미지 붙여넣기: data:URL이면 R2 업로드로 전환
  - 콘텐츠 크기 제한:
    - JSON 크기 100KB 이하 (validation)
    - 글자 수 제한 표시 (Article도)

  **Must NOT do**:
  - 모든 서식 제거 (기본 서식은 유지)
  - HTML sanitizer 라이브러리 추가 (Tiptap의 내장 스키마 활용)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (T7 완료 후)
  - **Parallel Group**: Wave 3
  - **Blocks**: None
  - **Blocked By**: T7

  **References**:
  - `app/components/editor/ArticleEditor.tsx` (T7)
  - Tiptap pasteRules/inputRules 문서

  **Acceptance Criteria**:
  - [ ] Google Docs 텍스트 붙여넣기 → 기본 서식만 유지
  - [ ] 100KB 초과 콘텐츠 → 경고 메시지

  **QA Scenarios**:
  ```
  Scenario: 외부 콘텐츠 붙여넣기 정화
    Tool: Playwright
    Steps:
      1. ArticleEditor에 HTML 서식 포함 텍스트 클립보드 붙여넣기
      2. 에디터 내 DOM 확인
    Expected Result: font-size, color 등 인라인 스타일 없음, 기본 서식(bold 등)만 유지
    Evidence: .sisyphus/evidence/task-17-paste.png
  ```

  **Commit**: YES
  - Message: `feat(editor): 붙여넣기 정화 및 콘텐츠 크기 제한`
  - Files: ArticleEditor.tsx
  - Pre-commit: `tsc --noEmit`

- [x] 18. Seed 데이터 재생성

  **What to do**:
  - `seeds/seed.sql` 수정:
    - 기존 25개 레코드 중 5-8개를 Article format + Tiptap JSON content로 변경
    - JSON 콘텐츠에 heading, paragraph, code block, list 등 다양한 블록 포함
    - 나머지는 Note format + plain text 유지
    - 모든 레코드의 `content_text` 값 채우기
  - 태그 seed 데이터 추가: 5-8개 기본 태그 (예: "기술", "회고", "질문", "실험", "팀워크")
  - record_tags 연결 데이터 추가

  **Must NOT do**:
  - 기존 관계 데이터 (질문, 응답, 문장) 깨뜨리기
  - 영어 seed 데이터 (한국어 유지)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (T2, T12 완료 후)
  - **Parallel Group**: Wave 3
  - **Blocks**: None
  - **Blocked By**: T2, T12

  **References**:
  - `seeds/seed.sql` — 현재 seed 데이터
  - `app/db/schema.server.ts` — 스키마 (content_text, tags, record_tags)

  **Acceptance Criteria**:
  - [ ] `wrangler d1 execute DB --local --file=seeds/seed.sql` 성공
  - [ ] JSON 콘텐츠 레코드가 ContentRenderer로 정상 렌더링

  **QA Scenarios**:
  ```
  Scenario: Seed 적용 및 확인
    Tool: Bash
    Steps:
      1. `wrangler d1 migrations apply DB --local`
      2. `wrangler d1 execute DB --local --file=seeds/seed.sql`
      3. `wrangler d1 execute DB --local --command="SELECT id, format, length(content), length(content_text) FROM records WHERE format='article' LIMIT 5"`
    Expected Result: article 레코드의 content에 JSON, content_text에 추출된 텍스트
    Evidence: .sisyphus/evidence/task-18-seed.txt
  ```

  **Commit**: YES
  - Message: `chore(seed): JSON 콘텐츠 및 태그 seed 데이터 추가`
  - Files: `seeds/seed.sql`
  - Pre-commit: seed 적용 테스트

- [x] 19. Learners 목록 강화

  **What to do**:
  - `app/routes/_public.learners._index.tsx` 대폭 수정 (현재 35줄 스텁):
    - loader: learner_profiles 전체 조회 + 각 learner의 기록 수, 질문 수, 현재 stage
    - 필터링: cohort별 (URL param `?cohort=`)
    - 정렬: 최근 활동순 (마지막 기록 작성 시간)
    - LearnerCard 사용: 프로필보다 질문이 먼저 보이는 카드 (`.docs/design.md` 준수)
    - 빈 상태: "아직 Learner가 없습니다" + 안내
    - 반응형: 모바일 1열, 태블릿 2열, 데스크톱 3열

  **Must NOT do**:
  - "가장 활발한 Learner" 등 랭킹/비교
  - 기록 수 기반 정렬 (활동 시간 기반만)
  - 팔로우/구독 기능

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-design`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - `app/routes/_public.learners._index.tsx` — 현재 스텁
  - `app/components/LearnerCard.tsx` — 기존 카드 컴포넌트 (76줄)
  - `app/db/queries/learners.server.ts` — learner 쿼리 모듈
  - `.docs/design.md` — "프로필보다 질문이 먼저", "아바타는 보조"

  **Acceptance Criteria**:
  - [ ] /learners 페이지에 모든 learner 카드 표시
  - [ ] cohort 필터링 동작
  - [ ] 반응형 레이아웃

  **QA Scenarios**:
  ```
  Scenario: Learners 목록 표시
    Tool: Playwright
    Steps:
      1. /learners 접근
      2. LearnerCard 목록 확인
      3. 카드에서 질문이 이름보다 크게 표시되는지 확인
    Expected Result: learner 카드 리스트, 질문 중심 레이아웃
    Evidence: .sisyphus/evidence/task-19-learners.png
  ```

  **Commit**: YES
  - Message: `feat(learners): learners 목록 페이지 강화`
  - Files: `app/routes/_public.learners._index.tsx`, `app/db/queries/learners.server.ts`
  - Pre-commit: `tsc --noEmit`

- [x] 20. 검색 쿼리 content_text 전환

  **What to do**:
  - **`app/routes/_public.search.tsx:31-58` 수정** (메인 검색 로직이 여기에 인라인):
    - loader의 records 검색 쿼리에서 `content` 대신 `content_text` 컬럼에 LIKE
    - 검색 결과 snippet도 `content_text`에서 추출 (`getPlainText` 활용)
    - 제목(title) 검색은 유지
  - `app/db/queries/search.server.ts` 수정 (존재하면):
    - `searchAll()` 함수도 `content_text` 사용으로 전환
  - `app/db/queries/records.server.ts` 수정:
    - createRecord, updateRecord에서 `contentText` 필드 필수 설정

  **Must NOT do**:
  - FTS5 설정 (현재 LIKE 쿼리 유지)
  - 검색 랭킹/점수

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (T2, T12 완료 후)
  - **Parallel Group**: Wave 4
  - **Blocks**: None
  - **Blocked By**: T2, T12

  **References**:
  - `app/routes/_public.search.tsx:31-58` — **메인 검색 로직 (인라인 쿼리)** ← 핵심 수정 대상
  - `app/db/queries/search.server.ts` — 쿼리 모듈 (사용 여부 확인 필요)
  - `app/db/queries/records.server.ts` — createRecord

  **Acceptance Criteria**:
  - [ ] JSON 콘텐츠 기록에서 텍스트 검색 가능
  - [ ] 검색 결과 snippet이 readable text

  **QA Scenarios**:
  ```
  Scenario: JSON 기록 검색
    Tool: Playwright
    Steps:
      1. Article 형식으로 "Cloudflare Workers" 포함 글 작성
      2. /search?q=Cloudflare 접근
    Expected Result: 해당 기록이 검색 결과에 표시, snippet이 readable
    Evidence: .sisyphus/evidence/task-20-search.png
  ```

  **Commit**: YES
  - Message: `refactor(search): content_text 컬럼 기반 검색 전환`
  - Files: `app/db/queries/search.server.ts`, `app/db/queries/records.server.ts`
  - Pre-commit: `tsc --noEmit`

- [x] 21. 연결된 기록 표시 개선

  **What to do**:
  - `app/routes/_public.logs.$recordSlug.tsx`의 연결된 기록 섹션 강화:
    - 현재 linkedRecordId 기반 표시를 더 풍부하게
    - 양방향 연결: 이 기록이 참조하는 기록 + 이 기록을 참조하는 기록
    - SceneCard로 표시 (기존 컴포넌트 재사용)
    - "연결된 기록" 섹션 헤더 + 연결 이유 (있으면)
  - `app/db/queries/records.server.ts`에 양방향 연결 쿼리 추가

  **Must NOT do**:
  - 자동 연결 추천 ("유사한 기록" 등)
  - 그래프 시각화

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-design`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - `app/routes/_public.logs.$recordSlug.tsx` — 현재 연결된 기록 표시
  - `app/db/schema.server.ts` — `linkedRecordId` 필드
  - `app/components/SceneCard.tsx`

  **Acceptance Criteria**:
  - [ ] 양방향 연결된 기록 표시
  - [ ] SceneCard로 렌더링

  **QA Scenarios**:
  ```
  Scenario: 연결된 기록 양방향 표시
    Tool: Playwright
    Steps:
      1. linkedRecordId가 설정된 기록 상세 접근
      2. "연결된 기록" 섹션 확인
    Expected Result: 연결된 기록이 SceneCard로 표시
    Evidence: .sisyphus/evidence/task-21-linked.png
  ```

  **Commit**: YES
  - Message: `feat(records): 연결된 기록 양방향 표시 개선`
  - Files: `_public.logs.$recordSlug.tsx`, `records.server.ts`
  - Pre-commit: `tsc --noEmit`

- [x] 22. 태그 Admin CRUD UI

  **What to do**:
  - `app/routes/_admin.admin.tags.tsx` 생성:
    - loader: 모든 태그 목록 (사용 횟수 포함)
    - 태그 목록 테이블: name, slug, description, color, 사용 횟수, 생성일
    - 태그 추가 폼: name, description, color (컬러 피커)
    - 태그 수정: 인라인 편집
    - 태그 삭제: 확인 다이얼로그 (사용 중인 태그는 경고)
  - `app/db/queries/tags.server.ts` 생성:
    - `getAllTags`, `createTag`, `updateTag`, `deleteTag`, `getTagUsageCount`
  - Admin 사이드바에 "태그 관리" 메뉴 추가

  **Must NOT do**:
  - 태그 계층 구조 (flat list만)
  - 사용자 태그 생성 API

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-design`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (T3 완료 후)
  - **Parallel Group**: Wave 4
  - **Blocks**: T24
  - **Blocked By**: T3

  **References**:
  - `app/routes/_admin.admin.dialogue._index.tsx` — Admin 페이지 패턴 (46줄)
  - `app/components/admin/AdminSidebar.tsx` — 사이드바 메뉴
  - `.docs/admin.md` — Admin 디자인 원칙 (utilitarian, dense, neutral)
  - `app/db/schema.server.ts` — tags 테이블 (T3)

  **Acceptance Criteria**:
  - [ ] /admin/tags 페이지에서 태그 CRUD 가능
  - [ ] Admin 사이드바에 메뉴 추가

  **QA Scenarios**:
  ```
  Scenario: 태그 생성
    Tool: Playwright
    Steps:
      1. /admin/tags 접근
      2. "태그 추가" 폼에 name="기술", description="기술 관련 기록" 입력
      3. 제출
    Expected Result: 태그 목록에 "기술" 추가
    Evidence: .sisyphus/evidence/task-22-tag-create.png
  ```

  **Commit**: YES
  - Message: `feat(admin): 태그 관리 CRUD UI`
  - Files: `app/routes/_admin.admin.tags.tsx`, `app/db/queries/tags.server.ts`, `AdminSidebar.tsx`
  - Pre-commit: `tsc --noEmit`

- [x] 23. Write/Edit 페이지 태그 선택

  **What to do**:
  - Write 페이지와 Edit 페이지에 태그 선택 UI 추가:
    - Admin이 생성한 태그 목록을 chip/pill 형태로 표시
    - 다중 선택 가능 (클릭으로 토글)
    - 선택된 태그는 하이라이트
    - 제출 시 `record_tags` junction 테이블에 저장
  - Edit 시 기존 태그 사전 선택 상태로 로드
  - `app/db/queries/records.server.ts` — createRecord/updateRecord에 태그 연결 로직

  **Must NOT do**:
  - 태그 생성 (선택만)
  - 태그 검색/필터 (전체 표시)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (T3, T15, T16 완료 후)
  - **Parallel Group**: Wave 4
  - **Blocks**: None
  - **Blocked By**: T3, T15, T16

  **References**:
  - `app/routes/_public.write.tsx` (T15)
  - `app/routes/_public.logs.$recordSlug.edit.tsx` (T16)
  - `.docs/design.md` — "segmented control 또는 chip group"

  **Acceptance Criteria**:
  - [ ] Write/Edit에서 태그 선택 가능
  - [ ] 저장 후 record_tags에 연결 저장
  - [ ] Edit 시 기존 태그 선택 상태 로드

  **QA Scenarios**:
  ```
  Scenario: 글 작성 시 태그 선택
    Tool: Playwright
    Steps:
      1. /write 접근
      2. 태그 섹션에서 "기술", "회고" 태그 클릭
      3. 글 작성 후 제출
      4. 기록 상세에서 태그 표시 확인
    Expected Result: 선택한 태그가 기록에 연결되어 표시
    Evidence: .sisyphus/evidence/task-23-tags.png
  ```

  **Commit**: YES
  - Message: `feat(write): 태그 선택 UI 및 저장`
  - Files: `_public.write.tsx`, `_public.logs.$recordSlug.edit.tsx`, `records.server.ts`
  - Pre-commit: `tsc --noEmit`

- [x] 24. 태그 브라우징 페이지

  **What to do**:
  - `app/routes/_public.tags.tsx` 생성: 전체 태그 목록 + 태그별 기록 수
  - `app/routes/_public.tags.$tagSlug.tsx` 생성: 특정 태그의 기록 목록
    - SceneCard 리스트로 표시
    - 정렬: 최신순
    - 페이지네이션 또는 "더 보기"
  - GlobalNav에 필요 시 태그 링크 추가 (또는 /logs 내 필터로)
  - 기록 상세 페이지에서 태그 클릭 → 해당 태그 페이지로 이동

  **Must NOT do**:
  - 태그 클라우드 (균등 표시)
  - 인기 태그 랭킹

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-design`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (T3, T22 완료 후)
  - **Parallel Group**: Wave 4
  - **Blocks**: None
  - **Blocked By**: T3, T22

  **References**:
  - `app/routes/_public.logs._index.tsx` — 기록 목록 패턴
  - `app/components/SceneCard.tsx`
  - `app/db/queries/tags.server.ts` (T22)

  **Acceptance Criteria**:
  - [ ] /tags 페이지에 태그 목록 + 기록 수
  - [ ] /tags/[slug]에 해당 태그 기록 목록

  **QA Scenarios**:
  ```
  Scenario: 태그 브라우징
    Tool: Playwright
    Steps:
      1. /tags 접근
      2. "기술" 태그 클릭
      3. 해당 태그의 기록 목록 확인
    Expected Result: "기술" 태그가 달린 기록만 필터된 SceneCard 리스트
    Evidence: .sisyphus/evidence/task-24-tag-browse.png
  ```

  **Commit**: YES
  - Message: `feat(tags): 태그 브라우징 페이지`
  - Files: `app/routes/_public.tags.tsx`, `app/routes/_public.tags.$tagSlug.tsx`
  - Pre-commit: `tsc --noEmit`

- [x] 25. /me 여정 타임라인 뷰 ★T26 통합★

  > **통합 범위**: 여정 타임라인(구 T25) + Stage별 기록 분포(구 T26). 둘 다 /me 페이지 수정하므로 통합.

  **What to do**:
  - `app/routes/_public.me.tsx` 수정 (현재 167줄):
    - 새 섹션 "나의 여정" 추가:
      - Stage별로 그룹핑된 내 기록 타임라인
      - 각 Stage: 이름 + 기간 + 내 기록 목록 (SceneCard mini 버전)
      - 현재 Stage 강조 (진한 톤)
      - 과거 Stage: 채도 낮게
      - 미래 Stage: outline 위주
    - 기록이 없는 Stage도 표시 (빈 상태 안내: "아직 이 단계에서 기록이 없습니다")
    - Stage 톤 매핑 적용 (Prelude=Mist, Bridge=Cyan 등)

  **Must NOT do**:
  - 진행률 퍼센트, 스트릭
  - 다른 learner와 비교
  - 차트/그래프 (텍스트 + 카드 기반)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-design`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - `app/routes/_public.me.tsx` — 현재 /me 페이지
  - `app/components/StageStrip.tsx` — Stage 시각화 패턴
  - `.docs/design.md` — Journey Strip 디자인, Stage Tone Mapping
  - `.docs/frd.md` — FR-014 My Space

  **Acceptance Criteria**:
  - [ ] /me에 Stage별 기록 타임라인 표시
  - [ ] Stage 톤 매핑 적용
  - [ ] 빈 Stage 안내 표시

  **QA Scenarios**:
  ```
  Scenario: 여정 타임라인 표시
    Tool: Playwright
    Steps:
      1. 인증 후 /me 접근
      2. "나의 여정" 섹션 확인
      3. Stage별 기록 그룹핑 확인
    Expected Result: Stage 이름 아래 해당 기록 카드, 톤 매핑 적용
    Evidence: .sisyphus/evidence/task-25-timeline.png
  ```

  **Commit**: YES
  - Message: `feat(me): 개인 여정 타임라인 뷰`
  - Files: `app/routes/_public.me.tsx`, `app/db/queries/records.server.ts`
  - Pre-commit: `tsc --noEmit`

- [ ] 26. ⚠️ **T25에 통합됨** — Stage별 분포는 T25 "/me 여정 타임라인 + 분포"의 일부로 실행됩니다. 이 태스크는 skip.

  아래는 원래 내용 (T25 실행 시 참고):

  **What to do**:
  - /me 페이지에 "기록 분포" 미니 섹션 추가:
    - 각 Stage의 기록 수를 수평 바(bar)로 시각화
    - 바 색상: Stage 톤 매핑
    - 숫자 레이블: "3개의 기록"
    - 전체 기록 수 요약
    - 질문/응답/문장 수 요약 (심플한 수치)
  - 쿼리: Stage별 records count, questions count, responses count

  **Must NOT do**:
  - Chart.js 등 차트 라이브러리 (CSS 바만)
  - 성장률, 트렌드 그래프
  - 랭킹/비교

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-design`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - `app/routes/_public.me.tsx` (T25에서 수정)
  - `.docs/design.md` — Stage Tone Mapping

  **Acceptance Criteria**:
  - [ ] Stage별 기록 수 바 차트 표시
  - [ ] 전체 요약 수치 표시

  **QA Scenarios**:
  ```
  Scenario: 기록 분포 표시
    Tool: Playwright
    Steps:
      1. /me 접근
      2. "기록 분포" 섹션 확인
    Expected Result: Stage별 수평 바 + 숫자, 톤 매핑 색상 적용
    Evidence: .sisyphus/evidence/task-26-distribution.png
  ```

  **Commit**: YES (T25와 합칠 수 있음)
  - Message: `feat(me): stage별 기록 분포 시각화`
  - Files: `app/routes/_public.me.tsx`
  - Pre-commit: `tsc --noEmit`

- [x] 27. 리치 콘텐츠 문장 하이라이팅

  **What to do**:
  - 기존 sentence(하이라이트 문장) 기능을 리치 콘텐츠에서도 동작하도록:
    - Article 형식 기록 상세에서 텍스트 선택 → "문장 저장" 플로팅 버튼
    - 선택된 텍스트를 sentences 테이블에 저장
    - 리치 콘텐츠에서 텍스트 선택 시 plain text만 추출
  - ContentRenderer에서 하이라이트된 문장 표시 (배경 하이라이트)

  **Must NOT do**:
  - 블록 단위 하이라이팅 (텍스트 범위만)
  - 하이라이트 색상 커스터마이징

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (T4, T15 완료 후)
  - **Parallel Group**: Wave 4
  - **Blocks**: None
  - **Blocked By**: T4, T15

  **References**:
  - `app/routes/_public.logs.$recordSlug.tsx` — 현재 문장 저장 UI
  - `app/db/queries/sentences.server.ts`
  - `app/components/HighlightedSentenceCard.tsx`
  - `app/components/ContentRenderer.tsx` (T4)

  **Acceptance Criteria**:
  - [ ] Article 기록에서 텍스트 선택 → 문장 저장 가능
  - [ ] 저장된 문장이 ContentRenderer에서 하이라이트 표시

  **QA Scenarios**:
  ```
  Scenario: 리치 콘텐츠에서 문장 하이라이트
    Tool: Playwright
    Steps:
      1. Article 기록 상세 접근
      2. 본문 텍스트 일부 선택
      3. "문장 저장" 버튼 클릭
      4. 이유 입력 후 저장
    Expected Result: 해당 문장이 하이라이트 배경으로 표시
    Evidence: .sisyphus/evidence/task-27-highlight.png
  ```

  **Commit**: YES
  - Message: `feat(sentences): 리치 콘텐츠 문장 하이라이팅`
  - Files: ContentRenderer.tsx, _public.logs.$recordSlug.tsx
  - Pre-commit: `tsc --noEmit`

- [x] 28. 여정 활동 피드 + 홈 통합 ★T29 통합★

  > **통합 범위**: 활동 피드 컴포넌트(구 T28) + 홈페이지 통합(구 T29). 의존 관계이므로 통합.

  **What to do**:
  - `app/components/ActivityFeed.tsx` 생성:
    - Journey-level 요약 피드 (개인 활동 수준 아님)
    - 항목 유형: 새 기록 작성됨, 새 질문, 새 응답/공명, 협업 유닛 형성, Stage 전환
    - 시간 기반 그룹핑: "오늘", "이번 주", "지난 주"
    - 각 항목: 아이콘 + 요약 텍스트 + 시간
    - 요약 형태: "이번 주 3개의 새 기록이 남겨졌습니다" (개인 특정 X)
    - Quiet Depth 스타일: 조용하고 절제된 디자인, 넉넉한 여백
  - `app/db/queries/activity.server.ts` 생성:
    - `getRecentActivity(db, { limit, since })`: records, questions, responses, collaborations 최근 활동 집계

  **Must NOT do**:
  - 개인별 활동 노출 ("X님이 기록을 작성했습니다" X)
  - 실시간 업데이트 (page-load 시점만)
  - "가장 활발한" 표시
  - 기록 수 비교

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-design`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 5
  - **Blocks**: T29
  - **Blocked By**: None

  **References**:
  - `.docs/operational-principles.md` — 알림 원칙 ("맥락 중심, 과도한 실시간성 피함")
  - `.docs/design.md` — Quiet Depth 원칙
  - `.docs/prd.md` — "Belonging without Competition"

  **Acceptance Criteria**:
  - [ ] ActivityFeed 컴포넌트 렌더링
  - [ ] journey-level 요약 (개인 특정 안 함)
  - [ ] 시간별 그룹핑

  **QA Scenarios**:
  ```
  Scenario: 활동 피드 표시
    Tool: Playwright
    Steps:
      1. 홈 페이지 접근
      2. 활동 피드 섹션 확인
      3. 개인 특정 내용 없는지 확인
    Expected Result: "이번 주 N개의 새 기록" 등 journey-level 요약 표시
    Evidence: .sisyphus/evidence/task-28-activity-feed.png

  Scenario: 개인 활동 미노출 확인
    Tool: Playwright (evaluate)
    Steps:
      1. 활동 피드 DOM에서 사용자명 검색
    Expected Result: 특정 사용자명이 활동 피드에 노출되지 않음
    Evidence: .sisyphus/evidence/task-28-no-personal.txt
  ```

  **Commit**: YES
  - Message: `feat(activity): 여정 활동 피드 컴포넌트`
  - Files: `app/components/ActivityFeed.tsx`, `app/db/queries/activity.server.ts`
  - Pre-commit: `tsc --noEmit`

- [ ] 29. ⚠️ **T28에 통합됨** — 홈페이지 통합은 T28 "활동 피드 + 홈 통합"의 일부로 실행됩니다. 이 태스크는 skip.

  아래는 원래 내용 (T28 실행 시 참고):

  **What to do**:
  - `app/routes/_public._index.tsx` 수정:
    - loader에 `getRecentActivity` 쿼리 추가
    - 기존 "최근 기록" 섹션 아래 또는 옆에 ActivityFeed 배치
    - 홈페이지 레이아웃에 자연스럽게 통합 (별도 카드 또는 사이드바)
    - "여정에서 일어나는 일" 섹션 헤더

  **Must NOT do**:
  - 홈페이지 레이아웃 대폭 변경
  - 기존 섹션 (hero, journey timeline, questions 등) 제거

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-design`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (T28 완료 후)
  - **Parallel Group**: Wave 5
  - **Blocks**: None
  - **Blocked By**: T28

  **References**:
  - `app/routes/_public._index.tsx` — 현재 홈 (487줄)
  - `app/components/ActivityFeed.tsx` (T28)

  **Acceptance Criteria**:
  - [ ] 홈페이지에 활동 피드 섹션 통합

  **QA Scenarios**:
  ```
  Scenario: 홈페이지 활동 피드
    Tool: Playwright
    Steps:
      1. / 접근
      2. "여정에서 일어나는 일" 또는 유사 섹션 확인
    Expected Result: ActivityFeed 컴포넌트가 홈에 표시
    Evidence: .sisyphus/evidence/task-29-home-feed.png
  ```

  **Commit**: YES
  - Message: `feat(home): 홈페이지 여정 활동 피드 통합`
  - Files: `app/routes/_public._index.tsx`
  - Pre-commit: `tsc --noEmit`

- [x] 30. R2 이미지 orphan 정리 (edit-time only)

  **What to do**:
  - **기록 수정 시 제거된 이미지 정리만 구현** (현재 코드베이스에 record 삭제 경로가 없으므로 delete-time cleanup은 제외):
    - 수정 전/후 Tiptap JSON diff → 제거된 image src 추출
    - 각 이미지 URL에서 R2 key 추출
    - `R2.delete(key)` 호출
  - `app/lib/r2-cleanup.server.ts` 유틸리티 생성:
    - `extractImageKeys(tiptapJson: string): string[]` — JSON에서 이미지 R2 키 추출
    - `cleanupRemovedImages(env: Env, oldKeys: string[], newKeys: string[])` — diff 기반 삭제
  - T16 (기록 수정) action에서 호출
  - Note 형식 기록은 이미지가 없으므로 skip

  **Must NOT do**:
  - 기록 삭제 시 cleanup (현재 삭제 경로 없음 — 추후 삭제 기능 추가 시 연동)
  - 주기적 GC 배치 작업
  - 다른 기록에서 같은 이미지 참조 가능성 고려 (각 기록별 독립 이미지)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (T10, T16 완료 후)
  - **Parallel Group**: Wave 5
  - **Blocks**: None
  - **Blocked By**: T10, T16

  **References**:
  - `app/routes/api.upload.tsx` (T10) — R2 키 패턴
  - `app/routes/_public.logs.$recordSlug.edit.tsx` (T16) — 수정 action
  - Cloudflare R2 API — `R2.delete(key)`

  **Acceptance Criteria**:
  - [ ] 기록 수정 시 제거된 이미지가 R2에서 삭제됨
  - [ ] `extractImageKeys()` 유틸리티 정상 동작
  - [ ] 이미지가 추가만 된 경우 삭제 없음

  **QA Scenarios**:
  ```
  Scenario: 기록 수정 시 이미지 정리
    Tool: Bash (vitest)
    Steps:
      1. `pnpm vitest run app/lib/__tests__/r2-cleanup.test.ts`
      2. extractImageKeys: Tiptap JSON에서 image src 추출 확인
      3. cleanupRemovedImages: old=[a,b,c] new=[a,c] → b 삭제 확인
    Expected Result: diff 기반으로 제거된 이미지만 삭제
    Evidence: .sisyphus/evidence/task-30-cleanup.txt

  Scenario: 이미지 추가만 시 삭제 없음
    Tool: Bash (vitest)
    Steps:
      1. old=[] new=[a,b] 케이스 테스트
    Expected Result: 삭제 호출 없음
    Evidence: .sisyphus/evidence/task-30-no-delete.txt
  ```

  **Commit**: YES
  - Message: `feat(r2): 기록 삭제/수정 시 orphan 이미지 정리`
  - Files: 관련 route action 함수들
  - Pre-commit: `tsc --noEmit`

- [x] 31. beforeunload 미저장 경고

  **What to do**:
  - Write 페이지와 Edit 페이지에 `beforeunload` 이벤트 리스너:
    - 에디터에 변경사항이 있고 저장되지 않았으면 브라우저 기본 경고 표시
    - NoteEditor: 초기값과 현재값 비교
    - ArticleEditor: 초기 JSON과 현재 JSON 비교
    - 폼 제출 성공 시 경고 해제
  - React Router navigation 시에도 감지 (`useBlocker` 또는 유사)

  **Must NOT do**:
  - 커스텀 모달 (브라우저 기본 confirm 사용)
  - 자동 저장 (AGENTS.md 금지)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (T15, T16 완료 후)
  - **Parallel Group**: Wave 5
  - **Blocks**: None
  - **Blocked By**: T15, T16

  **References**:
  - `app/routes/_public.write.tsx` (T15)
  - `app/routes/_public.logs.$recordSlug.edit.tsx` (T16)
  - React Router `useBlocker` 또는 `unstable_usePrompt` API

  **Acceptance Criteria**:
  - [ ] 수정 중 페이지 이탈 시 경고
  - [ ] 저장 성공 후 경고 없음

  **QA Scenarios**:
  ```
  Scenario: 미저장 경고 표시
    Tool: Playwright
    Steps:
      1. /write 접근
      2. 에디터에 내용 입력
      3. 브라우저 뒤로 가기 시도
    Expected Result: 브라우저 확인 다이얼로그 표시
    Evidence: .sisyphus/evidence/task-31-beforeunload.png
  ```

  **Commit**: YES
  - Message: `feat(editor): 미저장 변경사항 이탈 경고`
  - Files: write.tsx, edit.tsx
  - Pre-commit: `tsc --noEmit`

- [x] 32. 에디터 키보드 단축키 + UX 폴리시

  **What to do**:
  - ArticleEditor 키보드 단축키:
    - `Cmd/Ctrl+B`: Bold
    - `Cmd/Ctrl+I`: Italic
    - `Cmd/Ctrl+U`: Underline
    - `Cmd/Ctrl+E`: Code (inline)
    - `Cmd/Ctrl+Shift+H`: Highlight
    - `Cmd/Ctrl+Enter`: 폼 제출 (저장)
  - UX 폴리시:
    - 에디터 전환 애니메이션 (Note ↔ Article, subtle fade)
    - placeholder 안내 텍스트 개선
    - 빈 에디터 상태 디자인
    - 에디터 포커스 시 border 색상 전환
    - 접근성: 모든 인터랙티브 요소 44px+ 타겟

  **Must NOT do**:
  - 화려한 애니메이션 (subtle만)
  - 키보드 단축키 도움말 모달 (tooltip만)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-design`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (T15, T16 완료 후)
  - **Parallel Group**: Wave 5
  - **Blocks**: None
  - **Blocked By**: T15, T16

  **References**:
  - 모든 에디터 컴포넌트
  - `.docs/design.md` — 모션 가이드, 접근성

  **Acceptance Criteria**:
  - [ ] Cmd+B/I/U 동작
  - [ ] Cmd+Enter로 폼 제출
  - [ ] 접근성 타겟 44px+

  **QA Scenarios**:
  ```
  Scenario: 키보드 단축키
    Tool: Playwright
    Steps:
      1. ArticleEditor에서 텍스트 선택
      2. Cmd+B 입력
    Expected Result: 선택 텍스트 Bold 적용
    Evidence: .sisyphus/evidence/task-32-shortcuts.png
  ```

  **Commit**: YES
  - Message: `feat(editor): 키보드 단축키 및 UX 폴리시`
  - Files: 에디터 컴포넌트들
  - Pre-commit: `tsc --noEmit`

- [x] 33. 에디터 + 콘텐츠 통합 테스트

  **What to do**:
  - 통합 테스트 작성:
    - Note 작성 → 저장 → 검색 → 렌더링 전체 플로우
    - Article 작성 (이미지+코드블록) → 저장 → 검색 → 렌더링
    - 기록 수정 → contentText 업데이트 확인
    - 기존 plain text 기록 → ContentRenderer 정상 렌더링
    - 잘못된 JSON content → graceful fallback
  - R2 업로드 관련 테스트:
    - 유효한 이미지 → 업로드 성공
    - 잘못된 파일 타입 → 거부
    - 크기 초과 → 거부

  **Must NOT do**:
  - 브라우저 E2E (Playwright는 T36에서)
  - 성능 벤치마크

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (T15, T16 완료 후)
  - **Parallel Group**: Wave 5
  - **Blocks**: None
  - **Blocked By**: T15, T16

  **References**:
  - 모든 에디터/콘텐츠 관련 파일
  - `vitest.config.ts` (T1)

  **Acceptance Criteria**:
  - [ ] `pnpm vitest run` → 모든 통합 테스트 PASS

  **QA Scenarios**:
  ```
  Scenario: 전체 테스트 실행
    Tool: Bash
    Steps:
      1. `pnpm vitest run --reporter=verbose`
    Expected Result: 모든 테스트 PASS
    Evidence: .sisyphus/evidence/task-33-integration-tests.txt
  ```

  **Commit**: YES
  - Message: `test(integration): 에디터 및 콘텐츠 통합 테스트`
  - Files: test 파일들
  - Pre-commit: `pnpm vitest run`

---

## Final Verification Wave

> 4 review agents run in PARALLEL. ALL must APPROVE. Rejection → fix → re-run.

- [x] T34. **Plan Compliance Audit** — `deep`

  **What to do**: Plan의 "Must Have" 10개, "Must NOT Have" 12개를 하나씩 검증.

  **QA Scenarios**:
  ```
  Scenario: Must Have 검증
    Tool: Bash + Grep
    Steps:
      1. Must Have 목록을 순회하며 각 항목의 구현 파일 존재 확인:
         - `ls app/components/editor/ArticleEditor.tsx` → 존재 확인
         - `ls app/components/editor/NoteEditor.tsx` → 존재 확인
         - `ls app/routes/api.upload.tsx` → 존재 확인
         - `ls app/routes/_public.logs.*.edit.tsx` → 존재 확인
         - `ls app/components/SelfAnswerCard.tsx` → 존재 확인
         - `ls app/routes/_public.tags.tsx` → 존재 확인
      2. 각 파일이 비어있지 않은지 확인 (wc -l > 10)
    Expected Result: 모든 Must Have 항목의 구현 파일 존재, 10줄 이상
    Evidence: .sisyphus/evidence/task-34-must-have.txt

  Scenario: Must NOT Have 검증
    Tool: Grep
    Steps:
      1. `grep -r "as any" app/ --include="*.ts" --include="*.tsx"` → 0 결과
      2. `grep -r "@ts-ignore" app/ --include="*.ts" --include="*.tsx"` → 0 결과
      3. `grep -r "autoSave\|auto_save\|autosave" app/ --include="*.ts" --include="*.tsx"` → 0 결과
      4. `grep -r "base64" app/components/editor/ --include="*.ts" --include="*.tsx"` → 0 결과
    Expected Result: 금지 패턴 0개 발견
    Evidence: .sisyphus/evidence/task-34-must-not-have.txt

  Scenario: Evidence 파일 존재 확인
    Tool: Bash
    Steps:
      1. `ls .sisyphus/evidence/ | wc -l`
    Expected Result: 30개 이상 evidence 파일 존재
    Evidence: .sisyphus/evidence/task-34-evidence-check.txt
  ```

  **Commit**: NO

- [x] T35. **Code Quality Review** — `unspecified-high`

  **What to do**: 빌드, 타입, 테스트, 코드 품질 전체 검증.

  **QA Scenarios**:
  ```
  Scenario: 빌드 + 타입 체크
    Tool: Bash
    Steps:
      1. `pnpm build 2>&1` → exit code 0 확인
      2. `tsc --noEmit 2>&1` → exit code 0 확인
    Expected Result: 빌드 성공, 타입 에러 0개
    Evidence: .sisyphus/evidence/task-35-build.txt

  Scenario: 테스트 실행
    Tool: Bash
    Steps:
      1. `pnpm vitest run --reporter=verbose 2>&1`
    Expected Result: 모든 테스트 PASS, 0 failures
    Evidence: .sisyphus/evidence/task-35-tests.txt

  Scenario: 금지 패턴 스캔
    Tool: Grep
    Steps:
      1. `grep -rn "as any\|@ts-ignore\|@ts-expect-error" app/ --include="*.ts" --include="*.tsx"`
      2. `grep -rn "console\.log" app/routes/ app/db/ app/lib/ --include="*.ts" --include="*.tsx"` (테스트 파일 제외)
      3. `grep -rn "catch.*{}" app/ --include="*.ts" --include="*.tsx"` (빈 catch)
    Expected Result: 금지 패턴 0개
    Evidence: .sisyphus/evidence/task-35-quality.txt
  ```

  **Commit**: NO

- [x] T36. **Real Manual QA** — `unspecified-high` (+ `playwright` skill)

  **What to do**: Playwright로 전체 사용자 플로우 E2E 검증.

  **QA Scenarios**:
  ```
  Scenario: Note 작성 → 저장 → 검색 → 수정 통합 플로우
    Tool: Playwright
    Steps:
      1. /write 접근 (인증 세션 사용)
      2. format "메모" 선택, 제목 "QA 테스트 메모", 본문 "테스트 콘텐츠" 입력
      3. 제출 → 리다이렉트 확인
      4. /search?q=테스트 접근 → 결과에 "QA 테스트 메모" 존재 확인
      5. 기록 상세에서 "수정" 링크 클릭
      6. 제목을 "수정된 메모"로 변경 → 저장
      7. 기록 상세에서 "수정된 메모" 표시 확인
    Expected Result: 전체 플로우 정상 동작
    Evidence: .sisyphus/evidence/final-qa/note-flow.png

  Scenario: Article 작성 (이미지+코드블록) → 렌더링 → 수정
    Tool: Playwright
    Steps:
      1. /write → format "글" → ArticleEditor 표시 확인
      2. 제목 입력, "/" → 제목 1 → 텍스트, "/" → 코드 블록 → JS 코드
      3. 이미지 파일 드래그&드롭 (또는 파일 선택)
      4. 제출 → 기록 상세에서 heading + code + image 렌더링 확인
      5. 수정 → 본문 변경 → 저장 → 변경 반영 확인
    Expected Result: 리치 콘텐츠 전체 플로우 정상
    Evidence: .sisyphus/evidence/final-qa/article-flow.png

  Scenario: Self-answer + 태그 + 타임라인 통합
    Tool: Playwright
    Steps:
      1. 자기 기록의 질문에 self-answer 작성
      2. /tags 접근 → 태그 목록 확인 → 태그 클릭 → 필터된 기록
      3. /me 접근 → 여정 타임라인 표시 확인
    Expected Result: 각 기능 정상 동작
    Evidence: .sisyphus/evidence/final-qa/features.png

  Scenario: Edge cases
    Tool: Playwright
    Steps:
      1. 빈 에디터 제출 시도 → validation 에러 확인
      2. 100KB 초과 콘텐츠 → 크기 제한 경고
      3. 비인증 상태에서 /write 접근 → 리다이렉트
    Expected Result: 모든 에러 케이스 graceful 처리
    Evidence: .sisyphus/evidence/final-qa/edge-cases.png
  ```

  **Commit**: NO

- [x] T37. **Scope Fidelity Check** — `deep`

  **What to do**: 모든 태스크의 spec vs 실제 구현 1:1 검증.

  **QA Scenarios**:
  ```
  Scenario: 태스크별 구현 확인
    Tool: Bash (git diff + grep)
    Steps:
      1. `git log --oneline` → 각 커밋 메시지가 태스크 커밋 전략과 일치 확인
      2. 각 태스크의 "Files" 목록과 실제 변경 파일 비교:
         `git diff --name-only HEAD~N..HEAD` (N = 커밋 수)
      3. 태스크별 "What to do" 항목과 실제 코드 매칭 확인
    Expected Result: 모든 태스크 spec ↔ 구현 1:1 매칭
    Evidence: .sisyphus/evidence/task-37-fidelity.txt

  Scenario: Must NOT do 준수
    Tool: Grep
    Steps:
      1. `grep -rn "autoSave\|auto-save" app/` → 0 결과 (자동저장 금지)
      2. `grep -rn "leaderboard\|ranking\|인기순" app/` → 0 결과
      3. `grep -rn "WebSocket\|SSE\|EventSource" app/` → 0 결과 (실시간 금지)
    Expected Result: Must NOT do 항목 모두 부재
    Evidence: .sisyphus/evidence/task-37-must-not.txt

  Scenario: 스코프 크립 검출
    Tool: Bash
    Steps:
      1. 변경된 모든 파일 목록 생성
      2. 각 파일이 최소 하나의 태스크 "Files"에 명시되어 있는지 확인
    Expected Result: 명시되지 않은 파일 변경 0개
    Evidence: .sisyphus/evidence/task-37-scope.txt
  ```

  **Commit**: NO

---

## Commit Strategy

> 통합된 태스크는 하나의 커밋으로. Skip된 태스크(T9, T11, T17, T26, T29)는 커밋 없음.

- **Wave 1a/1b**:
  - T1: `chore(test): vitest 인프라 세팅` — vitest.config.ts, package.json
  - T5: `chore(deps): tiptap 의존성 설치 및 베이스 설정` — package.json, editor-config.ts
  - T6: `feat(editor): NoteEditor 향상된 textarea 컴포넌트` — NoteEditor.tsx
  - T14: `feat(dialogue): self-answer 생성 UI` — SelfAnswerCard.tsx, selfAnswers queries
- **Wave 2**:
  - T2: `feat(db): content_text 컬럼 마이그레이션` — schema.server.ts, migration
  - T3: `feat(db): tags 및 record_tags 테이블` — schema.server.ts, relations, migration
  - T4: `feat(lib): 콘텐츠 추상화 유틸리티 및 렌더러` — content.server.ts, ContentRenderer.tsx
  - T19: `feat(learners): learners 목록 강화` — learners page, queries
- **Wave 3**:
  - T7: `feat(editor): ArticleEditor tiptap 블록 에디터` — ArticleEditor.tsx
  - T10: `feat(api): R2 이미지 업로드 및 서빙 API` — api.upload.tsx, api.images.$.tsx, routes.ts
  - T12: `refactor(content): 6곳 콘텐츠 소비 지점 ContentRenderer 적용` — 5 files
  - T13: `test(content): 콘텐츠 유틸리티 단위 테스트` — content.test.ts
- **Wave 4**:
  - T8: `feat(editor): ArticleEditor 전체 확장 (slash, code, image, paste)` — ArticleEditor.tsx, SlashCommandMenu.tsx, extensions ★T9/T11/T17 통합 커밋★
  - T18: `chore(seed): JSON 콘텐츠 및 태그 seed 데이터` — seed.sql
  - T20: `refactor(search): content_text 기반 검색 전환` — search.server.ts, _public.search.tsx
  - T21: `feat(records): 연결된 기록 양방향 표시` — logs page, records queries
  - T22: `feat(admin): 태그 관리 CRUD UI` — admin tags page, tags queries, routes.ts
  - T27: `feat(sentences): 리치 콘텐츠 문장 하이라이팅` — ContentRenderer.tsx
- **Wave 5**:
  - T15: `feat(write): 듀얼 모드 에디터 write 페이지 통합` — _public.write.tsx, validation.ts, routes.ts
  - T25: `feat(me): 개인 여정 타임라인 + Stage별 분포` — _public.me.tsx ★T26 통합 커밋★
  - T24: `feat(tags): 태그 브라우징 페이지` — tags pages, routes.ts
  - T28: `feat(activity): 여정 활동 피드 + 홈 통합` — ActivityFeed.tsx, activity queries, _public._index.tsx ★T29 통합 커밋★
- **Wave 6**: T16: `feat(edit): 기록 수정 페이지` — edit.tsx, routes.ts / T23: `feat(write): 태그 선택 UI`
- **Wave 7**: T30-T33 개별 커밋

---

## Success Criteria

### Verification Commands
```bash
pnpm build                    # Expected: 성공, 에러 없음
tsc --noEmit                  # Expected: 에러 없음
pnpm vitest run               # Expected: 모든 테스트 통과
wrangler d1 migrations apply DB --local  # Expected: 마이그레이션 적용 성공
```

### Final Checklist
- [ ] Note 모드로 빠르게 짧은 글 작성 가능
- [ ] Article 모드로 heading, code, image, list 포함 긴 글 작성 가능
- [ ] 슬래시 명령으로 블록 타입 전환 가능
- [ ] 이미지 드래그&드롭 및 클립보드 붙여넣기 동작
- [ ] 기존 plain text 기록 정상 렌더링 (backward compat)
- [ ] 기록 수정 페이지에서 기존 콘텐츠 로드 + 수정 + 저장
- [ ] Self-answer 생성 가능
- [ ] 태그 기반 브라우징 동작
- [ ] /me 여정 타임라인 표시
- [ ] 여정 활동 피드 표시
- [ ] 검색에서 JSON 콘텐츠 내 텍스트 검색 가능
- [ ] 모든 "Must NOT Have" 항목 부재 확인
