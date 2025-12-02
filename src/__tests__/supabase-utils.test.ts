/**
 * @jest-environment node
 */

import {
  validateFileForUpload,
  getExtensionForMimeType,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
} from "@/lib/supabase";

describe("Supabase Utilities", () => {
  describe("validateFileForUpload", () => {
    it("should return null for valid JPEG file", () => {
      expect(validateFileForUpload("image/jpeg", 1024)).toBeNull();
    });

    it("should return null for valid PNG file", () => {
      expect(validateFileForUpload("image/png", 1024)).toBeNull();
    });

    it("should return null for valid WebP file", () => {
      expect(validateFileForUpload("image/webp", 1024)).toBeNull();
    });

    it("should return null for valid AVIF file", () => {
      expect(validateFileForUpload("image/avif", 1024)).toBeNull();
    });

    it("should return error for invalid MIME type", () => {
      const result = validateFileForUpload("application/pdf", 1024);
      expect(result).toBe("Invalid file type. Allowed: jpg, png, webp, avif");
    });

    it("should return error for file too large", () => {
      const result = validateFileForUpload("image/jpeg", MAX_FILE_SIZE + 1);
      expect(result).toBe("File too large. Maximum size: 5MB");
    });

    it("should return null for file at exactly max size", () => {
      expect(validateFileForUpload("image/jpeg", MAX_FILE_SIZE)).toBeNull();
    });
  });

  describe("getExtensionForMimeType", () => {
    it("should return jpg for image/jpeg", () => {
      expect(getExtensionForMimeType("image/jpeg")).toBe("jpg");
    });

    it("should return jpg for image/jpg", () => {
      expect(getExtensionForMimeType("image/jpg")).toBe("jpg");
    });

    it("should return png for image/png", () => {
      expect(getExtensionForMimeType("image/png")).toBe("png");
    });

    it("should return webp for image/webp", () => {
      expect(getExtensionForMimeType("image/webp")).toBe("webp");
    });

    it("should return avif for image/avif", () => {
      expect(getExtensionForMimeType("image/avif")).toBe("avif");
    });

    it("should return jpg for unknown MIME type", () => {
      expect(getExtensionForMimeType("image/unknown")).toBe("jpg");
    });
  });

  describe("ALLOWED_MIME_TYPES", () => {
    it("should include all supported image types", () => {
      expect(ALLOWED_MIME_TYPES).toContain("image/jpeg");
      expect(ALLOWED_MIME_TYPES).toContain("image/jpg");
      expect(ALLOWED_MIME_TYPES).toContain("image/png");
      expect(ALLOWED_MIME_TYPES).toContain("image/webp");
      expect(ALLOWED_MIME_TYPES).toContain("image/avif");
    });
  });
});
