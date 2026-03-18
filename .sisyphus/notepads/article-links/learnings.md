# Article Links Feature - Learnings

## Task 1: DB Schema + Relations + Migration + Queries

### Schema Patterns
- **Column placement**: New columns should be placed logically near related fields (originalUrl placed after linkedRecordId)
- **Table naming**: Use snake_case in SQL (record_references), camelCase in TypeScript (recordReferences)
- **Foreign keys**: Always use `{ onDelete: "cascade" }` for child tables to maintain referential integrity
- **Timestamps**: Use `sql\`(unixepoch())\`` for default timestamps in Drizzle

### Relations Patterns
- **Import order**: Add new table imports in alphabetical order in relations.server.ts
- **Relation naming**: Use descriptive names (references, not refs)
- **One-to-many**: Parent table gets `many(childTable)`, child table gets `one(parentTable)`
- **Relation placement**: Add new relations at the end of the file, before template/curation/audit relations

### Migration Patterns
- **File naming**: Use sequential numbering (0011_add_record_references.sql)
- **SQL syntax**: Use backticks for identifiers, proper FOREIGN KEY syntax with ON DELETE cascade
- **Journal updates**: Must update _journal.json with idx, version, when, tag, breakpoints for each migration
- **Journal timestamps**: Use realistic timestamps (not future dates)

### Query Module Patterns
- **Import structure**: drizzle-orm functions, nanoid, D1Database type, db client, schema tables
- **Function naming**: get* for reads, sync* for delete-all-then-insert patterns
- **Sync pattern**: Delete all existing records, then insert new ones (used in tags.server.ts too)
- **Type safety**: Use proper TypeScript types for function parameters and returns

### Verification Steps
1. Run `wrangler d1 migrations apply DB --local` - all migrations should show ✅
2. Query `sqlite_master` to verify table creation
3. Use `PRAGMA table_info(table_name)` to verify columns exist
4. Check foreign key constraints are properly set

### Code Quality Notes
- Removed unnecessary memo comments (delete-all → re-insert pattern is self-evident)
- Pre-existing LSP errors about missing node_modules are expected in worktree
- Migration journal must have complete entries for all migrations (0008-0011 were missing)

## Task 2: Zod Validation Schema Update — Completed

### Changes Made
1. **normalizeUrl() helper function** (lines 3-10)
   - Prepends `https://` to URLs without protocol
   - Handles empty strings gracefully
   - Used in z.preprocess() for all URL fields

2. **createRecordSchema** (line 25-28)
   - Added `originalUrl` field with URL validation
   - Max 2048 chars, optional, allows empty string

3. **autosaveDraftSchema** (lines 71-74)
   - Added `originalUrl` field (same spec as createRecordSchema)
   - Maintains draft autosave capability

4. **createArticleSchema** (lines 113-128)
   - Added `originalUrl` field (same spec)
   - Added `references` array field:
     - Max 50 references
     - Each reference: { url, title? }
     - URL normalization applied
     - Duplicate URL detection via .refine()
     - Error message in Korean: "참조 링크에 중복된 URL이 있습니다"

5. **parseReferencesFromFormData()** helper (lines 239-257)
   - Parses FormData with pattern: `references[index][url]` and `references[index][title]`
   - Trims whitespace, skips empty URLs
   - Returns array of { url, title? }

### Zod Version
- Project uses Zod v4.3.6
- z.preprocess() syntax confirmed compatible

### Type Safety
- No new TypeScript errors in validation.ts
- All schemas properly typed with z.infer<>
- Helper function has explicit return type annotation

### Notes
- createNoteSchema intentionally NOT modified (per requirements)
- All existing schema fields preserved
- URL normalization is transparent to consumers (happens in preprocess)

## Task 3: Article Form Link Inputs — Learnings

### Form Wiring Pattern
- Dynamic article references should keep `references[index][url]` / `references[index][title]` input names so `parseReferencesFromFormData()` can reuse the array parser without extra transforms.
- The article action can validate both `originalUrl` and parsed `references` in one `createArticleSchema.safeParse()` call, then persist `originalUrl` on the record insert and call `syncRecordReferences()` after the record is created.

### Verification Note
- In this worktree, `npx react-router build` currently fails on an existing SSR dependency resolution issue from `app/db/queries/records/references.server.ts` importing bare `nanoid`; `pnpm exec tsc --noEmit` completes cleanly.

## Task 4: Article Edit Form Links — Learnings

### Edit Form Pattern
- The shared note/article edit route needs article-only guards (`record.format === "article"`) around both the original URL field and the reference list so note editing UI stays unchanged.
- Existing reference rows can be hydrated into local state and still submitted with `references[index][url]` / `references[index][title]` names so the same form-data parser continues to work on edit.

### Loader and Persistence Pattern
- The edit loader can fetch references alongside tags/templates and return them with the existing record payload for initial form state.
- In this worktree, build verification is still blocked by the pre-existing `nanoid` resolution failure in `app/db/queries/records/references.server.ts`, so the edit route had to keep single-file reference querying/sync logic local while preserving the required form contract.

## Task 6: Seed Data Sample URLs - Completed

### Pattern Discovered
- **Idempotency Pattern**: DELETE before INSERT ensures safe re-runs
- **Mixed Title Strategy**: Some references have titles, others NULL (realistic data)
- **Distribution**: References spread across 3 Article records (record-002, record-005, record-008)

### Implementation Details
- Used `unixepoch()` for created_at timestamps (consistent with existing seed)
- sort_order field used for reference ordering (0, 1 pattern)
- record_references table properly linked via record_id foreign key

### Verification Checklist
✅ Seed executes without errors (64 commands)
✅ original_url UPDATE works on 2 Article records
✅ record_references INSERT creates 5 rows
✅ Mixed title presence (3 with, 2 without)
✅ No duplicate errors on re-run

### Next Steps
- Task 7: Implement record_references display in UI
- Task 8: Add reference management to admin panel

## Task 5: Article Detail Page Link Display — Completed

Date: 2026-03-18

### Changes Made

1. **$recordSlug.server.ts** (loader)
   - Added import: `import { getRecordReferences } from "~/db/queries/records/references.server";`
   - Added `recordReferences` to Promise.all destructuring (article format only)
   - Added `references` to loader return

2. **$recordSlug.tsx** (UI)
   - Added `references` to useLoaderData destructuring
   - Added original link display in header (article only, after dateLabel)
   - Added references section below content (article only, before Questions)

### Design Implementation Notes
- Original link uses Quiet Depth colors: `#6E6E73` (text-secondary), `#146C94` (ocean-blue hover)
- External link icon (Lucide external-link style)
- References section uses subtle styling with numbered list
- Both features are conditionally rendered only for `article` format records

### Key Code Patterns
1. **Article-only condition**: `record.format === "article"` check
2. **URL hostname extraction**: Graceful fallback with try-catch for invalid URLs
3. **External link attributes**: `target="_blank" rel="noopener noreferrer"` (security best practice)
4. **List rendering**: map with index for numbered display

### Build Verification
- `npx react-router build`: SUCCESS
- `pnpm exec tsc --noEmit`: SUCCESS (no errors)
