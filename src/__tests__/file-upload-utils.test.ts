/**
 * Tests for fileUpload utility functions
 */

import { getUploadedImageUrl, validateUploadedFile, generateUniqueFilename, isValidUploadEntity } from "@/lib/fileUpload";

describe("fileUpload utilities", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("getUploadedImageUrl", () => {
    it("should return absolute URL when NEXT_PUBLIC_ASSETS_BASE_URL is set", () => {
      process.env.NEXT_PUBLIC_ASSETS_BASE_URL = "https://dev.arenaone.app";
      
      const url = getUploadedImageUrl("organizations", "123-uuid", "test.jpg");
      
      expect(url).toBe("https://dev.arenaone.app/uploads/organizations/123-uuid/test.jpg");
    });

    it("should handle base URL with trailing slash", () => {
      process.env.NEXT_PUBLIC_ASSETS_BASE_URL = "https://dev.arenaone.app/";
      
      const url = getUploadedImageUrl("clubs", "456-uuid", "logo.webp");
      
      expect(url).toBe("https://dev.arenaone.app/uploads/clubs/456-uuid/logo.webp");
    });

    it("should return relative path when NEXT_PUBLIC_ASSETS_BASE_URL is not set", () => {
      delete process.env.NEXT_PUBLIC_ASSETS_BASE_URL;
      
      const url = getUploadedImageUrl("users", "789-uuid", "avatar.png");
      
      expect(url).toBe("/uploads/users/789-uuid/avatar.png");
    });

    it("should work with all entity types", () => {
      process.env.NEXT_PUBLIC_ASSETS_BASE_URL = "https://test.com";
      
      expect(getUploadedImageUrl("organizations", "1", "a.jpg")).toBe("https://test.com/uploads/organizations/1/a.jpg");
      expect(getUploadedImageUrl("clubs", "2", "b.jpg")).toBe("https://test.com/uploads/clubs/2/b.jpg");
      expect(getUploadedImageUrl("users", "3", "c.jpg")).toBe("https://test.com/uploads/users/3/c.jpg");
      expect(getUploadedImageUrl("bookings", "4", "d.jpg")).toBe("https://test.com/uploads/bookings/4/d.jpg");
    });
  });

  describe("isValidUploadEntity", () => {
    it("should accept valid entity types", () => {
      expect(isValidUploadEntity("organizations")).toBe(true);
      expect(isValidUploadEntity("clubs")).toBe(true);
      expect(isValidUploadEntity("users")).toBe(true);
      expect(isValidUploadEntity("bookings")).toBe(true);
    });

    it("should reject invalid entity types", () => {
      expect(isValidUploadEntity("invalid")).toBe(false);
      expect(isValidUploadEntity("Images")).toBe(false);
      expect(isValidUploadEntity("")).toBe(false);
    });
  });

  describe("validateUploadedFile", () => {
    it("should accept valid image files", () => {
      const validFile = new File(["content"], "test.jpg", { type: "image/jpeg" });
      Object.defineProperty(validFile, 'size', { value: 1024 * 1024 }); // 1MB
      
      expect(validateUploadedFile(validFile)).toBeNull();
    });

    it("should reject files exceeding size limit", () => {
      const largeFile = new File(["content"], "test.jpg", { type: "image/jpeg" });
      Object.defineProperty(largeFile, 'size', { value: 6 * 1024 * 1024 }); // 6MB
      
      const error = validateUploadedFile(largeFile);
      expect(error).toContain("File size exceeds maximum");
    });

    it("should reject invalid file types", () => {
      const invalidFile = new File(["content"], "test.pdf", { type: "application/pdf" });
      Object.defineProperty(invalidFile, 'size', { value: 1024 });
      
      const error = validateUploadedFile(invalidFile);
      expect(error).toContain("Invalid file type");
    });

    it("should reject empty files", () => {
      const emptyFile = new File([""], "test.jpg", { type: "image/jpeg" });
      Object.defineProperty(emptyFile, 'size', { value: 0 });
      
      const error = validateUploadedFile(emptyFile);
      expect(error).toBe("File is empty");
    });

    it("should accept all allowed image types", () => {
      // Note: Both 'image/jpeg' and 'image/jpg' are tested because some clients
      // may send either MIME type, even though 'image/jpeg' is the standard
      const types = [
        { ext: "jpg", mime: "image/jpeg" },
        { ext: "jpeg", mime: "image/jpg" },  // Non-standard but supported for compatibility
        { ext: "png", mime: "image/png" },
        { ext: "gif", mime: "image/gif" },
        { ext: "webp", mime: "image/webp" },
        { ext: "svg", mime: "image/svg+xml" },
      ];
      
      types.forEach(({ ext, mime }) => {
        const file = new File(["content"], `test.${ext}`, { type: mime });
        Object.defineProperty(file, 'size', { value: 1024 });
        expect(validateUploadedFile(file)).toBeNull();
      });
    });
  });

  describe("generateUniqueFilename", () => {
    it("should generate unique filenames with timestamp and random suffix", () => {
      const filename1 = generateUniqueFilename("test.jpg", "image/jpeg");
      const filename2 = generateUniqueFilename("test.jpg", "image/jpeg");
      
      expect(filename1).not.toBe(filename2);
      expect(filename1).toMatch(/^\d+-[a-f0-9]{16}\.jpg$/);
      expect(filename2).toMatch(/^\d+-[a-f0-9]{16}\.jpg$/);
    });

    it("should use correct extensions for different MIME types", () => {
      expect(generateUniqueFilename("test.jpg", "image/jpeg")).toMatch(/\.jpg$/);
      expect(generateUniqueFilename("test.png", "image/png")).toMatch(/\.png$/);
      expect(generateUniqueFilename("test.gif", "image/gif")).toMatch(/\.gif$/);
      expect(generateUniqueFilename("test.webp", "image/webp")).toMatch(/\.webp$/);
      expect(generateUniqueFilename("test.svg", "image/svg+xml")).toMatch(/\.svg$/);
    });

    it("should fall back to original extension for unknown MIME type", () => {
      const filename = generateUniqueFilename("test.custom", "image/unknown");
      expect(filename).toMatch(/\.custom$/);
    });
  });
});
