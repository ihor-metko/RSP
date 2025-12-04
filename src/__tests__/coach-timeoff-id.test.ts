/**
 * @jest-environment node
 */
import { PUT, DELETE } from "../../archived_features/api/coach/timeoff/[id]/route";
import { prisma } from "@/lib/prisma";

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    coach: {
      findFirst: jest.fn(),
    },
    coachTimeOff: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    booking: {
      findMany: jest.fn(),
    },
  },
}));

// Mock auth function
const mockAuth = jest.fn();
jest.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

describe("PUT /api/coach/timeoff/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createPutRequest = (body: Record<string, unknown>) => {
    return new Request("http://localhost:3000/api/coach/timeoff/timeoff-123", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  };

  const mockParams = Promise.resolve({ id: "timeoff-123" });

  describe("Authentication and Authorization", () => {
    it("should return 401 when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const request = createPutRequest({ reason: "Updated reason" });
      const response = await PUT(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 403 when user is not a coach", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", isRoot: false },
      });

      const request = createPutRequest({ reason: "Updated reason" });
      const response = await PUT(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });

    it("should return 403 when coach tries to update another coach's time off", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "coach-user-123", isRoot: false },
      });

      (prisma.coach.findFirst as jest.Mock).mockResolvedValue({
        id: "coach-123",
        userId: "coach-user-123",
      });

      (prisma.coachTimeOff.findUnique as jest.Mock).mockResolvedValue({
        id: "timeoff-123",
        coachId: "other-coach-456",
        date: new Date("2024-01-15"),
        startTime: null,
        endTime: null,
        reason: "Vacation",
      });

      const request = createPutRequest({ reason: "Updated reason" });
      const response = await PUT(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain("Forbidden");
    });
  });

  describe("Input validation", () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: { id: "coach-user-123", isRoot: false },
      });

      (prisma.coach.findFirst as jest.Mock).mockResolvedValue({
        id: "coach-123",
        userId: "coach-user-123",
      });

      (prisma.coachTimeOff.findUnique as jest.Mock).mockResolvedValue({
        id: "timeoff-123",
        coachId: "coach-123",
        date: new Date("2024-01-15"),
        startTime: null,
        endTime: null,
        reason: "Vacation",
      });
    });

    it("should return 404 when time off entry not found", async () => {
      (prisma.coachTimeOff.findUnique as jest.Mock).mockResolvedValue(null);

      const request = createPutRequest({ reason: "Updated reason" });
      const response = await PUT(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Time off entry not found");
    });

    it("should return 400 when date format is invalid", async () => {
      const request = createPutRequest({ date: "15-01-2024" });
      const response = await PUT(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid date format. Use YYYY-MM-DD");
    });

    it("should return 400 when startTime is after endTime", async () => {
      const request = createPutRequest({
        startTime: "14:00",
        endTime: "09:00",
      });
      const response = await PUT(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Start time must be before end time");
    });
  });

  describe("Successful time off update", () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: { id: "coach-user-123", isRoot: false },
      });

      (prisma.coach.findFirst as jest.Mock).mockResolvedValue({
        id: "coach-123",
        userId: "coach-user-123",
      });

      (prisma.coachTimeOff.findUnique as jest.Mock).mockResolvedValue({
        id: "timeoff-123",
        coachId: "coach-123",
        date: new Date("2024-01-15"),
        startTime: null,
        endTime: null,
        reason: "Vacation",
      });

      (prisma.booking.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.coachTimeOff.findMany as jest.Mock).mockResolvedValue([]);
    });

    it("should update time off entry and return 200", async () => {
      const mockUpdatedTimeOff = {
        id: "timeoff-123",
        coachId: "coach-123",
        date: new Date("2024-01-15"),
        startTime: "09:00",
        endTime: "12:00",
        reason: "Updated reason",
        createdAt: new Date("2024-01-10T00:00:00.000Z"),
        updatedAt: new Date("2024-01-12T00:00:00.000Z"),
      };

      (prisma.coachTimeOff.update as jest.Mock).mockResolvedValue(mockUpdatedTimeOff);

      const request = createPutRequest({
        startTime: "09:00",
        endTime: "12:00",
        reason: "Updated reason",
      });
      const response = await PUT(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe("timeoff-123");
      expect(data.startTime).toBe("09:00");
      expect(data.endTime).toBe("12:00");
      expect(data.reason).toBe("Updated reason");
    });

    it("should allow admin to update any coach's time off", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-user", isRoot: true },
      });

      (prisma.coach.findFirst as jest.Mock).mockResolvedValue({
        id: "coach-123",
        userId: "admin-user",
      });

      (prisma.coachTimeOff.findUnique as jest.Mock).mockResolvedValue({
        id: "timeoff-123",
        coachId: "other-coach-456",
        date: new Date("2024-01-15"),
        startTime: null,
        endTime: null,
        reason: "Vacation",
      });

      const mockUpdatedTimeOff = {
        id: "timeoff-123",
        coachId: "other-coach-456",
        date: new Date("2024-01-16"),
        startTime: null,
        endTime: null,
        reason: "Updated by admin",
        createdAt: new Date("2024-01-10T00:00:00.000Z"),
        updatedAt: new Date("2024-01-12T00:00:00.000Z"),
      };

      (prisma.coachTimeOff.update as jest.Mock).mockResolvedValue(mockUpdatedTimeOff);

      const request = createPutRequest({
        date: "2024-01-16",
        reason: "Updated by admin",
      });
      const response = await PUT(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.date).toBe("2024-01-16");
      expect(data.reason).toBe("Updated by admin");
    });
  });
});

