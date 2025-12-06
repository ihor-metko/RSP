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
// Mock Courts API (Extended)
// ============================================================================

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

  // Transform to response format
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
      club: club ? { id: club.id, name: club.name } : null,
      organization: organization ? { id: organization.id, name: organization.name } : null,
      bookingCount: courtBookings.length,
    };
  });
}

export async function mockUpdateCourt(id: string, data: Partial<{
  name: string;
  surface: string;
  indoor: boolean;
  defaultPriceCents: number;
}>) {
  const court = findCourtById(id);
  if (!court) return null;

  // Update the court (in memory)
  Object.assign(court, data, { updatedAt: new Date() });
  return court;
}

export async function mockDeleteCourt(id: string): Promise<boolean> {
  const courts = getMockCourts();
  const index = courts.findIndex((c) => c.id === id);
  if (index === -1) return false;
  
  // Note: Direct array mutation is intentional for mock mode - data is ephemeral and resets on server restart
  courts.splice(index, 1);
  return true;
}

// ============================================================================
// Mock Booking Details API
// ============================================================================

export async function mockGetBookingById(
  id: string,
  adminType: string,
  managedIds: string[]
) {
  const booking = findBookingById(id);
  if (!booking) return null;

  const user = findUserById(booking.userId);
  const court = findCourtById(booking.courtId);
  if (!court || !user) return null;

  const club = findClubById(court.clubId);
  if (!club) return null;

  const organization = club.organizationId ? findOrganizationById(club.organizationId) : null;

  // Check permissions
  if (adminType === "organization_admin") {
    if (!club.organizationId || !managedIds.includes(club.organizationId)) {
      return null;
    }
  } else if (adminType === "club_admin") {
    if (!managedIds.includes(club.id)) {
      return null;
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
    clubId: club.id,
    clubName: club.name,
    organizationId: club.organizationId,
    organizationName: organization?.name ?? null,
    start: booking.start.toISOString(),
    end: booking.end.toISOString(),
    status: booking.status,
    price: booking.price,
    coachId: booking.coachId,
    coachName: null,
    paymentId: null,
    createdAt: booking.createdAt.toISOString(),
    payments: [],
  };
}

export async function mockUpdateBooking(
  id: string,
  data: { status?: string },
  adminType: string,
  managedIds: string[]
) {
  const booking = findBookingById(id);
  if (!booking) return null;

  const court = findCourtById(booking.courtId);
  if (!court) return null;

  const club = findClubById(court.clubId);
  if (!club) return null;

  // Check permissions
  if (adminType === "organization_admin") {
    if (!club.organizationId || !managedIds.includes(club.organizationId)) {
      return null;
    }
  } else if (adminType === "club_admin") {
    if (!managedIds.includes(club.id)) {
      return null;
    }
  }

  // Update status
  if (data.status) {
    booking.status = data.status;
  }

  // Return full booking details
  return mockGetBookingById(id, adminType, managedIds);
}

// ============================================================================
// Mock Club Details API
// ============================================================================

export async function mockGetClubByIdDetailed(
  id: string,
  adminType: string,
  managedIds: string[]
) {
  const club = findClubById(id);
  if (!club) return null;

  // Check permissions
  if (adminType === "organization_admin") {
    if (!club.organizationId || !managedIds.includes(club.organizationId)) {
      return null;
    }
  } else if (adminType === "club_admin") {
    if (!managedIds.includes(id)) {
      return null;
    }
  }

  const organization = club.organizationId ? findOrganizationById(club.organizationId) : null;
  const courts = getMockCourts().filter((c) => c.clubId === id);
  const clubMemberships = getMockClubMemberships().filter((m) => m.clubId === id);
  const users = getMockUsers();

  const admins = clubMemberships
    .filter((m) => m.role === "CLUB_ADMIN")
    .map((m) => {
      const user = users.find((u) => u.id === m.userId);
      return user ? { id: user.id, name: user.name, email: user.email } : null;
    })
    .filter(Boolean);

  return {
    ...club,
    organization: organization ? { id: organization.id, name: organization.name } : null,
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
    })),
    coaches: [],
    gallery: [],
    businessHours: [],
    admins,
  };
}

export async function mockUpdateClub(
  id: string,
  data: Partial<{
    name: string;
    location: string;
    shortDescription: string;
    longDescription: string;
    contactInfo: string;
    openingHours: string;
    isPublic: boolean;
  }>
) {
  const club = findClubById(id);
  if (!club) return null;

  Object.assign(club, data, { updatedAt: new Date() });
  return mockGetClubByIdDetailed(id, "root_admin", []);
}

export async function mockDeleteClub(id: string): Promise<boolean> {
  const clubs = getMockClubs();
  const index = clubs.findIndex((c) => c.id === id);
  if (index === -1) return false;
  
  // Note: Direct array mutation is intentional for mock mode - data is ephemeral and resets on server restart
  clubs.splice(index, 1);
  return true;
}

// ============================================================================
// Mock Organization Details API
// ============================================================================

