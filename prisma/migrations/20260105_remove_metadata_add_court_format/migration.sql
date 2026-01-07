-- CreateEnum
CREATE TYPE "CourtFormat" AS ENUM ('SINGLE', 'DOUBLE');

-- AlterTable: Add courtFormat field
ALTER TABLE "Court" ADD COLUMN "courtFormat" "CourtFormat";

-- Update bannerData comment (this is a comment-only change, reflected in schema)
COMMENT ON COLUMN "Court"."bannerData" IS 'JSON: { url: string; altText?: string; description?: string; position?: string; bannerAlignment?: string }';

-- AlterTable: Drop metadata field
ALTER TABLE "Court" DROP COLUMN "metadata";
