-- CreateEnum
CREATE TYPE "SportType" AS ENUM ('PADEL', 'TENNIS', 'PICKLEBALL', 'SQUASH', 'BADMINTON');

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN "supportedSports" "SportType"[] DEFAULT ARRAY['PADEL']::"SportType"[];

-- AlterTable
ALTER TABLE "Club" ADD COLUMN "supportedSports" "SportType"[] DEFAULT ARRAY['PADEL']::"SportType"[];

-- AlterTable
ALTER TABLE "Court" ADD COLUMN "sportType" "SportType" NOT NULL DEFAULT 'PADEL';

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "sportType" "SportType" NOT NULL DEFAULT 'PADEL';

-- AlterTable
ALTER TABLE "PricingRule" ADD COLUMN "sportType" "SportType" NOT NULL DEFAULT 'PADEL';
