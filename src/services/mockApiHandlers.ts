// TEMPORARY MOCK MODE — REMOVE WHEN DB IS FIXED
// This module provides mock API handlers that match the shape and behavior of real DB queries
// See TODO_MOCK_CLEANUP.md for removal instructions.

import {
  getMockBookings,
  getMockClubs,
  getMockCourts,
  getMockOrganizations,
  getMockUsers,
  getMockPayments,
  getMockMemberships,
  getMockClubMemberships,
  getMockBusinessHours,
  getMockCourtPriceRules,
  getMockAuditLogs,
  getMockAdminNotifications,
  getMockCoaches,
  findUserById,
  findClubById,
  findCourtById,
  findBookingById,
  findOrganizationById,
  findAdminNotificationById,
  createMockBooking,
  updateMockBooking,
  cancelMockBooking,
  deleteMockBooking,
  createMockClub,
  createMockOrganization,
  createMockUser,
  updateMockCourt,
  deleteMockCourt,
  updateMockNotification,
  markAllMockNotificationsAsRead,
  updateMockOrganization,
  archiveMockOrganization,
  restoreMockOrganization,
  deleteMockOrganization,
  findMembershipByUserAndOrg,
  findOrganizationBySlug,
  createMockMembership,
  updateMockMembership,
  createMockAuditLog,
} from "./mockDb";
import type { AdminBookingResponse } from "@/app/api/admin/bookings/route";

// ============================================================================
// Constants for default pagination and sorting
// ============================================================================

const DEFAULT_SORT_BY = "name";
const DEFAULT_SORT_ORDER = "asc";
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

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
  
  // Validate required relations exist in mock data
  if (!user) {
    throw new Error(`Mock data error: User ${booking.userId} not found for booking ${id}`);
  }
  if (!court) {
    throw new Error(`Mock data error: Court ${booking.courtId} not found for booking ${id}`);
  }
  
  const club = findClubById(court.clubId);
  if (!club) {
    throw new Error(`Mock data error: Club ${court.clubId} not found for court ${court.id}`);
  }
  
  const organization = club.organizationId ? findOrganizationById(club.organizationId) : null;
  const payments = getMockPayments().filter((p) => p.bookingId === id);
  
  // Get coach information if coachId exists
  const coaches = getMockCoaches();
  const users = getMockUsers();
  let coachName: string | null = null;
  if (booking.coachId) {
    const coach = coaches.find((c) => c.id === booking.coachId);
    if (coach) {
      const coachUser = users.find((u) => u.id === coach.userId);
      coachName = coachUser?.name || null;
    }
  }

  return {
    id: booking.id,
    userId: booking.userId,
    userName: user.name,
    userEmail: user.email,
    courtId: booking.courtId,
    courtName: court.name,
    courtType: court.type,
    courtSurface: court.surface,
    clubId: court.clubId,
    clubName: club.name,
    organizationId: club.organizationId,
    organizationName: organization?.name || null,
    start: booking.start.toISOString(),
    end: booking.end.toISOString(),
    status: booking.status,
    price: booking.price,
    coachId: booking.coachId,
    coachName,
    paymentId: booking.paymentId,
    createdAt: booking.createdAt.toISOString(),
    payments: payments.map((payment) => ({
      id: payment.id,
      provider: payment.provider,
      status: payment.status,
      amount: payment.amount,
      createdAt: payment.createdAt.toISOString(),
    })),
  };
}

/**
 * Mock handler for updating a booking
 * Used by PATCH /api/admin/bookings/:id
 */
export async function mockUpdateBookingById(id: string, data: { status?: string }) {
  const booking = findBookingById(id);
  if (!booking) return null;

  // Update the booking
  const updatedBooking = updateMockBooking(id, {
    status: data.status || booking.status,
  });

  if (!updatedBooking) return null;

  // Return the full booking detail (reuse the get function)
  return mockGetBookingById(id);
}

// ============================================================================
// Mock Clubs API
// ============================================================================

