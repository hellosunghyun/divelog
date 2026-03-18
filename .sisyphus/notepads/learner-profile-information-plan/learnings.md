# Learner Profile Information Plan - Learnings

## Task 1: Profile Enrichment Contract + Test Fixtures

### Completed
- ✅ Created `EnrichedLearnerProfile` type in `app/routes/public/learners/types.ts`
- ✅ Created test file `app/routes/public/learners/__tests__/profile-contracts.test.ts` with 2 passing tests
- ✅ Created fixture builders in `app/routes/public/learners/__tests__/fixtures.ts`
- ✅ Both tests pass: "builds populated learner profile fixture" and "builds empty learner profile fixture"

### Type Definition
The `EnrichedLearnerProfile` type includes:
- **learner**: Base learner profile with userId, displayName, slug, cohort, bio, profilePhotoUrl, currentQuestion
- **profileIntro**: string | null - ada-kr-pos bio or local bio fallback
- **contextLine**: string | null - derived from cohort + current stage
- **interestTags**: Array of {slug, name} - derived from record tags
- **currentStage**: {id, name, slug} | null - current stage info
- **recentActivity**: {recordCount, questionCount, lastActiveAt} | null - activity summary
- **selfAnswers**: Array of {id, questionTitle, snippet, recordSlug} - self-answer summaries

### Fixture Builders
- `buildPopulatedLearnerProfile()`: Returns complete object with all fields filled with realistic data
- `buildEmptyLearnerProfile()`: Returns object with all optional fields as null or empty arrays

### Test Discovery Note
- Vitest test discovery works correctly with the pattern `app/**/*.test.ts`
- Tests are discovered and run even if not shown in the default summary output
- Use `--reporter=verbose` flag to see all tests including passing ones
- The test file must be in the `__tests__` directory and follow the `.test.ts` naming convention

### Code Quality
- No `as any`, `@ts-ignore`, or `@ts-expect-error` used
- No empty catch blocks
- All types are properly defined and exported
- Comments follow BDD pattern (Given-When-Then) for test clarity

## Task 6: Loader enrichment + route-data tests

### Completed
- ✅ Extended `app/routes/public/learners/$learnerSlug.server.ts` loader with profile enrichment fields.
- ✅ Added `app/routes/public/learners/__tests__/learnerSlug.server.test.ts` with 3 route-data scenarios.
- ✅ Verified RED → GREEN cycle with targeted Vitest command.

### Implementation Patterns
- Loader now resolves owner context via `getAuth(request, ADAKRPOS_API_KEY)` and computes `isOwner` once.
- Enrichment data is fetched in parallel using `Promise.all`:
  - `getLearnerInterestTags(d1, learner.userId)`
  - `getLearnerStageActivity(d1, learner.userId, isOwner)`
  - `getLearnerSelfAnswerSummary(d1, learner.userId)`
  - `fetchAdaProfile(learner.userId, ADAKRPOS_API_KEY)`
- Final profile text fields are composed through shared resolvers:
  - `profileIntro = resolveProfileIntro(adaProfile, learner.bio)`
  - `contextLine = resolveContextLine(learner.cohort, currentStage?.name ?? null)`

### Visibility / Safety Notes
- Non-owner visibility filtering is now enforced in loader response for collaborated/mentioned records (`public` only).
- Existing base payload fields were preserved while adding `profileIntro`, `contextLine`, `interestTags`, `currentStage`, `recentActivity`, and `selfAnswers`.
- Replaced empty `catch` around participant batch loading with structured warning log to satisfy no-empty-catch rule.

### Test Strategy Notes
- Mocked all new query dependencies with `vi.mock()` and used fixture builders for consistent learner payload setup.
- Database chain usage in loader tests is stabilized via a call-count-based DB mock that separates first learner lookup from later batched query builders.
- Required verification command passed:
  - `pnpm exec vitest run app/routes/public/learners/__tests__/learnerSlug.server.test.ts`

---

## Task 8: Discovery Helper Blocks Component

### Completed
- ✅ Created `app/components/learner/DiscoveryHelperBlocks.tsx`
- ✅ Created test file `app/components/learner/__tests__/DiscoveryHelperBlocks.test.tsx` with 14 passing tests
- ✅ All tests pass: `pnpm exec vitest run app/components/learner/__tests__/DiscoveryHelperBlocks.test.tsx`

### Component Design
The `DiscoveryHelperBlocks` component renders three conditional blocks for learner profile discovery:

