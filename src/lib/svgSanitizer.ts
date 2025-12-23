/**
 * SVG Sanitization Utilities
 * 
 * Provides secure SVG processing to prevent XSS attacks through uploaded SVG files.
 * Only used for organization and club logos.
 */

import * as DOMPurify from "isomorphic-dompurify";

/**
 * Configuration for SVG sanitization.
 * This removes all potentially dangerous elements and attributes while keeping the SVG valid.
 */
const SVG_SANITIZE_CONFIG = {
  USE_PROFILES: { svg: true, svgFilters: true },
  ADD_TAGS: ["use"], // Allow <use> for symbol references
  ADD_ATTR: ["xmlns", "xmlns:xlink", "viewBox", "preserveAspectRatio"],
  FORBID_TAGS: ["script", "foreignObject", "iframe", "object", "embed"],
  FORBID_ATTR: [
    "onerror",
    "onload",
    "onclick",
    "onmouseover",
    "onmouseout",
    "onmousemove",
    "onmouseenter",
    "onmouseleave",
    "onfocus",
    "onblur",
    "onchange",
    "oninput",
    "onsubmit",
    "onreset",
    "onkeydown",
    "onkeyup",
    "onkeypress",
  ],
};

/**
 * Sanitize SVG content to remove potentially dangerous elements.
 * 
 * @param svgContent - Raw SVG content as string
 * @returns Sanitized SVG content safe for storage and display
 */
export function sanitizeSVG(svgContent: string): string {
  // First check if this is actually SVG content
  // More robust check: ensure <svg is at the start (after optional XML declaration and whitespace)
  const trimmed = svgContent.trim();
  const hasXmlDeclaration = trimmed.startsWith("<?xml");
  const svgStartIndex = hasXmlDeclaration ? trimmed.indexOf("<svg") : 0;
  
  if (svgStartIndex === -1 || (!hasXmlDeclaration && !trimmed.toLowerCase().startsWith("<svg"))) {
    throw new Error("Invalid SVG: Content does not contain SVG markup");
  }

  // Sanitize the SVG
  const sanitized = DOMPurify.sanitize(svgContent, SVG_SANITIZE_CONFIG);

  // Verify we still have valid SVG after sanitization
  if (!sanitized || !sanitized.trim()) {
    throw new Error("SVG sanitization resulted in empty content");
  }

  return sanitized;
}

/**
 * Validate that the buffer contains valid SVG content.
 * This is a basic check before attempting sanitization.
 * 
 * @param buffer - File buffer to validate
 * @returns true if content appears to be SVG
 */
export function isValidSVGBuffer(buffer: Buffer): boolean {
  try {
    const content = buffer.toString("utf-8");
    const trimmed = content.trim().toLowerCase();
    
    // Check for proper SVG structure
    // Must have opening <svg tag and closing </svg> tag
    const hasOpenTag = trimmed.startsWith("<svg") || trimmed.startsWith("<?xml");
    const hasCloseTag = trimmed.includes("</svg>");
    
    // If it has XML declaration, verify SVG tag follows
    if (trimmed.startsWith("<?xml")) {
      const svgIndex = trimmed.indexOf("<svg");
      return svgIndex > 0 && hasCloseTag;
    }
    
    return hasOpenTag && hasCloseTag;
  } catch {
    return false;
  }
}
