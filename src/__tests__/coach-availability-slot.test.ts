/**
 * @jest-environment node
 */
import { PUT, DELETE } from "../../archived_features/api/coach/availability/[slotId]/route";
import { prisma } from "@/lib/prisma";

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    coach: {
      findFirst: jest.fn(),
    },
    coachAvailability: {
      findUnique: jest.fn(),
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

describe("PUT /api/coach/availability/[slotId]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createPutRequest = (body: Record<string, unknown>) => {
    return new Request("http://localhost:3000/api/coach/availability/slot-123", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  };

  const mockParams = Promise.resolve({ slotId: "slot-123" });

  describe("Authentication and Authorization", () => {
    it("should return 401 when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const request = createPutRequest({ startTime: "10:00", endTime: "11:00" });
      const response = await PUT(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 403 when user is not a coach", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", isRoot: false },
      });

      const request = createPutRequest({ startTime: "10:00", endTime: "11:00" });
      const response = await PUT(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });
  });

  describe("Slot validation", () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: { id: "coach-user-123", isRoot: false },
      });

      (prisma.coach.findFirst as jest.Mock).mockResolvedValue({
        id: "coach-123",
        userId: "coach-user-123",
      });
    });

    it("should return 404 when slot not found", async () => {
      (prisma.coachAvailability.findUnique as jest.Mock).mockResolvedValue(null);

      const request = createPutRequest({ startTime: "10:00", endTime: "11:00" });
      const response = await PUT(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Availability slot not found");
    });

    it("should return 403 when slot belongs to another coach", async () => {
      (prisma.coachAvailability.findUnique as jest.Mock).mockResolvedValue({
        id: "slot-123",
        coachId: "other-coach-456",
        start: new Date("2024-01-15T10:00:00.000Z"),
        end: new Date("2024-01-15T11:00:00.000Z"),
      });

      const request = createPutRequest({ startTime: "10:00", endTime: "11:00" });
      const response = await PUT(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });
  });

  describe("Successful slot update", () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: { id: "coach-user-123", isRoot: false },
      });

      (prisma.coach.findFirst as jest.Mock).mockResolvedValue({
        id: "coach-123",
        userId: "coach-user-123",
      });

      (prisma.coachAvailability.findUnique as jest.Mock).mockResolvedValue({
        id: "slot-123",
        coachId: "coach-123",
        start: new Date("2024-01-15T10:00:00.000Z"),
        end: new Date("2024-01-15T11:00:00.000Z"),
      });
    });

    it("should update slot times when provided", async () => {
      const updatedSlot = {
        id: "slot-123",
        coachId: "coach-123",
        start: new Date("2024-01-15T09:00:00.000Z"),
        end: new Date("2024-01-15T12:00:00.000Z"),
      };

      (prisma.coachAvailability.update as jest.Mock).mockResolvedValue(updatedSlot);

      const request = createPutRequest({ startTime: "09:00", endTime: "12:00" });
      const response = await PUT(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.slotId).toBe("slot-123");
      expect(data.startTime).toBe("09:00");
      expect(data.endTime).toBe("12:00");
    });

    it("should return current slot info when no body provided", async () => {
      const request = createPutRequest({});
      const response = await PUT(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.slotId).toBe("slot-123");
    });
  });
});

describe("DELETE /api/coach/availability/[slotId]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createDeleteRequest = () => {
    return new Request("http://localhost:3000/api/coach/availability/slot-123", {
      method: "DELETE",
    });
  };

  const mockParams = Promise.resolve({ slotId: "slot-123" });

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
        user: { id: "coach-user-123", isRoot: false },
      });

      (prisma.coach.findFirst as jest.Mock).mockResolvedValue({
        id: "coach-123",
        userId: "coach-user-123",
      });

      (prisma.coachAvailability.findUnique as jest.Mock).mockResolvedValue({
        id: "slot-123",
        coachId: "coach-123",
        start: new Date("2024-01-15T10:00:00.000Z"),
        end: new Date("2024-01-15T11:00:00.000Z"),
      });
    });

    it("should delete slot and return success", async () => {
      (prisma.coachAvailability.delete as jest.Mock).mockResolvedValue({});

      const request = createDeleteRequest();
      const response = await DELETE(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(prisma.coachAvailability.delete).toHaveBeenCalledWith({
        where: { id: "slot-123" },
      });
    });
  });
});
