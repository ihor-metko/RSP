/**
 * @jest-environment node
 */
import { createAdminNotification } from "@/lib/adminNotifications";
import { prisma } from "@/lib/prisma";

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    adminNotification: {
      create: jest.fn(),
    },
  },
}));

describe("Admin Notifications Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createAdminNotification", () => {
    it("should create a REQUESTED notification", async () => {
      (prisma.adminNotification.create as jest.Mock).mockResolvedValue({
        id: "notif-123",
        type: "REQUESTED",
        playerId: "player-123",
        coachId: "coach-123",
        read: false,
      });

      await createAdminNotification({
        type: "REQUESTED",
        playerId: "player-123",
        coachId: "coach-123",
        trainingRequestId: "training-123",
        sessionDate: new Date("2024-01-15"),
        sessionTime: "10:00",
        courtInfo: "Court 1",
      });

      expect(prisma.adminNotification.create).toHaveBeenCalledWith({
        data: {
          type: "REQUESTED",
          playerId: "player-123",
          coachId: "coach-123",
          trainingRequestId: "training-123",
          bookingId: null,
          sessionDate: new Date("2024-01-15"),
          sessionTime: "10:00",
          courtInfo: "Court 1",
          read: false,
        },
      });
    });

    it("should create an ACCEPTED notification", async () => {
      (prisma.adminNotification.create as jest.Mock).mockResolvedValue({
        id: "notif-124",
        type: "ACCEPTED",
      });

      await createAdminNotification({
        type: "ACCEPTED",
        playerId: "player-123",
        coachId: "coach-123",
        trainingRequestId: "training-123",
        bookingId: "booking-123",
      });

      expect(prisma.adminNotification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: "ACCEPTED",
          playerId: "player-123",
          coachId: "coach-123",
          trainingRequestId: "training-123",
          bookingId: "booking-123",
        }),
      });
    });

    it("should create a DECLINED notification", async () => {
      (prisma.adminNotification.create as jest.Mock).mockResolvedValue({
        id: "notif-125",
        type: "DECLINED",
      });

      await createAdminNotification({
        type: "DECLINED",
        playerId: "player-123",
        coachId: "coach-123",
      });

      expect(prisma.adminNotification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: "DECLINED",
          playerId: "player-123",
          coachId: "coach-123",
        }),
      });
    });

    it("should create a CANCELED notification", async () => {
      (prisma.adminNotification.create as jest.Mock).mockResolvedValue({
        id: "notif-126",
        type: "CANCELED",
      });

      await createAdminNotification({
        type: "CANCELED",
        playerId: "player-123",
        coachId: "coach-123",
        trainingRequestId: "training-123",
      });

      expect(prisma.adminNotification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: "CANCELED",
          trainingRequestId: "training-123",
        }),
      });
    });

    it("should not throw on error but log in development", async () => {
      const originalEnv = process.env.NODE_ENV;
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();
      
      (prisma.adminNotification.create as jest.Mock).mockRejectedValue(
        new Error("Database error")
      );

      // Should not throw
      await expect(
        createAdminNotification({
          type: "REQUESTED",
          playerId: "player-123",
          coachId: "coach-123",
        })
      ).resolves.toBeUndefined();

      consoleSpy.mockRestore();
      process.env.NODE_ENV = originalEnv;
    });

    it("should handle optional fields correctly", async () => {
      (prisma.adminNotification.create as jest.Mock).mockResolvedValue({
        id: "notif-127",
        type: "REQUESTED",
      });

      await createAdminNotification({
        type: "REQUESTED",
        playerId: "player-123",
        coachId: "coach-123",
        // No optional fields provided
      });

      expect(prisma.adminNotification.create).toHaveBeenCalledWith({
        data: {
          type: "REQUESTED",
          playerId: "player-123",
          coachId: "coach-123",
          trainingRequestId: null,
          bookingId: null,
          sessionDate: null,
          sessionTime: null,
          courtInfo: null,
          read: false,
        },
      });
    });
  });
});
