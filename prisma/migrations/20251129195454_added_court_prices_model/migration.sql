-- CreateTable
CREATE TABLE "CourtPriceRule" (
    "id" TEXT NOT NULL,
    "courtId" TEXT NOT NULL,
    "dayOfWeek" INTEGER,
    "date" DATE,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourtPriceRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CourtPriceRule_courtId_idx" ON "CourtPriceRule"("courtId");

-- AddForeignKey
ALTER TABLE "CourtPriceRule" ADD CONSTRAINT "CourtPriceRule_courtId_fkey" FOREIGN KEY ("courtId") REFERENCES "Court"("id") ON DELETE CASCADE ON UPDATE CASCADE;
