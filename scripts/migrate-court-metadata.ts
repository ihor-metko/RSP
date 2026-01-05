/**
 * Migration script to move Court metadata fields to proper locations
 * 
 * This script:
 * 1. Reads metadata field from all courts
 * 2. Extracts bannerAlignment and moves it to bannerData
 * 3. Extracts padelCourtFormat and converts it to courtFormat enum
 * 4. Clears the metadata field
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface OldMetadata {
  bannerAlignment?: 'top' | 'center' | 'bottom';
  padelCourtFormat?: 'single' | 'double';
  description?: string;
  [key: string]: unknown;
}

interface BannerData {
  url?: string;
  altText?: string;
  description?: string;
  position?: string;
  bannerAlignment?: 'top' | 'center' | 'bottom';
}

async function migrateCourtMetadata() {
  console.log('Starting Court metadata migration...\n');

  try {
    // Fetch all courts with metadata
    const courts = await prisma.$queryRaw<Array<{
      id: string;
      name: string;
      metadata: string | null;
      bannerData: string | null;
      description: string | null;
    }>>`
      SELECT id, name, metadata, "bannerData", description
      FROM "Court"
      WHERE metadata IS NOT NULL
    `;

    console.log(`Found ${courts.length} courts with metadata to migrate\n`);

    let migrated = 0;
    let skipped = 0;

    for (const court of courts) {
      try {
        const metadata: OldMetadata = court.metadata ? JSON.parse(court.metadata) : {};
        const existingBannerData: BannerData = court.bannerData ? JSON.parse(court.bannerData) : {};
        
        // Prepare updates
        const updates: {
          courtFormat?: 'SINGLE' | 'DOUBLE';
          bannerData?: BannerData;
          description?: string;
        } = {};

        // 1. Handle courtFormat (from padelCourtFormat)
        if (metadata.padelCourtFormat) {
          const upperFormat = metadata.padelCourtFormat.toUpperCase();
          if (upperFormat === 'SINGLE' || upperFormat === 'DOUBLE') {
            updates.courtFormat = upperFormat;
            console.log(`  - Court "${court.name}": Setting courtFormat to ${updates.courtFormat}`);
          } else {
            console.warn(`  - Court "${court.name}": Invalid format '${metadata.padelCourtFormat}', skipping`);
          }
        }

        // 2. Handle bannerAlignment - merge into bannerData
        if (metadata.bannerAlignment) {
          existingBannerData.bannerAlignment = metadata.bannerAlignment;
          updates.bannerData = existingBannerData;
          console.log(`  - Court "${court.name}": Moving bannerAlignment (${metadata.bannerAlignment}) to bannerData`);
        }

        // 3. Handle description - move to root level if not already there
        if (metadata.description && !court.description) {
          updates.description = metadata.description;
          console.log(`  - Court "${court.name}": Moving description to root level`);
        }

        // Only update if there are changes
        if (Object.keys(updates).length > 0) {
          await prisma.court.update({
            where: { id: court.id },
            data: {
              ...updates,
              ...(updates.bannerData && { bannerData: JSON.stringify(updates.bannerData) }),
              metadata: null, // Clear metadata
            },
          });
          
          migrated++;
          console.log(`  ✓ Court "${court.name}" migrated successfully\n`);
        } else {
          // Just clear metadata if no meaningful data
          await prisma.court.update({
            where: { id: court.id },
            data: { metadata: null },
          });
          skipped++;
          console.log(`  - Court "${court.name}": No data to migrate, cleared metadata\n`);
        }

      } catch (error) {
        console.error(`  ✗ Error migrating court "${court.name}":`, error);
        throw error;
      }
    }

    console.log('\n=================================');
    console.log('Migration Summary:');
    console.log(`  Total courts processed: ${courts.length}`);
    console.log(`  Successfully migrated: ${migrated}`);
    console.log(`  Skipped (no data): ${skipped}`);
    console.log('=================================\n');

  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration if executed directly
if (require.main === module) {
  migrateCourtMetadata()
    .then(() => {
      console.log('Migration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

export { migrateCourtMetadata };
