/**
 * Tests for Encryption Utilities
 * 
 * Tests encryption/decryption of sensitive payment data
 */

import { encrypt, decrypt, encryptJSON, decryptJSON, isEncrypted } from "@/lib/encryption";

describe("Encryption Utilities", () => {
  describe("encrypt and decrypt", () => {
    it("should encrypt and decrypt a string correctly", () => {
      const plaintext = "my-secret-payment-key";
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
      expect(encrypted).not.toBe(plaintext);
    });

    it("should produce different ciphertexts for the same plaintext", () => {
      const plaintext = "same-secret";
      const encrypted1 = encrypt(plaintext);
      const encrypted2 = encrypt(plaintext);

      // Different due to random IV and salt
      expect(encrypted1).not.toBe(encrypted2);

      // But both decrypt to the same value
      expect(decrypt(encrypted1)).toBe(plaintext);
      expect(decrypt(encrypted2)).toBe(plaintext);
    });

    it("should handle empty strings", () => {
      const plaintext = "";
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it("should handle special characters", () => {
      const plaintext = "key-with-special-chars: !@#$%^&*()_+{}|:<>?[]\\;',./`~";
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it("should handle unicode characters", () => {
      const plaintext = "ключ-з-українськими-символами-🔐";
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it("should handle long strings", () => {
      const plaintext = "a".repeat(10000);
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it("should throw error on tampered data", () => {
      const plaintext = "secret-key";
      const encrypted = encrypt(plaintext);

      // Tamper with the encrypted data
      const tamperedData = encrypted.slice(0, -5) + "XXXXX";

      expect(() => decrypt(tamperedData)).toThrow();
    });

    it("should throw error on invalid format", () => {
      const invalidData = "not:encrypted:data";

      expect(() => decrypt(invalidData)).toThrow();
    });

    it("should throw error on completely invalid data", () => {
      const invalidData = "random-string";

      expect(() => decrypt(invalidData)).toThrow();
    });
  });

  describe("encryptJSON and decryptJSON", () => {
    it("should encrypt and decrypt JSON objects", () => {
      const data = {
        merchantId: "merchant-123",
        secretKey: "secret-key-456",
        apiEndpoint: "https://api.example.com",
        timeout: 30000,
        nested: {
          value: "test",
          number: 42,
        },
      };

      const encrypted = encryptJSON(data);
      const decrypted = decryptJSON(encrypted);

      expect(decrypted).toEqual(data);
    });

    it("should handle arrays in JSON", () => {
      const data = {
        allowedIPs: ["192.168.1.1", "10.0.0.1"],
        features: ["feature1", "feature2", "feature3"],
      };

      const encrypted = encryptJSON(data);
      const decrypted = decryptJSON(encrypted);

      expect(decrypted).toEqual(data);
    });

    it("should handle null and undefined values", () => {
      const data = {
        value1: null,
        value2: "something",
        value3: undefined,
      };

      const encrypted = encryptJSON(data);
      const decrypted = decryptJSON(encrypted);

      // undefined is not preserved in JSON
      expect(decrypted).toEqual({
        value1: null,
        value2: "something",
      });
    });

    it("should handle empty objects", () => {
      const data = {};

      const encrypted = encryptJSON(data);
      const decrypted = decryptJSON(encrypted);

      expect(decrypted).toEqual(data);
    });

    it("should throw error on tampered JSON data", () => {
      const data = { key: "value" };
      const encrypted = encryptJSON(data);

      // Tamper with the encrypted data
      const tamperedData = encrypted.slice(0, -5) + "XXXXX";

      expect(() => decryptJSON(tamperedData)).toThrow();
    });
  });

  describe("isEncrypted", () => {
    it("should identify encrypted data", () => {
      const plaintext = "secret";
      const encrypted = encrypt(plaintext);

      expect(isEncrypted(encrypted)).toBe(true);
    });

    it("should not identify plain text as encrypted", () => {
      const plaintext = "not-encrypted";

      expect(isEncrypted(plaintext)).toBe(false);
    });

    it("should not identify malformed data as encrypted", () => {
      const malformed1 = "only:two:parts";
      const malformed2 = "too:many:parts:here:and:more";

      expect(isEncrypted(malformed1)).toBe(false);
      expect(isEncrypted(malformed2)).toBe(false);
    });

    it("should handle empty parts", () => {
      const emptyParts = "::";

      expect(isEncrypted(emptyParts)).toBe(false);
    });

    it("should require all four parts to be non-empty", () => {
      const incompleteParts = "part1:part2:part3:";

      expect(isEncrypted(incompleteParts)).toBe(false);
    });
  });

  describe("encryption format", () => {
    it("should produce correctly formatted encrypted data", () => {
      const plaintext = "test";
      const encrypted = encrypt(plaintext);

      // Should have 4 parts separated by colons
      const parts = encrypted.split(":");
      expect(parts).toHaveLength(4);

      // All parts should be base64
      const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
      parts.forEach((part) => {
        expect(part).toMatch(base64Regex);
        expect(part.length).toBeGreaterThan(0);
      });
    });
  });

  describe("encryption consistency", () => {
    it("should use different salts and IVs for each encryption", () => {
      const plaintext = "same-content";
      
      const encrypted1 = encrypt(plaintext);
      const encrypted2 = encrypt(plaintext);

      // Different encrypted values
      expect(encrypted1).not.toBe(encrypted2);

      // But different salts and IVs
      const [salt1, iv1] = encrypted1.split(":");
      const [salt2, iv2] = encrypted2.split(":");

      expect(salt1).not.toBe(salt2);
      expect(iv1).not.toBe(iv2);

      // Both decrypt to same value
      expect(decrypt(encrypted1)).toBe(plaintext);
      expect(decrypt(encrypted2)).toBe(plaintext);
    });
  });
});
