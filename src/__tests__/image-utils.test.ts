import { getImageUrl, getSupabaseStorageUrl, isValidImageUrl } from "@/utils/image";

describe("Image Utils", () => {
  describe("getImageUrl", () => {
    it("should return null for null input", () => {
      expect(getImageUrl(null)).toBeNull();
    });

    it("should return null for undefined input", () => {
      expect(getImageUrl(undefined)).toBeNull();
    });

    it("should return null for empty string", () => {
      expect(getImageUrl("")).toBeNull();
    });

    it("should return full URLs unchanged", () => {
      const fullUrl = "https://example.com/image.jpg";
      expect(getImageUrl(fullUrl)).toBe(fullUrl);
    });

    it("should return HTTP URLs unchanged", () => {
      const httpUrl = "http://example.com/image.jpg";
      expect(getImageUrl(httpUrl)).toBe(httpUrl);
    });

    it("should return API paths unchanged", () => {
      const apiPath = "/api/images/test-uuid.jpg";
      expect(getImageUrl(apiPath)).toBe(apiPath);
    });

    it("should return legacy paths unchanged", () => {
      const legacyPath = "/uploads/clubs/image.jpg";
      expect(getImageUrl(legacyPath)).toBe(legacyPath);
    });
  });

  describe("getSupabaseStorageUrl (backward compatibility)", () => {
    it("should return null for null input", () => {
      expect(getSupabaseStorageUrl(null)).toBeNull();
    });

    it("should return null for undefined input", () => {
      expect(getSupabaseStorageUrl(undefined)).toBeNull();
    });

    it("should return null for empty string", () => {
      expect(getSupabaseStorageUrl("")).toBeNull();
    });

    it("should return full URLs unchanged", () => {
      const fullUrl = "https://example.com/image.jpg";
      expect(getSupabaseStorageUrl(fullUrl)).toBe(fullUrl);
    });

    it("should return HTTP URLs unchanged", () => {
      const httpUrl = "http://example.com/image.jpg";
      expect(getSupabaseStorageUrl(httpUrl)).toBe(httpUrl);
    });

    it("should return API paths unchanged", () => {
      const apiPath = "/api/images/test-uuid.jpg";
      expect(getSupabaseStorageUrl(apiPath)).toBe(apiPath);
    });
  });

  describe("isValidImageUrl", () => {
    it("should return false for null", () => {
      expect(isValidImageUrl(null)).toBe(false);
    });

    it("should return false for undefined", () => {
      expect(isValidImageUrl(undefined)).toBe(false);
    });

    it("should return false for empty string", () => {
      expect(isValidImageUrl("")).toBe(false);
    });

    it("should return true for HTTPS URLs", () => {
      expect(isValidImageUrl("https://example.com/image.jpg")).toBe(true);
    });

    it("should return true for HTTP URLs", () => {
      expect(isValidImageUrl("http://example.com/image.jpg")).toBe(true);
    });

    it("should return true for /api/images/ paths", () => {
      expect(isValidImageUrl("/api/images/test-uuid.jpg")).toBe(true);
    });

    it("should return true for legacy /uploads/... paths", () => {
      expect(isValidImageUrl("/uploads/clubs/image.jpg")).toBe(true);
    });

    it("should return true for legacy uploads/... paths", () => {
      expect(isValidImageUrl("uploads/clubs/image.jpg")).toBe(true);
    });

    it("should return true for legacy clubs/... paths", () => {
      expect(isValidImageUrl("clubs/image.jpg")).toBe(true);
    });

    it("should return true for legacy organizations/... paths", () => {
      expect(isValidImageUrl("organizations/org-id/image.jpg")).toBe(true);
    });

    it("should return true for paths starting with /", () => {
      expect(isValidImageUrl("/some/path/image.jpg")).toBe(true);
    });

    it("should return false for invalid paths", () => {
      expect(isValidImageUrl("invalid-path")).toBe(false);
    });
  });
});
