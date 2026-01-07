# Court Model Refactoring - Summary

## Overview

This PR removes the generic `metadata` field from the Court model and introduces properly typed domain fields, as specified in the requirements.

## Changes Made

### 1. Database Schema Changes

**Added:**
- `CourtFormat` enum with values: `SINGLE`, `DOUBLE`
- `courtFormat` field to Court model (optional)
- Updated `bannerData` JSON structure to include `bannerAlignment`

**Removed:**
- `metadata` field from Court model

### 2. API Changes

**Court Creation (`POST /api/admin/clubs/:clubId/courts`):**
- Now accepts `courtFormat` field instead of metadata
- Validates Padel courts must have SINGLE or DOUBLE format
- Converts courtFormat to uppercase for consistency

**Court Update (`PATCH /api/admin/courts/:courtId`):**
- Supports updating `courtFormat` field
- Supports updating `bannerData` field directly
- Removed metadata handling

**Image Upload (`POST /api/images/courts/:id/upload`):**
- Now accepts `bannerAlignment` parameter
- Stores bannerAlignment in bannerData JSON

### 3. Frontend Changes

**Court Creation Form:**
- Replaced `padelCourtFormat` with `courtFormat`
- Uses enum values: SINGLE, DOUBLE
- Form field properly validates for Padel courts

**Court Editor:**
- Uses `parseCourtBannerData` instead of `parseCourtMetadata`
- Updates bannerAlignment in bannerData structure
- Removes description from metadata (now at root level)

**Court Detail Page:**
- Parses bannerData for banner alignment
- No longer references metadata

### 4. Type Definitions

**Updated:**
- `Court` interface: removed metadata, added courtFormat
- `CreateCourtPayload`: added courtFormat
- `UpdateCourtPayload`: added courtFormat
- Renamed `parseCourtMetadata` to `parseCourtBannerData`
- Added `CourtFormat` type export

### 5. Migration

**Schema Migration:**
- SQL file: `prisma/migrations/20260105_remove_metadata_add_court_format/migration.sql`
- Creates CourtFormat enum
- Adds courtFormat column
- Drops metadata column

**Data Migration:**
- Script: `scripts/migrate-court-metadata.ts`
- Moves `padelCourtFormat` → `courtFormat` (validated, uppercase)
- Moves `bannerAlignment` → `bannerData.bannerAlignment`
- Moves `description` → root level (if not already set)
- Clears metadata field

**Migration Instructions:**
1. Run data migration script: `npm run ts-node scripts/migrate-court-metadata.ts`
2. Apply schema migration: `npx prisma migrate deploy`

### 6. Testing

**Updated Tests:**
- `src/__tests__/padel-court-format.test.ts` - 7/7 passing
- `src/__tests__/club-court-creation-permissions.test.ts` - 11/11 passing

**Verified Tests:**
- `src/__tests__/courts-api.test.ts` - 18/18 passing

**Linting:**
- No new errors introduced in modified files

## Acceptance Criteria

✅ **metadata object no longer exists** - Removed from Court model, types, and API

✅ **Court fields are flat and explicit** - courtFormat is a typed field, description at root level

✅ **bannerData contains only banner-related info** - bannerAlignment moved to bannerData JSON

✅ **Field names match domain language** - courtFormat (not padelCourtFormat), clear enum values

❌ **No court data stored in metadata** - metadata field completely removed

## Code Quality

- Code review completed - all feedback addressed
- Migration script uses safe Prisma operations instead of raw SQL
- Proper validation for courtFormat values
- Backward compatible (migration handles existing data)

## Security Considerations

- No secrets or sensitive data in changes
- Input validation added for courtFormat field
- Type safety improved with explicit enums
- Migration script validates data before updates

## Documentation

- Migration README included with full instructions
- TypeScript types fully documented
- API changes are backward incompatible (breaking change)

## Next Steps for Deployment

1. **Before deployment:**
   - Run data migration script on production database
   - Verify all courts have correct courtFormat values
   - Check bannerAlignment preserved in bannerData

2. **During deployment:**
   - Apply Prisma schema migration
   - Monitor for any errors

3. **After deployment:**
   - Verify court creation works with new format
   - Test court editing functionality
   - Confirm banner alignments display correctly

## Breaking Changes

⚠️ **API Breaking Changes:**
- Court creation now requires `courtFormat` instead of metadata for Padel courts
- Court responses no longer include metadata field
- Frontend applications must update to use courtFormat field

## Rollback Plan

If issues arise:
1. Revert to previous migration state
2. metadata field will be recreated
3. May need to restore metadata content from backups
4. Revert code changes to previous commit
