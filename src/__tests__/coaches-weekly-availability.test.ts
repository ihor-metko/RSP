/**
 * @jest-environment node
 */
import { GET, POST } from "@/app/api/coaches/[coachId]/availability/route";
import { prisma } from "@/lib/prisma";

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    coach: {
      findUnique: jest.fn(),
    },
    coachWeeklyAvailability: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
  },
}));

// Mock auth function
const mockAuth = jest.fn();
jest.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

describe("GET /api/coaches/[coachId]/availability", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createGetRequest = () => {
    return new Request("http://localhost:3000/api/coaches/coach-123/availability", {
      method: "GET",
    });
  };

  const mockParams = Promise.resolve({ coachId: "coach-123" });

  describe("Input validation", () => {
    it("should return 404 when coach does not exist", async () => {
      (prisma.coach.findUnique as jest.Mock).mockResolvedValue(null);

      const request = createGetRequest();
      const response = await GET(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Coach not found");
    });
  });

  describe("Successful availability fetch", () => {
    beforeEach(() => {
      (prisma.coach.findUnique as jest.Mock).mockResolvedValue({
        id: "coach-123",
        userId: "user-123",
      });
    });

    it("should return empty slots when no availability set", async () => {
      (prisma.coachWeeklyAvailability.findMany as jest.Mock).mockResolvedValue([]);

      const request = createGetRequest();
      const response = await GET(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.slots).toEqual([]);
    });

    it("should return all availability slots", async () => {
      const mockSlots = [
        {
          id: "slot-1",
          coachId: "coach-123",
          dayOfWeek: 1,
          startTime: "09:00",
          endTime: "12:00",
          note: "Morning sessions",
          createdAt: new Date("2024-01-15T00:00:00.000Z"),
          updatedAt: new Date("2024-01-15T00:00:00.000Z"),
        },
        {
          id: "slot-2",
          coachId: "coach-123",
          dayOfWeek: 1,
          startTime: "14:00",
          endTime: "18:00",
          note: null,
          createdAt: new Date("2024-01-15T00:00:00.000Z"),
          updatedAt: new Date("2024-01-15T00:00:00.000Z"),
        },
      ];

      (prisma.coachWeeklyAvailability.findMany as jest.Mock).mockResolvedValue(mockSlots);

      const request = createGetRequest();
      const response = await GET(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.slots).toHaveLength(2);
      expect(data.slots[0].id).toBe("slot-1");
      expect(data.slots[0].dayOfWeek).toBe(1);
      expect(data.slots[0].startTime).toBe("09:00");
      expect(data.slots[0].endTime).toBe("12:00");
      expect(data.slots[0].note).toBe("Morning sessions");
    });
  });
});

describe("POST /api/coaches/[coachId]/availability", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createPostRequest = (body: Record<string, unknown>) => {
    return new Request("http://localhost:3000/api/coaches/coach-123/availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  };

  const mockParams = Promise.resolve({ coachId: "coach-123" });

  describe("Authentication and Authorization", () => {
    it("should return 401 when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const request = createPostRequest({
        dayOfWeek: 1,
        startTime: "09:00",
        endTime: "12:00",
      });
      const response = await POST(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 403 when user is not a coach", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", role: "player" },
      });

      const request = createPostRequest({
        dayOfWeek: 1,
        startTime: "09:00",
        endTime: "12:00",
      });
      const response = await POST(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });

    it("should return 403 when coach tries to modify another coach's availability", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "other-user", role: "coach" },
      });

      (prisma.coach.findUnique as jest.Mock).mockResolvedValue({
        id: "coach-123",
        userId: "user-123",
      });

      const request = createPostRequest({
        dayOfWeek: 1,
        startTime: "09:00",
        endTime: "12:00",
      });
      const response = await POST(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden: You can only modify your own availability");
    });
  });

  describe("Input validation", () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", role: "coach" },
      });

      (prisma.coach.findUnique as jest.Mock).mockResolvedValue({
        id: "coach-123",
        userId: "user-123",
      });
    });

    it("should return 400 when dayOfWeek is missing", async () => {
      const request = createPostRequest({
        startTime: "09:00",
        endTime: "12:00",
      });
      const response = await POST(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Missing required fields");
    });

    it("should return 400 when dayOfWeek is invalid", async () => {
      const request = createPostRequest({
        dayOfWeek: 7,
        startTime: "09:00",
        endTime: "12:00",
      });
      const response = await POST(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Invalid dayOfWeek");
    });

    it("should return 400 when time format is invalid", async () => {
      const request = createPostRequest({
        dayOfWeek: 1,
        startTime: "9am",
        endTime: "12pm",
      });
      const response = await POST(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid time format. Use HH:mm");
    });

    it("should return 400 when startTime is after endTime", async () => {
      const request = createPostRequest({
        dayOfWeek: 1,
        startTime: "14:00",
        endTime: "09:00",
      });
      const response = await POST(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Start time must be before end time");
    });

    it("should return 409 when slot overlaps with existing slot", async () => {
      (prisma.coachWeeklyAvailability.findMany as jest.Mock).mockResolvedValue([
        {
          id: "existing-slot",
          dayOfWeek: 1,
          startTime: "10:00",
          endTime: "14:00",
        },
      ]);

      const request = createPostRequest({
        dayOfWeek: 1,
        startTime: "09:00",
        endTime: "11:00",
      });
      const response = await POST(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toContain("overlaps");
    });
  });

  describe("Successful slot creation", () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", role: "coach" },
      });

      (prisma.coach.findUnique as jest.Mock).mockResolvedValue({
        id: "coach-123",
        userId: "user-123",
      });

      (prisma.coachWeeklyAvailability.findMany as jest.Mock).mockResolvedValue([]);
    });

    it("should create availability slot and return 201", async () => {
      const mockSlot = {
        id: "new-slot-id",
        coachId: "coach-123",
        dayOfWeek: 1,
        startTime: "09:00",
        endTime: "12:00",
        note: "Morning sessions",
        createdAt: new Date("2024-01-15T00:00:00.000Z"),
        updatedAt: new Date("2024-01-15T00:00:00.000Z"),
      };

      (prisma.coachWeeklyAvailability.create as jest.Mock).mockResolvedValue(mockSlot);

      const request = createPostRequest({
        dayOfWeek: 1,
        startTime: "09:00",
        endTime: "12:00",
        note: "Morning sessions",
      });
      const response = await POST(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.id).toBe("new-slot-id");
      expect(data.dayOfWeek).toBe(1);
      expect(data.startTime).toBe("09:00");
      expect(data.endTime).toBe("12:00");
      expect(data.note).toBe("Morning sessions");
    });

    it("should allow admin to create slots for any coach", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-user", role: "admin" },
      });

      const mockSlot = {
        id: "new-slot-id",
        coachId: "coach-123",
        dayOfWeek: 2,
        startTime: "14:00",
        endTime: "18:00",
        note: null,
        createdAt: new Date("2024-01-15T00:00:00.000Z"),
        updatedAt: new Date("2024-01-15T00:00:00.000Z"),
      };

      (prisma.coachWeeklyAvailability.create as jest.Mock).mockResolvedValue(mockSlot);

      const request = createPostRequest({
        dayOfWeek: 2,
        startTime: "14:00",
        endTime: "18:00",
      });
      const response = await POST(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.id).toBe("new-slot-id");
    });
  });
});