export async function mockGetClubs(params: {
  adminType: "root_admin" | "organization_admin" | "club_admin";
  managedIds: string[];
  search?: string;
  city?: string;
  status?: string;
  organizationId?: string;
  courtCountMin?: string;
  courtCountMax?: string;
  sortBy?: string;
  sortOrder?: string;
}) {
  const { adminType, managedIds, search, city, status, organizationId, courtCountMin, courtCountMax, sortBy = "createdAt", sortOrder = "desc" } = params;
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

  // Apply search filter
  if (search) {
    const searchLower = search.toLowerCase();
    clubs = clubs.filter((c) =>
      c.name.toLowerCase().includes(searchLower) ||
      c.location.toLowerCase().includes(searchLower) ||
      (c.city && c.city.toLowerCase().includes(searchLower))
    );
  }

  // Apply city filter
  if (city) {
    clubs = clubs.filter((c) => c.city === city);
  }

  // Apply status filter
  if (status) {
    clubs = clubs.filter((c) => c.status === status);
  }

  // Apply organization filter (only for root admin)
  if (organizationId && adminType === "root_admin") {
    clubs = clubs.filter((c) => c.organizationId === organizationId);
  }

  // Transform to response format
  let clubsWithCounts = clubs.map((club) => {
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
      status: club.status,
      createdAt: club.createdAt,
      indoorCount,
      outdoorCount,
      courtCount: clubCourts.length,
      bookingCount: clubBookings.length,
      organization: organization ? { id: organization.id, name: organization.name } : null,
      admins,
    };
  });

  // Apply court count filter if specified
  if (courtCountMin || courtCountMax) {
    const minCount = courtCountMin ? parseInt(courtCountMin, 10) : 0;
    const maxCount = courtCountMax ? parseInt(courtCountMax, 10) : Infinity;
    
    // Validate parsed values - skip filter if values are invalid
    const isMinValid = !courtCountMin || !isNaN(minCount);
    const isMaxValid = !courtCountMax || !isNaN(maxCount);
    
    if (isMinValid && isMaxValid) {
      clubsWithCounts = clubsWithCounts.filter((club) => {
        return club.courtCount >= minCount && club.courtCount <= maxCount;
      });
    }
  }

  // Apply sorting
  clubsWithCounts.sort((a, b) => {
    let aVal: string | number;
    let bVal: string | number;

    if (sortBy === "name") {
      aVal = a.name.toLowerCase();
      bVal = b.name.toLowerCase();
    } else if (sortBy === "city") {
      aVal = (a.city || "").toLowerCase();
      bVal = (b.city || "").toLowerCase();
    } else if (sortBy === "bookingCount") {
      aVal = a.bookingCount;
      bVal = b.bookingCount;
    } else {
      // Default to createdAt
      aVal = new Date(a.createdAt).getTime();
      bVal = new Date(b.createdAt).getTime();
    }

    if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
    if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  return clubsWithCounts;
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

/**
 * Mock handler for full organization detail endpoint
 * Returns complete org detail with metrics, clubs preview, admins, and activity
 */
export async function mockGetOrganizationDetail(orgId: string) {
  const org = findOrganizationById(orgId);
  if (!org) return null;

  const users = getMockUsers();
  const clubs = getMockClubs();
  const courts = getMockCourts();
  const bookings = getMockBookings();
  const memberships = getMockMemberships();
  const clubMemberships = getMockClubMemberships();
  const auditLogs = getMockAuditLogs();

  // Find creator
  const createdBy = users.find((u) => u.id === org.createdById);

  // Find super admins
  const orgMemberships = memberships.filter(
    (m) => m.organizationId === orgId && m.role === "ORGANIZATION_ADMIN"
  );
  const superAdmins = orgMemberships.map((m) => {
    const user = users.find((u) => u.id === m.userId);
    return {
      id: user!.id,
      name: user!.name,
      email: user!.email,
      isPrimaryOwner: m.isPrimaryOwner,
      membershipId: m.id,
    };
  });

  // Calculate metrics
  const orgClubs = clubs.filter((c) => c.organizationId === orgId);
  const clubIds = orgClubs.map((c) => c.id);
  const orgCourts = courts.filter((c) => clubIds.includes(c.clubId));
  const courtIds = orgCourts.map((c) => c.id);
  const orgBookings = bookings.filter((b) => courtIds.includes(b.courtId));

  const totalClubs = orgClubs.length;
  const totalCourts = orgCourts.length;
  const activeBookings = orgBookings.filter(
    (b) =>
      ["pending", "paid", "reserved", "confirmed"].includes(b.status) &&
      b.start >= new Date()
  ).length;
  const uniqueUserIds = new Set(orgBookings.map((b) => b.userId));
  const activeUsers = uniqueUserIds.size;

  // Clubs preview (first 5)
  const clubsPreview = orgClubs.slice(0, 5).map((club) => {
    const clubCourts = courts.filter((c) => c.clubId === club.id);
    const clubAdminsCount = clubMemberships.filter(
      (cm) => cm.clubId === club.id && cm.role === "CLUB_ADMIN"
    ).length;

    return {
      id: club.id,
      name: club.name,
      slug: club.slug,
      city: club.city,
      isPublic: club.isPublic,
      courtCount: clubCourts.length,
      adminCount: clubAdminsCount,
      createdAt: club.createdAt,
    };
  });

  // Club admins (first 10)
  const clubAdminMemberships = clubMemberships.filter(
    (cm) => clubIds.includes(cm.clubId) && cm.role === "CLUB_ADMIN"
  ).slice(0, 10);

  const clubAdmins = clubAdminMemberships.map((cm) => {
    const user = users.find((u) => u.id === cm.userId);
    const club = clubs.find((c) => c.id === cm.clubId);
    return {
      id: cm.id,
      userId: user!.id,
      userName: user!.name,
      userEmail: user!.email,
      clubId: club!.id,
      clubName: club!.name,
    };
  });

  // Recent activity (audit logs - last 10)
  const orgAuditLogs = auditLogs
    .filter((log) => log.targetType === "organization" && log.targetId === orgId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 10);

  const actorIds = [...new Set(orgAuditLogs.map((log) => log.actorId))];
  const actors = users.filter((u) => actorIds.includes(u.id));
  const actorMap = new Map(actors.map((a) => [a.id, a]));

  const recentActivity = orgAuditLogs.map((log) => {
    const actor = actorMap.get(log.actorId);
    return {
      id: log.id,
      action: log.action,
      actor: actor
        ? {
            id: actor.id,
            name: actor.name,
            email: actor.email,
          }
        : {
            id: log.actorId,
            name: null,
            email: null,
          },
      detail: log.detail ? JSON.parse(log.detail) : null,
      createdAt: log.createdAt,
    };
  });

  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    contactEmail: org.contactEmail,
    contactPhone: org.contactPhone,
    website: org.website,
    address: org.address,
    metadata: org.metadata ? JSON.parse(org.metadata) : null,
    archivedAt: org.archivedAt,
    createdAt: org.createdAt,
    updatedAt: org.updatedAt,
    createdBy: createdBy
      ? {
          id: createdBy.id,
          name: createdBy.name,
          email: createdBy.email,
        }
      : {
          id: org.createdById,
          name: null,
          email: "unknown@example.com",
        },
    superAdmins,
    primaryOwner: superAdmins.find((a) => a.isPrimaryOwner) || superAdmins[0] || null,
    metrics: {
      totalClubs,
      totalCourts,
      activeBookings,
      activeUsers,
    },
    clubsPreview,
    clubAdmins,
    recentActivity,
  };
}

// ============================================================================
// Mock Courts API
// ============================================================================

export async function mockGetCourts(params: {
  adminType: "root_admin" | "organization_admin" | "club_admin";
  managedIds: string[];
  filters: {
    search?: string;
    clubId?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: string;
    page?: number;
    limit?: number;
  };
}) {
  const { adminType, managedIds, filters } = params;
  const {
    search,
    clubId,
    status,
    sortBy = DEFAULT_SORT_BY,
    sortOrder = DEFAULT_SORT_ORDER,
    page = DEFAULT_PAGE,
    limit = DEFAULT_LIMIT,
  } = filters;

  let courts = getMockCourts();
  const clubs = getMockClubs();
  const organizations = getMockOrganizations();
  const bookings = getMockBookings();

  // Create lookup maps for O(1) access
  const clubMap = new Map(clubs.map((club) => [club.id, club]));
  const organizationMap = new Map(organizations.map((org) => [org.id, org]));

  // Filter by role
  if (adminType === "organization_admin") {
    courts = courts.filter((court) => {
      const club = clubMap.get(court.clubId);
      return club && club.organizationId && managedIds.includes(club.organizationId);
    });
  } else if (adminType === "club_admin") {
    courts = courts.filter((court) => managedIds.includes(court.clubId));
  }

  // Apply search filter
  if (search) {
    const searchLower = search.toLowerCase();
    courts = courts.filter((court) =>
      court.name.toLowerCase().includes(searchLower)
    );
  }

  // Apply club filter
  if (clubId) {
    courts = courts.filter((court) => court.clubId === clubId);
  }

  // Apply status filter
  if (status === "active") {
    courts = courts.filter((court) => court.isActive);
  } else if (status === "inactive") {
    courts = courts.filter((court) => !court.isActive);
  }

  // Count bookings for each court
  const courtsWithBookings = courts.map((court) => {
    const courtBookings = bookings.filter((b) => b.courtId === court.id);
    return {
      ...court,
      bookingCount: courtBookings.length,
    };
  });

  // Sort courts
  const sortedCourts = [...courtsWithBookings];
  if (sortBy === "name") {
    sortedCourts.sort((a, b) => {
      const comparison = a.name.localeCompare(b.name);
      return sortOrder === "asc" ? comparison : -comparison;
    });
  } else if (sortBy === "bookings") {
    sortedCourts.sort((a, b) => {
      const comparison = a.bookingCount - b.bookingCount;
      return sortOrder === "asc" ? comparison : -comparison;
    });
  }

  // Calculate pagination
  const totalCount = sortedCourts.length;
  const totalPages = Math.ceil(totalCount / limit);
  const skip = (page - 1) * limit;
  const paginatedCourts = sortedCourts.slice(skip, skip + limit);

  // Transform to response format
  const courtsWithDetails = paginatedCourts.map((court) => {
    const club = clubMap.get(court.clubId);
    const organization = club?.organizationId
      ? organizationMap.get(club.organizationId)
      : undefined;

    // Courts should always have valid club associations in mock data
    if (!club) {
      throw new Error(`Invalid mock data: Court ${court.id} has no associated club`);
    }

    return {
      id: court.id,
      name: court.name,
      slug: court.slug,
      type: court.type,
      surface: court.surface,
      indoor: court.indoor,
      isActive: court.isActive,
      defaultPriceCents: court.defaultPriceCents,
      createdAt: court.createdAt.toISOString(),
      updatedAt: court.updatedAt.toISOString(),
      club: {
        id: club.id,
        name: club.name,
      },
      organization: organization
        ? {
            id: organization.id,
            name: organization.name,
          }
        : null,
      bookingCount: court.bookingCount,
    };
  });

  return {
    courts: courtsWithDetails,
    pagination: {
      page,
      limit,
      total: totalCount,
      totalPages,
      hasMore: page * limit < totalCount,
    },
  };
}

export async function mockGetCourtById(id: string) {
  const court = findCourtById(id);
  if (!court) return null;

  // Return only the fields that match the real API response (no club relation)
  return {
    id: court.id,
    name: court.name,
    slug: court.slug,
    type: court.type,
    surface: court.surface,
    indoor: court.indoor,
    defaultPriceCents: court.defaultPriceCents,
    clubId: court.clubId,
    createdAt: court.createdAt.toISOString(),
    updatedAt: court.updatedAt.toISOString(),
  };
}

export async function mockGetCourtDetailById(id: string) {
  const court = findCourtById(id);
  if (!court) return null;

  const club = findClubById(court.clubId);
  const businessHours = getMockBusinessHours().filter((bh) => bh.clubId === court.clubId);
  const courtPriceRules = getMockCourtPriceRules().filter((pr) => pr.courtId === id);

  return {
    id: court.id,
    name: court.name,
    slug: court.slug,
    type: court.type,
    surface: court.surface,
    indoor: court.indoor,
    defaultPriceCents: court.defaultPriceCents,
    clubId: court.clubId,
    isActive: court.isActive,
    createdAt: court.createdAt.toISOString(),
    updatedAt: court.updatedAt.toISOString(),
    club: club
      ? {
          id: club.id,
          name: club.name,
          businessHours: businessHours.map((bh) => ({
            id: bh.id,
            dayOfWeek: bh.dayOfWeek,
            openTime: bh.openTime,
            closeTime: bh.closeTime,
            isClosed: bh.isClosed,
          })),
        }
      : null,
    courtPriceRules: courtPriceRules.map((pr) => ({
      id: pr.id,
      courtId: pr.courtId,
      dayOfWeek: pr.dayOfWeek !== null ? pr.dayOfWeek : 0,
      startTime: pr.startTime,
      endTime: pr.endTime,
      priceCents: pr.priceCents,
      createdAt: pr.createdAt.toISOString(),
      updatedAt: pr.updatedAt.toISOString(),
    })),
  };
}

export async function mockUpdateCourtDetail(
  courtId: string,
  clubId: string,
  updateData: Record<string, unknown>
) {
  const existingCourt = findCourtById(courtId);
  if (!existingCourt) {
    throw new Error("Court not found");
  }

  if (existingCourt.clubId !== clubId) {
    throw new Error("Court does not belong to this club");
  }

  // Update the court
  const updatedCourt = updateMockCourt(courtId, updateData);
  if (!updatedCourt) {
    throw new Error("Failed to update court");
  }

  // Return the full court detail
  return mockGetCourtDetailById(courtId);
}

export async function mockDeleteCourtDetail(courtId: string, clubId: string) {
  const existingCourt = findCourtById(courtId);
  if (!existingCourt) {
    throw new Error("Court not found");
  }

  if (existingCourt.clubId !== clubId) {
    throw new Error("Court does not belong to this club");
  }

  const success = deleteMockCourt(courtId);
  if (!success) {
    throw new Error("Failed to delete court");
  }

  return true;
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

// ============================================================================
// Mock Organization Activity API
// ============================================================================

export async function mockGetOrganizationActivity(params: {
  orgId: string;
  limit?: number;
  cursor?: string;
}) {
  const { orgId, limit = 20, cursor } = params;
  const auditLogs = getMockAuditLogs();
  const users = getMockUsers();

  // Filter logs for this organization
  let orgLogs = auditLogs.filter(
    (log) => log.targetType === "organization" && log.targetId === orgId
  );

  // Sort by creation date descending
  orgLogs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  // Handle cursor-based pagination
  if (cursor) {
    const cursorIndex = orgLogs.findIndex((log) => log.id === cursor);
    if (cursorIndex !== -1) {
      orgLogs = orgLogs.slice(cursorIndex + 1);
    }
  }

  // Take limit + 1 to determine if there are more results
  const hasMore = orgLogs.length > limit;
  const items = hasMore ? orgLogs.slice(0, limit) : orgLogs;
  const nextCursor = hasMore ? items[items.length - 1]?.id : null;

  // Get actor details
  const actorIds = [...new Set(items.map((log) => log.actorId))];
  const actors = users.filter((u) => actorIds.includes(u.id));
  const actorMap = new Map(actors.map((a) => [a.id, a]));

  // Format response
  const formattedLogs = items.map((log) => {
    const actor = actorMap.get(log.actorId);
    return {
      id: log.id,
      action: log.action,
      actor: actor
        ? {
            id: actor.id,
            name: actor.name,
            email: actor.email,
          }
        : {
            id: log.actorId,
            name: null,
            email: null,
          },
      detail: log.detail ? JSON.parse(log.detail) : null,
      createdAt: log.createdAt,
    };
  });

  return {
    items: formattedLogs,
    pagination: {
      limit,
      hasMore,
      nextCursor,
    },
  };
}

// ============================================================================
// Mock Organization Users API
// ============================================================================

export async function mockGetOrganizationUsers(params: {
  orgId: string;
  limit?: number;
}) {
  const { orgId, limit = 5 } = params;
  const clubs = getMockClubs();
  const courts = getMockCourts();
  const bookings = getMockBookings();
  const users = getMockUsers();
  const memberships = getMockMemberships();
  const clubMemberships = getMockClubMemberships();

  // Find all clubs in this org
  const orgClubs = clubs.filter((c) => c.organizationId === orgId);
  const clubIds = orgClubs.map((c) => c.id);

  // Find all courts in these clubs
  const orgCourts = courts.filter((c) => clubIds.includes(c.clubId));
  const courtIds = orgCourts.map((c) => c.id);

  // Find all bookings for these courts
  const orgBookings = bookings.filter((b) => courtIds.includes(b.courtId));

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

  // Get unique user IDs from bookings (excluding admins)
  const uniqueUserIds = [...new Set(orgBookings.map((b) => b.userId))].filter(
    (userId) => !adminIds.has(userId)
  );

  // Get user details and last booking
  const userPreviews = uniqueUserIds
    .map((userId) => {
      const user = users.find((u) => u.id === userId);
      if (!user) return null;

      const userBookings = orgBookings.filter((b) => b.userId === userId);
      const lastBooking = userBookings.sort(
        (a, b) => b.start.getTime() - a.start.getTime()
      )[0];

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const hasBookingToday = userBookings.some((b) => {
        const bookingDate = new Date(b.start);
        bookingDate.setHours(0, 0, 0, 0);
        return bookingDate.getTime() === today.getTime();
      });

      // Skip users without bookings (shouldn't happen but be defensive)
      if (!lastBooking) return null;

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        lastLoginAt: user.lastLoginAt ? user.lastLoginAt : null,
        lastBookingAt: lastBooking.start,
        hasBookingToday,
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      // Sort by last booking date descending
      return new Date(b!.lastBookingAt).getTime() - new Date(a!.lastBookingAt).getTime();
    });

  // Count users active today
  const activeToday = userPreviews.filter((u) => u!.hasBookingToday).length;

  // Take the first N users for preview
  const items = userPreviews.slice(0, limit);

  return {
    items: items.map((item) => ({
      id: item!.id,
      name: item!.name,
      email: item!.email,
      lastLoginAt: item!.lastLoginAt,
      lastBookingAt: item!.lastBookingAt,
    })),
    summary: {
      totalUsers: uniqueUserIds.length,
      activeToday,
    },
  };
}

// ============================================================================
// Mock Admin Notifications API
// ============================================================================

// Constants for notification API limits
const MAX_NOTIFICATIONS_LIMIT = 100;

export async function mockGetAdminNotifications(params: {
  unreadOnly?: boolean;
  limit?: number;
  offset?: number;
}) {
  const { unreadOnly = false, limit = 50, offset = 0 } = params;
  
  let notifications = getMockAdminNotifications();
  const users = getMockUsers();
  const coaches = getMockCoaches();

  // Filter by read status if needed
  if (unreadOnly) {
    notifications = notifications.filter((n) => !n.read);
  }

  // Sort by creation date descending
  notifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  // Apply pagination
  const totalCount = notifications.length;
  const unreadCount = getMockAdminNotifications().filter((n) => !n.read).length;
  const paginatedNotifications = notifications.slice(offset, offset + Math.min(limit, MAX_NOTIFICATIONS_LIMIT));

  // Enrich notifications with player and coach names
  const enrichedNotifications = paginatedNotifications.map((notification) => {
    const player = users.find((u) => u.id === notification.playerId);
    const coach = coaches.find((c) => c.id === notification.coachId);
    const coachUser = coach ? users.find((u) => u.id === coach.userId) : undefined;

    return {
      id: notification.id,
      type: notification.type,
      playerId: notification.playerId,
      playerName: player?.name || "Unknown Player",
      playerEmail: player?.email || null,
      coachId: notification.coachId,
      coachName: coachUser?.name || "Unknown Coach",
      trainingRequestId: notification.trainingRequestId,
      bookingId: notification.bookingId,
      sessionDate: notification.sessionDate?.toISOString().split("T")[0] || null,
      sessionTime: notification.sessionTime,
      courtInfo: notification.courtInfo,
      read: notification.read,
      createdAt: notification.createdAt.toISOString(),
    };
  });

  return {
    notifications: enrichedNotifications,
    totalCount,
    unreadCount,
    hasMore: offset + paginatedNotifications.length < totalCount,
  };
}

export async function mockGetAdminNotificationById(id: string) {
  const notification = findAdminNotificationById(id);
  if (!notification) return null;

  const users = getMockUsers();
  const coaches = getMockCoaches();
  const player = users.find((u) => u.id === notification.playerId);
  const coach = coaches.find((c) => c.id === notification.coachId);
  const coachUser = coach ? users.find((u) => u.id === coach.userId) : undefined;

  return {
    id: notification.id,
    type: notification.type,
    playerId: notification.playerId,
    playerName: player?.name || "Unknown Player",
    playerEmail: player?.email || null,
    coachId: notification.coachId,
    coachName: coachUser?.name || "Unknown Coach",
    trainingRequestId: notification.trainingRequestId,
    bookingId: notification.bookingId,
    sessionDate: notification.sessionDate?.toISOString().split("T")[0] || null,
    sessionTime: notification.sessionTime,
    courtInfo: notification.courtInfo,
    read: notification.read,
    createdAt: notification.createdAt.toISOString(),
  };
}

export async function mockUpdateAdminNotification(id: string, data: { read: boolean }) {
  const updated = updateMockNotification(id, { read: data.read });
  if (!updated) {
    throw new Error("Notification not found");
  }
  return mockGetAdminNotificationById(id);
}

export async function mockMarkAllNotificationsAsRead() {
  const count = markAllMockNotificationsAsRead();
  return {
    message: `Marked ${count} notification(s) as read`,
    count,
  };
}

// ============================================================================
// Mock Organization Management API (Enhanced)
// ============================================================================

import { simulateLatency, checkErrorSimulation } from "./mockConfig";
import type { Organization, Membership } from "@prisma/client";

/**
 * Helper to generate slug from name
 */
function generateSlug(name: string): string {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!slug) {
    return `org-${Date.now()}`;
  }

  return slug;
}

/**
 * Mock handler for creating an organization
 */
export async function mockCreateOrganizationHandler(data: {
  name: string;
  slug?: string;
  supportedSports?: string[];
  createdById: string;
}) {
  // Simulate latency
  await simulateLatency();

  // Check for error simulation
  const errorSim = checkErrorSimulation("create");
  if (errorSim) {
    if (errorSim.errorType === "duplicate_slug") {
      throw { status: 409, message: "An organization with this slug already exists" };
    } else if (errorSim.errorType === "validation_error") {
      throw { status: 400, message: "Organization name is required" };
    } else if (errorSim.errorType === "permission_error") {
      throw { status: 403, message: "You do not have permission to create organizations" };
    } else {
      throw { status: errorSim.statusCode, message: errorSim.message };
    }
  }

  // Validate name
  if (!data.name || typeof data.name !== "string" || data.name.trim().length === 0) {
    throw { status: 400, message: "Organization name is required" };
  }

  // Generate slug
  const finalSlug = data.slug?.trim() || generateSlug(data.name);

  // Check for duplicate slug
  const existingOrg = findOrganizationBySlug(finalSlug);
  if (existingOrg) {
    throw { status: 409, message: "An organization with this slug already exists" };
  }

  // Create organization
  const org = createMockOrganization({
    name: data.name.trim(),
    slug: finalSlug,
    createdById: data.createdById,
    supportedSports: data.supportedSports || ["PADEL"],
  });

  // Create audit log
  createMockAuditLog({
    actorId: data.createdById,
    action: "org.create",
    targetType: "organization",
    targetId: org.id,
    detail: {
      organizationName: org.name,
      slug: org.slug,
    },
  });

  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    contactEmail: org.contactEmail,
    contactPhone: org.contactPhone,
    website: org.website,
    address: org.address,
    archivedAt: org.archivedAt,
    createdAt: org.createdAt,
    updatedAt: org.updatedAt,
    createdBy: { id: org.createdById, name: null, email: "mock@example.com" },
    clubCount: 0,
    superAdmin: null,
    supportedSports: org.supportedSports,
  };
}

