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
  if (!metadata) {
    return null;
  }

  let parsedMetadata: Record<string, unknown> | null = null;

  try {
    parsedMetadata = typeof metadata === "string" ? JSON.parse(metadata) : metadata;
  } catch {
    // Invalid metadata format, return null
    return null;
  }

  // Check if metadata contains padelCourtFormat
  if (parsedMetadata && parsedMetadata.padelCourtFormat) {
    const format = parsedMetadata.padelCourtFormat as string;

    // Only process if format is "single" or "double"
    if (format === "single" || format === "double") {
      // Capitalize format: "single" -> "Single", "double" -> "Double"
      return format.charAt(0).toUpperCase() + format.slice(1);
    }
  }

  return null;
}
