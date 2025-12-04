/**
 * @jest-environment node
 */

// Mock auth function
jest.mock("@/lib/auth", () => ({
  auth: jest.fn(),
}));

import { auth } from "@/lib/auth";
import { GET } from "@/app/api/me/route";

const mockAuth = auth as jest.MockedFunction<typeof auth>;

describe("/api/me endpoint", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/me", () => {
    it("should return 401 when user is not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const response = await GET();

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe("Unauthorized");
    });

    it("should return user info for authenticated user", async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: "user-123",
          email: "user@example.com",
          name: "Test User",
          isRoot: false,
        },
        expires: new Date().toISOString(),
      });

      const response = await GET();

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.userId).toBe("user-123");
      expect(data.email).toBe("user@example.com");
      expect(data.name).toBe("Test User");
      expect(data.isRoot).toBe(false);
    });

    it("should return isRoot=true for root admin", async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: "admin-123",
          email: "admin@example.com",
          name: "Root Admin",
          isRoot: true,
        },
        expires: new Date().toISOString(),
      });

      const response = await GET();

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.userId).toBe("admin-123");
      expect(data.email).toBe("admin@example.com");
      expect(data.name).toBe("Root Admin");
      expect(data.isRoot).toBe(true);
    });

    it("should handle missing optional fields", async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: "user-456",
          email: null,
          name: null,
        },
        expires: new Date().toISOString(),
      });

      const response = await GET();

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.userId).toBe("user-456");
      expect(data.email).toBeNull();
      expect(data.name).toBeNull();
      expect(data.isRoot).toBe(false);
    });
  });
});
