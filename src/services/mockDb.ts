// TEMPORARY MOCK MODE — REMOVE WHEN DB IS FIXED
// This module provides mock data and CRUD helpers for development when the database is unavailable.
// See TODO_MOCK_CLEANUP.md for removal instructions.

import type { User, Organization, Club, Court, Booking, Membership, ClubMembership } from "@prisma/client";

// ============================================================================
// Mock Data State (mutable at runtime for testing flows)
// ============================================================================

let mockUsers: User[] = [];
let mockOrganizations: Organization[] = [];
let mockClubs: Club[] = [];
let mockCourts: Court[] = [];
let mockBookings: Booking[] = [];
let mockMemberships: Membership[] = [];
let mockClubMemberships: ClubMembership[] = [];

// ============================================================================
// Initialization (called once to seed data)
// ============================================================================

export function initializeMockData() {
  // Reset all data
  mockUsers = [];
  mockOrganizations = [];
  mockClubs = [];
  mockCourts = [];
  mockBookings = [];
  mockMemberships = [];
  mockClubMemberships = [];

  // Create mock users
  mockUsers = [
    {
      id: "user-1",
      name: "Admin Root",
      email: "root@example.com",
      emailVerified: new Date("2024-01-01"),
      image: null,
      password: "hashed_password",
      isRoot: true,
      blocked: false,
      lastLoginAt: new Date(),
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
    },
    {
      id: "user-2",
      name: "Org Admin",
      email: "orgadmin@example.com",
      emailVerified: new Date("2024-01-01"),
      image: null,
      password: "hashed_password",
      isRoot: false,
      blocked: false,
      lastLoginAt: new Date(),
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
    },
    {
      id: "user-3",
      name: "Club Admin",
      email: "clubadmin@example.com",
      emailVerified: new Date("2024-01-01"),
      image: null,
      password: "hashed_password",
      isRoot: false,
      blocked: false,
      lastLoginAt: new Date(),
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
    },
    {
      id: "user-4",
      name: "John Player",
      email: "player@example.com",
      emailVerified: new Date("2024-01-01"),
      image: null,
      password: "hashed_password",
      isRoot: false,
      blocked: false,
      lastLoginAt: new Date(),
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
    },
    {
      id: "user-5",
      name: "Jane Player",
      email: "player2@example.com",
      emailVerified: new Date("2024-01-01"),
      image: null,
      password: "hashed_password",
      isRoot: false,
      blocked: false,
      lastLoginAt: new Date(),
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
    },
  ];

  // Create mock organizations
  mockOrganizations = [
    {
      id: "org-1",
      name: "Padel Sports Inc",
      slug: "padel-sports-inc",
      contactEmail: "contact@padelsports.com",
      contactPhone: "+1234567890",
      website: "https://padelsports.com",
      address: "123 Sports Ave",
      metadata: JSON.stringify({ region: "North" }),
      createdById: "user-1",
      archivedAt: null,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
    },
    {
      id: "org-2",
      name: "Tennis & Padel Corp",
      slug: "tennis-padel-corp",
      contactEmail: "info@tennispadel.com",
      contactPhone: "+1987654321",
      website: "https://tennispadel.com",
      address: "456 Court St",
      metadata: JSON.stringify({ region: "South" }),
      createdById: "user-1",
      archivedAt: null,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
    },
    {
      id: "org-3",
      name: "Archived Organization",
      slug: "archived-org",
      contactEmail: "archived@example.com",
      contactPhone: null,
      website: null,
      address: null,
      metadata: null,
      createdById: "user-1",
      archivedAt: new Date("2024-06-01"),
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-06-01"),
    },
  ];

  // Create mock clubs
  mockClubs = [
    {
      id: "club-1",
      name: "Downtown Padel Club",
      slug: "downtown-padel-club",
      organizationId: "org-1",
      createdById: "user-2",
      shortDescription: "Premier downtown location",
      longDescription: "Full-service padel facility in the heart of downtown",
      location: "100 Main St, Downtown",
      city: "New York",
      country: "USA",
      latitude: 40.7128,
      longitude: -74.0060,
      phone: "+1111111111",
      email: "downtown@padelsports.com",
      website: "https://downtownpadel.com",
      socialLinks: JSON.stringify({ instagram: "@downtownpadel" }),
      contactInfo: "Call us at +1111111111",
      openingHours: "Mon-Sun: 6am-10pm",
      logo: null,
      heroImage: null,
      defaultCurrency: "USD",
      timezone: "America/New_York",
      isPublic: true,
      tags: JSON.stringify(["premium", "indoor", "outdoor"]),
      createdAt: new Date("2024-01-15"),
      updatedAt: new Date("2024-01-15"),
    },
    {
      id: "club-2",
      name: "Suburban Padel Center",
      slug: "suburban-padel-center",
      organizationId: "org-1",
      createdById: "user-2",
      shortDescription: "Family-friendly suburban facility",
      longDescription: "Great for families and beginners",
      location: "500 Suburb Rd",
      city: "Brooklyn",
      country: "USA",
      latitude: 40.6782,
      longitude: -73.9442,
      phone: "+1222222222",
      email: "suburban@padelsports.com",
      website: null,
      socialLinks: null,
      contactInfo: "Email us",
      openingHours: "Mon-Fri: 7am-9pm, Sat-Sun: 8am-8pm",
      logo: null,
      heroImage: null,
      defaultCurrency: "USD",
      timezone: "America/New_York",
      isPublic: true,
      tags: JSON.stringify(["family", "outdoor"]),
      createdAt: new Date("2024-02-01"),
      updatedAt: new Date("2024-02-01"),
    },
    {
      id: "club-3",
      name: "Elite Padel Academy",
      slug: "elite-padel-academy",
      organizationId: "org-2",
      createdById: "user-3",
      shortDescription: "Professional training facility",
      longDescription: "Advanced training and coaching",
      location: "200 Pro Ave",
      city: "Miami",
      country: "USA",
      latitude: 25.7617,
      longitude: -80.1918,
      phone: "+1333333333",
      email: "elite@tennispadel.com",
      website: "https://elitepadel.com",
      socialLinks: JSON.stringify({ facebook: "elitepadel" }),
      contactInfo: "Professional coaching available",
      openingHours: "Daily: 6am-11pm",
      logo: null,
      heroImage: null,
      defaultCurrency: "USD",
      timezone: "America/New_York",
      isPublic: true,
      tags: JSON.stringify(["professional", "coaching"]),
      createdAt: new Date("2024-03-01"),
      updatedAt: new Date("2024-03-01"),
    },
  ];

  // Create mock courts
  mockCourts = [
    {
      id: "court-1",
      clubId: "club-1",
      name: "Court 1",
      slug: "downtown-padel-club-court-1",
      type: "padel",
      surface: "artificial_grass",
      indoor: true,
      defaultPriceCents: 5000,
      createdAt: new Date("2024-01-15"),
      updatedAt: new Date("2024-01-15"),
    },
    {
      id: "court-2",
      clubId: "club-1",
      name: "Court 2",
      slug: "downtown-padel-club-court-2",
      type: "padel",
      surface: "artificial_grass",
      indoor: true,
      defaultPriceCents: 5000,
      createdAt: new Date("2024-01-15"),
      updatedAt: new Date("2024-01-15"),
    },
    {
      id: "court-3",
      clubId: "club-1",
      name: "Court 3",
      slug: "downtown-padel-club-court-3",
      type: "padel",
      surface: "synthetic",
      indoor: false,
      defaultPriceCents: 4000,
      createdAt: new Date("2024-01-15"),
      updatedAt: new Date("2024-01-15"),
    },
    {
      id: "court-4",
      clubId: "club-2",
      name: "Court A",
      slug: "suburban-padel-center-court-a",
      type: "padel",
      surface: "artificial_grass",
      indoor: false,
      defaultPriceCents: 3500,
      createdAt: new Date("2024-02-01"),
      updatedAt: new Date("2024-02-01"),
    },
    {
      id: "court-5",
      clubId: "club-2",
      name: "Court B",
      slug: "suburban-padel-center-court-b",
      type: "padel",
      surface: "artificial_grass",
      indoor: false,
      defaultPriceCents: 3500,
      createdAt: new Date("2024-02-01"),
      updatedAt: new Date("2024-02-01"),
    },
    {
      id: "court-6",
      clubId: "club-3",
      name: "Pro Court 1",
      slug: "elite-padel-academy-pro-court-1",
      type: "padel",
      surface: "professional",
      indoor: true,
      defaultPriceCents: 8000,
      createdAt: new Date("2024-03-01"),
      updatedAt: new Date("2024-03-01"),
    },
    {
      id: "court-7",
      clubId: "club-3",
      name: "Pro Court 2",
      slug: "elite-padel-academy-pro-court-2",
      type: "padel",
      surface: "professional",
      indoor: true,
      defaultPriceCents: 8000,
      createdAt: new Date("2024-03-01"),
      updatedAt: new Date("2024-03-01"),
    },
  ];

  // Create mock bookings (mix of past, current, and future)
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date(now);
  nextWeek.setDate(nextWeek.getDate() + 7);

  mockBookings = [
    {
      id: "booking-1",
      courtId: "court-1",
      userId: "user-4",
      coachId: null,
      start: yesterday,
      end: new Date(yesterday.getTime() + 60 * 60 * 1000),
      price: 5000,
      status: "paid",
      paymentId: "payment-1",
      createdAt: new Date(yesterday.getTime() - 24 * 60 * 60 * 1000),
    },
    {
      id: "booking-2",
      courtId: "court-2",
      userId: "user-5",
      coachId: null,
      start: tomorrow,
      end: new Date(tomorrow.getTime() + 90 * 60 * 1000),
      price: 5000,
      status: "pending",
      paymentId: null,
      createdAt: now,
    },
    {
      id: "booking-3",
      courtId: "court-3",
      userId: "user-4",
      coachId: null,
      start: nextWeek,
      end: new Date(nextWeek.getTime() + 60 * 60 * 1000),
      price: 4000,
      status: "paid",
      paymentId: "payment-2",
      createdAt: now,
    },
    {
      id: "booking-4",
      courtId: "court-4",
      userId: "user-5",
      coachId: null,
      start: new Date(nextWeek.getTime() + 2 * 60 * 60 * 1000),
      end: new Date(nextWeek.getTime() + 3 * 60 * 60 * 1000),
      price: 3500,
      status: "paid",
      paymentId: "payment-3",
      createdAt: now,
    },
    {
      id: "booking-5",
      courtId: "court-6",
      userId: "user-4",
      coachId: null,
      start: yesterday,
      end: new Date(yesterday.getTime() + 60 * 60 * 1000),
      price: 8000,
      status: "cancelled",
      paymentId: null,
      createdAt: new Date(yesterday.getTime() - 48 * 60 * 60 * 1000),
    },
  ];

  // Create mock memberships
  mockMemberships = [
    {
      id: "membership-1",
      userId: "user-2",
      organizationId: "org-1",
      role: "ORGANIZATION_ADMIN" as const,
      isPrimaryOwner: true,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
    },
    {
      id: "membership-2",
      userId: "user-3",
      organizationId: "org-2",
      role: "ORGANIZATION_ADMIN" as const,
      isPrimaryOwner: false,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
    },
  ];

  // Create mock club memberships
  mockClubMemberships = [
    {
      id: "club-membership-1",
      userId: "user-3",
      clubId: "club-3",
      role: "CLUB_ADMIN" as const,
      createdAt: new Date("2024-03-01"),
      updatedAt: new Date("2024-03-01"),
    },
  ];
}

