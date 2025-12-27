-- CreateTable
CREATE TABLE "ClubDailyStatistics" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "bookedSlots" INTEGER NOT NULL,
    "totalSlots" INTEGER NOT NULL,
    "occupancyPercentage" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClubDailyStatistics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClubMonthlyStatistics" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "averageOccupancy" DOUBLE PRECISION NOT NULL,
    "previousMonthOccupancy" DOUBLE PRECISION,
    "occupancyChangePercent" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClubMonthlyStatistics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClubDailyStatistics_clubId_idx" ON "ClubDailyStatistics"("clubId");

-- CreateIndex
CREATE INDEX "ClubDailyStatistics_date_idx" ON "ClubDailyStatistics"("date");

-- CreateIndex
CREATE INDEX "ClubDailyStatistics_clubId_date_idx" ON "ClubDailyStatistics"("clubId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "ClubDailyStatistics_clubId_date_key" ON "ClubDailyStatistics"("clubId", "date");

-- CreateIndex
CREATE INDEX "ClubMonthlyStatistics_clubId_idx" ON "ClubMonthlyStatistics"("clubId");

-- CreateIndex
CREATE INDEX "ClubMonthlyStatistics_month_idx" ON "ClubMonthlyStatistics"("month");

-- CreateIndex
CREATE INDEX "ClubMonthlyStatistics_year_idx" ON "ClubMonthlyStatistics"("year");

-- CreateIndex
CREATE INDEX "ClubMonthlyStatistics_clubId_month_year_idx" ON "ClubMonthlyStatistics"("clubId", "month", "year");

-- CreateIndex
CREATE UNIQUE INDEX "ClubMonthlyStatistics_clubId_month_year_key" ON "ClubMonthlyStatistics"("clubId", "month", "year");

-- AddForeignKey
ALTER TABLE "ClubDailyStatistics" ADD CONSTRAINT "ClubDailyStatistics_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubMonthlyStatistics" ADD CONSTRAINT "ClubMonthlyStatistics_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;
