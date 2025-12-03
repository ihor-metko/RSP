/**
 * @jest-environment node
 */
import { GET } from "../../archived_features/api/requests/route";
import { PUT as confirmRequest } from "../../archived_features/api/requests/[requestId]/confirm/route";
import { PUT as rejectRequest } from "../../archived_features/api/requests/[requestId]/reject/route";
import { prisma } from "@/lib/prisma";

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    coach: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    trainingRequest: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    club: {
      findUnique: jest.fn(),
    },
    court: {
      findUnique: jest.fn(),
    },
    booking: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
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

describe("Trainer Requests API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createContext = (requestId: string) => ({
    params: Promise.resolve({ requestId }),
  });

  describe("GET /api/trainer/requests", () => {
    it("should return 401 if not authenticated", async () => {
      (requireRole as jest.Mock).mockResolvedValue({
        authorized: false,
        response: new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }),
      });

      const request = new Request("http://localhost:3000/api/trainer/requests");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 404 if coach profile not found", async () => {
      (requireRole as jest.Mock).mockResolvedValue({
        authorized: true,
        userId: "coach-user-123",
        userRole: "coach",
      });

      (prisma.coach.findFirst as jest.Mock).mockResolvedValue(null);

      const request = new Request("http://localhost:3000/api/trainer/requests");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Coach profile not found");
    });

    it("should return training requests for authenticated coach", async () => {
      (requireRole as jest.Mock).mockResolvedValue({
        authorized: true,
        userId: "coach-user-123",
        userRole: "coach",
      });

      (prisma.coach.findFirst as jest.Mock).mockResolvedValue({
        id: "trainer-123",
        userId: "coach-user-123",
      });

      (prisma.trainingRequest.findMany as jest.Mock).mockResolvedValue([
        {
          id: "training-1",
          trainerId: "trainer-123",
          playerId: "player-123",
          clubId: "club-123",
          date: new Date("2024-01-15"),
          time: "10:00",
          comment: "Test comment",
          status: "pending",
          createdAt: new Date("2024-01-10"),
          updatedAt: new Date("2024-01-10"),
        },
      ]);

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "player-123",
        name: "John Player",
        email: "john@example.com",
      });

      (prisma.club.findUnique as jest.Mock).mockResolvedValue({
        id: "club-123",
        name: "Test Club",
      });

      (prisma.coach.findUnique as jest.Mock).mockResolvedValue({
        id: "trainer-123",
        user: { name: "Coach Smith" },
      });

      const request = new Request("http://localhost:3000/api/trainer/requests");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.requests).toHaveLength(1);
      expect(data.requests[0].playerName).toBe("John Player");
      expect(data.requests[0].clubName).toBe("Test Club");
      expect(data.requests[0].status).toBe("pending");
    });

    it("should filter by status when provided", async () => {
      (requireRole as jest.Mock).mockResolvedValue({
        authorized: true,
        userId: "coach-user-123",
        userRole: "coach",
      });

      (prisma.coach.findFirst as jest.Mock).mockResolvedValue({
        id: "trainer-123",
        userId: "coach-user-123",
      });

      (prisma.trainingRequest.findMany as jest.Mock).mockResolvedValue([]);

      const request = new Request("http://localhost:3000/api/trainer/requests?status=pending");
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

  describe("PUT /api/trainer/requests/[requestId]/confirm", () => {
    it("should return 401 if not authenticated", async () => {
      (requireRole as jest.Mock).mockResolvedValue({
        authorized: false,
        response: new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }),
      });

      const request = new Request("http://localhost:3000/api/trainer/requests/req-1/confirm", {
        method: "PUT",
      });
      const response = await confirmRequest(request, createContext("req-1"));
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 404 if training request not found", async () => {
      (requireRole as jest.Mock).mockResolvedValue({
        authorized: true,
        userId: "coach-user-123",
        userRole: "coach",
      });

      (prisma.trainingRequest.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new Request("http://localhost:3000/api/trainer/requests/nonexistent/confirm", {
        method: "PUT",
      });
      const response = await confirmRequest(request, createContext("nonexistent"));
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Training request not found");
    });

    it("should return 403 if coach tries to confirm another trainer's request", async () => {
      (requireRole as jest.Mock).mockResolvedValue({
        authorized: true,
        userId: "coach-user-123",
        userRole: "coach",
      });

      (prisma.trainingRequest.findUnique as jest.Mock).mockResolvedValue({
        id: "req-1",
        trainerId: "other-trainer-456",
        playerId: "player-123",
        status: "pending",
      });

      (prisma.coach.findFirst as jest.Mock).mockResolvedValue({
        id: "trainer-123",
        userId: "coach-user-123",
      });

      const request = new Request("http://localhost:3000/api/trainer/requests/req-1/confirm", {
        method: "PUT",
      });
      const response = await confirmRequest(request, createContext("req-1"));
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain("You can only confirm your own");
    });

    it("should return 400 if request is not pending", async () => {
      (requireRole as jest.Mock).mockResolvedValue({
        authorized: true,
        userId: "coach-user-123",
        userRole: "coach",
      });

      (prisma.trainingRequest.findUnique as jest.Mock).mockResolvedValue({
        id: "req-1",
        trainerId: "trainer-123",
        playerId: "player-123",
        status: "confirmed",
      });

      (prisma.coach.findFirst as jest.Mock).mockResolvedValue({
        id: "trainer-123",
        userId: "coach-user-123",
      });

      const request = new Request("http://localhost:3000/api/trainer/requests/req-1/confirm", {
        method: "PUT",
      });
      const response = await confirmRequest(request, createContext("req-1"));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Cannot confirm a request with status");
    });

    it("should return 409 if double-booking conflict exists", async () => {
      (requireRole as jest.Mock).mockResolvedValue({
        authorized: true,
        userId: "coach-user-123",
        userRole: "coach",
      });

      (prisma.trainingRequest.findUnique as jest.Mock).mockResolvedValue({
        id: "req-1",
        trainerId: "trainer-123",
        playerId: "player-123",
        date: new Date("2024-01-15"),
        time: "10:00",
        status: "pending",
      });

      (prisma.coach.findFirst as jest.Mock).mockResolvedValue({
        id: "trainer-123",
        userId: "coach-user-123",
      });

      // Conflicting confirmed request exists
      (prisma.trainingRequest.findFirst as jest.Mock).mockResolvedValue({
        id: "req-2",
        trainerId: "trainer-123",
        date: new Date("2024-01-15"),
        time: "10:00",
        status: "confirmed",
      });

      const request = new Request("http://localhost:3000/api/trainer/requests/req-1/confirm", {
        method: "PUT",
      });
      const response = await confirmRequest(request, createContext("req-1"));
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toContain("already has a confirmed session");
    });

    it("should successfully confirm a pending request", async () => {
      (requireRole as jest.Mock).mockResolvedValue({
        authorized: true,
        userId: "coach-user-123",
        userRole: "coach",
      });

      (prisma.trainingRequest.findUnique as jest.Mock).mockResolvedValue({
        id: "req-1",
        trainerId: "trainer-123",
        playerId: "player-123",
        clubId: "club-123",
        courtId: "court-1",
        bookingId: "booking-1",
        date: new Date("2024-01-15"),
        time: "10:00",
        comment: "Test",
        status: "pending",
      });

      (prisma.coach.findFirst as jest.Mock).mockResolvedValue({
        id: "trainer-123",
        userId: "coach-user-123",
      });

      // No conflicting request
      (prisma.trainingRequest.findFirst as jest.Mock).mockResolvedValue(null);

      // Mock booking lookup
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue({
        id: "booking-1",
        courtId: "court-1",
        start: new Date("2024-01-15T10:00:00.000Z"),
        end: new Date("2024-01-15T11:00:00.000Z"),
        status: "pending",
      });

      // No conflicting court booking
      (prisma.booking.findFirst as jest.Mock).mockResolvedValue(null);

      const confirmedResult = {
        id: "req-1",
        trainerId: "trainer-123",
        playerId: "player-123",
        clubId: "club-123",
        courtId: "court-1",
        bookingId: "booking-1",
        date: new Date("2024-01-15"),
        time: "10:00",
        comment: "Test",
        status: "confirmed",
      };

      (prisma.$transaction as jest.Mock).mockResolvedValue(confirmedResult);

      (prisma.court.findUnique as jest.Mock).mockResolvedValue({
        id: "court-1",
        name: "Court 1",
      });

      const request = new Request("http://localhost:3000/api/trainer/requests/req-1/confirm", {
        method: "PUT",
      });
      const response = await confirmRequest(request, createContext("req-1"));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe("confirmed");
      expect(data.message).toContain("confirmed successfully");
    });
  });

  describe("PUT /api/trainer/requests/[requestId]/reject", () => {
    it("should return 401 if not authenticated", async () => {
      (requireRole as jest.Mock).mockResolvedValue({
        authorized: false,
        response: new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }),
      });

      const request = new Request("http://localhost:3000/api/trainer/requests/req-1/reject", {
        method: "PUT",
      });
      const response = await rejectRequest(request, createContext("req-1"));
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 404 if training request not found", async () => {
      (requireRole as jest.Mock).mockResolvedValue({
        authorized: true,
        userId: "coach-user-123",
        userRole: "coach",
      });

      (prisma.trainingRequest.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new Request("http://localhost:3000/api/trainer/requests/nonexistent/reject", {
        method: "PUT",
      });
      const response = await rejectRequest(request, createContext("nonexistent"));
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Training request not found");
    });

    it("should return 403 if coach tries to reject another trainer's request", async () => {
      (requireRole as jest.Mock).mockResolvedValue({
        authorized: true,
        userId: "coach-user-123",
        userRole: "coach",
      });

      (prisma.trainingRequest.findUnique as jest.Mock).mockResolvedValue({
        id: "req-1",
        trainerId: "other-trainer-456",
        playerId: "player-123",
        status: "pending",
      });

      (prisma.coach.findFirst as jest.Mock).mockResolvedValue({
        id: "trainer-123",
        userId: "coach-user-123",
      });

      const request = new Request("http://localhost:3000/api/trainer/requests/req-1/reject", {
        method: "PUT",
      });
      const response = await rejectRequest(request, createContext("req-1"));
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain("You can only reject your own");
    });

    it("should return 400 if request is not pending", async () => {
      (requireRole as jest.Mock).mockResolvedValue({
        authorized: true,
        userId: "coach-user-123",
        userRole: "coach",
      });

      (prisma.trainingRequest.findUnique as jest.Mock).mockResolvedValue({
        id: "req-1",
        trainerId: "trainer-123",
        playerId: "player-123",
        status: "confirmed",
      });

      (prisma.coach.findFirst as jest.Mock).mockResolvedValue({
        id: "trainer-123",
        userId: "coach-user-123",
      });

      const request = new Request("http://localhost:3000/api/trainer/requests/req-1/reject", {
        method: "PUT",
      });
      const response = await rejectRequest(request, createContext("req-1"));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Cannot reject a request with status");
    });

    it("should successfully reject a pending request", async () => {
      (requireRole as jest.Mock).mockResolvedValue({
        authorized: true,
        userId: "coach-user-123",
        userRole: "coach",
      });

      (prisma.trainingRequest.findUnique as jest.Mock).mockResolvedValue({
        id: "req-1",
        trainerId: "trainer-123",
        playerId: "player-123",
        clubId: "club-123",
        courtId: "court-1",
        bookingId: "booking-1",
        date: new Date("2024-01-15"),
        time: "10:00",
        comment: "Test",
        status: "pending",
      });

      (prisma.coach.findFirst as jest.Mock).mockResolvedValue({
        id: "trainer-123",
        userId: "coach-user-123",
      });

      const rejectedResult = {
        id: "req-1",
        trainerId: "trainer-123",
        playerId: "player-123",
        clubId: "club-123",
        courtId: "court-1",
        bookingId: "booking-1",
        date: new Date("2024-01-15"),
        time: "10:00",
        comment: "Test",
        status: "rejected",
      };

      (prisma.$transaction as jest.Mock).mockResolvedValue(rejectedResult);

      const request = new Request("http://localhost:3000/api/trainer/requests/req-1/reject", {
        method: "PUT",
      });
      const response = await rejectRequest(request, createContext("req-1"));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe("rejected");
      expect(data.message).toContain("rejected");
    });

    it("should allow admin to reject any request", async () => {
      (requireRole as jest.Mock).mockResolvedValue({
        authorized: true,
        userId: "admin-user-123",
        userRole: "super_admin",
      });

      (prisma.trainingRequest.findUnique as jest.Mock).mockResolvedValue({
        id: "req-1",
        trainerId: "trainer-123",
        playerId: "player-123",
        clubId: "club-123",
        courtId: null,
        bookingId: null,
        date: new Date("2024-01-15"),
        time: "10:00",
        comment: "Test",
        status: "pending",
      });

      (prisma.coach.findFirst as jest.Mock).mockResolvedValue(null);

      const rejectedResult = {
        id: "req-1",
        trainerId: "trainer-123",
        playerId: "player-123",
        clubId: "club-123",
        courtId: null,
        bookingId: null,
        date: new Date("2024-01-15"),
        time: "10:00",
        comment: "Test",
        status: "rejected",
      };

      (prisma.$transaction as jest.Mock).mockResolvedValue(rejectedResult);

      const request = new Request("http://localhost:3000/api/trainer/requests/req-1/reject", {
        method: "PUT",
      });
      const response = await rejectRequest(request, createContext("req-1"));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe("rejected");
    });

    it("should not allow rejecting a cancelled_by_player request", async () => {
      (requireRole as jest.Mock).mockResolvedValue({
        authorized: true,
        userId: "coach-user-123",
        userRole: "coach",
      });

      (prisma.trainingRequest.findUnique as jest.Mock).mockResolvedValue({
        id: "req-1",
        trainerId: "trainer-123",
        playerId: "player-123",
        status: "cancelled_by_player",
      });

      (prisma.coach.findFirst as jest.Mock).mockResolvedValue({
        id: "trainer-123",
        userId: "coach-user-123",
      });

      const request = new Request("http://localhost:3000/api/trainer/requests/req-1/reject", {
        method: "PUT",
      });
      const response = await rejectRequest(request, createContext("req-1"));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Cannot reject a request with status");
    });
  });

  describe("PUT /api/trainer/requests/[requestId]/confirm with cancelled_by_player", () => {
    it("should not allow confirming a cancelled_by_player request", async () => {
      (requireRole as jest.Mock).mockResolvedValue({
        authorized: true,
        userId: "coach-user-123",
        userRole: "coach",
      });

      (prisma.trainingRequest.findUnique as jest.Mock).mockResolvedValue({
        id: "req-1",
        trainerId: "trainer-123",
        playerId: "player-123",
        date: new Date("2024-01-15"),
        time: "10:00",
        status: "cancelled_by_player",
      });

      (prisma.coach.findFirst as jest.Mock).mockResolvedValue({
        id: "trainer-123",
        userId: "coach-user-123",
      });

      const request = new Request("http://localhost:3000/api/trainer/requests/req-1/confirm", {
        method: "PUT",
      });
      const response = await confirmRequest(request, createContext("req-1"));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Cannot confirm a request with status");
    });
  });
});
