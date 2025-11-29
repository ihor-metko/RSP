/*
  Warnings:

  - You are about to drop the column `defaultPrice` on the `Court` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[slug]` on the table `Court` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `Court` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Court" DROP COLUMN "defaultPrice",
ADD COLUMN     "defaultPriceCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "slug" TEXT,
ADD COLUMN     "surface" TEXT,
ADD COLUMN     "type" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "indoor" SET DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "Court_slug_key" ON "Court"("slug");
