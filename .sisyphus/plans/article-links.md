# Article 원문 링크 + 참조/출처 링크 기능

## TL;DR

> **Quick Summary**: Article(긴 글)에 원문 링크(블로그 등 원본 이동용)와 참조/출처 링크(참고 자료 목록)를 추가한다. DB 마이그레이션 → 쿼리 모듈 → 검증 스키마 → 폼 → 상세 표시 순서로 구현.
>
> **Deliverables**:
> - `records` 테이블에 `original_url` 컬럼 추가
> - `record_references` 테이블 신규 생성
> - Article 작성/편집 폼에 링크 입력 UI 추가
> - Article 상세 페이지에 링크 표시 UI 추가
>
> **Estimated Effort**: Short (각 태스크 30분~1시간)
> **Parallel Execution**: YES — 3 waves
> **Critical Path**: Task 1 → Task 3 → Task 4/5 → Task 6

---

## Context

### Original Request
Article에 두 가지 링크 기능 추가:
1. **원문 링크**: 글 상단에 1개. 자기 블로그 운영하는 사람이 원본 글로 이동할 수 있게 하는 용도.
2. **참조/출처 링크**: 글에서 참고한 자료 링크. 무제한. 제목은 선택(미입력 시 URL 표시).

### Interview Summary
**Key Discussions**:
- 참조 링크 개수: **무제한** (안전 상한 50개 적용)
- 참조 링크 제목: **선택사항**, 미입력 시 URL 자체를 표시
- 적용 범위: **Article만** (Note 제외)

### Metis Review
**Identified Gaps** (addressed):
- `record_links` 테이블이 이미 존재 (내부 레코드 간 연결용) → `record_references`로 명확히 구분
- 동적 폼 행 추가/삭제 패턴이 코드베이스에 없음 → indexed field name 패턴 정의
- 편집 폼이 Note/Article 공유 → `format === "article"` 조건부 렌더링 필요
- Autosave 스키마 존재 → `original_url`만 autosave에 포함, 참조 링크는 제외
- URL 프로토콜 처리 → `https://` 자동 prepend

---

## Work Objectives

### Core Objective
Article 작성/편집 시 원문 링크와 참조/출처 링크를 입력하고, 상세 페이지에서 표시한다.

### Concrete Deliverables
- D1 마이그레이션: `original_url` 컬럼 + `record_references` 테이블
- Drizzle 스키마 + 관계 정의
- 참조 링크 CRUD 쿼리 모듈
- Zod 검증 스키마 업데이트
- Article 작성 폼에 원문 링크 + 참조 링크 입력 필드
- Article 편집 폼에 동일 필드 (기존 데이터 로드)
- Article 상세 페이지에 원문 링크(상단) + 참조 링크(하단) 표시
- 시드 데이터에 샘플 URL 추가

### Definition of Done
- [ ] `tsc --noEmit` 통과
- [ ] `npx react-router build` 성공
- [ ] `wrangler d1 migrations apply DB --local` 성공
- [ ] Article 작성 → 원문 링크 + 참조 링크 저장 → 상세 페이지에서 표시
- [ ] Article 편집 → 기존 링크 로드 → 수정/삭제/추가 → 반영

### Must Have
- 원문 링크: Article당 1개, nullable, 글 상단 표시
- 참조 링크: 무제한(상한 50개), 제목 선택, URL 필수
- Article만 적용 (Note에는 절대 표시하지 않음)
- URL 검증 (`http://` 또는 `https://`만 허용, 프로토콜 없으면 `https://` 자동 추가)
- 참조 링크 제목 미입력 시 URL 자체를 표시

### Must NOT Have (Guardrails)
- ❌ 링크 프리뷰 카드 / OG 메타데이터 페칭
- ❌ 깨진 링크 감지 / URL 도달 가능성 검사
- ❌ 파비콘 가져오기
- ❌ 참조 링크 드래그 재정렬
- ❌ 에디터 내 리치 텍스트 링크 임베딩
- ❌ Note 포맷에 링크 필드 추가
- ❌ Admin 페이지 업데이트
- ❌ 참조 링크 autosave (원문 링크만 autosave에 포함)
- ❌ 링크 클릭 분석 / 추적
- ❌ 기존 `record_links` 테이블 수정

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: NO
- **Automated tests**: None
- **Framework**: 없음
- **Verification**: `tsc --noEmit` + `npx react-router build` + D1 CLI + Playwright QA

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **DB**: Bash (`wrangler d1 execute`) — SQL 실행, 결과 확인
- **Forms**: Playwright — 폼 입력, 제출, 결과 확인
- **Display**: Playwright — 페이지 탐색, 요소 확인, 스크린샷

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation — 2 parallel):
├── Task 1: DB 스키마 + 관계 + 마이그레이션 + 쿼리 모듈 [quick]
└── Task 2: Zod 검증 스키마 업데이트 [quick]