1. **Current Stage Block** (`data-testid="current-stage-block"`)
   - Shows stage name as a badge/chip linking to `/journey/:stageSlug`
   - Hidden when `currentStage` is null

2. **Recent Activity Block** (`data-testid="recent-activity-block"`)
   - Shows "기록 N개 · 질문 M개" summary (only non-zero counts displayed)
   - Hidden when `recentActivity` is null OR both counts are 0

3. **Starter Links Block** (`data-testid="starter-links"`)
   - Header: "여기서 시작해보세요" (warm, non-judgmental language)
   - Shows up to 2 record links to `/logs/:recordSlug`
   - Hidden when `starterRecords` is empty

### Design Tokens Used
- `bg-surface`, `border-border` for card backgrounds
- `bg-mist-blue`, `text-ocean-blue` for stage badge (Quiet Depth stage tone)
- `text-text-tertiary`, `text-text-secondary` for hierarchy
- `rounded-xl`, `rounded-full` for card and badge shapes
- `p-4`, `px-3`, `py-1.5` for spacing (4px scale)

### Copy Tone Compliance
- Used "여기서 시작해보세요" (warm, permissive)
- Avoided: "인기", "베스트", "추천" (popularity language)
- Counts shown descriptively, not as scores or rankings

### Test Coverage
- Stage block: renders with link, hides when null
- Recent activity: renders counts, hides when null/empty, handles partial counts
- Starter links: renders links, limits to 2, hides when empty
- Copy tone: verifies warm language, no popularity terms

---

## Task 9: Self-answer section component + tests

### Completed
- ✅ Created `app/components/learner/SelfAnswerSection.tsx` with editorial card style
- ✅ Created `app/components/learner/__tests__/SelfAnswerSection.test.tsx` with 4 passing tests
- ✅ Verified RED → GREEN → REFACTOR TDD cycle

### Component Design
- Uses editorial card style (not chat bubbles): `<article>` elements with border, rounded corners, and padding
- Each card links to `/logs/:recordSlug` using `SmartLink` with `prefetch="viewport"`
- Empty state is warm and non-judgmental: "아직 자기답변이 없습니다"
- Section heading is `<h2>` with text "자기답변" for accessibility

### Test Coverage
- "renders section heading" - verifies `<h2>` with "자기답변" exists
- "renders self-answer cards with links" - verifies cards, content, and link hrefs
- "shows empty state when no self-answers" - verifies gentle empty message
- "renders cards with editorial style (not chat bubbles)" - verifies `<article>` elements

### Design Tokens Used
- Border: `border-[#E3E8EF]` (Quiet Depth border color)
- Background: `bg-white` (Surface)
- Radius: `rounded-2xl` (card radius)
- Padding: `p-5` (card padding)
- Hover: `hover:border-ocean-blue/40` (subtle interaction)
- Typography: `text-xl font-semibold` for section heading, `text-base font-semibold` for card titles

### Verification Command
```bash
pnpm exec vitest run app/components/learner/__tests__/SelfAnswerSection.test.tsx
```

---

## Task 7: Profile Intro/Context Block Component

### Completed
- ✅ Created `app/components/learner/ProfileIntroBlock.tsx`
- ✅ Created test file `app/components/learner/__tests__/ProfileIntroBlock.test.tsx` with 6 passing tests
- ✅ All tests pass: `pnpm exec vitest run app/components/learner/__tests__/ProfileIntroBlock.test.tsx`

### Component Props
```typescript
interface ProfileIntroBlockProps {
  profileIntro: string | null;
  contextLine: string | null;
  interestTags: Array<{ slug: string; name: string }>;
  currentQuestion: string | null;
}
```

### Visual Hierarchy (Critical Design Rule)
The component enforces strict visual hierarchy per Quiet Depth principles:

1. **Current Question** (most prominent) - `text-base md:text-lg font-medium text-text-primary`
2. **Profile Intro** (secondary) - `text-sm text-text-secondary`
3. **Context Line** (tertiary) - `text-xs text-text-tertiary`
4. **Interest Tags** (supplementary) - chip pattern with hover states

### Design Tokens Used
- `text-text-primary` for question (highest contrast)
- `text-text-secondary` for intro (muted)
- `text-text-tertiary` for context line (caption-level)
- Tag chip: `rounded-full px-3 py-1.5 text-xs font-medium bg-surface border border-border text-text-secondary hover:bg-mist-blue hover:text-ocean-blue hover:border-reef-cyan/30 transition-all duration-normal`

