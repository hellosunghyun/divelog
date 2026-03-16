
## Task 5: Response/Sentence Generation Action Draft Check + getRecordBySlug Defense-in-Depth

**Status**: ✅ COMPLETED

**Changes**:
1. Updated `getRecordBySlug()` signature to accept optional `currentUserId` parameter
   - Added defense-in-depth check: if record is draft and user is not author, return null
   - Backward compatible (currentUserId is optional)

2. Added draft visibility check to `create_response` action
   - Extended query to select visibility and authorId
   - Returns error "이 기록에 응답할 수 없습니다." if draft and not author

3. Added draft visibility check to `save_sentence` action
   - Queries target record's visibility and authorId
   - Returns error "이 기록에 문장을 저장할 수 없습니다." if draft and not author

**Verification**:
- ✅ npm run test: 78/78 tests PASSED
- ✅ npm run build: SUCCESS
- ✅ grep confirms draft checks in all 3 locations
- ✅ Evidence saved to .sisyphus/evidence/task-5-build.txt

**Issues Fixed**:
- C-1: getRecordBySlug() defense-in-depth visibility filter
- C-7: Response creation action draft verification
- H-9: save_sentence action draft verification

## Task 7: Settings defaultVisibility/defaultResponsePreference write flow alignment

**Status**: ✅ COMPLETED

**Changes**:
1. Updated `app/routes/public/write/note.tsx`
   - Loader now fetches `learnerProfiles` for the verified user and returns `learnerDefaults`
   - Visibility select now defaults to `learnerDefaults.defaultVisibility`
   - Added hidden `responsePreference` input seeded from `learnerDefaults.defaultResponsePreference`
   - Action now persists submitted `responsePreference` instead of hardcoding `"open"`

2. Updated `app/routes/public/write/article.tsx`
   - Loader now fetches `learnerProfiles` for the verified user and returns `learnerDefaults`
   - Visibility select now defaults to `learnerDefaults.defaultVisibility`
   - Added hidden `responsePreference` input seeded from `learnerDefaults.defaultResponsePreference`
   - Action now persists submitted `responsePreference` instead of hardcoding `"open"`

**Verification**:
- ✅ LSP diagnostics clean for both changed route files
- ✅ `npm run test`: 78/78 tests PASSED
- ✅ `npm run build`: SUCCESS (existing Sentry sourcemap auth warning still non-fatal)
- ✅ Evidence appended to `.sisyphus/evidence/task-7-build.txt`

**Issues Fixed**:
- H-2: Settings defaults now flow into note/article write defaults and persisted response preference
