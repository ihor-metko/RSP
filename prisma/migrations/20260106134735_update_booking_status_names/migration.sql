-- Update booking status names to match new naming convention
-- This migration updates existing 'Active' to 'UPCOMING' and 'Pending' to 'Confirmed'

-- Update 'Active' to 'UPCOMING'
UPDATE "Booking" SET "bookingStatus" = 'UPCOMING' WHERE "bookingStatus" = 'Active';

-- Update 'Pending' to 'Confirmed'
UPDATE "Booking" SET "bookingStatus" = 'Confirmed' WHERE "bookingStatus" = 'Pending';

-- Update default value for bookingStatus column
ALTER TABLE "Booking" ALTER COLUMN "bookingStatus" SET DEFAULT 'Confirmed';
