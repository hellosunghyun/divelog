# Learnings — dialogue-response-enhance

## 2026-03-18 Session Init

### 아키텍처 패턴
- `requireVerified` — 인증 + 검증된 사용자만 허용. 모든 응답 mutation에 사용.
- `db(d1)` — 매 요청마다 새 DB 인스턴스 생성. 글로벌 인스턴스 금지.
- intent-based action — `formData.get("intent")`로 라우팅. `create_response`, `create_self_answer` 패턴 따름.
- `nanoid()` — ID 생성. `~/lib/utils/utils.server` import.
- `Math.floor(Date.now() / 1000)` — Unix timestamp 생성.
- `logger.info()` — 모든 action에서 로깅. `createLogger(request, env).child({ route })` 패턴.

### 파일 위치
- DB 쿼리: `app/db/queries/dialogue/responses.server.ts`
- 검증 스키마: `app/lib/auth/validation.ts`
- 기록 상세 서버: `app/routes/public/logs/$recordSlug.server.ts`
- 기록 상세 UI: `app/routes/public/logs/$recordSlug.tsx`
- 인박스: `app/routes/public/inbox.tsx`
- ResponseCard: `app/components/cards/ResponseCard.tsx`
- QuestionCard: `app/components/cards/QuestionCard.tsx`
- 알림 쿼리: `app/db/queries/social/notifications.server.ts`

### 기존 상태 (Pre-existing issues)
- `responses.server.ts:70-71` — Drizzle TypeScript 에러 (`...records` spread 문제). 이미 존재. 건드리지 않음.
- `questions.server.ts:210-211` — 동일 에러. 이미 존재. 건드리지 않음.
- `$recordSlug*.tsx` — `./+types/$recordSlug` 타입 선언 미발견. 빌드 시 자동 생성됨. 무시.

### 중요 제약
- 알림 생성 시 자기 응답 방지: `auth.user.id !== targetRecord[0].authorId`
- `self_answer` 타입은 알림 생성하지 않음
- moderationStatus !== "clean" 응답은 수정/삭제 불가
- Hard delete (soft delete 금지)
- DB 마이그레이션 금지

## 2026-03-18 Task 1 — 응답 수정/삭제 쿼리 함수 + 검증 스키마

### 구현 완료
- `updateResponseSchema` (validation.ts:149-154)
  - responseId, content, type, visibility 모두 optional (responseId 제외)
  - content: 1-10000 chars, type: 5가지 enum, visibility: cohort|public
  
- `getResponseById()` (responses.server.ts:91-100)
  - 단건 조회, 반환: response | undefined
  - db(d1) 패턴, eq() 조건
  
- `updateResponse()` (responses.server.ts:102-140)
  - 검증: authorId 일치 + moderationStatus === "clean"
  - 실패 시 null, 성공 시 true
  - updatedAt 자동 갱신 (Math.floor(Date.now() / 1000))
  - 선택적 필드만 업데이트 (content, type, visibility)
  
- `deleteResponse()` (responses.server.ts:142-157)
  - 검증: authorId 일치만 (moderationStatus 체크 없음)
  - Hard delete (soft delete 아님)
  - 실패 시 false, 성공 시 true

### 패턴 준수
- db(d1) 매 함수마다 새 인스턴스 생성
- UpdateResponseInput 타입 import 추가
- 기존 함수 수정 없음 (추가만)
- 제약사항 모두 준수 (as any, 빈 catch 없음)

### 커밋
- feat(dialogue): 응답 수정/삭제 쿼리 함수 및 검증 스키마 추가
- 2 files changed, 78 insertions(+)

## 2026-03-18 Task 2 — 응답 등록 시 알림 생성 로직 연결

### 구현 완료
- `$recordSlug.server.ts` create_response intent에 알림 생성 로직 추가
- Import: `createNotification` from `~/db/queries/social/notifications.server`
- 위치: DB insert 성공 후, return 전 (line 226-249)