export async function mockGetOrganizationByIdDetailed(id: string) {
  const org = findOrganizationById(id);
  if (!org) return null;

  const clubs = getMockClubs().filter((c) => c.organizationId === id);
  const memberships = getMockMemberships().filter((m) => m.organizationId === id);
  const users = getMockUsers();

  const superAdmins = memberships
    .filter((m) => m.role === "ORGANIZATION_ADMIN")
    .map((m) => {
      const user = users.find((u) => u.id === m.userId);
      return user
        ? {
            id: user.id,
            name: user.name,
            email: user.email,
            isPrimaryOwner: m.isPrimaryOwner,
          }
        : null;
    })
    .filter(Boolean)
    .sort((a, b) => {
      if (a!.isPrimaryOwner && !b!.isPrimaryOwner) return -1;
      if (!a!.isPrimaryOwner && b!.isPrimaryOwner) return 1;
      return 0;
    });

  const createdBy = users.find((u) => u.id === org.createdById);

  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    contactEmail: org.contactEmail,
    contactPhone: org.contactPhone,
    website: org.website,
    address: org.address,
    createdAt: org.createdAt,
    clubCount: clubs.length,
    createdBy: createdBy ? { id: createdBy.id, name: createdBy.name, email: createdBy.email } : null,
    superAdmins,
    superAdmin: superAdmins[0] || null,
  };
}

export async function mockUpdateOrganization(
  id: string,
  data: Partial<{ name: string; slug: string }>
) {
  const org = findOrganizationById(id);
  if (!org) return null;

  Object.assign(org, data, { updatedAt: new Date() });
  return mockGetOrganizationByIdDetailed(id);
}

export async function mockDeleteOrganization(id: string): Promise<boolean> {
  const orgs = getMockOrganizations();
  const index = orgs.findIndex((o) => o.id === id);
  if (index === -1) return false;
  
  // Note: Direct array mutation is intentional for mock mode - data is ephemeral and resets on server restart
  orgs.splice(index, 1);
  return true;
}

// ============================================================================
// Mock Users API (Extended)
// ============================================================================

export async function mockGetUsersForAdmin(query?: string) {
  let users = getMockUsers().filter((u) => !u.isRoot);
  
  if (query) {
    const lowerQuery = query.toLowerCase();
    users = users.filter(
      (u) =>
        u.name?.toLowerCase().includes(lowerQuery) ||
        u.email.toLowerCase().includes(lowerQuery)
    );
  }

  const memberships = getMockMemberships();
  const organizations = getMockOrganizations();

  return users.map((user) => {
    const userMemberships = memberships.filter(
      (m) => m.userId === user.id && m.role === "ORGANIZATION_ADMIN"
    );
    const org = userMemberships.length > 0
      ? organizations.find((o) => o.id === userMemberships[0].organizationId)
      : undefined;

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      isOrgAdmin: userMemberships.length > 0,
      organizationName: org?.name || null,
    };
  });
}

export async function mockGetUserByIdDetailed(id: string) {
  const user = findUserById(id);
  if (!user) return null;

  const bookings = getMockBookings().filter((b) => b.userId === id);

  return {
    ...user,
    bookings: bookings.map((b) => ({
      id: b.id,
      start: b.start,
      end: b.end,
      status: b.status,
      price: b.price,
    })),
  };
}

export async function mockUpdateUser(
  id: string,
  data: Partial<{ name: string; email: string; blocked: boolean }>
) {
  const user = findUserById(id);
  if (!user) return null;

  Object.assign(user, data, { updatedAt: new Date() });
  return user;
}

export async function mockBlockUser(id: string) {
  const user = findUserById(id);
  if (!user) return null;
  
  user.blocked = true;
  return { success: true };
}

export async function mockUnblockUser(id: string) {
  const user = findUserById(id);
  if (!user) return null;
  
  user.blocked = false;
  return { success: true };
}

// ============================================================================
// Mock Organization Admin Management
// ============================================================================

export async function mockAssignOrgAdmin(organizationId: string, userId: string) {
  const org = findOrganizationById(organizationId);
  const user = findUserById(userId);
  if (!org || !user) return null;

  const memberships = getMockMemberships();
  const existing = memberships.find(
    (m) => m.organizationId === organizationId && m.userId === userId
  );

  if (!existing) {
    memberships.push({
      id: `membership-${Date.now()}`,
      organizationId,
      userId,
      role: "ORGANIZATION_ADMIN",
      isPrimaryOwner: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  return { success: true };
}

export async function mockRemoveOrgAdmin(organizationId: string, userId: string) {
  const memberships = getMockMemberships();
  const index = memberships.findIndex(
    (m) => m.organizationId === organizationId && m.userId === userId
  );
  
  // Note: Direct array mutation is intentional for mock mode - data is ephemeral and resets on server restart
  if (index !== -1) {
    memberships.splice(index, 1);
  }

  return { success: true };
}

export async function mockSetOrgOwner(organizationId: string, userId: string) {
  const memberships = getMockMemberships();
  
  // Remove primary owner flag from all members of this org
  memberships
    .filter((m) => m.organizationId === organizationId)
    .forEach((m) => {
      m.isPrimaryOwner = false;
    });

  // Set new primary owner
  const targetMembership = memberships.find(
    (m) => m.organizationId === organizationId && m.userId === userId
  );
  
  if (targetMembership) {
    targetMembership.isPrimaryOwner = true;
  }

  return { success: true };
}
