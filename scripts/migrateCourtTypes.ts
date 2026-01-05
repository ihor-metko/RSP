/**
 * Migration script to extract court format from metadata and populate the type field
 * 
 * This script updates existing Court records where:
 * - The type field is set to "padel" or similar sport-type values
 * - The metadata field contains padelCourtFormat ("single" or "double")
 * 
 * After running this script, all Padel courts will have their type field set to:
 * - "Single" (for single courts)
 * - "Double" (for double courts)
 * 
 * This makes the court type compatible with Quick Booking filtering.
 * 
 * Usage:
 *   npx ts-node --project tsconfig.scripts.json scripts/migrateCourtTypes.ts
 */

import { PrismaClient } from "@prisma/client";
import { extractCourtTypeFromMetadata } from "../src/utils/court-metadata";

const prisma = new PrismaClient();

async function migrateCourtTypes() {
  console.log("🔍 Finding courts that need migration...");

  // Find all courts with metadata
  const courts = await prisma.court.findMany({
    where: {
      metadata: { not: null },
    },
    select: {
      id: true,
      name: true,
      type: true,
      metadata: true,
      clubId: true,
    },
  });

  console.log(`📊 Found ${courts.length} courts with metadata`);

  let migratedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const court of courts) {
    try {
      // Extract court type from metadata using utility function
      const extractedType = extractCourtTypeFromMetadata(court.metadata);

      if (!extractedType) {
        // No padelCourtFormat in metadata, skip
        skippedCount++;
        continue;
      }

      // Skip if already has correct type
      if (court.type === extractedType) {
        console.log(`✓  Court ${court.id} (${court.name}) already has correct type: ${extractedType}`);
        skippedCount++;
        continue;
      }

      // Update court type
      await prisma.court.update({
        where: { id: court.id },
        data: { type: extractedType },
      });

      console.log(`✅ Migrated court ${court.id} (${court.name}): "${court.type}" -> "${extractedType}"`);
      migratedCount++;
    } catch (error) {
      console.error(`❌ Error processing court ${court.id} (${court.name}):`, error);
      errorCount++;
    }
  }

  console.log("\n📈 Migration Summary:");
  console.log(`  ✅ Migrated: ${migratedCount} courts`);
  console.log(`  ⏭️  Skipped: ${skippedCount} courts`);
  console.log(`  ❌ Errors: ${errorCount} courts`);
  console.log(`  📊 Total processed: ${courts.length} courts`);

  if (migratedCount > 0) {
    console.log("\n✅ Migration completed successfully!");
  } else {
    console.log("\n✓  No courts needed migration.");
  }
}

// Run migration
migrateCourtTypes()
  .catch((error) => {
    console.error("Fatal error during migration:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
