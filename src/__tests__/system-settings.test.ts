import {
  CSSClassPrefix,
  BrandTerms,
  CSSVariables,
  ThemeConfig,
  AccessibilityGuidelines,
  CodeStyleGuidelines,
  systemSettings,
  isValidCSSClassName,
  validateBrandTerminology,
  cssVar,
  imClass,
  imClasses,
} from "@/lib/system-settings";

describe("System Settings Module", () => {
  describe("CSSClassPrefix", () => {
    it('should have the correct prefix "im-"', () => {
      expect(CSSClassPrefix).toBe("im-");
    });
  });

  describe("BrandTerms", () => {
    it('should have SPORT_NAME as "Padel"', () => {
      expect(BrandTerms.SPORT_NAME).toBe("Padel");
    });

    it('should have APP_NAME as "ArenaOne"', () => {
      expect(BrandTerms.APP_NAME).toBe("ArenaOne");
    });

    it("should list incorrect terms to avoid", () => {
      expect(BrandTerms.INCORRECT_TERMS).toContain("Paddle");
      expect(BrandTerms.INCORRECT_TERMS).toContain("paddle");
      expect(BrandTerms.INCORRECT_TERMS).toContain("PADDLE");
    });
  });

  describe("CSSVariables", () => {
    it("should have all required CSS variables", () => {
      expect(CSSVariables.background).toBe("--rsp-background");
      expect(CSSVariables.foreground).toBe("--rsp-foreground");
      expect(CSSVariables.primary).toBe("--rsp-primary");
      expect(CSSVariables.primaryHover).toBe("--rsp-primary-hover");
      expect(CSSVariables.secondary).toBe("--rsp-secondary");
      expect(CSSVariables.secondaryHover).toBe("--rsp-secondary-hover");
      expect(CSSVariables.border).toBe("--rsp-border");
      expect(CSSVariables.cardBackground).toBe("--rsp-card-bg");
      expect(CSSVariables.accent).toBe("--rsp-accent");
    });
  });

  describe("ThemeConfig", () => {
    it('should have darkModeClass as "dark"', () => {
      expect(ThemeConfig.darkModeClass).toBe("dark");
    });

    it('should have defaultTheme as "light"', () => {
      expect(ThemeConfig.defaultTheme).toBe("light");
    });

    it("should have both light and dark themes", () => {
      expect(ThemeConfig.themes).toContain("light");
      expect(ThemeConfig.themes).toContain("dark");
    });
  });

  describe("AccessibilityGuidelines", () => {
    it("should require image alt text", () => {
      expect(AccessibilityGuidelines.requireImageAlt).toBe(true);
    });

    it("should prefer semantic elements", () => {
      expect(AccessibilityGuidelines.preferSemanticElements).toBe(true);
    });

    it("should require keyboard access", () => {
      expect(AccessibilityGuidelines.requireKeyboardAccess).toBe(true);
    });

    it("should have semantic element mappings", () => {
      expect(AccessibilityGuidelines.semanticElements.navigation).toBe("nav");
      expect(AccessibilityGuidelines.semanticElements.mainContent).toBe("main");
      expect(AccessibilityGuidelines.semanticElements.header).toBe("header");
      expect(AccessibilityGuidelines.semanticElements.footer).toBe("footer");
    });
  });

  describe("CodeStyleGuidelines", () => {
    it('should have language as "English"', () => {
      expect(CodeStyleGuidelines.language).toBe("English");
    });

    it('should have variableNaming as "camelCase"', () => {
      expect(CodeStyleGuidelines.variableNaming).toBe("camelCase");
    });

    it('should have componentNaming as "PascalCase"', () => {
      expect(CodeStyleGuidelines.componentNaming).toBe("PascalCase");
    });

    it("should have correct cssClassNaming", () => {
      expect(CodeStyleGuidelines.cssClassNaming).toBe("im-component-name");
    });
  });

  describe("systemSettings", () => {
    it('should have cssPrefix as "im-"', () => {
      expect(systemSettings.cssPrefix).toBe("im-");
    });

    it("should contain all settings", () => {
      expect(systemSettings.brandTerms).toBeDefined();
      expect(systemSettings.cssVariables).toBeDefined();
      expect(systemSettings.theme).toBeDefined();
      expect(systemSettings.accessibility).toBeDefined();
      expect(systemSettings.codeStyle).toBeDefined();
    });

    it("should have version and lastUpdated", () => {
      expect(systemSettings.version).toBeDefined();
      expect(systemSettings.lastUpdated).toBeDefined();
    });
  });

  describe("isValidCSSClassName", () => {
    it("should return true for classes with im- prefix", () => {
      expect(isValidCSSClassName("im-button")).toBe(true);
      expect(isValidCSSClassName("im-card")).toBe(true);
      expect(isValidCSSClassName("im-modal-header")).toBe(true);
    });

    it("should return true for Tailwind utility classes", () => {
      expect(isValidCSSClassName("flex")).toBe(true);
      expect(isValidCSSClassName("text-lg")).toBe(true);
      expect(isValidCSSClassName("bg-white")).toBe(true);
      expect(isValidCSSClassName("hover:bg-gray-100")).toBe(true);
      expect(isValidCSSClassName("dark:bg-gray-900")).toBe(true);
    });

    it("should return true for legacy rsp- classes", () => {
      expect(isValidCSSClassName("rsp-button")).toBe(true);
      expect(isValidCSSClassName("rsp-card")).toBe(true);
    });

    it("should return true for tm- classes", () => {
      expect(isValidCSSClassName("tm-hero")).toBe(true);
    });
  });

  describe("validateBrandTerminology", () => {
    it("should return valid for correct terminology", () => {
      const result = validateBrandTerminology("Welcome to Padel club");
      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should detect incorrect "Paddle" usage', () => {
      const result = validateBrandTerminology("Welcome to Paddle club");
      expect(result.isValid).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0]).toContain("Paddle");
    });

    it('should detect lowercase "paddle" usage', () => {
      const result = validateBrandTerminology("I love playing paddle");
      expect(result.isValid).toBe(false);
      expect(result.issues).toHaveLength(1);
    });

    it('should detect uppercase "PADDLE" usage', () => {
      const result = validateBrandTerminology("PADDLE COURTS AVAILABLE");
      expect(result.isValid).toBe(false);
      expect(result.issues).toHaveLength(1);
    });
  });

  describe("cssVar", () => {
    it("should return correct CSS var() syntax", () => {
      expect(cssVar("primary")).toBe("var(--rsp-primary)");
      expect(cssVar("background")).toBe("var(--rsp-background)");
      expect(cssVar("cardBackground")).toBe("var(--rsp-card-bg)");
    });
  });

  describe("imClass", () => {
    it("should generate correctly prefixed class names", () => {
      expect(imClass("button")).toBe("im-button");
      expect(imClass("card")).toBe("im-card");
      expect(imClass("modal-header")).toBe("im-modal-header");
    });
  });

  describe("imClasses", () => {
    it("should generate multiple prefixed class names", () => {
      expect(imClasses(["button", "button-primary"])).toBe(
        "im-button im-button-primary"
      );
      expect(imClasses(["card", "card-header"])).toBe("im-card im-card-header");
    });

    it("should handle single class", () => {
      expect(imClasses(["button"])).toBe("im-button");
    });

    it("should handle empty array", () => {
      expect(imClasses([])).toBe("");
    });
  });
});
