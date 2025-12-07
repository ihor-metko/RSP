-- AlterTable
ALTER TABLE "Club" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'active';

-- Add comment for the status field
COMMENT ON COLUMN "Club"."status" IS 'Club status: active, draft, or suspended';