### Empty State Behavior
- Returns `null` when ALL of these are empty: `profileIntro`, `interestTags`, `currentQuestion`
- `contextLine` alone does not prevent null return
- Individual blocks are conditionally rendered based on their own data

### Test Coverage
- "renders intro text, context line, and interest tags" - full rendering
- "hides empty chrome when no intro or interests" - null return behavior
- "interest tags are keyboard-focusable links" - accessibility check
- "renders current question even when intro is null" - partial data
- "skips question block when currentQuestion is null" - conditional rendering
- "renders intro text with muted styling (smaller than question)" - visual hierarchy verification

### Tag Chip Pattern Reference
Tag chips follow the established pattern from `$recordSlug.tsx`:
- Link to `/tags/:slug`
- `#` prefix before tag name
- Hover: mist-blue background, ocean-blue text, reef-cyan border accent

---

## Task 10: Learner route integration + empty states + meta polish

### Completed
- ✅ Updated `app/routes/public/learners/$learnerSlug.tsx` to integrate profile enrichment sections in required order.
- ✅ Added `app/routes/public/learners/__tests__/learnerSlug.test.tsx` with route-level integration coverage.
- ✅ Verified TDD cycle (RED → GREEN) with targeted Vitest run.

### Route Integration Notes
- Added `data-testid="learner-profile-page"` on the root container for stable route-level assertions.
- Preserved hero essentials (photo, name, cohort) and removed hero-level `bio` / `currentQuestion` display.
- Inserted `ProfileIntroBlock` directly below hero and above tabs, passing:
  - `profileIntro`, `contextLine`, `interestTags` from loader payload
  - `currentQuestion` from `learner.currentQuestion`
- Inserted `DiscoveryHelperBlocks` below intro block with:
  - `currentStage`, `recentActivity` from loader payload
  - `starterRecords` derived as `learnerRecords.slice(0, 2).map(({ record }) => ({ slug: record.slug, title: record.title }))`
- Kept existing tabs (records/questions) behavior unchanged.
- Inserted `SelfAnswerSection` below tabs and above highlighted sentences, passing `selfAnswers` from loader payload.

### New Route Test Coverage
- `renders ProfileIntroBlock with enriched data`
- `renders DiscoveryHelperBlocks`
- `renders SelfAnswerSection`
- `hides sections gracefully when data is empty`

### Verification
```bash
pnpm exec vitest run app/routes/public/learners/__tests__/learnerSlug.test.tsx
```

### Diagnostics
- `lsp_diagnostics` clean for:
  - `app/routes/public/learners/$learnerSlug.tsx`
  - `app/routes/public/learners/__tests__/learnerSlug.test.tsx`


---

## Task 12: Accessibility/responsive regression tests and final TDD refactor

### Completed
- ✅ Added `app/components/learner/__tests__/accessibility.test.tsx` with 3 focused regression tests.
- ✅ Verified RED → GREEN by running the new test file before and after responsive fixes.
- ✅ Refined learner profile components to protect link semantics and narrow-screen wrapping.

### Regression Coverage
- `interest tags are keyboard-focusable links`
  - Verifies `ProfileIntroBlock` interest chips render as anchor elements with `/tags/:slug` hrefs.
  - Verifies no interactive links are marked with `aria-hidden="true"` or `role="presentation"`.
  - Verifies `DiscoveryHelperBlocks` starter links point to `/logs/:recordSlug`.
- `heading hierarchy is sequential`
  - Verifies `SelfAnswerSection` exposes `자기답변` as an `h2`/`h3` heading and preserves sequential heading levels.
- `mobile viewport renders without overflow`
  - Locks in `min-w-0`, `flex-wrap`, and `break-words` protections for narrow layouts.

### Refactor Notes
- `ProfileIntroBlock` now uses `min-w-0` on the wrapper and interest-tag row, with `break-words` on question, intro, context, and tag links.
- `DiscoveryHelperBlocks` now applies `min-w-0`, wraps the current-stage row, and allows long starter links to break safely.
- `SelfAnswerSection` now keeps linked cards shrinkable on mobile and wraps long titles/snippets without horizontal overflow.

### Verification
```bash
pnpm exec vitest run app/components/learner/__tests__/accessibility.test.tsx
```


---

## Task 11: Playwright learner-profile journeys

