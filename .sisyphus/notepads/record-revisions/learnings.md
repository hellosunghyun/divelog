# Record Revisions - Learnings & Patterns

## T6: createRecord() Audit Logging

### What Worked Well
1. **Audit-helpers utility pattern**: Creating a reusable `createAuditLog()` function in a separate module makes it easy to apply to other entities later
2. **Try-catch pattern**: Wrapping audit log creation in try-catch ensures record creation isn't blocked by audit failures
3. **Mock testing pattern**: Using `expect.objectContaining()` for mock assertions is cleaner than accessing mock.calls directly
4. **Extracted recordData variable**: Makes the audit log payload clearer and avoids duplication

### Key Implementation Details
- `createAuditLog()` handles JSON serialization internally (caller passes objects)
- `beforeState: null` for create action, `afterState` contains full record data
- Import path uses `~/` alias for cleaner imports
- Test mocks follow the drafts.test.ts pattern with `createDatabaseMock()` helper

### Gotchas Avoided
- ❌ Did NOT use `db.transaction()` (not in codebase pattern)
- ❌ Did NOT change createRecord return type (still `{ id, slug }`)
- ❌ Did NOT let audit failure block record creation (try-catch)
- ✓ Used optional fields correctly in test (undefined, not null)

### For Future Tasks
- T10 (updateRecord) will need similar pattern but with beforeState/afterState both populated
- T2 (createAuditLog) was created as dependency, now available for all other entities
- Audit log JSON serialization is handled at function level, not caller level
