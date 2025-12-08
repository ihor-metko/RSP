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

// ============================================================================
// Mock Unified Dashboard API
// ============================================================================

export async function mockGetUnifiedDashboard(params: {
  adminType: "root_admin" | "organization_admin" | "club_admin";
  managedIds: string[];
}) {
  const { adminType, managedIds } = params;
  const bookings = getMockBookings();
  const courts = getMockCourts();
  const clubs = getMockClubs();
  const organizations = getMockOrganizations();
  const users = getMockUsers();
  const clubMemberships = getMockClubMemberships();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (adminType === "root_admin") {
    // Platform-wide statistics
    const activeBookings = bookings.filter((b) =>
      ["pending", "paid", "reserved", "confirmed"].includes(b.status)
    ).length;

    const activeBookingsCount = bookings.filter(
      (b) =>
        b.start >= today &&
        ["pending", "paid", "reserved", "confirmed"].includes(b.status)
    ).length;

    const pastBookingsCount = bookings.filter(
      (b) =>
        b.start < today &&
        ["pending", "paid", "reserved", "confirmed"].includes(b.status)
    ).length;

    return {
      adminType,
      isRoot: true,
      platformStats: {
        totalOrganizations: organizations.filter((o) => !o.archivedAt).length,
        totalClubs: clubs.length,
        totalUsers: users.length,
        activeBookings,
        activeBookingsCount,
        pastBookingsCount,
      },
    };
  }

  if (adminType === "organization_admin") {
    // Metrics for each managed organization
    const organizationData = managedIds.map((orgId) => {
      const org = organizations.find((o) => o.id === orgId);
      if (!org) return null;

      const orgClubs = clubs.filter((c) => c.organizationId === orgId);
      const orgClubIds = orgClubs.map((c) => c.id);
      const orgCourts = courts.filter((c) => orgClubIds.includes(c.clubId));
      const orgCourtIds = orgCourts.map((c) => c.id);
      const orgBookings = bookings.filter((b) => orgCourtIds.includes(b.courtId));

      const bookingsToday = orgBookings.filter(
        (b) => b.start >= today && b.start < tomorrow
      ).length;

      const activeBookings = orgBookings.filter(
        (b) =>
          b.start >= today &&
          ["pending", "paid", "reserved", "confirmed"].includes(b.status)
      ).length;

      const pastBookings = orgBookings.filter(
        (b) =>
          b.start < today &&
          ["pending", "paid", "reserved", "confirmed"].includes(b.status)
      ).length;

      const clubAdminsCount = clubMemberships.filter(
        (m) => m.role === "CLUB_ADMIN" && orgClubIds.includes(m.clubId)
      ).length;

      return {
        id: org.id,
        name: org.name,
        slug: org.slug,
        clubsCount: orgClubs.length,
        courtsCount: orgCourts.length,
        bookingsToday,
        clubAdminsCount,
        activeBookings,
        pastBookings,
      };
    });

    return {
      adminType,
      isRoot: false,
      organizations: organizationData.filter(Boolean),
    };
  }

  if (adminType === "club_admin") {
    // Metrics for each managed club
    const clubData = managedIds.map((clubId) => {
      const club = clubs.find((c) => c.id === clubId);
      if (!club) return null;

      const clubCourts = courts.filter((c) => c.clubId === clubId);
      const clubCourtIds = clubCourts.map((c) => c.id);
      const clubBookings = bookings.filter((b) => clubCourtIds.includes(b.courtId));

      const bookingsToday = clubBookings.filter(
        (b) => b.start >= today && b.start < tomorrow
      ).length;

      const activeBookings = clubBookings.filter(
        (b) =>
          b.start >= today &&
          ["pending", "paid", "reserved", "confirmed"].includes(b.status)
      ).length;

      const pastBookings = clubBookings.filter(
        (b) =>
          b.start < today &&
          ["pending", "paid", "reserved", "confirmed"].includes(b.status)
      ).length;

      const organization = club.organizationId
        ? organizations.find((o) => o.id === club.organizationId)
        : undefined;

      return {
        id: club.id,
        name: club.name,
        slug: club.slug,
        organizationId: club.organizationId,
        organizationName: organization?.name ?? null,
        courtsCount: clubCourts.length,
        bookingsToday,
        activeBookings,
        pastBookings,
      };
    });

    return {
      adminType,
      isRoot: false,
      clubs: clubData.filter(Boolean),
    };
  }

  // Should not reach here
  throw new Error("Unknown admin type");
}

