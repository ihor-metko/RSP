/**
 * @jest-environment node
 */
import { POST } from "@/app/api/admin/courts/[courtId]/price-rules/route";
import { prisma } from "@/lib/prisma";
import { ClubMembershipRole } from "@/constants/roles";

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    court: {
      findUnique: jest.fn(),
    },
    courtPriceRule: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    clubMembership: {
      findUnique: jest.fn(),
    },
    membership: {
      findUnique: jest.fn(),
    },
    holidayDate: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

// Mock auth function
const mockAuth = jest.fn();
jest.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

describe("Price Rules API - New Rule Types", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/courts/:courtId/price-rules - WEEKDAYS", () => {
    it("should create a WEEKDAYS rule for root admin", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      const mockCourt = {
        id: "court-123",
        clubId: "club-123",
        club: { id: "club-123", organizationId: "org-123" },
      };
      const newRule = {
        id: "rule-new",
        courtId: "court-123",
        ruleType: "WEEKDAYS",
        dayOfWeek: null,
        date: null,
        holidayId: null,
        startTime: "09:00",
        endTime: "17:00",
        priceCents: 10000,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.court.findUnique as jest.Mock).mockResolvedValue(mockCourt);
      (prisma.courtPriceRule.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.courtPriceRule.create as jest.Mock).mockResolvedValue(newRule);

      const request = new Request("http://localhost:3000/api/courts/court-123/price-rules", {
        method: "POST",
        body: JSON.stringify({
          ruleType: "WEEKDAYS",
          startTime: "09:00",
          endTime: "17:00",
          priceCents: 10000,
        }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request, { params: Promise.resolve({ courtId: "court-123" }) });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.ruleType).toBe("WEEKDAYS");
      expect(data.dayOfWeek).toBeNull();
      expect(data.priceCents).toBe(10000);
    });
  });

  describe("POST /api/courts/:courtId/price-rules - WEEKENDS", () => {
    it("should create a WEEKENDS rule for club admin", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: false },
      });

      const mockCourt = {
        id: "court-123",
        clubId: "club-123",
        club: { id: "club-123", organizationId: "org-123" },
      };
      const newRule = {
        id: "rule-new",
        courtId: "court-123",
        ruleType: "WEEKENDS",
        dayOfWeek: null,
        date: null,
        holidayId: null,
        startTime: "09:00",
        endTime: "18:00",
        priceCents: 15000,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.court.findUnique as jest.Mock).mockResolvedValue(mockCourt);
      (prisma.clubMembership.findUnique as jest.Mock).mockResolvedValue({
        role: ClubMembershipRole.CLUB_ADMIN,
      });
      (prisma.courtPriceRule.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.courtPriceRule.create as jest.Mock).mockResolvedValue(newRule);

      const request = new Request("http://localhost:3000/api/courts/court-123/price-rules", {
        method: "POST",
        body: JSON.stringify({
          ruleType: "WEEKENDS",
          startTime: "09:00",
          endTime: "18:00",
          priceCents: 15000,
        }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request, { params: Promise.resolve({ courtId: "court-123" }) });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.ruleType).toBe("WEEKENDS");
      expect(data.priceCents).toBe(15000);
    });
  });

  describe("POST /api/courts/:courtId/price-rules - ALL_DAYS", () => {
    it("should create an ALL_DAYS rule", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      const mockCourt = {
        id: "court-123",
        clubId: "club-123",
        club: { id: "club-123", organizationId: "org-123" },
      };
      const newRule = {
        id: "rule-new",
        courtId: "court-123",
        ruleType: "ALL_DAYS",
        dayOfWeek: null,
        date: null,
        holidayId: null,
        startTime: "20:00",
        endTime: "23:00",
        priceCents: 8000,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.court.findUnique as jest.Mock).mockResolvedValue(mockCourt);
      (prisma.courtPriceRule.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.courtPriceRule.create as jest.Mock).mockResolvedValue(newRule);

      const request = new Request("http://localhost:3000/api/courts/court-123/price-rules", {
        method: "POST",
        body: JSON.stringify({
          ruleType: "ALL_DAYS",
          startTime: "20:00",
          endTime: "23:00",
          priceCents: 8000,
        }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request, { params: Promise.resolve({ courtId: "court-123" }) });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.ruleType).toBe("ALL_DAYS");
      expect(data.priceCents).toBe(8000);
    });
  });

  describe("POST /api/courts/:courtId/price-rules - HOLIDAY", () => {
    it("should create a HOLIDAY rule", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      const mockCourt = {
        id: "court-123",
        clubId: "club-123",
        club: { id: "club-123", organizationId: "org-123" },
      };
      const mockHoliday = {
        id: "holiday-123",
        clubId: "club-123",
        name: "Christmas",
        date: new Date("2024-12-25"),
      };
      const newRule = {
        id: "rule-new",
        courtId: "court-123",
        ruleType: "HOLIDAY",
        dayOfWeek: null,
        date: null,
        holidayId: "holiday-123",
        startTime: "09:00",
        endTime: "18:00",
        priceCents: 20000,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.court.findUnique as jest.Mock).mockResolvedValue(mockCourt);
      (prisma.holidayDate.findUnique as jest.Mock).mockResolvedValue(mockHoliday);
      (prisma.courtPriceRule.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.courtPriceRule.create as jest.Mock).mockResolvedValue(newRule);

      const request = new Request("http://localhost:3000/api/courts/court-123/price-rules", {
        method: "POST",
        body: JSON.stringify({
          ruleType: "HOLIDAY",
          holidayId: "holiday-123",
          startTime: "09:00",
          endTime: "18:00",
          priceCents: 20000,
        }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request, { params: Promise.resolve({ courtId: "court-123" }) });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.ruleType).toBe("HOLIDAY");
      expect(data.holidayId).toBe("holiday-123");
      expect(data.priceCents).toBe(20000);
    });

    it("should return 404 when holiday not found for HOLIDAY rule", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      const mockCourt = {
        id: "court-123",
        clubId: "club-123",
        club: { id: "club-123", organizationId: "org-123" },
      };

      (prisma.court.findUnique as jest.Mock).mockResolvedValue(mockCourt);
      (prisma.holidayDate.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new Request("http://localhost:3000/api/courts/court-123/price-rules", {
        method: "POST",
        body: JSON.stringify({
          ruleType: "HOLIDAY",
          holidayId: "nonexistent",
          startTime: "09:00",
          endTime: "18:00",
          priceCents: 20000,
        }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request, { params: Promise.resolve({ courtId: "court-123" }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Holiday not found");
    });
  });

  describe("POST /api/courts/:courtId/price-rules - Validation", () => {
    it("should return 400 when ruleType is missing", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      const mockCourt = {
        id: "court-123",
        clubId: "club-123",
        club: { id: "club-123", organizationId: "org-123" },
      };

      (prisma.court.findUnique as jest.Mock).mockResolvedValue(mockCourt);

      const request = new Request("http://localhost:3000/api/courts/court-123/price-rules", {
        method: "POST",
        body: JSON.stringify({
          startTime: "09:00",
          endTime: "12:00",
          priceCents: 10000,
        }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request, { params: Promise.resolve({ courtId: "court-123" }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("ruleType");
    });

    it("should return 400 when invalid ruleType provided", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      const mockCourt = {
        id: "court-123",
        clubId: "club-123",
        club: { id: "club-123", organizationId: "org-123" },
      };

      (prisma.court.findUnique as jest.Mock).mockResolvedValue(mockCourt);

      const request = new Request("http://localhost:3000/api/courts/court-123/price-rules", {
        method: "POST",
        body: JSON.stringify({
          ruleType: "INVALID_TYPE",
          startTime: "09:00",
          endTime: "12:00",
          priceCents: 10000,
        }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request, { params: Promise.resolve({ courtId: "court-123" }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Invalid ruleType");
    });
  });
});
