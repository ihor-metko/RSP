/**
 * Tests for organization metadata parsing utilities
 */

import { parseOrganizationMetadata } from "@/types/organization";
import type { OrganizationMetadata } from "@/types/organization";

describe("parseOrganizationMetadata", () => {
  it("should return undefined for null input", () => {
    const result = parseOrganizationMetadata(null);
    expect(result).toBeUndefined();
  });

  it("should return undefined for undefined input", () => {
    const result = parseOrganizationMetadata(undefined);
    expect(result).toBeUndefined();
  });

  it("should parse valid JSON string with logo metadata", () => {
    const metadataString = JSON.stringify({
      logoTheme: "dark",
      secondLogo: "org-logo-light.png",
      secondLogoTheme: "light",
    });

    const result = parseOrganizationMetadata(metadataString);
    
    expect(result).toBeDefined();
    expect(result?.logoTheme).toBe("dark");
    expect(result?.secondLogo).toBe("org-logo-light.png");
    expect(result?.secondLogoTheme).toBe("light");
  });

  it("should parse JSON string with banner alignment", () => {
    const metadataString = JSON.stringify({
      bannerAlignment: "top",
      logoTheme: "light",
    });

    const result = parseOrganizationMetadata(metadataString);
    
    expect(result).toBeDefined();
    expect(result?.bannerAlignment).toBe("top");
    expect(result?.logoTheme).toBe("light");
  });

  it("should handle object input directly", () => {
    const metadataObject: OrganizationMetadata = {
      logoTheme: "dark",
      secondLogo: "org-logo-light.png",
      secondLogoTheme: "light",
      bannerAlignment: "center",
    };

    const result = parseOrganizationMetadata(metadataObject);
    
    expect(result).toBeDefined();
    expect(result?.logoTheme).toBe("dark");
    expect(result?.secondLogo).toBe("org-logo-light.png");
    expect(result?.secondLogoTheme).toBe("light");
    expect(result?.bannerAlignment).toBe("center");
  });

  it("should return undefined for invalid JSON string", () => {
    const invalidJson = "{invalid json}";
    const result = parseOrganizationMetadata(invalidJson);
    
    expect(result).toBeUndefined();
  });

  it("should handle empty JSON object", () => {
    const emptyJson = "{}";
    const result = parseOrganizationMetadata(emptyJson);
    
    expect(result).toBeDefined();
    expect(result?.logoTheme).toBeUndefined();
    expect(result?.secondLogo).toBeUndefined();
  });

  it("should parse metadata with only logoTheme", () => {
    const metadataString = JSON.stringify({
      logoTheme: "light",
    });

    const result = parseOrganizationMetadata(metadataString);
    
    expect(result).toBeDefined();
    expect(result?.logoTheme).toBe("light");
    expect(result?.secondLogo).toBeUndefined();
  });

  it("should parse metadata with all possible fields", () => {
    const metadataString = JSON.stringify({
      logoTheme: "dark",
      secondLogo: "org-logo-light.png",
      secondLogoTheme: "light",
      bannerAlignment: "bottom",
    });

    const result = parseOrganizationMetadata(metadataString);
    
    expect(result).toBeDefined();
    expect(result?.logoTheme).toBe("dark");
    expect(result?.secondLogo).toBe("org-logo-light.png");
    expect(result?.secondLogoTheme).toBe("light");
    expect(result?.bannerAlignment).toBe("bottom");
  });

  it("should handle Record<string, unknown> with extra fields", () => {
    const metadataObject = {
      logoTheme: "dark",
      customField: "custom value",
      anotherField: 123,
    };

    const result = parseOrganizationMetadata(metadataObject);
    
    expect(result).toBeDefined();
    expect(result?.logoTheme).toBe("dark");
  });

  it("should return undefined for array input", () => {
    const arrayInput = ["logoTheme", "dark"] as unknown as Record<string, unknown>;
    const result = parseOrganizationMetadata(arrayInput);
    
    expect(result).toBeUndefined();
  });

  it("should handle class instances (which are objects in JavaScript)", () => {
    // Note: In practice, API responses are always plain objects from JSON.parse()
    // Class instances will have Object.prototype.toString.call return '[object Object]'
    // This is expected behavior - the function accepts any object with the right structure
    class CustomClass {
      logoTheme = "dark";
    }
    const customObject = new CustomClass() as unknown as Record<string, unknown>;
    const result = parseOrganizationMetadata(customObject);
    
    // The function will accept it since it's technically an object
    expect(result).toBeDefined();
    expect(result?.logoTheme).toBe("dark");
  });
});
