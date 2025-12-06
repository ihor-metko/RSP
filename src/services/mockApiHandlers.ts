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

export async function mockGetClubByIdWithDetails(id: string) {
  const club = findClubById(id);
  if (!club) return null;

  const courts = getMockCourts().filter((c) => c.clubId === id);

  // Return full club details with empty arrays for coaches, gallery, businessHours, and specialHours
  return {
    ...club,
    courts: courts.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      type: c.type,
      surface: c.surface,
      indoor: c.indoor,
      defaultPriceCents: c.defaultPriceCents,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      clubId: c.clubId,
    })),
    coaches: [],
    gallery: [],
    businessHours: [],
    specialHours: [],
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

export async function mockGetCourtsForAdmin(params: {
  adminType: "root_admin" | "organization_admin" | "club_admin";
  managedIds: string[];
}) {
  const { adminType, managedIds } = params;
  let courts = getMockCourts();
  const clubs = getMockClubs();
  const organizations = getMockOrganizations();
  const bookings = getMockBookings();

  // Filter by role
  if (adminType === "organization_admin") {
    courts = courts.filter((court) => {
      const club = clubs.find((c) => c.id === court.clubId);
      return club && club.organizationId && managedIds.includes(club.organizationId);
    });
  } else if (adminType === "club_admin") {
    courts = courts.filter((court) => managedIds.includes(court.clubId));
  }

  // Transform to response format with related data
  return courts.map((court) => {
    const club = clubs.find((c) => c.id === court.clubId);
    const organization = club?.organizationId
      ? organizations.find((o) => o.id === club.organizationId)
      : undefined;
    const courtBookings = bookings.filter((b) => b.courtId === court.id);

    return {
      id: court.id,
      name: court.name,
      slug: court.slug,
      type: court.type,
      surface: court.surface,
      indoor: court.indoor,
      defaultPriceCents: court.defaultPriceCents,
      createdAt: court.createdAt,
      updatedAt: court.updatedAt,
      club: {
        id: club!.id,
        name: club!.name,
      },
      organization: organization
        ? {
            id: organization.id,
            name: organization.name,
          }
        : null,
      bookingCount: courtBookings.length,
    };
  });
}

// ============================================================================
// Mock Users API
// ============================================================================

export async function mockGetUsers() {
  return getMockUsers();
}

export async function mockGetUserById(id: string) {
  const user = findUserById(id);
  if (!user) return null;

  const memberships = getMockMemberships().filter((m) => m.userId === id);
  const clubMemberships = getMockClubMemberships().filter((m) => m.userId === id);
  const bookings = getMockBookings().filter((b) => b.userId === id);
  const organizations = getMockOrganizations();
  const clubs = getMockClubs();

  return {
    ...user,
    memberships: memberships.map((m) => {
      const org = organizations.find((o) => o.id === m.organizationId);
      return {
        role: m.role,
        organization: org ? { id: org.id, name: org.name } : null,
      };
    }),
    clubMemberships: clubMemberships.map((m) => {
      const club = clubs.find((c) => c.id === m.clubId);
      return {
        role: m.role,
        club: club ? { id: club.id, name: club.name } : null,
      };
    }),
    bookings: bookings.slice(0, 1).map((b) => ({
      createdAt: b.createdAt,
    })),
  };
}

export async function mockGetUserByEmail(email: string) {
  const users = getMockUsers();
  return users.find((u) => u.email === email);
}

// ============================================================================
// Mock Admin Status API
// ============================================================================

export async function mockGetAdminStatus(userId: string) {
  const user = findUserById(userId);
  if (!user) return null;

  const memberships = getMockMemberships().filter((m) => m.userId === userId);
  const clubMemberships = getMockClubMemberships().filter((m) => m.userId === userId);
  const clubs = getMockClubs();

  // Root admin
  if (user.isRoot) {
    return {
      isAdmin: true,
      adminType: "root_admin" as const,
      isRoot: true,
      managedIds: [],
    };
  }

  // Organization admin
  if (memberships.length > 0) {
    const isPrimaryOwner = memberships.some((m) => m.isPrimaryOwner);
    return {
      isAdmin: true,
      adminType: "organization_admin" as const,
      isRoot: false,
      managedIds: memberships.map((m) => m.organizationId),
      isPrimaryOwner,
    };
  }

  // Club admin
  if (clubMemberships.length > 0) {
    const firstClub = clubs.find((c) => c.id === clubMemberships[0].clubId);
    return {
      isAdmin: true,
      adminType: "club_admin" as const,
      isRoot: false,
      managedIds: clubMemberships.map((m) => m.clubId),
      assignedClub: firstClub
        ? {
            id: firstClub.id,
            name: firstClub.name,
          }
        : undefined,
    };
  }

  // Regular user
  return {
    isAdmin: false,
    adminType: "none" as const,
    isRoot: false,
    managedIds: [],
  };
}

// ============================================================================
// Mock Dashboard API
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
    const activeBookings = bookings.filter(
      (b) =>
        b.start >= today &&
        ["pending", "paid", "reserved", "confirmed"].includes(b.status)
    );
    const pastBookings = bookings.filter(
      (b) =>
        b.start < today &&
        ["pending", "paid", "reserved", "confirmed"].includes(b.status)
    );

    return {
      adminType,
      isRoot: true,
      platformStats: {
        totalOrganizations: organizations.length,
        totalClubs: clubs.length,
        totalUsers: users.length,
        activeBookings: bookings.filter((b) =>
          ["pending", "paid", "reserved", "confirmed"].includes(b.status)
        ).length,
        activeBookingsCount: activeBookings.length,
        pastBookingsCount: pastBookings.length,
      },
    };
  }

  if (adminType === "organization_admin") {
    // Metrics for each managed organization
    const organizationStats = managedIds
      .map((orgId) => {
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
      })
      .filter(Boolean);

    return {
      adminType,
      isRoot: false,
      organizations: organizationStats,
    };
  }

  if (adminType === "club_admin") {
    // Metrics for each managed club
    const clubStats = managedIds
      .map((clubId) => {
        const club = clubs.find((c) => c.id === clubId);
        if (!club) return null;

        const org = club.organizationId
          ? organizations.find((o) => o.id === club.organizationId)
          : null;
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

        return {
          id: club.id,
          name: club.name,
          slug: club.slug,
          organizationId: club.organizationId,
          organizationName: org?.name || null,
          courtsCount: clubCourts.length,
          bookingsToday,
          activeBookings,
          pastBookings,
        };
      })
      .filter(Boolean);

    return {
      adminType,
      isRoot: false,
      clubs: clubStats,
    };
  }

  return null;
}