/**
 * Mock handler for updating an organization
 */
export async function mockUpdateOrganizationHandler(data: {
  orgId: string;
  name?: string;
  slug?: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
  website?: string | null;
  address?: string | null;
  metadata?: Record<string, unknown> | null;
  supportedSports?: string[];
  userId: string;
}) {
  // Simulate latency
  await simulateLatency();

  // Check for error simulation
  const errorSim = checkErrorSimulation("update");
  if (errorSim) {
    if (errorSim.errorType === "duplicate_slug") {
      throw { status: 409, message: "An organization with this slug already exists" };
    } else if (errorSim.errorType === "validation_error") {
      throw { status: 400, message: "Organization name cannot be empty" };
    } else if (errorSim.errorType === "permission_error") {
      throw { status: 403, message: "You do not have permission to update this organization" };
    } else if (errorSim.errorType === "not_found") {
      throw { status: 404, message: "Organization not found" };
    } else {
      throw { status: errorSim.statusCode, message: errorSim.message };
    }
  }

  const org = findOrganizationById(data.orgId);
  if (!org) {
    throw { status: 404, message: "Organization not found" };
  }

  // Check if archived
  if (org.archivedAt) {
    throw { status: 400, message: "Cannot update archived organization" };
  }

  // Validate name if provided
  if (data.name !== undefined) {
    if (typeof data.name !== "string" || data.name.trim().length === 0) {
      throw { status: 400, message: "Organization name cannot be empty" };
    }
  }

  // Determine final slug
  let finalSlug = org.slug;
  const trimmedName = data.name?.trim();
  if (data.slug !== undefined) {
    finalSlug = data.slug.trim() || generateSlug(trimmedName || org.name);
  } else if (trimmedName && trimmedName !== org.name) {
    finalSlug = generateSlug(trimmedName);
  }

  // Check slug conflict
  if (finalSlug !== org.slug) {
    const existingOrg = findOrganizationBySlug(finalSlug);
    if (existingOrg && existingOrg.id !== data.orgId) {
      throw { status: 409, message: "An organization with this slug already exists" };
    }
  }

  // Build update data
  const updateData: Partial<Organization> = {};
  if (data.name !== undefined) updateData.name = data.name.trim();
  if (data.slug !== undefined || data.name !== undefined) updateData.slug = finalSlug;
  if (data.contactEmail !== undefined) updateData.contactEmail = data.contactEmail?.trim() || null;
  if (data.contactPhone !== undefined) updateData.contactPhone = data.contactPhone?.trim() || null;
  if (data.website !== undefined) updateData.website = data.website?.trim() || null;
  if (data.address !== undefined) updateData.address = data.address?.trim() || null;
  if (data.metadata !== undefined) {
    updateData.metadata = data.metadata ? JSON.stringify(data.metadata) : null;
  }

  // Update organization
  const updatedOrg = updateMockOrganization(data.orgId, updateData);
  if (!updatedOrg) {
    throw { status: 500, message: "Failed to update organization" };
  }

  // Create audit log
  createMockAuditLog({
    actorId: data.userId,
    action: "org.update",
    targetType: "organization",
    targetId: data.orgId,
    detail: {
      changes: updateData,
      previousName: org.name,
      previousSlug: org.slug,
    },
  });

  const clubs = getMockClubs().filter((c) => c.organizationId === data.orgId);

  return {
    id: updatedOrg.id,
    name: updatedOrg.name,
    slug: updatedOrg.slug,
    contactEmail: updatedOrg.contactEmail,
    contactPhone: updatedOrg.contactPhone,
    website: updatedOrg.website,
    address: updatedOrg.address,
    metadata: updatedOrg.metadata ? JSON.parse(updatedOrg.metadata) : null,
    archivedAt: updatedOrg.archivedAt,
    createdAt: updatedOrg.createdAt,
    updatedAt: updatedOrg.updatedAt,
    createdBy: { id: updatedOrg.createdById, name: null, email: "mock@example.com" },
    clubCount: clubs.length,
  };
}

