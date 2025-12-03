/**
 * @jest-environment node
 */
import { GET } from "@/app/api/admin/notifications/stream/route";

// Mock auth
jest.mock("@/lib/auth", () => ({
  auth: jest.fn(),
}));

// Mock notification emitter
jest.mock("@/lib/notificationEmitter", () => ({
  notificationEmitter: {
    subscribe: jest.fn().mockReturnValue(() => {}),
  },
}));

import { auth } from "@/lib/auth";

describe("Admin Notifications Stream API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/admin/notifications/stream", () => {
    it("should return 401 if not authenticated", async () => {
      (auth as jest.Mock).mockResolvedValue(null);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 403 if user is not admin", async () => {
      (auth as jest.Mock).mockResolvedValue({
        user: {
          id: "user-123",
          role: "player",
        },
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });

    it("should return 403 if user is coach", async () => {
      (auth as jest.Mock).mockResolvedValue({
        user: {
          id: "coach-123",
          role: "coach",
        },
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });

    it("should return SSE stream for authenticated admin", async () => {
      (auth as jest.Mock).mockResolvedValue({
        user: {
          id: "admin-123",
          role: "super_admin",
        },
      });

      const response = await GET();

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("text/event-stream");
      expect(response.headers.get("Cache-Control")).toBe("no-cache, no-transform");
      expect(response.headers.get("Connection")).toBe("keep-alive");
    });
  });
});
