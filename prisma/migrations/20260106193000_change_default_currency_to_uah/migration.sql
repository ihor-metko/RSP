-- AlterTable
-- Change default currency from USD to UAH for Ukrainian platform
ALTER TABLE "Club" ALTER COLUMN "defaultCurrency" SET DEFAULT 'UAH';

-- Update existing clubs that have NULL or USD currency to use UAH
-- This ensures all Ukrainian clubs use UAH by default
UPDATE "Club" 
SET "defaultCurrency" = 'UAH' 
WHERE "defaultCurrency" IS NULL OR "defaultCurrency" = 'USD';
