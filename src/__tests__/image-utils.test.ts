import { getSupabaseStorageUrl, isValidImageUrl } from "@/utils/image";

describe("Image Utils", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment for each test
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("getSupabaseStorageUrl", () => {
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

    describe("without NEXT_PUBLIC_SUPABASE_URL", () => {
      beforeEach(() => {
        delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      });

      it("should return original path when Supabase URL is not configured", () => {
        const path = "/uploads/clubs/image.jpg";
        expect(getSupabaseStorageUrl(path)).toBe(path);
      });
    });

    describe("with NEXT_PUBLIC_SUPABASE_URL", () => {
      beforeEach(() => {
        process.env.NEXT_PUBLIC_SUPABASE_URL = "https://xyz.supabase.co";
      });

      it("should convert /uploads/clubs/... path to Supabase URL", () => {
        const path = "/uploads/clubs/abc123.jpg";
        const expected = "https://xyz.supabase.co/storage/v1/object/public/uploads/clubs/abc123.jpg";
        expect(getSupabaseStorageUrl(path)).toBe(expected);
      });

      it("should convert uploads/clubs/... path (no leading slash) to Supabase URL", () => {
        const path = "uploads/clubs/abc123.jpg";
        const expected = "https://xyz.supabase.co/storage/v1/object/public/uploads/clubs/abc123.jpg";
        expect(getSupabaseStorageUrl(path)).toBe(expected);
      });

      it("should convert clubs/... path to Supabase URL", () => {
        const path = "clubs/abc123.jpg";
        const expected = "https://xyz.supabase.co/storage/v1/object/public/uploads/clubs/abc123.jpg";
        expect(getSupabaseStorageUrl(path)).toBe(expected);
      });

      it("should handle nested paths correctly", () => {
        const path = "/uploads/clubs/club-id/image.png";
        const expected = "https://xyz.supabase.co/storage/v1/object/public/uploads/clubs/club-id/image.png";
        expect(getSupabaseStorageUrl(path)).toBe(expected);
      });
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

    describe("without NEXT_PUBLIC_SUPABASE_URL", () => {
      beforeEach(() => {
        delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      });

      it("should return true for paths starting with /", () => {
        expect(isValidImageUrl("/uploads/clubs/image.jpg")).toBe(true);
      });

      it("should return false for paths not starting with /", () => {
        expect(isValidImageUrl("uploads/clubs/image.jpg")).toBe(false);
      });
    });

    describe("with NEXT_PUBLIC_SUPABASE_URL", () => {
      beforeEach(() => {
        process.env.NEXT_PUBLIC_SUPABASE_URL = "https://xyz.supabase.co";
      });

      it("should return true for /uploads/... paths", () => {
        expect(isValidImageUrl("/uploads/clubs/image.jpg")).toBe(true);
      });

      it("should return true for uploads/... paths", () => {
        expect(isValidImageUrl("uploads/clubs/image.jpg")).toBe(true);
      });

      it("should return true for clubs/... paths", () => {
        expect(isValidImageUrl("clubs/image.jpg")).toBe(true);
      });
    });
  });
});
