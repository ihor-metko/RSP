/**
 * @jest-environment node
 */

// Mock auth function
const mockAuth = jest.fn();
jest.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

import { POST } from "@/app/api/admin/uploads/route";

describe("Admin Uploads API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/admin/uploads", () => {
    it("should return 401 when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const formData = new FormData();
      const file = new Blob(["test"], { type: "image/jpeg" });
      formData.append("file", file, "test.jpg");

      const request = new Request("http://localhost:3000/api/admin/uploads", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 403 when user is not admin", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", role: "player" },
      });

      const formData = new FormData();
      const file = new Blob(["test"], { type: "image/jpeg" });
      formData.append("file", file, "test.jpg");

      const request = new Request("http://localhost:3000/api/admin/uploads", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });

    it("should return 400 when no file is provided", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", role: "admin" },
      });

      const formData = new FormData();

      const request = new Request("http://localhost:3000/api/admin/uploads", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("No file provided");
    });

    it("should return 400 for invalid file type", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", role: "admin" },
      });

      const formData = new FormData();
      const file = new Blob(["test"], { type: "application/pdf" });
      formData.append("file", file, "test.pdf");

      const request = new Request("http://localhost:3000/api/admin/uploads", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid file type. Allowed: jpg, png, webp, avif");
    });

    it("should return 400 for file too large", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", role: "admin" },
      });

      // Create a mock file that's larger than 5MB
      const largeContent = "x".repeat(6 * 1024 * 1024); // 6MB
      const formData = new FormData();
      const file = new Blob([largeContent], { type: "image/jpeg" });
      formData.append("file", file, "large.jpg");

      const request = new Request("http://localhost:3000/api/admin/uploads", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("File too large. Maximum size: 5MB");
    });

    it("should successfully upload a valid image", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", role: "admin" },
      });

      const formData = new FormData();
      const file = new Blob(["test image content"], { type: "image/jpeg" });
      formData.append("file", file, "test.jpg");

      const request = new Request("http://localhost:3000/api/admin/uploads", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toHaveProperty("url");
      expect(data).toHaveProperty("key");
      expect(data.originalName).toBe("test.jpg");
      expect(data.mimeType).toBe("image/jpeg");
    });

    it("should accept png images", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", role: "admin" },
      });

      const formData = new FormData();
      const file = new Blob(["test"], { type: "image/png" });
      formData.append("file", file, "test.png");

      const request = new Request("http://localhost:3000/api/admin/uploads", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
    });

    it("should accept webp images", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", role: "admin" },
      });

      const formData = new FormData();
      const file = new Blob(["test"], { type: "image/webp" });
      formData.append("file", file, "test.webp");

      const request = new Request("http://localhost:3000/api/admin/uploads", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
    });

    it("should accept avif images", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", role: "admin" },
      });

      const formData = new FormData();
      const file = new Blob(["test"], { type: "image/avif" });
      formData.append("file", file, "test.avif");

      const request = new Request("http://localhost:3000/api/admin/uploads", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
    });
  });
});
