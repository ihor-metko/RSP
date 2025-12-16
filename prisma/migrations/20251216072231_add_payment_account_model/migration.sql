-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('WAYFORPAY', 'LIQPAY');

-- CreateEnum
CREATE TYPE "PaymentAccountScope" AS ENUM ('ORGANIZATION', 'CLUB');

-- CreateTable
CREATE TABLE "PaymentAccount" (
    "id" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "scope" "PaymentAccountScope" NOT NULL,
    "organizationId" TEXT,
    "clubId" TEXT,
    "merchantId" TEXT NOT NULL,
    "secretKey" TEXT NOT NULL,
    "providerConfig" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayName" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastUpdatedBy" TEXT,

    CONSTRAINT "PaymentAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PaymentAccount_organizationId_idx" ON "PaymentAccount"("organizationId");

-- CreateIndex
CREATE INDEX "PaymentAccount_clubId_idx" ON "PaymentAccount"("clubId");

-- CreateIndex
CREATE INDEX "PaymentAccount_provider_scope_idx" ON "PaymentAccount"("provider", "scope");

-- CreateIndex
CREATE INDEX "PaymentAccount_isActive_idx" ON "PaymentAccount"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentAccount_provider_scope_organizationId_clubId_key" ON "PaymentAccount"("provider", "scope", "organizationId", "clubId");

-- AddForeignKey
ALTER TABLE "PaymentAccount" ADD CONSTRAINT "PaymentAccount_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAccount" ADD CONSTRAINT "PaymentAccount_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;
