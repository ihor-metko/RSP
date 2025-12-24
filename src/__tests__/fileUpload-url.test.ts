import { getUploadedImageUrl } from "@/lib/fileUpload";

describe("fileUpload - getUploadedImageUrl", () => {
  const originalEnv = process.env.NEXT_PUBLIC_ASSETS_BASE_URL;

  afterEach(() => {
    // Restore original environment
    if (originalEnv !== undefined) {
      process.env.NEXT_PUBLIC_ASSETS_BASE_URL = originalEnv;
    } else {
      delete process.env.NEXT_PUBLIC_ASSETS_BASE_URL;
    }
  });

  describe("with NEXT_PUBLIC_ASSETS_BASE_URL set", () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_ASSETS_BASE_URL = "https://arenaone.app";
    });

    it("should generate full URL for organizations", () => {
      const url = getUploadedImageUrl("organizations", "abc-123", "logo.jpg");
      expect(url).toBe("https://arenaone.app/uploads/organizations/abc-123/logo.jpg");
    });

    it("should generate full URL for clubs", () => {
      const url = getUploadedImageUrl("clubs", "club-456", "banner.png");
      expect(url).toBe("https://arenaone.app/uploads/clubs/club-456/banner.png");
    });

    it("should generate full URL for users", () => {
      const url = getUploadedImageUrl("users", "user-789", "avatar.webp");
      expect(url).toBe("https://arenaone.app/uploads/users/user-789/avatar.webp");
    });

    it("should generate full URL for bookings", () => {
      const url = getUploadedImageUrl("bookings", "booking-xyz", "image.jpg");
      expect(url).toBe("https://arenaone.app/uploads/bookings/booking-xyz/image.jpg");
    });

    it("should handle base URL with trailing slash", () => {
      process.env.NEXT_PUBLIC_ASSETS_BASE_URL = "https://arenaone.app/";
      const url = getUploadedImageUrl("clubs", "club-123", "test.jpg");
      expect(url).toBe("https://arenaone.app/uploads/clubs/club-123/test.jpg");
    });

    it("should handle base URL without protocol", () => {
      process.env.NEXT_PUBLIC_ASSETS_BASE_URL = "http://localhost:8080";
      const url = getUploadedImageUrl("organizations", "org-123", "logo.png");
      expect(url).toBe("http://localhost:8080/uploads/organizations/org-123/logo.png");
    });
  });

  describe("without NEXT_PUBLIC_ASSETS_BASE_URL", () => {
    beforeEach(() => {
      delete process.env.NEXT_PUBLIC_ASSETS_BASE_URL;
    });

    it("should generate relative path for organizations", () => {
      const url = getUploadedImageUrl("organizations", "abc-123", "logo.jpg");
      expect(url).toBe("/uploads/organizations/abc-123/logo.jpg");
    });

    it("should generate relative path for clubs", () => {
      const url = getUploadedImageUrl("clubs", "club-456", "banner.png");
      expect(url).toBe("/uploads/clubs/club-456/banner.png");
    });

    it("should generate relative path for users", () => {
      const url = getUploadedImageUrl("users", "user-789", "avatar.webp");
      expect(url).toBe("/uploads/users/user-789/avatar.webp");
    });

    it("should generate relative path for bookings", () => {
      const url = getUploadedImageUrl("bookings", "booking-xyz", "image.jpg");
      expect(url).toBe("/uploads/bookings/booking-xyz/image.jpg");
    });
  });

  describe("special characters and edge cases", () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_ASSETS_BASE_URL = "https://arenaone.app";
    });

    it("should handle filenames with special characters", () => {
      const url = getUploadedImageUrl("clubs", "club-123", "image-with-dashes_and_underscores.jpg");
      expect(url).toBe("https://arenaone.app/uploads/clubs/club-123/image-with-dashes_and_underscores.jpg");
    });

    it("should handle UUID entity IDs", () => {
      const uuid = "123e4567-e89b-12d3-a456-426614174000";
      const url = getUploadedImageUrl("organizations", uuid, "logo.png");
      expect(url).toBe(`https://arenaone.app/uploads/organizations/${uuid}/logo.png`);
    });

    it("should handle timestamp-based filenames", () => {
      const filename = "1234567890-abcdef123456.jpg";
      const url = getUploadedImageUrl("users", "user-123", filename);
      expect(url).toBe(`https://arenaone.app/uploads/users/user-123/${filename}`);
    });
  });
});
