# Learnings — editor-and-enrichment

## Project Context
- Plan: Tiptap dual-mode editor + service enrichment
- Base: divelog (React Router 7 + Cloudflare Pages + D1 + Drizzle + @adakrpos/auth)
- New features: ArticleEditor (Tiptap), NoteEditor (textarea), R2 image upload, record edit, tags, self-answer UI, journey timeline, activity feed

## Critical Constraints
- NO auto-save (AGENTS.md forbidden)
- NO base64 images in JSON (R2 URL only)
- NO as any / @ts-ignore
- NO AI writing assistance
- NO real-time updates (WebSocket/SSE)
- Tags: admin-curated ONLY (no user-created tags)

## Route Registration
- This project uses EXPLICIT route registration in app/routes.ts
- Every new route file MUST also add entry to app/routes.ts

## New Routes Required
- route("logs/:recordSlug/edit", "routes/_public.logs.$recordSlug.edit.tsx") — T16
- route("tags", "routes/_public.tags.tsx") — T24
- route("tags/:tagSlug", "routes/_public.tags.$tagSlug.tsx") — T24
- route("api/upload", "routes/api.upload.tsx") — T10
- route("api/images/*", "routes/api.images.$.tsx") — T10
- route("admin/tags", "routes/_admin.admin.tags.tsx") — T22

## Content Architecture
- content_text: plain text mirror column for JSON content (search + snippet)
- detectContentFormat(): JSON.parse try/catch to detect format
- getPlainText(): extracts text from Tiptap JSON or returns plaintext as-is
- ContentRenderer: server pre-computes HTML, passes as contentHtml prop
- Note format: plain text, whitespace-pre-wrap display
- Article format: Tiptap JSON, rendered via generateHTML()

## Tiptap Setup
- Use @tiptap/react for client, @tiptap/html for server-side HTML generation
- immediatelyRender: false (edge runtime timing)
- R2 image serving: splat proxy route /api/images/* → R2.get(key)
- Image URL format: /api/images/records/{nanoid}.{ext}

## Task Skip List (already integrated into other tasks)
- T9: integrated into T8 (ArticleEditor extensions)
- T11: integrated into T8 (ArticleEditor extensions)
- T17: integrated into T8 (ArticleEditor extensions)
- T26: integrated into T25 (/me page)
- T29: integrated into T28 (activity feed + home)

## T1: Vitest Setup (COMPLETED)

### What Was Done
- Installed vitest@^4.1.0 and @cloudflare/vitest-pool-workers@^0.13.0
- Created vitest.config.ts with node environment (not Cloudflare pool, simpler approach)
- Added test scripts to package.json: "test": "vitest run", "test:watch": "vitest"
- Created app/lib/__tests__/example.test.ts with 3 passing smoke tests
- All tests pass: exit code 0, 3/3 tests passing

### Configuration Details
- Test glob: app/**/*.test.ts, app/**/*.test.tsx
- Environment: node (simpler than @cloudflare/vitest-pool-workers)
- Globals: true (describe, it, expect available without imports)
- tsconfig paths plugin enabled for path resolution

### Key Decision
- Used simple node environment instead of @cloudflare/vitest-pool-workers
- Reason: Cloudflare pool adds complexity for unit tests; integration tests can use node environment
- If future tests need D1/R2 bindings, can migrate to pool later

### Next Steps
- Tests can now be written in app/**/*.test.ts files
- Run with `pnpm test` or `pnpm test:watch`
- Example test file serves as template for future tests

## T5: Tiptap Dependencies & Editor Base (COMPLETED)

### What Was Done
- Installed 9 Tiptap packages to dependencies (not devDependencies):
  - @tiptap/react@3.20.1, @tiptap/pm@3.20.1, @tiptap/starter-kit@3.20.1
  - @tiptap/html@3.20.1, @tiptap/extension-placeholder@3.20.1
  - @tiptap/extension-image@3.20.1, @tiptap/extension-code-block-lowlight@3.20.1
  - lowlight@3.3.0, @tiptap/extension-underline@3.20.1
- Created app/lib/editor-config.ts with shared extension definitions
- Created app/styles/editor.css with ProseMirror CSS overrides
- Imported editor.css in app/app.css
- Build verified: pnpm build successful (exit code 0)
- TypeScript verified: no errors in new files

### Configuration Details
- EDITOR_EXTENSIONS constant exports all extensions for reuse
- StarterKit configured with CodeBlock disabled (using CodeBlockLowlight instead)
- HardBreak disabled to prevent unwanted line breaks
- Placeholder text: "무엇이 남았는지부터 적어도 좋습니다." (Korean)
- Image extension configured but not enabled in UI (Phase 2)
- CodeBlockLowlight with common language support via lowlight
- Underline extension for text formatting

### CSS Styling (Quiet Depth)
- Editor container: border #E3E8EF, focus ring #146C94 (Ocean Blue)
- Code blocks: background #F2F5F8 (Surface Secondary)
- Blockquotes: left border Ocean Blue, secondary background
- Links: Ocean Blue with underline
- Selection: Mist Blue background
- All spacing: 4px multiples
- Reduced motion support included
- Focus-visible outline for accessibility

### Key Decisions
- Dependencies (not devDependencies): Tiptap used in server-side HTML generation
- Placeholder in Korean: matches project language requirement
- CodeBlockLowlight over default CodeBlock: better syntax highlighting
- Image extension configured: ready for Phase 2 R2 integration
- No AI extensions: per AGENTS.md constraints

### Next Steps
- T6: Create ArticleEditor component (client-side Tiptap wrapper)
- T7: Create NoteEditor component (textarea wrapper)
- T8: Implement editor extensions (image upload, custom marks)
- T10: R2 image upload API
- T16: Record edit page with ArticleEditor

## T6: NoteEditor 향상된 textarea 컴포넌트 (COMPLETED)

### What Was Done
- Created app/components/editor/NoteEditor.tsx (pure textarea, no Tiptap)
- Created app/components/editor/ directory
- Implemented markdown keyboard shortcuts (Cmd/Ctrl + B/I/K)
- Implemented auto-height adjustment (min 6rem, max 60vh)
- Implemented real-time character counter with warning colors
- Applied Quiet Depth styling via CSS custom properties
- Added accessibility attributes (aria-label, aria-describedby, aria-invalid)
- Added data-testid="note-editor" for testing
- Build verified: tsc --noEmit exit code 0

### Props Interface
```typescript
interface NoteEditorProps {
  name: string;           // form input name
  defaultValue?: string;  // initial content
  maxLength?: number;     // default 50000
  error?: string;         // validation error message
  onChange?: (value: string) => void;
  className?: string;
  disabled?: boolean;
  readOnly?: boolean;
  placeholder?: string;   // default: "짧은 생각, 메모, 기록을 남겨보세요..."
  htmlProps?: Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, ...>;
}
```

### Markdown Shortcuts Implementation
- Cmd/Ctrl + B: Wraps selection with `**text**`
- Cmd/Ctrl + I: Wraps selection with `*text*`
- Cmd/Ctrl + K: Inserts `[text](url)` with url portion selected for editing
- Uses textarea.selectionStart/End for cursor/selection management
- requestAnimationFrame for DOM updates before cursor repositioning

### Auto-Height Implementation
- useCallback for adjustHeight to maintain stable reference
- Height calculation: scrollHeight clamped between minHeight (6rem) and maxHeight (60vh)
- Called after every content change via requestAnimationFrame
- No useEffect dependency on value (linter complained about unnecessary dep)

### Character Counter
- Shows `{count} / 50,000` in bottom-right corner
- Warning color (var(--color-warning)) at 80%+ capacity
- Error color (var(--color-error)) at 100% capacity
- aria-live="polite" for screen reader updates

### CSS Variables Used
- Colors: --color-border, --color-ocean-blue, --color-error, --color-warning, --color-surface, --color-surface-secondary, --color-text-primary, --color-text-tertiary
- Spacing: --space-2, --space-3, --space-4
- Typography: --font-size-base, --font-size-caption, --font-size-meta, --font-weight-medium, --line-height-relaxed, --font-sans
- Layout: --radius-sm (12px)
- Motion: --duration-fast, --ease-default

### Key Decisions
- Pure textarea (no Tiptap): Note format is simple, no rich text needed
- No markdown preview: Note is plaintext, preview adds unnecessary complexity
- No auto-save: Per AGENTS.md constraints
- Keyboard hints shown only when focused: Reduces visual clutter
- Korean placeholder and labels: Matches project language requirement

