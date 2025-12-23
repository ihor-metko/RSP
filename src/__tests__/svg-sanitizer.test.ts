/**
 * @jest-environment node
 */

// Mock isomorphic-dompurify since it has ES module dependencies
jest.mock("isomorphic-dompurify", () => ({
  sanitize: jest.fn((input: string, config?: unknown) => {
    // Basic mock sanitization - removes script tags and event handlers
    let result = input;
    result = result.replace(/<script[^>]*>.*?<\/script>/gi, "");
    result = result.replace(/<foreignObject[^>]*>.*?<\/foreignObject>/gi, "");
    result = result.replace(/\s+on\w+="[^"]*"/gi, "");
    result = result.replace(/\s+on\w+='[^']*'/gi, "");
    return result;
  }),
}));

import { sanitizeSVG, isValidSVGBuffer } from "@/lib/svgSanitizer";

describe("SVG Sanitizer", () => {
  describe("sanitizeSVG", () => {
    it("should sanitize a valid SVG without scripts", () => {
      const validSVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="blue" /></svg>';
      const result = sanitizeSVG(validSVG);
      expect(result).toBeTruthy();
      expect(result).toContain("<svg");
      expect(result).toContain("</svg>");
      expect(result).toContain("circle");
    });

    it("should remove script tags from SVG", () => {
      const maliciousSVG = '<svg xmlns="http://www.w3.org/2000/svg"><script>alert("XSS")</script><circle cx="50" cy="50" r="40" /></svg>';
      const result = sanitizeSVG(maliciousSVG);
      expect(result).toBeTruthy();
      expect(result).not.toContain("<script");
      expect(result).not.toContain("alert");
      expect(result).toContain("circle");
    });

    it("should remove event handlers from SVG", () => {
      const maliciousSVG = '<svg xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40" onclick="alert(\'XSS\')" /></svg>';
      const result = sanitizeSVG(maliciousSVG);
      expect(result).toBeTruthy();
      expect(result).not.toContain("onclick");
      expect(result).not.toContain("alert");
      expect(result).toContain("circle");
    });

    it("should remove foreignObject tags", () => {
      const maliciousSVG = '<svg xmlns="http://www.w3.org/2000/svg"><foreignObject><body><script>alert("XSS")</script></body></foreignObject></svg>';
      const result = sanitizeSVG(maliciousSVG);
      expect(result).toBeTruthy();
      expect(result).not.toContain("foreignObject");
      expect(result).not.toContain("script");
    });

    it("should throw error for invalid SVG content", () => {
      const invalidContent = "This is not SVG content";
      expect(() => sanitizeSVG(invalidContent)).toThrow("Invalid SVG");
    });

    it("should throw error for empty content", () => {
      const emptyContent = "";
      expect(() => sanitizeSVG(emptyContent)).toThrow("Invalid SVG");
    });

    it("should preserve valid SVG attributes", () => {
      const validSVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet"><rect width="100" height="100" fill="red" /></svg>';
      const result = sanitizeSVG(validSVG);
      expect(result).toBeTruthy();
      expect(result).toContain("viewBox");
      expect(result).toContain("preserveAspectRatio");
      expect(result).toContain("rect");
    });

    it("should handle complex valid SVGs with paths", () => {
      const complexSVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z" fill="currentColor"/></svg>';
      const result = sanitizeSVG(complexSVG);
      expect(result).toBeTruthy();
      expect(result).toContain("path");
      expect(result).toContain("d=");
      expect(result).not.toContain("<script");
    });

    it("should remove onload handlers", () => {
      const maliciousSVG = '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(\'XSS\')"><circle cx="50" cy="50" r="40" /></svg>';
      const result = sanitizeSVG(maliciousSVG);
      expect(result).toBeTruthy();
      expect(result).not.toContain("onload");
      expect(result).not.toContain("alert");
      expect(result).toContain("circle");
    });

    it("should remove onerror handlers", () => {
      const maliciousSVG = '<svg xmlns="http://www.w3.org/2000/svg"><image href="x" onerror="alert(\'XSS\')" /></svg>';
      const result = sanitizeSVG(maliciousSVG);
      expect(result).toBeTruthy();
      expect(result).not.toContain("onerror");
      expect(result).not.toContain("alert");
    });
  });

  describe("isValidSVGBuffer", () => {
    it("should return true for valid SVG buffer", () => {
      const validSVG = '<svg xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40" /></svg>';
      const buffer = Buffer.from(validSVG, "utf-8");
      expect(isValidSVGBuffer(buffer)).toBe(true);
    });

    it("should return false for non-SVG content", () => {
      const invalidContent = "This is not SVG";
      const buffer = Buffer.from(invalidContent, "utf-8");
      expect(isValidSVGBuffer(buffer)).toBe(false);
    });

    it("should return false for empty buffer", () => {
      const buffer = Buffer.from("", "utf-8");
      expect(isValidSVGBuffer(buffer)).toBe(false);
    });

    it("should return true for SVG with XML declaration", () => {
      const validSVG = '<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40" /></svg>';
      const buffer = Buffer.from(validSVG, "utf-8");
      expect(isValidSVGBuffer(buffer)).toBe(true);
    });

    it("should return true for minimized SVG", () => {
      const minifiedSVG = '<svg><circle cx="50" cy="50" r="40"/></svg>';
      const buffer = Buffer.from(minifiedSVG, "utf-8");
      expect(isValidSVGBuffer(buffer)).toBe(true);
    });

    it("should return false for incomplete SVG", () => {
      const incompleteSVG = '<svg xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40" />';
      const buffer = Buffer.from(incompleteSVG, "utf-8");
      expect(isValidSVGBuffer(buffer)).toBe(false);
    });
  });
});
