/**
 * Court metadata parser
 * Helper to parse and validate court metadata JSON
 */

export interface CourtMetadata {
  bannerAlignment?: 'top' | 'center' | 'bottom';
  description?: string | null;
  padelCourtFormat?: 'single' | 'double';
}

/**
 * Parse court metadata JSON string into typed object
 */
export function parseCourtMetadata(metadata: string | Record<string, unknown> | null | undefined): CourtMetadata | undefined {
  if (!metadata) return undefined;

  try {
    const parsed = typeof metadata === 'string' ? JSON.parse(metadata) : metadata;
    
    return {
      bannerAlignment: parsed.bannerAlignment === 'top' || parsed.bannerAlignment === 'bottom' 
        ? parsed.bannerAlignment 
        : 'center',
      description: typeof parsed.description === 'string' ? parsed.description : null,
      padelCourtFormat: parsed.padelCourtFormat === 'single' || parsed.padelCourtFormat === 'double'
        ? parsed.padelCourtFormat
        : undefined,
    };
  } catch {
    return undefined;
  }
}

/**
 * Extracts and capitalizes court format from Padel court metadata
 * 
 * This function is used to populate the court's `type` field with the proper
 * capitalized format ("Single" or "Double") for Quick Booking compatibility.
 * 
 * @param metadata - The metadata object or JSON string
 * @returns Capitalized court type ("Single" or "Double") if found, null otherwise
 * 
 * @example
 * extractCourtTypeFromMetadata({ padelCourtFormat: "single" }) // Returns "Single"
 * extractCourtTypeFromMetadata({ padelCourtFormat: "double" }) // Returns "Double"
 * extractCourtTypeFromMetadata({}) // Returns null
 */
export function extractCourtTypeFromMetadata(
  metadata: string | Record<string, unknown> | null | undefined
): string | null {
  // Reuse existing parser for consistency
  const parsed = parseCourtMetadata(metadata);
  
  if (!parsed || !parsed.padelCourtFormat) {
    return null;
  }

  const format = parsed.padelCourtFormat;
  
  // Capitalize format: "single" -> "Single", "double" -> "Double"
  return format.charAt(0).toUpperCase() + format.slice(1);
}
