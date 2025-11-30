/**
 * @jest-environment node
 */
import { PUT, DELETE } from "@/app/api/coaches/[coachId]/availability/[slotId]/route";
import { prisma } from "@/lib/prisma";

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    coach: {
      findUnique: jest.fn(),
    },
    coachWeeklyAvailability: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
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

describe("PUT /api/coaches/[coachId]/availability/[slotId]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createPutRequest = (body: Record<string, unknown>) => {
    return new Request("http://localhost:3000/api/coaches/coach-123/availability/slot-123", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  };

  const mockParams = Promise.resolve({ coachId: "coach-123", slotId: "slot-123" });

  describe("Authentication and Authorization", () => {
    it("should return 401 when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const request = createPutRequest({ startTime: "10:00", endTime: "14:00" });
      const response = await PUT(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 403 when user is not a coach", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", role: "player" },
      });

      const request = createPutRequest({ startTime: "10:00", endTime: "14:00" });
      const response = await PUT(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });
  });

  describe("Slot validation", () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", role: "coach" },
      });

      (prisma.coach.findUnique as jest.Mock).mockResolvedValue({
        id: "coach-123",
        userId: "user-123",
      });
    });

    it("should return 404 when slot not found", async () => {
      (prisma.coachWeeklyAvailability.findUnique as jest.Mock).mockResolvedValue(null);

      const request = createPutRequest({ startTime: "10:00", endTime: "14:00" });
      const response = await PUT(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Availability slot not found");
    });

    it("should return 403 when slot belongs to another coach", async () => {
      (prisma.coachWeeklyAvailability.findUnique as jest.Mock).mockResolvedValue({
        id: "slot-123",
        coachId: "other-coach-456",
        dayOfWeek: 1,
        startTime: "09:00",
        endTime: "12:00",
      });

      const request = createPutRequest({ startTime: "10:00", endTime: "14:00" });
      const response = await PUT(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Slot does not belong to this coach");
    });

    it("should return 400 when startTime is after endTime", async () => {
      (prisma.coachWeeklyAvailability.findUnique as jest.Mock).mockResolvedValue({
        id: "slot-123",
        coachId: "coach-123",
        dayOfWeek: 1,
        startTime: "09:00",
        endTime: "12:00",
      });

      (prisma.coachWeeklyAvailability.findMany as jest.Mock).mockResolvedValue([]);

      const request = createPutRequest({ startTime: "14:00", endTime: "10:00" });
      const response = await PUT(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Start time must be before end time");
    });

    it("should return 409 when update causes overlap", async () => {
      (prisma.coachWeeklyAvailability.findUnique as jest.Mock).mockResolvedValue({
        id: "slot-123",
        coachId: "coach-123",
        dayOfWeek: 1,
        startTime: "09:00",
        endTime: "11:00",
      });

      (prisma.coachWeeklyAvailability.findMany as jest.Mock).mockResolvedValue([
        {
          id: "slot-456",
          dayOfWeek: 1,
          startTime: "13:00",
          endTime: "16:00",
        },
      ]);

      const request = createPutRequest({ startTime: "12:00", endTime: "15:00" });
      const response = await PUT(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toContain("overlaps");
    });
  });

  describe("Successful slot update", () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", role: "coach" },
      });

      (prisma.coach.findUnique as jest.Mock).mockResolvedValue({
        id: "coach-123",
        userId: "user-123",
      });

      (prisma.coachWeeklyAvailability.findUnique as jest.Mock).mockResolvedValue({
        id: "slot-123",
        coachId: "coach-123",
        dayOfWeek: 1,
        startTime: "09:00",
        endTime: "12:00",
        note: null,
      });

      (prisma.coachWeeklyAvailability.findMany as jest.Mock).mockResolvedValue([]);
    });

    it("should update slot times", async () => {
      const updatedSlot = {
        id: "slot-123",
        coachId: "coach-123",
        dayOfWeek: 1,
        startTime: "10:00",
        endTime: "14:00",
        note: null,
        createdAt: new Date("2024-01-15T00:00:00.000Z"),
        updatedAt: new Date("2024-01-15T01:00:00.000Z"),
      };

      (prisma.coachWeeklyAvailability.update as jest.Mock).mockResolvedValue(updatedSlot);

      const request = createPutRequest({ startTime: "10:00", endTime: "14:00" });
      const response = await PUT(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe("slot-123");
      expect(data.startTime).toBe("10:00");
      expect(data.endTime).toBe("14:00");
    });

    it("should update slot note", async () => {
      const updatedSlot = {
        id: "slot-123",
        coachId: "coach-123",
        dayOfWeek: 1,
        startTime: "09:00",
        endTime: "12:00",
        note: "Updated note",
        createdAt: new Date("2024-01-15T00:00:00.000Z"),
        updatedAt: new Date("2024-01-15T01:00:00.000Z"),
      };

      (prisma.coachWeeklyAvailability.update as jest.Mock).mockResolvedValue(updatedSlot);

      const request = createPutRequest({ note: "Updated note" });
      const response = await PUT(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.note).toBe("Updated note");
    });
  });
});

describe("DELETE /api/coaches/[coachId]/availability/[slotId]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createDeleteRequest = () => {
    return new Request("http://localhost:3000/api/coaches/coach-123/availability/slot-123", {
      method: "DELETE",
    });
  };

  const mockParams = Promise.resolve({ coachId: "coach-123", slotId: "slot-123" });

  describe("Authentication and Authorization", () => {
    it("should return 401 when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const request = createDeleteRequest();
      const response = await DELETE(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });
  });

  describe("Successful slot deletion", () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", role: "coach" },
      });

      (prisma.coach.findUnique as jest.Mock).mockResolvedValue({
        id: "coach-123",
        userId: "user-123",
      });

      (prisma.coachWeeklyAvailability.findUnique as jest.Mock).mockResolvedValue({
        id: "slot-123",
        coachId: "coach-123",
        dayOfWeek: 1,
        startTime: "09:00",
        endTime: "12:00",
      });
    });

    it("should delete slot and return success", async () => {
      (prisma.coachWeeklyAvailability.delete as jest.Mock).mockResolvedValue({});

      const request = createDeleteRequest();
      const response = await DELETE(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(prisma.coachWeeklyAvailability.delete).toHaveBeenCalledWith({
        where: { id: "slot-123" },
      });
    });
  });
});
