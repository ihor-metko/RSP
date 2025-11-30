/**
 * @jest-environment node
 */
import { GET, POST } from "@/app/api/coach/timeoff/route";
import { prisma } from "@/lib/prisma";

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    coach: {
      findFirst: jest.fn(),
    },
    coachTimeOff: {
      findMany: jest.fn(),
      create: jest.fn(),
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

describe("GET /api/coach/timeoff", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createGetRequest = () => {
    return new Request("http://localhost:3000/api/coach/timeoff", {
      method: "GET",
    });
  };

  describe("Authentication and Authorization", () => {
    it("should return 401 when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const request = createGetRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 403 when user is not a coach", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", role: "player" },
      });

      const request = createGetRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });
  });

  describe("Successful time off fetch", () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: { id: "coach-user-123", role: "coach" },
      });

      (prisma.coach.findFirst as jest.Mock).mockResolvedValue({
        id: "coach-123",
        userId: "coach-user-123",
      });
    });

    it("should return empty array when no time off entries exist", async () => {
      (prisma.coachTimeOff.findMany as jest.Mock).mockResolvedValue([]);

      const request = createGetRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.timeOffs).toEqual([]);
    });

    it("should return all time off entries for the coach", async () => {
      const mockTimeOffs = [
        {
          id: "timeoff-1",
          coachId: "coach-123",
          date: new Date("2024-01-15"),
          startTime: null,
          endTime: null,
          reason: "Vacation",
          createdAt: new Date("2024-01-10T00:00:00.000Z"),
          updatedAt: new Date("2024-01-10T00:00:00.000Z"),
        },
        {
          id: "timeoff-2",
          coachId: "coach-123",
          date: new Date("2024-01-20"),
          startTime: "09:00",
          endTime: "12:00",
          reason: "Doctor appointment",
          createdAt: new Date("2024-01-10T00:00:00.000Z"),
          updatedAt: new Date("2024-01-10T00:00:00.000Z"),
        },
      ];

      (prisma.coachTimeOff.findMany as jest.Mock).mockResolvedValue(mockTimeOffs);

      const request = createGetRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.timeOffs).toHaveLength(2);
      expect(data.timeOffs[0].id).toBe("timeoff-1");
      expect(data.timeOffs[0].date).toBe("2024-01-15");
      expect(data.timeOffs[0].startTime).toBeNull();
      expect(data.timeOffs[0].reason).toBe("Vacation");
      expect(data.timeOffs[1].id).toBe("timeoff-2");
      expect(data.timeOffs[1].startTime).toBe("09:00");
      expect(data.timeOffs[1].endTime).toBe("12:00");
    });
  });
});

