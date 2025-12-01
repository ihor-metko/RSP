-- AlterTable: Add extended fields to Club
ALTER TABLE "Club" ADD COLUMN "descriptionUA" TEXT;
ALTER TABLE "Club" ADD COLUMN "descriptionEN" TEXT;
ALTER TABLE "Club" ADD COLUMN "phone" TEXT;
ALTER TABLE "Club" ADD COLUMN "email" TEXT;
ALTER TABLE "Club" ADD COLUMN "instagram" TEXT;
ALTER TABLE "Club" ADD COLUMN "heroImage" TEXT;
ALTER TABLE "Club" ADD COLUMN "galleryImages" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable: Add photo field to Court
ALTER TABLE "Court" ADD COLUMN "photo" TEXT;
