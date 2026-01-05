# Court Metadata Migration

This migration removes the `metadata` field from the Court model and introduces proper typed fields.

## Changes

### Database Schema
1. **Added** `CourtFormat` enum with values: `SINGLE`, `DOUBLE`
2. **Added** `courtFormat` field to Court model (optional)
3. **Updated** `bannerData` field to include `bannerAlignment` in JSON structure
4. **Removed** `metadata` field from Court model

### Data Migration Required

Before running this migration, you should migrate existing data:

```bash
# 1. Run the data migration script to move metadata values to new fields
npm run ts-node scripts/migrate-court-metadata.ts

# 2. Apply the schema migration (this will drop the metadata column)
npx prisma migrate deploy
```

## Migration Script Details

The `scripts/migrate-court-metadata.ts` script:

1. Reads all courts with metadata
2. Extracts `padelCourtFormat` → converts to `courtFormat` enum (SINGLE/DOUBLE)
3. Extracts `bannerAlignment` → moves to `bannerData` JSON object
4. Extracts `description` → moves to root-level description field (if not already set)
5. Clears the metadata field

## Rollback Plan

If you need to rollback:

1. Restore the previous migration state
2. The metadata field will be recreated
3. You may need to manually restore metadata content from backups

## Testing

After migration:

1. Verify all court formats are correctly set for Padel courts
2. Check banner alignments are preserved in bannerData
3. Run tests: `npm test -- src/__tests__/padel-court-format.test.ts`