### Completed
- ✅ Added `tests/e2e/learner-profile.spec.ts` with 2 passing Playwright journeys.
- ✅ Saved evidence screenshots to `.sisyphus/evidence/task-11-populated-profile.png` and `.sisyphus/evidence/task-11-sparse-profile.png`.
- ✅ Verified `pnpm exec playwright test tests/e2e/learner-profile.spec.ts` passes after reseeding local D1 fixtures.

### E2E Coverage Notes
- Populated fixture uses `learner-hana` and asserts `profile-intro-block`, `interest-tags`, `current-stage-block`, and `self-answer-section`.
- Sparse fixture uses `learner-jaemin` and asserts the heading remains visible, empty self-answer state stays safe, `interest-tags` is absent, and no broken anchors are rendered.
- Both specs capture browser `console` and `pageerror` events so runtime regressions fail the run immediately.

### Stability Notes
- Updated `playwright.config.ts` to use port `4173` so the worktree does not accidentally reuse another repo's dev server on `5173`.
- Stubbed `https://cdn.jsdelivr.net/**` requests inside the spec to avoid flaky third-party font/CDN errors polluting the browser console while keeping assertions focused on learner-profile behavior.
- Local D1 data should be reseeded before the Playwright run when fixture drift is possible:
  - `pnpm exec wrangler d1 execute DB --local --file=seeds/seed.sql`


---

## F1: Plan Compliance Audit

### Audit Result
- Must Have: 10/10 verified
- Must NOT Have: 6/6 verified
- Verdict: APPROVE

### Verification Notes
- Confirmed all required enrichment files and exported functions/components exist, including loader payload fields for `profileIntro`, `contextLine`, `interestTags`, `currentStage`, `recentActivity`, and `selfAnswers`.
- Confirmed route integration order matches prior task notes: intro block and discovery helpers below hero, self-answer section below tabs and above highlighted sentences.
- Searched forbidden patterns: no new interest schema/migration, no `getLearnerInterests`, no learner-profile external links, no social metrics, no profile edit UI, and no `as any` / `@ts-ignore` matches in audited change areas.
- Verified branch diff against `main` does not modify the existing `getOrCreateLearnerProfile()` implementation; learner query file only adds enrichment imports and appended helper exports.


---

## F3: Real Manual QA

### Verdict
- `Scenarios [68/68 pass] | Responsive [PASS] | Empty States [PASS] | VERDICT: APPROVE`

### Verification Notes
- Vitest command passed with 10 files / 66 tests:
  - `pnpm exec vitest run app/routes/public/learners app/db/queries/learners/__tests__/learners.test.ts app/db/queries/dialogue/__tests__/selfAnswers.test.ts app/lib/auth/__tests__/ada-profile.test.ts app/components/learner`
- Playwright learner-profile journey passed with 2/2 scenarios:
  - `pnpm exec playwright test tests/e2e/learner-profile.spec.ts`
- Empty-state coverage remains explicit in component tests:
  - `app/components/learner/__tests__/ProfileIntroBlock.test.tsx:40`
  - `app/components/learner/__tests__/DiscoveryHelperBlocks.test.tsx:54`
  - `app/components/learner/__tests__/SelfAnswerSection.test.tsx:53`
- Manual responsive spot-check on `/learners/learner-hana` at `1280x900` and `390x844` showed no horizontal overflow (`scrollWidth <= innerWidth`) and preserved primary content visibility.

### Follow-up Observation
- Playwright run emitted server-side warnings (`auth_no_api_key`, `content_parse_failed`) that did not fail browser assertions; keep an eye on fixture/content normalization if future QA expands beyond current acceptance criteria.

---

## F4: Scope Fidelity Check

### Completed
- ✅ `feat/learner-profile-enrichment` 브랜치 커밋 이력(`git log --oneline ... ^main`) 검토 완료
- ✅ `git diff main...HEAD --stat` 기준 변경 파일 22개 전수 확인
- ✅ 제외 조건 7개(interest 테이블/마이그레이션, getOrCreate 변경, 외부 링크, 소셜 지표, 프로필 편집 UI, stage archive grouping, collaboration 재활성화) 모두 미구현 확인

### Evidence Notes
- 최종 증적 파일 생성: `.sisyphus/evidence/final-f4-scope-fidelity.txt`
- 범위 판정: `Tasks [22/22 compliant] | Unaccounted [CLEAN/22 files] | VERDICT: APPROVE`