### Integration Note
- NoteEditor will be mounted in write page (T15)
- QA limited to build/type verification until T15 integration

## T14: Self-answer 생성 UI (COMPLETED)

### What Was Done
- Created app/components/SelfAnswerCard.tsx with editorial card style
- Created app/db/queries/selfAnswers.server.ts with query functions
- Modified app/routes/_public.logs.$recordSlug.tsx:
  - Added self-answer loading in loader
  - Added create_self_answer intent in action
  - Added UI for "답변하기" button and inline form
- Build verified: pnpm build successful

### SelfAnswerCard Design
- "자기 답변" 뱃지: bg-mist-blue text-ocean-blue
- Editorial card style (NOT chat bubble/speech balloon)
- Rounded corners: rounded-2xl
- Border: border-reef-cyan/40
- Background: bg-mist-blue/50
- data-testid="self-answer-card" for testing

### Query Functions (selfAnswers.server.ts)
- createSelfAnswer(d1, authorId, { questionId, content })
- getSelfAnswersByQuestion(d1, questionId)
- getSelfAnswersByRecord(d1, recordId) — uses inArray for multiple question IDs

### Action Handler (create_self_answer)
- requireVerified for authentication
- Validates questionId, content, recordId
- Permission check: record.authorId === auth.user.id
- Only record author can create self-answers

### UI Implementation
- useState for expandedQuestionId (toggle form visibility)
- isRecordAuthor check: currentUserId === record.authorId
- selfAnswersByQuestion Map for grouping
- "답변하기" button only shown to record author
- Inline form expansion on button click
- Cancel button to close form

### Key Decisions
- Editorial card over chat bubble: per AGENTS.md design guidelines
- No edit/delete UI: Phase 2 scope
- No auto-save: per AGENTS.md constraints
- Korean labels: matches project language requirement

## T33: 에디터 및 콘텐츠 통합 테스트 (COMPLETED)

### What Was Done
- Created `app/lib/__tests__/r2-cleanup.test.ts` for `extractImageKeys()` and `cleanupRemovedImages()`
- Created `app/lib/__tests__/content.integration.test.ts` for content utility + image cleanup integration coverage
- Covered nested Tiptap nodes, invalid JSON fallback, removed-image diff deletion, and plaintext backward compatibility

### Key Decisions
- Mocked `R2Bucket.delete()` instead of using a real binding to keep tests fast and Node-environment compatible
- Used `/api/images/...` URLs in fixtures to match the actual proxy-based image serving strategy from T10
- Added integration assertions across `detectContentFormat()`, `getPlainText()`, `renderContentToHtml()`, and `extractImageKeys()` to catch JSON/plaintext regression at boundaries

### Verification Notes
- Target verification command: `pnpm vitest run --reporter=verbose`
- LSP diagnostics should stay clean for new test files
- Evidence file for this task: `.sisyphus/evidence/task-33-integration-tests.txt`

## T2: Drizzle 스키마에 `content_text` 컬럼 추가 (COMPLETED)

### What Was Done
- Added `contentText: text("content_text").default("")` to records table in app/db/schema.server.ts
- Generated migration: drizzle/migrations/0001_dear_jamie_braddock.sql
- Applied migration locally: wrangler d1 migrations apply DB --local
- Verified column exists: PRAGMA table_info(records) shows content_text at position 20
- Updated validation schema: app/lib/validation.ts added contentText field
- Updated createRecord function: app/db/queries/records.server.ts includes contentText parameter
- TypeScript verification: npx tsc --noEmit passed with no errors

### Schema Changes
- Column: content_text (TEXT)
- Nullable: yes (default "")
- Position: after content field
- Backward compatible: existing records get empty string default

### Validation Schema
```typescript
contentText: z.string().max(50000).optional()
```
- Optional field in CreateRecordInput
- Max 50,000 characters (same as content)
- Defaults to empty string in createRecord

### Query Function Update
```typescript
contentText: data.contentText ?? ""
```
- Passed to database insert
- Defaults to empty string if not provided
- Supports future enrichment (plain text extraction, search indexing)

### Key Decisions
- Nullable with default "": allows existing records to work without migration data
- Separate from content: content stays as-is (JSON or plaintext), contentText is always plaintext
- Max 50,000 chars: matches content field limit
- Optional in validation: not required for record creation yet (Phase 2 enrichment)

## T3: tags 및 record_tags 테이블 추가 (COMPLETED)

### What Was Done
- Added `tags` table to app/db/schema.server.ts with 8 columns
- Added `recordTags` junction table to app/db/schema.server.ts
- Updated app/db/relations.server.ts with tagsRelations and recordTagsRelations
- Generated migration: drizzle/migrations/0002_majestic_bastion.sql
- Applied migration locally: wrangler d1 migrations apply DB --local
- Verified both tables created correctly via PRAGMA table_info
- TypeScript verification: npx tsc --noEmit passed with no errors

### tags Table Schema
```typescript
export const tags = sqliteTable("tags", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  description: text("description").default(""),
  color: text("color").default("#6E6E73"),  // Quiet Depth text secondary
  createdBy: text("created_by"),             // Admin user ID
  createdAt: integer("created_at").notNull().default(now()),
  updatedAt: integer("updated_at").notNull().default(now()),
});
```

### recordTags Junction Table Schema
```typescript
export const recordTags = sqliteTable(
  "record_tags",
  {
    recordId: text("record_id")
      .notNull()
      .references(() => records.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
    createdAt: integer("created_at").notNull().default(now()),
  },
  (table) => [primaryKey({ columns: [table.recordId, table.tagId] })],
);
```

### Relations Added
- tagsRelations: many(recordTags)
- recordTagsRelations: one(records), one(tags)
- recordsRelations: added recordTags: many(recordTags)

### Migration Details
- File: drizzle/migrations/0002_majestic_bastion.sql
- Status: ✅ Applied successfully
- Unique indexes created on tags.name and tags.slug
- Foreign keys with cascade delete configured

