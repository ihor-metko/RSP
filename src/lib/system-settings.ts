/**
 * System Settings Module
 *
 * This module defines the coding rules and conventions for the RSP project.
 * Before starting any task, developers must check these settings and follow the rules.
 *
 * Usage:
 *   import { systemSettings, CSSClassPrefix, BrandTerms, CSSVariables } from '@/lib/system-settings';
 *
 * This module is designed to be easily updated as new rules are added.
 */

// =============================================================================
// CSS CLASS NAMING CONVENTIONS
// =============================================================================

/**
 * CSS class prefix for all project-specific CSS/HTML classes.
 * All custom CSS classes must use this prefix.
 *
 * @example
 * // Correct usage:
 * <div className="im-card im-card-header">
 *
 * // Incorrect usage:
 * <div className="card card-header">
 */
export const CSSClassPrefix = "im-" as const;

/**
 * Validates if a CSS class name follows the project naming convention.
 *
 * @param className - The CSS class name to validate
 * @returns true if the class name starts with the required prefix
 */
export function isValidCSSClassName(className: string): boolean {
  // Allow Tailwind CSS utility classes (don't start with prefix)
  // Only custom component classes need the prefix
  return (
    className.startsWith(CSSClassPrefix) ||
    isTailwindUtilityClass(className) ||
    isThirdPartyClass(className)
  );
}

/**
 * Checks if a class name is a Tailwind CSS utility class.
 * Tailwind classes don't need the im- prefix.
 *
 * Note: This is a heuristic-based check covering common Tailwind patterns.
 * For comprehensive validation, consider using Tailwind's official tooling.
 * The im- prefix requirement primarily applies to custom component classes.
 */
function isTailwindUtilityClass(className: string): boolean {
  // Common Tailwind utility prefixes and standalone classes
  // This list covers the most frequently used utilities
  const tailwindPrefixes = [
    // Layout & Display
    "flex", "grid", "block", "inline", "hidden", "contents",
    // Sizing
    "w-", "h-", "min-", "max-", "size-",
    // Spacing
    "m-", "p-", "gap-", "space-",
    // Typography
    "text-", "font-", "leading-", "tracking-", "whitespace-",
    // Backgrounds & Borders
    "bg-", "border", "rounded", "ring-", "outline-",
    // Effects
    "shadow", "opacity", "blur-", "brightness-",
    // Transforms & Transitions
    "transition", "transform", "translate-", "rotate-", "scale-",
    // Responsive & State prefixes
    "hover:", "focus:", "active:", "disabled:", "dark:",
    "sm:", "md:", "lg:", "xl:", "2xl:",
    // Flexbox & Grid
    "items-", "justify-", "self-", "place-", "col-", "row-", "order-",
    // Positioning
    "absolute", "relative", "fixed", "sticky", "static",
    "top-", "right-", "bottom-", "left-", "inset-", "z-",
    // Overflow & Visibility
    "overflow", "visible", "invisible", "truncate",
    // Cursor & Pointer
    "cursor-", "pointer-", "select-",
    // SVG
    "fill-", "stroke-",
    // Other common utilities
    "aspect-", "object-", "container", "resize", "sr-only",
  ];

  return tailwindPrefixes.some(
    (prefix) => className.startsWith(prefix) || className === prefix.replace(/-$/, "")
  );
}

/**
 * Checks if a class name is from a third-party library.
 * Third-party classes don't need the im- prefix.
 */
function isThirdPartyClass(className: string): boolean {
  // Allow third-party class prefixes:
  // - "rsp-" : Legacy RSP project component classes (to be migrated to im-)
  // - "tm-"  : Theme/template classes from globals.css
  const thirdPartyPrefixes = ["rsp-", "tm-"];
  return thirdPartyPrefixes.some((prefix) => className.startsWith(prefix));
}

// =============================================================================
// BRANDING AND TERMINOLOGY
// =============================================================================

/**
 * Brand terms that must be used correctly throughout the codebase.
 * Always use these exact spellings in code, comments, and documentation.
 */
export const BrandTerms = {
  /** The sport name - always "Padel", never "Paddle" */
  SPORT_NAME: "Padel",

  /** The project/application name */
  APP_NAME: "ArenaOne",

  /** Incorrect variations to avoid */
  INCORRECT_TERMS: ["Paddle", "paddle", "PADDLE"] as const,
} as const;

/**
 * Validates text for correct brand terminology.
 *
 * @param text - The text to validate
 * @returns An object with isValid flag and any issues found
 */
