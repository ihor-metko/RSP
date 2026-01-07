-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "reservedAt" TIMESTAMP(3),
ADD COLUMN "reservationExpiresAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Booking_reservationExpiresAt_idx" ON "Booking"("reservationExpiresAt");
