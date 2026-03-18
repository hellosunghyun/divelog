# Plan: Write Flow Enhancement (태그 + 메타 페이지 + 게시글 참조)

## 목표

글 작성 플로우를 2단계로 분리하여 UX 개선:
1. **1단계 (에디터)**: 순수 콘텐츠 작성 (제목, 본문, 공개범위, 리듬)
2. **2단계 (메타)**: 저장 후 별도 페이지에서 태그·사람·게시글참조·출처·원문링크 선택

동시에 태그 시스템 확장 (종류 확대, 사용자 생성) 및 게시글 참조 기능 추가.

---

## 결정 사항 (Resolved)

| # | 질문 | 결정 | 근거 |
|---|------|------|------|
| 1 | 메타 페이지 필수 여부 | 선택 (건너뛰기 버튼) | "완성된 글이 아니어도 괜찮습니다" 제품 철학 |
| 2 | 수정 페이지 (edit) 처리 | 인라인 유지, 향상된 TagSelector만 적용 | 수정 시에는 이미 메타데이터 인지 상태 |
| 3 | 태그 카테고리 DB 컬럼 | 추가 안 함 (시드 순서로 그룹 표시) | 단순성 우선 |
| 4 | 사용자 생성 태그 slug | nanoid 기반 (tag-xxxxxxx) | 한국어 slug 변환 복잡성 회피 |
| 5 | 게시글 참조 linkType 값 | `mentioned`, `useful` | 사용자 요청 그대로 반영 |
| 6 | 원문 링크 상세 | URL + 제목 + 설명(한 줄 요약) | 블로그 원문의 맥락 제공 |

---

## 아키텍처 변경

### Write Flow (Before → After)

**Before:**
```
/write → /write/note (단일 페이지: 에디터 + 부가정보 accordion) → /logs/{slug}
/write → /write/article (단일 페이지: 에디터 + 참조 + 부가정보 accordion) → /logs/{slug}/details
```

**After:**
```
/write → /write/note (에디터만: 본문 + 공개범위 + 구간) → /write/meta/{recordId} → /logs/{slug}
/write → /write/article (에디터만: 제목 + 본문 + 리듬 + 공개범위) → /write/meta/{recordId} → /logs/{slug}/details
```

### 메타 페이지 (`/write/meta/:recordId`) 구성

```
┌─────────────────────────────────────────────────┐
│  ← 기록으로 돌아가기          [건너뛰기] [저장]  │
├─────────────────────────────────────────────────┤
│                                                 │
│  태그                                           │
│  ┌─────┐ ┌────┐ ┌────┐ ┌─────┐ ┌────┐ ...    │
│  │기술 │ │회고│ │협업│ │디자인│ │성장│          │
│  └─────┘ └────┘ └────┘ └─────┘ └────┘          │
│  [+ 새 태그 추가] 입력 필드                     │
│                                                 │
│  함께하는 사람                                   │
│  🔍 이름으로 사람을 찾아보세요                   │
│                                                 │
│  언급된 사람                                     │
│  🔍 이름으로 사람을 찾아보세요                   │
│                                                 │
│  언급한 게시글                                   │
│  🔍 제목으로 게시글을 찾아보세요                 │
│                                                 │
│  유용했던 게시글                                  │
│  🔍 제목으로 게시글을 찾아보세요                 │
│                                                 │
│  ─── 아티클 전용 (format=article일 때만) ───    │
│                                                 │
│  원문 링크                                       │
│  URL: [블로그나 원본 글의 URL]                   │
│  제목: [원문 제목 (선택)]                        │
│  설명: [원문에 대한 한 줄 설명 (선택)]           │
│                                                 │
│  참조 및 출처                                    │
│  [+ 참조 추가]                                   │
│  URL: [...] 제목: [...]                          │
│                                                 │
└─────────────────────────────────────────────────┘
```

### 원문 링크 상세 설명

"원문 링크"는 이 기록의 원본이 다른 곳(블로그, 미디엄, 노션 등)에 있을 때 사용한다.
현재는 URL만 입력하지만, 메타 페이지에서는 3개 필드로 확장:

| 필드 | 설명 | 필수 |
|------|------|------|
| URL | 원본 글의 주소 (https://...) | URL 입력 시 필수 |
| 제목 | 원문의 제목 (예: "SwiftUI에서 MVVM 패턴 적용기") | 선택 |
| 설명 | 원문에 대한 한 줄 맥락 설명 (예: "개인 블로그에 먼저 올린 글의 DiveLog 버전입니다") | 선택 |

- URL이 비어 있으면 나머지 필드도 무시
- `records.originalUrl`에 URL 저장, 제목·설명은 별도 컬럼 추가 필요
  → `records.originalTitle`, `records.originalDescription` 추가 (마이그레이션)

---

## TODOs

- [x] Task 1.1: seeds/seed.sql — 태그 17개 추가 (CBL~건강, 총 24개)
- [x] Task 1.2: drizzle/migrations/0012_add_original_meta.sql + schema.server.ts
- [x] Task 1.3+5.1: tags.server.ts — findOrCreateTag + syncTagsForRecord
- [x] Task 1.4+5.4: recordLinks.server.ts — syncTypedRecordLinks + getTypedRecordLinks
- [x] Task 1.5: search-records.tsx — ?includeOwn=true 파라미터
- [x] Task 5.2+5.3: records.server.ts — getRecordById + updateRecordOriginalMeta
- [x] Task 2.1: TagSelector.tsx — allowCreate, inline create UI, check marks
- [x] Task 2.2: RecordSearch.tsx — 신규 컴포넌트 (PersonSearch 패턴)
- [x] Task 3.1+3.2+3.3: meta.$recordId.tsx + routes.ts — 메타 페이지 라우트
- [x] Task 4.1: note.tsx — 부가정보 제거 + /write/meta/${id} 리다이렉트
- [x] Task 4.2: article.tsx — 원문/참조/부가정보 제거 + /write/meta/${id} 리다이렉트
- [x] Task 4.3: $recordSlug.edit.tsx — TagSelector 컴포넌트 (allowCreate=true)

## Wave 구성

### Wave 1 — DB & Backend Foundation (UI 변경 없음)

#### Task 1.1: 시드 태그 확장
**파일**: `seeds/seed.sql`
**변경**: 기존 7개 태그에 ~15개 추가 (총 ~22개)

추가 태그 (시드 순서 = 표시 그룹):
```sql
-- 아카데미 활동
('tag-008', 'CBL',        'cbl',         'Challenge-Based Learning 경험',    '#146C94')
('tag-009', '프로토타입',   'prototype',   '프로토타입 제작과 실험',          '#146C94')
('tag-010', '디자인',      'design',      '디자인 탐구와 실험',              '#146C94')
('tag-011', '발표',        'presentation','발표와 공유 경험',                '#146C94')
('tag-012', '코드',        'code',        '코드 작성과 개발 탐구',           '#146C94')
('tag-013', '리서치',      'research',    '조사와 탐구 과정',                '#146C94')
('tag-014', '멘토링',      'mentoring',   '멘토링 경험과 배움',              '#146C94')
('tag-015', '피드백',      'feedback',    '피드백을 주고받은 경험',          '#146C94')

-- 감성/성찰
('tag-016', '성장',        'growth',      '성장을 실감한 순간',              '#7C3AED')
('tag-017', '고민',        'concern',     '아직 답이 없는 고민',             '#7C3AED')
('tag-018', '돌파',        'breakthrough','막혀있던 것이 뚫린 순간',         '#7C3AED')
('tag-019', '감사',        'gratitude',   '고마웠던 사람과 순간',            '#7C3AED')
('tag-020', '깨달음',      'insight',     '새롭게 알게 된 것',               '#7C3AED')
('tag-021', '불확실성',    'uncertainty', '확실하지 않은 것과 함께 가기',    '#7C3AED')

-- 일상/개인
('tag-022', '일상',        'daily-life',  '아카데미 안팎의 일상',            '#10B981')
('tag-023', '취미',        'hobby',       '개인적 관심사와 취미',            '#10B981')
('tag-024', '건강',        'health',      '몸과 마음의 건강',                '#10B981')
```

#### Task 1.2: records 테이블에 원문 메타 컬럼 추가
**파일**: `drizzle/migrations/XXXX_add_original_meta.sql`, `app/db/schema.server.ts`
**변경**: `original_title TEXT`, `original_description TEXT` 컬럼 추가

```sql
ALTER TABLE records ADD COLUMN original_title TEXT;
ALTER TABLE records ADD COLUMN original_description TEXT;
```

스키마에도 반영:
```typescript
originalTitle: text("original_title"),
originalDescription: text("original_description"),
```

#### Task 1.3: findOrCreateTag 헬퍼 함수
**파일**: `app/db/queries/records/tags.server.ts`
**변경**: 중복 방지 + nanoid slug 생성

```typescript
export async function findOrCreateTag(
  d1: D1Database,
  name: string,
  createdBy?: string
): Promise<{ id: string; name: string; slug: string; isNew: boolean }> {
  // 1. 이름으로 기존 태그 검색 (대소문자 무시)
  const existing = await getTagByName(d1, name.trim());
  if (existing) return { ...existing, isNew: false };

  // 2. 없으면 생성 (nanoid slug)
  const slug = `tag-${nanoid(8)}`;
  const tag = await createTag(d1, { name: name.trim(), slug, createdBy });
  return { id: tag!.id, name: tag!.name, slug: tag!.slug, isNew: true };
}
```

#### Task 1.4: syncRecordLinksForRecord를 linkType별로 스코프
**파일**: `app/db/queries/records/recordLinks.server.ts`
**변경**: DELETE를 linkType으로 제한

**Before**:
```typescript
await database.delete(recordLinks).where(eq(recordLinks.sourceRecordId, sourceRecordId));
```

**After**:
```typescript
// 기존 함수: 하위 호환 유지 (content에서 추출된 reference 링크용)
export async function syncRecordLinksForRecord(...) { /* 기존 그대로 */ }

// 새 함수: linkType별 스코프 동기화
export async function syncTypedRecordLinks(
  d1: D1Database,
  sourceRecordId: string,
  targetRecordIds: string[],
  linkType: string,
) {
  const database = db(d1);
  await database.delete(recordLinks).where(
    and(eq(recordLinks.sourceRecordId, sourceRecordId), eq(recordLinks.linkType, linkType))
  );
  const now = Math.floor(Date.now() / 1000);
  for (const targetId of targetRecordIds) {
    await database.insert(recordLinks).values({
      id: nanoid(), sourceRecordId, targetRecordId: targetId, linkType, createdAt: now,
    });
  }
}
```

#### Task 1.5: search-records API에 자기 글 포함 옵션 추가
**파일**: `app/routes/api/search-records.tsx`
**변경**: `?includeOwn=true` 파라미터 추가 → 본인 draft/private 글도 검색 가능

```typescript
// 기존: visibility IN ('cohort', 'public') 만
// 변경: includeOwn=true 이고 auth.user.id가 있으면
//       OR (authorId = currentUserId) 조건 추가
```

### Wave 2 — Components (라우트 변경 없음)

#### Task 2.1: TagSelector에 인라인 태그 생성 추가
**파일**: `app/components/TagSelector.tsx`
**변경**: 기존 pill 목록 아래에 "새 태그 추가" 입력 필드 추가

요구사항:
- 텍스트 입력 + Enter 또는 "추가" 버튼으로 태그 생성
- 생성된 태그는 즉시 선택 상태로 추가
- 이름 30자 제한, 공백만/빈문자열 방지
- 중복 이름 입력 시 기존 태그 자동 선택 (에러 아님)
- `onCreateTag` 콜백 prop 추가 (서버 생성은 meta 페이지 action에서 처리)
- 선택 피드백 강화: 선택된 태그에 체크 아이콘(✓) 추가

**Props 추가**:
```typescript
interface TagSelectorProps {
  tags: TagWithUsage[];
  selectedTagIds: string[];
  name?: string;
  onChange?: (selectedIds: string[]) => void;
  onCreateTag?: (name: string) => void;  // 새 태그 생성 콜백
  allowCreate?: boolean;                  // 생성 UI 표시 여부 (기본 false)
  maxTags?: number;                       // 최대 선택 수 (기본 10)
}
```

MUST NOT: 기존 선택 로직(checkbox + onChange) 변경하지 않음. 추가만.

#### Task 2.2: RecordSearch 컴포넌트 신규 생성
**파일**: `app/components/RecordSearch.tsx`
**변경**: PersonSearch 패턴 클론 → 게시글 검색

PersonSearch와 동일한 패턴:
- `/api/search-records?q={query}&includeOwn=true` API 호출
- debounce 300ms, min 2글자
- 검색 결과: 제목 + 작성자 이름 + format 아이콘(📝note/📄article)
- 선택 시 pill로 표시 (제목 + 작성자)
- hidden input에 JSON 직렬화: `[recordId, ...]`
- 자기 글 참조 방지 (excludeRecordId prop)
- 키보드 내비게이션 (ArrowDown/Up, Enter, Escape)

**Props**:
```typescript
interface RecordSearchProps {
  selectedRecords: { recordId: string; title: string; authorDisplayName: string | null }[];
  label: string;
  name: string;
  excludeRecordId?: string;  // 현재 편집 중인 record 제외
}
```

### Wave 3 — Meta Route (새 페이지)

#### Task 3.1: /write/meta/:recordId 라우트 생성
**파일**: `app/routes/public/write/meta.$recordId.tsx`
**변경**: 신규 파일

**Loader**:
```typescript
export async function loader({ params, request, context }: Route.LoaderArgs) {
  const auth = await requireVerified(request, context);
  const recordId = params.recordId;

  // 1. Record 조회 + 소유권 검증
  const record = await getRecordById(d1, recordId);
  if (!record || record.authorId !== auth.user.id) throw 403/404;

  // 2. 기존 메타데이터 로드 (편집 시 pre-populate)
  const [allTags, currentTags, participants, mentions, recordLinksData, references] = await Promise.all([
    getAllTags(d1),
    getTagsByRecord(d1, recordId),
    getParticipantsByRecord(d1, recordId),
    getMentionsByRecord(d1, recordId),
    getRecordLinksByRecord(d1, recordId),  // 기존 게시글 참조
    getRecordReferences(d1, recordId),     // 기존 외부 참조
  ]);

  return {
    record: { id, slug, format, title, originalUrl, originalTitle, originalDescription },
    tags: allTags,
    currentTags,
    participants,
    mentions,
    recordLinks: recordLinksData,
    references,
    currentUserId: auth.user.id,
  };
}
```

**Action**:
```typescript
export async function action({ params, request, context }: Route.ActionArgs) {
  const auth = await requireVerified(request, context);
  const formData = await request.formData();
  const recordId = params.recordId;

  // 소유권 재검증
  const record = await getRecordById(d1, recordId);
  if (!record || record.authorId !== auth.user.id) throw 403;

  // 1. 새 태그 생성 처리
  const newTagNames = formData.getAll("newTagName") as string[];
  const createdTagIds: string[] = [];
  for (const name of newTagNames) {
    if (name.trim()) {
      const tag = await findOrCreateTag(d1, name, auth.user.id);
      createdTagIds.push(tag.id);
    }
  }

  // 2. 태그 동기화 (기존 선택 + 새로 생성)
  const selectedTagIds = formData.getAll("tagIds") as string[];
  const allTagIds = [...new Set([...selectedTagIds, ...createdTagIds])];
  await syncTagsForRecord(d1, recordId, allTagIds);

  // 3. 사람 동기화
  const participantsJson = formData.get("participantsJson")?.toString() ?? "[]";
  const mentionUserIdsJson = formData.get("mentionUserIds")?.toString() ?? "[]";
  await syncParticipantsForRecord(d1, recordId, JSON.parse(participantsJson), auth.user.id);
  await syncAllMentionsForRecord(d1, recordId, JSON.parse(mentionUserIdsJson), record.content, auth.user.id);

  // 4. 게시글 참조 동기화 (linkType별)
  const mentionedRecordIds = JSON.parse(formData.get("mentionedRecordIds")?.toString() ?? "[]");
  const usefulRecordIds = JSON.parse(formData.get("usefulRecordIds")?.toString() ?? "[]");
  await syncTypedRecordLinks(d1, recordId, mentionedRecordIds, "mentioned");
  await syncTypedRecordLinks(d1, recordId, usefulRecordIds, "useful");

  // 5. 외부 참조 + 원문 링크 (article only)
  if (record.format === "article") {
    const references = parseReferencesFromFormData(formData);
    await syncRecordReferences(d1, recordId, references);

    const originalUrl = formData.get("originalUrl")?.toString() || null;
    const originalTitle = formData.get("originalTitle")?.toString() || null;
    const originalDescription = formData.get("originalDescription")?.toString() || null;
    await updateRecordOriginalMeta(d1, recordId, { originalUrl, originalTitle, originalDescription });
  }

  // 6. 알림 생성 (participants, mentions)
  // ... (article.tsx의 알림 로직 이동)

  // 7. 리다이렉트
  const detailPath = record.format === "article" ? `/logs/${record.slug}/details` : `/logs/${record.slug}`;
  throw redirect(detailPath);
}
```

#### Task 3.2: 라우트 등록
**파일**: `app/routes.ts`
**변경**: `_public.tsx` 레이아웃 내에 추가

```typescript
route("write/meta/:recordId", "routes/public/write/meta.$recordId.tsx"),
```

#### Task 3.3: 메타 페이지 UI 구현
**파일**: `app/routes/public/write/meta.$recordId.tsx` (Task 3.1과 동일 파일, 컴포넌트 부분)

섹션 구성 (위에서 아래):
1. **헤더**: "← 기록으로 돌아가기" + "건너뛰기" + "저장" 버튼
2. **태그**: TagSelector (allowCreate=true, maxTags=10)
3. **함께하는 사람**: PersonSearch (roleOptions 포함)
4. **언급된 사람**: PersonSearch
5. **언급한 게시글**: RecordSearch (linkType=mentioned)
6. **유용했던 게시글**: RecordSearch (linkType=useful)
7. **원문 링크** (article만): URL + 제목 + 설명 3개 필드
8. **참조 및 출처** (article만): 동적 URL+제목 필드 (기존 article.tsx에서 이동)

"건너뛰기" 클릭 시: 메타 저장 없이 바로 상세 페이지로 리다이렉트
`useUnsavedWarning` + `NavigationBlockerDialog` 적용 (데이터 입력 시)

### Wave 4 — Flow Integration (기존 라우트 수정)

#### Task 4.1: note.tsx에서 메타 섹션 제거 + 리다이렉트 변경
**파일**: `app/routes/public/write/note.tsx`

**Action 변경**:
```diff
- // Handle tags
- const tagIds = formData.getAll("tagIds") as string[];
- ...
- throw redirect(`/logs/${slug}`);
+ throw redirect(`/write/meta/${id}`);
```

**Component 변경**:
- `<details>` 부가정보 블록 전체 제거 (lines 243-272)
- TagSelector import 제거
- PersonSearch import 제거
- selectedTags state 제거
- tags loader 데이터 제거 가능 (메타 페이지에서 로드)

Action에서 제거할 것:
- participantsJson 처리 (→ 메타 페이지로)
- mentionUserIds 처리 (→ 메타 페이지로)
- tagIds 처리 (→ 메타 페이지로)

Action에서 유지할 것:
- record INSERT (content, visibility, stageId 등 핵심 필드)

#### Task 4.2: article.tsx에서 메타 섹션 제거 + 리다이렉트 변경
**파일**: `app/routes/public/write/article.tsx`

**Action 변경**:
```diff
- // Handle tags, participants, mentions, references, notifications
- ...
- throw redirect(`/logs/${slug}/details`);
+ // 콘텐츠에서 자동 추출되는 reference 링크는 유지 (에디터 내 @record 멘션)
+ const recordRefs = extractRecordRefs(content);
+ if (recordRefs.length > 0) {
+   await syncRecordLinksForRecord(context.cloudflare.env.DB, id, recordRefs);
+ }
+ throw redirect(`/write/meta/${id}`);
```

**핵심 결정 — 콘텐츠 기반 reference 링크 처리**:
- `extractRecordRefs(content)` + `syncRecordLinksForRecord()`는 article.tsx action에 **유지**
- 이 함수는 에디터 본문 내 `@record` 멘션을 파싱하여 linkType="reference"로 저장
- 메타 페이지의 "언급한 게시글"(linkType="mentioned")/"유용했던 게시글"(linkType="useful")과 **다른 linkType**
- 각 linkType은 독립적으로 동기화됨 (`syncTypedRecordLinks`는 linkType별 DELETE)
- 따라서 충돌 없음: article action이 "reference" 저장 → 메타 action이 "mentioned"/"useful" 저장

**Component 변경**:
- "원문 링크" 섹션 제거 (lines 345-358)
- "참조 및 출처" 섹션 제거 (lines 393-445)
- `<details>` 부가정보 블록 제거 (lines 447-476)
- references state 제거
- originalUrl input 제거
- 관련 imports 제거 (PersonSearch, TagSelector, syncParticipantsForRecord 등)
- extractRecordRefs, syncRecordLinksForRecord import은 **유지**

Action에서 제거할 것:
- originalUrl 처리 → 메타 페이지
- references (외부 URL) 처리 → 메타 페이지
- participantsJson, mentionUserIds → 메타 페이지
- tagIds → 메타 페이지
- 알림 생성 → 메타 페이지
- markAsRead → 메타 페이지에서 최종 저장 시

Action에서 유지할 것:
- record INSERT (핵심 필드)
- `extractRecordRefs(content)` + `syncRecordLinksForRecord()` (콘텐츠 기반 자동 추출)
- contentText 추출 (getPlainText)

Validation 변경:
- `createArticleSchema`에서 `references`, `originalUrl` 필드를 optional로 유지하되 action에서 무시
- 또는 별도 `createArticleContentSchema`를 만들어 content 관련만 검증

#### Task 4.3: edit 페이지에서 향상된 TagSelector 적용
**파일**: `app/routes/public/logs/$recordSlug.edit.tsx`

**변경**:
- 인라인 태그 체크박스를 `<TagSelector>` 컴포넌트로 교체 (lines 624-664)
- `allowCreate={true}` prop 추가 (수정 시에도 태그 생성 가능)
- 새 태그 생성 처리를 action에 추가 (`findOrCreateTag` 호출)
- PersonSearch 제거 불필요 (edit에는 이미 없는 것으로 확인 → 실제로는 edit에 PersonSearch가 import되어 있지 않음, loader에서만 데이터 로드)

MUST NOT: edit 페이지의 2단계 분리. 기존 구조 유지.

### Wave 5 — 쿼리 헬퍼 & 정리

#### Task 5.1: syncTagsForRecord 헬퍼 추가
**파일**: `app/db/queries/records/tags.server.ts`
**변경**: 메타 페이지 action에서 사용할 태그 동기화 함수

```typescript
export async function syncTagsForRecord(d1: D1Database, recordId: string, tagIds: string[]) {
  const database = db(d1);
  await database.delete(recordTags).where(eq(recordTags.recordId, recordId));
  const now = Math.floor(Date.now() / 1000);
  for (const tagId of tagIds) {
    await database.insert(recordTags).values({ recordId, tagId, createdAt: now });
  }
}
```

#### Task 5.2: updateRecordOriginalMeta 헬퍼 추가
**파일**: `app/db/queries/records/records.server.ts`
**변경**: 원문 링크 메타 업데이트 함수

```typescript
export async function updateRecordOriginalMeta(
  d1: D1Database,
  recordId: string,
  meta: { originalUrl: string | null; originalTitle: string | null; originalDescription: string | null }
) {
  const database = db(d1);
  await database.update(records).set({
    originalUrl: meta.originalUrl,
    originalTitle: meta.originalTitle,
    originalDescription: meta.originalDescription,
    updatedAt: Math.floor(Date.now() / 1000),
  }).where(eq(records.id, recordId));
}
```

#### Task 5.3: getRecordById 쿼리 추가 (meta 페이지 loader용)
**파일**: `app/db/queries/records/records.server.ts`
**변경**: ID로 record 조회 (slug가 아닌 ID 기반)

```typescript
export async function getRecordById(d1: D1Database, id: string) {
  const database = db(d1);
  const result = await database.select().from(records).where(eq(records.id, id)).limit(1);
  return result[0] ?? null;
}
```

#### Task 5.4: getTypedRecordLinks 쿼리 추가
**파일**: `app/db/queries/records/recordLinks.server.ts`
**변경**: linkType별로 record links 조회

```typescript
export async function getTypedRecordLinks(d1: D1Database, sourceRecordId: string, linkType: string) {
  const database = db(d1);
  return database
    .select({
      targetRecordId: recordLinks.targetRecordId,
      targetTitle: records.title,
      targetSlug: records.slug,
      authorDisplayName: learnerProfiles.displayName,
    })
    .from(recordLinks)
    .leftJoin(records, eq(recordLinks.targetRecordId, records.id))
    .leftJoin(learnerProfiles, eq(records.authorId, learnerProfiles.userId))
    .where(and(
      eq(recordLinks.sourceRecordId, sourceRecordId),
      eq(recordLinks.linkType, linkType),
    ));
}
```

---

## 스코프 외 (MUST NOT)

- ❌ Admin 태그 관리 페이지 변경 (`/admin/tags`)
- ❌ 태그 카테고리 DB 컬럼 추가
- ❌ 태그 모더레이션/승인 워크플로우
- ❌ AI 기반 태그 추천
- ❌ 게시글 참조 미리보기 카드
- ❌ 상세 페이지에서 outgoing reference 표시 변경
- ❌ 태그 병합/중복 제거 도구
- ❌ 자동 저장 (autosave) 기능
- ❌ 테스트 인프라 추가

---

## 검증 기준 (실행 가능한 QA 시나리오)

### Wave 1 QA — DB & Backend Foundation

**Task 1.1 (시드 태그):**
- Tool: `wrangler d1 execute DB --local --file=seeds/seed.sql`
- 검증: `wrangler d1 execute DB --local --command="SELECT count(*) FROM tags"` → 22개 이상
- 기대: 기존 7개 + 신규 ~15개 태그 INSERT 성공, 중복 에러 없음

**Task 1.2 (원문 메타 컬럼):**
- Tool: `wrangler d1 migrations apply DB --local`
- 검증: `wrangler d1 execute DB --local --command="PRAGMA table_info(records)"` → `original_title`, `original_description` 컬럼 존재
- Tool: `pnpm typecheck` → records 관련 타입 에러 없음

**Task 1.3 (findOrCreateTag):**
- Tool: `pnpm typecheck` → tags.server.ts 에러 없음
- 검증 (코드 리뷰):
  1. `findOrCreateTag(d1, "기술")` → 기존 tag-001 반환, `isNew: false`
  2. `findOrCreateTag(d1, "새로운태그")` → 신규 생성, nanoid slug, `isNew: true`
  3. 동시 생성 race condition → unique constraint catch 후 기존 태그 반환 (try/catch 존재 확인)

**Task 1.4 (syncTypedRecordLinks):**
- Tool: `pnpm typecheck` → recordLinks.server.ts 에러 없음
- 검증 (코드 리뷰): DELETE WHERE에 `AND linkType = ?` 조건 존재 확인
- 기존 `syncRecordLinksForRecord` 함수 시그니처 변경 없음 확인 (하위 호환)

**Task 1.5 (search-records API):**
- Tool: `pnpm typecheck` → search-records.tsx 에러 없음
- 검증: `includeOwn` 파라미터 파싱 + authorId 조건 분기 코드 확인

### Wave 2 QA — Components

**Task 2.1 (TagSelector 향상):**
- Tool: `pnpm typecheck` → TagSelector.tsx 에러 없음
- 검증 (코드 리뷰):
  1. `allowCreate` prop이 false일 때 생성 UI 미표시
  2. `allowCreate` prop이 true일 때 텍스트 입력 + "추가" 버튼 표시
  3. `onCreateTag(name)` 콜백 호출 시 name이 30자 이내, 공백만이 아닌지 검증
  4. 기존 `onChange` prop 동작 변경 없음 (하위 호환)
  5. 새 태그 생성 시 hidden input `newTagName`에 값 추가 (폼 직렬화용)

**TagSelector-메타페이지 인터페이스 계약:**
- TagSelector가 `allowCreate=true`일 때, 사용자가 새 태그 이름을 입력하면:
  1. 컴포넌트 내부에서 임시 태그 객체를 생성 (id=`temp-{nanoid}`, name=입력값)
  2. `onCreateTag(name)` 콜백 호출 → 부모가 상태 관리
  3. hidden `<input name="newTagName" value={name}>` 으로 폼에 직렬화
  4. 메타 페이지 action이 `formData.getAll("newTagName")`으로 수집 → `findOrCreateTag` 호출

**Task 2.2 (RecordSearch):**
- Tool: `pnpm typecheck` → RecordSearch.tsx 에러 없음
- 검증 (코드 리뷰):
  1. `/api/search-records?q={query}&includeOwn=true` API 호출 확인
  2. debounce 300ms, minLength 2 설정 확인
  3. 선택 시 hidden input JSON 직렬화 확인
  4. `excludeRecordId` prop으로 자기 글 필터링 확인
  5. PersonSearch와 동일한 키보드 내비게이션 패턴 (ArrowDown/Up, Enter, Escape)

### Wave 5 QA — Query Helpers

**Tasks 5.1-5.4:**
- Tool: `pnpm typecheck` → tags.server.ts, records.server.ts, recordLinks.server.ts 에러 없음
- 검증 (코드 리뷰): 각 함수의 import/export, 파라미터, 반환 타입 확인

### Wave 3 QA — Meta Route

**Task 3.1-3.3 (메타 페이지):**
- Tool: `pnpm typecheck` → meta.$recordId.tsx 에러 없음
- Tool: `pnpm build` → 빌드 성공
- 브라우저 검증 (`pnpm dev` 후):
  1. 노트 작성 → "저장" → `/write/meta/{recordId}` 페이지 표시 확인
  2. 메타 페이지에 태그 섹션, 사람 섹션, 게시글 참조 섹션 표시 확인
  3. "건너뛰기" 클릭 → `/logs/{slug}` 리다이렉트 확인
  4. 태그 선택 + 저장 → record_tags 테이블에 데이터 확인
  5. 타인 record 접근 시도 → 403 또는 404 확인
  6. 존재하지 않는 recordId → 404 확인

### Wave 4 QA — Flow Integration

**Task 4.1 (note.tsx):**
- Tool: `pnpm typecheck` → note.tsx 에러 없음
- 브라우저 검증:
  1. 노트 작성 페이지에 `<details>` 부가정보 섹션 없음 확인
  2. 저장 시 `/write/meta/{id}`로 리다이렉트 확인 (이전: `/logs/{slug}`)

**Task 4.2 (article.tsx):**
- Tool: `pnpm typecheck` → article.tsx 에러 없음
- 브라우저 검증:
  1. 아티클 작성 페이지에 원문 링크, 참조, 부가정보 없음 확인
  2. 저장 시 `/write/meta/{id}`로 리다이렉트 확인
  3. 본문에 @record 멘션 포함 시 → record_links에 linkType="reference" 저장 확인 (자동 추출 유지)

**Task 4.3 (edit.tsx):**
- Tool: `pnpm typecheck` → $recordSlug.edit.tsx 에러 없음
- 브라우저 검증:
  1. 수정 페이지에서 TagSelector 컴포넌트 표시 + allowCreate=true 확인
  2. 새 태그 생성 입력 → 저장 → tags 테이블에 신규 태그 + record_tags에 연결 확인

### 최종 통합 검증

- Tool: `pnpm typecheck && pnpm build` → 전체 에러 없음
- E2E 브라우저 검증:
  1. **노트 전체 플로우**: /write → 노트 선택 → 본문 작성 → 저장 → 메타 페이지 → 태그 3개 선택 + 사람 1명 → 저장 → /logs/{slug} 도착
  2. **아티클 전체 플로우**: /write → 아티클 선택 → 제목+본문 → 저장 → 메타 페이지 → 태그 + 원문링크(URL+제목+설명) + 참조 2개 + 유용했던 게시글 1개 → 저장 → /logs/{slug}/details 도착
  3. **건너뛰기 플로우**: 작성 → 저장 → 메타 페이지 → 건너뛰기 → 상세 페이지 도착 (메타데이터 없음)
  4. **수정 플로우**: /logs/{slug}/edit → 태그 추가 (새 태그 생성 포함) → 수정 저장 → /logs/{slug} 도착

---

## 태스크 의존성

```
Wave 1 (Foundation)
  1.1 시드 태그
  1.2 원문 메타 컬럼  ─────────────────────────────┐
  1.3 findOrCreateTag ──────────┐                    │
  1.4 syncTypedRecordLinks      │                    │
  1.5 search-records API        │                    │
                                │                    │
Wave 2 (Components)             │                    │
  2.1 TagSelector 향상 ←────────┘                    │
  2.2 RecordSearch 신규                              │
                                                     │
Wave 5 (Query Helpers) ← Wave 1                      │
  5.1 syncTagsForRecord                              │
  5.2 updateRecordOriginalMeta ←─────────────────────┘
  5.3 getRecordById
  5.4 getTypedRecordLinks
                                
Wave 3 (Meta Route) ← Wave 1,2,5
  3.1 meta route loader/action
  3.2 routes.ts 등록
  3.3 meta page UI

Wave 4 (Integration) ← Wave 3
  4.1 note.tsx 수정
  4.2 article.tsx 수정
  4.3 edit.tsx 태그 향상
```

---

## 파일 변경 요약

| 파일 | 변경 유형 | Wave |
|------|----------|------|
| `seeds/seed.sql` | 수정 (태그 INSERT 추가) | 1.1 |
| `drizzle/migrations/XXXX_add_original_meta.sql` | 신규 | 1.2 |
| `app/db/schema.server.ts` | 수정 (originalTitle, originalDescription) | 1.2 |
| `app/db/queries/records/tags.server.ts` | 수정 (findOrCreateTag, syncTagsForRecord) | 1.3, 5.1 |
| `app/db/queries/records/recordLinks.server.ts` | 수정 (syncTypedRecordLinks, getTypedRecordLinks) | 1.4, 5.4 |
| `app/routes/api/search-records.tsx` | 수정 (includeOwn 파라미터) | 1.5 |
| `app/components/TagSelector.tsx` | 수정 (인라인 생성 UI) | 2.1 |
| `app/components/RecordSearch.tsx` | 신규 | 2.2 |
| `app/db/queries/records/records.server.ts` | 수정 (getRecordById, updateRecordOriginalMeta) | 5.2, 5.3 |
| `app/routes/public/write/meta.$recordId.tsx` | 신규 | 3.1, 3.3 |
| `app/routes.ts` | 수정 (route 추가) | 3.2 |
| `app/routes/public/write/note.tsx` | 수정 (메타 섹션 제거, 리다이렉트 변경) | 4.1 |
| `app/routes/public/write/article.tsx` | 수정 (메타 섹션 + 참조 + 원문 제거, 리다이렉트) | 4.2 |
| `app/routes/public/logs/$recordSlug.edit.tsx` | 수정 (TagSelector 컴포넌트 적용) | 4.3 |