export function validateBrandTerminology(text: string): {
  isValid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  for (const incorrectTerm of BrandTerms.INCORRECT_TERMS) {
    // Check if "Paddle" appears (case-sensitive for proper noun)
    // but exclude cases where it's part of another word
    const regex = new RegExp(`\\b${incorrectTerm}\\b`, "g");
    if (regex.test(text)) {
      issues.push(
        `Found incorrect term "${incorrectTerm}". Use "${BrandTerms.SPORT_NAME}" instead.`
      );
    }
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
}

// =============================================================================
// CSS VARIABLES AND DESIGN TOKENS
// =============================================================================

/**
 * Global CSS variables defined in globals.css.
 * Always use these variables instead of hardcoding colors.
 *
 * These variables automatically adapt to light/dark themes.
 */
export const CSSVariables = {
  // Background and foreground
  background: "--rsp-background",
  foreground: "--rsp-foreground",

  // Primary colors
  primary: "--rsp-primary",
  primaryHover: "--rsp-primary-hover",

  // Secondary colors
  secondary: "--rsp-secondary",
  secondaryHover: "--rsp-secondary-hover",

  // UI elements
  border: "--rsp-border",
  cardBackground: "--rsp-card-bg",
  accent: "--rsp-accent",
} as const;

/**
 * Helper function to get CSS variable reference.
 *
 * @param variable - The CSS variable key from CSSVariables
 * @returns The CSS var() function string
 *
 * @example
 * // Returns: "var(--rsp-primary)"
 * cssVar('primary')
 */
export function cssVar(variable: keyof typeof CSSVariables): string {
  return `var(${CSSVariables[variable]})`;
}

// =============================================================================
// THEME SUPPORT
// =============================================================================

/**
 * Theme configuration for dark/light mode support.
 * All components must respect these theme variables.
 */
export const ThemeConfig = {
  /** CSS class applied to enable dark mode */
  darkModeClass: "dark",

  /** Default theme when user preference is not set */
  defaultTheme: "light" as const,

  /** Supported themes */
  themes: ["light", "dark"] as const,
} as const;

export type Theme = (typeof ThemeConfig.themes)[number];

// =============================================================================
// SEMANTIC HTML AND ACCESSIBILITY
// =============================================================================

/**
 * Guidelines for semantic, accessible HTML.
 */
export const AccessibilityGuidelines = {
  /** Always include alt text for images */
  requireImageAlt: true,

  /** Use semantic HTML elements */
  preferSemanticElements: true,

  /** Ensure interactive elements are keyboard accessible */
  requireKeyboardAccess: true,

  /** Include ARIA labels where needed */
  useAriaLabels: true,

  /** Semantic elements to use instead of generic divs */
  semanticElements: {
    navigation: "nav",
    mainContent: "main",
    header: "header",
    footer: "footer",
    article: "article",
    section: "section",
    aside: "aside",
  } as const,
} as const;

// =============================================================================
// CODE STYLE AND LANGUAGE
// =============================================================================

/**
 * Code style and language guidelines.
 */
export const CodeStyleGuidelines = {
  /** Language for code, comments, and documentation */
  language: "English",

  /** Comments should be clear and concise */
  commentStyle: "Clear, concise English",

  /** Variable naming convention */
  variableNaming: "camelCase",

  /** Component naming convention */
  componentNaming: "PascalCase",

  /** CSS class naming convention */
  cssClassNaming: `${CSSClassPrefix}component-name`,
} as const;

// =============================================================================
// COMPONENT CSS CLASS PREFIX (NEW)
// =============================================================================

/**
 * Generate a properly prefixed CSS class name for components.
 *
 * @param componentName - The name of the component (e.g., "button", "card-header")
 * @returns The properly prefixed class name
 *
 * @example
 * // Returns: "im-button"
 * imClass('button')
 *
 * // Returns: "im-card-header"
 * imClass('card-header')
 */
export function imClass(componentName: string): string {
  return `${CSSClassPrefix}${componentName}`;
}

/**
 * Generate multiple properly prefixed CSS class names.
 *
 * @param componentNames - Array of component names
 * @returns Space-separated string of prefixed class names
 *
 * @example
 * // Returns: "im-button im-button-primary"
 * imClasses(['button', 'button-primary'])
 */
export function imClasses(componentNames: string[]): string {
  return componentNames.map(imClass).join(" ");
}

// =============================================================================
// SYSTEM SETTINGS OBJECT
// =============================================================================

/**
 * Combined system settings object for easy import.
 *
 * @example
 * import { systemSettings } from '@/lib/system-settings';
 *
 * // Access settings
 * console.log(systemSettings.cssPrefix); // "im-"
 * console.log(systemSettings.brandTerms.SPORT_NAME); // "Padel"
 */
export const systemSettings = {
  /** CSS class prefix for project-specific classes */
  cssPrefix: CSSClassPrefix,

  /** Brand terminology */
  brandTerms: BrandTerms,

  /** CSS variables for theming */
  cssVariables: CSSVariables,

  /** Theme configuration */
  theme: ThemeConfig,

  /** Accessibility guidelines */
  accessibility: AccessibilityGuidelines,

  /** Code style guidelines */
  codeStyle: CodeStyleGuidelines,

  /** Version of the system settings (for tracking updates) */
  version: "1.0.0",

  /** Last updated date */
  lastUpdated: "2025-12-01",
} as const;

export default systemSettings;
