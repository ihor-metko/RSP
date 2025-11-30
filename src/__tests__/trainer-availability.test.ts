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

  it("should return trainer availability grouped by date", async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1);
    futureDate.setHours(9, 0, 0, 0);

    const futureEndDate = new Date(futureDate);
    futureEndDate.setHours(18, 0, 0, 0);

    (prisma.coach.findUnique as jest.Mock).mockResolvedValue({
      id: "trainer-123",
      user: { name: "John Trainer" },
      availabilities: [
        {
          id: "avail-1",
          start: futureDate,
          end: futureEndDate,
        },
      ],
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
  });

  it("should include busy times from existing training requests", async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1);

    (prisma.coach.findUnique as jest.Mock).mockResolvedValue({
      id: "trainer-123",
      user: { name: "John Trainer" },
      availabilities: [],
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

  it("should handle trainer with no availability", async () => {
    (prisma.coach.findUnique as jest.Mock).mockResolvedValue({
      id: "trainer-123",
      user: { name: "John Trainer" },
      availabilities: [],
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
      availabilities: [],
    });

    (prisma.trainingRequest.findMany as jest.Mock).mockResolvedValue([]);

    const request = new Request("http://localhost:3000/api/trainers/trainer-123/availability");
    const response = await GET(request, createContext("trainer-123"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.trainerName).toBe("Unknown Trainer");
  });
});
