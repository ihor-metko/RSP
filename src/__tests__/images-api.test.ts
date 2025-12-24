/**
 * @jest-environment node
 */

/**
 * Tests for backward compatibility image serving API route.
 * 
 * Note: This route is maintained for backward compatibility only.
 * New uploads should use absolute URLs served directly by Nginx.
 * See docs/IMAGE_HANDLING.md for current image handling architecture.
 */

import { GET } from "@/app/api/images/[entity]/[entityId]/[filename]/route";
import { NextRequest } from "next/server";
import { readFile, stat } from "fs/promises";
import path from "path";

// Mock fs/promises
jest.mock("fs/promises", () => ({
  readFile: jest.fn(),
  stat: jest.fn(),
}));

const mockReadFile = readFile as jest.MockedFunction<typeof readFile>;
const mockStat = stat as jest.MockedFunction<typeof stat>;

describe("Images API - GET /api/images/[entity]/[entityId]/[filename] (Backward Compatibility)", () => {
  const originalEnv = process.env;

  beforeAll(() => {
    // Set up environment variables for tests
    process.env.NODE_ENV = 'production';
    process.env.IMAGE_UPLOAD_PATH_PROD = '/app/storage/images';
    process.env.IMAGE_UPLOAD_PATH_DEV = '/app/storage/images';
  });

  afterAll(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Helper to create a mock request
  const createRequest = (url: string) => {
    return new NextRequest(url);
  };

  describe("Entity validation", () => {
    it("should accept valid entity type: organizations", async () => {
      const params = {
        entity: "organizations",
        entityId: "123e4567-e89b-12d3-a456-426614174000",
        filename: "test.jpg",
      };

      mockStat.mockResolvedValue({
        isFile: () => true,
      } as any);
      mockReadFile.mockResolvedValue(Buffer.from("fake image data"));

      const response = await GET(
        createRequest("http://localhost:3000/api/images/organizations/123e4567-e89b-12d3-a456-426614174000/test.jpg"),
        { params }
      );

      expect(response.status).toBe(200);
    });

    it("should accept valid entity type: clubs", async () => {
      const params = {
        entity: "clubs",
        entityId: "123e4567-e89b-12d3-a456-426614174000",
        filename: "test.png",
      };

      mockStat.mockResolvedValue({
        isFile: () => true,
      } as any);
      mockReadFile.mockResolvedValue(Buffer.from("fake image data"));

      const response = await GET(
        createRequest("http://localhost:3000/api/images/clubs/123e4567-e89b-12d3-a456-426614174000/test.png"),
        { params }
      );

      expect(response.status).toBe(200);
    });

    it("should accept valid entity type: users", async () => {
      const params = {
        entity: "users",
        entityId: "123e4567-e89b-12d3-a456-426614174000",
        filename: "test.webp",
      };

      mockStat.mockResolvedValue({
        isFile: () => true,
      } as any);
      mockReadFile.mockResolvedValue(Buffer.from("fake image data"));

      const response = await GET(
        createRequest("http://localhost:3000/api/images/users/123e4567-e89b-12d3-a456-426614174000/test.webp"),
        { params }
      );

      expect(response.status).toBe(200);
    });

    it("should accept valid entity type: bookings", async () => {
      const params = {
        entity: "bookings",
        entityId: "123e4567-e89b-12d3-a456-426614174000",
        filename: "test.gif",
      };

      mockStat.mockResolvedValue({
        isFile: () => true,
      } as any);
      mockReadFile.mockResolvedValue(Buffer.from("fake image data"));

      const response = await GET(
        createRequest("http://localhost:3000/api/images/bookings/123e4567-e89b-12d3-a456-426614174000/test.gif"),
        { params }
      );

      expect(response.status).toBe(200);
    });

    it("should reject invalid entity type", async () => {
      const params = {
        entity: "invalid-entity",
        entityId: "123e4567-e89b-12d3-a456-426614174000",
        filename: "test.jpg",
      };

      const response = await GET(
        createRequest("http://localhost:3000/api/images/invalid-entity/123e4567-e89b-12d3-a456-426614174000/test.jpg"),
        { params }
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("Invalid entity type");
    });
  });

  describe("Entity ID validation", () => {
    it("should accept valid UUID", async () => {
      const params = {
        entity: "clubs",
        entityId: "123e4567-e89b-12d3-a456-426614174000",
        filename: "test.jpg",
      };

      mockStat.mockResolvedValue({
        isFile: () => true,
      } as any);
      mockReadFile.mockResolvedValue(Buffer.from("fake image data"));

      const response = await GET(
        createRequest("http://localhost:3000/api/images/clubs/123e4567-e89b-12d3-a456-426614174000/test.jpg"),
        { params }
      );

      expect(response.status).toBe(200);
    });

    it("should reject invalid UUID format", async () => {
      const params = {
        entity: "clubs",
        entityId: "not-a-uuid",
        filename: "test.jpg",
      };

      const response = await GET(
        createRequest("http://localhost:3000/api/images/clubs/not-a-uuid/test.jpg"),
        { params }
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("Invalid entity ID format");
    });

    it("should reject empty UUID", async () => {
      const params = {
        entity: "clubs",
        entityId: "",
        filename: "test.jpg",
      };

      const response = await GET(
        createRequest("http://localhost:3000/api/images/clubs//test.jpg"),
        { params }
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("Invalid entity ID format");
    });
  });

  describe("Filename validation and security", () => {
    it("should accept valid filename", async () => {
      const params = {
        entity: "clubs",
        entityId: "123e4567-e89b-12d3-a456-426614174000",
        filename: "valid-image-123.jpg",
      };

      mockStat.mockResolvedValue({
        isFile: () => true,
      } as any);
      mockReadFile.mockResolvedValue(Buffer.from("fake image data"));

      const response = await GET(
        createRequest("http://localhost:3000/api/images/clubs/123e4567-e89b-12d3-a456-426614174000/valid-image-123.jpg"),
        { params }
      );

      expect(response.status).toBe(200);
    });

    it("should reject filename with directory traversal (..)", async () => {
      const params = {
        entity: "clubs",
        entityId: "123e4567-e89b-12d3-a456-426614174000",
        filename: "../../../etc/passwd",
      };

      const response = await GET(
        createRequest("http://localhost:3000/api/images/clubs/123e4567-e89b-12d3-a456-426614174000/../../../etc/passwd"),
        { params }
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("Invalid filename");
    });

    it("should reject filename with forward slash", async () => {
      const params = {
        entity: "clubs",
        entityId: "123e4567-e89b-12d3-a456-426614174000",
        filename: "subdir/test.jpg",
      };

      const response = await GET(
        createRequest("http://localhost:3000/api/images/clubs/123e4567-e89b-12d3-a456-426614174000/subdir/test.jpg"),
        { params }
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("Invalid filename");
    });

    it("should reject filename with backslash", async () => {
      const params = {
        entity: "clubs",
        entityId: "123e4567-e89b-12d3-a456-426614174000",
        filename: "subdir\\test.jpg",
      };

      const response = await GET(
        createRequest("http://localhost:3000/api/images/clubs/123e4567-e89b-12d3-a456-426614174000/subdir\\test.jpg"),
        { params }
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("Invalid filename");
    });

    it("should reject filename starting with dot", async () => {
      const params = {
        entity: "clubs",
        entityId: "123e4567-e89b-12d3-a456-426614174000",
        filename: ".hidden-file.jpg",
      };

      const response = await GET(
        createRequest("http://localhost:3000/api/images/clubs/123e4567-e89b-12d3-a456-426614174000/.hidden-file.jpg"),
        { params }
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("Invalid filename");
    });

    it("should reject filename with null byte", async () => {
      const params = {
        entity: "clubs",
        entityId: "123e4567-e89b-12d3-a456-426614174000",
        filename: "test\0.jpg",
      };

      const response = await GET(
        createRequest("http://localhost:3000/api/images/clubs/123e4567-e89b-12d3-a456-426614174000/test\0.jpg"),
        { params }
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("Invalid filename");
    });

    it("should reject empty filename", async () => {
      const params = {
        entity: "clubs",
        entityId: "123e4567-e89b-12d3-a456-426614174000",
        filename: "",
      };

      const response = await GET(
        createRequest("http://localhost:3000/api/images/clubs/123e4567-e89b-12d3-a456-426614174000/"),
        { params }
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("Invalid filename");
    });
  });

  describe("File serving", () => {
    it("should return 404 when file does not exist", async () => {
      const params = {
        entity: "clubs",
        entityId: "123e4567-e89b-12d3-a456-426614174000",
        filename: "nonexistent.jpg",
      };

      mockStat.mockRejectedValue(new Error("ENOENT: no such file or directory"));

      const response = await GET(
        createRequest("http://localhost:3000/api/images/clubs/123e4567-e89b-12d3-a456-426614174000/nonexistent.jpg"),
        { params }
      );

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe("Not found");
    });

    it("should return 404 when path is a directory, not a file", async () => {
      const params = {
        entity: "clubs",
        entityId: "123e4567-e89b-12d3-a456-426614174000",
        filename: "directory",
      };

      mockStat.mockResolvedValue({
        isFile: () => false,
      } as any);

      const response = await GET(
        createRequest("http://localhost:3000/api/images/clubs/123e4567-e89b-12d3-a456-426614174000/directory"),
        { params }
      );

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe("Not found");
    });

    it("should serve image file with correct content", async () => {
      const params = {
        entity: "clubs",
        entityId: "123e4567-e89b-12d3-a456-426614174000",
        filename: "test-image.jpg",
      };

      const fakeImageData = Buffer.from("fake image binary data");
      mockStat.mockResolvedValue({
        isFile: () => true,
      } as any);
      mockReadFile.mockResolvedValue(fakeImageData);

      const response = await GET(
        createRequest("http://localhost:3000/api/images/clubs/123e4567-e89b-12d3-a456-426614174000/test-image.jpg"),
        { params }
      );

      expect(response.status).toBe(200);
      const buffer = await response.arrayBuffer();
      expect(Buffer.from(buffer)).toEqual(fakeImageData);
    });

    it("should construct file path with entity and entityId", async () => {
      const params = {
        entity: "organizations",
        entityId: "abc12345-e89b-12d3-a456-426614174000",
        filename: "logo.png",
      };

      mockStat.mockResolvedValue({
        isFile: () => true,
      } as any);
      mockReadFile.mockResolvedValue(Buffer.from("fake image data"));

      await GET(
        createRequest("http://localhost:3000/api/images/organizations/abc12345-e89b-12d3-a456-426614174000/logo.png"),
        { params }
      );

      // Verify that stat was called with the correct path structure
      const expectedPath = path.join("/app/storage/images", "organizations", "abc12345-e89b-12d3-a456-426614174000", "logo.png");
      expect(mockStat).toHaveBeenCalledWith(expectedPath);
    });
  });

  describe("Content-Type headers", () => {
    it("should set correct Content-Type for .jpg", async () => {
      const params = {
        entity: "clubs",
        entityId: "123e4567-e89b-12d3-a456-426614174000",
        filename: "test.jpg",
      };

      mockStat.mockResolvedValue({
        isFile: () => true,
      } as any);
      mockReadFile.mockResolvedValue(Buffer.from("fake image data"));

      const response = await GET(
        createRequest("http://localhost:3000/api/images/clubs/123e4567-e89b-12d3-a456-426614174000/test.jpg"),
        { params }
      );

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("image/jpeg");
    });

    it("should set correct Content-Type for .png", async () => {
      const params = {
        entity: "clubs",
        entityId: "123e4567-e89b-12d3-a456-426614174000",
        filename: "test.png",
      };

      mockStat.mockResolvedValue({
        isFile: () => true,
      } as any);
      mockReadFile.mockResolvedValue(Buffer.from("fake image data"));

      const response = await GET(
        createRequest("http://localhost:3000/api/images/clubs/123e4567-e89b-12d3-a456-426614174000/test.png"),
        { params }
      );

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("image/png");
    });

    it("should set correct Content-Type for .webp", async () => {
      const params = {
        entity: "clubs",
        entityId: "123e4567-e89b-12d3-a456-426614174000",
        filename: "test.webp",
      };

      mockStat.mockResolvedValue({
        isFile: () => true,
      } as any);
      mockReadFile.mockResolvedValue(Buffer.from("fake image data"));

      const response = await GET(
        createRequest("http://localhost:3000/api/images/clubs/123e4567-e89b-12d3-a456-426614174000/test.webp"),
        { params }
      );

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("image/webp");
    });

    it("should set correct Content-Type for .svg", async () => {
      const params = {
        entity: "clubs",
        entityId: "123e4567-e89b-12d3-a456-426614174000",
        filename: "test.svg",
      };

      mockStat.mockResolvedValue({
        isFile: () => true,
      } as any);
      mockReadFile.mockResolvedValue(Buffer.from("fake svg data"));

      const response = await GET(
        createRequest("http://localhost:3000/api/images/clubs/123e4567-e89b-12d3-a456-426614174000/test.svg"),
        { params }
      );

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("image/svg+xml");
    });

    it("should set correct Content-Type for .gif", async () => {
      const params = {
        entity: "clubs",
        entityId: "123e4567-e89b-12d3-a456-426614174000",
        filename: "test.gif",
      };

      mockStat.mockResolvedValue({
        isFile: () => true,
      } as any);
      mockReadFile.mockResolvedValue(Buffer.from("fake gif data"));

      const response = await GET(
        createRequest("http://localhost:3000/api/images/clubs/123e4567-e89b-12d3-a456-426614174000/test.gif"),
        { params }
      );

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("image/gif");
    });

    it("should set default Content-Type for unknown extension", async () => {
      const params = {
        entity: "clubs",
        entityId: "123e4567-e89b-12d3-a456-426614174000",
        filename: "test.unknown",
      };

      mockStat.mockResolvedValue({
        isFile: () => true,
      } as any);
      mockReadFile.mockResolvedValue(Buffer.from("fake data"));

      const response = await GET(
        createRequest("http://localhost:3000/api/images/clubs/123e4567-e89b-12d3-a456-426614174000/test.unknown"),
        { params }
      );

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("application/octet-stream");
    });
  });

  describe("Cache-Control headers", () => {
    it("should set Cache-Control header with long max-age", async () => {
      const params = {
        entity: "clubs",
        entityId: "123e4567-e89b-12d3-a456-426614174000",
        filename: "test.jpg",
      };

      mockStat.mockResolvedValue({
        isFile: () => true,
      } as any);
      mockReadFile.mockResolvedValue(Buffer.from("fake image data"));

      const response = await GET(
        createRequest("http://localhost:3000/api/images/clubs/123e4567-e89b-12d3-a456-426614174000/test.jpg"),
        { params }
      );

      expect(response.status).toBe(200);
      expect(response.headers.get("Cache-Control")).toBe("public, max-age=31536000, immutable");
    });
  });

  describe("Error handling", () => {
    it("should handle filesystem errors gracefully", async () => {
      const params = {
        entity: "clubs",
        entityId: "123e4567-e89b-12d3-a456-426614174000",
        filename: "test.jpg",
      };

      mockStat.mockResolvedValue({
        isFile: () => true,
      } as any);
      mockReadFile.mockRejectedValue(new Error("Filesystem error"));

      const response = await GET(
        createRequest("http://localhost:3000/api/images/clubs/123e4567-e89b-12d3-a456-426614174000/test.jpg"),
        { params }
      );

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe("Internal server error");
    });
  });
});
