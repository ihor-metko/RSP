-- AlterTable
ALTER TABLE "TrainingRequest" ADD COLUMN     "bookingId" TEXT,
ADD COLUMN     "courtId" TEXT;

-- CreateIndex
CREATE INDEX "TrainingRequest_courtId_idx" ON "TrainingRequest"("courtId");

-- CreateIndex
CREATE INDEX "TrainingRequest_bookingId_idx" ON "TrainingRequest"("bookingId");
