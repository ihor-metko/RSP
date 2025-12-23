/**
 * @jest-environment node
 */

// Mock auth function
const mockAuth = jest.fn();
jest.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

// Mock prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    organization: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

// Mock filesystem storage
const mockSaveFileToStorage = jest.fn();
jest.mock("@/lib/fileStorage", () => ({
  ...jest.requireActual("@/lib/fileStorage"),
  saveFileToStorage: (...args: unknown[]) => mockSaveFileToStorage(...args),
}));

// Mock SVG sanitizer
jest.mock("@/lib/svgSanitizer", () => ({
  sanitizeSVG: jest.fn((svg: string) => svg),
  isValidSVGBuffer: jest.fn(() => true),
}));

import { POST } from "@/app/api/admin/organizations/[id]/images/route";
import { prisma } from "@/lib/prisma";

describe("Organization Images Upload API", () => {
  const mockPrisma = prisma as jest.Mocked<typeof prisma>;

  beforeEach(() => {
    jest.clearAllMocks();
    // Default to successful save
    mockSaveFileToStorage.mockResolvedValue({ filename: "test-uuid.jpg" });
  });

  describe("POST /api/admin/organizations/[id]/images", () => {
    it("should return 401 when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const formData = new FormData();
      const file = new Blob(["test"], { type: "image/jpeg" });
      formData.append("file", file, "test.jpg");
      formData.append("type", "logo");

      const request = new Request("http://localhost:3000/api/admin/organizations/org-123/images", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request, { params: Promise.resolve({ id: "org-123" }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 403 when user is not root admin", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", isRoot: false },
      });

      const formData = new FormData();
      const file = new Blob(["test"], { type: "image/jpeg" });
      formData.append("file", file, "test.jpg");
      formData.append("type", "logo");

      const request = new Request("http://localhost:3000/api/admin/organizations/org-123/images", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request, { params: Promise.resolve({ id: "org-123" }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });

    it("should return 404 when organization not found", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      mockPrisma.organization.findUnique.mockResolvedValue(null);

      const formData = new FormData();
      const file = new Blob(["test"], { type: "image/jpeg" });
      formData.append("file", file, "test.jpg");
      formData.append("type", "logo");

      const request = new Request("http://localhost:3000/api/admin/organizations/org-123/images", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request, { params: Promise.resolve({ id: "org-123" }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Organization not found");
    });

    it("should return 400 when no file is provided", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      mockPrisma.organization.findUnique.mockResolvedValue({
        id: "org-123",
        name: "Test Org",
      });

      const formData = new FormData();
      formData.append("type", "logo");

      const request = new Request("http://localhost:3000/api/admin/organizations/org-123/images", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request, { params: Promise.resolve({ id: "org-123" }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("No file provided");
    });

    it("should return 400 when image type is missing", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      mockPrisma.organization.findUnique.mockResolvedValue({
        id: "org-123",
        name: "Test Org",
      });

      const formData = new FormData();
      const file = new Blob(["test"], { type: "image/jpeg" });
      formData.append("file", file, "test.jpg");

      const request = new Request("http://localhost:3000/api/admin/organizations/org-123/images", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request, { params: Promise.resolve({ id: "org-123" }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid image type. Must be 'logo' or 'heroImage'");
    });

    it("should return 400 when image type is invalid", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      mockPrisma.organization.findUnique.mockResolvedValue({
        id: "org-123",
        name: "Test Org",
      });

      const formData = new FormData();
      const file = new Blob(["test"], { type: "image/jpeg" });
      formData.append("file", file, "test.jpg");
      formData.append("type", "invalid");

      const request = new Request("http://localhost:3000/api/admin/organizations/org-123/images", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request, { params: Promise.resolve({ id: "org-123" }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid image type. Must be 'logo' or 'heroImage'");
    });

    it("should return 400 for invalid file type", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      mockPrisma.organization.findUnique.mockResolvedValue({
        id: "org-123",
        name: "Test Org",
      });

      const formData = new FormData();
      const file = new Blob(["test"], { type: "application/pdf" });
      formData.append("file", file, "test.pdf");
      formData.append("type", "logo");

      const request = new Request("http://localhost:3000/api/admin/organizations/org-123/images", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request, { params: Promise.resolve({ id: "org-123" }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid file type. Allowed: jpg, png, webp, svg");
    });

    it("should successfully upload logo image", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      mockPrisma.organization.findUnique.mockResolvedValue({
        id: "org-123",
        name: "Test Org",
        slug: "test-org",
      });

      mockPrisma.organization.update.mockResolvedValue({
        id: "org-123",
        name: "Test Org",
        slug: "test-org",
        logo: "/api/images/test-uuid.jpg",
        heroImage: null,
      });

      const formData = new FormData();
      const file = new Blob(["test"], { type: "image/jpeg" });
      formData.append("file", file, "test.jpg");
      formData.append("type", "logo");

      const request = new Request("http://localhost:3000/api/admin/organizations/org-123/images", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request, { params: Promise.resolve({ id: "org-123" }) });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.url).toMatch(/^\/api\/images\//);
      expect(data.type).toBe("logo");
      expect(data.organization.id).toBe("org-123");
      expect(mockPrisma.organization.update).toHaveBeenCalledWith({
        where: { id: "org-123" },
        data: { logo: expect.stringMatching(/^\/api\/images\//) },
      });
    });

    it("should successfully upload heroImage", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      mockPrisma.organization.findUnique.mockResolvedValue({
        id: "org-123",
        name: "Test Org",
        slug: "test-org",
      });

      mockPrisma.organization.update.mockResolvedValue({
        id: "org-123",
        name: "Test Org",
        slug: "test-org",
        logo: null,
        heroImage: "/api/images/test-uuid.jpg",
      });

      const formData = new FormData();
      const file = new Blob(["test"], { type: "image/jpeg" });
      formData.append("file", file, "test.jpg");
      formData.append("type", "heroImage");

      const request = new Request("http://localhost:3000/api/admin/organizations/org-123/images", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request, { params: Promise.resolve({ id: "org-123" }) });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.url).toMatch(/^\/api\/images\//);
      expect(data.type).toBe("heroImage");
      expect(data.organization.id).toBe("org-123");
      expect(mockPrisma.organization.update).toHaveBeenCalledWith({
        where: { id: "org-123" },
        data: { heroImage: expect.stringMatching(/^\/api\/images\//) },
      });
    });

    it("should return 500 when file save fails", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      mockPrisma.organization.findUnique.mockResolvedValue({
        id: "org-123",
        name: "Test Org",
        slug: "test-org",
      });

      // Mock storage failure
      mockSaveFileToStorage.mockResolvedValue({ error: "Disk full" });

      const formData = new FormData();
      const file = new Blob(["test"], { type: "image/jpeg" });
      formData.append("file", file, "test.jpg");
      formData.append("type", "logo");

      const request = new Request("http://localhost:3000/api/admin/organizations/org-123/images", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request, { params: Promise.resolve({ id: "org-123" }) });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain("Upload failed");
    });
  });
});
