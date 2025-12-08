/**
 * Mock Data Smoke Check Script
 * 
 * Simple script to verify that mock data files are properly structured
 * and can be imported without errors.
 * 
 * Run: npx ts-node --project tsconfig.scripts.json scripts/check-mocks.ts
 */

import { shouldUseMocks } from "../src/mocks";
import { 
  mockOrganizationDetail, 
  mockOrganizationWithNoClubs, 
  mockOrganizationWithManyClubs 
} from "../src/mocks/admin/organization-detail";
import { 
  mockClubDetail, 
  mockClubWithNoCourts, 
  mockClubWithManyCourts, 
  mockUnpublishedClub 
} from "../src/mocks/admin/club-detail";
import { 
  mockUserDetail, 
  mockUserWithNoBookings, 
  mockBlockedUser,
  mockOrganizationAdminUser,
  mockClubAdminUser,
  mockRootAdminUser
} from "../src/mocks/admin/user-detail";
import { 
  mockBookingDetail, 
  mockPendingBooking, 
  mockCancelledBooking,
  mockBookingWithCoach,
  mockReservedBooking,
  mockBookingWithoutOrganization
} from "../src/mocks/admin/booking-detail";

console.log("🧪 Mock Data Smoke Check\n");
console.log("=".repeat(50));

// Check helper function
console.log("\n📦 Helper Function:");
console.log(`  shouldUseMocks() exists: ✓`);
console.log(`  Returns boolean: ${typeof shouldUseMocks() === 'boolean' ? '✓' : '✗'}`);

// Check organization mocks
console.log("\n🏢 Organization Mocks:");
console.log(`  mockOrganizationDetail: ${mockOrganizationDetail.org.name}`);
console.log(`    - ID: ${mockOrganizationDetail.org.id}`);
console.log(`    - Clubs: ${mockOrganizationDetail.metrics.clubsCount}`);
console.log(`    - Courts: ${mockOrganizationDetail.metrics.courtsCount}`);
console.log(`  mockOrganizationWithNoClubs: ${mockOrganizationWithNoClubs.org.name}`);
console.log(`    - Clubs: ${mockOrganizationWithNoClubs.metrics.clubsCount}`);
console.log(`  mockOrganizationWithManyClubs: ${mockOrganizationWithManyClubs.org.name}`);
console.log(`    - Clubs: ${mockOrganizationWithManyClubs.metrics.clubsCount}`);

// Check club mocks
console.log("\n🎾 Club Mocks:");
console.log(`  mockClubDetail: ${mockClubDetail.name}`);
console.log(`    - Courts: ${mockClubDetail.courts.length}`);
console.log(`    - Coaches: ${mockClubDetail.coaches.length}`);
console.log(`    - Gallery: ${mockClubDetail.gallery.length} images`);
console.log(`    - Published: ${mockClubDetail.isPublic ? 'Yes' : 'No'}`);
console.log(`  mockClubWithNoCourts: ${mockClubWithNoCourts.name}`);
console.log(`    - Courts: ${mockClubWithNoCourts.courts.length}`);
console.log(`  mockClubWithManyCourts: ${mockClubWithManyCourts.name}`);
console.log(`    - Courts: ${mockClubWithManyCourts.courts.length}`);
console.log(`  mockUnpublishedClub: ${mockUnpublishedClub.name}`);
console.log(`    - Published: ${mockUnpublishedClub.isPublic ? 'Yes' : 'No'}`);

// Check user mocks
console.log("\n👤 User Mocks:");
console.log(`  mockUserDetail: ${mockUserDetail.name}`);
console.log(`    - Email: ${mockUserDetail.email}`);
console.log(`    - Bookings: ${mockUserDetail.bookings?.length || 0}`);
console.log(`    - Memberships: ${mockUserDetail.memberships?.length || 0}`);
console.log(`    - Status: ${mockUserDetail.blocked ? 'Blocked' : 'Active'}`);
console.log(`  mockUserWithNoBookings: ${mockUserWithNoBookings.name}`);
console.log(`    - Bookings: ${mockUserWithNoBookings.bookings?.length || 0}`);
console.log(`  mockBlockedUser: ${mockBlockedUser.name}`);
console.log(`    - Status: ${mockBlockedUser.blocked ? 'Blocked' : 'Active'}`);
console.log(`  mockOrganizationAdminUser: ${mockOrganizationAdminUser.name}`);
console.log(`    - Role: ${mockOrganizationAdminUser.role}`);
console.log(`  mockClubAdminUser: ${mockClubAdminUser.name}`);
console.log(`    - Role: ${mockClubAdminUser.role}`);
console.log(`  mockRootAdminUser: ${mockRootAdminUser.name}`);
console.log(`    - Role: ${mockRootAdminUser.role}`);

// Check booking mocks
console.log("\n📅 Booking Mocks:");
console.log(`  mockBookingDetail: ${mockBookingDetail.courtName}`);
console.log(`    - User: ${mockBookingDetail.userName}`);
console.log(`    - Status: ${mockBookingDetail.status}`);
console.log(`    - Price: ${mockBookingDetail.price / 100} EUR`);
console.log(`    - Coach: ${mockBookingDetail.coachName || 'None'}`);
console.log(`  mockPendingBooking: ${mockPendingBooking.courtName}`);
console.log(`    - Status: ${mockPendingBooking.status}`);
console.log(`  mockCancelledBooking: ${mockCancelledBooking.courtName}`);
console.log(`    - Status: ${mockCancelledBooking.status}`);
console.log(`  mockBookingWithCoach: ${mockBookingWithCoach.courtName}`);
console.log(`    - Coach: ${mockBookingWithCoach.coachName}`);
console.log(`    - Payments: ${mockBookingWithCoach.payments.length}`);
console.log(`  mockReservedBooking: ${mockReservedBooking.courtName}`);
console.log(`    - Status: ${mockReservedBooking.status}`);
console.log(`  mockBookingWithoutOrganization: ${mockBookingWithoutOrganization.courtName}`);
console.log(`    - Organization: ${mockBookingWithoutOrganization.organizationName || 'Independent'}`);

console.log("\n" + "=".repeat(50));
console.log("✅ All mocks loaded successfully!");
console.log("\nTo use mocks in development:");
console.log("  1. Add NEXT_PUBLIC_USE_MOCKS=true to .env.local");
console.log("  2. Restart dev server: npm run dev");
console.log("  3. Navigate to admin pages to see mock data");