export async function mockGetUsersList(params: {
  page: number;
  pageSize: number;
  search?: string;
  roleFilter?: string | null;
  organizationId?: string | null;
  clubId?: string | null;
  statusFilter?: string | null;
  sortBy: string;
  sortOrder: "asc" | "desc";
}) {
  const {
    page,
    pageSize,
    search,
    roleFilter,
    organizationId,
    clubId,
    statusFilter,
    sortBy,
    sortOrder,
  } = params;

  let users = getMockUsers();
  const memberships = getMockMemberships();
  const clubMemberships = getMockClubMemberships();
  const bookings = getMockBookings();
  const organizations = getMockOrganizations();
  const clubs = getMockClubs();

  // Apply search filter
  if (search) {
    const searchLower = search.toLowerCase();
    users = users.filter(
      (u) =>
        u.name?.toLowerCase().includes(searchLower) ||
        u.email.toLowerCase().includes(searchLower)
    );
  }

  // Apply status filter
  if (statusFilter === "blocked") {
    users = users.filter((u) => u.blocked);
  } else if (statusFilter === "active") {
    users = users.filter((u) => !u.blocked);
  }

  // Apply role filter
  if (roleFilter === "root_admin") {
    users = users.filter((u) => u.isRoot);
  } else if (roleFilter === "organization_admin") {
    users = users.filter((u) =>
      memberships.some((m) => m.userId === u.id && m.role === "ORGANIZATION_ADMIN")
    );
  } else if (roleFilter === "club_admin") {
    users = users.filter((u) =>
      clubMemberships.some((m) => m.userId === u.id && m.role === "CLUB_ADMIN")
    );
  } else if (roleFilter === "user") {
    users = users.filter(
      (u) =>
        !u.isRoot &&
        !memberships.some((m) => m.userId === u.id && m.role === "ORGANIZATION_ADMIN") &&
        !clubMemberships.some((m) => m.userId === u.id && m.role === "CLUB_ADMIN")
    );
  }

  // Apply organization filter
  if (organizationId) {
    users = users.filter((u) =>
      memberships.some((m) => m.userId === u.id && m.organizationId === organizationId)
    );
  }

  // Apply club filter
  if (clubId) {
    users = users.filter((u) =>
      clubMemberships.some((m) => m.userId === u.id && m.clubId === clubId)
    );
  }

  // Sorting
  users.sort((a, b) => {
    let aVal: string | Date | null = null;
    let bVal: string | Date | null = null;

    if (sortBy === "name") {
      aVal = a.name || "";
      bVal = b.name || "";
    } else if (sortBy === "email") {
      aVal = a.email;
      bVal = b.email;
    } else if (sortBy === "createdAt") {
      aVal = a.createdAt;
      bVal = b.createdAt;
    } else if (sortBy === "lastLoginAt") {
      aVal = a.lastLoginAt;
      bVal = b.lastLoginAt;
    }

    if (aVal === null || bVal === null) return 0;

    if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
    if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  // Pagination
  const totalCount = users.length;
  const start = (page - 1) * pageSize;
  const paginatedUsers = users.slice(start, start + pageSize);

  // Format users for response
  const formattedUsers = paginatedUsers.map((user) => {
    // Determine primary role
    let role: "root_admin" | "organization_admin" | "club_admin" | "user" = "user";
    if (user.isRoot) {
      role = "root_admin";
    } else if (memberships.some((m) => m.userId === user.id && m.role === "ORGANIZATION_ADMIN")) {
      role = "organization_admin";
    } else if (clubMemberships.some((m) => m.userId === user.id && m.role === "CLUB_ADMIN")) {
      role = "club_admin";
    }

    // Get organization info
    const orgMembership = memberships.find(
      (m) => m.userId === user.id && m.role === "ORGANIZATION_ADMIN"
    );
    const organization = orgMembership
      ? organizations.find((o) => o.id === orgMembership.organizationId)
      : undefined;

    // Get club info
    const clubMembership = clubMemberships.find(
      (m) => m.userId === user.id && m.role === "CLUB_ADMIN"
    );
    const club = clubMembership ? clubs.find((c) => c.id === clubMembership.clubId) : undefined;

    // Last activity
    const userBookings = bookings.filter((b) => b.userId === user.id);
    const lastBooking = userBookings.length > 0 ? userBookings[0].createdAt : null;
    let lastActivity: Date | null = null;
    if (user.lastLoginAt && lastBooking) {
      lastActivity = user.lastLoginAt > lastBooking ? user.lastLoginAt : lastBooking;
    } else {
      lastActivity = user.lastLoginAt || lastBooking;
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role,
      organization: organization ? { id: organization.id, name: organization.name } : null,
      club: club ? { id: club.id, name: club.name } : null,
      blocked: user.blocked,
      createdAt: user.createdAt,
      lastActivity,
    };
  });

  return {
    users: formattedUsers,
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
    },
  };
}
