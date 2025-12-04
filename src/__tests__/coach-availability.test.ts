/**
 * @jest-environment node
 */
import { GET, POST } from "../../archived_features/api/coach/availability/route";
import { prisma } from "@/lib/prisma";

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    coach: {
      findFirst: jest.fn(),
    },
    coachAvailability: {
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

describe("GET /api/coach/availability", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createGetRequest = (dateParam?: string) => {
    const url = dateParam
      ? `http://localhost:3000/api/coach/availability?date=${dateParam}`
      : "http://localhost:3000/api/coach/availability";
    return new Request(url, { method: "GET" });
  };

  describe("Authentication and Authorization", () => {
    it("should return 401 when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const request = createGetRequest("2024-01-15");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 403 when user is not a coach", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", isRoot: false },
      });

      const request = createGetRequest("2024-01-15");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });
  });

  describe("Input validation", () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: { id: "coach-user-123", isRoot: false },
      });
    });

    it("should return 400 when date parameter is missing", async () => {
      const request = createGetRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Missing required parameter: date");
    });

    it("should return 400 when date format is invalid", async () => {
      const request = createGetRequest("15-01-2024");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid date format. Use YYYY-MM-DD");
    });
  });

  describe("Successful availability fetch", () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: { id: "coach-user-123", isRoot: false },
      });

      (prisma.coach.findFirst as jest.Mock).mockResolvedValue({
        id: "coach-123",
        userId: "coach-user-123",
        club: {
          openingHours: "09:00-22:00",
        },
      });
    });

    it("should return availability slots with club hours", async () => {
      const mockSlots = [
        {
          id: "slot-1",
          start: new Date("2024-01-15T10:00:00.000Z"),
          end: new Date("2024-01-15T11:00:00.000Z"),
        },
      ];

      (prisma.coachAvailability.findMany as jest.Mock).mockResolvedValue(mockSlots);

      const request = createGetRequest("2024-01-15");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.availableSlots).toHaveLength(1);
      expect(data.availableSlots[0].slotId).toBe("slot-1");
      expect(data.clubHours.opening).toBe("09:00");
      expect(data.clubHours.closing).toBe("22:00");
    });

    it("should return default club hours when not set", async () => {
      (prisma.coach.findFirst as jest.Mock).mockResolvedValue({
        id: "coach-123",
        userId: "coach-user-123",
        club: {
          openingHours: null,
        },
      });

      (prisma.coachAvailability.findMany as jest.Mock).mockResolvedValue([]);

      const request = createGetRequest("2024-01-15");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.clubHours.opening).toBe("09:00");
      expect(data.clubHours.closing).toBe("22:00");
    });
  });
});

describe("POST /api/coach/availability", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createPostRequest = (body: Record<string, unknown>) => {
    return new Request("http://localhost:3000/api/coach/availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  };

  describe("Authentication and Authorization", () => {
    it("should return 401 when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const request = createPostRequest({
        date: "2024-01-15",
        startTime: "10:00",
        endTime: "11:00",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
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
    });

    it("should return 400 when required fields are missing", async () => {
      const request = createPostRequest({
        date: "2024-01-15",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Missing required fields");
    });

    it("should return 400 when date format is invalid", async () => {
      const request = createPostRequest({
        date: "15-01-2024",
        startTime: "10:00",
        endTime: "11:00",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid date format. Use YYYY-MM-DD");
    });

    it("should return 400 when time format is invalid", async () => {
      const request = createPostRequest({
        date: "2024-01-15",
        startTime: "10AM",
        endTime: "11AM",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid time format. Use HH:MM");
    });

    it("should return 400 when start time is after end time", async () => {
      const request = createPostRequest({
        date: "2024-01-15",
        startTime: "11:00",
        endTime: "10:00",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Start time must be before end time");
    });
  });

  describe("Successful slot creation", () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: { id: "coach-user-123", isRoot: false },
      });

      (prisma.coach.findFirst as jest.Mock).mockResolvedValue({
        id: "coach-123",
        userId: "coach-user-123",
      });
    });

    it("should create availability slot and return 201", async () => {
      const mockSlot = {
        id: "new-slot-id",
        coachId: "coach-123",
        start: new Date("2024-01-15T10:00:00.000Z"),
        end: new Date("2024-01-15T11:00:00.000Z"),
      };

      (prisma.coachAvailability.create as jest.Mock).mockResolvedValue(mockSlot);

      const request = createPostRequest({
        date: "2024-01-15",
        startTime: "10:00",
        endTime: "11:00",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.slotId).toBe("new-slot-id");
      expect(data.startTime).toBe("10:00");
      expect(data.endTime).toBe("11:00");
      expect(data.date).toBe("2024-01-15");
    });
  });
});