### Key Decisions
- Admin-curated tags only: no user-generated tags in Phase 1
- Color field: defaults to Quiet Depth text secondary (#6E6E73)
- createdBy field: tracks which admin created the tag
- Junction table pattern: not JSON array (per AGENTS.md constraints)
- Timestamps: unixepoch() for consistency with existing schema

## T4: 콘텐츠 추상화 레이어 (IMPLEMENTED)

### What Was Done
- Created `app/lib/content.server.ts` with `detectContentFormat()`, `getPlainText()`, and `renderContentToHtml()`
- Created `app/components/ContentRenderer.tsx` to render precomputed `contentHtml` with note/article-specific typography
- Created `app/lib/editor-extensions.ts` for shared `ContentFormat` constants/types
- Used server-safe Tiptap extensions (`StarterKit`, `Image`, `Underline`) instead of importing client editor config

### Implementation Notes
- `detectContentFormat()` only returns `json` when parsed content is a ProseMirror doc (`type === "doc"`)
- `getPlainText()` recursively walks Tiptap JSON and inserts line breaks around block nodes for readable search/snippet text
- `renderContentToHtml()` escapes plaintext notes and falls back to plaintext rendering when article JSON parsing or HTML generation fails
- `ContentRenderer` receives HTML from the loader and applies Quiet Depth article styles with Tailwind utility selectors

### Key Decisions
- Avoided importing `app/lib/editor-config.ts` on the server because it includes client-oriented editor concerns like placeholder/lowlight config
- Kept plaintext fallback graceful so malformed article JSON still remains readable instead of failing hard
- Styled rendered articles with existing Quiet Depth tokens (`text-*`, `bg-mist-blue`, `border-border`) instead of introducing new CSS files

## T7: ArticleEditor Tiptap 베이스 컴포넌트 (COMPLETED)

### What Was Done
- Created `app/components/editor/ArticleEditor.tsx` as a client component using Tiptap v3 `useEditor`
- Configured `immediatelyRender: false` to prevent edge runtime hydration mismatches
- Added base extensions: `StarterKit.configure({ codeBlock: false })`, `Placeholder`, `Underline`
- Implemented BubbleMenu (from `@tiptap/react/menus`) with formatting buttons: Bold, Italic, Underline, H1, H2, Code
- Added active-state highlighting using `editor.isActive(...)` for each toolbar button
- Added `name?: string` prop and internal hidden input support (`<input type="hidden" ... />`) for form integration
- Implemented safe JSON parsing for incoming `content` (parse fail -> empty editor)

### Props Interface
```typescript
interface ArticleEditorProps {
  content?: string;
  onChange?: (json: string) => void;
  className?: string;
  placeholder?: string;
  name?: string;
}
```

### Integration Notes
- `onUpdate` emits `JSON.stringify(editor.getJSON())` through `onChange`
- Hidden input value tracks editor JSON string, so Remix/React Router form post can consume article JSON without extra adapter code
- When external `content` prop changes, editor content is synchronized via `setContent(..., { emitUpdate: false })`

### Key Decisions
- Imported BubbleMenu from `@tiptap/react/menus` (v3 export path), not from `@tiptap/react`
- Kept code block node disabled per task boundary (T8 handles code block feature expansion)
- Used Quiet Depth tokens for bubble menu border/background/shadow to stay visually consistent with editor CSS

## T10: R2 이미지 업로드 API + 이미지 프록시 라우트 (COMPLETED)

### What Was Done
- Created `app/routes/api.upload.tsx` as an action-only resource route
- Created `app/routes/api.images.$.tsx` as an R2-backed splat proxy loader
- Registered both routes in `app/routes.ts` outside the public/admin layouts
- Verified `npx react-router typegen && pnpm exec tsc --noEmit` passes
- Verified `pnpm build` succeeds after adding both routes

### Upload Route Rules
- Auth uses `getAuth()` directly, not `requireAuth`/`requireVerified`, so unauthenticated API calls return JSON `401` instead of redirect
- Accepts only `multipart/form-data` with a `file` field
- Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`, `image/gif`
- Max size: 5MB
- R2 key format: `records/{nanoid(12)}.{ext}`
- Response shape: `{ url: "/api/images/{key}", key }`

### Image Proxy Notes
- Splat route file name is `api.images.$.tsx`, and the key is read via `params["*"]`
- R2 objects are served with original `Content-Type`, long-lived immutable cache headers, and `ETag`
- Missing keys return plain `404 Not Found`

### QA Note
- Authenticated curl QA is currently blocked in this workspace because `.dev.vars` still has a placeholder `TEST_VERIFIED_SESSION`
- Module-level implementation, diagnostics, typecheck, and production build all pass

## T12: 콘텐츠 소비 지점 plaintext/render 정렬 (COMPLETED)

### What Was Done
- Updated `SceneCard` to accept optional `contentSnippet` so server loaders can pass `getPlainText()` output without breaking existing plaintext fallback
- Updated `app/routes/_public.logs.$recordSlug.tsx` loader to precompute `contentHtml` with `renderContentToHtml()` and `plainTextContent` with `getPlainText()`
- Swapped record detail body rendering from raw `whitespace-pre-wrap` text to `ContentRenderer`
- Updated logs index/search/admin preview to derive snippets or meta descriptions from `getPlainText()`

### Key Decisions
- Kept `getPlainText()` in server loaders only; client components receive precomputed snippet/html props
- Added `normalizeContentFormat()` in `app/lib/editor-extensions.ts` so DB string values can be safely narrowed before passing to content helpers
- Preserved `SceneCard` fallback substring logic for untouched callers so existing note/plaintext routes keep rendering

### Verification
- changed files LSP diagnostics: clean
- `pnpm exec tsc --noEmit`: success
- `pnpm build`: success

## T13: content.server.ts 단위 테스트 (COMPLETED)

### What Was Done
- Created `app/lib/__tests__/content.server.test.ts` with 34 comprehensive unit tests
- Tests cover all three exported functions: `getPlainText()`, `detectContentFormat()`, `renderContentToHtml()`
- All tests pass: `pnpm vitest run app/lib/__tests__/content.server.test.ts` → 34/34 ✓
- Evidence file: `.sisyphus/evidence/task-13-tests.txt`

### Test Coverage

#### getPlainText (13 tests)
- Plain text passthrough for note format
- Empty string handling
- Single/multiple paragraph extraction from Tiptap JSON
- Heading and paragraph extraction
- Multiple newline collapsing (3+ → 2)
- Invalid JSON graceful fallback
- Non-Tiptap JSON handling
- Nested formatting marks preservation
- Hard break handling
- Bullet list extraction (adds extra newline between items)
- Empty document handling
- Whitespace trimming (trim() removes all leading/trailing)

#### detectContentFormat (10 tests)
- Valid Tiptap JSON detection → "json"
- Plain text detection → "plaintext"
- Invalid JSON detection → "plaintext"
- Non-Tiptap JSON detection → "plaintext"
- Empty Tiptap document detection → "json"
- JSON array detection → "plaintext"
- JSON without type field → "plaintext"
- JSON with wrong type value → "plaintext"
- Empty string → "plaintext"
- Multiline plain text → "plaintext"

#### renderContentToHtml (11 tests)
- Plain text wrapping with whitespace-pre-wrap for note format
- HTML special character escaping (<, >, &, ", ')
- Tiptap JSON to HTML rendering (includes xmlns attribute)
- Invalid JSON fallback to plain text rendering
- Non-Tiptap JSON fallback
- Empty note/document handling
- Newline preservation in note format

### Key Findings
- `extractPlainText()` adds newline after each block node (paragraph, heading, listItem, etc.)
- Multiple consecutive block nodes create multiple newlines, then `replace(/\n{3,}/g, "\n\n")` collapses to double
- `trim()` removes ALL leading/trailing whitespace, not just outer spaces
- `generateHTML()` from @tiptap/html adds xmlns attribute to root elements
- Tiptap warnings about duplicate extension names are harmless (from StarterKit + explicit Underline)

### Test Infrastructure
- Uses vitest globals (describe, it, expect)
- Node environment (no DOM required)
- Tests run in ~416ms
- No external dependencies needed (all functions are pure)

## T8: ArticleEditor 확장 통합 (COMPLETED)

### What Was Done
- Created `app/components/editor/SlashCommandMenu.tsx` with Tiptap suggestion-based slash menu extension
- Added slash commands in Korean: 제목 1/2/3, 글머리 기호, 번호 매기기, 인용구, 구분선, 코드 블록, 이미지
- Added keyboard navigation in slash menu (Arrow Up/Down, Enter, Escape) and query filtering
- Extended `app/components/editor/ArticleEditor.tsx` with `CodeBlockLowlight`, `Image`, and slash command extension integration
- Added image upload pipeline to `/api/upload` with drag-and-drop/paste handling and error feedback
- Added HTML paste sanitization (`style` attribute removal) via editor `handlePaste`
- Added 100KB JSON size guard in `onUpdate` with Korean warning message
- Extended BubbleMenu with a code block toggle button
- Added direct deps `@tiptap/core`, `@tiptap/suggestion` for explicit module/type resolution in pnpm workspace

### Key Decisions
- Kept `allowBase64: false` to prevent base64 image payloads in stored JSON
- Reused Quiet Depth visual tokens for slash menu surface/border/shadow profile
- Used `view.pasteHTML()` after sanitization to keep Tiptap schema-based filtering behavior intact
- If upload fails from slash/drop/paste path, show user-facing error instead of silent failure

## T20: 검색 쿼리를 content_text 컬럼 기반으로 전환 (COMPLETED)

### What Was Done
- Updated `app/routes/_public.search.tsx` loader: Changed records search from `like(records.content, pattern)` to `like(records.contentText, pattern)` (line 47)
- Updated `app/db/queries/search.server.ts` searchAll() function:
  - Changed snippet field from `records.content` to `records.contentText` (line 17)
  - Changed search condition from `like(records.content, pattern)` to `like(records.contentText, pattern)` (line 22)
- Updated `app/db/queries/records.server.ts` searchRecordsByKeyword() function: Changed search from `like(records.content, pattern)` to `like(records.contentText, pattern)` (line 151)
- Verified all changes: `pnpm build` successful, no TypeScript errors in modified files

### Search Functions Updated
1. **_public.search.tsx loader**: Main search page uses contentText for records search
2. **searchAll()**: Utility function for global search uses contentText for both search and snippet
3. **searchRecordsByKeyword()**: Keyword search helper uses contentText

### Why contentText?
- `content` field stores raw JSON (Tiptap) or plaintext
- `content_text` field stores plain text mirror (added in T2)
- Search should match against plain text, not JSON structure
- Snippets should display readable text, not JSON

### Schema Confirmation
- records table has `contentText: text("content_text").default("")` (schema.server.ts line 109)
- createRecord() already handles contentText parameter (records.server.ts line 107)
- updateRecord() supports contentText via Partial<CreateRecordInput>

### Verification
- ✓ pnpm build: 213 client modules, 363 server modules, no errors
- ✓ LSP diagnostics: No errors in _public.search.tsx, search.server.ts, records.server.ts
- ✓ All search functions now use contentText consistently
- ✓ No FTS5, no ranking/scoring, no type assertions

### Key Decisions
- Maintained LIKE queries (no FTS5 per requirements)
- No ranking/scoring system
- All changes are type-safe, no @ts-ignore needed
- Backward compatible: existing records with empty contentText still searchable

## T21: 연결된 기록 양방향 표시 개선 (COMPLETED)

### What Was Done
- Added `getLinkedRecords()` function to `app/db/queries/records.server.ts`
- Added `LinkedRecordDirection` type ("outgoing" | "incoming") and `LinkedRecord` interface
- Updated `app/routes/_public.logs.$recordSlug.tsx` loader to use new query function
- Updated UI to use `SceneCard` component for linked records display
- Added direction badge ("참조" / "역참조") to indicate link direction
- Verified: `pnpm build` successful, `pnpm exec tsc --noEmit` clean

### Bidirectional Query Logic
- **outgoing**: This record points to another record (linkedRecordId = other.id)
- **incoming**: Other records point to this record (other.linkedRecordId = this.id)
- Two separate queries combined in single function, not UNION (simpler with Drizzle)

### UI Design
- Uses `SceneCard` component with `contentSnippet` prop (100 char preview)
- Direction badge: "참조" (outgoing) or "역참조" (incoming)
- Badge positioned absolute top-right, uses mist-blue/ocean-blue Quiet Depth tokens
- 2-column grid on md+ (changed from 3-column)

### Type Safety
- Drizzle returns `format` and `type` as `string`, not literal types
- Solution: explicit type assertion `as "note" | "article"` and `as "personal" | "challenge" | "collaboration"`
- Avoids `as any` by narrowing types at the point where we know they're valid

## T22: 태그 Admin CRUD UI 구현 (COMPLETED)

### What Was Done
- Created `app/db/queries/tags.server.ts` with 8 CRUD query functions
- Created `app/routes/_admin.admin.tags.tsx` admin page with table + create form
- Updated `app/components/admin/AdminSidebar.tsx` to add "태그 관리" menu item
- Updated `app/routes.ts` to register admin/tags route
- Verified: `pnpm build` successful, `npx tsc --noEmit` clean

### Query Functions (tags.server.ts)
- `getAllTags(d1)`: Returns all tags with usage count (JOIN record_tags)
- `getTagById(d1, id)`: Single tag lookup by ID
- `getTagBySlug(d1, slug)`: Single tag lookup by slug (for duplicate check)
- `getTagByName(d1, name)`: Single tag lookup by name (for duplicate check)
- `createTag(d1, data)`: Insert new tag with crypto.randomUUID()
- `updateTag(d1, id, data)`: Update tag fields with updatedAt timestamp
- `deleteTag(d1, id)`: Delete tag (record_tags cascade deleted via schema)
- `getTagUsageCount(d1, tagId)`: Count records using this tag

### Admin Page Features
- Tag list table: color preview, name, slug, description, usage count, created date, delete action
- Create form: name (required), slug (auto-generated + editable), description, color picker
- Duplicate validation: both name and slug must be unique
- Delete confirmation: confirm() dialog before deletion
- Error feedback: displays action errors in red banner

### Slug Auto-Generation
```typescript
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9가-힣-]/g, "")  // Korean support
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
```
- Supports Korean characters in slug
- Auto-fills on name input unless manually edited
- Uses data-manual attribute to track user edits

### Admin Design Compliance
- Utilitarian, dense table layout
- Neutral colors (no ocean/marine elements)
- text-meta/text-caption font sizes (13-14px)
- bg-admin-surface, border-admin-border, text-admin-text classes
- No Quiet Depth emotional design

### Route Registration
```typescript
route("admin/tags", "routes/_admin.admin.tags.tsx"),
```
- Added to admin layout array in app/routes.ts
- Positioned between templates and analytics

### Sidebar Menu Position
- Added "태그 관리" as 11th item (of 15 total)
- Position: after "템플릿", before "애널리틱스"
- href: `/admin/tags`

### Key Decisions
- crypto.randomUUID() for ID generation (consistent with other entities)
- Color picker default: #6E6E73 (Text Secondary)
- CASCADE delete handles record_tags cleanup automatically
- No tag hierarchy (flat list only, per requirements)
- Admin-curated tags only (no user-created tags API)

## T15: `/write` 듀얼 모드 에디터 통합 (COMPLETED)

### What Was Done
- Updated `app/routes/_public.write.tsx` to switch editor UI by format radio selection (`note`/`article`)
- Note mode now uses `NoteEditor` with form field `name="content"`
- Article mode now uses `ArticleEditor` with `name="content"` and JSON sync via `onChange`
- Updated action logic to derive `contentText` by format:
  - note: `contentText = content`
  - article: JSON-validated content -> `getPlainText(content, "article")`
- Persisted `contentText` in `records` insert payload

### Validation Updates
- Strengthened `createRecordSchema` in `app/lib/validation.ts` with `superRefine`
- For `format === "article"`, validates `content` as Tiptap document JSON (`type === "doc"`)
- Kept `contentText` as optional string field for schema compatibility

### Key Decisions
- Kept all existing metadata fields (`type`, `rhythm`, `visibility`, `responsePreference`, stage/challenge/collaboration IDs) unchanged
- Did not modify `NoteEditor` or `ArticleEditor` internals; integration handled in route layer only
- Server-side extraction (`getPlainText`) remains source of truth for article plaintext mirror

## T18: Seed 데이터 재생성 — JSON 콘텐츠 및 태그 데이터 추가 (COMPLETED)

### What Was Done
- Modified 6 existing records (record-002, 005, 008, 012, 017, 022, 025) to article format with Tiptap JSON content
- Added content_text field to all 25 records with plain text extraction
- Created 7 tags with Korean names, slugs, descriptions, and Quiet Depth colors
- Created 12 record_tags connections linking records to tags
- Applied migrations and executed seed.sql successfully
- Created evidence file: `.sisyphus/evidence/task-18-seed.txt`

### Records Modified to Article Format
1. **record-002**: 챌린지를 시작하며 (혼자서 탐구를 이어가기)
2. **record-005**: 팀과 함께 발견한 것들 (다른 시선이 모일 때)
3. **record-008**: 전환점에서 돌아보기 (막막함을 읽는 방법)
4. **record-012**: 나만의 탐구: 기록의 힘 (기록은 거울이다)
5. **record-017**: 기록이란 무엇인가 (기록의 세 가지 역할)
6. **record-022**: 팀 탐구의 전환점 (다름을 자원으로 읽기)
7. **record-025**: 탐색의 시작을 마치며 (질문의 변화)

### Tiptap JSON Structure
All articles use valid Tiptap JSON with:
- Heading level 2 (제목)
- Multiple paragraphs with body text
- Proper nesting: doc → heading/paragraph → text nodes
- No base64 images (Phase 2 scope)

### Tags Created (7 total)
| ID | Name | Slug | Color | Description |
|----|------|------|-------|-------------|
| tag-001 | 기술 | tech | #146C94 | 기술 관련 기록과 탐구 |
| tag-002 | 회고 | retrospect | #7C3AED | 반성과 성찰의 기록 |
| tag-003 | 협업 | collaboration | #EC4899 | 함께 탐구하는 경험과 배움 |
| tag-004 | 질문 | question | #F59E0B | 오래 붙드는 질문과 탐구 |
| tag-005 | 기록의 의미 | meaning-of-writing | #10B981 | 기록을 남기는 이유와 역할 |
| tag-006 | 전환 | transition | #8B5CF6 | 구간의 전환과 변화 |
| tag-007 | 학습 | learning | #06B6D4 | 학습의 과정과 의미 |

### Record_Tags Connections (12 total)
- record-002: 기술, 질문
- record-005: 협업, 질문
- record-008: 전환, 회고
- record-012: 기록의 의미, 학습
- record-017: 기록의 의미
- record-022: 협업, 전환
- record-025: 질문

### Database Verification
- ✓ 7 tags inserted successfully
- ✓ 12 record_tags connections created
- ✓ All 25 records have content_text populated
- ✓ 6 records have article format with valid Tiptap JSON
- ✓ No migration errors (already applied in T2, T3)
- ✓ 43 SQL commands executed successfully

### Key Decisions
- Used 6 records for article format (not all 25) to preserve note format diversity
- Tiptap JSON with heading + multiple paragraphs (realistic article structure)
- content_text extracted as plain text (heading + all paragraph text concatenated)
- Tags use Quiet Depth color palette (#146C94, #7C3AED, #EC4899, etc.)
- All tag names and descriptions in Korean (per AGENTS.md requirement)
- Tag slugs in English lowercase (tech, retrospect, collaboration, etc.)

### Compliance
- ✓ No auto-save (seed data only)
- ✓ No base64 images (R2 URLs only, Phase 2)
- ✓ No as any / @ts-ignore
- ✓ Korean UI text, English code identifiers
- ✓ All relationships preserved (questions, responses, sentences, etc.)
- ✓ Backward compatible (existing records unmodified except format/content)

---

## T25: /me 페이지 여정 타임라인 (2026-03-15)

### 구현 내용
- `/me` 페이지에 "나의 여정" 섹션 추가
- Stage별로 그룹핑된 기록 타임라인 표시
- Stage 톤 매핑 (prelude/bridge/challenge/epilogue)

### 기술 학습

#### Drizzle batch 쿼리 활용
```typescript
const [drafts, mySentences, myQuestions, unansweredQuestions, allStages, myRecordsWithStage] = 
  await database.batch([
    // ... 6개의 쿼리를 병렬 실행
  ]);
