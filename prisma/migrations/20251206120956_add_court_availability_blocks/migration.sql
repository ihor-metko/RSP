-- CreateTable
CREATE TABLE "CourtAvailabilityBlock" (
    "id" TEXT NOT NULL,
    "courtId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "reason" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourtAvailabilityBlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CourtAvailabilityBlock_courtId_idx" ON "CourtAvailabilityBlock"("courtId");

-- CreateIndex
CREATE INDEX "CourtAvailabilityBlock_courtId_date_idx" ON "CourtAvailabilityBlock"("courtId", "date");

-- AddForeignKey
ALTER TABLE "CourtAvailabilityBlock" ADD CONSTRAINT "CourtAvailabilityBlock_courtId_fkey" FOREIGN KEY ("courtId") REFERENCES "Court"("id") ON DELETE CASCADE ON UPDATE CASCADE;
