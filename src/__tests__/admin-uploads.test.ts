/**
 * @jest-environment node
 */

// Mock auth function
const mockAuth = jest.fn();
jest.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

// Mock filesystem storage
jest.mock("@/lib/fileStorage", () => ({
  ...jest.requireActual("@/lib/fileStorage"),
  saveFileToStorage: jest.fn(),
}));

import { POST } from "@/app/api/admin/uploads/route";
import { saveFileToStorage } from "@/lib/fileStorage";

const mockSaveFileToStorage = saveFileToStorage as jest.MockedFunction<typeof saveFileToStorage>;

describe("Admin Uploads API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default to successful save
    mockSaveFileToStorage.mockResolvedValue({ filename: "test-uuid.jpg" });
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
        user: { id: "user-123", isRoot: false },
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
        user: { id: "admin-123", isRoot: true },
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
        user: { id: "admin-123", isRoot: true },
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
      expect(data.error).toBe("Invalid file type. Allowed: jpg, png, webp");
    });

    it("should return 400 for file too large", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      // Create a mock file that's larger than 10MB
      const largeContent = "x".repeat(11 * 1024 * 1024); // 11MB
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
      expect(data.error).toBe("File too large. Maximum size: 10MB");
    });

    it("should successfully upload a valid image", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
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
      expect(data.url).toMatch(/^\/api\/images\//);
      expect(data).toHaveProperty("key");
      expect(data.originalName).toBe("test.jpg");
      expect(data.mimeType).toBe("image/jpeg");
      expect(mockSaveFileToStorage).toHaveBeenCalled();
    });

    it("should accept png images", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
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
        user: { id: "admin-123", isRoot: true },
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

    it("should return 500 when file save fails", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      // Mock storage failure
      mockSaveFileToStorage.mockResolvedValue({ error: "Disk full" });

      const formData = new FormData();
      const file = new Blob(["test"], { type: "image/jpeg" });
      formData.append("file", file, "test.jpg");

      const request = new Request("http://localhost:3000/api/admin/uploads", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain("Upload failed");
    });
  });
});