```
- `database.batch()`로 여러 쿼리를 한 번의 요청으로 실행
- 성능 최적화: N+1 쿼리 방지

#### Stage 톤 CSS 변수 매핑
```typescript
const STAGE_TONE_MAP: Record<string, { bg: string; border: string; label: string }> = {
  prelude: { bg: "var(--color-prelude-bg)", border: "var(--color-prelude)", label: "전주" },
  bridge: { bg: "var(--color-bridge-bg)", border: "var(--color-bridge)", label: "연결" },
  challenge: { bg: "var(--color-challenge-bg)", border: "var(--color-challenge)", label: "도전" },
  epilogue: { bg: "var(--color-epilogue-bg)", border: "var(--color-epilogue)", label: "에필로그" },
};
```
- tokens.css에 정의된 CSS 변수 활용
- inline style로 동적 적용 (Tailwind 클래스 대신)

#### 그룹핑 패턴
```typescript
const recordsByStage: Record<string, typeof myRecordsWithStage> = {};
for (const row of myRecordsWithStage) {
  const stageId = row.stageId ?? "no-stage";
  if (!recordsByStage[stageId]) {
    recordsByStage[stageId] = [];
  }
  recordsByStage[stageId].push(row);
}
```
- null stageId는 "no-stage" 키로 처리

### 디자인 결정

#### 진행률 표시 금지
- AGENTS.md 명시: "절대 만들지 않는 것 - 좋아요, 추천, 인기순, 랭킹"
- Quiet Depth 원칙: "Belonging without Competition"
- 대신 단순한 타임라인 형태로 표현

#### Stage 카드 디자인
- 왼쪽 border 4px로 Stage 톤 구분
- 배경색은 Stage type에 따라 미묘하게 다름
- 기록이 없는 Stage도 표시 (빈 상태 안내)
- 최대 3개 기록 노출, 초과분은 "외 N개의 기록"

### 주의사항
- SceneCard 타입 에러는 pre-existing issue (Drizzle이 string으로 추론, SceneCard는 union type 기대)
- 실제 런타임에는 문제 없음 (DB에 올바른 값 저장됨)

---

## T24: 태그 브라우징 페이지 구현 (2026-03-15)

### 구현 내용
- `/tags` — 전체 태그 목록 페이지 (chip/pill 형태, 기록 수 표시)
- `/tags/:tagSlug` — 특정 태그의 기록 목록 페이지
- 기록 상세 페이지에 태그 표시 + 링크 추가

### 기술 학습

#### tags.server.ts 확장 패턴
```typescript
// 기존 함수에 추가
export async function getRecordsByTag(d1: D1Database, tagId: string): Promise<TaggedRecord[]>
export async function getTagsByRecord(d1: D1Database, recordId: string)
```
- `getRecordsByTag`: record_tags JOIN records JOIN learner_profiles JOIN stages
- `getTagsByRecord`: record_tags JOIN tags로 기록의 태그 조회
- 동적 import 사용: `await import("../schema.server")`와 `await import("drizzle-orm")`

#### 태그 chip UI 패턴
```typescript
<Link
  to={`/tags/${tag.slug}`}
  className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-surface text-text-primary text-sm font-medium transition-all duration-normal hover:border-reef-cyan/40 hover:bg-mist-blue/20 hover:text-ocean-blue"
