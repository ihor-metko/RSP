-- CreateTable
CREATE TABLE "CoachWeeklyAvailability" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoachWeeklyAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CoachWeeklyAvailability_coachId_idx" ON "CoachWeeklyAvailability"("coachId");

-- CreateIndex
CREATE INDEX "CoachWeeklyAvailability_coachId_dayOfWeek_idx" ON "CoachWeeklyAvailability"("coachId", "dayOfWeek");

-- AddForeignKey
ALTER TABLE "CoachWeeklyAvailability" ADD CONSTRAINT "CoachWeeklyAvailability_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "Coach"("id") ON DELETE CASCADE ON UPDATE CASCADE;
