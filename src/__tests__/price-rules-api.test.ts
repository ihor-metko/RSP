/**
 * @jest-environment node
 */
import { GET, POST } from "@/app/api/(player)/courts/[courtId]/price-rules/route";
import { PUT, DELETE } from "@/app/api/(player)/courts/[courtId]/price-rules/[ruleId]/route";
import { prisma } from "@/lib/prisma";

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    court: {
      findUnique: jest.fn(),
    },
    courtPriceRule: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

// Mock auth function
const mockAuth = jest.fn();
jest.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

describe("Price Rules API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/courts/:courtId/price-rules", () => {
    it("should return price rules for a court", async () => {
      const mockCourt = { id: "court-123", name: "Test Court" };
      const mockRules = [
        {
          id: "rule-1",
          courtId: "court-123",
          dayOfWeek: 1,
          date: null,
          startTime: "09:00",
          endTime: "12:00",
          priceCents: 10000,
          createdAt: new Date("2024-01-01"),
          updatedAt: new Date("2024-01-01"),
        },
        {
          id: "rule-2",
          courtId: "court-123",
          dayOfWeek: null,
          date: new Date("2024-12-25"),
          startTime: "09:00",
          endTime: "18:00",
          priceCents: 15000,
          createdAt: new Date("2024-01-02"),
          updatedAt: new Date("2024-01-02"),
        },
      ];

      (prisma.court.findUnique as jest.Mock).mockResolvedValue(mockCourt);
      (prisma.courtPriceRule.findMany as jest.Mock).mockResolvedValue(mockRules);

      const request = new Request("http://localhost:3000/api/courts/court-123/price-rules");
      const response = await GET(request, { params: Promise.resolve({ courtId: "court-123" }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.rules).toHaveLength(2);
      expect(data.rules[0].dayOfWeek).toBe(1);
      expect(data.rules[1].date).toBe("2024-12-25");
    });

    it("should return 404 when court not found", async () => {
      (prisma.court.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new Request("http://localhost:3000/api/courts/nonexistent/price-rules");
      const response = await GET(request, { params: Promise.resolve({ courtId: "nonexistent" }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Court not found");
    });
  });

  describe("POST /api/courts/:courtId/price-rules", () => {
    it("should return 401 when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const request = new Request("http://localhost:3000/api/courts/court-123/price-rules", {
        method: "POST",
        body: JSON.stringify({
          dayOfWeek: 1,
          startTime: "09:00",
          endTime: "12:00",
          priceCents: 10000,
        }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request, { params: Promise.resolve({ courtId: "court-123" }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 403 when user is not admin", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", isRoot: false },
      });

      const request = new Request("http://localhost:3000/api/courts/court-123/price-rules", {
        method: "POST",
        body: JSON.stringify({
          dayOfWeek: 1,
          startTime: "09:00",
          endTime: "12:00",
          priceCents: 10000,
        }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request, { params: Promise.resolve({ courtId: "court-123" }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });

    it("should create a weekly price rule for admin", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      const mockCourt = { id: "court-123", name: "Test Court" };
      const newRule = {
        id: "rule-new",
        courtId: "court-123",
        dayOfWeek: 1,
        date: null,
        startTime: "09:00",
        endTime: "12:00",
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
          dayOfWeek: 1,
          startTime: "09:00",
          endTime: "12:00",
          priceCents: 10000,
        }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request, { params: Promise.resolve({ courtId: "court-123" }) });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.dayOfWeek).toBe(1);
      expect(data.priceCents).toBe(10000);
    });

    it("should create a date-specific price rule for admin", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      const mockCourt = { id: "court-123", name: "Test Court" };
      const newRule = {
        id: "rule-new",
        courtId: "court-123",
        dayOfWeek: null,
        date: new Date("2024-12-25"),
        startTime: "09:00",
        endTime: "18:00",
        priceCents: 15000,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.court.findUnique as jest.Mock).mockResolvedValue(mockCourt);
      (prisma.courtPriceRule.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.courtPriceRule.create as jest.Mock).mockResolvedValue(newRule);

      const request = new Request("http://localhost:3000/api/courts/court-123/price-rules", {
        method: "POST",
        body: JSON.stringify({
          date: "2024-12-25",
          startTime: "09:00",
          endTime: "18:00",
          priceCents: 15000,
        }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request, { params: Promise.resolve({ courtId: "court-123" }) });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.date).toBe("2024-12-25");
      expect(data.priceCents).toBe(15000);
    });

    it("should return 409 when rule conflicts with existing rule", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      const mockCourt = { id: "court-123", name: "Test Court" };
      const existingRule = {
        id: "existing-rule",
        startTime: "10:00",
        endTime: "14:00",
      };

      (prisma.court.findUnique as jest.Mock).mockResolvedValue(mockCourt);
      (prisma.courtPriceRule.findMany as jest.Mock).mockResolvedValue([existingRule]);

      const request = new Request("http://localhost:3000/api/courts/court-123/price-rules", {
        method: "POST",
        body: JSON.stringify({
          dayOfWeek: 1,
          startTime: "09:00",
          endTime: "12:00",
          priceCents: 10000,
        }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request, { params: Promise.resolve({ courtId: "court-123" }) });
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toContain("conflicts");
    });

    it("should return 400 when startTime >= endTime", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      (prisma.court.findUnique as jest.Mock).mockResolvedValue({ id: "court-123" });

      const request = new Request("http://localhost:3000/api/courts/court-123/price-rules", {
        method: "POST",
        body: JSON.stringify({
          dayOfWeek: 1,
          startTime: "14:00",
          endTime: "09:00",
          priceCents: 10000,
        }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request, { params: Promise.resolve({ courtId: "court-123" }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("startTime must be before endTime");
    });

    it("should return 400 when both dayOfWeek and date are provided", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      (prisma.court.findUnique as jest.Mock).mockResolvedValue({ id: "court-123" });

      const request = new Request("http://localhost:3000/api/courts/court-123/price-rules", {
        method: "POST",
        body: JSON.stringify({
          dayOfWeek: 1,
          date: "2024-12-25",
          startTime: "09:00",
          endTime: "12:00",
          priceCents: 10000,
        }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request, { params: Promise.resolve({ courtId: "court-123" }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("mutually exclusive");
    });
  });

  describe("PUT /api/courts/:courtId/price-rules/:ruleId", () => {
    it("should update price rule for admin", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      const existingRule = {
        id: "rule-123",
        courtId: "court-123",
        dayOfWeek: 1,
        date: null,
        startTime: "09:00",
        endTime: "12:00",
        priceCents: 10000,
      };

      const updatedRule = {
        ...existingRule,
        priceCents: 12000,
        updatedAt: new Date(),
        createdAt: new Date(),
      };

      (prisma.courtPriceRule.findUnique as jest.Mock).mockResolvedValue(existingRule);
      (prisma.courtPriceRule.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.courtPriceRule.update as jest.Mock).mockResolvedValue(updatedRule);

      const request = new Request(
        "http://localhost:3000/api/courts/court-123/price-rules/rule-123",
        {
          method: "PUT",
          body: JSON.stringify({ priceCents: 12000 }),
          headers: { "Content-Type": "application/json" },
        }
      );

      const response = await PUT(request, {
        params: Promise.resolve({ courtId: "court-123", ruleId: "rule-123" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.priceCents).toBe(12000);
    });

    it("should return 404 when rule not found", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      (prisma.courtPriceRule.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new Request(
        "http://localhost:3000/api/courts/court-123/price-rules/nonexistent",
        {
          method: "PUT",
          body: JSON.stringify({ priceCents: 12000 }),
          headers: { "Content-Type": "application/json" },
        }
      );

      const response = await PUT(request, {
        params: Promise.resolve({ courtId: "court-123", ruleId: "nonexistent" }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Price rule not found");
    });
  });

  describe("DELETE /api/courts/:courtId/price-rules/:ruleId", () => {
    it("should delete price rule for admin", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      const existingRule = {
        id: "rule-123",
        courtId: "court-123",
        dayOfWeek: 1,
        date: null,
        startTime: "09:00",
        endTime: "12:00",
        priceCents: 10000,
      };

      (prisma.courtPriceRule.findUnique as jest.Mock).mockResolvedValue(existingRule);
      (prisma.courtPriceRule.delete as jest.Mock).mockResolvedValue(existingRule);

      const request = new Request(
        "http://localhost:3000/api/courts/court-123/price-rules/rule-123",
        { method: "DELETE" }
      );

      const response = await DELETE(request, {
        params: Promise.resolve({ courtId: "court-123", ruleId: "rule-123" }),
      });

      expect(response.status).toBe(204);
    });

    it("should return 404 when rule not found", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      (prisma.courtPriceRule.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new Request(
        "http://localhost:3000/api/courts/court-123/price-rules/nonexistent",
        { method: "DELETE" }
      );

      const response = await DELETE(request, {
        params: Promise.resolve({ courtId: "court-123", ruleId: "nonexistent" }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Price rule not found");
    });
  });
});