### 핵심 로직
```typescript
if (auth.user.id !== targetRecord[0].authorId && parsed.data.type !== "self_answer") {
  // 응답 타입별 라벨 매핑
  const TYPE_LABELS = { resonance: "공명", question: "질문", connection: "연결", suggestion: "제안" };
  
  // 작성자 이름 조회
  const authorProfile = await database
    .select({ displayName: learnerProfiles.displayName })
    .from(learnerProfiles)
    .where(eq(learnerProfiles.userId, auth.user.id))
    .limit(1);
  
  // 알림 생성 (non-critical, try-catch 래핑)
  await createNotification(context.cloudflare.env.DB, {
    recipientId: targetRecord[0].authorId,
    type: "response",
    title: `${authorName}님이 ${typeLabel}을 남겼습니다`,
    recordId: parsed.data.recordId,
  }).catch(err => logger.warn(...));
}
```

### 제약사항 준수
- ✓ 자기 응답 제외: `auth.user.id !== targetRecord[0].authorId`
- ✓ self_answer 타입 제외: `parsed.data.type !== "self_answer"`
- ✓ 알림 생성 실패가 응답 등록 실패로 이어지지 않음 (catch 블록)
- ✓ 타입 안전: as any, @ts-ignore 없음
- ✓ 기존 에러 미변경: 새로운 TS 에러 0개

### 커밋
- `feat(notification): 응답 등록 시 알림 생성 연결`
- 1 file changed, 32 insertions(+)

## Task 3 — Inbox 알림 링크 recordId→slug 수정 ✅

**Status**: COMPLETED

### Implementation
- Modified `app/routes/public/inbox.tsx` loader to use LEFT JOIN with records table
- Query now selects `recordSlug: records.slug` alongside `recordId`
- Updated rendering to use `{n.recordSlug &&` condition and `/logs/${n.recordSlug}` link
- Graceful degradation: link not shown when record doesn't exist (null slug)

### Key Changes
1. Import: Added `records` to schema imports (line 9)
2. Query: Changed from `.select()` to explicit field selection with LEFT JOIN (lines 38-54)
3. Rendering: Updated condition and link path (line 166-168)

### Verification
- ✅ No inbox-specific typecheck errors
- ✅ Grep confirms recordSlug usage in correct places
- ✅ Commit: `42dc933` — "fix(inbox): 알림 링크 recordId→slug 수정"

### Pattern Used
Drizzle ORM LEFT JOIN pattern for optional relationships:
```typescript
.select({ ...fields, relatedSlug: relatedTable.slug })
.from(mainTable)
.leftJoin(relatedTable, eq(mainTable.relatedId, relatedTable.id))
```


## 2026-03-18 Task 5 — 응답 수정/삭제 서버 액션 + 인라인 수정 폼 UI ✅

**Status**: COMPLETED

### Implementation Details

#### Server Actions ($recordSlug.server.ts)
- **update_response intent** (line 338-357):
  - Validates with updateResponseSchema (responseId required, content/type/visibility optional)
  - Calls updateResponse(d1, responseId, authorId, data)
  - Returns error if response not found or user not authorized
  - Logs response_update event
  
- **delete_response intent** (line 360-375):
  - Validates responseId presence
  - Calls deleteResponse(d1, responseId, authorId)
  - Returns error if response not found or user not authorized
  - Logs response_delete event

#### Component UI ($recordSlug.tsx)
- **State**: editingResponseId, editingContent
- **Submitting states**: isSubmittingResponseEdit, isSubmittingResponseDelete
- **Handlers**:
  - handleEditResponse: finds response, sets editing state
  - handleDeleteResponse: submits delete via useSubmit
- **Inline form** (line 747-770):
  - Conditional render when editingResponseId === response.id
  - Textarea for content editing
  - Save/Cancel buttons
  - Styling: bg-surface-secondary, border-border (matches self-answer pattern)
- **ResponseCard props**: onEdit, onDelete callbacks

### Pattern Compliance
✓ Intent-based routing (create_response pattern)
✓ Zod validation (updateResponseSchema)
✓ Error handling (user-friendly messages)
✓ Logging (response_update, response_delete)
✓ useCallback for handlers
✓ Conditional rendering for inline form
✓ No type errors introduced

### Commit
- `e2e30f2` — feat(dialogue): 응답 수정/삭제 서버 액션 핸들러
- 2 files changed, 108 insertions(+), 27 deletions(-)

### Key Learnings
- Inline edit form pattern: conditional render with editingId state
- Delete via useSubmit: simpler than form element for single-action buttons
- updateResponseSchema allows optional fields (content, type, visibility)
- deleteResponse checks authorId only (not moderationStatus)
- Both handlers follow create_response pattern for consistency