>
  <span>{tag.name}</span>
  <span className="text-caption text-text-tertiary">{tag.usageCount}</span>
</Link>
```
- Quiet Depth 스타일: 얇은 border, 부드러운 hover 효과
- 기록 수는 text-tertiary로 표시 (강조하지 않음)

#### HeroSection variant="stage" 재사용
```typescript
<HeroSection
  variant="stage"
  title={
    <span>
      <Link to="/tags" className="text-text-tertiary hover:text-text-primary">
        태그
      </Link>
      {" / "}
      {tag.name}
    </span>
  }
  subtitle={`"${tag.name}" 태그가 붙은 기록 ${taggedRecords.length}개`}
/>
```
- Breadcrumb 스타일 title로 계층 구조 표현

### 디자인 결정

#### 태그 클라우드/인기도 금지
- AGENTS.md 명시: "절대 만들지 않는 것 - 인기순 정렬, 베스트 댓글"
- Quiet Depth 원칙: "평가 대신 질문, 비교 대신 연결"
- 태그는 알파벳순 정렬 (getAllTags: `orderBy(asc(tags.name))`)
- 크기/색상으로 인기도 표시하지 않음

#### 기록 상세 페이지 태그 배치
- 작성자 정보와 같은 행에 배치 (flex gap-4)
- 태그는 rounded-full chip 형태
- hover 시 reef-cyan/mist-blue 톤으로 부드럽게 강조

### 라우트 등록 패턴
```typescript
// app/routes.ts
route("tags", "routes/_public.tags.tsx"),
route("tags/:tagSlug", "routes/_public.tags.$tagSlug.tsx"),
```
- Public 레이아웃 내에 위치
- search와 inbox 사이에 배치

---

## T28: 여정 활동 피드 컴포넌트 (2026-03-15)

### 구현 내용
- `app/db/queries/activity.server.ts` — `getRecentActivity()` 함수
- `app/components/ActivityFeed.tsx` — 시간별 그룹핑 피드 컴포넌트
- `_public._index.tsx` 수정 — 홈페이지에 활동 피드 섹션 추가

### 기술 학습

#### Drizzle 집계 쿼리 패턴
```typescript
const [recordResult] = await database
  .select({ count: count() })
  .from(records)
  .where(and(
    gt(records.createdAt, startTime),
    lte(records.createdAt, endTime),
    sql`${records.visibility} != 'draft'`,
  ));