// Initialize data on module load
initializeMockData();

// ============================================================================
// Getters (read-only access)
// ============================================================================

export function getMockUsers() {
  return [...mockUsers];
}

export function getMockOrganizations() {
  return [...mockOrganizations];
}

export function getMockClubs() {
  return [...mockClubs];
}

export function getMockCourts() {
  return [...mockCourts];
}

export function getMockBookings() {
  return [...mockBookings];
}

export function getMockMemberships() {
  return [...mockMemberships];
}

export function getMockClubMemberships() {
  return [...mockClubMemberships];
}

// ============================================================================
// CRUD Helpers
// ============================================================================

export function findUserById(id: string): User | undefined {
  return mockUsers.find((u) => u.id === id);
}

export function findUserByEmail(email: string): User | undefined {
  return mockUsers.find((u) => u.email === email);
}

export function findOrganizationById(id: string): Organization | undefined {
  return mockOrganizations.find((o) => o.id === id);
}

export function findClubById(id: string): Club | undefined {
  return mockClubs.find((c) => c.id === id);
}

export function findCourtById(id: string): Court | undefined {
  return mockCourts.find((c) => c.id === id);
}

export function findBookingById(id: string): Booking | undefined {
  return mockBookings.find((b) => b.id === id);
}

// Helper to generate unique IDs
function generateMockId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

