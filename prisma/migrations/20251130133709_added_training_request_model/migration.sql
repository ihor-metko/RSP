-- CreateTable
CREATE TABLE "TrainingRequest" (
    "id" TEXT NOT NULL,
    "trainerId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "time" TEXT NOT NULL,
    "comment" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TrainingRequest_trainerId_idx" ON "TrainingRequest"("trainerId");

-- CreateIndex
CREATE INDEX "TrainingRequest_playerId_idx" ON "TrainingRequest"("playerId");

-- CreateIndex
CREATE INDEX "TrainingRequest_clubId_idx" ON "TrainingRequest"("clubId");