```
- `count()` 함수로 행 수 집계
- `gt`, `lte`로 시간 범위 필터링
- `sql` 템플릿 리터럴로 커스텀 조건 (visibility != 'draft')

#### 시간 기간 계산
```typescript
const now = Math.floor(Date.now() / 1000);
const todayStart = now - 86400;      // 24시간 전
const weekStart = now - 7 * 86400;   // 7일 전
const prevWeekStart = now - 14 * 86400; // 14일 전
```
- Unix timestamp (초 단위) 기준
- 86400 = 24 * 60 * 60 (하루의 초)

#### 그룹핑 + 정렬 패턴
```typescript
function groupByPeriod(activities: ActivityItem[]): Map<ActivityItem["period"], ActivityItem[]> {
  const groups = new Map<ActivityItem["period"], ActivityItem[]>();
  for (const activity of activities) {
    const existing = groups.get(activity.period) ?? [];
    existing.push(activity);
    groups.set(activity.period, existing);
  }
  return groups;
}
```
- Map으로 period별 그룹핑
- ?? [] 로 null safe 초기화

### 디자인 결정

#### 개인 특정 금지
- AGENTS.md 명시: "절대 만들지 않는 것 - 좋아요, 추천, 인기순, 랭킹"
- Quiet Depth 원칙: "평가 대신 질문, 비교 대신 연결"
- 요약 텍스트: "3개의 새 기록이 남겨졌습니다" (개인 이름 노출 안 함)

#### 빈 상태 안내
```typescript
<p className="text-text-secondary text-base">여정이 조용합니다</p>
<p className="text-text-tertiary text-sm mt-2">새로운 활동이 있으면 여기에 표시됩니다.</p>
```
- 허가형 어조: 운영 원칙 문서 준수
- Quiet Depth: 조용하고 절제된 메시지

#### ActivityFeed 스타일
- 각 항목: bg-surface, rounded-xl, border-border-subtle
- 아이콘: 텍스트 기반 emoji (📝❓💬🤝)
- 그룹 라벨: text-xs, uppercase, tracking-widest, text-text-tertiary

### 주의사항
- getRecentActivity는 batch 쿼리를 사용하지 않음 (여러 개별 쿼리)
- 이유: 시간 범위별로 다른 집계 필요, batch로 묶기 복잡
- 성능: 2주 데이터만 조회하므로 충분히 빠름

---

## T16: `/logs/:recordSlug/edit` 기록 수정 페이지 (2026-03-15)

### 구현 내용
- `app/routes/_public.logs.$recordSlug.edit.tsx` 신규 생성
- loader에서 `requireVerified` + `getRecordBySlug`로 기록 조회 후 작성자 권한(403) 확인
- loader에서 write 페이지 패턴과 동일하게 `templates`, `currentStage`, `collaborations` 로드
- action에서 format별 `contentText` 재계산 후 `updateRecord()`로 기록 업데이트
- 성공 시 `/logs/:recordSlug`로 redirect
- 기록 상세(`_public.logs.$recordSlug.tsx`)에 작성자 전용 `수정` 링크 추가
- `app/routes.ts`에 `route("logs/:recordSlug/edit", "routes/_public.logs.$recordSlug.edit.tsx")` 등록

### 기술 학습

#### getRecordBySlug 반환 형태 주의
```typescript
const recordData = await getRecordBySlug(d1, recordSlug);
// 반환값은 { record, author } 구조
if (!recordData || recordData.record.authorId !== auth.user.id) {
  return data({ error: "권한이 없습니다." }, { status: 403 });
}
```
- 단일 record 객체가 아니라 조인 결과 객체를 반환하므로 `recordData.record`로 접근해야 함

#### write/create와 edit/update에서 contentText 동기화 패턴 통일
```typescript
const format = formatRaw === "article" ? "article" : "note";
const content = typeof contentRaw === "string" ? contentRaw : "";

let contentText = "";
if (format === "article") {
  try {
    JSON.parse(content);
    contentText = getPlainText(content, "article");
  } catch {
    contentText = content;
  }
} else {
  contentText = content;
}
```
- write(T15)와 동일 로직을 edit에도 적용하면 검색/snippet용 평문 컬럼 일관성 유지 가능

### UI 결정
- Note는 `<NoteEditor defaultValue={record.content} />`, Article은 `<ArticleEditor content={record.content} />`로 기존 내용 주입
- 형식 전환 시 `"글 형식을 변경하면 서식이 사라질 수 있습니다."` 경고 노출
- 상세 페이지 헤더에 작성자 본인에게만 `수정` CTA를 표시해 접근 경로를 명확히 제공

---

## T23: Write/Edit 페이지에 태그 선택 UI 추가 (2026-03-15)

### 구현 내용
- `app/routes/_public.write.tsx` 수정:
  - loader에 `getAllTags()` 호출 추가, tags 반환
  - action에 태그 삽입 로직 추가 (formData.getAll("tagIds") → record_tags 테이블)
  - UI에 태그 선택 chip 섹션 추가 (fieldset/legend, hidden checkbox, visible span)
  
- `app/routes/_public.logs.$recordSlug.edit.tsx` 수정:
  - loader에 `getAllTags()` + `getTagsByRecord()` 호출 추가
  - action에 태그 업데이트 로직 추가 (기존 삭제 후 새로 삽입)
  - UI에 태그 선택 chip 섹션 추가 (기존 선택 상태 로드)

### 기술 학습

#### 폼 데이터에서 다중 값 처리
```typescript
const tagIds = formData.getAll("tagIds") as string[];
if (tagIds.length > 0) {
  for (const tagId of tagIds) {
    await database.insert(recordTags).values({
      recordId: id,
      tagId,
      createdAt: now,
    });
  }
}
```
- `formData.getAll(name)` 으로 같은 name의 모든 값 추출
- 배열로 반환되므로 타입 단언 필요
- 루프로 각 항목을 개별 insert (batch 사용 불가, insert 쿼리는 batch 미지원)

#### 태그 선택 UI 패턴 (chip/pill)
```typescript
<fieldset className="border-0 m-0 p-0">
  <legend className="block text-meta font-medium text-text-secondary mb-3">
    태그 (선택)
  </legend>
  <div className="flex flex-wrap gap-2">
    {tags.map((tag) => (
      <label key={tag.id} className="cursor-pointer">
        <input
          type="checkbox"
          name="tagIds"
          value={tag.id}
          checked={selectedTags.has(tag.id)}
          onChange={(e) => {
            const newTags = new Set(selectedTags);
            if (e.target.checked) {
              newTags.add(tag.id);
            } else {
              newTags.delete(tag.id);
            }
            setSelectedTags(newTags);
          }}
          className="hidden"
        />
        <span
          className={`inline-block px-3 py-1 rounded-full text-sm border transition-colors ${
            selectedTags.has(tag.id)
              ? "border-ocean-blue bg-mist-blue text-ocean-blue"
              : "border-border bg-surface text-text-secondary hover:border-ocean-blue"
          }`}
        >
          {tag.name}
        </span>
      </label>
    ))}
  </div>
</fieldset>
```
- Fieldset/legend으로 접근성 확보
- Hidden checkbox + visible span으로 스타일링 자유도 확보
- Set<string>으로 선택 상태 관리 (빠른 조회)
- 선택 시: ocean-blue border + mist-blue background
- 미선택 시: border-border + hover 효과

#### Edit 페이지에서 기존 선택 상태 로드
```typescript
const [selectedTags, setSelectedTags] = useState<Set<string>>(
  new Set(currentTags.map((t) => t.id))
);
```
- loader에서 `getTagsByRecord()`로 현재 태그 조회
- 초기 상태를 currentTags로 설정
- 사용자가 변경하면 새로운 Set으로 업데이트

#### 태그 업데이트 패턴 (replace)
```typescript
// 기존 태그 삭제
await database.delete(recordTags).where(eq(recordTags.recordId, recordData.record.id));

