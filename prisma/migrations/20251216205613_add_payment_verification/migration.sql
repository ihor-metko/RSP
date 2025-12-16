/*
  Warnings:

  - The values [ACTIVE] on the enum `PaymentAccountStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "PaymentAccountVerificationLevel" AS ENUM ('NOT_VERIFIED', 'VERIFIED');

-- AlterEnum
BEGIN;
CREATE TYPE "PaymentAccountStatus_new" AS ENUM ('PENDING', 'TECHNICAL_OK', 'VERIFIED', 'INVALID', 'DISABLED');
ALTER TABLE "PaymentAccount" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "PaymentAccount" ALTER COLUMN "status" TYPE "PaymentAccountStatus_new" USING ("status"::text::"PaymentAccountStatus_new");
ALTER TYPE "PaymentAccountStatus" RENAME TO "PaymentAccountStatus_old";
ALTER TYPE "PaymentAccountStatus_new" RENAME TO "PaymentAccountStatus";
DROP TYPE "PaymentAccountStatus_old";
ALTER TABLE "PaymentAccount" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- AlterTable
ALTER TABLE "PaymentAccount" ADD COLUMN     "lastRealVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "verificationLevel" "PaymentAccountVerificationLevel" NOT NULL DEFAULT 'NOT_VERIFIED';

-- CreateTable
CREATE TABLE "VerificationPayment" (
    "id" TEXT NOT NULL,
    "paymentAccountId" TEXT NOT NULL,
    "orderReference" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'UAH',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "transactionId" TEXT,
    "authCode" TEXT,
    "cardPan" TEXT,
    "cardType" TEXT,
    "signatureValid" BOOLEAN,
    "callbackData" TEXT,
    "errorMessage" TEXT,
    "initiatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "VerificationPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VerificationPayment_orderReference_key" ON "VerificationPayment"("orderReference");

-- CreateIndex
CREATE INDEX "VerificationPayment_paymentAccountId_idx" ON "VerificationPayment"("paymentAccountId");

-- CreateIndex
CREATE INDEX "VerificationPayment_orderReference_idx" ON "VerificationPayment"("orderReference");

-- CreateIndex
CREATE INDEX "VerificationPayment_status_idx" ON "VerificationPayment"("status");

-- CreateIndex
CREATE INDEX "VerificationPayment_createdAt_idx" ON "VerificationPayment"("createdAt");

-- CreateIndex
CREATE INDEX "PaymentAccount_verificationLevel_idx" ON "PaymentAccount"("verificationLevel");

-- AddForeignKey
ALTER TABLE "VerificationPayment" ADD CONSTRAINT "VerificationPayment_paymentAccountId_fkey" FOREIGN KEY ("paymentAccountId") REFERENCES "PaymentAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
