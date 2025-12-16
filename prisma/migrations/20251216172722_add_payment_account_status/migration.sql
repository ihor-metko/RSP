-- CreateEnum
CREATE TYPE "PaymentAccountStatus" AS ENUM ('PENDING', 'ACTIVE', 'INVALID', 'DISABLED');

-- AlterTable
ALTER TABLE "PaymentAccount" ADD COLUMN "status" "PaymentAccountStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN "lastVerifiedAt" TIMESTAMP(3),
ADD COLUMN "verificationError" TEXT;

-- CreateIndex
CREATE INDEX "PaymentAccount_status_idx" ON "PaymentAccount"("status");

-- Update existing records to ACTIVE status (as they were previously considered active)
UPDATE "PaymentAccount" SET "status" = 'ACTIVE' WHERE "isActive" = true;
UPDATE "PaymentAccount" SET "status" = 'DISABLED' WHERE "isActive" = false;
