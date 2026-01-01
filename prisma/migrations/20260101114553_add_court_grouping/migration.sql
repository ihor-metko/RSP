-- CreateTable
CREATE TABLE "CourtGroup" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "surface" TEXT,
    "color" TEXT,
    "gameType" TEXT,
    "sportType" "SportType" NOT NULL DEFAULT 'PADEL',
    "defaultPriceCents" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourtGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourtGroupPriceRule" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "dayOfWeek" INTEGER,
    "date" DATE,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourtGroupPriceRule_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Court" ADD COLUMN "groupId" TEXT,
ADD COLUMN "gameType" TEXT,
ADD COLUMN "useGroupPricing" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "CourtGroup_clubId_idx" ON "CourtGroup"("clubId");

-- CreateIndex
CREATE UNIQUE INDEX "CourtGroup_clubId_surface_color_gameType_sportType_key" ON "CourtGroup"("clubId", "surface", "color", "gameType", "sportType");

-- CreateIndex
CREATE INDEX "CourtGroupPriceRule_groupId_idx" ON "CourtGroupPriceRule"("groupId");

-- CreateIndex
CREATE INDEX "Court_groupId_idx" ON "Court"("groupId");

-- AddForeignKey
ALTER TABLE "CourtGroup" ADD CONSTRAINT "CourtGroup_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourtGroupPriceRule" ADD CONSTRAINT "CourtGroupPriceRule_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "CourtGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Court" ADD CONSTRAINT "Court_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "CourtGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