export function createMockBooking(data: {
  courtId: string;
  userId: string;
  start: Date;
  end: Date;
  price: number;
  status: string;
  coachId?: string | null;
}): Booking {
  const booking: Booking = {
    id: generateMockId("booking"),
    courtId: data.courtId,
    userId: data.userId,
    coachId: data.coachId || null,
    start: data.start,
    end: data.end,
    price: data.price,
    status: data.status,
    paymentId: data.status === "paid" ? `payment-${Date.now()}` : null,
    createdAt: new Date(),
  };
  mockBookings.push(booking);
  return booking;
}

export function cancelMockBooking(id: string): boolean {
  const booking = mockBookings.find((b) => b.id === id);
  if (!booking) return false;
  booking.status = "cancelled";
  return true;
}

export function deleteMockBooking(id: string): boolean {
  const index = mockBookings.findIndex((b) => b.id === id);
  if (index === -1) return false;
  mockBookings.splice(index, 1);
  return true;
}

export function createMockUser(data: {
  name: string;
  email: string;
  isRoot?: boolean;
}): User {
  const user: User = {
    id: generateMockId("user"),
    name: data.name,
    email: data.email,
    emailVerified: new Date(),
    image: null,
    password: "hashed_password",
    isRoot: data.isRoot || false,
    blocked: false,
    lastLoginAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  mockUsers.push(user);
  return user;
}

export function createMockClub(data: {
  name: string;
  location: string;
  organizationId?: string | null;
  createdById: string;
}): Club {
  const club: Club = {
    id: generateMockId("club"),
    name: data.name,
    slug: data.name.toLowerCase().replace(/\s+/g, "-"),
    organizationId: data.organizationId || null,
    createdById: data.createdById,
    shortDescription: null,
    longDescription: null,
    location: data.location,
    city: null,
    country: null,
    latitude: null,
    longitude: null,
    phone: null,
    email: null,
    website: null,
    socialLinks: null,
    contactInfo: null,
    openingHours: null,
    logo: null,
    heroImage: null,
    defaultCurrency: "USD",
    timezone: "UTC",
    isPublic: true,
    tags: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  mockClubs.push(club);
  return club;
}

export function createMockOrganization(data: {
  name: string;
  createdById: string;
}): Organization {
  const org: Organization = {
    id: generateMockId("org"),
    name: data.name,
    slug: data.name.toLowerCase().replace(/\s+/g, "-"),
    contactEmail: null,
    contactPhone: null,
    website: null,
    address: null,
    metadata: null,
    createdById: data.createdById,
    archivedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  mockOrganizations.push(org);
  return org;
}

// ============================================================================
// Helper to check if mock mode is enabled
// ============================================================================

export function isMockMode(): boolean {
  return process.env.USE_MOCK_DATA === "true";
}
