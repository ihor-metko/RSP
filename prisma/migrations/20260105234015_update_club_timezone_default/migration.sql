-- AlterTable: Update Club timezone field to be non-nullable with default "Europe/Kyiv"
-- This migration updates the timezone field on the Club table to:
-- 1. Set default value to "Europe/Kyiv" instead of "UTC"
-- 2. Make the field non-nullable (NOT NULL)
-- 3. Update existing NULL values to "Europe/Kyiv"

-- Step 1: Update all existing NULL timezone values to "Europe/Kyiv"
UPDATE "Club" SET "timezone" = 'Europe/Kyiv' WHERE "timezone" IS NULL;

-- Step 2: Update all existing "UTC" timezone values to "Europe/Kyiv"
-- (This ensures consistency across all clubs)
UPDATE "Club" SET "timezone" = 'Europe/Kyiv' WHERE "timezone" = 'UTC';

-- Step 3: Alter the column to be NOT NULL with default "Europe/Kyiv"
ALTER TABLE "Club" ALTER COLUMN "timezone" SET NOT NULL;
ALTER TABLE "Club" ALTER COLUMN "timezone" SET DEFAULT 'Europe/Kyiv';