/**
 * Mock handler for archiving an organization
 */
export async function mockArchiveOrganizationHandler(data: {
  orgId: string;
  userId: string;
}) {
  // Simulate latency
  await simulateLatency();

  // Check for error simulation
  const errorSim = checkErrorSimulation("archive");
  if (errorSim) {
    if (errorSim.errorType === "not_found") {
      throw { status: 404, message: "Organization not found" };
    } else if (errorSim.errorType === "permission_error") {
      throw { status: 403, message: "You do not have permission to archive this organization" };
    } else if (errorSim.errorType === "conflict") {
      throw { status: 400, message: "Organization is already archived" };
    } else {
      throw { status: errorSim.statusCode, message: errorSim.message };
    }
  }

  const org = findOrganizationById(data.orgId);
  if (!org) {
    throw { status: 404, message: "Organization not found" };
  }

  if (org.archivedAt) {
    throw { status: 400, message: "Organization is already archived" };
  }

  const archivedOrg = archiveMockOrganization(data.orgId);
  if (!archivedOrg) {
    throw { status: 500, message: "Failed to archive organization" };
  }

  const clubs = getMockClubs().filter((c) => c.organizationId === data.orgId);

  // Create audit log
  createMockAuditLog({
    actorId: data.userId,
    action: "org.archive",
    targetType: "organization",
    targetId: data.orgId,
    detail: {
      organizationName: org.name,
      clubCount: clubs.length,
    },
  });

  return {
    success: true,
    message: "Organization archived successfully",
    organization: {
      id: archivedOrg.id,
      name: archivedOrg.name,
      slug: archivedOrg.slug,
      archivedAt: archivedOrg.archivedAt,
      createdAt: archivedOrg.createdAt,
      clubCount: clubs.length,
    },
  };
}