describe("POST /api/coach/timeoff", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createPostRequest = (body: Record<string, unknown>) => {
    return new Request("http://localhost:3000/api/coach/timeoff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  };

  describe("Authentication and Authorization", () => {
    it("should return 401 when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const request = createPostRequest({ date: "2024-01-15" });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 403 when user is not a coach", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", role: "player" },
      });

      const request = createPostRequest({ date: "2024-01-15" });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });
  });

  describe("Input validation", () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: { id: "coach-user-123", role: "coach" },
      });

      (prisma.coach.findFirst as jest.Mock).mockResolvedValue({
        id: "coach-123",
        userId: "coach-user-123",
      });
    });

    it("should return 400 when date is missing", async () => {
      const request = createPostRequest({});
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Missing required field: date");
    });

    it("should return 400 when date format is invalid", async () => {
      const request = createPostRequest({ date: "15-01-2024" });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid date format. Use YYYY-MM-DD");
    });

    it("should return 400 when only startTime is provided", async () => {
      const request = createPostRequest({
        date: "2024-01-15",
        startTime: "09:00",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Both startTime and endTime are required for partial-day time off");
    });

    it("should return 400 when only endTime is provided", async () => {
      const request = createPostRequest({
        date: "2024-01-15",
        endTime: "12:00",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Both startTime and endTime are required for partial-day time off");
    });

    it("should return 400 when time format is invalid", async () => {
      const request = createPostRequest({
        date: "2024-01-15",
        startTime: "9am",
        endTime: "12pm",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid time format. Use HH:mm");
    });

    it("should return 400 when startTime is after endTime", async () => {
      const request = createPostRequest({
        date: "2024-01-15",
        startTime: "14:00",
        endTime: "09:00",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Start time must be before end time");
    });
  });

  describe("Conflict detection", () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: { id: "coach-user-123", role: "coach" },
      });

      (prisma.coach.findFirst as jest.Mock).mockResolvedValue({
        id: "coach-123",
        userId: "coach-user-123",
      });
    });

    it("should return 409 when full-day time off conflicts with booking", async () => {
      (prisma.booking.findMany as jest.Mock).mockResolvedValue([
        {
          id: "booking-1",
          start: new Date("2024-01-15T10:00:00.000Z"),
          end: new Date("2024-01-15T11:00:00.000Z"),
          status: "confirmed",
        },
      ]);

      const request = createPostRequest({ date: "2024-01-15" });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toContain("conflicts with existing booking");
    });

    it("should return 409 when partial-day time off overlaps with booking", async () => {
      (prisma.booking.findMany as jest.Mock).mockResolvedValue([
        {
          id: "booking-1",
          start: new Date("2024-01-15T10:00:00.000Z"),
          end: new Date("2024-01-15T11:00:00.000Z"),
          status: "confirmed",
        },
      ]);

      const request = createPostRequest({
        date: "2024-01-15",
        startTime: "09:00",
        endTime: "11:00",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toContain("conflicts with existing booking");
    });

    it("should return 409 when time off overlaps with existing time off", async () => {
      (prisma.booking.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.coachTimeOff.findMany as jest.Mock).mockResolvedValue([
        {
          id: "existing-timeoff",
          coachId: "coach-123",
          date: new Date("2024-01-15"),
          startTime: "10:00",
          endTime: "14:00",
          reason: null,
        },
      ]);

      const request = createPostRequest({
        date: "2024-01-15",
        startTime: "12:00",
        endTime: "16:00",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toContain("overlaps");
    });
  });

  describe("Successful time off creation", () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: { id: "coach-user-123", role: "coach" },
      });

      (prisma.coach.findFirst as jest.Mock).mockResolvedValue({
        id: "coach-123",
        userId: "coach-user-123",
      });

      (prisma.booking.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.coachTimeOff.findMany as jest.Mock).mockResolvedValue([]);
    });

    it("should create full-day time off and return 201", async () => {
      const mockTimeOff = {
        id: "new-timeoff-id",
        coachId: "coach-123",
        date: new Date("2024-01-15"),
        startTime: null,
        endTime: null,
        reason: "Vacation",
        createdAt: new Date("2024-01-10T00:00:00.000Z"),
        updatedAt: new Date("2024-01-10T00:00:00.000Z"),
      };

      (prisma.coachTimeOff.create as jest.Mock).mockResolvedValue(mockTimeOff);

      const request = createPostRequest({
        date: "2024-01-15",
        reason: "Vacation",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.id).toBe("new-timeoff-id");
      expect(data.date).toBe("2024-01-15");
      expect(data.startTime).toBeNull();
      expect(data.endTime).toBeNull();
      expect(data.reason).toBe("Vacation");
    });

    it("should create partial-day time off and return 201", async () => {
      const mockTimeOff = {
        id: "new-timeoff-id",
        coachId: "coach-123",
        date: new Date("2024-01-15"),
        startTime: "09:00",
        endTime: "12:00",
        reason: "Doctor appointment",
        createdAt: new Date("2024-01-10T00:00:00.000Z"),
        updatedAt: new Date("2024-01-10T00:00:00.000Z"),
      };

      (prisma.coachTimeOff.create as jest.Mock).mockResolvedValue(mockTimeOff);

      const request = createPostRequest({
        date: "2024-01-15",
        startTime: "09:00",
        endTime: "12:00",
        reason: "Doctor appointment",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.id).toBe("new-timeoff-id");
      expect(data.date).toBe("2024-01-15");
      expect(data.startTime).toBe("09:00");
      expect(data.endTime).toBe("12:00");
      expect(data.reason).toBe("Doctor appointment");
    });
  });
});
