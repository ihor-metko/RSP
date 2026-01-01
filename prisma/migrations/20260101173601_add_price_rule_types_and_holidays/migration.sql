-- CreateEnum
CREATE TYPE "PriceRuleType" AS ENUM ('SPECIFIC_DAY', 'SPECIFIC_DATE', 'WEEKDAYS', 'WEEKENDS', 'ALL_DAYS', 'HOLIDAY');

-- CreateTable
CREATE TABLE "HolidayDate" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "recurring" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HolidayDate_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "CourtPriceRule" ADD COLUMN "ruleType" "PriceRuleType" NOT NULL DEFAULT 'SPECIFIC_DAY',
ADD COLUMN "holidayId" TEXT;

-- CreateIndex
CREATE INDEX "HolidayDate_clubId_idx" ON "HolidayDate"("clubId");

-- CreateIndex
CREATE INDEX "HolidayDate_date_idx" ON "HolidayDate"("date");

-- CreateIndex
CREATE UNIQUE INDEX "HolidayDate_clubId_date_name_key" ON "HolidayDate"("clubId", "date", "name");

-- CreateIndex
CREATE INDEX "CourtPriceRule_holidayId_idx" ON "CourtPriceRule"("holidayId");

-- AddForeignKey
ALTER TABLE "CourtPriceRule" ADD CONSTRAINT "CourtPriceRule_holidayId_fkey" FOREIGN KEY ("holidayId") REFERENCES "HolidayDate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HolidayDate" ADD CONSTRAINT "HolidayDate_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate existing data: rules with dayOfWeek should remain SPECIFIC_DAY
-- Rules with date should be changed to SPECIFIC_DATE
UPDATE "CourtPriceRule" SET "ruleType" = 'SPECIFIC_DATE' WHERE "date" IS NOT NULL;

-- Rules with neither dayOfWeek nor date should be changed to ALL_DAYS
UPDATE "CourtPriceRule" SET "ruleType" = 'ALL_DAYS' WHERE "dayOfWeek" IS NULL AND "date" IS NULL;
