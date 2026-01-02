/**
 * Data migration script to populate the new address field in Club and Organization models
 * This script migrates existing address data from root-level fields to the new dedicated address object
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface Address {
  country?: string | null;
  city?: string | null;
  street?: string | null;
  postalCode?: string | null;
  region?: string | null;
  lat?: number | null;
  lng?: number | null;
  formattedAddress?: string | null;
}

async function migrateClubAddresses() {
  console.log("Starting Club address migration...");
  
  const clubs = await prisma.club.findMany({
    select: {
      id: true,
      location: true,
      city: true,
      country: true,
      latitude: true,
      longitude: true,
      address: true,
    },
  });

  console.log(`Found ${clubs.length} clubs to migrate`);

  let migratedCount = 0;
  let skippedCount = 0;

  for (const club of clubs) {
    // Skip if address field already has data
    if (club.address) {
      try {
        const existingAddress = JSON.parse(club.address);
        if (existingAddress && typeof existingAddress === 'object') {
          console.log(`Club ${club.id} already has address data, skipping`);
          skippedCount++;
          continue;
        }
      } catch {
        // If parsing fails, proceed with migration
      }
    }

    // Build address object from legacy fields
    const address: Address = {
      country: club.country || null,
      city: club.city || null,
      lat: club.latitude || null,
      lng: club.longitude || null,
      formattedAddress: club.location || null,
    };

    // Only update if we have at least some address data
    const hasAddressData = Object.values(address).some(val => val !== null);
    
    if (hasAddressData) {
      await prisma.club.update({
        where: { id: club.id },
        data: {
          address: JSON.stringify(address),
        },
      });
      migratedCount++;
      console.log(`Migrated club ${club.id}`);
    } else {
      skippedCount++;
      console.log(`Club ${club.id} has no address data, skipping`);
    }
  }

  console.log(`Club migration complete: ${migratedCount} migrated, ${skippedCount} skipped`);
}

async function migrateOrganizationAddresses() {
  console.log("Starting Organization address migration...");
  
  const organizations = await prisma.organization.findMany({
    select: {
      id: true,
      address: true,
    },
  });

  console.log(`Found ${organizations.length} organizations to migrate`);

  let migratedCount = 0;
  let skippedCount = 0;

  for (const org of organizations) {
    // Check if address field exists and is a simple string (legacy format)
    if (org.address) {
      try {
        const parsed = JSON.parse(org.address);
        if (parsed && typeof parsed === 'object' && ('city' in parsed || 'country' in parsed || 'lat' in parsed)) {
          console.log(`Organization ${org.id} already has structured address data, skipping`);
          skippedCount++;
          continue;
        }
      } catch {
        // If parsing fails, it's a plain string, migrate it
        const address: Address = {
          formattedAddress: org.address,
        };

        await prisma.organization.update({
          where: { id: org.id },
          data: {
            address: JSON.stringify(address),
          },
        });
        migratedCount++;
        console.log(`Migrated organization ${org.id}`);
        continue;
      }
    }

    skippedCount++;
    console.log(`Organization ${org.id} has no address data, skipping`);
  }

  console.log(`Organization migration complete: ${migratedCount} migrated, ${skippedCount} skipped`);
}

async function main() {
  try {
    await migrateClubAddresses();
    await migrateOrganizationAddresses();
    console.log("All migrations completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