describe("DELETE /api/coach/timeoff/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createDeleteRequest = () => {
    return new Request("http://localhost:3000/api/coach/timeoff/timeoff-123", {
      method: "DELETE",
    });
  };

  const mockParams = Promise.resolve({ id: "timeoff-123" });

  describe("Authentication and Authorization", () => {
    it("should return 401 when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const request = createDeleteRequest();
      const response = await DELETE(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 403 when user is not a coach", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", isRoot: false },
      });

      const request = createDeleteRequest();
      const response = await DELETE(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });

    it("should return 403 when coach tries to delete another coach's time off", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "coach-user-123", isRoot: false },
      });

      (prisma.coach.findFirst as jest.Mock).mockResolvedValue({
        id: "coach-123",
        userId: "coach-user-123",
      });

      (prisma.coachTimeOff.findUnique as jest.Mock).mockResolvedValue({
        id: "timeoff-123",
        coachId: "other-coach-456",
        date: new Date("2024-01-15"),
        startTime: null,
        endTime: null,
        reason: "Vacation",
      });

      const request = createDeleteRequest();
      const response = await DELETE(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain("Forbidden");
    });
  });

  describe("Error handling", () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: { id: "coach-user-123", isRoot: false },
      });

      (prisma.coach.findFirst as jest.Mock).mockResolvedValue({
        id: "coach-123",
        userId: "coach-user-123",
      });
    });

    it("should return 404 when time off entry not found", async () => {
      (prisma.coachTimeOff.findUnique as jest.Mock).mockResolvedValue(null);

      const request = createDeleteRequest();
      const response = await DELETE(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Time off entry not found");
    });
  });

  describe("Successful time off deletion", () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: { id: "coach-user-123", isRoot: false },
      });

      (prisma.coach.findFirst as jest.Mock).mockResolvedValue({
        id: "coach-123",
        userId: "coach-user-123",
      });

      (prisma.coachTimeOff.findUnique as jest.Mock).mockResolvedValue({
        id: "timeoff-123",
        coachId: "coach-123",
        date: new Date("2024-01-15"),
        startTime: null,
        endTime: null,
        reason: "Vacation",
      });
    });

    it("should delete time off entry and return success", async () => {
      (prisma.coachTimeOff.delete as jest.Mock).mockResolvedValue({});

      const request = createDeleteRequest();
      const response = await DELETE(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("should allow admin to delete any coach's time off", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-user", isRoot: true },
      });

      (prisma.coach.findFirst as jest.Mock).mockResolvedValue({
        id: "coach-123",
        userId: "admin-user",
      });

      (prisma.coachTimeOff.findUnique as jest.Mock).mockResolvedValue({
        id: "timeoff-123",
        coachId: "other-coach-456",
        date: new Date("2024-01-15"),
        startTime: null,
        endTime: null,
        reason: "Vacation",
      });

      (prisma.coachTimeOff.delete as jest.Mock).mockResolvedValue({});

      const request = createDeleteRequest();
      const response = await DELETE(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });
});
