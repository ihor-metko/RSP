/**
 * @jest-environment node
 */
import { POST, GET } from "@/app/api/trainings/route";
import { prisma } from "@/lib/prisma";

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    coach: {
      findFirst: jest.fn(),
    },
    trainingRequest: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
  },
}));

// Mock requireRole
jest.mock("@/lib/requireRole", () => ({
  requireRole: jest.fn(),
}));

import { requireRole } from "@/lib/requireRole";

describe("Training Requests API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createRequest = (body: Record<string, unknown>, method = "POST") => {
    return new Request("http://localhost:3000/api/trainings", {
      method,
      headers: { "Content-Type": "application/json" },
      body: method !== "GET" ? JSON.stringify(body) : undefined,
    });
  };

  describe("POST /api/trainings", () => {
    beforeEach(() => {
      (requireRole as jest.Mock).mockResolvedValue({
        authorized: true,
        userId: "player-123",
        userRole: "player",
      });
    });

    it("should return 400 if required fields are missing", async () => {
      const request = createRequest({
        trainerId: "trainer-123",
        // Missing playerId, clubId, date, time
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Missing required fields");
    });

    it("should return 400 for invalid date format", async () => {
      const request = createRequest({
        trainerId: "trainer-123",
        playerId: "player-123",
        clubId: "club-123",
        date: "invalid-date",
        time: "10:00",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Invalid date format");
    });

    it("should return 400 for invalid time format", async () => {
      const request = createRequest({
        trainerId: "trainer-123",
        playerId: "player-123",
        clubId: "club-123",
        date: "2024-01-15",
        time: "invalid-time",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Invalid time format");
    });

    it("should return 400 if trainer not found in club", async () => {
      (prisma.coach.findFirst as jest.Mock).mockResolvedValue(null);

      const request = createRequest({
        trainerId: "trainer-123",
        playerId: "player-123",
        clubId: "club-123",
        date: "2024-01-15",
        time: "10:00",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Trainer not found in this club");
    });

    it("should return 400 if trainer does not work on selected day", async () => {
      // 2024-01-15 is a Monday (dayOfWeek = 1), but trainer only works on Tuesday
      (prisma.coach.findFirst as jest.Mock).mockResolvedValue({
        id: "trainer-123",
        weeklyAvailabilities: [
          {
            id: "weekly-1",
            dayOfWeek: 2, // Tuesday only
            startTime: "09:00",
            endTime: "18:00",
          },
        ],
      });

      const request = createRequest({
        trainerId: "trainer-123",
        playerId: "player-123",
        clubId: "club-123",
        date: "2024-01-15", // Monday
        time: "10:00",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("does not work on this day");
    });

    it("should return 400 if trainer is not available at selected time", async () => {
      // 2024-01-15 is a Monday (dayOfWeek = 1), trainer works on Monday but not at 10:00
      (prisma.coach.findFirst as jest.Mock).mockResolvedValue({
        id: "trainer-123",
        weeklyAvailabilities: [
          {
            id: "weekly-1",
            dayOfWeek: 1, // Monday
            startTime: "14:00",
            endTime: "18:00",
          },
        ],
      });

      const request = createRequest({
        trainerId: "trainer-123",
        playerId: "player-123",
        clubId: "club-123",
        date: "2024-01-15", // Monday
        time: "10:00",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("not available at this time");
    });

    it("should return 409 if trainer already has training at this time", async () => {
      // 2024-01-15 is a Monday (dayOfWeek = 1)
      (prisma.coach.findFirst as jest.Mock).mockResolvedValue({
        id: "trainer-123",
        weeklyAvailabilities: [
          {
            id: "weekly-1",
            dayOfWeek: 1, // Monday
            startTime: "09:00",
            endTime: "18:00",
          },
        ],
      });

      (prisma.trainingRequest.findFirst as jest.Mock).mockResolvedValue({
        id: "existing-training",
        trainerId: "trainer-123",
        date: new Date("2024-01-15"),
        time: "10:00",
        status: "pending",
      });

      const request = createRequest({
        trainerId: "trainer-123",
        playerId: "player-123",
        clubId: "club-123",
        date: "2024-01-15", // Monday
        time: "10:00",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toContain("already has training at this time");
    });

    it("should create training request successfully", async () => {
      // 2024-01-15 is a Monday (dayOfWeek = 1)
      (prisma.coach.findFirst as jest.Mock).mockResolvedValue({
        id: "trainer-123",
        weeklyAvailabilities: [
          {
            id: "weekly-1",
            dayOfWeek: 1, // Monday
            startTime: "09:00",
            endTime: "18:00",
          },
        ],
      });

      (prisma.trainingRequest.findFirst as jest.Mock).mockResolvedValue(null);

      (prisma.trainingRequest.create as jest.Mock).mockResolvedValue({
        id: "training-123",
        trainerId: "trainer-123",
        playerId: "player-123",
        clubId: "club-123",
        date: new Date("2024-01-15"),
        time: "10:00",
        comment: "Test comment",
        status: "pending",
      });

      const request = createRequest({
        trainerId: "trainer-123",
        playerId: "player-123",
        clubId: "club-123",
        date: "2024-01-15", // Monday
        time: "10:00",
        comment: "Test comment",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.id).toBe("training-123");
      expect(data.status).toBe("pending");
      expect(data.message).toContain("Waiting for trainer confirmation");
    });

    it("should return 401 if user is not authenticated", async () => {
      (requireRole as jest.Mock).mockResolvedValue({
        authorized: false,
        response: new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }),
      });

      const request = createRequest({
        trainerId: "trainer-123",
        playerId: "player-123",
        clubId: "club-123",
        date: "2024-01-15",
        time: "10:00",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });
  });

  describe("GET /api/trainings", () => {
    beforeEach(() => {
      (requireRole as jest.Mock).mockResolvedValue({
        authorized: true,
        userId: "player-123",
        userRole: "player",
      });
    });

    it("should return trainings for authenticated player", async () => {
      (prisma.trainingRequest.findMany as jest.Mock).mockResolvedValue([
        {
          id: "training-1",
          trainerId: "trainer-123",
          playerId: "player-123",
          clubId: "club-123",
          date: new Date("2024-01-15"),
          time: "10:00",
          status: "pending",
        },
      ]);

      const request = new Request("http://localhost:3000/api/trainings", {
        method: "GET",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.trainings).toHaveLength(1);
      expect(data.trainings[0].id).toBe("training-1");
    });

    it("should filter by player for player role", async () => {
      (prisma.trainingRequest.findMany as jest.Mock).mockResolvedValue([]);

      const request = new Request("http://localhost:3000/api/trainings", {
        method: "GET",
      });

      await GET(request);

      expect(prisma.trainingRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            playerId: "player-123",
          }),
        })
      );
    });

    it("should filter by status when provided", async () => {
      (prisma.trainingRequest.findMany as jest.Mock).mockResolvedValue([]);

      const request = new Request("http://localhost:3000/api/trainings?status=pending", {
        method: "GET",
      });

      await GET(request);

      expect(prisma.trainingRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: "pending",
          }),
        })
      );
    });
  });
});