Wave 2 (Forms — 2 parallel, after Wave 1):
├── Task 3: Article 작성 폼 + action [unspecified-high]
└── Task 4: Article 편집 폼 + action [unspecified-high]

Wave 3 (Display + Data — 2 parallel, after Wave 2):
├── Task 5: Article 상세 페이지 표시 [visual-engineering]
└── Task 6: 시드 데이터 업데이트 [quick]

Wave FINAL (4 parallel reviews → user okay):
├── F1: Plan compliance audit (deep)
├── F2: Code quality review (unspecified-high)
├── F3: Real manual QA (unspecified-high)
└── F4: Scope fidelity check (deep)
→ Present results → Get explicit user okay
```

### Dependency Matrix

| Task | Depends On | Blocks |
|------|-----------|--------|
| 1 | — | 3, 4, 5, 6 |
| 2 | — | 3, 4 |
| 3 | 1, 2 | 5 |
| 4 | 1, 2 | 5 |
| 5 | 1, 3 or 4 | — |
| 6 | 1 | — |

### Agent Dispatch Summary

- **Wave 1**: 2 tasks — T1 `quick`, T2 `quick`
- **Wave 2**: 2 tasks — T3 `unspecified-high`, T4 `unspecified-high`
- **Wave 3**: 2 tasks — T5 `visual-engineering`, T6 `quick`
- **FINAL**: 4 tasks — F1 `oracle`, F2 `unspecified-high`, F3 `unspecified-high`, F4 `deep`

---

## TODOs

- [ ] 1. DB 스키마 + 관계 + 마이그레이션 + 쿼리 모듈

  **What to do**:
  - `app/db/schema.server.ts`: `records` 테이블에 `originalUrl` 컬럼 추가 (`text("original_url")`, nullable)
  - `app/db/schema.server.ts`: `recordReferences` 테이블 신규 생성:
    ```
    id: text("id").primaryKey()            — nanoid
    recordId: text("record_id").notNull()  — FK → records.id, onDelete: "cascade"
    url: text("url").notNull()             — 최대 2048자
    title: text("title")                   — nullable, 사용자 입력 제목
    sortOrder: integer("sort_order").notNull().default(0)
    createdAt: integer("created_at").notNull().default(now())
    ```
  - `app/db/relations.server.ts`: `records` → `recordReferences` 관계 추가 (one-to-many)
  - `drizzle/migrations/` 새 마이그레이션 SQL 생성 (`pnpm drizzle-kit generate`)
  - `app/db/queries/records/references.server.ts` 신규 생성: 쿼리 함수
    - `getRecordReferences(d1, recordId)` — 해당 레코드의 참조 링크 목록 (sortOrder 정렬)
    - `syncRecordReferences(d1, recordId, references: {url, title}[])` — 기존 삭제 → 재삽입 (tags 패턴 따름)
  - `app/db/queries/records/` index 파일에서 references 모듈 re-export

  **Must NOT do**:
  - 기존 `record_links` 테이블 수정 금지
  - `syncRecordLinksForRecord` 함수 수정 금지

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 스키마 정의, 마이그레이션 생성, 간단한 CRUD 쿼리 — 기존 패턴 복제
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `frontend-design`: DB 레이어 작업이므로 불필요

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 2)
  - **Blocks**: Tasks 3, 4, 5, 6
  - **Blocked By**: None

  **References**:

  **Pattern References** (existing code to follow):
  - `app/db/schema.server.ts:358-372` — `recordLinks` 테이블 정의 패턴 (id PK, FK cascade, timestamps)
  - `app/db/schema.server.ts:98-124` — `records` 테이블 현재 구조 (여기에 `originalUrl` 추가)
  - `app/db/relations.server.ts` — 기존 관계 정의 패턴 따르기
  - `app/db/queries/records/records.server.ts` — 쿼리 모듈 구조 패턴

  **API/Type References**:
  - `app/db/schema.server.ts:1-10` — Drizzle 임포트 패턴 (`sqliteTable`, `text`, `integer`)
  - `app/db/schema.server.ts` 내 `now()` 헬퍼 — `sql\`(unixepoch())\`` 사용

  **WHY Each Reference Matters**:
  - `recordLinks` 테이블: 가장 유사한 구조 (레코드에 종속된 URL 목록). id PK 방식, cascade 삭제, nanoid 사용법을 그대로 따른다.
  - `records` 테이블: `originalUrl` 컬럼을 추가할 정확한 위치 확인
  - 쿼리 모듈: 기존 파일 구조와 export 패턴을 일관되게 유지

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 마이그레이션 적용 후 테이블 존재 확인
    Tool: Bash (wrangler d1)
    Preconditions: 로컬 D1 DB 실행 가능 상태
    Steps:
      1. `wrangler d1 migrations apply DB --local` 실행
      2. `wrangler d1 execute DB --local --command="SELECT sql FROM sqlite_master WHERE name='record_references'"` 실행
      3. `wrangler d1 execute DB --local --command="PRAGMA table_info(records)"` 실행 — `original_url` 컬럼 존재 확인
    Expected Result: 마이그레이션 성공, record_references 테이블 CREATE 문 출력, records 테이블에 original_url 컬럼 존재
    Failure Indicators: 마이그레이션 에러, 테이블 미존재, 컬럼 미존재
    Evidence: .sisyphus/evidence/task-1-migration-apply.txt

  Scenario: 타입 체크 통과
    Tool: Bash
    Preconditions: 마이그레이션 적용 완료
    Steps:
      1. `pnpm exec tsc --noEmit` 실행
    Expected Result: 에러 없이 종료 (exit code 0)
    Failure Indicators: 타입 에러 출력
    Evidence: .sisyphus/evidence/task-1-typecheck.txt
  ```

  **Commit**: YES
  - Message: `feat(db): records에 original_url 컬럼 및 record_references 테이블 추가`
  - Files: `app/db/schema.server.ts`, `app/db/relations.server.ts`, `app/db/queries/records/references.server.ts`, `drizzle/migrations/*.sql`
  - Pre-commit: `pnpm exec tsc --noEmit`

- [ ] 2. Zod 검증 스키마 업데이트

  **What to do**:
  - `app/lib/auth/validation.ts`의 `createArticleSchema`에 추가:
    - `originalUrl`: `z.string().url().max(2048).optional().or(z.literal(""))` — 빈 문자열 또는 유효한 URL
    - `references`: `z.array(z.object({ url: z.string().url().max(2048), title: z.string().max(200).optional().or(z.literal("")) })).max(50).optional().default([])`
  - URL 프로토콜 처리: `z.preprocess`로 프로토콜 없는 URL에 `https://` 자동 추가
  - `createRecordSchema`에도 `originalUrl` 추가 (편집 폼이 이 스키마 사용)
  - 참조 링크 내 중복 URL 방지: `.refine()` 추가
  - `autosaveDraftSchema`에 `originalUrl` 추가 (참조 링크는 제외)
  - `parseReferencesFromFormData(formData: FormData)` 헬퍼 함수 생성:
    - indexed field name 파싱: `references[0][url]`, `references[0][title]` → `{url, title}[]`
    - 빈 행 필터링 (url이 비어있는 행 제거)
    - 이 헬퍼를 write/edit action에서 공유 사용

  **Must NOT do**:
  - `createNoteSchema` 수정 금지 (Note에는 적용 안 함)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Zod 스키마 추가/수정, 헬퍼 함수 1개 — 단순 작업
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 1)
  - **Blocks**: Tasks 3, 4
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `app/lib/auth/validation.ts:74-120` — `createArticleSchema` 현재 구조 (여기에 `originalUrl`, `references` 추가)
  - `app/lib/auth/validation.ts:3-45` — `createRecordSchema` 현재 구조 (여기에 `originalUrl` 추가)

  **API/Type References**:
  - `app/lib/auth/validation.ts` — autosave 관련 스키마도 이 파일에 있을 수 있음. 없으면 별도 파일 확인

  **WHY Each Reference Matters**:
  - `createArticleSchema`: Article 작성 시 사용되는 검증 스키마. 여기에 링크 필드 추가
  - `createRecordSchema`: Article 편집 시 사용되는 검증 스키마. `originalUrl`만 추가 (참조 링크는 action에서 별도 처리)

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 유효한 URL 검증 통과
    Tool: Bash (tsc)
    Preconditions: 스키마 수정 완료
    Steps:
      1. `pnpm exec tsc --noEmit` 실행
    Expected Result: 타입 에러 없이 통과
    Evidence: .sisyphus/evidence/task-2-typecheck.txt

  Scenario: 프로토콜 없는 URL 자동 처리 확인
    Tool: Bash (bun eval)
    Preconditions: validation.ts 수정 완료
    Steps:
      1. 다음 명령 실행:
         `bun -e "const { createArticleSchema } = require('./app/lib/auth/validation'); const result = createArticleSchema.parse({ title: '테스트', content: JSON.stringify({type:'doc',content:[{type:'paragraph',content:[{type:'text',text:'본문'}]}]}), originalUrl: 'example.com', rhythm: 'free', visibility: 'public' }); console.log(result.originalUrl);"`
      2. 출력값 확인
    Expected Result: 출력이 `https://example.com` (프로토콜 자동 추가됨)
    Failure Indicators: 검증 에러 발생, 출력이 `example.com` 그대로이거나 에러
    Evidence: .sisyphus/evidence/task-2-url-preprocess.txt
  ```

  **Commit**: YES
  - Message: `feat(validation): Article 링크 Zod 스키마 추가`
  - Files: `app/lib/auth/validation.ts`
  - Pre-commit: `pnpm exec tsc --noEmit`

---

- [ ] 3. Article 작성 폼에 원문 링크 + 참조 링크 입력 추가

  **What to do**:
  - `app/routes/public/write/article.tsx`의 **폼 UI** 수정:
    - 제목 필드 위에 "원문 링크" 입력 필드 추가:
      - Label: "원문 링크" (선택사항 표시)
      - Placeholder: "블로그나 원본 글의 URL을 입력하세요"
      - `<input type="text" inputMode="url" name="originalUrl" />` (주의: `type="url"` 사용 금지 — 브라우저가 프로토콜 없는 URL을 거부하므로 `type="text"`를 사용하고 서버에서 Zod로 검증)
    - 콘텐츠 아래, 제출 버튼 위에 "참조/출처" 섹션 추가:
      - Section label: "참조 및 출처" (선택사항 표시)
      - 동적 행 리스트 (React useState로 관리):
        - 각 행: URL 입력 (`<input type="text" inputMode="url" name="references[N][url]" />`) + 제목 입력 (`<input type="text" name="references[N][title]" />`, placeholder: "제목 (선택)"). 참고: URL 입력에 `type="url"` 사용 금지 (프로토콜 없는 URL 허용을 위해 `type="text"` 사용)
        - "참조 추가" 버튼 → 새 빈 행 추가
        - 각 행에 "✕" 삭제 버튼
      - 초기 상태: 빈 배열 (행 없음)
  - `app/routes/public/write/article.tsx`의 **action 핸들러** 수정:
    - `formData`에서 `originalUrl` 추출
    - `parseReferencesFromFormData(formData)` 호출하여 참조 링크 배열 추출
    - `createArticleSchema`로 검증 (originalUrl 포함)
    - 레코드 INSERT 시 `originalUrl` 포함
    - INSERT 성공 후 `syncRecordReferences(d1, recordId, references)` 호출
  - Quiet Depth 디자인 톤 유지: 입력 필드는 조용하고 절제된 스타일

  **Must NOT do**:
  - Note 작성 폼(`/write/note.tsx`) 수정 금지
  - 링크 프리뷰/OG 메타데이터 페칭 금지
  - 드래그 재정렬 금지

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 폼 UI + action 핸들러 양쪽 수정. 동적 폼 행 관리는 새로운 패턴.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 4)
  - **Blocks**: Task 5
  - **Blocked By**: Tasks 1, 2

  **References**:

  **Pattern References**:
  - `app/routes/public/write/article.tsx:286-500` — 현재 Article 작성 폼 UI (여기에 링크 필드 삽입)
  - `app/routes/public/write/article.tsx:99-217` — 현재 action 핸들러 (여기에 originalUrl + references 처리 추가)
  - `app/routes/public/write/article.tsx:175-195` — `syncRecordLinksForRecord` 호출 패턴 → `syncRecordReferences` 호출도 같은 위치

  **API/Type References**:
  - `app/lib/auth/validation.ts` — `createArticleSchema` (Task 2에서 업데이트됨)
  - `app/db/queries/records/references.server.ts` — `syncRecordReferences` (Task 1에서 생성됨)
  - `app/lib/auth/validation.ts` — `parseReferencesFromFormData` 헬퍼 (Task 2에서 생성됨)

  **WHY Each Reference Matters**:
  - Article 작성 폼: 원문 링크와 참조 링크 입력 필드의 정확한 삽입 위치 결정
  - action 핸들러: 기존 레코드 생성 흐름에 링크 저장 로직을 자연스럽게 통합
  - `syncRecordLinksForRecord` 패턴: 동일한 위치에서 `syncRecordReferences`도 호출

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 원문 링크 + 참조 링크 포함 Article 작성 (UI)
    Tool: Playwright
    Preconditions: 로컬 서버 실행, 인증된 Learner 세션
    Steps:
      1. `/write/article` 페이지 이동
      2. "원문 링크" 필드에 "https://myblog.com/post-1" 입력
      3. 제목에 "링크테스트글" 입력
      4. 본문에 내용 입력
      5. "참조 추가" 버튼 클릭 → 첫 번째 행 나타남
      6. 첫 번째 참조 URL에 "https://react.dev" 입력, 제목에 "리액트 공식문서" 입력
      7. "참조 추가" 버튼 다시 클릭 → 두 번째 행 나타남
      8. 두 번째 참조 URL에 "https://tailwindcss.com" 입력, 제목 비워둠
      9. 폼 제출
    Expected Result: `/logs/{slug}/details` 경로로 리다이렉트됨 (현재 article.tsx action의 리다이렉트 대상). 페이지에 에러 메시지 없음.
    Failure Indicators: 리다이렉트 안 됨, 에러 메시지 표시, 폼이 다시 나타남
    Evidence: .sisyphus/evidence/task-3-article-create-ui.png

  Scenario: 원문 링크 + 참조 링크 DB 저장 확인
    Tool: Bash (wrangler d1)
    Preconditions: 위 Playwright 시나리오에서 생성된 Article 존재
    Steps:
      1. `wrangler d1 execute DB --local --command="SELECT id, original_url FROM records WHERE title LIKE '%링크테스트글%'"` 실행
      2. 반환된 record id로 `wrangler d1 execute DB --local --command="SELECT url, title FROM record_references WHERE record_id='{id}' ORDER BY sort_order"` 실행
    Expected Result: original_url="https://myblog.com/post-1", record_references 2행 (react.dev + tailwindcss.com)
    Failure Indicators: original_url이 NULL, record_references 0행
    Evidence: .sisyphus/evidence/task-3-article-create-db.txt

  Scenario: 원문 링크 없이 Article 작성 (선택 필드 확인)
    Tool: Playwright
    Preconditions: 로컬 서버 실행, 인증된 세션
    Steps:
      1. `/write/article` 페이지 이동
      2. 원문 링크 필드 비워둠
      3. 참조 추가 안 함
      4. 제목 "링크없는글", 본문만 입력 후 제출
    Expected Result: `/logs/{slug}/details` 경로로 정상 리다이렉트
    Failure Indicators: 검증 에러로 제출 실패
    Evidence: .sisyphus/evidence/task-3-article-no-links.png
  ```

  **Commit**: YES
  - Message: `feat(write): Article 작성 폼에 원문 링크 및 참조 링크 입력 추가`
  - Files: `app/routes/public/write/article.tsx`
  - Pre-commit: `npx react-router build`

- [ ] 4. Article 편집 폼에 원문 링크 + 참조 링크 편집 추가

  **What to do**:
  - `app/routes/public/logs/$recordSlug.edit.tsx`의 **loader** 수정:
    - `getRecordReferences(d1, record.id)` 호출 추가 (Promise.all에 포함)
    - 반환 데이터에 `references`와 `record.originalUrl` 포함
  - **폼 UI** 수정 (format === "article" 조건부 렌더링):
    - 제목 필드 위에 "원문 링크" 입력 필드 (기존 값 로드)
    - 콘텐츠 아래에 "참조/출처" 섹션 (기존 참조 링크 목록 로드)
    - Task 3과 동일한 동적 행 UI (useState 초기값을 기존 데이터로 설정)
    - Note 편집 시에는 이 섹션 렌더링 안 함
  - **action 핸들러** 수정:
    - `formData`에서 `originalUrl` 추출
    - `parseReferencesFromFormData(formData)` 호출
    - `updateRecord` 호출 시 `originalUrl` 포함
    - 업데이트 후 `syncRecordReferences(d1, recordId, references)` 호출 (delete-all → re-insert)
  - 편집 폼의 검증은 `createRecordSchema`를 사용하므로 `originalUrl`이 Task 2에서 이미 추가됨

  **Must NOT do**:
  - Note 편집 시 링크 필드 표시 금지
  - 참조 링크 변경을 revision 시스템에 추가하지 않음 (known limitation)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: loader + 폼 UI + action 3곳 수정. 기존 데이터 로드 + 조건부 렌더링 필요.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 3)
  - **Blocks**: Task 5
  - **Blocked By**: Tasks 1, 2

  **References**:

  **Pattern References**:
  - `app/routes/public/logs/$recordSlug.edit.tsx:46-84` — 현재 loader (Promise.all 패턴으로 references 추가)
  - `app/routes/public/logs/$recordSlug.edit.tsx:86-205` — 현재 action (updateRecord 후 sync 호출 위치)
  - `app/routes/public/logs/$recordSlug.edit.tsx:252-443` — 현재 편집 폼 UI (조건부 렌더링 삽입 위치)
  - `app/routes/public/logs/$recordSlug.edit.tsx:190-200` — 태그 sync 패턴 (delete-all → re-insert) → references도 동일 패턴

  **API/Type References**:
  - `app/db/queries/records/references.server.ts` — `getRecordReferences`, `syncRecordReferences` (Task 1)
  - `app/lib/auth/validation.ts` — `createRecordSchema` + `parseReferencesFromFormData` (Task 2)

  **WHY Each Reference Matters**:
  - loader: 기존 데이터를 폼 초기값으로 사용하기 위해 references 로드 필수
  - action: 태그 sync와 동일한 패턴으로 참조 링크도 업데이트
  - 폼 UI: format 조건 분기가 이미 존재하는지 확인하고, 링크 필드를 올바른 위치에 삽입

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 기존 링크가 있는 Article 편집 — UI 로드 확인
    Tool: Playwright
    Preconditions: Task 3에서 생성한 "링크테스트글" Article 존재 (원문 링크 + 참조 2개)
    Steps:
      1. "링크테스트글" Article의 편집 페이지로 이동
      2. 원문 링크 입력 필드의 value가 "https://myblog.com/post-1" 인지 확인
      3. 참조 링크 섹션에 2개 행이 표시되는지 확인 (URL 입력 필드 2개 존재)
    Expected Result: 원문 링크 필드에 기존 URL 표시, 참조 행 2개 표시
    Failure Indicators: 원문 링크 빈 값, 참조 행 0개
    Evidence: .sisyphus/evidence/task-4-edit-load.png

  Scenario: Article 편집 — 수정 후 저장
    Tool: Playwright + Bash (wrangler d1)
    Preconditions: 위 시나리오에서 편집 페이지 로드됨
    Steps:
      1. 원문 링크를 "https://myblog.com/updated"로 변경
      2. 첫 번째 참조 행의 삭제 버튼 클릭 → 행 삭제
      3. 폼 제출 → `/logs/` 경로로 리다이렉트 확인
      4. `wrangler d1 execute DB --local --command="SELECT original_url FROM records WHERE title LIKE '%링크테스트글%'"` 실행
      5. `wrangler d1 execute DB --local --command="SELECT COUNT(*) FROM record_references WHERE record_id=(SELECT id FROM records WHERE title LIKE '%링크테스트글%')"` 실행
    Expected Result: 리다이렉트 성공. original_url="https://myblog.com/updated". record_references count=1.
    Failure Indicators: 리다이렉트 안 됨, original_url 미변경, references count ≠ 1
    Evidence: .sisyphus/evidence/task-4-edit-save.png, .sisyphus/evidence/task-4-edit-db.txt

  Scenario: Note 편집 시 링크 필드 미표시
    Tool: Playwright
    Preconditions: Note 형식 레코드 존재
    Steps:
      1. Note 레코드의 편집 페이지 이동
      2. 페이지 스냅샷에서 "원문 링크" 텍스트 존재 여부 확인
    Expected Result: "원문 링크" 텍스트가 페이지에 없음
    Failure Indicators: 링크 필드가 Note 편집에서도 표시됨
    Evidence: .sisyphus/evidence/task-4-note-no-links.png
  ```

  **Commit**: YES
  - Message: `feat(edit): Article 편집 폼에 원문 링크 및 참조 링크 편집 추가`
  - Files: `app/routes/public/logs/$recordSlug.edit.tsx`
  - Pre-commit: `npx react-router build`

---

- [ ] 5. Article 상세 페이지에 원문 링크 + 참조 링크 표시

  **What to do**:
  - `app/routes/public/logs/$recordSlug.server.ts`의 **loader** 수정:
    - `getRecordReferences(d1, record.id)` 호출 추가 (articles만)
    - 반환 데이터에 `references` 배열 포함
  - `app/routes/public/logs/$recordSlug.tsx`의 **표시 UI** 추가:
    - **원문 링크** (글 상단, 제목 아래 또는 헤더 영역):
      - `record.originalUrl`이 존재할 때만 표시
      - 외부 링크 아이콘 + URL 텍스트 (도메인만 보이거나 전체 URL 축약)
      - `target="_blank" rel="noopener noreferrer"`
      - Quiet Depth 톤: 작은 메타 텍스트, 과도하지 않은 스타일
      - 예: `↗ 원문: myblog.com/post-1`
    - **참조/출처 링크** (콘텐츠 아래, Questions 섹션 위):
      - `references` 배열이 비어있지 않을 때만 표시
      - 섹션 제목: "참조 및 출처"
      - 각 참조: `title || url` 표시 + 외부 링크
      - 순번 목록 형태 (1. 2. 3. ...)
      - `target="_blank" rel="noopener noreferrer"`
      - Quiet Depth 톤: 본문과 어울리는 조용한 링크 스타일
  - Note 상세 페이지에서는 이 섹션 렌더링 안 함 (format 체크)

  **Must NOT do**:
  - 링크 프리뷰 카드 / 미리보기 이미지 표시 금지
  - 파비콘 가져오기 금지
  - Note에 링크 표시 금지

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: UI 표시 컴포넌트 구현. Quiet Depth 디자인 가이드라인 준수 필요.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Task 6)
  - **Blocks**: None
  - **Blocked By**: Tasks 1, 3 (or 4)

  **References**:

  **Pattern References**:
  - `app/routes/public/logs/$recordSlug.tsx:486-602` — 현재 헤더 영역 (원문 링크 삽입 위치)
  - `app/routes/public/logs/$recordSlug.tsx:604-631` — 현재 콘텐츠 영역 (참조 링크는 이 아래)
  - `app/routes/public/logs/$recordSlug.tsx:635-721` — Questions 섹션 (참조 링크는 이 위)
  - `app/routes/public/logs/$recordSlug.server.ts:33-170` — 현재 loader (references 쿼리 추가 위치)

  **External References**:
  - `.docs/design.md` — Quiet Depth 디자인 가이드라인 (색상, 타이포, 카드 스펙 참조)
  - `.docs/frontend.md` — 프론트엔드 설계 가이드 (접근성, 컴포넌트 패턴)

  **WHY Each Reference Matters**:
  - 헤더 영역: 원문 링크의 정확한 삽입 위치 (타이틀 아래, timestamps 근처)
  - 콘텐츠-Questions 사이: 참조 링크의 자연스러운 위치 (본문의 연장)
  - 디자인 가이드: 링크 표시가 Quiet Depth 톤을 벗어나지 않도록

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 원문 링크 + 참조 링크가 있는 Article 상세 표시
    Tool: Playwright
    Preconditions: 원문 링크 + 참조 링크가 있는 Article 존재
    Steps:
      1. `/logs/{slug}` 페이지 이동
      2. 헤더 영역에서 "원문" 텍스트 존재 확인
      3. 원문 링크가 `target="_blank"` 외부 링크인지 확인
      4. 콘텐츠 아래에서 "참조 및 출처" 섹션 존재 확인
      5. 참조 링크가 제목 또는 URL로 표시되는지 확인
      6. 제목이 있는 참조: 제목 텍스트로 표시
      7. 제목이 없는 참조: URL 자체로 표시
    Expected Result: 원문 링크 상단 표시, 참조 링크 하단 표시, 외부 링크 속성 정상
    Failure Indicators: 링크 미표시, target 속성 누락, 잘못된 위치
    Evidence: .sisyphus/evidence/task-5-detail-display.png

  Scenario: 링크 없는 Article 상세 — 빈 섹션 미표시
    Tool: Playwright
    Preconditions: 원문 링크도 참조 링크도 없는 Article 존재
    Steps:
      1. 해당 Article `/logs/{slug}` 페이지 이동
      2. "원문" 텍스트 부재 확인
      3. "참조 및 출처" 텍스트 부재 확인
    Expected Result: 링크 관련 섹션이 DOM에 없음
    Failure Indicators: 빈 섹션 헤더가 표시됨
    Evidence: .sisyphus/evidence/task-5-detail-no-links.png
  ```

  **Commit**: YES
  - Message: `feat(detail): Article 상세 페이지에 원문 링크 및 참조 링크 표시`
  - Files: `app/routes/public/logs/$recordSlug.tsx`, `app/routes/public/logs/$recordSlug.server.ts`
  - Pre-commit: `npx react-router build`

- [ ] 6. 시드 데이터에 샘플 URL 추가

  **What to do**:
  - `seeds/seed.sql`에 기존 Article 레코드 중 2~3개에 `original_url` UPDATE 추가
  - `record_references` 테이블에 샘플 참조 링크 INSERT (3~5개)
    - 제목 있는 참조 + 제목 없는 참조 둘 다 포함
  - 시드 데이터 한국어로 작성 (AGENTS.md 규칙)

  **Must NOT do**:
  - 기존 시드 데이터 구조 변경 금지
  - Note 레코드에 URL 추가 금지

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: SQL INSERT/UPDATE 몇 줄 추가
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Task 5)
  - **Blocks**: None
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `seeds/seed.sql` — 기존 시드 데이터 구조, Article 레코드 ID 확인

  **WHY Each Reference Matters**:
  - 기존 Article 레코드의 id를 알아야 `original_url` UPDATE와 `record_references` INSERT가 가능

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 시드 데이터 적용 후 확인
    Tool: Bash (wrangler d1)
    Preconditions: 마이그레이션 적용 완료
    Steps:
      1. `wrangler d1 execute DB --local --file=seeds/seed.sql` 실행
      2. `wrangler d1 execute DB --local --command="SELECT id, original_url FROM records WHERE original_url IS NOT NULL"` 실행
      3. `wrangler d1 execute DB --local --command="SELECT * FROM record_references"` 실행
    Expected Result: original_url이 있는 레코드 2~3개, record_references 3~5행
    Failure Indicators: SQL 에러, 0행 반환
    Evidence: .sisyphus/evidence/task-6-seed-data.txt
  ```

  **Commit**: YES
  - Message: `chore(seed): Article 시드 데이터에 샘플 URL 추가`
  - Files: `seeds/seed.sql`
  - Pre-commit: `wrangler d1 execute DB --local --file=seeds/seed.sql`

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.

- [ ] F1. **Plan Compliance Audit** — `deep`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, curl endpoint, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run `tsc --noEmit` + `npx react-router build`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names (data/result/item/temp). Verify no changes to `record_links` table or `syncRecordLinksForRecord`.
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high` (+ `playwright` skill)
  Start from clean state. Execute EVERY QA scenario from EVERY task — follow exact steps, capture evidence. Test cross-task integration (create article with links → edit → verify display). Test edge cases: empty original URL, no references, 50 references, invalid URLs. Save to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff (git log/diff). Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT do" compliance. Detect cross-task contamination. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

| # | Commit | Verification |
|---|--------|-------------|
| 1 | `feat(db): records에 original_url 컬럼 및 record_references 테이블 추가` | `wrangler d1 migrations apply DB --local` 성공, `tsc --noEmit` 통과 |
| 2 | `feat(validation): Article 링크 Zod 스키마 추가` | `tsc --noEmit` 통과 |
| 3 | `feat(write): Article 작성 폼에 원문 링크 및 참조 링크 입력 추가` | `npx react-router build` 성공 |
| 4 | `feat(edit): Article 편집 폼에 원문 링크 및 참조 링크 편집 추가` | `npx react-router build` 성공 |
| 5 | `feat(detail): Article 상세 페이지에 원문 링크 및 참조 링크 표시` | `npx react-router build` 성공 |
| 6 | `chore(seed): Article 시드 데이터에 샘플 URL 추가` | `wrangler d1 execute DB --local --file=seeds/seed.sql` 성공 |

---

## Success Criteria

### Verification Commands
```bash
tsc --noEmit                            # Expected: 타입 에러 없음
npx react-router build                  # Expected: 빌드 성공
wrangler d1 migrations apply DB --local # Expected: 마이그레이션 적용 성공
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] `tsc --noEmit` + `npx react-router build` 통과
- [ ] Article 생성 → 원문 링크 + 참조 링크 저장 확인
- [ ] Article 편집 → 기존 링크 로드 + 수정 확인
- [ ] Article 상세 → 원문 링크 상단 + 참조 링크 하단 표시 확인
- [ ] Note에는 링크 필드 표시 안 됨
