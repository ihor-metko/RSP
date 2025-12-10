// TEMPORARY MOCK MODE — REMOVE WHEN DB IS FIXED
// This module provides mock data and CRUD helpers for development when the database is unavailable.
// See TODO_MOCK_CLEANUP.md for removal instructions.

import type { User, Organization, Club, Court, Booking, Membership, ClubMembership, ClubBusinessHours, CourtPriceRule, Coach, ClubGallery, AuditLog, AdminNotification } from "@prisma/client";

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
let mockBusinessHours: ClubBusinessHours[] = [];
let mockCourtPriceRules: CourtPriceRule[] = [];
let mockCoaches: Coach[] = [];
let mockGalleryImages: ClubGallery[] = [];
let mockAuditLogs: AuditLog[] = [];
let mockAdminNotifications: AdminNotification[] = [];

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
  mockBusinessHours = [];
  mockCourtPriceRules = [];
  mockCoaches = [];
  mockGalleryImages = [];
  mockAuditLogs = [];
  mockAdminNotifications = [];

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
    {
      id: "user-coach-1",
      name: "Coach Mike Rodriguez",
      email: "mike.coach@example.com",
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
      id: "user-coach-2",
      name: "Coach Sarah Johnson",
      email: "sarah.coach@example.com",
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
      id: "user-coach-3",
      name: "Coach David Martinez",
      email: "david.coach@example.com",
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
      id: "64f3b281-c4cf-4fba-82a5-f4d20b0c7c29",
      name: "Padel Sports Inc",
      slug: "padel-sports-inc",
      contactEmail: "contact@padelsports.com",
      contactPhone: "+1234567890",
      website: "https://padelsports.com",
      address: "123 Sports Ave",
      metadata: JSON.stringify({ region: "North" }),
      supportedSports: ["PADEL"],
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
      supportedSports: ["TENNIS", "PADEL"],
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
      supportedSports: ["PADEL"],
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
      status: "active",
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
      status: "active",
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
      status: "active",
      tags: JSON.stringify(["professional", "coaching"]),
      createdAt: new Date("2024-03-01"),
      updatedAt: new Date("2024-03-01"),
    },
    {
      id: "club-4",
      name: "Queens Sports Complex",
      slug: "queens-sports-complex",
      organizationId: "org-1",
      createdById: "user-2",
      shortDescription: "Modern multi-sport facility",
      longDescription: "State-of-the-art facility with multiple courts and amenities",
      location: "750 Queens Blvd",
      city: "Queens",
      country: "USA",
      latitude: 40.7282,
      longitude: -73.8514,
      phone: "+1444444444",
      email: "info@queenssports.com",
      website: "https://queenssports.com",
      socialLinks: JSON.stringify({ twitter: "@queenssports", instagram: "@queenssports" }),
      contactInfo: "Book online or call us",
      openingHours: "Mon-Sun: 5am-11pm",
      logo: null,
      heroImage: null,
      defaultCurrency: "USD",
      timezone: "America/New_York",
      isPublic: true,
      status: "draft",
      tags: JSON.stringify(["modern", "multi-sport", "indoor"]),
      createdAt: new Date("2024-04-01"),
      updatedAt: new Date("2024-04-01"),
    },
    {
      id: "club-5",
      name: "Los Angeles Padel Club",
      slug: "los-angeles-padel-club",
      organizationId: "org-2",
      createdById: "user-3",
      shortDescription: "West Coast premier padel destination",
      longDescription: "Beautiful outdoor courts with stunning views",
      location: "888 Sunset Blvd",
      city: "Los Angeles",
      country: "USA",
      latitude: 34.0522,
      longitude: -118.2437,
      phone: "+1555555555",
      email: "info@lapadel.com",
      website: "https://lapadel.com",
      socialLinks: JSON.stringify({ instagram: "@lapadel" }),
      contactInfo: "Visit us for a tour",
      openingHours: "Daily: 7am-9pm",
      logo: null,
      heroImage: null,
      defaultCurrency: "USD",
      timezone: "America/Los_Angeles",
      isPublic: true,
      status: "active",
      tags: JSON.stringify(["outdoor", "scenic", "premium"]),
      createdAt: new Date("2024-05-01"),
      updatedAt: new Date("2024-05-01"),
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
      isActive: true,
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
      isActive: true,
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
      isActive: true,
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
      isActive: true,
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
      isActive: true,
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
      isActive: true,
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
      isActive: true,
      defaultPriceCents: 8000,
      createdAt: new Date("2024-03-01"),
      updatedAt: new Date("2024-03-01"),
    },
    {
      id: "court-8",
      clubId: "club-4",
      name: "Court Alpha",
      slug: "queens-sports-complex-court-alpha",
      type: "padel",
      surface: "artificial_grass",
      indoor: true,
      isActive: true,
      defaultPriceCents: 6000,
      createdAt: new Date("2024-04-01"),
      updatedAt: new Date("2024-04-01"),
    },
    {
      id: "court-9",
      clubId: "club-4",
      name: "Court Beta",
      slug: "queens-sports-complex-court-beta",
      type: "padel",
      surface: "artificial_grass",
      indoor: true,
      isActive: true,
      defaultPriceCents: 6000,
      createdAt: new Date("2024-04-01"),
      updatedAt: new Date("2024-04-01"),
    },
    {
      id: "court-10",
      clubId: "club-5",
      name: "Sunset Court 1",
      slug: "los-angeles-padel-club-sunset-court-1",
      type: "padel",
      surface: "artificial_grass",
      indoor: false,
      isActive: true,
      defaultPriceCents: 7000,
      createdAt: new Date("2024-05-01"),
      updatedAt: new Date("2024-05-01"),
    },
    {
      id: "court-11",
      clubId: "club-5",
      name: "Sunset Court 2",
      slug: "los-angeles-padel-club-sunset-court-2",
      type: "padel",
      surface: "artificial_grass",
      indoor: false,
      isActive: true,
      defaultPriceCents: 7000,
      createdAt: new Date("2024-05-01"),
      updatedAt: new Date("2024-05-01"),
    },
    {
      id: "court-12",
      clubId: "club-5",
      name: "Sunset Court 3",
      slug: "los-angeles-padel-club-sunset-court-3",
      type: "padel",
      surface: "professional",
      indoor: false,
      isActive: true,
      defaultPriceCents: 9000,
      createdAt: new Date("2024-05-01"),
      updatedAt: new Date("2024-05-01"),
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

  // Create mock business hours for clubs
  // Standard hours: Mon-Fri 6am-10pm, Sat-Sun 8am-8pm
  const standardBusinessHours = [
    { dayOfWeek: 0, openTime: "08:00", closeTime: "20:00", isClosed: false }, // Sunday
    { dayOfWeek: 1, openTime: "06:00", closeTime: "22:00", isClosed: false }, // Monday
    { dayOfWeek: 2, openTime: "06:00", closeTime: "22:00", isClosed: false }, // Tuesday
    { dayOfWeek: 3, openTime: "06:00", closeTime: "22:00", isClosed: false }, // Wednesday
    { dayOfWeek: 4, openTime: "06:00", closeTime: "22:00", isClosed: false }, // Thursday
    { dayOfWeek: 5, openTime: "06:00", closeTime: "22:00", isClosed: false }, // Friday
    { dayOfWeek: 6, openTime: "08:00", closeTime: "20:00", isClosed: false }, // Saturday
  ];

  mockBusinessHours = [];
  for (const club of mockClubs) {
    for (const hours of standardBusinessHours) {
      mockBusinessHours.push({
        id: `bh-${club.id}-${hours.dayOfWeek}`,
        clubId: club.id,
        dayOfWeek: hours.dayOfWeek,
        openTime: hours.openTime,
        closeTime: hours.closeTime,
        isClosed: hours.isClosed,
        createdAt: new Date("2024-01-15"),
        updatedAt: new Date("2024-01-15"),
      });
    }
  }

  // Create mock court price rules
  // Peak hours: weekdays 5pm-9pm and weekends 9am-6pm charge 25% more
  mockCourtPriceRules = [];
  for (const court of mockCourts) {
    const peakPriceCents = Math.floor(court.defaultPriceCents * 1.25);

    // Weekday peak hours (5pm-9pm)
    for (let day = 1; day <= 5; day++) {
      mockCourtPriceRules.push({
        id: `pr-${court.id}-wd-peak-${day}`,
        courtId: court.id,
        dayOfWeek: day,
        date: null,
        startTime: "17:00",
        endTime: "21:00",
        priceCents: peakPriceCents,
        createdAt: new Date("2024-01-15"),
        updatedAt: new Date("2024-01-15"),
      });
    }

    // Weekend peak hours (9am-6pm)
    for (const day of [0, 6]) {
      mockCourtPriceRules.push({
        id: `pr-${court.id}-we-peak-${day}`,
        courtId: court.id,
        dayOfWeek: day,
        date: null,
        startTime: "09:00",
        endTime: "18:00",
        priceCents: peakPriceCents,
        createdAt: new Date("2024-01-15"),
        updatedAt: new Date("2024-01-15"),
      });
    }
  }

  // Create mock coaches
  mockCoaches = [
    {
      id: "coach-1",
      userId: "user-coach-1",
      clubId: "club-1",
      bio: "Professional padel coach with 10+ years of experience. Specialized in beginner to intermediate training.",
      phone: "+1555111111",
      createdAt: new Date("2024-01-15"),
    },
    {
      id: "coach-2",
      userId: "user-coach-2",
      clubId: "club-1",
      bio: "Former professional player. Expert in advanced techniques and competitive play.",
      phone: "+1555222222",
      createdAt: new Date("2024-01-20"),
    },
    {
      id: "coach-3",
      userId: "user-coach-3",
      clubId: "club-3",
      bio: "Elite padel academy head coach. International tournament experience.",
      phone: "+1555333333",
      createdAt: new Date("2024-03-01"),
    },
  ];

  // Create mock gallery images
  mockGalleryImages = [
    {
      id: "gallery-1",
      clubId: "club-1",
      imageUrl: "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800",
      imageKey: "club-1/gallery-1.jpg",
      altText: "Indoor court with professional lighting",
      sortOrder: 0,
      createdAt: new Date("2024-01-15"),
    },
    {
      id: "gallery-2",
      clubId: "club-1",
      imageUrl: "https://images.unsplash.com/photo-1622163642998-1ea32b0bbc67?w=800",
      imageKey: "club-1/gallery-2.jpg",
      altText: "Modern facility lobby",
      sortOrder: 1,
      createdAt: new Date("2024-01-15"),
    },
    {
      id: "gallery-3",
      clubId: "club-1",
      imageUrl: "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=800",
      imageKey: "club-1/gallery-3.jpg",
      altText: "Outdoor courts with city view",
      sortOrder: 2,
      createdAt: new Date("2024-01-15"),
    },
    {
      id: "gallery-4",
      clubId: "club-2",
      imageUrl: "https://images.unsplash.com/photo-1609710228159-0fa9bd7c0827?w=800",
      imageKey: "club-2/gallery-1.jpg",
      altText: "Family-friendly outdoor courts",
      sortOrder: 0,
      createdAt: new Date("2024-02-01"),
    },
    {
      id: "gallery-5",
      clubId: "club-2",
      imageUrl: "https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=800",
      imageKey: "club-2/gallery-2.jpg",
      altText: "Kids training session",
      sortOrder: 1,
      createdAt: new Date("2024-02-01"),
    },
    {
      id: "gallery-6",
      clubId: "club-3",
      imageUrl: "https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff?w=800",
      imageKey: "club-3/gallery-1.jpg",
      altText: "Professional training facility",
      sortOrder: 0,
      createdAt: new Date("2024-03-01"),
    },
    {
      id: "gallery-7",
      clubId: "club-3",
      imageUrl: "https://images.unsplash.com/photo-1600965962102-9d260a71890d?w=800",
      imageKey: "club-3/gallery-2.jpg",
      altText: "Championship-level courts",
      sortOrder: 1,
      createdAt: new Date("2024-03-01"),
    },
  ];

  // Create mock audit logs for organization activity
  const auditNow = new Date();
  const oneDayAgo = new Date(auditNow);
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);
  const twoDaysAgo = new Date(auditNow);
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  const threeDaysAgo = new Date(auditNow);
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  const fiveDaysAgo = new Date(auditNow);
  fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
  const sevenDaysAgo = new Date(auditNow);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  mockAuditLogs = [
    // org-1 (Padel Sports Inc) activities
    {
      id: "audit-1",
      actorId: "user-1",
      action: "org.create",
      targetType: "organization",
      targetId: "org-1",
      detail: JSON.stringify({ organizationName: "Padel Sports Inc" }),
      createdAt: new Date("2024-01-01"),
    },
    {
      id: "audit-2",
      actorId: "user-2",
      action: "org.update",
      targetType: "organization",
      targetId: "org-1",
      detail: JSON.stringify({ changes: { contactEmail: "contact@padelsports.com" } }),
      createdAt: sevenDaysAgo,
    },
    {
      id: "audit-3",
      actorId: "user-1",
      action: "org.assign_admin",
      targetType: "organization",
      targetId: "org-1",
      detail: JSON.stringify({ adminEmail: "orgadmin@example.com", adminName: "Org Admin" }),
      createdAt: fiveDaysAgo,
    },
    {
      id: "audit-4",
      actorId: "user-2",
      action: "org.update",
      targetType: "organization",
      targetId: "org-1",
      detail: JSON.stringify({ changes: { website: "https://padelsports.com" } }),
      createdAt: threeDaysAgo,
    },
    {
      id: "audit-5",
      actorId: "user-2",
      action: "org.update",
      targetType: "organization",
      targetId: "org-1",
      detail: JSON.stringify({ changes: { address: "123 Sports Ave" } }),
      createdAt: twoDaysAgo,
    },
    // org-2 (Tennis & Padel Corp) activities
    {
      id: "audit-6",
      actorId: "user-1",
      action: "org.create",
      targetType: "organization",
      targetId: "org-2",
      detail: JSON.stringify({ organizationName: "Tennis & Padel Corp" }),
      createdAt: new Date("2024-01-01"),
    },
    {
      id: "audit-7",
      actorId: "user-3",
      action: "org.update",
      targetType: "organization",
      targetId: "org-2",
      detail: JSON.stringify({ changes: { contactEmail: "info@tennispadel.com" } }),
      createdAt: fiveDaysAgo,
    },
    {
      id: "audit-8",
      actorId: "user-1",
      action: "org.assign_admin",
      targetType: "organization",
      targetId: "org-2",
      detail: JSON.stringify({ adminEmail: "clubadmin@example.com", adminName: "Club Admin" }),
      createdAt: threeDaysAgo,
    },
    // org-3 (Archived Organization) activities
    {
      id: "audit-9",
      actorId: "user-1",
      action: "org.create",
      targetType: "organization",
      targetId: "org-3",
      detail: JSON.stringify({ organizationName: "Archived Organization" }),
      createdAt: new Date("2024-01-01"),
    },
    {
      id: "audit-10",
      actorId: "user-1",
      action: "org.archive",
      targetType: "organization",
      targetId: "org-3",
      detail: JSON.stringify({ reason: "No longer active" }),
      createdAt: new Date("2024-06-01"),
    },
  ];

  // Create mock admin notifications
  const notifNow = new Date();
  const oneHourAgo = new Date(notifNow);
  oneHourAgo.setHours(oneHourAgo.getHours() - 1);
  const twoHoursAgo = new Date(notifNow);
  twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);
  const fiveHoursAgo = new Date(notifNow);
  fiveHoursAgo.setHours(fiveHoursAgo.getHours() - 5);
  const oneDayAgoNotif = new Date(notifNow);
  oneDayAgoNotif.setDate(oneDayAgoNotif.getDate() - 1);
  const twoDaysAgoNotif = new Date(notifNow);
  twoDaysAgoNotif.setDate(twoDaysAgoNotif.getDate() - 2);

  const tomorrowSession = new Date(notifNow);
  tomorrowSession.setDate(tomorrowSession.getDate() + 1);
  tomorrowSession.setHours(10, 0, 0, 0);

  const nextWeekSession = new Date(notifNow);
  nextWeekSession.setDate(nextWeekSession.getDate() + 7);
  nextWeekSession.setHours(14, 30, 0, 0);

  mockAdminNotifications = [
    {
      id: "notif-1",
      type: "REQUESTED",
      playerId: "user-4",
      coachId: "coach-1",
      trainingRequestId: "tr-1",
      bookingId: null,
      sessionDate: tomorrowSession,
      sessionTime: "10:00",
      courtInfo: "Court 1 - Downtown Padel Club",
      read: false,
      createdAt: oneHourAgo,
    },
    {
      id: "notif-2",
      type: "ACCEPTED",
      playerId: "user-5",
      coachId: "coach-2",
      trainingRequestId: "tr-2",
      bookingId: "booking-mock-1",
      sessionDate: nextWeekSession,
      sessionTime: "14:30",
      courtInfo: "Court 2 - Downtown Padel Club",
      read: false,
      createdAt: twoHoursAgo,
    },
    {
      id: "notif-3",
      type: "DECLINED",
      playerId: "user-4",
      coachId: "coach-3",
      trainingRequestId: "tr-3",
      bookingId: null,
      sessionDate: null,
      sessionTime: null,
      courtInfo: null,
      read: true,
      createdAt: fiveHoursAgo,
    },
    {
      id: "notif-4",
      type: "REQUESTED",
      playerId: "user-5",
      coachId: "coach-1",
      trainingRequestId: "tr-4",
      bookingId: null,
      sessionDate: tomorrowSession,
      sessionTime: "15:00",
      courtInfo: "Court 3 - Downtown Padel Club",
      read: true,
      createdAt: oneDayAgoNotif,
    },
    {
      id: "notif-5",
      type: "CANCELED",
      playerId: "user-4",
      coachId: "coach-2",
      trainingRequestId: "tr-5",
      bookingId: "booking-mock-2",
      sessionDate: null,
      sessionTime: null,
      courtInfo: "Court A - Suburban Padel Center",
      read: true,
      createdAt: twoDaysAgoNotif,
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

export function getMockBusinessHours() {
  return [...mockBusinessHours];
}

export function getMockCourtPriceRules() {
  return [...mockCourtPriceRules];
}

export function getMockCoaches() {
  return [...mockCoaches];
}

export function getMockGalleryImages() {
  return [...mockGalleryImages];
}

export function getMockAuditLogs() {
  return [...mockAuditLogs];
}

export function getMockAdminNotifications() {
  return [...mockAdminNotifications];
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
    status: "active",
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
  slug?: string;
  supportedSports?: string[];
}): Organization {
  const org: Organization = {
    id: generateMockId("org"),
    name: data.name,
    slug: data.slug || data.name.toLowerCase().replace(/\s+/g, "-"),
    contactEmail: null,
    contactPhone: null,
    website: null,
    address: null,
    metadata: null,
    supportedSports: data.supportedSports || ["PADEL"],
    createdById: data.createdById,
    archivedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  mockOrganizations.push(org);
  return org;
}

export function updateMockOrganization(id: string, data: Partial<Organization>): Organization | null {
  const index = mockOrganizations.findIndex((o) => o.id === id);
  if (index === -1) return null;

  mockOrganizations[index] = {
    ...mockOrganizations[index],
    ...data,
    updatedAt: new Date(),
  };
  return mockOrganizations[index];
}

export function archiveMockOrganization(id: string): Organization | null {
  const index = mockOrganizations.findIndex((o) => o.id === id);
  if (index === -1) return null;

  mockOrganizations[index] = {
    ...mockOrganizations[index],
    archivedAt: new Date(),
    updatedAt: new Date(),
  };
  return mockOrganizations[index];
}

export function restoreMockOrganization(id: string): Organization | null {
  const index = mockOrganizations.findIndex((o) => o.id === id);
  if (index === -1) return null;

  mockOrganizations[index] = {
    ...mockOrganizations[index],
    archivedAt: null,
    updatedAt: new Date(),
  };
  return mockOrganizations[index];
}

export function deleteMockOrganization(id: string): boolean {
  const index = mockOrganizations.findIndex((o) => o.id === id);
  if (index === -1) return false;

  // Remove organization
  mockOrganizations.splice(index, 1);

  // Remove associated memberships
  const membershipIndicesToRemove: number[] = [];
  mockMemberships.forEach((m, i) => {
    if (m.organizationId === id) membershipIndicesToRemove.push(i);
  });
  membershipIndicesToRemove.reverse().forEach((i) => mockMemberships.splice(i, 1));

  return true;
}

export function findMembershipByUserAndOrg(userId: string, organizationId: string): Membership | undefined {
  return mockMemberships.find((m) => m.userId === userId && m.organizationId === organizationId);
}

export function findOrganizationBySlug(slug: string): Organization | undefined {
  return mockOrganizations.find((o) => o.slug === slug);
}

export function createMockMembership(data: {
  userId: string;
  organizationId: string;
  role: "ORGANIZATION_ADMIN" | "CLUB_ADMIN";
  isPrimaryOwner?: boolean;
}): Membership {
  const membership: Membership = {
    id: generateMockId("membership"),
    userId: data.userId,
    organizationId: data.organizationId,
    role: data.role,
    isPrimaryOwner: data.isPrimaryOwner || false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  mockMemberships.push(membership);
  return membership;
}

export function updateMockMembership(id: string, data: Partial<Membership>): Membership | null {
  const index = mockMemberships.findIndex((m) => m.id === id);
  if (index === -1) return null;

  mockMemberships[index] = {
    ...mockMemberships[index],
    ...data,
    updatedAt: new Date(),
  };
  return mockMemberships[index];
}

export function createMockAuditLog(data: {
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  detail?: Record<string, unknown> | null;
}): AuditLog {
  const auditLog: AuditLog = {
    id: generateMockId("audit"),
    actorId: data.actorId,
    action: data.action,
    targetType: data.targetType,
    targetId: data.targetId,
    detail: data.detail ? JSON.stringify(data.detail) : null,
    createdAt: new Date(),
  };
  mockAuditLogs.push(auditLog);
  return auditLog;
}

export function updateMockCourt(id: string, data: Partial<Court>): Court | null {
  const index = mockCourts.findIndex((c) => c.id === id);
  if (index === -1) return null;

  mockCourts[index] = {
    ...mockCourts[index],
    ...data,
    updatedAt: new Date(),
  };
  return mockCourts[index];
}

export function deleteMockCourt(id: string): boolean {
  const index = mockCourts.findIndex((c) => c.id === id);
  if (index === -1) return false;
  mockCourts.splice(index, 1);

  // Also delete associated price rules
  const priceRuleIndices: number[] = [];
  mockCourtPriceRules.forEach((pr, i) => {
    if (pr.courtId === id) priceRuleIndices.push(i);
  });
  // Remove in reverse order to avoid index shifting
  priceRuleIndices.reverse().forEach((i) => mockCourtPriceRules.splice(i, 1));

  return true;
}

// ============================================================================
// Admin Notifications Helpers
// ============================================================================

export function findAdminNotificationById(id: string): AdminNotification | undefined {
  return mockAdminNotifications.find((n) => n.id === id);
}

export function updateMockNotification(id: string, data: Partial<AdminNotification>): AdminNotification | null {
  const index = mockAdminNotifications.findIndex((n) => n.id === id);
  if (index === -1) return null;

  mockAdminNotifications[index] = {
    ...mockAdminNotifications[index],
    ...data,
  };
  return mockAdminNotifications[index];
}

export function markAllMockNotificationsAsRead(): number {
  let count = 0;
  mockAdminNotifications.forEach((notification) => {
    if (!notification.read) {
      notification.read = true;
      count++;
    }
  });
  return count;
}

export function createMockAdminNotification(data: {
  type: "REQUESTED" | "ACCEPTED" | "DECLINED" | "CANCELED";
  playerId: string;
  coachId: string;
  trainingRequestId?: string | null;
  bookingId?: string | null;
  sessionDate?: Date | null;
  sessionTime?: string | null;
  courtInfo?: string | null;
}): AdminNotification {
  const notification: AdminNotification = {
    id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
    type: data.type,
    playerId: data.playerId,
    coachId: data.coachId,
    trainingRequestId: data.trainingRequestId || null,
    bookingId: data.bookingId || null,
    sessionDate: data.sessionDate || null,
    sessionTime: data.sessionTime || null,
    courtInfo: data.courtInfo || null,
    read: false,
    createdAt: new Date(),
  };
  mockAdminNotifications.unshift(notification);
  return notification;
}

// ============================================================================
// Helper to check if mock mode is enabled
// ============================================================================

export function isMockMode(): boolean {
  return process.env.USE_MOCK_DATA === "true";
}
