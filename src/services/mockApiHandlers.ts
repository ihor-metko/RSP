// TEMPORARY MOCK MODE — REMOVE WHEN DB IS FIXED
// This module provides mock API handlers that match the shape and behavior of real DB queries
// See TODO_MOCK_CLEANUP.md for removal instructions.

import {
  getMockBookings,
  getMockClubs,
  getMockCourts,
  getMockOrganizations,
  getMockUsers,
  getMockMemberships,
  getMockClubMemberships,
  findUserById,
  findClubById,
  findCourtById,
  findBookingById,
  findOrganizationById,
  createMockBooking,
  cancelMockBooking,
  deleteMockBooking,
  createMockClub,
  createMockOrganization,
} from "./mockDb";
import type { AdminBookingResponse } from "@/app/api/admin/bookings/route";

// ============================================================================
// Mock Bookings API
// ============================================================================

export async function mockGetBookings(params: {
  adminType: "root_admin" | "organization_admin" | "club_admin";
  managedIds: string[];
  filters: {
    orgId?: string | null;
    clubId?: string | null;
    dateFrom?: string | null;
    dateTo?: string | null;
    status?: string | null;
    userId?: string | null;
    page: number;
    perPage: number;
  };
}): Promise<{
  bookings: AdminBookingResponse[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}> {
  const { adminType, managedIds, filters } = params;
  const { orgId, clubId, dateFrom, dateTo, status, userId, page, perPage } = filters;

  let bookings = getMockBookings();
  const courts = getMockCourts();
  const clubs = getMockClubs();
  const users = getMockUsers();
  const organizations = getMockOrganizations();

  // Filter by role
  if (adminType === "organization_admin") {
    bookings = bookings.filter((b) => {
      const court = courts.find((c) => c.id === b.courtId);
      if (!court) return false;
      const club = clubs.find((c) => c.id === court.clubId);
      return club && club.organizationId && managedIds.includes(club.organizationId);
    });
  } else if (adminType === "club_admin") {
    bookings = bookings.filter((b) => {
      const court = courts.find((c) => c.id === b.courtId);
      return court && managedIds.includes(court.clubId);
    });
  }

  // Apply filters
  if (orgId) {
    bookings = bookings.filter((b) => {
      const court = courts.find((c) => c.id === b.courtId);
      if (!court) return false;
      const club = clubs.find((c) => c.id === court.clubId);
      return club && club.organizationId === orgId;
    });
  }

  if (clubId) {
    bookings = bookings.filter((b) => {
      const court = courts.find((c) => c.id === b.courtId);
      return court && court.clubId === clubId;
    });
  }

  if (dateFrom) {
    const fromDate = new Date(dateFrom);
    bookings = bookings.filter((b) => b.start >= fromDate);
  }

  if (dateTo) {
    const toDate = new Date(dateTo);
    toDate.setHours(23, 59, 59, 999);
    bookings = bookings.filter((b) => b.start <= toDate);
  }

  if (status) {
    bookings = bookings.filter((b) => b.status === status);
  }

  if (userId) {
    bookings = bookings.filter((b) => b.userId === userId);
  }

  // Sort by start date descending
  bookings.sort((a, b) => b.start.getTime() - a.start.getTime());

  // Pagination
  const total = bookings.length;
  const totalPages = Math.ceil(total / perPage);
  const start = (page - 1) * perPage;
  const paginatedBookings = bookings.slice(start, start + perPage);

  // Transform to response format
  const bookingResponses: AdminBookingResponse[] = paginatedBookings.map((booking) => {
    const user = users.find((u) => u.id === booking.userId);
    const court = courts.find((c) => c.id === booking.courtId);
    const club = court ? clubs.find((c) => c.id === court.clubId) : undefined;
    const organization = club?.organizationId
      ? organizations.find((o) => o.id === club.organizationId)
      : undefined;

    return {
      id: booking.id,
      userId: booking.userId,
      userName: user?.name || null,
      userEmail: user?.email || "",
      courtId: booking.courtId,
      courtName: court?.name || "",
      clubId: court?.clubId || "",
      clubName: club?.name || "",
      organizationId: club?.organizationId || null,
      organizationName: organization?.name || null,
      start: booking.start.toISOString(),
      end: booking.end.toISOString(),
      status: booking.status,
      price: booking.price,
      coachId: booking.coachId,
      coachName: null,
      createdAt: booking.createdAt.toISOString(),
    };
  });

  return {
    bookings: bookingResponses,
    total,
    page,
    perPage,
    totalPages,
  };
}

export async function mockCreateBooking(data: {
  courtId: string;
  userId: string;
  start: Date;
  end: Date;
  price: number;
  status: string;
  coachId?: string | null;
}) {
  const booking = createMockBooking(data);
  return booking;
}

export async function mockCancelBooking(id: string): Promise<boolean> {
  return cancelMockBooking(id);
}

export async function mockDeleteBooking(id: string): Promise<boolean> {
  return deleteMockBooking(id);
}

export async function mockGetBookingById(id: string) {
  const booking = findBookingById(id);
  if (!booking) return null;

  const court = findCourtById(booking.courtId);
  const user = findUserById(booking.userId);
  const club = court ? findClubById(court.clubId) : undefined;
  const organization = club?.organizationId ? findOrganizationById(club.organizationId) : undefined;

  return {
    ...booking,
    user: user ? { id: user.id, name: user.name, email: user.email } : null,
    court: court
      ? {
          id: court.id,
          name: court.name,
          clubId: court.clubId,
          club: club
            ? {
                id: club.id,
                name: club.name,
                organizationId: club.organizationId,
                organization: organization ? { id: organization.id, name: organization.name } : null,
              }
            : null,
        }
      : null,
    coach: null,
  };
}

// ============================================================================
// Mock Clubs API
// ============================================================================

export async function mockGetClubs(params: {
  adminType: "root_admin" | "organization_admin" | "club_admin";
  managedIds: string[];
}) {
  const { adminType, managedIds } = params;
  let clubs = getMockClubs();
  const courts = getMockCourts();
  const bookings = getMockBookings();
  const organizations = getMockOrganizations();
  const clubMemberships = getMockClubMemberships();
  const users = getMockUsers();

  // Filter by role
  if (adminType === "organization_admin") {
    clubs = clubs.filter((c) => c.organizationId && managedIds.includes(c.organizationId));
  } else if (adminType === "club_admin") {
    clubs = clubs.filter((c) => managedIds.includes(c.id));
  }

  // Transform to response format
  return clubs.map((club) => {
    const clubCourts = courts.filter((c) => c.clubId === club.id);
    const clubBookings = bookings.filter((b) => {
      const court = courts.find((c) => c.id === b.courtId);
      return court && court.clubId === club.id;
    });
    const organization = club.organizationId
      ? organizations.find((o) => o.id === club.organizationId)
      : undefined;
    const admins = clubMemberships
      .filter((m) => m.clubId === club.id && m.role === "CLUB_ADMIN")
      .map((m) => {
        const user = users.find((u) => u.id === m.userId);
        return user ? { id: user.id, name: user.name, email: user.email } : null;
      })
      .filter(Boolean);

    const { indoorCount, outdoorCount } = clubCourts.reduce(
      (acc, court) => {
        if (court.indoor) acc.indoorCount++;
        else acc.outdoorCount++;
        return acc;
      },
      { indoorCount: 0, outdoorCount: 0 }
    );

    return {
      id: club.id,
      name: club.name,
      shortDescription: club.shortDescription,
      location: club.location,
      city: club.city,
      contactInfo: club.contactInfo,
      openingHours: club.openingHours,
      logo: club.logo,
      heroImage: club.heroImage,
      tags: club.tags,
      isPublic: club.isPublic,
      createdAt: club.createdAt,
      indoorCount,
      outdoorCount,
      courtCount: clubCourts.length,
      bookingCount: clubBookings.length,
      organization: organization ? { id: organization.id, name: organization.name } : null,
      admins,
    };
  });
}

export async function mockCreateClub(data: {
  name: string;
  location: string;
  organizationId?: string | null;
  createdById: string;
  contactInfo?: string | null;
  openingHours?: string | null;
  logo?: string | null;
}) {
  return createMockClub({
    name: data.name,
    location: data.location,
    organizationId: data.organizationId,
    createdById: data.createdById,
  });
}

export async function mockGetClubById(id: string) {
  const club = findClubById(id);
  if (!club) return null;

  const organization = club.organizationId ? findOrganizationById(club.organizationId) : undefined;
  const courts = getMockCourts().filter((c) => c.clubId === id);

  return {
    ...club,
    organization: organization ? { id: organization.id, name: organization.name } : null,
    courts: courts.map((c) => ({ id: c.id, name: c.name, indoor: c.indoor })),
  };
}

// ============================================================================
// Mock Organizations API
// ============================================================================

export async function mockGetOrganizations(params: {
  adminType: "root_admin" | "organization_admin" | "club_admin";
  managedIds: string[];
  includeArchived?: boolean;
}) {
  const { adminType, managedIds, includeArchived = false } = params;
  let organizations = getMockOrganizations();

  // Filter by role
  if (adminType === "organization_admin") {
    organizations = organizations.filter((o) => managedIds.includes(o.id));
  } else if (adminType === "club_admin") {
    // Club admins don't see organizations
    return [];
  }

  // Filter archived
  if (!includeArchived) {
    organizations = organizations.filter((o) => !o.archivedAt);
  }

  const clubs = getMockClubs();
  const memberships = getMockMemberships();
  const users = getMockUsers();

  return organizations.map((org) => {
    const orgClubs = clubs.filter((c) => c.organizationId === org.id);
    const orgMemberships = memberships.filter((m) => m.organizationId === org.id);
    const admins = orgMemberships
      .filter((m) => m.role === "ORGANIZATION_ADMIN")
      .map((m) => users.find((u) => u.id === m.userId))
      .filter(Boolean);

    return {
      ...org,
      clubCount: orgClubs.length,
      memberCount: orgMemberships.length,
      admins: admins.map((u) => ({ id: u!.id, name: u!.name, email: u!.email })),
    };
  });
}

export async function mockCreateOrganization(data: { name: string; createdById: string }) {
  return createMockOrganization(data);
}

export async function mockGetOrganizationById(id: string) {
  const org = findOrganizationById(id);
  if (!org) return null;

  const clubs = getMockClubs().filter((c) => c.organizationId === id);
  const memberships = getMockMemberships().filter((m) => m.organizationId === id);

  return {
    ...org,
    clubs,
    memberships,
  };
}

// ============================================================================
// Mock Courts API
// ============================================================================

export async function mockGetCourts(clubId?: string) {
  let courts = getMockCourts();
  if (clubId) {
    courts = courts.filter((c) => c.clubId === clubId);
  }
  return courts;
}

export async function mockGetCourtById(id: string) {
  const court = findCourtById(id);
  if (!court) return null;

  const club = findClubById(court.clubId);
  return {
    ...court,
    club: club ? { id: club.id, name: club.name } : null,
  };
}

// ============================================================================
// Mock Users API
// ============================================================================

export async function mockGetUsers() {
  return getMockUsers();
}

export async function mockGetUserById(id: string) {
  return findUserById(id);
}

export async function mockGetUserByEmail(email: string) {
  const users = getMockUsers();
  return users.find((u) => u.email === email);
}
