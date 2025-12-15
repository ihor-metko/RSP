-- AlterTable
-- Add new bookingStatus and paymentStatus columns with default values
ALTER TABLE "Booking" ADD COLUMN "bookingStatus" TEXT NOT NULL DEFAULT 'Pending',
ADD COLUMN "paymentStatus" TEXT NOT NULL DEFAULT 'Unpaid';

-- Migrate existing data from legacy 'status' field to new dual-status fields
-- Map legacy status to appropriate bookingStatus and paymentStatus

-- Map 'paid' -> bookingStatus='Active', paymentStatus='Paid'
UPDATE "Booking" SET "bookingStatus" = 'Active', "paymentStatus" = 'Paid' WHERE "status" = 'paid';

-- Map 'pending' -> bookingStatus='Pending', paymentStatus='Unpaid'
UPDATE "Booking" SET "bookingStatus" = 'Pending', "paymentStatus" = 'Unpaid' WHERE "status" = 'pending';

-- Map 'cancelled' -> bookingStatus='Cancelled', paymentStatus='Unpaid' (or keep existing payment status)
UPDATE "Booking" SET "bookingStatus" = 'Cancelled', "paymentStatus" = 'Unpaid' WHERE "status" = 'cancelled';

-- Map 'reserved' -> bookingStatus='Active', paymentStatus='Unpaid'
UPDATE "Booking" SET "bookingStatus" = 'Active', "paymentStatus" = 'Unpaid' WHERE "status" = 'reserved';

-- Map 'completed' -> bookingStatus='Completed', paymentStatus='Paid'
UPDATE "Booking" SET "bookingStatus" = 'Completed', "paymentStatus" = 'Paid' WHERE "status" = 'completed';

-- Map 'no-show' -> bookingStatus='No-show', paymentStatus='Unpaid'
UPDATE "Booking" SET "bookingStatus" = 'No-show', "paymentStatus" = 'Unpaid' WHERE "status" = 'no-show';

-- Map 'ongoing' -> bookingStatus='Active', paymentStatus='Paid'
UPDATE "Booking" SET "bookingStatus" = 'Active', "paymentStatus" = 'Paid' WHERE "status" = 'ongoing';

-- Set default for status column if not already set
ALTER TABLE "Booking" ALTER COLUMN "status" SET DEFAULT 'pending';