/**
 * Mock handler for restoring an archived organization
 */
export async function mockRestoreOrganizationHandler(data: {
  orgId: string;
  userId: string;
}) {
  // Simulate latency
  await simulateLatency();

  // Check for error simulation
  const errorSim = checkErrorSimulation("restore");
  if (errorSim) {
    if (errorSim.errorType === "not_found") {
      throw { status: 404, message: "Organization not found" };
    } else if (errorSim.errorType === "permission_error") {
      throw { status: 403, message: "You do not have permission to restore this organization" };
    } else if (errorSim.errorType === "conflict") {
      throw { status: 400, message: "Organization is not archived" };
    } else {
      throw { status: errorSim.statusCode, message: errorSim.message };
    }
  }

  const org = findOrganizationById(data.orgId);
  if (!org) {
    throw { status: 404, message: "Organization not found" };
  }

  if (!org.archivedAt) {
    throw { status: 400, message: "Organization is not archived" };
  }

  const restoredOrg = restoreMockOrganization(data.orgId);
  if (!restoredOrg) {
    throw { status: 500, message: "Failed to restore organization" };
  }

  const clubs = getMockClubs().filter((c) => c.organizationId === data.orgId);

  // Create audit log
  createMockAuditLog({
    actorId: data.userId,
    action: "org.restore",
    targetType: "organization",
    targetId: data.orgId,
    detail: {
      organizationName: org.name,
      clubCount: clubs.length,
    },
  });

  return {
    success: true,
    message: "Organization restored successfully",
    organization: {
      id: restoredOrg.id,
      name: restoredOrg.name,
      slug: restoredOrg.slug,
      archivedAt: restoredOrg.archivedAt,
      createdAt: restoredOrg.createdAt,
      clubCount: clubs.length,
    },
  };
}