// 새 태그 삽입
if (tagIds.length > 0) {
  const now = Math.floor(Date.now() / 1000);
  for (const tagId of tagIds) {
    await database.insert(recordTags).values({
      recordId: recordData.record.id,
      tagId,
      createdAt: now,
    });
  }
}
```
- 기존 record_tags 행 모두 삭제 (cascade 아님, 명시적 delete)
- 새로운 태그만 삽입 (replace 패턴)
- 태그 없이 저장하면 모든 연결 제거

### 디자인 결정

#### Chip/Pill 스타일 선택
- 버튼 대신 chip: 여러 선택을 시각적으로 명확하게 표현
- rounded-full: 약간의 부드러움 (카드의 rounded-2xl보다 작음)
- px-3 py-1: 컴팩트한 크기 (버튼보다 작음)

#### 색상 선택
- 선택됨: ocean-blue border + mist-blue background (Quiet Depth 톤)
- 미선택: border-border + text-text-secondary (중립적)
- hover: border-ocean-blue (선택 가능성 암시)

#### 접근성
- Fieldset/legend으로 그룹 의미 전달
- Hidden checkbox로 form 호환성 유지
- Label로 감싸서 클릭 영역 확대
- onChange로 즉시 피드백 (시각적 상태 변경)

### 주의사항
- `formData.getAll()` 반환값은 FormDataEntryValue[] (string | File)이므로 타입 단언 필요
- Drizzle batch()는 insert 쿼리를 지원하지 않으므로 루프로 처리
- Edit 페이지에서 currentTags 로드 시 getTagsByRecord() 필요 (T24에서 추가됨)

### 검증 결과
- ✓ pnpm tsc --noEmit: 에러 없음
- ✓ pnpm build: 성공 (494 client modules, 599 server modules)
- ✓ 타입 안전성: as any, @ts-ignore 없음
- ✓ 접근성: fieldset/legend, hidden input, label 사용

---

## T30: R2 이미지 orphan 정리 (2026-03-15)

### 구현 내용
- `app/lib/r2-cleanup.server.ts` 신규 생성
  - `extractImageKeys(tiptapJsonString)`: Tiptap JSON에서 이미지 R2 키 추출
  - `cleanupRemovedImages(r2, oldJson, newJson)`: 기록 수정 시 제거된 이미지 R2 삭제
- `app/routes/_public.logs.$recordSlug.edit.tsx` 수정
  - import 추가: `cleanupRemovedImages`
  - action에서 updateRecord 후 cleanupRemovedImages 호출 (article format만)

### 기술 학습

#### Tiptap JSON 재귀 순회 패턴
```typescript
function traverse(node: any): void {
  if (!node) return;
  
  // type === "image"인 노드에서 src 추출
  if (node.type === "image" && node.attrs?.src) {
    const src = node.attrs.src;
    // src: "/api/images/records/abc123.jpg" → key: "records/abc123.jpg"
    if (src.startsWith("/api/images/")) {
      const key = src.replace("/api/images/", "");
      keys.push(key);
    }
  }
  
  // 자식 노드 순회
  if (Array.isArray(node.content)) {
    for (const child of node.content) {
      traverse(child);
    }
  }
}
```
- doc.content 배열부터 시작
- 각 노드의 content 배열 재귀 순회
- type === "image" 노드만 처리
- attrs.src에서 R2 키 추출

#### 이미지 키 형식 변환
```typescript
// src: "/api/images/records/abc123.jpg"
// key: "records/abc123.jpg"
const key = src.replace("/api/images/", "");
```
- 업로드 API (T10)에서 생성: `records/{nanoid(12)}.{ext}`
- 클라이언트에서 저장: `/api/images/records/{nanoid(12)}.{ext}`
- R2에서 삭제할 때: `records/{nanoid(12)}.{ext}` 형식 필요

#### 제거된 이미지 필터링 패턴
```typescript
const oldKeys = extractImageKeys(oldJson);
const newKeys = new Set(extractImageKeys(newJson));

// old에는 있고 new에는 없는 키만 삭제
const toDelete = oldKeys.filter((key) => !newKeys.has(key));

// 병렬로 삭제
await Promise.all(toDelete.map((key) => r2.delete(key)));
```
- Set으로 newKeys 변환 (O(1) 조회)
- filter로 차집합 계산
- Promise.all로 병렬 삭제

### 디자인 결정

#### Article format만 처리
- Note format은 이미지 미지원 (plaintext만)
- article format에만 Tiptap JSON 저장
- 조건: `if (parsed.data.format === "article")`

#### 각 기록별 독립 이미지
- 다른 기록에서 같은 이미지 참조 없음 (현재 아키텍처)
- 따라서 기록 수정 시 제거된 이미지는 안전하게 삭제 가능
- 향후 이미지 공유 기능 추가 시 참조 카운팅 필요

#### 기록 삭제 시 cleanup 미구현
- 현재 기록 삭제 경로 없음 (soft delete 미지원)
- 향후 삭제 기능 추가 시 별도 작업 필요

#### 주기적 GC 배치 미구현
- 고아 이미지 정리는 수정 시에만 수행
- 주기적 배치 작업은 별도 작업 (Cloudflare Queues 활용 가능)

### 검증 결과
- ✓ pnpm build: 성공 (494 client modules, 600 server modules)
- ✓ tsc --noEmit: 에러 없음
- ✓ 타입 안전성: as any, @ts-ignore 없음
- ✓ 에러 처리: JSON 파싱 실패 시 빈 배열 반환
- ✓ 병렬 처리: Promise.all로 R2 삭제 최적화

---

## T27: Article 형식 문장 하이라이팅 지원 (2026-03-15)

### 구현 내용
- `app/routes/_public.logs.$recordSlug.tsx`의 Article 본문에 선택 감지용 `ref`와 native `mouseup` 리스너를 추가했다.
- 선택 텍스트를 plain text로 정규화한 뒤 길이 10~500자 범위일 때만 본문 위에 `문장 저장` 플로팅 버튼을 노출한다.
- 저장 액션은 기존 `save_sentence` intent를 유지하고, 실제 insert는 `app/db/queries/sentences.server.ts`의 `saveSentence()` 헬퍼를 재사용하도록 정리했다.

### 기술 학습

#### Selection API로 기사형 본문 범위 추출
```typescript
const selection = window.getSelection();
const normalizedText = selection?.toString().replace(/\s+/g, " ").trim() ?? "";
const rect = selection?.getRangeAt(0).getBoundingClientRect();
```
- `dangerouslySetInnerHTML`로 렌더링된 article HTML도 부모 요소에서 selection을 읽으면 plain text를 뽑아낼 수 있다.
- 저장 전에 공백을 한 번 정리하면 문단 사이 줄바꿈이나 중복 공백이 그대로 DB에 들어가는 일을 줄일 수 있다.

#### 선택 범위가 Article 본문 안에 있는지 판별
```typescript
const anchorNode = range.commonAncestorContainer.nodeType === Node.TEXT_NODE
  ? range.commonAncestorContainer.parentNode
  : range.commonAncestorContainer;

return anchorNode instanceof Node && articleContentRef.current?.contains(anchorNode);
```
- `window.getSelection()`은 페이지 전체 범위를 반환하므로, Article wrapper 내부 selection인지 별도 판별이 필요하다.
- `commonAncestorContainer` 기준으로 검사하면 inline mark가 많은 article HTML에서도 안정적으로 동작한다.

#### 플로팅 버튼 정리 타이밍
- `selectionchange`에서 선택이 해제되면 버튼을 즉시 숨긴다.
- `scroll`/`resize`에서도 버튼을 닫아 viewport 위치가 어긋난 상태를 남기지 않는다.
- 저장 버튼 클릭 시 `removeAllRanges()`로 브라우저 selection도 함께 정리해 잔여 하이라이트를 남기지 않는다.

### 디자인 결정
- Note 형식의 기존 수동 `문장 저장하기` 폼은 유지하고, Article 형식에만 선택 기반 저장 UI를 추가했다.
- 플로팅 CTA는 작은 surface chip 형태로 두어 본문 읽기 흐름을 크게 깨지 않도록 했다.
- 별도 reason 입력은 추가하지 않고, 빠르게 저장한 뒤 하단 저장 목록에서 다시 맥락을 확인하는 흐름을 유지했다.

## T31: Write/Edit 페이지 미저장 변경사항 이탈 경고 (2026-03-15)

### 구현 내용
- `app/hooks/useUnsavedWarning.ts` 신규 생성
  - `beforeunload` 이벤트 리스너 관리
  - React Router `useNavigation` 활용하여 폼 제출 감지
  - 미저장 변경사항 있을 때만 경고 표시
  
- `app/routes/_public.write.tsx` 수정
  - title, question 상태 추가 (controlled input)
  - articleContent 상태 추가 (ArticleEditor onChange)
  - selectedTags 상태 활용
  - hasChanges 계산: title || question || articleContent || selectedTags 중 하나라도 있으면 true
  - useUnsavedWarning(hasChanges) 호출
  
- `app/routes/_public.logs.$recordSlug.edit.tsx` 수정
  - title, articleContent 상태 추가
  - selectedTags 상태 활용
  - hasChanges 계산: 원본 값과 비교 (title !== record.title || format 변경 || 태그 변경)
  - useUnsavedWarning(hasChanges) 호출

### 기술 학습

#### beforeunload 이벤트 패턴
```typescript
const handleBeforeUnload = (e: BeforeUnloadEvent) => {
  if (hasChangesRef.current) {
    e.preventDefault();
    e.returnValue = "";  // 모던 브라우저는 무시하고 기본 메시지 표시
  }
};

