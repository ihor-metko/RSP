# TODO: Mock Data Mode Cleanup Checklist

> ⚠️ **IMPORTANT**: This feature is temporary and should be removed once database issues are resolved.

## When to Remove

Remove mock data mode when:
- Database connectivity is stable
- Real data is available for development
- Team no longer needs the mock mode fallback

## Cleanup Steps

### 1. Remove Mock Data Files
- [ ] Delete `/src/services/mockDb.ts`
- [ ] Delete `/src/services/mockApiHandlers.ts`
- [ ] Delete `/src/components/MockModeWarning.tsx`

### 2. Remove Mock Mode Integration from API Routes

Search for `TEMPORARY MOCK MODE` comments and remove the blocks:

- [ ] `/src/app/api/admin/bookings/route.ts`
  - Remove `isMockMode`, `mockGetBookings` imports
  - Remove mock mode check and handler in GET function
  
- [ ] `/src/app/api/admin/clubs/route.ts`
  - Remove `isMockMode`, `mockGetClubs`, `mockCreateClub` imports
  - Remove mock mode checks in GET and POST functions
  
- [ ] `/src/app/api/admin/bookings/create/route.ts`
  - Remove mock imports
  - Remove entire mock mode block (large section)

- [ ] Check other API routes that may have been updated:
  - `/src/app/api/admin/organizations/route.ts`
  - `/src/app/api/admin/courts/route.ts`
  - Any other routes with mock integration

### 3. Remove Environment Variable Configuration

- [ ] Remove `USE_MOCK_DATA` from `/next.config.ts` env section
- [ ] Remove any `.env` entries for `USE_MOCK_DATA`
- [ ] Update `.env.example` if it was added there

### 4. Remove Documentation

- [ ] Delete `/MOCK_DATA_MODE.md`
- [ ] Delete `/TODO_MOCK_CLEANUP.md` (this file)
- [ ] Remove mock mode references from `/README.md` if any were added

### 5. Remove Tests for Mock Mode

- [ ] Remove any tests specifically for mock mode
- [ ] Check `/src/__tests__/` for mock-mode-specific tests
- [ ] Update test documentation if it references mock mode

### 6. Remove Warning Banner Integration

Search for `MockModeWarning` usage:
- [ ] Remove imports of `MockModeWarning` from layout/page files
- [ ] Remove `<MockModeWarning />` components from JSX

Common locations:
- `/src/app/layout.tsx`
- `/src/app/[locale]/layout.tsx`
- Any admin dashboard layouts

### 7. Code Search

Run these searches to find any remaining references:

```bash
# Search for mock mode references
grep -r "TEMPORARY MOCK MODE" src/
grep -r "mockDb" src/
grep -r "mockApiHandlers" src/
grep -r "MockModeWarning" src/
grep -r "USE_MOCK_DATA" .
grep -r "isMockMode" src/
```

### 8. Verify Removal

- [ ] Run linter: `npm run lint`
- [ ] Run build: `npm run build`
- [ ] Run tests: `npm test`
- [ ] Start dev server: `npm run dev`
- [ ] Verify no mock mode banner appears
- [ ] Test key API endpoints work with real database

### 9. Git Cleanup

- [ ] Commit removal with clear message: "Remove temporary mock data mode"
- [ ] Reference original issue/PR that added mock mode
- [ ] Update PR description noting when/why it was removed

## Quick Removal Script

If you want to automate most of the cleanup:

```bash
#!/bin/bash
# Quick removal script (review changes before committing!)

# Remove files
rm -f src/services/mockDb.ts
rm -f src/services/mockApiHandlers.ts
rm -f src/components/MockModeWarning.tsx
rm -f MOCK_DATA_MODE.md
rm -f TODO_MOCK_CLEANUP.md

# Note: API route changes must be done manually to avoid breaking code
echo "Files removed. Now manually remove mock mode code from API routes."
echo "Search for 'TEMPORARY MOCK MODE' comments in src/app/api/"
```

## Rollback Plan

If you need to temporarily re-enable mock mode:

1. Revert the removal commit
2. Or cherry-pick from the original mock mode PR
3. Set `USE_MOCK_DATA=true` environment variable

## Questions or Issues?

If you have questions about removing mock mode:
- Check git history for the original implementation PR
- Review `MOCK_DATA_MODE.md` for context
- Consult with the team member who implemented it