/**
 * Mock handler for deleting an organization
 */
export async function mockDeleteOrganizationHandler(data: {
  orgId: string;
  userId: string;
  confirmOrgSlug?: string;
}) {
  // Simulate latency
  await simulateLatency();

  // Check for error simulation
  const errorSim = checkErrorSimulation("delete");
  if (errorSim) {
    if (errorSim.errorType === "not_found") {
      throw { status: 404, message: "Organization not found" };
    } else if (errorSim.errorType === "permission_error") {
      throw { status: 403, message: "You do not have permission to delete this organization" };
    } else if (errorSim.errorType === "conflict") {
      throw { status: 409, message: "Cannot delete organization with active clubs" };
    } else {
      throw { status: errorSim.statusCode, message: errorSim.message };
    }
  }

  const org = findOrganizationById(data.orgId);
  if (!org) {
    throw { status: 404, message: "Organization not found" };
  }

  const clubs = getMockClubs().filter((c) => c.organizationId === data.orgId);
  const clubIds = clubs.map((c) => c.id);
  const courts = getMockCourts().filter((c) => clubIds.includes(c.clubId));
  const courtIds = courts.map((c) => c.id);
  const bookings = getMockBookings().filter((b) => courtIds.includes(b.courtId));
  const activeBookings = bookings.filter(
    (b) =>
      ["pending", "paid", "reserved", "confirmed"].includes(b.status) &&
      b.start >= new Date()
  );

  // Check for active clubs - require confirmation if any exist
  if (clubs.length > 0) {
    if (!data.confirmOrgSlug || data.confirmOrgSlug !== org.slug) {
      throw {
        status: 409,
        message: "Cannot delete organization with active clubs",
        clubCount: clubs.length,
        requiresConfirmation: true,
        hint: "Provide confirmOrgSlug matching the organization slug to confirm deletion",
      };
    }
  }

  // Check for active bookings
  if (activeBookings.length > 0) {
    if (!data.confirmOrgSlug || data.confirmOrgSlug !== org.slug) {
      throw {
        status: 409,
        message: "Cannot delete organization with active bookings",
        activeBookingsCount: activeBookings.length,
        requiresConfirmation: true,
        hint: "Provide confirmOrgSlug matching the organization slug to confirm deletion",
      };
    }
  }

  // Delete organization
  const success = deleteMockOrganization(data.orgId);
  if (!success) {
    throw { status: 500, message: "Failed to delete organization" };
  }

  // Create audit log
  createMockAuditLog({
    actorId: data.userId,
    action: "org.delete",
    targetType: "organization",
    targetId: data.orgId,
    detail: {
      organizationName: org.name,
      organizationSlug: org.slug,
      clubCount: clubs.length,
    },
  });

  return {
    success: true,
    message: "Organization deleted successfully",
  };
}