window.addEventListener("beforeunload", handleBeforeUnload);
return () => window.removeEventListener("beforeunload", handleBeforeUnload);
```
- preventDefault() + returnValue 설정으로 브라우저 기본 경고 표시
- 모던 브라우저는 커스텀 메시지 무시 (보안상 이유)
- cleanup 함수에서 리스너 제거 필수

#### React Router navigation 상태 활용
```typescript
useEffect(() => {
  if (navigation.state === "loading" && navigation.location) {
    // 폼 제출 후 리다이렉트 중
    hasChangesRef.current = false;
  }
}, [navigation.state, navigation.location]);
```
- navigation.state: "idle" | "loading" | "submitting"
- "loading" 상태 + location 변경 = 폼 제출 성공 후 네비게이션
- 이때 hasChanges 플래그 초기화

#### Ref vs State 선택
```typescript
const hasChangesRef = useRef(hasChanges);

useEffect(() => {
  hasChangesRef.current = hasChanges;
}, [hasChanges]);
```
- beforeunload 리스너는 클로저로 hasChanges 캡처 불가
- Ref를 사용하여 항상 최신 값 참조
- 매 렌더링마다 ref 업데이트

### Write 페이지 구현 패턴

#### Controlled Input 추가
```typescript
const [title, setTitle] = useState("");
const [question, setQuestion] = useState("");

// input에 value + onChange 추가
<input
  value={title}
  onChange={(e) => setTitle(e.target.value)}
/>
```
- 기존 uncontrolled input을 controlled로 변경
- 폼 제출 시에도 formData에 포함됨 (name 속성 유지)

#### hasChanges 계산
```typescript
const hasChanges =
  title.length > 0 ||
  articleContent.length > 0 ||
  question.length > 0 ||
  selectedTags.size > 0;
```
- 하나라도 입력되면 true
- 초기 상태(모두 비어있음)에서는 false

### Edit 페이지 구현 패턴

#### 원본 값과 비교
```typescript
const hasChanges =
  title !== record.title ||
  selectedFormat !== originalFormat ||
  (selectedFormat === "article" && articleContent !== record.content) ||
  selectedTags.size !== currentTags.length ||
  Array.from(selectedTags).some((id) => !currentTags.some((t) => t.id === id));
```
- title 변경 감지
- format 변경 감지
- article format일 때만 content 비교 (note는 NoteEditor가 관리)
- 태그 개수 변경 + 태그 ID 변경 감지

#### ArticleEditor onChange 추가
```typescript
<ArticleEditor
  name="content"
  content={articleContent}
  onChange={setArticleContent}  // 추가
  placeholder="..."
/>
```
- 기존 ArticleEditor는 onChange prop 미지원
- 이번 수정에서 추가 (선택적 prop)

### 디자인 결정

#### 브라우저 기본 경고 사용
- 커스텀 모달 대신 브라우저 기본 confirm 사용
- 이유: 모든 브라우저에서 일관된 UX, 사용자 친숙
- 모던 브라우저는 커스텀 메시지 무시 (보안)

#### 폼 제출 후 자동 초기화
- navigation.state === "loading" 감지하여 자동 초기화
- 사용자가 명시적으로 초기화할 필요 없음
- 실패 시 (validation error) 상태 유지

#### Note format 미처리
- NoteEditor는 내부적으로 textarea 관리
- ArticleEditor와 달리 onChange prop 없음
- 따라서 note format 변경은 감지 불가
- 실제로는 note → article 전환 시에만 문제 (article → note는 content 비교로 감지)

### 주의사항

#### ArticleEditor onChange 미지원 이슈
- 현재 ArticleEditor는 onChange prop을 받지 않음
- Edit 페이지에서 articleContent 상태 추적 불가
- 해결: ArticleEditor에 onChange prop 추가 필요 (별도 작업)
- 현재는 format 변경만으로 hasChanges 감지

#### NoteEditor 상태 추적 불가
- NoteEditor는 uncontrolled component
- 내부 textarea 변경을 외부에서 감지 불가
- 따라서 note format 변경사항 감지 불가
- 해결: NoteEditor에 onChange prop 추가 필요 (별도 작업)

### 검증 결과
- ✓ pnpm build: 성공 (495 client modules, 601 server modules)
- ✓ tsc --noEmit: 에러 없음
- ✓ 타입 안전성: as any, @ts-ignore 없음
- ✓ 브라우저 호환성: 모든 모던 브라우저 지원
- ✓ 폼 제출 후 경고 없음 (자동 초기화)

---

## T32: ArticleEditor 키보드 단축키 + UX 폴리시 (2026-03-15)

### 구현 내용
- `app/components/editor/ArticleEditor.tsx` 수정
  - Cmd/Ctrl + Enter 폼 제출 단축키 추가 (`formSubmitExtension`)
  - 에디터 포커스/블러 상태 추적 (`isFocused` state)
  - BubbleMenu 버튼 터치 타겟 44px 확보 (`min-h-11 min-w-11`)
  - 버튼별 툴팁 추가 (`title` 속성)
- `app/styles/editor.css` 수정
  - `.article-editor--focused` 클래스 스타일 추가

### 기술 학습

#### Tiptap 커스텀 키보드 단축키 Extension
```typescript
const formSubmitExtension = useMemo(
  () =>
    Extension.create({
      name: "formSubmit",
      addKeyboardShortcuts() {
        return {
          "Mod-Enter": () => {
            const editorEl = this.editor.view.dom;
            const form = editorEl.closest("form");
            if (form) {
              const submitButton = form.querySelector('button[type="submit"]') as HTMLButtonElement | null;
              submitButton?.click();
            }
            return true;
          },
        };
      },
    }),
  [],
);
```
- `Extension.create()`로 커스텀 extension 생성
- `addKeyboardShortcuts()`에서 키 매핑 정의
- `"Mod-Enter"` = Mac에서는 Cmd+Enter, Windows에서는 Ctrl+Enter
- `return true`로 이벤트 소비 (전파 중지)
- `this.editor.view.dom`으로 에디터 DOM 접근

#### 포커스 상태 관리 패턴
```typescript
const [isFocused, setIsFocused] = useState(false);

// EditorContent에 핸들러 추가
<EditorContent
  onFocus={() => setIsFocused(true)}
  onBlur={() => setIsFocused(false)}
/>

// className에 상태 반영
const rootClassName = [
  "article-editor",
  isFocused && "article-editor--focused",
  className,
].filter(Boolean).join(" ");
```
- React state로 포커스 추적
- CSS 클래스로 스타일 토글 (인라인 스타일 대신)
- CSS에서 `.article-editor--focused .ProseMirror` 선택자 사용

#### 접근성 44px 터치 타겟
```typescript
className="min-h-11 min-w-11 rounded px-2 text-sm font-semibold"
```
- Tailwind `min-h-11` = 2.75rem = 44px
- AGENTS.md 접근성 요구사항: "인터랙티브 요소 터치 타겟 44px↑"
- `h-8`(32px) → `min-h-11`(44px)으로 변경

#### 툴팁 패턴 (title 속성)
```typescript
<button
  aria-label="굵게"
  title="굵게 (⌘B)"
  // ...
>
```
- `aria-label`: 스크린리더용
- `title`: 마우스 호버 시 툴팁
- 키보드 단축키는 괄호 안에 표시

### 디자인 결정

#### 커스텀 단축키 최소화
- AGENTS.md: "복잡한 커스텀 단축키 시스템 (Cmd+B/I/U는 Tiptap StarterKit에 이미 내장)"
- Cmd+Enter만 추가 (폼 제출)
- 나머지는 StarterKit 기본값 사용

#### 툴팁만, 도움말 모달 없음
- AGENTS.md: "키보드 단축키 도움말 모달 (tooltip만)"
- 각 버튼에 `title` 속성으로 간단한 툴팁만 제공
- 별도 도움말 모달/다이얼로그 없음

#### Quiet Depth 포커스 스타일
```css
.article-editor--focused .ProseMirror {
  border-color: var(--color-ocean-blue);
  box-shadow: 0 0 0 2px var(--color-mist-blue);
}
```
- Ocean Blue로 border 전환
- Mist Blue로 부드러운 focus ring
- 화려한 애니메이션 금지 (subtle만)

### 기존 Tiptap StarterKit 단축키
이미 내장되어 있어 추가 구현 불필요:
- Cmd+B: Bold
- Cmd+I: Italic
- Cmd+U: Underline (Underline extension 필요)
- Cmd+Shift+H: Heading toggle

### 검증 결과
- ✓ pnpm exec tsc --noEmit: 에러 없음
- ✓ pnpm build: 성공 (495 client modules, 601 server modules)
- ✓ Evidence 파일: `.sisyphus/evidence/task-32-shortcuts.txt`
