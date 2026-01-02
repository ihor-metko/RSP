-- AlterTable
ALTER TABLE "Court" ADD COLUMN "description" TEXT,
ADD COLUMN "isPublished" BOOLEAN NOT NULL DEFAULT false;
