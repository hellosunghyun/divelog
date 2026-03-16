# Learnings: codebase-contradictions-fix

## Task 1: Environment Validation + Test Baseline

### Key Findings

1. **TypeScript Errors Pattern**
   - 25 errors across 2 route files: $stageSlug.tsx (14) and $learnerSlug.tsx (11)
   - Root cause: Missing `Route.LoaderData` type annotations on loader functions
   - Error pattern: Properties don't exist on `{}` or `unknown` types
   - Affects: useLoaderData() calls in components
   - Fix: Add explicit return type to loader functions

2. **Test Infrastructure**
   - 78 vitest tests all passing (utility-level only)
   - No route/query integration tests exist (as expected)
   - Test suite runs in 292ms (very fast)
   - No flaky tests or skipped tests

3. **Build Pipeline**
   - Build succeeds despite TypeScript errors (Vite doesn't enforce tsc)
   - Large chunks detected (ArticleEditor 697KB, entry.client 418KB)
   - Dynamic/static import conflicts are non-blocking warnings
   - Sentry integration skipped (auth token missing, expected in local dev)
   - Worker bundle: 3.4 MB

4. **Database State**
   - All 5 migrations apply cleanly
   - Seed data loads without errors
   - records.cohort: All 25 records have 'cohort-2026', NO NULL values
   - Implication: Cohort filtering doesn't need NULL handling

5. **Worktree Setup**
   - Dependencies installed via pnpm (10.32.1)
   - No build script approval issues
   - Local D1 database ready at .wrangler/state/v3/d1

### Patterns for Task 2+

- Route loader type pattern: `export async function loader({ request, context }: Route.LoaderArgs): Promise<Route.LoaderData> { ... }`
- useLoaderData() needs explicit type: `const data = useLoaderData<typeof loader>();`
- Drizzle queries return typed objects automatically
- Component destructuring needs explicit types when from loader data

### Blockers Identified

- TypeScript errors block production builds (must fix in Task 2)
- Large chunk sizes may need code-splitting (Phase 2 optimization)
- Dynamic import conflicts are warnings only (non-blocking)

### Ready for Task 2

- Database is ready
- Tests are passing
- Build infrastructure works
- Only TypeScript annotations needed


## Task 2: Search Page Visibility Filter Fix

### Pattern Applied
When fixing visibility filters for related entities (questions, sentences), the pattern is:
1. Add `.innerJoin(records, eq(table.recordId, records.id))` to join the parent record
2. Add `sql\`${records.visibility} != 'draft'\`` to the WHERE clause alongside the content search
3. Update component rendering to handle the new query structure (e.g., `q2.question.id` instead of `q2.id`)

### Files Modified
- `app/routes/public/search.tsx` (lines 58-88): Added visibility filters to questions and sentences queries
- `app/db/queries/search.server.ts` (lines 34-83): Added visibility filters to searchAll() function for defense-in-depth

### Key Insight
The bug was at TWO levels:
1. **Route level** (search.tsx): Inline queries for questions/sentences had no visibility filter
2. **Query module level** (search.server.ts): searchAll() function also lacked visibility filters

Both needed fixing for complete defense-in-depth security.

### Test Results
- All 78 tests pass ✓
- Build succeeds ✓
- No TypeScript errors after component updates ✓

