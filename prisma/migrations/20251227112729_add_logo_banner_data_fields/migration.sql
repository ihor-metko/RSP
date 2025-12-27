-- AlterTable: Add new logoData and bannerData fields to Organization
ALTER TABLE "Organization" ADD COLUMN "logoData" TEXT;
ALTER TABLE "Organization" ADD COLUMN "bannerData" TEXT;

-- AlterTable: Add new logoData and bannerData fields to Club
ALTER TABLE "Club" ADD COLUMN "logoData" TEXT;
ALTER TABLE "Club" ADD COLUMN "bannerData" TEXT;

-- Data Migration: Migrate existing data from logo/heroImage to logoData/bannerData
-- For Organizations
UPDATE "Organization"
SET 
  "logoData" = CASE 
    WHEN "logo" IS NOT NULL THEN 
      json_build_object('url', "logo")::text
    ELSE NULL
  END,
  "bannerData" = CASE 
    WHEN "heroImage" IS NOT NULL THEN 
      json_build_object('url', "heroImage")::text
    ELSE NULL
  END
WHERE "logo" IS NOT NULL OR "heroImage" IS NOT NULL;

-- For Clubs
UPDATE "Club"
SET 
  "logoData" = CASE 
    WHEN "logo" IS NOT NULL THEN 
      json_build_object('url', "logo")::text
    ELSE NULL
  END,
  "bannerData" = CASE 
    WHEN "heroImage" IS NOT NULL THEN 
      json_build_object('url', "heroImage")::text
    ELSE NULL
  END
WHERE "logo" IS NOT NULL OR "heroImage" IS NOT NULL;
