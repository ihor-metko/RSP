/**
 * @jest-environment node
 */
import { GET } from "@/app/api/trainers/[id]/availability/route";
import { prisma } from "@/lib/prisma";

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    coach: {
      findUnique: jest.fn(),
    },
    trainingRequest: {
      findMany: jest.fn(),
    },
  },
}));

describe("GET /api/trainers/[id]/availability", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createContext = (id: string) => ({
    params: Promise.resolve({ id }),
  });

  it("should return 404 if trainer not found", async () => {
    (prisma.coach.findUnique as jest.Mock).mockResolvedValue(null);

    const request = new Request("http://localhost:3000/api/trainers/nonexistent/availability");
    const response = await GET(request, createContext("nonexistent"));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Trainer not found");
  });

  it("should return trainer availability grouped by date from weekly schedule", async () => {
    // Get tomorrow and determine its day of week
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const tomorrowDayOfWeek = tomorrow.getDay();

    (prisma.coach.findUnique as jest.Mock).mockResolvedValue({
      id: "trainer-123",
      user: { name: "John Trainer" },
      weeklyAvailabilities: [
        {
          id: "weekly-1",
          coachId: "trainer-123",
          dayOfWeek: tomorrowDayOfWeek,
          startTime: "09:00",
          endTime: "18:00",
          note: null,
        },
      ],
      timeOffs: [],
    });

    (prisma.trainingRequest.findMany as jest.Mock).mockResolvedValue([]);

    const request = new Request("http://localhost:3000/api/trainers/trainer-123/availability");
    const response = await GET(request, createContext("trainer-123"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.trainerId).toBe("trainer-123");
    expect(data.trainerName).toBe("John Trainer");
    expect(typeof data.availability).toBe("object");
    expect(typeof data.busyTimes).toBe("object");

    // Check that availability includes tomorrow based on weekly schedule
    const tomorrowKey = tomorrow.toISOString().split("T")[0];
    expect(data.availability[tomorrowKey]).toBeDefined();
    expect(data.availability[tomorrowKey]).toEqual([
      { start: "09:00", end: "18:00" },
    ]);
  });

  it("should include busy times from existing training requests", async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1);

    (prisma.coach.findUnique as jest.Mock).mockResolvedValue({
      id: "trainer-123",
      user: { name: "John Trainer" },
      weeklyAvailabilities: [],
      timeOffs: [],
    });

    (prisma.trainingRequest.findMany as jest.Mock).mockResolvedValue([
      {
        id: "training-1",
        trainerId: "trainer-123",
        date: futureDate,
        time: "10:00",
        status: "pending",
      },
    ]);

    const request = new Request("http://localhost:3000/api/trainers/trainer-123/availability");
    const response = await GET(request, createContext("trainer-123"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.busyTimes).toBeDefined();
    // Should contain the busy time from the training request
    const dateKey = futureDate.toISOString().split("T")[0];
    expect(data.busyTimes[dateKey]).toContain("10:00");
  });

  it("should handle trainer with no weekly availability", async () => {
    (prisma.coach.findUnique as jest.Mock).mockResolvedValue({
      id: "trainer-123",
      user: { name: "John Trainer" },
      weeklyAvailabilities: [],
      timeOffs: [],
    });

    (prisma.trainingRequest.findMany as jest.Mock).mockResolvedValue([]);

    const request = new Request("http://localhost:3000/api/trainers/trainer-123/availability");
    const response = await GET(request, createContext("trainer-123"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.availability).toEqual({});
    expect(data.busyTimes).toEqual({});
  });

  it("should handle trainer with null name", async () => {
    (prisma.coach.findUnique as jest.Mock).mockResolvedValue({
      id: "trainer-123",
      user: { name: null },
      weeklyAvailabilities: [],
      timeOffs: [],
    });

    (prisma.trainingRequest.findMany as jest.Mock).mockResolvedValue([]);

    const request = new Request("http://localhost:3000/api/trainers/trainer-123/availability");
    const response = await GET(request, createContext("trainer-123"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.trainerName).toBe("Unknown Trainer");
  });

  it("should support multiple slots per day", async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayDayOfWeek = today.getDay();

    (prisma.coach.findUnique as jest.Mock).mockResolvedValue({
      id: "trainer-123",
      user: { name: "John Trainer" },
      weeklyAvailabilities: [
        {
          id: "weekly-1",
          coachId: "trainer-123",
          dayOfWeek: todayDayOfWeek,
          startTime: "09:00",
          endTime: "12:00",
          note: "Morning",
        },
        {
          id: "weekly-2",
          coachId: "trainer-123",
          dayOfWeek: todayDayOfWeek,
          startTime: "14:00",
          endTime: "18:00",
          note: "Afternoon",
        },
      ],
      timeOffs: [],
    });

    (prisma.trainingRequest.findMany as jest.Mock).mockResolvedValue([]);

    const request = new Request("http://localhost:3000/api/trainers/trainer-123/availability");
    const response = await GET(request, createContext("trainer-123"));
    const data = await response.json();

    expect(response.status).toBe(200);

    const todayKey = today.toISOString().split("T")[0];
    expect(data.availability[todayKey]).toBeDefined();
    expect(data.availability[todayKey]).toHaveLength(2);
    expect(data.availability[todayKey]).toEqual([
      { start: "09:00", end: "12:00" },
      { start: "14:00", end: "18:00" },
    ]);
  });

  it("should generate availability for all matching days in the next 14 days", async () => {
    // Set weekly availability for Monday (dayOfWeek = 1)
    (prisma.coach.findUnique as jest.Mock).mockResolvedValue({
      id: "trainer-123",
      user: { name: "John Trainer" },
      weeklyAvailabilities: [
        {
          id: "weekly-1",
          coachId: "trainer-123",
          dayOfWeek: 1, // Monday
          startTime: "10:00",
          endTime: "17:00",
          note: null,
        },
      ],
      timeOffs: [],
    });

    (prisma.trainingRequest.findMany as jest.Mock).mockResolvedValue([]);

    const request = new Request("http://localhost:3000/api/trainers/trainer-123/availability");
    const response = await GET(request, createContext("trainer-123"));
    const data = await response.json();

    expect(response.status).toBe(200);

    // Count the number of Monday dates in the availability
    const availabilityDates = Object.keys(data.availability);
    const mondayDates = availabilityDates.filter((dateKey) => {
      const date = new Date(dateKey);
      return date.getDay() === 1; // Monday
    });

    // There should be 1-2 Mondays in the next 14 days
    expect(mondayDates.length).toBeGreaterThanOrEqual(1);
    expect(mondayDates.length).toBeLessThanOrEqual(2);

    // Each Monday should have the correct availability
    for (const mondayKey of mondayDates) {
      expect(data.availability[mondayKey]).toEqual([
        { start: "10:00", end: "17:00" },
      ]);
    }
  });

  it("should include time off entries in response", async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const tomorrowDayOfWeek = tomorrow.getDay();

    (prisma.coach.findUnique as jest.Mock).mockResolvedValue({
      id: "trainer-123",
      user: { name: "John Trainer" },
      weeklyAvailabilities: [
        {
          id: "weekly-1",
          coachId: "trainer-123",
          dayOfWeek: tomorrowDayOfWeek,
          startTime: "09:00",
          endTime: "18:00",
          note: null,
        },
      ],
      timeOffs: [
        {
          id: "timeoff-1",
          coachId: "trainer-123",
          date: tomorrow,
          startTime: "12:00",
          endTime: "14:00",
          reason: "Lunch break",
        },
      ],
    });

    (prisma.trainingRequest.findMany as jest.Mock).mockResolvedValue([]);

    const request = new Request("http://localhost:3000/api/trainers/trainer-123/availability");
    const response = await GET(request, createContext("trainer-123"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.timeOff).toBeDefined();

    const tomorrowKey = tomorrow.toISOString().split("T")[0];
    expect(data.timeOff[tomorrowKey]).toBeDefined();
    expect(data.timeOff[tomorrowKey]).toHaveLength(1);
    expect(data.timeOff[tomorrowKey][0]).toEqual({
      fullDay: false,
      startTime: "12:00",
      endTime: "14:00",
      reason: "Lunch break",
    });
  });

  it("should include full-day time off entries", async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const tomorrowDayOfWeek = tomorrow.getDay();

    (prisma.coach.findUnique as jest.Mock).mockResolvedValue({
      id: "trainer-123",
      user: { name: "John Trainer" },
      weeklyAvailabilities: [
        {
          id: "weekly-1",
          coachId: "trainer-123",
          dayOfWeek: tomorrowDayOfWeek,
          startTime: "09:00",
          endTime: "18:00",
          note: null,
        },
      ],
      timeOffs: [
        {
          id: "timeoff-1",
          coachId: "trainer-123",
          date: tomorrow,
          startTime: null,
          endTime: null,
          reason: "Vacation",
        },
      ],
    });

    (prisma.trainingRequest.findMany as jest.Mock).mockResolvedValue([]);

    const request = new Request("http://localhost:3000/api/trainers/trainer-123/availability");
    const response = await GET(request, createContext("trainer-123"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.timeOff).toBeDefined();

    const tomorrowKey = tomorrow.toISOString().split("T")[0];
    expect(data.timeOff[tomorrowKey]).toBeDefined();
    expect(data.timeOff[tomorrowKey]).toHaveLength(1);
    expect(data.timeOff[tomorrowKey][0]).toEqual({
      fullDay: true,
      startTime: null,
      endTime: null,
      reason: "Vacation",
    });
  });
});
