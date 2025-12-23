/**
 * @jest-environment node
 */

// Mock filesystem storage
const mockReadFileFromStorage = jest.fn();
jest.mock("@/lib/fileStorage", () => ({
  ...jest.requireActual("@/lib/fileStorage"),
  readFileFromStorage: (...args: unknown[]) => mockReadFileFromStorage(...args),
  getMimeTypeFromFilename: jest.fn((filename: string) => {
    if (filename.endsWith(".jpg") || filename.endsWith(".jpeg")) return "image/jpeg";
    if (filename.endsWith(".png")) return "image/png";
    if (filename.endsWith(".webp")) return "image/webp";
    if (filename.endsWith(".svg")) return "image/svg+xml";
    return "image/jpeg";
  }),
  isValidFilename: jest.fn((filename: string) => {
    return !filename.includes("..") && !filename.includes("/") && !filename.includes("\\");
  }),
  isValidEntity: jest.fn((entity: string) => {
    return ["organizations", "clubs", "users", "general"].includes(entity);
  }),
}));

import { GET } from "@/app/api/images/[entity]/[filename]/route";

describe("Entity Image Serving API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/images/[entity]/[filename]", () => {
    it("should return 400 for invalid entity type", async () => {
      const request = new Request("http://localhost:3000/api/images/invalid/test.jpg");
      const response = await GET(request, { 
        params: Promise.resolve({ entity: "invalid", filename: "test.jpg" }) 
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid entity type");
    });

    it("should return 400 for invalid filename with path traversal", async () => {
      const request = new Request("http://localhost:3000/api/images/organizations/../test.jpg");
      const response = await GET(request, { 
        params: Promise.resolve({ entity: "organizations", filename: "../test.jpg" }) 
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid filename");
    });

    it("should return 404 when file not found", async () => {
      mockReadFileFromStorage.mockResolvedValue({ error: "File not found" });

      const request = new Request("http://localhost:3000/api/images/organizations/test.jpg");
      const response = await GET(request, { 
        params: Promise.resolve({ entity: "organizations", filename: "test.jpg" }) 
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("File not found");
      expect(mockReadFileFromStorage).toHaveBeenCalledWith("test.jpg", "organizations");
    });

    it("should successfully serve image from organizations directory", async () => {
      const testBuffer = Buffer.from("test image data");
      mockReadFileFromStorage.mockResolvedValue({ buffer: testBuffer });

      const request = new Request("http://localhost:3000/api/images/organizations/test.jpg");
      const response = await GET(request, { 
        params: Promise.resolve({ entity: "organizations", filename: "test.jpg" }) 
      });

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("image/jpeg");
      expect(response.headers.get("Cache-Control")).toBe("public, max-age=31536000, immutable");
      expect(mockReadFileFromStorage).toHaveBeenCalledWith("test.jpg", "organizations");

      const buffer = await response.arrayBuffer();
      expect(Buffer.from(buffer)).toEqual(testBuffer);
    });

    it("should successfully serve image from clubs directory", async () => {
      const testBuffer = Buffer.from("club image data");
      mockReadFileFromStorage.mockResolvedValue({ buffer: testBuffer });

      const request = new Request("http://localhost:3000/api/images/clubs/test.png");
      const response = await GET(request, { 
        params: Promise.resolve({ entity: "clubs", filename: "test.png" }) 
      });

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("image/png");
      expect(mockReadFileFromStorage).toHaveBeenCalledWith("test.png", "clubs");
    });

    it("should successfully serve image from general directory", async () => {
      const testBuffer = Buffer.from("general image data");
      mockReadFileFromStorage.mockResolvedValue({ buffer: testBuffer });

      const request = new Request("http://localhost:3000/api/images/general/test.webp");
      const response = await GET(request, { 
        params: Promise.resolve({ entity: "general", filename: "test.webp" }) 
      });

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("image/webp");
      expect(mockReadFileFromStorage).toHaveBeenCalledWith("test.webp", "general");
    });

    it("should successfully serve SVG image", async () => {
      const testBuffer = Buffer.from("<svg></svg>");
      mockReadFileFromStorage.mockResolvedValue({ buffer: testBuffer });

      const request = new Request("http://localhost:3000/api/images/organizations/logo.svg");
      const response = await GET(request, { 
        params: Promise.resolve({ entity: "organizations", filename: "logo.svg" }) 
      });

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("image/svg+xml");
      expect(mockReadFileFromStorage).toHaveBeenCalledWith("logo.svg", "organizations");
    });
  });
});
