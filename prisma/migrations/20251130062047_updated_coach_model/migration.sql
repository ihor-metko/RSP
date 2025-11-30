-- DropForeignKey
ALTER TABLE "Coach" DROP CONSTRAINT "Coach_clubId_fkey";

-- AlterTable
ALTER TABLE "Coach" ADD COLUMN     "phone" TEXT,
ALTER COLUMN "clubId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Coach" ADD CONSTRAINT "Coach_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE SET NULL ON UPDATE CASCADE;