/**
 * Mock handler for reassigning organization owner
 */
export async function mockReassignOwnerHandler(data: {
  orgId: string;
  userId?: string;
  email?: string;
  name?: string;
  actorId: string;
}) {
  // Simulate latency
  await simulateLatency();

  // Check for error simulation
  const errorSim = checkErrorSimulation("reassignOwner");
  if (errorSim) {
    if (errorSim.errorType === "not_found") {
      throw { status: 404, message: "Organization not found" };
    } else if (errorSim.errorType === "permission_error") {
      throw { status: 403, message: "You do not have permission to reassign organization owner" };
    } else if (errorSim.errorType === "validation_error") {
      throw { status: 400, message: "Either userId or email is required" };
    } else {
      throw { status: errorSim.statusCode, message: errorSim.message };
    }
  }

  const org = findOrganizationById(data.orgId);
  if (!org) {
    throw { status: 404, message: "Organization not found" };
  }

  if (org.archivedAt) {
    throw { status: 400, message: "Cannot modify archived organization" };
  }

  let targetUserId: string;
  let isNewUser = false;

  if (data.userId) {
    const user = findUserById(data.userId);
    if (!user) {
      throw { status: 404, message: "User not found" };
    }
    targetUserId = data.userId;
  } else if (data.email) {
    const emailLower = data.email.toLowerCase().trim();
    const users = getMockUsers();
    const existingUser = users.find((u) => u.email === emailLower);

    if (existingUser) {
      targetUserId = existingUser.id;
    } else {
      if (!data.name || typeof data.name !== "string" || data.name.trim().length === 0) {
        throw { status: 400, message: "Name is required for new user" };
      }

      const newUser = createMockUser({
        name: data.name.trim(),
        email: emailLower,
        isRoot: false,
      });
      targetUserId = newUser.id;
      isNewUser = true;
    }
  } else {
    throw { status: 400, message: "Either userId or email is required" };
  }

  // Find current primary owner
  const memberships = getMockMemberships();
  const currentOwner = memberships.find(
    (m) =>
      m.organizationId === data.orgId &&
      m.role === "ORGANIZATION_ADMIN" &&
      m.isPrimaryOwner
  );

  // Update current owner if exists
  if (currentOwner) {
    updateMockMembership(currentOwner.id, { isPrimaryOwner: false });
  }

  // Check if target user already has a membership
  const existingMembership = findMembershipByUserAndOrg(targetUserId, data.orgId);

  if (existingMembership) {
    updateMockMembership(existingMembership.id, {
      role: "ORGANIZATION_ADMIN",
      isPrimaryOwner: true,
    });
  } else {
    createMockMembership({
      userId: targetUserId,
      organizationId: data.orgId,
      role: "ORGANIZATION_ADMIN",
      isPrimaryOwner: true,
    });
  }

  const newOwner = findUserById(targetUserId);

  // Create audit log
  createMockAuditLog({
    actorId: data.actorId,
    action: "org.reassign_owner",
    targetType: "organization",
    targetId: data.orgId,
    detail: {
      previousOwnerId: currentOwner?.userId,
      previousOwnerEmail: currentOwner ? findUserById(currentOwner.userId)?.email : null,
      newOwnerId: targetUserId,
      newOwnerEmail: newOwner?.email,
      isNewUser,
    },
  });

  return {
    success: true,
    message: "Primary owner reassigned successfully",
    previousOwner: currentOwner
      ? {
          id: currentOwner.userId,
          name: findUserById(currentOwner.userId)?.name || null,
          email: findUserById(currentOwner.userId)?.email || "",
        }
      : null,
    newOwner: newOwner
      ? {
          id: newOwner.id,
          name: newOwner.name,
          email: newOwner.email,
        }
      : null,
    isNewUser,
  };
}
