-- AlterTable
ALTER TABLE "Club" ADD COLUMN "address" TEXT,
ALTER COLUMN "location" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Organization" ALTER COLUMN "address" SET DATA TYPE TEXT;