// ============================================================================
// Mock Registered Users API
// ============================================================================

export async function mockGetRegisteredUsers() {
  const users = getMockUsers();
  const memberships = getMockMemberships();
  const clubMemberships = getMockClubMemberships();

  // Get admin user IDs to exclude
  const adminIds = new Set<string>();

  // Root admins
  users.filter((u) => u.isRoot).forEach((u) => adminIds.add(u.id));

  // Organization admins
  memberships
    .filter((m) => m.role === "ORGANIZATION_ADMIN")
    .forEach((m) => adminIds.add(m.userId));

  // Club admins
  clubMemberships
    .filter((m) => m.role === "CLUB_ADMIN")
    .forEach((m) => adminIds.add(m.userId));

  // Count real users (excluding admins)
  const realUsers = users.filter((u) => !adminIds.has(u.id));
  const totalUsers = realUsers.length;

  // Generate trend data for the last 30 days
  // For mock data, we'll create a simple pattern based on day of month for consistency
  const trend = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];

    // Simple mock pattern: deterministic 0-3 registrations per day based on day number
    // This makes the data consistent across test runs
    const count = (date.getDate() + i) % 4;

    trend.push({
      date: dateStr,
      count,
    });
  }

  return {
    totalUsers,
    trend,
  };
}

// ============================================================================
// Mock Dashboard Graphs API
// ============================================================================

export async function mockGetDashboardGraphs(params: {
  adminType: "root_admin" | "organization_admin" | "club_admin";
  managedIds: string[];
  timeRange: "week" | "month";
}) {
  const { adminType, managedIds, timeRange } = params;
  const bookings = getMockBookings();
  const courts = getMockCourts();
  const clubs = getMockClubs();

  // Determine date range
  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);
  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0);

  if (timeRange === "week") {
    startDate.setDate(startDate.getDate() - 6); // Last 7 days including today
  } else {
    startDate.setDate(startDate.getDate() - 29); // Last 30 days including today
  }

  // Generate date labels
  const dateLabels: string[] = [];
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    dateLabels.push(currentDate.toISOString().split("T")[0]);
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Filter bookings based on admin type
  let relevantBookings = bookings.filter(
    (b) =>
      b.createdAt >= startDate &&
      b.createdAt <= endDate &&
      ["pending", "paid", "reserved", "confirmed"].includes(b.status)
  );

  if (adminType === "organization_admin") {
    // Filter by organization
    const orgClubs = clubs.filter((c) => managedIds.includes(c.organizationId || ""));
    const orgClubIds = orgClubs.map((c) => c.id);
    const orgCourtIds = courts
      .filter((c) => orgClubIds.includes(c.clubId))
      .map((c) => c.id);
    relevantBookings = relevantBookings.filter((b) =>
      orgCourtIds.includes(b.courtId)
    );
  } else if (adminType === "club_admin") {
    // Filter by club
    const clubCourtIds = courts
      .filter((c) => managedIds.includes(c.clubId))
      .map((c) => c.id);
    relevantBookings = relevantBookings.filter((b) =>
      clubCourtIds.includes(b.courtId)
    );
  }

  // Count bookings and unique users by date
  const bookingCountsByDate = new Map<string, number>();
  const activeUsersByDate = new Map<string, Set<string>>();

  dateLabels.forEach((date) => {
    bookingCountsByDate.set(date, 0);
    activeUsersByDate.set(date, new Set<string>());
  });

  relevantBookings.forEach((booking) => {
    const dateStr = booking.createdAt.toISOString().split("T")[0];
    const currentCount = bookingCountsByDate.get(dateStr) || 0;
    bookingCountsByDate.set(dateStr, currentCount + 1);

    const usersOnDate = activeUsersByDate.get(dateStr);
    if (usersOnDate) {
      usersOnDate.add(booking.userId);
    }
  });

  // Format date labels for display
  const formatDateLabel = (dateStr: string): string => {
    // ISO date string can be parsed directly
    const date = new Date(dateStr);

    if (timeRange === "week") {
      return date.toLocaleDateString("en-US", { weekday: "short" });
    } else {
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }
  };

  // Build response data
  const bookingTrends = dateLabels.map((date) => ({
    date,
    bookings: bookingCountsByDate.get(date) || 0,
    label: formatDateLabel(date),
  }));

  const activeUsers = dateLabels.map((date) => ({
    date,
    users: activeUsersByDate.get(date)?.size || 0,
    label: formatDateLabel(date),
  }));

  return {
    bookingTrends,
    activeUsers,
    timeRange,
  };
}
