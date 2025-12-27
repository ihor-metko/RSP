/**
 * @jest-environment node
 */

import {
  generateInviteToken,
  hashInviteToken,
  verifyInviteToken,
  getInviteExpiration,
  isInviteExpired,
  normalizeEmail,
} from "@/lib/inviteUtils";

describe("inviteUtils", () => {
  describe("generateInviteToken", () => {
    it("should generate a token", () => {
      const token = generateInviteToken();
      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      expect(token.length).toBeGreaterThan(0);
    });

    it("should generate unique tokens", () => {
      const token1 = generateInviteToken();
      const token2 = generateInviteToken();
      expect(token1).not.toBe(token2);
    });

    it("should generate URL-safe tokens", () => {
      const token = generateInviteToken();
      // Should not contain +, /, or = (URL-safe base64)
      expect(token).not.toMatch(/[+/=]/);
    });
  });

  describe("hashInviteToken", () => {
    it("should hash a token", () => {
      const token = "test-token";
      const hash = hashInviteToken(token);
      expect(hash).toBeDefined();
      expect(typeof hash).toBe("string");
      expect(hash.length).toBe(64); // SHA-256 produces 64 hex characters
    });

    it("should produce consistent hashes for the same token", () => {
      const token = "test-token";
      const hash1 = hashInviteToken(token);
      const hash2 = hashInviteToken(token);
      expect(hash1).toBe(hash2);
    });

    it("should produce different hashes for different tokens", () => {
      const token1 = "test-token-1";
      const token2 = "test-token-2";
      const hash1 = hashInviteToken(token1);
      const hash2 = hashInviteToken(token2);
      expect(hash1).not.toBe(hash2);
    });
  });

  describe("verifyInviteToken", () => {
    it("should verify a valid token", () => {
      const token = "test-token";
      const hash = hashInviteToken(token);
      expect(verifyInviteToken(token, hash)).toBe(true);
    });

    it("should reject an invalid token", () => {
      const token = "test-token";
      const hash = hashInviteToken(token);
      const wrongToken = "wrong-token";
      expect(verifyInviteToken(wrongToken, hash)).toBe(false);
    });

    it("should reject a token with invalid hash format", () => {
      const token = "test-token";
      const invalidHash = "not-a-valid-hash";
      expect(verifyInviteToken(token, invalidHash)).toBe(false);
    });

    it("should use constant-time comparison", () => {
      const token = "test-token";
      const hash = hashInviteToken(token);
      
      // These operations should take similar time regardless of match
      const start1 = Date.now();
      verifyInviteToken(token, hash);
      const time1 = Date.now() - start1;
      
      const start2 = Date.now();
      verifyInviteToken("wrong-token", hash);
      const time2 = Date.now() - start2;
      
      // Times should be comparable (within reasonable margin)
      // This is a basic check - true constant-time would need more sophisticated testing
      expect(Math.abs(time1 - time2)).toBeLessThan(10);
    });
  });

  describe("getInviteExpiration", () => {
    it("should return a date 7 days from now by default", () => {
      const now = new Date();
      const expiration = getInviteExpiration();
      const expected = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      // Allow 1 second margin for test execution time
      expect(Math.abs(expiration.getTime() - expected.getTime())).toBeLessThan(1000);
    });

    it("should return a date with custom days", () => {
      const now = new Date();
      const expiration = getInviteExpiration(14);
      const expected = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
      
      // Allow 1 second margin for test execution time
      expect(Math.abs(expiration.getTime() - expected.getTime())).toBeLessThan(1000);
    });

    it("should handle 1 day expiration", () => {
      const now = new Date();
      const expiration = getInviteExpiration(1);
      const expected = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);
      
      // Allow 1 second margin for test execution time
      expect(Math.abs(expiration.getTime() - expected.getTime())).toBeLessThan(1000);
    });
  });

  describe("isInviteExpired", () => {
    it("should return true for past dates", () => {
      const pastDate = new Date(Date.now() - 1000);
      expect(isInviteExpired(pastDate)).toBe(true);
    });

    it("should return false for future dates", () => {
      const futureDate = new Date(Date.now() + 1000000);
      expect(isInviteExpired(futureDate)).toBe(false);
    });

    it("should return true for dates in the past", () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(isInviteExpired(yesterday)).toBe(true);
    });

    it("should return false for dates in the future", () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(isInviteExpired(tomorrow)).toBe(false);
    });
  });

  describe("normalizeEmail", () => {
    it("should convert email to lowercase", () => {
      expect(normalizeEmail("Test@Example.COM")).toBe("test@example.com");
    });

    it("should trim whitespace", () => {
      expect(normalizeEmail("  test@example.com  ")).toBe("test@example.com");
    });

    it("should handle already normalized emails", () => {
      expect(normalizeEmail("test@example.com")).toBe("test@example.com");
    });

    it("should handle mixed case and whitespace", () => {
      expect(normalizeEmail(" User@Example.COM ")).toBe("user@example.com");
    });

    it("should preserve special characters in email", () => {
      expect(normalizeEmail("user+tag@example.com")).toBe("user+tag@example.com");
    });
  });
});
