/**
 * @jest-environment node
 */
import { GET, PATCH } from "@/app/api/trainings/[id]/route";
import { prisma } from "@/lib/prisma";

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    coach: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    trainingRequest: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    court: {
      findUnique: jest.fn(),
    },
    club: {
      findUnique: jest.fn(),
    },
    booking: {
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

// Mock requireRole
jest.mock("@/lib/requireRole", () => ({
  requireRole: jest.fn(),
}));

import { requireRole } from "@/lib/requireRole";

describe("Training Request Detail API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createContext = (id: string) => ({
    params: Promise.resolve({ id }),
  });

  describe("GET /api/trainings/[id]", () => {
    it("should return 404 if training request not found", async () => {
      (requireRole as jest.Mock).mockResolvedValue({
        authorized: true,
        userId: "player-123",
        userRole: "player",
      });

      (prisma.trainingRequest.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new Request("http://localhost:3000/api/trainings/nonexistent");
      const response = await GET(request, createContext("nonexistent"));
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Training request not found");
    });

    it("should return 403 if player tries to access another player's request", async () => {
      (requireRole as jest.Mock).mockResolvedValue({
        authorized: true,
        userId: "player-123",
        userRole: "player",
      });

      (prisma.trainingRequest.findUnique as jest.Mock).mockResolvedValue({
        id: "training-1",
        trainerId: "trainer-123",
        playerId: "other-player-456",
        clubId: "club-123",
        date: new Date("2024-01-15"),
        time: "10:00",
        status: "pending",
      });

      const request = new Request("http://localhost:3000/api/trainings/training-1");
      const response = await GET(request, createContext("training-1"));
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });

    it("should return training request for authorized player", async () => {
      (requireRole as jest.Mock).mockResolvedValue({
        authorized: true,
        userId: "player-123",
        userRole: "player",
      });

      (prisma.trainingRequest.findUnique as jest.Mock).mockResolvedValue({
        id: "training-1",
        trainerId: "trainer-123",
        playerId: "player-123",
        clubId: "club-123",
        courtId: "court-1",
        bookingId: "booking-1",
        date: new Date("2024-01-15"),
        time: "10:00",
        comment: "Test",
        status: "pending",
        createdAt: new Date("2024-01-10"),
        updatedAt: new Date("2024-01-10"),
      });

      (prisma.coach.findUnique as jest.Mock).mockResolvedValue({
        id: "trainer-123",
        user: { name: "John Trainer" },
      });

      (prisma.court.findUnique as jest.Mock).mockResolvedValue({
        id: "court-1",
        name: "Court 1",
      });

      (prisma.club.findUnique as jest.Mock).mockResolvedValue({
        id: "club-123",
        name: "Test Club",
      });

      const request = new Request("http://localhost:3000/api/trainings/training-1");
      const response = await GET(request, createContext("training-1"));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe("training-1");
      expect(data.status).toBe("pending");
      expect(data.trainerName).toBe("John Trainer");
      expect(data.courtName).toBe("Court 1");
    });
  });

  describe("PATCH /api/trainings/[id]", () => {
    it("should return 400 if status is missing", async () => {
      (requireRole as jest.Mock).mockResolvedValue({
        authorized: true,
        userId: "player-123",
        userRole: "player",
      });

      const request = new Request("http://localhost:3000/api/trainings/training-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const response = await PATCH(request, createContext("training-1"));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Missing required field");
    });

    it("should return 400 for invalid status", async () => {
      (requireRole as jest.Mock).mockResolvedValue({
        authorized: true,
        userId: "player-123",
        userRole: "player",
      });

      const request = new Request("http://localhost:3000/api/trainings/training-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "invalid-status" }),
      });

      const response = await PATCH(request, createContext("training-1"));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Invalid status");
    });

    it("should return 404 if training request not found", async () => {
      (requireRole as jest.Mock).mockResolvedValue({
        authorized: true,
        userId: "player-123",
        userRole: "player",
      });

      (prisma.trainingRequest.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new Request("http://localhost:3000/api/trainings/nonexistent", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });

      const response = await PATCH(request, createContext("nonexistent"));
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Training request not found");
    });

    it("should allow player to cancel their own pending request (converts to cancelled_by_player)", async () => {
      (requireRole as jest.Mock).mockResolvedValue({
        authorized: true,
        userId: "player-123",
        userRole: "player",
      });

      (prisma.trainingRequest.findUnique as jest.Mock).mockResolvedValue({
        id: "training-1",
        trainerId: "trainer-123",
        playerId: "player-123",
        courtId: null,
        bookingId: null,
        status: "pending",
      });

      const updatedTraining = {
        id: "training-1",
        trainerId: "trainer-123",
        playerId: "player-123",
        clubId: "club-123",
        courtId: null,
        bookingId: null,
        date: new Date("2024-01-15"),
        time: "10:00",
        comment: null,
        status: "cancelled_by_player",
      };

      (prisma.$transaction as jest.Mock).mockResolvedValue(updatedTraining);
      (prisma.court.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new Request("http://localhost:3000/api/trainings/training-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });

      const response = await PATCH(request, createContext("training-1"));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe("cancelled_by_player");
    });

    it("should allow player to cancel using cancelled_by_player status directly", async () => {
      (requireRole as jest.Mock).mockResolvedValue({
        authorized: true,
        userId: "player-123",
        userRole: "player",
      });

      (prisma.trainingRequest.findUnique as jest.Mock).mockResolvedValue({
        id: "training-1",
        trainerId: "trainer-123",
        playerId: "player-123",
        courtId: "court-1",
        bookingId: "booking-1",
        status: "pending",
      });

      const updatedTraining = {
        id: "training-1",
        trainerId: "trainer-123",
        playerId: "player-123",
        clubId: "club-123",
        courtId: "court-1",
        bookingId: "booking-1",
        date: new Date("2024-01-15"),
        time: "10:00",
        comment: null,
        status: "cancelled_by_player",
      };

      (prisma.$transaction as jest.Mock).mockResolvedValue(updatedTraining);
      (prisma.court.findUnique as jest.Mock).mockResolvedValue({
        id: "court-1",
        name: "Court 1",
      });

      const request = new Request("http://localhost:3000/api/trainings/training-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled_by_player" }),
      });

      const response = await PATCH(request, createContext("training-1"));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe("cancelled_by_player");
    });

    it("should not allow player to cancel non-pending request", async () => {
      (requireRole as jest.Mock).mockResolvedValue({
        authorized: true,
        userId: "player-123",
        userRole: "player",
      });

      (prisma.trainingRequest.findUnique as jest.Mock).mockResolvedValue({
        id: "training-1",
        trainerId: "trainer-123",
        playerId: "player-123",
        status: "confirmed",
      });

      const request = new Request("http://localhost:3000/api/trainings/training-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled_by_player" }),
      });

      const response = await PATCH(request, createContext("training-1"));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Can only cancel pending requests");
    });

    it("should not allow player to confirm requests", async () => {
      (requireRole as jest.Mock).mockResolvedValue({
        authorized: true,
        userId: "player-123",
        userRole: "player",
      });

      (prisma.trainingRequest.findUnique as jest.Mock).mockResolvedValue({
        id: "training-1",
        trainerId: "trainer-123",
        playerId: "player-123",
        status: "pending",
      });

      const request = new Request("http://localhost:3000/api/trainings/training-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "confirmed" }),
      });

      const response = await PATCH(request, createContext("training-1"));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Players can only cancel");
    });

    it("should allow coach to confirm their training request", async () => {
      (requireRole as jest.Mock).mockResolvedValue({
        authorized: true,
        userId: "coach-user-123",
        userRole: "coach",
      });

      (prisma.coach.findFirst as jest.Mock).mockResolvedValue({
        id: "trainer-123",
        userId: "coach-user-123",
      });

      (prisma.trainingRequest.findUnique as jest.Mock).mockResolvedValue({
        id: "training-1",
        trainerId: "trainer-123",
        playerId: "player-123",
        courtId: "court-1",
        bookingId: "booking-1",
        status: "pending",
      });

      const updatedTraining = {
        id: "training-1",
        trainerId: "trainer-123",
        playerId: "player-123",
        clubId: "club-123",
        courtId: "court-1",
        bookingId: "booking-1",
        date: new Date("2024-01-15"),
        time: "10:00",
        comment: null,
        status: "confirmed",
      };

      (prisma.$transaction as jest.Mock).mockResolvedValue(updatedTraining);
      (prisma.court.findUnique as jest.Mock).mockResolvedValue({
        id: "court-1",
        name: "Court 1",
      });

      const request = new Request("http://localhost:3000/api/trainings/training-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "confirmed" }),
      });

      const response = await PATCH(request, createContext("training-1"));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe("confirmed");
    });

    it("should allow coach to reject their training request", async () => {
      (requireRole as jest.Mock).mockResolvedValue({
        authorized: true,
        userId: "coach-user-123",
        userRole: "coach",
      });

      (prisma.coach.findFirst as jest.Mock).mockResolvedValue({
        id: "trainer-123",
        userId: "coach-user-123",
      });

      (prisma.trainingRequest.findUnique as jest.Mock).mockResolvedValue({
        id: "training-1",
        trainerId: "trainer-123",
        playerId: "player-123",
        courtId: "court-1",
        bookingId: "booking-1",
        status: "pending",
      });

      const updatedTraining = {
        id: "training-1",
        trainerId: "trainer-123",
        playerId: "player-123",
        clubId: "club-123",
        courtId: "court-1",
        bookingId: "booking-1",
        date: new Date("2024-01-15"),
        time: "10:00",
        comment: null,
        status: "rejected",
      };

      (prisma.$transaction as jest.Mock).mockResolvedValue(updatedTraining);
      (prisma.court.findUnique as jest.Mock).mockResolvedValue({
        id: "court-1",
        name: "Court 1",
      });

      const request = new Request("http://localhost:3000/api/trainings/training-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "rejected" }),
      });

      const response = await PATCH(request, createContext("training-1"));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe("rejected");
    });

    it("should not allow coach to cancel requests", async () => {
      (requireRole as jest.Mock).mockResolvedValue({
        authorized: true,
        userId: "coach-user-123",
        userRole: "coach",
      });

      (prisma.coach.findFirst as jest.Mock).mockResolvedValue({
        id: "trainer-123",
        userId: "coach-user-123",
      });

      (prisma.trainingRequest.findUnique as jest.Mock).mockResolvedValue({
        id: "training-1",
        trainerId: "trainer-123",
        playerId: "player-123",
        status: "pending",
      });

      const request = new Request("http://localhost:3000/api/trainings/training-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });

      const response = await PATCH(request, createContext("training-1"));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Coaches can only confirm or reject");
    });
  });
});
